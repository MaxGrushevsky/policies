#!/usr/bin/env node
// Blocks a commit that would add junk to the repository.
//
// Two modes:
//   Claude Code PreToolUse hook (Bash|PowerShell): reads the tool call JSON from stdin,
//     acts only on commands that run `git commit`, exits 2 with the findings on stderr.
//   Plain check: `node check-commit-junk.mjs --staged [repo-dir]` checks what is staged now
//     (usable by hand or from a git pre-commit hook).
//
// Exceptions: one path or path prefix per line in <repo>/.claude/commit-allow.txt
// (add a line only after the user confirmed the file belongs in git).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const MAX_NEW_FILE_MB = 5;

const JUNK = [
  [/(^|\/)node_modules\//, 'зависимости (node_modules)'],
  [/(^|\/)(dist|output|coverage|\.tmp|tmp|temp)\//, 'сборка или временная папка'],
  [/(^|\/)android\/(app\/)?build\/|(^|\/)\.gradle\/|(^|\/)\.kotlin\//, 'артефакты сборки Android'],
  [/(^|\/)ios\/App\/(build|DerivedData|Pods)\//, 'артефакты сборки iOS'],
  [/\.(apk|aab|ipa|zip|7z|rar)$/i, 'собранный пакет или архив'],
  [/(^|\/)secret\/|\.(jks|keystore|p12|mobileprovision)$|(^|\/)keystore\.properties$/i, 'ключи подписи / секреты'],
  [/(^|\/)\.env(\.(?!example$)[^/]*)?$/, 'файл окружения (.env)'],
  [/(^|\/)(google-services\.json|GoogleService-Info\.plist)$/, 'конфиг Firebase (хранится локально)'],
  [/(^|\/)\.claude\/settings\.local\.json$/, 'личные настройки Claude'],
  [/\.log$|(^|\/)npm-debug\.log/i, 'лог'],
  [/(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i, 'системный файл ОС'],
  [/\.(bak|orig|rej|swp|swo|tmp|temp)$|~$/i, 'резервная копия / временный файл'],
  [/(^|\/)nul$/i, 'случайный файл nul (Windows)'],
  [/( - Copy| \(\d+\)|[-_ ]copy\d*)\.[^/]+$/i, 'копия файла'],
  [/(^|\/)(scratch|untitled|новый)[^/]*$/i, 'черновой файл'],
  [/^[^/]*(screenshot|снимок|screen shot)[^/]*\.(png|jpe?g|webp)$/i, 'скриншот в корне репозитория'],
];

const CONTENT = [
  [/^\+(<{7}|>{7})( |$)|^\+={7}$/, 'маркер конфликта слияния'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'приватный ключ'],
];

const git = (dir, args) =>
  execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
const list = out => out.split('\0').filter(Boolean);

function unquote(s) {
  return s.replace(/^["']|["']$/g, '');
}

/** Directories in which the command runs `git commit` (from `git -C dir` or a preceding `cd dir`). */
function commitDirs(command, baseDir) {
  const dirs = new Set();
  let cwd = baseDir;
  for (const part of command.split(/&&|\|\||;|\n/)) {
    const cd = part.match(/^\s*(?:cd|Set-Location|pushd)\s+("[^"]+"|'[^']+'|\S+)/i);
    if (cd) cwd = path.resolve(cwd, unquote(cd[1]).replace(/^\/([a-z])\//i, '$1:/'));
    const commit = part.match(/\bgit\s+((?:-C\s+("[^"]+"|'[^']+'|\S+)\s+|-c\s+\S+\s+)*)commit\b/);
    if (!commit) continue;
    const c = commit[1].match(/-C\s+("[^"]+"|'[^']+'|\S+)/);
    dirs.add(c ? path.resolve(cwd, unquote(c[1]).replace(/^\/([a-z])\//i, '$1:/')) : cwd);
  }
  return [...dirs];
}

function allowList(root) {
  const file = path.join(root, '.claude', 'commit-allow.txt');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
}

function check(dir, { includeUnstaged = false, includeUntracked = false } = {}) {
  let root;
  try { root = git(dir, ['rev-parse', '--show-toplevel']).trim(); } catch { return []; }
  const files = new Set(list(git(root, ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])));
  let diff = git(root, ['diff', '--cached', '-U0', '--diff-filter=ACMR']);
  if (includeUnstaged) {
    list(git(root, ['diff', '--name-only', '--diff-filter=ACMR', '-z'])).forEach(f => files.add(f));
    diff += git(root, ['diff', '-U0', '--diff-filter=ACMR']);
  }
  if (includeUntracked) list(git(root, ['ls-files', '--others', '--exclude-standard', '-z'])).forEach(f => files.add(f));

  const allowed = allowList(root);
  const isAllowed = f => allowed.some(a => f === a || f.startsWith(a.endsWith('/') ? a : a + '/'));
  let tracked = new Set();
  try { tracked = new Set(list(git(root, ['ls-tree', '-r', '--name-only', '-z', 'HEAD']))); } catch { /* no commits yet */ }
  const findings = [];

  for (const f of files) {
    if (isAllowed(f)) continue;
    const rule = JUNK.find(([re]) => re.test(f));
    if (rule) { findings.push(`${f} — ${rule[1]}`); continue; }
    if (!tracked.has(f)) {
      try {
        const mb = statSync(path.join(root, f)).size / 1048576;
        if (mb > MAX_NEW_FILE_MB) findings.push(`${f} — новый файл ${mb.toFixed(1)} МБ (больше ${MAX_NEW_FILE_MB} МБ)`);
      } catch { /* deleted in the working tree */ }
    }
  }

  let current = '';
  for (const line of diff.split('\n')) {
    const header = line.match(/^\+\+\+ b\/(.*)$/);
    if (header) { current = header[1]; continue; }
    if (!line.startsWith('+') || isAllowed(current)) continue;
    const rule = CONTENT.find(([re]) => re.test(line));
    if (rule) findings.push(`${current} — ${rule[1]}: ${line.slice(1, 80).trim()}`);
  }
  return findings.map(f => `${path.basename(root)}: ${f}`);
}

function report(findings) {
  process.stderr.write(
    'Коммит остановлен: в него попадает мусор.\n' +
    findings.map(f => `  - ${f}`).join('\n') +
    '\n\nНе исправляй вслепую. Сначала разберись по каждому файлу: откуда он взялся (git log, ' +
    'какой скрипт или шаг его создаёт), нужен ли он, почему его не отсекает .gitignore. ' +
    'Ничего не удаляй с диска без согласия пользователя.\n' +
    'Затем: убери лишнее из индекса (git restore --staged <файл>), при необходимости поправь .gitignore ' +
    'и закоммить снова, добавляя файлы по именам, а не через `git add -A` / `git add .`.\n' +
    'Если файл действительно нужен в репозитории — расскажи пользователю, что нашёл, и после его согласия ' +
    'впиши путь в .claude/commit-allow.txt.\n'
  );
}

// --- plain mode ---------------------------------------------------------------------------
if (process.argv.includes('--staged')) {
  const dir = process.argv.slice(2).find(a => !a.startsWith('--')) ?? process.cwd();
  const findings = check(path.resolve(dir));
  if (findings.length) { report(findings); process.exit(1); }
  process.exit(0);
}

// --- Claude Code hook mode ----------------------------------------------------------------
let input = '';
for await (const chunk of process.stdin) input += chunk;
let command = '';
let baseDir = process.cwd();
try {
  const data = JSON.parse(input);
  command = data.tool_input?.command ?? '';
  baseDir = data.cwd ?? baseDir;
} catch { process.exit(0); }

if (!/\bgit\b[^\n;&|]*\bcommit\b/.test(command)) process.exit(0);

try {
  const includeUnstaged = /\bcommit\b[^\n;&|]*\s(-a\w*|--all)\b/.test(command);
  const includeUntracked = /\bgit(?:\s+-[Cc]\s+("[^"]+"|'[^']+'|\S+))*\s+add\b[^\n;&|]*\s(-A|--all|-u|\.)(?=\s|$)/.test(command);
  const findings = commitDirs(command, baseDir)
    .flatMap(dir => check(dir, { includeUnstaged: includeUnstaged || includeUntracked, includeUntracked }));
  if (findings.length) { report(findings); process.exit(2); }
} catch (error) {
  process.stderr.write(`Проверка коммита на мусор не смогла выполниться: ${error.message}\n` +
    'Проверь `git status` и состав коммита вручную, прежде чем коммитить.\n');
  process.exit(2);
}
