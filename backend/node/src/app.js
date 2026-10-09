const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const config = require("./config");
const { attachUserIfPresent } = require("./middleware/auth");
const adminRoute = require("./routes/admin");
const authRoute = require("./routes/auth");
const factcheckRoute = require("./routes/factcheck");
const newsRoute = require("./routes/news");
const predictRoute = require("./routes/predict");

const app = express();

app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(attachUserIfPresent);
app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute);
app.use("/api/news", newsRoute);
app.use("/api/factcheck", factcheckRoute);
app.use("/api/predict", predictRoute);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

module.exports = app;