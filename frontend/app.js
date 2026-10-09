// Dateline (any page with #today)
const todayEl = document.getElementById("today");
if (todayEl) {
  todayEl.textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Headline ticker (landing page collage section) — flashes behind the intro copy
const tickerTrack = document.getElementById("tickerTrack");
if (tickerTrack) {
  const headlineEls = document.querySelectorAll(".collage .paper h3");
  let headlines = Array.prototype.map.call(headlineEls, (el) =>
    el.textContent.trim(),
  );
  if (headlines.length === 0) {
    headlines = [
      "Flash desk online",
      "Verify before you share",
      "Live verification running",
    ];
  }
  // Duplicate the list once so translateX(-50%) loops seamlessly
  tickerTrack.innerHTML = headlines
    .concat(headlines)
    .map((h) => `<span>${h}</span>`)
    .join("");
}

// Article / URL / Image toggle (verify page)
const verifyInput = document.getElementById("verifyInput");
const resultSec = document.getElementById("result");

document.querySelectorAll(".toggle-group button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const group = btn.closest(".toggle-group");
    group
      .querySelectorAll("button")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const imageSec = document.querySelector(".verify-image");
    const mode = btn.dataset.mode;

    // Clear stale results when switching verification modes
    if (resultSec) resultSec.classList.remove("show");
    clearImageError();

    if (mode === "image") {
      if (verifyInput) verifyInput.style.display = "none";
      if (imageSec) imageSec.style.display = "block";
    } else {
      if (verifyInput) {
        verifyInput.style.display = "block";
        verifyInput.placeholder =
          mode === "url"
            ? "Paste the article URL here (e.g., https://...)"
            : "Paste the article text here…";
      }
      if (imageSec) imageSec.style.display = "none";
    }
  });
});

// Clear stale results when the user edits text input
if (verifyInput) {
  verifyInput.addEventListener("input", () => {
    if (resultSec) resultSec.classList.remove("show");
  });
}

// Image evidence selection (verify page)
const verifyImageInput = document.getElementById("verifyImageInput");
const verifyImageDrop = document.getElementById("verifyImageDrop");
const verifyImagePreviewWrap = document.getElementById("verifyImagePreviewWrap");
const verifyImagePreview = document.getElementById("verifyImagePreview");
const verifyImageFilename = document.getElementById("verifyImageFilename");
const verifyImageRemove = document.getElementById("verifyImageRemove");
const verifyImageError = document.getElementById("verifyImageError");
const verifyImageBox = document.getElementById("verifyImageBox");

let selectedImageFile = null;
let currentPreviewUrl = null;

function clearImageSelection() {
  selectedImageFile = null;
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }
  if (verifyImageInput) {
    verifyImageInput.value = "";
  }
  if (verifyImagePreview) {
    verifyImagePreview.src = "";
  }
  if (verifyImageFilename) {
    verifyImageFilename.textContent = "";
  }
  if (verifyImagePreviewWrap) {
    verifyImagePreviewWrap.style.display = "none";
  }
  if (verifyImageDrop) {
    verifyImageDrop.style.display = "flex";
  }
  if (resultSec) {
    resultSec.classList.remove("show");
  }
}

function showImageError(msg) {
  if (verifyImageError) {
    verifyImageError.textContent = msg;
    verifyImageError.style.display = "block";
  }
}

function clearImageError() {
  if (verifyImageError) {
    verifyImageError.textContent = "";
    verifyImageError.style.display = "none";
  }
}

function handleFileSelection(file) {
  clearImageError();
  if (resultSec) resultSec.classList.remove("show");

  if (!file) return;

  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!validTypes.includes(file.type.toLowerCase())) {
    showImageError("Invalid file format. Please select a JPG, JPEG, PNG, or WEBP image.");
    clearImageSelection();
    return;
  }

  const maxSizeInBytes = 15 * 1024 * 1024; // 15MB limit
  if (file.size > maxSizeInBytes) {
    showImageError("File is too large. Maximum allowed size is 15 MB.");
    clearImageSelection();
    return;
  }

  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }

  selectedImageFile = file;
  currentPreviewUrl = URL.createObjectURL(file);

  if (verifyImagePreview) {
    verifyImagePreview.src = currentPreviewUrl;
    verifyImagePreview.alt = "Preview of " + file.name;
  }
  if (verifyImageFilename) {
    verifyImageFilename.textContent = file.name;
  }
  if (verifyImageDrop) {
    verifyImageDrop.style.display = "none";
  }
  if (verifyImagePreviewWrap) {
    verifyImagePreviewWrap.style.display = "flex";
  }
}

if (verifyImageInput) {
  verifyImageInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      handleFileSelection(file);
    }
  });
}

if (verifyImageRemove) {
  verifyImageRemove.addEventListener("click", (e) => {
    e.preventDefault();
    clearImageSelection();
    clearImageError();
  });
}

if (verifyImageBox) {
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    verifyImageBox.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
  verifyImageBox.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleFileSelection(dt.files[0]);
    }
  });
}

// Predict (verify page)
const predictBtn = document.getElementById("predictBtn");
const API_BASE = window.location.port === "4000" ? "" : "http://localhost:4000";

if (predictBtn) {
  predictBtn.addEventListener("click", async () => {
    const activeBtn = document.querySelector(".toggle-group button.active");
    const mode = activeBtn ? activeBtn.dataset.mode : "article";
    const rawInput = verifyInput ? verifyInput.value.trim() : "";
    const stamp = document.getElementById("stampEl");
    const fill = document.getElementById("meterFill");
    const pct = document.getElementById("meterPct");
    const note = document.getElementById("resultNote");
    const leftLabel = document.getElementById("meterLeftLabel");

    // Helper to render verdict accurately and honestly
    function renderVerdict(label, scorePct, leftText, noteText, sources = []) {
      stamp.textContent = label;
      stamp.style.color = "";
      stamp.style.borderColor = "";

      if (label === "CONTRADICTED" || label === "FAKE") {
        stamp.className = "stamp fake";
        fill.className = "meter-fill";
      } else if (label === "SUPPORTED" || label === "REAL") {
        stamp.className = "stamp real";
        fill.className = "meter-fill real";
      } else if (label === "UNCERTAIN" || label === "INSUFFICIENT" || label === "NOTICE") {
        stamp.className = "stamp";
        fill.className = "meter-fill";
      } else {
        stamp.className = "stamp";
        stamp.style.color = "var(--red)";
        stamp.style.borderColor = "var(--red)";
        fill.className = "meter-fill";
      }

      fill.style.width = scorePct === "--" ? "0%" : scorePct + "%";
      pct.textContent = scorePct === "--" ? "--" : scorePct + "%";
      leftLabel.textContent = leftText;

      let fullNote = noteText;
      if (Array.isArray(sources) && sources.length > 0) {
        fullNote += "\n\nSources examined:\n" + sources.map((s, idx) => `[${idx + 1}] ${s.title}: ${s.url}`).join("\n");
      }
      note.textContent = fullNote;

      if (resultSec) resultSec.classList.add("show");
    }

    // -------------------------------------------------------------
    // Image Verification Mode
    // -------------------------------------------------------------
    if (mode === "image") {
      if (!selectedImageFile) {
        showImageError("Please select an image file to verify.");
        if (verifyImageInput) verifyImageInput.click();
        return;
      }

      clearImageError();
      const originalBtnText = predictBtn.textContent;
      predictBtn.disabled = true;
      predictBtn.textContent = "Analyzing Image…";

      try {
        const formData = new FormData();
        formData.append("image", selectedImageFile);

        let res;
        try {
          res = await fetch(`${API_BASE}/api/predict/image`, {
            method: "POST",
            body: formData,
          });
        } catch (netErr) {
          // Direct fallback to FastAPI if Express backend proxy is unavailable
          res = await fetch("http://localhost:8000/predict-image", {
            method: "POST",
            body: formData,
          });
        }

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.detail || "Image analysis failed.");
        }

        const isFake = data.prediction === "FAKE";
        const isUncertain = data.prediction === "UNCERTAIN";
        const confidence = typeof data.confidence === "number" ? data.confidence : 0.5;
        const scorePct = Math.min(100, Math.max(1, Math.round(confidence * 100)));

        let leftText = isFake
          ? "Fake / Tampering likelihood"
          : isUncertain
          ? "Confidence (Inconclusive)"
          : "Authenticity likelihood";

        let noteText =
          (data.message ? data.message + " " : "") +
          (data.disclaimer || "Automated digital artifact and compression analysis; not human forensic certification.");

        renderVerdict(data.prediction || (isFake ? "FAKE" : "REAL"), scorePct, leftText, noteText);
      } catch (err) {
        showImageError(err.message || "Unable to complete image verification.");
        renderVerdict("ERROR", "--", "Service Error", err.message || "Image verification failed.");
      } finally {
        predictBtn.disabled = false;
        predictBtn.textContent = originalBtnText;
      }
      return;
    }

    // -------------------------------------------------------------
    // URL Verification Mode
    // -------------------------------------------------------------
    if (mode === "url") {
      if (!rawInput) {
        if (verifyInput) verifyInput.focus();
        return;
      }

      const originalBtnText = predictBtn.textContent;
      predictBtn.disabled = true;
      predictBtn.textContent = "Fetching & Analyzing URL…";

      try {
        const res = await fetch(`${API_BASE}/api/predict/url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: rawInput }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.detail || "Could not retrieve article from URL.");
        }

        const label = data.label || "UNCERTAIN";
        const isContradicted = label === "CONTRADICTED" || label === "FAKE";
        const isSupported = label === "SUPPORTED" || label === "REAL";
        const isUncertain = label === "UNCERTAIN" || label === "INSUFFICIENT EVIDENCE";

        let scorePct = 50;
        if (typeof data.confidence === "number") {
          scorePct = Math.min(100, Math.max(1, Math.round(data.confidence * 100)));
        } else if (typeof data.fake_score === "number") {
          scorePct = isContradicted
            ? Math.round(data.fake_score * 100)
            : Math.round((1 - data.fake_score) * 100);
        }

        let leftText = "Confidence Score";
        if (label === "CONTRADICTED") leftText = "Contradiction confidence";
        else if (label === "SUPPORTED") leftText = "Support confidence";
        else if (label === "FAKE") leftText = "Fake likelihood (Style)";
        else if (label === "REAL") leftText = "Real likelihood (Style)";
        else leftText = "Inconclusive / Neutral";

        let noteText = "";
        if (data.extracted_title) {
          noteText += `Article: "${data.extracted_title}"\n\n`;
        }
        noteText += (data.explanation ? data.explanation + "\n\n" : "") + (data.disclaimer || "");

        renderVerdict(label, isUncertain ? 50 : scorePct, leftText, noteText, data.sources);
      } catch (err) {
        renderVerdict(
          "ERROR",
          "--",
          "URL Extraction Error",
          "Could not analyze URL: " + (err.message || "Extraction failed.")
        );
      } finally {
        predictBtn.disabled = false;
        predictBtn.textContent = originalBtnText;
      }
      return;
    }

    // -------------------------------------------------------------
    // Article Text Verification Mode
    // -------------------------------------------------------------
    if (!rawInput) {
      if (verifyInput) verifyInput.focus();
      return;
    }

    const originalBtnText = predictBtn.textContent;
    predictBtn.disabled = true;
    predictBtn.textContent = "Verifying Story…";

    try {
      let res;
      try {
        res = await fetch(`${API_BASE}/api/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawInput }),
        });
      } catch (netErr) {
        // Direct fallback to FastAPI if Express backend proxy is unavailable
        res = await fetch("http://localhost:8000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawInput }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || "Prediction request failed.");
      }

      const label = data.label || "UNCERTAIN";
      const isContradicted = label === "CONTRADICTED" || label === "FAKE";
      const isSupported = label === "SUPPORTED" || label === "REAL";
      const isUncertain = label === "UNCERTAIN" || label === "INSUFFICIENT EVIDENCE";

      let scorePct = 50;
      if (typeof data.confidence === "number") {
        scorePct = Math.min(100, Math.max(1, Math.round(data.confidence * 100)));
      } else if (typeof data.fake_score === "number") {
        scorePct = isContradicted
          ? Math.round(data.fake_score * 100)
          : Math.round((1 - data.fake_score) * 100);
      }

      let leftText = "Confidence Score";
      if (label === "CONTRADICTED") leftText = "Contradiction confidence";
      else if (label === "SUPPORTED") leftText = "Support confidence";
      else if (label === "FAKE") leftText = "Fake likelihood (Style)";
      else if (label === "REAL") leftText = "Real likelihood (Style)";
      else leftText = "Inconclusive / Neutral";

      const noteText =
        (data.explanation ? data.explanation + "\n\n" : "") +
        (data.disclaimer || "Automated prediction and verification.");

      renderVerdict(label, isUncertain ? 50 : scorePct, leftText, noteText, data.sources);
    } catch (err) {
      renderVerdict(
        "ERROR",
        "--",
        "Service Error",
        "Could not retrieve prediction: " + (err.message || "Prediction backend unreachable.")
      );
    } finally {
      predictBtn.disabled = false;
      predictBtn.textContent = originalBtnText;
    }
  });
}

// Summarize (summarize page)
const summarizeBtn = document.getElementById("summarizeBtn");
if (summarizeBtn) {
  summarizeBtn.addEventListener("click", () => {
    const text = document.getElementById("summaryInput").value.trim();
    const list = document.getElementById("summaryList");
    list.innerHTML = "";
    if (!text) {
      document.getElementById("summaryInput").focus();
      return;
    }
    let sentences = text
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 12);
    if (sentences.length === 0) sentences = [text];
    const picks = sentences.slice(0, Math.min(3, sentences.length));
    while (picks.length < 3) {
      picks.push("No further distinct claim found in the passage.");
    }
    picks.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s.trim();
      list.appendChild(li);
    });
    document.getElementById("summaryOut").classList.add("show");
  });
}

// Classify (classify page)
const classifyBtn = document.getElementById("classifyBtn");
if (classifyBtn) {
  const catWords = {
    politics: [
      "election",
      "minister",
      "parliament",
      "government",
      "policy",
      "president",
      "vote",
      "senate",
    ],
    sports: [
      "match",
      "tournament",
      "goal",
      "team",
      "championship",
      "league",
      "player",
      "coach",
    ],
    entertainment: [
      "movie",
      "actor",
      "film",
      "celebrity",
      "album",
      "concert",
      "music",
      "show",
    ],
    technology: [
      "app",
      "software",
      "ai",
      "startup",
      "device",
      "robot",
      "tech",
      "computer",
    ],
    business: [
      "market",
      "stock",
      "company",
      "revenue",
      "economy",
      "trade",
      "bank",
      "startup",
    ],
    health: [
      "hospital",
      "disease",
      "vaccine",
      "doctor",
      "patient",
      "virus",
      "treatment",
      "medicine",
    ],
  };
  classifyBtn.addEventListener("click", () => {
    const text = document
      .getElementById("classifyInput")
      .value.trim()
      .toLowerCase();
    const resultEl = document.getElementById("classifyResult");
    if (!text) {
      document.getElementById("classifyInput").focus();
      return;
    }
    let scores = {};
    Object.keys(catWords).forEach((cat) => {
      scores[cat] = catWords[cat].reduce(
        (acc, w) => acc + (text.includes(w) ? 1 : 0),
        0,
      );
    });
    let best = Object.keys(scores).reduce(
      (a, b) => (scores[b] > scores[a] ? b : a),
      "politics",
    );
    if (scores[best] === 0) {
      const keys = Object.keys(catWords);
      best = keys[Math.floor(Math.random() * keys.length)];
    }
    document.querySelectorAll(".chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.cat === best);
    });
    resultEl.innerHTML =
      "Sorted to the <b>" +
      best.charAt(0).toUpperCase() +
      best.slice(1) +
      "</b> desk.";
    resultEl.classList.add("show");
  });
}

// Trending tabs (trending page)
document.querySelectorAll(".trend-tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".trend-tabs button").forEach((b) => {
      b.classList.remove("active", "fake-active", "real-active");
    });
    const filter = btn.dataset.filter;
    btn.classList.add(
      "active",
      filter === "fake" ? "fake-active" : "real-active",
    );
    document.querySelectorAll(".clip-item").forEach((item) => {
      item.classList.toggle("hidden-clip", item.dataset.cat !== filter);
    });
  });
});
