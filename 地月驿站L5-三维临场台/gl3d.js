/* ============================================================
   gl3d.js —— 《地月驿站 L5 · 三维临场台》自研 WebGL 渲染层
   目标：零第三方依赖（不引入 Three.js / Babylon 等任何 3D 引擎），
        只用浏览器自带的 WebGL 1/2 完成：相机、透视、网格、
        程序化球体着色（地球/月球）、半透明零速度面、线段、点精灵。

   约定：
     · 全部矩阵为列主序 Float32Array(16)，与 WebGL 一致；
     · 只有旋转 + 等比缩放参与模型变换，所以法线矩阵取 3×3 左上块即可；
     · 渲染层不含任何业务语义（不知道什么叫 L5、什么叫零速度面）——
       业务在 scene3d.js / ui3d.js，与二维版「规则层 / 呈现层」的分层一致。
   ============================================================ */
(function (root) {
  'use strict';

  /* ---------------- 4×4 矩阵（列主序） ---------------- */
  const M4 = {
    ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
    mul(a, b) {                       /* a * b */
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
          let s = 0;
          for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
          o[c * 4 + r] = s;
        }
      }
      return o;
    },
    perspective(fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      const m = new Float32Array(16);
      m[0] = f / aspect; m[5] = f; m[10] = (far + near) * nf; m[11] = -1;
      m[14] = 2 * far * near * nf;
      return m;
    },
    lookAt(eye, target, up) {
      const z = norm(sub(eye, target));
      const x = norm(cross(up, z));
      const y = cross(z, x);
      const m = new Float32Array(16);
      m[0] = x[0]; m[4] = x[1]; m[8] = x[2];
      m[1] = y[0]; m[5] = y[1]; m[9] = y[2];
      m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
      m[12] = -dot(x, eye); m[13] = -dot(y, eye); m[14] = -dot(z, eye); m[15] = 1;
      return m;
    },
    rotZ(a) {
      const c = Math.cos(a), s = Math.sin(a);
      const m = M4.ident();
      m[0] = c; m[1] = s; m[4] = -s; m[5] = c;
      return m;
    },
    rotX(a) {
      const c = Math.cos(a), s = Math.sin(a);
      const m = M4.ident();
      m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
      return m;
    },
    rotY(a) {
      const c = Math.cos(a), s = Math.sin(a);
      const m = M4.ident();
      m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
      return m;
    },
    translate(x, y, z) { const m = M4.ident(); m[12] = x; m[13] = y; m[14] = z; return m; },
    scale(s) { const m = M4.ident(); m[0] = m[5] = m[10] = s; return m; },
    /* 组合：translate(t) · rotZ(rz) · scale(s)（只覆盖本作品用到的情形） */
    trs(t, rz, s) {
      const m = M4.rotZ(rz || 0);
      m[0] *= s; m[1] *= s; m[2] *= s;
      m[4] *= s; m[5] *= s; m[6] *= s;
      m[8] *= s; m[9] *= s; m[10] *= s;
      m[12] = t[0]; m[13] = t[1]; m[14] = t[2];
      return m;
    }
  };

  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  /* ---------------- 着色器 ---------------- */
  const VS = [
    'attribute vec3 aPos;',
    'attribute vec3 aNrm;',
    'attribute vec3 aCol;',
    'uniform mat4 uProj, uView, uModel, uWorld;',
    'uniform float uPointSize, uPointScale;',
    'uniform float uMode;',
    'varying vec3 vN, vW, vObj, vCol;',
    'void main(){',
    '  mat4 M = uWorld * uModel;',
    '  vec4 wp = M * vec4(aPos, 1.0);',
    '  vW = wp.xyz; vObj = aPos; vCol = aCol;',
    '  vN = mat3(M[0].xyz, M[1].xyz, M[2].xyz) * aNrm;',
    '  vec4 vp = uView * wp;',
    '  gl_Position = uProj * vp;',
    '  if (uMode > 1.5) { gl_PointSize = clamp(uPointSize, 1.0, 64.0); }',
    '  else { gl_PointSize = 1.0; }',
    '}'
  ].join('\n');

  const FS = [
    'precision highp float;',
    'varying vec3 vN, vW, vObj, vCol;',
    'uniform vec3 uColor, uColor2, uLightDir, uCam;',
    'uniform float uAlpha, uNoise, uRim, uUseCol, uPlanet;',
    'uniform float uMode;',
    'float hash(vec3 p){',
    '  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));',
    '  p *= 17.0;',
    '  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));',
    '}',
    'float vnoise(vec3 x){',
    '  vec3 i = floor(x), f = fract(x);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float n000 = hash(i), n100 = hash(i + vec3(1,0,0));',
    '  float n010 = hash(i + vec3(0,1,0)), n110 = hash(i + vec3(1,1,0));',
    '  float n001 = hash(i + vec3(0,0,1)), n101 = hash(i + vec3(1,0,1));',
    '  float n011 = hash(i + vec3(0,1,1)), n111 = hash(i + vec3(1,1,1));',
    '  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),',
    '             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);',
    '}',
    'float fbm(vec3 p){',
    '  float a = 0.5, s = 0.0;',
    '  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }',
    '  return s;',
    '}',
    'void main(){',
    '  if (uMode > 1.5) {',
    '    vec2 d = gl_PointCoord - vec2(0.5);',
    '    float r = length(d);',
    '    if (r > 0.5) discard;',
    '    float a = smoothstep(0.5, 0.08, r);',
    '    gl_FragColor = vec4(mix(uColor, vCol, uUseCol), uAlpha * a);',
    '    return;',
    '  }',
    '  if (uMode > 0.5 && uMode < 1.5) {',
    '    gl_FragColor = vec4(mix(uColor, vCol, uUseCol), uAlpha);',
    '    return;',
    '  }',
    '  vec3 n = normalize(vN);',
    '  if (!gl_FrontFacing) n = -n;',
    '  vec3 base = mix(uColor, uColor2, uNoise > 0.0 ? smoothstep(0.35, 0.75, fbm(vObj * uNoise)) : 0.0);',
    '  base = mix(base, vCol, uUseCol);',
    '  if (uPlanet > 0.5) {',
    '    vec3 p = normalize(vObj);',
    '    float f = fbm(p * 2.6);',
    '    if (uPlanet < 1.5) {',
    '      vec3 ocean = vec3(0.035, 0.115, 0.215);',
    '      vec3 shallow = vec3(0.06, 0.24, 0.33);',
    '      vec3 land = mix(vec3(0.30, 0.33, 0.20), vec3(0.52, 0.46, 0.30), smoothstep(0.45, 0.72, fbm(p * 6.0)));',
    '      base = mix(ocean, shallow, smoothstep(0.34, 0.56, f));',
    '      base = mix(base, land, smoothstep(0.55, 0.63, f));',
    '      base = mix(base, vec3(0.80, 0.84, 0.88), smoothstep(0.80, 0.95, abs(p.y)));',
    '    } else {',
    '      float c = fbm(p * 3.6);',
    '      base = mix(vec3(0.26, 0.255, 0.245), vec3(0.55, 0.545, 0.52), smoothstep(0.28, 0.72, c));',
    '      base = mix(base, vec3(0.72, 0.71, 0.68), smoothstep(0.78, 0.93, fbm(p * 9.0)) * 0.35);',
    '    }',
    '  }',
    '  float diff = max(dot(n, normalize(uLightDir)), 0.0);',
    '  float lit = smoothstep(-0.12, 0.42, diff);',
    '  vec3 col = base * (0.16 + 0.9 * lit);',
    '  vec3 V = normalize(uCam - vW);',
    '  float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0);',
    '  col += uRim * rim * vec3(0.30, 0.55, 0.85);',
    '  gl_FragColor = vec4(col, uAlpha);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('shader compile failed: ' + log);
    }
    return sh;
  }

  function createRenderer(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true })
      || canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL 不可用');

    const prog = gl.createProgram();
    const vs = compile(gl, gl.VERTEX_SHADER, VS);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.bindAttribLocation(prog, 1, 'aNrm');
    gl.bindAttribLocation(prog, 2, 'aCol');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('program link failed: ' + gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    const U = {};
    ['uProj', 'uView', 'uModel', 'uWorld', 'uPointSize', 'uPointScale', 'uMode',
      'uColor', 'uColor2', 'uLightDir', 'uCam', 'uAlpha', 'uNoise', 'uRim', 'uUseCol', 'uPlanet']
      .forEach((k) => { U[k] = gl.getUniformLocation(prog, k); });

    const cam = { az: 0.92, el: 0.52, dist: 2.95, fov: 42 * Math.PI / 180, target: [0, 0, 0] };
    let view = M4.ident(), proj = M4.ident(), vp = M4.ident();
    let W = M4.ident();
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    let cssW = 1, cssH = 1;

    function eye() {
      const ce = Math.cos(cam.el), se = Math.sin(cam.el);
      return [
        cam.target[0] + cam.dist * ce * Math.cos(cam.az),
        cam.target[1] + cam.dist * ce * Math.sin(cam.az),
        cam.target[2] + cam.dist * se
      ];
    }

    function resize() {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      cssW = canvas.clientWidth; cssH = canvas.clientHeight;
      gl.viewport(0, 0, w, h);
    }

    function begin() {
      resize();
      const aspect = canvas.width / Math.max(1, canvas.height);
      const e = eye();
      view = M4.lookAt(e, cam.target, [0, 0, 1]);
      proj = M4.perspective(cam.fov, aspect, 0.05, 60);
      vp = M4.mul(proj, view);
      gl.clearColor(0.031, 0.037, 0.045, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      gl.uniformMatrix4fv(U.uProj, false, proj);
      gl.uniformMatrix4fv(U.uView, false, view);
      gl.uniform1f(U.uPointScale, canvas.height / (2 * Math.tan(cam.fov / 2)));
      gl.uniform3f(U.uCam, e[0], e[1], e[2]);
      /* 光源方向固定在相机上方偏左（视角空间），这样旋转视角时明暗稳定 */
      const L = norm([-0.42, 0.36, 0.83]);
      gl.uniform3f(U.uLightDir, L[0], L[1], L[2]);
      return { gl, view, proj, vp, cssW, cssH, dpr };
    }

    function setWorld(mat) { W = mat; }

    function draw(mesh, o) {
      const opt = o || {};
      const mode = opt.mode || mesh.mode || 0;           /* 0 三角 / 1 线 / 2 点 */
      gl.uniformMatrix4fv(U.uWorld, false, opt.world || W);
      gl.uniformMatrix4fv(U.uModel, false, opt.model || M4.ident());
      gl.uniform1f(U.uMode, mode);
      gl.uniform1f(U.uAlpha, opt.alpha == null ? 1 : opt.alpha);
      gl.uniform3fv(U.uColor, opt.color || [0.8, 0.8, 0.8]);
      gl.uniform3fv(U.uColor2, opt.color2 || opt.color || [0.8, 0.8, 0.8]);
      gl.uniform1f(U.uNoise, opt.noise || 0);
      gl.uniform1f(U.uRim, opt.rim || 0);
      gl.uniform1f(U.uUseCol, opt.useVertexColor ? 1 : 0);
      gl.uniform1f(U.uPlanet, opt.planet || 0);
      gl.uniform1f(U.uPointSize, (opt.pointSize || 6) * dpr);

      if (mode === 0) {
        if (opt.cullFront) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); }
        else if (opt.cull === false) gl.disable(gl.CULL_FACE);
        else { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); }
        if (opt.depthWrite === false) gl.depthMask(false); else gl.depthMask(true);
        if (opt.additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      } else {
        gl.disable(gl.CULL_FACE);
        if (opt.depthWrite === false) gl.depthMask(false); else gl.depthMask(true);
        if (opt.additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }

      bind(mesh);
      if (mesh.idx) gl.drawElements(mesh.prim, mesh.count, gl.UNSIGNED_SHORT, 0);
      else gl.drawArrays(mesh.prim, 0, mesh.count);
      if (mode === 0 && opt.depthWrite === false) gl.depthMask(true);
    }

    function bind(mesh) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      if (mesh.nrm) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nrm);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      } else {
        gl.disableVertexAttribArray(1);
        gl.vertexAttrib3f(1, 0, 0, 1);
      }
      if (mesh.col) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.col);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
      } else {
        gl.disableVertexAttribArray(2);
        gl.vertexAttrib3f(2, 1, 1, 1);
      }
      if (mesh.idx) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
    }

    function makeMesh(data) {
      const m = {
        pos: gl.createBuffer(),
        nrm: null, col: null, idx: null,
        count: data.pos.length / 3,
        /* gl.TRIANGLES = 4，gl.POINTS = 0，gl.LINES = 1，gl.LINE_STRIP = 3 */
        prim: data.prim == null ? (data.idx ? 4 : 0) : data.prim,
        mode: data.mode == null ? 0 : data.mode
      };
      gl.bindBuffer(gl.ARRAY_BUFFER, m.pos);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.pos), gl.STATIC_DRAW);
      if (data.nrm) {
        m.nrm = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, m.nrm);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.nrm), gl.STATIC_DRAW);
      }
      if (data.col) {
        m.col = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, m.col);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.col), gl.STATIC_DRAW);
      }
      if (data.idx) {
        m.idx = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.idx), gl.STATIC_DRAW);
        m.count = data.idx.length;
      }
      return m;
    }

    /* 动态线（轨迹回放用）：整条重建比增量更新简单，且点数只有几百 */
    function updatePoints(mesh, pos, col) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.DYNAMIC_DRAW);
      mesh.count = pos.length / 3;
      if (col) {
        if (!mesh.col) mesh.col = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.col);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(col), gl.DYNAMIC_DRAW);
      }
    }

    /* 把世界坐标点投到 CSS 像素坐标（供 HTML 标签定位） */
    function project(p) {
      const x = p[0], y = p[1], z = p[2];
      const wx = W[0] * x + W[4] * y + W[8] * z + W[12];
      const wy = W[1] * x + W[5] * y + W[9] * z + W[13];
      const wz = W[2] * x + W[6] * y + W[10] * z + W[14];
      const cx = vp[0] * wx + vp[4] * wy + vp[8] * wz + vp[12];
      const cy = vp[1] * wx + vp[5] * wy + vp[9] * wz + vp[13];
      const cw = vp[3] * wx + vp[7] * wy + vp[11] * wz + vp[15];
      if (cw <= 0.0001) return { x: -9999, y: -9999, ok: false };
      const nx = cx / cw, ny = cy / cw;
      return { x: (nx * 0.5 + 0.5) * cssW, y: (0.5 - ny * 0.5) * cssH, ok: true, ndc: [nx, ny] };
    }

    function destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }

    function deleteMesh(m) {
      if (!m) return;
      [m.pos, m.nrm, m.col, m.idx].forEach((b) => { if (b) gl.deleteBuffer(b); });
    }

    return { gl, cam, begin, draw, makeMesh, updatePoints, deleteMesh, setWorld, project, destroy, U,
      get size() { return { w: cssW, h: cssH, dpr }; } };
  }

  root.GL3D = { createRenderer, M4, vec: { sub, cross, dot, norm } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
