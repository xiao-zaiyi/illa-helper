import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import '../../assets/main.css';
import { i18n, initializeLocale } from '@/src/i18n';

const app = createApp(App);

// 使用 i18n
app.use(i18n);

// 初始化语言设置
initializeLocale();

app.mount('#app');
