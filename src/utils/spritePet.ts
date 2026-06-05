import { convertFileSrc } from '@tauri-apps/api/core'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { AnimatedSprite, Application, Assets, Texture } from 'pixi.js'

import type { ModelSize } from '@/composables/useModel'

import type { PetState } from './spriteStateMachine'
import { join } from './path'

/** Sprite sheet 配置文件格式 */
export interface SpritePetConfig {
  frameWidth: number
  frameHeight: number
  states: Record<string, {
    file: string
    frames: number
    fps: number
    loop: boolean
  }>
}

class SpritePet {
  private app: Application | null = null
  private currentAnimation: AnimatedSprite | null = null
  private animations = new Map<PetState, AnimatedSprite>()
  private config: SpritePetConfig | null = null
  private basePath = ''
  private onCompleteCallback: (() => void) | null = null

  /** 初始化 PixiJS Application */
  private async initApp(): Promise<void> {
    if (this.app) return

    const view = document.getElementById('spriteCanvas') as HTMLCanvasElement

    this.app = new Application()

    await this.app.init({
      view,
      resizeTo: window,
      backgroundAlpha: 0,
      autoDensity: true,
      resolution: devicePixelRatio,
    })
  }

  /** 加载精灵宠物配置和纹理 */
  async load(basePath: string, configFile: string): Promise<{ width: number, height: number }> {
    await this.initApp()
    this.destroy()

    this.basePath = basePath

    const configText = await readTextFile(configFile)
    this.config = JSON.parse(configText) as SpritePetConfig

    const { frameWidth, frameHeight, states } = this.config

    // 预加载所有状态的纹理
    const textureMap = new Map<string, Texture>()

    for (const [, stateConfig] of Object.entries(states)) {
      const url = convertFileSrc(join(basePath, stateConfig.file))

      if (!textureMap.has(stateConfig.file)) {
        textureMap.set(stateConfig.file, await Assets.load(url))
      }
    }

    // 为每个状态创建 AnimatedSprite
    for (const [stateName, stateConfig] of Object.entries(states)) {
      const baseTexture = textureMap.get(stateConfig.file)!
      const frames: Texture[] = []

      for (let i = 0; i < stateConfig.frames; i++) {
        const frame = new Texture({
          source: baseTexture.source,
          frame: {
            x: i * frameWidth,
            y: 0,
            width: frameWidth,
            height: frameHeight,
          },
        })

        frames.push(frame)
      }

      const anim = new AnimatedSprite(frames)

      anim.animationSpeed = stateConfig.fps / 60
      anim.loop = stateConfig.loop

      if (!stateConfig.loop) {
        anim.onComplete = () => this.onCompleteCallback?.()
      }

      anim.anchor.set(0.5)
      anim.visible = false

      this.app?.stage.addChild(anim)
      this.animations.set(stateName as PetState, anim)
    }

    // 默认显示 IDLE
    const idleAnim = this.animations.get('IDLE')

    if (idleAnim) {
      idleAnim.visible = true
      idleAnim.gotoAndPlay(0)
      this.currentAnimation = idleAnim
    }

    return { width: frameWidth, height: frameHeight }
  }

  /** 切换到指定状态的动画 */
  playState(state: PetState): void {
    const anim = this.animations.get(state)

    if (!anim) return

    if (this.currentAnimation) {
      this.currentAnimation.visible = false
      this.currentAnimation.stop()
    }

    anim.visible = true
    anim.gotoAndPlay(0)
    this.currentAnimation = anim
  }

  /** 注册动画播放完成回调 */
  setOnComplete(callback: () => void): void {
    this.onCompleteCallback = callback
  }

  /** 缩放精灵以适应窗口 */
  resize(modelSize: ModelSize): void {
    if (!this.currentAnimation) return

    const { width, height } = modelSize
    const scaleX = innerWidth / width
    const scaleY = innerHeight / height
    const scale = Math.min(scaleX, scaleY)

    for (const anim of this.animations.values()) {
      anim.scale.set(scale)
      anim.x = innerWidth / 2
      anim.y = innerHeight / 2
    }
  }

  /** 销毁所有资源 */
  destroy(): void {
    for (const anim of this.animations.values()) {
      anim.destroy()
    }

    this.animations.clear()
    this.currentAnimation = null
    this.config = null
    this.onCompleteCallback = null
  }
}

const spritePet = new SpritePet()

export default spritePet
