import {setupNodeDrag} from './node-drag.js?v=1.9.5';
import {setupNodeTools} from './node-tools.js?v=1.9.5';
const API = 'https://fgomaujsdblpzxhnnqrg.supabase.co/rest/v1/gantt01_20261016_tasks';
const DAYFLOW_API='https://fgomaujsdblpzxhnnqrg.supabase.co/rest/v1/gantt01_dayflow_dated_20261017';
const DAYFLOW_KEY='sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i';
let dayflowLoading=false,dayflowCompleted=new Map();
const isDayflow=t=>!t.external&&(t.id==='2ef54192-bae1-4129-9aec-16b0c3f4d0e9'||t.title.trim().toLowerCase()==='dayflow');
const KEY = 'sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i';
const $ = s => document.querySelector(s);
const isAndroid=/Android/i.test(navigator.userAgent)||navigator.userAgentData?.platform==='Android';
if(isAndroid){document.body.classList.add('android-document');$('#zoom').hidden=true;$('#today').hidden=true;document.querySelector('footer>span').textContent='Tap a node for options · Expand branches to see their tasks and dates';}
const DAY = 86400000;
const date = s => new Date(s + 'T12:00:00Z');
const iso = d => d.toISOString().slice(0,10);
const shift = (s,n) => iso(new Date(+date(s)+n*DAY));
const diff = (a,b) => Math.round((date(a)-date(b))/DAY);
const today = () => new Intl.DateTimeFormat('en-CA').format(new Date());
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tasks=[], collapsed=new Set(), editing=null, busy=false, unit=30, origin, count, moving=false, initialLoad=true,focusedNode=null,nearTermOnly=false,rangeDays=10,expandedRoot=null;
async function request(path='',method='GET',body) {
 const response=await fetch(API+path,{method,headers:{apikey:KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined});
 if(!response.ok){let e=await response.json().catch(()=>({}));throw Error(e.message||`Request failed (${response.status})`);}
 return response.status===204?null:response.json();
}
function error(e){$('#error').textContent=e.message;$('#error').hidden=false;$('#status').textContent='Connection issue';}
async function load(){try{
 const firstLoad=initialLoad;const imported=tasks.filter(t=>t.external);const [saved,completion]=await Promise.all([request('?select=*&order=sort_order.asc,created_at.asc'),completionRequest('?select=*')]);tasks=saved;dayflowCompleted=new Map(completion.map(t=>[t.task_id,t.completed]));
 if(initialLoad)collapseTree();
 const parents=new Set(tasks.filter(isDayflow).map(t=>t.id));tasks.push(...imported.filter(t=>parents.has(t.parent_id)));
 $('#status').textContent='All changes saved';$('#error').hidden=true;
 if(((firstLoad||nearTermOnly)&&parents.size)||tasks.some(t=>isDayflow(t)&&!collapsed.has(t.id)))await loadDayflow();
 render();if(firstLoad){$('#today').click();initialLoad=false;if($('#error').hidden)$('#status').textContent='All changes saved';}
 }catch(e){error(e);if(!tasks.length)$('#chart').innerHTML='<div class="empty">Could not load the timeline. Use Refresh to try again.</div>';}}
async function loadDayflow(){
 if(dayflowLoading)return;const parents=tasks.filter(isDayflow);if(!parents.length)return;dayflowLoading=true;$('#status').textContent='Loading DayFlow…';
 try{
 const entries=[];for(let offset=0;;offset+=1000){const response=await fetch(DAYFLOW_API+'?select=id,title,date,start_time,color&date=gte.'+today()+'&order=date.asc,start_time.asc.nullsfirst,id.asc&limit=1000&offset='+offset,{headers:{apikey:DAYFLOW_KEY}});if(!response.ok)throw Error('DayFlow could not load. Click Refresh to retry.');const page=await response.json();entries.push(...page);if(page.length<1000)break;}
 const scroll=$('#chart').scrollLeft,previousOrigin=origin;
 tasks=tasks.filter(t=>!t.external);for(const parent of parents)for(const entry of entries.filter(e=>e.date>=today()))tasks.push({id:'dayflow:'+parent.id+':'+encodeURIComponent(entry.id),parent_id:parent.id,title:entry.title,start_date:entry.date,end_date:entry.date,color:entry.color,progress:dayflowCompleted.get('dayflow:'+parent.id+':'+encodeURIComponent(entry.id))?100:0,sort_order:0,external:true,start_time:entry.start_time});
 render();if(!isAndroid)$('#chart').scrollLeft=scroll+(previousOrigin?diff(previousOrigin,origin)*unit:0);$('#status').textContent='DayFlow synced · '+entries.length+' entries';$('#error').hidden=true;
 }catch(e){error(e);}finally{dayflowLoading=false;}
}
setInterval(()=>{if(!document.hidden&&tasks.some(t=>isDayflow(t)&&!collapsed.has(t.id)))loadDayflow();},60000);

async function completionRequest(path='',method='GET',body){const r=await fetch(API.replace('gantt01_20261016_tasks','gantt01_20261017_completion')+path,{method,headers:{apikey:KEY,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error('Could not save completion status.');return r.status===204?null:r.json();}
$('#chart').addEventListener('change',async e=>{const input=e.target.closest('[data-complete]');if(!input)return;const t=tasks.find(t=>t.id===input.dataset.complete),checked=input.checked;input.disabled=true;try{if(t.external){await completionRequest('','POST',{task_id:t.id,completed:checked});dayflowCompleted.set(t.id,checked);}else await request('?id=eq.'+t.id,'PATCH',{progress:checked?100:0});t.progress=checked?100:0;render();$('#status').textContent='All changes saved';}catch(e){input.checked=!checked;error(e);}finally{input.disabled=false;}});
function nodeLabel(t){if(!t.external)return t.title;const time=t.start_time;if(!time)return t.title+' · All day';const [h,m]=time.split(':').map(Number);return t.title+' · '+(h%12||12)+':'+String(m).padStart(2,'0')+' '+(h>=12?'PM':'AM');}
function depth(t){let n=1;while(t.parent_id){t=tasks.find(x=>x.id===t.parent_id);if(!t)break;n++;if(n>5)break;}return n;}
function collapseTree(){$('#expand').value='1';expandedRoot=null;collapsed=new Set(tasks.filter(t=>isDayflow(t)||tasks.some(child=>child.parent_id===t.id)).map(t=>t.id));$('#search').value='';}
function descendants(id){let result=[];for(const t of tasks.filter(x=>x.parent_id===id))result.push(t.id,...descendants(t.id));return result;}
function scopedTasks(){if(expandedRoot&&!focusedNode){const roots=tasks.filter(t=>!t.parent_id&&(t.id===expandedRoot||isDayflow(t)));const ids=new Set(roots.flatMap(t=>[t.id,...descendants(t.id)]));return tasks.filter(t=>ids.has(t.id));}if(!focusedNode){if(!nearTermOnly)return tasks;const ids=nearTermIds();return tasks.filter(t=>ids.has(t.id));}const ids=new Set([focusedNode,...descendants(focusedNode)]);return tasks.filter(t=>ids.has(t.id));}
function nearTermIds(){const ids=new Set(),start=today(),end=shift(start,rangeDays);for(const t of tasks){if(!t.start_date||!t.end_date||t.start_date>end||t.end_date<start)continue;ids.add(t.id);let p=t.parent_id;while(p){ids.add(p);p=tasks.find(t=>t.id===p)?.parent_id;}}return ids;}
function visible(){const eligible=nearTermOnly&&!focusedNode?nearTermIds():null;const rows=[],query=$('#search').value.toLowerCase().trim();const matches=new Set();if(query)for(const t of tasks.filter(t=>t.title.toLowerCase().includes(query))){matches.add(t.id);let p=t.parent_id;while(p){matches.add(p);p=tasks.find(t=>t.id===p)?.parent_id;}}
 function walk(parent,level){const dayflowParent=tasks.some(t=>t.id===parent&&isDayflow(t));for(const t of tasks.filter(t=>t.parent_id===parent).sort((a,b)=>Number(isDayflow(a))-Number(isDayflow(b))||(dayflowParent?((a.start_date||'9999-12-31').localeCompare(b.start_date||'9999-12-31')||(a.start_time||'').localeCompare(b.start_time||'')):0)||(!dayflowParent?((a.sort_order||0)-(b.sort_order||0)):0)||a.title.localeCompare(b.title,undefined,{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id))){if(eligible&&!eligible.has(t.id))continue;if(level===1&&focusedNode&&t.id!==focusedNode)continue;if(level===1&&!focusedNode&&expandedRoot&&t.id!==expandedRoot&&!isDayflow(t))continue;if(query&&!matches.has(t.id))continue;rows.push({...t,level});if(query||!collapsed.has(t.id))walk(t.id,level+1);}}walk(null,1);return rows;}
function renderNodeLeft(t){const has=isDayflow(t)||tasks.some(x=>x.parent_id===t.id);return `<div class="task-left" style="padding-left:${10+(t.level-1)*15}px"><button class="toggle ${has?'':'leaf-chevron'}" data-toggle="${t.id}" aria-label="${has?(collapsed.has(t.id)?'Expand':'Collapse'):'No children for'} ${esc(t.title)}" ${has?`aria-expanded="${!collapsed.has(t.id)}"`:'disabled'}>${has&&!collapsed.has(t.id)?'⌄':'›'}</button><input class="complete-toggle" type="checkbox" data-complete="${t.id}" aria-label="Completed: ${esc(t.title)}" ${t.progress===100?'checked':''}><button class="task-name ${t.level===1?'root-name':''}" data-edit="${t.id}" ${!t.external?`data-drag="${t.id}"`:""}><span class="node-label">${esc(nodeLabel(t))}</span></button>${t.external?'<span class="source-label" title="From DayFlow">↗</span>':''}</div>`;}
function nodeDates(t){if(!t.start_date||!t.end_date)return '';const format=s=>date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});return t.start_date===t.end_date?format(t.start_date):format(t.start_date)+' – '+format(t.end_date);}
function renderAndroid(rows){$('#chart').innerHTML='<div class="android-doc-head"><span>NODE</span><span>DATES</span></div>'+rows.map(t=>`<article class="task-row android-row ${t.progress===100?'completed':''}" data-id="${t.id}">${renderNodeLeft(t)}<div class="android-dates">${esc(nodeDates(t))}</div></article>`).join('')+(!rows.length?'<div class="empty">No matching tasks.</div>':'');}
function render(){
 hideBarHover();
 nodeTools.closeMenu();
 if(focusedNode&&!tasks.some(t=>t.id===focusedNode&&!t.parent_id))focusedNode=null;
 $('#show-all').hidden=!!focusedNode;$('#show-all').value=nearTermOnly?String(rangeDays):'all';
 if(expandedRoot&&!tasks.some(t=>t.id===expandedRoot&&!t.parent_id&&!collapsed.has(t.id)))expandedRoot=null;

 const dates=scopedTasks().flatMap(t=>[t.start_date,t.end_date]).filter(Boolean);dates.push(today());dates.sort();origin=shift(dates[0],-5);count=Math.max(60,diff(dates.at(-1),origin)+15,diff(today(),origin)+Math.ceil($('#chart').clientWidth/unit));const width=count*unit;
 const rows=visible();if(isAndroid){renderAndroid(rows);return;}let days='',months='';let last='';for(let i=0;i<count;i++){const s=shift(origin,i),d=date(s),month=d.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});if(month!==last){let span=0;while(i+span<count&&date(shift(origin,i+span)).getUTCMonth()===d.getUTCMonth())span++;months+=`<span style="display:inline-block;width:${span*unit}px;padding-left:10px;border-right:1px solid #e9ecf3">${esc(month)}</span>`;last=month;}days+=`<div class="day ${[0,6].includes(d.getUTCDay())?'weekend':''} ${s===today()?'is-today':''}" style="width:${unit}px" data-date="${s}" aria-label="${s}"><span class="weekday">${unit>=16||d.getUTCDate()===1?'SMTWTFS'[d.getUTCDay()]:''}</span><span class="date-number">${unit>=16?d.getUTCDate():(d.getUTCDate()===1?'1':'')}</span></div>`;}
 const marker=diff(today(),origin)*unit+unit/2;
 $('#chart').innerHTML=`<div class="chart-inner" style="--day-width:${unit}px"><div class="chart-head"><div class="left-head"><span>TASK NAME</span></div><div class="time-head" style="width:${width}px"><div class="month">${months}</div><div class="days">${days}</div></div></div>${rows.map(t=>{
 return `<div class="task-row" data-id="${t.id}">${renderNodeLeft(t)}<div class="track" style="width:${width}px"><div class="today-line" style="left:${marker}px"></div>${t.start_date&&t.end_date?`<div class="bar ${t.progress===100?'completed':''}" data-bar="${t.id}" style="left:${diff(t.start_date,origin)*unit}px;width:${(diff(t.end_date,t.start_date)+1)*unit}px;--color:${/^#[0-9a-f]{6}$/i.test(t.color)?t.color:'#6172f3'}"><div class="bar-fill" style="width:${t.progress}%"></div><span class="bar-label">${esc(nodeLabel(t))}</span>${!t.external?'<div class="resize" aria-label="Resize task"></div>':''}</div>`:''}</div></div>`;
 }).join('')}${!rows.length?'<div class="empty">'+(tasks.length?(nearTermOnly&&!focusedNode?'No tasks active today or in the next '+rangeDays+' days. Use Show all to see every node.':'No matching tasks.'):'Your next project starts here. Add your first task above.')+'</div>':''}</div>`;
}
function openEditor(id=null,parent=null){if(tasks.find(t=>t.id===id)?.external)return;editing=id;const t=tasks.find(t=>t.id===id),form=$('#task-form');form.reset();$('#form-error').textContent='';$('#dialog-title').textContent=t?'Edit node':`New node · Level ${parent?depth(tasks.find(t=>t.id===parent))+1:1}`;$('#delete').hidden=!t;
 const excluded=new Set(id?[id,...descendants(id)]:[]);form.elements.parent_id.innerHTML='<option value="">None — top-level task</option>'+tasks.filter(x=>!x.external&&!excluded.has(x.id)&&depth(x)<4).map(x=>`<option value="${x.id}">${esc('　'.repeat(depth(x)-1)+x.title)}</option>`).join('');
 for(const [k,v] of Object.entries(t||{title:'',parent_id:parent||'',start_date:today(),end_date:shift(today(),6),progress:0,color:tasks.find(t=>t.id===parent)?.color||'#6172f3',notes:'',link_url:''})){if(k!=='parent_id'&&form.elements[k])form.elements[k].value=v??'';}
 form.elements.parent_id.value=t?t.parent_id||'':parent||'';
 form.elements.completed.checked=t?.progress===100;form.elements.no_date.checked=!t||!t.start_date;syncDates();
 $('#editor').showModal();form.elements.title.focus();}
function syncDates(){const f=$('#task-form').elements;for(const name of ['start_date','end_date']){f[name].disabled=f.no_date.checked;f[name].required=!f.no_date.checked;if(!f.no_date.checked&&!f[name].value)f[name].value=today();}}
$('#task-form').elements.no_date.onchange=syncDates;
$('#add').onclick=()=>openEditor();$('#close').onclick=$('#cancel').onclick=()=>$('#editor').close();$('#refresh').onclick=load;$('#search').oninput=render;$('#zoom').onchange=e=>{unit=+e.target.value;render();};$('#expand').onchange=e=>{const level=Number(e.target.value);focusedNode=null;expandedRoot=null;$('#search').value='';collapsed=new Set(tasks.filter(t=>depth(t)>=level).map(t=>t.id));render();if(level>1)loadDayflow();};$('#today').onclick=()=>{if(isAndroid)return;$('#chart').scrollLeft=Math.max(0,diff(today(),origin)*unit-100);};
$('#chart').onclick=e=>{if(moving)return;const el=e.target.closest('[data-toggle],[data-edit]');if(!el)return;if(el.dataset.toggle){const id=el.dataset.toggle,node=tasks.find(t=>t.id===id),opening=collapsed.has(id);opening?collapsed.delete(id):collapsed.add(id);if(node&&!node.parent_id&&!focusedNode&&!isDayflow(node)){if(opening){expandedRoot=id;tasks.filter(t=>!t.parent_id&&t.id!==id&&!isDayflow(t)).forEach(t=>collapsed.add(t.id));}else if(expandedRoot===id)expandedRoot=null;}render();if(isDayflow(tasks.find(t=>t.id===id))&&!collapsed.has(id))loadDayflow();}else if(el.dataset.edit){const t=tasks.find(t=>t.id===el.dataset.edit);if(t&&!t.external)nodeTools.openMenu(t.id,el);}};
$('#task-form').onsubmit=async e=>{e.preventDefault();if(busy)return;const f=e.target.elements;const body={title:f.title.value.trim(),parent_id:f.parent_id.value||null,start_date:f.no_date.checked?null:f.start_date.value,end_date:f.no_date.checked?null:f.end_date.value,progress:f.completed.checked?100:0,color:f.color.value,notes:f.notes.value,link_url:f.link_url.value.trim()};if(body.link_url&&!validLink(body.link_url)){$('#form-error').textContent='Enter an http:// or https:// URL.';return;}if(!body.title){$('#form-error').textContent='Enter a task name.';return;}if(body.end_date<body.start_date){$('#form-error').textContent='End date must be on or after start date.';return;}
 busy=true;$('#save').disabled=true;try{if(!editing)body.sort_order=Math.max(0,...tasks.map(t=>t.sort_order))+1;await request(editing?'?id=eq.'+editing:'',editing?'PATCH':'POST',body);if(body.parent_id)collapsed.delete(body.parent_id);$('#editor').close();await load();}catch(e){$('#form-error').textContent=e.message;}finally{busy=false;$('#save').disabled=false;}};
$('#delete').onclick=async()=>{if(busy)return;const n=descendants(editing).length;if(!confirm(`Delete this task${n?` and its ${n} subtasks`:''}?`))return;busy=true;try{await request('?id=eq.'+editing,'DELETE');$('#editor').close();await load();}catch(e){$('#form-error').textContent=e.message;}finally{busy=false;}};
$('#chart').addEventListener('pointerdown',e=>{const bar=e.target.closest('[data-bar]');if(!bar||e.button!==0||busy)return;const task=tasks.find(t=>t.id===bar.dataset.bar);if(task.external)return;const start=e.clientX,left=parseFloat(bar.style.left),width=parseFloat(bar.style.width),resize=!!e.target.closest('.resize');bar.setPointerCapture(e.pointerId);let delta=0;const onmove=e=>{delta=Math.round((e.clientX-start)/unit);if(resize)delta=Math.max(-diff(task.end_date,task.start_date),delta);if(Math.abs(e.clientX-start)>3)moving=true;if(resize)bar.style.width=width+delta*unit+'px';else bar.style.left=left+delta*unit+'px';};const onup=async e=>{bar.removeEventListener('pointermove',onmove);bar.removeEventListener('pointerup',onup);bar.removeEventListener('pointercancel',oncancel);if(e.type==='pointercancel'){render();moving=false;return;}if(delta){busy=true;$('#status').textContent='Saving…';try{await request('?id=eq.'+task.id,'PATCH',resize?{end_date:shift(task.end_date,delta)}:{start_date:shift(task.start_date,delta),end_date:shift(task.end_date,delta)});await load();}catch(e){error(e);render();}finally{busy=false;}}else if(!moving)openEditor(task.id);setTimeout(()=>moving=false,0);};const oncancel=e=>onup(e);bar.addEventListener('pointermove',onmove);bar.addEventListener('pointerup',onup);bar.addEventListener('pointercancel',oncancel);});
$('#export').onclick=()=>{const columns=['title','parent_id','start_date','end_date','progress','notes','id'];const csv=[columns,...tasks.map(t=>columns.map(c=>t[c]??''))].map(row=>row.map(v=>'"'+String(v).replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='gantt-tasks.csv';a.click();URL.revokeObjectURL(url);};

const hoverTip=document.createElement('div');hoverTip.className='bar-tooltip';hoverTip.id='bar-tooltip';hoverTip.setAttribute('role','tooltip');hoverTip.hidden=true;document.body.append(hoverTip);
function hideBarHover(){document.querySelector('.hover-date-line')?.remove();document.querySelector('.hover-date')?.classList.remove('hover-date');document.querySelector('[aria-describedby="bar-tooltip"]')?.removeAttribute('aria-describedby');document.querySelector('#bar-tooltip')?.setAttribute('hidden','');}
$('#chart').addEventListener('pointermove',e=>{
 const root=e.target.closest('.node-label')?.closest('.task-left'),rootNode=root?tasks.find(t=>t.id===root.closest('.task-row').dataset.id):null;
 if(rootNode&&!e.buttons&&!moving&&!busy){
  hideBarHover();const ids=new Set([rootNode.id,...descendants(rootNode.id)]),dates=tasks.filter(t=>ids.has(t.id)).map(t=>t.start_date).filter(Boolean).sort();
  const away=s=>{const n=diff(s,today());return n<0?`${Math.abs(n)} days ago`:n===0?'Today':`${n} days away`;};
  hoverTip.textContent=dates.length?`First start: ${away(dates[0])} · Last start: ${away(dates.at(-1))}`:'No start dates in this group';hoverTip.hidden=false;root.setAttribute('aria-describedby','bar-tooltip');
  hoverTip.style.left=Math.max(8,Math.min(e.clientX+14,innerWidth-hoverTip.offsetWidth-8))+'px';hoverTip.style.top=Math.max(8,Math.min(e.clientY+18,innerHeight-hoverTip.offsetHeight-8))+'px';return;
 }
 const bar=e.target.closest('[data-bar]'),dateCell=e.target.closest('.day[data-date]');
 if((!bar&&!dateCell)||e.buttons||moving||busy){hideBarHover();return;}
 const t=bar?tasks.find(t=>t.id===bar.dataset.bar):null,hoverDate=dateCell?.dataset.date||t?.start_date;if(!hoverDate){hideBarHover();return;}
 hideBarHover();const n=diff(hoverDate,today());
 hoverTip.textContent=t?nodeLabel(t)+' · Start: '+n+' days. · End: '+diff(t.end_date,today())+' days.':n+' days.';hoverTip.hidden=false;(bar||dateCell).setAttribute('aria-describedby','bar-tooltip');
 hoverTip.style.left=Math.max(8,Math.min(e.clientX+14,window.innerWidth-hoverTip.offsetWidth-8))+'px';hoverTip.style.top=Math.max(8,Math.min(e.clientY+18,window.innerHeight-hoverTip.offsetHeight-8))+'px';
 const inner=$('.chart-inner'),day=inner.querySelector('.day[data-date="'+hoverDate+'"]');
 const line=document.createElement('div');line.className='hover-date-line';line.style.width=unit+'px';line.style.left=(day.getBoundingClientRect().left-inner.getBoundingClientRect().left)+'px';inner.append(line);day.classList.add('hover-date');
});
$('#chart').addEventListener('pointerleave',hideBarHover);$('#chart').addEventListener('pointerdown',hideBarHover);$('#chart').addEventListener('scroll',hideBarHover);
$('#show-all').onchange=e=>{nearTermOnly=e.target.value!=='all';if(nearTermOnly)rangeDays=Number(e.target.value);collapseTree();render();$('#today').click();};
$('#all-nodes').onclick=()=>{focusedNode=null;collapseTree();render();$('#today').click();};
function validLink(value){try{return ['http:','https:'].includes(new URL(value).protocol);}catch{return false;}}
let linkNode=null,linkSaving=false;
function openLink(id){const node=tasks.find(t=>t.id===id);if(!node||node.external)return;if(node.link_url&&validLink(node.link_url)){window.open(node.link_url,'_blank','noopener,noreferrer');return;}linkNode=id;$('#link-form').reset();$('#link-error').textContent='';$('#link-node-title').textContent=node.title;$('#link-dialog').showModal();$('#link-url').focus();}
$('#link-cancel').onclick=()=>{if(!linkSaving)$('#link-dialog').close();};
$('#link-dialog').addEventListener('cancel',e=>{if(linkSaving)e.preventDefault();});
$('#link-form').onsubmit=async e=>{e.preventDefault();if(linkSaving)return;const url=$('#link-url').value.trim();if(!validLink(url)){$('#link-error').textContent='Enter an http:// or https:// URL.';return;}linkSaving=true;$('#link-save').disabled=true;try{await request('?id=eq.'+linkNode,'PATCH',{link_url:url});const node=tasks.find(t=>t.id===linkNode);if(node)node.link_url=url;$('#link-dialog').close();$('#status').textContent='All changes saved';}catch(e){$('#link-error').textContent=e.message;}finally{linkSaving=false;$('#link-save').disabled=false;}};
const nodeTools=setupNodeTools({api:API,key:KEY,getNode:id=>tasks.find(t=>t.id===id),onEdit:openEditor,onLink:openLink,getDepth:depth,onAddSibling:id=>{const node=tasks.find(t=>t.id===id);openEditor(null,node.parent_id||node.id);},onAddChild:id=>openEditor(null,id),onGantt:async id=>{
 const node=tasks.find(t=>t.id===id);if(!node)return;focusedNode=id;expandedRoot=null;$('#search').value='';tasks.filter(t=>!t.parent_id&&t.id!==id).forEach(t=>collapsed.add(t.id));collapsed.delete(id);descendants(id).forEach(child=>collapsed.delete(child));render();if(isDayflow(node))await loadDayflow();
 const row=[...document.querySelectorAll('.task-row')].find(el=>el.dataset.id===id);if(isAndroid){row?.scrollIntoView({block:'start',behavior:'smooth'});return;}if(row)$('#chart').scrollTop=Math.max(0,row.offsetTop-$('.chart-head').offsetHeight);$('#chart').scrollLeft=Math.max(0,diff(node.start_date||today(),origin)*unit-100);
}});
setupNodeDrag({getTasks:()=>tasks,depth,descendants,isDayflow,isBusy:()=>busy,setBusy:value=>busy=value,request,load,prepare:parent=>{focusedNode=null;expandedRoot=null;if(parent)collapsed.delete(parent);},status:message=>$('#status').textContent=message,error});
load();
