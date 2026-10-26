// Entry point injected automatically by the background service worker when a
// Studocu page finishes loading. Hijacks the native "Download" button so the
// export runs when the user clicks it.

import { exportDocument } from "../core/export.js";

const SELECTOR = 'button[aria-label="Download"]';
const ROOT = document.getElementById("main-wrapper") || document.body;

const processed = new Set();
let flushScheduled = false;

function scheduleFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    queueMicrotask(flush);
}

function flush() {
    processed.forEach(hook);
    processed.clear();
    flushScheduled = false;
}

function hook(el) {
    if (el.dataset.pantherProcessed) return;
    el.dataset.pantherProcessed = "true";
    el.onclick = null;
    el.addEventListener(
        "click",
        async (event) => {
            event.stopPropagation();
            event.preventDefault();
            event.stopImmediatePropagation();
            try {
                await exportDocument();
            } catch (err) {
                console.error("[Panther] export failed:", err);
                alert(`Panther export failed: ${err.message}`);
            }
        },
        true
    );
}

const observer = new MutationObserver((records) => {
    for (const record of records) {
        for (const node of record.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.matches(SELECTOR)) processed.add(node);
            node.querySelectorAll?.(SELECTOR)?.forEach((el) => processed.add(el));
        }
    }
    if (processed.size) scheduleFlush();
});

observer.observe(ROOT, { childList: true, subtree: true });
window.addEventListener("beforeunload", () => observer.disconnect());
ROOT.querySelectorAll(SELECTOR).forEach((el) => processed.add(el));
scheduleFlush();