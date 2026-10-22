/* ============================================================
   algo.js —— 《地月驿站 L5》可复算内核（纯函数，浏览器 / Node 双用）
   对象：圆型限制性三体问题（CR3BP）下地月系统的五个平动点、
        雅可比常数、零速度面、稳定性判据与低能转移的捕获判定。
   —— 不依赖 DOM；node test/t01.test.cjs 直接 require 本文件的导出。
   —— 单位：长度以两主天体间距 D=1 归一，时间以平均运动 n=1 归一
        （即两主天体公转周期 = 2π 时间单位）。
   ============================================================ */
(function (root) {
  'use strict';

  const SQ3 = Math.sqrt(3);

  /* ---------- 本地确定性随机（供示例轨道用，独立于引擎） ---------- */
  function mulberry(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ================= 1. 质量参数 ================= */
  /* μ = m2 / (m1 + m2)：两主天体的质量比，决定整个系统的几何 */
  function massRatio(m1, m2) {
    if (!(m1 > 0) || !(m2 > 0)) throw new Error('massRatio: 两个质量都必须为正数');
    return m2 / (m1 + m2);
  }

  /* 地月质量比（质量取 NASA Moon Fact Sheet 的数值，见 content.js 来源） */
  const M_EARTH = 5.97237e24;   // kg
  const M_MOON = 7.342e22;      // kg
  const MU_EARTH_MOON = massRatio(M_EARTH, M_MOON);
  /* 月球公转恒星周期（天）。它只是"地月系统"的默认换算基准；
     换到别的系统（如日地 365.256 天）必须由调用方把 periodDays 传给 stability()，
     否则会把 27.32 天当成 1 时间单位，长周期会错一个主天体公转周期比。 */
  const P_MOON_DAYS = 27.321661;
  const P_SUNEARTH_DAYS = 365.256;
  /* 日地质量比（太阳 1.9885e30 kg、地球 5.97237e24 kg），供预设交叉核对 */
  const MU_SUN_EARTH = M_EARTH / (1.9885e30 + M_EARTH);

  /* ================= 2. 有效势与运动方程 ================= */
  /* 旋转坐标系（原点在质心，x 轴由大天体指向小天体）下的有效势 Ω */
  function omega(x, y, mu) {
    const r1 = Math.hypot(x + mu, y);
    const r2 = Math.hypot(x - 1 + mu, y);
    return 0.5 * (x * x + y * y) + (1 - mu) / r1 + mu / r2;
  }

  /* 状态 s = [x, y, vx, vy] 的时间导数（含科氏力项） */
  function rhs(s, mu) {
    const x = s[0], y = s[1], vx = s[2], vy = s[3];
    const r1 = Math.hypot(x + mu, y), r2 = Math.hypot(x - 1 + mu, y);
    const r1c = r1 * r1 * r1, r2c = r2 * r2 * r2;
    const ax = 2 * vy + x - (1 - mu) * (x + mu) / r1c - mu * (x - 1 + mu) / r2c;
    const ay = -2 * vx + y - (1 - mu) * y / r1c - mu * y / r2c;
    return [vx, vy, ax, ay];
  }

  /* 平衡残差 |∇Ω|：平动点上必须为 0，用于检验求根是否真的求对了 */
  function residual(x, y, mu) {
    const r1 = Math.hypot(x + mu, y), r2 = Math.hypot(x - 1 + mu, y);
    const r1c = r1 * r1 * r1, r2c = r2 * r2 * r2;
    const gx = x - (1 - mu) * (x + mu) / r1c - mu * (x - 1 + mu) / r2c;
    const gy = y - (1 - mu) * y / r1c - mu * y / r2c;
    return Math.hypot(gx, gy);
  }

  /* ================= 3. 五个平动点 ================= */
  function bisect(f, a, b, iters) {
    let fa = f(a), fb = f(b);
    if (!(fa <= 0 && fb >= 0) && !(fa >= 0 && fb <= 0)) {
      throw new Error('bisect: 区间端点未变号 a=' + a + ' b=' + b);
    }
    for (let i = 0; i < (iters || 200); i++) {
      const m = 0.5 * (a + b);
      const fm = f(m);
      if (fm === 0) return m;
      if ((fa <= 0 && fm <= 0) || (fa >= 0 && fm >= 0)) { a = m; fa = fm; } else { b = m; fb = fm; }
      if (Math.abs(b - a) < 1e-14) break;
    }
    return 0.5 * (a + b);
  }

  /* 共线点的平衡方程 f(x)=0（x 方向上 ∇Ω 的 x 分量） */
  function collinearF(x, mu) {
    const d1 = Math.abs(x + mu), d2 = Math.abs(x - 1 + mu);
    return x - (1 - mu) * (x + mu) / (d1 * d1 * d1) - mu * (x - 1 + mu) / (d2 * d2 * d2);
  }

  /* 返回 L1–L5 的坐标（旋转系，质心为原点，天文单位化为 D=1） */
  function lagrange(mu) {
    /* μ=0.5（等质量极限）是合法的对称情形，仍可定义五点；μ≥0.5 以外无意义 */
    if (!(mu > 0 && mu <= 0.5)) throw new Error('lagrange: 需要 0 < μ ≤ 0.5');
    const eps = 1e-9;
    /* L1：位于两主天体之间 */
    const L1x = bisect((x) => collinearF(x, mu), -mu + eps, 1 - mu - eps, 300);
    /* L2：位于小天体外侧 */
    let hi = 1 - mu + 1.5;
    for (let i = 0; i < 80 && collinearF(hi, mu) < 0; i++) hi = 1 - mu + (hi - (1 - mu)) * 1.7;
    const L2x = bisect((x) => collinearF(x, mu), 1 - mu + eps, hi, 300);
    /* L3：位于大天体外侧 */
    let lo = -mu - 2;
    for (let i = 0; i < 80 && collinearF(lo, mu) > 0; i++) lo = -mu - (-mu - lo) * 1.7;
    const L3x = bisect((x) => collinearF(x, mu), lo, -mu - eps, 300);
    return {
      L1: { x: L1x, y: 0 },
      L2: { x: L2x, y: 0 },
      L3: { x: L3x, y: 0 },
      L4: { x: 0.5 - mu, y: SQ3 / 2 },
      L5: { x: 0.5 - mu, y: -SQ3 / 2 },
      mu
    };
  }

  /* ================= 4. 雅可比常数与零速度面 ================= */
  /* C = 2Ω − v²：CR3BP 的唯一运动积分，沿轨道必须守恒 */
  function jacobi(s, mu) {
    const v2 = s[2] * s[2] + s[3] * s[3];
    return 2 * omega(s[0], s[1], mu) - v2;
  }

  /* 零速度面判据：v² = 2Ω − C ≥ 0 的区域才允许通过 */
  function allowed(x, y, mu, C) {
    return 2 * omega(x, y, mu) - C;
  }

  /* 各平动点对应的临界雅可比常数（静止于该点时的 C） */
  function criticalC(mu) {
    const L = lagrange(mu);
    return {
      L1: 2 * omega(L.L1.x, 0, mu),
      L2: 2 * omega(L.L2.x, 0, mu),
      L3: 2 * omega(L.L3.x, 0, mu),
      L4: 3 - mu + mu * mu,
      L5: 3 - mu + mu * mu
    };
  }

  /* ================= 5. 数值传播（RK4） ================= */
  function rk4(s, mu, dt) {
    const k1 = rhs(s, mu);
    const s2 = [s[0] + 0.5 * dt * k1[0], s[1] + 0.5 * dt * k1[1], s[2] + 0.5 * dt * k1[2], s[3] + 0.5 * dt * k1[3]];
    const k2 = rhs(s2, mu);
    const s3 = [s[0] + 0.5 * dt * k2[0], s[1] + 0.5 * dt * k2[1], s[2] + 0.5 * dt * k2[2], s[3] + 0.5 * dt * k2[3]];
    const k3 = rhs(s3, mu);
    const s4 = [s[0] + dt * k3[0], s[1] + dt * k3[1], s[2] + dt * k3[2], s[3] + dt * k3[3]];
    const k4 = rhs(s4, mu);
    return [
      s[0] + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      s[1] + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      s[2] + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
      s[3] + dt / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3])
    ];
  }

  /* 传播一条轨道；返回采样点、雅可比常数漂移与终止原因 */
  function propagate(s0, mu, opt) {
    const o = Object.assign({ dt: 0.002, steps: 3000, sample: 5 }, opt || {});
    const C0 = jacobi(s0, mu);
    let s = s0.slice();
    const traj = [[s[0], s[1], s[2], s[3], 0]];
    let t = 0, stop = 'steps';
    for (let i = 1; i <= o.steps; i++) {
      s = rk4(s, mu, o.dt);
      t += o.dt;
      if (!s.every(Number.isFinite)) { stop = 'nonfinite'; break; }
      const r1 = Math.hypot(s[0] + mu, s[1]);
      const r2 = Math.hypot(s[0] - 1 + mu, s[1]);
      if (r1 < 0.02) { stop = 'earth'; break; }
      if (r2 < 0.02) { stop = 'moon'; break; }
      if (Math.hypot(s[0], s[1]) > 3.2) { stop = 'escape'; break; }
      if (i % o.sample === 0) traj.push([s[0], s[1], s[2], s[3], t]);
    }
    /* 终止步也要入样：否则"逃逸/撞星"的那一点不会被判定看到 */
    if (stop !== 'steps' && traj.length && traj[traj.length - 1][4] !== t) {
      traj.push([s[0], s[1], s[2], s[3], t]);
    }
    const C1 = jacobi(s, mu);
    /* 漂移指标取"采样点上的最大 |C(t) − C0|"，而不是只看末点：
       只取末点会漏掉"中途漂走又漂回来"的情况（本作品默认步长下二者同为 1e-15 量级，
       但粗步长下最大漂移可比末点漂移高一个量级，见 test G1）。 */
    let driftMax = 0;
    for (let i = 0; i < traj.length; i++) {
      const d = Math.abs(jacobi(traj[i], mu) - C0);
      if (d > driftMax) driftMax = d;
    }
    return {
      traj, C0, C1, drift: driftMax, driftEnd: Math.abs(C1 - C0), t, stop, mu,
      finalState: s, dt: o.dt, steps: o.steps
    };
  }

  /* ================= 6. 捕获判定 ================= */
  /* 判据（本作品设定，非文献判据）——恰好三条，与界面文案/文档一致：
     ① 全程未撞击主天体（r < 0.02 终止）、未逃出 3.2 D 范围；
     ② 至少 dwell（界面默认 90%）的采样点落在目标平动点 r（默认 0.3 D）半径内；
     ③ 没有第三条了：早期版本曾多写一条 "minDist < r"，但初始点就在 L4 旁 offset 处，
        UI 可达范围内 minDist ≡ |offset| < r 恒成立，不构成区分力，故已删除。
     另附 winding（绕目标点的角向绕数，单位"圈"）：它是"真天平动 vs 沿零速度面边界滑动"
     的可观测量，只作参考指标，不参与判定。 */
  function captureCheck(traj, mu, opt) {
    const o = Object.assign({ target: null, r: 0.15, dwell: 0.8 }, opt || {});
    const L = lagrange(mu);
    let target = o.target;
    if (!target) {
      /* 未指定时取轨迹末点较近的三角点（L4 或 L5） */
      const last = traj[traj.length - 1] || [0, 0];
      target = Math.hypot(last[0] - L.L4.x, last[1] - L.L4.y) <= Math.hypot(last[0] - L.L5.x, last[1] - L.L5.y) ? 'L4' : 'L5';
    }
    const P = L[target];
    if (!P) throw new Error('captureCheck: target 必须是 L1–L5');
    let minDist = Infinity, inside = 0, hitPrimary = false, escaped = false;
    let prevAng = null, turn = 0;
    for (const p of traj) {
      const dx = p[0] - P.x, dy = p[1] - P.y;
      const d = Math.hypot(dx, dy);
      if (d < minDist) minDist = d;
      if (d <= o.r) inside++;
      /* 角向绕数：逐步累加绕目标点的转角（绝对值之和折算成圈数） */
      const ang = Math.atan2(dy, dx);
      if (prevAng !== null) {
        let da = ang - prevAng;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        turn += da;
      }
      prevAng = ang;
      const r1 = Math.hypot(p[0] + mu, p[1]);
      const r2 = Math.hypot(p[0] - 1 + mu, p[1]);
      if (r1 < 0.02 || r2 < 0.02) hitPrimary = true;
      if (Math.hypot(p[0], p[1]) > 3.2) escaped = true;
    }
    const dwellFrac = traj.length ? inside / traj.length : 0;
    const winding = Math.abs(turn) / (2 * Math.PI);
    const captured = !hitPrimary && !escaped && dwellFrac >= o.dwell;
    return { target, minDist, dwellFrac, hitPrimary, escaped, captured, winding, r: o.r, dwell: o.dwell };
  }

  /* ================= 7. 三角点线性稳定性（Routh 判据） ================= */
  /* 在 L4/L5 处线性化，特征方程 λ⁴ + λ² + 27μ(1−μ)/4 = 0；
     令 Λ=λ² 则 Λ² + Λ + 27μ(1−μ)/4 = 0。
     两 Λ 皆负（纯虚 λ、有界振荡）⇔ 27μ(1−μ) ≤ 1 ⇔ μ ≤ μ_R = (1−√(23/27))/2。 */
  function muRouth() { return 0.5 * (1 - Math.sqrt(23 / 27)); }

  function stability(mu, periodDays) {
    const q = 27 * mu * (1 - mu);
    const disc = 1 - q;
    /* periodDays：该"系统"里 1 个公转周期对应的天数（地月 27.321661，日地 365.256）。
       等质量双星没有以"天"为单位的物理周期，可传 2π 使输出直接以时间单位（TU）计。 */
    const Pd = (periodDays == null ? P_MOON_DAYS : periodDays);
    if (!(Pd > 0)) throw new Error('stability: periodDays 必须为正数');
    const tu2day = Pd / (2 * Math.PI);      /* 1 时间单位 = Pd/(2π) 天 */
    const out = {
      mu, q, disc, muRouth: muRouth(), stable: disc >= 0,
      lambda2: null, periods: null, omega: null,
      periodDays: Pd, tu2day, growthRate: 0
    };
    if (disc >= 0) {
      /* 稳定分支：λ² 为两个负实数 */
      const l1 = (-1 + Math.sqrt(disc)) / 2;
      const l2 = (-1 - Math.sqrt(disc)) / 2;
      out.lambda2 = [{ re: l1, im: 0 }, { re: l2, im: 0 }];
      out.omega = [Math.sqrt(Math.max(0, -l1)), Math.sqrt(Math.max(0, -l2))];
      /* 振荡周期（天）= 2π/ω × 1 时间单位对应的天数 */
      out.periods = out.omega.map((w) => (w > 0 ? (2 * Math.PI / w) * tu2day : Infinity));
      out.periodLongDays = out.periods[0];
      out.periodShortDays = out.periods[1];
    } else {
      /* 不稳定分支：λ² = (−1 ± i√(q−1))/2（复共轭），
         对应的 λ = ±√(λ²) 有正实部 → 指数发散；增长率取 max Re λ。 */
      const im = Math.sqrt(-disc) / 2;           /* = √(q−1)/2 */
      out.lambda2 = [{ re: -0.5, im: im }, { re: -0.5, im: -im }];
      const mod = Math.hypot(-0.5, im);
      out.growthRate = Math.sqrt(Math.max(0, (mod - 0.5) / 2));
    }
    return out;
  }

  /* ================= 8. 五点表（供数据页与断言引用） ================= */
  /* 生成一张"五点表"：位置、距主天体距离、临界雅可比常数、平衡残差 */
  function lagrangeTable(mu, periodDays) {
    const L = lagrange(mu), C = criticalC(mu);
    const P = (periodDays == null ? P_MOON_DAYS : periodDays);
    const tu2day = P / (2 * Math.PI);
    const rows = [];
    ['L1', 'L2', 'L3', 'L4', 'L5'].forEach((k) => {
      const p = L[k];
      rows.push({
        point: k,
        x: p.x, y: p.y,
        rEarth: Math.hypot(p.x + mu, p.y),      /* 到地球的距离（D 为单位） */
        rMoon: Math.hypot(p.x - 1 + mu, p.y),   /* 到月球的距离 */
        C: C[k],
        residual: residual(p.x, p.y, mu),
        kind: (k === 'L1' || k === 'L2' || k === 'L3') ? 'collinear' : 'triangular'
      });
    });
    return { mu, rows, tu2day, periodDays: P };
  }

  const API = {
    M_EARTH, M_MOON, MU_EARTH_MOON, MU_SUN_EARTH, P_MOON_DAYS, P_SUNEARTH_DAYS,
    massRatio, omega, rhs, residual, lagrange, jacobi, allowed, criticalC,
    propagate, captureCheck, muRouth, stability, lagrangeTable,
    collinearF, mulberry
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.CR3BP = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
