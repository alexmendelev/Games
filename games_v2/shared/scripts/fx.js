window.GAMES_V2_FX = (function (utils) {
  function createFxToolkit(options) {
    const settings = Object.assign({
      gameEl: null,
      coinIconEl: null
    }, options || {});

    function playSheetFx(sheetCfg, x, y, anchor, extra) {
      const opts = Object.assign({
        className: "",
        scaleMul: 1,
        fpsMul: 1,
        filter: "",
        zIndex: null
      }, extra || {});

      const frameW = sheetCfg.sheetW / sheetCfg.cols;
      const frameH = sheetCfg.sheetH / sheetCfg.rows;
      const scale = sheetCfg.scale * opts.scaleMul;
      const el = document.createElement("div");
      el.className = "fx";
      if (opts.className) {
        opts.className.split(/\s+/).filter(Boolean).forEach((cls) => el.classList.add(cls));
      }
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.width = frameW * scale + "px";
      el.style.height = frameH * scale + "px";
      el.style.backgroundImage = `url("${sheetCfg.url}")`;
      el.style.backgroundSize = sheetCfg.sheetW * scale + "px " + sheetCfg.sheetH * scale + "px";
      if (opts.filter) {
        el.style.filter = opts.filter;
      }
      if (opts.zIndex !== null) {
        el.style.zIndex = String(opts.zIndex);
      }
      el.style.transform = anchor === "bottom" ? "translate(-50%, -100%)" : "translate(-50%, -50%)";
      settings.gameEl.appendChild(el);

      let frame = 0;
      let acc = 0;
      let last = performance.now();
      const frameDt = 1 / Math.max(1, sheetCfg.fps * opts.fpsMul);

      function step(ts) {
        const delta = (ts - last) / 1000;
        last = ts;
        acc += delta;

        while (acc >= frameDt) {
          acc -= frameDt;
          const col = frame % sheetCfg.cols;
          const row = Math.floor(frame / sheetCfg.cols);
          el.style.backgroundPosition = (-col * frameW * scale) + "px " + (-row * frameH * scale) + "px";
          frame += 1;
          if (frame >= sheetCfg.frames) {
            el.remove();
            return;
          }
        }
        requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    }

    function playBurstFlash(x, y, hueDeg) {
      const el = document.createElement("div");
      el.className = "burstFlash";
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.filter = `hue-rotate(${hueDeg}deg) saturate(2.35) brightness(1.26)`;
      el.addEventListener("animationend", () => el.remove(), { once: true });
      settings.gameEl.appendChild(el);
    }

    function playHitScreenFlash(baseHue) {
      const el = document.createElement("div");
      el.className = "hitFlash";
      const h1 = baseHue;
      const h2 = (baseHue + 120) % 360;
      const h3 = (baseHue + 240) % 360;
      el.style.background = `
        radial-gradient(circle at 50% 44%, hsla(${h1}, 100%, 66%, .66) 0%, hsla(${h2}, 100%, 62%, .36) 38%, hsla(${h3}, 100%, 56%, 0) 74%),
        radial-gradient(circle at 54% 48%, hsla(${h2}, 100%, 64%, .42) 0%, hsla(${h3}, 100%, 58%, .28) 44%, hsla(${h1}, 100%, 60%, 0) 78%)
      `;
      el.addEventListener("animationend", () => el.remove(), { once: true });
      settings.gameEl.appendChild(el);
    }

    function playFireworks(x, y, baseHue) {
      const ui = utils.getUi();
      const colors = ["#ffd93d", "#ff65d9", "#59c8ff", "#7dff8f", "#ff9e57", "#b783ff"];

      const core = document.createElement("div");
      core.className = "fireworkCore";
      core.style.left = x + "px";
      core.style.top = y + "px";
      core.style.background = `radial-gradient(circle,
        hsla(${baseHue}, 100%, 88%, .95) 0%,
        hsla(${(baseHue + 36) % 360}, 100%, 70%, .88) 18%,
        hsla(${(baseHue + 95) % 360}, 100%, 62%, .62) 36%,
        hsla(${(baseHue + 140) % 360}, 100%, 58%, 0) 74%)`;
      core.style.filter = "saturate(2.35) brightness(1.26)";
      settings.gameEl.appendChild(core);
      core.animate(
        [
          { opacity: 0, transform: "translate(-50%, -50%) scale(.22)" },
          { opacity: 1, transform: "translate(-50%, -50%) scale(.95)", offset: 0.22 },
          { opacity: 0, transform: "translate(-50%, -50%) scale(1.75)" }
        ],
        { duration: 980, easing: "cubic-bezier(.2,.68,.2,1)" }
      ).finished.finally(() => core.remove());

      for (let ringIndex = 0; ringIndex < 2; ringIndex += 1) {
        const ring = document.createElement("div");
        ring.className = "fireworkRing";
        ring.style.left = x + "px";
        ring.style.top = y + "px";
        const hue = (baseHue + (ringIndex === 0 ? 20 : 190)) % 360;
        const color = `hsla(${hue}, 100%, 74%, .95)`;
        ring.style.borderColor = color;
        ring.style.filter = `saturate(2.35) brightness(1.28) drop-shadow(0 0 18px ${color})`;
        settings.gameEl.appendChild(ring);
        ring.animate(
          [
            { opacity: 0, transform: "translate(-50%, -50%) scale(.24)" },
            { opacity: 0.95, transform: "translate(-50%, -50%) scale(1.15)", offset: 0.2 },
            { opacity: 0, transform: "translate(-50%, -50%) scale(3.1)" }
          ],
          { duration: 1080 + ringIndex * 180, easing: "cubic-bezier(.14,.64,.18,1)" }
        ).finished.finally(() => ring.remove());
      }

      const sparkCount = 42;
      for (let i = 0; i < sparkCount; i += 1) {
        const spark = document.createElement("div");
        spark.className = "fireworkSpark";
        const color = colors[i % colors.length];
        const size = utils.randFloat(7, 16) * ui;
        spark.style.width = size + "px";
        spark.style.height = size + "px";
        spark.style.left = x + "px";
        spark.style.top = y + "px";
        spark.style.background = `radial-gradient(circle at 35% 35%, rgba(255,255,255,.98), ${color} 52%, rgba(0,0,0,0) 76%)`;
        spark.style.boxShadow = `0 0 ${10 * ui}px ${color}, 0 0 ${22 * ui}px ${color}`;
        spark.style.filter = `hue-rotate(${baseHue}deg) saturate(2.15) brightness(1.14)`;
        settings.gameEl.appendChild(spark);

        const angle = (Math.PI * 2 * i / sparkCount) + utils.randFloat(-0.12, 0.12);
        const dist = utils.randFloat(84, 220) * ui;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const duration = utils.randInt(900, 1500);
        const hueShift = utils.randInt(-28, 28);

        spark.animate(
          [
            { opacity: 1, transform: "translate(-50%, -50%) scale(.35)", filter: `hue-rotate(${hueShift}deg)` },
            { opacity: 0.95, transform: `translate(calc(-50% + ${dx * 0.35}px), calc(-50% + ${dy * 0.35}px)) scale(1)`, offset: 0.22, filter: `hue-rotate(${hueShift + 10}deg)` },
            { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.45)`, filter: `hue-rotate(${hueShift + 22}deg) blur(1px)` }
          ],
          { duration, easing: "cubic-bezier(.08,.64,.22,1)" }
        ).finished.finally(() => spark.remove());
      }
    }

    function playEnhancedBurst(sheetCfg, x, y) {
      const baseHue = utils.randInt(0, 359);
      playHitScreenFlash(baseHue);
      playBurstFlash(x, y, baseHue);
      setTimeout(() => playBurstFlash(x, y, (baseHue + 150) % 360), 86);
      setTimeout(() => playBurstFlash(x, y, (baseHue + 285) % 360), 180);
      setTimeout(() => playFireworks(x, y, baseHue), 56);
      playSheetFx(sheetCfg, x, y, "center", {
        className: "burstFx",
        scaleMul: 1.35,
        fpsMul: 0.52,
        filter: `hue-rotate(${(baseHue + 25) % 360}deg) saturate(2.55) brightness(1.36) drop-shadow(0 0 26px hsla(${baseHue}, 100%, 72%, .92))`,
        zIndex: 24
      });
    }

    function popIcon(iconEl) {
      if (!iconEl || !iconEl.animate) {
        return Promise.resolve();
      }
      const anim = iconEl.animate(
        [
          { transform: "scale(1)", filter: "drop-shadow(0 0 0 rgba(255,215,64,0))" },
          { transform: "scale(1.34)", filter: "drop-shadow(0 0 10px rgba(255,215,64,.9))" },
          { transform: "scale(1)", filter: "drop-shadow(0 0 0 rgba(255,215,64,0))" }
        ],
        { duration: 330, easing: "cubic-bezier(.22,.61,.36,1)" }
      );
      return anim.finished.catch(() => {});
    }

    function animateCoinToHud(startXInGame, startYInGame) {
      if (!settings.coinIconEl || !settings.coinIconEl.getBoundingClientRect) {
        return Promise.resolve();
      }

      const gameRect = settings.gameEl.getBoundingClientRect();
      const coinRect = settings.coinIconEl.getBoundingClientRect();
      const startX = gameRect.left + startXInGame;
      const startY = gameRect.top + startYInGame;
      const endX = coinRect.left + coinRect.width / 2;
      const endY = coinRect.top + coinRect.height / 2;
      const ctrlX = (startX + endX) / 2;
      const ctrlY = Math.min(startY, endY) - 120;

      const flyEl = document.createElement("img");
      flyEl.className = "coinFly";
      flyEl.src = settings.coinIconEl.currentSrc || settings.coinIconEl.src;
      flyEl.alt = "";
      document.body.appendChild(flyEl);

      const anim = flyEl.animate(
        [
          { transform: `translate(${startX}px, ${startY}px) translate(-50%, -50%) scale(.35)`, opacity: 0, offset: 0 },
          { transform: `translate(${startX}px, ${startY - 8}px) translate(-50%, -50%) scale(.95)`, opacity: 1, offset: 0.14 },
          { transform: `translate(${ctrlX}px, ${ctrlY}px) translate(-50%, -50%) scale(1.05)`, opacity: 1, offset: 0.72 },
          { transform: `translate(${endX}px, ${endY}px) translate(-50%, -50%) scale(.62)`, opacity: 1, offset: 1 }
        ],
        { duration: 2480, easing: "cubic-bezier(.17,.67,.27,1)" }
      );

      return anim.finished.catch(() => {}).then(() => {
        flyEl.remove();
      });
    }

    function awardCoinFromBurst(startXInGame, startYInGame, onAward) {
      return animateCoinToHud(startXInGame, startYInGame)
        .then(() => popIcon(settings.coinIconEl))
        .finally(() => {
          if (typeof onAward === "function") {
            onAward();
          }
        });
    }

    return {
      playSheetFx,
      playEnhancedBurst,
      awardCoinFromBurst
    };
  }

  return {
    createFxToolkit
  };
})(window.GAMES_V2_UTILS);
