<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watchEffect } from 'vue'
import { buildLensMap, supportsRefraction } from '../utils/lens.js'

const props = defineProps({
  app: { type: Object, required: true },
  index: { type: Number, default: 0 },
  // 最后一张整张露出，作为整叠的收尾
  isLast: { type: Boolean, default: false }
})

let seq = 0
const lensId = `lens-${++seq}-${Math.random().toString(36).slice(2, 7)}`

const iconOk = ref(true)
const faceEl = ref(null)
const lensEl = ref(null)
const lensMap = shallowRef(null)

/** 牌心的编号：两位数字，像牌角上的点数 */
const series = computed(() => String(props.index + 1).padStart(2, '0'))

const showIcon = computed(() => Boolean(props.app.icon) && iconOk.value)
const showEmoji = computed(() => !showIcon.value && Boolean(props.app.emoji))
const initial = computed(() => props.app.name.slice(0, 1))

/** 奇偶微微交错，像被随手码好的一叠牌；底牌端正摆放 */
const style = computed(() => {
  const stagger = props.isLast ? 0 : props.index % 2 === 0 ? -1 : 1
  return {
    '--hue': props.app.hue,
    '--i': props.index,
    '--tilt': `${(stagger * 0.3).toFixed(2)}deg`
  }
})

/* ── 折射 ────────────────────────────────────────────────
   只在宽屏生成：窄屏没有抽出车道，也省掉这张贴图的计算开销 */
const wideQuery =
  typeof window !== 'undefined' ? window.matchMedia('(min-width: 720px)') : null

let ro = null
let timer = 0

function clearLens() {
  lensMap.value = null
}

function syncLens() {
  const el = faceEl.value
  const supported = supportsRefraction()

  if (!el || !supported || !wideQuery?.matches) {
    clearLens()
    return
  }

  const width = el.clientWidth
  const height = el.clientHeight
  if (width < 40 || height < 40) return

  lensMap.value = buildLensMap({ width, height, radius: 22, pad: 34, band: 26, strength: 13 })
}

function scheduleLens() {
  clearTimeout(timer)
  timer = window.setTimeout(syncLens, 140)
}

onMounted(() => {
  syncLens()
  if (typeof ResizeObserver !== 'undefined' && faceEl.value) {
    ro = new ResizeObserver(scheduleLens)
    ro.observe(faceEl.value)
  }
  wideQuery?.addEventListener('change', scheduleLens)
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  ro?.disconnect()
  wideQuery?.removeEventListener('change', scheduleLens)
})

/** 位移层单独挂 backdrop-filter：不支持时这条声明会被丢掉，不影响下面的模糊玻璃 */
watchEffect(() => {
  const el = lensEl.value
  if (!el) return
  const value = lensMap.value ? `url(#${lensId})` : ''
  el.style.backdropFilter = value
  el.style.webkitBackdropFilter = value
})

/* ── 高光跟随指针 ────────────────────────────────────────
   光斑落在指针附近，玻璃才有「被摸到」的反应 */
let raf = 0
let pending = null

function trackPointer(event) {
  if (event.pointerType === 'touch') return
  pending = event
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    const el = faceEl.value
    if (!el || !pending) return
    const rect = el.getBoundingClientRect()
    const mx = ((pending.clientX - rect.left) / rect.width) * 100
    const my = ((pending.clientY - rect.top) / rect.height) * 100
    el.style.setProperty('--mx', `${Math.max(0, Math.min(100, mx)).toFixed(2)}%`)
    el.style.setProperty('--my', `${Math.max(0, Math.min(100, my)).toFixed(2)}%`)
    pending = null
  })
}

function resetPointer() {
  const el = faceEl.value
  if (!el) return
  el.style.removeProperty('--mx')
  el.style.removeProperty('--my')
}

/**
 * 点击时把牌面固定在当前位置：页面开始跳转时 :hover 会丢失，
 * 若还带 480ms 的弹性过渡，看起来就是「点一下弹回去」。
 */
function freezeFace(event) {
  const face = event.currentTarget.querySelector('.card__face')
  if (!face) return
  face.style.transition = 'none'
}

function releaseFace(event) {
  const face = event.currentTarget.querySelector('.card__face')
  if (!face) return
  face.style.transition = ''
}

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <a
    :href="app.url || '#'"
    class="card"
    :class="{ 'card--last': isLast }"
    :style="style"
    :aria-label="`${app.name}${app.tag ? '，' + app.tag : ''}${app.desc ? '，' + app.desc : ''}`"
    @pointerdown="freezeFace"
    @pointerup="releaseFace"
    @pointercancel="releaseFace"
    @pointermove="trackPointer"
    @pointerleave="resetPointer"
  >
    <span ref="faceEl" class="card__face">
      <!-- 色相光晕：玻璃背后的颜色来源，让每张牌还是自己的颜色 -->
      <span class="card__aura" aria-hidden="true" />

      <!-- 模糊玻璃 + 边缘折射：两层叠加，折射不支持时退化成纯模糊 -->
      <span class="card__glass" aria-hidden="true" />
      <span ref="lensEl" class="card__lens" aria-hidden="true" />

      <!-- 色相、内阴影与边缘亮线 -->
      <span class="card__tint" aria-hidden="true" />

      <!-- 牌心的大号编号，被上方牌压住也无所谓 -->
      <span class="card__series" aria-hidden="true">{{ series }}</span>

      <!-- 跟随指针的镜面高光 -->
      <span class="card__sheen" aria-hidden="true" />

      <span class="card__frame" aria-hidden="true" />

      <!-- 名称在左上、图标在右上：叠起来时唯一必须看清的一整行 -->
      <span class="card__corner">
        <span class="card__name">{{ app.name }}</span>

        <span class="card__icon" aria-hidden="true">
          <img
            v-if="showIcon"
            class="card__icon-img"
            :src="app.icon"
            alt=""
            loading="lazy"
            decoding="async"
            @error="iconOk = false"
          />
          <span v-else-if="showEmoji" class="card__emoji">{{ app.emoji }}</span>
          <span v-else class="card__initial">{{ initial }}</span>
        </span>
      </span>
    </span>

    <!-- 每张牌自己的折射滤镜：贴图按卡片尺寸生成 -->
    <svg
      v-if="lensMap"
      class="card__lens-defs"
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          :id="lensId"
          x="-6%"
          y="-6%"
          width="112%"
          height="112%"
          color-interpolation-filters="sRGB"
        >
          <feImage
            :href="lensMap.url"
            :xlink:href="lensMap.url"
            x="0"
            y="0"
            :width="lensMap.cssWidth"
            :height="lensMap.cssHeight"
            preserveAspectRatio="none"
            result="lensmap"
          />
          <!-- 三通道用略微不同的强度采样，边缘就有色散 -->
          <feDisplacementMap
            in="SourceGraphic"
            in2="lensmap"
            scale="262"
            xChannelSelector="R"
            yChannelSelector="G"
            result="dispR"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="lensmap"
            scale="255"
            xChannelSelector="R"
            yChannelSelector="G"
            result="dispG"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="lensmap"
            scale="247"
            xChannelSelector="R"
            yChannelSelector="G"
            result="dispB"
          />
          <feColorMatrix
            in="dispR"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="chR"
          />
          <feColorMatrix
            in="dispG"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="chG"
          />
          <feColorMatrix
            in="dispB"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="chB"
          />
          <feBlend in="chR" in2="chG" mode="screen" result="chRG" />
          <feBlend in="chRG" in2="chB" mode="screen" />
        </filter>
      </defs>
    </svg>
  </a>
</template>
