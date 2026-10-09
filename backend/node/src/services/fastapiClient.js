const config = require("../config");

async function predict(text) {
  const response = await fetch(`${config.fastapiUrl}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.detail || `FastAPI error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function predictImage(fileBuffer, filename, mimetype) {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimetype || "image/jpeg" });
  formData.append("image", blob, filename || "image.jpg");

  const response = await fetch(`${config.fastapiUrl}/predict-image`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.detail || `FastAPI error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

module.exports = { predict, predictImage };