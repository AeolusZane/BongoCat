export type PetState = 'IDLE' | 'TYPING' | 'SLEEP' | 'HAPPY' | 'DRAG' | 'CLICK'

interface StateMachineOptions {
  /** 无操作多久进入睡眠（毫秒），默认 30000 */
  idleTimeout: number
  /** HAPPY 状态持续多久后回到 IDLE（毫秒），默认 2000 */
  happyDuration: number
  /** 状态切换回调 */
  onStateChange: (state: PetState, prevState: PetState) => void
  /** 一次性状态播放完成回调（如 CLICK 播完） */
  onStateComplete: (state: PetState) => void
}

type EventName = 'stateChange' | 'stateComplete'

class SpriteStateMachine {
  private currentState: PetState = 'IDLE'
  private prevState: PetState = 'IDLE'
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private happyTimer: ReturnType<typeof setTimeout> | null = null
  private options: StateMachineOptions
  private listeners = new Map<EventName, Set<(state: PetState, prev: PetState) => void>>()

  constructor(options: StateMachineOptions) {
    this.options = options
  }

  get state(): PetState {
    return this.currentState
  }

  /** 切换到指定状态 */
  setState(next: PetState): void {
    if (next === this.currentState && next !== 'CLICK') return

    this.prevState = this.currentState
    this.currentState = next
    this.clearTimers()
    this.emit('stateChange', next, this.prevState)

    switch (next) {
      case 'HAPPY':
        this.happyTimer = setTimeout(() => {
          this.setState('IDLE')
        }, this.options.happyDuration)
        break

      case 'CLICK':
        // CLICK 是一次性动画，播完后由 onStateComplete 回调恢复
        break

      case 'IDLE':
        this.startIdleTimer()
        break
    }
  }

  /** 通知有用户活动（键盘/鼠标/手柄），重置空闲计时 */
  signalActivity(): void {
    this.resetIdleTimer()

    if (this.currentState === 'SLEEP' || this.currentState === 'IDLE') {
      this.setState('TYPING')
    }
  }

  /** 通知点击事件 */
  signalClick(): void {
    this.setState('CLICK')
  }

  /** 通知开始拖拽 */
  signalDragStart(): void {
    this.setState('DRAG')
  }

  /** 通知结束拖拽 */
  signalDragEnd(): void {
    this.setState('IDLE')
  }

  /** 通知一次性动画播放完成（由 SpritePet 调用） */
  notifyAnimationComplete(): void {
    this.emit('stateComplete', this.currentState, this.prevState)

    if (this.currentState === 'CLICK') {
      this.setState('IDLE')
    }
  }

  /** 开始空闲计时（从 TYPING 切到 IDLE 时自动调用） */
  private startIdleTimer(): void {
    this.clearIdleTimer()
    this.idleTimer = setTimeout(() => {
      if (this.currentState === 'IDLE') {
        this.setState('SLEEP')
      }
    }, this.options.idleTimeout)
  }

  /** 重置空闲计时（有活动时调用，从 SLEEP 唤醒） */
  private resetIdleTimer(): void {
    this.clearIdleTimer()
    if (this.currentState === 'IDLE') {
      this.startIdleTimer()
    }
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  private clearTimers(): void {
    this.clearIdleTimer()
    if (this.happyTimer) {
      clearTimeout(this.happyTimer)
      this.happyTimer = null
    }
  }

  on(event: EventName, callback: (state: PetState, prev: PetState) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: EventName, callback: (state: PetState, prev: PetState) => void): void {
    this.listeners.get(event)?.delete(callback)
  }

  private emit(event: EventName, state: PetState, prev: PetState): void {
    this.listeners.get(event)?.forEach(cb => cb(state, prev))
  }

  destroy(): void {
    this.clearTimers()
    this.listeners.clear()
  }
}

export default SpriteStateMachine
