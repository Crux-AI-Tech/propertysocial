import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Typography,
  Button,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Circle as CircleIcon,
  MoreVert as MoreVertIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  PhoneAndroid as PhoneIcon,
  Info as InfoIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';

interface Notification {
  id: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  title: string;
  content: string;
  data?: Record<string, any>;
  createdAt: string;
  readAt?: string;
  sentAt?: string;
}

interface NotificationCenterProps {
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationCenter = ({ onNotificationClick }: NotificationCenterProps) => {
  const { t } = useTranslation(['notifications', 'common']);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);

  const open = Boolean(anchorEl);

  // Load notifications
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const result = await response.json();
      setNotifications(result.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(t('notifications:loadError'));
      // Mock data for development
      setNotifications([
        {
          id: '1',
          type: 'PUSH',
          status: 'SENT',
          title: 'New Property Match',
          content: 'A new property matching your saved search is available',
          data: { propertyId: 'prop-1' },
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          type: 'EMAIL',
          status: 'DELIVERED',
          title: 'Offer Response',
          content: 'Your offer for "Beautiful Apartment in Berlin" has been accepted',
          data: { transactionId: 'trans-1' },
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          readAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          type: 'IN_APP',
          status: 'SENT',
          title: 'Document Required',
          content: 'Please upload the required documents for your transaction',
          data: { transactionId: 'trans-1' },
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setUnreadCount(result.data.count || 0);
      } else {
        // Mock data for development
        setUnreadCount(2);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(2); // Mock data
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.readAt) {
      await markAsRead(notification.id);
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    
    handleClose();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // TODO: Replace with actual API call
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, readAt: new Date().toISOString() }
            : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // TODO: Replace with actual API call
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, readAt: notif.readAt || new Date().toISOString() }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // TODO: Replace with actual API call
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      // Update local state
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      // Update unread count if notification was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.readAt) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
    
    setMenuAnchorEl(null);
    setSelectedNotification(null);
  };

  const getNotificationIcon = (type: string, data?: Record<string, any>) => {
    if (data?.propertyId) return <HomeIcon />;
    if (data?.transactionId) return <BusinessIcon />;
    
    switch (type) {
      case 'EMAIL': return <EmailIcon />;
      case 'SMS': return <SmsIcon />;
      case 'PUSH': return <PhoneIcon />;
      default: return <InfoIcon />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'EMAIL': return 'primary';
      case 'SMS': return 'secondary';
      case 'PUSH': return 'success';
      default: return 'default';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('notifications:justNow');
    if (diffInMinutes < 60) return t('notifications:minutesAgo', { count: diffInMinutes });
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('notifications:hoursAgo', { count: diffInHours });
    
    const diffInDays = Math.floor(diffInHours / 24);
    return t('notifications:daysAgo', { count: diffInDays });
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, notificationId: string) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedNotification(notificationId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedNotification(null);
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label={t('notifications:title')}
      >
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 400, maxHeight: 600 },
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {t('notifications:title')}
            </Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead}>
                {t('notifications:markAllRead')}
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {t('notifications:noNotifications')}
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {notifications.map((notification, index) => (
              <Box key={notification.id}>
                <ListItem
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.readAt ? 'transparent' : 'action.hover',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: `${getNotificationColor(notification.type)}.main`,
                        width: 32,
                        height: 32,
                      }}
                    >
                      {getNotificationIcon(notification.type, notification.data)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" noWrap>
                          {notification.title}
                        </Typography>
                        {!notification.readAt && (
                          <CircleIcon sx={{ fontSize: 8, color: 'primary.main' }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {notification.content}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip
                            label={t(`notifications:types.${notification.type.toLowerCase()}`)}
                            size="small"
                            color={getNotificationColor(notification.type) as any}
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(notification.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => handleMenuClick(e, notification.id)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {index < notifications.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}

        {notifications.length > 0 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Button size="small" onClick={() => {/* TODO: Navigate to notifications page */}}>
              {t('notifications:viewAll')}
            </Button>
          </Box>
        )}
      </Popover>

      {/* Notification Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedNotification) {
              markAsRead(selectedNotification);
            }
            handleMenuClose();
          }}
        >
          {t('notifications:markAsRead')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedNotification) {
              deleteNotification(selectedNotification);
            }
          }}
        >
          {t('notifications:delete')}
        </MenuItem>
      </Menu>
    </>
  );
};