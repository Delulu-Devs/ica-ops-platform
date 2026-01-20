import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// Initialize Resend client if API key is present
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  async sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
    // If no API key or explicitly mocked, log only
    if (!resend) {
      console.log('📧 [MOCK EMAIL SERVICE]');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log('--- Body ---');
      console.log(text || html);
      console.log('------------');
      return true;
    }

    try {
      const data = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        text,
      });

      if (data.error) {
        console.error('Failed to send email:', data.error);
        return false;
      }

      console.log(`📧 Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  },

  async sendDemoConfirmation(to: string, studentName: string, date: Date, meetingLink: string) {
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date);

    return this.sendEmail({
      to,
      subject: 'Demo Confirmation - ICA Platform',
      html: `
        <h1>Demo Confirmed!</h1>
        <p>Hi there,</p>
        <p>Your demo session for <strong>${studentName}</strong> has been scheduled.</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
        <br />
        <p>See you there!</p>
        <p>ICA Operations Team</p>
      `,
      text: `Demo Confirmed for ${studentName} on ${formattedDate}. Link: ${meetingLink}`,
    });
  },

  async sendDemoReminder(to: string, studentName: string, date: Date) {
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      timeStyle: 'short',
    }).format(date);

    return this.sendEmail({
      to,
      subject: 'Reminder: Demo Session in 1 Hour',
      html: `
        <h1>Demo Reminder</h1>
        <p>Hi,</p>
        <p>Just a reminder that your demo for <strong>${studentName}</strong> is starting soon at ${formattedDate}.</p>
        <br />
        <p>ICA Operations Team</p>
      `,
    });
  },

  async sendPaymentLink(to: string, studentName: string, amount: number) {
    return this.sendEmail({
      to,
      subject: 'Complete Your Enrollment - ICA Platform',
      html: `
        <h1>Enrollment Payment</h1>
        <p>Hi,</p>
        <p>We're excited to have <strong>${studentName}</strong> join us!</p>
        <p>Please complete the payment of <strong>$${amount}</strong> to finalize the enrollment.</p>
        <p><a href="#">Click here to pay</a></p>
        <br />
        <p>ICA Operations Team</p>
      `,
    });
  },

  async sendWelcomeEmail(to: string, studentName: string, password?: string) {
    const loginInfo = password
      ? `
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Here are your login credentials:</strong></p>
        <p>Email: ${to}</p>
        <p>Password: ${password}</p>
      </div>
    `
      : '';

    return this.sendEmail({
      to,
      subject: 'Welcome to ICA Platform!',
      html: `
        <h1>Welcome Aboard!</h1>
        <p>Hi,</p>
        <p>Registration for <strong>${studentName}</strong> is complete.</p>
        ${loginInfo}
        <p>You can now log in to the student dashboard to view schedules and join classes.</p>
        <br />
        <p>Happy Learning!</p>
        <p>ICA Operations Team</p>
      `,
    });
  },
};
