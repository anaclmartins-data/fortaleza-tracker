// ─── DATA ───────────────────────────────────────────────────────────────────

const PLAN = {
  0:{name:'Sunday',type:'rest',label:'Yoga + bike Zone 2',items:[{name:'Yoga',detail:'30–45 min'},{name:'Bike Zone 2',detail:'30 min, HR <132'},{name:'VMO protocol',detail:'10 min'}]},
  1:{name:'Monday',type:'training',label:'Hyrox Engine',items:[{name:'Hyrox Engine — 1Rebel',detail:'50:10 then 45:15 intervals'},{name:'Row → Run → SkiErg → Track',detail:'With lunges + sled push'},{name:'VMO protocol',detail:'10 min warm-up'}]},
  2:{name:'Tuesday',type:'training',label:'Race-specific strength',items:[{name:'VMO protocol',detail:'10 min'},{name:'Leg press + Bulgarian split squats',detail:'4×6–8, heavy'},{name:'Wall balls 5×15',detail:'6kg top target — elbows DOWN, cup hands'},{name:'DB thrusters 3×10',detail:'6–8kg each hand'},{name:'Farmers carry 2×100m',detail:'16kg'}]},
  3:{name:'Wednesday',type:'training',label:'SkiErg + Row Zone 2',items:[{name:'Alternating blocks',detail:'5 min SkiErg → 5 min run ×3, then Row blocks'},{name:'Zone 2 only',detail:'HR <132 — nasal breathing'},{name:'Total ~50 min',detail:''}]},
  4:{name:'Thursday',type:'training',label:'Stations + sled finisher',items:[{name:'VMO protocol',detail:'10 min'},{name:'SkiErg 1000m',detail:'Target ~4:56'},{name:'Wall balls 3×20',detail:'6kg top target, 15-rep blocks'},{name:'Burpee broad jumps 30m',detail:'Land soft, absorb through hips'},{name:'Row 1000m',detail:'Target ~5:12'},{name:'Lunges 30m',detail:'20kg, 90s rest between stations'},{name:'Sled pull 2×50m',detail:'78kg'},{name:'Sled push 2×50m',detail:'102kg'}]},
  5:{name:'Friday',type:'training',label:'Bike Zone 2',items:[{name:'Stationary bike / arc trainer',detail:'45–55 min, HR <132'},{name:'VMO protocol',detail:'10 min'}]},
  6:{name:'Saturday',type:'training',label:'Hyrox 90',items:[{name:'Hyrox 90 class',detail:'Third Space — full circuit'},{name:'Wall balls 6kg top target',detail:'Note all times'}]}
};

const MACROS = {
  training: {P:120, C:250, F:58, kcal:2000},
  rest:     {P:120, C:210, F:55, kcal:1800}
};

const QUICK_FOODS = [
  {name:'Overnight oats',           meal:'breakfast', P:26, C:68, F:8},
  {name:'Scrambled eggs + sourdough',meal:'breakfast', P:27, C:32, F:14},
  {name:'Frittata slice + toast',   meal:'breakfast', P:25, C:28, F:12},
  {name:'Chicken & rice bowl',      meal:'lunch',     P:33, C:55, F:10},
  {name:'Tuna & bean salad',        meal:'lunch',     P:34, C:28, F:12},
  {name:'Salmon & grain bowl',      meal:'lunch',     P:35, C:42, F:18},
  {name:'Greek yoghurt + berries',  meal:'snack',     P:20, C:22, F:5},
  {name:'Cottage cheese + fruit',   meal:'snack',     P:22, C:24, F:4},
  {name:'Rice cakes + PB',          meal:'snack',     P:8,  C:36, F:10},
  {name:'Banana',                   meal:'snack',     P:1,  C:27, F:0},
  {name:'Chicken curry + rice',     meal:'dinner',    P:38, C:60, F:14},
  {name:'Salmon + sweet potato',    meal:'dinner',    P:34, C:38, F:16},
  {name:'Turkey chilli + rice',     meal:'dinner',    P:36, C:55, F:8},
  {name:'Prawn stir-fry + noodles', meal:'dinner',    P:30, C:52, F:10},
  {name:'Chicken pasta (one-pot)',  meal:'dinner',    P:35, C:58, F:12},
  {name:'Ninja Creami (skyr berry)',meal:'other',     P:22, C:38, F:2},
  {name:'Ninja Creami (cookie dough)',meal:'other',   P:20, C:42, F:8},
];

const STATIONS = [
  {id:'skierg',    name:'SkiErg 1000m',       fields:[{key:'time',label:'Time (mm:ss)',ph:'4:56'}]},
  {id:'row',       name:'Row 1000m',           fields:[{key:'time',label:'Time (mm:ss)',ph:'5:12'}]},
  {id:'wallball',  name:'Wall balls',          fields:[{key:'set1',label:'Set 1 (s/15)',ph:'33'},{key:'set2',label:'Set 2',ph:'33'},{key:'set3',label:'Set 3',ph:'36'},{key:'total',label:'Total reps',ph:'50'}]},
  {id:'lunges',    name:'Sandbag lunges',      fields:[{key:'time',label:'Time (mm:ss)',ph:'1:36'},{key:'dist',label:'Dist (m)',ph:'50'},{key:'weight',label:'kg',ph:'20'}]},
  {id:'bbj',       name:'Burpee broad jumps',  fields:[{key:'time',label:'Time (mm:ss)',ph:'2:30'},{key:'dist',label:'Dist (m)',ph:'80'}]},
  {id:'sled_pull', name:'Sled pull',           fields:[{key:'time',label:'Time (mm:ss)',ph:'3:54'},{key:'dist',label:'Dist (m)',ph:'50'},{key:'weight',label:'kg',ph:'78'}]},
  {id:'sled_push', name:'Sled push',           fields:[{key:'time',label:'Time (mm:ss)',ph:'2:00'},{key:'dist',label:'Dist (m)',ph:'50'},{key:'weight',label:'kg',ph:'102'}]},
  {id:'farmers',   name:'Farmers carry',       fields:[{key:'time',label:'Time (mm:ss)',ph:'2:00'},{key:'dist',label:'Dist (m)',ph:'100'},{key:'weight',label:'kg',ph:'16'}]},
];

// ─── STATE ───────────────────────────────────────────────────────────────────

let db = {checkins:[], foodLogs:[], workouts:[], measurements:[], weeklies:[]};
let selectedPerf = 'normal';
let customFoodVisible = false;
let sheetsUrl = localStorage.getItem('sheetsUrl') || '';

function loadDB() {
  try { const s = localStorage.getItem('ana_hyrox_db'); if (s) db = JSON.parse(s); } catch(e) {}
}
function saveDB() {
  try { localStorage.setItem('ana_hyrox_db', JSON.stringify(db)); } catch(e) {}
  if (sheetsUrl) syncToSheets();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split('T')[0]; }
function dow() { return new Date().getDay(); }

function getCyclePhase(d) {
  if (!d) return null;
  if (d >= 1 && d <= 5) return 'menstrual';
  if (d >= 6 && d <= 13) return 'follicular';
  if (d >= 14 && d <= 16) return 'ovulation';
  return 'luteal';
}

function getStressLevel(hrv, bb, stress, sleep) {
  let s = 0;
  if (hrv && hrv < 55) s++;
  if (bb && bb < 50) s++;
  if (stress && stress > 25) s++;
  if (sleep && sleep < 65) s++;
  return s >= 3 ? 'red' : s >= 2 ? 'amber' : 'green';
}

function timeToSeconds(t) {
  if (!t) return null;
  const p = t.split(':');
  if (p.length === 2) return parseInt(p[0]) * 60 + parseFloat(p[1]);
  return parseFloat(t);
}

function get7DayAvg() {
  const r = db.checkins.filter(c => c.weight).slice(-7);
  if (!r.length) return null;
  return r.reduce((s, c) => s + c.weight, 0) / r.length;
}

function getPrevPhaseAvg(phase) {
  if (!phase || db.checkins.length < 14) return null;
  const pc = db.checkins.filter(c => getCyclePhase(c.cycle) === phase && c.weight);
  if (pc.length < 4) return null;
  const prev = pc.slice(-8, -4);
  if (!prev.length) return null;
  return prev.reduce((s, c) => s + c.weight, 0) / prev.length;
}

function getFoodTotals(foods) {
  return foods.reduce((a, f) => ({P: a.P+(f.P||0), C: a.C+(f.C||0), F: a.F+(f.F||0)}), {P:0,C:0,F:0});
}

function getTodayFood() {
  return db.foodLogs.filter(f => f.date === today());
}

function checkPB(stationId, sd, date) {
  if (!sd.time) return false;
  const secs = timeToSeconds(sd.time);
  if (!secs) return false;
  const prev = db.workouts.filter(w => w.date !== date && w.stations[stationId] && w.stations[stationId].time);
  if (!prev.length) return false;
  const best = Math.min(...prev.map(w => timeToSeconds(w.stations[stationId].time) || 9999));
  return secs < best;
}

// ─── ALGORITHM ───────────────────────────────────────────────────────────────

function runAlgorithm() {
  const latest = db.checkins[db.checkins.length - 1];
  if (!latest) return {recommendation: 'Log daily check-ins for 2 weeks to activate the algorithm.', level: 'info'};

  const avg = get7DayAvg();
  const phase = getCyclePhase(latest.cycle);
  const stress = getStressLevel(latest.hrv, latest.bb, latest.stress, latest.sleep);

  if (phase === 'luteal' || phase === 'menstrual')
    return {recommendation: `${phase === 'luteal' ? 'Luteal' : 'Menstrual'} phase — no adjustments. Compare weight to same phase last month, not this week vs last week.`, level: 'warn'};

  if (stress === 'red')
    return {recommendation: 'System red-lining. 7–14 day diet break at full maintenance. Stop cardio ladder. Let HRV, sleep and Body Battery recover first.', level: 'danger'};

  const prevAvg = getPrevPhaseAvg(phase);
  if (!prevAvg || !avg) return {recommendation: 'Need more data across cycle phases. Keep logging daily.', level: 'info'};

  const change = avg - prevAvg;

  if (latest.perf === 'pr' && change <= 0)
    return {recommendation: `PRs + weight dropping (${change.toFixed(1)} kg vs same phase). CEO metrics positive. Change nothing — plan is working.`, level: 'success'};

  if (Math.abs(change) < 0.2 && db.checkins.length >= 14) {
    const highHunger = db.checkins.slice(-7).filter(c => c.hunger >= 8).length;
    if (highHunger >= 3)
      return {recommendation: 'Stalled + hunger high 3+ days. Schedule 2-day refeed (Sat–Sun): carbs up to maintenance, protein and fat unchanged.', level: 'warn'};
    return {recommendation: 'Stalled 2 weeks. Add 1,500–2,000 steps/day before touching food. PRs still happening? If yes — water masking likely, hold.', level: 'warn'};
  }

  if (change < -0.5)
    return {recommendation: `Dropping fast (${Math.abs(change).toFixed(1)} kg). Whoosh after a stall? Hold steady. If consistent 2nd week — add 100 kcal via carbs.`, level: 'warn'};

  if (change > 0.6)
    return {recommendation: `Weight up ${change.toFixed(1)} kg vs same phase. Hold steady. Cortisol water retention likely. Do not cut further.`, level: 'warn'};

  return {recommendation: `On track — ${Math.abs(change).toFixed(1)} kg ${change < 0 ? 'down' : 'up'} vs same cycle phase. Stay the course.`, level: 'success'};
}

// ─── GOOGLE SHEETS SYNC ──────────────────────────────────────────────────────

async function syncToSheets() {
  if (!sheetsUrl) return;
  const statusEl = document.getElementById('sync-status');
  if (statusEl) { statusEl.textContent = 'Syncing...'; statusEl.className = 'sync-status syncing'; }
  try {
    await fetch(sheetsUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'sync', data: db, timestamp: new Date().toISOString()})
    });
    if (statusEl) { statusEl.textContent = 'Synced ' + new Date().toLocaleTimeString(); statusEl.className = 'sync-status synced'; }
  } catch(e) {
    if (statusEl) { statusEl.textContent = 'Sync failed — data saved locally'; statusEl.className = 'sync-status error'; }
  }
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('nav-' + id).classList.add('active');
  const renders = {today: renderToday, food: renderFood, workout: renderWorkout, checkin: ()=>{}, weekly: renderWeekly, progress: renderProgress, settings: renderSettings};
  if (renders[id]) renders[id]();
}

// ─── TODAY ────────────────────────────────────────────────────────────────────

function renderToday() {
  const d = dow();
  const plan = PLAN[d];
  const isTraining = plan.type === 'training';
  const macros = MACROS[plan.type];
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  document.getElementById('today-heading').textContent = days[d];
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'});

  const alerts = document.getElementById('today-alerts');
  alerts.innerHTML = '';
  const latest = db.checkins[db.checkins.length - 1];
  if (latest) {
    const sl = getStressLevel(latest.hrv, latest.bb, latest.stress, latest.sleep);
    if (sl === 'red') alerts.innerHTML += `<div class="alert alert-danger">System stressed — consider LISS only today and a refeed this week.</div>`;
    else if (sl === 'amber') alerts.innerHTML += `<div class="alert alert-warn">Recovery amber. Manage intensity today.</div>`;
    const phase = getCyclePhase(latest.cycle);
    if (phase === 'luteal') alerts.innerHTML += `<div class="alert alert-warn">Luteal phase — hunger buffer active. No macro adjustments.</div>`;
    if (phase === 'menstrual') alerts.innerHTML += `<div class="alert alert-info">Menstrual phase — water retention expected.</div>`;
  }

  document.getElementById('today-workout').innerHTML =
    `<div class="badge badge-${isTraining ? 'info' : 'success'}" style="margin-bottom:10px;">${plan.label}</div>` +
    plan.items.map(i => `<div class="workout-item"><div class="name">${i.name}</div>${i.detail ? `<div class="detail">${i.detail}</div>` : ''}</div>`).join('');

  const foods = getTodayFood();
  const totals = getFoodTotals(foods);
  const pct = (v, t) => Math.min(100, Math.round(v / t * 100));

  document.getElementById('macro-type-badge').innerHTML = `<div class="badge badge-${isTraining ? 'info' : 'success'}">${isTraining ? 'Training day' : 'Rest day'} targets</div>`;
  document.getElementById('today-macros').innerHTML =
    [['Protein', totals.P, macros.P, 'g', '#378ADD'],
     ['Carbs',   totals.C, macros.C, 'g', '#1D9E75'],
     ['Fat',     totals.F, macros.F, 'g', '#EF9F27']]
    .map(([l,v,t,u,c]) => `<div class="macro-bar">
      <div class="bar-label"><span>${l}</span><span>${Math.round(v)}/${t}${u}</span></div>
      <div class="track"><div class="fill" style="width:${pct(v,t)}%;background:${c};"></div></div>
    </div>`).join('') +
    `<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">${Math.round(totals.P*4+totals.C*4+totals.F*9)} / ${macros.kcal} kcal · Remaining P${Math.max(0,Math.round(macros.P-totals.P))}g C${Math.max(0,Math.round(macros.C-totals.C))}g F${Math.max(0,Math.round(macros.F-totals.F))}g</div>`;
}

// ─── FOOD ─────────────────────────────────────────────────────────────────────

function renderFood() {
  const isTraining = PLAN[dow()].type === 'training';
  const macros = MACROS[isTraining ? 'training' : 'rest'];
  const foods = getTodayFood();
  const totals = getFoodTotals(foods);
  const pct = (v, t) => Math.min(100, Math.round(v / t * 100));

  document.getElementById('food-date-label').textContent = new Date().toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'});

  document.getElementById('food-totals').innerHTML =
    [['Protein', totals.P, macros.P, 'g', '#378ADD'],
     ['Carbs',   totals.C, macros.C, 'g', '#1D9E75'],
     ['Fat',     totals.F, macros.F, 'g', '#EF9F27']]
    .map(([l,v,t,u,c]) => `<div class="macro-bar">
      <div class="bar-label"><span>${l}</span><span>${Math.round(v)}/${t}${u}</span></div>
      <div class="track"><div class="fill" style="width:${pct(v,t)}%;background:${c};"></div></div>
    </div>`).join('') +
    `<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">${Math.round(totals.P*4+totals.C*4+totals.F*9)} / ${macros.kcal} kcal</div>`;

  document.getElementById('quick-add-grid').innerHTML = QUICK_FOODS.map((f, i) => `
    <button class="quick-add-btn" onclick="quickAdd(${i})">
      <div class="qa-name">${f.name}</div>
      <div class="qa-macros">P${f.P} · C${f.C} · F${f.F}</div>
    </button>`).join('');

  const meals = ['breakfast','lunch','snack','dinner','other'];
  const mealLabels = {breakfast:'Breakfast', lunch:'Lunch', snack:'Snack', dinner:'Dinner', other:'Other'};
  const log = document.getElementById('food-log');
  if (!foods.length) { log.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">Nothing logged yet today.</p>'; return; }
  log.innerHTML = meals.map(m => {
    const mf = foods.filter(f => f.meal === m);
    if (!mf.length) return '';
    const mt = getFoodTotals(mf);
    return `<div class="meal-section">
      <div class="meal-header"><span>${mealLabels[m]}</span><span>P${Math.round(mt.P)} C${Math.round(mt.C)} F${Math.round(mt.F)}</span></div>
      ${mf.map(f => `<div class="food-item">
        <div><div class="food-name">${f.name}</div><div class="food-macros">P${f.P}g · C${f.C}g · F${f.F}g</div></div>
        <button class="del-btn" onclick="deleteFood('${f.id}')">remove</button>
      </div>`).join('')}
    </div>`;
  }).join('');
}

function quickAdd(i) {
  const f = {...QUICK_FOODS[i], id: Date.now() + '', date: today()};
  db.foodLogs.push(f);
  saveDB();
  renderFood();
  if (document.getElementById('today').classList.contains('active')) renderToday();
}

function toggleCustomFood() {
  customFoodVisible = !customFoodVisible;
  document.getElementById('custom-food-form').style.display = customFoodVisible ? 'block' : 'none';
}

function addCustomFood() {
  const name = document.getElementById('cf-name').value.trim();
  if (!name) return;
  const f = {
    id: Date.now() + '', date: today(), name,
    meal: document.getElementById('cf-meal').value,
    P: parseFloat(document.getElementById('cf-p').value) || 0,
    C: parseFloat(document.getElementById('cf-c').value) || 0,
    F: parseFloat(document.getElementById('cf-f').value) || 0
  };
  db.foodLogs.push(f);
  saveDB();
  ['cf-name','cf-p','cf-c','cf-f'].forEach(id => document.getElementById(id).value = '');
  toggleCustomFood();
  renderFood();
}

function deleteFood(id) {
  db.foodLogs = db.foodLogs.filter(f => f.id !== id);
  saveDB();
  renderFood();
  if (document.getElementById('today').classList.contains('active')) renderToday();
}

// ─── WORKOUT ──────────────────────────────────────────────────────────────────

function renderWorkout() {
  document.getElementById('workout-date-label').textContent = new Date().toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'});
  document.getElementById('station-inputs').innerHTML = STATIONS.map(s => `
    <div class="station-row">
      <div class="station-name">${s.name}</div>
      <div class="station-inputs">
        ${s.fields.map(f => `<div class="station-input-wrap"><label>${f.label}</label><input type="text" id="st-${s.id}-${f.key}" placeholder="${f.ph}"></div>`).join('')}
      </div>
    </div>`).join('');
  renderWorkoutHistory();
}

function saveWorkout() {
  const entry = {date: today(), stations: {}};
  STATIONS.forEach(s => {
    const sd = {};
    s.fields.forEach(f => { const v = document.getElementById(`st-${s.id}-${f.key}`).value.trim(); if (v) sd[f.key] = v; });
    if (Object.keys(sd).length) entry.stations[s.id] = sd;
  });
  const ei = db.workouts.findIndex(w => w.date === today());
  if (ei >= 0) db.workouts[ei] = entry; else db.workouts.push(entry);
  saveDB();
  renderWorkoutHistory();
  showToast('Session saved.');
}

function renderWorkoutHistory() {
  const wh = document.getElementById('workout-history');
  if (!db.workouts.length) { wh.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">No sessions logged yet.</p>'; return; }
  wh.innerHTML = db.workouts.slice(-5).reverse().map(w => {
    const keys = Object.keys(w.stations);
    if (!keys.length) return '';
    return `<div style="margin-bottom:14px;">
      <div style="font-size:12px;font-weight:500;color:var(--text-secondary);margin-bottom:6px;">${w.date}</div>
      ${keys.map(k => {
        const s = STATIONS.find(x => x.id === k);
        const sd = w.stations[k];
        const vals = Object.entries(sd).map(([fk,fv]) => `${fk}: ${fv}`).join(' · ');
        const pb = checkPB(k, sd, w.date);
        return `<div class="hist-row"><span>${s ? s.name : k}${pb ? '<span class="pb-tag">PB</span>' : ''}</span><span style="color:var(--text-secondary);font-size:11px;">${vals}</span></div>`;
      }).join('')}
    </div>`;
  }).join('');
}

// ─── CHECK-IN ────────────────────────────────────────────────────────────────

function selectPerf(t) {
  selectedPerf = t;
  ['pr','normal','below','rest'].forEach(x => document.getElementById('perf-' + x).classList.toggle('selected', x === t));
}

function saveCheckin() {
  const entry = {
    date: today(),
    weight:  parseFloat(document.getElementById('ci-weight').value)  || null,
    cycle:   parseInt(document.getElementById('ci-cycle').value)     || null,
    hrv:     parseFloat(document.getElementById('ci-hrv').value)     || null,
    rhr:     parseFloat(document.getElementById('ci-rhr').value)     || null,
    bb:      parseFloat(document.getElementById('ci-bb').value)      || null,
    stress:  parseFloat(document.getElementById('ci-stress').value)  || null,
    sleep:   parseFloat(document.getElementById('ci-sleep').value)   || null,
    deep:    parseFloat(document.getElementById('ci-deep').value)    || null,
    steps:   parseInt(document.getElementById('ci-steps').value)     || null,
    energy:  parseInt(document.getElementById('ci-energy').value),
    hunger:  parseInt(document.getElementById('ci-hunger').value),
    perf:    selectedPerf
  };
  const ei = db.checkins.findIndex(c => c.date === today());
  if (ei >= 0) db.checkins[ei] = entry; else db.checkins.push(entry);
  saveDB();
  showToast('Check-in saved.');
}

// ─── WEEKLY ───────────────────────────────────────────────────────────────────

function renderWeekly() {
  document.getElementById('weekly-sub').textContent = 'Week of ' + new Date().toLocaleDateString('en-GB', {day:'numeric', month:'long'});
  const avg = get7DayAvg();
  const ws = document.getElementById('weekly-summary');
  if (!db.checkins.length) { ws.innerHTML = '<div class="alert alert-info">No check-ins yet.</div>'; }
  else {
    const r7 = db.checkins.slice(-7);
    const avgE = (r7.reduce((s,c) => s + (c.energy||0), 0) / r7.length).toFixed(1);
    const avgH = (r7.reduce((s,c) => s + (c.hunger||0), 0) / r7.length).toFixed(1);
    const hArr = r7.filter(c => c.hrv);
    const sArr = r7.filter(c => c.sleep);
    ws.innerHTML = `<div class="card"><div class="card-title">7-day averages</div><div class="metric-grid">
      <div class="metric"><label>Avg weight</label><div class="stat-num">${avg ? avg.toFixed(1) : '—'}</div><div class="stat-label">kg</div></div>
      <div class="metric"><label>Avg HRV</label><div class="stat-num">${hArr.length ? (hArr.reduce((s,c)=>s+c.hrv,0)/hArr.length).toFixed(0) : '—'}</div><div class="stat-label">ms</div></div>
      <div class="metric"><label>Avg sleep</label><div class="stat-num">${sArr.length ? (sArr.reduce((s,c)=>s+c.sleep,0)/sArr.length).toFixed(0) : '—'}</div><div class="stat-label">score</div></div>
      <div class="metric"><label>Energy / Hunger</label><div class="stat-num">${avgE} / ${avgH}</div><div class="stat-label">/10</div></div>
    </div></div>`;
  }
  const algo = runAlgorithm();
  document.getElementById('algorithm-recommendation').innerHTML =
    `<div class="alert alert-${algo.level}"><strong>Algorithm recommendation</strong>${algo.recommendation}</div>`;
}

function saveWeekly() {
  const entry = {
    date: today(),
    waist:  parseFloat(document.getElementById('m-waist').value)  || null,
    thigh:  parseFloat(document.getElementById('m-thigh').value)  || null,
    glutes: parseFloat(document.getElementById('m-glutes').value) || null,
    arm:    parseFloat(document.getElementById('m-arm').value)    || null,
    avgWeight: get7DayAvg()
  };
  db.measurements.push(entry);
  saveDB();
  showToast('Weekly summary saved.');
}

// ─── PROGRESS ────────────────────────────────────────────────────────────────

function renderProgress() {
  const avg = get7DayAvg();
  document.getElementById('prog-weight').textContent = avg ? avg.toFixed(1) : '—';
  const weights = db.checkins.filter(c => c.weight).slice(-28);
  const old = weights.slice(0, 7);
  const oldAvg = old.length ? old.reduce((s,c) => s + c.weight, 0) / old.length : null;
  if (avg && oldAvg) {
    const diff = avg - oldAvg;
    document.getElementById('prog-change').textContent = (diff > 0 ? '+' : '') + diff.toFixed(1);
    document.getElementById('prog-change').className = 'stat-num ' + (diff < 0 ? 'trend-down' : diff > 0 ? 'trend-up' : 'trend-flat');
  }

  const canvas = document.getElementById('weight-chart');
  if (weights.length > 1) {
    if (window._wChart) window._wChart.destroy();
    window._wChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: weights.map(c => c.date.slice(5)),
        datasets: [{data: weights.map(c => c.weight), borderColor: '#378ADD', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 2, tension: 0.3}]
      },
      options: {plugins:{legend:{display:false}}, scales:{x:{grid:{display:false},ticks:{font:{size:10},maxTicksLimit:7}},y:{grid:{color:'rgba(128,128,128,0.1)'},ticks:{font:{size:10}}}}, responsive:true, maintainAspectRatio:true}
    });
  } else {
    canvas.parentElement.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">Log daily weight to see chart.</p>';
  }

  const pbDiv = document.getElementById('station-pbs');
  if (!db.workouts.length) { pbDiv.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">No sessions logged yet.</p>'; }
  else {
    pbDiv.innerHTML = STATIONS.filter(s => s.fields.find(f => f.key === 'time')).map(s => {
      const sessions = db.workouts.filter(w => w.stations[s.id] && w.stations[s.id].time);
      if (!sessions.length) return `<div class="hist-row"><span>${s.name}</span><span style="color:var(--text-secondary);font-size:11px;">—</span></div>`;
      const best = sessions.reduce((b, w) => { const t = timeToSeconds(w.stations[s.id].time); return t && t < b.t ? {t, time: w.stations[s.id].time, date: w.date} : b; }, {t:9999, time:null, date:null});
      return `<div class="hist-row"><span>${s.name}</span><span class="trend-down">${best.time} <span style="color:var(--text-secondary);font-size:10px;">${best.date}</span></span></div>`;
    }).join('');
  }

  if (!db.measurements.length) { document.getElementById('meas-history').innerHTML = '<p style="font-size:13px;color:var(--text-secondary);">No measurements yet.</p>'; }
  else {
    const last = db.measurements[db.measurements.length - 1];
    const prev = db.measurements.length > 1 ? db.measurements[db.measurements.length - 2] : null;
    document.getElementById('meas-history').innerHTML = ['waist','thigh','glutes','arm'].map(k => {
      const d = prev && prev[k] && last[k] ? (last[k] - prev[k]).toFixed(1) : null;
      const arrow = d === null ? '' : parseFloat(d) < 0 ? `<span class="trend-down"> ${d}</span>` : parseFloat(d) > 0 ? `<span class="trend-up"> +${d}</span>` : '';
      return `<div class="hist-row"><span style="text-transform:capitalize;">${k}</span><span>${last[k] ? last[k]+'cm' : '—'}${arrow}</span></div>`;
    }).join('');
  }

  document.getElementById('algo-status').innerHTML = `<div class="alert alert-${runAlgorithm().level}">${runAlgorithm().recommendation}</div>`;
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

function renderSettings() {
  document.getElementById('sheets-url-input').value = sheetsUrl;
}

function saveSettings() {
  sheetsUrl = document.getElementById('sheets-url-input').value.trim();
  localStorage.setItem('sheetsUrl', sheetsUrl);
  showToast('Settings saved.');
}

function exportData() {
  const blob = new Blob([JSON.stringify(db, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ana-hyrox-backup-${today()}.json`;
  a.click();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 20px;border-radius:20px;font-size:13px;z-index:999;transition:opacity 0.3s;'; document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity = '1';
  setTimeout(() => t.style.opacity = '0', 2000);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

loadDB();
renderToday();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
