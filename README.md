# BIFlow — Data Analytics & Business Intelligence Dashboard

A fully self-contained, production-quality Business Intelligence platform built with HTML, CSS, and vanilla JavaScript. No build tools or server required — just open `index.html` in your browser.

# BIFlow – Data Analytics & Business Intelligence Dashboard

[![Live Demo](https://img.shields.io/badge/Live-Demo-00C853?style=for-the-badge)](https://bifloww.netlify.app/)

A fully self-contained, production-quality Business Intelligence platform built with HTML, CSS, and vanilla JavaScript. No build tools or server required—just open `index.html` in your browser.

## 🚀 Getting Started

1. Open `index.html` in any modern browser (Chrome, Firefox, Edge)
2. Sign in with the demo credentials:
   - **Email**: `admin@biflow.io`
   - **Password**: `admin123`
3. Or register a new account

That's it — no installation needed!

## ✨ Features

### 🎛️ Custom Dashboards
- Multi-tab dashboard with named workspaces
- Drag-and-drop ready widget grid (6 widget types)
- Widget types: Bar, Line, Area, Pie, Doughnut, KPI Card
- Per-widget dataset binding with axis selection
- Resize widgets: Small / Medium / Large
- Export any widget as PNG
- Persistent layout saved in localStorage

### 📊 KPI Monitor
- KPI cards with progress bars and status coloring (green/amber/red)
- Threshold alerts (warning & critical %)
- D3.js sparkline mini-charts per KPI
- Period selector: 7 Days / 30 Days / 90 Days / 1 Year
- Trend line charts per KPI
- Add / edit / delete KPIs
- Compute KPI values from imported datasets (Sum, Avg, Max, Min, Count, Last)

### 📥 Data Import from Multiple Sources
- **CSV / Excel upload** — drag-and-drop or browse files
- **REST API connector** — URL, method, custom headers, JSON path selector
- **Manual JSON entry** — paste and preview data
- **Sample datasets** — one-click load of 4 realistic datasets:
  - Sales Data (12 months × 3 regions = 120 rows)
  - Web Traffic (90 days)
  - Financial KPIs (24 months)
  - Product Metrics (60 rows)
- Dataset management: preview, download CSV, delete, use in dashboard

### 📤 Exportable Reports
- Visual report builder with live preview
- 6 chart types, 5 color themes
- Export as: **PNG**, **PDF** (A4 landscape, styled), **CSV**, **Excel (XLSX)**
- Save reports with metadata
- Re-load saved reports

### ⚙️ Settings
- Profile management (name, email)
- Accent color theming (Violet, Blue, Teal, Rose, Amber)
- Notification preferences per category
- Clear all data

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Charts | Chart.js 4 + D3.js v7 |
| CSV Parsing | PapaParse 5 |
| Excel | SheetJS (XLSX) |
| PDF Export | jsPDF 2 |
| Screenshot | html2canvas |
| Icons | Lucide Icons |
| Styling | Vanilla CSS (dark glassmorphism) |
| Storage | localStorage (per-user, multi-account) |

## 📁 File Structure

```
/
├── index.html    # App shell, CDN scripts, all HTML
├── styles.css    # Full design system (CSS custom properties)
├── app.js        # All application logic
└── README.md
```

## 🎨 Design

- **Dark glassmorphism** theme with custom CSS design tokens
- **Inter** font (Google Fonts)
- Smooth animations and micro-interactions
- Fully responsive (mobile-friendly)
- Customizable accent color via Settings

## 🔐 Multi-User Auth

Accounts are stored in localStorage. Each user has their own:
- Dashboard layouts and widgets
- KPIs and thresholds
- Datasets
- Saved reports

---

> Built with ❤️ by Abhishek
