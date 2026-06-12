import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { Toaster } from 'sonner'
import '../styles/globals.css'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <SessionProvider session={session}>
      <LanguageProvider>
        <Toaster richColors position="top-right" closeButton />
        <Component {...pageProps} />
      </LanguageProvider>
    </SessionProvider>
  )
}
