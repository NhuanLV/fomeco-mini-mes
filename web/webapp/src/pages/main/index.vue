<script setup lang="ts">
import { ROUTE_PATH } from '@/app/router/path'
import { getDailyOutput, getStock, listOrgUnits } from '@/lib/api'
import AppChart from '@/shared/components/AppChart.vue'
import PageHeader from '@/shared/components/PageHeader.vue'
import { useAuthStore } from '@/shared/stores/auth'
import { daysAgo, endOfDayIso, fmtDate, fmtDateTime, fmtQty, startOfMonth, today } from '@/shared/utils/format'
import { useQuery } from '@pinia/colada'
import { useIntervalFn } from '@vueuse/core'
import dayjs from 'dayjs'
import { computed, ref } from 'vue'

const { currentUser } = useAuthStore()

const from = ref(daysAgo(6))
const to = ref(today())
const unitId = ref('all')
const preset = ref<'today' | '7d' | 'month' | ''>('7d')
const updatedAt = ref(new Date().toISOString())

function setPreset(p: 'today' | '7d' | 'month') {
  preset.value = p
  to.value = today()
  from.value = p === 'today' ? today() : p === '7d' ? daysAgo(6) : startOfMonth()
}

const dateError = computed(() => (from.value > to.value ? 'Từ ngày không được lớn hơn Đến ngày.' : ''))
const unit = computed(() => (unitId.value === 'all' ? null : unitId.value))

const { data: units } = useQuery({ key: ['org-units'], query: listOrgUnits })
const factories = computed(() => (units.value ?? []).filter((u) => u.level === 2 && u.active))
const unitOptions = computed(() => [
  { label: 'Tất cả xí nghiệp', value: 'all' },
  ...factories.value.map((u) => ({ label: u.name, value: u.id })),
])

const { data: daily, refetch: r1, isLoading: l1 } = useQuery({
  key: () => ['dashboard', 'daily', from.value, to.value, unitId.value],
  query: async () => {
    updatedAt.value = new Date().toISOString()
    return getDailyOutput(from.value, to.value, unit.value)
  },
  enabled: () => !dateError.value,
})

const { data: stock, refetch: r2, isLoading: l2 } = useQuery({
  key: () => ['dashboard', 'stock', to.value, unitId.value],
  query: () =>
    getStock({ to: to.value === today() ? new Date().toISOString() : endOfDayIso(to.value), unitId: unit.value }),
  enabled: () => !dateError.value,
})

const loading = computed(() => l1.value || l2.value)
const refresh = () => {
  void r1()
  void r2()
}
// Tự cập nhật mỗi 60 giây
useIntervalFn(refresh, 60_000)

const sum = (k: 'ok_qty' | 'ng_qty' | 'received_qty' | 'transferred_qty') =>
  (daily.value ?? []).reduce((a, r) => a + Number(r[k]), 0)

const kpi = computed(() => {
  const ok = sum('ok_qty')
  const ng = sum('ng_qty')
  return {
    ok,
    ng,
    ngRate: ok + ng ? (ng / (ok + ng)) * 100 : 0,
    received: sum('received_qty'),
    transferred: sum('transferred_qty'),
    stock: (stock.value ?? []).reduce((a, r) => a + Number(r.closing_qty), 0),
    unitsReporting: new Set((daily.value ?? []).map((r) => r.unit_id)).size,
    reports: (daily.value ?? []).reduce((a, r) => a + Number(r.report_count), 0),
  }
})

const days = computed(() => {
  const list: string[] = []
  let d = dayjs(from.value)
  const end = dayjs(to.value)
  while (!d.isAfter(end) && list.length < 92) {
    list.push(d.format('YYYY-MM-DD'))
    d = d.add(1, 'day')
  }
  return list
})

const outputChart = computed(() => {
  const byDay = new Map<string, { ok: number; ng: number }>()
  for (const r of daily.value ?? []) {
    const cur = byDay.get(r.day) ?? { ok: 0, ng: 0 }
    cur.ok += Number(r.ok_qty)
    cur.ng += Number(r.ng_qty)
    byDay.set(r.day, cur)
  }
  return {
    labels: days.value.map((d) => dayjs(d).format('DD/MM')),
    datasets: [
      { label: 'OK', data: days.value.map((d) => byDay.get(d)?.ok ?? 0), backgroundColor: '#10b981', stack: 's', borderRadius: 4 },
      { label: 'NG', data: days.value.map((d) => byDay.get(d)?.ng ?? 0), backgroundColor: '#f87171', stack: 's', borderRadius: 4 },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' as const, align: 'end' as const } },
  scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } },
}

// Bảng tổng hợp theo xí nghiệp
const unitRows = computed(() => {
  const map = new Map<
    string,
    { id: string; name: string; ok: number; ng: number; received: number; transferred: number; reports: number; stock: number }
  >()
  const get = (id: string, name: string) => {
    let r = map.get(id)
    if (!r) map.set(id, (r = { id, name, ok: 0, ng: 0, received: 0, transferred: 0, reports: 0, stock: 0 }))
    return r
  }
  for (const u of factories.value) if (!unit.value || u.id === unit.value) get(u.id, u.name)
  for (const d of daily.value ?? []) {
    const r = get(d.unit_id, d.unit_name)
    r.ok += Number(d.ok_qty)
    r.ng += Number(d.ng_qty)
    r.received += Number(d.received_qty)
    r.transferred += Number(d.transferred_qty)
    r.reports += Number(d.report_count)
  }
  for (const s of stock.value ?? []) get(s.unit_id, s.unit_name).stock += Number(s.closing_qty)
  return [...map.values()].sort((a, b) => b.ok + b.ng - (a.ok + a.ng) || a.name.localeCompare(b.name, 'vi'))
})

const maxStock = computed(() => Math.max(1, ...unitRows.value.map((r) => Math.abs(r.stock))))

const cards = computed(() => [
  { label: 'Sản lượng OK', value: kpi.value.ok, unit: 'chiếc', icon: 'i-lucide-check', color: 'emerald' },
  { label: 'Sản lượng NG', value: kpi.value.ng, unit: `chiếc · ${kpi.value.ngRate.toFixed(1)}% NG`, icon: 'i-lucide-x', color: 'red' },
  { label: 'Nhận BTP trong kỳ', value: kpi.value.received, unit: 'chiếc', icon: 'i-lucide-arrow-down-to-line', color: 'blue' },
  { label: 'Chuyển BTP trong kỳ', value: kpi.value.transferred, unit: 'chiếc', icon: 'i-lucide-arrow-up-from-line', color: 'blue' },
  { label: 'Tồn BTP cuối kỳ', value: kpi.value.stock, unit: 'chiếc', icon: 'i-lucide-package', color: 'emerald' },
  { label: 'Có báo cáo trong kỳ', value: kpi.value.unitsReporting, unit: `xí nghiệp · ${kpi.value.reports} báo cáo`, icon: 'i-lucide-factory', color: 'amber' },
])

const CARD_CLASS: Record<string, string> = {
  emerald: 'border-emerald-600 bg-emerald-50/30 text-emerald-700',
  red: 'border-red-500 bg-red-50/30 text-red-700',
  blue: 'border-blue-600 bg-blue-50/30 text-blue-700',
  amber: 'border-amber-500 bg-amber-50/30 text-amber-700',
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Dashboard" icon="i-lucide-house">
      <template #actions>
        <UButton :to="ROUTE_PATH.HISTORY" color="neutral" variant="outline" icon="i-lucide-history" label="Lịch sử báo cáo" />
      </template>
    </PageHeader>

    <div class="flex items-end justify-between">
      <div>
        <h1 class="text-2xl font-bold">Tổng quan sản xuất</h1>
        <p class="text-sm text-toned">{{ currentUser?.unit_level === 1 ? currentUser?.unit_name : 'Công ty CP Cơ khí Phổ Yên' }}</p>
      </div>
      <span class="text-xs text-toned">Cập nhật {{ fmtDateTime(updatedAt) }}</span>
    </div>

    <UCard :ui="{ body: 'p-4 sm:p-5 flex flex-col gap-3' }">
      <div class="flex flex-wrap gap-2">
        <UButton :variant="preset === 'today' ? 'soft' : 'outline'" color="neutral" icon="i-lucide-calendar" label="Hôm nay" @click="setPreset('today')" />
        <UButton :variant="preset === '7d' ? 'soft' : 'outline'" color="neutral" icon="i-lucide-history" label="7 ngày qua" @click="setPreset('7d')" />
        <UButton :variant="preset === 'month' ? 'soft' : 'outline'" color="neutral" icon="i-lucide-calendar-days" label="Tháng này" @click="setPreset('month')" />
      </div>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <UFormField label="Từ ngày"><UInput v-model="from" type="date" class="w-full" @update:model-value="preset = ''" /></UFormField>
        <UFormField label="Đến ngày"><UInput v-model="to" type="date" class="w-full" @update:model-value="preset = ''" /></UFormField>
        <UFormField label="Xí nghiệp"><USelect v-model="unitId" :items="unitOptions" class="w-full" /></UFormField>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" title="Tải lại" @click="refresh" />
      </div>
      <UAlert v-if="dateError" color="warning" icon="i-lucide-triangle-alert" :description="dateError" />
    </UCard>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
      <UCard
        v-for="c in cards"
        :key="c.label"
        class="border-t-2"
        :class="CARD_CLASS[c.color]"
        :ui="{ body: 'p-3.5 sm:p-4' }"
      >
        <div class="flex items-center justify-between text-sm font-semibold">
          {{ c.label }}<UIcon :name="c.icon" class="size-4" />
        </div>
        <USkeleton v-if="loading" class="mt-2 h-8 w-20" />
        <div v-else class="mt-1 font-mono text-2xl font-bold text-highlighted sm:text-3xl">{{ fmtQty(c.value) }}</div>
        <div class="text-xs text-toned">{{ c.unit }}</div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <UCard :ui="{ body: 'p-4 sm:p-5' }">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-bold">Sản lượng theo thời gian</h2>
          <span class="text-xs text-toned">{{ fmtDate(from) }} – {{ fmtDate(to) }}</span>
        </div>
        <div class="h-72"><AppChart type="bar" :data="outputChart" :options="chartOptions" /></div>
      </UCard>
      <UCard :ui="{ body: 'p-4 sm:p-5' }">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-bold">Tồn BTP theo xí nghiệp</h2>
          <UBadge color="neutral" label="chiếc" />
        </div>
        <ul class="flex flex-col gap-3">
          <li v-for="r in unitRows.filter((x) => x.stock !== 0)" :key="r.id" class="text-sm">
            <div class="mb-1 flex justify-between">
              <span>{{ r.name }}</span>
              <b :class="r.stock < 0 ? 'text-error' : ''">{{ fmtQty(r.stock) }}</b>
            </div>
            <div class="h-2 rounded-full bg-elevated">
              <div
                class="h-2 rounded-full"
                :class="r.stock < 0 ? 'bg-red-400' : 'bg-emerald-500'"
                :style="{ width: `${(Math.abs(r.stock) / maxStock) * 100}%` }"
              />
            </div>
          </li>
          <li v-if="!unitRows.some((x) => x.stock !== 0)" class="py-6 text-center text-sm text-toned">
            Không có dữ liệu tồn BTP phù hợp với điều kiện đã chọn.
          </li>
        </ul>
      </UCard>
    </div>

    <UCard :ui="{ body: 'p-4 sm:p-5' }">
      <h2 class="mb-3 font-bold">Tổng hợp theo xí nghiệp</h2>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-sm">
          <thead class="border-b border-default text-left text-toned">
            <tr>
              <th class="py-2 pe-3">Xí nghiệp</th>
              <th class="py-2 pe-3 text-right">OK</th>
              <th class="py-2 pe-3 text-right">NG</th>
              <th class="py-2 pe-3 text-right">Tỷ lệ NG</th>
              <th class="py-2 pe-3 text-right">Nhận BTP</th>
              <th class="py-2 pe-3 text-right">Chuyển BTP</th>
              <th class="py-2 pe-3 text-right">Tồn BTP</th>
              <th class="py-2 pe-3 text-right">Số báo cáo</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="r in unitRows" :key="r.id">
              <td class="py-2.5 pe-3 font-medium">{{ r.name }}</td>
              <td class="py-2.5 pe-3 text-right text-success">{{ fmtQty(r.ok) }}</td>
              <td class="py-2.5 pe-3 text-right text-error">{{ fmtQty(r.ng) }}</td>
              <td class="py-2.5 pe-3 text-right">
                <UBadge
                  v-if="r.ok + r.ng"
                  :color="r.ng / (r.ok + r.ng) > 0.05 ? 'warning' : 'neutral'"
                  :label="`${((r.ng / (r.ok + r.ng)) * 100).toFixed(1)}%`"
                />
                <span v-else class="text-toned">—</span>
              </td>
              <td class="py-2.5 pe-3 text-right">{{ fmtQty(r.received) }}</td>
              <td class="py-2.5 pe-3 text-right">{{ fmtQty(r.transferred) }}</td>
              <td class="py-2.5 pe-3 text-right font-bold" :class="r.stock < 0 ? 'text-error' : ''">{{ fmtQty(r.stock) }}</td>
              <td class="py-2.5 pe-3 text-right">{{ r.reports }}</td>
              <td class="py-2.5 text-right">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  label="Chi tiết"
                  :to="{ path: ROUTE_PATH.HISTORY, query: { unit: r.id, from, to } }"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-2 text-xs text-toned">Tỷ lệ NG trên 5% được đánh dấu vàng. Dashboard tự cập nhật mỗi 60 giây.</p>
    </UCard>
  </div>
</template>
