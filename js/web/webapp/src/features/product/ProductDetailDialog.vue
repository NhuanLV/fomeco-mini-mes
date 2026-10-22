<script setup lang="ts">
import { addItemOperation, createQrCodes, removeItemOperation, saveItem, upsertOperation } from '@/lib/api'
import type { Item, ItemOperation, Operation } from '@/lib/types'
import { useConfirm } from '@/shared/composables/useConfirm'
import { fmtDateTime, SOURCE_LABEL } from '@/shared/utils/format'
import { showError, showSuccess, showWarn } from '@/shared/utils/toast'
import { computed, ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item: Item | null; itemOps: ItemOperation[]; operations: Operation[] }>()
const emit = defineEmits<{ changed: []; preview: [ops: ItemOperation[]] }>()
const confirm = useConfirm()

const ops = computed(() => props.itemOps.filter((o) => o.item_id === props.item?.id).sort((a, b) => a.seq - b.seq))
const missing = computed(() => ops.value.filter((o) => !o.qr_value))
const busy = ref(false)

// Sửa tên / trạng thái mã hàng
const name = ref('')
const active = ref(true)
watch(
  () => [open.value, props.item] as const,
  ([o, it]) => {
    if (o && it) {
      name.value = it.name
      active.value = it.active
      newOpCode.value = ''
      newOpName.value = ''
    }
  },
)

async function saveInfo() {
  if (!props.item) return
  if (!name.value.trim()) return showWarn('Vui lòng nhập tên sản phẩm.')
  try {
    await saveItem({ id: props.item.id, code: props.item.code, name: name.value, active: active.value })
    showSuccess('Đã cập nhật mã hàng.')
    emit('changed')
  } catch (e) {
    showError((e as Error).message)
  }
}

// Thêm công đoạn
const newOpCode = ref('')
const newOpName = ref('')
const opSuggestions = computed(() => props.operations.map((o) => ({ label: `${o.code} · ${o.name}`, value: o.code })))
watch(newOpCode, (c) => {
  const found = props.operations.find((o) => o.code === c)
  if (found) newOpName.value = found.name
})

async function addOp() {
  if (!props.item) return
  const code = newOpCode.value.trim().toUpperCase()
  if (!code) return showWarn('Vui lòng nhập mã công đoạn.')
  if (!newOpName.value.trim()) return showWarn('Vui lòng nhập tên công đoạn.')
  if (ops.value.some((o) => o.operation_code === code)) return showWarn('Công đoạn đã có trong mã hàng.')
  busy.value = true
  try {
    const opId = await upsertOperation(code, newOpName.value)
    await addItemOperation(props.item.id, opId, (ops.value.at(-1)?.seq ?? 0) + 1)
    newOpCode.value = ''
    newOpName.value = ''
    showSuccess('Đã thêm công đoạn.')
    emit('changed')
  } catch (e) {
    showError((e as Error).message)
  } finally {
    busy.value = false
  }
}

function removeOp(o: ItemOperation) {
  void confirm.require({
    header: 'Xóa công đoạn khỏi mã hàng',
    message: `Xóa công đoạn ${o.operation_code} khỏi mã hàng ${o.item_code}? Không thể xóa nếu đã có báo cáo.`,
    acceptProps: { label: 'Xóa', color: 'error' },
    accept: async () => {
      try {
        await removeItemOperation(o.id)
        showSuccess('Đã xóa công đoạn.')
        emit('changed')
      } catch (e) {
        showError((e as Error).message)
      }
    },
  })
}

async function createQr(opIds: string[] | null) {
  if (!props.item) return
  busy.value = true
  try {
    const n = await createQrCodes(props.item.id, opIds)
    showSuccess(`Đã tạo ${n} mã QR.`)
    emit('changed')
  } catch (e) {
    showError((e as Error).message)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Chi tiết mã hàng" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div v-if="item" class="flex flex-col gap-5">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <UFormField label="Mã hàng"><UInput :model-value="item.code" disabled class="w-full" /></UFormField>
          <UFormField label="Tên sản phẩm"><UInput v-model="name" class="w-full" /></UFormField>
          <div class="flex items-center gap-3 pb-1">
            <USwitch v-model="active" label="Đang dùng" />
            <UButton size="sm" color="neutral" variant="outline" label="Lưu" @click="saveInfo" />
          </div>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <h3 class="font-semibold">Công đoạn tương ứng</h3>
            <UBadge color="info" :label="SOURCE_LABEL[item.source]" />
          </div>
          <table class="w-full text-sm">
            <thead class="border-b border-default text-left text-toned">
              <tr>
                <th class="py-2 pe-2">#</th>
                <th class="py-2 pe-2">Mã công đoạn</th>
                <th class="py-2 pe-2">Tên công đoạn</th>
                <th class="py-2 pe-2">Trạng thái QR</th>
                <th class="py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="o in ops" :key="o.id">
                <td class="py-2 pe-2 text-toned">{{ o.seq }}</td>
                <td class="py-2 pe-2 font-mono">{{ o.operation_code }}</td>
                <td class="py-2 pe-2">{{ o.operation_name }}</td>
                <td class="py-2 pe-2">
                  <UBadge v-if="o.qr_value" color="success" label="Đã tạo" :title="fmtDateTime(o.qr_created_at)" />
                  <UBadge v-else color="neutral" label="Chưa tạo" />
                </td>
                <td class="py-2 text-right whitespace-nowrap">
                  <UButton v-if="!o.qr_value" size="xs" icon="i-lucide-qr-code" label="Tạo QR" :loading="busy" @click="createQr([o.operation_id])" />
                  <UButton v-else size="xs" color="neutral" variant="outline" icon="i-lucide-eye" label="Xem QR" @click="emit('preview', [o])" />
                  <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" title="Xóa khỏi mã hàng" @click="removeOp(o)" />
                </td>
              </tr>
              <tr v-if="!ops.length"><td colspan="5" class="py-6 text-center text-toned">Chưa có công đoạn.</td></tr>
            </tbody>
          </table>
        </div>

        <div class="rounded-lg border border-dashed border-default p-3">
          <div class="mb-2 text-sm font-semibold">Thêm công đoạn</div>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
            <UInputMenu
              v-model="newOpCode"
              :items="opSuggestions"
              value-key="value"
              create-item
              placeholder="Mã công đoạn (vd. TIEN-01)"
              @create="(v: string) => (newOpCode = v.toUpperCase())"
            />
            <UInput v-model="newOpName" placeholder="Tên công đoạn" />
            <UButton icon="i-lucide-plus" label="Thêm" :loading="busy" @click="addOp" />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" icon="i-lucide-x" label="Đóng" @click="open = false" />
        <UButton
          icon="i-lucide-qr-code"
          :label="missing.length ? `Tạo mã QR (${missing.length})` : 'Xem tất cả QR'"
          :loading="busy"
          @click="missing.length ? createQr(null) : emit('preview', ops)"
        />
      </div>
    </template>
  </UModal>
</template>
