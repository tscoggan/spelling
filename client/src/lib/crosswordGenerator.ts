export interface CrosswordCell {
  letter: string;
  number?: number;
  isBlank: boolean;
}

export interface CrosswordEntry {
  word: string;
  number: number;
  direction: "across" | "down";
  row: number;
  col: number;
  clue: string;
}

export interface CrosswordGrid {
  cells: CrosswordCell[][];
  entries: CrosswordEntry[];
  rows: number;
  cols: number;
}

export function generateCrossword(
  words: string[],
  clues: string[]
): CrosswordGrid {
  if (words.length === 0) {
    return { cells: [], entries: [], rows: 0, cols: 0 };
  }

  const sortedWords = words
    .map((word, index) => ({
      word: word.toUpperCase(),
      clue: clues[index] || "Spell this word",
      originalIndex: index,
    }))
    .sort((a, b) => b.word.length - a.word.length);

  const gridSize = Math.max(20, sortedWords[0].word.length + 5);
  const grid: (string | null)[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(null));

  const entries: CrosswordEntry[] = [];
  const placed: boolean[] = Array(sortedWords.length).fill(false);

  const centerRow = Math.floor(gridSize / 2);
  const centerCol = Math.floor(gridSize / 2 - sortedWords[0].word.length / 2);

  for (let i = 0; i < sortedWords[0].word.length; i++) {
    grid[centerRow][centerCol + i] = sortedWords[0].word[i];
  }

  entries.push({
    word: sortedWords[0].word,
    number: 1,
    direction: "across",
    row: centerRow,
    col: centerCol,
    clue: sortedWords[0].clue,
  });
  placed[0] = true;

  let entryNumber = 2;
  for (let wordIndex = 1; wordIndex < sortedWords.length; wordIndex++) {
    const { word, clue } = sortedWords[wordIndex];
    let bestPlacement: {
      row: number;
      col: number;
      direction: "across" | "down";
      intersections: number;
    } | null = null;

    for (let row = 1; row < gridSize - 1; row++) {
      for (let col = 1; col < gridSize - 1; col++) {
        const placements = [
          { row, col, direction: "across" as const },
          { row, col, direction: "down" as const },
        ];

        for (const placement of placements) {
          if (canPlaceWord(grid, word, placement.row, placement.col, placement.direction)) {
            const intersections = countIntersections(
              grid,
              word,
              placement.row,
              placement.col,
              placement.direction
            );

            if (
              intersections > 0 &&
              (!bestPlacement || intersections > bestPlacement.intersections)
            ) {
              bestPlacement = { ...placement, intersections };
            }
          }
        }
      }
    }

    if (bestPlacement) {
      placeWord(grid, word, bestPlacement.row, bestPlacement.col, bestPlacement.direction);
      entries.push({
        word,
        number: entryNumber++,
        direction: bestPlacement.direction,
        row: bestPlacement.row,
        col: bestPlacement.col,
        clue,
      });
      placed[wordIndex] = true;
    }
  }

  if (!checkConnectivity(entries)) {
    console.warn('🔗 Some words are disconnected. Filtering to keep only connected words.');
    const connectedEntries = filterConnectedEntries(entries);
    
    const disconnectedWords = entries.filter(e => !connectedEntries.includes(e)).map(e => e.word);
    console.log('🚫 Removed disconnected words:', disconnectedWords);
    
    entries.length = 0;
    entries.push(...connectedEntries);
    
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        grid[r][c] = null;
      }
    }
    
    connectedEntries.forEach(entry => {
      placeWord(grid, entry.word, entry.row, entry.col, entry.direction);
    });
  }

  const { minRow, maxRow, minCol, maxCol } = findBounds(grid);
  const finalRows = maxRow - minRow + 1;
  const finalCols = maxCol - minCol + 1;

  const cells: CrosswordCell[][] = Array(finalRows)
    .fill(null)
    .map((_, r) =>
      Array(finalCols)
        .fill(null)
        .map((_, c) => {
          const letter = grid[minRow + r][minCol + c];
          return {
            letter: letter || "",
            isBlank: letter === null,
            number: undefined,
          };
        })
    );

  entries.forEach((entry) => {
    entry.row -= minRow;
    entry.col -= minCol;
    if (cells[entry.row] && cells[entry.row][entry.col]) {
      cells[entry.row][entry.col].number = entry.number;
    }
  });

  return {
    cells,
    entries,
    rows: finalRows,
    cols: finalCols,
  };
}

function canPlaceWord(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: "across" | "down"
): boolean {
  const gridSize = grid.length;

  if (direction === "across") {
    if (col + word.length > gridSize) return false;
    if (col > 0 && grid[row][col - 1] !== null) return false;
    if (col + word.length < gridSize && grid[row][col + word.length] !== null) return false;

    for (let i = 0; i < word.length; i++) {
      const currentCell = grid[row][col + i];
      if (currentCell !== null && currentCell !== word[i]) return false;

      if (currentCell === null) {
        if (row > 0 && grid[row - 1][col + i] !== null) return false;
        if (row < gridSize - 1 && grid[row + 1][col + i] !== null) return false;
      }
    }
  } else {
    if (row + word.length > gridSize) return false;
    if (row > 0 && grid[row - 1][col] !== null) return false;
    if (row + word.length < gridSize && grid[row + word.length][col] !== null) return false;

    for (let i = 0; i < word.length; i++) {
      const currentCell = grid[row + i][col];
      if (currentCell !== null && currentCell !== word[i]) return false;

      if (currentCell === null) {
        if (col > 0 && grid[row + i][col - 1] !== null) return false;
        if (col < gridSize - 1 && grid[row + i][col + 1] !== null) return false;
      }
    }
  }

  return true;
}

function countIntersections(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: "across" | "down"
): number {
  let count = 0;

  for (let i = 0; i < word.length; i++) {
    const r = direction === "across" ? row : row + i;
    const c = direction === "across" ? col + i : col;

    if (grid[r][c] === word[i]) {
      count++;
    }
  }

  return count;
}

function placeWord(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: "across" | "down"
): void {
  for (let i = 0; i < word.length; i++) {
    if (direction === "across") {
      grid[row][col + i] = word[i];
    } else {
      grid[row + i][col] = word[i];
    }
  }
}

function findBounds(grid: (string | null)[][]): {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
} {
  let minRow = grid.length;
  let maxRow = 0;
  let minCol = grid[0].length;
  let maxCol = 0;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] !== null) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  return { minRow, maxRow, minCol, maxCol };
}

function checkConnectivity(entries: CrosswordEntry[]): boolean {
  if (entries.length <= 1) return true;

  const visited = new Set<number>();
  const queue: number[] = [0];
  visited.add(0);

  while (queue.length > 0) {
    const currentIdx = queue.shift()!;
    const current = entries[currentIdx];

    for (let i = 0; i < entries.length; i++) {
      if (visited.has(i)) continue;
      
      const other = entries[i];
      if (entriesIntersect(current, other)) {
        visited.add(i);
        queue.push(i);
      }
    }
  }

  return visited.size === entries.length;
}

function entriesIntersect(a: CrosswordEntry, b: CrosswordEntry): boolean {
  if (a.direction === b.direction) return false;

  const across = a.direction === "across" ? a : b;
  const down = a.direction === "down" ? a : b;

  const acrossStartCol = across.col;
  const acrossEndCol = across.col + across.word.length - 1;
  const acrossRow = across.row;

  const downStartRow = down.row;
  const downEndRow = down.row + down.word.length - 1;
  const downCol = down.col;

  return (
    downCol >= acrossStartCol &&
    downCol <= acrossEndCol &&
    acrossRow >= downStartRow &&
    acrossRow <= downEndRow
  );
}

function filterConnectedEntries(entries: CrosswordEntry[]): CrosswordEntry[] {
  if (entries.length === 0) return [];

  const visited = new Set<number>();
  const queue: number[] = [0];
  visited.add(0);

  while (queue.length > 0) {
    const currentIdx = queue.shift()!;
    const current = entries[currentIdx];

    for (let i = 0; i < entries.length; i++) {
      if (visited.has(i)) continue;
      
      const other = entries[i];
      if (entriesIntersect(current, other)) {
        visited.add(i);
        queue.push(i);
      }
    }
  }

  return entries.filter((_, idx) => visited.has(idx));
}
