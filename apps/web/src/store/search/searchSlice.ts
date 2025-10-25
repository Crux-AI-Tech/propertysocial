import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SearchState {
  query: string;
  filters: {
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    amenities?: string[];
  };
  suggestions: string[];
  recentSearches: string[];
  savedSearches: Array<{
    id: string;
    name: string;
    query: string;
    filters: any;
    createdAt: string;
  }>;
}

const initialState: SearchState = {
  query: '',
  filters: {},
  suggestions: [],
  recentSearches: [],
  savedSearches: [],
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    setFilters: (state, action: PayloadAction<any>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSuggestions: (state, action: PayloadAction<string[]>) => {
      state.suggestions = action.payload;
    },
    addRecentSearch: (state, action: PayloadAction<string>) => {
      const query = action.payload;
      state.recentSearches = [
        query,
        ...state.recentSearches.filter(s => s !== query)
      ].slice(0, 10); // Keep only last 10 searches
    },
    clearRecentSearches: (state) => {
      state.recentSearches = [];
    },
    addSavedSearch: (state, action: PayloadAction<{
      name: string;
      query: string;
      filters: any;
    }>) => {
      const savedSearch = {
        id: Date.now().toString(),
        ...action.payload,
        createdAt: new Date().toISOString(),
      };
      state.savedSearches.push(savedSearch);
    },
    removeSavedSearch: (state, action: PayloadAction<string>) => {
      state.savedSearches = state.savedSearches.filter(
        search => search.id !== action.payload
      );
    },
    clearSearch: (state) => {
      state.query = '';
      state.filters = {};
      state.suggestions = [];
    },
  },
});

export const {
  setQuery,
  setFilters,
  clearFilters,
  setSuggestions,
  addRecentSearch,
  clearRecentSearches,
  addSavedSearch,
  removeSavedSearch,
  clearSearch,
} = searchSlice.actions;

export default searchSlice.reducer;