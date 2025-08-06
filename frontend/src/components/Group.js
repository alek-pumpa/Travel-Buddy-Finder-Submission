import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
// Fix the import paths
import { 
    fetchGroup, 
    joinGroup, 
    leaveGroup,
    selectCurrentGroup,
    selectGroupLoading,
    selectGroupError 
} from '../store/slices/groupSlice';
import { selectUser } from '../store/slices/userSlice';
import toast from 'react-hot-toast';

const Group = () => {
    const { groupId } = useParams();
    const dispatch = useDispatch();
    const currentUser = useSelector(selectUser);
    const group = useSelector(selectCurrentGroup);
    const isLoading = useSelector(selectGroupLoading);
    const error = useSelector(selectGroupError);
    const [isMember, setIsMember] = useState(false);

    useEffect(() => {
        if (groupId) {
            dispatch(fetchGroup(groupId))
                .unwrap()
                .catch(error => {
                    toast.error(error.message || 'Failed to load group');
                });
        }
    }, [groupId, dispatch]);

    useEffect(() => {
        if (group && currentUser) {
            setIsMember(group.members.some(member => member._id === currentUser._id));
        }
    }, [group, currentUser]);

    const handleJoinGroup = async () => {
        try {
            await dispatch(joinGroup(groupId)).unwrap();
            toast.success('Successfully joined the group!');
            setIsMember(true);
        } catch (error) {
            toast.error(error.message || 'Failed to join group');
        }
    };

    const handleLeaveGroup = async () => {
        try {
            await dispatch(leaveGroup(groupId)).unwrap();
            toast.success('Successfully left the group');
            setIsMember(false);
        } catch (error) {
            toast.error(error.message || 'Failed to leave group');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-4 text-red-600">
                {error}
            </div>
        );
    }

    if (!group) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {group.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                {group.description}
            </p>

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Members ({group.members.length})
                    </h2>
                </div>
                {currentUser && (
                    <button
                        onClick={isMember ? handleLeaveGroup : handleJoinGroup}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                            isMember 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {isMember ? 'Leave Group' : 'Join Group'}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {group.members.map(member => (
                    <div key={member._id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                        <img
                            src={`${process.env.REACT_APP_API_URL}/public${member.profilePicture}` || '/default-avatar.png'}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                                e.target.src = '/default-avatar.png';
                            }}
                        />
                        <span className="text-gray-900 dark:text-white">{member.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Group;