<script setup lang="ts">
defineProps<{
  title: string
  description: string
  icon?: string
  confirmLabel: string
  cancelLabel: string
  confirmColor?: 'primary' | 'error' | 'warning'
}>()

const emit = defineEmits<{
  close: [confirmed: boolean]
}>()
</script>

<template>
  <UModal
    :title
    :description
    :close="{ onClick: () => emit('close', false) }"
    :dismissible="false"
    class="sm:max-w-3xl"
    :ui="{
      title: 'text-lg',
      header: 'border-b border-default',
      description: 'sr-only',
    }"
  >
    <template #body>
      <div v-if="icon" class="mb-4 flex justify-center">
        <UIcon :name="icon" class="size-10 text-warning" />
      </div>
      <p class="text-base leading-7 whitespace-pre-line text-default">{{ description }}</p>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          :label="cancelLabel"
          color="neutral"
          variant="outline"
          size="lg"
          class="min-w-28 justify-center"
          @click="emit('close', false)"
        />
        <UButton
          :label="confirmLabel"
          :color="confirmColor"
          size="lg"
          class="min-w-28 justify-center"
          @click="emit('close', true)"
        />
      </div>
    </template>
  </UModal>
</template>
