// src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "",
  timeout: 10000,
});

// ── Bills ──────────────────────────────────────────────────────────────────
export const getBill = (id) => api.get(`/api/bills/${id}`);
export const getAllBills = (params) => api.get("/api/bills", { params });
export const getNextNumber = (issuer_id, doc_type) =>
  api.get(`/api/bills/next-number/${issuer_id}`, { params: { doc_type } });
export const getBillsByStatus = (status, doc_type) =>
  api.get(`/api/bills/status/${status}`, { params: { doc_type } });
export const createInvoice = (data) => api.post("/api/bills/new/invoice", data);
export const createQuotation = (data) =>
  api.post("/api/bills/new/quotation", data);
export const finalizeDraft = (id, items) =>
  api.post(`/api/bills/${id}/finalize`, { items });
export const voidBill = (id) => api.post(`/api/bills/${id}/void`);
export const unvoidBill = (id) => api.post(`/api/bills/${id}/unvoid`);
export const convertToInvoice = (id) => api.post(`/api/bills/${id}/convert`);
export const updatePaymentStatus = (id, payload) =>
  api.put(`/api/bills/${id}/status`, payload);
export const getDescriptions = () => api.get("/api/bills/descriptions");
export const updateBill = (id, data) => api.put(`/api/bills/${id}`, data);

// ── Issuers ────────────────────────────────────────────────────────────────
export const getAllIssuers = () => api.get("/api/issuers");
export const getIssuer = (id) => api.get(`/api/issuers/${id}`);
export const createIssuer = (formData) =>
  api.post("/api/issuers/new", formData);
export const updateIssuer = (id, data) => api.put(`/api/issuers/${id}`, data);
export const uploadLogo = (id, formData) =>
  api.patch(`/api/issuers/${id}/logo`, formData);
export const changePrefix = (id, data) =>
  api.post(`/api/issuers/${id}/change-prefix`, data);
export const getPrefixHistory = (id) =>
  api.get(`/api/issuers/${id}/prefix-history`);
export const deleteIssuer = (id) => api.delete(`/api/issuers/${id}`);

// ── Clients ────────────────────────────────────────────────────────────────
export const getAllClients = () => api.get("/api/clients");
export const getClient = (id) => api.get(`/api/clients/${id}`);
export const createClient = (data) => api.post("/api/clients/new", data);
export const updateClient = (id, data) => api.put(`/api/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/api/clients/${id}`);

// ── Bank ───────────────────────────────────────────────────────────────────
export const getBankByIssuer = (issuer_id) =>
  api.get(`/api/bank/issuer/${issuer_id}`);
export const createBank = (formData) => api.post("/api/bank", formData);
export const updateBank = (id, data) => api.put(`/api/bank/${id}`, data);
export const uploadQr = (id, formData) =>
  api.patch(`/api/bank/${id}/qr`, formData);
export const getAllBankNames = () => api.get("/api/bank/names");

// ── Payment modes ──────────────────────────────────────────────────────────
export const getPaymentModes = () => api.get("/api/payment-modes");
export const createPaymentMode = (data) => api.post("/api/payment-modes", data);

// Payments
export const getPayments = (invoiceId) => api.get(`/api/payments/${invoiceId}`);
export const addPayment = (data) => api.post("/api/payments", data);
export const deletePayment = (id) => api.delete(`/api/payments/${id}`);

// ── Bootstrap ──────────────────────────────────────────────────────────────
export const bootstrap = () => api.get("/api/app/bootstrap");

// ── Image helper — relative path, works on any host ───────────────────────
export const imageUrl = (path) => path ?? null;

export default api;
