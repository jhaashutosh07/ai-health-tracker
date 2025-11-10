import nodemailer from 'nodemailer'

// Email configuration
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@symptomchecker.com'
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS

// Demo mode - if no SMTP credentials provided
const DEMO_MODE = !SMTP_USER || !SMTP_PASS

// Create transporter
const transporter = DEMO_MODE
  ? nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    })
  : nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    })

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (DEMO_MODE) {
      console.log('📧 DEMO MODE - Email would be sent:')
      console.log('To:', options.to)
      console.log('Subject:', options.subject)
      console.log('Content:', options.text || 'HTML email')
      console.log('---')
      return true
    }

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    })

    console.log('Email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Email sending error:', error)
    return false
  }
}

// Email templates
export const emailTemplates = {
  passwordReset: (name: string, resetUrl: string) => ({
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>You recently requested to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated email from AI-Powered Symptom Checker. Please do not reply to this email.</p>
      </div>
    `,
    text: `
Password Reset Request

Hi ${name},

You recently requested to reset your password. Click the link below to reset it:

${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email.
    `
  }),

  appointmentConfirmation: (
    patientName: string,
    doctorName: string,
    date: string,
    time: string,
    reason: string
  ) => ({
    subject: 'Appointment Confirmation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Appointment Confirmed!</h2>
        <p>Hi ${patientName},</p>
        <p>Your appointment has been successfully scheduled.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Appointment Details</h3>
          <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>Please arrive 10 minutes before your scheduled time.</p>
        <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated email from AI-Powered Symptom Checker. Please do not reply to this email.</p>
      </div>
    `,
    text: `
Appointment Confirmed!

Hi ${patientName},

Your appointment has been successfully scheduled.

Appointment Details:
- Doctor: Dr. ${doctorName}
- Date: ${date}
- Time: ${time}
- Reason: ${reason}

Please arrive 10 minutes before your scheduled time.

If you need to reschedule or cancel, please contact us as soon as possible.
    `
  }),

  appointmentReminder: (
    patientName: string,
    doctorName: string,
    date: string,
    time: string
  ) => ({
    subject: 'Appointment Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Appointment Reminder</h2>
        <p>Hi ${patientName},</p>
        <p>This is a friendly reminder about your upcoming appointment.</p>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0;"><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p style="margin: 10px 0 0 0;"><strong>Date & Time:</strong> ${date} at ${time}</p>
        </div>
        <p>Please remember to arrive 10 minutes early.</p>
        <p>See you soon!</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated email from AI-Powered Symptom Checker. Please do not reply to this email.</p>
      </div>
    `,
    text: `
Appointment Reminder

Hi ${patientName},

This is a friendly reminder about your upcoming appointment.

Doctor: Dr. ${doctorName}
Date & Time: ${date} at ${time}

Please remember to arrive 10 minutes early.

See you soon!
    `
  }),

  welcome: (name: string) => ({
    subject: 'Welcome to AI-Powered Symptom Checker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to AI-Powered Symptom Checker!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for registering with us. We're excited to help you manage your health journey.</p>
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">What you can do:</h3>
          <ul style="color: #374151;">
            <li>Check symptoms with our AI-powered tool</li>
            <li>Find nearby doctors</li>
            <li>Book appointments</li>
            <li>Manage your medical records</li>
            <li>Track your health analytics</li>
          </ul>
        </div>
        <p>Get started by checking your symptoms or finding a doctor near you!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Get Started
          </a>
        </div>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated email from AI-Powered Symptom Checker. Please do not reply to this email.</p>
      </div>
    `,
    text: `
Welcome to AI-Powered Symptom Checker!

Hi ${name},

Thank you for registering with us. We're excited to help you manage your health journey.

What you can do:
- Check symptoms with our AI-powered tool
- Find nearby doctors
- Book appointments
- Manage your medical records
- Track your health analytics

Get started by visiting: ${process.env.NEXTAUTH_URL}

If you have any questions, feel free to reach out to our support team.
    `
  })
}
