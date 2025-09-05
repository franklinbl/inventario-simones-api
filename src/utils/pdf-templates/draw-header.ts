import moment from 'moment';
import { createLayout, Cursor } from '../pdf-layout';

export const drawHeader = (
  doc: PDFKit.PDFDocument,
  data: any,
  layout: ReturnType<typeof createLayout>,
  cursor: Cursor
) => {
  const { margin, usableWidth } = layout;
  const headerHeight = 100;
  const headerY = cursor.y;

  // Dividir en dos bloques: izquierdo y derecho
  const leftWidth = usableWidth * 0.5;
  const rightWidth = usableWidth - leftWidth - 20; // 20pt de separación

  // === BLOQUE IZQUIERDO: Empresa ===
  doc
    .lineWidth(1)
    .roundedRect(margin, headerY, leftWidth, headerHeight, layout.borderRadius)
    .stroke('#000');

  const leftY = headerY + layout.padding + 10;

  // Nombre de la empresa
  doc.fontSize(16).font('Helvetica-Bold').text('FESTEJO SIMONES', margin + layout.padding, leftY);

  // === DIRECCIÓN (en dos líneas) ===
  const addressLine1 = 'DIRECCIÓN: Carrera 16 entre calle 57 y 58.';
  const addressLine2 = 'Barquisimeto, Edo. Lara';

  const addressX = margin + layout.padding;
  const addressY1 = leftY + 22;
  const addressY2 = addressY1 + layout.lineHeight;

  doc.fontSize(10).font('Helvetica');
  doc.text(addressLine1, addressX, addressY1, { continued: true });
  doc.text(addressLine2, -94, addressY2); // Usa 0 para alinear con el inicio del texto anterior

  // Teléfono
  doc.text('TELÉFONO: 0251-4428714 / 0412-0573784', addressX, addressY2 + layout.lineHeight);

  // === BLOQUE DERECHO: Nota de entrega ===
  const rightX = margin + leftWidth + 20;
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('NOTA DE ENTREGA', rightX, headerY + 12, { width: rightWidth, align: 'center' });

  let rightY = headerY + 36;
  doc.fontSize(10).font('Helvetica');
  doc.text('Fecha de la renta:', rightX + 8, rightY, { width: 100, align: 'left' });
  doc.text(moment(data.dates.start).format('DD/MM/YYYY'), rightX + 120, rightY, { width: 100, align: 'center' });

  rightY += 18;
  doc.text('Fecha de entrega:', rightX + 8, rightY, { width: 100, align: 'left' });
  doc.text(moment(data.dates.end).format('DD/MM/YYYY'), rightX + 120, rightY, { width: 100, align: 'center' });

  rightY += 18;
  doc.roundedRect(rightX + 8, rightY, rightWidth - 16, 24, 6).stroke('#000');
  doc.text('Entrega número:', rightX + 12, rightY + 8, { width: 100, align: 'left' });
  doc.text(String(data.rentalId).padStart(10, '0'), rightX + 120, rightY + 8, { width: 100, align: 'center' });

  // Actualizar cursor
  cursor.y = headerY + headerHeight + layout.sectionSpacing;
};