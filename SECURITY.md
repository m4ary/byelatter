# Security policy

Byeletter is a free, community project provided **as is, without warranty or support obligations** (see [LICENSE](LICENSE)). You run it at your own risk and are responsible for your own installation, accounts and data.

## Reporting a vulnerability

If you find a security problem, please **don't open a public issue**. Report it privately through GitHub instead:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the problem, how to reproduce it, and the version you tested.

Reports are handled on a best-effort basis. There's no guaranteed response time and no guarantee that an issue will be fixed. If a fix is released, it goes into the latest version only, so keep your installation up to date with `docker compose pull && docker compose up -d`.

## Scope

Examples of what's in scope:

- getting past the `ADMIN_PASSWORD` login;
- reading or decrypting saved mailbox credentials without the secret;
- making the server connect to internal network addresses through unsubscribe links;
- cross-site scripting or request forgery in the web interface.

Out of scope: problems that need someone who is already signed in as admin, or who has access to the server, the database volume or the environment variables.
