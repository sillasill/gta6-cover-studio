// Neon Coast Cover Studio — wires the editor: photos, layouts, grades, lettering,
// per-panel crop (sliders, drag, wheel), undo/redo, and PNG export at the three
// post sizes. Photos are read on this machine only, never uploaded. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, GRADES, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');

// Two sample photos ship with the app (made with an image model, free to use),
// so the studio opens with covers already made — replace them with your own.
const SAMPLES = [
  { label: 'Boulevard', src: 'samples/boulevard.jpg' },
  { label: 'Pier', src: 'samples/pier.jpg' },
];

const state = {
  layout: 'tilted',
  grade: 'sunset',
  title: 'NEON COAST',
  subtitle: 'Golden hour heist',
  badge: 'EST. 2026',
  heat: 4,
  size: 'square',
  slots: [0, 1, 0, 1, 0, 1, 0, 1, 0],
  crops: {},
  selected: 0,
};

let photos = [];          // [{label, img}] — images, never uploaded anywhere
let pickedPhoto = 0;      // tray selection: the photo a clicked panel receives
let panels = [];          // last rendered panel rects, for hit-testing
const undoStack = [];
const redoStack = [];

function defaultCrop() { return { zoom: 1.15, ox: 0, oy: 0.3 }; } // faces sit high in most photos
function cropOf(i) { return (state.crops[i] ??= defaultCrop()); }
function snapshot() { return JSON.stringify(state); }
function restore(json) { Object.assign(state, JSON.parse(json)); syncControls(); redraw(); }

/** Records the state before a change, so Undo can bring it back. */
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncUndoButtons();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncUndoButtons();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncUndoButtons();
}
function syncUndoButtons() {
  $('undo').disabled = !undoStack.length;
  $('redo').disabled = !redoStack.length;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamples() {
  photos = [];
  for (const s of SAMPLES) {
    try { photos.push({ label: s.label, img: await loadImage(s.src) }); } catch { /* keep going */ }
  }
  renderTray();
}

/** The photo tray: thumbnails of every loaded photo, click to pick one. */
function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  photos.forEach((p, i) => {
    const img = document.createElement('img');
    img.src = p.img.src;
    img.alt = p.label;
    img.title = p.label;
    if (i === pickedPhoto) img.classList.add('picked');
    img.addEventListener('click', () => { pickedPhoto = i; renderTray(); });
    tray.appendChild(img);
  });
}

function buildSwatches() {
  const layoutsEl = $('layouts');
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.name;
    b.dataset.layout = key;
    b.addEventListener('click', () => { pushHistory(); state.layout = key; state.selected = 0; syncControls(); redraw(); });
    layoutsEl.appendChild(b);
  });
  const gradesEl = $('grades');
  Object.entries(GRADES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'grade';
    b.dataset.grade = key;
    b.title = def.name;
    b.style.background = `linear-gradient(135deg, ${def.top}, ${def.mid} 55%, ${def.bottom})`;
    b.addEventListener('click', () => { pushHistory(); state.grade = key; syncControls(); redraw(); });
    gradesEl.appendChild(b);
  });
  const sizesEl = $('sizes');
  Object.entries(SIZES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.name.split(' ')[0];
    b.title = def.name;
    b.dataset.size = key;
    b.addEventListener('click', () => { state.size = key; syncControls(); redraw(); });
    sizesEl.appendChild(b);
  });
  const heatEl = $('heat');
  for (let n = 1; n <= 5; n++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = '★';
    b.dataset.heat = n;
    b.addEventListener('click', () => { pushHistory(); state.heat = n; syncControls(); redraw(); });
    heatEl.appendChild(b);
  }
}

function syncControls() {
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizes button').forEach((b) => b.classList.toggle('on', b.dataset.size === state.size));
  document.querySelectorAll('#heat button').forEach((b) => b.classList.toggle('lit', Number(b.dataset.heat) <= state.heat));
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('badge').value = state.badge;
  const crop = cropOf(state.selected);
  $('zoom').value = crop.zoom;
  $('panx').value = crop.ox;
  $('pany').value = crop.oy;
  const count = LAYOUTS[state.layout].panels;
  $('panelLabel').textContent = `Panel ${state.selected + 1} of ${count} — photo “${photos[state.slots[state.selected]]?.label ?? '—'}”`;
  // Keep the preview canvas at the chosen post-size aspect.
  const size = SIZES[state.size];
  const scale = Math.min(720 / size.w, 720 / size.h);
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
}

/** Renders the live preview from the current state. */
function redraw() {
  panels = drawCover(canvas, state, photos.map((p) => p.img));
}

function bindControls() {
  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('title').addEventListener('change', pushHistory);
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('subtitle').addEventListener('change', pushHistory);
  $('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
  $('badge').addEventListener('change', pushHistory);
  $('zoom').addEventListener('input', (e) => { cropOf(state.selected).zoom = Number(e.target.value); redraw(); });
  $('zoom').addEventListener('change', pushHistory);
  $('panx').addEventListener('input', (e) => { cropOf(state.selected).ox = Number(e.target.value); redraw(); });
  $('panx').addEventListener('change', pushHistory);
  $('pany').addEventListener('input', (e) => { cropOf(state.selected).oy = Number(e.target.value); redraw(); });
  $('pany').addEventListener('change', pushHistory);
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });

  $('photo').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      if (photos.length >= 6) break;
      try {
        const img = await loadImage(URL.createObjectURL(file));
        photos.push({ label: file.name.replace(/\.[^.]+$/, ''), img });
      } catch { /* skip unreadable files */ }
    }
    pickedPhoto = photos.length - 1;
    renderTray();
    redraw();
    e.target.value = '';
  });

  // Click a panel to select it (and place the picked photo); drag to pan, wheel to zoom.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const i = panelAt(e);
    if (i == null) return;
    pushHistory();
    state.selected = i;
    state.slots[i] = pickedPhoto;
    syncControls();
    redraw();
    drag = { i, x: e.clientX, y: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const crop = cropOf(drag.i);
    crop.ox += ((e.clientX - drag.x) / rect.width) * 2;
    crop.oy += ((e.clientY - drag.y) / rect.height) * 2;
    crop.ox = Math.max(-1, Math.min(1, crop.ox));
    crop.oy = Math.max(-1, Math.min(1, crop.oy));
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved = true;
    syncControls();
    redraw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    const i = panelAt(e);
    if (i == null) return;
    e.preventDefault();
    const crop = cropOf(i);
    crop.zoom = Math.max(1, Math.min(3, crop.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    state.selected = i;
    syncControls();
    redraw();
  }, { passive: false });

  $('export').addEventListener('click', () => exportCover(state.size));
  $('exportAll').addEventListener('click', async () => {
    for (const key of Object.keys(SIZES)) await exportCover(key);
  });
}

function panelAt(e) {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return null;
}

/** Renders the cover at full post size and downloads it as a PNG. */
export function exportCover(sizeKey) {
  return new Promise((resolve) => {
    const size = SIZES[sizeKey];
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    const saved = state.size;
    state.size = sizeKey;
    drawCover(off, state, photos.map((p) => p.img));
    state.size = saved;
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-cover-${size.w}x${size.h}.png`;
      a.click();
      statusEl.textContent = `Saved neon-coast-cover-${size.w}x${size.h}.png`;
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

const shot = new URLSearchParams(location.search).get('shot');
buildSwatches();
bindControls();
syncControls();
syncUndoButtons();
if (shot) {
  runShot(shot, new URLSearchParams(location.search), { state, loadImage, loadSamples, redraw, syncControls });
} else {
  await loadSamples();
  // Wait for the bundled fonts so the first paint already uses Anton + Pacifico.
  try { await document.fonts.ready; } catch { /* system fonts still render */ }
  redraw();
}
