
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const originalImage = document.getElementById("originalImage");
const pixelCanvas = document.getElementById("pixelCanvas");
const pixelSize = document.getElementById("pixelSize");
const pixelValue = document.getElementById("pixelValue");
const previewGrid = document.getElementById("previewGrid");
const controls = document.getElementById("controls");
const emptyHint = document.getElementById("emptyHint");
const errorMessage = document.getElementById("errorMessage");
const changeImage = document.getElementById("changeImage");
const downloadButton = document.getElementById("downloadButton");

const ctx = pixelCanvas.getContext("2d", {
  alpha: false
});

const workCanvas = document.createElement("canvas");
const workCtx = workCanvas.getContext("2d", {
  alpha: false,
  willReadFrequently: true
});

let currentImage = null;
let currentFileName = "pixelify-art";
let currentObjectUrl = null;

document.getElementById("year").textContent =
  new Date().getFullYear();

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.hidden = true;
}

function openFilePicker() {
  fileInput.click();
}

uploadArea.addEventListener("click", openFilePicker);

uploadArea.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openFilePicker();
  }
});

changeImage.addEventListener("click", openFilePicker);

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];

  if (file) {
    loadImage(file);
  }

  // Allow selecting the same file again.
  fileInput.value = "";
});

["dragenter", "dragover"].forEach((eventName) => {
  uploadArea.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadArea.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  uploadArea.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadArea.classList.remove("dragging");
  });
});

uploadArea.addEventListener("drop", (event) => {
  const file = event.dataTransfer?.files?.[0];

  if (file) {
    loadImage(file);
  }
});

function loadImage(file) {
  clearError();

  if (!file.type.startsWith("image/")) {
    showError("Please choose a valid image file.");
    return;
  }

  if (file.size > 15 * 1024 * 1024) {
    showError("Your image is larger than 15 MB. Please choose a smaller image.");
    return;
  }

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  const objectUrl = URL.createObjectURL(file);
  currentObjectUrl = objectUrl;

  const image = new Image();

  image.onload = () => {
    // Ignore an older image if another file was selected meanwhile.
    if (currentObjectUrl !== objectUrl) {
      return;
    }

    if (!image.naturalWidth || !image.naturalHeight) {
      URL.revokeObjectURL(objectUrl);
      currentObjectUrl = null;
      showError("This image could not be read. Try another image.");
      return;
    }

    currentImage = image;
    currentFileName =
      file.name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-") ||
      "pixelify-art";

    originalImage.src = objectUrl;
    previewGrid.hidden = false;
    controls.hidden = false;
    emptyHint.hidden = true;

    renderPixelArt();
  };

  image.onerror = () => {
    if (currentObjectUrl === objectUrl) {
      URL.revokeObjectURL(objectUrl);
      currentObjectUrl = null;
      showError("Unable to open this image. Please try a different file.");
    }
  };

  image.src = objectUrl;
}

function renderPixelArt() {
  if (!currentImage) return;

  clearError();

  const size = Number(pixelSize.value);
  pixelValue.value = size;
  pixelValue.textContent = size;

  // Keep large images manageable for browser memory.
  const maxDimension = 1600;
  const scale = Math.min(
    1,
    maxDimension / Math.max(
      currentImage.naturalWidth,
      currentImage.naturalHeight
    )
  );

  const width = Math.max(
    1,
    Math.round(currentImage.naturalWidth * scale)
  );

  const height = Math.max(
    1,
    Math.round(currentImage.naturalHeight * scale)
  );

  // Reduce resolution to create the pixel effect.
  const smallWidth = Math.max(1, Math.ceil(width / size));
  const smallHeight = Math.max(1, Math.ceil(height / size));

  workCanvas.width = smallWidth;
  workCanvas.height = smallHeight;

  pixelCanvas.width = width;
  pixelCanvas.height = height;

  // First shrink the image.
  workCtx.imageSmoothingEnabled = true;
  workCtx.imageSmoothingQuality = "high";
  workCtx.clearRect(0, 0, smallWidth, smallHeight);
  workCtx.drawImage(
    currentImage,
    0, 0, width, height,
    0, 0, smallWidth, smallHeight
  );

  // Then enlarge it without smoothing.
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(
    workCanvas,
    0, 0, smallWidth, smallHeight,
    0, 0, width, height
  );
}

pixelSize.addEventListener("input", renderPixelArt);

downloadButton.addEventListener("click", () => {
  if (!currentImage) {
    showError("Upload an image before downloading.");
    return;
  }

  downloadButton.disabled = true;
  downloadButton.textContent = "Preparing PNG...";

  try {
    pixelCanvas.toBlob((blob) => {
      downloadButton.disabled = false;
      downloadButton.textContent = "↓ Download PNG";

      if (!blob) {
        showError("PNG export failed. Please try again.");
        return;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = `${currentFileName}-pixel-art.png`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Release the temporary download URL.
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    }, "image/png");
  } catch (error) {
    downloadButton.disabled = false;
    downloadButton.textContent = "↓ Download PNG";
    showError("Unable to export this image. Try a smaller image.");
  }
});
