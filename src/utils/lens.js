/**
 * 液态玻璃的「透镜」位移贴图
 * ------------------------------------------------------------
 * 参考 Kyant0/AndroidLiquidGlass 的 lens 参数：
 *   refractionHeight ≈ 边缘带宽（必须 ≤ 圆角半径）
 *   refractionAmount ≈ 折射强度
 *   chromaticAberration ≈ 三通道分开采样
 *
 * 做法：为每张卡生成一张 128 为基准的位移图（R = x 位移，G = y 位移），
 * 用 feImage 喂给 feDisplacementMap。位移量按圆角矩形的 SDF 法线计算，
 * 只在边缘 band 内生效，往内衰减到 0。
 */

const CACHE_MAX = 32
const cache = new Map()

/** 圆角矩形的有符号距离：内部为负，外部为正 */
function sdRoundRect(x, y, w, h, r) {
  const qx = Math.abs(x - w / 2) - (w / 2 - r)
  const qy = Math.abs(y - h / 2) - (h / 2 - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

/** 数值法求 SDF 梯度，就是向外的法线 */
function normalAt(x, y, w, h, r, out) {
  const e = 0.5
  out.x = (sdRoundRect(x + e, y, w, h, r) - sdRoundRect(x - e, y, w, h, r)) / (2 * e)
  out.y = (sdRoundRect(x, y + e, w, h, r) - sdRoundRect(x, y - e, w, h, r)) / (2 * e)
  return out
}

/**
 * @param {object} opt
 * @param {number} opt.width   卡片宽（CSS px）
 * @param {number} opt.height  卡片高（CSS px）
 * @param {number} [opt.radius=22]   圆角
 * @param {number} [opt.pad=34]      玻璃层向外扩出的边距（≥ band）
 * @param {number} [opt.band=26]     折射带宽度
 * @param {number} [opt.strength=13] 边缘最大位移（px）
 * @param {number} [opt.resolution=0.5] 贴图分辨率（相对 CSS px）
 * @returns {{url:string, cssWidth:number, cssHeight:number, width:number, height:number}}
 */
export function buildLensMap({
  width,
  height,
  radius = 22,
  pad = 34,
  band = 26,
  strength = 13,
  resolution = 0.5
}) {
  const cssW = Math.round(width + pad * 2)
  const cssH = Math.round(height + pad * 2)
  const key = `${cssW}x${cssH}:${radius}:${pad}:${band}:${strength}:${resolution}`

  const hit = cache.get(key)
  if (hit) return hit

  const W = Math.max(8, Math.round(cssW * resolution))
  const H = Math.max(8, Math.round(cssH * resolution))
  const scale = W / cssW

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(W, H)
  const data = image.data

  const n = { x: 0, y: 0 }

  for (let py = 0; py < H; py++) {
    // 贴图坐标 → 卡片坐标（左上角为 -pad）
    const y = (py + 0.5) / scale - pad
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / scale - pad
      const i = (py * W + px) * 4

      const sd = sdRoundRect(x, y, width, height, radius)

      let dx = 0
      let dy = 0
      if (sd < 0 && sd > -band) {
        const t = -sd / band // 0 在边缘，1 在带内侧
        const falloff = (1 - t) * (1 - t) * (1 - t * 0.35)
        normalAt(x, y, width, height, radius, n)
        // 法线朝外，采样点也朝外：边缘像被这块玻璃「吸」进来一点
        const m = strength * falloff
        dx = -n.x * m
        dy = -n.y * m
      }

      data[i] = 128 + dx
      data[i + 1] = 128 + dy
      data[i + 2] = 128
      data[i + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)

  const result = {
    url: canvas.toDataURL('image/png'),
    cssWidth: cssW,
    cssHeight: cssH,
    width: W,
    height: H
  }

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value)
  cache.set(key, result)
  return result
}

/** 只用来判断能不能让 backdrop-filter 吃 SVG 滤镜（Chrome / Edge 可以） */
export function supportsRefraction() {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return (
    CSS.supports('backdrop-filter', 'url(#lens)') ||
    CSS.supports('-webkit-backdrop-filter', 'url(#lens)')
  )
}
