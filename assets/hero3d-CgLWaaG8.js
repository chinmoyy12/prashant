import{_ as e,a as t,c as n,d as r,h as i,l as a,m as o,n as s,p as c,r as l,s as ee,t as u,u as d,v as f}from"./three.module-BYTt5PEP.js";var p=`
  uniform sampler2D uDepth;
  uniform float uDepthScale;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += texture2D(uDepth, uv).r * uDepthScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`,m=`
  uniform sampler2D uColor;
  uniform sampler2D uDepth;
  uniform vec2 uTexel;
  uniform vec2 uMouse;      // uv space
  uniform vec2 uLight;      // -1..1 light direction from the cursor
  uniform float uReveal;    // colour "developing" strength under the cursor
  uniform float uOpacity;
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uColor, vUv);
    if (c.a < 0.02) discard;
    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    // lift the shadows so darker skin keeps its detail in black & white
    float tone = smoothstep(-0.1, 0.9, pow(lum, 0.5));
    vec3 mono = vec3(tone);
    // normal from the depth map for relighting
    float dx = texture2D(uDepth, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uDepth, vUv - vec2(uTexel.x, 0.0)).r;
    float dy = texture2D(uDepth, vUv + vec2(0.0, uTexel.y)).r - texture2D(uDepth, vUv - vec2(0.0, uTexel.y)).r;
    vec3 n = normalize(vec3(-dx * 7.0, -dy * 7.0, 1.0));
    vec3 l = normalize(vec3(uLight.x, uLight.y, 0.9));
    float diff = clamp(dot(n, l), 0.0, 1.0);
    float rim = pow(1.0 - n.z, 2.0) * clamp(dot(n.xy, uLight), 0.0, 1.0);
    vec3 shaded = mono * (0.82 + 0.28 * diff) + rim * 0.45;
    // colour develops in a soft circle around the cursor
    vec2 d = (vUv - uMouse) * vec2(uAspect, 1.0);
    float m = (1.0 - smoothstep(0.08, 0.26, length(d))) * uReveal;
    vec3 lifted = pow(c.rgb, vec3(0.8));
    vec3 col = mix(shaded, lifted * (0.9 + 0.25 * diff) + rim * 0.35, m);
    // fade into the floor
    float fade = smoothstep(0.0, 0.28, vUv.y);
    gl_FragColor = vec4(col, c.a * fade * uOpacity);
  }
`,h=`
  attribute vec2 aUv;
  attribute vec3 aRand;
  uniform sampler2D uDepth;
  uniform sampler2D uColor;
  uniform float uDepthScale;
  uniform float uScatter;
  uniform float uTime;
  uniform float uSize;
  uniform vec2 uPlane;
  varying float vAlpha;
  varying float vLum;
  void main() {
    vec4 c = texture2D(uColor, aUv);
    vLum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec3 p = vec3((aUv - 0.5) * uPlane, texture2D(uDepth, aUv).r * uDepthScale);
    float s = smoothstep(0.0, 1.0, clamp(uScatter * 1.25 - aRand.z * 0.25, 0.0, 1.0));
    float ang = aRand.x * 6.2831 + uTime * 0.25;
    vec3 drift = vec3(cos(ang) * (220.0 + aRand.y * 520.0), 180.0 + aRand.y * 640.0, sin(ang) * (260.0 + aRand.x * 420.0));
    p += drift * s;
    p.x += sin(uTime * 0.8 + aRand.y * 20.0) * 6.0 * s;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (1.0 + s * 1.6) * (900.0 / -mv.z);
    vAlpha = c.a * (1.0 - smoothstep(0.75, 1.0, s)) * smoothstep(0.0, 0.25, aUv.y);
  }
`,g=`
  uniform float uOpacity;
  varying float vAlpha;
  varying float vLum;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float d = length(q);
    if (d > 0.5) discard;
    float a = (1.0 - smoothstep(0.2, 0.5, d)) * vAlpha * uOpacity;
    gl_FragColor = vec4(vec3(smoothstep(-0.1, 0.9, pow(vLum, 0.5)) * 0.85), a);
  }
`;function _(e){return new Promise((t,n)=>{let r=new Image;r.decoding=`async`,r.onload=()=>t(r),r.onerror=()=>n(Error(`Could not load ${e}`)),r.src=e})}async function v({canvas:v,colorUrl:y,depthUrl:te,pointerArea:b}){let x;try{x=new u({canvas:v,antialias:!0,alpha:!0,powerPreference:`high-performance`})}catch{return null}x.setClearColor(0,0),x.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),x.outputColorSpace=c;let S=new e,[C,w,T]=await Promise.all([S.loadAsync(y),S.loadAsync(te),_(y)]),E=(e,t)=>{e.minFilter=ee,e.generateMipmaps=!1,t&&(e.colorSpace=c)};E(C,!0),E(w,!1);let D=T.naturalWidth/T.naturalHeight,O=new o,k=new a(35,1,10,8e3),A=new t;O.add(A);let j={uColor:{value:C},uDepth:{value:w},uTexel:{value:new f(1/T.naturalWidth*2,1/T.naturalHeight*2)},uDepthScale:{value:100},uMouse:{value:new f(-2,-2)},uLight:{value:new f(.4,.5)},uReveal:{value:0},uOpacity:{value:0},uAspect:{value:D}},M=new n(new d(1,1,180,250),new i({vertexShader:p,fragmentShader:m,uniforms:j,transparent:!0,depthWrite:!1}));A.add(M);let N=window.innerWidth<760?5:3,P=Math.round(T.naturalWidth/N),F=Math.round(T.naturalHeight/N),I=document.createElement(`canvas`);I.width=P,I.height=F;let L=I.getContext(`2d`,{willReadFrequently:!0}),R=[],z=[];if(L){L.drawImage(T,0,0,P,F);let e=L.getImageData(0,0,P,F).data;for(let t=0;t<F;t++)for(let n=0;n<P;n++)e[(t*P+n)*4+3]<128||(R.push((n+.5)/P,1-(t+.5)/F),z.push(Math.random(),Math.random(),Math.random()))}let B=new l,V=R.length/2;B.setAttribute(`position`,new s(new Float32Array(V*3),3)),B.setAttribute(`aUv`,new s(new Float32Array(R),2)),B.setAttribute(`aRand`,new s(new Float32Array(z),3));let H={uColor:{value:C},uDepth:{value:w},uDepthScale:{value:100},uScatter:{value:1},uTime:{value:0},uSize:{value:2},uPlane:{value:new f(1,1)},uOpacity:{value:1}},U=new r(B,new i({vertexShader:h,fragmentShader:g,uniforms:H,transparent:!0,depthWrite:!1}));U.frustumCulled=!1,A.add(U);let W=1,G=1;function K(){let e=v.getBoundingClientRect();W=Math.max(1,e.width),G=Math.max(1,e.height),x.setSize(W,G,!1);let t=1400;k.position.set(0,0,t),k.fov=2*Math.atan(G/2/t)*(180/Math.PI),k.aspect=W/G,k.updateProjectionMatrix();let n=G*(W<760?.62:.76),r=n*D;r>W*.96&&(r=W*.96,n=r/D),M.scale.set(r,n,1),A.position.set(0,-G/2+n/2,0);let i=n*.12;j.uDepthScale.value=i/1,H.uDepthScale.value=i,H.uPlane.value.set(r,n),H.uSize.value=Math.max(1.6,n/F*.95)*Math.min(window.devicePixelRatio||1,2)}let q={rx:0,ry:0,lx:.4,ly:.5,reveal:0},J={rx:0,ry:0,lx:.4,ly:.5,reveal:0},Y=new f(-2,-2);b.addEventListener(`pointermove`,e=>{let t=v.getBoundingClientRect(),n=(e.clientX-t.left)/t.width*2-1,r=(e.clientY-t.top)/t.height*2-1;q.ry=n*.32,q.rx=r*.12,q.lx=n,q.ly=-r;let i=M.scale.x,a=M.scale.y,o=t.left+(t.width-i)/2,s=t.bottom-a;Y.set((e.clientX-o)/i,1-(e.clientY-s)/a),q.reveal=+(e.pointerType===`mouse`)}),b.addEventListener(`pointerleave`,()=>{q.rx=0,q.ry=0,q.reveal=0});let X=1,Z=!1,Q=performance.now();function $(){if(!Z)return;let e=(performance.now()-Q)/1e3,t=.06;J.rx+=(q.rx-J.rx)*t,J.ry+=(q.ry-J.ry)*t,J.lx+=(q.lx-J.lx)*t,J.ly+=(q.ly-J.ly)*t,J.reveal+=(q.reveal-J.reveal)*.08,A.rotation.y=J.ry+Math.sin(e*.5)*.04,A.rotation.x=J.rx+Math.sin(e*.37)*.015,j.uLight.value.set(J.lx*.9+.1,J.ly*.9+.2),j.uMouse.value.lerp(Y,.18),j.uReveal.value=J.reveal*(1-X);let n=1-Math.min(1,X/.12);j.uOpacity.value=n,H.uScatter.value=X,H.uTime.value=e,H.uOpacity.value=Math.min(1,X/.04)*.95,U.visible=X>.001,x.render(O,k),requestAnimationFrame($)}return K(),window.addEventListener(`resize`,K),{setScatter(e){X=Math.max(0,Math.min(1,e))},start(){Z||(Z=!0,Q=performance.now()-1,requestAnimationFrame($))},stop(){Z=!1}}}export{v as initHero3D};