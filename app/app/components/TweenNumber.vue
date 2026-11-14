<script setup lang="ts">
// Число, которое не перескакивает, а досчитывает до нового значения за 0,3 с (суммы
// в калькуляторах, 14.11.2026, как в прототипе). На сервере и при «уменьшить движение» — сразу.
import { motionOff } from '~/plugins/motion'

const props = defineProps<{ value: number; format: (v: number) => string }>()

const shown = ref(props.value)
let raf = 0

watch(
  () => props.value,
  (to, from) => {
    cancelAnimationFrame(raf)
    if (motionOff() || from === to) {
      shown.value = to
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 300)
      shown.value = t === 1 ? to : from + (to - from) * (1 - Math.pow(1 - t, 3))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  },
)
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <span>{{ format(shown) }}</span>
</template>
