export type ThemeId = 'navy' | 'teal' | 'gray' | 'crimson' | 'amber' | 'emerald';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  desc: string;
  previewGradient: string;
  badgeColor: string;
  dotColor: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'navy',
    name: 'Navy Blue',
    desc: 'Hiện đại, công nghệ & uy tín chuẩn Apple TD Store',
    previewGradient: 'from-cyan-500 to-blue-600',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    dotColor: '#06b6d4',
  },
  {
    id: 'teal',
    name: 'Pastel Teal',
    desc: 'Tươi sáng, dịu mắt với gam xanh ngọc Pastel',
    previewGradient: 'from-teal-400 to-cyan-500',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    dotColor: '#14b8a6',
  },
  {
    id: 'gray',
    name: 'Space Gray',
    desc: 'Tối giản, kim loại Titan & huyền bí phong cách Pro Max',
    previewGradient: 'from-slate-400 to-slate-600',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    dotColor: '#94a3b8',
  },
  {
    id: 'crimson',
    name: 'Crimson Red',
    desc: 'Mạnh mẽ, nhiệt huyết & cá tính thời thượng',
    previewGradient: 'from-rose-500 to-red-600',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    dotColor: '#f43f5e',
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    desc: 'Sang trọng, ấm áp như sắc vàng Gold sa mạc',
    previewGradient: 'from-amber-400 to-orange-500',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dotColor: '#f59e0b',
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    desc: 'Thịnh vượng, tự nhiên & biểu tượng tài lộc kinh doanh',
    previewGradient: 'from-emerald-400 to-teal-600',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dotColor: '#10b981',
  },
];

const THEME_STORAGE_KEY = 'tdm_active_theme';

export function getSavedTheme(): ThemeId {
  if (typeof window === 'undefined') return 'navy';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
    if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.error('Error reading theme:', e);
  }
  return 'navy';
}

export function applyTheme(themeId: ThemeId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', themeId);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (e) {
    console.error('Error saving theme:', e);
  }
}
