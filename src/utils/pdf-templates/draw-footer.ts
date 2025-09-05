import { createLayout, Cursor } from '../pdf-layout';

export const drawFooter = (
  doc: PDFKit.PDFDocument,
  data: any,
  layout: ReturnType<typeof createLayout>,
  cursor: Cursor
) => {
  const { margin, usableWidth } = layout;
  const pageHeight = doc.page.height;
  const bottomMargin = 28.35;
  const spacing = 6;

  const rightBlockHeight = 80;
  const subtotalHeight = rightBlockHeight * 0.65;
  const totalHeight = rightBlockHeight * 0.35;
  const totalRightHeight = subtotalHeight + spacing + totalHeight;

  cursor.y = pageHeight - bottomMargin - totalRightHeight;

  const leftWidth = usableWidth * 0.6;
  const rightWidth = usableWidth * 0.4;
  const rightX = margin + leftWidth + 20;
  const footerPadding = 8;

  // === BLOQUE IZQUIERDO: Observaciones ===
  doc
    .lineWidth(1)
    .roundedRect(margin, cursor.y, leftWidth, totalRightHeight, layout.borderRadius)
    .stroke('#000');

  let currentY = cursor.y + footerPadding;
  doc.fontSize(10).font('Helvetica-Bold').text('Observaciones:', margin + footerPadding, currentY);
  currentY += 16;

  doc.font('Helvetica').fontSize(9).text(
    data.notes || 'No hay observaciones.',
    margin + footerPadding,
    currentY,
    { width: leftWidth - footerPadding * 2, align: 'left', lineGap: 4 }
  );

  // === BLOQUE DERECHO: Totales ===
  doc
    .lineWidth(1)
    .roundedRect(rightX, cursor.y, rightWidth, subtotalHeight, layout.borderRadius)
    .stroke('#000');

  let rightY = cursor.y + footerPadding;
  doc.fontSize(10).font('Helvetica');

  const columnWidth = rightWidth - footerPadding * 2;
  const middleColumnX = rightX + footerPadding + columnWidth * 0.45; // 40% para el valor intermedio

  // Helper para dibujar las filas
  const drawRow = (label: string, middle?: string, amount?: string, prefix?: string) => {
    doc.text(label, rightX + footerPadding, rightY, { width: columnWidth * 0.4, align: 'left' });

    if (middle) {
      doc.text(middle, middleColumnX, rightY, { width: columnWidth * 0.2, align: 'center' });
    }

    if (amount) {
      doc.text(`${prefix ?? ''}${amount}`, rightX + footerPadding, rightY, {
        width: columnWidth,
        align: 'right',
      });
    }

    rightY += layout.lineHeight;
  };

  // Subtotal (sin valor intermedio)
  drawRow('Subtotal:', undefined, `$${data.totals.subtotal.toFixed(2)}`);

  // Descuento con %
  drawRow(
    'Descuento:',
    `${(data.discount ?? 0)}%`,
    `$${(data.totals.subtotal - data.totals.discount).toFixed(2)}`
  );

  // Transporte con valor intermedio
  drawRow(
    'Transporte:',
    `$${data.deliveryPrice.toFixed(2)}`,
    `$${(data.totals.subtotal - data.totals.discount + data.deliveryPrice).toFixed(2)}`,
  );

  // === Total ===
  const totalY = cursor.y + subtotalHeight + spacing;
  doc
    .lineWidth(1)
    .roundedRect(rightX, totalY, rightWidth, totalHeight, layout.borderRadius)
    .stroke('#000');

  const totalTextY = totalY + (totalHeight - 10) / 2;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Total:', rightX + footerPadding, totalTextY, { width: columnWidth * 0.4, align: 'left' });
  doc.text(`$${data.totals.final.toFixed(2)}`, rightX + footerPadding, totalTextY, {
    width: columnWidth,
    align: 'right',
  });
};
