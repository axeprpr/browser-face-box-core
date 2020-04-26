<template>
  <main id="app">
    <h1 class="title">Browser Face Detection</h1>
    <FaceDetectionView />
  </main>
</template>

<script>
import FaceDetectionView from "./components/FaceDetectionView.vue";

export default {
  name: "AppRoot",
  components: {
    FaceDetectionView,
  },
};
</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  min-height: 100vh;
  padding: 24px 12px;
  box-sizing: border-box;
}
.title {
  margin: 0 0 16px;
  font-size: 24px;
  font-weight: 600;
}
</style>
