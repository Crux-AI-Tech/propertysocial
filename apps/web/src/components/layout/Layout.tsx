import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';

import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';

export const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const collapsedWidth = 72;
  const expandedWidth = 280;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header toggleSidebar={toggleSidebar} />
      
      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Desktop sidebar - always visible, collapsible */}
        {!isMobile && (
          <Sidebar 
            open={true} 
            variant="permanent" 
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
          />
        )}
        
        {/* Mobile sidebar - temporary drawer */}
        {isMobile && (
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
            transition: 'margin-left 0.3s ease',
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