<script setup lang="ts">
import OrgUnitForm from '@/features/org/OrgUnitForm.vue'
import { deleteOrgUnit, listOrgUnits } from '@/lib/api'
import type { OrgUnit } from '@/lib/types'
import ErpSyncInfo from '@/shared/components/ErpSyncInfo.vue'
import PageHeader from '@/shared/components/PageHeader.vue'
import { useConfirm } from '@/shared/composables/useConfirm'
import { SOURCE_LABEL } from '@/shared/utils/format'
import { showError, showSuccess } from '@/shared/utils/toast'
import { useQuery } from '@pinia/colada'
import { computed, ref } from 'vue'

const confirm = useConfirm()
const { data: units, refetch, isLoading } = useQuery({ key: ['org-units'], query: listOrgUnits })

// Sắp xếp dạng cây: công ty rồi tới đơn vị con
const tree = computed(() => {
  const all = units.value ?? []
  const out: OrgUnit[] = []
  for (const c of all.filter((u) => u.level === 1)) {
    out.push(c)
    out.push(...all.filter((u) => u.parent_id === c.id).sort((a, b) => Number(b.active) - Number(a.active)))
  }
  out.push(...all.filter((u) => u.level === 2 && !all.some((c) => c.id === u.parent_id)))
  return out
})
const count = computed(() => ({
  companies: (units.value ?? []).filter((u) => u.level === 1).length,
  children: (units.value ?? []).filter((u) => u.level === 2).length,
}))

const formOpen = ref(false)
const erpOpen = ref(false)
const selected = ref<OrgUnit | null>(null)
const open = (u: OrgUnit | null) => ((selected.value = u), (formOpen.value = true))

const confirmDelete = (u: OrgUnit) =>
  confirm.require({
    header: 'Xóa đơn vị',
    message: `Xóa đơn vị "${u.name}"? Đơn vị đã có tài khoản hoặc báo cáo không thể xóa — hãy chuyển sang Ngừng sử dụng.`,
    acceptProps: { label: 'Xóa', color: 'error' },
    accept: async () => {
      try {
        await deleteOrgUnit(u.id)
        showSuccess('Đã xóa đơn vị.')
        void refetch()
      } catch (e) {
        showError((e as Error).message)
      }
    },
  })
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Quản trị tổ chức" icon="i-lucide-building-2">
      <template #actions>
        <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" label="Đồng bộ ERP" @click="erpOpen = true" />
        <UButton icon="i-lucide-plus" label="Thêm đơn vị" @click="open(null)" />
      </template>
    </PageHeader>
    <UCard :ui="{ body: 'p-4 sm:p-6' }">
      <h2 class="mb-3 text-lg font-bold">Cơ cấu tổ chức</h2>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-sm">
          <thead class="border-b border-default text-left text-toned">
            <tr>
              <th class="py-2 pe-3">Tên đơn vị</th>
              <th class="py-2 pe-3">Mã đơn vị</th>
              <th class="py-2 pe-3">Cấp đơn vị</th>
              <th class="py-2 pe-3">Nguồn dữ liệu</th>
              <th class="py-2 pe-3">Trạng thái</th>
              <th class="py-2">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="isLoading"><td colspan="6" class="py-6"><USkeleton class="h-6 w-full" /></td></tr>
            <tr v-for="u in tree" :key="u.id">
              <td class="py-3 pe-3" :class="u.level === 2 ? 'ps-8' : 'font-semibold'">
                <UIcon :name="u.level === 1 ? 'i-lucide-building-2' : 'i-lucide-factory'" class="me-2 text-toned" />{{ u.name }}
              </td>
              <td class="py-3 pe-3 font-mono">{{ u.code }}</td>
              <td class="py-3 pe-3">Cấp {{ u.level }}</td>
              <td class="py-3 pe-3"><UBadge color="info" :label="SOURCE_LABEL[u.source]" /></td>
              <td class="py-3 pe-3">
                <UBadge :color="u.active ? 'success' : 'neutral'" :label="u.active ? 'Đang hoạt động' : 'Ngừng sử dụng'" />
              </td>
              <td class="py-3">
                <UButton variant="ghost" size="sm" color="neutral" icon="i-lucide-pencil" @click="open(u)" />
                <UButton variant="ghost" size="sm" color="error" icon="i-lucide-trash-2" @click="confirmDelete(u)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-xs text-toned">{{ count.companies }} công ty · {{ count.children }} đơn vị cấp 2</p>
    </UCard>
    <OrgUnitForm v-model:open="formOpen" :unit="selected" :units="units ?? []" @saved="refetch" />
    <ErpSyncInfo v-model:open="erpOpen" subject="tổ chức" />
  </div>
</template>
