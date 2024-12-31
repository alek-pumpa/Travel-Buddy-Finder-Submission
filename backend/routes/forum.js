const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');

// Create a new post
router.post('/posts', forumController.createPost);

// Get all posts
router.get('/posts', forumController.getPosts);

module.exports = router;
