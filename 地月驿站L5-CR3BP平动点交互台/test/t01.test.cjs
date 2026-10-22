/* ============================================================
   T01 可复算断言（node test/t01.test.cjs 直接跑）
   判据：质量比与五点几何 / 平衡残差 / 雅可比守恒 / 零速度面 /
        Routh 稳定性判据（含复特征值）/ 三预设的时间基准 / RK4 传播与最大漂移 /
        捕获判定（三条，含反向验证）/ 默认算例是否"真天平动" /
        content.js 的 i18n 完整性与静态数据表一致性 / 断言数与文案自洽
   说明：μ 与几何量是本作品按公开数值算出的「本作品实测」值；
        与文献对照时只作数量级核对，不作引用值。
   ============================================================ */
'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const here = __dirname;
const D = require(path.join(here, '..', 'algo.js'));

let pass = 0, fail = 0;
const log = [];
function ok(name, fn) {
  try { fn(); pass++; log.push({ ok: true, name }); console.log('  PASS  ' + name); }
  catch (e) { fail++; log.push({ ok: false, name, err: e.message }); console.log('  FAIL  ' + name + ' :: ' + e.message); }
}
function near(a, b, tol, msg) { assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' expected ' + b + ' ±' + tol + ', got ' + a); }
function throws(fn, msg) { assert.throws(fn, /.*/, msg); }

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;   /* CJK 表意文字（EN 界面不允许出现） */
const CJKP = /[\u3000-\u303f\uff00-\uffef]/;  /* CJK 标点/全角符号 */

console.log('== T01《地月驿站 L5》算法断言 ==');

const MU = D.MU_EARTH_MOON;
const L = D.lagrange(MU);
const C = D.criticalC(MU);
const C4 = 3 - MU + MU * MU;
const S0 = [L.L4.x + 0.01, L.L4.y, 0, 0];          /* 旧默认：L4 附近静止投放（边界滑动） */
const TRAJ = D.propagate(S0, MU, { dt: 0.002, steps: 12000, sample: 10 });

/* 默认算例（与 sim.js / UI 一致）：L4 外侧 0.005 D + 切向初速 0.005 */
const S_DEF = [L.L4.x + 0.005, L.L4.y, 0, 0.005];
const RUN_DEF = D.propagate(S_DEF, MU, { dt: 0.002, steps: 12000, sample: 20 });
const CAP_DEF = D.captureCheck(RUN_DEF.traj, MU, { target: 'L4', r: 0.3, dwell: 0.9 });
let MAXDEV_DEF = 0;
RUN_DEF.traj.forEach((p) => { MAXDEV_DEF = Math.max(MAXDEV_DEF, Math.hypot(p[0] - L.L4.x, p[1] - L.L4.y)); });

/* --- A. 质量参数 --- */
ok('A1 地月质量比 μ = m月/(m地+m月) ≈ 0.012144（±1e-6）', () => near(MU, 0.012144, 1e-6, 'μ'));
ok('A2 质量比互补：μ(A,B) + μ(B,A) = 1', () => near(D.massRatio(3, 7) + D.massRatio(7, 3), 1, 1e-15));
ok('A3 反向验证：质量给 0 或负数 → massRatio 必须抛错（不能静默返回 NaN）', () => {
  throws(() => D.massRatio(0, 5), 'm1=0');
  throws(() => D.massRatio(5, -1), 'm2<0');
});
ok('A4 反向验证：lagrange 传入 μ=0.6（超出 0<μ<0.5）→ 必须抛错', () => {
  throws(() => D.lagrange(0.6), 'μ>0.5');
  throws(() => D.lagrange(0), 'μ=0');
});
ok('A5 μ=0.5（等质量）时 L4.x = 0，系统左右对称', () => near(D.lagrange(0.5).L4.x, 0, 1e-12));
ok('A6 日地质量比（由太阳/地球质量算出）与预设 μ=3.0035e-6 一致（±1e-9）', () => {
  near(D.MU_SUN_EARTH, 0.0000030034458, 1e-13, 'MU_SUN_EARTH');
  near(0.0000030035, D.MU_SUN_EARTH, 1e-9, '预设值');
});

/* --- B. 五个平动点 --- */
ok('B1 L4/L5 精确等于 (0.5−μ, ±√3/2)', () => {
  near(L.L4.x, 0.5 - MU, 1e-12); near(L.L4.y, Math.sqrt(3) / 2, 1e-12);
  near(L.L5.y, -Math.sqrt(3) / 2, 1e-12);
});
ok('B2 共线点顺序 L3 < −μ < L1 < 1−μ < L2', () => {
  assert.ok(L.L3.x < -MU, 'L3');
  assert.ok(-MU < L.L1.x && L.L1.x < 1 - MU, 'L1 在地月之间');
  assert.ok(L.L2.x > 1 - MU, 'L2 在月球外');
  assert.ok(L.L3.x < L.L1.x && L.L1.x < L.L2.x, '三共线点单调');
});
ok('B3 五个点的平衡残差 |∇Ω| 全部 < 1e-9', () => {
  ['L1', 'L2', 'L3', 'L4', 'L5'].forEach((k) => {
    const r = D.residual(L[k].x, L[k].y, MU);
    assert.ok(r < 1e-9, k + ' 残差 ' + r);
  });
});
ok('B4 地月 L1/L2/L3 距地距离 ≈ 0.8491 / 1.1678 / 0.9929（D 为单位，±0.003）', () => {
  near(Math.hypot(L.L1.x + MU, 0), 0.84909, 0.003, 'rEarth L1');
  near(Math.hypot(L.L2.x + MU, 0), 1.16780, 0.003, 'rEarth L2');
  near(Math.hypot(L.L3.x + MU, 0), 0.99292, 0.003, 'rEarth L3');
});
ok('B5 L4 到地球与月球的距离都等于 1（等边三角形）', () => {
  near(Math.hypot(L.L4.x + MU, L.L4.y), 1, 1e-12, 'rEarth');
  near(Math.hypot(L.L4.x - 1 + MU, L.L4.y), 1, 1e-12, 'rMoon');
});
ok('B6 反向验证：把 L1 平移 1e-3 → 平衡残差必须升到 >1e-4（判定为不平衡）', () => {
  const bad = D.residual(L.L1.x + 1e-3, 0, MU);
  assert.ok(bad > 1e-4, '平移后残差仅 ' + bad + '，说明残差检验失效');
});

/* --- C. 雅可比常数与零速度面 --- */
ok('C1 L4 静止时的雅可比常数 = 3−μ+μ²（1e-12，解析解）', () => {
  near(D.jacobi([L.L4.x, L.L4.y, 0, 0], MU), C4, 1e-12);
  near(C.L5, C4, 1e-12);
});
ok('C2 沿 12000 步轨道雅可比常数守恒（漂移 < 1e-9）', () => {
  assert.ok(TRAJ.drift < 1e-9, 'drift=' + TRAJ.drift);
});
ok('C3 初速加倍 → 雅可比常数下降（C = 2Ω − v²）', () => {
  const a = D.jacobi([L.L4.x + 0.01, L.L4.y, 0.1, 0], MU);
  const b = D.jacobi([L.L4.x + 0.01, L.L4.y, 0.2, 0], MU);
  assert.ok(b < a, 'v 增大 C 未减小');
});
ok('C4 L1 通道：C 略高于 C_L1 时该点禁止通过，略低时开放', () => {
  assert.ok(D.allowed(L.L1.x, 0, MU, C.L1 + 1e-3) < 0, '应禁止');
  assert.ok(D.allowed(L.L1.x, 0, MU, C.L1 - 1e-3) > 0, '应开放');
});
ok('C5 临界雅可比常数排序 C_L4 = C_L5 < C_L3 < C_L2 < C_L1', () => {
  assert.strictEqual(C.L4, C.L5);
  assert.ok(C.L4 < C.L3 && C.L3 < C.L2 && C.L2 < C.L1, '排序错：' + JSON.stringify(C));
});
ok('C6 零速度面判据自洽：L4 处 2Ω(L4) = C_L4，L4 在静止时为边界点', () => {
  near(D.allowed(L.L4.x, L.L4.y, MU, C4), 0, 1e-15);
});

/* --- D. 稳定性（Routh 判据 + 复特征值 + 时间基准） --- */
ok('D1 μ_Routh = (1−√(23/27))/2 ≈ 0.038521（±1e-6）', () => near(D.muRouth(), 0.038521, 1e-6));
ok('D2 地月系统（μ≈0.0121）三角点线性稳定，λ² 为负实数（虚部 = 0）', () => {
  const st = D.stability(MU);
  assert.strictEqual(st.stable, true);
  assert.ok(st.lambda2[0].re < 0 && st.lambda2[1].re < 0, 'λ² 实部应同为负');
  assert.strictEqual(st.lambda2[0].im, 0);
  assert.strictEqual(st.lambda2[1].im, 0);
  near(st.lambda2[0].re + st.lambda2[1].re, -1, 1e-12, '两根之和 = −1');
  near(st.lambda2[0].re * st.lambda2[1].re, 27 * MU * (1 - MU) / 4, 1e-15, '两根之积 = 27μ(1−μ)/4');
});
ok('D3 反向验证：μ=0.5 时同一判据必须判不稳定（判据不是恒真）', () => {
  assert.strictEqual(D.stability(0.5).stable, false, 'μ=0.5 竟判稳定 → 判据失效');
});
ok('D4 本作品实测：地月 L4 天平动周期 ≈ 91.65 天（长）/ 28.62 天（短）', () => {
  const st = D.stability(MU);
  near(st.periodLongDays, 91.65, 1.0, '长周期');
  near(st.periodShortDays, 28.62, 0.5, '短周期');
});
ok('D5 判据在临界点两侧单调切换：μ=0.03850 稳定、μ=0.03855 不稳定', () => {
  assert.strictEqual(D.stability(0.03850).stable, true);
  assert.strictEqual(D.stability(0.03855).stable, false);
});
ok('D6 不稳定分支 λ² 必须保留虚部：λ² = −1/2 ± i√(q−1)/2 且与 4×4 特征值增长率一致', () => {
  const st = D.stability(0.5);
  const q = 27 * 0.5 * (1 - 0.5);
  const im = Math.sqrt(q - 1) / 2;
  near(st.lambda2[0].re, -0.5, 1e-15, '实部');
  near(st.lambda2[0].im, im, 1e-15, '虚部');
  near(st.lambda2[1].im, -im, 1e-15, '共轭虚部');
  /* 由 Λ 求 λ = ±√Λ，取正实部为增长率 */
  const mod = Math.hypot(st.lambda2[0].re, st.lambda2[0].im);
  const growth = Math.sqrt((mod + st.lambda2[0].re) / 2);
  near(st.growthRate, growth, 1e-15, 'growthRate');
  near(st.growthRate, 0.632075, 1e-5, '独立 4×4 特征值实部 ±0.632');
});
ok('D7 三预设的时间基准：地月 27.321661 / 日地 365.256 天，日地长周期 ≈ 81120 天（不是 6067.9）', () => {
  const em = D.stability(MU, D.P_MOON_DAYS);
  const se = D.stability(0.0000030035, D.P_SUNEARTH_DAYS);
  assert.strictEqual(D.P_MOON_DAYS, 27.321661);
  assert.strictEqual(D.P_SUNEARTH_DAYS, 365.256);
  near(em.periodLongDays, 91.65, 1.0, '地月长周期');
  near(se.periodLongDays, 81119.99, 1.0, '日地长周期');
  near(se.periodShortDays, 365.26, 0.1, '日地短周期');
  assert.ok(se.periodLongDays > 80000, '日地长周期必须 >8e4 天');
  /* 旧实现的错误值作为反向锚点：默认基准仍会算成 6067.9 —— 这个数字绝不能再进 UI */
  near(D.stability(0.0000030035).periodLongDays, 6067.889, 0.01, '错误基准锚点');
  near(D.stability(0.0000030035).periodLongDays * 13.37, se.periodLongDays, 10, '13.37× 修正量级');
});
ok('D8 反向验证：stability 传入非正 periodDays → 必须抛错（不允许静默用默认基准）', () => {
  throws(() => D.stability(MU, 0), 'Pd=0');
  throws(() => D.stability(MU, -1), 'Pd<0');
});

/* --- E. 传播与捕获判定 --- */
ok('E1 未终止时采样点数 = steps/sample + 1', () => {
  const r = D.propagate(S0, MU, { dt: 0.002, steps: 1000, sample: 10 });
  assert.strictEqual(r.traj.length, 101);
  assert.strictEqual(r.stop, 'steps');
});
ok('E2 旧默认（speed=0）仍满足三条判据，但 C0 > C_L4 且 minDist ≡ offset：这正是"沿零速度面边界滑动"', () => {
  const c = D.captureCheck(TRAJ.traj, MU, { target: 'L4', r: 0.3, dwell: 0.9 });
  assert.strictEqual(c.captured, true, JSON.stringify(c));
  near(c.dwellFrac, 1, 1e-9);
  const C0 = D.jacobi(S0, MU);
  assert.ok(C0 > C4, 'C0 应大于 C_L4（L4 被禁止区包住）');
  /* minDist 恒等于初始 offset —— 旧第 4 条判据 minDist<r 因此恒真、无区分力，已删除 */
  near(c.minDist, 0.01, 1e-9, 'minDist 恒等于 offset');
});
ok('E3 偏移拉到 0.2 → 同一判定必须判为未捕获（宽度敏感）', () => {
  const r = D.propagate([L.L4.x + 0.2, L.L4.y, 0, 0], MU, { dt: 0.002, steps: 6000, sample: 10 });
  const c = D.captureCheck(r.traj, MU, { target: 'L4', r: 0.3, dwell: 0.9 });
  assert.strictEqual(c.captured, false, JSON.stringify(c));
});
ok('E4 初速 1.0 的抛射 → 判为逃逸，且不能判成捕获', () => {
  const r = D.propagate([1.3, 0.3, 1.0, 0], MU, { dt: 0.002, steps: 6000, sample: 10 });
  const c = D.captureCheck(r.traj, MU, { target: 'L4' });
  assert.strictEqual(r.stop, 'escape');
  assert.strictEqual(c.escaped, true);
  assert.strictEqual(c.captured, false);
});
ok('E5 直接朝地球投放 → 判为撞击主天体，停止原因 earth', () => {
  const r = D.propagate([-MU + 0.05, 0, -0.3, 0], MU, { dt: 0.002, steps: 6000, sample: 10 });
  const c = D.captureCheck(r.traj, MU, { target: 'L4' });
  assert.strictEqual(r.stop, 'earth');
  assert.strictEqual(c.hitPrimary, true);
  assert.strictEqual(c.captured, false);
});
ok('E6 反向验证：把轨迹换成随机噪声点 → 捕获判定必须为 false（防止判定器恒真）', () => {
  const rnd = D.mulberry(20261023);
  const noise = [];
  for (let i = 0; i < 200; i++) noise.push([rnd() * 4 - 2, rnd() * 4 - 2, 0, 0, i * 0.01]);
  const c = D.captureCheck(noise, MU, { target: 'L4', r: 0.3, dwell: 0.9 });
  assert.strictEqual(c.captured, false, JSON.stringify(c));
});
ok('E7 反向验证：驻留阈值设成 1.01（不可达）→ 好轨道也必须判 false', () => {
  const c = D.captureCheck(TRAJ.traj, MU, { target: 'L4', r: 0.3, dwell: 1.01 });
  assert.strictEqual(c.captured, false, '阈值不可达仍判 true → 阈值没有生效');
});
ok('E8 非法目标点 → captureCheck 必须抛错', () => {
  throws(() => D.captureCheck(TRAJ.traj, MU, { target: 'L9' }), 'L9');
});
ok('E9 判据恰好三条：captured 必须严格等于 (未撞 && 未逃 && dwell ≥ 阈值)，无隐藏第 4 条', () => {
  const cases = [
    [TRAJ.traj, { r: 0.3, dwell: 0.9 }],
    [TRAJ.traj, { r: 0.3, dwell: 0.99 }],
    [TRAJ.traj, { r: 0.05, dwell: 0.9 }],
    [D.propagate([L.L4.x + 0.2, L.L4.y, 0, 0], MU, { steps: 6000, sample: 10 }).traj, { r: 0.3, dwell: 0.9 }],
    [D.propagate([1.3, 0.3, 1.0, 0], MU, { steps: 6000, sample: 10 }).traj, { r: 0.3, dwell: 0.3 }],
    [D.propagate([-MU + 0.05, 0, -0.3, 0], MU, { steps: 6000, sample: 10 }).traj, { r: 0.9, dwell: 0.1 }]
  ];
  cases.forEach(([traj, opt], i) => {
    const c = D.captureCheck(traj, MU, Object.assign({ target: 'L4' }, opt));
    const expect = !c.hitPrimary && !c.escaped && c.dwellFrac >= opt.dwell;
    assert.strictEqual(c.captured, expect, 'case ' + i + ' 与三条判据不一致：' + JSON.stringify(c));
    assert.ok(Number.isFinite(c.winding) && c.winding >= 0, 'case ' + i + ' winding 非法');
  });
});
ok('E10 绕数 winding 有区分力：绕目标两圈的圆轨迹 = 2 圈，直线穿过 = 0 圈', () => {
  const cx = L.L4.x, cy = L.L4.y, R = 0.1;
  const circle = [];
  for (let i = 0; i <= 200; i++) {
    const a = (i / 100) * Math.PI * 2;   /* 两圈 */
    circle.push([cx + R * Math.cos(a), cy + R * Math.sin(a), 0, 0, i * 0.01]);
  }
  const c1 = D.captureCheck(circle, MU, { target: 'L4', r: 0.2, dwell: 0.9 });
  near(c1.winding, 2, 0.05, '圆轨迹绕数');
  const line = [];
  for (let i = 0; i <= 100; i++) line.push([cx + 0.02 + i * 0.003, cy, 0, 0, i * 0.01]);
  const c2 = D.captureCheck(line, MU, { target: 'L4', r: 0.2, dwell: 0.9 });
  assert.ok(c2.winding < 0.01, '直线穿过的绕数应 ≈ 0，实际 ' + c2.winding);
});

/* --- F. 漂移指标 / 默认算例 / 预设 / 静态数据表 / i18n --- */
ok('F1 漂移指标 = 采样点上的 max|C(t)−C0|（不是只取末点）', () => {
  let mx = 0;
  TRAJ.traj.forEach((p) => { mx = Math.max(mx, Math.abs(D.jacobi(p, MU) - TRAJ.C0)); });
  near(TRAJ.drift, mx, 1e-18, 'drift 应为采样最大漂移');
  assert.ok(TRAJ.drift >= TRAJ.driftEnd - 1e-18, 'max 漂移应 ≥ 末点漂移');
});
ok('F2 粗步长下最大漂移明显大于末点漂移 → 指标有区分力', () => {
  const coarse = D.propagate(S_DEF, MU, { dt: 0.02, steps: 1200, sample: 2 });
  assert.ok(coarse.drift > coarse.driftEnd * 1.05,
    'dt=0.02 时 max=' + coarse.drift + ' 应显著大于 end=' + coarse.driftEnd);
});
ok('F3 默认算例（offset=0.005, speed=0.005）是真天平动：C0 < C_L4、100% 驻留、绕数 ≥ 1、有界', () => {
  const C0 = D.jacobi(S_DEF, MU);
  assert.ok(C0 < C4, 'C0=' + C0 + ' 应小于 C_L4=' + C4 + '（L4 不在禁止区内）');
  assert.strictEqual(RUN_DEF.stop, 'steps');
  assert.strictEqual(CAP_DEF.captured, true);
  near(CAP_DEF.dwellFrac, 1, 1e-12, '驻留比例');
  assert.ok(CAP_DEF.winding >= 1, '24 TU 内绕数应 ≥ 1，实际 ' + CAP_DEF.winding);
  assert.ok(MAXDEV_DEF < 0.2, '最大偏离应 < 0.2 D，实际 ' + MAXDEV_DEF);
  assert.ok(CAP_DEF.minDist < 0.1, '最近距离应 < 0.1 D');
});
ok('F4 反向验证：若把默认初速改回 0 → C0 > C_L4，退化为零速度面边界滑动（这正是被修掉的旧默认）', () => {
  const s0 = [L.L4.x + 0.005, L.L4.y, 0, 0];
  assert.ok(D.jacobi(s0, MU) > C4, 'speed=0 时 C0 必须大于 C_L4');
});
ok('F5 默认算例长期有界：积分 1200 TU（≈13 圈地月公转）后最大偏离仍 < 0.2 D', () => {
  const long = D.propagate(S_DEF, MU, { dt: 0.002, steps: 600000, sample: 2000 });
  assert.strictEqual(long.stop, 'steps');
  let mx = 0;
  long.traj.forEach((p) => { mx = Math.max(mx, Math.hypot(p[0] - L.L4.x, p[1] - L.L4.y)); });
  assert.ok(mx < 0.2, '1200 TU 后最大偏离 ' + mx);
  assert.ok(long.drift < 1e-9, '长期积分漂移 ' + long.drift);
});
ok('F6 sim.js 默认值与预设：offset/speed=0.005、预设 id 拼写正确（sunearth）、周期基准随预设', () => {
  global.window = { CR3BP: D, SIM: {} };
  require(path.join(here, '..', 'sim.js'));
  const SIM = global.window.SIM;
  assert.ok(SIM && SIM.DEFAULTS, 'sim.js 未导出 SIM.DEFAULTS');
  assert.strictEqual(SIM.DEFAULTS.offset, 0.005);
  assert.strictEqual(SIM.DEFAULTS.speed, 0.005);
  assert.deepStrictEqual(SIM.PRESETS.map((p) => p.id), ['earthmoon', 'sunearth', 'equal']);
  assert.strictEqual(SIM.PRESETS[0].pd, D.P_MOON_DAYS);
  assert.strictEqual(SIM.PRESETS[1].pd, D.P_SUNEARTH_DAYS);
  assert.strictEqual(SIM.PRESETS[2].pd, 2 * Math.PI);
  /* 三预设各自的长周期（用 SIM.PRESETS 里的 pd 传进 stability） */
  near(D.stability(SIM.PRESETS[0].mu, SIM.PRESETS[0].pd).periodLongDays, 91.65, 1.0, '地月');
  near(D.stability(SIM.PRESETS[1].mu, SIM.PRESETS[1].pd).periodLongDays, 81119.99, 1.0, '日地');
  assert.strictEqual(D.stability(SIM.PRESETS[2].mu, SIM.PRESETS[2].pd).stable, false, '等质量');
  /* 旧拼写 suneath 必须已不存在 */
  assert.strictEqual(SIM.PRESETS.find((p) => p.id === 'suneath'), undefined);
});
ok('F7 content.js 的 i18n 字典完整：zh/en 键集合一致、无空串、EN 侧无中文', () => {
  global.window = {};
  require(path.join(here, '..', 'content.js'));
  const CONTENT = global.window.CONTENT;
  const UI = CONTENT.i18n;
  assert.ok(UI && UI.zh && UI.en, 'content.js 缺 i18n');
  const zk = Object.keys(UI.zh).sort(), ek = Object.keys(UI.en).sort();
  assert.deepStrictEqual(ek, zk, 'zh/en 键集合不一致');
  assert.ok(zk.length >= 40, '界面词条过少：' + zk.length);
  zk.forEach((k) => {
    assert.ok(String(UI.zh[k]).trim().length > 0, 'zh 空串 ' + k);
    assert.ok(String(UI.en[k]).trim().length > 0, 'en 空串 ' + k);
    assert.ok(!CJK.test(UI.en[k]) && !CJKP.test(UI.en[k]), 'EN 词条含中文 ' + k + ' = ' + UI.en[k]);
  });
  /* sim.js 用到的关键键必须存在 */
  ['preset_head', 'launch_head', 'station_head', 'verdict_head', 'fire', 'canvas_aria', 'canvas_note',
    'sl_mu', 'sl_offset', 'sl_speed', 'sl_radius', 'sl_dwell',
    'm_cap', 'm_dwell', 'm_C', 'm_C1', 'm_stab', 'm_drift', 'm_wind',
    'cap_yes', 'cap_escape', 'cap_impact', 'cap_no', 'dwell_fmt', 'stab_ok_fmt', 'stab_bad_fmt',
    'unit_day', 'unit_tu', 'hud_hold', 'hud_escaped', 'hud_impact', 'hud_blowup', 'hud_full',
    'skip', 'lang_btn', 'lang_aria', 'nav_aria'].forEach((k) => {
      assert.ok(UI.zh[k] != null && UI.en[k] != null, '缺界面键 ' + k);
    });
});
ok('F8 content.js 全部 EN 文案无中文残留（双语对象 147+ 条，en 侧 0 处 CJK）', () => {
  const CONTENT = global.window.CONTENT;
  let pairs = 0, bad = [];
  /* en 侧的字符串 / 字符串数组都不允许出现中文（数组也要查：旧版这里漏检过） */
  const checkEn = (v, p) => {
    if (typeof v === 'string') {
      if (CJK.test(v) || CJKP.test(v)) bad.push(p + ' = ' + v.slice(0, 60));
      return;
    }
    if (Array.isArray(v)) { v.forEach((x, i) => checkEn(x, p + '[' + i + ']')); return; }
    if (v && typeof v === 'object') { Object.keys(v).forEach((k) => checkEn(v[k], p + '.' + k)); }
  };
  const walk = (node, p) => {
    if (node == null || typeof node === 'string') return;
    if (Array.isArray(node)) { node.forEach((x, i) => walk(x, p + '[' + i + ']')); return; }
    if (typeof node === 'object') {
      if (typeof node.zh === 'string' && typeof node.en === 'string') pairs++;
      if (node.en != null) checkEn(node.en, p + '.en');
      if (Array.isArray(node.zh) && Array.isArray(node.en) && node.zh.length !== node.en.length) {
        bad.push(p + ' zh/en 数组长度不一致');
      }
      Object.keys(node).forEach((k) => walk(node[k], p + '.' + k));
    }
  };
  walk(CONTENT, 'CONTENT');
  assert.ok(pairs >= 147, '双语对象只剩 ' + pairs + ' 个');
  assert.deepStrictEqual(bad, [], 'EN 侧中文残留：' + bad.slice(0, 6).join(' | '));
});
ok('F9 content.js 静态数据表 = algo.js 实时表（L3 距月已修正为 766 077 km，类型列双语对象）', () => {
  const CONTENT = global.window.CONTENT;
  const mod = CONTENT.modules.find((m) => m.id === 'data');
  assert.ok(mod && mod.dynamic === 'lpoints', '数据页未标记 dynamic=lpoints');
  const live = D.lagrangeTable(MU);
  const km = (d) => Math.round(d * 384400);
  mod.table.rows.forEach((row, i) => {
    const r = live.rows[i];
    assert.strictEqual(row[0], r.point);
    near(parseFloat(row[1].replace('−', '-')), r.x, 1e-4, row[0] + ' x');
    near(parseInt(row[2].replace(/\s/g, ''), 10), km(r.rEarth), 2, row[0] + ' 距地');
    near(parseInt(row[3].replace(/\s/g, ''), 10), km(r.rMoon), 2, row[0] + ' 距月');
    near(parseFloat(row[4]), r.C, 1e-5, row[0] + ' C');
    near(parseFloat(row[5]), r.residual, Math.max(1e-20, r.residual * 0.051), row[0] + ' 残差');
    assert.strictEqual(typeof row[6], 'object', row[0] + ' 类型列必须是双语对象（否则 EN 模式残留中文）');
    assert.ok(row[6].zh && row[6].en, row[0] + ' 类型列缺 zh/en');
  });
  assert.strictEqual(mod.table.rows[2][3].replace(/\s/g, ''), '766077', 'L3 距月必须是 766 077 km');
});
ok('F10 content.js 事实文案已修正：不是 10 圈 / 按钮叫播放 / 无音频 / 24 TU = 3.820 圈 = 104.36 天', () => {
  const CONTENT = global.window.CONTENT;
  const lab = CONTENT.modules.find((m) => m.id === 'lab');
  assert.ok(lab, '缺 lab 模块');
  const zh = lab.lead.zh, en = lab.lead.en;
  assert.ok(zh.indexOf('3.820') >= 0 && zh.indexOf('104.36') >= 0, '中文 lead 缺 3.820 圈 / 104.36 天');
  assert.ok(en.indexOf('3.820') >= 0 && en.indexOf('104.36') >= 0, '英文 lead 缺 3.820 / 104.36');
  assert.ok(zh.indexOf('10 圈') < 0 && en.indexOf('ten Earth') < 0, '仍残留 10 圈表述');
  assert.ok(zh.indexOf('播放') >= 0 && zh.indexOf('发射') < 0, '按钮名应为「播放」');
  assert.ok(en.toLowerCase().indexOf('press play') >= 0, '英文应为 press play');
  /* 24 TU 的换算本身 */
  near(24 / (2 * Math.PI), 3.820, 0.001, '24 TU 折算圈数');
  near(24 * D.P_MOON_DAYS / (2 * Math.PI), 104.36, 0.01, '24 TU 折算天数');
  /* 全树检索：不得再出现 Web Audio 作为作品能力、不得出现"试听" */
  const flat = JSON.stringify(CONTENT);
  const bads = ['正弦合成', 'Web Audio 正弦', '试听音频'];
  bads.forEach((b) => assert.ok(flat.indexOf(b) < 0, '仍残留假声明：' + b));
  assert.ok(flat.indexOf('不含音频') >= 0 && flat.indexOf('no audio') >= 0, '缺"无音频"的如实声明');
});

/* --- 汇总 --- */
const out = { suite: 'T01 cr3bp-lunar-station', pass, fail, total: pass + fail, checks: log };
fs.writeFileSync(path.join(here, 'result.json'), JSON.stringify(out, null, 1));

/* 断言数与 content.js 文案自洽：文档里写的条数必须等于实际条数（含本条） */
ok('Z1 content.js 里写的断言条数与实际一致（防止加删断言后文案过期）', () => {
  const src = fs.readFileSync(path.join(here, '..', 'content.js'), 'utf8');
  const zhNums = (src.match(/(\d+)\s*条断言/g) || []).map((s) => parseInt(s, 10));
  const enNums = (src.match(/(\d+)\s+assertions/g) || []).map((s) => parseInt(s, 10));
  assert.ok(zhNums.length >= 2, 'content.js 应至少两处写断言条数，实际 ' + zhNums.length);
  assert.ok(enNums.length >= 2, 'content.js 应至少两处写英文断言条数，实际 ' + enNums.length);
  const total = pass + fail + 1;           /* 本条断言尚未计入 pass/fail，故 +1 */
  zhNums.forEach((n) => assert.strictEqual(n, total, '中文断言条数 ' + n + ' ≠ 实际 ' + total));
  enNums.forEach((n) => assert.strictEqual(n, total, '英文断言条数 ' + n + ' ≠ 实际 ' + total));
});
const total = pass + fail;
const final = { suite: 'T01 cr3bp-lunar-station', pass, fail, total, checks: log };
fs.writeFileSync(path.join(here, 'result.json'), JSON.stringify(final, null, 1));

/* stats.json：本作品实测的五点表（结构与其它作品不同，供文档与数据页引用） */
const table = D.lagrangeTable(MU);
fs.writeFileSync(path.join(here, 'stats.json'), JSON.stringify([], null, 1));
fs.writeFileSync(path.join(here, 'lpoints.json'), JSON.stringify(table, null, 1));

console.log('\n== 结果：' + pass + ' / ' + total + ' PASS，' + fail + ' FAIL ==');
console.log(JSON.stringify(table.rows.map((r) => ({
  point: r.point, x: +r.x.toFixed(4), rEarth: +r.rEarth.toFixed(4),
  rMoon: +r.rMoon.toFixed(4), C: +r.C.toFixed(4), residual: r.residual
})), null, 1));
process.exit(fail ? 1 : 0);
