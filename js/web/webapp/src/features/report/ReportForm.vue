<script setup lang="ts">
import { createReport, findByCodes, getStock, listItemOperations } from '@/lib/api'
import type { ItemOperation, ReportMethod } from '@/lib/types'
import { useAuthStore } from '@/shared/stores/auth'
import { fmtQty } from '@/shared/utils/format'
import { parseQrValue } from '@/shared/utils/qr'
import { showError, showSuccess, showToast, showWarn } from '@/shared/utils/toast'
import { useQuery, useQueryCache } from '@pinia/colada'
import { computed, ref, watch } from 'vue'
import QrScannerDialog from './QrScannerDialog.vue'
import QtyInputs from './QtyInputs.vue'
import { emptyQty, qtyPayload, validateQty } from './qty'

const props = defineProps<{ mode: ReportMethod }>()
const emit = defineEmits<{ saved: [] }>()

const { currentUser } = useAuthStore()
const cache = useQueryCache()

const { data: itemOps, isLoading } = useQuery({
  key: ['item-operations'],
  query: () => listItemOperations(),
})

const activeOps = computed(() => (itemOps.value ?? []).filter((o) => o.active))

const itemOptions = computed(() => {
  const map = new Map<string, { label: string; value: string }>()
  for (const o of activeOps.value) {
    if (!map.has(o.item_id)) map.set(o.item_id, { label: `${o.item_code} — ${o.item_name}`, value: o.item_id })
  }
  return [...map.values()]
})

const itemId = ref<string | undefined>()
const operationId = ref<string | undefined>()
const qty = ref(emptyQty())
const keepSelection = ref(true)
const saving = ref(false)
const scanOpen = ref(false)
const scanned = ref<ItemOperation | null>(null)

const opOptions = computed(() =>
  activeOps.value
    .filter((o) => o.item_id === itemId.value)
    .map((o) => ({ label: `${o.operation_code} · ${o.operation_name}`, value: o.operation_id })),
)

watch(itemId, () => {
  if (!opOptions.value.some((o) => o.value === operationId.value)) operationId.value = undefined
})

const selected = computed(() =>
  activeOps.value.find((o) => o.item_id === itemId.value && o.operation_id === operationId.value),
)

async function onDetected(text: string) {
  if (!text.trim()) {
    showWarn('Vui lòng quét hoặc nhập nội dung mã QR.')
    return
  }
  const parsed = parseQrValue(text)
  if (!parsed) {
    showError('Mã QR không hợp lệ. Vui lòng kiểm tra và quét lại.')
    return
  }
  try {
    const found = await findByCodes(parsed.itemCode, parsed.opCode)
    if (!found || !found.active) {
      showError('Không tìm thấy mã hàng hoặc công đoạn tương ứng trong danh mục ERP.')
      return
    }
    scanned.value = found
    itemId.value = found.item_id
    operationId.value = found.operation_id
    scanOpen.value = false
    showSuccess(`Đã nhận diện mã hàng ${found.item_code} và công đoạn ${found.operation_code}.`)
  } catch (e) {
    showError((e as Error).message)
  }
}

function reset(all = true) {
  qty.value = emptyQty()
  if (all) {
    itemId.value = undefined
    operationId.value = undefined
    scanned.value = null
  }
}

async function checkNegativeStock(itemIdV: string, opId: string) {
  if (!currentUser.value?.unit_id) return
  try {
    const rows = await getStock({ unitId: currentUser.value.unit_id, itemId: itemIdV })
    const row = rows.find((r) => r.operation_id === opId)
    if (row && row.closing_qty < 0) {
      showToast({
        color: 'warning',
        summary: 'Cảnh báo tồn BTP âm',
        detail: `Tồn BTP tại mã hàng ${row.item_code}, công đoạn ${row.operation_code}, xí nghiệp ${row.unit_name} đang âm ${fmtQty(Math.abs(row.closing_qty))} chiếc. Vui lòng kiểm tra dữ liệu nhận và chuyển BTP.`,
        life: 8000,
        closable: true,
      })
    }
  } catch {
    /* không chặn luồng lưu */
  }
}

async function save() {
  if (!itemId.value) return showWarn('Vui lòng chọn mã hàng.')
  if (!operationId.value) return showWarn('Vui lòng chọn công đoạn.')
  if (!selected.value) return showWarn('Công đoạn không thuộc mã hàng đã chọn. Vui lòng chọn lại.')
  const err = validateQty(qty.value)
  if (err) return showWarn(err)

  saving.value = true
  try {
    await createReport({
      item_id: itemId.value,
      operation_id: operationId.value,
      method: props.mode,
      ...qtyPayload(qty.value),
    })
    showSuccess('Đã lưu báo cáo sản xuất thành công.')
    const it = itemId.value
    const op = operationId.value
    reset(!keepSelection.value)
    if (props.mode === 'qr' && !keepSelection.value) scanned.value = null
    void cache.invalidateQueries({ key: ['reports'] })
    void cache.invalidateQueries({ key: ['dashboard'] })
    emit('saved')
    void checkNegativeStock(it, op)
  } catch (e) {
    const msg = (e as Error).message
    showError(msg && !/fetch/i.test(msg) ? msg : 'Không thể lưu báo cáo. Vui lòng thử lại.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold">Thông tin báo cáo sản xuất</h2>
        <p class="text-sm text-toned">Sản lượng theo công đoạn</p>
      </div>
      <UBadge color="neutral" label="Đơn vị: chiếc" />
    </div>

    <div v-if="mode === 'qr'" class="flex flex-wrap items-center gap-3">
      <UButton
        icon="i-lucide-scan-qr-code"
        label="Quét mã QR"
        size="lg"
        data-testid="open-scan"
        @click="scanOpen = true"
      />
      <span v-if="!scanned" class="text-sm text-toned">Chưa quét mã QR</span>
      <UBadge
        v-else
        color="success"
        size="lg"
        icon="i-lucide-circle-check"
        :label="`${scanned.item_code} · ${scanned.operation_code} — ${scanned.operation_name}`"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <UFormField label="Mã hàng" required>
        <USelectMenu
          v-model="itemId"
          :items="itemOptions"
          value-key="value"
          placeholder="Chọn mã hàng"
          :search-input="{ placeholder: 'Tìm mã hàng...' }"
          class="w-full"
          size="lg"
          :loading="isLoading"
          :disabled="mode === 'qr'"
          data-testid="item-select"
        />
      </UFormField>
      <UFormField label="Công đoạn" required>
        <USelectMenu
          v-model="operationId"
          :items="opOptions"
          value-key="value"
          :placeholder="itemId ? 'Chọn công đoạn' : 'Chọn mã hàng trước'"
          class="w-full"
          size="lg"
          :disabled="mode === 'qr' || !itemId"
          data-testid="op-select"
        />
      </UFormField>
    </div>

    <QtyInputs v-model="qty" :large="mode === 'qr'" />

    <USeparator />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="text-sm text-toned">
        <div>
          Người báo cáo: <b class="text-default">{{ currentUser?.full_name }}</b>
        </div>
        <div>{{ currentUser?.unit_name || 'Chưa phân công đơn vị' }}</div>
        <UCheckbox v-model="keepSelection" class="mt-2" label="Giữ mã hàng & công đoạn sau khi lưu" />
      </div>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-rotate-ccw"
          label="Nhập lại"
          size="lg"
          @click="reset(true)"
        />
        <UButton
          icon="i-lucide-check"
          label="Lưu báo cáo"
          size="lg"
          :loading="saving"
          data-testid="save-report"
          @click="save"
        />
      </div>
    </div>

    <QrScannerDialog v-model:open="scanOpen" @detected="onDetected" />
  </div>
</template>
