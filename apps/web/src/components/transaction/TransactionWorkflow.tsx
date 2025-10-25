import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completedAt?: string;
  completedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  isRequired: boolean;
  order: number;
}

interface TransactionWorkflowProps {
  transactionId: string;
  milestones: Milestone[];
  status: string;
  onCompleteMilestone: (milestoneId: string) => Promise<void>;
  onAddMilestone?: (milestone: Omit<Milestone, 'id' | 'completedAt' | 'completedBy'>) => Promise<void>;
  canEdit: boolean;
}

export const TransactionWorkflow = ({
  transactionId,
  milestones,
  status,
  onCompleteMilestone,
  onAddMilestone,
  canEdit,
}: TransactionWorkflowProps) => {
  const { t } = useTranslation(['transaction', 'common']);
  const [activeStep, setActiveStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState<string | null>(null);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    dueDate: '',
    isRequired: false,
    order: milestones.length + 1,
  });

  // Calculate active step based on completed milestones
  useEffect(() => {
    const completedCount = milestones.filter(m => m.completedAt).length;
    setActiveStep(completedCount);
  }, [milestones]);

  const handleCompleteMilestone = async (milestoneId: string) => {
    setIsCompleting(milestoneId);
    try {
      await onCompleteMilestone(milestoneId);
    } catch (error) {
      console.error('Error completing milestone:', error);
    } finally {
      setIsCompleting(null);
    }
  };

  const handleAddMilestone = async () => {
    if (!onAddMilestone || !newMilestone.title.trim()) return;

    try {
      await onAddMilestone({
        ...newMilestone,
        dueDate: newMilestone.dueDate || undefined,
      });
      setNewMilestone({
        title: '',
        description: '',
        dueDate: '',
        isRequired: false,
        order: milestones.length + 2,
      });
      setAddMilestoneOpen(false);
    } catch (error) {
      console.error('Error adding milestone:', error);
    }
  };

  const getStepIcon = (milestone: Milestone) => {
    if (milestone.completedAt) {
      return <CheckCircleIcon color="success" />;
    }
    if (milestone.dueDate && new Date(milestone.dueDate) < new Date()) {
      return <WarningIcon color="error" />;
    }
    return <ScheduleIcon color="action" />;
  };

  const getStepStatus = (milestone: Milestone) => {
    if (milestone.completedAt) {
      return 'completed';
    }
    if (milestone.dueDate && new Date(milestone.dueDate) < new Date()) {
      return 'overdue';
    }
    return 'pending';
  };

  const progressPercentage = (milestones.filter(m => m.completedAt).length / milestones.length) * 100;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            {t('transaction:workflow.title')}
          </Typography>
          {canEdit && onAddMilestone && (
            <Button
              startIcon={<AddIcon />}
              onClick={() => setAddMilestoneOpen(true)}
              size="small"
            >
              {t('transaction:workflow.addMilestone')}
            </Button>
          )}
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('transaction:workflow.progress')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(progressPercentage)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Transaction Status */}
        <Box sx={{ mb: 3 }}>
          <Chip
            label={t(`transaction:status.${status.toLowerCase()}`)}
            color={
              status === 'COMPLETED' ? 'success' :
              status === 'CANCELLED' || status === 'FAILED' ? 'error' :
              status === 'ACCEPTED' ? 'primary' : 'default'
            }
            size="small"
          />
        </Box>

        {/* Milestones Stepper */}
        <Stepper activeStep={activeStep} orientation="vertical">
          {milestones.map((milestone, index) => {
            const stepStatus = getStepStatus(milestone);
            
            return (
              <Step key={milestone.id} completed={!!milestone.completedAt}>
                <StepLabel
                  icon={getStepIcon(milestone)}
                  error={stepStatus === 'overdue'}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">
                      {milestone.title}
                    </Typography>
                    {milestone.isRequired && (
                      <Chip
                        label={t('transaction:workflow.required')}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </StepLabel>
                
                <StepContent>
                  <Box sx={{ pb: 2 }}>
                    {milestone.description && (
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {milestone.description}
                      </Typography>
                    )}
                    
                    {milestone.dueDate && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('transaction:workflow.dueDate')}: {new Date(milestone.dueDate).toLocaleDateString()}
                      </Typography>
                    )}
                    
                    {milestone.completedAt ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                        <Typography variant="body2" color="success.main">
                          {t('transaction:workflow.completedOn', {
                            date: new Date(milestone.completedAt).toLocaleDateString(),
                            user: milestone.completedBy ? 
                              `${milestone.completedBy.firstName} ${milestone.completedBy.lastName}` : 
                              t('common:unknown')
                          })}
                        </Typography>
                      </Box>
                    ) : canEdit && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleCompleteMilestone(milestone.id)}
                        disabled={isCompleting === milestone.id}
                        sx={{ mt: 1 }}
                      >
                        {isCompleting === milestone.id 
                          ? t('transaction:workflow.completing') 
                          : t('transaction:workflow.markComplete')
                        }
                      </Button>
                    )}
                    
                    {stepStatus === 'overdue' && !milestone.completedAt && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        {t('transaction:workflow.overdue')}
                      </Alert>
                    )}
                  </Box>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>

        {/* Add Milestone Dialog */}
        <Dialog
          open={addMilestoneOpen}
          onClose={() => setAddMilestoneOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {t('transaction:workflow.addMilestone')}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label={t('transaction:workflow.milestoneTitle')}
                value={newMilestone.title}
                onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                required
                fullWidth
              />
              
              <TextField
                label={t('transaction:workflow.milestoneDescription')}
                value={newMilestone.description}
                onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
                fullWidth
              />
              
              <TextField
                label={t('transaction:workflow.dueDate')}
                type="date"
                value={newMilestone.dueDate}
                onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              
              <FormControl fullWidth>
                <InputLabel>{t('transaction:workflow.priority')}</InputLabel>
                <Select
                  value={newMilestone.isRequired}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, isRequired: e.target.value as boolean }))}
                  label={t('transaction:workflow.priority')}
                >
                  <MenuItem value={false}>{t('transaction:workflow.optional')}</MenuItem>
                  <MenuItem value={true}>{t('transaction:workflow.required')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddMilestoneOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleAddMilestone}
              variant="contained"
              disabled={!newMilestone.title.trim()}
            >
              {t('common:add')}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};