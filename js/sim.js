/* Mô phỏng vật lý nước + firmware Arduino Mega 2560 (cùng logic sẽ nạp vào mạch thật); ESP-01 chỉ là cầu Wi-Fi.
   Một đối tượng trạng thái duy nhất → 3D, điện thoại, bảng thí nghiệm cùng đọc từ đây. */
(function (root) {
  'use strict';

  const C_SOUND = 0.343;  // mm/µs (≈ 20–25 °C)
  const HARD_MAX = 97;    // % — giới hạn cứng, kể cả chế độ thủ công
  const DRY_WINDOW = 20, DRY_MIN_RISE = 2; // s, mm — đủ dài để bơm yếu (tắc một phần) không bị nhầm là chạy khô
  const RELAY_MIN_OFF = 5;  // s — nghỉ tối thiểu giữa 2 lần đóng relay (bảo vệ tiếp điểm, chống đóng cắt liên tục)
  const WS_WET = 300;       // ngưỡng ADC Water Sensor
  const LOCKS = {
    LEAK: 'Rò rỉ: có nước trong khay hứng',
    SENSOR: 'Cảm biến HC-SR04 lỗi',
    DRY: 'Bơm chạy nhưng mực nước không tăng',
    TIMEOUT: 'Bơm chạy quá thời gian cho phép',
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
  const fmtClock = (t) => { const x = Math.floor(8 * 3600 + t); return [x / 3600 % 24, x / 60 % 60, x % 60].map((n) => String(Math.floor(n)).padStart(2, '0')).join(':'); };

  function newDev(prev) {
    return {
      mode: 'auto', pump: false, manualCmd: false, low: prev ? prev.low : 30, high: prev ? prev.high : 85, // ngưỡng lưu NVS
      lock: null, booting: 1.5, buf: [], filt: null, raw: null, echoUs: null, levelMm: null, pct: null,
      invalid: 0, spikes: 0, badHist: [], pumpOnAt: null, pumpOffAt: -1e9, riseLog: [], wifiLostAt: null, leakWet: false, flowLog: [], rate: 0, pings: 0,
      wsAdc: 0, relayCycles: prev ? prev.relayCycles : 0, holdOff: 0,
    };
  }

  function create(model, opts) {
    const rng = (opts && opts.rng) || Math.random;
    const gauss = () => { let u = 0; while (!u) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };
    const s = {
      k: model.sim, t: 0, level: 0, res: 0, tray: 0, valve: 0, added: 0, stuckVal: null,
      faults: { leak: false, sensor: 'ok', wifi: false, power: false, weak: false },
      q: { pump: 0, drain: 0, leak: 0, overflow: 0, spill: 0 },
      dev: newDev(), events: [], history: [], acc: { ctrl: 0, ping: 0, hist: 0 },
    };
    s.level = 0.4 * s.k.usableH;
    s.res = Math.min(s.k.resH - 25, 85);

    const ev = (lvl, msg, src) => { s.events.push({ t: s.t, lvl, msg, src: src || 'dev' }); if (s.events.length > 200) s.events.shift(); };
    const connected = () => !s.faults.wifi && !s.faults.power;
    const totalL = () => (s.level * s.k.tankArea + s.res * s.k.resArea) / 1e6 + s.tray / 1000;

    function setPump(on, why) {
      const d = s.dev;
      if (on === d.pump) return;
      d.pump = on;
      if (on) { d.pumpOnAt = s.t; d.riseLog = []; d.relayCycles++; } else d.pumpOffAt = s.t;
      ev('info', `${on ? 'Bật' : 'Tắt'} bơm — ${why} (mức ${d.pct == null ? '—' : d.pct.toFixed(0) + ' %'})`);
    }
    function lock(code, detail) {
      const d = s.dev;
      if (d.lock) return;
      d.lock = { code, msg: LOCKS[code], detail, t: s.t };
      d.manualCmd = false;
      setPump(false, 'khóa an toàn');
      ev('danger', `${LOCKS[code]}. ${detail}`);
    }

    // Đọc HC-SR04 mỗi 200 ms: lọc trung vị 5 mẫu + loại xung nhảy > 40 mm.
    function ping() {
      const d = s.dev, k = s.k;
      d.pings++;
      let raw;
      if (s.faults.sensor === 'timeout') raw = null;
      else if (s.faults.sensor === 'stuck') raw = s.stuckVal;
      else {
        raw = k.S - s.level + gauss() * (s.q.pump > 0 ? 3 : 1.2);
        if (s.faults.sensor === 'noise' && rng() < 0.25) raw = 25 + rng() * 400;
      }
      if (raw != null) { d.echoUs = Math.round(raw * 2 / C_SOUND); raw = d.echoUs * C_SOUND / 2; } else d.echoUs = 0;
      d.raw = raw;
      const inRange = raw != null && raw >= 20 && raw <= k.S + 20;
      let ok = inRange;
      if (ok && d.filt != null && Math.abs(raw - d.filt) > 40) { d.spikes++; ok = d.spikes >= 4; if (ok) d.buf = []; }
      if (ok) {
        d.spikes = 0; d.invalid = 0;
        d.buf.push(raw); if (d.buf.length > 5) d.buf.shift();
        d.filt = median(d.buf);
        d.levelMm = clamp(k.S - d.filt, 0, k.tankH);
        d.pct = d.levelMm / k.usableH * 100;
      } else if (!inRange) d.invalid++;
      d.badHist.push(ok ? 0 : 1); if (d.badHist.length > 25) d.badHist.shift();
      const bad = d.badHist.reduce((a, b) => a + b, 0);
      if (d.invalid >= 5) lock('SENSOR', 'Không nhận được tiếng vọng 5 lần liên tiếp (đứt dây ECHO/TRIG?).');
      else if (d.badHist.length >= 25 && bad / 25 > 0.6) lock('SENSOR', 'Nhiễu nặng: hơn 60 % số đo bị loại.');
    }

    function ctrl(dt) {
      const d = s.dev, k = s.k;
      if (d.booting > 0) { d.booting -= dt; d.pump = false; return; }
      const depth = s.tray * 1000 / k.trayArea; // mm nước trong khay
      d.wsAdc = depth < 0.05 ? Math.round(8 + rng() * 10) : Math.round(Math.min(720, 280 + depth * 180 + rng() * 6));
      const wet = d.wsAdc > WS_WET;
      if (wet && !d.leakWet) ev('warn', `Water Sensor phát hiện nước trong khay (A0 = ${d.wsAdc}).`);
      d.leakWet = wet;
      if (wet) lock('LEAK', 'Lau khô khay và kiểm tra mối silicone trước khi mở khóa.');

      if (s.faults.wifi) {
        if (d.wifiLostAt == null) d.wifiLostAt = s.t;
        if (d.mode === 'manual' && s.t - d.wifiLostAt > 15) { d.mode = 'auto'; d.manualCmd = false; ev('warn', 'Mất Wi-Fi > 15 s khi đang thủ công → tự chuyển TỰ ĐỘNG.'); }
      } else d.wifiLostAt = null;

      d.flowLog.push([s.t, d.levelMm]);
      while (d.flowLog.length && s.t - d.flowLog[0][0] > 5) d.flowLog.shift();
      const f0 = d.flowLog[0];
      d.rate = f0 && f0[1] != null && d.levelMm != null && s.t > f0[0] ? (d.levelMm - f0[1]) / (s.t - f0[0]) * k.tankArea * 60 / 1e6 : 0; // L/phút

      let want = d.pump, why = '';
      if (d.lock || d.pct == null) want = false;
      else if (d.mode === 'auto') {
        if (d.pct <= d.low) { want = true; why = 'mức ≤ ngưỡng bật'; } else if (d.pct >= d.high) { want = false; why = 'mức ≥ ngưỡng tắt'; }
      } else {
        want = d.manualCmd; why = 'lệnh thủ công';
        if (d.pct >= HARD_MAX) { if (want) ev('warn', `Chạm giới hạn cứng ${HARD_MAX} % → tự tắt bơm.`); want = false; d.manualCmd = false; why = 'giới hạn cứng'; }
      }
      if (want && d.pump) {
        d.riseLog.push([s.t, d.levelMm]);
        while (d.riseLog.length && s.t - d.riseLog[0][0] > DRY_WINDOW) d.riseLog.shift();
        // So trung bình 3 s đầu và 3 s cuối cửa sổ: một số đo nhiễu đơn lẻ không làm khóa nhầm bơm yếu.
        const avg = (a) => a.reduce((x, e) => x + e[1], 0) / a.length, t0 = d.riseLog[0][0];
        const rise = avg(d.riseLog.filter((e) => s.t - e[0] <= 3)) - avg(d.riseLog.filter((e) => e[0] - t0 <= 3));
        if (s.t - d.pumpOnAt >= DRY_WINDOW && rise < DRY_MIN_RISE) lock('DRY', `Tăng < ${DRY_MIN_RISE} mm trong ${DRY_WINDOW} s: nguồn cạn, tắc ống hoặc cảm biến treo.`);
        else if (s.t - d.pumpOnAt > k.maxRun) lock('TIMEOUT', `Quá ${k.maxRun} s liên tục.`);
      }
      if (d.lock) want = false;
      d.holdOff = !d.pump && want ? Math.max(0, RELAY_MIN_OFF - (s.t - d.pumpOffAt)) : 0;
      if (d.holdOff > 0) want = false; // chờ relay nghỉ đủ thời gian
      setPump(want, why || (want ? 'giữ' : 'dừng'));
    }

    function physics(dt) {
      const k = s.k;
      const on = !s.faults.power && s.dev.pump;
      const head = (k.inletY - s.res) / 1000;
      let qp = on && s.res > k.minSub ? Math.max(0, k.qMax * (1 - head / k.hMax)) * Math.min(1, (s.res - k.minSub) / 5) * (s.faults.weak ? 0.3 : 1) : 0;
      const dH = k.hasDrain ? k.drainH : 0; // bản đơn giản: "xả" = múc nước tay từ đáy
      const above = s.level - dH;
      let qd = above > 0 ? s.valve * 0.6 * Math.sqrt(Math.min(1, above / (k.usableH - dH))) : 0;
      let ql = s.faults.leak && s.level > 1 ? 0.08 : 0;
      let qo = k.hasOverflow && s.level > k.overflowH ? Math.min(3, (s.level - k.overflowH) / 4 * 1.5) : 0;
      let qs = !k.hasOverflow && s.level > k.tankH ? Math.min(3, (s.level - k.tankH) / 2 * 1.5) : 0; // tràn miệng bình xuống khay
      const inL = qp / 60 * dt, tankL = s.level * k.tankArea / 1e6;
      let outL = (qd + ql + qo + qs) / 60 * dt;
      if (outL > tankL + inL) { const f = (tankL + inL) / outL; qd *= f; ql *= f; qo *= f; qs *= f; outL = tankL + inL; }
      s.level = Math.max(0, s.level + (inL - outL) * 1e6 / k.tankArea);
      s.res += (-inL + (qd + qo) / 60 * dt) * 1e6 / k.resArea;
      s.tray += (ql + qs) / 60 * dt * 1000;
      s.q = { pump: qp, drain: qd, leak: ql + qs, overflow: qo, spill: qs };
    }

    function step(dt) {
      let left = dt;
      while (left > 1e-9) {
        const h = Math.min(0.05, left); left -= h; s.t += h;
        physics(h);
        if (s.faults.power) continue;
        s.acc.ping += h; s.acc.ctrl += h;
        if (s.acc.ping >= 0.2) { s.acc.ping -= 0.2; if (s.dev.booting <= 0) ping(); }
        if (s.acc.ctrl >= 0.1) { ctrl(s.acc.ctrl); s.acc.ctrl = 0; }
      }
      s.acc.hist += dt;
      while (s.acc.hist >= 1) {
        s.acc.hist -= 1;
        s.history.push({ t: s.t, pct: connected() ? s.dev.pct : null, truth: s.level / s.k.usableH * 100, pump: s.dev.pump && !s.faults.power });
        if (s.history.length > 1200) s.history.shift();
      }
    }

    function reboot(why) {
      s.dev = newDev(s.dev);
      s.acc.ping = s.acc.ctrl = 0;
      ev('info', `${why} — khởi động ở chế độ TỰ ĐỘNG, bơm TẮT chờ số đo hợp lệ.`);
    }

    // Lệnh từ điện thoại: chỉ tới được thiết bị khi có Wi-Fi và có điện.
    function cmd(name, a, b) {
      const d = s.dev;
      if (!connected()) return { ok: false, msg: 'Mất kết nối với thiết bị — lệnh không được gửi.' };
      if (d.booting > 0) return { ok: false, msg: 'Thiết bị đang khởi động.' };
      if (name === 'mode') { if (d.mode !== a) { d.mode = a; d.manualCmd = false; ev('info', `Chuyển chế độ ${a === 'auto' ? 'TỰ ĐỘNG' : 'THỦ CÔNG'} từ điện thoại.`); } return { ok: true }; }
      if (name === 'pump') {
        if (d.mode !== 'manual') return { ok: false, msg: 'Chuyển sang Thủ công để bật/tắt bơm.' };
        if (a && d.lock) return { ok: false, msg: 'Bơm đang bị khóa an toàn: ' + d.lock.msg };
        if (a && d.pct != null && d.pct >= HARD_MAX) return { ok: false, msg: `Mức nước ≥ ${HARD_MAX} %, không thể bật bơm.` };
        d.manualCmd = !!a; return { ok: true };
      }
      if (name === 'thresholds') {
        const lo = Math.round(a), hi = Math.round(b);
        if (!(lo >= 5 && hi <= HARD_MAX - 2 && hi - lo >= 10)) return { ok: false, msg: `Ngưỡng không hợp lệ: cần 5 ≤ bật, tắt ≤ ${HARD_MAX - 2}, cách nhau ≥ 10 %.` };
        if (lo !== d.low || hi !== d.high) { d.low = lo; d.high = hi; ev('info', `Đặt ngưỡng: bật ≤ ${lo} %, tắt ≥ ${hi} %.`); }
        return { ok: true };
      }
      if (name === 'reset') {
        if (!d.lock) return { ok: true };
        ev('info', `Đã xác nhận "${d.lock.msg}", mở khóa bơm.`);
        d.lock = null; d.invalid = 0; d.badHist = []; d.spikes = 0;
        return { ok: true };
      }
      return { ok: false, msg: 'Lệnh không rõ' };
    }

    // Thao tác trên bàn thí nghiệm (tay người, không qua mạng).
    const lab = {
      valve(v) { s.valve = clamp(v, 0, 1); },
      addWater(L) { const cap = (s.k.resH - 5 - s.res) * s.k.resArea / 1e6; const a = clamp(L, 0, cap); s.res += a * 1e6 / s.k.resArea; s.added += a; ev('lab', `Châm ${a.toFixed(2)} L vào hộp nguồn.`, 'lab'); },
      emptySource() { const target = 8; if (s.res > target) { s.added -= (s.res - target) * s.k.resArea / 1e6; s.res = target; } ev('lab', 'Rút gần cạn hộp nguồn (còn 8 mm).', 'lab'); },
      dryTray() { s.added -= s.tray / 1000; s.tray = 0; ev('lab', 'Lau khô khay hứng.', 'lab'); },
      fault(key, v) {
        if (s.faults[key] === v) return;
        if (key === 'sensor' && v === 'stuck') s.stuckVal = s.dev.raw != null ? s.dev.raw : s.k.S - s.level;
        s.faults[key] = v;
        const names = { leak: 'Rò rỉ bình', sensor: 'HC-SR04', wifi: 'Mất Wi-Fi', power: 'Mất điện', weak: 'Bơm yếu / tắc ống' };
        ev('lab', `Sự cố "${names[key]}": ${v === true ? 'BẬT' : v === false ? 'TẮT' : v}.`, 'lab');
        if (key === 'power') { if (v) { s.dev.pump = false; } else reboot('Có điện trở lại'); }
      },
      reset() { if (!s.faults.power) reboot('Nhấn nút RESET trên Arduino Mega'); },
    };

    function rebind(model2) {
      const oldPct = s.level / s.k.usableH;
      s.k = model2.sim;
      s.level = clamp(oldPct, 0, 1) * s.k.usableH;
      s.res = clamp(s.res, 0, s.k.resH - 5);
      s.dev = newDev(s.dev); s.dev.booting = 0.3; s.added = 0; s.base = totalL();
    }

    // Nội dung LCD 16×2 (HD44780 không có dấu tiếng Việt → firmware in ASCII).
    function lcd() {
      const d = s.dev, pad = (x) => (x + ' '.repeat(16)).slice(0, 16);
      if (s.faults.power) return null;
      if (d.booting > 0) return [pad('AquaTwin Mega'), pad('Khoi dong...')];
      const wifi = s.faults.wifi ? 'NoWiFi' : 'WiFi';
      if (d.lock) {
        const L1 = { LEAK: '!! RO RI NUOC', SENSOR: '!! LOI CAM BIEN', DRY: '!! BOM CHAY KHO', TIMEOUT: '!! BOM QUA GIO' }[d.lock.code];
        return [pad(L1), pad('Bom KHOA ' + wifi)];
      }
      const pct = d.pct == null ? ' --' : String(Math.round(d.pct)).padStart(3);
      const mm = d.levelMm == null ? ' --' : String(Math.round(d.levelMm)).padStart(3);
      const st = d.holdOff > 0 ? 'CHO' + Math.ceil(d.holdOff) : d.pump ? 'BAT' : 'TAT';
      return [pad(`Muc${pct}% ${mm}mm`), pad(`Bom:${st} ${d.mode === 'auto' ? 'TD' : 'TC'} ${wifi}`)];
    }
    // Còi: 'alarm' khi khóa an toàn, 'chirp' mỗi 10 s khi mất Wi-Fi, ngược lại tắt.
    function buzzer() { const d = s.dev; if (s.faults.power || d.booting > 0) return 'off'; if (d.lock) return 'alarm'; if (s.faults.wifi) return 'chirp'; return 'off'; }

    s.base = totalL();
    return Object.assign(s, { step, cmd, lab, rebind, connected, totalL, lcd, buzzer });
  }

  const Sim = { create, LOCKS, HARD_MAX, fmtClock, C_SOUND, RELAY_MIN_OFF, WS_WET };
  root.Sim = Sim;
  if (typeof module !== 'undefined') module.exports = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
