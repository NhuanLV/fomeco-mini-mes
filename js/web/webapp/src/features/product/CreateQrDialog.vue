<script setup lang="ts">
import { createQrCodes } from '@/lib/api'
import type { ItemOperation } from '@/lib/types'
import { showError, showSuccess, showWarn } from '@/shared/utils/toast'
import { computed, ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ itemOps: ItemOperation[]; presetItemId?: string | null }>()
const emit = defineEmits<{ created: [itemId: string, opIds: string[]] }>()

const itemId = ref<string | undefined>()
const opId = ref<string>('all')
const saving = ref(false)

watch(open, (v) => {
  if (v) {
    itemId.value = props.presetItemId ?? undefined
    opId.value = 'all'
  }
})

const itemOptions = computed(() => {
  const map = new Map<string, { label: string; value: string }>()
  for (const o of props.itemOps) {
    if (!map.has(o.item_id)) map.set(o.item_id, { label: `${o.item_code} — ${o.item_name}`, value: o.item_id })
  }
  return [...map.values()]
})
const ops = computed(() => props.itemOps.filter((o) => o.item_id === itemId.value))
const opOptions = computed(() => [
  { label: `Tất cả công đoạn (${ops.value.length})`, value: 'all' },
  ...ops.value.map((o) => ({
    label: `${o.operation_code} · ${o.operation_name}${o.qr_value ? ' (đã tạo)' : ''}`,
    value: o.operation_id,
  })),
])
const target = computed(() => (opId.value === 'all' ? ops.value : ops.value.filter((o) => o.operation_id === opId.value)))
const willCreate = computed(() => target.value.filter((o) => !o.qr_value).length)

async function create() {
  if (!itemId.value) return showWarn('Vui lòng chọn mã hàng.')
  saving.value = true
  try {
    const opIds = target.value.map((o) => o.operation_id)
    const n = willCreate.value ? await createQrCodes(itemId.value, opId.value === 'all' ? null : opIds) : 0
    showSuccess(n ? `Đã tạo ${n} mã QR.` : 'Các công đoạn đã có mã QR, hiển thị để in lại.')
    open.value = false
    emit('created', itemId.value, opIds)
  } catch (e) {
    showError((e as Error).message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Tạo mã QR cho mã hàng và công đoạn">
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Mã hàng" required>
          <USelectMenu v-model="itemId" :items="itemOptions" value-key="value" placeholder="Chọn mã hàng" class="w-full" data-testid="qr-item" />
        </UFormField>
        <UFormField label="Công đoạn" required>
          <USelect v-model="opId" :items="opOptions" :disabled="!itemId" :placeholder="itemId ? '' : 'Chọn mã hàng trước'" class="w-full" />
        </UFormField>
        <div class="flex items-center justify-between rounded-lg bg-elevated/60 px-4 py-3">
          <span>Số mã QR sẽ tạo</span>
          <b class="text-lg text-primary-600">{{ willCreate }} mã</b>
        </div>
        <p class="text-xs text-toned">Nội dung QR cố định theo mã hàng và công đoạn: <code>MÃ HÀNG|MÃ CÔNG ĐOẠN</code>.</p>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" icon="i-lucide-x" label="Hủy" @click="open = false" />
        <UButton icon="i-lucide-qr-code" label="Tạo mã QR" :loading="saving" :disabled="!itemId" data-testid="create-qr" @click="create" />
      </div>
    </template>
  </UModal>
</template>
