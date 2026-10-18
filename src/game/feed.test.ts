import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rollInstance,validateCatalog} from './loot.ts';
import {createFeedEntry,displayName,feedHistoryLimit,mergeFeedEntries,parseProfile,parsePublication,publicationFor,publicationLifetime,type FeedEntry} from '../feed/protocol.ts';
const catalog=validateCatalog(JSON.parse(readFileSync(new URL('./loot.json',import.meta.url),'utf8'))).catalog!;
const now=1000000000;
const owned=rollInstance(catalog,{randomInt:()=>0,openedAt:now});
const profile={id:crypto.randomUUID(),name:'Guest'};

test('feed messages accept only valid instance IDs, floats, seeds, and timestamps',()=>{
  const opening=publicationFor(owned);
  assert.deepEqual(parsePublication(opening),opening);
  for(const changes of [{id:'not-an-id'},{float:1},{float:-.01},{float:NaN},{wearSeed:-1},{wearSeed:2**32},{openedAt:-1},{itemId:'<script>'}])assert.equal(parsePublication({...opening,...changes}),null);
  assert.deepEqual(parsePublication({...opening,playerName:'Injected',rarity:'legendary',image:'https://example.com'}),opening);
});
test('feed identity preserves text, bounds names, and rejects invalid IDs',()=>{
  assert.equal(displayName('  A\n  B\u202e  '),'A B');
  assert.equal(Array.from(displayName('🌟'.repeat(30))).length,24);
  assert.equal(displayName('<img src=x>'),'<img src=x>');
  assert.deepEqual(parseProfile({...profile,name:' Alice '}),{...profile,name:'Alice'});
  assert.equal(parseProfile({...profile,name:'   '}),null);
  assert.equal(parseProfile({...profile,id:'fake'}),null);
});
test('server resolves item rarity and condition from its own catalog without changing the instance float',()=>{
  const publication=publicationFor(owned);
  const entry=createFeedEntry(publication,profile,catalog,now)!;
  assert.equal(entry.float,owned.float);assert.equal(entry.wearSeed,owned.wearSeed);
  assert.equal(entry.item.id,owned.item.id);assert.equal(entry.rarity.id,owned.rarity.id);assert.equal(entry.condition,owned.condition);
  assert.equal(entry.playerName,profile.name);assert.equal(entry.publishedAt,now);
  assert.notStrictEqual(entry.item,catalog.items[0]);
  assert.equal(createFeedEntry({...publication,itemId:'unknown'},profile,catalog,now),null);
  assert.equal(createFeedEntry({...publication,openedAt:now-publicationLifetime-1},profile,catalog,now),null);
  assert.equal(createFeedEntry({...publication,openedAt:now+60001},profile,catalog,now),null);
});
test('feed merging deduplicates replayed events, preserves server order, and caps recent history',()=>{
  const base=createFeedEntry(publicationFor(owned),profile,catalog,now)!;
  const entries=Array.from({length:feedHistoryLimit+20},(_,sequence)=>({...base,instanceId:crypto.randomUUID(),sequence} as FeedEntry));
  const merged=mergeFeedEntries(entries.slice(0,70),entries.slice(50));
  assert.equal(merged.length,feedHistoryLimit);assert.equal(new Set(merged.map(entry=>entry.instanceId)).size,feedHistoryLimit);
  assert.deepEqual(merged.map(entry=>entry.sequence),Array.from({length:feedHistoryLimit},(_,i)=>119-i));
});
