import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ alignItems: "center", background: "#7c3aed", borderRadius: 42, display: "flex", height: "100%", justifyContent: "center", position: "relative", width: "100%" }}>
      <div style={{ alignItems: "center", background: "#f8fafc", borderRadius: 20, display: "flex", flexDirection: "column", height: 104, justifyContent: "center", marginTop: 20, overflow: "hidden", width: 118 }}>
        <div style={{ background: "#fb7185", height: 24, position: "absolute", top: 48, width: 118 }} />
        <div style={{ color: "#7c3aed", display: "flex", fontSize: 31, fontWeight: 800, gap: 8, marginTop: 27 }}>● ● ●</div>
        <div style={{ background: "#7c3aed", borderRadius: 8, height: 10, marginTop: 8, width: 42 }} />
      </div>
      <div style={{ borderLeft: "17px solid transparent", borderRight: "17px solid transparent", borderBottom: "15px solid #f8fafc", height: 0, left: 38, position: "absolute", top: 24, transform: "rotate(180deg)", width: 0 }} />
    </div>,
    size,
  );
}
