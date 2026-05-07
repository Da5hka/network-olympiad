require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { Client } = require('ssh2');
const { challenges, DEVICE_MAP } = require('./tasksConfig');

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

// Global rate limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
app.use(globalLimiter);

// Strict rate limiter for check endpoints (expensive SSH operations)
const checkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Check rate limit exceeded. Try again later.' }
});

// ─── Configuration from environment variables ───────────────────────────────

const EVE_SERVER_USER = process.env.EVE_SERVER_USER || 'admin';
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

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  const expectedToken = crypto
    .createHmac('sha256', API_SECRET_KEY)
    .update('admin-session')
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
    return res.status(403).json({ error: 'Invalid credentials' });
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

// ─── Match evaluation ───────────────────────────────────────────────────────

function evaluateMatches(output, matchRules) {
  if (!output || !matchRules) return false;

  for (const rule of matchRules) {
    if (typeof rule === 'string') {
      if (!output.includes(rule)) {
        return false;
      }
    } else if (rule.type === 'regex_gt') {
      const regex = new RegExp(rule.pattern);
      const match = output.match(regex);
      if (!match || !match[1]) {
        return false;
      }
      const num = parseInt(match[1], 10);
      if (isNaN(num) || num < rule.minValue) {
        return false;
      }
    }
  }
  return true;
}

// ─── SSH helpers ─────────────────────────────────────────────────────────────

function runDeviceShell(jumpHost, deviceIp, commands) {
  return new Promise((resolve) => {
    const overallTimeout = setTimeout(() => {
      resolve({ success: false, output: '', error: 'Device connection timeout' });
    }, 45000);

    jumpHost.forwardOut('127.0.0.1', 0, deviceIp, 22, (err, stream) => {
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
        let allChecksPassed = true;
        const checkDetails = [];

        for (const check of challenge.checks) {
          const deviceIp = DEVICE_MAP[check.device];
          if (!deviceIp) {
            checkDetails.push({
              device: check.device,
              passed: false,
              output: '',
              error: 'Unknown device'
            });
            allChecksPassed = false;
            continue;
          }

          const result = await runDeviceShell(jumpHost, deviceIp, check.commands);

          if (!result.success) {
            checkDetails.push({
              device: check.device,
              passed: false,
              output: result.output,
              error: result.error
            });
            allChecksPassed = false;
            continue;
          }

          const passed = evaluateMatches(result.output, check.matchRules);
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

    jumpHost.on('error', () => {
      clearTimeout(overallTimeout);
      resolve({
        eveIp,
        error: 'EVE connection failed',
        challengeResults: challenges.map(c => ({
          challengeId: c.id,
          passed: false,
          points: 0,
          maxPoints: c.points,
          error: 'EVE unreachable'
        }))
      });
    });

    jumpHost.connect({
      host: eveIp,
      port: 22,
      username: EVE_SERVER_USER,
      password: EVE_SERVER_PASS,
      readyTimeout: 20000
    });
  });
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

  // Generate HMAC-based session token
  const token = crypto
    .createHmac('sha256', API_SECRET_KEY)
    .update('admin-session')
    .digest('hex');

  res.json({ token });
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
    results: checkState.results
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
