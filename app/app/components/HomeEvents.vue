<script setup lang="ts">
// Главная, «05 Мероприятия»: вкладки «Предстоящие / Архив» (index.html прототипа).
// Предстоящие идут по очереди вместе с афишей, как data-rotate в js/main.js прототипа:
// у выделенного — полоска, сколько осталось до следующего; наведение или фокус останавливает смену.
import type { HomeData, HomeEvent } from '#shared/home'

const props = defineProps<{ events: NonNullable<HomeData['events']> }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const tab = ref<'upcoming' | 'archive'>('upcoming')
const tabs = ['upcoming', 'archive'] as const

// «18» и «октября» — день крупно, месяц под ним; дата по Таллину, без часового пояса браузера
function dateParts(date: string) {
  const parts = new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).formatToParts(new Date(`${date}T00:00:00Z`))
  return {
    day: parts.find((p) => p.type === 'day')?.value ?? '',
    month: parts.find((p) => p.type === 'month')?.value ?? '',
  }
}

const eventPath = (e: HomeEvent) => localePath(`/events/${e.slug}`)

// ---------- По очереди ----------

const current = ref(0)
const running = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
const seconds = computed(() => props.events.rotateSeconds)
const canRotate = computed(() => props.events.upcoming.length > 1)

function play() {
  clearTimeout(timer)
  if (!canRotate.value || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  // Полоска начинается заново: сначала сбрасываем, на следующем кадре запускаем
  running.value = false
  requestAnimationFrame(() => requestAnimationFrame(() => (running.value = true)))
  timer = setTimeout(() => {
    current.value = (current.value + 1) % props.events.upcoming.length
    play()
  }, seconds.value * 1000)
}

function pause(i: number) {
  clearTimeout(timer)
  running.value = false
  current.value = i
}

function onFocusOut(e: FocusEvent) {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) play()
}

onMounted(play)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <section id="meropriyatiya" class="section section--bg1">
    <div class="container">
      <SectionHead
        num="05"
        :crumb="t('home.events.crumb')"
        :title="t('home.events.title')"
        :more="{ to: localePath('/events'), label: t('home.events.more') }"
      />

      <div class="intro intro--single">
        <h3 class="intro__title">{{ t('home.events.lead') }}</h3>
        <p>{{ t('home.events.text') }}</p>
      </div>

      <div class="tabs" role="tablist" :aria-label="t('home.events.title')">
        <button
          v-for="key in tabs"
          :id="`tab-${key}`"
          :key="key"
          class="tabs__btn"
          :class="{ 'is-active': tab === key }"
          type="button"
          role="tab"
          :aria-controls="`panel-${key}`"
          :aria-selected="tab === key"
          :tabindex="tab === key ? undefined : -1"
          @click="tab = key"
        >
          {{ t(`home.events.tabs.${key}`) }}
        </button>
      </div>

      <!-- Предстоящие -->
      <div
        v-if="events.upcoming.length"
        v-show="tab === 'upcoming'"
        id="panel-upcoming"
        class="events"
        data-rotate
        role="tabpanel"
        aria-labelledby="tab-upcoming"
        @focusout="onFocusOut"
      >
        <ul class="events__list" @mouseleave="play">
          <li
            v-for="(e, i) in events.upcoming"
            :key="e.slug"
            class="event"
            :class="{ 'is-active': i === current }"
            @mouseenter="pause(i)"
            @focusin="pause(i)"
          >
            <p class="event__date">
              <span class="event__day">{{ dateParts(e.date).day }}</span>
              {{ dateParts(e.date).month }}
            </p>
            <div class="event__body">
              <p v-if="e.kind" class="event__type">{{ e.kind }}</p>
              <h4 class="event__title">{{ e.title }}</h4>
              <p v-if="e.lead" class="event__desc">{{ e.lead }}</p>
              <p v-if="e.startTime || e.priceNote" class="event__meta">
                <template v-if="e.startTime">{{
                  t('home.events.start', { time: e.startTime })
                }}</template>
                <span v-if="e.priceNote">{{ e.priceNote }}</span>
              </p>
            </div>
            <span
              class="event__progress"
              aria-hidden="true"
              :style="
                i === current && running
                  ? { width: '100%', transition: `width ${seconds}s linear` }
                  : { width: '0', transition: 'none' }
              "
            />
            <NuxtLink class="btn btn--sm event__btn" :to="eventPath(e)">{{
              e.registrationOpen ? t('home.events.register') : t('home.events.details')
            }}</NuxtLink>
          </li>
        </ul>

        <figure
          class="events__poster events__poster--still"
          :class="{ 'is-missing': !events.upcoming[current]?.poster }"
          :data-ph="events.upcoming[current]?.poster ? undefined : t('home.events.noPoster')"
        >
          <template v-for="(e, i) in events.upcoming" :key="e.slug">
            <img
              v-if="e.poster"
              :class="{ 'is-active': i === current }"
              :src="e.poster.url"
              :srcset="e.poster.srcset"
              sizes="(max-width: 1024px) 420px, 400px"
              :alt="t('home.events.poster', { title: e.title })"
              loading="lazy"
            />
          </template>
        </figure>
      </div>
      <div
        v-else
        v-show="tab === 'upcoming'"
        id="panel-upcoming"
        class="events-empty"
        role="tabpanel"
        aria-labelledby="tab-upcoming"
      >
        <p>{{ t('home.events.noUpcoming') }}</p>
      </div>

      <!-- Архив: прошедшие, без смены по очереди -->
      <div
        v-show="tab === 'archive'"
        id="panel-archive"
        role="tabpanel"
        aria-labelledby="tab-archive"
      >
        <ul v-if="events.archive.length" class="events__list">
          <li v-for="e in events.archive" :key="e.slug" class="event">
            <p class="event__date">
              <span class="event__day">{{ dateParts(e.date).day }}</span>
              {{ dateParts(e.date).month }}
            </p>
            <div class="event__body">
              <p v-if="e.kind" class="event__type">{{ e.kind }}</p>
              <h4 class="event__title">{{ e.title }}</h4>
              <p v-if="e.lead" class="event__desc">{{ e.lead }}</p>
            </div>
            <NuxtLink class="btn btn--sm event__btn" :to="eventPath(e)">{{
              t('home.events.details')
            }}</NuxtLink>
          </li>
        </ul>
        <div v-else class="events-empty">
          <p>{{ t('home.events.noArchive') }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
