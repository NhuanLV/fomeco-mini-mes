<script setup lang="ts">
import { ROUTE_PATH } from '@/app/router/path'
import CancelReportDialog from '@/features/report/CancelReportDialog.vue'
import EditReportDialog from '@/features/report/EditReportDialog.vue'
import ReportDetailDialog from '@/features/report/ReportDetailDialog.vue'
import StockDialog from '@/features/report/StockDialog.vue'
import { listOrgUnits, listReports, listReportsForExport, type ReportFilter } from '@/lib/api'
import type { ReportRow } from '@/lib/types'
import PageHeader from '@/shared/components/PageHeader.vue'
import { useAuthStore } from '@/shared/stores/auth'
import { exportExcel } from '@/shared/utils/excel'
import {
  endOfDayIso,
  fmtDateTime,
  fmtQty,
  METHOD_LABEL,
  startOfDayIso,
  STATUS_LABEL,
  today,
} from '@/shared/utils/format'
import { showError, showSuccess } from '@/shared/utils/toast'
import { useQuery, useQueryCache } from '@pinia/colada'
import type { TableColumn } from '@nuxt/ui'
import { refDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const cache = useQueryCache()
const { hasPermission, currentUser } = useAuthStore()

const search = ref('')
const searchDebounced = refDebounced(search, 350)
const unitId = ref<string>(typeof route.query.unit === 'string' ? route.query.unit : 'all')
const status = ref<'all' | 'active' | 'cancelled'>('all')
const method = ref<'all' | 'manual' | 'qr'>('all')
const from = ref<string>(typeof route.query.from === 'string' ? route.query.from : '')
const to = ref<string>(typeof route.query.to === 'string' ? route.query.to : '')
const page = ref(1)
const pageSize = ref(20)

const dateError = computed(() =>
  from.value && to.value && from.value > to.value ? 'Từ ngày không được lớn hơn Đến ngày.' : '',
)

watch([searchDebounced, unitId, status, method, from, to, pageSize], () => (page.value = 1))

const filter = computed<ReportFilter>(() => ({
  search: searchDebounced.value,
  unitId: unitId.value === 'all' ? null : unitId.value,
  status: status.value === 'all' ? null : status.value,
  method: method.value === 'all' ? null : method.value,
  from: startOfDayIso(from.value),
  to: endOfDayIso(to.value),
  page: page.value,
  pageSize: pageSize.value,
}))

const { data, isLoading, refetch, error } = useQuery({
  key: () => ['reports', 'history', JSON.stringify(filter.value)],
  query: () => listReports(filter.value),
  enabled: () => !dateError.value,
})
watch(error, (e) => e && showError((e as Error).message))

const rows = computed(() => data.value?.rows ?? [])
const total = computed(() => data.value?.total ?? 0)

const { data: units } = useQuery({ key: ['org-units'], query: listOrgUnits })
const unitOptions = computed(() => [
  { label: 'Tất cả đơn vị', value: 'all' },
  ...(units.value ?? []).map((u) => ({ label: u.name, value: u.id })),
])

const canEdit = (r: ReportRow) =>
  r.status === 'active' &&
  hasPermission('REPORT_PROGRESS') &&
  (r.unit_id === currentUser.value?.unit_id || currentUser.value?.unit_level === 1)

const columns: TableColumn<ReportRow>[] = [
  { accessorKey: 'reported_at', header: 'Thời gian báo cáo' },
  { accessorKey: 'reporter_name', header: 'Người báo cáo' },
  { accessorKey: 'item_code', header: 'Mã hàng / Công đoạn' },
  { accessorKey: 'ok_qty', header: 'Sản lượng OK', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'ng_qty', header: 'Sản lượng NG', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'total_qty', header: 'Tổng sản lượng', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'received_qty', header: 'Nhận BTP', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'transferred_qty', header: 'Chuyển BTP', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'method', header: 'Hình thức' },
  { accessorKey: 'status', header: 'Trạng thái' },
  { id: 'actions', header: 'Thao tác' },
]

const selected = ref<ReportRow | null>(null)
const editOpen = ref(false)
const cancelOpen = ref(false)
const detailOpen = ref(false)
const stockOpen = ref(false)
const exporting = ref(false)

const openEdit = (r: ReportRow) => ((selected.value = r), (editOpen.value = true))
const openCancel = (r: ReportRow) => ((selected.value = r), (cancelOpen.value = true))
const openDetail = (r: ReportRow) => ((selected.value = r), (detailOpen.value = true))

function onSaved() {
  void cache.invalidateQueries({ key: ['reports'] })
  void cache.invalidateQueries({ key: ['dashboard'] })
}

function resetFilters() {
  search.value = ''
  unitId.value = 'all'
  status.value = 'all'
  method.value = 'all'
  from.value = ''
  to.value = ''
  void refetch()
}

async function doExport() {
  exporting.value = true
  try {
    const list = await listReportsForExport(filter.value)
    exportExcel(
      `lich-su-bao-cao-${today()}.xlsx`,
      'Bao cao',
      [
        'Thời gian', 'Người báo cáo', 'Xí nghiệp', 'Mã hàng', 'Tên sản phẩm', 'Mã công đoạn', 'Tên công đoạn',
        'OK', 'NG', 'Tổng', 'Nhận BTP', 'Chuyển BTP', 'Hình thức', 'Trạng thái', 'Lý do hủy',
      ],
      list.map((r) => [
        fmtDateTime(r.reported_at), r.reporter_name, r.unit_name, r.item_code, r.item_name, r.operation_code,
        r.operation_name, r.ok_qty, r.ng_qty, r.total_qty, r.received_qty, r.transferred_qty,
        METHOD_LABEL[r.method], STATUS_LABEL[r.status], r.cancel_reason,
      ]),
    )
    showSuccess(`Đã xuất ${list.length} báo cáo ra Excel.`)
  } catch (e) {
    showError((e as Error).message)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Lịch sử báo cáo" icon="i-lucide-history">
      <template #actions>
        <UButton color="neutral" variant="outline" icon="i-lucide-chart-column" label="Xem Tồn BTP" data-testid="open-stock" @click="stockOpen = true" />
        <UButton color="neutral" variant="outline" icon="i-lucide-file-spreadsheet" label="Xuất Excel" :loading="exporting" @click="doExport" />
        <UButton v-if="hasPermission('REPORT_PROGRESS')" :to="ROUTE_PATH.PROGRESS" icon="i-lucide-plus" label="Báo cáo tiến độ" />
      </template>
    </PageHeader>

    <UCard :ui="{ body: 'p-4 sm:p-6' }">
      <div class="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 class="text-lg font-bold">Lịch sử báo cáo sản xuất</h2>
          <p class="text-sm text-toned">Theo dõi sản lượng theo mã hàng và công đoạn</p>
        </div>
        <UBadge color="neutral" label="Đơn vị: chiếc" />
      </div>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Tìm mã hàng, công đoạn, người báo cáo..." class="w-full" />
        <USelect v-model="unitId" :items="unitOptions" class="w-full" />
        <USelect
          v-model="status"
          :items="[
            { label: 'Tất cả trạng thái', value: 'all' },
            { label: 'Đã ghi nhận', value: 'active' },
            { label: 'Đã hủy', value: 'cancelled' },
          ]"
          class="w-full"
        />
        <USelect
          v-model="method"
          :items="[
            { label: 'Tất cả hình thức', value: 'all' },
            { label: 'Thủ công', value: 'manual' },
            { label: 'QR', value: 'qr' },
          ]"
          class="w-full"
        />
      </div>
      <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <UFormField label="Từ ngày"><UInput v-model="from" type="date" class="w-full" /></UFormField>
        <UFormField label="Đến ngày"><UInput v-model="to" type="date" class="w-full" /></UFormField>
        <UButton icon="i-lucide-rotate-ccw" color="neutral" variant="outline" title="Bỏ lọc & tải lại" @click="resetFilters" />
      </div>
      <UAlert v-if="dateError" class="mt-3" color="warning" icon="i-lucide-triangle-alert" :description="dateError" />

      <UTable
        class="mt-4 text-sm"
        :data="rows"
        :columns="columns"
        :loading="isLoading"
        :ui="{ td: 'whitespace-nowrap py-3', th: 'whitespace-nowrap' }"
      >
        <template #reported_at-cell="{ row }">{{ fmtDateTime(row.original.reported_at) }}</template>
        <template #reporter_name-cell="{ row }">
          <div class="font-semibold">{{ row.original.reporter_name }}</div>
          <div class="text-xs text-toned">{{ row.original.unit_name }}</div>
        </template>
        <template #item_code-cell="{ row }">
          <div class="font-semibold">{{ row.original.item_code }}</div>
          <div class="text-xs text-toned">{{ row.original.operation_code }} · {{ row.original.operation_name }}</div>
        </template>
        <template #ok_qty-cell="{ row }"><span class="text-success">{{ fmtQty(row.original.ok_qty) }}</span></template>
        <template #ng_qty-cell="{ row }"><span class="text-error">{{ fmtQty(row.original.ng_qty) }}</span></template>
        <template #total_qty-cell="{ row }"><b>{{ fmtQty(row.original.total_qty) }}</b></template>
        <template #received_qty-cell="{ row }">{{ fmtQty(row.original.received_qty) }}</template>
        <template #transferred_qty-cell="{ row }">{{ fmtQty(row.original.transferred_qty) }}</template>
        <template #method-cell="{ row }">
          <UBadge :color="row.original.method === 'qr' ? 'info' : 'neutral'" :label="METHOD_LABEL[row.original.method]" />
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'active' ? 'success' : 'error'"
            :label="STATUS_LABEL[row.original.status]"
            :title="row.original.cancel_reason ?? undefined"
          />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UButton variant="ghost" color="neutral" size="sm" icon="i-lucide-eye" title="Chi tiết" @click="openDetail(row.original)" />
            <template v-if="canEdit(row.original)">
              <UButton variant="ghost" color="neutral" size="sm" icon="i-lucide-pencil" title="Chỉnh sửa" data-testid="edit-report" @click="openEdit(row.original)" />
              <UButton variant="ghost" color="error" size="sm" icon="i-lucide-x" title="Hủy báo cáo" data-testid="cancel-report" @click="openCancel(row.original)" />
            </template>
          </div>
        </template>
        <template #empty>Không tìm thấy báo cáo phù hợp với điều kiện tìm kiếm.</template>
      </UTable>

      <div class="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <span class="text-xs text-toned sm:text-sm">
          Hiển thị {{ total > 0 ? (page - 1) * pageSize + 1 : 0 }} - {{ Math.min(page * pageSize, total) }} trong tổng số
          {{ total }} báo cáo
        </span>
        <div class="flex items-center gap-3">
          <UPagination v-model:page="page" :total="total" :items-per-page="pageSize" />
          <USelect v-model="pageSize" :items="[10, 20, 50, 100]" class="w-20" aria-label="Số dòng mỗi trang" />
        </div>
      </div>
    </UCard>

    <EditReportDialog v-model:open="editOpen" :report="selected" @saved="onSaved" />
    <CancelReportDialog v-model:open="cancelOpen" :report="selected" @saved="onSaved" />
    <ReportDetailDialog v-model:open="detailOpen" :report="selected" />
    <StockDialog v-model:open="stockOpen" />
  </div>
</template>
