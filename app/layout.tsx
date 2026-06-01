import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/Nav"
import { ToastContainer } from "@/components/Toast"

const dmSans = DM_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "आज क्या बनेगा?",
  description: "Weekly dinner menu planner for your household",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} antialiased`}>
      <body className="min-h-screen" style={{ background: '#FAF9F6' }}>
        <div className="mx-auto max-w-[680px] px-5 pb-24">
          <Nav />
          {children}
        </div>
        <ToastContainer />
      </body>
    </html>
  )
}
