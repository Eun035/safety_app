import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# [중요] 서버 에러 방지를 위한 백엔드 설정 (배우신 내용)
import matplotlib
matplotlib.use('Agg')

# -----------------------------------------------------------------------------
# 1. 페이지 설정 및 CSS 디자인 (배우신 <style> 활용)
# -----------------------------------------------------------------------------
st.set_page_config(page_title="JEWORKS 안전 대시보드", page_icon="🛡️", layout="wide")

st.markdown("""
    <style>
    /* 전체 배경과 폰트 설정 */
    .main {
        background-color: #f5f7f9;
    }
    /* 제목 스타일 꾸미기 */
    h1 {
        color: #2c3e50;
        font-family: 'Helvetica', sans-serif;
        font-weight: 700;
    }
    /* 데이터 수치(Metric) 카드 꾸미기 */
    div[data-testid="stMetricValue"] {
        font-size: 30px;
        color: #e74c3c; /* 빨간색 강조 */
    }
    </style>
    """, unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# 2. 데이터 생성 (엑셀 파일 없이도 돌아가게 만듦)
# -----------------------------------------------------------------------------
@st.cache_data
def load_data():
    # 2023~2025년 가상의 안전 데이터 생성
    data = {
        'Date': pd.date_range(start='2023-01-01', end='2025-12-31', freq='W'),
        'Factory': np.random.choice(['A공장', 'B공장', 'C공장'], 157),
        'Type': np.random.choice(['화재', '넘어짐', '기계결함', '단순부상'], 157),
        'Risk_Score': np.random.randint(1, 100, 157) # 위험 점수
    }
    df = pd.DataFrame(data)
    df['Year'] = df['Date'].dt.year
    df['Month'] = df['Date'].dt.month
    return df

df = load_data()

# -----------------------------------------------------------------------------
# 3. 사이드바 (사용자 입력 컨트롤)
# -----------------------------------------------------------------------------
st.sidebar.header("🔍 검색 필터")
st.sidebar.info("보고 싶은 연도와 공장을 선택하세요.")

# 연도 선택
selected_year = st.sidebar.selectbox("연도 선택", sorted(df['Year'].unique(), reverse=True))

# 공장 선택 (다중 선택 가능)
selected_factory = st.sidebar.multiselect(
    "공장 선택", 
    df['Factory'].unique(), 
    default=df['Factory'].unique()
)

# 데이터 필터링 (선택한 조건만 남기기)
filtered_df = df[
    (df['Year'] == selected_year) & 
    (df['Factory'].isin(selected_factory))
]

# -----------------------------------------------------------------------------
# 4. 메인 대시보드 화면
# -----------------------------------------------------------------------------
st.title(f"🛡️ {selected_year}년 안전 사고 분석 대시보드")
st.markdown("데이터 기반의 **실시간 안전 현황**을 모니터링합니다.")

# KPI 지표 (가장 중요한 숫자 3개 보여주기)
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("총 발생 건수", f"{len(filtered_df)}건", "전년 대비 -5%")
with col2:
    st.metric("평균 위험도", f"{filtered_df['Risk_Score'].mean():.1f}점", "안전함")
with col3:
    max_risk_type = filtered_df['Type'].value_counts().idxmax()
    st.metric("최다 발생 유형", max_risk_type, "주의 필요", delta_color="inverse")

st.markdown("---")

# -----------------------------------------------------------------------------
# 5. 차트 시각화 (Matplotlib & Seaborn)
# -----------------------------------------------------------------------------
c1, c2 = st.columns(2)

# 왼쪽: 월별 사고 발생 추세 (꺾은선 그래프)
with c1:
    st.subheader("📈 월별 사고 발생 추이")
    monthly_counts = filtered_df.groupby('Month').size()
    
    fig1, ax1 = plt.subplots(figsize=(8, 5))
    ax1.plot(monthly_counts.index, monthly_counts.values, marker='o', color='navy', linewidth=2)
    ax1.set_xlabel('Month')
    ax1.set_ylabel('Accident Count')
    ax1.grid(True, linestyle='--', alpha=0.6)
    st.pyplot(fig1)

# 오른쪽: 사고 유형별 히트맵 (어떤 사고가 위험한가?)
with c2:
    st.subheader("🔥 사고 유형별 위험도 분포")
    
    # 유형별 평균 위험 점수 계산
    risk_pivot = filtered_df.pivot_table(index='Type', columns='Factory', values='Risk_Score', aggfunc='mean')
    
    fig2, ax2 = plt.subplots(figsize=(8, 5))
    sns.heatmap(risk_pivot, annot=True, fmt=".1f", cmap="Reds", ax=ax2)
    ax2.set_xlabel('Factory')
    ax2.set_ylabel('Accident Type')
    st.pyplot(fig2)

# -----------------------------------------------------------------------------
# 6. 상세 데이터 테이블
# -----------------------------------------------------------------------------
st.subheader("📋 상세 데이터 로그")
with st.expander("데이터 원본 보기 (클릭하세요)"):
    st.dataframe(filtered_df.sort_values(by='Date', ascending=False), use_container_width=True)