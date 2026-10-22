<script setup lang="ts">
// Xem tồn BTP (spec 4.5): theo xí nghiệp / theo mã hàng, có số dư đầu kỳ
import { getStock, listItems } from '@/lib/api'
import type { StockRow } from '@/lib/types'
import { exportExcel } from '@/shared/utils/excel'
import { endOfDayIso, fmtDateTime, fmtQty, startOfDayIso, today } from '@/shared/utils/format'
import { showError, showWarn } from '@/shared/utils/toast'
import { useQuery } from '@pinia/colada'
import { computed, ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })

const fromAll = ref(true)
const from = ref('')
const to = ref(today())
const view = ref<'unit' | 'item'>('unit')
const itemId = ref<string | undefined>()
const rows = ref<StockRow[]>([])
const loading = ref(false)
const loadedAt = ref<string>('')

const { data: items } = useQuery({ key: ['items'], query: listItems })
const itemOptions = computed(() =>
  (items.value ?? []).map((i) => ({ label: `${i.code} — ${i.name}`, value: i.id })),
)

async function load() {
  if (!fromAll.value && from.value && to.value && from.value > to.value) {
    return showWarn('Từ ngày không được lớn hơn Đến ngày.')
  }
  if (view.value === 'item' && !itemId.value) {
    rows.value = []
    return
  }
  loading.value = true
  try {
    const toIso = to.value === today() ? new Date().toISOString() : endOfDayIso(to.value)
    rows.value = await getStock({
      from: fromAll.value ? null : startOfDayIso(from.value),
      to: toIso,
      itemId: view.value === 'item' ? itemId.value : null,
    })
    loadedAt.value = new Date().toISOString()
  } catch (e) {
    showError((e as Error).message)
  } finally {
    loading.value = false
  }
}

watch(open, (v) => v && load())
watch([fromAll, view, itemId], () => open.value && load())

// Theo xí nghiệp: gộp theo xí nghiệp + công đoạn
const byUnit = computed(() => {
  const map = new Map<string, StockRow & { items: number }>()
  for (const r of rows.value) {
    const k = `${r.unit_id}|${r.operation_id}`
    const cur = map.get(k)
    if (!cur) map.set(k, { ...r, items: 1 })
    else {
      cur.opening_qty += r.opening_qty
      cur.received_qty += r.received_qty
      cur.transferred_qty += r.transferred_qty
      cur.closing_qty += r.closing_qty
      cur.report_count += r.report_count
      cur.items++
    }
  }
  return [...map.values()].sort(
    (a, b) => a.unit_name.localeCompare(b.unit_name, 'vi') || a.operation_name.localeCompare(b.operation_name, 'vi'),
  )
})

// Theo mã hàng: từng công đoạn (cộng các xí nghiệp) + lệch chuyển → nhận công đoạn sau
const byItem = computed(() => {
  const map = new Map<string, StockRow>()
  for (const r of rows.value) {
    const cur = map.get(r.operation_id)
    if (!cur) map.set(r.operation_id, { ...r })
    else {
      cur.opening_qty += r.opening_qty
      cur.received_qty += r.received_qty
      cur.transferred_qty += r.transferred_qty
      cur.closing_qty += r.closing_qty
    }
  }
  const list = [...map.values()].sort((a, b) => a.seq - b.seq)
  return list.map((r, i) => {
    const next = list[i + 1]
    return { ...r, next_code: next?.operation_code, gap: next ? r.transferred_qty - next.received_qty : null }
  })
})

const reportCount = computed(() => rows.value.reduce((a, r) => a + r.report_count, 0))
const negatives = computed(() => rows.value.filter((r) => r.closing_qty < 0))

function doExport() {
  if (view.value === 'unit') {
    exportExcel(
      `ton-btp-theo-xi-nghiep-${today()}.xlsx`,
      'Ton BTP',
      ['Xí nghiệp', 'Mã công đoạn', 'Tên công đoạn', 'Tồn đầu kỳ', 'Nhận BTP', 'Chuyển BTP', 'Tồn cuối kỳ'],
      byUnit.value.map((r) => [r.unit_name, r.operation_code, r.operation_name, r.opening_qty, r.received_qty, r.transferred_qty, r.closing_qty]),
    )
  } else {
    exportExcel(
      `ton-btp-${byItem.value[0]?.item_code ?? 'ma-hang'}-${today()}.xlsx`,
      'Ton BTP',
      ['Thứ tự', 'Mã công đoạn', 'Tên công đoạn', 'Tồn đầu kỳ', 'Nhận BTP', 'Chuyển BTP', 'Tồn cuối kỳ', 'Lệch chuyển→nhận công đoạn sau'],
      byItem.value.map((r) => [r.seq, r.operation_code, r.operation_name, r.opening_qty, r.received_qty, r.transferred_qty, r.closing_qty, r.gap]),
    )
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Xem Tồn BTP" fullscreen :ui="{ body: 'flex flex-col gap-4' }">
    <template #body>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
        <UFormField label="Từ ngày">
          <UInput v-model="from" type="date" class="w-full" :disabled="fromAll" />
        </UFormField>
        <UFormField label="Đến ngày">
          <UInput v-model="to" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Chiều xem báo cáo">
          <USelect
            v-model="view"
            :items="[
              { label: 'Theo xí nghiệp', value: 'unit' },
              { label: 'Theo mã hàng', value: 'item' },
            ]"
            class="w-full"
          />
        </UFormField>
        <UFormField v-if="view === 'item'" label="Mã hàng">
          <USelectMenu v-model="itemId" :items="itemOptions" value-key="value" placeholder="Chọn mã hàng" class="w-full" />
        </UFormField>
        <div v-else />
        <div class="flex gap-2">
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" title="Tải lại" @click="load" />
          <UButton icon="i-lucide-file-spreadsheet" color="neutral" variant="outline" label="Xuất Excel" :disabled="!rows.length" @click="doExport" />
        </div>
      </div>
      <UCheckbox v-model="fromAll" label="Tính tồn từ đầu đến thời điểm hiện tại" />

      <UAlert
        v-for="r in negatives"
        :key="`${r.unit_id}${r.item_id}${r.operation_id}`"
        color="warning"
        icon="i-lucide-triangle-alert"
        :description="`Tồn BTP tại mã hàng ${r.item_code}, công đoạn ${r.operation_code}, xí nghiệp ${r.unit_name} đang âm ${fmtQty(Math.abs(r.closing_qty))} chiếc. Vui lòng kiểm tra dữ liệu nhận và chuyển BTP.`"
      />

      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-bold">{{ view === 'unit' ? 'Tồn BTP theo xí nghiệp' : 'Tồn BTP theo mã hàng' }}</h3>
          <p class="text-xs text-toned">
            {{ fromAll ? 'Từ đầu' : `Từ ${from}` }} đến {{ fmtDateTime(loadedAt) }} · {{ reportCount }} báo cáo đã ghi nhận
          </p>
        </div>
        <UBadge color="neutral" label="Đơn vị: chiếc" />
      </div>

      <p v-if="view === 'item' && !itemId" class="py-10 text-center text-toned">Vui lòng chọn mã hàng để xem tồn BTP.</p>
      <p v-else-if="!loading && !rows.length" class="py-10 text-center text-toned">
        Không có dữ liệu tồn BTP phù hợp với điều kiện đã chọn.
      </p>

      <div v-else-if="view === 'unit'" class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead class="border-b border-default text-left text-toned">
            <tr>
              <th class="py-2 pe-3">Tên xí nghiệp</th>
              <th class="py-2 pe-3">Tên công đoạn</th>
              <th v-if="!fromAll" class="py-2 pe-3 text-right">Tồn đầu kỳ</th>
              <th class="py-2 pe-3 text-right">Nhận BTP</th>
              <th class="py-2 pe-3 text-right">Chuyển BTP</th>
              <th class="py-2 text-right">SL tồn BTP</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="r in byUnit" :key="`${r.unit_id}${r.operation_id}`">
              <td class="py-2.5 pe-3"><UIcon name="i-lucide-factory" class="me-2 text-toned" />{{ r.unit_name }}</td>
              <td class="py-2.5 pe-3">
                <div class="font-medium">{{ r.operation_name }}</div>
                <div class="font-mono text-xs text-toned">{{ r.operation_code }}</div>
              </td>
              <td v-if="!fromAll" class="py-2.5 pe-3 text-right">{{ fmtQty(r.opening_qty) }}</td>
              <td class="py-2.5 pe-3 text-right">{{ fmtQty(r.received_qty) }}</td>
              <td class="py-2.5 pe-3 text-right">{{ fmtQty(r.transferred_qty) }}</td>
              <td class="py-2.5 text-right font-bold" :class="r.closing_qty < 0 ? 'text-error' : ''">{{ fmtQty(r.closing_qty) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-sm">
          <thead class="border-b border-default text-left text-toned">
            <tr>
              <th class="py-2 pe-3">#</th>
              <th class="py-2 pe-3">Công đoạn</th>
              <th v-if="!fromAll" class="py-2 pe-3 text-right">Tồn đầu kỳ</th>
              <th class="py-2 pe-3 text-right">Nhận BTP</th>
              <th class="py-2 pe-3 text-right">Chuyển BTP</th>
              <th class="py-2 pe-3 text-right">SL tồn BTP</th>
              <th class="py-2 text-right">Lệch chuyển → nhận công đoạn sau</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="r in byItem" :key="r.operation_id">
              <td class="py-2.5 pe-3 text-toned">{{ r.seq }}</td>
              <td class="py-2.5 pe-3">
                <div class="font-medium">{{ r.operation_name }}</div>
                <div class="font-mono text-xs text-toned">{{ r.operation_code }}</div>
              </td>
              <td v-if="!fromAll" class="py-2.5 pe-3 text-right">{{ fmtQty(r.opening_qty) }}</td>
              <td class="py-2.5 pe-3 text-right">{{ fmtQty(r.received_qty) }}</td>
              <td class="py-2.5 pe-3 text-right">{{ fmtQty(r.transferred_qty) }}</td>
              <td class="py-2.5 pe-3 text-right font-bold" :class="r.closing_qty < 0 ? 'text-error' : ''">{{ fmtQty(r.closing_qty) }}</td>
              <td class="py-2.5 text-right">
                <template v-if="r.gap === null"><span class="text-toned">—</span></template>
                <UBadge
                  v-else
                  :color="r.gap === 0 ? 'success' : 'warning'"
                  :label="r.gap === 0 ? `Khớp ${r.next_code}` : `${r.gap > 0 ? '+' : ''}${fmtQty(r.gap)} so với ${r.next_code}`"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <p class="mt-2 text-xs text-toned">
          Lệch dương: công đoạn trước đã chuyển nhiều hơn số công đoạn sau ghi nhận nhận — kiểm tra hàng đang trên đường hoặc báo cáo thiếu.
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton color="neutral" variant="outline" label="Đóng" icon="i-lucide-x" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
