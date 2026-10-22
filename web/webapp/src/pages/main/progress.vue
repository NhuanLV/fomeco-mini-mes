<script setup lang="ts">
import { ROUTE_PATH } from '@/app/router/path'
import RecentReports from '@/features/report/RecentReports.vue'
import ReportForm from '@/features/report/ReportForm.vue'
import PageHeader from '@/shared/components/PageHeader.vue'
import { useAuthStore } from '@/shared/stores/auth'
import { useStorage } from '@vueuse/core'

const { currentUser } = useAuthStore()
// Nhớ tab đã chọn (thủ công / QR) trên từng máy
const tab = useStorage<'manual' | 'qr'>('fomeco.report.tab', 'manual')
const tabs = [
  { label: 'Báo cáo thủ công', icon: 'i-lucide-pencil', value: 'manual', slot: 'manual' as const },
  { label: 'Báo cáo QR', icon: 'i-lucide-qr-code', value: 'qr', slot: 'qr' as const },
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Báo cáo tiến độ" icon="i-lucide-clipboard-pen-line">
      <template #actions>
        <UButton :to="ROUTE_PATH.HISTORY" color="neutral" variant="outline" icon="i-lucide-history" label="Lịch sử báo cáo" />
      </template>
    </PageHeader>

    <UAlert
      v-if="!currentUser?.unit_id"
      color="warning"
      icon="i-lucide-triangle-alert"
      description="Tài khoản chưa được phân công đơn vị. Vui lòng liên hệ quản trị viên."
    />

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <UCard :ui="{ body: 'p-4 sm:p-6' }">
        <UTabs v-model="tab" :items="tabs" variant="link" class="w-full" :ui="{ list: 'mb-4' }">
          <template #manual>
            <ReportForm mode="manual" />
          </template>
          <template #qr>
            <ReportForm mode="qr" />
          </template>
        </UTabs>
      </UCard>
      <RecentReports />
    </div>
  </div>
</template>
