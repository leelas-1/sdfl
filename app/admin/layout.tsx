import React from "react"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Panel | Session Control',
  description: 'Real-time session management and control panel',
  robots: 'noindex, nofollow',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
