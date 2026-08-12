const STORAGE_KEY='fridge-food-manager-v1';
const HISTORY_KEY='fridge-food-history-v1';
const makeId=()=>globalThis.crypto&&typeof crypto.randomUUID==='function'?crypto.randomUUID():`food-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const foodImageCatalog=[
  ['apple','사과,홍옥,아오리'],['banana','바나나'],['strawberry','딸기'],['orange','오렌지,귤,한라봉,천혜향'],['grapes','포도,샤인머스캣'],
  ['watermelon','수박'],['pear','배'],['peach','복숭아,천도복숭아'],['kiwi','키위'],['lemon','레몬'],
  ['tomato','토마토,방울토마토,대추토마토'],['cucumber','오이'],['carrot','당근'],['potato','감자'],['onion','양파'],
  ['garlic','마늘'],['bell-pepper','피망,파프리카'],['broccoli','브로콜리'],['cabbage','양배추'],['napa-cabbage','배추,알배추'],
  ['lettuce','양상추,상추'],['spinach','시금치'],['green-onion','대파,쪽파,실파'],['mushroom','버섯,표고버섯,새송이버섯,팽이버섯'],['zucchini','애호박,주키니,호박'],
  ['egg','계란,달걀'],['milk','우유'],['tofu','두부'],['chicken-breast','닭가슴살,닭고기,닭안심'],['beef','소고기,쇠고기,스테이크'],
  ['pork-belly','삼겹살,돼지고기,목살'],['salmon','연어'],['mackerel','고등어'],['shrimp','새우,대하'],['tuna-can','참치캔,참치'],
  ['ham','햄'],['sausage','소시지,비엔나'],['bacon','베이컨'],['cheese','치즈'],['yogurt','요거트,요구르트'],
  ['butter','버터'],['rice','밥,백미밥'],['bread','식빵,빵'],['bagel','베이글'],['flour','밀가루,부침가루'],
  ['pasta','파스타면,스파게티면'],['ramen-noodles','라면사리,면사리'],['rice-cake','떡,떡국떡'],['dumpling','만두'],['fish-cake','어묵,오뎅'],
  ['frozen-vegetables','냉동채소,믹스채소'],['french-fries','감자튀김,프렌치프라이'],['frozen-pizza','냉동피자,피자'],['fried-rice','볶음밥,냉동볶음밥'],['chicken-nuggets','치킨너겟,너겟'],
  ['pork-cutlet','돈까스,돈가스'],['hot-dog','핫도그'],['frozen-dumplings','냉동만두'],['crab-stick','맛살,게맛살,크래미'],['sliced-cheese','슬라이스치즈'],
  ['kimchi','김치,배추김치,깍두기'],['pickled-radish','단무지,쌈무'],['soybean-paste','된장'],['chili-paste','고추장'],['soy-sauce','간장'],
  ['ketchup','케첩,케찹'],['mayonnaise','마요네즈'],['cooking-oil','식용유,카놀라유,올리브유'],['sesame-oil','참기름,들기름'],['vinegar','식초'],
  ['salt','소금'],['sugar','설탕'],['black-pepper','후추'],['corn-can','옥수수캔,스위트콘,콘옥수수'],['baked-beans','베이크드빈,콩통조림'],
  ['curry','카레,3분카레'],['black-bean-sauce','짜장,3분짜장,짜장소스'],['meatballs','미트볼'],['hamburger-steak','함박스테이크,햄버그스테이크'],['beef-soup','소고기국,소고기무국'],
  ['seaweed-soup','미역국'],['doenjang-stew','된장찌개'],['kimchi-stew','김치찌개'],['soft-tofu-stew','순두부찌개,순두부'],['yukgaejang','육개장'],
  ['samgyetang','삼계탕'],['gomtang','곰탕,설렁탕'],['instant-rice','즉석밥,햇반'],['cup-noodles','컵라면,사발면'],['instant-ramen','봉지라면,라면'],
  ['luncheon-meat','통조림햄,스팸,런천미트'],['retort-tuna','참치통조림'],['canned-chicken','닭가슴살캔,닭고기통조림'],['canned-mackerel','고등어통조림'],['canned-sardines','정어리통조림'],
  ['porridge','죽,즉석죽'],['soup-cup','컵국,즉석국'],['tteokbokki','떡볶이,컵떡볶이'],['pasta-sauce','파스타소스,스파게티소스'],['ready-pasta','즉석파스타,냉장파스타']
].map(([file,aliases])=>({file,aliases:aliases.split(',').map(alias=>alias.replace(/\s/g,'').toLowerCase())}));
const foodImageAliases=foodImageCatalog.flatMap(item=>item.aliases.map(alias=>({alias,file:item.file}))).sort((a,b)=>b.alias.length-a.alias.length);

const $=s=>document.querySelector(s);
const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const offset=days=>{const d=new Date();d.setDate(d.getDate()+days);return dateKey(d)};
const initialFoods=()=>[
  {id:makeId(),name:'양상추',expiry:offset(1),quantity:1},
  {id:makeId(),name:'두부',expiry:offset(2),quantity:1},
  {id:makeId(),name:'계란',expiry:offset(7),quantity:6},
  {id:makeId(),name:'오이',expiry:offset(4),quantity:2},
  {id:makeId(),name:'토마토',expiry:offset(3),quantity:2},
  {id:makeId(),name:'우유',expiry:offset(9),quantity:1}
];
function loadFoods(){const raw=localStorage.getItem(STORAGE_KEY);if(raw){try{return JSON.parse(raw)}catch{}}const demo=initialFoods();localStorage.setItem(STORAGE_KEY,JSON.stringify(demo));return demo}
let foods=loadFoods(),filter='all',search='';
const foodList=$('#food-list'),emptyState=$('#empty-state');
function daysLeft(value){const today=new Date();today.setHours(0,0,0,0);return Math.round((new Date(`${value}T00:00:00`)-today)/86400000)}
function statusFor(days){if(days<0)return{key:'expired',label:`${Math.abs(days)}일 지남`};if(days===0)return{key:'urgent',label:'오늘까지'};if(days<=2)return{key:'urgent',label:`D-${days}`};if(days<=5)return{key:'warning',label:`D-${days}`};return{key:'safe',label:`D-${days}`}}
function iconFor(name){const map=[['계란','🥚'],['우유','🥛'],['토마토','🍅'],['양상추','🥬'],['상추','🥬'],['오이','🥒'],['감자','🥔'],['김치','🌶️'],['밥','🍚'],['두부','▣'],['버섯','🍄'],['양파','🧅'],['대파','🌱'],['닭','🍗'],['참치','🐟'],['소시지','🌭'],['브로콜리','🥦']];return(map.find(([key])=>name.includes(key))||[])[1]||'🥣'}
function imageFor(name){const value=normalize(name);return foodImageAliases.find(item=>value.includes(item.alias))?.file}
function foodVisual(name){const image=imageFor(name);return image?`<img src="assets/food/${image}.webp" alt="" loading="lazy">`:iconFor(name)}
function formatDate(value){const[,m,d]=value.split('-');return`${Number(m)}월 ${Number(d)}일`}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function normalize(value){return value.replace(/\s/g,'').toLowerCase()}
function ingredientMatches(foodName,ingredient){const foodKey=imageFor(foodName),ingredientKey=imageFor(ingredient);return(foodKey&&ingredientKey&&foodKey===ingredientKey)||normalize(foodName).includes(normalize(ingredient))||normalize(ingredient).includes(normalize(foodName))}
function possibleMenus(){
  const available=foods.filter(food=>food.quantity>0);
  return recipes.map(recipe=>{
    const matches=recipe.ingredients.map(ingredient=>available.find(food=>ingredientMatches(food.name,ingredient)));
    const matched=matches.filter(Boolean),missing=recipe.ingredients.filter((_,index)=>!matches[index]);
    if(!matched.length||missing.length>1)return null;
    return{...recipe,ready:missing.length===0,missing,matchRatio:matched.length/recipe.ingredients.length,priority:Math.min(...matched.map(food=>daysLeft(food.expiry)))};
  }).filter(Boolean).sort((a,b)=>Number(b.ready)-Number(a.ready)||b.matchRatio-a.matchRatio||a.priority-b.priority||a.time-b.time);
}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(foods));render()}
function addFoods(items){
  const valid=items.filter(item=>item.name&&item.expiry).map(item=>({id:makeId(),name:item.name.trim(),expiry:item.expiry,quantity:Math.max(1,Number(item.quantity)||1)}));
  if(!valid.length)return 0;
  foods.push(...valid);valid.forEach(item=>updateHistory(item.name,item.expiry));save();return valid.length;
}
function render(){
  const sorted=[...foods].sort((a,b)=>daysLeft(a.expiry)-daysLeft(b.expiry));
  const visible=sorted.filter(item=>{const key=statusFor(daysLeft(item.expiry)).key;const matchFilter=filter==='all'||(filter==='urgent'&&(key==='urgent'||key==='expired'))||(filter==='safe'&&(key==='safe'||key==='warning'));return matchFilter&&item.name.toLowerCase().includes(search.toLowerCase())});
  foodList.innerHTML=visible.map(item=>{const status=statusFor(daysLeft(item.expiry));return`<article class="food-card"><div class="food-symbol" aria-hidden="true">${foodVisual(item.name)}</div><div class="food-info"><h3>${escapeHtml(item.name)}</h3><div class="food-meta"><span class="status ${status.key}">${status.label}</span><span>${formatDate(item.expiry)}까지</span></div></div><div class="food-actions" aria-label="${escapeHtml(item.name)} 수량"><button class="qty-btn" data-action="minus" data-id="${item.id}" aria-label="수량 줄이기">−</button><strong>${item.quantity}</strong><button class="qty-btn" data-action="plus" data-id="${item.id}" aria-label="수량 늘리기">＋</button><button class="done-btn" data-action="done" data-id="${item.id}">사용 완료</button></div></article>`}).join('');
  emptyState.hidden=visible.length>0;updateSummary();renderMenus();renderHistory();
}
function updateSummary(){let urgent=0,safe=0;foods.forEach(item=>{const key=statusFor(daysLeft(item.expiry)).key;if(key==='urgent'||key==='expired')urgent++;else safe++});const readyMenus=possibleMenus().filter(menu=>menu.ready);$('#total-count').textContent=foods.length;$('#mobile-total-count').textContent=foods.length;$('#urgent-count').textContent=urgent;$('#safe-count').textContent=safe;$('#recipe-count').textContent=readyMenus.length;const urgentNames=[...foods].sort((a,b)=>daysLeft(a.expiry)-daysLeft(b.expiry)).filter(item=>daysLeft(item.expiry)<=2).slice(0,2).map(item=>item.name);$('#mobile-overview-copy').textContent=urgentNames.length?`${urgentNames.join(' · ')} 먼저 확인해 보세요.`:foods.length?'아직 소비기한이 여유로워요.':'첫 음식을 등록해 보세요.'}
function renderMenus(){const menus=possibleMenus().slice(0,6);const markup=menus.length?menus.map(menu=>`<article class="menu-card"><div class="menu-photo"><img src="assets/recipes/${menu.image}.webp" alt="${escapeHtml(menu.name)}" loading="lazy"><span class="priority-pill ${menu.ready?'ready':'near'}">${menu.ready?(menu.priority<=2?'먼저 먹어요':'바로 만들어요'):`${escapeHtml(menu.missing[0])}만 있으면 돼요`}</span></div><div class="menu-body"><div class="menu-title-row"><h3>${escapeHtml(menu.name)}</h3><span>${menu.time}분</span></div><div class="ingredients">${menu.ingredients.join(' · ')}</div><p class="recipe">${escapeHtml(menu.recipe)}</p></div></article>`).join(''):`<div class="no-menu"><strong>추천할 메뉴를 찾지 못했어요.</strong>음식을 하나 이상 등록하면 보유 재료와 가까운 레시피를 찾아드릴게요.</div>`;$('#menu-list').innerHTML=markup;$('#dialog-menu-list').innerHTML=markup}
function updateHistory(name,expiry){let history=[];try{history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{}history=history.filter(x=>normalize(x.name)!==normalize(name));history.unshift({name,shelfDays:Math.max(1,daysLeft(expiry))});localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(0,8)))}
function renderHistory(){let history=[];try{history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{}$('#recent-wrap').hidden=!history.length;$('#recent-items').innerHTML=history.map((x,i)=>`<button class="chip" data-history="${i}">${escapeHtml(x.name)}</button>`).join('')}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800)}
$('#food-form').addEventListener('submit',event=>{event.preventDefault();const name=$('#food-name').value.trim(),expiry=$('#expiry-date').value;if(!name||!expiry)return;addFoods([{name,expiry,quantity:1}]);event.target.reset();setDefaultDate();$('#add-dialog').close();toast(`${name}을(를) 냉장고에 넣었어요.`)});
foodList.addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(!button)return;const item=foods.find(x=>x.id===button.dataset.id);if(!item)return;if(button.dataset.action==='plus')item.quantity++;if(button.dataset.action==='minus')item.quantity=Math.max(1,item.quantity-1);if(button.dataset.action==='done'){foods=foods.filter(x=>x.id!==item.id);toast(`${item.name} 사용을 완료했어요.`)}save()});
$('#recent-items').addEventListener('click',event=>{const button=event.target.closest('[data-history]');if(!button)return;const history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'),item=history[Number(button.dataset.history)];if(!item)return;const date=new Date();date.setDate(date.getDate()+item.shelfDays);$('#food-name').value=item.name;$('#expiry-date').value=dateKey(date);$('#food-name').focus()});
$('#search-input').addEventListener('input',e=>{search=e.target.value;render()});
function setFilter(nextFilter){
  filter=nextFilter;
  document.querySelectorAll('.filter').forEach(button=>button.classList.toggle('active',button.dataset.filter===filter));
  document.querySelectorAll('[data-stat-filter]').forEach(button=>{
    const active=button.dataset.statFilter===filter;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  render();
}
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>setFilter(button.dataset.filter)));
document.querySelectorAll('[data-stat-filter]').forEach(button=>button.addEventListener('click',()=>{
  setFilter(button.dataset.statFilter);
  $('#inventory').scrollIntoView({behavior:'smooth',block:'start'});
}));
document.querySelector('[data-stat-target="recipes"]').addEventListener('click',()=>$('#recipes').scrollIntoView({behavior:'smooth',block:'start'}));
function setDefaultDate(){const d=new Date();d.setDate(d.getDate()+7);$('#expiry-date').value=dateKey(d)}
$('#today').textContent=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date());setDefaultDate();render();

const addDialog=$('#add-dialog');
function openAddDialog(){if(!addDialog.open)addDialog.showModal();document.body.classList.add('modal-open');setTimeout(()=>$('#food-name').focus(),80)}
function closeAddDialog(){if(addDialog.open)addDialog.close()}
$('#open-add').addEventListener('click',openAddDialog);
document.querySelectorAll('[data-open-add]').forEach(button=>button.addEventListener('click',openAddDialog));
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',closeAddDialog));
addDialog.addEventListener('click',event=>{if(event.target===addDialog)closeAddDialog()});
addDialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
window.fridgeApp={addFoods,toast,closeAddDialog,dateKey,offset};

const recipeDialog=$('#recipe-dialog');
$('#open-recipes').addEventListener('click',()=>{if(!recipeDialog.open)recipeDialog.showModal();document.body.classList.add('modal-open')});
document.querySelectorAll('[data-close-recipes]').forEach(button=>button.addEventListener('click',()=>recipeDialog.close()));
recipeDialog.addEventListener('click',event=>{if(event.target===recipeDialog)recipeDialog.close()});
recipeDialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));

async function enableOfflineMode(){
  if(!('serviceWorker'in navigator))return;
  try{
    const basePath='/fridge-at-a-glance/';
    const registration=await navigator.serviceWorker.register(`${basePath}service-worker.js`,{scope:basePath});
    if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
    await navigator.serviceWorker.ready;
    const assetUrls=[
      basePath,`${basePath}index.html`,`${basePath}styles.css`,`${basePath}recipes.js`,`${basePath}app.js`,`${basePath}receipt.js`,`${basePath}manifest.webmanifest`,`${basePath}service-worker.js`,
      `${basePath}assets/hero-fridge-balanced.webp`,`${basePath}assets/icons/icon-192.png`,`${basePath}assets/icons/icon-512.png`,`${basePath}assets/icons/icon-maskable-512.png`,`${basePath}assets/icons/apple-touch-icon.png`,
      ...foodImageCatalog.map(item=>`${basePath}assets/food/${item.file}.webp`),
      ...recipes.map(item=>`${basePath}assets/recipes/${item.image}.webp`)
    ];
    const cache=await caches.open('fridge-pwa-v6');
    const results=await Promise.allSettled(assetUrls.map(url=>cache.add(url)));
    const failed=results.filter(result=>result.status==='rejected');
    if(failed.length)console.warn(`오프라인 파일 ${failed.length}개를 저장하지 못했습니다.`,failed);
    else console.info(`오프라인 파일 ${assetUrls.length}개 저장 완료`);
  }catch(error){console.info('오프라인 모드는 로컬 서버 또는 HTTPS에서 활성화됩니다.',error)}
}
enableOfflineMode();
