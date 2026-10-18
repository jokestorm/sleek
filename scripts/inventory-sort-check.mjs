// Run Vite; pass an installed @playwright/test module path as argv[2].
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium,expect:baseExpect}=await import(process.argv[2]||'@playwright/test');
const expect=baseExpect.configure({timeout:10000});
const browser=await chromium.launch({headless:true});
const baseUrl=process.env.BASE_URL||'http://localhost:5174';
const checks=[],errors=[];
try {
  const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  // Same-origin document without mounting the app: create the previous database schema.
  await page.goto(baseUrl+'/fonts/fonts.css');
  const fixtures=await page.evaluate(async()=>{
    const {conditionForFloat}=await import('/src/game/loot.ts');
    const catalog=(await import('/src/game/loot.json')).default;
    const fixtures=Array.from({length:31},(_,i)=>{
      const item=i===0?catalog.items.find(item=>item.rarity==='legendary'):catalog.items[i%catalog.items.length];
      const float=i%5===0?.25:((i*17)%31)/31;
      return {instanceId:`sort-fixture-${i}`,item,rarity:catalog.rarities.find(rarity=>rarity.id===item.rarity),float,condition:conditionForFloat(float),wearSeed:i,openedAt:100,sequence:i+1};
    });
    const database=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('sleek-cases',1);
      request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('items',{keyPath:'instanceId'}).createIndex('sequence','sequence',{unique:true});db.createObjectStore('meta',{keyPath:'key'});};
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    await new Promise((resolve,reject)=>{
      const tx=database.transaction(['items','meta'],'readwrite');
      for(const item of fixtures)tx.objectStore('items').add(item);
      const byRarity={};for(const item of fixtures)byRarity[item.rarity.id]=(byRarity[item.rarity.id]||0)+1;
      tx.objectStore('meta').put({key:'stats',total:fixtures.length,byRarity,latestId:fixtures.at(-1).instanceId,lastSequence:fixtures.length});
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
    });
    database.close();return fixtures;
  });
  await page.goto(baseUrl);
  const cards=page.getByTestId('inventory-card');
  const sort=page.getByLabel('Sort by',{exact:true});
  const ids=()=>cards.evaluateAll(elements=>elements.map(element=>element.dataset.instanceId));
  await expect(cards).toHaveCount(24);
  await expect(page.getByTestId('result-card')).toHaveAttribute('data-instance-id',fixtures.at(-1).instanceId);
  const textOrder=(a,b)=>a<b?-1:a>b?1:0;
  const comparators={
    newest:(a,b)=>b.sequence-a.sequence,
    oldest:(a,b)=>a.sequence-b.sequence,
    rarity:(a,b)=>a.rarity.weight-b.rarity.weight||a.sequence-b.sequence,
    'float-low':(a,b)=>a.float-b.float||a.sequence-b.sequence,
    'float-high':(a,b)=>b.float-a.float||b.sequence-a.sequence,
    name:(a,b)=>textOrder(a.item.name,b.item.name)||textOrder(a.item.weapon,b.item.weapon)||a.sequence-b.sequence,
  };
  for(const [order,compare]of Object.entries(comparators)){
    const expected=[...fixtures].sort(compare).map(item=>item.instanceId);
    await sort.selectOption(order);
    await expect.poll(ids).toEqual(expected.slice(0,24));
    await page.getByRole('button',{name:'Load more',exact:true}).click();
    await expect.poll(ids).toEqual(expected);
    const offsetIds=await page.evaluate(async order=>(await(await import('/src/game/inventory.ts')).loadInventory(5,7,order)).items.map(item=>item.instanceId),order);
    assert.deepEqual(offsetIds,expected.slice(7,12));
  }
  checks.push('All six sorts order the entire migrated collection before pagination, including ties and offset pages');
  const stored=await page.evaluate(async()=>(await(await import('/src/game/inventory.ts')).loadInventory(100)).items);
  assert.deepEqual(stored,fixtures.toReversed().map(({sequence,...item})=>item));
  checks.push('Version-one collections upgrade without changing identities, floats, wear, snapshots, counters, or latest reveal');

  // Rapid changes must not let an older asynchronous query replace the last selection.
  await sort.evaluate(select=>{for(const value of ['float-low','name','rarity','oldest']){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}});
  await expect.poll(ids).toEqual(fixtures.slice(0,24).map(item=>item.instanceId));
  await sort.selectOption('float-low');
  const expected=[...fixtures].sort(comparators['float-low']);
  await expect.poll(ids).toEqual(expected.slice(0,24).map(item=>item.instanceId));
  const deleted=expected.shift();
  await page.locator(`[data-testid="inventory-delete"][data-instance-id="${deleted.instanceId}"]`).click();
  await page.getByRole('button',{name:'Delete item permanently',exact:true}).click();
  await expect.poll(ids).toEqual(expected.slice(0,24).map(item=>item.instanceId));
  await page.getByRole('button',{name:'Open again',exact:true}).click();
  await expect(page.getByTestId('result-card')).not.toHaveAttribute('data-instance-id',fixtures.at(-1).instanceId);
  await expect(sort).toHaveValue('float-low');
  const all=await page.evaluate(async()=>(await(await import('/src/game/inventory.ts')).loadInventory(100,0,'float-low')).items.map(item=>item.instanceId));
  await expect.poll(ids).toEqual(all.slice(0,24));
  checks.push('Rapid selection, deleting an item, and opening another case retain the selected order');
  await mkdir('/tmp/sleek-sorting',{recursive:true});
  for(const width of [1440,1280,1151,768,390,320]){
    await page.setViewportSize({width,height:1000});
    await sort.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const selectBox=await sort.boundingBox();const clearBox=await page.getByRole('button',{name:'Clear inventory',exact:true}).boundingBox();
    assert.ok(selectBox.x>=0&&selectBox.x+selectBox.width<=width);
    assert.ok(selectBox.x+selectBox.width<=clearBox.x,'Sort and Clear controls do not overlap');
    if(width===1440||width===320)await page.locator('.collection').screenshot({path:`/tmp/sleek-sorting/${width}.png`});
  }
  checks.push('Sort and clear controls fit desktop, sidebar, tablet, and narrow mobile layouts');
  await context.close();

  const fallback=await browser.newContext({reducedMotion:'reduce'});
  await fallback.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw Error('Blocked storage');}});});
  const session=await fallback.newPage();session.on('pageerror',error=>errors.push(error.message));
  await session.goto(baseUrl);
  for(let i=0;i<6;i++){
    await session.getByRole('button',{name:i?'Open again':'Open case',exact:true}).click();
    await expect(session.getByTestId('inventory-card')).toHaveCount(i+1);
  }
  const originals=await session.getByTestId('inventory-card').evaluateAll(elements=>elements.map(element=>({id:element.dataset.instanceId,float:Number(element.dataset.float)})));
  await session.getByLabel('Sort by',{exact:true}).selectOption('oldest');
  await expect.poll(()=>session.getByTestId('inventory-card').evaluateAll(elements=>elements.map(element=>element.dataset.instanceId))).toEqual(originals.toReversed().map(item=>item.id));
  await session.getByLabel('Sort by',{exact:true}).selectOption('float-low');
  await expect.poll(()=>session.getByTestId('inventory-card').evaluateAll(elements=>elements.map(element=>Number(element.dataset.float)))).toEqual(originals.map(item=>item.float).sort((a,b)=>a-b));
  checks.push('Session-only collections can sort by age and float when storage is unavailable');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,pageErrors:errors.length},null,2));
} finally {await browser.close();}
