// bank.js 单元测试：node test-bank.cjs
// 上层 teaching-tools/package.json 是 type:module，所以用 vm 载入 bank.js（模拟 CommonJS 与浏览器 window 两种环境）。
// 每个「要抓的错误类型」至少一个断言；另外检查合约形状（id 唯一、tag 都有中文说明、题号表 29 项）。
const assert = require("assert");
const fs = require("fs"), vm = require("vm"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "bank.js"), "utf8");
const ctxCJS = { module: { exports: {} } };
vm.runInNewContext(src, ctxCJS);
const B = ctxCJS.module.exports;
const ctxWin = { window: {} };
ctxWin.globalThis = ctxWin;
vm.runInNewContext(src, ctxWin);
let n = 0;
const t = (name, fn) => { fn(); n++; console.log("  ✅ " + name); };
const g = (id, a) => B.grade(id, a);
const eq = (id, a, correct, tag) => {
  const r = g(id, a);
  assert.strictEqual(r.correct, correct, `${id} ← ${JSON.stringify(a)} correct`);
  assert.strictEqual(r.tag, tag, `${id} ← ${JSON.stringify(a)} tag`);
};

t("两种载入方式都有 LatihanBank（module.exports 与 window.LatihanBank）", () => {
  assert.ok(B && typeof B.grade === "function");
  assert.ok(ctxWin.window.LatihanBank && typeof ctxWin.window.LatihanBank.grade === "function");
});

t("合约形状：29 个小项、id 唯一、section 都存在、13 个大题", () => {
  assert.strictEqual(B.version, "1.0");
  assert.strictEqual(B.sections.length, 13);
  assert.strictEqual(B.items.length, 29);
  const ids = B.items.map((i) => i.id);
  assert.strictEqual(new Set(ids).size, 29);
  const expect = "q1-1 q1-2 q2-1 q3-1 q3-2 q3-3 q3-4 q4-1 q4-2 q4-3 q5-1 q5-2 q6-1 q6-2 q7-1 q7-2a q7-2b q8a q8b q9-1 q9-2 q10a q10b q11a q11b q12 q13a q13b q13c".split(" ");
  assert.strictEqual(JSON.stringify(ids), JSON.stringify(expect));
  B.items.forEach((i) => {
    assert.ok(B.sections.some((s) => s.no === i.section), i.id);
    assert.ok(["choice", "number", "multi", "cells"].includes(i.entry.kind), i.id);
    if (i.entry.kind === "choice") assert.ok(i.entry.options.includes(i.correct), i.id + " 标准答案必须在 options 里");
  });
});

t("每题标准答案判对且 tag=null", () => {
  B.items.forEach((i) => eq(i.id, i.correct, true, null));
});

t("所有登记的错答案：判错、tag 与登记一致、且 tag 有中文说明", () => {
  let count = 0;
  B.items.forEach((i) => {
    const j = B._judge[i.id].judge || {};
    Object.keys(j).forEach((k) => {
      const ans = i.entry.kind === "choice" ? k : Number(k);
      eq(i.id, ans, false, j[k]);
      assert.ok(B.tags[j[k]] && /[一-鿿]/.test(B.tags[j[k]]), "缺中文说明: " + j[k]);
      count++;
    });
  });
  assert.ok(count >= 50, "登记的错答案数 " + count);
});

t("tags 里每个 key 都至少被某题用到（blank/incomplete/other 除外）", () => {
  const used = new Set();
  B.items.forEach((i) => Object.values(B._judge[i.id].judge || {}).forEach((x) => used.add(x)));
  ["hour-next-number", "vertex-miscount", "plane-miscount", "curved-miscount"].forEach((x) => used.add(x));
  Object.keys(B.tags).filter((k) => !["blank", "incomplete", "other"].includes(k)).forEach((k) => assert.ok(used.has(k), "未使用的 tag: " + k));
});

// ——— 题号表逐条（PLAN「要抓的错误类型」）———
t("q1 分数：把没涂的当涂的 / 数错 / 全部", () => {
  eq("q1-1", "四分之一", false, "frac-counted-blank");
  eq("q1-1", "四分之二", false, "frac-miscount");
  eq("q1-1", "四分之四", false, "frac-all-parts");
  eq("q1-2", "四分之三", false, "frac-counted-blank");
  eq("q1-2", "四分之二", false, "frac-miscount");
});
t("q2-1 涂格：1／3 格没看懂分子，4 格＝分母当分子，0 格", () => {
  eq("q2-1", 1, false, "frac-numerator-off");
  eq("q2-1", 3, false, "frac-numerator-off");
  eq("q2-1", 4, false, "frac-denominator-as-numerator");
  eq("q2-1", 0, false, "cells-none");
});
t("q3 币值：并排 5020／102／55、减了、位值", () => {
  eq("q3-1", 5020, false, "concat-digits");
  eq("q3-1", 30, false, "wrong-operation");
  eq("q3-1", 7, false, "place-value");
  eq("q3-2", 102, false, "concat-digits");
  eq("q3-2", 8, false, "wrong-operation");
  eq("q3-3", 120, false, "wrong-operation");
  eq("q3-3", 30, false, "calc-slip");
  eq("q3-4", 5, false, "count-one-note");
  eq("q3-4", 55, false, "concat-digits");
  eq("q3-4", 25, false, "calc-slip");
});
t("q4 连线：仙与令吉混淆、钞票面额看错", () => {
  eq("q4-1", "10 令吉", false, "unit-confusion");
  eq("q4-2", "70 仙", false, "unit-confusion");
  eq("q4-2", "RM1", false, "note-value-misread");
  eq("q4-3", "10 令吉", false, "note-value-misread");
});
t("q5 换算：没换、把面额当枚数", () => {
  eq("q5-1", 1, false, "no-exchange");
  eq("q5-1", 20, false, "copy-value");
  eq("q5-1", 10, false, "copy-value");
  eq("q5-2", 1, false, "no-exchange");
  eq("q5-2", 100, false, "copy-value");
  eq("q5-2", 10, false, "copy-value");
  eq("q5-2", 20, false, "copy-value");
});
t("q6 星期：互换、跳格", () => {
  eq("q6-1", "星期二", false, "weekday-swapped");
  eq("q6-1", "星期四", false, "weekday-skip");
  eq("q6-2", "星期一", false, "weekday-swapped");
  eq("q6-2", "星期五", false, "weekday-skip");
});
t("q7 钟面：6、12、1，以及时针分针答反", () => {
  eq("q7-1", 6, false, "hour-next-number");
  eq("q7-1", 12, false, "read-minute-hand");
  eq("q7-1", 1, false, "misread-digit");
  eq("q7-2a", "分针", false, "hands-swapped");
  eq("q7-2b", "时针", false, "hands-swapped");
});
t("q8 时段", () => {
  eq("q8a", "晚上", false, "daypart-mismatch");
  eq("q8b", "傍晚", false, "dusk-vs-night");
});
t("q9 蛋糕：算成吃了的、只减一次、全部", () => {
  eq("q9-1", "四分之三", false, "rest-vs-eaten");
  eq("q9-1", "四分之二", false, "rest-subtract-once");
  eq("q9-1", "四分之四", false, "frac-all-parts");
  eq("q9-2", 3, false, "rest-vs-eaten");
  eq("q9-2", 2, false, "rest-subtract-once");
  eq("q9-2", 4, false, "frac-all-parts");
  eq("q9-2", 0, false, "cells-none");
});
t("q10 零用钱：1／1.0／1.00／\"RM1\" 都对；100 忘了换算；没减、加了", () => {
  eq("q10a", 1, true, null);
  eq("q10a", 1.0, true, null);
  eq("q10a", "1", true, null);
  eq("q10a", "1.0", true, null);
  eq("q10a", "1.00", true, null);
  eq("q10a", "RM1", true, null);
  eq("q10a", 100, false, "forgot-convert");
  eq("q10a", 110, false, "calc-slip");
  eq("q10b", 2, false, "no-subtract");
  eq("q10b", 3, false, "wrong-operation");
  eq("q10b", 100, false, "forgot-convert");
  eq("q10b", "1.00", true, null);
});
t("q11a 立体名称", () => {
  eq("q11a", "圆锥体", false, "solid-name");
  eq("q11a", "球体", false, "solid-name");
});
t("q11b 平面／曲面／顶点：各自出错与多项出错的优先级", () => {
  eq("q11b", { plane: 2, curved: 1, vertex: 0 }, true, null);
  eq("q11b", { plane: "2", curved: "1", vertex: "0" }, true, null);
  eq("q11b", { plane: 1, curved: 1, vertex: 0 }, false, "plane-miscount");
  eq("q11b", { plane: 3, curved: 1, vertex: 0 }, false, "plane-miscount");
  eq("q11b", { plane: 2, curved: 2, vertex: 0 }, false, "curved-miscount");
  eq("q11b", { plane: 2, curved: 1, vertex: 2 }, false, "vertex-miscount");
  eq("q11b", { plane: 1, curved: 1, vertex: 2 }, false, "vertex-miscount");
  eq("q11b", { plane: 2, curved: 1 }, false, "incomplete");
  eq("q11b", { plane: 2, curved: 1, vertex: null }, false, "incomplete");
  eq("q11b", {}, false, "blank");
});
t("q12 橙汁：减了、并排、乘了", () => {
  eq("q12", 5, false, "wrong-operation");
  eq("q12", 72, false, "concat-digits");
  eq("q12", 14, false, "wrong-operation");
});
t("q13 图表：没乘 2、数错", () => {
  eq("q13a", "1D", false, "ignore-scale");
  eq("q13a", "1B", false, "ignore-scale");
  eq("q13a", "1A", false, "chart-misread");
  eq("q13b", 14, false, "ignore-scale");
  eq("q13c", "1B", false, "chart-misread");
  eq("q13c", "1C", false, "chart-misread");
});
t("没登记过的错答案 → other；没作答 → blank；乱写的字串 → other", () => {
  eq("q3-1", 99, false, "other");
  eq("q1-1", "二分之一", false, "other");
  eq("q3-1", null, false, "blank");
  eq("q3-1", "", false, "blank");
  eq("q3-1", undefined, false, "blank");
  eq("q1-1", "  ", false, "blank");
  eq("q3-1", "abc", false, "other");
  assert.throws(() => g("q99", 1));
});

console.log(`\n${n} 组测试全部通过`);
