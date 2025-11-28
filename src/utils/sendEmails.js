const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (to, subject, text) => {
  try {
    const mailOptions = {
      from: `"Doc App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
  }
};

module.exports = sendEmail;
