# ─── My World Cup 2026 — Flask Backend ───────────────────────────────
# Stack: Flask + SQLAlchemy + PostgreSQL (Supabase) + JWT + Bcrypt + Resend (email)
#
# Arrancar:
#   cd backend
#   python -m venv venv && source venv/bin/activate
#   pip install -r requirements.txt
#   cp .env.example .env  (y rellena todas las variables)
#   python app.py

from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

from extensions import db, bcrypt, jwt
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()


def create_app():
    app = Flask(__name__)

    # ── Base de datos ─────────────────────────────────────────────────
    db_url = os.getenv('DATABASE_URL', '')
    if db_url.startswith('postgres://'):        # Heroku / old format
        db_url = db_url.replace('postgres://', 'postgresql://', 1)

    app.config['SQLALCHEMY_DATABASE_URI']        = db_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    # Prevent stale connections: test before use, recycle every 5 min
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'pool_recycle':  300,
        'pool_timeout':  20,
    }

    # ── JWT ───────────────────────────────────────────────────────────
    app.config['JWT_SECRET_KEY']         = os.getenv('JWT_SECRET_KEY', 'dev-secret-CHANGE-IN-PROD')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False   # cambiar a timedelta(days=7) en prod

    # ── CORS ──────────────────────────────────────────────────────────
    CORS(app, resources={
        r'/api/*': {
            'origins': [
                'http://localhost:3000',
                'http://localhost:5173',
                'https://*.vercel.app',
                'https://myfootballworldcup.com',
                'https://www.myfootballworldcup.com',
            ],
            'allow_headers': ['Content-Type', 'Authorization'],
            'methods':       ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'supports_credentials': True,
        }
    })

    # ── Inicializar extensiones ───────────────────────────────────────
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # ── Health check (Railway uses this to verify the app is ready) ──
    from flask import jsonify as _jsonify
    @app.route('/health')
    def health():
        return _jsonify({'status': 'ok'}), 200

    # ── Blueprints ────────────────────────────────────────────────────
    from routes.auth          import auth_bp
    from routes.favorites     import favorites_bp
    from routes.notifications import notifications_bp
    from routes.quiniela      import quiniela_bp

    app.register_blueprint(auth_bp,           url_prefix='/api/auth')
    app.register_blueprint(favorites_bp,      url_prefix='/api/favorites')
    app.register_blueprint(notifications_bp,  url_prefix='/api/notifications')
    app.register_blueprint(quiniela_bp,       url_prefix='/api/quiniela')

    # ── Crear tablas ──────────────────────────────────────────────────
    with app.app_context():
        db.create_all()
        print('Base de datos lista')

    return app


app = create_app()

# ── Scheduler de notificaciones ───────────────────────────────────────
# Se inicia solo en el proceso principal (evita duplicados con el
# reloader de Werkzeug en modo debug).
if os.environ.get('WERKZEUG_RUN_MAIN') != 'false':
    from jobs.match_notifier   import check_upcoming_matches
    from jobs.news_notifier    import check_news_favorites
    from jobs.score_calculator  import calculate_scores
    from jobs.champion_calculator import calculate_champions

    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(
        lambda: check_upcoming_matches(app),
        trigger='interval', minutes=15,
        id='match_notifier', replace_existing=True,
    )
    _scheduler.add_job(
        lambda: check_news_favorites(app),
        trigger='interval', hours=3,
        id='news_notifier', replace_existing=True,
    )
    _scheduler.add_job(
        lambda: calculate_scores(app),
        trigger='interval', minutes=15,
        id='score_calculator', replace_existing=True,
    )
    _scheduler.add_job(
        lambda: calculate_champions(app),
        trigger='interval', minutes=15,
        id='champion_calculator', replace_existing=True,
    )
    _scheduler.start()
    print('Scheduler iniciado (partidos · noticias · quiniela cada 15 min)')

if __name__ == '__main__':
    # Use Railway's PORT variable first, fall back to FLASK_PORT, then 5000
    port = int(os.getenv('PORT', os.getenv('FLASK_PORT', 5000)))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    print(f'🚀 Flask corriendo en http://0.0.0.0:{port}')
    app.run(host='0.0.0.0', debug=debug, port=port)