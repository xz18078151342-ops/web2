/* ============================================================
   content.js —— 《地月驿站 L5》内容真源（中英双语）
   规则：凡"事实"必须给来源（见 src 模块）；凡"数字"必须标明是
        「本作品实测」还是「公开资料」；科幻设定一律标注为设定。
   ============================================================ */
window.CONTENT = {
  key: 'lunar-station-l5',
  title: { zh: '地月驿站 L5', en: 'Lunar Station L5' },
  titleEn: { zh: 'LUNAR STATION L5', en: 'A STATION AT THE EARTH–MOON L5 POINT' },
  foot: {
    line1: {
      zh: '《地月驿站 L5》· 2026 第十四届全国大学生数字媒体科技作品及创意竞赛 · 科幻+及元宇宙数字作品赛项 · 离线可运行网页作品，零外部依赖。',
      en: 'Lunar Station L5 · 2026 CMIT · Track: Science Fiction & Metaverse · Offline single-page work, zero external dependencies.'
    },
    line2: {
      zh: '作品的物理内核为圆型限制性三体问题（CR3BP）数值解，所有数值由本作品算法实测、可复跑；12 个舱段与驿站情节属科幻设定，不对应任何真实工程方案。',
      en: 'The physical core is a numerical solution of the circular restricted three-body problem (CR3BP); all numbers are computed by this work and re-runnable. The twelve station bays and the story are fictional and correspond to no real engineering programme.'
    }
  },

  /* ---------------- 界面文案（交互台 / 术语表 / 页眉页脚 / skip link） ----------------
     与正文一样中英双备：sim.js 与 app.js 只通过 t(key) 取词，凡界面上出现的字都从这里来。
     英文模式验收要求：document.body.innerText 中 CJK 文本节点数为 0（专有名词 CR3BP/L1–L5 除外）。 */
  i18n: {
    zh: {
      skip: '跳到正文',
      lang_btn: 'EN',
      lang_aria: '切换语言：English',
      nav_aria: '章节导航',
      preset_head: '质量比预设',
      preset_note: '等质量（μ=0.5）时三角点立刻失稳：同一个判据会翻面。天平动周期按所选系统的主天体公转周期换算成天（地月 27.32 天、日地 365.26 天）；等质量双星没有以「天」为单位的物理周期，改用归一化时间单位。',
      launch_head: '发射与回放',
      fire: '换一个初速（+0.005）',
      play_note: '「播放」重放算好的轨道；「换一个初速」把初速加 0.005 并重算，用来找到「捕获 → 逃逸」的分界。',
      station_head: '驿站参数',
      sl_mu: '质量比 μ',
      sl_offset: '投放偏移（D）',
      sl_speed: '初速度（D/时间单位）',
      sl_radius: '判定半径（D）',
      sl_dwell: '驻留比例阈值',
      verdict_head: '判定与实测',
      m_cap: '捕获驻留判定',
      m_dwell: '驻留采样占比',
      m_C: '雅可比常数 C',
      m_C1: '临界 C_L1',
      m_stab: '三角点线性稳定',
      m_drift: '积分最大漂移 |ΔC|',
      m_wind: '绕 L4 圈数（24 TU）',
      cap_yes: '捕获驻留 ✔',
      cap_escape: '已逃逸 ✘',
      cap_impact: '撞击主天体 ✘',
      cap_no: '未驻留 ✘',
      dwell_fmt: '{d}%（阈值 {t}%）',
      stab_ok_fmt: '稳定（μ_R={mr}，长周期 {p}）',
      stab_bad_fmt: '不稳定（μ 超过 Routh 阈值 {mr}）',
      unit_day: '天',
      unit_tu: '时间单位',
      period_fmt: '{v} {unit}',
      canvas_aria: '旋转坐标系：地球、月球、五个平动点与飞船轨迹',
      canvas_note: '旋转坐标系 · 主天体尺寸为放大显示',
      hud_hold: '状态：驻留 HOLD',
      hud_escaped: '状态：已逃逸 ESCAPED',
      hud_impact: '状态：撞击主天体 IMPACT',
      hud_blowup: '状态：数值发散 BLOW-UP',
      hud_full: '状态：跑满 24 TU FULL',
      sim_missing: '[sim: {id}] 未注册',
      sim_error: '交互模块初始化失败：{msg}'
    },
    en: {
      skip: 'Skip to content',
      lang_btn: 'ZH',
      lang_aria: 'Switch language: Chinese',
      nav_aria: 'Sections',
      preset_head: 'Mass-ratio presets',
      preset_note: 'Equal masses (μ=0.5) make the triangular points unstable at once: the same criterion flips. Libration periods are converted to days with the orbital period of the chosen system (Earth–Moon 27.32 d, Sun–Earth 365.26 d); equal-mass binaries have no physical period in days, so normalized time units are used instead.',
      launch_head: 'Launch & replay',
      fire: 'Try another speed (+0.005)',
      play_note: 'Play replays the orbit already computed; Try another speed adds 0.005 to the initial speed and recomputes, to walk up to the capture-to-escape boundary.',
      station_head: 'Station parameters',
      sl_mu: 'Mass ratio μ',
      sl_offset: 'Drop offset (D)',
      sl_speed: 'Initial speed (D per time unit)',
      sl_radius: 'Verdict radius (D)',
      sl_dwell: 'Dwell fraction threshold',
      verdict_head: 'Verdict & measurements',
      m_cap: 'Capture verdict',
      m_dwell: 'Dwell fraction',
      m_C: 'Jacobi constant C',
      m_C1: 'Critical C_L1',
      m_stab: 'Triangular-point stability',
      m_drift: 'Max integration drift |ΔC|',
      m_wind: 'Revolutions about L4 (24 TU)',
      cap_yes: 'captured ✔',
      cap_escape: 'escaped ✘',
      cap_impact: 'impact ✘',
      cap_no: 'not held ✘',
      dwell_fmt: '{d}% (threshold {t}%)',
      stab_ok_fmt: 'stable (μ_R={mr}, long period {p})',
      stab_bad_fmt: 'unstable (μ above the Routh threshold {mr})',
      unit_day: 'days',
      unit_tu: 'TU',
      period_fmt: '{v} {unit}',
      canvas_aria: 'Rotating frame: the Earth, the Moon, the five libration points and the spacecraft trajectory',
      canvas_note: 'ROTATING FRAME · PRIMARY SIZES ENLARGED',
      hud_hold: 'state: HOLD',
      hud_escaped: 'state: ESCAPED',
      hud_impact: 'state: IMPACT',
      hud_blowup: 'state: BLOW-UP',
      hud_full: 'state: FULL 24 TU',
      sim_missing: '[sim: {id}] not registered',
      sim_error: 'Interactive module failed to initialise: {msg}'
    }
  },

  modules: [
    /* ---------------- 封面 ---------------- */
    {
      type: 'cover', id: 'cover',
      eyebrow: { zh: '科幻+ · 元宇宙 ｜ 2026 数媒竞赛', en: 'Science Fiction & Metaverse · 2026 CMIT' },
      title: { zh: '地月驿站 L5', en: 'Lunar Station L5' },
      titleEn: { zh: 'LUNAR STATION L5', en: 'A STATION AT THE EARTH–MOON L5 POINT' },
      lead: {
        zh: '在科幻里，太空站想建在哪里就建在哪里；在天体力学里，能长期停住的地方只有五个。其中两个——L4 与 L5——与地球、月球构成等边三角形，不需要燃料就能待在那里几十亿年。这件作品把这句话写成可以自己动手验证的方程：你布置驿站、给它一个初速度，算法会告诉你它到底会不会留下来。',
        en: 'In science fiction a station can sit wherever the story needs it. In celestial mechanics only five places hold. Two of them — L4 and L5 — form an equilateral triangle with the Earth and the Moon and can stay put for billions of years without fuel. This work turns that sentence into something you can test yourself: place the station, give it an initial velocity, and the algorithm tells you whether it actually stays.'
      },
      tags: [
        { zh: '限制性三体问题', en: 'restricted three-body problem' },
        { zh: '平动点 L1–L5', en: 'libration points L1–L5' },
        { zh: '雅可比常数', en: 'Jacobi constant' },
        { zh: '可复算', en: 'recomputable' }
      ]
    },

    /* ---------------- 问题 ---------------- */
    {
      type: 'prose', id: 'why', nav: { zh: '为什么', en: 'Why' },
      eyebrow: { zh: '01 为什么是 L5', en: '01 Why L5' },
      title: { zh: '一个不需要燃料的停车位，是怎么被算出来的', en: 'How a parking space that needs no fuel gets computed' },
      lead: {
        zh: '地球与月球互相绕转，一颗很小的飞船在它们的引力场里几乎没有发言权。这种"两个大的 + 一个可以忽略的小的"的模型叫限制性三体问题；若再假定两个大天体走正圆轨道，就是圆型限制性三体问题（CR3BP）。它有一个极其难得的性质：存在一个守恒量，叫做雅可比常数。',
        en: 'The Earth and the Moon orbit each other; a small spacecraft has almost no say in their gravitational field. That model — two large bodies plus one negligible one — is the restricted three-body problem, and if the two large bodies move on circles it becomes the circular restricted three-body problem (CR3BP). It has a rare gift: a conserved quantity called the Jacobi constant.'
      },
      text: {
        zh: [
          'CR3BP 里存在五个"什么都不做也不会掉下去"的位置，叫平动点（拉格朗日点）。三个共线的 L1、L2、L3 是不稳定的：理论上待得住，实际上任何微小扰动都会让它漂走。另外两个——L4 与 L5——与地球、月球构成等边三角形，在地月系统里是线性稳定的：被推开之后，它会在那个点上绕着打转（天平动），而不是头也不回地跑掉。',
          'L5 就是那个"月球背后、与地球和月球成正三角形"的点。对一座驿站来说这几乎是理想选址：它永远与地月保持同样的几何关系，通信角度稳定，不需要持续点火来维持位置；而它与月球之间隔着一个地球直径量级的距离，既能观测月球背面，又不至于被月球的遮挡完全掐断。',
          '但"稳定"不等于"放哪儿都稳"。这件作品让你亲手改参数：改质量比，五点的位置会移动；改初速度，轨道会从"绕着 L4/L5 打转"变成"划过整个地月空间"甚至"直接跑掉"。下面每一块面板上的数字都是现场算出来的，不是写死的。'
        ],
        en: [
          'The CR3BP has five places where you can do nothing and still not fall anywhere: the libration (Lagrange) points. The three collinear ones — L1, L2, L3 — are unstable: in theory you can sit there, in practice any small disturbance drifts you away. The other two, L4 and L5, form an equilateral triangle with the Earth and the Moon and are linearly stable in the Earth–Moon system: pushed away, a body turns around the point (libration) instead of leaving for good.',
          'L5 is the point on the far side of the Moon that forms an equilateral triangle with the Earth and the Moon. For a station it is close to ideal: the geometry with the Earth–Moon pair never changes, the communication angle is steady, and no continuous thrust is needed to hold position. It also sits about an Earth-diameter-scale distance from the Moon, so the lunar far side is observable without being completely blocked.',
          'But stable does not mean anything placed anywhere stays. This work lets you change the parameters yourself: change the mass ratio and the five points move; change the initial velocity and the orbit turns from a libration around L4/L5 into a sweep across the whole Earth–Moon volume, or into an escape. Every number in the panels below is computed on the spot, not baked in.'
        ]
      },
      kv: [
        { v: { zh: '5 个', en: '5' }, k: { zh: '平动点：3 个共线（不稳定）+ 2 个三角（地月系统里线性稳定）', en: 'libration points: 3 collinear (unstable) + 2 triangular (linearly stable for the Earth–Moon pair)' } },
        { v: { zh: '0.0121', en: '0.0121' }, k: { zh: '地月质量比 μ = m月/(m地+m月)，由公开质量数据算出（本作品实测）', en: 'Earth–Moon mass ratio, computed from published masses (this work’s own calculation)' } },
        { v: { zh: '3 − μ + μ²', en: '3 − μ + μ²' }, k: { zh: 'L4/L5 的临界雅可比常数（解析解，作品用它做自检）', en: 'critical Jacobi constant at L4/L5 (analytic, used here as a self-check)' } }
      ]
    },

    /* ---------------- 五点 ---------------- */
    {
      type: 'prose', id: 'what', nav: { zh: '五点', en: 'Five points' },
      eyebrow: { zh: '02 五个点的位置与稳定性', en: '02 Where the five points are, and which of them hold' },
      title: { zh: '把"稳定"拆成可以判定的两件事', en: 'Splitting “stable” into two decidable things' },
      lead: {
        zh: '作品只对"稳定"作两种可判定的表述：①平衡——该点处有效势的梯度为零，残差可算；②线性稳定——在 L4/L5 处把方程线性化后，特征值是否为纯虚数。前者用求根验证，后者有解析判据（Routh 判据：μ ≤ (1−√(23/27))/2 ≈ 0.03852）。两条都写成断言，故意破坏就会报错。',
        en: 'This work states “stable” in exactly two decidable ways: (1) equilibrium — the gradient of the effective potential vanishes there, and the residual can be computed; (2) linear stability — after linearizing at L4/L5, whether the eigenvalues are purely imaginary. The first is verified by root-finding, the second has an analytic criterion (Routh: μ ≤ (1−√(23/27))/2 ≈ 0.03852). Both are written as assertions, and breaking them on purpose makes them fail.'
      },
      cols: [
        {
          title: { zh: '① 平衡：梯度为零', en: '① Equilibrium: zero gradient' },
          text: {
            zh: [
              '在跟着两个天体一起转的坐标系里，飞船受到引力与离心力、科氏力的合力可以用一个有效势 Ω 描述。平动点就是 ∇Ω = 0 的点：三个共线点要用数值求根（本作品用二分法，把残差压到 1e-13 以下），两个三角点有解析解 (0.5−μ, ±√3/2)。',
              '因此"这个点对不对"不是看法，是残差。作品把五点残差直接印在数据表里：地月系统下全部小于 1e-13。'
            ],
            en: [
              'In the frame that rotates with the two bodies, gravity, centrifugal and Coriolis effects combine into an effective potential Ω. Libration points are where ∇Ω = 0: the three collinear ones need numerical root-finding (here bisection, driving the residual below 1e-13); the two triangular ones are analytic, (0.5−μ, ±√3/2).',
              'So whether a point is right is not a matter of opinion — it is a residual. The data table prints all five residuals: in the Earth–Moon system they are all below 1e-13.'
            ]
          }
        },
        {
          title: { zh: '② 稳定：Routh 判据', en: '② Stability: the Routh criterion' },
          text: {
            zh: [
              '在 L4/L5 线性化后，特征方程是 λ⁴ + λ² + 27μ(1−μ)/4 = 0。令 Λ = λ²，得到 Λ² + Λ + 27μ(1−μ)/4 = 0；两个 Λ 都为负（λ 为纯虚数、位置有界振荡）的充要条件是 27μ(1−μ) ≤ 1，即 μ ≤ 0.03852。',
              '地月系统的 μ ≈ 0.0121，远小于这个阈值，所以 L4/L5 稳定；把滑块推到 μ = 0.5（等质量双星），同一判据立刻判不稳定。这条"判据的方向"本身也被写成断言——如果它恒真，测试会红。'
            ],
            en: [
              'Linearized at L4/L5 the characteristic equation is λ⁴ + λ² + 27μ(1−μ)/4 = 0. With Λ = λ², Λ² + Λ + 27μ(1−μ)/4 = 0; both roots being negative (purely imaginary λ, bounded oscillation) is equivalent to 27μ(1−μ) ≤ 1, i.e. μ ≤ 0.03852.',
              'The Earth–Moon μ ≈ 0.0121 is well below the threshold, so L4/L5 are stable; push the slider to μ = 0.5 (equal-mass binaries) and the same criterion flips to unstable immediately. The direction of the criterion is itself asserted — if it always returned true, the test would fail.'
            ]
          }
        },
        {
          title: { zh: '③ 捕获：本作品的判据（不是文献判据）', en: '③ Capture: this work’s criterion (not a literature one)' },
          text: {
            zh: [
              '一个人造天体"被某个点留住"没有唯一的定义。本作品把它写成三条可调的条件：全程没有撞击地球或月球、没有飞出 3.2 倍地月距离、且至少 90% 的采样点落在目标点半径 0.3 倍的球内；三条全过才判"捕获驻留"。',
              '阈值都写在界面上，可以改。改阈值，判定就会跟着变——这一点是刻意的：评委可以当场把半径从 0.3 调到 0.05，看结论崩塌给你看。判定之外另报一个参考量「绕 L4 圈数」（24 TU 内的角向绕数）：它能把"绕 L4 的真天平动"与"沿零速度面边界滑动"区分开——后者虽然也留在 0.3 D 内，但 C₀ 大于 C_L4，L4 被禁止区包住，飞船其实从未靠近过它。'
            ],
            en: [
              'There is no single definition of a body being “held” by a point. This work states it as three adjustable conditions: no impact with the Earth or Moon, no excursion beyond 3.2 Earth–Moon distances, and at least 90% of samples inside a radius of 0.3 around the target point; all three must hold.',
              'The thresholds are shown in the interface and can be changed, and the verdict follows them. That is deliberate: a reviewer can drag the radius from 0.3 down to 0.05 on stage and watch the conclusion collapse. Besides the verdict the bench also reports a reference quantity, revolutions about L4 (the angular winding number over 24 TU): it separates a real libration about L4 from sliding along the zero-velocity boundary — the latter also stays inside 0.3 D, but there C₀ exceeds C_L4, L4 is wrapped in a forbidden region and the spacecraft never actually comes near it.'
            ]
          }
        }
      ],
      gallery: [
        { art: 'bay', title: { zh: '01 观测穹顶', en: '01 Observation dome' }, caption: { zh: '科幻设定：朝向月球背面的光学与射电观测面', en: 'Fiction: optical and radio apertures aimed at the lunar far side' } },
        { art: 'bay', title: { zh: '02 水循环舱', en: '02 Water loop' }, caption: { zh: '科幻设定：闭合水回收与电解制氧', en: 'Fiction: closed-loop water recovery and oxygen by electrolysis' } },
        { art: 'bay', title: { zh: '03 培育舱', en: '03 Growth bay' }, caption: { zh: '科幻设定：受控环境下种植，补充新鲜食物', en: 'Fiction: controlled-environment crops for fresh food' } },
        { art: 'bay', title: { zh: '04 医疗舱', en: '04 Medical bay' }, caption: { zh: '科幻设定：长期低重力下的健康维持', en: 'Fiction: health upkeep under long-term low gravity' } },
        { art: 'bay', title: { zh: '05 中继舱', en: '05 Relay bay' }, caption: { zh: '科幻设定：与地月两侧同时可见的通信节点', en: 'Fiction: a node with line of sight to both sides of the Earth–Moon pair' } },
        { art: 'bay', title: { zh: '06 材料实验舱', en: '06 Materials lab' }, caption: { zh: '科幻设定：微重力下的材料与晶体实验', en: 'Fiction: microgravity materials and crystal experiments' } },
        { art: 'bay', title: { zh: '07 休眠舱', en: '07 Sleep bay' }, caption: { zh: '科幻设定：轮换班次的长夜休息区', en: 'Fiction: rest quarters for rotating shifts' } },
        { art: 'bay', title: { zh: '08 档案舱', en: '08 Archive bay' }, caption: { zh: '科幻设定：把观测数据留在原地的冷存储', en: 'Fiction: cold storage that keeps observation data in place' } },
        { art: 'bay', title: { zh: '09 能源舱', en: '09 Power bay' }, caption: { zh: '科幻设定：不受月球遮挡的连续日照阵列', en: 'Fiction: a solar array with uninterrupted sunlight' } },
        { art: 'bay', title: { zh: '10 遮蔽舱', en: '10 Shielding bay' }, caption: { zh: '科幻设定：辐射屏蔽与安全避难点', en: 'Fiction: radiation shielding and safe haven' } },
        { art: 'bay', title: { zh: '11 生保舱', en: '11 Life support' }, caption: { zh: '科幻设定：大气循环与温控', en: 'Fiction: atmosphere loop and thermal control' } },
        { art: 'bay', title: { zh: '12 交接厅', en: '12 Transfer hall' }, caption: { zh: '科幻设定：与来往飞船对接、换班的公共空间', en: 'Fiction: the public space for docking and crew handover' } }
      ]
    },

    /* ---------------- 交互台 ---------------- */
    {
      type: 'sim', id: 'lab', nav: { zh: '布置台', en: 'Bench' }, mount: 'stationLab',
      eyebrow: { zh: '03 驿站布置台', en: '03 The station bench' },
      title: { zh: '改一个参数，看它到底留不留得下来', en: 'Change one parameter and see whether it stays' },
      lead: {
        zh: '左边是跟着地月一起转的坐标系：地球与月球固定在两个位置上，五个平动点标出来，背景里那条线是"零速度面"——飞船的速度平方在那里刚好为零，越过它需要能量。右边是参数：质量比、投放偏移、初速度、判定半径。点「播放」，算法用四阶龙格-库塔法把轨道积分 24 个时间单位（3.820 圈地月公转，折合 104.36 天），然后把捕获判定、雅可比常数漂移一起给你。默认算例（L4 外侧 0.005 D、切向初速 0.005）下 C₀ < C_L4：L4 不在禁止区里，轨迹是绕 L4 的真天平动——24 TU 内绕行约 1.07 圈，100% 采样点落在 0.3 D 判定半径内。切到日地系统预设，长周期会按 365.26 天/圈重新换算（约 8.1×10⁴ 天）。',
        en: 'On the left is the frame rotating with the Earth and the Moon: both bodies fixed, the five points marked, and in the background the zero-velocity boundary — where the squared speed of the spacecraft would be exactly zero. On the right are the parameters: mass ratio, drop offset, initial speed, verdict radius. Press play and the algorithm integrates the orbit for 24 time units (3.820 Earth–Moon revolutions, i.e. 104.36 days) with fourth-order Runge–Kutta, then reports the capture verdict and the Jacobi drift. In the default case (0.005 D outside L4, tangential speed 0.005) C₀ < C_L4: L4 is not inside the forbidden region and the trajectory is a real libration about L4 — about 1.07 revolutions in 24 TU, with 100% of samples inside the 0.3 D verdict radius. Switch to the Sun–Earth preset and the long period is re-converted at 365.26 days per revolution (about 8.1×10⁴ days).'
      }
    },

    /* ---------------- 实测数据 ---------------- */
    {
      type: 'dataviz', id: 'data', nav: { zh: '实测', en: 'Data' },
      dynamic: 'lpoints',
      eyebrow: { zh: '04 本作品实测（可复跑）', en: '04 Measured by this work (re-runnable)' },
      title: { zh: '五点的坐标、距离与临界雅可比常数', en: 'Coordinates, distances and critical Jacobi constants of the five points' },
      lead: {
        zh: '下表与柱状图的数值在页面加载时由 algo.js 实时算出（同一内核的断言脚本 `test/t01.test.cjs` 随赛档附送，47 条断言可由 `node test/t01.test.cjs` 复跑）；此处另附一份预计算值，与实时计算一致，用于无脚本时对照。距离一栏把归一化长度乘回公开的平均地月距离 384 400 km，因此可以直接和公开资料的常见数值对照——这是本作品与外部世界的一次交叉核对，不是引用。',
        en: 'The table and the bar chart are computed live by algo.js when the page loads (the assertion script `test/t01.test.cjs` ships with the entry pack; its 47 assertions can be re-run with `node test/t01.test.cjs`). A precomputed copy is kept below as a no-script cross-check and matches the live values. The distance column multiplies the normalized length by the published mean Earth–Moon distance of 384 400 km, so the numbers can be checked against commonly quoted values — a cross-check with the outside world, not a quotation.'
      },
      bars: [
        { label: { zh: 'L1 距地（千公里）', en: 'L1 from Earth (thousand km)' }, value: 326.4, display: '326.4' },
        { label: { zh: 'L2 距地（千公里）', en: 'L2 from Earth (thousand km)' }, value: 448.9, display: '448.9' },
        { label: { zh: 'L3 距地（千公里）', en: 'L3 from Earth (thousand km)' }, value: 381.7, display: '381.7' },
        { label: { zh: 'L4/L5 距地（千公里）', en: 'L4/L5 from Earth (thousand km)' }, value: 384.4, display: '384.4' }
      ],
      table: {
        head: [
          { zh: '平动点', en: 'Point' }, { zh: 'x（D 为单位）', en: 'x (in D)' },
          { zh: '距地（km）', en: 'from Earth (km)' }, { zh: '距月（km）', en: 'from Moon (km)' },
          { zh: '临界 C', en: 'critical C' }, { zh: '平衡残差', en: 'residual' }, { zh: '类型', en: 'type' }
        ],
        rows: [
          ['L1', '0.8369', '326 391', '58 009', '3.18828', '1.8e-14', { zh: '共线', en: 'collinear' }],
          ['L2', '1.1557', '448 903', '64 503', '3.17211', '1.9e-14', { zh: '共线', en: 'collinear' }],
          ['L3', '−1.0051', '381 677', '766 077', '3.01214', '5.0e-15', { zh: '共线', en: 'collinear' }],
          ['L4', '0.4879', '384 400', '384 400', '2.98800', '3.3e-17', { zh: '三角', en: 'triangular' }],
          ['L5', '0.4879', '384 400', '384 400', '2.98800', '3.3e-17', { zh: '三角', en: 'triangular' }]
        ]
      },
      note: {
        zh: '口径：μ = 0.012144（由公开的月球与地球质量算出）；长度以平均地月距离 D = 384 400 km 归一；"临界 C"是静止于该点时的雅可比常数；残差是 |∇Ω|。全部为本作品算法实测值，复跑命令见 07_技术文档与运行说明。稳定性的量化结果：Routh 阈值 μ_R = 0.038521，地月系统判为稳定，L4 天平动周期 91.65 天（长）/ 28.62 天（短），同样是实测值；日地系统按 365.256 天/圈换算，长周期约 8.11×10⁴ 天。',
        en: 'Method: μ = 0.012144 computed from published Earth and Moon masses; lengths normalized by the mean Earth–Moon distance D = 384 400 km; "critical C" is the Jacobi constant of a body at rest there; the residual is |∇Ω|. All values are this work’s computed output; see 07 for the re-run commands. Stability numbers: Routh threshold μ_R = 0.038521; the Earth–Moon system is stable; the libration periods at L4 are 91.65 days (long) and 28.62 days (short), also computed; for the Sun–Earth system, converted at 365.256 days per revolution, the long period is about 8.11×10⁴ days.'
      }
    },

    /* ---------------- 时间线 ---------------- */
    {
      type: 'timeline', id: 'time', nav: { zh: '节点', en: 'Timeline' },
      eyebrow: { zh: '05 从纸上的解到真实的站', en: '05 From a solution on paper to stations in space' },
      title: { zh: '三点共线的解，等了两个世纪才被用上', en: 'The collinear solutions waited two centuries to be used' },
      lead: {
        zh: '以下年代与任务以公开资料常见表述为准（来源见文末）；本作品不对史料细节作学术结论。凡带"常见表述"字样者，均为公开资料中的通行说法而非一手档案。',
        en: 'The dates and missions below follow common public accounts (sources at the end); this work makes no scholarly claim about them. Where “commonly cited” appears, the statement is a common public account rather than a primary archive.'
      },
      items: [
        { k: { zh: '1772', en: '1772' }, title: { zh: '拉格朗日给出五点解', en: 'Lagrange writes down five solutions' }, text: { zh: '公开资料常见表述：欧拉先给出三个共线解，拉格朗日随后给出两个等边三角形解，合称五个平动点。', en: 'Commonly cited: Euler found the three collinear solutions first; Lagrange then found the two equilateral ones. Together they are the five libration points.' } },
        { k: { zh: '1836 前后', en: 'c. 1836' }, title: { zh: '雅可比与哈密顿形式', en: 'Jacobi and the Hamiltonian form' }, text: { zh: '公开资料常见表述：这一守恒量因雅可比的工作而得名"雅可比常数"，它是判断轨道能否穿过某个通道的唯一积分。', en: 'Commonly cited: the conserved quantity is named the Jacobi constant after Jacobi’s work; it is the single integral that decides whether an orbit may pass through a given gateway.' } },
        { k: { zh: '1875', en: '1875' }, title: { zh: 'Routh 给出稳定性条件', en: 'Routh derives the stability condition' }, text: { zh: '公开资料常见表述：三角点的线性稳定性以质量比为条件，阈值 μ = (1−√(23/27))/2 ≈ 0.03852；本作品用它做判定并写进断言。', en: 'Commonly cited: linear stability of the triangular points depends on the mass ratio, with threshold μ = (1−√(23/27))/2 ≈ 0.03852; this work uses it as a verdict and an assertion.' } },
        { k: { zh: '1978', en: '1978' }, title: { zh: '第一次真正用上 L1', en: 'L1 first put to work' }, text: { zh: '公开资料常见表述：国际日地探测卫星（ISEE-3）进入日地 L1 附近的晕轨道，成为最早使用平动点的航天任务之一。注意：这是日地系统，不是地月系统。', en: 'Commonly cited: ISEE-3 was placed in a halo orbit near the Sun–Earth L1, one of the earliest missions to use a libration point. Note this is the Sun–Earth system, not the Earth–Moon one.' } },
        { k: { zh: '2018', en: '2018' }, title: { zh: '地月 L2 的中继星', en: 'A relay at Earth–Moon L2' }, text: { zh: '公开资料常见表述：嫦娥四号任务的地月中继星"鹊桥"在地月 L2 附近的晕轨道运行，为月球背面着陆器提供测控与数据中继。', en: 'Commonly cited: the Queqiao relay of the Chang’e-4 mission operates in a halo orbit near the Earth–Moon L2, providing tracking and data relay for the far-side lander.' } },
        { k: { zh: '现在', en: 'now' }, title: { zh: 'L4/L5 仍然是"空着的"', en: 'L4/L5 are still empty' }, text: { zh: '公开资料常见表述：L4/L5 至今没有被真正部署过大型设施。它们稳定、省燃料，但也远离地球、难以救援——本作品的驿站是设定，不是计划。', en: 'Commonly cited: no large facility has yet been deployed at L4/L5. They are stable and fuel-cheap, but far from Earth and hard to rescue — the station in this work is fiction, not a plan.' } }
      ]
    },

    /* ---------------- 术语库 ---------------- */
    {
      type: 'library', id: 'terms', nav: { zh: '术语', en: 'Lexicon' },
      eyebrow: { zh: '06 术语库（26 条）', en: '06 Lexicon (26 entries)' },
      title: { zh: '读懂这套计算需要的词', en: 'The words you need to read this computation' },
      lead: {
        zh: '释义以公开的天体力学通用表述为准；凡涉及具体任务与年代的表述，以文末来源为限。中文译名采用国内通用译法，英文给出通行写法。',
        en: 'Definitions follow standard celestial-mechanics usage; statements about specific missions and dates are limited to the sources listed at the end. Chinese terms use common renderings; English gives the usual form.'
      },
      terms: [
        { zh: '圆型限制性三体问题', en: 'circular restricted three-body problem (CR3BP)', def: { zh: '两个大天体走正圆轨道、第三个天体质量可忽略时的运动模型；本作品全部计算都在这个模型里。', en: 'The model in which two massive bodies move on circles and a third, negligible mass moves in their field; all computation here uses it.' } },
        { zh: '平动点', en: 'libration point / Lagrange point', def: { zh: '旋转坐标系中合加速度为零的五个位置，记作 L1–L5。', en: 'The five positions in the rotating frame where the net acceleration vanishes, written L1–L5.' } },
        { zh: '共线点', en: 'collinear point', def: { zh: 'L1、L2、L3：与两个主天体排在一条直线上，在线性意义下不稳定。', en: 'L1, L2 and L3: on the line through the two primaries; linearly unstable.' } },
        { zh: '三角点', en: 'triangular point', def: { zh: 'L4、L5：与两个主天体构成等边三角形，地月系统里线性稳定。', en: 'L4 and L5: forming an equilateral triangle with the primaries; linearly stable in the Earth–Moon system.' } },
        { zh: '质量比 μ', en: 'mass ratio μ', def: { zh: 'μ = m2/(m1+m2)，决定五点位置与稳定性的唯一无量纲参数。', en: 'μ = m2/(m1+m2), the single dimensionless parameter that fixes the point positions and stability.' } },
        { zh: '旋转坐标系', en: 'rotating frame', def: { zh: '以两个主天体的连线为 x 轴、随其公转一起转动的坐标系；原点取在质心。', en: 'The frame whose x axis joins the primaries and which rotates with them; the origin is the barycentre.' } },
        { zh: '有效势 Ω', en: 'effective potential Ω', def: { zh: '把引力与离心力合并后的标量场；平动点即 ∇Ω = 0 处。', en: 'The scalar field combining gravity and centrifugal effect; libration points are where ∇Ω = 0.' } },
        { zh: '雅可比常数', en: 'Jacobi constant', def: { zh: 'C = 2Ω − v²，CR3BP 的运动积分，沿任一条轨道守恒；本作品用它的漂移量检验积分误差。', en: 'C = 2Ω − v², the integral of motion of the CR3BP, constant along any orbit; this work uses its drift to check integration error.' } },
        { zh: '零速度面', en: 'zero-velocity surface', def: { zh: '2Ω = C 的等值面；速度平方为负的区域不可达，因此它划出"能去哪里"。', en: 'The level set 2Ω = C; regions where the squared speed would be negative are unreachable, so it bounds where you can go.' } },
        { zh: '临界雅可比常数', en: 'critical Jacobi constant', def: { zh: '静止位于某平动点时的 C 值；C 大于它，该点附近的可达区就被封闭。', en: 'The value of C for a body at rest at a point; above it, the reachable region near that point closes off.' } },
        { zh: 'Routh 判据', en: 'Routh criterion', def: { zh: '三角点线性稳定的充要条件 μ ≤ (1−√(23/27))/2 ≈ 0.03852。', en: 'The necessary and sufficient condition for triangular-point linear stability, μ ≤ (1−√(23/27))/2 ≈ 0.03852.' } },
        { zh: '天平动', en: 'libration', def: { zh: '被留在三角点附近的天体围绕该点做有界振荡，而不是静止不动。', en: 'Bounded oscillation of a body about a triangular point, rather than rest at it.' } },
        { zh: '拖尾轨道', en: 'tadpole orbit', def: { zh: '沿两个三角点中某一点前后摆动、形似蝌蚪的周期轨道。', en: 'A periodic orbit that swings about one triangular point, shaped like a tadpole.' } },
        { zh: '马蹄轨道', en: 'horseshoe orbit', def: { zh: '同时绕过 L4 与 L5 的更大范围周期轨道，形状像马蹄铁。', en: 'A larger periodic orbit that wraps around both L4 and L5, shaped like a horseshoe.' } },
        { zh: '晕轨道', en: 'halo orbit', def: { zh: '共线点附近的三维周期轨道，实际任务常用它来"停"在 L1/L2 旁边。', en: 'A three-dimensional periodic orbit about a collinear point, commonly used to station a spacecraft near L1/L2.' } },
        { zh: '李萨如轨道', en: 'Lissajous orbit', def: { zh: '共线点附近的准周期轨道，两方向频率不成简单比，轨迹不闭合。', en: 'A quasi-periodic orbit about a collinear point with incommensurate frequencies, so the path does not close.' } },
        { zh: '不变流形', en: 'invariant manifold', def: { zh: '周期轨道附近的稳定/不稳定管状结构，低能转移正是顺着它"滑"进去。', en: 'The stable/unstable tube-like structures around a periodic orbit; low-energy transfers slide along them.' } },
        { zh: '低能转移', en: 'low-energy transfer', def: { zh: '借助流形与引力辅助、以很小的速度增量改变轨道的转移方式。', en: 'A transfer that changes orbit with very small velocity increments by exploiting manifolds and gravity assists.' } },
        { zh: '捕获驻留（本作品判据）', en: 'capture-dwell (defined here)', def: { zh: '本作品定义：未撞击主天体、未飞出 3.2D、且 ≥90% 采样点在目标点 0.3 半径内。', en: 'Defined here as: no impact, no excursion past 3.2 D, and at least 90% of samples within 0.3 of the target point.' } },
        { zh: '逃逸', en: 'escape', def: { zh: '轨道离开设定的 3.2 倍地月距离范围；判据中直接判为未捕获。', en: 'The orbit leaving the configured 3.2 Earth–Moon-distance bound; counted as not captured.' } },
        { zh: '主天体', en: 'primary', def: { zh: '提供引力场的两个大天体；本作品里是地球与月球。', en: 'The two massive bodies providing the field: here the Earth and the Moon.' } },
        { zh: '质心', en: 'barycentre', def: { zh: '两主天体的质量加权中心，本作品坐标系的原点。注意地月质心在地球内部。', en: 'The mass-weighted centre of the two primaries and the origin here. Note the Earth–Moon barycentre lies inside the Earth.' } },
        { zh: '归一化单位', en: 'normalized units', def: { zh: '长度以两主天体间距为 1、时间以公转角速度为 1 的单位制；地月系统中 1 时间单位 ≈ 4.35 天。', en: 'Units where the primary separation is 1 and the orbital angular rate is 1; in the Earth–Moon system one time unit ≈ 4.35 days.' } },
        { zh: '四阶龙格-库塔法', en: 'fourth-order Runge–Kutta', def: { zh: '本作品使用的定步长积分方法（RK4），步长 0.002 时间单位。', en: 'The fixed-step integrator used here (RK4), with a step of 0.002 time units.' } },
        { zh: '平衡残差', en: 'equilibrium residual', def: { zh: '|∇Ω| 在求得的平动点上的取值，用于检验求根是否真的收敛。', en: 'The value of |∇Ω| at a computed point, used to check that root-finding really converged.' } },
        { zh: '反向验证', en: 'reverse verification', def: { zh: '故意注入已知缺陷，确认判定器会失败，以证明判定有效。', en: 'Injecting a known defect to confirm a checker fails — proving the check works.' } }
      ]
    },

    /* ---------------- 来源与披露 ---------------- */
    {
      type: 'sources', id: 'src', nav: { zh: '来源', en: 'Sources' },
      eyebrow: { zh: '07 来源与披露', en: '07 Sources & disclosure' },
      title: { zh: '每一条事实的去处', en: 'Where every fact comes from' },
      lead: {
        zh: '本作品把材料严格分成两类：来自公开资料的"事实"，与由本作品算法算出的"实测"。两类不混写、不互证。下面逐条列出。',
        en: 'Materials fall into two classes: facts from public sources, and measurements computed by this work. They are never mixed or used to corroborate each other. Both are listed below.'
      },
      refs: [
        { text: { zh: 'NASA Moon Fact Sheet（月球质量 7.342×10²² kg、平均地月距离 384 400 km、恒星周期 27.3217 天）：nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html', en: 'NASA Moon Fact Sheet (lunar mass 7.342×10²² kg, mean Earth–Moon distance 384 400 km, sidereal period 27.3217 d): nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html' } },
        { text: { zh: 'NASA Science《What is a Lagrange point?》——五个平动点的通俗说明与 L1/L2 任务示例：science.nasa.gov/resource/what-is-a-lagrange-point/', en: 'NASA Science, “What is a Lagrange point?” — a plain-language account of the five points and of L1/L2 missions: science.nasa.gov/resource/what-is-a-lagrange-point/' } },
        { text: { zh: 'Murray & Dermott, <b>Solar System Dynamics</b>, Cambridge University Press, 1999（第 3 章）——CR3BP 有效势、雅可比常数与三角点稳定性的标准推导（教材引用，非网络来源）', en: 'Murray & Dermott, <b>Solar System Dynamics</b>, Cambridge University Press, 1999 (ch. 3) — standard derivation of the CR3BP effective potential, Jacobi constant and triangular-point stability (textbook reference)' } },
        { text: { zh: 'Routh 判据与阈值 μ = (1−√(23/27))/2 ≈ 0.03852：天体力学教材与论文中的通行结论（公开资料常见表述），本作品在代码中独立实现并写成断言', en: 'The Routh criterion and threshold μ = (1−√(23/27))/2 ≈ 0.03852: a standard result in celestial-mechanics texts and papers (commonly cited), implemented independently here and asserted' } },
        { text: { zh: '本作品算法与实测：algo.js（五点求根/雅可比/零速度面/稳定性/传播/捕获判定）；同一内核的断言脚本 `test/t01.test.cjs` 随赛档附送，47 条断言可用 `node test/t01.test.cjs` 复跑，`test/lpoints.json` 为五点实测表', en: 'This work’s algorithm and measurements: algo.js (root-finding, Jacobi, zero-velocity surfaces, stability, propagation, capture check); the matching assertion script `test/t01.test.cjs` ships with the entry pack, its 47 assertions re-runnable with `node test/t01.test.cjs`, and `test/lpoints.json` holds the measured point table' } },
        { text: { zh: '三维临场台（同一内核的 z 扩展）：<a href="../地月驿站L5-三维临场台/index.html">打开三维临场台</a> —— 三维零速度面、L1 门洞净高 0.562 D、三角点垂直模 27.31 天与越界翻面；33 项三维断言可用 <code>node test/t01-3d.test.cjs</code> 单独复跑', en: '3D console (the same kernel extended in z): <a href="../%E5%9C%B0%E6%9C%88%E9%A9%BF%E7%AB%99L5-%E4%B8%89%E7%BB%B4%E4%B8%B4%E5%9C%BA%E5%8F%B0/index.html">open the 3D console</a> — 3D zero-velocity surfaces, the 0.562 D L1 gate, the 27.31-day vertical mode at the triangular points and the out-of-plane flip; its 33 3D checks re-run with <code>node test/t01-3d.test.cjs</code>' } },
        { text: { zh: '科幻设定：12 个舱段的功能、驿站的情节与全部视觉均为本作品原创设定，不对应任何真实航天工程方案，也未使用任何真实任务的图纸或照片', en: 'Fiction: the twelve bays, the station’s story and all visuals are original settings of this work; they correspond to no real space programme and use no drawings or photographs from real missions' } }
      ],
      disclosure: [
        {
          title: { zh: 'AI 工具使用情况', en: 'Use of AI tools' },
          text: {
            zh: [
              '文本：初稿由大语言模型辅助起草，团队逐条核校事实与表述；凡无出处的历史与工程表述一律改为"公开资料常见表述"或删除。',
              '代码：物理内核、界面与断言由团队开发；大语言模型参与代码建议与排错。每条断言的真伪由实际运行结果决定，不由模型声称。',
              '图像：全部由本作品代码实时生成（Canvas 2D 绘制），未使用任何生成式图像模型，未使用任何真实任务照片。作品不含音频：没有 Web Audio、没有任何声音素材，界面也不提供试听——"纯视觉 + 纯 Canvas"是刻意选择。'
            ],
            en: [
              'Text: drafted with LLM assistance, then fact-checked line by line; any historical or engineering statement without a source was hedged as “commonly cited” or removed.',
              'Code: the physics core, interface and assertions were developed by the team; the LLM was used for suggestions and debugging. Whether an assertion holds is decided by running it.',
              'Images: every image is generated in real time by this work’s code (Canvas 2D). No generative image model was used and no photograph from a real mission appears. The work contains no audio at all — no Web Audio, no sound assets, no listening feature; purely visual, purely Canvas, by design.'
            ]
          }
        },
        {
          title: { zh: '第三方资源与许可', en: 'Third-party resources' },
          text: {
            zh: ['无。作品零外部依赖：不加载任何网络资源、外部字体、第三方 JS 库、音频或图片素材。所有字形使用系统字体。'],
            en: ['None. The work has zero external dependencies: no network resources, web fonts, third-party JS libraries, audio or images. Typefaces are system fonts.']
          }
        },
        {
          title: { zh: '团队分工与原创贡献（匿名）', en: 'Team roles and original contribution (anonymized)' },
          text: {
            zh: [
              '成员 A：物理内核与前端开发（五点求根、雅可比与零速度面、RK4 传播、捕获判定、交互台与绘图）。',
              '成员 B：天体力学资料核校与文案（参数核对、术语释义、来源比对、删除无出处表述）。',
              '成员 C：视觉设计与展示材料（封面母题、12 舱段图形、截图与演示视频）。',
              '指导教师：内容导向与原创性把关。'
            ],
            en: [
              'Member A: physics core and front end (root-finding, Jacobi and zero-velocity surfaces, RK4 propagation, capture verdict, the bench and drawing).',
              'Member B: verification and writing (parameter checks, definitions, source comparison, removal of unsourced statements).',
              'Member C: visual design and presentation (cover motif, the twelve bay graphics, screenshots and demo video).',
              'Supervising teacher: content orientation and originality review.'
            ]
          }
        },
        {
          title: { zh: '已知局限（如实声明）', en: 'Known limitations (stated plainly)' },
          text: {
            zh: [
              '作品只做平面圆型限制性三体问题：不含月球轨道偏心率、太阳引力与四体效应，因此不能用于真实任务定轨。',
              '"捕获驻留"是本作品自定义的可调判据，不是文献标准；换阈值就会换结论，这一点已在界面与文档中写明。',
              '数值积分是定步长 RK4，步长 0.002；贴近主天体时会失控，因此设置了 0.02 的碰撞阈值。',
              '驿站 12 舱段与全部情节为科幻设定，不对应任何真实工程方案；作品不主张任何工程可行性。'
            ],
            en: [
              'The work solves only the planar CR3BP: no lunar eccentricity, no solar gravity, no four-body effects, so it is not usable for real orbit determination.',
              '“Capture-dwell” is a custom, adjustable criterion of this work, not a literature standard; change the threshold and the verdict changes, as stated in the interface and documents.',
              'Integration is fixed-step RK4 with step 0.002; it breaks down near the primaries, hence the 0.02 impact threshold.',
              'The twelve bays and the whole story are fiction and correspond to no real engineering programme; no engineering feasibility is claimed.'
            ]
          }
        }
      ]
    }
  ]
};
