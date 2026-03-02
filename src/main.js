import './style.css'
import { supabase } from './supabase.js'

const form = document.querySelector('.todo-form')
const input = document.querySelector('.todo-input')
const listEl = document.querySelector('.todo-list')

let todos = []

async function loadTodos() {
  const { data, error } = await supabase.from('todos').select('id, todo_text:text, completed, created_at').order('created_at', { ascending: true })
  if (error) {
    console.error('Failed to load todos:', error)
    return
  }
  todos = (data ?? []).map((row) => ({ ...row, text: row.todo_text ?? row.text ?? '' }))
  renderTodos()
}

async function addTodo(text) {
  if (!text.trim()) return
  const { error } = await supabase.from('todos').insert({ text: text.trim(), completed: false })
  if (error) {
    console.error('Failed to add todo:', error)
    return
  }
  await loadTodos()
}

async function toggleTodo(id) {
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
    textEl.textContent = (todo.text ?? todo.todo_text ?? '').toString()

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
  addTodo(input.value)
  input.value = ''
  input.focus()
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

loadTodos()
