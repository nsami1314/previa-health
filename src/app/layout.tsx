import type { Metadata, Viewport } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Previa Health",
  description: "Your Lifelong AI Health Companion",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Previa Health",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-zinc-900">
        <ClerkProvider>
          <header className="border-b border-zinc-200 bg-white">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
              <Link
                href="/"
                className="text-sm font-semibold tracking-tight text-zinc-900"
              >
                Previa Health
              </Link>
              <nav className="flex items-center gap-3">
                <Show when="signed-out">
                  <SignInButton mode="redirect">
                    <button
                      type="button"
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                    >
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="redirect">
                    <button
                      type="button"
                      className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-800"
                    >
                      Sign Up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    Dashboard
                  </Link>
                  <UserButton />
                </Show>
              </nav>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
