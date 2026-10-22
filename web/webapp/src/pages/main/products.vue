<script setup lang="ts">
import CreateQrDialog from '@/features/product/CreateQrDialog.vue'
import ImportExcelDialog from '@/features/product/ImportExcelDialog.vue'
import ItemFormDialog from '@/features/product/ItemFormDialog.vue'
import ProductDetailDialog from '@/features/product/ProductDetailDialog.vue'
import QrPreviewDialog from '@/features/product/QrPreviewDialog.vue'
import { listItemOperations, listItems, listOperations } from '@/lib/api'
import type { Item, ItemOperation } from '@/lib/types'
import ErpSyncInfo from '@/shared/components/ErpSyncInfo.vue'
import PageHeader from '@/shared/components/PageHeader.vue'
import { downloadLabelSvg, type QrLabelData } from '@/shared/utils/qr'
import { fmtDateTime, normalize, SOURCE_LABEL } from '@/shared/utils/format'
import { useQuery } from '@pinia/colada'
import { computed, ref } from 'vue'

const { data: items, refetch: refetchItems, isLoading: l1 } = useQuery({ key: ['items'], query: listItems })
const { data: itemOps, refetch: refetchOps, isLoading: l2 } = useQuery({
  key: ['item-operations'],
  query: () => listItemOperations(),
})
const { data: operations, refetch: refetchOperations } = useQuery({ key: ['operations'], query: listOperations })
const loading = computed(() => l1.value || l2.value)

const refresh = () => {
  void refetchItems()
  void refetchOps()
  void refetchOperations()
}

const tab = ref<'catalog' | 'qr'>('catalog')
const search = ref('')
const qrSearch = ref('')

const opsByItem = computed(() => {
  const m = new Map<string, ItemOperation[]>()
  for (const o of itemOps.value ?? []) m.set(o.item_id, [...(m.get(o.item_id) ?? []), o])
  return m
})

const filteredItems = computed(() => {
  const s = normalize(search.value.trim())
  return (items.value ?? []).filter((i) => !s || normalize(`${i.code} ${i.name}`).includes(s))
})

const qrList = computed(() => {
  const s = normalize(qrSearch.value.trim())
  return (itemOps.value ?? [])
    .filter((o) => o.qr_value)
    .filter((o) => !s || normalize(`${o.item_code} ${o.item_name} ${o.operation_code} ${o.operation_name}`).includes(s))
    .sort((a, b) => (b.qr_created_at ?? '').localeCompare(a.qr_created_at ?? ''))
})

const totalOps = computed(() => (itemOps.value ?? []).length)

// Dialogs
const createOpen = ref(false)
const presetItemId = ref<string | null>(null)
const detailOpen = ref(false)
const detailItem = ref<Item | null>(null)
const previewOpen = ref(false)
const previewLabels = ref<QrLabelData[]>([])
const importOpen = ref(false)
const itemFormOpen = ref(false)
const erpOpen = ref(false)

const toLabel = (o: ItemOperation): QrLabelData => ({
  qr_value: o.qr_value!,
  item_code: o.item_code,
  item_name: o.item_name,
  operation_code: o.operation_code,
  operation_name: o.operation_name,
})

function openCreate(itemId: string | null = null) {
  presetItemId.value = itemId
  createOpen.value = true
}
function openDetail(i: Item) {
  detailItem.value = i
  detailOpen.value = true
}
function preview(list: ItemOperation[]) {
  previewLabels.value = list.filter((o) => o.qr_value).map(toLabel)
  previewOpen.value = true
}
async function onCreated(itemId: string, opIds: string[]) {
  await refetchOps()
  const list = (itemOps.value ?? []).filter((o) => o.item_id === itemId && opIds.includes(o.operation_id))
  tab.value = 'qr'
  preview(list)
}
async function onItemCreated(id: string) {
  await refetchItems()
  const it = (items.value ?? []).find((i) => i.id === id)
  if (it) openDetail(it)
}

const tabs = computed(() => [
  { label: 'Danh mục mã hàng', icon: 'i-lucide-package', value: 'catalog' },
  { label: 'Mã QR đã tạo', icon: 'i-lucide-qr-code', value: 'qr', badge: qrList.value.length },
])
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Quản trị mã hàng" icon="i-lucide-qr-code">
      <template #actions>
        <UButton color="neutral" variant="outline" icon="i-lucide-file-up" label="Nhập Excel" @click="importOpen = true" />
        <UButton color="neutral" variant="outline" icon="i-lucide-plus" label="Thêm mã hàng" @click="itemFormOpen = true" />
        <UButton icon="i-lucide-plus" label="Tạo mã QR" data-testid="open-create-qr" @click="openCreate()" />
      </template>
    </PageHeader>

    <UCard :ui="{ body: 'p-4 sm:p-6' }">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <UTabs v-model="tab" :items="tabs" variant="link" :content="false" />
        <UButton variant="link" color="primary" icon="i-lucide-refresh-cw" label="Đồng bộ ERP" @click="erpOpen = true" />
      </div>

      <!-- DANH MỤC -->
      <template v-if="tab === 'catalog'">
        <div class="my-4 flex items-center gap-2">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Tìm mã hàng hoặc tên sản phẩm" class="w-full sm:w-80" />
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :loading="loading" @click="refresh" />
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-sm">
            <thead class="border-b border-default text-left text-toned">
              <tr>
                <th class="py-2 pe-3">Mã hàng</th>
                <th class="py-2 pe-3">Tên sản phẩm</th>
                <th class="py-2 pe-3">Công đoạn từ ERP</th>
                <th class="py-2 pe-3">Mã QR đã tạo</th>
                <th class="py-2 pe-3">Nguồn dữ liệu</th>
                <th class="py-2">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="i in filteredItems" :key="i.id" :class="{ 'opacity-60': !i.active }">
                <td class="py-3 pe-3 font-mono font-semibold">{{ i.code }}</td>
                <td class="py-3 pe-3">{{ i.name }} <UBadge v-if="!i.active" color="neutral" label="Ngừng dùng" size="sm" /></td>
                <td class="py-3 pe-3"><UBadge color="neutral" :label="`${opsByItem.get(i.id)?.length ?? 0} công đoạn`" /></td>
                <td class="py-3 pe-3">
                  <UBadge
                    :color="(opsByItem.get(i.id) ?? []).filter((o) => o.qr_value).length === (opsByItem.get(i.id)?.length ?? 0) && opsByItem.get(i.id)?.length ? 'success' : 'neutral'"
                    :label="`${(opsByItem.get(i.id) ?? []).filter((o) => o.qr_value).length} / ${opsByItem.get(i.id)?.length ?? 0}`"
                  />
                </td>
                <td class="py-3 pe-3"><UBadge color="info" :label="SOURCE_LABEL[i.source]" /></td>
                <td class="py-3 whitespace-nowrap">
                  <UButton size="sm" icon="i-lucide-qr-code" label="Tạo QR" class="me-2" @click="openCreate(i.id)" />
                  <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-clipboard-list" label="Chi tiết" @click="openDetail(i)" />
                </td>
              </tr>
              <tr v-if="!filteredItems.length && !loading">
                <td colspan="6" class="py-8 text-center text-toned">Không tìm thấy mã hàng.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-3 text-xs text-toned">
          Hiển thị {{ filteredItems.length }} / {{ items?.length ?? 0 }} mã hàng · {{ totalOps }} công đoạn theo mã hàng
        </p>
      </template>

      <!-- MÃ QR ĐÃ TẠO -->
      <template v-else>
        <div class="my-4 flex items-center gap-2">
          <UInput v-model="qrSearch" icon="i-lucide-search" placeholder="Tìm mã hàng, công đoạn" class="w-full sm:w-80" />
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-sm">
            <thead class="border-b border-default text-left text-toned">
              <tr>
                <th class="py-2 pe-3">Mã hàng / Sản phẩm</th>
                <th class="py-2 pe-3">Công đoạn</th>
                <th class="py-2 pe-3">Nội dung QR</th>
                <th class="py-2 pe-3">Thời gian tạo</th>
                <th class="py-2 pe-3">Người tạo</th>
                <th class="py-2">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="o in qrList" :key="o.id">
                <td class="py-3 pe-3"><div class="font-mono font-semibold">{{ o.item_code }}</div><div class="text-xs text-toned">{{ o.item_name }}</div></td>
                <td class="py-3 pe-3">{{ o.operation_code }} · {{ o.operation_name }}</td>
                <td class="py-3 pe-3 font-mono text-xs">{{ o.qr_value }}</td>
                <td class="py-3 pe-3">{{ fmtDateTime(o.qr_created_at) }}</td>
                <td class="py-3 pe-3">{{ o.qr_created_by_name }}</td>
                <td class="py-3 whitespace-nowrap">
                  <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-eye" label="Xem QR" class="me-2" @click="preview([o])" />
                  <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-download" label="Tải SVG" @click="downloadLabelSvg(toLabel(o))" />
                </td>
              </tr>
              <tr v-if="!qrList.length"><td colspan="6" class="py-8 text-center text-toned">Chưa có mã QR nào.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="mt-3 flex items-center justify-between">
          <p class="text-xs text-toned">{{ qrList.length }} mã QR · Nội dung QR cố định theo mã hàng và công đoạn</p>
          <UButton color="neutral" variant="outline" icon="i-lucide-printer" label="In danh sách" :disabled="!qrList.length" @click="preview(qrList)" />
        </div>
      </template>
    </UCard>

    <CreateQrDialog v-model:open="createOpen" :item-ops="itemOps ?? []" :preset-item-id="presetItemId" @created="onCreated" />
    <ProductDetailDialog
      v-model:open="detailOpen"
      :item="detailItem"
      :item-ops="itemOps ?? []"
      :operations="operations ?? []"
      @changed="refresh"
      @preview="preview"
    />
    <QrPreviewDialog v-model:open="previewOpen" :labels="previewLabels" />
    <ImportExcelDialog v-model:open="importOpen" @imported="refresh" />
    <ItemFormDialog v-model:open="itemFormOpen" @created="onItemCreated" />
    <ErpSyncInfo v-model:open="erpOpen" subject="mã hàng và công đoạn" />
  </div>
</template>
