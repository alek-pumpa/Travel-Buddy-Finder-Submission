import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import SwipeCard from './SwipeCard';
import { analytics } from '../services/analytics';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const PULL_TO_REFRESH_THRESHOLD = 100;

const SwipeToMatch = () => {
    const [potentialMatches, setPotentialMatches] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [matchQueue, setMatchQueue] = useState([]);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [matchedUser, setMatchedUser] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [lastSwipeTimestamp, setLastSwipeTimestamp] = useState(0);

    const containerRef = useRef(null);
    const abortControllerRef = useRef(null);
    const activeAnimationsRef = useRef(new Set());
    const pullStartRef = useRef(0);

    const fetchPotentialMatches = useCallback(async (retry = 0) => {
        if (retry >= MAX_RETRIES) {
            throw new Error('Failed to fetch matches after multiple attempts');
        }

        try {
            console.log('🚀 Starting fetch potential matches...');
            
            const response = await fetch(`${process.env.REACT_APP_API_URL}/matches/potential`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                throw new Error(`Failed to fetch matches: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Response data:', data);
            
            // Your backend returns data in 'data' field
            const matches = data.data || [];

            if (!Array.isArray(matches)) {
                console.warn('⚠️ Invalid matches data:', matches);
                return [];
            }

            const validMatches = matches.filter(match => 
                match && 
                typeof match === 'object' && 
                match._id
            );

            console.log(`✅ Fetched ${validMatches.length} valid matches`);
            return validMatches;

        } catch (error) {
            console.error('❌ Fetch error:', error);
            
            if (retry < MAX_RETRIES - 1) {
                const delay = RETRY_DELAY * Math.pow(2, retry);
                console.log(`🔄 Retrying in ${delay}ms... (attempt ${retry + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchPotentialMatches(retry + 1);
            }
            
            throw error;
        }
    }, []);

    const handleSwipe = useCallback(async (direction, userId) => {
        const potentialMatch = potentialMatches[currentIndex];
        if (!potentialMatch || potentialMatch._id !== userId) return;

        const swipeTimestamp = Date.now();

        try {
            console.log(`Attempting to swipe ${direction} on user:`, userId);

            // ✅ FIXED: Use correct field name that matches backend
            const response = await fetch(`${process.env.REACT_APP_API_URL}/matches/swipe`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    swipedUserId: userId, // ✅ Changed from 'swipedId' to 'swipedUserId'
                    action: direction === 'right' ? 'like' : 'reject'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Swipe failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('Swipe result:', result);

            // ✅ Handle the response according to your backend structure
            if (result.status === 'success') {
                if (result.data.match) { // ✅ Changed from 'isMutualMatch' to 'match'
                    const matchData = result.data.otherUser || potentialMatch; // ✅ Use 'otherUser' field
                    setMatchedUser(matchData);
                    setShowMatchModal(true);
                    toast.success('It\'s a match! 🎉');
                } else if (direction === 'right') {
                    toast.success('Like sent! 💙');
                } else {
                    toast('Passed 👋', { icon: '👋' });
                }
            }

            // Track analytics
            analytics.track('Swipe Action', {
                direction,
                userId,
                matchScore: potentialMatch.matchScore,
                swipeSpeed: swipeTimestamp - lastSwipeTimestamp
            });

            // Move to next card
            setCurrentIndex(prev => prev + 1);
            setLastSwipeTimestamp(swipeTimestamp);

        } catch (error) {
            console.error('Swipe error:', error);
            toast.error(`Failed to ${direction === 'right' ? 'like' : 'pass'}. ${error.message}`);
            // Don't increment index on error so user can try again
        }
    }, [currentIndex, potentialMatches, lastSwipeTimestamp]);

    const handlePullToRefresh = useCallback(async (event) => {
        const touch = event.touches[0];
        if (!pullStartRef.current) {
            pullStartRef.current = touch.clientY;
            return;
        }

        const pullDistance = touch.clientY - pullStartRef.current;
        if (pullDistance > PULL_TO_REFRESH_THRESHOLD && !refreshing) {
            setRefreshing(true);
            try {
                const newMatches = await fetchPotentialMatches();
                setPotentialMatches(newMatches);
                setCurrentIndex(0);
            } finally {
                setRefreshing(false);
                pullStartRef.current = 0;
            }
        }
    }, [fetchPotentialMatches, refreshing]);

    useEffect(() => {
        console.log('🎬 SwipeToMatch useEffect starting...');
        let timeoutId;
        let isMounted = true;

        const loadInitialMatches = async () => {
            console.log('📋 Loading initial matches...');
            
            // Set timeout BEFORE starting the fetch
            timeoutId = setTimeout(() => {
                if (isMounted) {
                    console.log('⏰ Timeout reached, forcing loading to false');
                    setIsLoading(false);
                    setError('Request timed out. Please check your connection and try again.');
                }
            }, 10000); // 10 second timeout

            try {
                const matches = await fetchPotentialMatches();
                
                if (isMounted) {
                    console.log('✅ Setting matches:', matches.length);
                    clearTimeout(timeoutId);
                    setPotentialMatches(matches);
                    setIsLoading(false);
                    
                    if (matches.length === 0) {
                        toast('No potential matches available', { 
                            icon: 'ℹ️',
                            duration: 3000 
                        });
                    }
                }
            } catch (error) {
                if (isMounted) {
                    console.error('❌ Failed to load matches:', error);
                    clearTimeout(timeoutId);
                    setError(error.message);
                    setIsLoading(false);
                    toast.error('Failed to load matches. Please try again.');
                }
            }
        };

        loadInitialMatches();

        return () => {
            console.log('🧹 Cleanup: component unmounting');
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading potential matches...</p>
                    <p className="text-sm text-gray-400 mt-2">This may take a moment...</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="swipe-container min-h-screen bg-gray-50 dark:bg-gray-900 p-4"
            onTouchMove={handlePullToRefresh}
            onTouchEnd={() => pullStartRef.current = 0}
        >
            {refreshing && (
                <div className="refresh-indicator fixed top-4 left-1/2 transform -translate-x-1/2">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}

            {showMatchModal && matchedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h2 className="text-2xl font-bold text-center mb-4">It's a Match! 🎉</h2>
                        <div className="flex justify-center mb-4">
                            <img 
                                src={matchedUser.profilePicture || '/default-avatar.jpg'} 
                                alt={matchedUser.name}
                                className="w-20 h-20 rounded-full object-cover"
                            />
                        </div>
                        <p className="text-center mb-6">
                            You and {matchedUser.name} have liked each other!
                        </p>
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={() => setShowMatchModal(false)}
                                className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            >
                                Keep Swiping
                            </button>
                            <button
                                onClick={() => {
                                    setShowMatchModal(false);
                                    // Add navigation to chat here if needed
                                    console.log('Navigate to chat with:', matchedUser._id);
                                }}
                                className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                            >
                                Send Message
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="cards-container relative max-w-sm mx-auto pb-20">
                {currentIndex < potentialMatches.length && potentialMatches.slice(currentIndex, currentIndex + 3).map((user, index) => (
                    <SwipeCard
                        key={user._id}
                        user={user}
                        isTop={index === 0}
                        onSwipe={handleSwipe}
                        style={{
                            zIndex: potentialMatches.length - index,
                            scale: 1 - index * 0.05,
                            y: index * 10,
                            position: index === 0 ? 'relative' : 'absolute',
                            top: index === 0 ? 0 : 0
                        }}
                    />
                ))}
            </div>

            {(currentIndex >= potentialMatches.length || potentialMatches.length === 0) && !isLoading && (
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="text-6xl mb-4">💔</div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">No more potential matches</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                        Check back later for new people to meet!
                    </p>
                    <button 
                        onClick={() => {
                            setIsLoading(true);
                            setError(null);
                            setCurrentIndex(0);
                            // Trigger a fresh load
                            const loadMatches = async () => {
                                try {
                                    const matches = await fetchPotentialMatches();
                                    setPotentialMatches(matches);
                                    setIsLoading(false);
                                } catch (error) {
                                    setError(error.message);
                                    setIsLoading(false);
                                }
                            };
                            loadMatches();
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            )}

            {error && (
                <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-sm">{error}</span>
                        <button 
                            onClick={() => setError(null)}
                            className="ml-2 text-red-700 hover:text-red-900"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SwipeToMatch;