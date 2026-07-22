"""Galaxy Salon API - Comprehensive backend tests."""
import os
import re
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://appointment-hub-969.preview.emergentagent.com").rstrip("/")
# Fallback: read from frontend/.env
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@galaxy.salon"
ADMIN_PASSWORD = "Galaxy@2025"


# ------------------ Fixtures ------------------
@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(client):
    r = client.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_client(client, admin_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"})
    return s


@pytest.fixture(scope="session")
def categories(client):
    r = client.get(f"{API}/categories")
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="session")
def services(client):
    r = client.get(f"{API}/services")
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="session")
def employees(client):
    r = client.get(f"{API}/employees")
    assert r.status_code == 200
    return r.json()


# ------------------ Public: Root + Business ------------------
class TestPublicMisc:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data == {"app": "Galaxy Salon API", "status": "ok"}

    def test_business(self, client):
        r = client.get(f"{API}/business")
        assert r.status_code == 200
        d = r.json()
        for k in ("name", "tagline", "address", "phone", "working_hours_text"):
            assert k in d and d[k]

    def test_hero_slides(self, client):
        r = client.get(f"{API}/hero-slides")
        assert r.status_code == 200
        slides = r.json()
        assert len(slides) == 4
        for s in slides:
            for k in ("chapter", "headline", "description", "image"):
                assert s.get(k)
        # ordered
        orders = [s["order"] for s in slides]
        assert orders == sorted(orders)

    def test_categories(self, client, categories):
        assert len(categories) == 2
        names = {c["name"] for c in categories}
        assert names == {"Men's Services", "Women's Services"}

    def test_gallery(self, client):
        r = client.get(f"{API}/gallery")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        assert all("image" in i for i in items)

    def test_testimonials(self, client):
        r = client.get(f"{API}/testimonials")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        assert all(i.get("active", True) for i in items)

    def test_faqs(self, client):
        r = client.get(f"{API}/faqs")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        assert all("question" in i and "answer" in i for i in items)


# ------------------ Public: Services / Employees ------------------
class TestServicesEmployees:
    def test_services_count(self, services):
        assert len(services) == 43, f"expected 43 services, got {len(services)}"

    def test_services_by_category(self, client, categories, services):
        men = next(c for c in categories if c["slug"] == "men")
        women = next(c for c in categories if c["slug"] == "women")
        r_m = client.get(f"{API}/services", params={"category_id": men["id"]})
        r_w = client.get(f"{API}/services", params={"category_id": women["id"]})
        assert r_m.status_code == 200 and r_w.status_code == 200
        assert len(r_m.json()) == 26
        assert len(r_w.json()) == 17

    def test_services_featured(self, client):
        r = client.get(f"{API}/services", params={"featured": "true"})
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 1
        assert all(s.get("featured") is True for s in arr)

    def test_employees(self, employees):
        assert len(employees) == 4
        for e in employees:
            assert e.get("photo") and e.get("position") and e.get("specialty")

    def test_employees_by_service(self, client, employees, services):
        svc_id = services[0]["id"]
        r = client.get(f"{API}/employees", params={"service_id": svc_id})
        assert r.status_code == 200
        # By seed default, service_ids = [] (means all), so all 4 must return
        assert len(r.json()) == 4


# ------------------ Availability ------------------
class TestAvailability:
    def _future_date(self, days=3):
        return (datetime.utcnow() + timedelta(hours=5, minutes=30) + timedelta(days=days)).strftime("%Y-%m-%d")

    def test_availability_valid(self, client, employees, services):
        emp = employees[0]
        svc = services[0]
        date_str = self._future_date()
        r = client.get(f"{API}/availability", params={"employee_id": emp["id"], "service_id": svc["id"], "date": date_str})
        assert r.status_code == 200
        data = r.json()
        assert data["date"] == date_str
        assert isinstance(data["slots"], list) and len(data["slots"]) > 0
        # Slots must be 30-min grid within 10:00-20:00 and multiple of 30 from start
        for s in data["slots"]:
            assert re.match(r"^\d{2}:\d{2}$", s)
            h, m = map(int, s.split(":"))
            mins = h * 60 + m
            assert 10 * 60 <= mins < 20 * 60
            assert (mins - 10 * 60) % 30 == 0

    def test_availability_past_date_empty(self, client, employees, services):
        past = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        r = client.get(f"{API}/availability", params={"employee_id": employees[0]["id"], "service_id": services[0]["id"], "date": past})
        assert r.status_code == 200
        assert r.json()["slots"] == []

    def test_availability_bad_date(self, client, employees, services):
        r = client.get(f"{API}/availability", params={"employee_id": employees[0]["id"], "service_id": services[0]["id"], "date": "notadate"})
        assert r.status_code == 400

    def test_availability_unknown_employee(self, client, services):
        date_str = self._future_date()
        r = client.get(f"{API}/availability", params={"employee_id": "does-not-exist", "service_id": services[0]["id"], "date": date_str})
        assert r.status_code == 404

    def test_availability_unknown_service(self, client, employees):
        date_str = self._future_date()
        r = client.get(f"{API}/availability", params={"employee_id": employees[0]["id"], "service_id": "does-not-exist", "date": date_str})
        assert r.status_code == 404


# ------------------ Booking + Payment ------------------
class TestBookingFlow:
    booking_id = None
    booking_code = None

    def _future_date(self, days=4):
        return (datetime.utcnow() + timedelta(hours=5, minutes=30) + timedelta(days=days)).strftime("%Y-%m-%d")

    def test_create_booking_and_verify(self, client, employees, services):
        emp = employees[0]
        svc = services[0]
        date_str = self._future_date(days=5)
        av = client.get(f"{API}/availability", params={"employee_id": emp["id"], "service_id": svc["id"], "date": date_str}).json()
        assert av["slots"], "No slots available"
        slot = av["slots"][0]

        payload = {
            "service_id": svc["id"],
            "employee_id": emp["id"],
            "date": date_str,
            "start_time": slot,
            "customer_name": "TEST_John Doe",
            "customer_phone": "+919999900001",
            "customer_email": "TEST_john@example.com",
            "notes": "TEST_notes",
        }
        r = client.post(f"{API}/bookings", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "booking" in body and "order" in body
        booking = body["booking"]
        assert booking["booking_code"].startswith("GX") and len(booking["booking_code"]) == 8
        # compute end_time
        h, m = map(int, slot.split(":"))
        end_min = h * 60 + m + int(svc["duration"])
        assert booking["end_time"] == f"{end_min//60:02d}:{end_min%60:02d}"
        assert booking["status"] == "pending"
        assert booking["payment_status"] == "unpaid"
        assert booking["deposit"] > 0
        assert body["order"]["amount"] == int(booking["deposit"] * 100)
        TestBookingFlow.booking_id = booking["id"]
        TestBookingFlow.booking_code = booking["booking_code"]

        # GET verify
        g = client.get(f"{API}/bookings/{booking['id']}")
        assert g.status_code == 200
        assert g.json()["id"] == booking["id"]

    def test_duplicate_slot_rejected(self, client, employees, services):
        assert TestBookingFlow.booking_id, "Prior test must have created a booking"
        # Re-fetch the same booking to get date/time
        b = client.get(f"{API}/bookings/{TestBookingFlow.booking_id}").json()
        payload = {
            "service_id": b["service_id"],
            "employee_id": b["employee_id"],
            "date": b["date"],
            "start_time": b["start_time"],
            "customer_name": "TEST_Jane",
            "customer_phone": "+919999900002",
        }
        r = client.post(f"{API}/bookings", json=payload)
        assert r.status_code == 409

    def test_payment_verify_mock(self, client):
        assert TestBookingFlow.booking_id
        r = client.post(f"{API}/payments/verify", json={"booking_id": TestBookingFlow.booking_id})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["success"] is True
        assert d["booking"]["status"] == "confirmed"
        assert d["booking"]["payment_status"] == "paid"
        assert d["booking"]["payment_id"]

    def test_get_booking_after_pay(self, client):
        b = client.get(f"{API}/bookings/{TestBookingFlow.booking_id}").json()
        assert b["status"] == "confirmed"
        assert b["payment_status"] == "paid"


# ------------------ Admin auth ------------------
class TestAdminAuth:
    def test_login_success(self, client):
        r = client.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and d["token"]
        assert d["user"]["email"] == ADMIN_EMAIL and d["user"]["role"] == "admin"

    def test_login_wrong_password(self, client):
        r = client.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_token(self, client):
        r = client.get(f"{API}/admin/me")
        assert r.status_code == 401

    def test_me_with_token(self, admin_client):
        r = admin_client.get(f"{API}/admin/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ------------------ Admin data ------------------
class TestAdminData:
    def test_stats(self, admin_client):
        r = admin_client.get(f"{API}/admin/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("today_bookings", "today_revenue", "customers", "popular_services"):
            assert k in d
        assert isinstance(d["popular_services"], list)

    def test_bookings_list(self, admin_client):
        r = admin_client.get(f"{API}/admin/bookings")
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 1

    def test_bookings_filter_status(self, admin_client):
        r = admin_client.get(f"{API}/admin/bookings", params={"status": "confirmed"})
        assert r.status_code == 200
        for b in r.json():
            assert b["status"] == "confirmed"

    def test_bookings_search_q(self, admin_client):
        # Search by code "GX"
        r = admin_client.get(f"{API}/admin/bookings", params={"q": "GX"})
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 1

    def test_patch_booking_completed(self, admin_client):
        # Take the booking created above
        arr = admin_client.get(f"{API}/admin/bookings", params={"q": "TEST_John"}).json()
        assert arr, "no test booking found"
        bid = arr[0]["id"]
        r = admin_client.patch(f"{API}/admin/bookings/{bid}", json={"status": "completed"})
        assert r.status_code == 200
        assert r.json()["status"] == "completed"

    def test_customers(self, admin_client):
        r = admin_client.get(f"{API}/admin/customers")
        assert r.status_code == 200
        assert any(c["phone"] == "+919999900001" for c in r.json())

    def test_business_get_patch(self, admin_client):
        r = admin_client.get(f"{API}/admin/business")
        assert r.status_code == 200
        orig = r.json()
        new_phone = orig.get("phone") or "+91 70053 04922"
        r2 = admin_client.patch(f"{API}/admin/business", json={"phone": new_phone})
        assert r2.status_code == 200
        assert r2.json()["phone"] == new_phone


# ------------------ Admin CRUD (generic) ------------------
class TestAdminCRUD:
    @pytest.mark.parametrize("path,payload", [
        ("categories", {"name": "TEST_Cat", "slug": "test-cat", "active": True, "order": 99}),
        ("services", {"name": "TEST_Svc", "category_id": "x", "duration": 30, "price": 100, "deposit": 30, "active": True}),
        ("employees", {"name": "TEST_Emp", "position": "TEST", "active": True}),
        ("hero-slides", {"chapter": "TEST", "headline": "Hello", "description": "desc", "image": "x", "active": True, "order": 99}),
        ("gallery", {"image": "https://x/y.jpg", "caption": "TEST", "order": 99}),
        ("testimonials", {"name": "TEST_Rev", "rating": 5, "review": "TEST", "active": True}),
        ("faqs", {"question": "TEST_Q", "answer": "TEST_A", "active": True}),
    ])
    def test_crud_flow(self, admin_client, path, payload):
        # CREATE
        r = admin_client.post(f"{API}/admin/{path}", json=payload)
        assert r.status_code == 200, r.text
        obj = r.json()
        assert obj.get("id")
        iid = obj["id"]

        # PATCH
        upd = {"order": 42}
        r2 = admin_client.patch(f"{API}/admin/{path}/{iid}", json=upd)
        assert r2.status_code == 200
        assert r2.json().get("order") == 42

        # DELETE
        r3 = admin_client.delete(f"{API}/admin/{path}/{iid}")
        assert r3.status_code == 200
        # verify gone
        r4 = admin_client.get(f"{API}/admin/{path}")
        assert not any(x.get("id") == iid for x in r4.json())


# ------------------ Auth guard on admin routes ------------------
class TestAdminAuthGuard:
    @pytest.mark.parametrize("endpoint", [
        "/admin/stats",
        "/admin/bookings",
        "/admin/customers",
        "/admin/business",
        "/admin/categories",
        "/admin/services",
        "/admin/employees",
        "/admin/hero-slides",
        "/admin/gallery",
        "/admin/testimonials",
        "/admin/faqs",
    ])
    def test_requires_token(self, client, endpoint):
        r = client.get(f"{API}{endpoint}")
        assert r.status_code == 401
