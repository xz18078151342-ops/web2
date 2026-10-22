/* ============================================================
   scene3d.js —— 《地月驿站 L5 · 三维临场台》场景装配
   把「模型数值」变成「可画的几何」：地球/月球、五个平动点、
   三维零速度面（有洞的穹顶）、L1 门洞、三角点连线、轨迹、驿站站体。
   本文件只依赖 gl3d.js 与 algo3d.js，不碰 DOM（标签由 ui3d.js 定位）。
   ============================================================ */
(function (root) {
  'use strict';
  const A3 = root.CR3BP3;
  const G = root.GL3D;
  const M4 = G.M4;

  /* 显示参数（不是物理参数）：天体半径按真实比例的 4.5 倍放大，否则看不见 */
  const EARTH_R = 0.085;
  const MOON_R = 0.048;
  const Z_CLIP = 0.60;          /* 零速度面在图上裁到的高度（真实值在地球附近发散） */
  const NX = 110, NY = 90;
  const X0 = -1.50, X1 = 1.50, Y0 = -1.15, Y1 = 1.15;

  /* ---------------- 几何构造 ---------------- */
  function sphereMesh(R, seg, rings) {
    const pos = [], nrm = [], idx = [];
    for (let j = 0; j <= rings; j++) {
      const v = j / rings, phi = v * Math.PI;
      for (let i = 0; i <= seg; i++) {
        const u = i / seg, th = u * Math.PI * 2;
        const x = Math.sin(phi) * Math.cos(th);
        const y = Math.sin(phi) * Math.sin(th);
        const z = Math.cos(phi);
        pos.push(x * R, y * R, z * R);
        nrm.push(x, y, z);
      }
    }
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i, b = a + seg + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return { pos, nrm, idx };
  }

  function boxMesh(w, h, d) {
    const x = w / 2, y = h / 2, z = d / 2;
    const P = [
      [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
      [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]
    ];
    const F = [
      [0, 1, 2, 3, 0, 0, -1], [5, 4, 7, 6, 0, 0, 1],
      [4, 0, 3, 7, -1, 0, 0], [1, 5, 6, 2, 1, 0, 0],
      [3, 2, 6, 7, 0, 1, 0], [4, 5, 1, 0, 0, -1, 0]
    ];
    const pos = [], nrm = [], idx = [];
    F.forEach((f, k) => {
      const base = k * 4;
      for (let i = 0; i < 4; i++) {
        pos.push(P[f[i]][0], P[f[i]][1], P[f[i]][2]);
        nrm.push(f[4], f[5], f[6]);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
    return { pos, nrm, idx };
  }

  function cylinderMesh(r0, r1, h, seg, cap) {
    const pos = [], nrm = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pos.push(c * r0, -h / 2, s * r0); nrm.push(c, 0, s);
      pos.push(c * r1, h / 2, s * r1); nrm.push(c, 0, s);
    }
    for (let i = 0; i < seg; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    if (cap) {
      [['top', 1, r1], ['bot', -1, r0]].forEach(([name, sign, r]) => {
        const c0 = pos.length / 3;
        pos.push(0, sign * h / 2, 0); nrm.push(0, sign, 0);
        for (let i = 0; i <= seg; i++) {
          const a = i / seg * Math.PI * 2;
          pos.push(Math.cos(a) * r, sign * h / 2, Math.sin(a) * r);
          nrm.push(0, sign, 0);
        }
        for (let i = 0; i < seg; i++) {
          if (sign > 0) idx.push(c0, c0 + 1 + i, c0 + 2 + i);
          else idx.push(c0, c0 + 2 + i, c0 + 1 + i);
        }
      });
    }
    return { pos, nrm, idx };
  }

  function torusMesh(R, r, seg, tube) {
    const pos = [], nrm = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
      for (let j = 0; j <= tube; j++) {
        const v = j / tube * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
        const nx = su * cv, ny = sv, nz = cu * cv;
        pos.push((R + r * cv) * su, r * sv, (R + r * cv) * cu);
        nrm.push(nx, ny, nz);
      }
    }
    for (let i = 0; i < seg; i++) {
      for (let j = 0; j < tube; j++) {
        const a = i * (tube + 1) + j, b = a + tube + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return { pos, nrm, idx };
  }

  function lineMesh(segs, colors) {
    const pos = [], col = [];
    for (let i = 0; i < segs.length; i++) {
      pos.push(segs[i][0], segs[i][1], segs[i][2]);
      const c = colors ? colors[Math.floor(i / 2) % colors.length] : [1, 1, 1];
      col.push(c[0], c[1], c[2]);
    }
    return { pos, col, prim: 1, mode: 1 };   /* gl.LINES */
  }

  function pointsMesh(list, colors, sizes) {
    const pos = [], col = [], sz = [];
    list.forEach((p, i) => {
      pos.push(p[0], p[1], p[2]);
      const c = colors[i % colors.length];
      col.push(c[0], c[1], c[2]);
      sz.push(sizes ? sizes[i % sizes.length] : 1);
    });
    return { pos, col, prim: 0, mode: 2 };
  }

  /* ---------------- 零速度面网格 ----------------
     逐栅格解 |z|；把「解存在且 z ≤ Z_CLIP」的格子连成三角网。
     解本身由 algo3d.zvsZ 给出（二分求根），这里只负责铺面。 */
  function buildSurface(mu, C, colors) {
    const verts = [], cols = [], idx = [];
    const zs = new Float32Array(NX * NY);
    const okFlag = new Uint8Array(NX * NY);
    for (let j = 0; j < NY; j++) {
      const y = Y0 + (Y1 - Y0) * j / (NY - 1);
      for (let i = 0; i < NX; i++) {
        const x = X0 + (X1 - X0) * i / (NX - 1);
        const r = A3.zvsZ(x, y, mu, C);
        const k = j * NX + i;
        /* 主天体附近高度发散到几十 D：夹到 Z_CLIP，并让颜色在接近顶部时淡出。
           这样漏斗不是被「剪出一个洞」，而是自然溶进背景 —— 没有锯齿边。 */
        const good = r.z != null;
        const zc = good ? Math.min(r.z, Z_CLIP) : 0;
        if (good) { zs[k] = zc; okFlag[k] = 1; }
        verts.push(x, y, zc);
        const tt = good ? zc / Z_CLIP : 0;
        /* 两段淡出：靠近轨道面时淡（避免和平面网格叠成暗带），接近裁切高度也淡 */
        const fadeHi = 1 - 0.8 * Math.max(0, Math.min(1, (tt - 0.55) / 0.45));
        const fadeLo = Math.max(0, Math.min(1, (tt - 0.03) / 0.20));
        const fade = fadeHi * fadeLo;
        cols.push((0.20 + 0.62 * tt) * fade, (0.52 + 0.14 * tt) * fade, (0.50 - 0.16 * tt) * fade);
      }
    }
    for (let j = 0; j < NY - 1; j++) {
      for (let i = 0; i < NX - 1; i++) {
        const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
        if (okFlag[a] && okFlag[b] && okFlag[c] && okFlag[d]) {
          idx.push(a, c, b, b, c, d);
        }
      }
    }
    /* 法线：用相邻高度差分（对 (x,y) 求导），边缘退回竖直 */
    const nrm = [];
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        if (!okFlag[k]) { nrm.push(0, 0, 1); continue; }
        const hx = (X1 - X0) / (NX - 1), hy = (Y1 - Y0) / (NY - 1);
        const inRow = i > 0 && i < NX - 1;
        const inCol = j > 0 && j < NY - 1;
        const hl = inRow && okFlag[k - 1] ? zs[k - 1] : zs[k];
        const hr = inRow && okFlag[k + 1] ? zs[k + 1] : zs[k];
        const hd = inCol && okFlag[k - NX] ? zs[k - NX] : zs[k];
        const hu = inCol && okFlag[k + NX] ? zs[k + NX] : zs[k];
        const dzdx = (hr - hl) / (2 * hx), dzdy = (hu - hd) / (2 * hy);
        const nx = -dzdx, ny = -dzdy, nz = 1;
        const l = Math.hypot(nx, ny, nz) || 1;
        nrm.push(nx / l, ny / l, nz / l);
      }
    }
    /* 线框：每 4 格取一条，断在孔边或不连续处（不把两张皮连起来） */
    const wpos = [], wcol = [];
    const seg = (a, b) => {
      if (!okFlag[a] || !okFlag[b]) return;
      if (Math.abs(zs[a] - zs[b]) > 0.35) return;
      wpos.push(verts[a * 3], verts[a * 3 + 1], verts[a * 3 + 2],
        verts[b * 3], verts[b * 3 + 1], verts[b * 3 + 2]);
      const tA = zs[a] / Z_CLIP;
      const fA = (1 - Math.max(0, Math.min(1, (tA - 0.55) / 0.45))) * Math.max(0, Math.min(1, (tA - 0.03) / 0.20));
      const rA = 0.30 * fA, gA = 0.55 * fA, bA = 0.52 * fA;
      wcol.push(rA, gA, bA, rA, gA, bA);
    };
    for (let j = 0; j < NY; j += 8) {
      for (let i = 0; i < NX - 1; i++) seg(j * NX + i, j * NX + i + 1);
    }
    for (let i = 0; i < NX; i += 8) {
      for (let j = 0; j < NY - 1; j++) seg(j * NX + i, (j + 1) * NX + i);
    }
    return { pos: verts, nrm, col: cols, idx, wire: { pos: wpos, col: wcol } };
  }

  /* ---------------- 场景 ---------------- */
  function create(renderer, palette) {
    const P = palette;
    const geo = {
      sphere: renderer.makeMesh(sphereMesh(1, 56, 36)),
      box: renderer.makeMesh(boxMesh(1, 1, 1)),
      cyl: renderer.makeMesh(cylinderMesh(1, 1, 1, 20, true)),
      torus: renderer.makeMesh(torusMesh(1, 0.12, 36, 10)),
      /* 驿站站体：尺寸直接烘进网格，避免每帧做非等比缩放 */
      station: {
        trunk: renderer.makeMesh(cylinderMesh(0.0060, 0.0060, 0.038, 20, true)),
        truss: renderer.makeMesh(cylinderMesh(0.0026, 0.0026, 0.011, 12, true)),
        ring: renderer.makeMesh(torusMesh(0.021, 0.0028, 40, 10)),
        panel: renderer.makeMesh(boxMesh(0.038, 0.0012, 0.019)),
        rad: renderer.makeMesh(boxMesh(0.019, 0.0011, 0.014)),
        beacon: renderer.makeMesh(sphereMesh(0.0048, 18, 12))
      }
    };

    const stars = (() => {
      const list = [], cols = [], sizes = [];
      const rnd = A3.mulberry(20261021);
      for (let i = 0; i < 900; i++) {
        const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = 26 + rnd() * 16;
        const s = Math.sqrt(1 - u * u);
        list.push([Math.cos(th) * s * r, Math.sin(th) * s * r, u * r]);
        const w = 0.55 + rnd() * 0.45;
        cols.push([w * 0.9, w * 0.94, w]);
        sizes.push(1.2 + rnd() * 1.8);
      }
      const m = renderer.makeMesh(pointsMesh(list, cols, sizes));
      m.sizes = sizes;
      return m;
    })();

    /* 平面网格线 */
    const gridSegs = [], gridCols = [];
    for (let g = -1.2; g <= 1.21; g += 0.4) {
      gridSegs.push([g, -0.9, 0], [g, 0.9, 0]);
      gridCols.push([0.42, 0.46, 0.52]);
    }
    for (let g = -0.9; g <= 0.91; g += 0.4) {
      gridSegs.push([-1.2, g, 0], [1.2, g, 0]);
      gridCols.push([0.42, 0.46, 0.52]);
    }
    const grid = renderer.makeMesh(lineMesh(gridSegs, gridCols));

    let surface = null, surfaceWire = null, surfaceKey = '', gateLine = null, triLines = null, markers = null;
    let trailFull = null, trailHead = null, trailPts = null;

    const state = {
      model: null, headIndex: 0, showSurface: true, showTrail: true, showGrid: true,
      stationTilt: 0, spin: 0, showMarkers: true
    };

    function rebuildStatic(model) {
      const { mu, L } = model;
      const C = model.C0;
      /* 旧网格先释放，避免拖滑块时 GPU 缓冲越积越多 */
      if (triLines) renderer.deleteMesh(triLines);
      if (gateLine) renderer.deleteMesh(gateLine);
      if (markers) renderer.deleteMesh(markers);
      if (trailFull) { renderer.deleteMesh(trailFull); renderer.deleteMesh(trailHead); renderer.deleteMesh(trailPts); }
      /* 三角点连线（等边三角形：地—L4—月、地—L5—月，虚线） */
      const segs = [], cols = [];
      const dash = (a, b, c) => {
        const n = 26;
        for (let i = 0; i < n; i += 2) {
          const t0 = i / n, t1 = (i + 1) / n;
          segs.push([a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, 0]);
          segs.push([a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, 0]);
          cols.push(c);
        }
      };
      const E = [-mu, 0], M = [1 - mu, 0];
      dash(E, [L.L4.x, L.L4.y], [0.85, 0.68, 0.38]);
      dash([L.L4.x, L.L4.y], M, [0.85, 0.68, 0.38]);
      dash(E, [L.L5.x, L.L5.y], [0.85, 0.68, 0.38]);
      dash([L.L5.x, L.L5.y], M, [0.85, 0.68, 0.38]);
      /* 地—月轴线 */
      segs.push([E[0], 0, 0], [M[0], 0, 0]);
      cols.push([0.75, 0.78, 0.82]);
      triLines = renderer.makeMesh(lineMesh(segs, cols));

      /* L1 门洞：在门心画一条竖直标尺，长度 = 2·zvs(L1) */
      const h = A3.gateHeight(L.L1.x, mu, A3.jacobi3(model.s0, mu));
      state.gate = h;
      gateLine = renderer.makeMesh(lineMesh([
        [L.L1.x, 0, -h / 2], [L.L1.x, 0, h / 2],
        [L.L1.x - 0.03, 0, h / 2], [L.L1.x + 0.03, 0, h / 2],
        [L.L1.x - 0.03, 0, -h / 2], [L.L1.x + 0.03, 0, -h / 2]
      ], [[0.85, 0.68, 0.38], [0.85, 0.68, 0.38], [0.85, 0.68, 0.38],
        [0.85, 0.68, 0.38], [0.85, 0.68, 0.38], [0.85, 0.68, 0.38]]));

      /* 零速度面（缓存键：μ + C，换参数才重算） */
      const key = mu.toFixed(8) + '|' + C.toFixed(8);
      if (key !== surfaceKey) {
        if (surface) renderer.deleteMesh(surface);
        if (surfaceWire) renderer.deleteMesh(surfaceWire);
        const built = buildSurface(mu, C, P);
        surfaceWire = renderer.makeMesh({ pos: built.wire.pos, col: built.wire.col, prim: 1, mode: 1 });
        surface = renderer.makeMesh(built);
        surfaceKey = key;
      }

      /* 平动点 + 站点的点精灵（位置随 μ 变，随 μ 重建一次即可） */
      const pts = [], pcol = [], psz = [];
      ['L1', 'L2', 'L3', 'L4', 'L5'].forEach((k) => {
        const p = L[k];
        pts.push(p.x, p.y, 0);
        const tri = k === 'L4' || k === 'L5';
        pcol.push(tri ? [0.95, 0.76, 0.42] : [0.85, 0.87, 0.90]);
        psz.push(tri ? 13 : 8);
      });
      pts.push(L.L5.x, L.L5.y, 0);
      pcol.push([0.95, 0.95, 0.95]);
      psz.push(16);
      markers = renderer.makeMesh(pointsMesh(pts, pcol, psz));
      markers.count = pts.length / 3;

      /* 轨迹网格（点数由 buildModel 决定，先占位） */
      const traj = model.run.traj;
      const posFull = [], colFull = [];
      for (let i = 0; i < traj.length; i++) {
        posFull.push(traj[i][0], traj[i][1], traj[i][2]);
        const t = i / Math.max(1, traj.length - 1);
        colFull.push(0.40 + 0.10 * t, 0.38 + 0.10 * t, 0.36 + 0.10 * t);
      }
      trailFull = renderer.makeMesh({ pos: posFull, col: colFull, prim: 3, mode: 1 });  /* LINE_STRIP */
      trailHead = renderer.makeMesh({ pos: posFull, col: colFull, prim: 3, mode: 1 });
      trailPts = renderer.makeMesh({ pos: posFull, col: colFull, prim: 0, mode: 2 });
    }

    function setModel(model) {
      state.model = model;
      rebuildStatic(model);
      state.headIndex = model.run.traj.length - 1;
    }

    /* 回放：只重建「头部」那一段（点数几百，代价可忽略） */
    function setHead(k) {
      if (!state.model) return;
      const traj = state.model.run.traj;
      const n = Math.max(2, Math.min(traj.length, k));
      const pos = [], col = [], pts = [], pcol = [];
      for (let i = 0; i < n; i++) {
        const p = traj[i];
        const t = i / Math.max(1, n - 1);
        pos.push(p[0], p[1], p[2]);
        col.push(0.62 + 0.33 * t, 0.72 + 0.12 * t, 0.55 - 0.10 * t);
      }
      const step = Math.max(1, Math.round(n / 90));
      for (let i = 0; i < n; i += step) {
        const p = traj[i];
        pts.push(p[0], p[1], p[2]);
        pcol.push(0.72, 0.82, 0.62);
      }
      renderer.updatePoints(trailHead, pos, col);
      renderer.updatePoints(trailPts, pts, pcol);
      trailHead.count = n;
      trailPts.count = pts.length / 3;
      state.headIndex = n;
    }

    function draw(opts) {
      const m = state.model;
      if (!m) return;
      const { mu, L, C } = m;
      const E = [-mu, 0, 0], Mo = [1 - mu, 0, 0];
      const W = opts.world || M4.ident();
      renderer.setWorld(W);

      /* 星空（最底层，加色混合，不写深度） */
      renderer.draw(stars, { mode: 2, color: [0.9, 0.93, 1], alpha: 0.9, pointSize: 3.0,
        additive: true, depthWrite: false, useVertexColor: true });

      if (state.showGrid) {
        renderer.draw(grid, { mode: 1, color: [0.42, 0.46, 0.52], alpha: 0.10 });
      }

      /* 零速度面：半透明穹顶（画在实体之前，让天体压住它） */
      if (state.showSurface && surface) {
        renderer.draw(surface, { mode: 0, alpha: 0.11, useVertexColor: true, cull: false,
          depthWrite: false, additive: true });
        if (surfaceWire) {
          renderer.draw(surfaceWire, { mode: 1, alpha: 0.30, useVertexColor: true, depthWrite: false });
        }
      }

      /* 地球 / 月球 */
      const spin = opts.spin || 0;
      renderer.draw(geo.sphere, {
        model: M4.trs(E, spin, EARTH_R), mode: 0, color: [0.10, 0.22, 0.34],
        color2: [0.32, 0.42, 0.30], planet: 1, rim: 0.55, alpha: 1
      });
      renderer.draw(geo.sphere, {
        model: M4.trs(E, spin, EARTH_R * 1.10), mode: 0, color: [0.30, 0.55, 0.85],
        alpha: 0.12, additive: true, cullFront: true, depthWrite: false
      });
      renderer.draw(geo.sphere, {
        model: M4.trs(Mo, -spin * 0.4, MOON_R), mode: 0, color: [0.32, 0.31, 0.30],
        color2: [0.62, 0.61, 0.58], planet: 2, rim: 0.25, alpha: 1
      });

      /* 三角点连线 + 地月轴 + 门洞标尺 */
      renderer.draw(triLines, { mode: 1, alpha: 0.42, useVertexColor: true });
      renderer.draw(gateLine, { mode: 1, alpha: 0.45, useVertexColor: true });

      /* 五个平动点 + 站点信标 */
      if (markers) {
        renderer.draw(markers, { mode: 2, alpha: 1, additive: true, depthWrite: false,
          useVertexColor: true, pointSize: 9 });
      }

      /* 轨迹：整条淡 + 已播放段亮 */
      if (state.showTrail) {
        renderer.draw(trailFull, { mode: 1, alpha: 0.16, useVertexColor: true });
        renderer.draw(trailHead, { mode: 1, alpha: 0.95, useVertexColor: true });
        renderer.draw(trailPts, { mode: 2, alpha: 0.75, pointSize: 5, useVertexColor: true,
          additive: true, depthWrite: false });
      }

      /* 站体：桁架 + 环 + 两块太阳翼 + 散热板 + 天线（全部由圆柱/盒子/圆环拼出） */
      const S = geo.station;
      const base = M4.mul(M4.translate(L.L5.x, L.L5.y, 0), M4.rotX(Math.PI / 2));
      const part = (mesh, t, color, extra) => {
        const mm = M4.mul(base, M4.translate(t[0], t[1], t[2]));
        renderer.draw(mesh, Object.assign({ model: mm, mode: 0, color, alpha: 1 }, extra || {}));
      };
      part(S.trunk, [0, 0, 0], [0.72, 0.74, 0.78]);
      part(S.truss, [0, 0.024, 0], [0.55, 0.58, 0.62]);
      part(S.ring, [0, 0.010, 0], [0.60, 0.63, 0.68]);
      part(S.panel, [0.034, 0.002, 0], [0.18, 0.30, 0.50]);
      part(S.panel, [-0.034, 0.002, 0], [0.18, 0.30, 0.50]);
      part(S.rad, [0, 0.002, 0.026], [0.55, 0.58, 0.62]);
      part(S.rad, [0, 0.002, -0.026], [0.55, 0.58, 0.62]);
      part(S.beacon, [0, 0.032, 0], [0.95, 0.78, 0.45], { rim: 0.6 });

      /* 飞船（当前轨迹头部） */
      const traj = m.run.traj;
      const cur = traj[Math.min(state.headIndex, traj.length) - 1] || traj[0];
      if (cur) {
        renderer.draw(geo.sphere, {
          model: M4.trs([cur[0], cur[1], cur[2]], 0, 0.0055), mode: 0,
          color: [0.95, 0.80, 0.50], rim: 0.8, alpha: 1
        });
      }
    }

    function anchors() {
      const m = state.model;
      if (!m) return [];
      const { mu, L } = m;
      const list = [
        { id: 'earth', pos: [-mu, 0, 0], cls: 'body' },
        { id: 'moon', pos: [1 - mu, 0, 0], cls: 'body' },
        { id: 'station', pos: [L.L5.x, L.L5.y, 0], cls: 'station' }
      ];
      ['L1', 'L2', 'L3', 'L4', 'L5'].forEach((k) => {
        list.push({ id: k, pos: [L[k].x, L[k].y, 0], cls: k === 'L4' || k === 'L5' ? 'tri' : 'col' });
      });
      if (state.showSurface && surface) {
        list.push({ id: 'zvs', pos: [-0.42, 0.52, 0.30], cls: 'note' });
      }
      list.push({ id: 'gate', pos: [L.L1.x, 0, (state.gate || 0) / 2 + 0.03], cls: 'note' });
      return list;
    }

    return {
      state, geo, setModel, setHead, draw, anchors,
      get clip() { return Z_CLIP; },
      setSurface(on) { state.showSurface = on; },
      setTrail(on) { state.showTrail = on; },
      setGrid(on) { state.showGrid = on; }
    };
  }

  root.SCENE3D = { create, EARTH_R, MOON_R, Z_CLIP };
})(typeof globalThis !== 'undefined' ? globalThis : this);
