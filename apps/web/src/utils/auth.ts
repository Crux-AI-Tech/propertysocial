// Token storage key
const TOKEN_KEY = 'eu_real_estate_token';

/**
 * Set authentication token in local storage
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Get authentication token from local storage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove authentication token from local storage
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

/**
 * Parse JWT token
 */
export const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const decodedToken = parseJwt(token);
  if (!decodedToken) return true;
  
  const currentTime = Date.now() / 1000;
  return decodedToken.exp < currentTime;
};

/**
 * Get user info from token
 */
export const getUserFromToken = (token: string): any => {
  const decodedToken = parseJwt(token);
  if (!decodedToken) return null;
  
  return {
    id: decodedToken.userId,
    email: decodedToken.email,
    role: decodedToken.role,
    isVerified: decodedToken.isVerified,
  };
};