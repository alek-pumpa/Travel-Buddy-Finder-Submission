import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Matches = () => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
    try {
        setLoading(true);
        console.log('Fetching matches...');
        
        // Use the correct endpoint that matches your backend routes
        const response = await fetch(`${process.env.REACT_APP_API_URL}/matches/my-matches`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        console.log('Matches response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Matches response data:', data);
        
        // Handle the response structure from your backend
        if (data.status === 'success') {
            setMatches(data.data || []);
        } else {
            throw new Error(data.message || 'Failed to fetch matches');
        }
        
    } catch (error) {
        console.error('Error fetching matches:', error);
        setError(error.message);
    } finally {
        setLoading(false);
    }
};

    // Add this function inside your Matches component (after the fetchMatches function):

const startConversation = async (otherUserId) => {
    try {
        console.log('Starting conversation with user:', otherUserId);
        
        // Check if conversation already exists
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
            const existingConversation = data.data?.find(conv => 
                conv.participants.some(p => p._id === otherUserId)
            );

            if (existingConversation) {
                // Navigate to existing conversation
                navigate(`/app/messages/${existingConversation._id}`);
                return;
            }
        }

        const createResponse = await fetch(`${process.env.REACT_APP_API_URL}/messages/conversations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                participantId: otherUserId,
                initialMessage: 'Hi! I saw we matched. Would you like to plan a trip together?'
            })
        });

        if (createResponse.ok) {
            const newConversation = await createResponse.json();
            navigate(`/app/messages/${newConversation.data._id}`);
        } else {
            throw new Error('Failed to create conversation');
        }

    } catch (error) {
        console.error('Error starting conversation:', error);
        toast.error('Failed to start conversation. Please try again.');
    }
};

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Your Matches
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Connect with fellow travelers who share your interests
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/50 border border-red-400 text-red-800 dark:text-red-300 rounded p-4 mb-6">
                        {error}
                    </div>
                )}

        {matches.length === 0 ? (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">💔</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                 No matches yet
                </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
            Keep swiping to find your perfect travel buddy!
        </p>
        <Link
            to="/app/swipe"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
            Start Swiping
        </Link>
    </div>
) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((match, index) => (
            <motion.div
                key={match._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
                <div className="relative">
                    {match.otherUser?.profilePicture ? (
                        <img
                            src={match.otherUser.profilePicture.startsWith('http') 
                                ? match.otherUser.profilePicture 
                                : `${process.env.REACT_APP_API_URL}${match.otherUser.profilePicture.startsWith('/') ? '' : '/'}${match.otherUser.profilePicture}`
                            }
                            alt={match.otherUser.name}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    <div 
                        className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center" 
                        style={{display: match.otherUser?.profilePicture ? 'none' : 'flex'}}
                    >
                        <span className="text-4xl text-white">
                            {match.otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    </div>
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                        Match! 🎉
                    </div>
                    {match.matchScore && (
                        <div className="absolute top-4 left-4 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                            {match.matchScore}% Match
                        </div>
                    )}
                </div>

                <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {match.otherUser?.name || 'Unknown User'}
                        {match.otherUser?.age && `, ${match.otherUser.age}`}
                    </h3>
                    
                    {match.otherUser?.bio && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                            {match.otherUser.bio}
                        </p>
                    )}

                    {match.otherUser?.travelPreferences?.destinations && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Dream Destinations:
                            </h4>
                            <div className="flex flex-wrap gap-1">
                                {match.otherUser.travelPreferences.destinations.slice(0, 3).map((destination, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                                    >
                                        {destination}
                                    </span>
                                ))}
                                {match.otherUser.travelPreferences.destinations.length > 3 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        +{match.otherUser.travelPreferences.destinations.length - 3} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Matched on {new Date(match.matchedOn).toLocaleDateString()}
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={() => startConversation(match.otherUser._id)}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            Send Message
                        </button>
                        <Link
                            to={`/app/profile/${match.otherUser._id}`}
                            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-center"
                        >
                            View Profile
                        </Link>
                    </div>
                </div>
            </motion.div>
        ))}
    </div>
)}
            </div>
        </div>
    );
};

export default Matches;