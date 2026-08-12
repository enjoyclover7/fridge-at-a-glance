(()=>{
  const $=selector=>document.querySelector(selector);
  const tabs=[['#manual-tab','#manual-panel'],['#receipt-tab','#receipt-panel']];
  const upload=$('#receipt-upload'),progress=$('#receipt-progress'),review=$('#receipt-review'),errorBox=$('#receipt-error');
  const fileInputs=[...document.querySelectorAll('.receipt-file')],itemsBox=$('#receipt-items');
  let worker=null,cancelled=false;

  function selectTab(selected){
    tabs.forEach(([tabSelector,panelSelector])=>{
      const tab=$(tabSelector),active=tab===selected;
      tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));$(panelSelector).hidden=!active;
    });
    if(selected.id==='manual-tab')setTimeout(()=>$('#food-name').focus(),50);
  }
  tabs.forEach(([selector])=>$(selector).addEventListener('click',event=>selectTab(event.currentTarget)));

  const excluded=/합계|소계|과세|면세|부가세|결제|카드|승인|현금|거스름|할인|쿠폰|포인트|봉투|영수증|사업자|대표자|전화|주소|매장|일시|판매|단가|금액|수량|신용|체크|고객|바코드|청구|회원|잔액|입금|출금|vat|total|subtotal|change|cash|visa|master/i;
  const foodHints=/우유|두유|요구르트|요거트|치즈|버터|계란|달걀|두부|김치|채소|야채|과일|사과|배|귤|오렌지|바나나|딸기|포도|토마토|오이|호박|감자|고구마|양파|마늘|대파|버섯|상추|양배추|배추|당근|브로콜리|고기|돼지|소고기|쇠고기|닭|오리|연어|고등어|참치|새우|생선|햄|소시지|베이컨|어묵|맛살|라면|국수|면|파스타|쌀|밥|빵|식빵|베이글|떡|만두|피자|샐러드|주스|음료|생수|커피|차|된장|고추장|간장|소스|식용유|참기름|냉동|죽|국|찌개|카레|짜장|스프|통조림|캔/i;
  const canonicalFoods=[['달걀',/계란|달걀/],['우유',/우유/],['두유',/두유/],['요거트',/요구르트|요거트/],['두부',/두부/],['김치',/김치/],['양상추',/양상추/],['상추',/(?<!양)상추/],['양배추',/양배추/],['배추',/(?<!양)배추/],['애호박',/애호박/],['토마토',/토마토/],['오이',/오이/],['감자',/감자/],['고구마',/고구마/],['양파',/양파/],['대파',/대파/],['당근',/당근/],['브로콜리',/브로콜리/],['버섯',/버섯/],['사과',/사과/],['바나나',/바나나/],['딸기',/딸기/],['포도',/포도/],['치즈',/치즈/],['버터',/버터/],['돼지고기',/돼지고기|삼겹살|목살/],['소고기',/소고기|쇠고기/],['닭고기',/닭고기|닭가슴살/],['연어',/연어/],['고등어',/고등어/],['참치',/참치/],['새우',/새우/],['햄',/햄/],['소시지',/소시지/],['라면',/라면/],['식빵',/식빵/],['만두',/만두/]];

  function cleanName(line){
    return line.normalize('NFKC')
      .replace(/[₩￦]/g,'')
      .replace(/\b\d{8,14}\b/g,'')
      .replace(/(?:\s|^)[*xX×]?\s*\d+\s*(?:개|EA|ea)?\s*[xX×@]\s*[\d,.]+/g,' ')
      .replace(/\s+[\d,.]{3,}\s*$/,'')
      .replace(/^\s*\d{1,3}[.)\-:]\s*/,'')
      .replace(/[|_[\]{}<>©®™￡€]/g,' ')
      .replace(/[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ&+().,%/\-\s]/g,' ')
      .replace(/\s{2,}/g,' ').trim();
  }
  function normalizedFoodName(name){const match=canonicalFoods.find(([,pattern])=>pattern.test(name));return match?match[0]:name.replace(/\s+(?:D[-+]?[0-9]+|오늘까지|\d+일\s*남음).*$/i,'').trim()}
  function quantityFrom(line){
    const explicit=line.match(/(?:수량\s*[:：]?\s*|\s)(\d{1,2})\s*(?:개|EA|ea)(?:\s|$)/);
    const multiplied=line.match(/(?:^|\s)(\d{1,2})\s*[xX×@]\s*[\d,.]+/);
    return Math.min(99,Math.max(1,Number(explicit?.[1]||multiplied?.[1]||1)));
  }
  function parseReceipt(text){
    const seen=new Map();
    text.split(/\r?\n/).forEach(raw=>{
      const line=raw.trim();if(line.length<2||excluded.test(line))return;
      if(/\b20\d{2}[./-]\d{1,2}[./-]\d{1,2}\b/.test(line))return;
      const cleaned=cleanName(line),recognized=canonicalFoods.some(([,pattern])=>pattern.test(cleaned)),name=normalizedFoodName(cleaned);const korean=(name.match(/[가-힣]/g)||[]).length;
      if(name.length<2||name.length>45||korean<2||/^\d/.test(name)&&korean<3)return;
      const hasPrice=/[\d,.]{3,}/.test(line),looksFood=foodHints.test(name);
      if(!looksFood&&!hasPrice)return;
      const key=name.replace(/\s/g,'').toLowerCase();
      const suspicious=!recognized;
      if(!seen.has(key))seen.set(key,{name,quantity:quantityFrom(line),suspicious});
    });
    return [...seen.values()].slice(0,30);
  }

  async function preprocess(file){
    const bitmap=await createImageBitmap(file);const targetWidth=1800,maxWidth=2400;const scale=Math.min(2.4,maxWidth/bitmap.width,Math.max(1,targetWidth/bitmap.width));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const image=context.getImageData(0,0,canvas.width,canvas.height),data=image.data;
    for(let i=0;i<data.length;i+=4){const gray=.299*data[i]+.587*data[i+1]+.114*data[i+2];const value=gray>205?255:gray<55?0:Math.max(0,Math.min(255,(gray-128)*1.7+128));data[i]=data[i+1]=data[i+2]=value;}
    context.putImageData(image,0,0);return canvas;
  }
  function rotateCounterClockwise(source){
    const rotated=document.createElement('canvas');rotated.width=source.height;rotated.height=source.width;
    const context=rotated.getContext('2d');context.translate(0,rotated.height);context.rotate(-Math.PI/2);context.drawImage(source,0,0);return rotated;
  }
  function resultScore(items){return items.reduce((score,item)=>score+(item.suspicious?1:12),0)}
  function setStage(stage){upload.hidden=stage!=='upload';progress.hidden=stage!=='progress';review.hidden=stage!=='review';errorBox.hidden=stage!=='error'}
  function statusText(status){return({'loading tesseract core':'인식 엔진을 불러오는 중','initializing tesseract':'인식 엔진을 준비하는 중','loading language traineddata':'한국어를 배우는 중','initializing api':'문자 분석을 준비하는 중','recognizing text':'영수증 글자를 읽는 중'})[status]||'영수증을 분석하는 중'}
  function renderItems(items){
    itemsBox.innerHTML=items.map((item,index)=>`<article class="receipt-item" data-receipt-item>
      <label class="item-check"><input type="checkbox" ${item.suspicious?'':'checked'} aria-label="${escapeHtml(item.name)} 등록 선택"><span></span></label>
      <div class="item-fields"><label><span>상품명 ${item.suspicious?'<em class="review-badge">확인 필요</em>':''}</span><input class="candidate-name" maxlength="40" value="${escapeHtml(item.name)}"></label><div class="item-row"><label><span>수량</span><input class="candidate-quantity" type="number" min="1" max="99" value="${item.quantity}"></label><label><span>소비기한</span><input class="candidate-expiry" type="date"></label></div></div>
      <button class="remove-candidate" type="button" aria-label="${escapeHtml(item.name)} 제외">×</button></article>`).join('');
  }
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}

  async function recognize(file){
    cancelled=false;setStage('progress');$('#ocr-progress').value=0;$('#ocr-status').textContent='사진을 선명하게 만드는 중';
    try{
      if(!window.Tesseract)throw new Error('OCR 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
      const canvas=await preprocess(file);if(cancelled)return;
      worker=await Tesseract.createWorker('kor+eng',1,{logger:message=>{if(message.progress!=null)$('#ocr-progress').value=Math.round(message.progress*100);$('#ocr-status').textContent=statusText(message.status)}});
      if(cancelled){await worker.terminate();worker=null;return}
      await worker.setParameters({tessedit_pageseg_mode:Tesseract.PSM.SINGLE_BLOCK,preserve_interword_spaces:'1',user_defined_dpi:'300'});
      let result=await worker.recognize(canvas),text=result.data.text||'',items=parseReceipt(text);
      if(!cancelled&&items.every(item=>item.suspicious)){
        $('#ocr-status').textContent='사진 방향을 바꿔 다시 읽는 중';$('#ocr-progress').value=0;
        const rotatedResult=await worker.recognize(rotateCounterClockwise(canvas)),rotatedText=rotatedResult.data.text||'',rotatedItems=parseReceipt(rotatedText);
        if(resultScore(rotatedItems)>resultScore(items)){result=rotatedResult;text=rotatedText;items=rotatedItems}
      }
      await worker.terminate();worker=null;if(cancelled)return;$('#ocr-raw-text').textContent=text;
      if(!items.some(item=>!item.suspicious))throw new Error('확실하게 읽힌 음식이 없어요. 영수증을 세로로 놓고 글자가 화면을 가득 채우도록 더 가까이 촬영해 주세요.');
      renderItems(items);setStage('review');
    }catch(error){if(cancelled)return;worker=null;$('#receipt-error-message').textContent=error.message||'사진을 분석하지 못했습니다.';setStage('error')}
  }
  fileInputs.forEach(input=>input.addEventListener('change',()=>{const file=input.files?.[0];if(!file)return;fileInputs.filter(other=>other!==input).forEach(other=>other.value='');if(!file.type.startsWith('image/')){$('#receipt-error-message').textContent='이미지 파일만 선택할 수 있습니다.';setStage('error');return}if(file.size>15*1024*1024){$('#receipt-error-message').textContent='15MB 이하의 사진을 선택해 주세요.';setStage('error');return}recognize(file)}));
  $('#cancel-ocr').addEventListener('click',async()=>{cancelled=true;if(worker){await worker.terminate();worker=null}fileInputs.forEach(input=>input.value='');setStage('upload')});
  function resetReceipt(){cancelled=true;if(worker){worker.terminate();worker=null}fileInputs.forEach(input=>input.value='');itemsBox.innerHTML='';$('#bulk-expiry').value='';setStage('upload')}
  $('#retry-receipt').addEventListener('click',resetReceipt);$('#retry-error').addEventListener('click',resetReceipt);
  itemsBox.addEventListener('click',event=>{const button=event.target.closest('.remove-candidate');if(button)button.closest('[data-receipt-item]').remove()});
  $('#apply-bulk-date').addEventListener('click',()=>{const date=$('#bulk-expiry').value;if(!date)return;itemsBox.querySelectorAll('[data-receipt-item]').forEach(item=>{if(item.querySelector('input[type="checkbox"]').checked)item.querySelector('.candidate-expiry').value=date})});
  $('#save-receipt-items').addEventListener('click',()=>{
    const selected=[...itemsBox.querySelectorAll('[data-receipt-item]')].filter(item=>item.querySelector('input[type="checkbox"]').checked);
    const entries=selected.map(item=>({name:item.querySelector('.candidate-name').value.trim(),quantity:item.querySelector('.candidate-quantity').value,expiry:item.querySelector('.candidate-expiry').value}));
    const missing=entries.find(entry=>!entry.name||!entry.expiry);if(missing){window.fridgeApp.toast('선택한 음식의 이름과 소비기한을 확인해 주세요.');return}
    const count=window.fridgeApp.addFoods(entries);if(!count){window.fridgeApp.toast('저장할 음식을 선택해 주세요.');return}
    resetReceipt();selectTab($('#manual-tab'));window.fridgeApp.closeAddDialog();window.fridgeApp.toast(`${count}개 음식을 냉장고에 넣었어요.`);
  });
  document.querySelector('#add-dialog').addEventListener('close',()=>{if(worker){cancelled=true;worker.terminate();worker=null}});
})();
