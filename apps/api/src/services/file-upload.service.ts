import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1',
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'eu-real-estate-files';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

export class FileUploadService {
  /**
   * Upload property image to S3
   */
  static async uploadPropertyImage(
    file: Express.Multer.File,
    propertyId: string
  ): Promise<UploadResult> {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new AppError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400, 'INVALID_FILE_TYPE');
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new AppError('File size too large. Maximum size is 10MB.', 400, 'FILE_TOO_LARGE');
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const key = `properties/${propertyId}/images/${fileName}`;

      // Upload to S3
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
        Metadata: {
          originalName: file.originalname,
          propertyId,
          uploadedAt: new Date().toISOString(),
        },
      };

      const result = await s3.upload(uploadParams).promise();

      logger.info(`Property image uploaded successfully: ${key}`);

      return {
        url: result.Location,
        key: result.Key,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error) {
      logger.error('Failed to upload property image:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to upload image', 500, 'UPLOAD_ERROR');
    }
  }

  /**
   * Upload property document to S3
   */
  static async uploadPropertyDocument(
    file: Express.Multer.File,
    propertyId: string
  ): Promise<UploadResult> {
    try {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new AppError('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.', 400, 'INVALID_FILE_TYPE');
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new AppError('File size too large. Maximum size is 50MB.', 400, 'FILE_TOO_LARGE');
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const key = `properties/${propertyId}/documents/${fileName}`;

      // Upload to S3
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private', // Documents should be private
        Metadata: {
          originalName: file.originalname,
          propertyId,
          uploadedAt: new Date().toISOString(),
        },
      };

      const result = await s3.upload(uploadParams).promise();

      logger.info(`Property document uploaded successfully: ${key}`);

      return {
        url: result.Location,
        key: result.Key,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error) {
      logger.error('Failed to upload property document:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to upload document', 500, 'UPLOAD_ERROR');
    }
  }

  /**
   * Upload user avatar to S3
   */
  static async uploadUserAvatar(
    file: Express.Multer.File,
    userId: string
  ): Promise<UploadResult> {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new AppError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400, 'INVALID_FILE_TYPE');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new AppError('File size too large. Maximum size is 5MB.', 400, 'FILE_TOO_LARGE');
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const key = `users/${userId}/avatar/${fileName}`;

      // Upload to S3
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
        Metadata: {
          originalName: file.originalname,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      };

      const result = await s3.upload(uploadParams).promise();

      logger.info(`User avatar uploaded successfully: ${key}`);

      return {
        url: result.Location,
        key: result.Key,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error) {
      logger.error('Failed to upload user avatar:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to upload avatar', 500, 'UPLOAD_ERROR');
    }
  }

  /**
   * Delete file from S3
   */
  static async deleteFile(url: string): Promise<void> {
    try {
      // Extract key from URL
      const urlParts = url.split('/');
      const bucketIndex = urlParts.findIndex(part => part.includes(BUCKET_NAME));
      if (bucketIndex === -1) {
        throw new AppError('Invalid file URL', 400, 'INVALID_URL');
      }

      const key = urlParts.slice(bucketIndex + 1).join('/');

      const deleteParams: AWS.S3.DeleteObjectRequest = {
        Bucket: BUCKET_NAME,
        Key: key,
      };

      await s3.deleteObject(deleteParams).promise();

      logger.info(`File deleted successfully: ${key}`);
    } catch (error) {
      logger.error('Failed to delete file:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete file', 500, 'DELETE_ERROR');
    }
  }

  /**
   * Generate presigned URL for private file access
   */
  static async generatePresignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Expires: expiresIn,
      };

      const url = await s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL:', error);
      throw new AppError('Failed to generate file access URL', 500, 'PRESIGNED_URL_ERROR');
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
      };

      const metadata = await s3.headObject(params).promise();
      return metadata;
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      throw new AppError('Failed to get file information', 500, 'METADATA_ERROR');
    }
  }

  /**
   * List files in a directory
   */
  static async listFiles(prefix: string): Promise<AWS.S3.Object[]> {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Prefix: prefix,
      };

      const result = await s3.listObjectsV2(params).promise();
      return result.Contents || [];
    } catch (error) {
      logger.error('Failed to list files:', error);
      throw new AppError('Failed to list files', 500, 'LIST_ERROR');
    }
  }
}