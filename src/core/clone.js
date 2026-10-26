// Clone the document container for printing in a viewer window.

/** Clone `#page-container-wrapper`, strip ad banners, and un-hide the
 *  page-content children so they render in the print output. */
export function cloneDocument() {
    const source = document.getElementById("page-container-wrapper")?.cloneNode(
        true
    );
    if (!source) {
        throw new Error("Clone document");
    }

    source.style = null;

    // Remove advertisement banner wrappers.
    source.querySelectorAll('[class*="banner-wrapper"]').forEach((el) => {
        el?.remove();
    });

    // Force the page-content children (and their inner content) to display.
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