/* ============================================================
   app.js —— 数据驱动渲染器（无框架、离线、可被自动化脚本驱动）
   依赖：core.js / content.js / sim.js
   对外（供录屏与截图脚本使用）：
     window.__demo.go(id)      跳到某个模块并返回是否成功
     window.__demo.lang(l)     切换语言 'zh'|'en'
     window.__demo.set(state)  调用当前交互模块的预设状态
     window.__demo.list()      列出模块 id 与场景
   ============================================================ */
(function () {
  'use strict';

  const C = window.CONTENT;
  const S = window.SIM || {};
  const K = window.Core;
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------------- i18n ---------------- */
  /* 引擎默认词条（通用）+ content.js 的项目级补充词条（按语言浅合并）。
     注意不能整表 Object.assign 到 {zh,en} 上：那会把默认词条整组替换掉。 */
  const DEFAULT_I18N = {
    zh: {
      nav_aria: '章节导航', skip: '跳到正文', lang_btn: 'EN', lang_aria: '切换语言：English',
      scroll: '向下滚动', count: '条', search: '检索术语 / 关键词', nohit: '没有匹配的术语',
      play: '播放', pause: '暂停', reset: '重置', next: '下一步',
      fig: '图', note: '说明', sources: '来源与披露',
      sim_missing: '[sim: {id}] 未注册', sim_error: '交互模块初始化失败：{msg}'
    },
    en: {
      nav_aria: 'Sections', skip: 'Skip to content', lang_btn: 'ZH', lang_aria: 'Switch language: Chinese',
      scroll: 'Scroll', count: 'items', search: 'Search terms / keywords', nohit: 'No matching term',
      play: 'Play', pause: 'Pause', reset: 'Reset', next: 'Next',
      fig: 'Fig.', note: 'Note', sources: 'Sources & disclosure',
      sim_missing: '[sim: {id}] not registered', sim_error: 'Interactive module failed to initialise: {msg}'
    }
  };
  const UI_I18N = C.i18n || {};
  const I18N = {
    zh: Object.assign({}, DEFAULT_I18N.zh, UI_I18N.zh || {}),
    en: Object.assign({}, DEFAULT_I18N.en, UI_I18N.en || {})
  };
  const state = { lang: 'zh' };
  const T = (k) => (I18N[state.lang] && I18N[state.lang][k]) || I18N.zh[k] || k;
  const pick = (o) => {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    return o[state.lang] != null ? o[state.lang] : (o.zh != null ? o.zh : '');
  };

  /* ---------------- DOM helpers ---------------- */
  function h(tag, attrs, kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.setAttribute('style', v);
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    if (kids != null) (Array.isArray(kids) ? kids : [kids]).forEach((c) => {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  const svg = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };

  /* ---------------- 画布工具（供 sim.js 使用） ---------------- */
  const Art = {
    fit(canvas, ratio) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth || canvas.parentElement.clientWidth || 900;
      const hgt = Math.round(w * (ratio || 0.56));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(hgt * dpr);
      canvas.style.height = hgt + 'px';
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h: hgt };
    },
    palette() {
      const st = getComputedStyle(document.documentElement);
      const g = (n, f) => (st.getPropertyValue(n) || f).trim();
      return {
        ink: g('--ink', '#0d0f12'), ink2: g('--ink-2', '#14171c'), ink3: g('--ink-3', '#1b1f26'),
        paper: g('--paper', '#f3eee4'), txt: g('--txt', '#f0ece4'), dim: g('--txt-dim', '#b9b3a7'),
        faint: g('--txt-faint', '#8a8579'), a1: g('--accent', '#c9622f'),
        a2: g('--accent-2', '#4f8f7f'), a3: g('--accent-3', '#d9b061')
      };
    },
    /* 通用备选视觉：以 seed 决定的"墨场"（没有自定义 art 时使用） */
    fallback(seed) {
      const nz = K.noise2(seed);
      return function (ctx, w, hh, t) {
        const P = Art.palette();
        ctx.clearRect(0, 0, w, hh);
        const g = ctx.createLinearGradient(0, 0, w, hh);
        g.addColorStop(0, P.ink); g.addColorStop(1, P.ink2);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, hh);
        for (let i = 0; i < 60; i++) {
          const y = (i / 60) * hh;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 8) {
            const v = nz(x / 140 + i * 0.02, i * 0.06 + t * 0.00018);
            const yy = y + (v - 0.5) * 26 * Math.sin((x / w) * Math.PI);
            x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
          }
          ctx.strokeStyle = i % 7 === 0 ? P.a1 : 'rgba(240,236,228,.10)';
          ctx.lineWidth = i % 7 === 0 ? 1.1 : 0.7;
          ctx.stroke();
        }
        const r = K.rng(seed);
        for (let i = 0; i < 90; i++) {
          const x = r() * w, y = r() * hh, rad = r() * 1.8 + 0.3;
          ctx.beginPath(); ctx.arc(x, y, rad, 0, 7);
          ctx.fillStyle = 'rgba(217,176,97,' + (0.10 + r() * 0.35) + ')'; ctx.fill();
        }
      };
    }
  };

  /* 供 sim.js 使用的画布/配色快捷入口 */
  window.__fit = Art.fit;
  window.__palette = Art.palette;

  /* ---------------- 释放登记（切语言重建前统一释放） ----------------
     旧版问题：封面动画 rAF 无限自循环且从不 cancel，每次 applyLang() 重建都 +1 条；
     ResizeObserver 也从不断开。下面把所有"重建后必须释放"的句柄集中登记。 */
  const disposers = [];
  function addDisposer(fn) { if (typeof fn === 'function') disposers.push(fn); }
  function disposeAll() {
    while (disposers.length) {
      const fn = disposers.pop();
      try { fn(); } catch (e) { console.error('dispose 失败', e); }
    }
  }

  /* ---------------- 模块渲染 ---------------- */
  const renderers = {};

  renderers.cover = (m) => {
    const sec = h('section', { class: 'mod cover', id: 'm_' + m.id, 'data-scene': 'cover' });
    const artWrap = h('div', { class: 'cover-art' });
    const cv = h('canvas', { 'aria-hidden': 'true' });
    artWrap.appendChild(cv); sec.appendChild(artWrap);
    const inner = h('div', { class: 'cover-in' });
    inner.appendChild(h('p', { class: 'eyebrow', text: pick(m.eyebrow) }));
    inner.appendChild(h('h1', { text: pick(m.title) }));
    inner.appendChild(h('span', { class: 'en', text: pick(m.titleEn) }));
    if (m.lead) inner.appendChild(h('p', { class: 'lead', text: pick(m.lead) }));
    if (m.tags) {
      const tw = h('div', { class: 'cover-tags' });
      m.tags.forEach((t) => tw.appendChild(h('span', { class: 'tag', text: pick(t) })));
      inner.appendChild(tw);
    }
    inner.appendChild(h('p', { class: 'scroll-hint', text: T('scroll') + ' ↓' }));
    sec.appendChild(inner);

    const draw = (S.art && S.art.cover) || Art.fallback(K.hash(m.id + 'cover'));
    const paint = (t) => { const { ctx, w, h: hh } = Art.fit(cv, 0.5); draw(ctx, w, hh, t || 0); };
    const ro = new ResizeObserver(() => paint(0)); ro.observe(cv);
    const rafOnce = requestAnimationFrame(() => paint(0));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    if (!reduce) {
      /* 单条动画链；句柄登记后由 disposeAll() 在重建前 cancel —— 不再"切一次语言 +1 条" */
      let t0 = null;
      const loop = (ts) => { if (t0 == null) t0 = ts; paint(ts - t0); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
    addDisposer(() => { cancelAnimationFrame(raf); cancelAnimationFrame(rafOnce); ro.disconnect(); });
    return sec;
  };

  renderers.prose = (m) => {
    const sec = h('section', { class: 'mod', id: 'm_' + m.id, 'data-scene': m.id });
    const head = h('div', { class: 'mod-head' });
    if (m.eyebrow) head.appendChild(h('p', { class: 'eyebrow', text: pick(m.eyebrow) }));
    head.appendChild(h('h2', { text: pick(m.title) }));
    if (m.lead) head.appendChild(h('p', { class: 'lead', text: pick(m.lead) }));
    sec.appendChild(head);
    if (m.kv) {
      const kv = h('div', { class: 'kv' });
      m.kv.forEach((x) => kv.appendChild(h('div', null, [h('b', { text: pick(x.v) }), h('span', { text: pick(x.k) })])));
      sec.appendChild(kv);
    }
    const wrap = h('div', { class: m.cols ? 'cols' : '' });
    const paras = m.text ? pick(m.text) : [];
    if (m.cols && Array.isArray(m.cols)) {
      m.cols.forEach((c) => {
        const p = h('div', { class: 'panel' });
        if (c.title) p.appendChild(h('h3', { text: pick(c.title) }));
        (pick(c.text) || []).forEach((x) => p.appendChild(h('p', { text: x })));
        wrap.appendChild(p);
      });
    } else {
      (paras || []).forEach((x) => wrap.appendChild(h('p', { text: x })));
    }
    sec.appendChild(wrap);
    if (m.quote) {
      const q = h('blockquote', null, [pick(m.quote.text)]);
      if (m.quote.cite) q.appendChild(h('cite', { text: pick(m.quote.cite) }));
      sec.appendChild(q);
    }
    if (m.gallery) sec.appendChild(galleryEl(m.gallery));
    return sec;
  };

  function galleryEl(items) {
    const g = h('div', { class: 'gal' });
    items.forEach((it, i) => {
      const fig = h('figure', { class: 'card', 'data-scene': 'card' });
      const cv = h('canvas', { role: 'img', 'aria-label': pick(it.title) });
      fig.appendChild(cv);
      const cap = h('figcaption');
      cap.appendChild(h('b', { text: pick(it.title) }));
      if (it.caption) cap.appendChild(document.createTextNode(pick(it.caption)));
      fig.appendChild(cap);
      g.appendChild(fig);
      const draw = (S.art && S.art.card && it.art) ? (ctx, w, hh) => S.art.card(it.art, ctx, w, hh, i) : Art.fallback(K.hash((it.art || it.title && pick(it.title)) + i));
      const paint = () => { const { ctx, w, h: hh } = Art.fit(cv, 0.75); draw(ctx, w, hh); };
      const ro = new ResizeObserver(paint); ro.observe(cv);
      requestAnimationFrame(paint);
      addDisposer(() => ro.disconnect());
    });
    return g;
  }

  renderers.timeline = (m) => {
    const sec = h('section', { class: 'mod', id: 'm_' + m.id, 'data-scene': m.id });
    const head = h('div', { class: 'mod-head' });
    if (m.eyebrow) head.appendChild(h('p', { class: 'eyebrow', text: pick(m.eyebrow) }));
    head.appendChild(h('h2', { text: pick(m.title) }));
    if (m.lead) head.appendChild(h('p', { class: 'lead', text: pick(m.lead) }));
    sec.appendChild(head);
    const ol = h('ol', { class: 'tl' });
    (m.items || []).forEach((it) => {
      const li = h('li', null, [h('span', { class: 'k', text: pick(it.k) }), h('strong', { text: pick(it.title) }), h('p', { text: pick(it.text) })]);
      ol.appendChild(li);
    });
    sec.appendChild(ol);
    return sec;
  };

  renderers.gallery = (m) => {
    const sec = h('section', { class: 'mod', id: 'm_' + m.id, 'data-scene': m.id });
    const head = h('div', { class: 'mod-head' });
    if (m.eyebrow) head.appendChild(h('p', { class: 'eyebrow', text: pick(m.eyebrow) }));
    head.appendChild(h('h2', { text: pick(m.title) }));
    if (m.lead) head.appendChild(h('p', { class: 'lead', text: pick(m.lead) }));
    sec.appendChild(head);
    sec.appendChild(galleryEl(m.items || []));
    return sec;
  };

  /* 交互台：由 sim.js 的 mount 负责全部内部 DOM */
  renderers.sim = (m) => {
    const sec = h('section', { class: 'mod', id: 'm_' + m.id, 'data-scene': m.id });
    const head = h('div', { class: 'mod-head' });
    if (m.eyebrow) head.appendChild(h('p', { class: 'eyebrow', text: pick(m.eyebrow) }));
    head.appendChild(h('h2', { text: pick(m.title) }));
    if (m.lead) head.appendChild(h('p', { class: 'lead', text: pick(m.lead) }));
    sec.appendChild(head);
    const host = h('div', { class: 'sim-host' });
    sec.appendChild(host);
    const mod = S[m.mount];
    if (!mod || !mod.mount) {
      host.appendChild(h('p', { class: 'small', text: T('sim_missing').replace('{id}', m.mount) }));
    } else {
      try {
        const cleanup = mod.mount(host, { lang: () => state.lang, t: T, pick, Art, K, h, el: h });
        addDisposer(cleanup);
      } catch (e) {
        host.appendChild(h('p', { class: 'small', text: T('sim_error').replace('{msg}', String(e.message || e)) }));
        console.error(e);
      }
    }
    return sec;
  };

  /* 数据页若声明 dynamic: 'lpoints'，表格与柱状图在页面加载时用 algo.js 实时计算；
     content.js 里的 bars/table 只作无脚本时的预计算对照（两者由 test F6 断言一致）。 */
  function liveLpoints(m) {
    const A = window.CR3BP;
    if (!A || !m.table || !m.table.head) return null;
    const tab = A.lagrangeTable(A.MU_EARTH_MOON);
    const D_KM = 384400;
    const km = (d) => Math.round(d * D_KM);
    const sep = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const by = {};
    tab.rows.forEach((r) => { by[r.point] = r; });
    const order = ['L1', 'L2', 'L3', 'L4'];
    const bars = (m.bars || []).map((b, i) => {
      const r = by[order[i]] || by.L4;
      const v = km(r.rEarth) / 1000;
      return { label: b.label, value: v, display: v.toFixed(1) };
    });
    const rows = tab.rows.map((r) => [
      r.point, r.x.toFixed(4), sep(km(r.rEarth)), sep(km(r.rMoon)), r.C.toFixed(5),
      r.residual.toExponential(1),
      { zh: r.kind === 'collinear' ? '共线' : '三角', en: r.kind }
    ]);
    return { bars, table: { head: m.table.head, rows } };
  }

  renderers.dataviz = (m) => {
    const sec = h('section', { class: 'mod', id: 'm_' + m.id, 'data-scene': m.id });
    const head = h('div', { class: 'mod-head' });
    if (m.eyebrow) head.appendChild(h('p', { class: 'eyebrow', text: pick(m.eyebrow) }));
    head.appendChild(h('h2', { text: pick(m.title) }));
    if (m.lead) head.appendChild(h('p', { class: 'lead', text: pick(m.lead) }));
    sec.appendChild(head);
    const live = m.dynamic === 'lpoints' ? liveLpoints(m) : null;
    const barsData = (live && live.bars && live.bars.length) ? live.bars : m.bars;
    const tableData = (live && live.table) ? live.table : m.table;
    const viz = h('div', { class: 'viz' });
    if (barsData) {
      const max = Math.max.apply(null, barsData.map((b) => b.value)) || 1;
      const wrap = h('div', { class: 'bars' });
      barsData.forEach((b) => {
        const row = h('div', { class: 'bar-row' }, [
          h('span', { class: 'lab', text: pick(b.label) }),
          h('span', { class: 'bar-track' }, h('i', { style: 'width:' + (100 * b.value / max).toFixed(1) + '%' })),
          h('span', { class: 'val', text: b.display || K.fmt.num(b.value, b.digits == null ? 1 : b.digits) })
        ]);
        wrap.appendChild(row);
      });
      viz.appendChild(wrap);
    }
    if (tableData) {
      const tw = h('div', { class: 'table-wrap' });
      const tb = h('table', { class: 'data' });
      const thead = h('tr');
      (tableData.head || []).forEach((c) => thead.appendChild(h('th', { text: pick(c) })));
      tb.appendChild(h('thead', null, thead));
      const tbody = h('tbody');
      (tableData.rows || []).forEach((r) => {
        const tr = h('tr');
        r.forEach((c, i) => tr.appendChild(h('td', { class: i === 0 ? '' : 'num', text: typeof c === 'string' ? c : pick(c) })));
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody); tw.appendChild(tb); viz.appendChild(tw);
    }
    sec.appendChild(viz);
    if (m.note) sec.appendChild(h('p', { class: 'small', text: pick(m.note) }));
    return sec;
  };

  renderers.library = (m) => {
    const sec = h('section', { class: 'mod', id: 'm_' + m.id, 'data-scene': m.id });
    const head = h('div', { class: 'mod-head' });
    if (m.eyebrow) head.appendChild(h('p', { class: 'eyebrow', text: pick(m.eyebrow) }));
    head.appendChild(h('h2', { text: pick(m.title) }));
    if (m.lead) head.appendChild(h('p', { class: 'lead', text: pick(m.lead) }));
    sec.appendChild(head);
    const tools = h('div', { class: 'lib-tools' });
    const input = h('input', { class: 'lib-search', type: 'search', 'aria-label': T('search'), placeholder: T('search') });
    const count = h('span', { class: 'lib-count' });
    tools.appendChild(input); tools.appendChild(count);
    sec.appendChild(tools);
    const grid = h('div', { class: 'lib-grid' });
    sec.appendChild(grid);
    const all = m.terms || [];
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      grid.innerHTML = '';
      let n = 0;
      const isEn = state.lang === 'en';
      all.forEach((t) => {
        const zhName = typeof t.zh === 'string' ? t.zh : pick(t.zh);
        const enName = typeof t.en === 'string' ? t.en : pick(t.en);
        const hay = (zhName + ' ' + enName + ' ' + pick(t.def)).toLowerCase();
        if (q && hay.indexOf(q) < 0) return;
        n++;
        /* 英文模式下只显示英文词条（中文词名会残留在 EN 界面里，旧版就是这样） */
        const kids = [h('b', { text: isEn ? enName : zhName })];
        if (!isEn && enName) kids.push(h('em', { text: enName }));
        kids.push(h('p', { text: pick(t.def) }));
        grid.appendChild(h('div', { class: 'term' }, kids));
      });
      if (!n) grid.appendChild(h('p', { class: 'small', text: T('nohit') }));
      count.textContent = n + ' / ' + all.length + ' ' + T('count');
    };
    input.addEventListener('input', draw);
    requestAnimationFrame(draw);
    return sec;
  };

  renderers.sources = (m) => {
    const sec = h('section', { class: 'mod', id: 'm_' + m.id, 'data-scene': m.id });
    const head = h('div', { class: 'mod-head' });
    if (m.eyebrow) head.appendChild(h('p', { class: 'eyebrow', text: pick(m.eyebrow) }));
    head.appendChild(h('h2', { text: pick(m.title) }));
    if (m.lead) head.appendChild(h('p', { class: 'lead', text: pick(m.lead) }));
    sec.appendChild(head);
    if (m.refs) {
      const r = h('div', { class: 'refs' });
      m.refs.forEach((x) => {
        const d = h('div', { class: 'ref' }, [h('span', { html: pick(x.text) })]);
        r.appendChild(d);
      });
      sec.appendChild(r);
    }
    if (m.disclosure) {
      const dw = h('div', { class: 'disclosure' });
      m.disclosure.forEach((d) => {
        const p = h('div', { class: 'panel' });
        p.appendChild(h('h3', { text: pick(d.title) }));
        (pick(d.text) || []).forEach((x) => p.appendChild(h('p', { class: 'small', text: x })));
        dw.appendChild(p);
      });
      sec.appendChild(dw);
    }
    return sec;
  };

  /* ---------------- 装配 ---------------- */
  const main = document.getElementById('main');
  const mods = (C.modules || []).filter((m) => renderers[m.type]);
  mods.forEach((m) => { try { main.appendChild(renderers[m.type](m)); } catch (e) { console.error('模块渲染失败', m.id, e); } });

  const nav = document.getElementById('nav');
  nav.setAttribute('aria-label', T('nav_aria'));
  const navLinks = [];
  mods.filter((m) => m.type !== 'cover').forEach((m) => {
    const a = h('a', { href: '#m_' + m.id, text: pick(m.nav || m.title) });
    nav.appendChild(a); navLinks.push({ a, id: 'm_' + m.id });
  });

  /* 滚动进度 + 导航高亮 */
  const bar = document.querySelector('.progress i');
  const onScroll = () => {
    const st = document.documentElement.scrollTop || document.body.scrollTop;
    const max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
    bar.style.width = Math.min(100, (st / max) * 100) + '%';
    let cur = null;
    for (const l of navLinks) {
      const el = document.getElementById(l.id);
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.42) cur = l;
    }
    navLinks.forEach((l) => l.a.setAttribute('aria-current', l === cur ? 'true' : 'false'));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 语言切换 */
  function applyLang(l) {
    state.lang = l === 'en' ? 'en' : 'zh';
    document.documentElement.lang = state.lang === 'en' ? 'en' : 'zh-CN';
    const btn = document.getElementById('lang');
    btn.textContent = T('lang_btn');
    btn.setAttribute('aria-label', T('lang_aria'));
    const skip = document.getElementById('skip');
    if (skip) skip.textContent = T('skip');
    nav.setAttribute('aria-label', T('nav_aria'));
    document.title = state.lang === 'en'
      ? (pick(C.title) || 'Lunar Station L5')
      : ((pick(C.title) || '') + ' · ' + (pick(C.titleEn) || ''));
    document.getElementById('brand-zh').textContent = pick(C.title);
    document.getElementById('brand-en').textContent = pick(C.titleEn);
    const f1 = document.getElementById('foot-line1'), f2 = document.getElementById('foot-line2');
    f1.textContent = pick(C.foot && C.foot.line1);
    f2.textContent = pick(C.foot && C.foot.line2);
    /* 重建正文：先把上一轮的 rAF / ResizeObserver 释放掉，再清空重建（否则每切一次语言就漏一条动画链） */
    disposeAll();
    main.innerHTML = '';
    mods.forEach((m) => { try { main.appendChild(renderers[m.type](m)); } catch (e) { console.error(e); } });
    // 重建导航
    nav.innerHTML = '';
    navLinks.length = 0;
    mods.filter((m) => m.type !== 'cover').forEach((m) => {
      const a = h('a', { href: '#m_' + m.id, text: pick(m.nav || m.title) });
      nav.appendChild(a); navLinks.push({ a, id: 'm_' + m.id });
    });
    onScroll();
    try { localStorage.setItem('cmit_lang', state.lang); } catch (e) { }
  }
  document.getElementById('lang').addEventListener('click', () => applyLang(state.lang === 'zh' ? 'en' : 'zh'));

  /* 键盘：← → 在模块间跳转（输入框内不拦截） */
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const secs = Array.from(document.querySelectorAll('.mod'));
    const y = window.scrollY + 80;
    let idx = 0;
    secs.forEach((s, i) => { if (s.offsetTop <= y) idx = i; });
    const next = e.key === 'ArrowRight' ? Math.min(secs.length - 1, idx + 1) : Math.max(0, idx - 1);
    secs[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* 自动化 API */
  window.__demo = {
    go(id) {
      const el = document.getElementById(id.indexOf('m_') === 0 ? id : 'm_' + id);
      if (!el) return false;
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
      return true;
    },
    lang(l) { applyLang(l); return state.lang; },
    set(st) {
      let ok = 0;
      mods.filter((m) => m.type === 'sim').forEach((m) => {
        const mod = S[m.mount];
        try { if (mod && mod.api && mod.api.set) { mod.api.set(st); ok++; } } catch (e) { console.error(e); }
      });
      return ok;
    },
    list() { return mods.map((m) => ({ id: 'm_' + m.id, type: m.type })); },
    lang_now() { return state.lang; }
  };

  /* 初始语言：?lang=en 或上次选择 */
  let initLang = 'zh';
  try {
    const q = new URLSearchParams(location.search).get('lang');
    initLang = q || localStorage.getItem('cmit_lang') || 'zh';
  } catch (e) { }
  applyLang(initLang);

  /* 锚点直达 */
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 60);
  }
})();
