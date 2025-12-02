import "@/styles/globals.css";

import { type Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";
import { SmoothScroll } from "@/components/smooth-scroll";

export const metadata: Metadata = {
  title: "bobnot3",
  description: "Collaborative note-taking workspace",
  icons: [
    { rel: "icon", url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { rel: "icon", url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { rel: "apple-touch-icon", url: "/icon-192.png", sizes: "192x192" },
  ],
};

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  // Bricolage is variable, supports axes.
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <TRPCReactProvider>
              <SmoothScroll>
                {children}
              </SmoothScroll>
            </TRPCReactProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
