<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  count: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'shuffle'])

const input = ref(null)
const focused = ref(false)

/**
 * 搜索栏吸顶：滚到顶栏下方时钉住，并换成 iOS 导航栏材质。
 * 顶栏滚动后的高度是 34（内容）+ 12×2（内边距）= 58。
 */
const NAV_H = 58
const bar = ref(null)
const stuck = ref(false)
let raf = 0

function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    const el = bar.value
    if (!el) return
    // 吸顶后元素顶边被钉在 NAV_H 上，据此判断是否已「贴上去」
    stuck.value = el.getBoundingClientRect().top <= NAV_H + 1
  })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (raf) cancelAnimationFrame(raf)
})

const clear = () => {
  emit('update:modelValue', '')
  input.value?.focus()
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div ref="bar" class="bar" :class="{ 'bar--stuck': stuck }">
    <label class="search" :class="{ 'is-focused': focused }">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m16.5 16.5 4 4" stroke-linecap="round" />
      </svg>
      <span class="visually-hidden">搜索卡片</span>
      <input
        ref="input"
        type="search"
        :value="props.modelValue"
        autocomplete="off"
        spellcheck="false"
        @input="emit('update:modelValue', $event.target.value)"
        @focus="focused = true"
        @blur="focused = false"
        @keydown.esc.prevent="clear"
      />
      <button v-if="modelValue" class="search__clear" type="button" aria-label="清空搜索" @click="clear">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </label>

    <button class="shuffle" type="button" title="把牌堆打乱" @click="emit('shuffle')">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 7h3.5l9 10H20" />
        <path d="M4 17h3.5l9-10H20" />
        <path d="m17.5 4.5 2.5 2.5-2.5 2.5M17.5 14.5 20 17l-2.5 2.5" />
      </svg>
      <span>洗牌</span>
    </button>
  </div>
</template>

<style scoped>
.bar {
  /* 吸顶：滚到顶栏下沿就钉住，卡片从下面穿过 */
  position: sticky;
  top: 58px;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-start;
  width: 100%;
  max-width: 860px;
  margin-inline: auto;
  /* 与 deck-root 完全一致的内边距，搜索框左缘与容器对齐 */
  padding: 0 clamp(16px, 4vw, 32px) clamp(16px, 2.2vw, 24px);
  transition: padding var(--dur-base) var(--ease-out);
}

/* 吸顶状态下把上下留白收成对称的 10px，让玻璃条高度稳定在 58 */
.bar--stuck {
  padding-block: 10px;
}

/* iOS 材质层：横贯整屏，模糊从下面滚过的卡片 */
.bar::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 100vw;
  transform: translateX(-50%);
  background: var(--ios-bar);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--ios-hairline);
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-out);
  pointer-events: none;
  z-index: -1;
}

.bar--stuck::before {
  opacity: 1;
}

/* 吸顶后搜索框换 iOS 的填充灰：不再自带模糊，靠底下的材质透出来 */
.bar--stuck .search,
.bar--stuck .shuffle {
  background: var(--ios-fill);
  border-color: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.bar--stuck .search {
  color: var(--text-2);
}
.bar--stuck .search:hover,
.bar--stuck .shuffle:hover {
  border-color: transparent;
  color: var(--text);
}
.bar--stuck .search.is-focused {
  border-color: color-mix(in oklab, var(--accent) 45%, transparent);
  background: var(--ios-fill);
}

@media (min-resolution: 2dppx) {
  .bar--stuck::before {
    border-bottom-width: 0.5px;
  }
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 220px;
  height: 38px;
  padding-inline: 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text-3);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: border-color var(--dur-base) var(--ease-out),
    background var(--dur-base) var(--ease-out), width var(--dur-base) var(--ease-out);
}
.search:hover {
  border-color: var(--line-strong);
}
.search.is-focused {
  border-color: color-mix(in oklab, var(--accent) 55%, transparent);
  background: var(--surface-strong);
  color: var(--text-2);
}

.search input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 0.82rem;
  color: var(--text);
}
.search input::placeholder {
  color: var(--text-3);
}
.search input::-webkit-search-cancel-button {
  display: none;
}

.search__clear {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: var(--text-3);
  transition: color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}
.search__clear:hover {
  color: var(--text);
  background: var(--line);
}

.shuffle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 38px;
  /* 比图标 + 文字的自然宽度更舒展一些，和 220px 搜索框配平 */
  min-width: 96px;
  padding-inline: 18px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text-2);
  font-size: 0.8rem;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: transform var(--dur-fast) var(--ease-spring), color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}
.shuffle:hover {
  transform: translateY(-1px);
  color: var(--text);
  border-color: var(--line-strong);
}
.shuffle:active {
  transform: translateY(0) scale(0.97);
}
.shuffle svg {
  transition: transform var(--dur-base) var(--ease-spring);
}
.shuffle:hover svg {
  transform: rotate(18deg);
}

@media (min-width: 720px) {
  .bar {
    padding-inline: 24px;
  }
}

@media (max-width: 719.98px) {
  .search {
    width: 100%;
  }
  .shuffle {
    flex: 0 0 auto;
    min-width: 46px;
    padding-inline: 12px;
  }
  .shuffle span {
    display: none;
  }
}
</style>
