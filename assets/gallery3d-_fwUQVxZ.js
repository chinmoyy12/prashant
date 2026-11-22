import{a as e,c as t,d as n,f as r,h as i,m as a,o,p as s,s as c,t as l,u}from"./three.module-2zMKTcNV.js";var d=`
  uniform float uViewW;
  uniform float uViewH;
  uniform float uVelocity;
  uniform float uBend;
  varying vec2 vUv;
  varying float vShade;
  const float PI = 3.141592653589793;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    float nx = wp.x / (uViewW * 0.5);              // -1 .. 1 across the screen
    float ax = abs(nx);
    // S-shaped ribbon: left side swings toward the camera & down, right side away & up
    wp.z += -nx * ax * uViewW * 0.22 * uBend;
    wp.y += nx * nx * nx * uViewH * 0.07 * uBend;
    // velocity wave
    wp.y += sin(uv.x * PI) * uVelocity * 16.0;
    wp.z -= abs(uVelocity) * sin(uv.x * PI) * 38.0;
    vShade = clamp(1.0 - ax * 0.12, 0.75, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`,f=`
  uniform sampler2D uTex;
  uniform vec2 uImgRes;
  uniform vec2 uPlaneRes;
  uniform float uVelocity;
  uniform float uHover;
  uniform float uRadius;
  uniform float uLoaded;
  uniform vec2 uFocus;
  varying vec2 vUv;
  varying float vShade;
  vec2 cover(vec2 uv) {
    float rp = uPlaneRes.x / uPlaneRes.y;
    float ri = uImgRes.x / uImgRes.y;
    vec2 s = rp > ri ? vec2(1.0, ri / rp) : vec2(rp / ri, 1.0);
    return (uv - 0.5) * s + 0.5 + (uFocus - 0.5) * (1.0 - s);
  }
  void main() {
    vec2 uv = cover(vUv);
    uv = (uv - 0.5) * (1.0 - 0.07 * uHover) + 0.5;
    float shift = uVelocity * 0.011;
    vec3 col;
    col.r = texture2D(uTex, uv + vec2(shift, 0.0)).r;
    col.g = texture2D(uTex, uv).g;
    col.b = texture2D(uTex, uv - vec2(shift, 0.0)).b;
    col = mix(vec3(0.82), col, uLoaded) * vShade;
    // rounded corners
    vec2 p = (vUv - 0.5) * uPlaneRes;
    vec2 q = abs(p) - uPlaneRes * 0.5 + uRadius;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
    float a = 1.0 - smoothstep(-1.0, 1.0, d);
    gl_FragColor = vec4(col, a);
  }
`;function p({canvas:p,items:m,onActive:h,onOpen:g,onHover:_}){let v;try{v=new l({canvas:p,antialias:!0,alpha:!0,powerPreference:`high-performance`})}catch{return null}v.setClearColor(0,0),v.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),v.outputColorSpace=n;let y=new r,b=new c(45,1,10,6e3),x=new a,S=new t(1,1,40,20),C=1,w=1,T=400,E=270,D=40,O=1,k={target:0,current:0,scrollBase:0,drag:0,velocity:0,active:-1,hovered:-1,running:!1,bend:1},A=m.map((t,r)=>{let a={uTex:{value:null},uImgRes:{value:new i(16,10)},uPlaneRes:{value:new i(T,E)},uVelocity:{value:0},uHover:{value:0},uRadius:{value:10},uLoaded:{value:0},uViewW:{value:1},uViewH:{value:1},uBend:{value:1},uFocus:{value:new i(t.focus?.[0]??.5,1-(t.focus?.[1]??.5))}},c=new s({vertexShader:d,fragmentShader:f,uniforms:a,transparent:!0}),l=new o(S,c);return l.userData={index:r,hover:0},y.add(l),x.load(t.thumb,t=>{t.colorSpace=n,t.minFilter=e,t.generateMipmaps=!1,a.uTex.value=t;let r=t.image;a.uImgRes.value.set(r.width,r.height),a.uLoaded.value=1}),l});function j(){let e=p.getBoundingClientRect();C=Math.max(1,e.width),w=Math.max(1,e.height),v.setSize(C,w,!1);let t=1e3;b.position.set(0,0,t),b.fov=2*Math.atan(w/2/t)*(180/Math.PI),b.aspect=C/w,b.updateProjectionMatrix(),E=C<700?Math.min(w*.44,C*.6/.68):Math.min(Math.max(w*.44,260),480),T=E*.68,D=T*.14,p.parentElement?.style.setProperty(`--ribbon-h`,`${E}px`),O=m.length*(T+D),k.bend=C<700?.45:1,A.forEach(e=>{e.scale.set(T,E,1);let t=e.material.uniforms;t.uPlaneRes.value.set(T,E),t.uViewW.value=C,t.uViewH.value=w,t.uRadius.value=Math.max(6,T*.025)})}let M=new i(-10,-10),N=new u,P=!1,F=0,I=0;p.addEventListener(`pointerdown`,e=>{P=!0,F=e.clientX,I=0,p.setPointerCapture?.(e.pointerId)}),p.addEventListener(`pointermove`,e=>{let t=p.getBoundingClientRect();if(M.set((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height)*2+1),!P)return;let n=e.clientX-F;F=e.clientX,I+=Math.abs(n),k.drag-=n*1.4});function L(e){let t=p.getBoundingClientRect(),n=new i((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height)*2+1);N.setFromCamera(n,b);let r=N.intersectObjects(A,!1)[0];return r?r.object.userData.index:-1}p.addEventListener(`pointerup`,e=>{if(P&&(P=!1,I<6)){let t=L(e);t>=0&&g?.(t)}}),p.addEventListener(`pointercancel`,()=>{P=!1}),p.addEventListener(`pointerleave`,()=>{M.set(-10,-10)});function R(e){return((e+O/2)%O+O)%O-O/2}function z(){if(!k.running)return;k.target=k.scrollBase+k.drag;let e=k.current;k.current+=(k.target-k.current)*.075;let t=Math.max(-1.1,Math.min(1.1,(k.current-e)/40));k.velocity+=(t-k.velocity)*.15;let n=0,r=1/0;A.forEach((e,t)=>{let i=R(t*(T+D)-k.current);e.position.set(i,0,0);let a=e.material.uniforms;a.uVelocity.value=k.velocity,a.uBend.value=k.bend,Math.abs(i)<r&&(r=Math.abs(i),n=t)}),N.setFromCamera(M,b);let i=N.intersectObjects(A,!1)[0],a=i?i.object.userData.index:-1;a!==k.hovered&&(k.hovered=a,_?.(a>=0)),A.forEach((e,t)=>{e.userData.hover+=(+(t===a)-e.userData.hover)*.1,e.material.uniforms.uHover.value=e.userData.hover}),n!==k.active&&(k.active=n,h?.(n)),v.render(y,b),requestAnimationFrame(z)}return j(),window.addEventListener(`resize`,j),{setScroll(e){k.scrollBase=e},get total(){return O},start(){k.running||(k.running=!0,requestAnimationFrame(z))},stop(){k.running=!1}}}export{p as initRibbon};