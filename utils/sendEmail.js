const nodemailer = require('nodemailer');

/**
 * Creates a reusable transporter object using Gmail SMTP.
 * Defined outside the function to reuse the connection pool (Better performance).
 */
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use SSL for port 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // 16-character App Password
    },
    // Adding pool: true improves performance for multiple emails
    pool: true,
    maxConnections: 5,
    maxMessages: 100
});

/**
 * Sends an OTP email.
 * @param {string} email - Recipient's email address
 * @param {string} otp - The 6-digit verification code
 * @returns {Promise} - Resolves on success, throws on error
 */
const sendOTPEmail = async (email, otp) => {
    try {
        console.log(`--- Email Service: Attempting to send OTP to ${email} ---`);

        // Verify the connection is still alive
        await transporter.verify();
        console.log("SMTP Connection verified! ✅");

        const mailOptions = {
            from: {
                name: 'CodeShare Cloud',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: `${otp} is your verification code`, // Subject starts with OTP to grab attention
            text: `Your verification code is ${otp}. It is valid for 10 minutes.`, // Plain text version for accessibility
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
                    <div style="background-color: #5D5FEF; padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Verify Your Identity</h1>
                    </div>
                    <div style="padding: 40px 20px; text-align: center; background-color: #ffffff;">
                        <p style="font-size: 16px; color: #333333; margin-bottom: 25px;">Hello,</p>
                        <p style="font-size: 16px; color: #555555; margin-bottom: 30px;">Thank you for joining CodeShare Cloud. Use the security code below to complete your registration:</p>
                        <div style="background: #f8f9fa; display: inline-block; padding: 20px 40px; border-radius: 8px; border: 2px dashed #5D5FEF; margin-bottom: 30px;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #333333;">${otp}</span>
                        </div>
                        <p style="font-size: 14px; color: #888888;">This code is valid for <b>10 minutes</b>. If you did not request this, please ignore this email.</p>
                    </div>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #999999;">
                        &copy; 2026 CodeShare Cloud. All rights reserved.
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email Success: Message ID " + info.messageId);
        return { success: true, info };

    } catch (error) {
        console.error("CRITICAL NODEMAILER ERROR:", error.message);
        // Throwing a cleaner error message
        throw new Error(`SMTP_SERVICE_ERROR: ${error.message}`);
    }
};

module.exports = { sendOTPEmail };