"""Tests for Google Calendar integration (unconfigured env - graceful skip)."""
import os
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@galaxy.salon"
ADMIN_PASSWORD = "Galaxy@2025"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(client):
    # Retry briefly to survive concurrent password-mutation tests in other xdist workers.
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


# ---------- Calendar status ----------
class TestCalendarStatus:
    def test_status_requires_auth(self, client):
        r = client.get(f"{API}/admin/calendar/status")
        assert r.status_code == 401

    def test_status_unconfigured(self, admin_client):
        r = admin_client.get(f"{API}/admin/calendar/status")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("env_configured") is False
        assert d.get("connected") is False
        assert d.get("email") in (None, "")


# ---------- Calendar connect ----------
class TestCalendarConnect:
    def test_connect_without_token(self, client):
        # Do NOT follow redirect; endpoint expects `token` query param
        r = client.get(f"{API}/admin/calendar/connect", allow_redirects=False)
        # FastAPI returns 422 when required query param missing, but spec says 401.
        # Accept either; the endpoint must NOT succeed anonymously.
        assert r.status_code in (401, 422), r.text

    def test_connect_invalid_token(self, client):
        r = client.get(f"{API}/admin/calendar/connect",
                       params={"token": "not-a-real-jwt"}, allow_redirects=False)
        assert r.status_code == 401

    def test_connect_env_not_configured(self, client, admin_token):
        r = client.get(f"{API}/admin/calendar/connect",
                       params={"token": admin_token}, allow_redirects=False)
        # env not configured → 400
        assert r.status_code == 400
        assert "credentials" in r.text.lower() or "configured" in r.text.lower()


# ---------- Calendar disconnect ----------
class TestCalendarDisconnect:
    def test_disconnect_requires_auth(self, client):
        r = client.post(f"{API}/admin/calendar/disconnect")
        assert r.status_code == 401

    def test_disconnect_when_not_connected(self, admin_client):
        r = admin_client.post(f"{API}/admin/calendar/disconnect")
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Calendar test endpoint ----------
class TestCalendarTest:
    def test_test_requires_auth(self, client):
        r = client.get(f"{API}/admin/calendar/test")
        assert r.status_code == 401

    def test_test_when_not_connected(self, admin_client):
        r = admin_client.get(f"{API}/admin/calendar/test")
        assert r.status_code == 400


# ---------- Employee google_calendar_id ----------
class TestEmployeeCalendarField:
    created_id = None

    def test_create_employee_with_calendar_id(self, admin_client):
        payload = {
            "name": "TEST_CalEmp",
            "position": "Stylist",
            "google_calendar_id": "test-stylist@example.com",
            "active": True,
        }
        r = admin_client.post(f"{API}/admin/employees", json=payload)
        assert r.status_code == 200, r.text
        obj = r.json()
        assert obj.get("id")
        assert obj.get("google_calendar_id") == "test-stylist@example.com"
        TestEmployeeCalendarField.created_id = obj["id"]

    def test_get_employee_returns_calendar_id(self, admin_client):
        assert TestEmployeeCalendarField.created_id
        r = admin_client.get(f"{API}/admin/employees")
        assert r.status_code == 200
        matches = [e for e in r.json() if e.get("id") == TestEmployeeCalendarField.created_id]
        assert matches, "created employee not found"
        assert matches[0].get("google_calendar_id") == "test-stylist@example.com"

    def test_patch_employee_calendar_id(self, admin_client):
        assert TestEmployeeCalendarField.created_id
        r = admin_client.patch(
            f"{API}/admin/employees/{TestEmployeeCalendarField.created_id}",
            json={"google_calendar_id": "another@example.com"},
        )
        assert r.status_code == 200
        assert r.json().get("google_calendar_id") == "another@example.com"

    def test_cleanup_employee(self, admin_client):
        assert TestEmployeeCalendarField.created_id
        r = admin_client.delete(f"{API}/admin/employees/{TestEmployeeCalendarField.created_id}")
        assert r.status_code == 200


# ---------- End-to-end booking regression (calendar OFF) ----------
class TestBookingFlowWithoutCalendar:
    booking_id = None

    def _future_date(self, days=6):
        return (datetime.utcnow() + timedelta(hours=5, minutes=30) + timedelta(days=days)).strftime("%Y-%m-%d")

    def test_full_booking_flow_no_google_event(self, client):
        # Fetch data
        emp = client.get(f"{API}/employees").json()[0]
        svc = client.get(f"{API}/services").json()[0]
        date_str = self._future_date()
        av = client.get(f"{API}/availability", params={
            "employee_id": emp["id"], "service_id": svc["id"], "date": date_str
        }).json()
        assert av["slots"], "no slots"
        slot = av["slots"][0]

        # Create booking
        payload = {
            "service_id": svc["id"], "employee_id": emp["id"],
            "date": date_str, "start_time": slot,
            "customer_name": "TEST_Cal Customer",
            "customer_phone": "+919999900077",
        }
        r = client.post(f"{API}/bookings", json=payload)
        assert r.status_code == 200, r.text
        booking_id = r.json()["booking"]["id"]

        # Verify payment (mock)
        rv = client.post(f"{API}/payments/verify", json={"booking_id": booking_id})
        assert rv.status_code == 200, rv.text
        d = rv.json()
        assert d["success"] is True
        booking = d["booking"]
        assert booking["status"] == "confirmed"
        # No google_event_id should be attached because env unconfigured
        assert not booking.get("google_event_id"), f"unexpected google_event_id present: {booking.get('google_event_id')}"
        assert not booking.get("google_calendar_id"), f"unexpected google_calendar_id present: {booking.get('google_calendar_id')}"
        TestBookingFlowWithoutCalendar.booking_id = booking_id

    def test_cancel_booking_when_no_google_event(self, admin_client):
        assert TestBookingFlowWithoutCalendar.booking_id
        r = admin_client.patch(
            f"{API}/admin/bookings/{TestBookingFlowWithoutCalendar.booking_id}",
            json={"status": "cancelled"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "cancelled"
