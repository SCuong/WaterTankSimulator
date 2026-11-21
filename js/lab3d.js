/* Bối cảnh chế độ Thực tế: góc phòng lab nhỏ (bàn gỗ sồi sáng, tường, cửa sổ bên trái, kệ, bảng treo dụng cụ, vài đồ trên bàn).
   Đơn vị mm, mặt bàn ở y = 0 cục bộ. Không nằm trong rootG nên không bấm chọn, không tháo rời, không bị mặt cắt.
   Tường chỉ vẽ mặt trong: camera lùi ra ngoài phòng vẫn nhìn xuyên được vào mô hình. */
(function (root) {
  'use strict';
  root.Lab3D = function (THREE, tex, noise) {
    const g = new THREE.Group(); g.name = 'lab';
    const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8, metalness: 0 }, o));
    const add = (geo, mat, x, y, z, cast) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = !!cast; g.add(m); return m; };
    const blk = (w, h, d, mat, x, y0, z, cast) => add(new THREE.BoxGeometry(w, h, d), mat, x, y0 + h / 2, z, cast);
    const wall = (w, h, mat, x, y, z, ry) => { const m = add(new THREE.PlaneGeometry(w, h), mat, x, y, z); m.rotation.y = ry; return m; };
    // Lặp gương: giấu đường nối khi ảnh Codex không liền mạch tuyệt đối
    const rep = (t, a, b) => { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.repeat.set(a, b); return t; };

    // ---- texture vẽ bằng canvas (chạy offline) ----
    const oak = tex(2048, 1024, (x, w, h) => { // gỗ sồi laminate: vân dọc theo chiều dài bàn
      x.fillStyle = '#c8a77e'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const y = Math.random() * h, a = Math.random() * 0.12, dark = Math.random() < 0.6;
        x.strokeStyle = dark ? `rgba(120,82,45,${a})` : `rgba(240,214,170,${a})`; x.lineWidth = 1 + Math.random() * 5;
        x.beginPath(); x.moveTo(0, y); for (let s = 1; s <= 8; s++) x.lineTo(s * w / 8, y + Math.sin(s * 0.9 + i) * (4 + Math.random() * 10)); x.stroke();
      }
      noise(x, w, h, 50000, 0.05, '90,60,30');
    });
    const paint = tex(1024, 1024, (x, w, h) => { x.fillStyle = '#ece3d2'; x.fillRect(0, 0, w, h); noise(x, w, h, 9000, 0.035, '120,110,95'); });
    const floorT = tex(1024, 1024, (x, w, h) => { // gạch vinyl xám nhạt 600 mm
      x.fillStyle = '#b9b5ad'; x.fillRect(0, 0, w, h); noise(x, w, h, 30000, 0.08, '70,70,70'); noise(x, w, h, 15000, 0.08, '255,255,255');
      x.strokeStyle = 'rgba(80,78,72,.35)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, w - 3, h - 3);
    });
    const frost = (x, w, h) => { x.filter = 'none'; x.fillStyle = 'rgba(250,250,247,.88)'; x.fillRect(0, h * 0.68, w, h * 0.32); }; // kính mờ ô dưới (như ảnh tham chiếu)
    const sky = tex(1024, 896, (x, w, h) => { // ngoài cửa sổ: trời sáng, tán cây mờ phía dưới
      const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#dfeefa'); gr.addColorStop(0.6, '#f6f9fb'); gr.addColorStop(1, '#eef2ea'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.filter = 'blur(14px)'; for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${70 + Math.random() * 40},${120 + Math.random() * 50},${60 + Math.random() * 30},.55)`; x.beginPath(); x.arc(Math.random() * w, h * 0.7 + Math.random() * h * 0.35, 30 + Math.random() * 60, 0, 7); x.fill(); }
      frost(x, w, h);
    });
    const peg = tex(1024, 576, (x, w, h) => { x.fillStyle = '#f1f1ee'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a3a3a'; for (let j = 18; j < h; j += 36) for (let i = 18; i < w; i += 36) { x.beginPath(); x.arc(i, j, 5.5, 0, 7); x.fill(); } });
    const mat = tex(1024, 720, (x, w, h) => { // tấm kê cắt xanh, lưới 10 mm
      x.fillStyle = '#2f6b4f'; x.fillRect(0, 0, w, h); noise(x, w, h, 12000, 0.06, '0,0,0');
      const px = w / 450; x.strokeStyle = 'rgba(235,245,235,.45)';
      for (let v = 0; v <= 450; v += 10) { x.lineWidth = v % 50 ? 1 : 2.4; x.beginPath(); x.moveTo(v * px, 0); x.lineTo(v * px, h); x.stroke(); }
      for (let v = 0; v <= 320; v += 10) { x.lineWidth = v % 50 ? 1 : 2.4; x.beginPath(); x.moveTo(0, v * px); x.lineTo(w, v * px); x.stroke(); }
    });
    const dmmFace = tex(256, 512, (x, w, h) => { // mặt đồng hồ vạn năng: màn LCD + vòng chọn thang
      x.fillStyle = '#262a2e'; x.fillRect(0, 0, w, h); x.fillStyle = '#a9b59a'; x.fillRect(28, 30, w - 56, 120);
      x.fillStyle = '#1a2014'; x.font = '700 70px Consolas, monospace'; x.textAlign = 'center'; x.fillText('5.02', w / 2, 118);
      x.strokeStyle = '#d8d8d0'; x.lineWidth = 3; x.beginPath(); x.arc(w / 2, 300, 88, 0, 7); x.stroke();
      ['V', 'mV', 'Ω', 'A', 'OFF', '~V'].forEach((t, i) => { const a = -2.4 + i * 0.95; x.fillStyle = '#e8e8e0'; x.font = '700 22px Arial'; x.fillText(t, w / 2 + Math.cos(a) * 112, 308 + Math.sin(a) * 112); });
      [['#c22', 70], ['#eee', 128], ['#eee', 186]].forEach(([c, px]) => { x.fillStyle = '#111'; x.beginPath(); x.arc(px, 460, 17, 0, 7); x.fill(); x.strokeStyle = c; x.lineWidth = 4; x.stroke(); });
    });

    // ---- phòng ----
    const W0 = -1300, W1 = 2600, Z0 = -560, Z1 = 2600, Y0 = -760, Y1 = 1700; // trái, phải, tường sau, tường trước, sàn, trần (so với mặt bàn)
    // Tường, sàn, trần phủ gần hết màn hình: Lambert (không BRDF GGX, không tra bản đồ môi trường) rẻ hơn nhiều mỗi điểm ảnh;
    // phần sáng hắt từ phòng (IBL) thay bằng emissive lấy chính texture
    const lam = (map, k, o) => new THREE.MeshLambertMaterial(Object.assign({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k }, o));
    const paintM = lam(rep(paint, 6, 4), 0.3);
    const floorM = lam(rep(floorT, 6.5, 5.3), 0.25);
    const fl = add(new THREE.PlaneGeometry(W1 - W0, Z1 - Z0), floorM, (W0 + W1) / 2, Y0, (Z0 + Z1) / 2); fl.rotation.x = -Math.PI / 2;
    const ce = add(new THREE.PlaneGeometry(W1 - W0, Z1 - Z0), new THREE.MeshLambertMaterial({ color: 0xf4f2ee, emissive: 0xf4f2ee, emissiveIntensity: 0.32 }), (W0 + W1) / 2, Y1, (Z0 + Z1) / 2); ce.rotation.x = Math.PI / 2;
    const H = Y1 - Y0, cy = (Y0 + Y1) / 2;
    wall(W1 - W0, H, paintM, (W0 + W1) / 2, cy, Z0, 0);
    wall(W1 - W0, H, paintM, (W0 + W1) / 2, cy, Z1, Math.PI);
    wall(Z1 - Z0, H, paintM, W1, cy, (Z0 + Z1) / 2, -Math.PI / 2);
    // Tường trái có cửa sổ: ô trống z ∈ [wz0, wz1], y ∈ [wy0, wy1]
    const wz0 = -420, wz1 = 1000, wy0 = 120, wy1 = 1350;
    const lw = (z0, z1, y0, y1) => wall(z1 - z0, y1 - y0, paintM, W0, (y0 + y1) / 2, (z0 + z1) / 2, Math.PI / 2);
    lw(Z0, wz0, Y0, Y1); lw(wz1, Z1, Y0, Y1); lw(wz0, wz1, Y0, wy0); lw(wz0, wz1, wy1, Y1);
    // Kính: hơi sáng hơn 1 để cửa sổ chói nhẹ sau tone mapping nhưng vẫn thấy tán cây (phản chiếu lấy từ bakeEnv)
    const glass = add(new THREE.PlaneGeometry(wz1 - wz0, wy1 - wy0), new THREE.MeshBasicMaterial({ map: sky, color: new THREE.Color(1.0, 1.0, 1.0) }), W0 - 60, (wy0 + wy1) / 2, (wz0 + wz1) / 2); glass.rotation.y = Math.PI / 2;
    const alu = std({ color: 0xd9dbdc, roughness: 0.35, metalness: 0.6 });
    const fr = (dz, dy, z, y) => blk(70, dy, dz, alu, W0 - 30, y - dy / 2, z);
    fr(wz1 - wz0 + 80, 40, (wz0 + wz1) / 2, wy0); fr(wz1 - wz0 + 80, 40, (wz0 + wz1) / 2, wy1); fr(40, wy1 - wy0, wz0, (wy0 + wy1) / 2); fr(40, wy1 - wy0, wz1, (wy0 + wy1) / 2);
    fr(30, wy1 - wy0, (wz0 + wz1) / 2, (wy0 + wy1) / 2); fr(wz1 - wz0, 30, (wz0 + wz1) / 2, wy0 + (wy1 - wy0) * 0.32);
    blk(150, 18, wz1 - wz0 + 140, paintM, W0 + 20, wy0 - 18, (wz0 + wz1) / 2); // bậu cửa
    const skirt = new THREE.MeshLambertMaterial({ color: 0xd8d2c8, emissive: 0xd8d2c8, emissiveIntensity: 0.25 }); blk(14, 90, Z1 - Z0, skirt, W1 - 7, Y0, (Z0 + Z1) / 2); blk(W1 - W0, 90, 14, skirt, (W0 + W1) / 2, Y0, Z0 + 7); // len chân tường

    // ---- bàn: mặt gỗ 1700 × 820 × 28, khung thép xám ----
    const DX0 = -760, DX1 = 940, DZ0 = -530, DZ1 = 290, DT = 28;
    const top = blk(DX1 - DX0, DT, DZ1 - DZ0, [std({ color: 0xb08f68, roughness: 0.6 }), std({ color: 0xb08f68, roughness: 0.6 }), std({ map: rep(oak, 1.4, 0.7), roughness: 0.45 }), std({ color: 0x8f7457 }), std({ color: 0xb59570, roughness: 0.55 }), std({ color: 0xb59570, roughness: 0.55 })], (DX0 + DX1) / 2, -DT, (DZ0 + DZ1) / 2);
    top.castShadow = false;
    const steel = std({ color: 0x6d7175, roughness: 0.45, metalness: 0.7 });
    for (const x of [DX0 + 40, DX1 - 40]) for (const z of [DZ0 + 40, DZ1 - 40]) blk(40, -DT - Y0, 40, steel, x, Y0, z);
    blk(DX1 - DX0 - 60, 60, 30, steel, (DX0 + DX1) / 2, -DT - 60, DZ1 - 45); blk(DX1 - DX0 - 60, 60, 30, steel, (DX0 + DX1) / 2, -DT - 60, DZ0 + 45);

    // ---- tường sau: bảng treo dụng cụ + kệ ----
    const pb = wall(900, 506, std({ map: peg, roughness: 0.6 }), 420, 600, Z0 + 12, 0);
    blk(900, 506, 10, std({ color: 0xe2e2de }), 420, 347, Z0 + 4);
    const tool = (x, y, col, len) => { // tua vít treo: cán màu + thân thép
      const c = add(new THREE.CylinderGeometry(8, 9, 95, 16), std({ color: col, roughness: 0.4 }), x, y, Z0 + 32, true);
      add(new THREE.CylinderGeometry(2.4, 2.4, len, 10), steel, x, y - 47 - len / 2, Z0 + 32, true); return c;
    };
    tool(140, 760, 0xd62828, 110); tool(190, 760, 0xf2b705, 90); tool(240, 760, 0x1d4ed8, 130);
    const spool = add(new THREE.TorusGeometry(36, 13, 14, 40), std({ color: 0xc81e1e, roughness: 0.45 }), 400, 720, Z0 + 34, true); // cuộn dây đỏ
    add(new THREE.CylinderGeometry(24, 24, 30, 24), std({ color: 0x1b1b1b }), 400, 720, Z0 + 34).rotation.x = Math.PI / 2;
    const plier = std({ color: 0x1f4fb3, roughness: 0.5 }); for (const s of [-1, 1]) { const p = blk(10, 120, 8, plier, 560 + s * 9, 640, Z0 + 30, true); p.rotation.z = s * 0.12; }
    blk(310, 2, 18, std({ color: 0xc9ccd0, roughness: 0.3, metalness: 0.8 }), 760, 760, Z0 + 26); // thước thép
    const oakShelf = oak.clone(); oakShelf.needsUpdate = true; // rep() đổi repeat tại chỗ: kệ cần bản riêng
    const shelfM = std({ map: rep(oakShelf, 0.45, 0.12), roughness: 0.55 });
    blk(720, 22, 210, shelfM, -340, 980, Z0 + 105, true);
    for (const x of [-620, -60]) blk(16, 60, 180, steel, x, 920, Z0 + 95);
    [[0x37506d, 36, 230], [0xb84a2e, 30, 250], [0xe2d6b8, 42, 215], [0x2f5d48, 28, 240]].reduce((x, [c, t, hgt]) => { blk(t, hgt, 160, std({ color: c, roughness: 0.75 }), x + t / 2, 1002, Z0 + 95, true); return x + t + 2; }, -660);
    for (const [x, c] of [[-380, 0xdedfdc], [-180, 0xdedfdc]]) { blk(170, 70, 130, std({ color: c, roughness: 0.35, transparent: true, opacity: 0.85 }), x, 1002, Z0 + 95, true); for (let i = 0; i < 4; i++) blk(36, 8, 110, std({ color: [0xe04040, 0x3080e0, 0xe0c030, 0x30b060][i] }), x - 60 + i * 40, 1003, Z0 + 95); } // hộp linh kiện

    // ---- nắng qua cửa sổ: đèn chiếu mang mặt nạ khung kính + tán lá, cùng hướng với đèn nắng chính (scene3d) để bóng trùng nhau ----
    const gobo = tex(512, 512, (x, w, h) => { // dự phòng khi chưa nạp ảnh Codex: 4 ô kính, vệt sáng mềm
      x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.filter = 'blur(12px)'; x.fillStyle = '#fff';
      for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) x.fillRect(60 + i * 204, 60 + j * 204, 184, 184);
    });
    const SUN_DIR = new THREE.Vector3(-1150, 1150, 420).normalize(), aim = new THREE.Vector3(-120, 0, 20);
    const spot = new THREE.SpotLight(0xffeed2, 3.4, 0, 0.2, 0.12);
    spot.position.copy(aim).addScaledVector(SUN_DIR, 2800); spot.target.position.copy(aim); spot.map = gobo;
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; spot.shadow.radius = 4;
    Object.assign(spot.shadow.camera, { near: 1800, far: 3800 }); g.add(spot, spot.target);

    // Texture Codex (js/lab-tex.js, nạp sau): vẽ đè lên canvas dự phòng, giữ nguyên wrap/repeat.
    // Không đổi kích thước canvas: WebGL2 cấp bộ nhớ texture cố định ở lần nạp đầu, ảnh khác cỡ sẽ không ghi được
    // flip: lật ngang ảnh cửa sổ để tán cây nằm ở ô kính phía camera
    const swaps = [[[oak, oakShelf], 'oak', 'brightness(1.12) saturate(0.82)'], [[paint], 'wall', 'brightness(1.02)'], [[sky], 'window', 'none', frost, true], [[gobo], 'gobo', 'contrast(1.7) brightness(0.95)']];
    function useImages(T) {
      for (const [ts, key, f, after, flip] of swaps) {
        if (!T[key]) continue; const im = new Image();
        im.onload = () => { const c = ts[0].image, x = c.getContext('2d'); x.filter = f; x.setTransform(flip ? -1 : 1, 0, 0, 1, flip ? c.width : 0, 0); x.drawImage(im, 0, 0, c.width, c.height); x.setTransform(1, 0, 0, 1, 0, 0); if (after) after(x, c.width, c.height); x.filter = 'none'; ts.forEach((t) => { t.needsUpdate = true; }); };
        im.src = T[key];
      }
    }

    // ---- đồ trên bàn: đặt theo khung bao mô hình trong place() ----
    const props = new THREE.Group(); g.add(props);
    const cut = new THREE.Mesh(new THREE.BoxGeometry(450, 2, 320), [0, 1, 2, 3, 4, 5].map((i) => (i === 2 ? std({ map: mat, roughness: 0.75 }) : std({ color: 0x2a5e45 })))); cut.receiveShadow = true; props.add(cut);
    const dmm = new THREE.Group(); props.add(dmm);
    const boot = std({ color: 0xf2b705, roughness: 0.7 });
    { const b = new THREE.Mesh(new THREE.BoxGeometry(82, 34, 160), boot); b.position.y = 17; b.castShadow = b.receiveShadow = true; dmm.add(b);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(68, 136), std({ map: dmmFace, roughness: 0.4 })); f.rotation.x = -Math.PI / 2; f.position.y = 34.2; dmm.add(f);
      const k = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 6, 32), std({ color: 0x1e1e1e, roughness: 0.5 })); k.position.set(0, 37, 8); k.castShadow = true; dmm.add(k);
      const curve = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      [[0xc01818, [[-26, 33, 64], [-40, 6, 120], [-110, 3, 150], [-150, 3, 60], [-120, 3, -10]]], [0x141414, [[-11, 33, 64], [10, 6, 130], [60, 3, 170], [130, 3, 120], [150, 3, 40]]]].forEach(([c, pts]) => {
        const t = new THREE.Mesh(new THREE.TubeGeometry(curve(pts), 60, 1.8, 8), std({ color: c, roughness: 0.4 })); t.castShadow = true; dmm.add(t);
      });
    }
    // Bóng tiếp xúc dưới mô hình: bóng nắng chỉ cho viền cứng, lớp này làm mô hình "ngồi" trên bàn
    const cst = tex(256, 256, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.filter = 'blur(18px)'; x.fillStyle = '#fff'; x.fillRect(40, 40, w - 80, h - 80); }, false); // alphaMap đọc kênh G
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ alphaMap: cst, color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }));
    contact.rotation.x = -Math.PI / 2; contact.position.y = 0.6; contact.renderOrder = -1; g.add(contact);

    g.traverse((o) => { o.userData.fx = true; });
    return {
      group: g, bounds: { W0, W1, Z0, Z1, Y0, Y1 }, useImages,
      setQuality(hq) { spot.castShadow = hq; }, // máy yếu: bỏ bản đồ bóng thứ hai
      // box: Box3 của mô hình (toạ độ thế giới), deskY: cao độ mặt bàn
      place(box, deskY) {
        g.position.y = deskY;
        const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2, sx = box.max.x - box.min.x, sz = box.max.z - box.min.z;
        contact.position.set(cx, 0.6, cz); contact.scale.set(sx * 1.25 + 40, sz * 1.25 + 40, 1);
        cut.position.set(box.max.x + 260, 1, Math.min(DZ1 - 175, cz + 40)); cut.rotation.y = -0.06;
        dmm.position.set(box.max.x + 300, 2, Math.min(DZ1 - 100, cz + 30)); dmm.rotation.y = -0.35;
      },
    };
  };
})(window);
