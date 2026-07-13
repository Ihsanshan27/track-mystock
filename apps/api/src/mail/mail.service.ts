import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendOtpEmail(to: string, otp: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(`SMTP credentials not set. Falling back to console log. OTP for ${to}: ${otp}`);
      return;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"StockLife" <no-reply@stocklife.com>',
      to,
      subject: 'Kode Verifikasi OTP Anda - StockLife',
      text: `Kode verifikasi Anda adalah: ${otp}\n\nKode ini akan kedaluwarsa dalam beberapa menit.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #3b82f6; text-align: center;">StockLife</h2>
          <p>Halo,</p>
          <p>Berikut adalah kode verifikasi OTP Anda:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; background: #f3f4f6; padding: 10px 20px; border-radius: 6px;">${otp}</span>
          </div>
          <p>Kode ini bersifat rahasia dan akan kedaluwarsa dalam beberapa menit. Jangan berikan kode ini kepada siapa pun.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">&copy; ${new Date().getFullYear()} StockLife. All rights reserved.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(to: string, token: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(`SMTP credentials not set. Falling back to console log. Reset token for ${to}: ${token}`);
      return;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"StockLife" <no-reply@stocklife.com>',
      to,
      subject: 'Reset Password Anda - StockLife',
      text: `Token reset password Anda adalah: ${token}\n\nGunakan token ini di aplikasi untuk mengatur ulang password Anda.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #3b82f6; text-align: center;">StockLife</h2>
          <p>Halo,</p>
          <p>Berikut adalah kode token reset password Anda:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; background: #f3f4f6; padding: 10px 20px; border-radius: 6px;">${token}</span>
          </div>
          <p>Gunakan token di atas di dalam aplikasi untuk membuat password baru.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">&copy; ${new Date().getFullYear()} StockLife. All rights reserved.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }
}
