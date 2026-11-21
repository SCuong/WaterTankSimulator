/* Bản vẽ kỹ thuật SVG sinh từ cùng mô hình Design → số trên bản vẽ luôn khớp 3D và BOM. Đơn vị SVG = mm. */
(function (root) {
  'use strict';
  const r0 = Math.round, r1 = (v) => Math.round(v * 10) / 10;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  function pen(fs) {
    const o = [];
    const nv = 'vector-effect="non-scaling-stroke"';
    const P = {
      o, fs,
      rect: (x, y, w, h, c) => o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${c || 'ln'}" ${nv}/>`),
      line: (x1, y1, x2, y2, c) => o.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c || 'ln'}" ${nv}/>`),
      circle: (cx, cy, r, c) => o.push(`<circle cx="${cx}" cy="${cy}" r="${r}" class="${c || 'ln'}" ${nv}/>`),
      poly: (pts, c) => o.push(`<polyline points="${pts.map((q) => q.join(',')).join(' ')}" class="${c || 'ln'}" ${nv}/>`),
      text: (x, y, t, c, anchor, rot, size) => o.push(`<text x="${x}" y="${y}" class="${c || 'tx'}" font-size="${size || fs}" text-anchor="${anchor || 'middle'}" dominant-baseline="central"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${esc(t)}</text>`),
      dim(a, b, off, label) {
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 0.01) return;
        const nx = -dy / L, ny = dx / L, sg = Math.sign(off) || 1, g = fs * 0.2, ov = fs * 0.35;
        const A = [a[0] + nx * off, a[1] + ny * off], B = [b[0] + nx * off, b[1] + ny * off];
        P.line(a[0] + nx * g * sg, a[1] + ny * g * sg, A[0] + nx * ov * sg, A[1] + ny * ov * sg, 'ext');
        P.line(b[0] + nx * g * sg, b[1] + ny * g * sg, B[0] + nx * ov * sg, B[1] + ny * ov * sg, 'ext');
        o.push(`<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" class="dimln" ${nv} marker-start="url(#ar)" marker-end="url(#ar)"/>`);
        let ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang > 90.1 || ang < -89.9) ang += 180;
        const tx = (A[0] + B[0]) / 2 + nx * sg * fs * 0.62, ty = (A[1] + B[1]) / 2 + ny * sg * fs * 0.62;
        P.text(tx, ty, label, 'tx dimtx', 'middle', ang);
      },
    };
    return P;
  }
  function wrap(vb, P, title) {
    return `<svg class="dwg" viewBox="${vb.map(r1).join(' ')}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}">
<defs><marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 2 L10 5 L0 8 z" fill="currentColor"/></marker>
<pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" stroke-width="0.6"/></pattern></defs>
${P.o.join('\n')}</svg>`;
  }

  // Khung bao ngang của mô hình (có đế hoặc đặt trên bàn)
  function extent(m) {
    if (m.base) return { x0: m.base.x0, x1: m.base.x0 + m.base.L, W: m.base.W };
    return { x0: m.res.x - m.res.L / 2, x1: m.ctl.x + m.ctl.W / 2, W: m.metrics.footZ };
  }
  function rr(P, c, l, w, cls, y) { // hình chữ nhật linh kiện nhìn từ trên, có xoay 90°
    const r = Math.abs(Math.sin(c.rot || 0)) > 0.5;
    P.rect(c.x - (r ? w : l) / 2, (y != null ? y : c.z) - (r ? l : w) / 2, r ? w : l, r ? l : w, cls);
  }

  // Hình chiếu đứng (nhìn từ trước): x → phải, y lên (SVG lật dấu)
  function front(m) {
    const X = extent(m), L = X.x1 - X.x0, fs = L / 48, P = pen(fs), T = m.T, Y = (y) => -y, E = m.E, S_ = m.variant === 'simple';
    const bT = m.bridge.t, hcTop = m.bridge.y + bT + 1.6;
    if (m.base) { P.rect(X.x0, 0, L, T); for (const s of [-1, 1]) P.rect(s * (L / 2 - 25) - 10, T, 20, 6, 'thin'); }
    else P.line(X.x0 - 30, 0, X.x1 + 30, 0, 'thin');
    const R = m.res; P.rect(R.x - R.L / 2, Y(R.H), R.L, R.H, 'glass');
    P.rect(m.pump.x - m.pump.l / 2, Y(m.pump.h + 1.5), m.pump.l, m.pump.h, 'solid');
    const Pl = m.plat;
    if (Pl) { P.rect(Pl.x - Pl.X / 2, Y(Pl.H), Pl.X, Pl.H); P.line(Pl.x - Pl.X / 2, Y(Pl.H - T), Pl.x + Pl.X / 2, Y(Pl.H - T), 'thin'); }
    const Tr = m.tray; P.rect(Tr.x - Tr.outX / 2, Y(Tr.y + T + Tr.wallH), Tr.outX, T + Tr.wallH);
    const Tk = m.tank; P.rect(Tk.x - Tk.OD / 2, Y(Tk.rim), Tk.OD, Tk.H + Tk.wall, 'glass');
    if (m.has.overflow) P.line(Tk.x - Tk.OD / 2, Y(Tk.yIn + m.overflowH), Tk.x + Tk.OD / 2, Y(Tk.yIn + m.overflowH), 'hid');
    P.rect(m.bridge.x - m.bridge.l / 2, Y(m.bridge.y + bT), m.bridge.l, bT);
    P.rect(Tk.x - 22.5, Y(hcTop), 45, 1.6, 'solid');
    for (const s of [-1, 1]) P.rect(Tk.x + s * 13 - 8, Y(m.bridge.y + bT), 16, 12, 'thin');
    if (m.splash) P.rect(m.splash.x - T / 2, Y(m.splash.h), T, m.splash.h);
    if (E.lcdPanel) { P.rect(E.lcdPanel.x - E.lcdPanel.w / 2, Y(E.lcdPanel.h), E.lcdPanel.w, E.lcdPanel.h); P.rect(E.lcd.x - 36, Y(42 + 12.5), 72, 25, 'thin'); }
    if (E.megaBox) P.rect(E.megaBox.x - 57.5, Y(28), 115, 28, 'hid');
    if (m.ctl) { const c = m.ctl; P.rect(c.x - c.W / 2, Y(c.H), c.W, c.H); P.line(c.x - c.W / 2, Y(c.H - c.wall), c.x + c.W / 2, Y(c.H - c.wall), 'thin'); P.rect(c.x - 12.5, Y(c.H + 0.5), 25, 1.5, 'solid'); }
    for (const k in m.tubes) P.poly(m.tubes[k].pts.map((q) => [q[0], Y(q[1])]), 'tube');
    if (m.tubes.drain) { const va = m.tubes.drain.valveAt; P.rect(va[0] - 6, Y(va[1] + 6), 12, 12, 'solid'); }
    // Chuỗi kích thước ngang
    const segs = m.base ? [m.m, R.L, Pl.x - Pl.X / 2 - (R.x + R.L / 2), Pl.X, m.splash.x + 15 - (Pl.x + Pl.X / 2), E.zone.w, m.m]
      : [R.L, Tr.x - Tr.outX / 2 - (R.x + R.L / 2), Tr.outX, m.ctl.x - m.ctl.W / 2 - (Tr.x + Tr.outX / 2), m.ctl.W];
    let cx = X.x0;
    segs.forEach((w) => { P.dim([cx, T + 6], [cx + w, T + 6], fs * 2.2, r0(w)); cx += w; });
    P.dim([X.x0, T + 6], [X.x1, T + 6], fs * 4.6, `${m.base ? 'Dài đế' : 'Tổng dài'} ${r0(L)}`);
    // Cao độ so với mặt đế / mặt bàn
    const xr = X.x1 + (m.base ? 0 : 10);
    const lv = (m.base ? [[Pl.H, `Bục ${Pl.H}`]] : [[m.ctl.H, `Hộp ${m.ctl.H}`]]).concat([[Tk.rim, `Miệng bình ${r0(Tk.rim)}`], [hcTop, `Đỉnh cảm biến ${r0(hcTop)}`]]);
    lv.forEach(([h, lb], i) => {
      P.line(i === 0 ? (m.base ? Pl.x + Pl.X / 2 : m.ctl.x + m.ctl.W / 2) : Tk.x + Tk.OD / 2 + 5, Y(h), xr + fs * 0.5, Y(h), 'ref');
      P.dim([xr, 0], [xr, Y(h)], -fs * (2.4 + i * 2.6), lb);
    });
    P.dim([R.x - R.L / 2, 0], [R.x - R.L / 2, Y(R.H)], fs * 2.2, `${R.H}`);
    P.text(R.x, Y(R.H + fs * 1.4), S_ ? 'Bình nguồn' : 'Hộp nguồn', 'tx-s');
    P.text(Tk.x, Y(Math.max(Tk.rim + 70, m.tubes.pump.pts[3][1] + fs * 1.5)), 'Bình chứa + HC-SR04', 'tx-s');
    P.text(m.ctl ? m.ctl.x : E.zone.x, Y((m.ctl ? m.ctl.H : 90) + fs * 1.4), S_ ? 'Hộp mạch + LCD' : 'Mạch + LCD', 'tx-s');
    const topY = Math.max(hcTop, m.tubes.pump.pts[2][1], m.tubes.pump.pts[3][1]) + fs * 3;
    return wrap([X.x0 - fs * 6, Y(topY), L + fs * 18, topY + T + fs * 7], P, 'Hình chiếu đứng');
  }

  // Hình chiếu bằng (nhìn từ trên): x → phải, z → xuống (phía trước ở dưới)
  function top(m) {
    const X = extent(m), L = X.x1 - X.x0, W = X.W, fs = L / 48, P = pen(fs), T = m.T, E = m.E, S_ = m.variant === 'simple';
    if (m.base) P.rect(X.x0, -W / 2, L, W);
    const R = m.res; P.rect(R.x - R.L / 2, R.z - R.W / 2, R.L, R.W, 'glass');
    P.rect(m.pump.x - m.pump.l / 2, m.pump.z - m.pump.w / 2, m.pump.l, m.pump.w, 'solid');
    const Pl = m.plat; if (Pl) P.rect(Pl.x - Pl.X / 2, Pl.z - Pl.Z / 2, Pl.X, Pl.Z);
    const Tr = m.tray; P.rect(Tr.x - Tr.outX / 2, Tr.z - Tr.outZ / 2, Tr.outX, Tr.outZ); P.rect(Tr.x - Tr.inX / 2, Tr.z - Tr.inZ / 2, Tr.inX, Tr.inZ, 'thin');
    const Tk = m.tank; P.circle(Tk.x, Tk.z, Tk.OD / 2, 'glass');
    const B = m.bridge; P.rect(B.x - B.l / 2, B.z - B.w / 2, B.l, B.w, 'thin');
    B.holes.forEach((h) => P.circle(B.x + h.x, B.z + h.z, h.d / 2, 'thin'));
    const Ws = m.wsPlate; P.rect(Ws.x - 31, Ws.z - 10, 62, 20, 'thin'); P.text(Ws.x, Ws.z + fs * 1.1, 'Water Sensor', 'tx-s', 'middle', 0, fs * 0.65);
    if (m.splash) P.rect(m.splash.x - T / 2, -m.splash.len / 2, T, m.splash.len);
    if (E.lcdPanel) P.rect(E.lcdPanel.x - E.lcdPanel.w / 2, E.lcdPanel.z - T / 2, E.lcdPanel.w, T);
    if (E.megaBox) P.rect(E.megaBox.x - 57.5, E.megaBox.z - 33, 115, 66, 'hid');
    if (m.ctl) { const c = m.ctl; P.rect(c.x - c.W / 2, c.z - c.L / 2, c.W, c.L); P.rect(c.x - 12.5, E.lcd.z - 36, 25, 72, 'hid'); }
    rr(P, E.mega, 101.6, 53.3, 'solid'); rr(P, E.relay, 50, 26, 'thin'); P.rect(E.tb.x - E.tb.l / 2, E.tb.z - E.tb.w / 2, E.tb.l, E.tb.w, 'thin');
    rr(P, E.buzz, 33, 13, 'thin'); P.rect(E.jack.x - 10, E.jack.z - 7, 20, 14, 'solid');
    for (const k in m.tubes) P.poly(m.tubes[k].pts.map((q) => [q[0], q[2]]), 'tube');
    P.dim([X.x0, -W / 2], [X.x1, -W / 2], -fs * 2.4, `${r0(L)}`);
    P.dim([X.x1, -W / 2], [X.x1, W / 2], -fs * 2.4, `${r0(W)}`);
    P.dim([R.x - R.L / 2, R.z + R.W / 2], [R.x + R.L / 2, R.z + R.W / 2], fs * 1.8, `${R.L}`);
    P.dim([R.x - R.L / 2, R.z - R.W / 2], [R.x - R.L / 2, R.z + R.W / 2], -fs * 1.8, `${R.W}`);
    if (Pl) { P.dim([Pl.x - Pl.X / 2, Pl.z + Pl.Z / 2], [Pl.x + Pl.X / 2, Pl.z + Pl.Z / 2], fs * 1.8, `Bục ${r0(Pl.X)}`); P.dim([Pl.x + Pl.X / 2, Pl.z - Pl.Z / 2], [Pl.x + Pl.X / 2, Pl.z + Pl.Z / 2], -fs * 1.2, `${r0(Pl.Z)}`); }
    else { P.dim([Tr.x - Tr.outX / 2, Tr.z + Tr.outZ / 2], [Tr.x + Tr.outX / 2, Tr.z + Tr.outZ / 2], fs * 1.8, `Khay ${r0(Tr.outX)}`); P.dim([Tr.x + Tr.outX / 2, Tr.z - Tr.outZ / 2], [Tr.x + Tr.outX / 2, Tr.z + Tr.outZ / 2], -fs * 1.2, `${r0(Tr.outZ)}`); }
    P.dim([Tk.x - Tk.OD / 2, Tk.z], [Tk.x + Tk.OD / 2, Tk.z], 0.01, `Ø${r1(Tk.OD)} ngoài`);
    P.line(Tk.x, Tr.z, Tk.x, Tk.z, 'ref'); P.text(Tk.x + fs * 0.4, (Tr.z + Tk.z) / 2, `tâm lùi ${r0(Tr.z - Tk.z)}`, 'tx-s', 'start', 0, fs * 0.75);
    P.text(R.x, R.z, S_ ? 'Bình nguồn' : 'Hộp nguồn', 'tx-s');
    if (m.ctl) P.dim([m.ctl.x + m.ctl.W / 2, m.ctl.z - m.ctl.L / 2], [m.ctl.x + m.ctl.W / 2, m.ctl.z + m.ctl.L / 2], -fs * 1.2, `Hộp ${m.ctl.L}`);
    return wrap([X.x0 - fs * 4, -W / 2 - fs * 5, L + fs * 9, W + fs * 9], P, 'Hình chiếu bằng');
  }

  // Chi tiết bình chứa: lỗ khoan, vùng mù, ngưỡng điều khiển
  function tank(m, th) {
    const Tk = m.tank, H = Tk.H, fs = Math.max(H, Tk.OD) / 26, P = pen(fs), r = Tk.OD / 2, Y = (y) => -y, bT = m.bridge.t;
    const zone = Math.max(0, m.S - m.SPEC.hc.deadZone);
    P.o.push(`<rect x="${-m.tank.D / 2}" y="${Y(m.S)}" width="${m.tank.D}" height="${m.SPEC.hc.deadZone}" fill="url(#hatch)" class="zone"/>`);
    P.rect(-r, Y(H), Tk.OD, H + Tk.wall, 'glass');
    P.line(-r, 0, r, 0, 'thin');
    P.rect(-m.bridge.l / 2, Y(H + bT), m.bridge.l, bT);
    for (const s of [-1, 1]) P.rect(s * 13 - 8, Y(m.S + 12), 16, 12, 'solid');
    P.line(0, Y(H + bT + 5), 0, Y(H - 15), 'tube');
    if (m.has.drain) P.circle(-r, Y(m.drainH), 3.75, 'solid');
    if (m.has.overflow) P.circle(0, Y(m.overflowH), 3.75, 'hidc');
    const lv = (pct, cls, txt) => { const y = Y(pct / 100 * m.usableH); P.line(-r, y, r + fs * 0.6, y, cls); P.text(r + fs * 0.9, y, txt, 'tx-s', 'start'); };
    lv(100, 'lv-max', m.has.overflow ? `Tràn 100 % — ${m.overflowH} mm` : `100 % = giới hạn đo — ${m.usableH} mm`);
    lv(th.high, 'lv-hi', `Tắt bơm ≥ ${th.high} % — ${r0(th.high / 100 * m.usableH)} mm`);
    lv(th.low, 'lv-lo', `Bật bơm ≤ ${th.low} % — ${r0(th.low / 100 * m.usableH)} mm`);
    if (!m.has.overflow) P.text(r + fs * 0.9, Y(H) + fs * 0.2, 'Miệng bình: tràn xuống khay → Water Sensor', 'tx-s', 'start', 0, fs * 0.72);
    P.text(0, Y(zone + m.SPEC.hc.deadZone / 2), `Vùng mù ${m.SPEC.hc.deadZone} mm`, 'tx-s', 'middle', 0, fs * 0.75);
    P.dim([-r, 0], [-r, Y(H)], fs * -1.8, `H ${H}`);
    P.dim([-r, 0], [-r, Y(m.S)], fs * -4, `S ${r1(m.S)}`);
    P.dim([-r, 0], [-r, Y(m.usableH)], fs * -6.2, m.has.overflow ? `Lỗ tràn ${m.overflowH}` : `100 % ${m.usableH}`);
    if (m.has.drain) P.dim([-r, 0], [-r, Y(m.drainH)], fs * -8.4, `Xả ${m.drainH}`);
    P.dim([-m.tank.D / 2, Y(H * 0.42)], [m.tank.D / 2, Y(H * 0.42)], 0.01, `Ø${m.tank.D} trong`);
    if (m.has.drain) P.text(-r - fs * 0.4, Y(m.drainH) + fs * 1.3, 'Ø7.5 thành trái', 'tx-s', 'end', 0, fs * 0.72);
    if (m.has.overflow) P.text(0, Y(m.overflowH) + fs * 1.2, 'Ø7.5 thành sau', 'tx-s', 'middle', 0, fs * 0.72);
    return wrap([-r - fs * 11, Y(H + bT + fs * 3), Tk.OD + fs * 32, H + bT + fs * 5], P, 'Chi tiết bình chứa');
  }

  // Chi tiết tấm đỡ cảm biến D1 (nhìn từ trên)
  function bridge(m) {
    const B = m.bridge, fs = B.l / 22, P = pen(fs), r = m.tank.OD / 2;
    P.rect(-B.l / 2, -B.w / 2, B.l, B.w);
    P.circle(0, 0, r, 'hidc');
    for (const s of [-1, 1]) P.rect(s * (r + B.t / 2 + 0.5) - B.t / 2, -7.5, B.t, 15, 'hid');
    B.holes.forEach((h) => { P.circle(h.x, h.z, h.d / 2); P.line(h.x - h.d * 0.7, h.z, h.x + h.d * 0.7, h.z, 'ctr'); P.line(h.x, h.z - h.d * 0.7, h.x, h.z + h.d * 0.7, 'ctr'); });
    P.dim([-B.l / 2, -B.w / 2], [B.l / 2, -B.w / 2], -fs * 1.6, `${B.l}`);
    P.dim([B.l / 2, -B.w / 2], [B.l / 2, B.w / 2], -fs * 1.6, `${B.w}`);
    P.dim([-13, -9], [13, -9], -fs * 0.9, '26');
    P.dim([0, 0], [0, 18], fs * -1.2, '18');
    P.text(-13, 8.25 + fs * 0.8, '2×Ø16.5', 'tx-s', 'middle', 0, fs * 0.8);
    P.text(0, 18 + 4.25 + fs * 0.8, 'Ø8.5', 'tx-s', 'middle', 0, fs * 0.8);
    P.dim([-(r + B.t / 2 + 0.5), B.w / 2], [r + B.t / 2 + 0.5, B.w / 2], fs * 1.8, `Cữ cách ${r1(2 * (r + B.t / 2 + 0.5))}`);
    return wrap([-B.l / 2 - fs * 2, -B.w / 2 - fs * 3.5, B.l + fs * 5.5, B.w + fs * 7.5], P, 'Tấm đỡ cảm biến');
  }

  // Sơ đồ xếp miếng cắt trên tấm Formex
  function sheets(m) {
    return m.sheets.map((sh, i) => {
      const fs = Math.max(sh.w, sh.h) / 48, P = pen(fs);
      P.rect(0, 0, sh.w, sh.h, 'sheet');
      sh.pieces.forEach((pc) => {
        P.rect(pc.x, pc.y, pc.w, pc.h, 'cut');
        const orig = m.pieces.find((q) => pc.code.split('.')[0] === q.code);
        const rot = orig && orig.w !== pc.w;
        if (orig && orig.code === 'E2') P.rect(pc.x + pc.w / 2 - 36, pc.y + pc.h - 42 - 12.5, 72, 25, 'thin');
        if (orig && orig.id === 'bridge' && orig.code === 'D1') orig.holes.forEach((h) => P.circle(pc.x + (rot ? pc.w / 2 + h.z : pc.w / 2 + h.x), pc.y + (rot ? pc.h / 2 + h.x : pc.h / 2 + h.z), h.d / 2, 'thin'));
        if (orig && orig.code === 'C2' && pc.code === 'C2.1') orig.holes.forEach((h) => P.circle(pc.x + h.x, pc.y + pc.h - h.y, h.d / 2, 'thin'));
        const small = Math.min(pc.w, pc.h) < fs * 3;
        P.text(pc.x + pc.w / 2, pc.y + pc.h / 2 - (small ? 0 : fs * 0.6), pc.code, 'tx-b', 'middle', 0, small ? fs * 0.7 : fs);
        if (!small) P.text(pc.x + pc.w / 2, pc.y + pc.h / 2 + fs * 0.7, `${pc.w}×${pc.h}`, 'tx-s', 'middle', 0, fs * 0.75);
      });
      return { title: sh.oversize ? `Miếng cắt riêng ${sh.w}×${sh.h} mm` : `Tấm ${i + 1} — ${sh.w}×${sh.h} mm`, svg: wrap([-fs, -fs, sh.w + 2 * fs, sh.h + 2 * fs], P, 'Sơ đồ cắt') };
    });
  }

  // Sơ đồ đấu nối THỰC TẾ — Arduino Mega 2560 (nguồn dùng nhãn net +5V / +3V3 / GND để không chéo dây)
  function wiring() {
    const P = pen(11);
    const blk = (x, y, w, h, title, sub) => { P.rect(x, y, w, h, 'blk'); P.text(x + w / 2, y + 16, title, 'tx-b', 'middle', 0, 12); if (sub) P.text(x + w / 2, y + 31, sub, 'tx-s', 'middle', 0, 9); };
    const pinL = (x, y, t) => P.text(x + 6, y, t, 'tx-s', 'start', 0, 10);
    const pinR = (x, y, t) => P.text(x - 6, y, t, 'tx-s', 'end', 0, 10);
    const w = (pts, c) => P.poly(pts, 'w ' + c);
    const tag = (x, y, t, c, anchor) => P.text(x, y, t, 'tag ' + c, anchor || 'end', 0, 10);
    const res = (x1, y1, x2, y2, t) => { P.rect(Math.min(x1, x2) - (x1 === x2 ? 5 : 0), Math.min(y1, y2) - (y1 === y2 ? 5 : 0), Math.abs(x2 - x1) || 10, Math.abs(y2 - y1) || 10, 'res'); P.text((x1 + x2) / 2 + (x1 === x2 ? 10 : 0), (y1 + y2) / 2 + (y1 === y2 ? -12 : 0), t, 'tx-s', x1 === x2 ? 'start' : 'middle', 0, 9.5); };

    blk(390, 50, 160, 470, 'Arduino Mega 2560', '5 V logic');
    [[100, 'D9'], [130, 'D10'], [200, 'A0'], [230, 'D7'], [330, 'TX1 D18'], [360, 'RX1 D19']].forEach(([y, t]) => pinL(390, y, t));
    [[85, '5V'], [110, 'GND'], [190, 'D6'], [290, 'D8'], [390, 'SDA D20'], [420, 'SCL D21']].forEach(([y, t]) => pinR(550, y, t));
    w([[550, 85], [575, 85]], 'w-5v'); tag(580, 85, '+5V', 'tag-5v', 'start'); w([[550, 110], [575, 110]], 'w-gnd'); tag(580, 110, 'GND', 'tag-gnd', 'start');
    P.text(470, 495, 'Cấp 5 V vào chân 5V — rút adapter khi cắm USB', 'tx-s', 'middle', 0, 9);

    blk(60, 70, 160, 95, 'HC-SR04', '5 V');
    [[85, 'VCC'], [100, 'TRIG'], [130, 'ECHO'], [150, 'GND']].forEach(([y, t]) => pinR(220, y, t));
    w([[220, 100], [390, 100]], 'w-sig1'); w([[220, 130], [390, 130]], 'w-sig1b');
    tag(54, 85, '+5V', 'tag-5v'); tag(54, 150, 'GND', 'tag-gnd'); w([[60, 85], [58, 85]], 'w-5v');

    blk(60, 180, 160, 80, 'Water Sensor', 'trong khay hứng');
    [[200, 'S'], [230, '+'], [248, '−']].forEach(([y, t]) => pinR(220, y, t));
    w([[220, 200], [390, 200]], 'w-sig2'); w([[220, 230], [390, 230]], 'w-sig2'); tag(54, 248, 'GND', 'tag-gnd');
    P.text(305, 244, '+ cấp từ D7 khi đọc', 'tx-s', 'middle', 0, 9);

    blk(235, 300, 120, 90, 'Chuyển mức', 'BSS138 4 kênh');
    pinL(235, 330, 'LV1'); pinL(235, 360, 'LV2'); pinR(355, 330, 'HV1'); pinR(355, 360, 'HV2');
    w([[355, 330], [390, 330]], 'w-tx'); w([[355, 360], [390, 360]], 'w-rx');
    P.text(295, 378, 'HV=+5V · LV=+3V3 · GND', 'tx-s', 'middle', 0, 8.5);

    blk(60, 290, 130, 120, 'ESP-01', 'ESP8266 · 3,3 V');
    [[310, 'VCC'], [330, 'RX'], [360, 'TX'], [380, 'EN'], [398, 'GND']].forEach(([y, t]) => pinR(190, y, t));
    w([[190, 330], [235, 330]], 'w-tx'); w([[190, 360], [235, 360]], 'w-rx');
    tag(54, 310, '+3V3', 'tag-3v3'); tag(54, 398, 'GND', 'tag-gnd');
    w([[190, 380], [212, 380]], 'w-3v3'); res(212, 380, 228, 380, '10 kΩ'); w([[228, 380], [232, 380]], 'w-3v3'); tag(236, 395, '+3V3', 'tag-3v3', 'start');
    P.text(125, 420, 'RST cũng kéo lên 10 kΩ', 'tx-s', 'middle', 0, 9);

    blk(60, 440, 160, 80, 'AMS1117-3.3', 'nguồn riêng cho ESP-01');
    pinR(220, 465, 'VIN'); pinR(220, 485, 'VOUT'); pinR(220, 505, 'GND');
    tag(240, 465, '+5V', 'tag-5v', 'start'); tag(240, 485, '+3V3', 'tag-3v3', 'start'); tag(240, 505, 'GND', 'tag-gnd', 'start');
    w([[220, 465], [236, 465]], 'w-5v'); w([[220, 485], [236, 485]], 'w-3v3'); w([[220, 505], [236, 505]], 'w-gnd');
    P.rect(300, 478, 22, 12, 'res'); P.text(311, 504, 'C 470 µF', 'tx-s', 'middle', 0, 9); tag(296, 484, '+3V3', 'tag-3v3'); tag(326, 484, 'GND', 'tag-gnd', 'start');

    blk(650, 150, 140, 90, 'Relay 5V 1 kênh', 'kích mức thấp');
    pinL(650, 190, 'IN'); pinL(650, 210, 'VCC'); pinL(650, 228, 'GND'); pinR(790, 180, 'COM'); pinR(790, 215, 'NO');
    w([[550, 190], [650, 190]], 'w-sig3'); tag(644, 210, '+5V', 'tag-5v'); tag(644, 228, 'GND', 'tag-gnd');
    w([[790, 180], [810, 180]], 'w-5v'); tag(814, 180, '+5V', 'tag-5v', 'start');
    w([[790, 215], [892, 215], [892, 268]], 'w-5v');
    P.circle(892, 290, 22, 'blk'); P.text(892, 290, 'M', 'tx-b', 'middle', 0, 14); P.text(892, 326, 'Bơm 5 V', 'tx-s', 'middle', 0, 10);
    w([[892, 312], [892, 345]], 'w-gnd'); tag(898, 356, 'GND', 'tag-gnd', 'start');
    w([[892, 240], [928, 240], [928, 278]], 'w-5v'); w([[928, 302], [928, 340], [892, 340]], 'w-gnd');
    P.o.push('<path d="M919 302 L937 302 L928 278 Z" class="diode" vector-effect="non-scaling-stroke"/>'); P.line(919, 278, 937, 278, 'w w-gnd');
    P.text(940, 258, '1N4007', 'tx-s', 'start', 0, 9);

    blk(650, 265, 140, 55, 'Còi buzzer 5V', '');
    pinL(650, 290, 'I/O'); w([[550, 290], [650, 290]], 'w-sig4'); tag(796, 290, '+5V / GND', 'tag-5v', 'start');

    blk(650, 360, 140, 80, 'LCD 1602 + I2C', 'PCF8574 · 0x27');
    pinL(650, 390, 'SDA'); pinL(650, 420, 'SCL'); w([[550, 390], [650, 390]], 'w-i2c'); w([[550, 420], [650, 420]], 'w-i2c2');
    tag(796, 390, '+5V', 'tag-5v', 'start'); tag(796, 420, 'GND', 'tag-gnd', 'start');

    blk(650, 460, 140, 60, 'Adapter 5 V–3 A', 'jack DC → domino');
    pinR(790, 482, '+'); pinR(790, 504, '−');
    w([[790, 482], [810, 482]], 'w-5v'); tag(814, 482, '+5V', 'tag-5v', 'start'); w([[790, 504], [810, 504]], 'w-gnd'); tag(814, 504, 'GND', 'tag-gnd', 'start');
    P.rect(866, 487, 22, 12, 'res'); P.text(877, 512, 'C 470 µF', 'tx-s', 'middle', 0, 9);
    return wrap([20, 36, 975, 500], P, 'Sơ đồ đấu nối thực tế');
  }

  // Sơ đồ khối MÔ PHỎNG: chỉ luồng tín hiệu / dữ liệu, không dùng để đấu dây
  function blockDiagram() {
    const P = pen(11);
    const b = (x, y, w, h, t, sub, cls) => { P.rect(x, y, w, h, cls || 'blk'); P.text(x + w / 2, y + h / 2 - (sub ? 7 : 0), t, 'tx-b', 'middle', 0, 12); if (sub) P.text(x + w / 2, y + h / 2 + 10, sub, 'tx-s', 'middle', 0, 9.5); };
    const arr = (pts, cls) => P.o.push(`<polyline points="${pts.map((q) => q.join(',')).join(' ')}" class="flow ${cls || ''}" vector-effect="non-scaling-stroke" marker-end="url(#ar)"/>`);
    const lb = (x, y, t) => P.text(x, y, t, 'tx-s', 'middle', 0, 9.5);
    b(30, 40, 150, 50, 'HC-SR04', 'khoảng cách → mm'); b(30, 120, 150, 50, 'Water Sensor', 'A0 → ướt/khô');
    b(250, 30, 220, 150, '', ''); P.text(360, 50, 'Arduino Mega (firmware)', 'tx-b', 'middle', 0, 12);
    ['Lọc trung vị 5 mẫu', 'Điều khiển 2 ngưỡng (trễ)', 'Khóa an toàn: rò rỉ, cảm biến,', 'chạy khô, quá giờ, giới hạn cứng', 'Relay nghỉ ≥ 5 s'].forEach((t, i) => P.text(360, 75 + i * 20, t, 'tx-s', 'middle', 0, 10));
    b(560, 20, 150, 44, 'Relay → Bơm', ''); b(560, 76, 150, 44, 'LCD 1602', ''); b(560, 132, 150, 44, 'Còi', '');
    b(250, 230, 220, 50, 'ESP-01 (cầu Wi-Fi)', 'UART 9600 ⇄ JSON');
    b(560, 230, 150, 50, 'Điện thoại', 'dashboard', 'blk dash');
    arr([[180, 65], [250, 65]]); arr([[180, 145], [250, 145]]);
    arr([[470, 50], [560, 42]]); arr([[470, 98], [560, 98]]); arr([[470, 150], [560, 154]]);
    arr([[340, 180], [340, 230]]); arr([[380, 230], [380, 180]]); lb(306, 206, 'số liệu'); lb(414, 206, 'lệnh');
    P.o.push('<polyline points="470,248 560,248" class="flow wifi" vector-effect="non-scaling-stroke" marker-end="url(#ar)"/><polyline points="560,262 470,262" class="flow wifi" vector-effect="non-scaling-stroke" marker-end="url(#ar)"/>');
    lb(515, 238, 'Wi-Fi'); lb(515, 297, 'mất mạng → Mega vẫn tự điều khiển');
    return wrap([20, 10, 710, 300], P, 'Sơ đồ khối mô phỏng');
  }

  root.Drawings = { front, top, tank, bridge, sheets, wiring, blockDiagram };
})(window);
