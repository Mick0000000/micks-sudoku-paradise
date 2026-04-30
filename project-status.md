# Project Status

**Last updated:** 2026-04-02
**Status:** 🟢 Spec Complete — ready for Claude Code

---

## Finalized Decisions
| # | Topic | Decision |
|---|---|---|
| 1 | Hint behavior | Auto-reveal random unsolved cell |
| 2 | Expert loading state | Animated SVG pencil-writing animation (loops until Worker returns) |
| 3 | New Game mid-game | Show confirmation dialog if a game is in progress |
| 4 | File structure | 4 files: `index.html`, `style.css`, `app.js`, `worker.js` — no build, opens via `file://` |

---

## Current Phase
Pre-development. Spec complete. Ready for Claude Code to begin implementation.

---

## Completion Checklist

### Foundation
- [ ] HTML scaffold with semantic structure
- [ ] CSS variables for light/dark theming
- [ ] Google Fonts loaded (Bebas Neue + DM Mono + DM Sans)
- [ ] localStorage utility functions (get/set/clear)

### Puzzle Engine
- [ ] `solveSudoku(grid)` — recursive backtracking solver with shuffled candidates
- [ ] `countSolutions(grid, limit)` — uniqueness checker, exits early at limit=2
- [ ] `generateSolvedGrid()` — produces a randomized valid complete grid
- [ ] `carvePuzzle(solvedGrid, clueCount)` — removes cells while maintaining uniqueness
- [ ] `generatePuzzle(difficulty)` — orchestrates the above, returns `{ puzzle, solution }`
- [ ] Web Worker wrapper for puzzle generation (keeps UI responsive)
- [ ] Loading state shown during generation

### Grid Rendering
- [ ] 9×9 grid rendered as CSS grid
- [ ] Correct thick borders on 3×3 box boundaries
- [ ] Given cell styling (bold, dark)
- [ ] User cell styling (colored, normal weight)
- [ ] Wrong cell styling (red, shake animation)
- [ ] Selected cell highlight
- [ ] Peer cells highlight (same row/col/box)
- [ ] Same-number cells highlight
- [ ] Notes grid rendering (3×3 mini numbers inside cell)

### Input & Controls
- [ ] Cell click to select
- [ ] Arrow key navigation
- [ ] Number key input (1–9)
- [ ] Delete/Backspace to erase
- [ ] N key toggles notes mode
- [ ] Z / Ctrl+Z undo
- [ ] Y / Ctrl+Y redo
- [ ] Number pad (9 buttons) with remaining count badges
- [ ] Notes Mode toggle button
- [ ] Erase button
- [ ] Undo/Redo buttons

### Game Logic
- [ ] Mistake detection and counter
- [ ] Mistake limit enforcement (game over at max)
- [ ] Mistake dots indicator (filled per mistake)
- [ ] Auto-clear notes when digit placed in row/col/box (if setting on)
- [ ] Hint: reveal one correct cell value
- [ ] Hint counter display
- [ ] Win detection (all cells filled correctly)
- [ ] Undo/Redo history stack

### Modals
- [ ] New Game confirmation (or immediate — TBD)
- [ ] Win modal (difficulty, mistakes, hints used)
- [ ] Game Over / lose modal (with "Reveal Solution" option)
- [ ] Settings modal (all toggles functional)
- [ ] Statistics modal

### Settings
- [ ] Max mistakes selector (0/1/2/3)
- [ ] Highlight related toggle
- [ ] Highlight same number toggle
- [ ] Show mistakes toggle
- [ ] Auto-clear notes toggle
- [ ] All settings persisted to localStorage

### Statistics
- [ ] Track completed games per difficulty
- [ ] Track total mistakes lifetime
- [ ] Best performance records
- [ ] Stats display in modal

### Polish
- [ ] Light / Dark theme toggle
- [ ] Animated SVG pencil-writing overlay during Expert puzzle generation (Web Worker loading state)
- [ ] New Game confirmation dialog when a game is in progress
- [ ] Cell pop animation on correct placement
- [ ] Grid shake animation on wrong entry
- [ ] Toast notifications
- [ ] Pause button + overlay (hides grid)
- [ ] Number pad greys out completed digits
- [ ] Keyboard shortcut reference in sidebar
- [ ] Responsive layout for large desktop screens

---

## Known Issues / Blockers
_None yet — not started_

---

## Deferred / Out of Scope
- Timer / elapsed time display (removed per user request)
- Daily puzzle / seeded RNG
- Mobile layout optimization
- Online leaderboards
