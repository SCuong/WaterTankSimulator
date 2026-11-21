/* Mô hình thiết kế tham số — NGUỒN SỰ THẬT DUY NHẤT cho 3D, bản vẽ, BOM, cắt vật liệu, sơ đồ điện và mô phỏng.
   Hai phương án: 'detailed' (bục + ống xả/tràn + đế) và 'simple' (đặt trên bàn, tự thi công nhanh).
   Đơn vị: mm. Trục: X sang phải, Y lên trên, Z hướng về người xem. y = 0 là mặt đế (chi tiết) hoặc mặt bàn (đơn giản). */
(function (root) {
  'use strict';

  // Linh kiện mua sẵn: kích thước DANH NGHĨA, sai lệch giữa các lô hàng ±1–2 mm → đo lại trước khi khoan/cắt.
  const SPEC = {
    hc: { pcbL: 45, pcbW: 20, canD: 16, canH: 12, pitch: 26, deadZone: 30, halfAngle: 15 },
    pump: { l: 45, w: 24, h: 33, outletOD: 7.5, minSubmerge: 15, qMax: 1.5, hMax: 1.0 }, // qMax L/phút ở cột áp 0, hMax m — ƯỚC TÍNH
    tube: { id: 6, od: 8 },
    mega: { l: 101.6, w: 53.3, h: 15 },
    megaBox: { l: 115, w: 66, h: 28 },
    relay: { l: 50, w: 26, h: 19 },
    esp: { l: 24.8, w: 14.3 },
    tbM: { l: 85, w: 55, h: 9 }, tbS: { l: 47, w: 35, h: 9 },
    lcd: { l: 80, w: 36, h: 22, winL: 72, winW: 25 },
    buzz: { l: 33, w: 13, h: 12 },
    ws: { l: 62, w: 20, t: 1.6 },
    abs: { l: 250, w: 80, h: 70, wall: 2.5 },
    sheet: { w: 600, h: 400 },
  };

  const PARAMS = [
    { key: 'tankD', label: 'Đường kính trong bình chứa', min: 70, max: 200, step: 1, def: 110, kind: 'measure', hint: 'Đo bằng thước kẹp ở giữa thân bình' },
    { key: 'tankH', label: 'Chiều cao trong bình (đáy → miệng)', min: 120, max: 350, step: 1, def: 200, kind: 'measure', hint: 'Đo từ mặt đáy trong lên mép miệng' },
    { key: 'tankWall', label: 'Độ dày thành bình', min: 0.3, max: 4, step: 0.1, def: 1, kind: 'measure', hint: 'PET thường 0.5–1.2 mm' },
    { key: 'resL', label: 'Chiều dài bình/hộp nguồn', min: 120, max: 350, step: 1, def: 200, kind: 'measure', hint: 'Kích thước trong lòng hộp' },
    { key: 'resW', label: 'Chiều rộng bình/hộp nguồn', min: 100, max: 250, step: 1, def: 150, kind: 'measure', hint: '' },
    { key: 'resH', label: 'Chiều cao bình/hộp nguồn', min: 80, max: 200, step: 1, def: 120, kind: 'measure', hint: '' },
    { key: 'platformH', label: 'Chiều cao bục đỡ bình', min: 100, max: 400, step: 5, def: 160, kind: 'design', hint: 'Chỉ bản chi tiết. Phải cao hơn hộp nguồn để nước xả tự chảy về', only: 'detailed' },
    { key: 'sheetT', label: 'Độ dày tấm Formex', options: [3, 5], def: 5, kind: 'design', hint: '5 mm cứng hơn, 3 mm dễ cắt hơn' },
  ];
  const VARIANTS = { detailed: 'Bản chi tiết', simple: 'Bản đơn giản' };

  const CLUSTERS = [
    { id: 'frame', name: 'Đế & khung', off: [0, -80, 0] },
    { id: 'source', name: 'Bể nguồn & bơm', off: [-170, 0, 110] },
    { id: 'tank', name: 'Bình chứa & khay hứng', off: [0, 110, 0] },
    { id: 'sensor', name: 'Giá đỡ & HC-SR04', off: [0, 240, 0] },
    { id: 'tubes', name: 'Ống dẫn nước', off: [0, 40, 230] },
    { id: 'elec', name: 'Mạch điều khiển', off: [190, 40, 0] },
  ];

  const KIND = {
    design: 'Thiết kế đề xuất — cắt/gia công theo số này',
    measure: 'Cần đo thực tế — số đang dùng là giả định, đo vật thật rồi nhập lại',
    nominal: 'Danh nghĩa nhà sản xuất — đo lại trước khi khoan/cắt',
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const r1 = (v) => Math.round(v * 10) / 10;
  const r0 = Math.round;

  function sanitize(input) {
    const p = {};
    for (const d of PARAMS) {
      let v = Number(input && input[d.key]);
      if (!Number.isFinite(v)) v = d.def;
      if (d.options) v = d.options.includes(v) ? v : d.def;
      else v = clamp(v, d.min, d.max);
      p[d.key] = v;
    }
    return p;
  }

  const polyLen = (pts) => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1], q[2] - pts[i][2]), 0);

  // Xếp các miếng cắt lên tấm 600×400 theo kệ (shelf), mạch cắt 3 mm. Đủ tốt cho ≤ 15 miếng.
  function pack(pieces, SW, SH, kerf) {
    const items = [];
    pieces.forEach((pc) => {
      for (let i = 0; i < pc.qty; i++) items.push({ code: pc.qty > 1 ? `${pc.code}.${i + 1}` : pc.code, id: pc.id, name: pc.name, w: Math.max(pc.w, pc.h), h: Math.min(pc.w, pc.h) });
    });
    items.sort((a, b) => b.h - a.h || b.w - a.w);
    const sheets = [];
    for (const it of items) {
      if (it.w > SW || it.h > SH) { sheets.push({ oversize: true, w: it.w, h: it.h, pieces: [{ ...it, x: 0, y: 0 }] }); continue; }
      let placed = false;
      for (const sh of sheets) {
        if (sh.oversize) continue;
        for (const shelf of sh.shelves) {
          if (it.h <= shelf.h && shelf.x + it.w <= SW) { sh.pieces.push({ ...it, x: shelf.x, y: shelf.y }); shelf.x += it.w + kerf; placed = true; break; }
        }
        if (!placed && sh.y + it.h <= SH) {
          sh.shelves.push({ y: sh.y, h: it.h, x: it.w + kerf });
          sh.pieces.push({ ...it, x: 0, y: sh.y }); sh.y += it.h + kerf; placed = true;
        }
        if (placed) break;
      }
      if (!placed) sheets.push({ w: SW, h: SH, y: it.h + kerf, shelves: [{ y: 0, h: it.h, x: it.w + kerf }], pieces: [{ ...it, x: 0, y: 0 }] });
    }
    return sheets.map((s) => ({ oversize: !!s.oversize, w: s.w, h: s.h, pieces: s.pieces }));
  }

  // Sơ đồ chân Arduino Mega 2560 — dùng chung cho sơ đồ nối dây, bảng chân và mô phỏng.
  const PINS = [
    { from: 'HC-SR04 VCC / GND', to: '5V / GND (domino nguồn)', color: 'Đỏ / Đen', note: 'HC-SR04 chạy 5 V, cùng mức logic với Mega → không cần chia áp' },
    { from: 'HC-SR04 TRIG', to: 'D9', color: 'Vàng', note: 'Xung 10 µs' },
    { from: 'HC-SR04 ECHO', to: 'D10', color: 'Xanh lá', note: 'pulseIn(…, 30000) — quá 30 ms coi là mất tín hiệu' },
    { from: 'Water Sensor S', to: 'A0', color: 'Cam', note: 'Analog 0–1023; ướt khi > 300 (hiệu chỉnh thực tế)' },
    { from: 'Water Sensor +', to: 'D7', color: 'Đỏ', note: 'Chỉ cấp điện khi đọc (10 ms) → giảm ăn mòn điện phân' },
    { from: 'Relay IN', to: 'D6', color: 'Xanh dương', note: 'Module kích mức THẤP: ghi HIGH trước khi pinMode OUTPUT để bơm không nháy lúc khởi động' },
    { from: 'Relay VCC / GND', to: '5V / GND', color: 'Đỏ / Đen', note: 'Cuộn relay ~70 mA lấy từ nguồn 5 V chung, không qua chân I/O' },
    { from: 'Relay COM → NO', to: '+5V → Bơm (+)', color: 'Đỏ', note: 'Dùng tiếp điểm NO: mất điện/treo mạch → bơm TẮT' },
    { from: 'Bơm (−)', to: 'GND', color: 'Đen', note: 'Diode 1N4007 song song bơm, vạch về (+)' },
    { from: 'Buzzer I/O', to: 'D8', color: 'Nâu', note: 'Module còi 5 V' },
    { from: 'LCD I2C SDA / SCL', to: 'D20 / D21', color: 'Trắng / Xám', note: 'Địa chỉ 0x27 hoặc 0x3F — quét I2C để biết' },
    { from: 'Mega TX1 (D18)', to: 'Chuyển mức HV1 → LV1 → ESP RX', color: 'Tím nhạt', note: 'BẮT BUỘC hạ 5 V → 3,3 V, ESP8266 không chịu 5 V' },
    { from: 'ESP TX → LV2 → HV2', to: 'Mega RX1 (D19)', color: 'Hồng', note: '3,3 V → 5 V qua module chuyển mức (an toàn hơn nối thẳng)' },
    { from: 'ESP VCC, EN (CH_PD)', to: '3,3 V từ AMS1117', color: 'Cam', note: 'EN kéo lên 3,3 V qua 10 kΩ; RST kéo lên 10 kΩ. KHÔNG dùng chân 3V3 của Mega (chỉ ~50 mA)' },
    { from: 'AMS1117 VIN / GND', to: '5V / GND', color: 'Đỏ / Đen', note: 'Tụ 470 µF ở ngõ ra 3,3 V chống sụt áp khi ESP phát Wi-Fi' },
    { from: 'Adapter 5 V 3 A', to: 'Jack DC → domino 5V/GND → chân 5V Mega', color: 'Đỏ / Đen', note: 'Rút adapter khi cắm USB nạp code (tránh 2 nguồn 5 V nối song song)' },
  ];

  // Ngân sách dòng trên nguồn 5 V và 3,3 V (giá trị điển hình từ datasheet/đo phổ biến — đo lại bằng đồng hồ).
  const POWER = [
    { name: 'Bơm chìm 5 V (chạy / khởi động)', rail: '5V', typ: 0.30, peak: 0.80 },
    { name: 'Cuộn relay 5 V', rail: '5V', typ: 0.07, peak: 0.07 },
    { name: 'Arduino Mega 2560', rail: '5V', typ: 0.08, peak: 0.10 },
    { name: 'LCD 1602 + đèn nền', rail: '5V', typ: 0.03, peak: 0.04 },
    { name: 'HC-SR04', rail: '5V', typ: 0.015, peak: 0.015 },
    { name: 'Còi buzzer', rail: '5V', typ: 0.03, peak: 0.03 },
    { name: 'Water Sensor (cấp khi đọc)', rail: '5V', typ: 0.01, peak: 0.02 },
    { name: 'ESP8266 ESP-01 (qua AMS1117)', rail: '3V3', typ: 0.08, peak: 0.30 },
  ];

  function compute(input, variantIn) {
    const v = variantIn === 'simple' ? 'simple' : 'detailed';
    const S_ = v === 'simple';
    const p = sanitize(input);
    const T = p.sheetT, m = 20;
    const tankOD = p.tankD + 2 * p.tankWall;
    const has = { base: !S_, platform: !S_, drain: !S_, overflow: !S_, valve: !S_, splash: !S_ };

    // Khay hứng: chừa 15 mm quanh bình + dải phía trước đặt Water Sensor 62×20.
    const strip = 40;
    const tray = { inX: tankOD + 30, inZ: tankOD + 30 + strip, wallH: 25 };
    tray.outX = tray.inX + 2 * T; tray.outZ = tray.inZ + 2 * T;
    const res = { L: p.resL, W: p.resW, H: p.resH, z: 0 };
    let base = null, plat = null, splash = null, x0, ctl;
    const elecW = 170, gapRP = 30, gapPE = 30;

    if (!S_) {
      plat = { X: tray.outX + 20, Z: tray.outZ + 20, H: p.platformH, z: 0 };
      const baseL = m + p.resL + gapRP + plat.X + gapPE + elecW + m;
      const baseW = Math.max(p.resW, plat.Z, 222) + 2 * m;
      x0 = -baseL / 2;
      base = { L: baseL, W: baseW, x0 };
      res.x = x0 + m + p.resL / 2;
      plat.x = res.x + p.resL / 2 + gapRP + plat.X / 2;
      splash = { x: plat.x + plat.X / 2 + gapPE / 2, z: 0, h: 80, len: baseW - 2 * m };
      tray.x = plat.x; tray.y = p.platformH;
    } else {
      const gap = 40, A = SPEC.abs;
      const total = p.resL + gap + tray.outX + gap + A.w;
      x0 = -total / 2;
      res.x = x0 + p.resL / 2;
      tray.x = x0 + p.resL + gap + tray.outX / 2; tray.y = 0;
      ctl = { x: x0 + total - A.w / 2, z: 0, L: A.l, W: A.w, H: A.h, wall: A.wall }; // hộp ABS: dài theo Z, LCD trên nắp
    }
    tray.z = 0;
    const tank = { x: tray.x, z: tray.z - strip / 2, D: p.tankD, OD: tankOD, H: p.tankH, wall: p.tankWall, y0: tray.y + T };
    tank.yIn = tank.y0 + p.tankWall; tank.rim = tank.yIn + p.tankH;

    const bT = S_ ? 3 : T; // giá đỡ cảm biến: mica 3 mm (đơn giản) hoặc Formex (chi tiết)
    const bridge = { l: r0(tankOD + 30), w: 60, t: bT, x: tank.x, z: tank.z, y: tank.rim,
      holes: [{ x: -SPEC.hc.pitch / 2, z: 0, d: 16.5, use: 'Đầu phát T' }, { x: SPEC.hc.pitch / 2, z: 0, d: 16.5, use: 'Đầu thu R' }, { x: 0, z: 18, d: 8.5, use: 'Ống cấp nước' }] };
    const faceY = tank.rim + bT - SPEC.hc.canH;
    const S = faceY - tank.yIn;
    const measMax = Math.floor(S - SPEC.hc.deadZone);   // giới hạn đo được của HC-SR04 = 100 %
    const overflowH = has.overflow ? measMax : null;
    const drainH = 12;
    const usableH = measMax;

    const pump = { l: SPEC.pump.l, w: SPEC.pump.w, h: SPEC.pump.h, x: res.x + p.resL / 2 - 40, z: clamp(p.resW / 4, 20, 60) };
    pump.outletY = pump.h + 8;
    const inlet = { x: tank.x, z: tank.z + 18 };
    const resEdge = res.x + p.resL / 2;
    const zIn = (z) => clamp(z, -p.resW / 2 + 22, p.resW / 2 - 22);
    const trayLeft = tray.x - tray.outX / 2;

    const tubes = {};
    if (!S_) {
      const xEdge = plat.x - plat.X / 2;
      tubes.pump = { pts: [[pump.x, pump.outletY, pump.z], [pump.x, p.resH + 45, pump.z], [xEdge - 5, tank.rim + 55, (pump.z + inlet.z) / 2], [inlet.x, tank.rim + 55, inlet.z], [inlet.x, tank.rim - 15, inlet.z]] };
      tubes.drain = { pts: [[tank.x - tankOD / 2 + 2, tank.yIn + drainH, tank.z], [xEdge - 10, tank.yIn + drainH, tank.z], [xEdge - 15, p.resH + 30, zIn(tank.z)], [resEdge - 25, p.resH + 18, zIn(tank.z)], [resEdge - 25, p.resH - 25, zIn(tank.z)]] };
      tubes.overflow = { pts: [[tank.x, tank.yIn + overflowH, tank.z - tankOD / 2 + 2], [tank.x, tank.yIn + overflowH - 5, tank.z - tankOD / 2 - 22], [xEdge - 12, (tank.yIn + overflowH + p.resH) / 2, zIn(-p.resW / 2)], [resEdge - 45, p.resH + 18, zIn(-p.resW / 2)], [resEdge - 45, p.resH - 25, zIn(-p.resW / 2)]] };
    } else {
      // Đầu ống cấp nằm trên mức tối đa → không xi-phông ngược khi bơm tắt (hai bình cùng mặt bàn).
      tubes.pump = { pts: [[pump.x, pump.outletY, pump.z], [pump.x, p.resH + 40, pump.z], [(resEdge + trayLeft) / 2, Math.max(p.resH, tank.rim) + 50, (pump.z + inlet.z) / 2], [inlet.x, tank.rim + 50, inlet.z], [inlet.x, tank.rim - 15, inlet.z]] };
    }
    for (const k in tubes) tubes[k].len = r0(polyLen(tubes[k].pts));
    if (tubes.drain) { const d1 = tubes.drain.pts[1], d2 = tubes.drain.pts[2]; tubes.drain.valveAt = [(d1[0] + d2[0]) / 2, (d1[1] + d2[1]) / 2, (d1[2] + d2[2]) / 2]; }
    const tubeKeys = Object.keys(tubes);
    const tubeCutTotal = tubeKeys.reduce((s, k) => s + tubes[k].len * 1.1 + 50, 0);
    const tubeBuyM = Math.ceil(tubeCutTotal / 500) * 0.5;

    // ---- Vị trí linh kiện điện tử ----
    const E = {};
    if (!S_) {
      const ex = splash.x + gapPE / 2 + elecW / 2, zb = base.W / 2 - m;
      E.zone = { x: ex, w: elecW };
      E.megaBox = { x: ex, z: -zb + SPEC.megaBox.w / 2, y: 0, rot: 0 };
      E.mega = { x: ex, z: E.megaBox.z, y: 3, rot: 0 };
      E.tb = { x: ex - 38, z: 12, y: 0, l: SPEC.tbM.l, w: SPEC.tbM.w };
      E.relay = { x: ex + 55, z: 5, y: 0, rot: Math.PI / 2 };
      E.buzz = { x: ex + 52, z: 55, y: 0, rot: 0 };
      E.jack = { x: ex - 62, z: 62, y: 0 };
      E.lcd = { x: ex, z: zb - 8 - T, y: 42, face: 'front' };
      E.lcdPanel = { x: ex, z: zb - 8, w: 110, h: 72 };
      // Kênh đi dây trên mặt đế (như bó dây gọn trên mô hình thật): dây nằm sát mặt đế, chạy vuông góc trong khe giữa các module,
      // xếp song song thành bó, buộc dây rút; chỉ rời kênh ngay cạnh chân cần cắm. Cáp ngoài vào vùng mạch dọc vách chắn.
      const left = splash.x + 10;
      E.harness = { y: 0, lines: [
        { id: 'back', axis: 'z', c: -zb + SPEC.megaBox.w + 7, name: 'Kênh sau (trước hộp Mega)' },
        { id: 'mid', axis: 'z', c: E.tb.z + SPEC.tbM.w / 2 + 4.5, name: 'Kênh giữa (trước test board, relay)' },
        { id: 'front', axis: 'z', c: zb - 23, name: 'Kênh trước (sau tấm LCD)' },
        { id: 'left', axis: 'x', c: left, name: 'Kênh trái (dọc vách chắn)' },
        { id: 'center', axis: 'x', c: ex + 24, name: 'Kênh giữa test board – relay' },
        { id: 'right', axis: 'x', c: ex + 80, name: 'Kênh phải (mép đế)' },
      ], entry: { hc: [left, -zb + SPEC.megaBox.w + 7], ws: [left, 10], pumpW: [left, zb - 23] } };
    } else {
      const c = ctl, fl = c.wall;
      E.mega = { x: c.x, z: -c.L / 2 + fl + 8 + SPEC.mega.l / 2, y: fl + 6, rot: Math.PI / 2 };
      E.relay = { x: c.x - 20, z: 30, y: fl, rot: Math.PI / 2 };
      E.tb = { x: c.x + 17, z: 32, y: fl, l: SPEC.tbS.w, w: SPEC.tbS.l };
      E.buzz = { x: c.x, z: 82, y: fl, rot: Math.PI / 2 };
      E.jack = { x: c.x, z: c.L / 2 - fl - 12, y: fl };
      E.lcd = { x: c.x, z: -c.L / 2 + 60, y: c.H - fl, face: 'up' };
      const left = c.x - c.W / 2 + 2.5 + fl; // hộp chật: kênh sát thành, kênh giữa luồn khe relay – test board
      E.harness = { y: fl, lines: [
        { id: 'back', axis: 'z', c: E.mega.z + SPEC.mega.l / 2 + 6, name: 'Kênh ngang trước Mega' },
        { id: 'mid', axis: 'z', c: 60, name: 'Kênh ngang giữa (trước relay, test board)' },
        { id: 'front', axis: 'z', c: c.L / 2 - 24, name: 'Kênh ngang sau còi' },
        { id: 'left', axis: 'x', c: left, name: 'Kênh dọc thành trái (lỗ luồn cáp)' },
        { id: 'center', axis: 'x', c: E.relay.x + 16, name: 'Kênh dọc khe relay – test board' },
        { id: 'right', axis: 'x', c: c.x + c.W / 2 - 2.5 - fl, name: 'Kênh dọc thành phải' },
      ], entry: { hc: [left, -60], ws: [left, -20], pumpW: [left, 20] } };
    }
    const wsPlate = { x: tank.x, z: tray.z + tray.inZ / 2 - strip / 2, y: tray.y + T };
    const megaTop = [E.mega.x, E.mega.y + 14, E.mega.z];
    const hcTop = faceY + SPEC.hc.canH + 4;
    let wires;
    if (!S_) {
      const xEdge = plat.x - plat.X / 2;
      wires = {
        hc: { name: 'Cáp HC-SR04 (4 lõi)', pts: [[tank.x + 18, hcTop, tank.z - 8], [tank.x + 18, tank.rim + 35, tank.z - 30], [xEdge + plat.X - 5, tank.rim + 10, tank.z - 30], [splash.x, splash.h + 12, -40], [E.harness.entry.hc[0], splash.h - 20, E.harness.entry.hc[1]], [E.harness.entry.hc[0], 1.3, E.harness.entry.hc[1]]] },
        ws: { name: 'Cáp Water Sensor (3 lõi)', pts: [[wsPlate.x + 28, wsPlate.y + 2, wsPlate.z], [tray.x + tray.outX / 2 + 6, tray.y + T + tray.wallH + 8, wsPlate.z], [plat.x + plat.X / 2 + 6, tray.y - 30, wsPlate.z], [splash.x, splash.h + 12, 14], [E.harness.entry.ws[0], splash.h - 20, E.harness.entry.ws[1]], [E.harness.entry.ws[0], 1.1, E.harness.entry.ws[1]]] },
        pumpW: { name: 'Dây nguồn bơm (2 lõi)', pts: [[pump.x - 12, pump.h, pump.z], [pump.x - 12, p.resH + 25, pump.z + 15], [resEdge + 12, 35, base.W / 2 - 30], [splash.x, splash.h + 10, base.W / 2 - 34], [E.harness.entry.pumpW[0], splash.h - 20, E.harness.entry.pumpW[1] + 2], [E.harness.entry.pumpW[0], 1.2, E.harness.entry.pumpW[1]]] },
      };
      void xEdge;
    } else {
      const hx = ctl.x - ctl.W / 2;
      wires = {
        hc: { name: 'Cáp HC-SR04 (4 lõi)', pts: [[tank.x + 18, hcTop, tank.z - 8], [tank.x + 18, tank.rim + 30, tank.z - 30], [hx - 25, tank.rim * 0.5, -60], [hx, 40, -60], [hx + 4, 12, -60], [E.harness.entry.hc[0], ctl.wall + 1.3, -60]] },
        ws: { name: 'Cáp Water Sensor (3 lõi)', pts: [[wsPlate.x + 28, wsPlate.y + 2, wsPlate.z], [tray.x + tray.outX / 2 + 5, tray.y + T + tray.wallH + 8, wsPlate.z], [hx - 12, 12, -20], [hx, 40, -20], [hx + 4, 12, -20], [E.harness.entry.ws[0], ctl.wall + 1.1, -20]] },
        pumpW: { name: 'Dây nguồn bơm (2 lõi)', pts: [[pump.x - 12, pump.h, pump.z], [pump.x - 12, p.resH + 25, pump.z + 15], [resEdge + 10, 8, tray.outZ / 2 + 25], [hx - 12, 8, tray.outZ / 2 + 25], [hx, 40, 20], [hx + 4, 12, 20], [E.harness.entry.pumpW[0], ctl.wall + 1.2, 20]] },
      };
    }
    // Cáp ngoài tới điểm vào kênh + lõi đi theo kênh tới chân xa nhất (ước theo Manhattan) + 100 mm dư
    const dest = { hc: megaTop, ws: megaTop, pumpW: [E.relay.x, 0, E.relay.z] };
    for (const k in wires) { const en = E.harness.entry[k]; wires[k].len = r0(polyLen(wires[k].pts)); wires[k].coreLen = r0(Math.abs(dest[k][0] - en[0]) + Math.abs(dest[k][2] - en[1]) + 40); }
    const cut = (w) => Math.ceil((w.len + w.coreLen + 100) / 100) / 10;
    const cable4M = cut(wires.hc) + cut(wires.ws);
    const cable2M = cut(wires.pumpW);

    // ---- Danh sách cắt (Formex: xếp tấm; mica và gia công hộp: liệt kê riêng) ----
    const pieces = [];
    if (!S_) {
      const wallH = p.platformH - T;
      pieces.push(
        { code: 'A', id: 'base', name: 'Đế', w: r0(base.L), h: r0(base.W), qty: 1, holes: [], note: 'Bo góc R5, dán 4 chân cao su' },
        { code: 'B1', id: 'platform', name: 'Mặt bục', w: r0(plat.X), h: r0(plat.Z), qty: 1, holes: [], note: 'Dán lên 3 vách B2, B3' },
        { code: 'B2', id: 'platform', name: 'Vách bục trái/phải', w: r0(plat.Z), h: r0(wallH), qty: 2, holes: [], note: 'Đứng theo phương Z' },
        { code: 'B3', id: 'platform', name: 'Vách bục sau', w: r0(plat.X - 2 * T), h: r0(wallH), qty: 1, holes: [], note: 'Mặt trước để hở đi dây' });
    }
    pieces.push(
      { code: 'C1', id: 'tray', name: 'Đáy khay hứng', w: r0(tray.outX), h: r0(tray.outZ), qty: 1, holes: [], note: 'Trét silicone mép trong' },
      { code: 'C2', id: 'tray', name: 'Vách khay dọc (trái/phải)', w: r0(tray.outZ), h: tray.wallH, qty: 2, holes: has.drain ? [{ x: r0(tray.outZ / 2 + (tank.z - tray.z)), y: r0(p.tankWall + drainH), d: 8.5, note: 'chỉ vách TRÁI, đo từ đầu sau' }] : [], note: 'Dán đứng trên mép đáy C1' },
      { code: 'C3', id: 'tray', name: 'Vách khay ngang (trước/sau)', w: r0(tray.outX - 2 * T), h: tray.wallH, qty: 2, holes: [], note: 'Kẹp giữa hai vách C2' });
    if (!S_) {
      pieces.push(
        { code: 'D1', id: 'bridge', name: 'Tấm đỡ cảm biến', w: bridge.l, h: bridge.w, qty: 1, holes: bridge.holes, note: 'Lỗ Ø16.5 cách tâm 26 — đo lại HC-SR04' },
        { code: 'D2', id: 'bridge', name: 'Cữ chặn tấm đỡ', w: 15, h: 10, qty: 2, holes: [], note: 'Dán dưới D1, sát ngoài miệng bình' },
        { code: 'E', id: 'splash', name: 'Vách chắn nước', w: r0(splash.len), h: splash.h, qty: 1, holes: [], note: 'Ngăn nước bắn sang mạch' },
        { code: 'E2', id: 'lcdPanel', name: 'Tấm gắn LCD', w: E.lcdPanel.w, h: E.lcdPanel.h, qty: 1, holes: [{ x: 0, z: 0, d: 0, rect: [SPEC.lcd.winL, SPEC.lcd.winW], use: 'Cửa sổ LCD' }], note: 'Cửa sổ 72×25, 4 lỗ Ø3 cách 75×31 (đo lại LCD)' });
    }
    const micaPieces = S_ ? [
      { code: 'M1', id: 'bridge', name: 'Thanh đỡ HC-SR04 (mica 3 mm)', w: bridge.l, h: bridge.w, qty: 1, holes: bridge.holes, note: 'Khoan mũi khoét Ø16.5; mica giòn — khoan chậm, kê gỗ phía dưới' },
      { code: 'M2', id: 'bridge', name: 'Cữ chặn (mica 3 mm)', w: 15, h: 10, qty: 2, holes: [], note: 'Dán keo 502 dưới M1, sát ngoài miệng bình' },
    ] : [];
    const boxMods = S_ ? [
      { code: 'H1', where: 'Nắp hộp ABS', what: `Cửa sổ LCD ${SPEC.lcd.winL}×${SPEC.lcd.winW} mm + 4 lỗ Ø3 (lỗ bắt LCD cách 75×31)`, how: 'Khoan 4 lỗ góc Ø4 rồi cắt bằng dao rọc nóng/cưa lọng mini, dũa phẳng' },
      { code: 'H2', where: 'Vách hộp phía bình chứa', what: '3 lỗ Ø8 cách nhau 40 mm, cao 40 mm từ đáy', how: 'Luồn cáp HC-SR04, Water Sensor, dây bơm; bọc gen hoặc keo nến chống nước' },
      { code: 'H3', where: 'Vách đầu hộp', what: '1 lỗ Ø8 cho dây adapter', how: 'Thắt nút dây bên trong chống giật' },
      { code: 'H4', where: 'Đáy hộp', what: '4 lỗ Ø3 bắt cọc đồng Mega (theo lỗ trên board)', how: 'Đặt Mega lên, chấm bút qua lỗ board rồi khoan' },
    ] : [{ code: 'H1', where: 'Hộp mica Mega', what: '1 lỗ Ø8 cạnh hộp cho bó dây tín hiệu', how: 'Khoan chậm, kê gỗ' }];
    const sheets = pack(pieces, SPEC.sheet.w, SPEC.sheet.h, 3);
    const stdSheets = sheets.filter((s) => !s.oversize).length;
    const bigPieces = sheets.filter((s) => s.oversize);
    const formexArea = pieces.reduce((s, pc) => s + pc.w * pc.h * pc.qty, 0);

    // ---- Thể tích & cảnh báo kỹ thuật ----
    const tankArea = Math.PI * (p.tankD / 2) ** 2;
    const resArea = (p.resL - 2) * (p.resW - 2);
    const tankUsableL = tankArea * usableH / 1e6;
    const resUsableL = resArea * (p.resH - 25 - SPEC.pump.minSubmerge) / 1e6;
    const inletY = tank.rim + 55;
    const headTypM = (inletY - 50) / 1000;
    const qTyp = Math.max(0.05, SPEC.pump.qMax * (1 - headTypM / SPEC.pump.hMax));
    const warnings = [];
    if (resUsableL < 1.2 * tankUsableL) warnings.push({ lvl: 'danger', msg: `Bình nguồn chỉ chứa ~${r1(resUsableL)} L hữu dụng, cần ≥ ${r1(1.2 * tankUsableL)} L (1.2× bình chứa) để bơm không chạy khô.` });
    if (!S_ && tank.yIn + drainH < p.resH + 30) warnings.push({ lvl: 'danger', msg: `Bục thấp: lỗ xả (${r0(tank.yIn + drainH)} mm) phải cao hơn miệng hộp nguồn + 30 mm (${p.resH + 30} mm) để nước tự chảy về.` });
    const beamR = S * Math.tan(SPEC.hc.halfAngle * Math.PI / 180);
    if (beamR > p.tankD / 2 - 5) warnings.push({ lvl: 'warn', msg: `Chùm siêu âm (±15°) rộng ${r0(2 * beamR)} mm ở đáy, sát thành bình Ø${p.tankD} (khe < 5 mm mỗi bên): có thể dội từ thành khi nước cạn. Giữ ngưỡng thấp ≥ 20 % hoặc dùng bình rộng hơn.` });
    if (headTypM > 0.7 * SPEC.pump.hMax) warnings.push({ lvl: 'warn', msg: `Cột áp ~${r1(headTypM * 100)} cm gần giới hạn bơm mini: lưu lượng còn ~${r1(qTyp)} L/phút. Hạ bục hoặc bình thấp hơn.` });
    if (usableH < 60) warnings.push({ lvl: 'warn', msg: 'Mức hữu dụng < 60 mm: dải điều khiển quá hẹp so với sai số ±3 mm của HC-SR04.' });
    if (S_) warnings.push({ lvl: 'info', msg: `Bản đơn giản không có ống tràn: nếu điều khiển hỏng, nước tràn miệng bình xuống khay → Water Sensor báo rò rỉ và khóa bơm. Đầu ống cấp nằm cao hơn mức tối đa ${r0(tank.rim - 15 - tank.yIn - usableH)} mm nên không xi-phông ngược.` });
    if (bigPieces.length) warnings.push({ lvl: 'info', msg: `Đế ${r0(base.L)}×${r0(base.W)} mm lớn hơn tấm 600×400: nhờ tiệm quảng cáo cắt từ tấm khổ 1220×2440.` });
    const p5 = POWER.filter((x) => x.rail === '5V');
    const peak5 = p5.reduce((s, x) => s + x.peak, 0) + POWER.filter((x) => x.rail === '3V3').reduce((s, x) => s + x.peak, 0);
    const typ5 = p5.reduce((s, x) => s + x.typ, 0) + POWER.filter((x) => x.rail === '3V3').reduce((s, x) => s + x.typ, 0);

    // ---- BOM (giá Điện tử Spider tra ngày 18/11/2026; mục khác: tham khảo thị trường) ----
    const SPd = 'Điện tử Spider';
    const sp = (slug) => 'https://dientuspider.com/shop/product/' + slug;
    const mk = 'Thị trường';
    const sheetPrice = T === 5 ? 35000 : 22000;
    const bom = [
      { id: 'mega', cat: 'Điện tử', name: 'Arduino Mega 2560 R3 (chip nạp CH340, kèm cáp)', spec: '5 V logic, 54 I/O, 4 UART', qty: 1, unit: 'cái', price: 350000, where: SPd, url: sp('arduino-mega2560-chip-nap-ch34'), kind: 'nominal' },
      { id: 'hcsr04', cat: 'Điện tử', name: 'Cảm biến siêu âm HC-SR04', spec: '5 V, 2–400 cm, góc ±15°', qty: 1, unit: 'cái', price: 25000, where: SPd, url: sp('cam-bien-sieu-am-hc-sr04'), kind: 'nominal' },
      { id: 'ws', cat: 'Điện tử', name: 'Module Water Sensor (cảm biến mực nước 62×20 mm)', spec: 'Analog S, +, −. Spider không bán — thay được bằng “Cảm biến mưa” 18.000 đ', qty: 1, unit: 'cái', price: 15000, where: mk + ' (Shopee, Hshop, Nhật Tảo)', kind: 'nominal' },
      { id: 'relay', cat: 'Điện tử', name: 'Module 1 Relay 5VDC', spec: 'Kích mức thấp, tiếp điểm 10 A', qty: 1, unit: 'cái', price: 20000, where: SPd, url: sp('module-1-relay-5vdc'), kind: 'nominal' },
      { id: 'pump', cat: 'Điện tử', name: 'Bơm chìm mini 5V', spec: 'Đầu ra Ø7.5 mm, ~0.2–0.4 A', qty: 1, unit: 'cái', price: 20000, where: SPd, url: sp('bom-chim-mini-5v'), kind: 'nominal' },
      { id: 'esp01', cat: 'Điện tử', name: 'Wi-Fi ESP8266 ESP-01 (“ESP 8266 V1”)', spec: '3,3 V, UART AT/firmware riêng', qty: 1, unit: 'cái', price: 35000, where: SPd, url: sp('esp-8266-v1'), kind: 'nominal' },
      { id: 'espProg', cat: 'Điện tử', name: 'USB nạp ESP8266 CH340', spec: 'Nạp firmware cho ESP-01', qty: 1, unit: 'cái', price: 22000, where: SPd, url: sp('usb-nap-esp8266-v10-ch340'), kind: 'nominal' },
      { id: 'ams', cat: 'Điện tử', name: 'Module giảm áp AMS1117-3.3V', spec: 'Nguồn 3,3 V riêng cho ESP-01 (đỉnh ~300 mA)', qty: 1, unit: 'cái', price: 5000, where: SPd, url: sp('modul-giam-ap-asm1117-33v'), kind: 'nominal' },
      { id: 'shifter', cat: 'Điện tử', name: 'Module chuyển mức tín hiệu 4 kênh 5V–3V', spec: 'BSS138, cho TX/RX Mega ↔ ESP-01', qty: 1, unit: 'cái', price: 8000, where: SPd, url: sp('module-chuyen-muc-tin-hieu-4-k'), kind: 'nominal' },
      { id: 'lcd', cat: 'Điện tử', name: 'LCD 1602 xanh lá', spec: '16×2 ký tự, 5 V', qty: 1, unit: 'cái', price: 45000, where: SPd, url: sp('lcd-1602-xanh-la'), kind: 'nominal' },
      { id: 'i2c', cat: 'Điện tử', name: 'Module I2C LCD (PCF8574)', spec: 'Hàn sau LCD, chỉ 4 dây', qty: 1, unit: 'cái', price: 20000, where: SPd, url: sp('module-i2c-lcd'), kind: 'nominal' },
      { id: 'buzzer', cat: 'Điện tử', name: 'Module còi buzzer 5V', spec: 'Còi chip có transistor', qty: 1, unit: 'cái', price: 12000, where: SPd, url: sp('module-coi-buzzer-5v'), kind: 'nominal' },
      { id: 'adapter', cat: 'Điện tử', name: 'Adapter 5V 3A', spec: `Đủ dòng: đỉnh ~${r1(peak5)} A, điển hình ~${r1(typ5)} A`, qty: 1, unit: 'cái', price: 55000, where: SPd, url: sp('adapter-5v-3a'), kind: 'nominal' },
      { id: 'jackDC', cat: 'Điện tử', name: 'Mạch ra chân jack DC cái', spec: '5.5×2.1 mm', qty: 1, unit: 'cái', price: 8000, where: SPd, url: sp('mach-ra-chan-jack-dc-cai'), kind: 'nominal' },
      { id: 'domino', cat: 'Điện tử', name: 'Domino 2P KF301 5.08 mm', spec: 'Chia nguồn 5V/GND', qty: 3, unit: 'cái', price: 1500, where: SPd, url: sp('domino-2p-xanh-duong-kf301-508'), kind: 'nominal' },
      { id: 'diode', cat: 'Điện tử', name: 'Diode 1N4007', spec: 'Dập xung ngược song song bơm', qty: 2, unit: 'cái', price: 500, where: SPd, url: sp('diode-1n4007'), kind: 'nominal' },
      { id: 'cap', cat: 'Điện tử', name: 'Tụ 470 µF 25 V', spec: '1 tụ ở nguồn 5 V, 1 tụ ở ngõ ra 3,3 V', qty: 2, unit: 'cái', price: 1000, where: SPd, url: sp('tu-470uf-25v'), kind: 'nominal' },
      { id: 'res', cat: 'Điện tử', name: 'Trở 1/4W (gói 50 con)', spec: 'Dùng 10 kΩ ×2 kéo lên EN, RST của ESP-01', qty: 1, unit: 'gói', price: 5000, where: SPd, url: sp('tro-14w-50-con'), kind: 'nominal' },
      S_ ? { id: 'tb', cat: 'Điện tử', name: 'Test board nhựa mini SYB-170', spec: '47×35 mm, gắn AMS1117 + chuyển mức', qty: 1, unit: 'cái', price: 7000, where: SPd, url: sp('test-board-nhua-mini-syb-170'), kind: 'nominal' }
        : { id: 'tb', cat: 'Điện tử', name: 'Test board nhựa cỡ vừa 8.5×5.5 cm', spec: 'Gắn AMS1117 + chuyển mức + ESP-01', qty: 1, unit: 'cái', price: 17000, where: SPd, url: sp('test-board-nhua-co-vua-85x55cm'), kind: 'nominal' },
      { id: 'jumpMM', cat: 'Điện tử', name: 'Dây cắm testboard đực–đực 20 cm', spec: '20 sợi', qty: 1, unit: 'bó', price: 10000, where: SPd, url: sp('day-cam-testboard-duc-duc-20cm'), kind: 'nominal' },
      { id: 'jumpMF', cat: 'Điện tử', name: 'Dây cắm testboard đực–cái 20 cm', spec: '20 sợi', qty: 1, unit: 'bó', price: 10000, where: SPd, url: sp('day-cam-testboard-duc-cai-20cm'), kind: 'nominal' },
      { id: 'jumpFF', cat: 'Điện tử', name: 'Dây cắm testboard cái–cái 20 cm', spec: '20 sợi, nối chân ESP-01', qty: 1, unit: 'bó', price: 10000, where: SPd, url: sp('day-cam-testboard-cai-cai-20cm'), kind: 'nominal' },
      { id: 'cable4', cat: 'Điện tử', name: 'Cáp chống nhiễu 4 lõi', spec: `HC-SR04 ${r0(wires.hc.len)} mm + Water Sensor ${r0(wires.ws.len)} mm, đã cộng 100 mm/đầu`, qty: r1(cable4M), unit: 'm', price: 8000, where: SPd, url: sp('cap-chong-nhieu-4-loi-1-met'), kind: 'design' },
      { id: 'cable2', cat: 'Điện tử', name: 'Dây đôi đỏ–đen 2×0.5 mm²', spec: `Nối dài dây bơm, tuyến ${r0(wires.pumpW.len)} mm`, qty: r1(cable2M), unit: 'm', price: 6000, where: mk + ' (cửa hàng điện)', kind: 'design' },
      { id: 'heatshrink', cat: 'Điện tử', name: 'Ống co nhiệt', spec: 'Bọc mối hàn dây cảm biến', qty: 1, unit: 'm', price: 3000, where: SPd, url: sp('ong-co-nhiet'), kind: 'nominal' },
      { id: 'standoff', cat: 'Điện tử', name: 'Cọc đồng M3 + ốc (bộ 10)', spec: 'Bắt Mega và LCD', qty: 1, unit: 'bộ', price: 15000, where: mk, kind: 'nominal' },
      S_ ? { id: 'absBox', cat: 'Khung & vật liệu', name: 'Hộp nhựa ABS chống nước 250×80×70', spec: 'Hộp mạch điều khiển, LCD gắn trên nắp', qty: 1, unit: 'cái', price: 85000, where: SPd, url: sp('hop-nhua-abs-chong-nuoc-250x80'), kind: 'nominal' }
        : { id: 'megaBox', cat: 'Khung & vật liệu', name: 'Hộp mica đựng Arduino Mega2560', spec: '~115×66×28 mm (đo lại)', qty: 1, unit: 'cái', price: 28000, where: SPd, url: sp('hop-mica-dung-arduino-mega2560'), kind: 'nominal' },

      { id: 'tank', cat: 'Nước & ống', name: 'Bình / hũ nhựa PET trong, hình trụ', spec: `Ø trong ${p.tankD} × cao ${p.tankH} mm, thành ${p.tankWall} mm`, qty: 1, unit: 'cái', price: 25000, where: mk + ' (bao bì nhựa, chợ, Shopee)', kind: 'measure' },
      { id: 'reservoir', cat: 'Nước & ống', name: S_ ? 'Hộp/bình nhựa làm bình nguồn' : 'Hộp nhựa trong làm bể nguồn', spec: `${p.resL}×${p.resW}×${p.resH} mm, ~${r1(p.resL * p.resW * p.resH / 1e6)} L`, qty: 1, unit: 'cái', price: 40000, where: mk + ' (siêu thị, gia dụng)', kind: 'measure' },
      { id: 'tube', cat: 'Nước & ống', name: 'Ống silicone ID 6 / OD 8 mm', spec: tubeKeys.map((k) => ({ pump: 'cấp', drain: 'xả', overflow: 'tràn' })[k] + ' ' + tubes[k].len).join(' + ') + ' mm (+10 % +50 mm/đầu)', qty: tubeBuyM, unit: 'm', price: 12000, where: mk + ' (cá cảnh – thủy sinh)', kind: 'design' },
      ...(S_ ? [] : [{ id: 'valve', cat: 'Nước & ống', name: 'Van khóa nhựa cho ống 6 mm', spec: 'Chỉnh lưu lượng xả', qty: 1, unit: 'cái', price: 8000, where: mk + ' (cá cảnh)', kind: 'nominal' }]),
      { id: 'silicone', cat: 'Nước & ống', name: 'Keo silicone trong chống thấm', spec: 'Tuýp nhỏ, khô 24 h', qty: 1, unit: 'tuýp', price: 25000, where: mk + ' (điện nước)', kind: 'nominal' },

      { id: 'formex', cat: 'Khung & vật liệu', name: `Tấm Formex (PVC foam) ${T} mm`, spec: `Khổ 600×400 mm — ${pieces.reduce((s, pc) => s + pc.qty, 0)} miếng, ${r1(formexArea / 1e4)} dm²`, qty: stdSheets, unit: 'tấm', price: sheetPrice, where: mk + ' (tiệm quảng cáo, văn phòng phẩm)', kind: 'design' },
      ...bigPieces.map((s, i) => ({ id: 'formexBig' + i, cat: 'Khung & vật liệu', name: `Formex ${T} mm cắt riêng (${s.pieces[0].name})`, spec: `${s.w}×${s.h} mm từ tấm 1220×2440`, qty: 1, unit: 'miếng', price: r0(sheetPrice * s.w * s.h / 240000 / 1000) * 1000 + 5000, where: mk + ' (tiệm quảng cáo)', kind: 'design' })),
      ...(S_ ? [{ id: 'mica', cat: 'Khung & vật liệu', name: 'Mica trong 3 mm (miếng nhỏ, nhờ cắt)', spec: `M1 ${bridge.l}×${bridge.w} + M2 15×10 ×2`, qty: 1, unit: 'bộ', price: 15000, where: mk + ' (tiệm quảng cáo, cắt laser)', kind: 'design' }] : []),
      { id: 'glue', cat: 'Khung & vật liệu', name: 'Keo nến Ø7 mm', spec: 'Dán khung, cố định dây', qty: 10, unit: 'thanh', price: 1500, where: mk, kind: 'nominal' },
      { id: 'tape', cat: 'Khung & vật liệu', name: 'Băng keo xốp 2 mặt', spec: 'Dán module', qty: 1, unit: 'cuộn', price: 12000, where: mk, kind: 'nominal' },
      { id: 'ties', cat: 'Khung & vật liệu', name: 'Dây rút nhựa 3×100 mm', spec: 'Gom ống và dây', qty: 1, unit: 'túi', price: 10000, where: mk, kind: 'nominal' },
      ...(S_ ? [] : [{ id: 'feet', cat: 'Khung & vật liệu', name: 'Chân đế cao su dán Ø20 mm', spec: 'Chống trượt', qty: 4, unit: 'cái', price: 2000, where: mk, kind: 'nominal' }]),

      { id: 'glueGun', cat: 'Dụng cụ', name: 'Súng bắn keo nến 20 W', spec: '', qty: 1, unit: 'cái', price: 45000, where: mk, kind: 'nominal', have: true },
      { id: 'cutter', cat: 'Dụng cụ', name: 'Dao rọc giấy + thước thép 30 cm', spec: 'Rạch 3–4 lần rồi bẻ tấm Formex', qty: 1, unit: 'bộ', price: 30000, where: mk, kind: 'nominal', have: true },
      { id: 'solder', cat: 'Dụng cụ', name: 'Mỏ hàn + thiếc', spec: 'Hàn I2C vào LCD, nối dây cảm biến', qty: 1, unit: 'bộ', price: 120000, where: 'Phòng thí nghiệm khoa', kind: 'nominal', have: true },
      { id: 'meter', cat: 'Dụng cụ', name: 'Đồng hồ vạn năng', spec: 'Đo 5 V / 3,3 V trước khi cắm ESP-01', qty: 1, unit: 'cái', price: 120000, where: 'Phòng thí nghiệm khoa', kind: 'nominal', have: true },
      { id: 'drill', cat: 'Dụng cụ', name: 'Khoan tay mini + mũi Ø3–8 mm, mũi khoét Ø16', spec: 'Hoặc đục lỗ PET bằng que kim loại hơ nóng', qty: 1, unit: 'bộ', price: 60000, where: mk, kind: 'nominal', have: true },
    ];
    bom.forEach((b) => { b.total = r0(b.qty * b.price); });

    // ---- Bộ phận 3D ↔ thông tin chế tạo ----
    const fx = `Formex ${T} mm (PVC foam, không thấm nước)`;
    const parts = {};
    const add = (id, o) => { parts[id] = o; };
    if (!S_) {
      const wallH = p.platformH - T;
      add('base', { cluster: 'frame', name: 'Đế mô hình', func: 'Mặt bằng chung giữ cố định mọi cụm, chống đổ khi bình đầy nước.', where: 'Dưới cùng, đặt trên bàn.', dims: [['Dài', `${r0(base.L)} mm`], ['Rộng', `${r0(base.W)} mm`], ['Dày', `${T} mm`]], kind: 'design', qty: '1 tấm (miếng A)', material: fx, process: 'Kẻ bút chì, rạch dao rọc theo thước thép 3–4 lượt, bẻ gập, chà nhám mép.', fix: 'Dán 4 chân cao su ở 4 góc, cách mép 15 mm.', cut: `A: ${r0(base.L)} × ${r0(base.W)} mm`, bom: ['formex', 'feet'], explode: [0, 0, 0], anchor: [x0 + 40, 0, base.W / 2] });
      add('platform', { cluster: 'frame', name: 'Bục đỡ bình chứa', func: `Nâng bình chứa lên ${p.platformH} mm để nước xả và nước tràn tự chảy về hộp nguồn.`, where: 'Giữa đế, bên phải hộp nguồn.', dims: [['Mặt', `${r0(plat.X)}×${r0(plat.Z)} mm`], ['Cao', `${p.platformH} mm`], ['Vách', `${T} mm`]], kind: 'design', qty: '4 miếng: B1 ×1, B2 ×2, B3 ×1', material: fx, process: 'Cắt 4 miếng, dán thành hộp chữ U úp ngược (hở mặt trước để luồn dây).', fix: 'Keo nến dọc mép trong; dán xuống đế.', cut: `B1 ${r0(plat.X)}×${r0(plat.Z)} · B2 ${r0(plat.Z)}×${r0(wallH)} ×2 · B3 ${r0(plat.X - 2 * T)}×${r0(wallH)}`, bom: ['formex', 'glue'], explode: [0, 70, 0], anchor: [plat.x, p.platformH / 2, plat.Z / 2] });
      add('splash', { cluster: 'frame', name: 'Vách chắn nước', func: 'Ngăn nước bắn/tràn từ cụm bình sang mạch điện.', where: 'Giữa bục và vùng mạch.', dims: [['Dài', `${r0(splash.len)} mm`], ['Cao', `${splash.h} mm`], ['Dày', `${T} mm`]], kind: 'design', qty: '1 miếng (E)', material: fx, process: 'Cắt thẳng.', fix: 'Dán đứng bằng keo nến, gia cố 2 tam giác vụn ở chân.', cut: `E: ${r0(splash.len)} × ${splash.h} mm`, bom: ['formex'], explode: [60, 40, 0], anchor: [splash.x, splash.h, -splash.len / 2 + 20] });
      add('lcdPanel', { cluster: 'frame', name: 'Tấm gắn LCD', func: 'Giữ LCD 1602 đứng, quay ra phía người xem.', where: 'Mép trước vùng mạch.', dims: [['Tấm', `${E.lcdPanel.w}×${E.lcdPanel.h} mm`], ['Cửa sổ', `${SPEC.lcd.winL}×${SPEC.lcd.winW} mm`]], kind: 'design', qty: '1 miếng (E2)', material: fx, process: 'Khoét cửa sổ bằng dao rọc, khoan 4 lỗ Ø3.', fix: 'Dán đứng lên đế + 1 tam giác chống phía sau.', cut: `E2: ${E.lcdPanel.w} × ${E.lcdPanel.h} mm`, bom: ['formex', 'standoff'], explode: [0, 30, 60], anchor: [E.lcdPanel.x - 50, E.lcdPanel.h, E.lcdPanel.z] });
    }
    add('tray', { cluster: 'tank', name: 'Khay hứng nước', func: 'Hứng nước rò rỉ/tràn từ bình; dải trước chứa Water Sensor.', where: S_ ? 'Đặt trên bàn, giữa bình nguồn và hộp mạch.' : 'Trên mặt bục, bình chứa đặt bên trong.', dims: [['Lòng khay', `${r0(tray.inX)}×${r0(tray.inZ)} mm`], ['Thành cao', `${tray.wallH} mm`], ['Dung tích', `~${r0(tray.inX * tray.inZ * tray.wallH / 1000 - tankArea * tray.wallH / 1000)} mL`]], kind: 'design', qty: '5 miếng: C1 ×1, C2 ×2, C3 ×2', material: fx, process: has.drain ? `Khoan lỗ Ø8.5 trên vách C2 trái, tâm cao ${r0(p.tankWall + drainH)} mm từ mặt đáy khay.` : 'Không khoan lỗ.', fix: 'Dán vách lên đáy bằng keo nến, trét silicone kín mép trong. Thử nước 30 phút trước khi lắp điện.', cut: `C1 ${r0(tray.outX)}×${r0(tray.outZ)} · C2 ${r0(tray.outZ)}×${tray.wallH} ×2 · C3 ${r0(tray.outX - 2 * T)}×${tray.wallH} ×2`, bom: ['formex', 'silicone'], explode: [0, 0, 0], anchor: [tray.x + tray.outX / 2, tray.y + tray.wallH, tray.z + tray.outZ / 2] });
    add('ws', { cluster: 'tank', name: 'Water Sensor (phát hiện rò rỉ)', func: 'Nước chạm các vạch đồng → điện áp chân S tăng → Mega đọc A0 > 300 thì khóa bơm, bật còi.', where: 'Nằm phẳng ở dải trước khay, mặt vạch hướng lên.', dims: [['Board', '62×20×1.6 mm'], ['Vùng dò', '~40×16 mm']], kind: 'nominal', qty: '1 cái', material: 'PCB phủ thiếc', process: 'Phủ keo nến/sơn móng tay phần linh kiện và chân header (không phủ vùng vạch).', fix: 'Dán 2 mẩu băng keo xốp ở đầu header; vùng vạch cách đáy ~1 mm.', cut: 'Không cắt', bom: ['ws'], explode: [0, 45, 70], anchor: [wsPlate.x, wsPlate.y, wsPlate.z + 15] });
    add('tank', { cluster: 'tank', name: 'Bình chứa (đối tượng điều khiển)', func: 'Bể chứa cần giữ mực nước trong khoảng hai ngưỡng; thành trong suốt để quan sát.', where: 'Trong khay hứng, lệch về phía sau.', dims: [['Ø trong', `${p.tankD} mm`], ['Cao trong', `${p.tankH} mm`], ['Thành', `${p.tankWall} mm`], ['Mức 100 %', `${usableH} mm ≈ ${r1(tankUsableL)} L`]], kind: 'measure', qty: '1 bình', material: 'PET / PP trong suốt', process: has.overflow ? `Đục nóng 2 lỗ Ø7.5: xả tâm cao ${drainH} mm, tràn tâm cao ${overflowH} mm (từ đáy trong). Dán thước giấy dọc thân.` : 'Không khoan. Dán thước giấy dọc thân, vạch 0 trùng đáy trong.', fix: 'Đáy bình dán 3 chấm keo nến xuống khay.', cut: has.overflow ? 'Chỉ khoan lỗ' : 'Không gia công', bom: ['tank'], explode: [0, 90, 0], anchor: [tank.x - tankOD / 2, tank.yIn + p.tankH * 0.6, tank.z + tankOD / 2] });
    add('bridge', { cluster: 'sensor', name: 'Giá đỡ HC-SR04', func: 'Giữ HC-SR04 thẳng đứng, đúng tâm bình; có lỗ cho ống cấp nước.', where: 'Gác ngang miệng bình chứa.', dims: [['Dài', `${bridge.l} mm`], ['Rộng', `${bridge.w} mm`], ['Dày', `${bT} mm`], ['Lỗ', '2×Ø16.5 cách 26 + 1×Ø8.5']], kind: 'design', qty: S_ ? '3 miếng mica: M1 ×1, M2 ×2' : '3 miếng: D1 ×1, D2 ×2', material: S_ ? 'Mica trong 3 mm' : fx, process: S_ ? 'Nhờ tiệm cắt laser theo bản vẽ, hoặc khoan mũi khoét Ø16 rồi dũa rộng.' : 'Khoét lỗ Ø16.5 bằng mũi khoét hoặc dao rọc xoay quanh tâm.', fix: 'Không dán chết vào bình: 2 cữ dưới tấm giữ đúng vị trí, nhấc ra được.', cut: `${S_ ? 'M1' : 'D1'} ${bridge.l}×${bridge.w} · ${S_ ? 'M2' : 'D2'} 15×10 ×2`, bom: [S_ ? 'mica' : 'formex'], explode: [0, 0, 0], anchor: [bridge.x + bridge.l / 2, bridge.y + bT, bridge.z] });
    add('hcsr04', { cluster: 'sensor', name: 'Cảm biến siêu âm HC-SR04', func: 'Đo khoảng cách tới mặt nước; Mega suy ra mực nước = S − khoảng cách.', where: `Đầu dò hướng xuống, mặt dò cách đáy trong S = ${r0(S)} mm.`, dims: [['PCB', '45×20 mm'], ['Đầu dò', 'Ø16 × 12 mm'], ['Tâm–tâm', '26 mm'], ['Vùng mù', `${SPEC.hc.deadZone} mm`]], kind: 'nominal', qty: '1 cái', material: 'Module điện tử', process: 'Hàn cáp 4 lõi: VCC, TRIG, ECHO, GND. Bọc co nhiệt. Phủ mỏng keo nến mặt sau PCB chống hơi ẩm.', fix: 'Đầu dò lọt qua 2 lỗ Ø16.5, PCB nằm trên tấm đỡ, 2 chấm keo nến ở mép PCB.', cut: 'Không cắt', bom: ['hcsr04', 'cable4'], explode: [0, 70, 0], anchor: [tank.x, tank.rim + bT + 4, tank.z] });
    add('reservoir', { cluster: 'source', name: S_ ? 'Bình nguồn' : 'Hộp nguồn (bể ngầm)', func: 'Chứa nước nguồn cho bơm; nhận lại nước → chạy tuần hoàn, không tốn nước.', where: 'Bên trái.', dims: [['Lòng hộp', `${p.resL}×${p.resW}×${p.resH} mm`], ['Dung tích', `${r1(p.resL * p.resW * p.resH / 1e6)} L`], ['Hữu dụng', `${r1(resUsableL)} L`]], kind: 'measure', qty: '1 hộp', material: 'Nhựa PP/PET', process: 'Không khoan: ống và dây đi qua miệng hộp.', fix: '4 mẩu băng keo xốp dưới đáy.', cut: 'Không cắt', bom: ['reservoir'], explode: [0, 0, 0], anchor: [res.x - p.resL / 2, p.resH, res.z + p.resW / 2] });
    add('pump', { cluster: 'source', name: 'Bơm chìm mini 5V', func: 'Bơm nước từ bình nguồn lên bình chứa khi relay đóng.', where: 'Đáy bình nguồn, sát vách phải, ngập ≥ 15 mm.', dims: [['Thân', '~45×24×33 mm'], ['Đầu ra', 'Ø7.5 mm'], ['Lưu lượng', `~${r1(qTyp)} L/phút ở cột áp ${r0(headTypM * 100)} cm (ước tính)`]], kind: 'nominal', qty: '1 cái', material: 'Nhựa ABS, motor DC', process: 'Hiệu chuẩn: bơm vào ca đong 30 s, nhân 2 → L/phút thật.', fix: 'Đế hút chân không hoặc 1 chấm keo nến.', cut: 'Không cắt', bom: ['pump', 'diode', 'cable2'], explode: [0, 150, 0], anchor: [pump.x, pump.h, pump.z] });
    add('tubePump', { cluster: 'tubes', name: 'Ống cấp (bơm → bình)', func: 'Dẫn nước bơm lên, qua lỗ Ø8.5 trên giá đỡ, xả vào bình từ trên xuống.', where: 'Từ đầu ra bơm tới miệng bình.', dims: [['Ống', 'ID 6 / OD 8 mm'], ['Dài tuyến', `${tubes.pump.len} mm`], ['Cắt', `${r0(tubes.pump.len * 1.1 + 50)} mm`]], kind: 'design', qty: '1 đoạn', material: 'Silicone thực phẩm', process: 'Cắt vuông góc. Đầu trong bình hướng vào thành để giảm sóng làm nhiễu cảm biến.', fix: 'Dây rút cố định; đầu bơm ép chặt (ngâm nước nóng cho mềm).', cut: `${r0(tubes.pump.len * 1.1 + 50)} mm`, bom: ['tube'], explode: [0, 40, 0], anchor: tubes.pump.pts[2] });
    if (has.drain) {
      add('tubeDrain', { cluster: 'tubes', name: 'Ống xả (bình → hộp nguồn)', func: 'Mô phỏng tiêu thụ nước; chỉnh bằng van.', where: `Lỗ xả cao ${drainH} mm ở thành trái bình, xuyên vách khay.`, dims: [['Ống', 'ID 6 / OD 8 mm'], ['Dài tuyến', `${tubes.drain.len} mm`], ['Cắt', `${r0(tubes.drain.len * 1.1 + 50)} mm`]], kind: 'design', qty: '1 đoạn + 1 van', material: 'Silicone', process: 'Cắt đôi tại vị trí van.', fix: 'Silicone kín tại lỗ bình và lỗ khay.', cut: `${r0(tubes.drain.len * 1.1 + 50)} mm`, bom: ['tube', 'silicone'], explode: [-40, 0, 0], anchor: tubes.drain.pts[2] });
      add('tubeOverflow', { cluster: 'tubes', name: 'Ống tràn an toàn', func: 'Nếu điều khiển hỏng, nước tràn về hộp nguồn thay vì ra bàn.', where: `Lỗ tràn cao ${overflowH} mm ở thành sau bình.`, dims: [['Ống', 'ID 6 / OD 8 mm'], ['Dài tuyến', `${tubes.overflow.len} mm`], ['Cắt', `${r0(tubes.overflow.len * 1.1 + 50)} mm`]], kind: 'design', qty: '1 đoạn', material: 'Silicone', process: 'Đi dốc xuống liên tục, không võng.', fix: 'Silicone tại lỗ bình.', cut: `${r0(tubes.overflow.len * 1.1 + 50)} mm`, bom: ['tube'], explode: [0, 0, -50], anchor: tubes.overflow.pts[2] });
      add('valve', { cluster: 'tubes', name: 'Van xả', func: 'Chỉnh lưu lượng xả để thử thuật toán.', where: 'Giữa ống xả, ngoài mép bục.', dims: [['Ống vừa', 'Ø6 mm']], kind: 'nominal', qty: '1 cái', material: 'Nhựa', process: '—', fix: 'Dây rút vào mép bục.', cut: '—', bom: ['valve'], explode: [-50, 0, 60], anchor: tubes.drain.valveAt });
    }
    add('mega', { cluster: 'elec', name: 'Arduino Mega 2560 R3', func: 'Đọc HC-SR04 và Water Sensor, chạy thuật toán hai ngưỡng, đóng/ngắt relay, hiển thị LCD, gửi dữ liệu qua ESP-01.', where: S_ ? 'Đáy hộp ABS, trên 4 cọc đồng M3.' : 'Trong hộp mica, phía sau vùng mạch.', dims: [['Board', '101.6×53.3 mm'], ['Lỗ bắt', '4 lỗ Ø3.2']], kind: 'nominal', qty: '1 cái', material: 'Module', process: 'Nạp firmware qua USB (rút adapter khi nạp).', fix: S_ ? 'Cọc đồng M3 cao 6 mm.' : 'Đặt trong hộp mica, dán hộp xuống đế.', cut: '—', bom: ['mega', 'standoff'], explode: [0, S_ ? 60 : 80, 0], anchor: megaTop });
    if (!S_) add('megaBox', { cluster: 'elec', name: 'Hộp mica Mega', func: 'Bảo vệ board khỏi nước bắn và chạm chập.', where: 'Phía sau vùng mạch.', dims: [['Hộp', '~115×66×28 mm']], kind: 'nominal', qty: '1 bộ', material: 'Mica', process: 'Khoan 1 lỗ Ø8 cho bó dây.', fix: 'Băng keo xốp 2 mặt.', cut: '—', bom: ['megaBox'], explode: [0, 0, 0], anchor: [E.megaBox.x + 50, SPEC.megaBox.h, E.megaBox.z] });
    add('relay', { cluster: 'elec', name: 'Module 1 Relay 5V', func: 'Công tắc cơ khí đóng/ngắt nguồn 5 V cho bơm theo tín hiệu D6. Dùng tiếp điểm NO → mất điện là bơm tắt.', where: 'Cạnh Mega.', dims: [['PCB', '~50×26 mm'], ['Tiếp điểm', '10 A']], kind: 'nominal', qty: '1 cái', material: 'Module', process: 'Bắt dây vào cầu đấu vít: COM ← +5 V, NO → bơm (+).', fix: 'Băng keo xốp / ốc M3.', cut: '—', bom: ['relay', 'diode'], explode: [40, 60, 0], anchor: [E.relay.x, 20, E.relay.z] });
    add('espKit', { cluster: 'elec', name: 'ESP-01 + nguồn 3,3 V + chuyển mức', func: 'ESP8266 nối Wi-Fi, gửi số liệu tới điện thoại; AMS1117 cấp 3,3 V riêng; module chuyển mức bảo vệ chân RX của ESP.', where: 'Trên test board.', dims: [['ESP-01', '24.8×14.3 mm'], ['Test board', S_ ? '47×35 mm' : '85×55 mm']], kind: 'nominal', qty: '1 bộ', material: 'Module', process: 'Đo 3,3 V ở ngõ ra AMS1117 TRƯỚC khi cắm ESP-01.', fix: 'Keo sẵn ở đáy test board.', cut: '—', bom: ['esp01', 'ams', 'shifter', 'tb', 'res', 'cap', 'jumpFF'], explode: [-30, 80, 20], anchor: [E.tb.x, 20, E.tb.z] });
    add('lcd', { cluster: 'elec', name: 'LCD 1602 + I2C', func: 'Hiển thị tại chỗ mực nước, trạng thái bơm, chế độ, Wi-Fi và cảnh báo — vẫn đọc được khi mất mạng.', where: S_ ? 'Dưới nắp hộp, nhìn qua cửa sổ.' : 'Sau tấm gắn LCD.', dims: [['Module', '80×36 mm'], ['Cửa sổ', `${SPEC.lcd.winL}×${SPEC.lcd.winW} mm`], ['Dày (kèm I2C)', '~22 mm']], kind: 'nominal', qty: '1 bộ', material: 'Module', process: 'Hàn module I2C vào 16 chân LCD; chỉnh biến trở tương phản.', fix: '4 ốc M3 + cọc đồng.', cut: '—', bom: ['lcd', 'i2c'], explode: S_ ? [0, 150, 0] : [0, 40, 90], anchor: [E.lcd.x, E.lcd.y, E.lcd.z] });
    add('buzzer', { cluster: 'elec', name: 'Còi buzzer 5V', func: 'Kêu khi rò rỉ, cảm biến lỗi, bơm quá thời gian.', where: 'Cạnh relay.', dims: [['PCB', '~33×13 mm']], kind: 'nominal', qty: '1 cái', material: 'Module', process: '—', fix: 'Băng keo xốp.', cut: '—', bom: ['buzzer'], explode: [50, 65, 0], anchor: [E.buzz.x, 16, E.buzz.z] });
    add('power', { cluster: 'elec', name: 'Nguồn 5V: jack DC + domino', func: 'Nhận 5 V–3 A từ adapter, chia cho Mega, relay, bơm, LCD, AMS1117.', where: S_ ? 'Đầu hộp, sát lỗ dây adapter.' : 'Góc trước vùng mạch.', dims: [['Jack', '5.5×2.1 mm'], ['Domino', '2P ×3']], kind: 'nominal', qty: '1 bộ', material: '—', process: 'Đo cực bằng đồng hồ trước khi nối Mega. Tụ 470 µF ngay tại domino.', fix: 'Keo nến.', cut: '—', bom: ['jackDC', 'adapter', 'domino', 'cap'], explode: [55, 20, 50], anchor: [E.jack.x, 10, E.jack.z] });
    if (S_) {
      add('ctrlBox', { cluster: 'elec', name: 'Hộp mạch ABS', func: 'Chứa toàn bộ mạch, tách xa nước.', where: 'Bên phải khay.', dims: [['Ngoài', `${ctl.L}×${ctl.W}×${ctl.H} mm`], ['Thành', `${ctl.wall} mm`]], kind: 'nominal', qty: '1 hộp', material: 'Nhựa ABS', process: 'Khoan lỗ theo bảng gia công H2–H4.', fix: 'Đặt trên bàn.', cut: 'H2, H3, H4', bom: ['absBox'], explode: [0, 0, 0], anchor: [ctl.x + ctl.W / 2, ctl.H * 0.6, ctl.z + ctl.L / 2] });
      add('ctrlLid', { cluster: 'elec', name: 'Nắp hộp (cửa sổ LCD)', func: 'Nắp có cửa sổ để nhìn LCD.', where: 'Trên hộp ABS.', dims: [['Cửa sổ', `${SPEC.lcd.winL}×${SPEC.lcd.winW} mm`]], kind: 'design', qty: '1', material: 'Nhựa ABS', process: 'Gia công H1.', fix: '4 vít nắp có sẵn.', cut: `H1 ${SPEC.lcd.winL}×${SPEC.lcd.winW}`, bom: ['absBox'], explode: [0, 120, 0], anchor: [ctl.x, ctl.H, ctl.z - ctl.L / 2 + 20] });
    }
    add('wires', { cluster: 'elec', name: 'Dây tín hiệu & nguồn', func: 'Nối cảm biến, bơm về mạch.', where: S_ ? 'Cáp đi trên mặt bàn, vào hộp qua lỗ H2; lõi đi theo kênh sát đáy hộp.' : 'Cáp xuống dọc vách chắn; lõi và dây nối đi theo kênh trên mặt đế, bó bằng dây rút.', dims: [['HC-SR04', `${wires.hc.len} mm`], ['Water Sensor', `${wires.ws.len} mm`], ['Bơm', `${wires.pumpW.len} mm`]], kind: 'design', qty: '3 tuyến', material: 'Cáp đồng bọc PVC', process: 'Hàn nối với dây testboard, bọc co nhiệt.', fix: 'Bó theo kênh, dây rút mỗi ~40 mm; cáp ngoài dây rút mỗi 80–100 mm.', cut: `Cáp 4 lõi ${r1(cable4M)} m · dây đôi ${r1(cable2M)} m`, bom: ['cable4', 'cable2', 'jumpMF', 'jumpMM', 'heatshrink', 'ties'], explode: [0, 0, 0], anchor: wires.hc.pts[2] });
    for (const id in parts) {
      const pt = parts[id];
      pt.id = id; pt.dimText = pt.dims.map(([k, val]) => `${k} ${val}`).join(' · ');
      const shared = new Set(['formex', 'silicone', 'glue', 'tube', 'ties', 'mica', 'absBox', 'standoff', 'cable4', 'cable2', 'diode', 'cap']);
      pt.price = pt.bom.reduce((s, b) => { const it = bom.find((x) => x.id === b); return s + (it && !shared.has(b) ? it.total : 0); }, 0);
      const src = pt.bom.map((b) => bom.find((x) => x.id === b)).filter(Boolean)[0];
      pt.where2 = src ? src.where : ''; pt.url = src && src.url;
    }

    // ---- Các bước lắp ráp (dùng chung cho hoạt ảnh 3D và hướng dẫn) ----
    const elecParts = ['mega', ...(S_ ? [] : ['megaBox']), 'relay', 'espKit', 'buzzer', 'power'];
    const steps = S_ ? [
      { title: 'Gia công vật liệu', parts: ['tray'], text: [`Cắt 5 miếng Formex ${T} mm cho khay: đáy ${r0(tray.outX)}×${r0(tray.outZ)}, vách ${tray.wallH} mm.`, 'Dán vách lên đáy, trét silicone kín mép trong, chờ khô và thử nước 30 phút.', 'Nhờ tiệm quảng cáo cắt mica 3 mm: thanh M1 và 2 cữ M2 theo bản vẽ.'] },
      { title: 'Water Sensor vào khay', parts: ['ws'], text: ['Phủ keo nến phần linh kiện của Water Sensor, chừa vùng vạch đồng.', 'Đặt phẳng ở dải trước khay, vạch hướng lên, cách đáy ~1 mm.'] },
      { title: 'Đặt bình chứa', parts: ['tank'], text: ['Dán thước giấy dọc thân bình, vạch 0 trùng đáy trong.', 'Đặt bình lệch về sau trong khay, chấm 3 điểm keo nến.'] },
      { title: 'Bình nguồn & bơm', parts: ['reservoir', 'pump'], text: ['Đặt bình nguồn bên trái khay, cách 40 mm.', 'Đặt bơm sát vách phải, châm nước ngập thân bơm ≥ 15 mm.'] },
      { title: 'Ống cấp nước', parts: ['tubePump'], text: [`Cắt ống silicone ${r0(tubes.pump.len * 1.1 + 50)} mm, ép vào đầu ra bơm.`, 'Đầu còn lại luồn qua lỗ Ø8.5 trên thanh M1, thò xuống miệng bình 15 mm — luôn cao hơn mức nước tối đa để không xi-phông ngược.'] },
      { title: 'Thanh đỡ & HC-SR04', parts: ['bridge', 'hcsr04'], text: ['Dán 2 cữ M2 dưới M1, sát ngoài miệng bình.', `Lắp HC-SR04 qua 2 lỗ Ø16.5. Mặt đầu dò cách đáy trong S = ${r0(S)} mm — ghi số này vào firmware.`] },
      { title: 'Gia công hộp mạch', parts: ['ctrlBox', 'ctrlLid'], text: ['Khoét cửa sổ LCD 72×25 trên nắp (H1), khoan 3 lỗ Ø8 vách trái (H2), 1 lỗ Ø8 vách đầu (H3), 4 lỗ Ø3 đáy (H4).'] },
      { title: 'Lắp mạch trong hộp', parts: elecParts, text: ['Bắt Mega lên 4 cọc đồng. Dán relay, test board (AMS1117 + chuyển mức + ESP-01), còi, jack DC + domino.', 'Đo ngõ ra AMS1117 phải 3,2–3,4 V trước khi cắm ESP-01.'] },
      { title: 'LCD & đấu dây', parts: ['lcd', 'wires'], text: ['Bắt LCD + I2C dưới nắp bằng 4 ốc M3.', 'Đấu dây theo sơ đồ đấu nối thực tế; luồn cáp qua lỗ H2, thắt nút chống giật.', 'Đi dây theo kênh (Hồ sơ › Điện & nối dây › Đi dây gọn): kẻ tim kênh, dây nguồn đỏ/đen trước, tín hiệu sau, dây rút mỗi ~40 mm.', 'Diode 1N4007 song song bơm (vạch về +). Kiểm tra không chạm 5 V–GND.'] },
      { title: 'Nạp code, châm nước, chạy thử', parts: [], text: ['Nạp firmware Mega (rút adapter khi cắm USB) và firmware ESP-01 bằng mạch nạp USB.', 'Đổ nước tới vạch 50 mm, so số trên LCD với thước giấy; chỉnh S nếu lệch > 3 mm.', 'Thử từng sự cố như trong phòng thí nghiệm ảo.'] },
    ] : [
      { title: 'Cắt vật liệu & làm đế', parts: ['base'], text: [`Cắt ${pieces.reduce((s, pc) => s + pc.qty, 0)} miếng Formex ${T} mm theo sơ đồ (mạch dao 3 mm).`, `Đế A: ${r0(base.L)} × ${r0(base.W)} mm, dán 4 chân cao su.`, 'Kẻ vạch vị trí hộp nguồn, bục và vùng mạch theo hình chiếu bằng.'] },
      { title: 'Dựng bục đỡ', parts: ['platform'], text: [`Dán 2 vách B2 và vách sau B3 (cao ${r0(p.platformH - T)} mm) lên mặt bục B1 → hộp chữ U.`, `Đặt bục cách hộp nguồn ${gapRP} mm; kiểm tra mặt bục phẳng.`] },
      { title: 'Khay hứng & Water Sensor', parts: ['tray', 'ws'], text: [`Khoan lỗ Ø8.5 trên vách trái C2, tâm cao ${r0(p.tankWall + drainH)} mm.`, 'Dán vách, trét silicone, thử nước 30 phút.', 'Đặt Water Sensor ở dải trước khay, vạch hướng lên.'] },
      { title: 'Gia công & đặt bình chứa', parts: ['tank'], text: [`Đục lỗ Ø7.5: xả tâm cao ${drainH} mm (thành trái), tràn tâm cao ${overflowH} mm (thành sau).`, 'Dán thước giấy dọc thân, đặt bình lệch về sau trong khay.'] },
      { title: 'Hộp nguồn & bơm', parts: ['reservoir', 'pump'], text: ['Đặt hộp nguồn bên trái, bơm sát vách phải, châm nước ngập thân bơm ≥ 15 mm.'] },
      { title: 'Đi ống & van', parts: ['tubePump', 'tubeDrain', 'valve', 'tubeOverflow'], text: [`Ống cấp ${r0(tubes.pump.len * 1.1 + 50)} mm, ống xả ${r0(tubes.drain.len * 1.1 + 50)} mm (qua van), ống tràn ${r0(tubes.overflow.len * 1.1 + 50)} mm dốc xuống liên tục.`, 'Trét silicone các lỗ xuyên thành; chờ 24 h rồi mới thử nước đầy.'] },
      { title: 'Giá đỡ & HC-SR04', parts: ['bridge', 'hcsr04'], text: [`Khoét 2 lỗ Ø16.5 cách tâm 26 mm và lỗ Ø8.5 trên D1 ${bridge.l}×${bridge.w} mm; dán 2 cữ D2.`, `Lắp HC-SR04: S = ${r0(S)} mm — ghi vào firmware.`] },
      { title: 'Vách chắn, tấm LCD & mạch', parts: ['splash', 'lcdPanel', ...elecParts], text: ['Dán vách chắn E và tấm gắn LCD E2.', 'Đặt Mega trong hộp mica, relay, test board (AMS1117 + chuyển mức + ESP-01), còi, jack DC + domino.', 'Đo ngõ ra AMS1117 phải 3,2–3,4 V trước khi cắm ESP-01.'] },
      { title: 'LCD & đấu dây', parts: ['lcd', 'wires'], text: ['Bắt LCD + I2C sau tấm E2.', 'Đấu dây theo sơ đồ đấu nối thực tế; diode 1N4007 song song bơm.', 'Đi dây theo kênh (Hồ sơ › Điện & nối dây › Đi dây gọn): kẻ tim kênh trên đế, dây nguồn đỏ/đen trước, tín hiệu sau, dây rút mỗi ~40 mm.', 'Kiểm tra thông mạch, không chạm 5 V–GND trước khi cấp điện.'] },
      { title: 'Nạp code, châm nước, chạy thử', parts: [], text: ['Nạp firmware Mega (rút adapter khi cắm USB) và ESP-01.', 'Đổ nước tới vạch 50 mm, so LCD với thước giấy; chỉnh S nếu lệch > 3 mm.', 'Thử từng sự cố như trong phòng thí nghiệm ảo.'] },
    ];

    // ---- Kích thước hiển thị trên 3D ----
    const dims3d = [];
    if (!S_) {
      const xEdge = plat.x - plat.X / 2;
      dims3d.push(
        { a: [x0, -T, base.W / 2], b: [x0 + base.L, -T, base.W / 2], off: [0, -22, 22], label: `${r0(base.L)} mm` },
        { a: [x0 + base.L, -T, base.W / 2], b: [x0 + base.L, -T, -base.W / 2], off: [26, -22, 0], label: `${r0(base.W)} mm` },
        { a: [xEdge, 0, plat.Z / 2], b: [xEdge, p.platformH, plat.Z / 2], off: [0, 0, 26], label: `bục ${p.platformH}` });
    } else {
      dims3d.push({ a: [tray.x - tray.outX / 2, 0, tray.outZ / 2], b: [tray.x + tray.outX / 2, 0, tray.outZ / 2], off: [0, 0, 26], label: `khay ${r0(tray.outX)}` },
        { a: [ctl.x - ctl.W / 2, 0, ctl.L / 2], b: [ctl.x + ctl.W / 2, 0, ctl.L / 2], off: [0, 0, 22], label: `hộp ${ctl.W}×${ctl.L}` });
    }
    dims3d.push(
      { a: [tank.x + tankOD / 2, tank.yIn, tank.z], b: [tank.x + tankOD / 2, tank.rim, tank.z], off: [34, 0, 0], label: `H ${p.tankH}` },
      { a: [tank.x - p.tankD / 2, tank.yIn + 30, tank.z + tankOD / 2 + 4], b: [tank.x + p.tankD / 2, tank.yIn + 30, tank.z + tankOD / 2 + 4], off: [0, 0, 0], label: `Ø${p.tankD}` },
      { a: [tank.x - tankOD / 2, tank.yIn, tank.z], b: [tank.x - tankOD / 2, faceY, tank.z], off: [-34, 0, 0], label: `S ${r0(S)}` },
      { a: [res.x - p.resL / 2, p.resH, res.z + p.resW / 2], b: [res.x + p.resL / 2, p.resH, res.z + p.resW / 2], off: [0, 18, 10], label: `${p.resL}` },
      { a: [res.x - p.resL / 2, 0, res.z + p.resW / 2], b: [res.x - p.resL / 2, p.resH, res.z + p.resW / 2], off: [-22, 0, 10], label: `${p.resH}` });

    // ---- Chỉ số so sánh hai phương án ----
    const footX = S_ ? (p.resL + 40 + tray.outX + 40 + SPEC.abs.w) : base.L;
    const footZ = S_ ? Math.max(p.resW, tray.outZ, SPEC.abs.l) : base.W;
    const heightMax = Math.max(tubes.pump.pts[2][1], tubes.pump.pts[3][1], tank.rim + bT + 2) + 4;
    const holes = (has.drain ? 2 + 1 : 0) + 3 + (S_ ? 3 + 1 + 4 + 4 : 1 + 4);
    const pieceCount = pieces.reduce((s, pc) => s + pc.qty, 0) + micaPieces.reduce((s, pc) => s + pc.qty, 0);
    const cutMm = pieces.reduce((s, pc) => s + 2 * (pc.w + pc.h) * pc.qty, 0) + micaPieces.reduce((s, pc) => s + 2 * (pc.w + pc.h) * pc.qty, 0);
    const joints = tubeKeys.length * 2 + (has.valve ? 2 : 0);
    const hours = r1(1 + pieceCount * 0.2 + holes * 0.1 + joints * 0.15 + 2.5);
    const metrics = { footX: r0(footX), footZ: r0(footZ), height: r0(heightMax), pieces: pieceCount, holes, cutM: r1(cutMm / 1000), tubeM: tubeBuyM, joints, steps: steps.length, hours, parts: Object.keys(parts).length };

    return {
      variant: v, variantName: VARIANTS[v], has, p, SPEC, T, m, KIND, CLUSTERS,
      base, res, plat, tray, tank, bridge, S, faceY, overflowH, drainH, usableH, pump, splash, ctl, E, wsPlate,
      tubes, tubeBuyM, wires, cable4M, cable2M, pieces, micaPieces, boxMods, sheets, formexArea, bom, parts, steps, dims3d, warnings,
      pins: PINS, power: POWER, peak5, typ5, metrics,
      vol: { tankUsableL, resUsableL, resTotalL: p.resL * p.resW * p.resH / 1e6 },
      sim: { tankArea, resArea, trayArea: tray.inX * tray.inZ - Math.PI * (tankOD / 2) ** 2, trayWallH: tray.wallH, usableH, S, overflowH, drainH, tankH: p.tankH, hasOverflow: has.overflow, hasDrain: has.drain,
        inletY, tankInnerY: tank.yIn, qMax: SPEC.pump.qMax, hMax: SPEC.pump.hMax, minSub: SPEC.pump.minSubmerge, resH: p.resH, qTyp,
        maxRun: Math.round(1.5 * tankUsableL / qTyp * 60 + 30) },
    };
  }

  const fmtVND = (n) => Math.round(n).toLocaleString('vi-VN') + ' đ';
  const Design = { SPEC, PARAMS, VARIANTS, CLUSTERS, KIND, PINS, POWER, compute, sanitize, pack, polyLen, fmtVND, defaults: () => Object.fromEntries(PARAMS.map((d) => [d.key, d.def])) };
  root.Design = Design;
  if (typeof module !== 'undefined') module.exports = Design;
})(typeof window !== 'undefined' ? window : globalThis);
