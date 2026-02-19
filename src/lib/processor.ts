import * as PDFLib from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import jsQR from 'jsqr';

// Set worker path
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export interface ProcessingResult {
    fileName: string;
    success: boolean;
    data?: any;
    error?: string;
    reason?: string;
}

export async function processDocument(file: File): Promise<ProcessingResult> {
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    try {
        if (fileExt === 'pdf') {
            return await processPDF(file);
        } else if (['jpg', 'jpeg', 'png'].includes(fileExt || '')) {
            return await processImage(file);
        } else {
            return { fileName: file.name, success: false, reason: 'Unsupported file type' };
        }
    } catch (err: any) {
        return { fileName: file.name, success: false, error: err.message, reason: 'Processing failed' };
    }
}

async function processPDF(file: File): Promise<ProcessingResult> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    let qrCodeData = null;

    // 1. Try to extract text and search for QR images
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ');

        // Try to find QR Code on page (render to canvas then jsQR)
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport }).promise;
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                qrCodeData = code.data;
            }
        }
    }

    // 2. Extract semantic data from text if QR not found or supplementary
    const extracted = extractSemanticData(fullText);

    // 3. Inject metadata back into PDF if requested (this would be done in a separate step or here)
    // For now, return what we found
    return {
        fileName: file.name,
        success: true,
        data: {
            qrCode: qrCodeData,
            semantic: extracted,
            rawText: fullText
        }
    };
}

async function processImage(file: File): Promise<ProcessingResult> {
    const url = URL.createObjectURL(file);

    // 1. Image Enhancement (Simple)
    // In a real app, we'd use a canvas to adjust contrast/brightness

    // 2. OCR
    const { data: { text } } = await Tesseract.recognize(url, 'por+eng', {
        logger: m => console.log(m)
    });

    // 3. Try QR Code in image
    const img = new Image();
    img.src = url;
    await new Promise(resolve => img.onload = resolve);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    let qrInImage = null;
    if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) qrInImage = code.data;
    }

    URL.revokeObjectURL(url);

    const extracted = extractSemanticData(text);

    return {
        fileName: file.name,
        success: true,
        data: {
            qrCode: qrInImage,
            semantic: extracted,
            rawText: text
        }
    };
}

function extractSemanticData(text: string) {
    // Regex patterns for Portuguese tax documents
    const nifRegex = /\b\d{9}\b/g;
    const dateRegex = /\b\d{4}-\d{2}-\d{2}\b|\b\d{2}-\d{2}-\d{4}\b|\b\d{2}\/\d{2}\/\d{4}\b/g;
    const totalRegex = /(?:total|montante|valor|a pagar)[:\s]*([0-9.,]+)\s*€/gi;

    const nifs = text.match(nifRegex) || [];
    const dates = text.match(dateRegex) || [];

    // Simple heuristic: first NIF is usually emitente, second is adquirente
    return {
        emitenteNif: nifs[0] || null,
        adquirenteNif: nifs[1] || null,
        data: dates[0] || null,
        total: text.match(totalRegex)?.[0]?.replace(/[^0-9.,]/g, '') || null
    };
}

export async function injectMetadata(file: File, atString: string): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

    // Set AT string in Keywords (as per common practice or as requested)
    pdfDoc.setKeywords([atString]);
    // Also set as custom producer or subject for better visibility
    pdfDoc.setSubject(`AT-QR-DATA: ${atString}`);

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes as any], { type: 'application/pdf' });
}
