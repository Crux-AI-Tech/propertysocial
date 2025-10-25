import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from './store';
import { checkAuth } from './store/auth/authSlice';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { PropertySearchPage } from './pages/PropertySearchPage';
import { PropertyDetailsPage } from './pages/PropertyDetailsPage';
import { CreatePropertyPage } from './pages/property/CreatePropertyPage';
import { EditPropertyPage } from './pages/property/EditPropertyPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProfilePage } from './pages/dashboard/ProfilePage';
import { FavoritesPage } from './pages/dashboard/FavoritesPage';
import { SavedSearchesPage } from './pages/dashboard/SavedSearchesPage';
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  const { i18n } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  // Check authentication status on app load
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<PropertySearchPage />} />
        <Route path="properties/:id" element={<PropertyDetailsPage />} />
        
        {/* Auth routes - redirect if already authenticated */}
        <Route 
          path="login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
        />
        <Route 
          path="register" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
        />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        
        {/* Protected routes - require authentication */}
        <Route path="dashboard" element={<ProtectedRoute />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="saved-searches" element={<SavedSearchesPage />} />
        </Route>
        
        {/* Property management routes - require authentication */}
        <Route path="properties" element={<ProtectedRoute />}>
          <Route path="create" element={<CreatePropertyPage />} />
          <Route path=":id/edit" element={<EditPropertyPage />} />
        </Route>
        
        {/* 404 route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;