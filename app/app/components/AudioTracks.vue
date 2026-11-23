<script setup lang="ts">
// Фрагменты аудиогида на «Услугах» (20.11.2026), как .tracks в js/main.js прототипа: тёмная панель
// по примеру заказчицы — кнопка играть / пауза, название, «время · язык», номер; перемотка — у запущенного.
// Внизу — кнопка «Слушать»: полный аудиогид в Navicup. Играет один фрагмент за раз; файл грузится только по нажатию.

export interface AudioTrack {
  /** Ключ названия в services.audio.fragment */
  key: string
  src: string
  /** Длительность до загрузки файла, в секундах */
  seconds: number
}

defineProps<{
  tracks: AudioTrack[]
  /** Полный аудиогид — кнопка «Слушать» внизу панели */
  fullUrl: string
}>()

const { t, locale } = useI18n()
const players = ref<HTMLAudioElement[]>([])
const playing = ref(-1)
const now = reactive<Record<number, number>>({})
const total = reactive<Record<number, number>>({})

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function toggle(i: number) {
  const audio = players.value[i]
  if (!audio) return
  if (audio.paused) {
    players.value.forEach((a, k) => k !== i && a.pause())
    void audio.play()
  } else {
    audio.pause()
  }
}

function onMeta(i: number) {
  const d = players.value[i]?.duration
  if (d && Number.isFinite(d)) total[i] = d
}

function onTime(i: number) {
  now[i] = players.value[i]?.currentTime ?? 0
}

function onEnded(i: number) {
  const audio = players.value[i]
  if (audio) audio.currentTime = 0
  now[i] = 0
}

function onSeek(i: number, e: Event) {
  const audio = players.value[i]
  if (!audio) return
  audio.currentTime = Number((e.target as HTMLInputElement).value)
  now[i] = audio.currentTime
}
</script>

<template>
  <div class="tracks">
    <ul class="tracks__list">
      <li
        v-for="(track, i) in tracks"
        :key="track.key"
        class="track"
        :class="{ 'is-playing': playing === i, 'is-started': playing === i || !!now[i] }"
      >
        <button
          class="track__play"
          type="button"
          :aria-label="
            t(playing === i ? 'services.audio.pause' : 'services.audio.play', {
              title: t(`services.audio.fragment.${track.key}`),
            })
          "
          @click="toggle(i)"
        >
          <span class="track__icon" aria-hidden="true" />
        </button>
        <div class="track__body">
          <p class="track__title">{{ t(`services.audio.fragment.${track.key}`) }}</p>
          <p class="track__meta">
            <span class="track__time">{{
              now[i]
                ? `${fmt(now[i])} / ${fmt(total[i] ?? track.seconds)}`
                : fmt(total[i] ?? track.seconds)
            }}</span>
            · {{ locale.toUpperCase() }}
          </p>
          <input
            class="track__seek"
            type="range"
            min="0"
            :max="Math.round(total[i] ?? track.seconds)"
            step="1"
            :value="now[i] ?? 0"
            :style="{ '--p': `${((now[i] ?? 0) / (total[i] ?? track.seconds)) * 100}%` }"
            :aria-label="
              t('services.audio.seek', { title: t(`services.audio.fragment.${track.key}`) })
            "
            @input="onSeek(i, $event)"
          />
        </div>
        <span class="track__num" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
        <audio
          ref="players"
          :src="track.src"
          preload="none"
          @play="playing = i"
          @pause="playing === i && (playing = -1)"
          @loadedmetadata="onMeta(i)"
          @timeupdate="onTime(i)"
          @ended="onEnded(i)"
        />
      </li>
    </ul>
    <!-- Пояснение «Весь аудиогид — 20 историй — в Navicup» убрано (заказчица, 23.11.2026) -->
    <div class="tracks__foot">
      <a class="btn btn--sm" :href="fullUrl" target="_blank" rel="noopener">{{
        t('services.audio.listen')
      }}</a>
    </div>
  </div>
</template>
