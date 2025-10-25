import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';

import { RootState } from '@/store';
import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';

export const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header toggleSidebar={toggleSidebar} />
      
      <Box sx={{ display: 'flex', flex: 1 }}>
        {isAuthenticated && !isMobile && (
          <Sidebar open={true} variant="permanent" />
        )}
        
        {isAuthenticated && isMobile && (
          <Sidebar 
            open={sidebarOpen} 
            variant="temporary"
            onClose={() => setSidebarOpen(false)}
          />
        )}
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: '100%',
            bgcolor: 'background.default',
            p: { xs: 2, sm: 3 },
            pt: { xs: 2, sm: 3 },
            pb: { xs: 8, sm: 6 },
          }}
        >
          <Container maxWidth="xl">
            <Outlet />
          </Container>
        </Box>
      </Box>
      
      <Footer />
    </Box>
  );
};

export default Layout;