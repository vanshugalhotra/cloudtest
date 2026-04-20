/* =============================================================
   CloudTask — Frontend Script
   Features: CRUD, search, filter, edit modal, due dates,
             stats, bulk clear, DB status indicator
   ============================================================= */

document.addEventListener('DOMContentLoaded', () => {

    /* ── DOM References ──────────────────────────────────────── */
    const todoForm      = document.getElementById('todo-form');
    const todoInput     = document.getElementById('todo-input');
    const todoPriority  = document.getElementById('todo-priority');
    const todoDue       = document.getElementById('todo-due');
    const todoList      = document.getElementById('todo-list');
    const errorMsg      = document.getElementById('error-msg');
    const addBtnText    = document.getElementById('add-btn-text');
    const addBtnSpinner = document.getElementById('add-btn-spinner');
    const addBtn        = document.getElementById('add-btn');

    const searchInput    = document.getElementById('search-input');
    const priorityFilter = document.getElementById('priority-filter');
    const filterBtns     = document.querySelectorAll('.tab-btn');

    const totalCount   = document.getElementById('total-count');
    const doneCount    = document.getElementById('done-count');
    const pendingCount = document.getElementById('pending-count');
    const progressBar  = document.getElementById('progress-bar');
    const progressPct  = document.getElementById('progress-pct');

    const dbDot   = document.querySelector('.db-dot');
    const dbLabel = document.querySelector('.db-label');

    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    const bulkInfo          = document.getElementById('bulk-info');

    // Edit modal
    const editModal    = document.getElementById('edit-modal');
    const editInput    = document.getElementById('edit-input');
    const editPriority = document.getElementById('edit-priority');
    const editDue      = document.getElementById('edit-due');
    const modalClose   = document.getElementById('modal-close');
    const modalCancel  = document.getElementById('modal-cancel');
    const modalSave    = document.getElementById('modal-save');

    /* ── State ───────────────────────────────────────────────── */
    const API_BASE = '/api/todos';
    let allTodos    = [];
    let filterState = 'all';   // 'all' | 'active' | 'completed'
    let editingId   = null;

    /* ── Init ────────────────────────────────────────────────── */
    fetchTodos();

    /* ── API Calls ───────────────────────────────────────────── */
    async function fetchTodos() {
        try {
            renderLoading();
            const res = await fetch(API_BASE);
            if (!res.ok) throw new Error();
            allTodos = await res.json();
            setDbStatus(true);
            hideError();
            renderFiltered();
        } catch {
            setDbStatus(false);
            showError('Could not reach the server. Make sure the app is running and MongoDB is connected.');
            todoList.innerHTML = '';
        }
    }

    /* ── Form Submit ─────────────────────────────────────────── */
    todoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text     = todoInput.value.trim();
        const priority = todoPriority.value;
        const due      = todoDue.value || null;
        if (!text) return;

        setAddLoading(true);
        try {
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, priority, due })
            });
            if (!res.ok) throw new Error();
            const newTodo = await res.json();
            allTodos.unshift(newTodo);
            todoInput.value = '';
            todoDue.value   = '';
            hideError();
            renderFiltered();
        } catch {
            showError('Failed to add task. Please try again.');
        } finally {
            setAddLoading(false);
        }
    });

    /* ── Toggle Complete ─────────────────────────────────────── */
    async function toggleTodo(id, completed) {
        const todo = allTodos.find(t => t._id === id);
        if (!todo) return;
        todo.completed = completed;
        renderFiltered();
        try {
            const res = await fetch(`${API_BASE}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed })
            });
            if (!res.ok) throw new Error();
        } catch {
            // Revert
            todo.completed = !completed;
            renderFiltered();
            showError('Could not update task. Please try again.');
        }
    }

    /* ── Delete Todo ─────────────────────────────────────────── */
    async function deleteTodo(id) {
        const li = todoList.querySelector(`[data-id="${id}"]`);
        if (li) {
            li.style.opacity = '0';
            li.style.transform = 'translateX(20px) scale(0.96)';
            li.style.transition = 'all 0.25s ease';
        }
        try {
            const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            allTodos = allTodos.filter(t => t._id !== id);
            setTimeout(() => renderFiltered(), 260);
        } catch {
            if (li) { li.style.opacity = '1'; li.style.transform = ''; }
            showError('Failed to delete task. Please try again.');
        }
    }

    /* ── Edit Todo ───────────────────────────────────────────── */
    function openEditModal(todo) {
        editingId            = todo._id;
        editInput.value      = todo.text;
        editPriority.value   = todo.priority || 'Medium';
        editDue.value        = todo.due ? todo.due.split('T')[0] : '';
        editModal.classList.add('open');
        setTimeout(() => editInput.focus(), 100);
    }

    function closeEditModal() {
        editModal.classList.remove('open');
        editingId = null;
    }

    modalClose.addEventListener('click', closeEditModal);
    modalCancel.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editModal.classList.contains('open')) closeEditModal();
    });

    modalSave.addEventListener('click', async () => {
        if (!editingId) return;
        const text     = editInput.value.trim();
        const priority = editPriority.value;
        const due      = editDue.value || null;
        if (!text) { editInput.focus(); return; }

        modalSave.textContent = 'Saving...';
        modalSave.disabled    = true;
        try {
            const res = await fetch(`${API_BASE}/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, priority, due })
            });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            const idx = allTodos.findIndex(t => t._id === editingId);
            if (idx !== -1) allTodos[idx] = updated;
            closeEditModal();
            renderFiltered();
        } catch {
            showError('Failed to save changes. Please try again.');
        } finally {
            modalSave.textContent = 'Save Changes';
            modalSave.disabled    = false;
        }
    });

    /* ── Bulk Clear Completed ────────────────────────────────── */
    clearCompletedBtn.addEventListener('click', async () => {
        const completed = allTodos.filter(t => t.completed);
        if (!completed.length) return;
        clearCompletedBtn.textContent = 'Clearing...';
        clearCompletedBtn.disabled = true;
        try {
            await Promise.all(completed.map(t =>
                fetch(`${API_BASE}/${t._id}`, { method: 'DELETE' })
            ));
            allTodos = allTodos.filter(t => !t.completed);
            renderFiltered();
        } catch {
            showError('Failed to clear some tasks.');
        } finally {
            clearCompletedBtn.textContent = 'Clear Completed';
            clearCompletedBtn.disabled = false;
        }
    });

    /* ── Filters ─────────────────────────────────────────────── */
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterState = btn.dataset.filter;
            renderFiltered();
        });
    });

    searchInput.addEventListener('input', renderFiltered);
    priorityFilter.addEventListener('change', renderFiltered);

    /* ── Render ──────────────────────────────────────────────── */
    function renderFiltered() {
        const query    = searchInput.value.trim().toLowerCase();
        const prioFilt = priorityFilter.value;

        let visible = allTodos.filter(todo => {
            const matchSearch   = !query || todo.text.toLowerCase().includes(query);
            const matchPriority = prioFilt === 'all' || todo.priority === prioFilt;
            const matchStatus   =
                filterState === 'all'       ? true :
                filterState === 'active'    ? !todo.completed :
                                               todo.completed;
            return matchSearch && matchPriority && matchStatus;
        });

        updateStats();
        renderTodos(visible);
    }

    function updateStats() {
        const total   = allTodos.length;
        const done    = allTodos.filter(t => t.completed).length;
        const pending = total - done;
        const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

        totalCount.textContent   = total;
        doneCount.textContent    = done;
        pendingCount.textContent = pending;
        progressBar.style.width  = pct + '%';
        progressPct.textContent  = `${pct}% complete`;

        // Bulk actions
        bulkInfo.textContent = `${total} task${total !== 1 ? 's' : ''} total`;
        if (done > 0) {
            clearCompletedBtn.classList.add('visible');
        } else {
            clearCompletedBtn.classList.remove('visible');
        }
    }

    function renderLoading() {
        todoList.innerHTML = `
            <li class="state-item">
                <div class="loading-dots">
                    <span></span><span></span><span></span>
                </div>
                <p>Fetching your tasks...</p>
            </li>`;
    }

    function renderTodos(todos) {
        if (todos.length === 0) {
            const isFiltered = filterState !== 'all' || searchInput.value || priorityFilter.value !== 'all';
            todoList.innerHTML = `
                <li class="state-item">
                    <div class="state-icon">${isFiltered ? '🔍' : '✨'}</div>
                    <p>${isFiltered
                        ? 'No tasks match your current filters.'
                        : 'All clear! Add your first task above.'}</p>
                </li>`;
            return;
        }

        todoList.innerHTML = '';
        todos.forEach((todo, i) => {
            const li = buildTodoItem(todo, i);
            todoList.appendChild(li);
        });
    }

    function buildTodoItem(todo, index) {
        const li = document.createElement('li');
        li.className = `todo-item priority-${(todo.priority || 'medium').toLowerCase()} ${todo.completed ? 'completed' : ''}`;
        li.setAttribute('data-id', todo._id);
        li.style.animationDelay = `${index * 40}ms`;

        const dueHtml = todo.due ? buildDueLabel(todo.due) : '';
        const escText = escapeHtml(todo.text);

        li.innerHTML = `
            <label class="custom-check" title="${todo.completed ? 'Mark as pending' : 'Mark as done'}">
                <input type="checkbox" class="toggle-checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="check-ring">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <polyline points="1.5,6 5,9.5 10.5,2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </span>
            </label>
            <div class="todo-content">
                <span class="todo-text" title="${escText}">${escText}</span>
                <div class="todo-meta">
                    <span class="priority-badge priority-${(todo.priority || 'medium').toLowerCase()}">${todo.priority || 'Medium'}</span>
                    ${dueHtml}
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn edit" title="Edit task" aria-label="Edit task">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="action-btn danger" title="Delete task" aria-label="Delete task">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </div>
        `;

        // Events
        li.querySelector('.toggle-checkbox').addEventListener('change', (e) => {
            toggleTodo(todo._id, e.target.checked);
        });
        li.querySelector('.action-btn.danger').addEventListener('click', () => deleteTodo(todo._id));
        li.querySelector('.action-btn.edit').addEventListener('click', () => openEditModal(todo));

        return li;
    }

    function buildDueLabel(due) {
        const dueDate  = new Date(due);
        const today    = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let cls = '';
        let txt = '';

        if (dueDate < today) {
            cls = 'overdue';
            txt = `Overdue · ${formatDate(dueDate)}`;
        } else if (dueDate.getTime() === today.getTime()) {
            cls = 'soon';
            txt = 'Due today';
        } else if (dueDate.getTime() === tomorrow.getTime()) {
            cls = 'soon';
            txt = 'Due tomorrow';
        } else {
            txt = `Due ${formatDate(dueDate)}`;
        }

        return `
            <span class="due-label ${cls}" title="Due date">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                ${txt}
            </span>`;
    }

    function formatDate(d) {
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    /* ── Helpers ─────────────────────────────────────────────── */
    function setAddLoading(on) {
        addBtn.disabled = on;
        addBtnText.classList.toggle('hidden', on);
        addBtnSpinner.classList.toggle('hidden', !on);
    }

    function setDbStatus(online) {
        if (online) {
            dbDot.classList.add('online');
            dbDot.classList.remove('offline');
            dbLabel.textContent = 'Connected';
        } else {
            dbDot.classList.add('offline');
            dbDot.classList.remove('online');
            dbLabel.textContent = 'Offline';
        }
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
        // Auto-hide after 5s
        clearTimeout(errorMsg._timer);
        errorMsg._timer = setTimeout(hideError, 5000);
    }

    function hideError() {
        errorMsg.style.display = 'none';
    }

    function escapeHtml(s) {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
