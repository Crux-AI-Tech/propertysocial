import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close,
  Edit,
  Preview,
  Analytics,
  Settings,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import SocialSharePanel from './SocialSharePanel';
import { ShareParams, SocialPlatform } from './SocialShareButton';
import { platformGroups } from './SocialPlatforms';

export interface SocialShareDialogProps {
  open: boolean;
  onClose: () => void;
  initialShareParams: ShareParams;
  propertyId?: string;
  onShare?: (platform: SocialPlatform, shareParams: ShareParams) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 16 }}>
    {value === index && children}
  </div>
);

const SocialShareDialog: React.FC<SocialShareDialogProps> = ({
  open,
  onClose,
  initialShareParams,
  propertyId,
  onShare,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [tabValue, setTabValue] = useState(0);
  const [shareParams, setShareParams] = useState<ShareParams>(initialShareParams);
  const [customHashtags, setCustomHashtags] = useState(
    initialShareParams.hashtags?.join(', ') || ''
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    platformGroups.realEstate
  );
  const [showAnalytics, setShowAnalytics] = useState(false);

  const handleShareParamsChange = (field: keyof ShareParams, value: any) => {
    setShareParams(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleHashtagsChange = (value: string) => {
    setCustomHashtags(value);
    const hashtags = value
      .split(',')
      .map(tag => tag.trim().replace('#', ''))
      .filter(tag => tag.length > 0);
    
    handleShareParamsChange('hashtags', hashtags);
  };

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleShare = (platform: SocialPlatform, params: ShareParams) => {
    if (onShare) {
      onShare(platform, params);
    }
  };

  const presetHashtagSets = {
    luxury: ['luxury', 'premium', 'exclusive', 'realestate'],
    family: ['family', 'home', 'spacious', 'neighborhood'],
    investment: ['investment', 'property', 'roi', 'realestate'],
    modern: ['modern', 'contemporary', 'design', 'architecture'],
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          minHeight: isMobile ? '100vh' : '600px',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {t('social:sharePropertyListing')}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
        >
          <Tab icon={<Edit />} label={t('social:customize')} />
          <Tab icon={<Preview />} label={t('social:preview')} />
          <Tab icon={<Settings />} label={t('social:settings')} />
        </Tabs>

        <Box sx={{ px: 3, pb: 2 }}>
          {/* Customize Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label={t('social:shareTitle')}
                value={shareParams.title}
                onChange={(e) => handleShareParamsChange('title', e.target.value)}
                fullWidth
                multiline
                rows={2}
                helperText={t('social:titleHelp')}
              />

              <TextField
                label={t('social:shareDescription')}
                value={shareParams.description}
                onChange={(e) => handleShareParamsChange('description', e.target.value)}
                fullWidth
                multiline
                rows={3}
                helperText={t('social:descriptionHelp')}
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t('social:hashtags')}
                </Typography>
                <TextField
                  value={customHashtags}
                  onChange={(e) => handleHashtagsChange(e.target.value)}
                  fullWidth
                  placeholder="luxury, realestate, property, europe"
                  helperText={t('social:hashtagsHelp')}
                />
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('social:presetHashtags')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(presetHashtagSets).map(([key, tags]) => (
                      <Chip
                        key={key}
                        label={`${key} (${tags.length})`}
                        variant="outlined"
                        size="small"
                        onClick={() => handleHashtagsChange(tags.join(', '))}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>

              <TextField
                label={t('social:imageUrl')}
                value={shareParams.image || ''}
                onChange={(e) => handleShareParamsChange('image', e.target.value)}
                fullWidth
                helperText={t('social:imageHelp')}
              />
            </Box>
          </TabPanel>

          {/* Preview Tab */}
          <TabPanel value={tabValue} index={1}>
            <SocialSharePanel
              shareParams={shareParams}
              platforms={selectedPlatforms}
              variant="native"
              size="medium"
              showLabels={true}
              showStats={showAnalytics}
              onShare={handleShare}
            />
          </TabPanel>

          {/* Settings Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t('social:selectPlatforms')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(platformGroups).map(([groupName, platforms]) => (
                    <Chip
                      key={groupName}
                      label={t(`social:platformGroups.${groupName}`)}
                      variant={
                        platforms.every(p => selectedPlatforms.includes(p))
                          ? 'filled'
                          : 'outlined'
                      }
                      onClick={() => setSelectedPlatforms(platforms)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={showAnalytics}
                    onChange={(e) => setShowAnalytics(e.target.checked)}
                  />
                }
                label={t('social:showAnalytics')}
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t('social:shareUrl')}
                </Typography>
                <TextField
                  value={shareParams.url}
                  onChange={(e) => handleShareParamsChange('url', e.target.value)}
                  fullWidth
                  size="small"
                  helperText={t('social:urlHelp')}
                />
              </Box>
            </Box>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          {t('common:cancel')}
        </Button>
        <Button
          onClick={() => setTabValue(1)}
          variant="contained"
          startIcon={<Preview />}
        >
          {t('social:previewAndShare')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SocialShareDialog;