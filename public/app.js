const $=selector=>document.querySelector(selector);
const money=value=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value);
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let current;
async function post(url,data){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw new Error(result.error);return result;}
const rows=(events,notification=false)=>events.length?[...events].reverse().map(event=>`<div class="item"><strong>${esc(event.data.pedidoId)} · ${esc(event.data.customer)}</strong><span>${notification?'Aviso preparado':money(event.data.total)} · ${new Date(event.occurredAt).toLocaleTimeString('es-CO')}</span></div>`).join(''):'<p class="empty">Los eventos aparecerán aquí.</p>';
function render(state){
 current=state;$('#status').textContent=state.mode+' · '+(state.ready?'Listo':'Esperando conexión');$('#publish').disabled=!state.ready;
 $('#published').textContent=state.events.length;$('#events').innerHTML=rows(state.events);
 $('#consumers').innerHTML=Object.entries(state.groups).map(([name,group])=>{
  const ids=new Set(group.processed.map(event=>event.eventId));const pending=state.events.filter(event=>!ids.has(event.eventId)).length;
  return `<section class="card ${group.active?'':'paused'}"><button class="toggle" data-name="${name}" ${state.ready?'':'disabled'}>${group.active?'Pausar':'Reanudar'}</button><span class="eyebrow">03 · CONSUMIDOR</span><h2>${name==='analytics'?'Analítica':'Notificaciones'}</h2><p>${group.active?'Activo · procesa eventos':'Pausado · acumula pendientes'}</p><div class="stats"><div><b>${group.processed.length}</b><small>procesados</small></div><div><b>${pending}</b><small>pendientes de esta sesión</small></div>${name==='analytics'?`<div><b>${money(group.processed.reduce((total,event)=>total+event.data.total,0))}</b><small>ventas registradas</small></div>`:''}</div><div class="list">${rows(group.processed,name==='notifications')}</div></section>`;
 }).join('');
}
$('#order').addEventListener('submit',async event=>{event.preventDefault();$('#error').textContent='';$('#publish').disabled=true;try{await post('/api/orders',Object.fromEntries(new FormData(event.target)));}catch(error){$('#error').textContent=error.message;}finally{$('#publish').disabled=!current?.ready;}});
$('#consumers').addEventListener('click',async event=>{const button=event.target.closest('[data-name]');if(!button)return;button.disabled=true;try{await post('/api/consumers/'+button.dataset.name,{active:!current.groups[button.dataset.name].active});$('#error').textContent='';}catch(error){$('#error').textContent=error.message;button.disabled=false;}});
const stream=new EventSource('/events');stream.onmessage=event=>render(JSON.parse(event.data));stream.onerror=()=>{$('#status').textContent='Conexión interrumpida · reconectando…';$('#publish').disabled=true;};
