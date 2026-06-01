import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/Nav"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Aaj Kya Banega",
  description: "Weekly dinner menu planner for your household",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <body className="min-h-screen bg-white">
        <div className="mx-auto max-w-[720px] px-4 pb-20">
          <Nav />
          {children}
        </div>
      </body>
    </html>
  )
}
