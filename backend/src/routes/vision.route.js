import express from "express";
import {
  analyzeImage,
  getReferenceGallery,
  createReferenceGalleryItem,
} from "../controllers/vision.controller.js";

const router = express.Router();

router.get("/vision/reference-gallery", getReferenceGallery);
router.post("/vision/reference-gallery", createReferenceGalleryItem);
router.post("/vision/analyze-image", analyzeImage);

export default router;
