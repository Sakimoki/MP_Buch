import jsPDF from 'jspdf';

export function generatePdf({ title, date, signatories, fileName = 'unterschrift.pdf' }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  const dateStr = (date || new Date()).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  let y = 22;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title || 'Unterschriften', margin, y);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const dateWidth = doc.getTextWidth(dateStr);
  doc.text(dateStr, pageWidth - margin - dateWidth, y);

  y += 6;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  for (const signatory of signatories) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(signatory.label, margin, y);
    y += 7;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${signatory.name || ''}`, margin, y);
    y += 10;

    if (signatory.signatureDataUrl) {
      const imgHeight = 35;
      doc.addImage(signatory.signatureDataUrl, 'PNG', margin, y, contentWidth, imgHeight);
      y += imgHeight + 3;
    }

    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth * 0.6, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('Unterschrift', margin, y);
    doc.setTextColor(0);
    y += 18;
  }

  doc.save(fileName);
  return doc.output('datauristring');
}
