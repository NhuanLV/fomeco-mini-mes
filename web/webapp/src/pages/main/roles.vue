<script setup lang="ts">
import RoleForm from '@/features/role/RoleForm.vue'
import { deleteRole, listPermissions, listRoles } from '@/lib/api'
import type { Role } from '@/lib/types'
import PageHeader from '@/shared/components/PageHeader.vue'
import { useConfirm } from '@/shared/composables/useConfirm'
import { showError, showSuccess } from '@/shared/utils/toast'
import { useQuery } from '@pinia/colada'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { computed, ref } from 'vue'

const confirm = useConfirm()
const { data: roles, refetch } = useQuery({ key: ['roles'], query: listRoles })
const { data: permissions } = useQuery({ key: ['permissions'], query: listPermissions })
const permName = computed(() => new Map((permissions.value ?? []).map((p) => [p.code, p.name])))
const groupCount = computed(() => new Set((permissions.value ?? []).map((p) => p.group_name)).size)

const columns: TableColumn<Role>[] = [
  { accessorKey: 'name', header: 'Tên vai trò' },
  { accessorKey: 'description', header: 'Mô tả' },
  { id: 'permissions', header: 'Quyền hạn' },
  { id: 'actions', header: 'Thao tác' },
]

const formOpen = ref(false)
const selected = ref<Role | null>(null)
const open = (r: Role | null) => ((selected.value = r), (formOpen.value = true))
const onSelect = (_e: Event, row: TableRow<Role>) => open(row.original)

const confirmDelete = (r: Role) =>
  confirm.require({
    header: 'Xác nhận xóa',
    message: `Bạn có chắc chắn muốn xóa vai trò "${r.name}"?`,
    acceptProps: { label: 'Xóa', color: 'error' },
    accept: async () => {
      try {
        await deleteRole(r.id)
        showSuccess('Xóa vai trò thành công')
        void refetch()
      } catch (e) {
        showError((e as Error).message)
      }
    },
  })
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Quản trị vai trò" icon="i-lucide-shield">
      <template #actions><UButton icon="i-lucide-plus" label="Thêm mới" @click="open(null)" /></template>
    </PageHeader>
    <UCard :ui="{ body: 'p-4 sm:p-6' }">
      <UTable :data="roles ?? []" :columns="columns" class="text-sm" :ui="{ tr: 'cursor-pointer' }" @select="onSelect">
        <template #name-cell="{ row }">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ row.original.name }}</span>
            <UBadge v-if="row.original.is_system" label="Hệ thống" color="neutral" />
          </div>
        </template>
        <template #permissions-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge v-for="p in row.original.permissions" :key="p" :label="permName.get(p) ?? p" color="info" />
            <span v-if="!row.original.permissions.length" class="text-xs text-toned italic">Không có quyền</span>
          </div>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <template v-if="!row.original.is_system">
              <UButton variant="ghost" size="sm" color="neutral" icon="i-lucide-pencil" @click.stop="open(row.original)" />
              <UButton variant="ghost" size="sm" color="error" icon="i-lucide-trash-2" @click.stop="confirmDelete(row.original)" />
            </template>
            <UButton v-else variant="ghost" size="sm" color="neutral" icon="i-lucide-eye" @click.stop="open(row.original)" />
          </div>
        </template>
      </UTable>
      <p class="mt-3 text-xs text-toned">
        {{ roles?.length ?? 0 }} vai trò · {{ groupCount }} nhóm quyền · {{ permissions?.length ?? 0 }} quyền hạn
      </p>
    </UCard>
    <RoleForm v-model:open="formOpen" :role="selected" :permissions="permissions ?? []" @saved="refetch" />
  </div>
</template>
