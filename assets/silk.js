/* The silk from model D, as a module, for pages that only need it inside one
   card. Same shader, same colours; the caller says where the card is. */
import * as THREE from './vendor/three.module.min.js';

export function createSilk(canvas, { rm = false } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  camera.position.set(0, 0, 9);
  const NOISE = `
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
  float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;
  const mat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uMono: { value: 0 }, uFade: { value: 1 } },
    vertexShader: NOISE + `
      uniform float uT; varying vec3 vN; varying vec3 vP; varying vec2 vUv;
      float h(vec2 p){ return snoise(vec3(p.x*.22, p.y*.42, uT*.09))*1.15 + snoise(vec3(p.x*.55, p.y*.9, uT*.14+3.))*.32; }
      void main(){
        vUv = uv; vec3 p = position;
        float fold = sin(p.x*.38 + uT*.18)*.9;
        p.z += h(p.xy) + fold; p.y += fold*.35;
        float e = .05;
        vec3 px = vec3(p.x+e, p.y, h(p.xy+vec2(e,0.)) + sin((p.x+e)*.38+uT*.18)*.9);
        vec3 py = vec3(p.x, p.y+e, h(p.xy+vec2(0.,e)) + fold);
        vN = normalize(cross(px-p, py-p));
        vec4 mv = modelViewMatrix*vec4(p,1.); vP = mv.xyz;
        gl_Position = projectionMatrix*mv;
      }`,
    /* satin on black: a deep navy body, cobalt in the folds, ice on the
       edges that turn away from the eye. uMono pulls it toward a single
       cobalt-and-ice tone once it has become a card. */
    fragmentShader: `
      uniform float uMono, uFade; varying vec3 vN; varying vec3 vP; varying vec2 vUv;
      void main(){
        vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
        vec3 v = normalize(-vP), l = normalize(vec3(.35,.8,.55));
        float diff = clamp(dot(n,l),0.,1.);
        float fres = pow(1.-abs(dot(n,v)), 2.4);
        float spec = pow(max(dot(reflect(-l,n),v),0.), 42.);
        vec3 deep = vec3(.02,.03,.075), cobalt = vec3(.2,.34,1.), ice = vec3(.78,.86,1.), haze = vec3(.36,.47,1.);
        float t = vUv.x + n.y*.25;
        vec3 body = mix(mix(cobalt*.5, cobalt, smoothstep(.1,.6,t)), haze, smoothstep(.62,1.,t));
        vec3 col = deep + body*(.06 + diff*.82) + fres*.32*ice + spec*.34*ice;
        vec3 mono = (deep + vec3(.2,.31,.97)*(.04+diff*.8) + fres*.36*ice + spec*.3*ice);
        col = min(mix(col, mono, uMono), vec3(1.));
        float edge = smoothstep(0.,.18,vUv.y)*smoothstep(1.,.82,vUv.y)*smoothstep(0.,.12,vUv.x)*smoothstep(1.,.88,vUv.x);
        gl_FragColor = vec4(col, edge*uFade);
      }`
  });
  const silk = new THREE.Mesh(new THREE.PlaneGeometry(16, 7, 240, 110), mat);
  silk.rotation.set(-.55, -.25, .32);
  scene.add(silk);
  let W = 0, H = 0;
  const resize = () => {
    W = innerWidth; H = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, W > 768 ? 1.5 : 2)); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
  };
  resize(); addEventListener('resize', resize);
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { mouse.tx = e.clientX / W - .5; mouse.ty = e.clientY / H - .5; }, { passive: true });
  let t = 4;
  /* speed > 1 runs the cloth faster for a moment — a breath when something happens */
  return (dt, rect, opts) => {
    t += rm ? 0 : dt * (opts.speed || 1);
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
    mat.uniforms.uT.value = t; mat.uniforms.uMono.value = opts.mono;
    const halfH = Math.tan(camera.fov * Math.PI / 360) * camera.position.z, halfW = halfH * camera.aspect;
    silk.position.set(((rect.left + rect.width / 2) / W - .5) * 2 * halfW + opts.dx,
                      -((rect.top + rect.height / 2) / H - .5) * 2 * halfH + opts.dy, 0);
    silk.scale.setScalar(opts.scale);
    silk.rotation.y = -.25 + mouse.x * .18; silk.rotation.x = -.55 + mouse.y * .12;
    renderer.render(scene, camera);
  };
}
