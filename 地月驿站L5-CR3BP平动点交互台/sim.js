/* ============================================================
   sim.js —— 《地月驿站 L5》交互模块：驿站布置台
   规则内核在 algo.js（window.CR3BP）；本文件只负责：算例 / 绘制 / 交互。
   界面文案一律走 api.t(key)（字典在 content.js 的 i18n），
   因此 EN 模式下本模块不残留任何中文（含 canvas 内文字与 aria-label）。
   ============================================================ */
(function () {
  'use strict';
  const D = window.CR3BP;
  const SIM = window.SIM = window.SIM || {};

  /* ---------------- 预设：三套质量比 + 各自的"时间换算基准" ----------------
     pd = 该系统里一个公转周期对应的天数。地月 27.321661 / 日地 365.256；
     等质量双星没有以"天"为单位的物理周期，取 pd = 2π 使周期直接以 TU 输出。
     —— 旧版把地月 27.32 天硬编码给所有预设，导致日地长周期偏小 13.37×。 */
  const PRESETS = [
    {
      id: 'earthmoon', mu: D.MU_EARTH_MOON, pd: D.P_MOON_DAYS, unit: 'day',
      label: { zh: '地月系统 μ=0.0121', en: 'Earth–Moon μ=0.0121' }
    },
    {
      id: 'sunearth', mu: 0.0000030035, pd: D.P_SUNEARTH_DAYS, unit: 'day',
      label: { zh: '日地系统 μ=0.000003', en: 'Sun–Earth μ=0.000003' }
    },
    {
      id: 'equal', mu: 0.5, pd: 2 * Math.PI, unit: 'tu',
      label: { zh: '等质量双星 μ=0.5', en: 'Equal masses μ=0.5' }
    }
  ];
  SIM.PRESETS = PRESETS;

  const STEPS = 12000, SAMPLE = 20, DT = 0.002;
  const T_SPAN = STEPS * DT;                 /* 24 时间单位 = 3.820 圈地月公转 = 104.36 天 */
  const FIRE_STEP = 0.005;                   /* 「换一个初速」步长：小于捕获窗口宽度，能走到分界线 */
  const COL_OK = '#6fbf8b';                  /* 结论绿（叠在 --ink-2 上 5.9:1） */
  const COL_BAD = '#e06a52';                 /* 结论红（叠在 --ink-2 上 5.43:1，达标 4.5:1） */

  /* 默认算例：L4 外侧 0.005 D、切向初速 0.005。
     C0 = 2Ω − v² = 2.9879973 < C_L4 = 2.9880035 ⇒ L4 不被禁止区包住，
     轨迹是绕 L4 的真天平动（24 TU 内约 1.07 圈、100% 采样在 0.3 D 内；
     1200 TU 长期积分仍有界，见 test F5/G4）。旧版 speed=0 时 C0 > C_L4，
     实际只是沿零速度面边界滑动，且 minDist 恒等于 offset（audit P1-8）。 */
  const DEFAULTS = {
    mu: D.MU_EARTH_MOON, offset: 0.005, speed: 0.005,
    radius: 0.3, dwell: 0.9, preset: 'earthmoon',
    pd: D.P_MOON_DAYS, unit: 'day'
  };
  SIM.DEFAULTS = DEFAULTS;
  const presetOf = (id) => PRESETS.find((p) => p.id === id) || PRESETS[0];

  /* μ 的显示：日地 3e-6 不能用 toFixed(5)（会显示 0.00000） */
  const fmtMu = (v) => (v < 1e-4 ? v.toExponential(2) : v.toFixed(5));

  function buildModel(st) {
    const mu = st.mu, pd = st.pd || D.P_MOON_DAYS;
    const L = D.lagrange(mu);
    const crit = D.criticalC(mu);
    /* 发射位置在 L4 附近沿 x 方向偏移；初速度给切向（y 方向）分量 */
    const s0 = [L.L4.x + st.offset, L.L4.y, 0, st.speed];
    const run = D.propagate(s0, mu, { dt: DT, steps: STEPS, sample: SAMPLE });
    const cap = D.captureCheck(run.traj, mu, { target: 'L4', r: st.radius, dwell: st.dwell });
    const stab = D.stability(mu, pd);
    const C0 = D.jacobi(s0, mu);
    /* 到 L4 的最大偏离：与 C0 < C_L4 一起说明"是不是真的绕着 L4 转" */
    let maxDev = 0;
    for (let i = 0; i < run.traj.length; i++) {
      const d = Math.hypot(run.traj[i][0] - L.L4.x, run.traj[i][1] - L.L4.y);
      if (d > maxDev) maxDev = d;
    }
    return { mu, pd, L, crit, run, cap, stab, C0, C4: 3 - mu + mu * mu, s0, st, maxDev };
  }

  /* ---------------- 绘制 ---------------- */
  /* 画布高宽比 0.70（与下面 __fit(canvas, RATIO) 的实参一致），纵向可视范围按同一比例取值，保证各向同性 */
  const VIEW_X = 1.75, RATIO = 0.70, VIEW_Y = VIEW_X * RATIO;

  function makePainter(canvas, api) {
    let field = null, fieldKey = '';

    /* 零速度面：把"速度平方为负（不可达）"的区域涂暗，把可达区留亮 */
    function makeField(mu, C) {
      const key = mu.toFixed(8) + '|' + C.toFixed(6);
      if (key === fieldKey && field) return field;
      const W = 300, H = 210;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(W, H);
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const x = -VIEW_X + (2 * VIEW_X) * (i + 0.5) / W;
          const y = VIEW_Y - (2 * VIEW_Y) * (j + 0.5) / H;
          const v2 = 2 * D.omega(x, y, mu) - C;
          const p = (j * W + i) * 4;
          if (v2 >= 0) {
            const a = Math.min(1, v2 * 1.6);
            img.data[p] = 34 + 40 * a; img.data[p + 1] = 44 + 54 * a; img.data[p + 2] = 58 + 62 * a;
            img.data[p + 3] = 235;
          } else {
            img.data[p] = 16; img.data[p + 1] = 17; img.data[p + 2] = 19;
            img.data[p + 3] = 235;
          }
        }
      }
      ctx.putImageData(img, 0, 0);
      field = cv; fieldKey = key;
      return cv;
    }

    return function paint(model, now) {
      const { ctx, w, h } = window.__fit(canvas, RATIO);
      const P = window.__palette();
      const sx = w / (2 * VIEW_X), sy = h / (2 * VIEW_Y);
      const X = (x) => w / 2 + x * sx;
      const Y = (y) => h / 2 - y * sy;

      /* 背景：零速度面 */
      const f = makeField(model.mu, model.C0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(f, 0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(8,10,13,.35)'); g.addColorStop(1, 'rgba(8,10,13,.62)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      /* 坐标网格（以质心为原点） */
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
      for (let i = -4; i <= 4; i++) {
        const xx = X(i * 0.5), yy = Y(i * 0.5);
        if (xx > 0 && xx < w) { ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, h); ctx.stroke(); }
        if (yy > 0 && yy < h) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke(); }
      }

      /* 两个主天体（尺寸放大显示，非真实比例） */
      const ex = X(-model.mu), ey = Y(0);
      const mx = X(1 - model.mu), my = Y(0);
      const eg = ctx.createRadialGradient(ex - 3, ey - 3, 1, ex, ey, 15);
      eg.addColorStop(0, '#7fb2e0'); eg.addColorStop(1, '#1f4d7a');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 15, 0, 7); ctx.fill();
      const mg = ctx.createRadialGradient(mx - 2, my - 2, 1, mx, my, 9);
      mg.addColorStop(0, '#d8d4cc'); mg.addColorStop(1, '#5a5750');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 9, 0, 7); ctx.fill();

      /* 平动点 */
      const names = ['L1', 'L2', 'L3', 'L4', 'L5'];
      names.forEach((k) => {
        const p = model.L[k];
        const px = X(p.x), py = Y(p.y);
        const tri = (k === 'L4' || k === 'L5');
        ctx.beginPath(); ctx.arc(px, py, tri ? 5 : 3.4, 0, 7);
        ctx.fillStyle = tri ? P.a3 : 'rgba(240,236,228,.55)'; ctx.fill();
        if (tri) {
          ctx.strokeStyle = 'rgba(217,176,97,.35)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(px, py, 11, 0, 7); ctx.stroke();
        }
        ctx.fillStyle = tri ? P.a3 : 'rgba(240,236,228,.5)';
        ctx.font = '10px ui-monospace,monospace';
        ctx.fillText(k, px + 7, py - 6);
      });
      /* 等边三角形提示线（地—月—L4 与 地—月—L5） */
      ctx.strokeStyle = 'rgba(217,176,97,.20)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(X(model.L.L4.x), Y(model.L.L4.y));
      ctx.lineTo(mx, my); ctx.moveTo(ex, ey); ctx.lineTo(X(model.L.L5.x), Y(model.L.L5.y)); ctx.lineTo(mx, my);
      ctx.stroke(); ctx.setLineDash([]);

      /* 轨迹：随时间"长出来" */
      const traj = model.run.traj;
      const T = traj.length ? traj[traj.length - 1][4] : 1;
      const head = Math.max(2, Math.round(traj.length * Math.min(1, (now || 0) / Math.max(1e-6, T))));
      ctx.beginPath();
      for (let i = 0; i < Math.min(head, traj.length); i++) {
        const p = traj[i];
        const px = X(p[0]), py = Y(p[1]);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = model.cap.captured ? 'rgba(95,167,122,.95)' : 'rgba(201,98,47,.95)';
      ctx.lineWidth = 1.5; ctx.stroke();
      /* 起点与当前位置 */
      const cur = traj[Math.min(head, traj.length) - 1] || [0, 0];
      ctx.fillStyle = '#f0ece4';
      ctx.beginPath(); ctx.arc(X(cur[0]), Y(cur[1]), 2.6, 0, 7); ctx.fill();
      if (model.cap.captured) {
        ctx.strokeStyle = 'rgba(95,167,122,.5)'; ctx.beginPath();
        ctx.arc(X(model.L.L4.x), Y(model.L.L4.y), model.st.radius * sx, 0, 7); ctx.stroke();
      }

      /* 画布内注释：语言跟随界面（旧版这里是中英混排硬编码） */
      ctx.fillStyle = 'rgba(240,236,228,.42)'; ctx.font = '10px ui-monospace,monospace';
      ctx.fillText(api.t('canvas_note'), 10, h - 10);
    };
  }

  /* ---------------- 模块 ---------------- */
  SIM.stationLab = {
    /* mount 返回 dispose()：app.js 在切语言/重建前调用，用来停动画、断 ResizeObserver，防止泄漏 */
    mount(host, api) {
      const { h, pick } = api;
      const st = Object.assign({}, DEFAULTS);
      let model = buildModel(st);
      let raf = 0, playing = false, t0 = 0;

      const stage = h('div', { class: 'stage' });
      const screen = h('div', { class: 'screen' });
      const canvas = h('canvas', { role: 'img', 'aria-label': api.t('canvas_aria') });
      const hud = h('div', { class: 'hud' });
      const hudL = h('span', { text: '—' });
      const hudR = h('span', { text: '—' });
      hud.appendChild(hudL); hud.appendChild(hudR);
      screen.appendChild(canvas); screen.appendChild(hud);
      stage.appendChild(screen);

      const ctrls = h('div', { class: 'ctrls' });

      /* 预设 */
      const c1 = h('div', { class: 'ctrl' });
      c1.appendChild(h('h4', { text: api.t('preset_head') }));
      const b1 = h('div', { class: 'btns' });
      const pbtns = PRESETS.map((p) => {
        const btn = h('button', {
          class: 'chip', type: 'button',
          'aria-pressed': p.id === st.preset ? 'true' : 'false',
          text: pick(p.label)
        });
        btn.addEventListener('click', () => { applyPreset(p); });
        b1.appendChild(btn); return btn;
      });
      c1.appendChild(b1);
      c1.appendChild(h('p', { class: 'small', text: api.t('preset_note'), style: 'margin:6px 0 0' }));

      /* 播放 / 换初速 / 重置 */
      const c2 = h('div', { class: 'ctrl' });
      c2.appendChild(h('h4', { text: api.t('launch_head') }));
      const b2 = h('div', { class: 'btns' });
      const playBtn = h('button', { class: 'chip', type: 'button', text: '▶ ' + api.t('play') });
      const fireBtn = h('button', { class: 'chip', type: 'button', text: api.t('fire') });
      const resetBtn = h('button', { class: 'chip', type: 'button', text: api.t('reset') });
      b2.appendChild(playBtn); b2.appendChild(fireBtn); b2.appendChild(resetBtn);
      c2.appendChild(b2);
      c2.appendChild(h('p', { class: 'small', text: api.t('play_note'), style: 'margin:6px 0 0' }));

      /* 参数滑块 */
      const c3 = h('div', { class: 'ctrl' });
      c3.appendChild(h('h4', { text: api.t('station_head') }));
      const mkRefs = {};
      function slider(key, stKey, min, max, step, val, fmt, label) {
        const row = h('label', { class: 'row' });
        row.appendChild(h('span', { text: label }));
        const out = h('span', { class: 'readout', text: fmt(val) });
        const inp = h('input', {
          type: 'range', min: min, max: max, step: step, value: val,
          'aria-label': label, 'aria-valuetext': fmt(val)
        });
        inp.addEventListener('input', () => {
          out.textContent = fmt(+inp.value);
          inp.setAttribute('aria-valuetext', fmt(+inp.value));
          st[stKey] = +inp.value;
          st.preset = 'custom';
          pbtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
          rebuild();
        });
        row.appendChild(out); row.appendChild(inp);
        c3.appendChild(row);
        mkRefs[key] = { inp, out, fmt };
        return inp;
      }
      slider('mu', 'mu', 0.000001, 0.5, 0.0001, st.mu, fmtMu, api.t('sl_mu'));
      slider('offset', 'offset', -0.15, 0.15, 0.005, st.offset, (v) => v.toFixed(3), api.t('sl_offset'));
      /* 步长 0.001：捕获窗口（默认 offset 下约 0~0.021）内有足够分辨率，能手动拖到"捕获→逃逸"分界 */
      slider('speed', 'speed', 0, 1.2, 0.001, st.speed, (v) => v.toFixed(3), api.t('sl_speed'));
      slider('radius', 'radius', 0.05, 0.6, 0.01, st.radius, (v) => v.toFixed(2), api.t('sl_radius'));
      slider('dwell', 'dwell', 0.3, 0.99, 0.01, st.dwell, (v) => v.toFixed(2), api.t('sl_dwell'));

      /* 指标（aria-live：拖滑块后判定变化可被屏幕阅读器播报） */
      const c4 = h('div', { class: 'ctrl' });
      c4.appendChild(h('h4', { text: api.t('verdict_head') }));
      const metrics = h('div', { class: 'metrics', 'aria-live': 'polite', 'aria-atomic': 'false' });
      const rows = {};
      [['cap', 'm_cap'], ['dwell', 'm_dwell'], ['C', 'm_C'], ['C1', 'm_C1'],
      ['stab', 'm_stab'], ['drift', 'm_drift'], ['wind', 'm_wind']].forEach(([k, labelKey]) => {
        const d = h('div');
        d.appendChild(h('span', { text: api.t(labelKey) }));
        const b = h('b', { text: '—' });
        d.appendChild(b); metrics.appendChild(d); rows[k] = b;
      });
      c4.appendChild(metrics);

      ctrls.appendChild(c1); ctrls.appendChild(c2); ctrls.appendChild(c3); ctrls.appendChild(c4);
      stage.appendChild(ctrls);
      host.appendChild(stage);

      const paint = makePainter(canvas, api);

      function applyPreset(p) {
        st.preset = p.id; st.mu = p.mu; st.pd = p.pd; st.unit = p.unit;
        if (mkRefs.mu) {
          mkRefs.mu.inp.value = p.mu;
          mkRefs.mu.out.textContent = mkRefs.mu.fmt(p.mu);
          mkRefs.mu.inp.setAttribute('aria-valuetext', mkRefs.mu.fmt(p.mu));
        }
        pbtns.forEach((b, i) => b.setAttribute('aria-pressed', PRESETS[i].id === p.id ? 'true' : 'false'));
        rebuild(true);
      }

      let timer = 0;
      function rebuild(autoPlay) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const wasPlaying = playing;
          stop();
          model = buildModel(st);
          updateMetrics();
          paint(model, model.run.traj.length ? model.run.traj[model.run.traj.length - 1][4] : 0);
          if (autoPlay || wasPlaying) play();
        }, 0);
      }

      function periodText() {
        if (!model.stab.stable) return '';
        const unit = api.t(model.st.unit === 'tu' ? 'unit_tu' : 'unit_day');
        const v = model.stab.periodLongDays;
        const txt = (v >= 1000 ? v.toFixed(0) : v.toFixed(1));
        return api.t('period_fmt').replace('{v}', txt).replace('{unit}', unit);
      }

      function statusText() {
        const m = model;
        if (m.cap.captured) return api.t('hud_hold');
        if (m.cap.escaped) return api.t('hud_escaped');
        if (m.cap.hitPrimary) return api.t('hud_impact');
        if (m.run.stop === 'nonfinite') return api.t('hud_blowup');
        return api.t('hud_full');
      }

      function fill(tpl, map) {
        let s = tpl;
        Object.keys(map).forEach((k) => { s = s.split('{' + k + '}').join(map[k]); });
        return s;
      }

      function updateMetrics() {
        const m = model;
        rows.cap.textContent = m.cap.captured ? api.t('cap_yes')
          : (m.cap.escaped ? api.t('cap_escape') : (m.cap.hitPrimary ? api.t('cap_impact') : api.t('cap_no')));
        rows.cap.style.color = m.cap.captured ? COL_OK : COL_BAD;
        rows.dwell.textContent = fill(api.t('dwell_fmt'), {
          d: (m.cap.dwellFrac * 100).toFixed(1), t: (m.st.dwell * 100).toFixed(0)
        });
        rows.C.textContent = m.C0.toFixed(4);
        rows.C1.textContent = m.crit.L1.toFixed(4);
        rows.stab.textContent = m.stab.stable
          ? fill(api.t('stab_ok_fmt'), { mr: m.stab.muRouth.toFixed(5), p: periodText() })
          : fill(api.t('stab_bad_fmt'), { mr: m.stab.muRouth.toFixed(5) });
        rows.stab.style.color = m.stab.stable ? COL_OK : COL_BAD;
        rows.drift.textContent = m.run.drift.toExponential(1);
        rows.wind.textContent = m.cap.winding.toFixed(2);
        hudL.textContent = 'μ=' + fmtMu(m.mu) + ' · C=' + m.C0.toFixed(4) + ' · ' + m.st.offset.toFixed(3) + ' / ' + m.st.speed.toFixed(3);
        hudR.textContent = statusText();
      }

      function play() {
        if (!model.run.traj.length) return;
        playing = true; t0 = performance.now();
        playBtn.textContent = '⏸ ' + api.t('pause');
        loop();
      }
      function stop() {
        playing = false; cancelAnimationFrame(raf);
        playBtn.textContent = '▶ ' + api.t('play');
      }
      function totalT() {
        const tr = model.run.traj;
        return tr.length ? tr[tr.length - 1][4] : 1;
      }
      function loop() {
        const el = (performance.now() - t0) / 1000;
        const span = 9;                       /* 用 9 秒放完全部轨迹 */
        const now = Math.min(1, el / span) * totalT();
        paint(model, now);
        if (el / span < 1) raf = requestAnimationFrame(loop);
        else { playing = false; playBtn.textContent = '▶ ' + api.t('play'); paint(model, totalT()); }
      }

      playBtn.addEventListener('click', () => { playing ? stop() : play(); });
      fireBtn.addEventListener('click', () => {
        /* 步长 0.005：小于捕获窗口（默认 offset 下约 0~0.021），点几下就能看到"捕获→逃逸"翻面 */
        const next = Math.round((st.speed + FIRE_STEP) * 1000) / 1000;
        st.speed = next > 1.2 ? 0 : next;
        st.preset = 'custom'; pbtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        if (mkRefs.speed) {
          mkRefs.speed.inp.value = st.speed;
          mkRefs.speed.out.textContent = mkRefs.speed.fmt(st.speed);
          mkRefs.speed.inp.setAttribute('aria-valuetext', mkRefs.speed.fmt(st.speed));
        }
        rebuild(true);
      });
      resetBtn.addEventListener('click', () => {
        Object.keys(DEFAULTS).forEach((k) => { st[k] = DEFAULTS[k]; });
        ['mu', 'offset', 'speed', 'radius', 'dwell'].forEach((k) => {
          if (mkRefs[k]) {
            mkRefs[k].inp.value = st[k];
            mkRefs[k].out.textContent = mkRefs[k].fmt(st[k]);
            mkRefs[k].inp.setAttribute('aria-valuetext', mkRefs[k].fmt(st[k]));
          }
        });
        pbtns.forEach((b, i) => b.setAttribute('aria-pressed', PRESETS[i].id === DEFAULTS.preset ? 'true' : 'false'));
        rebuild(true);
      });

      /* 自动化 API（录屏 / 截图 / 断言都用它） */
      SIM.stationLab.api = {
        set(s) {
          s = s || {};
          if (s.preset) {
            const p = presetOf(s.preset);
            st.preset = p.id; st.mu = p.mu; st.pd = p.pd; st.unit = p.unit;
            if (mkRefs.mu) {
              mkRefs.mu.inp.value = p.mu;
              mkRefs.mu.out.textContent = mkRefs.mu.fmt(p.mu);
              mkRefs.mu.inp.setAttribute('aria-valuetext', mkRefs.mu.fmt(p.mu));
            }
            pbtns.forEach((b, i) => b.setAttribute('aria-pressed', PRESETS[i].id === p.id ? 'true' : 'false'));
          }
          ['mu', 'offset', 'speed', 'radius', 'dwell'].forEach((k) => {
            if (s[k] != null) {
              st[k] = +s[k]; st.preset = 'custom';
              if (mkRefs[k]) {
                mkRefs[k].inp.value = +s[k];
                mkRefs[k].out.textContent = mkRefs[k].fmt(+s[k]);
                mkRefs[k].inp.setAttribute('aria-valuetext', mkRefs[k].fmt(+s[k]));
              }
            }
          });
          if (s.mu != null || s.offset != null || s.speed != null || s.radius != null || s.dwell != null) {
            pbtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
          }
          model = buildModel(st);
          updateMetrics();
          paint(model, totalT());
          if (s.play === true && !playing) play();
          if (s.play === false && playing) stop();
          return { ok: true, captured: model.cap.captured, dwell: model.cap.dwellFrac, winding: model.cap.winding };
        },
        model() { return model; },
        defaults() { return Object.assign({}, DEFAULTS); }
      };

      updateMetrics();
      paint(model, totalT());
      const ro = new ResizeObserver(() => paint(model, totalT()));
      ro.observe(canvas);
      /* 释放：app.js 重建前调用（旧版 ResizeObserver 从不 disconnect，canvas 被移除后仍在观察） */
      return function dispose() {
        stop();
        clearTimeout(timer);
        ro.disconnect();
      };
    }
  };

  /* ---------------- 封面与卡片视觉（本作品自有母题：势场里的三角形） ---------------- */
  SIM.art = {
    cover(ctx, w, h, t) {
      const P = window.__palette();
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#080a0d'); g.addColorStop(.5, '#0b0e13'); g.addColorStop(1, '#090b0f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const nz = window.Core.noise2(1772);
      /* 势场等值线：同心环 + 两个引力井 */
      const cx = w * 0.62, cy = h * 0.5, R = Math.min(w, h) * 0.9;
      for (let i = 1; i <= 26; i++) {
        ctx.beginPath();
        for (let a = 0; a <= 64; a++) {
          const th = (a / 64) * Math.PI * 2;
          const v = nz(Math.cos(th) * 1.6 + i * 0.12 + t * 0.00006, Math.sin(th) * 1.6 + i * 0.09);
          const rr = (i / 26) * R * (0.7 + v * 0.5);
          const x = cx + Math.cos(th + i * 0.012) * rr;
          const y = cy + Math.sin(th + i * 0.012) * rr * 0.62;
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = i % 6 === 0 ? 'rgba(217,176,97,.30)' : 'rgba(120,150,180,.11)';
        ctx.lineWidth = i % 6 === 0 ? 1.2 : 0.8;
        ctx.stroke();
      }
      /* 等边三角形：地球—月球—L4 */
      const ax = w * 0.30, ay = h * 0.74, bx = w * 0.62, by = h * 0.74;
      const mx = (ax + bx) / 2, my = ay - (bx - ax) * Math.sqrt(3) / 2;
      ctx.strokeStyle = 'rgba(217,176,97,.55)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(mx, my); ctx.closePath(); ctx.stroke();
      /* 地球与月球 */
      const eg = ctx.createRadialGradient(ax - 6, ay - 6, 2, ax, ay, 42);
      eg.addColorStop(0, 'rgba(127,178,224,.95)'); eg.addColorStop(1, 'rgba(31,77,122,.55)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ax, ay, 42, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(216,212,204,.85)'; ctx.beginPath(); ctx.arc(bx, by, 16, 0, 7); ctx.fill();
      /* 五个点 */
      const pts = [
        [ax + (bx - ax) * 0.849, ay], [ax + (bx - ax) * 1.168, ay], [ax - (bx - ax) * 0.128, ay],
        [mx, my], [mx - 30, ay + (bx - ax) * 0.06]
      ];
      pts.forEach((p, i) => {
        const tri = i >= 3;
        ctx.beginPath();
        const pulse = 1 + 0.15 * Math.sin(t * 0.0012 + i);
        ctx.arc(p[0], p[1], (tri ? 4.2 : 2.6) * pulse, 0, 7);
        ctx.fillStyle = tri ? P.a3 : 'rgba(240,236,228,.7)'; ctx.fill();
        if (tri) {
          ctx.strokeStyle = 'rgba(217,176,97,.35)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(p[0], p[1], 13 * pulse, 0, 7); ctx.stroke();
        }
      });
      /* 轨迹弧：从地球轨道绕到 L4 的虚线 */
      ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(240,236,228,.22)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax + 46, ay);
      ctx.bezierCurveTo(ax + (bx - ax) * 0.35, ay + 60, mx - 40, my + 70, mx - 8, my + 8);
      ctx.stroke(); ctx.setLineDash([]);
      /* 底部渐暗 */
      const gg = ctx.createLinearGradient(0, h * 0.55, 0, h);
      gg.addColorStop(0, 'rgba(8,10,13,0)'); gg.addColorStop(1, 'rgba(8,10,13,.94)');
      ctx.fillStyle = gg; ctx.fillRect(0, h * 0.55, w, h * 0.45);
    },

    card(kind, ctx, w, h, i) {
      const P = window.__palette();
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0a0d11'); g.addColorStop(1, '#12161c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const r = window.Core.rng(window.Core.hash(kind + i));
      /* 舱段：六边形模块 + 内部排线 + 编号 */
      const cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.29;
      ctx.strokeStyle = 'rgba(217,176,97,.55)'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.86;
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      /* 内部结构：随序号变化的隔间与管线 */
      const n = 3 + (i % 4);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * R * 0.25, cy + Math.sin(a) * R * 0.22);
        ctx.lineTo(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.79);
        ctx.strokeStyle = k % 2 ? 'rgba(79,143,127,.5)' : 'rgba(255,255,255,.14)';
        ctx.lineWidth = k % 2 ? 1.3 : 0.9;
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.26, 0, 7);
      ctx.fillStyle = i % 3 === 0 ? P.a1 : (i % 3 === 1 ? P.a2 : P.a3);
      ctx.globalAlpha = .85; ctx.fill(); ctx.globalAlpha = 1;
      /* 编号 */
      ctx.fillStyle = 'rgba(240,236,228,.9)';
      ctx.font = 'bold 13px ui-monospace,monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1).padStart(2, '0'), cx, cy + 5);
      ctx.textAlign = 'left';
      /* 星点背景 */
      for (let k = 0; k < 26; k++) {
        const x = r() * w, y = r() * h * 0.45;
        ctx.fillStyle = 'rgba(240,236,228,' + (0.06 + r() * 0.22) + ')';
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }
  };
})();
