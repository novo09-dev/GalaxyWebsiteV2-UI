from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, hmac, hashlib, secrets, jwt, bcrypt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta, time as dtime
from bson import ObjectId

import gcal

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
JWT_EXPIRE_HOURS = 24 * 7

app = FastAPI(title="Galaxy Salon API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logger = logging.getLogger("galaxy")
logging.basicConfig(level=logging.INFO)


# ============================================================
# Helpers
# ============================================================
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def clean(doc: dict) -> dict:
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


def create_token(sub: str, role: str) -> str:
    payload = {
        "sub": sub,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    if payload.get("role") != "admin":
        raise HTTPException(403, "Forbidden")
    return payload


# ============================================================
# Models
# ============================================================
class Category(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    slug: str
    description: str = ""
    image: str = ""
    order: int = 0
    active: bool = True


class Service(BaseModel):
    id: str = Field(default_factory=new_id)
    category_id: str
    name: str
    description: str = ""
    duration: int  # minutes
    price: float
    deposit: float
    image: str = ""
    featured: bool = False
    active: bool = True
    order: int = 0


class WorkingHours(BaseModel):
    # 0=Mon .. 6=Sun; start/end in HH:MM 24h
    day: int
    start: str = "10:00"
    end: str = "20:00"
    open: bool = True


class Employee(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    position: str = ""
    specialty: str = ""
    bio: str = ""
    photo: str = ""
    rating: float = 4.8
    working_hours: List[WorkingHours] = []
    leaves: List[str] = []  # ISO date strings YYYY-MM-DD
    service_ids: List[str] = []  # empty = all
    google_calendar_id: str = ""  # empty = owner's primary calendar
    active: bool = True
    order: int = 0


class Customer(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    phone: str
    email: str = ""
    notes: str = ""
    total_visits: int = 0
    lifetime_spend: float = 0.0
    last_visit: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class Booking(BaseModel):
    id: str = Field(default_factory=new_id)
    booking_code: str
    customer_id: str
    customer_name: str
    customer_phone: str
    customer_email: str = ""
    service_id: str
    service_name: str
    category_id: str
    employee_id: str
    employee_name: str
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str
    duration: int
    price: float
    deposit: float
    balance: float
    notes: str = ""
    status: str = "pending"  # pending, confirmed, completed, cancelled, no_show
    payment_status: str = "unpaid"  # unpaid, paid, refunded
    payment_id: Optional[str] = None
    google_event_id: Optional[str] = None
    google_calendar_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class HeroSlide(BaseModel):
    id: str = Field(default_factory=new_id)
    chapter: str
    headline: str
    description: str
    image: str
    cta_label: str = "Book Appointment"
    order: int = 0
    active: bool = True


class GalleryItem(BaseModel):
    id: str = Field(default_factory=new_id)
    image: str
    caption: str = ""
    category: str = "salon"
    order: int = 0


class Testimonial(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    rating: int = 5
    review: str
    photo: str = ""
    active: bool = True
    order: int = 0


class FAQ(BaseModel):
    id: str = Field(default_factory=new_id)
    question: str
    answer: str
    order: int = 0
    active: bool = True


class BusinessInfo(BaseModel):
    name: str = "Galaxy"
    tagline: str = "Hair • Beauty • Style"
    address: str = "Jail Ashram Road, Dhaleswar, Agartala, Tripura – 799004, India"
    phone: str = "+91 70053 04922"
    email: str = "hello@galaxysalon.in"
    whatsapp: str = "+91 70053 04922"
    instagram: str = ""
    facebook: str = ""
    maps_url: str = "https://maps.google.com/?q=Dhaleswar+Agartala+Tripura"
    working_hours_text: str = "Mon – Sun · 10:00 AM – 8:00 PM"
    about: str = "A unisex Hair, Beauty & Style studio in the heart of Agartala. We combine expertise, hygiene and genuine care to deliver results that last."


class LoginBody(BaseModel):
    email: str
    password: str


class BookingCreate(BaseModel):
    service_id: str
    employee_id: str
    date: str
    start_time: str
    customer_name: str
    customer_phone: str
    customer_email: str = ""
    notes: str = ""


class PaymentVerify(BaseModel):
    booking_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


# ============================================================
# Seed / Startup
# ============================================================
MENS_SERVICES = [
    ("Haircuts", "Hair Cut", 200, 60, 40, True),
    ("Beard & Grooming", "Beard (Trimming/Shaving)", 100, 30, 30, True),
    ("Beard & Grooming", "Full Body Trimming", 200, 60, 20, False),
    ("Massage", "Head Massage", 150, 40, 15, False),
    ("Face Care", "Face Wash", 100, 30, 10, False),
    ("Face Care", "Classic Face Scrub", 200, 60, 10, False),
    ("Face Care", "Premium Face Scrub", 300, 90, 10, False),
    ("Face Care", "De-Tan", 400, 100, 20, False),
    ("Face Care", "Facial", 1000, 300, 60, True),
    ("Face Care", "Premium Facial", 2000, 600, 180, False),
    ("Threading", "Threading", 50, 20, 15, False),
    ("Hair Spa", "Normal Hair Spa", 700, 200, 50, True),
    ("Hair Spa", "Hair Fall Treatment", 1000, 300, 90, False),
    ("Hair Spa", "Dandruff Treatment", 1000, 300, 90, False),
    ("Hair Colour", "Normal Colour", 250, 70, 30, False),
    ("Hair Colour", "Henna", 300, 90, 20, False),
    ("Hair Colour", "Professional Colour", 500, 150, 50, False),
    ("Hair Colour", "Highlights", 500, 150, 90, False),
    ("Hair Colour", "Highlights with Global", 1000, 300, 120, False),
    ("Hair Treatments", "Keratin Treatment", 2000, 600, 180, True),
    ("Hair Treatments", "Smoothening", 1500, 400, 180, False),
    ("Hair Treatments", "Straightening", 1600, 400, 200, False),
    ("Hair Treatments", "Rebonding", 1700, 500, 200, False),
    ("Hair Treatments", "Hair Perming", 2000, 600, 240, False),
    ("Hair Treatments", "Botox Hair Treatment", 2300, 600, 180, False),
    ("Hair Treatments", "Nanoplastia Hair Treatment", 3000, 900, 180, False),
]

WOMENS_SERVICES = [
    ("Haircuts", "Basic Haircut", 300, 90, 30, True),
    ("Haircuts", "Advance Haircut", 400, 100, 60, False),
    ("Massage", "Oil Massage", 200, 60, 20, False),
    ("Hair Spa", "Normal Hair Spa", 1000, 300, 90, True),
    ("Hair Spa", "Protein Hair Spa", 1500, 400, 180, False),
    ("Hair Spa", "Anti Hairfall Hair Spa", 1500, 400, 180, False),
    ("Hair Spa", "Anti Dandruff Hair Spa", 1500, 400, 180, False),
    ("Hair Colour", "Root Touch Up", 500, 150, 50, False),
    ("Hair Colour", "Global Hair Colour", 1500, 400, 120, True),
    ("Hair Colour", "Highlights (Any Technique)", 2500, 700, 180, False),
    ("Hair Colour", "Highlights with Global", 4000, 1200, 240, False),
    ("Hair Treatments", "Keratin Hair Treatment", 4000, 1200, 180, True),
    ("Hair Treatments", "Hair Smoothening", 4000, 1200, 240, False),
    ("Hair Treatments", "Hair Straightening", 4500, 1200, 270, False),
    ("Hair Treatments", "Hair Rebonding", 4700, 1300, 300, False),
    ("Hair Treatments", "Botox Hair Treatment", 5000, 1500, 180, False),
    ("Hair Treatments", "Nanoplastia Hair Treatment", 6000, 1800, 240, False),
]

DEFAULT_HERO_SLIDES = [
    {
        "chapter": "Welcome",
        "headline": "Where Skill Meets Style.",
        "description": "Premium hair, skin & grooming services designed around you.",
        "image": "https://images.unsplash.com/photo-1562322140-8baeececf3df?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&w=2000",
        "order": 0,
    },
    {
        "chapter": "Precision",
        "headline": "Every cut. Considered.",
        "description": "Trained stylists, sharpened tools, and an eye for detail — nothing rushed, nothing missed.",
        "image": "https://images.pexels.com/photos/7195803/pexels-photo-7195803.jpeg?auto=compress&cs=tinysrgb&w=2000",
        "order": 1,
    },
    {
        "chapter": "Transformation",
        "headline": "From routine to remarkable.",
        "description": "Colour, treatments, and styling built on chemistry — not guesswork.",
        "image": "https://images.pexels.com/photos/8867400/pexels-photo-8867400.jpeg?auto=compress&cs=tinysrgb&w=2000",
        "order": 2,
    },
    {
        "chapter": "Confidence",
        "headline": "Walk out feeling like you.",
        "description": "Personalised care, honest advice, hygiene first — always.",
        "image": "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=2000",
        "order": 3,
    },
]

DEFAULT_TEAM = [
    {"name": "Arjun Debbarma", "position": "Owner · Master Stylist", "specialty": "Precision haircuts, beard styling", "bio": "12+ years crafting signature looks for men and women across Tripura.", "photo": "https://images.unsplash.com/photo-1595475716260-0f2c35f5a40f?w=800", "rating": 4.9},
    {"name": "Neha Roy", "position": "Senior Stylist", "specialty": "Colour, highlights, keratin", "bio": "A colour specialist trained in Kolkata and Bangalore.", "photo": "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=800", "rating": 4.8},
    {"name": "Rohit Sen", "position": "Grooming Expert", "specialty": "Men's grooming, beard, facials", "bio": "Known for detail-obsessed fades and skin-first grooming.", "photo": "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800", "rating": 4.7},
    {"name": "Pooja Nath", "position": "Treatment Specialist", "specialty": "Hair spa, botox & smoothening", "bio": "Certified in advanced hair treatments and scalp care.", "photo": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800", "rating": 4.8},
]

DEFAULT_GALLERY = [
    "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3993467/pexels-photo-3993467.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1319461/pexels-photo-1319461.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1805600/pexels-photo-1805600.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2076930/pexels-photo-2076930.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/7195809/pexels-photo-7195809.jpeg?auto=compress&cs=tinysrgb&w=1200",
]

DEFAULT_TESTIMONIALS = [
    {"name": "Priya S.", "rating": 5, "review": "Best salon experience I've had in Agartala. The team is patient, professional and my hair colour came out exactly as I wanted."},
    {"name": "Rahul M.", "rating": 5, "review": "Clean, calm and honestly a step above the rest. Booking online with a small deposit made everything smooth."},
    {"name": "Ananya D.", "rating": 5, "review": "The keratin treatment lasted months. Pooja explained every step — I felt looked after, not upsold."},
    {"name": "Sourav B.", "rating": 4, "review": "Great haircut and beard trim. Loved how they respect the appointment time."},
]

DEFAULT_FAQS = [
    {"q": "Do I need to pay the full amount online?", "a": "No. You only pay a small booking deposit (25–30% of the service price) to confirm your slot. The balance is paid at the salon after your service."},
    {"q": "Can I reschedule or cancel my appointment?", "a": "Yes. Reschedules are free up to 4 hours before your appointment. Cancellations within 4 hours may forfeit the deposit."},
    {"q": "Do you serve both men and women?", "a": "Yes, Galaxy is a unisex studio. Every stylist is trained across our full men's and women's service menus."},
    {"q": "Where are you located?", "a": "Jail Ashram Road, Dhaleswar, Agartala, Tripura – 799004. Free walk-in parking is available."},
    {"q": "How early should I arrive?", "a": "Please try to arrive 5 minutes before your appointment so we can start on time and honour the next guest's slot."},
]


async def seed_if_empty():
    # Business info
    if not await db.business_info.find_one({"_singleton": True}):
        info = BusinessInfo().model_dump()
        info["_singleton"] = True
        await db.business_info.insert_one(info)

    # Admin user
    if not await db.users.find_one({"email": os.environ["ADMIN_EMAIL"]}):
        pw = os.environ["ADMIN_PASSWORD"].encode()
        hashed = bcrypt.hashpw(pw, bcrypt.gensalt()).decode()
        await db.users.insert_one({
            "id": new_id(),
            "email": os.environ["ADMIN_EMAIL"],
            "password_hash": hashed,
            "role": "admin",
            "name": "Galaxy Admin",
            "created_at": now_iso(),
        })

    # Categories & Services
    if await db.categories.count_documents({}) == 0:
        cats = [
            {"id": new_id(), "name": "Men's Services", "slug": "men", "description": "Precision cuts, beard, grooming & treatments for men.", "image": "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=1200", "order": 0, "active": True},
            {"id": new_id(), "name": "Women's Services", "slug": "women", "description": "Cuts, colour, spa & advanced treatments for women.", "image": "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=1200", "order": 1, "active": True},
        ]
        await db.categories.insert_many(cats)

        men_cat = cats[0]["id"]
        women_cat = cats[1]["id"]

        # Sub-groupings map to a simple 'group' field on services for display
        service_docs = []
        # Category-level images per service group
        group_images = {
            "Haircuts": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200",
            "Beard & Grooming": "https://images.unsplash.com/photo-1621607512214-68297480165e?w=1200",
            "Massage": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200",
            "Face Care": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200",
            "Threading": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200",
            "Hair Spa": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200",
            "Hair Colour": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200",
            "Hair Treatments": "https://images.unsplash.com/photo-1522336572468-97b06e8ef143?w=1200",
        }
        for i, (grp, name, price, dep, dur, feat) in enumerate(MENS_SERVICES):
            service_docs.append({
                "id": new_id(), "category_id": men_cat, "name": name, "group": grp,
                "description": f"{grp} · {dur} min", "duration": dur, "price": float(price),
                "deposit": float(dep), "image": group_images.get(grp, ""),
                "featured": feat, "active": True, "order": i,
            })
        for i, (grp, name, price, dep, dur, feat) in enumerate(WOMENS_SERVICES):
            service_docs.append({
                "id": new_id(), "category_id": women_cat, "name": name, "group": grp,
                "description": f"{grp} · {dur} min", "duration": dur, "price": float(price),
                "deposit": float(dep), "image": group_images.get(grp, ""),
                "featured": feat, "active": True, "order": i,
            })
        await db.services.insert_many(service_docs)

    # Employees
    if await db.employees.count_documents({}) == 0:
        wh = [{"day": d, "start": "10:00", "end": "20:00", "open": True} for d in range(7)]
        emps = []
        for i, t in enumerate(DEFAULT_TEAM):
            emps.append({
                "id": new_id(), "name": t["name"], "position": t["position"],
                "specialty": t["specialty"], "bio": t["bio"], "photo": t["photo"],
                "rating": t["rating"], "working_hours": wh, "leaves": [],
                "service_ids": [], "active": True, "order": i,
            })
        await db.employees.insert_many(emps)

    # Hero
    if await db.hero_slides.count_documents({}) == 0:
        for s in DEFAULT_HERO_SLIDES:
            s2 = {**s, "id": new_id(), "cta_label": "Book Appointment", "active": True}
            await db.hero_slides.insert_one(s2)

    # Gallery
    if await db.gallery.count_documents({}) == 0:
        for i, url in enumerate(DEFAULT_GALLERY):
            await db.gallery.insert_one({"id": new_id(), "image": url, "caption": "", "category": "salon", "order": i})

    # Testimonials
    if await db.testimonials.count_documents({}) == 0:
        for i, t in enumerate(DEFAULT_TESTIMONIALS):
            await db.testimonials.insert_one({"id": new_id(), **t, "photo": "", "active": True, "order": i})

    # FAQs
    if await db.faqs.count_documents({}) == 0:
        for i, f in enumerate(DEFAULT_FAQS):
            await db.faqs.insert_one({"id": new_id(), "question": f["q"], "answer": f["a"], "order": i, "active": True})


@app.on_event("startup")
async def on_startup():
    await seed_if_empty()
    logger.info("Galaxy API ready.")


# ============================================================
# Public endpoints
# ============================================================
@api.get("/")
async def root():
    return {"app": "Galaxy Salon API", "status": "ok"}


@api.get("/business")
async def get_business():
    doc = await db.business_info.find_one({"_singleton": True}, {"_id": 0, "_singleton": 0})
    return doc or BusinessInfo().model_dump()


@api.get("/hero-slides")
async def list_hero():
    docs = await db.hero_slides.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(20)
    return docs


@api.get("/categories")
async def list_categories():
    docs = await db.categories.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return docs


@api.get("/services")
async def list_services(category_id: Optional[str] = None, featured: Optional[bool] = None):
    q: Dict[str, Any] = {"active": True}
    if category_id:
        q["category_id"] = category_id
    if featured is not None:
        q["featured"] = featured
    docs = await db.services.find(q, {"_id": 0}).sort("order", 1).to_list(500)
    return docs


@api.get("/employees")
async def list_employees(service_id: Optional[str] = None):
    q: Dict[str, Any] = {"active": True}
    docs = await db.employees.find(q, {"_id": 0}).sort("order", 1).to_list(200)
    if service_id:
        docs = [e for e in docs if not e.get("service_ids") or service_id in e["service_ids"]]
    return docs


@api.get("/gallery")
async def list_gallery():
    docs = await db.gallery.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return docs


@api.get("/testimonials")
async def list_testimonials():
    docs = await db.testimonials.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return docs


@api.get("/faqs")
async def list_faqs():
    docs = await db.faqs.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return docs


# ============================================================
# Availability & Booking
# ============================================================
def _minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _hhmm(mins: int) -> str:
    return f"{mins//60:02d}:{mins%60:02d}"


@api.get("/availability")
async def availability(employee_id: str, service_id: str, date: str):
    """Return list of available HH:MM start slots for the given employee and service on given date."""
    emp = await db.employees.find_one({"id": employee_id, "active": True}, {"_id": 0})
    svc = await db.services.find_one({"id": service_id, "active": True}, {"_id": 0})
    if not emp or not svc:
        raise HTTPException(404, "Employee or service not found")

    try:
        day_dt = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Invalid date")

    if date in (emp.get("leaves") or []):
        return {"date": date, "slots": []}

    weekday = day_dt.weekday()  # 0=Mon
    wh = next((w for w in emp.get("working_hours", []) if w["day"] == weekday and w.get("open", True)), None)
    if not wh:
        return {"date": date, "slots": []}

    start_m = _minutes(wh["start"])
    end_m = _minutes(wh["end"])
    duration = int(svc["duration"])
    step = 30  # 30-min grid

    # Load existing bookings for that day/employee
    existing = await db.bookings.find({
        "employee_id": employee_id,
        "date": date,
        "status": {"$in": ["pending", "confirmed"]},
    }, {"_id": 0, "start_time": 1, "end_time": 1}).to_list(500)
    busy = [(_minutes(b["start_time"]), _minutes(b["end_time"])) for b in existing]

    # If date is today, only show future slots (with 10-min buffer)
    now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)  # IST
    today_str = now.strftime("%Y-%m-%d")

    slots = []
    m = start_m
    while m + duration <= end_m:
        end = m + duration
        conflict = any(not (end <= bs or m >= be) for bs, be in busy)
        if not conflict:
            if date > today_str:
                slots.append(_hhmm(m))
            elif date == today_str and m >= (now.hour * 60 + now.minute + 10):
                slots.append(_hhmm(m))
        m += step

    return {"date": date, "slots": slots}


def _gen_booking_code() -> str:
    return "GX" + "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(6))


@api.post("/bookings")
async def create_booking(body: BookingCreate):
    svc = await db.services.find_one({"id": body.service_id, "active": True}, {"_id": 0})
    emp = await db.employees.find_one({"id": body.employee_id, "active": True}, {"_id": 0})
    if not svc or not emp:
        raise HTTPException(404, "Service or employee not found")

    # validate slot still open
    avail = await availability(employee_id=body.employee_id, service_id=body.service_id, date=body.date)
    if body.start_time not in avail["slots"]:
        raise HTTPException(409, "Selected time is no longer available. Please pick another slot.")

    end_m = _minutes(body.start_time) + int(svc["duration"])
    end_time = _hhmm(end_m)

    # customer upsert
    cust = await db.customers.find_one({"phone": body.customer_phone}, {"_id": 0})
    if not cust:
        cust = Customer(name=body.customer_name, phone=body.customer_phone, email=body.customer_email, notes=body.notes).model_dump()
        await db.customers.insert_one(cust)
    else:
        await db.customers.update_one({"phone": body.customer_phone}, {"$set": {"name": body.customer_name, "email": body.customer_email or cust.get("email", "")}})

    booking = Booking(
        booking_code=_gen_booking_code(),
        customer_id=cust["id"],
        customer_name=body.customer_name,
        customer_phone=body.customer_phone,
        customer_email=body.customer_email,
        service_id=svc["id"],
        service_name=svc["name"],
        category_id=svc["category_id"],
        employee_id=emp["id"],
        employee_name=emp["name"],
        date=body.date,
        start_time=body.start_time,
        end_time=end_time,
        duration=int(svc["duration"]),
        price=float(svc["price"]),
        deposit=float(svc["deposit"]),
        balance=float(svc["price"]) - float(svc["deposit"]),
        notes=body.notes,
        status="pending",
        payment_status="unpaid",
    ).model_dump()

    await db.bookings.insert_one(booking)

    # create mock razorpay-like order
    order = {
        "id": "order_" + secrets.token_hex(8),
        "amount": int(booking["deposit"] * 100),
        "currency": "INR",
        "booking_id": booking["id"],
        "mode": os.environ.get("RAZORPAY_MODE", "mock"),
        "created_at": now_iso(),
    }
    await db.payment_orders.insert_one({**order})

    return {"booking": clean(booking), "order": clean(order)}


@api.post("/payments/verify")
async def verify_payment(body: PaymentVerify):
    booking = await db.bookings.find_one({"id": body.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(404, "Booking not found")

    mode = os.environ.get("RAZORPAY_MODE", "mock")
    verified = False
    payment_id = body.razorpay_payment_id or ("pay_" + secrets.token_hex(8))

    if mode == "mock":
        verified = True
    else:
        secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
        expected = hmac.new(secret.encode(), f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(), hashlib.sha256).hexdigest()
        verified = hmac.compare_digest(expected, body.razorpay_signature or "")

    if not verified:
        raise HTTPException(400, "Payment verification failed")

    await db.bookings.update_one({"id": body.booking_id}, {"$set": {
        "status": "confirmed",
        "payment_status": "paid",
        "payment_id": payment_id,
    }})

    await db.payments.insert_one({
        "id": new_id(),
        "booking_id": body.booking_id,
        "payment_id": payment_id,
        "amount": booking["deposit"],
        "currency": "INR",
        "status": "captured",
        "mode": mode,
        "created_at": now_iso(),
    })

    # update customer aggregates
    await db.customers.update_one({"id": booking["customer_id"]}, {"$inc": {"total_visits": 1, "lifetime_spend": booking["deposit"]}, "$set": {"last_visit": booking["date"]}})

    # Push to Google Calendar (best-effort, non-blocking failure)
    emp = await db.employees.find_one({"id": booking["employee_id"]}, {"_id": 0})
    cal_id = (emp or {}).get("google_calendar_id") or None
    fresh = await db.bookings.find_one({"id": body.booking_id}, {"_id": 0})
    ev = await gcal.create_event_for_booking(db, fresh, cal_id)
    if ev:
        await db.bookings.update_one({"id": body.booking_id}, {"$set": {
            "google_event_id": ev["event_id"],
            "google_calendar_id": ev["calendar_id"],
        }})

    updated = await db.bookings.find_one({"id": body.booking_id}, {"_id": 0})
    return {"success": True, "booking": updated}


@api.get("/bookings/{booking_id}")
async def get_booking(booking_id: str):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Not found")
    return b


# ============================================================
# Admin auth
# ============================================================
@api.post("/admin/login")
async def admin_login(body: LoginBody):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user:
        # case sensitivity fallback
        user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Invalid credentials")
    if not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user["role"]}}


@api.get("/admin/me")
async def admin_me(admin=Depends(get_current_admin)):
    user = await db.users.find_one({"id": admin["sub"]}, {"_id": 0, "password_hash": 0})
    return user


# ============================================================
# Admin CRUD (categories/services/employees/content/business/bookings)
# ============================================================
@api.get("/admin/stats")
async def admin_stats(admin=Depends(get_current_admin)):
    today = (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d")
    total_bookings = await db.bookings.count_documents({})
    today_bookings = await db.bookings.count_documents({"date": today})
    pending = await db.bookings.count_documents({"status": "pending"})
    confirmed = await db.bookings.count_documents({"status": "confirmed"})
    completed = await db.bookings.count_documents({"status": "completed"})
    customers = await db.customers.count_documents({})
    # revenue (deposits captured)
    agg = await db.payments.aggregate([{"$group": {"_id": None, "s": {"$sum": "$amount"}}}]).to_list(1)
    revenue = agg[0]["s"] if agg else 0
    today_revenue_agg = await db.payments.aggregate([
        {"$match": {"created_at": {"$regex": f"^{today}"}}},
        {"$group": {"_id": None, "s": {"$sum": "$amount"}}}
    ]).to_list(1)
    today_revenue = today_revenue_agg[0]["s"] if today_revenue_agg else 0

    # popular services
    pop = await db.bookings.aggregate([
        {"$group": {"_id": "$service_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]).to_list(5)
    popular_services = [{"name": p["_id"], "count": p["count"]} for p in pop]

    return {
        "total_bookings": total_bookings,
        "today_bookings": today_bookings,
        "pending": pending,
        "confirmed": confirmed,
        "completed": completed,
        "customers": customers,
        "revenue": revenue,
        "today_revenue": today_revenue,
        "popular_services": popular_services,
    }


@api.get("/admin/bookings")
async def admin_bookings(admin=Depends(get_current_admin), status: Optional[str] = None, q: Optional[str] = None):
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if q:
        query["$or"] = [
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"customer_phone": {"$regex": q, "$options": "i"}},
            {"booking_code": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.patch("/admin/bookings/{booking_id}")
async def admin_update_booking(booking_id: str, body: Dict[str, Any], admin=Depends(get_current_admin)):
    allowed = {"status", "notes"}
    upd = {k: v for k, v in body.items() if k in allowed}
    if not upd:
        raise HTTPException(400, "No valid fields")
    prev = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    await db.bookings.update_one({"id": booking_id}, {"$set": upd})
    fresh = await db.bookings.find_one({"id": booking_id}, {"_id": 0})

    # Calendar sync on cancellation
    if prev and fresh and prev.get("status") != "cancelled" and fresh.get("status") == "cancelled":
        if fresh.get("google_event_id") and fresh.get("google_calendar_id"):
            await gcal.delete_event(db, fresh["google_calendar_id"], fresh["google_event_id"])
            await db.bookings.update_one({"id": booking_id}, {"$unset": {"google_event_id": "", "google_calendar_id": ""}})

    return await db.bookings.find_one({"id": booking_id}, {"_id": 0})


def _make_admin_crud(collection: str, path: str):
    @api.get(f"/admin/{path}")
    async def _list(admin=Depends(get_current_admin)):
        docs = await db[collection].find({}, {"_id": 0}).to_list(1000)
        return docs

    @api.post(f"/admin/{path}")
    async def _create(body: Dict[str, Any], admin=Depends(get_current_admin)):
        body["id"] = body.get("id") or new_id()
        await db[collection].insert_one(dict(body))
        return await db[collection].find_one({"id": body["id"]}, {"_id": 0})

    @api.patch(f"/admin/{path}/{{item_id}}")
    async def _update(item_id: str, body: Dict[str, Any], admin=Depends(get_current_admin)):
        body.pop("id", None)
        await db[collection].update_one({"id": item_id}, {"$set": body})
        return await db[collection].find_one({"id": item_id}, {"_id": 0})

    @api.delete(f"/admin/{path}/{{item_id}}")
    async def _delete(item_id: str, admin=Depends(get_current_admin)):
        await db[collection].delete_one({"id": item_id})
        return {"ok": True}


_make_admin_crud("categories", "categories")
_make_admin_crud("services", "services")
_make_admin_crud("employees", "employees")
_make_admin_crud("hero_slides", "hero-slides")
_make_admin_crud("gallery", "gallery")
_make_admin_crud("testimonials", "testimonials")
_make_admin_crud("faqs", "faqs")


@api.get("/admin/customers")
async def admin_customers(admin=Depends(get_current_admin)):
    docs = await db.customers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api.get("/admin/business")
async def admin_get_business(admin=Depends(get_current_admin)):
    doc = await db.business_info.find_one({"_singleton": True}, {"_id": 0, "_singleton": 0})
    return doc or BusinessInfo().model_dump()


@api.patch("/admin/business")
async def admin_update_business(body: Dict[str, Any], admin=Depends(get_current_admin)):
    body.pop("_singleton", None)
    await db.business_info.update_one({"_singleton": True}, {"$set": body}, upsert=True)
    return await db.business_info.find_one({"_singleton": True}, {"_id": 0, "_singleton": 0})


# ============================================================
# Google Calendar (owner-connected OAuth)
# ============================================================
def _computed_redirect(request: Request) -> str:
    base = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
    if not base:
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        base = f"{proto}://{host}"
    return f"{base}/api/admin/calendar/callback"


@api.get("/admin/calendar/status")
async def cal_status(admin=Depends(get_current_admin)):
    return await gcal.status(db)


@api.get("/admin/calendar/connect")
async def cal_connect(request: Request, token: str, redirect_to: Optional[str] = None):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("role") != "admin":
            raise HTTPException(403, "Forbidden")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")

    if not (os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET")):
        raise HTTPException(400, "Google OAuth credentials not configured on the server.")

    redirect = _computed_redirect(request)
    state = secrets.token_urlsafe(24)
    await db.settings.update_one(
        {"key": "google_oauth_state"},
        {"$set": {"key": "google_oauth_state", "state": state, "redirect_to": redirect_to or "/admin/settings", "created_at": now_iso()}},
        upsert=True,
    )
    url = gcal.build_auth_url(state, redirect)
    return RedirectResponse(url)


@api.get("/admin/calendar/callback")
async def cal_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    if error or not code:
        return HTMLResponse(f"<h3>Google connection failed:</h3><p>{error or 'Missing code'}</p>", status_code=400)
    doc = await db.settings.find_one({"key": "google_oauth_state"})
    if not doc or doc.get("state") != state:
        raise HTTPException(400, "Invalid state")

    redirect = _computed_redirect(request)
    try:
        tokens = gcal.exchange_code(code, redirect)
        info = gcal.fetch_userinfo(tokens["access_token"])
    except Exception as e:
        return HTMLResponse(f"<h3>Google token exchange failed:</h3><p>{e}</p>", status_code=400)

    await db.settings.update_one(
        {"key": "google_calendar"},
        {"$set": {"key": "google_calendar", "tokens": tokens, "email": info.get("email")}},
        upsert=True,
    )
    await db.settings.delete_one({"key": "google_oauth_state"})

    dest = doc.get("redirect_to") or "/admin/settings"
    return HTMLResponse(f"""
      <html><body style="background:#0A0A0A;color:#F5F5F5;font-family:sans-serif;padding:40px;text-align:center">
      <h2>Google Calendar Connected</h2>
      <p>Signed in as <strong>{info.get('email')}</strong>. You can close this tab.</p>
      <script>setTimeout(function(){{ window.location.href='{dest}?connected=1'; }}, 1200);</script>
      </body></html>
    """)


@api.post("/admin/calendar/disconnect")
async def cal_disconnect(admin=Depends(get_current_admin)):
    await gcal.disconnect(db)
    return {"ok": True}


@api.get("/admin/calendar/test")
async def cal_test(admin=Depends(get_current_admin), calendar_id: str = "primary"):
    items = await gcal.list_upcoming(db, calendar_id)
    if items is None:
        raise HTTPException(400, "Not connected or calendar unavailable")
    return {"calendar_id": calendar_id, "upcoming": [{"summary": i.get("summary"), "start": i.get("start"), "id": i.get("id")} for i in items]}



app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
