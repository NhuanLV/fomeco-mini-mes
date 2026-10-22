<script setup lang="ts">
import AppNavbar from '@/app/AppNavbar.vue'
import { useAuthStore } from '@/shared/stores/auth'
import { RouterView } from 'vue-router'

const { isInitialized } = useAuthStore()
</script>

<template>
  <div class="flex h-dvh flex-col bg-muted">
    <template v-if="isInitialized">
      <AppNavbar />
      <UMain class="min-h-0 flex-1 overflow-auto">
        <UContainer class="max-w-none p-3 sm:p-6 md:p-8">
          <RouterView />
        </UContainer>
      </UMain>
    </template>
    <div v-else class="flex h-full items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
    </div>
  </div>
</template>
