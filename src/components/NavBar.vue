<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { site } from '../data/site.js'
import { useTheme } from '../composables/useTheme.js'

const { theme, toggle } = useTheme()
const scrolled = ref(false)
let raf = 0

/**
 * 左上角的字标是一枚颜文字：进来是笑脸，离开是不舍。
 * 三段文字等宽（括号 + 两只眼 + 括号 + 手势，共 5 格），
 * 换表情时导航栏不会跳动。
 */
const FACES = {
  idle: { text: '(oo)y', label: '平静' },
  happy: { text: '(^^)Y', label: '开心' },
  sad: { text: '(TT)y', label: '不舍' }
}
const mood = ref('idle')
const hovering = ref(false)
let moodTimer = 0

function clearMoodTimer() {
  clearTimeout(moodTimer)
  moodTimer = 0
}

function enterFace() {
  hovering.value = true
  clearMoodTimer()
  mood.value = 'happy'
}

function leaveFace() {
  hovering.value = false
  clearMoodTimer()
  mood.value = 'sad'
  // 不舍一会儿，再回到平静；期间如果又回来了，enter 会接管
  moodTimer = window.setTimeout(() => {
    if (!hovering.value) mood.value = 'idle'
  }, 1200)
}

/** 点击（含触屏）也给一次笑脸反馈 */
function cheer() {
  clearMoodTimer()
  mood.value = 'happy'
  moodTimer = window.setTimeout(() => {
    mood.value = hovering.value ? 'happy' : 'idle'
  }, 900)
}

function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    scrolled.value = window.scrollY > 16
    raf = 0
  })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (raf) cancelAnimationFrame(raf)
  clearMoodTimer()
})
</script>

<template>
  <header class="nav" :class="{ 'nav--scrolled': scrolled }">
    <div class="nav__inner">
      <a
        class="brand"
        href="#top"
        :aria-label="`${site.name} 主页`"
        @mouseenter="enterFace"
        @mouseleave="leaveFace"
        @focus="enterFace"
        @blur="leaveFace"
        @click="cheer"
      >
        <span class="mark" aria-hidden="true">
          <span :key="mood" class="face">
            <span class="face__rest">{{ FACES[mood].text.slice(0, 4) }}</span>
            <span class="face__hand">{{ FACES[mood].text.slice(4) }}</span>
          </span>
        </span>
        <span class="brand__text">
          <span class="brand__name">{{ site.name }}</span>
          <span class="brand__sub">{{ site.sub }}</span>
        </span>
      </a>

      <div class="nav__actions">
        <a
          v-if="site.github"
          class="icon-btn"
          :href="site.github"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
            <path
              d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.09-.74.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.94 0-1.31.47-2.39 1.24-3.23-.13-.31-.54-1.54.11-3.21 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.67.24 2.9.12 3.21.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z"
            />
          </svg>
        </a>

        <button
          class="toggle"
          type="button"
          :aria-label="`切换到${theme === 'dark' ? '浅色' : '深色'}主题`"
          :aria-pressed="theme === 'light'"
          @click="toggle"
        >
          <span class="toggle__track">
            <span class="toggle__thumb" :class="{ 'is-light': theme === 'light' }">
              <svg
                v-if="theme === 'dark'"
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            </span>
          </span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav {
  position: fixed;
  inset: 0 0 auto;
  z-index: var(--z-nav);
  padding-block: 18px;
  transition: padding var(--dur-base) var(--ease-out),
    background-color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out);
  border-bottom: 1px solid transparent;
}

.nav--scrolled {
  padding-block: 12px;
  background: var(--surface);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border-bottom-color: var(--line);
  box-shadow: 0 12px 32px -24px rgba(0, 0, 0, 0.6);
}

.nav__inner {
  width: 100%;
  max-width: 1120px;
  margin-inline: auto;
  padding-inline: clamp(20px, 4vw, 40px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

/* 颜文字字标：进来笑、离开不舍；五格等宽，换脸不推动标题 */
.mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  height: 34px;
  padding-inline: 2px;
  transition: transform var(--dur-base) var(--ease-spring);
}
.brand:hover .mark {
  transform: rotate(-4deg) scale(1.03);
}

.face {
  display: inline-flex;
  align-items: baseline;
  font-family: var(--font-mono);
  font-size: 0.98rem;
  line-height: 1;
  letter-spacing: 0.02em;
  white-space: nowrap;
  color: var(--text);
  animation: faceIn 300ms var(--ease-spring) both;
}

.face__hand {
  display: inline-block;
  transform-origin: 50% 85%;
}
.brand:hover .face__hand,
.brand:focus-visible .face__hand {
  animation: faceWave 900ms var(--ease-in-out) 1;
}

@keyframes faceIn {
  from {
    opacity: 0;
    transform: translateY(3px) scale(0.9);
  }
}

@keyframes faceWave {
  0%,
  100% {
    transform: rotate(0deg) translateY(0);
  }
  30% {
    transform: rotate(14deg) translateY(-1px);
  }
  60% {
    transform: rotate(-8deg) translateY(1px);
  }
}

.brand__text {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}
.brand__name {
  /* 花体数学字母（𝓫𝓮𝓲𝔂𝓾𝓮）优先用带该字符集的字体，避免落到方块 */
  font-family: 'Cambria Math', 'STIX Two Math', 'Noto Sans Math', 'Segoe UI Symbol',
    'Apple Symbols', var(--font-sans);
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.brand__sub {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-3);
}

.nav__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text-2);
  transition: transform var(--dur-fast) var(--ease-spring), color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}
.icon-btn:hover {
  transform: translateY(-2px) rotate(-4deg);
  color: var(--text);
  border-color: var(--line-strong);
}

.toggle {
  padding: 0;
  border-radius: var(--radius-pill);
}
.toggle__track {
  position: relative;
  display: block;
  width: 54px;
  height: 29px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  background: var(--surface);
  transition: background var(--dur-base) var(--ease-out);
}
.toggle__thumb {
  position: absolute;
  top: 50%;
  left: 4px;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #2a1d0d;
  background: var(--accent-grad);
  transform: translateY(-50%);
  transition: left var(--dur-base) var(--ease-spring);
  box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.5);
}
.toggle__thumb.is-light {
  left: calc(100% - 25px);
}

@media (max-width: 420px) {
  .brand__sub {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .face,
  .face__hand,
  .mark {
    animation: none;
    transition: none;
  }
}
</style>
