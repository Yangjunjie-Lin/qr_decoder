import QRTool from "@/components/QRTool";

export default function Page() {
  return (
    <main className="row" style={{ flexDirection: "column", gap: 14 }}>
      <header className="row" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>QR Decoder</h1>
          <div className="small">Use camera scanning or upload an image from your album. Runs fully in-browser.</div>
        </div>
        <div className="badge">
          <span>HTTPS required for camera</span>
        </div>
      </header>

      <QRTool />

      <footer className="small" style={{ opacity: 0.7 }}>
        Tip: if decoding fails, try better lighting, keep the phone steady, or upload a clearer image/crop to the QR area.
      </footer>
    </main>
  );
}
