import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.util';


interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string | null = null;
  private initialized = false;

  constructor() {
    // Delay initialization until first use to ensure environment variables are loaded
  }

  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    try {
      this.initializeTransporter();
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      // Create a dummy transporter to prevent crashes
      this.transporter = {
        sendMail: async () => { throw new Error('Email service not configured'); },
        verify: async () => { throw new Error('Email service not configured'); }
      } as any;
      this.initialized = true;
    }
  }

  private initializeTransporter(): void {
    // Set fromEmail
    this.fromEmail = process.env['EMAIL_FROM'] || 'noreply@example.com';
    // Debug environment variables
    logger.info('Environment variables:');
    logger.info(`  EMAIL_HOST: ${process.env['EMAIL_HOST']}`);
    logger.info(`  EMAIL_PORT: ${process.env['EMAIL_PORT']}`);
    logger.info(`  EMAIL_USER: ${process.env['EMAIL_USER']}`);
    logger.info(`  EMAIL_PASS exists: ${!!process.env['EMAIL_PASS']}`);

    const config = {
      host: process.env['EMAIL_HOST'] || 'smtp.gmail.com',
      port: parseInt(process.env['EMAIL_PORT'] || '587'),
      secure: false,
      auth: {
        user: process.env['EMAIL_USER'] || '',
        pass: process.env['EMAIL_PASS'] || ''
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    logger.info('Email configuration:');
    logger.info(`  Host: ${config.host}`);
    logger.info(`  Port: ${config.port}`);
    logger.info(`  User: ${config.auth.user}`);
    logger.info(`  Has Password: ${!!config.auth.pass}`);

    this.transporter = nodemailer.createTransport(config);
  }

  async sendWelcomeEmail(email: string, name: string, password: string): Promise<void> {
    const subject = 'Welcome to Frovo RBAC System';
    const html = this.generateWelcomeEmailHTML(name, email, password);
    const text = this.generateWelcomeEmailText(name, email, password);

    await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      // Ensure service is initialized
      this.ensureInitialized();

      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      // First verify the connection
      logger.info('Verifying SMTP connection...');
      await this.transporter.verify();
      logger.info('✅ SMTP connection verified');

      const mailOptions = {
        from: this.fromEmail || 'noreply@example.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };

      logger.info(`Attempting to send email to ${options.to}...`);
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Email sent successfully to ${options.to}. Message ID: ${info.messageId}`);
    } catch (error) {
      logger.error('❌ Error sending email:', error);
      if (error instanceof Error) {
        logger.error('Error details:', error.message);
        logger.error('Error stack:', error.stack);
        logger.error('Error code:', (error as any).code);
        logger.error('Error response:', (error as any).response);
      } else {
        logger.error('Non-Error object:', typeof error);
        logger.error('Error value:', error);
      }
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private generateWelcomeEmailHTML(name: string, email: string, password: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Frovo RBAC System</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .credentials { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .warning { background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 5px solid #ffc107; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Frovo RBAC System</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Your account has been successfully created in the Frovo Role-Based Access Control (RBAC) system.</p>
            
            <div class="credentials">
              <h3>Login Credentials:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${password}</p>
            </div>
            
            <div class="warning">
              <h3>⚠️ Important Security Notice</h3>
              <p>Please change your password immediately after your first login for security purposes.</p>
            </div>
            
            <p>You can now access the system and begin using your assigned roles and permissions.</p>
            
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Frovo RBAC System. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmailText(name: string, email: string, password: string): string {
    return `
Welcome to Frovo RBAC System

Hello ${name}!

Your account has been successfully created in the Frovo Role-Based Access Control (RBAC) system.

Login Credentials:
Email: ${email}
Password: ${password}

⚠️ IMPORTANT SECURITY NOTICE
Please change your password immediately after your first login for security purposes.

You can now access the system and begin using your assigned roles and permissions.

If you have any questions or need assistance, please contact your system administrator.

---
This is an automated message from the Frovo RBAC System. Please do not reply to this email.
    `;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      // Ensure service is initialized
      this.ensureInitialized();

      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      await this.transporter.verify();
      logger.info('✅ Email service connection verified successfully');
      return true;
    } catch (error) {
      logger.error('❌ Email service connection failed:', error);
      logger.error('Error details:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();