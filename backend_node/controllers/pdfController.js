const { renderPdf } = require("../utils/generatePdf");
const path = require("path");
const fs = require("fs-extra");
const https = require("https");
const http = require("http");


exports.generatePdf = async (req, res) => {
  try {
    const result = req.body;
    console.log('result', result);

    const pdfDir = path.join(__dirname, "../pdfs");
    const templateDir = path.join(__dirname, "../templates");

    // Створюємо папку, якщо її немає
    await fs.ensureDir(pdfDir);

    const pdfPath = path.join(pdfDir, `report-${Date.now()}.pdf`);

    // Визначаємо тип шаблону
    const templateType = result.pdf_data?.export_settings?.template_type ||
                        (result.pdf_data?.sections?.insights ||
                         result.pdf_data?.sections?.goals ||
                         result.pdf_data?.sections?.uploads ? "detailed" : "simple");

    // Вибираємо відповідний шаблон
    const templateName = templateType === "detailed" ? "report-advanced.ejs" : "report-basic.ejs";

    // Перевіряємо чи існує складний шаблон
    let finalTemplate;
    if (templateType === "detailed") {
      const templatePath = path.join(templateDir, templateName);
      try {
        await fs.access(templatePath); // Перевіряємо доступ до файлу
        finalTemplate = "report-advanced";
      } catch (error) {
        console.log("Advanced template not found, using basic template");
        finalTemplate = "report-basic";
      }
    } else {
      finalTemplate = "report-basic";
    }

    // Підготовка даних для шаблону
    const data = {
      title: result.pdf_data?.title || "Health Report",
      date: result.pdf_data?.date || new Date().toLocaleDateString(),
      user: {
        first_name: result.pdf_data?.user?.first_name || "",
        last_name: result.pdf_data?.user?.last_name || "",
        height_cm: result.pdf_data?.user?.height_cm || 0,
        weight_kg: result.pdf_data?.user?.weight_kg || 0,
        dob: result.pdf_data?.user?.dob || "",
        gender: result.pdf_data?.user?.gender || ""
      },
      insights: result.pdf_data?.sections?.insights || [],
      vitals: result.pdf_data?.sections?.vitals || [],
      uploads: result.pdf_data?.sections?.uploads || [],
      goals: result.pdf_data?.sections?.goals || [],
      export_settings: result.pdf_data?.export_settings || {}
    };

    console.log(`Using template: ${finalTemplate} for template type: ${templateType}`);

    // Генеруємо PDF
    await renderPdf(finalTemplate, data, pdfPath);


    // Відправляємо файл клієнту
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(pdfPath)}"`
    );

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(500).json({ error: "Failed to generate PDF", details: err.message });
  }
};

// Функція для генерації простого PDF
exports.generateSimplePdf = async (req, res) => {
  try {
    const data = req.body;
    console.log("Input data:", data);

    const pdfDir = path.join(__dirname, "../pdfs");
    await fs.ensureDir(pdfDir);

    // Генеруємо шлях до PDF
    const pdfPath = path.join(pdfDir, `simple-report-${Date.now()}.pdf`);

    // Назва шаблону
    const templateName = "report-basic";

    console.log("Using template:", templateName);

    // Підготовка даних для шаблону
    const templateData = {
      logo: data.logo || "https://cdn.anatomous.app/assets/logo.png",
      title: data.pdf_data.title || "Health Summary Report",
      date: data.pdf_data.date || new Date().toLocaleDateString(),
      date_range: data.pdf_data?.date_range || 30,
      user: data.pdf_data?.user || {},
      insights: data.pdf_data?.sections?.insights || [],
      vitals: data.pdf_data?.sections?.vitals || [],
      vitals_trend: data.pdf_data?.sections?.vitals_trend || {}, 
      uploads: data.pdf_data?.sections?.uploads || [], 
      goals: data.pdf_data?.sections?.goals || [],
      layout: data.pdf_data.layout || "simple",
      export_settings: data.pdf_data.export_settings || {},
    };

    // Генеруємо PDF через renderPdf
    await renderPdf(templateName, templateData, pdfPath);

    // Відправляємо файл клієнту
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(pdfPath)}"`
    );

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(500).json({ error: "Failed to generate PDF", details: err.message });
  }
};


// Функція для генерації детального PDF
exports.generateDetailedPdf = async (req, res) => {
  try {
    const data = req.body;
    console.log("Input data:", data);

    const pdfDir = path.join(__dirname, "../pdfs");
    await fs.ensureDir(pdfDir);

    // Генеруємо шлях до PDF
    const pdfPath = path.join(pdfDir, `detailed-report-${Date.now()}.pdf`);

    // Назва шаблону
    const templateName = "report-advanced";

    console.log("Using template:", templateName);

    // Підготовка даних для шаблону
    const templateData = {
  logo: data.logo || "https://cdn.anatomous.app/assets/logo.png",
  title: data.pdf_data?.title || "Health Summary Report",
  date: data.pdf_data?.date || new Date().toLocaleDateString(),
  date_range: data.pdf_data?.date_range || 30,
  user: data.pdf_data?.user || {},
  insights: data.pdf_data?.sections?.insights || [],
  vitals: data.pdf_data?.sections?.vitals || [],
  vitals_trend: data.pdf_data?.sections?.vitals_trend || {}, 
  uploads: data.pdf_data?.sections?.uploads || [], 
  goals: data.pdf_data?.sections?.goals || [],
   progress: data.pdf_data?.sections?.progress || [],
  alerts: data.pdf_data?.sections?.alerts || [], 
  notes: data.pdf_data?.sections?.notes || [],
  layout: data.pdf_data?.layout || "detailed",
  export_settings: data.pdf_data?.export_settings || {},
};


    // Генеруємо PDF через renderPdf
    await renderPdf(templateName, templateData, pdfPath);

    // Відправляємо файл клієнту
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(pdfPath)}"`
    );

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(500).json({ error: "Failed to generate PDF", details: err.message });
  }
};


exports.listPdfs = async (req, res) => {
  try {
    const pdfDir = path.join(__dirname, "../pdfs");
    const files = await fs.readdir(pdfDir);

    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    res.json(pdfFiles);
  } catch (err) {
    res.status(500).json({ error: "Failed to list PDFs", details: err.message });
  }
};


// Завантаження PDF
exports.downloadPdf = async (req, res) => {
  try {
    // Дістаємо назву файлу з query-параметра
    const fileName = req.query.name_file;

    // Перевірка
    if (!fileName || !fileName.endsWith(".pdf")) {
      return res.status(400).json({ error: "Invalid file type or missing fileName" });
    }

    const pdfPath = path.join(__dirname, "../pdfs", fileName);

    // Перевірка існування файлу
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Заголовки для скачування PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    // Відправляємо файл потоком
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    fileStream.on("error", (err) => {
      console.error("PDF stream error:", err);
      res.status(500).end("Error sending PDF file");
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to download PDF", details: err.message });
  }
};


exports.deletePdf = async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename.endsWith('.pdf')) {
      return res.status(400).json({ error: "Invalid file type" });
    }

    const pdfPath = path.join(__dirname, "../pdfs", filename);

    // Перевіряємо чи файл існує
    try {
      await fs.access(pdfPath);
    } catch (error) {
      return res.status(404).json({ error: "PDF file not found" });
    }

    await fs.remove(pdfPath);
    res.json({ success: true, message: `PDF ${filename} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete PDF", details: err.message });
  }
};

// Simple proxy to stream remote PDFs without X-Frame-Options so the app can embed
exports.proxyPdf = async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: "Missing url param" });

    // Allowlist of hosts we agree to proxy
    const allowedHosts = [
      'xu6p-ejbd-2ew4.n7e.xano.io',
      'storage.googleapis.com',
      'drive.google.com'
    ];

    let parsed;
    try { parsed = new URL(targetUrl); } catch (_) { return res.status(400).json({ error: 'Invalid URL' }); }
    if (!allowedHosts.includes(parsed.hostname)) {
      return res.status(403).json({ error: 'Host not allowed' });
    }

    const client = parsed.protocol === 'http:' ? http : https;
    const requestOpts = {
      method: 'GET',
      headers: {
        'User-Agent': 'Anatomous-PDF-Proxy/1.0'
      }
    };

    client.get(parsed, requestOpts, (upstream) => {
      if (upstream.statusCode && upstream.statusCode >= 400) {
        res.status(upstream.statusCode).end();
        return;
      }
      // Forward as PDF, drop X-Frame-Options
      res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/pdf');
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.removeHeader('X-Frame-Options');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      upstream.pipe(res);
    }).on('error', (err) => {
      console.error('Proxy error:', err);
      res.status(502).json({ error: 'Proxy failed' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', details: err.message });
  }
};


// exports.generatePdf = async (req, res) => {
//   try {
//     const result = req.body;
//     console.log('result', result);

//     const pdfDir = path.join(__dirname, "../pdfs");
//     const templateDir = path.join(__dirname, "../templates");

//     // Створюємо папку, якщо її немає
//     await fs.ensureDir(pdfDir);

//     const pdfPath = path.join(pdfDir, `report-${Date.now()}.pdf`);

//     // Визначаємо тип шаблону
//     const templateType = result.pdf_data?.export_settings?.template_type ||
//                         (result.pdf_data?.sections?.insights ||
//                          result.pdf_data?.sections?.goals ||
//                          result.pdf_data?.sections?.uploads ? "detailed" : "simple");

//     // Вибираємо відповідний шаблон
//     const templateName = templateType === "detailed" ? "report-advanced.ejs" : "report-basic.ejs";

//     // Перевіряємо чи існує складний шаблон
//     let finalTemplate;
//     if (templateType === "detailed") {
//       const templatePath = path.join(templateDir, templateName);
//       try {
//         await fs.access(templatePath); // Перевіряємо доступ до файлу
//         finalTemplate = "report-advanced";
//       } catch (error) {
//         console.log("Advanced template not found, using basic template");
//         finalTemplate = "report-basic";
//       }
//     } else {
//       finalTemplate = "report-basic";
//     }

//     // Підготовка даних для шаблону
//     const data = {
//       title: result.pdf_data?.title || "Health Report",
//       date: result.pdf_data?.date || new Date().toLocaleDateString(),
//       user: {
//         first_name: result.pdf_data?.user?.first_name || "",
//         last_name: result.pdf_data?.user?.last_name || "",
//         height_cm: result.pdf_data?.user?.height_cm || 0,
//         weight_kg: result.pdf_data?.user?.weight_kg || 0,
//         dob: result.pdf_data?.user?.dob || "",
//         gender: result.pdf_data?.user?.gender || ""
//       },
//       insights: result.pdf_data?.sections?.insights || [],
//       vitals: result.pdf_data?.sections?.vitals || [],
//       uploads: result.pdf_data?.sections?.uploads || [],
//       goals: result.pdf_data?.sections?.goals || [],
//       export_settings: result.pdf_data?.export_settings || {}
//     };

//     console.log(`Using template: ${finalTemplate} for template type: ${templateType}`);
// // Генеруємо PDF
// await renderPdf(finalTemplate, data, pdfPath);

// // Створюємо FormData і додаємо файл
// const form = new FormData();
// form.append('file', fs.createReadStream(pdfPath), {
//   filename: path.basename(pdfPath),
//   user_id: "ece5adbb-317d-42a4-96a8-2e75c3f1ff92",
//   contentType: 'application/pdf'
// });

// // Завантажуємо файл у Xano Vault
// // const vaultResponse = await axios.post(XANO_VAULT_UPLOAD_ENDPOINT, form, {
// //   headers: {
// //     // 'Authorization': `Bearer ${XANO_API_KEY}`,
// //     ...form.getHeaders()
// //   }
// // });

// // const fileData = vaultResponse.data;
// // console.log('File uploaded to Xano Vault:', fileData);


// // Видаляємо тимчасовий файл (опціонально)
// await fs.unlink(pdfPath);

// // Відповідаємо клієнту про успішне збереження
// res.status(200).json({
//   success: true,
//   message: 'PDF generated and saved to Xano',
//   file: fileData
// });

// } catch (err) {
//   console.error("PDF Generation Error:", err);
//   res.status(500).json({
//     success: false,
//     error: "Failed to generate or upload PDF",
//     details: err.message
//   });
// }
// }
