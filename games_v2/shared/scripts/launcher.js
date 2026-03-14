(function () {
  const minBootMs = 3000;
  const overlayEl = document.getElementById("bootOverlay");
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

  async function boot() {
    const assets = unique(imageUrls);
    let done = 0;
    const startedAt = performance.now();
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

    document.body.classList.remove("booting");
    overlayEl.style.display = "none";
  }

  boot();
})();
