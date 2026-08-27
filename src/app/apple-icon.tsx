import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <svg width="180" height="180" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="17" fill="#7C3AED" />
      <defs>
        <linearGradient id="checkbox" x1="23" y1="32" x2="41" y2="47" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB7185" />
          <stop offset="0.5" stopColor="#A855F7" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <rect x="41" y="11" width="7" height="14" rx="2" fill="#FB7185" />
      <path d="M9 29L27 12C29.8 9.3 34.2 9.3 37 12L55 29V49C55 52.314 52.314 55 49 55H15C11.686 55 9 52.314 9 49V29Z" fill="#F8FAFC" />
      <path d="M9 29L27 12C29.8 9.3 34.2 9.3 37 12L55 29" stroke="#F8FAFC" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="23" y="33" width="18" height="18" rx="4" fill="url(#checkbox)" />
      <path d="M27 42L31 46L37 39" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>,
    size,
  );
}
