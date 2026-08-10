import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const svg = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");

mkdirSync(new URL("../public/icons/", import.meta.url), { recursive: true });

for (const size of [192, 512]) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  const png = resvg.render().asPng();
  writeFileSync(new URL(`../public/icons/icon-${size}.png`, import.meta.url), png);
}

console.log("Icons generated.");
