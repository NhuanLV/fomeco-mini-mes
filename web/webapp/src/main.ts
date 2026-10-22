import './assets/main.css'

import { PiniaColada } from '@pinia/colada'
import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'
import { createApp } from 'vue'
import App from './app/App.vue'
import router from './app/router'
import { supabase } from './lib/supabase'
import { useAuthStore } from './shared/stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(PiniaColada, { queryOptions: { refetchOnWindowFocus: false } })
app.use(router)
app.use(ui)

// Khi phiên đăng nhập hết hạn / đăng xuất ở tab khác → về trang đăng nhập
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    const auth = useAuthStore()
    auth.currentUser.value = null
    auth.isAuthenticated.value = false
    if (router.currentRoute.value.path !== '/login') void router.replace('/login')
  }
})

app.mount('#app')
