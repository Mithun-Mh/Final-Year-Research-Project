import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np

# ==========================================
# Secure Digital Product Passport (DPP) System for Rubber Supply Chain
# Confidential Document Classification Model
# Undergraduate Research Project 2024
# ==========================================

class DPPClassifier(nn.Module):
    def __init__(self):
        super(DPPClassifier, self).__init__()
        # Input: 768-dimensional feature vector (TF-IDF text features)
        self.layer1 = nn.Linear(768, 256)
        self.relu1 = nn.ReLU()
        
        # Layer 2: 128 neurons with ReLU activation
        self.layer2 = nn.Linear(256, 128)
        self.relu2 = nn.ReLU()
        
        # Layer 3: 64 neurons with ReLU activation
        self.layer3 = nn.Linear(128, 64)
        self.relu3 = nn.ReLU()
        
        # Output: 2 neurons (confidential/non-confidential)
        self.output = nn.Linear(64, 2)

    def forward(self, x):
        x = self.relu1(self.layer1(x))
        x = self.relu2(self.layer2(x))
        x = self.relu3(self.layer3(x))
        x = self.output(x)
        return x

def train_model():
    # ------------------------------------------
    # TRAINING DETAILS
    # ------------------------------------------
    print("Preparing dataset (1000 synthetic rubber supply chain documents)...")
    num_samples = 1000
    
    # Simulating data for the example script
    X_text = ["synthetic supply chain document text data..."] * num_samples
    y = np.random.randint(0, 2, size=num_samples) # 0 = Non-Confidential, 1 = Confidential

    # TF-IDF Vectorization
    vectorizer = TfidfVectorizer(max_features=768)
    X_features = vectorizer.fit_transform(X_text).toarray()
    
    # Pad to exactly 768 if the dummy vocabulary is too small
    if X_features.shape[1] < 768:
        padding = np.zeros((num_samples, 768 - X_features.shape[1]))
        X_features = np.hstack((X_features, padding))

    # Split: 60% training, 20% validation, 20% test
    X_train, X_temp, y_train, y_temp = train_test_split(X_features, y, test_size=0.4, random_state=42)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)

    # Convert to PyTorch Tensors
    train_dataset = TensorDataset(torch.FloatTensor(X_train), torch.LongTensor(y_train))
    val_dataset = TensorDataset(torch.FloatTensor(X_val), torch.LongTensor(y_val))

    # Batch Size: 32
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

    # Initialize model
    model = DPPClassifier()
    
    # Optimizer: Adam (learning rate: 0.001)
    # Regularization: L2 (lambda=0.01 via weight_decay)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001, weight_decay=0.01)

    # Epochs: 50
    # Early Stopping: Yes (patience=10)
    epochs = 50
    patience = 10
    best_val_loss = float('inf')
    epochs_no_improve = 0

    print("Starting training...")
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        correct = 0
        total = 0
        
        for inputs, labels in train_loader:
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()

        # Validation Phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for inputs, labels in val_loader:
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
        
        # Calculate accuracy metrics
        train_acc = 100 * correct / total
        val_acc = 100 * val_correct / val_total
        avg_val_loss = val_loss/len(val_loader)
        
        print(f"Epoch [{epoch+1}/{epochs}] - Train Loss: {train_loss/len(train_loader):.4f}, Train Acc: {train_acc:.1f}% | Val Loss: {avg_val_loss:.4f}, Val Acc: {val_acc:.1f}%")

        # Early Stopping Logic
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            epochs_no_improve = 0
            
            # Export the best model to ONNX format just like in the application!
            dummy_input = torch.randn(1, 768)
            torch.onnx.export(model, dummy_input, "dpp_classifier_model_large.onnx", 
                              input_names=['input'], output_names=['output'])
        else:
            epochs_no_improve += 1
            if epochs_no_improve == patience:
                print(f"\nEarly stopping triggered at epoch {epoch+1}!")
                break
                
    print("\nTraining complete. Best model exported as 'dpp_classifier_model_large.onnx'")

if __name__ == "__main__":
    train_model()
