# Keeping It Cute Poster

A salon-specific social content assistant built with Next.js, Anthropic, and SQLite.

## Features

- Three editable draft directions per platform: balanced, personal, and bold
- Persistent Salon Brand Brain for voice, services, booking details, and guardrails
- Image-aware generation and shared media library
- Direct Facebook, Instagram, and LinkedIn text publishing
- Team ratings and engagement-based prompt learning
- Performance summaries by platform, goal, and draft style

## Raspberry Pi Setup

Use a current LTS release of Node.js. From the project directory:

```bash
cp .env.example .env.local
npm ci
npm run build
npm start
```

Keep `data/`, `uploads/`, `.env.local`, and `.linkedin-token.json` on persistent storage. They are intentionally excluded from Git.

## Public URL Requirement

Facebook and Instagram must be able to download attached images from the app. Set up HTTPS with a public domain or tunnel that routes to the Raspberry Pi. A LAN address such as `192.168.x.x` is not reachable by Meta.

Set these values to the public origin:

```env
NEXT_PUBLIC_APP_URL=https://social.example.com
LINKEDIN_REDIRECT_URI=https://social.example.com/api/linkedin/callback
```

Register the same LinkedIn redirect URI in the LinkedIn developer application.

## Updating The Pi

```bash
git pull
npm ci
npm run build
```

Then restart the existing process manager or service used on the Pi.
