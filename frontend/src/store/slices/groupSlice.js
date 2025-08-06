import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchGroup = createAsyncThunk(
    'groups/fetchGroup',
    async (groupId, { rejectWithValue }) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/groups/${groupId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch group');
            }

            const data = await response.json();
            return data.group;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const joinGroup = createAsyncThunk(
    'groups/joinGroup',
    async (groupId, { rejectWithValue }) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/groups/${groupId}/join`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to join group');
            }

            const data = await response.json();
            return data.group;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const leaveGroup = createAsyncThunk(
    'groups/leaveGroup',
    async (groupId, { rejectWithValue }) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/groups/${groupId}/leave`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to leave group');
            }

            const data = await response.json();
            return data.group;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const groupSlice = createSlice({
    name: 'groups',
    initialState: {
        currentGroup: null,
        userGroups: [],
        loading: false,
        error: null
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        resetState: (state) => {
            state.currentGroup = null;
            state.error = null;
            state.loading = false;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch group cases
            .addCase(fetchGroup.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchGroup.fulfilled, (state, action) => {
                state.loading = false;
                state.currentGroup = action.payload;
            })
            .addCase(fetchGroup.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Join group cases
            .addCase(joinGroup.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(joinGroup.fulfilled, (state, action) => {
                state.loading = false;
                state.currentGroup = action.payload;
                if (!state.userGroups.find(g => g.id === action.payload.id)) {
                    state.userGroups.push(action.payload);
                }
            })
            .addCase(joinGroup.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Leave group cases
            .addCase(leaveGroup.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(leaveGroup.fulfilled, (state, action) => {
                state.loading = false;
                state.currentGroup = action.payload;
                state.userGroups = state.userGroups.filter(g => g.id !== action.payload.id);
            })
            .addCase(leaveGroup.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { clearError, resetState } = groupSlice.actions;
export const selectCurrentGroup = (state) => state.groups.currentGroup;
export const selectUserGroups = (state) => state.groups.userGroups;
export const selectGroupLoading = (state) => state.groups.loading;
export const selectGroupError = (state) => state.groups.error;

export default groupSlice.reducer;