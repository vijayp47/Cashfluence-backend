// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const messages = require('../constants/Messages');
const authenticateUser = (req, res, next) => {
 
  const token = req.header('Authorization')?.split(' ')[1]; // Extract token from "Bearer <token>"


  if (!token) {
    return res.status(401).json({ message: messages?.NO_TOKEN  });
  }

  try {
   
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
    req.user = decoded; // Attach decoded payload to `req.user`
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
  
    res.status(401).json({ message: messages?.INVALID_TOKEN ,err });
  }
};

/**
 * Authenticate admin middleware
 * Ensures the user is authenticated and has the `admin` role.
 */
const authenticateAdmin = (req, res, next) => {
  authenticateUser(req, res, () => {
   
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: messages?.MIDDLEWARE_ADMIN_ERROR });
    } 
    next(); // Proceed if the user has the 'admin' role
  });
};

module.exports = { authenticateUser, authenticateAdmin };
