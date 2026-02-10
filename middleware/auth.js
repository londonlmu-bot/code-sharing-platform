const jwt = require('jsonwebtoken');

// Middleware function to verify JWT token
module.exports = (req, res, next) => {
    // Get token from header
    const token = req.header('authorization');

    // Check if no token
    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
        // Verify token using the secret key from .env file
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add user from payload to request object
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};
