<script setup lang="ts">
import { Empty, Modal } from 'antdv-next'

const modelValue = defineModel<boolean>()
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
    <Empty
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
      :description="$t('pages.preference.model.behaviorModal.labels.spritePetNoBehavior')"
    />
  </Modal>
</template>
