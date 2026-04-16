# MAITONG 专家团

脉通团队内部 AI 决策辅助系统。

21 位世界级人物的思维模型被蒸馏成 AI 顾问，覆盖 7 个部门，针对团队提出的任何问题从多个专业角度给出建议。

---

## 它解决什么问题

早期创业团队资源有限，不可能请到真正的顾问委员会。这个系统通过 AI 模拟，让团队随时获得跨领域的高质量决策参考。

每个顾问不是简单的角色扮演，而是基于公开资料（传记、演讲、访谈、著作）蒸馏出的**思维操作系统**——心智模型、决策启发式、表达风格、价值观。

---

## 工作原理

```
团队成员提问
      |
      v
  选择顾问（1-21 位，按部门分类）
      |
      v
  Round 1 — 每位顾问独立回答（并行）
      |
      v
  Round 2 — 顾问互相辩论（>2 人时触发）
      |
      v
  Round 3 — Board Consensus 综合输出
      |
      v
  结构化结果
  ├── 总结论 + 为什么
  ├── 全员共识 / 全员担忧 / 盲点
  ├── 各部门具体建议（折叠）
  └── 辩论详情（折叠）
```

AI 后端使用 Claude Code CLI（`claude --print`），所有 token 消耗来自 Claude Max 订阅，无额外 API 费用。

---

## 21 位顾问

| 部门 | 顾问 | 擅长领域 |
|------|------|----------|
| **综合** | Elon Musk | 第一性原则、硬件成本、跨部门整合 |
| | Steve Jobs | 产品极致主义、软硬件整合 |
| | 张一鸣 | 系统思维、数据驱动决策 |
| **商业** | Sam Altman | YC 经验、早期融资 |
| | Paul Graham | 创业本质、PMF |
| | Peter Thiel | 垄断思维、从 0 到 1 |
| **设计** | Jony Ive | 工业设计、材料选择 |
| | 深泽直人 | 东方美学、无意识设计 |
| | James Dyson | 工程迭代、原型测试 |
| **临床** | 倪海厦 | 经方大家、脉诊体系 |
| | 黄煌 | 方证对应、临床实战 |
| | 李可 | 危急重症、破格用药 |
| **技术** | Andrej Karpathy | AI 架构、从零搭建 |
| | Demis Hassabis | AI + 生物医学交叉 |
| | 吴恩达 | ML 工程化、数据为中心 |
| **法务** | 张磊 | 中美双市场法律架构 |
| | Marc Andreessen | 硅谷股权结构 |
| | 刘强东 | 知识产权保护实战 |
| **财务** | Warren Buffett | 资本配置、现金流 |
| | 孙正义 | 早期投资视角 |
| | Charlie Munger | 多元思维模型、逆向思考 |

---

## 蒸馏方法

顾问的人格文件不是随意编写的，而是通过结构化蒸馏生成：

**工具：** [女娲.skill](https://github.com/alchaincyf/nuwa-skill) — 开源的人物思维蒸馏框架

**蒸馏流程：**

```
输入人物名称
      |
      v
  6 个并行研究 Agent 收集资料
  （书籍、播客、社交媒体、批评者视角、决策记录、人生时间线）
      |
      v
  三重验证筛选
  （跨 2+ 领域出现 / 能预测新问题立场 / 非显而易见）
      |
      v
  构建 SKILL.md
  ├── 3-7 个心智模型（含来源证据 + 应用方式 + 局限性）
  ├── 5-10 个决策启发式（含案例 + 适用场景）
  ├── 表达 DNA（句式 + 词汇 + 幽默类型）
  ├── 价值观排序
  ├── 反模式（此人绝对不会做的事）
  ├── 内在张力（矛盾与深度来源）
  └── 诚实边界（此 Skill 不能做什么）
      |
      v
  质量验证（3-4 个测试问题）
```

每个蒸馏后的文件存放在 `content/advisors/` 目录。

---

## 项目结构

```
maitong-advisor/
├── content/
│   ├── advisors/          # 21 个顾问人格文件
│   │   ├── elon-musk.md
│   │   ├── warren-buffett.md
│   │   └── ...
│   ├── roles/             # 团队角色定义
│   │   ├── jiaqiang.md    # CTO 视角
│   │   ├── yvette.md      # CEO 视角
│   │   └── moira.md       # 算法工程师视角
│   └── project/
│       └── MAITONG_CONTEXT.md  # 脉通项目全貌
│
├── src/
│   ├── lib/
│   │   ├── advisors.ts    # Prompt 构建引擎
│   │   ├── claude.ts      # Claude CLI 调用桥接
│   │   ├── db.ts          # SQLite 数据库
│   │   ├── auth.ts        # 认证与会话管理
│   │   └── setup.ts       # 管理员自动初始化
│   ├── app/
│   │   ├── login/         # 登录 / 注册页
│   │   ├── dashboard/     # 主界面（提问 + 历史）
│   │   └── api/           # 后端接口
│   │       ├── ask/       # 核心：3 轮顾问调用
│   │       ├── advisors/  # 顾问列表
│   │       ├── auth/      # 登录 / 登出 / 会话
│   │       ├── history/   # 问答历史
│   │       └── admin/     # 邀请码生成
│   └── components/
│       └── Markdown.tsx   # Markdown 渲染组件
│
├── data/                  # SQLite 数据库（自动创建，不入库）
├── CLAUDE.md              # Claude Code 项目上下文
└── MAITONG_Board_Guide.html  # 团队使用手册（浏览器打开，Cmd+P 导出 PDF）
```

---

## 安全机制

| 威胁 | 防护 |
|------|------|
| 未授权访问 | Invite Code 注册制，只有管理员能生成 |
| 密码泄露 | bcrypt 哈希，HttpOnly Session Cookie |
| Token 滥用 | 每人每天 30 个问题限额 |
| URL 外泄 | 部署时使用 Cloudflare Tunnel（HTTPS，IP 不暴露） |
| Claude 凭证 | 仅在服务端运行，前端无法接触 |
| 操作审计 | 全部请求记录（IP + 用户 + 时间 + 操作） |

---

## 快速启动

**环境要求：** Node.js 18+、Claude Code CLI 已登录

```bash
# 克隆项目
git clone https://github.com/jaywang-cpu/maitong-advisor-board.git
cd maitong-advisor-board

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000

默认管理员账号：`jiaqiang` / `maitong2026`（首次访问自动创建）

---

## 如何添加新顾问

在 `content/advisors/` 目录下创建一个 `.md` 文件：

```markdown
# 人物名 — Advisor Persona
Department: overview

（人格描述、心智模型、决策启发式、表达风格...）
```

Department 可选值：`overview` / `business` / `design` / `clinical` / `tech` / `legal` / `finance`

保存后刷新页面即可生效，无需重启。

**用女娲蒸馏新人物：**

```bash
npx skills add alchaincyf/nuwa-skill
# 然后在 Claude Code 中说："帮我蒸馏 [人物名]"
# 将生成的内容保存到 content/advisors/ 对应文件
```

---

## 如何更新项目上下文

项目进展变化时（融资、招人、里程碑），更新 `content/project/MAITONG_CONTEXT.md`。

所有顾问的回答会自动基于最新的项目状态。

---

## 部署到云服务器

让团队远程访问（不依赖本地电脑）：

```bash
# 1. 购买 $5/月 云服务器（DigitalOcean / AWS Lightsail）
# 2. 安装 Node.js 18+ 和 Claude Code CLI
# 3. 在服务器上登录 Claude Code（只需一次）
# 4. 克隆项目并启动
git clone https://github.com/jaywang-cpu/maitong-advisor-board.git
cd maitong-advisor-board
npm install
npm run build
npm start

# 5. 安装 Cloudflare Tunnel，获取永久 HTTPS 链接
# 6. 将链接分享给团队
```

---

## 技术栈

- **前端：** Next.js 16 + TypeScript + Tailwind CSS
- **数据库：** SQLite（better-sqlite3）
- **AI 后端：** Claude Code CLI（`claude --print --system-prompt-file`）
- **Markdown 渲染：** react-markdown + remark-gfm
- **认证：** bcryptjs + HttpOnly Cookie Session

---

## 致谢

- [女娲.skill](https://github.com/alchaincyf/nuwa-skill) — 人物思维蒸馏框架
- [awesome-persona-distill-skills](https://github.com/xixu-me/awesome-persona-distill-skills) — 蒸馏 Skill 合集
