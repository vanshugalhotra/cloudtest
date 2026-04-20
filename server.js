const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
// On Azure Kudu, configure the MONGODB_URI in the strict environment variables section.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-cloud-test';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });

// Make sure Todo model is required
const Todo = require('./models/Todo');

/* ──────────────────────────────────────────────────────────────
   API Routes
────────────────────────────────────────────────────────────── */

// GET all todos (sorted newest first)
app.get('/api/todos', async (req, res) => {
    try {
        const todos = await Todo.find().sort({ createdAt: -1 });
        res.json(todos);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
});

// POST — create a new todo
app.post('/api/todos', async (req, res) => {
    try {
        const { text, priority, due } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text is required' });
        }
        const newTodo = new Todo({
            text: text.trim(),
            priority: priority || 'Medium',
            completed: false,
            due: due ? new Date(due) : null
        });
        await newTodo.save();
        res.status(201).json(newTodo);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create todo' });
    }
});

// DELETE — remove a todo by id
app.delete('/api/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Todo.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ error: 'Todo not found' });
        res.status(200).json({ message: 'Todo deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete todo' });
    }
});

// PUT — update a todo (supports: completed, text, priority, due)
app.put('/api/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { completed, text, priority, due } = req.body;

        const updateFields = {};
        if (typeof completed === 'boolean') updateFields.completed = completed;
        if (text !== undefined && text.trim()) updateFields.text = text.trim();
        if (priority !== undefined) updateFields.priority = priority;
        if (due !== undefined) updateFields.due = due ? new Date(due) : null;

        const updatedTodo = await Todo.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true }
        );
        if (!updatedTodo) return res.status(404).json({ error: 'Todo not found' });
        res.json(updatedTodo);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update todo' });
    }
});

// GET — health check endpoint
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'ok',
        db: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
