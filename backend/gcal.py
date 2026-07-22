"""Google Calendar integration for Galaxy.

Design:
- Owner connects Google once via OAuth (single account). Tokens are stored under db.settings key='google_calendar'.
- Each Employee has an optional `google_calendar_id`. If empty, we use 'primary' on the owner's account.
- On booking confirmation we create an event and store the event id back on the booking (google_event_id + google_calendar_id).
- On cancellation/reschedule we patch/delete via the stored ids.
- Everything gracefully returns None / False and logs if not configured. Booking flow never fails because Calendar is not set up.
"""
from __future__ import annotations

import os
import logging
from typing import Optional, Dict, Any

import requests
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger("galaxy.gcal")

SCOPES = ["https://www.googleapis.com/auth/calendar"]
TOKEN_URI = "https://oauth2.googleapis.com/token"
AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo"
DEFAULT_TZ = "Asia/Kolkata"


def _env_ready() -> bool:
    return bool(os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET"))


def redirect_uri() -> str:
    # Frontend proxy to backend under /api/*
    base = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
    return f"{base}/api/admin/calendar/callback" if base else "/api/admin/calendar/callback"


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


def _creds_from_tokens(tokens: Dict[str, Any]) -> Credentials:
    return Credentials(
        token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        token_uri=TOKEN_URI,
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        scopes=SCOPES,
    )


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


async def get_service(db):
    """Returns an authorized Calendar service or None if not configured."""
    if not _env_ready():
        return None
    doc = await _load_tokens(db)
    if not doc:
        return None
    tokens = doc["tokens"]
    creds = _creds_from_tokens(tokens)
    try:
        if not creds.valid:
            if creds.expired and creds.refresh_token:
                creds.refresh(GoogleRequest())
                tokens["access_token"] = creds.token
                await _save_tokens(db, tokens, doc.get("email"))
            else:
                return None
        return build("calendar", "v3", credentials=creds, cache_discovery=False)
    except Exception as e:
        logger.warning(f"Calendar auth error: {e}")
        return None


async def status(db) -> Dict[str, Any]:
    doc = await _load_tokens(db)
    return {
        "env_configured": _env_ready(),
        "connected": bool(doc),
        "email": doc.get("email") if doc else None,
    }


async def disconnect(db):
    await db.settings.delete_one({"key": "google_calendar"})


# ---- booking helpers ----

def _iso_ist(date_str: str, hhmm: str) -> str:
    # RFC3339 with +05:30 offset (IST). Calendar API also accepts timeZone separately.
    return f"{date_str}T{hhmm}:00+05:30"


async def create_event_for_booking(db, booking: Dict[str, Any], calendar_id: Optional[str]) -> Optional[Dict[str, Any]]:
    svc = await get_service(db)
    if not svc:
        return None
    cal = calendar_id or "primary"
    body = {
        "summary": f"{booking['service_name']} — {booking['customer_name']}",
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
        logger.warning(f"Calendar insert failed: {e}")
        return None
    except Exception as e:
        logger.warning(f"Calendar insert error: {e}")
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
        "summary": f"{booking['service_name']} — {booking['customer_name']}",
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
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    try:
        r = svc.events().list(calendarId=calendar_id, timeMin=now, maxResults=max_results, singleEvents=True, orderBy="startTime").execute()
        return r.get("items", [])
    except HttpError as e:
        logger.warning(f"Calendar list failed: {e}")
        return None
