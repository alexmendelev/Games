(function () {
  const firstBootMs = 3000;
  const returnBootMs = 1000;
  const bootSeenKey = "games_v2_boot_seen";
  const overlayEl = document.getElementById("bootOverlay");
  const metaEl = overlayEl.querySelector(".bootMeta");
  const barEl = document.getElementById("bootBar");
  const textEl = document.getElementById("bootText");
  const preloadEls = Array.from(document.querySelectorAll("[data-preload]"));

  const imageUrls = [
    "shared/assets/ui/starting.png",
    "shared/assets/ui/title.png",
    ...preloadEls.map((el) => el.getAttribute("data-preload")).filter(Boolean)
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
    const assets = unique(imageUrls);
    let done = 0;
    const startedAt = performance.now();
    overlayEl.classList.toggle("returning", mode === "return");
    if (metaEl) {
      metaEl.hidden = mode === "return";
    }
    updateProgress(done, assets.length);

    await Promise.all(
      assets.map((url) =>
        preloadImage(url).finally(() => {
          done += 1;
          updateProgress(done, assets.length);
        })
      )
    );

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
