# Data Insight Workspace

A browser-first React workspace for retail risk demo analytics and local dataset
import review. The app is being phased from a synthetic portfolio dashboard into
a secure data insight product for business, financial, and customer datasets.

## Current Features

- Synthetic retail risk and revenue dashboard with segment and region filters.
- KPI cards and Recharts visualizations for portfolio composition, regional
  performance, and risk/return.
- Existing demo AI insight request and printable report workflow.
- Upload workflow for `.csv` files and modern Excel `.xlsx` workbooks.
- Local browser parsing, file metadata, original preview, and basic profiling.
- Deterministic local data quality checks and cleaning options.
- Cleaned data preview and cleaned CSV export.
- Secure uploaded-dataset AI insights through a Cloudflare Pages Function.

## Upload, Cleaning, And AI Insights Workflow

The Upload Data tab supports `.csv` files and modern Excel `.xlsx` workbooks.
Files are read locally in the browser, parsed with headers, and previewed
without sending uploaded contents to a server or AI service.

Legacy `.xls` workbooks are intentionally rejected for now. Save those files as
`.xlsx` or CSV before importing.

The importer reports:

- File name, file size, parsing status, row count, and column count.
- Detected CSV delimiter or Excel format, column names, duplicate column names,
  and blank headers.
- Inconsistent row lengths.
- Missing cell counts and deterministic column types: number, date, boolean,
  text, empty, or mixed.
- A scrollable preview limited to the first 50 data rows.

The cleaning workflow adds:

- Data quality checks for missing cells, duplicate rows, empty rows, duplicate
  names, mixed inferred types, high missingness, whitespace issues, and numeric
  outliers.
- Selectable deterministic cleaning rules for whitespace trimming, header
  normalization, empty row removal, duplicate row removal, missing placeholder
  standardization, and high-confidence number/date/boolean coercion.
- A before/after cleaning summary with renamed columns and coercion counts.
- A cleaned data preview and cleaned CSV export with safe quoting for commas,
  quotes, and newlines.

After cleaning is applied, the AI Dataset Insights panel can request generated
insights from `POST /api/insights`. The browser sends a compact dataset profile,
not the full dataset.

The summary can include:

- Dataset name, row count, column count, and column names.
- Inferred column types, missing counts, duplicate counts, and cleaning actions.
- Before/after row counts.
- Numeric min, max, mean, median, and outlier counts.
- Categorical top-value counts for non-sensitive columns.
- Date ranges and boolean counts.
- Best-effort sensitive-column redaction metadata.

Sensitive columns are detected deterministically from column names such as name,
email, phone, address, SSN, national insurance, passport, account number, card
number, sort code, IBAN, routing number, customer ID, and user ID. Sensitive
columns do not send raw values. This is protective best-effort redaction, not a
perfect PII detection guarantee.

## Cloudflare API Route

Phase 4 adds a Cloudflare Pages Function:

```text
functions/api/insights.js
```

It serves:

```text
POST /api/insights
```

The route:

- Accepts JSON only.
- Validates method, content type, payload size, and summary shape.
- Rejects raw row/full-record payload keys.
- Calls Groq with server-side secrets.
- Returns stable structured JSON for insights, recommendations, suggested
  charts, data quality notes, and the no-training pointer.
- Handles missing API keys, provider failures, timeouts, invalid responses, and
  oversized summaries without returning stack traces.

## Environment Variables

Use `.env.example` as the placeholder reference:

```text
GROQ_API_KEY=your_groq_api_key_here
AI_MODEL=your_model_name_here
```

`GROQ_API_KEY` must be configured as a server-side Cloudflare Pages secret or
environment variable for uploaded-dataset AI insights. `AI_MODEL` is optional;
the function defaults to `llama-3.3-70b-versatile`.

Do not put uploaded-dataset AI secrets in `VITE_` variables. `VITE_` variables
are exposed to browser code by Vite.

The existing demo dashboard AI flow still uses the legacy browser-side Groq
configuration. Moving that demo flow behind the secure Cloudflare route is a
good Phase 5 hardening task.

## Privacy And Security Notes

- Uploaded files are processed locally in the browser.
- Deterministic cleaning happens locally in browser state.
- Raw uploaded files are not stored by default.
- The uploaded-data AI flow sends only a summarized, redacted dataset profile.
- The app does not train a model on uploaded data.
- The Cloudflare API route keeps provider API keys server-side.
- The app avoids logging uploaded data or full summaries.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

Vite's dev server does not run Cloudflare Pages Functions by itself. To test the
secure API route locally, install or use Wrangler and run Cloudflare Pages dev
against a built app, for example:

```bash
npm run build
npx wrangler pages dev dist
```

Provide local secrets through Wrangler-supported local environment configuration
or Cloudflare Pages settings. Do not commit real secrets.

Deployment to Cloudflare Pages is not required for local frontend work. For
production, create or log into a Cloudflare account, create a Pages project,
connect the repo, and configure `GROQ_API_KEY` plus optional `AI_MODEL` in the
Cloudflare dashboard or with Wrangler secrets.

## Phase 5 Preview

Phase 5 should focus on deployment hardening, Cloudflare production settings,
rate limiting, usage limits, improved AI provider abstraction, and routing the
legacy demo AI behavior through the secure backend.
