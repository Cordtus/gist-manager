#!/usr/bin/env bash

set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/opt/gist-manager}"
BUN="${BUN:-/opt/bun/bin/bun}"
SYSTEMCTL="${SYSTEMCTL:-systemctl}"
SERVICE_NAME="${SERVICE_NAME:-gist-manager.service}"
MODE="${1:-update}"

LIVE_BUILD="$REPO_DIR/server/build"
NEXT_BUILD="$REPO_DIR/server/build.next"
PREVIOUS_BUILD="$REPO_DIR/server/build.previous"

old_head=''
transaction_started=0
restart_attempted=0
rollback_in_progress=0
app_was_active=0
had_live_build=0

cleanup() {
	rm -rf -- "$NEXT_BUILD"
}
trap cleanup EXIT

usage() {
	echo "Usage: $0 [--check]" >&2
}

if [[ "$MODE" != 'update' && "$MODE" != '--check' ]]; then
	usage
	exit 2
fi

cd "$REPO_DIR"

if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
	echo "Refusing to update a dirty production checkout: $REPO_DIR" >&2
	exit 1
fi

if [[ "$(git symbolic-ref --quiet --short HEAD || true)" != 'main' ]]; then
	echo 'Refusing to update: production checkout is not on main' >&2
	exit 1
fi

if [[ "$MODE" == '--check' ]]; then
	current_head="$(git rev-parse HEAD)"
	remote_head="$(git ls-remote --exit-code origin refs/heads/main | awk 'NR == 1 { print $1 }')"
	if [[ -z "$remote_head" ]]; then
		echo 'Unable to resolve origin/main' >&2
		exit 1
	fi
	printf 'current_head=%s\n' "$current_head"
	printf 'remote_head=%s\n' "$remote_head"
	if [[ "$current_head" == "$remote_head" ]]; then
		echo 'update_available=false'
	else
		echo 'update_available=true'
	fi
	exit 0
fi

rollback() {
	local original_exit="$1"
	local failures=()
	rollback_in_progress=1
	trap - ERR
	set +e

	echo "Update failed with status $original_exit; restoring the previous release" >&2
	rm -rf -- "$NEXT_BUILD"
	if [[ -d "$PREVIOUS_BUILD" ]]; then
		rm -rf -- "$LIVE_BUILD"
		if ! mv -- "$PREVIOUS_BUILD" "$LIVE_BUILD"; then
			failures+=('restore-build')
		fi
	elif [[ "$had_live_build" == 0 ]]; then
		rm -rf -- "$LIVE_BUILD"
	fi

	if [[ -n "$old_head" ]]; then
		if ! git reset --hard "$old_head" >/dev/null; then
			failures+=('restore-revision')
		fi
		if ! "$BUN" install --frozen-lockfile; then
			failures+=('restore-dependencies')
		fi
	fi

	if [[ "$restart_attempted" == 1 ]]; then
		if ! "$SYSTEMCTL" restart "$SERVICE_NAME"; then
			failures+=('restart-previous-service')
		elif ! "$SYSTEMCTL" is-active --quiet "$SERVICE_NAME"; then
			failures+=('verify-previous-service')
		fi
	fi

	if (( ${#failures[@]} > 0 )); then
		echo "ROLLBACK INCOMPLETE failed_steps=$(IFS=,; echo "${failures[*]}")" >&2
		exit 70
	fi

	echo "Restored revision $old_head and the previous production build" >&2
	exit "$original_exit"
}

on_error() {
	local exit_code="$1"
	if [[ "$transaction_started" == 1 && "$rollback_in_progress" == 0 ]]; then
		rollback "$exit_code"
	fi
	exit "$exit_code"
}
trap 'on_error $?' ERR

git fetch origin main

old_head="$(git rev-parse HEAD)"
remote_head="$(git rev-parse origin/main)"

if [[ "$old_head" == "$remote_head" ]]; then
	echo "Gist Manager is already current at $old_head"
	exit 0
fi

if ! git merge-base --is-ancestor "$old_head" "$remote_head"; then
	echo "Refusing non-fast-forward update: HEAD=$old_head origin/main=$remote_head" >&2
	exit 1
fi

if "$SYSTEMCTL" is-active --quiet "$SERVICE_NAME"; then
	app_was_active=1
fi
if [[ -d "$LIVE_BUILD" ]]; then
	had_live_build=1
fi

transaction_started=1
git merge --ff-only origin/main
"$BUN" install --frozen-lockfile
"$BUN" run --cwd client build

if [[ ! -f "$REPO_DIR/client/build/index.html" ]]; then
	echo 'Client build did not produce client/build/index.html' >&2
	exit 1
fi

rm -rf -- "$NEXT_BUILD" "$PREVIOUS_BUILD"
cp -a -- "$REPO_DIR/client/build" "$NEXT_BUILD"

# These renames stay on the same filesystem. The previous build remains intact
# until the new service has restarted successfully.
if [[ -d "$LIVE_BUILD" ]]; then
	mv -- "$LIVE_BUILD" "$PREVIOUS_BUILD"
fi
mv -- "$NEXT_BUILD" "$LIVE_BUILD"

if [[ "$app_was_active" == 1 ]]; then
	restart_attempted=1
	"$SYSTEMCTL" restart "$SERVICE_NAME"
	"$SYSTEMCTL" is-active --quiet "$SERVICE_NAME"
fi

rm -rf -- "$PREVIOUS_BUILD"
transaction_started=0
trap - ERR

echo "Updated Gist Manager from $old_head to $remote_head"
