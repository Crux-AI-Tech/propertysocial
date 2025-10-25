import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
  Alert,
  InputAdornment,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

interface Offer {
  id: string;
  amount: number;
  currency: string;
  status: string;
  message?: string;
  conditions?: Record<string, any>;
  validUntil?: string;
  createdAt: string;
  respondedAt?: string;
  offerer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  counterOffers?: Offer[];
  parentOfferId?: string;
}

interface OfferManagementProps {
  transactionId: string;
  offers: Offer[];
  currentUserId: string;
  canMakeOffer: boolean;
  canRespondToOffers: boolean;
  onCreateOffer: (offerData: {
    amount: number;
    currency: string;
    message?: string;
    conditions?: Record<string, any>;
    validUntil?: Date;
  }) => Promise<void>;
  onRespondToOffer: (
    offerId: string,
    status: string,
    counterOffer?: {
      amount: number;
      currency: string;
      message?: string;
      conditions?: Record<string, any>;
      validUntil?: Date;
    }
  ) => Promise<void>;
}

export const OfferManagement = ({
  transactionId,
  offers,
  currentUserId,
  canMakeOffer,
  canRespondToOffers,
  onCreateOffer,
  onRespondToOffer,
}: OfferManagementProps) => {
  const { t } = useTranslation(['transaction', 'common']);
  const [createOfferOpen, setCreateOfferOpen] = useState(false);
  const [counterOfferOpen, setCounterOfferOpen] = useState<string | null>(null);
  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newOffer, setNewOffer] = useState({
    amount: 0,
    currency: 'EUR',
    message: '',
    validUntil: '',
  });
  
  const [counterOffer, setCounterOffer] = useState({
    amount: 0,
    currency: 'EUR',
    message: '',
    validUntil: '',
  });

  const handleCreateOffer = async () => {
    if (newOffer.amount <= 0) return;
    
    setIsSubmitting(true);
    try {
      await onCreateOffer({
        amount: newOffer.amount,
        currency: newOffer.currency,
        message: newOffer.message || undefined,
        validUntil: newOffer.validUntil ? new Date(newOffer.validUntil) : undefined,
      });
      
      setNewOffer({
        amount: 0,
        currency: 'EUR',
        message: '',
        validUntil: '',
      });
      setCreateOfferOpen(false);
    } catch (error) {
      console.error('Error creating offer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondToOffer = async (offerId: string, status: string) => {
    setIsSubmitting(true);
    try {
      let counterOfferData = undefined;
      
      if (status === 'COUNTERED') {
        counterOfferData = {
          amount: counterOffer.amount,
          currency: counterOffer.currency,
          message: counterOffer.message || undefined,
          validUntil: counterOffer.validUntil ? new Date(counterOffer.validUntil) : undefined,
        };
      }
      
      await onRespondToOffer(offerId, status, counterOfferData);
      
      if (status === 'COUNTERED') {
        setCounterOffer({
          amount: 0,
          currency: 'EUR',
          message: '',
          validUntil: '',
        });
      }
      setCounterOfferOpen(null);
    } catch (error) {
      console.error('Error responding to offer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOfferExpansion = (offerId: string) => {
    const newExpanded = new Set(expandedOffers);
    if (newExpanded.has(offerId)) {
      newExpanded.delete(offerId);
    } else {
      newExpanded.add(offerId);
    }
    setExpandedOffers(newExpanded);
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getOfferStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'success';
      case 'REJECTED': return 'error';
      case 'COUNTERED': return 'warning';
      case 'WITHDRAWN': return 'default';
      case 'EXPIRED': return 'default';
      default: return 'primary';
    }
  };

  const isOfferExpired = (validUntil?: string) => {
    return validUntil && new Date(validUntil) < new Date();
  };

  const canRespondToOffer = (offer: Offer) => {
    return canRespondToOffers && 
           offer.status === 'PENDING' && 
           offer.offerer.id !== currentUserId &&
           !isOfferExpired(offer.validUntil);
  };

  // Group offers by parent (main offers vs counter offers)
  const mainOffers = offers.filter(offer => !offer.parentOfferId);

  return (
    <Card>
      <CardHeader
        title={t('transaction:offers.title')}
        action={
          canMakeOffer && (
            <Button
              startIcon={<AddIcon />}
              onClick={() => setCreateOfferOpen(true)}
              variant="contained"
              size="small"
            >
              {t('transaction:offers.makeOffer')}
            </Button>
          )
        }
      />
      
      <CardContent>
        {offers.length === 0 ? (
          <Alert severity="info">
            {t('transaction:offers.noOffers')}
          </Alert>
        ) : (
          <List>
            {mainOffers.map((offer, index) => {
              const isExpanded = expandedOffers.has(offer.id);
              const hasCounterOffers = offers.some(o => o.parentOfferId === offer.id);
              
              return (
                <Box key={offer.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="h6">
                            {formatPrice(offer.amount, offer.currency)}
                          </Typography>
                          <Chip
                            label={t(`transaction:offers.status.${offer.status.toLowerCase()}`)}
                            color={getOfferStatusColor(offer.status)}
                            size="small"
                          />
                          {isOfferExpired(offer.validUntil) && (
                            <Chip
                              label={t('transaction:offers.expired')}
                              color="error"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {t('transaction:offers.from')} {offer.offerer.firstName} {offer.offerer.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(offer.createdAt).toLocaleString()}
                          </Typography>
                          {offer.validUntil && (
                            <Typography variant="body2" color="text.secondary">
                              {t('transaction:offers.validUntil')} {new Date(offer.validUntil).toLocaleString()}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {canRespondToOffer(offer) && (
                          <>
                            <Button
                              size="small"
                              startIcon={<CheckIcon />}
                              onClick={() => handleRespondToOffer(offer.id, 'ACCEPTED')}
                              disabled={isSubmitting}
                              color="success"
                            >
                              {t('transaction:offers.accept')}
                            </Button>
                            <Button
                              size="small"
                              startIcon={<ReplyIcon />}
                              onClick={() => setCounterOfferOpen(offer.id)}
                              disabled={isSubmitting}
                              color="warning"
                            >
                              {t('transaction:offers.counter')}
                            </Button>
                            <Button
                              size="small"
                              startIcon={<CloseIcon />}
                              onClick={() => handleRespondToOffer(offer.id, 'REJECTED')}
                              disabled={isSubmitting}
                              color="error"
                            >
                              {t('transaction:offers.reject')}
                            </Button>
                          </>
                        )}
                        
                        {(offer.message || hasCounterOffers) && (
                          <IconButton
                            onClick={() => toggleOfferExpansion(offer.id)}
                            size="small"
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <Collapse in={isExpanded}>
                    <Box sx={{ pl: 2, pr: 2, pb: 2 }}>
                      {offer.message && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            <strong>{t('transaction:offers.message')}:</strong> {offer.message}
                          </Typography>
                        </Alert>
                      )}
                      
                      {/* Counter offers */}
                      {hasCounterOffers && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            {t('transaction:offers.counterOffers')}
                          </Typography>
                          {offers
                            .filter(o => o.parentOfferId === offer.id)
                            .map(counterOffer => (
                              <Box key={counterOffer.id} sx={{ ml: 2, mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Typography variant="body2">
                                    {formatPrice(counterOffer.amount, counterOffer.currency)}
                                  </Typography>
                                  <Chip
                                    label={t(`transaction:offers.status.${counterOffer.status.toLowerCase()}`)}
                                    color={getOfferStatusColor(counterOffer.status)}
                                    size="small"
                                  />
                                  <Typography variant="body2" color="text.secondary">
                                    {counterOffer.offerer.firstName} {counterOffer.offerer.lastName}
                                  </Typography>
                                </Box>
                                {counterOffer.message && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {counterOffer.message}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                  
                  {index < mainOffers.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        )}
      </CardContent>

      {/* Create Offer Dialog */}
      <Dialog
        open={createOfferOpen}
        onClose={() => setCreateOfferOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('transaction:offers.makeOffer')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={t('transaction:offers.amount')}
              type="number"
              value={newOffer.amount || ''}
              onChange={(e) => setNewOffer(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">€</InputAdornment>,
              }}
              required
              fullWidth
            />
            
            <TextField
              label={t('transaction:offers.message')}
              value={newOffer.message}
              onChange={(e) => setNewOffer(prev => ({ ...prev, message: e.target.value }))}
              multiline
              rows={3}
              placeholder={t('transaction:offers.messagePlaceholder')}
              fullWidth
            />
            
            <TextField
              label={t('transaction:offers.validUntil')}
              type="datetime-local"
              value={newOffer.validUntil}
              onChange={(e) => setNewOffer(prev => ({ ...prev, validUntil: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOfferOpen(false)}>
            {t('common:cancel')}
          </Button>
          <LoadingButton
            onClick={handleCreateOffer}
            variant="contained"
            loading={isSubmitting}
            disabled={newOffer.amount <= 0}
          >
            {t('transaction:offers.submitOffer')}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Counter Offer Dialog */}
      <Dialog
        open={!!counterOfferOpen}
        onClose={() => setCounterOfferOpen(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('transaction:offers.counterOffer')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={t('transaction:offers.counterAmount')}
              type="number"
              value={counterOffer.amount || ''}
              onChange={(e) => setCounterOffer(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">€</InputAdornment>,
              }}
              required
              fullWidth
            />
            
            <TextField
              label={t('transaction:offers.counterMessage')}
              value={counterOffer.message}
              onChange={(e) => setCounterOffer(prev => ({ ...prev, message: e.target.value }))}
              multiline
              rows={3}
              placeholder={t('transaction:offers.counterMessagePlaceholder')}
              fullWidth
            />
            
            <TextField
              label={t('transaction:offers.validUntil')}
              type="datetime-local"
              value={counterOffer.validUntil}
              onChange={(e) => setCounterOffer(prev => ({ ...prev, validUntil: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCounterOfferOpen(null)}>
            {t('common:cancel')}
          </Button>
          <LoadingButton
            onClick={() => counterOfferOpen && handleRespondToOffer(counterOfferOpen, 'COUNTERED')}
            variant="contained"
            loading={isSubmitting}
            disabled={counterOffer.amount <= 0}
          >
            {t('transaction:offers.submitCounter')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Card>
  );
};