// Regenerates Prepify's brand assets — the favicon/PWA icon set and the social
// link-preview (OG) card — from code, in the brand font (Montserrat).
//
//   npm run gen:brand
//
// Fonts: scripts/fonts/Montserrat-{Bold,SemiBold}.ttf (SIL OFL, see OFL.txt).
// Requires the @resvg/resvg-js devDependency.
//
// Outputs (all under public/):
//   favicon.ico, favicon-16x16.png, favicon-32x32.png,
//   apple-touch-icon.png, logo192.png, logo512.png, maskable-512.png,
//   images/og-card.png
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { inflateSync } from 'zlib'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const fontFiles = [
  join(here, 'fonts', 'Montserrat-Bold.ttf'),
  join(here, 'fonts', 'Montserrat-SemiBold.ttf'),
]
const out = p => join(root, 'public', p)

// Brand tokens (kept in sync with src/helpers.scss).
const ORANGE_LIGHT = '#ff7a45'
const ORANGE = '#ff5722'
const FONT = 'Montserrat'

const renderPng = (svg, size) =>
  new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT },
  })
    .render()
    .asPng()

// ---------------------------------------------------------------------------
// Icon: white "P" monogram on the brand-orange gradient.
//   rounded → rounded-square (favicons / "any" PWA icons)
//   pad     → scales the P down for maskable icons (OS applies its own crop)
// ---------------------------------------------------------------------------
const iconSvg = ({ rounded = true, pad = 1 } = {}) => {
  const rx = rounded ? 112 : 0
  const fontSize = 340 * pad
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ORANGE_LIGHT}"/>
      <stop offset="1" stop-color="${ORANGE}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#g)"/>
  <text x="256" y="280" text-anchor="middle" dominant-baseline="central"
        font-family="${FONT}" font-weight="700" font-size="${fontSize}"
        fill="#ffffff" letter-spacing="-6">P</text>
</svg>`
}

// ---------------------------------------------------------------------------
// OG card (1200×630): wordmark + tagline + url chip + plate/cutlery motif.
// ---------------------------------------------------------------------------
const ogCardSvg = () => {
  const W = 1200
  const H = 630
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ORANGE_LIGHT}"/>
      <stop offset="1" stop-color="${ORANGE}"/>
    </linearGradient>
    <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.20"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.07"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="960" cy="315" r="300" fill="url(#plate)"/>
  <circle cx="960" cy="315" r="300" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="3"/>
  <circle cx="960" cy="315" r="218" fill="none" stroke="#ffffff" stroke-opacity="0.30" stroke-width="6" stroke-dasharray="2 22" stroke-linecap="round"/>
  <g stroke="#ffffff" stroke-opacity="0.85" stroke-linecap="round" fill="none" stroke-width="9">
    <line x1="905" y1="225" x2="905" y2="405"/>
    <line x1="888" y1="225" x2="888" y2="270"/><line x1="922" y1="225" x2="922" y2="270"/>
    <path d="M888 270 q17 14 34 0" stroke-width="7"/>
    <path d="M1020 225 q26 8 26 60 q0 30 -26 34 l0 86"/>
  </g>
  <text x="96" y="300" font-family="${FONT}" font-weight="700" font-size="132" fill="#ffffff" letter-spacing="-2">Prepify</text>
  <text x="100" y="372" font-family="${FONT}" font-weight="600" font-size="40" fill="#ffffff" fill-opacity="0.97">Budget-friendly, healthy recipes —</text>
  <text x="100" y="426" font-family="${FONT}" font-weight="600" font-size="40" fill="#ffffff" fill-opacity="0.97">with price &amp; nutrition built in.</text>
  <rect x="100" y="486" width="312" height="62" rx="31" fill="#ffffff" fill-opacity="0.18"/>
  <text x="130" y="527" font-family="${FONT}" font-weight="600" font-size="32" fill="#ffffff">prepifymeals.com</text>
</svg>`
}

// ---------------------------------------------------------------------------
// ICO assembly: decode rendered PNGs and repack as 32-bit BGRA BMP/DIB frames
// (widest browser support). Pure Node — no extra deps.
// ---------------------------------------------------------------------------
const readPng = buf => {
  let pos = 8
  let width = 0
  let height = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    pos += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const rgba = Buffer.alloc(width * height * 4)
  const prev = Buffer.alloc(stride)
  const cur = Buffer.alloc(stride)
  const paeth = (a, b, c) => {
    const p = a + b - c
    const da = Math.abs(p - a)
    const db = Math.abs(p - b)
    const dc = Math.abs(p - c)
    return da <= db && da <= dc ? a : db <= dc ? b : c
  }
  let rp = 0
  for (let y = 0; y < height; y++) {
    const f = raw[rp++]
    for (let x = 0; x < stride; x++) {
      const v = raw[rp++]
      const a = x >= 4 ? cur[x - 4] : 0
      const b = prev[x]
      const c = x >= 4 ? prev[x - 4] : 0
      let val
      if (f === 0) val = v
      else if (f === 1) val = v + a
      else if (f === 2) val = v + b
      else if (f === 3) val = v + ((a + b) >> 1)
      else val = v + paeth(a, b, c)
      cur[x] = val & 0xff
    }
    cur.copy(rgba, y * stride)
    cur.copy(prev)
  }
  return { width, height, rgba }
}

const bmpFrame = ({ width, height, rgba }) => {
  const hdr = Buffer.alloc(40)
  hdr.writeUInt32LE(40, 0)
  hdr.writeInt32LE(width, 4)
  hdr.writeInt32LE(height * 2, 8) // height doubled: XOR mask + AND mask
  hdr.writeUInt16LE(1, 12)
  hdr.writeUInt16LE(32, 14)
  const xor = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4
      const di = ((height - 1 - y) * width + x) * 4 // bottom-up
      xor[di] = rgba[si + 2] // B
      xor[di + 1] = rgba[si + 1] // G
      xor[di + 2] = rgba[si] // R
      xor[di + 3] = rgba[si + 3] // A
    }
  }
  const and = Buffer.alloc(Math.ceil(width / 32) * 4 * height) // all-opaque
  return Buffer.concat([hdr, xor, and])
}

const buildIco = sizes => {
  const svg = iconSvg({ rounded: true })
  const frames = sizes.map(s => bmpFrame(readPng(renderPng(svg, s))))
  const dir = Buffer.alloc(6 + 16 * frames.length)
  dir.writeUInt16LE(0, 0)
  dir.writeUInt16LE(1, 2)
  dir.writeUInt16LE(frames.length, 4)
  let offset = 6 + 16 * frames.length
  frames.forEach((f, i) => {
    const s = sizes[i]
    const e = 6 + i * 16
    dir.writeUInt8(s >= 256 ? 0 : s, e)
    dir.writeUInt8(s >= 256 ? 0 : s, e + 1)
    dir.writeUInt16LE(1, e + 4)
    dir.writeUInt16LE(32, e + 6)
    dir.writeUInt32LE(f.length, e + 8)
    dir.writeUInt32LE(offset, e + 12)
    offset += f.length
  })
  return Buffer.concat([dir, ...frames])
}

// --- Emit ---------------------------------------------------------------
const anySvg = iconSvg({ rounded: true })
const maskSvg = iconSvg({ rounded: false, pad: 0.72 })
const appleSvg = iconSvg({ rounded: false }) // iOS masks the corners itself

mkdirSync(join(root, 'public', 'images'), { recursive: true })
writeFileSync(out('favicon.ico'), buildIco([16, 32, 48]))
writeFileSync(out('favicon-16x16.png'), renderPng(anySvg, 16))
writeFileSync(out('favicon-32x32.png'), renderPng(anySvg, 32))
writeFileSync(out('apple-touch-icon.png'), renderPng(appleSvg, 180))
writeFileSync(out('logo192.png'), renderPng(anySvg, 192))
writeFileSync(out('logo512.png'), renderPng(anySvg, 512))
writeFileSync(out('maskable-512.png'), renderPng(maskSvg, 512))
writeFileSync(out('images/og-card.png'), renderPng(ogCardSvg(), 1200))
console.log('Brand assets regenerated in public/ (Montserrat).')
