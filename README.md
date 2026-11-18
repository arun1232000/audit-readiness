# Audit Readiness Check

A lead-capture assessment for Prime Compliance: **"Are you audit ready?"** Visitors leave their details, answer 8 questions, and see their readiness score straight away. Every submission is synced to HubSpot as a contact, with custom properties and a readable note.

- **Frontend:** React 18, TypeScript, Vite, a single design system in `src/styles/theme.css` (Inter, Prime night/road-yellow palette, with Tailwind utilities on top), GSAP ScrollTrigger and three.js for motion, React Hook Form + Zod, Zustand, react-phone-number-input
- **Backend:** Node + Express (TypeScript) in `/server`, plus a Vercel serverless entry in `/api`
- **Tests:** Vitest + React Testing Library (unit and API), Playwright (end-to-end, with HubSpot mocked)

---

## Quick start (no HubSpot account needed)

```bash
npm install
cp .env.example .env        # HUBSPOT_MOCK=true by default
npm run dev                 # web on http://localhost:5173, API on :8787 (proxied at /api)
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite and the API with hot reload |
| `npm test` | Unit and API tests (Vitest) |
| `npm run test:e2e` | Playwright full flow, desktop and mobile (starts its own servers, HubSpot mocked) |
| `npm run build` | Type-check, lint, build the frontend to `dist/` and bundle the server to `dist-server/` |
| `npm start` | Run the built server (set `SERVE_STATIC=true` to also serve `dist/`) |
| `npm run hubspot:setup` | One-time creation of the HubSpot property group and properties |
| `npm run queue:flush` | Replay queued submissions now |

Playwright needs a browser. Run `npx playwright install chromium`, or use your installed Chrome with `PW_CHANNEL=chrome npm run test:e2e`.

---

## How it works

```
Intro ─► Lead form (name, email, phone, consent) ─► 8 questions ─► "Calculating…" ─► Results
                                                                    │
                                                         POST /api/submit
                                                                    │
                              validate (shared Zod) ─► bot checks ─► recompute score on the server
                                                                    │
                              idempotency check ─► HubSpot upsert contact + note
                                                     │ failure
                                                     └► JSON-lines queue, retried in the background
```

### Project structure

```
src/
  config/brand.ts         brand name, logo, colours, contacts, CTA, page copy   ← edit to rebrand
  data/assessment.ts      questions, answers, points, bands, result copy        ← edit the assessment
  lib/scoring.ts          pure scoring functions (shared with the server)
  lib/summary.ts          WhatsApp text and HubSpot note HTML (shared)
  lib/{api,utm,storage,theme}.ts
  schemas/submission.ts   Zod schemas shared by the form and the API
  store/assessmentStore.ts  Zustand state, persisted to sessionStorage
  styles/theme.css        the whole design system: tokens, header, hero, sections, the check, results, footer
  lib/motion.ts           three.js road of light, stars, GSAP scroll motion (lazy-loaded)
  components/             Chrome (header, side tab, invite, credits), icons, Turnstile
  components/audit/       AuditModal, QuestionStep (8 questions + power units), LeadStep, CalcStep,
                          ResultStep, ScratchCard, ErrorStep
  screens/                Landing, Privacy
server/
  app.ts                  Express app (helmet, CORS, rate limit, pino, routes)
  index.ts                long-running server and background queue worker
  bootstrap.ts            builds dependencies from env (shared with serverless)
  routes/                 submit.ts, health.ts
  services/               hubspot.ts, queue.ts, submit.ts (framework-agnostic handler), turnstile.ts
  scripts/                setup-hubspot-properties.ts, flush-queue.ts
api/index.ts              Vercel serverless entry (wraps the same Express app)
tests/                    unit/, server/, e2e/
```

---

## The assessment and UI (from "The Audit" website v2)

The questions, answer labels, bands and every piece of result copy are reproduced word for word from `The_Audit_3D_check_page_Nov16.html`. They live in `src/data/assessment.ts`.

- **8 questions** across **4 areas**, two each: 01 Company administration, 02 Drivers, 03 Equipment, 04 Overall compliance.
- **Points:** "Yes - all of it" = 2, Partly = 1, No = 0, Not sure = 0. All questions carry equal weight.
- **Score:** `exact = points / 16 × 100`. The page shows `Math.round(exact)`%.
- **Band:** chosen from the **exact** (unrounded) value, as in the reference:
  - 85 or more: "Strong Start!"
  - 60 or more: "Almost There!"
  - below 60: "Time for a Closer Look!"
- **Results** show the score, band, two message paragraphs, next step and tally line. Every answer other than Yes gets a follow-up item. Then come the "kept" line, the CTA and the fine print.

### UI flow (v4 redesign, Nov 18)

The look is Prime's brand: a warm night ground, road yellow as the one bright colour, and Alberta photographs. It is built as one design system in `src/styles/theme.css` (tokens at the top), with the Inter variable font self-hosted through `@fontsource-variable/inter`.

1. **Header (sticky):** the Prime logo, links to *What we check*, *How it works* and *Contact*, a **Call** button and **Start The Audit**. It is transparent over the hero and turns solid on scroll. Below 980 px the links collapse; below 640 px only the logo and Start remain.
   - The logo uses `public/img/logo_prime_light.png`: the original artwork with the dark ink recoloured to white and the yellow mark kept, so it reads on dark. The original stays at `brand.logo.src` for light surfaces.
2. **Hero (split):** the pitch, CTA and stats on the left. On the right, **question 1 is live**: tapping an answer records it and opens the check at question 2.
3. **Sections:**
   - *What we check*: the 4 areas and their questions, built from `src/data/assessment.ts`.
   - *The letter*.
   - *The calm way out*: Before and After driver files.
   - *How it works*: three steps.
   - A closing **CTA band** with the benefits and the six-fleets line.
   - The **contact** card.
   - A **footer** with the logo, contacts, links, legal text and photo credits.
4. **The check:** full screen, with the logo and "The Audit" in its top bar and progress grouped by area. Keys 1–4 and Backspace work on desktop. Then the power-units tap, the details form beside a "What's inside" preview, and the calculating pause.
5. **Results dashboard:** the score panel pinned on the left; area tiles with percent meters, the scratch card and recommendations on the right; a docked request button on phones.

**Motion:**
- The road of light uses 700 points on phones and 1,800 on desktop, and is skipped on data-saver or low-power devices.
- Scroll-scrubbed parallax runs only at 900 px and wider.
- Animations take 0.8 s.
- Three.js and GSAP load after first paint.
- Everything is off under reduced motion.

### Changes and assumptions (flagged)

1. **Details are required and there is no Skip.** The design asked for first name and mobile, with email optional and a Skip link. The brief requires full name, email and phone plus consent before results, so every submission becomes a HubSpot lead. Re-adding Skip means results without a lead; ask before changing it.
2. **One hero chip changed.** "You choose what to send" is no longer true once details are sent to HubSpot, so it now reads "Your score by area" (`brand.hero.promise`).
3. **Dark only.** The design has no light mode, so the light/dark toggle from the first build was removed.
8. **v3/v4 additions beyond the original design:** the sticky header with the logo and navigation (it replaces the side tab), question one live in the hero, the *What we check* section, the CTA band and footer, the hero and end-card buttons, the invitation delay (3.8 s → 6 s, since the hero now has its own button), the full-screen check with grouped progress, keyboard shortcuts, the report preview beside the form, the results dashboard with area percentages, and the docked mobile CTA.
4. **The area tiles replace the bar chart** as the per-area breakdown, as in the design. Per-area percentages still go to HubSpot and into the note.
5. **Per-area scores** are an addition: area points ÷ 4 × 100. Area state follows the design: any No or Not sure is "Gap to close"; any Partly is "Needs a look"; otherwise "Ready". The **area to start with** is the lowest-scoring area (the first one on ties), or Drivers when every answer is Yes.
6. **Persistence.** A refresh reopens the check where it was. A returning visitor's invitation offers "See your result".
7. **CTA:** the WhatsApp request is pre-written with the name, power units, score, items and area to start with. It can be switched to a URL in `brand.cta`.

---

## Editing questions and branding

- **Questions, answers, bands, result copy:** `src/data/assessment.ts`. Question ids (`q1`…`q8`) are part of the API schema and the stored data, so add new ids rather than renumbering existing ones. If you add or remove a **dimension**, also run `npm run hubspot:setup` so its `hubspotProperty` exists in HubSpot.
- **Brand name, logo, hero image, phone numbers, CTA, landing copy:** `src/config/brand.ts`. Put images in `public/brand/`.
- **Brand accent colour:** `brand.colors.accent`. It is written to the single CSS variable `--yellow` at start-up.
- **Other design tokens** (surfaces, ink, dawn, clay, sage, radii, spacing, type scale, widths): the `:root` block at the top of `src/styles/theme.css`, mirrored for Tailwind in `tailwind.config.ts`.
- **Landing copy, images, captions, photo credits, invitation and details-form copy:** also `src/config/brand.ts`. Photos live in `public/img/` (a `_960` copy of each is used on small screens).

---

## Web3Forms (simplest: no server, no HubSpot)

Instead of HubSpot, each completed check can be emailed to you through [Web3Forms](https://web3forms.com). The browser posts straight to Web3Forms, so this works on static hosting such as GitHub Pages.

1. Get a free access key at https://web3forms.com (enter the inbox that should receive leads).
2. Set `VITE_WEB3FORMS_ACCESS_KEY` at build time. On GitHub Pages: repository **Settings > Secrets and variables > Actions > Variables**, add `WEB3FORMS_ACCESS_KEY`, then re-run the Pages workflow.

When the key is set, it takes priority over demo mode and the `/api/submit` server. Each email contains the name, email (set as reply-to), mobile, power units, score and band, per-area scores, all eight answers, the items to review, consent, the source (UTM/referrer) and the submission ID. The score is still shown instantly in the browser; a network failure shows the usual "Try again" screen. Bots that fill the hidden field or finish in under 4 seconds see a normal result and nothing is sent.

The access key is public by design (it can only send a form to your inbox), so it is safe in the bundle. Web3Forms has no CRM, de-duplication or retry queue; use the HubSpot server below if you need those. Test: `npm run test:e2e:web3forms` (Web3Forms is intercepted; nothing is sent).

## HubSpot setup

### 1. Create a Private App

In HubSpot, go to **Settings → Integrations → Private Apps → Create a private app**. On the **Scopes** tab, tick:

| Scope | Why |
|---|---|
| `crm.objects.contacts.read` | Find the contact by email (upsert) |
| `crm.objects.contacts.write` | Create or update contacts, and create notes associated with them |
| `crm.schemas.contacts.write` | Needed only by the one-time property setup script |

Create the app and copy the **access token** (`pat-…`). If HubSpot rejects note creation with a 403 in your portal, the server log will name the missing scope. Add it to the app; no code change is needed.

### 2. Configure `.env` (server only, never prefix with `VITE_`)

```
HUBSPOT_ACCESS_TOKEN=pat-na1-…
HUBSPOT_MOCK=false
HUBSPOT_LIFECYCLE_STAGE=lead        # optional, applied to NEW contacts only
HUBSPOT_LEAD_STATUS=NEW             # optional, applied to NEW contacts only
```

### 3. Create the properties (once)

```bash
npm run hubspot:setup -- --dry-run   # list what will be created
npm run hubspot:setup                # create (safe to re-run; updates existing)
```

This creates the contact property group **Assessment** with these properties:

| Property | Type |
|---|---|
| `assessment_overall_score` | number 0–100 |
| `assessment_score_company_admin`, `assessment_score_drivers`, `assessment_score_equipment`, `assessment_score_overall_compliance` | number 0–100 |
| `assessment_result_label` | text, e.g. "Almost There!" |
| `assessment_completed_at` | datetime |
| `assessment_consent` | boolean |
| `assessment_power_units` | dropdown: 1 to 4, 5 to 20, 21 to 70, More than 70 |
| `assessment_start_area` | the area to start with, e.g. Drivers |
| `assessment_source` | UTM values and referrer, e.g. `utm_source=google \| utm_campaign=x` |
| `assessment_answers_json` | raw answers (falls back to "see note" if ever over 65k characters) |
| `assessment_last_submission_id` | internal, prevents duplicate notes |

Standard properties are also mapped: `firstname` and `lastname` (split from the full name at the first space), `email`, and `phone` in E.164 format.

### What a submission does in HubSpot

1. `GET /crm/v3/objects/contacts/{email}?idProperty=email`.
2. If found, `PATCH` the contact. If not, `POST` a new one. If the create returns **409 "already exists"** (a race), the server reads the existing id and `PATCH`es instead.
3. `POST /crm/v3/objects/notes`, associated with the contact (association type 202). The note holds the score, band, per-area scores, every question with the chosen answer, the follow-up items and the source.
4. `PATCH` the contact's `assessment_last_submission_id`.

### Reliability

- **Timeouts:** each HubSpot call has its own timeout (`HUBSPOT_TIMEOUT_MS`).
- **Retries:** exponential backoff with jitter on **429 and 5xx** and on network errors, up to `HUBSPOT_MAX_RETRIES`. `Retry-After` is honoured.
- **Idempotency:** the key is sha256(email + submissionId).
  - A local ledger (`data/processed.jsonl`) catches replays.
  - The contact's `assessment_last_submission_id` prevents a second note even across servers.
  - Concurrent identical requests are collapsed into one sync.
  - The browser keeps the same `submissionId` across retries and refreshes.
- **Outage handling:** if HubSpot still fails, the submission is appended to `data/hubspot-queue.jsonl` and the API answers `202 queued`. The user sees their result as normal.
  - The server retries the queue every `QUEUE_INTERVAL_MS`, with backoff from 1 minute up to 1 hour.
  - After `QUEUE_MAX_ATTEMPTS` failures a job moves to `data/hubspot-dead-letter.jsonl`. Fix the cause, move the lines back into the queue file, and run `npm run queue:flush`.
- **Errors:** users never see HubSpot error details. The server logs the status and body with the request id. The error screen shows the first 8 characters of the request id so support can find the log line.

---

## Security and abuse protection

- The HubSpot token exists only on the server. The browser calls `POST /api/submit` and never talks to HubSpot.
- The server re-validates every payload with the same Zod schema as the form.
  - Unknown keys are rejected, so a client-sent `score` is refused.
  - The score is always **recomputed on the server**.
- `helmet` with a strict CSP (no inline scripts; the theme bootstrap is `public/theme-init.js`).
- CORS is limited to `CORS_ORIGIN`.
- JSON body limit is 16 kB.
- `express-rate-limit` applies to `/api/submit` (`RATE_LIMIT_MAX` per `RATE_LIMIT_WINDOW_MS` per IP). Set `TRUST_PROXY` correctly behind a proxy.
- Bot protection:
  - A hidden **honeypot** field. Filled submissions get a fake success and are not stored.
  - A **minimum completion time** (`MIN_COMPLETION_MS`, measured on the client from opening the form).
  - Optional **Cloudflare Turnstile**: set `TURNSTILE_ENABLED=true`, `TURNSTILE_SECRET_KEY` and `VITE_TURNSTILE_SITE_KEY`.
- **Logs** (pino) carry a request id, method, path and status. They never include bodies, query strings or headers. Emails appear only masked (`sa***@ex***.com`), and redaction rules strip any `email`, `phone`, `fullName` or `lead` fields that slip through.

---

## Environment variables

See `.env.example`; every variable is documented there. The main ones:

| Variable | Default | Notes |
|---|---|---|
| `HUBSPOT_ACCESS_TOKEN` | – | Required unless `HUBSPOT_MOCK=true` |
| `HUBSPOT_MOCK` | `false` | In-memory mock for demos and tests |
| `HUBSPOT_MOCK_FAIL` | `false` | Mock only: simulate an outage to see the queue at work |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated list of allowed origins |
| `QUEUE_DIR` | `./data` | Must be private to the server, and persistent |
| `SERVE_STATIC` | `false` | Let the API also serve `dist/` |
| `VITE_API_BASE_URL` | empty | Set only if the API is on a different origin |

---

## Deployment

**GitHub Pages (live demo):** every push to `main` runs `.github/workflows/pages.yml`. It type-checks, lints, runs the unit tests, then builds the frontend with:
- `VITE_BASE=/<repo>/`, so the site works under the repo sub-path;
- `VITE_DEMO_MODE=true`, which matters because Pages cannot run the Node server. In demo mode the browser validates and scores with the same shared code, **sends nothing anywhere**, and the results page says so.

The site is published at `https://<owner>.github.io/<repo>/`.

For real HubSpot leads, deploy the server as below and build the frontend without `VITE_DEMO_MODE`. If the frontend stays on Pages, set `VITE_API_BASE_URL` to the server's URL and add the Pages origin to the server's `CORS_ORIGIN`.


**Single Node server (simplest; the durable queue works as-is).**

```bash
npm ci && npm run build
SERVE_STATIC=true NODE_ENV=production CORS_ORIGIN=https://audit.example.com npm start
```

Put it behind HTTPS (a reverse proxy, Render, Fly.io, Railway and so on), mount a persistent volume at `QUEUE_DIR`, and set `TRUST_PROXY=1` when behind one proxy.

**Vercel.** `vercel.json` serves `dist/` and rewrites `/api/*` to `api/index.ts`, which wraps the same Express app. Set the env vars in the Vercel dashboard.

Serverless filesystems are **ephemeral**. Set `QUEUE_DIR=/tmp/audit` and accept that queued items can be lost when an instance recycles. The HubSpot retries and the `assessment_last_submission_id` idempotency still apply. For a durable queue, swap `FileQueue` for a hosted store (Upstash Redis, Postgres) behind the same interface, and run `npm run queue:flush` logic from a Vercel Cron.

**Netlify.** Use `netlify/functions/api.ts` with `serverless-http` wrapping `createApp(bootstrap())`, plus a redirect from `/api/*` to `/.netlify/functions/api/:splat`. The same ephemeral-queue caveat applies.

---

## Privacy and data handling (GDPR-style)

**What is collected:** name, email, phone, consent, answers, scores, completion time, and first-touch UTM and referrer.

**Purpose:** showing the result and following up about an audit readiness review. The purpose is stated in the lead form, next to the consent checkbox, which links to `/privacy`.

**In the browser:**
- The in-progress session (details and answers) is kept in **sessionStorage**, so it disappears when the tab closes.
- Only a non-PII record (answers, submission id, date) stays in localStorage, so the "already completed" state works.

**On the server:**
- Nothing is stored except the retry queue, which holds PII only until delivery, and the processed ledger, which holds hashes only.
- Logs contain masked emails only.

**Data deletion requests:**
1. Verify the requester's identity, for example by replying from the email address on record.
2. In HubSpot, find the contact by email and use **Actions → Delete → Permanently delete (GDPR-compliant delete)**. This removes the contact, its properties and the associated notes.
3. On the server, delete any matching lines in `data/hubspot-queue.jsonl` and `data/hubspot-dead-letter.jsonl`. `processed.jsonl` holds only hashes, but you can remove the line for `sha256(email|submissionId)` if you want.
4. Confirm deletion to the requester within your statutory deadline (30 days under GDPR).
5. Log the request (date and outcome, no PII) for your records.

**Before launch:** replace `src/screens/PrivacyScreen.tsx` with your reviewed privacy policy.

---

## How to verify (checklist)

**Demo without HubSpot**
- [ ] `npm run dev` with `HUBSPOT_MOCK=true`. Complete the flow. The API log shows `hubspot (mock) sync` with a masked email, the score and the band.
- [ ] Set `HUBSPOT_MOCK_FAIL=true` and restart. Submit: the result still shows "Your result is saved…", and `data/hubspot-queue.jsonl` has one line. Set it back to `false`, restart, and run `npm run queue:flush`: the queue empties.

**Against a real HubSpot portal** (use a test or sandbox portal if you have one)
- [ ] Create the Private App with the scopes above. Put the token in `.env` and set `HUBSPOT_MOCK=false`.
- [ ] Run `npm run hubspot:setup`. In HubSpot, **Settings → Properties → Contact properties** now has the group **Assessment** with 13 properties.
- [ ] Open `http://localhost:5173/?utm_source=test&utm_campaign=verify` and complete the check as `you+audit1@yourdomain.com`.
- [ ] In **Contacts**, search for that email. Check:
  - first name, last name and phone (E.164) are filled;
  - lifecycle stage and lead status match your env values;
  - in the **Assessment** group, the overall score, the four area scores, the result label, completed-at, consent = Yes, power units, area to start with, source = `utm_source=test | utm_campaign=verify`, and the answers JSON are all set.
- [ ] On the contact's **Activity** tab there is **one note** listing all 8 questions with answers, the scores and the items to review.
- [ ] Retake the check with the **same email**. The same contact is updated (no duplicate), a second note appears, and the results page says "Welcome back…".
- [ ] Replay the exact same request, e.g. retry from the browser devtools, or POST the same body with curl. No third note appears, and the response `status` is `duplicate`.
- [ ] `curl localhost:8787/api/health` returns `{"ok":true,"hubspot":"live","queued":0,…}`.
