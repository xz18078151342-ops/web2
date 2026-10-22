/* ============================================================
   《地月驿站 L5 · 三维临场台》可复算断言（node test/t01-3d.test.cjs）
   判据：① 三维内核在 z=0 时必须逐点退化为二维内核（同一物理，不是另一套）
        ② 五个平动点在三维里仍是平衡点（残差）
        ③ 雅可比常数在三维轨道上守恒（含面外运动）
        ④ 零速度面高度解满足 v²=0，且门洞高度随 C 单调
        ⑤ 三角点垂直模频率恒为 1（周期 = 2π TU = 一个恒星月，与 μ 无关）
        ⑥ 三维捕获判定与二维判定在 z0=0 时完全一致（同一判据）
        ⑦ 垂直偏移会改写判定（可复现的翻转点）
        ⑧ 反向验证：非法输入必须报错、不可达点必须返回 null
   输出：控制台逐条 PASS/FAIL + test/result3d.json（入档证据）
   ============================================================ */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const here = __dirname;
const A2 = require(path.join(here, '..', 'algo.js'));
const A3 = require(path.join(here, '..', 'algo3d.js'));

let pass = 0, fail = 0;
const log = [];
function ok(name, fn) {
  try { fn(); pass++; log.push({ ok: true, name }); console.log('  PASS  ' + name); }
  catch (e) { fail++; log.push({ ok: false, name, err: e.message }); console.log('  FAIL  ' + name + ' :: ' + e.message); }
}
function near(a, b, tol, msg) { assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' expected ' + b + ' ±' + tol + ', got ' + a); }
function throws(fn, msg) { assert.throws(fn, /.*/, msg); }

console.log('== 《地月驿站 L5 · 三维临场台》三维内核断言 ==');

const MU = A2.MU_EARTH_MOON;
const L = A2.lagrange(MU);
const C = A2.criticalC(MU);
const C4 = 3 - MU + MU * MU;
const TU2DAY = A2.P_MOON_DAYS / (2 * Math.PI);

/* 默认算例（与界面一致）：L4 外侧 0.005 D / 切向 0.005 D/TU / 无垂直偏移 */
const S_DEF3 = [L.L4.x + 0.005, L.L4.y, 0, 0, 0.005, 0];
const RUN_DEF3 = A3.propagate3(S_DEF3, MU, { dt: 0.002, steps: 12000, sample: 20 });
const CAP_DEF3 = A3.captureCheck3(RUN_DEF3.traj, MU, { target: 'L4', r: 0.3, dwell: 0.9 }, L);
const C0_DEF = A3.jacobi3(S_DEF3, MU);

/* --- A. 三维 ↔ 二维 退化一致性 --- */
ok('A1 三维势 Ω(x,y,0) 与二维 Ω(x,y) 相等（5 个随机点，1e-15）', () => {
  const rnd = A2.mulberry(20261021);
  for (let i = 0; i < 5; i++) {
    const x = rnd() * 2.4 - 1.2, y = rnd() * 2.0 - 1.0;
    near(A3.omega3(x, y, 0, MU), A2.omega(x, y, MU), 1e-15, 'Ω');
  }
});

ok('A2 三维运动方程在 z=0、vz=0 时与二维逐分量相同（2e-15，仅差浮点结合顺序）', () => {
  const s2 = [L.L4.x + 0.005, L.L4.y, 0, 0.005];
  const s3 = [s2[0], s2[1], 0, s2[2], s2[3], 0];
  const a = A2.rhs(s2, MU), b = A3.rhs3(s3, MU);
  near(b[0], a[0], 2e-15, 'dx'); near(b[1], a[1], 2e-15, 'dy');
  near(b[3], a[2], 2e-15, 'dvx'); near(b[4], a[3], 2e-15, 'dvy');
  near(b[2], 0, 1e-16, 'dz'); near(b[5], 0, 1e-16, 'dvz');
});

ok('A3 平面初值下三维轨迹与二维轨迹逐点重合（2000 步，1e-13）', () => {
  const r2 = A2.propagate([L.L4.x + 0.005, L.L4.y, 0, 0.005], MU, { dt: 0.002, steps: 2000, sample: 10 });
  const r3 = A3.propagate3(S_DEF3, MU, { dt: 0.002, steps: 2000, sample: 10 });
  assert.strictEqual(r3.traj.length, r2.traj.length, '采样点数不同：' + r2.traj.length + ' vs ' + r3.traj.length);
  let md = 0;
  for (let i = 0; i < r2.traj.length; i++) {
    const p = r2.traj[i], q = r3.traj[i];
    md = Math.max(md, Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(q[2]));
  }
  assert.ok(md < 1e-13, '最大偏差 ' + md);
});

ok('A4 雅可比常数在三维下与二维在 z=0 处相等', () => {
  near(A3.jacobi3(S_DEF3, MU), A2.jacobi([S_DEF3[0], S_DEF3[1], S_DEF3[3], S_DEF3[4]], MU), 1e-14);
});

/* --- B. 五个平动点 --- */
ok('B1 三维修正后的五点残差 |∇Ω| 全部 < 1e-9', () => {
  ['L1', 'L2', 'L3', 'L4', 'L5'].forEach((k) => {
    const r = A3.residual3(L[k].x, L[k].y, 0, MU);
    assert.ok(r < 1e-9, k + ' 残差 ' + r);
  });
});

ok('B2 L4/L5 的 r1 = r2 = 1（等边三角形，垂直模频率 = 1 的前提）', () => {
  ['L4', 'L5'].forEach((k) => {
    const r1 = Math.hypot(L[k].x + MU, L[k].y);
    const r2 = Math.hypot(L[k].x - 1 + MU, L[k].y);
    near(r1, 1, 1e-12, k + ' r1'); near(r2, 1, 1e-12, k + ' r2');
  });
});

ok('B3 反向验证：L4 在 z 方向平移 1e-3 → 残差必须 >1e-4（L4 只在 z=0 平面内平衡）', () => {
  const bad = A3.residual3(L.L4.x, L.L4.y, 1e-3, MU);
  assert.ok(bad > 1e-4, '残差仅 ' + bad);
});

ok('B4 三维五点表与二维表位置一致，且 z=0、residual3 齐备', () => {
  const t = A3.lagrangeTable3(MU);
  assert.strictEqual(t.rows.length, 5);
  t.rows.forEach((r) => { assert.strictEqual(r.z, 0); assert.ok(r.residual3 < 1e-9); });
});

/* --- C. 雅可比常数守恒 --- */
ok('C1 平面轨道 24 TU 的 |ΔC| 漂移 < 1e-9', () => {
  assert.ok(RUN_DEF3.drift < 1e-9, 'drift=' + RUN_DEF3.drift);
});

ok('C2 带面外运动（z0=0.05）24 TU 的 |ΔC| 漂移 < 1e-9', () => {
  const r = A3.propagate3([L.L4.x + 0.005, L.L4.y, 0.05, 0, 0.005, 0], MU, { dt: 0.002, steps: 12000, sample: 20 });
  assert.ok(r.drift < 1e-9, 'drift=' + r.drift);
});

ok('C3 反向验证：同一条轨道换成欧拉积分，|ΔC| 必须升高 3 个数量级以上（指标有区分力）', () => {
  /* 若把 RK4 换成显式欧拉（其余不变），守恒量立刻退化为 O(1e-6) 量级：
     这证明「漂移 < 1e-9」不是任何积分器都能过，而是 RK4 + 本方程的实测结果。 */
  let s = S_DEF3.slice();
  const C0 = A3.jacobi3(s, MU);
  let maxDrift = 0;
  for (let i = 0; i < 12000; i++) {
    const d = A3.rhs3(s, MU);
    s = s.map((v, j) => v + 0.002 * d[j]);
    const dd = Math.abs(A3.jacobi3(s, MU) - C0);
    if (dd > maxDrift) maxDrift = dd;
    if (!s.every(Number.isFinite)) break;
  }
  assert.ok(maxDrift > 1e-7, '欧拉漂移仅 ' + maxDrift);
  assert.ok(maxDrift / RUN_DEF3.drift > 1000, 'RK4/欧拉 漂移比仅 ' + (maxDrift / RUN_DEF3.drift).toExponential(1));
});

/* --- D. 零速度面 --- */
ok('D1 高度解给出的点满足 v² = 0（|2Ω−C| < 1e-9）', () => {
  [[0.2, 0.1], [1.1, -0.4], [-0.6, 0.5], [0.4, 0.3]].forEach(([x, y]) => {
    const r = A3.zvsZ(x, y, MU, 3.0);
    assert.ok(r.z != null, '该点应存在蒙皮');
    near(A3.allowed3(x, y, r.z, MU, 3.0), 0, 1e-9, 'v² at (' + x + ',' + y + ')');
    near(A3.allowed3(x, y, -r.z, MU, 3.0), 0, 1e-9, '下蒙皮对称');
  });
});

ok('D2 蒙皮高度随 C 单调下降（C 越大，可达空间越小）', () => {
  let prev = Infinity;
  [2.9, 2.95, 3.0, 3.05].forEach((c) => {
    const z = A3.zvsHeight(0.2, 0.1, MU, c);
    assert.ok(z != null && z < prev, 'C=' + c + ' z=' + z);
    prev = z;
  });
});

ok('D3 零速度面内的点（L4 处 C=3.0 > C_L4）必须返回 null，且该点 v² < 0', () => {
  const x = L.L4.x, y = L.L4.y;
  const r = A3.zvsZ(x, y, MU, 3.0);
  assert.strictEqual(r.z, null);
  assert.strictEqual(r.kind, 'closed');
  assert.ok(A3.allowed3(x, y, 0, MU, 3.0) < 0);
});

ok('D4 L1 门洞净高：C=C_L1 时为 0，C 越小门越高；默认算例门高 0.557 D', () => {
  near(A3.gateHeight(L.L1.x, MU, C.L1), 0, 2e-6, 'C=C_L1');
  const h1 = A3.gateHeight(L.L1.x, MU, C.L1 - 0.02);
  const h2 = A3.gateHeight(L.L1.x, MU, C.L1 - 0.2);
  assert.ok(h2 > h1 && h1 > 0, '门高未随 C 下降而变高：' + h1 + ' / ' + h2);
  near(A3.gateHeight(L.L1.x, MU, C0_DEF), 0.55725, 1e-4, '默认算例门高');
});

ok('D5 L2 门洞比 L1 窄（同一 C 下，C_L2 < C_L1 ⇒ 更早关闭）', () => {
  const c = C.L1 - 0.01;
  assert.ok(A3.gateHeight(L.L2.x, MU, c) < A3.gateHeight(L.L1.x, MU, c));
});

/* --- E. 三角点垂直模：频率恒为 1 --- */
ok('E1 L4 纯垂直初值（z0=1e-3）实测周期 = 2π TU（误差 < 3e-6）', () => {
  const r = A3.propagate3([L.L4.x, L.L4.y, 0.001, 0, 0, 0], MU, { dt: 0.002, steps: 12000, sample: 5 });
  const vp = A3.verticalPeriod(r.traj, 1);
  assert.ok(vp, '未测到周期');
  near(vp.periodTU, 2 * Math.PI, 3e-6, '周期');
});

ok('E2 L5 与 L4 的垂直周期相同（对称性，1e-6）', () => {
  const a = A3.verticalPeriod(A3.propagate3([L.L5.x, L.L5.y, 0.001, 0, 0, 0], MU, { dt: 0.002, steps: 12000, sample: 5 }).traj, 1);
  const b = A3.verticalPeriod(A3.propagate3([L.L4.x, L.L4.y, 0.001, 0, 0, 0], MU, { dt: 0.002, steps: 12000, sample: 5 }).traj, 1);
  near(a.periodTU, b.periodTU, 1e-7, 'L4/L5 周期差');
  near(a.periodTU, 2 * Math.PI, 3e-6);
});

ok('E3 换成日地系统 μ=3e-6，垂直周期仍是 2π TU（与 μ 无关，5e-6）', () => {
  const Ls = A2.lagrange(3.0035e-6);
  const a = A3.verticalPeriod(A3.propagate3([Ls.L4.x, Ls.L4.y, 0.001, 0, 0, 0], 3.0035e-6, { dt: 0.002, steps: 12000, sample: 5 }).traj, 1);
  near(a.periodTU, 2 * Math.PI, 2e-5);
});

ok('E4 垂直振荡振幅守恒（z0=0.01，24 TU 后最大 |z| 与初值差 < 1e-3）', () => {
  const r = A3.propagate3([L.L4.x, L.L4.y, 0.01, 0, 0, 0], MU, { dt: 0.002, steps: 12000, sample: 10 });
  let amp = 0;
  r.traj.forEach((p) => { amp = Math.max(amp, Math.abs(p[2])); });
  near(amp, 0.01, 1e-3, '振幅');
});

ok('E5 理论值自洽：stability3 报出的垂直周期 = 一个恒星月', () => {
  const s = A3.stability3(MU, A2.P_MOON_DAYS);
  near(s.verticalPeriodDays, A2.P_MOON_DAYS, 1e-9);
  assert.strictEqual(s.verticalFreq, 1);
  assert.ok(s.stable === true, '地月系统 L4 面内稳定');
});

ok('E6 偏离 2π 的部分来自振幅的非线性耦合（误差随 z0² 缩放，比值 ≈100）', () => {
  const err = (z0) => {
    const r = A3.propagate3([L.L4.x, L.L4.y, z0, 0, 0, 0], MU, { dt: 0.002, steps: 24000, sample: 5 });
    return Math.abs(A3.verticalPeriod(r.traj, 1).periodTU - 2 * Math.PI);
  };
  const e2 = err(1e-2), e3 = err(1e-3);
  assert.ok(e2 / e3 > 60 && e2 / e3 < 160, '比值 ' + (e2 / e3).toFixed(1) + '（z0 缩小 10 倍，误差应缩小约 100 倍）');
});

/* --- F. 三维捕获判定 --- */
ok('F1 z0=0 时三维判定与二维判定完全一致（captured / dwell / winding）', () => {
  const r2 = A2.propagate([S_DEF3[0], S_DEF3[1], S_DEF3[3], S_DEF3[4]], MU, { dt: 0.002, steps: 12000, sample: 20 });
  const c2 = A2.captureCheck(r2.traj, MU, { target: 'L4', r: 0.3, dwell: 0.9 });
  assert.strictEqual(CAP_DEF3.captured, c2.captured);
  near(CAP_DEF3.dwellFrac, c2.dwellFrac, 1e-12);
  near(CAP_DEF3.winding, c2.winding, 1e-12);
  near(CAP_DEF3.zAmp, 0, 1e-15, 'zAmp');
});

ok('F2 默认算例判为捕获，驻留 100%，绕数 ≈1.07 圈（真天平动）', () => {
  assert.strictEqual(CAP_DEF3.captured, true);
  near(CAP_DEF3.dwellFrac, 1, 1e-12);
  near(CAP_DEF3.winding, 1.07, 0.02);
});

ok('F3 垂直偏移 z0=0.01 仍捕获（小振幅不破坏驻留）', () => {
  const r = A3.propagate3([L.L4.x + 0.005, L.L4.y, 0.01, 0, 0.005, 0], MU, { dt: 0.002, steps: 12000, sample: 20 });
  assert.strictEqual(A3.captureCheck3(r.traj, MU, { target: 'L4', r: 0.3, dwell: 0.9 }, L).captured, true);
});

ok('F4 垂直偏移 z0=0.30 必须翻面（同一初值，仅改垂直偏移）', () => {
  const r = A3.propagate3([L.L4.x + 0.005, L.L4.y, 0.30, 0, 0.005, 0], MU, { dt: 0.002, steps: 12000, sample: 20 });
  const c = A3.captureCheck3(r.traj, MU, { target: 'L4', r: 0.3, dwell: 0.9 }, L);
  assert.strictEqual(c.captured, false);
  assert.ok(c.zAmp > 0.3, 'zAmp=' + c.zAmp);
});

ok('F5 翻转点落在 z0 ∈ [0.13, 0.17]（二分定位，可复跑）', () => {
  const capturedAt = (z) => {
    const r = A3.propagate3([L.L4.x + 0.005, L.L4.y, z, 0, 0.005, 0], MU, { dt: 0.002, steps: 12000, sample: 20 });
    return A3.captureCheck3(r.traj, MU, { target: 'L4', r: 0.3, dwell: 0.9 }, L).captured;
  };
  assert.strictEqual(capturedAt(0.13), true);
  assert.strictEqual(capturedAt(0.17), false);
});

ok('F6 反向验证：目标点写 L9 → captureCheck3 必须抛错', () => {
  throws(() => A3.captureCheck3(RUN_DEF3.traj, MU, { target: 'L9' }, L));
});

ok('F7 逃逸算例（切向初速 1.0）判为未捕获且 escaped=true', () => {
  const r = A3.propagate3([L.L4.x + 0.005, L.L4.y, 0, 0, 1.0, 0], MU, { dt: 0.002, steps: 12000, sample: 20 });
  const c = A3.captureCheck3(r.traj, MU, { target: 'L4', r: 0.3, dwell: 0.9 }, L);
  assert.strictEqual(c.captured, false);
  assert.strictEqual(c.escaped, true);
});

/* --- G. 反向与边界 --- */
ok('G1 反向验证：非有限状态必须立刻终止并标记 nonfinite', () => {
  const r = A3.propagate3([0.5, 0.5, 0, Number.NaN, 0, 0], MU, { dt: 0.002, steps: 100, sample: 1 });
  assert.strictEqual(r.stop, 'nonfinite');
});

ok('G2 反向验证：朝地球投放（0.05 D 外、-0.2 D/TU）必须判为 hitPrimary', () => {
  const r = A3.propagate3([-MU + 0.05, 0, 0, -0.2, 0, 0], MU, { dt: 0.002, steps: 12000, sample: 20 });
  const c = A3.captureCheck3(r.traj, MU, { target: 'L4', r: 0.3, dwell: 0.9 }, L);
  assert.strictEqual(c.hitPrimary, true, 'stop=' + r.stop);
  assert.strictEqual(r.stop, 'earth');
});

ok('G3 蒙皮网格计算耗时 < 120 ms（110×90 栅格，交互时不掉帧的前提）', () => {
  const t0 = process.hrtime.bigint();
  let n = 0;
  for (let j = 0; j < 90; j++) {
    for (let i = 0; i < 110; i++) {
      const x = -1.6 + 3.2 * i / 109, y = -1.25 + 2.5 * j / 89;
      if (A3.zvsZ(x, y, MU, C0_DEF).z != null) n++;
    }
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(n > 5000, '有效栅格仅 ' + n);
  assert.ok(ms < 120, '耗时 ' + ms.toFixed(1) + ' ms');
});

ok('G4 恒等式：C0(默认算例) = 2Ω − v² 且低于 C_L4（所以绕 L4 是真天平动而非边界滑动）', () => {
  near(C0_DEF, A2.jacobi([S_DEF3[0], S_DEF3[1], S_DEF3[3], S_DEF3[4]], MU), 1e-14);
  assert.ok(C0_DEF < C4, 'C0=' + C0_DEF + ' 应小于 C_L4=' + C4);
});

/* --- 汇总 --- */
const result = {
  title: '地月驿站 L5 · 三维临场台 · 三维内核断言',
  when: new Date().toISOString(),
  mu: MU, C0: C0_DEF, gateL1: A3.gateHeight(L.L1.x, MU, C0_DEF),
  verticalPeriodTU: 2 * Math.PI, verticalPeriodDays: A2.P_MOON_DAYS,
  pass, fail, total: pass + fail,
  failed: log.filter((r) => !r.ok).map((r) => r.name),
  assertions: log
};
fs.writeFileSync(path.join(here, 'result3d.json'), JSON.stringify(result, null, 1), 'utf8');
console.log('\n== 结果：' + pass + ' PASS / ' + fail + ' FAIL（共 ' + (pass + fail) + ' 条）==');
process.exitCode = fail ? 1 : 0;
