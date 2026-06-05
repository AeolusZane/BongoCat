<script setup lang="ts">
import { PhysicalSize } from '@tauri-apps/api/dpi'
import { Menu, PredefinedMenuItem } from '@tauri-apps/api/menu'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { round } from 'es-toolkit'
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { useAppMenu } from '@/composables/useAppMenu'
import { useDevice } from '@/composables/useDevice'
import { useGamepad } from '@/composables/useGamepad'
import { useModel } from '@/composables/useModel'
import { useCatStore } from '@/stores/cat'
import { useGeneralStore } from '@/stores/general.ts'
import { useModelStore } from '@/stores/model'
import { isWindows } from '@/utils/platform'

const { startListening } = useDevice()
const appWindow = getCurrentWebviewWindow()
const { modelSize, handleLoad, handleDestroy, handleResize, handleDragStart, handleDragEnd, handleClick } = useModel()
const catStore = useCatStore()
const { getBaseMenu, getExitMenu } = useAppMenu()
const modelStore = useModelStore()
const generalStore = useGeneralStore()
const resizing = ref(false)
const { stickActive } = useGamepad()

onMounted(startListening)

onUnmounted(handleDestroy)

const debouncedResize = useDebounceFn(async () => {
  await handleResize()

  resizing.value = false
}, 100)

useEventListener('resize', () => {
  resizing.value = true

  debouncedResize()
})

// 加载精灵宠物
watch(() => modelStore.currentModel, async () => {
  await handleLoad()
  modelStore.modelReady = true
}, { deep: true, immediate: true })

// 窗口缩放
watch([() => catStore.window.scale, modelSize], async ([scale, modelSize]) => {
  if (!modelSize) return

  const { width, height } = modelSize

  appWindow.setSize(
    new PhysicalSize({
      width: Math.round(width * (scale / 100)),
      height: Math.round(height * (scale / 100)),
    }),
  )
}, { immediate: true })

// 窗口可见性
watch(() => catStore.window.visible, async (value) => {
  const { showWindow, hideWindow } = await import('@/plugins/window')
  value ? showWindow() : hideWindow()
})

// 鼠标穿透
watch(() => catStore.window.passThrough, (value) => {
  appWindow.setIgnoreCursorEvents(value)
}, { immediate: true })

// 置顶
watch(() => catStore.window.alwaysOnTop, async (value) => {
  const { setAlwaysOnTop } = await import('@/plugins/window')
  setAlwaysOnTop(value)
}, { immediate: true })

// 任务栏可见性
watch(() => generalStore.app.taskbarVisible, async (value) => {
  const { setTaskbarVisibility } = await import('@/plugins/window')
  setTaskbarVisibility(value)
}, { immediate: true })

// 鼠标按下 → 拖拽窗口
function handleMouseDown() {
  appWindow.startDragging()
}

// 右键菜单
async function handleContextmenu(event: MouseEvent) {
  event.preventDefault()

  if (event.shiftKey) return

  const menu = await Menu.new({
    items: [
      ...await getBaseMenu(),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      ...await getExitMenu(),
    ],
  })

  // Temporarily disable always-on-top on Windows so the context menu is not covered
  if (isWindows && catStore.window.alwaysOnTop) {
    const { setAlwaysOnTop } = await import('@/plugins/window')
    setAlwaysOnTop(false)
  }

  await menu.popup()

  // Restore always-on-top after the menu is closed
  if (!isWindows || !catStore.window.alwaysOnTop) return

  const { setAlwaysOnTop } = await import('@/plugins/window')
  setAlwaysOnTop(true)
}

// Shift + 右键拖拽缩放
function handleMouseMove(event: MouseEvent) {
  const { buttons, shiftKey, movementX, movementY } = event

  if (buttons !== 2 || !shiftKey) return

  const delta = (movementX + movementY) * 0.5
  const nextScale = Math.max(10, Math.min(catStore.window.scale + delta, 500))

  catStore.window.scale = round(nextScale)
}
</script>

<template>
  <div
    class="relative size-screen overflow-hidden children:(absolute size-full)"
    :style="{
      opacity: catStore.window.opacity / 100,
      borderRadius: `${catStore.window.radius}%`,
    }"
    @contextmenu="handleContextmenu"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
  >
    <canvas id="spriteCanvas" />

    <div
      v-show="resizing || !modelStore.modelReady"
      class="flex items-center justify-center bg-black"
    >
      <span class="text-center text-[10vw] text-[#fff]">
        {{ resizing ? $t('pages.main.hints.redrawing') : $t('pages.main.hints.switching') }}
      </span>
    </div>
  </div>
</template>
