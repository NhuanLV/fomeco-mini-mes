<script setup lang="ts">
import AccountFormDialog from '@/features/account/AccountFormDialog.vue'
import ChangePasswordDialog from '@/features/account/ChangePasswordDialog.vue'
import { deleteAccount, listAccounts, listOrgUnits, listRoles } from '@/lib/api'
import type { Account } from '@/lib/types'
import PageHeader from '@/shared/components/PageHeader.vue'
import { useConfirm } from '@/shared/composables/useConfirm'
import { useAuthStore } from '@/shared/stores/auth'
import { initials, normalize } from '@/shared/utils/format'
import { showError, showSuccess } from '@/shared/utils/toast'
import { useQuery } from '@pinia/colada'
import type { TableColumn } from '@nuxt/ui'
import { computed, ref } from 'vue'

const confirm = useConfirm()
const { currentUser, checkAuth } = useAuthStore()

const { data: accounts, refetch, isLoading } = useQuery({ key: ['accounts'], query: listAccounts })
const { data: units } = useQuery({ key: ['org-units'], query: listOrgUnits })
const { data: roles } = useQuery({ key: ['roles'], query: listRoles })

const search = ref('')
const unitId = ref('all')
const unitOptions = computed(() => [
  { label: 'Tất cả đơn vị', value: 'all' },
  ...(units.value ?? []).map((u) => ({ label: u.name, value: u.id })),
])

const rows = computed(() => {
  const s = normalize(search.value.trim())
  return (accounts.value ?? []).filter(
    (a) =>
      (unitId.value === 'all' || a.unit_id === unitId.value) &&
      (!s || normalize(`${a.full_name} ${a.username}`).includes(s)),
  )
})

const columns: TableColumn<Account>[] = [
  { accessorKey: 'full_name', header: 'Tên người dùng' },
  { accessorKey: 'username', header: 'Tài khoản' },
  { accessorKey: 'unit_name', header: 'Đơn vị phân công' },
  { accessorKey: 'role_name', header: 'Vai trò' },
  { accessorKey: 'active', header: 'Trạng thái' },
  { id: 'actions', header: 'Thao tác' },
]

const formOpen = ref(false)
const pwOpen = ref(false)
const selected = ref<Account | null>(null)
const openNew = () => ((selected.value = null), (formOpen.value = true))
const openEdit = (a: Account) => ((selected.value = a), (formOpen.value = true))
const openPw = (a: Account) => ((selected.value = a), (pwOpen.value = true))

const onSaved = async () => {
  await refetch()
  await checkAuth() // cập nhật quyền nếu admin tự sửa mình
}

const confirmDelete = (a: Account) =>
  confirm.require({
    header: 'Xác nhận xóa tài khoản',
    message: `Bạn có chắc chắn muốn xóa tài khoản "${a.full_name}"?\nTài khoản đã có báo cáo chỉ có thể khóa, không xóa được.`,
    icon: 'i-lucide-triangle-alert',
    acceptProps: { label: 'Xóa', color: 'error' },
    accept: async () => {
      try {
        await deleteAccount(a.id)
        showSuccess('Tài khoản đã được xóa')
        void refetch()
      } catch (e) {
        showError((e as Error).message)
      }
    },
  })
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Quản trị tài khoản" icon="i-lucide-id-card">
      <template #actions>
        <UButton icon="i-lucide-plus" label="Thêm mới" data-testid="new-account" @click="openNew" />
      </template>
    </PageHeader>

    <UCard :ui="{ body: 'p-4 sm:p-6' }">
      <div class="mb-4 flex flex-col gap-2 sm:flex-row">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Tìm theo tên hoặc tài khoản..." class="w-full sm:w-72" />
        <USelect v-model="unitId" :items="unitOptions" class="w-full sm:w-72" />
      </div>
      <UTable :data="rows" :columns="columns" :loading="isLoading" class="text-sm">
        <template #full_name-cell="{ row }">
          <UUser :name="row.original.full_name" :description="row.original.role_name ?? undefined" :avatar="{ text: initials(row.original.full_name) }" />
        </template>
        <template #username-cell="{ row }"><span class="font-mono text-xs text-toned">{{ row.original.username }}</span></template>
        <template #unit_name-cell="{ row }">
          <UBadge v-if="row.original.unit_name" color="neutral" :label="row.original.unit_name" />
          <span v-else class="text-toned italic">Chưa phân công</span>
        </template>
        <template #role_name-cell="{ row }">
          <UBadge v-if="row.original.role_name" color="info" :label="row.original.role_name" />
          <span v-else class="text-toned italic">Chưa có vai trò</span>
        </template>
        <template #active-cell="{ row }">
          <UBadge :color="row.original.active ? 'success' : 'error'" :label="row.original.active ? 'Đang hoạt động' : 'Đã khóa'" />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton variant="ghost" color="info" size="sm" icon="i-lucide-key-round" title="Đặt lại mật khẩu" @click="openPw(row.original)" />
            <UButton variant="ghost" color="neutral" size="sm" icon="i-lucide-pencil" title="Sửa" @click="openEdit(row.original)" />
            <UButton
              variant="ghost"
              color="error"
              size="sm"
              icon="i-lucide-trash-2"
              :disabled="row.original.id === currentUser?.id"
              title="Xóa"
              @click="confirmDelete(row.original)"
            />
          </div>
        </template>
        <template #empty>Không tìm thấy tài khoản nào.</template>
      </UTable>
      <p class="mt-3 text-xs text-toned sm:text-sm">Hiển thị {{ rows.length }} trong tổng số {{ accounts?.length ?? 0 }} tài khoản</p>
    </UCard>

    <AccountFormDialog v-model:open="formOpen" :account="selected" :units="units ?? []" :roles="roles ?? []" @saved="onSaved" />
    <ChangePasswordDialog v-model:open="pwOpen" :account="selected" />
  </div>
</template>
