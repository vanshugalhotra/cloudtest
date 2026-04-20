document.addEventListener('DOMContentLoaded', () => {
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoPriority = document.getElementById('todo-priority');
    const todoList = document.getElementById('todo-list');
    const errorMsg = document.getElementById('error-msg');
    
    // Base URL is relative to current host
    const API_BASE_URL = '/api/todos';

    // Fetch and render initial todos
    fetchTodos();

    todoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = todoInput.value.trim();
        const priority = todoPriority.value;
        if (!text) return;

        try {
            const btn = document.getElementById('add-btn');
            const originalText = btn.innerText;
            btn.innerText = '...';
            btn.disabled = true;

            const res = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, priority })
            });

            if (!res.ok) throw new Error('Failed to create todo');
            
            todoInput.value = '';
            hideError();
            await fetchTodos();
            
            btn.innerText = originalText;
            btn.disabled = false;
        } catch (err) {
            showError('Could not add todo. Server might be down.');
            console.error(err);
            document.getElementById('add-btn').innerText = 'Add';
            document.getElementById('add-btn').disabled = false;
        }
    });

    async function fetchTodos() {
        try {
            renderLoading();
            const res = await fetch(API_BASE_URL);
            if (!res.ok) throw new Error('Network response was not ok');
            const todos = await res.json();
            renderTodos(todos);
            hideError();
        } catch (err) {
            showError('Failed to load tasks. Ensure server/DB is running.');
            todoList.innerHTML = '';
            console.error(err);
        }
    }

    function renderLoading() {
        todoList.innerHTML = '<li class="loading">Loading tasks...</li>';
    }

    function renderTodos(todos) {
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty-state">No tasks yet. Add one above!</li>';
            return;
        }

        todoList.innerHTML = '';
        todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.setAttribute('data-id', todo._id);

            li.innerHTML = `
                <label class="checkbox-container">
                    <input type="checkbox" class="toggle-checkbox" ${todo.completed ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <span class="priority-badge priority-${(todo.priority || 'Medium').toLowerCase()}">${todo.priority || 'Medium'}</span>
                <button class="delete-btn" aria-label="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            `;

            // Event Listeners
            const checkbox = li.querySelector('.toggle-checkbox');
            checkbox.addEventListener('change', () => toggleTodo(todo._id, checkbox.checked, li));

            const delBtn = li.querySelector('.delete-btn');
            delBtn.addEventListener('click', () => deleteTodo(todo._id, li));

            todoList.appendChild(li);
        });
    }

    async function toggleTodo(id, completed, liElement) {
        try {
            if (completed) {
                liElement.classList.add('completed');
            } else {
                liElement.classList.remove('completed');
            }
            
            const res = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed })
            });
            if (!res.ok) throw new Error('Failed to update toggle');
        } catch (err) {
            console.error(err);
            // Revert state
            liElement.querySelector('.toggle-checkbox').checked = !completed;
            if (!completed) {
                liElement.classList.add('completed');
            } else {
                liElement.classList.remove('completed');
            }
        }
    }

    async function deleteTodo(id, liElement) {
        try {
            liElement.style.opacity = '0.5';
            const res = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Delete failed');
            
            // Animation out
            liElement.style.transform = 'scale(0.95)';
            liElement.style.opacity = '0';
            setTimeout(() => {
                liElement.remove();
                if (todoList.children.length === 0) {
                    renderTodos([]);
                }
            }, 200);
        } catch (err) {
            console.error(err);
            liElement.style.opacity = '1';
        }
    }

    function showError(msg) {
        errorMsg.innerText = msg;
        errorMsg.style.display = 'block';
    }

    function hideError() {
        errorMsg.style.display = 'none';
    }

    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
