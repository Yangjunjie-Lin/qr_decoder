import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR Decoder",
  description: "Decode QR codes via camera or upload, runs fully in-browser."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
