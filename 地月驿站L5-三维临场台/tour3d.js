/* tour3d.js —— 评委导览：5 站自动运镜 + 字幕（不改变默认交互，随时可退出）
   只依赖 window.__demo3d 的公开接口，不改内核与渲染层。 */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MU = 0.0121439878;
  var L5 = { x: 0.5 - MU, y: -Math.sqrt(3) / 2 };

  var CAM = {
    iso: { az: -1.15, el: 0.34, dist: 3.05, target: [0.10, 0, 0] },
    side: { az: -1.05, el: 0.05, dist: 2.85, target: [0.10, 0, 0] },
    top: { az: -1.05, el: 1.42, dist: 3.25, target: [0.10, 0, 0] },
    station: { az: -1.28, el: 0.26, dist: 0.72, target: [L5.x, L5.y, 0] }
  };

  var STOPS = [
    {
      cam: CAM.iso,
      zh: '五个平动点：L4 / L5 与地球、月球构成等边三角形',
      en: 'Five libration points; L4 / L5 form equilateral triangles with Earth and Moon'
    },
    {
      cam: CAM.side,
      zh: '零速度面是一张带洞的穹顶：L1 门洞净高 0.562 D ≈ 21.6 万 km',
      en: 'The zero-velocity surface is a dome with gates; the L1 gate is 0.562 D ≈ 216,000 km'
    },
    {
      cam: CAM.station,
      zh: 'L5 站体：面外振幅 0.05 D，垂直模周期 27.31 天（与质量比无关）',
      en: 'Station at L5: out-of-plane amplitude 0.05 D, vertical period 27.31 d (independent of mu)'
    },
    {
      cam: CAM.top,
      zh: 'z₀ = 0 时，三维判定与二维逐项一致——这不是巧合，是一条断言',
      en: 'At z0 = 0 the 3D verdict matches the 2D one point by point — an assertion, not a coincidence'
    },
    {
      cam: CAM.iso,
      z0: 0.20,
      zh: '把 z₀ 抬到 0.20：驻留跌破阈值，判定当场翻面',
      en: 'Raise z0 to 0.20: dwell falls below the threshold and the verdict flips'
    }
  ];

  var TWEEN = reduce ? 0 : 1400;
  var HOLD = reduce ? 4200 : 4600;

  var api = null, btn = null, box = null, capZh = null, capEn = null, dots = [];
  var on = false, idx = 0, timer = 0, raf = 0, token = 0;

  function $(id) { return document.getElementById(id); }
  function isZh() {
    try { return (document.documentElement.lang || 'zh').indexOf('zh') === 0; } catch (e) { return true; }
  }

  function injectStyle() {
    var css = [
      '.tour-btn{margin-left:10px;font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;',
      'color:var(--accent-3);background:rgba(217,176,97,.10);border:1px solid rgba(217,176,97,.45);',
      'border-radius:999px;padding:5px 12px;cursor:pointer;transition:color .16s,border-color .16s,background .16s}',
      '.tour-btn:hover{color:var(--txt);border-color:var(--accent-3);background:rgba(217,176,97,.18)}',
      '.tour-btn[aria-pressed="true"]{color:#1a1206;background:var(--accent-3)}',
      '.tour{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:30;',
      'width:min(760px,calc(100vw - 2*var(--gutter,32px)));padding:14px 18px 12px;',
      'background:rgba(13,15,18,.86);border:1px solid rgba(255,255,255,.14);border-radius:14px;',
      'backdrop-filter:blur(8px);box-shadow:0 18px 44px rgba(0,0,0,.45);text-align:center}',
      '.tour[hidden]{display:none}',
      '.tour-cap{margin:0;font-size:15px;line-height:1.6;color:var(--txt,#f0ece4)}',
      '.tour-en{margin:4px 0 0;font-family:var(--mono);font-size:11.5px;line-height:1.5;color:var(--txt-faint,#8a8579);letter-spacing:.02em}',
      '.tour-dots{display:flex;gap:6px;justify-content:center;margin-top:10px}',
      '.tour-dots i{width:18px;height:3px;border-radius:2px;background:rgba(255,255,255,.18);transition:background .2s}',
      '.tour-dots i.on{background:var(--accent-3,#d9b061)}',
      '@media (prefers-reduced-motion:reduce){.tour,.tour-btn{transition:none}}',
      '@media (max-width:820px){.tour{bottom:118px;padding:12px 14px 10px}.tour-cap{font-size:13.5px}.tour-en{font-size:10.5px}}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'tour-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function buildChrome() {
    btn = document.createElement('button');
    btn.className = 'tour-btn';
    btn.type = 'button';
    btn.id = 'tour-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = '▶ 导览';
    var bar = document.querySelector('header.bar');
    var lang = $('lang');
    if (bar) bar.insertBefore(btn, lang || null);
    btn.addEventListener('click', function () { on ? stop() : start(); });

    box = document.createElement('div');
    box.className = 'tour';
    box.hidden = true;
    box.setAttribute('role', 'status');
    box.innerHTML = '<p class="tour-cap"></p><p class="tour-en"></p><div class="tour-dots"></div>';
    document.body.appendChild(box);
    capZh = box.querySelector('.tour-cap');
    capEn = box.querySelector('.tour-en');
    var d = box.querySelector('.tour-dots');
    STOPS.forEach(function () { var i = document.createElement('i'); d.appendChild(i); dots.push(i); });
  }

  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

  function tweenCam(to, done) {
    var from = api.state().cam;
    var a0 = from.az, t0 = (from.target || [0, 0, 0]).slice();
    var a1 = to.az, t1 = (to.target || [0, 0, 0]).slice();
    var d = (a1 - a0) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    if (!TWEEN) { api.set({ camera: to }); done && done(); return; }
    var my = ++token, start = performance.now();
    (function step(now) {
      if (my !== token) return;
      var k = Math.min(1, (now - start) / TWEEN), e = ease(k);
      api.set({
        camera: {
          az: a0 + d * e,
          el: from.el + (to.el - from.el) * e,
          dist: from.dist + (to.dist - from.dist) * e,
          target: [
            t0[0] + (t1[0] - t0[0]) * e,
            t0[1] + (t1[1] - t0[1]) * e,
            t0[2] + (t1[2] - t0[2]) * e
          ]
        }
      });
      if (k < 1) raf = requestAnimationFrame(step);
      else done && done();
    })(start);
  }

  function show(i) {
    idx = i;
    var s = STOPS[i];
    if (s.z0 != null) api.set({ z0: s.z0, play: false });
    capZh.textContent = s.zh;
    capEn.textContent = s.en;
    dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    tweenCam(s.cam, function () {
      if (!on) return;
      timer = setTimeout(function () { i + 1 < STOPS.length ? show(i + 1) : finish(); }, HOLD);
    });
  }

  function start() {
    if (!api) return;
    on = true;
    token++;
    btn.setAttribute('aria-pressed', 'true');
    btn.textContent = isZh() ? '■ 退出导览' : '■ Exit tour';
    box.hidden = false;
    api.set({ scenario: 'vertical', z0: 0.05, play: false, spin: false, surface: true, trail: true, seek: 24 });
    setTimeout(function () { if (on) show(0); }, 260);
  }

  function finish() {
    stop(true);
    api.set({ z0: 0.05, seek: 24, camera: CAM.iso });
  }

  function stop(done) {
    on = false;
    token++;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    if (box) box.hidden = true;
    if (btn && !done) {
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = isZh() ? '▶ 导览' : '▶ Tour';
    }
    if (done && btn) {
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = isZh() ? '▶ 导览' : '▶ Tour';
    }
  }

  function bindExit() {
    var canvas = $('gl');
    ['pointerdown', 'wheel', 'touchstart'].forEach(function (ev) {
      (canvas || document).addEventListener(ev, function () { if (on) stop(); }, { passive: true });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && on) stop();
    });
  }

  function boot() {
    injectStyle();
    buildChrome();
    bindExit();
    var tries = 0;
    (function wait() {
      if (window.__demo3d) { api = window.__demo3d; return; }
      if (tries++ > 100) return;
      setTimeout(wait, 100);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
