(function () {
  const firstBootMs = 3000;
  const returnBootMs = 1000;
  const bootSeenKey = "games_v3_boot_seen";
  const overlayEl = document.getElementById("bootOverlay");
  const metaEl = overlayEl.querySelector(".bootMeta");
  const barEl = document.getElementById("bootBar");
  const textEl = document.getElementById("bootText");
  const preloadEls = Array.from(document.querySelectorAll("[data-preload]"));
  const menuTitleEl = document.querySelector(".menuTitle");

  const imageUrls = [
    "shared/assets/ui/starting.png",
    "shared/assets/ui/title.png",
    ...preloadEls.map((el) => el.getAttribute("data-preload")).filter(Boolean)
  ];
  const audioUrls = [
    "shared/assets/music/minuet-g-major.mp3",
    "shared/assets/music/turkish-march.mp3",
    "shared/assets/music/entertainer.mp3",
    "shared/assets/music/wildcatblues.mp3"
  ];

  function unique(list) {
    return Array.from(new Set(list));
  }

  function updateProgress(done, total) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    barEl.style.width = pct + "%";
    textEl.textContent = pct + "%";
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

  function preloadAsset(url) {
    return /\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(url) ? preloadAudio(url) : preloadImage(url);
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

  function bootMode() {
    try {
      if (window.sessionStorage.getItem(bootSeenKey) === "1") {
        return "return";
      }
    } catch (_) {}
    return "first";
  }

  async function boot() {
    const mode = bootMode();
    const minBootMs = mode === "first" ? firstBootMs : returnBootMs;
    const assets = unique(imageUrls.concat(audioUrls));
    let done = 0;
    const startedAt = performance.now();
    overlayEl.classList.toggle("returning", mode === "return");
    if (metaEl) {
      metaEl.hidden = mode === "return";
    }
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

    document.body.classList.remove("booting");
    overlayEl.style.display = "none";
  }

  boot();
})();
