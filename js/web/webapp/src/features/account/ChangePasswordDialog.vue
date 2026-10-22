<script setup lang="ts">
import { changeMyPassword, setAccountPassword } from '@/lib/api'
import type { Account } from '@/lib/types'
import { showError, showSuccess, showWarn } from '@/shared/utils/toast'
import { reactive, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
// account = null → đổi mật khẩu của chính mình
const props = defineProps<{ account: Account | null; self?: boolean }>()

const s = reactive({ pw: '', pw2: '', saving: false })
watch(open, (v) => v && Object.assign(s, { pw: '', pw2: '' }))

async function save() {
  if (s.pw.length < 6) return showWarn('Mật khẩu phải có ít nhất 6 ký tự.')
  if (s.pw !== s.pw2) return showWarn('Mật khẩu nhập lại không khớp.')
  s.saving = true
  try {
    if (props.self) await changeMyPassword(s.pw)
    else await setAccountPassword(props.account!.id, s.pw)
    showSuccess('Đã đổi mật khẩu.')
    open.value = false
  } catch (e) {
    showError((e as Error).message)
  } finally {
    s.saving = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="self ? 'Đổi mật khẩu' : `Đặt lại mật khẩu — ${account?.full_name ?? ''}`">
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Mật khẩu mới" required help="Ít nhất 6 ký tự">
          <UInput v-model="s.pw" type="password" class="w-full" autocomplete="new-password" />
        </UFormField>
        <UFormField label="Nhập lại mật khẩu mới" required>
          <UInput v-model="s.pw2" type="password" class="w-full" autocomplete="new-password" @keydown.enter="save" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" icon="i-lucide-x" label="Hủy" @click="open = false" />
        <UButton icon="i-lucide-key-round" label="Đổi mật khẩu" :loading="s.saving" @click="save" />
      </div>
    </template>
  </UModal>
</template>
