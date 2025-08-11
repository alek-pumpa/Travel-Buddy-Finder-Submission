import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { setUser } from './authSlice';

export const updateProfile = createAsyncThunk(
    'user/updateProfile',
    async (formData, { dispatch, rejectWithValue }) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/users/profile`, {
                method: 'PUT',
                credentials: 'include',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update profile');
            }

            const data = await response.json();
            dispatch(setUser(data.user));
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState: {
        loading: false,
        error: null,
        profileUpdateSuccess: false,
        settings: {}
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        resetProfileUpdate: (state) => {
            state.profileUpdateSuccess = false;
        },
        setSettings: (state, action) => {
            state.settings = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(updateProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.profileUpdateSuccess = false;
            })
            .addCase(updateProfile.fulfilled, (state) => {
                state.loading = false;
                state.profileUpdateSuccess = true;
            })
            .addCase(updateProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.profileUpdateSuccess = false;
            });
    }
});

export const { 
    clearError, 
    resetProfileUpdate,
    setSettings
} = userSlice.actions;

export const selectLoading = (state) => state.user.loading;
export const selectError = (state) => state.user.error;
export const selectProfileUpdateSuccess = (state) => state.user.profileUpdateSuccess;
export const selectSettings = (state) => state.user.settings;

export default userSlice.reducer;