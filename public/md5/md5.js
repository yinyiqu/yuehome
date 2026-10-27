/* 增量 MD5：按 64 字节块压缩，适合边读边算大文件。
   只依赖 Uint8Array，浏览器主线程和 Worker 里都能用。 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else root.MD5 = factory()
})(typeof self !== 'undefined' ? self : this, function () {
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ]

  /* K[i] = floor(abs(sin(i + 1)) * 2^32)，写死算一次，避免每次 hash 重算 */
  const K = new Int32Array(64)
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0

  const rotl = (x, c) => (x << c) | (x >>> (32 - c))

  function toHex(n) {
    let out = ''
    for (let i = 0; i < 4; i++) out += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0')
    return out
  }

  class MD5 {
    constructor() {
      this.h = new Int32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476])
      this.block = new Uint8Array(64)
      this.blockLen = 0
      this.length = 0
      this.words = new Int32Array(16)
    }

    update(bytes) {
      const len = bytes.length
      let offset = 0
      this.length += len

      if (this.blockLen) {
        const take = Math.min(64 - this.blockLen, len)
        this.block.set(bytes.subarray(0, take), this.blockLen)
        this.blockLen += take
        offset = take
        if (this.blockLen === 64) {
          this._compress(this.block, 0)
          this.blockLen = 0
        }
      }

      while (offset + 64 <= len) {
        this._compress(bytes, offset)
        offset += 64
      }

      if (offset < len) {
        this.block.set(bytes.subarray(offset), 0)
        this.blockLen = len - offset
      }
      return this
    }

    _compress(bytes, pos) {
      const M = this.words
      for (let i = 0; i < 16; i++, pos += 4) {
        M[i] = bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)
      }

      let a = this.h[0]
      let b = this.h[1]
      let c = this.h[2]
      let d = this.h[3]

      for (let i = 0; i < 64; i++) {
        let f
        let g
        if (i < 16) {
          f = (b & c) | (~b & d)
          g = i
        } else if (i < 32) {
          f = (d & b) | (~d & c)
          g = (5 * i + 1) & 15
        } else if (i < 48) {
          f = b ^ c ^ d
          g = (3 * i + 5) & 15
        } else {
          f = c ^ (b | ~d)
          g = (7 * i) & 15
        }
        const tmp = d
        d = c
        c = b
        b = (b + rotl((a + f + K[i] + M[g]) | 0, S[i])) | 0
        a = tmp
      }

      this.h[0] = (this.h[0] + a) | 0
      this.h[1] = (this.h[1] + b) | 0
      this.h[2] = (this.h[2] + c) | 0
      this.h[3] = (this.h[3] + d) | 0
    }

    /** 收尾：补 0x80、补零到 56 字节、写入 64 位小端位长 */
    hex() {
      const copy = new MD5()
      copy.h = new Int32Array(this.h)
      copy.block.set(this.block)
      copy.blockLen = this.blockLen
      copy.length = this.length

      const bitLen = this.length * 8
      const padLen = this.blockLen < 56 ? 56 - this.blockLen : 120 - this.blockLen
      const tail = new Uint8Array(padLen + 8)
      tail[0] = 0x80

      const lo = bitLen >>> 0
      let hi = Math.floor(bitLen / 4294967296) >>> 0
      for (let i = 0; i < 4; i++) {
        tail[padLen + i] = (lo >>> (i * 8)) & 0xff
        tail[padLen + 4 + i] = (hi >>> (i * 8)) & 0xff
      }
      copy.update(tail)

      return toHex(copy.h[0]) + toHex(copy.h[1]) + toHex(copy.h[2]) + toHex(copy.h[3])
    }
  }

  return MD5
})
