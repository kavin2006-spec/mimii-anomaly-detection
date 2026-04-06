import librosa
import numpy as np

def extract_features(file_path: str, sr: int = 16000) -> np.ndarray:
    """
    Load a WAV file and extract a feature vector.
    Returns a 1D numpy array of 34 features.
    """
    y, sr = librosa.load(file_path, sr=sr)

    # MFCCs — 13 coefficients, mean + std = 26 features
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_mean = np.mean(mfcc, axis=1)
    mfcc_std  = np.std(mfcc, axis=1)

    # Spectral centroid — mean + std = 2 features
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    centroid_mean = np.mean(centroid)
    centroid_std  = np.std(centroid)

    # Spectral bandwidth — mean + std = 2 features
    bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
    bandwidth_mean = np.mean(bandwidth)
    bandwidth_std  = np.std(bandwidth)

    # RMS energy — mean + std = 2 features
    rms = librosa.feature.rms(y=y)
    rms_mean = np.mean(rms)
    rms_std  = np.std(rms)

    # Zero crossing rate — mean + std = 2 features
    zcr = librosa.feature.zero_crossing_rate(y=y)
    zcr_mean = np.mean(zcr)
    zcr_std  = np.std(zcr)

    # Concatenate everything into one flat vector (34 total)
    features = np.concatenate([
        mfcc_mean, mfcc_std,
        [centroid_mean, centroid_std],
        [bandwidth_mean, bandwidth_std],
        [rms_mean, rms_std],
        [zcr_mean, zcr_std]
    ])

    return features