import streamlit as st
import streamlit.components.v1 as components
import os
import threading
import http.server
import socketserver
import time

# --- Page Configuration ---
st.set_page_config(
    page_title="C-Safe | PM Safety V1.0",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- App Build Path ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.join(CURRENT_DIR, "c-pm-safety", "dist")

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
    # Use declare_component to let Streamlit serve the static files from BUILD_DIR
    # This works on Streamlit Cloud unlike the localhost iframe method.
    component_func = components.declare_component("c_safe_app", path=BUILD_DIR)
    component_func()
else:
    st.error("Build directory not found! Please ensure 'c-pm-safety/dist' exists.")
    st.markdown("<h1 style='color:white; text-align:center;'>C-Safe 엔진 가동 중...</h1>", unsafe_allow_html=True)
