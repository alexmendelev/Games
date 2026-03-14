window.GAMES_V2_AUDIO = (function () {
  function createArcadeAudio(options) {
    const settings = Object.assign({
      sfxGain: 0.1,
      splashUrl: "",
      coinUrl: "",
      splashPoolSize: 6,
      coinPoolSize: 4
    }, options || {});

    let audioCtx = null;
    let masterGain = null;
    let audioUnlocked = false;
    let splashIndex = 0;
    let coinIndex = 0;

    const splashPool = Array.from({ length: settings.splashPoolSize }, () => {
      const el = new Audio(settings.splashUrl);
      el.preload = "auto";
      el.volume = 0.9;
      try { el.load(); } catch (_) {}
      return el;
    });

    const coinPool = Array.from({ length: settings.coinPoolSize }, () => {
      const el = new Audio(settings.coinUrl);
      el.preload = "auto";
      el.volume = 0.9;
      try { el.load(); } catch (_) {}
      return el;
    });

    function ensureAudio() {
      try {
        if (!audioCtx) {
          const Context = window.AudioContext || window.webkitAudioContext;
          audioCtx = new Context();
          masterGain = audioCtx.createGain();
          masterGain.gain.value = settings.sfxGain;
          masterGain.connect(audioCtx.destination);
        }
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }
      } catch (_) {}

      if (audioUnlocked) {
        return;
      }
      audioUnlocked = true;

      const sample = splashPool[0];
      if (!sample) {
        return;
      }
      try {
        sample.muted = true;
        const playAttempt = sample.play();
        if (playAttempt && playAttempt.then) {
          playAttempt.then(() => {
            sample.pause();
            sample.currentTime = 0;
            sample.muted = false;
          }).catch(() => {
            sample.muted = false;
          });
        } else {
          sample.pause();
          sample.currentTime = 0;
          sample.muted = false;
        }
      } catch (_) {
        sample.muted = false;
      }
    }

    function beep(config) {
      if (!audioCtx || !masterGain) {
        return;
      }

      const opts = Object.assign({
        freq: 440,
        dur: 0.12,
        type: "sine",
        gain: 1,
        when: 0,
        rampTo: null
      }, config || {});

      const startAt = audioCtx.currentTime + opts.when;
      const endAt = startAt + Math.max(0.01, opts.dur);
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = opts.type;
      osc.frequency.setValueAtTime(opts.freq, startAt);
      if (opts.rampTo && opts.rampTo > 0) {
        osc.frequency.exponentialRampToValueAtTime(opts.rampTo, endAt);
      }

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.gain), startAt + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

      osc.connect(gainNode);
      gainNode.connect(masterGain);
      osc.start(startAt);
      osc.stop(endAt + 0.02);
    }

    function playCorrectChime() {
      if (!audioCtx || !masterGain) {
        return;
      }
      const notes = [1046.5, 1318.5, 1568];
      for (let i = 0; i < notes.length; i += 1) {
        const freq = notes[i];
        const delay = i * 0.07;
        const gain = 0.56 - i * 0.08;
        beep({ freq, dur: 0.34 + i * 0.03, type: "sine", gain, when: delay, rampTo: freq * 1.02 });
        beep({ freq: freq * 2, dur: 0.46 + i * 0.03, type: "triangle", gain: 0.18, when: delay + 0.012, rampTo: freq * 1.94 });
      }
      beep({ freq: 2093, dur: 0.24, type: "sine", gain: 0.18, when: 0.18, rampTo: 2489 });
      beep({ freq: 2637, dur: 0.3, type: "sine", gain: 0.13, when: 0.24, rampTo: 3136 });
      beep({ freq: 783.99, dur: 0.62, type: "sine", gain: 0.11, when: 0.2, rampTo: 740 });
    }

    function playFromPool(pool, index) {
      const item = pool[index % pool.length];
      if (!item) {
        return;
      }
      try {
        item.currentTime = 0;
      } catch (_) {}
      item.play().catch(() => {});
    }

    function playSplash() {
      playFromPool(splashPool, splashIndex);
      splashIndex += 1;
    }

    function playCoinDrop() {
      playFromPool(coinPool, coinIndex);
      coinIndex += 1;
    }

    window.addEventListener("pointerdown", ensureAudio, { once: true });

    return {
      ensureAudio,
      sfx: {
        correct() { ensureAudio(); playCorrectChime(); },
        wrong() { ensureAudio(); beep({ freq: 240, dur: 0.1, type: "sine", gain: 0.9, rampTo: 180 }); },
        splash() { ensureAudio(); playSplash(); },
        coin() { ensureAudio(); playCoinDrop(); },
        death() { ensureAudio(); beep({ freq: 420, rampTo: 110, dur: 0.75, type: "sawtooth", gain: 1 }); }
      }
    };
  }

  return {
    createArcadeAudio
  };
})();
