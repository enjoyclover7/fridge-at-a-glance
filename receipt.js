(()=>{
  const $=selector=>document.querySelector(selector);
  const tabs=[['#manual-tab','#manual-panel'],['#receipt-tab','#receipt-panel']];
  const upload=$('#receipt-upload'),progress=$('#receipt-progress'),review=$('#receipt-review'),errorBox=$('#receipt-error');
  const fileInput=$('#receipt-file'),itemsBox=$('#receipt-items');
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
  const foodHints=/우유|두유|요구르트|요거트|치즈|버터|계란|달걀|두부|김치|채소|야채|과일|사과|배|귤|오렌지|바나나|딸기|포도|토마토|오이|호박|감자|고구마|양파|마늘|대파|버섯|상추|양배추|배추|당근|브로콜리|고기|돼지|소고기|쇠고기|닭|오리|연어|고등어|참치|새우|생선|햄|소시지|베이컨|어묵|맛살|라면|국수|면|파스타|쌀|밥|빵|식빵|베이글|떡|만두|피자|샐러드|주스|음료|물|커피|차|된장|고추장|간장|소스|식용유|참기름|냉동|죽|국|찌개|카레|짜장|스프|통조림|캔/i;

  function cleanName(line){
    return line
      .replace(/[₩￦]/g,'')
      .replace(/\b\d{8,14}\b/g,'')
      .replace(/(?:\s|^)[*xX×]?\s*\d+\s*(?:개|EA|ea)?\s*[xX×@]\s*[\d,.]+/g,' ')
      .replace(/\s+[\d,.]{3,}\s*$/,'')
      .replace(/^\s*\d{1,3}[.)\-:]\s*/,'')
      .replace(/[|_[\]{}<>]/g,' ')
      .replace(/\s{2,}/g,' ').trim();
  }
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
      const name=cleanName(line);const korean=(name.match(/[가-힣]/g)||[]).length;
      if(name.length<2||name.length>45||korean<2||/^\d/.test(name)&&korean<3)return;
      const hasPrice=/[\d,.]{3,}/.test(line),looksFood=foodHints.test(name);
      if(!looksFood&&!hasPrice)return;
      const key=name.replace(/\s/g,'').toLowerCase();
      if(!seen.has(key))seen.set(key,{name,quantity:quantityFrom(line)});
    });
    return [...seen.values()].slice(0,30);
  }

  async function preprocess(file){
    const bitmap=await createImageBitmap(file);const maxWidth=1800;const scale=Math.min(1,maxWidth/bitmap.width);
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const image=context.getImageData(0,0,canvas.width,canvas.height),data=image.data;
    for(let i=0;i<data.length;i+=4){const gray=.299*data[i]+.587*data[i+1]+.114*data[i+2];const value=gray>175?255:gray<75?0:Math.max(0,Math.min(255,(gray-128)*1.45+128));data[i]=data[i+1]=data[i+2]=value;}
    context.putImageData(image,0,0);return canvas;
  }
  function setStage(stage){upload.hidden=stage!=='upload';progress.hidden=stage!=='progress';review.hidden=stage!=='review';errorBox.hidden=stage!=='error'}
  function statusText(status){return({'loading tesseract core':'인식 엔진을 불러오는 중','initializing tesseract':'인식 엔진을 준비하는 중','loading language traineddata':'한국어를 배우는 중','initializing api':'문자 분석을 준비하는 중','recognizing text':'영수증 글자를 읽는 중'})[status]||'영수증을 분석하는 중'}
  function renderItems(items){
    itemsBox.innerHTML=items.map((item,index)=>`<article class="receipt-item" data-receipt-item>
      <label class="item-check"><input type="checkbox" checked aria-label="${escapeHtml(item.name)} 등록 선택"><span></span></label>
      <div class="item-fields"><label><span>상품명</span><input class="candidate-name" maxlength="40" value="${escapeHtml(item.name)}"></label><div class="item-row"><label><span>수량</span><input class="candidate-quantity" type="number" min="1" max="99" value="${item.quantity}"></label><label><span>소비기한</span><input class="candidate-expiry" type="date"></label></div></div>
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
      const result=await worker.recognize(canvas);await worker.terminate();worker=null;if(cancelled)return;
      const text=result.data.text||'',items=parseReceipt(text);$('#ocr-raw-text').textContent=text;
      if(!items.length)throw new Error('상품명 후보를 찾지 못했습니다. 영수증 전체가 밝고 반듯하게 보이도록 다시 찍어 주세요.');
      renderItems(items);setStage('review');
    }catch(error){if(cancelled)return;worker=null;$('#receipt-error-message').textContent=error.message||'사진을 분석하지 못했습니다.';setStage('error')}
  }
  fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){$('#receipt-error-message').textContent='이미지 파일만 선택할 수 있습니다.';setStage('error');return}if(file.size>15*1024*1024){$('#receipt-error-message').textContent='15MB 이하의 사진을 선택해 주세요.';setStage('error');return}recognize(file)});
  $('#cancel-ocr').addEventListener('click',async()=>{cancelled=true;if(worker){await worker.terminate();worker=null}fileInput.value='';setStage('upload')});
  function resetReceipt(){cancelled=true;if(worker){worker.terminate();worker=null}fileInput.value='';itemsBox.innerHTML='';$('#bulk-expiry').value='';setStage('upload')}
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
