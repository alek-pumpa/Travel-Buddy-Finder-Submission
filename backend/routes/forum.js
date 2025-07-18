const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');

// Create a new post
router.post('/posts', forumController.createPost);

// Get all posts
router.get('/posts', forumController.getPosts);

// Like a post
router.post('/posts/:id/like', forumController.likePost);

// Handle OPTIONS request for liking a post
router.options('/posts/:id/like', (req, res) => {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.sendStatus(200);
});

module.exports = router;
