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
  function createProgressIndicator(total) {
    const el = document.createElement("div");
    Object.assign(el.style, {
      fontFamily: "sans-serif",
      position: "fixed",
      top: "20px",
      right: "20px",
      backgroundColor: "#FF5722",
      color: "white",
      padding: "15px",
      borderRadius: "5px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
      opacity: "1",
      transition: "opacity 0.5s ease",
      fontSize: "20px",
      zIndex: "9999"
    });
    document.body.appendChild(el);
    return {
      setProgress(n) {
        if (n === total) {
          el.remove();
          return;
        }
        el.textContent = `Scanning: ${n}/${total}`;
      }
    };
  }
  function timeout(ms, error) {
    return new Promise((_, reject) => setTimeout(() => reject(error), ms));
  }

  // src/core/papersize.js
  function parsePaperSize(token) {
    const parts = token.split(".");
    if (parts.length === 5) {
      return {
        name: parts[0],
        width: Number(`${parts[1]}.${parts[2]}`),
        height: Number(`${parts[3]}.${parts[4]}`)
      };
    }
    if (parts.length === 3) {
      return {
        name: parts[0],
        width: Number(parts[1]),
        height: Number(parts[2])
      };
    }
    return null;
  }
  function computePrintStyle(sizeToken) {
    const container = document.getElementById("page-container-wrapper")?.childNodes[0]?.childNodes[1]?.childNodes[0];
    if (!container) return null;
    const size = parsePaperSize(sizeToken);
    if (!size) return null;
    const mmPerPx = (px) => {
      const ruler = document.createElement("div");
      ruler.style.width = "100mm";
      ruler.style.position = "absolute";
      ruler.style.visibility = "hidden";
      document.body.appendChild(ruler);
      const ratio = 100 / ruler.getBoundingClientRect().width;
      document.body.removeChild(ruler);
      return px * ratio;
    };
    const contentW = mmPerPx(container.clientWidth);
    const contentH = mmPerPx(container.clientHeight);
    const orientation = contentW < contentH ? "portrait" : "landscape";
    let scale, offsetX, offsetY;
    if (orientation === "portrait") {
      scale = Math.min(size.width / contentW, size.height / contentH);
      offsetX = (size.width - contentW * scale) / 2;
      offsetY = (size.height - contentH * scale) / 2;
    } else {
      scale = Math.min(size.height / contentW, size.width / contentH);
      offsetX = (size.height - contentW * scale) / 2;
      offsetY = (size.width - contentH * scale) / 2;
    }
    const style = document.createElement("style");
    style.textContent = `@media print {
        @page { size: ${size.name} ${orientation}; margin: 0; }
        #page-container {
            transform: scale(${scale}) translate(${offsetX}px, ${offsetY}px);
            transform-origin: top left;
        }
    }`;
    return style;
  }

  // src/core/clone.js
  function cloneDocument() {
    const source = document.getElementById("page-container-wrapper")?.cloneNode(
      true
    );
    if (!source) {
      throw new Error("Clone document");
    }
    source.style = null;
    source.querySelectorAll('[class*="banner-wrapper"]').forEach((el) => {
      el?.remove();
    });
    const firstRow = source.childNodes[0]?.childNodes;
    if (firstRow) {
      firstRow.forEach((cell) => {
        if (cell.childNodes.length === 2) {
          cell.childNodes[1].style = "display: block";
          cell.childNodes[1].childNodes[0].style = "display: block";
        } else {
          cell.childNodes[0].style = "display: block";
          cell.childNodes[0].childNodes[0].style = "display: block";
        }
      });
    }
    return source;
  }

  // src/core/export.js
  var PAPERSIZE_URL = chrome.runtime.getURL("src/assets/modals/papersize.html");
  function askPaperSize() {
    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.src = PAPERSIZE_URL;
      Object.assign(iframe.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
        zIndex: "9999",
        opacity: "0",
        transition: "opacity 0.3s ease"
      });
      document.body.appendChild(iframe);
      requestAnimationFrame(() => {
        iframe.style.opacity = "1";
      });
      const onMessage = (event) => {
        if (event.source !== iframe.contentWindow) return;
        cleanup();
        resolve(
          event.data?.type === "confirmed" ? event.data.value : null
        );
      };
      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        iframe.remove();
      };
      window.addEventListener("message", onMessage);
    });
  }
  async function scanPages(progress) {
    const container = document.getElementById("page-container");
    if (!container) {
      throw new Error("Page container element not found");
    }
    const pages = Array.from(container.childNodes);
    for (let i = 0; i < pages.length; i++) {
      try {
        pages[i].scrollIntoView({ behavior: "instant", block: "start" });
        progress.setProgress(i + 1);
        await waitImages(pages[i]);
      } catch (err) {
        throw new Error(`Error processing element: ${err.message}`);
      }
    }
  }
  async function scrollTo(y, { timeoutMs = 15e3 } = {}) {
    if (window.scrollY === y) return;
    await Promise.race([
      new Promise((resolve) => {
        const check = () => {
          if (window.scrollY === y) {
            window.removeEventListener("scroll", check);
            resolve();
          }
        };
        window.addEventListener("scroll", check);
        window.scrollTo({ top: y, behavior: "smooth" });
      }),
      timeout(timeoutMs, "Timed out scrolling back to top")
    ]);
  }
  function cloneStylesheets() {
    const links = document.querySelectorAll(
      'link[rel="stylesheet"][href*="doc-assets"], link[as="style"][href*="doc-assets"]'
    );
    return Array.from(links).map((link) => link.cloneNode(true));
  }
  function buildViewer(sizeToken) {
    const viewer = window.open("", "panther-viewer");
    if (!viewer) {
      throw new Error(
        "Popup was blocked. Please allow popups for this site and try again."
      );
    }
    viewer.document.title = document.title;
    cloneStylesheets().forEach((node) => viewer.document.head.appendChild(node));
    const printStyle = computePrintStyle(sizeToken);
    if (printStyle) viewer.document.head.appendChild(printStyle);
    const body = cloneDocument();
    viewer.document.body.appendChild(body);
    const script = viewer.document.createElement("script");
    script.src = chrome.runtime.getURL("src/bundle/viewer.bundle.js");
    viewer.document.body.appendChild(script);
    return viewer;
  }
  async function exportDocument() {
    const bannerButtons = Array.from(document.querySelectorAll("button")).filter(
      (btn) => Array.from(btn.classList).some(
        (cls) => cls.startsWith("PremiumBannerButton")
      )
    );
    if (bannerButtons.length === 0) {
      const ok = confirm(
        'Advertisement banners are detected in this document.\nClick "OK" to remove them and refresh the page.\nClick "Cancel" if you believe all banners have been removed.'
      );
      if (ok) {
        location.reload();
        return;
      }
    }
    const sizeToken = await askPaperSize();
    if (!sizeToken) return;
    const needsScan = (() => {
      const container = document.getElementById("page-container")?.childNodes;
      const unrendered = [];
      for (const node of container ?? []) {
        const inner = node?.childNodes[0]?.childNodes[0];
        if (inner?.className === "page-content" && inner?.childNodes?.length !== 2) {
          unrendered.push(node);
        }
      }
      return unrendered.length === 0;
    })();
    const savedScroll = window.scrollY;
    if (needsScan) {
      const progress = createProgressIndicator(
        document.getElementById("page-container")?.childNodes?.length ?? 0
      );
      try {
        await scanPages(progress);
        progress.setProgress(progress);
      } catch (err) {
        progress.setProgress(progress);
        throw err;
      }
      await scrollTo(savedScroll);
    }
    buildViewer(sizeToken);
  }

  // src/bundle/popup.entry.js
  exportDocument().catch((err) => {
    console.error("[Panther] export failed:", err);
    alert(`Panther export failed: ${err.message}`);
  });
})();
