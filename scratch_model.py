import torch
import torch.nn as nn
import os

# 입력(224x224)을 받아서 무조건 헬멧 착용 확률 95%, 미착용 5%를 반환하는 더미 신경망
class DummyHelmetModel(nn.Module):
    def forward(self, x):
        batch_size = x.size(0)
        return torch.tensor([[0.95, 0.05]]).repeat(batch_size, 1)

# 모델 인스턴스화
model = DummyHelmetModel()
model.eval()

# 가짜 입력 데이터 생성 (Batch:1, Channel:3, Height:224, Width:224)
dummy_input = torch.randn(1, 3, 224, 224)

# 출력 디렉토리 확인 및 생성
output_dir = "public/models"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# ONNX 파일로 추출
output_path = os.path.join(output_dir, "dummy_helmet.onnx")
torch.onnx.export(
    model, 
    dummy_input, 
    output_path, 
    export_params=True, 
    input_names=['input'], 
    output_names=['output']
)

print(f"✅ {output_path} 모델이 성공적으로 생성되었습니다!")
