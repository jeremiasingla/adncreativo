import { clerkClient, getAuth } from "@clerk/express";

export async function authMiddleware(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const role =
      clerkUser.publicMetadata?.role ||
      clerkUser.privateMetadata?.role ||
      clerkUser.unsafeMetadata?.role ||
      "user";
    req.user = {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || null,
      name: clerkUser.fullName || clerkUser.firstName || null,
      role,
    };
    return next();
  } catch (err) {
    console.error("❌ authMiddleware clerk:", err?.message);
    return res.status(401).json({ error: "unauthorized" });
  }
}
