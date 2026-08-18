export const THEME_KEY = 'favedex_theme'

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'dark' ? 'dark' : 'video'
  } catch {
    return 'video'
  }
}

export function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore write failures (e.g. storage disabled)
  }
}
