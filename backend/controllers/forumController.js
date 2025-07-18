const Post = require('../models/Post');

// Create a new post
exports.createPost = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        const { title, content, author } = req.body;
        
        if (!title || !content || !author) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newPost = new Post({
            title,
            content,
            author
        });

        console.log('New post:', newPost);
        await newPost.save();
        console.log('Post saved successfully');
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ 
            message: 'Failed to create post',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Get all posts
exports.getPosts = async (req, res) => {
    try {
        console.log('Fetching posts from database');
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('author', 'name avatar')
            .lean();
            
        console.log('Number of posts found:', posts.length);
        console.log('Raw posts from database:', posts);
        
        if (posts.length === 0) {
            console.log('No posts found in database');
            return res.status(200).json([]);
        }

        const formattedPosts = posts.map(post => {
            console.log('Formatting post:', post._id);
            return {
                ...post,
                stats: {
                    likes: post.likes || 0,
                    comments: post.comments || 0,
                    views: post.views || 0
                },
                isLiked: false,
                isBookmarked: false,
                tags: post.tags || [],
                timestamp: post.createdAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
            };
        });
        
        console.log('Number of formatted posts:', formattedPosts.length);
        console.log('First formatted post:', formattedPosts[0]);
        res.status(200).json(formattedPosts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Like a post
exports.likePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Toggle like status
        post.isLiked = !post.isLiked;
        post.likes += post.isLiked ? 1 : -1; // Update like count

        await post.save();

        res.status(200).json({
            message: 'Post liked successfully',
            likes: post.likes,
            isLiked: post.isLiked
        });
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ message: 'Failed to like post', error: error.message });
    }
};
