import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.join(here, "..", "..", "dist", "styles.css");

let cachedCss: string | null = null;
function loadCss(): string {
  if (cachedCss !== null) return cachedCss;
  cachedCss = fs.readFileSync(cssPath, "utf8");
  return cachedCss;
}

export function SeoComponentsStyles() {
  const css = loadCss();
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
