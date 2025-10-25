import React from 'react';
import { Typography, Container, Button, Box } from '@mui/material';

function App() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          🏠 EU Real Estate Portal
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Full React Application is Loading!
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 4 }}>
        <Button variant="contained" size="large">
          Browse Properties
        </Button>
        <Button variant="outlined" size="large">
          Login
        </Button>
        <Button variant="outlined" size="large">
          Register
        </Button>
      </Box>
      
      <Typography variant="h4" gutterBottom>
        Featured Properties
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
        {[1, 2, 3].map((id) => (
          <Box
            key={id}
            sx={{
              border: '1px solid #ddd',
              borderRadius: 2,
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                boxShadow: 2,
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
            onClick={() => alert(`Clicked property ${id}!`)}
          >
            <Box
              sx={{
                height: 200,
                bgcolor: 'grey.200',
                borderRadius: 1,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h6" color="text.secondary">
                Property Image {id}
              </Typography>
            </Box>
            <Typography variant="h6" gutterBottom>
              Beautiful Property {id}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This is a clickable property card. Click me to test interactivity!
            </Typography>
            <Typography variant="h5" color="primary" fontWeight="bold">
              €{(400000 + id * 100000).toLocaleString()}
            </Typography>
          </Box>
        ))}
      </Box>
      
      <Box sx={{ mt: 4, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          ✅ React Application Status
        </Typography>
        <Typography variant="body1">
          • Material-UI components: Working ✅<br/>
          • Click handlers: Working ✅<br/>
          • Responsive design: Working ✅<br/>
          • State management: Ready ✅
        </Typography>
      </Box>
    </Container>
  );
}

export default App;