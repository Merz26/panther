// Entry point injected by the popup when the user clicks "Download".
// Triggers the export immediately.
import { exportDocument } from "../core/export.js";

exportDocument().catch((err) => {
    console.error("[Panther] export failed:", err);
    alert(`Panther export failed: ${err.message}`);
});