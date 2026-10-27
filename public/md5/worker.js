/* 在 Worker 里分块读取文件算哈希，主线程只负责画进度条 */
importScripts('./md5.js')

const CHUNK = 4 * 1024 * 1024
/* SHA 用 SubtleCrypto，一次要吃下整个文件，所以只对小文件算 */
const SHA_LIMIT = 32 * 1024 * 1024

function toHex(buffer) {
  const bytes = new Uint8Array(buffer)
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0')
  return out
}

self.onmessage = async (event) => {
  const { id, file, withSha } = event.data
  try {
    const md5 = new MD5()
    const wantSha = withSha && file.size <= SHA_LIMIT
    const pieces = wantSha ? [] : null
    let loaded = 0

    for (let offset = 0; offset < file.size; offset += CHUNK) {
      const buffer = await file.slice(offset, Math.min(offset + CHUNK, file.size)).arrayBuffer()
      md5.update(new Uint8Array(buffer))
      if (pieces) pieces.push(new Uint8Array(buffer))
      loaded += buffer.byteLength
      if (loaded < file.size) {
        self.postMessage({ type: 'progress', id, loaded, total: file.size })
      }
    }

    let sha1 = ''
    let sha256 = ''
    if (pieces) {
      const all = new Uint8Array(loaded)
      let at = 0
      for (const piece of pieces) {
        all.set(piece, at)
        at += piece.byteLength
      }
      sha1 = toHex(await crypto.subtle.digest('SHA-1', all))
      sha256 = toHex(await crypto.subtle.digest('SHA-256', all))
    }

    self.postMessage({ type: 'done', id, md5: md5.hex(), sha1, sha256, size: file.size })
  } catch (error) {
    self.postMessage({ type: 'error', id, message: String(error && error.message ? error.message : error) })
  }
}
