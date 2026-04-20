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
        // Important: in Kudu we should log the actual error out loudly initially.
    });

// Make sure Todo model is required
const Todo = require('./models/Todo');

// API Routes
app.get('/api/todos', async (req, res) => {
    try {
        const todos = await Todo.find().sort({ createdAt: -1 });
        res.json(todos);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
});

app.post('/api/todos', async (req, res) => {
    try {
        const { text, priority } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        const newTodo = new Todo({ text, priority: priority || 'Medium', completed: false });
        await newTodo.save();
        res.status(201).json(newTodo);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create todo' });
    }
});

app.delete('/api/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Todo.findByIdAndDelete(id);
        res.status(200).json({ message: 'Todo deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete todo' });
    }
});

app.put('/api/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { completed } = req.body;
        const updatedTodo = await Todo.findByIdAndUpdate(id, { completed }, { new: true });
        res.json(updatedTodo);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update todo' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
