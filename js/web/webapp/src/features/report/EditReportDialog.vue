<script setup lang="ts">
import { updateReport } from '@/lib/api'
import type { ReportRow } from '@/lib/types'
import { fmtDateTime } from '@/shared/utils/format'
import { showError, showSuccess, showWarn } from '@/shared/utils/toast'
import { ref, watch } from 'vue'
import QtyInputs from './QtyInputs.vue'
import { qtyPayload, validateQty, type QtyForm } from './qty'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ report: ReportRow | null }>()
const emit = defineEmits<{ saved: [] }>()

const qty = ref<QtyForm>({ ok_qty: '', ng_qty: '', received_qty: '', transferred_qty: '' })
const saving = ref(false)

watch(
  () => [open.value, props.report] as const,
  ([o, r]) => {
    if (o && r) {
      qty.value = {
        ok_qty: String(r.ok_qty),
        ng_qty: String(r.ng_qty),
        received_qty: r.received_qty ? String(r.received_qty) : '',
        transferred_qty: r.transferred_qty ? String(r.transferred_qty) : '',
      }
    }
  },
  { immediate: true },
)

async function save() {
  if (!props.report) return
  if (props.report.status === 'cancelled') return showWarn('Báo cáo đã hủy, không thể chỉnh sửa.')
  const err = validateQty(qty.value)
  if (err) return showWarn(err)
  saving.value = true
  try {
    await updateReport(props.report.id, qtyPayload(qty.value))
    showSuccess('Đã cập nhật báo cáo sản xuất thành công.')
    open.value = false
    emit('saved')
  } catch (e) {
    const msg = (e as Error).message
    showError(msg && !/fetch/i.test(msg) ? msg : 'Không thể cập nhật báo cáo. Vui lòng thử lại.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Chỉnh sửa báo cáo" :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div v-if="report" class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-3 rounded-lg bg-elevated/60 p-3 text-sm">
          <div>
            <div class="text-xs text-toned">Mã hàng</div>
            <div class="font-semibold">{{ report.item_code }} — {{ report.item_name }}</div>
          </div>
          <div>
            <div class="text-xs text-toned">Công đoạn</div>
            <div class="font-semibold">{{ report.operation_code }} · {{ report.operation_name }}</div>
          </div>
          <div>
            <div class="text-xs text-toned">Người báo cáo</div>
            <div>{{ report.reporter_name }} — {{ report.unit_name }}</div>
          </div>
          <div>
            <div class="text-xs text-toned">Thời gian báo cáo</div>
            <div>{{ fmtDateTime(report.reported_at) }}</div>
          </div>
        </div>
        <p class="text-xs text-toned">
          Người báo cáo, thời gian báo cáo gốc, mã hàng và công đoạn được giữ nguyên.
        </p>
        <QtyInputs v-model="qty" />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="Hủy" icon="i-lucide-x" @click="open = false" />
        <UButton label="Lưu thay đổi" icon="i-lucide-check" :loading="saving" data-testid="save-edit" @click="save" />
      </div>
    </template>
  </UModal>
</template>
