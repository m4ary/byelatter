# Email OAuth 2.0 Proxy (https://github.com/simonrob/email-oauth2-proxy) for Outlook / Microsoft 365.
# Byeletter logs in to it with a normal IMAP/POP/SMTP password; the proxy signs in to Microsoft with OAuth.
FROM python:3.12-alpine

ARG EMAILPROXY_VERSION=2026.7.3
RUN pip install --no-cache-dir "emailproxy==${EMAILPROXY_VERSION}" \
 && adduser -S -u 1001 proxy \
 && mkdir -p /data && chown proxy /data

COPY --chmod=755 entrypoint.sh /entrypoint.sh

USER proxy
# Generated config and cached (encrypted) OAuth tokens.
VOLUME ["/data"]
EXPOSE 1993 1995 1587

ENTRYPOINT ["/entrypoint.sh"]
