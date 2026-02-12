"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

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

      setStatus("Decoding image…");
      
      try {
        // Use decodeFromImageElement for better reliability
        const result = await reader.decodeFromImageElement(img);
        const text = result.getText();
        setDecoded(text);
        setStatus("Decoded ✅");
        navigator.vibrate?.(50);
      } catch (decodeError: any) {
        // If decoding fails, try with the URL method as fallback
        try {
          const result = await reader.decodeFromImageUrl(url);
          const text = result.getText();
          setDecoded(text);
          setStatus("Decoded ✅");
          navigator.vibrate?.(50);
        } catch (fallbackError: any) {
          throw new Error("No QR code found in image. Try a clearer image or crop closer to the QR code.");
        }
      } finally {
        URL.revokeObjectURL(url);
      }
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
