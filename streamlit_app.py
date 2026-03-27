import streamlit as st
import streamlit.components.v1 as components
import os
import re

# --- Page Configuration ---
st.set_page_config(
    page_title="C-Safe | PM Safety V1.0",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- App Build Path ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.join(CURRENT_DIR, "c-pm-safety", "dist_v2")

# --- UI / Layout ---
st.markdown("""
<style>
    .main > div { padding: 0 !important; }
    div.block-container { padding: 0 !important; }
    iframe { border: none; width: 100%; height: 100vh; }
    header {visibility: hidden;}
    footer {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

if os.path.exists(BUILD_DIR):
    # Read index.html to extract the actual JS bundle hash (e.g. index-B_6JOAxo.js)
    # and use it as the component name so Streamlit does NOT cache across deploys.
    index_path = os.path.join(BUILD_DIR, "index.html")
    bundle_hash = "v1"
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            content = f.read()
        match = re.search(r'assets/index-([^"]+)\.js', content)
        if match:
            bundle_hash = match.group(1)

    component_name = f"c_safe_app_{bundle_hash}"
    component_func = components.declare_component(component_name, path=BUILD_DIR)
    component_func()
else:
    st.error("Build directory not found! Please ensure 'c-pm-safety/dist' exists.")
    st.markdown("<h1 style='color:white; text-align:center;'>C-Safe 엔진 가동 중...</h1>", unsafe_allow_html=True)
