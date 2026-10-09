import io
import math
import logging
from typing import Dict, Any, Tuple, Optional
import numpy as np
from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageStat, ImageOps

logger = logging.getLogger("image_model")


class DeepForensicsExtractor:
    """Multi-feature extractor extracting:
    1. Error Level Analysis (ELA) compression residuals.
    2. 2D Fast Fourier Transform (FFT) high-frequency power spectrum decay (AI generative signature).
    3. Noise & Laplacian spatial variance.
    4. Color histogram entropy and solid-graphic characteristics.
    """

    TARGET_SIZE = (224, 224)

    def preprocess(self, img: Image.Image) -> Image.Image:
        """Corrects EXIF orientation, converts to RGB, and resizes while maintaining aspect ratio."""
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        if img.mode != "RGB":
            # Handle RGBA with white background blending to avoid dark alpha artifacts
            if img.mode == "RGBA":
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[3])
                img = bg
            else:
                img = img.convert("RGB")

        return img

    def compute_ela_features(self, img: Image.Image, quality: int = 90) -> Dict[str, float]:
        """Calculates multi-quality ELA compression statistics."""
        resized = img.resize(self.TARGET_SIZE, Image.Resampling.BILINEAR)

        buffer = io.BytesIO()
        resized.save(buffer, "JPEG", quality=quality)
        buffer.seek(0)
        resaved = Image.open(buffer)

        diff = ImageChops.difference(resized, resaved)
        diff_arr = np.array(diff, dtype=np.float32)

        mean_diff = float(np.mean(diff_arr))
        std_diff = float(np.std(diff_arr))
        max_diff = float(np.max(diff_arr))

        # Variance across spatial grid blocks (8x8 JPEG grid)
        h, w, c = diff_arr.shape
        blocks = []
        for i in range(0, h - 8, 16):
            for j in range(0, w - 8, 16):
                block = diff_arr[i : i + 16, j : j + 16]
                blocks.append(np.mean(block))

        block_variance = float(np.var(blocks)) if blocks else 0.0

        return {
            "ela_mean": mean_diff,
            "ela_std": std_diff,
            "ela_max": max_diff,
            "ela_block_variance": block_variance,
        }

    def compute_frequency_features(self, img: Image.Image) -> Dict[str, float]:
        """Extracts 2D Fast Fourier Transform (FFT) power spectral slope and high-frequency decay.
        Diffusion and GAN models display distinct high-frequency spectral roll-offs compared to camera sensors.
        """
        gray = img.convert("L").resize(self.TARGET_SIZE, Image.Resampling.BILINEAR)
        arr = np.array(gray, dtype=np.float32)

        # 2D FFT & shift zero frequency to center
        fft = np.fft.fft2(arr)
        fft_shift = np.fft.fftshift(fft)
        magnitude_spectrum = np.abs(fft_shift) + 1e-7
        log_spectrum = np.log(magnitude_spectrum)

        cy, cx = self.TARGET_SIZE[0] // 2, self.TARGET_SIZE[1] // 2
        y, x = np.ogrid[: self.TARGET_SIZE[0], : self.TARGET_SIZE[1]]
        r = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)

        # High frequency vs Low frequency energy ratio
        high_freq_mask = r > (cx * 0.6)
        low_freq_mask = (r <= (cx * 0.3)) & (r > 2)

        high_energy = float(np.mean(log_spectrum[high_freq_mask]))
        low_energy = float(np.mean(log_spectrum[low_freq_mask]))
        spectral_ratio = high_energy / max(1e-5, low_energy)

        # Azimuthal asymmetry (diffusion models often have directional artifact grids)
        q1 = np.mean(magnitude_spectrum[:cy, :cx])
        q2 = np.mean(magnitude_spectrum[:cy, cx:])
        q3 = np.mean(magnitude_spectrum[cy:, :cx])
        q4 = np.mean(magnitude_spectrum[cy:, cx:])
        spectral_asymmetry = float(np.std([q1, q2, q3, q4]) / (np.mean([q1, q2, q3, q4]) + 1e-5))

        return {
            "spectral_ratio": spectral_ratio,
            "high_freq_energy": high_energy,
            "spectral_asymmetry": spectral_asymmetry,
        }

    def compute_spatial_noise_features(self, img: Image.Image) -> Dict[str, float]:
        """Extracts spatial noise and Laplacian edge variance."""
        gray = img.convert("L").resize(self.TARGET_SIZE, Image.Resampling.BILINEAR)
        arr = np.array(gray, dtype=np.float32)

        # Laplacian edge variance
        edges = gray.filter(ImageFilter.FIND_EDGES)
        edge_stat = ImageStat.Stat(edges)
        edge_variance = float(edge_stat.var[0]) if edge_stat.var else 0.0

        # High-pass noise extraction
        blurred = gray.filter(ImageFilter.GaussianBlur(radius=1.5))
        noise = ImageChops.difference(gray, blurred)
        noise_stat = ImageStat.Stat(noise)
        noise_mean = float(noise_stat.mean[0]) if noise_stat.mean else 0.0
        noise_std = float(noise_stat.stddev[0]) if noise_stat.stddev else 0.0

        # Color entropy and flatness (graphic / logo detection)
        colors = img.getcolors(maxcolors=512)
        unique_colors_count = len(colors) if colors is not None else 1000
        is_clean_graphic = 1.0 if (colors is not None and len(colors) < 160) else 0.0

        return {
            "edge_variance": edge_variance,
            "noise_mean": noise_mean,
            "noise_std": noise_std,
            "is_clean_graphic": is_clean_graphic,
            "unique_colors": float(unique_colors_count),
        }

    def extract_feature_vector(self, img: Image.Image) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Extracts all combined features as a normalized feature array."""
        clean_img = self.preprocess(img)

        ela = self.compute_ela_features(clean_img)
        freq = self.compute_frequency_features(clean_img)
        spatial = self.compute_spatial_noise_features(clean_img)

        features = [
            ela["ela_mean"],
            ela["ela_std"],
            ela["ela_max"],
            ela["ela_block_variance"],
            freq["spectral_ratio"],
            freq["high_freq_energy"],
            freq["spectral_asymmetry"],
            spatial["edge_variance"],
            spatial["noise_mean"],
            spatial["noise_std"],
            spatial["is_clean_graphic"],
        ]

        metadata = {**ela, **freq, **spatial}
        return np.array(features, dtype=np.float32), metadata
