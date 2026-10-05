/* Garden Diary front end. Everything comes from api/state; writes go to api/events. */
const MONTHS = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
const TAG = {sow:'Sowed', out:'Planted out', harv:'Harvest', feed:'Fed', issue:'Problem', note:'Note', spray:'Sprayed', prune:'Pruned', review:'Review', move:'Moved', stage:'Stage', todo:'To do', done:'Done'};
const TREE_COL = {copper:'frost', oil:'sun', feed:'leaf', prune:'soil', other:'soil'};
const TREE_TOP = {copper:5, oil:14, feed:23, prune:23, other:23};
const BLOOM_ICON = '🌸';
const STAGE_ICON = {'Bud swell': '🌰', 'Bud burst': '🌱', 'New growth': '🍃', 'Flowering': '🌸', 'Petal fall': '💮', 'Fruit set': '🟢', 'Fruit colouring': '🟠', 'Ripe': '🧺', 'Leaf fall': '🍂', 'Dormant': '💤'};
function treeStage(t, pid) { return S.events.find(e => e.kind === 'tree' && e.item === t.id && e.type === 'stage' && e.season === S.season && (!pid || !e.plant || e.plant === pid)); }
const plantsOf = t => (t.plants && t.plants.length) ? t.plants : null;
const plantName = (t, pid) => ((plantsOf(t) || []).find(p => p.id === pid) || {}).name || '';
let selPlant = null;  // which individual tree the popup is showing (null = all)
const PRODUCTS = {copper:['Copper oxychloride','Copper hydroxide (Kocide)','Bordeaux'], oil:['Conqueror oil','Lime sulphur','Neem oil'], feed:['Citrus food','General fruit tree fertiliser','Compost','Sheep pellets','Blood and bone'], prune:[], other:[]};
const FEEDS = ['Liquid seaweed','Blood and bone','Sheep pellets','Compost','Tomato food','General fertiliser','Lime','Other'];
const ISSUES = ['Pests','Disease / fungus','Frost / cold','Heat / sun','Leggy / weak','Slugs / snails','Birds','Died','Other'];

let S = null;
// Phones and tablets: no hover labels, and don't pop the keyboard up when a form opens.
// (The Home Assistant app on Android reports taps as a mouse, so ask the screen instead.)
const TOUCH = matchMedia('(hover: none), (pointer: coarse)').matches || navigator.maxTouchPoints > 0;
let lastTouch = 0;
addEventListener('touchstart', () => { lastTouch = Date.now(); }, {capture: true, passive: true});              // state from the server
let treeGroup = 'all', vegGroup = 'all', vegFilter = 'all', treeFilter = 'all', diaryFilter = 'all', flowerFilter = 'all';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayISO = () => new Date(new Date().getTime() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const niceDate = (iso) => { const d = new Date(iso + 'T12:00:00'); return `${d.getDate()} ${MONTHS[(d.getMonth()+6)%12]}`; };
const yearOf = (iso) => iso.slice(0,4);
const stars = (n) => `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5-n)}</span>`;
const fmtT = (v) => v == null ? '—' : `${Number(v).toFixed(1)}°`;
const inWin = (m, w) => { for (let i = 0; i < w.length; i += 2) if (m >= w[i] && m < w[i+1]) return true; return false; };
function seasonMonth(iso) { const d = new Date(iso + 'T12:00:00'); const days = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); return (d.getMonth()+6)%12 + (d.getDate()-1)/days; }
function winLabel(w) { if (!w || !w.length) return '—'; const f = m => MONTHS[((Math.floor(m) % 12) + 12) % 12]; const parts=[]; for (let i=0;i<w.length;i+=2) parts.push(`${f(w[i])}–${f(Math.max(w[i], w[i+1]-0.01))}`); return parts.join(', '); }

async function api(path, opts) {
  const r = await fetch(path, Object.assign({headers: {'Content-Type': 'application/json'}}, opts));
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
async function load() {
  try { S = await api('api/state'); } catch (e) { toast('Could not reach the server'); console.error(e); return; }
  renderAll();
}
function renderAll() { renderHeader(); renderAreas(); renderTasks(); renderDiary(); renderVeg(); renderTrees(); renderFlowers(); }

/* ---------- Today ---------- */
function renderHeader() {
  const d = new Date(S.today + 'T12:00:00');
  const seasonName = ['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter'][(d.getMonth()+6)%12];
  $('dateLabel').textContent = `${d.toLocaleDateString('en-NZ',{weekday:'short', day:'numeric', month:'short'})} · ${seasonName} · ${S.season}`;
}
function spark(s, tone) {
  if (!s || s.length < 2) return '';
  const w = 100, h = 28, min = Math.min(...s), max = Math.max(...s);
  const pts = s.map((v, i) => [i/(s.length-1)*w, h-2-(v-min)/(max-min||1)*(h-6)]);
  const d = 'M' + pts.map(p => p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path class="fill" d="${d}L${w} ${h}L0 ${h}Z" style="fill:var(--${tone})"/><path d="${d}" style="stroke:var(--${tone})"/></svg>`;
}
function renderAreas() {
  const tone = {inside:'sun', gh:'leaf', out:'frost'};
  const short = {inside: 'Inside', gh: 'Greenhouse', out: 'Outside'};
  const r1 = v => v == null ? '—' : Math.round(v * 10) / 10;
  const cards = Object.entries(S.sensors).filter(([k]) => k !== 'forecast').map(([k, a]) => {
    // low / high as two big coloured numbers; one short extra line per card
    const lohi = a.lo7 != null ? `<div class="lohi"><span class="lo" title="7-day low">↓${r1(a.lo7)}°</span><span class="hi" title="7-day high">↑${r1(a.hi7)}°</span></div>` : `<div class="range">${a.error ? esc(a.error) : 'no history yet'}</div>`;
    let extra = '';
    if (k === 'inside' && a.soil != null) extra = `<div class="extra">soil <b>${r1(a.soil)}°</b></div>`;
    if (k === 'gh' && a.hum != null) extra = `<div class="extra">humidity <b>${Math.round(a.hum)}%</b></div>`;
    if (k === 'out') {
      const fc = S.sensors.forecast || [];
      if (a.ref != null) extra += `<div class="extra">Metservice <b>${r1(a.ref)}°</b></div>`;
      if (fc.length) extra += `<div class="extra fc" title="Forecast lows, next 5 nights">${fc.slice(0, 5).map(f => `<i>${Math.round(f.low)}</i>`).join('')}</div>`;
    }
    return `<div class="area"><div class="eyebrow">${short[k] || esc(a.name)}</div>
      <div class="big">${a.now == null ? '—' : Number(a.now).toFixed(1)}<small>°</small></div>
      ${lohi}${extra}${spark(a.spark, tone[k])}</div>`;
  });
  $('areas').innerHTML = cards.join('');
  const o = S.sensors.out || {};
  $('areanote').innerHTML = o.ref_lo7 != null && o.lo7 != null ? `↓ / ↑ are the last 7 days. Your outside sensor's nights read ${Math.abs(o.ref_lo7 - o.lo7).toFixed(1)}° ${o.lo7 < o.ref_lo7 ? 'colder' : 'warmer'} than Metservice. Small numbers under Outside are the next 5 nights' forecast lows.` : '';
}
let showAllTasks = false, showAllSow = false;
function todoHTML() {
  const todos = S.events.filter(e => e.type === 'todo').sort((a, b) => a.date < b.date ? -1 : 1);
  return todos.map(e => `<div class="task todo-item"><div class="stripe"></div><div><b>${esc(e.product || 'To do')}</b>${e.date < S.today ? '<span class="late">overdue</span>' : ''}<div class="why">${e.item && e.kind !== 'bed' ? esc(itemName(e)) + ' · ' : ''}${e.date === S.today ? 'today' : niceDate(e.date)}${e.note ? ' · ' + esc(e.note) : ''}</div></div><div class="tbtns"><button class="pill" onclick="doneTodo(${e.id})">✓ Done</button><button class="x" title="Delete" onclick="deleteTodo(${e.id})">✕</button></div></div>`).join('');
}
async function doneTodo(id) { try { await api(`api/events/${id}`, {method: 'PUT', body: JSON.stringify({type: 'done', date: todayISO()})}); toast('Done'); await load(); } catch (x) { toast('Failed: ' + x.message); } }
async function deleteTodo(id) { try { await api(`api/events/${id}`, {method: 'DELETE'}); toast('Removed'); await load(); } catch (x) { toast('Failed: ' + x.message); } }
function renderTasks() {
  const week = S.tasks.filter(x => x.action !== 'sow'), sow = S.tasks.filter(x => x.action === 'sow');
  $('tasks').innerHTML = todoHTML() + taskList(week, showAllTasks, 8, () => { showAllTasks = !showAllTasks; renderTasks(); }, 'Nothing due this week. Enjoy the garden.');
  $('toplant').innerHTML = taskList(sow, showAllSow, 6, () => { showAllSow = !showAllSow; renderTasks(); }, 'Nothing to sow right now.');
  wireSwipes($('tasks')); wireSwipes($('toplant'));
}
window._toggleWeek = () => { showAllTasks = !showAllTasks; renderTasks(); };
window._toggleSow = () => { showAllSow = !showAllSow; renderTasks(); };
function taskList(all, showAll, LIMIT, _toggle, emptyMsg) {
  if (!all.length) return `<div class="empty">${emptyMsg}</div>`;
  const t = showAll ? all : all.slice(0, LIMIT);
  const fn = LIMIT === 8 ? '_toggleWeek()' : '_toggleSow()';
  const more = all.length > LIMIT ? `<button class="pill ghost" style="align-self:center" onclick="${fn}">${showAll ? 'Show fewer' : `Show all ${all.length}`}</button>` : '';
  return t.map(x => {
    const cls = {go:'go', wait:'wait', ask:'ask', job:'spray'}[x.status];
    const btn = x.status === 'wait' ? `<button class="pill ghost" onclick="openItem('${x.kind}','${x.item}')">Open</button>`
      : x.status === 'ask' ? `<button class="pill ghost" onclick="openItem('${x.kind}','${x.item}','harv')">Rate</button>`
      : `<button class="pill ${x.kind==='tree'?'soil':''}" onclick="openItem('${x.kind}','${x.item}','${x.action}','${x.product||''}')">Log it</button>`;
    const data = esc(JSON.stringify({kind: x.kind, item: x.item, key: x.key, title: x.title, action: x.status === 'ask' ? 'harv' : x.status === 'wait' ? '' : x.action, product: x.product || ''}));
    return `<div class="swipe" data-t="${data}"><div class="under"><span class="l">${x.status === 'wait' ? 'Open' : x.status === 'ask' ? 'Rate' : 'Log it'}</span><span class="r">Skip this season</span></div><div class="task ${cls}"><div class="stripe"></div><div><b>${esc(x.title)}</b>${x.late ? '<span class="late">running late</span>' : ''}<div class="why">${x.why}</div></div><div class="tbtns">${btn}<button class="x" title="Not doing this" aria-label="Not doing this" onclick="dismissTask(${JSON.stringify(JSON.stringify({kind: x.kind, item: x.item, key: x.key, title: x.title})).replace(/"/g, '&quot;')})">✕</button></div></div></div>`;
  }).join('') + more;
}

function dismissTask(json) {
  const t = JSON.parse(json);
  showSheet(`<div class="eyebrow">Not doing this</div><h2>${esc(t.title)}</h2>
    <p class="small muted">It stays in the plant's care calendar; this only stops it showing on Today.</p>
    <div class="actions" style="justify-content:stretch;flex-direction:column;gap:8px">
      <button class="pill ghost" onclick="doDismiss(${JSON.stringify(json).replace(/"/g, '&quot;')},'season')">Skip it this season</button>
      <button class="pill" onclick="doDismiss(${JSON.stringify(json).replace(/"/g, '&quot;')},'never')">Never suggest this again</button>
      <button class="pill ghost" onclick="closeSheet()">Cancel</button>
    </div>`);
}
async function doDismiss(json, until) {
  const t = JSON.parse(json);
  try { await api('api/dismiss', {method: 'POST', body: JSON.stringify({kind: t.kind, item: t.item, key: t.key, until})});
    closeSheet(); toast(until === 'never' ? 'Won\'t suggest that again' : 'Skipped for this season'); await load();
  } catch (x) { toast('Failed: ' + x.message); }
}

/* swipe: right = log it, left = skip this season, far left = never */
function wireSwipes(root) {
  root.querySelectorAll('.swipe').forEach(sw => {
    if (sw._wired) return; sw._wired = true;
    const card = sw.querySelector('.task'), under = sw.querySelector('.under'), r = under.querySelector('.r');
    let x0 = null, y0 = 0, dx = 0, locked = null, id = null;
    const reset = () => { card.style.transition = 'transform .2s'; card.style.transform = ''; sw.className = 'swipe'; x0 = null; locked = null; };
    card.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; dx = 0; locked = null; id = e.pointerId; card.style.transition = 'none'; });
    card.addEventListener('pointermove', e => {
      if (x0 === null || e.pointerId !== id) return;
      const ddx = e.clientX - x0, ddy = e.clientY - y0;
      if (locked === null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) { locked = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y'; if (locked === 'x') card.setPointerCapture(id); }
      if (locked !== 'x') return;
      dx = ddx; card.style.transform = `translateX(${dx}px)`;
      const w = sw.offsetWidth;
      sw.className = 'swipe ' + (dx > 70 ? 'go-log' : dx < -w * 0.5 ? 'go-never' : dx < -70 ? 'go-skip' : dx > 0 ? 'peek-log' : 'peek-skip');
      r.textContent = dx < -w * 0.5 ? 'Never suggest again' : 'Skip this season';
    });
    const end = async () => {
      if (x0 === null) return;
      const w = sw.offsetWidth, t = JSON.parse(sw.dataset.t), d = dx; reset();
      if (locked !== 'x') return;
      if (d > 70) { openItem(t.kind, t.item, t.action || undefined, t.product); return; }
      if (d < -70) {
        const until = d < -w * 0.5 ? 'never' : 'season';
        sw.style.transition = 'opacity .2s, max-height .25s'; sw.style.opacity = '0';
        await doDismiss(JSON.stringify(t), until);
      }
    };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', reset);
  });
}

/* ---------- Diary ---------- */
function itemName(e) { if (e.kind === 'bed') return e.item; if (e.kind === 'tree' && e.plant) { const t = S.trees.find(x => x.id === e.item); if (t) return `${t.name} · ${plantName(t, e.plant) || e.plant}`; } const list = e.kind === 'tree' ? S.trees : e.kind === 'flower' ? S.flowers : S.veg; return (list.find(x => x.id === e.item) || {name: e.item}).name; }
function entryHTML(e) {
  const bits = [];
  if (e.variety) bits.push(esc(e.variety)); if (e.qty) bits.push(esc(e.qty)); if (e.product) bits.push(esc(e.product));
  if (e.area) bits.push(esc(e.area));
  const sens = e.sensors ? Object.entries(e.sensors).filter(([k,v]) => v != null).map(([k,v]) => `${{inside:'inside',soil:'soil',gh:'greenhouse',out:'outside'}[k]||k} ${Number(v).toFixed(0)}°`).join(' · ') : '';
  return `<div class="entry" tabindex="0" onclick="openEvent(${e.id})"><div class="d">${niceDate(e.date)}<br>${yearOf(e.date)}</div><div>
    <div class="what"><span class="tag ${e.type}">${TAG[e.type]}</span><b>${esc(itemName(e))}</b>${e.rating ? stars(e.rating) : ''}</div>
    ${bits.length ? `<div class="note">${bits.join(' · ')}</div>` : ''}
    ${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}
    ${e.photo ? `<img class="photo thumb" src="photos/${esc(e.photo)}" alt="" loading="lazy">` : ''}
    <div class="meta">${sens ? `<span>${sens}</span>` : ''}${e.who ? `<span>${esc(e.who)}</span>` : ''}</div></div></div>`;
}
function renderDiary() {
  const ev = S.events;
  $('recent').innerHTML = ev.length ? ev.slice(0, 5).map(entryHTML).join('') : '<div class="empty">Nothing logged yet. Tap a plant in Veggies or Trees to start.</div>';
  const f = diaryFilter === 'all' ? ev : ev.filter(e => e.type === diaryFilter);
  $('fulllog').innerHTML = f.length ? f.map(entryHTML).join('') : '<div class="empty">Nothing here yet.</div>';
}

/* ---------- Grids ----------
   Each row is a name plus one continuous lane covering Jul..Jun. Bands are
   single rounded pills positioned by % of the year, so a window reads as one
   shape rather than a run of month cells. */
const pct = m => (m / 12 * 100).toFixed(2) + '%';
function spans(ranges) {
  // normalise to [0,12) pieces, split windows that run past June, merge touching pieces
  const out = [];
  for (let i = 0; i < ranges.length; i += 2) {
    let a = ranges[i], b = ranges[i+1];
    if (b - a >= 12) { out.push([0, 12]); continue; }
    a = ((a % 12) + 12) % 12; b = a + (ranges[i+1] - ranges[i]);
    if (b > 12) { out.push([a, 12]); out.push([0, b - 12]); } else out.push([a, b]);
  }
  out.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const r of out) { const l = merged[merged.length - 1]; if (l && r[0] <= l[1] + 0.01) l[1] = Math.max(l[1], r[1]); else merged.push(r.slice()); }
  return merged;
}
// Hover text for a bar: what it is, its window, and where today sits in it.
// task = {kind, item, key} for tree/berry jobs, so we can tell done from still-to-do.
// Care calendar order: jobs happening now first, then the next ones coming up, wrapping round the year.
function byNow(tasks) {
  const m = S.season_month;
  const key = k => { if (inWin(m, k.w)) return -1; let d = 99; for (let i = 0; i < k.w.length; i += 2) { let x = k.w[i] % 12 - m; if (x < 0) x += 12; d = Math.min(d, x); } return d; };
  return tasks.slice().sort((a, b) => key(a) - key(b));
}
function bandTip(ranges, label, why, task) {
  const m = S.season_month;
  let when;
  if (inWin(m, ranges)) {
    if (task) {
      const open = S.tasks.find(t => t.kind === task.kind && t.item === task.item && t.key === task.key);
      when = open ? `Due now${open.title.includes(' · ') ? ': ' + open.title.split(' · ').slice(1).join(' · ') + ' still to do' : ', not done yet'}` : 'Done (or skipped) this season';
    } else when = 'Now';
  } else {
    let d = 99;
    for (let i = 0; i < ranges.length; i += 2) { let x = ranges[i] % 12 - m; if (x < 0) x += 12; d = Math.min(d, x); }
    const wks = Math.round(d * 4.35);
    when = wks <= 8 ? `Starts in ${wks} week${wks === 1 ? '' : 's'}` : `Next: ${winLabel(ranges).split(',')[0]}`;
  }
  return `${label} · ${winLabel(ranges)}\n${when}${why ? '\n' + why : ''}`;
}
function bandHTML(ranges, cls, style, tip) {
  return spans(ranges).map(([a, b]) => `<span class="band ${cls}" style="${style || ''}left:${pct(a)};width:calc(${pct(b - a)} - 2px)"${tip ? ` title="${esc(tip)}"` : ''}></span>`).join('');
}
function dotHTML(m, cls, style, title) {
  return `<span class="dot ${cls}" style="left:${pct(m)};${style || ''}" title="${esc(title || '')}"></span>`;
}
function head(label, noCols) {
  const now = Math.floor(S.season_month);
  return `${noCols ? '' : '<colgroup><col class="name"><col></colgroup>'}<thead><tr><th class="sect">${label || ''}</th><th class="months">${MONTHS.map((m, i) => `<span class="${now === i ? 'now' : ''}">${m[0]}</span>`).join('')}</th></tr></thead>`;
}
function growingNow(kind, id) {
  // growing = established perennial, or anything logged in the last ~10 months with no season review after it
  // (winter crops like garlic and brussels sprouts span the July season boundary)
  const p = plantList(kind).find(x => x.id === id); if (p && p.established) return true;
  const cutoff = new Date(new Date(S.today + 'T12:00:00') - 300 * 864e5).toISOString().slice(0, 10);
  const evs = S.events.filter(e => e.kind === kind && e.item === id && e.date >= cutoff);
  const lastReview = evs.find(e => e.type === 'review');
  const growing = evs.filter(e => ['sow', 'out', 'harv', 'note', 'feed', 'issue'].includes(e.type) && (!lastReview || e.date > lastReview.date || (e.date === lastReview.date && e.id > lastReview.id)));
  return growing.length > 0;
}
function twoSections(kind, list, rowFn) {
  const wrap = kind === 'flower' ? 'gridwrap petals' : 'gridwrap';
  const grow = list.filter(v => growingNow(kind, v.id)), plant = list.filter(v => !growingNow(kind, v.id));
  const m = S.season_month;
  // to-plant: things you can sow now first, then by how soon the window opens
  const soon = v => { if (inWin(m, v.sow)) return -1; let best = 99; for (let i = 0; i < v.sow.length; i += 2) { let d = v.sow[i] - m; if (d < 0) d += 12; best = Math.min(best, d); } return best; };
  plant.sort((a, b) => soon(a) - soon(b) || a.name.localeCompare(b.name));
  const card = (title, sub, items, empty) => `<section class="calsect"><div class="secthead"><h2>${title}</h2><span>${sub}</span></div>
    <div class="${wrap}"><table class="cal">${head('')}<tbody>${items.length ? items.map(rowFn).join('') : `<tr><td colspan="2" class="empty">${empty}</td></tr>`}</tbody></table></div></section>`;
  const nowCount = plant.filter(v => inWin(m, v.sow)).length;
  let html = '';
  html += card('Growing now', grow.length ? `${grow.length} this season` : 'none yet', grow, `Nothing ${kind === 'flower' ? 'sown or planted' : 'growing'} yet this season. Tap a ${kind === 'flower' ? 'flower' : 'plant'} below and log <b>Sowed</b> or <b>Planted out</b>.`);
  html += card('To plant', nowCount ? `${nowCount} can go in now` : `${plant.length} plants`, plant, 'Nothing matches.');
  return html;
}
function row(name, sub, lane, onclick, cls) {
  return `<tr tabindex="0" class="${cls || ''}" onclick="${onclick}" onkeydown="if(event.key==='Enter'){${onclick}}"><td class="name">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ''}</td><td class="lane"><div class="track">${lane}<span class="cursor" style="left:${pct(S.season_month)}"></span></div></td></tr>`;
}
function renderVeg() {
  const m = S.season_month, season = S.season;
  const rows = S.veg.filter(v => {
    if (vegGroup !== 'all' && (v.group || 'annual') !== vegGroup) return false;
    const evs = S.events.filter(e => e.kind === 'veg' && e.item === v.id);
    if (vegFilter === 'inside') return v.where === 'inside';
    if (vegFilter === 'direct') return v.where !== 'inside';
    if (vegFilter === 'now') return inWin(m, v.sow) || (v.out && inWin(m, v.out));
    if (vegFilter === 'growing') return growingNow('veg', v.id);
    if (vegFilter === 'logged') return evs.length > 0;
    return true;
  });
  const rowFn = v => {
    const inside = v.where === 'inside';
    let lane = bandHTML(v.sow, 'sow', '', bandTip(v.sow, `Sow ${v.name.toLowerCase()}${inside ? ' inside' : v.where === 'direct' ? ' direct' : ''}`, v.soil ? `Wants soil about ${v.soil}° to germinate.` : ''))
      + (v.out && v.out.length ? bandHTML(v.out, 'out', '', bandTip(v.out, `Plant out ${v.name.toLowerCase()}`, v.night ? `Wants nights above ${v.night}°.` : '')) : '')
      + bandHTML(v.harv, 'harv', '', bandTip(v.harv, `Harvest ${v.name.toLowerCase()}`, ''));
    S.events.filter(e => e.kind === 'veg' && e.item === v.id && e.season === season && ['sow','out','harv'].includes(e.type)).forEach(e => {
      const em = seasonMonth(e.date), win = e.type === 'sow' ? v.sow : e.type === 'out' ? v.out : v.harv;
      const late = win && win.length && !inWin(em, win);
      lane += dotHTML(em, `${e.type} ${late ? 'late' : ''}`, '', `${TAG[e.type]} ${niceDate(e.date)}`);
    });
    return row(v.name, v.where === 'inside' ? 'start inside' : v.where === 'either' ? 'inside or direct' : 'direct', lane, `openItem('veg','${v.id}')`);
  };
  $('cal').innerHTML = twoSections('veg', rows, rowFn);
}
function renderFlowers() {
  const m = S.season_month, season = S.season;
  const rows = S.flowers.filter(f => {
    const evs = S.events.filter(e => e.kind === 'flower' && e.item === f.id);
    if (flowerFilter === 'now') return inWin(m, f.sow);
    if (flowerFilter === 'blooming') return inWin(m, f.harv);
    if (flowerFilter === 'logged') return evs.length > 0;
    return true;
  });
  const rowFn = f => {
    const col = f.colour || 'var(--petal)';
    let lane = bandHTML(f.sow, 'sow', '', bandTip(f.sow, `Sow ${f.name.toLowerCase()}`, f.tip ? f.tip.split('. ')[0] + '.' : ''))
      + (f.out && f.out.length ? bandHTML(f.out, 'out', '', bandTip(f.out, `Plant out ${f.name.toLowerCase()}`, f.night ? `Wants nights above ${f.night}°.` : '')) : '')
      + bandHTML(f.harv, 'bloom', `background:${col};`, bandTip(f.harv, `${f.name} in flower`, ''));
    S.events.filter(e => e.kind === 'flower' && e.item === f.id && e.season === season && ['sow','out','harv'].includes(e.type)).forEach(e => {
      lane += dotHTML(seasonMonth(e.date), e.type === 'harv' ? 'bloom' : e.type, e.type === 'harv' ? `background:${col}` : '', `${TAG[e.type]} ${niceDate(e.date)}`);
    });
    return row(f.name, f.where === 'inside' ? 'start inside' : f.where === 'either' ? 'inside or direct' : 'direct', lane, `openPlant('${f.id}', null, 'flower')`);
  };
  $('flowercal').innerHTML = twoSections('flower', rows, rowFn);
}
function renderTrees() {
  const season = S.season;
  const LANE = {copper: 'l1', oil: 'l2', feed: 'l3', prune: 'l3', other: 'l3'};
  const alive = S.trees.filter(t => !isDead(t));
  const count = g => alive.filter(t => g === 'all' || (t.group || 'tree') === g).reduce((n, t) => n + (plantsOf(t) ? plantsOf(t).length : (t.count || 1)), 0);
  $('treeGroups').innerHTML = [['all', 'Everything'], ['tree', 'Trees'], ['perennial', 'Perennials']]
    .map(([g, l]) => `<button class="chip ${treeGroup === g ? 'on' : ''}" onclick="treeGroup='${g}';renderTrees()">${l} <span class="n">${count(g)}</span></button>`).join('');
  const inGroup = t => treeGroup === 'all' || (t.group || 'tree') === treeGroup;
  const ordered = S.trees.filter(t => !isDead(t) && inGroup(t)).concat(S.trees.filter(t => isDead(t) && inGroup(t)));
  const rows = ordered.map(t => {
    if (isDead(t)) return row(t.name, `died ${niceDate(deadEvent(t).date)} ${yearOf(deadEvent(t).date)}`, '', `openItem('tree','${t.id}')`, 'dead');
    let lane = '';
    t.tasks.filter(k => treeFilter === 'all' || k.kind === treeFilter).forEach(k => lane += bandHTML(k.w, LANE[k.kind], `background:var(--${TREE_COL[k.kind]});`,
      bandTip(k.w, `${{copper:'Copper spray', oil:'Oil / lime sulphur', feed:'Feed', prune:'Prune', other:'Job'}[k.kind]} · ${t.name}`, k.why, {kind: 'tree', item: t.id, key: `${k.kind}:${+k.w[0]}`})));
    S.events.filter(e => e.kind === 'tree' && e.item === t.id && e.season === season && ['spray','feed','prune'].includes(e.type)).forEach(e => {
      const kind = e.type === 'spray' ? (/oil|sulphur|neem/i.test(e.product || '') ? 'oil' : 'copper') : e.type;
      if (treeFilter !== 'all' && kind !== treeFilter) return;
      lane += dotHTML(seasonMonth(e.date), LANE[kind], `background:var(--${TREE_COL[kind]})`, `${niceDate(e.date)} ${e.product || ''}`);
    });
    const ps = plantsOf(t), n = ps ? ps.length : (t.count || 1);
    const stages = (ps || [null]).map(p => { const st = treeStage(t, p && p.id); return st ? `<span class="stageico" title="${esc((p ? p.name + ': ' : '') + st.product)} since ${niceDate(st.date)}">${STAGE_ICON[st.product] || ''}${ps ? '' : `<em>${esc(st.product)}</em>`}</span>` : ''; }).join('');
    const sub = ps ? ps.map(p => p.name).join(', ') : (t.variety || '');
    return row(t.name + (n > 1 ? ` ×${n}` : ''), sub, lane, `openItem('tree','${t.id}')`)
      .replace('</td><td class="lane">', (stages ? `<span class="stages">${stages}</span>` : '') + '</td><td class="lane">');
  }).join('');
  $('treecal').innerHTML = head() + '<tbody>' + rows + '</tbody>';
}

/* ---------- Sheet ---------- */
const scrim = $('scrim'), sheet = $('sheet');
scrim.addEventListener('click', closeSheet);
function closeSheet(fromBack) {
  if (!sheet.classList.contains('on')) return;
  scrim.classList.remove('on'); sheet.classList.remove('on'); sheet.style.transform = '';
  // we pushed a history entry when the popup opened; pop it so Back doesn't need two presses
  if (!fromBack && history.state && history.state.gardenSheet) history.back();
}
// Phone back button / swipe-back closes the popup instead of leaving the page
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
window.addEventListener('popstate', () => { if (sheet.classList.contains('on')) closeSheet(true); });
// Pull the popup down to close it (only when it's scrolled to the top)
(() => {
  let y0 = null, dy = 0;
  sheet.addEventListener('touchstart', e => { if (sheet.scrollTop <= 0 && !e.target.closest('input,textarea,.swipe')) { y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = 'none'; } }, {passive: true});
  sheet.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy > 0 && sheet.scrollTop <= 0) { sheet.style.transform = (innerWidth >= 640 ? 'translate(-50%,' : 'translateY(') + dy + 'px)'; if (e.cancelable) e.preventDefault(); }
    else { y0 = null; sheet.style.transform = ''; }
  }, {passive: false});
  sheet.addEventListener('touchend', () => {
    if (y0 === null) return; sheet.style.transition = '';
    if (dy > 90) closeSheet(); else sheet.style.transform = '';
    y0 = null;
  });
})();
function showSheet(html) {
  const wasOpen = sheet.classList.contains('on');
  sheet.innerHTML = '<div class="sheettop"><div class="grab"></div><button class="close" aria-label="Close" onclick="closeSheet()">✕</button></div>' + html;
  scrim.classList.add('on'); sheet.classList.add('on'); sheet.style.transform = ''; sheet.scrollTop = 0;
  if (!wasOpen) history.pushState({gardenSheet: true}, '');
}
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400); }

function openItem(kind, id, action, product) { if (kind === 'tree') { selPlant = null; openTree(id, action, product); } else openPlant(id, action, kind); }

function seasonsOf(evs) {
  const by = {};
  evs.forEach(e => (by[e.season] = by[e.season] || []).push(e));
  return Object.keys(by).sort().reverse().map(s => ({season: s, events: by[s].slice().sort((a, b) => a.date < b.date ? -1 : 1)}));
}
function seasonRow(s, current, flower) {
  const first = t => s.events.find(e => e.type === t);
  const review = s.events.filter(e => e.type === 'review').pop();
  const harvs = s.events.filter(e => e.type === 'harv');
  const issues = s.events.filter(e => e.type === 'issue');
  const bits = [];
  if (first('sow')) bits.push(`sow <b>${niceDate(first('sow').date)}</b>${first('sow').variety ? ` <span>${esc(first('sow').variety)}</span>` : ''}`);
  if (first('out')) bits.push(`out <b>${niceDate(first('out').date)}</b>${first('out').area ? ` <span>${esc(first('out').area)}</span>` : ''}`);
  if (harvs.length) bits.push(`${flower ? 'flowers' : 'harvest'} <b>${niceDate(harvs[0].date)}</b>${harvs.length > 1 ? ` +${harvs.length-1}` : ''}`);
  if (issues.length) bits.push(`<span style="color:var(--warn)">${issues.map(i => esc(i.product || 'problem')).join(', ')}</span>`);
  return `<div class="season"><div class="y">${s.season}${current ? '<br><span style="font-weight:400">now</span>' : ''}</div><div class="r">
    <div class="minirow">${bits.join(' · ') || '<span>nothing dated</span>'}</div>
    ${review ? `<div>${stars(review.rating || 0)}</div>${review.note ? `<div class="verdict">${esc(review.note)}</div>` : ''}` : (current ? '' : '<div class="verdict">No season review.</div>')}
  </div></div>`;
}

function plantList(kind) { return kind === 'flower' ? S.flowers : S.veg; }
function photoStrip(evs) {
  const ph = evs.filter(e => e.photo);
  if (!ph.length) return '';
  return `<h3 style="margin-top:14px">Photos</h3><div class="strip">${ph.map(e => `<figure onclick="openEvent(${e.id})"><img src="photos/${esc(e.photo)}" alt="" loading="lazy"><figcaption>${niceDate(e.date)} ${yearOf(e.date)}</figcaption></figure>`).join('')}</div>`;
}
function openPlant(id, action, kind) {
  kind = kind || 'veg';
  const v = plantList(kind).find(x => x.id === id); if (!v) return;
  const flower = kind === 'flower';
  const evs = S.events.filter(e => e.kind === kind && e.item === id);
  const seasons = seasonsOf(evs);
  const inside = v.where !== 'direct';
  const q = (t, label, icon) => `<button class="${action===t?'on':''}" data-t="${t}" onclick="vegForm('${id}','${t}','${kind}')"><span>${icon}</span>${label}</button>`;
  showSheet(`
    <div class="eyebrow">${flower ? `<span class="swatch" style="background:${v.colour || 'var(--petal)'}"></span>` : ''}${v.where === 'inside' ? 'Start inside, plant out' : v.where === 'either' ? 'Inside or direct' : 'Sow direct'}</div>
    <h2>${esc(v.name)}</h2>
    <div class="minirow" style="margin-top:4px">sow <b>${winLabel(v.sow)}</b>${v.out && v.out.length ? ` · out <b>${winLabel(v.out)}</b>` : ''} · ${flower ? 'flowers' : 'harvest'} <b>${winLabel(v.harv)}</b></div>
    ${v.area ? `<div class="minirow">usually in <b>${esc(v.area)}</b></div>` : ''}
    ${v.established ? `<div class="minirow">already growing · no sowing reminders (tap 🌿 again to undo)</div>` : ''}
    ${v.tip ? `<p class="tip">${esc(v.tip)}</p>` : ''}
    <div class="quick">
      ${q('sow','Sowed','🌱')}${inside ? q('out','Planted out','🪴') : ''}${flower ? q('harv','In flower / cut','🌸') : q('harv','Harvest','🧺')}${q('feed','Fed','💧')}${v.tasks ? q('prune','Pruned','✂️') : ''}${q('issue','Problem','⚠️')}${q('note','Note / photo','📷')}
      <button class="${v.established ? 'on' : ''}" onclick="setEstablished('${id}','${kind}',${!v.established})"><span>🌿</span>${v.established ? 'Already growing ✓' : 'Already growing'}</button>
    </div>
    <form class="add" id="f"></form>
    ${photoStrip(evs)}
    ${v.tasks ? `<h3 style="margin-top:14px">Care calendar</h3>${byNow(v.tasks).map(k => `<div class="season"><div class="y">${winLabel(k.w)}</div><div class="r"><div><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--${TREE_COL[k.kind]});margin-right:6px;vertical-align:middle"></i>${{copper:'Copper', oil:'Oil', feed:'Feed', prune:'Prune', other:'Job'}[k.kind]}</div><div class="verdict">${esc(k.why)}</div></div></div>`).join('')}` : ''}
    <h3 style="margin-top:14px">Seasons</h3>
    ${seasons.length ? seasons.map(s => seasonRow(s, s.season === S.season, flower)).join('') : '<div class="season"><div class="y">—</div><div class="r"><div class="verdict">Nothing logged yet. This year becomes the baseline.</div></div></div>'}
    <div class="sub" style="margin-top:14px"><button class="pill ghost" onclick="editPlant('${id}','${kind}')">Edit windows</button><button class="pill ghost" onclick="hidePlant('${id}','${kind}')">Hide from grid</button></div>
  `);
  if (action) vegForm(id, action, kind);
}

// Tap-to-pick replacement for drop-downs: chips plus a hidden input so val(id) still works.
function chipPick(id, opts, preferred, label, other) {
  return `${label ? `<label class="span2">${label}</label>` : ''}<div class="areapick span2" data-for="${id}">${opts.map(o => `<button type="button" class="chip ${o === preferred ? 'on' : ''}" data-v="${esc(o)}" onclick="pickArea(this)">${esc(o)}</button>`).join('')}${other ? `<input class="other" placeholder="${other}" oninput="pickArea(this)">` : ''}</div><input type="hidden" id="${id}" value="${esc(preferred || '')}">`;
}
function knownAreas(inside) {
  // configured beds plus any place you've typed before ("Around the tap")
  const base = (inside ? S.inside_areas : []).concat(S.areas);
  const since = new Date(new Date(S.today + 'T12:00:00') - 365 * 864e5).toISOString().slice(0, 10);
  const used = [...new Set(S.events.filter(e => e.date >= since && !(e.note || '').includes('from spreadsheet')).map(e => e.area).filter(a => a && a.length < 30 && !/[.]$/.test(a)))];
  return base.concat(used.filter(a => !base.some(b => b.toLowerCase() === a.toLowerCase())).slice(0, 8));
}
function areaSelect(id, inside) {
  return `<label class="span2">Where</label><div class="areapick span2" data-for="${id}">${knownAreas(inside).map(a => `<button type="button" class="chip" data-v="${esc(a)}" onclick="pickArea(this)">${esc(a)}</button>`).join('')}<input class="other" placeholder="Somewhere else" oninput="pickArea(this)"></div><input type="hidden" id="${id}">`;
}
function pickArea(el) {
  const box = el.closest('.areapick'), hid = document.getElementById(box.dataset.for);
  box.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === el));
  if (el.tagName === 'INPUT') { hid.value = el.value.trim(); } else { hid.value = el.dataset.v; const o = box.querySelector('.other'); if (o) o.value = ''; }
}
function setArea(id, v) {
  const hid = document.getElementById(id); if (!hid || !v) return;
  const box = document.querySelector(`.areapick[data-for="${id}"]`); if (!box) { hid.value = v; return; }
  const chip = [...box.querySelectorAll('.chip')].find(c => c.dataset.v.toLowerCase() === v.toLowerCase());
  if (chip) pickArea(chip); else { const o = box.querySelector('.other'); o.value = v; pickArea(o); }
}
const dateField = (v) => `<label>Date<input id="date" type="date" value="${v || todayISO()}"></label>`;
const photoField = () => `<label>Photo<input id="photo" type="file" accept="image/*" capture="environment"></label>`;

function vegForm(id, t, kind) {
  kind = kind || 'veg';
  const v = plantList(kind).find(x => x.id === id);
  const flower = kind === 'flower';
  const f = $('f');
  document.querySelectorAll('.quick button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  const body = {
    sow: `<div class="row">${dateField()}${areaSelect('area', true)}</div><label>Variety<input id="variety" placeholder="Sweet 100"></label><div class="row"><label>How many<input id="qty" placeholder="6 cells"></label>${photoField()}</div>`,
    out: `<div class="row">${dateField()}${areaSelect('area', true)}</div><div class="row"><label>How many plants<input id="qty" placeholder="4"></label>${photoField()}</div>`,
    harv: `<div class="row">${dateField()}<label>${flower ? 'What' : 'Amount'}<input id="qty" placeholder="${flower ? 'first flowers · a bunch for the kitchen' : 'first pick · 1 kg'}"></label></div>
      <label>How has ${esc(v.name.toLowerCase())} gone this season? <span class="muted">(optional, once per season)</span><div class="rate" id="rate">${[1,2,3,4,5].map(n => `<button type="button" onclick="rate(${n})">★</button>`).join('')}</div></label>
      <label>What to change next year<textarea id="change" placeholder="Earlier? Later? Different spot or variety?"></textarea></label>`,
    feed: `${chipPick('product', FEEDS.filter(x => x !== 'Other'), null, 'What', 'Something else')}<div class="row">${dateField()}</div>`,
    issue: `${chipPick('product', ISSUES.filter(x => x !== 'Other'), null, 'Problem', 'Something else')}<div class="row">${dateField()}${photoField()}</div>`,
    note: `<div class="row">${dateField()}${photoField()}</div>`,
    prune: `<div class="row">${dateField()}${photoField()}</div>`,
    move: `<div class="row">${dateField()}${areaSelect('area', true)}</div><label>How many<input id="qty" placeholder="all of them"></label>`,
  }[t];
  const snap = Object.entries(S.sensors).filter(([k, a]) => k !== 'forecast' && a.now != null).map(([k, a]) => `${{inside:'inside',gh:'greenhouse',out:'outside'}[k]} ${fmtT(a.now)}`).concat(S.sensors.inside?.soil != null ? [`soil ${fmtT(S.sensors.inside.soil)}`] : []).join(' · ');
  f.innerHTML = `${body}<label>Notes<textarea id="note" placeholder="Optional"></textarea></label>
    <div class="auto">Attached automatically: ${snap}</div>
    <div class="actions"><button type="button" class="pill ghost" onclick="$('f').classList.remove('on')">Cancel</button><button class="pill" type="submit">Save</button></div>`;
  f.classList.add('on');
  if (f.querySelector('#area')) setArea('area', t === 'sow' && v.where === 'inside' ? 'Heat pad' : (v.area || '').split(',')[0].trim());
  f.onsubmit = (ev) => { ev.preventDefault(); saveVeg(id, t, kind); };
  if (!TOUCH) setTimeout(() => (f.querySelector('#variety') || f.querySelector('#qty') || f.querySelector('#note'))?.focus(), 50);
}
let rating = 0;
function rate(n) { rating = n; document.querySelectorAll('#rate button').forEach((b, i) => b.classList.toggle('on', i < n)); }

async function uploadPhoto(input) {
  const file = input && input.files && input.files[0]; if (!file) return null;
  const blob = await shrink(file);
  const r = await fetch('api/photos', {method: 'POST', headers: {'Content-Type': 'image/jpeg'}, body: blob});
  if (!r.ok) throw new Error('photo upload failed');
  return (await r.json()).photo;
}
function shrink(file) {
  return new Promise((res) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const max = 1600, s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width*s); c.height = Math.round(img.height*s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(b => res(b || file), 'image/jpeg', 0.85); };
    img.onerror = () => res(file);
    img.src = url;
  });
}
const val = (id) => { const el = document.getElementById(id); return el && el.value.trim() ? el.value.trim() : null; };

async function saveVeg(id, t, kind) {
  kind = kind || 'veg';
  const btn = document.querySelector('#f button[type=submit]'); btn.disabled = true;
  try {
    const photo = await uploadPhoto($('photo'));
    const base = {kind, item: id, date: val('date'), area: val('area'), variety: val('variety'), qty: val('qty'), product: val('product'), note: val('note'), photo};
    await api('api/events', {method: 'POST', body: JSON.stringify(Object.assign({type: t}, base))});
    if (t === 'harv' && (rating || val('change'))) {
      await api('api/events', {method: 'POST', body: JSON.stringify({kind, item: id, type: 'review', date: val('date'), rating: rating || null, note: val('change')})});
    }
    rating = 0; closeSheet(); toast(`Saved · ${plantList(kind).find(x => x.id === id).name}`); await load();
  } catch (e) { toast('Save failed: ' + e.message); btn.disabled = false; }
}

/* ----- trees ----- */
function pickPlant(id, pid) { selPlant = pid || null; openTree(id); }
function openTree(id, action, product) {
  const t = S.trees.find(x => x.id === id); if (!t) return;
  const ps = plantsOf(t);
  if (selPlant && !(ps || []).some(p => p.id === selPlant)) selPlant = null;
  const evs = S.events.filter(e => e.kind === 'tree' && e.item === id && (!selPlant || !e.plant || e.plant === selPlant));
  const q = (ty, label, icon, prod) => `<button data-t="${ty}" onclick="treeForm('${id}','${ty}','${prod||''}')"><span>${icon}</span>${label}</button>`;
  showSheet(`
    <div class="eyebrow">${t.group === 'perennial' ? 'Perennial' : 'Fruit tree'}</div><h2>${esc(t.name)}${selPlant ? ` · ${esc(plantName(t, selPlant))}` : ''}</h2>
    ${ps ? `<div class="plantpick"><button class="chip ${!selPlant ? 'on' : ''}" onclick="pickPlant('${id}')">All ${ps.length}</button>${ps.map(p => { const st = treeStage(t, p.id); return `<button class="chip ${selPlant === p.id ? 'on' : ''}" onclick="pickPlant('${id}','${p.id}')">${st ? (STAGE_ICON[st.product] || '') + ' ' : ''}${esc(p.name)}</button>`; }).join('')}<button class="chip ghost" onclick="editPlants('${id}')">✎ Edit</button></div>`
      : `<div class="sub"><span class="minirow">${t.variety ? esc(t.variety) + ' · ' : ''}one plant</span><button class="pill ghost step" onclick="editPlants('${id}')">+ Name them / add more</button></div>`}
    ${(() => { const st = treeStage(t, selPlant); return st ? `<div class="minirow">stage${!selPlant && ps ? ' (latest)' : ''}: ${STAGE_ICON[st.product] || ''} <b>${esc(st.product)}</b> since ${niceDate(st.date)}${st.plant && !selPlant ? ` · ${esc(plantName(t, st.plant))}` : ''}</div>` : ''; })()}
    ${t.area ? `<div class="minirow" style="margin-top:4px">lives in <b>${esc(currentHome(t))}</b>${t.night != null ? ` · happy outside above <b>${t.night}°</b> at night` : ''}</div>` : ''}
    <div class="quick" style="grid-template-columns:repeat(3,1fr)">${q('spray','Sprayed','🧴')}${q('feed','Fed','💧')}${q('prune','Pruned','✂️')}${q('stage','Stage','🌸')}${q('move','Moved','🚚')}${q('harv','Harvest','🧺')}${q('note','Note / photo','📷')}${q('died', isDead(t) ? 'Replanted' : 'Died', isDead(t) ? '🌱' : '🥀')}</div>
    ${isDead(t) ? `<div class="hint" style="margin-top:8px">Marked as died ${niceDate(deadEvent(t).date)} ${yearOf(deadEvent(t).date)}${deadEvent(t).note ? ` · ${esc(deadEvent(t).note)}` : ''}. No jobs are suggested for it.</div>` : ''}
    <form class="add" id="f"></form>
    ${photoStrip(evs)}
    <h3 style="margin-top:14px">Care calendar</h3>
    ${byNow(t.tasks).map(k => { const live = inWin(S.season_month, k.w) || S.tasks.some(x => x.kind === 'tree' && x.item === id && x.key === `${k.kind}:${+k.w[0]}`); return `<div class="season ${live ? 'nowrow' : ''}"><div class="y">${winLabel(k.w)}${live ? `<br><b class="nowtag">${inWin(S.season_month, k.w) ? 'now' : 'now · by stage'}</b>` : ''}${k.stage ? `<br><span class="stagelink">${STAGE_ICON[k.stage] || ''} at ${esc(k.stage.toLowerCase())}</span>` : ''}</div><div class="r"><div><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--${TREE_COL[k.kind]});margin-right:6px;vertical-align:middle"></i>${{copper:'Copper', oil:'Oil / lime sulphur', feed:'Feed', prune:'Prune', other:'Job'}[k.kind]}</div><div class="verdict">${esc(k.why)}</div></div></div>`; }).join('')}
    <h3 style="margin-top:14px">Done</h3>
    ${evs.length ? evs.slice(0, 30).map(e => `<div class="season"><div class="y">${niceDate(e.date)}<br>${yearOf(e.date)}</div><div class="r"><div>${TAG[e.type]}${e.product ? ` · ${esc(e.product)}` : ''}${e.plant && !selPlant ? ` <span class="muted">· ${esc(plantName(t, e.plant))}</span>` : ''}</div>${e.note ? `<div class="verdict">${esc(e.note)}</div>` : ''}${e.photo ? `<img class="photo thumb" src="photos/${esc(e.photo)}" alt="">` : ''}</div></div>`).join('') : '<div class="season"><div class="y">—</div><div class="r"><div class="verdict">Nothing recorded yet.</div></div></div>'}
  `);
  if (action) treeForm(id, action, product);
}
function deadEvent(t) {
  // latest died/replanted event decides; the diary keeps both
  const e = S.events.find(e => e.kind === 'tree' && e.item === t.id && (e.type === 'issue' && e.product === 'Died' || e.type === 'out'));
  return e && e.type === 'issue' ? e : null;
}
function isDead(t) { return !!deadEvent(t); }
function editPlants(id) {
  const t = S.trees.find(x => x.id === id), ps = plantsOf(t) || [];
  showSheet(`<div class="eyebrow">${esc(t.name)}</div><h2>Your ${esc(t.name.toLowerCase())} plants</h2>
    <p class="small muted">One per line: the variety, or something that tells them apart ("by the fence"). Each gets its own stage, jobs and history.</p>
    <form class="add on" id="f"><label>Names<textarea id="names" rows="6" placeholder="Gravenstein&#10;Blush Babe">${esc(ps.map(p => p.name).join('\n'))}</textarea></label>
    <div class="actions"><button type="button" class="pill ghost" onclick="openTree('${id}')">Cancel</button><button class="pill" type="submit">Save</button></div></form>`);
  $('f').onsubmit = async (ev) => { ev.preventDefault();
    const names = $('names').value.split('\n').map(x => x.trim()).filter(Boolean);
    const used = new Set();
    const plants = names.map(n => { const old = ps.find(p => p.name.toLowerCase() === n.toLowerCase());
      let pid = old ? old.id : n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'p';
      while (used.has(pid)) pid += '_'; used.add(pid); return {id: pid, name: n}; });
    try { await api(`api/plants/tree/${id}`, {method: 'PUT', body: JSON.stringify({plants, count: plants.length || 1})}); await load(); selPlant = null; openTree(id); toast('Saved'); }
    catch (x) { toast('Failed: ' + x.message); } };
}
async function setCount(id, n) {
  try { await api(`api/plants/tree/${id}`, {method: 'PUT', body: JSON.stringify({count: n})}); await load(); openTree(id); } catch (x) { toast('Failed: ' + x.message); }
}
function currentHome(t) {
  const mv = S.events.find(e => e.kind === 'tree' && e.item === t.id && (e.type === 'move' || e.type === 'out') && e.area);
  return mv ? mv.area : (t.area || '—');
}
function whichOnes(id) {
  const t = S.trees.find(x => x.id === id), ps = plantsOf(t);
  if (!ps) return '';
  return `<label>Which ones</label><div class="filters whichones">${ps.map(p => `<button type="button" class="chip ${selPlant === p.id ? 'on' : ''}" data-id="${p.id}" onclick="this.classList.toggle('on')">${esc(p.name)}</button>`).join('')}<button type="button" class="chip ghost" onclick="this.parentNode.querySelectorAll('.chip[data-id]').forEach(c=>c.classList.add('on'))">All</button></div>`;
}
function pickedPlants(id) {
  const t = S.trees.find(x => x.id === id);
  if (!plantsOf(t)) return [null];
  const sel = [...document.querySelectorAll('.whichones .chip.on[data-id]')].map(b => b.dataset.id);
  return sel.length ? sel : null;
}
function treeForm(id, t, productKind) {
  const f = $('f');
  if (t === 'died') {
    const tree = S.trees.find(x => x.id === id), dead = isDead(tree);
    document.querySelectorAll('.quick button').forEach(b => b.classList.toggle('on', b.dataset.t === 'died'));
    f.innerHTML = `${whichOnes(id)}${dead ? areaSelect('area', true) : chipPick('cause', ['Frost', 'Drought', 'Wind', 'Pests', 'Disease', 'Waterlogged', 'Removed', 'Unknown'], null, 'Cause')}<div class="row">${dateField()}</div>
      <label>Notes<textarea id="note" placeholder="${dead ? 'New plant, variety, where from' : 'What happened, what to do differently'}"></textarea></label>
      ${photoField()}
      <div class="actions"><button type="button" class="pill ghost" onclick="$('f').classList.remove('on')">Cancel</button><button class="pill ${dead ? '' : 'danger'}" type="submit">${dead ? 'Log replanting' : 'Mark as died'}</button></div>`;
    f.classList.add('on');
    f.onsubmit = async (ev) => { ev.preventDefault();
      try { const photo = await uploadPhoto($('photo'));
        const body = dead ? {kind: 'tree', item: id, type: 'out', date: val('date'), area: val('area'), note: val('note'), photo}
          : {kind: 'tree', item: id, type: 'issue', product: 'Died', date: val('date'), note: [val('cause') ? `Died: ${val('cause').toLowerCase()}` : null, val('note')].filter(Boolean).join('. '), photo};
        const plants = pickedPlants(id); if (!plants) { toast('Pick which ones'); return; }
        body.plants = plants;
        await api('api/events', {method: 'POST', body: JSON.stringify(body)});
        closeSheet(); toast(dead ? `Replanted · ${tree.name}` : `${tree.name} marked as died`); await load();
      } catch (x) { toast('Failed: ' + x.message); } };
    return;
  }
  document.querySelectorAll('.quick button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  const prods = t === 'spray' ? PRODUCTS.copper.concat(PRODUCTS.oil, ['Other']) : t === 'feed' ? PRODUCTS.feed.concat(['Other']) : null;
  const preferred = productKind === 'oil' ? PRODUCTS.oil[0] : productKind === 'copper' ? PRODUCTS.copper[0] : null;
  // trees due the same job right now come first, marked "due"
  const dueSame = new Set(S.tasks.filter(k => k.kind === 'tree' && k.action === t && k.item !== id && (!productKind || k.product === productKind)).map(k => k.item));
  const others = S.trees.filter(x => x.id !== id && !isDead(x)).sort((a, b) => dueSame.has(b.id) - dueSame.has(a.id))
    .map(x => `<button type="button" class="chip ${dueSame.has(x.id) ? 'due' : ''}" data-id="${x.id}" onclick="this.classList.toggle('on')">${esc(x.name)}${dueSame.has(x.id) ? ' · due' : ''}</button>`).join('');
  if (t === 'stage') {
    const tree = S.trees.find(x => x.id === id);
    const cur = (S.events.find(e => e.kind === 'tree' && e.item === id && e.type === 'stage') || {}).product;
    f.innerHTML = `${whichOnes(id)}<label>What's it doing</label><div class="stagepick">${S.stages.map(x => `<button type="button" class="chip ${x === cur ? 'cur' : ''}" data-v="${esc(x)}">${STAGE_ICON[x] || ''} ${x}</button>`).join('')}</div>
      <input type="hidden" id="product">
      <div class="row">${dateField()}${photoField()}</div>
      <label>Notes<textarea id="note" placeholder="Optional"></textarea></label>
      <div class="actions"><button type="button" class="pill ghost" onclick="$('f').classList.remove('on')">Cancel</button><button class="pill" type="submit">Save</button></div>`;
    f.classList.add('on');
    f.querySelectorAll('.stagepick .chip').forEach(b => b.onclick = () => {
      f.querySelectorAll('.stagepick .chip').forEach(x => x.classList.toggle('on', x === b)); $('product').value = b.dataset.v; });
    f.onsubmit = async (ev) => { ev.preventDefault();
      if (!val('product')) { toast('Pick a stage first'); return; }
      const plants = pickedPlants(id); if (!plants) { toast('Pick which ones'); return; }
      try { const photo = await uploadPhoto($('photo'));
        await api('api/events', {method: 'POST', body: JSON.stringify({kind: 'tree', item: id, type: 'stage', date: val('date'), product: val('product'), note: val('note'), photo, plants})});
        closeSheet(); toast(`${S.trees.find(x => x.id === id).name}: ${val('product') || 'stage'} logged`); await load(); } catch (x) { toast('Failed: ' + x.message); } };
    return;
  }
  const second = prods ? '' : t === 'move' ? '' : t === 'harv' ? `<label>Amount<input id="qty" placeholder="first pick · 2 kg"></label>` : photoField();
  const pick = prods ? chipPick('product', prods.filter(p => p !== 'Other'), preferred, t === 'spray' ? 'Product' : 'What', 'Something else') : t === 'move' ? areaSelect('area', true) : '';
  f.innerHTML = `${whichOnes(id)}${pick}<div class="row">${dateField()}${second}</div>
    ${t !== 'note' && t !== 'move' && t !== 'harv' ? `<label>Also applied to other trees<div class="filters" id="also" style="margin-top:4px">${others}</div></label>` : ''}
    <label>Notes<textarea id="note" placeholder="${t === 'spray' ? 'Rate, weather, what you saw' : 'Optional'}"></textarea></label>
    ${prods ? photoField() : ''}
    <div class="auto">Attached: outside ${fmtT(S.sensors.out?.now)}, 7-night low ${fmtT(S.sensors.out?.lo7)}</div>
    <div class="actions"><button type="button" class="pill ghost" onclick="$('f').classList.remove('on')">Cancel</button><button class="pill soil" type="submit">Save</button></div>`;
  f.classList.add('on');
  f.onsubmit = async (ev) => {
    ev.preventDefault(); const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const plants = pickedPlants(id); if (!plants) { toast('Pick which ones'); btn.disabled = false; return; }
      const photo = await uploadPhoto($('photo'));
      const also = [...document.querySelectorAll('#also .chip.on')].map(b => b.dataset.id);
      await api('api/events', {method: 'POST', body: JSON.stringify({kind: 'tree', item: id, type: t, date: val('date'), product: val('product'), area: val('area'), qty: val('qty'), note: val('note'), photo, also, plants})});
      const tr = S.trees.find(x => x.id === id);
      closeSheet(); toast(`Saved · ${tr.name}${plants[0] ? ` (${plants.map(p => plantName(tr, p)).join(', ')})` : ''}${also.length ? ` +${also.length}` : ''}`); await load();
    } catch (e) { toast('Save failed: ' + e.message); btn.disabled = false; }
  };
}

/* ----- edit / delete an entry ----- */
function openEvent(id) {
  const e = S.events.find(x => x.id === id); if (!e) return;
  showSheet(`
    <div class="eyebrow">${TAG[e.type]} · ${esc(itemName(e))}</div><h2>${niceDate(e.date)} ${yearOf(e.date)}</h2>
    <div class="who">${e.who ? `logged by ${esc(e.who)}` : ''}${e.sensors ? ' · ' + Object.entries(e.sensors).filter(([k,v]) => v != null).map(([k,v]) => `${k} ${Number(v).toFixed(1)}°`).join(' · ') : ''}</div>
    ${e.photo ? `<img class="photo" src="photos/${esc(e.photo)}" alt="">` : ''}
    <form class="add on" id="f" style="margin-top:10px">
      <div class="row"><label>Date<input id="date" type="date" value="${e.date}"></label>
      ${e.kind === 'veg' && ['sow','out'].includes(e.type) ? areaSelect('area', true) : `<label>${e.type === 'spray' || e.type === 'feed' || e.type === 'issue' ? 'What' : 'Amount'}<input id="${e.type === 'spray' || e.type === 'feed' || e.type === 'issue' ? 'product' : 'qty'}" value="${esc(e.type === 'spray' || e.type === 'feed' || e.type === 'issue' ? e.product : e.qty)}"></label>`}</div>
      ${e.type === 'sow' ? `<div class="row"><label>Variety<input id="variety" value="${esc(e.variety)}"></label><label>How many<input id="qty" value="${esc(e.qty)}"></label></div>` : ''}
      ${e.type === 'review' ? `<label>Rating<div class="rate" id="rate">${[1,2,3,4,5].map(n => `<button type="button" class="${n <= (e.rating||0) ? 'on' : ''}" onclick="rate(${n})">★</button>`).join('')}</div></label>` : ''}
      <label>Notes<textarea id="note">${esc(e.note)}</textarea></label>
      <div class="actions"><button type="button" class="pill danger" id="del">Delete</button><span style="flex:1"></span><button type="button" class="pill ghost" onclick="closeSheet()">Cancel</button><button class="pill" type="submit">Save</button></div>
    </form>`);
  if (e.area) setArea('area', e.area);
  rating = e.rating || 0;
  const f = $('f');
  f.onsubmit = async (ev) => { ev.preventDefault();
    const body = {date: val('date'), note: val('note'), area: val('area'), variety: val('variety'), qty: val('qty'), product: val('product')};
    if (e.type === 'review') body.rating = rating || null;
    try { await api(`api/events/${id}`, {method: 'PUT', body: JSON.stringify(body)}); closeSheet(); toast('Updated'); await load(); } catch (x) { toast('Failed: ' + x.message); } };
  let armed = false;
  $('del').onclick = async () => { if (!armed) { armed = true; $('del').textContent = 'Really delete?'; return; }
    try { await api(`api/events/${id}`, {method: 'DELETE'}); closeSheet(); toast('Deleted'); await load(); } catch (x) { toast('Failed: ' + x.message); } };
}

/* ----- plant windows / add plant ----- */
function monthSel(id, v) { return `<select id="${id}">${MONTHS.map((m, i) => `<option value="${i}" ${i===v?'selected':''}>${m}</option>`).join('')}</select>`; }
function windowFields(key, label, w) {
  const a = w && w.length ? Math.floor(w[0]) : 0, b = w && w.length ? Math.max(a, Math.ceil(w[1]) - 1) : 0;
  return `<label>${label} <span class="muted">(first month to last month)</span><div class="monthsel">${monthSel(key+'a', a)}<span>to</span>${monthSel(key+'b', b)}</div></label>`;
}
function readWindow(key, enabled) { if (!enabled) return []; const a = +$(key+'a').value, b = +$(key+'b').value; return b >= a ? [a, b+1] : [a, 12, 0, b+1]; }
function groupSelect(g) {
  const opts = {annual: 'Annual vege', perennial: 'Perennial', herb: 'Herb', berry: 'Berry'};
  return `<label>Type<select id="group">${Object.entries(opts).map(([k, l]) => `<option value="${k}" ${k === (g || 'annual') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
}
function editPlant(id, kind) {
  kind = kind || 'veg';
  const v = plantList(kind).find(x => x.id === id);
  showSheet(`<div class="eyebrow">Edit</div><h2>${esc(v.name)}</h2>
    <form class="add on" id="f">
      <label>Name<input id="name" value="${esc(v.name)}"></label>
      <label>How it starts<select id="where"><option value="inside" ${v.where==='inside'?'selected':''}>Start inside, plant out</option><option value="either" ${v.where==='either'?'selected':''}>Inside or direct</option><option value="direct" ${v.where==='direct'?'selected':''}>Sow direct</option></select></label>
      ${windowFields('sow', 'Sow', v.sow)}${windowFields('out', 'Plant out', v.out || [])}${windowFields('harv', kind === 'flower' ? 'In flower' : 'Harvest', v.harv)}
      <div class="row"><label>Coldest night it tolerates (°C)<input id="night" type="number" value="${v.night}"></label><label>Soil temperature to germinate (°C)<input id="soil" type="number" value="${v.soil}"></label></div>
      <label>Usual bed<input id="area" value="${esc(v.area || '')}" placeholder="Big"></label>
      ${kind === 'veg' ? groupSelect(v.group) : ''}
      <label>Tip<textarea id="tip">${esc(v.tip)}</textarea></label>
      ${kind === 'flower' ? `<label>Colour<input id="colour" type="color" value="${v.colour || '#d94f7a'}"></label>` : ''}
      <div class="actions"><button type="button" class="pill ghost" onclick="openPlant('${id}',null,'${kind}')">Cancel</button><button class="pill" type="submit">Save</button></div>
    </form>`);
  $('f').onsubmit = async (ev) => { ev.preventDefault(); const where = $('where').value;
    const body = {name: val('name'), where, sow: readWindow('sow', true), out: readWindow('out', where !== 'direct'), harv: readWindow('harv', true), night: +$('night').value, soil: +$('soil').value, tip: val('tip') || '', area: val('area')};
    if (kind === 'flower') body.colour = val('colour');
    if (kind === 'veg') body.group = val('group');
    try { await api(`api/plants/${kind}/${id}`, {method: 'PUT', body: JSON.stringify(body)}); closeSheet(); toast('Saved'); await load(); } catch (x) { toast('Failed: ' + x.message); } };
}
async function setEstablished(id, kind, on) {
  try { await api(`api/plants/${kind || 'veg'}/${id}`, {method: 'PUT', body: JSON.stringify({established: on})}); closeSheet(); toast(on ? 'Marked as already growing' : 'No longer marked as growing'); await load(); } catch (x) { toast('Failed: ' + x.message); }
}
async function hidePlant(id, kind) {
  try { await api(`api/plants/${kind || 'veg'}/${id}`, {method: 'PUT', body: JSON.stringify({hidden: true})}); closeSheet(); toast('Hidden. Add it back with "Add a plant" using the same name.'); await load(); } catch (x) { toast('Failed: ' + x.message); }
}
function openAddPlant(kind) {
  kind = kind || 'veg';
  showSheet(`<div class="eyebrow">New</div><h2>Add a ${kind === 'flower' ? 'flower' : 'plant'}</h2>
    <form class="add on" id="f">
      <label>Name<input id="name" placeholder="${kind === 'flower' ? 'Sweet William' : 'Okra'}"></label>
      ${kind === 'flower' ? `<label>Colour<input id="colour" type="color" value="#d94f7a"></label>` : groupSelect('annual')}
      <label>How it starts<select id="where"><option value="inside">Start inside, plant out</option><option value="either">Inside or direct</option><option value="direct">Sow direct</option></select></label>
      ${windowFields('sow', 'Sow', [2, 4])}${windowFields('out', 'Plant out', [4, 6])}${windowFields('harv', 'Harvest', [6, 10])}
      <div class="row"><label>Coldest night it tolerates (°C)<input id="night" type="number" value="8"></label><label>Soil temperature to germinate (°C)<input id="soil" type="number" value="18"></label></div>
      <label>Tip<textarea id="tip"></textarea></label>
      <div class="actions"><button type="button" class="pill ghost" onclick="closeSheet()">Cancel</button><button class="pill" type="submit">Add</button></div>
    </form>`);
  $('f').onsubmit = async (ev) => { ev.preventDefault(); const where = $('where').value; const name = val('name'); if (!name) return;
    const body = {kind, name, where, colour: val('colour'), group: val('group') || undefined, sow: readWindow('sow', true), out: readWindow('out', where !== 'direct'), harv: readWindow('harv', true), night: +$('night').value, soil: +$('soil').value, tip: val('tip') || '', hidden: false};
    try { await api('api/plants', {method: 'POST', body: JSON.stringify(body)}); closeSheet(); toast(`Added ${name}`); await load(); } catch (x) { toast('Failed: ' + x.message); } };
}

function openBedNote() {
  const beds = S.areas.concat(["Bradie's flower bed", 'Greenhouse', 'Whole garden']);
  showSheet(`<div class="eyebrow">Diary</div><h2>Note about a bed</h2>
    <form class="add on" id="f">
      ${chipPick('area', beds, null, 'Which bed', 'Somewhere else')}
      ${chipPick('product', ['Forked / aerated', 'Compost added', 'Top soil added', 'Manure added', 'Fertiliser added', 'Mulched', 'Limed', 'Weeded', 'Cleared', 'Watered deeply'], null, 'What happened', 'Something else')}
      <div class="row">${dateField()}</div>
      <label>Notes<textarea id="note" placeholder="Optional"></textarea></label>
      ${photoField()}
      <div class="actions"><button type="button" class="pill ghost" onclick="closeSheet()">Cancel</button><button class="pill" type="submit">Save</button></div>
    </form>`);
  $('f').onsubmit = async (ev) => { ev.preventDefault();
    try { const photo = await uploadPhoto($('photo'));
      await api('api/events', {method: 'POST', body: JSON.stringify({kind: 'bed', item: val('area'), type: 'note', date: val('date'), product: val('product'), area: val('area'), note: val('note'), photo})});
      closeSheet(); toast('Saved'); await load(); } catch (x) { toast('Failed: ' + x.message); } };
}

/* ---------- quick log (+ button): what you did → which plant → the plant's own form ---------- */
const QUICK = {
  today: [['photo','Photo','📷'],['sow','Sowed','🌱'],['out','Planted out','🪴'],['harv','Harvest','🧺'],['spray','Sprayed','🧴'],['prune','Pruned','✂️'],['feed','Fed','💧'],['bed','Bed work','🪏'],['todo','To do','📝']],
  plan: [['photo','Photo','📷'],['sow','Sowed','🌱'],['out','Planted out','🪴'],['move','Moved','🚚'],['harv','Harvest','🧺'],['feed','Fed','💧'],['issue','Problem','⚠️'],['note','Note / photo','📷'],['todo','To do','📝']],
  flowers: [['photo','Photo','📷'],['sow','Sowed','🌱'],['out','Planted out','🪴'],['harv','In flower / cut','🌸'],['feed','Fed','💧'],['issue','Problem','⚠️'],['note','Note / photo','📷'],['todo','To do','📝']],
  trees: [['photo','Photo','📷'],['spray','Sprayed','🧴'],['prune','Pruned','✂️'],['feed','Fed','💧'],['stage','Stage','🌸'],['move','Moved','🚚'],['harv','Harvest','🧺'],['note','Note / photo','📷'],['todo','To do','📝']],
  diary: [['photo','Photo','📷'],['sow','Sowed','🌱'],['out','Planted out','🪴'],['harv','Harvest','🧺'],['spray','Sprayed','🧴'],['prune','Pruned','✂️'],['feed','Fed','💧'],['bed','Bed work','🪏'],['todo','To do','📝']],
};
const TREE_ACTIONS = ['spray','prune','stage','died'];
function currentScreen() { return (document.querySelector('section.screen.on') || {id: 's-today'}).id.slice(2); }
function quickStart() {
  const scr = currentScreen();
  showSheet(`<div class="eyebrow">Quick log</div><h2>What did you do?</h2>
    <div class="quick">${QUICK[scr].map(([t, l, i]) => `<button onclick="quickAction('${t}')"><span>${i}</span>${l}</button>`).join('')}</div>`);
}
// Where each plant is right now: its latest sow / plant-out / move entry with a place.
function lastPlace(kind, id) {
  const e = S.events.find(e => e.kind === kind && e.item === id && ['sow', 'out', 'move'].includes(e.type) && e.area);
  return e ? e.area : null;
}
const isSheltered = a => a && /office|heat pad|greenhouse|inside|tray/i.test(a);
function quickCandidates(action) {
  const scr = currentScreen(), m = S.season_month;
  const veg = S.veg.map(v => ({kind: 'veg', id: v.id, name: v.name, p: v})), fl = S.flowers.map(v => ({kind: 'flower', id: v.id, name: v.name, p: v})),
        tr = S.trees.filter(t => !isDead(t)).map(t => ({kind: 'tree', id: t.id, name: t.name, p: t}));
  let pool = scr === 'plan' ? veg : scr === 'flowers' ? fl : scr === 'trees' ? tr
    : TREE_ACTIONS.includes(action) ? tr.concat(veg.filter(v => v.p.tasks)) : ['sow', 'out', 'move'].includes(action) ? veg.concat(fl) : veg.concat(fl, tr);
  if (action === 'prune' && scr === 'plan') pool = veg.filter(v => v.p.tasks);
  const taskFor = (x, act) => S.tasks.find(t => t.kind === x.kind && t.item === x.id && t.action === act);
  const growing = x => x.kind === 'tree' || growingNow(x.kind, x.id);
  let suggested = [], why = '';
  if (action === 'sow') { suggested = pool.filter(x => x.kind !== 'tree' && !x.p.established && inWin(m, x.p.sow || [])); why = 'Can be sown now'; }
  else if (action === 'out') { suggested = pool.filter(x => growing(x) && isSheltered(lastPlace(x.kind, x.id))); why = 'Started inside, not planted out yet'; }
  else if (action === 'move') {
    suggested = pool.filter(x => x.kind === 'tree' ? (x.p.shelter || isSheltered(lastPlace('tree', x.id))) : growing(x) && isSheltered(lastPlace(x.kind, x.id)));
    why = 'Inside or in the greenhouse now';
  }
  else if (['prune', 'spray', 'feed'].includes(action)) { suggested = pool.filter(x => taskFor(x, action)); why = `Due a ${action === 'spray' ? 'spray' : action === 'feed' ? 'feed' : 'prune'} now`; }
  else if (action === 'harv') { suggested = pool.filter(x => growing(x) && inWin(m, x.p.harv || [])); why = 'Growing and in harvest season'; }
  else if (action === 'stage') { suggested = pool; why = ''; }
  else { suggested = pool.filter(growing); why = 'Growing now'; }
  const sKeys = new Set(suggested.map(x => x.kind + x.id));
  const rest = pool.filter(x => !sKeys.has(x.kind + x.id)).sort((a, b) => a.name.localeCompare(b.name));
  suggested.sort((a, b) => a.name.localeCompare(b.name));
  return {suggested, rest, why};
}
let pendingPhoto = null;
function quickAction(action) {
  if (action === 'photo') return quickPhoto();
  if (action === 'bed') return openBedNote();
  if (action === 'todo') return quickTodo();
  const {suggested, rest, why} = quickCandidates(action);
  const label = Object.values(QUICK).flat().find(q => q[0] === action)[1];
  const chip = x => `<button class="chip big ${x.kind}" data-n="${esc(x.name.toLowerCase())}" onclick="quickGo('${x.kind}','${x.id}','${action}')">${esc(x.name)}${x.kind !== 'tree' && lastPlace(x.kind, x.id) && ['out', 'move'].includes(action) ? `<small>${esc(lastPlace(x.kind, x.id))}</small>` : ''}</button>`;
  showSheet(`<div class="eyebrow">${esc(label)}</div><h2>Which plant?</h2>
    <input id="q" class="search" type="search" placeholder="Search all plants…" oninput="quickFilter(this.value)">
    <div id="qp">
      ${suggested.length && why ? `<h3 class="qh">${esc(why)}</h3><div class="filters">${suggested.map(chip).join('')}</div>` : ''}
      ${suggested.length && !why ? `<div class="filters">${suggested.map(chip).join('')}</div>` : ''}
      ${rest.length ? `<h3 class="qh more" onclick="this.nextElementSibling.classList.toggle('collapsed')">${suggested.length ? `Everything else (${rest.length}) ▾` : ''}</h3><div class="filters ${suggested.length && why ? 'collapsed' : ''}">${rest.map(chip).join('')}</div>` : ''}
    </div>`);
  if (action === 'sow' && !TOUCH) setTimeout(() => $('q') && $('q').focus(), 80);
}
function quickFilter(v) {
  v = v.toLowerCase();
  document.querySelectorAll('#qp .filters').forEach(f => f.classList.toggle('collapsed', false));
  document.querySelectorAll('#qp .chip').forEach(c => c.hidden = v && !c.dataset.n.includes(v));
  document.querySelectorAll('#qp .qh').forEach(h => h.hidden = !!v);
}
function quickGo(kind, id, action) {
  if (kind === 'tree') { selPlant = null; openTree(id, action, action === 'spray' ? 'copper' : ''); }
  else { const a = action === 'prune' ? 'prune' : action; openPlant(id, a, kind); }
  setTimeout(() => { const f = $('f'); if (f) f.scrollIntoView({block: 'start', behavior: 'smooth'}); }, 120);
}
/* Photo first, then which plant. Saves straight away as a Note with the picture. */
function quickPhoto() {
  showSheet(`<div class="eyebrow">Photo</div><h2>Take a photo</h2>
    <label class="bigcam"><input type="file" accept="image/*" capture="environment" onchange="photoChosen(this)"><span>📷</span>Open camera</label>
    <label class="bigcam alt"><input type="file" accept="image/*" onchange="photoChosen(this)"><span>🖼️</span>Choose from gallery</label>`);
}
function photoChosen(input) {
  if (!input.files || !input.files[0]) return;
  pendingPhoto = input.files[0];
  const url = URL.createObjectURL(pendingPhoto);
  const scr = currentScreen();
  const all = (scr === 'trees' ? [] : S.veg.map(v => ({kind: 'veg', id: v.id, name: v.name})).concat(S.flowers.map(v => ({kind: 'flower', id: v.id, name: v.name}))))
    .concat(scr === 'plan' || scr === 'flowers' ? [] : S.trees.filter(t => !isDead(t)).map(t => ({kind: 'tree', id: t.id, name: t.name})));
  const grow = all.filter(x => x.kind === 'tree' || growingNow(x.kind, x.id)), rest = all.filter(x => !grow.includes(x));
  const chip = x => `<button class="chip big ${x.kind}" data-n="${esc(x.name.toLowerCase())}" onclick="savePhoto('${x.kind}','${x.id}')">${esc(x.name)}</button>`;
  showSheet(`<div class="eyebrow">Photo</div><h2>What is it?</h2>
    <img class="photo" src="${url}" alt="" style="max-height:160px;width:100%;object-fit:cover;margin-bottom:8px">
    <input id="pnote" placeholder="Caption (optional)" style="margin-bottom:8px">
    <input id="q" class="search" type="search" placeholder="Search plants…" oninput="quickFilter(this.value)">
    <div id="qp">
      <div class="filters" style="margin-top:8px"><button class="chip big" data-n="garden bed whole" onclick="savePhoto('bed','Garden')">🪴 Just the garden / a bed</button></div>
      ${grow.length ? `<h3 class="qh">Growing now</h3><div class="filters">${grow.sort((a, b) => a.name.localeCompare(b.name)).map(chip).join('')}</div>` : ''}
      ${rest.length ? `<h3 class="qh more" onclick="this.nextElementSibling.classList.toggle('collapsed')">Everything else (${rest.length}) ▾</h3><div class="filters collapsed">${rest.sort((a, b) => a.name.localeCompare(b.name)).map(chip).join('')}</div>` : ''}
    </div>`);
}
async function savePhoto(kind, id) {
  if (!pendingPhoto) return;
  toast('Saving photo…');
  try {
    const blob = await shrink(pendingPhoto);
    const r = await fetch('api/photos', {method: 'POST', headers: {'Content-Type': 'image/jpeg'}, body: blob});
    if (!r.ok) throw new Error('upload failed');
    const {photo} = await r.json();
    await api('api/events', {method: 'POST', body: JSON.stringify({kind, item: id, type: 'note', date: todayISO(), photo, note: val('pnote'), area: kind === 'bed' ? id : null})});
    pendingPhoto = null; closeSheet(); toast('Photo saved'); await load();
  } catch (x) { toast('Failed: ' + x.message); }
}
function quickTodo() {
  const all = S.veg.map(v => ['veg', v.id, v.name]).concat(S.flowers.map(v => ['flower', v.id, v.name]), S.trees.map(t => ['tree', t.id, t.name]));
  showSheet(`<div class="eyebrow">To do</div><h2>Add a reminder</h2>
    <form class="add on" id="f">
      <label>What<input id="what" placeholder="Net the strawberries" required></label>
      <div class="row"><label>When<input id="date" type="date" value="${todayISO()}"></label>
</div>
      <label>For a plant (optional)</label><input id="forq" placeholder="Search plants…" oninput="document.querySelectorAll('#forpick .chip').forEach(c => c.hidden = !this.value || !c.dataset.n.includes(this.value.toLowerCase()))"><div class="areapick" id="forpick" data-for="for">${all.map(([k, i, n]) => `<button type="button" class="chip" hidden data-n="${esc(n.toLowerCase())}" data-v="${k}:${i}" onclick="pickArea(this)">${esc(n)}</button>`).join('')}</div><input type="hidden" id="for">
      <label>Notes<textarea id="note" placeholder="Optional"></textarea></label>
      <div class="actions"><button type="button" class="pill ghost" onclick="closeSheet()">Cancel</button><button class="pill" type="submit">Add</button></div>
    </form>`);
  if (!TOUCH) setTimeout(() => $('what').focus(), 80);
  $('f').onsubmit = async (ev) => { ev.preventDefault();
    const [k, i] = (val('for') || 'bed:Garden').split(':');
    try { await api('api/events', {method: 'POST', body: JSON.stringify({kind: k, item: i, type: 'todo', date: val('date'), product: val('what'), note: val('note')})});
      closeSheet(); toast('Added to Today'); await load(); } catch (x) { toast('Failed: ' + x.message); } };
}

/* bar hover tips removed: they stuck on phones. The tip text stays on the bars as data-tip for a native browser title on desktop. */
document.querySelectorAll('[data-tip]').forEach(b => { b.title = b.dataset.tip; });
/* ---------- nav & filters ---------- */
const TITLES = {today: 'Today', plan: 'Vegetables', trees: 'Trees & perennials', flowers: 'Flowers', diary: 'Diary'};
function go(s) {
  document.querySelectorAll('section.screen').forEach(x => x.classList.toggle('on', x.id === 's-' + s));
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
  $('screenTitle').textContent = TITLES[s]; document.body.dataset.screen = s; window.scrollTo(0, 0);
  try { localStorage.setItem('garden.tab', s); } catch (e) {}
}
document.querySelectorAll('nav.tabs button').forEach(b => b.addEventListener('click', () => go(b.dataset.s)));
function wireChips(containerId, setter) {
  document.querySelectorAll(`#${containerId} .chip`).forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll(`#${containerId} .chip`).forEach(x => x.classList.remove('on')); c.classList.add('on'); setter(c.dataset.f); }));
}
wireChips('vegFilters', f => { vegFilter = f; renderVeg(); });
wireChips('vegGroups', f => { vegGroup = f; renderVeg(); });
wireChips('treeFilters', f => { treeFilter = f; renderTrees(); });
wireChips('flowerFilters', f => { flowerFilter = f; renderFlowers(); });
wireChips('diaryFilters', f => { diaryFilter = f; renderDiary(); });
try { const t = localStorage.getItem('garden.tab'); if (t && TITLES[t]) go(t); } catch (e) {}
load();
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
