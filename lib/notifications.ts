import nodemailer from 'nodemailer'
import twilio from 'twilio'

// Email configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// Twilio configuration
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

interface AppointmentEmailData {
  patientName: string
  patientEmail: string
  appointmentDate: string
  appointmentTime: string
  type: string
  reason: string
}

export async function sendAppointmentConfirmationEmail(data: AppointmentEmailData) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: data.patientEmail,
      subject: 'Appointment Confirmation - AI Symptom Checker',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .detail { margin: 10px 0; }
            .label { font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Confirmed</h1>
            </div>
            <div class="content">
              <p>Dear ${data.patientName},</p>
              <p>Your appointment has been successfully scheduled. Here are the details:</p>

              <div class="detail">
                <span class="label">Date:</span> ${data.appointmentDate}
              </div>
              <div class="detail">
                <span class="label">Time:</span> ${data.appointmentTime}
              </div>
              <div class="detail">
                <span class="label">Type:</span> ${data.type}
              </div>
              <div class="detail">
                <span class="label">Reason:</span> ${data.reason}
              </div>

              <p style="margin-top: 20px;">
                Please arrive 10 minutes early for ${data.type === 'OFFLINE' ? 'your in-person visit' : 'your online consultation'}.
              </p>

              <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
            </div>
            <div class="footer">
              <p>AI Symptom Checker & Appointment System</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendAppointmentSMS(phone: string, data: AppointmentEmailData) {
  if (!twilioClient) {
    console.log('Twilio not configured, skipping SMS')
    return { success: false, error: 'Twilio not configured' }
  }

  try {
    const message = await twilioClient.messages.create({
      body: `Appointment Confirmed!\nDate: ${data.appointmentDate}\nTime: ${data.appointmentTime}\nType: ${data.type}\n\nAI Symptom Checker`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    })

    console.log('SMS sent:', message.sid)
    return { success: true, messageId: message.sid }
  } catch (error) {
    console.error('Error sending SMS:', error)
    return { success: false, error }
  }
}
