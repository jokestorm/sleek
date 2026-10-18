// Runs an isolated real workerd/SQLite feed, including a process restart. No Cloudflare account needed.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import http from 'node:http';
import {once} from 'node:events';
const port=Number(process.env.FEED_TEST_PORT||8791);
const root=`http://127.0.0.1:${port}`;
const socketUrl=`ws://127.0.0.1:${port}/api/feed`;
const persist=await mkdtemp('/tmp/sleek-feed-backend-');
let worker,output='',allOutput='';
const peers=[];const checks=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function start(){
  worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--port',String(port),'--persist-to',persist],{stdio:['ignore','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
  output='';worker.stdout.on('data',chunk=>{output+=chunk;allOutput+=chunk;});worker.stderr.on('data',chunk=>{output+=chunk;allOutput+=chunk;});
  for(let i=0;i<100;i++){if(worker.exitCode!==null)throw Error(output);try{if((await fetch(root+'/api/feed')).status===426)return;}catch{}await pause(100);}
  throw Error('Worker did not start: '+output);
}
async function stop(){if(!worker||worker.exitCode!==null)return;const stopped=once(worker,'exit');worker.kill('SIGTERM');await stopped;}
async function peer(name='Backend test',savedProfile){
  const socket=new WebSocket(socketUrl);const messages=[],waiters=[];
  const route=data=>{const value=JSON.parse(String(data));const index=waiters.findIndex(waiter=>waiter.match(value));if(index>=0){const [waiter]=waiters.splice(index,1);clearTimeout(waiter.timer);waiter.resolve(value);}else messages.push(value);};
  socket.addEventListener('message',event=>route(event.data));
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  const wait=(type,match=()=>true)=>{const accepts=value=>value.type===type&&match(value);const index=messages.findIndex(accepts);if(index>=0)return Promise.resolve(messages.splice(index,1)[0]);return new Promise((resolve,reject)=>{const waiter={match:accepts,resolve,timer:setTimeout(()=>reject(Error('Missing '+type+'; worker output: '+output)),10000)};waiters.push(waiter);});};
  const snapshot=await wait('snapshot');
  const profile=savedProfile??{id:crypto.randomUUID(),name};
  socket.send(JSON.stringify({type:'hello',profile}));await wait('ready');
  const client={socket,profile,snapshot,wait,send:message=>socket.send(JSON.stringify(message)),close:()=>socket.close(1000)};
  peers.push(client);return client;
}
function opening(){return{id:crypto.randomUUID(),itemId:'pistol-blueprint',float:.12,wearSeed:123456,openedAt:Date.now()};}
async function publish(client,drop){client.send({type:'publish',opening:drop});return client.wait('ack',message=>message.id===drop.id);}
try{
  await start();
  const alice=await peer('Storage Alice'),bob=await peer('Storage Bob');
  const first=opening();await publish(alice,first);const event=await bob.wait('entry',message=>message.entry.instanceId===first.id);
  assert.equal(event.entry.playerName,'Storage Alice');assert.equal(event.entry.condition,'Minimal Wear');assert.equal(event.entry.float,.12);assert.equal(event.entry.rarity.id,'common');
  await publish(alice,first);
  const replay=await peer('Replay');assert.equal(replay.snapshot.entries.filter(entry=>entry.instanceId===first.id).length,1);
  checks.push('Native Worker and SQLite broadcast the canonical result and acknowledge duplicate IDs without a duplicate event');
  alice.send({type:'publish',opening:{...opening(),itemId:'unknown'}});await alice.wait('reject',message=>message.id);
  alice.send({type:'publish',opening:{...opening(),float:1}});await alice.wait('reject',message=>!message.id);
  alice.send({type:'publish',opening:{...opening(),openedAt:Date.now()-25*60*60*1000}});await alice.wait('reject',message=>message.id);
  bob.send({type:'publish',opening:first});await bob.wait('reject',message=>message.id===first.id);
  const status=await new Promise((resolve,reject)=>{const request=http.get(root+'/api/feed',{headers:{Connection:'Upgrade',Upgrade:'websocket',Origin:'https://unrelated.example','Sec-WebSocket-Key':'dGhlIHNhbXBsZSBub25jZQ==','Sec-WebSocket-Version':'13'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);});
  assert.equal(status,403);
  checks.push('Invalid items, invalid floats, stale openings, conflicting identities, and cross-origin browser handshakes are rejected');
  const large=await peer();const largeClose=new Promise(resolve=>large.socket.addEventListener('close',resolve,{once:true}));large.socket.send('x'.repeat(2050));assert.equal((await largeClose).code,1009);
  const fast=await peer();const fastClose=new Promise(resolve=>fast.socket.addEventListener('close',resolve,{once:true}));for(let i=0;i<15;i++)fast.send({type:'unknown'});assert.equal((await fastClose).code,1008);
  checks.push('Oversized messages and excessive per-connection messages close cleanly');
  const batches=await Promise.all(Array.from({length:13},(_,i)=>peer(`History ${i}`)));
  for(let i=0;i<8;i++)await Promise.all(batches.map(client=>publish(client,opening())));
  const latest=await peer('History snapshot');assert.equal(latest.snapshot.entries.length,100);
  assert.equal(new Set(latest.snapshot.entries.map(entry=>entry.instanceId)).size,100);
  assert.ok(latest.snapshot.entries.every((entry,i,entries)=>i===0||entry.sequence<entries[i-1].sequence));
  assert.equal(latest.snapshot.entries.some(entry=>entry.instanceId===first.id),false);
  const before=latest.snapshot.entries;
  for(const client of peers)client.close();await stop();await start();
  const restored=await peer('After restart');assert.deepEqual(restored.snapshot.entries,before);
  // The oldest ID is outside visible history but still protected by the deduplication window.
  const original=await peer('Storage Alice',alice.profile);
  await publish(original,first);
  const after=await peer('Verify restart dedup');assert.deepEqual(after.snapshot.entries,before);
  checks.push('History is capped and newest-first; SQLite history and deduplication survive a full Worker process restart');
  for(const client of peers)client.close();await stop();
  assert.ok(!/Uncaught|SQLITE_ERROR|TypeError:/.test(allOutput),allOutput);
  console.log(JSON.stringify({checks},null,2));
}finally{for(const client of peers){try{client.close();}catch{}}await stop();await rm(persist,{recursive:true,force:true});}
