import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: null,
    loading: false,
    error: null
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
            state.loading = false;
            state.error = null;
        },
        updateUser: (state, action) => {
            state.user = { ...state.user, ...action.payload };
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
        clearUser: (state) => {
            state.user = null;
            state.loading = false;
            state.error = null;
        },
        login: (state, action) => {
            state.user = action.payload;
            state.loading = false;
            state.error = null;
        },
        logout: (state) => {
            state.user = null;
            state.loading = false;
            state.error = null;
        },
        updateUserProfile: (state, action) => {
            state.user = { ...state.user, ...action.payload };
        }
    }
});

export const { 
    setUser, 
    updateUser, 
    setLoading, 
    setError, 
    clearUser,
    login,
    logout,
    updateUserProfile 
} = userSlice.actions;

export default userSlice.reducer;
