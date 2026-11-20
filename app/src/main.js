// Neon Coast Cover Studio — the editor.
// Owns the cover state, the undo history, the panel interactions (click to
// place a photo, drag to pan, scroll to zoom) and the PNG export. The drawing
// itself lives in ./cover.js; the fixed screenshot scenes in ./shots.js.
import { LAYOUTS, GRADES, drawCoverArt, panelHit } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const trayEl = document.getElementById('tray');
const zoomSlider = document.getElementById('zoomSlider');
const panelHint = document.getElementById('panelHint');

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

// ---------------------------------------------------------------- state
const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'NEON COAST',
  subtitle: 'chasing the sunset',
  ribbon: 'EST. 2026',
  badge: true,
  ribbonOn: true,
  textureOn: true,
  size: '1080x1080',
  photos: [], // { img, name }
  places: [], // one per layout panel: { photo, zoom, ox, oy }
  selected: 0,
  pickedPhoto: -1,
};

function freshPlaces() {
  const count = LAYOUTS[state.layout].panels.length;
  const places = [];
  for (let i = 0; i < count; i++) {
    const old = state.places[i];
    places.push(old || { photo: state.photos.length ? i % state.photos.length : -1, zoom: 1, ox: 0, oy: 0 });
  }
  return places;
}

function renderState() {
  return {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    ribbon: state.ribbon,
    badge: state.badge,
    ribbonOn: state.ribbonOn,
    textureOn: state.textureOn,
    photos: state.photos.map((p) => p.img),
    places: state.places,
  };
}

// ---------------------------------------------------------------- history
let past = [];
let future = [];

function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, title: state.title,
    subtitle: state.subtitle, ribbon: state.ribbon, badge: state.badge,
    ribbonOn: state.ribbonOn, textureOn: state.textureOn, size: state.size,
    places: state.places, selected: state.selected,
  });
}

function pushHistory() {
  past.push(snapshot());
  if (past.length > 60) past.shift();
  future = [];
  syncUndoButtons();
}

function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  state.places = s.places;
  applySize();
  syncControls();
  redraw();
}

function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  syncUndoButtons();
}

function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  syncUndoButtons();
}

function syncUndoButtons() {
  document.getElementById('undoBtn').disabled = past.length === 0;
  document.getElementById('redoBtn').disabled = future.length === 0;
}

// ---------------------------------------------------------------- drawing
let fontsReady = false;

async function ensureFonts() {
  if (fontsReady) return;
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // Fall back to system fonts; the cover still draws.
  }
  fontsReady = true;
}

async function redraw() {
  await ensureFonts();
  drawCoverArt(canvas, renderState());
  syncPanelHint();
}

function applySize() {
  const [w, h] = SIZES[state.size];
  canvas.width = w;
  canvas.height = h;
  document.getElementById('sizeLabel').textContent = `${w} \u00d7 ${h}`;
}

function syncPanelHint() {
  const place = state.places[state.selected];
  const name = place && place.photo >= 0 ? state.photos[place.photo].name : 'empty';
  panelHint.textContent = `Panel ${state.selected + 1} of ${state.places.length} — photo: ${name}. Drag to pan, scroll to zoom.`;
  if (place) zoomSlider.value = String(place.zoom);
}

// ---------------------------------------------------------------- photos
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function addPhoto(img, name) {
  if (state.photos.length >= 6) {
    statusEl.textContent = 'Six photos is the most a cover holds.';
    return false;
  }
  state.photos.push({ img, name });
  const idx = state.photos.length - 1;
  // Empty panels take the new photo first.
  state.places.forEach((place) => {
    if (place.photo === -1) place.photo = idx;
  });
  state.pickedPhoto = idx;
  return true;
}

function renderTray() {
  trayEl.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    if (i === state.pickedPhoto) thumb.classList.add('picked');
    thumb.addEventListener('click', () => {
      state.pickedPhoto = i;
      renderTray();
      statusEl.textContent = `${photo.name} picked — click a panel to place it.`;
    });
    trayEl.appendChild(thumb);
  });
}

async function loadSamples() {
  for (const name of ['pier', 'boulevard']) {
    if (state.photos.some((p) => p.name === `${name}.jpg`)) continue;
    try {
      const img = await loadImage(`./samples/${name}.jpg`);
      addPhoto(img, `${name}.jpg`);
    } catch {
      statusEl.textContent = `Could not load the sample ${name}.jpg.`;
    }
  }
  state.places = freshPlaces();
  renderTray();
  redraw();
}

// ---------------------------------------------------------------- pickers
function buildPickers() {
  const layoutPicker = document.getElementById('layoutPicker');
  Object.entries(LAYOUTS).forEach(([key, layout]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = layout.label;
    btn.dataset.layout = key;
    if (key === state.layout) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (state.layout === key) return;
      pushHistory();
      state.layout = key;
      state.places = freshPlaces();
      state.selected = 0;
      layoutPicker.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
      redraw();
    });
    layoutPicker.appendChild(btn);
  });

  const gradePicker = document.getElementById('gradePicker');
  Object.entries(GRADES).forEach(([key, grade]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.grade = key;
    const dot = document.createElement('span');
    dot.className = 'swatch';
    dot.style.background = grade.swatch;
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(grade.label));
    if (key === state.grade) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (state.grade === key) return;
      pushHistory();
      state.grade = key;
      gradePicker.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
      redraw();
    });
    gradePicker.appendChild(btn);
  });
}

function syncControls() {
  document.getElementById('titleInput').value = state.title;
  document.getElementById('subtitleInput').value = state.subtitle;
  document.getElementById('ribbonInput').value = state.ribbon;
  document.getElementById('badgeToggle').checked = state.badge;
  document.getElementById('ribbonToggle').checked = state.ribbonOn;
  document.getElementById('grainToggle').checked = state.textureOn;
  document.getElementById('sizeSelect').value = state.size;
  document.querySelectorAll('#layoutPicker button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradePicker button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
}

// ---------------------------------------------------------------- panel input
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

function panelAt(point) {
  const panels = LAYOUTS[state.layout].panels;
  for (let i = panels.length - 1; i >= 0; i--) {
    if (panelHit(panels[i], canvas.width, canvas.height, point.x, point.y)) return i;
  }
  return -1;
}

let drag = null;

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const i = panelAt(point);
  if (i === -1) return;
  state.selected = i;
  const place = state.places[i];
  if (state.pickedPhoto >= 0 && place.photo !== state.pickedPhoto) {
    pushHistory();
    place.photo = state.pickedPhoto;
  }
  drag = { panel: i, x: point.x, y: point.y, moved: false, ox: place.ox, oy: place.oy };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('dragging');
  redraw();
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const panel = LAYOUTS[state.layout].panels[drag.panel];
  const place = state.places[drag.panel];
  const dx = point.x - drag.x;
  const dy = point.y - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) {
    if (!drag.moved) { pushHistory(); drag.moved = true; }
    place.ox = drag.ox + dx / (panel.w * canvas.width);
    place.oy = drag.oy + dy / (panel.h * canvas.height);
    redraw();
  }
});

canvas.addEventListener('pointerup', () => {
  drag = null;
  canvas.classList.remove('dragging');
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const point = canvasPoint(event);
  const i = panelAt(point);
  if (i === -1) return;
  const place = state.places[i];
  pushHistory();
  place.zoom = Math.min(3, Math.max(1, place.zoom * Math.exp(-event.deltaY * 0.0012)));
  state.selected = i;
  redraw();
}, { passive: false });

function setZoom(zoom) {
  const place = state.places[state.selected];
  if (!place) return;
  pushHistory();
  place.zoom = Math.min(3, Math.max(1, zoom));
  redraw();
}

zoomSlider.addEventListener('input', () => setZoom(Number(zoomSlider.value)));
document.getElementById('zoomInBtn').addEventListener('click', () => setZoom((state.places[state.selected]?.zoom || 1) + 0.25));
document.getElementById('zoomOutBtn').addEventListener('click', () => setZoom((state.places[state.selected]?.zoom || 1) - 0.25));
document.getElementById('resetPanelBtn').addEventListener('click', () => {
  const place = state.places[state.selected];
  if (!place) return;
  pushHistory();
  place.zoom = 1; place.ox = 0; place.oy = 0;
  redraw();
});

// ---------------------------------------------------------------- controls
function bindText(id, key) {
  const input = document.getElementById(id);
  // Snapshot once when editing starts, so one undo step covers the whole edit.
  input.addEventListener('focus', () => pushHistory());
  input.addEventListener('input', () => {
    state[key] = input.value;
    redraw();
  });
}
bindText('titleInput', 'title');
bindText('subtitleInput', 'subtitle');
bindText('ribbonInput', 'ribbon');

function bindToggle(id, key) {
  document.getElementById(id).addEventListener('change', (e) => {
    pushHistory();
    state[key] = e.target.checked;
    redraw();
  });
}
bindToggle('badgeToggle', 'badge');
bindToggle('ribbonToggle', 'ribbonOn');
bindToggle('grainToggle', 'textureOn');

document.getElementById('sizeSelect').addEventListener('change', (e) => {
  pushHistory();
  state.size = e.target.value;
  applySize();
  redraw();
});

document.getElementById('photoInput').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  pushHistory();
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      addPhoto(img, file.name);
    } catch {
      statusEl.textContent = `Could not read ${file.name}.`;
    }
  }
  state.places = freshPlaces();
  renderTray();
  redraw();
  e.target.value = '';
});

document.getElementById('sampleBtn').addEventListener('click', () => {
  pushHistory();
  loadSamples();
});

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

document.getElementById('exportBtn').addEventListener('click', async () => {
  await ensureFonts();
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCoverArt(off, renderState());
  off.toBlob((blob) => {
    if (!blob) { statusEl.textContent = 'Export failed.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${w}x${h}.png`;
    a.click();
    statusEl.textContent = `Saved neon-coast-cover-${w}x${h}.png`;
  }, 'image/png');
});

// ---------------------------------------------------------------- boot
buildPickers();
syncControls();
applySize();
state.places = freshPlaces();
syncUndoButtons();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state, loadImage, loadSamples, redraw, applySize, syncControls, renderTray,
    setLayout(layout) { state.layout = layout; state.places = freshPlaces(); state.selected = 0; },
    setGrade(grade) { state.grade = grade; },
    setSize(size) { state.size = size; applySize(); },
    setTitle(title) { state.title = title; },
    setSubtitle(subtitle) { state.subtitle = subtitle; },
  });
} else {
  redraw();
}
