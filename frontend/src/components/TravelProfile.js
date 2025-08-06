import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, updateProfile } from '../store/slices/userSlice';
import toast from 'react-hot-toast';
import {
    PencilIcon,
    SaveIcon,
    XIcon,
    PhotographIcon
} from '@heroicons/react/outline';

const TravelProfile = () => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        if (user && !editedProfile) {
            setEditedProfile({
                ...user,
                languages: user.languages || []
            });
        }
    }, [editedProfile, user]);

    const getProfilePicUrl = (profilePicture) => {
        if (!profilePicture) return `${process.env.REACT_APP_API_URL}/public/default-avatar.png`;
        if (profilePicture.startsWith('/uploads/')) {
            return `${process.env.REACT_APP_API_URL}/public${profilePicture}`;
        }
        return profilePicture;
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
            setEditedProfile({
                ...editedProfile,
                avatar: file
            });
        }
    };

    const handleSave = async () => {
        try {
            const formData = new FormData();
            
            if (editedProfile.avatar) {
                formData.append('profilePicture', editedProfile.avatar);
            }

            if (editedProfile.languages) {
                formData.append('languages', JSON.stringify(editedProfile.languages));
            }

            if (editedProfile.bio) {
                formData.append('bio', editedProfile.bio);
            }

            Object.keys(editedProfile).forEach(key => {
                if (key !== 'avatar' && key !== 'languages' && editedProfile[key]) {
                    if (typeof editedProfile[key] === 'object') {
                        formData.append(key, JSON.stringify(editedProfile[key]));
                    } else {
                        formData.append(key, editedProfile[key]);
                    }
                }
            });

            const saveButton = document.querySelector('#save-button');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<span class="animate-spin">⌛</span>';
            }

            const result = await dispatch(updateProfile(formData)).unwrap();
            
            if (result?.user) {
                toast.success('Profile updated successfully!');
            }

            setIsEditing(false);
            setEditedProfile(null);
            setPreviewImage(null);

        } catch (error) {
            console.error('Failed to update profile:', error);
            toast.error(error.message || 'Failed to update profile');
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Travel Profile
                    </h1>
                    <button
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        id="save-button"
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {isEditing ? (
                            <>
                                <SaveIcon className="w-5 h-5 mr-2" />
                                Save
                            </>
                        ) : (
                            <>
                                <PencilIcon className="w-5 h-5 mr-2" />
                                Edit
                            </>
                        )}
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                        <div className="relative">
                            <img
                                id="profile-preview"
                                src={previewImage || getProfilePicUrl(user.profilePicture)}
                                alt={user.name || 'Profile picture'}
                                className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover"
                                onError={(e) => {
                                    console.error('Failed to load profile picture, falling back to default');
                                    e.target.src = `${process.env.REACT_APP_API_URL}/public/default-avatar.png`;
                                }}
                            />
                            {isEditing && (
                                <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer">
                                    <PhotographIcon className="w-5 h-5 text-white" />
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="flex-grow space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                About Me
                            </h2>
                            {isEditing ? (
                                <textarea
                                    value={editedProfile?.bio || ''}
                                    onChange={(e) => setEditedProfile({
                                        ...editedProfile,
                                        bio: e.target.value
                                    })}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    rows="4"
                                />
                            ) : (
                                <p className="text-gray-600 dark:text-gray-300">
                                    {user.bio || 'No bio provided'}
                                </p>
                            )}
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Languages
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {(isEditing ? editedProfile?.languages : user?.languages || []).map((lang, index) => (
                                    <span
                                        key={index}
                                        className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                                    >
                                        {lang.language} - {lang.proficiency}
                                        {isEditing && (
                                            <button
                                                onClick={() => {
                                                    const updatedLanguages = [...editedProfile.languages];
                                                    updatedLanguages.splice(index, 1);
                                                    setEditedProfile({
                                                        ...editedProfile,
                                                        languages: updatedLanguages
                                                    });
                                                }}
                                                className="ml-2 text-blue-600 hover:text-blue-800"
                                            >
                                                <XIcon className="w-4 h-4 inline" />
                                            </button>
                                        )}
                                    </span>
                                ))}
                                {isEditing && (
                                    <button
                                        onClick={() => {
                                            const language = prompt('Enter language');
                                            const proficiency = prompt('Enter proficiency (Beginner/Intermediate/Advanced/Native)');
                                            if (language && proficiency) {
                                                setEditedProfile({
                                                    ...editedProfile,
                                                    languages: [
                                                        ...(editedProfile.languages || []),
                                                        { language, proficiency }
                                                    ]
                                                });
                                            }
                                        }}
                                        className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm hover:bg-blue-700 transition-colors"
                                    >
                                        + Add Language
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelProfile;