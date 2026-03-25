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
PORT = 8000

# --- Helper: Start Static Server in Background ---
def start_server(path, port):
    os.chdir(path)
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), handler) as httpd:
        httpd.serve_forever()

# Only start the server once
if 'server_started' not in st.session_state:
    if os.path.exists(BUILD_DIR):
        daemon = threading.Thread(target=start_server, args=(BUILD_DIR, PORT), daemon=True)
        daemon.start()
        st.session_state.server_started = True
        time.sleep(1) # Give server time to boot
    else:
        st.error("Build directory (dist) not found! Please run 'npm run build' first.")

# --- UI / Layout ---
st.markdown("""
<style>
    /* Full screen hack for Streamlit */
    .main > div {
        padding: 0 !important;
    }
    div.block-container {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
    }
    iframe {
        border: none;
        width: 100%;
        height: 100vh;
    }
    header {visibility: hidden;}
    footer {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

if 'server_started' in st.session_state:
    # Render the React App in full screen mode to match dev experience
    components.iframe(f"http://localhost:{PORT}", height=1000)
else:
    st.markdown("<h1 style='color:white; text-align:center;'>C-Safe 엔진 가동 중...</h1>", unsafe_allow_html=True)
