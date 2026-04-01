// ============================================================
// MeetingDesk — app.js
// ============================================================

// ===================== STATE =====================
const DB_KEY    = 'meetingdesk_tenants';
const OWNERS_KEY = 'meetingdesk_owners';
let session = null; // { tenantId, companyName, role }

const AVATAR_PALETTES = [
  ['#EBF0FD', '#1A3FA3'],
  ['#E8F5EE', '#1A7A4A'],
  ['#FEF3E2', '#B85C00'],
  ['#F3F0FF', '#5B3FD4'],
  ['#FDEEF5', '#A0346B'],
  ['#E8F5FF', '#1A5FA3'],
];

// ===================== PASSWORD EYE TOGGLE =====================
function toggleEye(inputId, btn) {
  const inp  = document.getElementById(inputId);
  const show = inp.type === 'password';
  inp.type   = show ? 'text' : 'password';
  btn.innerHTML = show
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
         <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8
                  a18.45 18.45 0 015.06-5.94"/>
         <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8
                  a18.5 18.5 0 01-2.16 3.19"/>
         <line x1="1" y1="1" x2="23" y2="23"/>
       </svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
         <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
         <circle cx="12" cy="12" r="3"/>
       </svg>`;
}

// ===================== SOUND NOTIFICATIONS =====================
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, gain) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    vol.gain.setValueAtTime(gain, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* silently ignore */ }
}

function playSound(event) {
  if (event === 'accepted') {
    playTone(880,  'sine',     0.18, 0.18);
    setTimeout(() => playTone(1100, 'sine', 0.25, 0.14), 100);
  } else if (event === 'waiting') {
    playTone(600,  'sine',     0.25, 0.12);
  } else if (event === 'cancelled') {
    playTone(320,  'triangle', 0.28, 0.13);
    setTimeout(() => playTone(240, 'triangle', 0.22, 0.09), 120);
  } else if (event === 'add') {
    playTone(750,  'sine',     0.12, 0.10);
  }
}

// ===================== STORAGE HELPERS =====================
function getTenants()    { return JSON.parse(localStorage.getItem(DB_KEY)     || '[]'); }
function saveTenants(t)  { localStorage.setItem(DB_KEY,     JSON.stringify(t)); }
function getOwners()     { return JSON.parse(localStorage.getItem(OWNERS_KEY) || '[]'); }
function saveOwners(o)   { localStorage.setItem(OWNERS_KEY, JSON.stringify(o)); }

function tenantClients() {
  return getOwners().filter(o => o.tenantId === session.tenantId);
}

// ===================== REAL-TIME SYNC (BroadcastChannel) =====================
const channel = new BroadcastChannel('meetingdesk_sync');

channel.onmessage = (e) => {
  if (!session) return;
  if (e.data.tenantId !== session.tenantId) return;

  if (e.data.type === 'remove') {
    const cards = document.querySelectorAll(`.client-card[data-id="${e.data.id}"]`);
    cards.forEach(card => card.classList.add('removing'));
    setTimeout(() => { renderQueues(); }, 250);
    if (session.role === 'handler') showToast(`${e.data.name} removed from queue.`);
    return;
  }

  renderQueues();

  if (e.data.type === 'status' && session.role === 'handler') {
    const map = { accepted: '✅ Accepted', waiting: '⏳ Waiting', cancelled: '❌ Cancelled' };
    showToast(`Manager updated: ${e.data.name} → ${map[e.data.status] || e.data.status}`);
    playSound(e.data.status);
  }
  if (e.data.type === 'add' && session.role === 'manager') {
    showToast(`New client added: ${e.data.name}`);
    playSound('add');
  }
};

function broadcast(data) {
  channel.postMessage({ ...data, tenantId: session.tenantId });
}

// ===================== UI HELPERS =====================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'))
  );
  document.getElementById('panel-login').classList.toggle('active',    tab === 'login');
  document.getElementById('panel-register').classList.toggle('active', tab === 'register');
}

function selectRole(role) {
  document.getElementById('role-handler').classList.toggle('active', role === 'handler');
  document.getElementById('role-manager').classList.toggle('active', role === 'manager');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function getSelectedRole() {
  return document.getElementById('role-handler').classList.contains('active') ? 'handler' : 'manager';
}

function initials(name) {
  return name.trim().split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '??';
}

function clockTime(ts) {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ===================== AUTH =====================
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h.toString(16);
}

function doRegister() {
  const company = document.getElementById('reg-company').value.trim();
  const code    = document.getElementById('reg-code').value;
  const code2   = document.getElementById('reg-code2').value;
  const err     = document.getElementById('reg-err');
  err.textContent = '';

  if (!company)          { err.textContent = 'Company name is required.';        return; }
  if (code.length < 4)   { err.textContent = 'Code must be at least 4 characters.'; return; }
  if (code !== code2)    { err.textContent = 'Codes do not match.';              return; }

  const tenants = getTenants();
  if (tenants.find(t => t.name.toLowerCase() === company.toLowerCase())) {
    err.textContent = 'A company with this name already exists.'; return;
  }

  const tenant = { id: crypto.randomUUID(), name: company, codeHash: hashCode(code) };
  tenants.push(tenant);
  saveTenants(tenants);

  showToast('Company registered! You can now sign in.');
  switchTab('login');
  document.getElementById('login-company').value = company;
}

function doLogin() {
  const company = document.getElementById('login-company').value.trim();
  const code    = document.getElementById('login-code').value;
  const role    = getSelectedRole();
  const err     = document.getElementById('login-err');
  err.textContent = '';

  if (!company || !code) { err.textContent = 'Please fill in all fields.'; return; }

  const tenants = getTenants();
  const tenant  = tenants.find(t => t.name.toLowerCase() === company.toLowerCase());
  if (!tenant || tenant.codeHash !== hashCode(code)) {
    err.textContent = 'Company not found or incorrect code.'; return;
  }

  session = { tenantId: tenant.id, companyName: tenant.name, role };
  sessionStorage.setItem('mds_session', JSON.stringify(session));
  enterDashboard();
}

function logout() {
  session = null;
  sessionStorage.removeItem('mds_session');
  showScreen('landing');
}

function enterDashboard() {
  if (session.role === 'handler') {
    document.getElementById('h-company-name').textContent = session.companyName;
    showScreen('handler-screen');
  } else {
    document.getElementById('m-company-name').textContent = session.companyName;
    showScreen('manager-screen');
  }
  renderQueues();
}

// ===================== QUEUE =====================
function addClient() {
  const nameEl = document.getElementById('h-name');
  const jobEl  = document.getElementById('h-job');
  const name   = nameEl.value.trim();
  const job    = jobEl.value.trim();

  if (!name || !job) {
    if (!name) nameEl.classList.add('error');
    if (!job)  jobEl.classList.add('error');
    setTimeout(() => { nameEl.classList.remove('error'); jobEl.classList.remove('error'); }, 800);
    return;
  }

  const owners = getOwners();
  const owner  = {
    id: crypto.randomUUID(),
    tenantId: session.tenantId,
    name,
    job,
    status: 'pending',
    createdAt: Date.now(),
  };
  owners.push(owner);
  saveOwners(owners);

  nameEl.value = '';
  jobEl.value  = '';
  renderQueues();
  broadcast({ type: 'add', name });
  showToast(`${name} added to queue.`);
  playSound('add');
}

function setStatus(id, status, name) {
  const owners = getOwners();
  const o = owners.find(x => x.id === id);
  if (o) o.status = status;
  saveOwners(owners);
  renderQueues();
  broadcast({ type: 'status', id, status, name });
  playSound(status);
}

function removeClient(id, name) {
  const cards = document.querySelectorAll(`.client-card[data-id="${id}"]`);
  cards.forEach(card => card.classList.add('removing'));

  setTimeout(() => {
    const owners = getOwners().filter(o => o.id !== id);
    saveOwners(owners);
    renderQueues();
    broadcast({ type: 'remove', id, name });
    showToast(`${name} removed from queue.`);
  }, 250);
}

function avatarStyle(idx) {
  const [bg, color] = AVATAR_PALETTES[idx % AVATAR_PALETTES.length];
  return `background:${bg}; color:${color};`;
}

const statusLabels  = { pending: 'Pending', accepted: 'Accepted', waiting: 'Waiting', cancelled: 'Cancelled' };
const STATUS_CLASSES = ['pending', 'accepted', 'waiting', 'cancelled'];

function createCardEl(o, idx, showActions) {
  const safeName = o.name.replace(/'/g, "\\'");
  const el = document.createElement('div');
  el.className  = `client-card ${o.status}`;
  el.dataset.id = o.id;

  el.innerHTML = `
    <div class="avatar" style="${avatarStyle(idx)}">${initials(o.name)}</div>
    <div class="client-info">
      <div class="client-name">${o.name}</div>
      <div class="client-job">${o.job}</div>
      <div class="client-time" data-ts="${o.createdAt}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Arrived ${clockTime(o.createdAt)} &middot; <span class="ago-label">${timeAgo(o.createdAt)}</span>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0;">
      <span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:var(--text3);">Status</span>
      <span class="status-tag ${o.status}">${statusLabels[o.status]}</span>
    </div>
    ${showActions ? `
    <div class="action-group">
      <button class="act-btn acc" onclick="setStatus('${o.id}','accepted','${safeName}')">Accept</button>
      <button class="act-btn wai" onclick="setStatus('${o.id}','waiting','${safeName}')">Wait</button>
      <button class="act-btn can" onclick="setStatus('${o.id}','cancelled','${safeName}')">Cancel</button>
      <button class="act-btn rem" title="Remove" onclick="removeClient('${o.id}','${safeName}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>` : `
    <button class="act-btn rem" title="Remove" onclick="removeClient('${o.id}','${safeName}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4h6v2"/>
      </svg>
    </button>
    `}
  `;
  return el;
}

function updateCardEl(el, o) {
  STATUS_CLASSES.forEach(s => el.classList.remove(s));
  el.classList.add(o.status);
  const tag = el.querySelector('.status-tag');
  if (tag) {
    tag.className   = `status-tag ${o.status}`;
    tag.textContent = statusLabels[o.status];
  }
}

function renderQueue(containerId, countId, showActions) {
  const el  = document.getElementById(containerId);
  const cnt = document.getElementById(countId);
  if (!el) return;

  const owners = tenantClients();
  cnt.textContent = owners.length;

  if (owners.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📋</div>No clients in queue yet.</div>`;
    return;
  }

  // Remove stale empty state if present
  const emptyEl = el.querySelector('.empty');
  if (emptyEl) el.innerHTML = '';

  // Build a map of existing DOM cards by owner id
  const existing = {};
  el.querySelectorAll('.client-card[data-id]').forEach(c => { existing[c.dataset.id] = c; });

  const seen = new Set();
  owners.forEach((o, idx) => {
    seen.add(o.id);
    if (existing[o.id]) {
      updateCardEl(existing[o.id], o);
    } else {
      el.appendChild(createCardEl(o, idx, showActions));
    }
  });

  // Remove cards for owners that no longer exist
  Object.keys(existing).forEach(id => {
    if (!seen.has(id)) existing[id].remove();
  });
}

function renderQueues() {
  if (!session) return;
  renderQueue('h-queue', 'h-count', false);
  renderQueue('m-queue', 'm-count', true);
}

// ===================== INIT =====================
// Restore session on reload
const saved = sessionStorage.getItem('mds_session');
if (saved) {
  session = JSON.parse(saved);
  enterDashboard();
}

// Enter key support
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (document.getElementById('panel-login').classList.contains('active'))    doLogin();
    else if (document.getElementById('panel-register').classList.contains('active')) doRegister();
  }
  if (e.key === 'Enter' && session?.role === 'handler') addClient();
});

// Auto-refresh relative time labels every 60s
setInterval(() => {
  if (!session) return;
  document.querySelectorAll('.client-time[data-ts]').forEach(el => {
    const ago = el.querySelector('.ago-label');
    if (ago) ago.textContent = timeAgo(Number(el.dataset.ts));
  });
}, 60_000);

// Listen for localStorage changes from other tabs
window.addEventListener('storage', e => {
  if (e.key === OWNERS_KEY && session) renderQueues();
});
