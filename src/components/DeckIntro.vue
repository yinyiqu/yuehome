<script setup>
import { ref } from 'vue'

const props = defineProps({
  count: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'shuffle'])

const input = ref(null)
const focused = ref(false)

const clear = () => {
  emit('update:modelValue', '')
  input.value?.focus()
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="bar">
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
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-start;
  width: 100%;
  max-width: 860px;
  margin-inline: auto;
  /* 与 deck-root 完全一致的内边距，搜索框左缘与容器对齐 */
  padding: 0 clamp(16px, 4vw, 32px) clamp(16px, 2.2vw, 24px);
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
