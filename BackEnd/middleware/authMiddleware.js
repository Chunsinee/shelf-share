
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
  
  const token = req.header('Authorization');

  
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    
    const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

    
    const decoded = jwt.verify(tokenString, process.env.JWT_SECRET || 'your_jwt_secret');

    
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};