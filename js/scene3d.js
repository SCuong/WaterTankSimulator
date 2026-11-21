/* Mô hình 3D (Three.js r147): dựng hoàn toàn từ Design.compute(), đồng bộ với Sim mỗi khung hình. */
(function (root) {
  'use strict';
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let renderer, scene, camera, controls, host, overlay, tip, M;
  let model = null, rootG = null, dimsG = null, measureG = null, fxG = null;
  let parts = {}, labels = [], dimLabels = [], measureLabels = [];
  const ex = { cur: 0, target: 0, cluster: 'all' };
  let asm = null, hidden = new Set(), isolated = null, selected = null, selBox = null;
  let dimsOn = false, labelsOn = false, measureOn = false, section = null;
  let dyn = {}, mPts = [], tween = null, hoverId = null, onPick = () => {}, onMeasure = () => {};
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), clock = new THREE.Clock();
  let P3 = null, quality = 'high', pinReg = {};
  let frameCb = () => {}, firstBuild = true, clusterOff = {}, stepOf = {}, partNos = {}, lastView = 'iso';

  function mats() {
    const lcdCanvas = document.createElement('canvas'); lcdCanvas.width = 512; lcdCanvas.height = 128;
    const lcdTex = new THREE.CanvasTexture(lcdCanvas); lcdTex.encoding = THREE.sRGBEncoding; lcdTex.anisotropy = 4;
    const std = (color, rough, metal) => new THREE.MeshStandardMaterial({ color, roughness: rough == null ? 0.7 : rough, metalness: metal || 0 });
    // Vật liệu trong suốt là MeshPhysical để chế độ Realistic bật được khúc xạ (transmission) mà không đổi mesh
    const clear = (color, op) => new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: op, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
    return {
      formex: std(0xebe8e1, 0.85), formexBase: std(0xd3cfc5, 0.9), pet: clear(0xd9f0f7, 0.16), resPet: clear(0xe4eef2, 0.14),
      water: new THREE.MeshPhysicalMaterial({ color: 0x2a9fd0, transparent: true, opacity: 0.6, roughness: 0.12, depthWrite: false }),
      tube: new THREE.MeshPhysicalMaterial({ color: 0xf4f6f7, transparent: true, opacity: 0.5, roughness: 0.3, depthWrite: false }),
      black: std(0x1c1e21, 0.55), pcbBlue: std(0x1f5aa6, 0.55), pcbBlack: std(0x16181a, 0.5), pcbRed: std(0xa33333, 0.55),
      pcbRelay: std(0x1f5aa6, 0.55), pcbBuzz: std(0x1f5aa6, 0.55), pcbEsp: std(0x16181a, 0.5), chip: std(0x141516, 0.4), sticker: std(0xf2f2ee, 0.8),
      hdr: std(0x151515, 0.42), dupont: std(0x0e0e0e, 0.45), hole: new THREE.MeshBasicMaterial({ color: 0x060606 }), tin: std(0xdadde0, 0.25, 1), smd: std(0x202020, 0.5),
      ledOff: std(0xe8e2c8, 0.3), screw: std(0xc9cdd1, 0.3, 1), tantal: std(0xd9a514, 0.45), bezel: std(0x8e959c, 0.35, 0.85),
      cup: new THREE.MeshPhysicalMaterial({ color: 0xeef4f6, transparent: true, opacity: 0.45, roughness: 0.3 }),
      relayLabel: new THREE.MeshStandardMaterial({ map: decalTex('relay'), roughness: 0.3 }),
      breadboard: new THREE.MeshStandardMaterial({ map: decalTex('bread'), roughness: 0.8 }),
      grille: new THREE.MeshStandardMaterial({ map: decalTex('grille'), roughness: 0.55, metalness: 0.4 }),
      // Giấy đục: để ở lượt vẽ opaque thì nước (transmission) mới khúc xạ được thước phía sau
      ruler: new THREE.MeshStandardMaterial({ map: decalTex('ruler'), roughness: 0.85, side: THREE.DoubleSide }),
      // Kính chỉ phản chiếu (cộng sáng): mặt kính LCD, vạch mặt nước
      glass: new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, clearcoat: 1, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 1.4 }),
      menis: new THREE.MeshPhysicalMaterial({ color: 0xf4fbfc, roughness: 0.1, transparent: true, opacity: 0.6, depthWrite: false }),
      silver: std(0xc6cace, 0.35, 0.6), white: std(0xf0f0ee, 0.8), rubber: std(0x262626, 0.95), dark: std(0x0b0c0d, 0.9),
      gold: std(0xc8a548, 0.35, 0.6), termBlue: std(0x2d6fd0, 0.5), valve: std(0x2b6c8f, 0.5),
      hc: std(0x1f5aa6, 0.55), buzz: std(0x111111, 0.6),
      edge: new THREE.LineBasicMaterial({ color: 0x5b6472, transparent: true, opacity: 0.7 }),
      glassEdge: new THREE.LineBasicMaterial({ color: 0x4f9fbf, transparent: true, opacity: 0.75 }),
      drop: new THREE.MeshBasicMaterial({ color: 0x8fdcf7 }),
      ping: new THREE.MeshBasicMaterial({ color: 0x5fd4e8, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
      dim: new THREE.LineBasicMaterial({ color: 0xf0b429 }), meas: new THREE.LineBasicMaterial({ color: 0xffffff }),
      lowRing: new THREE.MeshBasicMaterial({ color: 0xf0b429 }), highRing: new THREE.MeshBasicMaterial({ color: 0x4cc38a }),
      wHc: std(0x6b7280, 0.6), wLeak: std(0xd4a72c, 0.6), wPump: std(0xc0392b, 0.6), wBlack: std(0x222222, 0.6), wGreen: std(0x2f9e5b, 0.6), wOrange: std(0xe07b28, 0.6), wWhite: std(0xe8e8e8, 0.6),
      pcbMega: std(0x1b5f9e, 0.5), relayBlue: std(0x2459b8, 0.45), capBlue: std(0x1d3f8f, 0.5), pcbGreen: std(0x2f7a3a, 0.55),
      mica: clear(0xeaf6fa, 0.35), micaBox: clear(0xeaf2f5, 0.22), abs: std(0xd9dbd5, 0.75),
      lcdCanvas, lcdTex, lcdScreen: new THREE.MeshBasicMaterial({ map: lcdTex }),
    };
  }

  function decalTex(kind) {
    if (kind === 'relay') return canvasTex(512, 384, (x, w, h) => { // nhãn in trên vỏ relay Songle
      x.fillStyle = '#1446b3'; x.fillRect(0, 0, w, h); x.fillStyle = '#f2f4f8'; x.textAlign = 'center';
      x.font = '700 64px Arial'; x.fillText('SONGLE', w / 2, 90); x.font = '700 46px Arial'; x.fillText('SRD-05VDC-SL-C', w / 2, 170);
      x.font = '400 34px Arial'; ['10A 250VAC 10A 125VAC', '10A 30VDC  10A 28VDC'].forEach((t, i) => x.fillText(t, w / 2, 245 + i * 50));
    });
    if (kind === 'bread') return canvasTex(1024, 662, (x, w, h) => { // test board: lưới lỗ 2,54 mm + vạch nguồn đỏ/xanh
      x.fillStyle = '#f3f1ea'; x.fillRect(0, 0, w, h); const px = w / 85, pitch = 2.54 * px;
      x.fillStyle = '#3c3c3c'; for (let c = 0; c < 32; c++) for (let r = 0; r < 20; r++) { if (r === 2 || r === 9 || r === 10 || r === 17) continue; x.fillRect(22 + c * pitch, 26 + r * pitch, pitch * 0.42, pitch * 0.42); }
      x.fillStyle = '#d03030'; x.fillRect(16, 14, w - 32, 4); x.fillRect(16, h - 18, w - 32, 4); x.fillStyle = '#2050c0'; x.fillRect(16, 20 + 2 * pitch, w - 32, 4); x.fillRect(16, h - 24 - 2 * pitch, w - 32, 4);
      x.fillStyle = '#d9d6cc'; x.fillRect(0, h / 2 - 8, w, 16);
    });
    if (kind === 'grille') return canvasTex(256, 256, (x, w, h) => { // lưới kim loại đầu dò siêu âm
      x.fillStyle = '#2b2d30'; x.fillRect(0, 0, w, h); x.fillStyle = '#0c0d0e';
      for (let j = 0; j < 22; j++) for (let i = 0; i < 22; i++) { x.beginPath(); x.arc(8 + i * 11.5 + (j % 2) * 5.7, 8 + j * 11.5, 4, 0, 7); x.fill(); }
    });
    return canvasTex(96, 2048, (x, w, h) => { // thước giấy mm dán dọc thân bình (0 ở đáy trong)
      x.fillStyle = '#fbfaf5'; x.fillRect(0, 0, w, h); x.fillStyle = '#222'; x.font = '700 19px Arial'; x.textAlign = 'left'; x.textBaseline = 'middle';
      const mm = h / 212; for (let v = 0; v <= 210; v++) { const y = h - 6 * mm - v * mm; const L = v % 10 ? (v % 5 ? 14 : 24) : 38; x.fillRect(0, y - 1, L, v % 10 ? 2 : 3); if (v % 20 === 0) x.fillText(String(v), 44, y); }
    });
  }

  // ---------- Chế độ hiển thị: 'cad' (sơ đồ 3D sạch) hoặc 'real' (vật liệu, ánh sáng gần đồ thật) ----------
  let look = 'cad', envTex = null, lab = null, lights = {}, realTex = null, rippleTex = null;
  // Texture vẽ bằng canvas: mạch in có chữ lụa, mặt bàn, gợn nước (không cần tải ảnh nên vẫn chạy offline)
  function canvasTex(w, h, draw, srgb) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); if (srgb !== false) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  }
  const noise = (x, w, h, n, a, col) => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${col},${Math.random() * a})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } };
  function silk(x, txt, px, py, size, col, align) { x.fillStyle = col || '#f4f4ef'; x.font = `700 ${size}px Arial, sans-serif`; x.textAlign = align || 'left'; x.textBaseline = 'middle'; x.fillText(txt, px, py); }
  function pcb(base, draw) { // tỉ lệ ảnh = tỉ lệ mặt trên của board
    return canvasTex(1024, 512, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); noise(x, w, h, 2500, 0.06, '0,0,0'); draw(x, w, h); });
  }
  function makeRealTex() {
    const header = (x, px, py, n, vertical) => { for (let i = 0; i < n; i++) { x.fillStyle = '#111'; x.fillRect(px + (vertical ? 0 : i * 26), py + (vertical ? i * 26 : 0), 24, 24); x.fillStyle = '#c9a74a'; x.fillRect(px + 8 + (vertical ? 0 : i * 26), py + 8 + (vertical ? i * 26 : 0), 8, 8); } };
    return {
      mega: pcb('#174f8f', (x, w, h) => {
        x.strokeStyle = 'rgba(8,30,70,.45)'; x.lineWidth = 3; for (let i = 0; i < 26; i++) { const y = 70 + Math.random() * (h - 140), x0 = 80 + Math.random() * 300; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + 120 + Math.random() * 400, y); x.lineTo(x0 + 160 + Math.random() * 400, y + (Math.random() - 0.5) * 80); x.stroke(); }
        header(x, 260, 14, 26); header(x, 180, h - 38, 30); header(x, w - 70, 80, 14, true);
        x.fillStyle = '#151515'; x.fillRect(470, 190, 150, 150); for (let i = 0; i < 25; i++) { x.fillStyle = '#bbb'; x.fillRect(476 + i * 5.6, 182, 2, 8); x.fillRect(476 + i * 5.6, 340, 2, 8); }
        silk(x, 'ARDUINO', 120, 250, 46); silk(x, 'MEGA 2560', 120, 300, 40); silk(x, 'ATMEGA2560', 545, 265, 14, '#9aa', 'center');
        x.fillStyle = '#e8e8e8'; for (const [hx, hy] of [[70, 90], [70, h - 90], [w - 120, 60]]) { x.beginPath(); x.arc(hx, hy, 14, 0, 7); x.fill(); } // mỗi lỗ một path: chung path thì fill() nối 3 cung thành tam giác
      }),
      relay: pcb('#1d55a8', (x, w, h) => { silk(x, 'SRD-05VDC-SL-C', w / 2, 60, 40, '#f4f4ef', 'center'); silk(x, 'NO  COM  NC', w - 220, h - 40, 30); silk(x, 'DC+ DC- IN', 40, h - 40, 30); }),
      hc: pcb('#1a4f9e', (x, w, h) => { silk(x, 'HC-SR04', w / 2, h / 2, 54, '#f4f4ef', 'center'); silk(x, 'T', 120, h - 50, 40); silk(x, 'R', w - 150, h - 50, 40); silk(x, 'VCC TRIG ECHO GND', w / 2, 60, 28, '#f4f4ef', 'center'); }),
      ws: pcb('#c4231d', (x, w, h) => { x.fillStyle = '#d9d9d6'; for (let i = 0; i < 10; i++) x.fillRect(20, 30 + i * 46, 640, 18); silk(x, 'S + -', w - 120, h / 2, 44, '#f4f4ef', 'center'); }),
      buzz: pcb('#1d55a8', (x, w, h) => silk(x, 'VCC I/O GND', 40, h - 60, 40)),
      esp: pcb('#121314', (x, w, h) => { x.strokeStyle = '#c9a74a'; x.lineWidth = 6; x.beginPath(); x.moveTo(40, 60); for (let i = 0; i < 6; i++) x.lineTo(40 + (i % 2 ? 160 : 0), 60 + i * 60); x.stroke(); silk(x, 'ESP-01', w - 260, h - 60, 44); }),
      foam: canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); noise(x, w, h, 6000, 0.35, '255,255,255'); noise(x, w, h, 6000, 0.35, '0,0,0'); }, false),
    };
  }
  function makeRipple() { // bản đồ pháp tuyến gợn nước: dịch theo thời gian trong sync()
    return canvasTex(256, 256, (x, w, h) => {
      const img = x.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const a = Math.sin(i / w * Math.PI * 6 + Math.sin(j / h * Math.PI * 4) * 1.5), b = Math.cos(j / h * Math.PI * 6 + Math.sin(i / w * Math.PI * 2) * 2);
        const k = (j * w + i) * 4; img.data[k] = 128 + a * 22; img.data[k + 1] = 128 + b * 22; img.data[k + 2] = 255; img.data[k + 3] = 255;
      }
      x.putImageData(img, 0, 0);
    }, false);
  }
  // Môi trường phản chiếu: bản giản lược của phòng lab bằng mảng màu tự phát sáng (không phụ thuộc đèn), cùng bố cục:
  // cửa sổ sáng bên trái, đèn LED trần, tường kem, bàn gỗ. Chụp thẳng phòng thật từ sát mặt bàn thì nửa dưới toàn gỗ nắng → mọi thứ ngả cam.
  function bakeEnv(B) {
    const s = new THREE.Scene(), k = 0.6, c = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r * k, g * k, b * k), side: THREE.BackSide }); // k < 1: để nắng cửa sổ là nguồn chính, bóng rõ khối
    const room = new THREE.Mesh(new THREE.BoxGeometry(B.W1 - B.W0, B.Y1 - B.Y0, B.Z1 - B.Z0), [c(0.24, 0.23, 0.22), c(0.3, 0.28, 0.26), c(0.36, 0.36, 0.35), c(0.11, 0.1, 0.1), c(0.2, 0.2, 0.19), c(0.32, 0.3, 0.28)]);
    room.position.set((B.W0 + B.W1) / 2, (B.Y0 + B.Y1) / 2, (B.Z0 + B.Z1) / 2); s.add(room);
    const panel = (w, h, col, x, y, z, rx, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...col), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); s.add(m); };
    panel(1700, 820, [0.2, 0.17, 0.13], 90, -11, -120, -Math.PI / 2); // mặt bàn
    for (const [z0, z1] of [[-420, 280], [300, 1000]]) panel(z1 - z0, 1230, [3.2, 3.3, 3.4], B.W0 + 10, 735, (z0 + z1) / 2, 0, Math.PI / 2); // hai cánh cửa sổ
    panel(600, 600, [2.2, 2.2, 2.1], 300, B.Y1 - 10, 500, Math.PI / 2); // đèn LED âm trần
    panel(900, 506, [0.7, 0.7, 0.68], 420, 600, B.Z0 + 12); // bảng treo dụng cụ
    const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(s, 0.02, 10, 12000); pm.dispose();
    s.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); return rt.texture;
  }
  // HDRI phòng thật (Poly Haven, CC0): phản chiếu trên nhựa trong, nước, kim loại, mạch in như ảnh chụp.
  // Mở index.html bằng file:// thì trình duyệt chặn đọc file → giữ môi trường dựng sẵn ở trên.
  // HDRI phòng sáng hơn môi trường cũ: hạ để nắng cửa sổ (đèn chính) vẫn tạo khối. Điểm cửa sổ sáng gấp hàng chục lần phần còn lại:
  // chặn trần để phản chiếu trên nhựa trong / ống silicone còn thấy được cửa sổ mà không cháy trắng che mất vật phía sau
  const ENV_GAIN = 0.45, ENV_MAX = 1.4;
  function loadHdri() {
    if (!THREE.RGBELoader) return;
    new THREE.RGBELoader().setDataType(THREE.FloatType).load('assets/env/small_empty_room_1_1k.hdr', (hdr) => {
      const px = hdr.image.data; for (let i = 0; i < px.length; i++) if (i % 4 !== 3) px[i] = Math.min(px[i] * ENV_GAIN, ENV_MAX);
      hdr.mapping = THREE.EquirectangularReflectionMapping; hdr.needsUpdate = true;
      const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromEquirectangular(hdr); pm.dispose(); hdr.dispose();
      envTex = rt.texture; if (look === 'real') scene.environment = envTex;
    }, undefined, () => {});
  }
  // Tham số từng vật liệu cho mỗi chế độ; mesh dùng chung vật liệu nên đổi tại chỗ là đủ
  function lookParams(real) {
    const T = realTex;
    const pcbP = (map) => (real ? { map, color: 0xffffff, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.55 } : { map: null, envMapIntensity: 1 });
    // Thành PET mỏng < 1 mm gần như không khúc xạ: chỉ vẽ phản chiếu (cộng sáng, nền đen), để nước bên trong
    // là vật thể transmission duy nhất. Hai lớp transmission chồng nhau trong r147 sẽ che mất nhau.
    const thinPet = (env) => (real ? { transmission: 0, opacity: 1, color: 0x000000, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: env, blending: THREE.AdditiveBlending, side: THREE.FrontSide } : null); // cộng sáng diễn ra sau mã hóa sRGB: giữ ít lớp, cường độ thấp
    return {
      pet: thinPet(0.35) || { opacity: 0.16, roughness: 0.1, color: 0xd9f0f7, envMapIntensity: 1, clearcoat: 0, blending: THREE.NormalBlending, side: THREE.DoubleSide },
      resPet: thinPet(0.35) || { opacity: 0.14, roughness: 0.1, color: 0xe4eef2, envMapIntensity: 1, clearcoat: 0, blending: THREE.NormalBlending, side: THREE.DoubleSide },
      // Mica 2–3 mm: như PET mỏng, chỉ phản chiếu (khúc xạ qua tấm phẳng mỏng gần như không thấy)
      mica: thinPet(0.6) || { opacity: 0.35, roughness: 0.1, color: 0xeaf6fa, envMapIntensity: 1, clearcoat: 0, blending: THREE.NormalBlending, side: THREE.DoubleSide },
      micaBox: thinPet(0.6) || { opacity: 0.22, roughness: 0.1, color: 0xeaf2f5, envMapIntensity: 1, clearcoat: 0, blending: THREE.NormalBlending, side: THREE.DoubleSide },
      // Nước trong: khúc xạ cảnh phía sau (thước, khay, bơm), ngả xanh lơ theo độ sâu
      // Nước: bán trong ngả xanh lơ nhạt + mặt gợn phản chiếu cửa sổ. Không dùng transmission: lượt khúc xạ của r147
      // vẽ lại cả cảnh mỗi khung, chậm gấp 2–5 lần trên GPU tích hợp
      // Chi tiết cao: nước khúc xạ thật (thước, khay, bơm phía sau bị bẻ cong và ngả xanh theo độ sâu) — chỉ nước dùng transmission, nhựa vẫn chỉ phản chiếu
      water: real && quality === 'high' ? { transmission: 1, opacity: 1, roughness: 0.03, color: 0xffffff, ior: 1.33, thickness: 30, attenuationColor: new THREE.Color(0x2f9cbf), attenuationDistance: 50, normalMap: rippleTex, normalScale: new THREE.Vector2(0.3, 0.3), specularIntensity: 1, envMapIntensity: 1.3 }
        : real ? { transmission: 0, opacity: 0.5, roughness: 0.02, color: 0x1a6680, normalMap: rippleTex, normalScale: new THREE.Vector2(0.3, 0.3), specularIntensity: 1, envMapIntensity: 1.6, thickness: 0, attenuationDistance: Infinity }
        : { transmission: 0, opacity: 0.6, roughness: 0.12, color: 0x2a9fd0, normalMap: null, thickness: 0, attenuationDistance: Infinity },
      // Silicone trong: bán trong, vẽ cả mặt trong để thấy lòng ống rỗng, phản chiếu bóng
      tube: real ? { transmission: 0, opacity: 0.24, roughness: 0.1, color: 0xe6eff0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.6, side: THREE.DoubleSide } : { transmission: 0, opacity: 0.5, roughness: 0.3, color: 0xf4f6f7, clearcoat: 0, envMapIntensity: 1, side: THREE.FrontSide },
      formex: real ? { color: 0xe9e8e3, roughness: 0.9, bumpMap: T.foam, bumpScale: 0.05, envMapIntensity: 0.55 } : { color: 0xebe8e1, roughness: 0.85, bumpMap: null, envMapIntensity: 1 },
      formexBase: real ? { color: 0xe6e5df, roughness: 0.92, bumpMap: T.foam, bumpScale: 0.05, envMapIntensity: 0.55 } : { color: 0xd3cfc5, roughness: 0.9, bumpMap: null, envMapIntensity: 1 },
      abs: real ? { color: 0xd8d9d5, roughness: 0.55, bumpMap: T.foam, bumpScale: 0.08 } : { color: 0xd9dbd5, roughness: 0.75, bumpMap: null },
      pcbBlue: real ? { color: 0x123f8a, roughness: 0.5, envMapIntensity: 0.55 } : { color: 0x1f5aa6, roughness: 0.55, envMapIntensity: 1 },
      pcbGreen: real ? { color: 0x1f5e2a, roughness: 0.5, envMapIntensity: 0.55 } : { color: 0x2f7a3a, roughness: 0.55, envMapIntensity: 1 },
      pcbMega: pcbP(T.mega), pcbRelay: pcbP(T.relay), hc: pcbP(T.hc), pcbRed: pcbP(T.ws), pcbBuzz: pcbP(T.buzz), pcbEsp: pcbP(T.esp),
      silver: real ? { roughness: 0.22, metalness: 1 } : { roughness: 0.35, metalness: 0.6 },
      gold: real ? { roughness: 0.25, metalness: 1 } : { roughness: 0.35, metalness: 0.6 },
      black: real ? { color: 0x121315, roughness: 0.5 } : { color: 0x1c1e21, roughness: 0.55 },
      // Dây PVC và vỏ relay thật có màu bão hòa, bóng nhẹ; tone mapping làm nhạt nên tăng màu riêng cho chế độ này
      wHc: real ? { color: 0x5a5f66, roughness: 0.4 } : { color: 0x6b7280, roughness: 0.6 }, wLeak: real ? { color: 0xe8b400, roughness: 0.35 } : { color: 0xd4a72c, roughness: 0.6 },
      wPump: real ? { color: 0xd8141b, roughness: 0.35 } : { color: 0xc0392b, roughness: 0.6 }, wBlack: real ? { color: 0x141414, roughness: 0.35 } : { color: 0x222222, roughness: 0.6 },
      wGreen: real ? { color: 0x139a3c, roughness: 0.35 } : { color: 0x2f9e5b, roughness: 0.6 }, wOrange: real ? { color: 0xf06a00, roughness: 0.35 } : { color: 0xe07b28, roughness: 0.6 }, wWhite: { roughness: real ? 0.38 : 0.6 },
      relayBlue: real ? { color: 0x0f3a9e, roughness: 0.45, envMapIntensity: 0.35 } : { color: 0x2459b8, roughness: 0.45, envMapIntensity: 1 }, termBlue: real ? { color: 0x1450c8, roughness: 0.35 } : { color: 0x2d6fd0, roughness: 0.5 }, valve: real ? { color: 0x1257d6, roughness: 0.3 } : { color: 0x2b6c8f, roughness: 0.5 },
    };
  }
  const lod = (o, level) => { o.userData.lod = level; return o; };
  // Hiện/ẩn theo mức chi tiết: 'cad' chỉ ở 3D; 'fine' chỉ ở Thực tế; 'micro' chỉ ở Thực tế chất lượng cao
  function applyLod() {
    if (!rootG) return; const real = look === 'real', hq = quality === 'high';
    rootG.traverse((o) => { const l = o.userData.lod; if (l) o.visible = l === 'cad' ? !real : l === 'fine' ? real : real && hq; });
  }
  // Thực tế nặng hơn (bóng mềm VSM, phòng lab): trần 1,5× thay vì 2× giảm ~44 % số điểm ảnh, mắt khó thấy khác
  function applyPR() {
    const pr = quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, look === 'real' ? 1.5 : 2);
    if (renderer.getPixelRatio() !== pr) { renderer.setPixelRatio(pr); resize(); }
  }
  // Bóng chỉ vẽ lại khi có vật đổ bóng đổi chỗ/ẩn hiện (tháo rời, lắp ráp, ẩn bộ phận, van), không phải mỗi khung hình
  const shadowDirty = () => { if (renderer) renderer.shadowMap.needsUpdate = true; };
  function setQuality(q) {
    quality = q === 'low' ? 'low' : 'high';
    applyPR();
    const sz = quality === 'low' ? 1024 : 2048; if (lights.sun.shadow.mapSize.x !== sz) { lights.sun.shadow.mapSize.set(sz, sz); if (lights.sun.shadow.map) { lights.sun.shadow.map.dispose(); lights.sun.shadow.map = null; } }
    if (lab) lab.setQuality(quality === 'high');
    resize(); shadowDirty(); if (realTex) setLook(look); else applyLod();
  }
  function placeLab() { if (lab && rootG) { const b = new THREE.Box3().setFromObject(rootG); if (!b.isEmpty()) lab.place(b, scene.userData.ground.position.y); } }
  function setLook(name) {
    const prev = look; look = name === 'real' ? 'real' : 'cad';
    const real = look === 'real';
    if (real && !realTex) { realTex = makeRealTex(); rippleTex = makeRipple(); rippleTex.wrapS = rippleTex.wrapT = THREE.RepeatWrapping; rippleTex.repeat.set(3, 3); realTex.foam.wrapS = realTex.foam.wrapT = THREE.RepeatWrapping; realTex.foam.repeat.set(10, 10); }
    if (real && !lab) {
      lab = Lab3D(THREE, canvasTex, noise); scene.add(lab.group); placeLab(); lab.setQuality(quality === 'high');
      // Texture Codex nhúng base64 (~330 KB): chỉ tải khi bật Thực tế lần đầu; lỗi thì giữ texture canvas
      const sc = document.createElement('script'); sc.src = 'js/lab-tex.js'; sc.onload = () => { if (window.LAB_TEX) lab.useImages(window.LAB_TEX); }; document.head.appendChild(sc);
    }
    if (realTex) { const P = lookParams(real);
      for (const k in P) { const m = M[k]; if (!m) continue; for (const p in P[k]) { if (m[p] && m[p].isColor) m[p].set(P[k][p]); else m[p] = P[k][p]; } m.needsUpdate = true; } }
    if (lab) lab.group.visible = real;
    scene.userData.grid.visible = !real; scene.userData.ground.visible = !real;
    // Ánh sáng kiểu chụp sản phẩm trong phòng: nắng tán xạ qua cửa sổ trái (đèn chính, bóng mềm), trời + mặt bàn gỗ hắt (fill), phòng (IBL)
    const L = lights;
    L.sun.position.set(...(real ? [-1150, 1150, 420] : [380, 900, 560])); L.sun.color.set(real ? 0xfff0dc : 0xffffff); L.sun.intensity = real ? 0.75 : 1.0; // trong Thực tế phần nắng còn lại do đèn chiếu vệt lá (lab3d)
    L.hemi.color.set(real ? 0xeef2f6 : 0xf2f6fa); L.hemi.groundColor.set(real ? 0xb39472 : 0x6b7584); L.hemi.intensity = real ? 0.12 : 0.62;
    L.fill.position.set(...(real ? [900, 500, 900] : [-600, 300, -400])); L.fill.color.set(real ? 0xe4ecff : 0xa9cdf2); L.fill.intensity = real ? 0.32 : 0.3;
    L.sun.shadow.radius = real ? 5 : 1; L.sun.shadow.blurSamples = 12; shadowDirty(); applyPR();
    const st = real ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap; // VSM: bóng nắng mềm thật (PCFSoft bỏ qua radius)
    if (renderer.shadowMap.type !== st) { renderer.shadowMap.type = st; if (L.sun.shadow.map) { L.sun.shadow.map.dispose(); L.sun.shadow.map = null; } scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((mm) => { mm.needsUpdate = true; }); }); }
    renderer.toneMapping = real ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping; renderer.toneMappingExposure = real ? 0.8 : 1;
    if (real && !envTex) { envTex = bakeEnv(lab.bounds); loadHdri(); } // dùng ngay môi trường dựng sẵn, HDRI thật thay vào khi tải xong
    scene.environment = real ? envTex : null;
    // Camera không chui xuống gầm bàn, không lùi ra khỏi phòng
    controls.maxPolarAngle = Math.PI * (real ? 0.485 : 0.88); controls.maxDistance = real ? 2300 : 4000;
    M.edge.visible = !real; M.glassEdge.opacity = real ? 0.35 : 0.75; // đường viền kỹ thuật tắt khi xem như đồ thật
    host.dataset.look = look;
    applyLod();
    if (prev !== look && lastView === 'iso' && model) view('iso'); // mỗi kiểu có bố cục mặc định riêng
  }

  function init(el) {
    host = el;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0x000000, 0); // nền do CSS .stage-view vẽ (gradient sáng)
    el.appendChild(renderer.domElement);
    overlay = document.createElement('div'); overlay.className = 'ov'; el.appendChild(overlay);
    tip = document.createElement('div'); tip.className = 'ov-tip'; tip.hidden = true; el.appendChild(tip);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(36, 1, 5, 20000);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.09; controls.maxPolarAngle = Math.PI * 0.88; controls.minDistance = 120; controls.maxDistance = 4000;
    controls.addEventListener('start', () => { tween = null; });
    M = mats();
    P3 = Parts3D({ THREE, M, box, cyl, at, led, pin: (key, obj, v, kind, dir) => { pinReg[key] = { obj, v, kind, dir }; } });
    lights.hemi = new THREE.HemisphereLight(0xf2f6fa, 0x6b7584, 0.62); scene.add(lights.hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0); sun.position.set(380, 900, 560); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -700, right: 700, top: 700, bottom: -700, near: 100, far: 2500 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0005; // không cập nhật thì vùng bóng chỉ ±5 mm (mặc định)
    scene.add(sun); lights.sun = sun;
    const fill = new THREE.DirectionalLight(0xa9cdf2, 0.3); fill.position.set(-600, 300, -400); scene.add(fill); lights.fill = fill;
    // Sàn chỉ nhận bóng (trong suốt) để nền gradient CSS lộ ra, lưới mảnh kiểu trình xem CAD
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.ShadowMaterial({ opacity: 0.22 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = 'ground'; scene.add(ground);
    const grid = new THREE.GridHelper(3000, 60, 0xc3cad4, 0xd5dbe3); grid.position.y = 0.2; scene.add(grid);
    scene.userData.ground = ground; scene.userData.grid = grid;
    new ResizeObserver(resize).observe(el); resize();

    let down = null;
    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    cv.addEventListener('pointerup', (e) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) click(e); down = null; });
    cv.addEventListener('pointermove', (e) => hover(e));
    cv.addEventListener('pointerleave', () => { tip.hidden = true; hoverId = null; });
    requestAnimationFrame(loop);
  }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // ---------- dựng hình ----------
  function edgesOf(g, geo, mesh, mat) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat || M.edge); e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); g.add(e); }
  // Đồ thật không có cạnh sắc 90°: tấm Formex, hộp ABS, mica, vỏ relay được bo ~1 mm để cạnh bắt sáng như ngoài đời.
  // Không bo vật liệu có hình in (mạch in, nhãn): UV của khối bo khác hộp vuông làm lệch hình.
  let bevelMats = null;
  function box(g, w, h, d, mat, cx, y0, cz, edges) {
    if (!bevelMats) bevelMats = new Set([M.formex, M.formexBase, M.abs, M.mica, M.micaBox, M.valve, M.relayBlue, M.black, M.rubber, M.white]);
    const mn = Math.min(w, h, d), bevel = THREE.RoundedBoxGeometry && bevelMats.has(mat) && mn >= 2.5 && Math.max(w, h, d) >= 12;
    const geo = bevel ? new THREE.RoundedBoxGeometry(w, h, d, 2, Math.min(1.2, mn * 0.3)) : new THREE.BoxGeometry(w, h, d), mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, y0 + h / 2, cz); mesh.castShadow = !mat.transparent; mesh.receiveShadow = true; g.add(mesh);
    if (edges) { const eg = bevel ? new THREE.BoxGeometry(w, h, d) : geo; edgesOf(g, eg, mesh); if (bevel) eg.dispose(); } // nét CAD vẫn theo hộp vuông
    return mesh;
  }
  function cyl(g, r, h, mat, cx, y0, cz, seg, open) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 24, 1, !!open), mat);
    mesh.position.set(cx, y0 + h / 2, cz); mesh.castShadow = !mat.transparent; g.add(mesh); return mesh;
  }
  function ring(g, r, t, mat, x, y, z, rotX, rotY) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 64), mat); mesh.position.set(x, y, z);
    mesh.rotation.x = rotX == null ? Math.PI / 2 : rotX; if (rotY) mesh.rotation.y = rotY; g.add(mesh); return mesh;
  }
  function tubeAlong(g, pts, r, mat, curve) {
    const c = curve || new THREE.CatmullRomCurve3(pts.map(V), false, 'centripetal');
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(40, pts.length * 30), r, 10), mat); mesh.castShadow = !mat.transparent; g.add(mesh); return c;
  }
  function part(id) {
    const g = new THREE.Group(); g.userData.part = id; rootG.add(g);
    const d = model.parts[id];
    parts[id] = { g, explode: V(d.explode), cluster: d.cluster };
    return g;
  }

  // ---- Linh kiện điện tử: vẽ trong hệ toạ độ cục bộ (X = chiều dài), đặt bằng {x,y,z,rot} ----
  function at(g, P, rotY) { const s = new THREE.Group(); s.position.set(P.x, P.y || 0, P.z); s.rotation.y = rotY != null ? rotY : (P.rot || 0); g.add(s); return s; }
  function led(g, x, y, z, off) { const l = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), new THREE.MeshBasicMaterial({ color: off })); l.position.set(x, y, z); g.add(l); return l; }
  function build(m) {
    model = m;
    if (rootG) { scene.remove(rootG); rootG.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    labels.concat(dimLabels, measureLabels).forEach((l) => { l.el.remove(); if (l.lead) l.lead.remove(); });
    labels = []; dimLabels = []; measureLabels = []; mPts = []; parts = {}; dyn = { leds: {} }; pinReg = {};
    rootG = new THREE.Group(); scene.add(rootG);
    clusterOff = Object.fromEntries(m.CLUSTERS.map((c) => [c.id, V(c.off)]));
    stepOf = {}; m.steps.forEach((s, i) => s.parts.forEach((id) => { stepOf[id] = i; }));
    const T = m.T, p = m.p, has = (id) => !!m.parts[id];
    const gy = m.base ? -T - 6 : -0.3;
    scene.userData.ground.position.y = gy; scene.userData.grid.position.y = gy + 0.3;
    let g;

    if (has('base')) {
      g = part('base');
      box(g, m.base.L, T, m.base.W, M.formexBase, 0, -T, 0, true);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 10, 6, M.rubber, sx * (m.base.L / 2 - 25), -T - 6, sz * (m.base.W / 2 - 25));
    }
    if (has('platform')) {
      const P = m.plat, wallH = p.platformH - T;
      g = part('platform');
      box(g, P.X, T, P.Z, M.formex, P.x, p.platformH - T, P.z, true);
      box(g, T, wallH, P.Z, M.formex, P.x - P.X / 2 + T / 2, 0, P.z, true);
      box(g, T, wallH, P.Z, M.formex, P.x + P.X / 2 - T / 2, 0, P.z, true);
      box(g, P.X - 2 * T, wallH, T, M.formex, P.x, 0, P.z - P.Z / 2 + T / 2, true);
    }
    if (has('splash')) { g = part('splash'); box(g, T, m.splash.h, m.splash.len, M.formex, m.splash.x, 0, 0, true); }
    if (has('lcdPanel')) {
      const Lp = m.E.lcdPanel, w = Lp.w, h = Lp.h, ww = m.SPEC.lcd.winL, wh = m.SPEC.lcd.winW, cy = 42;
      g = part('lcdPanel');
      box(g, w, cy - wh / 2, T, M.formex, Lp.x, 0, Lp.z, true);
      box(g, w, h - cy - wh / 2, T, M.formex, Lp.x, cy + wh / 2, Lp.z, true);
      box(g, (w - ww) / 2, wh, T, M.formex, Lp.x - (w + ww) / 4, cy - wh / 2, Lp.z, true);
      box(g, (w - ww) / 2, wh, T, M.formex, Lp.x + (w + ww) / 4, cy - wh / 2, Lp.z, true);
    }

    // Khay hứng
    const Tr = m.tray;
    g = part('tray');
    box(g, Tr.outX, T, Tr.outZ, M.formex, Tr.x, Tr.y, Tr.z, true);
    for (const s of [-1, 1]) box(g, T, Tr.wallH, Tr.outZ, M.formex, Tr.x + s * (Tr.outX / 2 - T / 2), Tr.y + T, Tr.z, true);
    for (const s of [-1, 1]) box(g, Tr.outX - 2 * T, Tr.wallH, T, M.formex, Tr.x, Tr.y + T, Tr.z + s * (Tr.outZ / 2 - T / 2), true);
    dyn.trayWater = box(g, Tr.inX - 0.5, 1, Tr.inZ - 0.5, M.water, Tr.x, Tr.y + T, Tr.z); dyn.trayWater.renderOrder = 1;

    // Water Sensor
    const W = m.wsPlate;
    g = part('ws');
    dyn.leds.ws = P3.ws(g, W);

    // Bình chứa
    const Tk = m.tank;
    g = part('tank');
    // Vỏ bình là một khối tiện tròn có độ dày thành, đáy bo và gờ miệng: khúc xạ đúng hai mặt nhựa
    const rO = Tk.OD / 2, rI = rO - Math.max(1.2, Tk.wall), cR = 3.5, rimH = Tk.rim - Tk.y0;
    const prof = [[rI - cR, Tk.wall], [rI, Tk.wall + cR], [rI, rimH], [rO + 1.4, rimH], [rO + 1.4, rimH - 2.4], [rO, rimH - 2.4], [rO, cR], [rO - cR, 0]].map(([r, y]) => new THREE.Vector2(r, y));
    const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), M.pet); shell.position.set(Tk.x, Tk.y0, Tk.z); shell.renderOrder = 3; g.add(shell);
    // Đáy phẳng là hai đĩa riêng: điểm profile nằm trên trục tiện làm pháp tuyến suy biến → vệt sáng nan quạt dưới đáy
    for (const [r, y, rx] of [[rI - cR, Tk.wall, -Math.PI / 2], [rO - cR, 0, Math.PI / 2]]) { const d = new THREE.Mesh(new THREE.CircleGeometry(r, 72), M.pet); d.rotation.x = rx; d.position.set(Tk.x, Tk.y0 + y, Tk.z); d.renderOrder = 3; g.add(d); }
    lod(ring(g, rO, 0.9, M.glassEdge, Tk.x, Tk.rim, Tk.z), 'cad'); lod(ring(g, rO, 0.7, M.glassEdge, Tk.x, Tk.y0 + 0.5, Tk.z), 'cad');
    for (let h = 0; h <= m.usableH; h += 10) { const a = -2.4; lod(box(g, h % 50 ? 4 : 9, 0.6, 0.8, M.silver, Tk.x + Math.cos(a) * (rO + 0.4), Tk.yIn + h, Tk.z - Math.sin(a) * (rO + 0.4)), 'cad').rotation.y = a; }
    // Thước giấy mm dán dọc thân (như hướng dẫn lắp), vạch 0 trùng đáy trong
    const th0 = Math.atan2(Math.cos(-2.4), -Math.sin(-2.4)), rul = new THREE.Mesh(new THREE.CylinderGeometry(rO + 0.25, rO + 0.25, 212, 16, 1, true, th0 - 0.17, 0.34), M.ruler);
    rul.position.set(Tk.x, Tk.yIn - 6 + 106, Tk.z); g.add(lod(rul, 'fine'));
    if (m.has.drain) ring(g, 4.2, 0.9, M.dark, Tk.x - Tk.OD / 2, Tk.yIn + m.drainH, Tk.z, 0, Math.PI / 2);
    if (m.has.overflow) ring(g, 4.2, 0.9, M.dark, Tk.x, Tk.yIn + m.overflowH, Tk.z - Tk.OD / 2, 0);
    dyn.tankWater = cyl(g, p.tankD / 2 - 0.3, 1, M.water, Tk.x, Tk.yIn, Tk.z, 56); dyn.tankWater.renderOrder = 1;
    dyn.menis = lod(ring(g, p.tankD / 2 - 0.9, 0.9, M.menis, Tk.x, 0, Tk.z), 'fine'); // vạch sáng mặt nước bám thành bình (meniscus)
    dyn.lowRing = ring(g, Tk.OD / 2 + 1.2, 0.8, M.lowRing, Tk.x, 0, Tk.z);
    dyn.highRing = ring(g, Tk.OD / 2 + 1.2, 0.8, M.highRing, Tk.x, 0, Tk.z);

    // Giá đỡ + HC-SR04
    const B = m.bridge, bt = B.t, bmat = m.variant === 'simple' ? M.mica : M.formex;
    g = part('bridge');
    box(g, B.l, bt, B.w, bmat, B.x, B.y, B.z, true);
    for (const h of B.holes) { const c = new THREE.Mesh(new THREE.CircleGeometry(h.d / 2, 32), M.dark); c.rotation.x = -Math.PI / 2; c.position.set(B.x + h.x, B.y + bt + 0.1, B.z + h.z); g.add(c); }
    for (const s of [-1, 1]) box(g, bt, 10, 15, bmat, B.x + s * (Tk.OD / 2 + bt / 2 + 0.5), B.y - 10, B.z, true);
    g = part('hcsr04');
    const yP = B.y + bt;
    P3.hcsr04(g, Tk.x, yP, Tk.z, m.SPEC.hc);

    // Bình / hộp nguồn + bơm
    const R = m.res;
    g = part('reservoir');
    // Hộp nhựa thực phẩm: thành bo góc R14, đáy 1,5 mm, gờ miệng (đúng kích thước lòng hộp trong thông số)
    const rr = (L, W, r) => { const sh = new THREE.Shape(), x0 = -L / 2, y0 = -W / 2; sh.moveTo(x0 + r, y0); sh.lineTo(x0 + L - r, y0); sh.quadraticCurveTo(x0 + L, y0, x0 + L, y0 + r); sh.lineTo(x0 + L, y0 + W - r); sh.quadraticCurveTo(x0 + L, y0 + W, x0 + L - r, y0 + W); sh.lineTo(x0 + r, y0 + W); sh.quadraticCurveTo(x0, y0 + W, x0, y0 + W - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0); return sh; };
    const ext = (sh, d) => { const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 8 }); geo.rotateX(-Math.PI / 2); return geo; };
    const ring2 = (L, W, r, t) => { const sh = rr(L + 2 * t, W + 2 * t, r + t); sh.holes.push(rr(L, W, r)); return sh; };
    const resMesh = (geo, y) => { const me = new THREE.Mesh(geo, M.resPet); me.position.set(R.x, y, R.z); me.renderOrder = 2; g.add(me); return me; };
    resMesh(ext(ring2(R.L, R.W, 14, 1.5), R.H), 0); resMesh(ext(rr(R.L + 3, R.W + 3, 15.5), 1.5), 0); resMesh(ext(ring2(R.L + 3, R.W + 3, 15.5, 3), 2.5), R.H - 2.5);
    const rb = new THREE.BoxGeometry(R.L, R.H, R.W), rbe = new THREE.LineSegments(new THREE.EdgesGeometry(rb), M.glassEdge); rbe.position.set(R.x, R.H / 2, R.z); g.add(lod(rbe, 'cad')); rb.dispose();
    const wgeo = ext(rr(R.L - 0.6, R.W - 0.6, 13.6), 1); wgeo.translate(0, -0.5, 0);
    dyn.resWater = new THREE.Mesh(wgeo, M.water); dyn.resWater.position.set(R.x, 1.5, R.z); dyn.resWater.renderOrder = 1; g.add(dyn.resWater);
    const Pu = m.pump;
    g = part('pump');
    const pin = new THREE.Group(); g.add(pin); dyn.pumpInner = pin;
    P3.pump(pin, Pu);

    // Ống + van
    dyn.curves = {};
    const tubeIds = { pump: 'tubePump', drain: 'tubeDrain', overflow: 'tubeOverflow' };
    for (const k in m.tubes) { g = part(tubeIds[k]); dyn.curves[k] = tubeAlong(g, m.tubes[k].pts, m.SPEC.tube.od / 2, M.tube); }
    dyn.valveLever = null;
    if (has('valve')) {
      g = part('valve');
      const va = m.tubes.drain.valveAt;
      box(g, 12, 12, 16, M.valve, va[0], va[1] - 6, va[2]);
      const lev = new THREE.Group(); lev.position.set(va[0], va[1] + 6, va[2]); g.add(lev);
      box(lev, 3, 3, 22, M.valve, 0, 0, 9); dyn.valveLever = lev;
    }

    // Mạch điều khiển
    const E = m.E;
    if (has('megaBox')) {
      g = part('megaBox');
      const MB = m.SPEC.megaBox, mb = new THREE.BoxGeometry(MB.l, MB.h, MB.w);
      const mesh = new THREE.Mesh(mb, M.micaBox); mesh.position.set(E.megaBox.x, MB.h / 2, E.megaBox.z); mesh.renderOrder = 2; g.add(mesh); edgesOf(g, mb, mesh, M.glassEdge);
    }
    if (has('ctrlBox')) {
      const c = m.ctl, wl = c.wall, hb = c.H - wl;
      g = part('ctrlBox');
      box(g, c.W, wl, c.L, M.abs, c.x, 0, c.z, true);
      for (const s of [-1, 1]) { box(g, wl, hb, c.L, M.abs, c.x + s * (c.W / 2 - wl / 2), 0, c.z, true); box(g, c.W - 2 * wl, hb, wl, M.abs, c.x, 0, c.z + s * (c.L / 2 - wl / 2), true); }
      for (const z of [-60, -20, 20]) { const h = new THREE.Mesh(new THREE.CircleGeometry(4, 20), M.dark); h.rotation.y = -Math.PI / 2; h.position.set(c.x - c.W / 2 - 0.1, 40, z); g.add(h); }
      g = part('ctrlLid');
      const wz = E.lcd.z, ww = m.SPEC.lcd.winL, wh = m.SPEC.lcd.winW, y0 = c.H - wl;
      box(g, c.W, wl, (wz - ww / 2) - (c.z - c.L / 2), M.abs, c.x, y0, ((c.z - c.L / 2) + (wz - ww / 2)) / 2, true);
      box(g, c.W, wl, (c.z + c.L / 2) - (wz + ww / 2), M.abs, c.x, y0, ((c.z + c.L / 2) + (wz + ww / 2)) / 2, true);
      for (const s of [-1, 1]) box(g, (c.W - wh) / 2, wl, ww, M.abs, c.x + s * (c.W + wh) / 4, y0, wz, true);
    }
    g = part('mega'); Object.assign(dyn.leds, P3.mega(g, E.mega, m.SPEC.mega));
    g = part('relay'); dyn.leds.relay = P3.relay(g, E.relay);
    g = part('espKit'); dyn.leds.esp = P3.espKit(g, E.tb, E.tb);
    g = part('buzzer'); dyn.buzz = P3.buzzer(g, E.buzz);
    g = part('power'); P3.power(g, E.jack);
    g = part('lcd');
    if (E.lcd.face === 'front') P3.lcd(g, { x: E.lcd.x, y: E.lcd.y, z: E.lcdPanel.z - T / 2 - 0.5 }, 'front');
    else P3.lcd(g, { x: E.lcd.x, y: E.lcd.y - 0.5, z: E.lcd.z, rot: Math.PI / 2 }, 'up');

    // Dây
    g = part('wires');
    wireUp(g, m);

    rootG.traverse((o) => { let q = o; while (q && !q.userData.part) q = q.parent; if (q) o.userData.pid = q.userData.part; });

    // Hiệu ứng động
    fxG = new THREE.Group(); rootG.add(fxG);
    const dropGeo = new THREE.SphereGeometry(2.3, 8, 6);
    dyn.flows = {};
    for (const k in m.tubes) {
      const grp = new THREE.Group(); fxG.add(grp);
      const n = Math.max(8, Math.round(m.tubes[k].len / 40));
      for (let i = 0; i < n; i++) grp.add(new THREE.Mesh(dropGeo, M.drop));
      dyn.flows[k] = { grp, n, u: 0, len: dyn.curves[k].getLength() };
    }
    dyn.stream = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1, 10), M.water); fxG.add(dyn.stream);
    // Vòng sóng lan ra nơi dòng bơm chạm mặt nước: nhìn từ xa vẫn biết bình đang được cấp nước
    dyn.splash = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.visible = false; fxG.add(r); return r; });
    dyn.leakDrops = new THREE.Group(); fxG.add(dyn.leakDrops);
    for (let i = 0; i < 3; i++) dyn.leakDrops.add(new THREE.Mesh(dropGeo, M.drop));
    dyn.ping = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), M.ping); dyn.ping.rotation.x = -Math.PI / 2; fxG.add(dyn.ping);
    contactShadows(m);
    fxG.traverse((o) => { o.userData.fx = true; });

    // Bóng số kiểu bản vẽ lắp: đánh số theo thứ tự cụm, cây bộ phận dùng cùng số (partNo)
    const ci = Object.fromEntries(Design.CLUSTERS.map((c, i) => [c.id, i]));
    partNos = {};
    Object.keys(m.parts).sort((a, b) => ci[m.parts[a].cluster] - ci[m.parts[b].cluster]).forEach((id, i) => { partNos[id] = i + 1; });
    for (const id in m.parts) {
      const lead = document.createElement('i'); lead.className = 'ov-lead'; overlay.appendChild(lead);
      labels.push({ el: mkLabel('ov-label', m.parts[id].name, id), lead, pos: V(m.parts[id].anchor), id });
    }

    dimsG = new THREE.Group(); rootG.add(dimsG);
    const dotGeo = new THREE.SphereGeometry(1.6, 8, 6);
    for (const d of m.dims3d) {
      const a = V(d.a), b = V(d.b), o = V(d.off), a2 = a.clone().add(o), b2 = b.clone().add(o);
      dimsG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([a, a2, b, b2, a2, b2]), M.dim));
      for (const q of [a2, b2]) { const dm = new THREE.Mesh(dotGeo, M.lowRing); dm.position.copy(q); dimsG.add(dm); }
      dimLabels.push({ el: mkLabel('ov-dim', d.label), pos: a2.clone().add(b2).multiplyScalar(0.5) });
    }
    dimsG.traverse((o) => { o.userData.fx = true; });
    measureG = new THREE.Group(); rootG.add(measureG);

    applyLod(); applyClip(); placeLab(); shadowDirty();
    selBox = null; if (selected && !parts[selected]) selected = null;
    if (hidden.size) [...hidden].forEach((id) => { if (!parts[id]) hidden.delete(id); });
    if (isolated && !parts[isolated]) isolated = null;
    if (selected) select(selected);
    lcdText = '';
    view('iso', true);
  }

  // ---- Bóng tiếp xúc: vệt tối mềm ngay dưới khối đặt trên bàn / trên đế (ánh sáng trời bị che), thứ làm vật "nằm" trên mặt thay vì lơ lửng ----
  // Vẽ một lần lúc dựng, không tốn khung hình; nằm trong fxG nên ẩn khi tháo rời / đang lắp.
  let blobTex = null;
  function contactShadows(m) {
    if (!blobTex) { // lõi đen chiếm ~2/3 ô, mờ dần ra mép; bình tròn dùng vệt tròn
      const blob = (round) => canvasTex(256, 256, (x) => { x.filter = 'blur(18px)'; x.fillStyle = '#000'; x.beginPath(); if (round) x.arc(128, 128, 84, 0, 7); else x.rect(44, 44, 168, 168); x.fill(); }, false);
      blobTex = { rect: blob(false), round: blob(true) };
    }
    rootG.updateMatrixWorld(true);
    for (const id of ['base', 'platform', 'tray', 'reservoir', 'tank', 'megaBox', 'ctrlBox', 'splash', 'lcdPanel']) {
      if (!parts[id]) continue;
      const b = new THREE.Box3().setFromObject(parts[id].g); if (b.isEmpty()) continue;
      const sx = b.max.x - b.min.x, sz = b.max.z - b.min.z, pad = 1.6; // lõi ≈ đáy vật, phần mờ tràn ra ngoài
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(sx * pad, sz * pad), new THREE.MeshBasicMaterial({ map: id === 'tank' ? blobTex.round : blobTex.rect, color: 0x000000, transparent: true, opacity: id === 'base' ? 0.32 : 0.42, depthWrite: false }));
      pl.rotation.x = -Math.PI / 2; pl.position.set((b.min.x + b.max.x) / 2, b.min.y + 0.25, (b.min.z + b.max.z) / 2); pl.renderOrder = -1; fxG.add(pl);
    }
  }

  // ---------- Đi dây theo bảng đấu nối (Design.pins) ----------
  // Mỗi đầu dây cắm đúng chân đã đăng ký trong Parts3D: chân đực → đầu Dupont cái chụp lên; header cái / lỗ breadboard → đầu Dupont đực;
  // lỗ vít domino, cầu đấu relay → dây trần luồn ngang vào lỗ. Cáp dài (HC-SR04, Water Sensor, bơm) giữ lộ trình trong bản vẽ rồi tách sợi ở hai đầu.
  const WIRE = { red: 0xd11a1a, black: 0x151515, yellow: 0xe8c000, green: 0x15a043, orange: 0xf07000, blue: 0x1f5fd6, brown: 0x7a4a1e, white: 0xeeeeea, grey: 0x8a8f96, violet: 0xb48ce8, pink: 0xf07ab0 };
  const wireMat = {};
  const wm = (c) => (wireMat[c] = wireMat[c] || new THREE.MeshStandardMaterial({ color: WIRE[c], roughness: 0.4 }));
  const UP = new THREE.Vector3(0, 1, 0);
  function pinAt(key) {
    const r = pinReg[key]; if (!r) return null;
    const p = r.obj.localToWorld(r.v.clone()), d = r.obj.localToWorld(r.v.clone().add(r.dir)).sub(p).normalize();
    return { p, d, kind: r.kind, key };
  }
  function housing(g, at, dir, len, mat) { // đầu Dupont: khối 2,5 × 2,5 × len theo hướng dây
    const h = new THREE.Mesh(new THREE.BoxGeometry(2.5, len, 2.5), mat); h.quaternion.setFromUnitVectors(UP, dir); h.position.copy(at).addScaledVector(dir, len / 2); h.castShadow = true; g.add(h); return h;
  }
  // Điểm dây rời đầu cắm: chân đực (Dupont cái 14 mm chụp từ đế chân), header cái / breadboard (Dupont đực 14 mm), vít (dây trần), điểm thô
  function wireEnd(g, e) {
    if (e.kind === 'm') { housing(g, e.p.clone().addScaledVector(e.d, -6), e.d, 14, M.dupont); return e.p.clone().addScaledVector(e.d, 8); }
    if (e.kind === 'f') { housing(g, e.p, e.d, 12, M.dupont); lod(housing(g, e.p.clone().addScaledVector(e.d, -2), e.d, 2, M.gold), 'fine'); return e.p.clone().addScaledVector(e.d, 12); }
    if (e.kind === 's') { lod(housing(g, e.p.clone().addScaledVector(e.d, -3), e.d, 4, M.tin), 'fine'); return e.p.clone().addScaledVector(e.d, 1); }
    return e.p.clone();
  }
  function lead(g, a, b, color, low) {
    if (!a || !b) return;
    const A = wireEnd(g, a), B = wireEnd(g, b), dist = A.distanceTo(B);
    const lift = low ? Math.min(8, 3 + dist * 0.1) : Math.min(18, 7 + dist * 0.07); // vồng vừa đủ qua header cao nhất (~11 mm), không thành mớ rối
    const a1 = A.clone().addScaledVector(a.d, a.kind === 's' ? 6 : 5), b1 = B.clone().addScaledVector(b.d, b.kind === 's' ? 6 : 5);
    const mid = a1.clone().add(b1).multiplyScalar(0.5); mid.y = Math.max(a1.y, b1.y) + lift;
    const c = new THREE.CatmullRomCurve3([A, a1, mid, b1, B], false, 'centripetal');
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, 48, low ? 0.6 : 0.7, 8), wm(color)); mesh.castShadow = true; g.add(mesh);
    return c;
  }
  // ---- Dòng điện (vàng) và tín hiệu (xanh lơ): lớp sọc sáng trượt dọc đúng sợi dây đang dẫn ----
  // Chỉ dịch texture offset mỗi khung, không tạo hình học mới. 'dash' = dòng liên tục, 'pulse' = một xung chạy qua.
  let flowOn = true, wireCurves = {}, flowTex = null, introA = null;
  const INTRO_TRAVEL = 1200, INTRO_GAP = 280; // ms: thời gian bay của một bộ phận, độ trễ giữa hai bước lắp
  const AMP = 0xffc21a, SIG = 0x3fd0f0, DASH_MM = 10, PULSE_MM = 14;
  const still = matchMedia('(prefers-reduced-motion: reduce)'); // giảm chuyển động: sọc đứng yên, xung dừng giữa dây (vẫn thấy dây nào đang dẫn)
  function flowPath(g, kind, color, segs) {
    if (!flowTex) {
      const strip = (w, a, b) => { const t = canvasTex(w, 4, (x) => { const gr = x.createLinearGradient(a, 0, b, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(a, 0, b - a, 4); }); return t; };
      flowTex = { dash: strip(32, 0, 14), pulse: strip(64, 16, 48) };
      flowTex.dash.wrapS = THREE.RepeatWrapping; flowTex.pulse.wrapS = THREE.ClampToEdgeWrapping;
    }
    let s0 = 0;
    const out = segs.filter((x) => x && x.c).map(({ c, r, rev }) => {
      const len = c.getLength(), tex = flowTex[kind].clone(); tex.needsUpdate = true;
      const rep = kind === 'dash' ? len / DASH_MM : len / (2 * PULSE_MM); tex.repeat.set(rep, 1);
      const mat = new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, toneMapped: false });
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(40, Math.round(len / 3)), r + 0.4, 8), mat);
      mesh.visible = false; mesh.renderOrder = 3; mesh.userData.fx = true; g.add(mesh);
      const sg = { mesh, tex, len, rep, rev, s0 }; s0 += len; return sg;
    });
    return { kind, segs: out, total: s0 };
  }
  function flowDash(P, on, dt, speed) {
    for (const sg of P.segs) { sg.mesh.visible = on; if (on) sg.tex.offset.x += (sg.rev ? 1 : -1) * speed * dt / DASH_MM; }
  }
  function flowPulse(P, p) { // p: 0..1 vị trí xung trên cả đường; null = không có xung
    for (const sg of P.segs) {
      const loc = p == null ? -9 : (p * P.total - sg.s0) / sg.len, at = sg.rev ? 1 - loc : loc;
      sg.mesh.visible = loc > -0.2 && loc < 1.2;
      if (sg.mesh.visible) sg.tex.offset.x = 0.5 - at * sg.rep;
    }
  }
  const raw = (pt, dir) => ({ p: new THREE.Vector3(pt[0], pt[1], pt[2]), d: new THREE.Vector3(dir[0], dir[1], dir[2]).normalize(), kind: 'p' });
  // ---- Bó dây theo kênh (Design E.harness) ----
  // Dây rời chân cắm → hạ xuống mặt đế ngay cạnh module → chạy vuông góc trong kênh, xếp song song theo làn → lên chân đích.
  // Đường đi = đường ngắn nhất trên lưới kênh (Dijkstra). Dây rút đặt mỗi ~40 mm nơi có ≥ 2 dây chung kênh.
  let HR = { runs: [], ties: [], lines: [], boxes: {} };
  const LANE = 1.55, TIE_STEP = 40;
  function roundPath(pts, r) { // polyline → đường cong có góc bo R (dây Dupont không gập gãy)
    const q = pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > 0.3), path = new THREE.CurvePath();
    let cur = q[0];
    for (let i = 1; i < q.length - 1; i++) {
      const a = q[i - 1], b = q[i], c = q[i + 1], rr = Math.min(r, b.distanceTo(a) / 2, b.distanceTo(c) / 2);
      const p0 = b.clone().addScaledVector(a.clone().sub(b).normalize(), rr), p1 = b.clone().addScaledVector(c.clone().sub(b).normalize(), rr);
      if (cur.distanceTo(p0) > 0.05) path.add(new THREE.LineCurve3(cur, p0));
      path.add(new THREE.QuadraticBezierCurve3(p0, b, p1)); cur = p1;
    }
    path.add(new THREE.LineCurve3(cur, q[q.length - 1])); return path;
  }
  function harness(g, runs, H, clearY) {
    const yF = H.y + 0.75, L = H.lines.map((l) => Object.assign({}, l)), X = L.filter((l) => l.axis === 'x'), Z = L.filter((l) => l.axis === 'z');
    L.forEach((l) => { const cr = (l.axis === 'x' ? Z : X).map((c) => c.c); l.lo = Math.min(...cr); l.hi = Math.max(...cr); });
    const tOf = (l, v) => (l.axis === 'x' ? v.z : v.x), dOf = (l, v) => Math.abs((l.axis === 'x' ? v.x : v.z) - l.c);
    // Điểm thoát của một đầu dây: kênh gần nhất (khoảng cách vuông góc, phạt phần nằm ngoài kênh)
    function attach(e) {
      let A, B;
      if (e.kind === 'e') { A = B = e.p.clone(); } else {
        A = wireEnd(g, e); B = A.clone().addScaledVector(e.d, e.kind === 's' ? 6 : 5);
        const cy = clearY[e.key.split('.')[0]]; if (cy) B.y = Math.max(B.y, cy); // vượt thành hộp mica của Mega
      }
      let best = null;
      for (const l of L) { const t0 = tOf(l, B), t = clamp(t0, l.lo, l.hi), d = dOf(l, B) + Math.abs(t - t0) * 2; if (!best || d < best.d) best = { l, t, d }; }
      return { A, B, line: best.l, t: best.t, entry: e.kind === 'e' };
    }
    // Đồ thị: nút = giao điểm kênh (một nút cho mỗi kênh, nối nhau trọng số 0) + 2 điểm thoát; cạnh = đoạn kênh giữa hai nút liên tiếp
    function route(sa, sb) {
      const nodes = [], stations = new Map(L.map((l) => [l.id, []]));
      const add = (l, t) => { const n = { l, t, id: nodes.length }; nodes.push(n); stations.get(l.id).push(n); return n; };
      for (const a of X) for (const b of Z) { const n1 = add(a, b.c), n2 = add(b, a.c); n1.twin = n2; n2.twin = n1; }
      const S = add(sa.line, sa.t), T = add(sb.line, sb.t), adj = nodes.map(() => []);
      for (const [, st] of stations) { st.sort((p, q) => p.t - q.t); for (let i = 1; i < st.length; i++) { const w = st[i].t - st[i - 1].t; adj[st[i].id].push([st[i - 1].id, w]); adj[st[i - 1].id].push([st[i].id, w]); } }
      nodes.forEach((n) => { if (n.twin) adj[n.id].push([n.twin.id, 0]); });
      const dist = nodes.map(() => Infinity), prev = nodes.map(() => -1), done = new Set(); dist[S.id] = 0;
      while (true) { // mỗi bước cộng 0,01: cùng độ dài thì chọn ít khúc rẽ
        let u = -1; for (let i = 0; i < nodes.length; i++) if (!done.has(i) && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0 || u === T.id) break; done.add(u);
        for (const [v, w] of adj[u]) if (dist[u] + w + 0.01 < dist[v]) { dist[v] = dist[u] + w + 0.01; prev[v] = u; }
      }
      const seq = []; for (let u = T.id; u >= 0; u = prev[u]) seq.unshift(nodes[u]);
      const segs = [];
      for (let i = 1; i < seq.length; i++) { const a = seq[i - 1], b = seq[i]; if (a.l !== b.l) continue; const sg = segs[segs.length - 1]; if (sg && sg.l === a.l) sg.t1 = b.t; else segs.push({ l: a.l, t0: a.t, t1: b.t }); }
      return segs.length ? segs : [{ l: sa.line, t0: sa.t, t1: sb.t }];
    }
    const R = runs.filter((r) => r.a && r.b).map((r) => { const sa = attach(r.a), sb = attach(r.b); return Object.assign(r, { sa, sb, segs: route(sa, sb) }); });
    // Làn: mỗi kênh xếp các dây dùng nó cạnh nhau, tâm bó trùng tim kênh
    const lane = {}; L.forEach((l) => { const us = R.filter((r) => r.segs.some((sg) => sg.l === l)); lane[l.id] = new Map(us.map((r, i) => [r, (i - (us.length - 1) / 2) * LANE])); });
    const off = (l, r) => lane[l.id].get(r) || 0;
    const at = (l, t, o, y) => (l.axis === 'x' ? new THREE.Vector3(l.c + o, y, t) : new THREE.Vector3(t, y, l.c + o));
    HR = { runs: [], ties: [], lines: L.map((l) => ({ id: l.id, axis: l.axis, c: l.c, lo: l.lo, hi: l.hi, name: l.name })), boxes: {} };
    for (const r of R) {
      const fl = [], s0 = r.segs[0], sN = r.segs[r.segs.length - 1];
      fl.push(at(s0.l, s0.t0, off(s0.l, r), yF));
      for (let i = 1; i < r.segs.length; i++) { const a = r.segs[i - 1].l, b = r.segs[i].l, ax = a.axis === 'x' ? a : b, az = a.axis === 'x' ? b : a; fl.push(new THREE.Vector3(ax.c + off(ax, r), yF, az.c + off(az, r))); }
      fl.push(at(sN.l, sN.t1, off(sN.l, r), yF));
      const up = (v, y) => new THREE.Vector3(v.x, y, v.z), f0 = fl[0], f1 = fl[fl.length - 1];
      const pts = [].concat(r.sa.entry ? [] : [r.sa.A, r.sa.B, up(f0, r.sa.B.y)], fl, r.sb.entry ? [] : [up(f1, r.sb.B.y), r.sb.B, r.sb.A]);
      const c = roundPath(pts, 4), mesh = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(40, Math.round(c.getLength() / 3)), 0.7, 8), wm(r.color)); mesh.castShadow = true; g.add(mesh);
      wireCurves[r.from + '>' + r.to] = c;
      HR.runs.push({ from: r.from, to: r.to, color: r.color, len: Math.round(c.getLength()), via: [...new Set(r.segs.map((sg) => sg.l.name))], xz: pts.map((v) => [v.x, v.z]) });
    }
    // Dây rút dọc mỗi kênh, nơi có ≥ 2 dây đi qua (cách điểm rẽ ≥ 6 mm)
    for (const l of L) {
      const us = R.map((r) => { const sg = r.segs.filter((x) => x.l === l); return sg.length ? { r, lo: Math.min(...sg.map((x) => Math.min(x.t0, x.t1))), hi: Math.max(...sg.map((x) => Math.max(x.t0, x.t1))) } : null; }).filter(Boolean);
      if (us.length < 2) continue;
      const lo = Math.min(...us.map((u) => u.lo)), hi = Math.max(...us.map((u) => u.hi));
      for (let t = lo + TIE_STEP / 2; t < hi - 6; t += TIE_STEP) {
        const on = us.filter((u) => t > u.lo + 6 && t < u.hi - 6); if (on.length < 2) continue;
        const os = on.map((u) => off(l, u.r)), o0 = Math.min(...os), o1 = Math.max(...os), span = o1 - o0 + 3, mid = at(l, t, (o0 + o1) / 2, yF);
        const tie = new THREE.Mesh(new THREE.BoxGeometry(l.axis === 'x' ? span : 2.2, 2.4, l.axis === 'x' ? 2.2 : span), M.white); tie.position.copy(mid); tie.castShadow = true; g.add(tie);
        const hd = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), M.white); hd.position.copy(at(l, t, o1 + 3, yF + 0.6)); g.add(hd);
        HR.ties.push({ x: mid.x, z: mid.z, axis: l.axis, span, n: on.length });
      }
    }
  }
  function wireUp(g, m) {
    rootG.updateMatrixWorld(true);
    const P = pinAt, W = m.wires, first = (k) => W[k].pts[0], last = (k) => W[k].pts[W[k].pts.length - 1];
    // Dây rút nhựa trắng dọc các cáp dài (vòng + đầu khóa)
    const ties = (c, r, n) => { for (let i = 1; i <= n; i++) {
      const u = i / (n + 1), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), c.getTangentAt(u)), at = c.getPointAt(u);
      const t = new THREE.Mesh(new THREE.TorusGeometry(r + 0.45, 0.55, 6, 18), M.white); t.quaternion.copy(q); t.position.copy(at); t.castShadow = true; g.add(lod(t, 'fine'));
      const hd = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.4), M.white); hd.quaternion.copy(q); hd.position.copy(at).add(new THREE.Vector3(0, r + 1.2, 0).applyQuaternion(q)); g.add(lod(hd, 'fine'));
    } };
    // Cáp ngoài: từ cảm biến/bơm tới điểm vào kênh (độ dài tính BOM), tách sợi tại đó
    wireCurves = {};
    const hcC = tubeAlong(g, W.hc.pts, 1.3, M.wHc), pumpC = tubeAlong(g, W.pumpW.pts, 1.2, M.wPump);
    ties(hcC, 1.3, 4); ties(tubeAlong(g, W.ws.pts, 1.1, M.wLeak), 1.1, 3); ties(pumpC, 1.2, 3);
    const hcA = raw(first('hc'), [0, 1, 0]), wsA = raw(first('ws'), [1, 0, 0]);
    [['hc.VCC', 'red'], ['hc.TRIG', 'yellow'], ['hc.ECHO', 'green'], ['hc.GND', 'black']].forEach(([k, c]) => lead(g, P(k), hcA, c, true));
    [['ws.S', 'orange'], ['ws.VCC', 'red'], ['ws.GND', 'black']].forEach(([k, c]) => lead(g, P(k), wsA, c, true));
    const ent = (k) => Object.assign(raw(last(k), [0, 1, 0]), { kind: 'e', key: k });
    // Nối ngắn tại chỗ (jack → domino, cầu domino, trên test board): dây vồng thấp, không vào kênh
    lead(g, P('jack.+'), P('dom0.5V'), 'red', true); lead(g, P('jack.-'), P('dom0.GND'), 'black', true);
    lead(g, P('dom0.5V'), P('dom1.5V'), 'red', true); lead(g, P('dom0.GND'), P('dom1.GND'), 'black', true);
    lead(g, P('dom1.5V'), P('dom2.5V'), 'red', true); lead(g, P('dom1.GND'), P('dom2.GND'), 'black', true);
    lead(g, P('ams.VOUT'), P('esp.VCC'), 'orange', true); lead(g, P('ams.VOUT'), P('esp.EN'), 'orange', true); lead(g, P('ams.GND'), P('esp.GND'), 'black', true);
    lead(g, P('ams.VOUT'), P('lvl.LV'), 'orange', true); lead(g, P('ams.GND'), P('lvl.GND'), 'black', true);
    const txC = lead(g, P('lvl.LV1'), P('esp.RX'), 'violet', true); lead(g, P('esp.TX'), P('lvl.LV2'), 'pink', true);
    // Dây đi kênh: nguồn trước, tín hiệu sau; đỏ/đen đi cặp
    const R = [
      [ent('hc'), P('dom2.5V'), 'red', 'Cáp HC-SR04 · VCC', 'Domino 2 · 5V'], [ent('hc'), P('dom2.GND'), 'black', 'Cáp HC-SR04 · GND', 'Domino 2 · GND'],
      [ent('hc'), P('mega.D9'), 'yellow', 'Cáp HC-SR04 · TRIG', 'Mega D9'], [ent('hc'), P('mega.D10'), 'green', 'Cáp HC-SR04 · ECHO', 'Mega D10'],
      [ent('ws'), P('dom2.GND'), 'black', 'Cáp Water Sensor · −', 'Domino 2 · GND'], [ent('ws'), P('mega.D7'), 'red', 'Cáp Water Sensor · +', 'Mega D7'], [ent('ws'), P('mega.A0'), 'orange', 'Cáp Water Sensor · S', 'Mega A0'],
      [ent('pumpW'), P('relay.NO'), 'red', 'Dây bơm · +', 'Relay NO'], [ent('pumpW'), P('dom1.GND'), 'black', 'Dây bơm · −', 'Domino 1 · GND'],
      [P('dom0.5V'), P('mega.5V'), 'red', 'Domino 0 · 5V', 'Mega 5V'], [P('dom0.GND'), P('mega.GND'), 'black', 'Domino 0 · GND', 'Mega GND'],
      [P('dom1.5V'), P('relay.COM'), 'red', 'Domino 1 · 5V', 'Relay COM'], [P('dom1.5V'), P('relay.VCC'), 'red', 'Domino 1 · 5V', 'Relay DC+'], [P('dom1.GND'), P('relay.GND'), 'black', 'Domino 1 · GND', 'Relay DC−'],
      [P('dom1.5V'), P('buzz.VCC'), 'red', 'Domino 1 · 5V', 'Còi VCC'], [P('dom1.GND'), P('buzz.GND'), 'black', 'Domino 1 · GND', 'Còi GND'],
      [P('dom2.5V'), P('lcd.VCC'), 'red', 'Domino 2 · 5V', 'LCD VCC'], [P('dom2.GND'), P('lcd.GND'), 'black', 'Domino 2 · GND', 'LCD GND'],
      [P('dom2.5V'), P('ams.VIN'), 'red', 'Domino 2 · 5V', 'AMS1117 VIN'], [P('dom2.GND'), P('ams.GND'), 'black', 'Domino 2 · GND', 'AMS1117 GND'], [P('dom2.5V'), P('lvl.HV'), 'red', 'Domino 2 · 5V', 'Chuyển mức HV'],
      [P('mega.D6'), P('relay.IN'), 'blue', 'Mega D6', 'Relay IN'], [P('mega.D8'), P('buzz.IO'), 'brown', 'Mega D8', 'Còi I/O'],
      [P('mega.D20'), P('lcd.SDA'), 'white', 'Mega D20 · SDA', 'LCD SDA'], [P('mega.D21'), P('lcd.SCL'), 'grey', 'Mega D21 · SCL', 'LCD SCL'],
      [P('mega.D18'), P('lvl.HV1'), 'violet', 'Mega D18 · TX1', 'Chuyển mức HV1'], [P('lvl.HV2'), P('mega.D19'), 'pink', 'Chuyển mức HV2', 'Mega D19 · RX1'],
    ].map(([a, b, color, from, to]) => ({ a, b, color, from, to }));
    harness(g, R, m.E.harness, m.parts.megaBox ? { mega: m.SPEC.megaBox.h + 4 } : {});
    // Chiều chạy theo dòng quy ước: 5V → COM → NO → bơm → GND; tín hiệu từ chân phát tới chân nhận
    const C = wireCurves, sg = (c, r, rev) => ({ c, r, rev });
    dyn.elec = {
      pumpIn: flowPath(g, 'dash', AMP, [sg(C['Domino 1 · 5V>Relay COM'], 0.7), sg(C['Dây bơm · +>Relay NO'], 0.7, true), sg(pumpC, 1.2, true)]),
      pumpOut: flowPath(g, 'dash', AMP, [sg(C['Dây bơm · −>Domino 1 · GND'], 0.7)]),
      d6: flowPath(g, 'dash', SIG, [sg(C['Mega D6>Relay IN'], 0.7)]),
      trig: flowPath(g, 'pulse', SIG, [sg(C['Cáp HC-SR04 · TRIG>Mega D9'], 0.7, true), sg(hcC, 1.3, true)]),
      echo: flowPath(g, 'pulse', SIG, [sg(hcC, 1.3), sg(C['Cáp HC-SR04 · ECHO>Mega D10'], 0.7)]),
      tx: flowPath(g, 'pulse', SIG, [sg(C['Mega D18 · TX1>Chuyển mức HV1'], 0.7), sg(txC, 0.6)]),
    };
    // Khung bao các module (bản vẽ đi dây nhìn từ trên)
    for (const id of ['megaBox', 'mega', 'espKit', 'relay', 'buzzer', 'power', 'lcd', 'lcdPanel', 'splash', 'ctrlBox']) if (parts[id]) { const b = new THREE.Box3().setFromObject(parts[id].g); if (!b.isEmpty()) HR.boxes[id] = [b.min.x, b.min.z, b.max.x, b.max.z]; }
  }

  // Màn hình LCD 16×2: vẽ lên canvas → texture
  let lcdText = '';
  function drawLcd(lines) {
    const key = lines ? lines.join('|') : 'off';
    if (key === lcdText) return; lcdText = key;
    const c = M.lcdCanvas, x = c.getContext('2d');
    x.fillStyle = lines ? '#9cc94a' : '#2f3a22'; x.fillRect(0, 0, c.width, c.height);
    if (lines) {
      x.fillStyle = 'rgba(0,0,0,0.06)';
      for (let r = 0; r < 2; r++) for (let i = 0; i < 16; i++) x.fillRect(4 + i * 31.75, 8 + r * 60, 28, 50);
      x.fillStyle = '#16240b'; x.font = 'bold 44px "JetBrains Mono", Consolas, monospace'; x.textBaseline = 'middle';
      lines.forEach((ln, r) => [...ln].forEach((ch, i) => x.fillText(ch, 6 + i * 31.75, 34 + r * 60)));
    }
    M.lcdTex.needsUpdate = true;
  }

  function mkLabel(cls, text, id) {
    const el = document.createElement(id ? 'button' : 'div'); el.className = cls;
    if (id) {
      el.type = 'button'; el.setAttribute('aria-label', `${partNos[id]}. ${text}`);
      el.append(String(partNos[id])); const s = document.createElement('span'); s.textContent = text; el.append(s);
      el.addEventListener('click', () => { select(id); onPick(id); });
    } else el.textContent = text;
    overlay.appendChild(el); return el;
  }

  // ---------- tương tác ----------
  function hit(e, all) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(rootG.children, true);
    return hits.find((h) => h.object.isMesh && !h.object.userData.fx && visibleChain(h.object) && (all || h.object.userData.pid) && passesSection(h.point));
  }
  function visibleChain(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
  function passesSection(pt) { return !section || section.plane.distanceToPoint(pt) >= 0; }

  function click(e) {
    const h = hit(e, measureOn);
    if (measureOn) { if (h) addMeasurePoint(h.point); return; }
    const id = h ? h.object.userData.pid : null;
    select(id); onPick(id);
  }
  function hover(e) {
    if (measureOn) { renderer.domElement.style.cursor = 'crosshair'; tip.hidden = true; return; }
    const h = hit(e);
    const id = h ? h.object.userData.pid : null;
    renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    hoverId = id;
    if (id && !labelsOn) { tip.hidden = false; tip.textContent = model.parts[id].name; const r = host.getBoundingClientRect(); tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 10}px)`; }
    else tip.hidden = true;
  }

  function select(id) {
    selected = id || null;
    if (selBox) { rootG.remove(selBox); selBox.geometry.dispose(); selBox = null; }
    if (selected && parts[selected]) { selBox = new THREE.BoxHelper(parts[selected].g, 0x2563eb); selBox.userData.fx = true; rootG.add(selBox); }
    labels.forEach((l) => { l.el.classList.toggle('is-sel', l.id === selected); l.lead.classList.toggle('is-sel', l.id === selected); });
  }
  function focus(id) {
    const P = parts[id]; if (!P) return;
    const b = new THREE.Box3().setFromObject(P.g); if (b.isEmpty()) return;
    const c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3()).length();
    const dir = camera.position.clone().sub(controls.target).normalize(); dir.y = Math.max(dir.y, 0.8); dir.normalize(); // từ trên cao: tránh bị thành khay, vách che
    tweenTo(c.clone().add(dir.multiplyScalar(Math.max(260, size * 2.2))), c);
  }

  // ---- Màn dựng từ đầu: camera tới cụm bộ phận của bước k; các bộ phận đó phát sáng Cobalt khi bay vào rồi dịu dần ----
  // Vật liệu dùng chung giữa các bộ phận nên phát sáng bằng bản sao vật liệu (một bản sao cho mỗi vật liệu gốc trong bước), trả lại khi đổi bước.
  const GLOW = 0x2563eb;
  let glow = null;
  function storyStep(k) {
    if (glow) { glow.meshes.forEach(([o, m]) => { o.material = m; }); glow.mats.forEach((c) => c.dispose()); rootG.remove(glow.frame); glow.frame.geometry.dispose(); glow = null; }
    if (k == null || !model) return;
    const ids = (model.steps[k] ? model.steps[k].parts : []).filter((id) => parts[id]);
    if (!ids.length) { view('front'); return; }
    rootG.updateMatrixWorld(true);
    const box = new THREE.Box3();
    ids.forEach((id) => { const g = parts[id].g, b = new THREE.Box3().setFromObject(g); if (!b.isEmpty()) box.union(b.translate(g.position.clone().negate())); }); // vị trí đã lắp, không phải chỗ đang bay
    const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length();
    const d = Math.max(380, r * 2.4) * Math.max(1, 1.25 / camera.aspect), dir = V([0.42, 0.55, 1]).normalize(); // chéo 3/4 từ trước-phải, hơi cao, đủ xa để thấy bộ phận nằm ở đâu trên mô hình
    tweenTo(c.clone().add(dir.multiplyScalar(d)), c); tween.k = 1.5;
    // Khung Cobalt quanh chỗ sẽ lắp: chỉ rõ vị trí cả với bộ phận trong suốt (bình, hộp nguồn) không phát sáng được
    const frame = new THREE.Box3Helper(box.clone().expandByScalar(4), GLOW); frame.material.transparent = true; frame.material.depthTest = false; frame.renderOrder = 4; frame.userData.fx = true; rootG.add(frame);
    const clones = new Map(); glow = { meshes: [], mats: [], frame, t0: performance.now(), land: asm ? asm.travel * (1 + asm.gap * (ids.length - 1)) : 0 };
    ids.forEach((id) => parts[id].g.traverse((o) => {
      if (!o.isMesh || o.userData.fx || Array.isArray(o.material) || !o.material || !o.material.emissive || o.material.transparent) return; // nhựa trong, nước: phát sáng thành mảng trắng chói
      let cl = clones.get(o.material); if (!cl) { cl = o.material.clone(); cl.emissive = new THREE.Color(GLOW); clones.set(o.material, cl); glow.mats.push(cl); }
      glow.meshes.push([o, o.material]); o.material = cl;
    }));
  }

  function addMeasurePoint(pt) {
    if (mPts.length === 2) clearMeasure();
    mPts.push(pt.clone());
    const dot = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); dot.position.copy(pt); dot.userData.fx = true; measureG.add(dot);
    if (mPts.length === 2) {
      const [a, b] = mPts, d = a.distanceTo(b);
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), M.meas); ln.userData.fx = true; measureG.add(ln);
      const txt = `${d.toFixed(1)} mm`;
      measureLabels.push({ el: mkLabel('ov-meas', txt), pos: a.clone().add(b).multiplyScalar(0.5) });
      onMeasure({ d, dx: Math.abs(b.x - a.x), dy: Math.abs(b.y - a.y), dz: Math.abs(b.z - a.z) });
    } else onMeasure(null);
  }
  function clearMeasure() {
    mPts = []; measureLabels.forEach((l) => l.el.remove()); measureLabels = [];
    if (measureG) { measureG.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); measureG.clear(); }
    onMeasure(null);
  }

  function tweenTo(pos, target, instant) {
    if (instant) { camera.position.copy(pos); controls.target.copy(target); controls.update(); tween = null; return; }
    tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, u: 0 };
  }
  // inset: có thẻ hướng dẫn nổi ở đỉnh viewport → nâng camera và tâm nhìn lên cùng lúc, vật cần xem rơi xuống phần không bị che
  let inset = false;
  function view(name, instant) {
    if (!model) return;
    const tweenTo2 = (p, t, inst) => { if (inset) { const up = p.distanceTo(t) * 0.12; p.y += up; t.y += up; } tweenTo(p, t, inst); };
    const L = model.base ? model.base.L : model.metrics.footX * 1.12, cy = model.tank.rim * 0.42, tgt = new THREE.Vector3(0, cy, 0);
    const pos = {
      iso: [L * 0.68, L * 0.7, L * 1.12], front: [0, cy + 20, L * 1.55], top: [0.01, L * 1.7, 0.02], side: [L * 1.35, cy + 40, 0.01],
    }[name];
    const close = { // cận cảnh: [tâm nhìn, hướng camera, khoảng cách]
      tank: [[model.tank.x, model.tank.rim * 0.72, model.tank.z], [-0.55, 0.45, 1], 330],
      pump: [[model.res.x, model.res.H * 0.5, model.res.z], [-0.6, 0.55, 1], 360],
      control: [[(model.E.mega.x + model.E.lcd.x) / 2, 35, (model.E.mega.z + model.E.lcd.z) / 2], [0.5, 0.62, 1], 380],
    }[name];
    if (close) { // khung 3D hẹp/cao (panel + điện thoại đang mở) hoặc bị thẻ che → lùi ra để vẫn thấy bộ phận nằm ở đâu trên mô hình
      lastView = name; const [c, d, r] = close, dir = V(d).normalize(), k = Math.max(1, 1.4 / camera.aspect) * (inset ? 1.5 : 1);
      tweenTo2(V(c).add(dir.multiplyScalar(r * k)), V(c), instant); return;
    }
    if (!pos) return view('iso', instant);
    lastView = name;
    if (name === 'iso' && look === 'real') { // bố cục như ảnh tham chiếu: chéo 3/4 từ trước-phải, tầm mắt người đứng, thấy cửa sổ và bảng treo
      const kr = Math.max(1, 1.25 / Math.max(0.4, camera.aspect)) * (1 + 0.5 * ex.target), t = V([-0.12 * L, cy * 0.75, -0.14 * L]);
      return tweenTo2(V([1.02 * L, 0.74 * L, 1.55 * L]).sub(t).multiplyScalar(kr).add(t), t, instant);
    }
    const k = Math.max(1.32, 1.5 / Math.max(0.5, camera.aspect)) * (1 + 0.5 * ex.target); // khung hẹp (điện thoại) hoặc đang tháo rời → lùi camera
    pos[0] *= k; pos[1] = cy + (pos[1] - cy) * k; pos[2] *= k;
    tweenTo2(V(pos), tgt, instant);
  }

  // Vẽ thẳng ra màn hình (renderer tự tone map ACES ở Thực tế). Đã bỏ hậu kỳ AO + DOF: hiện dần khi camera đứng yên làm ảnh lấm tấm hạt và nháy.
  function renderFrame() { renderer.render(scene, camera); }
  // Máy không kham nổi (dưới ~20 khung/s liên tục 3 s khi đang xem): tự hạ chất lượng một lần
  let slowT = 0, autoLow = false, qualityCb = () => {};
  function watchSpeed(dt) {
    if (autoLow || look !== 'real' || quality !== 'high' || document.visibilityState !== 'visible' || dt > 0.5) return; // > 0,5 s: đang biên dịch shader
    slowT = dt > 0.05 ? slowT + dt : Math.max(0, slowT - dt * 0.5);
    if (slowT > 3) { autoLow = true; setQuality('low'); qualityCb('low'); }
  }

  // ---------- vòng lặp ----------
  function partOffset(id, now) {
    const P = parts[id];
    const full = P.explode.clone().add(clusterOff[P.cluster]);
    if (introA) { // màn mở đầu: bộ phận bay về chỗ lần lượt theo thứ tự bước lắp ráp
      const u = introA.t0 == null ? 0 : clamp((now - introA.t0 - (stepOf[id] || 0) * INTRO_GAP) / INTRO_TRAVEL, 0, 1), e = 1 - Math.pow(1 - u, 3);
      return full.multiplyScalar(1.6 * (1 - e));
    }
    if (asm) {
      if (stepOf[id] !== asm.step) return new THREE.Vector3();
      const order = model.steps[asm.step].parts.indexOf(id);
      const u = clamp((now - asm.t0) / asm.travel - order * asm.gap, 0, 1), e = 1 - Math.pow(1 - u, 3);
      return full.multiplyScalar(1.4 * (1 - e));
    }
    if (ex.cluster !== 'all' && ex.cluster !== P.cluster) return new THREE.Vector3();
    return full.multiplyScalar(ex.cur);
  }
  function isVisible(id) {
    if (hidden.has(id)) return false;
    if (isolated && isolated !== id) return false;
    if (id === 'wires' && !asm && ex.cur > 0.02 && (ex.cluster === 'all' || ex.cluster === 'elec')) return false; // dây nối giữa các cụm: ẩn khi tháo rời
    if (asm && (stepOf[id] == null || stepOf[id] > asm.step)) return false;
    return true;
  }

  // Trình duyệt có thể dừng requestAnimationFrame (tab ẩn, khung nhúng): bộ hẹn giờ dự phòng giữ mô phỏng chạy tiếp.
  let lastFrame = 0;
  setInterval(() => { if (renderer && performance.now() - lastFrame > 400) frame(); }, 100);
  let lastSig = '';
  function loop() { requestAnimationFrame(loop); frame(true); }
  function frame(fromRaf) {
    const raw = clock.getDelta(), dt = Math.min(raw, 0.1), now = performance.now();
    if (fromRaf) watchSpeed(raw);
    lastFrame = now;
    frameCb(dt);
    if (!model) { renderer.render(scene, camera); return; }
    ex.cur += (ex.target - ex.cur) * (1 - Math.exp(-dt * 5));
    if (Math.abs(ex.target - ex.cur) < 1e-4) ex.cur = ex.target;
    for (const id in parts) { const P = parts[id]; P.g.position.copy(partOffset(id, now)); P.g.visible = isVisible(id); }
    if (tween && !(introA && introA.t0 == null)) {
      tween.u = Math.min(1, tween.u + dt * (tween.k || 2.2)); const e = 1 - Math.pow(1 - tween.u, 3);
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (tween.u >= 1) tween = null;
    }
    controls.update();
    if (selBox) selBox.update();
    // Đồng hồ mở đầu chỉ chạy từ khung thứ 3: khung đầu còn biên dịch shader / tải texture, tính giờ sớm thì người xem lỡ nửa đầu
    if (glow) { const t = now - glow.t0, I = t < glow.land ? 0.5 : 0.12 + 0.38 * Math.exp(-(t - glow.land) / 380); glow.mats.forEach((m) => { m.emissiveIntensity = I; }); glow.frame.material.opacity = Math.min(1, I * 1.8); } // sáng khi bay, dịu còn vệt nhẹ khi đã vào chỗ
    if (introA && introA.t0 == null && ++introA.frames >= 3) introA.t0 = now;
    if (introA && introA.t0 != null && now - introA.t0 > introA.ms) introA = null;
    const assembled = ex.cur < 0.005 && (!asm || asm.step === model.steps.length - 1) && !introA;
    fxG.visible = assembled;
    dimsG.visible = dimsOn && ex.cur < 0.005 && !asm;
    // Dấu vết vị trí + ẩn/hiện các bộ phận: đổi thì vẽ lại bóng
    let sig = dyn.valveLever ? dyn.valveLever.rotation.y.toFixed(2) : '';
    for (const id in parts) { const g = parts[id].g; if (g.visible) sig += id + g.position.x.toFixed(1) + ',' + g.position.y.toFixed(1) + ',' + g.position.z.toFixed(1); }
    const changed = sig !== lastSig; if (changed) { lastSig = sig; shadowDirty(); }
    renderFrame();
    placeLabels(assembled);
  }

  function placeLabels(assembled) {
    const w = host.clientWidth, h = host.clientHeight, v = new THREE.Vector3();
    const put = (l, show, off, nudge) => {
      if (l.lead) l.lead.hidden = true;
      if (!show) { l.el.hidden = true; return; }
      v.copy(l.pos); if (off) v.add(off); v.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { l.el.hidden = true; return; }
      const ax = (v.x * 0.5 + 0.5) * w, ay = (-v.y * 0.5 + 0.5) * h;
      let x = ax, y = ay;
      if (nudge) [x, y] = nudge(ax + 16, ay - 22); // bóng lệch lên-phải khỏi điểm neo, như bản vẽ lắp
      l.el.hidden = false; l.el.style.transform = `translate(${x}px, ${y}px)`;
      if (l.lead) { // đường dẫn từ điểm neo tới mép bóng (bán kính ~12 px)
        const dx = x - ax, dy = y - ay, len = Math.hypot(dx, dy) - 12;
        if (len > 2) { l.lead.hidden = false; l.lead.style.width = len + 'px'; l.lead.style.transform = `translate(${ax}px, ${ay}px) rotate(${Math.atan2(dy, dx)}rad)`; }
      }
    };
    // Bóng số gần nhau bị đẩy sang ô trống gần nhất (tâm cách nhau ≥ 26 px); bóng đang chọn ưu tiên giữ chỗ
    const placed = [], D = 26, tries = [[0, 0], [0, -D], [D, 0], [0, D], [-D, 0], [D, -D], [-D, -D], [D, D], [-D, D], [0, -2 * D], [2 * D, 0]];
    const free = (x, y) => placed.every(([px, py]) => Math.abs(px - x) >= D || Math.abs(py - y) >= D);
    const nudge = (x, y) => { const t = tries.find(([dx, dy]) => free(x + dx, y + dy)) || [0, 0]; placed.push([x + t[0], y + t[1]]); return [x + t[0], y + t[1]]; };
    const order = labels.slice().sort((a, b) => (b.id === selected) - (a.id === selected));
    for (const l of order) put(l, labelsOn && parts[l.id].g.visible, parts[l.id].g.position, nudge);
    for (const l of dimLabels) put(l, dimsG.visible);
    for (const l of measureLabels) put(l, true);
  }

  // Đổi chiều cao khối nước bằng đỉnh hình học, không bằng scale: three nhân độ dày khúc xạ (thickness) với scale từng trục,
  // scale.y = 80 sẽ làm mặt nước khúc xạ/nhuộm màu như dày 80 lần
  function setH(mesh, h) {
    const u = mesh.userData; if (u.h === h) return; u.h = h;
    const pa = mesh.geometry.attributes.position; if (!u.y0) u.y0 = Float32Array.from({ length: pa.count }, (_, i) => pa.getY(i));
    for (let i = 0; i < pa.count; i++) pa.setY(i, u.y0[i] * h);
    pa.needsUpdate = true; mesh.geometry.computeBoundingSphere(); mesh.geometry.computeBoundingBox();
  }
  // Cập nhật trạng thái mô phỏng lên mô hình
  function sync(s, dtReal) {
    if (!model || !dyn.tankWater) return;
    const m = model, k = m.sim, d = s.dev, t = performance.now() / 1000;
    const lv = Math.max(0.3, s.level);
    setH(dyn.tankWater, lv); dyn.tankWater.position.y = m.tank.yIn + lv / 2; dyn.menis.position.y = m.tank.yIn + lv - 0.3;
    const rv = Math.max(0.3, s.res);
    setH(dyn.resWater, rv); dyn.resWater.position.y = 1.5 + rv / 2;
    const tdep = s.tray * 1000 / k.trayArea;
    dyn.trayWater.visible = tdep > 0.02; setH(dyn.trayWater, Math.max(0.3, tdep)); dyn.trayWater.position.y = m.tray.y + m.T + Math.max(0.3, tdep) / 2;
    dyn.lowRing.position.y = m.tank.yIn + d.low / 100 * k.usableH;
    dyn.highRing.position.y = m.tank.yIn + d.high / 100 * k.usableH;
    const running = s.q.pump > 0.001;
    dyn.pumpInner.position.set(running ? (Math.random() - 0.5) * 0.5 : 0, 0, running ? (Math.random() - 0.5) * 0.5 : 0);
    if (dyn.valveLever) dyn.valveLever.rotation.y = -s.valve * Math.PI / 2;
    // Hạt nước chạy trong ống, vận tốc hiển thị tỉ lệ lưu lượng
    for (const kk in dyn.flows) {
      const f = dyn.flows[kk], q = s.q[kk];
      f.grp.visible = q > 0.005;
      if (!f.grp.visible) continue;
      f.u = (f.u + Math.min(420, 120 + q * 260) * Math.min(dtReal, 0.1) / f.len) % 1; // tốc độ hiển thị theo thời gian thực, không theo hệ số tua
      f.grp.children.forEach((c, i) => c.position.copy(dyn.curves[kk].getPointAt((f.u + i / f.n) % 1)));
    }
    const top = m.tank.rim - 15, surf = m.tank.yIn + s.level;
    dyn.stream.visible = running && dyn.flows.pump.grp.visible;
    if (dyn.stream.visible) { const hgt = Math.max(1, top - surf); setH(dyn.stream, hgt); dyn.stream.position.set(m.tank.x, surf + hgt / 2, m.tank.z + 18); }
    const qn = clamp(s.q.pump / k.qMax, 0, 1);
    dyn.splash.forEach((r, i) => {
      r.visible = dyn.stream.visible; if (!r.visible) return;
      const u = still.matches ? 0.2 + i * 0.25 : (t * 1.4 + i / 3) % 1, sc = 2.5 + u * (8 + 10 * qn);
      r.scale.set(sc, sc, 1); r.position.set(m.tank.x, surf + 0.5, m.tank.z + 18); r.material.opacity = 0.75 * (1 - u) * (1 - u);
    });
    if (look === 'real' && M.water.normalMap) { const a = 0.18 + 0.55 * qn; M.water.normalScale.set(a, a); } // mặt nước gợn mạnh hơn khi bơm đổ vào
    // Dòng điện bơm + lệnh D6 khi relay đóng; xung TRIG/ECHO mỗi chu kỳ đo (mất ECHO thì chỉ còn TRIG); khung UART gửi ESP-01
    const E = dyn.elec, live = flowOn && !s.faults.power, dts = Math.min(dtReal, 0.1);
    if (E) {
      const run = live && d.pump;
      const sp = still.matches ? 0 : 1;
      flowDash(E.pumpIn, run, dts, 70 * sp); flowDash(E.pumpOut, run, dts, 70 * sp); flowDash(E.d6, run, dts, 40 * sp);
      const meas = live && d.booting <= 0, echo = s.faults.sensor !== 'timeout', u = (t * 1.25) % 1, v = (t * 0.6) % 1;
      if (still.matches) { flowPulse(E.trig, meas ? 0.5 : null); flowPulse(E.echo, meas && echo ? 0.5 : null); flowPulse(E.tx, meas ? 0.5 : null); } else {
        flowPulse(E.trig, meas && u < 0.5 ? u / 0.5 : null);
        flowPulse(E.echo, meas && echo && u >= 0.5 ? (u - 0.5) / 0.5 : null);
        flowPulse(E.tx, meas && v < 0.6 ? v / 0.6 : null);
      }
    }
    dyn.leakDrops.visible = s.q.leak > 0;
    const spill = s.q.spill > 0; // tràn miệng bình (bản đơn giản) hoặc rò đáy
    if (dyn.leakDrops.visible) dyn.leakDrops.children.forEach((c, i) => { const u = (t * 1.4 + i / 3) % 1, y0 = spill ? m.tank.rim : m.tank.y0 + 2, y1 = m.tray.y + m.T; c.position.set(m.tank.x + (i - 1) * 6, y0 - u * (y0 - y1) * (spill ? 1 : 0.1), m.tank.z + m.tank.OD / 2 + 2 + (spill ? 1 : u * 18)); });
    // Xung siêu âm
    const sensorOk = !s.faults.power && s.faults.sensor !== 'timeout' && d.booting <= 0;
    dyn.ping.visible = sensorOk;
    if (sensorOk) {
      const u = (t * 2) % 1, dist = Math.max(10, m.faceY - surf), down = u < 0.5 ? u * 2 : 2 - u * 2;
      const r = 8 + dist * down * Math.tan(15 * Math.PI / 180);
      dyn.ping.scale.set(r, r, 1); dyn.ping.position.set(m.tank.x, m.faceY - dist * down, m.tank.z);
      M.ping.opacity = 0.55 * (1 - Math.abs(u - 0.5));
      M.ping.color.setHex(s.faults.sensor === 'ok' ? 0x5fd4e8 : 0xf0b429);
    }
    M.hc.color.setHex(s.faults.power ? 0x1f5aa6 : d.lock && d.lock.code === 'SENSOR' ? 0xb33a3a : 0x1f5aa6);
    // Đèn & còi
    const pw = !s.faults.power, L = dyn.leds;
    L.on.material.color.setHex(pw ? 0x40ff70 : 0x113311);
    L.l13.material.color.setHex(pw && Math.floor(t * (d.lock ? 6 : 1.5)) % 2 ? 0xffb030 : 0x332211);
    L.relay.material.color.setHex(pw && d.pump ? 0xff4040 : 0x331111);
    L.esp.material.color.setHex(pw && !s.faults.wifi && Math.floor(t * 5) % 3 === 0 ? 0x4aa8ff : 0x112233);
    L.ws.material.color.setHex(pw ? (d.wsAdc > 300 ? 0xff4040 : 0x5a1a1a) : 0x331111);
    const bz = s.buzzer();
    M.buzz.color.setHex((bz === 'alarm' && Math.floor(t * 4) % 2) || (bz === 'chirp' && t % 10 < 0.15) ? 0xd04040 : 0x111111);
    drawLcd(s.lcd());
    if (look === 'real' && rippleTex) { rippleTex.offset.x = (t * 0.015) % 1; rippleTex.offset.y = (t * 0.011) % 1; }
  }

  function setSection(axis, frac) {
    if (!axis) { section = null; applyClip(); shadowDirty(); return; }
    const W = (model.base ? model.base.W : model.metrics.footZ) / 2 + 30, Lh = (model.base ? model.base.L : model.metrics.footX) / 2 + 30;
    const plane = axis === 'z' ? new THREE.Plane(new THREE.Vector3(0, 0, -1), -W + 2 * W * frac) : new THREE.Plane(new THREE.Vector3(-1, 0, 0), -Lh + 2 * Lh * frac);
    section = { axis, frac, plane }; applyClip(); shadowDirty();
  }
  // Mặt cắt chỉ cắt mô hình (vật liệu trong rootG), không cắt bàn và phòng
  function applyClip() {
    renderer.localClippingEnabled = true; if (!rootG) return;
    const cp = section ? [section.plane] : null;
    rootG.traverse((o) => { if (o.material) [].concat(o.material).forEach((mm) => { mm.clippingPlanes = cp; mm.clipShadows = !!cp; }); });
  }

  // Ảnh riêng một bộ phận (để đặt cạnh ảnh thật): ẩn phần khác, khung lại, vẽ một khung hình rồi trả về dataURL
  function snapshot(id) {
    const P = parts[id]; if (!P) return null;
    const vis = {}; for (const k in parts) { vis[k] = parts[k].g.visible; parts[k].g.visible = k === id; }
    const keep = [fxG.visible, dimsG.visible, selBox && selBox.visible, scene.userData.grid.visible];
    fxG.visible = false; dimsG.visible = false; if (selBox) selBox.visible = false; scene.userData.grid.visible = false;
    const b = new THREE.Box3().setFromObject(P.g), c = b.getCenter(new THREE.Vector3()), r = b.getSize(new THREE.Vector3()).length();
    const cam = camera.clone(); cam.position.copy(c).add(new THREE.Vector3(-0.55, 0.62, 1).normalize().multiplyScalar(Math.max(90, r * 1.25))); cam.lookAt(c); cam.updateProjectionMatrix();
    renderer.setClearColor(look === 'real' ? 0xcfcac2 : 0xeef1f5, 1); // JPEG không có kênh alpha
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/jpeg', 0.86);
    renderer.setClearColor(0x000000, 0);
    for (const k in parts) parts[k].g.visible = vis[k];
    [fxG.visible, dimsG.visible] = keep; if (selBox) selBox.visible = keep[2]; scene.userData.grid.visible = keep[3];
    renderer.render(scene, camera);
    return url;
  }

  root.Scene3D = {
    _cam: (pos, tgt) => tweenTo(V(pos), V(tgt), true),
    // Đo thời gian vẽ một khung (ms, chờ GPU xong bằng readPixels); 'old' = vẽ lại bóng mỗi khung như trước
    _bench(mode = 'idle', n = 20) {
      const gl = renderer.getContext(), px = new Uint8Array(4), t0 = performance.now();
      for (let i = 0; i < n; i++) { if (mode === 'old') shadowDirty(); renderFrame(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
      return +((performance.now() - t0) / n).toFixed(1);
    }, // camera cố định cho ảnh kiểm tra
    setLook, getLook: () => look, snapshot, setQuality, getQuality: () => quality, pins: () => Object.keys(pinReg), // pins(): kiểm tra đi dây trong Console
    harness: () => HR, // bó dây theo kênh: độ dài từng dây, kênh đi qua, vị trí dây rút (Hồ sơ › Nối dây)
    init, build, sync, view, select, focus, partNo: (id) => partNos[id] || 0, fit: () => view(lastView),
    onFrame(cb) { frameCb = cb; }, onQuality(cb) { qualityCb = cb; }, onPick(cb) { onPick = cb; }, onMeasure(cb) { onMeasure = cb; },
    setExplode(t, cluster) { ex.target = t; if (cluster) ex.cluster = cluster; },
    getExplode: () => ({ ...ex }),
    setHidden(id, h) { if (h) hidden.add(id); else hidden.delete(id); },
    isHidden: (id) => hidden.has(id),
    isolate(id) { isolated = id || null; }, getIsolated: () => isolated,
    showAll() { hidden.clear(); isolated = null; },
    setInset(b) { inset = !!b; },
    setSection, setDims(b) { dimsOn = b; }, setLabels(b) { labelsOn = b; tip.hidden = true; }, setFlow(b) { flowOn = b; },
    setMeasure(b) { measureOn = b; if (!b) clearMeasure(); renderer.domElement.style.cursor = b ? 'crosshair' : 'grab'; }, clearMeasure,
    // fast: nhịp của màn "dựng từ đầu" (bay 0,75 s, bộ phận sau trễ 0,15 s); k = -1 là bàn trống
    setAssembly(k, fast) { asm = k == null ? null : { step: k, t0: performance.now(), travel: fast ? 750 : 1100, gap: fast ? 0.2 : 0.25 }; },
    storyStep,
    // Màn mở đầu: bộ phận bay về chỗ lần lượt theo bước lắp ráp trong khi camera lia từ trên cao, lệch trái về góc nhìn `name`.
    // Trả về thời lượng (s) để app cho Mega "khởi động" cùng lúc. Chạm/xoay chuột là dừng lia; giảm chuyển động thì bỏ qua.
    intro(name) {
      if (!model) return 0;
      view(name || lastView, true); if (still.matches) return 0;
      const p1 = camera.position.clone(), t1 = controls.target.clone();
      const off = p1.clone().sub(t1).applyAxisAngle(UP, -0.85).multiplyScalar(1.45); off.y *= 1.25;
      camera.position.copy(t1).add(off); controls.update();
      const ms = INTRO_TRAVEL + Math.max(0, ...Object.values(stepOf)) * INTRO_GAP;
      tween = { p0: camera.position.clone(), t0: t1.clone(), p1, t1, u: 0, k: 1000 / ms };
      introA = { t0: null, frames: 0, ms };
      return ms / 1000;
    },
  };
})(window);
