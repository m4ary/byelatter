# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0]

### Added
- Mailbox sign-in over IMAP and POP3, with presets for Gmail, Outlook, Yahoo, iCloud, AOL, Zoho, Yandex, GMX, Mail.com, Fastmail and Proton Mail Bridge.
- Newsletter detection from `List-Unsubscribe` headers, grouped by sender.
- Unsubscribe by RFC 8058 one-click, a `mailto:` sent over SMTP, or a manual link; bulk unsubscribe.
- App-wide login page protected by `ADMIN_PASSWORD`.
- Docker image, docker-compose, and a GitHub Actions workflow that publishes to GHCR.
