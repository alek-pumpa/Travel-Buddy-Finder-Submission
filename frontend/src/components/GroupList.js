import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline';

const GroupList = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_API_URL}/groups`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to fetch groups');
            
            const data = await response.json();
            setGroups(data.data.groups || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGroupClick = (groupId) => {
        navigate(`/app/groups/${groupId}`);
    };

    const formatLastMessage = (group) => {
        return `${group.members.length} members`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-600 dark:text-red-400">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Group Chats
                    </h1>
                    <button
                        onClick={() => navigate('/app/messages')}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>New Group</span>
                    </button>
                </div>

                {groups.length === 0 ? (
                    <div className="text-center py-12">
                        <UserGroupIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No group chats yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Create your first group chat to start collaborating with others.
                        </p>
                        <button
                            onClick={() => navigate('/app/messages')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors shadow-sm"
                        >
                            Create Group Chat
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:gap-4">
                        {groups.map((group) => (
                            <div
                                key={group._id}
                                onClick={() => handleGroupClick(group._id)}
                                className="flex items-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                            >
                                <div className="flex-shrink-0 mr-4">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                        <UserGroupIcon className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                                        {group.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {formatLastMessage(group)}
                                    </p>
                                    {group.travelDetails?.destination && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center">
                                            <span className="mr-1">📍</span>
                                            {group.travelDetails.destination}
                                        </p>
                                    )}
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                        {new Date(group.createdAt).toLocaleDateString()}
                                    </div>
                                    {group.travelDetails?.startDate && (
                                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                            Trip: {new Date(group.travelDetails.startDate).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupList;