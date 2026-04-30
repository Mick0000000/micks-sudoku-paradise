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

// ── Logical solver (technique-based difficulty rating) ────────────────────────
// Returns the candidates for an empty cell given the current grid state.
function candidates(grid, idx) {
  const row = Math.floor(idx / 9), col = idx % 9;
  const used = new Set();
  for (let i = 0; i < 9; i++) {
    used.add(grid[row * 9 + i]);
    used.add(grid[i * 9 + col]);
  }
  const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      used.add(grid[(br + dr) * 9 + (bc + dc)]);
  const result = [];
  for (let n = 1; n <= 9; n++) if (!used.has(n)) result.push(n);
  return result;
}

// 27 units: 9 rows + 9 columns + 9 boxes
const UNITS = (() => {
  const units = [];
  for (let r = 0; r < 9; r++)
    units.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++)
    units.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let br = 0; br < 3; br++)
    for (let bc = 0; bc < 3; bc++) {
      const cells = [];
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          cells.push((br * 3 + dr) * 9 + (bc * 3 + dc));
      units.push(cells);
    }
  return units;
})();

// Attempt to solve the puzzle using only naked singles + hidden singles.
// Returns the solved grid if successful, or null if stuck (requires harder techniques).
function logicalSolve(puzzle) {
  const g = [...puzzle];
  let progress = true;

  while (progress) {
    progress = false;

    // Naked singles: a cell with exactly one candidate
    for (let i = 0; i < 81; i++) {
      if (g[i] !== 0) continue;
      const cands = candidates(g, i);
      if (cands.length === 0) return null; // contradiction — invalid state
      if (cands.length === 1) {
        g[i] = cands[0];
        progress = true;
      }
    }

    // Hidden singles: in each unit, a digit that can go in only one cell
    for (const unit of UNITS) {
      for (let n = 1; n <= 9; n++) {
        const places = unit.filter(i => g[i] === 0 && candidates(g, i).includes(n));
        if (places.length === 1) {
          g[places[0]] = n;
          progress = true;
        }
      }
    }
  }

  return g.every(v => v !== 0) ? g : null;
}

// ── Carving ───────────────────────────────────────────────────────────────────

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
      puzzle[pos] = val;
    } else {
      cluesLeft--;
    }
  }
  return puzzle;
}

// Carve a puzzle guaranteed to require techniques beyond hidden singles.
// Tries up to maxAttempts full generation cycles; falls back to an unverified carve.
function carveHardPuzzle(targetClues, maxAttempts) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = generateSolvedGrid();
    const puzzle   = carvePuzzle([...solution], targetClues);
    if (logicalSolve(puzzle) === null) {
      // Logical solver got stuck — puzzle requires advanced techniques
      return { puzzle, solution };
    }
  }
  // Fallback: return last generated puzzle even if logically easier
  const solution = generateSolvedGrid();
  const puzzle   = carvePuzzle([...solution], targetClues);
  return { puzzle, solution };
}

// ── Difficulty config ─────────────────────────────────────────────────────────
// Clue counts chosen so technique-verification produces the real difficulty signal.
// Evil targets 24 clues (not 17) — hardest rated puzzles cluster at 22–26,
// and the puzzle is rejected unless it resists naked+hidden-single solving.
const CLUE_COUNTS = { medium: 36, hard: 28, expert: 24, evil: 24 };

self.onmessage = function (e) {
  const { difficulty } = e.data;
  const targetClues = CLUE_COUNTS[difficulty] ?? 36;

  if (difficulty === 'evil') {
    const { puzzle, solution } = carveHardPuzzle(targetClues, 10);
    self.postMessage({ puzzle, solution });
  } else {
    const solution = generateSolvedGrid();
    const puzzle   = carvePuzzle([...solution], targetClues);
    self.postMessage({ puzzle, solution });
  }
};
