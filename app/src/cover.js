// Neon Coast Cover Studio — the cover renderer.
// Draws the multi-panel poster: photos in framed panels, a gradient-map colour
// grade, bold Anton lettering with a neon Pacifico subtitle, a star badge, a
// corner ribbon, halftone dots, grain and a vignette. Everything is drawn on a
// plain 2D canvas, so the same code renders the live preview and the export.

// ---------------------------------------------------------------- layouts
// Every panel is a fraction of the cover: x, y, w, h in 0..1, rot in degrees.
export const LAYOUTS = {
  tilted: {
    label: 'Tilted Snapshots',
    panels: [
      { x: 0.03, y: 0.02, w: 0.60, h: 0.55, rot: -3 },
      { x: 0.60, y: 0.09, w: 0.37, h: 0.42, rot: 4 },
      { x: 0.08, y: 0.62, w: 0.55, h: 0.33, rot: -2 },
    ],
  },
  hero: {
    label: 'Hero + Three',
    panels: [
      { x: 0.02, y: 0.02, w: 0.60, h: 0.96, rot: 0 },
      { x: 0.64, y: 0.02, w: 0.34, h: 0.307, rot: 0 },
      { x: 0.64, y: 0.347, w: 0.34, h: 0.307, rot: 0 },
      { x: 0.64, y: 0.673, w: 0.34, h: 0.307, rot: 0 },
    ],
  },
  four: {
    label: 'Four Grid',
    panels: [
      { x: 0.02, y: 0.02, w: 0.48, h: 0.48, rot: 0 },
      { x: 0.50, y: 0.02, w: 0.48, h: 0.48, rot: 0 },
      { x: 0.02, y: 0.50, w: 0.48, h: 0.48, rot: 0 },
      { x: 0.50, y: 0.50, w: 0.48, h: 0.48, rot: 0 },
    ],
  },
  nine: {
    label: 'Nine Grid',
    panels: [
      { x: 0.015, y: 0.015, w: 0.32, h: 0.32, rot: 0 },
      { x: 0.34, y: 0.015, w: 0.32, h: 0.32, rot: 0 },
      { x: 0.665, y: 0.015, w: 0.32, h: 0.32, rot: 0 },
      { x: 0.015, y: 0.34, w: 0.32, h: 0.32, rot: 0 },
      { x: 0.34, y: 0.34, w: 0.32, h: 0.32, rot: 0 },
      { x: 0.665, y: 0.34, w: 0.32, h: 0.32, rot: 0 },
      { x: 0.015, y: 0.665, w: 0.32, h: 0.32, rot: 0 },
      { x: 0.34, y: 0.665, w: 0.32, h: 0.32, rot: 0 },
      { x: 0.665, y: 0.665, w: 0.32, h: 0.32, rot: 0 },
    ],
  },
  triptych: {
    label: 'Triptych',
    panels: [
      { x: 0.02, y: 0.02, w: 0.313, h: 0.96, rot: 0 },
      { x: 0.343, y: 0.02, w: 0.313, h: 0.96, rot: 0 },
      { x: 0.667, y: 0.02, w: 0.313, h: 0.96, rot: 0 },
    ],
  },
  full: {
    label: 'Full Bleed',
    panels: [
      { x: 0, y: 0, w: 1, h: 1, rot: 0 },
      { x: 0.60, y: 0.60, w: 0.36, h: 0.30, rot: 3 },
    ],
  },
};

// ---------------------------------------------------------------- grades
// Gradient-map stops: [position 0..1, r, g, b]. Luminance is remapped through
// the stops, which gives the poster its sunset / neon duotone feel.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    swatch: '#ff7a2e',
    mix: 0.82,
    stops: [[0, 24, 12, 54], [0.35, 150, 40, 110], [0.65, 255, 110, 46], [1, 255, 215, 106]],
  },
  neon: {
    label: 'Neon Vice',
    swatch: '#2ee6ff',
    mix: 0.82,
    stops: [[0, 8, 14, 46], [0.35, 38, 66, 190], [0.65, 46, 230, 255], [1, 255, 46, 136]],
  },
  palm: {
    label: 'Palm Dusk',
    swatch: '#a8d84a',
    mix: 0.8,
    stops: [[0, 12, 42, 28], [0.35, 28, 110, 96], [0.65, 150, 205, 70], [1, 255, 215, 106]],
  },
  hotpink: {
    label: 'Hot Pink',
    swatch: '#ff2e88',
    mix: 0.84,
    stops: [[0, 40, 8, 50], [0.35, 120, 28, 158], [0.65, 255, 46, 136], [1, 255, 179, 217]],
  },
  teal: {
    label: 'Teal Night',
    swatch: '#37c8d8',
    mix: 0.82,
    stops: [[0, 5, 16, 30], [0.35, 13, 92, 106], [0.65, 55, 200, 216], [1, 216, 246, 255]],
  },
};

/** Builds a 256-entry [r, g, b] lookup table from a grade's stops. */
export function gradeLookup(grade) {
  const lut = new Uint8Array(256 * 3);
  const stops = grade.stops;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = Math.max(1e-6, b[0] - a[0]);
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    lut[i * 3] = Math.round(a[1] + (b[1] - a[1]) * f);
    lut[i * 3 + 1] = Math.round(a[2] + (b[2] - a[2]) * f);
    lut[i * 3 + 2] = Math.round(a[3] + (b[3] - a[3]) * f);
  }
  return lut;
}

/** A tiny deterministic PRNG, so grain and halftone never flicker. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- panels
/** Absolute pixel rect of a layout panel on a W x H cover. */
export function panelRect(panel, W, H) {
  return { x: panel.x * W, y: panel.y * H, w: panel.w * W, h: panel.h * H, rot: panel.rot };
}

/** True when the point (px, py) in cover pixels falls inside the panel. */
export function panelHit(panel, W, H, px, py) {
  const r = panelRect(panel, W, H);
  const rad = (-r.rot * Math.PI) / 180;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2;
}

/**
 * Draws one photo into a panel, cover-fit, with the panel's pan/zoom.
 * place = { photo: image|null, zoom: number, ox: number, oy: number }
 * ox/oy are fractions of the panel size, 0 = centred.
 */
export function drawPhotoPanel(ctx, rect, place) {
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  if (rect.rot) ctx.rotate((rect.rot * Math.PI) / 180);
  ctx.translate(-rect.w / 2, -rect.h / 2);
  // Drop shadow behind the frame.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = Math.max(8, rect.w * 0.03);
  ctx.shadowOffsetY = Math.max(4, rect.h * 0.012);
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, rect.w, rect.h);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // Photo, clipped to the frame.
  ctx.beginPath();
  ctx.rect(0, 0, rect.w, rect.h);
  ctx.clip();
  const img = place && place.photo;
  if (img) {
    const zoom = place.zoom || 1;
    const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const cx = rect.w / 2 + (place.ox || 0) * rect.w;
    const cy = rect.h / 2 + (place.oy || 0) * rect.h;
    ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  } else {
    const g = ctx.createLinearGradient(0, 0, rect.w, rect.h);
    g.addColorStop(0, '#3a1c5e');
    g.addColorStop(1, '#1c0f33');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${Math.max(14, rect.w * 0.055)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('+ add a photo', rect.w / 2, rect.h / 2);
  }
  ctx.restore();
  // White poster frame.
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  if (rect.rot) ctx.rotate((rect.rot * Math.PI) / 180);
  ctx.translate(-rect.w / 2, -rect.h / 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, rect.w * 0.012);
  ctx.strokeRect(0, 0, rect.w, rect.h);
  ctx.restore();
}

// ---------------------------------------------------------------- grade
/** Remaps the whole canvas through the grade's gradient map. */
export function applyGrade(ctx, W, H, grade) {
  const lut = gradeLookup(grade);
  const mix = grade.mix;
  const data = ctx.getImageData(0, 0, W, H);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const lum = Math.round(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
    const o = lum * 3;
    px[i] = px[i] + (lut[o] - px[i]) * mix;
    px[i + 1] = px[i + 1] + (lut[o + 1] - px[i + 1]) * mix;
    px[i + 2] = px[i + 2] + (lut[o + 2] - px[i + 2]) * mix;
  }
  ctx.putImageData(data, 0, 0);
}

// ---------------------------------------------------------------- lettering
/** Fits a font size so `text` fits inside `maxWidth`. */
export function fitFont(ctx, text, family, weight, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** The title block: scrim, Anton title, neon Pacifico subtitle. */
export function drawTitleBlock(ctx, state, W, H) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;
  const bandH = H * 0.30;
  const scrim = ctx.createLinearGradient(0, H - bandH, 0, H);
  scrim.addColorStop(0, 'rgba(16, 5, 30, 0)');
  scrim.addColorStop(1, 'rgba(16, 5, 30, 0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H - bandH, W, bandH);

  const pad = W * 0.045;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let y = H - H * 0.055;
  if (title) {
    const size = fitFont(ctx, title, 'Anton, sans-serif', 400, H * 0.115, W - pad * 2);
    ctx.font = `${size}px Anton, sans-serif`;
    // Hard offset shadow in hot pink, then a dark outline, then white fill.
    ctx.fillStyle = '#ff2e88';
    ctx.fillText(title, pad + size * 0.045, y + size * 0.045);
    ctx.lineWidth = Math.max(4, size * 0.10);
    ctx.strokeStyle = '#160826';
    ctx.lineJoin = 'round';
    ctx.strokeText(title, pad, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, pad, y);
    y -= size * 1.02;
  }
  if (subtitle) {
    const size = fitFont(ctx, subtitle, 'Pacifico, cursive', 400, H * 0.048, W - pad * 2);
    ctx.font = `${size}px Pacifico, cursive`;
    ctx.shadowColor = '#2ee6ff';
    ctx.shadowBlur = size * 0.55;
    ctx.fillStyle = '#b8f6ff';
    ctx.fillText(subtitle, pad, y);
    ctx.shadowBlur = 0;
  }
}

/** A gold starburst badge with a star in the middle. */
export function drawStarburst(ctx, cx, cy, r, label) {
  const spikes = 12;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.78;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffe27a');
  g.addColorStop(1, '#f5a400');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.strokeStyle = '#7a4d00';
  ctx.stroke();
  ctx.fillStyle = '#3a2400';
  ctx.font = `${r * 0.95}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u2605', 0, -r * 0.05);
  if (label) {
    ctx.font = `bold ${Math.max(9, r * 0.22)}px sans-serif`;
    ctx.fillText(label, 0, r * 0.52);
  }
  ctx.restore();
}

/** A diagonal ribbon across the top-left corner. */
export function drawRibbon(ctx, W, H, text) {
  if (!text) return;
  const S = Math.min(W, H);
  const band = H * 0.055;
  const half = S * 0.30;
  ctx.save();
  ctx.translate(W * 0.18, H * 0.10);
  ctx.rotate(Math.PI / 5.2);
  const g = ctx.createLinearGradient(-half, 0, half, 0);
  g.addColorStop(0, '#ff7a2e');
  g.addColorStop(0.5, '#ff2e88');
  g.addColorStop(1, '#ff7a2e');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = H * 0.012;
  ctx.shadowOffsetY = H * 0.006;
  ctx.fillRect(-half, -band / 2, half * 2, band);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // Folded ribbon ends.
  ctx.fillStyle = '#c2145f';
  ctx.beginPath();
  ctx.moveTo(-half, -band / 2); ctx.lineTo(-half - band * 0.5, 0); ctx.lineTo(-half, band / 2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(half, -band / 2); ctx.lineTo(half + band * 0.5, 0); ctx.lineTo(half, band / 2);
  ctx.closePath(); ctx.fill();
  const size = fitFont(ctx, text.toUpperCase(), 'Anton, sans-serif', 400, band * 0.52, half * 1.7);
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 0, 1);
  ctx.restore();
}

// ---------------------------------------------------------------- texture
/** Comic halftone dots blooming from the top-right corner. */
export function drawHalftone(ctx, W, H) {
  const rnd = mulberry32(20261119);
  const originX = W * 0.96;
  const originY = H * 0.04;
  const maxR = Math.max(6, W * 0.012);
  ctx.save();
  for (let gx = 0; gx < 14; gx++) {
    for (let gy = 0; gy < 10; gy++) {
      const x = originX - gx * W * 0.028 - (gy % 2) * W * 0.014;
      const y = originY + gy * H * 0.028;
      const d = Math.hypot(x - originX, y - originY) / (W * 0.36);
      if (d > 1) continue;
      const r = maxR * (1 - d) * (0.75 + rnd() * 0.5);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.20 * (1 - d)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Film grain: a seeded noise tile drawn over the cover. */
export function drawGrain(ctx, W, H) {
  const tile = 128;
  const off = document.createElement('canvas');
  off.width = tile;
  off.height = tile;
  const octx = off.getContext('2d');
  const img = octx.createImageData(tile, tile);
  const rnd = mulberry32(777);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  const pattern = ctx.createPattern(off, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** A soft dark vignette around the edges. */
export function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(8, 0, 18, 0)');
  g.addColorStop(1, 'rgba(8, 0, 18, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- whole cover
/**
 * Draws the full cover onto `canvas` at its own size.
 * state = { layout, grade, title, subtitle, ribbon, badge, ribbonOn,
 *           textureOn, photos: [image], places: [{ photo, zoom, ox, oy }] }
 * `places` has one entry per layout panel; photo is an index into photos
 * (or -1 for an empty panel).
 */
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  const grade = GRADES[state.grade] || GRADES.sunset;

  ctx.fillStyle = '#160826';
  ctx.fillRect(0, 0, W, H);

  layout.panels.forEach((panel, i) => {
    const rect = panelRect(panel, W, H);
    const place = (state.places && state.places[i]) || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const img = place.photo >= 0 ? state.photos[place.photo] : null;
    drawPhotoPanel(ctx, rect, { photo: img, zoom: place.zoom, ox: place.ox, oy: place.oy });
  });

  applyGrade(ctx, W, H, grade);
  if (state.textureOn) drawHalftone(ctx, W, H);
  drawVignette(ctx, W, H);
  if (state.ribbonOn) drawRibbon(ctx, W, H, state.ribbon);
  if (state.badge) drawStarburst(ctx, W * 0.90, H * 0.10, Math.min(W, H) * 0.075, 'HOT');
  drawTitleBlock(ctx, state, W, H);
  if (state.textureOn) drawGrain(ctx, W, H);
}
