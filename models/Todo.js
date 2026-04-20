const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
    },
    completed: {
        type: Boolean,
        default: false
    },
    due: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Todo', todoSchema);
