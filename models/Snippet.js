const mongoose = require('mongoose');

// Define the Schema for Code Snippets
const snippetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  // The user ID who created the snippet (Owner)
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  // Array to store previous versions for Version Control
  versions: [{
    title: String,
    code: String,
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  // Array to store user comments/reviews
  comments: [{
    userName: String,
    text: String,
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }]
}, { 
  timestamps: true // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('Snippet', snippetSchema);