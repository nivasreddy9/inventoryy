import nodemailer from 'nodemailer';

// Create transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465, // use 465 for secure SSL
  secure: true,
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS  // your Gmail APP PASSWORD (not normal password)
  }
});

// Verify connection at startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Connection Error:", error.message);
  } else {
    console.log("✅ Mail server is ready to send emails");
  }
});

// Function to send OTP email
export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"MyApp Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}. It expires in 10 minutes.`
  };

  console.log(`📨 Sending OTP to ${email}: ${otp}`);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully:', info.response);
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message, error.response);
  }
};
