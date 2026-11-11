import nodemailer, { Transporter } from 'nodemailer'

const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '')

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)

const layout = (title: string, text: string, link: string, button: string) => `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#222">
    <h2 style="margin:0 0 16px">${escapeHtml(title)}</h2>
    <p style="line-height:1.5">${escapeHtml(text)}</p>
    <p style="margin:24px 0">
      <a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#2f6fed;color:#fff;text-decoration:none">
        ${escapeHtml(button)}
      </a>
    </p>
    <p style="font-size:13px;color:#666;line-height:1.5">Если кнопка не открывается, скопируйте ссылку в браузер:<br>${link}</p>
    <p style="font-size:13px;color:#666">Если вы не запрашивали это письмо, просто проигнорируйте его.</p>
  </div>
`

class MailService {
  private transporter: Transporter | null | undefined

  private getTransporter() {
    if (this.transporter !== undefined) return this.transporter
    const host = process.env.SMTP_HOST?.trim()
    if (!host) {
      this.transporter = null
      return null
    }
    const port = Number(process.env.SMTP_PORT || 465)
    const user = process.env.SMTP_USER?.trim()
    const pass = process.env.SMTP_PASS
    this.transporter = nodemailer.createTransport({
      host,
      port,
      // 465 — сразу TLS, 587 — STARTTLS. Можно переопределить через SMTP_SECURE=1/0.
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === '1' : port === 465,
      auth: user && pass ? { user, pass } : undefined,
    })
    return this.transporter
  }

  private async send(to: string, subject: string, html: string, devLink: string) {
    const transporter = this.getTransporter()
    if (!transporter) {
      // Разработка без SMTP: письмо не отправляется, но ссылка видна в консоли сервера.
      console.log(`\n[mail] SMTP не настроен. Письмо для ${to}: ${subject}\n[mail] ${devLink}\n`)
      return
    }
    await transporter.sendMail({
      from: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'AniDale <no-reply@localhost>',
      to,
      subject,
      html,
      text: `${subject}\n\n${devLink}`,
    })
  }

  async sendVerification(email: string, login: string, token: string) {
    const link = `${clientUrl()}/verify-email?token=${encodeURIComponent(token)}`
    await this.send(
      email,
      'Подтвердите адрес почты на AniDale',
      layout(
        `Привет, ${login}!`,
        'Подтвердите адрес почты, чтобы публиковать записи, комментарии и сообщения. Ссылка действует 24 часа.',
        link,
        'Подтвердить почту',
      ),
      link,
    )
  }

  async sendPasswordReset(email: string, login: string, token: string) {
    const link = `${clientUrl()}/reset-password?token=${encodeURIComponent(token)}`
    await this.send(
      email,
      'Сброс пароля на AniDale',
      layout(
        'Сброс пароля',
        `Вы запросили новый пароль для аккаунта ${login}. Ссылка действует 1 час и сработает только один раз.`,
        link,
        'Задать новый пароль',
      ),
      link,
    )
  }
}

export default new MailService()
