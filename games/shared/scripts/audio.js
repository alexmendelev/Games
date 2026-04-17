window.GAMES_V2_AUDIO = (function (utils) {
  function createArcadeAudio(options) {
    const settings = Object.assign({
      sfxGain: 0.1,
      bgmVolume: 0.22,
      bgmFadeOutMs: 1800,   // fade out over 1.8s when switching tracks or muting
      bgmFadeInMs: 4200,    // fade in over 4.2s on track start (avoids jarring volume jump)
      bgmSwitchGapMs: 260,  // silence gap between fade-out and next track start
      bgmStartVolume: 0.004,
      splashUrl: "",
      coinUrl: "",
      musicUrls: [
        "../shared/assets/music/minuet-g-major.mp3",
        "../shared/assets/music/turkish-march.mp3",
        "../shared/assets/music/entertainer.mp3",
        "../shared/assets/music/wildcatblues.mp3"
      ],
      splashPoolSize: 6,
      coinPoolSize: 4
    }, options || {});

    const muteStorageKey = "games_audio_muted";
    let audioCtx = null;
    let masterGain = null;
    let audioUnlocked = false;
    let splashIndex = 0;
    let coinIndex = 0;
    let musicEl = null;
    let musicStarted = false;
    let musicQueue = [];
    let musicQueueIndex = 0;
    let currentMusicUrl = "";
    let muted = false;
    let musicFadeRaf = 0;
    let musicSwitchToken = 0;

    const muteListeners = new Set();

    const musicUrls = Array.from(new Set((settings.musicUrls || []).filter(Boolean)));

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


    function unlockAudio() {
      try {
        if (!audioCtx) {
          const Context = window.AudioContext || window.webkitAudioContext;
          audioCtx = new Context();
          masterGain = audioCtx.createGain();
          masterGain.gain.value = muted ? 0 : settings.sfxGain;
          masterGain.connect(audioCtx.destination);
        }
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }
      } catch (err) {
        console.warn("[audio] AudioContext init failed:", err);
      }

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

    function refillMusicQueue() {
      if (!musicUrls.length) {
        musicQueue = [];
        musicQueueIndex = 0;
        return;
      }
      musicQueue = musicUrls.slice();
      utils.shuffleInPlace(musicQueue);
      if (musicQueue.length > 1 && musicQueue[0] === currentMusicUrl) {
        musicQueue.push(musicQueue.shift());
      }
      musicQueueIndex = 0;
    }

    function nextMusicUrl() {
      if (!musicUrls.length) {
        return "";
      }
      if (!musicQueue.length || musicQueueIndex >= musicQueue.length) {
        refillMusicQueue();
      }
      const nextUrl = musicQueue[musicQueueIndex] || "";
      musicQueueIndex += 1;
      currentMusicUrl = nextUrl;
      return nextUrl;
    }

    function ensureMusicElement() {
      if (musicEl || !musicUrls.length) {
        return;
      }
      musicEl = new Audio();
      musicEl.preload = "auto";
      musicEl.loop = false;
      musicEl.volume = muted ? 0 : settings.bgmStartVolume;
      musicEl.playsInline = true;
      musicEl.setAttribute("playsinline", "");
      musicEl.setAttribute("webkit-playsinline", "");
      musicEl.addEventListener("ended", () => {
        const nextUrl = nextMusicUrl();
        if (nextUrl) {
          startTrack(nextUrl);
        }
      });
      musicEl.addEventListener("error", () => {
        const nextUrl = nextMusicUrl();
        if (nextUrl) {
          startTrack(nextUrl);
        }
      });
      const firstUrl = nextMusicUrl();
      if (firstUrl) {
        musicEl.src = firstUrl;
        try { musicEl.load(); } catch (_) {}
      }
    }

    function persistMuteState() {
      try {
        if (window.localStorage) {
          window.localStorage.setItem(muteStorageKey, muted ? "1" : "0");
        }
      } catch (_) {}
    }

    function notifyMuteChange() {
      muteListeners.forEach((listener) => {
        try {
          listener(muted);
        } catch (_) {}
      });
    }

    function cancelMusicFade() {
      if (!musicFadeRaf) {
        return;
      }
      cancelAnimationFrame(musicFadeRaf);
      musicFadeRaf = 0;
    }

    function tweenMusicVolume(from, to, duration, onDone) {
      ensureMusicElement();
      if (!musicEl) {
        if (typeof onDone === "function") onDone();
        return;
      }
      cancelMusicFade();
      if (duration <= 0) {
        musicEl.volume = to;
        if (typeof onDone === "function") onDone();
        return;
      }
      const startTs = performance.now();
      function step(ts) {
        if (!musicEl) return;
        const ratio = Math.max(0, Math.min(1, (ts - startTs) / duration));
        musicEl.volume = from + ((to - from) * ratio);
        if (ratio < 1) {
          musicFadeRaf = requestAnimationFrame(step);
          return;
        }
        musicFadeRaf = 0;
        if (typeof onDone === "function") onDone();
      }
      musicFadeRaf = requestAnimationFrame(step);
    }

    function startTrack(url) {
      ensureMusicElement();
      if (!musicEl || !url) {
        return;
      }
      const absoluteUrl = new URL(url, window.location.href).href;
      cancelMusicFade();
      if (musicEl.src !== absoluteUrl) {
        musicEl.src = url;
        try { musicEl.load(); } catch (_) {}
      }
      musicEl.currentTime = 0;
      musicEl.volume = muted ? 0 : settings.bgmStartVolume;
      const playAttempt = musicEl.play();
      const finishStart = () => {
        if (!musicEl || muted) {
          return;
        }
        tweenMusicVolume(musicEl.volume, settings.bgmVolume, settings.bgmFadeInMs);
      };
      if (playAttempt && playAttempt.then) {
        playAttempt.then(finishStart).catch(() => {});
      } else {
        finishStart();
      }
    }

    function transitionToTrack(url) {
      ensureMusicElement();
      if (!musicEl || !url) {
        return;
      }
      const token = ++musicSwitchToken;
      const canFadeOut = !musicEl.paused && !musicEl.ended && musicEl.currentTime > 0 && musicEl.volume > 0.001;
      if (!canFadeOut) {
        startTrack(url);
        return;
      }
      tweenMusicVolume(musicEl.volume, 0, settings.bgmFadeOutMs, () => {
        if (token !== musicSwitchToken || !musicEl) {
          return;
        }
        musicEl.pause();
        window.setTimeout(() => {
          if (token !== musicSwitchToken || !musicEl) {
            return;
          }
          startTrack(url);
        }, Math.max(0, settings.bgmSwitchGapMs || 0));
      });
    }

    function playNextTrack() {
      const nextUrl = nextMusicUrl();
      if (!nextUrl) {
        return;
      }
      transitionToTrack(nextUrl);
    }

    function applyMuteState(options) {
      const opts = Object.assign({ animate: true }, options || {});
      splashPool.forEach((el) => { el.muted = muted; });
      coinPool.forEach((el) => { el.muted = muted; });
      if (masterGain) {
        masterGain.gain.value = muted ? 0 : settings.sfxGain;
      }
      if (musicEl) {
        if (muted) {
          if (opts.animate && !musicEl.paused && musicEl.volume > 0.001) {
            tweenMusicVolume(musicEl.volume, 0, Math.min(360, settings.bgmFadeOutMs));
          } else {
            cancelMusicFade();
            musicEl.volume = 0;
          }
        } else if (!musicEl.paused) {
          musicEl.volume = Math.max(musicEl.volume, settings.bgmStartVolume);
          if (opts.animate) {
            tweenMusicVolume(musicEl.volume, settings.bgmVolume, 720);
          } else {
            musicEl.volume = settings.bgmVolume;
          }
        }
      }
      notifyMuteChange();
    }

    function setMuted(nextMuted) {
      muted = !!nextMuted;
      persistMuteState();
      applyMuteState({ animate: true });
      return muted;
    }

    function toggleMuted() {
      return setMuted(!muted);
    }

    function isMuted() {
      return muted;
    }

    function onMuteChange(listener) {
      if (typeof listener !== "function") {
        return function noop() {};
      }
      muteListeners.add(listener);
      return function unsubscribe() {
        muteListeners.delete(listener);
      };
    }

    function startMusic() {
      if (!musicUrls.length) {
        return;
      }
      ensureMusicElement();
      if (!musicEl) {
        return;
      }
      if (!musicStarted) {
        musicStarted = true;
        if (!musicEl.src) {
          playNextTrack();
          return;
        }
        startTrack(currentMusicUrl || musicEl.src);
        return;
      }
      if (musicEl.paused) {
        const playAttempt = musicEl.play();
        if (!muted) {
          musicEl.volume = Math.max(musicEl.volume, settings.bgmStartVolume);
          if (playAttempt && playAttempt.then) {
            playAttempt.then(() => {
              tweenMusicVolume(musicEl.volume, settings.bgmVolume, 900);
            }).catch(() => {});
          } else {
            tweenMusicVolume(musicEl.volume, settings.bgmVolume, 900);
          }
        }
      }
    }

    function pauseMusic() {
      if (!musicEl) {
        return;
      }
      musicEl.pause();
    }

    function stopMusic() {
      if (!musicEl) {
        return;
      }
      cancelMusicFade();
      musicEl.pause();
      musicEl.currentTime = 0;
      musicEl.volume = muted ? 0 : settings.bgmStartVolume;
      musicStarted = false;
      currentMusicUrl = "";
      musicQueue = [];
      musicQueueIndex = 0;
    }

    function ensureAudio() {
      unlockAudio();
      startMusic();
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

    function playStreakReadyCue() {
      if (!audioCtx || !masterGain) {
        return;
      }
      beep({ freq: 988, dur: 0.09, type: "triangle", gain: 0.12, when: 0, rampTo: 1046 });
      beep({ freq: 1318, dur: 0.12, type: "sine", gain: 0.09, when: 0.05, rampTo: 1396 });
      beep({ freq: 1975, dur: 0.18, type: "triangle", gain: 0.055, when: 0.06, rampTo: 2093 });
    }

    function playVictoryFanfare() {
      if (!audioCtx || !masterGain) {
        return;
      }
      const notes = [523.25, 659.25, 783.99, 1046.5];
      for (let i = 0; i < notes.length; i += 1) {
        const when = i * 0.08;
        beep({ freq: notes[i], dur: 0.24, type: "triangle", gain: 0.22, when, rampTo: notes[i] * 1.02 });
        beep({ freq: notes[i] * 2, dur: 0.3, type: "sine", gain: 0.06, when: when + 0.015, rampTo: notes[i] * 2.05 });
      }
      beep({ freq: 1318.5, dur: 0.48, type: "sine", gain: 0.18, when: 0.32, rampTo: 1568 });
      beep({ freq: 1568, dur: 0.6, type: "triangle", gain: 0.12, when: 0.38, rampTo: 2093 });
    }

    function playFromPool(pool, index) {
      if (muted) {
        return;
      }
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

    ensureMusicElement();

    function startFromGesture() {
      ensureAudio();
      window.removeEventListener("pointerdown", startFromGesture, true);
      window.removeEventListener("touchstart", startFromGesture, true);
      window.removeEventListener("mousedown", startFromGesture, true);
      window.removeEventListener("keydown", startFromGesture, true);
    }

    window.addEventListener("pointerdown", startFromGesture, { once: true, capture: true });
    window.addEventListener("touchstart", startFromGesture, { once: true, capture: true, passive: true });
    window.addEventListener("mousedown", startFromGesture, { once: true, capture: true });
    window.addEventListener("keydown", startFromGesture, { once: true, capture: true });

    return {
      ensureAudio,
      onMuteChange,
      bgm: {
        start() { ensureAudio(); },
        next() { ensureAudio(); playNextTrack(); },
        isMuted,
        setMuted,
        toggleMute: toggleMuted,
        resume() { ensureAudio(); },
        pause() { pauseMusic(); },
        stop() { stopMusic(); }
      },
      sfx: {
        correct() { ensureAudio(); playCorrectChime(); },
        streakReady() { ensureAudio(); playStreakReadyCue(); },
        victory() { ensureAudio(); playVictoryFanfare(); },
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
})(window.GAMES_V2_UTILS || {});
