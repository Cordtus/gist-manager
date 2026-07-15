import { afterEach, describe, expect, test } from 'bun:test';
import {
	chmodSync,
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PROJECT_DIR = path.join(import.meta.dir, '..');
const UPDATE_SCRIPT = path.join(PROJECT_DIR, 'scripts/update-production.sh');
const temporaryDirectories: string[] = [];

type Fixture = {
	production: string;
	remoteHead: string;
	eventLog: string;
	stateDir: string;
	env: Record<string, string>;
};

function temporaryDirectory(prefix: string): string {
	const directory = mkdtempSync(path.join(tmpdir(), prefix));
	temporaryDirectories.push(directory);
	return directory;
}

function run(
	command: string[],
	options: { cwd?: string; env?: Record<string, string> } = {},
): { exitCode: number; stdout: string; stderr: string } {
	const result = Bun.spawnSync(command, {
		cwd: options.cwd || PROJECT_DIR,
		env: { ...process.env, ...options.env },
		stdout: 'pipe',
		stderr: 'pipe',
	});
	return {
		exitCode: result.exitCode,
		stdout: result.stdout.toString(),
		stderr: result.stderr.toString(),
	};
}

function must(command: string[], cwd: string): string {
	const result = run(command, { cwd });
	expect(result.exitCode, `${command.join(' ')}\n${result.stderr}`).toBe(0);
	return result.stdout.trim();
}

function executable(filePath: string, contents: string): void {
	writeFileSync(filePath, contents);
	chmodSync(filePath, 0o755);
}

function createFixture(options: { appActive?: boolean; priorBuild?: boolean; timerActive?: boolean } = {}): Fixture {
	const root = temporaryDirectory('gist-manager-update-');
	const remote = path.join(root, 'remote.git');
	const producer = path.join(root, 'producer');
	const production = path.join(root, 'production');
	const binDir = path.join(root, 'bin');
	const stateDir = path.join(root, 'state');
	const eventLog = path.join(root, 'events.log');
	mkdirSync(binDir);
	mkdirSync(stateDir);

	must(['git', 'init', '--bare', remote], root);
	must(['git', 'init', '-b', 'main', producer], root);
	must(['git', 'config', 'user.name', 'Updater Test'], producer);
	must(['git', 'config', 'user.email', 'updater@example.invalid'], producer);
	mkdirSync(path.join(producer, 'client'), { recursive: true });
	mkdirSync(path.join(producer, 'server'), { recursive: true });
	writeFileSync(path.join(producer, '.gitignore'), [
		'client/build/',
		'server/build/',
		'server/build.next/',
		'server/build.previous/',
		'node_modules/',
	].join('\n'));
	writeFileSync(path.join(producer, 'bun.lock'), 'lock-v1\n');
	writeFileSync(path.join(producer, 'package.json'), '{"private":true}\n');
	writeFileSync(path.join(producer, 'client/source.txt'), 'source-v1\n');
	writeFileSync(path.join(producer, 'server/index.js'), 'server-v1\n');
	must(['git', 'add', '.'], producer);
	must(['git', 'commit', '-m', 'Initial release'], producer);
	must(['git', 'remote', 'add', 'origin', remote], producer);
	must(['git', 'push', '-u', 'origin', 'main'], producer);
	must(['git', 'symbolic-ref', 'HEAD', 'refs/heads/main'], remote);
	must(['git', 'clone', remote, production], root);
	if (options.priorBuild !== false) {
		mkdirSync(path.join(production, 'server/build'), { recursive: true });
		writeFileSync(path.join(production, 'server/build/index.html'), 'old-build\n');
	}

	writeFileSync(path.join(producer, 'client/source.txt'), 'source-v2\n');
	writeFileSync(path.join(producer, 'server/index.js'), 'server-v2\n');
	writeFileSync(path.join(producer, 'bun.lock'), 'lock-v2\n');
	must(['git', 'add', '.'], producer);
	must(['git', 'commit', '-m', 'New release'], producer);
	must(['git', 'push', 'origin', 'main'], producer);
	const remoteHead = must(['git', 'rev-parse', 'HEAD'], producer);

	executable(path.join(binDir, 'bun'), [
		'#!/usr/bin/env bash',
		'set -euo pipefail',
		'printf "bun %s\\n" "$*" >> "$EVENT_LOG"',
		'if [[ "$*" == "install --frozen-lockfile" ]]; then exit 0; fi',
		'if [[ "$*" == "run --cwd client build" ]]; then',
		'  if [[ "${FAIL_BUILD:-0}" == "1" ]]; then exit 42; fi',
		'  rm -rf "$REPO_DIR/client/build"',
		'  mkdir -p "$REPO_DIR/client/build"',
		'  printf "build-%s\\n" "$(git -C "$REPO_DIR" rev-parse HEAD)" > "$REPO_DIR/client/build/index.html"',
		'  exit 0',
		'fi',
		'exit 64',
		'',
	].join('\n'));
	executable(path.join(binDir, 'systemctl'), [
		'#!/usr/bin/env bash',
		'set -euo pipefail',
		'printf "systemctl %s\\n" "$*" >> "$EVENT_LOG"',
		'case "$1" in',
		'  restart)',
		'    if [[ -f "$STATE_DIR/fail-restart-once" ]]; then',
		'      rm -f "$STATE_DIR/fail-restart-once" "$STATE_DIR/running"',
		'      exit 55',
		'    fi',
		'    touch "$STATE_DIR/running"',
		'    ;;',
		'  is-active)',
		'    shift',
		'    [[ "${1:-}" == "--quiet" ]] && shift',
		'    case "${1:-}" in',
		'      gist-manager.service) [[ -f "$STATE_DIR/running" ]] ;;',
		'      gist-manager-updater.timer) [[ -f "$STATE_DIR/timer-running" ]] ;;',
		'      *) exit 66 ;;',
		'    esac',
		'    ;;',
		'  *) exit 65 ;;',
		'esac',
		'',
	].join('\n'));
	if (options.appActive !== false) writeFileSync(path.join(stateDir, 'running'), '');
	if (options.timerActive === true) writeFileSync(path.join(stateDir, 'timer-running'), '');
	writeFileSync(eventLog, '');

	return {
		production,
		remoteHead,
		eventLog,
		stateDir,
		env: {
			REPO_DIR: production,
			BUN: path.join(binDir, 'bun'),
			SYSTEMCTL: path.join(binDir, 'systemctl'),
			EVENT_LOG: eventLog,
			STATE_DIR: stateDir,
		},
	};
}

function runUpdater(fixture: Fixture): ReturnType<typeof run> {
	return run(['bash', UPDATE_SCRIPT], { env: fixture.env });
}

function currentHead(fixture: Fixture): string {
	return must(['git', 'rev-parse', 'HEAD'], fixture.production);
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

describe('production updater', () => {
	test('refuses a dirty production checkout before installing or restarting', () => {
		const fixture = createFixture();
		writeFileSync(path.join(fixture.production, 'server/index.js'), 'operator-change\n');
		const beforeHead = currentHead(fixture);

		const result = runUpdater(fixture);

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain('dirty');
		expect(currentHead(fixture)).toBe(beforeHead);
		expect(readFileSync(fixture.eventLog, 'utf8')).toBe('');
	});

	test('failed build restores the old revision and live build without restarting', () => {
		const fixture = createFixture();
		const beforeHead = currentHead(fixture);

		const result = run(['bash', UPDATE_SCRIPT], {
			env: { ...fixture.env, FAIL_BUILD: '1' },
		});

		expect(result.exitCode).toBe(42);
		expect(currentHead(fixture)).toBe(beforeHead);
		expect(readFileSync(path.join(fixture.production, 'server/build/index.html'), 'utf8')).toBe('old-build\n');
		expect(readFileSync(fixture.eventLog, 'utf8')).not.toContain('systemctl restart');
		expect(must(['git', 'status', '--porcelain'], fixture.production)).toBe('');
	});

	test('fast-forwards, atomically switches the build, and restarts only after success', () => {
		const fixture = createFixture({ timerActive: true });

		const result = runUpdater(fixture);

		expect(result.exitCode, result.stderr).toBe(0);
		expect(currentHead(fixture)).toBe(fixture.remoteHead);
		expect(readFileSync(path.join(fixture.production, 'server/build/index.html'), 'utf8'))
			.toBe(`build-${fixture.remoteHead}\n`);
		expect(existsSync(path.join(fixture.production, 'server/build.next'))).toBe(false);
		expect(existsSync(path.join(fixture.production, 'server/build.previous'))).toBe(false);
		expect(existsSync(path.join(fixture.stateDir, 'timer-running'))).toBe(true);
		const events = readFileSync(fixture.eventLog, 'utf8');
		expect(events).toContain('bun install --frozen-lockfile');
		expect(events).toContain('bun run --cwd client build');
		expect(events.indexOf('systemctl restart gist-manager.service'))
			.toBeGreaterThan(events.indexOf('bun run --cwd client build'));
		expect(events).not.toContain('gist-manager-updater.timer');
	});

	test('restart failure rolls back revision and build and restores the old service', () => {
		const fixture = createFixture();
		const beforeHead = currentHead(fixture);
		writeFileSync(path.join(fixture.stateDir, 'fail-restart-once'), '');

		const result = runUpdater(fixture);

		expect(result.exitCode).toBe(55);
		expect(currentHead(fixture)).toBe(beforeHead);
		expect(readFileSync(path.join(fixture.production, 'server/build/index.html'), 'utf8')).toBe('old-build\n');
		expect(existsSync(path.join(fixture.stateDir, 'running'))).toBe(true);
		const events = readFileSync(fixture.eventLog, 'utf8');
		expect(events.match(/systemctl restart gist-manager\.service/g)?.length).toBe(2);
	});

	test('successful update leaves a previously inactive app and timer inactive', () => {
		const fixture = createFixture({ appActive: false, timerActive: false });

		const result = runUpdater(fixture);

		expect(result.exitCode, result.stderr).toBe(0);
		expect(currentHead(fixture)).toBe(fixture.remoteHead);
		expect(existsSync(path.join(fixture.stateDir, 'running'))).toBe(false);
		expect(existsSync(path.join(fixture.stateDir, 'timer-running'))).toBe(false);
		const events = readFileSync(fixture.eventLog, 'utf8');
		expect(events).not.toContain('systemctl restart gist-manager.service');
		expect(events).not.toContain('gist-manager-updater.timer');
	});

	test('first-deploy restart failure restores the absence of a live build', () => {
		const fixture = createFixture({ priorBuild: false });
		const beforeHead = currentHead(fixture);
		writeFileSync(path.join(fixture.stateDir, 'fail-restart-once'), '');

		const result = runUpdater(fixture);

		expect(result.exitCode).toBe(55);
		expect(currentHead(fixture)).toBe(beforeHead);
		expect(existsSync(path.join(fixture.production, 'server/build'))).toBe(false);
		expect(existsSync(path.join(fixture.production, 'server/build.next'))).toBe(false);
		expect(existsSync(path.join(fixture.production, 'server/build.previous'))).toBe(false);
		expect(existsSync(path.join(fixture.stateDir, 'running'))).toBe(true);
	});
});

test('production service and persistent updater timer are packaged without the superseded unit', () => {
	const servicePath = path.join(PROJECT_DIR, 'gist-manager.service');
	const updaterPath = path.join(PROJECT_DIR, 'gist-manager-updater.service');
	const timerPath = path.join(PROJECT_DIR, 'gist-manager-updater.timer');
	expect(existsSync(servicePath)).toBe(true);
	expect(existsSync(updaterPath)).toBe(true);
	expect(existsSync(timerPath)).toBe(true);
	expect(existsSync(path.join(PROJECT_DIR, 'gist-manager-update.service'))).toBe(false);
	if (!existsSync(servicePath) || !existsSync(updaterPath) || !existsSync(timerPath)) return;

	const service = readFileSync(servicePath, 'utf8');
	const updater = readFileSync(updaterPath, 'utf8');
	const timer = readFileSync(timerPath, 'utf8');
	expect(service).toContain('User=gistui');
	expect(service).toContain('Group=gistui');
	expect(service).toContain('WorkingDirectory=/opt/gist-manager/server');
	expect(service).toContain('EnvironmentFile=/etc/gist-manager/gist-manager.env');
	expect(service).toContain('ExecStart=/usr/bin/node index.js');
	expect(updater).not.toContain('EnvironmentFile=/etc/gist-manager/gist-manager.env');
	expect(updater).toContain('EnvironmentFile=/etc/gist-manager/gist-manager-updater.env');
	expect(updater).toContain('ExecStart=/opt/gist-manager/scripts/update-production.sh');
	expect(timer).toContain('OnUnitActiveSec=12h');
	expect(timer).toContain('Persistent=true');
});
