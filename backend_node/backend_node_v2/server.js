require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const pdfRoutes = require("./routes/pdf");

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

// Routes
app.use("/api/pdf", pdfRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`PDF service running on http://localhost:${PORT}`);
});