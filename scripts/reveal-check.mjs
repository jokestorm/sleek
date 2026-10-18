// Run against Vite using the same Playwright module argument as browser-check.mjs.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium, expect: baseExpect } = await import(process.argv[2] || '@playwright/test');
const expect = baseExpect.configure({ timeout: 10000 });
const baseUrl = process.env.BASE_URL || 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const errors = [];
const checks = [];
try {
  const context = await browser.newContext({viewport:{width:1440,height:1100}});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseUrl);
  const { rarities } = await page.evaluate(async () => (await import('/src/game/loot.json')).default);
  let start = 0;
  for (const [level, tier] of rarities.entries()) {
    await page.evaluate(draw => {
      const original = crypto.getRandomValues.bind(crypto);
      let used = false;
      crypto.getRandomValues = values => {
        if (!used && values instanceof Uint32Array && values.length === 1) {
          used = true; values[0] = draw; crypto.getRandomValues = original; return values;
        }
        return original(values);
      };
    }, start);
    await page.locator('button.primary:not(.skip)').click();
    await page.getByRole('button',{name:'Skip animation',exact:true}).click();
    const panel = page.locator('.result-panel');
    await expect(panel).toHaveAttribute('data-reveal-level',String(level));
    await expect(panel).toHaveClass(/is-celebrating/);
    await expect(page.locator('.reveal-spark')).toHaveCount(level*7);
    await expect(page.getByTestId('result-card')).toContainText(tier.name);
    if (level === 4) {
      await expect(page.locator('.reveal-title')).toContainText('Legendary drop');
      await mkdir('/tmp/sleek-reveals',{recursive:true});
      await page.waitForTimeout(250);
      await page.screenshot({path:'/tmp/sleek-reveals/legendary.png'});
    }
    start += tier.weight;
  }
  await expect(page.getByTestId('inventory-card')).toHaveCount(5);
  await page.reload();
  await expect(page.getByTestId('result-card')).toBeVisible();
  await expect(page.locator('.result-panel')).not.toHaveClass(/is-celebrating/);
  await expect(page.locator('.reveal-spark')).toHaveCount(0);
  checks.push('All five tiers scale effects; five openings grant five unique items; reload does not replay the celebration');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('button.primary:not(.skip)').click();
  await expect(page.getByTestId('inventory-card')).toHaveCount(6);
  await expect(page.locator('.reveal-effects')).toBeHidden();
  checks.push('Reduced motion suppresses celebration particles and travel');
  for (const width of [320,390,768]) {
    await page.setViewportSize({width,height:1000});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  checks.push('Reveal layout fits 320, 390, and 768px widths');
  await context.close();

  // A real PCM WAV fixture verifies replacement playback, rather than only network requests.
  const samples=4410, wav=Buffer.alloc(44+samples*2);
  wav.write('RIFF');wav.writeUInt32LE(36+samples*2,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(88200,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);
  for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(Math.sin(i/44100*440*Math.PI*2)*2000),44+i*2);
  const audioContext=await browser.newContext();
  await audioContext.addInitScript(()=>{
    window.audioStarts=0;window.audioStops=0;
    const start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start=function(...args){window.audioStarts++;return start.apply(this,args);};
    AudioBufferSourceNode.prototype.stop=function(...args){window.audioStops++;return stop.apply(this,args);};
  });
  const audioPage=await audioContext.newPage();
  audioPage.on('pageerror',error=>errors.push(error.message));
  await audioPage.route('**/src/audio.json?*',route=>route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify(JSON.stringify({'tick':{src:'/audio/test.wav',volume:.2},'reveal-legendary':{src:'/audio/test.wav',volume:.3}}))};`}));
  let requests=0;
  await audioPage.route('**/audio/test.wav',route=>{requests++;return route.fulfill({contentType:'audio/wav',body:wav});});
  await audioPage.goto(baseUrl);
  await audioPage.getByRole('button',{name:'Open case',exact:true}).click();
  await expect.poll(()=>audioPage.evaluate(()=>window.audioStarts)).toBeGreaterThan(0);
  await audioPage.getByRole('button',{name:'Skip animation',exact:true}).click();
  await audioPage.evaluate(async()=>{const audio=await import('/src/audio.ts');audio.reveal('legendary',4);});
  const starts=await audioPage.evaluate(()=>window.audioStarts);
  assert.ok(starts>0);
  await audioPage.getByRole('button',{name:'Mute sound',exact:true}).click();
  await audioPage.evaluate(async()=>{const audio=await import('/src/audio.ts');audio.reveal('legendary',4);audio.tick();});
  assert.equal(await audioPage.evaluate(()=>window.audioStarts),starts);
  assert.ok(await audioPage.evaluate(()=>window.audioStops)>0);
  assert.equal(requests,1,'Shared clips should only be fetched once');
  checks.push('Custom WAV decodes and plays; shared clip fetches once; mute stops current playback and blocks new sounds');
  await audioContext.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({checks,pageErrors:errors.length},null,2));
} finally { await browser.close(); }
