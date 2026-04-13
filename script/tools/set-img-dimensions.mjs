import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

const dimsByBasename = {
  "Logo.svg": [57, 28],
  "apple_icon.svg": [18, 18],
  "googlePlay_icon.svg": [12, 13],
  "appStore_download.svg": [108, 108],
  "googlePlay_download.svg": [108, 108],
  "full-body-img.svg": [296, 403],
  "full-body-img.png": [296, 403],
  "table-img.svg": [275, 280],
  "result-img.png": [276, 203],
  "graf-result-img.svg": [218, 170],
  "hearth-Icon.svg": [17, 17],
  "easy-icon.svg": [11, 11],
  "book-Icon.svg": [17, 17],
  "nrm-icon.svg": [11, 11],
  "medal-icon.svg": [45, 53],
  "remember-Icon.svg": [14, 14],
  "mail-icon.svg": [18, 18],
  "tg-icon.svg": [18, 18],
  "message-icon.svg": [20, 20],
};

function dimsForSrc(src) {
  const base = path.basename(src.split("?")[0]);
  if (dimsByBasename[base]) return dimsByBasename[base];
  const lower = src.replace(/\\/g, "/").toLowerCase();
  if (lower.includes("/cl/") && lower.endsWith("hero_left_iphone.png")) return [535, 659];
  if (lower.includes("/cl/") && lower.endsWith("hero_right_iphone.png")) return [488, 620];
  if (lower.includes("/ch/") && lower.endsWith("hero_left_iphone.png")) return [537, 659];
  if (lower.includes("/ch/") && lower.endsWith("hero_right_iphone.png")) return [490, 620];
  if (/\/slider\/sl-/.test(lower) && lower.endsWith(".png")) return [280, 570];
  return null;
}

function patchHtml(html) {
  return html.replace(/<img(\s[^>]*?)(\s*\/?>)/gi, (full, attrs, closing) => {
    if (/\swidth\s*=/.test(attrs)) return full;
    const m = attrs.match(/\ssrc\s*=\s*["']([^"']+)["']/i);
    if (!m) return full;
    const dims = dimsForSrc(m[1]);
    if (!dims) return full;
    const [w, h] = dims;
    return `<img${attrs} width="${w}" height="${h}"${closing}`;
  });
}

const targets = [
  "client/index.html",
  "coach/index.html",
  "support/index.html",
  "privacy-policy/index.html",
  "terms-and-conditions/index.html",
  "index.html",
];

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, "utf8");
  const after = patchHtml(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log("updated", rel);
  }
}
