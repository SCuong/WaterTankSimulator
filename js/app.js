/* Giao diện: một trạng thái mô phỏng (sim) + một mô hình thiết kế (model) → mọi bảng, 3D và điện thoại đọc chung. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const fmt = Design.fmtVND;
  const nf = (v, d) => (v == null || !Number.isFinite(v) ? '—' : v.toLocaleString('vi-VN', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const store = {
    get(k, d) { try { const v = localStorage.getItem('twin.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('twin.' + k, JSON.stringify(v)); } catch (e) { /* bộ nhớ trình duyệt bị chặn: bỏ qua */ } },
  };
  const icon = (n) => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  // ================= Thành phần giao diện dùng chung =================
  // Thanh trượt: tô phần đã chọn qua biến CSS --p
  const fillRange = (el) => { const lo = +el.min || 0, hi = el.max === '' ? 100 : +el.max; el.style.setProperty('--p', ((el.value - lo) / (hi - lo)) * 100 + '%'); };
  document.addEventListener('input', (e) => { if (e.target.type === 'range') fillRange(e.target); });

  // Tab ARIA: bấm hoặc ←/→ để chuyển; onShow(tab) báo tab vừa mở
  function tabs(list, onShow) {
    const all = $$('[role=tab]', list);
    const show = (t, focus) => {
      all.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; const p = x.getAttribute('aria-controls'); if (p) $('#' + p).hidden = !on; });
      if (focus) t.focus();
      if (onShow) onShow(t);
    };
    all.forEach((t, i) => {
      t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
      t.addEventListener('click', () => show(t));
      t.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); show(all[(i + d + all.length) % all.length], true); } });
    });
  }

  // Hộp chọn tùy biến thay <select> gốc; <select> ẩn vẫn là nguồn giá trị (đọc/ghi .value, phát 'input' + 'change')
  function dropdown(sel) {
    const wrap = document.createElement('div'), btn = document.createElement('button'), list = document.createElement('ul');
    const id = sel.id || 'dd' + Math.random().toString(36).slice(2, 7);
    wrap.className = 'dd'; btn.type = 'button'; btn.className = 'dd-btn'; btn.id = id + '-btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    list.className = 'dd-list'; list.id = id + '-list'; list.setAttribute('role', 'listbox'); list.hidden = true; list.tabIndex = -1;
    const lbl = sel.id && $(`label[for="${sel.id}"]`);
    if (lbl) { lbl.htmlFor = btn.id; btn.setAttribute('aria-labelledby', (lbl.id = lbl.id || id + '-lbl') + ' ' + btn.id); }
    sel.hidden = true; sel.tabIndex = -1; sel.after(wrap); wrap.append(btn, list);
    const opts = () => [...sel.options];
    let act = 0;
    const sync = () => {
      btn.innerHTML = `<span>${esc(sel.selectedOptions[0] ? sel.selectedOptions[0].text : '')}</span>${icon('chev-d')}`;
      btn.disabled = sel.disabled;
    };
    const paint = () => $$('li', list).forEach((li, i) => { li.classList.toggle('is-active', i === act); li.setAttribute('aria-selected', i === sel.selectedIndex); });
    const open = () => {
      list.innerHTML = opts().map((o, i) => `<li role="option" id="${id}-o${i}">${esc(o.text)}${icon('check')}</li>`).join('');
      act = Math.max(0, sel.selectedIndex); list.hidden = false; btn.setAttribute('aria-expanded', 'true'); paint();
      list.setAttribute('aria-activedescendant', `${id}-o${act}`); list.focus();
      $$('li', list).forEach((li, i) => { li.addEventListener('click', () => pick(i)); li.addEventListener('mousemove', () => { act = i; paint(); }); });
    };
    const close = (refocus) => { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (refocus) btn.focus(); };
    const pick = (i) => { if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } sync(); close(true); };
    btn.addEventListener('click', () => (list.hidden ? open() : close()));
    btn.addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); } });
    list.addEventListener('keydown', (e) => {
      const n = opts().length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; paint(); list.setAttribute('aria-activedescendant', `${id}-o${act}`); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); act = e.key === 'Home' ? 0 : n - 1; paint(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(act); }
      else if (e.key === 'Escape' || e.key === 'Tab') { close(e.key === 'Escape'); }
    });
    document.addEventListener('pointerdown', (e) => { if (!list.hidden && !wrap.contains(e.target)) close(); });
    sync();
    sel._sync = sync;
    return sel;
  }

  let params = Design.sanitize(store.get('params', Design.defaults()));
  let variant = store.get('variant', 'detailed') === 'simple' ? 'simple' : 'detailed';
  let model = Design.compute(params, variant);
  const sim = Sim.create(model);
  let speed = 1, mode = 'run', selected = null, asmStep = null, asmTimer = null, docDirty = true;
  const have = new Set(store.get('have2', model.bom.filter((b) => b.have).map((b) => b.id)));
  let snap = null; // dữ liệu điện thoại nhận được gần nhất

  // ================= 3D =================
  Scene3D.init($('#stage3d'));
  // Máy yếu / màn cảm ứng: Thực tế ở chất lượng thấp (bỏ khúc xạ, chi tiết vi mô, pixel ratio 1)
  Scene3D.setQuality(matchMedia('(pointer: coarse)').matches || innerWidth < 860 || (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 'low' : 'high');
  $('#tQuality').setAttribute('aria-pressed', Scene3D.getQuality() === 'high');
  Scene3D.onQuality((q) => { $('#tQuality').setAttribute('aria-pressed', q === 'high'); hint('Máy chạy chậm: đã tắt khúc xạ và hậu kỳ (Hiển thị › Chi tiết cao để bật lại).'); });
  $('#tQuality').addEventListener('click', (e) => { const hi = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', hi); Scene3D.setQuality(hi ? 'high' : 'low'); });
  Scene3D.build(model);
  let uiAcc = 0, chartAcc = 0;
  Scene3D.onFrame((dt) => {
    if (speed > 0) sim.step(dt * speed);
    Scene3D.sync(sim, dt);
    uiAcc += dt; chartAcc += dt;
    if (uiAcc > 0.12) { uiAcc = 0; renderLive(); }
    if (chartAcc > 0.5 && $('#app').dataset.phone === '1') { chartAcc = 0; drawChart(); }
  });
  // Chỉ Chế tạo mới chọn bộ phận; ở Vận hành/Thí nghiệm rê chuột vẫn hiện tên, bấm không đổi workspace
  Scene3D.onPick((id) => { if (mode === 'build') showPart(id); else Scene3D.select(null); });
  Scene3D.onMeasure((r) => {
    const h = $('#stageHint');
    h.hidden = false;
    h.innerHTML = r ? `<b class="mono">${nf(r.d, 1)} mm</b> · Δx ${nf(r.dx, 1)} · Δy ${nf(r.dy, 1)} · Δz ${nf(r.dz, 1)} — bấm tiếp để đo lại` : 'Thước đo: bấm điểm thứ hai trên mô hình';
  });

  // ================= Khung làm việc: popover, panel theo ngữ cảnh =================
  // Popover: một cái mở một lúc; bấm ngoài hoặc Esc để đóng, focus về nút mở
  function closePops(except) { $$('[aria-controls^="pop"][aria-expanded="true"]').forEach((b) => { if (b !== except) { b.setAttribute('aria-expanded', 'false'); $('#' + b.getAttribute('aria-controls')).hidden = true; } }); }
  $$('[aria-controls^="pop"]').forEach((b) => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true'; closePops(b);
    b.setAttribute('aria-expanded', open); $('#' + b.getAttribute('aria-controls')).hidden = !open;
  }));
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.popwrap')) closePops(); });

  const narrow = matchMedia('(max-width: 859px)');
  let stageW = 0;
  const wide = innerWidth >= 1280 && !narrow.matches;
  const ui = Object.assign({ ctx: { run: wide, lab: wide }, phone: false, tree: wide }, store.get('ui', {}));
  if (narrow.matches) { ui.ctx = { run: false, lab: false }; ui.phone = ui.tree = false; } // màn hẹp luôn mở bằng mô hình
  function applyUi() {
    const a = $('#app').dataset, insp = mode === 'build' && !!selected;
    a.ctx = mode !== 'build' && ui.ctx[mode] ? 1 : 0; a.phone = mode !== 'build' && ui.phone ? 1 : 0;
    a.tree = mode === 'build' && ui.tree ? 1 : 0; a.insp = insp ? 1 : 0;
    $('#dCtx').setAttribute('aria-pressed', a.ctx === '1'); $('#dPhone').setAttribute('aria-pressed', a.phone === '1'); $('#dTree').setAttribute('aria-pressed', a.tree === '1');
    $('#dCtxTxt').textContent = mode === 'lab' ? 'Sự cố' : 'Điều khiển';
    if (a.phone === '1') { renderPhone(sim.connected()); drawChart(); }
    store.set('ui', ui);
    // Panel vừa mở làm viewport hẹp lại → đặt lại khung nhìn để mô hình không bị cắt
    requestAnimationFrame(() => { const w = $('#stage').clientWidth; if (w && w < stageW - 40) Scene3D.fit(); stageW = w || stageW; });
  }
  // Màn hẹp: panel là tấm trượt đáy, chỉ một tấm mở một lúc
  function openPane(k, on) {
    if (on && narrow.matches) { ui.ctx.run = ui.ctx.lab = false; ui.phone = false; ui.tree = false; if (k !== 'insp' && selected) { selected = null; Scene3D.select(null); renderTree(); } }
    if (k === 'ctx') ui.ctx[mode] = on; else if (k === 'insp') { if (!on) showPart(null); } else ui[k] = on;
    applyUi();
  }
  $('#dCtx').addEventListener('click', () => openPane('ctx', !ui.ctx[mode]));
  $('#dPhone').addEventListener('click', () => openPane('phone', !ui.phone));
  $('#dTree').addEventListener('click', () => openPane('tree', !ui.tree));
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => openPane(b.dataset.close, false)));

  const VIEW = Object.fromEntries($$('#viewGrid [data-view]').map((b) => [b.dataset.view, b.textContent]));
  const LOOK = { schem: 'Sơ đồ', cad: '3D', real: 'Thực tế', compare: 'So sánh' };
  let curView = 'iso';
  const syncViewBtn = () => { const l = $('#app').dataset.look; $('#dViewTxt').textContent = l === 'schem' ? LOOK[l] : `${LOOK[l]} · ${VIEW[curView]}`; };
  const setViewSel = (v) => { curView = v; pressOnly('#viewGrid', $(`#viewGrid [data-view="${v}"]`)); syncViewBtn(); };
  $$('#viewGrid [data-view]').forEach((b) => b.addEventListener('click', () => { Scene3D.view(b.dataset.view); setViewSel(b.dataset.view); }));

  // ================= Lớp ngoài đời: ảnh tham chiếu, kiểu hiển thị =================
  const COMMONS = { 'mega.jpg': 'Arduino MEGA 2560 R3, front side.jpg', 'hcsr04.jpg': 'HC SR04 Ultrasonic Module.jpg', 'relay.jpg': 'SRD-05VDC-SL-C 5V one-channel relay module.jpg', 'lcd.jpg': 'MELT 16x2 LCD alphanumeric display 02(DXO).jpg' };
  const C = (file, credit, lic) => ({ src: 'assets/ref/' + file, kind: 'photo', credit: credit + ' · ' + lic + ' · Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(COMMONS[file].replace(/ /g, '_')) });
  const AI = (file) => ({ src: 'assets/ref/ai/' + file, kind: 'ai', credit: 'Ảnh minh họa AI' });
  const REF = { // ảnh ngoài đời theo bộ phận: ảnh thật nếu có giấy phép mở, không thì ảnh AI (gắn nhãn)
    mega: C('mega.jpg', 'Dsimic', 'CC BY-SA 4.0'), hcsr04: C('hcsr04.jpg', 'Suyash.dwivedi', 'CC BY-SA 4.0'), relay: C('relay.jpg', 'Suyash.dwivedi', 'CC BY-SA 4.0'),
    espKit: AI('esp01.jpg'), lcd: C('lcd.jpg', 'Retired electrician', 'CC0'),
    ws: AI('water-sensor.jpg'), pump: AI('pump.jpg'), buzzer: AI('buzzer.jpg'),
    tank: AI('jar-water.jpg'), tubePump: AI('tubes-wires.jpg'), tubeDrain: AI('tubes-wires.jpg'), tubeOverflow: AI('tubes-wires.jpg'), wires: AI('tubes-wires.jpg'),
  };
  const LAB = { id: 'lab', view: 'iso', name: 'Bàn lab', src: 'assets/ref/ai/workspace-lab.jpg' }; // tham chiếu bối cảnh cho chế độ Thực tế
  const SHOTS = { // góc chụp toàn cảnh ↔ góc camera 3D tương ứng
    detailed: [['overview', 'iso', 'Toàn cảnh'], ['front', 'front', 'Phía trước'], ['tank', 'tank', 'Bình chứa'], ['pump', 'pump', 'Bơm & nguồn'], ['control', 'control', 'Mạch & LCD']].map(([id, view, name]) => ({ id, view, name, src: 'assets/ref/ai/assembly-' + id + '.jpg' })).concat(LAB),
    simple: [{ id: 'overview', view: 'iso', name: 'Toàn cảnh', src: 'assets/ref/ai/simple-overview.jpg' }, LAB],
  };
  const imgTag = (src, alt) => `<img src="${src}" alt="${esc(alt)}" onerror="this.closest('figure').classList.add('no-img')">`;
  const credit = (r) => (r.url ? `<a href="${r.url}" target="_blank" rel="noopener">${esc(r.credit)}</a>` : esc(r.credit));
  const shortName = (n) => n.replace(/\s*\(.*\)$/, '');
  const lb = $('#lightbox');
  function openLightbox(src, cap) { $('#lbImg').src = src; $('#lbImg').alt = cap; $('#lbCap').textContent = cap; lb.showModal(); }
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });

  let shotId = 'overview';
  $$('#lookSeg button').forEach((b) => b.addEventListener('click', () => setLook(b.dataset.look)));
  function setLook(l) {
    pressOnly('#lookSeg', $(`#lookSeg [data-look="${l}"]`)); $('#app').dataset.look = l;
    $('#schem').hidden = l !== 'schem';
    if (l === 'schem') $('#schem').innerHTML = `<figure><figcaption>Sơ đồ đấu nối thực tế <small>+5V, +3V3, GND cùng tên = cùng nút</small></figcaption>${Drawings.wiring()}</figure>`;
    if (l === 'schem' && $('#tMeasure').getAttribute('aria-pressed') === 'true') $('#tMeasure').click();
    Scene3D.setLook(l === 'real' || l === 'compare' ? 'real' : 'cad');
    $('#cmpPane').hidden = l !== 'compare'; if (l === 'compare') renderCompare();
    if (selected && mode === 'build') showPart(selected); // chụp lại ảnh bộ phận theo kiểu hiển thị mới
    syncViewBtn();
  }
  function renderCompare() {
    const list = SHOTS[variant]; if (!list.some((x) => x.id === shotId)) shotId = list[0].id;
    $('#cmpShots').innerHTML = list.map((x) => `<button data-shot="${x.id}" aria-pressed="${x.id === shotId}">${x.name}</button>`).join('');
    $$('#cmpShots button').forEach((b) => b.addEventListener('click', () => { shotId = b.dataset.shot; renderCompare(); }));
    const x = list.find((y) => y.id === shotId), fig = $('#cmpPane .cmp-fig');
    fig.classList.remove('no-img'); $('#cmpImg').onerror = () => fig.classList.add('no-img'); $('#cmpImg').src = x.src; $('#cmpImg').alt = x.name;
    $('#cmpCap').textContent = x.name + ' · Ảnh minh họa AI theo bản vẽ';
    Scene3D.view(x.view); setViewSel(x.view);
  }
  $('#cmpOpen').addEventListener('click', () => openLightbox($('#cmpImg').src, $('#cmpCap').textContent));

  function renderGallery() {
    $('#shots').innerHTML = SHOTS[variant].map((x, i) => `<figure class="shot${i ? '' : ' shot-lead'}"><button class="shot-img" data-open="${x.src}" data-cap="${esc(x.name)}" aria-label="Phóng to ${esc(x.name)}">${imgTag(x.src, x.name)}<span class="ai-tag">Ảnh minh họa AI</span></button>
      <figcaption><span>${x.name}</span><button class="btn btn-sm btn-ghost" data-cmp="${x.id}">${icon('isolate')}So với 3D</button></figcaption></figure>`).join('');
    $('#refGrid').innerHTML = Object.entries(REF).filter(([id]) => model.parts[id]).map(([id, r]) => `<figure class="ref"><button class="shot-img" data-open="${r.src}" data-cap="${esc(model.parts[id].name)}" aria-label="Phóng to ${esc(model.parts[id].name)}">${imgTag(r.src, model.parts[id].name)}${r.kind === 'ai' ? '<span class="ai-tag">AI</span>' : ''}</button>
      <figcaption><b>${esc(shortName(model.parts[id].name))}</b><span class="${r.kind}">${credit(r)}</span></figcaption></figure>`).join('');
    $$('#d-real [data-open]').forEach((b) => b.addEventListener('click', () => openLightbox(b.dataset.open, b.dataset.cap)));
    $$('#d-real [data-cmp]').forEach((b) => b.addEventListener('click', () => { shotId = b.dataset.cmp; setDoc(false); setLook('compare'); }));
  }
  toggle('#tLabels', (on) => Scene3D.setLabels(on));
  toggle('#tDims', (on) => { Scene3D.setDims(on); if (on && Scene3D.getExplode().cur > 0.01) hint('Kích thước hiện khi mô hình đã lắp hoàn chỉnh.'); });
  toggle('#tMeasure', (on) => { Scene3D.setMeasure(on); $('#stageHint').hidden = !on; if (on) $('#stageHint').textContent = 'Thước đo: bấm 2 điểm bất kỳ trên mô hình (khoảng cách thẳng, mm)'; });
  // Esc lùi từng lớp: popover → thước đo → bộ phận đang chọn
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || lb.open || (e.target.closest && e.target.closest('.dd'))) return;
    const pop = $('[aria-controls^="pop"][aria-expanded="true"]');
    if (pop) { closePops(); pop.focus(); }
    else if ($('#tMeasure').getAttribute('aria-pressed') === 'true') $('#tMeasure').click();
    else if (mode === 'build' && selected) showPart(null);
  });

  function toggle(sel, fn) { const b = $(sel); b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); fn(on); }); }
  function pressOnly(group, btn) { $$(group + ' button').forEach((x) => x.setAttribute('aria-pressed', x === btn)); }
  let hintT = 0;
  function hint(t) { const h = $('#stageHint'); h.hidden = false; h.textContent = t; clearTimeout(hintT); hintT = setTimeout(() => { if ($('#tMeasure').getAttribute('aria-pressed') !== 'true') h.hidden = true; }, 3500); }

  // ================= Chế độ =================
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  function setMode(m) {
    if (m !== 'build') setDoc(false);
    mode = m;
    $('#app').dataset.mode = m;
    $$('.tabs button').forEach((b) => { b.setAttribute('aria-selected', b.dataset.mode === m); b.tabIndex = b.dataset.mode === m ? 0 : -1; });
    closePops();
    if (m !== 'build') { stopAsm(); Scene3D.setExplode(0, 'all'); syncExplodeUi(0); setSection('off'); if (selected) showPart(null); }
    applyUi(); renderLive();
  }
  $$('.tabs button').forEach((b, i, all) => b.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); const t = all[(i + d + all.length) % all.length]; t.focus(); setMode(t.dataset.mode); } }));
  // Hồ sơ chế tạo: trang tài liệu trong workspace Chế tạo
  function setDoc(on) {
    if (on && mode !== 'build') setMode('build');
    $('#app').dataset.doc = on ? 1 : 0;
    if (on) { if (docDirty) renderDoc(); renderGallery(); stopAsm(); closePops(); $('#doc').scrollTop = 0; }
  }
  $('#dDoc').addEventListener('click', () => setDoc(true));
  $('#docBack').addEventListener('click', () => setDoc(false));

  // ================= Phương án mô hình =================
  function syncVariantUi() {
    $$('#variantSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.variant === variant));
    $('#variantName').textContent = model.variantName;
    ['detailed', 'simple'].forEach((v) => { const x = v === variant ? model : Design.compute(params, v); $('#vMeta-' + v).textContent = `${x.metrics.footX}×${x.metrics.footZ} mm · ${x.metrics.parts} bộ phận`; });
    $('#valveLbl').textContent = model.has.drain ? 'Van xả (tiêu thụ)' : 'Múc nước ra (mô phỏng tiêu thụ)';
    renderChips();
  }
  $$('#variantSeg button').forEach((b) => b.addEventListener('click', () => {
    closePops(); $('#variantBtn').focus();
    if (b.dataset.variant === variant) return;
    variant = b.dataset.variant; store.set('variant', variant);
    stopAsm(); Scene3D.showAll(); Scene3D.setExplode(0, 'all'); syncExplodeUi(0); setSection('off');
    rebuild(); syncVariantUi(); renderParams();
    if ($('#app').dataset.look === 'compare') renderCompare(); if ($('#app').dataset.doc === '1') renderGallery();
    hint(`Đã chuyển sang ${model.variantName}: ${model.metrics.footX}×${model.metrics.footZ} mm, ${model.metrics.parts} bộ phận.`);
  }));

  // ================= Bàn thí nghiệm =================
  // Màn hẹp chỉ hiện nút dừng + tốc độ hiện tại; bấm lại tốc độ để chuyển 1× → 5× → 20×
  $$('#speedSeg button').forEach((b) => b.addEventListener('click', () => {
    const run = $$('#speedSeg button:not([data-speed="0"])');
    let t = b;
    if (narrow.matches && b.dataset.speed !== '0' && b.getAttribute('aria-pressed') === 'true') t = run[(run.indexOf(b) + 1) % run.length];
    speed = +t.dataset.speed; pressOnly('#speedSeg', t);
    if (speed) run.forEach((x) => x.classList.toggle('is-last', x === t));
  }));
  $('#valve').addEventListener('input', (e) => { sim.lab.valve(e.target.value / 100); $('#valveOut').textContent = e.target.value + ' %'; });
  $('#addWater').addEventListener('click', () => sim.lab.addWater(0.5));
  $('#emptySrc').addEventListener('click', () => sim.lab.emptySource());
  $('#fLeak').addEventListener('change', (e) => sim.lab.fault('leak', e.target.checked));
  $('#fWifi').addEventListener('change', (e) => sim.lab.fault('wifi', e.target.checked));
  $('#fWeak').addEventListener('change', (e) => sim.lab.fault('weak', e.target.checked));
  $('#fPower').addEventListener('change', (e) => sim.lab.fault('power', e.target.checked));
  dropdown($('#fSensor')).addEventListener('change', (e) => sim.lab.fault('sensor', e.target.value));
  tabs($('[data-tabs="lab"]'));
  $('#dryTray').addEventListener('click', () => sim.lab.dryTray());
  $('#resetBtn').addEventListener('click', () => sim.lab.reset());
  $('#fwState').addEventListener('click', (e) => { if (e.target.closest('[data-fw-reset]')) sim.lab.reset(); });

  function renderLive() {
    const d = sim.dev, k = sim.k, conn = sim.connected();
    $('#topClock').textContent = Sim.fmtClock(sim.t);
    const F = sim.faults, nF = [F.leak, F.weak, F.wifi, F.power, F.sensor !== 'ok'].filter(Boolean).length, fc = $('#faultCount');
    fc.hidden = !nF; fc.textContent = nF; fc.setAttribute('aria-label', `${nF} sự cố đang bật`);
    if (mode !== 'build') {
      const err = d.levelMm == null ? null : d.levelMm - sim.level;
      $('#truth').innerHTML = [
        ['Mực nước thật', `${nf(sim.level, 1)} mm`], ['Mega đo (lọc)', d.levelMm == null ? '—' : `${nf(d.levelMm, 1)} mm`], ['Sai số', err == null ? '—' : `${err >= 0 ? '+' : ''}${nf(err, 1)} mm`],
        ['hr'], ['HC-SR04 thô', d.raw == null ? 'không có ECHO' : `${nf(d.raw, 1)} mm`], ['Thời gian echo', `${nf(d.echoUs)} µs`],
        ['hr'], ['Hộp nguồn', `${nf(sim.res, 0)} mm · ${nf(sim.res * k.resArea / 1e6, 2)} L`], ['Nước trong khay', `${nf(sim.tray, 1)} mL`],
        ['Bơm / xả / tràn <small>L/phút</small>', `${nf(sim.q.pump, 2)} / ${nf(sim.q.drain, 2)} / ${nf(sim.q.overflow, 2)}`],
      ].map((r) => (r[0] === 'hr' ? '<div class="hr"></div>' : `<dt>${r[0]}</dt><dd>${r[1]}</dd>`)).join('');
      const fw = $('#fwState');
      let cls = !sim.faults.power && d.pump ? 'on' : '', t, sub;
      if (sim.faults.power) { cls = 'danger'; t = 'Mất điện'; sub = 'Relay NO mở → bơm tắt'; }
      else if (d.booting > 0) { cls = 'warn'; t = 'Đang khởi động'; sub = 'Bơm giữ tắt tới khi có số đo'; }
      else if (d.lock) { cls = 'danger'; t = 'Khóa: ' + d.lock.msg; sub = d.lock.detail; }
      else { t = `${d.mode === 'auto' ? 'Tự động' : 'Thủ công'} · bơm ${d.pump ? 'chạy' : 'tắt'}`; sub = d.mode === 'auto' ? `<i class="sw sw-lo"></i>Bật ≤ ${d.low} %<i class="sw sw-hi"></i>tắt ≥ ${d.high} %` : `Giới hạn cứng ${Sim.HARD_MAX} %`; if (d.holdOff > 0) { cls = 'warn'; sub = `Relay nghỉ ${Math.ceil(d.holdOff)} s`; } if (!conn) { cls = 'warn'; sub += ' · mất Wi-Fi, Mega tự điều khiển'; } }
      // Nút RESET hiện ngay trên thẻ trạng thái khi firmware khóa bơm
      const fwHtml = `<span class="fw-dot" aria-hidden="true"></span><span class="fw-txt"><b>${esc(t)}</b><span>${d.lock || sim.faults.power || d.booting > 0 ? esc(sub) : sub}</span></span>${d.lock && !sim.faults.power ? '<button class="btn btn-sm" data-fw-reset>RESET Mega</button>' : ''}`;
      fw.className = 'fw sim-only ' + cls; if (fw.dataset.h !== fwHtml) { fw.innerHTML = fwHtml; fw.dataset.h = fwHtml; }
      const L = sim.lcd(), lcdEl = $('#lcd');
      lcdEl.classList.toggle('off', !L); lcdEl.textContent = L ? L.join('\n') : ' \n ';
      const bz = sim.buzzer(), pw = !sim.faults.power;
      $('#hw').innerHTML = [
        ['Relay · D6', pw && d.pump ? 'Đóng' : 'Mở', pw && d.pump ? 'on' : '', `${d.relayCycles} lần đóng`],
        ['Còi · D8', bz === 'alarm' ? 'Báo động' : bz === 'chirp' ? 'Kêu 10 s/lần' : 'Im', bz === 'alarm' ? 'bad' : bz === 'chirp' ? 'warn' : '', ''],
        ['Water Sensor · A0', pw ? String(d.wsAdc) : '—', d.wsAdc > Sim.WS_WET ? 'bad' : '', `ướt > ${Sim.WS_WET}`],
        ['ESP-01', !pw ? 'Mất điện' : sim.faults.wifi ? 'Mất Wi-Fi' : 'Kết nối', !pw || sim.faults.wifi ? 'warn' : 'on', ''],
      ].map(([k, v, c, sub]) => `<div><span>${k}</span><b class="${c}">${esc(v)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`).join('');
      const logHtml = sim.events.filter((e) => e.src === 'lab').slice(-12).reverse().map((e) => `<li><span>${Sim.fmtClock(e.t)}</span><span>${esc(e.msg)}</span></li>`).join('') || '<li class="empty">Chưa có thao tác.</li>';
      const lg = $('#labLog'); if (lg.dataset.h !== logHtml) { lg.innerHTML = logHtml; lg.dataset.h = logHtml; }
      // đồng bộ công tắc nếu trạng thái đổi từ nơi khác
      $('#fLeak').checked = F.leak; $('#fWeak').checked = F.weak; $('#fWifi').checked = F.wifi; $('#fPower').checked = F.power;
      if ($('#fSensor').value !== F.sensor) { $('#fSensor').value = F.sensor; $('#fSensor')._sync(); }
      renderPhone(conn);
    }
  }

  // ================= Điện thoại =================
  $$('#pMode button').forEach((b) => b.addEventListener('click', () => send('mode', b.dataset.pmode)));
  tabs($('[data-tabs="phone"]'), (t) => {
    $$('#phone .p-view').forEach((v) => { v.hidden = v.dataset.pview !== t.dataset.ptab; });
    if (t.dataset.ptab === 'history') drawChart();
  });
  $('#pPumpBtn').addEventListener('click', () => send('pump', !sim.dev.manualCmd));
  $('#pAck').addEventListener('click', () => send('reset'));
  const thr = () => { const lo = +$('#pLow').value, hi = +$('#pHigh').value; $('#pLowV').textContent = lo; $('#pHighV').textContent = hi; return [lo, hi]; };
  $('#pLow').addEventListener('input', thr); $('#pHigh').addEventListener('input', thr);
  ['#pLow', '#pHigh'].forEach((s) => $(s).addEventListener('change', () => { const [lo, hi] = thr(); if (!send('thresholds', lo, hi)) syncSliders(true); else docDirty = true; }));
  function syncSliders(force) {
    if (!force && (document.activeElement === $('#pLow') || document.activeElement === $('#pHigh'))) return;
    $('#pLow').value = snap ? snap.low : 30; $('#pHigh').value = snap ? snap.high : 85; thr();
    fillRange($('#pLow')); fillRange($('#pHigh'));
  }
  let toastT = 0;
  function toast(t) { const el = $('#pToast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }
  function send(name, a, b) { const r = sim.cmd(name, a, b); if (!r.ok) toast(r.msg); renderPhone(sim.connected()); return r.ok; }

  function renderPhone(conn) {
    const d = sim.dev, k = sim.k;
    if (conn && d.booting <= 0) snap = { t: sim.t, pct: d.pct, mm: d.levelMm, dist: d.filt, echo: d.echoUs, pump: d.pump, mode: d.mode, manual: d.manualCmd, low: d.low, high: d.high, lock: d.lock, rate: d.rate };
    $('#pTime').textContent = Sim.fmtClock(sim.t).slice(0, 5);
    $('#pWifi').classList.toggle('off', sim.faults.wifi);
    $('#pConn').textContent = conn ? 'Trực tuyến' : 'Mất kết nối'; $('#pConn').classList.toggle('off', !conn);
    const off = $('#pOffline'), booting = conn && d.booting > 0;
    off.hidden = conn && !booting;
    if (booting) off.innerHTML = `<b>Dữ liệu cuối lúc ${snap ? Sim.fmtClock(snap.t) : '—'}</b>Mega đang khởi động, chờ số đo.`;
    // Mất điện ≠ mất Wi-Fi: chỉ khi còn điện Mega mới tự điều khiển tại chỗ
    if (!conn) off.innerHTML = `<b>Dữ liệu cuối lúc ${snap ? Sim.fmtClock(snap.t) : '—'}</b>${sim.faults.power ? 'Thiết bị mất điện.' : 'Mất Wi-Fi. Mega vẫn tự điều khiển tại chỗ.'}`;
    $('.p-body').classList.toggle('stale', !conn || booting);
    $$('#phone .p-body button, #phone .p-body input').forEach((el) => { el.disabled = !conn; });
    if (!snap) return;
    const s = snap;
    $('#pPct').textContent = s.pct == null ? '—' : nf(s.pct);
    $('#pLiters').textContent = s.mm == null ? 'Chờ số đo…' : `${nf(s.mm)} mm · ${nf(s.mm * k.tankArea / 1e6, 2)} / ${nf(k.usableH * k.tankArea / 1e6, 2)} L`;
    $('#pDist').textContent = s.dist == null ? '—' : `${nf(s.dist / 10, 1)} cm`;
    $('#pFill').style.height = Math.max(0, Math.min(100, s.pct || 0)) + '%';
    $('#pMkLo').style.bottom = s.low + '%'; $('#pMkHi').style.bottom = s.high + '%';
    $('#pPump').textContent = s.pump ? 'Đang bơm' : 'Tắt';
    $('#pPumpDot').classList.toggle('on', s.pump);
    $('#pRate').textContent = Math.abs(s.rate) < 0.05 ? 'Số đo ổn định' : `Số đo ${s.rate > 0 ? 'tăng' : 'giảm'} ${nf(Math.abs(s.rate), 2)} L/phút`; // ước tính từ cảm biến, có nhiễu
    $$('#pMode button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.pmode === s.mode));
    const pb = $('#pPumpBtn'); pb.hidden = s.mode !== 'manual';
    pb.textContent = s.manual ? 'Tắt bơm' : 'Bật bơm'; pb.classList.toggle('stop', s.manual);
    const al = $('#pAlert');
    al.hidden = !s.lock;
    if (s.lock) { $('#pAlertT').textContent = s.lock.msg; $('#pAlertD').textContent = s.lock.detail; }
    syncSliders(false);
    const evs = sim.events.filter((e) => e.src === 'dev' && e.t <= s.t + 0.01).slice(-30).reverse();
    const html = evs.map((e) => `<li><span>${Sim.fmtClock(e.t)}</span><span class="${e.lvl}">${esc(e.msg)}</span></li>`).join('') || '<li><span></span><span>Chưa có sự kiện.</span></li>';
    const ul = $('#pEvents'); if (ul.dataset.h !== html) { ul.innerHTML = html; ul.dataset.h = html; }
  }

  function drawChart() {
    const cv = $('#pChart'), dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (!w) return;
    if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    // Trục thời gian giãn theo dữ liệu đang có (tối thiểu 1 phút, tối đa 10 phút)
    const H = sim.history.slice(-600), span = Math.max(60, H.length), padL = 28, top = 4, bot = h - 16;
    const X = (i) => padL + (w - padL - 2) * (i + span - H.length) / (span - 1), Yv = (p) => bot - (bot - top) * Math.max(0, Math.min(110, p)) / 110;
    c.font = '12px ' + getComputedStyle(cv).fontFamily; c.fillStyle = '#4b5565'; c.strokeStyle = '#e6e8ee'; c.lineWidth = 1;
    [0, 50, 100].forEach((p) => { c.beginPath(); c.moveTo(padL, Yv(p)); c.lineTo(w, Yv(p)); c.stroke(); c.fillText(p + '%', 0, Yv(p) + 3); });
    c.fillText(span >= 120 ? `−${Math.round(span / 60)} phút` : `−${span} giây`, padL, h - 2); c.textAlign = 'right'; c.fillText('bây giờ', w - 2, h - 2); c.textAlign = 'left';
    const d = snap || sim.dev;
    c.setLineDash([4, 3]);
    [[d.low, '#dc6803'], [d.high, '#12b76a']].forEach(([p, col]) => { c.strokeStyle = col; c.beginPath(); c.moveTo(padL, Yv(p)); c.lineTo(w, Yv(p)); c.stroke(); });
    c.setLineDash([]);
    c.fillStyle = '#a6ef67';
    H.forEach((e, i) => { if (e.pump && e.pct != null) c.fillRect(X(i), bot - 5, (w - padL) / span + 0.6, 5); });
    c.strokeStyle = '#0b72e7'; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath();
    let pen = false;
    H.forEach((e, i) => { if (e.pct == null) { pen = false; return; } if (pen) c.lineTo(X(i), Yv(e.pct)); else { c.moveTo(X(i), Yv(e.pct)); pen = true; } });
    c.stroke();
    const last = H.length - 1; // chấm mẫu mới nhất
    if (last >= 0 && H[last].pct != null) { c.fillStyle = '#0b72e7'; c.beginPath(); c.arc(X(last), Yv(H[last].pct), 3.5, 0, Math.PI * 2); c.fill(); }
  }

  // ================= Tháo rời =================
  const CL = Object.fromEntries(Design.CLUSTERS.map((c) => [c.id, c.name]));
  function renderChips() {
    const used = new Set(Object.values(model.parts).map((p) => p.cluster));
    $('#clusterChips').innerHTML = `<button data-cl="all" aria-pressed="true">Tất cả</button>` + Design.CLUSTERS.filter((c) => used.has(c.id)).map((c) => `<button data-cl="${c.id}">${c.name}</button>`).join('');
    $$('#clusterChips button').forEach((b) => b.addEventListener('click', () => {
      pressOnly('#clusterChips', b); stopAsm();
      const v = Math.max(0.75, +$('#exSlider').value / 100); Scene3D.setExplode(v, b.dataset.cl); syncExplodeUi(v);
    }));
  }
  $('#exSlider').addEventListener('input', (e) => { stopAsm(); const v = e.target.value / 100; Scene3D.setExplode(v); $('#exOutV').textContent = e.target.value + ' %'; });
  $('#exOut').addEventListener('click', () => { stopAsm(); Scene3D.setExplode(1); syncExplodeUi(1); Scene3D.fit(); });
  $('#exIn').addEventListener('click', () => { stopAsm(); Scene3D.setExplode(0); syncExplodeUi(0); Scene3D.fit(); });
  function syncExplodeUi(v) {
    const sl = $('#exSlider'); sl.value = Math.round(v * 100); fillRange(sl); $('#exOutV').textContent = Math.round(v * 100) + ' %';
    $('#exIn').setAttribute('aria-pressed', v <= 0.001); $('#exOut').setAttribute('aria-pressed', v >= 0.999);
    exDockVal(v * 100);
  }
  // Dock nhắc mức tách đang áp dụng khi popover đã đóng
  const exDockVal = (pct) => { const b = $('#exDock'); b.hidden = pct < 1; b.textContent = Math.round(pct) + ' %'; $('#dExplode').classList.toggle('is-on', pct >= 1); };
  $('#exSlider').addEventListener('input', (e) => { $('#exIn').setAttribute('aria-pressed', e.target.value == 0); $('#exOut').setAttribute('aria-pressed', e.target.value == 100); exDockVal(+e.target.value); });

  $$('#secSeg button').forEach((b) => b.addEventListener('click', () => setSection(b.dataset.sec)));
  $('#secSlider').addEventListener('input', () => setSection($('#secSeg [aria-pressed="true"]').dataset.sec));
  function setSection(ax) {
    pressOnly('#secSeg', $(`#secSeg [data-sec="${ax}"]`));
    $('#secWrap').hidden = ax === 'off';
    const f = $('#secSlider').value / 100;
    Scene3D.setSection(ax === 'off' ? null : ax, f);
    $('#dSection').classList.toggle('is-on', ax !== 'off');
    if (ax !== 'off') { const span = (ax === 'z' ? model.metrics.footZ : model.metrics.footX) + 60; $('#secV').textContent = `${nf(-span / 2 + span * f)} mm`; }
  }

  // Lắp ráp từng bước — dùng chung model.steps với hướng dẫn trong hồ sơ
  const setPlay = (label, ic) => { $('#asmPlay').innerHTML = `${icon(ic)}<span>${label}</span>`; };
  $('#asmPlay').addEventListener('click', () => { if (asmTimer) { clearInterval(asmTimer); asmTimer = null; setPlay('Tự chạy', 'play'); } else playAsm(); });
  $('#asmNext').addEventListener('click', () => gotoStep(asmStep == null ? 0 : Math.min(model.steps.length - 1, asmStep + 1)));
  $('#asmPrev').addEventListener('click', () => gotoStep(asmStep == null ? 0 : Math.max(0, asmStep - 1)));
  $('#asmExit').addEventListener('click', stopAsm);
  $('#dAsm').addEventListener('click', () => (asmStep == null ? gotoStep(0) : stopAsm()));
  function playAsm() {
    gotoStep(asmStep == null || asmStep >= model.steps.length - 1 ? 0 : asmStep);
    setPlay('Tạm dừng', 'pause');
    asmTimer = setInterval(() => { if (asmStep >= model.steps.length - 1) { clearInterval(asmTimer); asmTimer = null; setPlay('Phát lại', 'reset'); return; } gotoStep(asmStep + 1); }, 3200);
  }
  function gotoStep(i) {
    asmStep = i; Scene3D.setExplode(0); syncExplodeUi(0); Scene3D.setAssembly(i);
    const st = model.steps[i], n = model.steps.length;
    $('#player').hidden = false; $('#dAsm').setAttribute('aria-pressed', 'true'); closePops();
    $('#asmNow').innerHTML = `<span class="step-k">Bước ${i + 1} / ${n}</span><strong>${esc(st.title)}</strong><ul>${st.text.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="asm-prog" aria-hidden="true">${model.steps.map((_, k) => `<i class="${k <= i ? 'done' : ''}"></i>`).join('')}</div>`;
    $('#asmPrev').disabled = i === 0; $('#asmNext').disabled = i === n - 1;
    renderTree();
    if (!asmTimer) setPlay('Tự chạy', 'play');
  }
  function stopAsm() {
    if (asmTimer) clearInterval(asmTimer); asmTimer = null; asmStep = null;
    Scene3D.setAssembly(null); $('#player').hidden = true; $('#dAsm').setAttribute('aria-pressed', 'false'); setPlay('Tự chạy', 'play');
    $('#asmPrev').disabled = false; $('#asmNext').disabled = false;
    renderTree();
  }

  function renderTree() {
    const by = {};
    for (const id in model.parts) (by[model.parts[id].cluster] = by[model.parts[id].cluster] || []).push(id);
    // Khi đang lắp ráp: bộ phận của bước sau làm mờ, bước hiện tại đánh dấu
    const stepOf = {}; model.steps.forEach((s, i) => s.parts.forEach((id) => { stepOf[id] = i; }));
    const asmCls = (id) => (asmStep == null || stepOf[id] == null ? '' : stepOf[id] > asmStep ? ' is-later' : stepOf[id] === asmStep ? ' is-now' : '');
    $('#partTree').innerHTML = Design.CLUSTERS.filter((c) => by[c.id]).map((c) => `<div class="tree"><h4>${c.name}</h4>${by[c.id].sort((a, b) => Scene3D.partNo(a) - Scene3D.partNo(b)).map((id) => {
      const nm = esc(model.parts[id].name), hid = Scene3D.isHidden(id);
      return `<div class="tree-row${hid ? ' is-hidden' : ''}${asmCls(id)}"><button class="nm" data-id="${id}" aria-current="${id === selected}" aria-label="${nm}"><span class="no">${Scene3D.partNo(id)}</span><span>${nm.replace(/\s*\(.*\)$/, '')}</span></button>
      <button class="eye" data-eye="${id}" aria-pressed="${!hid}" aria-label="${hid ? 'Hiện' : 'Ẩn'} ${nm}">${icon(hid ? 'eye-off' : 'eye')}</button></div>`;
    }).join('')}</div>`).join('');
    $$('#partTree .nm').forEach((b) => b.addEventListener('click', () => {
      if (narrow.matches) ui.tree = false; // màn hẹp: đóng tấm danh sách, mở tấm thông tin
      showPart(b.dataset.id); Scene3D.focus(b.dataset.id);
    }));
    $$('#partTree .eye').forEach((b) => b.addEventListener('click', () => { Scene3D.setHidden(b.dataset.eye, !Scene3D.isHidden(b.dataset.eye)); renderTree(); $(`#partTree [data-eye="${b.dataset.eye}"]`).focus(); }));
  }
  $('#showAll').addEventListener('click', () => { Scene3D.showAll(); renderTree(); if (selected) showPart(selected); });

  function showPart(id) {
    selected = id && model.parts[id] ? id : null;
    Scene3D.select(selected);
    const el = $('#partCard');
    if (!selected) { el.innerHTML = ''; renderTree(); applyUi(); return; }
    if (narrow.matches) { ui.tree = false; ui.phone = false; }
    const p = model.parts[selected], iso = Scene3D.getIsolated() === selected;
    const price = p.price ? fmt(p.price) : 'Dùng chung vật liệu — xem BOM';
    $('#inspNo').textContent = CL[p.cluster];
    el.innerHTML = `<h3><span class="no">${Scene3D.partNo(selected)}</span><span>${esc(p.name)}</span></h3>
      <dl>
        <dt>Kích thước</dt><dd>${esc(p.dimText)}${p.kind !== 'nominal' ? `<br><span class="kind kind-${p.kind}" data-tip="${esc(model.KIND[p.kind])}" tabindex="0">${esc(model.KIND[p.kind].split(' — ')[0])}</span>` : ''}</dd>
        <dt>Số lượng</dt><dd>${esc(p.qty)}</dd>
        <dt>Vật liệu</dt><dd>${esc(p.material)}</dd>
        <dt>Giá</dt><dd>${price}</dd>
      </dl>
      <details><summary>Chức năng, gia công &amp; nơi mua ${icon('chev-d')}</summary><dl>
        <dt>Chức năng</dt><dd>${esc(p.func)}</dd>
        <dt>Vị trí lắp</dt><dd>${esc(p.where)}</dd>
        <dt>Gia công</dt><dd>${esc(p.process)}</dd>
        <dt>Cố định</dt><dd>${esc(p.fix)}</dd>
        <dt>Kích thước cắt</dt><dd>${esc(p.cut)}</dd>
        <dt>Nơi mua</dt><dd>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.where2)}</a>` : esc(p.where2)}</dd>
      </dl></details>
      ${REF[selected] ? `<div class="ref2"><figure id="pcSnapFig"><figcaption>Mô hình ${Scene3D.getLook() === 'real' ? '(thực tế)' : '(3D)'}</figcaption></figure>
        <figure><button class="shot-img" id="pcRef" aria-label="Phóng to ảnh ngoài đời">${imgTag(REF[selected].src, p.name)}</button><figcaption class="${REF[selected].kind}">${credit(REF[selected])}</figcaption></figure></div>` : ''}
      <div class="btn-row"><button class="btn btn-sm" id="pcFocus">${icon('target')}Phóng tới</button><button class="btn btn-sm" id="pcIso" aria-pressed="${iso}">${icon('isolate')}${iso ? 'Bỏ cô lập' : 'Cô lập'}</button><button class="btn btn-sm" id="pcHide">${icon('eye-off')}Ẩn</button><button class="btn btn-sm" id="pcBom">${icon('list')}BOM</button></div>`;
    if (REF[selected]) { const id = selected; requestAnimationFrame(() => { if (selected === id && $('#pcSnapFig')) { const im = new Image(); im.alt = 'Bộ phận trong mô hình'; im.id = 'pcSnap'; im.src = Scene3D.snapshot(id); $('#pcSnapFig').prepend(im); } }); $('#pcRef').addEventListener('click', () => openLightbox(REF[id].src, p.name)); }
    $('#pcFocus').addEventListener('click', () => Scene3D.focus(selected));
    $('#pcIso').addEventListener('click', () => { Scene3D.isolate(iso ? null : selected); if (!iso) Scene3D.focus(selected); showPart(selected); });
    $('#pcHide').addEventListener('click', () => { Scene3D.setHidden(selected, true); showPart(null); });
    $('#pcBom').addEventListener('click', () => {
      const ids = p.bom; setDoc(true);
      const row = $(`#bomTable tr[data-id="${ids[0]}"]`); // setDoc đã dựng hồ sơ đồng bộ
      if (row) { row.scrollIntoView({ block: 'center' }); ids.forEach((b) => { const r = $(`#bomTable tr[data-id="${b}"]`); if (r) { r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 2000); } }); }
    });
    renderTree(); applyUi();
  }

  // ================= Hồ sơ chế tạo =================
  function renderParams() {
    // Nhóm theo vật thể; nhãn ngắn, nhãn đầy đủ + gợi ý + giới hạn nằm trong tooltip
    const SHORT = { tankD: 'Ø trong', tankH: 'Cao trong', tankWall: 'Thành', resL: 'Dài', resW: 'Rộng', resH: 'Cao', platformH: 'Bục đỡ', sheetT: 'Formex' };
    const GROUPS = [['Bình chứa', /^tank/], ['Hộp nguồn', /^res/], ['Kết cấu', /^(platformH|sheetT)$/]];
    const field = (d) => `<div class="param"${d.only && d.only !== variant ? ' hidden' : ''}>
      <label for="pm-${d.key}" data-tip="${esc(d.label)}: ${esc(d.hint)}${d.min != null ? ` · ${d.min}–${d.max} mm` : ''}">${esc(SHORT[d.key] || d.label)}</label>
      <div class="in">${d.options ? `<select id="pm-${d.key}" data-k="${d.key}">${d.options.map((o) => `<option ${o === params[d.key] ? 'selected' : ''}>${o}</option>`).join('')}</select>`
        : `<input class="input" id="pm-${d.key}" data-k="${d.key}" type="number" inputmode="decimal" min="${d.min}" max="${d.max}" step="${d.step}" value="${params[d.key]}">`}<span class="u">mm</span></div></div>`;
    $('#paramForm').innerHTML = `<div class="pgroups">${GROUPS.map(([h, re]) => {
      const ds = Design.PARAMS.filter((d) => re.test(d.key)), k = ds[0].kind;
      return `<fieldset class="pgroup"><legend>${h}<span class="kind kind-${k}" data-tip="${esc(Design.KIND[k])}" tabindex="0">${k === 'measure' ? 'đo thực tế' : 'thiết kế'}</span></legend><div class="params">${ds.map(field).join('')}</div></fieldset>`;
    }).join('')}</div>`;
    $$('#paramForm select').forEach(dropdown);
    let t = 0;
    $$('#paramForm [data-k]').forEach((el) => el.addEventListener('input', () => { clearTimeout(t); t = setTimeout(applyParams, 300); }));
  }
  function applyParams() {
    const next = {};
    $$('#paramForm [data-k]').forEach((el) => { next[el.dataset.k] = +el.value; });
    params = Design.sanitize(next);
    store.set('params', params);
    rebuild();
  }
  $('#resetParams').addEventListener('click', () => { params = Design.defaults(); store.set('params', params); renderParams(); rebuild(); });
  function rebuild() {
    model = Design.compute(params, variant);
    sim.rebind(model);
    Scene3D.build(model);
    if (selected && !model.parts[selected]) selected = null;
    renderDoc();
    if (mode === 'build') showPart(selected);
  }

  function costs() {
    const need = model.bom.filter((b) => !have.has(b.id)).reduce((s, b) => s + b.total, 0);
    const all = model.bom.reduce((s, b) => s + b.total, 0);
    return { need, all };
  }

  // Đi dây gọn: bản vẽ nhìn từ trên + bảng cắt dây, lấy từ bó dây đã dựng trong 3D (Scene3D.harness)
  const WIRE_VN = { red: 'Đỏ', black: 'Đen', yellow: 'Vàng', green: 'Xanh lá', orange: 'Cam', blue: 'Xanh dương', brown: 'Nâu', white: 'Trắng', grey: 'Xám', violet: 'Tím', pink: 'Hồng' };
  const WIRE_HEX = { red: '#d11a1a', black: '#202020', yellow: '#e0b800', green: '#15a043', orange: '#f07000', blue: '#1f5fd6', brown: '#7a4a1e', white: '#c9c9c4', grey: '#8a8f96', violet: '#a17ad8', pink: '#e86aa6' };
  const BOX_VN = { megaBox: 'Hộp Mega', mega: 'Mega', espKit: 'Test board', relay: 'Relay', buzzer: 'Còi', power: 'Jack + domino', lcd: 'LCD', lcdPanel: '', splash: 'Vách chắn', ctrlBox: '' };
  function harnessDoc(m) {
    const H = Scene3D.harness(); if (!H.runs.length) return '';
    const B = Object.values(H.boxes), xs = B.flatMap((b) => [b[0], b[2]]).concat(H.lines.filter((l) => l.axis === 'x').map((l) => l.c)), zs = B.flatMap((b) => [b[1], b[3]]).concat(H.lines.filter((l) => l.axis === 'z').map((l) => l.c));
    const x0 = Math.min(...xs) - 12, x1 = Math.max(...xs) + 12, z0 = Math.min(...zs) - 12, z1 = Math.max(...zs) + 12, f = (v) => v.toFixed(1);
    const boxes = Object.entries(H.boxes).filter(([id]) => id !== 'ctrlBox' && id !== 'mega').map(([id, b]) => `<rect x="${f(b[0])}" y="${f(b[1])}" width="${f(b[2] - b[0])}" height="${f(b[3] - b[1])}" rx="1.5" fill="#f3f5f8" stroke="#9aa3ad" stroke-width=".5"/>${BOX_VN[id] ? `<text x="${f((b[0] + b[2]) / 2)}" y="${f((b[1] + b[3]) / 2 + 2)}" font-size="5.5" text-anchor="middle" fill="#5b6472">${BOX_VN[id]}</text>` : ''}`).join('');
    const runs = H.runs.map((r) => `<polyline points="${r.xz.map((p) => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="none" stroke="${WIRE_HEX[r.color]}" stroke-width="1.2" stroke-linejoin="round"/>`).join('');
    const ties = H.ties.map((t) => (t.axis === 'x' ? `<rect x="${f(t.x - t.span / 2)}" y="${f(t.z - 1.2)}" width="${f(t.span)}" height="2.4"` : `<rect x="${f(t.x - 1.2)}" y="${f(t.z - t.span / 2)}" width="2.4" height="${f(t.span)}"`) + ' fill="#fff" stroke="#333" stroke-width=".4"/>').join('');
    const svg = `<svg viewBox="${f(x0)} ${f(z0)} ${f(x1 - x0)} ${f(z1 - z0)}" role="img" aria-label="Bản vẽ đi dây nhìn từ trên" style="display:block;width:100%;max-height:460px">${boxes}${runs}${ties}</svg>`;
    // Vị trí kẻ tim kênh: đo từ mép trái và mép sau của đế (bản chi tiết) hoặc của lòng hộp (bản đơn giản)
    const ref = m.base ? { x: m.base.x0, z: -m.base.W / 2, what: 'đế' } : { x: m.ctl.x - m.ctl.W / 2 + m.ctl.wall, z: m.ctl.z - m.ctl.L / 2 + m.ctl.wall, what: 'lòng hộp' };
    const chan = H.lines.map((l) => `<tr><td>${esc(l.name)}</td><td class="num">${Math.round(l.axis === 'x' ? l.c - ref.x : l.c - ref.z)} mm</td><td>${l.axis === 'x' ? 'từ mép trái' : 'từ mép sau'} ${ref.what}</td></tr>`).join('');
    const dup = (r) => { if (/^Cáp|^Dây bơm/.test(r.from)) return 'lõi cáp'; const c = [100, 200, 300].find((v) => v >= r.len + 20); return c ? c / 10 + ' cm' : 'nối dài'; }; // cỡ Dupont bán sẵn, chừa 20 mm
    const rows = H.runs.map((r, i) => `<tr><td class="num">${i + 1}</td><td><i class="sw" style="background:${WIRE_HEX[r.color]}"></i>${WIRE_VN[r.color]}</td><td>${esc(r.from)}</td><td><b>${esc(r.to)}</b></td><td>${r.via.map(esc).join(' → ')}</td><td class="num">${r.len} mm</td><td>${dup(r)}</td></tr>`).join('');
    const nTie = H.ties.length;
    return `<h3>Đi dây gọn theo kênh</h3>
      <p class="muted">Dây nằm sát mặt ${m.base ? 'đế' : 'đáy hộp'}, chạy vuông góc trong ${H.lines.length} kênh giữa các module, xếp song song thành bó và buộc dây rút — như mô hình 3D. Mọi độ dài dưới đây đo trên chính các dây trong 3D.</p>
      <ol>
        <li>Gắn hết module trước. Kẻ tim các kênh bằng bút chì theo bảng vị trí bên dưới.</li>
        <li>Đi dây nguồn đỏ/đen trước, tín hiệu sau. Đỏ và đen của cùng tải luôn đi cặp sát nhau.</li>
        <li>Mỗi dây rời kênh ngay cạnh module rồi lên thẳng chân cắm. Bẻ góc vuông bo tròn (quấn quanh thân bút bi), không gập gãy, không vắt chéo qua mặt module.</li>
        <li>Trong một kênh, xếp dây đúng thứ tự trên bản vẽ, không bắt chéo nhau. Dây dư gấp chữ Z dưới dây rút, không cuộn tròn.</li>
        <li>Buộc ${nTie} dây rút trong kênh (mỗi ~40 mm, siết vừa tay, cắt đuôi sát khóa). Cáp cảm biến và dây bơm: dây rút vào ${m.base ? 'vách chắn' : 'thành hộp'} mỗi 80–100 mm, tách sợi tại điểm vào kênh, dán nhãn hai đầu.</li>
        <li>Đầu dây ở Mega chừa vòng dư ~30 mm để còn mở ${m.parts.megaBox ? 'nắp hộp mica' : 'nắp hộp'}. Đo thông mạch từng dây bằng đồng hồ trước khi siết dây rút cuối và trước khi cấp điện.</li>
      </ol>
      <figure><figcaption>Bản vẽ đi dây nhìn từ trên <small>phía trước ở dưới · ô trắng = dây rút</small></figcaption>${svg}</figure>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kênh</th><th class="num">Tim kênh</th><th>Đo</th></tr></thead><tbody>${chan}</tbody></table></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">#</th><th>Màu</th><th>Từ</th><th>Tới</th><th>Đi qua</th><th class="num">Dài</th><th>Dây Dupont</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function renderDoc() {
    docDirty = false;
    const m = model, th = { low: sim.dev.low, high: sim.dev.high };
    const tip = (t) => ` data-tip="${esc(t)}" tabindex="0"`;
    $('#derived').innerHTML = `${m.warnings.length ? `<ul class="warns">${m.warnings.map((w) => `<li class="${w.lvl}">${esc(w.msg)}</li>`).join('')}</ul>` : ''}
      <dl class="stats">
        <div class="stat"><dt>${m.base ? 'Đế' : 'Mặt bằng'}</dt><dd><b>${nf(m.metrics.footX)}×${nf(m.metrics.footZ)}</b> mm</dd></div>
        <div class="stat"><dt${tip('Khoảng cách mặt cảm biến → đáy trong. Ghi vào firmware.')}>Cảm biến → đáy (S)</dt><dd><b>${nf(m.S, 1)}</b> mm</dd></div>
        <div class="stat"><dt>Lỗ tràn (100 %)</dt><dd><b>${m.overflowH}</b> mm · ${nf(m.vol.tankUsableL, 2)} L</dd></div>
        <div class="stat"><dt>Ống silicone</dt><dd><b>${nf(m.tubeBuyM, 1)}</b> m</dd></div>
        <div class="stat"><dt>Formex ${m.T} mm</dt><dd><b>${m.sheets.length}</b> tấm 600×400</dd></div>
        <div class="stat"><dt${tip('Ước tính từ đặc tính bơm và cột áp. Đo lại bằng ca đong.')}>Lưu lượng bơm</dt><dd><b>${nf(m.sim.qTyp, 2)}</b> L/phút</dd></div>
      </dl>`;

    // BOM: tổng theo nhóm nằm ngay trên hàng nhóm; nguồn giá, loại kích thước vào tooltip
    const cats = [...new Set(m.bom.map((b) => b.cat))];
    const kindShort = { design: 'Thiết kế', measure: 'Đo thực tế' };
    const c = costs(), catNeed = (ct) => m.bom.filter((b) => b.cat === ct && !have.has(b.id)).reduce((s, b) => s + b.total, 0);
    $('#d-bom').innerHTML = `<header class="sec-h"><h2>BOM &amp; dự toán</h2><div class="sec-meta"><span>Cần mua <b>${fmt(c.need)}</b></span><button class="btn btn-sm" id="csvBtn">${icon('download')}CSV</button></div></header>
      <div class="tbl-wrap"><table class="tbl" id="bomTable"><thead><tr><th${tip('Đánh dấu món đã có để loại khỏi dự toán')}>Có</th><th>Hạng mục</th><th class="num">SL</th><th class="num"${tip('Điện tử: Điện tử Spider, 18/11/2026. “Thị trường”: tham khảo ±30 %.')}>Đơn giá</th><th class="num">Thành tiền</th><th>Nơi mua</th></tr></thead>
      <tbody>${cats.map((ct) => `<tr class="cat"><td colspan="4">${esc(ct)}</td><td class="num">${fmt(catNeed(ct))}</td><td></td></tr>` + m.bom.filter((b) => b.cat === ct).map((b) => `
        <tr data-id="${b.id}" class="${have.has(b.id) ? 'have' : ''}"><td><input type="checkbox" data-have="${b.id}" ${have.has(b.id) ? 'checked' : ''} aria-label="Đã có ${esc(b.name)}"></td>
        <td><span class="nm"${tip(b.spec)}>${esc(b.name)}</span>${kindShort[b.kind] ? ` <span class="kind kind-${b.kind}"${tip(model.KIND[b.kind])}>${kindShort[b.kind]}</span>` : ''}</td><td class="num">${nf(b.qty, b.qty % 1 ? 1 : 0)} ${esc(b.unit)}</td><td class="num">${fmt(b.price)}</td><td class="num">${fmt(b.total)}</td>
        <td>${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.where)}</a>` : esc(b.where)}</td></tr>`).join('')).join('')}</tbody>
      <tfoot><tr><td></td><td colspan="3">Tổng cần mua</td><td class="num">${fmt(c.need)}</td><td class="muted">Mua tất cả ${fmt(c.all)}</td></tr></tfoot></table></div>`;
    $$('#bomTable [data-have]').forEach((cb) => cb.addEventListener('change', () => { if (cb.checked) have.add(cb.dataset.have); else have.delete(cb.dataset.have); store.set('have2', [...have]); renderDoc(); }));
    $('#csvBtn').addEventListener('click', downloadCsv);

    // Bản vẽ
    const onBase = m.base ? 'mặt đế' : 'mặt bàn';
    $('#d-dwg').innerHTML = `<header class="sec-h"><h2>Bản vẽ</h2><div class="sec-meta"${tip('Sinh từ thông số, luôn khớp 3D và BOM. Đọc số ghi, không đo trên bản in.')}>${esc(m.variantName)} · mm</div></header>
      <div class="figs">
        <figure class="fig-wide"><figcaption>Hình chiếu đứng — bố trí tổng thể <small>cao độ tính từ ${onBase}</small></figcaption>${Drawings.front(m)}</figure>
        <figure class="fig-wide"><figcaption>Hình chiếu bằng — vị trí linh kiện <small>phía trước ở dưới</small></figcaption>${Drawings.top(m)}</figure>
        <figure><figcaption>Bình chứa: ${m.has.overflow ? 'lỗ khoan, ' : ''}vùng mù, ngưỡng <small>ngưỡng lấy từ điện thoại</small></figcaption>${Drawings.tank(m, th)}</figure>
        <figure><figcaption>${m.variant === 'simple' ? 'Thanh mica M1 + cữ M2' : 'Tấm đỡ D1 + cữ D2'} <small>nhìn từ trên</small></figcaption>${Drawings.bridge(m)}</figure>
      </div>`;

    // Cắt
    const tubeName = { pump: 'Ống cấp (bơm → bình)', drain: 'Ống xả (bình → van → hộp)', overflow: 'Ống tràn' };
    $('#d-cut').innerHTML = `<header class="sec-h"><h2>Cắt &amp; gia công</h2><div class="sec-meta">Formex ${m.T} mm · tấm 600×400 · mạch dao 3 mm</div></header>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mã</th><th>Chi tiết</th><th class="num">Kích thước (mm)</th><th class="num">SL</th><th>Lỗ</th><th>Ghi chú</th></tr></thead><tbody>
      ${m.pieces.concat(m.micaPieces).map((pc) => `<tr><td><b>${pc.code}</b></td><td>${esc(pc.name)}</td><td class="num">${pc.w} × ${pc.h} × ${pc.code.startsWith('M') ? 3 : m.T}</td><td class="num">${pc.qty}</td>
        <td>${pc.holes.length ? pc.holes.map((h) => (h.rect ? `Cửa sổ ${h.rect[0]}×${h.rect[1]}` : `Ø${h.d}`) + `${h.use ? ' ' + esc(h.use) : ''}${h.note ? ' (' + esc(h.note) + `: x ${h.x}, cao ${h.y})` : ''}`).join('<br>') : '—'}</td><td>${esc(pc.note)}</td></tr>`).join('')}
      </tbody></table></div>
      <h3>Gia công hộp</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mã</th><th>Vị trí</th><th>Kích thước</th><th>Cách làm</th></tr></thead><tbody>
      ${m.boxMods.map((b) => `<tr><td><b>${b.code}</b></td><td>${esc(b.where)}</td><td>${esc(b.what)}</td><td>${esc(b.how)}</td></tr>`).join('')}</tbody></table></div>
      <h3>Ống, dây cần cắt</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Đoạn</th><th class="num">Tuyến trên mô hình</th><th class="num">Cắt (dư)</th></tr></thead><tbody>
        ${Object.keys(m.tubes).map((k) => `<tr><td>${tubeName[k]}</td><td class="num">${m.tubes[k].len} mm</td><td class="num">${Math.round(m.tubes[k].len * 1.1 + 50)} mm</td></tr>`).join('')}
        ${Object.values(m.wires).map((w) => `<tr><td>${esc(w.name)}</td><td class="num">${w.len + w.coreLen} mm</td><td class="num">${Math.ceil((w.len + w.coreLen + 100) / 100) * 100} mm</td></tr>`).join('')}
      </tbody></table></div>
      <div class="figs">${Drawings.sheets(m).map((s) => `<figure><figcaption>${esc(s.title)}</figcaption>${s.svg}</figure>`).join('')}</div>`;

    // Nối dây: phân biệt sơ đồ mô phỏng và sơ đồ đấu nối thực tế
    const p5 = m.power.filter((x) => x.rail === '5V');
    $('#d-wire').innerHTML = `<header class="sec-h"><h2>Điện &amp; nối dây</h2></header>
      <figure><figcaption>Sơ đồ khối <small>chỉ luồng tín hiệu, không dùng để đấu dây</small></figcaption>${Drawings.blockDiagram()}</figure>
      <h3>Đấu nối thực tế</h3>
      <div class="req"><b>Bắt buộc</b><ol>
        <li>Adapter 5 V–3 A: đủ dòng đỉnh khi bơm khởi động.</li>
        <li>ESP-01 lấy 3,3 V từ AMS1117 riêng, không từ chân 3V3 của Mega (~50 mA).</li>
        <li>TX Mega (5 V) qua module chuyển mức trước khi vào RX ESP-01.</li>
      </ol></div>
      <figure><figcaption>Sơ đồ đấu nối <small${tip('Cùng nhãn = cùng một nút điện, nối chung qua domino / thanh nguồn test board.')}>+5V, +3V3, GND cùng tên = cùng nút</small></figcaption>${Drawings.wiring()}</figure>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Từ</th><th>Tới</th><th>Màu gợi ý</th><th>Ghi chú</th></tr></thead><tbody>
      ${m.pins.map((r) => `<tr><td>${esc(r.from)}</td><td><b>${esc(r.to)}</b></td><td>${esc(r.color)}</td><td>${esc(r.note)}</td></tr>`).join('')}</tbody></table></div>
      ${harnessDoc(m)}
      <h3>Ngân sách dòng điện</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tải</th><th>Nguồn</th><th class="num">Điển hình</th><th class="num">Đỉnh</th></tr></thead><tbody>
      ${m.power.map((x) => `<tr><td>${esc(x.name)}</td><td${x.rail === '5V' ? '' : tip(`AMS1117 chịu ~1 A, tỏa ≈ ${nf(1.7 * x.typ, 2)} W: không cần tản nhiệt.`)}>${x.rail === '5V' ? '5 V' : '3,3 V ← AMS1117'}</td><td class="num">${nf(x.typ * 1000)} mA</td><td class="num">${nf(x.peak * 1000)} mA</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Tổng từ adapter 5 V</td><td class="muted">dư ${nf((3 - m.peak5) / 3 * 100)} % với 3 A</td><td class="num">${nf(m.typ5, 2)} A</td><td class="num">${nf(m.peak5, 2)} A</td></tr></tfoot></table></div>
      <ul class="warns"><li class="warn">Bơm qua tiếp điểm relay NO + diode 1N4007 song song. Không cấp dòng bơm (${nf(p5[0].peak * 1000)} mA đỉnh) qua chân 5V của Mega hay cổng USB.</li></ul>`;

    // Lắp ráp
    $('#d-asm').innerHTML = `<header class="sec-h"><h2>Lắp ráp</h2><div class="sec-meta">${m.steps.length} bước · ~${nf(m.metrics.hours, 1)} giờ + 24 h chờ keo</div></header>
      <ol class="steps">${m.steps.map((s, i) => `<li><div><h4>${esc(s.title)}</h4><ul>${s.text.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div><button class="btn btn-sm btn-ghost" data-step="${i}" aria-label="Xem bước ${i + 1} trên 3D">${icon('play')}3D</button></li>`).join('')}</ol>`;
    $$('#d-asm [data-step]').forEach((b) => b.addEventListener('click', () => { setDoc(false); gotoStep(+b.dataset.step); }));

    // So sánh hai phương án (cùng thông số bình/hộp)
    const A = Design.compute(params, 'detailed'), B = Design.compute(params, 'simple');
    const need = (x) => x.bom.filter((b) => !have.has(b.id)).reduce((s, b) => s + b.total, 0);
    const catSum = (x, c) => x.bom.filter((b) => b.cat === c && !have.has(b.id)).reduce((s, b) => s + b.total, 0);
    const rows = [
      ['Mặt bằng chiếm chỗ (mm)', `${A.metrics.footX}×${A.metrics.footZ}`, `${B.metrics.footX}×${B.metrics.footZ}`, A.metrics.footX * A.metrics.footZ, B.metrics.footX * B.metrics.footZ],
      ['Chiều cao cao nhất (mm)', A.metrics.height, B.metrics.height, A.metrics.height, B.metrics.height],
      ['Tổng chi phí cần mua', fmt(need(A)), fmt(need(B)), need(A), need(B)],
      ['— Điện tử', fmt(catSum(A, 'Điện tử')), fmt(catSum(B, 'Điện tử')), catSum(A, 'Điện tử'), catSum(B, 'Điện tử')],
      ['— Khung, vật liệu, nước & ống', fmt(need(A) - catSum(A, 'Điện tử')), fmt(need(B) - catSum(B, 'Điện tử')), need(A) - catSum(A, 'Điện tử'), need(B) - catSum(B, 'Điện tử')],
      ['Miếng cần cắt (Formex + mica)', A.metrics.pieces, B.metrics.pieces, A.metrics.pieces, B.metrics.pieces],
      ['Tổng chiều dài đường cắt (m)', nf(A.metrics.cutM, 1), nf(B.metrics.cutM, 1), A.metrics.cutM, B.metrics.cutM],
      ['Lỗ cần khoan/khoét', A.metrics.holes, B.metrics.holes, A.metrics.holes, B.metrics.holes],
      ['Ống silicone (m) / mối nối ống', `${nf(A.metrics.tubeM, 1)} / ${A.metrics.joints}`, `${nf(B.metrics.tubeM, 1)} / ${B.metrics.joints}`, A.metrics.joints, B.metrics.joints],
      ['Bước lắp ráp', A.metrics.steps, B.metrics.steps, A.metrics.steps, B.metrics.steps],
      ['Giờ công ước tính', nf(A.metrics.hours, 1), nf(B.metrics.hours, 1), A.metrics.hours, B.metrics.hours],
    ];
    $('#d-cmp').innerHTML = `<header class="sec-h"><h2>So sánh phương án</h2><div class="sec-meta"${tip('Cùng bình, cùng mạch điện và firmware; khác ở cơ khí. Số nhỏ hơn tô xanh.')}>Bình Ø${params.tankD}×${params.tankH} · nguồn ${params.resL}×${params.resW}×${params.resH} mm</div></header>
      <div class="tbl-wrap"><table class="tbl cmp"><thead><tr><th>Tiêu chí</th><th class="num">Bản chi tiết</th><th class="num">Bản đơn giản</th></tr></thead><tbody>
      ${rows.map(([k, a, b, va, vb]) => `<tr><td>${k}</td><td class="num ${va < vb ? 'win' : ''}">${a}</td><td class="num ${vb < va ? 'win' : ''}">${b}</td></tr>`).join('')}
      <tr><td>Vật liệu chính</td><td>Formex ${A.T} mm (đế, bục, khay, vách, tấm LCD), hộp mica Mega</td><td>Formex ${B.T} mm (chỉ khay), mica 3 mm, hộp ABS 250×80×70</td></tr>
      <tr><td>An toàn tràn</td><td>Ống tràn về hộp nguồn + khay hứng</td><td>Tràn miệng bình xuống khay → Water Sensor khóa bơm</td></tr>
      <tr><td>Mô phỏng tiêu thụ</td><td>Van xả tự chảy (trọng lực)</td><td>Múc nước tay về bình nguồn</td></tr>
      <tr><td>Phù hợp</td><td>Trưng bày đồ án, thể hiện đầy đủ chu trình nước</td><td>Tự thi công nhanh tại nhà, ít dụng cụ</td></tr>
      </tbody></table></div>
      <button class="btn" id="cmpSwitch">Chuyển sang ${variant === 'simple' ? 'bản chi tiết' : 'bản đơn giản'}</button>`;
    $('#cmpSwitch').addEventListener('click', () => $(`#variantSeg [data-variant="${variant === 'simple' ? 'detailed' : 'simple'}"]`).click());
  }

  function downloadCsv() {
    const rows = [['Nhóm', 'Hạng mục', 'Quy cách', 'SL', 'Đơn vị', 'Đơn giá (đ)', 'Thành tiền (đ)', 'Loại kích thước', 'Nơi mua', 'Đã có']]
      .concat(model.bom.map((b) => [b.cat, b.name, b.spec, b.qty, b.unit, b.price, b.total, model.KIND[b.kind], b.url || b.where, have.has(b.id) ? 'x' : '']));
    const csv = '﻿' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `BOM_be_chua_Arduino_${variant}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $('#printBtn').addEventListener('click', () => { if (docDirty) renderDoc(); window.print(); });

  // Mục lục hồ sơ: đánh dấu mục đang đọc
  const navSpy = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (e.isIntersecting) $$('.doc-nav a').forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-20% 0px -70% 0px' });
  $$('.doc .paper').forEach((p) => navSpy.observe(p));
  $$('input[type=range]').forEach(fillRange);
  syncExplodeUi(0);
  narrow.addEventListener('change', () => { if (narrow.matches) { ui.ctx.run = ui.ctx.lab = ui.phone = ui.tree = false; } applyUi(); });

  window.twin = { sim, Scene3D, get model() { return model; } }; // để sinh viên thử nghiệm trong Console (F12)
  renderParams();
  syncVariantUi();
  renderDoc();
  showPart(null);
  setMode('run');
})();
