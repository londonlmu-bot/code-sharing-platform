const express = require('express');
const router = express.Router();
const Snippet = require('../models/Snippet'); 
const authMiddleware = require('../middleware/auth'); 

// 1. GET ALL SNIPPETS (For the Library)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const snippets = await Snippet.find().sort({ updatedAt: -1 });
        res.json(snippets);
    } catch (err) {
        res.status(500).json({ message: "Error fetching snippets" });
    }
});

// 2. CREATE NEW SNIPPET (First Time Save)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, code, language } = req.body;
        const newSnippet = new Snippet({
            title,
            code,
            language,
            userId: req.user.id // Updated to match your Schema field name
        });
        await newSnippet.save();
        res.json(newSnippet);
    } catch (err) {
        res.status(500).json({ message: "Error creating snippet" });
    }
});

// 3. SAVE AS NEW VERSION (Version Control Logic)
// This is called when an existing snippet is edited
router.post('/:id/version', authMiddleware, async (req, res) => {
    try {
        const { title, code } = req.body;
        const snippet = await Snippet.findById(req.params.id);

        if (!snippet) return res.status(404).json({ message: "Snippet not found" });

        // Push current data into versions array before updating
        snippet.versions.push({
            title: snippet.title,
            code: snippet.code,
            createdAt: snippet.updatedAt
        });

        // Update the main snippet with new code
        snippet.title = title;
        snippet.code = code;

        await snippet.save();
        res.json({ message: "New version saved!", snippet });
    } catch (err) {
        res.status(500).json({ message: "Error saving new version" });
    }
});

// 4. GET VERSION HISTORY
router.get('/:id/versions', authMiddleware, async (req, res) => {
    try {
        const snippet = await Snippet.findById(req.params.id);
        if (!snippet) return res.status(404).json({ message: "Snippet not found" });

        // Returns the versions array (Newest versions first)
        res.json(snippet.versions.reverse());
    } catch (err) {
        res.status(500).json({ message: "Error fetching history" });
    }
});

// 5. ADD COMMENT
router.post('/:id/comment', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const snippet = await Snippet.findById(req.params.id);

        if (!snippet) return res.status(404).json({ message: "Snippet not found" });

        const newComment = {
            userName: req.user.name, // Extracted from verified JWT token
            text,
            createdAt: new Date()
        };

        snippet.comments.push(newComment);
        await snippet.save();
        res.json(snippet);
    } catch (err) {
        res.status(500).json({ message: "Error adding comment" });
    }
});

// 6. DELETE COMMENT
router.delete('/:id/comment/:commentId', authMiddleware, async (req, res) => {
    try {
        const snippet = await Snippet.findById(req.params.id);
        if (!snippet) return res.status(404).json({ message: "Snippet not found" });

        snippet.comments = snippet.comments.filter(
            (c) => c._id.toString() !== req.params.commentId
        );

        await snippet.save();
        res.json({ message: "Comment deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting comment" });
    }
});

// 7. DELETE SNIPPET
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await Snippet.findByIdAndDelete(req.params.id);
        res.json({ message: "Snippet deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting snippet" });
    }
});

module.exports = router;