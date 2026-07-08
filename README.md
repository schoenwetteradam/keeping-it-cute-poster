# Keeping It Cute Poster

A salon-specific social content assistant built with Next.js and Anthropic. Data lives in
Postgres behind a PostgREST API (on a VM you control), and uploaded media lives in Cloudflare
R2. Nothing external ever talks to Postgres directly.

## Features

- Three editable draft directions per platform: balanced, personal, and bold
- Persistent Salon Brand Brain for voice, services, booking details, and guardrails
- Image-aware generation and shared media library
- Direct Facebook, Instagram, and LinkedIn text publishing
- Team ratings and engagement-based prompt learning
- Performance summaries by platform, goal, and draft style

## Architecture

```
Vercel (Next.js app)  --https+X-API-Key-->  Caddy  -->  PostgREST (127.0.0.1 only)  -->  Postgres
                       --S3 API-->  Cloudflare R2 (uploaded media)
```

- **Postgres** runs on a VM and only ever listens on `localhost` — it is never exposed to the
  internet. See `sql/schema.sql` for the full schema, roles, and grants.
- **PostgREST** turns the `salon` schema into a REST API, also bound to `127.0.0.1` only.
- **Caddy** is the only thing exposed on the VM (ports 80/443). It terminates HTTPS via Let's
  Encrypt, reverse-proxies to PostgREST, and rejects any request missing the shared
  `X-API-Key` header.
- **Cloudflare R2** stores uploaded photos/videos; the app talks to it directly via the
  S3-compatible API (`src/lib/storage.js`).

See `docs/postgres-api-setup.md` for the step-by-step VM setup (DNS, firewall, systemd,
Caddy).

## Local / Server Setup

```bash
cp .env.example .env.local
npm ci
npm run build
npm start
```

Fill in `.env.local` with:

- `SALON_API_URL`, `SALON_API_KEY`, `SALON_JWT_SECRET` — from the PostgREST/Caddy setup
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` — from your Cloudflare R2 bucket
- `ADMIN_USER`, `ADMIN_PASSWORD` — basic auth for the app itself

Keep `.env.local` and `.linkedin-token.json` out of Git — they're already in `.gitignore`.

## Public URL Requirement

Facebook and Instagram must be able to download attached images from the app, and Meta
requires a public domain for the app itself. Set these to your public origin:

```env
NEXT_PUBLIC_APP_URL=https://social.example.com
LINKEDIN_REDIRECT_URI=https://social.example.com/api/linkedin/callback
```

Register the same LinkedIn redirect URI in the LinkedIn developer application.

## Deploying

Push to your Git remote and deploy on Vercel (or `npm run build && npm start` on any Node
host). Set all the environment variables above in the hosting provider's dashboard — never
commit them.
