/* Linh kiện điện tử chi tiết (Three.js r147), dựng theo kích thước thật trong Design.SPEC.
   Ba mức chi tiết gắn ở userData.lod:
     (không gắn) — khối chính, hiện ở mọi chế độ;
     'fine'      — chi tiết nhận dạng (lỗ header, ốc, nhãn in, lưới đầu dò), chỉ ở Thực tế;
     'micro'     — chân IC, linh kiện dán, chân pin, chỉ ở Thực tế chất lượng cao.
   Phần lặp lại (chân, lỗ, linh kiện dán) dùng InstancedMesh để giữ ít draw call. */
(function (root) {
  'use strict';
  root.Parts3D = function (h) {
    const { THREE, M, box, cyl, at, led } = h;
    // Đăng ký chân: kind 'm' = chân đực (cắm đầu Dupont cái), 'f' = header cái / lỗ breadboard (cắm đầu Dupont đực), 's' = lỗ vít cầu đấu (luồn dây trần)
    const pin = (key, obj, x, y, z, kind, dir) => h.pin(key, obj, new THREE.Vector3(x, y, z), kind, dir ? new THREE.Vector3(dir[0], dir[1], dir[2]) : new THREE.Vector3(0, 1, 0));
    const lod = (o, level) => { o.userData.lod = level; if (level === 'micro') o.castShadow = false; return o; };
    const tmp = new THREE.Object3D();
    // Nhiều khối giống nhau trong một draw call: list = [[x, y, z, rotY?], ...] (y là đáy khối)
    function inst(g, w, ht, d, mat, list, level) {
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(w, ht, d), mat, list.length);
      const bb = new THREE.Box3();
      list.forEach(([x, y, z, r], i) => { tmp.position.set(x, y + ht / 2, z); tmp.rotation.set(0, r || 0, 0); tmp.updateMatrix(); im.setMatrixAt(i, tmp.matrix); bb.expandByPoint(tmp.position); });
      // r147 tính khung bao/cầu bao từ hình gốc, bỏ qua vị trí từng bản: gán lại để chọn, phóng tới, chụp ảnh và cắt khung nhìn đúng
      bb.expandByScalar(Math.hypot(w, ht, d) / 2); im.geometry.boundingBox = bb; im.geometry.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
      im.castShadow = level !== 'micro'; im.receiveShadow = true; g.add(im); return lod(im, level);
    }
    // Header cái (Arduino): thân nhựa đen + lỗ vuông ở mặt trên
    function femaleHeader(g, n, rows, x, z, alongZ, names) {
      const L = n * 2.54, W = rows * 2.54;
      if (names) names.forEach((nm, i) => nm && pin('mega.' + nm, g, x - L / 2 + 1.27 + i * 2.54, 10.1, z, 'f'));
      box(g, alongZ ? W : L, 8.5, alongZ ? L : W, M.hdr, x, 1.6, z);
      const holes = [];
      for (let i = 0; i < n; i++) for (let r = 0; r < rows; r++) {
        const a = -L / 2 + 1.27 + i * 2.54, b = -W / 2 + 1.27 + r * 2.54;
        holes.push(alongZ ? [x + b, 10.1, z + a] : [x + a, 10.1, z + b]);
      }
      inst(g, 1, 0.02, 1, M.hole, holes, 'fine');
    }
    // Header đực: đế nhựa đen + chân mạ vàng
    function maleHeader(g, n, rows, x, y, z, alongZ, pinUp, names) {
      const L = n * 2.54, W = rows * 2.54, pins = [];
      if (names && pinUp) names.forEach((nm, i) => { const a = -L / 2 + 1.27 + i * 2.54; pin(nm, g, alongZ ? x : x + a, y + 8.5, alongZ ? z + a : z, 'm'); });
      lod(box(g, alongZ ? W : L, 2.5, alongZ ? L : W, M.hdr, x, y, z), 'fine');
      for (let i = 0; i < n; i++) for (let r = 0; r < rows; r++) {
        const a = -L / 2 + 1.27 + i * 2.54, b = -W / 2 + 1.27 + r * 2.54;
        pins.push(alongZ ? [x + b, y + (pinUp ? 0 : -3), z + a] : [x + a, y + (pinUp ? 0 : -3), z + b]);
      }
      inst(g, 0.64, pinUp ? 8.5 : 11.5, 0.64, M.gold, pins, 'micro');
    }
    // IC dán: thân đen + chân bạc hai/bốn phía
    function chip(g, w, d, ht, x, y, z, legsPerSide, fourSides) {
      box(g, w, ht, d, M.chip, x, y, z);
      if (!legsPerSide) return;
      const legs = [], step = (fourSides ? Math.min(w, d) : w) / (legsPerSide + 1);
      for (let i = 1; i <= legsPerSide; i++) {
        const t = -((fourSides ? Math.min(w, d) : w) / 2) + i * step;
        legs.push([x + t, y, z - d / 2 - 0.5], [x + t, y, z + d / 2 + 0.5]);
        if (fourSides) legs.push([x - w / 2 - 0.5, y, z + t, Math.PI / 2], [x + w / 2 + 0.5, y, z + t, Math.PI / 2]);
      }
      inst(g, 0.28, 0.25, 1.2, M.tin, legs, 'micro');
    }
    // Linh kiện dán nhỏ rải trên board (vị trí cố định theo seed để không đổi giữa các lần dựng)
    function smd(g, n, x0, z0, x1, z1, seed) {
      let s = seed; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      const list = []; for (let i = 0; i < n; i++) list.push([x0 + rnd() * (x1 - x0), 1.6, z0 + rnd() * (z1 - z0), rnd() > 0.5 ? Math.PI / 2 : 0]);
      inst(g, 1.6, 0.5, 0.8, M.smd, list, 'micro');
    }
    function screwTerminal(g, n, x, z, rotY, names) {
      const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = rotY || 0; g.add(t);
      if (names) names.forEach((nm, i) => pin(nm, t, -n * 2.54 + 2.54 + i * 5.08, 5.6, 4.1, 's', [0, 0, 1]));
      box(t, n * 5.08, 10, 8, M.termBlue, 0, 1.6, 0);
      for (let i = 0; i < n; i++) {
        const sx = -n * 2.54 + 2.54 + i * 5.08;
        lod(cyl(t, 1.7, 0.6, M.screw, sx, 11.6, -1, 16), 'fine');
        lod(box(t, 2.6, 0.3, 0.5, M.hole, sx, 12.2, -1), 'fine'); // rãnh vít
        lod(box(t, 3.2, 3.2, 0.2, M.hole, sx, 4, 4.05), 'fine'); // lỗ luồn dây
      }
      return t;
    }
    function decal(g, w, d, mat, x, y, z, rotX) { // tấm nhãn mỏng dán lên mặt phẳng
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = rotX == null ? -Math.PI / 2 : rotX; m.position.set(x, y, z); g.add(m); return lod(m, 'fine');
    }

    return {
      mega(g, P, SP) { // 101,6 × 53,3 mm
        const s = at(g, P), L = SP.l, W = SP.w;
        box(s, L, 1.6, W, M.pcbMega, 0, 0, 0);
        femaleHeader(s, 10, 1, -14, -W / 2 + 2.5, false, ['SCL', 'SDA', 'AREF', 'GND3', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8']);
        femaleHeader(s, 8, 1, 14, -W / 2 + 2.5, false, ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0']);
        femaleHeader(s, 8, 1, 36, -W / 2 + 2.5, false, ['D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D20', 'D21']);
        femaleHeader(s, 8, 1, -16, W / 2 - 2.5, false, ['NC', 'IOREF', 'RESET', '3V3', '5V', 'GND', 'GND2', 'VIN']);
        femaleHeader(s, 8, 1, 6, W / 2 - 2.5, false, ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']); femaleHeader(s, 8, 1, 28, W / 2 - 2.5);
        femaleHeader(s, 18, 2, L / 2 - 4.5, 0, true); // D22–D53
        box(s, 16, 11, 12, M.silver, -L / 2 + 6, 1.6, 12); lod(box(s, 0.4, 7, 8, M.hole, -L / 2 - 2.2, 3.6, 12), 'fine'); // USB-B + miệng cắm
        box(s, 14, 11, 9, M.black, -L / 2 + 5, 1.6, -14); lod(cyl(s, 2.6, 0.4, M.hole, -L / 2 - 2.1, 7, -14, 16), 'fine'); // jack DC
        chip(s, 14, 14, 1.4, 8, 1.6, 2, 25, true); // ATmega2560 TQFP-100
        chip(s, 5, 5, 0.9, -28, 1.6, 8, 0); // ATmega16U2
        box(s, 11, 3.5, 4.5, M.silver, -16, 1.6, -4); // thạch anh 16 MHz
        box(s, 6, 3.5, 6, M.silver, -38, 1.6, 20); lod(cyl(s, 1.75, 1, M.black, -38, 5.1, 20, 16), 'fine'); // nút RESET
        box(s, 6.5, 1.6, 3.5, M.black, -42, 1.6, -22); lod(box(s, 6.5, 0.4, 2, M.tin, -42, 1.6, -24.3), 'fine'); // ổn áp SOT-223
        for (const z of [-8, -14]) { cyl(s, 3, 6, M.capBlue, -36, 1.6, z, 16); lod(cyl(s, 2.9, 0.3, M.silver, -36, 7.6, z, 16), 'fine'); }
        maleHeader(s, 3, 2, L / 2 - 12, 1.6, 2, true, true); maleHeader(s, 3, 2, -24, 1.6, 18, false, true); // ICSP ×2
        smd(s, 34, -46, -22, 40, 22, 7);
        for (const [x, z] of [[-48, -24], [-48, 24], [47, -19], [47, 22]]) lod(cyl(s, 1.9, 0.1, M.tin, x, 1.6, z, 16), 'fine');
        lod(inst(s, 1.6, 0.6, 0.8, M.ledOff, [[-20, 1.6, -14], [-20, 1.6, -11]], 'fine'), 'fine'); // TX/RX
        return { on: led(s, -20, 2.4, -18, 0x113311), l13: led(s, -24, 2.4, -18, 0x332211) };
      },

      relay(g, P) { // module 1 kênh 50 × 26 mm
        const s = at(g, P);
        box(s, 50, 1.6, 26, M.pcbRelay, 0, 0, 0);
        box(s, 19, 15.5, 15.5, M.relayBlue, 4, 1.6, 0);
        decal(s, 17, 13.5, M.relayLabel, 4, 17.15, 0);
        screwTerminal(s, 3, 19, 0, Math.PI / 2, ['relay.NO', 'relay.COM', 'relay.NC']);
        maleHeader(s, 3, 1, -22, 1.6, 0, true, true, ['relay.VCC', 'relay.GND', 'relay.IN']);
        lod(cyl(s, 1, 4.5, M.black, -10, 1.6, -8, 12), 'fine'); lod(cyl(s, 1.05, 0.8, M.silver, -10, 4, -8, 12), 'fine'); // diode 1N4148
        lod(box(s, 3, 1, 1.5, M.chip, -12, 1.6, 4), 'micro'); // transistor
        smd(s, 6, -18, -10, -6, 10, 3);
        return led(s, -14, 2.4, 8, 0x331111);
      },

      espKit(g, P, tb) { // test board + ESP-01 + AMS1117 + chuyển mức
        const s = at(g, P, 0);
        box(s, tb.l, 9, tb.w, M.white, 0, 0, 0, true);
        decal(s, tb.l - 2, tb.w - 2, M.breadboard, 0, 9.02, 0);
        lod(box(s, 2.5, 0.2, tb.w - 6, M.dark, 0, 9, 0), 'cad');
        // AMS1117: board xanh + IC SOT-223 + tụ tantalum
        box(s, 22, 1.6, 17, M.pcbBlue, -tb.l / 2 + 14, 9, -tb.w / 2 + 11);
        box(s, 6.5, 1.8, 3.5, M.chip, -tb.l / 2 + 14, 10.6, -tb.w / 2 + 11); lod(box(s, 3, 0.3, 1.6, M.tin, -tb.l / 2 + 14, 10.6, -tb.w / 2 + 8.5), 'fine');
        lod(inst(s, 3.5, 2, 2.8, M.tantal, [[-tb.l / 2 + 8, 10.6, -tb.w / 2 + 6], [-tb.l / 2 + 20, 10.6, -tb.w / 2 + 6]], 'micro'), 'micro');
        // Chuyển mức BSS138 ×4
        box(s, 16, 1.6, 13, M.pcbBlue, tb.l / 2 - 11, 9, -tb.w / 2 + 9);
        inst(s, 2.9, 1, 1.3, M.chip, [0, 1, 2, 3].map((i) => [tb.l / 2 - 16 + i * 3.4, 10.6, -tb.w / 2 + 9]), 'micro');
        cyl(s, 4, 11, M.capBlue, -tb.l / 2 + 8, 9, tb.w / 2 - 7, 16); lod(cyl(s, 3.9, 0.3, M.silver, -tb.l / 2 + 8, 20, tb.w / 2 - 7, 16), 'fine');
        { // lỗ breadboard nối với chân module (cùng hàng 5 lỗ); tọa độ cục bộ của test board, mặt trên y = 9
          const ax = -tb.l / 2 + 14, az = -tb.w / 2 + 11, sx = tb.l / 2 - 11, sz = -tb.w / 2 + 9, ex = tb.l / 2 - 15 + 9.5, ez = tb.w / 2 - 10;
          [['VIN', -2.54], ['GND', 0], ['VOUT', 2.54]].forEach(([nm, dx]) => pin('ams.' + nm, s, ax + dx, 9, az + 11.5, 'f'));
          [['HV', -3.81], ['HV1', -1.27], ['HV2', 1.27], ['GND', 3.81]].forEach(([nm, dx]) => pin('lvl.' + nm, s, sx + dx, 9, sz + 9.5, 'f'));
          [['LV', -3.81], ['LV1', -1.27], ['LV2', 1.27]].forEach(([nm, dx]) => pin('lvl.' + nm, s, sx + dx, 9, sz - 9.5, 'f'));
          [['GND', 0], ['RX', 3]].forEach(([nm, i]) => pin('esp.' + nm, s, ex - 6.35, 9, ez - 3.81 + i * 2.54, 'f'));
          [['TX', 0], ['EN', 1], ['VCC', 3]].forEach(([nm, i]) => pin('esp.' + nm, s, ex + 6.35, 9, ez - 3.81 + i * 2.54, 'f'));
        }
        // ESP-01 24,8 × 14,3 cắm đứng trên header cái
        const e = new THREE.Group(); e.position.set(tb.l / 2 - 15, 20, tb.w / 2 - 10); s.add(e);
        box(e, 24.8, 1.6, 14.3, M.pcbEsp, 0, 0, 0);
        chip(e, 5, 5, 0.85, 3, 1.6, 2, 8, true); // ESP8266EX QFN
        chip(e, 5, 4, 1.5, 3, 1.6, -4, 4); // flash SOIC-8
        lod(box(e, 3.2, 1, 2.5, M.silver, -1.5, 1.6, -4.5), 'fine'); // thạch anh 26 MHz
        for (let i = 0; i < 4; i++) box(e, 4, 0.2, 0.6, M.gold, -9, 1.6, -4 + i * 2.6);
        lod(box(e, 5.08, 8.5, 10.2, M.hdr, 9.5, -11.5, 0), 'fine'); // header cái dưới ESP
        maleHeader(e, 4, 2, 9.5, -2.5, 0, true, false);
        lod(box(e, 1.6, 0.6, 0.8, M.ledOff, 7, 1.6, 5.5), 'fine');
        return led(e, 6, 2.4, 5, 0x112233);
      },

      lcd(g, P, face) { // LCD 1602 80 × 36 + module I2C
        const s = new THREE.Group(); s.position.set(P.x, P.y, P.z); g.add(s);
        if (face === 'front') s.rotation.x = Math.PI / 2; else s.rotation.y = P.rot || 0;
        // Mặt màn hình ở y = 0 cục bộ, module nằm phía âm
        box(s, 80, 1.6, 36, M.pcbGreen, 0, -9, 0);
        box(s, 71, 7.4, 24, M.dark, 0, -7.4, 0);
        lod(box(s, 72.5, 0.6, 25.5, M.bezel, 0, -0.75, 0), 'fine'); // khung kim loại quanh kính (thấp hơn mặt kính để không chồng hình)
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(64, 15), M.lcdScreen); scr.rotation.x = -Math.PI / 2; scr.position.set(0, 0.1, 0); s.add(scr);
        lod(decal(s, 71, 24, M.glass, 0, 0.6, 0), 'fine'); // tấm kính phân cực: chỉ phản chiếu cửa sổ, không che chữ
        for (const [x, z] of [[-37.5, -15.5], [37.5, -15.5], [-37.5, 15.5], [37.5, 15.5]]) lod(cyl(s, 1.8, 0.1, M.tin, x, -7.38, z, 16), 'fine');
        inst(s, 1.4, 0.4, 1.4, M.tin, Array.from({ length: 16 }, (_, i) => [-31 + i * 2.54, -7.45, -16.5]), 'micro'); // 16 pad
        // 4 trụ đỡ nylon M3 từ lỗ góc mạch LCD tới mặt sau tấm gắn (mặt sau tấm ở y = +0,5): LCD bắt vít, không treo lơ lửng
        for (const [x, z] of [[-37.5, -15.5], [37.5, -15.5], [-37.5, 15.5], [37.5, 15.5]]) cyl(s, 2.2, 7.9, M.white, x, -7.4, z, 12);
        // Module I2C hàn thẳng lên hàng 16 chân của LCD (mép trên): tâm module trùng tâm hàng pad x = -12, mép module nằm trên hàng pad
        const bp = new THREE.Group(); bp.position.set(-12, 0, -7.5); s.add(bp);
        box(bp, 40.6, 9.4, 2.5, M.hdr, 0, -18.4, -9); // header 16 chân nối hai mạch
        inst(bp, 0.64, 12, 0.64, M.gold, Array.from({ length: 16 }, (_, i) => [-19.05 + i * 2.54, -19.8, -9]), 'micro');
        box(bp, 41, 1.6, 19, M.pcbBlue, 0, -20, 0);
        chip(bp, 7.5, 5, 1.6, 6, -22.6, 0, 8); // PCF8574
        box(bp, 7, 4, 7, M.termBlue, -14, -24, 4); lod(cyl(bp, 1.8, 0.6, M.white, -14, -24.6, 4, 16), 'fine'); // biến trở xanh, núm trắng
        lod(box(bp, 2.5, 2.54, 10.16, M.hdr, -21.8, -22.9, 0), 'fine');
        inst(bp, 9, 0.64, 0.64, M.gold, [0, 1, 2, 3].map((i) => [-26.3, -22.2, -3.81 + i * 2.54]), 'micro');
        ['GND', 'VCC', 'SDA', 'SCL'].forEach((nm, i) => pin('lcd.' + nm, bp, -30.8, -21.9, -3.81 + i * 2.54, 'm', [-1, 0, 0]));
        return s;
      },

      buzzer(g, P) { // module còi chủ động 33 × 13
        const s = at(g, P); box(s, 33, 1.6, 13, M.pcbBuzz, 0, 0, 0);
        const b = cyl(s, 6, 9, M.buzz, 6, 1.6, 0, 32);
        cyl(s, 4.5, 0.3, M.sticker, 6, 10.6, 0, 24); lod(cyl(s, 1, 0.32, M.hole, 6, 10.62, 0, 16), 'fine'); // nhãn dán + lỗ thoát âm
        maleHeader(s, 3, 1, -15, 1.6, 0, true, true, ['buzz.VCC', 'buzz.IO', 'buzz.GND']);
        lod(box(s, 3, 1, 1.5, M.chip, -6, 1.6, 3), 'micro'); smd(s, 3, -9, -4, -3, 4, 11);
        return b;
      },

      power(g, P) { // jack DC + domino 2P ×3 + tụ 470 µF
        const s = at(g, P, 0);
        box(s, 20, 1.6, 14, M.pcbBlack, 0, 0, 0); box(s, 9, 11, 14, M.black, -5, 1.6, 0); lod(cyl(s, 2.6, 0.4, M.hole, -5, 7, -7.2, 16), 'fine');
        for (let i = 0; i < 3; i++) screwTerminal(s, 2, 18 + i * 11, 0, 0, ['dom' + i + '.5V', 'dom' + i + '.GND']);
        pin('jack.+', s, 0, 3, 3, 'p', [1, 0, 0]); pin('jack.-', s, 0, 3, -3, 'p', [1, 0, 0]);
        cyl(s, 4, 12, M.capBlue, 18, 10, 10, 16); lod(cyl(s, 3.9, 0.3, M.silver, 18, 22, 10, 16), 'fine');
      },

      // HC-SR04 45 × 20, hai đầu dò Ø16 × 12 chúc xuống, tâm cách 26
      hcsr04(g, x, yP, z, SP) {
        box(g, SP.pcbL, 1.6, SP.pcbW, M.hc, x, yP, z);
        for (const sd of [-1, 1]) {
          cyl(g, SP.canD / 2, SP.canH, M.silver, x + sd * SP.pitch / 2, yP - SP.canH, z, 40);
          const gr = new THREE.Mesh(new THREE.CircleGeometry(SP.canD / 2 - 1.2, 32), M.grille); gr.rotation.x = Math.PI / 2; gr.position.set(x + sd * SP.pitch / 2, yP - SP.canH - 0.06, z); g.add(gr);
          const lip = lod(new THREE.Mesh(new THREE.TorusGeometry(SP.canD / 2 - 0.6, 0.6, 8, 40), M.silver), 'fine'); // mép cuốn của vỏ nhôm
          lip.position.set(x + sd * SP.pitch / 2, yP - SP.canH, z); lip.rotation.x = Math.PI / 2; g.add(lip);
        }
        box(g, 10, 3, 4, M.silver, x, yP + 1.6, z - 4); // thạch anh
        maleHeader(g, 4, 1, x, yP + 1.6, z - 8.5, false, true, ['hc.VCC', 'hc.TRIG', 'hc.ECHO', 'hc.GND']);
        chip(g, 5, 4, 1.4, x - 9, yP + 1.6, z + 4, 4); chip(g, 5, 4, 1.4, x + 9, yP + 1.6, z + 4, 4);
      },

      // Water Sensor 62 × 20: 10 vạch đồng thiếc, header 3 chân, LED, transistor
      ws(g, W) {
        box(g, 62, 1.6, 20, M.pcbRed, W.x, W.y + 1, W.z);
        inst(g, 40, 0.3, 0.9, M.tin, Array.from({ length: 10 }, (_, i) => [W.x - 7, W.y + 2.6, W.z - 8.1 + i * 1.8]), null);
        maleHeader(g, 3, 1, W.x + 29, W.y + 2.6, W.z, true, true, ['ws.S', 'ws.VCC', 'ws.GND']);
        lod(box(g, 3, 1, 1.5, M.chip, W.x + 22, W.y + 2.6, W.z - 3), 'micro');
        return led(g, W.x + 20, W.y + 3, W.z + 6, 0x331111);
      },

      // Bơm chìm 45 × 24 × 33: thân đen, lưới hút, núm ra Ø7,5, 4 giác hút
      pump(pin, Pu) {
        const body = box(pin, Pu.l, Pu.h, Pu.w, M.black, Pu.x, 1.5, Pu.z); body.userData.lod = 'cad';
        { // thân nhựa ABS bo góc R3 (vỏ đúc hai nửa) + đế bắt vít, chỉ ở Thực tế
          const r = 3, sh = new THREE.Shape(), x0 = -Pu.l / 2, z0 = -Pu.w / 2, L = Pu.l, W = Pu.w;
          sh.moveTo(x0 + r, z0); sh.lineTo(x0 + L - r, z0); sh.quadraticCurveTo(x0 + L, z0, x0 + L, z0 + r); sh.lineTo(x0 + L, z0 + W - r); sh.quadraticCurveTo(x0 + L, z0 + W, x0 + L - r, z0 + W);
          sh.lineTo(x0 + r, z0 + W); sh.quadraticCurveTo(x0, z0 + W, x0, z0 + W - r); sh.lineTo(x0, z0 + r); sh.quadraticCurveTo(x0, z0, x0 + r, z0);
          const geo = new THREE.ExtrudeGeometry(sh, { depth: Pu.h - 2, bevelEnabled: true, bevelThickness: 1, bevelSize: 0.8, bevelSegments: 2, curveSegments: 6 }); geo.rotateX(-Math.PI / 2);
          const m = new THREE.Mesh(geo, M.black); m.position.set(Pu.x, 2.5, Pu.z); m.castShadow = m.receiveShadow = true; pin.add(lod(m, 'fine'));
          lod(box(pin, Pu.l + 0.4, 0.5, Pu.w + 0.4, M.dark, Pu.x, Pu.h * 0.62, Pu.z), 'fine'); // đường ghép vỏ
          lod(box(pin, Pu.l + 10, 2, Pu.w - 6, M.black, Pu.x, 1.5, Pu.z), 'fine'); // đế có tai bắt vít
          for (const sx of [-1, 1]) lod(cyl(pin, 1.2, 0.2, M.hole, Pu.x + sx * (Pu.l / 2 + 2.5), 3.5, Pu.z, 12), 'fine');
          // Lưới hút tròn trên mặt bên: 2 vòng + 4 nan
          const gx = Pu.x - Pu.l / 2 - 0.9, gy = 2 + Pu.h * 0.42;
          lod(box(pin, 0.6, 18, 18, M.dark, gx + 0.2, gy - 9, Pu.z), 'fine');
          for (const rr of [7.5, 4.5]) { const t = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.9, 6, 28), M.black); t.rotation.y = Math.PI / 2; t.position.set(gx - 0.2, gy, Pu.z); pin.add(lod(t, 'fine')); }
          for (const a of [0, Math.PI / 4, Math.PI / 2, -Math.PI / 4]) lod(box(pin, 0.9, 16, 1.2, M.black, gx - 0.2, gy - 8, Pu.z), 'fine').rotation.x = a;
          lod(cyl(pin, 2, 1.5, M.black, gx - 0.6, gy - 0.75, Pu.z, 16), 'fine').rotation.z = Math.PI / 2;
        }
        cyl(pin, 3.75, 8, M.black, Pu.x, Pu.h + 1.5, Pu.z, 20);
        inst(pin, 2, 6, Pu.w + 0.4, M.dark, [0, 1, 2, 3, 4].map((i) => [Pu.x - 12 + i * 6, 3, Pu.z]), 'cad');
        inst(pin, 0.4, 14, 1.2, M.dark, [0, 1, 2, 3, 4, 5].map((i) => [Pu.x - Pu.l / 2 - 0.2, 6, Pu.z - 7.5 + i * 3]), 'cad'); // khe lưới hút mặt bên (bản 3D)
        const cups = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) cups.push([Pu.x + sx * (Pu.l / 2 - 6), 0, Pu.z + sz * (Pu.w / 2 - 4)]);
        cups.forEach(([x, y, z]) => lod(cyl(pin, 3.5, 1.5, M.cup, x, y, z, 16), 'fine'));
        lod(box(pin, 10, 0.2, 6, M.sticker, Pu.x + 6, Pu.h + 1.51, Pu.z), 'fine'); // nhãn thông số
      },
    };
  };
})(window);
