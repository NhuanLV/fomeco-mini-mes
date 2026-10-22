<script setup lang="ts">
import { saveRole } from '@/lib/api'
import type { Permission, PermissionCode, Role } from '@/lib/types'
import { showError, showSuccess, showWarn } from '@/shared/utils/toast'
import { computed, reactive, watch } from 'vue'
import RolePermissionSelector from './RolePermissionSelector.vue'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ role: Role | null; permissions: Permission[] }>()
const emit = defineEmits<{ saved: [] }>()

const viewOnly = computed(() => !!props.role?.is_system)
const title = computed(() => (viewOnly.value ? 'Chi tiết vai trò' : props.role ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'))
const s = reactive({ name: '', description: '', perms: [] as PermissionCode[], saving: false })

watch(open, (v) => {
  if (v) Object.assign(s, { name: props.role?.name ?? '', description: props.role?.description ?? '', perms: [...(props.role?.permissions ?? [])] })
})

async function save() {
  if (!s.name.trim()) return showWarn('Vui lòng nhập tên vai trò')
  s.saving = true
  try {
    await saveRole({ id: props.role?.id, name: s.name.trim(), description: s.description.trim(), permissions: s.perms })
    showSuccess(props.role ? 'Cập nhật vai trò thành công' : 'Tạo vai trò thành công')
    open.value = false
    emit('saved')
  } catch (e) {
    showError((e as Error).message)
  } finally {
    s.saving = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div class="flex flex-col gap-4">
        <UAlert v-if="viewOnly" color="warning" :ui="{ description: 'font-bold' }" description="Đây là vai trò hệ thống, không thể chỉnh sửa hoặc xóa." />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField label="Tên vai trò" :required="!viewOnly">
            <UInput v-model="s.name" class="w-full" placeholder="VD: Tổ trưởng" :disabled="viewOnly" />
          </UFormField>
          <UFormField label="Mô tả">
            <UTextarea v-model="s.description" class="w-full" :rows="2" placeholder="Mô tả ngắn gọn về vai trò này..." :disabled="viewOnly" />
          </UFormField>
        </div>
        <RolePermissionSelector v-model="s.perms" :permissions :disabled="viewOnly" />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton v-if="viewOnly" color="neutral" icon="i-lucide-x" label="Đóng" @click="open = false" />
        <template v-else>
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" label="Hủy" @click="open = false" />
          <UButton :loading="s.saving" icon="i-lucide-check" label="Lưu" @click="save" />
        </template>
      </div>
    </template>
  </UModal>
</template>
