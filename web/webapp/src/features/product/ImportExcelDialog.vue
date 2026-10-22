<script setup lang="ts">
import { importCatalog } from '@/lib/api'
import { downloadCatalogTemplate, readExcel } from '@/shared/utils/excel'
import { showError, showSuccess, showWarn } from '@/shared/utils/toast'
import { ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ imported: [] }>()

type Row = { item_code: string; item_name: string; op_code: string; op_name: string; seq: number }
const rows = ref<Row[]>([])
const fileName = ref('')
const saving = ref(false)
watch(open, (v) => v && ((rows.value = []), (fileName.value = '')))

const pick = (r: Record<string, unknown>, keys: string[]) => {
  for (const k of Object.keys(r)) {
    const nk = k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').trim()
    if (keys.includes(nk)) return String(r[k] ?? '').trim()
  }
  return ''
}

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  fileName.value = f.name
  try {
    const raw = await readExcel(f)
    rows.value = raw
      .map((r, i) => ({
        item_code: pick(r, ['ma hang', 'item_code', 'ma vat tu']),
        item_name: pick(r, ['ten san pham', 'item_name', 'ten hang']),
        op_code: pick(r, ['ma cong doan', 'op_code']),
        op_name: pick(r, ['ten cong doan', 'op_name']),
        seq: Number(pick(r, ['thu tu', 'seq', 'stt'])) || i + 1,
      }))
      .filter((r) => r.item_code && r.op_code)
    if (!rows.value.length) showWarn('Không đọc được dòng hợp lệ. Kiểm tra lại tên cột theo file mẫu.')
  } catch {
    showError('Không đọc được file Excel.')
  }
}

async function doImport() {
  saving.value = true
  try {
    const res = await importCatalog(rows.value)
    showSuccess(`Đã nhập ${res.rows} dòng mã hàng – công đoạn.`)
    open.value = false
    emit('imported')
  } catch (e) {
    showError((e as Error).message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Nhập mã hàng & công đoạn từ Excel" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div class="flex flex-col gap-4 text-sm">
        <p>
          File cần các cột: <b>Mã hàng, Tên sản phẩm, Mã công đoạn, Tên công đoạn, Thứ tự</b> (mỗi dòng là một công đoạn).
          Có thể dùng file xuất từ Bravo sau khi đổi tên cột.
        </p>
        <div class="flex flex-wrap gap-2">
          <UButton color="neutral" variant="outline" icon="i-lucide-download" label="Tải file mẫu" @click="downloadCatalogTemplate" />
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-1.5 font-medium text-white hover:bg-primary/90">
            <UIcon name="i-lucide-upload" /> Chọn file Excel
            <input type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onFile" />
          </label>
          <span v-if="fileName" class="self-center text-toned">{{ fileName }}</span>
        </div>
        <div v-if="rows.length" class="max-h-72 overflow-auto rounded border border-default">
          <table class="w-full text-xs">
            <thead class="sticky top-0 bg-elevated text-left">
              <tr><th class="p-2">Mã hàng</th><th class="p-2">Tên sản phẩm</th><th class="p-2">Mã CĐ</th><th class="p-2">Tên công đoạn</th><th class="p-2">TT</th></tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="(r, i) in rows" :key="i">
                <td class="p-2 font-mono">{{ r.item_code }}</td><td class="p-2">{{ r.item_name }}</td>
                <td class="p-2 font-mono">{{ r.op_code }}</td><td class="p-2">{{ r.op_name }}</td><td class="p-2">{{ r.seq }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full items-center justify-between">
        <span class="text-sm text-toned">{{ rows.length }} dòng hợp lệ</span>
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" label="Hủy" @click="open = false" />
          <UButton icon="i-lucide-upload" label="Nhập dữ liệu" :disabled="!rows.length" :loading="saving" @click="doImport" />
        </div>
      </div>
    </template>
  </UModal>
</template>
