<script setup lang="ts">
import { homeFor } from '@/app/router'
import logoUrl from '@/assets/logo-fomeco.png'
import Aura from '@/shared/components/Aura.vue'
import { useAuthStore } from '@/shared/stores/auth'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as z from 'zod'

const route = useRoute()
const router = useRouter()
const loading = shallowRef(false)
const error = shallowRef('')
const { login, hasPermission } = useAuthStore()

const fields: AuthFormField[] = [
  {
    name: 'username',
    type: 'text',
    label: 'Tài khoản',
    placeholder: 'Nhập tên đăng nhập...',
    required: true,
    autofocus: true,
    defaultValue: '',
  },
  {
    name: 'password',
    type: 'password',
    label: 'Mật khẩu',
    placeholder: 'Nhập mật khẩu...',
    required: true,
    defaultValue: '',
  },
]

const schema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
})
type Schema = z.output<typeof schema>

const handleLogin = async (event: FormSubmitEvent<Schema>) => {
  loading.value = true
  error.value = ''
  const msg = await login(event.data.username, event.data.password)
  loading.value = false
  if (msg) {
    error.value = msg
    return
  }
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  await router.push(redirect && redirect !== '/' ? redirect : homeFor(hasPermission))
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-muted px-4">
    <Aura class="w-full max-w-md text-primary">
      <UPageCard class="w-full">
        <UAuthForm
          :fields="fields"
          :schema="schema"
          :loading="loading"
          :submit="{ label: 'Đăng nhập', icon: 'i-lucide-log-in' }"
          title="FOMECO Mini-MES"
          description="Báo cáo sản xuất BTP theo công đoạn"
          @submit="handleLogin"
        >
          <template #leading>
            <img :src="logoUrl" alt="FOMECO" class="mx-auto mb-2 h-14 w-auto" />
          </template>
          <template #validation>
            <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" :description="error" />
          </template>
          <template #footer>
            <p class="text-center text-xs text-toned">
              Quên mật khẩu? Liên hệ quản trị viên để được cấp lại.
            </p>
          </template>
        </UAuthForm>
      </UPageCard>
    </Aura>
  </div>
</template>
