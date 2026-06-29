import { useCallback, useEffect, useState } from 'react';
import { THEMES, DEFAULT_THEME_ID } from '../themes';
import type { ThemeDefinition } from '../themes';

const STORAGE_KEY = 'dozero_theme';

/**
 * Applies a ThemeDefinition by injecting CSS custom properties directly onto
 * document.documentElement so they override the `:root` values in index.css.
 * Also sets `data-theme` for any data-attribute-based CSS overrides.
 */
function applyTheme(theme: ThemeDefinition) {
  const el = document.documentElement;

  el.setAttribute('data-theme', theme.id);

  // ── Core
  el.style.setProperty('--bg-primary',    theme.bgPrimary);
  el.style.setProperty('--bg-secondary',  theme.bgSecondary);
  el.style.setProperty('--bg-tertiary',   theme.bgTertiary);

  // ── Text
  el.style.setProperty('--text-primary',   theme.textPrimary);
  el.style.setProperty('--text-secondary', theme.textSecondary);

  // ── Accent
  el.style.setProperty('--accent-primary', theme.accentPrimary);
  el.style.setProperty('--accent-hover',   theme.accentHover);
  el.style.setProperty('--accent-glow',    theme.accentGlow);
  // Also expose as --accent-secondary (used in wiki.css but missing in :root)
  el.style.setProperty('--accent-secondary', theme.accentHover);

  // ── Status
  el.style.setProperty('--danger',  theme.danger);
  el.style.setProperty('--success', theme.success);
  el.style.setProperty('--warning', theme.warning);
  el.style.setProperty('--mana',    theme.mana);

  // ── Glass
  el.style.setProperty('--glass-bg',               theme.glassBg);
  el.style.setProperty('--glass-border',            theme.glassBorder);
  el.style.setProperty('--glass-border-highlight',  theme.glassBorderHighlight);
  el.style.setProperty('--glass-shadow',            theme.glassShadow);

  // ── Typography
  el.style.setProperty('--font-body',    theme.fontBody);
  el.style.setProperty('--font-display', theme.fontDisplay);

  // ── Extras
  el.style.setProperty('--gradient-text',    theme.gradientText);
  el.style.setProperty('--scrollbar-thumb',  theme.scrollbarThumb);

  // ── Wiki variables (mirror so wiki.css also responds to theme)
  el.style.setProperty('--wv-bg',     theme.bgPrimary);
  el.style.setProperty('--wv-panel',  theme.bgSecondary);
  el.style.setProperty('--wv-border', theme.glassBorder);
  el.style.setProperty('--wv-text',   theme.textPrimary);
  el.style.setProperty('--wv-accent', theme.accentPrimary);
  el.style.setProperty('--wv-muted',  theme.textSecondary);
  el.style.setProperty('--tab-active-color', theme.accentPrimary);
  el.style.setProperty('--color-editor-bg',  theme.bgSecondary);
}

export function useTheme() {
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME_ID;
  });

  // Apply the theme on mount and whenever the ID changes
  useEffect(() => {
    const theme = THEMES.find(t => t.id === currentThemeId) ?? THEMES[0];
    applyTheme(theme);
  }, [currentThemeId]);

  const setTheme = useCallback((id: string) => {
    const theme = THEMES.find(t => t.id === id);
    if (!theme) return;
    localStorage.setItem(STORAGE_KEY, id);
    setCurrentThemeId(id);
    applyTheme(theme);
  }, []);

  const currentTheme = THEMES.find(t => t.id === currentThemeId) ?? THEMES[0];

  return { currentTheme, currentThemeId, setTheme, themes: THEMES };
}
