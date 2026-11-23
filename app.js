(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('glassCanvas'), wrap = $('canvasWrap');
  const gl = canvas.getContext('webgl2', {alpha:true, premultipliedAlpha:false, antialias:true, preserveDrawingBuffer:true});
  const state = {shape:'squircle', width:72, height:72, round:28, refract:42, blur:8, distort:35, opacity:32, glow:75, noise:12, tint:'#8edbff', image:null, imageTexture:null, imageAspect:1, showText:true, zoom:'fit'};
  let program, positionBuffer, texture, imageBitmap=null, pendingInstall=null, toastTimer;
  const vertex = `#version 300 es\nin vec2 a_position; out vec2 v_uv; void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
  const fragment = `#version 300 es
precision highp float; in vec2 v_uv; out vec4 outColor;
uniform vec2 u_resolution; uniform float u_time; uniform float u_imageAspect; uniform sampler2D u_image; uniform bool u_hasImage;
uniform float u_width,u_height,u_round,u_refract,u_blur,u_distort,u_opacity,u_glow,u_noise;
uniform vec3 u_tint; uniform int u_shape;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float sdRoundBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdDiamond(vec2 p){p=abs(p);return (p.x+p.y-0.83)*0.7071;}
void main(){
 vec2 uv=v_uv; vec2 p=(uv-.5)*2.; p.x*=u_resolution.x/u_resolution.y;
 float aspect=u_resolution.x/u_resolution.y; vec2 halfSize=vec2(u_width*.01*aspect,u_height*.01);
 vec2 q=p/halfSize; float d;
 if(u_shape==1) d=length(q)-.94;
 else if(u_shape==2) d=sdRoundBox(q,vec2(.88),u_round*.018);
 else if(u_shape==3) d=sdDiamond(q);
 else {float k=4.5; d=(pow(pow(abs(q.x),k)+pow(abs(q.y),k),1./k)-.94);}
 float aa=max(fwidth(d)*1.5,.001); float mask=1.-smoothstep(0.,aa,d); if(mask<=.001){outColor=vec4(0.);return;}
 float edge=1.-smoothstep(.0,.13,abs(d)); float inner=1.-smoothstep(-.20,-.01,d);
 vec2 normal=normalize(vec2(dFdx(d),dFdy(d))+vec2(.0001));
 float wave=sin(q.x*8.+u_time*.4)*cos(q.y*7.-u_time*.32);
 vec2 bend=normal*(.008+u_refract*.00055)*(1.+wave*u_distort*.018);
 vec2 sampleUV=uv+bend; if(u_imageAspect>1.001) sampleUV.x=.5+(sampleUV.x-.5)/u_imageAspect; else if(u_imageAspect<.999) sampleUV.y=.5+(sampleUV.y-.5)*u_imageAspect;
 vec3 base=vec3(.12,.22,.34);
 if(u_hasImage){base=texture(u_image,clamp(sampleUV,0.001,0.999)).rgb; if(u_blur>0.01){vec2 px=1./u_resolution*(u_blur*.55); vec3 b=base; b+=texture(u_image,clamp(sampleUV+vec2(px.x,0.),.001,.999)).rgb; b+=texture(u_image,clamp(sampleUV-vec2(px.x,0.),.001,.999)).rgb; b+=texture(u_image,clamp(sampleUV+vec2(0.,px.y),.001,.999)).rgb; b+=texture(u_image,clamp(sampleUV-vec2(0.,px.y),.001,.999)).rgb; base=mix(base,b/5.,.62);}}
 vec3 tint=u_tint; float tintMix=u_opacity*.0038;
 vec3 color=mix(base,tint,tintMix);
 float fresnel=pow(1.-abs(dot(normalize(vec3(normal,1.)),vec3(0.,0.,1.))),3.);
 float rim=edge*u_glow*.010 + pow(max(0.,1.-abs(d)*5.),4.)*u_glow*.10;
 float spec=pow(max(0.,1.-length(q-vec2(-.28,.34))*1.7),18.)*.55 + pow(max(0.,1.-length(q-vec2(.55,-.52))*2.2),24.)*.3;
 float streak=pow(max(0.,1.-abs(q.y+q.x*.22-.62)*15.),12.)*.20;
 float grain=(hash(gl_FragCoord.xy+u_time)-.5)*u_noise*.002;
 color+=tint*(rim+fresnel*.08)+vec3(1.)*(spec+streak)*(.35+u_glow*.008)+grain;
 color+=vec3(.025,.10,.18)*inner*u_opacity*.0015;
 float alpha=mask*clamp(.25+u_opacity*.006+edge*.42*u_glow*.01+spec*.22,0.,.98);
 outColor=vec4(clamp(color,0.,1.),alpha);
}`;
  function shader(type, source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  function initGL(){if(!gl){toast('Seu navegador não oferece WebGL 2. Tente Chrome, Edge ou Safari atualizado.');return false;}program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);positionBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([25,40,60,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);return true;}
  function hexRGB(hex){return [parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255];}
  function render(width,height,time=performance.now()/1000){
    if(!gl||!program)return;
    const resized = canvas.width!==width || canvas.height!==height;
    if(resized){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);
    const loc=gl.getAttribLocation(program,'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    const set=(n,v)=>gl.uniform1f(gl.getUniformLocation(program,n),v);
    const set2=(n,a,b)=>gl.uniform2f(gl.getUniformLocation(program,n),a,b);
    set2('u_resolution',width,height);
    set('u_time',time);
    set('u_imageAspect',imageBitmap?imageBitmap.width/imageBitmap.height:1);
    gl.uniform1i(gl.getUniformLocation(program,'u_image'),0);
    gl.uniform1i(gl.getUniformLocation(program,'u_hasImage'),imageBitmap?1:0);
    set('u_width',state.width);set('u_height',state.height);set('u_round',state.round);
    set('u_refract',state.refract);set('u_blur',state.blur);set('u_distort',state.distort);
    set('u_opacity',state.opacity);set('u_glow',state.glow);set('u_noise',state.noise);
    gl.uniform3fv(gl.getUniformLocation(program,'u_tint'),hexRGB(state.tint));
    gl.uniform1i(gl.getUniformLocation(program,'u_shape'),({squircle:0,circle:1,rounded:2,diamond:3})[state.shape]);
    // Draw the actual glass mesh. Without this call the canvas stays transparent,
    // so shape selection and imported images appear to do nothing.
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  function fit(){const r=wrap.getBoundingClientRect();const side=Math.max(320,Math.floor(Math.min(r.width*.8,r.height*.84)));render(side,side);$('dimensionLabel').textContent=`Prévia · ${side} × ${side}`;}
  function refresh(){const w=Math.max(320,Math.floor(Math.min(wrap.clientWidth*.8,wrap.clientHeight*.84)));render(w,w);$('emptyHint').style.display= imageBitmap?'none':'flex';$('stageMode').textContent=imageBitmap?'· Imagem + vidro':'· Fundo transparente';}
  function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
  function setVal(id,key){$(id).addEventListener('input',e=>{state[key]=+e.target.value;$(id+'Val').textContent=e.target.value+'%';refresh();});}
  ['width','height','round','refract','blur','distort','opacity','glow','noise'].forEach(id=>setVal(id,id));
  $('shapeGrid').addEventListener('click',e=>{const b=e.target.closest('[data-shape]');if(!b)return;state.shape=b.dataset.shape;document.querySelectorAll('.shape-option').forEach(x=>x.classList.toggle('selected',x===b));refresh();});
  $('imageInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{imageBitmap=await createImageBitmap(file);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,imageBitmap);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);$('uploadZone').querySelector('strong').textContent=file.name;refresh();toast('Imagem carregada. O exterior da forma continua transparente.');}catch(err){toast('Não foi possível abrir essa imagem.');}});
  $('tintColor').addEventListener('input',e=>{state.tint=e.target.value;refresh();});$('clearTint').onclick=()=>{$('tintColor').value='#8edbff';state.tint='#8edbff';refresh();};
  $('resetBtn').onclick=()=>{Object.assign(state,{shape:'squircle',width:72,height:72,round:28,refract:42,blur:8,distort:35,opacity:32,glow:75,noise:12,tint:'#8edbff'});for(const k of ['width','height','round','refract','blur','distort','opacity','glow','noise']){$(k).value=state[k];$(k+'Val').textContent=state[k]+'%';}document.querySelectorAll('.shape-option').forEach(b=>b.classList.toggle('selected',b.dataset.shape==='squircle'));$('tintColor').value=state.tint;refresh();toast('Ajustes restaurados.');};
  $('checkerBtn').onclick=()=>{wrap.classList.toggle('checkerboard');$('checkerBtn').classList.toggle('active');};$('centerBtn').onclick=refresh;$('zoomSelect').onchange=refresh;
  async function exportPNG(){const size=+$('exportSize').value||4096;try{render(size,size);await new Promise(r=>requestAnimationFrame(r));const out=document.createElement('canvas');out.width=size;out.height=size;const c=out.getContext('2d');c.clearRect(0,0,size,size);c.drawImage(canvas,0,0,size,size);const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(!blob)throw new Error('Falha ao gerar PNG');const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`glass-studio-${size}x${size}.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast(`PNG ${size} × ${size} exportado com transparência.`);refresh();}catch(err){console.error(err);toast('Falha ao exportar. Tente uma resolução menor.');}}
  $('exportBtn').onclick=exportPNG;$('exportBtnSide').onclick=exportPNG;
  window.addEventListener('resize',()=>{clearTimeout(window.__glassResize);window.__glassResize=setTimeout(refresh,100);});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();pendingInstall=e;$('installBtn').hidden=false;});$('installBtn').onclick=async()=>{if(!pendingInstall)return;pendingInstall.prompt();await pendingInstall.userChoice;pendingInstall=null;$('installBtn').hidden=true;};
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  try{if(initGL()){refresh();$('saveState').textContent='● Pronto para criar';}}catch(e){console.error(e);toast('Erro ao iniciar o renderizador WebGL.');}
})();
