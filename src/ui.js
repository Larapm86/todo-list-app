/** UI helpers: todo error, add-form loading, success check */
import {
  todoErrorEl,
  input,
  todoAddBtn,
  todoAddBtnIcon,
  todoAddBtnSpinner,
  todoAddBtnCheck,
} from './dom.js'
import * as state from './state.js'
import { ADD_CHECK_DURATION_MS } from './constants.js'

export function showTodoError(msg) {
  if (todoErrorEl) {
    todoErrorEl.textContent = msg
    todoErrorEl.removeAttribute('hidden')
  }
}

export function clearTodoError() {
  if (todoErrorEl) {
    todoErrorEl.textContent = ''
    todoErrorEl.setAttribute('hidden', '')
  }
  input?.classList.remove('add-form__input--error')
}

export function setAddLoading(loading) {
  state.setAddLoading(loading)
  if (todoAddBtn) todoAddBtn.disabled = state.addLoading
  if (todoAddBtnIcon) todoAddBtnIcon.hidden = state.addLoading
  if (todoAddBtnSpinner) {
    todoAddBtnSpinner.hidden = !state.addLoading
  }
}

export function showAddSuccessCheck() {
  if (state.addCheckResetTimeoutId != null) {
    clearTimeout(state.addCheckResetTimeoutId)
    state.setAddCheckResetTimeoutId(null)
  }
  if (!todoAddBtnCheck || !todoAddBtnIcon) return
  if (todoAddBtnSpinner) todoAddBtnSpinner.hidden = true
  todoAddBtnIcon.hidden = true
  todoAddBtnCheck.hidden = false
  todoAddBtnCheck.classList.remove('add-form__check--animate')
  void todoAddBtnCheck.offsetWidth
  todoAddBtnCheck.classList.add('add-form__check--animate')
  const id = setTimeout(() => {
    state.setAddCheckResetTimeoutId(null)
    todoAddBtnCheck.classList.remove('add-form__check--animate')
    todoAddBtnCheck.hidden = true
    todoAddBtnIcon.hidden = false
  }, ADD_CHECK_DURATION_MS)
  state.setAddCheckResetTimeoutId(id)
}
