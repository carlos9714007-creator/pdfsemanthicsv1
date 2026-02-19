# PDF Semantic Reader PRO

A futuristic PWA designed to process commercial documents, extract semantic data for Portuguese Tax Authority (AT) QR Code compliance, and inject metadata into PDF files.

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## 🛠 Features

- **Semantic Extraction:** Automatically identifies NIFs (Sender/Receiver), Dates, and Totals in Portuguese and English documents.
- **OCR Integration:** Uses `Tesseract.js` for high-quality text extraction from images or scanned PDFs.
- **AT QR Code Generation:** Formats data according to *Portaria 195/2020*.
- **Metadata Injection:** Uses `pdf-lib` to write fiscal data strings into PDF metadata fields.
- **Reports:** Generate Excel and PDF reports with the analysis results.
- **Log System:** Automatically saves a processing log to the source directory.

## 💻 Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS (Cyberpunk/Glassmorphism Theme)
- **Libraries:** PDF-lib, PDF.js, Tesseract.js, jsQR, SheetJS, jsPDF

## ⚠️ Important Notes

- **Browser Support:** Use Chrome or Edge for full support of the **File System Access API**.
- **Privacy:** All processing happens locally in your browser. No documents are uploaded to any server.

---
Developed as part of the PDF Semantics project.
