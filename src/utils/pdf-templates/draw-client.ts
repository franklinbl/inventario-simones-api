import { createLayout, Cursor } from '../pdf-layout';

export const drawClientSection = (
  doc: PDFKit.PDFDocument,
  data: any,
  layout: ReturnType<typeof createLayout>,
  cursor: Cursor
) => {
  const { margin, usableWidth } = layout;
  const sectionHeight = 65;

  // Dibujar recuadro
  doc
    .lineWidth(1)
    .roundedRect(margin, cursor.y, usableWidth, sectionHeight, layout.borderRadius)
    .stroke('#000');

  const startY = cursor.y + layout.padding;
  const labelX = margin + layout.padding;
  const valueX = labelX + 80 + 20; // 80px para label, 20px de separación

  doc.fontSize(10);

  // Cliente
  doc.font('Helvetica-Bold').text('CLIENTE:', labelX, startY);
  doc.font('Helvetica').text(data.client.name, valueX, startY);

  // Dirección
  const clientY = startY + layout.lineHeight;
  doc.font('Helvetica-Bold').text('CÉDULA:', labelX, clientY);
  doc.font('Helvetica').text(data.client.dni, valueX, clientY);

  // Teléfono
  const phoneY = clientY + layout.lineHeight;
  doc.font('Helvetica-Bold').text('TELÉFONO:', labelX, phoneY);
  doc.font('Helvetica').text(data.client.phone, valueX, phoneY);

  // Actualizar cursor
  cursor.y = cursor.y + sectionHeight + layout.sectionSpacing;
};