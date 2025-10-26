import React from 'react';
import {
  Button,
  IconButton,
  Tooltip,
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Facebook,
  Twitter,
  LinkedIn,
  Instagram,
  WhatsApp,
  Telegram,
  Email,
  Link as LinkIcon,
  Share,
} from '@mui/icons-material';

export interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  shareUrl: (params: ShareParams) => string;
  nativeApp?: string;
}

export interface ShareParams {
  url: string;
  title: string;
  description: string;
  image?: string;
  hashtags?: string[];
}

export interface SocialShareButtonProps {
  platform: SocialPlatform;
  shareParams: ShareParams;
  variant?: 'icon' | 'button' | 'native';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  onClick?: (platform: SocialPlatform, shareParams: ShareParams) => void;
}

const SocialShareButton: React.FC<SocialShareButtonProps> = ({
  platform,
  shareParams,
  variant = 'icon',
  size = 'medium',
  showLabel = false,
  onClick,
}) => {
  const theme = useTheme();

  const handleShare = () => {
    if (onClick) {
      onClick(platform, shareParams);
    }

    const shareUrl = platform.shareUrl(shareParams);
    
    // Try to open native app first, fallback to web
    if (platform.nativeApp && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      const nativeUrl = platform.nativeApp.replace('{url}', encodeURIComponent(shareParams.url));
      window.location.href = nativeUrl;
      
      // Fallback to web after a short delay
      setTimeout(() => {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }, 500);
    } else {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 32;
      default: return 24;
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small': return 'small' as const;
      case 'large': return 'large' as const;
      default: return 'medium' as const;
    }
  };

  if (variant === 'icon') {
    return (
      <Tooltip title={`Share on ${platform.name}`}>
        <IconButton
          onClick={handleShare}
          size={getButtonSize()}
          sx={{
            color: platform.color,
            '&:hover': {
              backgroundColor: `${platform.color}15`,
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {React.cloneElement(platform.icon as React.ReactElement, {
            sx: { fontSize: getIconSize() }
          })}
        </IconButton>
      </Tooltip>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        onClick={handleShare}
        startIcon={React.cloneElement(platform.icon as React.ReactElement, {
          sx: { fontSize: getIconSize() }
        })}
        size={getButtonSize()}
        sx={{
          color: platform.color,
          borderColor: platform.color,
          '&:hover': {
            backgroundColor: `${platform.color}15`,
            borderColor: platform.color,
          },
          transition: 'all 0.2s ease-in-out',
        }}
        variant="outlined"
      >
        {showLabel && platform.name}
      </Button>
    );
  }

  // Native variant - platform-specific styling
  return (
    <Button
      onClick={handleShare}
      startIcon={React.cloneElement(platform.icon as React.ReactElement, {
        sx: { fontSize: getIconSize(), color: 'white' }
      })}
      size={getButtonSize()}
      sx={{
        backgroundColor: platform.color,
        color: 'white',
        '&:hover': {
          backgroundColor: platform.color,
          filter: 'brightness(0.9)',
          transform: 'translateY(-1px)',
          boxShadow: theme.shadows[4],
        },
        transition: 'all 0.2s ease-in-out',
        borderRadius: platform.id === 'instagram' ? '12px' : '8px',
        textTransform: 'none',
        fontWeight: 600,
      }}
      variant="contained"
    >
      {showLabel && `Share on ${platform.name}`}
    </Button>
  );
};

export default SocialShareButton;