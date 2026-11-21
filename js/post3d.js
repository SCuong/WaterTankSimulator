/* Hậu kỳ kiểu máy ảnh cho chế độ Thực tế (chất lượng cao), viết gọn thay cho EffectComposer/SSAOPass (không có trong vendor):
   1) vẽ cảnh vào render target HDR (r147 không tone map khi vẽ vào render target),
   2) khi camera đứng yên (k → 1): thêm một lượt chỉ độ sâu, tính AO từ độ sâu + pháp tuyến dựng lại, làm mờ nền theo độ sâu (DOF),
   3) viền tối nhẹ, ACES + sRGB như renderer. Lúc đang xoay k = 0: chỉ tone map, không tốn thêm lượt vẽ. */
(function (root) {
  'use strict';
  root.Post3D = function (THREE, renderer) {
    const rtC = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const rtD = new THREE.WebGLRenderTarget(1, 1); rtD.depthTexture = new THREE.DepthTexture(1, 1);
    const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false });
    const mat = new THREE.ShaderMaterial({
      extensions: { derivatives: true }, depthTest: false, depthWrite: false,
      uniforms: { tColor: { value: rtC.texture }, tDepth: { value: rtD.depthTexture }, res: { value: new THREE.Vector2(1, 1) }, near: { value: 5 }, far: { value: 2e4 }, px: { value: 1 }, py: { value: 1 }, focus: { value: 1000 }, k: { value: 0 }, expo: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tColor, tDepth; uniform vec2 res; uniform float near, far, px, py, focus, k, expo; varying vec2 vUv;
        float vz(vec2 uv) { float n = texture2D(tDepth, uv).x * 2.0 - 1.0; return 2.0 * near * far / (far + near - n * (far - near)); }
        vec3 vpos(vec2 uv, float z) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * z / px, n.y * z / py, -z); }
        // Thấu kính mỏng có vùng nét ±BAND quanh tâm nhìn: cả mô hình nét, tường/cửa sổ và mép bàn gần mờ dần
        const float BAND = 330.0, APER = 2.6, MAXPX = 7.0;
        float coc(float z) { return clamp(max(abs(z - focus) - BAND, 0.0) / z * APER, 0.0, 1.0) * MAXPX * k; }
        vec3 postRRT(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
        vec3 postAces(vec3 c) { // giống ACESFilmicToneMapping của three r147 (tên riêng: three tự chèn hàm cùng tên vào mọi ShaderMaterial)
          c *= expo / 0.6;
          c = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777) * c;
          c = postRRT(c);
          c = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602) * c;
          return clamp(c, 0.0, 1.0);
        }
        vec3 postSrgb(vec3 v) { return mix(pow(v, vec3(0.41666)) * 1.055 - vec3(0.055), v * 12.92, vec3(lessThanEqual(v, vec3(0.0031308)))); }
        void main() {
          vec4 c0 = texture2D(tColor, vUv); vec3 col = c0.rgb;
          if (k > 0.001) {
            float z0 = vz(vUv), cc = coc(z0);
            if (cc > 0.6) { // DOF: gom 24 điểm đĩa xoắn; điểm gần mà nét không được lem ra nền phía sau
              vec3 acc = col; float wsum = 1.0;
              for (int i = 0; i < 24; i++) {
                float fi = float(i) + 0.5, r = sqrt(fi / 24.0), an = fi * 2.39996;
                vec2 uv = vUv + vec2(cos(an), sin(an)) * r * cc / res; float zs = vz(uv);
                float w = zs >= z0 - 8.0 ? 1.0 : clamp(coc(zs) / (r * cc + 0.001), 0.0, 1.0);
                acc += texture2D(tColor, uv).rgb * w; wsum += w;
              }
              col = acc / wsum;
            }
            if (z0 < far * 0.9) { // AO: bán cầu theo pháp tuyến dựng từ đạo hàm độ sâu, bán kính 26 mm
              vec3 p = vpos(vUv, z0), n = normalize(cross(dFdx(p), dFdy(p))); if (dot(n, p) > 0.0) n = -n;
              float R = 26.0, rpx = clamp(R * py * 0.5 * res.y / z0, 2.0, 48.0), occ = 0.0;
              float rot = 6.2831 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
              for (int i = 0; i < 16; i++) {
                float fi = float(i) + 0.5, an = rot + fi * 2.39996;
                vec2 uv = vUv + vec2(cos(an), sin(an)) * sqrt(fi / 16.0) * rpx / res;
                vec3 v = vpos(uv, vz(uv)) - p; float d = length(v);
                occ += max(0.0, dot(v, n) / (d + 0.001) - 0.12) * (1.0 - smoothstep(0.0, 2.0 * R, d));
              }
              col *= 1.0 - k * clamp(occ / 16.0 * 1.7, 0.0, 0.6) * (1.0 - clamp(cc / 3.0, 0.0, 1.0)); // nền đã mờ thì bỏ AO (tránh nhiễu)
            }
          }
          col *= mix(vec3(1.0), vec3(1.02, 1.0, 0.97), k); // cân trắng hơi ấm, hiện dần cùng AO/DOF: k = 0 trùng khớp ảnh vẽ thẳng (lúc xoay)
          col = postAces(col);
          gl_FragColor = vec4(postSrgb(col), c0.a);
        }`,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
    const qScene = new THREE.Scene(); qScene.add(quad); const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    let hideList = [];
    return {
      setSize(w, h) { const pr = renderer.getPixelRatio(); rtC.setSize(w * pr, h * pr); rtD.setSize(w * pr, h * pr); mat.uniforms.res.value.set(w * pr, h * pr); },
      // Vật trong suốt không ghi độ sâu cho AO/DOF (nước, nhựa, ống, kính): gọi lại sau mỗi lần dựng
      collect(scene) { hideList = []; scene.traverse((o) => { if (o.isMesh && [].concat(o.material).some((m) => m.transparent || m.transmission > 0)) hideList.push(o); }); },
      render(scene, camera, k, focus, clip, freshDepth) { // freshDepth: vẽ lại lượt độ sâu (camera/bộ phận vừa đổi)
        renderer.setRenderTarget(rtC); renderer.clear(); renderer.render(scene, camera);
        const U = mat.uniforms;
        if (k > 0.001 && freshDepth !== false) {
          const vis = hideList.map((o) => o.visible); hideList.forEach((o) => { o.visible = false; });
          const au = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
          depthMat.clippingPlanes = clip; scene.overrideMaterial = depthMat;
          renderer.setRenderTarget(rtD); renderer.clear(); renderer.render(scene, camera);
          scene.overrideMaterial = null; renderer.shadowMap.autoUpdate = au; hideList.forEach((o, i) => { o.visible = vis[i]; });
        }
        U.near.value = camera.near; U.far.value = camera.far; U.px.value = camera.projectionMatrix.elements[0]; U.py.value = camera.projectionMatrix.elements[5];
        U.focus.value = focus; U.k.value = k; U.expo.value = renderer.toneMappingExposure;
        renderer.setRenderTarget(null); renderer.render(qScene, qCam);
      },
    };
  };
})(window);
