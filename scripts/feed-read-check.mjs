// Runs the actual feed storage queries in isolated workerd SQLite and asserts a bounded read cost.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {once} from 'node:events';
import {resolve} from 'node:path';
const temporary=await mkdtemp('/tmp/sleek-feed-reads-');
const port=Number(process.env.FEED_READ_TEST_PORT||8792);
const config={name:'sleek-read-check',main:resolve('scripts/fixtures/feed-read-probe.ts'),compatibility_date:'2026-10-16',durable_objects:{bindings:[{name:'PROBE',class_name:'ReadProbe'}]},migrations:[{tag:'v1',new_sqlite_classes:['ReadProbe']}]};
await writeFile(temporary+'/wrangler.json',JSON.stringify(config));
const worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config',temporary+'/wrangler.json','--port',String(port),'--persist-to',temporary+'/state'],{stdio:['ignore','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
let output='';worker.stdout.on('data',chunk=>output+=chunk);worker.stderr.on('data',chunk=>output+=chunk);
try{
  let ready=false;
  for(let i=0;i<100;i++){
    if(worker.exitCode!==null)throw Error(output);
    if(output.includes('Ready on')){ready=true;break;}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready,output);
  const results=[];
  for(const [size,tied] of [[1000,false],[10000,false],[10000,true]]){
    const response=await fetch(`http://127.0.0.1:${port}/probe-${size}-${tied}?size=${size}${tied?'&tied':''}`);
    if(!response.ok)throw Error(`Probe returned HTTP ${response.status}\n${output}`);
    results.push(await response.json());
  }
  console.log(JSON.stringify(results.map(result=>({size:result.size,tiedTime:result.tiedTime,first:result.first.rowsRead,second:result.second.rowsRead,duplicate:result.duplicate.rowsRead,expiry:result.expired.rowsRead,afterExpiry:result.afterExpiry.rowsRead})),null,2));
  for(const result of results){
    for(const sample of [result.first,result.second,result.afterExpiry])assert.ok(sample.rowsRead<=64,`Opening with ${result.size} deduplication records read ${sample.rowsRead} rows; expected at most 64`);
    assert.ok(result.duplicate.rowsRead<=2);assert.equal(result.duplicate.result.duplicate,'same');
    assert.equal(result.conflict.result.duplicate,'conflict');assert.equal(result.history,100);
    assert.equal(result.seen,Math.min(result.size+2,10000));assert.equal(result.remaining,1);
    assert.ok(result.expired.rowsRead<=result.size*4+100,'Expiration reads are proportional to records actually removed');
  }
  console.log('PASS: publication cost stays bounded as history grows; deduplication, caps, and expiry remain correct.');
}finally{
  if(worker.exitCode===null){const stopped=once(worker,'exit');worker.kill('SIGTERM');await stopped;}
  await rm(temporary,{recursive:true,force:true});
}
