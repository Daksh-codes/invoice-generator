// src/components/Layout.jsx
// Wraps all main pages with the Navbar.
// Pages that should NOT have the navbar (e.g. invoice preview/print) 
// should be placed OUTSIDE this layout in App.jsx.

import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Outlet />
    </div>
  );
}