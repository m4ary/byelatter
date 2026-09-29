#!/bin/sh
# Bump the app version and commit it. Pushing that commit to main publishes the release
# (Docker images X.Y.Z / X.Y / X / latest, the vX.Y.Z tag and a GitHub release).
# Usage: npm run bump -- [patch|minor|major|X.Y.Z]
set -eu
npm version "${1:-patch}" --no-git-tag-version >/dev/null
VERSION="$(node -p "require('./package.json').version")"
git commit -m "chore(release): v$VERSION" package.json package-lock.json
echo "Bumped to v$VERSION. Push to main to publish it."
