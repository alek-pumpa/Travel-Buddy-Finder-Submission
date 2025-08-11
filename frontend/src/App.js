import React, { useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import store from './store/store';
import { selectIsAuthenticated, setUser } from './store/slices/authSlice'; 
import { removeMatchNotification } from './store/slices/notificationsSlice';
import {  selectLoading } from './store/slices/userSlice';
import { loginSuccess } from './store/slices/authSlice';

// Pages
import HomePage from './pages/HomePage';
import MarketplacePage from './pages/MarketplacePage';
import EventsPage from './pages/EventsPage';
import ForumPage from './pages/ForumPage';
import ItineraryPage from './pages/ItineraryPage';
import UserDashboard from './pages/UserDashboard';
import UserProfilePage from './pages/UserProfile';

// Components
import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import PersonalityQuiz from './components/PersonalityQuiz';
import SwipeToMatch from './components/SwipeToMatch';
import TravelProfile from './components/TravelProfile';
import TravelJournal from './components/TravelJournal';
import GroupChat from './components/GroupChat';
import MatchNotification from './components/MatchNotification';
import Matches from './components/Matches';
import ViewUserProfile from './components/UserProfile';
import Messages from './components/Messages';
import MessageThread from './components/MessageThread';


const ProtectedRoute = ({ children }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const loading = useSelector(selectLoading);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

const PublicRoute = ({ children }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    
    if (isAuthenticated) {
        return <Navigate to="/app/swipe" replace />;
    }
    
    return children;
};

const NotificationHandler = () => {
    const matchNotifications = useSelector(state => state.notifications.matchNotifications);
    
    return (
        <>
            {matchNotifications.map((notification) => (
                <MatchNotification
                    key={notification.matchId}
                    match={notification}
                    onClose={() => {
                        store.dispatch(removeMatchNotification(notification.matchId));
                    }}
                />
            ))}
        </>
    );
};

const AuthPersistence = ({ children }) => {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user && !isAuthenticated) {
            try {
                const parsedUser = JSON.parse(user);
                console.log('Restoring auth state for user:', parsedUser.email);
                
                dispatch(loginSuccess({
                    user: parsedUser,
                    token: token
                }));

                fetch(`${process.env.REACT_APP_API_URL}/auth/check-auth`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Token verification failed');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.status === 'success' && data.data.user) {
                        dispatch(loginSuccess({
                            user: data.data.user,
                            token: token
                        }));
                        localStorage.setItem('user', JSON.stringify(data.data.user));
                    } else {
                        throw new Error('Invalid response from server');
                    }
                })
                .catch(error => {
                    console.error('Token verification failed:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    dispatch(setUser(null));
                });
            } catch (error) {
                console.error('Error restoring auth state:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                dispatch(setUser(null));
            }
        }
    }, [dispatch, isAuthenticated]);

    return children;
};

const AppContent = () => {
    useEffect(() => {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            if (e.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return (
        <AuthPersistence>
            <Router>
                <div className="App">
                    <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<HomePage />} />
                        <Route 
                            path="/login" 
                            element={
                                <PublicRoute>
                                    <Login />
                                </PublicRoute>
                            } 
                        />
                        <Route 
                            path="/signup" 
                            element={
                                <PublicRoute>
                                    <Signup />
                                </PublicRoute>
                            } 
                        />
                        
                        {/* Protected routes */}
                        <Route
                            path="/app"
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Navigate to="swipe" replace />} />
                            <Route path="swipe" element={<SwipeToMatch />} />
                            <Route path="matches" element={<Matches />} />
                            <Route path="chat" element={<Navigate to="/app/messages" replace />} />
                            <Route path="groups" element={<GroupChat />} />
                            <Route path="marketplace" element={<MarketplacePage />} />
                            <Route path="events" element={<EventsPage />} />
                            <Route path="forum" element={<ForumPage />} />
                            <Route path="profile" element={<TravelProfile />} />
                            <Route path="quiz" element={<PersonalityQuiz />} />
                            <Route path="journal" element={<TravelJournal />} />
                            <Route path="itinerary" element={<ItineraryPage />} />
                            <Route path="dashboard" element={<UserDashboard />} />
                            <Route path="user-profile" element={<UserProfilePage />} />
                            <Route path="profile/:userId" element={<ViewUserProfile />} />
                            <Route path="messages" element={<Messages />} />
                            <Route path="messages/:conversationId" element={<MessageThread />} />
                        </Route>
                        
                        {/* 404 page */}
                        <Route
                            path="*"
                            element={
                                <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4">
                                    <div className="text-center">
                                        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
                                            404
                                        </h1>
                                        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
                                            Page Not Found
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                                            Sorry, we couldn't find the page you're looking for.
                                        </p>
                                        <a
                                            href="/"
                                            className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                                        >
                                            Go Back Home
                                        </a>
                                    </div>
                                </div>
                            }
                        />
                    </Routes>
                    <NotificationHandler />
                    <Toaster 
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: '#363636',
                                color: '#fff',
                            },
                        }}
                    />
                </div>
            </Router>
        </AuthPersistence>
    );
};

const App = () => {
    return (
        <Provider store={store}>
            <AppContent />
        </Provider>
    );
};

export default App;