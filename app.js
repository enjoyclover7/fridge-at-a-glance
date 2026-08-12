const STORAGE_KEY='fridge-food-manager-v1';
const HISTORY_KEY='fridge-food-history-v1';
const makeId=()=>globalThis.crypto&&typeof crypto.randomUUID==='function'?crypto.randomUUID():`food-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const foodImageCatalog=[
  ['apple','사과,홍옥,아오리,부사'],['banana','바나나'],['strawberry','딸기'],['orange','오렌지,귤,한라봉,천혜향,레드향'],['grapes','포도,샤인머스캣,청포도'],
  ['watermelon','수박'],['pear','배'],['peach','복숭아,천도복숭아'],['kiwi','키위'],['lemon','레몬'],
  ['tomato','토마토,방울토마토,대추토마토'],['cucumber','오이,백오이,가시오이'],['carrot','당근'],['potato','감자,알감자'],['onion','양파,적양파'],
  ['garlic','마늘'],['bell-pepper','피망,파프리카'],['broccoli','브로콜리'],['cabbage','양배추'],['napa-cabbage','배추,알배추'],
  ['lettuce','양상추,상추'],['spinach','시금치'],['green-onion','대파,쪽파,실파'],['mushroom','버섯,표고버섯,새송이버섯,팽이버섯'],['zucchini','애호박,주키니,호박'],
  ['egg','계란,달걀,훈제란,구운란'],['milk','우유,멸균우유,저지방우유'],['tofu','두부,찌개두부,부침두부'],['chicken-breast','닭가슴살,닭고기,닭안심,닭다리,닭봉'],['beef','소고기,쇠고기,스테이크,불고기용소고기'],['fresh-tuna','참치,생참치,참치회,참치스테이크'],
  ['pork-belly','삼겹살,돼지고기,목살'],['salmon','연어'],['mackerel','고등어'],['shrimp','새우,대하'],['tuna-can','참치캔,캔참치'],
  ['ham','햄,슬라이스햄'],['sausage','소시지,비엔나,후랑크'],['bacon','베이컨'],['cheese','치즈,모짜렐라,체다치즈'],['yogurt','요거트,요구르트,그릭요거트'],
  ['butter','버터'],['rice','밥,백미밥'],['bread','식빵,빵'],['bagel','베이글'],['flour','밀가루,부침가루'],
  ['pasta','파스타면,스파게티면,마카로니'],['ramen-noodles','라면사리,면사리,소면,국수면,우동면,칼국수면'],['rice-cake','떡,떡국떡,가래떡'],['dumpling','만두,김치만두,고기만두'],['fish-cake','어묵,오뎅'],
  ['frozen-vegetables','냉동채소,믹스채소'],['french-fries','감자튀김,프렌치프라이'],['frozen-pizza','냉동피자,피자'],['fried-rice','볶음밥,냉동볶음밥'],['chicken-nuggets','치킨너겟,너겟'],
  ['pork-cutlet','돈까스,돈가스'],['hot-dog','핫도그'],['frozen-dumplings','냉동만두'],['crab-stick','맛살,게맛살,크래미'],['sliced-cheese','슬라이스치즈'],
  ['kimchi','김치,배추김치,깍두기'],['pickled-radish','단무지,쌈무'],['soybean-paste','된장'],['chili-paste','고추장'],['soy-sauce','간장'],
  ['ketchup','케첩,케찹'],['mayonnaise','마요네즈'],['cooking-oil','식용유,카놀라유,올리브유'],['sesame-oil','참기름,들기름'],['vinegar','식초'],
  ['salt','소금'],['sugar','설탕'],['black-pepper','후추'],['corn-can','옥수수캔,스위트콘,콘옥수수'],['baked-beans','베이크드빈,콩통조림'],
  ['curry','카레,3분카레'],['black-bean-sauce','짜장,3분짜장,짜장소스'],['meatballs','미트볼'],['hamburger-steak','함박스테이크,햄버그스테이크'],['beef-soup','소고기국,소고기무국'],
  ['seaweed-soup','미역국'],['doenjang-stew','된장찌개'],['kimchi-stew','김치찌개'],['soft-tofu-stew','순두부찌개,순두부'],['yukgaejang','육개장'],
  ['samgyetang','삼계탕'],['gomtang','곰탕,설렁탕'],['instant-rice','즉석밥,햇반'],['cup-noodles','컵라면,사발면'],['instant-ramen','봉지라면,라면'],
  ['luncheon-meat','통조림햄,스팸,런천미트'],['retort-tuna','참치통조림'],['canned-chicken','닭가슴살캔,닭고기통조림'],['canned-mackerel','고등어통조림'],['canned-sardines','정어리통조림'],
  ['porridge','죽,즉석죽,전복죽,야채죽'],['soup-cup','컵국,즉석국'],['tteokbokki','떡볶이,컵떡볶이'],['pasta-sauce','파스타소스,스파게티소스,토마토소스'],['ready-pasta','즉석파스타,냉장파스타'],
  ['ice-cream','아이스크림,아이스바,빙과,젤라또,샤베트']
].map(([file,aliases])=>({file,aliases:aliases.split(',').map(alias=>alias.replace(/\s/g,'').toLowerCase())}));
const foodImageAliases=foodImageCatalog.flatMap(item=>item.aliases.map(alias=>({alias,file:item.file}))).sort((a,b)=>b.alias.length-a.alias.length);
const ambiguousFoods={
  '참치':[{name:'참치캔',description:'통조림',location:'room',days:90},{name:'생참치',description:'회·스테이크용',location:'fridge',days:1},{name:'참치마요',description:'조리된 음식',location:'fridge',days:3}]
};
const ambiguousImageAliases=new Set(Object.keys(ambiguousFoods).map(normalize));

// 일반적인 가정 보관 환경에서 다시 상태를 확인하도록 돕는 보수적인 제안값입니다.
// 제품 포장에 표시된 소비기한과 보관방법이 있으면 항상 제품 표시를 우선합니다.
const storageGuide=[
  {names:'두부,순두부',options:[['fridge',2]]},{names:'생선,고등어,연어,새우,조개',options:[['fridge',2],['freezer',30]]},
  {names:'닭고기,닭가슴살,돼지고기,삼겹살,다짐육',options:[['fridge',2],['freezer',30]]},{names:'소고기,스테이크',options:[['fridge',5],['freezer',90]]},
  {names:'반찬,찌개,국,카레,볶음밥,남은음식',options:[['fridge',4],['freezer',60]]},{names:'계란,달걀',options:[['fridge',14]]},
  {names:'우유,요거트,요구르트',options:[['fridge',7]]},{names:'햄,소시지,베이컨,맛살,어묵',options:[['fridge',7],['freezer',30]]},
  {names:'상추,양상추,시금치,오이,브로콜리,버섯,애호박,대파',options:[['fridge',7]]},{names:'토마토,파프리카,당근,양배추,배추',options:[['fridge',14]]},
  {names:'사과,배,오렌지,귤,포도,키위,레몬',options:[['fridge',21]]},{names:'딸기,복숭아',options:[['fridge',5]]},{names:'바나나',options:[['room',5]]},
  {names:'감자,양파,마늘',options:[['room',30]]},{names:'식빵,빵,베이글',options:[['room',5],['freezer',30]]},
  {names:'김치,깍두기',options:[['fridge',30]]},{names:'냉동만두,냉동피자,냉동채소,돈까스,너겟',options:[['freezer',90]]},
  {names:'아이스크림,아이스바,빙과,젤라또,샤베트',options:[['freezer',90]]},{names:'참치캔,캔참치,참치통조림',options:[['room',90]]},{names:'생참치,참치회,참치스테이크',options:[['fridge',1],['freezer',30]]},{names:'참치마요',options:[['fridge',3]]},
  {names:'냉동밥,냉동볶음밥,감자튀김,냉동핫도그',options:[['freezer',90]]},
  {names:'콩나물,숙주',options:[['fridge',3]]},{names:'깻잎,미나리,부추',options:[['fridge',5]]},{names:'옥수수,고구마,단호박',options:[['room',14]]},
  {names:'수박,참외,멜론',options:[['fridge',7]]},{names:'블루베리,라즈베리,체리',options:[['fridge',5]]},
  {names:'생크림,휘핑크림,크림치즈',options:[['fridge',5]]},{names:'개봉햄,개봉소시지,개봉치즈',options:[['fridge',5]]},
  {names:'쌀,밀가루,설탕,소금,라면,파스타면,통조림',options:[['room',90]]}
].map(item=>({...item,names:item.names.split(',').map(normalize)}));
const locationText={fridge:'냉장',freezer:'냉동',room:'실온'};

const $=s=>document.querySelector(s);
const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const offset=days=>{const d=new Date();d.setDate(d.getDate()+days);return dateKey(d)};
function loadFoods(){try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(!Array.isArray(parsed))return[];return parsed.filter(item=>item&&item.name&&item.expiry).map((item,index)=>({id:item.id||makeId(),name:String(item.name),expiry:item.expiry,quantity:Math.max(1,Number(item.quantity)||1),location:['fridge','freezer','room'].includes(item.location)?item.location:'fridge',memo:String(item.memo||''),createdAt:Number(item.createdAt)||Date.now()-index}))}catch{return[]}}
let foods=loadFoods(),filter='all',search='',sortMode='expiry',undoAction=null;
const foodList=$('#food-list'),emptyState=$('#empty-state');
function daysLeft(value){const today=new Date();today.setHours(0,0,0,0);return Math.round((new Date(`${value}T00:00:00`)-today)/86400000)}
function statusFor(days){if(days<0)return{key:'expired',label:`${Math.abs(days)}일 지남`};if(days===0)return{key:'urgent',label:'오늘까지'};if(days<=2)return{key:'urgent',label:`D-${days}`};if(days<=5)return{key:'warning',label:`D-${days}`};return{key:'safe',label:`D-${days}`}}
function iconFor(name){const map=[['계란','🥚'],['우유','🥛'],['토마토','🍅'],['양상추','🥬'],['상추','🥬'],['오이','🥒'],['감자','🥔'],['김치','🌶️'],['밥','🍚'],['두부','▣'],['버섯','🍄'],['양파','🧅'],['대파','🌱'],['닭','🍗'],['참치','🐟'],['소시지','🌭'],['브로콜리','🥦']];return(map.find(([key])=>name.includes(key))||[])[1]||'🥣'}
function imageFor(name){const value=normalize(name),exact=foodImageAliases.find(item=>value===item.alias);if(exact)return exact.file;return foodImageAliases.find(item=>!ambiguousImageAliases.has(item.alias)&&value.includes(item.alias))?.file}
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
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(foods))}catch{toast('저장 공간이 부족해 변경 내용을 저장하지 못했어요.')}render()}
function addFoods(items){
  const valid=items.filter(item=>item.name&&item.expiry).map(item=>({id:makeId(),name:item.name.trim(),expiry:item.expiry,quantity:Math.max(1,Number(item.quantity)||1),location:item.location||'fridge',memo:String(item.memo||'').trim(),createdAt:Date.now()}));
  if(!valid.length)return 0;
  valid.forEach(item=>{const existing=foods.find(food=>normalize(food.name)===normalize(item.name)&&food.expiry===item.expiry&&food.location===item.location);if(existing)existing.quantity+=item.quantity;else foods.push(item);updateHistory(item.name,item.expiry,item.location)});save();return valid.length;
}
function render(){
  const sorters={expiry:(a,b)=>daysLeft(a.expiry)-daysLeft(b.expiry),recent:(a,b)=>b.createdAt-a.createdAt,name:(a,b)=>a.name.localeCompare(b.name,'ko'),quantity:(a,b)=>b.quantity-a.quantity};
  const sorted=[...foods].sort(sorters[sortMode]||sorters.expiry);
  const visible=sorted.filter(item=>{const key=statusFor(daysLeft(item.expiry)).key;const matchFilter=filter==='all'||(filter==='urgent'&&(key==='urgent'||key==='expired'))||(filter==='safe'&&(key==='safe'||key==='warning'));return matchFilter&&item.name.toLowerCase().includes(search.toLowerCase())});
  const locationLabel={fridge:'냉장',freezer:'냉동',room:'실온'};
  foodList.innerHTML=visible.map(item=>{const status=statusFor(daysLeft(item.expiry));return`<article class="food-card"><button class="food-main" data-action="edit" data-id="${item.id}" aria-label="${escapeHtml(item.name)} 정보 수정"><span class="food-symbol" aria-hidden="true">${foodVisual(item.name)}</span><span class="food-info"><strong>${escapeHtml(item.name)}</strong><span class="food-meta"><span class="status ${status.key}">${status.label}</span><span>${formatDate(item.expiry)}까지</span><span>${locationLabel[item.location]}</span></span></span><span class="edit-pencil" aria-hidden="true"></span></button><div class="food-actions" aria-label="${escapeHtml(item.name)} 수량"><button class="qty-btn" data-action="minus" data-id="${item.id}" aria-label="수량 줄이기">−</button><strong>${item.quantity}</strong><button class="qty-btn" data-action="plus" data-id="${item.id}" aria-label="수량 늘리기">＋</button><button class="done-btn" data-action="done" data-id="${item.id}">사용 완료</button></div></article>`}).join('');
  emptyState.hidden=visible.length>0;updateSummary();renderMenus();renderHistory();
}
function updateSummary(){let urgent=0,safe=0;foods.forEach(item=>{const key=statusFor(daysLeft(item.expiry)).key;if(key==='urgent'||key==='expired')urgent++;else safe++});const menus=possibleMenus();$('#total-count').textContent=foods.length;$('#mobile-total-count').textContent=foods.length;$('#urgent-count').textContent=urgent;$('#safe-count').textContent=safe;$('#recipe-count').textContent=menus.length;const urgentNames=[...foods].sort((a,b)=>daysLeft(a.expiry)-daysLeft(b.expiry)).filter(item=>daysLeft(item.expiry)<=2).slice(0,2).map(item=>item.name);$('#mobile-overview-copy').textContent=urgentNames.length?`${urgentNames.join(' · ')} 먼저 확인해 보세요.`:foods.length?'아직 소비기한이 여유로워요.':'첫 음식을 등록해 보세요.'}
function menuMarkup(menus){return menus.length?menus.map(menu=>`<article class="menu-card"><div class="menu-photo"><img src="assets/recipes/${menu.image}.webp" alt="${escapeHtml(menu.name)}" loading="lazy"><span class="priority-pill ${menu.ready?'ready':'near'}">${menu.ready?(menu.priority<=2?'먼저 먹어요':'바로 만들어요'):`${escapeHtml(menu.missing[0])}만 있으면 돼요`}</span></div><div class="menu-body"><div class="menu-title-row"><h3>${escapeHtml(menu.name)}</h3><span>${menu.time}분</span></div><div class="ingredients">${menu.ingredients.join(' · ')}</div><p class="recipe">${escapeHtml(menu.recipe)}</p></div></article>`).join(''):`<div class="no-menu"><strong>추천할 메뉴를 찾지 못했어요.</strong>음식을 하나 이상 등록하면 보유 재료와 가까운 레시피를 찾아드릴게요.</div>`}
function renderMenus(){const menus=possibleMenus();$('#menu-list').innerHTML=menuMarkup(menus.slice(0,6));$('#dialog-menu-list').innerHTML=menuMarkup(menus);$('#recipe-dialog-count').textContent=menus.length?`전체 ${menus.length}개`:''}
function updateHistory(name,expiry,location='fridge'){let history=[];try{history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{}history=history.filter(x=>normalize(x.name)!==normalize(name));history.unshift({name,shelfDays:Math.max(0,daysLeft(expiry)),location});localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(0,8)))}
function renderHistory(){let history=[];try{history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{}$('#recent-wrap').hidden=!history.length;$('#recent-items').innerHTML=history.map((x,i)=>`<button class="chip" data-history="${i}">${escapeHtml(x.name)}</button>`).join('')}
function storedSuggestion(name){let history=[];try{history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{}const previous=history.find(item=>normalize(item.name)===normalize(name));return previous?[{location:previous.location||'fridge',days:Math.max(1,previous.shelfDays),remembered:true}]:null}
function guideSuggestion(name){const value=normalize(name);if(!value)return null;const guide=storageGuide.find(item=>item.names.some(alias=>value.includes(alias)||alias.includes(value)));return guide?.options.map(([location,days])=>({location,days}))||null}
function setSubmitReady(ready){$('#submit-food').disabled=!ready}
function applyRecommendation(location,days){$('#food-location').value=location;$('#expiry-date').value=offset(days);$('#suggestion-title').textContent=`${locationText[location]} · ${formatDate($('#expiry-date').value)}까지`;$('#suggestion-copy').textContent=`${days>=30?`${Math.round(days/30)}개월`:`${days}일`} 후`;setSubmitReady(true)}
function updateStorageSuggestion(){
  const name=$('#food-name').value.trim(),ambiguity=ambiguousFoods[normalize(name)],options=storedSuggestion(name)||guideSuggestion(name),heading=$('#storage-suggestion'),clarify=$('#food-clarify');
  clarify.hidden=true;heading.hidden=!name;if(!name){setSubmitReady(false);return}
  if(ambiguity){heading.hidden=true;$('#clarify-title').textContent=`${name}, 어떤 종류인가요?`;$('#clarify-options').innerHTML=ambiguity.map(option=>`<button type="button" data-food-name="${option.name}"><strong>${option.name}</strong><span>${option.description}</span></button>`).join('');clarify.hidden=false;$('#expiry-date').value='';setSubmitReady(false);return}
  if(!options){$('#expiry-date').value='';$('#suggestion-title').textContent='추천 정보가 없어요';$('#suggestion-copy').textContent='7일 · 14일 · 한 달 중 빠르게 선택하세요';$('#toggle-food-details').textContent='선택';$('#toggle-food-details').setAttribute('aria-expanded','false');$('#food-details').hidden=true;setSubmitReady(false);return}
  if($('#food-details').hidden){$('#toggle-food-details').textContent='변경';$('#toggle-food-details').setAttribute('aria-expanded','false')}
  applyRecommendation(options[0].location,options[0].days);
}
function toast(message,action){const el=$('#toast'),button=$('#toast-undo');$('#toast-message').textContent=message;undoAction=action||null;button.hidden=!action;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>{el.classList.remove('show');undoAction=null},action?8000:2200)}
$('#toast-undo').addEventListener('click',()=>{if(undoAction)undoAction();undoAction=null;$('#toast').classList.remove('show')});
$('#food-form').addEventListener('submit',event=>{event.preventDefault();const name=$('#food-name').value.trim(),expiry=$('#expiry-date').value,quantity=$('#food-quantity').value,location=$('#food-location').value,memo=$('#food-memo').value;if(!name||!expiry)return;addFoods([{name,expiry,quantity,location,memo}]);showEditHint();event.target.reset();$('#food-quantity').value=1;$('#food-location').value='fridge';$('#food-details').hidden=true;$('#toggle-food-details').setAttribute('aria-expanded','false');updateStorageSuggestion();$('#add-dialog').close();toast(`${name} 등록을 완료했어요.`)});
foodList.addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(!button)return;const item=foods.find(x=>x.id===button.dataset.id);if(!item)return;if(button.dataset.action==='edit'){openEdit(item);return}if(button.dataset.action==='plus')item.quantity++;if(button.dataset.action==='minus')item.quantity=Math.max(1,item.quantity-1);if(button.dataset.action==='done'){openCompleteDialog(item);return}save()});
$('#recent-items').addEventListener('click',event=>{const button=event.target.closest('[data-history]');if(!button)return;const history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'),item=history[Number(button.dataset.history)];if(!item)return;$('#food-name').value=item.name;updateStorageSuggestion();$('#food-name').focus()});
$('#search-input').addEventListener('input',e=>{search=e.target.value;render()});
$('#sort-select').addEventListener('change',e=>{sortMode=e.target.value;render()});
function setFilter(nextFilter){
  filter=nextFilter;
  document.querySelectorAll('[data-stat-filter]').forEach(button=>{
    const active=button.dataset.statFilter===filter;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  render();
}
document.querySelectorAll('[data-stat-filter]').forEach(button=>button.addEventListener('click',()=>{
  setFilter(button.dataset.statFilter);
  $('#inventory').scrollIntoView({behavior:'smooth',block:'start'});
}));
document.querySelector('[data-stat-target="recipes"]').addEventListener('click',()=>openRecipeDialog());
$('#food-name').addEventListener('input',updateStorageSuggestion);
$('#clarify-options').addEventListener('click',event=>{const button=event.target.closest('[data-food-name]');if(!button)return;$('#food-name').value=button.dataset.foodName;updateStorageSuggestion()});
$('#toggle-food-details').addEventListener('click',()=>{const details=$('#food-details'),open=details.hidden;details.hidden=!open;$('#toggle-food-details').textContent=open?'접기':($('#expiry-date').value?'변경':'선택');$('#toggle-food-details').setAttribute('aria-expanded',String(open));if(open)$('#quick-expiry-buttons button').focus()});
$('#quick-expiry-buttons').addEventListener('click',event=>{const button=event.target.closest('[data-quick-days]');if(!button)return;const days=Number(button.dataset.quickDays);applyRecommendation($('#food-location').value,days);$('#expiry-date').hidden=true;document.querySelectorAll('[data-quick-days]').forEach(item=>item.classList.toggle('selected',item===button))});
$('#open-expiry-calendar').addEventListener('click',()=>{const input=$('#expiry-date');input.hidden=false;input.focus();if(typeof input.showPicker==='function')input.showPicker()});
function syncRecommendationLabel(){if($('#expiry-date').value){$('#suggestion-title').textContent=`${locationText[$('#food-location').value]} · ${formatDate($('#expiry-date').value)}까지`;$('#suggestion-copy').textContent='직접 변경';setSubmitReady(Boolean($('#food-name').value.trim()))}else setSubmitReady(false)}
$('#expiry-date').addEventListener('change',syncRecommendationLabel);$('#food-location').addEventListener('change',syncRecommendationLabel);
$('#today').textContent=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date());render();
const EDIT_HINT_KEY='fridge-edit-hint-seen-v1';
function showEditHint(){if(foods.length&&!localStorage.getItem(EDIT_HINT_KEY))$('#edit-hint').hidden=false}
showEditHint();
$('#dismiss-edit-hint').addEventListener('click',()=>{$('#edit-hint').hidden=true;localStorage.setItem(EDIT_HINT_KEY,'1')});

const addDialog=$('#add-dialog');
function resetAddForm(){
  $('#food-form').reset();$('#food-quantity').value=1;$('#food-location').value='fridge';$('#food-memo').value='';$('#expiry-date').value='';
  $('#expiry-date').hidden=true;document.querySelectorAll('[data-quick-days]').forEach(button=>button.classList.remove('selected'));
  $('#food-details').hidden=true;$('#toggle-food-details').textContent='변경';$('#toggle-food-details').setAttribute('aria-expanded','false');
  $('#storage-suggestion').hidden=true;$('#food-clarify').hidden=true;$('#clarify-options').innerHTML='';setSubmitReady(false);
}
function openAddDialog(){resetAddForm();if(!addDialog.open)addDialog.showModal();document.body.classList.add('modal-open');setTimeout(()=>$('#food-name').focus(),80)}
function closeAddDialog(){if(addDialog.open)addDialog.close()}
$('#open-add').addEventListener('click',openAddDialog);
document.querySelectorAll('[data-open-add]').forEach(button=>button.addEventListener('click',openAddDialog));
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',closeAddDialog));
addDialog.addEventListener('click',event=>{if(event.target===addDialog)closeAddDialog()});
addDialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');resetAddForm()});
window.fridgeApp={addFoods,toast,closeAddDialog,dateKey,offset};

const completeDialog=$('#complete-dialog');
let pendingCompleteId=null;
function openCompleteDialog(item){pendingCompleteId=item.id;$('#complete-food-name').textContent=item.name;if(!completeDialog.open)completeDialog.showModal();document.body.classList.add('modal-open')}
function closeCompleteDialog(){pendingCompleteId=null;if(completeDialog.open)completeDialog.close()}
$('#confirm-complete').addEventListener('click',()=>{const item=foods.find(food=>food.id===pendingCompleteId);if(!item){closeCompleteDialog();return}const index=foods.indexOf(item);foods.splice(index,1);save();closeCompleteDialog();toast(`${item.name}: 사용 완료 처리했어요.`,()=>{foods.splice(Math.min(index,foods.length),0,item);save()})});
$('#cancel-complete').addEventListener('click',closeCompleteDialog);
document.querySelectorAll('[data-close-complete]').forEach(button=>button.addEventListener('click',closeCompleteDialog));
completeDialog.addEventListener('click',event=>{if(event.target===completeDialog)closeCompleteDialog()});
completeDialog.addEventListener('close',()=>{pendingCompleteId=null;document.body.classList.remove('modal-open')});

const recipeDialog=$('#recipe-dialog');
function openRecipeDialog(){if(!recipeDialog.open)recipeDialog.showModal();document.body.classList.add('modal-open')}
$('#open-recipes').addEventListener('click',openRecipeDialog);
document.querySelectorAll('[data-close-recipes]').forEach(button=>button.addEventListener('click',()=>recipeDialog.close()));
recipeDialog.addEventListener('click',event=>{if(event.target===recipeDialog)recipeDialog.close()});
recipeDialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));

const editDialog=$('#edit-dialog');
function openEdit(item){$('#edit-id').value=item.id;$('#edit-name').value=item.name;$('#edit-expiry').value=item.expiry;$('#edit-quantity').value=item.quantity;$('#edit-location').value=item.location;$('#edit-memo').value=item.memo||'';if(!editDialog.open)editDialog.showModal();document.body.classList.add('modal-open')}
$('#edit-form').addEventListener('submit',event=>{event.preventDefault();const item=foods.find(food=>food.id===$('#edit-id').value);if(!item)return;item.name=$('#edit-name').value.trim();item.expiry=$('#edit-expiry').value;item.quantity=Math.max(1,Number($('#edit-quantity').value)||1);item.location=$('#edit-location').value;item.memo=$('#edit-memo').value.trim();updateHistory(item.name,item.expiry,item.location);save();editDialog.close();toast('음식 정보를 수정했어요.')});
$('#delete-food').addEventListener('click',()=>{const item=foods.find(food=>food.id===$('#edit-id').value);if(!item||!confirm(`${item.name}을(를) 삭제할까요?`))return;const index=foods.indexOf(item);foods.splice(index,1);save();editDialog.close();toast(`${item.name}을(를) 삭제했어요.`,()=>{foods.splice(index,0,item);save()})});
document.querySelectorAll('[data-close-edit]').forEach(button=>button.addEventListener('click',()=>editDialog.close()));
editDialog.addEventListener('click',event=>{if(event.target===editDialog)editDialog.close()});editDialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));

const SETTINGS_KEY='fridge-settings-v1',settingsDialog=$('#settings-dialog');
function loadSettings(){try{return{reminder:true,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{return{reminder:true}}}
let settings=loadSettings();$('#expiry-reminder').checked=settings.reminder;
function updateBackupText(){const value=localStorage.getItem('fridge-last-backup');$('#last-backup').textContent=value?`마지막 백업: ${new Date(value).toLocaleString('ko-KR')}`:'아직 백업하지 않았어요.'}
function openSettings(){updateBackupText();if(!settingsDialog.open)settingsDialog.showModal();document.body.classList.add('modal-open')}
$('#open-settings').addEventListener('click',openSettings);document.querySelectorAll('[data-close-settings]').forEach(button=>button.addEventListener('click',()=>settingsDialog.close()));settingsDialog.addEventListener('click',event=>{if(event.target===settingsDialog)settingsDialog.close()});settingsDialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
$('#expiry-reminder').addEventListener('change',event=>{settings.reminder=event.target.checked;localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));toast('임박 안내 설정을 저장했어요.')});
$('#export-data').addEventListener('click',()=>{const payload={app:'냉장고 한눈에',version:1,exportedAt:new Date().toISOString(),foods,history:JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'),settings};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`냉장고-백업-${dateKey(new Date())}.json`;link.click();URL.revokeObjectURL(url);localStorage.setItem('fridge-last-backup',new Date().toISOString());updateBackupText();toast('백업 파일을 저장했어요.')});
$('#import-data').addEventListener('change',async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.foods))throw new Error();if(!confirm(`백업의 음식 ${data.foods.length}개로 현재 데이터를 바꿀까요?`))return;foods=data.foods.filter(item=>item.name&&item.expiry).map(item=>({...item,id:item.id||makeId(),quantity:Math.max(1,Number(item.quantity)||1),location:item.location||'fridge',createdAt:item.createdAt||Date.now()}));localStorage.setItem(HISTORY_KEY,JSON.stringify(Array.isArray(data.history)?data.history:[]));save();settingsDialog.close();toast('백업 데이터를 복원했어요.')}catch{toast('올바른 냉장고 백업 파일이 아니에요.')}});
function showExpiryReminder(){if(!settings.reminder||!foods.length)return;const today=dateKey(new Date());if(localStorage.getItem('fridge-reminded-date')===today)return;const urgent=foods.filter(food=>daysLeft(food.expiry)<=2).sort((a,b)=>daysLeft(a.expiry)-daysLeft(b.expiry));if(urgent.length){setTimeout(()=>toast(`${urgent[0].name}${urgent.length>1?` 외 ${urgent.length-1}개도`:''} 곧 소비해 주세요.`),450);localStorage.setItem('fridge-reminded-date',today)}}
showExpiryReminder();

async function enableOfflineMode(){
  if(!('serviceWorker'in navigator))return;
  try{
    const basePath='/fridge-at-a-glance/';
    const registration=await navigator.serviceWorker.register(`${basePath}service-worker.js`,{scope:basePath});
    if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
    await navigator.serviceWorker.ready;
    const assetUrls=[
      basePath,`${basePath}index.html`,`${basePath}styles.css`,`${basePath}recipes.js`,`${basePath}app.js`,`${basePath}manifest.webmanifest`,`${basePath}service-worker.js`,
      `${basePath}assets/hero-fridge-balanced.webp`,`${basePath}assets/icons/icon-192.png`,`${basePath}assets/icons/icon-512.png`,`${basePath}assets/icons/icon-maskable-512.png`,`${basePath}assets/icons/apple-touch-icon.png`,
      ...foodImageCatalog.map(item=>`${basePath}assets/food/${item.file}.webp`),
      ...recipes.map(item=>`${basePath}assets/recipes/${item.image}.webp`)
    ];
    const cache=await caches.open('fridge-pwa-v17');
    const results=await Promise.allSettled(assetUrls.map(url=>cache.add(url)));
    const failed=results.filter(result=>result.status==='rejected');
    if(failed.length)console.warn(`오프라인 파일 ${failed.length}개를 저장하지 못했습니다.`,failed);
    else console.info(`오프라인 파일 ${assetUrls.length}개 저장 완료`);
  }catch(error){console.info('오프라인 모드는 로컬 서버 또는 HTTPS에서 활성화됩니다.',error)}
}
enableOfflineMode();
