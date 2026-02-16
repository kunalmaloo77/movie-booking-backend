const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByEmail } = require('../models/userModel');

const adminLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Admin login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { adminLogin };
