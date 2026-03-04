/** Todo CRUD, render list, session */
import { supabase } from './supabase.js'
import { CATEGORY_LABELS, CHECKBOX_SVG, TRASH_SVG, DRAG_HANDLE_SVG, TODO_ADD_IN_ANIMATION_MS, AUTH_TOOLTIP_DELAY_MS } from './constants.js'
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

let dragAndDropInitialized = false
let dragState = null
// Content column name: 'text' (default schema) or 'todo_text'; set when load/insert detects the DB schema.
let contentColumn = 'text'

function setupDragAndDropOnList() {
  if (dragAndDropInitialized || !listEl) return
  dragAndDropInitialized = true
  listEl.addEventListener('pointerdown', onListPointerDown)
}

function onListPointerDown(e) {
  if (state.crossMode) return
  const handle = e.target.closest('.todo-item__drag-handle')
  if (!handle || e.button !== 0) return
  const li = handle.closest('.todo-item')
  if (!li) return
  e.preventDefault()
  const todoId = li.dataset.todoId
  if (!todoId) return
  handle.setPointerCapture(e.pointerId)
  dragState = {
    pointerId: e.pointerId,
    draggedId: todoId,
    dragEl: li,
  }
  li.classList.add('todo-item--dragging')
  document.addEventListener('pointermove', onDragPointerMove)
  document.addEventListener('pointerup', onDragPointerUp)
  document.addEventListener('pointercancel', onDragPointerUp)
}

function onDragPointerMove(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return
  e.preventDefault()
  const dropTarget = getDropTarget(e.clientX, e.clientY)
  if (dropTarget !== dragState.lastDropTarget) {
    dragState.lastDropTarget = dropTarget
    listEl.querySelectorAll('.todo-item--drop-target').forEach((el) => el.classList.remove('todo-item--drop-target'))
    if (dropTarget?.el) dropTarget.el.classList.add('todo-item--drop-target')
  }
}

function getDropTarget(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY)
  const item = el?.closest('.todo-item')
  if (item && item !== dragState?.dragEl) {
    const id = item.dataset.todoId
    if (id) return { id, el: item }
  }
  if (listEl?.contains(el) || listEl?.contains(el?.parentElement)) {
    const rect = listEl.getBoundingClientRect()
    if (clientY >= rect.bottom - 2) {
      const last = listEl.querySelector('.todo-item:last-of-type')
      if (last && last !== dragState?.dragEl) return { id: last.dataset.todoId, el: last, after: true }
    }
  }
  return null
}

function onDragPointerUp(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return
  document.removeEventListener('pointermove', onDragPointerMove)
  document.removeEventListener('pointerup', onDragPointerUp)
  document.removeEventListener('pointercancel', onDragPointerUp)
  dragState.dragEl.classList.remove('todo-item--dragging')
  listEl?.querySelectorAll('.todo-item--drop-target').forEach((el) => el.classList.remove('todo-item--drop-target'))
  const dropTarget = dragState.lastDropTarget
  const draggedId = dragState.draggedId
  dragState = null
  if (dropTarget) {
    if (dropTarget.after) {
      const list = state.todos
      const idx = list.findIndex((t) => t.id === dropTarget.id)
      const next = list[idx + 1]
      reorderTodos(draggedId, next?.id ?? null)
    } else {
      reorderTodos(draggedId, dropTarget.id)
    }
  }
}

export async function ensureSession() {
  if (!supabase) return
  let {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.user) {
    state.setCurrentUser(session.user)
    if (typeof console.debug === 'function') {
      console.debug('ensureSession: using existing session', { userId: session.user.id, isAnonymous: session.user.is_anonymous })
    }
    return
  }
  // Try to recover session from refresh token (e.g. after page refresh before storage is read)
  const { data: refreshData } = await supabase.auth.refreshSession()
  if (refreshData?.session?.user) {
    state.setCurrentUser(refreshData.session.user)
    if (typeof console.debug === 'function') {
      console.debug('ensureSession: recovered session via refresh', { userId: refreshData.session.user.id, isAnonymous: refreshData.session.user.is_anonymous })
    }
    return
  }
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('Anonymous sign-in failed:', error)
    throw error
  }
  state.setCurrentUser(data.user)
  if (typeof console.debug === 'function') {
    console.debug('ensureSession: created new anonymous user', { userId: data.user.id })
  }
}

export async function loadTodos() {
  if (!supabase) {
    state.setTodos([])
    renderTodos()
    return
  }
  // Capture session we're loading for so we don't overwrite state if session changed (e.g. sign-out) before this call completes
  const loadingForUserId = state.currentUser?.id ?? null
  // No current user (session null): do not overwrite the list – avoids "lost todos" when session
  // briefly goes null (e.g. token refresh, signed out in another tab). Explicit sign-out goes
  // through ensureSession() then loadTodos() with anonymous user, so list is cleared there.
  if (!state.currentUser) {
    return
  }
  const isAnonymous = state.currentUser.is_anonymous === true
  const localTodos = state.todos.filter((t) => isLocalTodoId(t.id))

  // When user just signed in (no longer anonymous), migrate local-only todos to the DB (insert only; we do not replace existing DB todos for this user).
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
          [contentColumn]: typeof todo.text === 'string' ? todo.text : '',
          completed: Boolean(todo.completed),
          user_id: state.currentUser.id,
          category: typeof todo.category === 'string' ? todo.category : 'work',
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

  // Prefer position column when present so drag-drop order is restored; fall back to created_at if position doesn't exist.
  // Support both content column names: 'text' (default) and 'todo_text'.
  let data, error
  const selectCols = (col) => `id, ${col}, completed, created_at, category`
  const withPosition = await supabase
    .from('todos')
    .select(`${selectCols(contentColumn)}, position`)
    .eq('user_id', state.currentUser.id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  if (withPosition.error && String(withPosition.error.message || '').includes('position')) {
    const fallback = await supabase
      .from('todos')
      .select(selectCols(contentColumn))
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: true })
    data = fallback.data
    error = fallback.error
  } else {
    data = withPosition.data
    error = withPosition.error
  }
  // If content column might be wrong (schema cache / column not found), retry with the other name.
  const msg = String(error?.message || '')
  if (error && (msg.includes('column') || msg.includes('schema')) && (msg.includes('text') || msg.includes('todo_text'))) {
    const other = contentColumn === 'text' ? 'todo_text' : 'text'
    contentColumn = other
    const retry = await supabase
      .from('todos')
      .select(selectCols(contentColumn))
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: true })
    if (!retry.error) {
      data = retry.data
      error = null
    }
  }
  if (error) {
    console.error('Failed to load todos:', { userId: state.currentUser?.id, error })
    return
  }
  const count = (data ?? []).length
  if (typeof console.debug === 'function') {
    console.debug('Load todos:', { userId: state.currentUser.id, count, isAnonymous: state.currentUser.is_anonymous })
  }
  let fromDb = (data ?? []).map((row, index) => ({
    id: row.id,
    text:
      typeof row.text === 'string'
        ? row.text
        : typeof row.todo_text === 'string'
          ? row.todo_text
          : '',
    completed: Boolean(row.completed),
    created_at: row.created_at,
    category: typeof row.category === 'string' ? row.category : 'work',
    position: typeof row.position === 'number' ? row.position : index,
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
  const merged = [...fromDb, ...localTodosToMerge].sort(sortByPositionThenCreatedAt)
  normalizePositions(merged)
  if (state.currentUser?.id !== loadingForUserId) return // session changed (e.g. sign-out), don't overwrite
  state.setTodos(merged)
  renderTodos()
  document.dispatchEvent(new CustomEvent('todos-changed', { detail: { hasTodos: state.todos.length > 0 } }))
}

export function isLocalTodoId(id) {
  return typeof id === 'string' && id.startsWith('local-')
}

function sortByCreatedAt(a, b) {
  const ta = new Date(a?.created_at).getTime()
  const tb = new Date(b?.created_at).getTime()
  return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb)
}

function sortByPositionThenCreatedAt(a, b) {
  const pa = typeof a?.position === 'number' ? a.position : 0
  const pb = typeof b?.position === 'number' ? b.position : 0
  if (pa !== pb) return pa - pb
  return sortByCreatedAt(a, b)
}

function normalizePositions(todos) {
  todos.forEach((t, i) => {
    t.position = i
  })
}

export async function updateTodoCategory(id, category) {
  const todo = state.todos.find((t) => t.id === id)
  if (!todo) return
  const cat = typeof category === 'string' && category ? category : 'work'
  if ((todo.category || 'work') === cat) return
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

/**
 * Reorder todos: move the todo with draggedId before the todo with dropTargetId (or at end if null).
 * Optimistic update, then persist position for DB-backed todos.
 */
export async function reorderTodos(draggedId, dropTargetId) {
  const list = state.todos
  const fromIndex = list.findIndex((t) => t.id === draggedId)
  if (fromIndex === -1) return
  const dragged = list[fromIndex]
  const toIndex =
    dropTargetId == null
      ? list.length - 1
      : list.findIndex((t) => t.id === dropTargetId)
  if (toIndex === -1 && dropTargetId != null) return
  const insertIndex = dropTargetId == null ? list.length : toIndex
  if (insertIndex === fromIndex || insertIndex === fromIndex + 1) return // no move

  const reordered = list.filter((t) => t.id !== draggedId)
  const actualInsert = insertIndex > fromIndex ? insertIndex - 1 : insertIndex
  reordered.splice(actualInsert, 0, dragged)
  normalizePositions(reordered)
  state.setTodos(reordered)
  renderTodos(false, null, false)

  const toPersist = reordered.filter(
    (t) => !isLocalTodoId(t.id) && typeof t.position === 'number'
  )
  if (toPersist.length === 0 || !supabase) return
  const updates = toPersist.map((t) => ({ id: t.id, position: t.position }))
  for (const u of updates) {
    supabase
      .from('todos')
      .update({ position: u.position })
      .eq('id', u.id)
      .then(({ error }) => {
        // Ignore schema errors (e.g. position column doesn't exist yet)
        if (error && !String(error.message || '').includes('position')) {
          console.error('Failed to persist order:', error)
        }
      })
  }
}

export async function addTodo(taskText, category = 'work') {
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
  const cat = typeof category === 'string' && category ? category : 'work'
  setAddLoading(true)
  clearTodoError()
  try {
    // Use in-memory user; if we already have a non-anonymous user, use it so we never replace them with anonymous. Otherwise getSession() then ensureSession() if needed.
    let user = state.currentUser && !state.currentUser.is_anonymous ? state.currentUser : null
    if (!user && supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        state.setCurrentUser(session.user)
        user = session.user
      }
    }
    if (!user) {
      const ensureTimeout = (ms) =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('Sign-in timed out. Try again.')), ms))
      const ensurePromise = ensureSession()
      try {
        await Promise.race([ensurePromise, ensureTimeout(10000)])
      } catch (e) {
        // Timeout may fire while ensureSession() is still running; wait for it and use session if it succeeds.
        if (e?.message === 'Sign-in timed out. Try again.') {
          await ensurePromise
          if (state.currentUser) {
            user = state.currentUser
          } else {
            throw e
          }
        } else {
          throw e
        }
      }
      if (!user) user = state.currentUser
    }
    const isAnonymous = !user || user.is_anonymous
    if (isAnonymous) {
      // Anonymous todos stay local (in-memory only); they are not written to Supabase.
      if (user) state.setCurrentUser(user)
      const localId = 'local-' + Date.now()
      const maxPos = state.todos.length
        ? Math.max(...state.todos.map((t) => (typeof t.position === 'number' ? t.position : 0)))
        : -1
      const newTodo = {
        id: localId,
        text: trimmed,
        completed: false,
        created_at: new Date().toISOString(),
        category: cat,
        position: maxPos + 1,
      }
      state.setTodos([...state.todos, newTodo])
      renderTodos(true, newTodo.id)
      showAddSuccessCheck()
      setTimeout(showAuthTooltip, AUTH_TOOLTIP_DELAY_MS)
      return
    }
    const nextPosition =
      state.todos.length > 0
        ? Math.max(...state.todos.map((t) => (typeof t.position === 'number' ? t.position : 0))) + 1
        : 0
    // Omit position from insert so app works if the position migration hasn't been run. Use contentColumn for schema compatibility.
    let insertPayload = { [contentColumn]: trimmed, completed: false, user_id: user.id, category: cat }
    let { data: inserted, error } = await supabase
      .from('todos')
      .insert(insertPayload)
      .select(`id, ${contentColumn}, completed, created_at, category`)
      .single()
    if (error && (String(error.message || '').includes('column') || String(error.message || '').includes('schema'))) {
      const other = contentColumn === 'text' ? 'todo_text' : 'text'
      contentColumn = other
      insertPayload = { [contentColumn]: trimmed, completed: false, user_id: user.id, category: cat }
      const retry = await supabase
        .from('todos')
        .insert(insertPayload)
        .select(`id, ${contentColumn}, completed, created_at, category`)
        .single()
      if (!retry.error) {
        inserted = retry.data
        error = null
      }
    }
    if (error) {
      console.error('Failed to add todo (logged-in):', { userId: user.id, error })
      showTodoError(error.message)
      return
    }
    if (!inserted) {
      console.warn('Add todo (logged-in): insert succeeded but no row returned', { userId: user.id })
    }
    clearTodoError()
    state.setCurrentUser(user)
    if (inserted) {
      const content = inserted[contentColumn] ?? inserted.text ?? inserted.todo_text ?? trimmed
      const newTodo = {
        id: inserted.id,
        text: typeof content === 'string' ? content : trimmed,
        completed: Boolean(inserted.completed),
        created_at: inserted.created_at,
        category: typeof inserted.category === 'string' ? inserted.category : 'work',
        position: typeof inserted.position === 'number' ? inserted.position : nextPosition,
      }
      state.setTodos([...state.todos, newTodo])
      renderTodos(true, newTodo.id)
      showAddSuccessCheck()
    } else {
      await loadTodos()
      showAddSuccessCheck()
    }
  } catch (e) {
    console.error('Add todo error:', e)
    showTodoError(e?.message ?? 'Could not add todo.')
  } finally {
    setAddLoading(false)
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
      document.dispatchEvent(new CustomEvent('todos-changed', { detail: { hasTodos: state.todos.length > 0 } }))
    }, 320)
  } else {
    state.setTodos(state.todos.filter((t) => t.id !== id))
    renderTodos()
    document.dispatchEvent(new CustomEvent('todos-changed', { detail: { hasTodos: state.todos.length > 0 } }))
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
  }, 1200)
  state.setUndoDeleteTimeout(timeoutId)
}

export function undoDelete() {
  if (!state.lastDeletedTodo) return
  const restored = { ...state.lastDeletedTodo }
  const maxPos =
    state.todos.length > 0
      ? Math.max(...state.todos.map((t) => (typeof t.position === 'number' ? t.position : 0)))
      : -1
  if (typeof restored.position !== 'number') restored.position = maxPos + 1
  const next = [...state.todos, restored].sort(sortByPositionThenCreatedAt)
  normalizePositions(next)
  state.setTodos(next)
  renderTodos()
  document.dispatchEvent(new CustomEvent('todos-changed', { detail: { hasTodos: state.todos.length > 0 } }))
  dismissDeleteToast()
}

/** Dismiss the "Todo deleted" toast and clear undo state (e.g. when returning to 0 todos). Optionally fade out first. */
export function dismissDeleteToast(animate = false) {
  if (!toastEl) {
    clearDeleteToastState()
    return
  }
  if (animate && !toastEl.hasAttribute('hidden')) {
    toastEl.classList.add('toast--dismissing')
    setTimeout(() => {
      toastEl?.setAttribute('hidden', '')
      toastEl?.classList.remove('toast--dismissing', 'toast--lock-position')
      toastEl?.style.removeProperty('left')
      toastEl?.style.removeProperty('top')
      clearDeleteToastState()
    }, 280)
  } else {
    toastEl.setAttribute('hidden', '')
    toastEl.classList.remove('toast--lock-position')
    toastEl.style.removeProperty('left')
    toastEl.style.removeProperty('top')
    clearDeleteToastState()
  }
}
function clearDeleteToastState() {
  if (state.undoDeleteTimeout) {
    clearTimeout(state.undoDeleteTimeout)
    state.setUndoDeleteTimeout(null)
  }
  state.setLastDeletedTodo(null)
  state.setPendingDeleteId(null)
}

export function renderTodos(justAdded = false, addedId = null, updateFilterRowVisibility = true) {
  let toShow = state.categoryFilter
    ? state.todos.filter((t) => {
        const c = t.category || 'work'
        const filter = state.categoryFilter
        return c === filter || (c === 'general' && filter === 'work')
      })
    : [...state.todos]
  if (state.statusFilter === 'active') toShow = toShow.filter((t) => !t.completed)
  else if (state.statusFilter === 'completed') toShow = toShow.filter((t) => t.completed)
  const hasTodos = state.todos.length > 0
  const hasMatch = toShow.length > 0
  const showFilterRow = hasTodos || state.addLoading
  if (todoEmptyEl) todoEmptyEl.hidden = hasTodos
  if (todoNoMatchEl) todoNoMatchEl.hidden = !hasTodos || hasMatch
  if (updateFilterRowVisibility && filterRowEl) {
    const slot = filterRowEl.closest('.filter-row-slot')
    const wasFilterHidden = filterRowEl.classList.contains('filter-row--hidden')
    const firstTodoJustAdded = justAdded && state.todos.length === 1
    if (firstTodoJustAdded && wasFilterHidden && showFilterRow && slot) {
      slot.classList.add('filter-row-slot--instant-show')
      filterRowEl.classList.add('filter-row--instant-show')
    }
    filterRowEl.classList.toggle('filter-row--hidden', !showFilterRow)
    if (slot) slot.classList.toggle('filter-row-slot--visible', showFilterRow)
    if (firstTodoJustAdded && wasFilterHidden && showFilterRow && slot) {
      requestAnimationFrame(() => {
        slot.classList.remove('filter-row-slot--instant-show')
        filterRowEl.classList.remove('filter-row--instant-show')
      })
    }
  }
  if (!hasTodos) closeStatusDropdown()
  listEl.innerHTML = ''
  for (const todo of toShow) {
    const cat = todo.category || 'work'
    const displayCat = cat === 'general' ? 'work' : cat
    const li = document.createElement('li')
    li.className =
      'todo-item todo-item--' + displayCat + (todo.completed ? ' todo-item--completed' : '')
    if (justAdded && todo.id === addedId) li.classList.add('todo-item--adding')
    li.dataset.todoId = todo.id

    const dragHandle = document.createElement('button')
    dragHandle.type = 'button'
    dragHandle.className = 'todo-item__drag-handle'
    dragHandle.setAttribute('aria-label', 'Drag to reorder')
    dragHandle.innerHTML = DRAG_HANDLE_SVG
    dragHandle.dataset.todoId = todo.id

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
      const orderedKeys = [displayCat].concat(allKeys.filter((k) => k !== displayCat))
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
      pill.className = 'todo-item__category todo-item__category--' + displayCat
      pill.setAttribute('aria-label', 'Change category. Current: ' + (CATEGORY_LABELS[displayCat] || displayCat))
      pill.textContent = CATEGORY_LABELS[displayCat] || displayCat
      pill.dataset.todoId = todo.id
      footer.appendChild(pill)
    }

    const deleteBtn = document.createElement('button')
    deleteBtn.type = 'button'
    deleteBtn.className = 'todo-item__delete'
    deleteBtn.setAttribute('aria-label', 'Delete')
    deleteBtn.innerHTML = TRASH_SVG

    const content = document.createElement('div')
    content.className = 'todo-item__content'
    content.appendChild(textEl)

    const row = document.createElement('div')
    row.className = 'todo-item__row'
    row.appendChild(content)

    li.append(dragHandle, checkbox, row, footer, deleteBtn)
    listEl.appendChild(li)
  }
  setupDragAndDropOnList()
  setTimeout(() => {
    listEl
      .querySelectorAll('.todo-item--adding')
      .forEach((el) => el.classList.remove('todo-item--adding'))
  }, TODO_ADD_IN_ANIMATION_MS)
  document.dispatchEvent(new CustomEvent('todos-changed', { detail: { hasTodos: state.todos.length > 0 } }))
}
