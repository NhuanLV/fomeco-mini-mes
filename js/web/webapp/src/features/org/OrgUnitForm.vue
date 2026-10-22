<script setup lang="ts">
import { saveOrgUnit } from '@/lib/api'
import type { OrgUnit } from '@/lib/types'
import { showError, showSuccess, showWarn } from '@/shared/utils/toast'
import { computed, reactive, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ unit: OrgUnit | null; units: OrgUnit[] }>()
const emit = defineEmits<{ saved: [] }>()

const s = reactive({ code: '', name: '', level: 2 as 1 | 2, parentId: '', active: true, saving: false })
const companies = computed(() => props.units.filter((u) => u.level === 1).map((u) => ({ label: u.name, value: u.id })))

watch(open, (v) => {
  if (!v) return
  const u = props.unit
  Object.assign(s, {
    code: u?.code ?? '',
    name: u?.name ?? '',
    level: u?.level ?? 2,
    parentId: u?.parent_id ?? companies.value[0]?.value ?? '',
    active: u?.active ?? true,
  })
})

async function save() {
  if (!s.name.trim()) return showWarn('Vui lòng nhập tên đơn vị.')
  if (!s.code.trim()) return showWarn('Vui lòng nhập mã đơn vị.')
  s.saving = true
  try {
    await saveOrgUnit({
      id: props.unit?.id,
      code: s.code.trim().toUpperCase(),
      name: s.name,
      level: s.level,
      parent_id: s.level === 2 ? s.parentId || null : null,
      active: s.active,
    })
    showSuccess(props.unit ? 'Đã cập nhật đơn vị.' : 'Đã thêm đơn vị.')
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
  <UModal v-model:open="open" :title="unit ? 'Sửa đơn vị' : 'Thêm đơn vị'">
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Tên đơn vị" required><UInput v-model="s.name" class="w-full" placeholder="VD: Xí nghiệp Cơ khí 4" /></UFormField>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField label="Mã đơn vị" required><UInput v-model="s.code" class="w-full" placeholder="VD: CK4" /></UFormField>
          <UFormField label="Cấp đơn vị">
            <USelect v-model="s.level" :items="[{ label: 'Cấp 1 — Công ty', value: 1 }, { label: 'Cấp 2 — Xí nghiệp/Kho', value: 2 }]" class="w-full" />
          </UFormField>
        </div>
        <UFormField v-if="s.level === 2" label="Thuộc công ty">
          <USelect v-model="s.parentId" :items="companies" class="w-full" />
        </UFormField>
        <USwitch v-model="s.active" label="Đang hoạt động" />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" icon="i-lucide-x" label="Hủy" @click="open = false" />
        <UButton icon="i-lucide-check" label="Lưu" :loading="s.saving" @click="save" />
      </div>
    </template>
  </UModal>
</template>
