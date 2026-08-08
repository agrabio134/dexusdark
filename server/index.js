import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dataDir = join(root, 'data');
const dataFile = join(dataDir, 'listings.json');
const isDev = process.argv.includes('--dev');

async function loadEnv() {
  const path = join(root, '.env');
  if (!existsSync(path)) return;
  for (const line of (await readFile(path, 'utf8')).split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match && process.env[match[1].trim()] === undefined) process.env[match[1].trim()] = match[2].trim();
  }
}
await loadEnv();

const port = Number(process.env.PORT || 5173);
const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
const sessionSecret = process.env.SESSION_SECRET;
if (!adminUsername || !adminPassword || !sessionSecret || sessionSecret.length < 32) {
  throw new Error('ADMIN_USERNAME, ADMIN_PASSWORD, and a 32+ character SESSION_SECRET are required. Copy .env.example to .env.');
}

const seedMints = [
  '4EKDKWJDrqrCQtAD6j9sM5diTeZiKBepkEB8GLP9Dark', 'A8YHuvQBMAxXoZAZE72FyC8B7jKHo8RJyByXRRffpump',
  'E7ErFx5dRoAxnDphWRmE8DjfJBr2fvjvnX3cgaj6pump', 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL', 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', '4NGbC4RRrUjS78ooSN53Up7gSg4dGrj6F6dxpMWHbonk',
  '5TfqNKZbn9AnNtzq8bbkyhKgcPGTfNDc9wNzFrTBpump', 'GP7m3USdHDSrNoUzsZqZTboKaJiabFQShzgV2RkFnZyh',
  '4k2HDtWVYMpHQSxts28HdMyK8AnJ8adkRF5cHnAKpump', 'Gc5hxBYZjxWNpt3B8XYbp4YoGCHSMfrJK7ex4GUTpump',
  'CZy3nB9ET6SxBDdAnd7zcaGiPU8JnFQWCwdEZfWhpump', 'GFJbQ7WDQry73iTaGkJcXKjvi1ViFTFmHSENgz92jFPP',
  'ADMiFUmFUz3tzLozh7yTy2zWe1soM61aE995TZqLpump', '6cNcXWqYvK9nhD1TsjJ1ZH1KATXcaPaRJtZPHyVkJoBs',
  'ALR5X2H6THn2VDPoMtkVwxVktcN1kQGvxCwLfejzpump', '43YakhC3TcSuTgSXnxFgw8uKL8VkuLuFa4M6Bninpump',
  '5oBshGwHKNTSk4KrTridfMmNGWk39K3k8jnxm1hxpump', 'EMeugag3yfyvKqNKknGDWAudNALafZjbv9ByzCE8pump',
  '86ZnAujEVLmtnNazeCeT1zYR7hn2PeF5ZPEwUkTdpump'
];

async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dataFile)) {
    const now = new Date().toISOString();
    await writeFile(dataFile, JSON.stringify(seedMints.map((mint, index) => ({ id: randomBytes(8).toString('hex'), mint, active: true, position: index, createdAt: now })), null, 2));
  }
}
async function readListings() { await ensureDb(); return JSON.parse(await readFile(dataFile, 'utf8')); }
async function saveListings(listings) {
  const temp = `${dataFile}.tmp`;
  await writeFile(temp, JSON.stringify(listings, null, 2));
  await rename(temp, dataFile);
}

const sessions = new Map();
const sign = (value) => createHmac('sha256', sessionSecret).update(value).digest('hex');
function sessionFrom(req) {
  const raw = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('admin_session='))?.slice(14);
  if (!raw) return null;
  const [id, signature] = raw.split('.');
  if (!id || !signature || sign(id) !== signature) return null;
  const session = sessions.get(id);
  if (!session || session.expiresAt < Date.now()) { sessions.delete(id); return null; }
  return session;
}
function safePasswordMatch(input) {
  const salt = 'usdark-admin-login';
  return timingSafeEqual(scryptSync(String(input), salt, 64), scryptSync(adminPassword, salt, 64));
}
function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}
async function body(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 100_000) throw new Error('Request too large'); }
  return raw ? JSON.parse(raw) : {};
}
function validMint(mint) { return typeof mint === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint); }

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/listings') {
    const listings = await readListings();
    return json(res, 200, listings.filter(x => x.active).sort((a, b) => a.position - b.position));
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    const data = await body(req);
    if (data.username !== adminUsername || !safePasswordMatch(data.password)) return json(res, 401, { error: 'Invalid username or password' });
    const id = randomBytes(32).toString('hex');
    sessions.set(id, { username: adminUsername, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return json(res, 200, { username: adminUsername }, { 'Set-Cookie': `admin_session=${id}.${sign(id)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}` });
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
    const session = sessionFrom(req);
    if (session) for (const [id, value] of sessions) if (value === session) sessions.delete(id);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }
  const session = sessionFrom(req);
  if (!session) return json(res, 401, { error: 'Authentication required' });
  if (req.method === 'GET' && url.pathname === '/api/admin/session') return json(res, 200, { username: session.username });
  if (req.method === 'GET' && url.pathname === '/api/admin/listings') return json(res, 200, (await readListings()).sort((a, b) => a.position - b.position));
  if (req.method === 'POST' && url.pathname === '/api/admin/listings') {
    const data = await body(req);
    const mint = String(data.mint || '').trim();
    if (!validMint(mint)) return json(res, 400, { error: 'Enter a valid Solana mint address' });
    const listings = await readListings();
    if (listings.some(x => x.mint === mint)) return json(res, 409, { error: 'That mint is already listed' });
    const listing = { id: randomBytes(8).toString('hex'), mint, active: true, position: listings.length, createdAt: new Date().toISOString() };
    listings.push(listing); await saveListings(listings); return json(res, 201, listing);
  }
  const match = url.pathname.match(/^\/api\/admin\/listings\/([a-f0-9]+)$/);
  if (match && req.method === 'PATCH') {
    const data = await body(req); const listings = await readListings(); const listing = listings.find(x => x.id === match[1]);
    if (!listing) return json(res, 404, { error: 'Listing not found' });
    if (typeof data.active === 'boolean') listing.active = data.active;
    await saveListings(listings); return json(res, 200, listing);
  }
  if (match && req.method === 'DELETE') {
    const listings = await readListings(); const next = listings.filter(x => x.id !== match[1]);
    if (next.length === listings.length) return json(res, 404, { error: 'Listing not found' });
    await saveListings(next); return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: 'Not found' });
}

let vite;
if (isDev) {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({ root, server: { middlewareMode: true }, appType: 'spa' });
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (vite) return vite.middlewares(req, res, () => json(res, 404, { error: 'Not found' }));
    const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    let file = resolve(root, 'dist', requested);
    if (!file.startsWith(resolve(root, 'dist')) || !existsSync(file)) file = join(root, 'dist', 'index.html');
    res.writeHead(200, { 'Content-Type': `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8` });
    createReadStream(file).pipe(res);
  } catch (error) { console.error(error); json(res, 500, { error: 'Internal server error' }); }
});
server.listen(port, () => console.log(`USDARK ${isDev ? 'development' : 'production'} server running at http://localhost:${port}`));
