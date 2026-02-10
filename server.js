const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Snippet = require('./models/Snippet');
const Project = require('./models/Project'); // Import Project Model
const { sendOTPEmail } = require('./utils/sendEmail');

const app = express();
app.use(express.json());
app.use(cors());

// --- ROUTES CONNECTION ---
// Connecting the external snippets route file for versioning and comments
app.use('/snippets', require('./routes/snippets'));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB Cloud 🚀"))
    .catch(err => console.log("DB Connection Error:", err));

// --- AUTH ROUTES ---

// 1. Register & Send OTP
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Update or Create user with OTP
        await User.findOneAndUpdate(
            { email }, 
            { name, email, password: hashedPassword, otp, isVerified: false },
            { upsert: true, new: true }
        );

        await sendOTPEmail(email, otp);
        res.status(201).json({ message: "OTP sent to your email!" });
    } catch (err) {
        res.status(500).json({ message: "Registration failed!" });
    }
});

// 2. Verify OTP Route
app.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email, otp });

        if (!user) return res.status(400).json({ message: "Invalid OTP code!" });

        user.isVerified = true;
        user.otp = null; // Clear OTP after success
        await user.save();

        res.json({ message: "Account verified successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Verification error" });
    }
});

// 3. Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !user.isVerified) {
            return res.status(401).json({ message: "User not found or not verified!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials!" });

        // Included user name in payload for easier comment handling in routes
        const token = jwt.sign({ id: user._id, name: user.name }, process.env.JWT_SECRET);
        res.json({ token, user: { name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ message: "Login error" });
    }
});

// --- PROJECT MANAGEMENT ROUTES ---

// 1. Create a new project
app.post('/projects', async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { projectName, description } = req.body;
        
        const newProject = new Project({
            projectName,
            description,
            owner: decoded.id,
            members: [],
            pendingMembers: [] 
        });
        await newProject.save();
        res.status(201).json(newProject);
    } catch (err) { res.status(500).json({ message: "Error creating project" }); }
});

// 2. Get all projects (Where user is owner or an accepted member)
app.get('/projects', async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        const projects = await Project.find({
            $or: [ { owner: decoded.id }, { members: user.email } ]
        });
        res.json(projects);
    } catch (err) { res.status(500).json({ message: "Error fetching projects" }); }
});

// 3. Invite a member (Add to pendingMembers list)
app.post('/projects/:id/invite', async (req, res) => {
    try {
        const token = req.headers['authorization'];
        jwt.verify(token, process.env.JWT_SECRET);
        
        const { email } = req.body;
        const project = await Project.findById(req.params.id);
        
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Add to pending only if not already a member or already invited
        if (!project.members.includes(email) && !project.pendingMembers.includes(email)) {
            project.pendingMembers.push(email);
            await project.save();
        }
        res.json({ message: "Invitation sent!" });
    } catch (err) { res.status(500).json({ message: "Error inviting member" }); }
});

// 4. Get Invitations for the logged-in user
app.get('/my-invitations', async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        // Find projects where the user's email is in the pending list
        const invitations = await Project.find({ pendingMembers: user.email });
        res.json(invitations);
    } catch (err) { res.status(500).json({ message: "Error fetching invitations" }); }
});

// 5. Accept Invitation
app.post('/projects/:id/accept', async (req, res) => {
    try {
        const token = req.headers['authorization'];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Move email from pendingMembers to members
        project.pendingMembers = project.pendingMembers.filter(e => e !== user.email);
        if (!project.members.includes(user.email)) {
            project.members.push(user.email);
        }
        await project.save();
        
        res.json({ message: "Invitation accepted!" });
    } catch (err) { res.status(500).json(err); }
});

// Starting the server on port 5000
app.listen(5000, () => console.log("Server running on port 5000"));


