<script setup lang="ts">
import { saveItem } from '@/lib/api'
import { showError, showSuccess, showWarn } from '@/shared/utils/toast'
import { ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [id: string] }>()
const code = ref('')
const name = ref('')
const saving = ref(false)
watch(open, (v) => v && ((code.value = ''), (name.value = '')))

async function save() {
  if (!code.value.trim()) return showWarn('Vui lòng nhập mã hàng.')
  if (!name.value.trim()) return showWarn('Vui lòng nhập tên sản phẩm.')
  saving.value = true
  try {
    const id = await saveItem({ code: code.value.trim().toUpperCase(), name: name.value })
    showSuccess('Đã thêm mã hàng. Hãy thêm công đoạn cho mã hàng.')
    open.value = false
    emit('created', id)
  } catch (e) {
    showError((e as Error).message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Thêm mã hàng">
    <template #body>
      <div class="flex flex-col gap-4">
        <UAlert color="info" icon="i-lucide-info" description="Khi kết nối Bravo, mã hàng sẽ được đồng bộ tự động. Thêm tay chỉ dùng cho demo hoặc hàng chưa có trên ERP." />
        <UFormField label="Mã hàng" required><UInput v-model="code" class="w-full" placeholder="VD: TR-125" /></UFormField>
        <UFormField label="Tên sản phẩm" required><UInput v-model="name" class="w-full" placeholder="VD: Trục truyền động Ø25" /></UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" icon="i-lucide-x" label="Hủy" @click="open = false" />
        <UButton icon="i-lucide-check" label="Lưu" :loading="saving" @click="save" />
      </div>
    </template>
  </UModal>
</template>
