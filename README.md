# AutoDL Private Cloud GPU Monitor

这是一个基于 Next.js 14 (App Router) 构建的 AutoDL 私有云实例监控与自动启动工具。它能够监控指定的 GPU 机器状态，一旦发现空闲机器，自动尝试启动关联的实例，并发送邮件通知。

## 功能特性

- **美观 UI**: 使用 TailwindCSS + shadcn/ui 风格组件，支持深色/浅色模式。
- **安全登录**: 密码 SHA1 加密，双重 API 验证，Token 存储在 HttpOnly Cookie 中。
- **实例管理**: 可视化选择需要监控的实例，支持批量选择。
- **自动监控**: 自定义检查间隔，实时监控机器 GPU 空闲状态。
- **自动抢占**: 发现空闲机器自动发起开机请求。
- **邮件通知**: 开机成功后通过 SMTP 发送邮件提醒 (支持 QQ 邮箱)。
- **实时日志**: 详细的运行日志面板，支持自动滚动与状态着色。

## 技术栈

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Email**: Nodemailer

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写邮件配置（可选，如需邮件通知则必须配置）：

```bash
cp .env.example .env.local
```

编辑 `.env.local`:

```env
# 发送邮件的邮箱 (推荐QQ邮箱)
EMAIL_SENDER=123456789@qq.com
# SMTP 授权码 (不是邮箱密码，在QQ邮箱设置-账户-SMTP中获取)
EMAIL_AUTH_CODE=abcdefghijklmn
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可开始使用。

## 部署

```bash
npm run build
npm start
```

## 注意事项

- 本项目仅供学习与个人使用。
- 请勿高频请求 AutoDL 接口以免被封禁。
- Token 存储在 Cookie 中，安全性较高，但请勿在公共网络环境下泄露 Cookie。
