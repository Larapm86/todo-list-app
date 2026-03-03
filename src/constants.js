/** App-wide constants: labels, copy, timing, and static markup */

export const CATEGORY_LABELS = {
  general: 'General',
  work: 'Work',
  personal: 'Personal',
  errands: 'Errands',
}

export const STATUS_LABELS = {
  all: 'View all',
  active: 'Active',
  completed: 'Checked',
}

export const PLACEHOLDER_EXAMPLES = [
  'e.g. Dance like nobody\'s watching',
  'e.g. Adopt a pet unicorn',
  'e.g. Send a meme to a friend',
  'e.g. Write a letter to your future self',
  'e.g. Pretend you\'re a superhero for 5 min',
  'e.g. Build a pillow fort',
  'e.g. Invent a new ice cream flavor',
  'e.g. Try a new accent for the day',
  'e.g. Create a secret handshake',
  'e.g. Give your plant a motivational speech',
  'e.g. Finish reading that book',
]

export const CONFETTI_COLORS = [
  '#fde047',
  '#a78bfa',
  '#34d399',
  '#f472b6',
  '#60a5fa',
  '#fb923c',
]

export const TRASH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline fill="none" points="3 6 5 6 21 6"/><path fill="none" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'

export const CHECKBOX_SVG =
  '<svg class="todo-item__checkbox-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polyline class="todo-item__checkbox-check" points="9 12 11 14 15 10"/></svg>'

export const THEME_STORAGE_KEY = 'todo-theme'

export const ADD_CHECK_DURATION_MS = 720
export const TODO_ADD_IN_ANIMATION_MS = 550
export const CELEBRATION_DURATION_MS = 3000

export const AUTH_VIEW = {
  signin: {
    title: 'Back in action!',
    hint: 'Step back into your todo zone',
  },
  signup: {
    title: 'Welcome!',
    hint: 'Create an account and conquer your todos',
  },
}
