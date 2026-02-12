"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import jsQR from "jsqr";

type Mode = "camera" | "upload";

function looksLikeUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function QRTool() {
  const [mode, setMode] = useState<Mode>("camera");
  const [status, setStatus] = useState<string>("Idle");
  const [decoded, setDecoded] = useState<string>("");
  const [lastError, setLastError] = useState<string>("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>(""); // selected camera
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const reader = useMemo(() => new BrowserQRCodeReader(), []);

  // list cameras
  useEffect(() => {
    let cancelled = false;
    async function loadDevices() {
      try {
        setLastError("");
        setStatus("Loading camera devices… (you may need to allow permission first)");
        const list = await BrowserQRCodeReader.listVideoInputDevices();
        if (cancelled) return;
        setDevices(list);

        // try to pick a back camera by label if present
        const back = list.find((d) => /back|rear|environment/i.test(d.label));
        const pick = back?.deviceId || list[0]?.deviceId || "";
        setDeviceId((prev) => prev || pick);

        setStatus("Ready");
      } catch (e: any) {
        if (cancelled) return;
        setStatus("Ready (camera devices not available yet)");
        setLastError(String(e?.message || e));
      }
    }
    loadDevices();
    return () => {
      cancelled = true;
    };
  }, []);

  // stop camera on unmount
  useEffect(() => {
    return () => {
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScan() {
    setLastError("");
    setDecoded("");

    if (!videoRef.current) {
      setLastError("Video element not ready.");
      return;
    }
    if (!deviceId && devices.length === 0) {
      setLastError("No camera device found.");
      return;
    }

    try {
      setStatus("Requesting camera permission…");
      setIsScanning(true);

      // decodeFromVideoDevice will manage getUserMedia and decoding loop
      const controls = await reader.decodeFromVideoDevice(
        deviceId || undefined, // undefined lets it pick default camera
        videoRef.current,
        (result, error, controls) => {
          // result appears whenever decoded
          if (result) {
            const text = result.getText();
            setDecoded(text);
            setStatus("Decoded ✅");
            navigator.vibrate?.(50);

            // stop after first decode; you can remove this to keep continuous scanning
            controls.stop();
            controlsRef.current = null;
            setIsScanning(false);
          } else if (error) {
            // ignore frequent decode errors while scanning; only show if needed
          }
        }
      );

      controlsRef.current = controls;
      setStatus("Scanning… point the QR code inside the frame");
    } catch (e: any) {
      setIsScanning(false);
      setStatus("Ready");
      setLastError(String(e?.message || e));
    }
  }

  function stopScan() {
    try {
      controlsRef.current?.stop();
    } catch {}
    controlsRef.current = null;
    setIsScanning(false);
    setStatus("Stopped");
  }

  async function onUpload(file: File | null) {
    setLastError("");
    setDecoded("");

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setStatus("Failed to decode image");
      setLastError("Please select a valid image file");
      return;
    }

    try {
      setStatus("Loading image…");
      
      // Create an image element to load the file
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      // Wait for image to load
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = url;
      });

      // Helper function to try jsQR with different image processing techniques
      const tryJsQRWithProcessing = (imageData: ImageData, label: string): string | null => {
        let code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code) {
          console.log(`✅ Decoded with ${label}`);
          return code.data;
        }
        return null;
      };

      // Otsu's automatic threshold algorithm - industry standard
      const otsuThreshold = (imageData: ImageData): ImageData => {
        const data = new Uint8ClampedArray(imageData.data);
        const width = imageData.width;
        const height = imageData.height;
        
        // Convert to grayscale first
        const grayData = new Uint8Array(width * height);
        for (let i = 0; i < grayData.length; i++) {
          const idx = i * 4;
          grayData[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }
        
        // Calculate histogram
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < grayData.length; i++) {
          histogram[grayData[i]]++;
        }
        
        // Calculate total
        const total = width * height;
        
        // Calculate Otsu threshold
        let sum = 0;
        for (let i = 0; i < 256; i++) {
          sum += i * histogram[i];
        }
        
        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let maxVariance = 0;
        let threshold = 0;
        
        for (let t = 0; t < 256; t++) {
          wB += histogram[t];
          if (wB === 0) continue;
          
          wF = total - wB;
          if (wF === 0) break;
          
          sumB += t * histogram[t];
          
          const mB = sumB / wB;
          const mF = (sum - sumB) / wF;
          
          const variance = wB * wF * (mB - mF) * (mB - mF);
          
          if (variance > maxVariance) {
            maxVariance = variance;
            threshold = t;
          }
        }
        
        // Apply threshold
        const output = new Uint8ClampedArray(data.length);
        for (let i = 0; i < grayData.length; i++) {
          const value = grayData[i] > threshold ? 255 : 0;
          output[i * 4] = value;
          output[i * 4 + 1] = value;
          output[i * 4 + 2] = value;
          output[i * 4 + 3] = 255;
        }
        
        return new ImageData(output, width, height);
      };

      // Extreme contrast enhancement for low-contrast QR codes
      const extremeContrast = (imageData: ImageData): ImageData => {
        const data = new Uint8ClampedArray(imageData.data);
        
        // Convert to grayscale and find min/max
        let min = 255, max = 0;
        const grayValues = [];
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          grayValues.push(gray);
          if (gray < min) min = gray;
          if (gray > max) max = gray;
        }
        
        // Stretch contrast to full range
        const range = max - min;
        if (range > 0) {
          for (let i = 0; i < grayValues.length; i++) {
            const stretched = ((grayValues[i] - min) / range) * 255;
            data[i * 4] = stretched;
            data[i * 4 + 1] = stretched;
            data[i * 4 + 2] = stretched;
          }
        }
        
        return new ImageData(data, imageData.width, imageData.height);
      };

      // Helper function to enhance contrast
      const enhanceContrast = (imageData: ImageData, contrast: number): ImageData => {
        const data = new Uint8ClampedArray(imageData.data);
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
          data[i] = factor * (data[i] - 128) + 128;
          data[i + 1] = factor * (data[i + 1] - 128) + 128;
          data[i + 2] = factor * (data[i + 2] - 128) + 128;
        }
        
        return new ImageData(data, imageData.width, imageData.height);
      };

      // Helper function to apply adaptive threshold (local binarization)
      const adaptiveThreshold = (imageData: ImageData, windowSize: number = 15): ImageData => {
        const data = new Uint8ClampedArray(imageData.data);
        const width = imageData.width;
        const height = imageData.height;
        
        // First convert to grayscale
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
        
        const output = new Uint8ClampedArray(data.length);
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let sum = 0;
            let count = 0;
            
            // Calculate local mean
            for (let wy = -windowSize; wy <= windowSize; wy++) {
              for (let wx = -windowSize; wx <= windowSize; wx++) {
                const ny = y + wy;
                const nx = x + wx;
                if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                  const idx = (ny * width + nx) * 4;
                  sum += data[idx];
                  count++;
                }
              }
            }
            
            const mean = sum / count;
            const idx = (y * width + x) * 4;
            const threshold = mean * 0.92;
            const value = data[idx] > threshold ? 255 : 0;
            
            output[idx] = output[idx + 1] = output[idx + 2] = value;
            output[idx + 3] = 255;
          }
        }
        
        return new ImageData(output, width, height);
      };

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("Canvas not supported");
      }

      // Optimize image size for faster processing (limit to max 2000px on longest side)
      const maxDimension = 2000;
      let workingWidth = img.width;
      let workingHeight = img.height;
      
      if (img.width > maxDimension || img.height > maxDimension) {
        const scale = maxDimension / Math.max(img.width, img.height);
        workingWidth = Math.floor(img.width * scale);
        workingHeight = Math.floor(img.height * scale);
        console.log(`Downscaling image from ${img.width}x${img.height} to ${workingWidth}x${workingHeight} for faster processing`);
      }

      // === PHASE 1: Ultra-fast attempts (< 1 second) ===
      setStatus("Decoding…");
      canvas.width = workingWidth;
      canvas.height = workingHeight;
      ctx.drawImage(img, 0, 0, workingWidth, workingHeight);
      const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Try original first (fastest path - works for ~70% of clear QR codes)
      let result = tryJsQRWithProcessing(originalData, "original");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }
      
      // Try extreme contrast (fast and effective for low contrast)
      result = tryJsQRWithProcessing(extremeContrast(originalData), "extreme contrast");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }

      // === PHASE 2: Advanced processing (2-3 seconds) ===
      setStatus("Advanced processing…");
      
      // Try Otsu (slower but very effective for gray-on-gray)
      result = tryJsQRWithProcessing(otsuThreshold(originalData), "Otsu");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }

      // === PHASE 3: Multi-scale (if still not found) ===
      setStatus("Multi-scale scan…");
      const priorityScales = [1.5, 2]; // Reduced to 2 most effective scales
      
      for (const scale of priorityScales) {
        canvas.width = workingWidth * scale;
        canvas.height = workingHeight * scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const scaledData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Try original at this scale
        result = tryJsQRWithProcessing(scaledData, `${scale}x`);
        if (result) {
          setDecoded(result);
          setStatus("Decoded ✅");
          navigator.vibrate?.(50);
          URL.revokeObjectURL(url);
          return;
        }
        
        // Try extreme contrast at this scale
        result = tryJsQRWithProcessing(extremeContrast(scaledData), `${scale}x extreme`);
        if (result) {
          setDecoded(result);
          setStatus("Decoded ✅");
          navigator.vibrate?.(50);
          URL.revokeObjectURL(url);
          return;
        }
        
        // Try Otsu at this scale (only if scale is reasonable)
        if (scale <= 2) {
          result = tryJsQRWithProcessing(otsuThreshold(scaledData), `${scale}x Otsu`);
          if (result) {
            setDecoded(result);
            setStatus("Decoded ✅");
            navigator.vibrate?.(50);
            URL.revokeObjectURL(url);
            return;
          }
        }
      }

      // === PHASE 4: Last resort techniques (complex backgrounds) ===
      setStatus("Final attempt…");
      
      // Try adaptive threshold (slowest but handles complex backgrounds)
      result = tryJsQRWithProcessing(adaptiveThreshold(originalData, 15), "adaptive");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }
      
      // Try enhanced contrast + Otsu
      const highContrast = enhanceContrast(originalData, 100);
      result = tryJsQRWithProcessing(otsuThreshold(highContrast), "contrast+Otsu");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }

      // === PHASE 5: ZXing fallback ===
      setStatus("ZXing decoder…");
      try {
        const zxingResult = await reader.decodeFromImageElement(img);
        const text = zxingResult.getText();
        setDecoded(text);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      } catch (zxingError) {
        console.warn("ZXing failed:", zxingError);
      }

      try {
        const zxingResult = await reader.decodeFromImageUrl(url);
        const text = zxingResult.getText();
        setDecoded(text);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      } catch (urlError) {
        console.warn("ZXing URL method failed:", urlError);
      }

      URL.revokeObjectURL(url);
      throw new Error("Could not decode QR code. Try: 1) Crop closer to the QR code, 2) Ensure better lighting, 3) Take a clearer photo");
      
    } catch (e: any) {
      setStatus("Failed to decode image");
      setLastError(String(e?.message || e));
    }
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(decoded);
      setStatus("Copied to clipboard ✅");
    } catch {
      setStatus("Copy failed (clipboard permission)");
    }
  }

  function openIfUrl() {
    if (!looksLikeUrl(decoded)) return;
    window.open(decoded, "_blank", "noopener,noreferrer");
  }

  const isUrl = decoded ? looksLikeUrl(decoded) : false;

  return (
    <section className="card">
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <div className="tabs">
          <button
            className={`tab ${mode === "camera" ? "active" : ""}`}
            onClick={() => {
              setMode("camera");
              setLastError("");
              setDecoded("");
            }}
          >
            Camera
          </button>
          <button
            className={`tab ${mode === "upload" ? "active" : ""}`}
            onClick={() => {
              stopScan();
              setMode("upload");
              setLastError("");
              setDecoded("");
            }}
          >
            Upload
          </button>
        </div>

        <div className="badge">
          <span className="mono">{status}</span>
        </div>
      </div>

      <hr />

      {mode === "camera" && (
        <>
          <div className="videoWrap">
            <video ref={videoRef} muted playsInline />
            <div className="overlay">
              <div className="scanBox" />
            </div>
          </div>

          <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
            <button className="btn primary" onClick={startScan} disabled={isScanning}>
              {isScanning ? "Scanning…" : "Start Scan"}
            </button>
            <button className="btn" onClick={stopScan} disabled={!isScanning}>
              Stop
            </button>

            <div style={{ flex: 1 }} />

            <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Camera:
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#eaf0ff"
                }}
                disabled={isScanning}
              >
                {devices.length === 0 ? (
                  <option value="">Default</option>
                ) : (
                  devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 6)}…`}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          <div className="small" style={{ marginTop: 10 }}>
            If permission prompt doesn’t show: on iOS use Safari, ensure the site is HTTPS, and allow camera access.
          </div>
        </>
      )}

      {mode === "upload" && (
        <>
          <div className="row" style={{ alignItems: "center" }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px dashed rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.05)",
                color: "#eaf0ff",
                cursor: "pointer"
              }}
            />
          </div>
          <div className="small" style={{ marginTop: 10, lineHeight: "1.6" }}>
            <strong>Tips for better results:</strong>
            <ul style={{ marginTop: 6, marginLeft: 20, marginBottom: 0 }}>
              <li>Use clear, well-lit images</li>
              <li>Crop close to the QR code area</li>
              <li>Ensure the QR code is not blurry or distorted</li>
              <li>Avoid glare or shadows on the QR code</li>
            </ul>
          </div>
        </>
      )}

      <hr />

      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <div className="badge">
          <span>Result</span>
          {decoded && <span className="mono">{isUrl ? "URL" : "TEXT"}</span>}
        </div>

        <div className="row">
          <button className="btn" onClick={copyResult} disabled={!decoded}>
            Copy
          </button>
          <button className="btn primary" onClick={openIfUrl} disabled={!decoded || !isUrl}>
            Open URL
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <textarea
          className="mono"
          placeholder="Decoded QR content will appear here…"
          value={decoded}
          readOnly
        />
      </div>

      {lastError && (
        <div className="small" style={{ marginTop: 10, color: "rgba(255,200,200,0.95)" }}>
          Error: <span className="mono">{lastError}</span>
        </div>
      )}
    </section>
  );
}
