import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  Card,
  CardMedia,
  Grid,
  IconButton,
  Typography,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

interface ImageUploadProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
  maxFileSize?: number; // in MB
}

interface ImagePreview {
  file: File;
  url: string;
  isMain: boolean;
}

export const ImageUpload = ({
  images,
  onImagesChange,
  maxImages = 20,
  maxFileSize = 10,
}: ImageUploadProps) => {
  const { t } = useTranslation(['property', 'common']);
  const [previews, setPreviews] = useState<ImagePreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Create image previews when images change
  useState(() => {
    const newPreviews: ImagePreview[] = images.map((file, index) => ({
      file,
      url: URL.createObjectURL(file),
      isMain: index === 0,
    }));
    setPreviews(newPreviews);

    // Cleanup URLs when component unmounts
    return () => {
      newPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, [images]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(({ errors }) => errors[0]?.message).join(', ');
        setError(errors);
        return;
      }

      // Check if adding files would exceed max limit
      if (images.length + acceptedFiles.length > maxImages) {
        setError(t('property:imageUpload.maxImagesExceeded', { max: maxImages }));
        return;
      }

      // Simulate upload progress
      setIsUploading(true);
      setUploadProgress(0);

      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      // Add new images
      const newImages = [...images, ...acceptedFiles];
      onImagesChange(newImages);
    },
    [images, maxImages, onImagesChange, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxSize: maxFileSize * 1024 * 1024, // Convert MB to bytes
    disabled: images.length >= maxImages || isUploading,
  });

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    
    // Update previews
    const newPreviews = previews.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index].url);
    setPreviews(newPreviews);
  };

  const handleSetMainImage = (index: number) => {
    // Move selected image to first position
    const newImages = [...images];
    const [selectedImage] = newImages.splice(index, 1);
    newImages.unshift(selectedImage);
    onImagesChange(newImages);

    // Update previews
    const newPreviews = previews.map((preview, i) => ({
      ...preview,
      isMain: i === index,
    }));
    setPreviews(newPreviews);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Upload Area */}
      <Card
        {...getRootProps()}
        sx={{
          p: 4,
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: images.length >= maxImages ? 'not-allowed' : 'pointer',
          opacity: images.length >= maxImages ? 0.5 : 1,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: images.length >= maxImages ? 'grey.300' : 'primary.main',
            bgcolor: images.length >= maxImages ? 'background.paper' : 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <Box sx={{ textAlign: 'center' }}>
          <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive
              ? t('property:imageUpload.dropHere')
              : t('property:imageUpload.dragAndDrop')}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('property:imageUpload.supportedFormats')}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('property:imageUpload.maxSize', { size: maxFileSize })}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            sx={{ mt: 2 }}
            disabled={images.length >= maxImages}
          >
            {t('property:imageUpload.selectFiles')}
          </Button>
        </Box>
      </Card>

      {/* Upload Progress */}
      {isUploading && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            {t('property:imageUpload.uploading')}
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Image Counter */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {t('property:imageUpload.images')} ({images.length}/{maxImages})
        </Typography>
        {images.length > 0 && (
          <Chip
            icon={<ImageIcon />}
            label={t('property:imageUpload.mainImage')}
            size="small"
            color="primary"
          />
        )}
      </Box>

      {/* Image Previews */}
      {images.length > 0 && (
        <Grid container spacing={2}>
          {previews.map((preview, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Card
                sx={{
                  position: 'relative',
                  border: preview.isMain ? '2px solid' : '1px solid',
                  borderColor: preview.isMain ? 'primary.main' : 'grey.300',
                }}
              >
                {/* Main Image Badge */}
                {preview.isMain && (
                  <Chip
                    label={t('property:imageUpload.main')}
                    size="small"
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Image */}
                <CardMedia
                  component="img"
                  height="200"
                  image={preview.url}
                  alt={`Preview ${index + 1}`}
                  sx={{ objectFit: 'cover' }}
                />

                {/* Image Actions */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    display: 'flex',
                    gap: 1,
                  }}
                >
                  {/* Set as Main Image */}
                  <IconButton
                    size="small"
                    onClick={() => handleSetMainImage(index)}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
                    }}
                    title={
                      preview.isMain
                        ? t('property:imageUpload.mainImage')
                        : t('property:imageUpload.setAsMain')
                    }
                  >
                    {preview.isMain ? (
                      <StarIcon color="primary" />
                    ) : (
                      <StarBorderIcon />
                    )}
                  </IconButton>

                  {/* Delete Image */}
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveImage(index)}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
                    }}
                    title={t('property:imageUpload.removeImage')}
                  >
                    <DeleteIcon color="error" />
                  </IconButton>
                </Box>

                {/* Image Info */}
                <Box sx={{ p: 1, bgcolor: 'rgba(0, 0, 0, 0.7)', color: 'white' }}>
                  <Typography variant="caption" display="block">
                    {preview.file.name}
                  </Typography>
                  <Typography variant="caption" display="block">
                    {formatFileSize(preview.file.size)}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            color: 'text.secondary',
          }}
        >
          <ImageIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="body1">
            {t('property:imageUpload.noImages')}
          </Typography>
          <Typography variant="body2">
            {t('property:imageUpload.addImages')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};