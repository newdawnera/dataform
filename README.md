# Data Insight Workspace

A browser-first React application for exploring, cleaning, and visualizing datasets, with optional AI-generated insights.

## Features

- Interactive retail risk and revenue dashboard with KPI cards, charts, and segment/region filters
- Import CSV and Excel (`.xlsx`) files, parsed entirely in your browser
- Automatic data-quality checks with one-click cleaning options
- Cleaned-data preview, auto-generated charts, and CSV export
- AI-generated insights, recommendations, and chart suggestions
- Printable report workflow

## Privacy

- Files are parsed and cleaned locally in your browser — raw data is never uploaded or stored
- AI insights are generated from a compact, redacted dataset summary, never raw rows
- Sensitive columns (names, emails, account numbers, and similar) are automatically excluded
- Uploaded data is not used for model training

## Tech Stack

React, Vite, Recharts, and Cloudflare Pages.

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Configuration

AI insights are powered by a server-side API route on Cloudflare Pages. The deployment expects two environment variables, listed in `.env.example`:

```text
GROQ_API_KEY   # required, stored as a server-side secret
AI_MODEL       # optional
```

API keys stay server-side and are never exposed to the browser.

## License

All rights reserved.
