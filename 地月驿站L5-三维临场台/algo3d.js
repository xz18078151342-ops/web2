/* ============================================================
   algo3d.js —— 《地月驿站 L5 · 三维临场台》三维可复算内核
   （纯函数，浏览器 / Node 双用；不依赖 DOM、不依赖渲染层）

   与 algo.js（二维版内核）的关系：
     · 坐标系、单位、质量比、五个平动点的定义完全一致；
     · 本文件把状态从 [x,y,vx,vy] 扩到 [x,y,z,vx,vy,vz]，
       保留全部 z=0 退化行为（test/t01-3d.test.cjs 逐步核对，
       二维轨迹与三维轨迹在 z0=0 时必须逐点相同）。
     · z 方向方程 z'' = ∂Ω/∂z = −(1−μ)z/r1³ − μz/r2³：
       在 L4/L5 处 r1 = r2 = 1（等边三角形），于是 z'' = −z，
       即三维下三角点的「垂直模」永远是频率 1 的简谐振荡
       （周期 = 2π 时间单位 = 一个恒星月），与 μ 无关。
       这一条是本作品三维版相对二维版新增的可验证物理结论。
   ============================================================ */
(function (root) {
  'use strict';

  /* 二维内核：浏览器里由 <script src="algo.js"> 提供 window.CR3BP；
     Node 里 require('../algo.js')。仅用于复用常量与退化对照。 */
  const D2 = (typeof module !== 'undefined' && module.exports)
    ? require('./algo.js')
    : root.CR3BP;

  if (!D2) throw new Error('algo3d.js: 需要先加载 algo.js（二维内核）');

  const MU_EARTH_MOON = D2.MU_EARTH_MOON;
  const MU_SUN_EARTH = D2.MU_SUN_EARTH;
  const P_MOON_DAYS = D2.P_MOON_DAYS;
  const P_SUNEARTH_DAYS = D2.P_SUNEARTH_DAYS;

  /* ================= 1. 三维有效势与运动方程 ================= */
  /* 旋转系（原点在质心，x 轴由大天体指向小天体，z 轴为轨道面法向）：
       Ω = ½(x²+y²) + (1−μ)/r1 + μ/r2
       r1 = √((x+μ)² + y² + z²)，r2 = √((x−1+μ)² + y² + z²)
     x'' − 2y' = ∂Ω/∂x，y'' + 2x' = ∂Ω/∂y，z'' = ∂Ω/∂z。 */
  function omega3(x, y, z, mu) {
    const r1 = Math.sqrt((x + mu) * (x + mu) + y * y + z * z);
    const r2 = Math.sqrt((x - 1 + mu) * (x - 1 + mu) + y * y + z * z);
    return 0.5 * (x * x + y * y) + (1 - mu) / r1 + mu / r2;
  }

  /* 状态 s = [x, y, z, vx, vy, vz] 的时间导数 */
  function rhs3(s, mu) {
    const x = s[0], y = s[1], z = s[2];
    const vx = s[3], vy = s[4], vz = s[5];
    const r1s = (x + mu) * (x + mu) + y * y + z * z;
    const r2s = (x - 1 + mu) * (x - 1 + mu) + y * y + z * z;
    const r1c = Math.sqrt(r1s) * r1s, r2c = Math.sqrt(r2s) * r2s;
    const ax = 2 * vy + x - (1 - mu) * (x + mu) / r1c - mu * (x - 1 + mu) / r2c;
    const ay = -2 * vx + y - (1 - mu) * y / r1c - mu * y / r2c;
    const az = -(1 - mu) * z / r1c - mu * z / r2c;
    return [vx, vy, vz, ax, ay, az];
  }

  /* 三维平衡残差 |∇Ω|（平动点上必须为 0） */
  function residual3(x, y, z, mu) {
    const r1s = (x + mu) * (x + mu) + y * y + z * z;
    const r2s = (x - 1 + mu) * (x - 1 + mu) + y * y + z * z;
    const r1c = Math.sqrt(r1s) * r1s, r2c = Math.sqrt(r2s) * r2s;
    const gx = x - (1 - mu) * (x + mu) / r1c - mu * (x - 1 + mu) / r2c;
    const gy = y - (1 - mu) * y / r1c - mu * y / r2c;
    const gz = -(1 - mu) * z / r1c - mu * z / r2c;
    return Math.sqrt(gx * gx + gy * gy + gz * gz);
  }

  /* 雅可比常数 C = 2Ω − v²：三维下仍是唯一运动积分 */
  function jacobi3(s, mu) {
    const v2 = s[3] * s[3] + s[4] * s[4] + s[5] * s[5];
    return 2 * omega3(s[0], s[1], s[2], mu) - v2;
  }

  /* 零速度面判据：v² = 2Ω − C ≥ 0 的空间才允许通过 */
  function allowed3(x, y, z, mu, C) {
    return 2 * omega3(x, y, z, mu) - C;
  }

  /* ================= 2. 三维零速度面：给定 (x,y) 解 |z| =================
     固定 (x,y)，令 s = z² ≥ 0：
       g(s) = ½(x²+y²) + (1−μ)/√(a1+s) + μ/√(a2+s) − C/2
     其中 a1 = (x+μ)²+y²，a2 = (x−1+μ)²+y²。g 关于 s 严格单调递减，
     所以每个 (x,y) 至多有一个正根 —— 零速度面是一张「单向」的蒙皮：
       · g(0) < 0            → 该处连轨道面都不可达（没有曲面）
       · g(∞) = ½r² − C/2 ≥ 0 → 曲面开口到无穷远（没有封闭的上盖）
       · 否则有根 s* > 0      → 上/下两张对称蒙皮，|z| = √s*
     返回 {z, kind}，kind ∈ {'sheet','open','closed'}。 */
  function zvsZ(x, y, mu, C, opt) {
    const o = opt || {};
    const a1 = (x + mu) * (x + mu) + y * y;
    const a2 = (x - 1 + mu) * (x - 1 + mu) + y * y;
    const r2 = x * x + y * y;
    const half = 0.5 * C;
    const g = (s) => 0.5 * r2 + (1 - mu) / Math.sqrt(a1 + s) + mu / Math.sqrt(a2 + s) - half;

    const g0 = g(0);
    if (!(g0 >= 0)) return { z: null, kind: 'closed', g0 };      /* 轨道面本身不可达 */
    const gInf = 0.5 * r2 - half;
    if (gInf >= 0) return { z: null, kind: 'open', g0 };          /* 上方没有封闭蒙皮 */

    /* 二分求根：g 单调递减，区间 [0, hi] 端点变号 */
    let lo = 0, hi = 1e-3;
    let guard = 0;
    while (g(hi) > 0 && guard++ < 80) hi *= 2;
    const iters = o.iters || 90;
    for (let i = 0; i < iters; i++) {
      const m = 0.5 * (lo + hi);
      if (g(m) > 0) lo = m; else hi = m;
      if (hi - lo < 1e-13) break;
    }
    return { z: Math.sqrt(0.5 * (lo + hi)), kind: 'sheet', g0 };
  }

  /* 便捷包装：只要高度（没有曲面时返回 null） */
  function zvsHeight(x, y, mu, C) {
    const r = zvsZ(x, y, mu, C);
    return r.z;
  }

  /* L1/L2 门洞的垂直净高：在门心 (x0,0) 处、给定 C 下，上下蒙皮之间的通道高度。
     C 越接近临界值 C_L1，门高越小；C 超过 C_L1 时门关闭（返回 0）。
     这是三维版新增的、可在界面直接读到的量：站体要过门，尺寸不能超过它。 */
  function gateHeight(x0, mu, C) {
    const r = zvsZ(x0, 0, mu, C);
    if (r.z == null) return 0;
    return 2 * r.z;
  }

  /* ================= 3. 数值传播（三维 RK4） ================= */
  function rk4(s, mu, dt) {
    const k1 = rhs3(s, mu);
    const s2 = [s[0] + 0.5 * dt * k1[0], s[1] + 0.5 * dt * k1[1], s[2] + 0.5 * dt * k1[2],
      s[3] + 0.5 * dt * k1[3], s[4] + 0.5 * dt * k1[4], s[5] + 0.5 * dt * k1[5]];
    const k2 = rhs3(s2, mu);
    const s3 = [s[0] + 0.5 * dt * k2[0], s[1] + 0.5 * dt * k2[1], s[2] + 0.5 * dt * k2[2],
      s[3] + 0.5 * dt * k2[3], s[4] + 0.5 * dt * k2[4], s[5] + 0.5 * dt * k2[5]];
    const k3 = rhs3(s3, mu);
    const s4 = [s[0] + dt * k3[0], s[1] + dt * k3[1], s[2] + dt * k3[2],
      s[3] + dt * k3[3], s[4] + dt * k3[4], s[5] + dt * k3[5]];
    const k4 = rhs3(s4, mu);
    return [
      s[0] + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      s[1] + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      s[2] + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
      s[3] + dt / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]),
      s[4] + dt / 6 * (k1[4] + 2 * k2[4] + 2 * k3[4] + k4[4]),
      s[5] + dt / 6 * (k1[5] + 2 * k2[5] + 2 * k3[5] + k4[5])
    ];
  }

  /* 传播一条三维轨道；返回采样点（含 t）、雅可比常数漂移与终止原因。
     终止原因与二维版一致：earth / moon / escape / nonfinite / steps。 */
  function propagate3(s0, mu, opt) {
    const o = Object.assign({ dt: 0.002, steps: 3000, sample: 5 }, opt || {});
    const C0 = jacobi3(s0, mu);
    let s = s0.slice();
    const traj = [[s[0], s[1], s[2], s[3], s[4], s[5], 0]];
    let t = 0, stop = 'steps';
    for (let i = 1; i <= o.steps; i++) {
      s = rk4(s, mu, o.dt);
      t += o.dt;
      if (!s.every(Number.isFinite)) { stop = 'nonfinite'; break; }
      const x = s[0], y = s[1], z = s[2];
      const r1 = Math.sqrt((x + mu) * (x + mu) + y * y + z * z);
      const r2 = Math.sqrt((x - 1 + mu) * (x - 1 + mu) + y * y + z * z);
      if (r1 < 0.02) { stop = 'earth'; break; }
      if (r2 < 0.02) { stop = 'moon'; break; }
      if (Math.sqrt(x * x + y * y + z * z) > 3.2) { stop = 'escape'; break; }
      if (i % o.sample === 0) traj.push([x, y, z, s[3], s[4], s[5], t]);
    }
    if (stop !== 'steps' && traj.length && traj[traj.length - 1][6] !== t) {
      traj.push([s[0], s[1], s[2], s[3], s[4], s[5], t]);
    }
    const C1 = jacobi3(s, mu);
    let driftMax = 0;
    for (let i = 0; i < traj.length; i++) {
      const d = Math.abs(jacobi3(traj[i], mu) - C0);
      if (d > driftMax) driftMax = d;
    }
    return {
      traj, C0, C1, drift: driftMax, driftEnd: Math.abs(C1 - C0), t, stop, mu,
      finalState: s, dt: o.dt, steps: o.steps
    };
  }

  /* ================= 4. 三维捕获判定 =================
     与二维版同一条判据（本作品设定，非文献判据），只把距离换成三维距离：
       ① 全程未撞击主天体（r < 0.02）、未飞出 3.2 D；
       ② 至少 dwell 比例的采样点落在目标平动点三维半径 r 内；
     额外回报两个三维观测量（不参与判定）：
       zAmp    —— 全程最大 |z|，站体在垂直方向的实际振幅；
       winding —— 绕目标点（xy 投影）的角向绕数。 */
  function captureCheck3(traj, mu, opt, Lcache) {
    const o = Object.assign({ target: null, r: 0.15, dwell: 0.8 }, opt || {});
    const L = Lcache || D2.lagrange(mu);
    let target = o.target;
    if (!target) {
      const last = traj[traj.length - 1] || [0, 0, 0];
      const d4 = Math.hypot(last[0] - L.L4.x, last[1] - L.L4.y);
      const d5 = Math.hypot(last[0] - L.L5.x, last[1] - L.L5.y);
      target = d4 <= d5 ? 'L4' : 'L5';
    }
    const P = L[target];
    if (!P) throw new Error('captureCheck3: target 必须是 L1–L5');
    let minDist = Infinity, inside = 0, hitPrimary = false, escaped = false, zAmp = 0;
    let prevAng = null, turn = 0;
    for (const p of traj) {
      const dx = p[0] - P.x, dy = p[1] - P.y, dz = p[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < minDist) minDist = d;
      if (d <= o.r) inside++;
      if (Math.abs(dz) > zAmp) zAmp = Math.abs(dz);
      const ang = Math.atan2(dy, dx);
      if (prevAng !== null) {
        let da = ang - prevAng;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        turn += da;
      }
      prevAng = ang;
      const r1 = Math.sqrt((p[0] + mu) * (p[0] + mu) + p[1] * p[1] + p[2] * p[2]);
      const r2 = Math.sqrt((p[0] - 1 + mu) * (p[0] - 1 + mu) + p[1] * p[1] + p[2] * p[2]);
      if (r1 < 0.02 || r2 < 0.02) hitPrimary = true;
      if (Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]) > 3.2) escaped = true;
    }
    const dwellFrac = traj.length ? inside / traj.length : 0;
    const winding = Math.abs(turn) / (2 * Math.PI);
    const captured = !hitPrimary && !escaped && dwellFrac >= o.dwell;
    return {
      target, minDist, dwellFrac, hitPrimary, escaped, captured, winding, zAmp,
      r: o.r, dwell: o.dwell
    };
  }

  /* ================= 5. 垂直模与实测周期 =================
     理论：在 L4/L5 处线性化得 z'' = −z（r1=r2=1），频率 ω_z = 1 TU⁻¹。
     实测：对轨迹的 z(t) 去均值后数「向上过零」次数，周期 = 首末间隔 / (次数−1)。
     返回天数（乘 tu2day）。次数不足时返回 null —— 不猜。 */
  function verticalPeriod(traj, tu2day) {
    if (!traj || traj.length < 8) return null;
    let sum = 0;
    for (const p of traj) sum += p[2];
    const mean = sum / traj.length;
    let first = null, last = null, n = 0;
    for (let i = 1; i < traj.length; i++) {
      const a = traj[i - 1][2] - mean, b = traj[i][2] - mean;
      if (a <= 0 && b > 0) {
        /* 线性插值过零点的时间 */
        const f = (0 - a) / (b - a);
        const t = traj[i - 1][6] + f * (traj[i][6] - traj[i - 1][6]);
        if (first == null) first = t; else { n++; last = t; }
      }
    }
    if (first == null || last == null || n < 1) return null;
    const periodTU = (last - first) / n;
    return { periodTU, periodDays: periodTU * tu2day, crossings: n + 1 };
  }

  /* ================= 6. 稳定性（三维） =================
     面内：与二维版同一 Routh 判据（λ⁴ + λ² + 27μ(1−μ)/4 = 0）。
     面外：z'' = −z 恒为频率 1 的简谐（在三角点）。
     所以三维版的结论比二维版更强：L4/L5 在轨道面外的方向永远稳定，
     面内是否稳定仍由 μ ≤ μ_R 决定。 */
  function stability3(mu, periodDays) {
    const Pd = (periodDays == null ? P_MOON_DAYS : periodDays);
    const inPlane = D2.stability(mu, Pd);
    const tu2day = Pd / (2 * Math.PI);
    return {
      mu, inPlane,
      stable: inPlane.stable,
      verticalFreq: 1,
      verticalPeriodTU: 2 * Math.PI,
      verticalPeriodDays: 2 * Math.PI * tu2day,
      tu2day, periodDays: Pd
    };
  }

  /* ================= 7. 三维五点表 ================= */
  function lagrangeTable3(mu, periodDays) {
    const t = D2.lagrangeTable(mu, periodDays);
    t.rows.forEach((r) => { r.z = 0; r.residual3 = residual3(r.x, r.y, 0, mu); });
    return t;
  }

  const API = {
    MU_EARTH_MOON, MU_SUN_EARTH, P_MOON_DAYS, P_SUNEARTH_DAYS,
    omega3, rhs3, residual3, jacobi3, allowed3,
    zvsZ, zvsHeight, gateHeight,
    rk4, propagate3, captureCheck3, verticalPeriod, stability3, lagrangeTable3,
    /* 透传二维内核里与 z 无关的定义，方便调用方只依赖一份 API */
    lagrange: D2.lagrange, criticalC: D2.criticalC, muRouth: D2.muRouth,
    massRatio: D2.massRatio, mulberry: D2.mulberry
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.CR3BP3 = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
