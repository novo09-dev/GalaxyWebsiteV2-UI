from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, hmac, hashlib, secrets, jwt, bcrypt
import razorpay
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta, time as dtime
from bson import ObjectId

try:
    from backend import gcal
except ModuleNotFoundError:
    import gcal

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
JWT_EXPIRE_HOURS = 24 * 7

BOOKING_HOLD_MINUTES = 10

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")

razorpay_client = razorpay.Client(
    auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
)

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
    service_ids: List[str]
    service_names: List[str]
    category_ids: List[str]
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
    service_ids: List[str]
    employee_id: str
    date: str
    start_time: str
    customer_name: str
    customer_phone: str
    customer_email: str = ""
    notes: str = ""


class PaymentVerify(BaseModel):
    booking_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

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


@api.get("/services/popular")
async def list_popular_services(limit: int = 8):
    # Keep the public endpoint bounded even if a caller requests a huge limit.
    limit = max(1, min(limit, 8))

    # Count only real, paid bookings. Pending, unpaid, expired, and
    # cancelled bookings must not influence homepage popularity.
    popular = await db.bookings.aggregate([
        {
            "$match": {
                "payment_status": "paid",
                "status": {"$in": ["confirmed", "completed"]},
                "service_ids": {
                    "$exists": True,
                    "$type": "array",
                    "$ne": [],
                },
            }
        },
        {"$unwind": "$service_ids"},
        {
            "$group": {
                "_id": "$service_ids",
                "booking_count": {"$sum": 1},
            }
        },
        {"$sort": {"booking_count": -1, "_id": 1}},
        {"$limit": limit},
    ]).to_list(limit)

    return [
        {
            "service_id": item["_id"],
            "booking_count": item["booking_count"],
        }
        for item in popular
    ]


@api.get("/employees")
async def list_employees(
    service_ids: Optional[List[str]] = Query(None),
):
    docs = await db.employees.find(
        {"active": True},
        {"_id": 0},
    ).sort("order", 1).to_list(200)

    if service_ids:
        # Remove duplicates while preserving selection order.
        service_ids = list(dict.fromkeys(service_ids))

        # Keep employees who either:
        # 1. have an empty service_ids list = can perform all services, or
        # 2. explicitly support EVERY selected service.
        docs = [
            employee
            for employee in docs
            if not employee.get("service_ids")
            or all(
                service_id in employee["service_ids"]
                for service_id in service_ids
            )
        ]

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
async def availability(
    employee_id: str,
    service_ids: List[str] = Query(...),
    date: str = Query(...),
):
    """Return available start slots for all selected services combined."""

    if not service_ids:
        raise HTTPException(400, "Select at least one service")

    # Remove duplicate service IDs while preserving selection order.
    service_ids = list(dict.fromkeys(service_ids))

    emp = await db.employees.find_one(
        {"id": employee_id, "active": True},
        {"_id": 0},
    )

    if not emp:
        raise HTTPException(404, "Employee not found")

    services = await db.services.find(
        {
            "id": {"$in": service_ids},
            "active": True,
        },
        {"_id": 0},
    ).to_list(100)

    if len(services) != len(service_ids):
        raise HTTPException(404, "One or more services were not found")

    # Make sure this employee can perform every selected service.
    employee_service_ids = emp.get("service_ids") or []

    if employee_service_ids:
        unsupported = [
            service_id
            for service_id in service_ids
            if service_id not in employee_service_ids
        ]

        if unsupported:
            raise HTTPException(
                400,
                "Employee does not support one or more selected services",
            )

    try:
        day_dt = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Invalid date")

    if date in (emp.get("leaves") or []):
        return {"date": date, "slots": []}

    weekday = day_dt.weekday()

    wh = next(
        (
            w
            for w in emp.get("working_hours", [])
            if w["day"] == weekday and w.get("open", True)
        ),
        None,
    )

    if not wh:
        return {"date": date, "slots": []}

    start_m = _minutes(wh["start"])
    end_m = _minutes(wh["end"])
    working_day_duration = end_m - start_m

    # Combined duration of every selected service.
    duration = sum(int(service["duration"]) for service in services)

    if duration <= 0:
        raise HTTPException(400, "Invalid total service duration")

    # The selected services cannot fit within one working day.
    if duration > working_day_duration:
        return {
            "date": date,
            "slots": [],
            "duration": duration,
            "reason": "too_long_for_day",
        }

    step = 30

    existing = await db.bookings.find(
        {
            "employee_id": employee_id,
            "date": date,
            "status": {"$in": ["pending", "confirmed"]},
        },
        {
            "_id": 0,
            "start_time": 1,
            "end_time": 1,
            "status": 1,
            "payment_status": 1,
            "hold_expires_at": 1,
        },
    ).to_list(500)

    now_utc = datetime.now(timezone.utc)
    busy = []

    for b in existing:
        if (
            b.get("status") == "confirmed"
            or b.get("payment_status") == "paid"
        ):
            busy.append(
                (
                    _minutes(b["start_time"]),
                    _minutes(b["end_time"]),
                )
            )
            continue

        hold_expires_at = b.get("hold_expires_at")

        if not hold_expires_at:
            continue

        try:
            hold_expiry = datetime.fromisoformat(
                hold_expires_at.replace("Z", "+00:00")
            )

            if hold_expiry.tzinfo is None:
                hold_expiry = hold_expiry.replace(
                    tzinfo=timezone.utc
                )

            if hold_expiry > now_utc:
                busy.append(
                    (
                        _minutes(b["start_time"]),
                        _minutes(b["end_time"]),
                    )
                )

        except (ValueError, TypeError):
            logger.warning(
                "Invalid hold_expires_at on pending booking: %s",
                hold_expires_at,
            )

    # Include Google Calendar busy periods.
    emp_cal = emp.get("google_calendar_id") or ""

    if emp_cal:
        google_busy = await gcal.busy_intervals(
            db,
            emp_cal,
            date,
        )
        busy.extend(google_busy)

    # Current time in IST.
    now = datetime.now(timezone.utc) + timedelta(
        hours=5,
        minutes=30,
    )

    today_str = now.strftime("%Y-%m-%d")

    slots = []
    all_slots = []
    m = start_m

    while m + duration <= end_m:
        slot_end = m + duration

        conflict = any(
            not (slot_end <= busy_start or m >= busy_end)
            for busy_start, busy_end in busy
        )

        is_future_time = (
            date > today_str
            or (
                date == today_str
                and m >= (
                    now.hour * 60
                    + now.minute
                    + 10
                )
            )
        )

        available = not conflict and is_future_time

        all_slots.append(
            {
                "time": _hhmm(m),
                "available": available,
            }
        )

        if available:
            slots.append(_hhmm(m))

        m += step

    if not slots:
        return {
            "date": date,
            "slots": [],
            "all_slots": all_slots,
            "duration": duration,
            "reason": "no_continuous_slot",
        }

    return {
        "date": date,
        "slots": slots,
        "all_slots": all_slots,
        "duration": duration,
    }


def _gen_booking_code() -> str:
    return "GX" + "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(6))

@api.post("/bookings")
async def create_booking(body: BookingCreate):
    # A booking must contain at least one service.
    if not body.service_ids:
        raise HTTPException(400, "Select at least one service")

    # Remove duplicate service IDs while preserving selection order.
    service_ids = list(dict.fromkeys(body.service_ids))

    # Load every selected active service.
    services = await db.services.find(
        {
            "id": {"$in": service_ids},
            "active": True,
        },
        {"_id": 0},
    ).to_list(100)

    if len(services) != len(service_ids):
        raise HTTPException(
            404,
            "One or more services were not found",
        )

    # MongoDB $in does not guarantee the original selection order.
    services_by_id = {
        service["id"]: service
        for service in services
    }

    services = [
        services_by_id[service_id]
        for service_id in service_ids
    ]

    # Load the selected employee.
    emp = await db.employees.find_one(
        {
            "id": body.employee_id,
            "active": True,
        },
        {"_id": 0},
    )

    if not emp:
        raise HTTPException(404, "Employee not found")

    # Make sure the employee can perform every selected service.
    employee_service_ids = emp.get("service_ids") or []

    if employee_service_ids:
        unsupported = [
            service_id
            for service_id in service_ids
            if service_id not in employee_service_ids
        ]

        if unsupported:
            raise HTTPException(
                400,
                "Employee does not support one or more selected services",
            )

    # Recheck the complete combined slot immediately before payment.
    avail = await availability(
        employee_id=body.employee_id,
        service_ids=service_ids,
        date=body.date,
    )

    if body.start_time not in avail["slots"]:
        raise HTTPException(
            409,
            "Selected time is no longer available. Please pick another slot.",
        )

    # Calculate combined duration and money values.
    total_duration = sum(
        int(service["duration"])
        for service in services
    )

    total_price = sum(
        float(service["price"])
        for service in services
    )

    total_deposit = sum(
        float(service["deposit"])
        for service in services
    )

    total_balance = total_price - total_deposit

    end_m = _minutes(body.start_time) + total_duration
    end_time = _hhmm(end_m)

    # Create/update customer.
    cust = await db.customers.find_one(
        {"phone": body.customer_phone},
        {"_id": 0},
    )

    if not cust:
        cust = Customer(
            name=body.customer_name,
            phone=body.customer_phone,
            email=body.customer_email,
            notes=body.notes,
        ).model_dump()

        await db.customers.insert_one(dict(cust))

    else:
        await db.customers.update_one(
            {"phone": body.customer_phone},
            {
                "$set": {
                    "name": body.customer_name,
                    "email": (
                        body.customer_email
                        or cust.get("email", "")
                    ),
                }
            },
        )

    # Create ONE booking containing all selected services.
    booking = Booking(
        booking_code=_gen_booking_code(),
        customer_id=cust["id"],
        customer_name=body.customer_name,
        customer_phone=body.customer_phone,
        customer_email=body.customer_email,

        service_ids=[
            service["id"]
            for service in services
        ],

        service_names=[
            service["name"]
            for service in services
        ],

        category_ids=list(
            dict.fromkeys(
                service["category_id"]
                for service in services
            )
        ),

        employee_id=emp["id"],
        employee_name=emp["name"],

        date=body.date,
        start_time=body.start_time,
        end_time=end_time,

        duration=total_duration,
        price=total_price,
        deposit=total_deposit,
        balance=total_balance,

        notes=body.notes,
        status="pending",
        payment_status="unpaid",
    ).model_dump()

    # Preserve the existing temporary payment hold system.
    booking["hold_expires_at"] = (
        datetime.now(timezone.utc)
        + timedelta(minutes=BOOKING_HOLD_MINUTES)
    ).isoformat()

    # Create ONE Razorpay order for the combined deposit.
    amount_paise = int(
        round(float(booking["deposit"]) * 100)
    )

    if amount_paise <= 0:
        raise HTTPException(
            400,
            "Invalid booking deposit amount",
        )

    try:
        razorpay_order = razorpay_client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": booking["booking_code"],
                "notes": {
                    "booking_id": booking["id"],
                    "services": ", ".join(
                        booking["service_names"]
                    ),
                },
            }
        )

    except Exception:
        logger.exception(
            "Razorpay order creation failed"
        )
        raise HTTPException(
            502,
            "Unable to initialise payment. Please try again.",
        )

    # Store the pending booking only after Razorpay accepted the order.
    booking["razorpay_order_id"] = razorpay_order["id"]

    await db.bookings.insert_one(
        dict(booking)
    )

    await db.payment_orders.insert_one(
        {
            "id": razorpay_order["id"],
            "booking_id": booking["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "status": razorpay_order.get(
                "status",
                "created",
            ),
            "created_at": now_iso(),
        }
    )

    return {
        "booking": clean(dict(booking)),
        "order": {
            "id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "key_id": RAZORPAY_KEY_ID,
        },
    }
@api.post("/payments/verify")
async def verify_payment(body: PaymentVerify):
    # Find the pending booking.
    booking = await db.bookings.find_one(
        {"id": body.booking_id},
        {"_id": 0},
    )

    if not booking:
        raise HTTPException(404, "Booking not found")

    # Do not process the same successful payment twice.
    if booking.get("payment_status") == "paid":
        return {
            "success": True,
            "booking": booking,
        }

    # The order ID returned by the frontend must belong to this booking.
    stored_order_id = booking.get("razorpay_order_id")

    if not stored_order_id:
        raise HTTPException(400, "Booking has no Razorpay order")

    if body.razorpay_order_id != stored_order_id:
        raise HTTPException(400, "Razorpay order ID does not match booking")

    # Verify the Razorpay payment signature using Razorpay's SDK.
    try:
        razorpay_client.utility.verify_payment_signature(
            {
                "razorpay_order_id": body.razorpay_order_id,
                "razorpay_payment_id": body.razorpay_payment_id,
                "razorpay_signature": body.razorpay_signature,
            }
        )
    except Exception:
        logger.exception(
            "Razorpay payment verification failed for booking %s",
            body.booking_id,
        )
        raise HTTPException(400, "Payment verification failed")

    # Signature is valid. Confirm the booking.
    await db.bookings.update_one(
        {"id": body.booking_id},
        {
            "$set": {
                "status": "confirmed",
                "payment_status": "paid",
                "payment_id": body.razorpay_payment_id,
            }
        },
    )

    # Record the successful payment.
    await db.payments.update_one(
        {"payment_id": body.razorpay_payment_id},
        {
            "$setOnInsert": {
                "id": new_id(),
                "booking_id": body.booking_id,
                "payment_id": body.razorpay_payment_id,
                "razorpay_order_id": body.razorpay_order_id,
                "amount": booking["deposit"],
                "currency": "INR",
                "status": "captured",
                "mode": "razorpay",
                "created_at": now_iso(),
            }
        },
        upsert=True,
    )

    # Update customer aggregates only once.
    await db.customers.update_one(
        {"id": booking["customer_id"]},
        {
            "$inc": {
                "total_visits": 1,
                "lifetime_spend": booking["deposit"],
            },
            "$set": {
                "last_visit": booking["date"],
            },
        },
    )

    # Fetch the confirmed booking before creating the calendar event.
    fresh = await db.bookings.find_one(
        {"id": body.booking_id},
        {"_id": 0},
    )

    # Create the Google Calendar event after successful payment.
    # Calendar failure must not undo a successful Razorpay payment.
    try:
        emp = await db.employees.find_one(
            {"id": booking["employee_id"]},
            {"_id": 0},
        )

        cal_id = (emp or {}).get("google_calendar_id") or None

        ev = await gcal.create_event_for_booking(
            db,
            fresh,
            cal_id,
        )

        if ev:
            await db.bookings.update_one(
                {"id": body.booking_id},
                {
                    "$set": {
                        "google_event_id": ev["event_id"],
                        "google_calendar_id": ev["calendar_id"],
                    }
                },
            )

    except Exception:
        logger.exception(
            "Google Calendar event creation failed for booking %s",
            body.booking_id,
        )

    updated = await db.bookings.find_one(
        {"id": body.booking_id},
        {"_id": 0},
    )

    return {
        "success": True,
        "booking": updated,
    }


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

async def expire_old_booking_holds():
    """Mark expired unpaid booking holds as expired."""
    now_utc = datetime.now(timezone.utc).isoformat()

    result = await db.bookings.update_many(
        {
            "status": "pending",
            "payment_status": {"$ne": "paid"},
            "hold_expires_at": {"$exists": True, "$lte": now_utc},
        },
        {
            "$set": {
                "status": "expired",
            }
        },
    )

    if result.modified_count:
        logger.info(
            "Expired %s unpaid booking hold(s).",
            result.modified_count,
        )


@api.get("/admin/stats")
async def admin_stats(admin=Depends(get_current_admin)):
    await expire_old_booking_holds()
    
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
        {
            "$match": {
                "service_names": {
                    "$exists": True,
                    "$type": "array",
                    "$ne": [],
                }
            }
        },
        {"$unwind": "$service_names"},
        {
            "$group": {
                "_id": "$service_names",
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]).to_list(5)

    popular_services = [
        {
            "name": p["_id"],
            "count": p["count"],
        }
        for p in pop
    ]

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
    await expire_old_booking_holds()
    
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


class RescheduleBody(BaseModel):
    date: str
    start_time: str
    employee_id: Optional[str] = None  # optional stylist change


@api.post("/admin/bookings/{booking_id}/reschedule")
async def admin_reschedule_booking(booking_id: str, body: RescheduleBody, admin=Depends(get_current_admin)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.get("status") == "cancelled":
        raise HTTPException(400, "Cancelled bookings cannot be rescheduled")

    try:
        target_date = datetime.strptime(body.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Invalid date")

    today_ist = (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).date()
    if target_date < today_ist:
        raise HTTPException(400, "Cannot reschedule to a past date")

    new_emp_id = body.employee_id or booking["employee_id"]
    emp = await db.employees.find_one({"id": new_emp_id, "active": True}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Employee not found")

    duration = int(booking["duration"])
    start_m = _minutes(body.start_time)
    end_m = start_m + duration

    # Validate within employee working hours
    weekday = target_date.weekday()
    wh = next((w for w in emp.get("working_hours", []) if w["day"] == weekday and w.get("open", True)), None)
    if not wh:
        raise HTTPException(400, "Employee is not working on this day")
    if start_m < _minutes(wh["start"]) or end_m > _minutes(wh["end"]):
        raise HTTPException(400, "Time is outside employee working hours")
    if body.date in (emp.get("leaves") or []):
        raise HTTPException(400, "Employee is on leave that day")

    # Conflict check (exclude this booking itself)
    existing = await db.bookings.find({
        "employee_id": new_emp_id,
        "date": body.date,
        "status": {"$in": ["pending", "confirmed"]},
        "id": {"$ne": booking_id},
    }, {"_id": 0, "start_time": 1, "end_time": 1}).to_list(500)
    for b in existing:
        bs = _minutes(b["start_time"]); be = _minutes(b["end_time"])
        if not (end_m <= bs or start_m >= be):
            raise HTTPException(409, "That time overlaps an existing booking")

    new_end = _hhmm(end_m)
    new_values = {
        "date": body.date,
        "start_time": body.start_time,
        "end_time": new_end,
        "employee_id": new_emp_id,
        "employee_name": emp["name"],
    }
    await db.bookings.update_one({"id": booking_id}, {"$set": new_values})
    fresh = await db.bookings.find_one({"id": booking_id}, {"_id": 0})

    # Calendar sync
    calendar_synced = False
    if fresh.get("google_event_id") and fresh.get("google_calendar_id"):
        emp_changed = booking["employee_id"] != new_emp_id
        if emp_changed:
            # Stylist changed → delete on old calendar, create fresh event on new stylist's calendar
            await gcal.delete_event(db, fresh["google_calendar_id"], fresh["google_event_id"])
            new_cal = emp.get("google_calendar_id") or None
            ev = await gcal.create_event_for_booking(db, fresh, new_cal)
            if ev:
                await db.bookings.update_one({"id": booking_id}, {"$set": {
                    "google_event_id": ev["event_id"],
                    "google_calendar_id": ev["calendar_id"],
                }})
                calendar_synced = True
        else:
            calendar_synced = await gcal.patch_event(db, fresh["google_calendar_id"], fresh["google_event_id"], fresh)
    elif fresh.get("status") == "confirmed":
        # Booking was confirmed but no event yet (e.g., Google was connected after booking) — try to create now.
        new_cal = emp.get("google_calendar_id") or None
        ev = await gcal.create_event_for_booking(db, fresh, new_cal)
        if ev:
            await db.bookings.update_one({"id": booking_id}, {"$set": {
                "google_event_id": ev["event_id"],
                "google_calendar_id": ev["calendar_id"],
            }})
            calendar_synced = True

    result = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return {"booking": result, "calendar_synced": calendar_synced}



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
async def cal_connect(request: Request, token: Optional[str] = None, redirect_to: Optional[str] = None):
    if not token:
        raise HTTPException(401, "Missing token")
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



# ---- Service Account (paste JSON) ----
class SACredsBody(BaseModel):
    credentials: Dict[str, Any]


@api.post("/admin/calendar/service-account")
async def cal_save_sa(body: SACredsBody, admin=Depends(get_current_admin)):
    if not body.credentials or body.credentials.get("type") != "service_account":
        raise HTTPException(400, "Invalid JSON — expected a Google service account key (type='service_account').")
    if not body.credentials.get("client_email") or not body.credentials.get("private_key"):
        raise HTTPException(400, "Service account JSON is missing client_email or private_key.")
    email = await gcal.save_service_account(db, body.credentials)
    if not email:
        raise HTTPException(400, "Could not validate the service account JSON.")
    return {"ok": True, "client_email": email}


# ---- Admin credentials change ----
class ChangeCredsBody(BaseModel):
    current_password: str
    new_email: Optional[str] = None
    new_password: Optional[str] = None


@api.post("/admin/change-credentials")
async def admin_change_credentials(body: ChangeCredsBody, admin=Depends(get_current_admin)):
    user = await db.users.find_one({"id": admin["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    if not bcrypt.checkpw(body.current_password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Current password is incorrect")

    upd: Dict[str, Any] = {}
    new_email = (body.new_email or "").strip().lower()
    new_password = (body.new_password or "").strip()

    if new_email and new_email != user["email"]:
        # Basic sanity check
        if "@" not in new_email or "." not in new_email.split("@")[-1]:
            raise HTTPException(400, "Please provide a valid email address")
        # Check uniqueness
        existing = await db.users.find_one({"email": new_email, "id": {"$ne": user["id"]}})
        if existing:
            raise HTTPException(409, "Email already in use")
        upd["email"] = new_email

    if new_password:
        if len(new_password) < 8:
            raise HTTPException(400, "New password must be at least 8 characters")
        upd["password_hash"] = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()

    if not upd:
        raise HTTPException(400, "Nothing to change")

    await db.users.update_one({"id": user["id"]}, {"$set": upd})
    return {"ok": True, "email": upd.get("email", user["email"]), "password_changed": "password_hash" in upd}




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
