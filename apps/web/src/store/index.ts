import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import propertyReducer from './property/propertySlice';
import searchReducer from './search/searchSlice';
import uiReducer from './ui/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    property: propertyReducer,
    search: searchReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/loginSuccess', 'auth/registerSuccess'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.user', 'payload.error'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.user'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;