# Sudoku — Desktop Browser App
## Project Overview

A polished, fully self-contained desktop browser Sudoku app delivered as a single HTML file (no server, no dependencies). The app generates its own puzzles on the fly using a backtracking algorithm, so no external puzzle API is needed.

---

## Stack & Architecture

- **Four files:** `index.html` + `style.css` + `app.js` + `worker.js` — zero build step, opens directly via `file://`
- **No dependencies or CDN** (except Google Fonts, which is optional and degrades gracefully)
- **Puzzle generation:** Client-side backtracking algorithm (pure JS), runs in a proper `worker.js` file
- **Persistence:** `localStorage` for settings, best times, and stats

---

## Puzzle Generation Approach

Puzzles are generated entirely in the browser using a two-phase algorithm:

### Phase 1 — Generate a valid solved grid
1. Start with an empty 9×9 grid
2. Use a **recursive backtracking solver** with shuffled candidate numbers so each run produces a unique board
3. Result: a fully solved, valid Sudoku grid

### Phase 2 — Carve out a puzzle
1. Shuffle all 81 cell positions randomly
2. Remove cells one at a time
3. After each removal, run a **solution counter** — if the puzzle still has exactly 1 solution, keep the removal; otherwise put the number back
4. Stop when the target clue count is reached

### Difficulty via clue count
| Level  | Clues | Removed |
|--------|-------|---------|
| Medium | ~36   | ~45     |
| Hard   | ~28   | ~53     |
| Expert | ~22   | ~59     |

### Performance notes
- Medium and Hard generate in under 200ms in all modern browsers
- Expert (22 clues) is harder to carve and may take 300–800ms — run generation in a **Web Worker** to keep the UI thread unblocked
- During generation: show an animated SVG pencil-writing overlay (see UI/UX section below)

### Uniqueness guarantee
The solution counter uses the same backtracking solver with an early exit at count = 2. This guarantees every puzzle has exactly one solution.

### Web Worker implementation note
The puzzle generator runs in `worker.js` — a proper separate file. This is simpler and more debuggable than the Blob URL pattern. Since the app is opened via `file://`, `new Worker('worker.js')` works without any server:
```js
const worker = new Worker('worker.js');
```

---

## Feature Set

### Core gameplay
- 9×9 Sudoku grid, mouse and keyboard input
- Three difficulty levels: Medium, Hard, Expert
- Number notes (pencil marks) — toggle Notes Mode on/off
- Undo / Redo stack
- Erase cell
- Hint system (configurable limit, default 3 per game) — auto-reveals a random unsolved cell
- Mistake tracking with configurable max (0 = unlimited, 1, 2, or 3)
- Game Over modal when mistake limit hit
- Victory modal when puzzle solved
- New Game confirmation dialog if a game is already in progress

### Input methods
- Click a cell to select, then click a number button or press 1–9
- Arrow keys to move between cells
- `N` key toggles Notes Mode
- `Delete` / `Backspace` erases the selected cell
- `Z` / `Ctrl+Z` for undo, `Y` / `Ctrl+Y` for redo

### Settings (persisted in localStorage)
- Max mistakes allowed (0 = unlimited, 1, 2, 3)
- Highlight related cells (row, column, box) — on/off
- Highlight same number across board — on/off
- Show mistakes in red — on/off
- Auto-clear notes when a number is confirmed — on/off

### UI / UX
- Light and Dark theme toggle
- **Pencil writing SVG animation** — full-screen overlay shown while Expert puzzle is generating via Web Worker; animated pencil tip traces a looping path; fades out smoothly when puzzle is ready
- **New Game confirmation dialog** — inline modal (not browser `confirm()`), shown when New Game is pressed mid-game: "Start a new game? Your current progress will be lost."
- Number pad shows remaining count per digit (greys out at 9)
- Auto-highlights all peers of selected cell
- Auto-highlights all cells with same digit as selected
- Cell pop animation on correct fill
- Shake animation on wrong entry
- Pause overlay (hides grid contents)
- Toast notifications for events (e.g. "Hint used")
- No timer — not shown anywhere in the UI

### Statistics (localStorage)
- Puzzles completed per difficulty
- Best completions per difficulty (no timer — just count of clean wins)
- Total mistakes made lifetime

---

## File Structure

```
index.html           ← HTML structure only
style.css            ← all CSS, variables, animations
app.js               ← all game logic + UI
worker.js            ← puzzle generation Web Worker
project-overview.md
project-status.md
project-log.md
```

Open `index.html` by double-clicking — no server, no build step required.

---

## Resolved Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Timer | Removed entirely — not shown anywhere |
| 2 | Hint behavior | Auto-reveal a random unsolved cell's correct value |
| 3 | Expert loading state | Animated SVG pencil-writing overlay, Blob URL Web Worker |
| 4 | New Game mid-game | Inline confirmation dialog required |
| 5 | Daily puzzle | Out of scope (easy to add later via seeded RNG) |
| 6 | Single HTML file | Rejected — 4-file split: `index.html`, `style.css`, `app.js`, `worker.js`. Opens via `file://`, no server needed. |
