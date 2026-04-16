# MAITONG Board of Advisors

## 项目概述
MAITONG团队内部AI决策辅助工具。21位世界级顾问模拟，多角度回答团队问题。

## 技术栈
- Next.js 16 + TypeScript + Tailwind CSS
- SQLite (better-sqlite3) 存储用户/问答/日志
- Claude Code CLI (`claude --print --system-prompt-file`) 作为AI后端
- 所有token消耗来自Jiaqiang的Claude Max订阅

## 关键架构
- 每个advisor是 `content/advisors/xxx.md` 文件，包含人格描述和Department标签
- 团队角色定义在 `content/roles/`
- 项目上下文在 `content/project/MAITONG_CONTEXT.md`
- 提问流程：Round 1 (各advisor独立回答) → Round 2 (互相辩论，>2人时) → Round 3 (Synthesis输出JSON)
- Synthesis输出结构化JSON：overview (verdict/why/all_agree/all_worry/action_steps/blind_spots/risk) + departments
- 前端用react-markdown渲染

## 安全机制
- Invite Code注册（只有jiaqiang能生成）
- bcrypt密码 + HttpOnly session cookie
- 每人每天30问限额
- 全部请求日志（IP+用户+时间）
- Claude凭证只在服务端，前端无法访问

## 如何启动
```bash
cd ~/Desktop/maitong-advisor
npm run dev
# 打开 http://localhost:3000
# 默认管理员：jiaqiang / maitong2026
```

## 如何部署到云端（让团队远程访问）
```bash
# 方案：$5 云服务器 + Cloudflare Tunnel
# 1. 买一台 DigitalOcean/AWS Lightsail VM
# 2. 安装 Node.js + Claude Code，登录一次
# 3. 把项目 push 到 GitHub，在 VM 上 clone
# 4. npm install && npm run build && npm start
# 5. 安装 Cloudflare Tunnel，获取永久 HTTPS 链接
```

## 重要文件
- `src/lib/claude.ts` — Claude CLI调用，用--system-prompt-file避免参数过长
- `src/lib/advisors.ts` — prompt构建，短context给advisor，全context给synthesis
- `src/lib/db.ts` — SQLite所有表结构
- `src/app/api/ask/route.ts` — 核心API：3轮调用逻辑
- `content/advisors/` — 21个advisor人格文件
- `data/maitong.db` — SQLite数据库（自动创建）
- `MAITONG_Board_Guide.html` — 团队使用手册（Cmd+P导出PDF）

## 已知问题和待办
- 选太多advisor会慢（每个advisor一次独立claude调用）→ 建议选3-5个
- 部署到云VM还没做
- advisor质量可以用女娲.skill重新蒸馏提升：`npx skills add alchaincyf/nuwa-skill`
- 可以随时添加新advisor：在 `content/advisors/` 放一个 `.md` 文件，第二行写 `Department: xxx`
