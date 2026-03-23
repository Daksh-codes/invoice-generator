// src/components/Navbar.jsx
// Place this inside a layout wrapper that wraps all pages.
// Usage in App.jsx:
//   import Layout from "./components/Layout";
//   <Route element={<Layout />}>
//     <Route path="/" element={<BillsDashboard />} />
//     <Route path="/bills/new" element={<BillForm />} />
//     <Route path="/firms/new" element={<FirmForm />} />
//     <Route path="/firms/:id/edit" element={<FirmForm />} />
//     <Route path="/bills/:id/preview" element={<InvoicePreviewPage />} />
//   </Route>

import { NavLink, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    to: "/",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: "Firms",
    to: "/firms",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
  {
    label: "Clients",
    to: "/clients",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    label: "New Bill",
    to: "/bills/new",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    ),
    highlight: true,
  },
];

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo / App name */}
        <a href="/">
          <div className="flex items-center gap-2 select-none">
            <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-800 tracking-tight">
              InvoiceApp
            </span>
          </div>
        </a>
        
        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ label, to, icon, highlight }) =>
            highlight ? (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ml-1 ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-800 text-white hover:bg-slate-700"
                  }`
                }
              >
                {icon}
                {label}
              </NavLink>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-800"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`
                }
              >
                {icon}
                {label}
              </NavLink>
            ),
          )}
        </div>
      </div>
    </nav>
  );
}
