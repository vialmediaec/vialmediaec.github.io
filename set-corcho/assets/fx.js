// Efectos premium para las propuestas de la tienda Vialmedia (24-nov-2026). WebGL puro, sin librerías.
// - gradienteVivo(canvas, colores): gradiente de malla que se mueve (mismo efecto que ShaderGradient / Paper MeshGradient)
// - metalLiquido(canvas, urlLogo, tinte): logo en metal líquido (mismo efecto que Paper "liquid logo")
// Si el equipo es lento o pide "reducir movimiento", se dibuja un cuadro fijo.
const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;

function gl0(canvas) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true, antialias: true });
  if (!gl) return null;
  const ajustar = () => {
    const r = Math.min(devicePixelRatio || 1, 2), w = canvas.clientWidth * r | 0, h = canvas.clientHeight * r | 0;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  return { gl, ajustar };
}
function programa(gl, frag) {
  const vs = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0,1);}';
  const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, 'precision highp float;varying vec2 uv;' + frag)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const l = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
  return (n) => gl.getUniformLocation(pr, n);
}
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
function bucle(fn) {
  let vis = true; const t0 = performance.now();
  if (QUIETO) { fn(7.0); return; }
  const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; }); return (el) => { io.observe(el); const f = (t) => { if (vis) fn((t - t0) / 1000); requestAnimationFrame(f); }; requestAnimationFrame(f); };
}

const RUIDO = `
vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec2 m289(vec2 x){return x-floor(x*(1./289.))*289.;}vec3 perm(vec3 x){return m289(((x*34.)+1.)*x);}
float snoise(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=m289(i);vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;m*=1.79284291400159-.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}`;

export function gradienteVivo(canvas, colores, { velocidad = 0.12, grano = 0.06, escala = 1.6 } = {}) {
  const c = gl0(canvas); if (!c) return; const { gl, ajustar } = c;
  const u = programa(gl, RUIDO + `
uniform float t;uniform vec2 res;uniform vec3 c0,c1,c2,c3;uniform float gr,esc;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec2 p=uv;p.x*=res.x/res.y;
 vec2 w=p*esc+vec2(snoise(p*1.2+t*.7),snoise(p*1.2-t*.6+3.))*.45;
 float n1=snoise(w+t*.3)*.5+.5,n2=snoise(w*1.3-t*.25+7.)*.5+.5,n3=snoise(w*.8+t*.2+13.)*.5+.5;
 vec3 col=mix(c0,c1,smoothstep(.15,.85,n1));col=mix(col,c2,smoothstep(.35,.95,n2)*.85);col=mix(col,c3,smoothstep(.55,1.,n3)*.7);
 col+=(h(uv*res+t)-.5)*gr;gl_FragColor=vec4(col,1.);}`);
  const [a, b, d, e] = colores.map(hex);
  const draw = (t) => { ajustar(); gl.uniform1f(u('t'), t * velocidad * 4); gl.uniform2f(u('res'), canvas.width, canvas.height);
    gl.uniform3fv(u('c0'), a); gl.uniform3fv(u('c1'), b); gl.uniform3fv(u('c2'), d); gl.uniform3fv(u('c3'), e); gl.uniform1f(u('gr'), grano); gl.uniform1f(u('esc'), escala); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  const go = bucle(draw); if (go) go(canvas);
}

export function metalLiquido(canvas, urlLogo, { tinte = '#FFED00', mezcla = 0.35, fondo = null } = {}) {
  const c = gl0(canvas); if (!c) return; const { gl, ajustar } = c;
  const u = programa(gl, RUIDO + `
uniform float t;uniform vec2 res,img;uniform sampler2D logo;uniform vec3 tin;uniform float mz;
float a(vec2 q){return texture2D(logo,q).a;}
void main(){
 float ar=res.x/res.y,ai=img.x/img.y;vec2 q=uv;q.y=1.-q.y;
 vec2 s=ar>ai?vec2(ar/ai,1.):vec2(1.,ai/ar);q=(q-.5)*s*1.08+.5;
 if(q.x<0.||q.x>1.||q.y<0.||q.y>1.){gl_FragColor=vec4(0.);return;}
 float m=a(q);vec2 e=vec2(2.5)/img;
 // bisel: normal a partir del borde del logo (alfa suavizado)
 float bl=0.;for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++)bl+=a(q+vec2(i,j)*e*1.6);bl/=25.;
 vec2 n=vec2(a(q+vec2(e.x*2.,0.))-a(q-vec2(e.x*2.,0.)),a(q+vec2(0.,e.y*2.))-a(q-vec2(0.,e.y*2.)));
 float fl=snoise(q*vec2(3.,6.)+vec2(t*.35,-t*.2))*.5+snoise(q*9.-t*.4)*.15;
 float v=q.x*.9+q.y*.5+fl*.55+n.x*1.4-n.y*1.4+(1.-bl)*.7-t*.18;
 float banda=sin(v*6.2832)*.5+.5;banda=smoothstep(.05,.95,banda);
 vec3 osc=vec3(.08,.08,.09),cla=vec3(.97,.97,1.);
 vec3 col=mix(osc,cla,banda);col=mix(col,col*tin*1.15,mz);
 col+=pow(max(0.,sin(v*6.2832+1.3)),40.)*.8; // destellos
 gl_FragColor=vec4(col*m,m);}`);
  const tex = gl.createTexture(); const im = new Image();
  im.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const draw = (t) => { ajustar(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u('t'), t); gl.uniform2f(u('res'), canvas.width, canvas.height); gl.uniform2f(u('img'), im.width, im.height);
      gl.uniform3fv(u('tin'), hex(tinte)); gl.uniform1f(u('mz'), mezcla); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    const go = bucle(draw); if (go) go(canvas);
  };
  im.src = urlLogo;
}

// Filtro SVG del vidrio líquido (refracción en los bordes). Se inserta una vez por página.
export function filtroVidrio() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', 0); s.setAttribute('height', 0); s.style.position = 'absolute';
  s.innerHTML = `<filter id="vidrio" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="r"/><feGaussianBlur in="r" stdDeviation="2" result="rb"/><feDisplacementMap in="SourceGraphic" in2="rb" scale="38" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  document.body.appendChild(s);
}

// Tarjetas de productos (mismos datos que la tienda real; precio unitario con margen)
export const PRODUCTOS = [
  { n: 'Kit Executive', c: 'Kits', p: 20.57, img: 'assets/img/p0.jpg' },
  { n: 'Vaso térmico Tumbler 600 ml', c: 'Termos y vasos', p: 6.75, img: 'assets/img/p28.jpg' },
  { n: 'Cargador inalámbrico', c: 'Escritorio y tecnología', p: 15.87, img: 'assets/img/p79.jpg' },
  { n: 'Set Ejecutivo tipo Maletín', c: 'Kits', p: 11.66, img: 'assets/img/p4.jpg' },
  { n: 'Termo con soporte magnético', c: 'Termos y vasos', p: 12.64, img: 'assets/img/p31.jpg' },
  { n: 'Tabla Cheese', c: 'Hogar y regalos', p: 10.74, img: 'assets/img/p81.jpg' },
  { n: 'Kit Oficina', c: 'Kits', p: 11.88, img: 'assets/img/p3.jpg' },
  { n: 'Set ejecutivo corcho', c: 'Escritorio y tecnología', p: 7.96, img: 'assets/img/p1037.jpg' },
];
export const precio = (p) => '$' + (p * 1.25).toFixed(2);
export const WA = 'https://wa.me/593982898560?text=' + encodeURIComponent('Hola Vialmedia, quiero cotizar');

