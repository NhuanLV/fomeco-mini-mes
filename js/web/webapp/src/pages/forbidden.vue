<script setup lang="ts">
import { homeFor } from '@/app/router'
import { useAuthStore } from '@/shared/stores/auth'

const { hasPermission } = useAuthStore()
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-muted p-6 text-center">
    <UIcon name="i-lucide-shield-x" class="size-14 text-error" />
    <h1 class="text-xl font-bold">Bạn không có quyền thực hiện thao tác này.</h1>
    <p class="text-toned">Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
    <UButton :to="homeFor(hasPermission)" icon="i-lucide-house" label="Về trang chủ" />
  </div>
</template>
