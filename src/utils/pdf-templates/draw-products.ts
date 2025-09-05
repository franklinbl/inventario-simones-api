import { createLayout, Cursor } from '../pdf-layout';

// Alturas fijas
const HEADER_HEIGHT = 25;
const ROW_HEIGHT = 30;
const FOOTER_SAFE_SPACE = 100; // Espacio reservado para el footer

// Columnas
const COLUMN_WIDTHS = {
  codigo: 60,
  descripcion: 200,
  cantidad: 60,
  precio: 80,
  total: 80,
};

export const drawProductsTable = (
  doc: PDFKit.PDFDocument,
  data: any,
  layout: ReturnType<typeof createLayout>,
  cursor: Cursor
) => {
  const { margin, usableWidth } = layout;
  const startX = margin;
  const tableWidth = usableWidth;
  const pageHeight = doc.page.height;
  const bottomMargin = 28.35;

  // Verificar si hay productos
  if (!data.products || data.products.length === 0) {
    doc.fontSize(10).text('No hay productos en este alquiler', startX, cursor.y);
    cursor.y += 40;
    return;
  }

  // Función para dibujar encabezados
  const drawHeaders = () => {
    const headerY = cursor.y;

    // Recuadro de encabezado
    doc
      .lineWidth(1)
      .roundedRect(startX, headerY, tableWidth, HEADER_HEIGHT, 6)
      .stroke('#000');

    let currentX = startX + 8;
    const headerTextY = headerY + (HEADER_HEIGHT - 12) / 2;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
    doc.text('Código', currentX, headerTextY, { width: COLUMN_WIDTHS.codigo, align: 'left' });
    currentX += COLUMN_WIDTHS.codigo;

    doc.text('Descripción', currentX, headerTextY, { width: COLUMN_WIDTHS.descripcion, align: 'left' });
    currentX += COLUMN_WIDTHS.descripcion;

    doc.text('Cantidad', currentX, headerTextY, { width: COLUMN_WIDTHS.cantidad, align: 'left' });
    currentX += COLUMN_WIDTHS.cantidad;

    doc.text('Precio Unit.', currentX, headerTextY, { width: COLUMN_WIDTHS.precio, align: 'left' });
    currentX += COLUMN_WIDTHS.precio;

    doc.text('Total', currentX, headerTextY, { width: COLUMN_WIDTHS.total, align: 'right' });

    cursor.y = headerY + HEADER_HEIGHT + 5;
  };

  // Función para dibujar una fila
  const drawRow = (product: any) => {
    const rowY = cursor.y;

    // Verificar si hay espacio para esta fila
    if (rowY > pageHeight - bottomMargin - FOOTER_SAFE_SPACE) {
      doc.addPage();
      cursor.y = margin; // Reiniciar Y en nueva página
      drawHeaders(); // Redibujar encabezados
    }

    let currentX = startX + 8;
    const total = product.quantity * product.price;

    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text(product.code, currentX, rowY, { width: COLUMN_WIDTHS.codigo, align: 'left' });
    currentX += COLUMN_WIDTHS.codigo;

    doc.text(product.name, currentX, rowY, { width: COLUMN_WIDTHS.descripcion, align: 'left' });
    currentX += COLUMN_WIDTHS.descripcion;

    doc.text(product.quantity.toString(), currentX, rowY, { width: COLUMN_WIDTHS.cantidad, align: 'left' });
    currentX += COLUMN_WIDTHS.cantidad;

    doc.text(`$${product.price.toFixed(2)}`, currentX, rowY, { width: COLUMN_WIDTHS.precio, align: 'left' });
    currentX += COLUMN_WIDTHS.precio;

    doc.text(`$${total.toFixed(2)}`, currentX, rowY, { width: COLUMN_WIDTHS.total, align: 'right' });

    cursor.y = rowY + ROW_HEIGHT;
  };

  // Dibujar tabla
  drawHeaders();

  for (const product of data.products) {
    drawRow(product);
  }
};