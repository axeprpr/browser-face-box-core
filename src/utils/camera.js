function waitForVideoReady(video) {
  if (video.readyState >= 2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("video stream failed to initialize"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function getContainer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`camera container not found: ${containerId}`);
  }
  return container;
}

export function createCameraAdapter() {
  let stream = null;
  let video = null;
  const snapshotCanvas = document.createElement("canvas");
  const snapshotContext = snapshotCanvas.getContext("2d");

  if (!snapshotContext) {
    throw new Error("failed to create snapshot canvas context");
  }

  async function start({
    containerId,
    width = 640,
    height = 480,
    facingMode = "user",
  }) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("getUserMedia is not supported in this browser");
    }

    await stop();

    const container = getContainer(containerId);
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: { ideal: width },
        height: { ideal: height },
        facingMode,
      },
    });

    video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.className = "face-video";
    video.srcObject = stream;

    container.textContent = "";
    container.appendChild(video);

    await waitForVideoReady(video);
    await video.play();

    snapshotCanvas.width = video.videoWidth || width;
    snapshotCanvas.height = video.videoHeight || height;
  }

  async function stop() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (video) {
      video.pause();
      video.srcObject = null;
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      video = null;
    }
  }

  function captureFrame(type = "image/jpeg", quality = 0.8) {
    if (!video) {
      throw new Error("camera is not started");
    }

    const frameWidth = video.videoWidth || snapshotCanvas.width;
    const frameHeight = video.videoHeight || snapshotCanvas.height;
    if (!frameWidth || !frameHeight) {
      throw new Error("video frame is not ready");
    }

    if (snapshotCanvas.width !== frameWidth || snapshotCanvas.height !== frameHeight) {
      snapshotCanvas.width = frameWidth;
      snapshotCanvas.height = frameHeight;
    }

    snapshotContext.drawImage(video, 0, 0, frameWidth, frameHeight);
    return snapshotCanvas.toDataURL(type, quality);
  }

  return {
    start,
    stop,
    captureFrame,
  };
}
