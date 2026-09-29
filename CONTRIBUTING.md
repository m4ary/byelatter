# Contributing to Byeletter

Thanks for helping! Bug reports, ideas and pull requests are all welcome.

- **Bugs and ideas:** open an [issue](https://github.com/m4ary/byeletter/issues). For bugs, include your provider, IMAP or POP3, and what you expected to happen. Never paste passwords or real email contents.
- **Security problems:** don't open a public issue; follow [SECURITY.md](SECURITY.md).

## Run it locally

Requirements: **Node.js 22.13 or newer** (Byeletter uses the built-in `node:sqlite`).

```bash
git clone https://github.com/m4ary/byeletter
cd byeletter
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD
npm run dev
```

Open http://localhost:3000. The database is created in `./data` (ignored by git).

### A test mail server

You don't need a real mailbox to work on Byeletter. [GreenMail](https://greenmail-mail-test.github.io/greenmail/) runs IMAP, POP3 and SMTP locally:

```bash
docker run -d --name greenmail -p 3025:3025 -p 3110:3110 -p 3143:3143 \
  -e GREENMAIL_OPTS='-Dgreenmail.setup.test.all -Dgreenmail.hostname=0.0.0.0 -Dgreenmail.users=test:pw@local.test' \
  greenmail/standalone:2.1.3
```

Add a mailbox with the **Other** provider: IMAP `127.0.0.1:3143` (or POP3 `127.0.0.1:3110`), SMTP `127.0.0.1:3025`, SSL/TLS off, username `test`, password `pw`. Put messages with a `List-Unsubscribe` header in it with any IMAP client or script, then scan.

## Before you open a pull request

```bash
npm run lint
npx tsc --noEmit
npm run build
```

- Keep changes focused, and match the style of the surrounding code.
- Update `README.md` when behaviour or configuration changes, and add a line under **Unreleased** in `CHANGELOG.md`.
- This project uses a recent Next.js with breaking changes from older versions. Check the guides in `node_modules/next/dist/docs/` rather than older tutorials.

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
src/lib/safe-fetch.ts    HTTP POST that refuses private and local addresses
src/lib/session.ts       Encrypted cookie session and admin password check
src/proxy.ts             Locks every route behind the admin password
src/app/unlock           Admin login page
src/app/(app)            Dashboard, Mailboxes and Add mailbox pages
src/app/api/*            Route handlers: unlock, lock, accounts, scan, overview, unsubscribe
src/components/*         Dashboard, newsletter table, mailbox cards and forms
Dockerfile               Multi-stage production image
.github/workflows        Image build and release automation
```

## Releases (maintainers)

The version in `package.json` drives releases. When `main` has a version that hasn't been released yet, the **Docker image** workflow:

1. builds the image natively for `linux/amd64` and `linux/arm64`,
2. publishes `X.Y.Z`, `X.Y`, `X` and `latest`,
3. tags the commit `vX.Y.Z` and creates a GitHub release using that version's `CHANGELOG.md` section.

Other pushes and pull requests only check that the image builds.

To release: rename **Unreleased** in `CHANGELOG.md` to the new version with today's date, then run:

```bash
npm run bump -- patch   # or minor / major / 1.2.3
git push origin main
```
