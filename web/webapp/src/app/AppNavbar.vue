<script setup lang="ts">
import { ROUTE_PATH } from '@/app/router/path'
import logoUrl from '@/assets/logo-fomeco.png'
import { useAuthStore } from '@/shared/stores/auth'
import { initials } from '@/shared/utils/format'
import type { DropdownMenuItem } from '@nuxt/ui'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface NavbarItem {
  label: string
  icon: string
  to?: string
  children?: DropdownMenuItem[]
  active?: boolean
}

const router = useRouter()
const route = useRoute()
const { hasPermission, logout, currentUser } = useAuthStore()

const navItems = computed<NavbarItem[]>(() => {
  const adminItems = [
    hasPermission('MANAGE_ORG') && {
      label: 'Quản trị tổ chức',
      icon: 'i-lucide-building-2',
      to: ROUTE_PATH.ORGANIZATION,
    },
    hasPermission('MANAGE_ACCOUNT') && {
      label: 'Quản trị tài khoản',
      icon: 'i-lucide-id-card',
      to: ROUTE_PATH.ACCOUNTS,
    },
    hasPermission('MANAGE_ACCOUNT') && {
      label: 'Quản trị vai trò',
      icon: 'i-lucide-shield',
      to: ROUTE_PATH.ROLES,
    },
    hasPermission('MANAGE_PRODUCT') && {
      label: 'Quản trị mã hàng',
      icon: 'i-lucide-qr-code',
      to: ROUTE_PATH.PRODUCTS,
    },
  ].filter(Boolean) as DropdownMenuItem[]

  const reportItems = [
    hasPermission('REPORT_PROGRESS') && {
      label: 'Báo cáo tiến độ',
      icon: 'i-lucide-clipboard-pen-line',
      to: ROUTE_PATH.PROGRESS,
    },
    (hasPermission('VIEW_REPORT') || hasPermission('REPORT_PROGRESS')) && {
      label: 'Lịch sử báo cáo',
      icon: 'i-lucide-history',
      to: ROUTE_PATH.HISTORY,
    },
  ].filter(Boolean) as DropdownMenuItem[]

  const path = route.path
  return [
    hasPermission('VIEW_REPORT') && {
      label: 'Dashboard',
      icon: 'i-lucide-house',
      to: ROUTE_PATH.DASHBOARD,
      active: path === ROUTE_PATH.DASHBOARD,
    },
    adminItems.length > 0 && {
      label: 'Quản trị',
      icon: 'i-lucide-settings-2',
      children: adminItems,
      active: adminItems.some((i) => i.to === path),
    },
    reportItems.length > 0 && {
      label: 'Báo cáo sản xuất',
      icon: 'i-lucide-factory',
      children: reportItems,
      active: reportItems.some((i) => i.to === path),
    },
  ].filter(Boolean) as NavbarItem[]
})

const mobileNavItems = computed(() => navItems.value)

const userMenuItems: DropdownMenuItem[] = [
  { label: 'Hồ sơ & đổi mật khẩu', icon: 'i-lucide-user', to: ROUTE_PATH.PROFILE },
  { type: 'separator' },
  { label: 'Đăng xuất', icon: 'i-lucide-log-out', onSelect: () => handleLogout() },
]

const handleLogout = async () => {
  await logout()
  await router.push(ROUTE_PATH.LOGIN)
}
</script>

<template>
  <UHeader
    :to="ROUTE_PATH.DASHBOARD"
    title="Mini-MES"
    class="relative z-50 shrink-0 shadow-md"
    :ui="{
      root: 'bg-default',
      container: 'h-16 max-w-none px-2 sm:px-4',
      center: 'hidden lg:flex',
      body: 'p-4',
    }"
  >
    <template #title>
      <div class="flex shrink-0 cursor-pointer items-center gap-2">
        <img :src="logoUrl" alt="FOMECO" class="h-9 w-auto" />
        <span class="hidden text-lg font-bold text-primary-600 sm:inline">Mini-MES</span>
      </div>
    </template>

    <div class="flex items-center gap-1">
      <template v-for="item in navItems" :key="item.label">
        <UButton
          v-if="item.to"
          :label="item.label"
          :icon="item.icon"
          :to="item.to"
          color="neutral"
          variant="ghost"
          class="text-base"
          :class="{ 'bg-primary-50 text-primary-700': item.active }"
        />
        <UDropdownMenu
          v-else-if="item.children?.length"
          :items="item.children"
          :ui="{ content: 'min-w-56', itemLabel: 'whitespace-nowrap' }"
        >
          <template #default="{ open }">
            <UButton
              :label="item.label"
              :icon="item.icon"
              :trailing-icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              color="neutral"
              variant="ghost"
              class="text-base"
              :class="{ 'bg-elevated': open, 'bg-primary-50 text-primary-700': item.active }"
            />
          </template>
        </UDropdownMenu>
      </template>
    </div>

    <template #right>
      <div class="flex shrink-0 items-center justify-end gap-1 sm:gap-3">
        <UDropdownMenu :items="userMenuItems">
          <button
            class="flex items-center gap-2 rounded-full p-1.5 transition-colors hover:bg-elevated"
            data-testid="user-menu"
          >
            <UAvatar :text="initials(currentUser?.full_name)" />
            <span class="hidden flex-col items-start px-1 sm:flex">
              <span class="text-sm leading-tight font-semibold text-default">
                {{ currentUser?.full_name }}
              </span>
              <span class="text-xs leading-tight text-toned">{{ currentUser?.role_name }}</span>
            </span>
            <UIcon name="i-lucide-chevron-down" class="size-4 text-toned" />
          </button>
        </UDropdownMenu>
      </div>
    </template>

    <template #body>
      <UNavigationMenu :items="mobileNavItems" orientation="vertical" class="-mx-2.5" />
    </template>
  </UHeader>
</template>
