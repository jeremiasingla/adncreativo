import { scrapeWithFirecrawl } from "../services/firecrawl.service.js";
import { generateWorkspaceSlug } from "../utils/slug.js";
import { saveScreenshot } from "../utils/screenshot.js";

export async function createScreenshot(req, res) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required",
      });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid URL",
      });
    }

    const slug = generateWorkspaceSlug(url);
    const screenshotData = await scrapeWithFirecrawl(url, ["screenshot"]);
    const screenshot = screenshotData.screenshot || null;
    const screenshotPath = await saveScreenshot(screenshot, slug);

    return res.status(201).json({
      success: true,
      data: {
        url: parsedUrl.href,
        screenshotPath,
      },
    });
  } catch (error) {
    console.error("❌ Error creating screenshot:", error.message);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
