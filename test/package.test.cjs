const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const pkg = require('../dist/index.js');

test('reporter helpers call documented API endpoints with Bearer auth', async () => {
  const calls = [];
  const originalFetch = global.fetch;

  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith('/status') && options.method === 'GET') {
      return {
        ok: true,
        json: async () => ({ status: 'active' })
      };
    }
    if (url.endsWith('/logs') && options.method === 'GET') {
      return {
        ok: true,
        json: async () => ([{ message: 'ok' }])
      };
    }
    return {
      ok: true,
      json: async () => ({ ok: true })
    };
  };

  try {
    await pkg.heartbeat('agent-1', 'secret-1');
    await pkg.reportTask('agent-1', 'secret-1', 2);
    await pkg.reportLog('agent-1', 'secret-1', 'Completed task', 'success');
    await pkg.setStatus('agent-1', 'secret-1', 'active');
    const status = await pkg.getStatus('secret-1');
    const logs = await pkg.getLogs('secret-1');

    assert.equal(status.status, 'active');
    assert.equal(Array.isArray(logs), true);

    const heartbeatCall = calls.find((c) => c.url.endsWith('/heartbeat'));
    assert.ok(heartbeatCall);
    assert.equal(heartbeatCall.options.method, 'POST');
    assert.equal(heartbeatCall.options.headers.Authorization, 'Bearer secret-1');

    const taskCall = calls.find((c) => c.url.endsWith('/tasks'));
    assert.ok(taskCall);
    assert.match(taskCall.options.body, /"count":2/);
    assert.match(taskCall.options.body, /"agentName":"agent-1"/);

    const statusGetCall = calls.find((c) => c.url.endsWith('/status') && c.options.method === 'GET');
    assert.ok(statusGetCall);
    assert.equal(statusGetCall.options.headers.Authorization, 'Bearer secret-1');

    const logsGetCall = calls.find((c) => c.url.endsWith('/logs') && c.options.method === 'GET');
    assert.ok(logsGetCall);
  } finally {
    global.fetch = originalFetch;
  }
});

test('createOrientation writes docs with API docs reference and secures gitignore', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openshield-test-'));
  const openClawRoot = path.join(tmpDir, 'openclaw-home');
  const originalCwd = process.cwd();

  try {
    process.chdir(tmpDir);

    const secret = await pkg.createOrientation({
      name: 'demo-agent',
      description: 'demo',
      role: 'assistant',
      tools: ['shell', 'network'],
      owner: 'qa',
      openClawRoot
    });

    assert.ok(secret);

    const sopPath = path.join(tmpDir, 'orientation', 'SOPs.md');
    const dashboardPath = path.join(tmpDir, 'orientation', 'dashboard.md');
    const credsPath = path.join(tmpDir, 'orientation', 'API_creds.md');
    const gitignorePath = path.join(tmpDir, '.gitignore');

    const sops = await fs.readFile(sopPath, 'utf8');
    const dashboard = await fs.readFile(dashboardPath, 'utf8');
    const creds = await fs.readFile(credsPath, 'utf8');
    const gitignore = await fs.readFile(gitignorePath, 'utf8');

    assert.match(sops, /agents\.openshield\.cc\/docs\/api/);
    assert.match(dashboard, /agents\.openshield\.cc\/docs\/api/);
    assert.match(creds, /Agent Secret:/);
    assert.match(gitignore, /orientation\/API_creds\.md/);
  } finally {
    process.chdir(originalCwd);
  }
});
