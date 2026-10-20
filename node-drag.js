export function setupNodeDrag({getTasks,depth,descendants,isDayflow,isBusy,setBusy,request,load,prepare,status,error}){
 let drag=null,suppressClick=false;
 document.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}},true);
 const clear=()=>{document.querySelectorAll('.drop-before,.drop-after,.drop-child').forEach(el=>el.classList.remove('drop-before','drop-after','drop-child'));};
 function plan(event){
  const tasks=getTasks(),node=tasks.find(t=>t.id===drag.id),root=event.target.closest('#all-nodes'),row=event.target.closest('.task-left')?.closest('.task-row');
  if(!node||(!root&&!row))return null;
  const target=tasks.find(t=>t.id===row?.dataset.id);
  if(!root&&(!target||target.external||target.id===node.id||descendants(node.id).includes(target.id)))return null;
  const rect=row?.getBoundingClientRect(),ratio=rect?(event.clientY-rect.top)/rect.height:0;
  const mode=root?'root':ratio<.25?'before':ratio>.75?'after':'child';
  const parent=mode==='root'?null:mode==='child'?target.id:target.parent_id;
  if(parent&&(parent===node.id||descendants(node.id).includes(parent)))return null;
  const parentNode=tasks.find(t=>t.id===parent);
  if(parentNode&&isDayflow(parentNode))return null;
  const subtree=[node.id,...descendants(node.id)].map(id=>tasks.find(t=>t.id===id)).filter(Boolean);
  if((parentNode?depth(parentNode):0)+Math.max(...subtree.map(t=>depth(t)-depth(node)+1))>4)return null;
  return {node,target,parent,mode,element:root||row};
 }
 document.addEventListener('pointerdown',e=>{
  const handle=e.target.closest('[data-drag]');if(!handle||e.button!==0||isBusy())return;
  e.preventDefault();handle.setPointerCapture(e.pointerId);drag={id:handle.dataset.drag,x:e.clientX,y:e.clientY,active:false};
  const move=event=>{
   if(!drag)return;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<5&&!drag.active)return;
   drag.active=true;clear();const hit=document.elementFromPoint(event.clientX,event.clientY);const next=hit&&plan({target:hit,clientY:event.clientY});
   if(next)next.element.classList.add(next.mode==='before'?'drop-before':next.mode==='after'?'drop-after':'drop-child');
   const chart=document.querySelector('#chart'),rect=chart.getBoundingClientRect();if(event.clientY>rect.bottom-35)chart.scrollTop+=14;else if(event.clientY<rect.top+35)chart.scrollTop-=14;
  };
  const finish=async event=>{
   handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',cancel);
   const hit=document.elementFromPoint(event.clientX,event.clientY),next=drag?.active&&hit&&plan({target:hit,clientY:event.clientY});suppressClick=!!drag?.active;setTimeout(()=>suppressClick=false,0);drag=null;clear();
   if(!next)return;
   setBusy(true);status('Moving node…');
   try{
    const siblings=getTasks().filter(t=>!t.external&&t.parent_id===next.parent&&t.id!==next.node.id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.title.localeCompare(b.title));
    let index=next.mode==='before'||next.mode==='after'?siblings.findIndex(t=>t.id===next.target.id)+(next.mode==='after'?1:0):siblings.length;
    const before=siblings[index-1],after=siblings[index];let order=before&&after?Math.floor(((before.sort_order||0)+(after.sort_order||0))/2):before?(before.sort_order||0)+1024:after?(after.sort_order||0)-1024:0;
    if(before&&after&&(order<=before.sort_order||order>=after.sort_order)){
     for(let i=0;i<siblings.length;i++){await request('?id=eq.'+siblings[i].id,'PATCH',{sort_order:(i+1)*1024});siblings[i].sort_order=(i+1)*1024;}
     order=index*1024+512;
    }
    await request('?id=eq.'+next.node.id,'PATCH',{parent_id:next.parent,sort_order:order});prepare(next.parent);await load();
   }catch(e){await load();error(e);}finally{setBusy(false);}
  };
  const cancel=()=>{drag=null;clear();handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',cancel);};
  handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',cancel);
 });
}
