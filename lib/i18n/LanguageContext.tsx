'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { LangCode, LANGUAGES, translations, getT, AI_LANG_INSTRUCTION } from './translations'

interface LanguageContextValue {
  lang: LangCode
  setLang: (l: LangCode) => void
  t: (key: string, vars?: Record<string, string>) => string
  aiInstruction: string
  langName: string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  aiInstruction: '',
  langName: 'English',
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('en')

  useEffect(() => {
    const saved = localStorage.getItem('healthai-lang') as LangCode | null
    if (saved && translations[saved]) setLangState(saved)
  }, [])

  const setLang = (l: LangCode) => {
    setLangState(l)
    localStorage.setItem('healthai-lang', l)
  }

  const t = getT(lang)
  const aiInstruction = AI_LANG_INSTRUCTION[lang]
  const langName = LANGUAGES.find(l => l.code === lang)?.nativeName || 'English'

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, aiInstruction, langName }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
