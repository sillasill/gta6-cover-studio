// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor shows the editor with a sample photo loaded. The query picks the
// sample photo, layout, grade, title, subtitle and post size. The scene sets
// window.__shotReady once the cover has painted, so a screenshot tool knows
// when to capture.

/**
 * Runs one shot scene. `api` is the editor's handle from main.js: it carries
 * the shared state plus the setters the scene needs.
 */
export async function runShot(shot, query, api) {
  const photo = query.get('photo') ?? 'pier';
  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const title = query.get('caption') ?? 'Neon Coast';
  const subtitle = query.get('subtitle') ?? 'chasing the sunset';
  const size = query.get('size') ?? '1080x1080';
  const ribbon = query.get('ribbon') ?? 'EST. 2026';

  if (shot === 'cover') document.body.classList.add('shot-cover');

  api.setLayout(layout);
  api.setGrade(grade);
  api.setSize(size);
  api.setTitle(title);
  api.setSubtitle(subtitle);
  api.state.ribbon = ribbon;

  const img = await api.loadImage(`./samples/${photo}.jpg`);
  api.state.photos = [{ img, name: `${photo}.jpg` }];
  api.state.pickedPhoto = 0;
  // Fill every panel with the photo (a second sample, if present, stays out).
  api.state.places.forEach((place) => { place.photo = 0; });
  api.renderTray();
  api.syncControls();

  await api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
