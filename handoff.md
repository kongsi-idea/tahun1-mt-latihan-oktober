# 一年级10月数学练习 · 交接

> 设计决定在 `agents.md`，规划与合约在 `PLAN.md`。本档只记现在停在哪。

## ⏯️ 目前做到哪
2026-10-12：v1.0 已上线并上架 Hub。学生端 https://tahun1-mt-latihan-oktober.vercel.app ；老师后台 https://kongsi-idea.vercel.app/latihan-admin.html（Google 登录）。migration 已执行、RLS 5 条实测通过、`npm run check` 全过、线上 e2e 全过（Supabase 拦截）。

## 🚦 目前状态
- 可用。给学生的链接：`…vercel.app/?code=JBC1037-1I`。
- 老师后台只用假数据测过，没有真实学生答案跑过；手机／平板真机未测（老师跳过关口②）。
- GitHub Actions 自动部署已接（push main 即部署）。

## ➡️ 下一步
1. 老师手机点一遍学生链接，登录后台看总览是否出数字；有问题再改。
2. 补 DSKP 对照（Hub `standards` 目前空）、课本出处、「圆柱体」用词对课本。
3. 视使用情况决定：纸本回填改原子 RPC；后台「需要帮助」阈值（错 40% 或同类错 3 次）是否合适。

## ⚠️ 注意事项
- 改 `SAY` 要重跑 `python3 gen-voice.py`；改 `bank.js` 的 id／答案格式要同步老师后台。
- 测试一律拦截 Supabase；**不要对线上跑会写入的流程**。

## 🕐 最后更新
2026-10-12｜Claude Code（Sonnet 5.5）@ 本机 Mac｜Git：✅ 已推（tool repo、teaching-tools、kongsi-idea 111b779）
