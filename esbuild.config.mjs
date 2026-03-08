import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");

// Build the plugin sandbox code
async function buildCode() {
  const ctx = await esbuild.context({
    entryPoints: [resolve(__dirname, "src/code.ts")],
    bundle: true,
    outfile: resolve(__dirname, "dist/code.js"),
    format: "iife",
    target: "es2020",
    logLevel: "info",
  });

  if (isWatch) {
    await ctx.watch();
    console.log("Watching code.ts...");
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

// Build UI: compile ui.ts then inline into ui.html template
async function buildUI() {
  // First, bundle ui.ts to a JS string
  const uiResult = await esbuild.build({
    entryPoints: [resolve(__dirname, "src/ui.ts")],
    bundle: true,
    write: false,
    format: "iife",
    target: "es2020",
    logLevel: "info",
  });

  const jsCode = uiResult.outputFiles[0].text;

  // Read the HTML template
  const htmlTemplate = readFileSync(
    resolve(__dirname, "src/ui.html"),
    "utf-8"
  );

  // Inject the compiled JS into the HTML
  const finalHtml = htmlTemplate.replace(
    "<!--SCRIPT-->",
    `<script>\n${jsCode}\n</script>`
  );

  mkdirSync(resolve(__dirname, "dist"), { recursive: true });
  writeFileSync(resolve(__dirname, "dist/ui.html"), finalHtml);
  console.log("Built dist/ui.html");
}

async function main() {
  mkdirSync(resolve(__dirname, "dist"), { recursive: true });

  if (isWatch) {
    // For watch mode, rebuild UI on changes too
    const ctx = await esbuild.context({
      entryPoints: [resolve(__dirname, "src/ui.ts")],
      bundle: true,
      write: false,
      format: "iife",
      target: "es2020",
      plugins: [
        {
          name: "html-inline",
          setup(build) {
            build.onEnd((result) => {
              if (result.errors.length > 0) return;
              try {
                const jsCode = result.outputFiles?.[0]?.text || "";
                const htmlTemplate = readFileSync(
                  resolve(__dirname, "src/ui.html"),
                  "utf-8"
                );
                const finalHtml = htmlTemplate.replace(
                  "<!--SCRIPT-->",
                  `<script>\n${jsCode}\n</script>`
                );
                writeFileSync(resolve(__dirname, "dist/ui.html"), finalHtml);
                console.log("Rebuilt dist/ui.html");
              } catch (e) {
                console.error("HTML inline error:", e);
              }
            });
          },
        },
      ],
    });
    await ctx.watch();
    console.log("Watching ui.ts...");
    await buildCode();
  } else {
    await Promise.all([buildCode(), buildUI()]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
