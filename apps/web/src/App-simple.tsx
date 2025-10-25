import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Typography, Box, Card, CardContent, Grid, Button } from '@mui/material';

// Simple Home Page Component
const SimpleHomePage = () => {
  const [properties, setProperties] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('http://localhost:7500/api/properties')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProperties(data.data.properties);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching properties:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" align="center">Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          🏠 EU Real Estate Portal
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Your trusted partner for European real estate
        </Typography>
      </Box>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
        <Button variant="contained" color="primary">
          Browse Properties
        </Button>
        <Button variant="outlined" color="primary">
          Login
        </Button>
        <Button variant="outlined" color="primary">
          Register
        </Button>
      </Box>

      {/* Properties Grid */}
      <Typography variant="h4" gutterBottom>
        Featured Properties
      </Typography>
      <Grid container spacing={3}>
        {properties.map((property: any) => (
          <Grid item xs={12} md={4} key={property.id}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                },
                transition: 'all 0.3s ease'
              }}
            >
              <Box
                component="img"
                sx={{
                  height: 200,
                  width: '100%',
                  objectFit: 'cover',
                }}
                src={property.images[0]?.url}
                alt={property.title}
              />
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  {property.title}
                </Typography>
                <Typography variant="h5" color="primary" gutterBottom>
                  €{property.price.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  📍 {property.city}, {property.country}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  🛏️ {property.bedrooms} bed • 🚿 {property.bathrooms} bath • 📐 {property.floorArea}m²
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {property.description}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {property.tags.map((tagRel: any, index: number) => (
                    <Box
                      key={index}
                      component="span"
                      sx={{
                        display: 'inline-block',
                        backgroundColor: tagRel.tag.color,
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        mr: 1,
                        mb: 1,
                      }}
                    >
                      {tagRel.tag.name}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Footer */}
      <Box sx={{ mt: 6, py: 3, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          © 2025 EU Real Estate Portal. All rights reserved.
        </Typography>
      </Box>
    </Container>
  );
};

// Simple App Component
function App() {
  return (
    <Routes>
      <Route path="/" element={<SimpleHomePage />} />
      <Route path="*" element={
        <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h4">Page Not Found</Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            The page you're looking for doesn't exist.
          </Typography>
        </Container>
      } />
    </Routes>
  );
}

export default App;