/* =============================================================================
   ACME MERIDIAN — "The Meridian"
   A single scrolled camera move down an architectural void. Everything the site
   says is placed along that line: the monogram, the meridian itself, the three
   devices we build on, and the marked line of how we work.

   Rendering notes
   - Nothing is tone-mapped by three. The scene renders linear into a float
     target and a hand-written chain does bright-pass, a blur pyramid, and one
     composite (chromatic aberration, bloom, ACES, split tone, vignette, grain).
     That grade is the whole reason the void reads as film rather than as WebGL.
   - Screens are canvas textures inside the WebGL pass, not CSS3D overlays, so
     they take the same grade as the concrete around them.
   ========================================================================== */
import * as THREE from './vendor/three.module.min.js';
import { SCREENS } from './screens.js';
import { trackNavHeight } from './chrome.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
/* frame-rate independent easing — the only correct way to lerp against dt */
const damp = (cur, tgt, rate, dt) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));

/* ------------------------------------------------------------------ noise
   Deterministic value noise → fbm → canvas. Used for the concrete: a height
   field, its derived normal map, and a roughness variation off the same field
   so the bumps and the sheen agree with each other.                          */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed) {
  const rnd = mulberry32(seed);
  const P = new Float32Array(256 * 256);
  for (let i = 0; i < P.length; i++) P[i] = rnd();
  const at = (x, y) => P[((y & 255) << 8) + (x & 255)];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return function noise2D(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = fade(xf), v = fade(yf);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };
}

function fbm(noise, x, y, oct, lac, gain) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    sum += noise(x * f, y * f) * amp; norm += amp;
    f *= lac; amp *= gain;
  }
  return sum / norm;
}

/* Height field, returned as both an ImageData-backed canvas and the raw floats
   so the normal map can be differentiated from the same numbers.             */
function fbmField(size, seed, scale, oct) {
  const noise = makeNoise(seed);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      h[y * size + x] = fbm(noise, (x / size) * scale, (y / size) * scale, oct, 2.03, 0.52);
    }
  }
  return h;
}

function fieldToCanvas(h, size, lo, hi) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const img = c.createImageData(size, size);
  for (let i = 0; i < h.length; i++) {
    const v = Math.round(255 * (lo + (hi - lo) * h[i]));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return cv;
}

/* Sobel-free central difference. strength is in height units per texel.      */
function normalFromHeight(h, size, strength) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const img = c.createImageData(size, size);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx, ny = -dy, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

function tex(canvas, repeat, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* A vertical gradient used for the light shafts: bright at the top, gone at
   the floor, with soft edges so the plane never shows its own silhouette.    */
function shaftCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 256;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 256);
  /* feather the vertical edges */
  const e = c.createLinearGradient(0, 0, 64, 0);
  e.addColorStop(0, 'rgba(0,0,0,1)');
  e.addColorStop(0.25, 'rgba(0,0,0,0)');
  e.addColorStop(0.75, 'rgba(0,0,0,0)');
  e.addColorStop(1, 'rgba(0,0,0,1)');
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = e; c.fillRect(0, 0, 64, 256);
  return cv;
}

function dotCanvas() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return cv;
}

/* -------------------------------------------------------------- monogram
   The AM mark, drawn once at high resolution and flown as a luminous sign.
   Same path data as the business card, so print and this agree.              */
function monogramCanvas(size) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, size, size);
  const s = size / 140;
  c.translate(size * 0.5 - 70 * s, size * 0.5 - 50 * s);
  c.scale(s, s);
  c.strokeStyle = '#fff';
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.lineWidth = 9;
  c.beginPath(); c.moveTo(18, 88); c.lineTo(18, 12); c.lineTo(70, 48); c.lineTo(122, 12); c.lineTo(122, 88); c.stroke();
  c.beginPath(); c.moveTo(42, 88); c.lineTo(70, 48); c.lineTo(98, 88); c.stroke();
  c.lineWidth = 7; c.lineJoin = 'miter';
  c.beginPath(); c.moveTo(53, 73); c.lineTo(87, 73); c.stroke();
  return cv;
}

/* ------------------------------------------------------------ mark labels
   Each mark on the method rail carries its own number and name, so the line
   explains itself instead of leaving five bare numerals floating.            */
function markCanvas(num, name) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 420;
  const c = cv.getContext('2d');
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';

  /* Grey levels, not opacity: this canvas is read as an alphaMap, so the
     value of a pixel IS how brightly it burns. The number sits back, the
     name carries. */
  c.fillStyle = '#6b6b6b';
  c.font = '300 78px "Inter V", Helvetica, Arial, sans-serif';
  c.letterSpacing = '20px';
  c.fillText(num, 522, 108);

  c.fillStyle = '#ffffff';
  c.font = '300 150px "Cormorant V", "Cormorant Garamond", Georgia, serif';
  c.letterSpacing = '2px';
  c.fillText(name, 512, 290);

  return cv;
}

/* ------------------------------------------------------------- geometry */

function roundedShape(wd, ht, r) {
  const s = new THREE.Shape();
  const x = -wd / 2, y = -ht / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + wd - r, y); s.absarc(x + wd - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + wd, y + ht - r); s.absarc(x + wd - r, y + ht - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + ht); s.absarc(x + r, y + ht - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/* A slab with a real bevel: the chamfer is what catches a highlight and is the
   difference between a machined body and a box.                              */
function slab(wd, ht, th, r) {
  const bev = Math.min(th * 0.24, r * 0.45);
  const g = new THREE.ExtrudeGeometry(roundedShape(wd, ht, r), {
    depth: Math.max(th - bev * 2, 0.001), bevelEnabled: true, bevelThickness: bev,
    bevelSize: bev, bevelSegments: 3, curveSegments: 16,
  });
  g.center();
  return g;
}

/* ============================================================== renderer */

const canvas = document.getElementById('gl');

/* The stylesheet ships a plain stacked document; `.gl` is what switches on the
   pinned, scroll-driven version. It goes on immediately so there is no flash
   of the fallback, and comes back off if anything throws before the first
   frame is on screen — an old device, a blocked context, a shader that will
   not compile. A visitor who cannot run this gets a page they can read, not a
   black screen. */
let painted = false;
addEventListener('error', () => {
  if (!painted) document.documentElement.classList.remove('gl');
});
document.documentElement.classList.add('gl');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NoToneMapping;          /* the composite does it */
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050506);
scene.fog = new THREE.FogExp2(0x050506, 0.0125);

const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 900);

/* ================================================================ materials */

const FIELD = 512;
const hField = fbmField(FIELD, 20260823, 7.2, 6);
const concreteMap = tex(fieldToCanvas(hField, FIELD, 0.50, 0.58), [5, 5], true);
const concreteNrm = tex(normalFromHeight(hField, FIELD, 26), [5, 5], false);
const concreteRgh = tex(fieldToCanvas(hField, FIELD, 0.68, 0.96), [5, 5], false);

function concrete(colour, repeat, rough) {
  const map = concreteMap.clone(); map.needsUpdate = true; map.repeat.set(repeat[0], repeat[1]);
  const nrm = concreteNrm.clone(); nrm.needsUpdate = true; nrm.repeat.set(repeat[0], repeat[1]);
  const rgh = concreteRgh.clone(); rgh.needsUpdate = true; rgh.repeat.set(repeat[0], repeat[1]);
  return new THREE.MeshStandardMaterial({
    color: colour, map, normalMap: nrm, roughnessMap: rgh,
    normalScale: new THREE.Vector2(0.24, 0.24),
    roughness: rough === undefined ? 0.92 : rough, metalness: 0.04,
  });
}

const shellMat = () => new THREE.MeshPhysicalMaterial({
  color: 0x17171b, metalness: 0.96, roughness: 0.26, envMapIntensity: 1.5,
  clearcoat: 0.4, clearcoatRoughness: 0.3,
});
const glassMat = () => new THREE.MeshPhysicalMaterial({
  color: 0x08080a, metalness: 0.5, roughness: 0.12, envMapIntensity: 1.2,
});

/* ============================================================== the corridor
   Two ranks of monoliths marching to the vanishing point, a floor that takes
   the shafts, and nothing overhead — the ceiling is the void itself.        */

const CORRIDOR_END = -420;

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 520, 1, 1),
  concrete(0x141418, [16, 52], 0.84)
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, -180);
scene.add(floor);

const shaftTex = tex(shaftCanvas(), null, false);
const shaftMat = new THREE.MeshBasicMaterial({
  map: shaftTex, transparent: true, blending: THREE.AdditiveBlending,
  depthWrite: false, side: THREE.DoubleSide, opacity: 0.5,
});

const monoGeo = new THREE.BoxGeometry(1, 1, 1);
const monoMat = concrete(0x18181d, [4, 12], 0.88);

for (let z = 26, i = 0; z > CORRIDOR_END; z -= 26, i++) {
  const h = 26 + ((i * 7919) % 11);
  const w = 5.5 + ((i * 104729) % 5) * 0.4;
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(monoGeo, monoMat);
    m.scale.set(w, h, 4.2);
    m.position.set(sx * (15 + ((i * 31) % 3)), h / 2 - 0.4, z + (i % 2) * 3);
    scene.add(m);
  }
  /* a shaft in every other gap, so the rhythm is light-dark-light            */
  if (i % 2 === 0) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(7, 30), shaftMat);
    s.position.set((i % 4 === 0 ? -1 : 1) * 11.5, 15, z - 13);
    s.rotation.y = (i % 4 === 0 ? 1 : -1) * 22 * DEG;
    scene.add(s);
  }
}

/* dust — the only thing in the frame that tells you the air has depth        */
{
  const N = 1400;
  const pos = new Float32Array(N * 3);
  const rnd = mulberry32(77);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rnd() - 0.5) * 44;
    pos[i * 3 + 1] = rnd() * 22;
    pos[i * 3 + 2] = 30 - rnd() * 460;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(g, new THREE.PointsMaterial({
    size: 0.085, map: tex(dotCanvas(), null, false), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4,
    sizeAttenuation: true, color: 0xffffff,
  }));
  scene.add(dust);
  var DUST = dust;
}

/* ================================================================= lighting
   An environment is what makes the aluminium read as metal; the directionals
   only draw the edges. Built once from a procedural studio, then discarded.  */
{
  const studio = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(60, 24, 12),
    new THREE.MeshBasicMaterial({ color: 0x0a0a0d, side: THREE.BackSide })
  );
  studio.add(dome);
  const card = (i, w, h, p, r) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    m.material.color.multiplyScalar(i);
    m.position.set(p[0], p[1], p[2]);
    if (r) m.rotation.set(r[0], r[1], r[2]);
    studio.add(m);
  };
  card(6.0, 40, 20, [-6, 34, 14], [-68 * DEG, 0, 0]);   /* key softbox        */
  card(7.5, 5, 60, [-30, 8, 8], [0, 90 * DEG, 0]);      /* left strip         */
  card(6.0, 5, 54, [30, 6, 4], [0, -90 * DEG, 0]);      /* right strip        */
  card(5.5, 6, 36, [-23, 7, 23], [0, 52 * DEG, 0]);     /* 45° kickers — the  */
  card(4.0, 6, 32, [24, 5, 22], [0, -52 * DEG, 0]);     /* streaks on an edge */
  card(0.9, 60, 30, [0, 8, 50]);                        /* fill               */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio, 0.02).texture;
  pmrem.dispose();
}

scene.add(new THREE.AmbientLight(0xffffff, 0.16));
const key = new THREE.DirectionalLight(0xffffff, 1.9);
key.position.set(-6, 18, 8);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 0.7);
rim.position.set(7, 5, -12);
scene.add(rim);
/* travels with the camera so the concrete never goes fully dead              */
const lantern = new THREE.PointLight(0xffffff, 44, 54, 2);
scene.add(lantern);

/* ================================================================ stations
   Everything the site says, placed on the line in the order it is read.     */

const STATION = { mono: -20, ring: -70, laptop: -120, phone: -168, tablet: -216, method: -282 };

/* --- the mark ------------------------------------------------------------ */
const monoSign = new THREE.Mesh(
  new THREE.PlaneGeometry(7, 7),
  new THREE.MeshBasicMaterial({
    color: 0xffffff, alphaMap: tex(monogramCanvas(1024), null, false),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
monoSign.position.set(6.4, 10.6, STATION.mono);
scene.add(monoSign);

/* --- the meridian: one fixed line the camera passes straight through ------ */
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(9.5, 0.05, 8, 220),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
ring.position.set(0, 7, STATION.ring);
scene.add(ring);
const ringGlow = new THREE.Mesh(
  new THREE.TorusGeometry(9.5, 0.32, 8, 160),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false })
);
ringGlow.position.copy(ring.position);
scene.add(ringGlow);

/* --- devices -------------------------------------------------------------
   Real proportions in centimetres, then scaled up to monument size: the point
   of the chapter is the object, not a desk.                                 */

const plinthMat = concrete(0x1a1a1f, [4, 4], 0.86);
function plinth(x, z, w, d, h) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plinthMat);
  m.position.set(x, h / 2, z);
  scene.add(m);
  return m;
}

const devices = {};
const screenTex = {};

/* Read once. Probing for each file directly would work too, but every miss
   prints a 404 in the console, and a page that logs a dozen errors on load
   looks broken even when it isn't. */
const overrides = fetch('assets/screens/manifest.json')
  .then((r) => (r.ok ? r.json() : {}))
  .catch(() => ({}));

/* Painted first so the device is never blank, then upgraded twice: once when
   the webfonts resolve (canvas cannot use a face the document has not loaded
   yet, and a screen in fallback Helvetica is the giveaway), and again if a
   hand-made image exists at assets/screens/<key>.(png|jpg). Drop a file there
   and it wins — nothing else needs changing. */
function screenTexture(key, W, H) {
  if (screenTex[key]) return screenTex[key];

  const t = new THREE.CanvasTexture(SCREENS[key](W, H));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  screenTex[key] = t;

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      t.image = SCREENS[key](W, H);
      t.needsUpdate = true;
    });
  }

  overrides.then((map) => {
    if (!map[key]) return;
    new THREE.TextureLoader().load(`assets/screens/${map[key]}`, (img) => {
      img.colorSpace = THREE.SRGBColorSpace;
      img.anisotropy = 8;
      screenTex[key] = img;
      for (const d of Object.values(devices)) {
        if (d.screen.material.map === t) {
          d.screen.material.map = img;
          d.screen.material.needsUpdate = true;
        }
      }
    });
  });

  return t;
}

/* laptop: base, hinged lid, and a screen plane a hair proud of the glass     */
{
  const g = new THREE.Group();
  const S = 2.2;
  const base = new THREE.Mesh(slab(3.126, 2.212, 0.142, 0.105), shellMat());
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.071;
  g.add(base);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.95), new THREE.MeshPhysicalMaterial({
    color: 0x17171b, metalness: 0.9, roughness: 0.55, envMapIntensity: 1.0,
  }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.143, 0.42);
  g.add(deck);

  const lid = new THREE.Group();
  const lidBody = new THREE.Mesh(slab(3.126, 2.09, 0.044, 0.105), shellMat());
  lidBody.position.y = 1.045;
  lid.add(lidBody);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.02, 1.985), glassMat());
  glass.position.set(0, 1.045, 0.024);
  lid.add(glass);
  const scr = new THREE.Mesh(
    new THREE.PlaneGeometry(2.92, 1.885),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.32, 1.32, 1.32), map: screenTexture('web', 2048, 1280), toneMapped: false })
  );
  scr.position.set(0, 1.045, 0.026);
  lid.add(scr);
  lid.position.z = -1.05;
  lid.rotation.x = -13 * DEG;
  g.add(lid);

  g.scale.setScalar(S);
  g.position.set(0, 2.6, STATION.laptop);
  g.rotation.y = 14 * DEG;
  scene.add(g);
  plinth(0, STATION.laptop, 9.2, 7, 2.6);
  devices.laptop = { group: g, screen: scr, size: [2048, 1280] };
}

/* phone */
{
  const g = new THREE.Group();
  const body = new THREE.Mesh(slab(0.706, 1.466, 0.083, 0.124), shellMat());
  g.add(body);
  const scr = new THREE.Mesh(
    new THREE.PlaneGeometry(0.65, 1.41),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.32, 1.32, 1.32), map: screenTexture('app', 780, 1690), toneMapped: false })
  );
  scr.position.z = 0.043;
  g.add(scr);
  g.scale.setScalar(4.2);
  g.position.set(0, 4.98, STATION.phone);
  g.rotation.set(-4 * DEG, 22 * DEG, 0);
  scene.add(g);
  plinth(0, STATION.phone, 4.6, 4.6, 1.9);
  devices.phone = { group: g, screen: scr, size: [780, 1690] };
}

/* tablet */
{
  const g = new THREE.Group();
  const body = new THREE.Mesh(slab(2.816, 2.155, 0.051, 0.162), shellMat());
  g.add(body);
  const scr = new THREE.Mesh(
    new THREE.PlaneGeometry(2.647, 1.99),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.32, 1.32, 1.32), map: screenTexture('ai', 1600, 1200), toneMapped: false })
  );
  scr.position.z = 0.027;
  g.add(scr);
  g.scale.setScalar(2.4);
  g.position.set(0, 4.99, STATION.tablet);
  g.rotation.set(-3 * DEG, -16 * DEG, 0);
  scene.add(g);
  plinth(0, STATION.tablet, 8.2, 5.6, 2.4);
  devices.tablet = { group: g, screen: scr, size: [1600, 1200] };
}

/* Each device gets its own key and rim, aimed like a product shot. The room
   lights draw the architecture; these are what make the object the subject.  */
function stationLights(target, height) {
  const k = new THREE.SpotLight(0xffffff, 320, 34, 0.62, 0.75, 2);
  k.position.set(target.x - 5.5, height + 8.5, target.z + 7.5);
  k.target.position.copy(target);
  scene.add(k, k.target);

  const r = new THREE.SpotLight(0xffffff, 190, 30, 0.7, 0.85, 2);
  r.position.set(target.x + 6.5, height + 3.5, target.z - 6.5);
  r.target.position.copy(target);
  scene.add(r, r.target);
}
stationLights(new THREE.Vector3(0, 4.75, STATION.laptop), 4.75);
stationLights(new THREE.Vector3(0, 4.98, STATION.phone), 4.98);
stationLights(new THREE.Vector3(0, 4.99, STATION.tablet), 4.99);

/* --- the method: one line, marked five times ------------------------------
   The site turns on "a meridian is a fixed line", so the process is not five
   objects — it is one rail with five marks on it, each standing taller than
   the last. It runs ACROSS the corridor rather than down it, so the camera
   meets it head-on and the five marks land above the five columns of copy.
   Everything luminous is a thin bright bar: the bloom in the composite does
   the glow, so there is no halo geometry to build.                          */
{
  const RAIL_Y = 5.6;
  const Z = STATION.method;
  const light = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const rail = new THREE.Mesh(new THREE.BoxGeometry(27, 0.05, 0.05), light);
  rail.position.set(0, RAIL_Y, Z);
  scene.add(rail);

  const STEPS = ['Discover', 'Architect', 'Build', 'Ship', 'Scale'];
  const labelGeo = new THREE.PlaneGeometry(4.4, 1.8);
  const labels = [];
  for (let i = 0; i < 5; i++) {
    const x = -10 + i * 5;
    const h = 1.9 + i * 0.78;                     /* each step stands taller */

    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.05), light);
    tick.position.set(x, RAIL_Y + h / 2, Z);
    scene.add(tick);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.05), light);
    cap.position.set(x, RAIL_Y + h, Z);
    scene.add(cap);

    /* a leader dropping below the rail, pointing the mark at its column */
    const lead = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 3.4, 0.035),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16,
        blending: THREE.AdditiveBlending, depthWrite: false })
    );
    lead.position.set(x, RAIL_Y - 1.7, Z);
    scene.add(lead);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, alphaMap: tex(markCanvas('0' + (i + 1), STEPS[i]), null, false),
      transparent: true, opacity: 0.72 + i * 0.055,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const n = new THREE.Mesh(labelGeo, mat);
    n.position.set(x, RAIL_Y + h + 1.15, Z);
    scene.add(n);
    labels.push({ mat, num: '0' + (i + 1), name: STEPS[i] });
  }

  /* the display serif only exists once the document has fetched it */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      for (const l of labels) {
        l.mat.alphaMap.image = markCanvas(l.num, l.name);
        l.mat.alphaMap.needsUpdate = true;
      }
    });
  }

  /* one soft source over the run, or the concrete either side reads as void */
  const runLight = new THREE.PointLight(0xffffff, 340, 80, 2);
  runLight.position.set(0, 16, Z + 8);
  scene.add(runLight);

  /* two shafts standing off the line, to give the beat some architecture */
  for (const sx of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(7, 30), shaftMat.clone());
    sh.material.opacity = 0.38;
    sh.position.set(sx * 12, 15, Z - 9);
    sh.rotation.y = -sx * 20 * DEG;
    scene.add(sh);
  }
}

/* the mark again at the far end: the line closes where it opened */
{
  const end = monoSign.clone();
  end.material = monoSign.material.clone();
  end.material.opacity = 0.85;
  /* Kept wholly below the look axis. The copy block is a roughly fixed height
     in pixels, so on a short viewport it eats further down the frame — the
     mark has to clear the bottom half outright, not merely sit low in it. */
  end.position.set(0, 5.2, -412);
  end.scale.setScalar(0.85);
  scene.add(end);
}

/* ==================================================================== rig
   Two splines: where the camera is, and what it is looking at. Keeping the
   look target on its own curve is what lets the move sweep past an object
   and hold it in frame instead of whipping.                                 */

const camCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 4.6, 22),
  new THREE.Vector3(1.4, 5.2, -2),
  new THREE.Vector3(-1.6, 4.8, -44),
  new THREE.Vector3(2.3, 5.1, -109.5),
  new THREE.Vector3(-1.4, 5.0, -156),
  new THREE.Vector3(2.0, 4.95, -204.5),
  new THREE.Vector3(0, 6.2, -259),
  new THREE.Vector3(0, 6.0, -302),
  new THREE.Vector3(0, 5.2, -338),
  new THREE.Vector3(0, 5.8, -368),
], false, 'catmullrom', 0.4);

const lookCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(1.6, 7.6, -14),
  new THREE.Vector3(2.2, 9.4, STATION.mono),
  new THREE.Vector3(0, 7.0, STATION.ring),
  new THREE.Vector3(-1.0, 5.3, STATION.laptop),
  new THREE.Vector3(-1.0, 5.05, STATION.phone),
  new THREE.Vector3(-1.0, 5.05, STATION.tablet),
  new THREE.Vector3(0, 7.6, STATION.method),
  new THREE.Vector3(0, 6.2, -336),
  new THREE.Vector3(0, 6.6, -382),
  new THREE.Vector3(0, 8.4, -412),
], false, 'catmullrom', 0.4);

const RIG = { prog: 0, smooth: 0, sway: new THREE.Vector2() };
const _p = new THREE.Vector3(), _l = new THREE.Vector3();

/* ================================================================== post
   Bright pass → four-level blur pyramid → one composite. Written by hand
   rather than pulled in as a pass chain: it is a handful of shaders and it
   keeps the whole grade in one place where it can be tuned as a look.       */

const quadGeo = new THREE.PlaneGeometry(2, 2);
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quadScene = new THREE.Scene();
const quad = new THREE.Mesh(quadGeo, null);
quadScene.add(quad);

function draw(material, target) {
  quad.material = material;
  renderer.setRenderTarget(target || null);
  renderer.render(quadScene, quadCam);
  renderer.setRenderTarget(null);
}

const VERT = `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
const rtScene = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: true, stencilBuffer: false });

const LEVELS = 4;
const pyramid = [];
for (let i = 0; i < LEVELS; i++) {
  pyramid.push({
    a: new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: false }),
    b: new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: false }),
    w: 1, h: 1,
  });
}

const brightMat = new THREE.ShaderMaterial({
  uniforms: { tD: { value: null }, uThr: { value: 0.78 }, uKnee: { value: 0.4 } },
  vertexShader: VERT,
  fragmentShader: `
    uniform sampler2D tD; uniform float uThr, uKnee; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tD, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float k = smoothstep(uThr, uThr + uKnee, l);
      gl_FragColor = vec4(c * k, 1.0);
    }`,
});

const blurMat = new THREE.ShaderMaterial({
  uniforms: { tD: { value: null }, uDir: { value: new THREE.Vector2() } },
  vertexShader: VERT,
  fragmentShader: `
    uniform sampler2D tD; uniform vec2 uDir; varying vec2 vUv;
    void main(){
      vec3 s = texture2D(tD, vUv).rgb * 0.2270270270;
      s += texture2D(tD, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
      s += texture2D(tD, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
      s += texture2D(tD, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
      s += texture2D(tD, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
      gl_FragColor = vec4(s, 1.0);
    }`,
});

const copyMat = new THREE.ShaderMaterial({
  uniforms: { tD: { value: null } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tD; varying vec2 vUv;
    void main(){ gl_FragColor = vec4(texture2D(tD, vUv).rgb, 1.0); }`,
});

const compMat = new THREE.ShaderMaterial({
  uniforms: {
    tD: { value: null }, tB0: { value: null }, tB1: { value: null },
    tB2: { value: null }, tB3: { value: null },
    uBloom: { value: 0.44 }, uExp: { value: 1.3 }, uCA: { value: 0.0009 },
    uSat: { value: 0.86 }, uVig: { value: 0.68 }, uGrain: { value: 0.03 },
    uContrast: { value: 1.09 }, uTime: { value: 0 },
  },
  vertexShader: VERT,
  fragmentShader: `
    uniform sampler2D tD, tB0, tB1, tB2, tB3;
    uniform float uBloom, uExp, uCA, uSat, uVig, uGrain, uContrast, uTime;
    varying vec2 vUv;

    vec3 aces(vec3 x){
      const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main(){
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);

      /* chromatic aberration grows with radius — lens, not filter */
      float k = uCA * r2 * 4.0;
      vec3 col;
      col.r = texture2D(tD, uv + d * k).r;
      col.g = texture2D(tD, uv).g;
      col.b = texture2D(tD, uv - d * k).b;

      vec3 bloom = texture2D(tB0, uv).rgb * 1.00
                 + texture2D(tB1, uv).rgb * 0.78
                 + texture2D(tB2, uv).rgb * 0.56
                 + texture2D(tB3, uv).rgb * 0.38;
      col += bloom * uBloom * 0.45;

      col *= uExp;
      col = aces(col);

      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);

      /* split tone: cool in the shadows, a touch warm in the highlights */
      col = mix(col * vec3(0.88, 1.01, 1.055), col * vec3(1.025, 0.998, 0.978), smoothstep(0.25, 0.85, l));

      col *= mix(1.0, smoothstep(0.85, 0.12, r2), uVig);

      col += (hash(uv * 900.0 + uTime) - 0.5) * uGrain;

      col = pow(max(col, 0.0), vec3(1.0 / 2.2));
      col = (col - 0.30) * uContrast + 0.30;   /* pivot low so blacks stay heavy */

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
});

/* =================================================================== size */

let W = 0, H = 0;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  /* on a phone the corridor is far narrower than the move was framed for —
     widening the lens keeps the monoliths in shot instead of cropping them */
  camera.fov = W / H < 0.9 ? 62 : 46;
  camera.updateProjectionMatrix();

  const dpr = renderer.getPixelRatio();
  const bw = Math.max(1, Math.floor(W * dpr)), bh = Math.max(1, Math.floor(H * dpr));
  rtScene.setSize(bw, bh);
  for (let i = 0; i < LEVELS; i++) {
    const w = Math.max(1, bw >> (i + 1)), h = Math.max(1, bh >> (i + 1));
    pyramid[i].w = w; pyramid[i].h = h;
    pyramid[i].a.setSize(w, h);
    pyramid[i].b.setSize(w, h);
  }
}
addEventListener('resize', resize, { passive: true });
resize();

/* =============================================================== chapters
   The type is HTML on top of the frame, not in it — it stays selectable,
   indexable and sharp, which is the whole reason not to draw it in WebGL.  */

const chapters = [...document.querySelectorAll('.chapter')].map((el) => ({
  el, at: parseFloat(el.dataset.at), span: parseFloat(el.dataset.span || '0.06'),
  shown: -1,
}));

const bar = document.getElementById('progress');

function scrollProg() {
  const max = document.documentElement.scrollHeight - innerHeight;
  return max > 0 ? clamp(scrollY / max, 0, 1) : 0;
}
/* ?t=0.45 pins the move at one point on the line. Only used for capturing
   stills of a given station — a live page never takes this branch. */
const pinned = new URLSearchParams(location.search).get('t');
if (pinned !== null) {
  RIG.prog = RIG.smooth = clamp(parseFloat(pinned) || 0, 0, 1);
  document.documentElement.classList.add('pinned');
} else {
  addEventListener('scroll', () => { RIG.prog = scrollProg(); }, { passive: true });
  RIG.prog = RIG.smooth = scrollProg();
}

/* pointer parallax — a couple of degrees, enough to feel hand-held */
addEventListener('pointermove', (e) => {
  RIG.sway.set((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
}, { passive: true });

/* ============================================================ device tabs */

const TAB_SCREEN = {
  'custom-software': ['laptop', 'code'],
  'web-platforms': ['laptop', 'web'],
  'saas-products': ['laptop', 'dash'],
  'mobile-applications': ['phone', 'app'],
  'business-digitalization': ['tablet', 'flow'],
  'ai-automation': ['tablet', 'ai'],
};

function selectTab(btn) {
  const key = btn.dataset.tab;
  const entry = TAB_SCREEN[key];
  if (!entry) return;
  const [dev, art] = entry;
  const d = devices[dev];
  d.screen.material.map = screenTexture(art, d.size[0], d.size[1]);
  d.screen.material.needsUpdate = true;

  const group = btn.closest('.chapter');
  group.querySelectorAll('.tab').forEach((b) => {
    b.classList.toggle('on', b === btn);
    b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
  });
  group.querySelectorAll('.panel').forEach((p) => {
    p.classList.toggle('on', p.dataset.tab === key);
  });
}

document.querySelectorAll('.tab').forEach((b) => {
  b.addEventListener('click', () => selectTab(b));
});

/* ---------------------------------------------------------------- in-page
   The chapters are pinned, so a link to #contact cannot simply scroll to the
   element — it is already at the top of the viewport. Send the timeline there
   instead, and the camera follows. Without the scene the ids are ordinary
   sections and the browser's own behaviour is correct, so this only runs when
   the driven layout is on. */
function seekTo(id) {
  const el = document.getElementById(id);
  if (!el || !el.dataset.at) return false;
  const max = document.documentElement.scrollHeight - innerHeight;
  scrollTo({ top: parseFloat(el.dataset.at) * max, behavior: 'smooth' });
  return true;
}

document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href*="#"]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.pathname !== location.pathname || url.origin !== location.origin) return;
  const id = url.hash.slice(1);
  if (id && seekTo(id)) {
    e.preventDefault();
    history.replaceState(null, '', url.hash);
  }
});

if (location.hash) {
  requestAnimationFrame(() => {
    const id = location.hash.slice(1);
    const el = document.getElementById(id);
    if (el && el.dataset.at) {
      const max = document.documentElement.scrollHeight - innerHeight;
      scrollTo({ top: parseFloat(el.dataset.at) * max, behavior: 'auto' });
      RIG.prog = RIG.smooth = parseFloat(el.dataset.at);
    }
  });
}

/* =================================================================== warp
   Leaving for /start/. The camera drops off the scroll rail and accelerates
   down the line it is already looking at, the lens widens, and the grade is
   pushed until the frame blows out — then the navigation happens inside the
   white, where there is nothing left to see. /start/ opens on that same white
   and pulls out of it, so the two pages read as one move.

   The flag is what tells the far side which entrance to play; a visitor who
   arrives from a link or a bookmark gets the quiet one instead. */

const WARP = {
  on: false, gone: false, t: 0, dur: 1.0, href: '',
  from: new THREE.Vector3(), dir: new THREE.Vector3(), fov: 46,
};

function beginWarp(href) {
  if (WARP.on) return;
  WARP.on = true;
  WARP.href = href;
  WARP.from.copy(camera.position);
  camera.getWorldDirection(WARP.dir);
  WARP.fov = camera.fov;
  try { sessionStorage.setItem('meridian:warp', '1'); } catch (e) { /* private mode */ }
  document.documentElement.classList.add('warping');
  /* The hand-off happens inside the render loop, and a loop can stop: a lost
     context, a hidden tab, a throttled frame. The link must still lead
     somewhere, so time it out well past the animation and go regardless. */
  setTimeout(() => {
    if (!WARP.gone) { WARP.gone = true; location.href = WARP.href; }
  }, 1500);
}

/* The white at the end of the flight is only convincing if the far side is
   already there. Warm it on the first hint of intent — a hover, a touch — so
   the hand-off is a cut and not a wait. */
let warmed = false;
function warm(href) {
  if (warmed) return;
  warmed = true;
  /* resolved against this module rather than the domain root, so the same code
     works from a subfolder preview */
  for (const url of [href, new URL('start.js', import.meta.url).href]) {
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = url;
    document.head.appendChild(l);
  }
}
for (const a of document.querySelectorAll('a[data-warp]')) {
  const href = a.getAttribute('href');
  a.addEventListener('pointerenter', () => warm(href), { once: true });
  a.addEventListener('touchstart', () => warm(href), { once: true, passive: true });
}

document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[data-warp]');
  if (!a) return;
  /* let the browser do its own thing for a new tab, a download, a modified
     click — the animation is a nicety, never the only way through */
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  e.preventDefault();
  beginWarp(a.getAttribute('href'));
});

/* =================================================================== loop */

const clock = new THREE.Clock();
const swayCur = new THREE.Vector2();
let elapsed = 0;


/* ==================================================================== intro
   The room does not switch on; it comes up. Exposure and vignette open from
   near-black while the camera settles the last few metres forward, and the
   copy arrives only once there is something behind it to read against. It
   costs a second and a half and no page length at all.

   Skipped outright for a deep link, a reload part-way down, or a visitor who
   has asked for less motion — in all three the answer they want is the frame
   they asked for, immediately.                                              */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Driven off the wall clock, not off accumulated frame deltas. The copy is
   gated on this, so a loop that stutters — a slow first compile, a throttled
   background tab, a device that drops frames — must never be able to leave
   the headline permanently invisible. Wall time only ever moves forward, so
   the worst case is that the entrance is already over by the first frame. */
const REVEAL = { t0: performance.now(), dur: 1550 };
const INTRO = { k: (REDUCED || pinned !== null || scrollY > 40) ? 1 : 0 };

/* ============================================================= look closer
   The screens are painted at roughly seven times the size they are seen at,
   which at the distance the camera keeps makes them about four pixels of
   type — an impression of software rather than anything anyone can read.
   This is the way in: the camera leaves its curve, squares up to the screen
   along the screen's own normal, and frames it whole.

   The grade comes down with it. A screen lit to glow in a dark room is a
   white rectangle from close range, so exposure, bloom and aberration all
   drop as the camera arrives — otherwise "look closer" shows you less.      */
const POST_BASE = {
  exp: compMat.uniforms.uExp.value, bloom: compMat.uniforms.uBloom.value,
  vig: compMat.uniforms.uVig.value, ca: compMat.uniforms.uCA.value,
};
const POST_READ = { exp: 0.66, bloom: 0.085, vig: 0.24, ca: 0.00018 };

const INSPECT = {
  on: false, k: 0, dev: null,
  pos: new THREE.Vector3(), look: new THREE.Vector3(),
};
const _n = new THREE.Vector3(), _sc = new THREE.Vector3();
const _qt = new THREE.Quaternion(), _lt = new THREE.Vector3(), _dir = new THREE.Vector3();
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => k * k * (3 - 2 * k);

/* Solve the stand-off from whichever of the plane's two dimensions binds
   against the current aspect, then sit on the screen's own normal so the
   read is square rather than oblique — the lid is hinged, so "in front of
   the laptop" is not the same direction as "in front of the tablet". */
function framePose(d) {
  const scr = d.screen;
  scr.updateWorldMatrix(true, false);
  scr.matrixWorld.decompose(INSPECT.look, _qt, _sc);
  const g = scr.geometry.parameters;
  const halfV = Math.tan((camera.fov * DEG) / 2);
  const distH = (g.height * _sc.y) / 2 / halfV;
  const distW = (g.width * _sc.x) / 2 / (halfV * (W / H));
  _n.set(0, 0, 1).applyQuaternion(_qt).normalize();
  /* 1.18 rather than a bare fit: a screen touching the frame edge reads as
     cropped, and the margin also absorbs the last percent of the blend */
  INSPECT.pos.copy(INSPECT.look).addScaledVector(_n, Math.max(distH, distW) * 1.18);
}

const raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const screenMeshes = () => Object.values(devices).map((d) => d.screen);

function deviceUnder(x, y) {
  if (!W || !H) return null;
  _ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
  raycaster.setFromCamera(_ndc, camera);
  const hit = raycaster.intersectObjects(screenMeshes(), false)[0];
  return hit ? Object.values(devices).find((d) => d.screen === hit.object) || null : null;
}

function openInspect(d) {
  if (!d || INSPECT.on || WARP.on) return;
  INSPECT.on = true;
  INSPECT.dev = d;
  document.documentElement.classList.add('inspecting');
}
function closeInspect() {
  if (!INSPECT.on) return;
  INSPECT.on = false;
  document.documentElement.classList.remove('inspecting');
}

/* `?peek=laptop|phone|tablet` opens straight into the read, the same way
   `?t=` pins the timeline — the framing is solved from the screen's own
   transform, so it is the one thing worth being able to capture directly. */
{
  const want = new URLSearchParams(location.search).get('peek');
  if (want && devices[want]) requestAnimationFrame(() => {
    openInspect(devices[want]);
    INSPECT.k = 1;            /* arrive, rather than set off — this is for capture */
  });
}

/* the control in the deck, for anyone who does not think to click a render */
document.querySelectorAll('[data-peek]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const ch = btn.closest('.chapter');
    const on = ch && ch.querySelector('.tab.on, .tab');
    const entry = on && TAB_SCREEN[on.dataset.tab];
    openInspect(entry ? devices[entry[0]] : null);
  });
});

addEventListener('click', (e) => {
  if (INSPECT.on) { closeInspect(); return; }
  if (e.target.closest && e.target.closest('a,button')) return;
  openInspect(deviceUnder(e.clientX, e.clientY));
});

addEventListener('keydown', (e) => { if (e.key === 'Escape') closeInspect(); });

/* leaving by scrolling is the reflex, but a trackpad's momentum would throw
   you out the instant you arrived — so it takes a deliberate push */
addEventListener('wheel', (e) => {
  if (INSPECT.on && Math.abs(e.deltaY) > 14) closeInspect();
}, { passive: true });
addEventListener('touchmove', () => closeInspect(), { passive: true });

/* a render that can be opened should say so under the cursor */
addEventListener('pointermove', (e) => {
  if (INSPECT.on || e.pointerType !== 'mouse') return;
  const hit = deviceUnder(e.clientX, e.clientY);
  document.documentElement.classList.toggle('over-device', !!hit);
}, { passive: true });


function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;

  if (pinned === null) RIG.smooth = damp(RIG.smooth, RIG.prog, 3.4, dt);
  const t = clamp(RIG.smooth, 0, 1);

  camCurve.getPoint(t, _p);
  lookCurve.getPoint(t, _l);

  if (INTRO.k < 1) INTRO.k = clamp((performance.now() - REVEAL.t0) / REVEAL.dur, 0, 1);
  INSPECT.k = damp(INSPECT.k, INSPECT.on ? 1 : 0, REDUCED ? 30 : 4.0, dt);
  if (INSPECT.k > 0.0004 && INSPECT.dev) framePose(INSPECT.dev);

  swayCur.x = damp(swayCur.x, RIG.sway.x, 2.2, dt);
  swayCur.y = damp(swayCur.y, RIG.sway.y, 2.2, dt);

  if (WARP.on) {
    WARP.t = Math.min(1, WARP.t + dt / WARP.dur);
    const e = WARP.t * WARP.t * (3 - 2 * WARP.t);
    /* cubed, so it reads as acceleration away from the visitor rather than a
       constant slide: the first half barely moves and most of the travel
       happens under the blow-out, where the eye cannot follow it anyway */
    const rush = WARP.t * WARP.t * WARP.t;

    camera.position.copy(WARP.from).addScaledVector(WARP.dir, rush * 96);
    camera.rotation.z = -e * 0.055;              /* lookAt is skipped, so this holds */
    camera.fov = WARP.fov + e * 24;
    camera.updateProjectionMatrix();

    compMat.uniforms.uExp.value = 1.3 + rush * 7.4;
    compMat.uniforms.uBloom.value = 0.44 + rush * 1.15;
    compMat.uniforms.uCA.value = 0.0009 + rush * 0.009;
    compMat.uniforms.uVig.value = 0.68 * (1 - e);

    /* hand over while the frame is still white — the CSS flash is already up
       underneath, so the paint does not change across the navigation */
    if (WARP.t >= 1 && !WARP.gone) { WARP.gone = true; location.href = WARP.href; }
  } else {
    /* the hand-held sway is charm on the curve and a wobble at reading
       distance, so it is bled out as the inspect pose takes over */
    const rk = ease(clamp(INSPECT.k, 0, 1)), hand = 1 - rk;
    camera.position.set(
      _p.x + (swayCur.x * 0.5 + Math.sin(elapsed * 0.31) * 0.11) * hand,
      _p.y + (-swayCur.y * 0.32 + Math.sin(elapsed * 0.44 + 1.2) * 0.08) * hand,
      _p.z
    );
    /* The look curve is composed for a landscape frame: the object sits right of
       centre so the copy owns the left. A portrait phone has no left column, so
       re-centre the object and lift it above the copy band instead. */
    const wide = W / H >= 0.9;
    _lt.set(
      _l.x + (wide ? 0 : 1.0) + swayCur.x * 0.55 * hand,
      _l.y - (wide ? 0 : 1.15) - swayCur.y * 0.4 * hand,
      _l.z
    );
    if (rk > 0) {
      camera.position.lerp(INSPECT.pos, rk);
      _lt.lerp(INSPECT.look, rk);
    }
    /* the last few metres of the entrance, travelled backwards */
    if (INTRO.k < 1) {
      _dir.subVectors(camera.position, _lt).normalize();
      camera.position.addScaledVector(_dir, (1 - ease(INTRO.k)) * 4.2);
    }
    camera.lookAt(_lt);

    let exp = lerp(POST_BASE.exp, POST_READ.exp, rk);
    let bloom = lerp(POST_BASE.bloom, POST_READ.bloom, rk);
    let vig = lerp(POST_BASE.vig, POST_READ.vig, rk);
    const ca = lerp(POST_BASE.ca, POST_READ.ca, rk);
    if (INTRO.k < 1) {
      const ik = ease(INTRO.k);
      /* squared, so it holds in the dark and then opens — a linear ramp
         reads as a dimmer being turned rather than a room waking up */
      exp = lerp(0.13, exp, INTRO.k * INTRO.k);
      vig = lerp(1.04, vig, ik);
      bloom = lerp(bloom * 1.75, bloom, ik);
    }
    compMat.uniforms.uExp.value = exp;
    compMat.uniforms.uBloom.value = bloom;
    compMat.uniforms.uVig.value = vig;
    compMat.uniforms.uCA.value = ca;
  }

  lantern.position.set(camera.position.x, camera.position.y + 1.5, camera.position.z - 4);

  ring.rotation.z += dt * 0.06;
  ringGlow.rotation.z = ring.rotation.z;
  monoSign.position.y = 10.6 + Math.sin(elapsed * 0.5) * 0.18;
  /* the idle drift is what keeps an object from looking like a still; at
     reading distance it is the camera chasing a moving target, so it is
     bled out exactly as the inspect pose takes hold */
  const idle = 1 - ease(clamp(INSPECT.k, 0, 1));
  devices.phone.group.rotation.y = 16 * DEG + Math.sin(elapsed * 0.28) * 0.09 * idle;
  devices.tablet.group.rotation.y = -16 * DEG + Math.sin(elapsed * 0.22 + 2) * 0.07 * idle;
  devices.laptop.group.rotation.y = 14 * DEG + Math.sin(elapsed * 0.2 + 4) * 0.05 * idle;
  DUST.rotation.y = elapsed * 0.004;

  /* chapters ------------------------------------------------------------- */
  /* the copy waits for the room on the way in, and steps out of the way
     while a screen is being read */
  const gate = smoothstep(0.42, 0.94, INTRO.k) *
               (1 - smoothstep(0.04, 0.5, clamp(INSPECT.k, 0, 1)));
  for (const ch of chapters) {
    const k = smoothstep(ch.span, ch.span * 0.34, Math.abs(t - ch.at)) * gate;
    if (Math.abs(k - ch.shown) > 0.004) {
      ch.el.style.opacity = k.toFixed(3);
      ch.el.style.transform = `translateY(${((1 - k) * 26).toFixed(2)}px)`;
      ch.el.style.pointerEvents = k > 0.6 ? 'auto' : 'none';
      ch.shown = k;
    }
  }
  if (bar) bar.style.transform = `scaleX(${t.toFixed(4)})`;

  /* render --------------------------------------------------------------- */
  renderer.setRenderTarget(rtScene);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  brightMat.uniforms.tD.value = rtScene.texture;
  draw(brightMat, pyramid[0].a);

  for (let i = 0; i < LEVELS; i++) {
    const lv = pyramid[i];
    if (i > 0) {
      copyMat.uniforms.tD.value = pyramid[i - 1].a.texture;
      draw(copyMat, lv.a);
    }
    blurMat.uniforms.tD.value = lv.a.texture;
    blurMat.uniforms.uDir.value.set(1 / lv.w, 0);
    draw(blurMat, lv.b);
    blurMat.uniforms.tD.value = lv.b.texture;
    blurMat.uniforms.uDir.value.set(0, 1 / lv.h);
    draw(blurMat, lv.a);
  }

  compMat.uniforms.tD.value = rtScene.texture;
  compMat.uniforms.tB0.value = pyramid[0].a.texture;
  compMat.uniforms.tB1.value = pyramid[1].a.texture;
  compMat.uniforms.tB2.value = pyramid[2].a.texture;
  compMat.uniforms.tB3.value = pyramid[3].a.texture;
  compMat.uniforms.uTime.value = elapsed;
  draw(compMat, null);
  if (!painted) { painted = true; requestAnimationFrame(markReady); }
}

/* `.ready` drives the chrome's own fade, so it has to land on a frame the
   browser has actually painted — set in the same task as `.gl` there is no
   start value to transition from and the fade never runs. The timeout is the
   belt: if the loop dies, the nav must still appear. */
function markReady() { document.documentElement.classList.add('ready'); }
setTimeout(markReady, 2200);
frame();


/* exposed for tuning from the console while the look is being dialled in */
window.MERIDIAN = { scene, camera, renderer, compMat, RIG, devices, camCurve, lookCurve,
  INSPECT, INTRO, openInspect, closeInspect,
                    WARP, beginWarp };

trackNavHeight();
