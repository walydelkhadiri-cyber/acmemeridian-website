/* =============================================================================
   Capabilities — a lit showroom with one device floating in it.

   Two renderers share one camera. WebGL draws the hardware; CSS3DRenderer draws
   the interface on the screen as real DOM, so the copy stays vector-sharp,
   selectable and indexable instead of being baked into a texture.

   Everything is modelled in centimetres at the real product dimensions, and lit
   by an image-based studio environment — a metal with no environment to reflect
   renders as a flat black shape, which is what "3D that looks fake" usually is.

   Loaded on demand by app.js. The six screens already exist in the HTML as flat
   mockups; this module lifts them into the scene and leaves them alone if the
   GPU is missing.
   ========================================================================== */
import * as THREE from './vendor/three.module.min.js';
import { CSS3DRenderer, CSS3DObject } from './vendor/CSS3DRenderer.js';

const DEG = Math.PI / 180;

/* ============================================================ shape helpers */

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.max(0.001, Math.min(r, w / 2, h / 2));
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/* A body: rounded rectangle in XY, extruded along Z, bevelled on both faces so
   the silhouette catches a highlight the way a machined edge does. */
function slab(w, h, d, r, bev, seg) {
  bev = bev == null ? Math.min(0.12, d * 0.32) : bev;
  const g = new THREE.ExtrudeGeometry(roundedRect(w - bev * 2, h - bev * 2, r - bev), {
    depth: Math.max(0.001, d - bev * 2),
    bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 3,
    curveSegments: seg || 16, steps: 1
  });
  g.translate(0, 0, -(d - bev * 2) / 2);
  g.computeVertexNormals();
  return g;
}

const panel = (w, h, r, seg) => new THREE.ShapeGeometry(roundedRect(w, h, r), seg || 14);

/* ================================================================ materials */

const shell = (c) => new THREE.MeshPhysicalMaterial({
  color: c, metalness: 0.94, roughness: 0.35, envMapIntensity: 1.25
});
const glassMat = () => new THREE.MeshPhysicalMaterial({
  color: 0x050507, metalness: 0.08, roughness: 0.13,
  clearcoat: 1, clearcoatRoughness: 0.09, envMapIntensity: 0.9
});
const inkMat = () => new THREE.MeshBasicMaterial({ color: 0x0a0a0c, toneMapped: false });
const deckMat = () => new THREE.MeshStandardMaterial({
  color: 0x141417, metalness: 0.55, roughness: 0.52, envMapIntensity: 0.8
});
const keyMat = () => new THREE.MeshStandardMaterial({
  color: 0x101013, metalness: 0.05, roughness: 0.66, envMapIntensity: 0.7
});
const padMat = () => new THREE.MeshPhysicalMaterial({
  color: 0x1d1d21, metalness: 0.4, roughness: 0.26,
  clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 1.1
});

/* =============================================================== environment
   A gradient dome plus a handful of emissive cards, prefiltered into a cubemap.
   This is the whole difference between "aluminium" and "grey plastic".        */

function studioEnvironment(renderer) {
  const scene = new THREE.Scene();

  const c = document.createElement('canvas');
  c.width = 8; c.height = 512;
  const g = c.getContext('2d');
  const lg = g.createLinearGradient(0, 0, 0, 512);
  lg.addColorStop(0.00, '#ffffff');
  lg.addColorStop(0.32, '#e9ecf1');
  lg.addColorStop(0.49, '#9ea3ab');
  lg.addColorStop(0.53, '#43454a');
  lg.addColorStop(1.00, '#151618');
  g.fillStyle = lg;
  g.fillRect(0, 0, 8, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(70, 32, 24),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })
  ));

  const card = (level, w, h, pos, rot) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xffffff).multiplyScalar(level), side: THREE.DoubleSide
      })
    );
    m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    scene.add(m);
  };

  card(5.0, 46, 26, [-5, 34, 14], [-70 * DEG, 0, 0]);   // key softbox, high front-left
  card(1.9, 10, 50, [-40, 5, 4], [0, 90 * DEG, 0]);     // left strip
  card(1.5, 8, 46, [40, 3, 0], [0, -90 * DEG, 0]);      // right strip
  card(0.9, 64, 34, [0, 4, 48]);                        // fill from behind the camera
  card(0.02, 40, 40, [16, -2, -34]);                    // negative fill, for edge contrast

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  return env;
}

/* ============================================================ contact shadow
   A soft pool under the device. It is a black quad with an alpha falloff drawn
   over a transparent canvas, so it darkens the CSS panel underneath directly —
   cheaper and softer than a shadow map, and it never shows a map's edge.      */

function shadowPool() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0.00, 'rgba(0,0,0,0.62)');
  rg.addColorStop(0.35, 'rgba(0,0,0,0.34)');
  rg.addColorStop(0.68, 'rgba(0,0,0,0.10)');
  rg.addColorStop(1.00, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: t, transparent: true, depthWrite: false, toneMapped: false
    })
  );
}

/* ================================================================== devices
   Real dimensions, in centimetres. 14" laptop, 6.3" handset, 13" tablet.     */

function buildLaptop() {
  const g = new THREE.Group();
  const W = 31.26, D = 22.12, H = 1.42, R = 1.05;

  const base = new THREE.Mesh(slab(W, D, H, R, 0.17), shell(0x2b2b30));
  base.rotation.x = -Math.PI / 2;
  base.position.y = H / 2;
  g.add(base);

  /* keyboard well */
  const wellW = 26.6, wellD = 10.6, wellZ = -3.0;
  const well = new THREE.Mesh(panel(wellW, wellD, 0.35, 8), deckMat());
  well.rotation.x = -Math.PI / 2;
  well.position.set(0, H + 0.004, wellZ);
  g.add(well);

  /* keycaps — one instanced mesh, laid out row by row from the back */
  const KH = 1.6, KW = 1.6, GAP = 0.15, PAD = 0.5;
  const inner = wellW - PAD * 2;
  const rows = [
    { h: 0.66, w: null, n: 14 },
    { h: KH, w: null, n: 14 },
    { h: KH, w: null, n: 14 },
    { h: KH, w: null, n: 13 },
    { h: KH, w: null, n: 12 },
    { h: KH, w: [1, 1, 1.25, 5.4, 1.25, 1, 1, 1], n: 8 }
  ];
  const caps = [];
  let z = wellZ - wellD / 2 + 0.62;
  rows.forEach((row) => {
    const units = row.w ? row.w.reduce((a, b) => a + b, 0) : row.n;
    const unit = (inner - (row.n - 1) * GAP) / units;
    let x = -inner / 2;
    for (let i = 0; i < row.n; i++) {
      const kw = unit * (row.w ? row.w[i] : 1);
      caps.push({ x: x + kw / 2, z: z + row.h / 2, w: kw, h: row.h });
      x += kw + GAP;
    }
    z += row.h + GAP;
  });

  const keyGeo = slab(KW, KH, 0.15, 0.26, 0.045, 6);
  keyGeo.rotateX(-Math.PI / 2);
  const keys = new THREE.InstancedMesh(keyGeo, keyMat(), caps.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  caps.forEach((k, i) => {
    p.set(k.x, H + 0.078, k.z);
    s.set(k.w / KW, 1, k.h / KH);
    keys.setMatrixAt(i, m4.compose(p, q, s));
  });
  keys.instanceMatrix.needsUpdate = true;
  g.add(keys);

  /* trackpad */
  const tp = new THREE.Mesh(panel(13.0, 8.2, 0.55, 12), padMat());
  tp.rotation.x = -Math.PI / 2;
  tp.position.set(0, H + 0.006, 6.2);
  g.add(tp);

  /* feet */
  const footGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.16, 14);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.85 });
  [[-13, -9.3], [13, -9.3], [-13, 9.3], [13, 9.3]].forEach((f) => {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(f[0], -0.06, f[1]);
    g.add(foot);
  });

  /* hinge */
  const hingeZ = -D / 2 + 0.66;
  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, W - 3.4, 18),
    new THREE.MeshStandardMaterial({ color: 0x0d0d10, metalness: 0.6, roughness: 0.45 })
  );
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, H - 0.2, hingeZ);
  g.add(hinge);

  /* lid, hinged open a little past vertical */
  const pivot = new THREE.Group();
  pivot.position.set(0, H - 0.12, hingeZ);
  pivot.rotation.x = -12.5 * DEG;
  g.add(pivot);

  const LH = 20.9, LT = 0.44;
  const lid = new THREE.Mesh(slab(W, LH, LT, R, 0.13), shell(0x2b2b30));
  lid.position.set(0, LH / 2, 0);
  pivot.add(lid);

  const glass = new THREE.Mesh(panel(W - 0.34, LH - 0.34, R - 0.17), glassMat());
  glass.position.set(0, LH / 2, LT / 2 + 0.012);
  pivot.add(glass);

  const SW = 30.2, SH = SW * 900 / 1440, BOT = 1.275;
  const sy = BOT + SH / 2;

  const dead = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), inkMat());
  dead.position.set(0, sy, LT / 2 + 0.02);
  pivot.add(dead);

  const notch = new THREE.Mesh(panel(2.6, 0.7, 0.2, 6), inkMat());
  notch.position.set(0, LH - 0.4, LT / 2 + 0.024);
  pivot.add(notch);

  const anchor = new THREE.Object3D();
  anchor.position.set(0, sy, LT / 2 + 0.03);
  pivot.add(anchor);

  g.userData.screen = { anchor: anchor, width: SW };
  g.userData.shadow = { w: W * 1.85, d: 34, y: -0.4, o: 1 };
  return g;
}

function buildPhone() {
  const g = new THREE.Group();
  const W = 7.15, H = 14.96, T = 0.83, R = 1.3;

  const body = new THREE.Mesh(slab(W, H, T, R, 0.12, 22), shell(0x32323a));
  g.add(body);

  const glass = new THREE.Mesh(panel(W - 0.03, H - 0.03, R - 0.015, 20), glassMat());
  glass.position.z = T / 2 + 0.008;
  g.add(glass);

  const SW = 6.37, SH = SW * 1690 / 780;
  const dead = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), inkMat());
  dead.position.z = T / 2 + 0.014;
  g.add(dead);

  /* rail buttons — the detail that reads at a glancing angle */
  const btnMat = new THREE.MeshStandardMaterial({
    color: 0x35353a, metalness: 0.9, roughness: 0.34
  });
  const rail = (x, y, len) => {
    const b = new THREE.Mesh(slab(0.16, len, 0.3, 0.07, 0.03, 6), btnMat);
    b.position.set(x, y, 0);
    g.add(b);
  };
  rail(-W / 2 - 0.02, 3.9, 0.9);   // action button
  rail(-W / 2 - 0.02, 2.2, 1.5);   // volume up
  rail(-W / 2 - 0.02, 0.4, 1.5);   // volume down
  rail(W / 2 + 0.02, 2.6, 2.1);    // side button

  const anchor = new THREE.Object3D();
  anchor.position.z = T / 2 + 0.02;
  g.add(anchor);

  g.userData.screen = { anchor: anchor, width: SW };
  g.userData.shadow = { w: W * 4.6, d: 12, y: -H / 2 - 0.6, o: 0.9 };
  return g;
}

function buildTablet() {
  const g = new THREE.Group();
  const W = 28.15, H = 21.51, T = 0.53, R = 1.65;

  const body = new THREE.Mesh(slab(W, H, T, R, 0.09, 20), shell(0x2d2d33));
  g.add(body);

  const glass = new THREE.Mesh(panel(W - 0.03, H - 0.03, R - 0.015, 18), glassMat());
  glass.position.z = T / 2 + 0.007;
  g.add(glass);

  const SW = 26.4, SH = SW * 1200 / 1600;
  const dead = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), inkMat());
  dead.position.z = T / 2 + 0.012;
  g.add(dead);

  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), inkMat());
  cam.position.set(0, H / 2 - 0.44, T / 2 + 0.014);
  g.add(cam);

  const anchor = new THREE.Object3D();
  anchor.position.z = T / 2 + 0.02;
  g.add(anchor);

  g.userData.screen = { anchor: anchor, width: SW };
  g.userData.shadow = { w: W * 1.55, d: 24, y: -H / 2 - 0.5, o: 0.95 };
  return g;
}

const BUILD = { laptop: buildLaptop, phone: buildPhone, tablet: buildTablet };

/* ===================================================================== init */

export function initCapabilities() {
  const capx = document.getElementById('capx');
  const stage = document.getElementById('capstage');
  const list = document.getElementById('caplist');
  const dotsEl = document.getElementById('capdots');
  const prevBtn = document.getElementById('capprev');
  const nextBtn = document.getElementById('capnext');
  if (!capx || !stage || !list) return;

  const items = Array.prototype.slice.call(list.querySelectorAll('.capx-item'));
  if (!items.length) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance'
    });
  } catch (e) {
    return;                                  // no GPU — the flat mockups stay
  }
  if (!renderer.getContext()) return;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setClearAlpha(0);
  renderer.domElement.className = 'capx-gl';
  stage.insertBefore(renderer.domElement, stage.firstChild);

  const cssRenderer = new CSS3DRenderer();
  cssRenderer.domElement.className = 'capx-css';
  stage.insertBefore(cssRenderer.domElement, renderer.domElement.nextSibling);

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 1.0;

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-14, 26, 22);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdce6f5, 0.55);
  fill.position.set(20, 6, 14);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  const camera = new THREE.PerspectiveCamera(24, 1.6, 1, 400);

  const rig = new THREE.Group();
  scene.add(rig);

  const SPREAD = 58;

  /* ------------------------------------------------------- one per capability */
  const slides = items.map((li, i) => {
    const kind = li.getAttribute('data-device') || 'laptop';
    const group = (BUILD[kind] || buildLaptop)();

    /* recentre on the bounding box so framing maths is the same for every kind */
    const box = new THREE.Box3().setFromObject(group);
    const centre = box.getCenter(new THREE.Vector3());
    group.position.set(-centre.x, -centre.y, -centre.z);
    const size = box.getSize(new THREE.Vector3());

    const holder = new THREE.Group();
    holder.position.x = i * SPREAD;
    holder.add(group);
    rig.add(holder);

    const sh = group.userData.shadow;
    const pool = shadowPool();
    pool.rotation.x = -Math.PI / 2;
    pool.scale.set(sh.w, sh.d, 1);
    pool.position.set(0, sh.y - centre.y - 0.6, -centre.z);
    pool.material.opacity = sh.o;
    holder.add(pool);

    /* the interface: real DOM, sized in CSS, scaled into world centimetres */
    const el = li.querySelector('[data-scr]');
    let css = null;
    if (el) {
      const cs = getComputedStyle(el);
      const pxW = parseFloat(cs.getPropertyValue('--sw'));
      if (pxW > 0) {
        css = new CSS3DObject(el);
        css.scale.setScalar(group.userData.screen.width / pxW);
        group.userData.screen.anchor.add(css);
      }
    }

    return { kind: kind, group: group, holder: holder, size: size, css: css, el: el, li: li };
  });

  /* --------------------------------------------------------------- framing
     A closed-form fit is wrong here: the camera looks down, so the body's depth
     projects into the vertical extent and a laptop gets its base cropped. Solve
     it numerically instead — project the eight corners and pull back until the
     widest one sits at the target fraction of the frame. */
  const probe = new THREE.PerspectiveCamera();
  const corner = new THREE.Vector3();

  /* on a phone the stage is the only thing on screen, so fill it almost to the
     edge — that is what buys the on-screen copy enough pixels to be readable. */
  const narrow = () => stage.clientWidth < 720;

  function fitDistance(size, liftFrac) {
    const fill = narrow() ? 0.95 : 0.87;
    probe.fov = camera.fov;
    probe.aspect = camera.aspect;
    probe.near = camera.near;
    probe.far = camera.far;
    const hx = size.x / 2, hy = size.y / 2, hz = size.z / 2;
    let d = Math.max(size.x, size.y, size.z) * 3;
    for (let it = 0; it < 12; it++) {
      probe.position.set(0, size.y * liftFrac, d);
      probe.lookAt(0, 0, 0);
      probe.updateMatrixWorld(true);
      probe.updateProjectionMatrix();
      let m = 0;
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? hx : -hx, i & 2 ? hy : -hy, i & 4 ? hz : -hz);
        corner.project(probe);
        m = Math.max(m, Math.abs(corner.x), Math.abs(corner.y));
      }
      if (!isFinite(m) || m <= 0) break;
      if (Math.abs(m - fill) < 0.006) break;
      d *= m / fill;
    }
    return d;
  }
  /* `lift` is how far the camera rises, as a fraction of the object height —
     the laptop needs a slight plunge or the deck is edge-on and unreadable. */
  const CAM = { laptop: 0.38, phone: 0.08, tablet: 0.14 };
  /* flatter on a phone: a plunging camera spends screen area on the keyboard */
  const CAM_NARROW = { laptop: 0.18, phone: 0.04, tablet: 0.07 };

  let index = 0;
  let virt = 0;
  let framed = false;
  let dist = 60, distTarget = 60;
  let lift = 0, liftTarget = 0;
  let lookY = 0, lookTarget = 0;

  function retarget() {
    const s = slides[index];
    const table = narrow() ? CAM_NARROW : CAM;
    const f = table[s.kind] != null ? table[s.kind] : table.laptop;
    distTarget = fitDistance(s.size, f);
    liftTarget = s.size.y * f;
    lookTarget = 0;
    if (!framed) {                 /* first pass: open already framed, no zoom-in */
      framed = true;
      dist = distTarget; lift = liftTarget; lookY = lookTarget;
    }
      }

  /* ----------------------------------------------------------------- sizing */
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    cssRenderer.setSize(w, h);
    retarget();
  }

  /* ------------------------------------------------------------- navigation */
  const dots = [];
  if (dotsEl) {
    dotsEl.textContent = '';
    slides.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'capx-dot';
      b.setAttribute('role', 'tab');
      const title = s.li.querySelector('h3');
      b.setAttribute('aria-label', title ? title.textContent.trim() : 'Capability ' + (i + 1));
      b.addEventListener('click', () => go(i));
      dotsEl.appendChild(b);
      dots.push(b);
    });
  }

  function sync() {
    dots.forEach((d, i) => {
      d.classList.toggle('on', i === index);
      d.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });
    slides.forEach((s, i) => {
      if (!s.el) return;
      const on = i === index;
      s.el.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (on) s.el.removeAttribute('inert'); else s.el.setAttribute('inert', '');
    });
  }

  function go(i) {
    index = (i % slides.length + slides.length) % slides.length;
    retarget();
    sync();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => go(index - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => go(index + 1));

  /* ------------------------------------------------------------ pointer look */
  let px = 0, py = 0, tx = 0, ty = 0;
  let dragging = false, dragX = 0, dragged = 0;

  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (dragging) dragged = e.clientX - dragX;
  });
  stage.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  stage.addEventListener('pointerdown', (e) => {
    dragging = true; dragX = e.clientX; dragged = 0;
    if (stage.setPointerCapture) { try { stage.setPointerCapture(e.pointerId); } catch (err) {} }
  });
  stage.addEventListener('pointerup', () => {
    if (dragging && Math.abs(dragged) > 48) go(index + (dragged < 0 ? 1 : -1));
    dragging = false;
  });
  stage.addEventListener('pointercancel', () => { dragging = false; });

  /* --------------------------------------------------------------- keyboard */
  let onScreen = false;
  document.addEventListener('keydown', (e) => {
    if (!onScreen) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.key === 'ArrowLeft') { go(index - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { go(index + 1); e.preventDefault(); }
  });

  /* ------------------------------------------------------------------- loop */
  const clock = new THREE.Clock();
  let running = false;
  let t = 0;

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);

    /* time-based smoothing, so a 120 Hz display does not glide twice as fast */
    const dt = Math.min(0.05, clock.getDelta());
    t += dt;
    const k = 1 - Math.exp(-dt * 5.6);
    const kp = 1 - Math.exp(-dt * 3.6);

    virt += (index - virt) * k;
    dist += (distTarget - dist) * k;
    lift += (liftTarget - lift) * k;
    lookY += (lookTarget - lookY) * k;
    px += (tx - px) * kp;
    py += (ty - py) * kp;

    rig.position.x = -virt * SPREAD;
    camera.position.set(0, lift, dist);
    camera.lookAt(0, lookY, 0);

    slides.forEach((s, i) => {
      const off = Math.abs(i - virt);
      const near = off < 1.35;
      if (s.holder.visible !== near) s.holder.visible = near;
      if (s.css && s.css.visible !== near) s.css.visible = near;
      if (!near) return;
      const g = s.group;
      g.position.y = -g.userData.cy + Math.sin(t * 0.62 + i) * 0.5;
      g.rotation.y = px * 0.2 - (i - virt) * 0.34;
      g.rotation.x = py * 0.09 + Math.sin(t * 0.48 + i) * 0.008;
    });

    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
  }

  /* the float offsets the recentring, so remember where each body started */
  slides.forEach((s) => { s.group.userData.cy = -s.group.position.y; });

  /* ------------------------------------------- only run while it is on screen */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      onScreen = es[0].isIntersecting;
      if (onScreen && !running) { running = true; frame(); }
      else if (!onScreen) running = false;
    }, { rootMargin: '160px 0px' });
    io.observe(stage);
  } else {
    onScreen = true; running = true; frame();
  }

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);

  capx.classList.add('is-3d');
  resize();
  sync();
  /* one pass with everything visible so every screen element is moved into the
     CSS layer up front — otherwise four of the six sit in a hidden list until
     they are first navigated to. */
  slides.forEach((s) => { s.holder.visible = true; });
  camera.position.set(0, lift, dist);
  camera.lookAt(0, lookY, 0);
  camera.updateMatrixWorld(true);
  cssRenderer.render(scene, camera);
  if (!running) { running = true; frame(); }
}
