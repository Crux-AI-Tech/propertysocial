import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Share,
  MoreVert,
  Analytics,
  Edit,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import SocialSharePanel from './SocialSharePanel';
import SocialShareDialog from './SocialShareDialog';
import { useSocialShare } from '../../hooks/useSocialShare';
import { socialPlatforms, platformGroups } from './SocialPlatforms';

export interface PropertySocialShareProps {
  property: any;
  variant?: 'button' | 'icon' | 'menu' | 'panel';
  size?: 'small' | 'medium' | 'large';
  showAnalytics?: boolean;
  platforms?: string[];
}

const PropertySocialShare: React.FC<PropertySocialShareProps> = ({
  property,
  variant = 'button',
  size = 'medium',
  showAnalytics = false,
  platforms = platformGroups.realEstate,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  
  const {
    generateShareParams,
    handleShare,
    getPlatformAnalytics,
    getTotalAnalytics,
    analytics,
  } = useSocialShare({
    propertyId: property.id,
    trackAnalytics: true,
  });

  const shareParams = generateShareParams(property);
  const totalStats = getTotalAnalytics();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleQuickShare = (platformId: string) => {
    const platform = socialPlatforms[platformId];
    if (platform) {
      handleShare(platform, shareParams);
    }
    handleMenuClose();
  };

  // Button variant
  if (variant === 'button') {
    return (
      <>
        <Button
          startIcon={<Share />}
          onClick={() => setShowDialog(true)}
          variant="outlined"
          size={size}
          sx={{
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: `${theme.palette.primary.main}15`,
            },
          }}
        >
          {t('social:shareProperty')}
          {showAnalytics && totalStats.shares > 0 && (
            <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
              ({totalStats.shares})
            </Typography>
          )}
        </Button>
        
        <SocialShareDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          initialShareParams={shareParams}
          propertyId={property.id}
          onShare={handleShare}
        />
      </>
    );
  }

  // Icon variant
  if (variant === 'icon') {
    return (
      <>
        <Tooltip title={t('social:shareProperty')}>
          <IconButton
            onClick={() => setShowDialog(true)}
            size={size}
            sx={{
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: `${theme.palette.primary.main}15`,
              },
            }}
          >
            <Share />
          </IconButton>
        </Tooltip>
        
        <SocialShareDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          initialShareParams={shareParams}
          propertyId={property.id}
          onShare={handleShare}
        />
      </>
    );
  }

  // Menu variant
  if (variant === 'menu') {
    return (
      <>
        <IconButton onClick={handleMenuOpen} size={size}>
          <MoreVert />
        </IconButton>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: { minWidth: 200 },
          }}
        >
          <MenuItem onClick={() => setShowDialog(true)}>
            <ListItemIcon>
              <Edit />
            </ListItemIcon>
            <ListItemText primary={t('social:customizeAndShare')} />
          </MenuItem>
          
          <Divider />
          
          {platforms.slice(0, 4).map((platformId) => {
            const platform = socialPlatforms[platformId];
            const stats = getPlatformAnalytics(platformId);
            
            return (
              <MenuItem
                key={platformId}
                onClick={() => handleQuickShare(platformId)}
              >
                <ListItemIcon sx={{ color: platform.color }}>
                  {platform.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={platform.name}
                  secondary={stats ? `${stats.shares} shares` : undefined}
                />
              </MenuItem>
            );
          })}
          
          {showAnalytics && analytics.length > 0 && (
            <>
              <Divider />
              <MenuItem disabled>
                <ListItemIcon>
                  <Analytics />
                </ListItemIcon>
                <ListItemText 
                  primary={t('social:totalEngagement')}
                  secondary={`${totalStats.shares} shares, ${totalStats.clicks} clicks`}
                />
              </MenuItem>
            </>
          )}
        </Menu>
        
        <SocialShareDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          initialShareParams={shareParams}
          propertyId={property.id}
          onShare={handleShare}
        />
      </>
    );
  }

  // Panel variant
  if (variant === 'panel') {
    return (
      <Box sx={{ width: '100%' }}>
        <SocialSharePanel
          shareParams={shareParams}
          platforms={platforms}
          variant="native"
          size={size}
          showLabels={true}
          showStats={showAnalytics}
          onShare={handleShare}
        />
      </Box>
    );
  }

  return null;
};

export default PropertySocialShare;