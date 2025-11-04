const express = require("express");
const router = express.Router();
const pdfController = require("../controllers/pdfController");
const authMiddleware = require("../middleware/auth");

// CORS middleware
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Routes
router.post("/generate", authMiddleware, pdfController.generatePdf);
router.get("/list", authMiddleware, pdfController.listPdfs);
router.delete("/:filename", authMiddleware, pdfController.deletePdf);

module.exports = router;
