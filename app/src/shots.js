// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo
// loaded; ?shot=cover shows the exported cover alone, drawn by the app itself at
// the shot's size. Query knobs: size (square|portrait|wide), layout, grade,
// photo (boulevard|pier), caption, subtitle. window.__shotReady fires once painted.
export async function runShot(shot, query, ctx) {
  const { state, loadSamples, redraw, syncControls } = ctx;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  state.size = query.get('size') ?? 'square';
  state.layout = query.get('layout') ?? 'tilted';
  state.grade = query.get('grade') ?? 'sunset';
  state.title = query.get('caption') ?? 'NEON COAST';
  state.subtitle = query.get('subtitle') ?? 'Golden hour heist';
  state.heat = Number(query.get('heat') ?? 4);
  // A cover shot fills its panels with both samples, so every layout shows two photos.
  await loadSamples();
  // Both samples are now loaded; assign panels alternating between them.
  state.slots = state.slots.map((_, i) => (i % 2 === 0 ? 0 : 1));
  // Face-biased crops: both samples are portraits, so pan down to keep faces in frame.
  const wide = state.size === 'wide';
  state.crops = {};
  for (let i = 0; i < 9; i++) state.crops[i] = { zoom: wide && i === 0 ? 1.05 : 1.15, ox: 0, oy: i === 0 ? 0.8 : 0.85 };
  syncControls();
  if (shot === 'cover') {
    // Draw the cover at the window's own pixels so it fills the frame exactly.
    const canvas = document.getElementById('cover');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  try {
    await document.fonts.load('80px Anton');
    await document.fonts.load('40px Pacifico');
    await document.fonts.ready;
  } catch { /* fall back to system fonts */ }
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
