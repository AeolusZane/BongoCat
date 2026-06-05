import type { LiteralUnion } from 'type-fest'

import { invoke } from '@tauri-apps/api/core'
import { computed, reactive, watch } from 'vue'

import { INVOKE_KEY, LISTEN_KEY } from '@/constants'
import { useModelStore } from '@/stores/model'

import { useModel } from './useModel'
import { useTauriListen } from './useTauriListen'

type GamepadEventName = LiteralUnion<'LeftStickX' | 'LeftStickY' | 'RightStickX' | 'RightStickY' | 'LeftThumb' | 'RightThumb', string>

interface GamepadEvent {
  kind: 'ButtonChanged' | 'AxisChanged'
  name: GamepadEventName
  value: number
}

interface StickState {
  x: number
  y: number
  moved: boolean
  pressed: boolean
}

interface Sticks {
  left: StickState
  right: StickState
}

const INITIAL_STICK_STATE: StickState = { x: 0, y: 0, moved: false, pressed: false }

export function useGamepad() {
  const modelStore = useModelStore()
  const { handleActivity } = useModel()
  const sticks = reactive<Sticks>({
    left: { ...INITIAL_STICK_STATE },
    right: { ...INITIAL_STICK_STATE },
  })

  const stickActive = computed(() => ({
    left: sticks.left.moved || sticks.left.pressed,
    right: sticks.right.moved || sticks.right.pressed,
  }))

  watch(() => modelStore.currentModel?.mode, (mode) => {
    if (mode === 'gamepad') {
      return invoke(INVOKE_KEY.START_GAMEPAD_LISTING)
    }

    invoke(INVOKE_KEY.STOP_GAMEPAD_LISTING)
  }, { immediate: true })

  // 摇杆活动时触发状态机
  watch(sticks.left, ({ x, y, moved, pressed }) => {
    sticks.left.moved = x !== 0 || y !== 0

    if (moved || pressed) {
      handleActivity()
    }
  }, { deep: true })

  watch(sticks.right, ({ x, y, moved, pressed }) => {
    sticks.right.moved = x !== 0 || y !== 0

    if (moved || pressed) {
      handleActivity()
    }
  }, { deep: true })

  useTauriListen<GamepadEvent>(LISTEN_KEY.GAMEPAD_CHANGED, ({ payload }) => {
    const { name, value } = payload

    switch (name) {
      case 'LeftStickX':
        sticks.left.x = value
        break
      case 'LeftStickY':
        sticks.left.y = value
        break
      case 'RightStickX':
        sticks.right.x = value
        break
      case 'RightStickY':
        sticks.right.y = value
        break
      case 'LeftThumb':
        sticks.left.pressed = value !== 0
        break
      case 'RightThumb':
        sticks.right.pressed = value !== 0
        break
      default:
        // 按钮按下 → 活动信号
        if (value > 0) {
          handleActivity()
        }
        break
    }
  })

  return {
    stickActive,
  }
}
