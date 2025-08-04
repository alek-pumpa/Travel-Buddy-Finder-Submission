import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import SwipeCard from './SwipeCard';
import socketService from '../services/socketService';
import { analytics } from '../services/analytics';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const PULL_TO_REFRESH_THRESHOLD = 100;

const SwipeToMatch = () => {
    const [potentialMatches, setPotentialMatches] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
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
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();

            const response = await fetch(`${process.env.REACT_APP_API_URL}/matches/potential`, {
                signal: abortControllerRef.current.signal,
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('No matches found');
                    return [];
                }
                throw new Error(`Server responded with status ${response.status}`);
            }

            const data = await response.json();
            
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response format: expected an object');
            }

            if (!Array.isArray(data.matches)) {
                console.warn('No matches array in response:', data);
                return [];
            }

            const validMatches = data.matches.filter(match => {
                return match && 
                       typeof match === 'object' && 
                       match._id && 
                       typeof match._id === 'string';
            });

            console.log(`Fetched ${validMatches.length} valid matches`);
            return validMatches;

        } catch (error) {
            console.error('Fetch error:', error);
            if (error.name === 'AbortError') return [];
            
            const delay = RETRY_DELAY * Math.pow(2, retry);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchPotentialMatches(retry + 1);
        }
    }, []);

    const processMatchQueue = useCallback(async () => {
    if (matchQueue.length === 0) return;

    const currentMatch = matchQueue[0];
    try {
        const result = await currentMatch.promise;
        if (result && result.isMatch) {
            setMatchedUser(result.match);
            setShowMatchModal(true);
            // Remove the processed match from queue
            setMatchQueue(prev => prev.slice(1));
        }
    } catch (error) {
        console.error('Match processing error:', error);
        toast.error('Failed to process match. Please try again.');
        // Remove failed match from queue
        setMatchQueue(prev => prev.slice(1));
    }
    }, [matchQueue]);

    const handleSwipe = useCallback(async (direction, userId) => {
        const potentialMatch = potentialMatches[currentIndex];
        if (!potentialMatch || potentialMatch._id !== userId) return;

        const swipeTimestamp = Date.now();
        const animationId = `${userId}-${direction}-${swipeTimestamp}`;
        activeAnimationsRef.current.add(animationId);

        try {
            setIsLoading(true);

            if (!socketService.connected) {
                throw new Error('Socket not connected. Please refresh the page.');
            }

            analytics.track('Swipe Action', {
                direction,
                userId,
                matchScore: potentialMatch.matchScore,
                swipeSpeed: swipeTimestamp - lastSwipeTimestamp
            });

            if (direction === 'right') {
                const swipePromise = new Promise(async (resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error('Swipe request timed out'));
                    }, 30000);

                    try {
                        const result = await socketService.swipe(userId, direction);
                        clearTimeout(timeoutId);
                        resolve(result);
                    } catch (error) {
                        clearTimeout(timeoutId);
                        reject(error);
                    }
                });

                setMatchQueue(prev => [...prev, {
                    user: potentialMatch,
                    promise: swipePromise,
                    timestamp: swipeTimestamp
                }]);
            }

            setCurrentIndex(prev => prev + 1);
            setLastSwipeTimestamp(swipeTimestamp);

            if (direction === 'right') {
                await processMatchQueue();
            }

        } catch (error) {
            console.error('Swipe error:', error);
            setCurrentIndex(prev => Math.max(prev - 1, 0));
            toast.error(error.message || 'Failed to process swipe. Please try again.');
        } finally {
            setIsLoading(false);
            activeAnimationsRef.current.delete(animationId);
            
            const cardElement = document.querySelector(`[data-user-id="${userId}"]`);
            if (cardElement) {
                cardElement.style.transition = 'none';
                cardElement.getAnimations().forEach(animation => animation.cancel());
            }
        }
    }, [potentialMatches, currentIndex, lastSwipeTimestamp, processMatchQueue]);

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
        const loadInitialMatches = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const matches = await fetchPotentialMatches();
                if (matches.length === 0) {
                    toast.info('No potential matches available at the moment');
                }
                setPotentialMatches(matches);
            } catch (error) {
                console.error('Failed to load matches:', error);
                setError(error.message);
                toast.error('Failed to load matches. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialMatches();

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [fetchPotentialMatches]);

    if (isLoading && potentialMatches.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="swipe-container"
            onTouchMove={handlePullToRefresh}
            onTouchEnd={() => pullStartRef.current = 0}
        >
            {refreshing && (
                <div className="refresh-indicator">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}

            {showMatchModal && matchedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                    <h2 className="text-2xl font-bold text-center mb-4">It's a Match! 🎉</h2>
                    <p className="text-center mb-6">
                        You and {matchedUser.name} have liked each other!
                    </p>
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={() => setShowMatchModal(false)}
                            className="px-6 py-2 bg-gray-200 rounded-full"
                        >
                            Keep Swiping
                        </button>
                        <button
                            onClick={() => {
                                setShowMatchModal(false);
                                // Add navigation to chat here if needed
                            }}
                            className="px-6 py-2 bg-blue-500 text-white rounded-full"
                        >
                            Send Message
                        </button>
                    </div>
                </div>
            </div>
        )}

            <div className="cards-container">
                {potentialMatches.slice(currentIndex, currentIndex + 3).map((user, index) => (
                    <SwipeCard
                        key={user._id}
                        user={user}
                        isTop={index === 0}
                        onSwipe={handleSwipe}
                        style={{
                            zIndex: potentialMatches.length - index,
                            scale: 1 - index * 0.05,
                            y: index * 10
                        }}
                    />
                ))}
            </div>

            {potentialMatches.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-64">
                    <h2 className="text-xl font-semibold mb-4">No more potential matches</h2>
                    <button 
                        onClick={() => fetchPotentialMatches()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            )}

            {error && (
                <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {error && (
            <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        )}
        
        </div>
    );
};

export default SwipeToMatch;