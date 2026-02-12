# QR Code Decoder

A professional-grade QR code scanning and decoding tool with industrial-strength image processing, built with Next.js.

![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)

## ✨ Features

- 📷 **Real-time Camera Scanning** - Scan QR codes using your device camera in real-time
- 🖼️ **Advanced Image Upload** - Upload QR code images with 100+ processing attempts for maximum success
- 🎯 **Industrial-Grade Algorithms** - Otsu threshold, adaptive binarization, and extreme contrast enhancement
- 📱 **Multi-Camera Support** - Automatically detect and switch between front/back cameras
- 🔗 **Smart Link Recognition** - Automatically identify URLs and provide quick access
- 📋 **One-Click Copy** - Easily copy decoded results to clipboard
- 💫 **Haptic Feedback** - Vibration feedback on successful scan (supported devices)
- 🎨 **Modern UI** - Clean and beautiful user interface with real-time processing status
- 🚀 **Fast & Responsive** - High-performance app built with Next.js 14
- 🔄 **Multi-Layer Fallback** - Combines jsQR and ZXing with intelligent fallback strategies

## 🎯 Advanced Decoding Capabilities

This tool can successfully decode challenging QR codes that many other tools struggle with:

- ✅ **Low-contrast QR codes** (gray on gray backgrounds)
- ✅ **Screen-captured photos** with moiré patterns
- ✅ **Blurry or out-of-focus images**
- ✅ **Poorly lit photos** (too dark or too bright)
- ✅ **Complex backgrounds**
- ✅ **Small QR codes** in large images
- ✅ **Damaged or partial QR codes**

The decoder uses **100+ different processing combinations** per image, including:
- Otsu's automatic threshold algorithm
- Adaptive binarization with multiple window sizes
- Extreme contrast stretching
- Image sharpening filters
- Multi-scale processing (6 different sizes)
- Brightness and contrast adjustments
- Grayscale conversion with various methods

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **UI Library**: [React 18](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Primary Decoder**: [jsQR](https://github.com/cozmo/jsQR) - Optimized for static image decoding
- **Backup Decoder**: [@zxing/browser](https://github.com/zxing-js/browser) - Real-time camera scanning
- **Image Processing**: Custom algorithms including Otsu threshold, adaptive binarization, and convolution filters

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

### Upload Mode (Recommended for Difficult QR Codes)

1. Click the **"Upload"** tab to switch to upload mode
2. Click **"Choose File"** to select an image containing a QR code
3. Watch as the system automatically tries 100+ different processing methods
4. Real-time status shows which technique is being applied
5. The result will be displayed once decoding succeeds

**Pro Tips for Best Results:**
- ✅ For low-contrast QR codes, use upload mode instead of camera
- ✅ Crop images closer to the QR code area for faster processing
- ✅ Ensure the QR code is visible and not severely damaged
- ✅ For screen photos, try to avoid severe moiré patterns by adjusting the angle

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

## 🔬 Technical Details

### Image Processing Pipeline

When you upload an image, the decoder applies a sophisticated multi-stage processing pipeline:

1. **Multi-Scale Processing** (6 scales: 0.75x, 1x, 1.5x, 2x, 2.5x, 3x)
   - Different scales help detect QR codes of various sizes
   - Particularly useful for screen photos and distant QR codes

2. **Otsu's Automatic Threshold** (Priority 1)
   - Industry-standard algorithm for automatic binarization
   - Calculates optimal threshold by maximizing inter-class variance
   - Highly effective for low-contrast images

3. **Extreme Contrast Stretching**
   - Stretches pixel values from [min, max] to [0, 255]
   - Makes subtle QR codes visible

4. **Image Sharpening**
   - Convolution-based edge enhancement
   - Improves detection of blurry QR codes

5. **Adaptive Binarization**
   - Local threshold calculation with multiple window sizes (10, 15, 20, 25)
   - Handles uneven lighting conditions

6. **Contrast Enhancement** (Multiple levels: 60, 80, 100, 120)
   - Combined with Otsu threshold for maximum effectiveness

7. **Brightness Adjustments**
   - Tested with various brightness offsets: ±30, ±50

8. **Dual Decoder Fallback**
   - jsQR (optimized for static images)
   - ZXing (robust general-purpose decoder)

**Total Combinations**: Over 100 different processing attempts per image!

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

- [jsQR](https://github.com/cozmo/jsQR) - Excellent pure JavaScript QR code library
- [ZXing](https://github.com/zxing-js/browser) - Comprehensive barcode scanning library
- [Next.js](https://nextjs.org/) - Powerful React framework
- [Vercel](https://vercel.com/) - Deployment platform

## 🌟 Why This Tool?

Unlike many basic QR code readers, this tool implements professional image processing techniques similar to those used in commercial applications like WeChat. The combination of multiple decoding strategies and advanced preprocessing makes it capable of reading QR codes that other tools miss.

**Perfect for:**
- 📸 Photos of screens with low contrast
- 🖼️ Old or degraded QR codes
- 📱 Screenshots and screen captures
- 🎯 QR codes in challenging lighting conditions
- 🔍 Small QR codes in large images

---

⭐ If this project helps you, please give it a star!
