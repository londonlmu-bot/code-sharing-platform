const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false }, // මුලින්ම verify වෙලා නැහැ [cite: 31]
    otp: { type: String } // Email එකට යවන code එක 
});

module.exports = mongoose.model('User', UserSchema);