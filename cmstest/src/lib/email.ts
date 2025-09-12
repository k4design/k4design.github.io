import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface LeadEmailData {
  name: string
  email: string
  phone?: string
  message?: string
  propertyTitle?: string
  propertyUrl?: string
  source: string
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  async sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@apertureglobal.com',
        to,
        subject,
        html,
        text,
      })

      console.log('Email sent successfully:', info.messageId)
      return true
    } catch (error) {
      console.error('Email sending failed:', error)
      return false
    }
  }

  async sendLeadNotification(data: LeadEmailData): Promise<boolean> {
    const subject = `New Lead: ${data.name} - ${data.source}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">New Lead Received</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Aperture Global</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Lead Information</h2>
            
            <div style="margin-bottom: 20px;">
              <strong style="color: #555;">Name:</strong>
              <span style="margin-left: 10px; color: #333;">${data.name}</span>
            </div>
            
            <div style="margin-bottom: 20px;">
              <strong style="color: #555;">Email:</strong>
              <span style="margin-left: 10px; color: #333;">${data.email}</span>
            </div>
            
            ${data.phone ? `
            <div style="margin-bottom: 20px;">
              <strong style="color: #555;">Phone:</strong>
              <span style="margin-left: 10px; color: #333;">${data.phone}</span>
            </div>
            ` : ''}
            
            <div style="margin-bottom: 20px;">
              <strong style="color: #555;">Source:</strong>
              <span style="margin-left: 10px; color: #333;">${data.source}</span>
            </div>
            
            ${data.propertyTitle ? `
            <div style="margin-bottom: 20px;">
              <strong style="color: #555;">Property:</strong>
              <span style="margin-left: 10px; color: #333;">${data.propertyTitle}</span>
            </div>
            ` : ''}
            
            ${data.message ? `
            <div style="margin-bottom: 20px;">
              <strong style="color: #555;">Message:</strong>
              <div style="margin-top: 10px; padding: 15px; background: #f5f5f5; border-radius: 4px; color: #333;">
                ${data.message}
              </div>
            </div>
            ` : ''}
            
            ${data.propertyUrl ? `
            <div style="margin-top: 25px; text-align: center;">
              <a href="${data.propertyUrl}" 
                 style="display: inline-block; background: #d4af37; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                View Property
              </a>
            </div>
            ` : ''}
          </div>
          
          <div style="margin-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>This lead was automatically captured from your website.</p>
            <p>Please respond to this lead within 24 hours for best results.</p>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2024 Aperture Global. All rights reserved.</p>
        </div>
      </div>
    `

    const text = `
New Lead Received - Aperture Global

Name: ${data.name}
Email: ${data.email}
${data.phone ? `Phone: ${data.phone}` : ''}
Source: ${data.source}
${data.propertyTitle ? `Property: ${data.propertyTitle}` : ''}

${data.message ? `Message: ${data.message}` : ''}

${data.propertyUrl ? `Property URL: ${data.propertyUrl}` : ''}

Please respond to this lead within 24 hours for best results.
    `

    return await this.sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@apertureglobal.com',
      subject,
      html,
      text,
    })
  }

  async sendLeadConfirmation(data: LeadEmailData): Promise<boolean> {
    const subject = 'Thank you for your interest - Aperture Global'
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Thank You!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Aperture Global</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Thank you for your interest!</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Hi ${data.name},
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for reaching out to Aperture Global. We've received your inquiry and our team will be in touch with you within 24 hours.
            </p>
            
            ${data.propertyTitle ? `
            <p style="color: #666; line-height: 1.6;">
              You expressed interest in: <strong>${data.propertyTitle}</strong>
            </p>
            ` : ''}
            
            <div style="margin: 25px 0; padding: 20px; background: #f8f9fa; border-left: 4px solid #d4af37;">
              <h3 style="color: #333; margin-top: 0;">What happens next?</h3>
              <ul style="color: #666; line-height: 1.6;">
                <li>One of our luxury real estate specialists will contact you</li>
                <li>We'll discuss your specific requirements and preferences</li>
                <li>We'll arrange a personalized property tour if needed</li>
                <li>We'll provide you with detailed market insights</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              In the meantime, feel free to explore more of our exclusive properties on our website.
            </p>
            
            <div style="margin-top: 25px; text-align: center;">
              <a href="${process.env.NEXTAUTH_URL}/properties" 
                 style="display: inline-block; background: #d4af37; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Browse More Properties
              </a>
            </div>
          </div>
          
          <div style="margin-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>Questions? Contact us at <a href="mailto:info@apertureglobal.com" style="color: #d4af37;">info@apertureglobal.com</a></p>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2024 Aperture Global. All rights reserved.</p>
        </div>
      </div>
    `

    const text = `
Thank you for your interest - Aperture Global

Hi ${data.name},

Thank you for reaching out to Aperture Global. We've received your inquiry and our team will be in touch with you within 24 hours.

${data.propertyTitle ? `You expressed interest in: ${data.propertyTitle}` : ''}

What happens next?
- One of our luxury real estate specialists will contact you
- We'll discuss your specific requirements and preferences  
- We'll arrange a personalized property tour if needed
- We'll provide you with detailed market insights

In the meantime, feel free to explore more of our exclusive properties on our website.

Questions? Contact us at info@apertureglobal.com
    `

    return await this.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    })
  }
}

export const emailService = new EmailService()
