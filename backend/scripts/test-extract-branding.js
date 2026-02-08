/**
 * Prueba de extracción de branding e imágenes con Firecrawl.
 * Uso: node -r dotenv/config scripts/test-extract-branding.js [URL]
 * Ejemplo: node -r dotenv/config scripts/test-extract-branding.js "https://metododetailer.com/products/metodo-detailer"
 */

const url =
  process.argv[2] || "https://metododetailer.com/products/metodo-detailer";

function isProductOrLandingUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const path = new URL(urlStr).pathname.toLowerCase();
    return (
      /\/products?\//.test(path) ||
      /^\/p\//.test(path) ||
      /\/landing/.test(path) ||
      /\/lp\b/.test(path) ||
      /\/oferta/.test(path) ||
      /\/compra/.test(path)
    );
  } catch (_) {
    return false;
  }
}

async function main() {
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error("❌ Falta FIRECRAWL_API_KEY en .env");
    process.exit(1);
  }

  const { scrapeWithFirecrawl } = await import("../src/services/firecrawl.service.js");

  console.log("🔗 URL:", url);
  console.log("📦 Formato: branding + images\n");

  try {
    const scrapeData = await scrapeWithFirecrawl(url, ["branding", "images"]);
    const branding = scrapeData.branding || {};
    const brandingMetadata = scrapeData.metadata || {};
    const allImages = scrapeData.images || [];

    const logo = branding?.images?.logo || null;
    const favicon = branding?.images?.favicon || null;
    const ogImage = branding?.images?.ogImage || null;
    const logoAlt = branding?.images?.logoAlt || null;

    const images = Array.from(
      new Set(
        allImages.filter(
          (img) =>
            img &&
            !img.startsWith("data:") &&
            img !== logo &&
            img !== favicon &&
            img !== ogImage
        )
      )
    );

    const isProduct = isProductOrLandingUrl(url);
    let productImage = null;
    if (isProduct) {
      productImage = ogImage || (images.length > 0 ? images[0] : null);
    }

    console.log("--- BRANDING (Firecrawl) ---");
    console.log("companyName:", branding.companyName ?? "(no extraído)");
    console.log("headline:", branding.headline ?? "(no extraído)");
    console.log("\n--- IMÁGENES EN branding.images ---");
    console.log("logo:", logo ? logo.slice(0, 80) + (logo.length > 80 ? "…" : "") : "(null)");
    console.log("favicon:", favicon ? favicon.slice(0, 80) + "…" : "(null)");
    console.log("ogImage:", ogImage ? ogImage.slice(0, 80) + (ogImage.length > 80 ? "…" : "") : "(null)");
    console.log("logoAlt:", logoAlt ? logoAlt.slice(0, 80) + "…" : "(null)");

    console.log("\n--- metadata (título, descripción) ---");
    console.log("title:", brandingMetadata.title ?? "(null)");
    console.log("ogTitle:", brandingMetadata.ogTitle ?? "(null)");
    console.log("description:", brandingMetadata.description ? brandingMetadata.description.slice(0, 120) + "…" : "(null)");

    console.log("\n--- scrapeData.images (total:", allImages.length, ") ---");
    allImages.slice(0, 15).forEach((img, i) => {
      const s = typeof img === "string" ? img : img?.url || String(img);
      console.log(`  [${i}]`, s.slice(0, 90) + (s.length > 90 ? "…" : ""));
    });
    if (allImages.length > 15) console.log("  ... y", allImages.length - 15, "más");

    console.log("\n--- Lógica actual (createWorkspace) ---");
    console.log("isProductOrLandingUrl:", isProduct);
    console.log("images (sin logo/favicon/ogImage), count:", images.length);
    console.log("productImage elegida:", productImage ? productImage.slice(0, 90) + (productImage.length > 90 ? "…" : "") : "(null)");

    if (productImage) {
      console.log("\n✅ Imagen de producto asignada (para creativos/asset locking).");
    } else if (isProduct) {
      console.log("\n⚠️ URL de producto pero no se asignó productImage (ogImage e images[0] vacíos o no encontrados).");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.response?.data) {
      console.error("Detalle:", JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
