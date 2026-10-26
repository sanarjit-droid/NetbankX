const $=s=>document.querySelector(s);
const BRAND_GLYPH='<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 46V18L46 46V18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><g fill="#fff"><circle cx="18" cy="46" r="6.5"/><circle cx="18" cy="18" r="6.5"/><circle cx="46" cy="46" r="6.5"/><circle cx="46" cy="18" r="6.5"/></g><g fill="#09192b"><circle cx="18" cy="46" r="2.6"/><circle cx="18" cy="18" r="2.6"/><circle cx="46" cy="46" r="2.6"/><circle cx="46" cy="18" r="2.6"/></g></svg>';
const safeUUID=()=>window.crypto?.randomUUID?window.crypto.randomUUID():'idem-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
const state={
  token:localStorage.getItem('netbankx_token')||localStorage.getItem('paysafe_token')||'',
  user:null,
  page:'Overview',
  dashboard:null,
  topology:null,
  simulation:null,
  loss:0,
  seed:42,
  search:'',
  txFilter:'ALL',
  txScope:'INTERNAL',
  allTransactions:null,
  simSource:'CUST-01',
  simDest:'CUST-02',
  simAmount:'2500.00',
  simRef:'Customer payment',
  simTamper:false
};
const navIcons={
  'Overview':'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
  'Organization':'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/><path d="M14 9h1"/><path d="M14 13h1"/><path d="M14 17h1"/></svg>',
  'Customers':'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  'Transactions':'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  'Network Simulator':'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/></svg>',
  'Security & Audit':'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  'Reports':'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'
};
const navItems=[
  ['Overview',navIcons['Overview']],
  ['Organization',navIcons['Organization']],
  ['Customers',navIcons['Customers']],
  ['Transactions',navIcons['Transactions']],
  ['Network Simulator',navIcons['Network Simulator']],
  ['Security & Audit',navIcons['Security & Audit']],
  ['Reports',navIcons['Reports']]
];
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n||0);
const fmtDate=d=>!d?'—':new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function api(path,options={}){
  const r=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...(state.token?{Authorization:`Bearer ${state.token}`}:{}),...(options.headers||{})}});
  const d=await r.json().catch(()=>({error:'Unexpected server response'}));
  if(!r.ok){
    if(r.status===401&&path!=='/auth/login'){
      localStorage.removeItem('netbankx_token');
      localStorage.removeItem('paysafe_token');
      state.token='';state.user=null;state.dashboard=null;state.topology=null;state.simulation=null;state.allTransactions=null;
      showLogin();
    }
    throw Error(d.error||`Request failed (${r.status})`);
  }
  return d;
}

let toastTimer;
function toast(msg){
  const el=$('#toast');
  if(!el)return;
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),3800);
}

function shell(){
  const u=state.user;
  const isCust=u.role==='CUSTOMER';
  const isBranchMgr=u.role==='BRANCH_MANAGER';

  const allowedNav=navItems.filter(([n])=>{
    if(isCust)return !['Security & Audit','Customers','Organization'].includes(n);
    if(isBranchMgr)return !['Security & Audit','Organization'].includes(n);
    return true;
  });

  $('#app').innerHTML=`<div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark" role="img" aria-label="NetBankX">${BRAND_GLYPH}</div>
        <div>
          <div class="brand-name">NetBank<span>X</span></div>
          <div class="brand-sub">ENTERPRISE BANKING LAB</div>
        </div>
      </div>
      <div>
        <div class="nav-label">WORKSPACE</div>
        <nav class="nav">${allowedNav.map(([n,i])=>`<button data-page="${n}" class="${state.page===n?'active':''}"><span class="nav-ico">${i}</span>${n}</button>`).join('')}</nav>
      </div>
      <div class="side-bottom">
        <div class="sidebar-system-card">
          <div class="sys-pulse"><span class="pulse-indicator"></span> NetBankX Core Active</div>
          <div class="sys-spec">40 Gbps backbone · Latency: 14ms · AES-256-GCM verification online</div>
          <div class="sys-badge">${esc(u.role.replaceAll('_',' '))} CLEARANCE</div>
        </div>
        <div class="sidebar-role-pill">
          <span>Assigned Node</span>
          <b>${esc(u.branchId || u.regionId || 'HQ-CORE')}</b>
        </div>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div>
          <div class="crumb">NetBankX / <span id="crumb">${state.page}</span></div>
          <h2 id="top-title">${state.page}</h2>
        </div>
        <div class="top-actions">
          <button class="icon-button" id="refresh" title="Refresh data">↻</button>
          <div class="userbox">
            <div class="avatar">${esc((u.name||'U').split(' ').map(x=>x[0]).slice(0,2).join(''))}</div>
            <div class="user-meta">
              <div class="user-name">${esc(u.name)}</div>
              <div class="user-role">${esc(u.role.replaceAll('_',' '))}</div>
            </div>
          </div>
          <button class="button small" id="logout">Sign out</button>
        </div>
      </header>
      <section class="content" id="content"><div class="empty">Loading workspace…</div></section>
    </main>
  </div>`;
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));
  $('#refresh').onclick=()=>{state.dashboard=null;state.topology=null;state.allTransactions=null;loadPage()};
  $('#logout').onclick=logout;
  loadPage();
}

async function go(page){
  state.page=page;
  document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const t=$('#top-title'),c=$('#crumb');
  if(t)t.textContent=page;
  if(c)c.textContent=page;
  await loadPage();
}

async function loadPage(){
  const c=$('#content');
  c.innerHTML='<div class="empty">Loading secure workspace…</div>';
  try{
    if(!state.dashboard)state.dashboard=await api('/dashboard');
    if(state.user?.role==='CUSTOMER'&&['Customers','Organization','Security & Audit'].includes(state.page)){
      state.page='Overview';
    }
    if(state.user?.role==='BRANCH_MANAGER'&&['Organization','Security & Audit'].includes(state.page)){
      state.page='Overview';
    }
    if(state.page==='Overview')renderOverview();
    else if(state.page==='Network Simulator')renderNetwork();
    else if(state.page==='Transactions')await renderTransactions();
    else if(state.page==='Customers')await renderCustomers();
    else if(state.page==='Organization')renderOrganization();
    else if(state.page==='Security & Audit')await renderSecurity();
    else if(state.page==='Reports')await renderReports();
  }catch(e){
    c.innerHTML=`<div class="panel"><div class="empty">${esc(e.message)}<br><br><button class="button" onclick="location.reload()">Reload workspace</button></div></div>`;
  }
}

function stat(label,value,icon,foot='',tone=''){
  return `<div class="metric"><div class="metric-head">${label}<span class="metric-icon ${tone}">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-foot">${foot}</div></div>`;
}

function status(s){
  let cl=s==='COMPLETED'||s==='online'||s==='active'?'':s==='FAILED'||s==='offline'||s==='BLOCKED'||s==='TAMPERED'?'failed':s==='SIMULATING'||s==='RETRYING'?'pending':'neutral';
  return `<span class="status ${cl}">${esc(s)}</span>`;
}

function txRows(rows){
  return rows.map(t=>`<tr>
    <td class="mono">${esc(t.id)}</td>
    <td>${esc(t.type)}</td>
    <td>${esc(t.source||'—')}</td>
    <td>${esc(t.destination||'—')}</td>
    <td class="money">${money(t.amount)}</td>
    <td>${status(t.tampered ? 'TAMPERED' : t.status)}</td>
    <td>${fmtDate(t.createdAt)}</td>
    <td><button class="button small" data-tx-details="${esc(t.id)}">Details ↗</button></td>
  </tr>`).join('')||'<tr><td colspan="8" class="empty">No transactions recorded.</td></tr>';
}

function trendChart(){
  return `<div class="chart-wrap"><svg viewBox="0 0 560 205" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#16a995" stop-opacity=".18"/><stop offset="100%" stop-color="#16a995" stop-opacity="0"/></linearGradient></defs>${[25,65,105,145,185].map(y=>`<line x1="34" y1="${y}" x2="548" y2="${y}" class="chart-grid"/>`).join('')}<text x="0" y="28" class="chart-label">₹30k</text><text x="0" y="68" class="chart-label">₹20k</text><text x="0" y="108" class="chart-label">₹10k</text><text x="0" y="148" class="chart-label">₹5k</text><path d="M35 140 C70 130 75 100 112 113 S164 150 205 91 S268 118 305 72 S365 98 405 58 S470 81 510 36 L548 48 L548 185 L35 185 Z" fill="url(#fill)"/><path d="M35 140 C70 130 75 100 112 113 S164 150 205 91 S268 118 305 72 S365 98 405 58 S470 81 510 36 L548 48" fill="none" stroke="#16a995" stroke-width="2.5" stroke-linecap="round"/><path d="M35 154 C75 147 83 159 112 145 S170 160 205 137 S268 148 305 128 S370 144 405 116 S470 129 510 107 L548 113" fill="none" stroke="#7fa8c5" stroke-width="2" stroke-dasharray="4 5"/>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>`<text x="${42+i*83}" y="201" class="chart-label">${d}</text>`).join('')}</svg></div>`;
}

function miniTopology(){
  return `<svg viewBox="0 0 670 160" role="img" aria-label="Hierarchical enterprise network tree">
    <!-- Level 0 to Level 1 lines -->
    <line x1="335" y1="20" x2="180" y2="52" stroke="#c4d5de" stroke-width="1.8" class="topo-l01"/>
    <line x1="335" y1="20" x2="335" y2="58" stroke="#c4d5de" stroke-width="1.8" class="topo-l01"/>
    <line x1="335" y1="20" x2="490" y2="52" stroke="#c4d5de" stroke-width="1.8" class="topo-l01"/>
    <!-- Level 1 to Level 2 lines -->
    <line x1="180" y1="52" x2="135" y2="88" stroke="#c4d5de" stroke-width="1.5" class="topo-l12"/>
    <line x1="180" y1="52" x2="225" y2="102" stroke="#c4d5de" stroke-width="1.5" class="topo-l12"/>
    <line x1="335" y1="58" x2="290" y2="88" stroke="#c4d5de" stroke-width="1.5" class="topo-l12"/>
    <line x1="335" y1="58" x2="380" y2="102" stroke="#c4d5de" stroke-width="1.5" class="topo-l12"/>
    <line x1="490" y1="52" x2="445" y2="88" stroke="#c4d5de" stroke-width="1.5" class="topo-l12"/>
    <line x1="490" y1="52" x2="535" y2="102" stroke="#c4d5de" stroke-width="1.5" class="topo-l12"/>
    <!-- Level 2 to Level 3 customer lines (staggered) -->
    ${[
      [[135, 88], [[115, 128], [135, 138], [155, 128]]],
      [[225, 102], [[205, 136], [225, 146], [245, 136]]],
      [[290, 88], [[270, 128], [290, 138], [310, 128]]],
      [[380, 102], [[360, 136], [380, 146], [400, 136]]],
      [[445, 88], [[425, 128], [445, 138], [465, 128]]],
      [[535, 102], [[515, 136], [535, 146], [555, 136]]]
    ].map(([[bx, by], pts]) => pts.map(([cx, cy]) => `<line x1="${bx}" y1="${by}" x2="${cx}" y2="${cy}" stroke="#d5e3ec" stroke-width="1" class="topo-l23"/>`).join('')).join('')}
    <!-- Level 3 Customers (18 dots staggered) -->
    ${[
      [115, 128], [135, 138], [155, 128],
      [205, 136], [225, 146], [245, 136],
      [270, 128], [290, 138], [310, 128],
      [360, 136], [380, 146], [400, 136],
      [425, 128], [445, 138], [465, 128],
      [515, 136], [535, 146], [555, 136]
    ].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="4" fill="#fff3dc" stroke="#c78a26" stroke-width="1.2" class="topo-node-cust"/>`).join('')}
    <!-- Level 2 Branches (6 nodes staggered up/down) -->
    ${[
      [135, 88], [225, 102],
      [290, 88], [380, 102],
      [445, 88], [535, 102]
    ].map(([bx, by]) => `<circle cx="${bx}" cy="${by}" r="7" fill="#e3f7f2" stroke="#1aa995" stroke-width="1.4" class="topo-node-bank"/>`).join('')}
    <!-- Level 1 Regions (3 nodes) -->
    ${[
      [180, 52], [335, 58], [490, 52]
    ].map(([rx, ry]) => `<circle cx="${rx}" cy="${ry}" r="9.5" fill="#e8efff" stroke="#6689d8" stroke-width="1.6" class="topo-node-reg"/>`).join('')}
    <!-- Level 0 HQ Core (1 node) -->
    <circle cx="335" cy="20" r="12" fill="#183e5e" stroke="#183e5e" stroke-width="2" class="topo-node-hq"/>
    <text x="335" y="23" text-anchor="middle" font-size="7.5" fill="white" font-weight="800" class="topo-txt-hq">HQ</text>
    <text x="14" y="24" font-size="8" fill="#718596" font-weight="700" class="topo-lvl-0">L0: 1 HQ Core</text>
    <text x="14" y="58" font-size="8" fill="#6689d8" font-weight="700" class="topo-lvl-1">L1: 3 Regions</text>
    <text x="14" y="98" font-size="8" fill="#16a995" font-weight="700" class="topo-lvl-2">L2: 6 Banks</text>
    <text x="14" y="140" font-size="8" fill="#c78a26" font-weight="700" class="topo-lvl-3">L3: 18 Customers</text>
  </svg>`;
}

function renderOverviewLeftPanel(d, state){
  const u = state.user;
  const isCust = u.role === 'CUSTOMER';
  const isBranchMgr = u.role === 'BRANCH_MANAGER';
  const isRegMgr = u.role === 'REGIONAL_MANAGER';
  const cDetail = d.customerRegionDetail;

  const allTx = d.transactions || [];
  const completedTx = allTx.filter(t => t.status === 'COMPLETED');
  const failedTx = allTx.filter(t => t.status === 'FAILED' || t.tampered);
  const totalCompletedVol = completedTx.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalReserves = (d.accounts || []).reduce((acc, a) => acc + (Number(a.balance) || 0), 0);

  const compPct = allTx.length ? Math.round((completedTx.length / allTx.length) * 100) : 100;
  const failPct = allTx.length ? Math.round((failedTx.length / allTx.length) * 100) : 0;

  if (isCust) {
    const acc = cDetail?.account || (d.accounts && d.accounts[0]) || { id: u.accountId, owner: u.name, balance: 128450.75 };
    return `<section class="panel">
      <div class="panel-head">
        <div>
          <div class="panel-title">NetBankX Digital Smart Card</div>
          <div class="panel-sub">Linked customer checking account · Instant clearing enabled</div>
        </div>
        <span class="status">● ACTIVE LEDGER</span>
      </div>
      <div class="panel-body">
        <div class="bank-card">
          <div class="bank-card-top">
            <div class="bank-card-brand">NetBank<span>X</span> Platinum</div>
            <div class="bank-card-tier">EMV · RTGS</div>
          </div>
          <div class="bank-card-middle">
            <div class="bank-card-chip"></div>
            <div class="bank-card-contactless">☲ ☳</div>
          </div>
          <div class="bank-card-num">•••• •••• •••• 4028</div>
          <div class="bank-card-bottom">
            <div>
              <div class="bank-card-holder">ACCOUNT HOLDER</div>
              <div class="bank-card-name">${esc(acc.owner || u.name)}</div>
              <div style="font-size:10px;color:#7dd3fc;margin-top:2px;font-family:ui-monospace,monospace">${esc(acc.id || u.accountId || 'NBX-100001')}</div>
            </div>
            <div>
              <div class="bank-card-bal-label">AVAILABLE BALANCE</div>
              <div class="bank-card-balance">${money(acc.balance)}</div>
            </div>
          </div>
        </div>

        <div class="ops-summary-grid">
          <div class="ops-card">
            <span>In-Transit Protection</span>
            <b>AES-256-GCM</b>
            <small>● Tag Authenticated</small>
          </div>
          <div class="ops-card">
            <span>Routing Zone Gateway</span>
            <b>${esc(cDetail?.region?.id || 'REG-A')} Gateway</b>
            <small style="color:#0ea5e9">● 14ms Latency</small>
          </div>
        </div>

        <div class="flow-bar-wrap">
          <div class="flow-bar-header">
            <span>Session Account Settlement</span>
            <b>${completedTx.length} completed · ${failedTx.length} blocked</b>
          </div>
          <div class="flow-bar-track">
            <div class="flow-bar-seg inflow" style="width:${compPct}%"></div>
            <div class="flow-bar-seg tamper" style="width:${failPct}%"></div>
          </div>
          <div class="flow-legend">
            <div class="flow-legend-item"><span class="flow-dot" style="background:#14b8a6"></span> Completed transfers (₹${totalCompletedVol.toLocaleString('en-IN')})</div>
            ${failedTx.length ? `<div class="flow-legend-item"><span class="flow-dot" style="background:#ef4444"></span> Tamper-blocked (₹0 moved)</div>` : ''}
          </div>
        </div>

        <button class="button primary" style="width:100%;margin-top:16px" id="quick-cust-send">
          ⇄ Send Instant Transfer to Another Customer ↗
        </button>
      </div>
    </section>`;
  }

  if (isBranchMgr) {
    return `<section class="panel">
      <div class="panel-head">
        <div>
          <div class="panel-title">Branch Vault Reserves &amp; Settlement</div>
          <div class="panel-sub">Local bank branch operations for <b>${esc(cDetail?.branch?.name || 'Assigned Bank')}</b></div>
        </div>
        <span class="status">● VAULT ACTIVE</span>
      </div>
      <div class="panel-body">
        <div class="ops-summary-grid">
          <div class="ops-card">
            <span>Branch Liquidity Reserve</span>
            <b style="color:#0f766e">${money(totalReserves)}</b>
            <small>${cDetail?.branchAccountsCount || d.accounts.length} customer ledgers</small>
          </div>
          <div class="ops-card">
            <span>Settled In-Branch Volume</span>
            <b style="color:#0284c7">${money(totalCompletedVol)}</b>
            <small>${completedTx.length} transfers cleared</small>
          </div>
          <div class="ops-card">
            <span>Branch Gateway Link</span>
            <b>${esc(cDetail?.branch?.id || 'BR-A1')} ↔ ${esc(cDetail?.region?.id || 'REG-A')}</b>
            <small>● Latency: 12 ms · 1 Gbps</small>
          </div>
          <div class="ops-card">
            <span>Account Integrity Status</span>
            <b>100% Cryptographic</b>
            <small>0 uncommitted drifts</small>
          </div>
        </div>

        <div class="flow-bar-wrap">
          <div class="flow-bar-header">
            <span>Branch Settlement Ratio</span>
            <b>${completedTx.length} of ${allTx.length} processed</b>
          </div>
          <div class="flow-bar-track">
            <div class="flow-bar-seg inflow" style="width:${compPct}%"></div>
            <div class="flow-bar-seg tamper" style="width:${failPct}%"></div>
          </div>
          <div class="flow-legend">
            <div class="flow-legend-item"><span class="flow-dot" style="background:#14b8a6"></span> Completed (${completedTx.length})</div>
            <div class="flow-legend-item"><span class="flow-dot" style="background:#ef4444"></span> Blocked/Tampered (${failedTx.length})</div>
          </div>
        </div>

        <button class="button primary" style="width:100%;margin-top:16px" id="quick-br-cust">
          ♙ Manage Branch Customers &amp; Add Money ↗
        </button>
      </div>
    </section>`;
  }

  if (isRegMgr) {
    return `<section class="panel">
      <div class="panel-head">
        <div>
          <div class="panel-title">Regional Clearing &amp; Liquidity Hub</div>
          <div class="panel-sub">Regional clearing network oversight for <b>${esc(state.dashboard.regions[0]?.name || 'Regional Zone')}</b></div>
        </div>
        <span class="status">● REGIONAL CLEARING ACTIVE</span>
      </div>
      <div class="panel-body">
        <div class="ops-summary-grid">
          <div class="ops-card">
            <span>Regional Vault Reserves</span>
            <b style="color:#0f766e">${money(totalReserves)}</b>
            <small>${d.accounts.length} regional customer ledgers</small>
          </div>
          <div class="ops-card">
            <span>Regional Clearing Volume</span>
            <b style="color:#0284c7">${money(totalCompletedVol)}</b>
            <small>${completedTx.length} transfers cleared</small>
          </div>
          <div class="ops-card">
            <span>Assigned Bank Branches</span>
            <b>${d.branches.length} Branches Active</b>
            <small>${d.branches.map(b=>b.id).join(', ')}</small>
          </div>
          <div class="ops-card">
            <span>Regional Trunk Backbone</span>
            <b>40 Gbps AES-256</b>
            <small>● HQ Core latency: 20 ms</small>
          </div>
        </div>

        <div class="flow-bar-wrap">
          <div class="flow-bar-header">
            <span>Regional Inter-Bank Traffic</span>
            <b>${completedTx.length} settled · ${failedTx.length} blocked</b>
          </div>
          <div class="flow-bar-track">
            <div class="flow-bar-seg inflow" style="width:${compPct}%"></div>
            <div class="flow-bar-seg tamper" style="width:${failPct}%"></div>
          </div>
          <div class="flow-legend">
            <div class="flow-legend-item"><span class="flow-dot" style="background:#14b8a6"></span> Completed transfers</div>
            <div class="flow-legend-item"><span class="flow-dot" style="background:#ef4444"></span> Blocked/Tampered</div>
          </div>
        </div>

        <button class="button primary" style="width:100%;margin-top:16px" id="quick-reg-org">
          ⌘ Inspect Regional Branches &amp; Customer Counts ↗
        </button>
      </div>
    </section>`;
  }

  // HQ Admin:
  return `<section class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title">NetBankX Global Clearing House</div>
        <div class="panel-sub">Real-time RTGS clearing, inter-zone trunks, and global ledger reserves</div>
      </div>
      <span class="status">● GLOBAL CLEARING ACTIVE</span>
    </div>
    <div class="panel-body">
      <div class="ops-summary-grid">
        <div class="ops-card">
          <span>Total System Reserves</span>
          <b style="color:#0f766e">${money(totalReserves)}</b>
          <small>18 customer accounts across 6 banks</small>
        </div>
        <div class="ops-card">
          <span>Total Settled Volume</span>
          <b style="color:#0284c7">${money(totalCompletedVol)}</b>
          <small>${completedTx.length} completed transactions</small>
        </div>
        <div class="ops-card">
          <span>Core Transit Hub</span>
          <b>HQ-CORE (40 Gbps)</b>
          <small>● 3 regional trunks online</small>
        </div>
        <div class="ops-card">
          <span>Network Cryptography</span>
          <b>100% Cryptographic</b>
          <small>AES-256-GCM hardware tags</small>
        </div>
      </div>

      <div class="flow-bar-wrap">
        <div class="flow-bar-header">
          <span>Global Network Settlement</span>
          <b>${completedTx.length} completed · ${failedTx.length} blocked</b>
        </div>
        <div class="flow-bar-track">
          <div class="flow-bar-seg inflow" style="width:${compPct}%"></div>
          <div class="flow-bar-seg tamper" style="width:${failPct}%"></div>
        </div>
        <div class="flow-legend">
          <div class="flow-legend-item"><span class="flow-dot" style="background:#14b8a6"></span> Completed (${completedTx.length})</div>
          <div class="flow-legend-item"><span class="flow-dot" style="background:#ef4444"></span> Tamper-blocked (${failedTx.length})</div>
        </div>
      </div>

      <button class="button primary" style="width:100%;margin-top:16px" id="quick-hq-sim">
        ⌁ Open Network Simulator &amp; Packet Engine ↗
      </button>
    </div>
  </section>`;
}

function renderOverview(){
  const d=state.dashboard,m=d.metrics;
  const isCust=state.user.role==='CUSTOMER';
  const isBranchMgr=state.user.role==='BRANCH_MANAGER';
  const cDetail=d.customerRegionDetail;
  const avail=m.totalNodes?Math.round(m.onlineNodes/m.totalNodes*100):100;

  $('#content').innerHTML=`<div class="welcome">
    <div>
      <div class="eyebrow">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).toUpperCase()}</div>
      <h1>Good evening, ${esc(state.user.name.split(' ')[0])} 👋</h1>
      <p>${isBranchMgr?`Welcome to ${esc(cDetail?.branch?.name||'Branch')} Manager portal. Operational overview for your assigned banking region.` : isCust?'Welcome to your personal NetBankX banking portal and regional network operations.':'Here’s what’s happening across your simulated NetBankX enterprise network.'}</p>
    </div>
  </div>

  ${isBranchMgr && cDetail ? `
  <section class="panel" style="margin-bottom:19px;border-left:4px solid var(--teal)">
    <div class="panel-head">
      <div>
        <div class="panel-title">Branch bank &amp; regional network center</div>
        <div class="panel-sub">Operational network infrastructure for <b>${esc(cDetail.branch?.name)} (${esc(cDetail.branch?.id)})</b></div>
      </div>
      <span class="status">● BRANCH &amp; REGION OPERATIONAL</span>
    </div>
    <div class="panel-body">
      <div class="split-cards">
        <div class="mini-stat">
          <span>Branch bank</span>
          <b>${esc(cDetail.branch?.name)}</b>
          <span style="font-size:11px;color:#188c7d;margin-top:3px">${esc(cDetail.branch?.id)} · Home Bank</span>
        </div>
        <div class="mini-stat">
          <span>Assigned region</span>
          <b>${esc(cDetail.region?.name)}</b>
          <span style="font-size:11px;color:var(--muted);margin-top:3px">${esc(cDetail.region?.id)} Regional Hub</span>
        </div>
        <div class="mini-stat">
          <span>Branch gateway router</span>
          <b>${esc(cDetail.branchRouter?.name||'Branch Gateway')}</b>
          <span style="font-size:11px;color:#16a995;margin-top:3px">● ${esc(cDetail.branchRouter?.status?.toUpperCase()||'ONLINE')}</span>
        </div>
        <div class="mini-stat">
          <span>Regional core router</span>
          <b>${esc(cDetail.regionRouter?.name||'Regional Gateway')}</b>
          <span style="font-size:11px;color:#16a995;margin-top:3px">● Latency: 22 ms to HQ Core</span>
        </div>
        <div class="mini-stat">
          <span>Regional customer base</span>
          <b>${cDetail.regionalAccountsCount||0} accounts</b>
          <span style="font-size:11px;color:var(--muted);margin-top:3px">${cDetail.branchAccountsCount||0} in this bank</span>
        </div>
        <div class="mini-stat">
          <span>Regional trunk security</span>
          <b>AES-256-GCM</b>
          <span style="font-size:11px;color:#16a995;margin-top:3px">Hardware tag authenticated</span>
        </div>
      </div>
      <div class="inline-note" style="margin-top:14px;background:#f0f8ff;border-color:#c8e1fb;color:#185a9d">
        <b>ℹ Regional Banking Infrastructure:</b> You are managing <b>${esc(cDetail.branch?.name)} (${esc(cDetail.branch?.id)})</b> located in the <b>${esc(cDetail.region?.name)} (${esc(cDetail.region?.id)})</b>. All accounts in this region can be viewed in the <b>Customers</b> section with direct balance deposits. Outbound transfers route across authenticated regional links with AES-256-GCM message integrity.
      </div>
    </div>
  </section>
  ` : isCust && cDetail ? `
  <section class="panel" style="margin-bottom:19px;border-left:4px solid var(--teal)">
    <div class="panel-head">
      <div>
        <div class="panel-title">Your account &amp; regional banking center</div>
        <div class="panel-sub">Operational network infrastructure serving account <b>${esc(cDetail.account?.id||state.user.accountId)}</b></div>
      </div>
      <span class="status">● REGION ONLINE</span>
    </div>
    <div class="panel-body">
      <div class="split-cards">
        <div class="mini-stat">
          <span>Account holder</span>
          <b>${esc(cDetail.account?.owner||state.user.name)}</b>
          <span style="font-size:11px;color:#188c7d;margin-top:3px">${esc(cDetail.account?.id||state.user.accountId)} · Active</span>
        </div>
        <div class="mini-stat">
          <span>Available balance</span>
          <b style="color:#16a995">${money(cDetail.account?.balance)}</b>
          <span style="font-size:11px;color:var(--muted);margin-top:3px">Demo ledger deposit</span>
        </div>
        <div class="mini-stat">
          <span>Assigned banking region</span>
          <b>${esc(cDetail.region?.name||'Regional Zone')}</b>
          <span style="font-size:11px;color:var(--muted);margin-top:3px">${esc(cDetail.region?.id||'REG')} Regional Gateway</span>
        </div>
        <div class="mini-stat">
          <span>Home branch</span>
          <b>${esc(cDetail.branch?.name||'Branch')}</b>
          <span style="font-size:11px;color:var(--muted);margin-top:3px">${esc(cDetail.branch?.id||'BR')} Branch Router</span>
        </div>
        <div class="mini-stat">
          <span>Regional router status</span>
          <b>${esc(cDetail.regionRouter?.status?.toUpperCase()||'ONLINE')}</b>
          <span style="font-size:11px;color:#16a995;margin-top:3px">● Latency: 22 ms to HQ Core</span>
        </div>
        <div class="mini-stat">
          <span>Security &amp; encryption</span>
          <b>AES-256-GCM</b>
          <span style="font-size:11px;color:#16a995;margin-top:3px">Hardware tag authenticated</span>
        </div>
      </div>
      <div class="inline-note" style="margin-top:14px;background:#f0f8ff;border-color:#c8e1fb;color:#185a9d">
        <b>ℹ Region Details (${esc(cDetail.region?.id)}):</b> Your customer account is hosted at <b>${esc(cDetail.branch?.name)}</b> in the <b>${esc(cDetail.region?.name)}</b>. Outbound transfers route across authenticated regional links with AES-256-GCM message integrity. Any modified payload in transit is blocked at the routing layer before reaching the recipient ledger.
      </div>
    </div>
  </section>
  ` : ''}

  <div class="metrics">
    ${isBranchMgr ? `
      ${stat('Branch customers', cDetail?.branchAccountsCount||0, '♙', `${esc(cDetail?.branch?.name)}`, 'green')}
      ${stat('Regional customers', cDetail?.regionalAccountsCount||0, '▣', `Across ${esc(cDetail?.region?.name)}`)}
      ${stat('Branch transactions', d.transactions.length, '⇄', 'Involving this bank', 'purple')}
      ${stat('Network availability', avail+'%', '⌁', `${m.onlineNodes} of ${m.totalNodes} nodes online`, 'orange')}
    ` : isCust ? `
      ${stat('Available balance', money(cDetail?.account?.balance||d.accounts[0]?.balance), '₹', 'Personal customer account', 'green')}
      ${stat('My transactions', d.transactions.length, '⇄', 'Recorded in this session', 'purple')}
      ${stat('Assigned region', cDetail?.region?.name||'Northern Region', '⌘', `${cDetail?.region?.id||'REG-A'} Regional Hub`)}
      ${stat('Network availability', avail+'%', '⌁', `${m.onlineNodes} of ${m.totalNodes} nodes online`, 'orange')}
    ` : `
      ${stat('Total customers',m.customers,'♙','Across all demo branches','green')}
      ${stat('Active accounts',m.activeAccounts,'▣','Fictional demo accounts')}
      ${stat('Completed transactions',m.completedTransactions,'↗','Recorded in this session','purple')}
      ${stat('Network availability',avail+'%','⌁',`${m.onlineNodes} of ${m.totalNodes} nodes online`,'orange')}
    `}
  </div>
  <div class="grid-two">
    ${renderOverviewLeftPanel(d, state)}
    <section class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Enterprise network</div><div class="panel-sub">Hierarchical route overview</div></div>
        ${isBranchMgr ? '' : '<button class="button small" id="open-network">Inspect network ↗</button>'}
      </div>
      <div class="panel-body">
        <div class="network-mini">${miniTopology()}</div>
        <div class="split-cards" style="margin-top:13px">
          <div class="mini-stat"><span>Nodes online</span><b>${m.onlineNodes}/${m.totalNodes}</b></div>
          <div class="mini-stat"><span>Links online</span><b>${m.onlineLinks}/${m.totalLinks}</b></div>
          <div class="mini-stat"><span>Failed tx</span><b>${m.failedTransactions}</b></div>
        </div>
      </div>
    </section>
  </div>
  <div class="bottom-grid" style="${isBranchMgr ? 'grid-template-columns:1fr;' : ''}">
    <section class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Recent transactions</div><div class="panel-sub">${isBranchMgr ? `Customer-to-customer activity in ${esc(cDetail?.branch?.name||'this bank')}` : 'Latest activity across this bank'}</div></div>
        <button class="button small" id="all-transactions">View all ↗</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Transaction ID</th><th>Type</th><th>From</th><th>To</th><th>Amount</th><th>Status</th><th>Time</th><th>Details</th></tr></thead>
          <tbody>${txRows(d.transactions.slice(0,5))}</tbody>
        </table>
      </div>
    </section>
    ${!isBranchMgr ? `
    <section class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Recent activity</div><div class="panel-sub">Administrative and system events</div></div>
        <span class="status neutral">Audit</span>
      </div>
      <div class="panel-body">
        ${(d.audit||[]).length?(d.audit||[]).map(a=>`<div class="list-row"><div class="list-ico">◈</div><div class="list-main"><b>${esc(a.action)}</b><span>${esc(a.actor)} · ${fmtDate(a.at)}</span></div><div class="list-end">${status(a.outcome)}</div></div>`).join(''):'<div class="empty">No audit events recorded in this session yet.</div>'}
      </div>
    </section>
    ` : ''}
  </div>
  <div class="footer-note">NetBankX is an educational simulator. No real accounts, funds, payment rails or production banking services are connected.</div>`;

  const btnNet=$('#open-network');
  if(btnNet)btnNet.onclick=()=>go('Network Simulator');
  const btnAllTx=$('#all-transactions');
  if(btnAllTx)btnAllTx.onclick=()=>go('Transactions');

  // Quick Action Buttons on Left Panel
  const btnCustSend=$('#quick-cust-send');
  if(btnCustSend)btnCustSend.onclick=()=>go('Transactions');
  const btnBrCust=$('#quick-br-cust');
  if(btnBrCust)btnBrCust.onclick=()=>go('Customers');
  const btnRegOrg=$('#quick-reg-org');
  if(btnRegOrg)btnRegOrg.onclick=()=>go('Organization');
  const btnHqSim=$('#quick-hq-sim');
  if(btnHqSim)btnHqSim.onclick=()=>go('Network Simulator');

  document.querySelectorAll('[data-tx-details]').forEach(b=>{
    b.onclick=()=>{
      const txId=b.dataset.txDetails;
      const t=(state.dashboard?.transactions||[]).find(x=>x.id===txId);
      if(t)openTransactionDetailsModal(t);
    };
  });
}

const topoPositions={
  // Level 0: 1 Headquarter Core Router (Top-most centered node)
  'HQ-CORE':[600,52],

  // Level 1: 3 Regional Gateways (Balanced arch)
  'REG-A':[220,165],
  'REG-B':[600,180],
  'REG-C':[980,165],

  // Level 2: 2 Banks in each region (6 banks total) - Staggered Up & Down
  // Region A (Northern)
  'BR-A1':[135,285], // Up branch
  'BR-A2':[305,325], // Down branch

  // Region B (Central)
  'BR-B1':[515,285], // Up branch
  'BR-B2':[685,325], // Down branch

  // Region C (Southern)
  'BR-C1':[895,285], // Up branch
  'BR-C2':[1065,325], // Down branch

  // Level 3: 3 Customers in each bank (18 customers total) - Staggered Up & Down
  // BR-A1 Customers (Northern Region - Up branch)
  'CUST-01':[83,445],
  'CUST-02':[135,485],
  'CUST-03':[187,445],

  // BR-A2 Customers (Northern Region - Down branch)
  'CUST-04':[253,485],
  'CUST-05':[305,525],
  'CUST-06':[357,485],

  // BR-B1 Customers (Central Region - Up branch)
  'CUST-07':[463,445],
  'CUST-08':[515,485],
  'CUST-09':[567,445],

  // BR-B2 Customers (Central Region - Down branch)
  'CUST-10':[633,485],
  'CUST-11':[685,525],
  'CUST-12':[737,485],

  // BR-C1 Customers (Southern Region - Up branch)
  'CUST-13':[843,445],
  'CUST-14':[895,485],
  'CUST-15':[947,445],

  // BR-C2 Customers (Southern Region - Down branch)
  'CUST-16':[1013,485],
  'CUST-17':[1065,525],
  'CUST-18':[1117,485]
};

const getTopoPos=(id,nodes=[])=>topoPositions[id]||[600,300];

const customerAccounts={
  'CUST-01':{id:'NBX-100001',name:'Aarav Mehta',branchId:'BR-A1',branchName:'Hyderabad Central',regionId:'REG-A',regionName:'Northern Region'},
  'CUST-02':{id:'NBX-100002',name:'Ishita Reddy',branchId:'BR-A1',branchName:'Hyderabad Central',regionId:'REG-A',regionName:'Northern Region'},
  'CUST-03':{id:'NBX-100003',name:'Vivaan Rao',branchId:'BR-A1',branchName:'Hyderabad Central',regionId:'REG-A',regionName:'Northern Region'},
  'CUST-04':{id:'NBX-100004',name:'Saanvi Shah',branchId:'BR-A2',branchName:'Secunderabad',regionId:'REG-A',regionName:'Northern Region'},
  'CUST-05':{id:'NBX-100005',name:'Reyansh Patel',branchId:'BR-A2',branchName:'Secunderabad',regionId:'REG-A',regionName:'Northern Region'},
  'CUST-06':{id:'NBX-100006',name:'Aadhya Iyer',branchId:'BR-A2',branchName:'Secunderabad',regionId:'REG-A',regionName:'Northern Region'},
  'CUST-07':{id:'NBX-100007',name:'Kabir Rao',branchId:'BR-B1',branchName:'Bengaluru Main',regionId:'REG-B',regionName:'Central Region'},
  'CUST-08':{id:'NBX-100008',name:'Myra Das',branchId:'BR-B1',branchName:'Bengaluru Main',regionId:'REG-B',regionName:'Central Region'},
  'CUST-09':{id:'NBX-100009',name:'Vihaan Kumar',branchId:'BR-B1',branchName:'Bengaluru Main',regionId:'REG-B',regionName:'Central Region'},
  'CUST-10':{id:'NBX-100010',name:'Atharv Singh',branchId:'BR-B2',branchName:'Mysuru City',regionId:'REG-B',regionName:'Central Region'},
  'CUST-11':{id:'NBX-100011',name:'Kiara Bose',branchId:'BR-B2',branchName:'Mysuru City',regionId:'REG-B',regionName:'Central Region'},
  'CUST-12':{id:'NBX-100012',name:'Dhruv Nair',branchId:'BR-B2',branchName:'Mysuru City',regionId:'REG-B',regionName:'Central Region'},
  'CUST-13':{id:'NBX-100013',name:'Anaya Iyer',branchId:'BR-C1',branchName:'Chennai Marina',regionId:'REG-C',regionName:'Southern Region'},
  'CUST-14':{id:'NBX-100014',name:'Aanya Krishnan',branchId:'BR-C1',branchName:'Chennai Marina',regionId:'REG-C',regionName:'Southern Region'},
  'CUST-15':{id:'NBX-100015',name:'Dev Malhotra',branchId:'BR-C1',branchName:'Chennai Marina',regionId:'REG-C',regionName:'Southern Region'},
  'CUST-16':{id:'NBX-100016',name:'Diya Sharma',branchId:'BR-C2',branchName:'Vellore Campus',regionId:'REG-C',regionName:'Southern Region'},
  'CUST-17':{id:'NBX-100017',name:'Rohan Bhat',branchId:'BR-C2',branchName:'Vellore Campus',regionId:'REG-C',regionName:'Southern Region'},
  'CUST-18':{id:'NBX-100018',name:'Pia Anand',branchId:'BR-C2',branchName:'Vellore Campus',regionId:'REG-C',regionName:'Southern Region'}
};

const accountToNode=Object.fromEntries(Object.entries(customerAccounts).map(([k,v])=>[v.id,k]));

function getCustBalance(id){
  const accId=customerAccounts[id]?.id;
  const accs=state.dashboard?.accounts||[];
  const a=accs.find(x=>x.id===accId)||state.dashboard?.customerRegionDetail?.allCustomerAccounts?.find(x=>x.id===accId);
  if(a&&a.balance!=null)return a.balance;
  const fallback={
    'CUST-01':128450.75,'CUST-02':64200.00,'CUST-03':88320.50,
    'CUST-04':55300.00,'CUST-05':78250.00,'CUST-06':34600.00,
    'CUST-07':94320.25,'CUST-08':70450.00,'CUST-09':116200.00,
    'CUST-10':43200.00,'CUST-11':69300.00,'CUST-12':105500.00,
    'CUST-13':51200.00,'CUST-14':95800.00,'CUST-15':63700.00,
    'CUST-16':76200.00,'CUST-17':38500.00,'CUST-18':81900.00
  };
  return fallback[id]||50000;
}

async function renderNetwork(){
  if(!state.topology)state.topology=await api('/network/topology');
  const {nodes,links}=state.topology;

  const customerNodes=nodes.filter(n=>n.type==='customer');
  const isCustomerUser=state.user.role==='CUSTOMER';
  const isBranchMgr=state.user.role==='BRANCH_MANAGER';

  // For Branch Manager: Source must be customers belonging to that particular bank (branch):
  let availableSources=customerNodes;
  if(isBranchMgr){
    availableSources=customerNodes.filter(c=>c.branchId===state.user.branchId);
    if(!availableSources.length)availableSources=customerNodes;
  }

  if(isCustomerUser){
    const myNode=state.user.nodeId||accountToNode[state.user.accountId]||'CUST-01';
    state.simSource=myNode;
    if(!state.simDest||state.simDest===state.simSource){
      state.simDest=customerNodes.find(c=>c.id!==state.simSource)?.id||'CUST-02';
    }
  } else if(isBranchMgr){
    if(!state.simSource||!availableSources.some(c=>c.id===state.simSource)){
      state.simSource=availableSources[0]?.id||'CUST-01';
    }
    if(!state.simDest||state.simDest===state.simSource){
      state.simDest=customerNodes.find(c=>c.id!==state.simSource)?.id||'CUST-02';
    }
  } else {
    if(!state.simSource||!customerNodes.some(c=>c.id===state.simSource))state.simSource=customerNodes[0]?.id||'CUST-01';
    if(!state.simDest||state.simDest===state.simSource){
      state.simDest=customerNodes.find(c=>c.id!==state.simSource)?.id||'CUST-02';
    }
  }

  const srcBal=getCustBalance(state.simSource);
  const dstBal=getCustBalance(state.simDest);
  const canEditLinks=state.user.role==='HQ_ADMIN';

  $('#content').innerHTML=`<div class="welcome">
    <div>
      <div class="eyebrow">${isBranchMgr?`BRANCH BANK: ${esc(state.user.branchId)}`:'CUSTOMER NETWORK OPERATIONS'}</div>
      <h1>Network simulator</h1>
      <p>${isBranchMgr?`Send transfers from customers of your bank (${esc(state.user.branchId)}) to any customer across all regions.`:'Send customer-to-customer transfers and inspect real-time Dijkstra packet routing, packet loss, and cryptographic tampering defense.'}</p>
    </div>
    <button class="button" id="refresh-topology">↻ Refresh topology</button>
  </div>
  <div class="sim-layout">
    <div>
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">Enterprise banking topology</div>
            <div class="panel-sub">Active route calculated by backend Dijkstra · Edge weight = configured latency</div>
          </div>
          <span class="status">${nodes.filter(n=>n.status==='online').length} nodes online</span>
        </div>
        <div class="topology" id="topology-svg">${drawTopology(nodes,links,state.simulation)}</div>
        <div class="panel-body">
          <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:10px;color:#708597;padding-top:12px">
            <span>● HQ/core router</span>
            <span style="color:#16a995">● Branch router</span>
            <span style="color:#c78a26">● Customer endpoint</span>
            <span style="color:#d9505c">— Offline link</span>
            <span style="color:#16a995;font-weight:700">— Active route</span>
          </div>
        </div>
      </section>

      <section class="panel" style="margin-top:16px">
        <div class="panel-head">
          <div>
            <div class="panel-title">Packet event timeline · Complete journey</div>
            <div class="panel-sub">Hop-by-hop events, encryption, verification and delivery outcome</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${state.simulation?`
              <button class="button small secondary" id="timeline-inspect-pcap" style="padding:5px 9px;font-size:11px" title="Inspect dissected packets in-browser">🔍 Dissector</button>
              <button class="button small primary" id="timeline-export-pcap" style="padding:5px 9px;font-size:11px" title="Download standard Libpcap file for desktop Wireshark">📥 Export .pcap</button>
            `:''}
            <span class="status ${state.simulation?.status==='FAILED'||state.simulation?.status==='BLOCKED'?'failed':state.simulation?.status==='COMPLETED'?'':'neutral'}">${state.simulation?state.simulation.status:'IDLE'}</span>
          </div>
        </div>
        <div class="panel-body">
          <div class="event-list">
            ${state.simulation?.events?.length?state.simulation.events.map(e=>`<div class="event">
              <span class="event-dot ${/failed|dropped|blocked|tampered/.test(e.type)?'bad':/retry/.test(e.type)?'warn':'good'}"></span>
              <div class="event-text">
                <b>${esc(e.type.replaceAll('.',' · ').replaceAll('_',' '))}</b>
                ${esc(e.detail||e.message||(e.from?`${e.from} → ${e.to}`:e.reason||e.result||e.destination||'Simulation event'))}
                <span>${fmtDate(e.timestamp)}${e.latencyMs?` · ${e.latencyMs} ms latency`:''}${e.attempt?` · attempt ${e.attempt}`:''}</span>
              </div>
            </div>`).join(''):'<div class="empty">No events recorded. Set parameters and click Send Transaction to start a run.</div>'}
          </div>
        </div>
      </section>
    </div>

    <div class="control-stack">
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">Customer transmission controls</div>
            <div class="panel-sub">Send from customer of this bank (${esc(state.user.branchId||'Bank')}) to all regions</div>
          </div>
        </div>
        <div class="panel-body">
          <div class="field">
            <label>${isBranchMgr?`Source customer (Bank: ${esc(state.user.branchId)})`:'Source customer (Sender)'}</label>
            <select id="source-customer" ${isCustomerUser?'disabled':''}>
              ${availableSources.map(c=>{
                const acc=customerAccounts[c.id];
                return `<option value="${c.id}" ${c.id===state.simSource?'selected':''}>${c.id} · ${esc(c.name)} (${esc(acc?.branchName||'Branch')}) - Avail: ${money(getCustBalance(c.id))}</option>`;
              }).join('')}
            </select>
            <div class="field-help">Endpoint: ${esc(customerAccounts[state.simSource]?.branchName||'Branch')} · Available: <b>${money(srcBal)}</b></div>
          </div>

          <div class="field" style="margin-top:13px">
            <label>Destination customer (Recipient in any region)</label>
            <select id="dest-customer">
              ${customerNodes.filter(c=>c.id!==state.simSource).map(c=>{
                const acc=customerAccounts[c.id];
                return `<option value="${c.id}" ${c.id===state.simDest?'selected':''}>${c.id} · ${esc(c.name)} (${esc(acc?.regionName||'Region')} · ${esc(acc?.branchName||'Branch')}) - Current: ${money(getCustBalance(c.id))}</option>`;
              }).join('')}
            </select>
            <div class="field-help">Endpoint: ${esc(customerAccounts[state.simDest]?.branchName||'Branch')} · Current: <b>${money(dstBal)}</b></div>
          </div>

          <div class="two-fields" style="margin-top:13px">
            <div class="field">
              <label>Transfer amount (INR)</label>
              <input id="sim-amount" type="number" min="1" max="1000000" step="0.01" value="${esc(state.simAmount)}" placeholder="2500.00">
            </div>
            <div class="field">
              <label>Reference note</label>
              <input id="sim-ref" maxlength="120" value="${esc(state.simRef)}" placeholder="e.g. Utility bill">
            </div>
          </div>

          <div class="tamper-card ${state.simTamper?'active':''}" id="tamper-card">
            <label class="tamper-label">
              <input type="checkbox" id="tamper-toggle" ${state.simTamper?'checked':''}>
              <span>Deliberately tamper packet in transit (Trigger AES-GCM Mismatch)</span>
            </label>
            <div class="field-help" style="margin-top:6px;color:#a82c39">
              Adversary alters packet ciphertext bits at transit router. Router detects AES-256-GCM authentication tag mismatch, halts the packet, stops forwarding, and rejects the transaction with zero money moved.
            </div>
          </div>

          <div class="field" style="margin-top:16px">
            <div class="range-row"><label for="loss-slider">Packet-loss probability</label><strong id="loss-label">${state.loss}%</strong></div>
            <input class="range" type="range" min="0" max="60" value="${state.loss}" id="loss-slider">
            <div class="field-help">Applied to each simulated hop. Packet loss may cause retransmission retries or delivery failure.</div>
          </div>

          <button class="button primary" id="transmit" style="width:100%;margin-top:16px;padding:12px;font-size:13px">
            ▶ Send Transaction &amp; Transmit Packet
          </button>
          <button class="button danger small" id="quick-tamper-btn" style="width:100%;margin-top:8px">
            ⚡ Deliberately Tamper &amp; Stop Transaction
          </button>
        </div>
      </section>

      ${state.simulation?`<section class="panel">
        <div class="panel-head">
          <div><div class="panel-title">Run metrics</div><div class="panel-sub mono">${esc(state.simulation.id)}</div></div>
          ${status(state.simulation.status)}
        </div>
        <div class="panel-body">
          <div class="split-cards">
            ${mini('Transaction status', state.simulation.status==='COMPLETED'?'<span style="color:#16a995">COMPLETED</span>':state.simulation.status==='BLOCKED'?'<span style="color:#e63946">BLOCKED</span>':'<span style="color:#c54d57">FAILED</span>')}
            ${mini('Ledger result', state.simulation.status==='COMPLETED'?'<span style="color:#16a995">COMMITTED</span>':'<span style="color:#e63946">PROTECTED (₹0)</span>')}
            ${mini('Integrity check', state.simulation.status==='COMPLETED'?'<span style="color:#16a995">PASS (AES-GCM)</span>':state.simulation.status==='BLOCKED'?'<span style="color:#e63946">TAG MISMATCH</span>':'TIMEOUT')}
            ${mini('Transfer amount', state.simulation.amount?money(state.simulation.amount):'—')}
            ${mini('Configured latency', state.simulation.latency==null?'—':`${state.simulation.latency} ms`)}
            ${mini('Hops / Loss', `${state.simulation.hops??0} hops · ${state.simulation.packetLossRate??0}% loss`)}
          </div>
          ${state.simulation.status==='BLOCKED'?`<div class="inline-note" style="margin-top:12px;background:#fff5f6;border-color:#f5c6cb;color:#8f2530">
            <b>⛔ Cryptographic defense successful:</b> Packet tampering was detected at router <b>${esc(state.simulation.blockedAt||'core')}</b> via AES-256-GCM authentication tag mismatch. Forwarding was blocked and zero funds were moved from ${esc(state.simSource)}.
          </div>`:state.simulation.status==='COMPLETED'?`<div class="inline-note" style="margin-top:12px;background:#f0fbf8;border-color:#bfe9dd;color:#0d7a6a">
            <b>✓ End-to-end delivery confirmed:</b> ${money(state.simulation.amount||0)} successfully transferred from ${esc(state.simSource)} to ${esc(state.simDest)} across ${state.simulation.hops} hops. Ledger updated.
          </div>`:''}
          <div class="pcap-banner">
            <div class="pcap-banner-info">
              <div class="pcap-banner-title">
                <span class="pcap-shark-icon">🦈</span>
                <b>Wireshark Packet Capture Ready</b>
                <span class="pcap-pill">Libpcap 2.4</span>
              </div>
              <div class="pcap-banner-text">
                Synthetic Ethernet II / IPv4 / TCP 3-way handshake with ISO 20022 wire payload &amp; cryptographic integrity trace.
              </div>
            </div>
            <div class="pcap-banner-actions">
              <button class="button small secondary" id="btn-inspect-pcap" style="padding:6px 11px;font-size:11.5px">🔍 Inspect Dissector</button>
              <button class="button small primary" id="btn-download-pcap" style="padding:6px 11px;font-size:11.5px">📥 Download .pcap</button>
            </div>
          </div>
        </div>
      </section>`:''}

      ${canEditLinks ? `<section class="panel">
        <div class="panel-head">
          <div><div class="panel-title">Link controls</div><div class="panel-sub">Disable a link to test Dijkstra rerouting</div></div>
        </div>
        <div class="panel-body">
          <div class="field">
            <label>Network link</label>
            <select id="link-select">${links.map(l=>`<option value="${l.id}">${l.id} · ${l.from} ↔ ${l.to}</option>`).join('')}</select>
          </div>
          <div id="link-details" class="field-help" style="margin:10px 0">Select a link to inspect current conditions.</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="button small" id="toggle-link">Disable link</button>
            <button class="button small" id="restore-link">Restore</button>
            <span class="muted" style="font-size:10px">HQ Admin only</span>
          </div>
        </div>
      </section>` : ''}
    </div>
  </div>
  <div class="footer-note">Simulated packet events are not real TCP segments. Educational network simulator for NetBankX banking lab.</div>`;

  $('#refresh-topology').onclick=async()=>{state.topology=await api('/network/topology');renderNetwork()};
  $('#source-customer').onchange=e=>{
    state.simSource=e.target.value;
    state.simDest=customerNodes.find(c=>c.id!==state.simSource)?.id||'CUST-02';
    renderNetwork();
  };
  $('#dest-customer').onchange=e=>{
    state.simDest=e.target.value;
  };
  $('#sim-amount').oninput=e=>{state.simAmount=e.target.value;};
  $('#sim-ref').oninput=e=>{state.simRef=e.target.value;};
  $('#tamper-toggle').onchange=e=>{
    state.simTamper=e.target.checked;
    $('#tamper-card').classList.toggle('active',state.simTamper);
  };
  $('#loss-slider').oninput=e=>{state.loss=+e.target.value;$('#loss-label').textContent=state.loss+'%'};

  $('#transmit').onclick=()=>sendTransaction(false);
  $('#quick-tamper-btn').onclick=()=>sendTransaction(true);

  if($('#timeline-inspect-pcap'))$('#timeline-inspect-pcap').onclick=()=>openPcapDissectorModal(state.simulation?.id);
  if($('#timeline-export-pcap'))$('#timeline-export-pcap').onclick=()=>downloadPcap(state.simulation?.id);
  if($('#btn-inspect-pcap'))$('#btn-inspect-pcap').onclick=()=>openPcapDissectorModal(state.simulation?.id);
  if($('#btn-download-pcap'))$('#btn-download-pcap').onclick=()=>downloadPcap(state.simulation?.id);

  if(canEditLinks && $('#link-select')){
    $('#link-select').onchange=updateLinkDetails;
    $('#toggle-link').onclick=()=>changeLink('offline');
    $('#restore-link').onclick=()=>changeLink('online');
    updateLinkDetails();
  }
  if(state.simulation)animateRoute(state.simulation.route, state.simulation);
}

function mini(a,b){return `<div class="mini-stat"><span>${a}</span><b>${b}</b></div>`}

function drawTopology(nodes,links,sim){
  const W=1200,H=615;
  const pos=id=>getTopoPos(id,nodes);
  const route=sim?.route||[];
  const onRoute=(a,b)=>route.includes(a)&&route.includes(b)&&Math.abs(route.indexOf(a)-route.indexOf(b))===1;

  // 3 Region background cards
  const regionColumns = [
    { id: 'REG-A', name: 'NORTHERN REGION (REG-A)', x: 44, y: 118, w: 352, h: 480 },
    { id: 'REG-B', name: 'CENTRAL REGION (REG-B)', x: 424, y: 118, w: 352, h: 480 },
    { id: 'REG-C', name: 'SOUTHERN REGION (REG-C)', x: 804, y: 118, w: 352, h: 480 }
  ];

  // Tier markers
  const levelIndicators = [
    { level: 'LEVEL 0 · HQ CORE', y: 34, color: '#173d5a' },
    { level: 'LEVEL 1 · 3 REGIONS', y: 130, color: '#2a5a8a' },
    { level: 'LEVEL 2 · 6 BANK BRANCHES (STAGGERED)', y: 248, color: '#148a79' },
    { level: 'LEVEL 3 · 18 CUSTOMERS (STAGGERED)', y: 402, color: '#b37819' }
  ];

  // Horizontal tier divider lines (placed in open whitespace between tiers)
  const tierDividers = [108, 230, 388];

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Enterprise banking network graph with proper 4-level tree hierarchy">
    <defs>
      <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#142c42" flood-opacity="0.08"/>
      </filter>
    </defs>

    <!-- 3 Regional Column Backdrops -->
    ${regionColumns.map(r=>`
      <g opacity="0.95">
        <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="14" fill="#f8fafc" stroke="#e6ecf2" stroke-width="1.2"/>
        <rect x="${r.x+10}" y="${r.y+8}" width="${r.w-20}" height="20" rx="5" fill="#eef4fb" stroke="#dbe7f3" stroke-width="0.8"/>
        <text x="${r.x+r.w/2}" y="${r.y+22}" font-size="8.5" font-weight="800" text-anchor="middle" fill="#2d5e8e" letter-spacing="0.8">${r.name}</text>
      </g>
    `).join('')}

    <!-- Top HQ Header Banner -->
    <g opacity="0.95">
      <rect x="420" y="10" width="360" height="20" rx="5" fill="#edf2f7" stroke="#dbe4ec" stroke-width="1"/>
      <text x="600" y="23" font-size="8" font-weight="800" text-anchor="middle" fill="#183e5e" letter-spacing="1">ENTERPRISE CORE TIER · HEADQUARTERS ROUTING ENGINE</text>
    </g>

    <!-- Subtle Tier Divider Lines between levels -->
    ${tierDividers.map(y=>`
      <line x1="28" y1="${y}" x2="${W-28}" y2="${y}" stroke="#e2ebf2" stroke-dasharray="3 5" stroke-width="1.2"/>
    `).join('')}

    <!-- Level Indicator Pills on Left Margin -->
    ${levelIndicators.map(l=>`
      <g opacity="0.85">
        <rect x="12" y="${l.y}" width="180" height="15" rx="3.5" fill="#f0f4f8" stroke="#dbe4ec" stroke-width="0.9"/>
        <text x="18" y="${l.y+10.5}" font-size="7.5" font-weight="800" fill="${l.color}" letter-spacing="0.4">${l.level}</text>
      </g>
    `).join('')}

    <!-- Links (Tree Links + Lateral Backup Trunks) -->
    ${links.map(l=>{
      const a=pos(l.from),b=pos(l.to),active=onRoute(l.from,l.to);
      const isLateral=(l.from.startsWith('REG')&&l.to.startsWith('REG'))||(l.from.startsWith('BR')&&l.to.startsWith('BR'));
      const midX=(a[0]+b[0])/2, midY=(a[1]+b[1])/2;
      return `<g>
        <line class="link-line ${l.status==='offline'?'offline':''} ${active?'active':''}"
          x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"
          stroke="${l.status==='offline'?'#d9505c':active?'#16a995':isLateral?'#bccddb':'#cbd8e1'}"
          stroke-width="${active?3.2:isLateral?1.5:2}"
          stroke-dasharray="${l.status==='offline'?'5 5':isLateral&&!active?'4 4':'none'}"
          opacity="${isLateral&&!active?0.65:1}"/>
        <rect x="${midX-(isLateral?22:17)}" y="${midY-8}" width="${isLateral?44:34}" height="15" rx="4"
          fill="#ffffff" stroke="${active?'#16a995':l.status==='offline'?'#f3cdd1':'#dce5ed'}" stroke-width="${active?1.5:1}"/>
        <text x="${midX}" y="${midY+2.5}" font-size="8" font-weight="700" text-anchor="middle"
          fill="${active?'#087e70':l.status==='offline'?'#c54d57':'#6c8092'}">${l.latency} ms${isLateral?' (bkp)':''}</text>
      </g>`;
    }).join('')}

    <!-- Nodes -->
    ${nodes.map(n=>{
      const p=pos(n.id),active=route.includes(n.id);
      const r=n.type==='hq',reg=n.type==='region',c=n.type==='customer';

      if(r){
        // Level 0: HQ Core Node (Centered at top)
        return `<g opacity="${n.status==='offline'?.65:1}">
          ${active?`<circle cx="${p[0]}" cy="${p[1]}" r="34" fill="none" stroke="#16a995" stroke-width="2.5" stroke-dasharray="4 4"/>`:''}
          <polygon points="${p[0]},${p[1]-26} ${p[0]+26},${p[1]-13} ${p[0]+26},${p[1]+13} ${p[0]},${p[1]+26} ${p[0]-26},${p[1]+13} ${p[0]-26},${p[1]-13}"
            fill="#102b46" stroke="${active?'#16a995':'#38c6b3'}" stroke-width="${active?3:2}" filter="url(#node-glow)"/>
          <text x="${p[0]}" y="${p[1]+4.5}" font-size="12" font-weight="800" text-anchor="middle" fill="#ffffff">HQ</text>
          <text class="node-label" x="${p[0]}" y="${p[1]+40}" text-anchor="middle" font-weight="800" font-size="10.5" fill="#102b46">${esc(n.name)}</text>
          <text x="${p[0]}" y="${p[1]+51}" font-size="8" font-weight="700" text-anchor="middle" fill="${n.status==='online'?'#168a78':'#c34b55'}">${n.status==='online'?'● ONLINE · 40G Backbone':'● OFFLINE'}</text>
        </g>`;
      }

      if(reg){
        // Level 1: Regional Gateway Node
        return `<g opacity="${n.status==='offline'?.65:1}">
          ${active?`<circle cx="${p[0]}" cy="${p[1]}" r="29" fill="none" stroke="#16a995" stroke-width="2.5" stroke-dasharray="4 4"/>`:''}
          <polygon points="${p[0]-26},${p[1]-16} ${p[0]+18},${p[1]-16} ${p[0]+28},${p[1]} ${p[0]+18},${p[1]+16} ${p[0]-26},${p[1]+16} ${p[0]-32},${p[1]}"
            fill="${n.status==='offline'?'#f1f3f5':'#edf4fd'}" stroke="${active?'#16a995':n.status==='offline'?'#9ca8b3':'#3a6bb5'}" stroke-width="${active?2.8:1.8}" filter="url(#node-glow)"/>
          <text x="${p[0]-2}" y="${p[1]+4}" font-size="10" font-weight="800" text-anchor="middle" fill="#1b4b8f">${n.id}</text>
          <text class="node-label" x="${p[0]}" y="${p[1]+28}" text-anchor="middle" font-weight="700" font-size="9.5" fill="#183652">${esc(n.name)}</text>
          <text x="${p[0]}" y="${p[1]+39}" font-size="8" font-weight="700" text-anchor="middle" fill="${n.status==='online'?'#2f6bb5':'#c34b55'}">${n.status==='online'?'● Regional Gateway':'● OFFLINE'}</text>
        </g>`;
      }

      if(!c){
        // Level 2: Bank Branch Node (Staggered Up / Down)
        return `<g opacity="${n.status==='offline'?.65:1}">
          ${active?`<circle cx="${p[0]}" cy="${p[1]}" r="27" fill="none" stroke="#16a995" stroke-width="2.5" stroke-dasharray="4 4"/>`:''}
          <polygon points="${p[0]-24},${p[1]-15} ${p[0]+16},${p[1]-15} ${p[0]+25},${p[1]} ${p[0]+16},${p[1]+15} ${p[0]-24},${p[1]+15} ${p[0]-30},${p[1]}"
            fill="${n.status==='offline'?'#f1f3f5':'#e4f7f2'}" stroke="${active?'#16a995':n.status==='offline'?'#9ca8b3':'#16a995'}" stroke-width="${active?2.8:1.8}" filter="url(#node-glow)"/>
          <text x="${p[0]-2}" y="${p[1]+4}" font-size="9.5" font-weight="800" text-anchor="middle" fill="#0d7063">${n.id}</text>
          <text class="node-label" x="${p[0]}" y="${p[1]+27}" text-anchor="middle" font-weight="700" font-size="9" fill="#1c374c">${esc(n.name)}</text>
          <text x="${p[0]}" y="${p[1]+37}" font-size="7.5" font-weight="700" text-anchor="middle" fill="${n.status==='online'?'#168a78':'#c34b55'}">${n.status==='online'?'● Branch Bank':'● OFFLINE'}</text>
        </g>`;
      }

      // Level 3: Customer Endpoint Node (Staggered Up / Down)
      const acc=customerAccounts[n.id];
      return `<g opacity="${n.status==='offline'?.65:1}">
        ${active?`<circle cx="${p[0]}" cy="${p[1]}" r="23" fill="none" stroke="#16a995" stroke-width="2.5" stroke-dasharray="3 3"/>`:''}
        <rect x="${p[0]-24}" y="${p[1]-12}" width="48" height="24" rx="6.5"
          fill="${n.status==='offline'?'#f1f3f5':'#fff8eb'}" stroke="${active?'#16a995':n.status==='offline'?'#9ca8b3':'#cfa03c'}" stroke-width="${active?2.5:1.5}" filter="url(#node-glow)"/>
        <text x="${p[0]}" y="${p[1]+3.5}" font-size="8.5" font-weight="800" text-anchor="middle" fill="#845000">${n.id}</text>
        <text class="node-label" x="${p[0]}" y="${p[1]+22}" text-anchor="middle" font-weight="700" font-size="8" fill="#2b4054">${esc(n.name)}</text>
        <text x="${p[0]}" y="${p[1]+32}" font-size="7.5" font-weight="700" text-anchor="middle" fill="#718698">${acc?.id||n.id}</text>
      </g>`;
    }).join('')}

    <!-- Blocked Ring / Deliver Badge -->
    ${sim?.blockedAt?`<g>
      <circle cx="${pos(sim.blockedAt)[0]}" cy="${pos(sim.blockedAt)[1]}" r="30" fill="none" stroke="#e63946" stroke-width="3" stroke-dasharray="4 4" class="blocked-ring"/>
      <rect x="${pos(sim.blockedAt)[0]-60}" y="${pos(sim.blockedAt)[1]-46}" width="120" height="18" rx="4" fill="#e63946"/>
      <text x="${pos(sim.blockedAt)[0]}" y="${pos(sim.blockedAt)[1]-33}" font-size="9" font-weight="800" text-anchor="middle" fill="#fff">⛔ BLOCKED (TAMPER)</text>
    </g>`:''}
    ${sim?.status==='COMPLETED'?`<g>
      <circle cx="${pos(sim.destination)[0]}" cy="${pos(sim.destination)[1]}" r="30" fill="none" stroke="#16a995" stroke-width="3" stroke-dasharray="4 4" class="delivered-ring"/>
      <rect x="${pos(sim.destination)[0]-58}" y="${pos(sim.destination)[1]-46}" width="116" height="18" rx="4" fill="#16a995"/>
      <text x="${pos(sim.destination)[0]}" y="${pos(sim.destination)[1]-33}" font-size="9" font-weight="800" text-anchor="middle" fill="#fff">✓ DELIVERED &amp; COMMITTED</text>
    </g>`:''}

    <!-- Packet Dot Animation -->
    ${route.length>1?`<circle class="packet-dot ${sim?.status==='BLOCKED'?'tampered':sim?.status==='COMPLETED'?'delivered':''}" id="packet-dot" cx="${pos(route[0])[0]}" cy="${pos(route[0])[1]}" r="8"/>`:''}
  </svg>`;
}

function animateRoute(route, sim){
  const dot=$('#packet-dot');
  if(!dot||route.length<2)return;
  const nodes=state.topology?.nodes||[];
  const pos=id=>getTopoPos(id,nodes);
  dot.setAttribute('class','packet-dot');
  let i=0;
  const move=()=>{
    if(i>=route.length||!dot.isConnected)return;
    const curr=route[i];
    const [x,y]=pos(curr);
    dot.setAttribute('cx',x);
    dot.setAttribute('cy',y);

    if(sim?.blockedAt && curr===sim.blockedAt){
      dot.setAttribute('class','packet-dot tampered');
      toast(`⛔ Packet blocked at ${curr}! Modified ciphertext rejected by AES-256-GCM. Funds protected.`);
      return;
    }

    i++;
    if(i<route.length){
      setTimeout(move,360);
    } else {
      if(sim?.status==='COMPLETED'){
        dot.setAttribute('class','packet-dot delivered');
        toast(`✓ Packet delivered! ${money(sim.amount||0)} transferred to ${sim.destination}. Ledger updated.`);
      }
    }
  };
  move();
}

async function sendTransaction(forceTamper=false){
  const source=$('#source-customer').value;
  const destination=$('#dest-customer').value;
  const amount=Number($('#sim-amount').value);
  const reference=$('#sim-ref').value;
  const tamper=forceTamper||$('#tamper-toggle').checked;

  if(!Number.isFinite(amount)||amount<=0){
    toast('Please enter a positive transfer amount.');
    return;
  }
  if(source===destination){
    toast('Source and destination must be different customers.');
    return;
  }
  const srcBal=getCustBalance(source);
  if(amount > srcBal){
    toast(`Insufficient funds: Available balance is ${money(srcBal)}, but requested transfer is ${money(amount)}.`);
    return;
  }

  state.simTamper=tamper;
  state.simAmount=amount.toString();
  state.simRef=reference;

  try{
    const res=await api('/simulations',{
      method:'POST',
      body:JSON.stringify({
        source,
        destination,
        amount,
        reference,
        tamper,
        lossOverride:state.loss/100
      })
    });

    state.simulation=res.simulation;
    state.dashboard=await api('/dashboard');
    state.allTransactions=null;

    if(res.simulation.status==='BLOCKED'){
      toast(`⛔ Tamper detected! Packet blocked at ${res.simulation.blockedAt||'core router'} — transaction stopped.`);
    } else if(res.simulation.status==='COMPLETED'){
      toast(`✓ Transfer committed · ${res.simulation.transactionId||res.simulation.id} · ${money(amount)} sent!`);
    } else {
      toast(`Simulation ${res.simulation.id}: ${res.simulation.status}`);
    }

    await renderNetwork();
  }catch(e){
    toast(e.message);
  }
}

function updateLinkDetails(){
  const links=state.topology?.links||[];
  const l=links.find(x=>x.id===$('#link-select')?.value);
  if(l)$('#link-details').innerHTML=`${status(l.status)} &nbsp; ${l.latency} ms · ${l.bandwidth} Mbps · ${(l.loss*100).toFixed(0)}% loss`;
}

async function changeLink(st){
  const id=$('#link-select').value;
  try{
    await api('/network/links/'+id,{method:'PATCH',body:JSON.stringify({status:st})});
    state.topology=await api('/network/topology');
    renderNetwork();
    toast(`Link ${id} set to ${st}.`);
  }catch(e){toast(e.message);}
}

async function renderTransactions(){
  const isBranchMgr=state.user.role==='BRANCH_MANAGER';
  const isRegionalMgr=state.user.role==='REGIONAL_MANAGER';
  const isCust=state.user.role==='CUSTOMER';
  const myBranchName=state.dashboard?.customerRegionDetail?.branch?.name||state.user.branchId;
  const myRegionName=state.dashboard?.regions?.find(r=>r.id===state.user.regionId)?.name||state.user.regionId;

  let rows=[];
  try{
    const scopeParam = isBranchMgr && state.txScope==='ALL' ? '?scope=all' : '';
    const res=await api('/transactions'+scopeParam);
    rows=res.transactions||[];
    state.allTransactions=rows;
  }catch{
    rows=state.dashboard?.transactions||[];
    state.allTransactions=rows;
  }

  $('#content').innerHTML=`<div class="welcome">
    <div>
      <div class="eyebrow">${isBranchMgr?'BRANCH BANK LEDGER':isRegionalMgr?`REGIONAL LEDGER · ${esc(state.user.regionId)}`:'LEDGER & OPERATIONS'}</div>
      <h1>Transactions</h1>
      <p>${isBranchMgr?`All transactions from customer to another only in this bank (${esc(myBranchName)} · ${esc(state.user.branchId)}).`:isRegionalMgr?`All transactions processed to or from customer accounts in ${esc(myRegionName)} (${esc(state.user.regionId)}).`:'Inspect financial activity, verify transaction integrity, or initiate a new customer transfer.'}</p>
    </div>
    ${isCust?`<button class="button primary" id="btn-create-tx">＋ New Transaction</button>`:''}
  </div>
  <div class="page-toolbar">
    <input class="search" id="tx-search" placeholder="Search ID, account or reference…" value="${esc(state.search)}">
    <div class="filters">
      ${isBranchMgr ? `
        <select class="select" id="tx-scope">
          <option value="INTERNAL" ${state.txScope==='INTERNAL'?'selected':''}>Only in this bank (${esc(state.user.branchId)})</option>
          <option value="ALL" ${state.txScope==='ALL'?'selected':''}>All bank transfers</option>
        </select>
      ` : ''}
      <select class="select" id="tx-filter"><option value="ALL">All statuses</option><option>COMPLETED</option><option>FAILED</option></select>
      <button class="button" id="tx-refresh">↻ Refresh</button>
    </div>
  </div>
  <section class="panel">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Transaction ID</th><th>Type</th><th>From account</th><th>To account</th><th>Amount</th><th>Status</th><th>Created</th><th>Details</th></tr></thead>
        <tbody id="tx-table">${txRows(rows)}</tbody>
      </table>
    </div>
  </section>
  <div class="inline-note" style="margin-top:15px">Transfers produce matching debit and credit ledger entries. Any transaction with modified ciphertext bits is rejected by cryptographic tag checks.</div>`;

  const btnCreateTx=$('#btn-create-tx');
  if(btnCreateTx){
    btnCreateTx.onclick=async()=>{
      let recipients=[];
      try{
        const res=await api('/recipients');
        recipients=res.recipients||[];
      }catch{
        recipients=state.dashboard?.customerRegionDetail?.allCustomerAccounts||[];
      }
      const myBal=state.dashboard?.customerRegionDetail?.account?.balance??128450.75;
      openNewTransactionModal(recipients,myBal);
    };
  }

  $('#tx-search').oninput=e=>{state.search=e.target.value;filterTx()};
  $('#tx-filter').value=state.txFilter;
  $('#tx-filter').onchange=e=>{state.txFilter=e.target.value;filterTx()};
  const txScopeEl=$('#tx-scope');
  if(txScopeEl)txScopeEl.onchange=async e=>{state.txScope=e.target.value;await renderTransactions()};
  $('#tx-refresh').onclick=async()=>{state.dashboard=null;await renderTransactions()};

  document.querySelectorAll('[data-tx-details]').forEach(b=>{
    b.onclick=()=>{
      const txId=b.dataset.txDetails;
      const t=(state.allTransactions||state.dashboard?.transactions||[]).find(x=>x.id===txId);
      if(t)openTransactionDetailsModal(t);
    };
  });

  filterTx();
}

function filterTx(){
  let rows=state.allTransactions||state.dashboard?.transactions||[];
  if(state.txFilter!=='ALL')rows=rows.filter(t=>t.status===state.txFilter);
  const q=state.search.toLowerCase().trim();
  if(q)rows=rows.filter(t=>[t.id,t.type,t.source,t.destination,t.reference].some(x=>String(x||'').toLowerCase().includes(q)));
  const tb=$('#tx-table');
  if(tb){
    tb.innerHTML=txRows(rows);
    document.querySelectorAll('[data-tx-details]').forEach(b=>{
      b.onclick=()=>{
        const txId=b.dataset.txDetails;
        const t=(state.allTransactions||state.dashboard?.transactions||[]).find(x=>x.id===txId);
        if(t)openTransactionDetailsModal(t);
      };
    });
  }
}

function openTransactionDetailsModal(t){
  const isFailed=t.status==='FAILED'||t.tampered;
  const isTampered=Boolean(t.tampered)||/tamper/i.test(t.reference||'')||/tamper/i.test(t.failureReason||'');

  const html=`
  <div class="modal-backdrop" id="modal-container">
    <div class="modal" style="width:min(520px,100%)">
      <div class="panel-head" style="padding:0 0 14px;border-bottom:1px solid var(--line)">
        <div>
          <div class="eyebrow">TRANSACTION INSPECTOR</div>
          <div class="panel-title" style="font-size:18px">${esc(t.id)}</div>
        </div>
        ${status(isTampered?'TAMPERED':t.status)}
      </div>

      <div style="margin:16px 0;display:grid;gap:12px">
        <div class="split-cards" style="grid-template-columns:1fr 1fr">
          <div class="mini-stat">
            <span>Transfer amount</span>
            <b style="color:${isFailed?'#d9505c':'#16a995'}">${money(t.amount)}</b>
          </div>
          <div class="mini-stat">
            <span>Transaction status</span>
            <b>${isTampered?'<span style="color:#e63946">REJECTED</span>':t.status==='COMPLETED'?'<span style="color:#16a995">COMPLETED</span>':'<span style="color:#d9505c">FAILED</span>'}</b>
          </div>
        </div>

        <div style="background:#f7fafc;padding:12px;border-radius:9px;font-size:12px;display:grid;gap:8px">
          <div><span style="color:var(--muted)">Sender account:</span> <b>${esc(t.source||'External / Teller')}</b></div>
          <div><span style="color:var(--muted)">Recipient account:</span> <b>${esc(t.destination||'Self / ATM')}</b></div>
          <div><span style="color:var(--muted)">Initiated by:</span> <b>${esc(t.initiator||'Customer')}</b></div>
          <div><span style="color:var(--muted)">Timestamp:</span> <b>${fmtDate(t.createdAt)}</b></div>
          <div><span style="color:var(--muted)">Reference note:</span> <b>${esc(t.reference||'—')}</b></div>
        </div>

        <div class="${isTampered?'security-bad':t.status==='COMPLETED'?'security-good':'inline-note'}">
          <b>${isTampered?'⛔ Cryptographic Integrity Failure (REJECTED)':t.status==='COMPLETED'?'✓ Cryptographic Integrity PASS (AES-256-GCM)':'Transaction Failed'}</b><br>
          <span style="font-size:11px">
            ${isTampered
              ?'Adversary modified ciphertext bits in transit. The receiving router/ledger detected authentication tag mismatch. Forwarding was blocked and zero funds were moved.'
              :t.status==='COMPLETED'
              ?'Message payload successfully authenticated via AES-256-GCM hardware tag. Debited from sender and credited to recipient.'
              :esc(t.failureReason||'Delivery failure on network route.')}
          </span>
        </div>
      </div>

      <div class="modal-actions">
        ${t.simulationId?`<button class="button small secondary" id="modal-export-pcap" style="padding:7px 13px;font-size:12px">📥 Export .pcap</button>`:''}
        <button class="button primary" id="close-modal-btn">Close</button>
      </div>
    </div>
  </div>`;

  const existing=$('#modal-container');
  if(existing)existing.remove();
  document.body.insertAdjacentHTML('beforeend',html);
  $('#close-modal-btn').onclick=()=>$('#modal-container')?.remove();
  if($('#modal-export-pcap'))$('#modal-export-pcap').onclick=()=>downloadPcap(t.simulationId);
  $('#modal-container').onclick=e=>{if(e.target.id==='modal-container')$('#modal-container')?.remove();};
}

function downloadPcap(simId){
  if(!simId){toast('No simulation available to export.');return;}
  const url=`/api/simulations/${encodeURIComponent(simId)}/pcap?token=${encodeURIComponent(state.token)}`;
  const a=document.createElement('a');
  a.href=url;
  a.download=`paysafe-${simId.toLowerCase()}.pcap`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast(`📥 Downloaded paysafe-${simId.toLowerCase()}.pcap (Ready for Wireshark)`);
}

async function openPcapDissectorModal(simId){
  if(!simId){toast('No simulation available to inspect.');return;}
  const existing=$('#modal-container');
  if(existing)existing.remove();

  const loadingHtml=`
  <div class="modal-backdrop" id="modal-container">
    <div class="modal modal-wireshark" style="padding:48px 30px;text-align:center">
      <div style="font-size:36px;margin-bottom:14px">🦈</div>
      <h3 style="font:800 18px Manrope,sans-serif;margin:0 0 6px">Dissecting Libpcap Packet Stream…</h3>
      <p style="font-size:12px;color:var(--muted);max-width:360px;margin:0 auto">Decoding Ethernet II frames, IPv4 headers, and TCP streams for ${esc(simId)}</p>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',loadingHtml);

  try {
    const data = await api(`/simulations/${encodeURIComponent(simId)}/dissect`);
    const frames = data.frames || [];
    renderDissectorContent(simId, frames);
  } catch(err) {
    $('#modal-container')?.remove();
    toast(`Failed to dissect PCAP: ${err.message}`);
  }
}

function renderDissectorContent(simId, frames){
  const modalContainer = $('#modal-container');
  if(!modalContainer) return;

  let selectedIdx = 0;
  const tamperIdx = frames.findIndex(f => f.badge === 'danger');
  if (tamperIdx !== -1) selectedIdx = tamperIdx;
  else {
    const dataIdx = frames.findIndex(f => f.protocol.includes('PaySafe'));
    if (dataIdx !== -1) selectedIdx = dataIdx;
  }

  const modalHtml = `
    <div class="modal modal-wireshark">
      <div class="ws-modal-head">
        <div class="ws-head-left">
          <span style="font-size:24px">🦈</span>
          <div>
            <div class="ws-head-title">Wireshark Frame Dissector · ${esc(simId)}</div>
            <div class="ws-head-sub">Native Libpcap 2.4 Trace · ${frames.length} Packets Captured · Microsecond Timestamps</div>
          </div>
        </div>
        <div class="ws-head-actions">
          <button class="button small primary" id="ws-download-btn" style="padding:6px 12px;font-size:11.5px">📥 Download .pcap</button>
          <button class="button small secondary" id="ws-close-btn" style="padding:6px 10px;font-size:12px">✕</button>
        </div>
      </div>

      <div class="ws-filter-bar">
        <span class="ws-filter-label">Filter</span>
        <input class="ws-filter-input" id="ws-filter-input" placeholder="Apply display filter (e.g. tcp, arp, icmp, 10.1.1, TAMPERED, SYN, PSH, RST)..." autocomplete="off" spellcheck="false">
      </div>

      <div class="ws-table-container">
        <table class="ws-table">
          <thead>
            <tr>
              <th style="width:50px">No.</th>
              <th style="width:80px">Time (ms)</th>
              <th style="width:115px">Source</th>
              <th style="width:115px">Destination</th>
              <th style="width:90px">Protocol</th>
              <th style="width:65px">Length</th>
              <th>Info</th>
            </tr>
          </thead>
          <tbody id="ws-table-body">
          </tbody>
        </table>
      </div>

      <div class="ws-detail-pane">
        <div class="ws-detail-col" id="ws-tree-pane"></div>
        <div class="ws-detail-col" id="ws-hex-pane"></div>
      </div>
    </div>
  `;

  modalContainer.innerHTML = modalHtml;
  modalContainer.onclick = e => { if (e.target.id === 'modal-container') modalContainer.remove(); };
  $('#ws-close-btn').onclick = () => modalContainer.remove();
  $('#ws-download-btn').onclick = () => downloadPcap(simId);

  const filterInput = $('#ws-filter-input');
  const tbody = $('#ws-table-body');
  const treePane = $('#ws-tree-pane');
  const hexPane = $('#ws-hex-pane');

  function renderRows(filterText = '') {
    const q = filterText.toLowerCase().trim();
    const visibleFrames = frames.filter(f => {
      if (!q) return true;
      return (
        f.protocol.toLowerCase().includes(q) ||
        f.srcIp.toLowerCase().includes(q) ||
        f.dstIp.toLowerCase().includes(q) ||
        f.srcMac.toLowerCase().includes(q) ||
        f.dstMac.toLowerCase().includes(q) ||
        f.info.toLowerCase().includes(q) ||
        String(f.frameNumber) === q
      );
    });

    tbody.innerHTML = visibleFrames.map(f => {
      let protoClass = 'proto-tcp';
      if (f.protocol === 'ARP') protoClass = 'proto-arp';
      else if (f.protocol.includes('MITM') || f.badge === 'danger') protoClass = 'proto-tamper';
      else if (f.protocol === 'ICMP') protoClass = 'proto-icmp';
      else if (f.info.includes('Retransmission')) protoClass = 'proto-retrans';
      else if (f.protocol.includes('PaySafe')) protoClass = 'proto-paysafe';
      else if (f.protocol.includes('HTTP')) protoClass = 'proto-http';

      const isSelected = f.frameNumber === frames[selectedIdx]?.frameNumber;

      return `
        <tr class="ws-row ${protoClass} ${isSelected ? 'selected' : ''}" data-frame="${f.frameNumber}">
          <td>${f.frameNumber}</td>
          <td>${f.relTimeMs.toFixed(3)}</td>
          <td>${esc(f.srcIp !== '-' ? f.srcIp : f.srcMac.slice(0, 8) + '…')}</td>
          <td>${esc(f.dstIp !== '-' ? f.dstIp : f.dstMac.slice(0, 8) + '…')}</td>
          <td><span class="ws-badge ${f.badge}">${esc(f.protocol)}</span></td>
          <td>${f.length}</td>
          <td title="${esc(f.info)}">${esc(f.info)}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="7" style="text-align:center;padding:18px;color:#94a3b8">No packets matched filter expression</td></tr>';

    tbody.querySelectorAll('.ws-row').forEach(row => {
      row.onclick = () => {
        const frameNum = parseInt(row.getAttribute('data-frame'), 10);
        selectedIdx = frames.findIndex(f => f.frameNumber === frameNum);
        renderRows(filterInput.value);
        renderDetailPanes(frames[selectedIdx]);
      };
    });
  }

  function renderDetailPanes(f) {
    if (!f) {
      treePane.innerHTML = '<div style="color:#94a3b8;font-size:12px">Select a packet to view protocol dissection.</div>';
      hexPane.innerHTML = '';
      return;
    }

    const d = f.details || {};
    const isTampered = f.badge === 'danger' || f.info.includes('TAMPERED');

    treePane.innerHTML = `
      <div class="ws-pane-title">
        <span>Packet Dissection</span>
        <span class="ws-badge ${f.badge}">${esc(f.protocol)}</span>
      </div>

      ${isTampered ? `
        <div class="ws-tamper-callout">
          <b>⚠️ Man-in-the-Middle Cryptographic Anomaly:</b><br>
          ${f.protocol === 'ICMP' || f.info.includes('RST')
            ? 'Router detected ciphertext manipulation via AES-256-GCM authentication tag mismatch and halted the transaction.'
            : 'Adversary modified ciphertext bits during router hop transit. Tampered payload in transit.'}
        </div>
      ` : ''}

      <div class="ws-tree-group">
        <div class="ws-tree-head">▼ Frame ${f.frameNumber}: ${f.length} bytes on wire (${f.length * 8} bits)</div>
        <div class="ws-tree-body">
          <div class="ws-tree-row"><span class="ws-tree-key">Arrival Time:</span><span class="ws-tree-val">+${f.relTimeMs.toFixed(3)} ms</span></div>
          <div class="ws-tree-row"><span class="ws-tree-key">Frame Length:</span><span class="ws-tree-val">${f.length} bytes</span></div>
          <div class="ws-tree-row"><span class="ws-tree-key">Protocols in Frame:</span><span class="ws-tree-val">eth:ip:tcp:${esc(f.protocol.toLowerCase())}</span></div>
        </div>
      </div>

      <div class="ws-tree-group">
        <div class="ws-tree-head">▼ Ethernet II, Src: ${esc(f.srcMac)}, Dst: ${esc(f.dstMac)}</div>
        <div class="ws-tree-body">
          <div class="ws-tree-row"><span class="ws-tree-key">Source MAC:</span><span class="ws-tree-val">${esc(f.srcMac)}</span></div>
          <div class="ws-tree-row"><span class="ws-tree-key">Destination MAC:</span><span class="ws-tree-val">${esc(f.dstMac)}</span></div>
          <div class="ws-tree-row"><span class="ws-tree-key">Type:</span><span class="ws-tree-val">${f.protocol === 'ARP' ? 'ARP (0x0806)' : 'IPv4 (0x0800)'}</span></div>
        </div>
      </div>

      ${f.srcIp !== '-' ? `
        <div class="ws-tree-group">
          <div class="ws-tree-head">▼ Internet Protocol Version 4, Src: ${esc(f.srcIp)}, Dst: ${esc(f.dstIp)}</div>
          <div class="ws-tree-body">
            <div class="ws-tree-row"><span class="ws-tree-key">Version / IHL:</span><span class="ws-tree-val">4 / 20 bytes (5 words)</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">Differentiated Services:</span><span class="ws-tree-val">0xb8 (DSCP: Expedited Forwarding / Banking EF)</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">Time to Live (TTL):</span><span class="ws-tree-val">${d.ttl || 64} hops</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">Protocol:</span><span class="ws-tree-val">${esc(d.protocol || f.protocol)}</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">Header Checksum:</span><span class="ws-tree-val" style="color:#16a34a">✓ Valid (RFC 791 verified)</span></div>
          </div>
        </div>
      ` : ''}

      ${d.flags ? `
        <div class="ws-tree-group">
          <div class="ws-tree-head">▼ Transmission Control Protocol, Src Port: ${d.srcPort}, Dst Port: ${d.dstPort}</div>
          <div class="ws-tree-body">
            <div class="ws-tree-row"><span class="ws-tree-key">Source Port:</span><span class="ws-tree-val">${d.srcPort}</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">Destination Port:</span><span class="ws-tree-val">${d.dstPort} (Core Banking / TLS)</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">Sequence Number:</span><span class="ws-tree-val">${d.seq}</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">Acknowledgment Number:</span><span class="ws-tree-val">${d.ack}</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">Flags:</span><span class="ws-tree-val">[${esc(d.flags)}]</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">TCP Checksum:</span><span class="ws-tree-val" style="color:#16a34a">✓ Valid (RFC 793 verified)</span></div>
          </div>
        </div>
      ` : ''}

      ${f.protocol === 'ARP' ? `
        <div class="ws-tree-group">
          <div class="ws-tree-head">▼ Address Resolution Protocol (${esc(d.opcode || 'ARP')})</div>
          <div class="ws-tree-body">
            <div class="ws-tree-row"><span class="ws-tree-key">Sender MAC:</span><span class="ws-tree-val">${esc(d.senderMac)}</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">Sender IP:</span><span class="ws-tree-val">${esc(d.senderIp)}</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">Target MAC:</span><span class="ws-tree-val">${esc(d.targetMac)}</span></div>
            <div class="ws-tree-row"><span class="ws-tree-key">Target IP:</span><span class="ws-tree-val">${esc(d.targetIp)}</span></div>
          </div>
        </div>
      ` : ''}
    `;

    hexPane.innerHTML = `
      <div class="ws-pane-title">
        <span>Payload &amp; Wire Inspection</span>
        <span style="font-size:10px;color:var(--muted)">${d.payloadBytes ? d.payloadBytes + ' bytes' : '0 payload bytes'}</span>
      </div>

      ${d.payloadPreview ? `
        <div class="ws-hex-block">${esc(d.payloadPreview)}</div>
        <div style="font-size:10px;color:#64748b;margin-top:6px">
          💡 Follow TCP Stream in Wireshark will reconstruct this exact JSON banking wire payload.
        </div>
      ` : `
        <div style="background:#f1f5f9;padding:16px;border-radius:8px;font-size:11.5px;color:#64748b;line-height:1.5">
          ${f.protocol === 'ARP'
            ? '<b>ARP Resolution Frame:</b> Operates at the Data Link layer (Layer 2) resolving hardware MAC address from IP before IP datagram forwarding begins.'
            : f.details?.flags?.includes('SYN')
            ? '<b>TCP Handshake Control Segment:</b> Establishes reliable end-to-end transport session between customer endpoint and core banking gateway before financial payload transmission.'
            : f.details?.flags?.includes('RST')
            ? '<b>TCP Reset [RST, ACK]:</b> Transport socket connection forcibly terminated by intermediate security router upon cryptographic authentication tag failure.'
            : 'Protocol control segment (No application layer payload bytes carried in this frame).'}
        </div>
      `}
    `;
  }

  renderRows();
  renderDetailPanes(frames[selectedIdx]);

  filterInput.oninput = e => {
    renderRows(e.target.value);
  };
}

function openNewTransactionModal(recipients,userBalance){
  const myAcc=state.user.accountId||'PS-100001';
  const otherRecipients=recipients.filter(r=>r.id!==myAcc);

  const html=`
  <div class="modal-backdrop" id="modal-container">
    <div class="modal" style="width:min(500px,100%)">
      <div class="panel-head" style="padding:0 0 14px;border-bottom:1px solid var(--line)">
        <div>
          <div class="eyebrow">NEW CUSTOMER TRANSACTION</div>
          <div class="panel-title" style="font-size:18px">Send money to another customer</div>
        </div>
      </div>

      <form id="new-tx-form" style="margin-top:16px;display:grid;gap:12px">
        <div class="field">
          <label>Your Account (Sender)</label>
          <input type="text" value="${esc(state.user.name)} · ${esc(myAcc)} (Available: ${money(userBalance)})" disabled style="background:#f1f5f8">
        </div>

        <div class="field">
          <label>Recipient Customer (Any region)</label>
          <select id="modal-recipient" required>
            ${otherRecipients.map(r=>`<option value="${r.id}">${esc(r.owner)} (${r.id}) · ${esc(r.regionName||r.regionId||'Region')} · ${esc(r.branchName||r.branchId||'')}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label>Transfer Amount (INR)</label>
          <input type="number" id="modal-amount" min="1" max="1000000" step="0.01" placeholder="e.g. 2500.00" value="1500" required>
          <div class="field-help">Maximum available: <b>${money(userBalance)}</b></div>
        </div>

        <div class="field">
          <label>Reference Note</label>
          <input type="text" id="modal-ref" maxlength="120" placeholder="e.g. Rent share, Invoice payment" value="Invoice payment">
        </div>

        <div class="tamper-card" id="modal-tamper-card">
          <label class="tamper-label">
            <input type="checkbox" id="modal-tamper-toggle">
            <span>Deliberately tamper packet / corrupt transaction payload</span>
          </label>
          <div class="field-help" style="margin-top:6px;color:#a82c39">
            Alters ciphertext bits during transmission. Cryptographic authentication tag (AES-256-GCM) verification will fail, causing the transaction to be immediately rejected with zero funds moved.
          </div>
        </div>

        <div id="modal-error" style="color:#d9505c;font-size:12px;min-height:16px"></div>

        <div class="modal-actions">
          <button type="button" class="button" id="modal-cancel-btn">Cancel</button>
          <button type="submit" class="button primary" id="modal-submit-btn">Authorize &amp; Send Payment</button>
        </div>
      </form>
    </div>
  </div>`;

  const existing=$('#modal-container');
  if(existing)existing.remove();
  document.body.insertAdjacentHTML('beforeend',html);

  $('#modal-tamper-toggle').onchange=e=>{
    $('#modal-tamper-card').classList.toggle('active',e.target.checked);
  };
  $('#modal-cancel-btn').onclick=()=>$('#modal-container')?.remove();
  $('#modal-container').onclick=e=>{if(e.target.id==='modal-container')$('#modal-container')?.remove();};

  $('#new-tx-form').onsubmit=async e=>{
    e.preventDefault();
    $('#modal-error').textContent='';
    const recipient=$('#modal-recipient').value;
    const amount=Number($('#modal-amount').value);
    const reference=$('#modal-ref').value;
    const tamper=$('#modal-tamper-toggle').checked;

    if(!Number.isFinite(amount)||amount<=0){
      $('#modal-error').textContent='Please enter a valid transfer amount greater than ₹0.';
      return;
    }
    if(amount>userBalance){
      $('#modal-error').textContent=`Insufficient funds: Your available balance is ${money(userBalance)}.`;
      return;
    }

    try{
      $('#modal-submit-btn').disabled=true;
      $('#modal-submit-btn').textContent='Processing...';

      const res=await api('/transactions/transfer',{
        method:'POST',
        body:JSON.stringify({
          source:myAcc,
          destination:recipient,
          amount,
          reference,
          tamper
        })
      });

      $('#modal-container')?.remove();
      state.dashboard=null;
      state.allTransactions=null;

      if(res.rejected||res.transaction?.status==='FAILED'){
        toast(`⛔ Transaction REJECTED! Cryptographic tag mismatch detected. Zero funds moved.`);
      }else{
        toast(`✓ Transaction committed! ${money(amount)} transferred successfully.`);
      }

      await renderTransactions();
    }catch(err){
      $('#modal-error').textContent=err.message;
      $('#modal-submit-btn').disabled=false;
      $('#modal-submit-btn').textContent='Authorize & Send Payment';
    }
  };
}

async function renderCustomers(){
  const d=await api('/customers');
  const isBranchMgr=state.user.role==='BRANCH_MANAGER';
  const isRegionalMgr=state.user.role==='REGIONAL_MANAGER';
  const isCust=state.user.role==='CUSTOMER';
  const canManageMoney=!isCust && (isBranchMgr||isRegionalMgr||state.user.role==='HQ_ADMIN');
  const cDetail=state.dashboard?.customerRegionDetail;
  const regionTitle=state.dashboard?.regions?.find(r=>r.id===state.user.regionId)?.name||cDetail?.region?.name||'Your Region';
  const branchTitle=cDetail?.branch?.name||state.user.branchId;

  $('#content').innerHTML=`<div class="welcome">
    <div>
      <div class="eyebrow">${isRegionalMgr?`REGIONAL CUSTOMER DIRECTORY · ${esc(state.user.regionId)}`:'CUSTOMER DIRECTORY'}</div>
      <h1>Regional Customers &amp; Accounts</h1>
      <p>Customer accounts located across branches in ${esc(regionTitle)}${isBranchMgr?` (Home Bank: ${esc(branchTitle)})`:''}. You can deposit funds or process cash withdrawals for any customer account.</p>
    </div>
    <button class="button" id="customers-refresh">↻ Refresh</button>
  </div>
  <div class="page-toolbar"><input class="search" id="customer-search" placeholder="Search customer, account ID or branch…"></div>
  <section class="panel">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Account ID</th><th>Customer</th><th>Branch</th><th>Available Balance</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="customer-table">${customerRows(d.customers,canManageMoney)}</tbody>
      </table>
    </div>
  </section>`;

  $('#customer-search').oninput=e=>{
    const q=e.target.value.toLowerCase();
    const filtered=d.customers.filter(a=>(a.name+' '+a.id+' '+a.branchId+' '+(a.branchName||'')).toLowerCase().includes(q));
    $('#customer-table').innerHTML=customerRows(filtered,canManageMoney);
    attachCustomerActionListeners();
  };
  $('#customers-refresh').onclick=renderCustomers;

  attachCustomerActionListeners();
}

function customerRows(rows,canManageMoney=false){
  return rows.map(a=>`<tr>
    <td class="mono">${esc(a.id)}</td>
    <td><b>${esc(a.name)}</b>${a.isHomeBranch ? ' <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#e8f7f1;color:#16826e;font-weight:700">My Bank</span>' : ''}</td>
    <td>${esc(a.branchName||a.branchId)}</td>
    <td class="money">${money(a.balance)}</td>
    <td>${status(a.status)}</td>
    <td>
      ${canManageMoney?`
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <button class="button small primary" data-add-money="${esc(a.id)}" data-owner="${esc(a.name)}" data-bal="${a.balance}">＋ Add Money</button>
          <button class="button small" data-withdraw-money="${esc(a.id)}" data-owner="${esc(a.name)}" data-bal="${a.balance}" style="border-color:#f59e0b;color:#b45309;background:#fffbeb;font-weight:700">− Withdraw</button>
        </div>
      `:`<span class="muted">View only</span>`}
    </td>
  </tr>`).join('')||'<tr><td colspan="6" class="empty">No customer accounts found.</td></tr>';
}

function attachCustomerActionListeners(){
  document.querySelectorAll('[data-add-money]').forEach(b=>{
    b.onclick=()=>{
      const accId=b.dataset.addMoney;
      const owner=b.dataset.owner;
      const bal=Number(b.dataset.bal);
      openDepositModal(accId,owner,bal);
    };
  });
  document.querySelectorAll('[data-withdraw-money]').forEach(b=>{
    b.onclick=()=>{
      const accId=b.dataset.withdrawMoney;
      const owner=b.dataset.owner;
      const bal=Number(b.dataset.bal);
      openWithdrawModal(accId,owner,bal);
    };
  });
}

function openDepositModal(accId,owner,currentBalance){
  const isRegionalMgr=state.user.role==='REGIONAL_MANAGER';
  const html=`
  <div class="modal-backdrop" id="modal-container">
    <div class="modal" style="width:min(480px,100%)">
      <div class="panel-head" style="padding:0 0 14px;border-bottom:1px solid var(--line)">
        <div>
          <div class="eyebrow">${isRegionalMgr?'REGIONAL TELLER DEPOSIT':'BRANCH COUNTER DEPOSIT'}</div>
          <div class="panel-title" style="font-size:18px">Add Money to Customer Account</div>
        </div>
      </div>

      <form id="deposit-form" style="margin-top:16px;display:grid;gap:12px">
        <div class="field">
          <label>Customer Account</label>
          <input type="text" value="${esc(owner)} · ${esc(accId)}" disabled style="background:#f1f5f8">
        </div>

        <div class="field">
          <label>Current Available Balance</label>
          <input type="text" value="${money(currentBalance)}" disabled style="background:#f1f5f8;font-weight:700;color:#16a995">
        </div>

        <div class="field">
          <label>Deposit Amount (INR)</label>
          <input type="number" id="deposit-amount" min="1" max="1000000" step="0.01" placeholder="e.g. 5000.00" value="5000" required>
          <div class="field-help">Funds will be credited directly to the customer's ledger balance.</div>
        </div>

        <div class="field">
          <label>Counter Reference / Note</label>
          <input type="text" id="deposit-ref" maxlength="120" placeholder="e.g. Branch counter cash deposit" value="Branch teller cash deposit">
        </div>

        <div id="modal-error" style="color:#d9505c;font-size:12px;min-height:16px"></div>

        <div class="modal-actions">
          <button type="button" class="button" id="modal-cancel-btn">Cancel</button>
          <button type="submit" class="button primary" id="modal-submit-btn">Credit &amp; Deposit Funds</button>
        </div>
      </form>
    </div>
  </div>`;

  const existing=$('#modal-container');
  if(existing)existing.remove();
  document.body.insertAdjacentHTML('beforeend',html);

  $('#modal-cancel-btn').onclick=()=>$('#modal-container')?.remove();
  $('#modal-container').onclick=e=>{if(e.target.id==='modal-container')$('#modal-container')?.remove();};

  $('#deposit-form').onsubmit=async e=>{
    e.preventDefault();
    $('#modal-error').textContent='';
    const amount=Number($('#deposit-amount').value);
    const reference=$('#deposit-ref').value;

    if(!Number.isFinite(amount)||amount<=0){
      $('#modal-error').textContent='Please enter a valid deposit amount greater than ₹0.';
      return;
    }

    try{
      $('#modal-submit-btn').disabled=true;
      $('#modal-submit-btn').textContent='Crediting...';

      await api('/transactions/deposit',{
        method:'POST',
        body:JSON.stringify({
          destination:accId,
          amount,
          reference:reference||'Branch teller cash deposit'
        })
      });

      $('#modal-container')?.remove();
      state.dashboard=null;
      state.allTransactions=null;
      toast(`✓ ${money(amount)} deposited to ${owner} (${accId}) successfully!`);
      await renderCustomers();
    }catch(err){
      $('#modal-error').textContent=err.message;
      $('#modal-submit-btn').disabled=false;
      $('#modal-submit-btn').textContent='Credit & Deposit Funds';
    }
  };
}

function openWithdrawModal(accId,owner,currentBalance){
  const isRegionalMgr=state.user.role==='REGIONAL_MANAGER';
  const isBranchMgr=state.user.role==='BRANCH_MANAGER';
  const defaultAmount=Math.min(5000, currentBalance > 0 ? Math.floor(currentBalance) : 0);
  const html=`
  <div class="modal-backdrop" id="modal-container">
    <div class="modal" style="width:min(480px,100%)">
      <div class="panel-head" style="padding:0 0 14px;border-bottom:1px solid var(--line)">
        <div>
          <div class="eyebrow" style="color:#b45309">${isRegionalMgr?'REGIONAL TELLER CASH DISBURSEMENT':(isBranchMgr?'BRANCH COUNTER WITHDRAWAL':'ADMIN TELLER DISBURSEMENT')}</div>
          <div class="panel-title" style="font-size:18px">Withdraw Money from Customer Account</div>
        </div>
      </div>

      <form id="withdraw-form" style="margin-top:16px;display:grid;gap:12px">
        <div class="field">
          <label>Customer Account</label>
          <input type="text" value="${esc(owner)} · ${esc(accId)}" disabled style="background:#f1f5f8">
        </div>

        <div class="field">
          <label>Current Available Balance</label>
          <input type="text" value="${money(currentBalance)}" disabled style="background:#f1f5f8;font-weight:700;color:#b45309">
        </div>

        <div class="field">
          <label>Withdrawal Amount (INR)</label>
          <input type="number" id="withdraw-amount" min="1" max="${currentBalance}" step="0.01" placeholder="e.g. 5000.00" value="${defaultAmount||''}" required>
          <div class="field-help">Funds will be debited from the customer's ledger balance and disbursed in cash. Available: ${money(currentBalance)}</div>
        </div>

        <div class="field">
          <label>Counter Reference / Voucher Note</label>
          <input type="text" id="withdraw-ref" maxlength="120" placeholder="e.g. Branch counter cash withdrawal" value="Branch teller cash withdrawal">
        </div>

        <div id="modal-error" style="color:#d9505c;font-size:12px;min-height:16px"></div>

        <div class="modal-actions">
          <button type="button" class="button" id="modal-cancel-btn">Cancel</button>
          <button type="submit" class="button" id="modal-submit-btn" style="background:#d97706;border-color:#b45309;color:#fff;font-weight:700">− Process Cash Withdrawal</button>
        </div>
      </form>
    </div>
  </div>`;

  const existing=$('#modal-container');
  if(existing)existing.remove();
  document.body.insertAdjacentHTML('beforeend',html);

  $('#modal-cancel-btn').onclick=()=>$('#modal-container')?.remove();
  $('#modal-container').onclick=e=>{if(e.target.id==='modal-container')$('#modal-container')?.remove();};

  $('#withdraw-form').onsubmit=async e=>{
    e.preventDefault();
    $('#modal-error').textContent='';
    const amount=Number($('#withdraw-amount').value);
    const reference=$('#withdraw-ref').value;

    if(!Number.isFinite(amount)||amount<=0){
      $('#modal-error').textContent='Please enter a valid withdrawal amount greater than ₹0.';
      return;
    }
    if(amount>currentBalance){
      $('#modal-error').textContent=`Insufficient available balance (₹${currentBalance.toFixed(2)} available, requested ₹${amount.toFixed(2)}).`;
      return;
    }

    try{
      $('#modal-submit-btn').disabled=true;
      $('#modal-submit-btn').textContent='Processing...';

      await api('/transactions/withdrawal',{
        method:'POST',
        body:JSON.stringify({
          source:accId,
          amount,
          reference:reference||'Branch teller cash withdrawal'
        })
      });

      $('#modal-container')?.remove();
      state.dashboard=null;
      state.allTransactions=null;
      toast(`✓ ${money(amount)} withdrawn from ${owner} (${accId}) successfully!`);
      await renderCustomers();
    }catch(err){
      $('#modal-error').textContent=err.message;
      $('#modal-submit-btn').disabled=false;
      $('#modal-submit-btn').textContent='− Process Cash Withdrawal';
    }
  };
}

function renderOrganization(){
  const d=state.dashboard;
  const isRegionalMgr=state.user.role==='REGIONAL_MANAGER';
  const currentRegion=d.regions?.find(r=>r.id===state.user.regionId);
  const regionName=currentRegion?.name||state.user.regionId;

  const relevantRegions=isRegionalMgr?d.regions.filter(r=>r.id===state.user.regionId):d.regions;
  const relevantBranches=isRegionalMgr?d.branches.filter(b=>b.regionId===state.user.regionId):d.branches;
  const relevantAccounts=isRegionalMgr?d.accounts.filter(a=>relevantBranches.some(b=>b.id===a.branchId)):d.accounts;

  $('#content').innerHTML=`<div class="welcome">
    <div>
      <div class="eyebrow">${isRegionalMgr?`REGIONAL ORGANIZATION · ${esc(state.user.regionId)}`:'ORGANIZATION'}</div>
      <h1>${isRegionalMgr?`${esc(regionName)} Branch Network`:'Enterprise Branch Network'}</h1>
      <p>${isRegionalMgr?`Branch banking infrastructure, routing nodes, and customer enrollment details for ${esc(regionName)}.`:'Explore the fictional banking hierarchy and its operational status.'}</p>
    </div>
    <span class="status">${relevantBranches.length} branches · ${relevantAccounts.length} customers</span>
  </div>
  <div class="metrics">
    ${stat('Region',isRegionalMgr?state.user.regionId:d.regions.length,'⌘',isRegionalMgr?regionName:'Configurable units')}
    ${stat('Branches in Region',relevantBranches.length,'▦','Operational branch nodes')}
    ${stat('Enrolled Customers',relevantAccounts.length,'♧','Total active customer accounts','green')}
    ${stat('Regional Balance',money(relevantAccounts.reduce((s,a)=>s+(a.balance||0),0)),'₹','Total ledger deposits','purple')}
  </div>

  <div style="display:grid;gap:18px">
    ${relevantRegions.map(r=>{
      const regionBranches=relevantBranches.filter(b=>b.regionId===r.id);
      return `<section class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">${esc(r.name)} (${esc(r.id)})</div>
            <div class="panel-sub">Regional Gateway Node · ${regionBranches.length} Branch Banks · ${relevantAccounts.filter(a=>regionBranches.some(b=>b.id===a.branchId)).length} Customers Total</div>
          </div>
          <span class="status">● OPERATIONAL</span>
        </div>
        <div class="panel-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:16px;padding-top:14px">
            ${regionBranches.map(b=>{
              const branchAccs=relevantAccounts.filter(a=>a.branchId===b.id);
              const branchTotal=branchAccs.reduce((s,a)=>s+(a.balance||0),0);
              return `<div style="background:#f8fafc;border:1px solid #e5edf4;border-radius:12px;padding:16px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                  <div>
                    <div style="font-size:10px;font-weight:700;color:#168c7d;letter-spacing:0.8px">BRANCH BANK</div>
                    <div style="font:800 17px Manrope;margin:4px 0 2px">${esc(b.name)}</div>
                    <div class="mono" style="font-size:11px;color:#5a7388">ID: <b>${esc(b.id)}</b> · Region: ${esc(r.id)}</div>
                  </div>
                  <span class="status" style="font-size:9.5px">● ONLINE · 1G</span>
                </div>

                <div class="split-cards" style="margin-top:12px">
                  <div class="mini-stat">
                    <span>Customer Count</span>
                    <b style="font-size:18px;color:#183e5e">${branchAccs.length}</b>
                  </div>
                  <div class="mini-stat" style="grid-column:span 2">
                    <span>Branch Ledger Balance</span>
                    <b style="font-size:18px;color:#168c7d">${money(branchTotal)}</b>
                  </div>
                </div>

                <div style="margin-top:14px;border-top:1px solid #eef3f7;padding-top:10px">
                  <div style="font-size:10px;font-weight:700;color:#6d8498;letter-spacing:0.8px;margin-bottom:8px">CUSTOMER ACCOUNTS (${branchAccs.length}):</div>
                  <div style="display:grid;gap:6px">
                    ${branchAccs.map(a=>{
                      const nodeId=accountToNode[a.id]||'';
                      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:#fff;border:1px solid #e9eff5;border-radius:6px;font-size:11px">
                        <div>
                          <b>${esc(a.owner)}</b>
                          <span class="mono" style="font-size:10px;color:#7b8f9f"> (${esc(a.id)}${nodeId?` · ${nodeId}`:''})</span>
                        </div>
                        <span class="money" style="font-weight:700;color:#168c7d">${money(a.balance)}</span>
                      </div>`;
                    }).join('')||'<div class="empty">No customers enrolled</div>'}
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </section>`;
    }).join('')}
  </div>`;
}

async function renderSecurity(){
  const d=await api('/audit');
  const isRegionalMgr=state.user.role==='REGIONAL_MANAGER';

  // Filter security events for packet tampering and link changes
  const tamperEvents=(d.security||[]).filter(e=>/tamper|mismatch|tag|cipher|blocked|rejected/i.test(e.type+' '+e.detail));
  const linkEvents=(d.security||[]).filter(e=>/link|router|offline|online|status/i.test(e.type+' '+e.detail));
  const auditList=d.events||[];

  $('#content').innerHTML=`<div class="welcome">
    <div>
      <div class="eyebrow">${isRegionalMgr?`REGIONAL SECURITY OPERATIONS · ${esc(state.user.regionId)}`:'ENTERPRISE SECURITY & AUDIT'}</div>
      <h1>Security &amp; audit</h1>
      <p>${isRegionalMgr?'Real-time audit log of network link status changes and AES-256-GCM cryptographic packet tampering defense.':'Observe administrative events, packet tampering defense, and network topology audit trail.'}</p>
    </div>
  </div>

  <div class="metrics">
    ${stat('Packet Tamper Events',tamperEvents.length,'⛔',tamperEvents.length?`${tamperEvents.filter(e=>/blocked|rejected/i.test(e.result)).length} blocked by AES-GCM`:'Zero unauthorized packets','tone')}
    ${stat('Network Link Audits',linkEvents.length,'⌁',linkEvents.length?`${linkEvents.length} link events logged`:'All links operational','green')}
    ${stat('Session Audit Trail',auditList.length,'◈','Administrative session events','purple')}
  </div>

  <section class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title">Packet tampering &amp; cryptographic defense</div>
        <div class="panel-sub">AES-256-GCM authentication tag verification and modified ciphertext rejection</div>
      </div>
      <span class="status ${tamperEvents.length?'failed':'neutral'}">${tamperEvents.length?`${tamperEvents.length} TAMPER DETECTIONS`:'NO ACTIVE TAMPER'}</span>
    </div>
    <div class="panel-body">
      ${tamperEvents.length?`<div class="event-list" style="max-height:280px">
        ${tamperEvents.map(e=>`<div class="event">
          <span class="event-dot bad"></span>
          <div class="event-text">
            <b>${esc(e.type.replaceAll('_',' '))} · <span style="color:#d9505c">${esc(e.result)}</span></b>
            ${esc(e.detail)}
            <span>${fmtDate(e.at)} · Cryptographic Integrity Barrier</span>
          </div>
        </div>`).join('')}
      </div>`:`<div class="empty">No packet tampering detected in this session. All transmitted packets passed AES-256-GCM tag verification.</div>`}
    </div>
  </section>

  <section class="panel" style="margin-top:16px">
    <div class="panel-head">
      <div>
        <div class="panel-title">Network link operational status &amp; topology audit</div>
        <div class="panel-sub">Link condition changes, router state events, and interface audits</div>
      </div>
      <span class="status">${linkEvents.length?`${linkEvents.length} LINK EVENTS`:'ALL LINKS HEALTHY'}</span>
    </div>
    <div class="panel-body">
      ${linkEvents.length?`<div class="event-list" style="max-height:280px">
        ${linkEvents.map(e=>`<div class="event">
          <span class="event-dot ${e.result==='OFFLINE'?'bad':'good'}"></span>
          <div class="event-text">
            <b>${esc(e.type.replaceAll('_',' '))} · <span style="color:${e.result==='OFFLINE'?'#d9505c':'#168a78'}">${esc(e.result)}</span></b>
            ${esc(e.detail)}
            <span>${fmtDate(e.at)} · Topology Interface Log</span>
          </div>
        </div>`).join('')}
      </div>`:`<div class="empty">No link state changes recorded. All regional routers and links operating nominally.</div>`}
    </div>
  </section>

  <section class="panel" style="margin-top:16px">
    <div class="panel-head">
      <div>
        <div class="panel-title">General audit trail</div>
        <div class="panel-sub">Application events recorded in this demo session</div>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Actor</th><th>Role</th><th>Action</th><th>Resource</th><th>Outcome</th><th>Timestamp</th></tr></thead>
        <tbody>${auditList.map(e=>`<tr><td>${esc(e.actor)}</td><td>${esc(e.role)}</td><td>${esc(e.action)}</td><td class="mono">${esc(e.resource)}</td><td>${status(e.outcome)}</td><td>${fmtDate(e.at)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No audit events yet.</td></tr>'}</tbody>
      </table>
    </div>
  </section>`;
}

async function renderReports(){
  const d=state.dashboard,m=d.metrics;
  let allTx=state.allTransactions;
  if(!allTx){
    try{const res=await api('/transactions');allTx=res.transactions||[];state.allTransactions=allTx;}catch{allTx=d.transactions||[];}
  }
  $('#content').innerHTML=`<div class="welcome">
    <div>
      <div class="eyebrow">ANALYTICS</div>
      <h1>Reports &amp; metrics</h1>
      <p>Summary based on current seeded and recorded demo data.</p>
    </div>
    <button class="button" id="export-csv">↓ Export transactions CSV</button>
  </div>
  <div class="metrics">
    ${stat('Completed volume',money(m.volume),'₹','From completed seeded transactions','green')}
    ${stat('Completed',m.completedTransactions,'✓','Transaction records','purple')}
    ${stat('Failed',m.failedTransactions,'!','Transaction records','orange')}
    ${stat('Nodes online',`${m.onlineNodes}/${m.totalNodes}`,'⌁','Current topology status')}
  </div>
  <div class="grid-two">
    <section class="panel">
      <div class="panel-head"><div><div class="panel-title">Transaction ledger extract</div><div class="panel-sub">Demo records · INR (${allTx.length} records)</div></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>${allTx.map(t=>`<tr><td class="mono">${t.id}</td><td>${t.type}</td><td class="money">${money(t.amount)}</td><td>${status(t.status)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No transactions recorded.</td></tr>'}</tbody>
        </table>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head"><div><div class="panel-title">Network performance</div><div class="panel-sub">Latest simulation measurements</div></div></div>
      <div class="panel-body">
        ${state.simulation?`<div class="split-cards">
          ${mini('Latency',`${state.simulation.latency??'—'} ms`)}
          ${mini('Packet loss',`${state.simulation.packetLossRate??0}%`)}
          ${mini('Retries',state.simulation.retries??0)}
        </div>`:'<div class="empty">Run a customer network transfer to generate measured simulation metrics.</div>'}
      </div>
    </section>
  </div>`;

  $('#export-csv').onclick=()=>{
    const rows=allTx;
    const csv=[['ID','Type','Source','Destination','Amount INR','Status','Created At'],...rows.map(t=>[t.id,t.type,t.source||'',t.destination||'',t.amount,t.status,t.createdAt])].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download='netbankx-transactions.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

async function logout(){
  try{await api('/auth/logout',{method:'POST',body:'{}'})}catch{}
  state.token='';state.user=null;
  state.dashboard=null;state.topology=null;state.simulation=null;state.allTransactions=null;
  localStorage.removeItem('netbankx_token');
  localStorage.removeItem('paysafe_token');
  showLogin();
}

// Scale the fixed-size login stage to fill the window at any screen size or browser zoom
const loginStacked=matchMedia('(max-width: 850px), (max-aspect-ratio: 1/1)');
function fitLoginStage(){
  const page=$('.login-page'), stage=$('.login-stage');
  if(!page||!stage) return;
  const fit=loginStacked.matches?1:Math.min(page.clientWidth/stage.offsetWidth, page.clientHeight/stage.offsetHeight);
  page.style.setProperty('--fit', fit);
}
addEventListener('resize', fitLoginStage);

function showLogin(){
  state.page='Overview';
  
  const roleGroups = {
    hq: [
      { id: 'admin@netbankx.demo|NetBankXDemo!2026', title: 'HQ Administrator', sub: 'admin@netbankx.demo · Full Access', tag: 'HQ-CORE' }
    ],
    regional: [
      { id: 'regional-a@netbankx.demo|RegionalDemo!26', title: 'North (REG-A)', sub: 'regional-a@netbankx.demo', tag: 'REG-A' },
      { id: 'regional-b@netbankx.demo|RegionalDemo!26', title: 'Central (REG-B)', sub: 'regional-b@netbankx.demo', tag: 'REG-B' },
      { id: 'regional-c@netbankx.demo|RegionalDemo!26', title: 'South (REG-C)', sub: 'regional-c@netbankx.demo', tag: 'REG-C' }
    ],
    branch: [
      { id: 'branch-a1@netbankx.demo|BranchDemo!26', title: 'BR-A1 · Hyderabad', sub: 'branch-a1@netbankx.demo', tag: 'BR-A1' },
      { id: 'branch-a2@netbankx.demo|BranchDemo!26', title: 'BR-A2 · Secunderabad', sub: 'branch-a2@netbankx.demo', tag: 'BR-A2' },
      { id: 'branch-b1@netbankx.demo|BranchDemo!26', title: 'BR-B1 · Bengaluru', sub: 'branch-b1@netbankx.demo', tag: 'BR-B1' },
      { id: 'branch-b2@netbankx.demo|BranchDemo!26', title: 'BR-B2 · Mysuru', sub: 'branch-b2@netbankx.demo', tag: 'BR-B2' },
      { id: 'branch-c1@netbankx.demo|BranchDemo!26', title: 'BR-C1 · Chennai', sub: 'branch-c1@netbankx.demo', tag: 'BR-C1' },
      { id: 'branch-c2@netbankx.demo|BranchDemo!26', title: 'BR-C2 · Vellore', sub: 'branch-c2@netbankx.demo', tag: 'BR-C2' }
    ],
    customer: [
      { id: 'customer-a1@netbankx.demo|CustomerDemo!26', title: 'Aarav Mehta', sub: 'customer-a1 · BR-A1', tag: 'CUST-01' },
      { id: 'customer-a2@netbankx.demo|CustomerDemo!26', title: 'Saanvi Shah', sub: 'customer-a2 · BR-A2', tag: 'CUST-04' },
      { id: 'customer-b1@netbankx.demo|CustomerDemo!26', title: 'Kabir Rao', sub: 'customer-b1 · BR-B1', tag: 'CUST-07' },
      { id: 'customer-b2@netbankx.demo|CustomerDemo!26', title: 'Atharv Singh', sub: 'customer-b2 · BR-B2', tag: 'CUST-10' },
      { id: 'customer-c1@netbankx.demo|CustomerDemo!26', title: 'Anaya Iyer', sub: 'customer-c1 · BR-C1', tag: 'CUST-13' },
      { id: 'customer-c2@netbankx.demo|CustomerDemo!26', title: 'Diya Sharma', sub: 'customer-c2 · BR-C2', tag: 'CUST-16' }
    ]
  };

  let activeTab = 'hq';

  function renderCredsGrid(tab) {
    const list = roleGroups[tab] || [];
    return `<div class="login-creds-grid tab-${tab}">
      ${list.map(c => `
        <button type="button" class="login-cred-btn" data-cred="${c.id}">
          <div class="cred-btn-top">
            <span class="cred-btn-title">${c.title}</span>
            <span class="cred-btn-tag">${c.tag}</span>
          </div>
          <div class="cred-btn-sub mono">${c.sub}</div>
        </button>
      `).join('')}
    </div>`;
  }

  $('#app').innerHTML = `
  <div class="login-page">
    <div class="login-bg-mesh">
      <div class="mesh-glow mesh-1"></div>
      <div class="mesh-glow mesh-2"></div>
      <div class="mesh-grid"></div>
    </div>

    <div class="login-stage">
    <div class="login-left">
      <div class="login-brand-row">
        <div class="brand">
          <div class="brand-mark" role="img" aria-label="NetBankX">${BRAND_GLYPH}</div>
          <div>
            <div class="brand-name">NetBank<span>X</span></div>
            <div class="brand-sub">ENTERPRISE BANKING LAB</div>
          </div>
        </div>
        <div class="login-status-tag">
          <span class="live-beacon"></span>
          <span>ENTERPRISE LAB v2.4</span>
        </div>
      </div>

      <div class="login-hero">
        <div class="login-hero-eyebrow">
          <span class="pulse-icon">●</span> FINANCIAL SYSTEMS · AUTONOMOUS CLEARING
        </div>
        <h1>Real-time banking.<br><span class="hero-gradient">Autonomous networks.</span></h1>
        <p>A mission-critical sandbox for banking ledger workflows, 4-tier Dijkstra packet routing, and cryptographic message defense.</p>
        
        <div class="login-pills-row">
          <div class="login-feature-badge"><span>⚡</span> 40 Gbps Core</div>
          <div class="login-feature-badge"><span>🛡️</span> AES-256-GCM Guard</div>
          <div class="login-feature-badge"><span>🧭</span> Dynamic Dijkstra</div>
        </div>
      </div>

      <div class="login-visual-card">
        <div class="login-visual-head">
          <div class="login-visual-title">
            <span class="live-dot"></span>
            <span>LIVE 4-TIER TOPOLOGY</span>
          </div>
          <div class="login-visual-pills">
            <span class="pill-l0">1 HQ</span>
            <span class="pill-l1">3 REGIONS</span>
            <span class="pill-l2">6 BANKS</span>
            <span class="pill-l3">18 ENDPOINTS</span>
          </div>
        </div>
        <div class="login-visual-body">
          ${miniTopology()}
        </div>
      </div>

      <div class="login-foot">
        <span>🔒 Fictional demonstration environment · Cryptographic tamper detection active</span>
      </div>
    </div>

    <div class="login-right">
      <div class="login-card">
        <div class="login-card-header">
          <div class="eyebrow-chip">SECURE ACCESS GATEWAY</div>
          <h2>Sign in to workspace</h2>
          <p class="login-card-sub">Choose a demo role preset or enter custom credentials</p>
        </div>

        <div class="login-role-tabs">
          <button type="button" class="role-tab active" data-tab="hq">🏢 HQ Admin</button>
          <button type="button" class="role-tab" data-tab="regional">🌐 Regions (3)</button>
          <button type="button" class="role-tab" data-tab="branch">🏦 Branches (6)</button>
          <button type="button" class="role-tab" data-tab="customer">👤 Customers (6)</button>
        </div>

        <div id="login-creds-container" class="login-creds-container">
          ${renderCredsGrid('hq')}
        </div>

        <form id="login-form" class="login-form-inner">
          <div class="login-fields-row">
            <div class="field">
              <label for="login-email">Email or Username</label>
              <div class="input-with-icon">
                <span class="input-icon">✉</span>
                <input id="login-email" type="email" value="admin@netbankx.demo" autocomplete="username" required placeholder="name@netbankx.demo">
              </div>
            </div>
            <div class="field">
              <label for="login-password">Password</label>
              <div class="input-with-icon">
                <span class="input-icon">🔑</span>
                <input id="login-password" type="password" value="NetBankXDemo!2026" autocomplete="current-password" required placeholder="••••••••">
              </div>
            </div>
          </div>
          <div id="login-error" class="login-error"></div>
          <button class="button primary login-submit-btn" type="submit">
            <span>Enter Secure Workspace</span>
            <span class="btn-arrow">→</span>
          </button>
        </form>

        <div class="login-legal-footer">
          <span>Enterprise Banking Network Simulation · All data is localized</span>
        </div>
      </div>
    </div>
    </div>
  </div>`;
  fitLoginStage();

  function bindCredButtons() {
    document.querySelectorAll('[data-cred]').forEach(b => {
      b.onclick = () => {
        document.querySelectorAll('[data-cred]').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        const [email, password] = b.dataset.cred.split('|');
        $('#login-email').value = email;
        $('#login-password').value = password;
      };
    });
  }

  document.querySelectorAll('.role-tab').forEach(tabBtn => {
    tabBtn.onclick = () => {
      document.querySelectorAll('.role-tab').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');
      activeTab = tabBtn.dataset.tab;
      $('#login-creds-container').innerHTML = renderCredsGrid(activeTab);
      bindCredButtons();
      const firstBtn = $('#login-creds-container [data-cred]');
      if (firstBtn) firstBtn.click();
    };
  });

  bindCredButtons();
  const initialBtn = document.querySelector('[data-cred]');
  if (initialBtn) initialBtn.classList.add('selected');

  $('#login-form').onsubmit = async e => {
    e.preventDefault();
    $('#login-error').textContent = '';
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    try {
      const d = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: $('#login-email').value.trim(),
          password: $('#login-password').value
        })
      });
      state.token = d.token;
      state.user = d.user;
      localStorage.setItem('netbankx_token', d.token);
      state.dashboard = null;
      state.topology = null;
      state.simulation = null;
      state.allTransactions = null;
      shell();
    } catch(err) {
      $('#login-error').textContent = err.message || 'Authentication failed';
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  };
}

async function init(){
  if(state.token){
    try{
      const d=await api('/auth/me');
      state.user=d.user;
      shell();
      return;
    }catch{
      localStorage.removeItem('netbankx_token');
      localStorage.removeItem('paysafe_token');
      state.token='';
    }
  }
  showLogin();
}

init();
