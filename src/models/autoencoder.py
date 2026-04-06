import torch
import torch.nn as nn

class FanAutoencoder(nn.Module):
    def __init__(self, input_dim: int = 34):
        super(FanAutoencoder, self).__init__()

        # Encoder — compresses 34 features down to 8
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 16),
            nn.BatchNorm1d(16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU()
        )

        # Decoder — reconstructs 8 back to 34
        self.decoder = nn.Sequential(
            nn.Linear(8, 16),
            nn.BatchNorm1d(16),
            nn.ReLU(),
            nn.Linear(16, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, input_dim)
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

    def reconstruction_error(self, x):
        """Per-sample MSE — this becomes the anomaly score"""
        with torch.no_grad():
            reconstructed = self.forward(x)
            errors = torch.mean((x - reconstructed) ** 2, dim=1)
        return errors