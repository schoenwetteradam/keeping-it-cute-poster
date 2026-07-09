# Postgres + PostgREST + Caddy setup

Goal: Vercel (and anything else) talks to `https://api.yourdomain.com/...` over HTTPS.
Nothing external ever touches Postgres directly. No exposed database port.

Before you start, you need:

- SSH access to your VM
- A domain or subdomain you control (e.g. `api.keepingitcutesalon.com`) — required for HTTPS
  via Let's Encrypt. You already need a public domain for the poster app anyway (Meta
  requires it), so this can live on the same domain.
- Postgres already installed and running on the VM

## Step 1 — Point DNS at your VM

In your domain registrar (or wherever `keepingitcutesalon.com` is managed), add an A record:

```
Type: A
Host: api
Value: <your VM's public IP>
TTL: 300
```

Wait a few minutes, then confirm it resolved:

```bash
dig +short api.yourdomain.com
```

It should print your VM's IP.

## Step 2 — Open the right firewall ports

In your AWS Security Group for this instance, allow inbound:

- Port 22 (SSH) — from your IP only, not `0.0.0.0/0`
- Port 80 (HTTP) — from anywhere (needed briefly for Let's Encrypt cert issuance)
- Port 443 (HTTPS) — from anywhere

Do not open port 5432 (Postgres) to the public internet. Ever. That's the whole point of
this setup.

## Step 3 — Create the database, roles, and schema

Copy `sql/schema.sql` from this repo to the VM, then run it as the postgres superuser:

```bash
sudo -u postgres psql -f schema.sql
```

That single file creates the `salon_app` database, the `authenticator` / `web_anon` /
`salon_app_user` roles, the `salon` schema and its tables (including `app_state`, which
stores the LinkedIn OAuth token and is deliberately unreadable by the anonymous role),
the `generated_posts_enriched` read view, the `posts_summary` / `posts_performance` /
`top_examples` / `mark_posted` / `mark_failed` RPC functions the app relies on, and all
the grants.

Before running it, change the placeholder password:

```sql
ALTER ROLE authenticator WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
```

(or edit `CREATE ROLE authenticator ... PASSWORD '...'` in the file before running it).

## Step 4 — Install PostgREST

```bash
cd /opt
sudo curl -L -o postgrest.tar.xz https://github.com/PostgREST/postgrest/releases/latest/download/postgrest-linux-static-x64.tar.xz
sudo tar -xf postgrest.tar.xz
sudo mv postgrest /usr/local/bin/
postgrest --help   # confirms it's installed
```

## Step 5 — Generate a JWT secret and configure PostgREST

This secret signs tokens that let requests act as `salon_app_user` instead of just
`web_anon`. The Next.js app holds this secret as `SALON_JWT_SECRET` and uses it to
authenticate writes (see `src/lib/db.js`).

```bash
openssl rand -base64 32
```

Copy that output — you'll need it twice (once here, once as `SALON_JWT_SECRET` in Vercel's
env vars later).

Create the config file:

```bash
sudo nano /etc/postgrest.conf
```

```ini
db-uri = "postgres://authenticator:CHANGE_ME_STRONG_PASSWORD@localhost:5432/salon_app"
db-schemas = "salon"
db-anon-role = "web_anon"
jwt-secret = "PASTE_YOUR_OPENSSL_SECRET_HERE"
server-port = 3000
server-host = "127.0.0.1"
```

`server-host = 127.0.0.1` is important — PostgREST only listens locally. The reverse proxy
(next step) is the only thing that talks to it, and the reverse proxy is the only thing
exposed to the internet.

## Step 6 — Run PostgREST as a systemd service

```bash
sudo nano /etc/systemd/system/postgrest.service
```

```ini
[Unit]
Description=PostgREST API server
After=postgresql.service network.target

[Service]
ExecStart=/usr/local/bin/postgrest /etc/postgrest.conf
Restart=always
RestartSec=5
User=postgres

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable postgrest
sudo systemctl start postgrest
sudo systemctl status postgrest
```

Confirm it's alive locally:

```bash
curl http://127.0.0.1:3000/generated_posts
```

Should return `[]` (empty array — table exists but is empty). If you see a connection
error, check the `db-uri` password and that Postgres is running.

## Step 7 — Put Caddy in front for automatic HTTPS

```bash
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Configure it:

```bash
sudo nano /etc/caddy/Caddyfile
```

```
api.yourdomain.com {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl restart caddy
```

Within about 30 seconds Caddy fetches a real HTTPS certificate. Test it:

```bash
curl https://api.yourdomain.com/generated_posts
```

You should get `[]` again, this time over HTTPS, from the public internet.

## Step 8 — Lock down access with a shared API key

Add a shared-secret header check in Caddy so only your app can call the API at all.
The two `handle` blocks are required — a bare `respond 401` fallback next to
`reverse_proxy @authorized` does NOT work, because Caddy sorts `respond` before
`reverse_proxy` internally and would return 401 for every request, valid key or not
(verified against a live Caddy):

```
api.yourdomain.com {
    @authorized header X-API-Key "YOUR_LONG_RANDOM_SECRET_HERE"

    handle @authorized {
        reverse_proxy 127.0.0.1:3000
    }
    handle {
        respond 401
    }
}
```

```bash
sudo systemctl restart caddy
```

Now every request needs the header:

```bash
curl -H "X-API-Key: YOUR_LONG_RANDOM_SECRET_HERE" https://api.yourdomain.com/generated_posts
```

Requests without it get a 401. This is `SALON_API_KEY` in the app's environment variables —
never in client-side code, only read server-side (`src/lib/db.js` sends it on every request).

## Step 9 — Set up Cloudflare R2 for media

Uploaded photos/videos go to R2 instead of local disk (`src/lib/storage.js`):

1. In the Cloudflare dashboard, create an R2 bucket (e.g. `salon-media`).
2. Enable public access on the bucket (or attach a custom domain) and note the public base
   URL — this is `R2_PUBLIC_URL`.
3. Create an R2 API token with read/write access to that bucket — this gives you
   `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`.
4. Your Cloudflare account ID is `R2_ACCOUNT_ID`; the bucket name is `R2_BUCKET`.

## Step 10 — Automate scheduled publishing

The app publishes scheduled posts when something calls `/api/schedule/process`, and
refreshes Facebook engagement numbers via `/api/posts/sync-all`. Both accept
`Authorization: Bearer $CRON_SECRET` (set `CRON_SECRET` in the app's env vars).

**Option A — Vercel Cron (Pro plan).** `vercel.json` in the repo already declares the two
cron jobs (every 15 minutes / daily). Set `CRON_SECRET` in Vercel's environment variables
and Vercel sends it automatically. Note: the Hobby plan limits crons to once per day,
which is too slow for scheduled posts — use option B there.

**Option B — systemd timer on this VM (works on any plan).** The VM is already always-on;
let it ping the app:

```bash
sudo tee /etc/systemd/system/salon-schedule.service > /dev/null <<'EOF'
[Unit]
Description=Publish due salon posts

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/schedule/process
EOF

sudo tee /etc/systemd/system/salon-schedule.timer > /dev/null <<'EOF'
[Unit]
Description=Run salon schedule processing every 10 minutes

[Timer]
OnCalendar=*:0/10
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now salon-schedule.timer
systemctl list-timers salon-schedule.timer
```

Duplicate the pair with a daily `OnCalendar=06:00` for `/api/posts/sync-all` if you want
engagement numbers refreshed automatically too.

## What you'll have at this point

- Postgres reachable only from localhost on the VM — never exposed
- PostgREST auto-generating a REST API from the `salon` schema (`GET/POST/PATCH/DELETE
  /generated_posts`, `/media`, `/brand_settings`, `/post_templates`, plus the
  `/rpc/*` aggregate and write-helper functions)
- HTTPS handled automatically by Caddy, cert auto-renews forever
- A shared API key gating all access
- A systemd service that restarts itself if it crashes or the VM reboots
- Media uploads served from Cloudflare R2 instead of local disk
- LinkedIn's OAuth token stored in Postgres (`salon.app_state`), so it survives
  serverless deploys and is invisible to the anonymous role
- Scheduled posts publishing themselves and engagement stats refreshing on a timer
- A public `/api/health` endpoint reporting whether the app can reach the database

Set `SALON_API_URL`, `SALON_API_KEY`, `SALON_JWT_SECRET`, and the `R2_*` variables in
Vercel's environment variables to match. See `.env.example` for the full list.
