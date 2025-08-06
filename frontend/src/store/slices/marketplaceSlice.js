import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchListings = createAsyncThunk(
    'marketplace/fetchListings',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/listings`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch listings');
            }

            const data = await response.json();
            return data.listings;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const createListing = createAsyncThunk(
    'marketplace/createListing',
    async (listingData, { rejectWithValue }) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/listings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(listingData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create listing');
            }

            const data = await response.json();
            return data.listing;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const marketplaceSlice = createSlice({
    name: 'marketplace',
    initialState: {
        listings: [],
        loading: false,
        error: null,
        filters: {
            category: 'All Items',
            sortBy: 'newest'
        }
    },
    reducers: {
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchListings.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchListings.fulfilled, (state, action) => {
                state.loading = false;
                state.listings = action.payload;
            })
            .addCase(fetchListings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(createListing.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createListing.fulfilled, (state, action) => {
                state.loading = false;
                state.listings.unshift(action.payload);
            })
            .addCase(createListing.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { setFilters } = marketplaceSlice.actions;
export const selectListings = (state) => state.marketplace.listings;
export const selectMarketplaceLoading = (state) => state.marketplace.loading;
export const selectMarketplaceError = (state) => state.marketplace.error;
export const selectMarketplaceFilters = (state) => state.marketplace.filters;

export default marketplaceSlice.reducer;