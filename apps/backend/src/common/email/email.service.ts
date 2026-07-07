import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import emailConfig from '@/config/email.config';
import nodemailer from 'nodemailer';
@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly options: ReturnType<typeof emailConfig>;

  constructor(private readonly configService: ConfigService) {
    this.options = emailConfig(this.configService);
    this.transporter = nodemailer.createTransport({
      host: this.options.host,
      port: this.options.port,
      secure: this.options.secure,
      auth: {
        user: this.options.authUser,
        pass: this.options.authPass,
      },
    });
  }

  private shouldSendEmailInLastMinute(): boolean {
    return (
      process.env.NODE_ENV !== 'production' &&
      this.options.authPass === 'replace-with-smtp-password'
    );
  }
  // 渲染登录验证码邮件模板
  private renderLoginCodeTemplate(code: string, expiresInMinutes: number): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>登录验证码</title>
          <style>
            body { margin: 0; padding: 0; background: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; }
            .container { max-width: 560px; margin: 0 auto; padding: 24px; }
            .card { background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06); }
            .header { padding: 22px 26px; color: #fff; background: linear-gradient(120deg, #2f80ed 0%, #6f5bff 100%); font-size: 20px; font-weight: 600; }
            .content { padding: 28px 26px 20px; color: #1f2937; line-height: 1.7; }
            .code-box { margin: 22px 0; border-radius: 12px; background: #f8fafc; border: 1px dashed #d1d5db; text-align: center; padding: 18px 12px; }
            .code { letter-spacing: 8px; font-size: 34px; line-height: 1; color: #1d4ed8; font-weight: 700; }
            .footer { padding: 0 26px 24px; color: #6b7280; font-size: 13px; line-height: 1.7; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">登录验证码</div>
              <div class="content">
                你正在使用邮箱验证码登录 Creator Lane，验证码如下：
                <div class="code-box">
                  <div class="code">${code}</div>
                </div>
                验证码有效期 <strong>${expiresInMinutes} 分钟</strong>，请勿泄露给他人。
              </div>
              <div class="footer">
                此邮件由系统自动发送，请勿直接回复。
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
  // 发送邮件
  async sendEmail(to: string, subject: string, text: string, html?: string) {
    try {
      await this.transporter.sendMail({
        from: this.options.from,
        to,
        subject,
        text,
        html,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  // 发送登录验证码邮件
  async sendLoginCodeEmail(to: string, code: string, expiresInSeconds: number): Promise<void> {
    const expiresInMinutes = Math.max(1, Math.floor(expiresInSeconds / 60));
    if (this.shouldSendEmailInLastMinute()) {
      this.logger.warn(`Development login code for ${to}: ${code}`);
      return;
    }
    const subject = '登录验证码';
    const text = `你的登录验证码是：${code},有效期 ${expiresInMinutes} 分钟。`;
    const html = this.renderLoginCodeTemplate(code, expiresInMinutes);
    await this.sendEmail(to, subject, text, html);
  }
}
