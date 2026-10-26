// Injected into the viewer window. Waits for all images in the cloned
// document to finish loading, then triggers the browser print dialog.

import { waitImages, nextFrame } from "../core/utils.js";

const CONTAINER = document.getElementById("page-container");

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
            // Don't abort on a single slow image — keep going.
        }
    }
    await nextFrame();
    window.print();
}

run();