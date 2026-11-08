<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 三团光斑随指针轻微偏移。
 * 位移量直接写进 CSS 变量（而不是走 ref → 重渲染），
 * 指针每动一下不至于让整棵组件树 diff 一遍。
 */
const root = ref(null)
let raf = 0
let px = 0
let py = 0

function apply() {
  raf = 0
  const el = root.value
  if (!el) return
  el.style.setProperty('--mx', px.toFixed(4))
  el.style.setProperty('--my', py.toFixed(4))
}

function onMove(event) {
  px = (event.clientX / window.innerWidth - 0.5) * 2
  py = (event.clientY / window.innerHeight - 0.5) * 2
  if (!raf) raf = requestAnimationFrame(apply)
}

onMounted(() => window.addEventListener('pointermove', onMove, { passive: true }))
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove)
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <div ref="root" class="bg" aria-hidden="true">
    <div class="bg__base" />
    <div class="orb orb--a" />
    <div class="orb orb--b" />
    <div class="orb orb--c" />
    <div class="bg__grid" />
    <div class="bg__grain" />
    <div class="bg__vignette" />
  </div>
</template>

<style scoped>
.bg {
  position: fixed;
  inset: 0;
  z-index: var(--z-bg);
  overflow: hidden;
  pointer-events: none;
}

.bg__base {
  position: absolute;
  inset: 0;
  background: var(--bg);
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  will-change: transform;
  transition: transform 900ms var(--ease-out);
}

.orb--a {
  top: -14%;
  left: 4%;
  width: 46vw;
  height: 46vw;
  min-width: 320px;
  min-height: 320px;
  background: radial-gradient(circle, rgba(238, 197, 132, 0.34), transparent 68%);
  opacity: 0.55;
  transform: translate3d(calc(var(--mx, 0) * -26px), calc(var(--my, 0) * -18px), 0);
}

.orb--b {
  bottom: -18%;
  right: 2%;
  width: 42vw;
  height: 42vw;
  min-width: 280px;
  min-height: 280px;
  background: radial-gradient(circle, rgba(242, 147, 122, 0.26), transparent 70%);
  opacity: 0.5;
  transform: translate3d(calc(var(--mx, 0) * 32px), calc(var(--my, 0) * 22px), 0);
}

.orb--c {
  top: 42%;
  left: 58%;
  width: 30vw;
  height: 30vw;
  min-width: 220px;
  min-height: 220px;
  background: radial-gradient(circle, rgba(107, 148, 168, 0.22), transparent 72%);
  opacity: 0.45;
  transform: translate3d(calc(var(--mx, 0) * 14px), calc(var(--my, 0) * -26px), 0);
}

/* 极淡的网格，给玻璃一点参照物 */
.bg__grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(to right, var(--line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--line) 1px, transparent 1px);
  background-size: 96px 96px;
  mask-image: radial-gradient(ellipse 90% 60% at 50% 40%, #000 0%, transparent 78%);
  -webkit-mask-image: radial-gradient(ellipse 90% 60% at 50% 40%, #000 0%, transparent 78%);
  opacity: 0.55;
}

/* 颗粒：用 SVG 噪点，避免额外图片请求 */
.bg__grain {
  position: absolute;
  inset: -50%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  opacity: 0.05;
  mix-blend-mode: overlay;
}

.bg__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 120% 90% at 50% 30%, transparent 45%, rgba(0, 0, 0, 0.55) 100%);
}

:root[data-theme='light'] .orb--a {
  background: radial-gradient(circle, rgba(214, 160, 96, 0.3), transparent 68%);
  opacity: 0.6;
}
:root[data-theme='light'] .orb--b {
  background: radial-gradient(circle, rgba(198, 90, 62, 0.16), transparent 70%);
  opacity: 0.55;
}
:root[data-theme='light'] .orb--c {
  background: radial-gradient(circle, rgba(120, 158, 176, 0.16), transparent 72%);
}
:root[data-theme='light'] .bg__grain {
  opacity: 0.035;
  mix-blend-mode: multiply;
}
:root[data-theme='light'] .bg__vignette {
  background: radial-gradient(ellipse 120% 90% at 50% 25%, transparent 50%, rgba(120, 96, 64, 0.16) 100%);
}

@media (max-width: 720px) {
  .orb {
    filter: blur(64px);
  }
  .bg__grid {
    background-size: 64px 64px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .orb {
    transition: none;
  }
}
</style>
