/* MD5 修改 —— 全部在本地完成
   单文件：选文件 → 末尾追加字节 → 重新算 MD5 → 下载
   多文件：批量算、批量改、打包成 zip 一次拿走 */

const $ = (id) => document.getElementById(id)

const els = {
  drop: $('drop'),
  input: $('file'),
  drape: $('drape'),

  fileCard: $('fileCard'),
  fileIcon: $('fileIcon'),
  fileName: $('fileName'),
  fileSize: $('fileSize'),
  fileKind: $('fileKind'),
  reset: $('reset'),
  md5: $('md5'),
  copyMd5: $('copyMd5'),
  shaRow: $('shaRow'),
  sha1: $('sha1'),
  sha256: $('sha256'),
  shaNote: $('shaNote'),
  expect: $('expect'),
  verifyState: $('verifyState'),

  batch: $('batch'),
  batchList: $('batchList'),
  batchCount: $('batchCount'),
  batchSum: $('batchSum'),
  batchAdd: $('batchAdd'),
  batchClear: $('batchClear'),
  batchRun: $('batchRun'),
  batchDownload: $('batchDownload'),
  batchStat: $('batchStat'),

  progress: $('progress'),
  bar: $('bar'),
  progressText: $('progressText'),

  opts: $('opts'),
  fieldRandom: $('fieldRandom'),
  fieldText: $('fieldText'),
  bytes: $('bytes'),
  text: $('text'),
  suffix: $('suffix'),
  generate: $('generate'),

  result: $('result'),
  newMd5: $('newMd5'),
  oldMd5: $('oldMd5'),
  delta: $('delta'),
  download: $('download'),
  reroll: $('reroll'),
  copyNew: $('copyNew'),

  toast: $('toast'),
  theme: $('theme')
}

const state = {
  view: 'idle', // idle | single | batch
  file: null,
  md5: '',
  blob: null,
  url: '',
  newMd5: '',
  busy: false,
  lastAppend: '',
  items: [], // 批量：{ id, file, md5, newMd5, blob, url, status, error }
  seq: 0
}

/* ── Worker：分块算哈希 ─────────────────────────────────── */
const worker = new Worker('./worker.js')
let jobSeq = 0
const jobs = new Map()

worker.onmessage = (event) => {
  const msg = event.data
  const job = jobs.get(msg.id)
  if (!job) return
  if (msg.type === 'progress') {
    job.onProgress?.(msg.loaded, msg.total)
  } else if (msg.type === 'done') {
    jobs.delete(msg.id)
    job.resolve(msg)
  } else if (msg.type === 'error') {
    jobs.delete(msg.id)
    job.reject(new Error(msg.message || '读取失败'))
  }
}

function hashFile(file, { withSha = true, onProgress } = {}) {
  const id = ++jobSeq
  return new Promise((resolve, reject) => {
    jobs.set(id, { resolve, reject, onProgress })
    worker.postMessage({ id, file, withSha })
  })
}

/* ── 小工具 ────────────────────────────────────────────── */
function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}`
}

function kindOf(file) {
  const dot = file.name.lastIndexOf('.')
  if (dot > 0 && dot < file.name.length - 1) return file.name.slice(dot + 1).toUpperCase().slice(0, 5)
  if (file.type) return file.type.split('/')[1]?.toUpperCase().slice(0, 5) || 'FILE'
  return 'FILE'
}

function hueOf(text) {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

/** 哈希值统一成小写十六进制；md5sum 那种「哈希 + 文件名」也能认出来 */
function pickHash(text, length) {
  const lower = String(text).toLowerCase()
  // 先按非十六进制字符切段：一段刚好这么长就是它
  for (const token of lower.split(/[^0-9a-f]+/)) {
    if (token.length === length) return token
  }
  // 再兼容被空格或换行劈开的哈希，顺手剥掉算法名
  const joined = lower
    .replace(/\b(md5|sha-?1|sha-?256|sha-?384|sha-?512)\b/g, '')
    .replace(/[\s:_-]+/g, '')
  const found = joined.match(new RegExp(`[0-9a-f]{${length}}`))
  return found ? found[0] : ''
}

let toastTimer = 0
function toast(message) {
  els.toast.textContent = message
  els.toast.classList.add('is-on')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => els.toast.classList.remove('is-on'), 1900)
}

async function copyText(text, okMessage) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    toast(okMessage)
  } catch (error) {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    try {
      document.execCommand('copy')
      toast(okMessage)
    } catch (e) {
      toast('复制失败，请手动选中')
    }
    area.remove()
  }
}

/* ── 进度 ──────────────────────────────────────────────── */
function showProgress(label) {
  els.progress.hidden = false
  els.progressText.textContent = label
  els.bar.style.width = '0%'
}
function setProgress(loaded, total) {
  const percent = total > 0 ? Math.min(100, (loaded / total) * 100) : 100
  els.bar.style.width = `${percent.toFixed(1)}%`
  els.progressText.textContent = `读取 ${percent.toFixed(0)}% · ${fmtSize(loaded)}`
}
function progressLabel(text) {
  els.progressText.textContent = text
}
function hideProgress() {
  els.bar.style.width = '100%'
  setTimeout(() => {
    els.progress.hidden = true
  }, 240)
}

/* ── 主题 ──────────────────────────────────────────────── */
const themeMeta = document.querySelector('meta[name="theme-color"]')

function applyTheme(theme, persist) {
  document.documentElement.dataset.theme = theme
  els.theme.setAttribute('aria-pressed', String(theme === 'light'))
  els.theme.setAttribute('aria-label', `切换到${theme === 'light' ? '深色' : '浅色'}主题`)
  if (themeMeta) themeMeta.setAttribute('content', theme === 'light' ? '#f4f1ea' : '#08080c')
  if (persist) {
    try {
      localStorage.setItem('md5-theme', theme)
    } catch (error) {
      /* 隐私模式下忽略 */
    }
  }
}

function initTheme() {
  let saved = ''
  try {
    saved = localStorage.getItem('md5-theme') || ''
  } catch (error) {
    saved = ''
  }
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
  applyTheme(saved || (prefersLight ? 'light' : 'dark'), false)
}

/* ── 记住上次的设置 ────────────────────────────────────── */
function savePrefs() {
  try {
    localStorage.setItem(
      'md5-prefs',
      JSON.stringify({ mode: currentMode(), bytes: els.bytes.value, suffix: els.suffix.checked })
    )
  } catch (error) {
    /* 忽略 */
  }
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem('md5-prefs')
    if (!raw) return
    const prefs = JSON.parse(raw)
    if (prefs.bytes) els.bytes.value = String(prefs.bytes)
    if (typeof prefs.suffix === 'boolean') els.suffix.checked = prefs.suffix
    const radio = els.opts.querySelector(`input[name="mode"][value="${prefs.mode}"]`)
    if (radio) {
      radio.checked = true
      els.fieldRandom.hidden = prefs.mode !== 'random'
      els.fieldText.hidden = prefs.mode !== 'text'
    }
  } catch (error) {
    /* 忽略 */
  }
}

/* ── 视图切换 ──────────────────────────────────────────── */
function showIdle() {
  state.view = 'idle'
  els.drop.hidden = false
  els.fileCard.hidden = true
  els.batch.hidden = true
  els.result.hidden = true
  els.opts.hidden = true
  els.generate.hidden = false
  els.generate.disabled = true
  els.progress.hidden = true
}

function showSingle() {
  state.view = 'single'
  els.drop.hidden = true
  els.batch.hidden = true
  els.fileCard.hidden = false
  els.opts.hidden = false
  els.generate.hidden = false
}

function showBatch() {
  state.view = 'batch'
  els.drop.hidden = true
  els.fileCard.hidden = true
  els.batch.hidden = false
  els.opts.hidden = false
  els.result.hidden = true
  els.generate.hidden = true
}

/* ── 单文件 ────────────────────────────────────────────── */
function resetResult() {
  els.result.hidden = true
  if (state.url) URL.revokeObjectURL(state.url)
  state.url = ''
  state.blob = null
  state.newMd5 = ''
  state.lastAppend = ''
  els.download.removeAttribute('href')
}

async function openSingle(file) {
  if (!file) return
  resetResult()
  clearBatch(false)
  showSingle()

  state.file = file
  state.md5 = ''

  els.fileName.textContent = file.name
  els.fileName.title = file.name
  els.fileSize.textContent = fmtSize(file.size)
  els.fileKind.textContent = kindOf(file)
  els.fileIcon.textContent = kindOf(file)
  els.fileIcon.style.setProperty('--icon-hue', hueOf(file.name))
  els.md5.textContent = '正在读取…'
  els.copyMd5.hidden = true
  els.shaRow.hidden = true
  els.shaNote.hidden = true
  els.expect.value = ''
  els.verifyState.className = 'verify__state'
  els.generate.disabled = true
  showProgress('读取中…')

  try {
    const res = await hashFile(file, { withSha: true, onProgress: setProgress })
    state.md5 = res.md5
    els.md5.textContent = res.md5
    els.copyMd5.hidden = false

    if (res.sha1) {
      els.sha1.textContent = res.sha1
      els.sha256.textContent = res.sha256
      els.shaRow.hidden = false
    } else {
      els.shaNote.hidden = false
    }
    els.generate.disabled = false
    renderVerify()
  } catch (error) {
    els.md5.textContent = '读取失败'
    toast(error.message)
  } finally {
    hideProgress()
  }
}

function resetAll() {
  state.file = null
  state.md5 = ''
  resetResult()
  els.input.value = ''
  showIdle()
}

/* ── 校验：粘贴哈希即时比对 ────────────────────────────── */
function renderVerify() {
  const raw = els.expect.value.trim()
  const box = els.verifyState
  box.className = 'verify__state'

  if (!raw) return
  if (!state.md5) {
    box.textContent = '等文件的 MD5 算完再比'
    box.classList.add('is-on')
    return
  }

  const md5 = pickHash(raw, 32)
  const sha1 = pickHash(raw, 40)
  const sha256 = pickHash(raw, 64)

  if (!md5 && !sha1 && !sha256) {
    box.textContent = '看着不像一段哈希，再检查一下'
    box.classList.add('is-on', 'is-bad')
    return
  }

  // 先看是不是改后的 MD5 —— 用户常拿新值来核对下载对不对
  if (state.newMd5 && md5 === state.newMd5) {
    box.textContent = '和新文件的 MD5 一致，下载没问题'
    box.classList.add('is-on', 'is-new')
    return
  }

  if (md5) {
    if (md5 === state.md5) {
      box.textContent = '和原文件一致'
      box.classList.add('is-on', 'is-ok')
    } else {
      box.textContent = '和原文件不一致'
      box.classList.add('is-on', 'is-bad')
    }
    return
  }

  // SHA-1 / SHA-256 需要算过才有得比
  const known = sha1 ? els.sha1.textContent : els.sha256.textContent
  const target = sha1 || sha256
  if (!known) {
    box.textContent = '这个大文件没算 SHA，只比 MD5 就好'
    box.classList.add('is-on', 'is-bad')
    return
  }
  if (target === known) {
    box.textContent = `和原文件的 ${sha1 ? 'SHA-1' : 'SHA-256'} 一致`
    box.classList.add('is-on', 'is-ok')
  } else {
    box.textContent = `和原文件的 ${sha1 ? 'SHA-1' : 'SHA-256'} 不一致`
    box.classList.add('is-on', 'is-bad')
  }
}

/* ── 追加设置 ──────────────────────────────────────────── */
function currentMode() {
  return els.opts.querySelector('input[name="mode"]:checked')?.value || 'random'
}

function clampBytes() {
  let value = Number.parseInt(els.bytes.value, 10)
  if (!Number.isFinite(value)) value = 16
  value = Math.min(65536, Math.max(1, value))
  els.bytes.value = String(value)
  syncChips()
  return value
}

function syncChips() {
  document.querySelectorAll('.chip').forEach((chip) => {
    const on = Number(chip.dataset.bytes) === Number(els.bytes.value)
    chip.classList.toggle('is-active', on)
    chip.setAttribute('aria-pressed', String(on))
  })
}

/** 生成要追加的字节；文本模式下校验非空 */
function buildSuffix(quiet) {
  if (currentMode() === 'text') {
    const text = els.text.value
    if (!text.trim()) {
      if (!quiet) {
        toast('先写一点要追加的文字')
        els.text.focus()
      }
      return null
    }
    const bytes = new TextEncoder().encode(text)
    state.lastAppend = `+ ${text.length > 18 ? text.slice(0, 18) + '…' : text}`
    return bytes
  }

  const size = clampBytes()
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  state.lastAppend = `+ ${size} 字节随机数据`
  return bytes
}

function downloadName(file) {
  const target = file || state.file
  if (!target) return 'file'
  if (!els.suffix.checked) return target.name
  const name = target.name
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return `${name}_md5`
  return `${name.slice(0, dot)}_md5${name.slice(dot)}`
}

/* ── 单文件：生成 ──────────────────────────────────────── */
async function generate() {
  if (state.view !== 'single' || !state.file || state.busy || !state.md5) return
  const extra = buildSuffix()
  if (!extra) return

  state.busy = true
  els.generate.disabled = true
  els.reroll.disabled = true
  els.result.hidden = true
  showProgress('重新计算…')

  try {
    const blob = new Blob([state.file, extra], {
      type: state.file.type || 'application/octet-stream'
    })
    const res = await hashFile(blob, { withSha: false, onProgress: setProgress })

    if (res.md5 === state.md5) {
      toast('这次没变，再试一次')
      return
    }

    if (state.url) URL.revokeObjectURL(state.url)
    state.blob = blob
    state.newMd5 = res.md5
    state.url = URL.createObjectURL(blob)

    els.newMd5.textContent = res.md5
    els.oldMd5.textContent = state.md5
    els.delta.textContent = `${state.lastAppend} · 文件 ${fmtSize(blob.size)}`
    els.download.href = state.url
    els.download.download = downloadName()
    els.result.hidden = false
    els.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    renderVerify()
  } catch (error) {
    toast(error.message)
  } finally {
    state.busy = false
    els.generate.disabled = false
    els.reroll.disabled = false
    hideProgress()
  }
}

/* ── 批量：列表 ────────────────────────────────────────── */
function shortHash(hash) {
  if (!hash) return ''
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

function createRow(item) {
  const li = document.createElement('li')
  li.className = 'row'
  li.dataset.id = String(item.id)

  const icon = document.createElement('span')
  icon.className = 'row__icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.textContent = kindOf(item.file)
  icon.style.setProperty('--icon-hue', hueOf(item.file.name))

  const body = document.createElement('div')
  body.className = 'row__body'

  const name = document.createElement('p')
  name.className = 'row__name'
  name.textContent = item.file.name
  name.title = item.file.name

  const hash = document.createElement('p')
  hash.className = 'row__hash'
  hash.title = '点一下复制 MD5'

  const acts = document.createElement('div')
  acts.className = 'row__acts'

  const go = document.createElement('button')
  go.className = 'mini'
  go.type = 'button'
  go.textContent = '改'
  go.addEventListener('click', () => runOne(item))

  const dl = document.createElement('a')
  dl.className = 'mini'
  dl.textContent = '下载'
  dl.download = downloadName(item.file)
  dl.hidden = true

  acts.append(go, dl)
  body.append(name, hash)
  li.append(icon, body, acts)
  li._refs = { hash, go, dl, name }
  hash.addEventListener('click', () => {
    const value = item.newMd5 || item.md5
    if (value) copyText(value, 'MD5 已复制')
  })

  return li
}

function paintRow(item) {
  const li = item.el
  if (!li) return
  const { hash, go, dl } = li._refs

  li.classList.toggle('is-busy', item.status === 'hashing' || item.status === 'working')
  li.classList.toggle('is-failed', item.status === 'error')

  hash.textContent = ''
  hash.title = item.newMd5 ? `${item.md5}\n→ ${item.newMd5}\n点一下复制新 MD5` : `${item.md5 || ''}\n点一下复制`
  if (item.status === 'hashing') {
    hash.textContent = '正在算 MD5…'
  } else if (item.status === 'error') {
    hash.textContent = item.error || '读取失败'
  } else if (item.md5) {
    const old = document.createElement('code')
    old.textContent = item.newMd5 ? shortHash(item.md5) : item.md5
    hash.append(old)
    if (item.newMd5) {
      const arrow = document.createElement('span')
      arrow.className = 'row__arrow'
      arrow.textContent = '→'
      const fresh = document.createElement('code')
      fresh.className = 'is-new'
      fresh.textContent = shortHash(item.newMd5)
      const flow = document.createElement('span')
      flow.className = 'row__flow'
      flow.append(arrow, fresh)
      hash.append(flow)
    }
  }

  go.textContent = item.newMd5 ? '重改' : '改'
  go.disabled = !item.md5 || item.status === 'hashing' || item.status === 'working'
  dl.hidden = !item.url
  if (item.url) {
    dl.href = item.url
    dl.download = downloadName(item.file)
  }
}

function refreshBatchMeta() {
  const items = state.items
  const total = items.reduce((sum, item) => sum + item.file.size, 0)
  els.batchCount.textContent = String(items.length)
  els.batchSum.textContent = `· 共 ${fmtSize(total)}`

  const ready = items.filter((item) => item.md5).length
  const done = items.filter((item) => item.newMd5).length
  els.batchRun.disabled = ready === 0 || state.busy || done === items.length
  els.batchDownload.disabled = done === 0 || state.busy

  if (state.busy) return
  els.batchStat.textContent = done
    ? `${done} / ${items.length} 已改好`
    : ready
      ? `${ready} / ${items.length} 已就绪`
      : ''
}

function addFiles(files) {
  const list = Array.from(files).filter(Boolean)
  if (!list.length) return

  if (state.view === 'single') resetAll()
  if (state.view !== 'batch') {
    state.items = []
    els.batchList.textContent = ''
    showBatch()
  }

  for (const file of list) {
    const item = {
      id: ++state.seq,
      file,
      md5: '',
      newMd5: '',
      blob: null,
      url: '',
      status: 'ready',
      error: ''
    }
    const el = createRow(item)
    item.el = el
    state.items.push(item)
    els.batchList.append(el)
    paintRow(item)
  }

  refreshBatchMeta()
  hashQueue()
}

/** 串行算 MD5，避免几十个文件同时抢 IO */
let queueRunning = false
async function hashQueue() {
  if (queueRunning) return
  queueRunning = true
  const total = state.items.length
  let index = 0

  try {
    for (const item of state.items) {
      index++
      if (item.md5 || item.status === 'error') continue
      item.status = 'hashing'
      paintRow(item)
      if (!els.progress.hidden) {
        progressLabel(`正在算 ${index} / ${total}`)
      } else {
        showProgress(`正在算 ${index} / ${total}`)
      }
      els.bar.style.width = `${((index - 1) / total) * 100}%`
      try {
        const res = await hashFile(item.file, { withSha: false })
        item.md5 = res.md5
        item.status = 'ready'
      } catch (error) {
        item.status = 'error'
        item.error = error.message
      }
      paintRow(item)
      refreshBatchMeta()
      els.bar.style.width = `${(index / total) * 100}%`
    }
  } finally {
    queueRunning = false
    hideProgress()
    refreshBatchMeta()
  }
}

function clearBatch(keepView = true) {
  for (const item of state.items) {
    if (item.url) URL.revokeObjectURL(item.url)
  }
  state.items = []
  els.batchList.textContent = ''
  if (!keepView) {
    els.batch.hidden = true
  }
  refreshBatchMeta()
}

/* ── 批量：改一个是改，改全部也是改 ────────────────────── */
async function runOne(item) {
  if (state.busy || !item.md5) return
  const extra = buildSuffix()
  if (!extra) return

  item.status = 'working'
  paintRow(item)

  try {
    const blob = new Blob([item.file, extra], {
      type: item.file.type || 'application/octet-stream'
    })
    const res = await hashFile(blob, { withSha: false })
    if (item.url) URL.revokeObjectURL(item.url)
    item.blob = blob
    item.newMd5 = res.md5
    item.url = URL.createObjectURL(blob)
    item.status = 'done'
  } catch (error) {
    item.status = 'error'
    item.error = error.message
    toast(error.message)
  }

  paintRow(item)
  refreshBatchMeta()
}

async function runAll() {
  if (state.busy) return
  const pending = state.items.filter((item) => item.md5 && !item.newMd5)
  if (!pending.length) {
    toast('都已经改过了')
    return
  }
  if (currentMode() === 'text' && !els.text.value.trim()) {
    toast('先写一点要追加的文字')
    els.text.focus()
    return
  }

  state.busy = true
  refreshBatchMeta()
  showProgress('批量处理…')

  try {
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i]
      const extra = buildSuffix(true)
      if (!extra) break

      item.status = 'working'
      paintRow(item)
      progressLabel(`${i + 1} / ${pending.length} · ${item.file.name.slice(0, 22)}`)
      els.bar.style.width = `${((i + 0.5) / pending.length) * 100}%`

      try {
        const blob = new Blob([item.file, extra], {
          type: item.file.type || 'application/octet-stream'
        })
        const res = await hashFile(blob, { withSha: false })
        if (item.url) URL.revokeObjectURL(item.url)
        item.blob = blob
        item.newMd5 = res.md5
        item.url = URL.createObjectURL(blob)
        item.status = 'done'
      } catch (error) {
        item.status = 'error'
        item.error = error.message
      }
      paintRow(item)
      els.bar.style.width = `${((i + 1) / pending.length) * 100}%`
    }
  } finally {
    state.busy = false
    hideProgress()
    refreshBatchMeta()
    if (els.batchDownload.disabled === false) toast('都改好了，可以打包下载')
  }
}

/* ── 批量：打包成 zip（store 模式，不压缩） ────────────── */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const DOS_TIME = 0
const DOS_DATE = 0x21 // 1980-01-01，最保险的一个固定时间戳

async function buildZip(entries) {
  const encoder = new TextEncoder()
  const parts = []
  const central = []
  let offset = 0

  for (const entry of entries) {
    const data = new Uint8Array(await entry.blob.arrayBuffer())
    const name = encoder.encode(entry.name)
    const crc = crc32(data)

    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // 文件名按 UTF-8 解释
    lv.setUint16(8, 0, true) // 0 = 只存储
    lv.setUint16(10, DOS_TIME, true)
    lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)

    parts.push(local, data)

    const dir = new Uint8Array(46 + name.length)
    const cv = new DataView(dir.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, DOS_TIME, true)
    cv.setUint16(14, DOS_DATE, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    dir.set(name, 46)
    central.push(dir)

    offset += local.length + data.length
  }

  const dirSize = central.reduce((sum, dir) => sum + dir.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, dirSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  return new Blob([...parts, ...central, end], { type: 'application/zip' })
}

/** 批量文件名去重：撞名就加 (2)、(3) */
function uniqueName(name, used) {
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let n = 2
  let candidate = `${base} (${n})${ext}`
  while (used.has(candidate)) {
    n++
    candidate = `${base} (${n})${ext}`
  }
  used.add(candidate)
  return candidate
}

async function downloadZip() {
  const done = state.items.filter((item) => item.blob)
  if (!done.length || state.busy) return

  const total = done.reduce((sum, item) => sum + item.blob.size, 0)
  if (total > 2 * 1024 * 1024 * 1024) {
    toast('加起来超过 2GB，建议一个个点下载')
    return
  }

  state.busy = true
  refreshBatchMeta()
  showProgress('打包中…')
  els.bar.style.width = '10%'

  try {
    const used = new Set()
    const entries = done.map((item) => ({
      name: uniqueName(downloadName(item.file), used),
      blob: item.blob
    }))
    els.bar.style.width = '55%'
    const zip = await buildZip(entries)
    els.bar.style.width = '100%'

    const url = URL.createObjectURL(zip)
    const link = document.createElement('a')
    link.href = url
    link.download = `md5-${entries.length}个文件.zip`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    toast('打包好了，检查一下下载')
  } catch (error) {
    toast(error.message || '打包失败')
  } finally {
    state.busy = false
    hideProgress()
    refreshBatchMeta()
  }
}

/* ── 收文件 ────────────────────────────────────────────── */
function acceptFiles(files) {
  const list = Array.from(files || []).filter((file) => file && file.size >= 0)
  if (!list.length) return
  // 已经在批量里，再给什么都往列表里加
  if (state.view === 'batch') {
    addFiles(list)
    return
  }
  if (list.length === 1) {
    openSingle(list[0])
  } else {
    addFiles(list)
    toast(`收到 ${list.length} 个文件，走批量`)
  }
}

/* ── 事件绑定 ──────────────────────────────────────────── */
els.drop.addEventListener('click', () => els.input.click())
els.drop.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    els.input.click()
  }
})
els.input.addEventListener('change', () => {
  const files = els.input.files
  acceptFiles(files)
  els.input.value = ''
})

els.batchAdd.addEventListener('click', () => els.input.click())
els.batchClear.addEventListener('click', () => {
  clearBatch(false)
  resetAll()
  toast('清空了')
})
els.batchRun.addEventListener('click', runAll)
els.batchDownload.addEventListener('click', downloadZip)

/* 整页拖放 */
let dragDepth = 0
function showDrape(on) {
  els.drape.classList.toggle('is-on', on)
}
window.addEventListener('dragenter', (event) => {
  if (!event.dataTransfer?.types?.includes('Files')) return
  event.preventDefault()
  dragDepth++
  showDrape(true)
})
window.addEventListener('dragover', (event) => {
  if (!event.dataTransfer?.types?.includes('Files')) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
})
window.addEventListener('dragleave', (event) => {
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) showDrape(false)
})
window.addEventListener('drop', (event) => {
  event.preventDefault()
  dragDepth = 0
  showDrape(false)
  acceptFiles(event.dataTransfer?.files)
})

/* 直接从剪贴板粘贴文件（截图、复制的文件） */
window.addEventListener('paste', (event) => {
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  const files = Array.from(event.clipboardData?.files || [])
  if (!files.length) return
  event.preventDefault()
  acceptFiles(files)
})

els.reset.addEventListener('click', resetAll)
els.copyMd5.addEventListener('click', () => copyText(state.md5, 'MD5 已复制'))
els.copyNew.addEventListener('click', () => copyText(els.newMd5.textContent, '新 MD5 已复制'))
els.generate.addEventListener('click', generate)
els.reroll.addEventListener('click', generate)

els.expect.addEventListener('input', renderVerify)

els.bytes.addEventListener('input', syncChips)
els.bytes.addEventListener('change', savePrefs)
els.bytes.addEventListener('blur', () => {
  clampBytes()
  savePrefs()
})
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    els.bytes.value = chip.dataset.bytes
    syncChips()
    savePrefs()
  })
})

els.opts.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const mode = currentMode()
    els.fieldRandom.hidden = mode !== 'random'
    els.fieldText.hidden = mode !== 'text'
    if (mode === 'text') els.text.focus()
    savePrefs()
  })
})

els.text.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (state.view === 'batch') runAll()
    else generate()
  }
})

els.suffix.addEventListener('change', () => {
  savePrefs()
  if (els.download.href && state.file) els.download.download = downloadName()
  for (const item of state.items) {
    if (item.url) item.el._refs.dl.download = downloadName(item.file)
  }
})

els.download.addEventListener('click', () => toast('已开始下载'))

els.theme.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
  applyTheme(next, true)
})

/* Esc 退回选择；⌘/Ctrl + Enter 生成 */
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.view === 'single' && !state.busy) {
    resetAll()
    toast('已退回到选择文件')
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    if (state.view === 'batch') runAll()
    else generate()
  }
})

initTheme()
loadPrefs()
syncChips()
showIdle()
