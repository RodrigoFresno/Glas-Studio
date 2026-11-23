(() => {
 const $=id=>document.getElementById(id), canvas=$('glassCanvas'),wrap=$('canvasWrap');
 const gl=canvas.getContext('webgl',{alpha:true, premultipliedAlpha:false, antialias:true, preserveDrawingBuffer:true});
 const state={shape:0,width:72,height:72,round:28,refract:42,blur:8,distort:35,opacity:32,glow:75,noise:12,tint:'#8edbff'};
 let image=null,texture=null,program=null,loc={},toastTimer;
 const vs='attribute vec2 a_pos; varying vec2 v_uv; void main(){v_uv=a_pos*.5+.5; gl_Position=vec4(a_pos,0.,1.);}';
 const fs=`precision highp float;
 varying vec2 v_uv;
 uniform vec2 u_resolution; uniform vec2 u_size; uniform vec2 u_imageSize;
 uniform float u_shape,u_round,u_refract,u_blur,u_distort,u_opacity,u_glow,u_noise,u_hasImage,u_time;
 uniform vec3 u_tint; uniform sampler2D u_image;
 float sdRoundBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))-r+min(max(q.x,q.y),0.);}
 float sdDiamond(vec2 p){return (abs(p.x)+abs(p.y)-1.)*.7071;}
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){
   vec2 p=(v_uv-.5)*2.; vec2 halfSize=u_size*.5;
   float d;
   if(u_shape<.5){float r=mix(.08,.48,u_round);d=sdRoundBox(p,halfSize,r*min(halfSize.x,halfSize.y));}
   else if(u_shape<1.5){d=length(p/halfSize)-1.;}
   else if(u_shape<2.5){d=sdRoundBox(p,halfSize,.22*min(halfSize.x,halfSize.y));}
   else {d=sdDiamond(p/max(halfSize,vec2(.001)))*min(halfSize.x,halfSize.y);}
   float aa=max(1.5/u_resolution.x,1.5/u_resolution.y);
   float mask=1.-smoothstep(-aa,aa,d);
   if(mask<.001){gl_FragColor=vec4(0.);return;}
   vec2 q=p/halfSize;
   vec2 n=normalize(vec2(q.x/(abs(q.x)+.16),q.y/(abs(q.y)+.16))+.0001);
   float edge=1.-smoothstep(.0,.16,abs(d));
   float wave=sin(q.x*8.+u_time*.35)*cos(q.y*7.-u_time*.27);
   vec2 bend=n*(.004+u_refract*.00024)*(1.+wave*u_distort*.012);
   vec2 uv=v_uv+bend;
   vec2 fit=vec2(1.);
   float ia=u_imageSize.x/max(1.,u_imageSize.y), ca=u_resolution.x/u_resolution.y;
   if(ia>ca)fit.x=ca/ia;else fit.y=ia/ca;
   uv=(uv-.5)/fit+.5;
   vec3 base=vec3(.14,.27,.42);
   if(u_hasImage>.5){
     vec2 off=vec2(u_blur*.00042);
     vec4 tex=texture2D(u_image,clamp(uv,vec2(.002),vec2(.998)));
     vec4 blur=texture2D(u_image,clamp(uv+vec2(off.x,0.),vec2(.002),vec2(.998)))+
               texture2D(u_image,clamp(uv-vec2(off.x,0.),vec2(.002),vec2(.998)))+
               texture2D(u_image,clamp(uv+vec2(0.,off.y),vec2(.002),vec2(.998)))+
               texture2D(u_image,clamp(uv-vec2(0.,off.y),vec2(.002),vec2(.998)));
     base=mix(tex.rgb,blur.rgb*.25,clamp(u_blur/30.,0.,.72));
   } else {
     base=mix(vec3(.10,.23,.39),vec3(.34,.52,.72),clamp(v_uv.y,0.,1.));
   }
   float fresnel=pow(1.-abs(n.y*.28+.72),3.);
   float spec=pow(max(0.,1.-length(q-vec2(-.34,.42))*1.55),24.)*.95+
              pow(max(0.,1.-length(q-vec2(.48,-.55))*2.),32.)*.6;
   float streak=pow(max(0.,1.-abs(q.y+q.x*.2-.62)*17.),14.)*.35;
   float rim=edge*(.20+u_glow*.018);
   vec3 color=mix(base,u_tint,.06+u_opacity*.0028);
   color+=u_tint*(rim+fresnel*.18)+vec3(1.)*(spec+streak)*(.52+u_glow*.006);
   color+=vec3(.10,.20,.30)*pow(max(0.,1.-abs(d)*3.),3.)*.18;
   color+=(hash(gl_FragCoord.xy+u_time)-.5)*u_noise*.0018;
   float alpha=mask*clamp(.40+u_opacity*.0035+edge*(.24+u_glow*.004)+spec*.18,0.,.985);
   gl_FragColor=vec4(clamp(color,0.,1.),alpha);
 }`;
 function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
 function init(){
   if(!gl)throw Error('WebGL não está disponível neste navegador.');
   program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   gl.useProgram(program);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const pos=gl.getAttribLocation(program,'a_pos');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
   ['u_resolution','u_size','u_imageSize','u_shape','u_round','u_refract','u_blur','u_distort','u_opacity','u_glow','u_noise','u_hasImage','u_time','u_tint','u_image'].forEach(k=>loc[k]=gl.getUniformLocation(program,k));
   texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.uniform1i(loc.u_image,0);
 }
 function rgb(hex){return [parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255];}
 function draw(w,h,exporting=false){
   const dpr=exporting?1:Math.min(window.devicePixelRatio||1,2),cw=Math.max(1,Math.round(w*dpr)),ch=Math.max(1,Math.round(h*dpr));
   if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
   gl.viewport(0,0,cw,ch);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);
   gl.uniform2f(loc.u_resolution,cw,ch);gl.uniform2f(loc.u_size,state.width/100,state.height/100);
   gl.uniform2f(loc.u_imageSize,image?image.width:1,image?image.height:1);
   gl.uniform1f(loc.u_shape,state.shape);gl.uniform1f(loc.u_round,state.round/50);
   gl.uniform1f(loc.u_refract,state.refract);gl.uniform1f(loc.u_blur,state.blur);
   gl.uniform1f(loc.u_distort,state.distort);gl.uniform1f(loc.u_opacity,state.opacity);
   gl.uniform1f(loc.u_glow,state.glow);gl.uniform1f(loc.u_noise,state.noise);
   gl.uniform1f(loc.u_hasImage,image?1:0);gl.uniform1f(loc.u_time,performance.now()*.001);
   gl.uniform3fv(loc.u_tint,rgb(state.tint));gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
   if(image)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
   else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([100,150,190,255]));
   gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 }
 function refresh(){const r=wrap.getBoundingClientRect();draw(Math.max(280,r.width*.8),Math.max(280,r.height*.84));$('emptyHint').style.display=image?'none':'flex';$('stageMode').textContent=image?'· Imagem refratada':'· Vidro líquido';$('dimensionLabel').textContent='Prévia · '+canvas.width+' × '+canvas.height;}
 function toast(m){const el=$('toast');el.textContent=m;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800);}
 function setVal(id){$(id).addEventListener('input',e=>{state[id]=+e.target.value;$(id+'Val').textContent=e.target.value+'%';refresh();});}
 ['width','height','round','refract','blur','distort','opacity','glow','noise'].forEach(setVal);
 $('shapeGrid').addEventListener('click',e=>{const b=e.target.closest('[data-shape]');if(!b)return;state.shape=({squircle:0,circle:1,rounded:2,diamond:3})[b.dataset.shape];document.querySelectorAll('.shape-option').forEach(x=>x.classList.toggle('selected',x===b));refresh();});
 $('imageInput').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){toast('Escolha um arquivo de imagem.');return;}const url=URL.createObjectURL(f),im=new Image();im.onload=()=>{image=im;$('uploadZone').querySelector('strong').textContent=f.name;refresh();toast('Imagem carregada.');URL.revokeObjectURL(url);};im.onerror=()=>{URL.revokeObjectURL(url);toast('Não foi possível abrir a imagem.');};im.src=url;});
 $('tintColor').addEventListener('input',e=>{state.tint=e.target.value;refresh();});$('clearTint').onclick=()=>{$('tintColor').value='#8edbff';state.tint='#8edbff';refresh();};
 $('resetBtn').onclick=()=>{Object.assign(state,{shape:0,width:72,height:72,round:28,refract:42,blur:8,distort:35,opacity:32,glow:75,noise:12,tint:'#8edbff'});['width','height','round','refract','blur','distort','opacity','glow','noise'].forEach(k=>{$(k).value=state[k];$(k+'Val').textContent=state[k]+'%';});document.querySelectorAll('.shape-option').forEach(b=>b.classList.toggle('selected',b.dataset.shape==='squircle'));$('tintColor').value=state.tint;refresh();};
 $('checkerBtn').onclick=()=>{wrap.classList.toggle('checkerboard');$('checkerBtn').classList.toggle('active');};$('centerBtn').onclick=refresh;$('zoomSelect').onchange=refresh;
 async function exportPNG(){const size=+$('exportSize').value||4096;try{draw(size,size,true);const blob=await new Promise(res=>canvas.toBlob(res,'image/png'));if(!blob)throw Error('Exportação falhou');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='glass-studio-'+size+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('PNG transparente exportado.');}catch(e){toast('Erro na exportação: '+e.message);}finally{refresh();}}
 $('exportBtn').onclick=exportPNG;$('exportBtnSide').onclick=exportPNG;
 window.addEventListener('resize',()=>{clearTimeout(window.__glassResize);window.__glassResize=setTimeout(refresh,100);});
 let prompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;$('installBtn').hidden=false;});$('installBtn').onclick=async()=>{if(prompt){prompt.prompt();await prompt.userChoice;prompt=null;}};
 if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
 try{init();refresh();$('saveState').textContent='● Renderizador WebGL ativo';}catch(e){console.error(e);toast('Falha no renderizador: '+e.message);$('saveState').textContent='● Erro gráfico';}
})();