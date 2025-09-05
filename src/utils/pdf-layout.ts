
export class Cursor {
  constructor(public y: number) {}

  moveDown(height = 20): number {
    this.y += height;
    return this.y;
  }

  getCurrentY(): number {
    return this.y;
  }
}

export const createLayout = (pageWidth: number) => {
  const margin = 28.35; // 1 cm en puntos
  const usableWidth = pageWidth - margin * 2;

  return {
    margin,
    usableWidth,
    padding: 12,
    lineHeight: 16,
    sectionSpacing: 20,
    borderRadius: 8,
  };
};