const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');

const ROOT = __dirname;
const TEMP_DIR = path.join(ROOT, 'temp');
const DATABASE_URL = 'postgresql://sohaara:sohaara123@localhost:5432/sohaara_lms?schema=public';
const APPS = [
  { name: 'API',   cwd: 'apps/api',   cmd: 'pnpm', args: ['dev'],         port: 4000, path: '/api/v1/health', color: '\x1b[36m' },
  { name: 'Web',   cwd: 'apps/web',   cmd: 'pnpm', args: ['dev'],         port: 3000, path: '/',             color: '\x1b[35m' },
  { name: 'Admin', cwd: 'apps/admin', cmd: 'pnpm', args: ['dev'],         port: 3001, path: '/',             color: '\x1b[33m' },
];
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

// Ensure local temp folder exists
require('fs').mkdirSync(TEMP_DIR, { recursive: true });

const children = [];
let shuttingDown = false;

function log(msg) {
  process.stdout.write(msg + '\n');
}

function timestamp() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

function killPort(port) {
  try {
    if (os.platform() === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const pids = new Set();
      for (const line of out.split('\n')) {
        const m = line.match(/\s(\d+)\s*$/);
        if (m) pids.add(m[1]);
      }
      for (const pid of pids) {
        try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch (_) {}
      }
      return pids.size;
    } else {
      execSync(`fuser -k ${port}/tcp 2>/dev/null || lsof -ti tcp:${port} | xargs -r kill -9`, { stdio: 'ignore' });
      return 0;
    }
  } catch (_) {
    return 0;
  }
}

function startApp(app) {
  const logFile = path.join(TEMP_DIR, `${app.name.toLowerCase()}.log`);
  const errFile = path.join(TEMP_DIR, `${app.name.toLowerCase()}-err.log`);
  const out = require('fs').openSync(logFile, 'a');
  const err = require('fs').openSync(errFile, 'a');

  const child = spawn(app.cmd, app.args, {
    cwd: path.join(ROOT, app.cwd),
    stdio: ['ignore', out, err],
    env: { ...process.env, DATABASE_URL, NODE_ENV: 'development' },
    shell: true,
  });

  const prefix = `${DIM}[${timestamp()}]${RESET} ${app.color}${pad('[' + app.name + ']', 7)}${RESET}`;

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    log(`${prefix} ${RED}exited (code: ${code}, signal: ${signal})${RESET}`);
    if (code !== 0 && code !== null) {
      log(`${prefix} ${YELLOW}restart in 3s...${RESET}`);
      setTimeout(() => {
        if (!shuttingDown) startApp(app);
      }, 3000);
    }
  });

  children.push({ app, child });
  return child;
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function checkApp(app) {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port: app.port, path: app.path, timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitForApps(apps, timeoutMs = 90000) {
  const start = Date.now();
  const remaining = [...apps];
  const ready = [];

  while (remaining.length > 0 && Date.now() - start < timeoutMs) {
    for (let i = remaining.length - 1; i >= 0; i--) {
      const ok = await checkApp(remaining[i]);
      if (ok) {
        ready.push(remaining.splice(i, 1)[0]);
      }
    }
    if (remaining.length > 0) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return { ready, remaining };
}

log(`${BOLD}Sohaara LMS — Dev Server${RESET}\n`);
log(`${DIM}Logs: ${TEMP_DIR}${RESET}`);
log(`${DIM}Killing any stale processes on ports ${APPS.map(a => a.port).join(', ')}...${RESET}`);
for (const app of APPS) {
  const n = killPort(app.port);
  if (n > 0) log(`  ${YELLOW}killed ${n} process(es) on :${app.port}${RESET}`);
}
log('');

log(`${DIM}Starting apps...${RESET}`);
for (const app of APPS) {
  log(`  ${app.color}[${app.name}]${RESET} → port ${app.port}`);
  startApp(app);
}
log('');

log(`${DIM}Waiting for servers to become ready (max 90s)...${RESET}`);
waitForApps(APPS).then(({ ready, remaining }) => {
  log('');
  log(`${BOLD}─── Server Status ─────────────────────${RESET}`);
  for (const app of APPS) {
    const isReady = ready.includes(app);
    const mark = isReady ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const status = isReady ? `${GREEN}ready${RESET}` : `${RED}not ready${RESET}`;
    log(`  ${mark} ${pad(app.name, 6)} → ${pad('http://localhost:' + app.port, 24)} ${status}`);
  }
  log(`${BOLD}────────────────────────────────────────${RESET}\n`);

  if (ready.length === APPS.length) {
    log(`${GREEN}${BOLD}All servers running!${RESET}`);
  } else if (ready.length > 0) {
    log(`${YELLOW}${ready.length}/${APPS.length} servers ready. Check output above for errors.${RESET}`);
  } else {
    log(`${RED}No servers started. Check output above for errors.${RESET}`);
  }

  log('');
  log(`${DIM}Credentials:${RESET} admin@sohaara.com / Admin123!`);
  log(`${DIM}API docs:${RESET}    http://localhost:4000/api/docs`);
  log(`${DIM}Web app:${RESET}     http://localhost:3000`);
  log(`${DIM}Admin:${RESET}       http://localhost:3001`);
  log(`${DIM}Logs:${RESET}       ${TEMP_DIR}`);
  log('');
  log(`${DIM}Press Ctrl+C to stop all servers.${RESET}`);
});

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`\n${YELLOW}Shutting down (${signal})...${RESET}`);
  for (const { app, child } of children) {
    try { child.kill('SIGTERM'); } catch (_) {}
  }
  setTimeout(() => {
    for (const { app, child } of children) {
      try { child.kill('SIGKILL'); } catch (_) {}
    }
    setTimeout(() => process.exit(0), 500);
  }, 3000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));
