const nodemailer = require('nodemailer');

const sendOTPEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: '"CodeShare Cloud" <noreply@codeshare.com>',
        to: email,
        subject: 'Your Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #5D5FEF;">Verify Your Account</h2>
                <p>Use the 6-digit code below to complete your registration:</p>
                <h1 style="background: #f4f4f4; display: inline-block; padding: 10px 20px; border-radius: 5px; letter-spacing: 5px;">${otp}</h1>
                <p style="color: #888; font-size: 12px; margin-top: 20px;">Valid for 10 minutes.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };