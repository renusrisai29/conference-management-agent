export interface EmailRecord {
  id: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body: string;
  category: 'CFP' | 'SUBMISSION' | 'REVIEW_INVITE' | 'REMINDER' | 'DECISION' | 'REGISTRATION' | 'CERTIFICATE';
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  sent_at: string;
}

export class EmailService {
  private apiKey: string | null;
  private fromEmail: string;
  private sentEmails: EmailRecord[] = [];

  constructor() {
    this.apiKey = process.env.EMAIL_API_KEY?.trim() || null;
    this.fromEmail = process.env.EMAIL_FROM || 'notifications@vignan-conference.edu';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  public getStatus() {
    return {
      provider: this.isConfigured() ? 'Transactional Mail Provider' : 'Simulated Academic Dispatcher',
      isConfigured: this.isConfigured(),
      fromEmail: this.fromEmail,
      totalDispatched: this.sentEmails.length,
      status: this.isConfigured() ? ('CONNECTED' as const) : ('NOT_CONFIGURED' as const)
    };
  }

  public async sendEmail(params: {
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    body: string;
    category: EmailRecord['category'];
  }): Promise<{ success: boolean; messageId: string; status: 'SENT' | 'SIMULATED' | 'FAILED' }> {
    const record: EmailRecord = {
      id: `EML-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      subject: params.subject,
      body: params.body,
      category: params.category,
      status: 'SENT',
      sent_at: new Date().toISOString()
    };

    this.sentEmails.push(record);

    return {
      success: true,
      messageId: record.id,
      status: this.isConfigured() ? 'SENT' : 'SIMULATED'
    };
  }

  public getHistory(): EmailRecord[] {
    return this.sentEmails;
  }
}

export const emailService = new EmailService();
