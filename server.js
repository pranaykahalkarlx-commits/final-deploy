const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

const resend = new Resend(process.env.RESEND_API_KEY || 're_GJjQJrPp_A1Gk58Fa27PF3iBK97SRjQzF');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const otpStore = new Map();
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) otpStore.delete(email);
  }
}, 5 * 60 * 1000);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AI Receptionist Server is running ✅' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = otpStore.get(normalizedEmail);
    if (existing && Date.now() < existing.expiresAt - (OTP_EXPIRY_MS - 60000)) {
      return res.status(429).json({ success: false, message: 'Wait 60 seconds before requesting a new code.' });
    }

    const otp = generateOTP();
    otpStore.set(normalizedEmail, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS, attempts: 0 });

    const { error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'AI Receptionist <info@marketlly.shop>',
      to: normalizedEmail,
      subject: `${otp} — Your AI Receptionist login code`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#eef1f8;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(99,102,241,.12);">
                <tr>
                  <td style="background:linear-gradient(135deg,#5b5ef4,#7c3aed);padding:32px;text-align:center;">
                    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">AI Receptionist</h1>
                    <p style="color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px;">Your verification code</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;text-align:center;">
                    <p style="color:#7077a1;font-size:14px;margin:0 0 24px;">Use the code below to sign in. Expires in <strong>10 minutes</strong>.</p>
                    <div style="background:#f0f2ff;border:2px dashed #c7c9f9;border-radius:14px;padding:24px;margin-bottom:24px;">
                      <span style="font-size:42px;font-weight:800;letter-spacing:10px;color:#5b5ef4;font-family:'Courier New',monospace;">${otp}</span>
                    </div>
                    <p style="color:#7077a1;font-size:12px;margin:0;">If you didn't request this, ignore this email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8f9ff;padding:16px 40px;text-align:center;border-top:1px solid #eef1f8;">
                    <p style="color:#9098c0;font-size:11px;margin:0;">AI Receptionist Portal • Secure Login</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ success: false, message: 'Failed to send email.' });
    }

    console.log(`✅ OTP sent to ${normalizedEmail}`);
    res.json({ success: true, message: 'Verification code sent to your email.' });

  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({ success: false, message: 'No code found. Please request a new one.' });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ success: false, message: 'Code expired. Please request a new one.' });
    }

    record.attempts += 1;
    if (record.attempts > MAX_ATTEMPTS) {
      otpStore.delete(normalizedEmail);
      return res.status(429).json({ success: false, message: 'Too many attempts. Request a new code.' });
    }
    if (record.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: `Invalid code. ${MAX_ATTEMPTS - record.attempts} attempt(s) remaining.` });
    }

    otpStore.delete(normalizedEmail);
    console.log(`✅ Login verified for ${normalizedEmail}`);
    res.json({ success: true, message: 'Verified successfully.' });

  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
});
