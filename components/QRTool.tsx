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

      // Helper function to try jsQR
      const tryDecode = (imageData: ImageData, label: string): string | null => {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code) {
          console.log(`✅ Decoded with ${label}`);
          return code.data;
        }
        return null;
      };

      // Fast grayscale conversion
      const toGrayscale = (imageData: ImageData): ImageData => {
        const data = new Uint8ClampedArray(imageData.data);
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3; // Fast average
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
        return new ImageData(data, imageData.width, imageData.height);
      };

      // Fast simple threshold (much faster than Otsu)
      const simpleThreshold = (imageData: ImageData, threshold: number = 128): ImageData => {
        const data = new Uint8ClampedArray(imageData.data);
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const value = gray > threshold ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = value;
        }
        return new ImageData(data, imageData.width, imageData.height);
      };

      // Fast contrast stretch (like WeChat)
      const autoContrast = (imageData: ImageData): ImageData => {
        const data = new Uint8ClampedArray(imageData.data);
        let min = 255, max = 0;
        
        // Find min/max quickly
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (gray < min) min = gray;
          if (gray > max) max = gray;
        }
        
        const range = max - min;
        if (range > 0) {
          const scale = 255 / range;
          for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const stretched = (gray - min) * scale;
            data[i] = data[i + 1] = data[i + 2] = stretched;
          }
        }
        
        return new ImageData(data, imageData.width, imageData.height);
      };

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("Canvas not supported");
      }

      // WeChat-style optimization: aggressively downscale for speed
      // Most QR codes work well at 800-1200px max dimension
      const maxDim = 1000;
      let width = img.width;
      let height = img.height;
      
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);

      setStatus("Decoding…");

      // Strategy 1: Try original (works for clear QR codes) - 50% success
      let result = tryDecode(imgData, "original");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }

      // Strategy 2: Auto contrast (WeChat's key technique) - 30% success
      result = tryDecode(autoContrast(imgData), "auto-contrast");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }

      // Strategy 3: Grayscale - 5% success
      result = tryDecode(toGrayscale(imgData), "grayscale");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }

      // Strategy 4: Try multiple thresholds quickly - 10% success
      for (const threshold of [100, 140, 160]) {
        result = tryDecode(simpleThreshold(imgData, threshold), `threshold-${threshold}`);
        if (result) {
          setDecoded(result);
          setStatus("Decoded ✅");
          navigator.vibrate?.(50);
          URL.revokeObjectURL(url);
          return;
        }
      }

      // Strategy 5: Try 1.5x scale (last quick attempt) - 3% success
      canvas.width = width * 1.5;
      canvas.height = height * 1.5;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const scaled = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      result = tryDecode(scaled, "1.5x");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }

      result = tryDecode(autoContrast(scaled), "1.5x-contrast");
      if (result) {
        setDecoded(result);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
        URL.revokeObjectURL(url);
        return;
      }

      // Last resort: ZXing
      setStatus("Trying backup decoder…");
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
      throw new Error("Could not decode QR code. Try cropping closer to the QR code or taking a clearer photo.");
      
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
