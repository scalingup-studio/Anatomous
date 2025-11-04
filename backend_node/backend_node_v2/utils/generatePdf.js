const puppeteer = require("puppeteer");
const ejs = require("ejs");
const fs = require("fs").promises; // Використовуємо стандартний fs
const path = require("path");

exports.renderPdf = async (templateName, data, outputPath) => {
  let browser;
  try {
    console.log("data", data);
    
    // Виправляємо шлях до шаблонів
    const templatePath = path.join(__dirname, "../templates", `${templateName}.ejs`);
    console.log("Looking for template at:", templatePath);
    
    // Перевіряємо чи існує файл за допомогою стандартного fs
    try {
      await fs.access(templatePath);
      console.log("Template found");
    } catch (error) {
      throw new Error(`Template not found: ${templatePath}`);
    }
    
    // Рендеримо EJS в HTML
    const html = await ejs.renderFile(templatePath, data, { async: true });

    // Запускаємо Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Встановлюємо розмір сторінки
    await page.setViewport({ width: 1200, height: 1696 }); // A4 пропорції
    
    // Встановлюємо контент
    await page.setContent(html, { 
      waitUntil: ["networkidle0", "domcontentloaded"] 
    });

    // Генеруємо PDF
    await page.pdf({ 
      path: outputPath, 
      format: "A4",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in"
      }
    });

    console.log("PDF successfully generated at:", outputPath);
    
  } catch (error) {
    console.error("Error in renderPdf:", error);
    throw error;
  } finally {
    // Завжди закриваємо браузер
    if (browser) {
      await browser.close();
    }
  }
};