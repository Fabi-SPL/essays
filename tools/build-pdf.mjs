// Renders src/*.md to pdf/*.pdf as one continuous page each.
// Usage: node tools/build-pdf.mjs [01 02 ...]   (defaults to all)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'
import puppeteer from 'puppeteer'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const only = process.argv.slice(2)
const files = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.md'))
  .filter(f => !only.length || only.some(p => f.startsWith(p)))

const css = `
  @page { margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { width: 794px; box-sizing: border-box; padding: 56px 64px 64px; color: #1a1a1a;
         font-family: Georgia, 'Times New Roman', serif; font-size: 14.5px; line-height: 1.6; }
  .top { display: flex; justify-content: space-between; font: 600 9.5px 'Segoe UI', sans-serif;
         letter-spacing: .18em; text-transform: uppercase; color: #555; padding-bottom: 14px;
         border-bottom: 1px solid #e3e3e3; margin-bottom: 38px; }
  h1 { font-size: 30px; line-height: 1.2; margin: 0 0 18px; font-weight: 700; }
  .dek { font-size: 17px; line-height: 1.5; margin: 0 0 10px; }
  .dek strong { font-weight: 700; }
  .meta { font: 600 9.5px 'Segoe UI', sans-serif; letter-spacing: .14em; text-transform: uppercase;
          color: #666; margin: 0 0 30px; padding-bottom: 30px; border-bottom: 1px solid #e3e3e3; }
  h2 { font-size: 17px; margin: 34px 0 10px; }
  h3 { font-size: 15px; margin: 26px 0 8px; }
  p { margin: 0 0 14px; }
  code { font: 12.5px Consolas, monospace; background: #f3f3f3; padding: 1px 5px; border-radius: 3px; }
  pre { background: #f6f6f6; padding: 12px 14px; border-radius: 4px; overflow: hidden;
        white-space: pre-wrap; word-break: break-word; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 0 0 14px; padding-left: 14px; border-left: 3px solid #ddd; color: #333; }
  ul, ol { margin: 0 0 14px; padding-left: 26px; }
  li { margin-bottom: 4px; }
  a { color: inherit; }
  hr { display: none; }
  table { border-collapse: collapse; margin: 0 0 16px; font-size: 13px; }
  td, th { border: 1px solid #ddd; padding: 5px 9px; text-align: left; }
  .foot { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e3e3e3;
          font: 10.5px 'Segoe UI', sans-serif; color: #555; line-height: 1.6; }
  .foot b { color: #222; }
`

function split(md) {
  // title, dek (first blockquote), meta (first italic line), body, footer ((c) line after last ---)
  const lines = md.split('\n')
  const title = lines.find(l => l.startsWith('# ')).slice(2).trim()
  const dek = (lines.find(l => l.startsWith('> ')) || '').slice(2).trim()
  const meta = (lines.find(l => /^\*[^*]+\*\s*$/.test(l)) || '').replace(/^\*|\*$/g, '').trim()
  const cut = md.lastIndexOf('\n---')
  const foot = cut > -1 ? md.slice(cut + 4).trim() : ''
  let body = cut > -1 ? md.slice(0, cut) : md
  body = body.split('\n').filter(l => l !== `# ${title}` && l !== `> ${dek}` && l.trim() !== `*${meta}*`).join('\n')
  return { title, dek, meta, body, foot }
}

const browser = await puppeteer.launch({ headless: true })
try {
  for (const f of files) {
    const { title, dek, meta, body, foot } = split(fs.readFileSync(path.join(root, 'src', f), 'utf8'))
    const dekHtml = dek.replace(/^(.*?[.!?])(?=\s|$)/, '<strong>$1</strong>')
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
      <div class="top"><span>Fabi-SPL</span><span>Essays</span></div>
      <h1>${marked.parseInline(title)}</h1>
      <p class="dek">${dekHtml}</p>
      <p class="meta">${meta}</p>
      ${marked.parse(body)}
      <div class="foot"><b>Fabi-SPL</b> · github.com/Fabi-SPL/essays<br>${marked.parseInline(foot.replace(/^\(c\)/, '©'))}</div>
    </body></html>`
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    const out = path.join(root, 'pdf', f.replace(/\.md$/, '.pdf'))
    await page.pdf({ path: out, width: '794px', height: `${height}px`, printBackground: true, pageRanges: '1' })
    await page.close()
    console.log(`${path.basename(out)}  ${height}px`)
  }
} finally { await browser.close() }
