/* Republik Hutan Rimba — dunia yang bisa dimainkan */
(function () {
  'use strict';
  const R = window.RIMBA, M = R.members, S = R.species, D = R.districts;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  const imgs = {};
  function img(key) {
    if (!imgs[key]) { const i = new Image(); i.decoding = 'async'; i.src = '../img/' + key + '.webp'; imgs[key] = i; }
    return imgs[key];
  }

  // =====================================================================
  // Patroli Api — mini game dipakai di portal dan di Pos Pemadam
  // =====================================================================
  function createPatroli(cv, cb) {
    const g = cv.getContext('2d'), GW = 420, GH = 560;
    const DPR = Math.min(2, window.devicePixelRatio || 1); cv.width = GW * DPR; cv.height = GH * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    let embers = [], splashes = [], trees = [], score = 0, lives = 3, running = false, last = 0, spawnT = 0, elapsed = 0, alive = true;
    function resetTrees() { trees = Array.from({ length: 7 }, (_, i) => ({ x: 30 + i * 60, burn: 0 })); }
    resetTrees();
    function drawTree(t) {
      const y = GH - 18;
      g.fillStyle = t.burn ? '#3a2a20' : '#6b4424'; g.fillRect(t.x - 5, y - 40, 10, 40);
      if (t.burn) { g.fillStyle = '#2b2b2b'; g.beginPath(); g.arc(t.x, y - 52, 16, 0, 7); g.fill(); if (t.burn < 1) { g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(t.x, y - 64 + Math.sin(elapsed * 20) * 2, 9 * (1 - t.burn) + 4, 0, 7); g.fill(); } }
      else { g.fillStyle = '#2f9a55'; [[0, -62, 22], [-14, -48, 16], [14, -48, 16]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(t.x + dx, y + dy, r, 0, 7); g.fill(); }); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(t.x - 6, y - 70, 8, 0, 7); g.fill(); }
    }
    function end() {
      running = false; embers = [];
      cb.onEnd && cb.onEnd(score);
    }
    let idle = 0;
    function frame(ts) {
      if (!alive) return;
      const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
      if (!running && !splashes.length) { if (idle > 2 || !cv.isConnected || !cv.offsetParent) { idle = Math.max(idle, 3); requestAnimationFrame(frame); return; } idle++; } else idle = 0;
      if (running) {
        elapsed += dt; spawnT -= dt;
        const speed = 60 + elapsed * 3.2, rate = Math.max(.32, 1.1 - elapsed * .012);
        if (spawnT <= 0) { spawnT = rate * (.7 + Math.random() * .6); const big = elapsed > 12 && Math.random() < .25; embers.push({ x: 24 + Math.random() * (GW - 48), y: -16, vx: (Math.random() - .5) * 30, r: big ? 17 : 12, hp: big ? 2 : 1, sp: speed * (big ? .8 : 1) * (.85 + Math.random() * .3), ph: Math.random() * 6 }); }
        embers.forEach(e => { e.y += e.sp * dt; e.x += e.vx * dt + Math.sin(elapsed * 3 + e.ph) * 18 * dt; e.x = Math.max(e.r, Math.min(GW - e.r, e.x)); });
        embers = embers.filter(e => {
          if (e.y < GH - 70) return true;
          const tgt = trees.filter(t => !t.burn).sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0];
          if (tgt) { tgt.burn = .01; lives--; cb.onLives && cb.onLives(lives); try { navigator.vibrate && navigator.vibrate(60); } catch (_) {} }
          if (lives <= 0 && running) end();
          return false;
        });
        if (!running) embers = [];
        trees.forEach(t => { if (t.burn && t.burn < 1) t.burn = Math.min(1, t.burn + dt * .6); });
      }
      splashes.forEach(s => s.t += dt); splashes = splashes.filter(s => s.t < .45);
      const sky = g.createLinearGradient(0, 0, 0, GH); sky.addColorStop(0, '#2a1a12'); sky.addColorStop(1, '#12301f'); g.fillStyle = sky; g.fillRect(0, 0, GW, GH);
      g.fillStyle = '#7a5a2a'; g.fillRect(0, GH - 18, GW, 18);
      trees.forEach(drawTree);
      embers.forEach(e => {
        const fl = 1 + Math.sin(elapsed * 18 + e.ph) * .12;
        g.fillStyle = 'rgba(255,120,30,.25)'; g.beginPath(); g.arc(e.x, e.y, e.r * 1.9 * fl, 0, 7); g.fill();
        g.fillStyle = e.hp > 1 ? '#ff4d1a' : '#ff8a1a'; g.beginPath(); g.arc(e.x, e.y, e.r * fl, 0, 7); g.fill();
        g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(e.x - e.r * .25, e.y - e.r * .25, e.r * .42, 0, 7); g.fill();
      });
      splashes.forEach(s => {
        const p = s.t / .45; g.strokeStyle = 'rgba(140,210,255,' + (1 - p) + ')'; g.lineWidth = 4; g.beginPath(); g.arc(s.x, s.y, 10 + p * 34, 0, 7); g.stroke();
        g.fillStyle = 'rgba(140,210,255,' + (1 - p) + ')'; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; g.beginPath(); g.arc(s.x + Math.cos(a) * (8 + p * 30), s.y + Math.sin(a) * (8 + p * 30) + p * 14, 3, 0, 7); g.fill(); }
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    cv.addEventListener('pointerdown', e => {
      if (!running) return;
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * GW, y = (e.clientY - r.top) / r.height * GH;
      let hit = null, bd = 1e9;
      embers.forEach(em => { const d = Math.hypot(em.x - x, em.y - y); if (d < em.r + 26 && d < bd) { bd = d; hit = em; } });
      if (hit) { hit.hp--; splashes.push({ x: hit.x, y: hit.y, t: 0 }); if (hit.hp <= 0) { embers.splice(embers.indexOf(hit), 1); score++; cb.onScore && cb.onScore(score); } else hit.r = 12; }
    });
    return {
      start() { embers = []; splashes = []; score = 0; lives = 3; elapsed = 0; spawnT = .4; resetTrees(); running = true; cb.onScore && cb.onScore(0); cb.onLives && cb.onLives(3); },
      stop() { running = false; embers = []; },
      get running() { return running; }
    };
  }

  // =====================================================================
  // DUNIA
  // =====================================================================
  const W = 3000, H = 3000, WATER = 2650;
  const ZBOX = {
    kampung: [80, 160, 860, 2360], sabana: [2150, 160, 2920, 2360], kanopi: [960, 120, 2040, 1150],
    lantai: [960, 1980, 2040, 2370], sungai: [140, 2470, 2860, 2610], plaza: [1150, 1320, 1850, 1760]
  };
  function zoneAt(x, y) {
    if (y > WATER) return 'air';
    if (y > 2420) return 'sungai';
    if (x < 900) return 'kampung';
    if (x > 2100) return 'sabana';
    if (y < 1200) return 'kanopi';
    if (y > 1930) return 'lantai';
    return 'plaza';
  }
  const ZNAME = { kampung: 'Distrik Kampung', sabana: 'Distrik Sabana', kanopi: 'Distrik Kanopi', lantai: 'Distrik Lantai Hutan', sungai: 'Distrik Tepi Sungai', plaza: 'Alun-alun Rumah Pohon', air: 'Sungai Besar' };
  const NEST = { x: 1665, y: 1845 };
  // tata ruang alun-alun (px dunia)
  const TH = { x: 1500, y: 1330, s: 1.7 };            // Rumah Pohon Kepala Rimba
  const SQ = { x0: 1320, y0: 1470, x1: 1680, y1: 1705, cx: 1500, cy: 1590 }; // lapangan alun-alun
  const FLAG = { x: 1500, y: 1590 };

  // jalan setapak: dari lapangan ke tiap pintu bangunan
  function doorPaths() {
    const L = [];
    SPOTS.forEach(b => { if (b.id === 'kepala') return; const dx = b.x, dy = b.y + frontOf(b) - 6, tx = Math.max(SQ.x0, Math.min(SQ.x1, dx)), ty = Math.max(SQ.y0, Math.min(SQ.y1, dy)); L.push([dx, dy, tx, ty]); });
    return L;
  }
  function pathBusy(x, y) {
    return doorPaths().some(([x0, y0, x1, y1]) => { const vx = x1 - x0, vy = y1 - y0, l2 = vx * vx + vy * vy || 1, k = Math.max(0, Math.min(1, ((x - x0) * vx + (y - y0) * vy) / l2)); return Math.hypot(x - (x0 + vx * k), y - (y0 + vy * k)) < 30; });
  }
  // ---------- dekorasi ----------
  let DECO = [];
  function buildDeco() {
    const rnd = rng(42), out = [];
    const nearRoad = (x, y) => (Math.abs(x - 1500) < 70 && (y < 1260 || y > 1700)) || (Math.abs(y - 1575) < 75 && (x < 1330 || x > 1670));
    const inPlaza = (x, y) => ((x - 1500) / 480) ** 2 + ((y - 1570) / 400) ** 2 < 1;
    function scatter(n, box, kinds, minD) {
      for (let i = 0; i < n; i++) {
        const x = box[0] + rnd() * (box[2] - box[0]), y = box[1] + rnd() * (box[3] - box[1]);
        if (nearRoad(x, y) || inPlaza(x, y)) continue;
        if (minD && out.some(o => Math.abs(o.x - x) < minD && Math.abs(o.y - y) < minD * .6)) continue;
        out.push({ x, y, k: kinds[Math.floor(rnd() * kinds.length)] });
      }
    }
    scatter(900, [940, 40, 2060, 1170], ['big', 'big', 'g', 'p', 'l'], 46);
    scatter(700, [940, 1960, 2060, 2400], ['g', 'gs', 'l', 'bush', 'mush', 'mush', 'ps'], 30);
    scatter(260, [2160, 60, 2980, 2380], ['aca', 'aca', 'bushl', 'rock', 'bushl'], 62);
    scatter(420, [20, 60, 860, 2380], ['g', 'p', 'l', 'bush', 'ps', 'gs'], 50);
    scatter(320, [40, 2445, 2960, 2630], ['reed', 'reed', 'rock', 'reed'], 26);
    // taman di alun-alun: bunga & semak, rapi di luar lapangan, jalan, dan bangunan
    const busy = (x, y) => (x > SQ.x0 - 25 && x < SQ.x1 + 25 && y > SQ.y0 - 25 && y < SQ.y1 + 25) || nearRoad(x, y) ||
      Math.hypot(x - TH.x, y - TH.y) < 150 || Math.hypot(x - NEST.x, y - NEST.y) < 70 || 
      SPOTS.some(b => { if (b.id === 'kepala') return false; const [hw, hd] = fpx(b); return Math.abs(x - b.x) < hw + 22 && y > b.y - hd - 22 && y < b.y + hd + 50; }) || pathBusy(x, y);
    for (let i = 0; i < 520; i++) {
      const a = rnd() * 6.28, rr = Math.sqrt(rnd()), x = 1500 + Math.cos(a) * rr * 450, y = 1570 + Math.sin(a) * rr * 370;
      if (busy(x, y)) continue;
      const k = rnd() < .66 ? 'flower' : rnd() < .5 ? 'bush' : 'bushl';
      if (k !== 'flower' && out.some(o => Math.abs(o.x - x) < 26 && Math.abs(o.y - y) < 18)) continue;
      out.push({ x, y, k });
    }
    // bangku di dua sisi lapangan, lampu di sudut & sepanjang jalan
    [[1380, 1445], [1620, 1445], [1400, 1735], [1600, 1735]].forEach(([x, y]) => out.push({ x, y, k: 'bench' }));
    [[SQ.x0, SQ.y0], [SQ.x1, SQ.y0], [SQ.x0, SQ.y1], [SQ.x1, SQ.y1], [1150, 1555], [1850, 1555], [1460, 1880], [1540, 1880], [1460, 1230], [1540, 1230]].forEach(([x, y]) => out.push({ x, y, k: 'lamp' }));
    // pagar pohon mengelilingi alun-alun
    for (let i = 0; i < 34; i++) { const a = i / 34 * 6.28; const x = 1500 + Math.cos(a) * 515, y = 1570 + Math.sin(a) * 420; if (!nearRoad(x, y) && !busy(x, y)) out.push({ x, y, k: i % 3 ? 'g' : 'p' }); }
    // rumah kampung
    const rh = rng(9);
    for (let i = 0; i < 20; i++) { const x = 130 + (i % 4) * 190 + rh() * 30, y = 330 + Math.floor(i / 4) * 400 + rh() * 50; if (Math.abs(y - 1540) < 90) continue; out.push({ x, y, k: 'house', roof: ['#e25b3c', '#3fae55', '#e25b3c', '#f2a040'][i % 4] }); }
    DECO = out;
  }

  const BSC = 1.35; // skala bangunan alun-alun
  const SPOTS = [
    { id: 'warta', x: 1230, y: 1325, label: 'Warta Rimba' },
    { id: 'balai', x: 1770, y: 1320, label: 'Balai Warga' },
    { id: 'pos', x: 1195, y: 1495, label: 'Pos Pemadam' },
    { id: 'bibit', x: 1200, y: 1715, label: 'Kantor Bibit' },
    { id: 'papan', x: 1800, y: 1515, label: 'Loket Pendaftaran' },
    { id: 'radio', x: 1335, y: 1850, label: 'Radio Rimba' },
    { id: 'kepala', x: 1500, y: 1462, label: 'Kepala Rimba' }
  ];
  const FP = { balai: [10.6, 7.9], papan: [5.4, 4.2], pos: [10, 4.4], bibit: [6.6, 4.4], salon: [5.9, 5.9], warta: [8.7, 4], radio: [7.4, 5.4] };
  const frontOf = b => b.id === 'kepala' ? 50 : ((FP[b.id] || [5, 4])[1] / U + 14);
  const fpx = b => (FP[b.id] || [5, 4]).map(v => v / U);
  const LEVELS = [['Sarang Ranting', 0], ['Pondok Daun', 30], ['Rumah Panggung', 100], ['Rumah Pohon Mini', 250]];
  // ---------- topi dari Salon Daun ----------
  const HATS = [
    { id: '', n: 'Tanpa topi', c: 0 }, { id: 'daun', n: 'Topi Daun', c: 20 }, { id: 'kacamata', n: 'Kacamata Bulat', c: 25 },
    { id: 'bunga', n: 'Mahkota Bunga', c: 35 }, { id: 'caping', n: 'Caping Petani', c: 45 }, { id: 'mahkota', n: 'Mahkota Emas', c: 120 }
  ];
  function drawHat(g, id, x, top, w) {
    const s = w / 60;
    g.save(); g.translate(x, top); g.scale(s, s);
    if (id === 'daun') { g.fillStyle = '#3fae55'; g.beginPath(); g.ellipse(0, 4, 26, 9, -.2, 0, 7); g.fill(); g.strokeStyle = '#1f7a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-22, 8); g.lineTo(22, 0); g.stroke(); g.strokeStyle = '#8a5530'; g.beginPath(); g.moveTo(10, 0); g.quadraticCurveTo(14, -10, 8, -14); g.stroke(); }
    if (id === 'bunga') { for (let i = 0; i < 7; i++) { const a = 3.4 + i / 6 * 2.6; g.fillStyle = ['#ff9ec8', '#ffd23f', '#fff'][i % 3]; g.beginPath(); g.arc(Math.cos(a) * 24, 14 + Math.sin(a) * 12, 7, 0, 7); g.fill(); g.fillStyle = '#e25b3c'; g.beginPath(); g.arc(Math.cos(a) * 24, 14 + Math.sin(a) * 12, 2.4, 0, 7); g.fill(); } }
    if (id === 'caping') { g.fillStyle = '#e8c070'; g.beginPath(); g.moveTo(-36, 12); g.lineTo(0, -16); g.lineTo(36, 12); g.closePath(); g.fill(); g.strokeStyle = '#b8873a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-24, 4); g.lineTo(24, 4); g.moveTo(-12, -4); g.lineTo(12, -4); g.stroke(); }
    if (id === 'mahkota') { g.fillStyle = '#ffcf33'; g.strokeStyle = '#b8860b'; g.lineWidth = 2; g.beginPath(); g.moveTo(-20, 12); g.lineTo(-20, -6); g.lineTo(-10, 4); g.lineTo(0, -12); g.lineTo(10, 4); g.lineTo(20, -6); g.lineTo(20, 12); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#e2483a'; g.beginPath(); g.arc(0, 4, 3.5, 0, 7); g.fill(); }
    if (id === 'kacamata') { g.translate(0, 34); g.strokeStyle = '#1b2a22'; g.lineWidth = 3; g.fillStyle = 'rgba(160,220,255,.35)'; [-12, 12].forEach(d => { g.beginPath(); g.arc(d, 0, 9, 0, 7); g.fill(); g.stroke(); }); g.beginPath(); g.moveTo(-3, 0); g.lineTo(3, 0); g.stroke(); }
    g.restore();
  }

  // ---------- simpan ----------
  const KEY = 'rimba-hutan-v1';
  let save = null;
  function load() { try { save = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { save = null; } }
  function persist() { if (save && save.guest) return; try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  // ---------- warga (NPC) ----------
  let NPC = [];
  function spotIn(box, r) { return { x: box[0] + r() * (box[2] - box[0]), y: box[1] + r() * (box[3] - box[1]) }; }
  function buildNPC() {
    NPC = M.map(m => {
      const sp = S[m.s] || {}, r = rng(hash(m.u));
      if (sp.d === 'telur') { const a = r() * 6.28, d = Math.sqrt(r()) * 34; return { m, x: NEST.x + Math.cos(a) * d, y: NEST.y + Math.sin(a) * d * .62, egg: true, ph: r() * 6 }; }
      const box = ZBOX[sp.d] || ZBOX.lantai, p = spotIn(box, r);
      return { m, x: p.x, y: p.y, tx: p.x, ty: p.y, wait: r() * 4, sp: 14 + r() * 16, box, ph: r() * 6, dir: 1, moving: false, r };
    });
  }

  // ---------- state ----------
  let open = false, vw = 0, vh = 0, dpr = 1, dprMax = 2, last = 0, t = 0;
  const P = { x: 1500, y: 1660, tx: null, ty: null, dir: 1, moving: false };
  const keys = {};
  let near = null, home = null, plantPos = [], selNPC = null, toastT = 0;

  function homeSpot() {
    const sp = S[save.s] || {}, r = rng(hash('home' + save.u));
    if (sp.d === 'telur') return { x: 1360, y: 1780 };
    const box = ZBOX[sp.d] || ZBOX.lantai;
    const b = [box[0] + 80, box[1] + 120, box[2] - 80, box[3] - 40];
    for (let i = 0; i < 30; i++) { const p = spotIn(b, r); if (Math.abs(p.x - 1500) > 110 && Math.abs(p.y - 1540) > 90) return p; }
    return spotIn(b, r);
  }
  function computePlants() {
    plantPos = [];
    for (let i = 0; i < Math.min(save.trees || 0, 30); i++) {
      const ring = Math.floor(i / 10), a = Math.PI * (1.02 + (i % 10) / 9 * .96) + ring * .12, d = 120 + ring * 55;
      const x = home.x + Math.cos(a) * d, y = Math.min(WATER - 30, home.y - 6 + Math.sin(a) * d * .6);
      plantPos.push({ x, y, k: i % 4 === 3 ? 'ps' : 'gs' });
    }
    if (renderer) buildPlants();
  }

  // =====================================================================
  // DUNIA 3D — gaya clay, sama dengan render peta & karakter
  // =====================================================================
  const U = 0.2; // 5 px dunia = 1 unit 3D (peta 2x lebih luas)
  // ---------- jam Republik (WIB) : pagi, siang, sore, malam ----------
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const FASE = [[5, 10, 'Pagi'], [10, 15, 'Siang'], [15, 18, 'Sore'], [18, 29, 'Malam']];
  function wib() { const d = new Date(Date.now() + 7 * 3600e3); return { h: d.getUTCHours() + d.getUTCMinutes() / 60, day: d.getUTCDay(), hh: d.getUTCHours(), mm: d.getUTCMinutes() }; }
  function faseOf(h) { const x = h < 5 ? h + 24 : h; return FASE.find(f => x >= f[0] && x < f[1])[2]; }
  // kunci warna per jam: langit, langit-hemi, tanah-hemi, kuat hemi, warna matahari/bulan, kuat matahari, arah matahari, lampu
  const SKYK = [
    [0, '#1c2848', '#6a82c8', '#14221a', .58, '#8aa4ff', .26, [-40, 80, 30], 1],
    [4.6, '#1c2848', '#6a82c8', '#14221a', .58, '#8aa4ff', .26, [-40, 80, 30], 1],
    [5.6, '#5a5f8f', '#c4b6d8', '#3a4a30', .44, '#ffb38a', .35, [-80, 22, 30], .8],
    [6.5, '#f5cfa8', '#ffdcbc', '#4f7a35', .48, '#ffbf86', .65, [-70, 40, 30], .2],
    [8.5, '#cdeec0', '#fff6e4', '#4f8f35', .52, '#fff1d6', .85, [-50, 75, 40], 0],
    [12, '#c7ecb0', '#fff3dc', '#4f8f35', .5, '#fff0d2', .95, [10, 95, 30], 0],
    [15, '#c7ecb0', '#fff3dc', '#4f8f35', .5, '#fff0d2', .9, [45, 80, 35], 0],
    [16.8, '#f6d9a2', '#ffd6a0', '#5a7a35', .46, '#ff9e4a', 1.0, [70, 45, 30], .1],
    [17.9, '#ee9f7e', '#e8a08a', '#3a5a35', .46, '#ff7a4c', .7, [82, 24, 30], .6],
    [18.8, '#4b3f6e', '#8f84c8', '#1e2e22', .52, '#b09aff', .28, [-40, 80, 30], .95],
    [19.6, '#1c2848', '#6a82c8', '#14221a', .58, '#8aa4ff', .26, [-40, 80, 30], 1],
    [24, '#1c2848', '#6a82c8', '#14221a', .58, '#8aa4ff', .26, [-40, 80, 30], 1]
  ];
  const LT = { h: -1, sunOff: [45, 80, 35], lamp: 0 };
  let hemiL = null, preview = null, shownH = null;
  function lightAt(h) {
    let i = 0; while (i < SKYK.length - 2 && SKYK[i + 1][0] <= h) i++;
    const a = SKYK[i], b = SKYK[i + 1], k = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0] || 1)));
    const col = j => C(a[j]).lerp(C(b[j]), k), num = j => a[j] + (b[j] - a[j]) * k;
    return { sky: col(1), hs: col(2), hg: col(3), hi: num(4), sc: col(5), si: num(6), off: a[7].map((v, n) => v + (b[7][n] - v) * k), lamp: num(8) };
  }
  function applyTime(dt) {
    const real = wib(), target = preview != null ? preview : real.h;
    if (shownH == null) shownH = target;
    let diff = ((target - shownH + 36) % 24) - 12; // jalan memutar terpendek
    shownH = Math.abs(diff) < .02 ? target : (shownH + diff * Math.min(1, dt * 2.5) + 24) % 24;
    const L = lightAt(shownH);
    scene.background.copy(L.sky); scene.fog.color.copy(L.sky);
    hemiL.color.copy(L.hs); hemiL.groundColor.copy(L.hg); hemiL.intensity = L.hi;
    sun.color.copy(L.sc); sun.intensity = L.si;
    const changed = Math.abs(L.off[0] - LT.sunOff[0]) + Math.abs(L.off[1] - LT.sunOff[1]) > 1.5;
    if (changed) { LT.sunOff = L.off; shadowKey = ''; }
    LT.lamp = L.lamp;
    lampMat.emissiveIntensity = .15 + L.lamp * 1.6; lampHalo.forEach(s => { s.material.opacity = L.lamp * .55; s.visible = L.lamp > .03; });
    if (fireflies) { fireflies.visible = L.lamp > .3; fireflies.material.opacity = L.lamp; }
    // jam di HUD (diperbarui tiap detik)
    const showH = preview != null ? shownH : real.h, f = faseOf(showH);
    const txt = (preview != null ? 'Pratinjau · ' : HARI[real.day] + ' · ' + String(real.hh).padStart(2, '0') + ':' + String(real.mm).padStart(2, '0') + ' · ') + f;
    if (window.RHR && window.RHR.bgm && LT.f !== f) { LT.f = f; window.RHR.bgm.setPhase(f.toLowerCase()); }
    const el = $('hJam'); if (el.dataset.t !== txt) { el.dataset.t = txt; el.querySelector('b').textContent = txt; el.dataset.f = f.toLowerCase(); }
  }
  let lampMat = null, lampHalo = [], fireflies = null;
  function haloTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,230,160,1)'); g.addColorStop(.35, 'rgba(255,210,120,.45)'); g.addColorStop(1, 'rgba(255,200,100,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  }
  function buildFireflies(tex) {
    const n = 70, pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * 90; pos[i * 3 + 1] = 1 + Math.random() * 4; pos[i * 3 + 2] = (Math.random() - .5) * 70; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    fireflies = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.1, map: tex, color: C('#fff1a0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    fireflies.frustumCulled = false; scene.add(fireflies);
  }
  const PREV = [7.3, 12, 17.2, 21];
  function cyclePreview() {
    const i = preview == null ? 0 : PREV.indexOf(preview) + 1;
    preview = i < PREV.length ? PREV[i] : null;
    toast(preview == null ? 'Kembali ke jam sekarang (WIB)' : 'Pratinjau ' + faseOf(preview).toLowerCase() + '. Ketuk jam lagi untuk ganti.');
  }
  function salam() { const f = faseOf(wib().h); return 'Selamat ' + f.toLowerCase() + '! '; }
  let renderer = null, scene, camera, sun, labelCv, lg, raycaster, groundPlane, fadeAttr = null;
  let playerRig = null, kepalaRig = null, shadowIM = null, homeGroup = null, plantGroup = null;
  const texCache = {}, matCache = {}, spMatCache = {};
  let GEO = null;
  const camTarget = { x: 300, z: 320 }, camVel = { x: 0, z: 0, lx: null, lz: null }, pan = { x: 0, z: 0 };
  let shadowKey = '', fpsAcc = 0, fpsN = 0, fpsT = 0, quality = 2;

  function loadThree() {
    return new Promise((res, rej) => {
      if (window.THREE) return res();
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload = () => res(); s.onerror = () => rej(new Error('three'));
      document.head.appendChild(s);
    });
  }
  const C = hex => new THREE.Color(hex).convertSRGBToLinear();
  function mat(hex, rough) {
    const k = hex + '|' + (rough == null ? '' : rough);
    if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color: C(hex), roughness: rough == null ? .82 : rough, metalness: 0 });
    return matCache[k];
  }
  function box(w, h, d, hex, x, y, z, noCast) { const m = new THREE.Mesh(GEO.box, mat(hex)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = !noCast; m.receiveShadow = true; return m; }
  function ballM(r, hex, x, y, z, sy) { const m = new THREE.Mesh(GEO.sph, mat(hex)); m.scale.set(r, r * (sy || 1), r); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cyl(rt, h, hex, x, y, z) { const m = new THREE.Mesh(GEO.cyl, mat(hex)); m.scale.set(rt, h, rt); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function roof4(r, h, hex, x, y, z) { const m = new THREE.Mesh(GEO.cone4, mat(hex, .7)); m.scale.set(r, h, r); m.rotation.y = Math.PI / 4; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function tex(key) {
    if (!texCache[key]) { const t = new THREE.TextureLoader().load('../img/' + key + '.webp'); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; texCache[key] = t; }
    return texCache[key];
  }
  function spMat(key) {
    if (!spMatCache[key]) spMatCache[key] = new THREE.SpriteMaterial({ map: tex(key), alphaTest: .42, fog: true });
    return spMatCache[key];
  }
  function signTex(text, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#1b2a22'; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8);
    x.fillStyle = '#1b2a22'; x.font = '700 ' + Math.round(h * .5) + 'px "Courier Prime", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function sign(text, x, y, z, w) {
    const g = new THREE.Group();
    const board = box(w + .3, 1.5, .3, '#8a5530', 0, 0, 0); g.add(board);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.25), new THREE.MeshBasicMaterial({ map: signTex(text, 640, Math.round(640 * 1.25 / w)) }));
    face.position.set(0, 0, .17); g.add(face);
    g.position.set(x, y, z); return g;
  }
  function flat(shape, hex, y, rough) {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 28), mat(hex, rough == null ? 1 : rough));
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m;
  }
  function blobShape(x0, y0, x1, y1, amp, seed) {
    const r = rng(seed), pts = [], step = 70;
    const P2 = (x, y) => new THREE.Vector2(x * U, -y * U);
    for (let x = x0; x < x1; x += step) pts.push(P2(x, y0 + (r() - .5) * amp));
    for (let y = y0; y < y1; y += step) pts.push(P2(x1 + (r() - .5) * amp, y));
    for (let x = x1; x > x0; x -= step) pts.push(P2(x, y1 + (r() - .5) * amp));
    for (let y = y1; y > y0; y -= step) pts.push(P2(x0 + (r() - .5) * amp, y));
    const s = new THREE.Shape(); s.moveTo(pts[0].x, pts[0].y); s.splineThru(pts.slice(1).concat([pts[0]])); return s;
  }
  function waveShape(yTop, yBot, amp, freq, ph) {
    const s = new THREE.Shape(); s.moveTo(-800 * U, -yBot * U);
    for (let x = -800; x <= W + 800; x += 50) s.lineTo(x * U, -(yTop + Math.sin(x / freq + ph) * amp) * U);
    s.lineTo((W + 800) * U, -yBot * U); s.lineTo(-800 * U, -yBot * U); return s;
  }
  function instanced(geo, list, rough) {
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: rough || .8, metalness: 0 }), Math.max(1, list.length));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    list.forEach((a, i) => { p.set(a[0], a[1], a[2]); s.set(a[3], a[4], a[5]); q.setFromEuler(e.set(a[8] || 0, a[7] || 0, a[9] || 0)); m4.compose(p, q, s); im.setMatrixAt(i, m4); im.setColorAt(i, a[6]); });
    im.count = list.length; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; return im;
  }

  // ---------- pohon & dekorasi (instanced) ----------
  const TREECOL = { g: '#45b84a', l: '#b6de45', p: '#f7c2db', gs: '#45b84a', ps: '#f7c2db' };
  const TREES = [];
  function treeParts(o, r, can, trk) {
    const x = o.x * U, z = o.y * U, c0 = can.length;
    const vary = hex => { const c = new THREE.Color(hex); c.offsetHSL((r() - .5) * .025, (r() - .5) * .08, (r() - .5) * .07); return c.convertSRGBToLinear(); };
    const T = (h, rad, hex, dx, dz, tilt) => trk.push([x + (dx || 0), h / 2, z + (dz || 0), rad, h, rad, vary(hex), 0, 0, tilt || 0]);
    const B = (dx, dy, dz, rr, hex, sy) => can.push([x + dx, dy, z + dz, rr, rr * (sy || 1), rr, vary(hex), r() * 6]);
    const k = o.k;
    if (k === 'g' || k === 'l' || k === 'p' || k === 'gs' || k === 'ps') {
      const s = (k.length === 2 ? .75 : 1) * (.85 + r() * .3), col = TREECOL[k];
      T(5 * s, .45 * s, '#8a4f2c');
      [[0, 6.7, 0, 2.7], [-1.9, 5.5, .5, 2.1], [1.9, 5.6, -.3, 2.1], [.2, 5.2, 1.7, 1.9], [.4, 8.1, -.6, 1.7]].forEach(([dx, dy, dz, rr]) => B(dx * s, dy * s, dz * s, rr * s, col));
    } else if (k === 'big') {
      const s = .9 + r() * .3, col = r() < .7 ? '#2f9a45' : '#45b84a';
      T(9.5 * s, .95 * s, '#7a4527');
      [[0, 12, 0, 4.4], [-3.7, 10, .6, 3.4], [3.7, 10.2, -.4, 3.4], [0, 9.6, 3, 3.1], [-1.5, 13.9, -1.5, 3], [2, 13.5, 1.2, 2.8]].forEach(([dx, dy, dz, rr]) => B(dx * s, dy * s, dz * s, rr * s, col));
    } else if (k === 'aca') {
      const s = .9 + r() * .3;
      T(6.6 * s, .42 * s, '#7a4a28', 0, 0, .08);
      [[-2.6, 6.8, 0, 3.2], [1.6, 7.4, .4, 3.9], [3.9, 6.6, -.6, 2.6]].forEach(([dx, dy, dz, rr]) => B(dx * s, dy * s, dz * s, rr * s, '#86cf4c', .33));
    } else if (k === 'bush' || k === 'bushl') {
      const col = k === 'bush' ? '#4fbf4f' : '#9fd84a';
      [[-.9, 1, 0, 1.3], [.9, 1, .2, 1.3], [0, 1.6, -.1, 1.5]].forEach(([dx, dy, dz, rr]) => B(dx, dy, dz, rr, col));
    } else if (k === 'reed') {
      [[-.4, 0], [.2, .3], [.5, -.2]].forEach(([dx, dz]) => { const h = 2.4 + r() * 1.2; T(h, .09, '#4f9a3a', dx, dz); can.push([x + dx, h, z + dz, .2, .55, .2, vary('#8a5a2c'), 0]); });
    } else if (k === 'mush') {
      T(.9, .22, '#f4ead2'); B(0, .95, 0, .75, '#e2483a', .55);
    } else if (k === 'flower') {
      const cols = ['#ffffff', '#ffd23f', '#ff9ec8', '#ff7a6a', '#c9a0ff'], col = cols[Math.floor(r() * cols.length)];
      for (let i = 0; i < 3; i++) { const dx = (r() - .5) * 1.4, dz = (r() - .5) * 1.4, h = .5 + r() * .5; T(h, .05, '#4f9a3a', dx, dz); can.push([x + dx, h + .1, z + dz, .28, .2, .28, vary(col), 0]); can.push([x + dx, h + .17, z + dz, .1, .08, .1, vary('#ffd23f'), 0]); }
    } else if (k === 'rock') {
      can.push([x, .55, z, 1.7, .95, 1.3, vary('#c3cad0'), r() * 6]);
    }
    const n = can.length - c0;
    if (n && (k === 'g' || k === 'l' || k === 'p' || k === 'big' || k === 'aca' || k === 'gs' || k === 'ps')) {
      let top = 0, rad = 0; for (let i = c0; i < can.length; i++) { top = Math.max(top, can[i][1]); rad = Math.max(rad, Math.hypot(can[i][0] - x, can[i][2] - z) + can[i][3]); }
      TREES.push({ x, z, cy: top * .78, r: rad * .95, s: c0, n, f: 1, ft: 1 });
    }
  }
  function stiltHouse(x, z, roofHex) {
    const g = new THREE.Group();
    [[-2.6, -2], [2.6, -2], [-2.6, 2], [2.6, 2]].forEach(([dx, dz]) => g.add(box(.5, 3, .5, '#7a4527', dx, 1.5, dz)));
    g.add(box(6.6, .5, 5.6, '#a8693a', 0, 3.1, 0));
    g.add(box(5.6, 3.4, 4.6, '#d08a4e', 0, 5.05, 0));
    g.add(box(1.2, 1, .12, '#9fd6f2', -1.5, 5.4, 2.32, true)); g.add(box(1.2, 1, .12, '#9fd6f2', 1.5, 5.4, 2.32, true));
    g.add(box(1.1, 2, .12, '#6b3d1f', 0, 4.4, 2.32, true));
    g.add(roof4(5, 3.2, roofHex, 0, 8.3, 0));
    for (let i = 0; i < 4; i++) g.add(box(1.6, .25, .8, '#8a5530', 0, .45 + i * .75, 5.4 - i * .75));
    g.position.set(x, 0, z); return g;
  }
  // ---------- bangunan unik (semua 3D clay) ----------
  // ukuran tapak tiap bangunan (setengah lebar & setengah dalam, unit 3D) untuk tabrakan dan posisi pintu
  function frustum(rt, rb, h, hex, x, y, z, sx, sz) {
    const p = new THREE.Group(), m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 4, 1), mat(hex, .7));
    m.rotation.y = Math.PI / 4; m.castShadow = true; m.receiveShadow = true; p.add(m);
    p.position.set(x, y, z); p.scale.set(sx || 1, 1, sz || 1); return p;
  }
  function texMat(tex) { return new THREE.MeshStandardMaterial({ map: tex, roughness: .9 }); }
  function bBalai() {
    const g = new THREE.Group(), RED = '#7a2a1e';
    g.add(box(21, 1.1, 15.6, '#d8c8a2', 0, .55, 0)); g.add(box(20.2, .25, 14.8, '#e8dbbb', 0, 1.22, 0));
    g.add(box(7, .45, 1.6, '#cbb98f', 0, .22, 8.5)); g.add(box(7, .45, 1, '#d4c39a', 0, .67, 8.1));
    const xs = [-8.6, -4.3, 0, 4.3, 8.6], zs = [-6, -2, 2, 6];
    xs.forEach(x => zs.forEach(z => { const outer = Math.abs(x) > 8 || Math.abs(z) > 5; const center = Math.abs(x) < 5 && Math.abs(x) > 3 && Math.abs(z) < 3; if (outer || center) g.add(cyl(center ? .42 : .32, center ? 7.6 : 5.6, RED, x, 1.3 + (center ? 3.8 : 2.8), z)); }));
    [-6, 6].forEach(z => g.add(box(18.2, .45, .45, RED, 0, 7.1, z))); [-8.6, 8.6].forEach(x => g.add(box(.45, .45, 12.4, RED, x, 7.1, 0)));
    g.add(frustum(9, 14, 2.8, '#b5332b', 0, 8.6, 0, 1.22, .92));
    g.add(frustum(.7, 6.6, 5.2, '#d0473a', 0, 12.4, 0, 1.25, .9));
    g.add(box(3.6, .5, .7, RED, 0, 15.1, 0)); [-1.9, 1.9].forEach(x => g.add(ballM(.4, '#f2c14a', x, 15.4, 0)));
    // gong di tengah pendopo
    [-1.4, 1.4].forEach(x => g.add(box(.25, 3.2, .25, '#5a2a1a', x, 2.9, -1)));
    g.add(box(3.2, .25, .25, '#5a2a1a', 0, 4.5, -1));
    const gong = cyl(1.05, .25, '#d9a62a', 0, 3.1, -1); gong.rotation.x = Math.PI / 2; g.add(gong); g.add(ballM(.35, '#b8861a', 0, 3.1, -.82, .5));
    g.add(sign('BALAI WARGA', 6.6, 2.1, 9.6, 6.4)); [3.6, 9.6].forEach(x => g.add(box(.3, 2.1, .3, '#5a2a1a', x, 1.05, 9.4)));
    return g;
  }
  function bLoket() {
    const g = new THREE.Group();
    g.add(box(7.4, .4, 5.6, '#b88752', 0, .2, 0));
    g.add(box(7, 4.6, 5, '#d39a5c', 0, 2.7, 0));
    for (let i = 0; i < 6; i++) g.add(box(7.05, .08, 5.05, '#b8814a', 0, 1 + i * .8, 0, true));
    g.add(box(4.8, 1.8, .2, '#3a2414', 0, 3.2, 2.52, true));
    g.add(box(5.4, .3, 1.1, '#a86b33', 0, 2.25, 3));
    const aw = new THREE.Group(); for (let i = 0; i < 8; i++) aw.add(box(.92, .14, 2.2, i % 2 ? '#ffffff' : '#d13a2e', -3.2 + i * .92, 0, 0)); aw.position.set(0, 4.9, 3.2); aw.rotation.x = .38; g.add(aw);
    g.add(box(7.8, .45, 5.8, '#8a5530', 0, 5.25, 0));
    g.add(sign('LOKET PENDAFTARAN', 0, 6.6, .5, 7.6));
    [-3.4, 3.4].forEach(x => g.add(box(.3, 1.6, .3, '#8a5530', x, 5.9, .5)));
    // kartu KTP raksasa di samping
    g.add(box(.2, 2.1, 3.2, '#eef6ff', 3.62, 3.3, -.4)); g.add(box(.22, .55, 3.2, '#1f7a4a', 3.63, 4.1, -.4)); g.add(box(.23, .9, .8, '#f2c14a', 3.64, 2.9, -1.3));
    // tiang antrean bertali merah
    const qp = [[-2.4, 5], [-2.4, 8.6], [2.4, 5], [2.4, 8.6]];
    qp.forEach(([x, z]) => { g.add(cyl(.16, 1.5, '#c9a24a', x, .75, z)); g.add(ballM(.22, '#c9a24a', x, 1.6, z)); });
    [-2.4, 2.4].forEach(x => g.add(box(.09, .09, 3.6, '#d13a2e', x, 1.35, 6.8)));
    g.scale.setScalar(1.3); return g;
  }
  function bPos() {
    const g = new THREE.Group();
    g.add(box(11.6, .5, 8.6, '#cfc3a6', 0, .25, 0));
    g.add(box(11, 6, 8, '#d9402e', 0, 3.4, 0)); g.add(box(11.5, .7, 8.5, '#fbf2dc', 0, 6.7, 0));
    [-2.6, 2.6].forEach(x => { g.add(box(3.8, 4.2, .2, '#fbf2dc', x, 2.6, 4.06, true)); for (let i = 0; i < 4; i++) g.add(box(3.8, .1, .25, '#c9c2b0', x, 1.2 + i * .9, 4.08, true)); });
    g.add(sign('POS PEMADAM', 0, 8.1, 3.4, 8));
    [-3.6, 3.6].forEach(x => g.add(box(.3, 1.4, .3, '#8a5530', x, 7.6, 3.4)));
    // menara pengawas dengan lonceng
    const tw = new THREE.Group();
    [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(([x, z]) => tw.add(box(.3, 9, .3, '#8a5530', x, 4.5, z)));
    for (let i = 0; i < 3; i++) { tw.add(box(2.5, .15, .15, '#8a5530', 0, 2 + i * 2.6, 1.1)); tw.add(box(2.5, .15, .15, '#8a5530', 0, 2 + i * 2.6, -1.1)); }
    tw.add(box(3.4, .3, 3.4, '#a86b33', 0, 9.1, 0));
    [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([x, z]) => tw.add(box(.2, 2.2, .2, '#8a5530', x, 10.3, z)));
    tw.add(roof4(2.9, 1.8, '#a52c25', 0, 12.3, 0));
    tw.add(ballM(.6, '#e6b23a', 0, 10.6, 0, 1.1)); tw.add(box(.1, .6, .1, '#5a3a2a', 0, 11.2, 0));
    tw.position.set(-8, 0, -.5); g.add(tw);
    // tangki air
    const tk = new THREE.Group();
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => tk.add(box(.25, 4.2, .25, '#9aa3ad', x, 2.1, z)));
    tk.add(cyl(1.9, 3, '#5fb0e8', 0, 5.7, 0)); tk.add(ballM(1.9, '#4a9ad8', 0, 7.2, 0, .35));
    tk.add(box(.2, 2.4, .2, '#5a6370', 1.5, 3, 1.5));
    tk.position.set(8, 0, -.8); g.add(tk);
    // hidran
    g.add(cyl(.38, 1.1, '#e2483a', 4.6, .55, 5.4)); g.add(ballM(.42, '#e2483a', 4.6, 1.15, 5.4)); { const n = cyl(.14, .5, '#e2483a', 4.95, .7, 5.4); n.rotation.z = Math.PI / 2; g.add(n); }
    return g;
  }
  function bBibit() {
    const g = new THREE.Group();
    g.add(box(12.6, .5, 8.6, '#d9c7a0', 0, .25, 0));
    const glass = new THREE.MeshStandardMaterial({ color: C('#bfe9f7'), roughness: .08, transparent: true, opacity: .42, depthWrite: false, side: THREE.DoubleSide });
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 11.4, 22, 1, true, 0, Math.PI), glass); vault.rotation.z = Math.PI / 2; vault.position.y = .5; g.add(vault);
    [-5.7, 5.7].forEach(x => { const end = new THREE.Mesh(new THREE.CircleGeometry(4.2, 18, 0, Math.PI), glass); end.rotation.y = Math.PI / 2; end.position.set(x, .5, 0); g.add(end); });
    for (let i = 0; i < 6; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(4.2, .1, 6, 18, Math.PI), mat('#ffffff', .5)); rib.rotation.y = Math.PI / 2; rib.position.set(-5.7 + i * 2.28, .5, 0); g.add(rib); }
    g.add(box(11.4, .14, .14, '#ffffff', 0, 4.7, 0));
    // tanaman di dalam
    for (let i = 0; i < 9; i++) { const x = -4.8 + i * 1.2; g.add(box(1, .6, 5.6, '#8a5530', x, .8, 0)); g.add(ballM(.6 + (i % 3) * .12, i % 4 === 3 ? '#f7a8c8' : '#4fbf4f', x, 1.6, -1.2)); g.add(ballM(.55, '#6fd05a', x, 1.5, 1.2)); }
    g.add(box(1.8, 2.8, .2, '#ffffff', 0, 1.9, 3.95, true)); g.add(box(1.4, 2.4, .22, '#bfe9f7', 0, 1.9, 3.96, true));
    // pot bibit di depan
    [-4.6, -3.2, 3.2, 4.6].forEach((x, i) => { g.add(cyl(.55, .8, '#c96a3a', x, .9, 5.2)); g.add(ballM(.5, i % 2 ? '#7fd45a' : '#4fbf4f', x, 1.6, 5.2)); });
    g.add(sign('KANTOR BIBIT', 0, 6, 1.5, 7));
    [-3.3, 3.3].forEach(x => g.add(box(.3, 1.6, .3, '#8a5530', x, 5.2, 1.5)));
    return g;
  }
  function bSalon() {
    const g = new THREE.Group();
    g.add(cyl(5.8, .5, '#e8d6b4', 0, .25, 0));
    g.add(cyl(4.6, 4.6, '#f7c6dc', 0, 2.8, 0));
    g.add(box(1.7, 3, .2, '#a86b33', -1.4, 2, 4.52, true));
    const mr = new THREE.Mesh(new THREE.TorusGeometry(.95, .18, 8, 20), mat('#e6b23a', .4)); mr.position.set(1.9, 3, 4.55); g.add(mr);
    const gl = new THREE.Mesh(new THREE.CircleGeometry(.9, 20), new THREE.MeshStandardMaterial({ color: C('#d8f1fb'), roughness: .05 })); gl.position.set(1.9, 3, 4.58); g.add(gl);
    // atap daun raksasa
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, leaf = new THREE.Group(); const m = ballM(1, i % 2 ? '#4fbf4f' : '#6fd05a', 0, 0, 0); m.scale.set(3.6, .3, 1.5); m.position.x = 2.6; leaf.add(m); leaf.rotation.y = -a; leaf.rotation.z = .42; leaf.position.y = 5.6; g.add(leaf); }
    g.add(ballM(1.3, '#ff9ec8', 0, 7.2, 0, .8)); g.add(ballM(.55, '#ffd23f', 0, 7.9, 0));
    // tiang salon
    g.add(cyl(.28, 3.4, '#ffffff', 5.4, 1.7, 2.6)); for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.3, .07, 6, 14), mat('#ff7ab0', .5)); r.rotation.x = Math.PI / 2; r.position.set(5.4, .8 + i * .7, 2.6); g.add(r); }
    g.add(ballM(.4, '#ff7ab0', 5.4, 3.6, 2.6));
    g.add(sign('SALON DAUN', 0, 1.6, 6.2, 5.6));
    [-2.6, 2.6].forEach(x => g.add(box(.25, 1.6, .25, '#8a5530', x, .8, 6.1)));
    return g;
  }
  function bWarta() {
    const g = new THREE.Group(), paper = texMat(paperTex());
    g.add(box(9.6, .5, 8, '#cfc3a6', 0, .25, 0));
    g.add(box(9, 8, 7, '#f4ead2', 0, 4.5, 0));
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) if (!(r === 0 && c === 1)) g.add(box(1.5, 1.4, .15, '#9fd6f2', -2.8 + c * 2.8, 2.8 + r * 3.4, 3.56, true));
    g.add(box(1.8, 2.8, .2, '#6b3d1f', 0, 1.9, 3.56, true));
    // atap koran terlipat
    [-1, 1].forEach(s => { const rf = new THREE.Mesh(GEO.box, paper); rf.scale.set(10, .3, 5.2); rf.rotation.x = s * .6; rf.position.set(0, 9.9, s * 2); rf.castShadow = true; g.add(rf); });
    g.add(cyl(.55, 3, '#5a5f6a', 3, 11.4, -1.2)); g.add(ballM(.8, '#d9dde3', 3.3, 13.4, -1.2, .7)); g.add(ballM(.6, '#e6e9ee', 3.8, 14.4, -1.2, .7));
    // gulungan koran raksasa & tumpukan koran
    const roll = new THREE.Mesh(GEO.cyl, paper); roll.scale.set(1.1, 4.2, 1.1); roll.rotation.z = Math.PI / 2; roll.position.set(6.6, 1.1, 1.5); roll.castShadow = true; g.add(roll);
    g.add(box(1.6, .2, 4.3, '#d13a2e', 6.6, 2.25, 1.5));
    [[5.6, -1.6], [6.6, -2.6]].forEach(([x, z]) => { for (let i = 0; i < 3; i++) g.add(box(1.6, .5, 1.1, '#efe8d8', x, .5 + i * .52, z)); });
    g.add(sign('WARTA RIMBA', 0, 4.2, 3.7, 6.6));
    const board = new THREE.Group();
    [-1.6, 1.6].forEach(dx => board.add(box(.25, 3, .25, '#8a5530', dx, 1.5, 0)));
    board.add(box(3.8, 2.4, .25, '#8a5530', 0, 2.5, 0));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2), new THREE.MeshBasicMaterial({ map: paperTex() })); face.position.set(0, 2.5, .14); board.add(face);
    board.position.set(-4.4, 0, 6); g.add(board);
    return g;
  }
  function bRadio() {
    const g = new THREE.Group();
    g.add(cyl(5.4, .5, '#d8d2e8', 0, .25, 0));
    g.add(cyl(4.5, 5.6, '#f1edf9', 0, 3.3, 0));
    g.add(cyl(4.6, .7, '#7b5bd6', 0, 5.3, 0));
    g.add(ballM(4.6, '#7b5bd6', 0, 5.6, 0, .55));
    g.add(box(1.7, 2.8, .2, '#5a3f9a', 0, 1.9, 4.45, true));
    [-2.6, 2.6].forEach(x => { const pw = new THREE.Mesh(new THREE.CircleGeometry(.6, 16), new THREE.MeshStandardMaterial({ color: C('#bfe0f7'), roughness: .1 })); pw.position.set(x, 3.4, Math.sqrt(4.5 * 4.5 - x * x) + .02); pw.rotation.y = Math.asin(x / 4.5); g.add(pw); });
    const onair = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color: C('#ff4a3a') })); onair.scale.set(1.6, .5, .2); onair.position.set(0, 3.9, 4.5); g.add(onair); radioOnAir = onair;
    // toa di tiang
    [-1, 1].forEach(s => { g.add(cyl(.18, 6.4, '#9aa3ad', s * 5.6, 3.2, 3)); const horn = new THREE.Mesh(GEO.cone, mat('#e6e9ee', .4)); horn.scale.set(.9, 1.7, .9); horn.position.set(s * 5.6, 6.3, 3.7); horn.rotation.x = -Math.PI / 2 - .25; horn.castShadow = true; g.add(horn); { const c2 = cyl(.32, .6, '#9aa3ad', s * 5.6, 6.3, 2.9); c2.rotation.x = Math.PI / 2; g.add(c2); } });
    // menara antena
    const tw = new THREE.Group();
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const leg = cyl(.12, 16, '#d8dde5', sx * .55, 8, sz * .55); leg.rotation.z = -sx * .05; leg.rotation.x = sz * .05; tw.add(leg); });
    for (let i = 0; i < 6; i++) tw.add(box(1.3 - i * .12, .16, 1.3 - i * .12, i % 2 ? '#e25b3c' : '#ffffff', 0, 1.6 + i * 2.6, 0));
    tw.add(cyl(.06, 3, '#d8dde5', 0, 17.5, 0));
    const lamp = new THREE.Mesh(GEO.sph, new THREE.MeshBasicMaterial({ color: C('#ff4a3a') })); lamp.scale.setScalar(.45); lamp.position.y = 19.2; tw.add(lamp); radioLamp = lamp;
    tw.position.set(-6.4, 0, -2.8); g.add(tw);
    const dish = ballM(1.2, '#eef2f6', 2.2, 8.2, 1, .35); dish.rotation.x = .9; g.add(dish);
    g.add(sign('RADIO RIMBA', 0, 1.3, 6.4, 5.8));
    [-2.6, 2.6].forEach(x => g.add(box(.25, 1.4, .25, '#8a5530', x, .7, 6.3)));
    return g;
  }
  let radioOnAir = null, doorMarks = [];
  const BUILDERS = { balai: bBalai, papan: bLoket, pos: bPos, bibit: bBibit, salon: bSalon, warta: bWarta, radio: bRadio };
  function shop(b) { const g = (BUILDERS[b.id] || bLoket)(); g.position.set(b.x * U, 0, b.y * U); return g; }
  let radioLamp = null;
  function paperTex() {
    const c = document.createElement('canvas'); c.width = 340; c.height = 200; const x = c.getContext('2d');
    x.fillStyle = '#f0ede3'; x.fillRect(0, 0, 340, 200);
    x.fillStyle = '#1b2a22'; x.font = '700 34px "Courier Prime", monospace'; x.textAlign = 'center'; x.fillText('WARTA RIMBA', 170, 40);
    x.fillRect(16, 52, 308, 3);
    x.font = '700 18px "Courier Prime", monospace'; x.fillText('EDISI TERBARU', 170, 80);
    x.fillStyle = '#9aa29a'; for (let i = 0; i < 6; i++) { x.fillRect(16, 100 + i * 16, 140, 6); x.fillRect(184, 100 + i * 16, 140, 6); }
    const t2 = new THREE.CanvasTexture(c); t2.encoding = THREE.sRGBEncoding; return t2;
  }
  function flagpole() {
    const g = new THREE.Group();
    g.add(cyl(1.4, .8, '#d9c79a', 0, .4, 0));
    g.add(cyl(.14, 12, '#e6e9ee', 0, 6.4, 0));
    g.add(ballM(.3, '#ffd23f', 0, 12.5, 0));
    const c = document.createElement('canvas'); c.width = 240; c.height = 150; const x = c.getContext('2d');
    x.fillStyle = '#1e5536'; x.fillRect(0, 0, 240, 150); x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(120, 75, 42, 0, 7); x.fill();
    x.fillStyle = '#ff8a26'; x.beginPath(); x.arc(120, 78, 30, 0, 7); x.fill(); x.fillStyle = '#f8d2b0'; x.beginPath(); x.ellipse(120, 84, 18, 14, 0, 0, 7); x.fill();
    const tx2 = new THREE.CanvasTexture(c); tx2.encoding = THREE.sRGBEncoding;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5, 8, 1), new THREE.MeshStandardMaterial({ map: tx2, side: THREE.DoubleSide, roughness: .9 }));
    flag.position.set(2.1, 10.6, 0); g.add(flag); flagMesh = flag;
    g.position.set(FLAG.x * U, 0, FLAG.y * U); return g;
  }
  let flagMesh = null;
  // pintu pagar alun-alun: tempat jalan setapak menyentuh pagar
  function fenceGaps() {
    const G = [[SQ.x0, 1590], [SQ.x1, 1590], [1500, SQ.y1], [1500, SQ.y0]];
    doorPaths().forEach(([, , tx, ty]) => G.push([tx, ty]));
    return G;
  }
  function fenceSegs() {
    // tiap sisi dipotong di titik pintu, lebar celah 46 px
    const gaps = fenceGaps(), out = [], GW = 23;
    const side = (ax, ay, bx, by) => {
      const horiz = ay === by, a0 = horiz ? ax : ay, a1 = horiz ? bx : by, fixed = horiz ? ay : ax;
      const cuts = gaps.filter(([x, y]) => Math.abs((horiz ? y : x) - fixed) < 2).map(([x, y]) => horiz ? x : y).sort((p, q) => p - q);
      let s = a0;
      cuts.forEach(c => { if (c - GW > s) out.push(horiz ? [s, fixed, c - GW, fixed] : [fixed, s, fixed, c - GW]); s = Math.max(s, c + GW); });
      if (a1 > s) out.push(horiz ? [s, fixed, a1, fixed] : [fixed, s, fixed, a1]);
    };
    side(SQ.x0, SQ.y0, SQ.x1, SQ.y0); side(SQ.x0, SQ.y1, SQ.x1, SQ.y1); side(SQ.x0, SQ.y0, SQ.x0, SQ.y1); side(SQ.x1, SQ.y0, SQ.x1, SQ.y1);
    return out;
  }
  function plazaSquare() {
    const g = new THREE.Group(), w = (SQ.x1 - SQ.x0) * U, d = (SQ.y1 - SQ.y0) * U, cx = SQ.cx * U, cz = (SQ.y0 + SQ.y1) / 2 * U;
    // lapangan rumput dengan garis potong rumput
    g.add(box(w + 3, .14, d + 3, '#d8c79c', cx, .07, cz, true));
    const NS = 9, sw = w / NS;
    for (let i = 0; i < NS; i++) g.add(box(sw, .2, d, i % 2 ? '#79c257' : '#86cc61', SQ.x0 * U + sw / 2 + i * sw, .16, cz, true));
    // lingkaran tengah dari kapur
    const ring = new THREE.Mesh(new THREE.TorusGeometry(9, .22, 4, 40), mat('#f4f1e2', .9)); ring.rotation.x = -Math.PI / 2; ring.position.set(cx, .28, cz); g.add(ring);
    // pagar tali merah
    const posts = [], ropes = [];
    fenceSegs().forEach(([x0, y0, x1, y1]) => {
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / 34));
      for (let i = 0; i <= n; i++) { const k = i / n; posts.push([(x0 + (x1 - x0) * k) * U, (y0 + (y1 - y0) * k) * U]); }
      const mx = (x0 + x1) / 2 * U, mz = (y0 + y1) / 2 * U, horiz = y0 === y1, len = L * U;
      [1.05, 1.75].forEach(h => ropes.push([mx, h, mz, horiz ? len : .14, .14, horiz ? .14 : len]));
    });
    posts.forEach(([x, z]) => { g.add(cyl(.3, 2.2, '#8a5530', x, 1.1, z)); g.add(ballM(.36, '#d13a2e', x, 2.3, z)); });
    ropes.forEach(([x, y, z, sx, sy, sz]) => g.add(box(sx, sy, sz, '#d13a2e', x, y, z)));
    g.add(sign('ALUN-ALUN RIMBA', cx + 16, 1.9, SQ.y1 * U + 3.5, 7));
    [cx + 12.6, cx + 19.4].forEach(x => g.add(box(.3, 1.9, .3, '#8a5530', x, .95, SQ.y1 * U + 3.3)));
    return g;
  }
  let fountainTop = null;
  function treehouse() {
    const g = new THREE.Group();
    g.add(cyl(2.3, 14, '#7a4527', 0, 7, 0));
    [[2.2, 0], [-2.2, .4], [0, 2.2], [.3, -2.2]].forEach(([dx, dz]) => g.add(ballM(1.3, '#7a4527', dx, .4, dz, .6)));
    g.add(cyl(8, .7, '#c98a4a', 0, 10.6, 0));
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; g.add(box(.3, 1.4, .3, '#a86b33', Math.cos(a) * 7.6, 11.6, Math.sin(a) * 7.6)); }
    g.add(box(5.6, 4.2, 5, '#e3ad6c', 0, 13.1, 0));
    g.add(box(1.4, 2.4, .15, '#6b3d1f', 0, 12.2, 2.55, true));
    g.add(box(1.2, 1, .15, '#9fd6f2', 1.8, 13.6, 2.55, true));
    g.add(roof4(4.8, 3, '#7fbf5a', 0, 16.7, 0));
    [[0, 22.5, -1, 7.2], [-6.5, 19.5, 0, 5.6], [6.4, 19.8, -1, 5.6], [-2.6, 25.5, -3, 5.6], [3.2, 25, 2, 5], [0, 19, -5, 5]].forEach(([dx, dy, dz, r]) => g.add(ballM(r, '#2f9a45', dx, dy, dz)));
    // akar gantung beringin
    for (let i = 0; i < 22; i++) { const a = i / 22 * 6.28 + (i % 3) * .3, r = 8.6 + (i % 4) * .8, len = 4.5 + (i % 5) * 1.6, rx = Math.cos(a) * r, rz = Math.sin(a) * r; if (rz > 0 && (rx > 4 || rx < -6)) continue; const rt = box(.16, len, .16, '#8a5a35', rx, 18.4 - len / 2, rz, true); g.add(rt); }
    // tangga
    [5.6, 7.1].forEach(dx => g.add(box(.25, 10.6, .25, '#8a5530', dx, 5.3, 4.4)));
    for (let i = 0; i < 9; i++) g.add(box(1.5, .2, .2, '#8a5530', 6.35, 1 + i * 1.15, 4.4));
    // ayunan
    g.add(box(7, .8, .8, '#7a4527', -6, 15.2, 2));
    [-9.6, -7.6].forEach(dx => g.add(box(.1, 10.6, .1, '#d9c7a0', dx, 9.9, 2)));
    g.add(box(2.6, .3, 1.1, '#a86b33', -8.6, 4.6, 2));
    g.add(sign('RUMAH POHON NO. 1', -6, 1.9, 7, 7.8));
    [-9.6, -2.4].forEach(dx => g.add(box(.3, 1.9, .3, '#8a5530', dx, .95, 6.8)));
    g.position.set(TH.x * U, 0, TH.y * U); g.scale.setScalar(TH.s); return g;
  }
  function nest() {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.TorusGeometry(5.2, 1.6, 10, 28), mat('#9a6a3a', 1)); t.rotation.x = -Math.PI / 2; t.scale.set(1, .62, .55); t.position.y = .6; t.castShadow = true; t.receiveShadow = true; g.add(t);
    const f = new THREE.Mesh(new THREE.CircleGeometry(5.2, 28), mat('#c99a5a', 1)); f.rotation.x = -Math.PI / 2; f.scale.set(1, .62, 1); f.position.y = .35; f.receiveShadow = true; g.add(f);
    g.position.set(NEST.x * U, 0, NEST.y * U); g.scale.set(1.7, 1, 1.7); return g;
  }
  function smallTree(x, z, col) {
    const g = new THREE.Group();
    g.add(cyl(.32, 3.4, '#8a4f2c', 0, 1.7, 0));
    [[0, 4.6, 0, 1.9], [-1.3, 3.8, .3, 1.5], [1.3, 3.9, -.2, 1.5], [.2, 3.6, 1.2, 1.3]].forEach(([dx, dy, dz, r]) => g.add(ballM(r, col, dx, dy, dz)));
    g.position.set(x, 0, z); return g;
  }
  function buildHome() {
    if (homeGroup) scene.remove(homeGroup);
    const g = new THREE.Group(), lv = save.lv || 0;
    if (lv === 0) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(2.6, .9, 8, 22), mat('#8a5530', 1)); t.rotation.x = -Math.PI / 2; t.position.y = .5; t.castShadow = true; g.add(t);
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28, s = cyl(.12, 3.4, '#7a4527', Math.cos(a) * 1.9, 1.6, Math.sin(a) * 1.9); s.rotation.z = Math.cos(a) * .55; s.rotation.x = -Math.sin(a) * .55; g.add(s); }
    } else if (lv === 1) {
      g.add(box(5.2, 3.2, 4.4, '#e0b878', 0, 1.6, 0));
      g.add(ballM(3.6, '#4fae4a', 0, 3.4, 0, .62));
      g.add(box(1.2, 2, .12, '#6b3d1f', 0, 1, 2.25, true));
    } else if (lv === 2) {
      const h = stiltHouse(0, 0, '#e25b3c'); g.add(h);
    } else {
      g.add(cyl(1, 9, '#7a4527', 0, 4.5, 0));
      g.add(cyl(4.6, .5, '#c98a4a', 0, 8.2, 0));
      g.add(box(4, 3.4, 4, '#f0c27a', 0, 10.1, 0));
      g.add(box(1.1, 2, .12, '#6b3d1f', 0, 9.4, 2.05, true));
      g.add(roof4(3.6, 2.6, '#ffd23f', 0, 13.1, 0));
      [[-4.2, 15, -1, 3.4], [4.2, 15, -1, 3.4], [0, 17.4, -2, 3.8]].forEach(([dx, dy, dz, r]) => g.add(ballM(r, '#45b84a', dx, dy, dz)));
      for (let i = 0; i < 7; i++) g.add(box(1.4, .2, .2, '#8a5530', 2.3, .8 + i * 1.1, 2.6));
    }
    g.position.set(home.x * U, 0, home.y * U);
    homeGroup = g; scene.add(g); renderer.shadowMap.needsUpdate = true;
  }
  function buildPlants() {
    if (plantGroup) scene.remove(plantGroup);
    plantGroup = new THREE.Group();
    plantPos.forEach(o => plantGroup.add(smallTree(o.x * U, o.y * U, o.k === 'ps' ? '#f7c2db' : '#45b84a')));
    scene.add(plantGroup); renderer.shadowMap.needsUpdate = true;
  }

  // =====================================================================
  // MODEL 3D CLAY — dibangun dari bentuk dasar, mengikuti render karakter
  // =====================================================================
  const PINK = '#ef9aa6', INK = '#1a1414', MOUTH = '#5a2a1a';
  const SPEC = {
    nyamuk: { k: 'nyamuk' },
    tiger: { c: '#ff8f24', b: '#fff1dc', ear: 'round', ei: '#5a3420', x: ['stripes'], sc: '#5a3420', tail: 'long' },
    harimauputih: { c: '#eef3fa', b: '#ffffff', ear: 'round', ei: '#5a3420', x: ['stripes'], sc: '#5a3420', tail: 'long' },
    lion: { c: '#f9c53e', b: '#fff1d0', ear: 'round', x: ['mane'], mane: '#f2862a', tail: 'tuft' },
    singaputih: { c: '#f4f6fb', b: '#ffffff', ear: 'round', x: ['mane'], mane: '#e6ebf2', tail: 'tuft' },
    panther: { c: '#4b4045', b: '#7a6a6f', ear: 'round', ei: '#c9554a', tail: 'long' },
    leopard: { c: '#f9d63c', b: '#fff0d0', ear: 'round', ei: '#c9554a', x: ['spots'], sc: '#6b3d1f', tail: 'long' },
    jaguar: { c: '#f7d46a', b: '#ffffff', ear: 'round', ei: '#c9554a', x: ['spots'], sc: '#6b3d1f', tail: 'long' },
    cheetah: { c: '#f7efb3', b: '#ffffff', ear: 'round', ei: '#8a4a4a', x: ['spots'], sc: '#5a3420', tail: 'long' },
    dahan: { c: '#f6c255', b: '#fbe6c0', ear: 'round', ei: '#c9554a', x: ['bigspots'], sc: '#6b3d1f', tail: 'long' },
    kucing: { c: '#f6e5c8', b: '#fff6e6', ear: 'point', tail: 'long' },
    anjing: { c: '#f0d39c', b: '#ffffff', ear: 'point', tail: 'short', eyes: 'happy' },
    serigala: { c: '#a9b5cf', b: '#ffffff', ear: 'point', tail: 'fluffy', eyes: 'sad' },
    serigalaputih: { c: '#eef3fb', b: '#ffffff', ear: 'point', tail: 'fluffy' },
    rubah: { c: '#ff9a1e', b: '#fff0d8', ear: 'bigpoint', tail: 'fluffy' },
    gajah: { c: '#e6dccb', b: '#efe8dc', ear: 'elephant', x: ['trunk'], muzzle: false, tail: 'short' },
    beruang: { c: '#5a3a2a', b: '#f3c77a', ear: 'round', ei: '#f3c77a', x: ['chest'], tail: 'none' },
    rusa: { c: '#f0a050', b: '#fbe6c8', ear: 'side', x: ['antlers'], tail: 'short' },
    kancil: { c: '#f2ab5c', b: '#f9e3bf', ear: 'side', tail: 'short' },
    kelinci: { c: '#f6e6c6', b: '#fff6ea', ear: 'long', tail: 'puff', muzzle: false },
    kelincipink: { c: '#f3d4ec', b: '#ffffff', ear: 'long', tail: 'puff', muzzle: false },
    hamster: { c: '#f7c76c', b: '#fff1d8', ear: 'tiny', x: ['cheeks'], tail: 'none' },
    marmut: { c: '#f2c98e', b: '#ffffff', ear: 'tiny', x: ['cheeks'], tail: 'none' },
    capybara: { c: '#d99a5a', b: '#d99a5a', ear: 'tiny', x: ['orange'], eyes: 'sleepy', tail: 'none' },
    kudanil: { c: '#efd2c8', b: '#efd2c8', ear: 'tiny', x: ['bigsnout'], tail: 'short' },
    bekantan: { c: '#f4b246', b: '#f8e2b4', ear: 'tiny', x: ['bignose'], muzzle: false, tail: 'long' },
    rakun: { c: '#a9b2c4', b: '#ffffff', ear: 'round', ei: '#ffffff', x: ['mask'], tail: 'ring', eyes: 'sad' },
    gorila: { c: '#5f6372', b: '#c9d2e8', ear: 'tiny', x: ['face'], face: '#c9d2e8', tail: 'none', eyes: 'sad' },
    monyet: { c: '#d9b07a', b: '#fbf1e2', ear: 'monkey', x: ['face'], face: '#fbf1e2', tail: 'long', eyes: 'sad' },
    orangutan: { c: '#ff8a26', b: '#f8d2b0', ear: 'monkey', x: ['face', 'tuft'], face: '#f8d2b0', tail: 'none' },
    owa: { c: '#9b7b65', b: '#efdccb', ear: 'tiny', x: ['ring'], tail: 'none', eyes: 'sad' },
    panda: { c: '#eef3fb', b: '#ffffff', ear: 'round', ei: '#3a3d48', x: ['patches'], limb: '#3a3d48', tail: 'none' },
    koala: { c: '#aeb8d2', b: '#ffffff', ear: 'fluffy', x: ['koalanose'], muzzle: false, tail: 'none', eyes: 'sad' },
    badak: { c: '#e8eef8', b: '#f4f6fb', ear: 'point', ei: '#f2b8c6', x: ['horn'], tail: 'short' },
    badakjawa: { c: '#9aa1aa', b: '#e3e5e8', ear: 'point', ei: '#f2b8c6', x: ['horn1'], tail: 'short' },
    kambing: { c: '#eef3fb', b: '#ffffff', ear: 'side', x: ['horns'], hc: '#e3d6b0', tail: 'short' },
    sapi: { c: '#f2f5fb', b: '#f6c9d8', ear: 'side', x: ['horns', 'cowspots'], hc: '#efe6cc', sc: '#6b3d1f', tail: 'tuft' },
    kerbau: { c: '#4b4d54', b: '#8d9095', ear: 'side', x: ['bighorns'], hc: '#ece4d0', tail: 'tuft' },
    anoa: { c: '#4a2c22', b: '#7a4c34', ear: 'side', x: ['horns'], hc: '#2a1a14', feet: '#efe6da', tail: 'short' },
    kuda: { c: '#d9a46a', b: '#f6ece0', ear: 'point', x: ['horsemane', 'bigsnout'], mane: '#7a4a2a', tail: 'horse' },
    unta: { c: '#f0cf98', b: '#ffffff', ear: 'tiny', x: ['hump', 'bigsnout'], tail: 'tuft' },
    jerapah: { c: '#f7eeb8', b: '#ffffff', ear: 'side', x: ['neck', 'ossicones', 'spots'], sc: '#d8954a', tail: 'tuft' },
    hyena: { c: '#f2e6b8', b: '#7d7468', ear: 'point', x: ['spots', 'tuftmane'], sc: '#8a8070', tail: 'tuft', eyes: 'sad' },
    kanguru: { c: '#f0cf98', b: '#ffffff', ear: 'bigpoint', x: ['pouch'], tail: 'thick', eyes: 'sad' },
    tupai: { c: '#e8b47a', b: '#ffffff', ear: 'point', x: ['cheeks'], tail: 'squirrel', eyes: 'sad' },
    chinchilla: { c: '#b8bcc4', b: '#ececec', ear: 'biground', ei: '#f2a8b8', eyes: 'dot', muzzle: false, tail: 'puff' },
    sugarglider: { c: '#b8bcc4', b: '#ece8e0', ear: 'biground', ei: '#f2a8b8', eyes: 'dot', x: ['glider'], muzzle: false, tail: 'long' },
    axolotl: { c: '#f3d6ec', b: '#ffffff', ear: 'none', x: ['gills'], eyes: 'dot', muzzle: false, tail: 'long', smile: true },
    buaya: { c: '#8fdc8f', b: '#f2f7e8', ear: 'none', x: ['croc'], eyes: 'dot', muzzle: false, tail: 'thick' },
    trex: { c: '#a3e0aa', b: '#f2f7e8', ear: 'none', x: ['croc'], eyes: 'dot', muzzle: false, tail: 'thick', tinyArms: true },
    platipus: { c: '#c49a72', b: '#ffffff', ear: 'none', x: ['bill'], eyes: 'sad', muzzle: false, tail: 'flat' },
    trenggiling: { c: '#e2cba4', b: '#ffffff', ear: 'tiny', x: ['scales'], sc: '#a8794a', eyes: 'sad', tail: 'thick' },
    landak: { c: '#7a4a2a', b: '#efe4d0', ear: 'none', x: ['quills'], eyes: 'dot', muzzle: false, tail: 'none' },
    // burung
    burung: { k: 'bird', c: '#4fb3a8', head: '#4fb3a8', belly: '#f6dcb0', beak: '#f5b432' },
    elang: { k: 'bird', c: '#c86f2e', head: '#f4ecd2', beak: '#f5c542' },
    rangkong: { k: 'bird', c: '#3a302c', head: '#3a302c', belly: '#f6e6c8', beak: '#f5c542', x: ['casque'] },
    cendrawasih: { k: 'bird', c: '#d9732a', head: '#f4df3a', belly: '#5fcf6a', beak: '#efe0c0' },
    kakatua: { k: 'bird', c: '#f3ead2', head: '#f3ead2', beak: '#555a60', x: ['crest'], crest: '#f6d03a' },
    garuda: { k: 'bird', c: '#e89a4a', head: '#f6e58a', beak: '#f2d06a', x: ['crest'], crest: '#f2a040' },
    burunghantu: { k: 'bird', c: '#b08a64', head: '#b08a64', belly: '#ffffff', beak: '#f2d06a', x: ['owl'] },
    ayam: { k: 'bird', c: '#f2f6fb', head: '#f2f6fb', beak: '#f5c542', x: ['comb'] },
    angsa: { k: 'bird', c: '#e6f0fb', head: '#e6f0fb', beak: '#f5c542' },
    kalkun: { k: 'bird', c: '#9a6a44', head: '#a8d2f2', beak: '#f5d06a', x: ['fan', 'wattle'], fan: '#e8d2a0' },
    kasuari: { k: 'bird', c: '#3a3d48', head: '#4f9be8', beak: '#7a7f88', x: ['casquebone', 'wattle'] },
    merak: { k: 'bird', c: '#3f7fe0', head: '#3f7fe0', beak: '#efe6d0', x: ['peacock', 'crest'], crest: '#3f7fe0' },
    pinguin: { k: 'bird', c: '#1f2a44', head: '#1f2a44', belly: '#ffffff', beak: '#f5a532', x: ['penguin'], eyes: 'big' },
    // khusus
    egg: { k: 'egg' }, ular: { k: 'snake', c: '#9fe08a' }, ikanember: { k: 'fish' }, kupukupu: { k: 'butterfly' },
    cicak: { k: 'lizard', c: '#dcd9bf' }, komodo: { k: 'lizard', c: '#8d8a5c' }, orca: { k: 'orca' },
    // spesies baru dari data warga
    berangberang: { c: '#8a5a3a', b: '#e9d2b4', ear: 'tiny', tail: 'long' },
    zebra: { c: '#f6f6f6', b: '#ffffff', ear: 'point', x: ['stripes', 'horsemane', 'bigsnout'], sc: '#26262e', mane: '#26262e', tail: 'horse' },
    kurakura: { k: 'lizard', c: '#a8cf72', shell: '#8a5a32' }, penyu: { k: 'lizard', c: '#8fcab8', shell: '#4f8a6a' },
    phoenix: { k: 'bird', c: '#e8562e', head: '#f6a23a', beak: '#f5c542' }
  };

  let MG = null; // geometri dasar
  function mgInit() {
    MG = {
      sph: new THREE.SphereGeometry(1, 12, 9), cyl: new THREE.CylinderGeometry(1, 1, 1, 8), cone: new THREE.ConeGeometry(1, 1, 8),
      arc: new THREE.TorusGeometry(1, .26, 6, 14, Math.PI), ring: new THREE.TorusGeometry(1, .3, 8, 20)
    };
    _e = new THREE.Euler(); _q = new THREE.Quaternion();
    _M = new THREE.Matrix4(); _L = new THREE.Matrix4(); _R = new THREE.Matrix4(); _T = new THREE.Matrix4(); _Q = new THREE.Quaternion(); _V = new THREE.Vector3(); _Vs = new THREE.Vector3(); _Eu = new THREE.Euler();
  }
  const _mm = () => new THREE.Matrix4(); let _e, _q;
  function prim(type, col, p, s, r) {
    const g = MG[type].clone();
    const m = _mm().compose(new THREE.Vector3(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0)), new THREE.Vector3(s[0], s[1], s[2]));
    g.applyMatrix4(m);
    const c = C(col), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g;
  }
  function merge(list) {
    if (!list.length) return null;
    let nv = 0, ni = 0; list.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni);
    let vo = 0, io = 0;
    list.forEach(g => {
      pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); col.set(g.attributes.color.array, vo * 3);
      const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[io + i] = ia[i] + vo;
      vo += g.attributes.position.count; io += ia.length; g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere();
    return out;
  }
  const E = (col, p, s, r) => prim('sph', col, p, s, r);
  function shade(hex, k) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return '#' + c.getHexString(); }

  // wajah umum: mata, pipi, mulut
  function face(T, s, y, z, w) {
    const eyes = s.eyes || 'happy';
    [-1, 1].forEach(d => {
      if (eyes === 'happy') T.push(prim('arc', INK, [d * .13 * w, y + .06, z], [.05, .05, .05], [0, d * .35, 0]));
      else if (eyes === 'sad') T.push(prim('arc', INK, [d * .13 * w, y + .085, z], [.045, .045, .045], [0, d * .35, Math.PI + d * .35]));
      else if (eyes === 'sleepy') T.push(E(INK, [d * .13 * w, y + .06, z], [.05, .012, .02], [0, d * .35, 0]));
      else { const big = eyes === 'big' ? 1.35 : 1; T.push(E(eyes === 'big' ? '#ffffff' : INK, [d * .13 * w, y + .06, z - .01], [.055 * big, .065 * big, .03], [0, d * .3, 0])); if (eyes === 'big') T.push(E(INK, [d * .13 * w, y + .055, z + .012], [.035, .045, .02])); T.push(E('#ffffff', [d * .13 * w + .018, y + .085, z + .02], [.016, .016, .01])); }
      T.push(E(PINK, [d * .22 * w, y - .03, z - .06], [.06, .035, .02], [0, d * .6, 0]));
    });
  }
  function earPair(T, s, hy) {
    const c = s.c, ei = s.ei || PINK, e = s.ear || 'round';
    [-1, 1].forEach(d => {
      if (e === 'round') { T.push(E(c, [d * .26, hy + .26, -.03], [.1, .1, .06])); T.push(E(ei, [d * .26, hy + .26, .015], [.06, .06, .03])); }
      if (e === 'biground') { T.push(E(c, [d * .28, hy + .3, -.03], [.15, .15, .06])); T.push(E(ei, [d * .28, hy + .3, .02], [.1, .1, .03])); }
      if (e === 'tiny') T.push(E(c, [d * .22, hy + .26, -.02], [.06, .05, .04]));
      if (e === 'monkey') { T.push(E(c, [d * .38, hy, 0], [.1, .1, .06], [0, d * .4, 0])); T.push(E(s.face || '#fbe6c8', [d * .39, hy, .03], [.06, .06, .03], [0, d * .4, 0])); }
      if (e === 'point' || e === 'bigpoint') { const k = e === 'bigpoint' ? 1.35 : 1; T.push(prim('cone', c, [d * .22, hy + .3 * k, -.02], [.1 * k, .2 * k, .05 * k], [0, 0, -d * .3])); T.push(prim('cone', ei, [d * .215, hy + .29 * k, .015], [.06 * k, .13 * k, .02], [0, 0, -d * .3])); }
      if (e === 'long') { T.push(E(c, [d * .12, hy + .42, -.02], [.065, .23, .05], [0, 0, -d * .08])); T.push(E(ei, [d * .12, hy + .42, .02], [.035, .18, .02], [0, 0, -d * .08])); }
      if (e === 'side') { T.push(E(c, [d * .38, hy + .12, 0], [.13, .065, .05], [0, 0, d * .35])); T.push(E(ei, [d * .385, hy + .12, .03], [.08, .035, .02], [0, 0, d * .35])); }
      if (e === 'elephant') { T.push(E(c, [d * .4, hy - .02, -.04], [.22, .24, .05], [0, d * .5, 0])); T.push(E('#f2a0a0', [d * .41, hy - .02, .0], [.15, .17, .03], [0, d * .5, 0])); }
      if (e === 'fluffy') { T.push(E(c, [d * .34, hy + .2, -.03], [.16, .16, .07])); T.push(E('#ffffff', [d * .35, hy + .2, .02], [.1, .1, .03])); }
    });
  }
  function tailOf(T, s, y) {
    const c = s.c, t = s.tail || 'short';
    if (t === 'long') { for (let i = 0; i < 6; i++) T.push(E(i === 5 && s.x && s.x.includes('stripes') ? s.sc : c, [.04 * Math.sin(i), y - .05 + i * .045, -.25 - i * .055], [.045, .045, .045])); }
    if (t === 'short') T.push(E(c, [0, y + .02, -.27], [.06, .06, .07]));
    if (t === 'puff') T.push(E('#ffffff', [0, y, -.26], [.08, .08, .08]));
    if (t === 'tuft') { for (let i = 0; i < 4; i++) T.push(E(c, [0, y + i * .03, -.26 - i * .05], [.035, .035, .035])); T.push(E(s.mane || shade(c, -.25), [0, y + .13, -.47], [.06, .07, .06])); }
    if (t === 'fluffy') T.push(E(c, [.05, y + .05, -.33], [.1, .1, .2], [.6, .3, 0])), T.push(E('#ffffff', [.08, y + .14, -.45], [.07, .07, .08]));
    if (t === 'ring') for (let i = 0; i < 5; i++) T.push(E(i % 2 ? '#4a4f5c' : c, [0, y + i * .05, -.27 - i * .045], [.065, .065, .065]));
    if (t === 'thick') { T.push(E(c, [0, y - .08, -.3], [.12, .1, .2], [.3, 0, 0])); T.push(E(c, [0, y - .14, -.46], [.07, .06, .12], [.2, 0, 0])); }
    if (t === 'squirrel') { T.push(E(c, [0, y + .12, -.32], [.13, .22, .12], [-.3, 0, 0])); T.push(E(c, [0, y + .34, -.26], [.11, .12, .1])); }
    if (t === 'horse') T.push(E(s.mane, [0, y - .02, -.3], [.06, .16, .06], [.5, 0, 0]));
    if (t === 'flat') T.push(E(shade(c, -.1), [0, y - .12, -.3], [.12, .03, .14]));
  }

  function bearModel(s) {
    const T = [], AL = [], AR = [], LL = [], LR = [];
    const c = s.c, b = s.b, x = s.x || [], limb = s.limb || c, feet = s.feet || (s.limb ? s.limb : b);
    const neck = x.includes('neck'), hy = neck ? 1.02 : .74;
    // kaki (pivot di pinggul)
    [[LL, -1], [LR, 1]].forEach(([L, d]) => { L.push(E(limb, [0, -.09, 0], [.1, .12, .1])); L.push(E(feet, [0, -.17, .035], [.105, .065, .13])); });
    // tangan (pivot di bahu)
    const ar = s.tinyArms ? .6 : 1;
    [[AL, -1], [AR, 1]].forEach(([A, d]) => { A.push(E(limb, [d * .03, -.08 * ar, .02], [.075 * ar, .12 * ar, .075 * ar])); A.push(E(s.limb ? s.limb : b, [d * .035, -.18 * ar, .03], [.068 * ar, .06 * ar, .068 * ar])); });
    // badan
    T.push(E(c, [0, .36, 0], [.27, .27, .25]));
    if (b !== c) T.push(E(b, [0, .34, .13], [.19, .19, .12]));
    if (neck) { T.push(E(c, [0, .66, .02], [.12, .3, .12])); }
    // kepala
    T.push(E(c, [0, hy, 0], [.37, .34, .33]));
    if (x.includes('face')) T.push(E(s.face, [0, hy - .04, .15], [.28, .25, .2]));
    if (s.muzzle !== false && !x.includes('face')) T.push(E(b, [0, hy - .07, .26], [.15, .11, .09]));
    if (x.includes('face')) T.push(E(shade(s.face, -.05), [0, hy - .1, .3], [.12, .08, .06]));
    if (x.includes('bigsnout')) T.push(E(b, [0, hy - .09, .26], [.22, .14, .13]));
    // hidung & mulut
    if (s.muzzle !== false || x.includes('face')) T.push(E(x.includes('bigsnout') ? MOUTH : '#d9605a', [0, hy - .03, .34], [.045, .035, .03]));
    if (!x.includes('croc') && !x.includes('bill')) { T.push(E(MOUTH, [0, hy - .11, .33], [.042, .036, .02])); if (!s.smile) T.push(E('#f08a9a', [0, hy - .12, .345], [.026, .015, .01])); }
    face(T, s, hy, .3, 1);
    earPair(T, s, hy);
    // ekstra
    if (x.includes('stripes')) { [[0, hy + .3, .12, 0], [-.1, hy + .28, .1, .3], [.1, hy + .28, .1, -.3]].forEach(([px, py, pz, r]) => T.push(E(s.sc, [px, py, pz], [.025, .06, .03], [0, 0, r]))); [-1, 1].forEach(d => { T.push(E(s.sc, [d * .35, hy + .02, .06], [.02, .05, .06], [0, 0, d * .5])); T.push(E(s.sc, [d * .35, hy - .06, .04], [.02, .045, .05], [0, 0, d * .3])); T.push(E(s.sc, [d * .26, .4, .06], [.02, .06, .06])); T.push(E(s.sc, [d * .27, .3, .04], [.02, .05, .05])); }); }
    if (x.includes('spots') || x.includes('bigspots')) { const r = rng(hash(c + x.join())), k = x.includes('bigspots') ? 1.8 : 1; for (let i = 0; i < 16; i++) { const a = r() * 6.28, up = r(); const onHead = i < 9; const cy = onHead ? hy : .38, rad = onHead ? .35 : .26; const px = Math.cos(a) * rad * .9, pz = Math.abs(Math.sin(a)) * rad * (up > .5 ? .2 : -.8); T.push(E(s.sc, [px, cy + (r() - .3) * .25, pz], [.025 * k, .025 * k, .025 * k])); } }
    if (x.includes('cowspots')) { T.push(E(s.sc, [.2, .42, .1], [.08, .08, .06])); T.push(E(s.sc, [-.22, hy + .15, .12], [.08, .07, .06])); T.push(E(s.sc, [.12, .3, -.18], [.08, .08, .06])); }
    if (x.includes('mane')) { for (let i = 0; i < 13; i++) { const a = i / 13 * 6.28; T.push(E(s.mane, [Math.cos(a) * .38, hy + .02 + Math.sin(a) * .34, -.07], [.15, .15, .13])); } }
    if (x.includes('horsemane')) for (let i = 0; i < 4; i++) T.push(E(s.mane, [0, hy + .3 - i * .02, .05 - i * .12], [.07, .07, .07]));
    if (x.includes('tuftmane')) for (let i = 0; i < 3; i++) T.push(E('#8a8070', [0, hy + .33, .1 - i * .1], [.07, .06, .07]));
    if (x.includes('trunk')) for (let i = 0; i < 5; i++) T.push(E(c, [0, hy - .06 - i * .07, .3 + i * .035 - (i > 3 ? .02 : 0)], [.075 - i * .006, .06, .07 - i * .005]));
    if (x.includes('chest')) T.push(E('#f3c060', [0, .52, .21], [.17, .045, .05]));
    if (x.includes('antlers')) [-1, 1].forEach(d => { T.push(prim('cyl', '#f2e2be', [d * .14, hy + .4, -.02], [.025, .22, .025], [0, 0, -d * .25])); T.push(prim('cyl', '#f2e2be', [d * .21, hy + .48, -.02], [.02, .12, .02], [0, 0, -d * .9])); T.push(prim('cyl', '#f2e2be', [d * .12, hy + .52, -.02], [.02, .1, .02], [0, 0, d * .3])); });
    if (x.includes('horns')) [-1, 1].forEach(d => T.push(prim('cone', s.hc, [d * .13, hy + .34, -.02], [.04, .14, .04], [0, 0, -d * .25])));
    if (x.includes('bighorns')) [-1, 1].forEach(d => T.push(prim('arc', s.hc, [d * .28, hy + .22, -.04], [.14, .14, .14], [0, 0, d < 0 ? .3 : -.3])));
    if (x.includes('horn')) { T.push(prim('cone', '#d9c9a0', [0, hy + .05, .38], [.06, .18, .06], [1.2, 0, 0])); T.push(prim('cone', '#d9c9a0', [0, hy + .17, .3], [.04, .1, .04], [.9, 0, 0])); }
    if (x.includes('horn1')) T.push(prim('cone', '#d9c9a0', [0, hy + .06, .37], [.055, .15, .055], [1.1, 0, 0]));
    if (x.includes('ossicones')) [-1, 1].forEach(d => { T.push(prim('cyl', c, [d * .1, hy + .36, 0], [.025, .12, .025])); T.push(E('#a86b33', [d * .1, hy + .43, 0], [.04, .04, .04])); });
    if (x.includes('hump')) T.push(E(c, [0, .55, -.14], [.17, .15, .14]));
    if (x.includes('cheeks')) [-1, 1].forEach(d => T.push(E('#ffffff', [d * .2, hy - .08, .2], [.12, .1, .08])));
    if (x.includes('orange')) { T.push(E('#ff9a1e', [0, hy + .38, 0], [.09, .08, .09])); T.push(E('#3fae55', [.03, hy + .47, 0], [.03, .015, .05])); }
    if (x.includes('bignose')) T.push(E('#f2a07a', [0, hy - .04, .36], [.08, .12, .07]));
    if (x.includes('mask')) [-1, 1].forEach(d => T.push(E('#4a4f5c', [d * .13, hy + .06, .27], [.1, .07, .05], [0, d * .3, 0])));
    if (x.includes('patches')) [-1, 1].forEach(d => T.push(E('#3a3d48', [d * .13, hy + .05, .27], [.08, .095, .05], [0, d * .3, d * -.4])));
    if (x.includes('koalanose')) T.push(E('#5a3a2a', [0, hy - .02, .33], [.09, .12, .07]));
    if (x.includes('ring')) for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; T.push(E('#ffffff', [Math.cos(a) * .27, hy - .02 + Math.sin(a) * .26, .2], [.06, .06, .05])); }
    if (x.includes('tuft')) for (let i = 0; i < 4; i++) T.push(E(c, [(i - 1.5) * .06, hy + .34 + (i % 2) * .05, .02], [.05, .1, .05], [0, 0, (i - 1.5) * .2]));
    if (x.includes('pouch')) T.push(E('#ffffff', [0, .28, .2], [.15, .1, .06]));
    if (x.includes('glider')) [-1, 1].forEach(d => T.push(E(shade(c, -.05), [d * .3, .38, 0], [.08, .16, .14])));
    if (x.includes('gills')) [-1, 1].forEach(d => { for (let i = 0; i < 3; i++) T.push(prim('cyl', '#f08cbf', [d * (.36 + .06), hy + .1 - i * .1, -.02], [.025, .2, .025], [0, 0, d * (1.3 - i * .25)])); });
    if (x.includes('croc')) { T.push(E(c, [0, hy - .08, .24], [.25, .14, .2])); T.push(E(b, [0, hy - .13, .3], [.22, .04, .14])); [-1, 1].forEach(d => T.push(E('#3a2a20', [d * .06, hy - .02, .42], [.015, .015, .01]))); }
    if (x.includes('bill')) T.push(E('#5a6378', [0, hy - .06, .36], [.17, .045, .13]));
    if (x.includes('scales')) for (let i = 0; i < 4; i++) T.push(E(s.sc, [0, .5 - i * .1, -.16 - i * .02], [.24 - i * .02, .05, .12], [.4, 0, 0]));
    if (x.includes('quills')) { const r = rng(9); for (let i = 0; i < 30; i++) { const a = r() * 6.28, up = r() * 1.2; const px = Math.cos(a) * .32, pz = Math.sin(a) * .3 - .06, py = .35 + up * .45; T.push(prim('cone', i % 3 ? '#5a3420' : '#efe0c0', [px, py, Math.min(pz, .05)], [.04, .2, .04], [Math.sin(a) * -1, 0, -Math.cos(a) * 1.1 + (up - .6) * .4])); } T.push(E(b, [0, hy - .05, .2], [.24, .22, .16])); }
    tailOf(T, s, .26);
    return { T, AL, AR, LL, LR, pivots: { al: [-.25, .48, 0], ar: [.25, .48, 0], ll: [-.13, .2, 0], lr: [.13, .2, 0] }, head: neck ? 1.42 : 1.12, axis: 'x' };
  }
  function birdModel(s) {
    const T = [], AL = [], AR = [], LL = [], LR = [], x = s.x || [];
    const peng = x.includes('penguin');
    [[LL, -1], [LR, 1]].forEach(([L]) => { if (!peng) L.push(prim('cyl', s.beak, [0, -.05, 0], [.022, .1, .022])); L.push(E(peng ? s.beak : s.beak, [0, -.1, .04], [.06, .025, .08])); });
    T.push(E(s.c, [0, .36, 0], [.29, .3, .27]));
    if (s.belly) T.push(E(s.belly, [0, .33, .13], [.21, .23, .14]));
    const hy = .73;
    T.push(E(s.head, [0, hy, 0], [.31, .3, .29]));
    if (peng) [-1, 1].forEach(d => T.push(E('#ffffff', [d * .11, hy + .03, .2], [.12, .13, .1])));
    if (x.includes('owl')) [-1, 1].forEach(d => { T.push(E('#f2e68a', [d * .12, hy + .03, .21], [.12, .12, .08])); T.push(prim('cone', s.c, [d * .2, hy + .3, 0], [.06, .12, .04], [0, 0, -d * .4])); });
    T.push(prim('cone', s.beak, [0, hy - .04, .32], [.065, .14, .065], [Math.PI / 2, 0, 0]));
    face(T, { eyes: s.eyes || 'dot' }, hy, .25, .95);
    if (x.includes('crest')) for (let i = 0; i < 3; i++) T.push(E(s.crest, [(i - 1) * .05, hy + .36 + (i === 1 ? .05 : 0), -.02], [.04, .13, .04], [0, 0, (1 - i) * .3]));
    if (x.includes('comb')) for (let i = 0; i < 3; i++) T.push(E('#e2483a', [0, hy + .3, .08 - i * .07], [.04, .06, .04]));
    if (x.includes('wattle')) T.push(E('#e2483a', [0, hy - .15, .3], [.035, .07, .03]));
    if (x.includes('casque')) T.push(E('#f6b33a', [0, hy + .12, .24], [.06, .07, .14], [.4, 0, 0]));
    if (x.includes('casquebone')) T.push(E('#cbb68a', [0, hy + .32, .02], [.07, .13, .1]));
    if (x.includes('fan')) for (let i = 0; i < 7; i++) { const a = (i - 3) * .32; T.push(E(i % 2 ? s.fan : shade(s.fan, -.15), [Math.sin(a) * .32, .45 + Math.cos(a) * .32, -.25], [.08, .16, .03], [0, 0, -a])); }
    if (x.includes('peacock')) for (let i = 0; i < 11; i++) { const a = (i - 5) * .26; const px = Math.sin(a) * .5, py = .42 + Math.cos(a) * .45; T.push(E('#3fae55', [px, py, -.28], [.11, .11, .03])); T.push(E('#f6d03a', [px, py, -.255], [.05, .05, .02])); T.push(E('#2f4fd0', [px, py, -.24], [.025, .025, .015])); }
    if (!x.includes('peacock') && !x.includes('fan')) T.push(E(s.c, [0, .3, -.27], [.1, .05, .1], [-.5, 0, 0]));
    const wc = peng ? s.c : shade(s.c, -.06);
    [[AL, -1], [AR, 1]].forEach(([A, d]) => A.push(E(wc, [d * .04, -.12, 0], [.07, .19, .15], [0, 0, d * .2])));
    return { T, AL, AR, LL, LR, pivots: { al: [-.27, .52, 0], ar: [.27, .52, 0], ll: [-.09, .12, 0], lr: [.09, .12, 0] }, head: 1.08, axis: peng ? 'x' : 'z' };
  }
  function lizardModel(s) {
    const T = [], AL = [], AR = [], LL = [], LR = [], c = s.c;
    T.push(E(c, [0, .2, 0], [.24, .16, .36]));
    if (s.shell) { T.push(E(s.shell, [0, .3, -.02], [.32, .2, .42])); T.push(E(shade(s.shell, -.12), [0, .42, -.02], [.18, .06, .24])); }
    T.push(E(c, [0, .26, .38], [.25, .2, .22]));
    T.push(E(shade(c, .08), [0, .19, .42], [.2, .1, .18]));
    [-1, 1].forEach(d => { T.push(E('#ffffff', [d * .12, .36, .48], [.07, .08, .05])); T.push(E(INK, [d * .12, .36, .52], [.045, .055, .03])); T.push(E('#ffffff', [d * .135, .385, .545], [.014, .014, .01])); T.push(E(PINK, [d * .18, .26, .5], [.04, .025, .015])); });
    if (s.c === '#8d8a5c') T.push(prim('cyl', '#e6c860', [0, .14, .66], [.012, .12, .012], [1.4, 0, 0]));
    for (let i = 0; i < 6; i++) T.push(E(c, [Math.sin(i * .6) * .06, .16 - i * .01, -.36 - i * .1], [.11 - i * .015, .08 - i * .008, .1]));
    [[AL, -1], [AR, 1], [LL, -1], [LR, 1]].forEach(([L, d]) => { L.push(E(c, [d * .07, -.04, 0], [.1, .05, .05], [0, 0, d * .5])); L.push(E(PINK, [d * .14, -.1, .03], [.04, .02, .04])); });
    return { T, AL, AR, LL, LR, pivots: { al: [-.2, .16, .22], ar: [.2, .16, .22], ll: [-.2, .16, -.2], lr: [.2, .16, -.2] }, head: .62, axis: 'x' };
  }
  function specialModel(k) {
    const T = [], AL = [], AR = [], LL = [], LR = [];
    let head = 1, axis = 'x', pv = { al: [-.25, .5, 0], ar: [.25, .5, 0], ll: [-.12, .2, 0], lr: [.12, .2, 0] };
    if (k === 'egg') { T.push(E('#ffd8ac', [0, .42, 0], [.3, .42, .3])); const r = rng(3); for (let i = 0; i < 9; i++) { const a = r() * 6.28, y = .2 + r() * .45; T.push(E('#9fd86a', [Math.cos(a) * .29, y, Math.sin(a) * .29], [.06, .06, .06])); } head = .9; }
    if (k === 'snake') {
      // badan dibagi dua ruas (tengah & ekor) supaya bisa meliuk saat merayap
      const c = '#9fe08a', P1 = [0, .1, -.08], P2 = [0, .1, -.36];
      for (let i = 0; i < 9; i++) { const a = i * .8, p = [Math.sin(a) * .12, .1, -.08 - i * .07]; const L = i < 4 ? LL : LR, pv0 = i < 4 ? P1 : P2; L.push(E(i % 2 ? c : '#ecf2c8', [p[0] - pv0[0], p[1] - pv0[1], p[2] - pv0[2]], [.13 - i * .006, .1, .13])); }
      pv = { al: [0, 0, 0], ar: [0, 0, 0], ll: P1, lr: P2 }; axis = 'snake'; T.push(E(c, [0, .3, .1], [.13, .2, .13])); T.push(E(c, [0, .55, .14], [.25, .2, .22])); face(T, { eyes: 'dot' }, .55, .32, 1); T.push(E(MOUTH, [0, .48, .35], [.04, .03, .02])); T.push(E('#f08a9a', [0, .45, .37], [.015, .04, .01])); head = .8; }
    if (k === 'fish') { T.push(prim('cyl', '#f2a050', [0, .2, 0], [.32, .4, .32])); T.push(prim('ring', '#c9783a', [0, .4, 0], [.32, .32, .32], [Math.PI / 2, 0, 0])); T.push(prim('ring', '#c9783a', [0, .02, 0], [.32, .32, .32], [Math.PI / 2, 0, 0])); T.push(E('#5fb8a8', [0, .55, 0], [.27, .3, .25])); T.push(E('#f6e2c0', [0, .46, .14], [.2, .1, .1])); face(T, { eyes: 'dot' }, .62, .22, .9); for (let i = 0; i < 4; i++) T.push(E('#ffffff', [(i - 1.5) * .045, .5, .25], [.018, .028, .01])); T.push(prim('cone', '#f29a7a', [0, .88, -.02], [.04, .1, .03])); head = 1; }
    if (k === 'butterfly') { T.push(E('#6a5a9a', [0, .4, 0], [.07, .3, .07])); T.push(E('#6a5a9a', [0, .74, 0], [.13, .13, .12])); face(T, { eyes: 'dot' }, .72, .1, .5); [-1, 1].forEach(d => { T.push(prim('cyl', '#6a5a9a', [d * .05, .95, 0], [.01, .2, .01], [0, 0, -d * .3])); T.push(E('#6a5a9a', [d * .08, 1.05, 0], [.03, .03, .03])); }); [[AL, -1], [AR, 1]].forEach(([A, d]) => { A.push(E('#f2b860', [d * .25, .12, 0], [.25, .2, .03])); A.push(E('#ffffff', [d * .27, .14, .02], [.06, .06, .01])); A.push(E('#8ad0f5', [d * .18, -.15, 0], [.16, .14, .03])); }); pv = { al: [-.05, .45, 0], ar: [.05, .45, 0], ll: [0, 0, 0], lr: [0, 0, 0] }; axis = 'y'; head = 1.1; }
    if (k === 'orca') { T.push(E('#1d1f26', [0, .42, 0], [.32, .42, .3])); T.push(E('#f4f4f4', [0, .3, .14], [.21, .26, .17])); T.push(E('#f4f4f4', [0, .55, .2], [.22, .1, .1])); [-1, 1].forEach(d => T.push(E('#f4f4f4', [d * .14, .72, .2], [.09, .05, .06]))); face(T, { eyes: 'dot' }, .64, .28, .9); T.push(prim('cone', '#1d1f26', [0, .9, -.02], [.06, .18, .03])); [[AL, -1], [AR, 1]].forEach(([A, d]) => A.push(E('#1d1f26', [d * .06, -.08, 0], [.08, .16, .05], [0, 0, d * .5]))); pv.al = [-.3, .42, 0]; pv.ar = [.3, .42, 0]; head = 1.02; }
    if (k === 'nyamuk') {
      const DK = '#3f4352', LG = '#2a2d38';
      T.push(E(DK, [0, .78, 0], [.17, .15, .19]));
      for (let i = 0; i < 4; i++) T.push(E(i % 2 ? '#eef0f6' : DK, [0, .74 - i * .035, -.2 - i * .1], [.12 - i * .015, .1 - i * .01, .1]));
      T.push(E(DK, [0, .86, .22], [.13, .13, .13]));
      [-1, 1].forEach(d => { T.push(E('#ffffff', [d * .07, .9, .31], [.06, .07, .04])); T.push(E(INK, [d * .07, .9, .345], [.035, .045, .02])); T.push(E('#ffffff', [d * .08, .92, .36], [.012, .012, .01])); T.push(prim('cyl', LG, [d * .05, 1.02, .28], [.008, .14, .008], [-.5, 0, -d * .4])); });
      T.push(prim('cyl', LG, [0, .8, .44], [.012, .22, .012], [1.35, 0, 0]));
      [-1, 1].forEach(d => [.12, 0, -.12].forEach(z => T.push(prim('cyl', LG, [d * .16, .55, z], [.009, .34, .009], [z * .8, 0, d * .55]))));
      [[AL, -1], [AR, 1]].forEach(([A, d]) => { A.push(E('#dff1fb', [d * .24, .04, -.06], [.26, .02, .11], [0, .25 * d, 0])); A.push(E('#f6fbff', [d * .2, .045, -.03], [.12, .02, .05])); });
      pv = { al: [-.08, .9, 0], ar: [.08, .9, 0], ll: [0, 0, 0], lr: [0, 0, 0] }; axis = 'z'; head = 1.05;
    }
    return { T, AL, AR, LL, LR, pivots: pv, head, axis };
  }
  const modelCache = {};
  function modelFor(key) {
    if (modelCache[key]) return modelCache[key];
    const s = SPEC[key] || SPEC.kucing;
    const raw = s.k === 'bird' ? birdModel(s) : s.k === 'lizard' ? lizardModel(s) : s.k ? specialModel(s.k) : bearModel(s);
    const m = { torso: merge(raw.T), al: merge(raw.AL), ar: merge(raw.AR), ll: merge(raw.LL), lr: merge(raw.LR), pivots: raw.pivots, head: raw.head, axis: raw.axis, egg: s.k === 'egg', still: s.k === 'egg' || s.k === 'fish' };
    // model diam lengkap (untuk ikon & instancing)
    modelCache[key] = m; return m;
  }
  let CHARMAT = null;
  function charMat() { if (!CHARMAT) CHARMAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: 0 }); return CHARMAT; }
  // karakter tunggal (pemain & kepala rimba)
  function buildRig(key) {
    const m = modelFor(key), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const add = (geo, pv) => { if (!geo) return null; const piv = new THREE.Group(); if (pv) piv.position.set(pv[0], pv[1], pv[2]); const me = new THREE.Mesh(geo, charMat()); me.castShadow = false; piv.add(me); body.add(piv); return piv; };
    add(m.torso, null);
    const rig = { root, body, m, al: add(m.al, m.pivots.al), ar: add(m.ar, m.pivots.ar), ll: add(m.ll, m.pivots.ll), lr: add(m.lr, m.pivots.lr), yaw: 0, ph: 0 };
    return rig;
  }
  function hat3d(id) {
    const g = new THREE.Group();
    if (id === 'daun') { g.add(new THREE.Mesh(merge([E('#3fae55', [0, .04, 0], [.28, .05, .18], [0, .3, .2]), prim('cyl', '#8a5530', [.1, .1, 0], [.012, .1, .012], [0, 0, -.5])]), charMat())); }
    if (id === 'bunga') { const L = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; L.push(E(['#ff9ec8', '#ffd23f', '#ffffff'][i % 3], [Math.cos(a) * .27, 0, Math.sin(a) * .25], [.07, .05, .07])); L.push(E('#e2483a', [Math.cos(a) * .27, .03, Math.sin(a) * .25], [.025, .025, .025])); } g.add(new THREE.Mesh(merge(L), charMat())); }
    if (id === 'caping') g.add(new THREE.Mesh(merge([prim('cone', '#e8c070', [0, .1, 0], [.5, .22, .5]), prim('ring', '#b8873a', [0, .03, 0], [.42, .42, .42], [Math.PI / 2, 0, 0])]), charMat()));
    if (id === 'mahkota') { const L = [prim('cyl', '#ffcf33', [0, .06, 0], [.2, .12, .2])]; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; L.push(prim('cone', '#ffcf33', [Math.cos(a) * .18, .17, Math.sin(a) * .18], [.05, .1, .05])); } L.push(E('#e2483a', [0, .08, .2], [.04, .04, .02])); g.add(new THREE.Mesh(merge(L), charMat())); }
    if (id === 'kacamata') { g.add(new THREE.Mesh(merge([prim('ring', INK, [-.13, -.3, .33], [.075, .075, .075]), prim('ring', INK, [.13, -.3, .33], [.075, .075, .075]), prim('cyl', INK, [0, -.3, .34], [.01, .08, .01], [0, 0, Math.PI / 2])]), charMat())); }
    return g;
  }
  // animasi satu rangka (dipakai juga untuk instancing)
  function rigPose(st, moving, dt, speed) {
    st.ph += dt * (moving ? 6 + speed / 30 : 2);
    const s = Math.sin(st.ph);
    if (moving) return { bob: Math.abs(Math.cos(st.ph)) * .05, sway: s * .05, leg: s * .6, arm: -s * .55, flap: Math.abs(s) * .5 };
    return { bob: Math.sin(st.ph) * .008, sway: 0, leg: 0, arm: Math.sin(st.ph * .8) * .05, flap: 0 };
  }
  function turnYaw(st, dx, dz, dt) {
    if (Math.abs(dx) + Math.abs(dz) > .0001) {
      const raw = Math.atan2(dx, dz), snap = Math.round(raw / (Math.PI / 4)) * (Math.PI / 4); // 8 arah
      st.yawT = snap;
    }
    if (st.yawT == null) st.yawT = 0;
    let d = st.yawT - st.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    st.yaw += d * Math.min(1, dt * 12);
  }
  function applyRig(rig, x, z, h, pose, egg) {
    rig.root.position.set(x, 0, z); rig.root.rotation.y = rig.yaw; rig.root.scale.setScalar(h);
    rig.body.position.y = pose.bob; rig.body.rotation.z = egg ? pose.arm * 2 : pose.sway;
    const ax = rig.m.axis;
    if (ax === 'snake') { const w = pose.leg + pose.arm * 3; if (rig.ll) rig.ll.rotation.y = w * .55; if (rig.lr) rig.lr.rotation.y = -w * .9; rig.body.rotation.y = w * .12; return; }
    if (rig.ll) rig.ll.rotation.x = pose.leg; if (rig.lr) rig.lr.rotation.x = -pose.leg;
    if (rig.al) { if (ax === 'z') { rig.al.rotation.z = -pose.flap; rig.ar.rotation.z = pose.flap; } else if (ax === 'y') { rig.al.rotation.y = pose.flap * 1.4 + .2; rig.ar.rotation.y = -pose.flap * 1.4 - .2; } else { rig.al.rotation.x = pose.arm; rig.ar.rotation.x = -pose.arm; } }
  }
  // warga: instancing per spesies (ringan untuk ratusan hewan)
  let speciesIM = {};
  function buildCrowd() {
    const groups = {};
    NPC.forEach(n => { const key = (S[n.m.s] || {}).img || 'kucing'; (groups[key] = groups[key] || []).push(n); });
    Object.entries(groups).forEach(([key, list]) => {
      const m = modelFor(key), parts = {};
      ['torso', 'al', 'ar', 'll', 'lr'].forEach(p => { if (!m[p]) return; const im = new THREE.InstancedMesh(m[p], charMat(), list.length); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; scene.add(im); parts[p] = im; });
      list.forEach((n, i) => { n.idx = i; n.key = key; n.st = { ph: Math.random() * 6, yaw: (Math.random() - .5) * 1.2, yawT: null }; n.px = n.x; n.py = n.y; });
      speciesIM[key] = { m, parts, list };
    });
  }
  let _M, _L, _R, _T, _Q, _V, _Vs, _Eu;
  let crowdTick = 0;
  function updateCrowd(dt) {
    crowdTick++;
    const R2 = Math.pow(Math.max(70, camBase * zoomZ * .9), 2);
    Object.values(speciesIM).forEach(G => {
      const m = G.m, ax = m.axis;
      G.list.forEach(n => {
        const ddx = n.x * U - camTarget.x, ddz = n.y * U - camTarget.z;
        if (ddx * ddx + ddz * ddz > R2 && (crowdTick + n.idx) % 4) { n.px = n.x; n.py = n.y; return; }
        const h = n.egg ? 3.2 : 4.4, dx = n.x - n.px, dz = n.y - n.py; n.px = n.x; n.py = n.y;
        if (!m.still) turnYaw(n.st, dx, dz, dt);
        const pose = rigPose(n.st, n.moving && !m.still, dt, n.sp || 30);
        const tilt = m.egg ? Math.sin(n.st.ph * 1.3) * .12 : pose.sway;
        _Q.setFromEuler(_Eu.set(0, n.st.yaw, tilt));
        _M.compose(_V.set(n.x * U, pose.bob * h, n.y * U), _Q, _Vs.set(h, h, h));
        G.parts.torso.setMatrixAt(n.idx, _M);
        const limb = (p, pv, rx, ry, rz) => {
          if (!G.parts[p]) return;
          _T.makeTranslation(pv[0], pv[1], pv[2]);
          _R.makeRotationFromEuler(_Eu.set(rx, ry, rz));
          _L.multiplyMatrices(_M, _T).multiply(_R);
          G.parts[p].setMatrixAt(n.idx, _L);
        };
        if (ax === 'snake') { const w = pose.leg + pose.arm * 3; limb('ll', m.pivots.ll, 0, w * .55, 0); limb('lr', m.pivots.lr, 0, -w * .9, 0); return; }
        limb('ll', m.pivots.ll, pose.leg, 0, 0); limb('lr', m.pivots.lr, -pose.leg, 0, 0);
        if (ax === 'z') { limb('al', m.pivots.al, 0, 0, -pose.flap); limb('ar', m.pivots.ar, 0, 0, pose.flap); }
        else if (ax === 'y') { limb('al', m.pivots.al, 0, pose.flap * 1.4 + .2, 0); limb('ar', m.pivots.ar, 0, -pose.flap * 1.4 - .2, 0); }
        else { limb('al', m.pivots.al, pose.arm, 0, 0); limb('ar', m.pivots.ar, -pose.arm, 0, 0); }
      });
      Object.values(G.parts).forEach(im => { im.instanceMatrix.needsUpdate = true; });
    });
  }

  function buildPlayerRig() {
    if (playerRig) scene.remove(playerRig.root);
    const key = save.guest ? 'nyamuk' : (S[save.s] || {}).img || 'kucing';
    playerRig = buildRig(key); playerRig.st = { ph: 0, yaw: 0, yawT: 0 };
    if (save.hat) { const hh = hat3d(save.hat); hh.position.set(0, playerRig.m.head - (save.hat === 'kacamata' ? -.02 : .06), 0); playerRig.body.add(hh); }
    scene.add(playerRig.root);
  }
  function refreshPlayer() { if (renderer && save) buildPlayerRig(); }

  // ---------- bangun dunia ----------
  async function buildWorld() {
    try { await document.fonts.load('700 40px "Courier Prime"'); } catch (e) {}
    GEO = { box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 16, 11), sphLo: new THREE.SphereGeometry(1, 12, 8), cyl: new THREE.CylinderGeometry(.8, 1, 1, 12), cone4: new THREE.ConeGeometry(1, 1, 4), cone: new THREE.ConeGeometry(1, 1, 14, 1, true) };
    const cv3 = $('hCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, powerPreference: 'high-performance' });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    scene = new THREE.Scene();
    const skyHex = '#c7ecb0';
    scene.background = C(skyHex); scene.fog = new THREE.Fog(C(skyHex), 120, 240);
    camera = new THREE.PerspectiveCamera(38, 1, 1, 600);
    hemiL = new THREE.HemisphereLight(C('#fff3dc'), C('#4f8f35'), .5); scene.add(hemiL);
    scene.add(new THREE.AmbientLight(C('#ffffff'), .08));
    sun = new THREE.DirectionalLight(C('#fff0d2'), .9);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -95; sc.right = 95; sc.top = 95; sc.bottom = -95; sc.near = 1; sc.far = 320;
    sun.shadow.bias = -.0006; sun.shadow.radius = 3;
    scene.add(sun); scene.add(sun.target);

    // tanah
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), mat('#6fcb3f', 1));
    ground.rotation.x = -Math.PI / 2; ground.position.set(W * U / 2, 0, 1300 * U); ground.receiveShadow = true; scene.add(ground);
    scene.add(flat(blobShape(-60, -100, 860, 2380, 90, 11), '#7fd448', .02));
    scene.add(flat(blobShape(940, -100, 2060, 1170, 90, 12), '#49ad3c', .03));
    scene.add(flat(blobShape(940, 1960, 2060, 2400, 90, 13), '#5fbd42', .03));
    scene.add(flat(blobShape(2140, -100, 3150, 2380, 110, 14), '#efcf7e', .03));
    const plaza = new THREE.Shape(); plaza.absellipse(1500 * U, -1575 * U, 500 * U, 410 * U, 0, Math.PI * 2, false, 0);
    scene.add(flat(plaza, '#8ddb5a', .05));
    // jalan setapak (titik-titik bulat yang menyatu)
    const dots = [];
    const road = (x0, y0, cx, cy, x1, y1, n, w) => { for (let i = 0; i <= n; i++) { const t2 = i / n, x = (1 - t2) ** 2 * x0 + 2 * (1 - t2) * t2 * cx + t2 * t2 * x1, y = (1 - t2) ** 2 * y0 + 2 * (1 - t2) * t2 * cy + t2 * t2 * y1; dots.push([x * U, .07, y * U, w, 1, w, C('#e3b874')]); } };
    road(SQ.x0, 1590, 800, 1600, 300, 1520, 160, 4.6);
    road(SQ.x1, 1590, 2200, 1600, 2720, 1520, 160, 4.6);
    road(1500, SQ.y1, 1520, 2150, 1500, 2560, 140, 4.6);
    road(1500, 1240, 1520, 800, 1500, 260, 150, 4.6);
    doorPaths().forEach(([x0, y0, x1, y1]) => road(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2, x1, y1, 24, 2.6));
    const disc = new THREE.CircleGeometry(1, 20); disc.rotateX(-Math.PI / 2);
    const pathIM = instanced(disc, dots, 1); pathIM.castShadow = false; scene.add(pathIM);
    // tepi sungai, sungai, dermaga
    scene.add(flat(waveShape(2430, WATER + 40, 16, 140, 0), '#f2dca6', .04));
    const water = flat(waveShape(WATER - 8, 3800, 12, 110, 1), '#4fb8ef', .09, .2); water.material = new THREE.MeshStandardMaterial({ color: C('#4fb8ef'), roughness: .18, metalness: .05 }); scene.add(water);
    const shallow = flat(waveShape(WATER + 6, WATER + 70, 12, 110, 1), '#86d4f6', .1); shallow.material = new THREE.MeshStandardMaterial({ color: C('#86d4f6'), roughness: .3, transparent: true, opacity: .7 }); scene.add(shallow);
    for (let i = 0; i < 9; i++) scene.add(box(9, .4, 2.6, '#b07a44', 1500 * U, .55, WATER * U - 3 + i * 3.4));
    [[-3.6, 0], [3.6, 0]].forEach(([dx]) => { for (let i = 0; i < 4; i++) scene.add(cyl(.35, 2.4, '#7a4527', 1500 * U + dx * 1.15, .6, WATER * U - 2 + i * 7)); });
    // bukit krem di tepi dunia (seperti render peta)
    const hills = [], hr = rng(5);
    for (let x = -400; x <= 3400; x += 120) hills.push([x * U, 0, -12 - hr() * 6, 15 + hr() * 6, 8 + hr() * 4, 10 + hr() * 4, C('#f0cfa6')]);
    for (let y = 60; y <= 2560; y += 120) { hills.push([-14 - hr() * 6, 0, y * U, 10 + hr() * 4, 7 + hr() * 4, 15 + hr() * 5, C('#f0cfa6')]); hills.push([W * U + 14 + hr() * 6, 0, y * U, 10 + hr() * 4, 7 + hr() * 4, 15 + hr() * 5, C('#f0cfa6')]); }
    const hillIM = instanced(GEO.sph, hills, 1); scene.add(hillIM);

    // lampu jalan & kunang-kunang untuk malam
    lampMat = new THREE.MeshStandardMaterial({ color: C('#fff3b0'), emissive: C('#ffcf6a'), emissiveIntensity: .15, roughness: .4 });
    const haloT = haloTex(); lampHalo = []; buildFireflies(haloT);
    // pohon & dekorasi
    const can = [], trk = [], r = rng(77);
    DECO.forEach(o => {
      if (o.k === 'house') scene.add(stiltHouse(o.x * U, o.y * U, o.roof));
      else if (o.k === 'bench') { const g = new THREE.Group(); g.add(box(4.2, .3, 1.2, '#b07a44', 0, 1, 0)); g.add(box(4.2, 1, .25, '#b07a44', 0, 1.6, -.5)); [-1.7, 1.7].forEach(dx => g.add(box(.3, 1, 1, '#7a4527', dx, .5, 0))); g.position.set(o.x * U, 0, o.y * U); scene.add(g); }
      else if (o.k === 'lamp') { const g = new THREE.Group(); g.add(cyl(.18, 5, '#3a3d48', 0, 2.5, 0)); const bulb = new THREE.Mesh(GEO.sph, lampMat); bulb.scale.setScalar(.6); bulb.position.y = 5.4; g.add(bulb); const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); halo.scale.set(6, 6, 1); halo.position.y = 5.4; g.add(halo); lampHalo.push(halo); g.add(roof4(.8, .5, '#3a3d48', 0, 6.1, 0)); g.position.set(o.x * U, 0, o.y * U); scene.add(g); }
      else treeParts(o, r, can, trk);
    });
    const canIM = instanced(GEO.sphLo, can, .78);
    fadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, can.length)).fill(1), 1);
    GEO.sphLo.setAttribute('aFade', fadeAttr);
    canIM.material.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute float aFade;\nvarying float vFade;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vFade = aFade;');
      sh.fragmentShader = 'varying float vFade;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (vFade < .999) { vec2 p = floor(gl_FragCoord.xy); float d = mod(p.x + p.y * 2.0, 4.0) / 4.0 + mod(p.y, 2.0) * .125; if (d >= vFade) discard; }');
    };
    canIM.material.needsUpdate = true;
    scene.add(canIM);
    scene.add(instanced(GEO.cyl, trk, .9));
    // bangunan
    SPOTS.forEach(b => { if (b.id !== 'kepala') scene.add(shop(b)); });
    doorMarks = [];
    const gemMat = new THREE.MeshStandardMaterial({ color: C('#ffd23f'), emissive: C('#ffb300'), emissiveIntensity: .55, roughness: .35 });
    const ringMat = new THREE.MeshBasicMaterial({ color: C('#ffd23f'), transparent: true, opacity: .75, depthWrite: false });
    const gemGeo = new THREE.OctahedronGeometry(1, 0), ringGeo = new THREE.RingGeometry(2, 2.9, 32);
    SPOTS.forEach(b => {
      if (b.id === 'kepala') return;
      const dx = b.x * U, dz = (b.y + frontOf(b) - 4) * U;
      const ring = new THREE.Mesh(ringGeo, ringMat.clone()); ring.rotation.x = -Math.PI / 2; ring.position.set(dx, .3, dz); scene.add(ring);
      const gem = new THREE.Mesh(gemGeo, gemMat); gem.scale.set(1.1, 1.6, 1.1); gem.position.set(dx, 5, dz); gem.castShadow = false; scene.add(gem);
      doorMarks.push({ b, ring, gem, dx, dz, k: 0 });
    });
    scene.add(treehouse()); scene.add(plazaSquare()); scene.add(flagpole());
    scene.add(nest());

    // karakter 3D
    mgInit(); buildCrowd();
    kepalaRig = buildRig('orangutan'); kepalaRig.st = { ph: 0, yaw: 0, yawT: 0 }; scene.add(kepalaRig.root);
    // bayangan bulat di bawah karakter
    const sd = new THREE.CircleGeometry(1, 22); sd.rotateX(-Math.PI / 2);
    shadowIM = new THREE.InstancedMesh(sd, new THREE.MeshBasicMaterial({ color: C('#245a1a'), transparent: true, opacity: .26, depthWrite: false }), NPC.length + 2);
    shadowIM.frustumCulled = false; shadowIM.renderOrder = 1; scene.add(shadowIM);
    raycaster = new THREE.Raycaster(); raycaster.camera = camera;
    groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    labelCv = $('hLabel'); lg = labelCv.getContext('2d');
  }

  // ---------- render ----------
  let camBase = 80, zoomZ = 1;
  const ZMIN = .65, ZMAX = 6.2;
  function resize() {
    if (!renderer) return;
    dpr = Math.min(dprMax, window.devicePixelRatio || 1); vw = innerWidth; vh = innerHeight;
    renderer.setPixelRatio(dpr); renderer.shadowMap.needsUpdate = true; renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    const asp = vw / vh, wantW = asp < .8 ? 50 : asp < 1.2 ? 66 : 92;
    camBase = Math.max(70, wantW / (2 * Math.tan(19 * Math.PI / 180) * asp));
    labelCv.width = vw * dpr; labelCv.height = vh * dpr;
    applyZoom();
  }
  function applyZoom() {
    const d = camBase * zoomZ;
    scene.fog.near = d + 40; scene.fog.far = d + 260; camera.far = d + 600; camera.updateProjectionMatrix();
    const sz = 95 * Math.max(1, zoomZ * .7), sc = sun.shadow.camera;
    sc.left = -sz; sc.right = sz; sc.top = sz; sc.bottom = -sz; sc.far = 320 + sz; sc.updateProjectionMatrix();
    $('hZin').disabled = zoomZ <= ZMIN + .01; $('hZout').disabled = zoomZ >= ZMAX - .01;
    $('hPeta').textContent = zoomZ > 2.2 ? 'Dekatkan' : 'Lihat seluruh hutan';
  }
  let zoomTarget = 1;
  function setZoom(z) { zoomTarget = Math.max(ZMIN, Math.min(ZMAX, z)); }
  function tag(text, sx, sy, bg) {
    lg.font = '700 12px "Courier Prime", monospace'; const tw = lg.measureText(text).width + 12;
    lg.fillStyle = bg || 'rgba(251,247,233,.94)'; lg.strokeStyle = '#1b2a22'; lg.lineWidth = 1.5;
    lg.beginPath(); lg.roundRect ? lg.roundRect(sx - tw / 2, sy - 20, tw, 18, 5) : lg.rect(sx - tw / 2, sy - 20, tw, 18); lg.fill(); lg.stroke();
    lg.fillStyle = '#1b2a22'; lg.textAlign = 'center'; lg.textBaseline = 'middle'; lg.fillText(text, sx, sy - 11);
  }
  const coarse = matchMedia('(pointer: coarse)').matches;
  function callout(text, hint, sx, sy) {
    lg.font = '700 15px "Courier Prime", monospace'; const w1 = lg.measureText(text).width; lg.font = '700 11px "Courier Prime", monospace'; const w2 = lg.measureText(hint).width;
    const w = Math.max(w1, w2) + 22, h = 42, x0 = sx - w / 2, y0 = sy - h - 10;
    lg.fillStyle = '#ffd23f'; lg.strokeStyle = '#1b2a22'; lg.lineWidth = 2;
    lg.beginPath(); lg.roundRect ? lg.roundRect(x0, y0, w, h, 8) : lg.rect(x0, y0, w, h); lg.fill(); lg.stroke();
    lg.beginPath(); lg.moveTo(sx - 7, y0 + h); lg.lineTo(sx, y0 + h + 8); lg.lineTo(sx + 7, y0 + h); lg.closePath(); lg.fill(); lg.stroke();
    lg.fillStyle = '#ffd23f'; lg.fillRect(sx - 6, y0 + h - 2, 12, 3);
    lg.fillStyle = '#1b2a22'; lg.textAlign = 'center'; lg.textBaseline = 'middle';
    lg.font = '700 15px "Courier Prime", monospace'; lg.fillText(text, sx, y0 + 15);
    lg.font = '700 11px "Courier Prime", monospace'; lg.fillText(hint, sx, y0 + 31);
  }
  function screenOf(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    if (v.z > 1) return null;
    return { x: (v.x + 1) / 2 * vw, y: (1 - v.y) / 2 * vh };
  }
  let lastSync = 0;
  function syncAndDraw() {
    const now = performance.now(), dt = Math.min(.05, (now - lastSync) / 1000 || 0); lastSync = now;
    // zoom halus
    if (Math.abs(zoomTarget - zoomZ) > .002) { zoomZ += (zoomTarget - zoomZ) * Math.min(1, dt * 8); applyZoom(); }
    // kamera
    const tx = P.x * U, tz = P.y * U;
    if (dt > 0) { const ivx = (tx - (camVel.lx == null ? tx : camVel.lx)) / dt, ivz = (tz - (camVel.lz == null ? tz : camVel.lz)) / dt; const kv = 1 - Math.exp(-dt * 6); camVel.x += (ivx - camVel.x) * kv; camVel.z += (ivz - camVel.z) * kv; }
    camVel.lx = tx; camVel.lz = tz;
    if (P.moving) { const kp = 1 - Math.exp(-dt * 3); pan.x -= pan.x * kp; pan.z -= pan.z * kp; }
    const ahead = .45 / Math.max(1, zoomZ * .8);
    const fx = tx + camVel.x * ahead + pan.x, fz = tz + camVel.z * ahead + pan.z;
    const kc = 1 - Math.exp(-dt * 7);
    camTarget.x += (fx - camTarget.x) * kc; camTarget.z += (fz - camTarget.z) * kc;
    const cx = Math.max(10, Math.min(W * U - 10, camTarget.x)), cz = Math.max(0, Math.min(WATER * U - 6, camTarget.z));
    camTarget.x = cx; camTarget.z = cz;
    const d = camBase * zoomZ;
    camera.position.set(cx, .76 * d, cz + .65 * d);
    camera.lookAt(cx, 1.5, cz);
    const gs = 18, sx = Math.round(cx / gs) * gs, sz2 = Math.round(cz / gs) * gs, key = sx + ',' + sz2 + ',' + Math.round(zoomZ * 4);
    if (key !== shadowKey) { shadowKey = key; sun.position.set(sx + LT.sunOff[0], LT.sunOff[1] + d * .2, sz2 + LT.sunOff[2]); sun.target.position.set(sx, 0, sz2); sun.target.updateMatrixWorld(); renderer.shadowMap.needsUpdate = true; }
    // karakter
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    let si = 0;
    const shadowAt = (x, z, r) => { p.set(x, .12, z); s.set(r, 1, r * .55); m4.compose(p, q, s); shadowIM.setMatrixAt(si++, m4); };
    updateCrowd(dt);
    NPC.forEach(n => shadowAt(n.x * U, n.y * U, n.egg ? 1.1 : 1.5));
    { const pose = rigPose(kepalaRig.st, false, dt, 0); applyRig(kepalaRig, 1500 * U, 1462 * U, 6.4, pose); shadowAt(1500 * U, 1462 * U, 2.2); }
    if (save && playerRig) {
      const st = playerRig.st, dx = tx - (st.lx == null ? tx : st.lx), dz = tz - (st.lz == null ? tz : st.lz); st.lx = tx; st.lz = tz;
      if (!playerRig.m.still) turnYaw(playerRig, dx, dz, dt);
      const pose = rigPose(st, P.moving && !playerRig.m.still, dt, 230);
      if (save.guest) { const tt = performance.now() / 1000; pose.flap = .35 + Math.abs(Math.sin(tt * 38)) * .55; pose.bob = .55 + Math.sin(tt * 2.6) * .08; pose.leg = 0; pose.sway = Math.sin(tt * 1.7) * .08; }
      applyRig(playerRig, tx, tz, save.guest ? 3.6 : 4.9, pose, playerRig.m.egg);
      shadowAt(tx, tz, 1.8);
    }
    shadowIM.count = si; shadowIM.instanceMatrix.needsUpdate = true;
    updateTreeFade(tx, tz, dt);
    applyTime(dt);
    if (fireflies && fireflies.visible) { fireflies.position.set(tx, 0, tz); const pa = fireflies.geometry.attributes.position; for (let i = 0; i < pa.count; i += 3) pa.setY(i, 1.5 + Math.sin(t * 1.3 + i) * 1.4 + (i % 4)); pa.needsUpdate = true; }
    if (radioLamp) radioLamp.visible = Math.sin(t * 4) > -.3;
    doorMarks.forEach(d => {
      const on = near && near.id === d.b.id; d.k += ((on ? 1 : 0) - d.k) * Math.min(1, dt * 8);
      d.gem.position.y = 5.2 + Math.sin(t * 3 + d.dx) * .45 + d.k * 1.2; d.gem.rotation.y = t * 1.6;
      const gs = 1 + d.k * .4; d.gem.scale.set(1.1 * gs, 1.6 * gs, 1.1 * gs);
      const p = (t * .9 + d.dx * .01) % 1, rs = on ? 1 + p * .9 : 1; d.ring.scale.set(rs, rs, 1); d.ring.material.opacity = on ? .85 * (1 - p) + .15 : .45;
    });
    if (radioOnAir) radioOnAir.visible = !(window.RHR && window.RHR.radio) || window.RHR.radio.state().playing || Math.sin(t * 2) > 0;
    if (flagMesh) { const pa = flagMesh.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const x0 = (i % 9) / 8 * 4 - 2; pa.setZ(i, Math.sin(t * 4 + x0 * 1.8) * .18 * (x0 + 2) / 4); } pa.needsUpdate = true; }
    renderer.render(scene, camera);
    // label
    lg.setTransform(dpr, 0, 0, dpr, 0, 0); lg.clearRect(0, 0, vw, vh);
    if (P.tx != null) { const sp2 = screenOf(P.tx * U, 0, P.ty * U); if (sp2) { lg.strokeStyle = 'rgba(27,42,34,.6)'; lg.lineWidth = 2.5; lg.beginPath(); lg.ellipse(sp2.x, sp2.y, 13 + Math.sin(t * 8) * 2, 6, 0, 0, 7); lg.stroke(); } }
    if (zoomZ < 1.7) {
      const labelled = NPC.map(n => [n, Math.hypot(n.x - P.x, n.y - P.y)]).filter(a => a[1] < 170).sort((a, b) => a[1] - b[1]).slice(0, 4).map(a => a[0]);
      if (selNPC && !labelled.includes(selNPC)) labelled.push(selNPC);
      labelled.forEach(n => { const mm = speciesIM[n.key] ? speciesIM[n.key].m : null; const q2 = screenOf(n.x * U, n.egg ? 3.4 : 4.4 * (mm ? mm.head : 1.1) + .5, n.y * U); if (q2) tag('@' + n.m.u, q2.x, q2.y); });
    }
    const kq = screenOf(1500 * U, 6.4 * 1.12 + .6, 1462 * U); if (kq) tag('Kepala Rimba', kq.x, kq.y, '#ffd23f');
    if (zoomZ < 2.6) doorMarks.forEach(d => {
      const on = near && near.id === d.b.id, q = screenOf(d.dx, d.gem.position.y + 1.6 + d.k * .8, d.dz); if (!q) return;
      if (on) callout(VERB[d.b.id] || d.b.label, coarse ? 'Ketuk tombol kuning' : 'Tekan E atau klik', q.x, q.y);
      else tag(d.b.label, q.x, q.y, '#fffaf0');
    });
    if (home) { const hq = screenOf(home.x * U, (save.lv || 0) >= 3 ? 19 : (save.lv || 0) === 2 ? 10.5 : 5.5, home.y * U); if (hq) tag('Rumah @' + save.u, hq.x, hq.y, '#ffd23f'); }
    if (save && playerRig) { const pq = screenOf(tx, (save.guest ? 3.6 * 1.3 + 2.4 : 4.9 * playerRig.m.head) + (save.hat ? 1.3 : .5), tz); if (pq) tag(save.guest ? 'Nyamuk (tamu)' : '@' + save.u, pq.x, pq.y, '#ffd23f'); }
    if (zoomZ > 1.9) {
      [['kanopi', 1500, 450], ['lantai', 1500, 2130], ['sabana', 2560, 1150], ['kampung', 440, 1150], ['sungai', 1500, 2530]].forEach(([k, x, z]) => {
        const q3 = screenOf(x * U, 4, z * U); if (!q3) return;
        lg.font = '22px "Lilita One", sans-serif'; lg.textAlign = 'center'; lg.textBaseline = 'middle';
        lg.lineWidth = 5; lg.strokeStyle = '#1b2a22'; lg.strokeText(ZNAME[k].replace('Distrik ', ''), q3.x, q3.y);
        lg.fillStyle = '#fffaf0'; lg.fillText(ZNAME[k].replace('Distrik ', ''), q3.x, q3.y);
      });
    }
  }

  // pohon yang menghalangi pandangan ke pemain dibuat tembus pandang
  function updateTreeFade(tx, tz, dt) {
    if (!fadeAttr || !save) return;
    const ox = camera.position.x, oy = camera.position.y, oz = camera.position.z;
    const px = tx, py = 2.6, pz = tz, dx = px - ox, dy = py - oy, dz = pz - oz, len = Math.hypot(dx, dy, dz), ux = dx / len, uy = dy / len, uz = dz / len;
    let dirty = false;
    for (const tr of TREES) {
      if (Math.abs(tr.x - tx) > 30 || tr.z < tz - 6 || tr.z > tz + 34) { tr.ft = 1; }
      else {
        const cx = tr.x - ox, cy = tr.cy - oy, cz = tr.z - oz, along = cx * ux + cy * uy + cz * uz;
        const qx = cx - ux * along, qy = cy - uy * along, qz = cz - uz * along, dd = Math.hypot(qx, qy, qz);
        tr.ft = (along > 0 && along < len - 1 && dd < tr.r) ? .28 : 1;
      }
      if (tr.f !== tr.ft) {
        tr.f += Math.sign(tr.ft - tr.f) * Math.min(Math.abs(tr.ft - tr.f), dt * 3.5);
        for (let i = tr.s; i < tr.s + tr.n; i++) fadeAttr.array[i] = tr.f;
        dirty = true;
      }
    }
    if (dirty) fadeAttr.needsUpdate = true;
  }

  // ---------- update ----------
  // ---------- tabrakan (dalam koordinat px dunia) ----------
  const COLC = [], COLR = [], GRID = new Map(), CELL = 64, PR = 8;
  function gkey(cx, cy) { return cx + ',' + cy; }
  function addCol(c) {
    const x0 = c.r != null ? c.x - c.r : c.x0, x1 = c.r != null ? c.x + c.r : c.x1, y0 = c.r != null ? c.y - c.r : c.y0, y1 = c.r != null ? c.y + c.r : c.y1;
    for (let gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx++) for (let gy = Math.floor(y0 / CELL); gy <= Math.floor(y1 / CELL); gy++) { const k = gkey(gx, gy); if (!GRID.has(k)) GRID.set(k, []); GRID.get(k).push(c); }
  }
  function circleCol(x, y, r) { const c = { x, y, r }; COLC.push(c); addCol(c); return c; }
  function rectCol(x0, y0, x1, y1) { const c = { x0, y0, x1, y1 }; COLR.push(c); addCol(c); return c; }
  let homeCol = null;
  function buildColliders() {
    const TR = { big: 11, g: 7, l: 7, p: 7, gs: 5, ps: 5, aca: 5, rock: 9 };
    DECO.forEach(o => {
      if (TR[o.k]) circleCol(o.x, o.y, TR[o.k]);
      else if (o.k === 'house') rectCol(o.x - 17, o.y - 15, o.x + 17, o.y + 14);
      else if (o.k === 'bench') rectCol(o.x - 11, o.y - 5, o.x + 11, o.y + 4);
      else if (o.k === 'lamp') circleCol(o.x, o.y, 3);
    });
    SPOTS.forEach(b => { if (b.id === 'kepala') return; const [hw, hd] = fpx(b); rectCol(b.x - hw, b.y - hd, b.x + hw, b.y + hd); });
    fenceSegs().forEach(([x0, y0, x1, y1]) => rectCol(Math.min(x0, x1) - 2, Math.min(y0, y1) - 2, Math.max(x0, x1) + 2, Math.max(y0, y1) + 2));
    const k = TH.s / U;
    circleCol(TH.x, TH.y, 23);                         // batang rumah pohon
    circleCol(TH.x + 6.35 * k, TH.y + 4.4 * k, 7);     // tangga
    circleCol(TH.x - 8.6 * k, TH.y + 2 * k, 10);       // ayunan
    rectCol(TH.x - 9.8 * k, TH.y + 6.5 * k, TH.x - 2.2 * k, TH.y + 7.2 * k); // papan nama
    circleCol(1500, 1462, 7);                          // kepala rimba
    circleCol(FLAG.x, FLAG.y, 8);                      // tiang bendera
    SPOTS.forEach(b => { if (b.id === 'warta') rectCol(b.x - 22 - 10, b.y + 30 - 3, b.x - 22 + 10, b.y + 30 + 3); });
  }
  function setHomeCol() {
    if (homeCol) { homeCol.dead = true; homeCol = null; }
    if (home) COLC.forEach(c => { if (Math.hypot(c.x - home.x, c.y - home.y) < 42) c.dead = true; });
    if (!home || !(save.lv > 0)) return;
    const w = save.lv >= 2 ? 17 : 13;
    homeCol = rectCol(home.x - w, home.y - 14, home.x + w, home.y + 12);
  }
  function collide() {
    for (let it = 0; it < 2; it++) {
      const gx = Math.floor(P.x / CELL), gy = Math.floor(P.y / CELL), seen = new Set();
      for (let ix = gx - 1; ix <= gx + 1; ix++) for (let iy = gy - 1; iy <= gy + 1; iy++) {
        const L = GRID.get(gkey(ix, iy)); if (!L) continue;
        for (const c of L) {
          if (seen.has(c) || c.dead) continue; seen.add(c);
          if (c.r != null) {
            const dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy), m = c.r + PR;
            if (d < m && d > .001) { P.x = c.x + dx / d * m; P.y = c.y + dy / d * m; }
          } else {
            const qx = Math.max(c.x0, Math.min(c.x1, P.x)), qy = Math.max(c.y0, Math.min(c.y1, P.y));
            const dx = P.x - qx, dy = P.y - qy, d = Math.hypot(dx, dy);
            if (d < PR) {
              if (d > .001) { P.x = qx + dx / d * PR; P.y = qy + dy / d * PR; }
              else { const l = P.x - c.x0, r2 = c.x1 - P.x, u = P.y - c.y0, b = c.y1 - P.y, mn = Math.min(l, r2, u, b); if (mn === l) P.x = c.x0 - PR; else if (mn === r2) P.x = c.x1 + PR; else if (mn === u) P.y = c.y0 - PR; else P.y = c.y1 + PR; }
            }
          }
        }
      }
    }
  }
  const joy = { on: false, x: 0, y: 0 };
  let stuckT = 0, stuckX = 0, stuckY = 0;
  function update(dt) {
    t += dt;
    let mx = 0, my = 0;
    if (keys.ArrowLeft || keys.a) mx -= 1; if (keys.ArrowRight || keys.d) mx += 1; if (keys.ArrowUp || keys.w) my -= 1; if (keys.ArrowDown || keys.s) my += 1;
    const SPD = 92;
    if (joy.on && (Math.abs(joy.x) + Math.abs(joy.y)) > .15) { const l = Math.hypot(joy.x, joy.y), sp = Math.min(1, l); P.x += joy.x / l * SPD * sp * dt; P.y += joy.y / l * SPD * sp * dt; P.tx = null; P.enter = null; P.moving = true; if (Math.abs(joy.x) > .1) P.dir = Math.sign(joy.x); }
    else if (mx || my) { const l = Math.hypot(mx, my); P.x += mx / l * SPD * dt; P.y += my / l * SPD * dt; P.tx = null; P.enter = null; P.moving = true; if (mx) P.dir = mx; }
    else if (P.tx != null) {
      const dx = P.tx - P.x, dy = P.ty - P.y, d = Math.hypot(dx, dy);
      if (d < 6) { P.tx = null; P.moving = false; }
      else { const s = Math.min(d, SPD * dt); P.x += dx / d * s; P.y += dy / d * s; P.moving = true; if (Math.abs(dx) > 2) P.dir = Math.sign(dx); }
    } else P.moving = false;
    collide();
    P.x = Math.max(30, Math.min(W - 30, P.x)); P.y = Math.max(60, Math.min(WATER - 14, P.y));
    // berhenti kalau tertahan (misalnya menabrak rumah saat jalan-ketuk)
    if (P.tx != null) { stuckT += dt; if (stuckT > .45) { if (Math.hypot(P.x - stuckX, P.y - stuckY) < 10) { P.tx = null; P.moving = false; } stuckT = 0; stuckX = P.x; stuckY = P.y; } } else { stuckT = 0; stuckX = P.x; stuckY = P.y; }
    NPC.forEach(n => {
      if (n.egg) return;
      if (n.wait > 0) { n.wait -= dt; n.moving = false; return; }
      const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
      if (d < 4) { n.wait = 1.5 + n.r() * 5; const p = { x: n.x + (n.r() - .5) * 260, y: n.y + (n.r() - .5) * 180 }; n.tx = Math.max(n.box[0], Math.min(n.box[2], p.x)); n.ty = Math.max(n.box[1], Math.min(n.box[3], p.y)); return; }
      const s = Math.min(d, n.sp * dt); n.x += dx / d * s; n.y += dy / d * s; n.moving = true; if (Math.abs(dx) > 1) n.dir = Math.sign(dx);
    });
    let best = null, bd = 95;
    SPOTS.forEach(b => { const d = Math.hypot(b.x - P.x, (b.y + frontOf(b) + (b.id === 'kepala' ? 5 : 0)) - P.y); if (d < bd) { bd = d; best = b; } });
    if (home) { const d = Math.hypot(home.x - P.x, home.y + 40 - P.y); if (d < bd) { bd = d; best = { id: 'rumah', label: 'Rumahmu' }; } }
    if (!(best === near || (best && near && best.id === near.id))) { near = best; renderAct(); }
    if (P.enter && P.tx == null) { const id = P.enter; P.enter = null; if (near && near.id === id && !dlgOpen()) interact(id); }
    const z = zoneAt(P.x, P.y); if ($('hZona').textContent !== ZNAME[z]) $('hZona').textContent = ZNAME[z];
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('hToast').hidden = true; }
  }
  function frame(ts) {
    if (!open) return;
    const raw = (ts - last) / 1000 || 0, dt = Math.min(.1, raw); last = ts;
    if (!dlgOpen()) update(dt); else t += dt;
    syncAndDraw();
    if (raw > 0 && raw < 1) { fpsAcc += raw; fpsN++; }
    if (ts - fpsT > 2500 && fpsN > 10) {
      const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; fpsT = ts;
      if (fps < 40 && quality === 2) { quality = 1; dprMax = 1.25; resize(); }
      else if (fps < 26 && quality === 1) { quality = 0; dprMax = 1; resize(); }
    }
    requestAnimationFrame(frame);
  }
  // ---------- HUD & dialog ----------
  function toast(msg) { $('hToast').textContent = msg; $('hToast').hidden = false; toastT = 2.6; }
  function setBiji(n) { save.biji = Math.max(0, n); persist(); $('hBiji').textContent = save.biji; }
  const VERB = { warta: 'Baca Warta Rimba', radio: 'Masuk Radio Rimba', pos: 'Kerja di Pos Pemadam', bibit: 'Masuk Kantor Bibit', papan: 'Ambil KTP di Loket', balai: 'Masuk Balai Warga', kepala: 'Ngobrol dengan Kepala Rimba', rumah: 'Masuk rumahmu' };
  function renderAct() {
    const b = $('hAct');
    if (!near || !save) { b.hidden = true; return; }
    b.innerHTML = '<small>' + (near.id === 'kepala' ? 'Kepala Rimba ada di depanmu' : 'Kamu di depan pintu') + '</small><span>' + VERB[near.id] + '</span>' + (coarse ? '' : '<kbd>E</kbd>'); b.hidden = false;
  }
  function dlgOpen() { return !$('hDlg').hidden; }
  function showDlg(html, wide) {
    $('hDlgIn').innerHTML = html; $('hDlgIn').classList.toggle('wide', !!wide); $('hDlg').hidden = false;
    const f = $('hDlgIn').querySelector('button, input'); if (f) setTimeout(() => f.focus(), 30);
  }
  let dlgLock = false;
  function closeDlg(force) { if (dlgLock && force !== true) return; dlgLock = false; $('hDlg').hidden = true; if (patroli && patroli.running) patroli.stop(); }
  function head(title, sub) { return '<button type="button" class="hx" data-close aria-label="Tutup">×</button><h3>' + title + '</h3>' + (sub ? '<p class="hsub">' + sub + '</p>' : ''); }

  function interact(id) {
    if (!save) return;
    if (save.guest) {
      if (id === 'papan') return dlgDaftar(true);
      if (id === 'kepala') return showDlg(head('Kepala Rimba') + '<div class="hkepala"><img src="../img/orangutan.webp" alt=""><p>' + salam() + 'Wah, ada nyamuk! Kamu masih tamu. Daftar di Loket Pendaftaran biar jadi warga, punya rumah, dan bisa kerja.</p></div><div class="hrow"><button type="button" class="btn utama" id="hJadi">Daftar jadi warga</button><button type="button" class="btn" data-close>Nanti dulu</button></div>'), $('hJadi').onclick = () => dlgDaftar(true);
      if (id === 'pos' || id === 'bibit') { toast('Nyamuk belum bisa kerja. Daftar dulu di Loket Pendaftaran.'); return; }
    }
    if (id === 'pos') return dlgPos();
    if (id === 'bibit') return dlgBibit();
    if (id === 'papan') return dlgPapan();
    if (id === 'kepala') return dlgKepala();
    if (id === 'warta') return dlgWarta();
    if (id === 'radio') return dlgRadio();
    if (id === 'balai') return dlgBalai();
    if (id === 'rumah') return dlgRumah();
  }

  // Pos Pemadam = kerja
  let patroli = null;
  function dlgPos() {
    showDlg(head('Pos Pemadam', 'Bara api jatuh. Ketuk sebelum kena pohon. Setiap bara padam = 1 Biji.') +
      '<div class="hgame"><canvas id="hCv" width="420" height="560"></canvas><div class="hlayar" id="hLayar"><button type="button" class="btn utama" id="hMulai">Mulai kerja</button></div></div>' +
      '<p class="hskor"><span>Padam: <b id="hSk">0</b></span><span>Pohon: <b id="hNy">3</b></span></p>', true);
    patroli = createPatroli($('hCv'), {
      onScore: s => { $('hSk').textContent = s; }, onLives: l => { $('hNy').textContent = l; },
      onEnd: s => { aksi('patroli', { padam: s }, () => setBiji(save.biji + s)); save.kerja = (save.kerja || 0) + 1; persist(); $('hLayar').innerHTML = '<div><p class="hbesar">+' + s + ' Biji</p><p>Gaji masuk ke dompetmu.</p><button type="button" class="btn utama" id="hMulai">Kerja lagi</button></div>'; $('hLayar').hidden = false; $('hMulai').onclick = go; }
    });
    function go() { $('hLayar').hidden = true; patroli.start(); }
    $('hMulai').onclick = go;
  }
  // Salon
  function dlgSalon() {
    const own = save.hats || [''];
    showDlg(head('Salon Daun', 'Topi dan aksesoris buat hewanmu. Sekali beli, bisa dipakai kapan saja.') +
      '<div class="hgrid">' + HATS.map(h => {
        const has = own.includes(h.id), on = (save.hat || '') === h.id;
        return '<button type="button" class="hitem' + (on ? ' on' : '') + '" data-hat="' + h.id + '"><canvas width="120" height="120" data-prev="' + h.id + '"></canvas><b>' + h.n + '</b><small>' + (on ? 'Dipakai' : has ? 'Pakai' : h.c + ' Biji') + '</small></button>';
      }).join('') + '</div>', true);
    $('hDlgIn').querySelectorAll('canvas[data-prev]').forEach(c => {
      const cg = c.getContext('2d'), im = img((S[save.s] || {}).img);
      const paint = () => { cg.clearRect(0, 0, 120, 120); if (im.naturalWidth) { const h = 96, w = im.naturalWidth * h / im.naturalHeight; cg.drawImage(im, 60 - w / 2, 112 - h, w, h); drawHat(cg, c.dataset.prev, 60, 112 - h, w); } };
      im.complete ? paint() : im.addEventListener('load', paint, { once: true });
    });
  }
  // Bibit
  function dlgBibit() {
    showDlg(head('Kantor Bibit', 'Tanam pohon di sekitar rumahmu. Satu bibit 10 Biji.') +
      '<p class="hbesar">' + (save.trees || 0) + ' pohon</p><p>sudah kamu tanam di Hutan Rimba.</p>' +
      '<div class="hrow"><button type="button" class="btn utama" id="hTanam">Tanam 1 pohon (10 Biji)</button></div>' +
      '<p class="hnote">Pohon di sini pohon permainan. Pohon sungguhan bertambah setiap ada follower baru di @hutanrimbanet.</p>');
    $('hTanam').onclick = () => {
      if (save.biji < 10) { toast('Biji kurang. Kerja dulu di Pos Pemadam.'); return; }
      aksi('tanam', {}, () => { setBiji(save.biji - 10); save.trees = (save.trees || 0) + 1; persist(); }).then(ok => { if (!ok) return; computePlants(); if (renderer) buildPlants(); dlgBibit(); toast('Satu pohon tumbuh di dekat rumahmu!'); });
    };
  }
  // Catatan Sipil
  // KTP Rimba langsung di dalam game
  async function dlgKTP(u, s) {
    showDlg(head('KTP Rimba', 'Sedang dicetak di Kantor Catatan Sipil...') + '<div class="hktp"><p class="hnote">Mencetak kartu...</p></div>', true);
    if (!window.RHR || !window.RHR.drawKTP) return;
    let r; try { r = await window.RHR.drawKTP(u, s); } catch (e) { $('hDlgIn').querySelector('.hktp').innerHTML = '<p class="herr">Kartu gagal dicetak. Coba lagi.</p>'; return; }
    showDlg(head('KTP Rimba @' + esc(u), r.member ? 'Tekan lama gambar untuk simpan, lalu pasang di story dan tag @hutanrimbanet.' : 'Ini kartu calon warga. Biar resmi, komen hewanmu di Reels terbaru @hutanrimbanet.') +
      '<div class="hktp"><img src="' + r.url + '" alt="KTP Rimba @' + esc(u) + '"></div>' +
      '<div class="hrow"><button type="button" class="btn utama" id="hSimpan">Simpan kartu</button><button type="button" class="btn" id="hCap">Salin caption</button></div>', true);
    $('hSimpan').onclick = () => window.RHR.saveKTP(r);
    $('hCap').onclick = async () => { try { await navigator.clipboard.writeText(r.caption); $('hCap').textContent = 'Tersalin'; } catch (e) { $('hCap').textContent = 'Gagal menyalin'; } };
  }
  // Kantor Warta Rimba
  let wartaEd = -1;
  function dlgWarta() {
    const W2 = window.RHR && window.RHR.warta; if (!W2) return;
    const E2 = W2.EDISI; if (wartaEd < 0 || wartaEd >= E2.length) wartaEd = E2.length - 1;
    const e = E2[wartaEd];
    showDlg('<button type="button" class="hx" data-close aria-label="Tutup">×</button><div class="hkoran"><h3>Warta Rimba</h3><p class="hmeta"><span>' + e.ed + (wartaEd === E2.length - 1 ? ' (terbaru)' : '') + '</span><span>Harga: 1 komen</span></p>' +
      '<figure><img src="../img/' + e.foto[0] + '.webp" alt=""><figcaption>Foto: ' + esc(e.foto[1]) + '</figcaption></figure><h4>' + esc(e.judul) + '</h4>' + e.isi.map(p => '<p>' + esc(p) + '</p>').join('') +
      '<div class="hteka"><b>Teka-teki Biji Emas</b><p>' + esc(e.teka[0]) + '</p><button type="button" class="btn" id="hJwb">Lihat jawaban</button><p class="hjawab" hidden>' + esc(e.teka[1]) + '</p></div></div>' +
      '<div class="hrow"><button type="button" class="btn" id="hEdPrev"' + (wartaEd === 0 ? ' disabled' : '') + '>Edisi lalu</button><button type="button" class="btn" id="hEdNext"' + (wartaEd === E2.length - 1 ? ' disabled' : '') + '>Edisi baru</button></div>', true);
    $('hJwb').onclick = () => { $('hDlgIn').querySelector('.hjawab').hidden = false; $('hJwb').hidden = true; };
    $('hEdPrev').onclick = () => { if (wartaEd > 0) { wartaEd--; dlgWarta(); } };
    $('hEdNext').onclick = () => { if (wartaEd < E2.length - 1) { wartaEd++; dlgWarta(); } };
  }
  // Stasiun Radio Rimba
  function dlgRadio() {
    const R2 = window.RHR && window.RHR.radio; if (!R2) return;
    const st = R2.state();
    showDlg(head('RRR 101.1 FM', 'Radio Republik Rimba. Musiknya tetap jalan selama kamu keliling hutan.') +
      '<div class="hkepala"><img src="../img/kakatua.webp" alt=""><p><b>Kak Kakatua</b> sedang siaran.<br><span class="hnote">' + esc(R2.line()) + '</span></p></div>' +
      '<div class="hrow"><button type="button" class="btn utama" id="hRp">' + (st.playing ? 'Hentikan musik' : 'Putar musik') + '</button></div>' +
      '<div class="hlagu">' + R2.songs().map((s, i) => '<button type="button" class="btn' + (i === st.song && st.playing ? ' on' : '') + '" data-song="' + i + '">' + esc(s) + '</button>').join('') + '</div>' +
      '<p class="hnote">Pakai iPhone? Matikan mode senyap dulu supaya suaranya keluar.</p>');
    $('hRp').onclick = () => { R2.toggle(); setTimeout(dlgRadio, 60); };
    $('hDlgIn').querySelectorAll('[data-song]').forEach(b => b.onclick = () => { R2.play(+b.dataset.song); setTimeout(dlgRadio, 60); });
  }
  function dlgPapan() {
    const sp = S[save.s] || {}, d = D[sp.d] || {};
    showDlg(head('Loket Pendaftaran', 'Catatan sipil Republik. Di sini warga baru dapat KTP Rimba.') +
      (save.n ? '<p>Kamu tercatat sebagai <b>warga #' + save.n + '</b>, ' + esc(sp.name) + ' di ' + esc(d.name || '') + '.</p>' : '<p>Kamu masih <b>calon warga</b>. Biar resmi, follow @hutanrimbanet lalu komen hewanmu di Reels terbaru.</p>') +
      '<div class="hrow"><button type="button" class="btn utama" id="hKtp">Lihat KTP Rimba-ku</button><a class="btn" href="https://www.instagram.com/hutanrimbanet/">Buka Instagram</a></div>' +
      '<p class="hnote">Jumlah penduduk hari ini: ' + M.length + ' warga.</p>');
    $('hKtp').onclick = () => dlgKTP(save.u, save.s);
  }
  // Balai Warga: musyawarah, usulan dari komentar Reels
  const BANGUNAN = [
    ['Balai Warga', 'dibangun', '@nrryssqn_0, didukung @nadiradwiramadhona'],
    ['Alun-alun berpagar tali', 'dibangun', 'usulan warga di Reels'],
    ['Loket Pendaftaran', 'dibangun', 'buat warga baru yang antre'],
    ['Warung makan', 'diusulkan', 'komentar warga'],
    ['Kafe & tempat santai', 'diusulkan', 'komentar warga'],
    ['Tempat bermain', 'diusulkan', 'komentar warga']
  ];
  function dlgBalai() {
    const rows = BANGUNAN.map(([n, st, by]) => '<li><b>' + esc(n) + '</b> <span class="hstat ' + (st === 'dibangun' ? 'ok' : '') + '">' + st + '</span><br><small>' + esc(by) + '</small></li>').join('');
    showDlg(head('Balai Warga', 'Tempat musyawarah Republik. Komentar teratas di Reels jadi bangunan berikutnya.') +
      '<p class="hbesar">' + M.length + ' warga</p><p>Satu follower, satu pohon. Hutan tumbuh tiap ada warga baru.</p>' +
      '<ul class="hlist">' + rows + '</ul>' +
      '<div class="hrow"><a class="btn utama" href="https://www.instagram.com/hutanrimbanet/">Kirim usulan di Reels</a></div>' +
      '<p class="hnote">Usulan dengan like terbanyak dikerjakan di episode berikutnya.</p>');
  }
  // Kepala Rimba
  const LINES = [
    'Selamat datang di Republik! Hutan ini dulu terbakar. Sekarang kita bangun lagi, satu pohon demi satu pohon.',
    'Butuh Biji? Kerja di Pos Pemadam. Padamkan bara sebelum kena pohon.',
    'Biji bisa ditukar bibit di Kantor Bibit. Tanam di sekitar rumahmu.',
    'Rumahmu bisa di-upgrade. Dari sarang ranting sampai rumah pohon mini.',
    'Jalan ke selatan ada Tepi Sungai. Jangan kecebur, ya.',
    'Telur-telur di sarang itu belum menetas. Nanti kita lihat isinya bareng.',
    'Kalau ketemu tetangga, ketuk mereka. Kamu bisa lihat KTP-nya.',
    'Punya ide bangunan baru? Mampir ke Balai Warga di sebelah beringin.'
  ];
  function dlgKepala() {
    let gift = '';
    if (!save.gift) { save.gift = 1; aksi('modal_awal', {}, () => setBiji(save.biji + 20)); gift = '<p class="hstempel">MODAL AWAL +20 BIJI</p>'; }
    const i = (save.talk || 0) % LINES.length; save.talk = (save.talk || 0) + 1; persist();
    showDlg(head('Kepala Rimba') + '<div class="hkepala"><img src="../img/orangutan.webp" alt=""><p>' + (save.talk === 1 || i === 0 ? salam() : '') + LINES[i] + '</p></div>' + gift +
      '<div class="hrow"><button type="button" class="btn" id="hLagi">Tanya lagi</button><button type="button" class="btn utama" data-close>Siap!</button></div>');
    $('hLagi').onclick = dlgKepala;
  }
  // Rumah
  function dlgRumah() {
    const lv = save.lv || 0, nx = LEVELS[lv + 1];
    showDlg(head('Rumah @' + esc(save.u), 'Sekarang: ' + LEVELS[lv][0]) +
      '<ol class="hlv">' + LEVELS.map((L, i) => '<li class="' + (i <= lv ? 'done' : '') + '"><b>' + L[0] + '</b><span>' + (i === 0 ? 'Gratis' : L[1] + ' Biji') + '</span></li>').join('') + '</ol>' +
      (nx ? '<div class="hrow"><button type="button" class="btn utama" id="hUp">Upgrade ke ' + nx[0] + ' (' + nx[1] + ' Biji)</button></div>' : '<p class="hstempel">RUMAH TERBAIK SE-DISTRIK</p>') +
      '<div class="hrow"><button type="button" class="btn" id="hPindah">Ganti hewan / keluar</button></div>');
    if (nx) $('hUp').onclick = () => {
      if (save.biji < nx[1]) { toast('Biji kurang ' + (nx[1] - save.biji) + ' lagi.'); return; }
      aksi('upgrade', {}, () => { setBiji(save.biji - nx[1]); save.lv = lv + 1; persist(); }).then(ok => { if (!ok) return; buildHome(); setHomeCol(); dlgRumah(); toast('Rumahmu sekarang ' + nx[0] + '!'); });
    };
    $('hPindah').onclick = () => {
      showDlg(head(SRV ? 'Keluar?' : 'Pindah?', SRV ? 'Kamu keluar dari HP ini. Progresmu tetap aman di server; masuk lagi dengan Kode Warga.' : 'Biji, rumah, dan pohonmu di HP ini akan dihapus.') + '<div class="hrow"><button type="button" class="btn" data-close>Batal</button><button type="button" class="btn utama" id="hYa">' + (SRV ? 'Ya, keluar' : 'Ya, mulai dari awal') + '</button></div>');
      $('hYa').onclick = () => { if (SRV && token.get()) { rpc('keluar', { p_token: token.get() }).catch(() => {}); token.set(null); } save = null; try { localStorage.removeItem(KEY); } catch (e) {} home = null; plantPos = []; if (homeGroup) { scene.remove(homeGroup); homeGroup = null; } if (plantGroup) { scene.remove(plantGroup); plantGroup = null; } if (playerRig) { scene.remove(playerRig.root); playerRig = null; } $('hHud').hidden = true; dlgDaftar(); };
    };
  }
  // NPC
  function dlgNPC(n) {
    const sp = S[n.m.s] || {}, d = D[sp.d] || {};
    showDlg(head('@' + esc(n.m.u)) + '<div class="hkepala"><img src="../img/' + sp.img + '.webp" alt=""><p><b>' + esc(sp.name) + '</b><br>Warga #' + n.m.n + (n.m.n <= 100 ? ', Pendiri Hutan' : '') + '<br>' + esc(d.name || '') + '</p></div>' +
      '<div class="hrow"><button type="button" class="btn utama" id="hNk">Lihat KTP-nya</button><button type="button" class="btn" data-close>Tutup</button></div>');
    $('hNk').onclick = () => dlgKTP(n.m.u);
  }

  // Daftar / pindah datang
  // ---------- server (Supabase). Kosong = mode HP saja seperti sebelumnya ----------
  const CFG = window.RIMBA_SERVER || {};
  const SRV = CFG.url && CFG.key ? { url: CFG.url.replace(/\/$/, ''), key: CFG.key } : null;
  const TOKEN_KEY = 'rimba-token';
  const GALAT = {
    sudah_diklaim: 'Username ini sudah terdaftar. Masukkan Kode Warga-nya.', kode_salah: 'Kode Warga salah.',
    terkunci_sementara: 'Terlalu banyak salah. Coba lagi 10 menit lagi.', tidak_ditemukan: 'Username belum terdaftar.',
    biji_kurang: 'Biji kurang. Kerja dulu di Pos Pemadam.', pekarangan_penuh: 'Pekaranganmu sudah penuh pohon.',
    terlalu_cepat: 'Istirahat sebentar sebelum kerja lagi.', sesi_habis: 'Sesi habis. Masuk lagi ya.',
    akun_dicabut: 'Akun ini dinonaktifkan. Hubungi @hutanrimbanet.', username_tidak_valid: 'Username tidak valid.', jaringan: 'Tidak tersambung ke server. Cek internetmu.'
  };
  async function rpc(fn, args) {
    let r;
    try { r = await fetch(SRV.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: SRV.key, Authorization: 'Bearer ' + SRV.key, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) }); }
    catch (e) { throw new Error('jaringan'); }
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && j.message) || 'jaringan');
    return j;
  }
  const token = { get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }, set: t => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} } };
  // data dari server menimpa progres lokal (server yang benar)
  function terima(d) { if (!d) return; save = Object.assign(save || {}, d); persist(); if ($('hBiji')) $('hBiji').textContent = save.biji; }
  // satu aksi: di mode server, server yang menghitung; di mode HP, jalankan versi lokal
  async function aksi(jenis, data, lokal) {
    if (!SRV || save.guest) { lokal(); return true; }
    try { const d = await rpc('aksi', { p_token: token.get(), p_jenis: jenis, p_data: data || {} }); terima(d); return true; }
    catch (e) { toast(GALAT[e.message] || 'Gagal: ' + e.message); if (e.message === 'sesi_habis') { token.set(null); } return false; }
  }
  // Kartu Kode Warga: hanya muncul sekali, saat mendaftar
  function dlgKode(kode, lanjut) {
    dlgLock = true;
    showDlg('<h3>Kode Warga-mu</h3><p class="hsub">Simpan kode ini. Kamu butuh untuk masuk dari HP lain. Kode tidak bisa dilihat lagi.</p>' +
      '<p class="hkode" id="hKode">' + esc(kode) + '</p><div class="hrow"><button type="button" class="btn" id="hSalin">Salin kode</button><button type="button" class="btn utama" id="hSudah">Sudah saya simpan</button></div>' +
      '<p class="hnote">Lupa kode? DM @hutanrimbanet untuk dibuatkan yang baru.</p>');
    $('hSalin').onclick = () => { try { navigator.clipboard.writeText(kode); toast('Kode disalin'); } catch (e) { toast('Salin manual ya'); } };
    $('hSudah').onclick = () => { closeDlg(true); lanjut(); };
  }
  function music() { try { window.RHR.bgm.start(faseOf(wib().h).toLowerCase()); } catch (e) {} }
  // layar masuk: satu ketukan untuk warga lama, sekaligus memulai lagu
  function dlgMasuk() {
    const sp = S[save.s] || {}, d = D[sp.d] || {};
    dlgLock = true;
    showDlg('<div class="hmasuk"><p class="hsub">' + salam() + 'Republik Hutan Rimba</p><img src="../img/' + (sp.img || 'kucing') + '.webp" alt=""><h3>@' + esc(save.u) + '</h3><p>' + (save.n ? 'Warga #' + save.n + ' · ' : 'Calon warga · ') + esc(sp.name || '') + (d.name ? ' dari ' + esc(d.name) : '') + '</p>' +
      '<button type="button" class="btn utama besar" id="hLanjut">Lanjut sebagai @' + esc(save.u) + '</button>' +
      '<button type="button" class="hlink" id="hLain">Bukan kamu? Masuk dengan akun lain</button></div>');
    $('hLanjut').onclick = async () => {
      music();
      if (!SRV) { closeDlg(true); P.x = 1500; P.y = 1520; startPlayer(); return; }
      const tok = token.get();
      if (!tok) { const lama = { biji: save.biji || 0, lv: save.lv || 0, trees: save.trees || 0, gift: save.gift || 0 }; return daftarServer({ u: save.u, s: save.s, n: save.n }, lama); }
      $('hLanjut').disabled = true; $('hLanjut').textContent = 'Membuka rumahmu...';
      try { const d = await rpc('ambil', { p_token: tok }); terima(d); closeDlg(true); P.x = 1500; P.y = 1520; startPlayer(); }
      catch (e) {
        if (e.message === 'sesi_habis' || e.message === 'akun_dicabut') { token.set(null); return dlgKodeMasuk(save.u, null); }
        // tanpa internet: tetap main dengan data terakhir di HP
        toast(GALAT.jaringan); closeDlg(true); P.x = 1500; P.y = 1520; startPlayer();
      }
    };
    $('hLain').onclick = () => dlgDaftar();
  }
  function dlgDaftar(fromGuest) {
    if (!fromGuest) dlgLock = true;
    showDlg('<h3>Formulir Pindah Datang</h3><p class="hsub">Republik Hutan Rimba. Tidak perlu password, tidak perlu email.</p>' +
      '<form id="hF" autocomplete="off"><label for="hU">Username Instagram</label><div class="field"><span>@</span><input id="hU" autocapitalize="none" spellcheck="false" maxlength="30" placeholder="usernamekamu"><button type="submit">Cek</button></div></form>' +
      '<div id="hRes"></div>' + (SRV ? '<button type="button" class="hlink" id="hPunya">Sudah punya Kode Warga? Masuk dari HP lain</button>' : '') + (fromGuest ? '' : '<div class="htamu"><button type="button" class="btn" id="hTamu">Masuk sebagai tamu</button><span>Kamu jadi nyamuk: bisa terbang keliling, baca Warta, dengar radio. Belum bisa kerja atau punya rumah.</span></div>') +
      '<p class="hnote">' + (SRV ? 'Tidak perlu password. Kamu akan dapat Kode Warga untuk masuk dari HP lain.' : 'Progresmu tersimpan di HP ini saja.') + '</p>', true);
    if ($('hPunya')) $('hPunya').onclick = () => dlgKodeMasuk('', null);
    if ($('hTamu')) $('hTamu').onclick = () => { music(); save = { guest: true, u: 'tamu', s: '', n: 0, biji: 0, lv: 0, trees: 0, hats: [''], hat: '' }; closeDlg(true); startPlayer(); P.x = 1500; P.y = 1530; setTimeout(() => toast('Bzzz! Kamu nyamuk tamu. Mampir ke Loket Pendaftaran kalau mau jadi warga.'), 400); };
    $('hF').onsubmit = e => {
      e.preventDefault();
      const u = $('hU').value.trim().replace(/^@/, '').replace(/[^\w.]/g, '').slice(0, 30);
      if (!u) { $('hRes').innerHTML = '<p class="herr">Tulis username dulu.</p>'; return; }
      const m = M.find(x => x.u.toLowerCase() === u.toLowerCase());
      if (m) {
        const sp = S[m.s];
        $('hRes').innerHTML = '<div class="hkepala"><img src="../img/' + sp.img + '.webp" alt=""><p>Ketemu! Kamu <b>warga #' + m.n + '</b>, seekor <b>' + esc(sp.name) + '</b> dari ' + esc((D[sp.d] || {}).name || '') + '.</p></div><div class="hrow"><button type="button" class="btn utama" id="hGo">Masuk ke hutan</button></div>';
        $('hGo').onclick = () => begin({ u: m.u, s: m.s, n: m.n });
      } else {
        $('hRes').innerHTML = '<p><b>@' + esc(u) + '</b> belum terdaftar. Pilih hewanmu dulu, kamu masuk sebagai calon warga.</p><div class="hgrid kecil">' +
          Object.entries(S).filter(([k]) => k !== 'egg').sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([k, v]) => '<button type="button" class="hitem" data-pick="' + k + '"><img loading="lazy" src="../img/' + v.img + '.webp" alt=""><b>' + esc(v.name) + '</b></button>').join('') + '</div>';
        $('hRes').querySelectorAll('[data-pick]').forEach(b => b.onclick = () => begin({ u, s: b.dataset.pick, n: 0 }));
      }
    };
  }
  function begin(o) {
    music();
    if (SRV) return daftarServer(o, null);
    masukDunia({ u: o.u, s: o.s, n: o.n, biji: 0, lv: 0, trees: 0, hats: [''], hat: '' }, true);
  }
  function masukDunia(data, baru) {
    if (save && save.guest && playerRig) { scene.remove(playerRig.root); playerRig = null; }
    save = data; persist(); closeDlg(true); startPlayer();
    P.x = 1500; P.y = 1530;
    if (baru) { P.tx = 1500; P.ty = 1505; setTimeout(() => toast('Datangi Kepala Rimba di depan Rumah Pohon.'), 400); }
  }
  // daftar di server; lama = progres dari HP yang ikut dipindah (sekali saja)
  async function daftarServer(o, lama) {
    try {
      const r = await rpc('daftar', { p_username: o.u, p_spesies: o.s, p_nomor: o.n || null });
      token.set(r.token); save = r.data;
      if (lama) { try { save = await rpc('aksi', { p_token: r.token, p_jenis: 'impor', p_data: lama }); } catch (e) {} }
      dlgKode(r.kode, () => masukDunia(save, !lama));
    } catch (e) {
      if (e.message === 'sudah_diklaim') return dlgKodeMasuk(o.u, lama);
      toast(GALAT[e.message] || 'Gagal daftar: ' + e.message);
    }
  }
  // masuk dari HP lain dengan Kode Warga
  function dlgKodeMasuk(u, lama) {
    dlgLock = true;
    showDlg('<h3>Masuk dengan Kode Warga</h3><p class="hsub">Kode didapat saat pertama mendaftar, misalnya KANCIL-MERAH-SUNGAI-42.</p>' +
      '<form id="hKF" autocomplete="off"><label for="hKU">Username Instagram</label><div class="field"><span>@</span><input id="hKU" autocapitalize="none" spellcheck="false" maxlength="30" value="' + esc(u || '') + '"></div>' +
      '<label for="hKK">Kode Warga</label><div class="field"><input id="hKK" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="KANCIL-MERAH-SUNGAI-42"><button type="submit">Masuk</button></div></form>' +
      '<div id="hKR"></div><button type="button" class="hlink" id="hKB">Kembali</button><p class="hnote">Lupa kode? DM @hutanrimbanet.</p>');
    $('hKB').onclick = () => dlgDaftar();
    $('hKF').onsubmit = async e => {
      e.preventDefault(); music();
      try {
        const r = await rpc('masuk', { p_username: $('hKU').value, p_kode: $('hKK').value });
        if (!r.ok) { $('hKR').innerHTML = '<p class="herr">' + GALAT[r.galat] + '</p>'; return; }
        token.set(r.token); save = r.data;
        if (lama && !save.diimpor) { try { save = await rpc('aksi', { p_token: r.token, p_jenis: 'impor', p_data: lama }); } catch (e2) {} }
        masukDunia(save, false); toast('Selamat datang kembali, @' + save.u + '!');
      } catch (e2) { $('hKR').innerHTML = '<p class="herr">' + esc(GALAT[e2.message] || e2.message) + '</p>'; }
    };
  }
  function startPlayer() {
    const g = !!save.guest;
    document.querySelector('.hchip.biji').hidden = g; $('hRumah').hidden = g;
    $('hBiji').textContent = save.biji; $('hHud').hidden = false;
    if (g) { home = null; plantPos = []; if (renderer) buildPlayerRig(); setHomeCol(); return; }
    home = homeSpot(); computePlants();
    if (renderer) { buildHome(); buildPlayerRig(); } setHomeCol();
  }

  // ---------- input: ketuk, cubit-zoom, scroll ----------
  const ptrs = new Map(); let pinch0 = 0, zoom0 = 1, tapOk = true, downAt = null, lastPtr = null;
  function onTap(cx, cy) {
    if (!save || dlgOpen() || !renderer) return;
    const r = $('hCanvas').getBoundingClientRect();
    const ndc = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    let hit = null, hd = 34;
    NPC.forEach(n => { const q2 = screenOf(n.x * U, 2, n.y * U); if (!q2) return; const d = Math.hypot(q2.x - (cx - r.left), q2.y - (cy - r.top)); if (d < hd) { hd = d; hit = n; } });
    if (hit) { selNPC = hit; dlgNPC(hit); return; }
    const pt = new THREE.Vector3(); if (!raycaster.ray.intersectPlane(groundPlane, pt)) return;
    const px = pt.x / U, py = pt.z / U;
    const all = SPOTS.concat(home ? [{ id: 'rumah', x: home.x, y: home.y }] : []);
    P.enter = null;
    // ketuk badan bangunan (termasuk atap) di layar
    const sx = cx - r.left, sy = cy - r.top;
    for (const b of all) {
      if (b.id === 'kepala' || b.id === 'rumah') continue;
      const [hw, hd] = fpx(b); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ok = true;
      [-1, 1].forEach(ax => [-1, 1].forEach(az => [0, 11].forEach(h => { const q = screenOf((b.x + ax * hw) * U, h, (b.y + az * hd) * U); if (!q) { ok = false; return; } x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); })));
      if (ok && sx > x0 && sx < x1 && sy > y0 && sy < y1) { P.tx = b.x; P.ty = b.y + frontOf(b); P.enter = b.id; selNPC = null; return; }
    }
    for (const b of all) { const [hw, hd] = b.id === 'rumah' || b.id === 'kepala' ? [45, 45] : fpx(b); if (Math.abs(px - b.x) < hw + 8 && Math.abs(py - b.y) < hd + 8) { P.tx = b.x; P.ty = b.y + (b.id === 'rumah' ? 60 : frontOf(b)); P.enter = b.id; selNPC = null; return; } }
    P.tx = Math.max(30, Math.min(W - 30, px)); P.ty = Math.max(60, Math.min(WATER - 14, py));
    selNPC = null;
  }
  function pDown(e) {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { tapOk = true; downAt = { x: e.clientX, y: e.clientY }; lastPtr = { x: e.clientX, y: e.clientY }; }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoomTarget; tapOk = false; }
  }
  function pMove(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 12) tapOk = false;
    if (ptrs.size === 1 && !tapOk && renderer && lastPtr) {
      const per = (2 * Math.tan(19 * Math.PI / 180) * camBase * zoomZ) / vh;
      pan.x -= (e.clientX - lastPtr.x) * per; pan.z -= (e.clientY - lastPtr.y) * per * 1.25;
      const lim = 40 + zoomZ * 40; pan.x = Math.max(-lim, Math.min(lim, pan.x)); pan.z = Math.max(-lim, Math.min(lim, pan.z));
    }
    lastPtr = { x: e.clientX, y: e.clientY };
    if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 0) setZoom(zoom0 * pinch0 / d); }
  }
  function pUp(e) {
    const had = ptrs.has(e.pointerId); ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch0 = 0;
    if (ptrs.size === 1) { lastPtr = [...ptrs.values()][0]; tapOk = false; }
    if (had && ptrs.size === 0 && tapOk) onTap(e.clientX, e.clientY);
  }

  // ---------- buka / tutup ----------
  let building = false;
  async function openGame() {
    if (open || building) return;
    $('hutan').hidden = false; document.documentElement.classList.add('dihutan');
    if (!renderer) {
      building = true; $('hLoad').hidden = false; $('hLoad').textContent = 'Menumbuhkan hutan...';
      try { await loadThree(); buildDeco(); buildNPC(); buildColliders(); await buildWorld(); }
      catch (e) { building = false; $('hLoad').textContent = 'Dunia 3D belum bisa dibuka di perangkat ini. Coba browser lain.'; return; }
      building = false; $('hLoad').hidden = true;
    }
    open = true; resize(); last = performance.now(); load();
    $('hHud').hidden = true;
    if (save && !save.guest && save.u) dlgMasuk(); else { save = null; dlgDaftar(); }
    camTarget.x = P.x * U; camTarget.z = P.y * U; pan.x = 0; pan.z = 0; camVel.lx = null;
    requestAnimationFrame(frame);
  }
  function closeGame() {
    open = false; closeDlg(); $('hutan').hidden = true; document.documentElement.classList.remove('dihutan');
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  function wire() {
    const hc = $('hCanvas');
    hc.addEventListener('pointerdown', pDown); hc.addEventListener('pointermove', pMove);
    hc.addEventListener('pointerup', pUp); hc.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); pinch0 = 0; });
    hc.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoomTarget * Math.exp(e.deltaY * .0015)); }, { passive: false });
    const jb = $('hJoy'), jk = $('hJoyK');
    const joyMove = e => { const r = jb.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width * .38; let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy); if (l > R) { dx = dx / l * R; dy = dy / l * R; } joy.x = dx / R; joy.y = dy / R; jk.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; };
    const joyEnd = () => { joy.on = false; joy.x = 0; joy.y = 0; jk.style.transform = ''; jb.classList.remove('on'); };
    jb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); jb.setPointerCapture(e.pointerId); joy.on = true; jb.classList.add('on'); pan.x = 0; pan.z = 0; joyMove(e); });
    jb.addEventListener('pointermove', e => { if (joy.on) { e.preventDefault(); joyMove(e); } });
    jb.addEventListener('pointerup', joyEnd); jb.addEventListener('pointercancel', joyEnd); jb.addEventListener('lostpointercapture', joyEnd);
    $('hZin').onclick = () => setZoom(zoomTarget / 1.35);
    $('hZout').onclick = () => setZoom(zoomTarget * 1.35);
    $('hPeta').onclick = () => setZoom(zoomTarget > 2.2 ? 1 : ZMAX);
    $('hAct').onclick = () => near && interact(near.id);
    $('hJam').onclick = cyclePreview;
    const mb = $('hMusik'), syncM = () => { const on = !(window.RHR.bgm && window.RHR.bgm.muted()); mb.setAttribute('aria-pressed', String(on)); mb.setAttribute('aria-label', on ? 'Matikan lagu' : 'Nyalakan lagu'); mb.classList.toggle('mati', !on); };
    mb.onclick = () => { window.RHR.bgm.mute(!window.RHR.bgm.muted()); syncM(); toast(window.RHR.bgm.muted() ? 'Lagu dimatikan' : 'Lagu dinyalakan'); }; syncM();
    $('hRumah').onclick = () => { pan.x = 0; pan.z = 0; if (home) { P.tx = home.x; P.ty = home.y + 26; toast('Jalan pulang ke rumah...'); } };
    $('hDlg').addEventListener('click', e => {
      if (e.target === $('hDlg') || e.target.closest('[data-close]')) { closeDlg(); return; }
      const hb = e.target.closest('[data-hat]');
      if (hb) {
        const h = HATS.find(x => x.id === hb.dataset.hat); save.hats = save.hats || [''];
        if (!save.hats.includes(h.id)) { if (save.biji < h.c) { toast('Biji kurang. Kerja dulu di Pos Pemadam.'); return; } setBiji(save.biji - h.c); save.hats.push(h.id); toast(h.n + ' dibeli!'); }
        save.hat = h.id; persist(); refreshPlayer(); dlgSalon();
      }
    });
    addEventListener('resize', () => { if (open) resize(); });
    addEventListener('keydown', e => {
      if (!open) return;
      if (e.key === 'Escape') { if (dlgOpen() && save) closeDlg(); return; }
      if (dlgOpen()) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(k)) { keys[k] = true; e.preventDefault(); }
      if (k === '-' || k === '_') setZoom(zoomTarget * 1.35);
      if (k === '=' || k === '+') setZoom(zoomTarget / 1.35);
      if ((k === 'e' || k === 'Enter') && near) { interact(near.id); e.preventDefault(); }
    });
    addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
    document.querySelectorAll('[data-hutan]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openGame(); }));
    openGame(); // Republik Hutan Rimba langsung terbuka di peta
  }

  window.RHR = Object.assign(window.RHR || {}, { createPatroli, openGame });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
