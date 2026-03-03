/**
 * Entry point: imports and wires theme, auth, todos, filters, add form, confetti.
 */
import './style.css'
import { supabase } from './supabase.js'
import { PLACEHOLDER_EXAMPLES } from './constants.js'
import * as state from './state.js'
import {
  form,
  input,
  listEl,
  todoEmptyEl,
  todoNoMatchEl,
  todoChipsAdd,
  todoFilterButtons,
  filterRowSlotEl,
  statusDropdown,
  statusFilterTrigger,
  statusDropdownPanel,
  statusDropdownOptions,
  emptyStatePartyBtn,
  authOpenLogin,
  authOpenSignup,
  authModal,
  authModalClose,
  authSwitchToSignup,
  authSwitchToSignin,
  authSigninPassword,
  authSignupPassword,
  authSignOut,
  toastUndo,
  dragHandleTooltip,
  crossModeToggleBtn,
  appEl,
  cursorPencilEl,
} from './dom.js'
import { initTheme } from './theme.js'
import * as auth from './auth.js'
import * as todos from './todos.js'
import { syncStatusDropdownUI, closeStatusDropdown, openStatusDropdown } from './dropdown.js'
import { runEmptyStateCelebration } from './confetti.js'
import { clearTodoError } from './ui.js'

// ---- Placeholder ----
function setRandomPlaceholder() {
  if (input && PLACEHOLDER_EXAMPLES.length) {
    input.placeholder =
      PLACEHOLDER_EXAMPLES[Math.floor(Math.random() * PLACEHOLDER_EXAMPLES.length)]
  }
}

// ---- Add form: tags visibility and submit ----
function updateAddFormHasValue() {
  if (!form) return
  if (input?.value?.trim()) form.classList.add('add-form--has-value')
  else form.classList.remove('add-form--has-value')
}

function scheduleHideTagsIfBlurred() {
  if (state.addFormBlurTimeout) clearTimeout(state.addFormBlurTimeout)
  state.setAddFormBlurTimeout(
    setTimeout(() => {
      state.setAddFormBlurTimeout(null)
      if (!form || !input) return
      if (state.chipJustTapped) {
        state.setChipJustTapped(false)
        return
      }
      if (input.value.trim() !== '') {
        form.classList.add('add-form--has-value')
        return
      }
      const active = document.activeElement
      if (active && form.contains(active)) return
      form.classList.remove('add-form--tags-visible')
    }, 200)
  )
}

// ---- Filters: category + status ----
function handleFilterButtonTap(btn) {
  if (!btn) return
  state.setCategoryFilter(btn.dataset.category ?? '')
  todoFilterButtons?.forEach((b) => {
    const bCat = b.dataset.category ?? ''
    b.classList.toggle(
      'filter-btn--active',
      (state.categoryFilter === '' && bCat === '') ||
        (state.categoryFilter !== '' && bCat === state.categoryFilter)
    )
  })
  todos.renderTodos(false, null, false)
}

// ---- Event listeners ----
initTheme()

if (input && form) {
  input.addEventListener('focus', () => form.classList.add('add-form--tags-visible'))
  input.addEventListener('blur', scheduleHideTagsIfBlurred)
  input.addEventListener('input', updateAddFormHasValue)
}

todoChipsAdd?.forEach((btn) => {
  btn.addEventListener('pointerdown', () => {
    state.setChipJustTapped(true)
    setTimeout(() => state.setChipJustTapped(false), 400)
  })
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    const cat = btn.dataset.category ?? 'general'
    state.setSelectedCategoryForNew(cat)
    todoChipsAdd.forEach((b) =>
      b.classList.toggle('chip--active', (b.dataset.category ?? '') === cat)
    )
  })
})

form?.addEventListener('submit', (e) => {
  e.preventDefault()
  clearTodoError()
  const value = input.value
  const category = state.selectedCategoryForNew || 'general'
  input.value = ''
  updateAddFormHasValue()
  setRandomPlaceholder()
  input.focus()
  todos.addTodo(value, category)
})

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
    state.setStatusFilter(opt.dataset.status ?? 'all')
    syncStatusDropdownUI()
    closeStatusDropdown()
    todos.renderTodos()
  })
})

document.addEventListener('click', () => closeStatusDropdown())
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeStatusDropdown()
})
statusDropdownPanel?.addEventListener('click', (e) => e.stopPropagation())

if (filterRowSlotEl) {
  filterRowSlotEl.addEventListener(
    'touchend',
    (e) => {
      const btn = e.target.closest('.filter-btn')
      if (btn) {
        e.preventDefault()
        e.stopPropagation()
        handleFilterButtonTap(btn)
      }
    },
    { passive: false }
  )
  filterRowSlotEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn')
    if (btn) {
      e.preventDefault()
      e.stopPropagation()
      handleFilterButtonTap(btn)
    }
  })
}

// Cross-off mode: clicking a todo marks it completed; other interactions disabled
listEl?.addEventListener('click', (e) => {
  if (state.crossMode) {
    const item = e.target.closest('.todo-item')
    if (item) {
      e.preventDefault()
      e.stopPropagation()
      const id = item.dataset.todoId
      const t = state.todos.find((x) => x.id === id)
      if (t && !t.completed) todos.toggleTodo(id)
    }
    return
  }
})

listEl?.addEventListener('click', (e) => {
  if (state.crossMode) return
  const cb = e.target.closest('.todo-item__checkbox')
  if (cb && cb.getAttribute('role') === 'checkbox') {
    e.preventDefault()
    const id = e.target.closest('.todo-item').dataset.todoId
    todos.toggleTodo(id)
  }
})

listEl?.addEventListener('click', (e) => {
  if (state.crossMode) return
  if (e.target.closest('.todo-item__delete')) {
    const id = e.target.closest('.todo-item').dataset.todoId
    todos.deleteTodo(id)
  }
})

listEl?.addEventListener('click', (e) => {
  if (state.crossMode) return
  const pill = e.target.closest('.todo-item__category')
  if (pill && pill.dataset.todoId) {
    e.preventDefault()
    state.setEditingCategoryTodoId(pill.dataset.todoId)
    todos.renderTodos(false, null, false)
  }
})

listEl?.addEventListener('click', (e) => {
  if (state.crossMode) return
  const opt = e.target.closest('.todo-item__category-option')
  if (!opt) return
  e.preventDefault()
  const row = e.target.closest('.todo-item')
  const id = row?.dataset.todoId
  const category = opt.dataset.category
  if (!id || !category) return
  const optionsWrap = row?.querySelector('.todo-item__category-options')
  if (optionsWrap) {
    if (optionsWrap.classList.contains('todo-item__category-options--closing')) return
    optionsWrap.classList.add('todo-item__category-options--closing')
    const onDone = () => {
      state.setEditingCategoryTodoId(null)
      todos.updateTodoCategory(id, category)
    }
    optionsWrap.addEventListener('transitionend', onDone, { once: true })
  } else {
    state.setEditingCategoryTodoId(null)
    todos.updateTodoCategory(id, category)
  }
})

emptyStatePartyBtn?.addEventListener('click', () => runEmptyStateCelebration())

// ---- Cross-off mode (pick up / return pencil) ----
let cursorPencilMove = null
function updateCrossModeUI() {
  const on = state.crossMode
  crossModeToggleBtn?.setAttribute('aria-pressed', on ? 'true' : 'false')
  appEl?.classList.toggle('app--cross-mode', on)
  document.body.classList.toggle('app--cross-mode', on)
  if (on && cursorPencilEl) {
    const source = document.querySelector('.brand-header__icon--pencil')
    if (source) {
      cursorPencilEl.innerHTML = ''
      cursorPencilEl.appendChild(source.cloneNode(true))
      cursorPencilEl.removeAttribute('hidden')
    }
    cursorPencilMove = (e) => {
      cursorPencilEl.style.left = e.clientX + 'px'
      cursorPencilEl.style.top = e.clientY + 'px'
    }
    document.addEventListener('pointermove', cursorPencilMove)
  } else {
    if (cursorPencilMove) {
      document.removeEventListener('pointermove', cursorPencilMove)
      cursorPencilMove = null
    }
    cursorPencilEl?.setAttribute('hidden', '')
    cursorPencilEl && (cursorPencilEl.innerHTML = '')
  }
}
// Pick up pencil: tap to hide icon and show following pencil
crossModeToggleBtn?.addEventListener('click', (e) => {
  if (state.crossMode) return
  state.setCrossMode(true)
  updateCrossModeUI()
  if (cursorPencilEl && e.clientX != null) {
    cursorPencilEl.style.left = e.clientX + 'px'
    cursorPencilEl.style.top = e.clientY + 'px'
  }
})
// Return pencil: move back over the empty slot to restore icon and exit cross mode
crossModeToggleBtn?.addEventListener('pointerenter', () => {
  if (!state.crossMode) return
  state.setCrossMode(false)
  updateCrossModeUI()
})

// Drag-to-cross: while pointer down in cross mode, entering a todo marks it completed
let crossDragActive = false
let crossDragCrossedIds = null
listEl?.addEventListener('pointerdown', (e) => {
  if (!state.crossMode || e.button !== 0) return
  crossDragActive = true
  crossDragCrossedIds = new Set()
  const item = e.target.closest('.todo-item')
  if (item) {
    const id = item.dataset.todoId
    const t = state.todos.find((x) => x.id === id)
    if (t && !t.completed) {
      crossDragCrossedIds.add(id)
      todos.toggleTodo(id)
    }
  }
})
document.addEventListener('pointermove', (e) => {
  if (!crossDragActive || !state.crossMode || !listEl) return
  const el = document.elementFromPoint(e.clientX, e.clientY)
  const item = el?.closest('.todo-item')
  if (!item) return
  const id = item.dataset.todoId
  if (!id || crossDragCrossedIds.has(id)) return
  const t = state.todos.find((x) => x.id === id)
  if (t && !t.completed) {
    crossDragCrossedIds.add(id)
    todos.toggleTodo(id)
  }
})
document.addEventListener('pointerup', () => {
  crossDragActive = false
  crossDragCrossedIds = null
})
document.addEventListener('pointercancel', () => {
  crossDragActive = false
  crossDragCrossedIds = null
})

// ---- Drag handle tooltip ----
let dragHandleTooltipShowTimeout = null
function showDragHandleTooltip(handle) {
  if (!dragHandleTooltip || !handle) return
  const rect = handle.getBoundingClientRect()
  dragHandleTooltip.style.left = `${rect.left + rect.width / 2}px`
  dragHandleTooltip.style.top = `${rect.bottom + 6}px`
  dragHandleTooltip.style.transform = 'translateX(-50%)'
  dragHandleTooltip.removeAttribute('hidden')
}
function hideDragHandleTooltip() {
  if (dragHandleTooltipShowTimeout) {
    clearTimeout(dragHandleTooltipShowTimeout)
    dragHandleTooltipShowTimeout = null
  }
  dragHandleTooltip?.setAttribute('hidden', '')
}
document.addEventListener('mouseenter', (e) => {
  const handle = e.target.closest?.('.todo-item__drag-handle')
  if (!handle) return
  dragHandleTooltipShowTimeout = setTimeout(() => showDragHandleTooltip(handle), 400)
}, true)
document.addEventListener('mouseleave', (e) => {
  const handle = e.target.closest?.('.todo-item__drag-handle')
  if (handle) {
    hideDragHandleTooltip()
  }
}, true)
document.addEventListener('focusin', (e) => {
  const handle = e.target.closest?.('.todo-item__drag-handle')
  if (handle) {
    if (dragHandleTooltipShowTimeout) clearTimeout(dragHandleTooltipShowTimeout)
    dragHandleTooltipShowTimeout = setTimeout(() => showDragHandleTooltip(handle), 300)
  }
})
document.addEventListener('focusout', () => {
  hideDragHandleTooltip()
})
document.addEventListener('pointerdown', (e) => {
  if (e.target.closest?.('.todo-item__drag-handle')) hideDragHandleTooltip()
})

authOpenLogin?.addEventListener('click', () => auth.openAuthModal('signin'))
authOpenSignup?.addEventListener('click', () => auth.openAuthModal('signup'))
authModalClose?.addEventListener('click', auth.closeAuthModal)
authModal?.addEventListener('close', () => {
  authSigninPassword.value = ''
  authSignupPassword.value = ''
})
authModal?.addEventListener('cancel', auth.closeAuthModal)

toastUndo?.addEventListener('click', () => todos.undoDelete())

authSwitchToSignup?.addEventListener('click', () => auth.setAuthView('signup'))
authSwitchToSignin?.addEventListener('click', () => auth.setAuthView('signin'))

document.querySelectorAll('.auth-password-wrap').forEach((wrap) => {
  const pwInput = wrap.querySelector('input')
  const btn = wrap.querySelector('.auth-password-toggle')
  if (!pwInput || !btn) return
  btn.addEventListener('click', () => {
    const isPassword = pwInput.type === 'password'
    pwInput.type = isPassword ? 'text' : 'password'
    wrap.classList.toggle('auth-password-wrap--visible', isPassword)
    btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password')
    btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password')
  })
})

auth.initAuth(todos.loadTodos)

authSignOut?.addEventListener('click', async () => {
  if (!supabase) return
  await supabase.auth.signOut()
  await todos.ensureSession()
  auth.updateAuthUI()
  await todos.loadTodos()
})

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    state.setCurrentUser(session?.user ?? null)
    auth.updateAuthUI()
    void todos.loadTodos()
  })
}

// ---- Init ----
;(async () => {
  try {
    setRandomPlaceholder()
    auth.updateAuthUI()
    if (supabase) {
      await todos.ensureSession()
      auth.updateAuthUI()
      await todos.loadTodos()
    }
  } catch (err) {
    console.error('App init failed:', err)
  }
})()
