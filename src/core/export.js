// Shared export pipeline — used by both the popup-triggered and the
// native-Download-button-triggered entry points.

import { waitImages, nextFrame, createProgressIndicator, timeout } from "./utils.js";
import { computePrintStyle } from "./papersize.js";
import { cloneDocument } from "./clone.js";

const PAPERSIZE_URL = chrome.runtime.getURL("src/assets/modals/papersize.html");

/** Show the paper-size modal iframe; resolves to the chosen token, or null
 *  on cancel. */
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
            transition: "opacity 0.3s ease",
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

/** Scroll each page of `#page-container` into view and wait for its images
 *  to load, so the printout captures every page fully. */
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

/** Smooth-scroll back to the saved scroll position, with a timeout. */
async function scrollTo(y, { timeoutMs = 15000 } = {}) {
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
        timeout(timeoutMs, "Timed out scrolling back to top"),
    ]);
}

/** Clone every matching `doc-assets` stylesheet (works across all Studocu
 *  regional domains, not just .com). */
function cloneStylesheets() {
    const links = document.querySelectorAll(
        'link[rel="stylesheet"][href*="doc-assets"], ' +
            'link[as="style"][href*="doc-assets"]'
    );
    return Array.from(links).map((link) => link.cloneNode(true));
}

/** Build the viewer window containing a clone of the document plus its
 *  stylesheets and print CSS, then inject the viewer script. */
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

/** Main export entry point. Throws on failure. */
export async function exportDocument() {
    // 1. Offer banner removal if any premium banner buttons are present.
    const bannerButtons = Array.from(document.querySelectorAll("button"))
        .filter((btn) =>
            Array.from(btn.classList).some((cls) =>
                cls.startsWith("PremiumBannerButton")
            )
        );
    if (bannerButtons.length === 0) {
        const ok = confirm(
            'Advertisement banners are detected in this document.\n' +
                'Click "OK" to remove them and refresh the page.\n' +
                'Click "Cancel" if you believe all banners have been removed.'
        );
        if (ok) {
            location.reload();
            return;
        }
    }

    // 2. Ask for the paper size.
    const sizeToken = await askPaperSize();
    if (!sizeToken) return;

    // 3. Scan pages (scroll + image load) only when needed.
    const needsScan = (() => {
        const container = document.getElementById("page-container")?.childNodes;
        const unrendered = [];
        for (const node of container ?? []) {
            const inner = node?.childNodes[0]?.childNodes[0];
            if (
                inner?.className === "page-content" &&
                inner?.childNodes?.length !== 2
            ) {
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
            progress.setProgress(progress); // remove overlay
        } catch (err) {
            progress.setProgress(progress);
            throw err;
        }
        await scrollTo(savedScroll);
    }

    // 4. Build and print the viewer.
    buildViewer(sizeToken);
}