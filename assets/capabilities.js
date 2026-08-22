/* =============================================================================
   Capabilities — a product stage.

   One device floats on the page's own black. WebGL draws the hardware; a second
   renderer projects the interface onto its screen as real DOM, so the type stays
   vector-sharp, selectable and indexable rather than baked into a texture.

   Arrows change the device. The rail underneath changes what that device is
   showing — a laptop carries three subjects instead of three laptops carrying
   one each.

   Everything is modelled in centimetres at the real product dimensions and lit
   by an image-based studio: a metal with no environment to reflect renders as a
   flat dark shape, which is most of what reads as "fake 3D".

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

/* Rounded rectangle extruded along Z, bevelled on both faces so the silhouette
   carries a chamfer highlight — the line that makes machined metal read. */
function slab(w, h, d, r, bev, seg) {
  bev = bev == null ? Math.min(0.1, d * 0.28) : bev;
  const g = new THREE.ExtrudeGeometry(roundedRect(w - bev * 2, h - bev * 2, r - bev), {
    depth: Math.max(0.001, d - bev * 2),
    bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 4,
    curveSegments: seg || 18, steps: 1
  });
  g.translate(0, 0, -(d - bev * 2) / 2);
  g.computeVertexNormals();
  return g;
}

const panel = (w, h, r, seg) => new THREE.ShapeGeometry(roundedRect(w, h, r), seg || 16);

/* ================================================================ materials */

const shell = () => new THREE.MeshPhysicalMaterial({
  color: 0x141417, metalness: 0.97, roughness: 0.25, envMapIntensity: 1.7
});
const band = () => new THREE.MeshPhysicalMaterial({
  color: 0x25252a, metalness: 0.99, roughness: 0.14, envMapIntensity: 2.4
});
const glassMat = () => new THREE.MeshPhysicalMaterial({
  color: 0x040405, metalness: 0.05, roughness: 0.09,
  clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.15
});
const inkMat = () => new THREE.MeshBasicMaterial({ color: 0x08080a, toneMapped: false });
const deckMat = () => new THREE.MeshStandardMaterial({
  color: 0x17171b, metalness: 0.55, roughness: 0.48, envMapIntensity: 1.1
});
const keyMat = () => new THREE.MeshStandardMaterial({
  color: 0x141418, metalness: 0.05, roughness: 0.6, envMapIntensity: 1.0
});
const padMat = () => new THREE.MeshPhysicalMaterial({
  color: 0x191a1d, metalness: 0.4, roughness: 0.22,
  clearcoat: 0.8, clearcoatRoughness: 0.16, envMapIntensity: 1.3
});
const lensMat = () => new THREE.MeshPhysicalMaterial({
  color: 0x08080c, metalness: 0.2, roughness: 0.05,
  clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2
});

/* =============================================================== environment
   A dark gradient dome with a few bright cards, prefiltered into a cubemap.
   The narrow strips are what draw the long specular streaks down the chamfers;
   the dome stays dark so the body itself does not lift off the black page.    */

function studioEnvironment(renderer) {
  const scene = new THREE.Scene();

  const c = document.createElement('canvas');
  c.width = 8; c.height = 512;
  const g = c.getContext('2d');
  const lg = g.createLinearGradient(0, 0, 0, 512);
  lg.addColorStop(0.00, '#c9cfd8');
  lg.addColorStop(0.34, '#767b84');
  lg.addColorStop(0.50, '#2b2d31');
  lg.addColorStop(1.00, '#080809');
  g.fillStyle = lg;
  g.fillRect(0, 0, 8, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(80, 32, 24),
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

  card(7.5, 40, 20, [-6, 36, 16], [-68 * DEG, 0, 0]);   // key softbox, high front-left
  card(9.0, 5, 66, [-31, 8, 10], [0, 90 * DEG, 0]);     // left strip — edge streak
  card(7.0, 5, 60, [31, 6, 4], [0, -90 * DEG, 0]);      // right strip
  card(3.2, 56, 6, [0, -15, 22], [72 * DEG, 0, 0]);     // low kicker, front chamfer
  card(6.5, 6, 40, [-24, 7, 25], [0, 52 * DEG, 0]);      // 45° kickers: the streak
  card(4.5, 6, 36, [25, 5, 24], [0, -52 * DEG, 0]);      //   down a turned rail
  card(1.1, 60, 30, [0, 8, 52]);                        // gentle fill from the camera

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.015).texture;
  pmrem.dispose();
  return env;
}

/* ================================================================== devices
   Real dimensions, in centimetres.                                            */

function buildLaptop() {
  const g = new THREE.Group();
  const W = 31.26, D = 22.12, H = 1.42, R = 1.05;

  const base = new THREE.Mesh(slab(W, D, H, R, 0.16), shell());
  base.rotation.x = -Math.PI / 2;
  base.position.y = H / 2;
  g.add(base);

  /* keyboard well */
  const wellW = 26.6, wellD = 10.6, wellZ = -3.0;
  const well = new THREE.Mesh(panel(wellW, wellD, 0.35, 8), deckMat());
  well.rotation.x = -Math.PI / 2;
  well.position.set(0, H + 0.004, wellZ);
  g.add(well);

  /* speaker grilles either side of the keyboard */
  [-1, 1].forEach((s) => {
    const grille = new THREE.Mesh(panel(1.5, wellD - 0.6, 0.3, 6), deckMat());
    grille.rotation.x = -Math.PI / 2;
    grille.position.set(s * (wellW / 2 + 1.35), H + 0.003, wellZ);
    g.add(grille);
  });

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
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const p = new THREE.Vector3(), sc = new THREE.Vector3();
  caps.forEach((k, i) => {
    p.set(k.x, H + 0.078, k.z);
    sc.set(k.w / KW, 1, k.h / KH);
    keys.setMatrixAt(i, m4.compose(p, q, sc));
  });
  keys.instanceMatrix.needsUpdate = true;
  g.add(keys);

  const tp = new THREE.Mesh(panel(13.0, 8.2, 0.55, 12), padMat());
  tp.rotation.x = -Math.PI / 2;
  tp.position.set(0, H + 0.006, 6.2);
  g.add(tp);

  const footGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.16, 14);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.85 });
  [[-13, -9.3], [13, -9.3], [-13, 9.3], [13, 9.3]].forEach((f) => {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(f[0], -0.06, f[1]);
    g.add(foot);
  });

  const hingeZ = -D / 2 + 0.66;
  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, W - 3.4, 20),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0d, metalness: 0.7, roughness: 0.38 })
  );
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, H - 0.2, hingeZ);
  g.add(hinge);

  /* lid, hinged a little past vertical */
  const pivot = new THREE.Group();
  pivot.position.set(0, H - 0.12, hingeZ);
  pivot.rotation.x = -13 * DEG;
  g.add(pivot);

  const LH = 20.9, LT = 0.44;
  const lid = new THREE.Mesh(slab(W, LH, LT, R, 0.12), shell());
  lid.position.set(0, LH / 2, 0);
  pivot.add(lid);

  const glass = new THREE.Mesh(panel(W - 0.06, LH - 0.06, R - 0.03), glassMat());
  glass.position.set(0, LH / 2, LT / 2 + 0.01);
  pivot.add(glass);

  const SW = 30.2, SH = SW * 900 / 1440, BOT = 1.275;
  const sy = BOT + SH / 2;

  const dead = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), inkMat());
  dead.position.set(0, sy, LT / 2 + 0.018);
  pivot.add(dead);

  const notch = new THREE.Mesh(panel(2.6, 0.7, 0.2, 6), inkMat());
  notch.position.set(0, LH - 0.4, LT / 2 + 0.022);
  pivot.add(notch);

  const anchor = new THREE.Object3D();
  anchor.position.set(0, sy, LT / 2 + 0.028);
  pivot.add(anchor);

  g.userData.screen = { anchor: anchor, width: SW, height: SH };
  return g;
}

function buildPhone() {
  const g = new THREE.Group();
  /* 6.3" handset: 70.6 × 146.6 × 8.3 mm, 2.8 mm bezels */
  const W = 7.06, H = 14.66, T = 0.83, R = 1.24;

  const body = new THREE.Mesh(slab(W, H, T, R, 0.11, 26), shell());
  g.add(body);

  /* the rail reads as a separate finish on a real handset */
  const rail = new THREE.Mesh(slab(W + 0.02, H + 0.02, T * 0.52, R, 0.09, 26), band());
  g.add(rail);

  const glass = new THREE.Mesh(panel(W - 0.03, H - 0.03, R - 0.015, 22), glassMat());
  glass.position.z = T / 2 + 0.007;
  g.add(glass);

  const SW = 6.50, SH = SW * 1690 / 780;
  const dead = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), inkMat());
  dead.position.z = T / 2 + 0.012;
  g.add(dead);

  /* buttons — the detail that reads at a glancing angle */
  const btnMat = new THREE.MeshStandardMaterial({
    color: 0x2c2c31, metalness: 0.95, roughness: 0.22
  });
  const button = (x, y, len) => {
    const b = new THREE.Mesh(slab(0.14, len, 0.3, 0.06, 0.025, 6), btnMat);
    b.position.set(x, y, 0);
    g.add(b);
  };
  button(-W / 2 - 0.015, 4.0, 0.85);   // action button
  button(-W / 2 - 0.015, 2.3, 1.5);    // volume up
  button(-W / 2 - 0.015, 0.5, 1.5);    // volume down
  button(W / 2 + 0.015, 2.7, 2.1);     // side button

  /* camera plateau on the back, so a turn of the device has something to show */
  const plate = new THREE.Mesh(slab(3.7, 3.7, 0.22, 1.0, 0.07, 14), shell());
  plate.position.set(-W / 2 + 2.25, H / 2 - 2.35, -T / 2 - 0.1);
  g.add(plate);
  [[-0.85, 0.85], [0.85, 0.85], [0, -0.9]].forEach((o) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.2, 24), band());
    ring.rotation.x = Math.PI / 2;
    ring.position.set(plate.position.x + o[0], plate.position.y + o[1], -T / 2 - 0.2);
    g.add(ring);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 24), lensMat());
    lens.rotation.x = Math.PI / 2;
    lens.position.copy(ring.position);
    lens.position.z -= 0.02;
    g.add(lens);
  });

  const anchor = new THREE.Object3D();
  anchor.position.z = T / 2 + 0.018;
  g.add(anchor);

  g.userData.screen = { anchor: anchor, width: SW, height: SH };
  return g;
}

function buildTablet() {
  const g = new THREE.Group();
  /* 13" tablet, landscape: 281.6 × 215.5 × 5.1 mm */
  const W = 28.16, H = 21.55, T = 0.51, R = 1.62;

  const body = new THREE.Mesh(slab(W, H, T, R, 0.08, 22), shell());
  g.add(body);

  const glass = new THREE.Mesh(panel(W - 0.03, H - 0.03, R - 0.015, 20), glassMat());
  glass.position.z = T / 2 + 0.006;
  g.add(glass);

  const SW = 26.47, SH = SW * 1200 / 1600;
  const dead = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), inkMat());
  dead.position.z = T / 2 + 0.011;
  g.add(dead);

  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.12, 18), inkMat());
  cam.position.set(0, H / 2 - 0.42, T / 2 + 0.013);
  g.add(cam);

  const camBack = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 24), band());
  camBack.rotation.x = Math.PI / 2;
  camBack.position.set(-W / 2 + 1.9, H / 2 - 1.9, -T / 2 - 0.06);
  g.add(camBack);

  const anchor = new THREE.Object3D();
  anchor.position.z = T / 2 + 0.017;
  g.add(anchor);

  g.userData.screen = { anchor: anchor, width: SW, height: SH };
  return g;
}

const BUILD = { laptop: buildLaptop, phone: buildPhone, tablet: buildTablet };

/* ===================================================================== init */

export function initCapabilities() {
  const capx = document.getElementById('capx');
  const stage = document.getElementById('capstage');
  const list = document.getElementById('caplist');
  const rail = document.getElementById('caprail');
  const dotsEl = document.getElementById('capdots');
  const prevBtn = document.getElementById('capprev');
  const nextBtn = document.getElementById('capnext');
  if (!capx || !stage || !list) return;

  const items = Array.prototype.slice.call(list.querySelectorAll('.capx-item'));
  if (!items.length) return;

  /* consecutive items on the same device become one group */
  const groups = [];
  items.forEach((li) => {
    const kind = li.getAttribute('data-device') || 'laptop';
    let g = groups[groups.length - 1];
    if (!g || g.kind !== kind) { g = { kind: kind, screens: [], active: 0 }; groups.push(g); }
    g.screens.push({
      li: li,
      el: li.querySelector('[data-scr]'),
      tab: li.getAttribute('data-tab') || (li.querySelector('h3') || {}).textContent || ''
    });
  });

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance'
    });
  } catch (e) {
    return;                                  // no GPU — the flat mockups stay
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearAlpha(0);
  renderer.domElement.className = 'capx-gl';
  stage.insertBefore(renderer.domElement, stage.firstChild);

  const cssRenderer = new CSS3DRenderer();
  cssRenderer.domElement.className = 'capx-css';
  stage.insertBefore(cssRenderer.domElement, renderer.domElement.nextSibling);

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);

  /* the environment does nearly all the work on metal; these only lift the
     non-metal parts — keycaps, the deck, the rubber feet */
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(-12, 26, 20);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.1));

  const camera = new THREE.PerspectiveCamera(24, 1.6, 1, 400);
  const rig = new THREE.Group();
  scene.add(rig);

  const SPREAD = 58;

  groups.forEach((grp, i) => {
    const group = (BUILD[grp.kind] || buildLaptop)();

    const box = new THREE.Box3().setFromObject(group);
    const centre = box.getCenter(new THREE.Vector3());
    const scr = group.userData.screen;

    /* Two framings. Wide: the whole body, centred on its bounding box. Narrow:
       centred on the screen and cropped to it — a 14" laptop drawn 300px across
       cannot show its base AND a legible screen, and the screen is the point. */
    group.updateMatrixWorld(true);
    const anchorAt = scr.anchor.getWorldPosition(new THREE.Vector3());
    grp.wide = {
      offset: new THREE.Vector3(-centre.x, -centre.y, -centre.z),
      size: box.getSize(new THREE.Vector3())
    };
    grp.tight = {
      offset: new THREE.Vector3(-anchorAt.x, -anchorAt.y, -centre.z),
      size: new THREE.Vector3(scr.width * 1.06, scr.height * 1.12, 2)
    };
    grp.frame = grp.wide;
    grp.cy = centre.y;
    grp.group = group;

    const holder = new THREE.Group();
    holder.position.x = i * SPREAD;
    holder.add(group);
    rig.add(holder);
    grp.holder = holder;

    const anchor = group.userData.screen.anchor;
    grp.screens.forEach((s) => {
      if (!s.el) return;
      const pxW = parseFloat(getComputedStyle(s.el).getPropertyValue('--sw'));
      if (!(pxW > 0)) return;
      s.css = new CSS3DObject(s.el);
      s.css.scale.setScalar(group.userData.screen.width / pxW);
      anchor.add(s.css);
    });
  });

  /* --------------------------------------------------------------- framing */
  const CAM = { laptop: 0.36, phone: 0.07, tablet: 0.13 };
  const CAM_NARROW = { laptop: 0.17, phone: 0.04, tablet: 0.07 };
  /* Resting three-quarter. A handset seen dead-on is a white rectangle with a
     hairline border; turned, the rail catches the strip light and the object
     acquires an edge. */
  const YAW = { laptop: 0.05, phone: 0.26, tablet: 0.15 };
  const PITCH = { laptop: 0, phone: -0.05, tablet: -0.04 };

  const narrow = () => stage.clientWidth < 720;
  const probe = new THREE.PerspectiveCamera();
  const corner = new THREE.Vector3();

  /* A closed-form fit is wrong here: the camera looks down, so the body's depth
     projects into the vertical extent and a laptop gets its base cropped. Solve
     it numerically — project the eight corners and pull back until the widest
     one sits at the target fill. */
  function fitDistance(size, liftFrac, kind) {
    const n = narrow();
    const fill = n ? 0.99 : 0.88;
    probe.fov = camera.fov; probe.aspect = camera.aspect;
    probe.near = camera.near; probe.far = camera.far;
    /* the device turns with the scroll and the pointer, which widens what the
       frame has to hold — fit the swept envelope, not the resting box */
    const yaw = Math.abs(YAW[kind] || 0) + 0.13 + (n ? 0 : 0.16);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const hx = (size.x * cy + size.z * sy) / 2;
    const hy = size.y / 2;
    const hz = (size.z * cy + size.x * sy) / 2;
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

  /* how far the camera rises, as a fraction of the object height — the laptop
     needs a slight plunge or the deck is edge-on and unreadable */

  let dev = 0, virt = 0, framed = false;
  let dist = 60, distTarget = 60;
  let lift = 0, liftTarget = 0;

  function retarget() {
    const n = narrow();
    groups.forEach((grp) => {
      const m = n ? grp.tight : grp.wide;
      grp.group.position.copy(m.offset);
      grp.cy = -m.offset.y;
      grp.frame = m;
    });
    const g = groups[dev];
    const table = n ? CAM_NARROW : CAM;
    const f = table[g.kind] != null ? table[g.kind] : table.laptop;
    distTarget = fitDistance(g.frame.size, f, g.kind);
    liftTarget = g.frame.size.y * f;
    if (!framed) { framed = true; dist = distTarget; lift = liftTarget; }
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    cssRenderer.setSize(w, h);
    retarget();
  }

  /* ------------------------------------------------------------ the two axes */
  function paintRail() {
    if (!rail) return;
    rail.textContent = '';
    const g = groups[dev];
    if (g.screens.length < 2) {
      const label = document.createElement('span');
      label.className = 'solo';
      label.textContent = g.screens[0].tab;
      rail.appendChild(label);
      return;
    }
    g.screens.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'capx-tab';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === g.active ? 'true' : 'false');
      b.innerHTML = s.tab;
      b.addEventListener('click', () => { g.active = i; paintRail(); paintScreens(); });
      rail.appendChild(b);
    });
  }

  function paintScreens() {
    groups.forEach((g, gi) => {
      g.screens.forEach((s, si) => {
        if (!s.el) return;
        const inGroup = gi === dev;
        const on = inGroup && si === g.active;
        if (s.css) s.css.visible = inGroup || Math.abs(gi - virt) < 1.35;
        s.el.classList.toggle('on', on);
        s.el.setAttribute('aria-hidden', on ? 'false' : 'true');
        if (on) s.el.removeAttribute('inert'); else s.el.setAttribute('inert', '');
      });
    });
  }

  const dots = [];
  if (dotsEl) {
    dotsEl.textContent = '';
    groups.forEach((g, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'capx-dot';
      b.setAttribute('aria-label', 'Show the ' + g.kind);
      b.addEventListener('click', () => goDevice(i));
      dotsEl.appendChild(b);
      dots.push(b);
    });
  }

  function goDevice(i) {
    dev = (i % groups.length + groups.length) % groups.length;
    retarget();
    dots.forEach((d, k) => d.classList.toggle('on', k === dev));
    paintRail();
    paintScreens();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goDevice(dev - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goDevice(dev + 1));

  /* -------------------------------------------------------------- pointer
     Capture only once a drag is real. Capturing on pointerdown retargets the
     pointerup to the stage, and the arrows never see their click. */
  let px = 0, py = 0, tx = 0, ty = 0;
  let dragging = false, captured = false, dragX = 0, dragged = 0;

  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!dragging) return;
    dragged = e.clientX - dragX;
    if (!captured && Math.abs(dragged) > 10) {
      captured = true;
      if (stage.setPointerCapture) { try { stage.setPointerCapture(e.pointerId); } catch (err) {} }
    }
  });
  stage.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest && e.target.closest('button,a')) return;
    dragging = true; captured = false; dragX = e.clientX; dragged = 0;
  });
  stage.addEventListener('pointerup', () => {
    if (captured && Math.abs(dragged) > 44) goDevice(dev + (dragged < 0 ? 1 : -1));
    dragging = false; captured = false;
  });
  stage.addEventListener('pointercancel', () => { dragging = false; captured = false; });

  /* -------------------------------------------------------------- keyboard */
  let onScreen = false;
  document.addEventListener('keydown', (e) => {
    if (!onScreen) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (t && t.classList && t.classList.contains('capx-tab')) return;
    if (e.key === 'ArrowLeft') { goDevice(dev - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { goDevice(dev + 1); e.preventDefault(); }
  });

  /* ------------------------------------------------- scroll drives the turn */
  let turn = 0;
  function readScroll() {
    const r = stage.getBoundingClientRect();
    const p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
    turn = Math.max(0, Math.min(1, p)) * 2 - 1;         /* -1 … 1 */
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  /* ------------------------------------------------------------------- loop */
  const clock = new THREE.Clock();
  let running = false, t = 0;

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);

    /* time-based, so a 120 Hz display does not glide twice as fast */
    const dt = Math.min(0.05, clock.getDelta());
    t += dt;
    const k = 1 - Math.exp(-dt * 5.6);
    const kp = 1 - Math.exp(-dt * 3.6);

    virt += (dev - virt) * k;
    dist += (distTarget - dist) * k;
    lift += (liftTarget - lift) * k;
    px += (tx - px) * kp;
    py += (ty - py) * kp;

    rig.position.x = -virt * SPREAD;
    camera.position.set(0, lift, dist);
    camera.lookAt(0, 0, 0);

    groups.forEach((grp, i) => {
      const off = Math.abs(i - virt);
      const near = off < 1.35;
      if (grp.holder.visible !== near) grp.holder.visible = near;
      if (!near) return;
      const g = grp.group;
      g.position.y = -grp.cy + Math.sin(t * 0.55 + i) * 0.42;
      const ry = YAW[grp.kind] != null ? YAW[grp.kind] : 0;
      const rx = PITCH[grp.kind] != null ? PITCH[grp.kind] : 0;
      g.rotation.y = ry + px * 0.16 + turn * 0.13 - (i - virt) * 0.3;
      g.rotation.x = rx + py * 0.07 - turn * 0.035 + Math.sin(t * 0.42 + i) * 0.007;
    });

    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      onScreen = es[0].isIntersecting;
      if (onScreen && !running) { running = true; frame(); }
      else if (!onScreen) running = false;
    }, { rootMargin: '160px 0px' });
    io.observe(stage);
  } else {
    onScreen = true; running = true;
  }

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);

  capx.classList.add('is-3d');
  resize();
  goDevice(0);

  /* one pass with everything visible so every screen element is moved into the
     CSS layer up front, instead of sitting in a hidden list until navigated to */
  groups.forEach((g) => { g.holder.visible = true; });
  camera.position.set(0, lift, dist);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  cssRenderer.render(scene, camera);
  paintScreens();

  if (!running) { running = true; frame(); }
}
