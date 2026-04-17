/**
 * Shared game behaviors — extracted boilerplate common to all 6 falling-tile games.
 *
 * Usage:
 *   const bh = gameBehaviors.create({ cfg, shell, audio, fx, session, elements });
 *
 * The factory captures references to shared dependencies once. Each returned
 * function uses explicit parameters for any value that varies per call site
 * (e.g. streak progress, answer-feedback duration, button enable filter).
 */
(function () {
  "use strict";

  function create(options) {
    const cfg      = options.cfg;
    const audio    = options.audio;
    const fx       = options.fx;
    const session  = options.session;
    const elements = options.elements;

    // --- internal state ---
    let mascotAnimToken = 0;
    let coinAwardPending = false;

    // ------------------------------------------------------------------
    // Mascot sprite animation
    // ------------------------------------------------------------------

    function setMascot(state) {
      const sprite = state === "shame"
        ? (cfg.assets.mascotSadSheet || cfg.assets.mascotSheet)
        : cfg.assets.mascotSheet;
      mascotAnimToken += 1;
      elements.mascotEl.classList.remove("is-celebrating");
      elements.mascotEl.style.backgroundImage = `url("${sprite.url}")`;
      elements.mascotEl.style.backgroundSize = `${sprite.cols * 100}% ${sprite.rows * 100}%`;
      elements.mascotEl.style.backgroundPosition = "0% 0%";
    }

    function playMascotAnimation(sprite, repeats, withGlow, frameDelayMul) {
      const token = ++mascotAnimToken;
      let frame = 0;
      let loopsLeft = Math.max(1, repeats || 1);
      const frameDelay = (1000 / Math.max(1, sprite.fps || 10)) * Math.max(1, frameDelayMul || 1);

      if (withGlow) {
        elements.mascotEl.classList.add("is-celebrating");
        fx.playStarsAroundElement(elements.mascotEl, { starCount: 12, spreadMul: 1, durationMul: 1 });
      } else {
        elements.mascotEl.classList.remove("is-celebrating");
      }

      elements.mascotEl.style.backgroundImage = `url("${sprite.url}")`;
      elements.mascotEl.style.backgroundSize = `${sprite.cols * 100}% ${sprite.rows * 100}%`;

      function drawFrame() {
        if (token !== mascotAnimToken) return;
        const col = frame % sprite.cols;
        const row = Math.floor(frame / sprite.cols);
        const x = sprite.cols > 1 ? (col / (sprite.cols - 1)) * 100 : 0;
        const y = sprite.rows > 1 ? (row / (sprite.rows - 1)) * 100 : 0;
        elements.mascotEl.style.backgroundPosition = `${x}% ${y}%`;
        frame += 1;
        if (frame < sprite.frames) {
          setTimeout(drawFrame, frameDelay);
        } else if (loopsLeft > 1) {
          loopsLeft -= 1;
          frame = 0;
          if (withGlow) {
            fx.playStarsAroundElement(elements.mascotEl, { starCount: 10, spreadMul: 0.92, durationMul: 0.9 });
          }
          setTimeout(drawFrame, Math.max(40, Math.round(frameDelay * 0.65)));
        } else {
          setMascot("idle");
        }
      }

      drawFrame();
    }

    function playMascotDance(repeats, withGlow) {
      playMascotAnimation(cfg.assets.mascotSheet, repeats, withGlow, 1);
    }

    function playMascotShame() {
      playMascotAnimation(cfg.assets.mascotSadSheet || cfg.assets.mascotSheet, 1, false, 2);
    }

    // ------------------------------------------------------------------
    // Answer-button marks
    // ------------------------------------------------------------------

    /**
     * @param {Function} [shouldEnable] - Optional filter (btn, idx) => bool.
     *   Shapes passes this to only enable buttons below activeAnswerCount.
     */
    function clearAnswerMarks(shouldEnable) {
      elements.ansBtns.forEach((btn, idx) => {
        if (btn._markTimer) {
          clearTimeout(btn._markTimer);
          btn._markTimer = null;
        }
        if (btn._pressTimer) {
          clearTimeout(btn._pressTimer);
          btn._pressTimer = null;
        }
        btn.classList.remove("mark-correct", "mark-wrong", "is-pressed");
        if (!shouldEnable || shouldEnable(btn, idx)) {
          btn.disabled = false;
        }
      });
    }

    /**
     * @param {number} durationMs - Caller passes cfg.answerFeedbackMs or cfg.answerLockMs.
     */
    function showAnswerMark(btn, isCorrect, durationMs) {
      if (btn._markTimer) {
        clearTimeout(btn._markTimer);
      }
      if (btn._pressTimer) {
        clearTimeout(btn._pressTimer);
      }
      btn.classList.add("is-pressed");
      btn._pressTimer = setTimeout(() => {
        btn.classList.remove("is-pressed");
        btn._pressTimer = null;
      }, 140);
      btn.classList.remove("mark-correct", "mark-wrong");
      btn.classList.add(isCorrect ? "mark-correct" : "mark-wrong");
      btn._markTimer = setTimeout(() => {
        btn.classList.remove("mark-correct", "mark-wrong");
        btn._markTimer = null;
      }, durationMs);
    }

    // ------------------------------------------------------------------
    // UI feedback
    // ------------------------------------------------------------------

    function animateStarGained() {
      elements.coinIconEl.classList.remove("star-hit", "star-gain");
      void elements.coinIconEl.offsetWidth;
      elements.coinIconEl.classList.add("star-gain");
    }

    function updateStreakMeter(current, target) {
      const ratio = Math.max(0, Math.min(1, current / Math.max(1, target)));
      if (elements.streakFillEl) {
        elements.streakFillEl.style.width = `${ratio * 100}%`;
      }
      if (elements.streakMeterEl) {
        elements.streakMeterEl.style.setProperty("--segments", String(Math.max(1, target)));
        elements.streakMeterEl.classList.toggle("is-warm", ratio >= 0.6 && ratio < 1);
        elements.streakMeterEl.classList.toggle("is-imminent", ratio >= 0.85 && ratio < 1);
        elements.streakMeterEl.classList.toggle("is-full", ratio >= 1);
      }
    }

    // ------------------------------------------------------------------
    // Tablet rewards
    // ------------------------------------------------------------------

    function awardTabletBonus(burstX, burstY, rewardCoins) {
      if (rewardCoins <= 0) {
        return;
      }
      coinAwardPending = true;
      fx.awardCoinFromBurst(burstX, burstY).then(() => {
        const pulseDurationMs = 220;
        const stepDelayMs = rewardCoins >= 10 ? 60 : 110;
        let awarded = 0;
        audio.sfx.coin();
        playMascotDance();
        return new Promise((resolve) => {
          function addNextCoin() {
            awarded += 1;
            session.addCoins(1);
            animateStarGained();
            elements.coinEl.classList.remove("pulse");
            void elements.coinEl.offsetWidth;
            elements.coinEl.classList.add("pulse");
            setTimeout(() => elements.coinEl.classList.remove("pulse"), pulseDurationMs);
            if (awarded >= rewardCoins) {
              resolve();
              return;
            }
            setTimeout(addNextCoin, stepDelayMs);
          }
          addNextCoin();
        });
      }).finally(() => {
        coinAwardPending = false;
      });
    }

    function isCoinAwardPending() {
      return coinAwardPending;
    }

    // ------------------------------------------------------------------
    // Asset preloading (uses img.decode() when available)
    // ------------------------------------------------------------------

    function preloadImage(url) {
      return new Promise((resolve) => {
        if (!url) {
          resolve();
          return;
        }
        const img = new Image();
        const finish = () => {
          if (typeof img.decode === "function") {
            img.decode().catch(() => {}).finally(resolve);
            return;
          }
          resolve();
        };
        img.onload = finish;
        img.onerror = () => resolve();
        img.src = url;
        if (img.complete) {
          if (img.naturalWidth > 0) {
            finish();
          } else {
            resolve();
          }
        }
      });
    }

    // ------------------------------------------------------------------

    return {
      setMascot,
      playMascotAnimation,
      playMascotDance,
      playMascotShame,
      clearAnswerMarks,
      showAnswerMark,
      animateStarGained,
      updateStreakMeter,
      awardTabletBonus,
      isCoinAwardPending,
      preloadImage
    };
  }

  window.GAMES_V2_BEHAVIORS = { create };
})();
