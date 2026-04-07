(function () {
  const firstBootMs = 3000;
  const returnBootMs = 1000;
  const bootSeenKey = "games_v3_boot_seen";
  const overlayEl = document.getElementById("bootOverlay");
  const progressEl = document.getElementById("bootProgress");
  const actionsEl = document.getElementById("bootActions");
  const barEl = document.getElementById("bootBar");
  const fullscreenActionEl = document.getElementById("bootFullscreenAction");
  const continueActionEl = document.getElementById("bootContinueAction");
  const textEl = document.getElementById("bootText");
  const preloadEls = Array.from(document.querySelectorAll("[data-preload]"));
  const menuGridEl = document.getElementById("menuGrid");
  const menuPageEl = document.querySelector(".menuPage");
  const menuTitleEl = document.querySelector(".menuTitle");
  const gameStageEl = document.getElementById("gameStage");
  const gameFrameEl = document.getElementById("gameFrame");
  const embeddedBuildTag = "20260403embed4";
  const wordsEmojiDataUrl = "words/data/emoji-easy-oneword-he.js?v=20260317a";
  let embeddedLaunchSeq = 0;
  let bootDismissed = false;
  let launchMode = "normal";

  const menuImageUrls = [
    "shared/assets/ui/starting.png",
    "shared/assets/ui/title.png",
    ...preloadEls.map((el) => el.getAttribute("data-preload")).filter(Boolean)
  ];
  const allImageUrls = [
    ...menuImageUrls,
    "shared/assets/ui/background.png",
    "shared/assets/ui/rock.png",
    "shared/assets/ui/pause.png",
    "shared/assets/ui/resume.png",
    "shared/assets/ui/unmute.png",
    "shared/assets/ui/mute.png",
    "shared/assets/ui/exit.png",
    "shared/assets/ui/tablet.png",
    "shared/assets/ui/tablet-simple.png",
    "shared/assets/ui/tablet-silver.png",
    "shared/assets/ui/tablet-gold.png",
    "shared/assets/ui/tablet-diamond.png",
    "shared/assets/ui/coin.svg",
    "shared/assets/ui/star.svg",
    "shared/assets/ui/heart.svg",
    "shared/assets/fx/splash_sheet.png",
    "shared/assets/fx/burst_sheet.png",
    "shared/assets/mascot/kittydance.png",
    "shared/assets/mascot/kittysad.png",
    "shared/assets/mascot/kittycry.png",
    "shared/assets/mascot/cat_idle.png",
    "shared/assets/mascot/cat_happy.png",
    "shared/assets/mascot/cat_shame.png",
    "shared/assets/avatars/lion.png",
    "shared/assets/avatars/tiger.png",
    "shared/assets/avatars/penguin.png",
    "shared/assets/avatars/frog.png",
    "shared/assets/avatars/cat.png",
    "shared/assets/avatars/dog.png",
    "shared/assets/avatars/dolphin.png",
    "shared/assets/avatars/bunny.png",
    "shared/assets/avatars/rabbit.png",
    "shared/assets/avatars/shark.png",
    "shared/assets/avatars/squirrel.png",
    "shared/assets/avatars/whale.png",
    "shapes/assets/spray.png",
    "shapes/assets/spray_red.png",
    "shapes/assets/spray_blue.png",
    "shapes/assets/spray_green.png",
    "shapes/assets/spray_yellow.png",
    "shapes/assets/spray_purple.png",
    "shapes/assets/spray_orange.png",
    "clocks/assets/ui/dial.png",
    "clocks/assets/ui/dial_no_numbers.png",
    "clocks/assets/ui/dial_plain.png"
  ];
  const allAudioUrls = [
    "shared/assets/audio/splash.mp3",
    "shared/assets/audio/coin_drop.mp3",
    "shared/assets/music/minuet-g-major.mp3",
    "shared/assets/music/turkish-march.mp3",
    "shared/assets/music/entertainer.mp3",
    "shared/assets/music/wildcatblues.mp3"
  ];
  const fetchUrls = [
    "shared/styles/tokens.css?v=20260331font1",
    "shared/styles/menu.css?v=20260320v3l",
    "shared/styles/answers.css?v=20260403layout1",
    "shared/styles/falling-game.css?v=20260404layout32",
    "shared/styles/falling-words.css?v=20260330layout2",
    "shared/styles/falling-shapes.css?v=20260330shapes3",
    "shared/styles/falling-clocks.css?v=20260324clocksmobile7",
    "shared/styles/game-meta.css?v=20260405meta82",
    "equations/style.css?v=20260405equations4",
    "shared/scripts/utils.js?v=20260314p",
    "shared/scripts/utils.js?v=20260314l",
    "shared/scripts/utils.js?v=20260314m",
    "shared/scripts/utils.js?v=20260323clocks1",
    "shared/scripts/layout.js?v=20260405layout6",
    "shared/scripts/audio.js?v=20260320audio3",
    "shared/scripts/audio.js?v=20260323clocks1",
    "shared/scripts/fx.js?v=20260404fx1",
    "shared/scripts/game-shell.js?v=20260404runner8",
    "shared/scripts/game-meta.js?v=20260405meta48",
    "shared/scripts/game-session.js?v=20260403level2",
    "math/config.js?v=20260322mascot1",
    "math/game.js?v=20260403balance7",
    "multiply/config.js?v=20260322mascot1",
    "multiply/game.js?v=20260403balance4",
    "words/config.js?v=20260322mascot1",
    wordsEmojiDataUrl,
    "words/data/emoji-easy-oneword-he.tsv",
    "words/game.js?v=20260403balance5",
    "shapes/config.js?v=20260322mascot1",
    "shapes/game.js?v=20260403balance4",
    "clocks/config.js?v=20260323clocks2",
    "clocks/game.js?v=20260403balance4",
    "equations/config.js?v=20260405equations3",
    "equations/game.js?v=20260405equations1"
  ];

  function unique(list) {
    return Array.from(new Set(list));
  }

  function isFullscreenPreferredDevice() {
    const coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const touchPoints = Math.max(
      Number(navigator.maxTouchPoints) || 0,
      Number(navigator.msMaxTouchPoints) || 0
    );
    const shortSide = Math.min(
      Math.max(0, Number(window.screen && window.screen.width) || 0),
      Math.max(0, Number(window.screen && window.screen.height) || 0)
    );
    return (coarsePointer || touchPoints > 0) && shortSide > 0 && shortSide <= 1024;
  }

  function setActionDisabled(disabled) {
    [fullscreenActionEl, continueActionEl].forEach((button) => {
      if (button) {
        button.disabled = !!disabled;
      }
    });
  }

  function updateBootReadyState(ready) {
    const mobileDevice = isFullscreenPreferredDevice();
    if (progressEl) {
      progressEl.hidden = !!ready;
    }
    if (actionsEl) {
      actionsEl.hidden = !ready;
    }
    if (fullscreenActionEl) {
      fullscreenActionEl.hidden = !(ready && mobileDevice);
      fullscreenActionEl.disabled = false;
    }
    if (continueActionEl) {
      continueActionEl.hidden = !ready;
      continueActionEl.textContent = mobileDevice ? "Continue Normally" : "Continue";
      continueActionEl.disabled = false;
    }
    if (textEl && ready) {
      textEl.textContent = mobileDevice
        ? "Everything is ready. Choose how to open the games."
        : "Everything is ready. Click to continue.";
    }
  }

  function updateProgress(done, total) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    barEl.style.width = pct + "%";
    if (!actionsEl || actionsEl.hidden) {
      textEl.textContent = pct + "%";
    }
  }

  function preloadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      const finish = () => resolve();
      img.onload = finish;
      img.onerror = finish;
      img.src = url;
      if (img.complete) {
        resolve();
      }
    });
  }

  function preloadAudio(url) {
    return new Promise((resolve) => {
      const audio = new Audio();
      const finish = () => {
        audio.removeEventListener("loadeddata", finish);
        audio.removeEventListener("canplaythrough", finish);
        audio.removeEventListener("error", finish);
        resolve();
      };
      audio.preload = "auto";
      audio.addEventListener("loadeddata", finish, { once: true });
      audio.addEventListener("canplaythrough", finish, { once: true });
      audio.addEventListener("error", finish, { once: true });
      audio.src = url;
      try {
        audio.load();
      } catch (_) {
        resolve();
      }
      if (audio.readyState >= 2) {
        resolve();
      }
    });
  }

  function preloadFetch(url) {
    return fetch(url, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to preload " + url);
        }
        return response;
      })
      .catch(() => {});
  }

  function preloadAsset(url) {
    if (/\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(url)) {
      return preloadAudio(url);
    }
    if (/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url)) {
      return preloadImage(url);
    }
    return preloadFetch(url);
  }

  function waitForImageElement(img) {
    return new Promise((resolve) => {
      if (!img) {
        resolve();
        return;
      }

      const finish = () => {
        if (typeof img.decode === "function") {
          img.decode().catch(() => {}).finally(resolve);
          return;
        }
        resolve();
      };

      if (img.complete && img.naturalWidth > 0) {
        finish();
        return;
      }

      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", () => resolve(), { once: true });
    });
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function canInterceptNav(event) {
    return !event.defaultPrevented
      && event.button === 0
      && !event.metaKey
      && !event.ctrlKey
      && !event.shiftKey
      && !event.altKey;
  }

  function requestFullscreenForApp() {
    const el = document.documentElement;
    if (!el) {
      return Promise.resolve();
    }
    if (document.fullscreenElement) {
      return Promise.resolve();
    }

    const fn = el.requestFullscreen
      || el.webkitRequestFullscreen
      || el.msRequestFullscreen;

    if (typeof fn !== "function") {
      return Promise.resolve();
    }

    try {
      const result = fn.call(el);
      if (result && typeof result.then === "function") {
        return result.catch(() => {});
      }
    } catch (_) {
      return Promise.resolve();
    }

    return Promise.resolve();
  }

  async function resolveWordsEmojiUrls() {
    const response = await fetch(wordsEmojiDataUrl, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error("Failed to load emoji data");
    }
    const text = await response.text();
    return unique(
      Array.from(text.matchAll(/"id":"([^"]+)"/g)).map((match) => `words/data/emojis/${match[1]}.png`)
    );
  }

  function buildFreshGameUrl(href) {
    const url = new URL(href, window.location.href);
    embeddedLaunchSeq += 1;
    url.searchParams.set("embedv", embeddedBuildTag);
    url.searchParams.set("launch", String(embeddedLaunchSeq));
    return url.toString();
  }

  function openEmbeddedGame(href) {
    if (!gameStageEl || !gameFrameEl) {
      window.location.href = href;
      return;
    }
    if (menuPageEl) {
      menuPageEl.hidden = true;
      menuPageEl.setAttribute("aria-hidden", "true");
    }
    gameStageEl.hidden = false;
    gameStageEl.setAttribute("aria-hidden", "false");
    const freshHref = buildFreshGameUrl(href);
    if (gameFrameEl.src !== "about:blank") {
      gameFrameEl.src = "about:blank";
      window.requestAnimationFrame(() => {
        gameFrameEl.src = freshHref;
      });
      return;
    }
    gameFrameEl.src = freshHref;
  }

  function closeEmbeddedGame() {
    if (gameFrameEl) {
      gameFrameEl.src = "about:blank";
    }
    if (gameStageEl) {
      gameStageEl.hidden = true;
      gameStageEl.setAttribute("aria-hidden", "true");
    }
    if (menuPageEl) {
      menuPageEl.hidden = false;
      menuPageEl.setAttribute("aria-hidden", "false");
    }
    return true;
  }

  window.__gamesCloseEmbeddedStage = closeEmbeddedGame;

  function installEmbeddedExitListener() {
    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      if (!event.data || event.data.type !== "games:exit-embedded") {
        return;
      }
      if (gameFrameEl && event.source !== gameFrameEl.contentWindow) {
        return;
      }
      closeEmbeddedGame();
    });
  }

  function installMenuLaunchFullscreen() {
    if (!menuGridEl) {
      return;
    }

    menuGridEl.addEventListener("click", async (event) => {
      const card = event.target.closest("a.menuCard[href]");
      if (!card || !menuGridEl.contains(card) || !canInterceptNav(event)) {
        return;
      }

      event.preventDefault();
      if (launchMode === "fullscreen" && isFullscreenPreferredDevice()) {
        await requestFullscreenForApp();
      }
      openEmbeddedGame(card.getAttribute("href"));
    });
  }

  function bootMode() {
    try {
      if (window.sessionStorage.getItem(bootSeenKey) === "1") {
        return "return";
      }
    } catch (_) {}
    return "first";
  }

  function dismissBootOverlay() {
    if (bootDismissed) {
      return;
    }
    bootDismissed = true;
    document.body.classList.remove("booting");
    overlayEl.style.display = "none";
  }

  async function finishBoot(nextLaunchMode) {
    launchMode = nextLaunchMode === "fullscreen" ? "fullscreen" : "normal";
    setActionDisabled(true);
    if (textEl) {
      textEl.textContent = launchMode === "fullscreen"
        ? "Opening full screen..."
        : "Opening...";
    }
    if (launchMode === "fullscreen" && isFullscreenPreferredDevice()) {
      await requestFullscreenForApp();
    }
    dismissBootOverlay();
  }

  async function boot() {
    const mode = bootMode();
    const minBootMs = mode === "first" ? firstBootMs : returnBootMs;
    let emojiUrls = [];
    try {
      emojiUrls = await resolveWordsEmojiUrls();
    } catch (_) {}

    const assets = unique(allImageUrls.concat(allAudioUrls, fetchUrls, emojiUrls));
    let done = 0;
    const startedAt = performance.now();

    overlayEl.classList.toggle("returning", mode === "return");
    updateBootReadyState(false);
    updateProgress(done, assets.length);

    await Promise.all(
      assets.map((url) =>
        preloadAsset(url).finally(() => {
          done += 1;
          updateProgress(done, assets.length);
        })
      )
    );

    await waitForImageElement(menuTitleEl);

    const elapsedMs = performance.now() - startedAt;
    if (elapsedMs < minBootMs) {
      await wait(minBootMs - elapsedMs);
    }

    try {
      window.sessionStorage.setItem(bootSeenKey, "1");
    } catch (_) {}

    updateBootReadyState(true);
  }

  if (fullscreenActionEl) {
    fullscreenActionEl.addEventListener("click", () => {
      finishBoot("fullscreen");
    });
  }
  if (continueActionEl) {
    continueActionEl.addEventListener("click", () => {
      finishBoot("normal");
    });
  }

  window.addEventListener("resize", () => {
    if (actionsEl && !actionsEl.hidden) {
      updateBootReadyState(true);
    }
  });
  window.addEventListener("orientationchange", () => {
    if (actionsEl && !actionsEl.hidden) {
      updateBootReadyState(true);
    }
  });

  boot();
  installMenuLaunchFullscreen();
  installEmbeddedExitListener();
})();
