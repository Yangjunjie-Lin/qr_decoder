# QR Code Decoder

A modern QR code scanning and decoding tool built with Next.js and ZXing.

![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)

## ✨ Features

- 📷 **Real-time Camera Scanning** - Scan QR codes using your device camera in real-time
- 🖼️ **Image Upload Decoding** - Upload QR code images for instant decoding
- 📱 **Multi-Camera Support** - Automatically detect and switch between front/back cameras
- 🔗 **Smart Link Recognition** - Automatically identify URLs and provide quick access
- 📋 **One-Click Copy** - Easily copy decoded results to clipboard
- 💫 **Haptic Feedback** - Vibration feedback on successful scan (supported devices)
- 🎨 **Modern UI** - Clean and beautiful user interface
- 🚀 **Fast & Responsive** - High-performance app built with Next.js 14

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **UI Library**: [React 18](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **QR Decoding**: [@zxing/browser](https://github.com/zxing-js/browser) - Powerful QR/barcode scanning library

## 📦 Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Yangjunjie-Lin/qr_decoder.git
cd qr_decoder
npm install
```

## 🚀 Usage

### Development Mode

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

### Production Build

Build for production:

```bash
npm run build
npm start
```

## 💡 How to Use

### Camera Mode

1. Click the **"Camera"** tab to switch to camera mode
2. Allow browser camera permissions when prompted
3. Select your preferred camera from the dropdown if multiple are available
4. Click **"Start Scan"** to begin scanning
5. Point the QR code within the camera frame
6. The result will be displayed automatically upon successful scan

### Upload Mode

1. Click the **"Upload"** tab to switch to upload mode
2. Click **"Choose File"** to select an image containing a QR code
3. The system will automatically decode and display the result

### Result Actions

- If the decoded result is a URL, an **"Open Link"** button will appear for quick access
- Click the **"Copy"** button to copy the result to your clipboard

## 📁 Project Structure

```
qr_decoder/
├── app/
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout component
│   └── page.tsx         # Home page
├── components/
│   └── QRTool.tsx       # Main QR scanning tool component
├── next.config.js       # Next.js configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project dependencies
```

## 🔧 Configuration

### Camera Permission

The app requires access to your device camera. On first use, the browser will request permission. Make sure:

- You're using HTTPS or localhost
- Your browser supports the MediaDevices API
- Camera access permission is granted

### Browser Compatibility

Compatible with all modern browsers:

- ✅ Chrome / Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📄 License

MIT License

## 👤 Author

Yangjunjie Lin

- GitHub: [@Yangjunjie-Lin](https://github.com/Yangjunjie-Lin)

## 🙏 Acknowledgments

- [ZXing](https://github.com/zxing-js/browser) - Excellent barcode scanning library
- [Next.js](https://nextjs.org/) - Powerful React framework
- [Vercel](https://vercel.com/) - Deployment platform

---

⭐ If this project helps you, please give it a star!
