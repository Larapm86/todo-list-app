import './style.css'

const form = document.querySelector('.todo-form')
const input = document.querySelector('.todo-input')
const listEl = document.querySelector('.todo-list')

let todos = []
let nextId = 1

function addTodo(text) {
  if (!text.trim()) return
  todos.push({ id: nextId++, text: text.trim(), completed: false })
  renderTodos()
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id)
  if (todo) {
    todo.completed = !todo.completed
    renderTodos()
  }
}

function deleteTodo(id) {
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

    const text = document.createElement('span')
    text.className = 'todo-item__text'
    text.textContent = todo.text

    const deleteBtn = document.createElement('button')
    deleteBtn.type = 'button'
    deleteBtn.className = 'todo-item__delete'
    deleteBtn.setAttribute('aria-label', 'Delete')
    deleteBtn.textContent = 'Delete'

    li.append(checkbox, text, deleteBtn)
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
    const id = Number(e.target.closest('.todo-item').dataset.todoId)
    toggleTodo(id)
  }
})

listEl.addEventListener('click', (e) => {
  if (e.target.matches('.todo-item__delete')) {
    const id = Number(e.target.closest('.todo-item').dataset.todoId)
    deleteTodo(id)
  }
})
