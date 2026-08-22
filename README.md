# Invoice Generator

A full-stack billing and invoice management app built for small CA firms in India. Runs entirely on a local office PC — no internet, no cloud, no subscriptions. Other devices on the same network access it through the browser.

## Features

### Invoicing
- Create invoices and quotations with auto-incrementing bill numbers per firm
- Three invoice templates — Logo + Firm, Firm Only, Plain
- GST support — CGST/SGST or IGST toggle, per-bill rate
- Discount support — percentage or flat amount
- Line items with reusable description library (auto-populated from history)
- Configurable spacer rows for visual padding on printed invoices
- Due date and payment terms (optional, shown on invoice only when filled)
- Notes field per bill
- Print / Save as PDF from browser

### Dashboard
- Invoice and Quotation views (separate, amounts never mixed)
- Filters — firm, payment status, template, date range, search
- Inline payment status — Unpaid / Partial / Paid with amount, date, and payment mode
- Dynamic payment modes — add custom modes like employee names (Cash, UPI, Bank Transfer + any custom)
- Partial payment modal shows balance remaining
- Void and unvoid bills
- Paid date and balance shown in table
- Export current filtered view to Excel

### Firms & Clients
- Multiple firms (issuers) with separate bill number prefixes and counters
- Prefix history — change prefix mid-year, old bills keep their numbers
- Logo and UPI QR code upload per firm
- Bank details shown on invoice footer
- Client name and address — shown on invoice under "Billed To"

### Edit & Manage
- Edit any existing invoice — all fields except bill number and firm
- Bill number clickable in dashboard opens preview
- Preview page has Edit and Print buttons

## Tech Stack

**Backend** — Node.js, Express, better-sqlite3, Multer  
**Frontend** — React, Vite, Tailwind CSS, React Router, SheetJS (xlsx)

## Project Structure

```
invoice-generator/
├── server/
│   ├── controller/
│   ├── routes/
│   ├── scripts/
│   │   ├── initDb.js       # Fresh DB setup (run once)
│   │   └── migrate.js      # Auto-runs on server start
│   ├── data/               # SQLite database (gitignored)
│   ├── images/             # Uploaded logos and QR codes (gitignored)
│   └── index.js
├── client/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── api.js
│   └── vite.config.js
├── start.bat               # Double-click to start the app
└── backup.bat              # Double-click to backup the database
```

## Installation (Fresh Setup)

### Prerequisites
- [Node.js LTS](https://nodejs.org) — install with all defaults

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/Daksh-codes/invoice-generator.git
cd invoice-generator

# 2. Install server dependencies
cd server
npm install

# 3. Create the database
node scripts/initDb.js

# 4. Build the frontend
cd ../client
npm install
npm run build
```

### Windows Firewall (one-time, for LAN access)
```
netsh advfirewall firewall add rule name="Invoice App" dir=in action=allow protocol=TCP localport=3000
```

### Configuration

Copy `App/config.example.json` to `App/config.json`, then set the app port and backup folder:

```json
{
  "port": 3000,
  "backupUrl": "%USERPROFILE%\\Desktop\\InvoiceBackups"
}
```

If you change the port, use the same value in the Windows Firewall command.

### Start the app
```bash
cd server
node index.js
```

Or double-click `start.bat` from the project root.

Open in browser: `http://localhost:3000` by default, or use the port set in `App/config.json`.

## LAN Access (Other Office PCs)

Find the hostname of the PC running the server:
```
hostname
```

Other devices on the same WiFi/network open, using the port set in `App/config.json`:
```
http://HOSTNAME:3000
```

This works even if the IP address changes — hostname stays the same.

## Backup

Double-click `backup.bat` to copy the database to the `backupUrl` folder in `App/config.json` with a timestamp.

> The server must be stopped before running the backup, or the file may be locked.

## Development

```bash
# Terminal 1 — backend
cd server
node index.js

# Terminal 2 — frontend with hot reload
cd client
npm run dev
```

The Vite proxy in `client/vite.config.js` reads the same `App/config.json` port:
```js
const apiUrl = `http://localhost:${config.port}`

server: {
  proxy: {
    '/api': apiUrl,
    '/images': apiUrl,
  }
}
```

## License

MIT
