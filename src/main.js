import { createApp } from "vue";
import App from "./App.vue";

window.__APP_BASE_URL__ = import.meta.env.BASE_URL || "/";

createApp(App).mount("#app");
