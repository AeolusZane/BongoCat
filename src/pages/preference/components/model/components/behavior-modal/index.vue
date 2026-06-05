<script setup lang="ts">
import type { MotionInfo } from 'easy-live2d'

import { emit } from '@tauri-apps/api/event'
import { Button, Empty, Modal, Segmented } from 'antdv-next'
import { isEmpty } from 'es-toolkit/compat'
import { ref } from 'vue'

import { LISTEN_KEY } from '@/constants'
import { useModelStore } from '@/stores/model'

const modelValue = defineModel<boolean>()
const modelStore = useModelStore()
const value = ref<'motion' | 'expression'>('motion')

function startMotion(motion: MotionInfo) {
  emit(LISTEN_KEY.START_MOTION, motion)
}

function setExpression(index: number) {
  emit(LISTEN_KEY.SET_EXPRESSION, index)
}
</script>

<template>
  <Modal
    v-model:open="modelValue"
    :cancel-text="false"
    centered
    :footer="null"
    force-render
    :title="$t('pages.preference.model.behaviorModal.title')"
  >
    <Segmented
      v-model:value="value"
      block
      class="mb-4"
      :options="[
        { label: $t('pages.preference.model.behaviorModal.labels.motion'), value: 'motion' },
        { label: $t('pages.preference.model.behaviorModal.labels.expression'), value: 'expression' },
      ]"
    />

    <div
      v-show="value === 'motion'"
      class="flex flex-col gap-4"
    >
      <Empty
        v-if="isEmpty(modelStore.currentMotions)"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />

      <template v-else>
        <div
          v-for="([groupName, motions], groupIndex) in modelStore.currentMotions"
          :key="groupName"
        >
          <div class="mb-2">
            {{ $t('pages.preference.model.behaviorModal.labels.motionGroupIndex', { index: groupIndex + 1 }) }}
          </div>

          <div class="b-1 b-solid b-border rounded-lg">
            <template
              v-for="(item, index) in motions"
              :key="item.no"
            >
              <div class="flex items-center justify-between px-4 py-2 not-last:(b-b b-b-solid b-border-sec)">
                <span>{{ $t('pages.preference.model.behaviorModal.labels.motionIndex', { index: index + 1 }) }}</span>

                <Button
                  class="inline-flex items-center justify-center"
                  @click="startMotion(item)"
                >
                  <template #icon>
                    <div class="i-lucide:play" />
                  </template>
                </Button>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>

    <div
      v-show="value === 'expression'"
      class="flex flex-col"
    >
      <Empty
        v-if="isEmpty(modelStore.currentExpressions)"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />

      <div class="b-1 b-solid b-border rounded-lg">
        <template
          v-for="(item, index) in modelStore.currentExpressions"
          :key="item.name"
        >
          <div class="flex items-center justify-between px-4 py-2 not-last:(b-b b-b-solid b-border-sec)">
            <span>{{ $t('pages.preference.model.behaviorModal.labels.expressionIndex', { index: index + 1 }) }}</span>

            <Button
              class="inline-flex items-center justify-center"
              @click="setExpression(index)"
            >
              <template #icon>
                <div class="i-lucide:play" />
              </template>
            </Button>
          </div>
        </template>
      </div>
    </div>
  </Modal>
</template>
