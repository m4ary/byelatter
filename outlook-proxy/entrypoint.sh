#!/bin/sh
# Writes the proxy config from environment variables, then starts the proxy headless.
set -eu

: "${OUTLOOK_CLIENT_ID:?Set OUTLOOK_CLIENT_ID to your Microsoft Entra app (client) ID - see the Byeletter README}"
TENANT="${OUTLOOK_TENANT:-common}"
CONFIG=/data/emailproxy.config

{
  cat <<EOF
[IMAP-1993]
server_address = outlook.office365.com
server_port = 993
local_address = 0.0.0.0

[POP-1995]
server_address = outlook.office365.com
server_port = 995
local_address = 0.0.0.0

[SMTP-1587]
server_address = smtp-mail.outlook.com
server_port = 587
server_starttls = True
local_address = 0.0.0.0

[@]
permission_url = https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/devicecode
token_url = https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token
oauth2_scope = https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/POP.AccessAsUser.All https://outlook.office.com/SMTP.Send offline_access
oauth2_flow = device
client_id = ${OUTLOOK_CLIENT_ID}
EOF
  if [ -n "${OUTLOOK_CLIENT_SECRET:-}" ]; then
    echo "client_secret = ${OUTLOOK_CLIENT_SECRET}"
  fi
  cat <<EOF

[emailproxy]
delete_account_token_on_password_error = False
allow_catch_all_accounts = True
EOF
} > "$CONFIG"

echo "Outlook OAuth proxy: IMAP :1993, POP :1995, SMTP :1587 (tenant: ${TENANT})"
echo "When a new mailbox is added, a Microsoft sign-in code appears below: open the link and enter it."

# --external-auth + device flow: the sign-in link and code are logged; no terminal input is needed.
exec python -m emailproxy --no-gui --external-auth \
  --config-file "$CONFIG" \
  --cache-store /data/tokens.config
