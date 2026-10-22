<script setup lang="ts">
// Quét QR bằng camera (điện thoại/tablet/webcam) hoặc máy quét cầm tay (gõ vào ô + Enter)
import QrScanner from 'qr-scanner'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ detected: [text: string] }>()

const videoRef = ref<HTMLVideoElement | null>(null)
const inputRef = ref<{ inputRef?: HTMLInputElement } | null>(null)
const manualText = ref('')
const cameraError = ref('')
const starting = ref(false)
let scanner: QrScanner | null = null
let lastText = ''
let lastAt = 0

async function startCamera() {
  cameraError.value = ''
  starting.value = true
  await nextTick()
  try {
    if (!videoRef.value) throw new Error('no video')
    scanner = new QrScanner(
      videoRef.value,
      (result) => {
        const text = result.data
        const now = Date.now()
        if (text === lastText && now - lastAt < 2500) return // chống quét lặp
        lastText = text
        lastAt = now
        if (navigator.vibrate) navigator.vibrate(80)
        emit('detected', text) // trang cha đóng cửa sổ khi mã hợp lệ
      },
      { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: 'environment' },
    )
    await scanner.start()
  } catch {
    cameraError.value =
      'Không thể mở camera. Vui lòng kiểm tra quyền truy cập hoặc nhập nội dung mã QR.'
  } finally {
    starting.value = false
    inputRef.value?.inputRef?.focus()
  }
}

function stopCamera() {
  scanner?.stop()
  scanner?.destroy()
  scanner = null
}

watch(open, (v) => {
  if (v) {
    manualText.value = ''
    void startCamera()
  } else stopCamera()
})

onBeforeUnmount(stopCamera)

function submitManual() {
  emit('detected', manualText.value)
  manualText.value = ''
}
</script>

<template>
  <UModal v-model:open="open" title="Quét mã QR" description="Đưa mã QR vào khung hình" :ui="{ description: 'sr-only' }">
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="relative overflow-hidden rounded-lg bg-black" style="aspect-ratio: 4 / 3">
          <video ref="videoRef" class="h-full w-full object-cover" muted playsinline />
          <div v-if="starting" class="absolute inset-0 flex items-center justify-center text-white">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
          </div>
          <div
            v-if="cameraError"
            class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white"
          >
            <UIcon name="i-lucide-camera-off" class="size-10" />
            {{ cameraError }}
          </div>
        </div>

        <UFormField
          label="Nội dung QR"
          help="Dùng máy quét cầm tay (tự gõ vào ô) hoặc nhập tay, ví dụ VB-6204|NL-01, rồi nhấn Enter."
        >
          <div class="flex gap-2">
            <UInput
              ref="inputRef"
              v-model="manualText"
              class="flex-1"
              placeholder="Mã hàng|Mã công đoạn"
              icon="i-lucide-scan-line"
              data-testid="qr-input"
              @keydown.enter.prevent="submitManual"
            />
            <UButton label="Xác nhận" icon="i-lucide-check" @click="submitManual" />
          </div>
        </UFormField>

      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton color="neutral" variant="outline" label="Đóng" icon="i-lucide-x" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
