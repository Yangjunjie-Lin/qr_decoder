# QR Code Decoder

一个基于 Next.js 和 ZXing 的现代化二维码扫描和解码工具。

![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)

## ✨ 功能特性

- 📷 **实时摄像头扫描** - 使用设备摄像头实时扫描二维码
- 🖼️ **图片上传解码** - 支持上传二维码图片进行解码
- 📱 **多摄像头支持** - 自动检测并可切换前后置摄像头
- 🔗 **智能链接识别** - 自动识别URL并提供快速访问
- 📋 **一键复制** - 轻松复制解码结果到剪贴板
- 💫 **振动反馈** - 扫描成功时提供触觉反馈（支持的设备）
- 🎨 **现代化UI** - 简洁美观的用户界面
- 🚀 **快速响应** - 基于 Next.js 14 的高性能应用

## 🛠️ 技术栈

- **框架**: [Next.js 14](https://nextjs.org/) (App Router)
- **UI库**: [React 18](https://react.dev/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **QR解码**: [@zxing/browser](https://github.com/zxing-js/browser) - 强大的二维码/条形码扫描库

## 📦 安装

克隆仓库并安装依赖：

```bash
git clone https://github.com/Yangjunjie-Lin/qr_decoder.git
cd qr_decoder
npm install
```

## 🚀 使用

### 开发模式

启动开发服务器：

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 生产构建

构建生产版本：

```bash
npm run build
npm start
```

## 💡 使用说明

### 摄像头模式

1. 点击 **"Camera"** 标签切换到摄像头模式
2. 允许浏览器访问摄像头权限
3. 如有多个摄像头，可从下拉菜单选择
4. 点击 **"Start Scan"** 开始扫描
5. 将二维码对准摄像头框内
6. 扫描成功后会自动显示解码结果

### 图片上传模式

1. 点击 **"Upload"** 标签切换到上传模式
2. 点击 **"Choose File"** 选择包含二维码的图片
3. 系统自动解码并显示结果

### 结果操作

- 如果解码结果是URL，会显示 **"Open Link"** 按钮，点击即可访问
- 点击 **"Copy"** 按钮可将结果复制到剪贴板

## 📁 项目结构

```
qr_decoder/
├── app/
│   ├── globals.css      # 全局样式
│   ├── layout.tsx       # 根布局组件
│   └── page.tsx         # 首页
├── components/
│   └── QRTool.tsx       # QR码扫描工具主组件
├── next.config.js       # Next.js 配置
├── tsconfig.json        # TypeScript 配置
└── package.json         # 项目依赖
```

## 🔧 配置

### 摄像头权限

应用需要访问设备摄像头。首次使用时，浏览器会请求权限。请确保：

- 使用 HTTPS 或 localhost
- 浏览器支持 MediaDevices API
- 已授予摄像头访问权限

### 浏览器兼容性

支持所有现代浏览器：

- ✅ Chrome / Edge (推荐)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 👤 作者

Yangjunjie Lin

- GitHub: [@Yangjunjie-Lin](https://github.com/Yangjunjie-Lin)

## 🙏 致谢

- [ZXing](https://github.com/zxing-js/browser) - 优秀的条码扫描库
- [Next.js](https://nextjs.org/) - 强大的 React 框架
- [Vercel](https://vercel.com/) - 部署平台

---

⭐ 如果这个项目对你有帮助，请给个星标！
