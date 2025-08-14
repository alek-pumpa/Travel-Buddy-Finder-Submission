import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';

const Messages = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const currentUser = useSelector(selectUser);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [matchedUsers, setMatchedUsers] = useState([]);
    const [creatingGroup, setCreatingGroup] = useState(false);

    useEffect(() => {
        fetchConversations();
        // eslint-disable-next-line
    }, [location.pathname]);

    useEffect(() => {
        if (showGroupModal) {
            fetchMatchedUsers();
        }
        // eslint-disable-next-line
    }, [showGroupModal]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const sellerId = params.get('seller');
        if (sellerId) {
            fetch(`${process.env.REACT_APP_API_URL}/messages/conversations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ participantId: sellerId })
            })
            .then(res => {
                if (res.status === 200 || res.status === 201) return res.json();
                throw new Error('Failed to create or fetch conversation');
            })
            .then(data => {
                if (data.data && data.data._id) {
                    navigate(`/app/messages/${data.data._id}`);
                }
            })
            .catch(() => {
                toast.error('Could not open chat with seller.');
            });
        }
    }, [location, navigate]);

    async function fetchConversations() {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/messages/conversations`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.status === 200 || response.status === 304) {
                const data = await response.json();
                setConversations(data.data || []);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch conversations');
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchMatchedUsers() {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/matches/my-matches`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            const data = await response.json();
            if (data.status === 'success') {
                setMatchedUsers(
                    (data.data || []).map(match => match.otherUser).filter(Boolean)
                );
            } else {
                setMatchedUsers([]);
            }
        } catch {
            setMatchedUsers([]);
        }
    }

    async function handleCreateGroup(e) {
        e.preventDefault();
        if (!groupName || selectedUserIds.length < 1) return;
        setCreatingGroup(true);
        try {
            const groupBody = {
                name: groupName,
                type: 'chat',
                members: Array.from(new Set([...selectedUserIds, currentUser.id]))
            };
            const response = await fetch(`${process.env.REACT_APP_API_URL}/groups`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(groupBody)
            });
            const data = await response.json();
        if (data.data && data.data.group && data.data.group._id) {
                setShowGroupModal(false);
                setGroupName('');
                setSelectedUserIds([]);
                toast.success('Group chat created!');
                navigate(`/app/groups/${data.data.group._id}`);
            }
         else {
            throw new Error(data.message || 'Failed to create group');
            }
        } catch (err) {
            toast.error('Failed to create group chat.');
        } finally {
            setCreatingGroup(false);
        }
    }

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
        return participants[0];
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
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mb-4"
                        onClick={() => setShowGroupModal(true)}
                    >
                        + New Group Chat
                    </button>
                </div>

                {/* Group Creation Modal */}
                {showGroupModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                            <h2 className="text-xl font-bold mb-4">Create Group Chat</h2>
                            <form onSubmit={handleCreateGroup}>
                                <label className="block mb-2 font-medium">Group Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded mb-4 dark:bg-gray-700 dark:text-white"
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                    required
                                />
                                <label className="block mb-2 font-medium">Select Members</label>
                                <div className="max-h-40 overflow-y-auto mb-4">
                                    {matchedUsers.length === 0 && (
                                        <div className="text-gray-500 text-sm">No matches available.</div>
                                    )}
                                    {matchedUsers.map(user => (
                                        <label key={user._id} className="flex items-center mb-1">
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.includes(user._id)}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setSelectedUserIds(prev => [...prev, user._id]);
                                                    } else {
                                                        setSelectedUserIds(prev => prev.filter(id => id !== user._id));
                                                    }
                                                }}
                                                className="mr-2"
                                            />
                                            {user.name}
                                        </label>
                                    ))}
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        className="px-4 py-2 bg-gray-200 rounded"
                                        onClick={() => setShowGroupModal(false)}
                                        disabled={creatingGroup}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded"
                                        disabled={!groupName || selectedUserIds.length < 1 || creatingGroup}
                                    >
                                        {creatingGroup ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

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