export const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    // Support both req.user (from protect middleware) and req.admin
    const user = req.user || req.admin;

    if (!user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    if (user.role === "superadmin") {
      return next(); // superadmin has all permissions implicitly
    }

    if (user.permissions && user.permissions.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: Bạn không có quyền ${requiredPermission}`,
    });
  };
};

export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    // Support both req.user (from protect middleware) and req.admin
    const user = req.user || req.admin;

    if (!user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    // superadmin passes all role checks
    if (user.role === "superadmin") {
      return next();
    }

    if (user.role === requiredRole) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: Yêu cầu quyền ${requiredRole}`,
    });
  };
};
