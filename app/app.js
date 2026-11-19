"use strict";

/* Solmar Cover Studio: a GTA-style poster maker that runs fully offline.
   Photos are read on the user's own machine and never uploaded. */

const SAMPLE_PHOTOS = [
  "samples/sample-sunset.webp",
  "samples/sample-neon.webp",
  "samples/sample-beach.webp",
];

const EXPORT_SIZES = {
  "1080x1080": { w: 1080, h: 1080 },
  "1080x1350": { w: 1080, h: 1350 },
  "1920x1080": { w: 1920, h: 1080 },
};

const state = {
  layout: "poster",
  grade: "sunset",
  size: "1080x1080",
  selected: 0,
  caption: { title: "SOLMAR", sub: "SUNSET BOULEVARD", size: 110, pos: "bottom", color: "#ffffff" },
  panels: [
    { img: null, name: "", zoom: 1, ox: 0, oy: 0 },
    { img: null, name: "", zoom: 1, ox: 0, oy: 0 },
    { img: null, name: "", zoom: 1, ox: 0, oy: 0 },
  ],
};

const preview = document.getElementById("preview");
const previewCtx = preview.getContext("2d");
const statusEl = document.getElementById("export-status");

/* ---------- layouts ---------- */

function layoutPanels(layout, w, h) {
  const g = Math.round(w * 0.008); // gutter
  if (layout === "split") {
    const heroW = Math.round(w * 0.58) - g;
    const sideX = heroW + g * 2;
    const sideW = w - sideX;
    const halfH = Math.round(h / 2) - g;
    return [
      { x: 0, y: 0, w: heroW, h },
      { x: sideX, y: 0, w: sideW, h: halfH },
      { x: sideX, y: halfH + g * 2, w: sideW, h: h - halfH - g * 2 },
    ];
  }
  if (layout === "trio") {
    const colW = Math.round(w / 3) - g;
    return [
      { x: 0, y: 0, w: colW, h },
      { x: colW + g * 2, y: 0, w: colW, h },
      { x: (colW + g * 2) * 2, y: 0, w: w - (colW + g * 2) * 2, h },
    ];
  }
  // poster: hero on top, two panels below
  const heroH = Math.round(h * 0.62) - g;
  const botY = heroH + g * 2;
  const botH = h - botY;
  const halfW = Math.round(w / 2) - g;
  return [
    { x: 0, y: 0, w, h: heroH },
    { x: 0, y: botY, w: halfW, h: botH },
    { x: halfW + g * 2, y: botY, w: w - halfW - g * 2, h: botH },
  ];
}

/* ---------- photo drawing ---------- */

function drawPhotoCover(ctx, img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * scale;
  const dy = rect.y + (rect.h - dh) / 2 + oy * scale;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawEmptyPanel(ctx, rect, label) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, "#241a38");
  grad.addColorStop(1, "#120e1e");
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "#a99ec4";
  ctx.font = `700 ${Math.max(14, Math.round(rect.w * 0.028))}px Archivo, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/* ---------- colour grades ---------- */

function applySunsetGrade(ctx, w, h) {
  let g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(255, 120, 40, 0.05)");
  g.addColorStop(0.55, "rgba(255, 80, 120, 0.10)");
  g.addColorStop(1, "rgba(255, 90, 0, 0.30)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.85, h * 0.12, 0, w * 0.85, h * 0.12, w * 0.55);
  glow.addColorStop(0, "rgba(255, 190, 90, 0.28)");
  glow.addColorStop(1, "rgba(255, 190, 90, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function applyNeonGrade(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  let g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "rgba(255, 46, 136, 0.55)");
  g.addColorStop(0.5, "rgba(120, 60, 255, 0.25)");
  g.addColorStop(1, "rgba(34, 211, 238, 0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyNoirGrade(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = "saturation";
  ctx.fillStyle = "rgba(128, 128, 128, 1)";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(255, 255, 255, 0.25)");
  g.addColorStop(1, "rgba(0, 0, 0, 0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyVignette(ctx, w, h) {
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, "rgba(0, 0, 0, 0)");
  v.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/* ---------- caption ---------- */

function drawCaptionLettering(ctx, w, h) {
  const c = state.caption;
  const title = c.title.trim() || "SOLMAR";
  const sub = c.sub.trim();
  const pad = Math.round(w * 0.045);
  const titleSize = Math.round(w * 0.11 * (c.size / 110));
  const subSize = Math.round(titleSize * 0.24);
  const bottom = c.pos === "bottom";

  // scrim behind the caption so it reads over any photo
  const scrimH = titleSize + subSize + pad * 2.2;
  const scrim = ctx.createLinearGradient(0, bottom ? h - scrimH : 0, 0, bottom ? h : scrimH);
  if (bottom) {
    scrim.addColorStop(0, "rgba(0, 0, 0, 0)");
    scrim.addColorStop(1, "rgba(0, 0, 0, 0.62)");
  } else {
    scrim.addColorStop(0, "rgba(0, 0, 0, 0.62)");
    scrim.addColorStop(1, "rgba(0, 0, 0, 0)");
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bottom ? h - scrimH : 0, w, scrimH);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const x = pad;
  const titleY = bottom ? h - pad - subSize - Math.round(titleSize * 0.12) : pad + titleSize;
  const subY = bottom ? h - pad : pad + titleSize + subSize + Math.round(titleSize * 0.18);

  try { ctx.letterSpacing = `${Math.round(titleSize * 0.02)}px`; } catch (e) { /* older canvas: no letter spacing */ }
  ctx.font = `${titleSize}px "Archivo Black", sans-serif`;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, Math.round(titleSize / 14));
  ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
  ctx.strokeText(title.toUpperCase(), x, titleY);
  ctx.fillStyle = c.color;
  ctx.fillText(title.toUpperCase(), x, titleY);

  if (sub) {
    try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch (e) { /* older canvas */ }
    ctx.font = `700 ${subSize}px Archivo, sans-serif`;
    ctx.lineWidth = Math.max(2, Math.round(subSize / 8));
    ctx.strokeText(sub.toUpperCase(), x, subY);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(sub.toUpperCase(), x, subY);
  }
  try { ctx.letterSpacing = "0px"; } catch (e) { /* older canvas */ }

  // thin accent rule under the title block
  ctx.fillStyle = "#ffd60a";
  const ruleY = bottom ? titleY + Math.round(titleSize * 0.16) : subY + Math.round(subSize * 0.7);
  ctx.fillRect(x, ruleY, Math.round(w * 0.16), Math.max(3, Math.round(w * 0.004)));
}

/* ---------- main render ---------- */

function drawCover(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  const rects = layoutPanels(state.layout, w, h);
  rects.forEach((rect, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    const p = state.panels[i];
    if (p.img) {
      drawPhotoCover(ctx, p.img, rect, p.zoom, p.ox, p.oy);
    } else {
      drawEmptyPanel(ctx, rect, `PANEL ${i + 1} — LOAD A PHOTO`);
    }
    ctx.restore();
    if (i === state.selected) {
      ctx.save();
      ctx.strokeStyle = "rgba(34, 211, 238, 0.9)";
      ctx.lineWidth = Math.max(2, Math.round(w * 0.003));
      ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      ctx.restore();
    }
  });

  if (state.grade === "sunset") applySunsetGrade(ctx, w, h);
  else if (state.grade === "neon") applyNeonGrade(ctx, w, h);
  else if (state.grade === "noir") applyNoirGrade(ctx, w, h);
  applyVignette(ctx, w, h);
  drawCaptionLettering(ctx, w, h);

  // poster frame
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = Math.max(2, Math.round(w * 0.003));
  ctx.strokeRect(Math.round(w * 0.012), Math.round(h * 0.012), w - Math.round(w * 0.024), h - Math.round(h * 0.024));
  ctx.restore();
}

function drawPreview() {
  const { w, h } = EXPORT_SIZES[state.size];
  if (preview.width !== w || preview.height !== h) {
    preview.width = w;
    preview.height = h;
  }
  drawCover(previewCtx, w, h);
  document.getElementById("preview-size-label").textContent = `${w} × ${h}`;
}

/* ---------- photo loading ---------- */

function setPanelPhoto(i, img, name) {
  const p = state.panels[i];
  p.img = img;
  p.name = name;
  p.zoom = 1;
  p.ox = 0;
  p.oy = 0;
  const thumb = document.getElementById(`thumb-${i}`);
  thumb.innerHTML = "";
  const t = document.createElement("img");
  t.src = img.src;
  t.alt = name;
  thumb.appendChild(t);
  const zoom = document.getElementById(`zoom-${i}`);
  zoom.value = 100;
  document.getElementById(`zoom-out-${i}`).textContent = "100%";
  drawPreview();
}

function loadPhotoFromUrl(i, url, name) {
  const img = new Image();
  img.onload = () => setPanelPhoto(i, img, name || url.split("/").pop());
  img.onerror = () => setStatus(`Could not load ${name || url}.`, false);
  img.src = url;
}

function loadPhotoFromFile(i, file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => setPanelPhoto(i, img, file.name);
    img.onerror = () => setStatus(`Could not read ${file.name}.`, false);
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

function fillAllPanelsFrom(i) {
  const src = state.panels[i];
  if (!src.img) {
    setStatus("Load a photo into this panel first.", false);
    return;
  }
  state.panels.forEach((p, j) => {
    if (j !== i) setPanelPhoto(j, src.img, src.name);
  });
  setStatus(`Photo applied to all panels.`, true);
}

/* ---------- export ---------- */

function exportCoverPng() {
  const { w, h } = EXPORT_SIZES[state.size];
  const hasPhoto = state.panels.some((p) => p.img);
  if (!hasPhoto) {
    setStatus("Load at least one photo before exporting.", false);
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const savedSelected = state.selected;
  state.selected = -1; // no selection outline in the export
  drawCover(ctx, w, h);
  state.selected = savedSelected;
  drawPreview();
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus("Export failed in this browser.", false);
      return;
    }
    const name = `solmar-cover-${state.size}.png`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    window.__solmarLastExport = { width: w, height: h, bytes: blob.size, name };
    setStatus(`Exported ${name} — ${w} × ${h}, ${(blob.size / 1024).toFixed(0)} KiB.`, true);
  }, "image/png");
}

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.classList.toggle("is-ok", !!ok);
}

/* ---------- pointer interaction on the preview ---------- */

function panelAtPoint(clientX, clientY) {
  const r = preview.getBoundingClientRect();
  const { w, h } = EXPORT_SIZES[state.size];
  const x = ((clientX - r.left) / r.width) * w;
  const y = ((clientY - r.top) / r.height) * h;
  const rects = layoutPanels(state.layout, w, h);
  for (let i = 0; i < rects.length; i++) {
    const rc = rects[i];
    if (x >= rc.x && x <= rc.x + rc.w && y >= rc.y && y <= rc.y + rc.h) return { index: i, x, y };
  }
  return null;
}

function clampPan(i) {
  const p = state.panels[i];
  if (!p.img) return;
  const { w, h } = EXPORT_SIZES[state.size];
  const rects = layoutPanels(state.layout, w, h);
  const rect = rects[i];
  const scale = Math.max(rect.w / p.img.naturalWidth, rect.h / p.img.naturalHeight) * p.zoom;
  const dw = p.img.naturalWidth * scale;
  const dh = p.img.naturalHeight * scale;
  const maxOx = dw > rect.w ? (dw - rect.w) / 2 / scale : 0;
  const maxOy = dh > rect.h ? (dh - rect.h) / 2 / scale : 0;
  p.ox = Math.max(-maxOx, Math.min(maxOx, p.ox));
  p.oy = Math.max(-maxOy, Math.min(maxOy, p.oy));
}

let drag = null;

preview.addEventListener("pointerdown", (e) => {
  const hit = panelAtPoint(e.clientX, e.clientY);
  if (!hit) return;
  selectPanel(hit.index);
  const p = state.panels[hit.index];
  if (!p.img) return;
  preview.setPointerCapture(e.pointerId);
  drag = { index: hit.index, lastX: e.clientX, lastY: e.clientY };
});

preview.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const p = state.panels[drag.index];
  const { w, h } = EXPORT_SIZES[state.size];
  const r = preview.getBoundingClientRect();
  const rect = layoutPanels(state.layout, w, h)[drag.index];
  const scale = Math.max(rect.w / p.img.naturalWidth, rect.h / p.img.naturalHeight) * p.zoom;
  // drag delta in client px -> canvas px -> source-photo px
  p.ox += (((e.clientX - drag.lastX) / r.width) * w) / scale;
  p.oy += (((e.clientY - drag.lastY) / r.height) * h) / scale;
  drag.lastX = e.clientX;
  drag.lastY = e.clientY;
  clampPan(drag.index);
  drawPreview();
});

preview.addEventListener("pointerup", () => { drag = null; });
preview.addEventListener("pointercancel", () => { drag = null; });

preview.addEventListener("wheel", (e) => {
  const hit = panelAtPoint(e.clientX, e.clientY);
  if (!hit) return;
  e.preventDefault();
  const p = state.panels[hit.index];
  if (!p.img) return;
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  clampPan(hit.index);
  const zoom = document.getElementById(`zoom-${hit.index}`);
  zoom.value = Math.round(p.zoom * 100);
  document.getElementById(`zoom-out-${hit.index}`).textContent = `${Math.round(p.zoom * 100)}%`;
  drawPreview();
}, { passive: false });

function selectPanel(i) {
  state.selected = i;
  document.querySelectorAll(".panel-card").forEach((card) => {
    card.classList.toggle("is-selected", Number(card.dataset.panel) === i);
  });
  drawPreview();
}

/* ---------- control wiring ---------- */

function wireControls() {
  document.querySelectorAll("[data-upload]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById(`file-${btn.dataset.upload}`).click();
    });
  });
  [0, 1, 2].forEach((i) => {
    document.getElementById(`file-${i}`).addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) loadPhotoFromFile(i, file);
      e.target.value = "";
    });
    document.getElementById(`zoom-${i}`).addEventListener("input", (e) => {
      const p = state.panels[i];
      if (!p.img) return;
      p.zoom = Number(e.target.value) / 100;
      document.getElementById(`zoom-out-${i}`).textContent = `${e.target.value}%`;
      clampPan(i);
      drawPreview();
    });
  });
  document.querySelectorAll("[data-sample]").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadPhotoFromUrl(Number(btn.dataset.sample), btn.dataset.photo);
    });
  });
  document.querySelectorAll("[data-fill-all]").forEach((btn) => {
    btn.addEventListener("click", () => fillAllPanelsFrom(Number(btn.dataset.fillAll)));
  });
  document.querySelectorAll(".panel-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button, input, .samples")) return;
      selectPanel(Number(card.dataset.panel));
    });
  });
  document.querySelectorAll('input[name="layout"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      state.layout = radio.value;
      drawPreview();
    });
  });
  document.querySelectorAll('input[name="grade"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      state.grade = radio.value;
      drawPreview();
    });
  });
  document.querySelectorAll('input[name="size"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      state.size = radio.value;
      drawPreview();
    });
  });
  document.getElementById("caption-title").addEventListener("input", (e) => {
    state.caption.title = e.target.value;
    drawPreview();
  });
  document.getElementById("caption-sub").addEventListener("input", (e) => {
    state.caption.sub = e.target.value;
    drawPreview();
  });
  document.getElementById("caption-size").addEventListener("input", (e) => {
    state.caption.size = Number(e.target.value);
    document.getElementById("caption-size-out").textContent = e.target.value;
    drawPreview();
  });
  document.getElementById("caption-pos").addEventListener("change", (e) => {
    state.caption.pos = e.target.value;
    drawPreview();
  });
  document.querySelectorAll(".swatch").forEach((sw) => {
    sw.addEventListener("click", () => {
      document.querySelectorAll(".swatch").forEach((s) => s.classList.remove("is-active"));
      sw.classList.add("is-active");
      state.caption.color = sw.dataset.color;
      drawPreview();
    });
  });
  document.getElementById("btn-export").addEventListener("click", exportCoverPng);
}

/* ---------- start ---------- */

async function startCoverStudio() {
  wireControls();
  try {
    await Promise.all([
      document.fonts.load('100px "Archivo Black"'),
      document.fonts.load('700 20px Archivo'),
    ]);
  } catch (e) { /* fonts fall back to system sans if they fail */ }
  // Load the three sample photos so the cover is alive on first paint.
  SAMPLE_PHOTOS.forEach((url, i) => loadPhotoFromUrl(i, url));
  selectPanel(0);
  drawPreview();
}

startCoverStudio();
