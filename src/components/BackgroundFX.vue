<script setup>
/**
 * 背景是固定的：玻璃每帧都要重新采样背后的画面，
 * 光斑一旦跟着鼠标动，整叠牌每帧都要重算一遍模糊与折射，代价太大。
 * 所以这里只留静态光斑，靠层次和颜色撑住画面。
 */
</script>

<template>
  <div class="bg" aria-hidden="true">
    <div class="bg__base" />
    <div class="orb orb--a" />
    <div class="orb orb--b" />
    <div class="orb orb--c" />
    <div class="orb orb--d" />
    <div class="bg__streak" />
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

/* 玻璃需要有颜色可以折射，光斑比之前更亮、更靠中间 */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(76px);
}

.orb--a {
  top: -12%;
  left: 2%;
  width: 48vw;
  height: 48vw;
  min-width: 340px;
  min-height: 340px;
  background: radial-gradient(circle, rgba(255, 190, 96, 0.72), transparent 66%);
  opacity: 0.8;
}

.orb--b {
  bottom: -16%;
  right: -2%;
  width: 46vw;
  height: 46vw;
  min-width: 300px;
  min-height: 300px;
  background: radial-gradient(circle, rgba(255, 118, 100, 0.6), transparent 68%);
  opacity: 0.72;
}

.orb--c {
  top: 34%;
  left: 52%;
  width: 36vw;
  height: 36vw;
  min-width: 260px;
  min-height: 260px;
  background: radial-gradient(circle, rgba(86, 200, 214, 0.52), transparent 70%);
  opacity: 0.66;
}

.orb--d {
  top: 62%;
  left: 4%;
  width: 32vw;
  height: 32vw;
  min-width: 240px;
  min-height: 240px;
  background: radial-gradient(circle, rgba(150, 108, 240, 0.46), transparent 70%);
  opacity: 0.62;
}

/* 一道斜光：玻璃边缘会把它折出一道亮痕 */
.bg__streak {
  position: absolute;
  inset: -20%;
  background: linear-gradient(
    104deg,
    transparent 38%,
    rgba(255, 255, 255, 0.05) 46%,
    rgba(255, 255, 255, 0.015) 52%,
    transparent 60%
  );
  mix-blend-mode: screen;
}

/* 极淡的网格，给玻璃一点参照物 */
.bg__grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
  background-size: 96px 96px;
  mask-image: radial-gradient(ellipse 96% 66% at 50% 40%, #000 0%, transparent 82%);
  -webkit-mask-image: radial-gradient(ellipse 96% 66% at 50% 40%, #000 0%, transparent 82%);
  opacity: 0.9;
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
  background: radial-gradient(ellipse 130% 100% at 50% 30%, transparent 48%, rgba(0, 0, 0, 0.42) 100%);
}

:root[data-theme='light'] .orb--a {
  background: radial-gradient(circle, rgba(246, 190, 110, 0.62), transparent 66%);
  opacity: 0.82;
}
:root[data-theme='light'] .orb--b {
  background: radial-gradient(circle, rgba(240, 128, 108, 0.34), transparent 68%);
  opacity: 0.75;
}
:root[data-theme='light'] .orb--c {
  background: radial-gradient(circle, rgba(104, 186, 200, 0.3), transparent 70%);
  opacity: 0.7;
}
:root[data-theme='light'] .orb--d {
  background: radial-gradient(circle, rgba(160, 128, 235, 0.24), transparent 70%);
  opacity: 0.65;
}
:root[data-theme='light'] .bg__streak {
  background: linear-gradient(
    104deg,
    transparent 38%,
    rgba(255, 255, 255, 0.3) 46%,
    rgba(255, 255, 255, 0.12) 52%,
    transparent 60%
  );
  mix-blend-mode: soft-light;
}
:root[data-theme='light'] .bg__grain {
  opacity: 0.035;
  mix-blend-mode: multiply;
}
:root[data-theme='light'] .bg__vignette {
  background: radial-gradient(ellipse 130% 100% at 50% 25%, transparent 52%, rgba(120, 96, 64, 0.14) 100%);
}

@media (max-width: 720px) {
  .orb {
    filter: blur(58px);
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
