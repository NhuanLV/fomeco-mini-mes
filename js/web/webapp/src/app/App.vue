<script setup lang="ts">
import { setToastInstance, clearToastGroup, showToast } from '@/shared/utils/toast'
import { useToast } from '@nuxt/ui/composables'
import { useNetwork } from '@vueuse/core'
import { watch } from 'vue'
import { RouterView } from 'vue-router'

const toast = useToast()
const { isOnline } = useNetwork()
setToastInstance(toast)

watch(
  isOnline,
  (online, wasOnline) => {
    if (online && wasOnline === undefined) return
    clearToastGroup('network')
    showToast({
      summary: online ? 'Đã khôi phục kết nối internet' : 'Mất kết nối internet',
      closable: true,
      life: 3000,
      color: online ? 'success' : 'error',
      icon: online ? 'i-lucide-wifi' : 'i-lucide-wifi-off',
      group: 'network',
    })
  },
  { immediate: true },
)
</script>

<template>
  <UApp :toaster="{ position: 'top-right' }">
    <RouterView />
  </UApp>
</template>
