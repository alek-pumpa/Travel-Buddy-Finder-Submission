import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { createPost } from '../services/forumService';
import { toast } from 'react-hot-toast';

const ForumPost = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const authUser = useSelector(state => state.auth?.user);
    const userState = useSelector(state => state.user?.user);
    const user = authUser || userState;

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Form submitted');
        
        if (!title.trim() || !content.trim()) {
            console.log('Validation failed: empty fields');
            toast.error('Please fill in both title and content');
            return;
        }

        setIsSubmitting(true);
        try {
            if (!user) {
                console.log('User not authenticated');
                toast.error('You must be logged in to create a post');
                return;
            }
            console.log('Creating post with data:', { title, content, author: user._id });
            const result = await createPost({ title, content, author: user._id });
            console.log('Post creation result:', result);
            toast.success('Post created successfully!');
            setTitle('');
            setContent('');
        } catch (error) {
            console.error('Error creating post:', error);
            toast.error('Failed to create post. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Create New Post</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="title" className="block text-sm font-medium mb-1">
                        Title
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="content" className="block text-sm font-medium mb-1">
                        Content
                    </label>
                    <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        rows="5"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {isSubmitting ? 'Posting...' : 'Create Post'}
                </button>
            </form>
        </div>
    );
};

export default ForumPost;
