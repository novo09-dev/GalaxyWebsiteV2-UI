import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

// Attach admin token if present
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("galaxy_admin_token");
  if (token && cfg.url && cfg.url.startsWith("/admin")) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Public
export const getBusiness = () => api.get("/business").then((r) => r.data);
export const getHeroSlides = () => api.get("/hero-slides").then((r) => r.data);
export const getCategories = () => api.get("/categories").then((r) => r.data);
export const getServices = (params) => api.get("/services", { params }).then((r) => r.data);
export const getEmployees = (params) => api.get("/employees", { params }).then((r) => r.data);
export const getGallery = () => api.get("/gallery").then((r) => r.data);
export const getTestimonials = () => api.get("/testimonials").then((r) => r.data);
export const getFAQs = () => api.get("/faqs").then((r) => r.data);
export const getAvailability = (params) => api.get("/availability", { params }).then((r) => r.data);
export const createBooking = (body) => api.post("/bookings", body).then((r) => r.data);
export const verifyPayment = (body) => api.post("/payments/verify", body).then((r) => r.data);
export const getBooking = (id) => api.get(`/bookings/${id}`).then((r) => r.data);

// Admin
export const adminLogin = (body) => api.post("/admin/login", body).then((r) => r.data);
export const adminMe = () => api.get("/admin/me").then((r) => r.data);
export const adminStats = () => api.get("/admin/stats").then((r) => r.data);
export const adminBookings = (params) => api.get("/admin/bookings", { params }).then((r) => r.data);
export const adminUpdateBooking = (id, body) => api.patch(`/admin/bookings/${id}`, body).then((r) => r.data);
export const adminRescheduleBooking = (id, body) => api.post(`/admin/bookings/${id}/reschedule`, body).then((r) => r.data);
export const adminCustomers = () => api.get("/admin/customers").then((r) => r.data);
export const adminBusiness = () => api.get("/admin/business").then((r) => r.data);
export const adminUpdateBusiness = (body) => api.patch("/admin/business", body).then((r) => r.data);

// Generic CRUD
export const adminList = (path) => api.get(`/admin/${path}`).then((r) => r.data);
export const adminCreate = (path, body) => api.post(`/admin/${path}`, body).then((r) => r.data);
export const adminUpdate = (path, id, body) => api.patch(`/admin/${path}/${id}`, body).then((r) => r.data);
export const adminDelete = (path, id) => api.delete(`/admin/${path}/${id}`).then((r) => r.data);

// Google Calendar
export const adminCalendarStatus = () => api.get("/admin/calendar/status").then((r) => r.data);
export const adminCalendarDisconnect = () => api.post("/admin/calendar/disconnect").then((r) => r.data);
export const adminCalendarTest = (calendar_id = "primary") =>
  api.get("/admin/calendar/test", { params: { calendar_id } }).then((r) => r.data);
export const adminSaveServiceAccount = (credentials) =>
  api.post("/admin/calendar/service-account", { credentials }).then((r) => r.data);
export const adminChangeCredentials = (body) => api.post("/admin/change-credentials", body).then((r) => r.data);
export const adminCalendarConnectUrl = () => {
  const token = localStorage.getItem("galaxy_admin_token");
  return `${API}/admin/calendar/connect?token=${encodeURIComponent(token || "")}&redirect_to=${encodeURIComponent("/admin/settings")}`;
};
