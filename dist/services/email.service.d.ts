interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
declare class EmailService {
    private transporter;
    private fromEmail;
    constructor();
    private initializeTransporter;
    sendWelcomeEmail(email: string, name: string, password: string): Promise<void>;
    sendEmail(options: EmailOptions): Promise<void>;
    private generateWelcomeEmailHTML;
    private generateWelcomeEmailText;
    verifyConnection(): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=email.service.d.ts.map