// Build config for the Panther extension bundles.
//
// Produces the three minified bundles referenced by manifest.json:
//   - src/bundle/popup.bundle.js    (injected by the popup)
//   - src/bundle/download.bundle.js  (auto-injected on page load)
//   - src/bundle/viewer.bundle.js    (injected into the viewer window)
//
// All three share the code in src/core/. Run `npm run build`.

const esbuild = require("esbuild");

const base = {
    bundle: true,
    format: "iife",
    target: "chrome110",
    platform: "browser",
    sourcemap: false,
    // Keep the global IIFE anonymous so it self-executes on load.
    globalName: "pantherBundle",
};

const builds = [
    {
        entry: "src/bundle/popup.entry.js",
        outfile: "src/bundle/popup.bundle.js",
    },
    {
        entry: "src/bundle/download.entry.js",
        outfile: "src/bundle/download.bundle.js",
    },
    {
        entry: "src/bundle/viewer.entry.js",
        outfile: "src/bundle/viewer.bundle.js",
    },
];

async function main() {
    await Promise.all(
        builds.map(({ entry, outfile }) =>
            esbuild.build({
                ...base,
                entryPoints: [entry],
                outfile,
            })
        )
    );
    console.log("Built", builds.length, "bundles.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});