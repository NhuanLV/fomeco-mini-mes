<script setup lang="ts">
import { createAccount, updateAccount } from '@/lib/api'
import type { Account, OrgUnit, Role } from '@/lib/types'
import { useAuthStore } from '@/shared/stores/auth'
import { showError, showSuccess, showWarn } from '@/shared/utils/toast'
import { computed, reactive, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ account: Account | null; units: OrgUnit[]; roles: Role[] }>()
const emit = defineEmits<{ saved: [] }>()
const { currentUser } = useAuthStore()

const state = reactive({ username: '', password: '', fullName: '', unitId: '', roleId: '', active: true, saving: false })
const isEdit = computed(() => !!props.account)

watch(open, (v) => {
  if (!v) return
  const a = props.account
  Object.assign(state, {
    username: a?.username ?? '',
    password: '',
    fullName: a?.full_name ?? '',
    unitId: a?.unit_id ?? '',
    roleId: a?.role_id ?? '',
    active: a?.active ?? true,
  })
})

const unitOptions = computed(() =>
  props.units.filter((u) => u.active || u.id === state.unitId).map((u) => ({ label: u.level === 1 ? `${u.name} (Công ty)` : u.name, value: u.id })),
)
const roleOptions = computed(() => props.roles.map((r) => ({ label: r.name, value: r.id })))

async function save() {
  if (!state.fullName.trim()) return showWarn('Vui lòng nhập họ và tên.')
  if (!isEdit.value) {
    if (!/^[a-z0-9._-]{3,32}$/.test(state.username.trim().toLowerCase()))
      return showWarn('Tên đăng nhập chỉ gồm chữ thường không dấu, số, dấu chấm, gạch (3–32 ký tự).')
    if (state.password.length < 6) return showWarn('Mật khẩu phải có ít nhất 6 ký tự.')
  }
  if (!state.unitId) return showWarn('Vui lòng chọn đơn vị phân công.')
  if (!state.roleId) return showWarn('Vui lòng chọn vai trò.')
  state.saving = true
  try {
    if (isEdit.value) {
      await updateAccount({
        id: props.account!.id,
        fullName: state.fullName,
        unitId: state.unitId,
        roleId: state.roleId,
        active: state.active,
      })
      showSuccess('Đã cập nhật tài khoản.')
    } else {
      await createAccount({
        username: state.username,
        password: state.password,
        fullName: state.fullName,
        unitId: state.unitId,
        roleId: state.roleId,
      })
      showSuccess(`Đã tạo tài khoản ${state.username.trim().toLowerCase()}.`)
    }
    open.value = false
    emit('saved')
  } catch (e) {
    showError((e as Error).message)
  } finally {
    state.saving = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="isEdit ? 'Sửa thông tin tài khoản' : 'Tạo tài khoản mới'">
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Họ và tên" required><UInput v-model="state.fullName" class="w-full" placeholder="VD: Nguyễn Văn An" /></UFormField>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField label="Tên đăng nhập" :required="!isEdit">
            <UInput v-model="state.username" class="w-full" placeholder="VD: nv.ck1" :disabled="isEdit" autocomplete="off" />
          </UFormField>
          <UFormField v-if="!isEdit" label="Mật khẩu" required help="Ít nhất 6 ký tự">
            <UInput v-model="state.password" type="password" class="w-full" autocomplete="new-password" />
          </UFormField>
        </div>
        <UFormField label="Đơn vị phân công" required help="Tài khoản thuộc Công ty được thao tác báo cáo của mọi xí nghiệp.">
          <USelectMenu v-model="state.unitId" :items="unitOptions" value-key="value" class="w-full" placeholder="Chọn đơn vị" />
        </UFormField>
        <UFormField label="Vai trò" required>
          <USelect v-model="state.roleId" :items="roleOptions" class="w-full" placeholder="Chọn vai trò" />
        </UFormField>
        <USwitch
          v-if="isEdit"
          v-model="state.active"
          :disabled="account?.id === currentUser?.id"
          label="Đang hoạt động"
          description="Tắt để khóa tài khoản (không đăng nhập được, dữ liệu báo cáo vẫn giữ nguyên)."
        />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" icon="i-lucide-x" label="Hủy" @click="open = false" />
        <UButton icon="i-lucide-check" label="Lưu" :loading="state.saving" @click="save" />
      </div>
    </template>
  </UModal>
</template>
