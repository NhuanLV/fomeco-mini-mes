<script setup lang="ts">
import { cancelReport } from '@/lib/api'
import type { ReportRow } from '@/lib/types'
import { fmtDateTime } from '@/shared/utils/format'
import { showError, showSuccess, showWarn } from '@/shared/utils/toast'
import { ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ report: ReportRow | null }>()
const emit = defineEmits<{ saved: [] }>()

const reason = ref('')
const saving = ref(false)
watch(open, (v) => v && (reason.value = ''))

async function confirm() {
  if (!props.report) return
  if (!reason.value.trim()) return showWarn('Vui lòng nhập lý do hủy báo cáo.')
  saving.value = true
  try {
    await cancelReport(props.report.id, reason.value.trim())
    showSuccess('Đã hủy báo cáo sản xuất thành công.')
    open.value = false
    emit('saved')
  } catch (e) {
    const msg = (e as Error).message
    showError(msg && !/fetch/i.test(msg) ? msg : 'Không thể hủy báo cáo. Vui lòng thử lại.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Hủy báo cáo">
    <template #body>
      <div v-if="report" class="flex flex-col gap-4">
        <div class="flex justify-center"><UIcon name="i-lucide-triangle-alert" class="size-10 text-warning" /></div>
        <p class="leading-7">
          Bạn có chắc chắn muốn hủy báo cáo mã hàng <b>{{ report.item_code }}</b>, công đoạn
          <b>{{ report.operation_code }}</b>, lúc <b>{{ fmtDateTime(report.reported_at) }}</b>? Báo cáo
          sau khi hủy sẽ không được tính vào sản lượng và tồn BTP.
        </p>
        <UFormField label="Lý do hủy" required>
          <UTextarea v-model="reason" :rows="3" class="w-full" placeholder="Nhập lý do hủy..." data-testid="cancel-reason" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="outline" label="Không hủy" @click="open = false" />
        <UButton color="error" label="Xác nhận hủy" icon="i-lucide-ban" :loading="saving" data-testid="confirm-cancel" @click="confirm" />
      </div>
    </template>
  </UModal>
</template>
