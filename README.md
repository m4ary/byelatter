<p align="center">
  <img src="public/logo.svg" alt="Byeletter logo" width="120" height="120">
</p>

<h1 align="center">Byeletter</h1>

A self-hosted dashboard that connects to all your mailboxes over **IMAP** or **POP3**, finds every newsletter you receive, and unsubscribes you in one click.

## Features

- **Multiple mailboxes.** Add as many IMAP or POP3 accounts as you like. Built-in presets cover Gmail, Outlook/Hotmail, Yahoo, iCloud, AOL, Zoho, Yandex, GMX, Mail.com, Fastmail and Proton Mail Bridge, or you can enter your own server settings. The provider is picked automatically from the email domain.
- **Dashboard.** Totals for mailboxes, newsletters, newsletter emails and unsubscribes, plus a single newsletter list across every mailbox that you can filter by mailbox, status or search text.
- **Scan everything together, or one mailbox deeply.** Scan all mailboxes at once, or scan a single one. Pick **Inbox** or **All folders** (IMAP) and how many of the newest messages to read per folder (100–5,000). Scans run in the background with live progress, three mailboxes at a time.
- **All-folder scans** skip Sent and Drafts. When the server has an "All Mail" folder (Gmail), it reads that plus Spam and Trash instead of every label. Messages that appear in several folders are counted once, by `Message-ID`.
- A newsletter is any message with a `List-Unsubscribe` header. Messages are grouped per mailbox by sender, with a count, the latest subject and date, the folders it was found in, and which unsubscribe methods are available. Only headers are fetched, so scans stay fast.
- Unsubscribing tries the most automatic method first:
  1. **One-click** (RFC 8058): a `POST List-Unsubscribe=One-Click` request to the sender's https endpoint.
  2. **Email**: a `mailto:` unsubscribe sent through your own SMTP server (preset providers include SMTP settings).
  3. **Manual**: an "Open link" / "Send email" button when the sender needs a confirmation step.
- Bulk-select senders and unsubscribe from all of them. Unsubscribe results are saved, so you can come back later, mark manual ones as done, or undo.

## Admin password

The whole app sits behind its own login page (`/unlock`). Every page and API route redirects there, or returns `401`, until someone enters the `ADMIN_PASSWORD`. If that variable isn't set, nobody can unlock the app. Use **Lock app** to sign out.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `ADMIN_PASSWORD` | yes | Password for the app's login page |
| `SESSION_SECRET` | recommended | 32+ random characters (`openssl rand -hex 32`) that encrypt the session cookie **and the saved mailbox passwords**. If unset, the key is derived from `ADMIN_PASSWORD`. Keep it stable: if it changes, saved mailboxes can't be decrypted and must be re-added |
| `COOKIE_SECURE` | no | `true` makes the cookie HTTPS-only. Defaults to `true` in production; set `false` when you open the app over plain `http://` from another machine |
| `DATA_DIR` | no | Where the SQLite database lives. Defaults to `./data`; the Docker image uses `/app/data` |

## Run with Docker

Images are published to the GitHub Container Registry at **`ghcr.io/m4ary/byeletter`**.

```bash
cp .env.example .env         # set ADMIN_PASSWORD (and SESSION_SECRET)
docker compose up -d         # pulls ghcr.io/m4ary/byeletter:latest
```

Open http://localhost:3000.

To pin a version, set `BYELETTER_VERSION=0.2.0` in `.env` (or `0.2` for the latest patch, or `edge` for the latest `main` build). To upgrade, run `docker compose pull && docker compose up -d`.

To build from source instead of pulling:

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

Or run it without Compose:

```bash
docker run -d -p 3000:3000 -v byeletter-data:/app/data -e ADMIN_PASSWORD=change-me -e SESSION_SECRET=$(openssl rand -hex 32) -e COOKIE_SECURE=false ghcr.io/m4ary/byeletter:latest
```

Your mailboxes and scan results live in the `/app/data` volume (`byeletter-data` in Compose). Back it up together with your `SESSION_SECRET`.

The image uses Next.js `standalone` output on `node:22-alpine` and runs as a non-root user. Behind an HTTPS reverse proxy, set `COOKIE_SECURE=true`.

Inside a container, `127.0.0.1` means the container itself. To use Proton Mail Bridge running on the host, pick the **Other** provider and enter `host.docker.internal` (or run the container with `--network host`).

## Local development

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD
npm run dev
```

Open http://localhost:3000.

### App passwords

Most big providers block your normal password for IMAP/POP. Create an **app password** and use that instead. The login form links to each provider's instructions:

| Provider | Notes |
| --- | --- |
| Gmail | Turn on 2-Step Verification, create an App Password, and enable IMAP/POP in Gmail settings |
| Yahoo / AOL | Account Security → Generate app password |
| iCloud | IMAP only; create an app-specific password at appleid.apple.com |
| Outlook / Microsoft 365 | Microsoft is removing password (basic) auth, so this only works where your account still allows it |
| Proton Mail | Run Proton Mail Bridge on the same machine and use the password Bridge generates |

## Security notes

- Mailbox credentials are checked with a real login, then stored in the SQLite database encrypted with AES-256-GCM. The key is derived from `SESSION_SECRET`, or from `ADMIN_PASSWORD` when that isn't set. They're never sent back to the browser.
- The admin session is an encrypted, `httpOnly`, `SameSite=Strict` cookie ([iron-session](https://github.com/vvo/iron-session)) that expires after 8 hours.
- Unsubscribe links are read from the saved scan results on the server, never taken from the browser.
- Unsubscribe URLs come from untrusted email headers. The one-click `POST` checks every address the host resolves to, blocks private, loopback and link-local ranges, and doesn't follow redirects.
- Only people who know `ADMIN_PASSWORD` can use the app. Wrong guesses are rate-limited to 10 per IP every 15 minutes. Once unlocked, the app can open IMAP/POP connections to any host, so use a strong password and put the app behind HTTPS if you expose it.

## Project layout

```
src/lib/providers.ts     Preset IMAP/POP3/SMTP settings for known providers
src/lib/mail.ts          IMAP (imapflow) and POP3 (node-pop3) login, folder selection and scanning
src/lib/scanner.ts       Background scan queue with live progress
src/lib/newsletters.ts   Header parsing (List-Unsubscribe, List-Id, …), Message-ID dedupe, grouping by sender
src/lib/db.ts            SQLite (node:sqlite) connection and schema
src/lib/store.ts         Mailboxes, scan results and unsubscribe history
src/lib/crypto.ts        AES-256-GCM encryption for saved credentials
src/lib/unsubscribe.ts   One-click POST, mailto via SMTP (nodemailer), manual fallback
src/lib/safe-fetch.ts    SSRF-guarded HTTP POST
src/lib/session.ts       Encrypted cookie session and admin password check
src/proxy.ts             Locks every route behind the admin password
src/app/unlock           Admin login page
src/app/(app)            Dashboard, Mailboxes and Add mailbox pages
src/app/api/*            Route handlers: unlock, lock, accounts, scan, overview, unsubscribe
src/components/*         Dashboard, newsletter table, mailbox cards and forms (client components)
Dockerfile               Multi-stage production image
.github/workflows        Docker image publishing and release automation
```
