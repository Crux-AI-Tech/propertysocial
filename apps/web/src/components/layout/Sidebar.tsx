import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  Home as HomeIcon,
  Search as SearchIcon,
  Login as LoginIcon,
  PersonAdd as RegisterIcon,
  TrendingUp as TrendingIcon,
  BarChart as DataIcon,
  Public as CountriesIcon,
  Gavel as LegalIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  LocationCity as AgentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Policy as PolicyIcon,
  Cookie as CookieIcon,
  Shield as GDPRIcon,
  Article as TermsIcon,
} from '@mui/icons-material';

import { RootState } from '../../store';

// Constants for top countries
const TOP_COUNTRIES_RENT = ['Germany', 'France', 'Spain', 'Netherlands', 'Italy'];
const TOP_COUNTRIES_SALE = ['Portugal', 'Greece', 'Poland', 'Czech Republic', 'Hungary'];

interface SidebarProps {
  open: boolean;
  variant: 'permanent' | 'temporary';
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar = ({ open, variant, onClose, collapsed = false, onToggleCollapse }: SidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [legalExpanded, setLegalExpanded] = useState(false);
  const [countriesRentExpanded, setCountriesRentExpanded] = useState(false);
  const [countriesSaleExpanded, setCountriesSaleExpanded] = useState(false);

  const collapsedWidth = 72;
  const expandedWidth = 280;
  const drawerWidth = collapsed ? collapsedWidth : expandedWidth;

  const handleNavigation = (path: string) => {
    navigate(path);
    if (onClose) {
      onClose();
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleLegal = () => {
    if (collapsed && onToggleCollapse) {
      onToggleCollapse();
    }
    setLegalExpanded(!legalExpanded);
  };

  const toggleCountriesRent = () => {
    if (collapsed && onToggleCollapse) {
      onToggleCollapse();
    }
    setCountriesRentExpanded(!countriesRentExpanded);
  };

  const toggleCountriesSale = () => {
    if (collapsed && onToggleCollapse) {
      onToggleCollapse();
    }
    setCountriesSaleExpanded(!countriesSaleExpanded);
  };

  const legalItems = [
    { text: t('common:footer.terms') || 'Terms & Conditions', icon: <TermsIcon />, path: '/terms' },
    { text: t('common:footer.privacy') || 'Privacy Policy', icon: <PolicyIcon />, path: '/privacy' },
    { text: t('common:footer.cookies') || 'Cookie Policy', icon: <CookieIcon />, path: '/cookies' },
    { text: t('common:footer.gdpr') || 'GDPR', icon: <GDPRIcon />, path: '/gdpr' },
  ];

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      {/* Header with Logo/Brand */}
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 64,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {!collapsed && (
          <Typography variant="h6" fontWeight="bold" noWrap>
            PropertySocial
          </Typography>
        )}
        {variant === 'permanent' && (
          <IconButton onClick={onToggleCollapse} size="small">
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Box>

      {/* Main Navigation */}
      <List sx={{ px: 1 }}>
        <Tooltip title={collapsed ? t('common:nav.home') || 'Home' : ''} placement="right">
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation('/')}
              selected={isActive('/')}
              sx={{
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: 2.5,
                borderRadius: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                <HomeIcon />
              </ListItemIcon>
              {!collapsed && <ListItemText primary={t('common:nav.home') || 'Home'} />}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        <Tooltip title={collapsed ? t('common:nav.search') || 'Search' : ''} placement="right">
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation('/search')}
              selected={isActive('/search')}
              sx={{
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: 2.5,
                borderRadius: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                <SearchIcon />
              </ListItemIcon>
              {!collapsed && <ListItemText primary={t('common:nav.search') || 'Search Properties'} />}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        {/* Authentication Section */}
        {!isAuthenticated && (
          <>
            <Tooltip title={collapsed ? (t('common:auth.userLogin') || 'User Login') : ''} placement="right">
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation('/login')}
                  selected={isActive('/login')}
                  sx={{
                    minHeight: 48,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: 2.5,
                    borderRadius: 2,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                    <LoginIcon />
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={t('common:auth.userLogin') || 'User Login'} />}
                </ListItemButton>
              </ListItem>
            </Tooltip>

            <Tooltip title={collapsed ? (t('common:auth.agentLogin') || 'Agent Login') : ''} placement="right">
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation('/login?type=agent')}
                  sx={{
                    minHeight: 48,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: 2.5,
                    borderRadius: 2,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                    <AgentIcon />
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={t('common:auth.agentLogin') || 'Agent Login'} />}
                </ListItemButton>
              </ListItem>
            </Tooltip>

            <Tooltip title={collapsed ? (t('common:nav.register') || 'Register') : ''} placement="right">
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation('/register')}
                  selected={isActive('/register')}
                  sx={{
                    minHeight: 48,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: 2.5,
                    borderRadius: 2,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                    <RegisterIcon />
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={t('common:nav.register') || 'Register'} />}
                </ListItemButton>
              </ListItem>
            </Tooltip>
          </>
        )}
      </List>

      <Divider sx={{ my: 1 }} />

      {/* Property & Market Data Section */}
      <List sx={{ px: 1 }}>
        <Tooltip title={collapsed ? (t('common:property.trending') || 'Trending Properties') : ''} placement="right">
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation('/trending')}
              sx={{
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: 2.5,
                borderRadius: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                <TrendingIcon />
              </ListItemIcon>
              {!collapsed && <ListItemText primary={t('common:property.trending') || 'Trending Properties'} />}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        <Tooltip title={collapsed ? (t('common:property.housingData') || 'Housing Data') : ''} placement="right">
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation('/housing-data')}
              sx={{
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: 2.5,
                borderRadius: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                <DataIcon />
              </ListItemIcon>
              {!collapsed && <ListItemText primary={t('common:property.housingData') || 'Housing Data'} />}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        {/* Top Countries for Rent */}
        <Tooltip title={collapsed ? (t('common:property.topCountriesRent') || 'Top Countries for Rent') : ''} placement="right">
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={toggleCountriesRent}
              sx={{
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: 2.5,
                borderRadius: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                <CountriesIcon />
              </ListItemIcon>
              {!collapsed && (
                <>
                  <ListItemText primary={t('common:property.topCountriesRent') || 'Top Countries for Rent'} />
                  {countriesRentExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </>
              )}
            </ListItemButton>
          </ListItem>
        </Tooltip>
        
        {!collapsed && (
          <Collapse in={countriesRentExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {TOP_COUNTRIES_RENT.map((country) => (
                <ListItemButton
                  key={country}
                  sx={{ pl: 6, py: 0.5, borderRadius: 2 }}
                  onClick={() => handleNavigation(`/search?country=${country.toLowerCase()}&type=rent`)}
                >
                  <ListItemText primary={country} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        )}

        {/* Top Countries for Sale */}
        <Tooltip title={collapsed ? (t('common:property.topCountriesSale') || 'Top Countries for Sale') : ''} placement="right">
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={toggleCountriesSale}
              sx={{
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: 2.5,
                borderRadius: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                <CountriesIcon />
              </ListItemIcon>
              {!collapsed && (
                <>
                  <ListItemText primary={t('common:property.topCountriesSale') || 'Top Countries for Sale'} />
                  {countriesSaleExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </>
              )}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        {!collapsed && (
          <Collapse in={countriesSaleExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {TOP_COUNTRIES_SALE.map((country) => (
                <ListItemButton
                  key={country}
                  sx={{ pl: 6, py: 0.5, borderRadius: 2 }}
                  onClick={() => handleNavigation(`/search?country=${country.toLowerCase()}&type=sale`)}
                >
                  <ListItemText primary={country} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        )}
      </List>

      <Divider sx={{ my: 1 }} />

      {/* Legal Section */}
      <List sx={{ px: 1 }}>
        <Tooltip title={collapsed ? (t('common:footer.legalPrivacy') || 'Legal & Privacy') : ''} placement="right">
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={toggleLegal}
              sx={{
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: 2.5,
                borderRadius: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                <LegalIcon />
              </ListItemIcon>
              {!collapsed && (
                <>
                  <ListItemText primary={t('common:footer.legalPrivacy') || 'Legal & Privacy'} />
                  {legalExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </>
              )}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        {!collapsed && (
          <Collapse in={legalExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {legalItems.map((item) => (
                <ListItemButton
                  key={item.path}
                  sx={{ pl: 6, py: 0.5, borderRadius: 2 }}
                  onClick={() => handleNavigation(item.path)}
                  selected={isActive(item.path)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        )}
      </List>
    </Drawer>
  );
};