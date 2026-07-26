"""Google Calendar integration for Galaxy.

Two supported connection modes:
  1. Service Account (Recommended for salon owner) — owner pastes the JSON key
     from Google Cloud into the admin UI. Stored under db.settings key='google_service_account'.
     Owner shares each stylist's calendar with the service account's client_email
     with 'Make changes to events' permission. Works without env vars, without OAuth redirects.
  2. OAuth (fallback) — requires GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET env vars.

get_service(db) picks Service Account first, then OAuth. All helpers return None/False
if nothing is connected — booking flow degrades gracefully.
"""
from __future__ import annotations

import os
import logging
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone, timedelta

import requests
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account as _sa
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger("galaxy.gcal")

SCOPES = ["https://www.googleapis.com/auth/calendar"]
TOKEN_URI = "https://oauth2.googleapis.com/token"
AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo"
DEFAULT_TZ = "Asia/Kolkata"
IST = timezone(timedelta(hours=5, minutes=30))


# ---------------------------------------------------------------- helpers
def _env_ready() -> bool:
    return bool(os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET"))


def _iso_ist(date_str: str, hhmm: str) -> str:
    return f"{date_str}T{hhmm}:00+05:30"


def _to_ist_minutes(iso_str: str) -> Optional[int]:
    try:
        s = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        ist = dt.astimezone(IST)
        return ist.hour * 60 + ist.minute
    except Exception:
        return None


# ---------------------------------------------------------------- storage
async def _load_service_account(db):
    doc = await db.settings.find_one({"key": "google_service_account"}, {"_id": 0})
    if not doc or not doc.get("credentials"):
        return None
    return doc


async def _load_tokens(db) -> Optional[Dict[str, Any]]:
    doc = await db.settings.find_one({"key": "google_calendar"}, {"_id": 0})
    if not doc or not doc.get("tokens"):
        return None
    return doc


async def _save_tokens(db, tokens: Dict[str, Any], email: Optional[str] = None):
    payload = {"key": "google_calendar", "tokens": tokens}
    if email:
        payload["email"] = email
    await db.settings.update_one({"key": "google_calendar"}, {"$set": payload}, upsert=True)


async def save_service_account(db, sa_json: Dict[str, Any]) -> Optional[str]:
    if not isinstance(sa_json, dict):
        return None
    email = sa_json.get("client_email")
    if not email or sa_json.get("type") != "service_account":
        return None
    # Validate we can build credentials before saving
    try:
        _sa.Credentials.from_service_account_info(sa_json, scopes=SCOPES)
    except Exception as e:
        logger.warning(f"Invalid service account JSON: {e}")
        return None
    await db.settings.update_one(
        {"key": "google_service_account"},
        {"$set": {"key": "google_service_account", "credentials": sa_json, "client_email": email}},
        upsert=True,
    )
    return email


# ---------------------------------------------------------------- service factory
async def get_service(db):
    """Prefer Service Account, then OAuth. Returns None if nothing configured."""
    sa = await _load_service_account(db)
    if sa:
        try:
            creds = _sa.Credentials.from_service_account_info(sa["credentials"], scopes=SCOPES)
            return build("calendar", "v3", credentials=creds, cache_discovery=False)
        except Exception as e:
            logger.warning(f"Service account init error: {e}")
    # OAuth fallback
    if not _env_ready():
        return None
    doc = await _load_tokens(db)
    if not doc:
        return None
    tokens = doc["tokens"]
    try:
        creds = Credentials(
            token=tokens.get("access_token"),
            refresh_token=tokens.get("refresh_token"),
            token_uri=TOKEN_URI,
            client_id=os.environ["GOOGLE_CLIENT_ID"],
            client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
            scopes=SCOPES,
        )
        if not creds.valid:
            if creds.expired and creds.refresh_token:
                creds.refresh(GoogleRequest())
                tokens["access_token"] = creds.token
                await _save_tokens(db, tokens, doc.get("email"))
            else:
                return None
        return build("calendar", "v3", credentials=creds, cache_discovery=False)
    except Exception as e:
        logger.warning(f"OAuth calendar auth error: {e}")
        return None


async def status(db) -> Dict[str, Any]:
    sa = await _load_service_account(db)
    oauth = await _load_tokens(db)
    mode = "service_account" if sa else ("oauth" if oauth else None)
    email = (sa or {}).get("client_email") or (oauth or {}).get("email")
    return {
        "env_configured": _env_ready(),
        "connected": bool(sa or oauth),
        "mode": mode,
        "email": email,
    }


async def disconnect(db):
    await db.settings.delete_many({"key": {"$in": ["google_service_account", "google_calendar"]}})


# ---------------------------------------------------------------- OAuth helpers (kept for existing endpoints)
def build_auth_url(state: str, redirect: str) -> str:
    params = {
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "response_type": "code",
        "scope": " ".join(SCOPES) + " openid email",
        "redirect_uri": redirect,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
        "include_granted_scopes": "true",
    }
    return AUTH_URI + "?" + "&".join(f"{k}={requests.utils.quote(str(v), safe='')}" for k, v in params.items())


def exchange_code(code: str, redirect: str) -> Dict[str, Any]:
    r = requests.post(TOKEN_URI, data={
        "code": code,
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
        "redirect_uri": redirect,
        "grant_type": "authorization_code",
    }, timeout=15)
    r.raise_for_status()
    return r.json()


def fetch_userinfo(access_token: str) -> Dict[str, Any]:
    r = requests.get(USERINFO, headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------- booking helpers
def _booking_service_label(booking: Dict[str, Any]) -> str:
    """Return a display label for both new multi-service and legacy bookings."""
    service_names = booking.get("service_names")

    if isinstance(service_names, list) and service_names:
        return " + ".join(str(name) for name in service_names if name)

    if booking.get("service_name"):
        return str(booking["service_name"])

    return "Salon Service"

async def create_event_for_booking(db, booking: Dict[str, Any], calendar_id: Optional[str]) -> Optional[Dict[str, Any]]:
    svc = await get_service(db)
    if not svc:
        return None
    cal = calendar_id or "primary"
    body = {
        "summary": f"{_booking_service_label(booking)} — {booking['customer_name']}",
        "description": (
            f"Galaxy Booking · {booking['booking_code']}\n"
            f"Stylist: {booking['employee_name']}\n"
            f"Customer: {booking['customer_name']} ({booking['customer_phone']})\n"
            f"Duration: {booking['duration']} min\n"
            f"Deposit paid: ₹{int(booking['deposit'])} · Balance at salon: ₹{int(booking['balance'])}\n"
            f"Notes: {booking.get('notes','') or '—'}"
        ),
        "start": {"dateTime": _iso_ist(booking["date"], booking["start_time"]), "timeZone": DEFAULT_TZ},
        "end": {"dateTime": _iso_ist(booking["date"], booking["end_time"]), "timeZone": DEFAULT_TZ},
        "reminders": {"useDefault": True},
    }
    try:
        ev = svc.events().insert(calendarId=cal, body=body).execute()
        return {"event_id": ev.get("id"), "calendar_id": cal, "htmlLink": ev.get("htmlLink")}
    except HttpError as e:
        print("=" * 80)
        print("GOOGLE CALENDAR INSERT FAILED")
        print("Calendar:", cal)
        print("Booking:", booking["booking_code"])
        print("Error:", e)

        try:
            print(e.content.decode())
        except Exception:
            pass

        print("=" * 80)
        return None

    except Exception as e:
        import traceback

        print("=" * 80)
        print("UNEXPECTED GOOGLE CALENDAR ERROR")
        traceback.print_exc()
        print("=" * 80)

        return None


async def delete_event(db, calendar_id: str, event_id: str) -> bool:
    svc = await get_service(db)
    if not svc:
        return False
    try:
        svc.events().delete(calendarId=calendar_id, eventId=event_id).execute()
        return True
    except HttpError as e:
        logger.warning(f"Calendar delete failed: {e}")
        return False


async def patch_event(db, calendar_id: str, event_id: str, booking: Dict[str, Any]) -> bool:
    svc = await get_service(db)
    if not svc:
        return False
    body = {
        "summary": f"{_booking_service_label(booking)} — {booking['customer_name']}",
        "start": {"dateTime": _iso_ist(booking["date"], booking["start_time"]), "timeZone": DEFAULT_TZ},
        "end": {"dateTime": _iso_ist(booking["date"], booking["end_time"]), "timeZone": DEFAULT_TZ},
    }
    try:
        svc.events().patch(calendarId=calendar_id, eventId=event_id, body=body).execute()
        return True
    except HttpError as e:
        logger.warning(f"Calendar patch failed: {e}")
        return False


async def list_upcoming(db, calendar_id: str, max_results: int = 5):
    svc = await get_service(db)
    if not svc:
        return None
    now = datetime.now(timezone.utc).isoformat()
    try:
        r = svc.events().list(calendarId=calendar_id, timeMin=now, maxResults=max_results, singleEvents=True, orderBy="startTime").execute()
        return r.get("items", [])
    except HttpError as e:
        logger.warning(f"Calendar list failed: {e}")
        return None


async def busy_intervals(db, calendar_id: str, date_str: str) -> List[Tuple[int, int]]:
    """Return list of (start_min_ist, end_min_ist) busy blocks on the calendar for the given date (YYYY-MM-DD)."""
    if not calendar_id:
        return []
    svc = await get_service(db)
    if not svc:
        return []
    day_start = f"{date_str}T00:00:00+05:30"
    day_end = f"{date_str}T23:59:59+05:30"
    try:
        r = svc.freebusy().query(body={
            "timeMin": day_start,
            "timeMax": day_end,
            "items": [{"id": calendar_id}],
        }).execute()
        busy = r.get("calendars", {}).get(calendar_id, {}).get("busy", [])
        out: List[Tuple[int, int]] = []
        for b in busy:
            s = _to_ist_minutes(b["start"])
            e = _to_ist_minutes(b["end"])
            if s is not None and e is not None and e > s:
                out.append((s, e))
        return out
    except Exception as e:
        logger.warning(f"freebusy error on {calendar_id}: {e}")
        return []
