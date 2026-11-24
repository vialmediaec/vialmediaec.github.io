// C4: set de corcho en 3D en TIEMPO REAL (three.js). Se dibuja a la frecuencia de la pantalla (60/120/144 Hz):
// giro, acercamiento, luces y reflejos son continuos. 24-nov-2026.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PRODUCTOS, precio, WA } from './fx.js';

['wa1', 'wa2'].forEach(i => document.getElementById(i).href = WA);
document.getElementById('pr').textContent = precio(7.96);
document.getElementById('grid').innerHTML = PRODUCTOS.map(p => `<a class="card" href="${WA}"><div class="f"><img src="${p.img}" alt="${p.n}" loading="lazy"></div><div class="n">${p.n}</div><div class="c">${p.c}</div><div class="p">${precio(p.p)} <small>c/u</small></div></a>`).join('');

document.querySelectorAll('.paso h1, .paso h2').forEach(h => { h.innerHTML = h.textContent.split(' ').map((w, i) => `<span class="w" style="transition-delay:${80 + i * 60}ms">${w}</span>`).join(' '); });
const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const suave = (a, b, k, dt) => a + (b - a) * (1 - Math.pow(1 - k, dt * 60));

// ---------- escena ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;

const camara = new THREE.PerspectiveCamera(28, 1, 0.01, 10);
const sol = new THREE.DirectionalLight(0xfff1dc, 2.4); sol.position.set(0.18, 1.0, 0.3);

scene.add(sol);
const relleno = new THREE.DirectionalLight(0xdde8ff, 0.5); relleno.position.set(-0.6, 0.3, 0.2); scene.add(relleno);
// piso invisible que solo recibe la sombra: el set flota sobre la página
// Sombra en el piso calculada por Blender (vista desde arriba). Gira con el set; se desvanece si lo inclinas.
const pivote = new THREE.Group(); scene.add(pivote);
let modelo = null, tapa = null; const adentro = []; const q0 = new THREE.Quaternion(), copias = [];
const manual = new THREE.Group(); pivote.add(manual);            // giro libre con el mouse (cualquier dirección)
const texSombra = new THREE.TextureLoader().load('assets/3d/glb/sombra-kit.webp');
const sombra = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false, toneMapped: false }));
sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.0005; pivote.add(sombra);
new GLTFLoader().load('assets/3d/glb/kit-corcho-luz.glb', (g) => {
  const m = g.scene;
  // Lo horneado ya trae la luz de Blender (con su AgX): se muestra tal cual, sin luz en vivo. Los metales reflejan en vivo.
  m.traverse(o => { if (!o.isMesh) return;
    if (o.userData.horneado && o.material.map) { const map = o.material.map; map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
      o.material = new THREE.MeshBasicMaterial({ map, toneMapped: false }); } });
  const caja = new THREE.Box3().setFromObject(m), c = caja.getCenter(new THREE.Vector3());
  m.position.set(-c.x, -caja.min.y, -c.z);           // centrado y apoyado en el piso
  manual.position.y = (caja.max.y - caja.min.y) * .35; m.position.y -= manual.position.y;   // gira sobre su centro
  manual.add(m);
  modelo = m; m.traverse(o => { if (/^Bisagra/.test(o.name)) { tapa = o; q0.copy(o.quaternion); } if (/^(Libreta|Hojas|Lomo|Elastico|Boli|Llavero|Torus)/.test(o.name)) adentro.push(o); });
  [[-.2, -.06], [.2, -.06], [-.1, -.27], [.1, -.27]].forEach(([x, z], k) => {
    const cl = m.clone(); const g2 = new THREE.Group(); g2.add(cl); g2.position.set(x, 0, z); g2.scale.setScalar(0.0001);
    const sh = sombra.clone(); sh.material = sombra.material.clone(); g2.add(sh); sh.position.y = .0005 - manual.position.y * 0; cl.position.y = m.position.y + manual.position.y;
    pivote.add(g2); copias.push({ g: g2, k, sh });
  });
  document.getElementById('escena').classList.add('listo');
});

// ---------- tamaño ----------
const escena = document.getElementById('escena');
function tam() { const r = escena.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camara.aspect = r.width / r.height; camara.updateProjectionMatrix(); }
addEventListener('resize', tam); tam();

// ---------- scroll, arrastre y mouse ----------
const escenario = document.getElementById('escenario'), pista = document.getElementById('pista');
const pasos = [...document.querySelectorAll('.paso')], barras = [...document.querySelectorAll('#puntos b')];
let prog = 0, rotObj = 0, rot = 0, arr = 0, vel = 0, dist = 0.78, distObj = 0.78, alt = 0.34, altObj = 0.34, mx = 0, my = 0, px = 0, py = 0, tocando = null;
const PASOS = [
  { rot: -28, dist: .80, alt: .34, mira: [0, .055, 0], tapa: 0, copias: 0, cel: 1.35 },            // destacado: vista general
  { rot: 0, dist: .34, alt: .30, mira: [-.03, .03, .01], tapa: 0, copias: 0, cel: 1.75 },          // grabado: cerca del logo de la libreta
  { rot: -18, dist: 1.25, alt: .62, mira: [0, .04, -.12], tapa: 0, copias: 1, cel: 1.65 },         // desde 5 unidades: aparecen 5 sets
  { rot: -32, dist: .78, alt: .30, mira: [0, .05, 0], tapa: 1, copias: 0, cel: .95 },             // listo para regalar: se cierra la tapa
];
let paso = 0, pasoF = 0, miraX = 0, miraY = .055, miraZ = 0, tapaV = 0, copiasV = 0;
function leerScroll() {
  const r = escenario.getBoundingClientRect(), total = escenario.offsetHeight - innerHeight;
  prog = Math.min(1, Math.max(0, -r.top / total));
  pasoF = Math.min(3, Math.max(0, prog * 4 - .5));            // paso continuo (0..3) para mezclar suave entre escenas
  paso = Math.min(3, Math.floor(prog * 4 + .0001));
  pasos.forEach((p, i) => p.classList.toggle('on', i === paso));
  barras.forEach((b, i) => b.style.transform = `scaleX(${Math.min(1, Math.max(0, prog * 4 - i))})`);
  if (prog > .02) pista.style.opacity = 0;
}
addEventListener('scroll', leerScroll, { passive: true }); leerScroll();
let tocY = 0, soltado = 0; const qTmp = new THREE.Quaternion(), ejeX = new THREE.Vector3(), ejeY = new THREE.Vector3(0, 1, 0), qVel = { x: 0, y: 0 };
escena.addEventListener('pointerdown', e => { tocando = e.clientX; tocY = e.clientY; escena.setPointerCapture(e.pointerId); pista.style.opacity = 0; qVel.x = qVel.y = 0; });
escena.addEventListener('pointermove', e => { if (tocando === null) return;
  const dx = (e.clientX - tocando) / escena.clientWidth * 3.2, dy = (e.clientY - tocY) / escena.clientHeight * 3.2;
  girarLibre(dx, dy); qVel.x = dx; qVel.y = dy; tocando = e.clientX; tocY = e.clientY; });
escena.addEventListener('pointerup', () => { tocando = null; soltado = performance.now(); });
function girarLibre(dx, dy) {          // giro en 360° en cualquier dirección, respecto a la vista de la cámara
  ejeX.set(1, 0, 0).applyQuaternion(camara.quaternion); const inv = pivote.quaternion.clone().invert(); ejeX.applyQuaternion(inv).normalize();
  qTmp.setFromAxisAngle(ejeY, dx); manual.quaternion.premultiply(qTmp);
  qTmp.setFromAxisAngle(ejeX, dy); manual.quaternion.premultiply(qTmp);
}
const qCero = new THREE.Quaternion();
addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

// ---------- bucle ----------
let antes = performance.now();
function cuadro(t) {
  const dt = Math.min(.05, (t - antes) / 1000); antes = t;
  if (tocando === null) {
    if (Math.abs(qVel.x) + Math.abs(qVel.y) > 1e-4) { girarLibre(qVel.x, qVel.y); qVel.x *= Math.pow(.9, dt * 60); qVel.y *= Math.pow(.9, dt * 60); }
    if (t - soltado > 900) manual.quaternion.slerp(qCero, 1 - Math.pow(1 - .06, dt * 60));   // vuelve solo a su sitio
  }
  const arriba = new THREE.Vector3(0, 1, 0).applyQuaternion(manual.quaternion), incl = Math.acos(Math.min(1, Math.max(-1, arriba.y)));
  sombra.material.opacity = Math.max(0, 1 - incl / 0.22);
  const i0 = Math.floor(pasoF), i1 = Math.min(3, i0 + 1), fr = pasoF - i0, s = fr * fr * (3 - 2 * fr), A = PASOS[i0], B = PASOS[i1], mez = (k) => A[k] + (B[k] - A[k]) * s;
  rotObj = THREE.MathUtils.degToRad(mez('rot')); distObj = mez('dist'); altObj = mez('alt');
  miraX = suave(miraX, A.mira[0] + (B.mira[0] - A.mira[0]) * s, .07, dt); miraY = suave(miraY, A.mira[1] + (B.mira[1] - A.mira[1]) * s, .07, dt); miraZ = suave(miraZ, A.mira[2] + (B.mira[2] - A.mira[2]) * s, .07, dt);
  tapaV = suave(tapaV, mez('tapa'), .08, dt); copiasV = suave(copiasV, mez('copias'), .08, dt);
  adentro.forEach(o => { o.visible = tapaV < .8; });   // con la tapa cerrada, el contenido queda oculto (la libreta es más alta que la caja)
  if (tapa) { const qc = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(105) * tapaV); tapa.quaternion.copy(q0).multiply(qc); }
  copias.forEach(({ g, k }) => { const v = Math.min(1, Math.max(0, copiasV * 1.6 - k * .15)); const e2 = v < 1 ? 1 - Math.pow(1 - v, 3) : 1; g.scale.setScalar(Math.max(.0001, e2)); g.visible = v > .001; });
  const vaiven = QUIETO ? 0 : Math.sin(t / 3400) * 0.06;
  rot = suave(rot, rotObj + arr + vaiven, .07, dt);
  dist = suave(dist, distObj, .07, dt); alt = suave(alt, altObj, .07, dt);
  px = suave(px, mx, .05, dt); py = suave(py, my, .05, dt);
  pivote.rotation.y = rot;
  const ang = -px * 0.25;                                        // paralaje sutil con el mouse
  const kd = camara.aspect < 1 ? mez('cel') : 1;                 // en el celular (vertical): distancia propia de cada paso
  camara.position.set(miraX + Math.sin(ang) * dist * kd, alt * kd + py * 0.04, miraZ + Math.cos(ang) * dist * kd);
  camara.lookAt(miraX, miraY, miraZ);
  renderer.render(scene, camara);
  requestAnimationFrame(cuadro);
}
requestAnimationFrame(cuadro);

// ---------- fondo: luz cálida que sigue al mouse + partículas (media resolución, liviano) ----------
const cv = document.getElementById('fondo'), cx = cv.getContext('2d');
let W = 0, H = 0, lx = .65, ly = .45, sy = 0;
const parts = Array.from({ length: 30 }, () => ({ x: Math.random(), y: Math.random(), r: .5 + Math.random() * 1.4, v: .004 + Math.random() * .01, p: .2 + Math.random() * .8, a: .08 + Math.random() * .2 }));
const tamF = () => { W = cv.width = Math.round(innerWidth * .5); H = cv.height = Math.round(innerHeight * .5); };
addEventListener('resize', tamF); tamF();
let tF = performance.now();
function fondo(t) {
  const dt = Math.min(.05, (t - tF) / 1000); tF = t;
  lx = suave(lx, mx + .5, .04, dt); ly = suave(ly, my + .5, .04, dt); sy = suave(sy, scrollY, .08, dt);
  cx.clearRect(0, 0, W, H);
  const g = cx.createRadialGradient(lx * W, ly * H, 0, lx * W, ly * H, Math.max(W, H) * .55);
  g.addColorStop(0, 'rgba(255,237,0,0.10)'); g.addColorStop(.35, 'rgba(223,199,111,0.07)'); g.addColorStop(1, 'rgba(244,242,238,0)');
  cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  for (const p of parts) {
    if (!QUIETO) p.y -= p.v * dt * 6;
    const yy = ((p.y - sy / innerHeight * .25 * p.p) % 1 + 1) % 1, xx = p.x + (lx - .5) * .02 * p.p;
    cx.beginPath(); cx.arc(xx * W, yy * H, p.r, 0, 6.283); cx.fillStyle = `rgba(140,92,40,${p.a})`; cx.fill();
  }
  requestAnimationFrame(fondo);
}
requestAnimationFrame(fondo);











