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
    const timeout = new Promise(
      (_, reject) => setTimeout(
        () => reject(new Error("Timed out waiting for images to load")),
        timeoutMs
      )
    );
    return Promise.race([Promise.all([...promises]).then(() => delay), timeout]);
  }
  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  // src/bundle/viewer.entry.js
  var CONTAINER = document.getElementById("page-container");
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
  }
  run();
})();
