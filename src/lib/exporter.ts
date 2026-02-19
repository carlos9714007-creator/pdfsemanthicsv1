import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { ProcessingResult } from './processor';

export function exportToExcel(results: ProcessingResult[]) {
    const data = results.map(r => ({
        'File Name': r.fileName,
        'Status': r.success ? 'Success' : 'Failed',
        'Reason': r.reason || '',
        'Emission Date': r.data?.semantic?.data || '',
        'Issuer NIF': r.data?.semantic?.emitenteNif || '',
        'Total Amount': r.data?.semantic?.total || '',
        'QR Code Data': r.data?.qrCode || '',
        'Error Details': r.error || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

    XLSX.writeFile(workbook, `AT_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportToPDF(results: ProcessingResult[]) {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('PDF Semantic Reader - Report', 10, 20);

    doc.setFontSize(10);
    let y = 30;

    results.forEach((r, i) => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }

        doc.text(`${i + 1}. ${r.fileName} - ${r.success ? 'SUCCESS' : 'IGNORED'}`, 10, y);
        y += 5;
        if (r.reason) {
            doc.text(`   Reason: ${r.reason}`, 10, y);
            y += 5;
        }
        if (r.data?.semantic?.emitenteNif) {
            doc.text(`   Issuer: ${r.data.semantic.emitenteNif} | Total: ${r.data.semantic.total}€`, 15, y);
            y += 5;
        }
        y += 5;
    });

    doc.save(`AT_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
