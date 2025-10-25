import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  /**
   * Send verification email
   */
  static async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@eu-real-estate.com',
      to: email,
      subject: 'Verify Your Email - EU Real Estate Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Welcome to EU Real Estate Portal!</h2>
          
          <p>Thank you for registering with EU Real Estate Portal. To complete your registration, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #7f8c8d;">${verificationUrl}</p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #7f8c8d;">
            This verification link will expire in 24 hours. If you didn't create an account with EU Real Estate Portal, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #95a5a6;">
            EU Real Estate Portal<br>
            Your trusted partner in European real estate
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@eu-real-estate.com',
      to: email,
      subject: 'Reset Your Password - EU Real Estate Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Password Reset Request</h2>
          
          <p>We received a request to reset your password for your EU Real Estate Portal account.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #7f8c8d;">${resetUrl}</p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #7f8c8d;">
            This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #95a5a6;">
            EU Real Estate Portal<br>
            Your trusted partner in European real estate
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@eu-real-estate.com',
      to: email,
      subject: 'Welcome to EU Real Estate Portal!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Welcome to EU Real Estate Portal, ${firstName}!</h2>
          
          <p>Your email has been successfully verified and your account is now active.</p>
          
          <p>You can now:</p>
          <ul>
            <li>Search for properties across Europe</li>
            <li>Save your favorite listings</li>
            <li>Set up property alerts</li>
            <li>Connect with verified agents</li>
            <li>Manage your property transactions</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <p>If you have any questions or need assistance, our support team is here to help.</p>
          
          <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #95a5a6;">
            EU Real Estate Portal<br>
            Your trusted partner in European real estate
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email as it's not critical
    }
  }
}