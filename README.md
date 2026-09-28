# Soundtrack Agent

> **From brief, to shortlist.**
>
> An LLM agent that takes a video brief ("30-second product teaser, upbeat, voiceover so no lead vocals"), searches the Epidemic Sound catalogue through the Partner Content API, and returns a shortlist of tracks with the reason each one fits and where to cut it.

---

## The user problem

A video editor has a cut and needs music for it. Browsing a catalogue by mood and genre works, but it takes a while to turn "confident, builds to a peak at 20 seconds, leaves room for a voiceover" into filters, listen through the results, and work out which 30 seconds of each track to use.

The agent does that translation and the first listen:

1. Maps the brief onto the catalogue's mood and genre taxonomy.
2. Runs a few searches from different angles (mood-led, genre-led, free text), honouring hard constraints like "no lead vocals".
3. Widens around strong candidates with similar-track search.
4. Finds the best segment of each shortlisted track for the video's length.
5. Writes a shortlist with inline previews. The editor can ask follow-ups ("anything slower?") and mark a track as used, which reports the usage back to Epidemic Sound.

---

## Quick start

You need Docker, pnpm and an **Anthropic** API key. You don't need Epidemic Sound credentials: the repo ships a mock of the Partner Content API (`mock-es-api/`) with a small fictional catalogue.

```bash
cp .env.example .env                 # fill in ANTHROPIC_API_KEY
docker compose up -d                 # postgres + mock ES API + Next.js (dev mode, hot reload)
pnpm install                         # local deps for drizzle-kit + vitest
pnpm db:push                         # create the tables
pnpm seed                            # optional: generate shortlists for the showcase briefs
```

Open [http://localhost:3000](http://localhost:3000).

Running outside Docker: `pnpm mock` starts the mock API on `:4010`, and `pnpm dev` starts the app. Point `ES_API_BASE_URL` at the real API and set a real `ES_API_KEY` to use the live catalogue.

### Other useful commands

```bash
pnpm dev          # Next.js dev server
pnpm mock         # mock Partner Content API on :4010
pnpm build        # production build
pnpm lint         # eslint
pnpm test         # vitest run
pnpm db:studio    # drizzle-kit web UI to browse cached responses and shortlists
```

The mock exposes `GET /_mock/usage` (not part of the real API) so you can see every usage report the app has sent.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│   Next.js 16 app                                                 │
│                                                                  │
│   Home (/)          ─submit──>  /api/shortlist ──streamText──>   │
│   Streaming UI      <──data-shortlist-id──                       │
│                     <──tool-call events──      Anthropic agent   │
│                     <──text deltas             with ES tools     │
│                     ─redirect to /shortlist/[id]                 │
│                                                                  │
│   /shortlist/[id]   ─follow-ups──> /api/shortlist/[id]/ask       │
│                     ─use track───> /api/shortlist/[id]/select    │
│   /api/preview?trackId=…  ─────>   stream URL → audio relay      │
│   /api/health                                                    │
└──────────────────────────────────────────────────────────────────┘
            │                                   │
            ▼                                   ▼
     ┌──────────────┐               ┌───────────────────────────┐
     │  Postgres    │               │ Epidemic Sound Partner    │
     │  4 tables    │               │ Content API (or the mock) │
     └──────────────┘               └───────────────────────────┘
```

**Stack:** Next.js 16 (App Router), TypeScript, React 19, Tailwind 4 + custom CSS, Vercel AI SDK v6, `@ai-sdk/anthropic` (Claude Sonnet), Drizzle ORM, Postgres 17.

### Epidemic Sound endpoints used

All under `https://partner-content-api.epidemicsound.com`, authenticated with `Authorization: Bearer <api key>`. Spec: [`/docs/spec.json`](https://partner-content-api.epidemicsound.com/docs/spec.json).

| Function (`src/lib/es/endpoints.ts`) | Endpoint | Cached |
|---|---|---|
| `listMoods()` | `GET /v0/moods` | yes |
| `listGenres()` | `GET /v0/genres` | yes |
| `searchTracks(params)` | `GET /v0/tracks/search` | yes, keyed by canonical query |
| `getPage(url)` | follows `links.next` from a list response | yes, keyed by URL |
| `getSimilarTracks(trackId)` | `GET /v0/tracks/{id}/similar` | yes |
| `getHighlights(trackId, duration)` | `GET /v0/tracks/{id}/highlights` | yes |
| `getStreamUrl(trackId)` | `GET /v0/tracks/{id}/stream` | no, signed URLs expire |
| `reportUsage({ trackIds, platform })` | `POST /v0/usage` | no |

### Agent shape

Tool-calling loop via `streamText` with `stopWhen: stepCountIs(15)`. Six tools in `src/lib/tools.ts`: `listMoods`, `listGenres`, `searchTracks`, `getNextPage`, `getSimilarTracks`, `getHighlights`. Tool outputs are condensed (id, title, artists, BPM, length, moods, genres, vocal type) to keep token use down; a typical shortlist costs about $0.05–0.15.

The model links tracks as `[Title](track:ID)`. `ShortlistDocument` renders those links as inline preview players that play through `/api/preview`.

### Persistence

Four tables in `src/lib/db/schema.ts`:

| Table | Purpose |
|---|---|
| `cached_responses` | Read-through cache for the JSON endpoints, keyed by endpoint + canonical query. |
| `shortlists` | Brief, markdown output, agent reasoning, tool-call log, token usage, finish reason. |
| `shortlist_followups` | Q&A pairs against a shortlist (`ON DELETE CASCADE`). |
| `track_selections` | One row per track the user marked as used, with the platform it was reported for. |

`/shortlist/[id]` re-renders from the persisted shortlist, so the URL can be shared without re-running the agent.

---

## Project structure

```
mock-es-api/                           # local stand-in for the Partner Content API
├── server.ts                          # endpoints, auth, rate limit, failure injection
└── catalog.ts                         # fictional tracks, moods, genres
src/
├── app/
│   ├── page.tsx                       # home (idle → streaming → redirect on done)
│   ├── shortlists/page.tsx            # recent shortlists
│   ├── shortlist/[id]/
│   │   ├── page.tsx                   # server component: shortlist, follow-ups, selections
│   │   └── ShortlistPageClient.tsx    # layout, track picker, source panel
│   └── api/
│       ├── shortlist/route.ts         # POST — streamed agent
│       ├── shortlist/[id]/ask/route.ts    # POST — follow-up Q&A
│       ├── shortlist/[id]/select/route.ts # POST — mark a track as used, report usage
│       ├── preview/route.ts           # GET — audio preview relay
│       └── health/route.ts            # GET — DB + env probe
├── components/                        # chrome, document renderer, follow-ups, picker, source panel
├── hooks/useShortlist.ts              # streaming hook + activity helper
└── lib/
    ├── es/                            # client, schemas, endpoints
    ├── db/                            # drizzle schema + client
    ├── tools.ts                       # AI SDK tool definitions
    ├── prompt.ts                      # system prompts (shortlist + follow-up)
    ├── agent-utils.ts                 # aggregate tool calls across steps
    ├── rate-limit.ts                  # token bucket for the agent routes
    └── showcase.ts                    # sample briefs (home pills + seed)
```
