import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChatBubbleLeftIcon, HeartIcon, BookmarkIcon, ShareIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import ForumPost from '../components/ForumPost';
import { createPost, getPosts } from '../services/forumService';
import { getToken, getUser } from '../services/authService';
import { toast } from 'react-hot-toast';

const ForumPage = () => {
    const [posts, setPosts] = useState([]);
    const [showPostForm, setShowPostForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (token) {
            const user = getUser();
            if (user) {
                // User is authenticated, fetch posts
                const fetchPosts = async () => {
                    try {
                        const data = await getPosts();
                        setPosts(data);
                    } catch (error) {
                        console.error('Error fetching posts:', error);
                        toast.error('Failed to load posts');
                    } finally {
                        setIsLoading(false);
                    }
                };
                fetchPosts();
            }
        } else {
            // Redirect to login if no token
            window.location.href = '/login';
        }
        const fetchPosts = async () => {
            try {
                const data = await getPosts();
                setPosts(data);
            } catch (error) {
                console.error('Error fetching posts:', error);
                toast.error('Failed to load posts');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPosts();
    }, []);

    const handleCreatePost = async (postData) => {
        try {
            const newPost = await createPost(postData);
            setPosts([newPost, ...posts]);
            setShowPostForm(false);
            toast.success('Post created successfully!');
        } catch (error) {
            console.error('Error creating post:', error);
            toast.error('Failed to create post');
        }
    };

    const categories = [
        'All Topics',
        'Trip Planning',
        'Safety',
        'Budget Travel',
        'Adventure',
        'Cultural Exchange',
        'Travel Tech',
        'Food & Cuisine'
    ];

    const [selectedCategory, setSelectedCategory] = useState('All Topics');
    const [sortBy, setSortBy] = useState('recent');

    const handleLike = (postId) => {
        setPosts(posts.map(post => {
            if (post.id === postId) {
                const newLikeStatus = !post.isLiked;
                return {
                    ...post,
                    isLiked: newLikeStatus,
                    stats: {
                        ...post.stats,
                        likes: post.stats.likes + (newLikeStatus ? 1 : -1)
                    }
                };
            }
            return post;
        }));
    };

    const handleBookmark = (postId) => {
        setPosts(posts.map(post => {
            if (post.id === postId) {
                return {
                    ...post,
                    isBookmarked: !post.isBookmarked
                };
            }
            return post;
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                Travel Community Forum
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Connect, share experiences, and get travel advice
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0">
                            <button 
                                onClick={() => setShowPostForm(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                + New Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Categories and Filters */}
                <div className="mb-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-full text-sm font-medium ${
                                    selectedCategory === category
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                        >
                            <option value="recent">Most Recent</option>
                            <option value="popular">Most Popular</option>
                            <option value="commented">Most Commented</option>
                        </select>
                    </div>
                </div>

                {/* Post Form Modal */}
                {showPostForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Create New Post</h2>
                                <button 
                                    onClick={() => setShowPostForm(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    &times;
                                </button>
                            </div>
                            <ForumPost onCreatePost={handleCreatePost} />
                        </div>
                    </div>
                )}

                {/* Posts */}
                <div className="space-y-6">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                            <p className="mt-2 text-gray-500">Loading posts...</p>
                        </div>
                    ) : !posts || posts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No posts found. Be the first to share!
                        </div>
                    ) : (
                        posts.map((post) => (
                            <motion.div
                            key={post._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
                        >
                            <div className="flex items-start space-x-4">
                                <img
                                    src={post.author.avatar}
                                    alt={post.author.name}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                        {post.title}
                                    </h3>
                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                                        <span>{post.author.name}</span>
                                        <span className="mx-2">•</span>
                                        <span>{post.timestamp}</span>
                                        <span className="mx-2">•</span>
                                        <span>{post.category}</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                                        {post.content}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {post.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-6">
                                            <button
                                                onClick={() => handleLike(post._id)}
                                                className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                            >
                                                {post.isLiked ? (
                                                    <HeartIconSolid className="h-5 w-5 text-red-500" />
                                                ) : (
                                                    <HeartIcon className="h-5 w-5" />
                                                )}
                                                <span>{post.stats.likes}</span>
                                            </button>
                                            <button className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                                <ChatBubbleLeftIcon className="h-5 w-5" />
                                                <span>{post.stats.comments}</span>
                                            </button>
                                            <button
                                                onClick={() => handleBookmark(post.id)}
                                                className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                            >
                                                {post.isBookmarked ? (
                                                    <BookmarkIconSolid className="h-5 w-5 text-blue-500" />
                                                ) : (
                                                    <BookmarkIcon className="h-5 w-5" />
                                                )}
                                            </button>
                                            <button className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                                <ShareIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {post.stats.views} views
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForumPage;
