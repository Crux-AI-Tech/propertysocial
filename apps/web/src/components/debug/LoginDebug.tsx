import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, Paper } from '@mui/material';

const LoginDebug: React.FC = () => {
  const [email, setEmail] = useState('admin@eu-real-estate.com');
  const [password, setPassword] = useState('password123');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDirectAPI = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('http://localhost:7500/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      setResult({
        status: response.status,
        success: response.ok,
        data: data,
      });
    } catch (error: any) {
      setResult({
        error: error?.message || 'Unknown error',
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const testWithAxios = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const { authApi } = await import('../../services/api/authApi');
      const response = await authApi.login({ email, password });
      setResult({
        success: true,
        data: response.data,
        message: 'Axios request successful',
      });
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
        response: error.response?.data,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        Login Debug Tool
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <TextField
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
        />
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={testDirectAPI}
            disabled={loading}
          >
            Test Direct API
          </Button>
          <Button
            variant="outlined"
            onClick={testWithAxios}
            disabled={loading}
          >
            Test with Axios
          </Button>
        </Box>
      </Box>

      {result && (
        <Alert severity={result.success ? 'success' : 'error'}>
          <Typography variant="body2" component="pre">
            {JSON.stringify(result, null, 2)}
          </Typography>
        </Alert>
      )}
    </Paper>
  );
};

export default LoginDebug;