const nodemailer = require('nodemailer');

/**
 * Sends an OTP email using Gmail SMTP.
 * Optimized for cloud environments like Railway.
 */
const sendOTPEmail = async (email, otp) => {
    try {
        console.log("--- Starting Email Service ---");
        
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true, 
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS // 16-character App Password (No Spaces)
            }
        });

        // Verify the connection configuration before sending
        await transporter.verify();
        console.log("SMTP Connection verified successfully! ✅");

        const mailOptions = {
            from: `"CodeShare Cloud" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Verification Code - CodeShare Cloud',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
                    <h2 style="color: #5D5FEF;">Verify Your Account</h2>
                    <p style="color: #555;">Use the 6-digit code below to complete your registration:</p>
                    <h1 style="background: #f4f4f4; display: inline-block; padding: 15px 30px; border-radius: 8px; letter-spacing: 8px; color: #333; margin: 20px 0;">${otp}</h1>
                    <p style="color: #888; font-size: 12px; margin-top: 20px;">This code is valid for 10 minutes.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully: " + info.response);
        return info;

    } catch (error) {
        console.error("CRITICAL NODEMAILER ERROR:", error.message);
        throw new Error(error.message);
    }
};

module.exports = { sendOTPEmail };