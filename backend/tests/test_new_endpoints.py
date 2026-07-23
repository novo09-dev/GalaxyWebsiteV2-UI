"""Tests for new endpoints in this iteration:
- POST /api/admin/calendar/service-account
- POST /api/admin/calendar/disconnect (after SA connect)
- POST /api/admin/change-credentials
- Regressions on /api/admin/calendar/status shape
- Availability graceful skip when SA connected but freeBusy would fail
"""
import os
import copy
import pytest
import requests
from datetime import datetime, timedelta
from filelock import FileLock

# Cross-worker lock: any test that MUTATES admin credentials MUST hold this
# lock so parallel xdist workers don't hit 401 during the brief mutation window.
_ADMIN_LOCK = FileLock("/tmp/galaxy_admin_creds.lock", timeout=60)

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@galaxy.salon"
ADMIN_PASSWORD = "Galaxy@2025"


# ------------ Fake service account fixture (well-formed but private_key fails validation) ------------
FAKE_SA = {
    "type": "service_account",
    "project_id": "galaxy-test",
    "private_key_id": "a1b2c3",
    "private_key": (
        "-----BEGIN PRIVATE KEY-----\n"
        "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC8Q9Q9Q9Q9Q9Q9\n"
        "-----END PRIVATE KEY-----\n"
    ),
    "client_email": "galaxy-test@galaxy-test.iam.gserviceaccount.com",
    "client_id": "1234567890",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
}


# ------------ Fixtures ------------
@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(client):
    import time
    for _ in range(15):
        r = client.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if r.status_code == 200:
            return r.json()["token"]
        time.sleep(0.5)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"})
    return s


def _login_with(client, email, password):
    return client.post(f"{API}/admin/login", json={"email": email, "password": password})


# ------------ Direct Mongo helper for the "valid-persistence" case ------------
@pytest.fixture(scope="module")
def mongo_db():
    # We use a subprocess-like inline motor client to insert a valid-shape SA doc bypassing gcal validation.
    from motor.motor_asyncio import AsyncIOMotorClient
    import asyncio
    mongo_url = None
    dbname = None
    with open("/app/backend/.env") as f:
        for line in f:
            if line.startswith("MONGO_URL="):
                mongo_url = line.split("=", 1)[1].strip().strip('"').strip("'")
            elif line.startswith("DB_NAME="):
                dbname = line.split("=", 1)[1].strip().strip('"').strip("'")
    assert mongo_url and dbname, "MONGO_URL/DB_NAME not found"
    cli = AsyncIOMotorClient(mongo_url)
    db = cli[dbname]
    loop = asyncio.new_event_loop()

    class Runner:
        @staticmethod
        def run(coro):
            return loop.run_until_complete(coro)

    yield db, Runner
    loop.close()
    cli.close()


# ---------------- Calendar status shape ----------------
class TestCalendarStatusShape:
    def test_status_returns_new_keys(self, admin_client):
        # Ensure nothing connected first
        admin_client.post(f"{API}/admin/calendar/disconnect")
        r = admin_client.get(f"{API}/admin/calendar/status")
        assert r.status_code == 200
        d = r.json()
        for k in ("env_configured", "connected", "mode", "email"):
            assert k in d, f"missing key {k} in {d}"
        assert d["connected"] is False
        assert d["mode"] in (None, "null") or d["mode"] is None
        assert d["email"] in (None, "")


# ---------------- POST /admin/calendar/service-account : auth + validation ----------------
class TestSAAuthAndValidation:
    def test_requires_auth(self, client):
        r = client.post(f"{API}/admin/calendar/service-account", json={"credentials": FAKE_SA})
        assert r.status_code == 401

    def test_missing_type(self, admin_client):
        bad = {"client_email": "x@y.com", "private_key": "abc"}
        r = admin_client.post(f"{API}/admin/calendar/service-account", json={"credentials": bad})
        assert r.status_code == 400

    def test_wrong_type(self, admin_client):
        bad = {"type": "authorized_user", "client_email": "x@y.com", "private_key": "abc"}
        r = admin_client.post(f"{API}/admin/calendar/service-account", json={"credentials": bad})
        assert r.status_code == 400

    def test_missing_client_email(self, admin_client):
        bad = {"type": "service_account", "private_key": "abc"}
        r = admin_client.post(f"{API}/admin/calendar/service-account", json={"credentials": bad})
        assert r.status_code == 400

    def test_missing_private_key(self, admin_client):
        bad = {"type": "service_account", "client_email": "x@y.com"}
        r = admin_client.post(f"{API}/admin/calendar/service-account", json={"credentials": bad})
        assert r.status_code == 400

    def test_valid_shape_but_bad_private_key_400_and_no_persist(self, admin_client):
        # Ensure disconnected first
        admin_client.post(f"{API}/admin/calendar/disconnect")
        r = admin_client.post(f"{API}/admin/calendar/service-account", json={"credentials": FAKE_SA})
        # Expected 400 — google.oauth2.service_account cannot parse fake key
        assert r.status_code == 400, r.text
        # Status must still show not connected
        s = admin_client.get(f"{API}/admin/calendar/status").json()
        assert s["connected"] is False
        assert s["mode"] in (None,)


# ---------------- Valid persistence via direct Mongo insert ----------------
class TestSAValidPersistence:
    """Since a real service account key is unavailable in this env, we
    directly insert a well-formed SA doc into db.settings to test the
    read/status/disconnect paths — noted in agent report."""

    def test_status_flips_after_direct_insert(self, admin_client, mongo_db):
        db, Runner = mongo_db
        # Ensure clean
        admin_client.post(f"{API}/admin/calendar/disconnect")

        async def _insert():
            await db.settings.update_one(
                {"key": "google_service_account"},
                {"$set": {
                    "key": "google_service_account",
                    "credentials": FAKE_SA,
                    "client_email": FAKE_SA["client_email"],
                }},
                upsert=True,
            )

        Runner.run(_insert())

        r = admin_client.get(f"{API}/admin/calendar/status")
        assert r.status_code == 200
        d = r.json()
        assert d["connected"] is True
        assert d["mode"] == "service_account"
        assert d["email"] == FAKE_SA["client_email"]

    def test_disconnect_clears_it(self, admin_client):
        r = admin_client.post(f"{API}/admin/calendar/disconnect")
        assert r.status_code == 200
        s = admin_client.get(f"{API}/admin/calendar/status").json()
        assert s["connected"] is False
        assert s["mode"] is None


# ---------------- Availability regression with SA connected ----------------
class TestAvailabilityWithSA:
    """Verify availability endpoint is unaffected/graceful when SA is 'connected'
    but freeBusy will fail because the private key is fake.

    Steps: (1) direct-insert SA. (2) create/patch an employee with google_calendar_id.
    (3) call /api/availability — must not crash; slots should equal the no-google case.
    """
    TEST_EMP_ID = None

    def _future_date(self, days=10):
        return (datetime.utcnow() + timedelta(hours=5, minutes=30) + timedelta(days=days)).strftime("%Y-%m-%d")

    def test_setup_employee_with_gcal(self, admin_client, mongo_db):
        # Fresh employee for the test
        payload = {
            "name": "TEST_AvailWithGCal",
            "position": "Stylist",
            "google_calendar_id": "fake-cal-id@group.calendar.google.com",
            "working_hours": [{"day": d, "start": "10:00", "end": "20:00", "open": True} for d in range(7)],
            "service_ids": [],
            "active": True,
        }
        r = admin_client.post(f"{API}/admin/employees", json=payload)
        assert r.status_code == 200, r.text
        obj = r.json()
        assert obj["google_calendar_id"] == payload["google_calendar_id"]
        TestAvailabilityWithSA.TEST_EMP_ID = obj["id"]

    def test_availability_no_google_baseline(self, admin_client, client):
        emp_id = TestAvailabilityWithSA.TEST_EMP_ID
        assert emp_id
        # Make sure disconnected
        admin_client.post(f"{API}/admin/calendar/disconnect")
        svc = client.get(f"{API}/services").json()[0]
        date_str = self._future_date()
        r = client.get(f"{API}/availability", params={
            "employee_id": emp_id, "service_id": svc["id"], "date": date_str,
        })
        assert r.status_code == 200, r.text
        TestAvailabilityWithSA._baseline = r.json()["slots"]
        assert len(TestAvailabilityWithSA._baseline) > 0

    def test_availability_with_sa_connected_graceful(self, admin_client, client, mongo_db):
        emp_id = TestAvailabilityWithSA.TEST_EMP_ID
        assert emp_id
        db, Runner = mongo_db

        # Insert SA to make gcal.get_service() try to work with fake key
        async def _insert():
            await db.settings.update_one(
                {"key": "google_service_account"},
                {"$set": {"key": "google_service_account", "credentials": FAKE_SA, "client_email": FAKE_SA["client_email"]}},
                upsert=True,
            )
        Runner.run(_insert())

        svc = client.get(f"{API}/services").json()[0]
        date_str = self._future_date()
        r = client.get(f"{API}/availability", params={
            "employee_id": emp_id, "service_id": svc["id"], "date": date_str,
        })
        assert r.status_code == 200, r.text
        slots = r.json()["slots"]
        # Should equal baseline — busy_intervals returns [] on failure
        assert slots == TestAvailabilityWithSA._baseline, (
            f"availability changed with SA connected + failing key. Baseline={TestAvailabilityWithSA._baseline}, got={slots}"
        )

    def test_teardown_disconnect_and_employee(self, admin_client):
        admin_client.post(f"{API}/admin/calendar/disconnect")
        emp_id = TestAvailabilityWithSA.TEST_EMP_ID
        if emp_id:
            r = admin_client.delete(f"{API}/admin/employees/{emp_id}")
            assert r.status_code == 200


# ---------------- POST /admin/change-credentials ----------------
class TestChangeCredentialsAuthAndValidation:
    def test_requires_auth(self, client):
        r = client.post(f"{API}/admin/change-credentials", json={"current_password": ADMIN_PASSWORD, "new_password": "NewPass@2025"})
        assert r.status_code == 401

    def test_wrong_current_password(self, admin_client):
        r = admin_client.post(f"{API}/admin/change-credentials", json={"current_password": "totally-wrong", "new_password": "NewPass@2025"})
        assert r.status_code == 401

    def test_nothing_to_change(self, admin_client):
        r = admin_client.post(f"{API}/admin/change-credentials", json={"current_password": ADMIN_PASSWORD})
        assert r.status_code == 400

    def test_short_new_password(self, admin_client):
        r = admin_client.post(f"{API}/admin/change-credentials", json={"current_password": ADMIN_PASSWORD, "new_password": "short"})
        assert r.status_code == 400

    def test_malformed_new_email(self, admin_client):
        r = admin_client.post(f"{API}/admin/change-credentials", json={"current_password": ADMIN_PASSWORD, "new_email": "no-at-sign"})
        assert r.status_code == 400


class TestCredentialsMutations:
    """All admin credential-mutating tests in ONE class so xdist loadscope
    keeps them on a single worker. Also guard with a filesystem lock so that
    module-level admin_token fixtures in OTHER classes never see a login-401
    window. Every mutation is followed by an immediate revert."""

    NEW_PASSWORD = "TestPass@2025"
    NEW_EMAIL = "test-admin-alt@galaxy.salon"
    CONFLICT_USER_EMAIL = "test_conflict-user@galaxy.salon"
    conflict_id = None

    def _fresh_admin(self, client, email=ADMIN_EMAIL, password=ADMIN_PASSWORD):
        r = _login_with(client, email, password)
        assert r.status_code == 200, r.text
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {r.json()['token']}"})
        return s

    def test_change_password_happy_path_and_revert(self, client):
        with _ADMIN_LOCK:
            s = self._fresh_admin(client)
            # 1) change password
            r = s.post(f"{API}/admin/change-credentials", json={
                "current_password": ADMIN_PASSWORD, "new_password": self.NEW_PASSWORD,
            })
            assert r.status_code == 200, r.text
            d = r.json()
            assert d.get("ok") is True and d.get("password_changed") is True

            # 2) login with new password works
            r2 = _login_with(client, ADMIN_EMAIL, self.NEW_PASSWORD)
            assert r2.status_code == 200

            # 3) old password fails
            r3 = _login_with(client, ADMIN_EMAIL, ADMIN_PASSWORD)
            assert r3.status_code == 401

            # 4) revert with new-password auth
            new_tok = r2.json()["token"]
            s2 = requests.Session()
            s2.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {new_tok}"})
            rrev = s2.post(f"{API}/admin/change-credentials", json={
                "current_password": self.NEW_PASSWORD, "new_password": ADMIN_PASSWORD,
            })
            assert rrev.status_code == 200, rrev.text

            # 5) confirm original creds restored
            rlast = _login_with(client, ADMIN_EMAIL, ADMIN_PASSWORD)
            assert rlast.status_code == 200

    def test_email_conflict_returns_409(self, client, mongo_db):
        with _ADMIN_LOCK:
            db, Runner = mongo_db
            import bcrypt, uuid
            pw_hash = bcrypt.hashpw(b"someirrelevant", bcrypt.gensalt()).decode()
            uid = str(uuid.uuid4())

            async def _insert():
                await db.users.insert_one({
                    "id": uid, "email": self.CONFLICT_USER_EMAIL,
                    "password_hash": pw_hash, "role": "staff", "name": "TEST_Conflict",
                })
            Runner.run(_insert())
            TestCredentialsMutations.conflict_id = uid

            s = self._fresh_admin(client)
            r = s.post(f"{API}/admin/change-credentials", json={
                "current_password": ADMIN_PASSWORD,
                "new_email": self.CONFLICT_USER_EMAIL,
            })
            assert r.status_code == 409, r.text

    def test_valid_new_email_then_revert(self, client):
        with _ADMIN_LOCK:
            s = self._fresh_admin(client)
            # change email
            r = s.post(f"{API}/admin/change-credentials", json={
                "current_password": ADMIN_PASSWORD, "new_email": self.NEW_EMAIL,
            })
            assert r.status_code == 200, r.text
            # login with new email works
            r2 = _login_with(client, self.NEW_EMAIL, ADMIN_PASSWORD)
            assert r2.status_code == 200, r2.text
            # revert
            s2 = requests.Session()
            s2.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {r2.json()['token']}"})
            r3 = s2.post(f"{API}/admin/change-credentials", json={
                "current_password": ADMIN_PASSWORD, "new_email": ADMIN_EMAIL,
            })
            assert r3.status_code == 200, r3.text
            # original works
            r4 = _login_with(client, ADMIN_EMAIL, ADMIN_PASSWORD)
            assert r4.status_code == 200

    def test_cleanup_conflict_user(self, mongo_db):
        db, Runner = mongo_db
        if TestCredentialsMutations.conflict_id:
            async def _del():
                await db.users.delete_one({"id": TestCredentialsMutations.conflict_id})
            Runner.run(_del())

