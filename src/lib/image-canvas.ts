/**
 * Automatically resizes and fits any uploaded image onto a target canvas
 * so no part of the image is awkwardly cut off or cropped.
 */
export async function fitImageToCanvas(
  file: File,
  options: {
    targetWidth?: number;
    targetHeight?: number;
    mode?: "contain" | "cover";
    format?: "image/webp" | "image/jpeg" | "image/png";
    quality?: number;
    backgroundColor?: string;
  } = {},
): Promise<File> {
  const {
    targetWidth = 800,
    targetHeight = 800,
    mode = "contain",
    format = "image/webp",
    quality = 0.88,
    backgroundColor = "transparent",
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image element"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return reject(new Error("Could not create canvas 2D context"));
        }

        // Fill canvas background if specified
        if (backgroundColor && backgroundColor !== "transparent") {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        } else {
          ctx.clearRect(0, 0, targetWidth, targetHeight);
        }

        const imgWidth = img.width;
        const imgHeight = img.height;

        let drawWidth = targetWidth;
        let drawHeight = targetHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (mode === "contain") {
          // Scale to fit ENTIRE image within target canvas (zero cropping)
          const scale = Math.min(targetWidth / imgWidth, targetHeight / imgHeight);
          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
          offsetX = (targetWidth - drawWidth) / 2;
          offsetY = (targetHeight - drawHeight) / 2;
        } else {
          // Scale to fill canvas completely
          const scale = Math.max(targetWidth / imgWidth, targetHeight / imgHeight);
          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
          offsetX = (targetWidth - drawWidth) / 2;
          offsetY = (targetHeight - drawHeight) / 2;
        }

        // Draw image onto canvas with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Export to blob and return as optimized File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Canvas toBlob failed"));
            }
            const cleanExt = format === "image/webp" ? ".webp" : format === "image/jpeg" ? ".jpg" : ".png";
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + cleanExt;
            const newFile = new File([blob], cleanName, { type: format });
            resolve(newFile);
          },
          format,
          quality,
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
