/* 一年级10月数学练习 · 学生端
 * 流程：封面 → 选名字（ClassCode.loadOrPrompt）→ 一题一屏 → 交卷（一次 insert）→ 完成页（可重做错题 attempt+1）
 * 题库与对错判断全部来自 bank.js（LatihanBank），本档只管画面、作答控件、存档、送出。
 * 题干朗读句子集中在 SAY；改任何一句都要重跑 `python3 gen-voice.py`。 */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const Bank = window.LatihanBank;
const TABLE = 'tahun1_mt_latihan_okt_answers';
const ITEMS = Bank.items;
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
const SECTION = Object.fromEntries(Bank.sections.map(s => [s.no, s.title]));

/* ───────────── 朗读（edge-tts 预录，不用浏览器 speechSynthesis）───────────── */
const VOICE = 'zh-CN-XiaoxiaoNeural';
const SAY = {
  'q1-1': '涂上颜色的部分，用文字写出来，是几分之几？',
  'q1-2': '涂上颜色的部分，用文字写出来，是几分之几？',
  'q2-1': '把图形涂上颜色，涂出四分之二。点一下格子涂色，再点一下就取消。',
  'q3-1': '五十仙，加二十仙，等于多少仙？',
  'q3-2': '十令吉，加二令吉，等于多少令吉？',
  'q3-3': '九十仙，减三十仙，等于多少仙？',
  'q3-4': '两张五令吉的钞票，一共是多少令吉？',
  'q4-1': '这两枚硬币，合起来是多少钱？选一个。',
  'q4-2': '这张钞票是多少钱？选一个。',
  'q4-3': '这张钞票是多少钱？选一个。',
  'q5-1': '一枚二十仙，可以换成几枚十仙？',
  'q5-2': '一张一令吉，可以换成几枚五十仙？',
  'q6-1': '依序填写星期。星期日的后面，第一个空格是星期几？',
  'q6-2': '第二个空格是星期几？',
  'q7-1': '钟面上是几时？',
  'q7-2a': '箭头 a 指的是时针，还是分针？',
  'q7-2b': '箭头 b 指的是时针，还是分针？',
  'q8a': '看图，这是什么时段？',
  'q8b': '看图，这是什么时段？',
  'q9-1': '丽丽有一个蛋糕，她吃了四分之二，弟弟吃了四分之一，还剩下几分之几的蛋糕？',
  'q9-2': '把剩下的蛋糕涂上颜色。',
  'q10a': '妹妹一共有多少零用钱？',
  'q10b': '妹妹想买一个二令吉的文具，她还缺多少钱？',
  'q11a': '这个立体叫什么名称？',
  'q11b': '这个立体，有几个平面、几个曲面、几个顶点？',
  'q12': '静静把七杯一样多的橙汁拿给客人喝，桌上还有两杯。静静一共准备了多少杯橙汁？',
  'q13a': '哪一班吃了六片三文治？每个三角形，代表两片。',
  'q13b': '一年级 A 班到 D 班，一共吃了多少片三文治？',
  'q13c': '哪一班吃的三文治最多？',
};
function clipKey(voice, text) {            // FNV-1a 32 位（UTF-8），gen-voice.py 用同一个算法
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(voice + '|' + text)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
function allVoiceLines() {
  return ITEMS.map(i => ({ id: i.id, text: SAY[i.id], voice: VOICE, key: clipKey(VOICE, SAY[i.id]) }));
}
const Voice = {
  audio: null,
  say(id) {
    this.stop();
    const key = clipKey(VOICE, SAY[id]);
    if (!(window.VOICE_CLIPS && window.VOICE_CLIPS[key])) return;
    const au = new Audio(`audio/${key}.mp3`);
    this.audio = au;
    au.play().catch(() => {});
    $$('.speak').forEach(b => b.classList.add('on'));
    au.onended = () => $$('.speak').forEach(b => b.classList.remove('on'));
  },
  stop() { if (this.audio) { this.audio.pause(); this.audio = null; } $$('.speak').forEach(b => b.classList.remove('on')); },
};

/* ───────────── 每题的画面（图、题干、提示）───────────── */
const svg = (w, h, inner, cls = '') => `<svg class="fig-svg ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="" focusable="false">${inner}</svg>`;
const img = (src, alt, cls = '') => `<img class="fig-img ${cls}" src="assets/${src}" alt="${alt}" draggable="false">`;

function pieSvg() {   // 圆分四份，涂了右上、右下、左下（左上空白）
  const P = '#F7A1A8', L = '#4A4F57';
  const q = (d, f) => `<path d="${d}" fill="${f}" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/>`;
  return svg(200, 200,
    q('M100 100 L100 10 A90 90 0 0 1 190 100 Z', P) + q('M100 100 L190 100 A90 90 0 0 1 100 190 Z', P) +
    q('M100 100 L100 190 A90 90 0 0 1 10 100 Z', P) + q('M100 100 L10 100 A90 90 0 0 1 100 10 Z', '#fff'), 'pie');
}
function diamondSvg() {   // 菱形被十字分成四份，涂了左上
  const L = '#4A4F57';
  return svg(200, 200,
    `<path d="M100 8 L100 100 L12 100 Z" fill="#3F6FD8" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M100 8 L188 100 L100 100 Z" fill="#fff" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M12 100 L100 100 L100 192 Z" fill="#fff" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M100 100 L188 100 L100 192 Z" fill="#fff" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/>`, 'diamond');
}
function clockSvg(h, m, arrows) {
  const cx = 100, cy = 100, R = 90, L = '#2F3138';
  const pt = (deg, r) => [cx + r * Math.sin(deg * Math.PI / 180), cy - r * Math.cos(deg * Math.PI / 180)];
  let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="${L}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="${R - 6}" fill="none" stroke="${L}" stroke-width="1.2"/>`;
  for (let i = 0; i < 60; i++) { const a = i * 6, big = i % 5 === 0, [x1, y1] = pt(a, R - 7), [x2, y2] = pt(a, R - (big ? 16 : 11)); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${L}" stroke-width="${big ? 2.6 : 1.1}"/>`; }
  for (let n = 1; n <= 12; n++) { const [x, y] = pt(n * 30, R - 28); s += `<text x="${x}" y="${y + 6}" text-anchor="middle" font-family="Baloo 2, Noto Sans SC, sans-serif" font-weight="800" font-size="17" fill="${L}">${n}</text>`; }
  const ha = (h % 12) * 30 + m * 0.5, ma = m * 6;
  const [hx, hy] = pt(ha, 50), [mx, my] = pt(ma, 74);
  s += `<line x1="${cx}" y1="${cy}" x2="${hx}" y2="${hy}" stroke="${L}" stroke-width="7" stroke-linecap="round"/>`;
  s += `<line x1="${cx}" y1="${cy}" x2="${mx}" y2="${my}" stroke="${L}" stroke-width="3.6" stroke-linecap="round"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="5.5" fill="${L}"/>`;
  if (!arrows) return svg(200, 200, s, 'clock');
  const B = '#2F5FAE';
  s += `<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${B}"/></marker></defs>`;
  const [ax, ay] = pt(ha, 40), [bx, by] = pt(ma, 44);
  [[262, 44, ax + 3, ay - 2], [262, 158, bx + 3, by + 3]].forEach(([x1, y1, x2, y2]) => {
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`;
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${B}" stroke-width="3" marker-end="url(#ah)"/>`;
  });
  s += `<g font-family="Baloo 2, Noto Sans SC, sans-serif" font-weight="800" font-size="26" fill="${B}"><rect x="262" y="22" width="44" height="44" rx="10" fill="#fff" stroke="${B}" stroke-width="3"/><text x="284" y="53" text-anchor="middle">a</text><rect x="262" y="136" width="44" height="44" rx="10" fill="#fff" stroke="${B}" stroke-width="3"/><text x="284" y="167" text-anchor="middle">b</text></g>`;
  return svg(320, 200, s, 'clock wide');
}
function cylinderSvg() {
  const L = '#2F3138;';
  return svg(200, 220,
    `<path d="M40 50 V160 A60 22 0 0 0 160 160 V50" fill="#EAF0FB" stroke="#2F3138" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<ellipse cx="100" cy="50" rx="60" ry="22" fill="#fff" stroke="#2F3138" stroke-width="3.5"/>` +
    `<path d="M40 160 A60 22 0 0 0 160 160" fill="none" stroke="#2F3138" stroke-width="3.5"/>`, 'cyl');
}
function cupsSvg() {
  const cup = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 0 H26 L22 36 H4 Z" fill="#FFB347" stroke="#2F3138" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="13" cy="0" rx="13" ry="3.5" fill="#FFD58A" stroke="#2F3138" stroke-width="2.2"/></g>`;
  let s = `<rect x="6" y="40" width="190" height="10" rx="4" fill="#C9B38A" stroke="#2F3138" stroke-width="2"/>`;
  for (let i = 0; i < 7; i++) s += cup(12 + i * 26, 4);
  s += `<rect x="214" y="40" width="80" height="10" rx="4" fill="#C9B38A" stroke="#2F3138" stroke-width="2"/>`;
  s += cup(226, 4) + cup(256, 4);
  s += `<text x="101" y="82" text-anchor="middle" font-family="Noto Sans SC, sans-serif" font-weight="700" font-size="17" fill="#2F3138">7 杯一样多</text>`;
  s += `<text x="254" y="82" text-anchor="middle" font-family="Noto Sans SC, sans-serif" font-weight="700" font-size="17" fill="#2F3138">桌上还有 2 杯</text>`;
  return svg(300, 94, s, 'cups wide');
}
function tri() { return `<svg class="tri" viewBox="0 0 28 26" aria-hidden="true"><path d="M14 2 L26 24 H2 Z" fill="#9AA0A8" stroke="#4A4F57" stroke-width="2" stroke-linejoin="round"/></svg>`; }
function chartHtml() {
  const rows = [['1A', 2], ['1B', 4], ['1C', 3], ['1D', 5]];
  return `<table class="chart" aria-label="三文治数量图表"><thead><tr><th>班级</th><th>三文治数量</th></tr></thead><tbody>` +
    rows.map(([c, n]) => `<tr><th scope="row">${c}</th><td>${tri().repeat(n)}</td></tr>`).join('') +
    `</tbody></table><p class="legend">${tri()} 代表 2 个三文治</p>`;
}
function moneyImgs(arr) { return `<div class="money-row">${arr.map(([f, a]) => img(f, a)).join('')}</div>`; }
const COIN = { 50: ['coin-50sen.png', '50 sen 硬币'], 20: ['coin-20sen.png', '20 sen 硬币'], 10: ['coin-10sen.png', '10 sen 硬币'] };

// kind 'cells'：fig 为 null，由 renderCells 画可点的格子
const UI = {
  'q1-1': { fig: () => pieSvg(), q: '涂上颜色的部分，是几分之几？', hint: '圆分成 4 份，涂了 3 份，所以是四分之三。' },
  'q1-2': { fig: () => diamondSvg(), q: '涂上颜色的部分，是几分之几？', hint: '图形分成 4 份，涂了 1 份，所以是四分之一。' },
  'q2-1': { cells: { cols: 4, rows: 1, cls: 'strips' }, q: '涂出「四分之二」。点格子涂色，再点一下取消。', hint: '四分之二：4 格里涂 2 格。' },
  'q3-1': { expr: '50 sen + 20 sen =', q: '算一算', hint: '50 加 20 等于 70，所以是 70 sen。' },
  'q3-2': { expr: 'RM 10 + RM 2 =', q: '算一算', hint: '10 加 2 等于 12，所以是 RM 12。' },
  'q3-3': { expr: '90 仙 – 30 仙 =', q: '算一算', hint: '90 减 30 等于 60，所以是 60 仙。' },
  'q3-4': { fig: () => moneyImgs([['rm5-note.png', 'RM5 钞票'], ['rm5-note.png', 'RM5 钞票']]), q: '两张 RM5，一共是多少？', hint: '5 + 5 = 10，两张 RM5 是 RM10。' },
  'q4-1': { fig: () => moneyImgs([COIN[50], COIN[20]]), q: '这两枚硬币，合起来是多少钱？', hint: '50 仙加 20 仙，是 70 仙。' },
  'q4-2': { fig: () => moneyImgs([['rm10-note.png', 'RM10 钞票']]), q: '这张钞票是多少钱？', hint: '钞票上的大数字是 10，是 10 令吉。' },
  'q4-3': { fig: () => moneyImgs([['rm1-note.png', 'RM1 钞票']]), q: '这张钞票是多少钱？', hint: '钞票上的数字是 1，是 RM1（1 令吉）。' },
  'q5-1': { fig: () => `<div class="money-row">${img(COIN[20][0], COIN[20][1])}<span class="arrow">→</span>${img(COIN[10][0], COIN[10][1])}<small>10 sen</small></div>`, q: '1 枚 20 sen，可以换成几枚 10 sen？', hint: '10 sen + 10 sen = 20 sen，所以换 2 枚。' },
  'q5-2': { fig: () => `<div class="money-row">${img('rm1-note.png', 'RM1 钞票')}<span class="arrow">→</span>${img(COIN[50][0], COIN[50][1])}<small>50 sen</small></div>`, q: '1 张 RM1，可以换成几枚 50 sen？', hint: '50 sen + 50 sen = RM1，所以换 2 枚。' },
  'q6-1': { flow: 0, q: '依序填写星期：第一个空格填星期几？', hint: '星期日、星期一、星期二、星期三。' },
  'q6-2': { flow: 1, q: '第二个空格填星期几？', hint: '星期日、星期一、星期二、星期三。' },
  'q7-1': { fig: () => clockSvg(5, 0), q: '钟面上是几时？', hint: '分针指着 12，时针指着 5，是 5 时。' },
  'q7-2a': { fig: () => clockSvg(1, 45, true), q: '箭头 a 指的是时针还是分针？', hint: '又短又粗的是时针（指小时）。' },
  'q7-2b': { fig: () => clockSvg(1, 45, true), q: '箭头 b 指的是时针还是分针？', hint: '又细又长的是分针（指分钟）。' },
  'q8a': { fig: () => img('scene-laundry.jpg', '男孩在院子里晾衣服，太阳高高挂着', 'scene'), q: '图里是什么时段？', hint: '太阳高高挂着，是中午。' },
  'q8b': { fig: () => img('scene-sleep.jpg', '男孩在床上睡觉，窗外有月亮和星星', 'scene'), q: '图里是什么时段？', hint: '窗外有月亮和星星，在睡觉，是晚上。' },
  'q9-1': { cells: { cols: 2, rows: 2, cls: 'cake', locked: true }, q: '丽丽有一个蛋糕，她吃了四分之二，弟弟吃了四分之一，还剩下几分之几的蛋糕？', hint: '吃了 2 + 1 = 3 份，4 份减 3 份，还剩 1 份，是四分之一。' },
  'q9-2': { cells: { cols: 2, rows: 2, cls: 'cake' }, q: '把剩下的蛋糕涂上颜色。点格子涂色，再点一下取消。', hint: '还剩四分之一，所以只涂 1 格。' },
  'q10a': { fig: () => moneyImgs([COIN[50], COIN[20], COIN[20], COIN[10]]), q: '妹妹一共有多少零用钱？', hint: '50 + 20 + 20 + 10 = 100 sen，100 sen 就是 RM1。' },
  'q10b': { fig: () => moneyImgs([COIN[50], COIN[20], COIN[20], COIN[10]]), q: '妹妹想买一个 RM2 的文具，她还缺多少钱？', hint: '妹妹有 RM1，RM2 减 RM1，还缺 RM1。' },
  'q11a': { fig: () => cylinderSvg(), q: '写出这个立体的名称。', hint: '上下是圆形，中间是弯弯的面，是圆柱体。' },
  'q11b': { fig: () => cylinderSvg(), q: '这个立体有几个平面、几个曲面、几个顶点？', hint: '上下有 2 个平面，侧面是 1 个曲面，没有尖尖的顶点。' },
  'q12': { fig: () => cupsSvg(), q: '静静把 7 杯一样多的橙汁拿给客人喝，桌上还有 2 杯。静静共准备了多少杯橙汁？', hint: '7 + 2 = 9，共准备了 9 杯。' },
  'q13a': { fig: () => chartHtml(), q: '哪一班吃了 6 片三文治？', hint: '▲ 代表 2 片，6 ÷ 2 = 3，要找 3 个 ▲ 的班：1C。' },
  'q13b': { fig: () => chartHtml(), q: '1A 到 1D 班，一共吃了多少片三文治？', hint: '▲ 一共 2+4+3+5 = 14 个，14 × 2 = 28 片。' },
  'q13c': { fig: () => chartHtml(), q: '哪一班吃的三文治最多？', hint: '1D 有 5 个 ▲，最多。' },
};

/* ───────────── 状态与存档 ───────────── */
const S = {
  name: '', inRoster: false, playCode: '', roster: [],
  answers: {}, cells: {}, idx: 0, attempt: 1, ids: ITEMS.map(i => i.id),
  phase: 'quiz',        // quiz | done | failed
  pending: null,        // 没送出去的 rows
  field: 0,             // multi 当前输入的小项
};
const storeKey = () => `latihan-okt:${S.playCode}:${S.name}`;
function save() {
  try {
    localStorage.setItem(storeKey(), JSON.stringify({ v: 1, answers: S.answers, cells: S.cells, idx: S.idx, attempt: S.attempt, ids: S.ids, phase: S.phase, pending: S.pending }));
  } catch (e) { /* 存不了就算了，不影响作答 */ }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(storeKey()) || 'null');
    if (!d || d.v !== 1) return false;
    Object.assign(S, { answers: d.answers || {}, cells: d.cells || {}, idx: d.idx || 0, attempt: d.attempt || 1, ids: d.ids || S.ids, phase: d.phase || 'quiz', pending: d.pending || null });
    return true;
  } catch (e) { return false; }
}
function resetState() { Object.assign(S, { answers: {}, cells: {}, idx: 0, attempt: 1, ids: ITEMS.map(i => i.id), phase: 'quiz', pending: null, field: 0 }); }
const curId = () => S.ids[S.idx];
const isAnswered = id => { const v = S.answers[id]; return v !== undefined && v !== null && v !== ''; };

/* ───────────── 画面切换 ───────────── */
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === id));
  document.body.classList.toggle('in-quiz', id !== 'cover' && id !== 'pick');
  window.scrollTo(0, 0);
}

/* ───────────── 选名字 ───────────── */
async function openPick() {
  show('pick');
  const grid = $('#pickGrid'), sub = $('#pickSub');
  grid.innerHTML = ''; $('#btnManual').hidden = true; $('#btnPickRetry').hidden = true;
  sub.textContent = '正在读取班级名单…';
  let roster = [];
  try { roster = (typeof ClassCode !== 'undefined') ? await ClassCode.loadOrPrompt() : []; } catch (e) { roster = []; }
  S.roster = Array.isArray(roster) ? roster : [];
  if (!S.roster.length) {
    sub.textContent = '没有读到班级名单。请检查网络，或向老师要班级代码。';
    $('#btnPickRetry').hidden = false;
    return;
  }
  sub.textContent = '点一下你的名字';
  S.roster.forEach(st => {
    const b = document.createElement('button');
    b.className = 'name-btn';
    const nm = st.nameZh || st.name || st.nameEn || '';
    b.innerHTML = `${st.seatNo != null ? `<small>${st.seatNo}</small>` : ''}<span></span>`;
    b.querySelector('span').textContent = nm;
    b.onclick = () => beginAs(nm, true, st.playCode);
    grid.appendChild(b);
  });
  $('#btnManual').hidden = false;
}
function beginAs(name, inRoster, playCode) {
  S.name = name; S.inRoster = inRoster; S.playCode = playCode || (S.roster[0] && S.roster[0].playCode) || '';
  resetState();
  const resumed = load();
  if (resumed && S.phase === 'failed' && S.pending) { show('failed'); return; }
  if (resumed && S.phase === 'done') { renderDone(); return; }
  if (S.idx >= S.ids.length) S.idx = 0;
  startQuiz();
}
function startQuiz() {
  S.phase = 'quiz'; save();
  $('#qWho').textContent = S.name;
  show('quiz'); renderItem();
}

/* ───────────── 渲染一题 ───────────── */
function fmtUnit(item, n) {
  const u = item.entry.unit;
  if (!u) return String(n);
  return u === 'RM' ? `RM ${n}` : `${n} ${u}`;
}
function fmtAnswer(item, v) {
  if (v === undefined || v === null || v === '') return '（没做）';
  const k = item.entry.kind;
  if (k === 'choice') return String(v);
  if (k === 'cells') return `涂了 ${v} 格`;
  if (k === 'multi') return item.entry.fields.map(f => `${f.label} ${v[f.key] == null ? '?' : v[f.key]} ${f.unit || ''}`).join('，');
  return fmtUnit(item, v);
}
function fmtCorrect(item) {
  const k = item.entry.kind;
  if (k === 'cells') return `涂 ${item.correct} 格`;
  return fmtAnswer(item, item.correct);
}

function renderItem() {
  Voice.stop();
  const id = curId(), item = ITEM[id], ui = UI[id], n = S.ids.length;
  $('#qCount').textContent = `第 ${S.idx + 1} 题 / 共 ${n} 题`;
  $('#qProgFill').style.width = `${((S.idx + 1) / n) * 100}%`;
  const pg = $('#qProg'); pg.setAttribute('aria-valuemax', n); pg.setAttribute('aria-valuenow', S.idx + 1);
  $('#btnPrev').disabled = S.idx === 0;
  $('#btnNext').textContent = S.idx === n - 1 ? '交卷' : '下一题';
  const body = $('#qBody');
  const retry = S.attempt > 1 ? `<span class="tag-retry">再试一次</span>` : '';
  let figure = '';
  if (ui.fig) figure = `<div class="figure">${ui.fig()}</div>`;
  else if (ui.expr) figure = `<div class="figure expr">${ui.expr}</div>`;
  else if (ui.flow !== undefined) figure = `<div class="figure">${flowHtml(ui.flow)}</div>`;
  else if (ui.cells) figure = `<div class="figure">${cellsHtml(id, ui.cells)}</div>`;
  body.innerHTML = `
    <div class="q-card">
      <div class="q-head">
        <span class="sec-badge" aria-label="第 ${item.section} 大题">${item.section}</span>
        <span class="sec-title"><span>${SECTION[item.section]}</span></span>
        ${retry}
        <button class="speak" id="btnSpeak" aria-label="读题"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.6 5.8a9 9 0 0 1 0 12.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      </div>
      <div class="q-main">
        <div class="q-left">${figure}<p class="q-text">${ui.q}</p></div>
        <div class="q-right" id="ans"></div>
      </div>
    </div>`;
  $('#btnSpeak').onclick = () => Voice.say(id);
  renderAnswer(id);
}

function flowHtml(which) {
  const a1 = S.answers['q6-1'], a2 = S.answers['q6-2'];
  const box = (t, cls = '') => `<span class="day ${cls}">${t || ''}</span>`;
  return `<div class="flow">${box('星期日', 'fixed')}<i>→</i>${box(a1, which === 0 ? 'active' : '')}<i>→</i>${box(a2, which === 1 ? 'active' : '')}<i>→</i>${box('星期三', 'fixed')}</div>`;
}
function cellsHtml(id, c) {
  const total = c.cols * c.rows, painted = S.cells[id] || [];
  let s = `<div class="cells ${c.cls}" style="--cols:${c.cols}" role="group" aria-label="${c.locked ? '蛋糕，分成 4 份' : '点格子涂色'}">`;
  for (let i = 0; i < total; i++) {
    s += c.locked ? `<span class="cell locked"></span>` : `<button class="cell${painted[i] ? ' on' : ''}" data-i="${i}" aria-pressed="${!!painted[i]}" aria-label="第 ${i + 1} 格"></button>`;
  }
  return s + `</div>` + (c.locked ? '' : `<p class="cells-count" id="cellsCount"></p>`);
}

/* ───────────── 作答控件 ───────────── */
function renderAnswer(id) {
  const item = ITEM[id], ui = UI[id], box = $('#ans'), k = item.entry.kind;
  if (k === 'choice') renderChoice(item, box);
  else if (k === 'number') renderNumber(item, box);
  else if (k === 'multi') renderMulti(item, box);
  else if (k === 'cells') renderCells(item, box, ui);
}
function renderChoice(item, box) {
  box.innerHTML = `<div class="chips" role="radiogroup">${item.entry.options.map(o => `<button class="chip${S.answers[item.id] === o ? ' on' : ''}" role="radio" aria-checked="${S.answers[item.id] === o}" data-v="${o}">${o}</button>`).join('')}</div>`;
  $$('.chip', box).forEach(b => b.onclick = () => {
    S.answers[item.id] = b.dataset.v; save();
    $$('.chip', box).forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    if (item.id === 'q6-1' || item.id === 'q6-2') { const f = $('.flow'); if (f) f.outerHTML = flowHtml(item.id === 'q6-1' ? 0 : 1); }
  });
}
function keypadHtml() {
  const k = n => `<button class="key" data-k="${n}">${n}</button>`;
  return `<div class="keypad" aria-label="数字键盘">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k).join('')}<button class="key fn" data-k="clear">清除</button>${k(0)}<button class="key fn" data-k="back" aria-label="退格">&#9003;</button></div>`;
}
function numBox(field, val, active, label) {
  return `<span class="numbox${active ? ' active' : ''}" data-f="${field}" ${label ? `aria-label="${label}"` : ''}>${val === undefined || val === null ? '' : val}</span>`;
}
function renderNumber(item, box) {
  const u = item.entry.unit, v = S.answers[item.id];
  const pre = u === 'RM' ? `<span class="unit">RM</span>` : '', suf = u && u !== 'RM' ? `<span class="unit">${u}</span>` : '';
  box.innerHTML = `<div class="numline">${pre}${numBox('v', v, true, '你的答案')}${suf}</div>${keypadHtml()}`;
  $$('.key', box).forEach(b => b.onclick = () => pressKey(item, b.dataset.k));
}
function renderMulti(item, box) {
  const v = S.answers[item.id] || {};
  box.innerHTML = `<div class="multi">${item.entry.fields.map((f, i) =>
    `<button class="mfield${i === S.field ? ' active' : ''}" data-i="${i}"><span class="mlabel">${f.label}</span>${numBox(f.key, v[f.key], false)}<span class="unit">${f.unit || ''}</span></button>`).join('')}</div>${keypadHtml()}`;
  $$('.mfield', box).forEach(b => b.onclick = () => { S.field = +b.dataset.i; renderMulti(item, box); });
  $$('.key', box).forEach(b => b.onclick = () => pressKey(item, b.dataset.k));
}
function pressKey(item, key) {
  const multi = item.entry.kind === 'multi';
  const f = multi ? item.entry.fields[S.field] : item.entry;
  const cur = multi ? ((S.answers[item.id] || {})[f.key]) : S.answers[item.id];
  let s = cur === undefined || cur === null ? '' : String(cur);
  if (key === 'clear') s = '';
  else if (key === 'back') s = s.slice(0, -1);
  else {
    const t = (s === '0' ? '' : s) + key;
    if (t.length <= String(f.max).length && +t <= f.max) s = t;
  }
  let val = s === '' ? undefined : +s;
  if (multi) {
    const o = Object.assign({}, S.answers[item.id] || {});
    if (val === undefined) delete o[f.key]; else o[f.key] = val;
    if (Object.keys(o).length) S.answers[item.id] = o; else delete S.answers[item.id];
    $$(`.numbox[data-f="${f.key}"]`)[0].textContent = val === undefined ? '' : val;
  } else {
    if (val === undefined) delete S.answers[item.id]; else S.answers[item.id] = val;
    $('.numbox').textContent = val === undefined ? '' : val;
  }
  save();
}
function renderCells(item, box, ui) {
  const c = ui.cells, id = item.id;
  const total = c.cols * c.rows;
  const upd = () => { const n = (S.cells[id] || []).filter(Boolean).length; const el = $('#cellsCount'); if (el) el.textContent = isAnswered(id) ? `涂了 ${S.answers[id]} 格` : '还没涂'; };
  box.innerHTML = `<p class="cells-hint">点格子涂色，再点一下取消。</p>`;
  $$('.cell[data-i]').forEach(b => b.onclick = () => {
    const arr = S.cells[id] || (S.cells[id] = new Array(total).fill(false));
    const i = +b.dataset.i; arr[i] = !arr[i];
    b.classList.toggle('on', arr[i]); b.setAttribute('aria-pressed', arr[i]);
    S.answers[id] = arr.filter(Boolean).length; save(); upd();
  });
  upd();
}

/* ───────────── 导航与交卷 ───────────── */
function go(d) {
  const n = S.ids.length, j = S.idx + d;
  if (j < 0) return;
  if (j >= n) { askSubmit(); return; }
  S.idx = j; save(); renderItem();
}
function askSubmit() {
  const miss = S.ids.filter(id => !isAnswered(id));
  const no = $('#btnConfirmNo');
  S.jumpTo = null;
  if (miss.length) {   // 老师 2026-10-16：一定要全部答完才能交卷
    S.jumpTo = S.ids.indexOf(miss[0]);
    $('#confirmMsg').textContent = miss.length === S.ids.length ? '还一题都没做，先做完再交卷吧。' : `还有 ${miss.length} 题没做。要全部做完才能交卷，去做没做的题吧。`;
    $('#btnConfirmYes').hidden = true; no.textContent = '去做没做的题';
  } else {
    $('#confirmMsg').textContent = '全部做完了！交卷后就能看到对了几题。';
    $('#btnConfirmYes').hidden = false; no.textContent = '再看看';
  }
  $('#confirmOverlay').hidden = false;
}
function buildRows() {
  return S.ids.filter(isAnswered).map(id => {
    const g = Bank.grade(id, S.answers[id]);
    return { play_code: S.playCode, student_name: S.name, in_roster: S.inRoster, source: 'online', attempt_no: S.attempt, item_id: id, answer: S.answers[id], is_correct: g.correct, error_tag: g.tag };
  });
}
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }
async function sendRows(rows) {
  if (typeof supabaseClient === 'undefined') throw new Error('no client');
  const { error } = await withTimeout(supabaseClient.from(TABLE).insert(rows), 15000);
  if (error) throw error;
}
async function submit(rows) {
  const btn = $('#btnConfirmYes'), rb = $('#btnRetrySend');
  btn.disabled = rb.disabled = true;
  try {
    await sendRows(rows);
    S.pending = null; S.phase = 'done'; save();
    $('#confirmOverlay').hidden = true;
    renderDone();
  } catch (e) {
    console.warn('送出失败', e);
    S.pending = rows; S.phase = 'failed'; save();
    $('#confirmOverlay').hidden = true;
    $('#failedMsg').textContent = '网络好像不通，你的答案还在，别担心。';
    show('failed');
  } finally { btn.disabled = rb.disabled = false; }
}

/* ───────────── 完成页 ───────────── */
function renderDone() {
  show('done');
  const wrong = ITEMS.filter(it => !(isAnswered(it.id) && Bank.grade(it.id, S.answers[it.id]).correct));
  const right = ITEMS.length - wrong.length;
  $('#score').innerHTML = `<b>${right}</b> / ${ITEMS.length}`;
  $('#scoreMsg').textContent = wrong.length ? `对了 ${right} 题，共 ${ITEMS.length} 题。看看下面这些题。` : '全部做对了，真棒！';
  $('#wrongList').innerHTML = wrong.map(it => `<li><span class="sec-badge sm">${it.section}</span><div><p class="w-label">${it.label}</p><p class="w-ans">你的答案：<b class="mine">${fmtAnswer(it, S.answers[it.id])}</b>　正确答案：<b class="right">${fmtCorrect(it)}</b></p><p class="w-hint">${UI[it.id].hint}</p></div></li>`).join('');
  $('#btnRedo').hidden = wrong.length === 0;
  $('#done').classList.toggle('perfect', wrong.length === 0);
}
function redoWrong() {
  const wrong = ITEMS.filter(it => !(isAnswered(it.id) && Bank.grade(it.id, S.answers[it.id]).correct)).map(i => i.id);
  if (!wrong.length) return;
  wrong.forEach(id => { delete S.answers[id]; delete S.cells[id]; });
  S.ids = wrong; S.idx = 0; S.attempt += 1; S.pending = null; S.field = 0;
  startQuiz();
}

/* ───────────── 事件 ───────────── */
$('#btnStart').onclick = openPick;
$('#btnPickRetry').onclick = openPick;
$('#btnManual').onclick = () => { $('#manualName').value = ''; $('#manualOverlay').hidden = false; setTimeout(() => $('#manualName').focus(), 50); };
$('#btnManualCancel').onclick = () => { $('#manualOverlay').hidden = true; };
$('#manualForm').onsubmit = e => {
  e.preventDefault();
  const n = $('#manualName').value.trim().slice(0, 20);
  if (!n) { $('#manualName').focus(); return; }
  $('#manualOverlay').hidden = true;
  const inRoster = S.roster.some(st => (st.nameZh || st.name || st.nameEn) === n);   // 手动写了名单里的名字就当名单内
  beginAs(n, inRoster, S.roster[0] && S.roster[0].playCode);
};
$('#btnPrev').onclick = () => go(-1);
$('#btnNext').onclick = () => go(1);
$('#btnConfirmNo').onclick = () => { $('#confirmOverlay').hidden = true; if (S.jumpTo != null && S.jumpTo >= 0) { S.idx = S.jumpTo; S.jumpTo = null; save(); renderItem(); } };
$('#btnConfirmYes').onclick = () => { if (S.ids.some(id => !isAnswered(id))) { askSubmit(); return; } const rows = buildRows(); if (rows.length) submit(rows); };
$('#btnRetrySend').onclick = () => { if (S.pending) submit(S.pending); };
$('#btnBackQuiz').onclick = () => { S.phase = 'quiz'; S.idx = Math.max(0, S.ids.length - 1); S.pending = null; startQuiz(); };
$('#btnRedo').onclick = redoWrong;
$('#btnDoneHome').onclick = () => { Voice.stop(); show('cover'); };
document.addEventListener('keydown', e => {
  if (!$('#quiz').classList.contains('is-active') || !$('#confirmOverlay').hidden) return;
  const item = ITEM[curId()];
  if (!item || !['number', 'multi'].includes(item.entry.kind)) return;
  if (/^\d$/.test(e.key)) pressKey(item, e.key);
  else if (e.key === 'Backspace') pressKey(item, 'back');
});

window.__latihan = { S, Bank, SAY, allVoiceLines, clipKey, UI };
