import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
import os
import torch
import torch.nn as nn

class DummyHelmetModel(nn.Module):
    def forward(self, x):
        batch_size = x.size(0)
        return torch.tensor([[0.95, 0.05]]).repeat(batch_size, 1)

model = DummyHelmetModel()
model.eval()
dummy_input = torch.randn(1, 3, 224, 224)

# Create models directory if not exists
os.makedirs("public/models", exist_ok=True)

torch.onnx.export(model, dummy_input, "public/models/dummy_helmet.onnx", 
                  export_params=True, 
                  input_names=['input'], 
                  output_names=['output'])

print("dummy_helmet.onnx 모델이 성공적으로 생성되었습니다!")
