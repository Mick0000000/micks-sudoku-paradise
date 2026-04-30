// worker.js — Sudoku puzzle generation (runs off the main thread)

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValid(grid, idx, num) {
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 9; i++) {
    if (grid[row * 9 + i] === num) return false;
    if (grid[i * 9 + col] === num) return false;
    if (grid[(boxRow + Math.floor(i / 3)) * 9 + (boxCol + i % 3)] === num) return false;
  }
  return true;
}

// Backtracking solver with shuffled candidates — produces a random valid grid
function solve(grid) {
  let empty = -1;
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0) { empty = i; break; }
  }
  if (empty === -1) return true;
  const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const num of candidates) {
    if (isValid(grid, empty, num)) {
      grid[empty] = num;
      if (solve(grid)) return true;
      grid[empty] = 0;
    }
  }
  return false;
}

// Count solutions, stopping early at `limit` (2 is enough for uniqueness checks)
function countSolutions(grid, limit) {
  let empty = -1;
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0) { empty = i; break; }
  }
  if (empty === -1) return 1;
  let count = 0;
  for (let num = 1; num <= 9; num++) {
    if (isValid(grid, empty, num)) {
      grid[empty] = num;
      count += countSolutions(grid, limit);
      grid[empty] = 0;
      if (count >= limit) return count;
    }
  }
  return count;
}

function generateSolvedGrid() {
  const grid = new Array(81).fill(0);
  solve(grid);
  return grid;
}

function carvePuzzle(solution, targetClues) {
  const puzzle = [...solution];
  const positions = shuffle([...Array(81).keys()]);
  let cluesLeft = 81;

  for (const pos of positions) {
    if (cluesLeft <= targetClues) break;
    const val = puzzle[pos];
    puzzle[pos] = 0;
    const copy = [...puzzle];
    if (countSolutions(copy, 2) !== 1) {
      puzzle[pos] = val; // removing this cell breaks uniqueness — put it back
    } else {
      cluesLeft--;
    }
  }
  return puzzle;
}

const CLUE_COUNTS = { medium: 36, hard: 28, expert: 22, evil: 17 };

self.onmessage = function (e) {
  const { difficulty } = e.data;
  const targetClues = CLUE_COUNTS[difficulty] ?? 36;
  const solution = generateSolvedGrid();
  const puzzle = carvePuzzle([...solution], targetClues);
  self.postMessage({ puzzle, solution });
};
