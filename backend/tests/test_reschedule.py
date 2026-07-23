"""Reschedule endpoint tests: POST /api/admin/bookings/{id}/reschedule."""
import os
import re
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


def _ist_now():
    return datetime.utcnow() + timedelta(hours=5, minutes=30)


def _future_date(days=5):
    return (_ist_now() + timedelta(days=days)).strftime("%Y-%m-%d")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_client(client):
    import time
    r = None
    for _ in range(15):
        r = client.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if r.status_code == 200:
            break
        time.sleep(0.5)
    if r is None or r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code if r else 'no-resp'}")
    token = r.json()["token"]
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def services(client):
    return client.get(f"{API}/services").json()


@pytest.fixture(scope="module")
def employees(client):
    return client.get(f"{API}/employees").json()


def _make_booking(client, employees, services, day_offset=6, phone="+919999900050", cust="TEST_Resched Cust"):
    """Create a fresh pending booking; return the booking dict."""
    emp = employees[0]
    svc = next(s for s in services if s.get("duration", 60) <= 60)
    date_str = _future_date(day_offset)
    av = client.get(f"{API}/availability", params={
        "employee_id": emp["id"], "service_id": svc["id"], "date": date_str
    }).json()
    assert av["slots"], "No slots to seed test booking"
    slot = av["slots"][0]
    r = client.post(f"{API}/bookings", json={
        "service_id": svc["id"], "employee_id": emp["id"], "date": date_str,
        "start_time": slot, "customer_name": cust, "customer_phone": phone,
    })
    assert r.status_code == 200, r.text
    return r.json()["booking"]


# ============================================================
# Reschedule happy paths & validation
# ============================================================
class TestReschedule:

    def test_requires_auth(self, client, employees, services):
        b = _make_booking(client, employees, services, day_offset=7, phone="+919999901001")
        r = client.post(f"{API}/admin/bookings/{b['id']}/reschedule",
                        json={"date": b["date"], "start_time": b["start_time"]})
        assert r.status_code == 401

    def test_unknown_booking_404(self, admin_client):
        r = admin_client.post(f"{API}/admin/bookings/does-not-exist/reschedule",
                              json={"date": _future_date(3), "start_time": "11:00"})
        assert r.status_code == 404

    def test_reschedule_same_slot_noop(self, client, admin_client, employees, services):
        """Rescheduling to the exact same slot should NOT hit conflict (excludes itself)."""
        b = _make_booking(client, employees, services, day_offset=8, phone="+919999901002")
        r = admin_client.post(f"{API}/admin/bookings/{b['id']}/reschedule",
                              json={"date": b["date"], "start_time": b["start_time"]})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["booking"]["start_time"] == b["start_time"]
        assert data["booking"]["date"] == b["date"]
        assert data["booking"]["end_time"] == b["end_time"]
        # Google not configured → calendar_synced must be False
        assert data["calendar_synced"] is False

    def test_reschedule_new_time_updates_end_time(self, client, admin_client, employees, services):
        b = _make_booking(client, employees, services, day_offset=9, phone="+919999901003")
        # Pick a different slot on same day
        av = client.get(f"{API}/availability", params={
            "employee_id": b["employee_id"], "service_id": b["service_id"], "date": b["date"]
        }).json()
        # Find a slot that's not the current
        new_slot = next(s for s in av["slots"] if s != b["start_time"])
        r = admin_client.post(f"{API}/admin/bookings/{b['id']}/reschedule",
                              json={"date": b["date"], "start_time": new_slot})
        assert r.status_code == 200, r.text
        data = r.json()
        bk = data["booking"]
        assert bk["start_time"] == new_slot
        # end_time = start_time + duration
        h, m = map(int, new_slot.split(":"))
        end_m = h * 60 + m + int(bk["duration"])
        assert bk["end_time"] == f"{end_m//60:02d}:{end_m%60:02d}"
        # GET verify persisted
        g = admin_client.get(f"{API}/admin/bookings").json()
        me = next(x for x in g if x["id"] == b["id"])
        assert me["start_time"] == new_slot

    def test_reschedule_employee_swap(self, client, admin_client, employees, services):
        b = _make_booking(client, employees, services, day_offset=10, phone="+919999901004")
        other = next(e for e in employees if e["id"] != b["employee_id"])
        # Pick a slot valid on the new employee
        av = client.get(f"{API}/availability", params={
            "employee_id": other["id"], "service_id": b["service_id"], "date": b["date"]
        }).json()
        assert av["slots"], "No slots on other stylist"
        new_slot = av["slots"][0]
        r = admin_client.post(f"{API}/admin/bookings/{b['id']}/reschedule",
                              json={"date": b["date"], "start_time": new_slot, "employee_id": other["id"]})
        assert r.status_code == 200, r.text
        bk = r.json()["booking"]
        assert bk["employee_id"] == other["id"]
        assert bk["employee_name"] == other["name"]
        assert bk["start_time"] == new_slot

    def test_reject_past_date(self, client, admin_client, employees, services):
        b = _make_booking(client, employees, services, day_offset=11, phone="+919999901005")
        past = (_ist_now() - timedelta(days=1)).strftime("%Y-%m-%d")
        r = admin_client.post(f"{API}/admin/bookings/{b['id']}/reschedule",
                              json={"date": past, "start_time": "11:00"})
        assert r.status_code == 400
        assert "past" in r.json().get("detail", "").lower()

    def test_reject_outside_working_hours(self, client, admin_client, employees, services):
        b = _make_booking(client, employees, services, day_offset=12, phone="+919999901006")
        r = admin_client.post(f"{API}/admin/bookings/{b['id']}/reschedule",
                              json={"date": b["date"], "start_time": "08:00"})
        assert r.status_code == 400
        assert "working hours" in r.json().get("detail", "").lower()

    def test_reject_on_leave(self, client, admin_client, employees, services):
        b = _make_booking(client, employees, services, day_offset=13, phone="+919999901007")
        emp_id = b["employee_id"]
        leave_day = _future_date(14)
        # Save & set leaves
        emp = next(e for e in employees if e["id"] == emp_id)
        orig_leaves = list(emp.get("leaves", []))
        try:
            up = admin_client.patch(f"{API}/admin/employees/{emp_id}", json={"leaves": orig_leaves + [leave_day]})
            assert up.status_code == 200
            r = admin_client.post(f"{API}/admin/bookings/{b['id']}/reschedule",
                                  json={"date": leave_day, "start_time": "11:00"})
            assert r.status_code == 400, r.text
            assert "leave" in r.json().get("detail", "").lower()
        finally:
            admin_client.patch(f"{API}/admin/employees/{emp_id}", json={"leaves": orig_leaves})

    def test_reject_conflict(self, client, admin_client, employees, services):
        # Create two bookings on same employee same day, then try to move #2 onto #1
        emp = employees[1]
        svc = next(s for s in services if s.get("duration", 60) <= 60)
        date_str = _future_date(15)
        av = client.get(f"{API}/availability", params={
            "employee_id": emp["id"], "service_id": svc["id"], "date": date_str
        }).json()
        assert len(av["slots"]) >= 2
        slot_a, slot_b = av["slots"][0], av["slots"][2] if len(av["slots"]) > 2 else av["slots"][1]

        r1 = client.post(f"{API}/bookings", json={
            "service_id": svc["id"], "employee_id": emp["id"], "date": date_str,
            "start_time": slot_a, "customer_name": "TEST_Conflict A", "customer_phone": "+919999901008"
        })
        assert r1.status_code == 200, r1.text
        r2 = client.post(f"{API}/bookings", json={
            "service_id": svc["id"], "employee_id": emp["id"], "date": date_str,
            "start_time": slot_b, "customer_name": "TEST_Conflict B", "customer_phone": "+919999901009"
        })
        assert r2.status_code == 200, r2.text
        b2 = r2.json()["booking"]

        # try move b2 onto slot_a
        r = admin_client.post(f"{API}/admin/bookings/{b2['id']}/reschedule",
                              json={"date": date_str, "start_time": slot_a})
        assert r.status_code == 409, r.text

    def test_reject_cancelled_booking(self, client, admin_client, employees, services):
        b = _make_booking(client, employees, services, day_offset=16, phone="+919999901010")
        # cancel it
        up = admin_client.patch(f"{API}/admin/bookings/{b['id']}", json={"status": "cancelled"})
        assert up.status_code == 200
        r = admin_client.post(f"{API}/admin/bookings/{b['id']}/reschedule",
                              json={"date": _future_date(17), "start_time": "11:00"})
        assert r.status_code == 400
        assert "cancelled" in r.json().get("detail", "").lower()

    def test_calendar_synced_false_when_google_off(self, client, admin_client, employees, services):
        b = _make_booking(client, employees, services, day_offset=18, phone="+919999901011")
        # Confirm booking (pay) — even confirmed booking with no google event → calendar_synced still False
        pay = client.post(f"{API}/payments/verify", json={"booking_id": b["id"]})
        assert pay.status_code == 200
        # Now reschedule
        av = client.get(f"{API}/availability", params={
            "employee_id": b["employee_id"], "service_id": b["service_id"], "date": b["date"]
        }).json()
        new_slot = next((s for s in av["slots"] if s != b["start_time"]), b["start_time"])
        r = admin_client.post(f"{API}/admin/bookings/{b['id']}/reschedule",
                              json={"date": b["date"], "start_time": new_slot})
        assert r.status_code == 200, r.text
        assert r.json()["calendar_synced"] is False

    def test_calendar_status_still_env_false(self, admin_client):
        r = admin_client.get(f"{API}/admin/calendar/status")
        assert r.status_code == 200
        d = r.json()
        assert d["env_configured"] is False
        assert d["connected"] is False


# ============================================================
# Regression sanity — ensure other endpoints still fine
# ============================================================
class TestRegressionAfterReschedule:
    def test_admin_bookings_still_lists(self, admin_client):
        r = admin_client.get(f"{API}/admin/bookings")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_stats(self, admin_client):
        r = admin_client.get(f"{API}/admin/stats")
        assert r.status_code == 200
        for k in ("today_bookings", "pending", "confirmed", "customers"):
            assert k in r.json()
