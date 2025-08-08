import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const Messages = () => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            setLoading(true);
            console.log('Fetching conversations...');
            
            const response = await fetch(`${process.env.REACT_APP_API_URL}/messages/conversations`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            console.log('Conversations response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch conversations');
            }

            const data = await response.json();
            console.log('Conversations data:', data);
            
            setConversations(data.data || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 168) { // 7 days
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const getOtherParticipant = (participants) => {
        if (!participants || participants.length === 0) return null;
        // Find the participant that's not the current user
        return participants[0]; // Since we're filtering out current user in backend
    };

    const openConversation = (conversationId) => {
        navigate(`/app/messages/${conversationId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading conversations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Messages
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Chat with your travel matches
                    </p>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/50 border border-red-400 text-red-800 dark:text-red-300 rounded-lg p-4 mb-6">
                        <p className="font-medium">Error loading conversations</p>
                        <p className="text-sm">{error}</p>
                        <button
                            onClick={fetchConversations}
                            className="mt-2 text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 px-3 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Conversations List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                    {conversations.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">💬</div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                No conversations yet
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Start matching with travelers to begin chatting!
                            </p>
                            <div className="space-x-4">
                                <button
                                    onClick={() => navigate('/app/swipe')}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Find Travel Buddies
                                </button>
                                <button
                                    onClick={() => navigate('/app/matches')}
                                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    View Matches
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {conversations.map((conversation, index) => {
                                const otherUser = getOtherParticipant(conversation.participants);
                                
                                return (
                                    <motion.div
                                        key={conversation._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        onClick={() => openConversation(conversation._id)}
                                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center space-x-4">
                                            {/* Avatar */}
                                            <div className="flex-shrink-0">
                                                {otherUser?.profilePicture || otherUser?.photo ? (
                                                    <img
                                                        src={
                                                            otherUser.profilePicture?.startsWith('http') 
                                                                ? otherUser.profilePicture 
                                                                : `${process.env.REACT_APP_API_URL}/uploads/profiles/${otherUser.photo || otherUser.profilePicture}`
                                                        }
                                                        alt={otherUser.name}
                                                        className="w-12 h-12 rounded-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div 
                                                    className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center"
                                                    style={{ display: (otherUser?.profilePicture || otherUser?.photo) ? 'none' : 'flex' }}
                                                >
                                                    <span className="text-white font-semibold">
                                                        {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Conversation Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                        {otherUser?.name || 'Unknown User'}
                                                    </h3>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {formatTimestamp(conversation.lastMessage?.createdAt || conversation.updatedAt)}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-400 text-sm truncate">
                                                    {conversation.lastMessage?.content || 'Start a conversation...'}
                                                </p>
                                            </div>

                                            {/* Chevron */}
                                            <div className="flex-shrink-0">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messages;