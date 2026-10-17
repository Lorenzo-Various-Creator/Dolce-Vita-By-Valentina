'use strict';
const FOOD='https://www.ifood.com.br/delivery/sao-bernardo-do-campo-sp/dolce-vita-by-valentina-centro/991f2c4e-e289-4229-b5d5-211f7b026433';
const products=[
{name:'Ninho',description:'Chocolate branco e uma generosa camada de Leite Ninho. Delicadeza em cada mordida.',photos:['hd-202605292004_TASI_i.jpg','hd-202605292006_688E_i.jpg'],ids:['9c916969-1f3b-4121-90a9-cabbcb06baaa','43d52eab-18ea-4cce-a7c4-7fd912502dea']},
{name:'Chocolate intenso',description:'Chocolate ao leite com finalização em chocolate 50% cacau. Para quem ama intensidade.',photos:['hd-202605292008_N3CF_i.jpg','hd-202605292011_2K33_i.jpg'],ids:['0de67df9-bb80-4bd9-97f3-122fa2234faf','e2e71733-99b3-49e4-a124-75573d1a4c37']},
{name:'Morango',description:'Chocolate branco e Nesquik de morango. Um encontro doce, cremoso e crocante.',photos:['hd-202605291942_ORXI_i.jpg','hd-202605291946_4G05_i.jpg'],ids:['c161c935-bd75-46b1-be53-345c3f198471','8465c1de-e80f-479c-8e85-c98afbf975b6']},
{name:'Choconinho',description:'Chocolate ao leite e Leite Ninho juntos em uma combinação de dar água na boca.',photos:['hd-202605292026_AMH5_i.jpg','hd-202605292022_088M_i.jpg'],ids:['2d157756-6485-4897-8b2f-03f2eef22d3b','e5521e0a-6e12-4105-9203-f7ccd89032c8']},
{name:'Sensação',description:'Pipoca banhada em chocolate ao leite e finalizada com cobertura sabor morango.',photos:['hd-202605292013_7726_i.jpg','hd-202605292019_3222_i.jpg'],ids:['724d9835-80cd-4447-81c8-5643024bdd43','b7666df8-232b-46d0-a1d0-9cf2abc39b7b']},
{name:'Ovomaltine',description:'A novidade da Dolce Vita combina pipoca e a crocância do Ovomaltine. Conheça o lançamento!',photos:['ovomaltine-original.jpg'],unconfirmed:true}
];
products.forEach((p,i)=>{p.cutouts=[['ninho90','ninho150'],['chocolate90','chocolate150'],['morango90','morango150'],['choconinho90','choconinho150'],['sensacao90','sensacao150'],['ovomaltine','ovomaltine']][i];p.kind=i===5?'bowl':'pouch'});
products.push({name:'Suprema Nutella',description:'Camadas de Nutella e pipoca caramelizada de milho de canjica. Escolha sua cobertura e seu topping no iFood.',cutouts:['suprema','suprema'],kind:'cup',fixedSize:'500 ml',fixedPrice:39.99,ids:['6c026f58-6f28-416b-908a-625b12a0ab7f','6c026f58-6f28-416b-908a-625b12a0ab7f']});
const params=new URLSearchParams(location.search);let size=params.get('tamanho')==='150'?150:90;let selected=Math.max(0,products.findIndex(p=>p.name.toLowerCase()===params.get('sabor')));let explore3d=false,dragStart=null,dragged=false,wheelTime=0;
const stage=document.getElementById('product-stage'),fallback=document.getElementById('product-fallback'),info=document.getElementById('products'),flavorList=document.getElementById('flavor-list');
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const wrap=i=>(i+products.length)%products.length;
const compactImages=matchMedia('(max-width:760px)').matches,imageCache=new Map();
const imageUrl=key=>`assets/cutouts/${key}-${compactImages?'560':'800'}.webp`;
function loadImage(key,priority='auto'){
 const url=imageUrl(key);if(imageCache.has(url))return imageCache.get(url);
 const promise=new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.fetchPriority=priority;image.onload=async()=>{try{await image.decode()}catch{}resolve(image)};image.onerror=()=>{imageCache.delete(url);reject(new Error('Imagem indisponível'))};image.src=url});
 imageCache.set(url,promise);return promise;
}
const fallbackImages={};
for(const role of ['selected','next','previous']){const image=document.createElement('img');image.className=`fallback-${role}`;image.width=1024;image.height=1536;image.alt='';image.decoding='async';image.fetchPriority=role==='selected'?'high':'auto';fallbackImages[role]=image;fallback.append(image)}
let stageNearby=false,modelPromise=null,prefetchTimer;
function visibleImages(){return [selected,wrap(selected+1),wrap(selected-1)].map(i=>products[i].cutouts[size===90?0:1])}
function loadModels(){
 if(modelPromise)return modelPromise;
 modelPromise=Promise.allSettled(visibleImages().map((key,i)=>loadImage(key,i===0?'high':'auto'))).then(()=>import('./product-3d.js?v=fast-images')).catch(()=>{stage.dataset.renderer='fallback'});
 return modelPromise;
}
function warmNextFlavors(){
 clearTimeout(prefetchTimer);
 const connection=navigator.connection;if(!stageNearby||connection?.saveData||/2g/.test(connection?.effectiveType||''))return;
 const requestedSize=size;
 prefetchTimer=setTimeout(async()=>{for(let offset=2;offset<products.length-1;offset++){if(size!==requestedSize||!stageNearby)return;const p=products[wrap(selected+offset)];try{await loadImage(p.cutouts[size===90?0:1],'low')}catch{}}},1200);
}
window.dolceCatalog={products,imageUrl,loadImage,getState:()=>({index:selected,size,explore:explore3d})};
function renderProducts(syncUrl=false){
 const p=products[selected],prev=products[wrap(selected-1)],next=products[wrap(selected+1)];
 for(const [role,product] of [['selected',p],['next',next],['previous',prev]]){const key=product.cutouts[size===90?0:1];loadImage(key,role==='selected'?'high':'auto').catch(()=>{});const image=fallbackImages[role];const url=imageUrl(key);if(image.getAttribute('src')!==url)image.src=url}
 if(stageNearby){loadModels();warmNextFlavors()}
 document.getElementById('choose-next-product').setAttribute('aria-label',`Escolher ${next.name}`);document.getElementById('choose-previous-product').setAttribute('aria-label',`Escolher ${prev.name}`);document.getElementById('next-name').textContent=next.name;document.getElementById('previous-name').textContent=prev.name;
 const sizes=!p.unconfirmed&&!p.fixedSize?`<div class="switch product-sizes" role="group" aria-label="Tamanho de ${p.name}"><button type="button" data-size="90" aria-pressed="${size===90}" class="${size===90?'active':''}">90 g</button><button type="button" data-size="150" aria-pressed="${size===150}" class="${size===150?'active':''}">150 g</button></div>`:'';
 const price=p.unconfirmed?'Consulte o preço':money.format(p.fixedPrice??(size===90?24.99:34.99));
 const action=p.unconfirmed?`<a class="button" href="https://ig.me/m/dolcevitabyvalentina" target="_blank" rel="noopener noreferrer">Consultar Ovomaltine no Direct <span aria-hidden="true">↗</span></a><a class="catalog-link" href="${FOOD}" target="_blank" rel="noopener noreferrer">Ver cardápio no iFood ↗</a><small>Preço, tamanhos e disponibilidade a confirmar com a loja.</small>`:`<a class="button" href="${FOOD}?prato=${p.ids[size===90?0:1]}" target="_blank" rel="noopener noreferrer" aria-label="Pedir ${p.name}, ${p.fixedSize??size+' gramas'}, no iFood">Pedir no iFood <span aria-hidden="true">↗</span></a>`;
 info.innerHTML=`<h3>${p.name}</h3><p>${p.description}</p>${sizes}<strong class="explorer-price">${price}</strong>${p.fixedSize?`<span class="fixed-size">Balde de ${p.fixedSize}</span>`:''}<div class="explorer-actions">${action}</div>`;
 flavorList.innerHTML=products.map((p,i)=>`<button type="button" data-flavor="${i}" aria-pressed="${i===selected}" ${i===selected?'aria-current="true"':''}>${p.name}</button>`).join('');
 stage.setAttribute('aria-label',`${p.name}. ${price}. Use a seta esquerda para o próximo sabor e a direita para o anterior.`);
 document.getElementById('next-flavor').setAttribute('aria-label',`Próximo sabor: ${next.name}`);document.getElementById('previous-flavor').setAttribute('aria-label',`Sabor anterior: ${prev.name}`);
 if(syncUrl){const u=new URL(location.href);u.searchParams.set('sabor',p.name.toLowerCase());u.searchParams.set('tamanho',String(size));history.replaceState(null,'',u)}
 window.dispatchEvent(new CustomEvent('dolce:selection',{detail:{index:selected,size}}));
}
function choose(i){selected=wrap(i);renderProducts(true)}
flavorList.addEventListener('click',e=>{const b=e.target.closest('[data-flavor]');if(b){choose(Number(b.dataset.flavor));flavorList.querySelector(`[data-flavor="${selected}"]`)?.focus({preventScroll:true})}});
info.addEventListener('click',e=>{const b=e.target.closest('[data-size]');if(b){size=Number(b.dataset.size);renderProducts(true);info.querySelector(`[data-size="${size}"]`)?.focus({preventScroll:true})}});
document.getElementById('choose-next-product').addEventListener('click',()=>{if(!dragged)choose(selected+1)});document.getElementById('choose-previous-product').addEventListener('click',()=>{if(!dragged)choose(selected-1)});
document.getElementById('next-flavor').addEventListener('click',()=>{if(!dragged)choose(selected+1)});document.getElementById('previous-flavor').addEventListener('click',()=>{if(!dragged)choose(selected-1)});
stage.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();choose(selected+(e.key==='ArrowLeft'?1:-1))}if(e.key==='Escape'){setExplore(false)}});
function setExplore(active){explore3d=active;if(active)loadModels();stage.classList.toggle('exploring',active);const b=document.getElementById('view-toggle');b.setAttribute('aria-pressed',String(active));b.innerHTML=active?'Concluir exploração <span aria-hidden="true">×</span>':'Explorar em 3D <span aria-hidden="true">↗</span>';document.getElementById('stage-instruction').textContent=active?'Arraste o produto para inclinar. Use as setas para trocar de sabor.':'Arraste para os lados ou escolha um sabor abaixo.';window.dispatchEvent(new CustomEvent('dolce:explore',{detail:{active}}))}
document.getElementById('view-toggle').addEventListener('click',()=>setExplore(!explore3d));
stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragStart={x:e.clientX,y:e.clientY};dragged=false;stage.classList.add('dragging');if(!e.target.closest('button'))stage.setPointerCapture(e.pointerId)});
stage.addEventListener('pointermove',e=>{if(dragStart&&Math.abs(e.clientX-dragStart.x)>8)dragged=true;if(explore3d&&dragStart)window.dispatchEvent(new CustomEvent('dolce:tilt',{detail:{x:Math.max(-1,Math.min(1,(e.clientX-dragStart.x)/160)),y:Math.max(-1,Math.min(1,(e.clientY-dragStart.y)/140))}}));else if(e.pointerType==='mouse'&&!dragStart){const r=stage.getBoundingClientRect();window.dispatchEvent(new CustomEvent('dolce:tilt',{detail:{x:(e.clientX-r.left)/r.width*2-1,y:(e.clientY-r.top)/r.height*2-1}}))}});
stage.addEventListener('pointerup',e=>{if(!dragStart)return;const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;if(!explore3d&&Math.abs(dx)>38&&Math.abs(dx)>Math.abs(dy))choose(selected+(dx>0?1:-1));dragStart=null;stage.classList.remove('dragging');setTimeout(()=>{dragged=false},0)});
stage.addEventListener('pointercancel',()=>{dragStart=null;dragged=false;stage.classList.remove('dragging')});stage.addEventListener('pointerleave',()=>{if(!explore3d)window.dispatchEvent(new CustomEvent('dolce:tilt',{detail:{x:0,y:0}}))});
stage.addEventListener('wheel',e=>{if(Math.abs(e.deltaX)>Math.abs(e.deltaY)&&Math.abs(e.deltaX)>4){e.preventDefault();if(Date.now()-wheelTime>420){wheelTime=Date.now();choose(selected+(e.deltaX<0?1:-1))}}},{passive:false});
renderProducts();
new IntersectionObserver(entries=>{stageNearby=entries[0].isIntersecting;if(stageNearby){loadModels();warmNextFlavors()}else clearTimeout(prefetchTimer)},{rootMargin:'350px'}).observe(stage);

window.addEventListener('dolce:tilt',e=>{if(!stage.classList.contains('webgl-ready')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){fallback.style.setProperty('--tilt-x',`${e.detail.x*20}deg`);fallback.style.setProperty('--tilt-y',`${e.detail.y*10}deg`)}});
