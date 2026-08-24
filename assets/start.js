/* =============================================================================
   ACME MERIDIAN — /start/
   Two things live here, and they are deliberately independent.

   The form runs first and needs nothing but the DOM: validation, the labelled
   payload, the send. The chamber behind it is a dynamic import, so a blocked
   module, a dead CDN or a machine with no WebGL costs the visitor a backdrop
   and nothing else — the brief still submits.

   The chamber is its own small scene rather than a second instance of the home
   page's corridor: it is one still frame, held, and does not need the four
   level bloom pyramid or the concrete pipeline that move is built on. The look
   matches because the grade is the same grade.
   ========================================================================== */

import { API } from './config.js';

const ENDPOINT = API + '/brief';
const MAILBOX  = 'walyd@acmemeridian.com';

const root = document.documentElement;
const form = document.getElementById('brief');
const statusEl = document.getElementById('status');
const sendBtn = document.getElementById('send');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================ the entrance
   The home page flies the camera into a blown-out white and then navigates.
   This page has to wake up on that same white and pull out of it, or the cut
   across the navigation is visible. The flag survives the page load; anyone
   arriving from a link or a refresh gets the quiet version instead.         */

let warped = false;
try {
  warped = sessionStorage.getItem('meridian:warp') === '1';
  sessionStorage.removeItem('meridian:warp');
} catch (e) { /* private mode — the quiet entrance is a fine default */ }

if (warped && !reduced) root.classList.add('arriving');

function land() {
  root.classList.add('landed', 'up');
}
if (reduced) {
  root.classList.add('up');
} else {
  /* two frames: one to let the stagger's start state paint, one to leave it */
  requestAnimationFrame(() => requestAnimationFrame(land));
}

/* ================================================================ the form */

/* Somebody who submits without JS lands back here with ?sent=1, so both paths
   end on the same screen. */
const q = new URLSearchParams(location.search);
if (q.get('sent') === '1') document.body.classList.add('done');

/* The no-JS path can only speak through the URL it is redirected to. If it
   came back with a problem, say so in words rather than leaving a query string
   nobody reads. */
const NOJS_ERR = {
  invalid: 'Some required fields were missing or too short. Please fill them in and send again.',
  rate: 'You’ve just sent us a brief — give it a moment before the next one.',
  store: 'We couldn’t save that. Please try again, or email walyd@acmemeridian.com directly.',
};
if (q.get('err')) {
  const el = document.getElementById('nojs-err');
  el.textContent = NOJS_ERR[q.get('err')] || NOJS_ERR.store;
  el.className = 'status on bad';
  el.hidden = false;
}

const val = (n) => {
  const el = form.elements[n];
  return el && typeof el.value === 'string' ? el.value.trim() : '';
};
const picked = (n) =>
  [...form.querySelectorAll('input[name="' + n + '"]:checked')].map((i) => i.value);

/* A field is marked, not the whole form — and the mark clears the moment the
   visitor touches it again, so nothing stays red while they are fixing it. */
function fieldOf(name) {
  const el = form.elements[name];
  const node = el && el.length ? el[0] : el;
  return node ? node.closest('.field') : null;
}
function mark(name, bad) {
  const f = fieldOf(name);
  if (f) f.classList.toggle('bad', bad);
  return !bad;
}
form.addEventListener('input', (e) => {
  const f = e.target.closest('.field');
  if (f) f.classList.remove('bad');
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate() {
  const checks = [
    mark('name', val('name').length < 2),
    mark('email', !EMAIL_RE.test(val('email'))),
    mark('forwho', picked('forwho').length === 0),
    mark('title', val('title').length < 2),
    mark('build', picked('build').length === 0),
    mark('detail', val('detail').length < 20),
  ];
  const bad = form.querySelector('.field.bad');
  if (bad) {
    const input = bad.querySelector('input, textarea');
    bad.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    if (input) setTimeout(() => input.focus({ preventScroll: true }), reduced ? 0 : 380);
  }
  return checks.every(Boolean);
}

/* A record, not an email body: this goes into a table, and the notification is
   composed on the other side from the same row the admin page reads. */
function brief() {
  return {
    name: val('name'),
    email: val('email'),
    company: val('company'),
    country: val('country'),
    for_who: picked('forwho')[0] || '',
    title: val('title'),
    wants: picked('build'),
    stage: picked('stage')[0] || '',
    detail: val('detail'),
    timeline: picked('timeline')[0] || '',
    budget: picked('budget')[0] || '',
    links: val('links'),
  };
}

/* The same record, laid out for a human, for the fallback below. */
const LABELS = [
  ['name', 'Name'], ['email', 'Email'], ['company', 'Company'], ['country', 'Where'],
  ['for_who', 'Project is for'], ['title', 'Project title'], ['wants', 'Wants built'],
  ['stage', 'Stage'], ['detail', 'The brief'], ['timeline', 'Timeline'],
  ['budget', 'Budget'], ['links', 'Links'],
];

/* If the request never lands — offline, blocked, the service down — the brief
   is not thrown away: it is handed back as a composed message the visitor can
   send from their own client. A form that fails silently is worse than none. */
function mailtoFallback() {
  const b = brief();
  const body = LABELS
    .map(([k, label]) => label + ': ' + (Array.isArray(b[k]) ? b[k].join(', ') : b[k] || '—'))
    .join('\n');
  return 'mailto:' + MAILBOX +
    '?subject=' + encodeURIComponent('Project brief — ' + (b.title || 'untitled') + ' — ' + b.name) +
    '&body=' + encodeURIComponent(body);
}

function say(html, bad) {
  statusEl.innerHTML = html;
  statusEl.className = 'status on' + (bad ? ' bad' : '');
}

let sending = false;

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (sending) return;
  if (val('_honey')) return;              /* a bot filled the hidden field */
  if (!validate()) {
    say('A few fields still need you &mdash; they&rsquo;re marked above.', true);
    return;
  }

  sending = true;
  sendBtn.disabled = true;
  sendBtn.querySelector('span').textContent = 'Sending…';
  say('Sending your brief…', false);

  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...brief(), _honey: val('_honey') }),
  })
    .then((r) => r.json().catch(() => ({})).then((j) => ({ ok: r.ok, status: r.status, j })))
    .then(({ ok, status, j }) => {
      if (!ok) throw Object.assign(new Error(j.error || 'refused'), { status, info: j });
      statusEl.className = 'status';
      document.body.classList.add('done');
      scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    })
    .catch((err) => {
      sending = false;
      sendBtn.disabled = false;
      sendBtn.querySelector('span').textContent = 'Send the brief';

      /* Being told to slow down is not a failure, and offering an email escape
         hatch to someone who has already sent three briefs would be wrong. */
      if (err.status === 429) {
        say('You&rsquo;ve just sent us a brief &mdash; give it a moment before the next one.', true);
        return;
      }
      if (err.status === 422) {
        say('Something in there was rejected. Check the marked fields and try again.', true);
        return;
      }
      say(
        '<p>That didn&rsquo;t go through &mdash; the connection or a blocker got in the way. ' +
        'Nothing you wrote is lost: this opens it in your own mail app, ready to send.</p>' +
        '<a class="btn" href="' + mailtoFallback() + '"><span>Send it by email instead</span></a>',
        true
      );
    });
});

/* ============================================================== the chamber
   Everything below is decoration. It is imported dynamically and wrapped, so
   nothing here can take the form down with it.                              */

if (!reduced && !matchMedia('(max-width: 520px)').matches) {
  import('./vendor/three.module.min.js').then(chamber).catch(() => {});
}

function chamber(THREE) {
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x050506, 1);
  root.classList.add('gl');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050506, 0.0085);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 600);

  /* ---------------------------------------------------------- canvas art */

  const cv = (w, h, paint) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  };

  /* the floor is a gradient, not a material: one pool of light under the form
     and black everywhere else, which is cheaper and more controllable than
     lighting a plane and hoping the falloff lands where the type is */
  const floorTex = cv(512, 512, (c, w, h) => {
    c.fillStyle = '#050506'; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, w * 0.5);
    g.addColorStop(0, '#141419');
    g.addColorStop(0.4, '#0b0b0e');
    g.addColorStop(1, 'rgba(5,5,6,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });

  const shaftTex = cv(64, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.34)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.11)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const e = c.createLinearGradient(0, 0, w, 0);
    e.addColorStop(0, '#000'); e.addColorStop(0.25, 'rgba(0,0,0,0)');
    e.addColorStop(0.75, 'rgba(0,0,0,0)'); e.addColorStop(1, '#000');
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = e; c.fillRect(0, 0, w, h);
  });

  const dotTex = cv(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  });

  /* the same mark the home page flies into — it is what makes the two frames
     read as one continuous move rather than two pages */
  const monoTex = cv(1024, 1024, (c, s) => {
    const k = s / 140;
    c.translate(s * 0.5 - 70 * k, s * 0.5 - 50 * k);
    c.scale(k, k);
    c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 9;
    c.beginPath(); c.moveTo(18, 88); c.lineTo(18, 12); c.lineTo(70, 48);
    c.lineTo(122, 12); c.lineTo(122, 88); c.stroke();
    c.beginPath(); c.moveTo(42, 88); c.lineTo(70, 48); c.lineTo(98, 88); c.stroke();
    c.lineWidth = 7; c.lineJoin = 'miter';
    c.beginPath(); c.moveTo(53, 73); c.lineTo(87, 73); c.stroke();
  });

  /* ------------------------------------------------------------ the room */

  floorTex.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 300),
    new THREE.MeshBasicMaterial({ map: floorTex, fog: true })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -80);
  scene.add(floor);

  const mono = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshBasicMaterial({
      color: 0xffffff, alphaMap: monoTex, transparent: true, opacity: 0.014,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    })
  );
  /* Far enough back to be scenery. It is the thing the home page flies into,
     so it has to be present — but the form is what the visitor came to read,
     and anything legible behind type competes with it. */
  mono.position.set(30, 14, -196);
  scene.add(mono);

  const shaftMat = new THREE.MeshBasicMaterial({
    map: shaftTex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, opacity: 0.16, fog: true,
  });
  for (const [x, z, w, h, r] of [
    [-40, -96, 7, 58, 0.34], [46, -134, 9, 66, -0.3], [-20, -186, 11, 74, 0.2],
  ]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), shaftMat);
    s.position.set(x, h / 2, z);
    s.rotation.z = r;
    scene.add(s);
  }

  const N = 170, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 110;
    pos[i * 3 + 1] = Math.random() * 34;
    pos[i * 3 + 2] = -Math.random() * 180 + 20;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.3, map: dotTex, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(dust);

  /* ------------------------------------------------------------ the grade
     The home page's chain with two blur levels instead of four. A held frame
     has none of the fast-moving highlights the deeper pyramid was there for. */

  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  quadScene.add(quad);
  const draw = (mat, target) => {
    quad.material = mat;
    renderer.setRenderTarget(target || null);
    renderer.render(quadScene, quadCam);
    renderer.setRenderTarget(null);
  };

  const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }';
  const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const rtScene = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: true });
  const LEVELS = 2, pyr = [];
  for (let i = 0; i < LEVELS; i++) {
    pyr.push({
      a: new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: false }),
      b: new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: false }),
      w: 1, h: 1,
    });
  }

  const brightMat = new THREE.ShaderMaterial({
    uniforms: { tD: { value: null } }, vertexShader: VERT,
    fragmentShader: `uniform sampler2D tD; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tD, vUv).rgb;
        float l = dot(c, vec3(0.2126,0.7152,0.0722));
        gl_FragColor = vec4(c * smoothstep(0.7, 1.1, l), 1.0);
      }`,
  });
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tD: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VERT,
    fragmentShader: `uniform sampler2D tD; uniform vec2 uDir; varying vec2 vUv;
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
    uniforms: { tD: { value: null } }, vertexShader: VERT,
    fragmentShader: 'uniform sampler2D tD; varying vec2 vUv;' +
      'void main(){ gl_FragColor = vec4(texture2D(tD, vUv).rgb, 1.0); }',
  });
  const compMat = new THREE.ShaderMaterial({
    uniforms: {
      tD: { value: null }, tB0: { value: null }, tB1: { value: null },
      uExp: { value: 1.22 }, uBloom: { value: 0.42 }, uVig: { value: 0.6 },
      uGrain: { value: 0.022 }, uTime: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: `
      uniform sampler2D tD, tB0, tB1;
      uniform float uExp, uBloom, uVig, uGrain, uTime;
      varying vec2 vUv;
      vec3 aces(vec3 x){
        const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
        return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);
      }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main(){
        vec2 uv = vUv; vec2 d = uv - 0.5; float r2 = dot(d,d);
        vec3 col = texture2D(tD, uv).rgb;
        col += (texture2D(tB0, uv).rgb + texture2D(tB1, uv).rgb * 0.72) * uBloom * 0.45;
        col *= uExp;
        col = aces(col);
        float l = dot(col, vec3(0.2126,0.7152,0.0722));
        col = mix(vec3(l), col, 0.86);
        col = mix(col * vec3(0.88,1.01,1.055), col * vec3(1.025,0.998,0.978),
                  smoothstep(0.25,0.85,l));
        col *= mix(1.0, smoothstep(0.9, 0.1, r2), uVig);
        col += (hash(uv * 900.0 + uTime) - 0.5) * uGrain;
        col = pow(max(col, 0.0), vec3(1.0/2.2));
        col = (col - 0.30) * 1.08 + 0.30;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }`,
  });

  let W = 0, H = 0;
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = W / H < 0.9 ? 62 : 48;
    camera.updateProjectionMatrix();
    const dpr = renderer.getPixelRatio();
    const bw = Math.max(1, Math.floor(W * dpr)), bh = Math.max(1, Math.floor(H * dpr));
    rtScene.setSize(bw, bh);
    for (let i = 0; i < LEVELS; i++) {
      const w = Math.max(1, bw >> (i + 1)), h = Math.max(1, bh >> (i + 1));
      pyr[i].w = w; pyr[i].h = h;
      pyr[i].a.setSize(w, h); pyr[i].b.setSize(w, h);
    }
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  /* ------------------------------------------------------------- the move
     One long pull-back out of the mark, then a hold that answers the scroll
     and the pointer. The exposure ramp is the other half of the cut: the page
     opens as white as the one it came from and settles from there.          */

  const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
  const ENTRY = warped ? 1.55 : 0.9;
  const FROM_Z = warped ? -176 : -22;
  const REST = new THREE.Vector3(0, 4.2, 22);

  let entry = 0, elapsed = 0, painted = false;
  const sway = new THREE.Vector2(), swayCur = new THREE.Vector2();
  let scrollK = 0, scrollCur = 0;

  addEventListener('pointermove', (e) => {
    sway.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
  }, { passive: true });
  addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollK = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  }, { passive: true });

  const clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    elapsed += dt;
    entry = Math.min(1, entry + dt / ENTRY);
    /* a long tail: fast out of the mark, then a slow settle into the hold */
    const e = 1 - Math.pow(1 - entry, 3.2);

    swayCur.x = damp(swayCur.x, sway.x, 2.0, dt);
    swayCur.y = damp(swayCur.y, sway.y, 2.0, dt);
    scrollCur = damp(scrollCur, scrollK, 3.0, dt);

    camera.position.set(
      REST.x + swayCur.x * 1.5 + Math.sin(elapsed * 0.29) * 0.12,
      REST.y + scrollCur * 1.9 - swayCur.y * 0.9 + Math.sin(elapsed * 0.41) * 0.09,
      FROM_Z + (REST.z - FROM_Z) * e - scrollCur * 7
    );
    camera.lookAt(swayCur.x * 1.6, 11.5 + scrollCur * 1.4 - swayCur.y * 0.8, -170);

    mono.position.y = 14 + Math.sin(elapsed * 0.42) * 0.3;
    dust.rotation.y = elapsed * 0.005;

    compMat.uniforms.uExp.value = 1.22 + (1 - e) * (warped ? 5.6 : 1.1);
    compMat.uniforms.uBloom.value = 0.42 + (1 - e) * (warped ? 0.9 : 0.2);
    compMat.uniforms.uVig.value = 0.6 * e;
    compMat.uniforms.uTime.value = elapsed;

    renderer.setRenderTarget(rtScene);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    brightMat.uniforms.tD.value = rtScene.texture;
    draw(brightMat, pyr[0].a);
    for (let i = 0; i < LEVELS; i++) {
      const lv = pyr[i];
      if (i > 0) { copyMat.uniforms.tD.value = pyr[i - 1].a.texture; draw(copyMat, lv.a); }
      blurMat.uniforms.tD.value = lv.a.texture;
      blurMat.uniforms.uDir.value.set(1 / lv.w, 0);
      draw(blurMat, lv.b);
      blurMat.uniforms.tD.value = lv.b.texture;
      blurMat.uniforms.uDir.value.set(0, 1 / lv.h);
      draw(blurMat, lv.a);
    }
    compMat.uniforms.tD.value = rtScene.texture;
    compMat.uniforms.tB0.value = pyr[0].a.texture;
    compMat.uniforms.tB1.value = pyr[1].a.texture;
    draw(compMat, null);
    painted = true;
  }

  /* if the context dies before it ever draws, take the backdrop back off
     rather than leaving a black canvas over the page */
  addEventListener('error', () => { if (!painted) root.classList.remove('gl'); });

  frame();
}
