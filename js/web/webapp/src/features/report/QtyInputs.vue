<script setup lang="ts">
import { fmtQty } from '@/shared/utils/format'
import { computed } from 'vue'
import { toInt, type QtyForm } from './qty'

const model = defineModel<QtyForm>({ required: true })
defineProps<{ disabled?: boolean; large?: boolean }>()

const total = computed(() => toInt(model.value.ok_qty) + toInt(model.value.ng_qty))
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <UFormField label="Sản lượng OK" required>
      <UInput
        v-model="model.ok_qty"
        inputmode="numeric"
        placeholder="Nhập sản lượng đạt"
        class="w-full"
        :size="large ? 'xl' : 'lg'"
        :disabled
        data-testid="ok-qty"
        :ui="{ trailing: 'pe-3 text-sm text-toned' }"
      >
        <template #trailing>chiếc</template>
      </UInput>
    </UFormField>
    <UFormField label="Sản lượng NG" required>
      <UInput
        v-model="model.ng_qty"
        inputmode="numeric"
        placeholder="0"
        class="w-full"
        :size="large ? 'xl' : 'lg'"
        :disabled
        data-testid="ng-qty"
        :ui="{ trailing: 'pe-3 text-sm text-toned' }"
      >
        <template #trailing>chiếc</template>
      </UInput>
    </UFormField>
    <UFormField>
      <template #label>Nhận BTP <span class="text-xs font-normal text-toned">(Tùy chọn)</span></template>
      <UInput
        v-model="model.received_qty"
        inputmode="numeric"
        placeholder="Để trống = 0"
        class="w-full"
        :size="large ? 'xl' : 'lg'"
        :disabled
        data-testid="received-qty"
        :ui="{ trailing: 'pe-3 text-sm text-toned' }"
      >
        <template #trailing>chiếc</template>
      </UInput>
    </UFormField>
    <UFormField>
      <template #label>Chuyển BTP <span class="text-xs font-normal text-toned">(Tùy chọn)</span></template>
      <UInput
        v-model="model.transferred_qty"
        inputmode="numeric"
        placeholder="Để trống = 0"
        class="w-full"
        :size="large ? 'xl' : 'lg'"
        :disabled
        data-testid="transferred-qty"
        :ui="{ trailing: 'pe-3 text-sm text-toned' }"
      >
        <template #trailing>chiếc</template>
      </UInput>
    </UFormField>

    <div
      class="flex items-center justify-between rounded-lg border border-default bg-elevated/60 px-4 py-3 sm:col-span-2"
    >
      <div>
        <div class="font-medium">Tổng sản lượng</div>
        <div class="text-xs text-toned">OK + NG</div>
      </div>
      <div class="text-primary-600">
        <span class="font-mono text-3xl font-bold" data-testid="total-qty">{{ fmtQty(total) }}</span>
        <span class="ms-1 text-sm text-toned">chiếc</span>
      </div>
    </div>
  </div>
</template>
