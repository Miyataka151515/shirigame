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
  "voice-damage-ite.mp4",
  "voice-damage-moo.mp4",
  "voice-damage-uwa.mp4",
  "voice-death-scream.mp4",
  "voice-duel-kill.mp4",
  "voice-duel-stage3-laugh.mp4",
  "voice-invincible-kill.mp4",
  "voice-item-beer.mp4",
  "voice-item-bomb.mp4",
  "voice-item-mic.mp4",
  "voice-item-peach.mp4",
  "voice-item-pudding.mp4",
  "voice-item-rare.mp4",
  "voice-item-yakitori.mp4",
  "voice-score-bad.mp4",
  "voice-score-good.mp4",
  "voice-score-great.mp4",
  "voice-score-marriage.mp4",
  "voice-score-okay.mp4",
  "voice-score-worse.mp4",
];

for (const name of assets) {
  const bytes = readFileSync(join(root, "assets", name));
  const dataUrl = `data:image/png;base64,${bytes.toString("base64")}`;
  js = js.replaceAll(`assets/${name}`, dataUrl);
}

for (const name of audioAssets) {
  const bytes = readFileSync(join(root, "assets", "audio", name));
  const dataUrl = `data:video/mp4;base64,${bytes.toString("base64")}`;
  js = js.replaceAll(`assets/audio/${name}`, dataUrl);
}

html = html.replace(/<link rel="stylesheet" href="src\/styles\.css" \/>/, `<style>\n${css}\n</style>`);
html = html.replace(/<script src="src\/game\.js"><\/script>/, `<script>\n${js}\n</script>`);

writeFileSync(join(outDir, "index.html"), html, "utf8");
console.log(join(outDir, "index.html"));
