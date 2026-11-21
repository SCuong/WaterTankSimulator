// Chạy: node tests/selftest.js — kiểm tra nhất quán kích thước và thuật toán an toàn.
const assert = require('assert');
const Design = require('../js/design.js');
const Sim = require('../js/sim.js');

let seed = 7; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const run = (s, sec) => { for (let i = 0; i < sec * 10; i++) s.step(0.1); };

// 1. Thiết kế mặc định hợp lệ và nhất quán
for (const v of ['detailed', 'simple']) {
  const mv = Design.compute(Design.defaults(), v);
  assert.strictEqual(mv.variant, v);
  assert(mv.S >= mv.usableH + 30, 'mặt cảm biến cách mức 100 % ≥ vùng mù');
  assert(mv.usableH < mv.p.tankH, 'mức 100 % dưới miệng bình');
  assert(mv.tubes.pump.pts[4][1] - mv.tank.yIn > mv.usableH, 'đầu ống cấp cao hơn mức tối đa (không xi-phông)');
  for (const st of mv.steps) for (const id of st.parts) assert(mv.parts[id], v + ': bước lắp tham chiếu bộ phận có thật: ' + id);
  for (const id in mv.parts) for (const b of mv.parts[id].bom) assert(mv.bom.find((x) => x.id === b), v + ': BOM có ' + b);
  assert(!mv.bom.some((b) => /ESP32|MOSFET|IRF/i.test(b.name)), 'không còn linh kiện cũ');
  assert(mv.peak5 < 3, 'adapter 5V 3A đủ dòng đỉnh');
  assert(mv.bom.filter((b) => b.where === 'Điện tử Spider').length >= 15, 'giá Spider');
}
const ms = Design.compute(Design.defaults(), 'simple');
assert(ms.metrics.pieces < Design.compute(Design.defaults(), 'detailed').metrics.pieces, 'bản đơn giản ít miếng cắt hơn');
assert(!ms.parts.platform && !ms.parts.tubeDrain && ms.parts.ctrlBox, 'bản đơn giản đúng cấu trúc');
const m = Design.compute(Design.defaults());
assert(m.S > m.overflowH + 29, 'mặt cảm biến phải cách lỗ tràn ≥ vùng mù');
assert(m.overflowH < m.p.tankH, 'lỗ tràn dưới miệng bình');
assert(m.tank.yIn + m.drainH > m.p.resH + 30, 'xả tự chảy về');
assert(m.pieces.every((pc) => pc.w > 0 && pc.h > 0 && pc.qty > 0));
assert.strictEqual(m.sheets.reduce((n, sh) => n + sh.pieces.length, 0), m.pieces.reduce((n, pc) => n + pc.qty, 0), 'mọi miếng đều được xếp');
for (const sh of m.sheets) for (const a of sh.pieces) {
  assert(a.x + a.w <= sh.w && a.y + a.h <= sh.h, 'miếng nằm trong tấm');
  for (const b of sh.pieces) if (a !== b) assert(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, 'không chồng lấn');
}
assert(m.bom.every((b) => b.total >= 0 && b.qty > 0));
assert.strictEqual(m.warnings.filter((w) => w.lvl === 'danger').length, 0, 'mặc định không có cảnh báo nghiêm trọng');

// 2. Đổi chiều cao bình → các chi tiết phụ thuộc cập nhật theo
const m2 = Design.compute({ ...Design.defaults(), tankH: 250 });
assert.strictEqual(m2.overflowH - m.overflowH, 50);
assert(m2.tubes.pump.len > m.tubes.pump.len && m2.tubes.overflow.len > m.tubes.overflow.len);
assert(Design.compute({ ...Design.defaults(), platformH: 100, resH: 150 }).warnings.some((w) => w.lvl === 'danger'), 'bục thấp phải cảnh báo');
assert.strictEqual(Design.sanitize({ tankD: 9999 }).tankD, 200, 'kẹp giá trị nhập');

// 2b. Relay nghỉ tối thiểu; LCD; bản đơn giản tràn miệng → khay → khóa
{ const s = Sim.create(m, { rng }); s.lab.valve(1); run(s, 400);
  const ons = s.events.filter((e) => /^Bật bơm/.test(e.msg)).map((e) => e.t), offs = s.events.filter((e) => /^Tắt bơm/.test(e.msg)).map((e) => e.t);
  for (const t of ons) { const prev = offs.filter((o) => o < t).pop(); if (prev != null) assert(t - prev >= Sim.RELAY_MIN_OFF - 0.11, 'relay nghỉ ≥ 5 s'); }
  assert(s.dev.relayCycles >= 2); const L = s.lcd(); assert(L.length === 2 && L.every((x) => x.length === 16 && /^[ -~]+$/.test(x)), 'LCD 16×2 ASCII'); }
{ const s = Sim.create(ms, { rng }); run(s, 3); s.cmd('mode', 'manual'); s.lab.fault('sensor', 'stuck'); s.cmd('pump', true); s.level = ms.sim.tankH - 2; run(s, 20);
  assert(s.dev.lock && ['LEAK', 'DRY'].includes(s.dev.lock.code) && !s.dev.pump, 'tràn miệng/treo cảm biến → khóa: ' + JSON.stringify(s.dev.lock)); assert(s.buzzer() === 'alarm'); }

// 3. Tự động: giữ mức trong vùng ngưỡng, bảo toàn nước
let s = Sim.create(m, { rng });
s.lab.valve(0.5);
run(s, 900);
const tail = s.history.slice(-600).map((h) => h.truth);
assert(Math.min(...tail) > s.dev.low - 6 && Math.max(...tail) < s.dev.high + 6, `mức dao động ngoài ngưỡng: ${Math.min(...tail)}–${Math.max(...tail)}`);
assert(s.history.slice(-600).some((h) => h.pump) && s.history.slice(-600).some((h) => !h.pump), 'bơm phải đóng/ngắt chu kỳ');
assert(Math.abs(s.totalL() - s.base - s.added) < 1e-6, 'bảo toàn nước');
assert(!s.dev.lock, 'không khóa khi bình thường: ' + JSON.stringify(s.dev.lock));

// 4. Rò rỉ → khóa và tắt bơm
s = Sim.create(m, { rng }); s.lab.fault('leak', true); run(s, 120);
assert(s.dev.lock && s.dev.lock.code === 'LEAK' && !s.dev.pump);
s.lab.fault('leak', false); s.lab.dryTray(); s.cmd('reset'); run(s, 2); assert(!s.dev.lock, 'mở khóa sau khi lau khô');

// 5. Cảm biến mất tín hiệu → khóa trong ~1 s
s = Sim.create(m, { rng }); run(s, 5); s.lab.fault('sensor', 'timeout'); run(s, 1.5);
assert(s.dev.lock && s.dev.lock.code === 'SENSOR' && !s.dev.pump);

// 6. Nhiễu xung 25 % → bộ lọc giữ sai số nhỏ, không khóa
s = Sim.create(m, { rng }); s.lab.fault('sensor', 'noise'); run(s, 60);
assert(!s.dev.lock && Math.abs(s.dev.levelMm - s.level) < 10, 'lọc nhiễu');

// 7. Nguồn cạn → phát hiện chạy khô
s = Sim.create(m, { rng }); s.lab.emptySource(); s.level = 10; run(s, 40);
assert(s.dev.lock && s.dev.lock.code === 'DRY', 'chạy khô: ' + JSON.stringify(s.dev.lock));

// 8. Mất Wi-Fi ở thủ công → lệnh bị chặn, tự về tự động
s = Sim.create(m, { rng }); run(s, 3); s.cmd('mode', 'manual'); s.lab.fault('wifi', true);
assert(!s.cmd('pump', true).ok); run(s, 20); assert.strictEqual(s.dev.mode, 'auto');

// 9. Thủ công không vượt giới hạn cứng; mất điện → bơm tắt, khởi động lại ở tự động
s = Sim.create(m, { rng }); run(s, 3); s.cmd('mode', 'manual'); s.cmd('pump', true); run(s, 200);
assert(s.history.every((h) => h.truth < Sim.HARD_MAX + 3), 'vượt giới hạn cứng');
s.lab.fault('power', true); run(s, 2); assert(!s.dev.pump && s.q.pump === 0);
s.lab.fault('power', false); assert.strictEqual(s.dev.mode, 'auto');
assert(!s.cmd('thresholds', 50, 55).ok, 'ngưỡng sát nhau bị từ chối');

console.log('OK — mọi kiểm tra đạt. Chi tiết: đế', Math.round(m.base.L), '×', Math.round(m.base.W), 'mm; S =', m.S, 'mm; tràn', m.overflowH, 'mm; ống mua', m.tubeBuyM, 'm; tấm Formex', m.sheets.length,
  '; tổng BOM', Design.fmtVND(m.bom.filter((b) => !b.have).reduce((a, b) => a + b.total, 0)),
  '| Đơn giản:', ms.metrics.footX + '×' + ms.metrics.footZ, 'mm,', ms.metrics.pieces, 'miếng, BOM', Design.fmtVND(ms.bom.filter((b) => !b.have).reduce((a, b) => a + b.total, 0)));

// 10. Bơm yếu → quá thời gian chạy bơm → khóa TIMEOUT (cả hai phương án)
for (const v of ['detailed', 'simple']) {
  const mv = Design.compute(Design.defaults(), v), s = Sim.create(mv, { rng });
  s.level = 0.2 * mv.sim.usableH; s.lab.fault('weak', true); run(s, mv.sim.maxRun + 60);
  assert(s.dev.lock && s.dev.lock.code === 'TIMEOUT' && !s.dev.pump, v + ' quá giờ: ' + JSON.stringify(s.dev.lock));
}
console.log('OK — bơm yếu kích hoạt khóa quá thời gian ở cả hai phương án.');

// 11. Hộp nguồn đầy: nước xả về tràn ra bàn (không vượt thành hộp), châm thêm không bao giờ rút nước
for (const mv of [m, ms]) {
  const s = Sim.create(mv, { rng }); run(s, 3);
  for (let i = 0; i < 40; i++) s.lab.addWater(0.5);
  s.lab.valve(1); s.lab.fault('power', true); run(s, 1200);
  assert(s.res <= mv.sim.resH + 1e-9, 'nước không cao hơn thành hộp nguồn: ' + s.res);
  assert(s.events.some((e) => /tràn ra bàn/.test(e.msg)), 'báo tràn hộp nguồn');
  const r0 = s.res; s.lab.addWater(0.5);
  assert(s.res >= r0 && !/Châm -/.test(s.events.at(-1).msg), 'châm không ra số âm');
  assert(Math.abs(s.totalL() - s.base - s.added) < 1e-6, 'bảo toàn nước khi tràn hộp nguồn');
}

// 12. Đổi thông số khi đang khóa: khóa, chế độ thủ công giữ nguyên; bơm đang chạy không bị khóa chạy khô nhầm
{ const s = Sim.create(m, { rng }); s.lab.emptySource(); s.level = 10; run(s, 40);
  assert.strictEqual(s.dev.lock && s.dev.lock.code, 'DRY');
  s.rebind(Design.compute({ ...Design.defaults(), tankH: 210 })); run(s, 2);
  assert(s.dev.lock && s.dev.lock.code === 'DRY' && !s.dev.pump, 'đổi thông số không được xóa khóa an toàn');
  const s2 = Sim.create(m, { rng }); run(s2, 3); s2.cmd('mode', 'manual'); s2.cmd('pump', true); run(s2, 10);
  s2.rebind(Design.compute({ ...Design.defaults(), tankH: 160 })); run(s2, 25);
  assert(s2.dev.mode === 'manual' && s2.dev.pump && !s2.dev.lock, 'đổi thông số giữ thủ công, không khóa nhầm: ' + JSON.stringify(s2.dev.lock)); }

// 13. RESET ngay sau khi tắt bơm: relay vẫn nghỉ đủ 5 s
{ const s = Sim.create(m, { rng }); run(s, 3); s.level = 0.2 * m.sim.usableH; run(s, 2); assert(s.dev.pump);
  s.cmd('mode', 'manual'); s.cmd('pump', false); run(s, 0.2); const tOff = s.dev.pumpOffAt; s.lab.reset(); run(s, 10);
  const on = s.events.find((e) => e.t > tOff && /^Bật bơm/.test(e.msg));
  assert(on && on.t - tOff >= Sim.RELAY_MIN_OFF - 0.11, 'relay nghỉ ≥ 5 s sau RESET: ' + (on && on.t - tOff)); }

// 14. Nhiễu 25 % chạy lâu, nhiều seed: không bao giờ khóa nhầm "không có tiếng vọng"
for (let sd = 1; sd <= 8; sd++) {
  let x = sd * 7919; const r2 = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  const s = Sim.create(m, { rng: r2 }); s.lab.fault('sensor', 'noise'); run(s, 600);
  assert(!s.dev.lock, `nhiễu seed ${sd} khóa nhầm: ` + JSON.stringify(s.dev.lock));
}
console.log('OK — hộp nguồn tràn, đổi thông số khi khóa, relay sau RESET, nhiễu dài hạn.');
