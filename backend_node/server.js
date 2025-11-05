require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const pdfRoutes = require("./routes/pdf");
const path = require("path"); 

const app = express();
const PORT = process.env.PORT || 3000;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Інші middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ ПРАВИЛЬНЫЕ пути - теперь css и images на одном уровне с server.js
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Routes
app.use("/api/pdf", pdfRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`PDF service running on http://localhost:${PORT}`);
  console.log(`CSS available at: http://localhost:${PORT}/css/report-advanced.css`);
  console.log(`CSS available at: http://localhost:${PORT}/css/report-basic.css`);
  console.log(`Images available at: http://localhost:${PORT}/images/logo-anatomous.png`);
});