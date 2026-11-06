import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {Kafka,logLevel} from 'kafkajs';
import {createState,processEvent,makeOrder} from './model.js';

const demo=process.argv.includes('--demo');
const state=createState(demo?'Simulación local · sin Kafka':'Kafka real');
const topic='pedidos-demo';
const clients=new Set(), consumers={};
const kafka=new Kafka({clientId:'pubsub-demo',brokers:[process.env.KAFKA_BROKER||'localhost:9092'],logLevel:logLevel.ERROR,retry:{retries:3}});
let producer;
const notify=()=>{for(const client of clients) client.write(`data: ${JSON.stringify(state)}\n\n`);};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)throw new Error('Solicitud demasiado grande.');}return JSON.parse(text||'{}');}
async function connect(){
  if(!demo){
    const admin=kafka.admin();await admin.connect();
    try{await admin.createTopics({waitForLeaders:true,topics:[{topic,numPartitions:1,replicationFactor:1}]});}finally{await admin.disconnect();}
    producer=kafka.producer();await producer.connect();
    for(const name of Object.keys(state.groups)){
      const consumer=kafka.consumer({groupId:`demo-${name}`});consumers[name]=consumer;
      await consumer.connect();await consumer.subscribe({topic,fromBeginning:true});
      await consumer.run({eachMessage:async({message})=>{processEvent(state,name,JSON.parse(message.value.toString()));notify();}});
    }
  }
  state.ready=true;notify();
}
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==='GET' && req.url==='/events'){
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
      clients.add(res);res.write(`data: ${JSON.stringify(state)}\n\n`);
      req.on('close',()=>clients.delete(res));return;
    }
    if(req.method==='GET' && req.url==='/api/state')return json(res,200,state);
    if(req.method==='POST' && req.url==='/api/orders'){
      if(!state.ready)return json(res,503,{error:'Kafka aún no está disponible.'});
      const event=makeOrder(await body(req));
      if(!demo) await producer.send({topic,messages:[{key:event.data.pedidoId,value:JSON.stringify(event)}]});
      state.events.push(event);
      if(demo)for(const name of Object.keys(state.groups))if(state.groups[name].active)processEvent(state,name,event);
      notify();return json(res,201,event);
    }
    const match=req.url.match(/^\/api\/consumers\/(notifications|analytics)$/);
    if(req.method==='POST' && match){
      if(!state.ready)return json(res,503,{error:'Espera a que el sistema esté listo.'});
      const name=match[1],{active}=await body(req);
      if(typeof active!=='boolean')throw new Error('Estado inválido.');
      if(!demo){if(active)consumers[name].resume([{topic}]);else consumers[name].pause([{topic}]);}
      state.groups[name].active=active;
      if(demo && active)for(const event of state.events)processEvent(state,name,event);
      notify();return json(res,200,{ok:true});
    }
    const files={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
    if(req.method==='GET' && files[req.url]){
      const [file,type]=files[req.url];res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});return res.end(await readFile(new URL('./public/'+file,import.meta.url)));
    }
    json(res,404,{error:'No encontrado.'});
  }catch(error){json(res,400,{error:error.message});}
});
server.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('Abre http://localhost:'+(process.env.PORT||3000)));
connect().catch(error=>{console.error('No se pudo conectar con Kafka. Ejecuta docker compose up -d y reinicia la app.',error.message);});
const heartbeat=setInterval(()=>{for(const client of clients)client.write(': keepalive\n\n');},15000);
process.on('SIGINT',async()=>{clearInterval(heartbeat);for(const client of clients)client.end();await Promise.all(Object.values(consumers).map(c=>c.disconnect()));if(producer)await producer.disconnect();server.close();});
