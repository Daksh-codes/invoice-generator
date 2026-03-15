# Invoice Generator

A lightweight billing and invoice management app built for small CA firms in India. Runs locally on one office PC — others access it over LAN.

## Features

- Create invoices and quotations with auto-incrementing bill numbers
- Multiple firms (issuers) with separate prefixes and counters
- Three invoice templates — Logo + Firm, Firm Only, Plain
- GST support — CGST/SGST or IGST toggle, per-bill rate
- Discount support — percentage or flat amount
- Line items with reusable description library (auto-populated from history)
- Payment tracking — Unpaid / Partial / Paid with amount, mode and date
- Payment modes — Cash, UPI, Bank Transfer
- Void and unvoid bills
- Dashboard with filters — firm, status, template, date range
- Client management with inline editing
- Bank details and UPI QR code on invoices
- Print / Save as PDF from browser

## Tech Stack

**Backend** — Node.js, Express, better-sqlite3, Multer  
**Frontend** — React, Vite, Tailwind CSS, React Router

## Project Structure

```
invoice-generator/
├── server/               # Express backend
│   ├── controller/
│   ├── routes/
│   ├── data/             # SQLite database (gitignored)
│   ├── uploads/          # Logo and QR uploads (gitignored)
│   ├── scripts/
│   │   └── initDb.js     # Fresh DB setup
│   └── index.js
└── client/               # React frontend
    ├── src/
    │   ├── pages/
    │   └── api.js
    └── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js 18+

### Installation

```bash
# Clone the repo
git clone https://github.com/Daksh-codes/invoice-generator.git
cd invoice-generator

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Database Setup

```bash
cd server
node scripts/initDb.js
```

> ⚠️ This wipes and recreates the database. Only run on a fresh install, never on production data.

### Run

```bash
# Start backend (from server/)
npm start

# Start frontend (from client/)
npm run dev
```

Backend runs on `http://localhost:3000`  
Frontend runs on `http://localhost:5173`

### LAN Access

Other devices on the same network can access the app at `http://<your-pc-ip>:5173`

## License

MIT