var pantherBundle = (() => {
  // src/core/utils.js
  function waitImages(el, { timeoutMs = 3e4 } = {}) {
    const images = Array.from(el.querySelectorAll("img"));
    const promises = images.map(
      (img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
        const done = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          resolve();
        };
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      })
    );
    const delay = new Promise((resolve) => requestAnimationFrame(resolve));
    const timeout2 = new Promise(
      (_, reject) => setTimeout(
        () => reject(new Error("Timed out waiting for images to load")),
        timeoutMs
      )
    );
    return Promise.race([Promise.all([...promises]).then(() => delay), timeout2]);
  }
  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }
  function timeout(ms, error) {
    return new Promise((_, reject) => setTimeout(() => reject(error), ms));
  }

  // src/bundle/viewer.entry.js
  var CONTAINER = document.getElementById("page-container");
  var AUTO_CLOSE_MS = 6e4;
  function closeViewer() {
    window.close();
  }
  async function run() {
    if (!CONTAINER) {
      alert("Page container element not found");
      return;
    }
    const pages = Array.from(CONTAINER.childNodes);
    for (let i = 0; i < pages.length; i++) {
      try {
        pages[i].scrollIntoView({ behavior: "instant", block: "start" });
        await waitImages(pages[i]);
      } catch (err) {
        console.error("[Panther] viewer scan error:", err);
      }
    }
    await nextFrame();
    window.print();
    Promise.race([
      new Promise(
        (resolve) => window.addEventListener("afterprint", resolve, { once: true })
      ),
      timeout(AUTO_CLOSE_MS, "auto-close")
    ]).then(closeViewer);
  }
  run();
})();
