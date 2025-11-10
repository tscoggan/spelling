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

  const targetWordCount = Math.min(10, words.length);
  const maxAttempts = 20;
  let bestResult: CrosswordGrid | null = null;
  let bestWordCount = 0;

  console.log(`🎯 Target: ${targetWordCount} words from ${words.length} available`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = attemptCrosswordGeneration(words, clues, attempt, false);
    const wordCount = result.entries.length;

    if (wordCount > bestWordCount) {
      bestResult = result;
      bestWordCount = wordCount;
      console.log(`✨ Attempt ${attempt + 1}: Placed ${wordCount} words (best so far)`);
    }

    if (wordCount >= targetWordCount) {
      console.log(`✅ Achieved target of ${targetWordCount} words!`);
      break;
    }
  }

  // If we still haven't reached the target, guarantee placement by adding remaining words
  if (bestResult && bestResult.entries.length < targetWordCount) {
    console.log(`⚠️ Forcing additional words to reach target of ${targetWordCount}...`);
    bestResult = guaranteeMinimumWords(bestResult, words, clues, targetWordCount);
  }

  console.log(`📊 Final result: ${bestResult?.entries.length || 0} words placed`);
  return bestResult || { cells: [], entries: [], rows: 0, cols: 0 };
}

function attemptCrosswordGeneration(
  words: string[],
  clues: string[],
  seed: number,
  allowNonIntersecting: boolean = false
): CrosswordGrid {
  const wordData = words.map((word, index) => ({
    word: word.toUpperCase(),
    clue: clues[index] || "Spell this word",
    originalIndex: index,
  }));

  const sortedByLength = [...wordData].sort((a, b) => b.word.length - a.word.length);
  const firstWord = sortedByLength[0];
  const remainingWords = sortedByLength.slice(1);
  
  const shuffledRemaining = shuffleArray(remainingWords, seed);
  const shuffledWords = [firstWord, ...shuffledRemaining];

  const gridSize = 30;
  const grid: (string | null)[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(null));

  const entries: CrosswordEntry[] = [];

  const centerRow = Math.floor(gridSize / 2);
  const centerCol = Math.floor(gridSize / 2 - shuffledWords[0].word.length / 2);

  for (let i = 0; i < shuffledWords[0].word.length; i++) {
    grid[centerRow][centerCol + i] = shuffledWords[0].word[i];
  }

  entries.push({
    word: shuffledWords[0].word,
    number: 1,
    direction: "across",
    row: centerRow,
    col: centerCol,
    clue: shuffledWords[0].clue,
  });

  let entryNumber = 2;
  for (let wordIndex = 1; wordIndex < shuffledWords.length; wordIndex++) {
    const { word, clue } = shuffledWords[wordIndex];
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
          if (canPlaceWord(grid, word, placement.row, placement.col, placement.direction, entries)) {
            const intersections = countIntersections(
              grid,
              word,
              placement.row,
              placement.col,
              placement.direction
            );

            const minIntersections = allowNonIntersecting ? 0 : 1;
            if (
              intersections >= minIntersections &&
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
    }
  }

  let finalEntries = entries;
  
  if (!allowNonIntersecting) {
    const nonIsolatedEntries = filterIsolatedWords(entries);
    finalEntries = nonIsolatedEntries.length > 0 ? nonIsolatedEntries : entries.slice(0, 1);

    if (finalEntries.length < entries.length) {
      entries.length = 0;
      entries.push(...finalEntries);

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          grid[r][c] = null;
        }
      }

      finalEntries.forEach(entry => {
        placeWord(grid, entry.word, entry.row, entry.col, entry.direction);
      });
    }
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

function shuffleArray<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentSeed = seed;
  
  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function guaranteeMinimumWords(
  currentResult: CrosswordGrid,
  allWords: string[],
  allClues: string[],
  targetCount: number
): CrosswordGrid {
  const placedWords = new Set(currentResult.entries.map(e => e.word));
  const remainingWords = allWords
    .map((word, index) => ({
      word: word.toUpperCase(),
      clue: allClues[index] || "Spell this word",
    }))
    .filter(w => !placedWords.has(w.word));

  if (remainingWords.length === 0 || currentResult.entries.length >= targetCount) {
    return currentResult;
  }

  const gridSize = 50;
  const grid: (string | null)[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(null));

  currentResult.entries.forEach(entry => {
    for (let i = 0; i < entry.word.length; i++) {
      const r = entry.direction === "across" ? entry.row : entry.row + i;
      const c = entry.direction === "across" ? entry.col + i : entry.col;
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        grid[r][c] = entry.word[i];
      }
    }
  });

  const entries = [...currentResult.entries];
  let entryNumber = Math.max(...currentResult.entries.map(e => e.number), 0) + 1;
  let wordsAdded = 0;
  const neededCount = targetCount - currentResult.entries.length;

  for (const { word, clue } of remainingWords) {
    if (wordsAdded >= neededCount) break;

    let placed = false;
    
    for (let row = 2; row < gridSize - 2 && !placed; row++) {
      for (let col = 2; col < gridSize - 2 && !placed; col++) {
        const directions: Array<"across" | "down"> = ["across", "down"];
        
        for (const direction of directions) {
          if (placed) break;
          
          if (canPlaceWordLoose(grid, word, row, col, direction)) {
            placeWord(grid, word, row, col, direction);
            entries.push({
              word,
              number: entryNumber++,
              direction,
              row,
              col,
              clue,
            });
            placed = true;
            wordsAdded++;
            console.log(`  ✓ Added "${word}" at (${row},${col}) ${direction}`);
          }
        }
      }
    }

    if (!placed) {
      console.warn(`  ✗ Could not place "${word}"`);
    }
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

function canPlaceWordLoose(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: "across" | "down"
): boolean {
  const gridSize = grid.length;

  if (direction === "across") {
    if (col + word.length > gridSize) return false;
    
    for (let i = -1; i <= word.length; i++) {
      if (col + i < 0 || col + i >= gridSize) continue;
      if (grid[row][col + i] !== null) return false;
    }
    
    for (let i = 0; i < word.length; i++) {
      if (row > 0 && grid[row - 1][col + i] !== null) return false;
      if (row < gridSize - 1 && grid[row + 1][col + i] !== null) return false;
    }
  } else {
    if (row + word.length > gridSize) return false;
    
    for (let i = -1; i <= word.length; i++) {
      if (row + i < 0 || row + i >= gridSize) continue;
      if (grid[row + i][col] !== null) return false;
    }
    
    for (let i = 0; i < word.length; i++) {
      if (col > 0 && grid[row + i][col - 1] !== null) return false;
      if (col < gridSize - 1 && grid[row + i][col + 1] !== null) return false;
    }
  }

  return true;
}

function canPlaceWord(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: "across" | "down",
  existingEntries: CrosswordEntry[] = []
): boolean {
  const gridSize = grid.length;

  // Check if starting cell is already used as a starting cell for another word
  for (const entry of existingEntries) {
    if (entry.row === row && entry.col === col) {
      return false; // Cannot start two words in the same box
    }
  }

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

function filterIsolatedWords(entries: CrosswordEntry[]): CrosswordEntry[] {
  if (entries.length === 0) return [];
  
  return entries.filter((entry, idx) => {
    for (let i = 0; i < entries.length; i++) {
      if (i === idx) continue;
      if (entriesIntersect(entry, entries[i])) {
        return true;
      }
    }
    return false;
  });
}
