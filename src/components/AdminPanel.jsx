import { useCallback, useEffect, useState } from 'react';
import { LogOut, Plus, RefreshCw, Trash2 } from 'lucide-react';
import './AdminPanel.css';

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [listings, setListings] = useState([]);
  const [mint, setMint] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const loadListings = useCallback(async () => setListings(await request('/api/admin/listings')), []);
  useEffect(() => {
    request('/api/admin/session').then(data => { setUser(data); return loadListings(); }).catch(() => {}).finally(() => setChecking(false));
  }, [loadListings]);

  const act = async (callback, success) => {
    setBusy(true); setMessage(null);
    try { await callback(); setMessage({ type: 'success', text: success }); }
    catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };
  const login = (event) => {
    event.preventDefault();
    act(async () => { const data = await request('/api/admin/login', { method: 'POST', body: JSON.stringify(credentials) }); setUser(data); await loadListings(); }, 'Signed in.');
  };
  const addListing = (event) => {
    event.preventDefault();
    act(async () => { await request('/api/admin/listings', { method: 'POST', body: JSON.stringify({ mint }) }); setMint(''); await loadListings(); }, 'Token listed successfully.');
  };
  const toggle = (listing) => act(async () => { await request(`/api/admin/listings/${listing.id}`, { method: 'PATCH', body: JSON.stringify({ active: !listing.active }) }); await loadListings(); }, listing.active ? 'Token delisted.' : 'Token relisted.');
  const remove = (listing) => {
    if (!window.confirm('Permanently remove this listing?')) return;
    act(async () => { await request(`/api/admin/listings/${listing.id}`, { method: 'DELETE' }); await loadListings(); }, 'Listing removed.');
  };
  const logout = () => act(async () => { await request('/api/admin/logout', { method: 'POST' }); setUser(null); setListings([]); }, 'Signed out.');

  if (checking) return <main className="admin-shell"><div className="admin-card">Checking session…</div></main>;
  if (!user) return (
    <main className="admin-shell">
      <form className="admin-card login-card" onSubmit={login}>
        <a className="admin-brand" href="/">USDARK<span>DEX</span></a>
        <p className="eyebrow">CONTROL ROOM</p><h1>Admin access</h1><p className="muted">Sign in to manage the tokens shown in Markets.</p>
        {message && <div className={`notice ${message.type}`}>{message.text}</div>}
        <label>Username<input autoComplete="username" required value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} /></label>
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <a className="back-link" href="/">← Back to exchange</a>
      </form>
    </main>
  );
  return (
    <main className="admin-shell dashboard">
      <header><div><a className="admin-brand" href="/">USDARK<span>DEX</span></a><p>Listing administration</p></div><button className="ghost" onClick={logout}><LogOut size={16}/> Sign out</button></header>
      <section className="admin-stats"><div><span>Active markets</span><strong>{listings.filter(x => x.active).length}</strong></div><div><span>Delisted</span><strong>{listings.filter(x => !x.active).length}</strong></div><div><span>Total records</span><strong>{listings.length}</strong></div></section>
      <section className="admin-card wide">
        <div className="section-heading"><div><p className="eyebrow">NEW MARKET</p><h2>Add a listing</h2></div></div>
        <form className="mint-form" onSubmit={addListing}><input required placeholder="Solana token mint address" value={mint} onChange={e => setMint(e.target.value)} /><button className="primary" disabled={busy}><Plus size={17}/> List token</button></form>
        {message && <div className={`notice ${message.type}`}>{message.text}</div>}
      </section>
      <section className="admin-card wide">
        <div className="section-heading"><div><p className="eyebrow">INVENTORY</p><h2>Managed listings</h2></div><button className="icon-button" title="Refresh" onClick={() => act(loadListings, 'Listings refreshed.')}><RefreshCw size={17}/></button></div>
        <div className="listing-table"><div className="table-head"><span>Mint address</span><span>Status</span><span>Actions</span></div>
          {listings.map(listing => <div className="listing-row" key={listing.id}><code>{listing.mint}</code><span className={`status ${listing.active ? 'active' : 'inactive'}`}>{listing.active ? 'Listed' : 'Delisted'}</span><div className="actions"><button className={listing.active ? 'danger-outline' : 'success-outline'} disabled={busy} onClick={() => toggle(listing)}>{listing.active ? 'Delist' : 'Relist'}</button><button className="icon-button delete" disabled={busy} title="Delete permanently" onClick={() => remove(listing)}><Trash2 size={16}/></button></div></div>)}
          {!listings.length && <p className="empty">No listings yet.</p>}
        </div>
      </section>
    </main>
  );
}
