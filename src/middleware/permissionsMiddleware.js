const permissionsMiddleware = (req, res, next) => {
  // Example: Check if user is an admin
  if (req.user && req.user.role === "admin") {
    // If user is an admin, grant access
    next();
  } else {
    // If user is not an admin, deny access with a 403 Forbidden status
    return res.status(403).json({ error: "Access forbidden" });
  }
};

module.exports = permissionsMiddleware;
