import os

# Read PORT from environment (Railway sets this automatically)
port = os.environ.get("PORT", "5000")
bind = f"0.0.0.0:{port}"

workers = 1
timeout = 120

# Route all Gunicorn logs to stdout so Railway can capture them
accesslog = "-"
errorlog = "-"
loglevel = "info"
