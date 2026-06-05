import { resolveResource } from '@tauri-apps/api/path'
import { filter, find } from 'es-toolkit/compat'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { join } from '@/utils/path'

export type ModelMode = 'standard' | 'keyboard' | 'gamepad'

export interface Model {
  id: string
  path: string
  mode: ModelMode
  isPreset: boolean
}

export const useModelStore = defineStore('model', () => {
  const modelReady = ref(false)
  const models = ref<Model[]>([])
  const currentModel = ref<Model>()

  const init = async () => {
    const modelsPath = await resolveResource('assets')

    const nextModels = filter(models.value, { isPreset: false })
    const presetModels = filter(models.value, { isPreset: true })

    // 精灵宠物只有一个预设模型
    const modes: ModelMode[] = ['standard']

    for (const mode of modes) {
      const matched = find(presetModels, { mode })

      nextModels.unshift({
        id: matched?.id ?? nanoid(),
        mode,
        isPreset: true,
        path: join(modelsPath, 'sprite-pet'),
      })
    }

    const matched = find(nextModels, { id: currentModel.value?.id })

    currentModel.value = matched ?? nextModels[0]

    models.value = nextModels
  }

  return {
    modelReady,
    models,
    currentModel,
    init,
  }
})
