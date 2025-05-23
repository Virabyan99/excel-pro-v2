export function getDataArray(cells: Record<string, string>, maxRows: number, maxCols: number): string[][] {
  const data: string[][] = Array.from({ length: maxRows }, () => Array(maxCols).fill(''));
  Object.entries(cells).forEach(([key, value]) => {
    const [row, col] = key.split(',').map(Number);
    if (row < maxRows && col < maxCols) {
      data[row][col] = value;
    }
  });
  return data;
}

export function setDataArray(cells: Record<string, string>, data: string[][]) {
  const newCells: Record<string, string> = {};
  data.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell !== '') {
        newCells[`${rowIndex},${colIndex}`] = cell;
      }
    });
  });
  Object.assign(cells, newCells);
}