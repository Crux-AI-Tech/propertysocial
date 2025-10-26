import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Divider,
  Snackbar,
  Alert,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close,
  Analytics,
  Visibility,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import SocialShareButton, { ShareParams, SocialPlatform } from './SocialShareButton';
import { socialPlatforms, platformGroups } from './SocialPlatforms';

export interface SocialSharePanelProps {
  shareParams: ShareParams;
  platforms?: string[];
  variant?: 'icon' | 'button' | 'native';
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  showStats?: boolean;
  onShare?: (platform: SocialPlatform, shareParams: ShareParams) => void;
  onClose?: () => void;
}

interface ShareStats {
  platform: string;
  shares: number;
  clicks: number;
}

const SocialSharePanel: React.FC<SocialSharePanelProps> = ({
  shareParams,
  platforms = platformGroups.realEstate,
  variant = 'native',
  size = 'medium',
  showLabels = true,
  showStats = false,
  onShare,
  onClose,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Mock stats data - in real app, this would come from analytics
  const [shareStats] = useState<ShareStats[]>([
    { platform: 'facebook', shares: 45, clicks: 123 },
    { platform: 'linkedin', shares: 32, clicks: 89 },
    { platform: 'whatsapp', shares: 28, clicks: 67 },
    { platform: 'email', shares: 15, clicks: 34 },
    { platform: 'copy', shares: 67, clicks: 156 },
  ]);

  const handleShare = async (platform: SocialPlatform, params: ShareParams) => {
    try {
      if (platform.id === 'copy') {
        await navigator.clipboard.writeText(params.url);
        setSnackbar({
          open: true,
          message: t('social:copySuccess'),
          severity: 'success',
        });
        return;
      }

      if (platform.id === 'instagram') {
        // Instagram doesn't support direct URL sharing, so copy to clipboard
        await navigator.clipboard.writeText(
          `${params.title}\n\n${params.description}\n\n${params.url}`
        );
        setSnackbar({
          open: true,
          message: t('social:instagramCopySuccess'),
          severity: 'info',
        });
        return;
      }

      // Track the share event
      if (onShare) {
        onShare(platform, params);
      }

      setSnackbar({
        open: true,
        message: t('social:shareSuccess', { platform: platform.name }),
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: t('social:shareError'),
        severity: 'error',
      });
    }
  };

  const getStatsForPlatform = (platformId: string) => {
    return shareStats.find(stat => stat.platform === platformId);
  };

  const selectedPlatforms = platforms.map(id => socialPlatforms[id]).filter(Boolean);

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          {t('social:shareProperty')}
        </Typography>
        {onClose && (
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        )}
      </Box>

      {/* Property Preview */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {t('social:sharingPreview')}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
          {shareParams.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {shareParams.description}
        </Typography>
        {shareParams.hashtags && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {shareParams.hashtags.map((tag, index) => (
              <Chip
                key={index}
                label={`#${tag}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            ))}
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Social Platforms */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {t('social:choosePlatform')}
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: showStats ? 3 : 0 }}>
        {selectedPlatforms.map((platform) => (
          <Grid item xs={6} sm={4} md={3} key={platform.id}>
            <Box sx={{ textAlign: 'center' }}>
              <SocialShareButton
                platform={platform}
                shareParams={shareParams}
                variant={variant}
                size={size}
                showLabel={showLabels}
                onClick={handleShare}
              />
              {showStats && (
                <Box sx={{ mt: 1 }}>
                  {(() => {
                    const stats = getStatsForPlatform(platform.id);
                    return stats ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title={t('social:totalShares')}>
                          <Typography variant="caption" color="text.secondary">
                            {stats.shares}
                          </Typography>
                        </Tooltip>
                        <Tooltip title={t('social:totalClicks')}>
                          <Typography variant="caption" color="text.secondary">
                            <Visibility sx={{ fontSize: 12, mr: 0.5 }} />
                            {stats.clicks}
                          </Typography>
                        </Tooltip>
                      </Box>
                    ) : null;
                  })()}
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Analytics Summary */}
      {showStats && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Analytics color="action" />
              <Typography variant="body2" color="text.secondary">
                {t('social:totalEngagement')}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {shareStats.reduce((acc, stat) => acc + stat.shares + stat.clicks, 0)} {t('social:interactions')}
            </Typography>
          </Box>
        </>
      )}

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default SocialSharePanel;