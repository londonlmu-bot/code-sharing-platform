const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Please provide a name'], // Added custom error message
        trim: true, // Removes whitespace from ends
        maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: { 
        type: String, 
        required: [true, 'Please provide an email'], 
        unique: true, 
        lowercase: true, // Always store email in lowercase to prevent duplicates
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ] // Regex validation for email format
    },
    password: { 
        type: String, 
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    otp: { 
        type: String,
        default: null // Explicitly setting default as null
    },
    createdAt: {
        type: Date,
        default: Date.now // Good for tracking when the user registered
    }
}, {
    timestamps: true // Automatically adds updatedAt and createdAt fields
});

module.exports = mongoose.model('User', UserSchema);