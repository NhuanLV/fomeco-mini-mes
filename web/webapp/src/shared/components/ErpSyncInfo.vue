<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
defineProps<{ subject: string }>()
</script>

<template>
  <UModal v-model:open="open" title="Đồng bộ ERP (Bravo)">
    <template #body>
      <div class="flex flex-col gap-3 text-sm leading-6">
        <UAlert
          color="info"
          icon="i-lucide-info"
          title="Bản demo chưa kết nối trực tiếp Bravo"
          :description="`Danh mục ${subject} đang dùng dữ liệu mẫu có cột Mã ERP và Nguồn dữ liệu để sẵn sàng đồng bộ.`"
        />
        <p>Khi triển khai thật, đồng bộ sẽ chạy theo luồng:</p>
        <ol class="list-decimal space-y-1 ps-5">
          <li>Chương trình đồng bộ đặt trong mạng nội bộ FOMECO, đọc Bravo (SQL Server) bằng tài khoản <b>chỉ đọc</b>.</li>
          <li>Định kỳ 5–15 phút đẩy mã hàng, công đoạn, xí nghiệp lên hệ thống (không mở cổng ra internet).</li>
          <li>Trong lúc chờ: dùng <b>Nhập Excel</b> với file xuất từ Bravo.</li>
        </ol>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton color="neutral" variant="outline" label="Đóng" icon="i-lucide-x" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
