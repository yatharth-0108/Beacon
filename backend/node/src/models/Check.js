const mongoose = require("mongoose");

const checkSchema = new mongoose.Schema({
  textHash: { type: String, required: true, unique: true, index: true },
  textPreview: { type: String, required: true },
  nlpLabel: { type: String, enum: ["FAKE", "REAL"], required: true },
  nlpScore: { type: Number, required: true },
  factCheck: { type: mongoose.Schema.Types.Mixed, default: null },
  webSearchResult: { type: mongoose.Schema.Types.Mixed, default: null },
  checkCount: { type: Number, default: 1 },
  lastCheckedAt: { type: Date, default: Date.now },
});

const Check = mongoose.model("Check", checkSchema);

async function upsertCheck(textHash, preview, nlpResult) {
  return Check.findOneAndUpdate(
    { textHash },
    {
      $set: {
        textPreview: preview,
        nlpLabel: nlpResult.label,
        nlpScore: nlpResult.fake_score,
        lastCheckedAt: new Date(),
      },
      $inc: { checkCount: 1 },
    },
    { new: true, upsert: true, setDefaultsOnInsert: false },
  );
}

module.exports = { Check, upsertCheck };