import * as THREE from './vendor/three.module.min.js';
const catalog=window.dolceCatalog,stage=document.getElementById('product-stage'),host=document.getElementById('product-webgl');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{stage.dataset.renderer='fallback';}
if(renderer&&catalog){
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(31,1,.1,50);camera.position.set(0,.05,9.5);
 scene.add(new THREE.HemisphereLight(0xffffff,0xd8c6b9,2.2));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(-4,6,8);scene.add(light);const fill=new THREE.DirectionalLight(0xffe5de,.7);fill.position.set(5,2,4);scene.add(fill);
 const records=new Map();let state=catalog.getState(),tilt={x:0,y:0},explore=state.explore,visible=true,allReady=false,raf=0,lastTime=0;
 function sampleImage(image){
  const c=document.createElement('canvas');c.width=128;c.height=128;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,128,128);const data=ctx.getImageData(0,0,128,128).data;
  let minX=127,maxX=0,minY=127,maxY=0;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(data[(y*128+x)*4+3]>45){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
  const rows=[];for(let y=minY;y<=maxY;y++){let lo=128,hi=-1;for(let x=minX;x<=maxX;x++)if(data[(y*128+x)*4+3]>45){lo=Math.min(lo,x);hi=Math.max(hi,x)}rows.push(hi>=lo?[Math.max(minX,lo-1)/128,Math.min(maxX+1,hi+2)/128]:[minX/128,(maxX+1)/128])}
  return{minX:minX/128,maxX:(maxX+1)/128,minY:minY/128,maxY:(maxY+1)/128,rows};
 }
 function makeObject(texture,kind){
  const image=texture.image,bounds=sampleImage(image),height=kind==='bowl'?2.45:3.65,width=height*(image.width*(bounds.maxX-bounds.minX))/(image.height*(bounds.maxY-bounds.minY));
  const nx=36,ny=56,positions=[],uvs=[],indices=[],depth=kind==='pouch'?.24:.38;
  for(let row=0;row<=ny;row++){const v=row/ny,range=bounds.rows[Math.min(bounds.rows.length-1,Math.round(v*(bounds.rows.length-1)))];for(let col=0;col<=nx;col++){const u=col/nx,tx=THREE.MathUtils.lerp(range[0],range[1],u),x=((tx-bounds.minX)/(bounds.maxX-bounds.minX)-.5)*width,y=(.5-v)*height;const bulge=Math.pow(Math.max(0,1-(u*2-1)**2),.55)*Math.sin(Math.PI*v)**.3;const fold=kind==='pouch'?.012*Math.sin(u*29+v*9)*Math.pow(Math.abs(u*2-1),5):0;positions.push(x,y,depth*bulge+fold);uvs.push(tx,1-THREE.MathUtils.lerp(bounds.minY,bounds.maxY,v));}}
  for(let row=0;row<ny;row++)for(let col=0;col<nx;col++){const a=row*(nx+1)+col,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.05,roughness:.77,metalness:0,side:THREE.FrontSide});const group=new THREE.Group();group.add(new THREE.Mesh(geometry,material));
  // The curved front and closed side shell give the object physical depth. No unseen label is invented.
  const edge=[];for(let c=0;c<=nx;c++)edge.push(c);for(let r=1;r<=ny;r++)edge.push(r*(nx+1)+nx);for(let c=nx-1;c>=0;c--)edge.push(ny*(nx+1)+c);for(let r=ny-1;r>0;r--)edge.push(r*(nx+1));
  const shellPositions=[],shellIndices=[];edge.forEach((i,n)=>{const x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2];shellPositions.push(x,y,z-.005,x*.99,y,-depth*.65);const a=n*2,b=((n+1)%edge.length)*2;shellIndices.push(a,a+1,b,b,a+1,b+1)});
  const shellGeo=new THREE.BufferGeometry();shellGeo.setAttribute('position',new THREE.Float32BufferAttribute(shellPositions,3));shellGeo.setIndex(shellIndices);shellGeo.computeVertexNormals();const shellMat=new THREE.MeshStandardMaterial({color:kind==='pouch'?0xe4d6c5:0x6d3823,transparent:true,opacity:.82,roughness:.55,side:THREE.DoubleSide});group.add(new THREE.Mesh(shellGeo,shellMat));
  return{group,materials:[material,shellMat],target:{x:0,y:0,z:0,scale:0,ry:0,opacity:0},baseHeight:height};
 }
 function keyFor(index){const p=catalog.products[index];return p.cutouts[state.size===90?0:1]}
 function requestObject(index){const key=keyFor(index);if(records.has(key))return;records.set(key,{loading:true});catalog.loadImage(key).then(image=>{const texture=new THREE.Texture(image);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);const record=makeObject(texture,catalog.products[index].kind);record.group.scale.setScalar(.001);record.group.visible=false;scene.add(record.group);records.set(key,record);updateTargets();wake();}).catch(()=>{records.set(key,{loading:true,failed:true});stage.classList.remove('webgl-ready');stage.dataset.renderer='fallback';});}
 function updateTargets(){
  const count=catalog.products.length,mobile=stage.clientWidth<700,spacing=mobile?2.02:3.04;const wanted=[];
  for(let offset=-1;offset<=1;offset++){const index=(state.index+offset+count)%count;wanted.push({key:keyFor(index),offset,index});requestObject(index)}
  records.forEach((record,key)=>{if(record.loading)return;const item=wanted.find(x=>x.key===key);record.target=item?{x:-item.offset*spacing,y:item.offset===0?-.03:-.02,z:item.offset===0?.35:-.85,scale:item.offset===0?1.08:(mobile?.65:.76),ry:item.offset===0?0:item.offset*.4,opacity:item.offset===0?1:.74}:{...record.target,scale:.35,z:-2.5,opacity:0};if(item&&!record.placed){const t=record.target;record.group.position.set(t.x,t.y,t.z);record.group.scale.setScalar(t.scale);record.group.rotation.y=t.ry;record.materials.forEach((m,i)=>{m.opacity=t.opacity*(i?.82:1)});record.placed=true}record.group.visible=true;});
  allReady=wanted.every(x=>records.has(x.key)&&!records.get(x.key).loading);if(!allReady){stage.classList.remove('webgl-ready');stage.dataset.renderer='preview'}
 }
 function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<700?40:31;camera.position.z=w<700?7.1:9.5;camera.updateProjectionMatrix();updateTargets();wake()}
 const observer=new ResizeObserver(resize);observer.observe(stage);
 function frame(time){raf=0;if(!visible||document.hidden)return;const delta=Math.min(.05,(time-lastTime)/1000||.016);lastTime=time;const alpha=reduceMotion.matches?1:1-Math.exp(-delta*10);let unsettled=false;
  records.forEach((r,key)=>{if(r.loading)return;const t=r.target,active=key===keyFor(state.index),ry=t.ry+(active?tilt.x*(explore?.57:.15):0),rx=active?tilt.y*(explore?.23:.07):0;
   r.group.position.lerp(new THREE.Vector3(t.x,t.y,t.z),alpha);r.group.scale.lerp(new THREE.Vector3(t.scale,t.scale,t.scale),alpha);r.group.rotation.y=THREE.MathUtils.lerp(r.group.rotation.y,reduceMotion.matches?0:ry,alpha);r.group.rotation.x=THREE.MathUtils.lerp(r.group.rotation.x,reduceMotion.matches?0:rx,alpha);
   r.materials.forEach((m,i)=>{const desired=t.opacity*(i?.82:1);m.opacity=THREE.MathUtils.lerp(m.opacity,desired,alpha);if(Math.abs(m.opacity-desired)>.002)unsettled=true});r.group.visible=r.materials[0].opacity>.005;
   if(r.group.position.distanceTo(new THREE.Vector3(t.x,t.y,t.z))>.002||Math.abs(r.group.rotation.y-ry)>.002||Math.abs(r.group.rotation.x-rx)>.002||Math.abs(r.group.scale.x-t.scale)>.002)unsettled=true;
  });renderer.render(scene,camera);if(allReady&&!renderer.getContext().isContextLost()){stage.classList.add('webgl-ready');stage.dataset.renderer='webgl'}if(unsettled&&!reduceMotion.matches)wake();
 }
 function wake(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(frame)}
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();else if(raf){cancelAnimationFrame(raf);raf=0}},{rootMargin:'100px'}).observe(stage);
 document.addEventListener('visibilitychange',wake);window.addEventListener('dolce:selection',e=>{state={...state,...e.detail};tilt={x:0,y:0};updateTargets();wake()});window.addEventListener('dolce:tilt',e=>{tilt=e.detail;wake()});window.addEventListener('dolce:explore',e=>{explore=e.detail.active;tilt={x:0,y:0};wake()});reduceMotion.addEventListener('change',wake);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stage.classList.remove('webgl-ready');stage.dataset.renderer='fallback'});renderer.domElement.addEventListener('webglcontextrestored',()=>{updateTargets();wake()});resize();
}
