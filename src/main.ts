import { createApp } from 'vue';

import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

import 'dayjs/locale/zh-cn';
import '@/assets/styles';

const pinia = createPinia();
const app = createApp(App);
app.use(ElementPlus, {
  locale: zhCn,
});
app.use(pinia);
app.use(router);
app.mount('#app');
