import fs from 'fs';

async function main() {
  const tabsRes = await fetch('http://localhost:9222/json/list');
  const tabs = await tabsRes.json();
  const target = tabs.find(t => t.url.includes('5173'));
  if (!target) {
    console.log('No 5173 tab found');
    return;
  }
  console.log('Target tab found:', target.id);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      callbacks.get(data.id)(data);
      callbacks.delete(data.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await new Promise(r => ws.onopen = r);

  // Set device emulation to mobile: 390 x 780
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 780,
    deviceScaleFactor: 2,
    mobile: true
  });

  // Reload the page to ensure fresh React load
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 1500));

  let retries = 40;
  let hudMetrics = null;
  while (retries-- > 0) {
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const hud = document.querySelector('.boarding-loader-hud');
        const arena = document.querySelector('.flight-arena');
        const badge = document.querySelector('.hud-gate-badge-wrap');
        const loadingBar = document.querySelector('.hud-loading-bar-wrapper');
        const plane = document.querySelector('.boarding-plane-box');
        const milestones = document.querySelector('.hud-milestone-timeline');
        
        const getBox = el => el ? {
          width: Math.round(el.getBoundingClientRect().width),
          height: Math.round(el.getBoundingClientRect().height),
          top: Math.round(el.getBoundingClientRect().top),
          bottom: Math.round(el.getBoundingClientRect().bottom)
        } : null;

        return {
          arena: getBox(arena),
          hud: getBox(hud),
          badge: getBox(badge),
          loadingBar: getBox(loadingBar),
          plane: getBox(plane),
          milestones: getBox(milestones)
        };
      })()`,
      returnByValue: true
    });

    const metrics = evalRes.result?.value;
    if (metrics && metrics.hud) {
      hudMetrics = metrics;
      console.log('Loader found! Metrics:', JSON.stringify(metrics, null, 2));

      // Capture screenshot while loader is visible
      const shotRes = await send('Page.captureScreenshot', { format: 'png' });
      if (shotRes.result?.data) {
        const buf = Buffer.from(shotRes.result.data, 'base64');
        const path = '/Users/akashrai/.gemini/antigravity-ide/brain/a37d9f48-14ae-42e5-98d3-5b37a3228601/loader_mobile_live.png';
        fs.writeFileSync(path, buf);
        console.log('Saved screenshot to:', path);
      }
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // Cleanup tab
  await send('Page.close');
  ws.close();
}

main().catch(console.error);
