# Codex build brief: VineChart-powered VineScout

## Goal

Turn VineScout into a substantially better real-time Amazon Vine telemetry client by using VineChart as the authorized upstream data provider.

This is **not** an Amazon inventory scraper. Do not add automated Amazon page collection, credential automation, anti-bot workarounds, CAPTCHA bypasses, or private Amazon API reverse engineering.

The project owner states that VineChart has granted permission to use its API and instructed the project to create its own client credentials. No API key was issued. Treat the authentication transport as provider-defined and configurable until the supplied VineChart documentation or real authorized responses confirm it.

## Existing app

Repository: `NurseDan/VineScout`

Current stack:

- TypeScript
- React 18 + Vite
- Express
- TanStack Query
- Recharts
- Drizzle ORM + PostgreSQL
- Tailwind/Radix UI

Work on branch:

`feat/vinechart-api-client`

## Already scaffolded

`server/integrations/vinechart/`

- `config.ts` - environment configuration and selectable auth transport
- `client.ts` - GET client for status/series plus generic SSE parser
- `types.ts` - integration-level types
- `index.ts` - exports
- `.env.vinechart.example` - non-secret configuration template

Known publicly exposed/monitored VineChart endpoints:

- `/api/status`
- `/api/series`

VineChart also describes real-time delivery using SSE, but **do not invent the SSE path or payload shape**. Configure it only after confirming it from authorized docs or observed authorized client traffic.

## Critical implementation rule

Do not bake VineChart's raw payload shape throughout the application.

Use:

```text
VineChart API
    ↓
Provider client
    ↓
Runtime validation
    ↓
Normalizer
    ↓
VineScout domain models
    ↓
Storage + analytics
    ↓
REST/SSE endpoints owned by VineScout
    ↓
React client
```

This makes VineScout resilient to upstream field-name/version changes.

## Phase 1: establish the real API contract

1. Read the VineChart API documentation supplied by the project owner.
2. Confirm:
   - base URL
   - auth mechanism
   - credential/header names
   - rate limits
   - `/api/status` schema
   - `/api/series` parameters and schema
   - SSE URL and event names
   - historical retention/range limits
3. Capture sanitized JSON/SSE fixtures. Never commit credentials.
4. Add Zod validators for each confirmed upstream payload.
5. Preserve unknown fields with `.passthrough()` where useful so provider additions do not break ingestion.

If documentation is unavailable in the coding environment, keep the adapter generic and add a blocking TODO rather than guessing schemas.

## Phase 2: normalize Vine telemetry

Create provider-independent domain types for at least:

- source timestamp
- receive timestamp
- current total
- additions
- removals/requested estimate
- queue/drop status
- drop intensity/rate if supplied
- category activity if supplied
- source freshness/staleness
- upstream service health

Every record must carry `source: "vinechart"`.

Do not re-label estimated/removal metrics as definitive orders or requests unless VineChart's documentation explicitly defines them that way.

## Phase 3: storage

Add Drizzle tables suited to time-series ingestion:

### vine_telemetry_points

- id
- source
- source_timestamp
- received_timestamp
- total
- added
- removed
- drop_state
- upstream_payload_version/hash where useful

### vine_drop_events

- id
- source
- started_at
- ended_at
- duration_seconds
- peak_rate
- estimated_added
- estimated_removed

### vine_category_points

- id
- source_timestamp
- category key/name
- count/activity fields supported by upstream

Use unique constraints/idempotency so SSE reconnects and REST backfills cannot duplicate observations.

## Phase 4: backend service

Create a VineChart ingestion service that:

- fetches current status
- backfills series/history
- subscribes to SSE
- reconnects with exponential backoff + jitter
- respects provider `retry:` hints
- handles `Last-Event-ID` when the upstream supports it
- honors HTTP 429 and `Retry-After`
- exposes freshness and health
- never logs secrets or Authorization headers

Add VineScout endpoints such as:

- `GET /api/vine/live`
- `GET /api/vine/series`
- `GET /api/vine/drops`
- `GET /api/vine/health`
- `GET /api/vine/categories` if upstream data supports it
- `GET /api/vine/events` as VineScout's own SSE feed

The browser should consume VineScout's backend, not VineChart directly.

## Phase 5: first dashboard

Build a responsive live dashboard with:

- live connection indicator
- data age/freshness
- current Vine inventory/activity value(s)
- additions/removals over selectable windows
- live time-series chart
- current drop state
- drop duration
- velocity
- recent drop timeline
- 1m, 30m, 1h, 12h, 24h presets
- custom time window
- 7/30/60/90-day historical views

Do not copy VineChart's visual design. Build an original VineScout interface.

## Phase 6: improve beyond VineChart

Once the raw integration is stable, add derived analytics without misrepresenting them as provider facts:

- rolling velocity
- acceleration/deceleration
- historical percentiles
- drop-size distributions
- hour-of-day × weekday heat maps
- similarity to prior drops
- estimated duration/range with confidence intervals
- anomaly detection
- category momentum if category data exists
- notification rules
- user-defined dashboards
- CSV/JSON export
- PWA/mobile-ready layout

Clearly label:

- **VineChart data**
- **VineScout-derived metric**
- **VineScout estimate**

## Reliability requirements

- API adapter tests from sanitized fixtures
- SSE parser tests including fragmented chunks and multiline `data:`
- abort/reconnect tests
- 429/backoff tests
- stale-data UI state
- upstream outage UI state
- no fabricated/interpolated live values during outages
- TypeScript check must pass
- existing VineScout functionality must remain intact

## Security

- no committed credentials
- no secrets sent to the browser
- no secret values in logs
- redact provider response headers when logging errors
- server-side VineChart access only
- configurable auth transport because the exact provider convention must come from the authorized documentation

## First deliverable

Produce one PR from `feat/vinechart-api-client` containing:

1. confirmed upstream contract documentation
2. validated VineChart adapter
3. fixture-backed tests
4. normalized domain types
5. VineScout proxy/health endpoints
6. minimal live dashboard wired to real data
7. README setup instructions
8. screenshots of the working desktop and mobile dashboard

Do not merge automatically.
