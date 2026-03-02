import './style.css'
import { supabase, hasSupabase } from './supabase.js'

const form = document.querySelector('.todo-form')
const input = document.querySelector('.todo-input')
const listEl = document.querySelector('.todo-list')

const authSignedIn = document.getElementById('auth-signed-in')
const authEmail = document.getElementById('auth-email')
const authSignOut = document.getElementById('auth-sign-out')
const authFormContainer = document.getElementById('auth-form-container')
const authSigninForm = document.getElementById('auth-signin-form')
const authSignupForm = document.getElementById('auth-signup-form')
const authSigninEmail = document.getElementById('auth-signin-email')
const authSigninPassword = document.getElementById('auth-signin-password')
const authSignupEmail = document.getElementById('auth-signup-email')
const authSignupPassword = document.getElementById('auth-signup-password')
const authMessage = document.getElementById('auth-message')
const authFormIntro = document.querySelector('.auth-form-intro')
const authTabs = document.querySelectorAll('.auth-tab')
const todoErrorEl = document.getElementById('todo-error')

let todos = []
let currentUser = null

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null
    updateAuthUI()
  })
}

function updateAuthUI() {
  if (!hasSupabase() && authFormIntro) {
    authFormIntro.textContent =
      'Sign in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment (e.g. Netlify env vars) and redeploy.'
    authFormIntro.style.color = '#e57373'
  }
  const isEmailUser = currentUser && !currentUser.is_anonymous
  if (isEmailUser) {
    authSignedIn.hidden = false
    authFormContainer.hidden = true
    authEmail.textContent = currentUser.email ?? ''
  } else {
    authSignedIn.hidden = true
    authFormContainer.hidden = false
  }
  authMessage.hidden = true
  authMessage.textContent = ''
}

function setAuthMessage(msg, isError = false) {
  authMessage.textContent = msg
  authMessage.hidden = false
  authMessage.style.color = isError ? '#e57373' : undefined
}

function showTodoError(msg) {
  if (todoErrorEl) {
    todoErrorEl.textContent = msg
    todoErrorEl.hidden = false
    todoErrorEl.style.color = '#e57373'
  }
}

function clearTodoError() {
  if (todoErrorEl) {
    todoErrorEl.textContent = ''
    todoErrorEl.hidden = true
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
    .select('id, text, completed, created_at')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Failed to load todos:', error)
    return
  }
  todos = (data ?? []).map((row) => ({
    id: row.id,
    text: typeof row.text === 'string' ? row.text : '',
    completed: Boolean(row.completed),
    created_at: row.created_at,
  }))
  renderTodos()
}

async function addTodo(taskText) {
  const trimmed = typeof taskText === 'string' ? taskText.trim() : ''
  if (!trimmed) return
  if (!supabase) {
    showTodoError('Sign in is not configured.')
    return
  }
  await supabase.auth.refreshSession()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) {
    showTodoError('You must be signed in to add todos.')
    return
  }
  const { error } = await supabase
    .from('todos')
    .insert({ text: trimmed, completed: false, user_id: user.id })
  if (error) {
    console.error('Failed to add todo:', error)
    showTodoError(error.message)
    return
  }
  clearTodoError()
  currentUser = user
  await loadTodos()
}

async function toggleTodo(id) {
  if (!supabase) return
  const todo = todos.find((t) => t.id === id)
  if (!todo) return
  const completed = !todo.completed
  const { error } = await supabase.from('todos').update({ completed }).eq('id', id)
  if (error) {
    console.error('Failed to toggle todo:', error)
    return
  }
  todo.completed = completed
  renderTodos()
}

async function deleteTodo(id) {
  if (!supabase) return
  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) {
    console.error('Failed to delete todo:', error)
    return
  }
  todos = todos.filter((t) => t.id !== id)
  renderTodos()
}

function renderTodos() {
  listEl.innerHTML = ''
  for (const todo of todos) {
    const li = document.createElement('li')
    li.className = 'todo-item' + (todo.completed ? ' todo-item--completed' : '')
    li.dataset.todoId = todo.id

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'todo-item__checkbox'
    checkbox.checked = todo.completed
    checkbox.setAttribute('aria-label', 'Mark as ' + (todo.completed ? 'incomplete' : 'complete'))

    const textEl = document.createElement('span')
    textEl.className = 'todo-item__text'
    const label = typeof todo.text === 'string' ? todo.text : ''
    textEl.textContent = label

    const deleteBtn = document.createElement('button')
    deleteBtn.type = 'button'
    deleteBtn.className = 'todo-item__delete'
    deleteBtn.setAttribute('aria-label', 'Delete')
    deleteBtn.textContent = 'Delete'

    li.append(checkbox, textEl, deleteBtn)
    listEl.appendChild(li)
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  clearTodoError()
  const value = input.value
  input.value = ''
  input.focus()
  addTodo(value)
})

listEl.addEventListener('change', (e) => {
  if (e.target.matches('.todo-item__checkbox')) {
    const id = e.target.closest('.todo-item').dataset.todoId
    toggleTodo(id)
  }
})

listEl.addEventListener('click', (e) => {
  if (e.target.matches('.todo-item__delete')) {
    const id = e.target.closest('.todo-item').dataset.todoId
    deleteTodo(id)
  }
})

authTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const t = tab.dataset.tab
    authTabs.forEach((x) => x.classList.toggle('auth-tab--active', x.dataset.tab === t))
    authSigninForm.classList.toggle('auth-form--hidden', t !== 'signin')
    authSignupForm.classList.toggle('auth-form--hidden', t !== 'signup')
    authMessage.hidden = true
  })
})

authSigninForm.addEventListener('submit', async (e) => {
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
})

authSignupForm.addEventListener('submit', async (e) => {
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
})

authSignOut.addEventListener('click', async () => {
  if (!supabase) return
  await supabase.auth.signOut()
  await ensureSession()
  updateAuthUI()
  await loadTodos()
})

;(async () => {
  try {
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
