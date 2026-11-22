import{_ as e,c as t,f as n,g as r,h as i,i as a,l as o,m as s,o as c,p as l,s as u,t as d,u as f,v as p,y as m}from"./three.module-BYTt5PEP.js";import{o as h}from"./content-DEpiYMKy.js";var g=`
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
`,_=`
  uniform sampler2D uTex;
  uniform vec2 uImgRes;
  uniform vec2 uPlaneRes;
  uniform float uVelocity;
  uniform float uHover;
  uniform float uRadius;
  uniform float uLoaded;
  uniform vec3 uPlaceholder;
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
    col = mix(uPlaceholder, col, uLoaded) * vShade;
    // rounded corners
    vec2 p = (vUv - 0.5) * uPlaneRes;
    vec2 q = abs(p) - uPlaneRes * 0.5 + uRadius;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
    float a = 1.0 - smoothstep(-1.0, 1.0, d);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;function v({canvas:v,items:y,onActive:b,onOpen:x,onHover:S}){let C;try{C=new d({canvas:v,antialias:!0,alpha:!0,powerPreference:`high-performance`})}catch{return null}C.setClearColor(0,0),C.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),C.outputColorSpace=l;let w=new s,T=new o(45,1,10,6e3),E=typeof createImageBitmap==`function`&&!/^((?!chrome|android).)*safari/i.test(navigator.userAgent),D=new c().setCrossOrigin(`anonymous`);D.setOptions({imageOrientation:`flipY`,premultiplyAlpha:`none`});let O=new e().setCrossOrigin(`anonymous`),k=new f(1,1,40,20),A=1,j=1,M=400,N=270,P=40,F=1,I={target:0,current:0,scrollBase:0,drag:0,velocity:0,active:-1,hovered:-1,running:!1,bend:1},L=y.map((e,n)=>{let r={uTex:{value:null},uImgRes:{value:new p(16,10)},uPlaneRes:{value:new p(M,N)},uVelocity:{value:0},uHover:{value:0},uRadius:{value:10},uLoaded:{value:0},uViewW:{value:1},uViewH:{value:1},uBend:{value:1},uFocus:{value:new p(e.img.focus[0],1-e.img.focus[1])},uPlaceholder:{value:(()=>{let t=new a(e.img.color);return t.convertSRGBToLinear(),new m(t.r,t.g,t.b).multiplyScalar(1)})()}};r.uImgRes.value.set(e.img.w,e.img.h);let o=new i({vertexShader:g,fragmentShader:_,uniforms:r,transparent:!0}),s=new t(k,o);return s.userData={index:n,hover:0},w.add(s),s}),R=new Set,z=new Set,B=y.map(()=>0),V=!1;function H(e,t){t.colorSpace=l,t.minFilter=u,t.generateMipmaps=!1,t.needsUpdate=!0,L[e].material.uniforms.uTex.value=t,R.add(e),z.delete(e),W()}function U(e){z.add(e);let t=h(window.innerWidth<700?y[e].img.sm:y[e].img.md),n=()=>{z.delete(e),R.add(e),W()};E?D.load(t,t=>{let n=new r(t);n.flipY=!1,H(e,n)},void 0,n):O.load(t,t=>H(e,t),void 0,n)}function W(){if(!V)return;let e=y.length,t=Math.max(0,I.active),n=[...Array(e).keys()].sort((n,r)=>Math.min(Math.abs(n-t),e-Math.abs(n-t))-Math.min(Math.abs(r-t),e-Math.abs(r-t)));for(let e of n){if(z.size>=4)break;!R.has(e)&&!z.has(e)&&U(e)}}function G(){let e=v.getBoundingClientRect();A=Math.max(1,e.width),j=Math.max(1,e.height),C.setSize(A,j,!1);let t=1e3;T.position.set(0,0,t),T.fov=2*Math.atan(j/2/t)*(180/Math.PI),T.aspect=A/j,T.updateProjectionMatrix(),N=A<700?Math.min(j*.44,A*.6/.68):Math.min(Math.max(j*.44,260),480),M=N*.68,P=M*.14,v.parentElement?.style.setProperty(`--ribbon-h`,`${N}px`),F=y.length*(M+P),I.bend=A<700?.45:1,L.forEach(e=>{e.scale.set(M,N,1);let t=e.material.uniforms;t.uPlaneRes.value.set(M,N),t.uViewW.value=A,t.uViewH.value=j,t.uRadius.value=Math.max(6,M*.025)})}let K=new p(-10,-10),q=new n,J=!1,Y=0,X=0;v.addEventListener(`pointerdown`,e=>{J=!0,Y=e.clientX,X=0,v.setPointerCapture?.(e.pointerId)}),v.addEventListener(`pointermove`,e=>{let t=v.getBoundingClientRect();if(K.set((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height)*2+1),!J)return;let n=e.clientX-Y;Y=e.clientX,X+=Math.abs(n),I.drag-=n*1.4});function Z(e){let t=v.getBoundingClientRect(),n=new p((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height)*2+1);q.setFromCamera(n,T);let r=q.intersectObjects(L,!1)[0];return r?r.object.userData.index:-1}v.addEventListener(`pointerup`,e=>{if(J&&(J=!1,X<6)){let t=Z(e);t>=0&&x?.(t)}}),v.addEventListener(`pointercancel`,()=>{J=!1}),v.addEventListener(`pointerleave`,()=>{K.set(-10,-10)});function Q(e){return((e+F/2)%F+F)%F-F/2}function $(){if(!I.running)return;I.target=I.scrollBase+I.drag;let e=I.current;I.current+=(I.target-I.current)*.075;let t=Math.max(-1.1,Math.min(1.1,(I.current-e)/40));I.velocity+=(t-I.velocity)*.15;let n=0,r=1/0;L.forEach((e,t)=>{let i=Q(t*(M+P)-I.current);e.position.set(i,0,0);let a=e.material.uniforms;a.uVelocity.value=I.velocity,a.uBend.value=I.bend,Math.abs(i)<r&&(r=Math.abs(i),n=t)}),q.setFromCamera(K,T);let i=q.intersectObjects(L,!1)[0],a=i?i.object.userData.index:-1;a!==I.hovered&&(I.hovered=a,S?.(a>=0)),L.forEach((e,t)=>{e.userData.hover+=(+(t===a)-e.userData.hover)*.1,e.material.uniforms.uHover.value=e.userData.hover}),L.forEach((e,t)=>{R.has(t)&&B[t]<1&&(B[t]=Math.min(1,B[t]+.06),e.material.uniforms.uLoaded.value=e.material.uniforms.uTex.value?B[t]:0)}),n!==I.active&&(I.active=n,b?.(n),W()),C.render(w,T),requestAnimationFrame($)}return G(),window.addEventListener(`resize`,G),{setScroll(e){I.scrollBase=e},loadTextures(){V||(V=!0,W())},get total(){return F},start(){I.running||(I.running=!0,requestAnimationFrame($))},stop(){I.running=!1}}}export{v as initRibbon};