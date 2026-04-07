// ─── DEFAULT DATA ────────────────────────────────────────────────────────────

const DEFAULT_PLAN = {
  0:{name:'Sunday',type:'rest',label:'Yoga + bike Zone 2',items:[{name:'Yoga',detail:'30–45 min'},{name:'Bike Zone 2',detail:'30 min, HR <132'},{name:'VMO protocol',detail:'10 min'}]},
  1:{name:'Monday',type:'training',label:'Hyrox Engine',items:[{name:'Hyrox Engine — 1Rebel',detail:'50:10 then 45:15 intervals'},{name:'Row → Run → SkiErg → Track',detail:'With lunges + sled push'},{name:'VMO protocol',detail:'10 min warm-up'}]},
  2:{name:'Tuesday',type:'training',label:'Race-specific strength',items:[{name:'VMO protocol',detail:'10 min'},{name:'Leg press + Bulgarian split squats',detail:'4×6–8, heavy'},{name:'Wall balls 5×15',detail:'6kg top target — elbows DOWN, cup hands'},{name:'DB thrusters 3×10',detail:'6–8kg each hand'},{name:'Farmers carry 2×100m',detail:'16kg'}]},
  3:{name:'Wednesday',type:'training',label:'SkiErg + Row Zone 2',items:[{name:'Alternating blocks',detail:'5 min SkiErg → 5 min run ×3, then Row blocks'},{name:'Zone 2 only',detail:'HR <132 — nasal breathing'},{name:'Total ~50 min',detail:''}]},
  4:{name:'Thursday',type:'training',label:'Stations + sled finisher',items:[{name:'VMO protocol',detail:'10 min'},{name:'SkiErg 1000m',detail:'Target ~4:56'},{name:'Wall balls 3×20',detail:'6kg top target, 15-rep blocks'},{name:'Burpee broad jumps 30m',detail:'Land soft'},{name:'Row 1000m',detail:'Target ~5:12'},{name:'Lunges 30m',detail:'20kg, 90s rest'},{name:'Sled pull 2×50m',detail:'78kg'},{name:'Sled push 2×50m',detail:'102kg'}]},
  5:{name:'Friday',type:'training',label:'Bike Zone 2',items:[{name:'Stationary bike / arc trainer',detail:'45–55 min, HR <132'},{name:'VMO protocol',detail:'10 min'}]},
  6:{name:'Saturday',type:'training',label:'Hyrox 90',items:[{name:'Hyrox 90 class',detail:'Third Space — full circuit'},{name:'Wall balls 6kg top target',detail:'Note all times'}]}
};

const DEFAULT_STATIONS = [
  {id:'skierg',    name:'SkiErg 1000m',      fields:[{key:'time',label:'Time (mm:ss)',ph:'4:56'}]},
  {id:'row',       name:'Row 1000m',          fields:[{key:'time',label:'Time (mm:ss)',ph:'5:12'}]},
  {id:'wallball',  name:'Wall balls',         fields:[{key:'set1',label:'Set 1 (s/15)',ph:'33'},{key:'set2',label:'Set 2',ph:'33'},{key:'set3',label:'Set 3',ph:'36'},{key:'total',label:'Total reps',ph:'50'}]},
  {id:'lunges',    name:'Sandbag lunges',     fields:[{key:'time',label:'Time (mm:ss)',ph:'1:36'},{key:'dist',label:'Dist (m)',ph:'50'},{key:'weight',label:'kg',ph:'20'}]},
  {id:'bbj',       name:'Burpee broad jumps', fields:[{key:'time',label:'Time (mm:ss)',ph:'2:30'},{key:'dist',label:'Dist (m)',ph:'80'}]},
  {id:'sled_pull', name:'Sled pull',          fields:[{key:'time',label:'Time (mm:ss)',ph:'3:54'},{key:'dist',label:'Dist (m)',ph:'50'},{key:'weight',label:'kg',ph:'78'}]},
  {id:'sled_push', name:'Sled push',          fields:[{key:'time',label:'Time (mm:ss)',ph:'2:00'},{key:'dist',label:'Dist (m)',ph:'50'},{key:'weight',label:'kg',ph:'102'}]},
  {id:'farmers',   name:'Farmers carry',      fields:[{key:'time',label:'Time (mm:ss)',ph:'2:00'},{key:'dist',label:'Dist (m)',ph:'100'},{key:'weight',label:'kg',ph:'16'}]},
];

const MACROS = {
  training: {P:120, C:250, F:58, kcal:2000},
  rest:     {P:120, C:210, F:55, kcal:1800}
};

// ─── STATE ───────────────────────────────────────────────────────────────────

let db = {
  checkins:[], foodLogs:[], workouts:[], measurements:[],
  customPlan:null, customStations:null, weekSwaps:{},
  foodLibrary:[]
};
let selectedPerf = 'normal';
let customFoodVisible = false;
let sheetsUrl = localStorage.getItem('sheetsUrl') || '';
let editingCheckinDate = null;
let activeWorkoutDate = null;
let weekOffset = 0;
let swapFromDate = null;
let searchTimeout = null;

function getPlan() { return db.customPlan ? db.customPlan : JSON.parse(JSON.stringify(DEFAULT_PLAN)); }
function getStations() { return db.customStations ? db.customStations : JSON.parse(JSON.stringify(DEFAULT_STATIONS)); }

function loadDB() {
  try {
    const s = localStorage.getItem('ana_hyrox_db');
    if (s) db = {...db, ...JSON.parse(s)};
    if (!db.foodLibrary || db.foodLibrary.length === 0) seedLibrary();
  } catch(e) {}
}

function saveDB() {
  try { localStorage.setItem('ana_hyrox_db', JSON.stringify(db)); } catch(e) {}
  if (sheetsUrl) syncToSheets();
}

function seedLibrary() {
  if (typeof STARTER_FOODS !== 'undefined') {
    db.foodLibrary = STARTER_FOODS.map((f, i) => ({...f, id:'starter_'+i}));
    saveDB();
  }
}

// ─── COLLAPSIBLE ─────────────────────────────────────────────────────────────

function toggleCollapse(bodyId) {
  const body = document.getElementById(bodyId);
  const arrow = document.getElementById(bodyId.replace('-body','-arrow'));
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▸' : '▾';
  if (!isOpen && bodyId === 'weekly-body') renderWeekly();
  if (!isOpen && bodyId === 'progress-body') renderProgress();
  if (!isOpen && bodyId === 'plan-body') renderPlanEditor();
}

// ─── DATE HELPERS ────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split('T')[0]; }
function dow() { return new Date().getDay(); }
function getWeekDates(offset) {
  const now = new Date(); const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay()+6)%7) + offset*7);
  return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d.toISOString().split('T')[0];});
}
function dateToLabel(d) { return new Date(d+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}); }
function isPast(d) { return d < today(); }
function isToday(d) { return d === today(); }
function isFuture(d) { return d > today(); }
function getDowFromDate(d) { return new Date(d+'T12:00:00').getDay(); }
function getPlanForDate(dateStr) {
  if (db.weekSwaps && db.weekSwaps[dateStr] !== undefined) return getPlan()[db.weekSwaps[dateStr]];
  return getPlan()[getDowFromDate(dateStr)];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getCyclePhase(d) {
  if (!d) return null;
  if (d>=1&&d<=5) return 'menstrual';
  if (d>=6&&d<=13) return 'follicular';
  if (d>=14&&d<=16) return 'ovulation';
  return 'luteal';
}
function getStressLevel(hrv,bb,stress,sleep) {
  let s=0;
  if(hrv&&hrv<55)s++; if(bb&&bb<50)s++; if(stress&&stress>25)s++; if(sleep&&sleep<65)s++;
  return s>=3?'red':s>=2?'amber':'green';
}
function timeToSeconds(t) {
  if(!t)return null; const p=t.split(':');
  return p.length===2?parseInt(p[0])*60+parseFloat(p[1]):parseFloat(t);
}
function get7DayAvg() {
  const r=db.checkins.filter(c=>c.weight).slice(-7);
  if(!r.length)return null;
  return r.reduce((s,c)=>s+c.weight,0)/r.length;
}
function getPrevPhaseAvg(phase) {
  if(!phase||db.checkins.length<14)return null;
  const pc=db.checkins.filter(c=>getCyclePhase(c.cycle)===phase&&c.weight);
  if(pc.length<4)return null;
  const prev=pc.slice(-8,-4); if(!prev.length)return null;
  return prev.reduce((s,c)=>s+c.weight,0)/prev.length;
}
function getFoodTotals(foods) {
  return foods.reduce((a,f)=>({P:a.P+(f.P||0),C:a.C+(f.C||0),F:a.F+(f.F||0)}),{P:0,C:0,F:0});
}
function getTodayFood() { return (db.foodLogs||[]).filter(f=>f.date===today()); }
function checkPB(sid,sd,date) {
  if(!sd.time)return false; const secs=timeToSeconds(sd.time); if(!secs)return false;
  const prev=(db.workouts||[]).filter(w=>w.date!==date&&w.stations[sid]&&w.stations[sid].time);
  if(!prev.length)return false;
  return secs<Math.min(...prev.map(w=>timeToSeconds(w.stations[sid].time)||9999));
}

// ─── ALGORITHM ───────────────────────────────────────────────────────────────

function runAlgorithm() {
  const latest=db.checkins[db.checkins.length-1];
  if(!latest)return{recommendation:'Log daily check-ins for 2 weeks to activate the algorithm.',level:'info'};
  const avg=get7DayAvg(); const phase=getCyclePhase(latest.cycle);
  const stress=getStressLevel(latest.hrv,latest.bb,latest.stress,latest.sleep);
  if(phase==='luteal'||phase==='menstrual')
    return{recommendation:`${phase==='luteal'?'Luteal':'Menstrual'} phase — no adjustments. Compare weight to same phase last month.`,level:'warn'};
  if(stress==='red')
    return{recommendation:'System red-lining. 7–14 day diet break at full maintenance. Stop cardio ladder.',level:'danger'};
  const prevAvg=getPrevPhaseAvg(phase);
  if(!prevAvg||!avg)return{recommendation:'Need more data across cycle phases. Keep logging daily.',level:'info'};
  const change=avg-prevAvg;
  if(latest.perf==='pr'&&change<=0)
    return{recommendation:`PRs + weight dropping (${change.toFixed(1)} kg vs same phase). Change nothing.`,level:'success'};
  if(Math.abs(change)<0.2&&db.checkins.length>=14){
    if((db.checkins||[]).slice(-7).filter(c=>c.hunger>=8).length>=3)
      return{recommendation:'Stalled + hunger high 3+ days. Schedule 2-day refeed (Sat–Sun): carbs to maintenance.',level:'warn'};
    return{recommendation:'Stalled 2 weeks. Add 1,500–2,000 steps/day before touching food.',level:'warn'};
  }
  if(change<-0.5)return{recommendation:`Dropping fast (${Math.abs(change).toFixed(1)} kg). Whoosh after stall? Hold. If consistent 2nd week — add 100 kcal via carbs.`,level:'warn'};
  if(change>0.6)return{recommendation:`Weight up ${change.toFixed(1)} kg vs same phase. Hold steady.`,level:'warn'};
  return{recommendation:`On track — ${Math.abs(change).toFixed(1)} kg ${change<0?'down':'up'} vs same cycle phase.`,level:'success'};
}

// ─── SYNC ─────────────────────────────────────────────────────────────────────

async function syncToSheets() {
  if(!sheetsUrl)return;
  const el=document.getElementById('sync-status');
  if(el){el.textContent='Syncing...';el.className='sync-status syncing';}
  try {
    await fetch(sheetsUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sync',data:db,timestamp:new Date().toISOString()})});
    if(el){el.textContent='Synced '+new Date().toLocaleTimeString();el.className='sync-status synced';}
  } catch(e){if(el){el.textContent='Sync failed — saved locally';el.className='sync-status error';}}
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

function showSection(id) {
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('nav-'+id).classList.add('active');
  if(id==='today')renderToday();
  if(id==='food')renderFood();
  if(id==='workouts')renderWorkout();
  if(id==='stats')renderStats();
  if(id==='settings')renderSettings();
}

// ─── TODAY ────────────────────────────────────────────────────────────────────

function renderToday() {
  const d=dow(); const plan=getPlan()[d]; const isTraining=plan.type==='training';
  const macros=MACROS[plan.type];
  const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  document.getElementById('today-heading').textContent=days[d];
  document.getElementById('today-date').textContent=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const alerts=document.getElementById('today-alerts'); alerts.innerHTML='';
  const latest=(db.checkins||[])[db.checkins.length-1];
  if(latest){
    const sl=getStressLevel(latest.hrv,latest.bb,latest.stress,latest.sleep);
    if(sl==='red')alerts.innerHTML+=`<div class="alert alert-danger">System stressed — LISS only today, consider a refeed this week.</div>`;
    else if(sl==='amber')alerts.innerHTML+=`<div class="alert alert-warn">Recovery amber. Manage intensity today.</div>`;
    const phase=getCyclePhase(latest.cycle);
    if(phase==='luteal')alerts.innerHTML+=`<div class="alert alert-warn">Luteal phase — hunger buffer active. No macro adjustments.</div>`;
    if(phase==='menstrual')alerts.innerHTML+=`<div class="alert alert-info">Menstrual phase — water retention expected.</div>`;
  }
  document.getElementById('today-workout').innerHTML=
    `<div class="badge badge-${isTraining?'info':'success'}" style="margin-bottom:10px;">${plan.label}</div>`+
    plan.items.map(i=>`<div class="workout-item"><div class="name">${i.name}</div>${i.detail?`<div class="detail">${i.detail}</div>`:''}</div>`).join('');
  const foods=getTodayFood(); const totals=getFoodTotals(foods);
  const pct=(v,t)=>Math.min(100,Math.round(v/t*100));
  document.getElementById('macro-type-badge').innerHTML=`<div class="badge badge-${isTraining?'info':'success'}">${isTraining?'Training day':'Rest day'} targets</div>`;
  document.getElementById('today-macros').innerHTML=
    [['Protein',totals.P,macros.P,'g','#378ADD'],['Carbs',totals.C,macros.C,'g','#1D9E75'],['Fat',totals.F,macros.F,'g','#EF9F27']]
    .map(([l,v,t,u,c])=>`<div class="macro-bar"><div class="bar-label"><span>${l}</span><span>${Math.round(v)}/${t}${u}</span></div><div class="track"><div class="fill" style="width:${pct(v,t)}%;background:${c};"></div></div></div>`).join('')+
    `<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">${Math.round(totals.P*4+totals.C*4+totals.F*9)} / ${macros.kcal} kcal · Remaining P${Math.max(0,Math.round(macros.P-totals.P))}g C${Math.max(0,Math.round(macros.C-totals.C))}g F${Math.max(0,Math.round(macros.F-totals.F))}g</div>`;
}

// ─── FOOD — LIBRARY + SEARCH ──────────────────────────────────────────────────

function renderFood() {
  const isTraining=getPlan()[dow()].type==='training'; const macros=MACROS[isTraining?'training':'rest'];
  const foods=getTodayFood(); const totals=getFoodTotals(foods); const pct=(v,t)=>Math.min(100,Math.round(v/t*100));
  document.getElementById('food-date-label').textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  document.getElementById('food-totals').innerHTML=
    [['Protein',totals.P,macros.P,'g','#378ADD'],['Carbs',totals.C,macros.C,'g','#1D9E75'],['Fat',totals.F,macros.F,'g','#EF9F27']]
    .map(([l,v,t,u,c])=>`<div class="macro-bar"><div class="bar-label"><span>${l}</span><span>${Math.round(v)}/${t}${u}</span></div><div class="track"><div class="fill" style="width:${pct(v,t)}%;background:${c};"></div></div></div>`).join('')+
    `<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">${Math.round(totals.P*4+totals.C*4+totals.F*9)} / ${macros.kcal} kcal</div>`;
  renderFoodLog();
}

function renderFoodLog() {
  const foods=getTodayFood();
  const meals=['breakfast','lunch','snack','dinner','other'];
  const mealLabels={breakfast:'Breakfast',lunch:'Lunch',snack:'Snack',dinner:'Dinner',other:'Other'};
  const log=document.getElementById('food-log');
  if(!foods.length){log.innerHTML='<p style="font-size:13px;color:var(--text-secondary);">Nothing logged yet today.</p>';return;}
  log.innerHTML=meals.map(m=>{
    const mf=foods.filter(f=>f.meal===m); if(!mf.length)return'';
    const mt=getFoodTotals(mf);
    return`<div class="meal-section"><div class="meal-header"><span>${mealLabels[m]}</span><span>P${Math.round(mt.P)} C${Math.round(mt.C)} F${Math.round(mt.F)}</span></div>${mf.map(f=>`<div class="food-item"><div><div class="food-name">${f.name}</div><div class="food-macros">P${f.P}g · C${f.C}g · F${f.F}g</div></div><button class="del-btn" onclick="deleteFood('${f.id}')">remove</button></div>`).join('')}</div>`;
  }).join('');
}

// Search: library first, then Open Food Facts
function onFoodSearch(query) {
  clearTimeout(searchTimeout);
  const resultsEl=document.getElementById('food-search-results');
  const spinner=document.getElementById('food-search-spinner');
  if(!query.trim()){resultsEl.style.display='none';return;}

  // Local library results
  const q=query.toLowerCase();
  const local=(db.foodLibrary||[]).filter(f=>f.name.toLowerCase().includes(q)).slice(0,6);
  showSearchResults(local, [], query);

  // Debounce Open Food Facts search
  searchTimeout=setTimeout(async()=>{
    spinner.style.display='inline';
    const off=await searchOpenFoodFacts(query);
    spinner.style.display='none';
    showSearchResults(local, off, query);
  }, 600);
}

async function searchOpenFoodFacts(query) {
  try {
    const url=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,nutriments,serving_size`;
    const r=await fetch(url);
    const data=await r.json();
    return (data.products||[]).filter(p=>{
      const n=p.nutriments;
      return p.product_name && n && n['proteins_100g']!=null && n['carbohydrates_100g']!=null && n['fat_100g']!=null;
    }).map(p=>({
      name: p.product_name,
      P: Math.round(p.nutriments['proteins_100g']||0),
      C: Math.round(p.nutriments['carbohydrates_100g']||0),
      F: Math.round(p.nutriments['fat_100g']||0),
      source:'off'
    })).slice(0,6);
  } catch(e){ return []; }
}

function showSearchResults(local, off, query) {
  const resultsEl=document.getElementById('food-search-results');
  if(!local.length&&!off.length){
    resultsEl.style.display='block';
    resultsEl.innerHTML='<p style="padding:10px 12px;font-size:13px;color:var(--text-secondary);">No results found.</p>';
    return;
  }
  resultsEl.style.display='block';
  const renderItem=(f,isOff)=>{
    const label=isOff?'<span style="font-size:10px;color:var(--text-secondary);margin-left:4px;">OFF</span>':'';
    return`<div onclick="logSearchResult(${JSON.stringify(f).replace(/"/g,'&quot;')})" style="padding:10px 12px;border-bottom:0.5px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
      <div><div style="font-size:13px;font-weight:500;">${f.name}${label}</div><div style="font-size:11px;color:var(--text-secondary);">P${f.P}g · C${f.C}g · F${f.F}g per 100g</div></div>
      <span style="font-size:18px;color:var(--text-secondary);">+</span>
    </div>`;
  };
  let html='';
  if(local.length){html+=`<div style="padding:6px 12px 2px;font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">My library</div>`; html+=local.map(f=>renderItem(f,false)).join('');}
  if(off.length){html+=`<div style="padding:6px 12px 2px;font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Open Food Facts</div>`; html+=off.map(f=>renderItem(f,true)).join('');}
  resultsEl.innerHTML=html;
}

function logSearchResult(f) {
  const meal=document.getElementById('food-meal-select').value;
  const entry={id:Date.now()+'', date:today(), name:f.name, meal, P:f.P, C:f.C, F:f.F};
  if(!db.foodLogs)db.foodLogs=[];
  db.foodLogs.push(entry);
  // If from OFF and not already in library, offer to save
  if(f.source==='off'){
    const inLib=(db.foodLibrary||[]).some(l=>l.name.toLowerCase()===f.name.toLowerCase());
    if(!inLib && confirm(`Save "${f.name}" to your library for next time?`)){
      if(!db.foodLibrary)db.foodLibrary=[];
      db.foodLibrary.push({id:'lib_'+Date.now(), name:f.name, meal, P:f.P, C:f.C, F:f.F});
    }
  }
  saveDB();
  document.getElementById('food-search').value='';
  document.getElementById('food-search-results').style.display='none';
  renderFood();
  if(document.getElementById('today').classList.contains('active'))renderToday();
  showToast('Added to log.');
}

function toggleAddCustom() {
  customFoodVisible=!customFoodVisible;
  document.getElementById('custom-food-form').style.display=customFoodVisible?'block':'none';
}

function addCustomFood() {
  const name=document.getElementById('cf-name').value.trim(); if(!name)return;
  const P=parseFloat(document.getElementById('cf-p').value)||0;
  const C=parseFloat(document.getElementById('cf-c').value)||0;
  const F=parseFloat(document.getElementById('cf-f').value)||0;
  const meal=document.getElementById('food-meal-select').value;
  const saveToLib=document.getElementById('cf-save').value==='yes';
  const entry={id:Date.now()+'', date:today(), name, meal, P, C, F};
  if(!db.foodLogs)db.foodLogs=[];
  db.foodLogs.push(entry);
  if(saveToLib){
    if(!db.foodLibrary)db.foodLibrary=[];
    db.foodLibrary.push({id:'lib_'+Date.now(), name, meal, P, C, F});
  }
  saveDB();
  ['cf-name','cf-p','cf-c','cf-f'].forEach(id=>document.getElementById(id).value='');
  toggleAddCustom(); renderFood();
  if(document.getElementById('today').classList.contains('active'))renderToday();
  showToast(saveToLib?'Added to log and library.':'Added to log.');
}

function deleteFood(id) {
  db.foodLogs=(db.foodLogs||[]).filter(f=>f.id!==id); saveDB(); renderFood();
  if(document.getElementById('today').classList.contains('active'))renderToday();
}

// Library panel
function showLibrary() {
  document.getElementById('library-panel').style.display='block';
  filterLibrary('');
}
function hideLibrary() { document.getElementById('library-panel').style.display='none'; }

function filterLibrary(q) {
  const list=document.getElementById('library-list');
  const lib=db.foodLibrary||[];
  const filtered=q?lib.filter(f=>f.name.toLowerCase().includes(q.toLowerCase())):lib;
  if(!filtered.length){list.innerHTML='<p style="font-size:13px;color:var(--text-secondary);">No items.</p>';return;}
  const meal=document.getElementById('food-meal-select').value;
  list.innerHTML=filtered.map(f=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:0.5px solid var(--border);">
      <div>
        <div style="font-size:13px;font-weight:500;">${f.name}</div>
        <div style="font-size:11px;color:var(--text-secondary);">P${f.P}g · C${f.C}g · F${f.F}g</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <button class="btn-small" onclick="logFromLibrary('${f.id}')">Add</button>
        <button class="btn-small" style="color:var(--red-text);" onclick="deleteFromLibrary('${f.id}')">×</button>
      </div>
    </div>`).join('');
}

function logFromLibrary(id) {
  const f=(db.foodLibrary||[]).find(x=>x.id===id); if(!f)return;
  const meal=document.getElementById('food-meal-select').value;
  if(!db.foodLogs)db.foodLogs=[];
  db.foodLogs.push({id:Date.now()+'', date:today(), name:f.name, meal, P:f.P, C:f.C, F:f.F});
  saveDB(); renderFood();
  if(document.getElementById('today').classList.contains('active'))renderToday();
  showToast('Added to log.');
}

function deleteFromLibrary(id) {
  if(!confirm('Remove from library?'))return;
  db.foodLibrary=(db.foodLibrary||[]).filter(f=>f.id!==id);
  saveDB(); filterLibrary(document.getElementById('library-search').value||'');
  showToast('Removed from library.');
}

// ─── WORKOUTS — WEEKLY VIEW ───────────────────────────────────────────────────

function renderWorkout() {
  closeDayPanel(); closeSwap();
  const dates=getWeekDates(weekOffset);
  document.getElementById('workout-week-label').textContent=`${dateToLabel(dates[0])} – ${dateToLabel(dates[6])}`;
  document.getElementById('week-grid').innerHTML=dates.map(dateStr=>{
    const plan=getPlanForDate(dateStr); const logged=(db.workouts||[]).find(w=>w.date===dateStr);
    const isTd=isToday(dateStr); const isPst=isPast(dateStr);
    let badge='';
    if(plan.type==='rest')badge=`<span class="badge badge-success" style="margin:0;font-size:10px;">Rest</span>`;
    else if(logged)badge=`<span class="badge badge-info" style="margin:0;font-size:10px;">Done</span>`;
    else if(isPst)badge=`<span class="badge badge-warn" style="margin:0;font-size:10px;">Missed</span>`;
    else if(isTd)badge=`<span class="badge badge-info" style="margin:0;font-size:10px;">Today</span>`;
    return`<div onclick="openDayPanel('${dateStr}')" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;margin-bottom:6px;border-radius:var(--radius-lg);border:${isTd?'1.5px solid #378ADD':'0.5px solid var(--border)'};background:${isTd?'var(--bg-secondary)':'var(--bg)'};cursor:pointer;">
      <div><div style="font-size:13px;font-weight:${isTd?'500':'400'};margin-bottom:3px;">${dateToLabel(dateStr)}</div><div style="font-size:12px;color:var(--text-secondary);">${plan.label}</div></div>
      <div style="display:flex;align-items:center;gap:6px;">${badge}<span style="font-size:16px;color:var(--text-secondary);">›</span></div>
    </div>`;
  }).join('');
}

function shiftWeek(dir){if(dir===0)weekOffset=0;else weekOffset+=dir;renderWorkout();}

function openDayPanel(dateStr) {
  activeWorkoutDate=dateStr;
  document.getElementById('week-grid').style.display='none';
  document.getElementById('day-panel').style.display='block';
  const plan=getPlanForDate(dateStr);
  document.getElementById('day-panel-title').textContent=dateToLabel(dateStr);
  document.getElementById('day-panel-programmed').innerHTML=
    `<div class="badge badge-${plan.type==='training'?'info':'success'}" style="margin-bottom:8px;">${plan.label}</div>`+
    plan.items.map(i=>`<div class="workout-item"><div class="name">${i.name}</div>${i.detail?`<div class="detail">${i.detail}</div>`:''}</div>`).join('');
  const logSection=document.getElementById('day-log-section');
  if(isFuture(dateStr)){logSection.style.display='none';}
  else {
    logSection.style.display='block';
    document.getElementById('day-log-title').textContent=isToday(dateStr)?'Log results':`Results — ${dateStr}`;
    const stations=getStations(); const existing=(db.workouts||[]).find(w=>w.date===dateStr);
    document.getElementById('station-inputs').innerHTML=stations.map(s=>`
      <div class="station-row"><div class="station-name">${s.name}</div><div class="station-inputs">
        ${s.fields.map(f=>`<div class="station-input-wrap"><label>${f.label}</label><input type="text" id="st-${s.id}-${f.key}" placeholder="${f.ph}" value="${existing&&existing.stations[s.id]?existing.stations[s.id][f.key]||'':''}"></div>`).join('')}
      </div></div>`).join('');
    document.getElementById('workout-save-btn').textContent=existing?'Update session':'Save session';
  }
}

function closeDayPanel(){
  activeWorkoutDate=null;
  const p=document.getElementById('day-panel');if(p)p.style.display='none';
  const g=document.getElementById('week-grid');if(g)g.style.display='block';
  renderWorkout();
}
function cancelEditWorkout(){closeDayPanel();}

function saveWorkout(){
  if(!activeWorkoutDate)return;
  const stations=getStations(); const entry={date:activeWorkoutDate,stations:{}};
  stations.forEach(s=>{
    const sd={};
    s.fields.forEach(f=>{const v=document.getElementById(`st-${s.id}-${f.key}`);if(v&&v.value.trim())sd[f.key]=v.value.trim();});
    if(Object.keys(sd).length)entry.stations[s.id]=sd;
  });
  if(!db.workouts)db.workouts=[];
  const ei=db.workouts.findIndex(w=>w.date===activeWorkoutDate);
  if(ei>=0)db.workouts[ei]=entry;else db.workouts.push(entry);
  saveDB(); document.getElementById('workout-save-btn').textContent='Update session'; showToast('Session saved.');
}

function reassignDay(){
  swapFromDate=activeWorkoutDate;
  const dates=getWeekDates(weekOffset); const fromPlan=getPlanForDate(swapFromDate);
  document.getElementById('swap-from-label').textContent=`${dateToLabel(swapFromDate)} (${fromPlan.label})`;
  document.getElementById('swap-targets').innerHTML=dates.filter(d=>d!==swapFromDate).map(d=>{
    const p=getPlanForDate(d);
    return`<button class="btn-secondary" style="margin-bottom:6px;" onclick="applySwap('${d}')">${dateToLabel(d)} — ${p.label}</button>`;
  }).join('');
  document.getElementById('swap-panel').style.display='block';
  document.getElementById('day-panel').style.display='none';
}
function applySwap(toDate){
  if(!swapFromDate)return;
  if(!db.weekSwaps)db.weekSwaps={};
  const fDow=getDowFromDate(swapFromDate); const tDow=getDowFromDate(toDate);
  const fSwapped=db.weekSwaps[swapFromDate]!==undefined?db.weekSwaps[swapFromDate]:fDow;
  const tSwapped=db.weekSwaps[toDate]!==undefined?db.weekSwaps[toDate]:tDow;
  db.weekSwaps[swapFromDate]=tSwapped; db.weekSwaps[toDate]=fSwapped;
  saveDB(); closeSwap(); renderWorkout(); showToast('Sessions swapped.');
}
function closeSwap(){swapFromDate=null;const sp=document.getElementById('swap-panel');if(sp)sp.style.display='none';}

// ─── STATS ────────────────────────────────────────────────────────────────────

function renderStats(){
  document.getElementById('stats-date').textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  renderCheckinHistory();
}

// ─── CHECK-IN ─────────────────────────────────────────────────────────────────

function populateCheckinForm(e){
  ['weight','cycle','hrv','rhr','bb','stress','sleep','deep'].forEach(f=>{const el=document.getElementById('ci-'+f);if(el&&e[f]!=null)el.value=e[f];});
  if(e.steps){document.getElementById('ci-steps').value=e.steps;document.getElementById('steps-val').textContent=(e.steps/1000).toFixed(1)+'k';}
  if(e.energy){document.getElementById('ci-energy').value=e.energy;document.getElementById('energy-val').textContent=e.energy;}
  if(e.hunger){document.getElementById('ci-hunger').value=e.hunger;document.getElementById('hunger-val').textContent=e.hunger;}
  if(e.perf)selectPerf(e.perf);
}
function editCheckin(date){
  editingCheckinDate=date;
  const e=(db.checkins||[]).find(c=>c.date===date); if(e)populateCheckinForm(e);
  document.getElementById('checkin-save-btn').textContent=`Update ${date}`;
  document.getElementById('checkin-cancel-btn').style.display='block';
  if(document.getElementById('checkin-body').style.display==='none')toggleCollapse('checkin-body');
  document.querySelector('#checkin-body .card').scrollIntoView({behavior:'smooth'});
}
function cancelEditCheckin(){
  editingCheckinDate=null;
  document.getElementById('checkin-save-btn').textContent='Save check-in';
  document.getElementById('checkin-cancel-btn').style.display='none';
}
function deleteCheckin(date){
  if(!confirm(`Delete check-in from ${date}?`))return;
  db.checkins=(db.checkins||[]).filter(c=>c.date!==date);
  saveDB();renderCheckinHistory();showToast('Check-in deleted.');
}
function selectPerf(t){
  selectedPerf=t;
  ['pr','normal','below','rest'].forEach(x=>{const el=document.getElementById('perf-'+x);if(el)el.classList.toggle('selected',x===t);});
}
function saveCheckin(){
  const targetDate=editingCheckinDate||today();
  const entry={
    date:targetDate,
    weight:parseFloat(document.getElementById('ci-weight').value)||null,
    cycle:parseInt(document.getElementById('ci-cycle').value)||null,
    hrv:parseFloat(document.getElementById('ci-hrv').value)||null,
    rhr:parseFloat(document.getElementById('ci-rhr').value)||null,
    bb:parseFloat(document.getElementById('ci-bb').value)||null,
    stress:parseFloat(document.getElementById('ci-stress').value)||null,
    sleep:parseFloat(document.getElementById('ci-sleep').value)||null,
    deep:parseFloat(document.getElementById('ci-deep').value)||null,
    steps:parseInt(document.getElementById('ci-steps').value)||null,
    energy:parseInt(document.getElementById('ci-energy').value),
    hunger:parseInt(document.getElementById('ci-hunger').value),
    perf:selectedPerf
  };
  if(!db.checkins)db.checkins=[];
  const ei=db.checkins.findIndex(c=>c.date===targetDate);
  if(ei>=0)db.checkins[ei]=entry;else db.checkins.push(entry);
  editingCheckinDate=null;
  document.getElementById('checkin-save-btn').textContent='Save check-in';
  document.getElementById('checkin-cancel-btn').style.display='none';
  saveDB();renderCheckinHistory();showToast('Check-in saved.');
}
function renderCheckinHistory(){
  const ch=document.getElementById('checkin-history');
  if(!db.checkins||!db.checkins.length){ch.innerHTML='<p style="font-size:13px;color:var(--text-secondary);">No check-ins yet.</p>';return;}
  ch.innerHTML=(db.checkins||[]).slice().reverse().slice(0,14).map(c=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:0.5px solid var(--border);">
      <div>
        <div style="font-size:13px;font-weight:500;">${c.date}${c.weight?' · '+c.weight+'kg':''}</div>
        <div style="font-size:11px;color:var(--text-secondary);">HRV ${c.hrv||'—'} · Sleep ${c.sleep||'—'} · E${c.energy||'—'}/H${c.hunger||'—'} · ${c.perf||'—'}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn-small" onclick="editCheckin('${c.date}')">edit</button>
        <button class="btn-small" style="color:var(--red-text);" onclick="deleteCheckin('${c.date}')">delete</button>
      </div>
    </div>`).join('');
}

// ─── WEEKLY ───────────────────────────────────────────────────────────────────

function renderWeekly(){
  const avg=get7DayAvg(); const ws=document.getElementById('weekly-summary');
  if(!db.checkins||!db.checkins.length){ws.innerHTML='<div class="alert alert-info">No check-ins yet.</div>';return;}
  const r7=(db.checkins||[]).slice(-7);
  const avgE=(r7.reduce((s,c)=>s+(c.energy||0),0)/r7.length).toFixed(1);
  const avgH=(r7.reduce((s,c)=>s+(c.hunger||0),0)/r7.length).toFixed(1);
  const hArr=r7.filter(c=>c.hrv); const sArr=r7.filter(c=>c.sleep);
  ws.innerHTML=`<div class="card"><div class="card-title">7-day averages</div><div class="metric-grid">
    <div class="metric"><label>Avg weight</label><div class="stat-num">${avg?avg.toFixed(1):'—'}</div><div class="stat-label">kg</div></div>
    <div class="metric"><label>Avg HRV</label><div class="stat-num">${hArr.length?(hArr.reduce((s,c)=>s+c.hrv,0)/hArr.length).toFixed(0):'—'}</div><div class="stat-label">ms</div></div>
    <div class="metric"><label>Avg sleep</label><div class="stat-num">${sArr.length?(sArr.reduce((s,c)=>s+c.sleep,0)/sArr.length).toFixed(0):'—'}</div><div class="stat-label">score</div></div>
    <div class="metric"><label>Energy / Hunger</label><div class="stat-num">${avgE} / ${avgH}</div><div class="stat-label">/10</div></div>
  </div></div>`;
  const algo=runAlgorithm();
  document.getElementById('algorithm-recommendation').innerHTML=`<div class="alert alert-${algo.level}"><strong>Algorithm recommendation</strong>${algo.recommendation}</div>`;
}
function saveWeekly(){
  if(!db.measurements)db.measurements=[];
  db.measurements.push({date:today(),waist:parseFloat(document.getElementById('m-waist').value)||null,thigh:parseFloat(document.getElementById('m-thigh').value)||null,glutes:parseFloat(document.getElementById('m-glutes').value)||null,arm:parseFloat(document.getElementById('m-arm').value)||null,avgWeight:get7DayAvg()});
  saveDB();showToast('Weekly summary saved.');
}

// ─── PROGRESS ────────────────────────────────────────────────────────────────

function renderProgress(){
  const avg=get7DayAvg();
  document.getElementById('prog-weight').textContent=avg?avg.toFixed(1):'—';
  const weights=(db.checkins||[]).filter(c=>c.weight).slice(-28);
  const old=weights.slice(0,7); const oldAvg=old.length?old.reduce((s,c)=>s+c.weight,0)/old.length:null;
  if(avg&&oldAvg){const diff=avg-oldAvg;document.getElementById('prog-change').textContent=(diff>0?'+':'')+diff.toFixed(1);document.getElementById('prog-change').className='stat-num '+(diff<0?'trend-down':diff>0?'trend-up':'trend-flat');}
  const canvas=document.getElementById('weight-chart');
  if(weights.length>1){
    if(window._wChart)window._wChart.destroy();
    window._wChart=new Chart(canvas,{type:'line',data:{labels:weights.map(c=>c.date.slice(5)),datasets:[{data:weights.map(c=>c.weight),borderColor:'#378ADD',backgroundColor:'transparent',borderWidth:1.5,pointRadius:2,tension:0.3}]},options:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:10},maxTicksLimit:7}},y:{grid:{color:'rgba(128,128,128,0.1)'},ticks:{font:{size:10}}}},responsive:true,maintainAspectRatio:true}});
  } else {canvas.parentElement.innerHTML='<p style="font-size:13px;color:var(--text-secondary);">Log daily weight to see chart.</p>';}
  const stations=getStations(); const pbDiv=document.getElementById('station-pbs');
  if(!(db.workouts||[]).length){pbDiv.innerHTML='<p style="font-size:13px;color:var(--text-secondary);">No sessions logged yet.</p>';}
  else{pbDiv.innerHTML=stations.filter(s=>s.fields.find(f=>f.key==='time')).map(s=>{
    const sessions=(db.workouts||[]).filter(w=>w.stations[s.id]&&w.stations[s.id].time);
    if(!sessions.length)return`<div class="hist-row"><span>${s.name}</span><span style="color:var(--text-secondary);font-size:11px;">—</span></div>`;
    const best=sessions.reduce((b,w)=>{const t=timeToSeconds(w.stations[s.id].time);return t&&t<b.t?{t,time:w.stations[s.id].time,date:w.date}:b},{t:9999,time:null,date:null});
    return`<div class="hist-row"><span>${s.name}</span><span class="trend-down">${best.time} <span style="color:var(--text-secondary);font-size:10px;">${best.date}</span></span></div>`;
  }).join('');}
  if(!(db.measurements||[]).length){document.getElementById('meas-history').innerHTML='<p style="font-size:13px;color:var(--text-secondary);">No measurements yet.</p>';}
  else{
    const last=(db.measurements||[])[db.measurements.length-1]; const prev=db.measurements.length>1?db.measurements[db.measurements.length-2]:null;
    document.getElementById('meas-history').innerHTML=['waist','thigh','glutes','arm'].map(k=>{
      const d=prev&&prev[k]&&last[k]?(last[k]-prev[k]).toFixed(1):null;
      const arrow=d===null?'':(parseFloat(d)<0?`<span class="trend-down"> ${d}</span>`:(parseFloat(d)>0?`<span class="trend-up"> +${d}</span>`:''));
      return`<div class="hist-row"><span style="text-transform:capitalize;">${k}</span><span>${last[k]?last[k]+'cm':'—'}${arrow}</span></div>`;
    }).join('');
  }
  document.getElementById('algo-status').innerHTML=`<div class="alert alert-${runAlgorithm().level}">${runAlgorithm().recommendation}</div>`;
}

// ─── PLAN EDITOR ──────────────────────────────────────────────────────────────

function renderPlanEditor(){
  const plan=getPlan(); const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  document.getElementById('plan-editor').innerHTML=days.map((day,d)=>`
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="flex:1;margin-right:8px;">
          <div style="font-size:14px;font-weight:500;margin-bottom:4px;">${day}</div>
          <input type="text" id="plan-label-${d}" value="${plan[d].label}" style="font-size:12px;color:var(--text-secondary);border:0.5px solid var(--border);border-radius:var(--radius-md);background:var(--bg-secondary);outline:none;width:100%;padding:4px 8px;font-family:inherit;">
        </div>
        <select id="plan-type-${d}" style="font-size:12px;border:0.5px solid var(--border);border-radius:var(--radius-md);padding:5px 8px;background:var(--bg-secondary);color:var(--text);font-family:inherit;">
          <option value="training" ${plan[d].type==='training'?'selected':''}>Training</option>
          <option value="rest" ${plan[d].type==='rest'?'selected':''}>Rest</option>
        </select>
      </div>
      ${plan[d].items.map((item,i)=>`
        <div style="display:flex;gap:6px;margin-bottom:6px;align-items:flex-start;">
          <div style="flex:1;">
            <input type="text" id="plan-name-${d}-${i}" value="${item.name}" style="width:100%;font-size:13px;font-weight:500;border:0.5px solid var(--border);border-radius:var(--radius-md);padding:5px 8px;background:var(--bg-secondary);color:var(--text);outline:none;font-family:inherit;margin-bottom:4px;">
            <input type="text" id="plan-detail-${d}-${i}" value="${item.detail||''}" style="width:100%;font-size:12px;border:0.5px solid var(--border);border-radius:var(--radius-md);padding:5px 8px;background:var(--bg-secondary);color:var(--text-secondary);outline:none;font-family:inherit;">
          </div>
          <div style="display:flex;flex-direction:column;gap:3px;padding-top:2px;">
            <button class="btn-small" onclick="movePlanItem(${d},${i},-1)" ${i===0?'style="opacity:0.3;"':''}>↑</button>
            <button class="btn-small" onclick="movePlanItem(${d},${i},1)" ${i===plan[d].items.length-1?'style="opacity:0.3;"':''}>↓</button>
            <button class="btn-small" style="color:var(--red-text);" onclick="deletePlanItem(${d},${i})">×</button>
          </div>
        </div>`).join('')}
      <button class="btn-small" style="margin-top:6px;width:100%;" onclick="addPlanItem(${d})">+ Add exercise</button>
    </div>`).join('');
  renderStationEditor();
}

function collectPlanFromDOM(){
  const plan=getPlan();
  [0,1,2,3,4,5,6].forEach(d=>{
    const le=document.getElementById(`plan-label-${d}`);if(le)plan[d].label=le.value;
    const te=document.getElementById(`plan-type-${d}`);if(te)plan[d].type=te.value;
    plan[d].items=plan[d].items.map((item,i)=>({
      name:(document.getElementById(`plan-name-${d}-${i}`)||{value:item.name}).value,
      detail:(document.getElementById(`plan-detail-${d}-${i}`)||{value:item.detail||''}).value
    }));
  });
  return plan;
}

function addPlanItem(d){const p=collectPlanFromDOM();p[d].items.push({name:'New exercise',detail:''});db.customPlan=p;saveDB();renderPlanEditor();}
function deletePlanItem(d,i){const p=collectPlanFromDOM();p[d].items.splice(i,1);db.customPlan=p;saveDB();renderPlanEditor();}
function movePlanItem(d,i,dir){const p=collectPlanFromDOM();const items=p[d].items;const ni=i+dir;if(ni<0||ni>=items.length)return;[items[i],items[ni]]=[items[ni],items[i]];db.customPlan=p;saveDB();renderPlanEditor();}
function savePlanAndStations(){db.customPlan=collectPlanFromDOM();collectStationsFromDOM();saveDB();showToast('Plan saved.');}
function resetPlan(){if(!confirm('Reset to default plan?'))return;db.customPlan=null;saveDB();renderPlanEditor();showToast('Reset to default.');}

function renderStationEditor(){
  const stations=getStations();
  document.getElementById('station-editor').innerHTML=stations.map((s,si)=>`
    <div style="padding:10px 0;border-bottom:0.5px solid var(--border);">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
        <input type="text" id="st-ename-${si}" value="${s.name}" style="flex:1;font-size:13px;font-weight:500;border:0.5px solid var(--border);border-radius:var(--radius-md);padding:5px 8px;background:var(--bg-secondary);color:var(--text);outline:none;font-family:inherit;">
        <button class="btn-small" onclick="moveStation(${si},-1)" ${si===0?'style="opacity:0.3;"':''}>↑</button>
        <button class="btn-small" onclick="moveStation(${si},1)" ${si===stations.length-1?'style="opacity:0.3;"':''}>↓</button>
        <button class="btn-small" style="color:var(--red-text);" onclick="deleteStation(${si})">×</button>
      </div>
      <div style="font-size:11px;color:var(--text-secondary);">Fields: ${s.fields.map(f=>f.label).join(', ')}</div>
    </div>`).join('')+`<button class="btn-small" style="margin-top:8px;width:100%;" onclick="addStation()">+ Add station</button>`;
}
function collectStationsFromDOM(){const st=getStations();st.forEach((s,si)=>{const e=document.getElementById(`st-ename-${si}`);if(e)s.name=e.value;});db.customStations=st;}
function addStation(){collectStationsFromDOM();const st=getStations();st.push({id:'custom_'+Date.now(),name:'New station',fields:[{key:'time',label:'Time (mm:ss)',ph:'0:00'},{key:'weight',label:'Weight (kg)',ph:'0'}]});db.customStations=st;saveDB();renderStationEditor();showToast('Station added.');}
function deleteStation(si){if(!confirm('Delete this station?'))return;collectStationsFromDOM();const st=getStations();st.splice(si,1);db.customStations=st;saveDB();renderStationEditor();}
function moveStation(si,dir){collectStationsFromDOM();const st=getStations();const ni=si+dir;if(ni<0||ni>=st.length)return;[st[si],st[ni]]=[st[ni],st[si]];db.customStations=st;saveDB();renderStationEditor();}
function resetStations(){if(!confirm('Reset stations to default?'))return;db.customStations=null;saveDB();renderStationEditor();showToast('Reset to default.');}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

function renderSettings(){const el=document.getElementById('sheets-url-input');if(el)el.value=sheetsUrl;renderPlanEditor();}
function saveSettings(){sheetsUrl=document.getElementById('sheets-url-input').value.trim();localStorage.setItem('sheetsUrl',sheetsUrl);showToast('Settings saved.');}
function exportData(){const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fortaleza-backup-${today()}.json`;a.click();}

// ─── TOAST ────────────────────────────────────────────────────────────────────

function showToast(msg){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 20px;border-radius:20px;font-size:13px;z-index:999;transition:opacity 0.3s;white-space:nowrap;';document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';
  setTimeout(()=>t.style.opacity='0',2000);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

loadDB();
renderToday();
if('serviceWorker' in navigator)navigator.serviceWorker.register('/fortaleza-tracker/sw.js').catch(()=>{});
