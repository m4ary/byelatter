<p align="center">
  <img src="public/logo.svg" alt="Byelatter logo" width="120" height="120">
</p>

<h1 align="center">Byelatter</h1>

A small Next.js app that signs in to your mailbox over **IMAP** or **POP3**, finds every newsletter you receive, and unsubscribes you in one click.

## Features

- Sign in with IMAP or POP3, using built-in presets for Gmail, Outlook/Hotmail, Yahoo, iCloud, AOL, Zoho, Yandex, GMX, Mail.com, Fastmail and Proton Mail Bridge, or your own server settings.
- The provider is picked automatically from your email domain.
- Scans the newest 100–2000 messages. Only headers are fetched, so scans stay fast. On IMAP you can choose any folder.
- A newsletter is any message with a `List-Unsubscribe` header. Messages are grouped by sender and show a count, the latest subject and date, and which unsubscribe methods are available.
- Unsubscribing tries the most automatic method first:
  1. **One-click** (RFC 8058): a `POST List-Unsubscribe=One-Click` request to the sender's https endpoint.
  2. **Email**: a `mailto:` unsubscribe sent through your own SMTP server (preset providers include SMTP settings).
  3. **Manual**: an "Open link" / "Send email" button when the sender needs a confirmation step.
- Bulk-select senders and unsubscribe from all of them. Senders you've unsubscribed from are remembered in your browser.

## Admin password

The whole app sits behind its own login page (`/unlock`). Every page and API route redirects there, or returns `401`, until someone enters the `ADMIN_PASSWORD`. If that variable isn't set, nobody can unlock the app. Use **Lock app** to sign out of the app, or **Sign out** to disconnect only the mailbox.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `ADMIN_PASSWORD` | yes | Password for the app's login page |
| `SESSION_SECRET` | recommended | 32+ random characters used to encrypt the session cookie (`openssl rand -hex 32`). If unset, the key is derived from `ADMIN_PASSWORD` |
| `COOKIE_SECURE` | no | `true` makes the cookie HTTPS-only. Defaults to `true` in production; set `false` when you open the app over plain `http://` from another machine |

## Run with Docker

Images are published to the GitHub Container Registry at **`ghcr.io/m4ary/byelatter`**.

```bash
cp .env.example .env         # set ADMIN_PASSWORD (and SESSION_SECRET)
docker compose up -d         # pulls ghcr.io/m4ary/byelatter:latest
```

Open http://localhost:3000.

To pin a version, set `BYELATTER_VERSION=0.2.0` in `.env` (or `0.2` for the latest patch, or `edge` for the latest `main` build). To upgrade, run `docker compose pull && docker compose up -d`.

To build from source instead of pulling:

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

Or run it without Compose:

```bash
docker run -d -p 3000:3000 -e ADMIN_PASSWORD=change-me -e SESSION_SECRET=$(openssl rand -hex 32) -e COOKIE_SECURE=false ghcr.io/m4ary/byelatter:latest
```

The image uses Next.js `standalone` output on `node:22-alpine` and runs as a non-root user. Behind an HTTPS reverse proxy, set `COOKIE_SECURE=true`.

Inside a container, `127.0.0.1` means the container itself. To use Proton Mail Bridge running on the host, pick the **Other** provider and enter `host.docker.internal` (or run the container with `--network host`).

## Local development

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD
npm run dev
```

Open http://localhost:3000.

## Versioning and releases

Byelatter follows [Semantic Versioning](https://semver.org). The `version` in `package.json` is the single source of truth. It appears in the app footer and must match the git tag `vX.Y.Z` of every release.

To cut a release, do one of these:

- **From GitHub:** go to **Actions → Release → Run workflow** and pick `patch`, `minor` or `major`. The workflow bumps `package.json`, commits and tags on `main`, publishes the image, and creates a GitHub release with generated notes.
- **Locally:** run `npm run release:patch` (or `release:minor` / `release:major`). This runs `npm version`, then pushes the commit and tag, which triggers the publish workflow.

The **Docker image** workflow (`.github/workflows/docker-publish.yml`) builds `linux/amd64` and `linux/arm64` and pushes these tags:

| Trigger | Tags |
| --- | --- |
| Release `v1.4.2` | `1.4.2`, `1.4`, `1`, `latest` (`1` is skipped for `0.x` versions) |
| Push to `main` | `edge`, `sha-<short>` |
| Pull request | built only, not pushed |

The workflow fails if a tag doesn't match `package.json`. Record notable changes in [CHANGELOG.md](CHANGELOG.md).

A package published to GHCR for the first time is private. To let `docker compose` pull it without logging in, open the package on GitHub and set **Package settings → Change visibility → Public**. If `main` is branch-protected, allow GitHub Actions to push to it, or use the local release scripts.

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

- Your credentials are sent once to the app's own API. After the login is verified, they are kept **only** in an encrypted, `httpOnly`, `SameSite=Strict` cookie ([iron-session](https://github.com/vvo/iron-session)) that expires after 8 hours. Nothing is written to disk or a database.
- Unsubscribe URLs come from untrusted email headers. The one-click `POST` checks every address the host resolves to, blocks private, loopback and link-local ranges, and doesn't follow redirects.
- Only people who know `ADMIN_PASSWORD` can use the app. Wrong guesses are rate-limited to 10 per IP every 15 minutes. Once unlocked, the app can open IMAP/POP connections to any host, so use a strong password and put the app behind HTTPS if you expose it.

## Project layout

```
src/lib/providers.ts     Preset IMAP/POP3/SMTP settings for known providers
src/lib/mail.ts          IMAP (imapflow) and POP3 (node-pop3) login and scanning
src/lib/newsletters.ts   Header parsing (List-Unsubscribe, List-Id, …) and grouping by sender
src/lib/unsubscribe.ts   One-click POST, mailto via SMTP (nodemailer), manual fallback
src/lib/safe-fetch.ts    SSRF-guarded HTTP POST
src/lib/session.ts       Encrypted cookie session and admin password check
src/proxy.ts             Locks every route behind the admin password
src/app/unlock           Admin login page
src/app/api/*            Route handlers: unlock, lock, login, logout, session, mailboxes, newsletters, unsubscribe
src/components/*         Unlock form, mailbox login form, newsletter list (client components)
Dockerfile               Multi-stage production image
.github/workflows        Docker image publishing and release automation
```
