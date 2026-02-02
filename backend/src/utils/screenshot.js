import fs from "fs";
import path from "path";
import axios from "axios";
import { uploadToBlob, useBlob } from "./blobStorage.js";

export async function saveScreenshot(screenshot, slug) {
  if (!screenshot) return null;

  let buffer = null;
  if (screenshot.startsWith("data:")) {
    const match = screenshot.match(/^data:(.+);base64,(.*)$/);
    if (!match) return null;
    buffer = Buffer.from(match[2], "base64");
  } else if (screenshot.startsWith("http://") || screenshot.startsWith("https://")) {
    const response = await axios.get(screenshot, { responseType: "arraybuffer" });
    buffer = Buffer.from(response.data);
  }
  if (!buffer) return null;

  if (useBlob) {
    const url = await uploadToBlob(buffer, `screenshots/${slug}.png`, "image/png");
    return url;
  }

  const dir = process.env.SCREENSHOT_DIR || "./storage/screenshots";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filepath = path.join(dir, `${slug}.png`);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}
