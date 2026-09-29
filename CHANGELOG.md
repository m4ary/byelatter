# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Multiple mailboxes, saved in a SQLite database with AES-256-GCM encrypted credentials.
- Dashboard with totals and a newsletter list across all mailboxes, filterable by mailbox and status.
- Scan every mailbox together, or one at a time; IMAP mailboxes can scan all folders.
- Background scans with live progress; duplicates across folders are counted once by Message-ID.
- Unsubscribe history is stored on the server, with "mark done" and undo.

### Changed
- The single-mailbox login is replaced by the Mailboxes page; the Docker image now uses a `/app/data` volume.

## [0.1.0]

### Added
- Mailbox sign-in over IMAP and POP3, with presets for Gmail, Outlook, Yahoo, iCloud, AOL, Zoho, Yandex, GMX, Mail.com, Fastmail and Proton Mail Bridge.
- Newsletter detection from `List-Unsubscribe` headers, grouped by sender.
- Unsubscribe by RFC 8058 one-click, a `mailto:` sent over SMTP, or a manual link; bulk unsubscribe.
- App-wide login page protected by `ADMIN_PASSWORD`.
- Docker image, docker-compose, and a GitHub Actions workflow that publishes to GHCR.
