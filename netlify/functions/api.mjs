import { getStore } from '@netlify/blobs';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

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

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const response = (status, data, extra = {}) => new Response(JSON.stringify(data), { status, headers: { ...headers, ...extra } });
const validMint = (mint) => typeof mint === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint);
const config = () => ({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD, secret: process.env.SESSION_SECRET });
const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('hex');

function authenticated(request, secret) {
  const raw = (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith('admin_session='))?.slice(14);
  if (!raw) return false;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload, secret);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).expiresAt > Date.now(); } catch { return false; }
}

function passwordMatches(input, configured) {
  return timingSafeEqual(scryptSync(String(input), 'usdark-admin-login', 64), scryptSync(configured, 'usdark-admin-login', 64));
}

function seededListings() {
  const now = new Date().toISOString();
  return seedMints.map((mint, position) => ({ id: randomBytes(8).toString('hex'), mint, active: true, position, createdAt: now }));
}

async function storage() {
  const store = getStore({ name: 'usdark-listings', consistency: 'strong' });
  let listings = await store.get('listings', { type: 'json' });
  if (!listings) {
    listings = seededListings();
    await store.setJSON('listings', listings, { onlyIfNew: true });
    listings = await store.get('listings', { type: 'json' }) || listings;
  }
  return { store, listings };
}

export default async (request) => {
  try {
    const url = new URL(request.url);
    const marker = '/api/';
    const functionMarker = '/.netlify/functions/api/';
    const path = `/${url.pathname.includes(functionMarker) ? url.pathname.split(functionMarker)[1] : url.pathname.split(marker)[1] || ''}`;
    const { username, password, secret } = config();

    if (request.method === 'GET' && path === '/listings') {
      const { listings } = await storage();
      return response(200, listings.filter(item => item.active).sort((a, b) => a.position - b.position));
    }
    if (!username || !password || !secret || secret.length < 32) return response(500, { error: 'Admin environment variables are not configured in Netlify' });
    if (request.method === 'POST' && path === '/admin/login') {
      const data = await request.json();
      if (data.username !== username || !passwordMatches(data.password, password)) return response(401, { error: 'Invalid username or password' });
      const payload = Buffer.from(JSON.stringify({ username, expiresAt: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
      return response(200, { username }, { 'Set-Cookie': `admin_session=${payload}.${sign(payload, secret)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800` });
    }
    if (request.method === 'POST' && path === '/admin/logout') return response(200, { ok: true }, { 'Set-Cookie': 'admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0' });
    if (!authenticated(request, secret)) return response(401, { error: 'Authentication required' });
    if (request.method === 'GET' && path === '/admin/session') return response(200, { username });

    const { store, listings } = await storage();
    if (request.method === 'GET' && path === '/admin/listings') return response(200, listings.sort((a, b) => a.position - b.position));
    if (request.method === 'POST' && path === '/admin/listings') {
      const data = await request.json();
      const mint = String(data.mint || '').trim();
      if (!validMint(mint)) return response(400, { error: 'Enter a valid Solana mint address' });
      if (listings.some(item => item.mint === mint)) return response(409, { error: 'That mint is already listed' });
      const listing = { id: randomBytes(8).toString('hex'), mint, active: true, position: listings.length, createdAt: new Date().toISOString() };
      listings.push(listing); await store.setJSON('listings', listings); return response(201, listing);
    }
    const match = path.match(/^\/admin\/listings\/([a-f0-9]+)$/);
    if (match && request.method === 'PATCH') {
      const listing = listings.find(item => item.id === match[1]);
      if (!listing) return response(404, { error: 'Listing not found' });
      const data = await request.json();
      if (typeof data.active === 'boolean') listing.active = data.active;
      await store.setJSON('listings', listings); return response(200, listing);
    }
    if (match && request.method === 'DELETE') {
      const next = listings.filter(item => item.id !== match[1]);
      if (next.length === listings.length) return response(404, { error: 'Listing not found' });
      await store.setJSON('listings', next); return response(200, { ok: true });
    }
    return response(404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    return response(500, { error: 'Internal server error' });
  }
};
