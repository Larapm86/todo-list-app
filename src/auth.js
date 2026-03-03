/** Auth UI: modal, tooltip, sign in/up */
import { supabase, hasSupabase } from './supabase.js'
import { AUTH_VIEW } from './constants.js'
import * as state from './state.js'
import {
  authTooltip,
  authCta,
  authCtaMessage,
  authSignedIn,
  authInitial,
  authEmail,
  authModal,
  authModalTitle,
  authModalHint,
  authSigninForm,
  authSignupForm,
  authMessage,
  authSigninEmail,
  authSigninPassword,
  authSignupEmail,
  authSignupPassword,
} from './dom.js'

export function hideAuthTooltip() {
  if (authTooltip) {
    authTooltip.setAttribute('hidden', '')
    authTooltip.style.display = ''
  }
  if (state.authTooltipHideTimeout) {
    clearTimeout(state.authTooltipHideTimeout)
    state.setAuthTooltipHideTimeout(null)
  }
  if (state.authTooltipDismissListener) {
    document.removeEventListener('click', state.authTooltipDismissListener)
    state.setAuthTooltipDismissListener(null)
  }
}

export function showAuthTooltip() {
  if (!authCta || !authTooltip) return
  hideAuthTooltip()
  requestAnimationFrame(() => {
    if (!authCta || !authTooltip) return
    const rect = authCta.getBoundingClientRect()
    authTooltip.style.left = rect.left + rect.width / 2 - 28 + 'px'
    authTooltip.style.top = rect.bottom + 8 + 'px'
    authTooltip.style.display = 'block'
    authTooltip.removeAttribute('hidden')
    state.setAuthTooltipHideTimeout(setTimeout(hideAuthTooltip, 8000))
    const listener = (e) => {
      if (authTooltip?.hasAttribute('hidden')) return
      if (authTooltip?.contains(e.target) || authCta?.contains(e.target)) return
      hideAuthTooltip()
    }
    state.setAuthTooltipDismissListener(listener)
    setTimeout(() => document.addEventListener('click', listener), 0)
  })
}

export function updateAuthUI() {
  hideAuthTooltip()
  if (!hasSupabase() && authCtaMessage) {
    authCtaMessage.textContent = 'Sign in is not configured. Set env vars and redeploy.'
    authCtaMessage.style.color = '#e57373'
    authCtaMessage.removeAttribute('hidden')
  } else if (authCtaMessage) {
    authCtaMessage.setAttribute('hidden', '')
  }
  const isEmailUser = state.currentUser && !state.currentUser.is_anonymous
  if (isEmailUser) {
    authSignedIn?.removeAttribute('hidden')
    authCta?.setAttribute('hidden', '')
    if (authInitial) {
      const email = state.currentUser.email ?? ''
      authInitial.textContent = email ? email[0].toUpperCase() : '?'
    }
    if (authEmail) authEmail.textContent = state.currentUser.email ?? ''
    closeAuthModal()
  } else {
    authSignedIn?.setAttribute('hidden', '')
    authCta?.removeAttribute('hidden')
  }
  authMessage?.setAttribute('hidden', '')
  if (authMessage) authMessage.textContent = ''
}

export function setAuthView(tab) {
  const view = AUTH_VIEW[tab] || AUTH_VIEW.signin
  if (authModalTitle) authModalTitle.textContent = view.title
  if (authModalHint) authModalHint.textContent = view.hint
  authSigninForm?.classList.toggle('auth-form--hidden', tab !== 'signin')
  authSignupForm?.classList.toggle('auth-form--hidden', tab !== 'signup')
  authMessage?.setAttribute('hidden', '')
}

export function openAuthModal(tab = 'signin') {
  hideAuthTooltip()
  setAuthView(tab)
  authModal?.showModal()
}

export function closeAuthModal() {
  authModal?.close()
}

export function setAuthMessage(msg, isError = false) {
  if (!authMessage) return
  authMessage.textContent = msg
  authMessage.removeAttribute('hidden')
  authMessage.style.color = isError ? '#e57373' : undefined
}

export function initAuth(onLoadTodos) {
  authSigninForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    setAuthMessage('')
    if (!supabase) {
      setAuthMessage('Sign in is not configured. Set env vars and redeploy.', true)
      return
    }
    const email = authSigninEmail.value.trim()
    const password = authSigninPassword.value
    if (!email || !password) {
      setAuthMessage('Enter email and password.', true)
      return
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthMessage(error.message ?? 'Sign in failed.', true)
      return
    }
    state.setCurrentUser(data.user)
    updateAuthUI()
    await onLoadTodos()
    authSigninPassword.value = ''
    closeAuthModal()
  })

  authSignupForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    setAuthMessage('')
    if (!supabase) {
      setAuthMessage('Sign in is not configured. Set env vars and redeploy.', true)
      return
    }
    const email = authSignupEmail.value.trim()
    const password = authSignupPassword.value
    if (!email || !password) {
      setAuthMessage('Enter email and password.', true)
      return
    }
    if (password.length < 6) {
      setAuthMessage('Password must be at least 6 characters.', true)
      return
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setAuthMessage(error.message ?? 'Sign up failed.', true)
      return
    }
    state.setCurrentUser(data.user)
    updateAuthUI()
    await onLoadTodos()
    authSignupPassword.value = ''
    setAuthMessage('Account created. You are signed in.')
    closeAuthModal()
  })
}
