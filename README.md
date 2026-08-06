# Toolshelf

A visual directory of product-building tools from Hacker News, Product Hunt, Lobsters, Uneed, and DevHunt — launches classified by AI and shown as scannable cards.

## Stack (all free tiers)

- Next.js on Vercel
- Neon Postgres + Drizzle
- HN Algolia Search API (no key)
- Product Hunt public Atom feed (no key); optional GraphQL token for richer stats
- Lobsters public JSON feeds (no key)
- Google Gemini (AI Studio free key)
- GitHub Actions for poll + historical backfill

## Setup

1. Copy env:

```bash
cp .env.example .env.local
```

2. Fill in:

- `DATABASE_URL` — [Neon](https://neon.tech) free project
- `GOOGLE_GENERATIVE_AI_API_KEY` — [Google AI Studio](https://aistudio.google.com/apikey) (keep billing off)
- `PRODUCTHUNT_TOKEN` — optional upgrade from [PH API dashboard](https://api.producthunt.com/v2/oauth/applications) (Atom feed works without it)
- `CRON_SECRET` — any long random string

3. Push schema (existing DBs: run migrate first):

```bash
npm run db:migrate:sources
npm run db:push
```

4. Run the app:

```bash
npm run dev
```

5. Start filling the shelf:

```bash
# newest tools (HN + Product Hunt when token is set)
npm run ingest:poll

# historical Show HN (newest → oldest, resumable)
npm run ingest:backfill -- show_hn 100

# tool-like non-Show stories
npm run ingest:backfill -- stories 80

# Product Hunt only
npm run ingest:backfill -- producthunt 40

# Lobsters
npm run ingest:backfill -- lobsters

# Drain pending classifications
npm run ingest:drain

npm run ingest:status
```

## Deploy

1. Push to GitHub, import on Vercel, add the same env vars.
2. Add GitHub Actions secrets (repo → Settings → Secrets and variables → Actions):
   - `DATABASE_URL` (required)
   - `GOOGLE_GENERATIVE_AI_API_KEYS` — comma-separated Gemini keys (preferred)
   - `GOOGLE_GENERATIVE_AI_API_KEY` — single key fallback (optional if keys pool is set)
   - `PRODUCTHUNT_TOKEN` (optional)
   - `CRON_SECRET` (optional for Actions; used by Vercel `/api/cron/*`)
3. Workflows (run automatically — no waiting on a manual kick):
   - **CI** — typecheck + lint on every push/PR
   - **Ingest** — poll + drain on every push to `main`, every 20 minutes, deeper fill a few times/day
   - **Maintain shelf** — preview reenrich + URL health on a daily schedule
   - All ingest/maintain runs use `cancel-in-progress` so a new run never queues behind a stuck one
4. After you add more Gemini keys, put them all in `GOOGLE_GENERATIVE_AI_API_KEYS` (comma-separated). The classifier rotates on quota.

## Product notes

- Homepage is a visual card grid (preview / logo / one-liner), not a text feed.
- Tools are deduped by canonical URL across sources; detail pages list every mention.
- Tools without Open Graph images get a strong typographic fallback card.
- Backfill is checkpointed in `ingestion_cursors` so free-tier rate limits just slow progress, not break it.
