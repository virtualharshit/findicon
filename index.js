const express = require("express");
// const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { URL } = require("url");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());




app.post("/icon", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const body = await response.text();

    const $ = cheerio.load(body);

    const baseUrl = new URL(url);

    const icons = [];

    $(
      'link[rel~="apple-touch-icon"], link[rel~="apple-touch-icon-precomposed"]'
    ).each((index, element) => {
      const src = $(element).attr("href");
      if (src) {
        const resolvedUrl = new URL(src, baseUrl).toString();
        icons.push({ src: resolvedUrl, type: "apple" });
        console.log(`Found apple-touch-icon: ${resolvedUrl}`);
      }
    });

    if (icons.length === 0) {
      $('link[rel~="icon"]').each((index, element) => {
        const src = $(element).attr("href");
        const sizes = $(element).attr("sizes");
        if (src) {
          const resolvedUrl = new URL(src, baseUrl).toString();
          const format = resolvedUrl.endsWith(".svg") ? "svg" : "png";
          if (sizes) {
            const [width, height] = sizes.split("x").map(Number);
            if (width >= 64 && height >= 64 && width <= 512 && height <= 512) {
              icons.push({ src: resolvedUrl, width, height, format });
              console.log(
                `Found favicon with size: ${width}x${height} - ${resolvedUrl}`
              );
            }
          } else if (format === "svg") {
            icons.push({ src: resolvedUrl, width: 32, height: 32, format });
            console.log(`Found SVG favicon with no size: ${resolvedUrl}`);
          } else {
            icons.push({ src: resolvedUrl, width: 32, height: 32, format });
            console.log(`Found PNG favicon with no size: ${resolvedUrl}`);
          }
        }
      });

      icons.sort((a, b) => b.width * b.height - a.width * a.height);
    }

    const validIcons = icons.filter(
      (icon) =>
        icon.type === "apple" ||
        (icon.width >= 64 && icon.height >= 64) ||
        (icon.format === "svg" && icon.width >= 32 && icon.height >= 32)
    );
    const svgIcons = validIcons.filter((icon) => icon.format === "svg");
    const pngIcons = validIcons.filter((icon) => icon.format === "png");

    if (svgIcons.length > 0) {
      res.json({ bestIcon: svgIcons[0].src });
    } else if (pngIcons.length > 0) {
      res.json({ bestIcon: pngIcons[0].src });
    } else if (validIcons.length > 0) {
      res.json({ bestIcon: validIcons[0].src });
    } else {
      res.status(404).json({ error: "No suitable icons found" });
    }
  } catch (error) {
    console.error("Error fetching URL:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
