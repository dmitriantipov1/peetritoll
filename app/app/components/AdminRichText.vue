<script setup lang="ts">
// Редактор текста страницы (TipTap). Панель — как в прототипе (admin/material.html):
// жирный, курсив, заголовок, список, цитата, ссылка, фото. Наружу — HTML;
// сервер чистит его по белому списку (server/utils/rich-text.ts), так что лишнего не сохранится.
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import type { MediaImage } from '#shared/media'

const html = defineModel<string>({ required: true })
const props = defineProps<{ disabled?: boolean; label: string }>()

const editor = useEditor({
  content: html.value,
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
    }),
    Image,
  ],
  editorProps: { attributes: { class: 'adm-editor__body', 'aria-label': props.label } },
  onUpdate: ({ editor }) => {
    html.value = editor.isEmpty ? '' : editor.getHTML()
  },
})

// Текст поменяли снаружи (другой язык, ответ сервера) — показать его
watch(html, (value) => {
  const e = editor.value
  if (e && value !== (e.isEmpty ? '' : e.getHTML()))
    e.commands.setContent(value, { emitUpdate: false })
})
watch(
  () => props.disabled,
  (d) => editor.value?.setEditable(!d),
)
onBeforeUnmount(() => editor.value?.destroy())

const chain = () => editor.value!.chain().focus()
const active = (name: string, attrs?: Record<string, unknown>) =>
  editor.value?.isActive(name, attrs) ?? false

function setLink() {
  const current = editor.value?.getAttributes('link').href as string | undefined
  const url = window.prompt('Адрес ссылки (пусто — убрать ссылку)', current ?? 'https://')
  if (url === null) return
  if (url.trim() === '' || url.trim() === 'https://')
    chain().extendMarkRange('link').unsetLink().run()
  else chain().extendMarkRange('link').setLink({ href: url.trim() }).run()
}

// Фото в тексте: загружаем как обложку и вставляем по месту курсора
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const error = ref('')

async function insertImage(file: File | undefined) {
  if (!file) return
  error.value = ''
  uploading.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const image = await $fetch<MediaImage>('/api/admin/media', { method: 'POST', body })
    chain().setImage({ src: image.url, alt: '' }).run()
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось загрузить фото. Попробуйте ещё раз.')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div>
    <div class="adm-editor" :class="{ 'is-disabled': disabled }">
      <div
        v-if="editor && !disabled"
        class="adm-editor__bar"
        role="toolbar"
        aria-label="Оформление текста"
      >
        <button
          type="button"
          aria-label="Жирный"
          :aria-pressed="active('bold')"
          @click="chain().toggleBold().run()"
        >
          <b>Ж</b>
        </button>
        <button
          type="button"
          aria-label="Курсив"
          :aria-pressed="active('italic')"
          @click="chain().toggleItalic().run()"
        >
          <i>К</i>
        </button>
        <span class="sep" aria-hidden="true" />
        <button
          type="button"
          :aria-pressed="active('heading', { level: 2 })"
          @click="chain().toggleHeading({ level: 2 }).run()"
        >
          Заголовок
        </button>
        <button
          type="button"
          :aria-pressed="active('bulletList')"
          @click="chain().toggleBulletList().run()"
        >
          Список
        </button>
        <button
          type="button"
          :aria-pressed="active('blockquote')"
          @click="chain().toggleBlockquote().run()"
        >
          Цитата
        </button>
        <span class="sep" aria-hidden="true" />
        <button type="button" :aria-pressed="active('link')" @click="setLink">Ссылка</button>
        <button type="button" :disabled="uploading" @click="fileInput?.click()">
          {{ uploading ? 'Загружаем…' : 'Фото' }}
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          hidden
          @change="insertImage(($event.target as HTMLInputElement).files?.[0])"
        />
      </div>
      <EditorContent v-if="editor" :editor="editor" />
      <!-- Редактор создаётся в браузере; до этого — пустое поле той же высоты, без прыжка -->
      <div v-else class="adm-editor__body" />
    </div>
    <p v-if="error" class="adm-note adm-danger" role="alert">{{ error }}</p>
  </div>
</template>
