/* MD5 修改 —— 全部在本地完成
   选文件 → 末尾追加字节 → 重新算 MD5 → 下载 */

const $ = (id) => document.getElementById(id)

const els = {
  drop: $('drop'),
  input: $('file'),
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
  file: null,
  md5: '',
  blob: null,
  url: '',
  busy: false,
  lastAppend: ''
}

/* ── Worker：分块算哈希 ─────────────────────────────────── */
const worker = new Worker('./worker.js')
let seq = 0
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
  const id = ++seq
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

let toastTimer = 0
function toast(message) {
  els.toast.textContent = message
  els.toast.classList.add('is-on')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => els.toast.classList.remove('is-on'), 1800)
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

/* ── 选择文件 ──────────────────────────────────────────── */
function resetResult() {
  els.result.hidden = true
  if (state.url) URL.revokeObjectURL(state.url)
  state.url = ''
  state.blob = null
  state.lastAppend = ''
  els.download.removeAttribute('href')
}

async function loadFile(file) {
  if (!file) return
  resetResult()
  state.file = file
  state.md5 = ''

  els.drop.hidden = true
  els.fileCard.hidden = false
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
  els.generate.disabled = true
  els.result.hidden = true
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
  els.fileCard.hidden = true
  els.drop.hidden = false
  els.input.value = ''
  els.generate.disabled = true
  els.progress.hidden = true
  els.toast.classList.remove('is-on')
}

/* ── 生成新文件 ────────────────────────────────────────── */
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

function buildSuffix() {
  if (currentMode() === 'text') {
    const text = els.text.value
    if (!text.trim()) {
      toast('先写一点要追加的文字')
      els.text.focus()
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

function downloadName() {
  if (!state.file) return 'file'
  if (!els.suffix.checked) return state.file.name
  const name = state.file.name
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return `${name}_md5`
  return `${name.slice(0, dot)}_md5${name.slice(dot)}`
}

async function generate() {
  if (!state.file || state.busy || !state.md5) return
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
    state.url = URL.createObjectURL(blob)

    els.newMd5.textContent = res.md5
    els.oldMd5.textContent = state.md5
    els.delta.textContent = `${state.lastAppend} · 文件 ${fmtSize(blob.size)}`
    els.download.href = state.url
    els.download.download = downloadName()
    els.result.hidden = false
    els.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } catch (error) {
    toast(error.message)
  } finally {
    state.busy = false
    els.generate.disabled = false
    els.reroll.disabled = false
    hideProgress()
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
els.input.addEventListener('change', () => loadFile(els.input.files?.[0]))

let dragDepth = 0
window.addEventListener('dragenter', (event) => {
  event.preventDefault()
  dragDepth++
  if (!els.drop.hidden) els.drop.classList.add('is-over')
})
window.addEventListener('dragover', (event) => {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
})
window.addEventListener('dragleave', (event) => {
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) els.drop.classList.remove('is-over')
})
window.addEventListener('drop', (event) => {
  event.preventDefault()
  dragDepth = 0
  els.drop.classList.remove('is-over')
  const files = event.dataTransfer?.files
  if (!files || !files.length) return
  if (files.length > 1) toast('一次处理一个文件，先用了第一个')
  loadFile(files[0])
})

els.reset.addEventListener('click', resetAll)
els.copyMd5.addEventListener('click', () => copyText(state.md5, 'MD5 已复制'))
els.copyNew.addEventListener('click', () => copyText(els.newMd5.textContent, '新 MD5 已复制'))
els.generate.addEventListener('click', generate)
els.reroll.addEventListener('click', generate)

els.bytes.addEventListener('input', syncChips)
els.bytes.addEventListener('blur', clampBytes)
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    els.bytes.value = chip.dataset.bytes
    syncChips()
  })
})

els.opts.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const mode = currentMode()
    els.fieldRandom.hidden = mode !== 'random'
    els.fieldText.hidden = mode !== 'text'
    if (mode === 'text') els.text.focus()
  })
})

els.text.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    generate()
  }
})

els.suffix.addEventListener('change', () => {
  if (els.download.href && state.file) els.download.download = downloadName()
})

els.theme.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
  applyTheme(next, true)
})

initTheme()
syncChips()
