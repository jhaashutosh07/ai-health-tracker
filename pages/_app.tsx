import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { Toaster } from 'sonner'
import { Plus_Jakarta_Sans } from 'next/font/google'
import '../styles/globals.css'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <SessionProvider session={session}>
      <LanguageProvider>
        <div className={`${jakarta.variable} ${jakarta.className}`}>
          <Toaster richColors position="top-right" closeButton />
          <Component {...pageProps} />
        </div>
      </LanguageProvider>
    </SessionProvider>
  )
}
