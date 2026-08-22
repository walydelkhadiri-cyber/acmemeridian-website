/* =============================================================================
   Capabilities carousel — Three.js device mockups.
   Loaded on demand from app.js when the section approaches the viewport, so the
   hero never waits on it. The six capabilities live in the HTML as a plain list;
   this module upgrades that list into a carousel and leaves it alone on failure.
   ========================================================================== */
import * as THREE from './vendor/three.module.min.js';

/* ------------------------------------------------------------ screen artwork
   Painted on a 2D canvas, monochrome, in the same register as the rest of the
   site. Drawn large so the texture still reads sharp at grazing angles.        */

const w = (a) => `rgba(255,255,255,${a})`;

function rr(c, x, y, wd, ht, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + wd, y, x + wd, y + ht, r);
  c.arcTo(x + wd, y + ht, x, y + ht, r);
  c.arcTo(x, y + ht, x, y, r);
  c.arcTo(x, y, x + wd, y, r);
  c.closePath();
}
function fill(c, x, y, wd, ht, r, col) { rr(c, x, y, wd, ht, r); c.fillStyle = col; c.fill(); }
function bar(c, x, y, wd, ht, col) { fill(c, x, y, wd, ht, ht / 2, col); }
/* vertical bars need a corner radius based on the short side, not the tall one */
function vbar(c, x, y, wd, ht, col) { fill(c, x, y, wd, ht, Math.min(wd, ht) * 0.32, col); }

function canvas2d(W, H) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#0a0a0b'; c.fillRect(0, 0, W, H);
  return { cv, c, W, H };
}

const SCREENS = {
  /* ---------------------------------------------------------------- code */
  code(W, H) {
    const { cv, c } = canvas2d(W, H);
    fill(c, 0, 0, W, H * 0.052, 0, '#141416');
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
      c.beginPath(); c.arc(W * 0.028 + i * W * 0.021, H * 0.026, H * 0.0092, 0, 7);
      c.fillStyle = col; c.fill();
    });
    fill(c, 0, H * 0.052, W * 0.2, H, 0, '#0e0e10');          // file tree
    for (let i = 0; i < 11; i++)
      bar(c, W * 0.032, H * 0.11 + i * H * 0.048, W * (0.06 + Math.random() * 0.09),
          H * 0.011, w(i === 3 ? 0.5 : 0.16));
    const lines = [.42, .62, .3, .55, .7, .24, .5, .66, .38, .58, .28, .46, .62, .34];
    lines.forEach((L, i) => {
      const y = H * 0.105 + i * H * 0.056;
      bar(c, W * 0.215, y, W * 0.012, H * 0.011, w(0.14));     // line number
      const ind = (i % 5 === 1 || i % 5 === 2) ? W * 0.03 : (i % 7 === 3 ? W * 0.055 : 0);
      let x = W * 0.245 + ind, seg = 0;
      while (x < W * 0.245 + L * W && seg < 6) {
        const sw = W * (0.03 + Math.random() * 0.075);
        bar(c, x, y, sw, H * 0.011, w(seg === 0 ? 0.62 : 0.2 + (seg % 2) * 0.12));
        x += sw + W * 0.016; seg++;
      }
    });
    fill(c, W * 0.2, H * 0.74, W, H * 0.26, 0, '#0d0d0f');     // terminal
    bar(c, W * 0.225, H * 0.78, W * 0.03, H * 0.011, w(0.5));
    for (let i = 0; i < 3; i++)
      bar(c, W * 0.225, H * 0.82 + i * H * 0.045, W * (0.2 + Math.random() * 0.25),
          H * 0.011, w(0.22));
    return cv;
  },

  /* ----------------------------------------------------------------- web */
  web(W, H) {
    const { cv, c } = canvas2d(W, H);
    fill(c, 0, 0, W, H * 0.062, 0, '#141416');
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
      c.beginPath(); c.arc(W * 0.028 + i * W * 0.021, H * 0.031, H * 0.0092, 0, 7);
      c.fillStyle = col; c.fill();
    });
    fill(c, W * 0.11, H * 0.017, W * 0.5, H * 0.028, H * 0.014, '#0a0a0b');
    bar(c, W * 0.13, H * 0.026, W * 0.14, H * 0.01, w(0.3));
    bar(c, W * 0.06, H * 0.11, W * 0.075, H * 0.012, w(0.75));  // nav
    [0.62, 0.7, 0.78, 0.86].forEach(x => bar(c, W * x, H * 0.11, W * 0.05, H * 0.01, w(0.3)));
    bar(c, W * 0.06, H * 0.24, W * 0.055, H * 0.009, w(0.3));   // eyebrow
    [0.58, 0.68, 0.4].forEach((L, i) =>
      bar(c, W * 0.06, H * 0.3 + i * H * 0.085, W * L, H * 0.046, w(0.9)));
    [0.42, 0.36].forEach((L, i) =>
      bar(c, W * 0.06, H * 0.6 + i * H * 0.04, W * L, H * 0.013, w(0.35)));
    fill(c, W * 0.06, H * 0.71, W * 0.13, H * 0.055, H * 0.028, w(0.92));
    fill(c, W * 0.21, H * 0.71, W * 0.13, H * 0.055, H * 0.028, 'transparent');
    rr(c, W * 0.21, H * 0.71, W * 0.13, H * 0.055, H * 0.028);
    c.strokeStyle = w(0.3); c.lineWidth = W * 0.0016; c.stroke();
    for (let i = 0; i < 22; i++) {                              // meridian field
      const x = W * 0.42 + i * W * 0.026;
      c.beginPath();
      for (let y = H * 0.08; y <= H; y += H * 0.04)
        c.lineTo(x + Math.sin((y / H) * Math.PI) * W * 0.02 * Math.sin(i), y);
      c.strokeStyle = w(0.07); c.lineWidth = W * 0.0012; c.stroke();
    }
    return cv;
  },

  /* ----------------------------------------------------------------- app */
  app(W, H) {
    const { cv, c } = canvas2d(W, H);
    bar(c, W * 0.08, H * 0.028, W * 0.1, H * 0.011, w(0.85));   // status bar
    bar(c, W * 0.78, H * 0.028, W * 0.14, H * 0.011, w(0.85));
    bar(c, W * 0.08, H * 0.095, W * 0.44, H * 0.026, w(0.92));  // title
    bar(c, W * 0.08, H * 0.135, W * 0.3, H * 0.013, w(0.32));
    for (let i = 0; i < 3; i++) {                                // cards
      const y = H * 0.19 + i * H * 0.145;
      fill(c, W * 0.07, y, W * 0.86, H * 0.125, W * 0.05, '#151518');
      c.beginPath(); c.arc(W * 0.16, y + H * 0.062, W * 0.045, 0, 7);
      c.strokeStyle = w(0.28); c.lineWidth = W * 0.008; c.stroke();
      bar(c, W * 0.245, y + H * 0.04, W * (0.34 - i * 0.06), H * 0.016, w(0.8));
      bar(c, W * 0.245, y + H * 0.072, W * (0.46 - i * 0.05), H * 0.012, w(0.28));
    }
    fill(c, W * 0.07, H * 0.64, W * 0.86, H * 0.17, W * 0.05, '#151518');
    const cols = [0.03, 0.052, 0.041, 0.068, 0.055, 0.092, 0.074];
    cols.forEach((h, i) =>                                       // little chart
      vbar(c, W * 0.12 + i * W * 0.115, H * 0.78 - H * h, W * 0.055, H * h,
           w(i === 5 ? 0.85 : 0.24)));
    fill(c, 0, H * 0.885, W, H * 0.115, 0, '#111114');           // tab bar
    for (let i = 0; i < 4; i++) {
      const x = W * (0.13 + i * 0.25), a = i === 0 ? 0.9 : 0.26;
      fill(c, x - W * 0.032, H * 0.915, W * 0.064, W * 0.064, W * 0.018, w(a));
      bar(c, x - W * 0.038, H * 0.962, W * 0.076, H * 0.008, w(a * 0.7));
    }
    bar(c, W * 0.34, H * 0.988, W * 0.32, H * 0.006, w(0.55));   // home indicator
    return cv;
  },

  /* ---------------------------------------------------------------- dash */
  dash(W, H) {
    const { cv, c } = canvas2d(W, H);
    fill(c, 0, 0, W * 0.19, H, 0, '#0e0e10');
    bar(c, W * 0.03, H * 0.06, W * 0.09, H * 0.016, w(0.8));
    for (let i = 0; i < 7; i++)
      bar(c, W * 0.03, H * 0.15 + i * H * 0.06, W * (0.07 + Math.random() * 0.06),
          H * 0.012, w(i === 1 ? 0.62 : 0.18));
    bar(c, W * 0.225, H * 0.07, W * 0.16, H * 0.024, w(0.9));
    for (let i = 0; i < 3; i++) {                                // KPI tiles
      const x = W * 0.225 + i * W * 0.262;
      fill(c, x, H * 0.14, W * 0.235, H * 0.2, W * 0.012, '#141417');
      bar(c, x + W * 0.022, H * 0.175, W * 0.07, H * 0.011, w(0.28));
      bar(c, x + W * 0.022, H * 0.215, W * (0.1 - i * 0.02), H * 0.034, w(0.92));
      bar(c, x + W * 0.022, H * 0.285, W * 0.05, H * 0.01, w(0.35));
    }
    fill(c, W * 0.225, H * 0.38, W * 0.755, H * 0.54, W * 0.012, '#141417');
    const pts = [];
    for (let i = 0; i <= 26; i++)
      pts.push([W * 0.26 + i * W * 0.0265,
                H * 0.82 - H * (0.06 + Math.abs(Math.sin(i * 0.55)) * 0.3 + i * 0.007)]);
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    c.strokeStyle = w(0.9); c.lineWidth = W * 0.0028; c.stroke();
    c.lineTo(pts[pts.length - 1][0], H * 0.86); c.lineTo(pts[0][0], H * 0.86); c.closePath();
    const g = c.createLinearGradient(0, H * 0.4, 0, H * 0.86);
    g.addColorStop(0, w(0.16)); g.addColorStop(1, w(0));
    c.fillStyle = g; c.fill();
    return cv;
  },

  /* ---------------------------------------------------------------- flow */
  flow(W, H) {
    const { cv, c } = canvas2d(W, H);
    bar(c, W * 0.08, H * 0.06, W * 0.36, H * 0.022, w(0.9));
    bar(c, W * 0.08, H * 0.098, W * 0.26, H * 0.012, w(0.3));
    const steps = ['', '', '', ''];
    steps.forEach((_, i) => {                                    // pipeline
      const y = H * 0.17 + i * H * 0.13;
      fill(c, W * 0.08, y, W * 0.84, H * 0.1, W * 0.022, '#141417');
      const done = i < 2;
      c.beginPath(); c.arc(W * 0.145, y + H * 0.05, W * 0.03, 0, 7);
      c.fillStyle = done ? w(0.9) : 'transparent'; c.fill();
      c.strokeStyle = w(done ? 0.9 : 0.3); c.lineWidth = W * 0.006; c.stroke();
      if (done) {
        c.beginPath();
        c.moveTo(W * 0.132, y + H * 0.05); c.lineTo(W * 0.142, y + H * 0.061);
        c.lineTo(W * 0.16, y + H * 0.038);
        c.strokeStyle = '#0a0a0b'; c.lineWidth = W * 0.008;
        c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
      }
      bar(c, W * 0.2, y + H * 0.03, W * (0.34 - i * 0.04), H * 0.015, w(done ? 0.85 : 0.5));
      bar(c, W * 0.2, y + H * 0.062, W * (0.44 - i * 0.05), H * 0.011, w(0.24));
      if (i < 3) {
        c.beginPath(); c.moveTo(W * 0.145, y + H * 0.1); c.lineTo(W * 0.145, y + H * 0.13);
        c.strokeStyle = w(0.18); c.lineWidth = W * 0.004; c.stroke();
      }
    });
    fill(c, W * 0.08, H * 0.71, W * 0.84, H * 0.21, W * 0.022, '#141417');
    bar(c, W * 0.11, H * 0.75, W * 0.2, H * 0.013, w(0.3));
    const th = [0.035, 0.052, 0.044, 0.078, 0.105];              // throughput
    th.forEach((h, i) =>
      vbar(c, W * 0.115 + i * W * 0.155, H * 0.885 - H * h, W * 0.058, H * h,
           w(0.2 + i * 0.15)));
    return cv;
  },

  /* ------------------------------------------------------------------ ai */
  ai(W, H) {
    const { cv, c } = canvas2d(W, H);
    bar(c, W * 0.08, H * 0.055, W * 0.3, H * 0.02, w(0.9));
    c.beginPath(); c.arc(W * 0.88, H * 0.062, W * 0.028, 0, 7);
    c.strokeStyle = w(0.3); c.lineWidth = W * 0.005; c.stroke();
    const msgs = [
      [1, 0.42, 0.055], [0, 0.66, 0.115], [1, 0.3, 0.055], [0, 0.72, 0.135], [0, 0.5, 0.075],
    ];
    let y = H * 0.13;
    msgs.forEach(([me, wd, ht]) => {
      const bw = W * wd, bh = H * ht, x = me ? W * 0.92 - bw : W * 0.08;
      fill(c, x, y, bw, bh, W * 0.022, me ? w(0.92) : '#151518');
      const tc = me ? 'rgba(10,10,11,.55)' : w(0.4);
      for (let l = 0; l * H * 0.028 < bh - H * 0.03; l++)
        bar(c, x + W * 0.025, y + H * 0.02 + l * H * 0.028,
            bw - W * (0.05 + Math.random() * 0.08), H * 0.011, tc);
      y += bh + H * 0.028;
    });
    fill(c, W * 0.08, y + H * 0.01, W * 0.3, H * 0.05, W * 0.022, '#121215');
    for (let i = 0; i < 3; i++) {                                 // typing dots
      c.beginPath();
      c.arc(W * 0.13 + i * W * 0.05, y + H * 0.035, W * 0.011, 0, 7);
      c.fillStyle = w(0.25 + i * 0.2); c.fill();
    }
    fill(c, W * 0.08, H * 0.9, W * 0.84, H * 0.062, W * 0.031, '#141417');
    bar(c, W * 0.115, H * 0.928, W * 0.3, H * 0.012, w(0.24));
    c.beginPath(); c.arc(W * 0.865, H * 0.931, W * 0.022, 0, 7);
    c.fillStyle = w(0.9); c.fill();
    return cv;
  },
};

/* ---------------------------------------------------------------- geometry */

function slab(wd, ht, th, r) {
  const s = new THREE.Shape();
  const x = -wd / 2, y = -ht / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + wd - r, y); s.absarc(x + wd - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + wd, y + ht - r); s.absarc(x + wd - r, y + ht - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + ht); s.absarc(x + r, y + ht - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  const bev = Math.min(th * 0.24, r * 0.45);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(th - bev * 2, 0.001), bevelEnabled: true, bevelThickness: bev,
    bevelSize: bev, bevelSegments: 4, curveSegments: 20,
  });
  g.center();
  return g;
}

function screenMesh(tex, wd, ht) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(wd, ht),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
  return m;
}

function texture(kind, W, H, renderer) {
  const t = new THREE.CanvasTexture(SCREENS[kind](W, H));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.needsUpdate = true;
  return t;
}

const SHELL = () => new THREE.MeshStandardMaterial({
  color: 0x33333a, metalness: 0.5, roughness: 0.36,
});
const DARK = () => new THREE.MeshStandardMaterial({
  color: 0x0c0c0e, metalness: 0.5, roughness: 0.6,
});

function buildLaptop(tex) {
  const g = new THREE.Group();
  const LW = 2.0, LH = 1.25, LT = 0.045, BD = 1.38, BT = 0.052, BEZ = 0.052;

  const hinge = new THREE.Group();
  const lid = new THREE.Mesh(slab(LW, LH, LT, 0.05), SHELL());
  lid.position.y = LH / 2;
  hinge.add(lid);
  const sc = screenMesh(tex, LW - BEZ * 2, LH - BEZ * 2);
  sc.position.set(0, LH / 2, LT / 2 + 0.0015);
  hinge.add(sc);
  hinge.rotation.x = -0.13;
  g.add(hinge);

  const base = new THREE.Mesh(slab(LW, BD, BT, 0.05), SHELL());
  base.rotation.x = -Math.PI / 2;
  base.position.set(0, -BT / 2, BD / 2);
  g.add(base);

  const kb = new THREE.Mesh(new THREE.PlaneGeometry(LW * 0.84, BD * 0.5), DARK());
  kb.rotation.x = -Math.PI / 2;
  kb.position.set(0, 0.0012, BD * 0.42);
  g.add(kb);

  const tp = new THREE.Mesh(new THREE.PlaneGeometry(LW * 0.3, BD * 0.28), DARK());
  tp.rotation.x = -Math.PI / 2;
  tp.position.set(0, 0.0012, BD * 0.82);
  g.add(tp);

  g.position.y = -0.16;
  g.scale.setScalar(1.02);
  g.userData.cam = { dist: 4.45, y: 0.95, look: -0.12 };   // légère plongée : on voit le socle
  return g;
}

function buildPhone(tex) {
  const g = new THREE.Group();
  const W = 0.64, H = 1.3, T = 0.078, BEZ = 0.022;
  const body = new THREE.Mesh(slab(W, H, T, 0.105), SHELL());
  g.add(body);
  const sc = screenMesh(tex, W - BEZ * 2, H - BEZ * 2);
  sc.position.z = T / 2 + 0.0012;
  g.add(sc);

  const island = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 0.28, H * 0.028),
    new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false })
  );
  island.position.set(0, H * 0.41, T / 2 + 0.0022);
  g.add(island);

  const btn = new THREE.Mesh(slab(0.012, 0.13, 0.03, 0.005), SHELL());
  btn.position.set(W / 2, H * 0.14, 0);
  g.add(btn);

  g.scale.setScalar(1.26);
  g.userData.cam = { dist: 3.42, y: 0.1, look: 0 };
  return g;
}

function buildTablet(tex) {
  const g = new THREE.Group();
  const W = 1.12, H = 1.5, T = 0.062, BEZ = 0.05;
  const body = new THREE.Mesh(slab(W, H, T, 0.072), SHELL());
  g.add(body);
  const sc = screenMesh(tex, W - BEZ * 2, H - BEZ * 2);
  sc.position.z = T / 2 + 0.0012;
  g.add(sc);
  const cam = new THREE.Mesh(
    new THREE.CircleGeometry(0.009, 16),
    new THREE.MeshBasicMaterial({ color: 0x08080a, toneMapped: false })
  );
  cam.position.set(0, H / 2 - BEZ / 2, T / 2 + 0.002);
  g.add(cam);
  g.scale.setScalar(1.08);
  g.userData.cam = { dist: 3.95, y: 0.12, look: 0 };
  return g;
}

const BUILD = { laptop: buildLaptop, phone: buildPhone, tablet: buildTablet };
const TEXSIZE = { laptop: [2048, 1280], phone: [1080, 2160], tablet: [1440, 1920] };

/* -------------------------------------------------------------------- init */

export function initCapabilities() {
  const host = document.getElementById('capx');
  const stage = document.getElementById('capstage');
  const list = document.getElementById('caplist');
  const dots = document.getElementById('capdots');
  if (!host || !stage || !list) return;

  const items = Array.from(list.children);
  if (!items.length) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }                       // no WebGL: the plain list stays
  if (!renderer.getContext()) return;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  stage.prepend(renderer.domElement);
  renderer.domElement.className = 'capx-canvas';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.4, 4.4);
  let lookY = 0;

  scene.add(new THREE.HemisphereLight(0xdfe6f2, 0x111114, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(-2.6, 3.2, 4.2); scene.add(key);
  const rimL = new THREE.DirectionalLight(0xcfe0ff, 3.4);   // dessine l'arête gauche
  rimL.position.set(-4.2, 1.2, -2.2); scene.add(rimL);
  const rimR = new THREE.DirectionalLight(0xffffff, 3.0);   // et l'arête droite
  rimR.position.set(4.2, 1.6, -2.4); scene.add(rimR);
  const bounce = new THREE.DirectionalLight(0xffffff, 0.9);
  bounce.position.set(1.2, -2.6, 2.4); scene.add(bounce);

  const SPREAD = 4.6;
  const groups = items.map((li) => {
    const kind = li.dataset.device, art = li.dataset.screen;
    const [tw, th] = TEXSIZE[kind];
    const g = BUILD[kind](texture(art, tw, th, renderer));
    g.visible = false;
    scene.add(g);
    return g;
  });

  /* --------------------------------------------------------------- state */
  let cur = 0, virt = 0, target = 0;
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  let raf = 0, running = false, t0 = performance.now();

  items.forEach((li, i) => li.classList.toggle('on', i === 0));

  const dotEls = items.map((li, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'capx-dot';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', li.querySelector('h3').textContent.trim());
    b.addEventListener('click', () => go(i));
    dots.appendChild(b);
    return b;
  });

  function paint() {
    items.forEach((li, i) => {
      li.classList.toggle('on', i === cur);
      li.setAttribute('aria-hidden', i === cur ? 'false' : 'true');
    });
    dotEls.forEach((d, i) => {
      d.classList.toggle('on', i === cur);
      d.setAttribute('aria-selected', i === cur ? 'true' : 'false');
    });
  }

  function go(i) {
    cur = (i + groups.length) % groups.length;
    target = cur;
    paint();
    start();
  }
  const next = () => go(cur + 1);
  const prev = () => go(cur - 1);

  document.getElementById('capnext').addEventListener('click', next);
  document.getElementById('capprev').addEventListener('click', prev);
  host.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });

  let sx = null;
  stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const d = e.clientX - sx; sx = null;
    if (Math.abs(d) > 48) (d < 0 ? next : prev)();
  });
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tmx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    tmy = ((e.clientY - r.top) / r.height - 0.5) * 2;
    start();
  });
  stage.addEventListener('pointerleave', () => { tmx = 0; tmy = 0; start(); });

  /* ---------------------------------------------------------------- loop */
  function size() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = r.width < 620 ? 38 : 30;
    camera.updateProjectionMatrix();
  }

  function frame() {
    if (!running) { raf = 0; return; }
    const now = performance.now(), el = (now - t0) / 1000;

    virt += (target - virt) * 0.085;
    mx += (tmx - mx) * 0.07;
    my += (tmy - my) * 0.07;

    let moving = Math.abs(target - virt) > 0.0008 ||
                 Math.abs(tmx - mx) > 0.002 || Math.abs(tmy - my) > 0.002;

    groups.forEach((g, i) => {
      const off = i - virt;
      g.visible = Math.abs(off) < 1.15;
      if (!g.visible) return;
      g.position.x = off * SPREAD;
      g.rotation.y = mx * 0.42 + off * 0.75 + Math.sin(el * 0.42 + i) * 0.035;
      g.rotation.x = -my * 0.22 + Math.sin(el * 0.31 + i) * 0.02;
      g.position.y = (g.userData.baseY ?? (g.userData.baseY = g.position.y))
                     + Math.sin(el * 0.55 + i) * 0.022;
    });

    const act = groups[Math.max(0, Math.min(groups.length - 1, Math.round(virt)))];
    const cam = (act && act.userData.cam) || { dist: 4.4, y: 0.3, look: 0 };
    camera.position.z += (cam.dist - camera.position.z) * 0.07;
    camera.position.y += (cam.y - camera.position.y) * 0.07;
    lookY += (cam.look - lookY) * 0.07;
    camera.lookAt(0, lookY, 0);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
    if (!moving) { /* idle float keeps running while visible */ }
  }

  function start() { if (!running) { running = true; if (!raf) raf = requestAnimationFrame(frame); } }
  function stop() { running = false; }

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 130); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  size();
  paint();
  host.classList.add('is-3d');
  host.tabIndex = 0;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => (es[0].isIntersecting ? start() : stop()),
      { threshold: 0 }).observe(stage);
  }
  start();
}
