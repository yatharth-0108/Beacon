const express = require("express");
const multer = require("multer");
const cheerio = require("cheerio");
const fastapiClient = require("../services/fastapiClient");
const { verifyClaimEvidence } = require("../services/evidenceVerifier");
const { upsertCheck } = require("../models/Check");
const { sha256 } = require("../utils/hash");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file format. Please upload JPG, PNG, or WEBP image."));
    }
  },
});

/**
 * Hybrid Verification: Combines Evidence-Based Fact Verification with ML Writing-Style Analysis.
 * Strict rule: Never confuse writing style with factual truth.
 */
async function analyzeStory(cleanText) {
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

  // 1. Run factual claim evidence verification against authoritative public records
  let evidence = { verdict: "INSUFFICIENT EVIDENCE", sources: [], explanation: "" };
  try {
    evidence = await verifyClaimEvidence(cleanText);
  } catch (evErr) {
    console.warn("Evidence verification check failed:", evErr.message);
  }

  // 2. If evidence directly CONTRADICTS or SUPPORTS the claim, prioritize factual evidence
  if (evidence.verdict === "CONTRADICTED") {
    return {
      label: "CONTRADICTED",
      verdict: "CONTRADICTED",
      fake_score: evidence.fake_score || 0.98,
      confidence: evidence.confidence || 0.98,
      is_factual_check: true,
      explanation: evidence.explanation,
      sources: evidence.sources || [],
      model_version: "2026-10-09-evidence-v2",
      disclaimer:
        "Factual Claim Verification: Public health, scientific, and encyclopedic records directly contradict this claim.",
    };
  }

  if (evidence.verdict === "SUPPORTED") {
    return {
      label: "SUPPORTED",
      verdict: "SUPPORTED",
      fake_score: evidence.fake_score || 0.04,
      confidence: evidence.confidence || 0.96,
      is_factual_check: true,
      explanation: evidence.explanation,
      sources: evidence.sources || [],
      model_version: "2026-10-09-evidence-v2",
      disclaimer: "Factual Claim Verification: Aligns with established scientific and public record consensus.",
    };
  }

  // 3. If evidence is INSUFFICIENT, do not treat short claims or isolated sentences as REAL!
  if (cleanText.length < 250 || wordCount < 35) {
    return {
      label: "UNCERTAIN",
      verdict: "INSUFFICIENT EVIDENCE",
      fake_score: 0.5,
      confidence: 0.5,
      is_factual_check: false,
      explanation:
        "No definitive factual evidence was retrieved to confirm or contradict this claim. A short statement lacks sufficient length for reliable writing-pattern classification.",
      sources: evidence.sources || [],
      model_version: "2026-10-09-hybrid-v2",
      disclaimer: "Factual evidence inconclusive; independent verification advised.",
    };
  }

  // 4. Substantive article text (>= 250 characters, >= 35 words) -> Run ML linguistic style classifier
  try {
    const rawPrediction = await fastapiClient.predict(cleanText);
    const fakeScore = typeof rawPrediction.fake_score === "number" ? rawPrediction.fake_score : 0.5;

    if (fakeScore > 0.55) {
      return {
        label: "FAKE",
        verdict: "UNRELIABLE STYLE",
        fake_score: fakeScore,
        confidence: fakeScore,
        is_factual_check: false,
        explanation:
          "Linguistic pattern analysis indicates sensationalist or unsubstantiated writing structures typical of unreliable reporting.",
        sources: evidence.sources || [],
        model_version: rawPrediction.model_version || "2026-09-30-lr-v1",
        disclaimer: "Automated model prediction based on writing patterns; not a verified fact-check.",
      };
    } else if (fakeScore < 0.45) {
      return {
        label: "REAL",
        verdict: "JOURNALISTIC STYLE",
        fake_score: fakeScore,
        confidence: 1 - fakeScore,
        is_factual_check: false,
        explanation:
          "Linguistic pattern analysis indicates standard journalistic writing structure. (Specific factual claims within the article must still be verified independently).",
        sources: evidence.sources || [],
        model_version: rawPrediction.model_version || "2026-09-30-lr-v1",
        disclaimer: "Automated model prediction based on writing patterns; not a verified fact-check.",
      };
    } else {
      return {
        label: "UNCERTAIN",
        verdict: "INCONCLUSIVE",
        fake_score: fakeScore,
        confidence: 0.5,
        is_factual_check: false,
        explanation:
          "Inconclusive verdict: Writing style is ambiguous (borderline 50%), and no direct factual verification was found.",
        sources: evidence.sources || [],
        model_version: rawPrediction.model_version || "2026-09-30-lr-v1",
        disclaimer: "Inconclusive writing patterns; independent fact-checking recommended.",
      };
    }
  } catch (mlErr) {
    console.error("ML model call failed:", mlErr.message);
    return {
      label: "UNCERTAIN",
      verdict: "INSUFFICIENT EVIDENCE",
      fake_score: 0.5,
      confidence: 0.5,
      is_factual_check: false,
      explanation: "Could not complete full linguistic classification; factual evidence was inconclusive.",
      sources: evidence.sources || [],
      model_version: "2026-10-09-fallback",
      disclaimer: "Service status: fallback mode.",
    };
  }
}

/**
 * Safely extract readable article title and text from an external URL.
 */
async function extractArticleFromUrl(targetUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid URL protocol. Only HTTP and HTTPS URLs are supported.");
    }
  } catch (e) {
    throw new Error("Please provide a valid URL starting with http:// or https://");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let response;
  try {
    response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BeaconNewsroom/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } catch (netErr) {
    clearTimeout(timeoutId);
    if (netErr.name === "AbortError") {
      throw new Error("Request timed out while trying to fetch the article URL.");
    }
    throw new Error(`Could not connect to URL (${netErr.message || "Network error"}).`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch article: HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  if (!html || html.length < 50) {
    throw new Error("The target URL returned an empty response.");
  }

  const $ = cheerio.load(html);

  // Remove non-content elements
  $("script, style, noscript, iframe, svg, header, footer, nav, aside, .ad, .ads, .sidebar, .comments").remove();

  // Extract title
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").text() ||
    $("h1").first().text() ||
    "";

  // Extract body paragraphs
  let paragraphs = [];
  const articleEl = $("article, main, [role='main'], .article-body, .story-body, .post-content, .entry-content");
  const targetScope = articleEl.length > 0 ? articleEl : $("body");

  targetScope.find("p").each((_, el) => {
    const pText = $(el).text().trim();
    if (pText.length > 25) {
      paragraphs.push(pText);
    }
  });

  const fullText = paragraphs.join("\n\n").trim();

  if (fullText.length < 50) {
    throw new Error(
      "Could not extract sufficient readable article text from this URL. The content may be paywalled, require login, or rely on JavaScript rendering."
    );
  }

  return {
    title: title.trim().replace(/\s+/g, " "),
    text: fullText,
  };
}

// -------------------------------------------------------------
// POST /api/predict (Article text mode)
// -------------------------------------------------------------
router.post("/", async (req, res) => {
  const { text } = req.body || {};
  if (typeof text !== "string") {
    return res.status(400).json({ error: "Request body must include text." });
  }

  const clean = text.trim();
  if (clean.length === 0) {
    return res.status(400).json({ error: "Please enter article text to analyze." });
  }

  if (clean.length > 50000) {
    return res.status(400).json({ error: "Text exceeds maximum supported length (50,000 characters)." });
  }

  try {
    const result = await analyzeStory(clean);
    const textHash = sha256(clean);

    const mongoose = require("mongoose");
    if (mongoose.connection.readyState === 1) {
      try {
        await upsertCheck(textHash, clean.slice(0, 300), result);
      } catch (dbErr) {
        console.warn("Could not persist check to MongoDB:", dbErr.message);
      }
    }

    return res.json(result);
  } catch (error) {
    console.error("Prediction request failed:", error.message);
    const status = Number.isInteger(error.status) ? error.status : 502;
    return res.status(status).json({ error: error.message || "Prediction service unavailable." });
  }
});

// -------------------------------------------------------------
// POST /api/predict/url (URL mode)
// -------------------------------------------------------------
const handleUrlPrediction = async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== "string" || !url.trim()) {
    return res.status(400).json({ error: "Please provide a valid article URL to verify." });
  }

  try {
    const { title, text } = await extractArticleFromUrl(url.trim());
    const result = await analyzeStory(text);

    return res.json({
      ...result,
      url: url.trim(),
      extracted_title: title || "Extracted Web Article",
      text_snippet: text.slice(0, 200) + (text.length > 200 ? "…" : ""),
    });
  } catch (error) {
    console.error("URL prediction failed:", error.message);
    const status = Number.isInteger(error.status) ? error.status : 422;
    return res.status(status).json({ error: error.message || "Failed to process article from URL." });
  }
};

router.post("/url", handleUrlPrediction);
router.post("/predict-url", handleUrlPrediction);

// -------------------------------------------------------------
// POST /api/predict/image (Image mode)
// -------------------------------------------------------------
const handleImagePrediction = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please select an image file to analyze." });
  }

  try {
    const result = await fastapiClient.predictImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    return res.json(result);
  } catch (error) {
    console.error("Image prediction request failed:", error.message);
    const status = Number.isInteger(error.status) ? error.status : 502;
    return res.status(status).json({ error: error.message || "Image prediction service unavailable." });
  }
};

router.post("/image", upload.single("image"), handleImagePrediction);
router.post("/predict-image", upload.single("image"), handleImagePrediction);

module.exports = router;