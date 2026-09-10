import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { storage } from '@/utils/storage';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import ar from './locales/ar.json';
import ru from './locales/ru.json';
import ko from './locales/ko.json';
import hi from './locales/hi.json';
import id_ from './locales/id.json';
import it from './locales/it.json';
import tr from './locales/tr.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import th from './locales/th.json';
import vi from './locales/vi.json';
import ms from './locales/ms.json';
import el from './locales/el.json';

const LOCALES: Record<string, any> = { en, de, es, fr, pt, ja, zh, ar, ru, ko, hi, id: id_, it, tr, nl, pl, th, vi, ms, el };

export const LANGS_LAUNCH = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
];

export const LANGS = [
  ...LANGS_LAUNCH,
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ms', label: 'Melayu', flag: '🇲🇾' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
];

interface LangCtx {
  lang: string;
  setLang: (l: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  LANGS: typeof LANGS;
  LANGS_LAUNCH: typeof LANGS_LAUNCH;
}

const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    storage.getItem('so_lang').then(s => {
      console.log('[i18n] Loaded saved language:', s);
      if (s && LOCALES[s]) setLangState(s);
    });
  }, []);

  const setLang = useCallback((l: string) => {
    console.log('[i18n] Language changed to:', l);
    setLangState(l);
    storage.setItem('so_lang', l);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        console.log('[i18n] Syncing language to profile:', l);
        supabase.from('player_profiles').update({ language: l }).eq('user_id', data.user.id).then(() => {});
      }
    });
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let v: any = LOCALES[lang];
    for (const k of keys) { v = v?.[k]; }
    if (typeof v !== 'string') {
      v = LOCALES['en'];
      for (const k of keys) { v = v?.[k]; }
    }
    if (typeof v !== 'string') return key;
    if (params) for (const [k, val] of Object.entries(params)) v = v.replace(new RegExp(`\\{${k}\\}`, 'g'), String(val));
    return v;
  }, [lang]);

  return <Ctx.Provider value={{ lang, setLang, t, LANGS, LANGS_LAUNCH }}>{children}</Ctx.Provider>;
}

export function useTranslation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTranslation outside LanguageProvider');
  return ctx;
}
