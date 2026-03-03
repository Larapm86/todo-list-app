/** Status dropdown: open, close, sync UI */
import { STATUS_LABELS } from './constants.js'
import * as state from './state.js'
import {
  statusDropdown,
  statusFilterTrigger,
  statusFilterLabel,
  statusDropdownPanel,
  statusDropdownOptions,
} from './dom.js'

export function closeStatusDropdown() {
  if (!statusDropdown) return
  statusDropdown.classList.remove('is-open')
  statusFilterTrigger?.setAttribute('aria-expanded', 'false')
  statusDropdownPanel?.setAttribute('hidden', '')
  statusDropdownPanel?.setAttribute('aria-hidden', 'true')
}

export function openStatusDropdown() {
  if (!statusDropdown) return
  statusDropdown.classList.add('is-open')
  statusFilterTrigger?.setAttribute('aria-expanded', 'true')
  statusDropdownPanel?.removeAttribute('hidden')
  statusDropdownPanel?.setAttribute('aria-hidden', 'false')
}

export function syncStatusDropdownUI() {
  if (statusFilterLabel)
    statusFilterLabel.textContent = STATUS_LABELS[state.statusFilter] ?? 'View all'
  statusDropdownOptions?.forEach((opt) => {
    const val = opt.dataset.status ?? 'all'
    const active = val === state.statusFilter
    opt.classList.toggle('status-dropdown__option--active', active)
    opt.setAttribute('aria-selected', active ? 'true' : 'false')
  })
}
