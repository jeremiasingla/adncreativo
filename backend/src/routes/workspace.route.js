import express from "express";
import {
  listWorkspaces,
  getWorkspaceBySlug,
  getWorkspaceCampaigns,
  getWorkspaceHeadlines,
  createWorkspace,
  deleteWorkspace,
  captureWorkspaceScreenshot,
  updateWorkspaceKnowledgeBase,
  generateCustomerProfileImages,
  regenerateAllCustomerProfileImages,
  generateCreatives,
  getCreativeVersions,
  runFullWorkspaceGeneration,
  getCreativeVersionsByOrgId,
} from "../controllers/workspace.controller.js";
import { createScreenshot } from "../controllers/screenshot.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/workspaces", authMiddleware, listWorkspaces);
router.get("/workspaces/:slug/headlines", authMiddleware, getWorkspaceHeadlines);
router.get("/workspaces/:slug/campaigns", authMiddleware, getWorkspaceCampaigns);
router.get("/workspaces/:slug", authMiddleware, getWorkspaceBySlug);
router.post("/workspaces/screenshot", authMiddleware, captureWorkspaceScreenshot);
router.post("/workspaces/new", authMiddleware, createWorkspace);
router.post(
  "/workspaces/:slug/run-full-generation",
  authMiddleware,
  runFullWorkspaceGeneration,
);
router.delete("/workspaces/:slug", authMiddleware, deleteWorkspace);
router.patch("/workspaces/:slug/knowledge-base", authMiddleware, updateWorkspaceKnowledgeBase);
router.post("/workspaces/:slug/customer-profiles/regenerate-all-images", authMiddleware, regenerateAllCustomerProfileImages);
router.post("/workspaces/:slug/customer-profiles/:profileId/generate-images", authMiddleware, generateCustomerProfileImages);
router.get("/workspaces/:slug/creatives/versions", authMiddleware, getCreativeVersions);
router.post("/workspaces/:slug/creatives", authMiddleware, generateCreatives);
router.post("/screenshot", createScreenshot);
router.get("/creatives/versions", authMiddleware, getCreativeVersionsByOrgId);

export default router;
