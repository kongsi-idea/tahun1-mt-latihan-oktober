/* 一年级10月数学练习 · 题库（合约一，PLAN.md）
 * 无 DOM、纯数据＋函数。学生工具（app.js）与 Hub 老师后台（kongsi-idea/latihan-admin.js）共用这一份，
 * 所以对错与错误类型只有一个判断来源：LatihanBank.grade(id, answer)。
 *
 * 答案格式（answer / correct）：
 *   choice → 字符串（必须是 entry.options 之一）
 *   number → 整数（grade 也接受 "1"、"1.0"、"RM1"、1.00 这类写法，一律先转成数字再比）
 *   cells  → 涂了几格（整数）
 *   multi  → 对象，如 { plane: 2, curved: 1, vertex: 0 }
 * 没作答（null／undefined／""／全空的 multi）→ { correct:false, tag:"blank" }。
 * 注意：学生端和纸本回填都「不写没作答的题」，blank 只是 grade 自己的防御值。
 *
 * 版本变更规则：改 id、答案格式、entry.kind 要升大版本并通知 B；加 tag 或改中文说明可以升小版本。
 */
(function (root) {
  "use strict";

  const DAYS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const MONEY = ["10 令吉", "70 仙", "RM1"];
  const FRACS = ["四分之一", "四分之二", "四分之三", "四分之四"];
  const SOLIDS = ["圆柱体", "圆锥体", "球体", "正方体", "长方体"];
  const CLASSES = ["1A", "1B", "1C", "1D"];

  const sections = [
    { no: 1, title: "以文字写出涂上颜色部分代表的分数" },
    { no: 2, title: "依照所显示的分数，把图形涂上颜色" },
    { no: 3, title: "写出以下组合的币值" },
    { no: 4, title: "把钱币和其正确的币值连一连" },
    { no: 5, title: "画出左图所能换算到的相等的币值" },
    { no: 6, title: "依序填写星期" },
    { no: 7, title: "根据图片，回答问题（钟面）" },
    { no: 8, title: "看图写出正确的时段" },
    { no: 9, title: "蛋糕应用题（分数）" },
    { no: 10, title: "妹妹的零用钱" },
    { no: 11, title: "认识立体" },
    { no: 12, title: "橙汁应用题" },
    { no: 13, title: "三文治数量图表" },
  ];

  // 错误类型 key → 老师看得懂的中文说明（key 一旦发布就要稳定）
  const tags = {
    blank: "没有作答",
    incomplete: "只填了一部分",
    other: "其他错误（不在常见类型里）",
    // 分数
    "frac-counted-blank": "把没涂色的部分当成涂色部分（涂 3 格却答 1/4，或相反）",
    "frac-miscount": "分子数错（涂色格数没数对）",
    "frac-all-parts": "把全部格数当成答案（四分之四）",
    "frac-numerator-off": "涂色格数不对（没看懂分子是几）",
    "frac-denominator-as-numerator": "把分母当分子（4 格全涂）",
    "cells-none": "一格都没有涂",
    "rest-vs-eaten": "把「吃了的」当成「剩下的」（没有用全部去减）",
    "rest-subtract-once": "只减了一次（只扣掉一个人吃的）",
    // 钱
    "concat-digits": "把两个数字并排写在一起（如 5020、102）",
    "wrong-operation": "运算选错（该加却减，或该加却乘）",
    "calc-slip": "运算方向对但算错了",
    "place-value": "位值错（个位、十位弄混，如 70 写成 7）",
    "count-one-note": "只数了一张钞票",
    "unit-confusion": "没分辨「仙」与「令吉」（只看数字大小）",
    "note-value-misread": "看错钞票面额（RM1 与 RM10）",
    "no-exchange": "没做换算（当成 1 枚）",
    "copy-value": "把面额数字当成枚数",
    "forgot-convert": "忘记把仙换成令吉（写成 100）",
    "no-subtract": "没有相减（只写了文具的价钱）",
    // 星期
    "weekday-swapped": "顺序互换（把后面的星期放前面）",
    "weekday-skip": "跳格（星期顺序没接上）",
    // 时间
    "hour-next-number": "时针读到下一个数字（5 时多一点读成 6）",
    "read-minute-hand": "读了分针指的数字（12）",
    "misread-digit": "钟面数字读错（如 1 与 12）",
    "hands-swapped": "分不清时针与分针（答反了）",
    "daypart-mismatch": "时段与图不符（看到太阳却答晚上）",
    "dusk-vs-night": "分不清傍晚与晚上",
    // 立体
    "solid-name": "立体名称认错",
    "plane-miscount": "平面数错（可能把曲面也算进去）",
    "curved-miscount": "曲面数错",
    "vertex-miscount": "顶点数错（可能把圆的边缘当顶点）",
    // 图表
    "ignore-scale": "没看懂「▲＝2 个」（把▲的个数直接当片数）",
    "chart-misread": "读图表出错（没数清▲）",
  };

  // 每题：judge = { 错答案: tag }，没列到的错答案给 "other"
  // 数字题的 judge key 是数字；选择题是选项字符串；cells 是格数
  const items = [
    // —— 第 1 大题：以文字写出涂上颜色部分代表的分数 ——
    { id: "q1-1", section: 1, label: "圆形涂色部分的分数（涂了 3/4）",
      entry: { kind: "choice", options: FRACS }, correct: "四分之三",
      judge: { "四分之一": "frac-counted-blank", "四分之二": "frac-miscount", "四分之四": "frac-all-parts" } },
    { id: "q1-2", section: 1, label: "菱形涂色部分的分数（涂了 1/4）",
      entry: { kind: "choice", options: FRACS }, correct: "四分之一",
      judge: { "四分之三": "frac-counted-blank", "四分之二": "frac-miscount", "四分之四": "frac-all-parts" } },
    // —— 第 2 大题 ——
    { id: "q2-1", section: 2, label: "四长条涂「四分之二」",
      entry: { kind: "cells", min: 0, max: 4 }, correct: 2,
      judge: { 0: "cells-none", 1: "frac-numerator-off", 3: "frac-numerator-off", 4: "frac-denominator-as-numerator" } },
    // —— 第 3 大题：币值 ——
    { id: "q3-1", section: 3, label: "50 sen + 20 sen =",
      entry: { kind: "number", min: 0, max: 9999, unit: "sen" }, correct: 70,
      judge: { 5020: "concat-digits", 30: "wrong-operation", 7: "place-value" } },
    { id: "q3-2", section: 3, label: "RM 10 + RM 2 =",
      entry: { kind: "number", min: 0, max: 9999, unit: "RM" }, correct: 12,
      judge: { 102: "concat-digits", 8: "wrong-operation" } },
    { id: "q3-3", section: 3, label: "90 仙 – 30 仙 =",
      entry: { kind: "number", min: 0, max: 9999, unit: "仙" }, correct: 60,
      judge: { 120: "wrong-operation", 30: "calc-slip" } },
    { id: "q3-4", section: 3, label: "两张 RM5 = RM___",
      entry: { kind: "number", min: 0, max: 9999, unit: "RM" }, correct: 10,
      judge: { 5: "count-one-note", 55: "concat-digits", 25: "calc-slip" } },
    // —— 第 4 大题：钱币连币值 ——
    { id: "q4-1", section: 4, label: "连线：50 sen + 20 sen 两枚硬币",
      entry: { kind: "choice", options: MONEY }, correct: "70 仙",
      judge: { "10 令吉": "unit-confusion", "RM1": "unit-confusion" } },
    { id: "q4-2", section: 4, label: "连线：RM10 钞票",
      entry: { kind: "choice", options: MONEY }, correct: "10 令吉",
      judge: { "70 仙": "unit-confusion", "RM1": "note-value-misread" } },
    { id: "q4-3", section: 4, label: "连线：RM1 钞票",
      entry: { kind: "choice", options: MONEY }, correct: "RM1",
      judge: { "10 令吉": "note-value-misread", "70 仙": "unit-confusion" } },
    // —— 第 5 大题：换算 ——
    { id: "q5-1", section: 5, label: "20 sen 可换成几枚 10 sen",
      entry: { kind: "number", min: 0, max: 100, unit: "枚" }, correct: 2,
      judge: { 1: "no-exchange", 20: "copy-value", 10: "copy-value" } },
    { id: "q5-2", section: 5, label: "RM1 可换成几枚 50 sen",
      entry: { kind: "number", min: 0, max: 100, unit: "枚" }, correct: 2,
      judge: { 1: "no-exchange", 100: "copy-value", 10: "copy-value", 20: "copy-value" } },
    // —— 第 6 大题：星期 ——
    { id: "q6-1", section: 6, label: "星期日 → （　）→（　）→ 星期三，第一格",
      entry: { kind: "choice", options: DAYS }, correct: "星期一",
      judge: { "星期二": "weekday-swapped", "星期三": "weekday-skip", "星期四": "weekday-skip", "星期五": "weekday-skip", "星期六": "weekday-skip" } },
    { id: "q6-2", section: 6, label: "星期日 → （　）→（　）→ 星期三，第二格",
      entry: { kind: "choice", options: DAYS }, correct: "星期二",
      judge: { "星期一": "weekday-swapped", "星期三": "weekday-skip", "星期四": "weekday-skip", "星期五": "weekday-skip", "星期六": "weekday-skip" } },
    // —— 第 7 大题：钟面 ——
    { id: "q7-1", section: 7, label: "钟面（5 时正）写时刻",
      entry: { kind: "number", min: 1, max: 12, unit: "时" }, correct: 5,
      judge: { 6: "hour-next-number", 12: "read-minute-hand", 1: "misread-digit" } },
    { id: "q7-2a", section: 7, label: "钟面箭头 a（短针）指的是",
      entry: { kind: "choice", options: ["时针", "分针"] }, correct: "时针",
      judge: { "分针": "hands-swapped" } },
    { id: "q7-2b", section: 7, label: "钟面箭头 b（长针）指的是",
      entry: { kind: "choice", options: ["时针", "分针"] }, correct: "分针",
      judge: { "时针": "hands-swapped" } },
    // —— 第 8 大题：时段 ——
    { id: "q8a", section: 8, label: "晾衣服图（太阳高挂）是什么时段",
      entry: { kind: "choice", options: ["晚上", "中午"] }, correct: "中午",
      judge: { "晚上": "daypart-mismatch" } },
    { id: "q8b", section: 8, label: "睡觉图（月亮）是什么时段",
      entry: { kind: "choice", options: ["晚上", "傍晚"] }, correct: "晚上",
      judge: { "傍晚": "dusk-vs-night" } },
    // —— 第 9 大题：蛋糕 ——
    { id: "q9-1", section: 9, label: "蛋糕吃了 2/4 和 1/4，还剩几分之几",
      entry: { kind: "choice", options: FRACS }, correct: "四分之一",
      judge: { "四分之三": "rest-vs-eaten", "四分之二": "rest-subtract-once", "四分之四": "frac-all-parts" } },
    { id: "q9-2", section: 9, label: "把剩下的蛋糕涂色（四格）",
      entry: { kind: "cells", min: 0, max: 4 }, correct: 1,
      judge: { 0: "cells-none", 3: "rest-vs-eaten", 2: "rest-subtract-once", 4: "frac-all-parts" } },
    // —— 第 10 大题：零用钱（50+20+20+10 sen）——
    { id: "q10a", section: 10, label: "50+20+20+10 sen，一共 RM___",
      entry: { kind: "number", min: 0, max: 9999, unit: "RM" }, correct: 1,
      judge: { 100: "forgot-convert", 110: "calc-slip" } },
    { id: "q10b", section: 10, label: "想买 RM2 的文具，还缺 RM___",
      entry: { kind: "number", min: 0, max: 9999, unit: "RM" }, correct: 1,
      judge: { 2: "no-subtract", 3: "wrong-operation", 100: "forgot-convert" } },
    // —— 第 11 大题：立体（圆柱体）——
    { id: "q11a", section: 11, label: "写出立体（圆柱）的名称",
      entry: { kind: "choice", options: SOLIDS }, correct: "圆柱体",
      judge: { "圆锥体": "solid-name", "球体": "solid-name", "正方体": "solid-name", "长方体": "solid-name" } },
    { id: "q11b", section: 11, label: "圆柱有几个平面、曲面、顶点",
      entry: { kind: "multi", fields: [
        { key: "plane", label: "平面", kind: "number", min: 0, max: 20, unit: "个" },
        { key: "curved", label: "曲面", kind: "number", min: 0, max: 20, unit: "个" },
        { key: "vertex", label: "顶点", kind: "number", min: 0, max: 20, unit: "个" },
      ] }, correct: { plane: 2, curved: 1, vertex: 0 } },
    // —— 第 12 大题 ——
    { id: "q12", section: 12, label: "7 杯＋桌上 2 杯，共准备多少杯",
      entry: { kind: "number", min: 0, max: 9999, unit: "杯" }, correct: 9,
      judge: { 5: "wrong-operation", 72: "concat-digits", 14: "wrong-operation" } },
    // —— 第 13 大题：图表（▲＝2 片：1A 2▲、1B 4▲、1C 3▲、1D 5▲）——
    { id: "q13a", section: 13, label: "哪一班吃了 6 片三文治",
      entry: { kind: "choice", options: CLASSES }, correct: "1C",
      judge: { "1D": "ignore-scale", "1B": "ignore-scale", "1A": "chart-misread" } },
    { id: "q13b", section: 13, label: "1A–1D 一共吃了多少片",
      entry: { kind: "number", min: 0, max: 9999, unit: "片" }, correct: 28,
      judge: { 14: "ignore-scale" } },
    { id: "q13c", section: 13, label: "哪一班吃得最多",
      entry: { kind: "choice", options: CLASSES }, correct: "1D",
      judge: { "1A": "chart-misread", "1B": "chart-misread", "1C": "chart-misread" } },
  ];

  const byId = {};
  items.forEach((it) => { byId[it.id] = it; });

  function isBlank(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === "string") return v.trim() === "";
    if (typeof v === "object") return Object.keys(v).every((k) => isBlank(v[k]));
    return false;
  }

  // "RM1"、"1.00"、" 12 "、12 → 数字；转不出来 → null
  function toNum(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string") return null;
    const s = v.replace(/RM|rm|sen|仙|令吉|枚|杯|片|时|个|\s/g, "");
    if (s === "" || !/^-?\d+(\.\d+)?$/.test(s)) return null;
    return parseFloat(s);
  }

  function gradeMulti(item, answer) {
    if (typeof answer !== "object" || answer === null) return { correct: false, tag: "other" };
    const fs = item.entry.fields;
    const got = {};
    let missing = false;
    fs.forEach((f) => {
      const n = toNum(answer[f.key]);
      got[f.key] = n;
      if (n === null) missing = true;
    });
    const wrong = fs.filter((f) => got[f.key] !== null && got[f.key] !== item.correct[f.key]).map((f) => f.key);
    if (!missing && wrong.length === 0) return { correct: true, tag: null };
    if (missing && wrong.length === 0) return { correct: false, tag: "incomplete" };
    // 多项都错时只回一个 tag：顶点 > 平面 > 曲面（顶点是最有诊断价值的）
    if (wrong.indexOf("vertex") >= 0) return { correct: false, tag: "vertex-miscount" };
    if (wrong.indexOf("plane") >= 0) return { correct: false, tag: "plane-miscount" };
    return { correct: false, tag: "curved-miscount" };
  }

  function grade(id, answer) {
    const item = byId[id];
    if (!item) throw new Error("LatihanBank.grade: 未知题号 " + id);
    if (isBlank(answer)) return { correct: false, tag: "blank" };
    const kind = item.entry.kind;
    if (kind === "multi") return gradeMulti(item, answer);
    if (kind === "choice") {
      const a = typeof answer === "string" ? answer.trim() : String(answer);
      if (a === item.correct) return { correct: true, tag: null };
      return { correct: false, tag: item.judge[a] || "other" };
    }
    // number / cells
    const n = toNum(answer);
    if (n === null) return { correct: false, tag: "other" };
    if (n === item.correct) return { correct: true, tag: null };
    return { correct: false, tag: item.judge[n] || "other" };
  }

  const LatihanBank = {
    version: "1.0",
    sections: sections,
    items: items.map((it) => ({ id: it.id, section: it.section, label: it.label, entry: it.entry, correct: it.correct })),
    grade: grade,
    tags: tags,
  };
  // 单元测试用：每题登记过的「错答案 → tag」。不属于合约，B 不要依赖。
  Object.defineProperty(LatihanBank, "_judge", { value: byId, enumerable: false });

  root.LatihanBank = LatihanBank;
  if (typeof module !== "undefined" && module.exports) module.exports = LatihanBank;
})(typeof window !== "undefined" ? window : globalThis);
