import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ background: "#7c3aed", borderRadius: 42, display: "flex", height: "100%", position: "relative", width: "100%" }}>
      <div style={{ background: "#f8fafc", height: 86, left: 47, position: "absolute", top: 34, transform: "rotate(45deg)", width: 86 }} />
      <div style={{ background: "#f8fafc", borderRadius: 20, height: 104, left: 31, position: "absolute", top: 65, width: 118 }} />
      <div style={{ background: "#fb7185", borderRadius: 8, height: 18, left: 46, position: "absolute", top: 91, width: 18 }} />
      <div style={{ background: "#0ea5e9", borderRadius: 8, height: 18, left: 116, position: "absolute", top: 91, width: 18 }} />
      <div style={{ background: "#7c3aed", borderRadius: "12px 12px 0 0", bottom: 0, height: 48, left: 68, position: "absolute", width: 44 }} />
    </div>,
    size,
  );
}
