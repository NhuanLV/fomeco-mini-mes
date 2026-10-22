<script setup lang="ts">
import { listReportLogs } from '@/lib/api'
import type { QtySet, ReportRow } from '@/lib/types'
import { fmtDateTime, fmtQty, METHOD_LABEL, STATUS_LABEL } from '@/shared/utils/format'
import { useQuery } from '@pinia/colada'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ report: ReportRow | null }>()

const { data: logs, isLoading } = useQuery({
  key: () => ['report-logs', props.report?.id ?? ''],
  query: () => listReportLogs(props.report!.id),
  enabled: () => open.value && !!props.report,
})

const ACTION = {
  create: { label: 'Tạo báo cáo', icon: 'i-lucide-plus', color: 'text-primary' },
  update: { label: 'Chỉnh sửa', icon: 'i-lucide-pencil', color: 'text-info' },
  cancel: { label: 'Hủy báo cáo', icon: 'i-lucide-ban', color: 'text-error' },
} as const

const fmtSet = (q: QtySet | null) =>
  q ? `OK ${fmtQty(q.ok)} · NG ${fmtQty(q.ng)} · Nhận ${fmtQty(q.received)} · Chuyển ${fmtQty(q.transferred)}` : ''
</script>

<template>
  <UModal v-model:open="open" title="Chi tiết báo cáo" :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div v-if="report" class="flex flex-col gap-4 text-sm">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div><div class="text-xs text-toned">Mã hàng</div><b>{{ report.item_code }}</b> — {{ report.item_name }}</div>
          <div><div class="text-xs text-toned">Công đoạn</div><b>{{ report.operation_code }}</b> · {{ report.operation_name }}</div>
          <div><div class="text-xs text-toned">Xí nghiệp</div>{{ report.unit_name }}</div>
          <div><div class="text-xs text-toned">Người báo cáo</div>{{ report.reporter_name }}</div>
          <div><div class="text-xs text-toned">Thời gian</div>{{ fmtDateTime(report.reported_at) }}</div>
          <div>
            <div class="text-xs text-toned">Hình thức / Trạng thái</div>
            {{ METHOD_LABEL[report.method] }} ·
            <UBadge :color="report.status === 'active' ? 'success' : 'error'" :label="STATUS_LABEL[report.status]" size="sm" />
          </div>
        </div>
        <div class="grid grid-cols-5 gap-2 rounded-lg bg-elevated/60 p-3 text-center">
          <div><div class="text-xs text-toned">OK</div><b class="text-success">{{ fmtQty(report.ok_qty) }}</b></div>
          <div><div class="text-xs text-toned">NG</div><b class="text-error">{{ fmtQty(report.ng_qty) }}</b></div>
          <div><div class="text-xs text-toned">Tổng</div><b>{{ fmtQty(report.total_qty) }}</b></div>
          <div><div class="text-xs text-toned">Nhận BTP</div><b>{{ fmtQty(report.received_qty) }}</b></div>
          <div><div class="text-xs text-toned">Chuyển BTP</div><b>{{ fmtQty(report.transferred_qty) }}</b></div>
        </div>
        <UAlert
          v-if="report.status === 'cancelled'"
          color="error"
          icon="i-lucide-ban"
          :title="`Đã hủy bởi ${report.cancelled_by_name ?? ''} lúc ${fmtDateTime(report.cancelled_at)}`"
          :description="`Lý do: ${report.cancel_reason ?? ''}`"
        />

        <div>
          <h3 class="mb-2 font-semibold">Nhật ký thay đổi</h3>
          <USkeleton v-if="isLoading" class="h-16 w-full" />
          <ol v-else class="relative ms-2 border-s border-default">
            <li v-for="l in logs ?? []" :key="l.id" class="mb-4 ms-4">
              <span class="absolute -start-2 mt-1 flex size-4 items-center justify-center rounded-full bg-default ring-2 ring-default">
                <UIcon :name="ACTION[l.action].icon" class="size-3" :class="ACTION[l.action].color" />
              </span>
              <div class="font-medium">
                {{ ACTION[l.action].label }}
                <span class="font-normal text-toned">· {{ l.actor?.full_name }} · {{ fmtDateTime(l.at) }}</span>
              </div>
              <div v-if="l.action === 'update'" class="text-xs text-toned">
                Trước: {{ fmtSet(l.before) }}<br />Sau: {{ fmtSet(l.after) }}
              </div>
              <div v-else-if="l.action === 'create'" class="text-xs text-toned">{{ fmtSet(l.after) }}</div>
              <div v-else class="text-xs text-toned">Lý do: {{ l.reason }}</div>
            </li>
          </ol>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton color="neutral" variant="outline" label="Đóng" icon="i-lucide-x" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
