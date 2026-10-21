import { ImageResponse } from "next/og";

export const alt = "Launch your online store in minutes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#1b1250,#5b3df5 55%,#d6249f)", color: "white" }}>
        <div style={{ fontSize: 30, opacity: 0.8 }}>Multi-tenant e-commerce</div>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, marginTop: 20 }}>Launch your online store in minutes.</div>
        <div style={{ fontSize: 32, marginTop: 28, opacity: 0.85 }}>Products · Payments · Themes · Custom domains</div>
      </div>
    ),
    size,
  );
}
