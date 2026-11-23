(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('glassCanvas'), wrap = $('canvasWrap');
  const ctx = canvas.getContext('2d', {alpha:true, desynchronized:true});
  const state = {shape:'squircle',width:72,height:72,round:28,refract:42,blur:8,distort:35,opacity:32,glow:75,noise:12,tint:'#8edbff'};
  let sourceImage=null, toastTimer=null;
  function hexRGB(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];}
  function pathShape(c,x,y,w,h){
    c.beginPath();
    if(state.shape==='circle'){c.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);}
    else if(state.shape==='diamond'){c.moveTo(x+w/2,y);c.lineTo(x+w,y+h/2);c.lineTo(x+w/2,y+h);c.lineTo(x,y+h/2);c.closePath();}
    else {const r=state.shape==='rounded'?Math.min(w,h)*.22:Math.min(w,h)*state.round/100*.72;c.roundRect(x,y,w,h,Math.min(r,w/2,h/2));}
  }
  function draw(width,height){
    if(!ctx)return;
    canvas.width=width;canvas.height=height;
    const c=ctx,scale=width/1000;
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,width,height);
    const w=state.width/100*width,h=state.height/100*height,x=(width-w)/2,y=(height-h)/2;
    c.save();pathShape(c,x,y,w,h);c.clip();
    if(sourceImage){
      const ar=sourceImage.width/sourceImage.height, box=w/h;
      let dw=w,dh=h;if(ar>box){dh=h;dw=h*ar;}else{dw=w;dh=w/ar;}
      c.filter=state.blur>0?'blur('+Math.max(0,state.blur*.12*scale)+'px)':'none';
      c.drawImage(sourceImage,x+(w-dw)/2,y+(h-dh)/2,dw,dh);c.filter='none';
    } else {
      const bg=c.createLinearGradient(x,y,x+w,y+h);
      bg.addColorStop(0,'rgba(210,246,255,.42)');bg.addColorStop(.48,'rgba(80,165,220,.24)');bg.addColorStop(1,'rgba(135,115,255,.34)');
      c.fillStyle=bg;c.fillRect(x,y,w,h);
    }
    const [tr,tg,tb]=hexRGB(state.tint);
    const tint=c.createLinearGradient(x,y,x+w,y+h);
    tint.addColorStop(0,'rgba('+tr+','+tg+','+tb+','+(.05+state.opacity/100*.22)+')');
    tint.addColorStop(1,'rgba(110,135,255,'+(.04+state.opacity/100*.16)+')');
    c.fillStyle=tint;c.fillRect(x,y,w,h);
    const shine=c.createLinearGradient(x,y,x+w*.72,y+h);
    shine.addColorStop(0,'rgba(255,255,255,'+(.22+state.glow/100*.36)+')');
    shine.addColorStop(.22,'rgba(255,255,255,.035)');shine.addColorStop(.65,'rgba(255,255,255,0)');shine.addColorStop(1,'rgba(160,220,255,.12)');
    c.fillStyle=shine;c.fillRect(x,y,w,h);
    const gloss=c.createRadialGradient(x+w*.25,y+h*.13,0,x+w*.25,y+h*.13,w*.65);
    gloss.addColorStop(0,'rgba(255,255,255,.32)');gloss.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=gloss;c.fillRect(x,y,w,h);
    c.restore();
    c.save();pathShape(c,x,y,w,h);
    c.lineWidth=Math.max(1.5,3.2*scale);c.strokeStyle='rgba(235,250,255,'+(.45+state.glow/100*.45)+')';c.shadowColor='rgba('+tr+','+tg+','+tb+',.8)';c.shadowBlur=state.glow*.18*scale;c.stroke();
    c.shadowBlur=0;c.lineWidth=Math.max(1,1.1*scale);c.strokeStyle='rgba(255,255,255,.8)';c.stroke();
    c.restore();
    c.save();c.globalCompositeOperation='screen';c.lineCap='round';
    c.beginPath();c.moveTo(x+w*.18,y+h*.09);c.quadraticCurveTo(x+w*.45,y+h*.015,x+w*.76,y+h*.13);c.strokeStyle='rgba(255,255,255,'+(.3+state.glow/100*.48)+')';c.lineWidth=Math.max(2,w*.012);c.shadowColor='#bceeff';c.shadowBlur=state.glow*.24*scale;c.stroke();
    c.beginPath();c.moveTo(x+w*.09,y+h*.28);c.quadraticCurveTo(x+w*.04,y+h*.48,x+w*.10,y+h*.68);c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=Math.max(1,w*.004);c.stroke();c.restore();
    if(state.noise>0){const step=Math.max(5,Math.round(18/scale));c.save();c.beginPath();pathShape(c,x,y,w,h);c.clip();c.fillStyle='rgba(255,255,255,'+(state.noise/1000)+')';for(let py=y;py<y+h;py+=step)for(let px=x;px<x+w;px+=step)if(((px*13+py*7)%11)<3)c.fillRect(px,py,Math.max(1,scale),Math.max(1,scale));c.restore();}
  }
  function refresh(){
    const side=Math.max(320,Math.floor(Math.min(wrap.clientWidth*.8,wrap.clientHeight*.84)));
    draw(side,side);
    $('emptyHint').style.display=sourceImage?'none':'flex';
    $('stageMode').textContent=sourceImage?'· Imagem + vidro':'· Fundo transparente';
    $('dimensionLabel').textContent='Prévia · '+side+' × '+side;
  }
  function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800);}
  function setVal(id,key){$(id).addEventListener('input',e=>{state[key]=+e.target.value;$(id+'Val').textContent=e.target.value+'%';refresh();});}
  ['width','height','round','refract','blur','distort','opacity','glow','noise'].forEach(id=>setVal(id,id));
  $('shapeGrid').addEventListener('click',e=>{const b=e.target.closest('[data-shape]');if(!b)return;state.shape=b.dataset.shape;document.querySelectorAll('.shape-option').forEach(x=>x.classList.toggle('selected',x===b));refresh();});
  $('imageInput').addEventListener('change',e=>{const file=e.target.files&&e.target.files[0];if(!file)return;const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{sourceImage=img;$('uploadZone').querySelector('strong').textContent=file.name;URL.revokeObjectURL(url);refresh();toast('Imagem carregada no vidro.');};img.onerror=()=>{URL.revokeObjectURL(url);toast('Não foi possível abrir essa imagem.');};img.src=url;});
  $('tintColor').addEventListener('input',e=>{state.tint=e.target.value;refresh();});
  $('clearTint').onclick=()=>{$('tintColor').value='#8edbff';state.tint='#8edbff';refresh();};
  $('resetBtn').onclick=()=>{Object.assign(state,{shape:'squircle',width:72,height:72,round:28,refract:42,blur:8,distort:35,opacity:32,glow:75,noise:12,tint:'#8edbff'});for(const k of ['width','height','round','refract','blur','distort','opacity','glow','noise']){$(k).value=state[k];$(k+'Val').textContent=state[k]+'%';}document.querySelectorAll('.shape-option').forEach(b=>b.classList.toggle('selected',b.dataset.shape==='squircle'));$('tintColor').value=state.tint;refresh();};
  $('checkerBtn').onclick=()=>{wrap.classList.toggle('checkerboard');$('checkerBtn').classList.toggle('active');};$('centerBtn').onclick=refresh;$('zoomSelect').onchange=refresh;
  async function exportPNG(){const size=+$('exportSize').value||4096;try{draw(size,size);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNG');const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='glass-studio-'+size+'x'+size+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('PNG '+size+' × '+size+' exportado com transparência.');}catch(err){toast('Falha ao exportar PNG.');}finally{refresh();}}
  $('exportBtn').onclick=exportPNG;$('exportBtnSide').onclick=exportPNG;
  window.addEventListener('resize',()=>{clearTimeout(window.__glassResize);window.__glassResize=setTimeout(refresh,120);});
  let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installBtn').hidden=false;});$('installBtn').onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installBtn').hidden=true;};
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  try{refresh();$('saveState').textContent='● Pronto para criar';}catch(e){console.error(e);toast('Erro ao iniciar o editor: '+e.message);}
})();