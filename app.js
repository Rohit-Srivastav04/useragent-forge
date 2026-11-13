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

  const chromeMajors = range(110, 131);
  const firefoxMajors = range(110, 133);
  const safariMajors = range(15, 18);
  const edgeMajors = range(110, 131);

  const winBuilds = [
    '10.0', '10.0', '10.0', '10.0', '11.0', '11.0',
  ];
  const winNt = ['Windows NT 10.0', 'Windows NT 10.0', 'Windows NT 11.0'];

  const linuxDist = [
    'X11; Linux x86_64',
    'X11; Ubuntu; Linux x86_64',
    'X11; Linux i686',
    'X11; Fedora; Linux x86_64',
    'X11; Linux aarch64',
  ];

  const macOs = [
    'Macintosh; Intel Mac OS X 10_15_7',
    'Macintosh; Intel Mac OS X 11_7_10',
    'Macintosh; Intel Mac OS X 12_7_4',
    'Macintosh; Intel Mac OS X 13_6_7',
    'Macintosh; Intel Mac OS X 14_5',
    'Macintosh; Intel Mac OS X 14_6_1',
    'Macintosh; Intel Mac OS X 15_0',
    'Macintosh; Intel Mac OS X 15_1',
  ];

  const androidDevices = [
    'SM-S918B', 'SM-S911B', 'SM-A546B', 'SM-G991B', 'SM-A156E',
    'Pixel 6', 'Pixel 7', 'Pixel 7 Pro', 'Pixel 8', 'Pixel 8 Pro', 'Pixel 9',
    'M2101K6G', '2201116SG', '2211133C', 'CPH2451', 'V2145',
    'Redmi Note 12', 'M2012K11AG', 'ONEPLUS A6003', 'KB2003',
  ];
  const androidVersions = ['10', '11', '12', '13', '14', '15'];

  const iosDevices = [
    'iPhone', 'iPhone', 'iPhone', 'iPad', 'iPad',
  ];
  const iosVersions = [
    '15_7_9', '16_6_1', '16_7_8', '17_0_3', '17_4_1', '17_5_1',
    '17_6_1', '18_0', '18_0_1', '18_1', '18_1_1', '18_2',
  ];

  function range(a, b) {
    const out = [];
    for (let i = a; i <= b; i++) out.push(i);
    return out;
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function randInt(min, max) {
    return (Math.random() * (max - min + 1) + min) | 0;
  }

  function chromeBuild(major) {
    return `${major}.0.${randInt(5000, 6999)}.${randInt(10, 220)}`;
  }

  function firefoxVer(major) {
    return `${major}.0${Math.random() > 0.7 ? `.${randInt(1, 3)}` : ''}`;
  }

  function resolveForm(platform, form) {
    if (form === 'desktop') return 'desktop';
    if (form === 'mobile') return 'mobile';
    return platform === 'android' || platform === 'ios' ? 'mobile' : 'desktop';
  }

  function resolveBrowsers(platform, formFactor, browser) {
    if (browser !== 'mixed') return [browser];
    if (platform === 'ios') return formFactor === 'desktop' ? ['safari', 'chrome'] : ['safari', 'chrome'];
    if (platform === 'macos') return ['safari', 'chrome', 'firefox', 'edge'];
    if (platform === 'android') return ['chrome', 'firefox', 'edge'];
    return ['chrome', 'edge', 'firefox'];
  }

  function makeChrome(osToken, mobile = false) {
    const major = pick(chromeMajors);
    const ver = chromeBuild(major);
    const mob = mobile ? ' Mobile' : '';
    return `Mozilla/5.0 (${osToken}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}${mob} Safari/537.36`;
  }

  function makeEdge(osToken, mobile = false) {
    const major = pick(edgeMajors);
    const ver = chromeBuild(major);
    const mob = mobile ? ' Mobile' : '';
    return `Mozilla/5.0 (${osToken}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}${mob} Safari/537.36 Edg/${ver}`;
  }

  function makeFirefox(osToken, mobile = false) {
    const major = pick(firefoxMajors);
    const ver = firefoxVer(major);
    if (mobile) {
      return `Mozilla/5.0 (${osToken}; rv:${ver}) Gecko/20100101 Firefox/${ver}`;
    }
    return `Mozilla/5.0 (${osToken}; rv:${ver}) Gecko/20100101 Firefox/${ver}`;
  }

  function makeSafariDesktop(macToken) {
    const major = pick(safariMajors);
    const ver = `${major}.${randInt(0, 6)}`;
    return `Mozilla/5.0 (${macToken}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${ver} Safari/605.1.15`;
  }

  function makeSafariIOS(device, iosVer) {
    const major = iosVer.split('_')[0];
    const safari = `${major}.${randInt(0, 4)}`;
    return `Mozilla/5.0 (${device}; CPU ${device === 'iPad' ? 'OS' : 'iPhone OS'} ${iosVer} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${safari} Mobile/15E148 Safari/604.1`;
  }

  function makeCriOS(device, iosVer) {
    const major = pick(chromeMajors);
    const ver = chromeBuild(major);
    return `Mozilla/5.0 (${device}; CPU ${device === 'iPad' ? 'OS' : 'iPhone OS'} ${iosVer} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${ver} Mobile/15E148 Safari/604.1`;
  }

  function osToken(platform, formFactor) {
    if (platform === 'windows') {
      const nt = pick(winNt);
      const wow = Math.random() > 0.55 ? '; Win64; x64' : Math.random() > 0.5 ? '; WOW64' : '';
      return `${nt}${wow}`;
    }
    if (platform === 'linux') return pick(linuxDist);
    if (platform === 'macos') return pick(macOs);
    if (platform === 'android') {
      const ver = pick(androidVersions);
      const model = pick(androidDevices);
      return `Linux; Android ${ver}; ${model}`;
    }
    if (platform === 'ios') {
      const device = pick(iosDevices);
      const ver = pick(iosVersions);
      return { device, ver };
    }
    return 'Windows NT 10.0; Win64; x64';
  }

  function oneAgent(platform, formFactor, browserChoice) {
    const browsers = resolveBrowsers(platform, formFactor, browserChoice);
    const browser = pick(browsers);
    const mobile = formFactor === 'mobile';

    if (platform === 'ios') {
      const { device, ver } = osToken('ios');
      if (browser === 'chrome' || browser === 'edge') return makeCriOS(device, ver);
      if (browser === 'firefox') {
        const major = pick(firefoxMajors);
        return `Mozilla/5.0 (${device}; CPU ${device === 'iPad' ? 'OS' : 'iPhone OS'} ${ver} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/${major}.0 Mobile/15E148 Safari/605.1.15`;
      }
      return makeSafariIOS(device, ver);
    }

    if (platform === 'android') {
      const token = osToken('android');
      if (browser === 'firefox') return makeFirefox(token, true);
      if (browser === 'edge') return makeEdge(token, true);
      return makeChrome(token, true);
    }

    if (platform === 'macos') {
      const token = osToken('macos');
      if (browser === 'safari') return makeSafariDesktop(token);
      if (browser === 'firefox') return makeFirefox(token, false);
      if (browser === 'edge') return makeEdge(token, false);
      return makeChrome(token, false);
    }

    // windows / linux desktop or forced mobile emulation tokens
    let token;
    if (platform === 'windows') token = osToken('windows');
    else if (platform === 'linux') token = osToken('linux');
    else token = osToken('windows');

    if (mobile && (platform === 'windows' || platform === 'linux' || platform === 'macos')) {
      // rare but allowed: desktop OS with Mobile chrome token when user forces mobile
      if (browser === 'firefox') return makeFirefox(token, true);
      if (browser === 'edge') return makeEdge(token, true);
      return makeChrome(token, true);
    }

    if (browser === 'firefox') return makeFirefox(token, false);
    if (browser === 'edge') return makeEdge(token, false);
    if (browser === 'safari' && platform === 'macos') return makeSafariDesktop(token);
    if (browser === 'safari') return makeChrome(token, false);
    return makeChrome(token, false);
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
    meta.textContent = `Generated ${agents.length.toLocaleString('en-IN')} user agents · previewing first ${Math.min(PREVIEW, agents.length)}.`;
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
        if (i < count) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });

    progressText.textContent = `Done · ${count.toLocaleString('en-IN')} user agents ready`;
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
    const blob = new Blob([agents.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    download(`useragents-${p}-${n}-${t}.txt`, blob);
  }

  function downloadJson() {
    if (!agents.length) return;
    const { p, n, t } = stamp();
    const payload = {
      generatedAt: new Date().toISOString(),
      platform: p,
      formFactor: resolveForm(p, formEl.value),
      browser: browserEl.value,
      count: n,
      userAgents: agents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    download(`useragents-${p}-${n}-${t}.json`, blob);
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

  // sync form-factor hint when platform changes
  platformEl.addEventListener('change', () => {
    if (formEl.value === 'auto') return;
  });
})();
