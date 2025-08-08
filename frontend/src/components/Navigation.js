import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { logout, selectUser } from '../store/slices/authSlice';

const Navigation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(selectUser);

    useEffect(() => {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        setIsDarkMode(darkMode);
        if (darkMode) {
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        const newDarkMode = !isDarkMode;
        setIsDarkMode(newDarkMode);
        localStorage.setItem('darkMode', newDarkMode.toString());
        
        if (newDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleLogout = async () => {
        try {
            await fetch(`${process.env.REACT_APP_API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            dispatch(logout());
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            dispatch(logout()); 
            navigate('/login');
        }
    };

    const navItems = [
        { name: 'Swipe', path: '/app/swipe', icon: '💖' },
        { name: 'Matches', path: '/app/matches', icon: '👥' },
        { name: 'Chat', path: '/app/messages', icon: '💬' },
        { name: 'Groups', path: '/app/groups', icon: '🌍' },
        { name: 'Marketplace', path: '/app/marketplace', icon: '🛒' },
        { name: 'Journal', path: '/app/journal', icon: '📓' },
        { name: 'Profile', path: '/app/profile', icon: '👤' }
    ];

    return (
        <nav className="bg-white dark:bg-gray-800 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/app/swipe" className="flex items-center">
                            <span className="text-2xl">🌍</span>
                            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                                Travel Buddy
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    location.pathname === item.path
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                        : 'text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400'
                                }`}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.name}
                            </Link>
                        ))}
                        
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                        >
                            {isDarkMode ? '☀️' : '🌙'}
                        </button>

                        <div className="flex items-center space-x-4">
                            {user?.profilePicture && (
                                <img
                                    src={`${process.env.REACT_APP_API_URL}/public${user.profilePicture}`}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={(e) => {
                                        e.target.src = '/default-avatar.jpg';
                                    }}
                                />
                            )}
                            <span className="text-gray-700 dark:text-gray-300">
                                {user?.name || 'User'}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
                    >
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                                        location.pathname === item.path
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                            : 'text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400'
                                    }`}
                                >
                                    <span className="mr-3">{item.icon}</span>
                                    {item.name}
                                </Link>
                            ))}
                            
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <div className="flex items-center px-3 py-2">
                                    {user?.profilePicture && (
                                        <img
                                            src={`${process.env.REACT_APP_API_URL}/public${user.profilePicture}`}
                                            alt={user.name}
                                            className="w-10 h-10 rounded-full object-cover mr-3"
                                            onError={(e) => {
                                                e.target.src = '/default-avatar.jpg';
                                            }}
                                        />
                                    )}
                                    <span className="text-gray-700 dark:text-gray-300">
                                        {user?.name || 'User'}
                                    </span>
                                </div>
                                
                                <button
                                    onClick={toggleDarkMode}
                                    className="w-full text-left flex items-center px-3 py-2 text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                                >
                                    <span className="mr-3">{isDarkMode ? '☀️' : '🌙'}</span>
                                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                                </button>
                                
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left flex items-center px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                >
                                    <span className="mr-3">🚪</span>
                                    Logout
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navigation;