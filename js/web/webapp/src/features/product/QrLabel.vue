<script setup lang="ts">
import { downloadLabelSvg, qrSvg, type QrLabelData } from '@/shared/utils/qr'
import { ref, watchEffect } from 'vue'

const props = defineProps<{ data: QrLabelData }>()
const svg = ref('')
watchEffect(async () => {
  svg.value = await qrSvg(props.data.qr_value, 150)
})
</script>

<template>
  <div class="flex flex-col items-center gap-1 rounded-xl border border-default bg-default p-4 text-center">
    <div class="text-sm font-bold text-[#0f5fa8]">FOMECO <span class="text-xs text-primary-600">Mini-MES</span></div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="size-36" v-html="svg" />
    <div class="text-lg font-bold">{{ data.item_code }}</div>
    <div class="text-xs text-toned">{{ data.item_name }}</div>
    <div class="text-sm">{{ data.operation_code }} · {{ data.operation_name }}</div>
    <div class="font-mono text-xs text-toned">{{ data.qr_value }}</div>
    <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-download" label="Tải SVG" class="mt-1" @click="downloadLabelSvg(data)" />
  </div>
</template>
