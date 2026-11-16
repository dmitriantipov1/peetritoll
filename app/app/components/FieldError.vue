<script setup lang="ts">
// Сообщение под полем формы (16.11.2026, 8.6): плавно раскрывается и сворачивается
// (классы ferr-* в style.css — те же, что ставит прототип). Пока сворачивается — с прежним текстом.
const props = defineProps<{ id: string; msg?: string }>()
const last = ref(props.msg ?? '')
watch(
  () => props.msg,
  (m) => {
    if (m) last.value = m
  },
)
</script>

<template>
  <Transition name="ferr">
    <span v-if="msg" :id="id" class="field__error" aria-live="polite"
      ><span>{{ msg || last }}</span></span
    >
  </Transition>
</template>
