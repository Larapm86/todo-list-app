import { themeDarkBtn, themeLightBtn } from './dom.js'
import { THEME_STORAGE_KEY } from './constants.js'

export function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  if (themeDarkBtn) themeDarkBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false')
  if (themeLightBtn) themeLightBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false')
}

export function initTheme() {
  applyTheme(getPreferredTheme())
  if (themeDarkBtn) {
    themeDarkBtn.addEventListener('click', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
      applyTheme('dark')
    })
  }
  if (themeLightBtn) {
    themeLightBtn.addEventListener('click', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light')
      applyTheme('light')
    })
  }
}
