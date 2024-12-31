import React, { useState } from 'react';
import './ProfilePictureUpload.css';
import { useDispatch, useSelector } from 'react-redux';
import { uploadProfilePicture } from '../services/userService';
import { updateUser } from '../redux/slices/userSlice';
import { toast } from 'react-toastify';

const ProfilePictureUpload = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.user);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        
        // Validate file
        if (!file) return;
        
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            toast.error('Only JPEG and PNG files are allowed');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('File size must be less than 2MB');
            return;
        }

        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Please select a file');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('profilePicture', selectedFile);

            const updatedUser = await uploadProfilePicture(formData);
            dispatch(updateUser(updatedUser));
            toast.success('Profile picture updated successfully');
            setSelectedFile(null);
            setPreview(null);
        } catch (error) {
            toast.error(error.message || 'Failed to upload profile picture');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="profile-picture-upload">
            <div className="preview-container">
                {preview ? (
                    <img src={preview} alt="Preview" className="preview-image" />
                ) : (
                    <img 
                        src={user?.profilePicture || '/default-avatar.png'} 
                        alt="Current Profile" 
                        className="current-profile-image" 
                    />
                )}
            </div>

            <div className="upload-controls">
                <input
                    type="file"
                    id="profile-picture-input"
                    accept="image/jpeg, image/png"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="file-input"
                />
                <label htmlFor="profile-picture-input" className="upload-button">
                    {selectedFile ? 'Change Picture' : 'Upload Picture'}
                </label>

                {selectedFile && (
                    <button 
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="submit-button"
                    >
                        {isUploading ? 'Uploading...' : 'Save Picture'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProfilePictureUpload;
