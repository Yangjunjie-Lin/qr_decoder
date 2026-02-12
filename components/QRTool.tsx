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

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("Canvas not supported");
      }

      // Step 1: Create a small preview for fast QR detection
      const previewSize = 400; // Very small for speed
      const scale = previewSize / Math.max(img.width, img.height);
      const previewWidth = Math.floor(img.width * scale);
      const previewHeight = Math.floor(img.height * scale);
      
      canvas.width = previewWidth;
      canvas.height = previewHeight;
      ctx.drawImage(img, 0, 0, previewWidth, previewHeight);
      const previewData = ctx.getImageData(0, 0, previewWidth, previewHeight);

      // Fast QR region detection using edge density
      const detectQRRegion = (imageData: ImageData): { x: number, y: number, width: number, height: number } | null => {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const gridSize = 20; // Divide into 20x20 grid
        const cellWidth = Math.floor(width / gridSize);
        const cellHeight = Math.floor(height / gridSize);
        
        let maxDensity = 0;
        let bestX = 0, bestY = 0;
        
        // Find area with highest edge density (likely QR code)
        for (let gy = 0; gy < gridSize - 4; gy++) {
          for (let gx = 0; gx < gridSize - 4; gx++) {
            let density = 0;
            
            // Check 5x5 cell area
            for (let dy = 0; dy < 5; dy++) {
              for (let dx = 0; dx < 5; dx++) {
                const cx = (gx + dx) * cellWidth;
                const cy = (gy + dy) * cellHeight;
                
                // Sample center of cell
                const px = Math.min(cx + cellWidth / 2, width - 1);
                const py = Math.min(cy + cellHeight / 2, height - 1);
                const idx = (py * width + px) * 4;
                
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                // Check horizontal edge
                if (px < width - 1) {
                  const rightIdx = (py * width + px + 1) * 4;
                  const rightGray = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
                  density += Math.abs(gray - rightGray);
                }
                
                // Check vertical edge
                if (py < height - 1) {
                  const downIdx = ((py + 1) * width + px) * 4;
                  const downGray = (data[downIdx] + data[downIdx + 1] + data[downIdx + 2]) / 3;
                  density += Math.abs(gray - downGray);
                }
              }
            }
            
            if (density > maxDensity) {
              maxDensity = density;
              bestX = gx;
              bestY = gy;
            }
          }
        }
        
        // If found high-density area, return it with padding
        if (maxDensity > 1000) {
          const padding = 1; // Add 1 cell padding
          return {
            x: Math.max(0, (bestX - padding) * cellWidth),
            y: Math.max(0, (bestY - padding) * cellHeight),
            width: Math.min((5 + padding * 2) * cellWidth, width),
            height: Math.min((5 + padding * 2) * cellHeight, height)
          };
        }
        
        return null;
      };

      setStatus("Detecting QR region…");
      const region = detectQRRegion(previewData);
      
      let targetWidth, targetHeight, targetX = 0, targetY = 0;
      
      if (region) {
        // Scale region back to original image coordinates
        const scaleBack = 1 / scale;
        targetX = Math.floor(region.x * scaleBack);
        targetY = Math.floor(region.y * scaleBack);
        targetWidth = Math.floor(region.width * scaleBack);
        targetHeight = Math.floor(region.height * scaleBack);
        
        console.log(`🎯 QR region detected: ${targetWidth}x${targetHeight} at (${targetX}, ${targetY})`);
      } else {
        // No region detected, use center crop
        const size = Math.min(img.width, img.height);
        targetX = (img.width - size) / 2;
        targetY = (img.height - size) / 2;
        targetWidth = size;
        targetHeight = size;
        
        console.log("📍 Using center crop");
      }

      // Step 2: Process only the detected region at good resolution
      const maxRegionSize = 800;
      const regionScale = Math.min(1, maxRegionSize / Math.max(targetWidth, targetHeight));
      const finalWidth = Math.floor(targetWidth * regionScale);
      const finalHeight = Math.floor(targetHeight * regionScale);
      
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      ctx.drawImage(img, targetX, targetY, targetWidth, targetHeight, 0, 0, finalWidth, finalHeight);
      const croppedData = ctx.getImageData(0, 0, finalWidth, finalHeight);

      setStatus("Decoding region…");

      // Fast decode helper
      const tryDecode = (imageData: ImageData, label: string): string | null => {
        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          if (code) {
            console.log(`✅ Decoded with ${label}`);
            return code.data;
          }
        } catch (e) {
          console.warn(`Failed ${label}:`, e);
        }
        return null;
      };

      // Fast contrast stretch
      const autoContrast = (imageData: ImageData): ImageData => {
        const data = new Uint8ClampedArray(imageData.data);
        let min = 255, max = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (gray < min) min = gray;
          if (gray > max) max = gray;
        }
        
        const range = max - min;
        if (range > 10) {
          const scale = 255 / range;
          for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const stretched = Math.round((gray - min) * scale);
            data[i] = data[i + 1] = data[i + 2] = stretched;
          }
        }
        
        return new ImageData(data, imageData.width, imageData.height);
      };

      // Simple threshold
      const simpleThreshold = (imageData: ImageData, threshold: number): ImageData => {
        const data = new Uint8ClampedArray(imageData.data);
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const value = gray > threshold ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = value;
        }
        return new ImageData(data, imageData.width, imageData.height);
      };

      // Try original
      let result = tryDecode(croppedData, "cropped-original");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }

      // Try auto contrast
      result = tryDecode(autoContrast(croppedData), "cropped-contrast");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }

      // Try thresholds
      for (const threshold of [115, 140, 165]) {
        result = tryDecode(simpleThreshold(croppedData, threshold), `threshold-${threshold}`);
        if (result) {
          setDecoded(result);
          setStatus("Decoded ✅");
          navigator.vibrate?.(50);
          URL.revokeObjectURL(url);
          return;
        }
      }

      // If region detection failed, try full image as fallback
      if (!region) {
        setStatus("Trying full image…");
        const fullSize = 600;
        const fullScale = fullSize / Math.max(img.width, img.height);
        const fullWidth = Math.floor(img.width * fullScale);
        const fullHeight = Math.floor(img.height * fullScale);
        
        canvas.width = fullWidth;
        canvas.height = fullHeight;
        ctx.drawImage(img, 0, 0, fullWidth, fullHeight);
        const fullData = ctx.getImageData(0, 0, fullWidth, fullHeight);
        
        result = tryDecode(fullData, "full-image");
        if (result) {
          setDecoded(result);
          setStatus("Decoded ✅");
          navigator.vibrate?.(50);
          URL.revokeObjectURL(url);
          return;
        }
        
        result = tryDecode(autoContrast(fullData), "full-contrast");
        if (result) {
          setDecoded(result);
          setStatus("Decoded ✅");
          navigator.vibrate?.(50);
          URL.revokeObjectURL(url);
          return;
        }
      }

      // Last resort: ZXing
      setStatus("Backup decoder…");
      try {
        const zxingResult = await reader.decodeFromImageElement(img);
        setDecoded(zxingResult.getText());
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      } catch (e) {
        console.warn("ZXing failed:", e);
      }

      URL.revokeObjectURL(url);
      throw new Error("Could not decode QR code. Try: 1) Crop closer to QR code, 2) Ensure QR code is clearly visible, 3) Check if QR code is damaged");
      
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
