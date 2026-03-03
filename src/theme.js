import { themeDarkBtn, themeLightBtn } from './dom.js'
import { THEME_STORAGE_KEY } from './constants.js'

const FAVICON_DARK = '/favicon-dark.svg'
const FAVICON_LIGHT = '/favicon-light.svg'

function updateFavicon(theme) {
  const href = theme === 'light' ? FAVICON_LIGHT : FAVICON_DARK
  const favicon = document.getElementById('favicon')
  const appleTouch = document.getElementById('apple-touch-icon')
  if (favicon) favicon.href = href
  if (appleTouch) appleTouch.href = href
}

export function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  if (themeDarkBtn) themeDarkBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false')
  if (themeLightBtn) themeLightBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false')
  updateFavicon(theme)
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
