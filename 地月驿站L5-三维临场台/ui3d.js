/* ============================================================
   ui3d.js —— 《地月驿站 L5 · 三维临场台》界面与交互
   职责：状态、控件、中英双语、指标上屏、键盘与触摸、回放循环。
   规则：判定结论一律来自 algo3d.js；本文件不产出任何物理结论，
        只把模型数值排版成文字（与二维版「呈现层不产出结论」一致）。
   ============================================================ */
(function () {
  'use strict';
  const A3 = window.CR3BP3;
  const SC = window.SCENE3D;
  const D2 = window.CR3BP;

  const D_KM = 384400;                     /* 1 D = 384 400 km（平均地月距离） */

  /* ---------------- 双语字典 ---------------- */
  const I18N = {
    brandSub: { zh: '三维临场台', en: '3D Live Console' },
    back: { zh: '返回二维主作品', en: 'Back to 2D work' },
    scenHead: { zh: '场景', en: 'Scenarios' },
    scenNote: { zh: '预设只改初值：判定仍由同一份内核算。', en: 'Presets only change initial conditions; the same kernel judges.' },
    sc_vertical: { zh: '垂直驻留', en: 'Vertical hold' },
    sc_plane: { zh: '平面算例', en: 'Planar case' },
    sc_flip: { zh: '越界翻面', en: 'Break-off' },
    sc_escape: { zh: '逃逸', en: 'Escape' },
    paramHead: { zh: '参数', en: 'Parameters' },
    sysHead: { zh: '系统', en: 'System' },
    p_earthmoon: { zh: '地月系统', en: 'Earth–Moon' },
    p_sunearth: { zh: '日地系统', en: 'Sun–Earth' },
    p_equal: { zh: '等质量双星', en: 'Equal masses' },
    sysInfo: { zh: 'μ = {mu} · 一个公转周期 {pd} 天', en: 'μ = {mu} · one orbit {pd} d' },
    sl_offset: { zh: '横向偏移（D）', en: 'Lateral offset (D)' },
    sl_speed: { zh: '切向初速（D/TU）', en: 'Tangential speed (D/TU)' },
    sl_z0: { zh: '垂直偏移（D）', en: 'Vertical offset (D)' },
    sl_radius: { zh: '判定半径（D）', en: 'Capture radius (D)' },
    paramNote: { zh: '拖动即重算；三维零速度面随 C 同步重建。', en: 'Dragging recomputes; the 3D surface rebuilds with C.' },
    playHead: { zh: '回放', en: 'Playback' },
    play: { zh: '播放', en: 'Play' },
    pause: { zh: '暂停', en: 'Pause' },
    fire: { zh: '换初速 +0.005', en: 'Nudge +0.005' },
    reset: { zh: '重置', en: 'Reset' },
    timeLabel: { zh: '时间', en: 'Time' },
    timeFmt: { zh: '{t} TU · {d} 天', en: '{t} TU · {d} days' },
    dispHead: { zh: '显示', en: 'Display' },
    tg_surface: { zh: '零速度面', en: 'Zero-velocity surface' },
    tg_trail: { zh: '轨迹', en: 'Trajectory' },
    tg_grid: { zh: '参考网格', en: 'Reference grid' },
    tg_inertial: { zh: '惯性系', en: 'Inertial frame' },
    tg_spin: { zh: '自动旋转', en: 'Auto-orbit' },
    camHead: { zh: '视角', en: 'Camera' },
    cam_iso: { zh: '斜视', en: 'Iso' },
    cam_top: { zh: '俯视', en: 'Top' },
    cam_side: { zh: '侧视', en: 'Side' },
    cam_reset: { zh: '复位', en: 'Reset' },
    cam_station: { zh: '驿站特写', en: 'Station' },
    metHead: { zh: '实测', en: 'Measured' },
    m_verdict: { zh: '判定', en: 'Verdict' },
    m_dwell: { zh: '驻留', en: 'Dwell' },
    m_C: { zh: 'C₀', en: 'C₀' },
    m_C1: { zh: 'C_L1', en: 'C_L1' },
    m_drift: { zh: '|ΔC|', en: '|ΔC|' },
    m_wind: { zh: '绕数', en: 'Winding' },
    m_zamp: { zh: '垂直振幅', en: 'Vertical amp.' },
    m_zperiod: { zh: '垂直周期', en: 'Vertical period' },
    m_gate: { zh: 'L1 门高', en: 'L1 gate height' },
    m_flip: { zh: '翻面点 z₀', en: 'Break-off z₀' },
    v_hold: { zh: '捕获驻留', en: 'Captured' },
    v_escape: { zh: '已逃逸', en: 'Escaped' },
    v_impact: { zh: '撞击主天体', en: 'Impact' },
    v_no: { zh: '未捕获', en: 'Not captured' },
    v_nan: { zh: '数值发散', en: 'Diverged' },
    insHead: { zh: '三维才看得到的', en: 'Only visible in 3D' },
    ins1: {
      zh: '垂直模：z″ = −z。L4/L5 处 r₁ = r₂ = 1，面外振荡频率恒为 1，周期 = 2π TU = 一个恒星月，与 μ 无关。',
      en: 'Vertical mode: z″ = −z. At L4/L5 r₁ = r₂ = 1, so the out-of-plane frequency is exactly 1 — period 2π TU, one sidereal month, independent of μ.'
    },
    ins2: {
      zh: '零速度面在三维是一张有洞的穹顶：两处引力漏斗 + L1/L2 门洞。当前 C₀ 下 L1 门洞净高 {gate} D ≈ {km} 万 km。',
      en: 'The zero-velocity surface is a dome with holes: two gravity funnels plus L1/L2 gates. At the current C₀ the L1 gate is {gate} D ≈ {km}×10⁴ km tall.'
    },
    ins3: {
      zh: '垂直偏移改写判定：同一初值下 z₀ 超过 ≈{flip} D，驻留比例跌破阈值 —— 站体不是想多高就多高。',
      en: 'Vertical offset rewrites the verdict: with the same initial state, z₀ above ≈{flip} D drops dwell below the threshold — the station cannot be arbitrarily tall.'
    },
    ins3na: {
      zh: '当前初值本身就守不住（驻留已低于阈值），翻面点无意义 —— 先把切向初速调回 0.005 附近。',
      en: 'This initial state already fails (dwell below threshold), so the break-off point is undefined — bring the tangential speed back near 0.005.'
    },
    noteHead: { zh: '读这张图', en: 'Reading the scene' },
    noteBody: {
      zh: '天体半径已放大显示（地球约 5 倍、月球约 10 倍，否则看不见），站体与轨迹同理。所有数字来自三维 CR3BP 内核，可在 test/ 复跑。',
      en: 'Body radii are exaggerated for visibility (Earth ~5×, Moon ~10×); so are the station and trail. Every number comes from the 3D CR3BP kernel and is re-runnable under test/.'
    },
    lg_earth: { zh: '地球', en: 'Earth' },
    lg_moon: { zh: '月球', en: 'Moon' },
    lg_L: { zh: '平动点', en: 'Libration points' },
    lg_trail: { zh: '轨迹', en: 'Trajectory' },
    lg_zvs: { zh: '零速度面', en: 'Zero-velocity surface' },
    lg_gate: { zh: 'L1 门高', en: 'L1 gate' },
    hint: { zh: '拖拽旋转 · 滚轮缩放 · 双击复位 · 方向键微调', en: 'Drag to orbit · wheel to zoom · double-click to reset · arrow keys to nudge' },
    canvasAria: {
      zh: '三维地月系统：地球、月球、五个平动点、半透明零速度面、L5 驿站站体与三维轨迹。方向键旋转视角，加减号缩放。',
      en: 'A 3D Earth–Moon system: Earth, Moon, five libration points, a translucent zero-velocity surface, the L5 station and a 3D trajectory. Arrow keys orbit; plus/minus zoom.'
    },
    loading: { zh: '正在构建三维场景…', en: 'Building the 3D scene…' },
    webglFail: { zh: '此浏览器/显卡不支持 WebGL，三维场景无法显示；二维版仍可运行。', en: 'WebGL is unavailable in this browser; the 2D work still runs.' },
    liveFmt: { zh: '判定：{v}；驻留 {d}%；垂直振幅 {z} D。', en: 'Verdict: {v}; dwell {d}%; vertical amplitude {z} D.' },
    ui3d: { zh: '三维临场台', en: '3D console' },
    drawerCtl: { zh: '控制', en: 'Controls' },
    drawerMet: { zh: '实测', en: 'Measured' },
    station: { zh: '地月驿站 L5', en: 'Station L5' },
    gateLbl: { zh: '门高 {v} D', en: 'gate {v} D' },
    zvsLbl: { zh: '零速度面', en: 'ZVS' }
  };

  let lang = (() => {
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q === 'en' || q === 'zh') return q;
      const saved = localStorage.getItem('l5-3d-lang');
      if (saved === 'en' || saved === 'zh') return saved;
      return /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
    } catch (e) { return 'zh'; }
  })();

  const t = (k, vars) => {
    const row = I18N[k];
    let s = row ? row[lang] : k;
    if (vars) Object.keys(vars).forEach((v) => { s = s.split('{' + v + '}').join(vars[v]); });
    return s;
  };
  const pick = (o) => (o ? o[lang] : '');

  /* ---------------- 场景与默认值 ---------------- */
  const PRESETS = [
    { id: 'earthmoon', mu: D2.MU_EARTH_MOON, pd: D2.P_MOON_DAYS, key: 'p_earthmoon' },
    { id: 'sunearth', mu: 0.0000030035, pd: D2.P_SUNEARTH_DAYS, key: 'p_sunearth' },
    { id: 'equal', mu: 0.5, pd: 2 * Math.PI, key: 'p_equal' }
  ];
  const DEFAULTS = {
    mu: D2.MU_EARTH_MOON, pd: D2.P_MOON_DAYS, offset: 0.005, speed: 0.005,
    z0: 0.05, radius: 0.3, dwell: 0.9, preset: 'earthmoon', scenario: 'vertical'
  };
  const SCENARIOS = [
    { id: 'vertical', key: 'sc_vertical', st: { offset: 0.005, speed: 0.005, z0: 0.05 } },
    { id: 'plane', key: 'sc_plane', st: { offset: 0.005, speed: 0.005, z0: 0 } },
    { id: 'flip', key: 'sc_flip', st: { offset: 0.005, speed: 0.005, z0: 0.20 } },
    { id: 'escape', key: 'sc_escape', st: { offset: 0.005, speed: 0.2, z0: 0.05 } }
  ];

  const st = Object.assign({}, DEFAULTS);
  const CAM_VIEWS = {
    iso: { az: -1.15, el: 0.34, dist: 3.05, target: [0.10, 0, 0] },
    top: { az: -1.05, el: 1.42, dist: 3.25 },
    side: { az: -1.05, el: 0.05, dist: 2.85 }
  };

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const view = { inertial: false, autoSpin: !reduceMotion, surface: true, trail: true, grid: false };

  let renderer = null, scene = null, M = null;
  let tNow = 0, playing = false, lastHead = -1, lastHud = 0;
  let raf = 0, frames = 0, lastFrame = 0, fps = 0;
  const flipCache = new Map();

  /* ---------------- 小工具 ---------------- */
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach((k) => {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach((c) => n.appendChild(c));
    return n;
  }
  const fmtMu = (v) => (v < 1e-4 ? v.toExponential(2) : v.toFixed(5));

  /* ---------------- 模型 ---------------- */
  function findFlipZ(s, L) {
    const key = [s.mu, s.offset, s.speed, s.radius, s.dwell].join('|');
    if (flipCache.has(key)) return flipCache.get(key);
    const capAt = (z) => {
      const s0 = [L.L5.x + s.offset, L.L5.y, z, 0, -s.speed, 0];
      const run = A3.propagate3(s0, s.mu, { dt: 0.004, steps: 6000, sample: 20 });
      return A3.captureCheck3(run.traj, s.mu, { target: 'L5', r: s.radius, dwell: s.dwell }, L).captured;
    };
    let out = null;
    if (capAt(0)) {
      let z = 0.02, prev = 0;
      while (z <= 0.42) {
        if (!capAt(z)) { out = (prev + z) / 2; break; }
        prev = z; z += 0.02;
      }
    }
    flipCache.set(key, out);
    return out;
  }

  function buildModel(s) {
    const mu = s.mu, pd = s.pd;
    const L = A3.lagrange(mu), Cc = A3.criticalC(mu);
    const s0 = [L.L5.x + s.offset, L.L5.y, s.z0, 0, -s.speed, 0];
    const run = A3.propagate3(s0, mu, { dt: 0.002, steps: 12000, sample: 20 });
    const cap = A3.captureCheck3(run.traj, mu, { target: 'L5', r: s.radius, dwell: s.dwell }, L);
    const stab = A3.stability3(mu, pd);
    const C0 = A3.jacobi3(s0, mu);
    const gate = A3.gateHeight(L.L1.x, mu, C0);
    const vp = A3.verticalPeriod(run.traj, stab.tu2day);
    const flip = findFlipZ(s, L);
    return { mu, pd, L, Cc, run, cap, stab, C0, gate, vp, flip, s0, st: s, C4: 3 - mu + mu * mu };
  }

  function verdictKey(m) {
    if (m.run.stop === 'nonfinite') return 'v_nan';
    if (m.cap.captured) return 'v_hold';
    if (m.cap.escaped || m.run.stop === 'escape') return 'v_escape';
    if (m.cap.hitPrimary || m.run.stop === 'earth' || m.run.stop === 'moon') return 'v_impact';
    return 'v_no';
  }

  /* ---------------- 界面骨架 ---------------- */
  const dom = {};
  function buildShell() {
    const root = document.body;

    /* 顶栏 */
    const bar = el('header', { class: 'bar' }, [
      el('a', { class: 'brand', href: '../地月驿站L5-CR3BP平动点交互台/index.html' }, [
        el('span', { class: 'brand-mark', 'aria-hidden': 'true' }),
        el('span', { class: 'brand-txt' }, [
          el('b', { text: '地月驿站 L5' }),
          el('em', { text: t('brandSub') })
        ])
      ]),
      el('span', { class: 'bar-sep', 'aria-hidden': 'true' }),
      el('a', { class: 'bar-link', id: 'back', href: '../地月驿站L5-CR3BP平动点交互台/index.html', text: t('back') }),
      el('button', { class: 'lang', id: 'lang', type: 'button', text: lang === 'zh' ? 'EN' : '中文' })
    ]);
    dom.bar = bar;
    root.appendChild(bar);

    /* 画布 */
    dom.canvas = el('canvas', { id: 'gl', tabindex: '0', role: 'img', 'aria-label': t('canvasAria'), 'aria-describedby': 'hint' });
    root.appendChild(dom.canvas);
    dom.labels = el('div', { class: 'labels', id: 'labels', 'aria-hidden': 'true' });
    root.appendChild(dom.labels);

    /* 左面板：控制 */
    dom.panelL = el('aside', { class: 'panel left', id: 'panel-l', tabindex: '0', 'aria-label': t('paramHead') });
    root.appendChild(dom.panelL);

    /* 右面板：实测 */
    dom.panelR = el('aside', { class: 'panel right', id: 'panel-r', tabindex: '0', 'aria-label': t('metHead') });
    root.appendChild(dom.panelR);

    /* 图例 + 提示 + 无障碍播报 */
    dom.legend = el('div', { class: 'legend', id: 'legend' });
    root.appendChild(dom.legend);
    dom.hint = el('p', { class: 'hint', id: 'hint', text: t('hint') });
    root.appendChild(dom.hint);
    dom.live = el('p', { class: 'sr', id: 'live', 'aria-live': 'polite' });
    root.appendChild(dom.live);
    dom.loading = el('div', { class: 'loading', id: 'loading', text: t('loading') });
    root.appendChild(dom.loading);

    /* 窄屏抽屉按钮 */
    dom.drawers = el('div', { class: 'drawers' }, [
      el('button', { class: 'drawer-btn', type: 'button', 'data-panel': 'panel-l', text: t('drawerCtl') }),
      el('button', { class: 'drawer-btn', type: 'button', 'data-panel': 'panel-r', text: t('drawerMet') })
    ]);
    root.appendChild(dom.drawers);
    dom.drawers.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-panel');
        const open = document.getElementById(id).classList.toggle('open');
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  function buildControls() {
    const L = dom.panelL;
    L.innerHTML = '';

    /* 场景 */
    const g1 = el('section', { class: 'grp' }, [el('h3', { text: t('scenHead') })]);
    const chips = el('div', { class: 'chips' });
    dom.scenBtns = SCENARIOS.map((s) => {
      const b = el('button', {
        class: 'chip', type: 'button', 'aria-pressed': s.id === st.scenario ? 'true' : 'false', text: t(s.key)
      });
      b.addEventListener('click', () => applyScenario(s));
      chips.appendChild(b);
      return b;
    });
    g1.appendChild(chips);
    g1.appendChild(el('p', { class: 'small', text: t('scenNote') }));
    L.appendChild(g1);

    /* 系统 + 参数 */
    const g2 = el('section', { class: 'grp' }, [el('h3', { text: t('sysHead') })]);
    const sys = el('div', { class: 'chips' });
    dom.sysBtns = PRESETS.map((p) => {
      const b = el('button', {
        class: 'chip', type: 'button', 'aria-pressed': p.id === st.preset ? 'true' : 'false', text: t(p.key)
      });
      b.addEventListener('click', () => applyPreset(p));
      sys.appendChild(b);
      return b;
    });
    g2.appendChild(sys);
    dom.sysInfo = el('p', { class: 'small', text: '' });
    g2.appendChild(dom.sysInfo);
    L.appendChild(g2);

    const g3 = el('section', { class: 'grp' }, [el('h3', { text: t('paramHead') })]);
    dom.sliders = {};
    const mk = (key, stKey, min, max, stepv, fmtv) => {
      const row = el('label', { class: 'row' });
      row.appendChild(el('span', { class: 'row-l', text: t(key) }));
      const out = el('output', { class: 'readout', text: fmtv(st[stKey]) });
      const inp = el('input', {
        type: 'range', min: min, max: max, step: stepv, value: st[stKey],
        'aria-label': t(key), 'aria-valuetext': fmtv(st[stKey])
      });
      const apply = () => {
        st[stKey] = +inp.value;
        st.preset = 'custom';
        dom.sysBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        out.textContent = fmtv(st[stKey]);
        inp.setAttribute('aria-valuetext', fmtv(st[stKey]));
        scheduleRebuild();
      };
      inp.addEventListener('input', apply);
      row.appendChild(out);
      row.appendChild(inp);
      g3.appendChild(row);
      dom.sliders[stKey] = { inp, out, fmt: fmtv };
    };
    mk('sl_offset', 'offset', -0.15, 0.15, 0.005, (v) => v.toFixed(3));
    mk('sl_speed', 'speed', 0, 1.2, 0.001, (v) => v.toFixed(3));
    mk('sl_z0', 'z0', 0, 0.4, 0.005, (v) => v.toFixed(3));
    mk('sl_radius', 'radius', 0.05, 0.6, 0.01, (v) => v.toFixed(2));
    g3.appendChild(el('p', { class: 'small', text: t('paramNote') }));
    L.appendChild(g3);

    /* 回放 */
    const g4 = el('section', { class: 'grp' }, [el('h3', { text: t('playHead') })]);
    const btns = el('div', { class: 'chips' });
    dom.playBtn = el('button', { class: 'chip wide', type: 'button', id: 'play', text: '▶ ' + t('play') });
    dom.playBtn.addEventListener('click', () => (playing ? pause() : play()));
    const fireBtn = el('button', { class: 'chip', type: 'button', text: t('fire') });
    fireBtn.addEventListener('click', () => {
      st.speed = Math.round((st.speed + 0.005) * 1000) / 1000;
      if (st.speed > 1.2) st.speed = 0;
      st.preset = 'custom';
      dom.sysBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      syncSlider('speed');
      rebuild(true);
    });
    const resetBtn = el('button', { class: 'chip', type: 'button', text: t('reset') });
    resetBtn.addEventListener('click', () => resetAll());
    btns.appendChild(dom.playBtn); btns.appendChild(fireBtn); btns.appendChild(resetBtn);
    g4.appendChild(btns);
    const trow = el('label', { class: 'row' });
    trow.appendChild(el('span', { class: 'row-l', text: t('timeLabel') }));
    dom.timeOut = el('output', { class: 'readout', text: '0.0 / 24.0 TU' });
    dom.timeInp = el('input', {
      type: 'range', min: 0, max: 24, step: 0.02, value: 24, 'aria-label': t('timeLabel')
    });
    dom.timeInp.addEventListener('input', () => {
      playing = false; updatePlayBtn();
      tNow = +dom.timeInp.value;
      seek(tNow);
    });
    trow.appendChild(dom.timeOut);
    trow.appendChild(dom.timeInp);
    g4.appendChild(trow);
    L.appendChild(g4);

    /* 显示 */
    const g5 = el('section', { class: 'grp' }, [el('h3', { text: t('dispHead') })]);
    const tgGrid = el('div', { class: 'togglegrid' });
    dom.toggles = {};
    const tg = (key, get, set) => {
      const b = el('button', {
        class: 'toggle', type: 'button', 'aria-pressed': get() ? 'true' : 'false'
      }, [el('i', { 'aria-hidden': 'true' }), el('span', { text: t(key) })]);
      b.addEventListener('click', () => {
        set(!get());
        b.setAttribute('aria-pressed', get() ? 'true' : 'false');
      });
      tgGrid.appendChild(b);
      dom.toggles[key] = b;
    };
    tg('tg_surface', () => view.surface, (v) => { view.surface = v; });
    tg('tg_trail', () => view.trail, (v) => { view.trail = v; });
    tg('tg_grid', () => view.grid, (v) => { view.grid = v; });
    tg('tg_inertial', () => view.inertial, (v) => { view.inertial = v; });
    tg('tg_spin', () => view.autoSpin, (v) => { view.autoSpin = v; });
    g5.appendChild(tgGrid);
    L.appendChild(g5);

    /* 视角 */
    const g6 = el('section', { class: 'grp' }, [el('h3', { text: t('camHead') })]);
    const cam = el('div', { class: 'chips' });
    [['cam_iso', 'iso'], ['cam_top', 'top'], ['cam_side', 'side'], ['cam_station', 'station']].forEach(([k, id]) => {
      const b = el('button', { class: 'chip', type: 'button', text: t(k) });
      b.addEventListener('click', () => setCamera(id === 'station' ? stationView() : CAM_VIEWS[id]));
      cam.appendChild(b);
    });
    const rb = el('button', { class: 'chip', type: 'button', text: t('cam_reset') });
    rb.addEventListener('click', () => setCamera(CAM_VIEWS.iso));
    cam.appendChild(rb);
    g6.appendChild(cam);
    L.appendChild(g6);
  }

  function buildMetricsPanel() {
    const R = dom.panelR;
    R.innerHTML = '';
    const head = el('section', { class: 'grp verdict-box' });
    dom.verdict = el('div', { class: 'verdict' }, [
      el('span', { class: 'dot', 'aria-hidden': 'true' }),
      el('b', { text: '—' })
    ]);
    dom.verdictSub = el('p', { class: 'small', text: '' });
    head.appendChild(dom.verdict); head.appendChild(dom.verdictSub);
    R.appendChild(head);

    const g = el('section', { class: 'grp' }, [el('h3', { text: t('metHead') })]);
    const grid = el('div', { class: 'metrics' });
    dom.mRows = {};
    [['verdict', 'm_verdict'], ['dwell', 'm_dwell'], ['C', 'm_C'], ['C1', 'm_C1'],
      ['drift', 'm_drift'], ['wind', 'm_wind'], ['zamp', 'm_zamp'], ['zperiod', 'm_zperiod'],
      ['gate', 'm_gate'], ['flip', 'm_flip']].forEach(([k, key]) => {
      const cell = el('div', { class: 'metric' });
      cell.appendChild(el('span', { text: t(key) }));
      const b = el('b', { text: '—' });
      cell.appendChild(b);
      grid.appendChild(cell);
      dom.mRows[k] = b;
    });
    g.appendChild(grid);
    R.appendChild(g);

    const g2 = el('section', { class: 'grp' }, [el('h3', { text: t('insHead') })]);
    dom.ins = el('ul', { class: 'ins' });
    dom.ins1 = el('li', {});
    dom.ins2 = el('li', {});
    dom.ins3 = el('li', {});
    dom.ins.appendChild(dom.ins1); dom.ins.appendChild(dom.ins2); dom.ins.appendChild(dom.ins3);
    g2.appendChild(dom.ins);
    R.appendChild(g2);

    const g3 = el('section', { class: 'grp' }, [el('h3', { text: t('noteHead') })]);
    g3.appendChild(el('p', { class: 'small', text: t('noteBody') }));
    R.appendChild(g3);
  }

  function buildLegend() {
    dom.legend.innerHTML = '';
    const items = [
      ['#7fb2e0', t('lg_earth')],
      ['#d8d4cc', t('lg_moon')],
      ['#f2c26b', t('lg_L')],
      ['#8fd0a4', t('lg_trail')],
      ['#3f8f83', t('lg_zvs')],
      ['#d9b061', t('lg_gate')]
    ];
    items.forEach(([c, label]) => {
      const it = el('span', { class: 'lg' });
      it.appendChild(el('i', { 'aria-hidden': 'true', style: 'background:' + c }));
      it.appendChild(el('span', { text: label }));
      dom.legend.appendChild(it);
    });
  }

  /* ---------------- 交互 ---------------- */
  let rebuildTimer = 0;
  function scheduleRebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => rebuild(true), 110);
  }

  function syncSlider(k) {
    const s = dom.sliders[k];
    if (!s) return;
    s.inp.value = st[k];
    s.out.textContent = s.fmt(st[k]);
    s.inp.setAttribute('aria-valuetext', s.fmt(st[k]));
  }

  function applyScenario(sc) {
    Object.assign(st, sc.st);
    st.scenario = sc.id;
    SCENARIOS.forEach((s, i) => dom.scenBtns[i].setAttribute('aria-pressed', s.id === sc.id ? 'true' : 'false'));
    ['offset', 'speed', 'z0', 'radius'].forEach(syncSlider);
    view.inertial = false;
    updateToggle('tg_inertial', view.inertial);
    rebuild(true);
  }

  function applyPreset(p) {
    st.preset = p.id; st.mu = p.mu; st.pd = p.pd;
    PRESETS.forEach((q, i) => dom.sysBtns[i].setAttribute('aria-pressed', q.id === p.id ? 'true' : 'false'));
    rebuild(true);
  }

  function resetAll() {
    Object.assign(st, DEFAULTS);
    SCENARIOS.forEach((s, i) => dom.scenBtns[i].setAttribute('aria-pressed', s.id === DEFAULTS.scenario ? 'true' : 'false'));
    PRESETS.forEach((p, i) => dom.sysBtns[i].setAttribute('aria-pressed', p.id === DEFAULTS.preset ? 'true' : 'false'));
    ['offset', 'speed', 'z0', 'radius'].forEach(syncSlider);
    setCamera(CAM_VIEWS.iso);
    view.inertial = false;
    updateToggle('tg_inertial', view.inertial);
    rebuild(true);
  }

  function updateToggle(key, on) {
    const b = dom.toggles[key];
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function setCamera(v) {
    if (!renderer || !v || typeof v.az !== 'number' || typeof v.el !== 'number' || typeof v.dist !== 'number') return;
    const c = renderer.cam;
    c.az = v.az; c.el = v.el; c.dist = v.dist;
    c.target = v.target ? v.target.slice() : [0, 0, 0];
  }

  /* 驿站特写：把相机目标从质心移到 L5，看站体与绕站天平动 */
  function stationView() {
    const L = M ? M.L : A3.lagrange(st.mu);
    return { az: -1.28, el: 0.26, dist: 0.72, target: [L.L5.x, L.L5.y, 0] };
  }

  function play() {
    if (!M) return;
    if (tNow >= M.run.t - 1e-9) tNow = 0;
    playing = true; updatePlayBtn();
  }
  function pause() { playing = false; updatePlayBtn(); }
  function updatePlayBtn() {
    if (dom.playBtn) dom.playBtn.textContent = (playing ? '❚❚ ' : '▶ ') + t(playing ? 'pause' : 'play');
  }

  /* ---------------- 重建与上屏 ---------------- */
  function rebuild(autoplay) {
    if (!scene) return;
    M = buildModel(st);
    scene.setModel(M);
    tNow = M.run.t;
    updateLabelText();
    lastHead = -1;
    seek(tNow);
    updateMetrics();
    updateSysInfo();
    updateInsights();
    if (autoplay) play();
  }

  function seek(tv) {
    if (!M) return;
    const n = M.run.traj.length;
    const k = Math.max(2, Math.round((tv / Math.max(1e-9, M.run.t)) * (n - 1)) + 1);
    if (k !== lastHead) { scene.setHead(k); lastHead = k; }
    const days = tv * M.stab.tu2day;
    dom.timeOut.textContent = tv.toFixed(1) + ' / ' + M.run.t.toFixed(1) + ' TU · ' + days.toFixed(1) + ' d';
    if (dom.timeInp) dom.timeInp.value = tv.toFixed(2);
  }

  function updateSysInfo() {
    if (!dom.sysInfo) return;
    if (st.preset === 'equal') {
      dom.sysInfo.textContent = lang === 'zh'
        ? 'μ = 0.5 · 等质量：时间以 TU 归一，周期 2π TU'
        : 'μ = 0.5 · equal masses: time in TU, period 2π TU';
      return;
    }
    dom.sysInfo.textContent = t('sysInfo', { mu: fmtMu(st.mu), pd: st.pd.toFixed(2) });
  }

  function updateMetrics() {
    if (!M) return;
    const m = M, vk = verdictKey(m);
    const ok = vk === 'v_hold';
    dom.verdict.className = 'verdict ' + (ok ? 'ok' : 'bad');
    dom.verdict.querySelector('b').textContent = t(vk);
    dom.verdictSub.textContent = lang === 'zh'
      ? '目标 L5 · 判据：未撞击 / 未逃逸 / 驻留 ≥ ' + (m.st.dwell * 100).toFixed(0) + '%'
      : 'Target L5 · criteria: no impact / no escape / dwell ≥ ' + (m.st.dwell * 100).toFixed(0) + '%';

    const rows = dom.mRows;
    rows.verdict.textContent = t(vk);
    rows.verdict.className = ok ? 'ok' : 'bad';
    rows.dwell.textContent = (m.cap.dwellFrac * 100).toFixed(1) + '%';
    rows.C.textContent = m.C0.toFixed(4);
    rows.C1.textContent = m.Cc.L1.toFixed(4);
    rows.drift.textContent = m.run.drift.toExponential(1);
    rows.wind.textContent = m.cap.winding.toFixed(2);
    rows.zamp.textContent = m.cap.zAmp.toFixed(3) + ' D';
    rows.zperiod.textContent = m.vp ? m.vp.periodDays.toFixed(2) + ' d' : '—';
    rows.gate.textContent = m.gate.toFixed(3) + ' D';
    rows.flip.textContent = m.flip ? '≈' + m.flip.toFixed(2) + ' D' : '—';

    dom.live.textContent = t('liveFmt', {
      v: t(vk), d: (m.cap.dwellFrac * 100).toFixed(1), z: m.cap.zAmp.toFixed(3)
    });
  }

  function updateInsights() {
    if (!M) return;
    const m = M;
    dom.ins1.textContent = t('ins1');
    dom.ins2.textContent = t('ins2', {
      gate: m.gate.toFixed(3), km: (m.gate * D_KM / 10000).toFixed(1)
    });
    dom.ins3.textContent = m.flip ? t('ins3', { flip: m.flip.toFixed(2) }) : t('ins3na');
  }

  /* ---------------- 标签（HTML 覆盖层） ---------------- */
  const LABELS = ['earth', 'moon', 'L1', 'L2', 'L3', 'L4', 'L5', 'station', 'gate', 'zvs'];
  const LABEL_OFF = {
    station: [-10, -42], gate: [-58, 20], zvs: [10, -6], earth: [0, 15], moon: [-10, 14],
    L1: [-16, 16], L4: [12, -10], L2: [10, -12]
  };
  function buildLabels() {
    dom.labels.innerHTML = '';
    dom.labelEls = {};
    LABELS.forEach((id) => {
      const n = el('span', { class: 'lbl lbl-' + id, text: '' });
      dom.labels.appendChild(n);
      dom.labelEls[id] = n;
    });
    updateLabelText();
  }
  function updateLabelText() {
    if (!dom.labelEls) return;
    dom.labelEls.earth.textContent = t('lg_earth');
    dom.labelEls.moon.textContent = t('lg_moon');
    ['L1', 'L2', 'L3', 'L4', 'L5'].forEach((k) => { dom.labelEls[k].textContent = k; });
    dom.labelEls.station.textContent = t('station');
    dom.labelEls.zvs.textContent = t('zvsLbl');
    dom.labelEls.gate.textContent = t('gateLbl', { v: M ? M.gate.toFixed(3) : '—' });
  }

  function placeLabels() {
    if (!scene || !dom.labelEls) return;
    const list = scene.anchors();
    const seen = {};
    list.forEach((a) => {
      const n = dom.labelEls[a.id];
      if (!n) return;
      const p = renderer.project(a.pos);
      seen[a.id] = 1;
      if (!p.ok || p.x < -40 || p.y < -40 || p.x > renderer.size.w + 60 || p.y > renderer.size.h + 60) {
        n.style.opacity = '0';
        return;
      }
      n.style.opacity = '1';
      const off = LABEL_OFF[a.id] || [0, 0];
      n.style.transform = 'translate(-50%,-50%) translate(' + (p.x + off[0]).toFixed(1) + 'px,' + (p.y + off[1]).toFixed(1) + 'px)';
    });
    Object.keys(dom.labelEls).forEach((k) => {
      if (!seen[k]) dom.labelEls[k].style.opacity = '0';
    });
  }

  /* ---------------- 相机输入 ---------------- */
  function bindCanvas() {
    const c = dom.canvas;
    const pts = new Map();
    let pinned = 0;

    c.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      c.setPointerCapture(e.pointerId);
      c.focus();
      if (pts.size === 1) pinned = 0;
      c.classList.add('grabbing');
    });
    c.addEventListener('pointermove', (e) => {
      const prev = pts.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        const arr = [...pts.values()];
        const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
        if (pinned) {
          renderer.cam.dist = Math.min(6.5, Math.max(1.4, renderer.cam.dist * (pinned / d)));
        }
        pinned = d;
        return;
      }
      renderer.cam.az -= dx * 0.006;
      renderer.cam.el = Math.max(-1.45, Math.min(1.45, renderer.cam.el + dy * 0.005));
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinned = 0;
      if (!pts.size) c.classList.remove('grabbing');
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      renderer.cam.dist = Math.min(6.5, Math.max(1.4, renderer.cam.dist * Math.exp(e.deltaY * 0.0011)));
    }, { passive: false });
    c.addEventListener('dblclick', () => setCamera(CAM_VIEWS.iso));
    c.addEventListener('keydown', (e) => {
      const k = e.key;
      const cam = renderer.cam;
      if (k === 'ArrowLeft') { cam.az -= 0.09; e.preventDefault(); }
      else if (k === 'ArrowRight') { cam.az += 0.09; e.preventDefault(); }
      else if (k === 'ArrowUp') { cam.el = Math.min(1.45, cam.el + 0.07); e.preventDefault(); }
      else if (k === 'ArrowDown') { cam.el = Math.max(-1.45, cam.el - 0.07); e.preventDefault(); }
      else if (k === '+' || k === '=') { cam.dist = Math.max(1.4, cam.dist * 0.92); e.preventDefault(); }
      else if (k === '-' || k === '_') { cam.dist = Math.min(6.5, cam.dist * 1.08); e.preventDefault(); }
      else if (k === '0') { setCamera(CAM_VIEWS.iso); e.preventDefault(); }
      else if (k === ' ') { (playing ? pause() : play()); e.preventDefault(); }
    });
  }

  /* ---------------- 主循环 ---------------- */
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = lastFrame ? Math.min(0.1, (ts - lastFrame) / 1000) : 0.016;
    lastFrame = ts;
    frames++;
    if (frames % 20 === 0) fps = Math.round(1 / Math.max(1e-3, dt));

    if (view.autoSpin) renderer.cam.az += dt * 0.05;

    if (playing && M) {
      tNow = Math.min(M.run.t, tNow + dt * 2.4);
      if (tNow >= M.run.t - 1e-9) { playing = false; updatePlayBtn(); }
      seek(tNow);
      if (ts - lastHud > 120) { lastHud = ts; updateMetrics(); }
    }

    const theta = view.inertial ? (tNow % (2 * Math.PI)) : 0;
    const W = window.GL3D.M4.rotZ(-theta);
    renderer.begin();
    scene.state.showSurface = view.surface;
    scene.state.showTrail = view.trail;
    scene.state.showGrid = view.grid;
    scene.draw({ world: W, spin: ts * 0.00004 });
    placeLabels();
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    buildShell();
    buildControls();
    buildMetricsPanel();
    buildLegend();
    buildLabels();
    bindCanvas();
    dom.langBtn = document.getElementById('lang');
    dom.langBtn.addEventListener('click', () => setLang(lang === 'zh' ? 'en' : 'zh'));
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

    try {
      renderer = window.GL3D.createRenderer(dom.canvas);
    } catch (e) {
      dom.loading.textContent = t('webglFail');
      dom.loading.classList.add('fail');
      console.error(e);
      return;
    }
    scene = SC.create(renderer, null);
    setCamera(CAM_VIEWS.iso);
    document.body.classList.add('ready');
    dom.loading.remove();

    /* 首帧：先给一个完整轨迹，再交给 rAF */
    rebuild(false);
    playing = false;
    updatePlayBtn();
    window.addEventListener('resize', () => { /* resize 在 begin() 里按 clientWidth 处理 */ });
    raf = requestAnimationFrame(frame);

    /* 自动化接口：截图 / 端到端断言都走这里，不模拟鼠标 */
    window.__demo3d = {
      version: '1.0.0',
      list: () => ['cover', 'scenarios', 'controls', 'metrics'],
      state: () => JSON.parse(JSON.stringify({
        st, view, cam: renderer.cam, tNow, playing, lang
      })),
      metrics: () => (M ? {
        verdict: verdictKey(M), captured: M.cap.captured, dwell: M.cap.dwellFrac,
        C0: M.C0, C1: M.Cc.L1, drift: M.run.drift, winding: M.cap.winding,
        zAmp: M.cap.zAmp, gate: M.gate, flip: M.flip,
        zPeriodDays: M.vp ? M.vp.periodDays : null,
        trajPoints: M.run.traj.length, tEnd: M.run.t
      } : null),
      set(o) {
        o = o || {};
        if (o.scenario) {
          const sc = SCENARIOS.find((s) => s.id === o.scenario);
          if (sc) applyScenario(sc);
        }
        if (o.preset) {
          const p = PRESETS.find((q) => q.id === o.preset);
          if (p) applyPreset(p);
        }
        let dirty = false;
        ['offset', 'speed', 'z0', 'radius'].forEach((k) => {
          if (o[k] != null) { st[k] = +o[k]; syncSlider(k); dirty = true; }
        });
        if (dirty) rebuild(o.play === true);
        if (o.lang && o.lang !== lang) setLang(o.lang);
        if (o.inertial != null) { view.inertial = !!o.inertial; updateToggle('tg_inertial', view.inertial); }
        if (o.surface != null) { view.surface = !!o.surface; updateToggle('tg_surface', view.surface); }
        if (o.trail != null) { view.trail = !!o.trail; updateToggle('tg_trail', view.trail); }
        if (o.spin != null) { view.autoSpin = !!o.spin; updateToggle('tg_spin', view.autoSpin); }
        if (o.camera) setCamera(o.camera === 'station' ? stationView() : (CAM_VIEWS[o.camera] || o.camera));
        if (o.seek != null) { playing = false; tNow = +o.seek; seek(tNow); }
        if (o.play === true) play();
        if (o.play === false) pause();
        return true;
      },
      project: (pt) => renderer.project(pt),
      reset: () => resetAll(),
      play: () => play(),
      pause: () => pause(),
      stats: () => ({ frames, fps, drawFrames: frames, glLost: renderer.gl.isContextLost() })
    };
  }

  function setLang(next) {
    lang = next;
    try { localStorage.setItem('l5-3d-lang', lang); } catch (e) { /* 隐私模式忽略 */ }
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    if (dom.langBtn) dom.langBtn.textContent = lang === 'zh' ? 'EN' : '中文';
    refreshTexts();
  }

  function refreshTexts() {
    /* 语言切换：重建控件与指标，不重算模型 */
    buildControls();
    buildMetricsPanel();
    buildLegend();
    buildLabels();
    updatePlayBtn();
    document.getElementById('back').textContent = t('back');
    document.querySelector('.brand-txt em').textContent = t('brandSub');
    dom.hint.textContent = t('hint');
    dom.canvas.setAttribute('aria-label', t('canvasAria'));
    dom.drawers.querySelectorAll('button').forEach((b) => {
      b.textContent = b.getAttribute('data-panel') === 'panel-l' ? t('drawerCtl') : t('drawerMet');
    });
    if (M) { updateMetrics(); updateSysInfo(); updateInsights(); }
    updateLabelText();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
