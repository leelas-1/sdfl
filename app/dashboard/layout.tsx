import React from "react"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home | Dashboard',
  description: 'View your portfolio balance, buy and sell cryptocurrency.',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
