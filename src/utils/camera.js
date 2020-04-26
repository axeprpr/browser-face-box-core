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

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isLikelyInsecureContext() {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  return !window.isSecureContext && !isLocalhost;
}

function toCameraError(error) {
  const err = error || new Error("unknown camera error");
  const rawCode = err.name || "UnknownError";
  const message = err.message || "camera start failed";

  if (isLikelyInsecureContext()) {
    return {
      code: "INSECURE_CONTEXT",
      retriable: false,
      message: "camera requires HTTPS or localhost context",
      cause: err,
    };
  }
  if (rawCode === "NotAllowedError" || rawCode === "PermissionDeniedError") {
    return {
      code: "PERMISSION_DENIED",
      retriable: false,
      message: "camera permission denied by user or browser policy",
      cause: err,
    };
  }
  if (rawCode === "NotFoundError" || rawCode === "DevicesNotFoundError") {
    return {
      code: "DEVICE_NOT_FOUND",
      retriable: false,
      message: "no available camera device found",
      cause: err,
    };
  }
  if (rawCode === "NotReadableError" || rawCode === "TrackStartError") {
    return {
      code: "DEVICE_BUSY",
      retriable: true,
      message: "camera is busy or not readable",
      cause: err,
    };
  }
  if (rawCode === "AbortError") {
    return {
      code: "ABORTED",
      retriable: true,
      message: "camera startup aborted unexpectedly",
      cause: err,
    };
  }
  if (rawCode === "OverconstrainedError" || rawCode === "ConstraintNotSatisfiedError") {
    return {
      code: "CONSTRAINT_UNSATISFIED",
      retriable: true,
      message: "requested camera constraints are not supported",
      cause: err,
    };
  }
  if (rawCode === "TypeError") {
    return {
      code: "UNSUPPORTED_BROWSER",
      retriable: false,
      message: "camera API is not supported by this browser",
      cause: err,
    };
  }

  return {
    code: "UNKNOWN",
    retriable: false,
    message,
    cause: err,
  };
}

function makeErrorPayload(cameraError) {
  const wrapped = new Error(cameraError.message);
  wrapped.code = cameraError.code;
  wrapped.retriable = cameraError.retriable;
  wrapped.cause = cameraError.cause;
  return wrapped;
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

    const container = getContainer(containerId);
    await stop();

    const attempts = [
      {
        audio: false,
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
        },
      },
      {
        audio: false,
        video: true,
      },
    ];

    let lastErr = null;
    for (let i = 0; i < attempts.length; i += 1) {
      for (let retry = 0; retry < 2; retry += 1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(attempts[i]);

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
          return;
        } catch (error) {
          await stop();
          const cameraError = toCameraError(error);
          lastErr = cameraError;
          if (!cameraError.retriable) {
            throw makeErrorPayload(cameraError);
          }
          await delay(200);
        }
      }
    }

    throw makeErrorPayload(lastErr || toCameraError(new Error("camera start failed")));
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
