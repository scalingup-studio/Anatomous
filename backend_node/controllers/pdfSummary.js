const fs = require("fs");
const pdfParse = require('pdf-parse');
const poppler = require('pdf-poppler');
const sharp = require('sharp');
const nlp = require("compromise");
const { get_encoding } = require("tiktoken");
const { createWorker } = require('tesseract.js');

// Папка для тимчасових зображень
const TEMP_IMAGES_DIR = './temp_images';

// Конвертація PDF у зображення
async function convertPdfToImages(filePath, outputDir = TEMP_IMAGES_DIR) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const opts = {
    format: 'jpeg',
    out_dir: outputDir,
    out_prefix: 'page',
    page: null // всі сторінки
  };

  try {
    await poppler.convert(filePath, opts);
    const files = fs.readdirSync(outputDir);
    const imageFiles = files
      .filter(file => file.startsWith('page-') && (file.endsWith('.jpg') || file.endsWith('.jpeg')))
      .sort();
    return imageFiles.map(file => `${outputDir}/${file}`);
  } catch (error) {
    console.error('Помилка конвертації PDF у зображення:', error);
    return [];
  }
}

// Видалення тимчасових зображень
function cleanupImages(imagePaths) {
  imagePaths.forEach(path => {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  });

  const tempDir = TEMP_IMAGES_DIR;
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    if (files.length === 0) {
      fs.rmdirSync(tempDir);
    }
  }
}

// OCR-обробка
async function extractTextWithOCRFromPdf(filePath) {
  let worker;
  let imagePaths = [];

  try {
    imagePaths = await convertPdfToImages(filePath);
    if (imagePaths.length === 0) {
      throw new Error('Конвертація PDF у зображення не вдалася');
    }

    worker = await createWorker('eng');
    let fullText = '';

    for (let i = 0; i < imagePaths.length; i++) {
      const { data: { text } } = await worker.recognize(imagePaths[i]);
      if (text && text.trim().length > 0) {
        fullText += `Page ${i + 1}:\n${text.trim()}\n\n`;
      }
    }

    return {
      text: fullText || "OCR не повернув текст",
      method: 'ocr',
      pages: imagePaths.length
    };
  } catch (error) {
    console.error('Помилка OCR:', error.message);
    return {
      text: "Помилка OCR: " + error.message,
      method: 'ocr-failed',
      pages: 0
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
    if (imagePaths.length > 0) {
      cleanupImages(imagePaths);
    }
  }
}

// Вилучення тексту з PDF
async function extractTextFromPdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    if (data.text && data.text.length > 50) {
      if (!isPDFScanned(data.text)) {
        return {
          text: data.text,
          method: 'pdf-parse',
          pages: data.numpages,
          isScanned: false
        };
      }
    }

    const ocrResult = await extractTextWithOCRFromPdf(filePath);
    if (ocrResult.text && ocrResult.text.length > 50 && !ocrResult.text.includes('OCR processing failed')) {
      return {
        ...ocrResult,
        isScanned: true
      };
    }

    const binaryText = extractTextFromBinary(dataBuffer);
    if (binaryText.length > (data.text?.length || 0)) {
      return {
        text: binaryText,
        method: 'binary-extraction',
        pages: 1,
        isScanned: true
      };
    }

    const bestText = ocrResult.text || data.text || binaryText;
    return {
      text: bestText,
      method: 'combined',
      pages: data.numpages || 1,
      isScanned: true
    };
  } catch (error) {
    console.error('Помилка вилучення тексту з PDF:', error.message);
    return {
      text: "Помилка обробки PDF: " + error.message,
      method: 'error',
      pages: 0,
      isScanned: true
    };
  }
}

// Перевірка, чи PDF сканований
function isPDFScanned(text) {
  if (!text || text.length < 10) return true;
  const readableChars = text.replace(/[^\x20-\x7E\n\r\t]/g, '').length;
  const readability = readableChars / text.length;
  return readability < 0.3;
}

// Вилучення тексту з бінарних даних
function extractTextFromBinary(buffer) {
  try {
    const text = buffer.toString('utf8');
    let extractedText = '';
    const textInParentheses = text.match(/\(([^)]+)\)/g);
    if (textInParentheses) {
      textInParentheses.forEach(match => {
        const cleanText = match.slice(1, -1).replace(/\\(.)/g, '$1').trim();
        if (cleanText.length > 2 && !cleanText.match(/^[0-9\s.\-]+$/)) {
          extractedText += cleanText + ' ';
        }
      });
    }
    if (extractedText.length < 100) {
      const readableText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      if (readableText.length > extractedText.length) {
        extractedText = readableText;
      }
    }
    return extractedText;
  } catch (error) {
    console.error('Помилка вилучення тексту з бінарних даних:', error);
    return '';
  }
}

// Видалення персональних даних (США)
function redactPersonalDataUSA(text) {
  const patterns = {
    // Імена (наприклад, John Doe)
    names: /\b([A-Z][a-z]+)\s([A-Z][a-z]+)\b/g,
    // Адреси (наприклад, 123 Main St, New York, NY 10001)
    addresses: /\b\d{1,5}\s\w+\s(street|st|avenue|ave|road|rd|highway|hwy|drive|dr|lane|ln|boulevard|blvd)\.?,?\s\w+,?\s\w+\s\w+\s\d{5}(-\d{4})?\b/gi,
    // Номери соціального страхування (SSN, наприклад, 123-45-6789)
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    // Телефонні номери (наприклад, (123) 456-7890 або 123-456-7890)
    phones: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    // Емейли
    emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    // Дати народження (наприклад, 01/01/1990)
    birthdates: /\b\d{2}\/\d{2}\/\d{4}\b/g,
    // Номери водійських прав (наприклад, D12345678)
    driverLicense: /\b[A-Za-z]\d{7,8}\b/g,
  };

  let redactedText = text;
  for (const [key, regex] of Object.entries(patterns)) {
    redactedText = redactedText.replace(regex, `[REDACTED ${key.toUpperCase()}]`);
  }

  return redactedText;
}

// Підрахунок токенів
function countTokens(text) {
  const enc = get_encoding('cl100k_base');
  return enc.encode(text).length;
}

// Головна функція для обробки PDF
exports.processPdf = async (req, res) => {
  let tempFilePath = null;

  try {
    console.log('\n=== PDF PROCESSING (USA) STARTED ===');

    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    const { fileName, category } = req.body;
    tempFilePath = req.file.path;

    // Вилучення тексту з PDF
    const extractionResult = await extractTextFromPdf(tempFilePath);
    const { text: extractedText, method: extractionMethod, pages, isScanned } = extractionResult;

    // Видалення тільки персональних даних (США)
    const redactedText = redactPersonalDataUSA(extractedText);

    // Підрахунок токенів
    const tokens = countTokens(redactedText);

    // Формування відповіді
    const summary = redactedText.length > 50 ?
      (redactedText.length > 500 ? redactedText.slice(0, 500) + "..." : redactedText) :
      "No text or minimal text content";

    res.json({
      success: true,
      tokens,
      redactedText,
      summary,
      fileName: fileName || req.file.originalname,
      category: category || "Medical",
      textLength: redactedText.length,
      processingDetails: {
        extractionMethod,
        pagesExtracted: pages,
        textLength: extractedText.length,
        isScanned,
      },
      message: isScanned ?
        "Scanned PDF successfully processed with OCR" :
        "PDF successfully processed",
    });
  } catch (error) {
    console.error("PDF processing error:", error);
    res.status(500).json({
      success: false,
      error: "PDF processing failed",
      details: error.message,
    });
  } finally {
    // Видалення тимчасового файлу
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }
  }
};
