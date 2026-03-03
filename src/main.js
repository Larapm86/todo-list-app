import './style.css'
import { supabase, hasSupabase } from './supabase.js'

const form = document.querySelector('.add-form')
const input = document.getElementById('todo-input')
const listEl = document.querySelector('.todo-list')

const authSignedIn = document.getElementById('auth-signed-in')
const authInitial = document.getElementById('auth-initial')
const authEmail = document.getElementById('auth-email')
const authSignOut = document.getElementById('auth-sign-out')
const authCta = document.getElementById('auth-cta')
const authCtaMessage = document.getElementById('auth-cta-message')
const authOpenLogin = document.getElementById('auth-open-login')
const authOpenSignup = document.getElementById('auth-open-signup')
const authModal = document.getElementById('auth-modal')
const authModalClose = authModal?.querySelector('.auth-modal__close')
const authSigninForm = document.getElementById('auth-signin-form')
const authSignupForm = document.getElementById('auth-signup-form')
const authSigninEmail = document.getElementById('auth-signin-email')
const authSigninPassword = document.getElementById('auth-signin-password')
const authSignupEmail = document.getElementById('auth-signup-email')
const authSignupPassword = document.getElementById('auth-signup-password')
const authMessage = document.getElementById('auth-message')
const authModalTitle = document.getElementById('auth-modal-title')
const authModalHint = document.getElementById('auth-modal-hint')
const authSwitchToSignup = document.getElementById('auth-switch-to-signup')
const authSwitchToSignin = document.getElementById('auth-switch-to-signin')
const authTooltip = document.getElementById('auth-tooltip')
let authTooltipHideTimeout = null
let authTooltipDismissListener = null
const todoErrorEl = document.getElementById('todo-error')
const todoEmptyEl = document.getElementById('todo-empty')
const todoAddBtn = document.getElementById('todo-add-btn')
const todoAddBtnIcon = todoAddBtn?.querySelector('.add-form__submit-icon')
const todoAddBtnSpinner = todoAddBtn?.querySelector('.add-form__spinner')
const todoChipsAdd = document.querySelectorAll('.add-form__chips .chip')
const todoFilterButtons = document.querySelectorAll('.filter-btn')
const todoNoMatchEl = document.getElementById('todo-no-match')
const statusDropdown = document.getElementById('status-dropdown')
const statusFilterTrigger = document.getElementById('status-filter-trigger')
const statusFilterLabel = document.getElementById('status-filter-label')
const statusDropdownPanel = document.getElementById('status-dropdown-panel')
const statusDropdownOptions = document.querySelectorAll('.status-dropdown__option')
const toastEl = document.getElementById('toast')
const toastMessage = toastEl?.querySelector('.toast__message')
const toastUndo = toastEl?.querySelector('.toast__undo')
const themeDarkBtn = document.getElementById('theme-dark')
const themeLightBtn = document.getElementById('theme-light')

const CATEGORY_LABELS = { general: 'General', work: 'Work', personal: 'Personal', errands: 'Errands' }

const PLACEHOLDER_EXAMPLES = [
  'Example: Dance like nobody\'s watching',
  'Example: Adopt a pet unicorn',
  'Example: Send a meme to a friend',
  'Example: Write a letter to your future self',
  'Example: Pretend you\'re a superhero for 5 min',
  'Example: Build a pillow fort',
  'Example: Invent a new ice cream flavor',
  'Example: Try a new accent for the day',
  'Example: Create a secret handshake',
  'Example: Give your plant a motivational speech',
  'Example: Finish reading that book',
]

function setRandomPlaceholder() {
  if (input && PLACEHOLDER_EXAMPLES.length) {
    input.placeholder = PLACEHOLDER_EXAMPLES[Math.floor(Math.random() * PLACEHOLDER_EXAMPLES.length)]
  }
}

const THEME_STORAGE_KEY = 'todo-theme'
function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  if (themeDarkBtn) themeDarkBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false')
  if (themeLightBtn) themeLightBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false')
}
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

const TRASH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'

const CHECKBOX_SVG =
  '<svg class="todo-item__checkbox-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polyline class="todo-item__checkbox-check" points="9 12 11 14 15 10"/></svg>'

const CONFETTI_COLORS = ['#5b21b6', '#7c3aed', '#2383e2', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#e11d48']

function showConfetti(originRect) {
  const container = document.createElement('div')
  container.className = 'confetti'
  container.setAttribute('aria-hidden', 'true')
  const centerX = originRect ? originRect.left + originRect.width / 2 : window.innerWidth / 2
  const centerY = originRect ? originRect.top + originRect.height / 2 : window.innerHeight * 0.2
  container.style.left = centerX + 'px'
  container.style.top = centerY + 'px'
  const count = 55
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div')
    piece.className = 'confetti__piece'
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
    const spread = 120 + Math.random() * 180
    const endX = Math.cos(angle) * spread * (Math.random() > 0.5 ? 1 : -1)
    const endY = 80 + Math.random() * 120
    piece.style.setProperty('--end-x', endX + 'px')
    piece.style.setProperty('--end-y', endY + 'px')
    piece.style.setProperty('--delay', Math.random() * 0.25 + 's')
    piece.style.setProperty('--duration', 1.2 + Math.random() * 0.6 + 's')
    piece.style.setProperty('--rotation', (Math.random() - 0.5) * 540 + 'deg')
    piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
    piece.style.width = (Math.random() > 0.5 ? 8 : 6) + 'px'
    piece.style.height = (Math.random() > 0.5 ? 6 : 8) + 'px'
    container.appendChild(piece)
  }
  document.body.appendChild(container)
  setTimeout(() => container.remove(), 2200)
}

let todos = []
let currentUser = null
let categoryFilter = ''
let statusFilter = 'all' // 'all' | 'active' | 'completed'
let selectedCategoryForNew = 'general'
let addLoading = false
let undoDeleteTimeout = null
let lastDeletedTodo = null
let pendingDeleteId = null

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null
    updateAuthUI()
  })
}

function hideAuthTooltip() {
  if (authTooltip) {
    authTooltip.setAttribute('hidden', '')
    authTooltip.style.display = ''
  }
  if (authTooltipHideTimeout) {
    clearTimeout(authTooltipHideTimeout)
    authTooltipHideTimeout = null
  }
  if (authTooltipDismissListener) {
    document.removeEventListener('click', authTooltipDismissListener)
    authTooltipDismissListener = null
  }
}

function showAuthTooltip() {
  if (!authCta || !authTooltip) return
  hideAuthTooltip()
  requestAnimationFrame(() => {
    if (!authCta || !authTooltip) return
    const rect = authCta.getBoundingClientRect()
    authTooltip.style.left = (rect.left + rect.width / 2 - 28) + 'px'
    authTooltip.style.top = rect.bottom + 8 + 'px'
    authTooltip.style.display = 'block'
    authTooltip.removeAttribute('hidden')
    authTooltipHideTimeout = setTimeout(hideAuthTooltip, 8000)
    authTooltipDismissListener = (e) => {
      if (authTooltip?.hasAttribute('hidden')) return
      if (authTooltip?.contains(e.target) || authCta?.contains(e.target)) return
      hideAuthTooltip()
    }
    setTimeout(() => document.addEventListener('click', authTooltipDismissListener), 0)
  })
}

function updateAuthUI() {
  hideAuthTooltip()
  if (!hasSupabase() && authCtaMessage) {
    authCtaMessage.textContent = 'Sign in is not configured. Set env vars and redeploy.'
    authCtaMessage.style.color = '#e57373'
    authCtaMessage.removeAttribute('hidden')
  } else if (authCtaMessage) {
    authCtaMessage.setAttribute('hidden', '')
  }
  const isEmailUser = currentUser && !currentUser.is_anonymous
  if (isEmailUser) {
    authSignedIn?.removeAttribute('hidden')
    authCta?.setAttribute('hidden', '')
    if (authInitial) {
      const email = currentUser.email ?? ''
      authInitial.textContent = email ? email[0].toUpperCase() : '?'
    }
    if (authEmail) authEmail.textContent = currentUser.email ?? ''
    closeAuthModal()
  } else {
    authSignedIn?.setAttribute('hidden', '')
    authCta?.removeAttribute('hidden')
  }
  authMessage?.setAttribute('hidden', '')
  if (authMessage) authMessage.textContent = ''
}

const AUTH_VIEW = {
  signin: {
    title: 'Back in action!',
    hint: 'Step back into your todo zone'
  },
  signup: {
    title: 'Welcome!',
    hint: 'Create an account and conquer your todos'
  }
}

function setAuthView(tab) {
  const view = AUTH_VIEW[tab] || AUTH_VIEW.signin
  if (authModalTitle) authModalTitle.textContent = view.title
  if (authModalHint) authModalHint.textContent = view.hint
  authSigninForm?.classList.toggle('auth-form--hidden', tab !== 'signin')
  authSignupForm?.classList.toggle('auth-form--hidden', tab !== 'signup')
  authMessage?.setAttribute('hidden', '')
}

function openAuthModal(tab = 'signin') {
  hideAuthTooltip()
  setAuthView(tab)
  authModal?.showModal()
}

function closeAuthModal() {
  authModal?.close()
}

function setAuthMessage(msg, isError = false) {
  if (!authMessage) return
  authMessage.textContent = msg
  authMessage.removeAttribute('hidden')
  authMessage.style.color = isError ? '#e57373' : undefined
}

function showTodoError(msg) {
  if (todoErrorEl) {
    todoErrorEl.textContent = msg
    todoErrorEl.removeAttribute('hidden')
  }
}

function clearTodoError() {
  if (todoErrorEl) {
    todoErrorEl.textContent = ''
    todoErrorEl.setAttribute('hidden', '')
  }
  input?.classList.remove('add-form__input--error')
}

function setAddLoading(loading) {
  addLoading = loading
  if (todoAddBtn) todoAddBtn.disabled = loading
  if (todoAddBtnIcon) todoAddBtnIcon.hidden = loading
  if (todoAddBtnSpinner) {
    todoAddBtnSpinner.hidden = !loading
  }
}

async function ensureSession() {
  if (!supabase) return
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.user) {
    currentUser = session.user
    return
  }
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('Anonymous sign-in failed:', error)
    throw error
  }
  currentUser = data.user
}

async function loadTodos() {
  if (!currentUser || !supabase) return
  const { data, error } = await supabase
    .from('todos')
    .select('id, todo_text:text, completed, created_at, category')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Failed to load todos:', error)
    return
  }
  todos = (data ?? []).map((row) => ({
    id: row.id,
    text: typeof row.todo_text === 'string' ? row.todo_text : (typeof row.text === 'string' ? row.text : ''),
    completed: Boolean(row.completed),
    created_at: row.created_at,
    category: typeof row.category === 'string' ? row.category : 'general',
  }))
  renderTodos()
}

async function addTodo(taskText, category = 'general') {
  const trimmed = typeof taskText === 'string' ? taskText.trim() : ''
  if (!trimmed) {
    input?.classList.add('add-form__input--error')
    showTodoError('Enter a task.')
    return
  }
  if (!supabase) {
    showTodoError('Sign in is not configured.')
    return
  }
  const cat = typeof category === 'string' && category ? category : 'general'
  setAddLoading(true)
  clearTodoError()
  await supabase.auth.refreshSession()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user
  const isAnonymous = !user || user.is_anonymous
  if (isAnonymous) {
    setAddLoading(false)
    const localId = 'local-' + Date.now()
    const newTodo = {
      id: localId,
      text: trimmed,
      completed: false,
      created_at: new Date().toISOString(),
      category: cat,
    }
    todos.push(newTodo)
    renderTodos(true, newTodo.id)
    showAuthTooltip()
    return
  }
  const { data: inserted, error } = await supabase
    .from('todos')
    .insert({ text: trimmed, completed: false, user_id: user.id, category: cat })
    .select('id, todo_text:text, completed, created_at, category')
    .single()
  setAddLoading(false)
  if (error) {
    console.error('Failed to add todo:', error)
    showTodoError(error.message)
    return
  }
  clearTodoError()
  currentUser = user
  if (inserted) {
    const newTodo = {
      id: inserted.id,
      text: typeof inserted.todo_text === 'string' ? inserted.todo_text : (typeof inserted.text === 'string' ? inserted.text : trimmed),
      completed: Boolean(inserted.completed),
      created_at: inserted.created_at,
      category: typeof inserted.category === 'string' ? inserted.category : 'general',
    }
    todos.push(newTodo)
    renderTodos(true, newTodo.id)
  } else {
    await loadTodos()
  }
}

function isLocalTodoId(id) {
  return typeof id === 'string' && id.startsWith('local-')
}

async function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id)
  if (!todo) return
  const completed = !todo.completed
  if (isLocalTodoId(id)) {
    todo.completed = completed
    if (completed) {
      const li = listEl?.querySelector(`[data-todo-id="${id}"]`)
      const checkbox = li?.querySelector('.todo-item__checkbox')
      const rect = checkbox?.getBoundingClientRect()
      showConfetti(rect)
    }
    renderTodos()
    return
  }
  if (!supabase) return
  const { error } = await supabase.from('todos').update({ completed }).eq('id', id)
  if (error) {
    console.error('Failed to toggle todo:', error)
    return
  }
  todo.completed = completed
  if (completed) {
    const li = listEl?.querySelector(`[data-todo-id="${id}"]`)
    const checkbox = li?.querySelector('.todo-item__checkbox')
    const rect = checkbox?.getBoundingClientRect()
    showConfetti(rect)
  }
  renderTodos()
}

function deleteTodo(id) {
  const todo = todos.find((t) => t.id === id)
  if (!todo) return
  if (undoDeleteTimeout) clearTimeout(undoDeleteTimeout)
  lastDeletedTodo = { ...todo }
  pendingDeleteId = id
  const li = listEl?.querySelector(`[data-todo-id="${id}"]`)
  if (li) {
    const h = li.offsetHeight
    li.style.maxHeight = h + 'px'
    li.style.overflow = 'hidden'
    li.classList.add('todo-item--removing')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        li.style.maxHeight = '0'
      })
    })
    setTimeout(() => {
      todos = todos.filter((t) => t.id !== id)
      renderTodos()
    }, 320)
  } else {
    todos = todos.filter((t) => t.id !== id)
    renderTodos()
  }
  if (toastMessage) toastMessage.textContent = 'Todo deleted.'
  toastEl?.removeAttribute('hidden')
  undoDeleteTimeout = setTimeout(() => {
    toastEl?.setAttribute('hidden', '')
    lastDeletedTodo = null
    if (pendingDeleteId && supabase && !isLocalTodoId(pendingDeleteId)) {
      supabase.from('todos').delete().eq('id', pendingDeleteId).then(() => {})
    }
    pendingDeleteId = null
    undoDeleteTimeout = null
  }, 5000)
}

function undoDelete() {
  if (!lastDeletedTodo) return
  todos.push(lastDeletedTodo)
  todos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  renderTodos()
  toastEl?.setAttribute('hidden', '')
  if (undoDeleteTimeout) clearTimeout(undoDeleteTimeout)
  undoDeleteTimeout = null
  lastDeletedTodo = null
  pendingDeleteId = null
}

function renderTodos(justAdded = false, addedId = null) {
  let toShow = categoryFilter
    ? todos.filter((t) => (t.category || 'general') === categoryFilter)
    : [...todos]
  if (statusFilter === 'active') toShow = toShow.filter((t) => !t.completed)
  else if (statusFilter === 'completed') toShow = toShow.filter((t) => t.completed)
  const hasTodos = todos.length > 0
  const hasMatch = toShow.length > 0
  if (todoEmptyEl) todoEmptyEl.hidden = hasTodos
  if (todoNoMatchEl) todoNoMatchEl.hidden = !hasTodos || hasMatch
  listEl.innerHTML = ''
  for (const todo of toShow) {
    const cat = todo.category || 'general'
    const li = document.createElement('li')
    li.className = 'todo-item todo-item--' + cat + (todo.completed ? ' todo-item--completed' : '')
    if (justAdded && todo.id === addedId) li.classList.add('todo-item--adding')
    li.dataset.todoId = todo.id

    const checkbox = document.createElement('button')
    checkbox.type = 'button'
    checkbox.className = 'todo-item__checkbox'
    checkbox.setAttribute('role', 'checkbox')
    checkbox.setAttribute('aria-checked', todo.completed ? 'true' : 'false')
    checkbox.setAttribute('aria-label', 'Mark as ' + (todo.completed ? 'incomplete' : 'complete'))
    checkbox.innerHTML = CHECKBOX_SVG

    const textEl = document.createElement('span')
    textEl.className = 'todo-item__text'
    textEl.textContent = typeof todo.text === 'string' ? todo.text : (todo.todo_text != null ? String(todo.todo_text) : '')

    const pill = document.createElement('span')
    pill.className = 'todo-item__category todo-item__category--' + cat
    pill.setAttribute('aria-label', 'Category: ' + (CATEGORY_LABELS[cat] || cat))
    pill.textContent = CATEGORY_LABELS[cat] || cat

    const deleteBtn = document.createElement('button')
    deleteBtn.type = 'button'
    deleteBtn.className = 'todo-item__delete'
    deleteBtn.setAttribute('aria-label', 'Delete')
    deleteBtn.innerHTML = TRASH_SVG

    const main = document.createElement('div')
    main.className = 'todo-item__main'
    main.append(checkbox, textEl)

    const footer = document.createElement('div')
    footer.className = 'todo-item__footer'
    footer.appendChild(pill)

    li.append(main, footer, deleteBtn)
    listEl.appendChild(li)
  }
  setTimeout(() => {
    listEl.querySelectorAll('.todo-item--adding').forEach((el) => el.classList.remove('todo-item--adding'))
  }, 450)
}

form?.addEventListener('submit', (e) => {
  e.preventDefault()
  clearTodoError()
  const value = input.value
  const category = selectedCategoryForNew || 'general'
  input.value = ''
  setRandomPlaceholder()
  input.focus()
  addTodo(value, category)
})

todoChipsAdd?.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    const cat = btn.dataset.category ?? 'general'
    selectedCategoryForNew = cat
    todoChipsAdd.forEach((b) => b.classList.toggle('chip--active', (b.dataset.category ?? '') === cat))
  })
})

const STATUS_LABELS = { all: 'View all', active: 'Active', completed: 'Checked' }

function syncStatusDropdownUI() {
  if (statusFilterLabel) statusFilterLabel.textContent = STATUS_LABELS[statusFilter] ?? 'View all'
  statusDropdownOptions?.forEach((opt) => {
    const val = opt.dataset.status ?? 'all'
    const active = val === statusFilter
    opt.classList.toggle('status-dropdown__option--active', active)
    opt.setAttribute('aria-selected', active ? 'true' : 'false')
  })
}

function closeStatusDropdown() {
  if (!statusDropdown) return
  statusDropdown.classList.remove('is-open')
  statusFilterTrigger?.setAttribute('aria-expanded', 'false')
  statusDropdownPanel?.setAttribute('hidden', '')
  statusDropdownPanel?.setAttribute('aria-hidden', 'true')
}

function openStatusDropdown() {
  if (!statusDropdown) return
  statusDropdown.classList.add('is-open')
  statusFilterTrigger?.setAttribute('aria-expanded', 'true')
  statusDropdownPanel?.removeAttribute('hidden')
  statusDropdownPanel?.setAttribute('aria-hidden', 'false')
}

syncStatusDropdownUI()

statusFilterTrigger?.addEventListener('click', (e) => {
  e.stopPropagation()
  const isOpen = statusDropdown?.classList.contains('is-open')
  if (isOpen) closeStatusDropdown()
  else openStatusDropdown()
})

statusDropdownOptions?.forEach((opt) => {
  opt.addEventListener('click', (e) => {
    e.stopPropagation()
    statusFilter = opt.dataset.status ?? 'all'
    syncStatusDropdownUI()
    closeStatusDropdown()
    renderTodos()
  })
})

document.addEventListener('click', () => closeStatusDropdown())
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeStatusDropdown()
})
statusDropdownPanel?.addEventListener('click', (e) => e.stopPropagation())

todoFilterButtons?.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    categoryFilter = btn.dataset.category ?? ''
    todoFilterButtons.forEach((b) => {
      const bCat = b.dataset.category ?? ''
      b.classList.toggle('filter-btn--active', (categoryFilter === '' && bCat === '') || (categoryFilter !== '' && bCat === categoryFilter))
    })
    renderTodos()
  })
})

listEl?.addEventListener('click', (e) => {
  const cb = e.target.closest('.todo-item__checkbox')
  if (cb && cb.getAttribute('role') === 'checkbox') {
    e.preventDefault()
    const id = e.target.closest('.todo-item').dataset.todoId
    toggleTodo(id)
  }
})

listEl?.addEventListener('click', (e) => {
  if (e.target.closest('.todo-item__delete')) {
    const id = e.target.closest('.todo-item').dataset.todoId
    deleteTodo(id)
  }
})

authOpenLogin?.addEventListener('click', () => openAuthModal('signin'))
authOpenSignup?.addEventListener('click', () => openAuthModal('signup'))
authModalClose?.addEventListener('click', closeAuthModal)
authModal?.addEventListener('close', () => {
  authSigninPassword.value = ''
  authSignupPassword.value = ''
})
authModal?.addEventListener('cancel', closeAuthModal)

toastUndo?.addEventListener('click', () => {
  undoDelete()
})

authSwitchToSignup?.addEventListener('click', () => setAuthView('signup'))
authSwitchToSignin?.addEventListener('click', () => setAuthView('signin'))

document.querySelectorAll('.auth-password-wrap').forEach((wrap) => {
  const input = wrap.querySelector('input')
  const btn = wrap.querySelector('.auth-password-toggle')
  if (!input || !btn) return
  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password'
    input.type = isPassword ? 'text' : 'password'
    wrap.classList.toggle('auth-password-wrap--visible', isPassword)
    btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password')
    btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password')
  })
})

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
  currentUser = data.user
  updateAuthUI()
  await loadTodos()
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
  currentUser = data.user
  updateAuthUI()
  await loadTodos()
  authSignupPassword.value = ''
  setAuthMessage('Account created. You are signed in.')
  closeAuthModal()
})

authSignOut?.addEventListener('click', async () => {
  if (!supabase) return
  await supabase.auth.signOut()
  await ensureSession()
  updateAuthUI()
  await loadTodos()
})

;(async () => {
  try {
    setRandomPlaceholder()
    updateAuthUI()
    if (supabase) {
      await ensureSession()
      updateAuthUI()
      await loadTodos()
    }
  } catch (err) {
    console.error('App init failed:', err)
  }
})()
