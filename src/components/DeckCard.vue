<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  app: { type: Object, required: true },
  index: { type: Number, default: 0 },
  // 最后一张整张露出，作为整叠的收尾
  isLast: { type: Boolean, default: false }
})

const iconOk = ref(true)

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
  >
    <span class="card__face">
      <span class="card__frame" aria-hidden="true" />

      <!-- 牌心的大号编号，被上方牌压住也无所谓 -->
      <span class="card__series" aria-hidden="true">{{ series }}</span>

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
  </a>
</template>
