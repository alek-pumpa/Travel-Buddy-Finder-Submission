import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const MessageThread = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [conversation, setConversation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [otherUser, setOtherUser] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchConversationDetails();
        fetchMessages();
    }, [conversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getCurrentUserId = () => {
        const userStr = localStorage.getItem('user');
        
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                return user._id || user.id;
            } catch (e) {
                console.error('Error parsing user from localStorage:', e);
            }
        }
        
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.userId || payload.id || payload.sub;
            } catch (e) {
                console.error('Error decoding token:', e);
            }
        }
        
        return null;
    };

    const fetchConversationDetails = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/messages/conversations`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const currentConversation = data.data?.find(conv => conv._id === conversationId);
                
                if (currentConversation) {
                    setConversation(currentConversation);
                    if (currentConversation.participants && currentConversation.participants.length > 0) {
                        setOtherUser(currentConversation.participants[0]);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching conversation details:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_API_URL}/messages/conversations/${conversationId}/messages`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Conversation not found or you do not have access');
                }
                throw new Error('Failed to load messages');
            }

            const data = await response.json();
            console.log('Fetched messages:', data.data);
            setMessages(data.data || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error(error.message || 'Failed to load messages');
            navigate('/app/messages');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        const messageContent = newMessage.trim();
        setNewMessage('');
        setSending(true);

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/messages/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    content: messageContent
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();
            console.log('Message sent:', data.data);
            
            setMessages(prev => [...prev, data.data]);
            
            toast.success('Message sent!');
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
            setNewMessage(messageContent);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) {
            return 'Today';
        } else if (diffInDays === 1) {
            return 'Yesterday';
        } else if (diffInDays < 7) {
            return date.toLocaleDateString([], { weekday: 'long' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const groupMessagesByDate = (messages) => {
        const groups = {};
        messages.forEach(message => {
            const date = new Date(message.createdAt).toDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(message);
        });
        return groups;
    };

    const messageGroups = groupMessagesByDate(messages);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/app/messages')}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            
                            {otherUser && (
                                <div className="flex items-center space-x-3">
                                    {/* Avatar */}
                                    {otherUser.profilePicture || otherUser.photo ? (
                                        <img
                                            src={
                                                otherUser.profilePicture?.startsWith('http') 
                                                    ? otherUser.profilePicture 
                                                    : `${process.env.REACT_APP_API_URL}/uploads/profiles/${otherUser.photo || otherUser.profilePicture}`
                                            }
                                            alt={otherUser.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div 
                                        className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center"
                                        style={{ display: (otherUser.profilePicture || otherUser.photo) ? 'none' : 'flex' }}
                                    >
                                        <span className="text-white font-semibold text-sm">
                                            {otherUser.name?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                    </div>
                                    
                                    <div>
                                        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                                            {otherUser.name || 'Unknown User'}
                                        </h1>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Travel Buddy
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {!otherUser && (
                                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Conversation
                                </h1>
                            )}
                        </div>

                        {/* Options menu */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => otherUser && navigate(`/app/profile/${otherUser._id}`)}
                                disabled={!otherUser}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                            >
                                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {messages.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">💬</div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Start the conversation
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Send the first message to {otherUser?.name || 'your travel buddy'}!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(messageGroups).map(([date, dateMessages]) => (
                                <div key={date}>
                                    {/* Date separator */}
                                    <div className="flex items-center justify-center mb-4">
                                        <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-xs font-medium">
                                            {formatDate(dateMessages[0].createdAt)}
                                        </div>
                                    </div>

                                    {/* Messages for this date */}
                                    <div className="space-y-3">
                                        {dateMessages.map((message) => {
                                            const currentUserId = getCurrentUserId();
                                            const isMyMessage = message.sender?._id === currentUserId;
                                            
                                            return (
                                                <motion.div
                                                    key={message._id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isMyMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                                        {/* Avatar for other user's messages */}
                                                        {!isMyMessage && (
                                                            <div className="flex-shrink-0">
                                                                {otherUser?.profilePicture || otherUser?.photo ? (
                                                                    <img
                                                                        src={
                                                                            otherUser.profilePicture?.startsWith('http') 
                                                                                ? otherUser.profilePicture 
                                                                                : `${process.env.REACT_APP_API_URL}/uploads/profiles/${otherUser.photo || otherUser.profilePicture}`
                                                                        }
                                                                        alt={otherUser.name}
                                                                        className="w-6 h-6 rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                                                        <span className="text-white text-xs font-semibold">
                                                                            {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Message bubble */}
                                                        <div
                                                            className={`px-4 py-2 rounded-2xl ${
                                                                isMyMessage
                                                                    ? 'bg-blue-600 text-white rounded-br-md'
                                                                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md shadow-sm border border-gray-200 dark:border-gray-600'
                                                            }`}
                                                        >
                                                            <p className="text-sm leading-relaxed">{message.content}</p>
                                                            <p className={`text-xs mt-1 ${isMyMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                                                {formatTime(message.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Message Input */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <form onSubmit={sendMessage} className="flex items-end space-x-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={`Message ${otherUser?.name || 'your travel buddy'}...`}
                                disabled={sending}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                                maxLength={2000}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
                                newMessage.trim() && !sending
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
                                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {sending ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )}
                        </button>
                    </form>
                    
                    {/* Character count */}
                    {newMessage.length > 1800 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                            {newMessage.length}/2000 characters
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageThread;