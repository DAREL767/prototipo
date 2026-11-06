import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://localhost:3000';
async function post(path,data){const res=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.ok(res.ok,await res.clone().text());return res.json();}
async function state(){return (await fetch(base+'/api/state')).json();}
async function until(check){for(let i=0;i<100;i++){const s=await state();if(check(s))return s;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('No se cumplió la condición de consumo');}
await until(s=>s.ready);
const first=await post('/api/orders',{customer:'Prueba integrada',total:1000});
await until(s=>Object.values(s.groups).every(g=>g.processed.some(e=>e.eventId===first.eventId)));
await post('/api/consumers/analytics',{active:false});
const pending=[];
try{
 for(let i=0;i<2;i++)pending.push(await post('/api/orders',{customer:'Pendiente '+i,total:2000}));
 const s=await until(s=>pending.every(e=>s.groups.notifications.processed.some(p=>p.eventId===e.eventId)));
 assert.ok(pending.every(e=>!s.groups.analytics.processed.some(p=>p.eventId===e.eventId)));
}finally{await post('/api/consumers/analytics',{active:true});}
await until(s=>pending.every(e=>s.groups.analytics.processed.some(p=>p.eventId===e.eventId)));
const invalid=await fetch(base+'/api/orders',{method:'POST',body:JSON.stringify({customer:'',total:-5})});assert.equal(invalid.status,400);
console.log('OK: publicación, dos grupos, pausa, recuperación y validación.');
