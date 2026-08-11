const jwt = require('jsonwebtoken');
const db = require('../db/store');

const JWT_SECRET = process.env.JWT_SECRET || 'butler_super_secret_jwt_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // If no token provided, try to fallback to default session user if available, or return 401
    return res.status(401).json({ success: false, error: 'Access token required. Please login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token.' });
    }
    const user = db.findUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }
    req.user = user;
    next();
  });
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
  authenticateToken,
  generateToken,
  JWT_SECRET
};
