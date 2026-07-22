# GALAXY — Premium Salon Platform

## Problem Statement
Build a premium unisex Hair • Beauty • Style Studio platform for "Galaxy" in Agartala, Tripura, combining three connected products in ONE seamless experience:
1. Premium editorial marketing website
2. Multi-step online booking engine with deposit payment (Razorpay)
3. Business management admin dashboard (bookings, services, employees, content, settings)

Editorial dark aesthetic — 85% matte black, 12% white/soft gray, 3% deep crimson red (accent only on CTA / progress / active states).

## Architecture
- **Frontend**: React 19 + Tailwind + Framer-motion (subtle) + lucide-react icons + sonner toasts
- **Backend**: FastAPI + Motor (MongoDB async) + JWT auth + bcrypt
- **Database**: MongoDB (`galaxy` collections: business_info, categories, services, employees, customers, bookings, payments, payment_orders, hero_slides, gallery, testimonials, faqs, users)
- **Payments**: Razorpay (currently MOCK mode — swap by setting `RAZORPAY_MODE=live` + keys)
- **Auth**: JWT admin (seeded default: `admin@galaxy.salon` / `Galaxy@2025`)

## Implemented (Phase 1 — Feb 2026)
### Backend (43 services, 4 employees, 2 categories seeded)
- Full public API: business, hero-slides, categories, services (w/ filters), employees, gallery, testimonials, faqs, availability, bookings, payments/verify, booking retrieval
- Admin API: login/me, stats, bookings (list/filter/search/patch), customers, business update, generic CRUD for categories/services/employees/hero-slides/gallery/testimonials/faqs
- Booking engine: 30-min slot grid, respects working hours, existing bookings, leaves, past-slot filter (IST-aware)
- Conflict prevention: rechecks availability at booking creation → 409 on race conditions
- Mock Razorpay flow: creates order → verifies → confirms booking, updates customer aggregates

### Frontend
- **Landing** — sticky nav, cinematic 4-slide hero (Welcome/Precision/Transformation/Confidence), Why Choose stats, Featured Services grid, Team cards, Gallery lightbox, Testimonials, FAQ accordion, Contact w/ Google Map + WhatsApp, Footer
- **Booking wizard** — 8-step: Category → Service (grouped by group) → Professional (or First Available) → Date (custom calendar) → Time (dynamic slots) → Customer Details → Review + policy accept → Payment (mock) → Confirmation w/ booking code (e.g. `GXATYUZ5`)
- **Admin app** — Login, sidebar layout, Dashboard KPIs + recent + popular, Bookings table (search/filter/status), Services CRUD, Employees CRUD, Customers CRM view, Content (Hero/Gallery/Testimonials/FAQs) CRUD, Business Settings

## Implemented (Phase 2 — Feb 2026)
### Google Calendar Sync
- Owner connects Google once via OAuth (button in Admin Settings → Google Calendar panel)
- Endpoints: `GET /api/admin/calendar/status`, `GET /connect`, `GET /callback`, `POST /disconnect`, `GET /test`
- Employee record gets optional `google_calendar_id` (defaults to owner's `primary`)
- On booking confirmation → Google event auto-created (summary = service — customer, description includes booking code, deposit paid, balance due, notes; Asia/Kolkata timezone)
- On booking cancellation → event deleted; booking cleaned up
- Graceful degradation: bookings work end-to-end even when Google is not connected
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars — currently empty (owner will paste later)

### Reschedule Sync
- New endpoint: `POST /api/admin/bookings/{id}/reschedule` with `{date, start_time, employee_id?}`
- Validates: past date, employee working hours, employee leave, and slot conflicts (excludes itself)
- Recomputes `end_time` from service duration; can move to a different stylist
- Google event auto-updated: patched on same stylist / re-created on new stylist / created on-the-fly if Google was connected after booking
- Admin Bookings table adds a Reschedule action per row (disabled for cancelled/completed); opens a modal with stylist + date + slot picker
- `● red dot` next to booking code indicates a live Google-synced event
- Verified: 79/79 tests pass (14 new reschedule + 15 calendar + 50 core)

## User Personas
- **Owner / Admin** — manages every aspect of the business without touching code
- **Customer** — walk-in intent user who converts to online booking with deposit

## Testing
- Backend: **50/50 pytest cases pass**
- Frontend: **100% of critical flows verified** (landing, booking end-to-end, admin login → dashboard → CRUD)

## Deferred / Backlog (Phase 2+)
- **P1**: Real Razorpay integration (swap `RAZORPAY_MODE=live` + collect keys)
- **P1**: Google Calendar sync per employee + owner master calendar
- **P1**: Email + WhatsApp booking confirmations (Twilio/SendGrid)
- **P1**: Employee role login + personal schedule
- **P2**: Admin Calendar module (day/week/month views, drag-drop reschedule)
- **P2**: Analytics deep-dive (revenue trends, cancellation & no-show rates, monthly charts)
- **P2**: Multi-branch, memberships, packages, gift cards, coupons, loyalty
- **P2**: Google Reviews sync
- **P3**: PDF receipt & calendar download on confirmation
