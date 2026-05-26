import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, "netlify-single");
mkdirSync(outDir, { recursive: true });

let html = readFileSync(join(root, "index.html"), "utf8");
const css = readFileSync(join(root, "src", "styles.css"), "utf8");
let js = readFileSync(join(root, "src", "game.js"), "utf8");

const assets = [
  "beer.png",
  "bomb.png",
  "cat.png",
  "duel-backgrounds.png",
  "duel-beaver.png",
  "duel-ghost.png",
  "duel-mouse.png",
  "duel-reaper.png",
  "duel-red-octopus.png",
  "duel-shieru.png",
  "duel-stage3.png",
  "golden-peach.png",
  "microphone.png",
  "octopus.png",
  "peach.png",
  "player.png",
  "pudding.png",
  "runner-exploder.png",
  "squirrel.png",
  "yakitori.png",
];

const audioAssets = [
  "voice-damage-ite.m4a",
  "voice-damage-moo.m4a",
  "voice-damage-uwa.m4a",
  "voice-death-scream.m4a",
  "voice-duel-kill.m4a",
  "voice-duel-stage3-laugh.m4a",
  "voice-invincible-kill.m4a",
  "voice-item-beer.m4a",
  "voice-item-bomb.m4a",
  "voice-item-mic.m4a",
  "voice-item-peach.m4a",
  "voice-item-pudding.m4a",
  "voice-item-rare.m4a",
  "voice-item-yakitori.m4a",
  "voice-score-bad.m4a",
  "voice-score-good.m4a",
  "voice-score-great.m4a",
  "voice-score-marriage.m4a",
  "voice-score-okay.m4a",
  "voice-score-worse.m4a",
];

for (const name of assets) {
  const bytes = readFileSync(join(root, "assets", name));
  const dataUrl = `data:image/png;base64,${bytes.toString("base64")}`;
  js = js.replaceAll(`assets/${name}`, dataUrl);
}

for (const name of audioAssets) {
  const bytes = readFileSync(join(root, "assets", "audio", name));
  const mime = name.endsWith(".m4a") ? "audio/mp4" : "video/mp4";
  const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;
  js = js.replaceAll(`assets/audio/${name}`, dataUrl);
}

html = html.replace(/<link rel="stylesheet" href="src\/styles\.css" \/>/, `<style>\n${css}\n</style>`);
html = html.replace(/<script src="src\/game\.js"><\/script>/, `<script>\n${js}\n</script>`);

writeFileSync(join(outDir, "index.html"), html, "utf8");
console.log(join(outDir, "index.html"));
