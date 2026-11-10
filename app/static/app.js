/* Nexora-AI Enterprise RAG: front-end logic. Talks to the FastAPI routes in main.py */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>`<svg class="i"><use href="#${n}"/></svg>`;
const store={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}},del:k=>{try{localStorage.removeItem(k)}catch{}}};
const TITLES={chat:['Chat','Ask questions about your workspace documents'],documents:['Documents','Upload files and track processing'],
  approvals:['Approvals','Review requests that need an administrator'],insights:['Insights','Documents, feedback and guardrail activity']};
let conv=store.get('nexora.conv'),sending=false,docCache=[];

/* ---------- helpers ---------- */
async function api(path,opts={}){
  const r=await fetch(path,{headers:{'Content-Type':'application/json'},...opts});let d=null;
  try{d=await r.json()}catch{}
  if(!r.ok){let m=d&&d.detail;if(Array.isArray(m))m=m.map(x=>x.msg).join(', ');const e=new Error(m||r.statusText);e.status=r.status;throw e}
  return d}
const post=(p,b)=>api(p,{method:'POST',body:JSON.stringify(b)});
function toast(t){$('.toast')?.remove();const e=document.createElement('div');e.className='toast glass';e.textContent=t;e.setAttribute('role','status');document.body.append(e);setTimeout(()=>e.remove(),4000)}
function ago(d){const s=(new Date(d)-Date.now())/1000,f=new Intl.RelativeTimeFormat('en',{numeric:'auto'});
  for(const[u,n]of[['day',86400],['hour',3600],['minute',60]])if(Math.abs(s)>=n)return f.format(Math.round(s/n),u);return 'just now'}
const chip=s=>`<span class="chip ${esc(s)}">${esc(s)}</span>`;
function md(t){ // small safe markdown: code blocks, inline code, bold, lists
  const keep=[];let h=esc(t).replace(/```([\s\S]*?)```/g,(_,c)=>{keep.push(`<pre><code>${c.trim()}</code></pre>`);return `\n\n@@${keep.length-1}@@\n\n`});
  h=h.replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
  return h.split(/\n{2,}/).filter(b=>b.trim()).map(b=>{
    const m=b.match(/^@@(\d+)@@$/);if(m)return keep[m[1]];const L=b.split('\n');
    return L.every(l=>/^\s*[-*]\s/.test(l))?'<ul>'+L.map(l=>`<li>${l.replace(/^\s*[-*]\s/,'')}</li>`).join('')+'</ul>':`<p>${L.join('<br>')}</p>`}).join('')}

/* ---------- theme ---------- */
function setTheme(t){document.documentElement.dataset.theme=t;store.set('nexora.theme',t);$('#themeIcon').innerHTML=`<use href="#${t==='dark'?'sun':'moon'}"/>`}
$('#theme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
setTheme(document.documentElement.dataset.theme||'light');

/* ---------- navigation ---------- */
function show(v){
  if(!TITLES[v])v='chat';
  $$('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));
  $$('.nav button').forEach(b=>b.dataset.v===v?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  $('#title').textContent=TITLES[v][0];$('#sub').textContent=TITLES[v][1];$('#newChat').hidden=v!=='chat';
  if(v==='documents')loadDocs();if(v==='approvals')loadApprovals();if(v==='insights')loadInsights();
  if(location.hash!=='#'+v)history.replaceState(null,'','#'+v)}
$$('.nav button').forEach(b=>b.onclick=()=>show(b.dataset.v));
addEventListener('hashchange',()=>show(location.hash.slice(1)));
addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();show('chat');$('#input').focus()}});

/* ---------- chat ---------- */
const msgs=$('#msgs'),thread=$('#thread'),input=$('#input');
const down=()=>msgs.scrollTo({top:msgs.scrollHeight,behavior:'smooth'});
function add(cls,html){$('#empty')?.remove();const d=document.createElement('div');d.className='m '+cls;d.innerHTML=html;thread.append(d);down();return d}
const userMsg=t=>add('u',`<div class="bub">${esc(t)}</div>`);
const srcName=s=>typeof s==='string'?s:s.title||s.document_title||s.filename||s.source||s.name||'Source';
function botMsg(r,tools=true){
  const st=r.status,docId=(r.sources||[]).map(s=>s&&s.document_id).find(Boolean)||null;
  let h=`<div class="bub ${st==='guardrail_blocked'?'warn':''}">${md(r.answer||'')}</div>`;
  if(st==='pending_approval')h+=`<button class="btn" data-go="approvals">${icon('shield')}Open approvals</button>`;
  const S=(r.sources||[]).map(srcName);
  if(S.length)h+=`<div class="src">${S.map(s=>`<span>${icon('doc')}${esc(s)}</span>`).join('')}</div>`;
  if(tools)h+=`<div class="tools"><button aria-label="Copy answer" data-copy>${icon('copy')}</button>`+
    (st?'':`<button aria-label="Helpful" data-r="1">${icon('like')}</button><button aria-label="Not helpful" data-r="-1">${icon('dislike')}</button>`)+`</div>`;
  const d=add('',h);
  $('[data-copy]',d)?.addEventListener('click',()=>navigator.clipboard.writeText(r.answer||'').then(()=>toast('Copied')));
  $$('[data-r]',d).forEach(b=>b.onclick=async()=>{
    try{await post('/api/feedback',{document_id:docId?String(docId):null,rating:+b.dataset.r,note:''});
      $$('[data-r]',d).forEach(x=>x.disabled=true);b.classList.add('sel');toast('Thanks for the feedback')}catch(e){toast(e.message)}});
  $('[data-go]',d)?.addEventListener('click',()=>show('approvals'))}
const fit=()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,160)+'px'};
async function ask(q){
  q=q.trim();if(sending)return;if(q.length<3)return toast('Enter at least 3 characters.');
  userMsg(q);input.value='';fit();sending=true;$('#send').disabled=true;
  const typing=add('','<div class="bub"><div class="typing"><i></i><i></i><i></i></div></div>');
  try{
    const body={question:q};if(conv)body.conversation_id=conv;
    const r=await post('/api/chat',body);typing.remove();
    if(r.conversation_id){conv=r.conversation_id;store.set('nexora.conv',conv)}
    botMsg(r);if(r.status==='pending_approval')loadApprovals(true)}
  catch(e){typing.remove();add('',`<div class="bub err">${esc(e.message)}</div>`)}
  sending=false;$('#send').disabled=false;input.focus()}
$('#form').onsubmit=e=>{e.preventDefault();ask(input.value)};
input.oninput=fit;input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(input.value)}};
$$('[data-q]').forEach(b=>b.onclick=()=>ask(b.dataset.q));
$('#newChat').onclick=()=>{store.del('nexora.conv');location.reload()};
(async()=>{ // restore previous conversation
  if(!conv)return;
  try{const r=await api(`/api/conversations/${conv}/messages`);
    (r.messages||[]).forEach(m=>{
      if(m.question!=null||m.answer!=null){m.question&&userMsg(m.question);m.answer&&botMsg({answer:m.answer},false);return}
      const t=m.content??m.text??'';/^(user|human)$/i.test(m.role||'')?userMsg(t):botMsg({answer:t},false)})}
  catch{conv=null;store.del('nexora.conv')}})();

/* ---------- documents ---------- */
const ALLOWED=['.pdf','.docx','.txt','.md'];let docTimer;
function drawDocs(){
  const f=($('#q').value||'').toLowerCase(),D=docCache.filter(d=>d.title.toLowerCase().includes(f));
  $('#docs').innerHTML=D.length?D.map(d=>`<tr><td><b>${esc(d.title)}</b></td><td>${chip(d.status)}</td><td>v${esc(d.current_version)}</td>
    <td>${(d.allowed_groups||[]).map(esc).join(', ')}</td><td>${d.created_at?ago(d.created_at):''}</td></tr>`).join('')
    :`<tr><td colspan="5" class="none">${docCache.length?'No documents match your search.':'No documents yet. Drop a file above to get started.'}</td></tr>`}
async function loadDocs(){
  if(!docCache.length)$('#docs').innerHTML=Array(3).fill('<tr><td colspan="5"><div class="sk"></div></td></tr>').join('');
  try{docCache=(await api('/api/documents')).documents||[];drawDocs();clearTimeout(docTimer);
    if(docCache.some(d=>['pending','processing'].includes(d.status))&&$('#v-documents').classList.contains('on'))docTimer=setTimeout(loadDocs,5000)}
  catch(e){$('#docs').innerHTML=`<tr><td colspan="5" class="none">${esc(e.message)}</td></tr>`}}
function putFile(url,file,headers,onProgress){
  return new Promise((ok,no)=>{const x=new XMLHttpRequest();x.open('PUT',url);
    Object.entries(headers||{}).forEach(([k,v])=>x.setRequestHeader(k,v));
    x.upload.onprogress=e=>e.lengthComputable&&onProgress(e.loaded/e.total);
    x.onload=()=>x.status<300?ok():no(new Error(`Storage rejected the upload (${x.status}).`));
    x.onerror=()=>no(new Error('Could not reach storage. Check the bucket CORS rules.'));x.send(file)})}
async function upload(f){
  const el=document.createElement('div');el.className='qi';
  el.innerHTML=`<div><span>${esc(f.name)}</span><small>Preparing</small></div><div class="bar"><i></i></div>`;$('#queue').prepend(el);
  const say=t=>$('small',el).textContent=t,bar=p=>$('.bar i',el).style.width=p*100+'%';
  try{
    if(!ALLOWED.includes('.'+f.name.split('.').pop().toLowerCase()))throw new Error('Allowed types: PDF, DOCX, TXT, MD');
    const u=await post('/api/documents/uploads',{filename:f.name});
    await putFile(u.upload_url,f,u.headers,p=>{bar(p);say(`Uploading ${Math.round(p*100)}%`)});
    bar(1);say('Processing, this can take a minute');
    await post('/api/documents/complete',{document_id:u.document_id});
    say('Ready');loadDocs();setTimeout(()=>el.remove(),4000)}
  catch(e){say(e.message);el.style.borderColor='var(--bad)';$('.bar',el)?.remove();loadDocs()}}
const pick=fs=>[...fs].forEach(upload);
$('#file').onchange=e=>{pick(e.target.files);e.target.value=''};
const dz=$('#drop');
['dragenter','dragover'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.add('over')}));
['dragleave','drop'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.remove('over')}));
dz.addEventListener('drop',e=>pick(e.dataTransfer.files));
$('#refresh').onclick=loadDocs;$('#q').oninput=drawDocs;

/* ---------- approvals ---------- */
async function loadApprovals(quiet){
  try{
    const A=(await api('/api/approvals')).approvals||[],p=A.filter(a=>a.status==='pending').length;
    $('#badge').hidden=!p;$('#badge').textContent=p;if(quiet)return;
    $('#appr').innerHTML=A.length?A.map(a=>`<div class="row"><div><b>${esc(a.question)}</b>
      <small>Requested by ${esc(a.requester)} ${a.created_at?ago(a.created_at):''}${a.reviewer?`, reviewed by ${esc(a.reviewer)}`:''}</small></div>
      <div class="acts">${a.status==='pending'?`<button class="btn" data-id="${a.id}" data-a="0">Reject</button><button class="btn pri" data-id="${a.id}" data-a="1">Approve</button>`:chip(a.status)}</div></div>`).join('')
      :`<div class="none">No approval requests.</div>`;
    $$('[data-id]').forEach(b=>b.onclick=async()=>{
      try{await post(`/api/approvals/${b.dataset.id}/decision`,{approve:b.dataset.a==='1'});toast('Decision saved. Nothing was executed.');loadApprovals()}
      catch(e){toast(e.message)}})}
  catch(e){if(!quiet)$('#appr').innerHTML=`<div class="none">${e.status===403?'Only administrators can review approvals.':esc(e.message)}</div>`}}

/* ---------- insights ---------- */
const bars=(rows,key)=>{const m=Math.max(1,...rows.map(r=>+r.total));
  return rows.length?rows.map(r=>`<div class="hb"><span>${esc(r[key])}</span><div class="bar"><i style="width:${r.total/m*100}%"></i></div><b>${r.total}</b></div>`).join(''):'<div class="none">No data yet.</div>'};
async function loadInsights(){
  const[m,g]=await Promise.allSettled([api('/api/admin/metrics'),api('/api/admin/guardrails')]);let h='';
  if(m.status==='fulfilled'){
    const fb={1:0,0:0,'-1':0};m.value.feedback.forEach(r=>fb[r.rating]=+r.total);const n=fb[1]+fb[-1];
    h+=`<div class="card"><h3 style="padding:16px 18px 0">Documents by status</h3><div class="pad">${bars(m.value.documents,'status')}</div></div>
    <div class="card"><h3 style="padding:16px 18px 0">Feedback</h3><div class="pad"><div class="stat"><div><b>${fb[1]}</b><span>Helpful</span></div><div><b>${fb[-1]}</b><span>Not helpful</span></div><div><b>${fb[0]}</b><span>Neutral</span></div></div>
    <span class="note">${n?`${Math.round(fb[1]/n*100)}% helpful`:'No ratings yet.'}</span></div></div>`}
  else h+=`<div class="card"><div class="none">${esc(m.reason.message)}</div></div>`;
  if(g.status==='fulfilled'){
    const c={};g.value.events.forEach(e=>c[e.action]=e.total);
    h+=`<div class="card"><h3 style="padding:16px 18px 0">Guardrails</h3><div class="pad"><div class="stat"><div><b>${c.guardrail_input_blocked||0}</b><span>Inputs blocked</span></div><div><b>${c.guardrail_output_blocked||0}</b><span>Outputs blocked</span></div></div>
    <span class="note">${g.value.managed_bedrock_guardrails?'Managed Bedrock Guardrails are on.':'Rule-based checks only. Managed Bedrock Guardrails are off.'}</span></div></div>`}
  else h+=`<div class="card"><h3 style="padding:16px 18px 0">Guardrails</h3><div class="none">${g.reason.status===403?'Visible to administrators only.':esc(g.reason.message)}</div></div>`;
  $('#ins').innerHTML=h}

/* ---------- health + boot ---------- */
async function health(){
  let ok=false;try{ok=(await fetch('/health/ready')).ok}catch{}
  $('#health .dot').className='dot '+(ok?'ok':'bad');$('#health span:last-child').textContent=ok?'Ready':'Database offline'}
health();setInterval(health,30000);loadApprovals(true);
show(location.hash.slice(1)||'chat');