require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { Client } = require('ssh2');
const { challenges, DEVICE_MAP, DEVICE_IP } = require('./tasksConfig');

const app = express();

// ─── Security middleware ────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS - restrict to allowed origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like server-to-server or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser with size limit to prevent payload attacks
app.use(express.json({ limit: '1mb' }));

// Global rate limiter: 1000 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
app.use(globalLimiter);

// Strict rate limiter for check endpoints (expensive SSH operations)
const checkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Check rate limit exceeded. Try again later.' }
});

// Session duration: 6 hours
const SESSION_DURATION_MS = 6 * 60 * 60 * 1000;

// ─── Configuration from environment variables ───────────────────────────────

const EVE_SERVER_USER = process.env.EVE_SERVER_USER || 'root';
const EVE_SERVER_PASS = process.env.EVE_SERVER_PASS;
const DEVICE_USER = process.env.DEVICE_USER;
const DEVICE_PASS = process.env.DEVICE_PASS;
const API_SECRET_KEY = process.env.API_SECRET_KEY;
const PORT = parseInt(process.env.PORT, 10) || 3001;

if (!EVE_SERVER_PASS || !DEVICE_USER || !DEVICE_PASS || !API_SECRET_KEY) {
  console.error('FATAL: Missing required environment variables. Check your .env file.');
  console.error('Required: EVE_SERVER_PASS, DEVICE_USER, DEVICE_PASS, API_SECRET_KEY');
  process.exit(1);
}

// Max concurrent EVE checks
const MAX_CONCURRENT = 5;

// ─── Authentication middleware ──────────────────────────────────────────────

// Active sessions: token -> expiresAt
const activeSessions = new Map();

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  const session = activeSessions.get(token);

  if (!session) {
    return res.status(401).json({ error: 'Session expired. Please login again.' });
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please login again.' });
  }

  next();
}

// ─── Input validation helpers ───────────────────────────────────────────────

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

function isValidIp(ip) {
  if (!IP_REGEX.test(ip)) return false;
  return ip.split('.').every(octet => {
    const n = parseInt(octet, 10);
    return n >= 0 && n <= 255;
  });
}

function sanitizeString(str, maxLen = 100) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'`$(){}]/g, '').substring(0, maxLen).trim();
}

function validateParticipant(p) {
  if (!p || typeof p !== 'object') return false;
  if (!p.id || typeof p.id !== 'string') return false;
  if (!p.routerIp || !isValidIp(p.routerIp)) return false;
  if (!p.name || typeof p.name !== 'string' || p.name.length > 200) return false;
  if (!p.routerNumber || typeof p.routerNumber !== 'string' || p.routerNumber.length > 20) return false;
  return true;
}

// ─── Global check state ─────────────────────────────────────────────────────

let checkState = {
  running: false,
  startedAt: null,
  completedAt: null,
  progress: { completed: 0, total: 0 },
  results: {}
};

// ─── Auto-check state ───────────────────────────────────────────────────────

const AUTO_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

let autoCheckState = {
  enabled: false,
  intervalId: null,
  storedParticipants: [],
  nextRunAt: null,
  lastAutoRunAt: null,
  runCount: 0
};

function startAutoCheck() {
  if (autoCheckState.intervalId) clearInterval(autoCheckState.intervalId);

  autoCheckState.enabled = true;
  autoCheckState.nextRunAt = new Date(Date.now() + AUTO_CHECK_INTERVAL).toISOString();
  console.log(`[AUTO-CHECK] Enabled. Next run at ${autoCheckState.nextRunAt}`);

  autoCheckState.intervalId = setInterval(async () => {
    if (checkState.running) {
      console.log('[AUTO-CHECK] Skipped - check already running');
      autoCheckState.nextRunAt = new Date(Date.now() + AUTO_CHECK_INTERVAL).toISOString();
      return;
    }
    if (autoCheckState.storedParticipants.length === 0) {
      console.log('[AUTO-CHECK] Skipped - no participants registered');
      autoCheckState.nextRunAt = new Date(Date.now() + AUTO_CHECK_INTERVAL).toISOString();
      return;
    }

    console.log(`[AUTO-CHECK] Running check for ${autoCheckState.storedParticipants.length} participants...`);
    autoCheckState.lastAutoRunAt = new Date().toISOString();
    autoCheckState.runCount++;

    try {
      await runAllChecks(autoCheckState.storedParticipants);
    } catch (err) {
      console.error('[AUTO-CHECK] Error:', err.message);
      checkState.running = false;
      checkState.completedAt = new Date().toISOString();
    }

    autoCheckState.nextRunAt = new Date(Date.now() + AUTO_CHECK_INTERVAL).toISOString();
    console.log(`[AUTO-CHECK] Done. Next run at ${autoCheckState.nextRunAt}`);
  }, AUTO_CHECK_INTERVAL);
}

function stopAutoCheck() {
  if (autoCheckState.intervalId) {
    clearInterval(autoCheckState.intervalId);
    autoCheckState.intervalId = null;
  }
  autoCheckState.enabled = false;
  autoCheckState.nextRunAt = null;
  console.log('[AUTO-CHECK] Disabled');
}

// ─── Match evaluation ───────────────────────────────────────────────────────

function stripAnsi(str) {
  return str
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\].*?(?:\x07|\x1B\\))/g, '')
    .replace(/\r/g, '');
}

function evaluateMatches(output, matchRules) {
  if (!output || !matchRules) return false;

  const cleanOutput = stripAnsi(output);

  for (const rule of matchRules) {
    if (typeof rule === 'string') {
      if (!cleanOutput.includes(rule)) {
        return false;
      }
    } else if (rule.type === 'regex_gt') {
      const regex = new RegExp(rule.pattern);
      const match = cleanOutput.match(regex);
      if (!match || !match[1]) {
        return false;
      }
      const num = parseInt(match[1], 10);
      if (isNaN(num) || num < rule.minValue) {
        return false;
      }
    } else if (rule.type === 'count') {
      const escaped = rule.substring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = cleanOutput.match(new RegExp(escaped, 'g'));
      if (!matches || matches.length < rule.minCount) {
        return false;
      }
    }
  }
  return true;
}

// ─── SSH helpers ─────────────────────────────────────────────────────────────

function runDeviceShell(jumpHost, devicePort, commands) {
  return new Promise((resolve) => {
    const overallTimeout = setTimeout(() => {
      resolve({ success: false, output: '', error: 'Device connection timeout' });
    }, 45000);

    jumpHost.forwardOut('127.0.0.1', 0, DEVICE_IP, devicePort, (err, stream) => {
      if (err) {
        clearTimeout(overallTimeout);
        return resolve({ success: false, output: '', error: 'Port forward failed' });
      }

      const device = new Client();

      device.on('ready', () => {
        device.shell((err, channel) => {
          if (err) {
            clearTimeout(overallTimeout);
            device.end();
            return resolve({ success: false, output: '', error: 'Shell initialization failed' });
          }

          let output = '';

          channel.on('data', (data) => {
            output += data.toString();
          });

          channel.on('close', () => {
            clearTimeout(overallTimeout);
            device.end();
            resolve({ success: true, output });
          });

          channel.on('error', () => {
            clearTimeout(overallTimeout);
            device.end();
            resolve({ success: true, output });
          });

          const allCommands = ['terminal length 0', ...commands, 'exit'];
          let i = 0;

          const sendNext = () => {
            if (i < allCommands.length) {
              channel.write(allCommands[i] + '\r\n');
              i++;
              setTimeout(sendNext, 2000);
            }
          };

          setTimeout(sendNext, 2500);
        });
      });

      device.on('error', () => {
        clearTimeout(overallTimeout);
        resolve({ success: false, output: '', error: 'Device SSH connection failed' });
      });

      device.connect({
        sock: stream,
        username: DEVICE_USER,
        password: DEVICE_PASS,
        readyTimeout: 20000,
        algorithms: {
          kex: [
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group14-sha1'
          ],
          cipher: [
            'aes128-ctr', 'aes192-ctr', 'aes256-ctr',
            'aes128-cbc', 'aes256-cbc'
          ],
          serverHostKey: [
            'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa',
            'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384'
          ],
          hmac: ['hmac-sha2-256', 'hmac-sha2-512']
        }
      });
    });
  });
}

function checkParticipantEnv(eveIp) {
  return new Promise((resolve) => {
    const jumpHost = new Client();
    const overallTimeout = setTimeout(() => {
      try { jumpHost.end(); } catch (e) {}
      resolve({
        eveIp,
        error: 'EVE environment timeout',
        challengeResults: challenges.map(c => ({
          challengeId: c.id,
          passed: false,
          points: 0,
          error: 'Timeout'
        }))
      });
    }, challenges.length * 30000 + 60000);

    jumpHost.on('ready', async () => {
      const challengeResults = [];

      for (const challenge of challenges) {
        let allChecksPassed = challenge.checks.length > 0;
        const checkDetails = [];

        for (const check of challenge.checks) {
          const deviceInfo = DEVICE_MAP[check.device];
          if (!deviceInfo) {
            checkDetails.push({
              device: check.device,
              passed: false,
              output: '',
              error: 'Unknown device'
            });
            allChecksPassed = false;
            continue;
          }

          const result = await runDeviceShell(jumpHost, deviceInfo.port, check.commands);

          if (!result.success) {
            console.log(`[CHECK] ${challenge.id} | ${check.device} | FAIL: ${result.error}`);
            checkDetails.push({
              device: check.device,
              passed: false,
              output: result.output,
              error: result.error
            });
            allChecksPassed = false;
            continue;
          }

          const cleanedOutput = stripAnsi(result.output);
          const passed = evaluateMatches(result.output, check.matchRules);
          console.log(`[CHECK] ${challenge.id} | ${check.device} | ${passed ? 'PASS' : 'FAIL'} | matchRules: ${JSON.stringify(check.matchRules)}`);
          if (!passed) {
            console.log(`[CHECK] ${challenge.id} | ${check.device} | Output (first 500 chars): ${cleanedOutput.substring(0, 500).replace(/\n/g, '\\n')}`);
          }
          checkDetails.push({
            device: check.device,
            passed,
            output: result.output.substring(0, 2000),
            error: passed ? null : 'Output did not match expected patterns'
          });

          if (!passed) allChecksPassed = false;
        }

        challengeResults.push({
          challengeId: challenge.id,
          category: challenge.category,
          subCategory: challenge.subCategory,
          description: challenge.description,
          passed: allChecksPassed,
          points: allChecksPassed ? challenge.points : 0,
          maxPoints: challenge.points,
          checks: checkDetails
        });
      }

      clearTimeout(overallTimeout);
      try { jumpHost.end(); } catch (e) {}

      resolve({
        eveIp,
        error: null,
        challengeResults,
        totalScore: challengeResults.reduce((sum, r) => sum + r.points, 0),
        maxScore: challengeResults.reduce((sum, r) => sum + r.maxPoints, 0)
      });
    });

    jumpHost.on('error', (err) => {
      clearTimeout(overallTimeout);
      const reason = err ? err.message || err.level || String(err) : 'Unknown';
      console.error(`[EVE] Connection FAILED to ${eveIp} | Reason: ${reason}`);
      resolve({
        eveIp,
        error: `EVE connection failed: ${reason}`,
        challengeResults: challenges.map(c => ({
          challengeId: c.id,
          passed: false,
          points: 0,
          maxPoints: c.points,
          error: `EVE unreachable: ${reason}`
        }))
      });
    });

    console.log(`[EVE] Connecting to ${eveIp}:22 as ${EVE_SERVER_USER}...`);
    jumpHost.connect({
      host: eveIp,
      port: 22,
      username: EVE_SERVER_USER,
      password: EVE_SERVER_PASS,
      readyTimeout: 20000
    });
  });
}

// ─── Quick SSH ping (connection test only) ──────────────────────────────────

function pingEve(eveIp) {
  return new Promise((resolve) => {
    const client = new Client();
    const timeout = setTimeout(() => {
      try { client.end(); } catch (e) {}
      resolve({ ip: eveIp, status: 'Offline', error: 'Timeout' });
    }, 8000);

    client.on('ready', () => {
      clearTimeout(timeout);
      try { client.end(); } catch (e) {}
      resolve({ ip: eveIp, status: 'Online' });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ ip: eveIp, status: 'Offline', error: err.message });
    });

    client.connect({
      host: eveIp,
      port: 22,
      username: EVE_SERVER_USER,
      password: EVE_SERVER_PASS,
      readyTimeout: 7000
    });
  });
}

async function pingAllParticipants(participants) {
  const results = {};

  for (let i = 0; i < participants.length; i += 10) {
    const batch = participants.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(p => pingEve(p.routerIp).then(r => ({ ...r, participantId: p.id })))
    );
    for (const r of batchResults) {
      results[r.participantId] = {
        status: r.status,
        error: r.error || null,
        checkedAt: new Date().toISOString()
      };
    }
  }

  return results;
}

// ─── Run checks with concurrency limit ──────────────────────────────────────

async function runAllChecks(participants) {
  checkState.running = true;
  checkState.startedAt = new Date().toISOString();
  checkState.completedAt = null;
  checkState.progress = { completed: 0, total: participants.length };
  checkState.results = {};

  for (let i = 0; i < participants.length; i += MAX_CONCURRENT) {
    const batch = participants.slice(i, i + MAX_CONCURRENT);
    const batchPromises = batch.map(p => {
      return checkParticipantEnv(p.routerIp).then(result => {
        checkState.results[p.id] = {
          participantId: sanitizeString(p.id, 50),
          participantName: sanitizeString(p.name, 200),
          routerIp: p.routerIp,
          routerNumber: sanitizeString(p.routerNumber, 20),
          ...result,
          checkedAt: new Date().toISOString()
        };
        checkState.progress.completed++;
        console.log(`[${checkState.progress.completed}/${checkState.progress.total}] Checked ${p.name}: ${result.totalScore || 0} pts`);
      });
    });

    await Promise.all(batchPromises);
  }

  checkState.running = false;
  checkState.completedAt = new Date().toISOString();
  console.log('All checks completed.');
}

// ─── API: Auth token endpoint ───────────────────────────────────────────────

app.post('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts' }
}), (req, res) => {
  const { passkey } = req.body;
  if (!passkey || typeof passkey !== 'string') {
    return res.status(400).json({ error: 'Passkey required' });
  }

  const hash = crypto.createHash('sha256').update(passkey).digest('hex');
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedHash || hash !== expectedHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate unique session token with 6-hour expiry
  const sessionId = crypto.randomBytes(32).toString('hex');
  const token = crypto
    .createHmac('sha256', API_SECRET_KEY)
    .update(sessionId)
    .digest('hex');

  activeSessions.set(token, {
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS
  });

  res.json({ token, expiresIn: SESSION_DURATION_MS / 1000 });
});

// ─── API Endpoints (all protected) ──────────────────────────────────────────

// Start checking all participants
app.post('/api/check-all', requireAuth, checkLimiter, async (req, res) => {
  if (checkState.running) {
    return res.status(409).json({
      error: 'Check already in progress',
      progress: checkState.progress
    });
  }

  const { participants } = req.body;
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ error: 'participants array is required' });
  }

  // Validate max participants to prevent abuse
  if (participants.length > 50) {
    return res.status(400).json({ error: 'Too many participants (max 50)' });
  }

  // Validate each participant
  for (const p of participants) {
    if (!validateParticipant(p)) {
      return res.status(400).json({ error: `Invalid participant data: ${sanitizeString(p?.id || 'unknown', 20)}` });
    }
  }

  // Store participants for auto-check
  autoCheckState.storedParticipants = participants;

  runAllChecks(participants).catch(err => {
    console.error('Check-all error:', err.message);
    checkState.running = false;
    checkState.completedAt = new Date().toISOString();
  });

  res.json({
    message: 'Checks started',
    total: participants.length
  });
});

// Get current check progress and results
app.get('/api/check-results', requireAuth, (req, res) => {
  res.json({
    running: checkState.running,
    startedAt: checkState.startedAt,
    completedAt: checkState.completedAt,
    progress: checkState.progress,
    results: checkState.results,
    autoCheck: {
      enabled: autoCheckState.enabled,
      nextRunAt: autoCheckState.nextRunAt
    }
  });
});

// Check a single participant
app.post('/api/check-participant', requireAuth, checkLimiter, async (req, res) => {
  const { participantId, routerIp, name, routerNumber } = req.body;

  if (!routerIp || !isValidIp(routerIp)) {
    return res.status(400).json({ error: 'Valid routerIp is required' });
  }
  if (!participantId || typeof participantId !== 'string') {
    return res.status(400).json({ error: 'participantId is required' });
  }

  console.log(`Checking participant ${sanitizeString(name || participantId, 50)}...`);

  const result = await checkParticipantEnv(routerIp);

  const fullResult = {
    participantId: sanitizeString(participantId, 50),
    participantName: sanitizeString(name, 200),
    routerIp,
    routerNumber: sanitizeString(routerNumber, 20),
    ...result,
    checkedAt: new Date().toISOString()
  };

  if (participantId) {
    checkState.results[participantId] = fullResult;
  }

  res.json(fullResult);
});

// Get challenges config (public info only - no device/command details)
app.get('/api/challenges', requireAuth, (req, res) => {
  res.json(challenges.map(c => ({
    id: c.id,
    category: c.category,
    subCategory: c.subCategory,
    description: c.description,
    owner: c.owner,
    points: c.points
  })));
});

// ─── Connectivity ping endpoint ──────────────────────────────────────────────

app.post('/api/ping-all', requireAuth, async (req, res) => {
  const { participants } = req.body;
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ error: 'participants array is required' });
  }

  const results = await pingAllParticipants(participants);
  res.json({ results, checkedAt: new Date().toISOString() });
});

// ─── Diagnostic test endpoint ────────────────────────────────────────────────

app.post('/api/test-eve', requireAuth, async (req, res) => {
  const { ip } = req.body;
  if (!ip || !isValidIp(ip)) {
    return res.status(400).json({ error: 'Valid IP is required' });
  }

  console.log(`[TEST] Testing SSH connection to ${ip}:22 as ${EVE_SERVER_USER}...`);

  const result = await new Promise((resolve) => {
    const client = new Client();
    const timeout = setTimeout(() => {
      try { client.end(); } catch (e) {}
      resolve({ success: false, error: 'Connection timeout (10s)' });
    }, 10000);

    client.on('ready', () => {
      clearTimeout(timeout);
      // Try to also test a port forward to verify TCP forwarding works
      client.forwardOut('127.0.0.1', 0, DEVICE_IP, 30003, (err, stream) => {
        if (err) {
          client.end();
          return resolve({ success: true, sshOk: true, forwardOk: false, error: `SSH OK but port forward failed: ${err.message}` });
        }
        // Port forward works, try device SSH
        const device = new Client();
        const devTimeout = setTimeout(() => {
          try { device.end(); stream.destroy(); client.end(); } catch (e) {}
          resolve({ success: true, sshOk: true, forwardOk: true, deviceOk: false, error: 'Device SSH timeout' });
        }, 10000);

        device.on('ready', () => {
          clearTimeout(devTimeout);
          device.end();
          client.end();
          resolve({ success: true, sshOk: true, forwardOk: true, deviceOk: true, message: 'Full chain OK: Backend → EVE → Device' });
        });

        device.on('error', (devErr) => {
          clearTimeout(devTimeout);
          client.end();
          resolve({ success: true, sshOk: true, forwardOk: true, deviceOk: false, error: `Device SSH failed: ${devErr.message}` });
        });

        device.connect({
          sock: stream,
          username: DEVICE_USER,
          password: DEVICE_PASS,
          readyTimeout: 8000,
          algorithms: {
            kex: ['diffie-hellman-group-exchange-sha256', 'diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1'],
            cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-cbc', 'aes256-cbc'],
            serverHostKey: ['rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384'],
            hmac: ['hmac-sha2-256', 'hmac-sha2-512']
          }
        });
      });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: `SSH failed: ${err.message || err.level || String(err)}` });
    });

    client.connect({
      host: ip,
      port: 22,
      username: EVE_SERVER_USER,
      password: EVE_SERVER_PASS,
      readyTimeout: 8000
    });
  });

  console.log(`[TEST] Result for ${ip}:`, JSON.stringify(result));
  res.json(result);
});

// ─── Auto-check endpoints ───────────────────────────────────────────────────

// Get auto-check status
app.get('/api/auto-check', requireAuth, (req, res) => {
  res.json({
    enabled: autoCheckState.enabled,
    intervalMinutes: AUTO_CHECK_INTERVAL / 60000,
    nextRunAt: autoCheckState.nextRunAt,
    lastAutoRunAt: autoCheckState.lastAutoRunAt,
    runCount: autoCheckState.runCount,
    participantCount: autoCheckState.storedParticipants.length
  });
});

// Enable auto-check
app.post('/api/auto-check/start', requireAuth, (req, res) => {
  // Accept optional participants to register
  const { participants } = req.body || {};
  if (participants && Array.isArray(participants) && participants.length > 0) {
    autoCheckState.storedParticipants = participants;
  }

  if (autoCheckState.storedParticipants.length === 0) {
    return res.status(400).json({ error: 'No participants registered. Run a manual check first or provide participants.' });
  }

  startAutoCheck();
  res.json({
    message: 'Auto-check enabled',
    intervalMinutes: AUTO_CHECK_INTERVAL / 60000,
    nextRunAt: autoCheckState.nextRunAt,
    participantCount: autoCheckState.storedParticipants.length
  });
});

// Disable auto-check
app.post('/api/auto-check/stop', requireAuth, (req, res) => {
  stopAutoCheck();
  res.json({ message: 'Auto-check disabled' });
});

// Health check (no auth needed)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─── Start server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`EVE Checker Backend running on port ${PORT}`);
  console.log(`Loaded ${challenges.length} challenges`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
});
