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
  Avatar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Favorite as FavoriteIcon,
  Search as SearchIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Message as MessageIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

import { RootState } from '../../store';

interface SidebarProps {
  open: boolean;
  variant: 'permanent' | 'temporary';
  onClose?: () => void;
}

export const Sidebar = ({ open, variant, onClose }: SidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  const drawerWidth = 240;

  const menuItems = [
    { text: t('common:nav.dashboard'), icon: <DashboardIcon />, path: '/dashboard' },
    { text: t('common:nav.profile'), icon: <PersonIcon />, path: '/dashboard/profile' },
    { text: t('common:nav.favorites'), icon: <FavoriteIcon />, path: '/dashboard/favorites' },
    { text: t('common:nav.savedSearches'), icon: <SearchIcon />, path: '/dashboard/saved-searches' },
    { text: t('common:nav.messages'), icon: <MessageIcon />, path: '/dashboard/messages' },
    { text: t('common:nav.history'), icon: <HistoryIcon />, path: '/dashboard/history' },
    { text: t('common:nav.notifications'), icon: <NotificationsIcon />, path: '/dashboard/notifications' },
    { text: t('common:nav.settings'), icon: <SettingsIcon />, path: '/dashboard/settings' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (onClose) {
      onClose();
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

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
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {user && (
          <>
            <Avatar
              alt={user.firstName}
              src={user.avatar}
              sx={{ width: 64, height: 64, mb: 1 }}
            >
              {user.firstName?.charAt(0)}
              {user.lastName?.charAt(0)}
            </Avatar>
            <Typography variant="subtitle1" fontWeight="bold">
              {user.firstName} {user.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          </>
        )}
      </Box>
      
      <Divider />
      
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleNavigation('/')}
            selected={isActive('/')}
          >
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary={t('common:nav.home')} />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleNavigation('/search')}
            selected={isActive('/search')}
          >
            <ListItemIcon>
              <SearchIcon />
            </ListItemIcon>
            <ListItemText primary={t('common:nav.search')} />
          </ListItemButton>
        </ListItem>
      </List>
      
      <Divider />
      
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isActive(item.path)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};