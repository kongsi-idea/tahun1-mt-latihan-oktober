# tahun1-mt-latihan-oktober（一年级10月数学练习）专案蓝图

> 完整规划与合约在 `PLAN.md`（老师 2026-10-12 关口①已批准）。现在停在哪 → `handoff.md`。本档只放代码看不出来的决定。

## 这是什么
学生在线一题一题做（手机／平板／电脑）→ 交卷一次写入 Supabase → 老师在 Hub 的后台（Hub 通用后台 `teacher.html?tool=tahun1-mt-latihan-oktober`，设定 `kongsi-idea/data/teacher/tahun1-mt-latihan-oktober.js`；10-17 前是 `latihan-admin.html`，已转址，B 块）看每题对错与错误类型。**学生端读不到任何人的答案**（anon 只有 insert，没有 select）。纸本由老师打印原 PDF，工具不做打印页。

## 关键决定
- **`bank.js` 是唯一的对错来源**：学生端、老师后台、纸本回填都用 `LatihanBank.grade(id, answer)`。合约（id、答案格式、`entry.kind`）不可单方面改，改了要通知 B。`vercel.json` 给 `/bank.js` 加了 `Access-Control-Allow-Origin: *`（Hub 从 `https://tahun1-mt-latihan-oktober.vercel.app/bank.js` 载入）。
- **共 29 个小项**（不是 PLAN 里写的 31）：题号表实际 29 行；q11b 是一个 multi 项（平面／曲面／顶点三个小框，一行）。
- **立体名称用 DSKP 用词「圆柱体」**（DSKP KSSR 2017 数学一年级 SJKC 7.1.1：长方体、正方体、圆锥体、正方棱锥体、圆柱体、球体），不是 PLAN 里的「圆柱」。
- **没作答的题不写入**（与纸本回填「全部留空不写」一致）；**必须全部答完才能交卷**（2026-10-16 老师定；没答完只给「去做没做的题」）。
- **只 insert，不 select／upsert**；失败时 rows 存在 `localStorage`（`latihan-okt:{play_code}:{名字}`），刷新后仍停在「没送出去，再试一次」。
- **再试一次错的题** → `attempt_no` 递增，只含错题，不覆盖第一次。分析以 attempt 1 为准（老师后台处理）。
- **手动输入名字**：`in_roster=false`（输入的名字恰好在名单里则算 true）；`play_code` 取名单第一个班（Hub 链接只带一个班代码）。没有访客模式：没读到名单就不能做题。
- **朗读**：edge-tts 预录（晓晓 -8%），句子集中在 `app.js` 的 `SAY`，改了要重跑 `python3 gen-voice.py`。显示文字与朗读文字分开（朗读用中文数字，如「五十仙」）。
- **视觉**：练习册本子风（老师选 A）。方格纸底 `#FBF7EA`＋绿格线、牛皮纸封面、铅笔灰 `#3B3F47`、红笔 `#D6382F`（大题号圈、完成页圈分数）、荧光笔黄 `#FFE066`、蓝墨水主按钮 `#2F5FAE`。标题 LXGW WenKai TC；题目与数字用 Noto Sans SC／Baloo 2 标准字形。钟面、圆、菱形、圆柱、杯子 SVG 重画；钞票／硬币／两张场景图取自原 PDF。无角色、无 emoji。
- 「换班级」按钮只在封面与选名字页显示（`body.in-quiz` 隐藏）。

## 测试
`python3 -m http.server 8791 --bind 127.0.0.1`，然后：
- `node test-bank.cjs`（bank.js 单元测试；上层 package.json 是 type:module，所以用 `.cjs`＋vm 载入）
- `python3 test-e2e.py`（Supabase 全拦截，假名单 `?code=TEST-1I`，不写真库；截图到 `~/Documents/my-agent/playwright-to-delete/`）

## 老师后台与数据库（B 块，代码在 `kongsi-idea/`）
- **后台放 Hub（10-17 起为通用后台 `teacher.html?tool=…`，原 `latihan-admin.html`），不放工具域名**：老师登录是 Google OAuth，回跳网址白名单里只有 Hub；放工具域名要改 Supabase 设定。页面 `noindex`、Hub 首页不放入口，老师自己存书签。
- **表 `tahun1_mt_latihan_okt_answers`**（migration `kongsi-idea/supabase/migration-2026-10-12-...sql`，2026-10-12 已在线上执行，5 条权限已实测）：anon 只能 insert（source 必须 online、班级代码必须存在、answer<2000 字节）；只有 `is_class_teacher` 的老师能读写。分析一律取每人每题最早一笔 attempt 1。
- **刻意不做**：打印页／二维码（老师直接打印原 PDF）、草稿纸作答、访客模式、排行榜（诊断练习不让学生互比）、原子化纸本回填（目前先删后写，失败可重试；要改需新增 RPC）。
- **Hub 条目 `standards` 暂空**：只核对过 7.1.1 立体名称，其余 DSKP 代码未核，不编。Hub `url` 不带班级代码；给学生的链接要手动加 `?code=JBC1037-1I`。
- **班级代码**：老师写的 `JBC1037-1X` 按 Hub 实际存在的 `JBC1037-1I` 处理（推断，未向老师确认）。
- **关口②被老师跳过**（2026-10-12「先直接发布」）：手机／平板真机从未实测，上线后才请老师点。
