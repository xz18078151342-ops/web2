/* ============================================================
   core.js —— 与本作品共用的纯函数内核（浏览器 + Node 双用）
   实际被用到的只有四件：确定性随机 rng、值噪声 noise2、字符串哈希 hash、数字格式化 fmt。
   —— 旧版这里曾抄进一整套音乐/信号处理函数（dft/hann/adsr/音高换算/律制生成），
      本作品从未调用；其中 generateScale('pyth') 的三分损益还是错的（1.5^s 不是律制）。
      整套死代码已删除（audit P1-2 / P2-12）。
   导出：window.Core（浏览器） / module.exports（Node 测试）
   ============================================================ */
(function (root) {
  'use strict';

  const lerp = (a, b, t) => a + (b - a) * t;

  /* 确定性伪随机：同一 seed 必然同一序列（可复现断言的基础） */
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 平滑值噪声（用于纹理/场） */
  function noise2(seed) {
    const r = rng(seed), N = 256, g = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) g[i] = r();
    const at = (x, y) => g[(((y % N) + N) % N) * N + (((x % N) + N) % N)];
    const sm = (t) => t * t * (3 - 2 * t);
    return function (x, y) {
      const x0 = Math.floor(x), y0 = Math.floor(y);
      const fx = sm(x - x0), fy = sm(y - y0);
      return lerp(lerp(at(x0, y0), at(x0 + 1, y0), fx), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), fx), fy);
    };
  }

  /* 字符串 → 稳定哈希（用于把名称映射到视觉参数） */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }

  const fmt = {
    num(v, d) { const p = Math.pow(10, d == null ? 2 : d); return (Math.round(v * p) / p).toFixed(d == null ? 2 : d); },
    pct(v, d) { return (v * 100).toFixed(d == null ? 0 : d) + '%'; },
    int(v) { return Math.round(v).toLocaleString('en-US'); }
  };

  const Core = { rng, noise2, hash, fmt, VERSION: '1.1.0' };

  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  else root.Core = Core;
})(typeof globalThis !== 'undefined' ? globalThis : this);
