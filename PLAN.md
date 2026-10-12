# 开发规划：一年级10月数学练习（tahun1-mt-latihan-oktober）

> 老师 2026-10-12 关口①已批准：方案 + 视觉 A（练习册本子风）。写这份的是主对话（Opus），实作交 Sonnet 子代理，主对话验收。
> 原卷：`~/Downloads/一年级10月数学练习.pdf`（4 页，13 大题）。**用 `python3 -c "import fitz"`（不要加 -I）渲染成图自己看，不要只信文字抽取**（卷子大多是图）。

## 目标
1. 学生**在线一题一题做**（手机／平板／电脑），先选名字（Hub 共用班级名单）或手动输入名字。
2. 学生做纸本（老师自己用原 PDF 打印，**工具不做打印页**）；老师之后把纸上答案**回填**到系统。
3. **只有老师看得到**后台分析：每题对错、错在哪一类，找出学生的问题。学生端读不到任何人的答案。
4. 挂在课堂点子铺（Hub）上给学生自己操作。

## 拆成两块（两个子代理并行）
- **A 学生工具**：`teaching-tools/tahun1-mt-latihan-oktober/`（本目录，独立仓库，纯静态单页，参考 `../tahun1-mt-pecahan` 的骨架、`gen-voice.py`、`test-e2e.py`）。
- **B 老师后台＋数据库**：`~/Documents/my-projects/kongsi-idea/`（Hub 里加一个仅老师登录可用的页面）＋ migration SQL 档。**B 只写档、不执行 migration**（主对话审后执行）。

两块通过下面两个合约对接，**不可自行改合约**，要改先回报。

## 合约一：题库 `bank.js`（A 写，B 读）
A 在本目录写 `bank.js`（无 DOM、纯数据＋函数，`window.LatihanBank` 与 `module.exports` 都要有），并在 `vercel.json` 给 `/bank.js` 加 `Access-Control-Allow-Origin: *`，因为 Hub 老师页会从 `https://tahun1-mt-latihan-oktober.vercel.app/bank.js` 载入它（B 开发期间用 stub／本机副本）。

```js
LatihanBank = {
  version: "1.0",
  sections: [{ no: 1, title: "以文字写出涂上颜色部分代表的分数" }, ...],   // 原卷 13 大题
  items: [{
    id: "q3-1",            // 全卷固定 id，见下表
    section: 3,
    label: "50 sen + 20 sen =",       // 老师后台显示用的短题干
    entry: { kind, options?, min?, max?, unit?, fields? },   // 回填表单怎么画，见下
    correct: <标准答案，格式见下>,
  }, ...],
  grade(id, answer) -> { correct: boolean, tag: string|null },  // tag = 错误类型 key；答对为 null
  tags: { "concat-digits": "把两个数字并排写在一起（5020）", ... }  // key → 老师看得懂的中文说明
}
```

`entry.kind`：`choice`（options 里选一个字符串）／`number`（整数，可有 unit 仅作显示）／`multi`（fields：多个小项，每项自带 kind，答案为对象）／`cells`（涂色格数，min–max 整数）。

## 合约二：数据库（B 写 SQL，主对话执行）
表 `public.tahun1_mt_latihan_okt_answers`：

| 栏位 | 说明 |
|---|---|
| id uuid pk | |
| play_code text not null | Hub 班级代码（如 `JBC1037-1I`，大写）。**没有访客模式：必须带班级代码** |
| student_name text not null | 名单里选的名字，或手动输入的名字 |
| in_roster boolean not null | 名字是不是来自名单（手动输入的为 false，老师后台可合并／忽略） |
| source text not null check in ('online','paper') | 在线作答 or 老师回填纸本 |
| attempt_no int not null default 1 | 在线重做错题时递增；**分析一律以 attempt_no=1 为准** |
| item_id text not null | 见题号表 |
| answer jsonb not null | 学生答案，格式见题号表 |
| is_correct boolean not null | 写入者用 `LatihanBank.grade` 算 |
| error_tag text | grade 给的 tag |
| created_at timestamptz default now() | |

RLS（B 要写对，这是整个「只有老师看得到」的核心）：
- `anon` **只能 insert**，且 `with check (source = 'online')`；**不建任何 anon select/update/delete policy**。
- `authenticated`（老师）：select／insert／update／delete 限于「该行 `play_code` 对应的 `classes` 里 `public.is_class_teacher(classes.id)` 为真」（`is_class_teacher` 已存在，见 `migration-2026-08-12c-fix-rls-recursion.sql`；`classes.play_code` 唯一）。
- 加索引 `(play_code, student_name)`、`(play_code, item_id)`。
- 文件名：`supabase/migration-2026-10-12-tahun1-mt-latihan-okt-answers.sql`，命名照 pecahan 那份。
- 先查：anon 的 insert 是 `with check` 之外还要挡 `answer` 过大（`pg_column_size(answer) < 2000`）和 `play_code` 必须存在于 `classes`（`exists (select 1 from classes where play_code = ...)`），防乱灌。

## 题号表（A、B 共用；答案由我先推算，A 要对着原图再核一遍，有疑问回报，不要自己改）

| id | 题 | 答案格式（answer / correct） | 标准答案 | 要抓的错误类型（tag 草案，A 可补，但 key 要稳定） |
|---|---|---|---|---|
| q1-1 | 圆形涂色部分的分数 | choice 字符串 | 四分之三 | 四分之一（把没涂的当涂的）、四分之二、四分之四 |
| q1-2 | 菱形涂色部分的分数 | choice | 四分之一 | 四分之三、四分之二 |
| q2-1 | 四长条涂「四分之二」 | cells 涂了几格 | 2 | 涂 1 格或 3 格＝没看懂分子；涂 4 格＝分母当分子 |
| q3-1 | 50 sen + 20 sen = | number（单位 sen） | 70 | 5020 并排（concat-digits）、30（减了） |
| q3-2 | RM 10 + RM 2 = | number（RM） | 12 | 102 并排、8 |
| q3-3 | 90 仙 – 30 仙 = | number（仙） | 60 | 120（加了）、30 |
| q3-4 | 两张 RM5 = RM___ | number | 10 | 5（只数一张）、55 并排、25 |
| q4-1 | 连线：50 sen＋20 sen（图） | choice：`10 令吉`/`70 仙`/`RM1` | 70 仙 | 选 10 令吉（只看数字大＝没分辨仙与令吉） |
| q4-2 | 连线：RM10 钞票 | choice 同上 | 10 令吉 | 选 70 仙 |
| q4-3 | 连线：RM1 钞票（原卷此项印成「5)」，是原卷排版错误，工具里显示 3）） | choice 同上 | RM1 | 选 10 令吉 |
| q5-1 | 20 sen 可换成几枚 10 sen | number | 2 | 1（没换）、20、10 |
| q5-2 | RM1 可换成几枚 50 sen | number | 2 | 1、100、10、20 |
| q6-1 | 星期日→（）→（）→星期三 第一格 | choice：星期一…星期六 | 星期一 | 顺序互换（把二放前面）、跳格 |
| q6-2 | 第二格 | choice | 星期二 | 同上 |
| q7-1 | 钟面（5 时正）写时刻 | number（时，1–12；界面用「5 时」，**不写「5 点」**） | 5 | 6（时针分针读反：读分针指的 12 还是时针指的 5）、12（读了分针）、1 |
| q7-2a | 箭头 a 指的是 | choice：时针/分针 | **请 A 看原图核对**：我看到 a 箭头指短针＝时针、b 指长针＝分针 | 答反 |
| q7-2b | 箭头 b 指的是 | choice | 分针（同上待核） | 答反 |
| q8a | 晾衣服图（太阳高挂）时段 | choice：晚上/中午 | 中午 | 选晚上 |
| q8b | 睡觉图（月亮）时段 | choice：晚上/傍晚 | 晚上 | 选傍晚 |
| q9-1 | 蛋糕吃了 2/4 和 1/4，还剩几分之几 | choice | 四分之一 | 四分之三（算成吃了的）、四分之二（只减一次）、四分之四 |
| q9-2 | 把剩下的涂色（四格） | cells | 1 | 涂 3（涂成吃了的）、涂 2 |
| q10a | 50+20+20+10 sen，一共 RM___ | number（RM） | 1 | 100（忘记换成令吉）、1.00 也算对（grade 要接受 1／1.0／1.00）、110 |
| q10b | 想买 RM2 的文具，还缺多少 | number（RM） | 1 | 2（没减）、3（加了）、100 |
| q11a | 写出立体的名称（圆柱图） | choice：圆柱/圆锥/球体/正方体/长方体 | 圆柱 | 圆锥、球体… **名称请 A 去课本／DSKP 资料确认马来西亚华小用词（`~/Documents/资料库/`），拿不准就回报** |
| q11b | 几个平面、曲面、顶点 | multi：{plane, curved, vertex} 三个 number | 2、1、0 | 平面写成 1／3（把曲面算进去）、顶点写成 2（把圆圈边缘当顶点）、曲面写 2 |
| q12 | 7 杯＋桌上还有 2 杯，共准备多少杯 | number | 9 | 5（减了）、72 并排、14 |
| q13a | 哪一班吃了 6 片（图表：▲＝2 片） | choice：1A/1B/1C/1D | 1C | 1D（把 6 当成要数 6 个▲ 近似）、选了有 3 个▲ 以外的班 |
| q13b | 1A–1D 一共吃了多少片 | number | 28 | 14（只数▲没乘 2）、其他 |
| q13c | 哪一班吃得最多 | choice | 1D | 1B／1C |

原图里的钞票／硬币／钟面／蛋糕格／杯子／▲ 图表，**自己从 PDF 里用 fitz 取图或裁剪**，放进 `assets/`；其中钟面、立体、硬币能用 SVG 干净重画的就重画（线条要清楚、颜色不灰暗），钞票图直接用 PDF 里的位图。**角色／插画不要用 CSS 拼，不要用 emoji 当图示；本工具以几何图形为主，不需要角色**。

## A 的规格：学生端
- **流程**：封面「一年级10月数学练习」→ 选名字（`ClassCode.loadOrPrompt()` 取名单，**照 agents.md 标准接入，不要自做班级代码 UI**；名单学生以大按钮网格显示，旁边一个「找不到我的名字？」→ 手动输入）→ 做题（一题一屏）→ 完成页。
  - 若没有 `?code=` 又没有记住的代码，`loadOrPrompt()` 会自己提示输入；Hub 里的「开始使用」链接由我另外配 `?code=JBC1037-1I`，**不要在代码里写死班级代码**。
  - 名单读取失败、网络断：不能卡死，提示重试；手动输入名字仍要可用且仍带班级代码。
- **一题一屏**（共 31 个小项，按上表 id 顺序，同一大题的小项可同屏但每个小项各自提交）：顶部进度条＋「第几题／共几题」；大图在上、作答区在下；**「上一题 / 下一题」**，可以回头改答案；**做的过程中不显示对错**，以免学生猜；每题一个 🔊 按钮读题（edge-tts 预录，不用浏览器 speechSynthesis；模板 `tahun1-mt-pecahan` 的 `SAY`＋`gen-voice.py`，旁白晓晓；题干句子集中在 `SAY`）。
- **题型控件**（手指够大，≥48px 点击区；手机直立、平板、电脑都要用得顺）：choice＝大 chip 按钮；number＝**屏幕数字键盘**（自己做，不弹系统键盘；有退格、清除；单位以固定后缀显示，如「RM」「sen」「时」）；cells＝点格子涂色，再点取消；multi＝几个 number 并排。
- **提交**：按「交卷」后一次性写入 Supabase（31 行）。**用 `supabaseClient.from(...).insert([...])`**，不 select、不 upsert（anon 没有读权限）。写入失败要保留答案在 `localStorage`（key 带 play_code＋名字）并显示「没送出去，再试一次」按钮，不可丢答案。同一学生重复交卷会产生多份 attempt 1 —— 交卷前不查重（查不了），由老师后台取每人每题**最早一笔 attempt 1 online**。
- **完成页**：显示「对了几题／共 31」（给学生看自己做得怎样没问题，这是学生自己的答案，不涉及别人）；列出答错的小项，显示正确答案与一句提示；提供「再试一次错的题」（只重做错的，提交 attempt_no=2，不覆盖第一次）。
- **进度保存**：做到一半关掉再进来（同名同班），从 `localStorage` 恢复到上次那一题。
- **视觉（老师选 A：练习册本子风）**：米白纸张底、横格／方格纸感、铅笔字感的标题、红笔批改的小细节（完成页的「对」勾画与圈圈）。**但读题和数字必须是清晰的标准字形**（一年级，常用字；Noto Sans SC 或同级可读字体，嵌入字体，学校电脑 Windows＋Chrome）。先读 `../_style-lab/STYLES.md` 挑最接近「本子／文具」的一档作执行品质层，主题皮肤自己定，并**对照 memory 的近期风格清单避免撞车**（`~/.claude/projects/-Users-yquanloo-Documents-my-agent/memory/index/preferences.md` 里找 design-aesthetic-preferences；找不到就回报，不要硬猜）。配色：从「受众 6–7 岁＋练习册」推出，验 WCAG AA；**不用 `#0B1E2D`/`#0EA5B7`（那是 EduNeo／点子铺的）**。大小对齐、几何对称、居中平衡（AGENTS §2）。
- **文案**：简体中文，马来西亚华语用词；时刻写「5 时」；币值单位照原卷（sen／仙／令吉／RM）；界面短句、大按钮。
- `index.html` 的 `</head>` 前必须有：`<script src="https://kongsi-idea.vercel.app/data/track-use.js" data-slug="tahun1-mt-latihan-oktober" defer></script>`。
- 先引 supabase CDN、再 `supabase-client.js`、再 `class-code-client.js`（顺序与 pecahan 一致，抄它）。

## B 的规格：老师后台（放 Hub：`kongsi-idea/latihan-admin.html`＋`latihan-admin.js`）
> 为什么在 Hub：老师的登录是 Google OAuth，回跳网址已在 Supabase 白名单里的只有 Hub；放进工具域名要改 Supabase 设定。**页面 `noindex`，Hub 首页不放入口，老师自己存书签**。
- 参考 `admin.html`／`admin.js`（许愿池后台）的登录与排版、`kelasku.js` 的 `signInWithOAuth`／`onAuthStateChange` 流程。**未登录或不是该班老师：什么数据都不显示**（RLS 本来就读不到，UI 也要有「请登录」状态）。
- 登录后：选班级（只列该老师 `class_teachers` 里的班；默认带 `?code=` 指定的班）。载入 `bank.js`（见合约一，开发期间用本机 stub）。
- **三个分页**：
  1. **总览**：每个小项的「第一次作答」答对率条形图（只用 attempt_no=1，在线＋纸本合并；同一学生同一题有多笔取最早）；最常见的错误类型 Top 5（用 `bank.tags` 的中文说明）；总参与人数（在线几人／纸本几人）；全班平均分。最难的 5 题要醒目。
  2. **学生**：每个学生一行（对几题／共几题、答错的题号、主要错误类型）；点开某学生看逐题答案与正确答案；顶部「需要帮助」排序（错最多、或集中在同一类型的在前）。手动输入的名字（`in_roster=false`）要标出来，让老师可以「合并到名单里的某人」（做法：把那些行的 student_name 更新成名单名字、in_roster 改 true；authenticated 有 update 权限）。
  3. **纸本回填**：选学生 → 按大题顺序出现 31 个小项的输入控件（依 `entry` 画：choice＝下拉或 chip、number＝数字框、cells＝0–N 选择、multi＝几个框）；「全部留空」的项目不写入；保存时 `source='paper'`，先 delete 该学生该班之前的 paper 行再 insert（重复回填＝覆盖）。用 `LatihanBank.grade` 算 `is_correct`／`error_tag`。要能快速连续回填很多学生：保存后自动跳到名单下一位，键盘 Tab 顺序合理。
- 在线与纸本的差异：总览加一个「来源」筛选（全部／在线／纸本）。
- 导出：「下载 CSV」（学生×题，对错＋答案），UTF-8 带 BOM，Excel 可开。
- 桌面优先（老师在电脑上用），手机能看。样式沿用 Hub 现有变量，不要另起一套视觉。

## 范围外（不要做）
- 打印页／二维码（老师直接打印原 PDF）。
- 草稿纸／画图作答。
- 访客（无班级代码）模式、成绩排行榜（这是诊断练习，学生之间不比较）。
- 改 Hub 其他页面；改 Supabase 其他表；执行 migration；部署；改 `app.js` 的 `TOOLS`（上架由我做）。

## 验收标准（子代理自测并交证据；我再抽查）
A：
1. 本机 `python3 -m http.server`，Playwright **拦截 Supabase** 用假名单 `?code=TEST-1I`（照 pecahan 的 test-e2e.py；**绝对不要写进真数据库**）。
2. 从选名字走到交卷，31 个小项各自作答一次，拦截到的 insert 载荷：31 行、字段齐全、`attempt_no=1`、`source='online'`、`is_correct`／`error_tag` 与题号表一致。
3. 手动输入名字路径 `in_roster=false`。
4. 做一半刷新页面能恢复；交卷失败（拦截回 500）答案不丢、可重试。
5. 手机直立（390×844）、平板（820×1180）、桌面（1366×768）各截图一张放 `~/Documents/my-agent/playwright-to-delete/`（证据写成文字）；控制台无红字；所有按钮≥48px。
6. `LatihanBank.grade` 对题号表里每个「要抓的错误类型」各至少一个单元测试（`node` 直接跑 `bank.js`）。
7. 31 个小项全部有预录语音档；`gen-voice.py` 可重跑。
B：
1. SQL 用 psql 语法自己读一遍；写一份 `supabase/test-latihan-rls.md`：列出要在执行后验证的 5 条（anon 插入成功、anon 读失败、anon 插入 source='paper' 失败、非该班老师读不到、该班老师读得到）——**这 5 条由主对话执行，B 不跑**。
2. 页面用 stub 数据（本机假 Supabase 响应）在 Playwright 里走通三个分页，截图一张「总览」「学生」「纸本回填」各一；控制台无红字。
3. 总览的答对率、Top 错误类型，用手算的 3 个假学生数据核对数字。

## 交付
各自回报：改了哪些档、证据（命令输出／测试结果文字）、**与规格不一致的地方（缩水要主动说）**、需要我决定的事。**不要 commit／push／部署。**
