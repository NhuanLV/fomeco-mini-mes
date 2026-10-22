<script setup lang="ts">
import { ROUTE_PATH } from '@/app/router/path'
import { listReports } from '@/lib/api'
import { useAuthStore } from '@/shared/stores/auth'
import { fmtDateTime, fmtQty, METHOD_LABEL } from '@/shared/utils/format'
import { useQuery } from '@pinia/colada'
import { computed } from 'vue'

const { currentUser } = useAuthStore()
// Báo cáo gần đây của đơn vị mình (công ty: toàn bộ)
const unitFilter = computed(() =>
  currentUser.value?.unit_level === 1 ? null : (currentUser.value?.unit_id ?? null),
)
const { data, isLoading } = useQuery({
  key: () => ['reports', 'recent', unitFilter.value ?? 'all'],
  query: () => listReports({ unitId: unitFilter.value, status: 'active', pageSize: 6 }),
})
const rows = computed(() => data.value?.rows ?? [])
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-5' }">
    <h2 class="mb-3 text-lg font-bold">Báo cáo gần đây</h2>
    <div v-if="isLoading" class="flex flex-col gap-3">
      <USkeleton v-for="i in 3" :key="i" class="h-16 w-full" />
    </div>
    <p v-else-if="!rows.length" class="py-6 text-center text-sm text-toned">Chưa có báo cáo nào.</p>
    <ul v-else class="divide-y divide-default">
      <li v-for="r in rows" :key="r.id" class="py-3">
        <div class="flex items-center justify-between gap-2">
          <span class="font-semibold">{{ r.item_code }}</span>
          <UBadge :color="r.method === 'qr' ? 'info' : 'neutral'" :label="METHOD_LABEL[r.method]" size="sm" />
        </div>
        <div class="text-xs text-toned">{{ r.operation_code }} · {{ r.operation_name }}</div>
        <div class="mt-1">
          <span class="font-mono text-xl font-bold">{{ fmtQty(r.total_qty) }}</span>
          <span class="ms-1 text-xs text-toned">chiếc</span>
        </div>
        <div class="text-xs text-toned">{{ fmtDateTime(r.reported_at) }} · {{ r.reporter_name }}</div>
      </li>
    </ul>
    <ULink :to="ROUTE_PATH.HISTORY" class="mt-2 inline-block text-sm font-medium text-primary">
      Xem tất cả báo cáo →
    </ULink>
  </UCard>
</template>
