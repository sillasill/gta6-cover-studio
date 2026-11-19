// Neon Coast Cover Studio — the cover engine.
// Draws a GTA-poster-style multi-panel cover on any 2D canvas: panel layouts with
// inked gutters, a sunset/neon gradient-map grade per panel, a halftone title band
// with Anton gradient lettering and a Pacifico neon subtitle, a star badge, grain
// and a vignette. Pure canvas, no network, deterministic for a given state.

export const GRADES = {
  sunset:   { name: 'Sunset',   top: '#ff9a3d', mid: '#ff2975', bottom: '#2b0a3d', glow: '#ffd319' },
  neon:     { name: 'Neon Vice', top: '#00e5ff', mid: '#ff2975', bottom: '#7b2fff', glow: '#00e5ff' },
  dusk:     { name: 'Palm Dusk', top: '#ffb347', mid: '#c94b7c', bottom: '#1b1035', glow: '#ffb347' },
  hotpink:  { name: 'Hot Pink', top: '#ff7ad9', mid: '#ff2975', bottom: '#3d0a5e', glow: '#ff7ad9' },
  tealnight:{ name: 'Teal Night', top: '#2de2c5', mid: '#1e6fff', bottom: '#0a1030', glow: '#2de2c5' },
};

export const LAYOUTS = {
  tilted:  { name: 'Tilted Snapshots', panels: 3 },
  hero3:   { name: 'Hero + Three',     panels: 4 },
  grid4:   { name: 'Four Grid',        panels: 4 },
  grid9:   { name: 'Nine Grid',        panels: 9 },
  triptych:{ name: 'Triptych',         panels: 3 },
  full:    { name: 'Full Bleed',       panels: 1 },
};

export const SIZES = {
  square:   { name: 'Square 1080 × 1080',   w: 1080, h: 1080 },
  portrait: { name: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  wide:     { name: 'Wide 1920 × 1080',     w: 1920, h: 1080 },
};

/** Seeded random so the grain is identical on every render of the same cover. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panel rectangles for a layout, inside the photo area (above the title band). */
export function layoutPanels(layout, W, H, titleH) {
  const g = Math.max(6, Math.round(W * 0.012)); // white gutter
  const Aw = W, Ah = H - titleH;
  const r = (x, y, w, h, rot = 0) => ({ x, y, w, h, rot });
  switch (layout) {
    case 'hero3': {
      const top = Math.round(Ah * 0.62);
      const bw = Math.round((Aw - g * 2) / 3);
      return [r(0, 0, Aw, top),
        r(0, top + g, bw, Ah - top - g), r(bw + g, top + g, bw, Ah - top - g),
        r(bw * 2 + g * 2, top + g, Aw - bw * 2 - g * 2, Ah - top - g)];
    }
    case 'grid4': {
      const cw = Math.round((Aw - g) / 2), ch = Math.round((Ah - g) / 2);
      return [r(0, 0, cw, ch), r(cw + g, 0, Aw - cw - g, ch),
        r(0, ch + g, cw, Ah - ch - g), r(cw + g, ch + g, Aw - cw - g, Ah - ch - g)];
    }
    case 'grid9': {
      const out = [];
      const cw = (Aw - g * 2) / 3, ch = (Ah - g * 2) / 3;
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++)
        out.push(r(Math.round(col * (cw + g)), Math.round(row * (ch + g)), Math.round(cw), Math.round(ch)));
      return out;
    }
    case 'triptych': {
      const cw = Math.round((Aw - g * 2) / 3);
      return [r(0, 0, cw, Ah), r(cw + g, 0, cw, Ah), r(cw * 2 + g * 2, 0, Aw - cw * 2 - g * 2, Ah)];
    }
    case 'full':
      return [r(0, 0, Aw, Ah)];
    case 'tilted':
    default: {
      const heroW = Math.round(Aw * 0.60);
      const sideW = Aw - heroW - g;
      const sh = Math.round((Ah - g) / 2);
      return [r(0, 0, heroW, Ah, -0.02), r(heroW + g, 0, sideW, sh, 0.026),
        r(heroW + g, sh + g, sideW, Ah - sh - g, -0.018)];
    }
  }
}

/** Cover-fits one photo into a panel rect, honouring zoom and pan offsets. */
export function drawPanelPhoto(ctx, img, panel, crop) {
  const { x, y, w, h, rot } = panel;
  const cx = x + w / 2, cy = y + h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);
  // Slightly oversize the clip so a rotated panel never shows a gutter gap.
  const ew = w * 1.06, eh = h * 1.06;
  ctx.beginPath();
  ctx.rect(-ew / 2, -eh / 2, ew, eh);
  ctx.clip();
  if (img) {
    const zoom = crop?.zoom ?? 1;
    const base = Math.max(ew / img.naturalWidth, eh / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * base, ph = img.naturalHeight * base;
    // Pan spans the whole slack, so oy = 1 always shows the photo's top edge.
    const ox = (crop?.ox ?? 0) * Math.max(0, (pw - ew) / 2) * 0.95;
    const oy = (crop?.oy ?? 0) * Math.max(0, (ph - eh) / 2) * 0.95;
    ctx.drawImage(img, -pw / 2 + ox, -ph / 2 + oy, pw, ph);
  } else {
    ctx.fillStyle = '#3a2340';
    ctx.fillRect(-ew / 2, -eh / 2, ew, eh);
  }
  ctx.restore();
}

/** Sunset/neon gradient-map grade: overlay wash + warm foot + soft-light lift. */
export function gradePanel(ctx, panel, grade) {
  const { x, y, w, h, rot } = panel;
  const cx = x + w / 2, cy = y + h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);
  const ew = w * 1.06, eh = h * 1.06;
  ctx.beginPath();
  ctx.rect(-ew / 2, -eh / 2, ew, eh);
  ctx.clip();
  const wash = ctx.createLinearGradient(0, -eh / 2, 0, eh / 2);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(0.55, grade.mid);
  wash.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = wash;
  ctx.fillRect(-ew / 2, -eh / 2, ew, eh);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = wash;
  ctx.fillRect(-ew / 2, -eh / 2, ew, eh);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const foot = ctx.createLinearGradient(0, 0, 0, eh / 2);
  foot.addColorStop(0, 'rgba(255, 90, 60, 0)');
  foot.addColorStop(1, 'rgba(255, 60, 140, 0.28)');
  ctx.fillStyle = foot;
  ctx.fillRect(-ew / 2, -eh / 2, ew, eh);
  ctx.restore();
}

/** Halftone dot field for the title band, denser toward the right. */
export function drawHalftone(ctx, x, y, w, h, color) {
  const step = Math.max(10, Math.round(w / 72));
  ctx.save();
  ctx.fillStyle = color;
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const t = (xx - x) / w;
      const rad = step * (0.10 + 0.28 * t);
      ctx.globalAlpha = 0.16 + 0.20 * t;
      ctx.beginPath();
      ctx.arc(xx, yy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Deterministic film grain over the whole cover. */
export function drawGrain(ctx, W, H, seed) {
  const rand = mulberry32(seed);
  const n = Math.round((W * H) / 1100);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const v = rand();
    ctx.globalAlpha = 0.03 + rand() * 0.05;
    ctx.fillStyle = v > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(rand() * W, rand() * H, 1.6, 1.6);
  }
  ctx.restore();
}

/** Soft darkening toward the cover's edges. */
export function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,2,20,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** The title band: dark ink, halftone, gradient Anton title, neon script subtitle, star badge. */
export function drawTitleBand(ctx, W, H, titleH, state, grade) {
  const y0 = H - titleH;
  ctx.fillStyle = '#160a1e';
  ctx.fillRect(0, y0, W, titleH);
  drawHalftone(ctx, 0, y0, W, titleH, grade.glow);
  ctx.fillStyle = grade.glow;
  ctx.fillRect(0, y0, W, Math.max(3, titleH * 0.045));

  const title = (state.title || 'NEON COAST').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const cx = W / 2;

  // Neon script subtitle above the title.
  if (sub) {
    let sSize = titleH * 0.26;
    ctx.font = `${sSize}px Pacifico, cursive`;
    while (ctx.measureText(sub).width > W * 0.86 && sSize > 10) {
      sSize -= 1;
      ctx.font = `${sSize}px Pacifico, cursive`;
    }
    ctx.save();
    ctx.translate(cx, y0 + titleH * 0.30);
    ctx.rotate(-0.015);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.glow;
    ctx.shadowColor = grade.mid;
    ctx.shadowBlur = sSize * 0.55;
    ctx.fillText(sub, 0, 0);
    ctx.restore();
  }

  // Big gradient Anton title, white keyline, hard drop shadow.
  let tSize = titleH * (sub ? 0.56 : 0.62);
  ctx.font = `${tSize}px Anton, sans-serif`;
  while (ctx.measureText(title).width > W * 0.90 && tSize > 12) {
    tSize -= 2;
    ctx.font = `${tSize}px Anton, sans-serif`;
  }
  const ty = y0 + titleH * (sub ? 0.74 : 0.62);
  const grad = ctx.createLinearGradient(0, ty - tSize * 0.55, 0, ty + tSize * 0.45);
  grad.addColorStop(0, '#fff7ae');
  grad.addColorStop(0.45, grade.glow);
  grad.addColorStop(1, grade.mid);
  ctx.save();
  ctx.translate(cx, ty);
  ctx.rotate(-0.012);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, tSize * 0.055);
  ctx.strokeText(title, 0, 0);
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = tSize * 0.07;
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  // Star badge: heat meter in a gold ring, top-right of the band.
  const bx = W - titleH * 0.52, by = y0 + titleH * 0.52, br = titleH * 0.40;
  ctx.save();
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd319';
  ctx.fill();
  ctx.lineWidth = Math.max(2, br * 0.10);
  ctx.strokeStyle = '#160a1e';
  ctx.stroke();
  ctx.fillStyle = '#160a1e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${br * 0.62}px Anton, sans-serif`;
  ctx.fillText(String(Math.max(1, Math.min(5, state.heat || 4))), bx, by - br * 0.28);
  ctx.font = `${br * 0.34}px Anton, sans-serif`;
  const stars = '★'.repeat(Math.max(1, Math.min(5, state.heat || 4)));
  ctx.fillText(stars, bx, by + br * 0.30);
  ctx.restore();

  // Badge ribbon text, bottom-left of the band.
  const badge = (state.badge || '').trim().toUpperCase();
  if (badge) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(10, titleH * 0.13)}px Anton, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('★ ' + badge, W * 0.03, y0 + titleH * 0.90);
    ctx.restore();
  }
}

/**
 * Renders the whole cover onto `canvas` (its own pixel size) from `state` and
 * `photos` (array of images, may hold nulls). Returns the panel rects, in
 * canvas pixels, so the editor can hit-test them.
 */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const titleH = Math.round(H * (state.size === 'wide' ? 0.19 : 0.16));

  ctx.fillStyle = '#f5efe6'; // poster paper: the white gutters
  ctx.fillRect(0, 0, W, H);

  const panels = layoutPanels(state.layout, W, H, titleH);
  panels.forEach((panel, i) => {
    const photo = photos[state.slots?.[i] ?? 0] ?? null;
    drawPanelPhoto(ctx, photo, panel, state.crops?.[i]);
    gradePanel(ctx, panel, grade);
    // Inked panel border.
    ctx.save();
    ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
    if (panel.rot) ctx.rotate(panel.rot);
    ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.strokeStyle = '#14101a';
    ctx.strokeRect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
    ctx.restore();
  });

  drawTitleBand(ctx, W, H, titleH, state, grade);
  drawVignette(ctx, W, H);
  drawGrain(ctx, W, H, 1337 + W * 7 + H);
  return panels;
}
