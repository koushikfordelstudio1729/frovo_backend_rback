"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_util_1 = require("../utils/logger.util");
class EmailService {
    constructor() {
        this.fromEmail = process.env['EMAIL_FROM'] || 'noreply@example.com';
        this.initializeTransporter();
    }
    initializeTransporter() {
        const config = {
            service: 'gmail',
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
        this.transporter = nodemailer_1.default.createTransport(config);
    }
    async sendWelcomeEmail(email, name, password) {
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
    async sendEmail(options) {
        try {
            const mailOptions = {
                from: this.fromEmail,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text
            };
            logger_util_1.logger.info(`Attempting to send email to ${options.to}...`);
            const info = await this.transporter.sendMail(mailOptions);
            logger_util_1.logger.info(`✅ Email sent successfully to ${options.to}. Message ID: ${info.messageId}`);
        }
        catch (error) {
            logger_util_1.logger.error('❌ Error sending email:', error);
            logger_util_1.logger.error('Error details:', JSON.stringify(error, null, 2));
            throw new Error(`Failed to send email: ${error}`);
        }
    }
    generateWelcomeEmailHTML(name, email, password) {
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
    generateWelcomeEmailText(name, email, password) {
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
    async verifyConnection() {
        try {
            await this.transporter.verify();
            logger_util_1.logger.info('✅ Email service connection verified successfully');
            return true;
        }
        catch (error) {
            logger_util_1.logger.error('❌ Email service connection failed:', error);
            logger_util_1.logger.error('Error details:', error);
            return false;
        }
    }
}
exports.emailService = new EmailService();
//# sourceMappingURL=email.service.js.map