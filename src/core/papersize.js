// Paper-size selection helpers.

/** Parse a paper-size token like "A4.210.297" or "letter.215.9.279.4".
 *  Returns { name, width, height } in millimetres, or null if unparseable. */
export function parsePaperSize(token) {
    const parts = token.split(".");
    if (parts.length === 5) {
        return {
            name: parts[0],
            width: Number(`${parts[1]}.${parts[2]}`),
            height: Number(`${parts[3]}.${parts[4]}`),
        };
    }
    if (parts.length === 3) {
        return {
            name: parts[0],
            width: Number(parts[1]),
            height: Number(parts[2]),
        };
    }
    return null;
}

/** Build a <style> element whose @media print rules fit the page container
 *  onto the chosen paper size with zero margins. */
export function computePrintStyle(sizeToken) {
    const container =
        document.getElementById("page-container-wrapper")?.childNodes[0]
            ?.childNodes[1]?.childNodes[0];
    if (!container) return null;

    const size = parsePaperSize(sizeToken);
    if (!size) return null;

    // Millimetres per pixel, measured via a hidden 100mm ruler.
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