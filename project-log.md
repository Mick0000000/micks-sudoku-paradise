# Project Log

Chronological record of decisions, research, and implementation notes.

---

## 2026-04-02 — Project Kickoff

### Research Summary

**Puzzle Generation**
Researched JS sudoku generation approaches. The universal standard is a two-phase backtracking algorithm:

1. Fill a complete valid grid using recursive backtracking with shuffled candidates (so output is random each run)
2. Carve cells out one by one, checking after each removal that the puzzle still has a unique solution (solution count = 1)

The uniqueness check uses the same backtracking solver with an early-exit at count=2 for performance.

Clue counts by difficulty (based on multiple sources including sudoku.js and sudoku247online):
- Medium: ~36 clues (easy to generate, <100ms)
- Hard: ~28 clues (~100–300ms)
- Expert: ~22 clues (300–800ms, recommend Web Worker)

Note: 17 clues is the mathematical minimum for a uniquely-solvable Sudoku. Going below 22 for "expert" risks very long generation times and should be avoided.

**Alternative considered: Pre-built puzzle bank**
Some apps (sudokubum.com) pre-generate puzzles and cache them, then spawn Web Workers to build more in the background. This gives instant load. For this project, on-the-fly generation is fine — just use a Web Worker for Expert to prevent UI jank.

**Features researched from top apps (sudoku.coach, Brainium, Web Sudoku, Online Sudoku):**
- Notes/pencil marks: essential, toggle mode
- Auto-clear notes when number placed in peers: widely loved feature
- Mistake highlighting: standard
- Undo/redo: expected by users
- Hint with logic explanation: sudoku.coach does this well, but complex — we'll do simple "reveal a cell"
- Number remaining count on numpad: Brainium does this, very helpful
- Highlight same numbers: standard
- Pause/resume: standard
- Statistics: standard

**Timer removed from scope** per user request.

### Key Decisions Made

| Decision | Choice | Reason |
|---|---|---|
| Architecture | Single HTML file | No build tooling, easy to open and share |
| Puzzle source | Client-side generated | No API dependency, works offline |
| Generation method | Backtracking + uniqueness check | Industry standard, well-documented |
| Expert generation | Web Worker | Prevents UI freeze on 300-800ms generation |
| Timer | ❌ Removed | User preference |
| Hint type | Reveal cell value | Simplest, most common UX |
| Persistence | localStorage | No backend needed |

### Open Questions — RESOLVED

| # | Question | Decision |
|---|---|---|
| 1 | Hint behavior | Auto-reveal a random unsolved cell's correct value |
| 2 | Expert generation loading state | Animated SVG pencil writing (not a generic spinner) |
| 3 | New Game confirmation | Yes — confirm dialog if game is in progress |

---

## 2026-04-02 — Decisions Finalized

All open questions resolved. Project is fully spec'd and ready for Claude Code to implement.

**Pencil animation spec:**
- SVG animation of a pencil drawing/writing, shown as a centered overlay during puzzle generation
- Should feel polished and on-brand — not a generic spinner
- Loops until the Web Worker returns the generated puzzle
- Fades out smoothly when puzzle is ready

_Future entries will be added as development progresses._
