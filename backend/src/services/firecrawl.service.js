import axios from "axios";

export async function scrapeWithFirecrawl(
  url,
  formats = ["branding", "screenshot"],
) {
  const response = await axios.post(
    "https://api.firecrawl.dev/v2/scrape",
    {
      url,
      formats,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 120000,
    },
  );

  if (process.env.NODE_ENV === "development" && process.env.DEBUG_FIRECRAWL) {
    console.log("Firecrawl response:", JSON.stringify(response.data, null, 2));
  }

  if (!response.data?.success) {
    throw new Error("Firecrawl scrape failed");
  }

  return response.data.data;
}
