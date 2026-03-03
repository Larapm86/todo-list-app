/** Mutable application state (single source of truth) */

export let todos = []
export let currentUser = null
export let categoryFilter = ''
export let statusFilter = 'all' // 'all' | 'active' | 'completed'
export let selectedCategoryForNew = 'general'
export let addLoading = false
export let addCheckResetTimeoutId = null
export let undoDeleteTimeout = null
export let lastDeletedTodo = null
export let pendingDeleteId = null

// Tooltip (listener refs for cleanup)
export let authTooltipHideTimeout = null
export let authTooltipDismissListener = null

// Add form
export let chipJustTapped = false
export let addFormBlurTimeout = null

// Todo card: which todo's category is being edited (pill → picker)
export let editingCategoryTodoId = null

// Cross-off mode: pencil icon toggles; clicking todos marks them completed
export let crossMode = false

export function setTodos(value) {
  todos = value
}

export function setCurrentUser(value) {
  currentUser = value
}

export function setCategoryFilter(value) {
  categoryFilter = value
}

export function setStatusFilter(value) {
  statusFilter = value
}

export function setSelectedCategoryForNew(value) {
  selectedCategoryForNew = value
}

export function setAddLoading(value) {
  addLoading = value
}

export function setAddCheckResetTimeoutId(value) {
  addCheckResetTimeoutId = value
}

export function setUndoDeleteTimeout(value) {
  undoDeleteTimeout = value
}

export function setLastDeletedTodo(value) {
  lastDeletedTodo = value
}

export function setPendingDeleteId(value) {
  pendingDeleteId = value
}

export function setAuthTooltipHideTimeout(value) {
  authTooltipHideTimeout = value
}

export function setAuthTooltipDismissListener(value) {
  authTooltipDismissListener = value
}

export function setChipJustTapped(value) {
  chipJustTapped = value
}

export function setAddFormBlurTimeout(value) {
  addFormBlurTimeout = value
}

export function setEditingCategoryTodoId(value) {
  editingCategoryTodoId = value
}

export function setCrossMode(value) {
  crossMode = value
}
