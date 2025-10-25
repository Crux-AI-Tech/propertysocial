import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  propertyType: string;
  city: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  floorArea: number;
  images: Array<{
    id: string;
    url: string;
    altText: string;
    isMain: boolean;
  }>;
  owner: {
    firstName: string;
    lastName: string;
    email: string;
  };
  tags: Array<{
    tag: {
      name: string;
      color: string;
    };
  }>;
}

interface PropertyState {
  properties: Property[];
  selectedProperty: Property | null;
  loading: boolean;
  error: string | null;
  filters: {
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string;
    bedrooms?: number;
  };
}

const initialState: PropertyState = {
  properties: [],
  selectedProperty: null,
  loading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchProperties = createAsyncThunk(
  'property/fetchProperties',
  async (filters?: any) => {
    const response = await fetch('http://localhost:7500/api/properties');
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch properties');
    }
    return data.data.properties;
  }
);

export const fetchPropertyById = createAsyncThunk(
  'property/fetchPropertyById',
  async (id: string) => {
    const response = await fetch(`http://localhost:7500/api/properties/${id}`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch property');
    }
    return data.data.property;
  }
);

const propertySlice = createSlice({
  name: 'property',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<any>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSelectedProperty: (state, action: PayloadAction<Property | null>) => {
      state.selectedProperty = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch properties
      .addCase(fetchProperties.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.loading = false;
        state.properties = action.payload;
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch properties';
      })
      // Fetch property by ID
      .addCase(fetchPropertyById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPropertyById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProperty = action.payload;
      })
      .addCase(fetchPropertyById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch property';
      });
  },
});

export const { setFilters, clearFilters, setSelectedProperty, clearError } = propertySlice.actions;
export default propertySlice.reducer;