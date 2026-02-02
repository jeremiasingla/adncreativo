/**
 * Requiere que el usuario esté autenticado y sea admin.
 * Debe usarse después de authMiddleware.
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Solo administradores pueden acceder a este recurso" });
  }
  next();
}
