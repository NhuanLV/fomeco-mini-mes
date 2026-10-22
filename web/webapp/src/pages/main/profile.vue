<script setup lang="ts">
import ChangePasswordDialog from '@/features/account/ChangePasswordDialog.vue'
import PageHeader from '@/shared/components/PageHeader.vue'
import { useAuthStore } from '@/shared/stores/auth'
import { initials } from '@/shared/utils/format'
import { ref } from 'vue'

const { currentUser } = useAuthStore()
const pwOpen = ref(false)
const PERM: Record<string, string> = {
  MANAGE_ACCOUNT: 'Quản lý tài khoản',
  MANAGE_ORG: 'Quản lý tổ chức',
  MANAGE_PRODUCT: 'Quản lý mã hàng',
  REPORT_PROGRESS: 'Báo cáo tiến độ',
  VIEW_REPORT: 'Xem báo cáo',
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Hồ sơ" icon="i-lucide-user" />
    <UCard class="max-w-2xl" :ui="{ body: 'p-6 flex flex-col gap-5' }">
      <UUser size="xl" :name="currentUser?.full_name" :description="currentUser?.username" :avatar="{ text: initials(currentUser?.full_name) }" />
      <div class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div><div class="text-xs text-toned">Đơn vị phân công</div>{{ currentUser?.unit_name ?? 'Chưa phân công' }}</div>
        <div><div class="text-xs text-toned">Vai trò</div>{{ currentUser?.role_name ?? 'Chưa có vai trò' }}</div>
      </div>
      <div>
        <div class="mb-1 text-xs text-toned">Quyền hạn</div>
        <div class="flex flex-wrap gap-1">
          <UBadge v-for="p in currentUser?.permissions ?? []" :key="p" color="info" :label="PERM[p] ?? p" />
        </div>
      </div>
      <div><UButton icon="i-lucide-key-round" label="Đổi mật khẩu" @click="pwOpen = true" /></div>
    </UCard>
    <ChangePasswordDialog v-model:open="pwOpen" :account="null" self />
  </div>
</template>
