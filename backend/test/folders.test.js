const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const jwt = require('jsonwebtoken');

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/storex_test';
process.env.JWT_SECRET ??= 'storex-test-secret';

const app = require('../src/app');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

function authorizationHeader() {
  const token = jwt.sign(
    { userId: '4a4b9d1c-645d-4c69-8dd5-0290a7fb55b4', role: 'USER' },
    process.env.JWT_SECRET
  );

  return { Authorization: `Bearer ${token}` };
}

test('folder routes require authentication', async () => {
  const response = await fetch(`${baseUrl}/api/folders`);

  assert.equal(response.status, 401);
});

test('folder routes reject malformed identifiers before querying the database', async () => {
  const response = await fetch(`${baseUrl}/api/folders/not-a-uuid`, {
    headers: authorizationHeader(),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: 'Folder id must be a valid UUID.' });
});

test('folder creation rejects blank names before querying the database', async () => {
  const response = await fetch(`${baseUrl}/api/folders`, {
    method: 'POST',
    headers: { ...authorizationHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '   ' }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: 'Folder name is required.' });
});