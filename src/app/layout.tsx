import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NotificationProvider } from "@/components/home/shared-ui";

export const metadata: Metadata = {
  title: "The Vulpetti Home",
  description: "A family command center for the moments that matter.",
  icons: {
    icon: "/icon.svg?v=3",
    apple: "/apple-icon?v=3",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vulpetti Home",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><NotificationProvider>{children}</NotificationProvider></body>
    </html>
  );
}
