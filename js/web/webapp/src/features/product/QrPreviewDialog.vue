<script setup lang="ts">
import { printLabels, type QrLabelData } from '@/shared/utils/qr'
import { showWarn } from '@/shared/utils/toast'
import QrLabel from './QrLabel.vue'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ labels: QrLabelData[] }>()

async function print() {
  const ok = await printLabels(props.labels)
  if (!ok) showWarn('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép cửa sổ bật lên (pop-up) và thử lại.')
}
</script>

<template>
  <UModal v-model:open="open" title="Mã QR mã hàng và công đoạn" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QrLabel v-for="l in labels" :key="l.qr_value" :data="l" />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <span class="text-sm text-toned">{{ labels.length }} tem QR</span>
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" label="Đóng" @click="open = false" />
          <UButton icon="i-lucide-printer" label="In tem QR" data-testid="print-qr" @click="print" />
        </div>
      </div>
    </template>
  </UModal>
</template>
