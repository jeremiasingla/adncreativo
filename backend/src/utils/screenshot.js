import fs from "fs";
import path from "path";
import axios from "axios";

export async function saveScreenshot(screenshot, slug) {
  if (!screenshot) return null;

  const dir = process.env.SCREENSHOT_DIR || "./storage/screenshots";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = `${slug}.png`;
  const filepath = path.join(dir, filename);

  if (screenshot.startsWith("data:")) {
    const match = screenshot.match(/^data:(.+);base64,(.*)$/);
    if (!match) return null;
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(filepath, buffer);
    return filepath;
  }

  if (screenshot.startsWith("http://") || screenshot.startsWith("https://")) {
    const response = await axios.get(screenshot, {
      responseType: "arraybuffer",
    });
    fs.writeFileSync(filepath, response.data);
    return filepath;
  }

  return null;
}
