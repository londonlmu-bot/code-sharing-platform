const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet'); // Added for basic security headers
require('dotenv').config();

// --- MODELS ---
const User = require('./models/User');
const Project = require('./models/Project'); 
const { sendOTPEmail } = require('./utils/sendEmail');

const app = express();

// --- MIDDLEWARE ---
app.use(helmet()); // Protects app from some well-known web vulnerabilities
app.use(express.json());
app.use(cors({
    origin: '*', // For production, replace '*' with your specific frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- DATABASE CONNECTION ---
// Suppress deprecation warnings globally
mongoose.set('strictQuery', false);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB Cloud 🚀");
    } catch (err) {
        console.error("CRITICAL: MongoDB Connection Failed!", err.message);
        process.exit(1); // Stop server if DB fails
    }
};
connectDB();

// --- AUTH ROUTES ---

/**
 * @route   POST /register
 * @desc    Registers user, hashes password, and sends OTP email
 */
app.post('/register', async (req, res) => {
    console.log("--- START: Registration Process ---");
    try {
        const { name, email, password } = req.body;

        // Basic Validation
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required!" });
        }

        // Generate Salt and Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        console.log("Step 1: DB Upsert (Create or Update)...");
        
        /* Using findOneAndUpdate with returnDocument: 'after' 
           This is the MODERN way to handle this without warnings.
        */
        const user = await User.findOneAndUpdate(
            { email }, 
            { name, email, password: hashedPassword, otp, isVerified: false },
            { upsert: true, returnDocument: 'after', runValidators: true } 
        );
        
        console.log("Step 1 Complete: User saved to DB ✅");

        // Step 2: Email Dispatch
        console.log(`Step 2: Dispatching OTP to: ${email}`);
        try {
            await sendOTPEmail(email, otp);
            console.log("Step 2 Complete: OTP Email Dispatched 🚀");
            
            return res.status(201).json({ 
                success: true, 
                message: "Registration successful! OTP sent to your email." 
            });
        } catch (emailError) {
            console.error("NODE_MAILER_CRASH:", emailError.message);
            return res.status(500).json({ 
                success: false,
                message: "User saved, but email failed. Check SMTP credentials.", 
                error: emailError.message 
            });
        }

    } catch (err) {
        console.error("FATAL ERROR IN REGISTER ROUTE:", err);
        res.status(500).json({ 
            success: false,
            message: "Internal Server Error", 
            error: err.message 
        });
    }
});

/**
 * @route   POST /verify-otp
 * @desc    Verify user email using the 6-digit code
 */
app.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email, otp });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid OTP or Email!" });
        }

        user.isVerified = true;
        user.otp = null; // Clear OTP after success
        await user.save();

        res.status(200).json({ success: true, message: "Account verified successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Verification failed", error: err.message });
    }
});

/**
 * @route   POST /login
 * @desc    Authenticate user & return JWT token
 */
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid Credentials" });
        }

        // Check verification status
        if (!user.isVerified) {
            return res.status(401).json({ success: false, message: "Please verify your email first!" });
        }

        // Validate Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid Credentials" });
        }

        // Sign JWT Token
        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing!");

        const token = jwt.sign(
            { id: user._id, name: user.name }, 
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ 
            success: true,
            token, 
            user: { name: user.name, email: user.email } 
        });

    } catch (err) {
        console.error("LOGIN_ERROR:", err.message);
        res.status(500).json({ success: false, message: "Server error during login" });
    }
});

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
});