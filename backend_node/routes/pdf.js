const express = require("express");
const router = express.Router();
const pdfController = require("../controllers/pdfController");
const pdfSummary = require("../controllers/pdfSummary");
const authMiddleware = require("../middleware/auth");
const multer = require('multer');

// Додаємо multer для обробки multipart/form-data
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

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
router.post("/generate-simple", authMiddleware, pdfController.generateSimplePdf);
router.post("/generate-detailed", authMiddleware, pdfController.generateDetailedPdf);
// Додаємо multer middleware для обробки файлу
router.post("/process-pdf", authMiddleware, upload.single('pdfFile'), pdfSummary.processPdf);
router.get("/list", authMiddleware, pdfController.listPdfs);
router.delete("/:filename", authMiddleware, pdfController.deletePdf);
router.get("/download", authMiddleware, pdfController.downloadPdf);
router.get("/proxy", pdfController.proxyPdf);

module.exports = router;