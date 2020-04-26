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
  name: "FaceDetectionView",
  data() {
    return {
      camEnabled: false,
      detectorReady: false,
      isDetecting: false,
      loopTimer: null,
      lastError: "",
      width: 640,
      height: 480,
      detectOptions: {
        shiftfactor: 0.12,
        scalefactor: 1.2,
        maxsize: 800,
      },
      fallbackDetectOptions: {
        shiftfactor: 0.1,
        scalefactor: 1.1,
        maxsize: 1200,
      },
      detectQThreshold: 4.5,
      fallbackQThreshold: 2.5,
      detectIouThreshold: 0.2,
      frameIndex: 0,
      smoothedDet: null,
      lostFrames: 0,
      smoothAlpha: 0.35,
      maxHoldFrames: 6,
      drawOptions: {
        mirrorX: false,
        xOffset: 0,
      },
      camera: null,
    };
  },
  mounted() {
    this.camera = createCameraAdapter();
    this.camInit();
  },
  beforeUnmount() {
    this.camStop();
    draw_frame(null, "ctx", this.drawOptions);
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
        this.lastError = this.toCameraErrorMessage(error);
        return;
      }
    },
    toCameraErrorMessage(error) {
      switch (error && error.code) {
        case "INSECURE_CONTEXT":
          return "camera start failed: HTTPS (or localhost) is required";
        case "PERMISSION_DENIED":
          return "camera start failed: permission denied";
        case "DEVICE_NOT_FOUND":
          return "camera start failed: no camera device found";
        case "DEVICE_BUSY":
          return "camera start failed: device is busy";
        case "CONSTRAINT_UNSATISFIED":
          return "camera start failed: unsupported camera constraints";
        default:
          return `camera start failed: ${error.message}`;
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
          const dataUri = this.camera.captureFrame("image/png");
          resolve(dataUri);
        } catch (error) {
          reject(error);
        }
      });
    },
    smoothDetection(det) {
      if (!det) {
        this.lostFrames += 1;
        if (this.lostFrames <= this.maxHoldFrames && this.smoothedDet) {
          return this.smoothedDet;
        }
        this.smoothedDet = null;
        return null;
      }

      this.lostFrames = 0;
      if (!this.smoothedDet) {
        this.smoothedDet = [...det];
        return this.smoothedDet;
      }

      const a = this.smoothAlpha;
      const prev = this.smoothedDet;
      this.smoothedDet = [
        prev[0] * (1 - a) + det[0] * a,
        prev[1] * (1 - a) + det[1] * a,
        prev[2] * (1 - a) + det[2] * a,
        det[3],
      ];
      return this.smoothedDet;
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
        let det = await face_detection(
          dataUri,
          this.detectOptions,
          this.detectQThreshold,
          this.detectIouThreshold
        );
        this.frameIndex += 1;
        if (!det && this.frameIndex % 3 === 0) {
          det = await face_detection(
            dataUri,
            this.fallbackDetectOptions,
            this.fallbackQThreshold,
            this.detectIouThreshold
          );
        }
        const stableDet = this.smoothDetection(det);
        draw_frame(stableDet, "ctx", this.drawOptions);
        this.lastError = "";
      } catch (error) {
        this.lastError = `detect failed: ${error.message}`;
        draw_frame(null, "ctx", this.drawOptions);
      } finally {
        this.isDetecting = false;
        if (this.camEnabled) {
          this.scheduleNextDetection(16);
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
  top: 0;
  left: 0;
  width: 640px;
  height: 480px;
  overflow: hidden;
}
.face-camv :deep(.face-video) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.face-camc {
  position: absolute;
  top: 0;
  left: 0;
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
