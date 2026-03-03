/** Todo CRUD, render list, session */
import { supabase } from './supabase.js'
import { CATEGORY_LABELS, CHECKBOX_SVG, TRASH_SVG, TODO_ADD_IN_ANIMATION_MS } from './constants.js'
import * as state from './state.js'
import {
  listEl,
  filterRowEl,
  todoEmptyEl,
  todoNoMatchEl,
  input,
  toastEl,
  toastMessage,
} from './dom.js'
import { showConfetti } from './confetti.js'
import { showAuthTooltip } from './auth.js'
import { showTodoError, clearTodoError, setAddLoading, showAddSuccessCheck } from './ui.js'
import { closeStatusDropdown } from './dropdown.js'

export async function ensureSession() {
  if (!supabase) return
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.user) {
    state.setCurrentUser(session.user)
    return
  }
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('Anonymous sign-in failed:', error)
    throw error
  }
  state.setCurrentUser(data.user)
}

export async function loadTodos() {
  if (!supabase) {
    state.setTodos([])
    renderTodos()
    return
  }
  // Capture session we're loading for so we don't overwrite state if session changed (e.g. sign-out) before this call completes
  const loadingForUserId = state.currentUser?.id ?? null
  // No real user (e.g. offline): keep only local todos, don't query DB with a synthetic ID
  if (!state.currentUser) {
    state.setTodos(state.todos.filter((t) => isLocalTodoId(t.id)))
    renderTodos()
    return
  }
  const isAnonymous = state.currentUser.is_anonymous === true
  const localTodos = state.todos.filter((t) => isLocalTodoId(t.id))

  // When user just signed in (no longer anonymous), migrate their local-only todos to the DB so they aren't lost
  const failedMigration = []
  const insertedLocalIdToDbId = {} // track so we can exclude from merged if user deleted during migration
  if (!isAnonymous && localTodos.length > 0) {
    for (const todo of localTodos) {
      if (!state.todos.some((t) => t.id === todo.id)) continue // user deleted this one during migration, skip insert
      const created_at =
        typeof todo.created_at === 'string' && todo.created_at
          ? todo.created_at
          : new Date().toISOString()
      const { data: inserted, error: insertErr } = await supabase
        .from('todos')
        .insert({
          text: typeof todo.text === 'string' ? todo.text : '',
          completed: Boolean(todo.completed),
          user_id: state.currentUser.id,
          category: typeof todo.category === 'string' ? todo.category : 'general',
          created_at,
        })
        .select('id')
        .single()
      if (insertErr) {
        console.error('Failed to migrate local todo:', insertErr)
        failedMigration.push(todo)
      } else if (inserted?.id) {
        insertedLocalIdToDbId[todo.id] = inserted.id
      }
    }
  }
  if (state.currentUser?.id !== loadingForUserId) return

  const { data, error } = await supabase
    .from('todos')
    .select('id, todo_text:text, completed, created_at, category')
    .eq('user_id', state.currentUser.id)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Failed to load todos:', error)
    return
  }
  let fromDb = (data ?? []).map((row) => ({
    id: row.id,
    text:
      typeof row.todo_text === 'string'
        ? row.todo_text
        : typeof row.text === 'string'
          ? row.text
          : '',
    completed: Boolean(row.completed),
    created_at: row.created_at,
    category: typeof row.category === 'string' ? row.category : 'general',
  }))
  // Exclude DB rows we inserted for a local todo that the user then deleted during migration
  const currentLocalIds = new Set(
    state.todos.filter((t) => isLocalTodoId(t.id)).map((t) => t.id)
  )
  const dbIdsInsertedThenDeleted = new Set(
    localTodos
      .filter((t) => !currentLocalIds.has(t.id) && insertedLocalIdToDbId[t.id])
      .map((t) => insertedLocalIdToDbId[t.id])
  )
  if (dbIdsInsertedThenDeleted.size > 0) {
    fromDb = fromDb.filter((row) => !dbIdsInsertedThenDeleted.has(row.id))
    supabase
      .from('todos')
      .delete()
      .in('id', [...dbIdsInsertedThenDeleted])
      .then(() => {})
  }
  // Re-read local todos after await so we don't drop items added while we were fetching (e.g. anonymous user just added a todo and onAuthStateChange triggered loadTodos)
  const localTodosNow = state.todos.filter((t) => isLocalTodoId(t.id))
  // Exclude successfully migrated local todos so we don't show duplicates (they're already in fromDb with DB ids)
  const localTodosToMerge = localTodosNow.filter(
    (t) => !insertedLocalIdToDbId[t.id]
  )
  const merged = [...fromDb, ...localTodosToMerge].sort(sortByCreatedAt)
  if (state.currentUser?.id !== loadingForUserId) return // session changed (e.g. sign-out), don't overwrite
  state.setTodos(merged)
  renderTodos()
}

export function isLocalTodoId(id) {
  return typeof id === 'string' && id.startsWith('local-')
}

function sortByCreatedAt(a, b) {
  const ta = new Date(a?.created_at).getTime()
  const tb = new Date(b?.created_at).getTime()
  return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb)
}

export async function updateTodoCategory(id, category) {
  const todo = state.todos.find((t) => t.id === id)
  if (!todo) return
  const cat = typeof category === 'string' && category ? category : 'general'
  if ((todo.category || 'general') === cat) return
  if (isLocalTodoId(id)) {
    todo.category = cat
    renderTodos(false, null, false)
    return
  }
  if (!supabase) return
  const { error } = await supabase.from('todos').update({ category: cat }).eq('id', id)
  if (error) {
    console.error('Failed to update todo category:', error)
    return
  }
  todo.category = cat
  renderTodos(false, null, false)
}

export async function addTodo(taskText, category = 'general') {
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
    // Only set currentUser when we have a real session user (anonymous); don't set a synthetic ID when offline (user undefined)
    if (user) state.setCurrentUser(user)
    const localId = 'local-' + Date.now()
    const newTodo = {
      id: localId,
      text: trimmed,
      completed: false,
      created_at: new Date().toISOString(),
      category: cat,
    }
    state.setTodos([...state.todos, newTodo])
    renderTodos(true, newTodo.id)
    showAddSuccessCheck()
    setTimeout(showAuthTooltip, TODO_ADD_IN_ANIMATION_MS)
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
  state.setCurrentUser(user)
  if (inserted) {
    const newTodo = {
      id: inserted.id,
      text:
        typeof inserted.todo_text === 'string'
          ? inserted.todo_text
          : typeof inserted.text === 'string'
            ? inserted.text
            : trimmed,
      completed: Boolean(inserted.completed),
      created_at: inserted.created_at,
      category: typeof inserted.category === 'string' ? inserted.category : 'general',
    }
    state.setTodos([...state.todos, newTodo])
    renderTodos(true, newTodo.id)
    showAddSuccessCheck()
  } else {
    await loadTodos()
    showAddSuccessCheck()
  }
}

export async function toggleTodo(id) {
  const todo = state.todos.find((t) => t.id === id)
  if (!todo) return
  const completed = !todo.completed
  if (isLocalTodoId(id)) {
    todo.completed = completed
    if (completed) {
      const li = listEl?.querySelector(`[data-todo-id="${id}"]`)
      const checkbox = li?.querySelector('.todo-item__checkbox')
      showConfetti(checkbox?.getBoundingClientRect())
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
    showConfetti(checkbox?.getBoundingClientRect())
  }
  renderTodos()
}

export function deleteTodo(id) {
  const todo = state.todos.find((t) => t.id === id)
  if (!todo) return
  if (state.undoDeleteTimeout) clearTimeout(state.undoDeleteTimeout)
  state.setLastDeletedTodo({ ...todo })
  state.setPendingDeleteId(id)
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
      state.setTodos(state.todos.filter((t) => t.id !== id))
      renderTodos()
    }, 320)
  } else {
    state.setTodos(state.todos.filter((t) => t.id !== id))
    renderTodos()
  }
  if (toastMessage) toastMessage.textContent = 'Todo deleted.'
  toastEl?.removeAttribute('hidden')
  const timeoutId = setTimeout(() => {
    toastEl?.setAttribute('hidden', '')
    state.setLastDeletedTodo(null)
    if (state.pendingDeleteId && supabase && !isLocalTodoId(state.pendingDeleteId)) {
      supabase.from('todos').delete().eq('id', state.pendingDeleteId).then(() => {})
    }
    state.setPendingDeleteId(null)
    state.setUndoDeleteTimeout(null)
  }, 5000)
  state.setUndoDeleteTimeout(timeoutId)
}

export function undoDelete() {
  if (!state.lastDeletedTodo) return
  state.setTodos([...state.todos, state.lastDeletedTodo].sort(sortByCreatedAt))
  renderTodos()
  toastEl?.setAttribute('hidden', '')
  if (state.undoDeleteTimeout) clearTimeout(state.undoDeleteTimeout)
  state.setUndoDeleteTimeout(null)
  state.setLastDeletedTodo(null)
  state.setPendingDeleteId(null)
}

export function renderTodos(justAdded = false, addedId = null, updateFilterRowVisibility = true) {
  let toShow = state.categoryFilter
    ? state.todos.filter((t) => (t.category || 'general') === state.categoryFilter)
    : [...state.todos]
  if (state.statusFilter === 'active') toShow = toShow.filter((t) => !t.completed)
  else if (state.statusFilter === 'completed') toShow = toShow.filter((t) => t.completed)
  const hasTodos = state.todos.length > 0
  const hasMatch = toShow.length > 0
  const showFilterRow = hasTodos || state.addLoading
  if (todoEmptyEl) todoEmptyEl.hidden = hasTodos
  if (todoNoMatchEl) todoNoMatchEl.hidden = !hasTodos || hasMatch
  if (updateFilterRowVisibility && filterRowEl) {
    filterRowEl.classList.toggle('filter-row--hidden', !showFilterRow)
    const slot = filterRowEl.closest('.filter-row-slot')
    if (slot) slot.classList.toggle('filter-row-slot--visible', showFilterRow)
  }
  if (!hasTodos) closeStatusDropdown()
  listEl.innerHTML = ''
  for (const todo of toShow) {
    const cat = todo.category || 'general'
    const li = document.createElement('li')
    li.className =
      'todo-item todo-item--' + cat + (todo.completed ? ' todo-item--completed' : '')
    if (justAdded && todo.id === addedId) li.classList.add('todo-item--adding')
    li.dataset.todoId = todo.id

    const checkbox = document.createElement('button')
    checkbox.type = 'button'
    checkbox.className = 'todo-item__checkbox'
    checkbox.setAttribute('role', 'checkbox')
    checkbox.setAttribute('aria-checked', todo.completed ? 'true' : 'false')
    checkbox.setAttribute(
      'aria-label',
      'Mark as ' + (todo.completed ? 'incomplete' : 'complete')
    )
    checkbox.innerHTML = CHECKBOX_SVG

    const textEl = document.createElement('span')
    textEl.className = 'todo-item__text'
    textEl.textContent =
      typeof todo.text === 'string'
        ? todo.text
        : todo.todo_text != null
          ? String(todo.todo_text)
          : ''

    const footer = document.createElement('div')
    footer.className = 'todo-item__footer'
    const isEditingCategory = state.editingCategoryTodoId === todo.id
    if (isEditingCategory) {
      const optionsWrap = document.createElement('div')
      optionsWrap.className = 'todo-item__category-options'
      const allKeys = Object.keys(CATEGORY_LABELS)
      const orderedKeys = [cat].concat(allKeys.filter((k) => k !== cat))
      for (const key of orderedKeys) {
        const opt = document.createElement('button')
        opt.type = 'button'
        opt.className =
          'todo-item__category-option todo-item__category-option--' + key
        opt.textContent = CATEGORY_LABELS[key]
        opt.dataset.category = key
        opt.setAttribute('aria-label', 'Set category to ' + (CATEGORY_LABELS[key] || key))
        optionsWrap.appendChild(opt)
      }
      footer.appendChild(optionsWrap)
      requestAnimationFrame(() => {
        optionsWrap.classList.add('todo-item__category-options--visible')
      })
    } else {
      const pill = document.createElement('button')
      pill.type = 'button'
      pill.className = 'todo-item__category todo-item__category--' + cat
      pill.setAttribute('aria-label', 'Change category. Current: ' + (CATEGORY_LABELS[cat] || cat))
      pill.textContent = CATEGORY_LABELS[cat] || cat
      pill.dataset.todoId = todo.id
      footer.appendChild(pill)
    }

    const deleteBtn = document.createElement('button')
    deleteBtn.type = 'button'
    deleteBtn.className = 'todo-item__delete'
    deleteBtn.setAttribute('aria-label', 'Delete')
    deleteBtn.innerHTML = TRASH_SVG

    const main = document.createElement('div')
    main.className = 'todo-item__main'
    main.append(checkbox, textEl)

    li.append(main, footer, deleteBtn)
    listEl.appendChild(li)
  }
  setTimeout(() => {
    listEl
      .querySelectorAll('.todo-item--adding')
      .forEach((el) => el.classList.remove('todo-item--adding'))
  }, TODO_ADD_IN_ANIMATION_MS)
}
