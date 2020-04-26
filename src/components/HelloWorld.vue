<template>
  <div class="face-app">
    <div class="face-stage">
      <div class="face-camv" id="mycam"></div>
      <canvas id="ctx" class="face-camc" :width="width" :height="height"></canvas>
    </div>
    <div class="face-status">
      <p><strong>Camera:</strong> {{ camEnabled ? "running" : "stopped" }}</p>
      <p><strong>Detector:</strong> {{ detectorReady ? "ready" : "loading" }}</p>
      <p><strong>Loop:</strong> {{ isDetecting ? "processing" : "idle" }}</p>
      <p v-if="lastError" class="face-error"><strong>Error:</strong> {{ lastError }}</p>
    </div>
  </div>
</template>

<script>
import { initFaceDetector, face_detection, draw_frame } from "../utils/face.js";
import { createCameraAdapter } from "../utils/camera.js";

export default {
  name: "picojs",
  data() {
    return {
      camEnabled: false,
      detectorReady: false,
      isDetecting: false,
      loopTimer: null,
      lastError: "",
      width: 640,
      height: 480,
      camera: null,
    };
  },
  mounted() {
    this.camera = createCameraAdapter();
    this.camInit();
  },
  beforeUnmount() {
    this.camStop();
    draw_frame(null, "ctx");
  },
  methods: {
    async camInit() {
      this.lastError = "";
      await this.camStop();

      try {
        await initFaceDetector();
        this.detectorReady = true;
      } catch (error) {
        this.detectorReady = false;
        this.lastError = `load cascade failed: ${error.message}`;
        return;
      }

      try {
        await this.camera.start({
          containerId: "mycam",
          width: this.width,
          height: this.height,
          facingMode: "user",
        });
        this.camEnabled = true;
        this.scheduleNextDetection(0);
      } catch (error) {
        this.camEnabled = false;
        this.lastError = `camera start failed: ${error.message}`;
        return;
      }
    },
    scheduleNextDetection(delay) {
      if (this.loopTimer) {
        window.clearTimeout(this.loopTimer);
      }
      this.loopTimer = window.setTimeout(this.runDetectionTick, delay);
    },
    captureFrame() {
      return new Promise((resolve, reject) => {
        try {
          const dataUri = this.camera.captureFrame("image/jpeg", 0.8);
          resolve(dataUri);
        } catch (error) {
          reject(error);
        }
      });
    },
    async runDetectionTick() {
      if (!this.camEnabled || !this.detectorReady) {
        return;
      }
      if (this.isDetecting) {
        this.scheduleNextDetection(100);
        return;
      }

      this.isDetecting = true;
      try {
        const dataUri = await this.captureFrame();
        const det = await face_detection(dataUri);
        draw_frame(det, "ctx");
        this.lastError = "";
      } catch (error) {
        this.lastError = `detect failed: ${error.message}`;
        draw_frame(null, "ctx");
      } finally {
        this.isDetecting = false;
        if (this.camEnabled) {
          this.scheduleNextDetection(150);
        }
      }
    },
    async camStop() {
      this.camEnabled = false;
      this.isDetecting = false;
      if (this.loopTimer) {
        window.clearTimeout(this.loopTimer);
        this.loopTimer = null;
      }

      try {
        if (this.camera) {
          await this.camera.stop();
        }
      } catch (_err) {
        // Ignore teardown errors so component unmount is stable.
      }
    },
  },
};
</script>

<style scoped>
.face-app {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
}
.face-stage {
  position: relative;
  width: 640px;
  height: 480px;
}
.face-camv {
  position: absolute;
  width: 640px;
  height: 480px;
  overflow: hidden;
}
.face-camv :deep(.face-video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.face-camc {
  position: absolute;
  z-index: 3;
}
.face-status {
  width: 640px;
  text-align: left;
  font-family: monospace;
  line-height: 1.4;
}
.face-status p {
  margin: 0;
}
.face-error {
  color: #b91c1c;
}
@media (max-width: 720px) {
  .face-stage,
  .face-camv,
  .face-camc,
  .face-status {
    width: 100%;
    max-width: 640px;
  }
  .face-stage {
    height: auto;
    aspect-ratio: 4 / 3;
  }
}
</style>
