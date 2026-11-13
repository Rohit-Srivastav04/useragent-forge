(() => {
  const MAX = 100000;
  const PREVIEW = 50;

  const $ = (id) => document.getElementById(id);
  const platformEl = $('platform');
  const formEl = $('formFactor');
  const browserEl = $('browser');
  const countEl = $('count');
  const generateBtn = $('generate');
  const txtBtn = $('downloadTxt');
  const jsonBtn = $('downloadJson');
  const clearBtn = $('clear');
  const preview = $('preview');
  const meta = $('meta');
  const progressWrap = $('progressWrap');
  const progressBar = $('progressBar');
  const progressText = $('progressText');

  let agents = [];
  let busy = false;

  /**
   * Real stable versions as of Nov 2026:
   * Chrome 157 (stable) / 158 (early) · Edge 157 · Firefox 160 · Safari 27.2
   * Weighted toward current majors so dumps look like live traffic.
   */

  // Chrome / Chromium full versions (major.0.build.patch)
  const CHROME_VERSIONS = weighted([
    // Chrome 158 early stable
    ['158.0.8127.37', 8], ['158.0.8127.36', 6], ['158.0.8127.35', 4],
    // Chrome 157 current stable bulk
    ['157.0.8103.79', 22], ['157.0.8103.78', 22], ['157.0.8103.51', 10],
    ['157.0.8103.50', 8], ['157.0.8103.46', 6], ['157.0.8103.39', 5],
    // Chrome 156 still common
    ['156.0.8078.100', 8], ['156.0.8078.80', 6], ['156.0.8078.74', 5],
    ['156.0.8078.48', 4],
    // Chrome 155 tail
    ['155.0.8059.80', 3], ['155.0.8059.79', 2],
    // Older but real long-tail
    ['154.0.8042.72', 1], ['153.0.8024.68', 1], ['152.0.7977.169', 1],
  ]);

  const EDGE_VERSIONS = weighted([
    ['157.0.4341.57', 30], ['157.0.4341.53', 18], ['157.0.4341.46', 14],
    ['156.0.4304.72', 12], ['156.0.4304.61', 8],
    ['155.0.4265.84', 6], ['154.0.4230.72', 4],
    ['158.0.4370.16', 3], // beta-ish early
  ]);

  // Edge Chromium base (Chrome/) usually tracks near Edge major
  const EDGE_CHROME_MAP = {
    158: '158.0.8127.37',
    157: '157.0.8103.79',
    156: '156.0.8078.80',
    155: '155.0.8059.80',
    154: '154.0.8042.72',
  };

  const FIREFOX_VERSIONS = weighted([
    ['160.0', 35], ['160.0.1', 8],
    ['159.0.2', 14], ['159.0.1', 8], ['159.0', 10],
    ['158.0.2', 6], ['158.0', 5],
    ['157.0.1', 4], ['156.0.2', 3],
    ['153.7.0', 2], // ESR-ish presence
  ]);

  const SAFARI_DESKTOP = weighted([
    ['27.2', 28], ['27.1', 12], ['27.0', 8],
    ['26.2', 10], ['26.1', 6], ['26.0', 4],
    ['18.6', 8], ['18.5', 5], ['18.4', 4],
    ['17.6', 4], ['17.5', 3],
  ]);

  const SAFARI_IOS = weighted([
    ['27.2', 26], ['27.1', 12], ['27.0.1', 8],
    ['26.2', 10], ['26.1', 6],
    ['18.6.2', 8], ['18.5', 6], ['18.4.1', 5],
    ['17.6.1', 4], ['17.5.1', 3],
  ]);

  // Windows still reports NT 10.0 for Win10 + Win11
  const WIN_TOKENS = weighted([
    ['Windows NT 10.0; Win64; x64', 70],
    ['Windows NT 10.0; WOW64', 8],
    ['Windows NT 10.0; Win64; x64; rv:160.0', 1], // rarely used raw; filtered in makers
    ['Windows NT 10.0; ARM64', 6],
  ]);

  const LINUX_TOKENS = weighted([
    ['X11; Linux x86_64', 45],
    ['X11; Ubuntu; Linux x86_64', 18],
    ['X11; Linux aarch64', 10],
    ['X11; Fedora; Linux x86_64', 8],
    ['X11; Linux i686', 4],
    ['X11; CrOS x86_64 14541.0.0', 5],
    ['X11; CrOS aarch64 14541.0.0', 3],
  ]);

  const MAC_TOKENS = weighted([
    // Newer macOS marketing versions still often appear as 14_x / 15_x in UA,
    // plus fresher tokens seen in 2026 traffic samples.
    ['Macintosh; Intel Mac OS X 15_1', 14],
    ['Macintosh; Intel Mac OS X 15_0_1', 10],
    ['Macintosh; Intel Mac OS X 14_7_1', 12],
    ['Macintosh; Intel Mac OS X 14_6_1', 10],
    ['Macintosh; Intel Mac OS X 13_7_1', 8],
    ['Macintosh; Intel Mac OS X 10_15_7', 18], // still huge long-tail
    ['Macintosh; Intel Mac OS X 12_7_6', 6],
    ['Macintosh; Arm Mac OS X 15_1', 8],
    ['Macintosh; Arm Mac OS X 14_7', 6],
  ]);

  const ANDROID_DEVICES = weighted([
    ['Pixel 9', 8], ['Pixel 9 Pro', 6], ['Pixel 8', 8], ['Pixel 8 Pro', 6],
    ['Pixel 7', 5], ['Pixel 7a', 4],
    ['SM-S928B', 7], ['SM-S918B', 6], ['SM-S911B', 6], ['SM-A556B', 5],
    ['SM-A156E', 4], ['SM-G991B', 3],
    ['2201116SG', 4], ['2312DRA50G', 3], ['2211133G', 3],
    ['CPH2581', 3], ['V2309A', 2],
    ['22101316G', 3], ['M2101K6G', 2],
    ['ONEPLUS A6003', 1], ['KB2003', 2],
  ]);

  const ANDROID_OS = weighted([
    ['15', 22], ['14', 30], ['13', 20], ['12', 12],
    ['16', 8], ['17', 4], ['11', 3], ['10', 1],
  ]);

  // iOS / iPadOS tokens (underscore style inside UA)
  const IOS_VERSIONS = weighted([
    ['27_2_1', 14], ['27_2', 16], ['27_1', 10], ['27_0_1', 6],
    ['26_2', 8], ['26_1', 5],
    ['18_6_2', 8], ['18_5', 6], ['18_4_1', 5], ['18_3_2', 4],
    ['17_6_1', 5], ['17_5_1', 3], ['16_7_10', 2],
  ]);

  const IOS_DEVICES = weighted([
    ['iPhone', 78],
    ['iPad', 22],
  ]);

  function weighted(pairs) {
    const out = [];
    for (const [value, w] of pairs) {
      for (let i = 0; i < w; i++) out.push(value);
    }
    return out;
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function resolveForm(platform, form) {
    if (form === 'desktop') return 'desktop';
    if (form === 'mobile') return 'mobile';
    return platform === 'android' || platform === 'ios' ? 'mobile' : 'desktop';
  }

  function resolveBrowsers(platform, formFactor, browser) {
    if (browser !== 'mixed') return [browser];
    if (platform === 'ios') return ['safari', 'safari', 'safari', 'chrome', 'firefox'];
    if (platform === 'macos') return ['safari', 'chrome', 'chrome', 'firefox', 'edge'];
    if (platform === 'android') return ['chrome', 'chrome', 'chrome', 'firefox', 'edge'];
    if (platform === 'windows') return ['chrome', 'chrome', 'edge', 'edge', 'firefox'];
    return ['chrome', 'firefox', 'chrome', 'edge'];
  }

  function winToken() {
    // strip accidental rv token if picked
    let t = pick(WIN_TOKENS);
    if (t.includes('rv:')) t = 'Windows NT 10.0; Win64; x64';
    return t;
  }

  function makeChrome(osToken, mobile = false) {
    const ver = pick(CHROME_VERSIONS);
    const mob = mobile ? ' Mobile' : '';
    return `Mozilla/5.0 (${osToken}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}${mob} Safari/537.36`;
  }

  function makeEdge(osToken, mobile = false) {
    const edge = pick(EDGE_VERSIONS);
    const major = Number(edge.split('.')[0]);
    const chrome = EDGE_CHROME_MAP[major] || EDGE_CHROME_MAP[157];
    const mob = mobile ? ' Mobile' : '';
    return `Mozilla/5.0 (${osToken}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome}${mob} Safari/537.36 Edg/${edge}`;
  }

  function makeFirefox(osToken) {
    const ver = pick(FIREFOX_VERSIONS);
    const major = ver.split('.')[0];
    return `Mozilla/5.0 (${osToken}; rv:${major}.0) Gecko/20100101 Firefox/${ver}`;
  }

  function makeSafariDesktop(macToken) {
    const ver = pick(SAFARI_DESKTOP);
    return `Mozilla/5.0 (${macToken}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${ver} Safari/605.1.15`;
  }

  function makeSafariIOS(device, iosVer) {
    const safari = pick(SAFARI_IOS);
    const cpu = device === 'iPad' ? 'OS' : 'iPhone OS';
    return `Mozilla/5.0 (${device}; CPU ${cpu} ${iosVer} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${safari} Mobile/15E148 Safari/604.1`;
  }

  function makeCriOS(device, iosVer) {
    const ver = pick(CHROME_VERSIONS);
    const cpu = device === 'iPad' ? 'OS' : 'iPhone OS';
    return `Mozilla/5.0 (${device}; CPU ${cpu} ${iosVer} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${ver} Mobile/15E148 Safari/604.1`;
  }

  function makeFxiOS(device, iosVer) {
    const ver = pick(FIREFOX_VERSIONS);
    const major = ver.split('.')[0];
    const cpu = device === 'iPad' ? 'OS' : 'iPhone OS';
    return `Mozilla/5.0 (${device}; CPU ${cpu} ${iosVer} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/${major}.0 Mobile/15E148 Safari/605.1.15`;
  }

  function makeEdgiOS(device, iosVer) {
    const edge = pick(EDGE_VERSIONS);
    const cpu = device === 'iPad' ? 'OS' : 'iPhone OS';
    return `Mozilla/5.0 (${device}; CPU ${cpu} ${iosVer} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/${edge} Version/18.0 Mobile/15E148 Safari/604.1`;
  }

  function androidToken() {
    return `Linux; Android ${pick(ANDROID_OS)}; ${pick(ANDROID_DEVICES)}`;
  }

  function oneAgent(platform, formFactor, browserChoice) {
    const browsers = resolveBrowsers(platform, formFactor, browserChoice);
    const browser = pick(browsers);
    const mobile = formFactor === 'mobile';

    if (platform === 'ios') {
      const device = pick(IOS_DEVICES);
      const ver = pick(IOS_VERSIONS);
      if (browser === 'chrome') return makeCriOS(device, ver);
      if (browser === 'firefox') return makeFxiOS(device, ver);
      if (browser === 'edge') return makeEdgiOS(device, ver);
      return makeSafariIOS(device, ver);
    }

    if (platform === 'android') {
      const token = androidToken();
      if (browser === 'firefox') return makeFirefox(token);
      if (browser === 'edge') return makeEdge(token, true);
      return makeChrome(token, true);
    }

    if (platform === 'macos') {
      const token = pick(MAC_TOKENS);
      if (mobile) {
        // Forced mobile on macOS → still emit desktop Safari/Chrome (no fake Android)
        if (browser === 'safari') return makeSafariDesktop(token);
        if (browser === 'firefox') return makeFirefox(token);
        if (browser === 'edge') return makeEdge(token, false);
        return makeChrome(token, false);
      }
      if (browser === 'safari') return makeSafariDesktop(token);
      if (browser === 'firefox') return makeFirefox(token);
      if (browser === 'edge') return makeEdge(token, false);
      return makeChrome(token, false);
    }

    if (platform === 'linux') {
      const token = pick(LINUX_TOKENS);
      if (browser === 'firefox') return makeFirefox(token);
      if (browser === 'edge') return makeEdge(token, mobile);
      if (browser === 'safari') return makeChrome(token, mobile); // no real desktop Safari on Linux
      return makeChrome(token, mobile);
    }

    // windows
    const token = winToken();
    if (browser === 'firefox') return makeFirefox(token);
    if (browser === 'edge') return makeEdge(token, mobile);
    if (browser === 'safari') return makeChrome(token, mobile);
    return makeChrome(token, mobile);
  }

  function setBusy(on) {
    busy = on;
    generateBtn.disabled = on;
    txtBtn.disabled = on || agents.length === 0;
    jsonBtn.disabled = on || agents.length === 0;
    clearBtn.disabled = on || agents.length === 0;
  }

  function updatePreview() {
    if (!agents.length) {
      preview.textContent = '—';
      meta.textContent = 'No agents yet. Choose platform and generate.';
      return;
    }
    const shown = agents.slice(0, PREVIEW);
    preview.textContent = shown.map((ua, i) => `${i + 1}. ${ua}`).join('\n');
    meta.textContent = `Generated ${agents.length.toLocaleString('en-IN')} realistic user agents · Chrome up to 158 · Firefox 160 · Edge 157 · Safari 27 · preview ${Math.min(PREVIEW, agents.length)}.`;
  }

  function download(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function generate() {
    if (busy) return;
    let count = Number(countEl.value) || 0;
    count = Math.max(1, Math.min(MAX, count | 0));
    countEl.value = String(count);

    const platform = platformEl.value;
    const formFactor = resolveForm(platform, formEl.value);
    const browser = browserEl.value;

    setBusy(true);
    agents = new Array(count);
    progressWrap.hidden = false;
    progressBar.style.width = '0%';
    progressText.textContent = `Generating 0 / ${count.toLocaleString('en-IN')}…`;

    const chunk = count > 20000 ? 2500 : count > 5000 ? 1500 : 800;
    let i = 0;

    await new Promise((resolve) => {
      function tick() {
        const end = Math.min(i + chunk, count);
        for (; i < end; i++) {
          agents[i] = oneAgent(platform, formFactor, browser);
        }
        const pct = Math.round((i / count) * 100);
        progressBar.style.width = `${pct}%`;
        progressText.textContent = `Generating ${i.toLocaleString('en-IN')} / ${count.toLocaleString('en-IN')} (${pct}%)`;
        if (i < count) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });

    progressText.textContent = `Done · ${count.toLocaleString('en-IN')} realistic user agents ready`;
    setBusy(false);
    updatePreview();
  }

  function stamp() {
    const p = platformEl.value;
    const n = agents.length;
    const t = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return { p, n, t };
  }

  function downloadTxt() {
    if (!agents.length) return;
    const { p, n, t } = stamp();
    download(`useragents-${p}-${n}-${t}.txt`, new Blob([agents.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' }));
  }

  function downloadJson() {
    if (!agents.length) return;
    const { p, n, t } = stamp();
    const payload = {
      generatedAt: new Date().toISOString(),
      realismNote: 'Weighted to Nov 2026 stable channels: Chrome 157/158, Edge 157, Firefox 160, Safari 27.2',
      platform: p,
      formFactor: resolveForm(p, formEl.value),
      browser: browserEl.value,
      count: n,
      userAgents: agents,
    };
    download(`useragents-${p}-${n}-${t}.json`, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
  }

  function clearAll() {
    agents = [];
    progressWrap.hidden = true;
    progressBar.style.width = '0%';
    setBusy(false);
    updatePreview();
  }

  document.querySelectorAll('.presets button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.presets button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      countEl.value = btn.dataset.count;
    });
  });

  generateBtn.addEventListener('click', generate);
  txtBtn.addEventListener('click', downloadTxt);
  jsonBtn.addEventListener('click', downloadJson);
  clearBtn.addEventListener('click', clearAll);
})();
