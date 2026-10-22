<script setup lang="ts">
defineProps<{ title: string; icon: string }>()
</script>

<template>
  <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
    <UBreadcrumb
      :items="[{ icon: 'i-lucide-house', to: '/' }, { label: title, icon }]"
      class="bg-transparent!"
      :ui="{ linkLabel: 'font-semibold', item: 'last:text-primary-700' }"
    />
    <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
      <slot name="actions" />
    </div>
  </div>
</template>
