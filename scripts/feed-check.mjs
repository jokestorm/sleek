// Run Vite and the local Worker; defaults to Vite's /api WebSocket proxy.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium,expect:baseExpect}=await import(process.argv[2]||'@playwright/test');
const expect=baseExpect.configure({timeout:15000});
const baseUrl=process.env.BASE_URL||'http://localhost:5174';
const browser=await chromium.launch({headless:true});
const errors=[],checks=[];
try{
  let aliceContext=await browser.newContext({viewport:{width:1440,height:1100}});
  const bobContext=await browser.newContext({viewport:{width:1280,height:1000}});
  let alice=await aliceContext.newPage();
  const bob=await bobContext.newPage();
  for(const page of [alice,bob]){page.on('pageerror',error=>errors.push(error.message));await page.goto(baseUrl);await expect(page.getByTestId('live-feed')).toHaveAttribute('data-status','live');}
  const suffix=Date.now().toString(36);
  for(const width of [1151,1280,1440]){
    await alice.setViewportSize({width,height:900});
    const feed=await alice.getByTestId('live-feed').boundingBox();
    const opener=await alice.locator('.opening-area').boundingBox();
    assert.ok(feed.x>=opener.x+opener.width,'Feed sits to the right of the opener');
    assert.ok(feed.y<200&&feed.y+feed.height<=900,'Feed is visible immediately');
    assert.ok(await alice.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await alice.setViewportSize({width:1440,height:1100});
  checks.push('Desktop feed sits to the right of the opener and is visible in the first viewport');
  for(const [page,name]of[[alice,`Alice-${suffix}`],[bob,`Bob-${suffix}`]]){
    await page.getByLabel('Your public name').fill(name);await page.locator('.feed-name').getByRole('button',{name:'Save',exact:true}).click();
  }
  const row=(page,id)=>page.locator(`[data-testid="feed-entry"][data-instance-id="${id}"]`);
  await alice.getByRole('button',{name:'Open case',exact:true}).click();
  await expect(alice.getByRole('button',{name:'Skip animation',exact:true})).toBeVisible();
  const first=await alice.getByTestId('winning-card').getAttribute('data-instance-id');
  await expect(row(bob,first)).toHaveCount(0);
  await expect(alice.getByTestId('result-card')).toHaveAttribute('data-instance-id',first);
  await expect(row(bob,first)).toHaveCount(1);
  await expect(row(bob,first)).toContainText(`Alice-${suffix}`);
  assert.equal(await row(bob,first).getAttribute('data-float'),await alice.getByTestId('result-card').getAttribute('data-float'));
  checks.push('Two independent browsers share the actual saved result only after its reveal, with player name and exact float');
  await bob.getByRole('button',{name:'Open case',exact:true}).click();await bob.getByRole('button',{name:'Skip animation',exact:true}).click();
  const second=await bob.getByTestId('result-card').getAttribute('data-instance-id');await expect(row(alice,second)).toHaveCount(1);
  await expect(row(alice,second)).toContainText(`Bob-${suffix}`);
  await alice.evaluate(async()=>{
    const profile=JSON.parse(localStorage.getItem('sleek-feed-profile'));
    const {loadInventory}=await import('/src/game/inventory.ts');
    const item=(await loadInventory()).items[0];
    const opening={id:item.instanceId,itemId:item.item.id,float:item.float,wearSeed:item.wearSeed,openedAt:item.openedAt};
    const url=new URL('/api/feed',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
    await new Promise((resolve,reject)=>{
      const socket=new WebSocket(url);let acknowledgements=0;
      const timer=setTimeout(()=>{socket.close();reject(Error('Duplicate publication not acknowledged'));},10000);
      socket.onopen=()=>socket.send(JSON.stringify({type:'hello',profile}));
      socket.onmessage=event=>{const message=JSON.parse(event.data);
        if(message.type==='ready'){socket.send(JSON.stringify({type:'publish',opening}));socket.send(JSON.stringify({type:'publish',opening}));}
        if(message.type==='ack'&&++acknowledgements===2){clearTimeout(timer);socket.close(1000);resolve();}
      };
      socket.onerror=()=>{clearTimeout(timer);reject(Error('Duplicate test socket failed'));};
    });
  });
  await expect(row(bob,first)).toHaveCount(1);
  await bob.reload();await expect(bob.getByTestId('live-feed')).toHaveAttribute('data-status','live');await expect(row(bob,first)).toHaveCount(1);
  await expect(bob.getByLabel('Your public name')).toHaveValue(`Bob-${suffix}`);
  checks.push('Sharing works both ways; repeated publication and reconnect snapshots do not duplicate events; guest names persist');

  await alice.emulateMedia({reducedMotion:'reduce'});
  await aliceContext.setOffline(true);await alice.evaluate(()=>window.dispatchEvent(new Event('offline')));
  await expect(alice.getByTestId('live-feed')).toHaveAttribute('data-status','offline');
  await alice.getByRole('button',{name:'Open again',exact:true}).click();
  const offline=await alice.getByTestId('result-card').getAttribute('data-instance-id');
  assert.notEqual(offline,first);
  await expect(row(bob,offline)).toHaveCount(0);
  assert.ok(await alice.evaluate(id=>!!localStorage.getItem('sleek-feed-outbox:'+id),offline));
  const offlineState=await aliceContext.storageState({indexedDB:true});
  await aliceContext.close();
  aliceContext=await browser.newContext({storageState:offlineState,viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  alice=await aliceContext.newPage();alice.on('pageerror',error=>errors.push(error.message));
  await alice.goto(baseUrl);
  await expect(row(bob,offline)).toHaveCount(1);await expect(alice.getByTestId('live-feed')).toHaveAttribute('data-status','live');
  await expect.poll(()=>alice.evaluate(id=>localStorage.getItem('sleek-feed-outbox:'+id),offline)).toBe(null);
  checks.push('Offline openings persist their queue and inventory across a browser-session restart, then share once after reconnection');

  await alice.emulateMedia({reducedMotion:'no-preference'});
  await alice.getByRole('button',{name:'Open again',exact:true}).click();await expect(alice.getByRole('button',{name:'Skip animation',exact:true})).toBeVisible();
  const restored=await alice.getByTestId('winning-card').getAttribute('data-instance-id');
  await expect(row(bob,restored)).toHaveCount(0);await alice.reload();
  await expect(alice.getByTestId('result-card')).toHaveAttribute('data-instance-id',restored);await expect(row(bob,restored)).toHaveCount(1);
  await alice.reload();await expect(row(bob,restored)).toHaveCount(1);
  checks.push('Reload during a reel restores and shares its saved result once; later reloads do not republish old inventory');

  // Keep text inert, including a name that would be dangerous if inserted as HTML.
  await bob.getByLabel('Your public name').fill('<img src=x onerror=1>');await bob.locator('.feed-name button').click();
  await bob.emulateMedia({reducedMotion:'reduce'});await bob.getByRole('button',{name:'Open again',exact:true}).click();
  await expect(bob.getByTestId('result-card')).not.toHaveAttribute('data-instance-id',second);
  const escaped=await bob.getByTestId('result-card').getAttribute('data-instance-id');await expect(row(alice,escaped)).toHaveCount(1);
  await expect(row(alice,escaped).locator('.feed-player strong')).toHaveText('<img src=x onerror=1>');await expect(row(alice,escaped).locator('.feed-player img')).toHaveCount(0);
  checks.push('Public names render as text, including markup-shaped input');

  // Enough legitimate reduced-motion UI openings to make the history scrollable.
  await alice.emulateMedia({reducedMotion:'reduce'});
  for(let i=0;i<5;i++){
    const oldId=await alice.getByTestId('result-card').getAttribute('data-instance-id');
    await alice.getByRole('button',{name:'Open again',exact:true}).click();
    await expect(alice.getByTestId('result-card')).not.toHaveAttribute('data-instance-id',oldId);
  }
  await expect.poll(()=>bob.getByTestId('feed-entry').count()).toBeGreaterThan(5);
  await bob.locator('.feed-scroll').evaluate(element=>{element.scrollTop=element.scrollHeight;});
  const oldTop=await bob.getByTestId('feed-entry').first().getAttribute('data-instance-id');
  const scrollTop=await bob.locator('.feed-scroll').evaluate(element=>element.scrollTop);
  const previous=await alice.getByTestId('result-card').getAttribute('data-instance-id');
  await alice.getByRole('button',{name:'Open again',exact:true}).click();await expect(alice.getByTestId('result-card')).not.toHaveAttribute('data-instance-id',previous);
  await expect(bob.getByRole('button',{name:/new opening/})).toBeVisible();
  assert.equal(await bob.getByTestId('feed-entry').first().getAttribute('data-instance-id'),oldTop);
  assert.ok(Math.abs(await bob.locator('.feed-scroll').evaluate(element=>element.scrollTop)-scrollTop)<2);
  await bob.getByRole('button',{name:/new opening/}).click();
  await expect.poll(()=>bob.locator('.feed-scroll').evaluate(element=>element.scrollTop)).toBe(0);
  checks.push('New arrivals wait while reading older results and do not move the feed scroll position');

  const sharedId=await alice.getByTestId('result-card').getAttribute('data-instance-id');
  await alice.getByRole('button',{name:'Clear inventory',exact:true}).click();await alice.getByRole('button',{name:'Clear inventory permanently',exact:true}).click();
  await expect(alice.getByTestId('inventory-card')).toHaveCount(0);
  await expect(row(bob,sharedId)).toHaveCount(1);
  checks.push('Clearing local inventory leaves shared opening history intact');
  await mkdir('/tmp/sleek-feed',{recursive:true});
  await bob.locator('.live-feed').screenshot({path:'/tmp/sleek-feed/desktop.png'});
  await bob.evaluate(()=>window.scrollTo(0,0));
  await bob.screenshot({path:'/tmp/sleek-feed/layout.png',fullPage:true});
  for(const width of [320,390,768]){
    await bob.setViewportSize({width,height:1000});
    assert.ok(await bob.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const box=await bob.locator('.live-feed').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
    const opener=await bob.locator('.opening-area').boundingBox();assert.ok(box.y>=opener.y+opener.height-1,'Feed stacks below the opener');
    if(width===390)await bob.locator('.live-feed').screenshot({path:'/tmp/sleek-feed/mobile.png'});
  }
  checks.push('Shared results and the name control fit narrow layouts');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,pageErrors:errors.length},null,2));
}finally{await browser.close();}
