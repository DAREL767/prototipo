export function createState(mode) {
  return {mode, ready:false, events:[], groups:{notifications:{active:true,processed:[]},analytics:{active:true,processed:[]}}};
}
export function processEvent(state, name, event) {
  const group=state.groups[name];
  if(!group.processed.some(item=>item.eventId===event.eventId)) group.processed.push(event);
}
export function makeOrder(input) {
  const customer=String(input.customer??'').trim();
  const total=Number(input.total);
  if(!customer || customer.length>80 || !Number.isFinite(total) || total<=0 || total>100000000) throw new Error('Escribe un cliente y un total válido entre 1 y 100.000.000 COP.');
  return {eventId:crypto.randomUUID(),eventType:'PedidoCreado',occurredAt:new Date().toISOString(),data:{pedidoId:'PED-'+crypto.randomUUID().slice(0,8).toUpperCase(),customer,total}};
}
