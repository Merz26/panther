// Shared utilities for the Panther export pipeline.

/** Resolve when all <img> descendants of `el` have finished loading.
 *  Images that already completed, or that error out, resolve immediately. */
export function waitImages(el, { timeoutMs = 30000 } = {}) {
    const images = Array.from(el.querySelectorAll("img"));
    const promises = images.map((img) =>
        img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
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
    const timeout = new Promise((_, reject) =>
        setTimeout(
            () => reject(new Error("Timed out waiting for images to load")),
            timeoutMs
        )
    );

    return Promise.race([Promise.all([...promises]).then(() => delay), timeout]);
}

/** Wait a single animation frame. */
export function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Create the orange "Scanning: x/y" progress overlay.
 *  Returns an object with setProgress(n). Passing the total removes it. */
export function createProgressIndicator(total) {
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
        zIndex: "9999",
    });
    document.body.appendChild(el);
    return {
        setProgress(n) {
            if (n === total) {
                el.remove();
                return;
            }
            el.textContent = `Scanning: ${n}/${total}`;
        },
    };
}

/** Resolve after `ms` milliseconds, or reject with `error`. */
export function timeout(ms, error) {
    return new Promise((_, reject) => setTimeout(() => reject(error), ms));
}