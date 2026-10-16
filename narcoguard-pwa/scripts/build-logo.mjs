// Builds the NarcoGuard logo and every app icon from the source artwork: adds red "no" symbols over
// the syringe and the bong, then renders the header logo, favicons, Apple touch icons and PWA icons
// (including a padded maskable icon). Idempotent: rerun after changing the source or the symbol positions.
// Usage: node scripts/build-logo.mjs
import sharp from "sharp"

const SOURCE = "public/images/narcoguard-logo-source.jpeg"
const SIZE = 1024
const BACKGROUND = "#0b0f1a"
// Centers and radii in source pixels (1024x1024), measured around each object.
const NO_SYMBOLS = [
  { cx: 192, cy: 442, r: 122 }, // syringe
  { cx: 737, cy: 532, r: 122 }, // bong
]

function noSymbol({ cx, cy, r }) {
  const d = r * Math.SQRT1_2
  const ring = (stroke, width) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${width}"/>` +
    `<line x1="${cx - d}" y1="${cy - d}" x2="${cx + d}" y2="${cy + d}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`
  // A dark halo under the red keeps the symbol readable over hands and hair at small sizes.
  return ring("rgba(0,0,0,0.55)", 34) + ring("#e11d2e", 22)
}

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">${NO_SYMBOLS.map(noSymbol).join("")}</svg>`)
const logo = await sharp(SOURCE).resize(SIZE, SIZE).composite([{ input: overlay }]).png().toBuffer()

const square = (size) => sharp(logo).resize(size, size)
const outputs = [
  ["public/images/narcoguard-logo.png", square(1024).png()],
  ["public/images/narcoguard-icon-256.jpeg", square(256).jpeg({ quality: 88, mozjpeg: true })],
  // Header mark: shown at 44 CSS px, so 96 px covers 2x screens without oversized bytes.
  ["public/images/narcoguard-logo-96.webp", square(96).webp({ quality: 82 })],
  ["public/icon-192.png", square(192).png()],
  ["public/icon-512.png", square(512).png()],
  ["public/apple-touch-icon.png", square(180).png()],
  ["public/apple-icon.png", square(180).png()],
  ["public/icon-dark-32x32.png", square(32).png()],
  ["public/icon-light-32x32.png", square(32).png()],
]
// Maskable icons are cropped to a circle by some launchers; keep the artwork inside the 80% safe zone.
const inner = await sharp(logo).resize(410, 410).png().toBuffer()
outputs.push(["public/icon-maskable-512.png", sharp({ create: { width: 512, height: 512, channels: 4, background: BACKGROUND } }).composite([{ input: inner, gravity: "center" }]).png()])

for (const [path, image] of outputs) {
  await image.toFile(path)
  console.log(`[logo] wrote ${path}`)
}
