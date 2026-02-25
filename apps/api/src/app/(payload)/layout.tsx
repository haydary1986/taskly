import React from 'react'

export const metadata = {
  title: 'Taskly Admin',
  description: 'ALGO-NEST Workforce Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
