// Injected into the viewer window. Waits for all images in the cloned
// document to finish loading, triggers the print dialog, and closes the
// window once the user dismisses it.

import { waitImages, nextFrame, timeout } from "../core/utils.js";

const CONTAINER = document.getElementById("page-container");
// Safety valve: if the afterprint event never fires (some browsers/VMs don't
// emit it), close the viewer anyway so it can't hang forever.
const AUTO_CLOSE_MS = 60000;

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
            // Don't abort on a single slow image — keep going.
        }
    }
    await nextFrame();

    window.print();

    // Close as soon as the print dialog is dismissed. If afterprint never
    // fires, fall back to a timeout so the viewer can't hang forever.
    Promise.race([
        new Promise((resolve) =>
            window.addEventListener("afterprint", resolve, { once: true })
        ),
        timeout(AUTO_CLOSE_MS, "auto-close"),
    ]).then(closeViewer);
}

run();