<script setup lang="ts">
import type { Permission, PermissionCode } from '@/lib/types'
import { computed } from 'vue'

const props = defineProps<{ modelValue: PermissionCode[]; permissions: Permission[]; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: PermissionCode[]] }>()

const isAll = computed(() => props.permissions.length > 0 && props.permissions.every((p) => props.modelValue.includes(p.code)))
const isPartial = computed(() => props.modelValue.length > 0 && !isAll.value)

const groups = computed(() => {
  const m = new Map<string, Permission[]>()
  for (const p of props.permissions) m.set(p.group_name, [...(m.get(p.group_name) ?? []), p])
  return [...m.entries()].map(([name, perms]) => ({
    name,
    perms,
    selected: perms.filter((p) => props.modelValue.includes(p.code)).length,
  }))
})

const toggleAll = (v: boolean | 'indeterminate') => {
  if (v === 'indeterminate') return
  emit('update:modelValue', v ? props.permissions.map((p) => p.code) : [])
}
const toggle = (code: PermissionCode, v: boolean | 'indeterminate') => {
  if (v === 'indeterminate') return
  const set = new Set(props.modelValue)
  if (v) set.add(code)
  else set.delete(code)
  emit('update:modelValue', [...set])
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium">Quyền hạn</span>
        <UCheckbox label="Chọn tất cả" :model-value="isPartial ? 'indeterminate' : isAll" :disabled @update:model-value="toggleAll" />
      </div>
      <span class="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
        {{ modelValue.length }} / {{ permissions.length }}
      </span>
    </div>
    <section v-for="g in groups" :key="g.name" class="py-2">
      <div class="mb-1 flex items-center gap-2 px-2">
        <h3 class="text-sm font-semibold">{{ g.name }}</h3>
        <span class="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-toned">{{ g.selected }} / {{ g.perms.length }}</span>
      </div>
      <div class="grid grid-cols-1 gap-1 md:grid-cols-2">
        <UCheckbox
          v-for="p in g.perms"
          :key="p.code"
          variant="card"
          class="w-full cursor-pointer border-0 hover:bg-surface-50 has-data-[state=checked]:bg-primary-50"
          :label="p.name"
          :description="p.code"
          :model-value="modelValue.includes(p.code)"
          :disabled
          @update:model-value="toggle(p.code, $event)"
        />
      </div>
    </section>
  </div>
</template>
