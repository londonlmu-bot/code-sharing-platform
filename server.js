const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// --- MODELS ---
const User = require('./models/User');
const Project = require('./models/Project'); 
const { sendOTPEmail } = require('./utils/sendEmail');

const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- DATABASE CONNECTION ---
// Set strictQuery to suppress global warnings
mongoose.set('strictQuery', false);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB Cloud 🚀"))
    .catch(err => console.error("DB Connection Error:", err));

// --- AUTH ROUTES ---

// 1. Register & Send OTP
app.post('/register', async (req, res) => {
    console.log("--- New Registration Request Received ---");
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        console.log("Step 1: Updating User in Database...");
        
        /**
         * FIX: We use returnDocument: 'after' and COMPLETELY REMOVED { new: true }
         * This ensures the deprecation warning you saw disappears.
         */
        await User.findOneAndUpdate(
            { email }, 
            { name, email, password: hashedPassword, otp, isVerified: false },
            { upsert: true, returnDocument: 'after' } 
        );
        console.log("Step 1 Complete: DB Updated ✅");

        console.log(`Step 2: Triggering Email Service for: ${email}`);
        
        // Critical: Sub-catch block to pinpoint exactly why the email fails
        try {
            await sendOTPEmail(email, otp);
            console.log("Step 2 Complete: Email Sent successfully 🚀");
        } catch (emailError) {
            console.error("EMAIL SERVICE FAILED:", emailError.message);
            // This stops the process and tells you if it's an App Password issue
            return res.status(500).json({ 
                message: "Email service failed. Check Gmail credentials.", 
                error: emailError.message 
            });
        }
        
        res.status(201).json({ message: "OTP sent to your email!" });

    } catch (err) {
        console.error("!!!!!!!! REGISTER ROUTE CRASHED !!!!!!!! ");
        console.error("Error Message:", err.message);
        console.error("Full Stack Trace:", err.stack); 
        console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

        res.status(500).json({ 
            message: "Registration failed on server!", 
            error: err.message 
        });
    }
});

// 2. Verify OTP Route
app.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email, otp });

        if (!user) return res.status(400).json({ message: "Invalid OTP code!" });

        user.isVerified = true;
        user.otp = null; 
        await user.save();

        res.json({ message: "Account verified successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Verification error", error: err.message });
    }
});

// 3. Login Route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !user.isVerified) {
            return res.status(401).json({ message: "User not found or not verified!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials!" });

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing in environment variables!");
        }

        const token = jwt.sign(
            { id: user._id, name: user.name }, 
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        
        res.json({ token, user: { name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ message: "Login error", error: err.message });
    }
});

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));