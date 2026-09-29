# Soundtrack Agent

An LLM agent that turns a user's video brief ("30-second product teaser, upbeat, voiceover so no lead vocals") into a shortlist of songs from the Epidemic Sound catalogue, with why each one fits and where to cut it.

## For the interview

We'll spend about 40 minutes talking through this repo together. Please spend no more than an hour with it beforehand, and use whatever tools you normally would, AI assistants included. You don't need to write any code.

Come ready to:

- walk us through how a user's video brief turns into a shortlist of songs,
- tell us what you'd change before this went to production with real users, and why,
- talk about how you'd extend it.

It's a prototype written quickly, so there's plenty to disagree with. We care more about how you reason about trade-offs than about a complete list.

## Running it

Running it is optional; reading the code is enough. If you want to, you need Docker, pnpm and an Anthropic API key:

```bash
cp .env.example .env      # fill in ANTHROPIC_API_KEY
docker compose up -d      # Postgres + mock Epidemic Sound API + the app
pnpm install
pnpm db:push              # create the tables
```

Then open [http://localhost:3000](http://localhost:3000).

You don't need Epidemic Sound credentials. `mock-es-api/` stands in for the [Partner Content API](https://partner-content-api.epidemicsound.com/docs/spec.json) with a small fictional catalogue, so the songs and artists aren't real. To see the usage reports the app has sent to it:

```bash
curl -H "Authorization: Bearer epidemic_mock_local-key" localhost:4010/_mock/usage
```

`pnpm test` runs the unit tests.

## How it fits together

The agent is a tool-calling loop (`streamText` in `src/app/api/shortlist/route.ts`) with six tools in `src/lib/tools.ts`. It links songs as `[Title](track:ID)`, which the UI renders as preview players. On the shortlist page the user can ask follow-up questions and mark a song as used, which reports the usage to Epidemic Sound.

| Function (`src/lib/es/endpoints.ts`) | Endpoint | Cached |
|---|---|---|
| `listMoods()` | `GET /v0/moods` | yes |
| `listGenres()` | `GET /v0/genres` | yes |
| `searchTracks(params)` | `GET /v0/tracks/search` | yes |
| `getPage(url)` | follows `links.next` from a list response | yes |
| `getSimilarTracks(trackId)` | `GET /v0/tracks/{id}/similar` | yes |
| `getHighlights(trackId, duration)` | `GET /v0/tracks/{id}/highlights` | yes |
| `getStreamUrl(trackId)` | `GET /v0/tracks/{id}/stream` | no |
| `reportUsage({ trackIds, platform })` | `POST /v0/usage` | no |

Postgres holds four tables (`src/lib/db/schema.ts`): the response cache, shortlists, follow-up questions, and track selections.

**Stack:** Next.js 16, TypeScript, Vercel AI SDK v6 with Claude, Drizzle ORM, Postgres 17.
