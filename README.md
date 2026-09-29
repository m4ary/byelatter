<p align="center">
  <img src="public/logo.svg" alt="Byeletter logo" width="120" height="120">
</p>

<h1 align="center">Byeletter</h1>

<p align="center">
  Find every newsletter in all your mailboxes and unsubscribe in one click.<br>
  Self-hosted, works with any IMAP or POP3 account, and your mail never leaves your server.
</p>

<p align="center">
  <a href="https://github.com/m4ary/byeletter/releases"><img src="https://img.shields.io/github/v/release/m4ary/byeletter" alt="Latest release"></a>
  <a href="https://github.com/m4ary/byeletter/pkgs/container/byeletter"><img src="https://img.shields.io/badge/docker-ghcr.io%2Fm4ary%2Fbyeletter-blue?logo=docker&logoColor=white" alt="Docker image"></a>
  <a href="https://github.com/m4ary/byeletter/actions/workflows/docker-publish.yml"><img src="https://img.shields.io/github/actions/workflow/status/m4ary/byeletter/docker-publish.yml?branch=main" alt="Build status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license"></a>
</p>

<p align="center">
  <img src="docs/screenshot.png" alt="Byeletter dashboard listing newsletters from two mailboxes" width="900">
</p>

## Features

- **All your mailboxes in one place.** Add as many IMAP or POP3 accounts as you like. Presets cover Gmail, Outlook/Hotmail, Yahoo, iCloud, AOL, Zoho, Yandex, GMX, Mail.com, Fastmail and Proton Mail Bridge, and any other server works with custom settings.
- **One dashboard.** See totals and a single newsletter list across every mailbox. Filter it by mailbox, status or search text.
- **Scan everything, or one mailbox deeply.** Scan all mailboxes together or one at a time, the inbox or every folder, reading the newest 100–5,000 messages per folder. Scans run in the background with live progress.
- **Smart detection.** Any message with a `List-Unsubscribe` header counts as a newsletter. Messages are grouped by sender, and a message found in several folders (Gmail labels, for example) is counted once. Only headers are downloaded, so scans are fast.
- **One-click unsubscribe.** Byeletter tries the most automatic method first:
  1. **One-click** ([RFC 8058](https://www.rfc-editor.org/rfc/rfc8058)): a request to the sender's unsubscribe endpoint.
  2. **Email**: an unsubscribe email sent from your own account.
  3. **Manual**: a link to finish on the sender's site, then **Mark done**.
- **Bulk actions and history.** Select many senders and unsubscribe from them together. Results are saved, so you can come back later or undo.
- **Private by design.** A password protects the whole app. Mailbox passwords are stored encrypted, and there's no telemetry and no third-party service.

## Quick start

You need [Docker](https://docs.docker.com/get-docker/) with Compose.

```bash
curl -O https://raw.githubusercontent.com/m4ary/byeletter/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/m4ary/byeletter/main/.env.example
# edit .env: set ADMIN_PASSWORD, and SESSION_SECRET (openssl rand -hex 32)
docker compose up -d
```

Open http://localhost:3000.

1. **Unlock** the app with your `ADMIN_PASSWORD`.
2. **Add a mailbox:** enter your email address and the provider is picked for you. Most providers need an [app password](#app-passwords). Byeletter checks the login, saves it encrypted and scans your inbox straight away.
3. **Scan:** use **Scan all mailboxes** on the dashboard, or scan one mailbox from the **Mailboxes** page. Choose **All folders** to include folders like Promotions or Spam.
4. **Unsubscribe:** click **Unsubscribe** on a sender, or select several and use **Unsubscribe selected**.

## App passwords

Most big providers don't accept your normal password for IMAP or POP. Create an **app password** and use it instead. The add-mailbox form links to instructions where the provider has them.

| Provider | How |
| --- | --- |
| Gmail | Turn on 2-Step Verification, create an [App Password](https://myaccount.google.com/apppasswords), and enable IMAP in Gmail settings |
| Yahoo / AOL | Account Security → Generate app password |
| iCloud | IMAP only. Create an app-specific password at [appleid.apple.com](https://appleid.apple.com) |
| Outlook / Microsoft 365 | Microsoft is removing password logins, so this only works where your account still allows them |
| Proton Mail | Run [Proton Mail Bridge](https://proton.me/mail/bridge) and use the password it generates (see [Docker notes](#docker-notes)) |

Email unsubscribes are sent through your provider's SMTP server. For custom servers you can add SMTP settings; without them, Byeletter opens the unsubscribe email in your own mail app instead.

## Configuration

Set these in `.env` (Compose) or as container environment variables.

| Variable | Required | Description |
| --- | --- | --- |
| `ADMIN_PASSWORD` | yes | Password for the app's login page. If it's not set, nobody can unlock the app |
| `SESSION_SECRET` | recommended | 32+ random characters (`openssl rand -hex 32`). Encrypts the login cookie **and the saved mailbox passwords**. If unset, a key is derived from `ADMIN_PASSWORD`. Keep it stable: if it changes, saved mailboxes must be added again |
| `COOKIE_SECURE` | no | `true` makes the login cookie HTTPS-only. Compose sets `false` so plain `http://` works on your network; set `true` behind HTTPS |
| `PORT` | no | Host port in Compose (default `3000`) |
| `BYELETTER_VERSION` | no | Image version in Compose (default `latest`) |
| `DATA_DIR` | no | Where the SQLite database is stored. Defaults to `./data`; the Docker image uses `/app/data` |

## Updating and backups

```bash
docker compose pull && docker compose up -d
```

To stay on a specific release, set `BYELETTER_VERSION` in `.env`: an exact version like `1.2.0`, `1.2` for its latest patch, or `1` for the latest 1.x. The [releases page](https://github.com/m4ary/byeletter/releases) and [CHANGELOG.md](CHANGELOG.md) list what changed.

Your mailboxes and scan results live in the `byeletter-data` volume (`/app/data` in the container). Back it up together with your `SESSION_SECRET`, since you need both to read the saved mailboxes.

## Docker notes

- Images are published at `ghcr.io/m4ary/byeletter` for `linux/amd64` and `linux/arm64`. They run as a non-root user.
- **Without Compose:**
  ```bash
  docker run -d -p 3000:3000 -v byeletter-data:/app/data \
    -e ADMIN_PASSWORD=change-me -e SESSION_SECRET=$(openssl rand -hex 32) -e COOKIE_SECURE=false \
    ghcr.io/m4ary/byeletter:latest
  ```
- **Build from source** instead of pulling: `docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build`
- **Proton Mail Bridge on the same machine:** inside a container, `127.0.0.1` is the container itself. Pick the **Other** provider and use `host.docker.internal` as the server; Compose already maps it to your host.
- **Behind a reverse proxy with HTTPS:** set `COOKIE_SECURE=true`.

## Privacy and security

- **Your data stays with you.** Byeletter only talks to your mail servers and, when you unsubscribe, to the sender's unsubscribe link or address. There's no telemetry, account or cloud service.
- **Mailbox passwords** are checked with a real login, then stored in the local database encrypted with AES-256-GCM. They're never sent back to the browser.
- **The whole app** is behind `ADMIN_PASSWORD`, with an encrypted, `httpOnly`, `SameSite=Strict` session cookie that expires after 8 hours. Wrong guesses are limited to 10 per IP every 15 minutes.
- **Unsubscribe links come from untrusted emails**, so one-click requests refuse private and local network addresses and don't follow redirects. Links are always read from the saved scan, never from the browser.
- Once unlocked, the app can connect to any mail server you enter. Use a strong `ADMIN_PASSWORD`, and put the app behind HTTPS if you expose it to the internet.

Found a vulnerability? Please report it privately (best effort, no guarantees); see [SECURITY.md](SECURITY.md).

## Contributing

Bug reports, ideas and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) explains how to run Byeletter locally (Node.js 22.13 or newer), the project layout, and how releases work.

## Disclaimer

Byeletter is provided **as is, without warranty of any kind**, and the authors accept no liability for how it's used (see [LICENSE](LICENSE)). You use it at your own risk and are responsible for your installation, the mailboxes you connect, the credentials you store, and following your email providers' terms. There's no guaranteed support or security maintenance.

Byeletter isn't affiliated with or endorsed by any email provider. Provider names are used only to describe compatibility.

## License

[MIT](LICENSE). Free to use, change and share, with no warranty.
