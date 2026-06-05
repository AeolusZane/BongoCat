import { LogicalSize } from '@tauri-apps/api/dpi'
import { resolveResource } from '@tauri-apps/api/path'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { round } from 'es-toolkit'
import { ref } from 'vue'

import { useCatStore } from '@/stores/cat'
import spritePet from '@/utils/spritePet'
import SpriteStateMachine from '@/utils/spriteStateMachine'
import { join } from '@/utils/path'

export interface ModelSize {
  width: number
  height: number
}

const appWindow = getCurrentWebviewWindow()

// 模块级单例：状态机
const stateMachine = new SpriteStateMachine({
  idleTimeout: 30_000,
  happyDuration: 2_000,
  onStateChange: (state) => {
    spritePet.playState(state)
  },
  onStateComplete: (state) => {
    // CLICK 等非循环动画播完后自动恢复
    if (state === 'CLICK') {
      stateMachine.setState('IDLE')
    }
  },
})

// 连接精灵动画完成回调到状态机
spritePet.setOnComplete(() => {
  stateMachine.notifyAnimationComplete()
})

export function useModel() {
  const catStore = useCatStore()
  const modelSize = ref<ModelSize>()

  /** 加载精灵宠物 */
  async function handleLoad() {
    try {
      const basePath = await resolveResource('assets/sprite-pet')
      const configPath = join(basePath, 'pet.json')

      const { width, height } = await spritePet.load(basePath, configPath)

      modelSize.value = { width, height }
      handleResize()
      stateMachine.setState('IDLE')
    }
    catch (error) {
      console.error('Failed to load sprite pet:', error)
    }
  }

  /** 销毁精灵宠物 */
  function handleDestroy() {
    spritePet.destroy()
    stateMachine.destroy()
  }

  /** 窗口缩放时重新调整精灵大小 */
  async function handleResize() {
    if (!modelSize.value) return

    spritePet.resize(modelSize.value)

    const { width, height } = modelSize.value

    if (round(innerWidth / innerHeight, 1) !== round(width / height, 1)) {
      await appWindow.setSize(
        new LogicalSize({
          width: innerWidth,
          height: Math.ceil(innerWidth * (height / width)),
        }),
      )
    }

    const size = await appWindow.size()

    catStore.window.scale = round((size.width / width) * 100)
  }

  /** 通知有用户活动（键盘/鼠标/手柄） */
  function handleActivity() {
    stateMachine.signalActivity()
  }

  /** 鼠标按键变化 */
  function handleMouseChange(_key: string, pressed = true) {
    if (pressed) {
      stateMachine.signalActivity()
    }
  }

  /** 鼠标移动（保留给 hideOnHover 使用） */
  function handleMouseMove() {
    // 精灵宠物不需要眼球追踪
    // 光标位置由 useDevice 的 hideOnHover 处理
  }

  /** 触发开心状态（可由外部事件触发） */
  function handleHappy() {
    stateMachine.setState('HAPPY')
  }

  /** 拖拽开始 */
  function handleDragStart() {
    stateMachine.signalDragStart()
  }

  /** 拖拽结束 */
  function handleDragEnd() {
    stateMachine.signalDragEnd()
  }

  /** 点击 */
  function handleClick() {
    stateMachine.signalClick()
  }

  return {
    modelSize,
    handleLoad,
    handleDestroy,
    handleResize,
    handleActivity,
    handleMouseChange,
    handleMouseMove,
    handleHappy,
    handleDragStart,
    handleDragEnd,
    handleClick,
  }
}
