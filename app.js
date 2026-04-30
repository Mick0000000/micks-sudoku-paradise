// ─── Constants ────────────────────────────────────────────────────
const CLUE_COUNTS = { medium: 36, hard: 28, expert: 22, evil: 17 };
const HINTS_PER_GAME = 3;

const DEFAULT_SETTINGS = {
  maxMistakes: 3,
  highlightRelated: true,
  highlightSame: true,
  showMistakes: true,
  autoClearNotes: true,
};

// ─── State ────────────────────────────────────────────────────────
let puzzle     = null;   // int[81], 0 = empty
let solution   = null;   // int[81], complete answer
let given      = null;   // bool[81], true = original clue
let userGrid   = null;   // int[81], user placements (0 = empty)
let notes      = null;   // Set[81], pencil marks per cell
let selected   = null;   // int | null
let difficulty = 'medium';
let mistakes   = 0;
let hintsUsed  = 0;
let hintsLeft  = HINTS_PER_GAME;
let gameActive = false;
let paused     = false;
let notesMode  = false;
let undoStack  = [];
let redoStack  = [];
let worker     = null;
let pendingDiff = null;  // difficulty requested while game in progress

let settings = { ...DEFAULT_SETTINGS };
let stats    = { medium: 0, hard: 0, expert: 0, evil: 0, totalMistakes: 0 };

// ─── DOM helpers ─────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const gridEl         = $('sudoku-grid');
const hintCountEl    = $('hint-count');
const mistakesDotsEl = $('mistakes-dots');
const numberPadEl    = $('number-pad');
const loadingOverlay = $('loading-overlay');
const pauseOverlay   = $('pause-overlay');
const toastContainer = $('toast-container');

// ─── localStorage ─────────────────────────────────────────────────
function loadStorage() {
  try {
    const s = localStorage.getItem('sudoku-settings');
    if (s) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(s) };
  } catch (_) {}
  try {
    const s = localStorage.getItem('sudoku-stats');
    if (s) stats = { medium: 0, hard: 0, expert: 0, evil: 0, totalMistakes: 0, ...JSON.parse(s) };
  } catch (_) {}
}

function saveSettings() { localStorage.setItem('sudoku-settings', JSON.stringify(settings)); }
function saveStats()    { localStorage.setItem('sudoku-stats',    JSON.stringify(stats));    }

// ─── Theme ────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('sudoku-theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sudoku-theme', theme);
  $('theme-moon').classList.toggle('hidden', theme === 'dark');
  $('theme-sun').classList.toggle('hidden',  theme === 'light');
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

// ─── Grid initialisation ──────────────────────────────────────────
function initGrid() {
  gridEl.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;

    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.idx = i;
    cell.dataset.row = row;
    cell.dataset.col = col;

    // value span
    const valEl = document.createElement('span');
    valEl.className = 'cell-value hidden';
    cell.appendChild(valEl);

    // notes 3×3
    const notesEl = document.createElement('div');
    notesEl.className = 'cell-notes hidden';
    for (let n = 1; n <= 9; n++) {
      const span = document.createElement('span');
      span.dataset.n = n;
      notesEl.appendChild(span);
    }
    cell.appendChild(notesEl);

    cell.addEventListener('click', () => onCellClick(i));
    gridEl.appendChild(cell);
  }
}

// ─── Peer computation ─────────────────────────────────────────────
function getPeers(idx) {
  const row    = Math.floor(idx / 9);
  const col    = idx % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  const peers  = new Set();
  for (let i = 0; i < 9; i++) {
    peers.add(row * 9 + i);                                        // row
    peers.add(i * 9 + col);                                        // col
    peers.add((boxRow + Math.floor(i / 3)) * 9 + boxCol + i % 3); // box
  }
  peers.delete(idx);
  return peers;
}

// ─── Rendering ────────────────────────────────────────────────────
function renderAll() {
  for (let i = 0; i < 81; i++) renderCell(i);
  renderHighlights();
  renderNumberPad();
  renderMistakes();
  updateActionButtons();
}

function renderCell(idx) {
  const cell   = gridEl.children[idx];
  const val    = userGrid ? userGrid[idx] : 0;
  const isGiven = given && given[idx];
  const noteSet = notes  ? notes[idx]    : null;
  const valEl   = cell.querySelector('.cell-value');
  const notesEl = cell.querySelector('.cell-notes');

  // reset classes, preserving data-* and base class
  cell.className = 'cell';
  if (isGiven) cell.classList.add('given');

  if (val !== 0) {
    valEl.textContent = val;
    valEl.classList.remove('hidden');
    notesEl.classList.add('hidden');

    if (!isGiven) {
      const wrong = solution && val !== solution[idx];
      if (wrong && settings.showMistakes) cell.classList.add('wrong');
      else cell.classList.add('user-val');
    }
  } else if (noteSet && noteSet.size > 0) {
    valEl.classList.add('hidden');
    notesEl.classList.remove('hidden');
    notesEl.querySelectorAll('span').forEach(span => {
      const n = parseInt(span.dataset.n);
      span.textContent = noteSet.has(n) ? n : '';
    });
  } else {
    valEl.textContent = '';
    valEl.classList.add('hidden');
    notesEl.classList.add('hidden');
  }
}

function renderHighlights() {
  const peers      = (selected !== null && settings.highlightRelated && gameActive)
                       ? getPeers(selected) : new Set();
  const selVal     = (selected !== null && userGrid) ? userGrid[selected] : 0;
  const showSame   = settings.highlightSame && gameActive && selected !== null && selVal !== 0;

  for (let i = 0; i < 81; i++) {
    const cell = gridEl.children[i];
    // strip highlight classes without touching others
    cell.classList.remove('selected', 'peer', 'same-num');
    if (i === selected && gameActive)      cell.classList.add('selected');
    else if (peers.has(i))                 cell.classList.add('peer');
    if (showSame && userGrid[i] === selVal && i !== selected) cell.classList.add('same-num');
  }
}

function renderNumberPad() {
  if (!numberPadEl.children.length) return;
  const counts = new Array(10).fill(0);
  if (userGrid) for (const v of userGrid) if (v > 0) counts[v]++;

  for (let n = 1; n <= 9; n++) {
    const btn       = numberPadEl.children[n - 1];
    const remaining = 9 - counts[n];
    btn.querySelector('.pad-count').textContent = remaining > 0 ? remaining : '';
    btn.disabled = !gameActive || paused;
    btn.classList.toggle('exhausted', remaining === 0);
  }
}

function initNumberPad() {
  numberPadEl.innerHTML = '';
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'pad-btn';
    btn.innerHTML = `<span class="pad-num">${n}</span><span class="pad-count"></span>`;
    btn.addEventListener('click', () => placeDigit(n));
    numberPadEl.appendChild(btn);
  }
}

function renderMistakes() {
  mistakesDotsEl.innerHTML = '';
  if (settings.maxMistakes === 0) {
    const span = document.createElement('span');
    span.className = 'mistakes-unlimited';
    span.textContent = '∞';
    mistakesDotsEl.appendChild(span);
    return;
  }
  for (let i = 0; i < settings.maxMistakes; i++) {
    const dot = document.createElement('span');
    dot.className = 'mistake-dot' + (i < mistakes ? ' filled' : '');
    mistakesDotsEl.appendChild(dot);
  }
}

function updateActionButtons() {
  const on = gameActive && !paused;
  $('undo-btn').disabled  = !on || undoStack.length === 0;
  $('redo-btn').disabled  = !on || redoStack.length === 0;
  $('erase-btn').disabled = !on || selected === null;
  $('notes-btn').disabled = !on;
  $('hint-btn').disabled  = !on || hintsLeft <= 0;
  hintCountEl.textContent = hintsLeft;
}

// ─── Cell selection ───────────────────────────────────────────────
function onCellClick(idx) {
  if (!gameActive || paused) return;
  selectCell(idx);
}

function selectCell(idx) {
  selected = idx;
  renderHighlights();
  updateActionButtons();
}

// ─── Undo / redo ──────────────────────────────────────────────────
function snapshot() {
  return {
    userGrid: [...userGrid],
    notes:    notes.map(s => new Set(s)),
    hintsLeft,
    hintsUsed,
  };
}

function restore(snap) {
  userGrid  = [...snap.userGrid];
  notes     = snap.notes.map(s => new Set(s));
  hintsLeft = snap.hintsLeft;
  hintsUsed = snap.hintsUsed;
}

function undo() {
  if (!gameActive || undoStack.length === 0) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  renderAll();
}

function redo() {
  if (!gameActive || redoStack.length === 0) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  renderAll();
}

// ─── Place digit ──────────────────────────────────────────────────
function placeDigit(digit) {
  if (!gameActive || paused || selected === null) return;
  if (given[selected]) return;

  if (notesMode) {
    if (userGrid[selected] !== 0) return; // can't note a filled cell
    const snap = snapshot();
    const ns   = notes[selected];
    if (ns.has(digit)) ns.delete(digit);
    else               ns.add(digit);
    undoStack.push(snap);
    redoStack = [];
    renderCell(selected);
    updateActionButtons();
    return;
  }

  if (userGrid[selected] === digit) return; // no-op

  const snap      = snapshot();
  const isCorrect = digit === solution[selected];

  if (!isCorrect) {
    mistakes++;
    stats.totalMistakes++;
    saveStats();
    userGrid[selected] = digit;
    renderMistakes();
    renderCell(selected);
    animateShake(selected);

    if (settings.maxMistakes > 0 && mistakes >= settings.maxMistakes) {
      undoStack.push(snap);
      redoStack = [];
      gameActive = false;
      updateActionButtons();
      setTimeout(() => showModal('modal-gameover'), 500);
    } else {
      undoStack.push(snap);
      redoStack = [];
    }
    return;
  }

  // correct placement
  userGrid[selected] = digit;
  notes[selected].clear();

  if (settings.autoClearNotes) {
    getPeers(selected).forEach(p => {
      if (notes[p].has(digit)) {
        notes[p].delete(digit);
        renderCell(p);
      }
    });
  }

  undoStack.push(snap);
  redoStack = [];

  renderCell(selected);
  renderHighlights();
  renderNumberPad();
  updateActionButtons();
  animatePop(selected);
  animateCorrectGlow(selected);

  // Burst the pad button when all 9 of this digit are placed
  if (userGrid.filter(v => v === digit).length === 9) {
    const btn = numberPadEl.children[digit - 1];
    btn.classList.add('just-completed');
    btn.addEventListener('animationend', () => btn.classList.remove('just-completed'), { once: true });
  }

  checkWin();
}

// ─── Erase ────────────────────────────────────────────────────────
function eraseCell() {
  if (!gameActive || paused || selected === null) return;
  if (given[selected]) return;
  if (userGrid[selected] === 0 && notes[selected].size === 0) return;

  const snap = snapshot();
  userGrid[selected] = 0;
  notes[selected]    = new Set();
  undoStack.push(snap);
  redoStack = [];

  renderCell(selected);
  renderHighlights();
  renderNumberPad();
  updateActionButtons();
}

// ─── Evil mode ───────────────────────────────────────────────────
function applyEvilMode(on) {
  document.documentElement.dataset.evil = on ? 'true' : '';
}

// ─── Difficulty pill ─────────────────────────────────────────────
function updateDiffPill() {
  const pill   = $('diff-pill');
  const active = document.querySelector('.diff-btn.active');
  if (!pill || !active) return;
  const selector = active.closest('.difficulty-selector');
  const sr = selector.getBoundingClientRect();
  const ar = active.getBoundingClientRect();
  pill.style.width     = ar.width  + 'px';
  pill.style.height    = ar.height + 'px';
  pill.style.transform = `translateX(${ar.left - sr.left}px)`;
  // enable transitions after the first paint (prevents slide-in on load)
  requestAnimationFrame(() => { pill.dataset.ready = 'true'; });
}

// ─── Grid entrance ────────────────────────────────────────────────
function animateGridEntrance() {
  for (let i = 0; i < 81; i++) {
    const row  = Math.floor(i / 9);
    const cell = gridEl.children[i];
    cell.style.setProperty('--enter-delay', (row * 28) + 'ms');
    cell.classList.remove('cell-enter');
    void cell.offsetWidth;
    cell.classList.add('cell-enter');
    cell.addEventListener('animationend', () => {
      cell.classList.remove('cell-enter');
      cell.style.removeProperty('--enter-delay');
    }, { once: true });
  }
}

// ─── Correct glow ────────────────────────────────────────────────
function animateCorrectGlow(idx) {
  const cell = gridEl.children[idx];
  cell.classList.remove('correct-glow');
  void cell.offsetWidth;
  cell.classList.add('correct-glow');
  cell.addEventListener('animationend', () => cell.classList.remove('correct-glow'), { once: true });
}

// ─── Win wave ────────────────────────────────────────────────────
function celebrateWin() {
  for (let i = 0; i < 81; i++) {
    const row  = Math.floor(i / 9);
    const col  = i % 9;
    const dist = Math.abs(row - 4) + Math.abs(col - 4); // Manhattan from center
    const cell = gridEl.children[i];
    setTimeout(() => {
      cell.classList.add('win-wave');
      cell.addEventListener('animationend', () => cell.classList.remove('win-wave'), { once: true });
    }, dist * 38);
  }
}

// ─── Hint analysis helpers ────────────────────────────────────────
function getPossibleValues(idx, grid) {
  const used = new Set();
  for (const p of getPeers(idx)) {
    if (grid[p] !== 0) used.add(grid[p]);
  }
  const possible = new Set();
  for (let n = 1; n <= 9; n++) {
    if (!used.has(n)) possible.add(n);
  }
  return possible;
}

function findBestHintCell() {
  const unsolved = [];
  for (let i = 0; i < 81; i++) {
    if (!given[i] && userGrid[i] !== solution[i]) unsolved.push(i);
  }
  if (unsolved.length === 0) return null;

  // 1. Naked singles (empty cell with exactly 1 candidate)
  for (const idx of unsolved) {
    if (userGrid[idx] !== 0) continue;
    if (getPossibleValues(idx, userGrid).size === 1) return idx;
  }

  // 2. Hidden singles in rows
  for (const idx of unsolved) {
    if (userGrid[idx] !== 0) continue;
    const row = Math.floor(idx / 9), col = idx % 9, ans = solution[idx];
    let only = true;
    for (let c = 0; c < 9 && only; c++) {
      if (c === col) continue;
      const i = row * 9 + c;
      if (userGrid[i] !== 0) continue;
      if (getPossibleValues(i, userGrid).has(ans)) only = false;
    }
    if (only) return idx;
  }

  // 3. Hidden singles in columns
  for (const idx of unsolved) {
    if (userGrid[idx] !== 0) continue;
    const row = Math.floor(idx / 9), col = idx % 9, ans = solution[idx];
    let only = true;
    for (let r = 0; r < 9 && only; r++) {
      if (r === row) continue;
      const i = r * 9 + col;
      if (userGrid[i] !== 0) continue;
      if (getPossibleValues(i, userGrid).has(ans)) only = false;
    }
    if (only) return idx;
  }

  // 4. Hidden singles in boxes
  for (const idx of unsolved) {
    if (userGrid[idx] !== 0) continue;
    const row = Math.floor(idx / 9), col = idx % 9, ans = solution[idx];
    const br0 = Math.floor(row / 3) * 3, bc0 = Math.floor(col / 3) * 3;
    let only = true;
    outer: for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const i = (br0 + dr) * 9 + (bc0 + dc);
        if (i === idx || userGrid[i] !== 0) continue;
        if (getPossibleValues(i, userGrid).has(ans)) { only = false; break outer; }
      }
    }
    if (only) return idx;
  }

  // Fall back to selected cell (if unsolved) or random
  if (selected !== null && unsolved.includes(selected)) return selected;
  return unsolved[Math.floor(Math.random() * unsolved.length)];
}

function analyzeHint(idx) {
  const row = Math.floor(idx / 9), col = idx % 9, ans = solution[idx];
  const br0 = Math.floor(row / 3) * 3, bc0 = Math.floor(col / 3) * 3;

  if (userGrid[idx] === 0) {
    // Naked single?
    const candidates = getPossibleValues(idx, userGrid);
    if (candidates.size === 1) {
      const blocked = [1,2,3,4,5,6,7,8,9].filter(n => n !== ans).join(', ');
      return {
        technique: 'Naked Single',
        contextCells: [...getPeers(idx)].filter(p => userGrid[p] !== 0),
        explanation: `R${row+1}C${col+1} has only one candidate: <b>${ans}</b>. The numbers ${blocked} are already placed in its row, column, or 3×3 box, making <b>${ans}</b> the only option. Scan the highlighted cells to see each number accounted for.`
      };
    }

    // Hidden single — row?
    let rowOnly = true;
    for (let c = 0; c < 9 && rowOnly; c++) {
      if (c === col) continue;
      const i = row * 9 + c;
      if (userGrid[i] !== 0) continue;
      if (getPossibleValues(i, userGrid).has(ans)) rowOnly = false;
    }
    if (rowOnly) {
      const ctx = [];
      for (let c = 0; c < 9; c++) ctx.push(row * 9 + c);
      return {
        technique: 'Hidden Single — Row',
        contextCells: ctx.filter(i => i !== idx),
        explanation: `In <b>row ${row+1}</b>, the digit <b>${ans}</b> can only go in <b>column ${col+1}</b>. Scan the highlighted row — every other empty cell is blocked by <b>${ans}</b> already present in that cell's column or 3×3 box.`
      };
    }

    // Hidden single — column?
    let colOnly = true;
    for (let r = 0; r < 9 && colOnly; r++) {
      if (r === row) continue;
      const i = r * 9 + col;
      if (userGrid[i] !== 0) continue;
      if (getPossibleValues(i, userGrid).has(ans)) colOnly = false;
    }
    if (colOnly) {
      const ctx = [];
      for (let r = 0; r < 9; r++) ctx.push(r * 9 + col);
      return {
        technique: 'Hidden Single — Column',
        contextCells: ctx.filter(i => i !== idx),
        explanation: `In <b>column ${col+1}</b>, the digit <b>${ans}</b> can only go in <b>row ${row+1}</b>. Scan the highlighted column — every other empty cell is blocked by <b>${ans}</b> already present in that cell's row or 3×3 box.`
      };
    }

    // Hidden single — box?
    let boxOnly = true;
    outer: for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const i = (br0 + dr) * 9 + (bc0 + dc);
        if (i === idx || userGrid[i] !== 0) continue;
        if (getPossibleValues(i, userGrid).has(ans)) { boxOnly = false; break outer; }
      }
    }
    if (boxOnly) {
      const ctx = [];
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          ctx.push((br0 + dr) * 9 + (bc0 + dc));
      return {
        technique: 'Hidden Single — Box',
        contextCells: ctx.filter(i => i !== idx),
        explanation: `In the <b>3×3 box</b> containing this cell, <b>${ans}</b> can only fit at row ${row+1}, column ${col+1}. Scan the highlighted box — every other empty cell is blocked by <b>${ans}</b> already in its row or column.`
      };
    }
  }

  // Fallback: advanced logic
  return {
    technique: 'Advanced Logic',
    contextCells: [...getPeers(idx)].filter(p => userGrid[p] !== 0),
    explanation: `This cell requires advanced techniques like naked pairs or X-wings — no single-step elimination was available. The answer is <b>${ans}</b>. Keep practicing and these multi-step patterns will start to jump out!`
  };
}

function clearHintHighlights() {
  document.querySelectorAll('.cell.hint-reveal, .cell.hint-context').forEach(cell => {
    cell.classList.remove('hint-reveal', 'hint-context');
  });
}

// ─── Hint ─────────────────────────────────────────────────────────
function useHint() {
  if (!gameActive || paused || hintsLeft <= 0) return;

  const idx = findBestHintCell();
  if (idx === null) return;

  // Analyze technique BEFORE placing the value
  const hint = analyzeHint(idx);
  const snap = snapshot();

  userGrid[idx] = solution[idx];
  notes[idx].clear();

  if (settings.autoClearNotes) {
    getPeers(idx).forEach(p => {
      if (notes[p].has(solution[idx])) {
        notes[p].delete(solution[idx]);
        renderCell(p);
      }
    });
  }

  hintsLeft--;
  hintsUsed++;
  undoStack.push(snap);
  redoStack = [];

  selectCell(idx);
  renderCell(idx);
  renderHighlights();
  renderNumberPad();
  updateActionButtons();
  animatePop(idx);

  // Highlight hint cell and context cells on the grid
  gridEl.children[idx].classList.add('hint-reveal');
  hint.contextCells.forEach(i => {
    if (i >= 0 && i < 81) gridEl.children[i].classList.add('hint-context');
  });

  // Show explanation modal
  $('hint-technique-badge').textContent = hint.technique;
  $('hint-explanation-text').innerHTML  = hint.explanation;
  showModal('modal-hint');

  checkWin();
}

// ─── Win detection ────────────────────────────────────────────────
function checkWin() {
  if (!userGrid || !solution) return;
  for (let i = 0; i < 81; i++) {
    if (userGrid[i] !== solution[i]) return;
  }
  gameActive = false;
  celebrateWin();
  stats[difficulty]++;
  saveStats();
  updateActionButtons();
  setTimeout(() => {
    $('win-difficulty').textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    $('win-mistakes').textContent   = mistakes;
    $('win-hints').textContent      = hintsUsed;
    showModal('modal-win');
  }, 500);
}

// ─── Animations ───────────────────────────────────────────────────
function animatePop(idx) {
  const cell = gridEl.children[idx];
  cell.classList.remove('pop');
  void cell.offsetWidth;
  cell.classList.add('pop');
  cell.addEventListener('animationend', () => cell.classList.remove('pop'), { once: true });
}

function animateShake(idx) {
  const cell = gridEl.children[idx];
  cell.classList.remove('shake');
  void cell.offsetWidth;
  cell.classList.add('shake');
  cell.addEventListener('animationend', () => cell.classList.remove('shake'), { once: true });
}

// ─── Keyboard ─────────────────────────────────────────────────────
document.addEventListener('keydown', function (e) {
  // Pause toggles on Escape regardless of game state
  if (e.key === 'Escape') {
    if (!$('modal-hint').classList.contains('hidden'))     { hideModal('modal-hint'); clearHintHighlights(); return; }
    if (!$('modal-newgame').classList.contains('hidden'))  { hideModal('modal-newgame'); return; }
    if (!$('modal-settings').classList.contains('hidden')) { hideModal('modal-settings'); return; }
    if (!$('modal-stats').classList.contains('hidden'))    { hideModal('modal-stats');    return; }
    if (gameActive) togglePause();
    return;
  }

  if (!gameActive || paused) return;

  // Arrow navigation
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    if (selected === null) { selectCell(0); return; }
    const row = Math.floor(selected / 9);
    const col = selected % 9;
    let r = row, c = col;
    if (e.key === 'ArrowUp')    r = Math.max(0, row - 1);
    if (e.key === 'ArrowDown')  r = Math.min(8, row + 1);
    if (e.key === 'ArrowLeft')  c = Math.max(0, col - 1);
    if (e.key === 'ArrowRight') c = Math.min(8, col + 1);
    selectCell(r * 9 + c);
    return;
  }

  // Digits 1-9
  if (e.key >= '1' && e.key <= '9') {
    placeDigit(parseInt(e.key));
    return;
  }

  // Erase
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    eraseCell();
    return;
  }

  // Notes toggle
  if (e.key.toLowerCase() === 'n') {
    toggleNotesMode();
    return;
  }

  // Undo: z or ctrl+z
  if (e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
    return;
  }

  // Redo: y or ctrl+y
  if (e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
    return;
  }
});

// ─── Notes mode ───────────────────────────────────────────────────
function toggleNotesMode() {
  notesMode = !notesMode;
  $('notes-btn').classList.toggle('active', notesMode);
  showToast(notesMode ? 'Notes ON' : 'Notes OFF');
}

// ─── Pause ────────────────────────────────────────────────────────
function togglePause() {
  if (!gameActive) return;
  paused = !paused;
  pauseOverlay.classList.toggle('hidden', !paused);
  renderNumberPad();
  updateActionButtons();
}

// ─── Reveal solution ──────────────────────────────────────────────
function revealSolution() {
  if (!solution) return;
  for (let i = 0; i < 81; i++) {
    userGrid[i] = solution[i];
    notes[i]    = new Set();
  }
  renderAll();
}

// ─── New game ─────────────────────────────────────────────────────
function requestNewGame(diff) {
  if (gameActive) {
    pendingDiff = diff;
    showModal('modal-newgame');
  } else {
    startNewGame(diff);
  }
}

function startNewGame(diff) {
  difficulty = diff;

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === diff);
  });
  applyEvilMode(diff === 'evil');
  updateDiffPill();

  // Reset state
  puzzle    = null;
  solution  = null;
  given     = new Array(81).fill(false);
  userGrid  = new Array(81).fill(0);
  notes     = Array.from({ length: 81 }, () => new Set());
  selected  = null;
  mistakes  = 0;
  hintsUsed = 0;
  hintsLeft = HINTS_PER_GAME;
  gameActive = false;
  paused     = false;
  notesMode  = false;
  undoStack  = [];
  redoStack  = [];

  $('notes-btn').classList.remove('active');
  pauseOverlay.classList.add('hidden');
  clearHintHighlights();

  // Show loading overlay for Expert / Evil (slow carving)
  if (diff === 'expert' || diff === 'evil') loadingOverlay.classList.remove('hidden');

  if (worker) { worker.terminate(); worker = null; }

  worker = new Worker('worker.js');

  worker.onmessage = function (e) {
    worker = null;
    loadingOverlay.classList.add('hidden');
    const { puzzle: puzz, solution: sol } = e.data;
    puzzle    = puzz;
    solution  = sol;
    given     = puzz.map(v => v !== 0);
    userGrid  = [...puzz];
    notes     = Array.from({ length: 81 }, () => new Set());
    gameActive = true;
    renderAll();
    animateGridEntrance();
  };

  worker.onerror = function (err) {
    console.error('Worker error:', err);
    worker = null;
    loadingOverlay.classList.add('hidden');
    showToast('Error generating puzzle — please try again.');
  };

  worker.postMessage({ difficulty: diff });
  renderAll(); // renders empty grid while worker runs
}

// ─── Modals ───────────────────────────────────────────────────────
function showModal(id) { $(id).classList.remove('hidden'); }
function hideModal(id) { $(id).classList.add('hidden');    }

// ─── Settings UI ──────────────────────────────────────────────────
function renderSettingsUI() {
  document.querySelectorAll('#max-mistakes-selector button').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.val) === settings.maxMistakes);
  });
  $('setting-highlight-related').checked = settings.highlightRelated;
  $('setting-highlight-same').checked    = settings.highlightSame;
  $('setting-show-mistakes').checked     = settings.showMistakes;
  $('setting-auto-clear-notes').checked  = settings.autoClearNotes;
}

function applyToggleChange() {
  settings.highlightRelated = $('setting-highlight-related').checked;
  settings.highlightSame    = $('setting-highlight-same').checked;
  settings.showMistakes     = $('setting-show-mistakes').checked;
  settings.autoClearNotes   = $('setting-auto-clear-notes').checked;
  saveSettings();
  renderAll();
}

// ─── Stats UI ────────────────────────────────────────────────────
function renderStatsUI() {
  $('stat-medium-completed').textContent = stats.medium;
  $('stat-hard-completed').textContent   = stats.hard;
  $('stat-expert-completed').textContent = stats.expert;
  $('stat-evil-completed').textContent   = stats.evil;
  $('stat-total-mistakes').textContent   = stats.totalMistakes;
}

// ─── Toast ───────────────────────────────────────────────────────
function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  toastContainer.appendChild(el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('show'));
  });
  setTimeout(() => {
    el.classList.remove('show');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }, 2000);
}

// ─── Event listeners ──────────────────────────────────────────────
function setupEvents() {
  // Header
  $('theme-btn').addEventListener('click', toggleTheme);
  $('pause-btn').addEventListener('click', togglePause);
  $('resume-btn').addEventListener('click', togglePause);

  $('stats-btn').addEventListener('click', () => {
    renderStatsUI();
    showModal('modal-stats');
  });
  $('settings-btn').addEventListener('click', () => {
    renderSettingsUI();
    showModal('modal-settings');
  });

  // Difficulty
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => requestNewGame(btn.dataset.diff));
  });

  $('new-game-btn').addEventListener('click', () => requestNewGame(difficulty));

  // Action buttons
  $('undo-btn').addEventListener('click', undo);
  $('redo-btn').addEventListener('click', redo);
  $('erase-btn').addEventListener('click', eraseCell);
  $('notes-btn').addEventListener('click', toggleNotesMode);
  $('hint-btn').addEventListener('click', useHint);

  // New game confirm modal
  $('newgame-cancel-btn').addEventListener('click', () => hideModal('modal-newgame'));
  $('newgame-confirm-btn').addEventListener('click', () => {
    hideModal('modal-newgame');
    startNewGame(pendingDiff || difficulty);
  });

  // Win modal
  $('win-newgame-btn').addEventListener('click', () => {
    hideModal('modal-win');
    startNewGame(difficulty);
  });

  // Game over modal
  $('gameover-reveal-btn').addEventListener('click', () => {
    hideModal('modal-gameover');
    revealSolution();
  });
  $('gameover-newgame-btn').addEventListener('click', () => {
    hideModal('modal-gameover');
    startNewGame(difficulty);
  });

  // Settings modal
  $('settings-close-btn').addEventListener('click', () => hideModal('modal-settings'));

  document.querySelectorAll('#max-mistakes-selector button').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.maxMistakes = parseInt(btn.dataset.val);
      saveSettings();
      renderSettingsUI();
      renderMistakes();
    });
  });

  $('setting-highlight-related').addEventListener('change', applyToggleChange);
  $('setting-highlight-same').addEventListener('change',    applyToggleChange);
  $('setting-show-mistakes').addEventListener('change',     applyToggleChange);
  $('setting-auto-clear-notes').addEventListener('change',  applyToggleChange);

  // Stats modal
  $('stats-close-btn').addEventListener('click', () => hideModal('modal-stats'));

  // Hint explanation modal
  $('hint-close-btn').addEventListener('click', () => {
    hideModal('modal-hint');
    clearHintHighlights();
  });

  // Close modals by clicking backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', e => {
      if (e.target !== backdrop) return;
      backdrop.classList.add('hidden');
      if (backdrop.id === 'modal-hint') clearHintHighlights();
    });
  });
}

// ─── Init ─────────────────────────────────────────────────────────
function init() {
  loadStorage();
  initTheme();
  initGrid();
  initNumberPad();
  setupEvents();
  startNewGame('medium');

  // Keep the pill aligned on resize
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(updateDiffPill);
    const sel = document.querySelector('.difficulty-selector');
    if (sel) ro.observe(sel);
  }
}

init();
