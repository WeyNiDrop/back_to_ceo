/**
 * 纯前端 Web Audio API 合成音效引擎（零外部音频文件依赖）
 */
const SoundFX = (() => {
  let ctx = null;
  let muted = false;

  function ensureCtx() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  function isMuted() {
    return muted;
  }

  // 1. 发牌刷刷声（带通滤波白噪声）
  function playDeal(count = 1) {
    const c = ensureCtx();
    if (!c) return;
    for (let i = 0; i < count; i++) {
      const start = c.currentTime + i * 0.09;
      const len = Math.floor(c.sampleRate * 0.065);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < len; j++) {
        data[j] = (Math.random() * 2 - 1) * (1 - j / len);
      }

      const src = c.createBufferSource();
      src.buffer = buf;

      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2600, start);
      filter.frequency.exponentialRampToValueAtTime(900, start + 0.06);
      filter.Q.value = 1.6;

      const gain = c.createGain();
      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.065);

      src.connect(filter).connect(gain).connect(c.destination);
      src.start(start);
    }
  }

  // 2. 出牌砸桌重击声
  function playSlam(isEnemy = false) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = isEnemy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isEnemy ? 130 : 175, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // 3. 抢夺席位音效（我方升调琶音 / 敌方下行警报）
  function playSeatCapture(isGood = true) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const notes = isGood ? [523.25, 659.25, 783.99] : [311.13, 220.0];

    notes.forEach((freq, idx) => {
      const t = now + idx * 0.075;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = isGood ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  // 4. 体力水晶刷新叮咚声
  function playManaRefresh() {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const t = now + i * 0.06;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  // 5. 胜负结算音效
  function playEnd(isWin) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const notes = isWin ? [523.25, 659.25, 783.99, 1046.5] : [293.66, 261.63, 220.0, 164.81];
    notes.forEach((freq, i) => {
      const t = now + i * 0.11;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = isWin ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  return { toggleMute, isMuted, playDeal, playSlam, playSeatCapture, playManaRefresh, playEnd };
})();
