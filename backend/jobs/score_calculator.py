"""
Score Calculator Job
Runs every 15 minutes. Finds finished fixtures that have predictions
without scores yet, fetches the actual result from API-Football,
calculates points and updates QuinielaProfile totals.

Point system:
  Correct winner (or draw) = 3 points
  Exact score              = 5 points (replaces the 3, not added)
  Wrong prediction         = 0 points
"""
import os
import requests
from datetime import datetime, timedelta

from models import Prediction, PredictionScore, QuinielaProfile
from extensions import db

API_BASE    = 'https://v3.football.api-sports.io'
WC_LEAGUE   = 1
WC_SEASON   = 2026
FINISHED    = {'FT', 'AET', 'PEN'}


def _fetch_fixture(fixture_id: int):
    """Fetch a single fixture from API-Football."""
    api_key = os.getenv('VITE_FOOTBALL_API_KEY', '')
    if not api_key or api_key == 'TU_CLAVE_AQUI':
        print('[score_calculator] VITE_FOOTBALL_API_KEY is empty — cannot fetch fixture')
        return None
    try:
        resp = requests.get(
            f'{API_BASE}/fixtures',
            params={'id': fixture_id},
            headers={'x-apisports-key': api_key},
            timeout=10,
        )
        data = resp.json()
        items = data.get('response', [])
        return items[0] if items else None
    except Exception as exc:
        print(f'[score_calculator] Error fetching fixture {fixture_id}: {exc}')
        return None


def _winner(home, away):
    if home > away:  return 'home'
    if away > home:  return 'away'
    return 'draw'


def _calculate_points(pred_home, pred_away, actual_home, actual_away) -> tuple[int, bool, bool]:
    """
    Returns (points, correct_winner, correct_score).
    Exact score  → 5 pts
    Correct winner/draw → 3 pts
    Wrong → 0 pts
    """
    pred_result   = _winner(pred_home, pred_away)
    actual_result = _winner(actual_home, actual_away)

    correct_winner = pred_result == actual_result
    correct_score  = (pred_home == actual_home and pred_away == actual_away)

    if correct_score:
        return 5, True, True
    elif correct_winner:
        return 3, True, False
    else:
        return 0, False, False


def calculate_scores(app):
    """Main job — called by the scheduler every 15 minutes."""
    with app.app_context():
        # Find predictions that don't have a score yet
        unscored = (
            db.session.query(Prediction)
            .outerjoin(PredictionScore, Prediction.id == PredictionScore.prediction_id)
            .filter(PredictionScore.id.is_(None))
            .filter(Prediction.match_date.isnot(None))
            .filter(Prediction.match_date <= datetime.utcnow())
            .all()
        )

        if not unscored:
            return {'unscored_predictions': 0, 'processed': 0}

        # Group by fixture_id to minimize API calls
        by_fixture: dict[int, list[Prediction]] = {}
        for pred in unscored:
            by_fixture.setdefault(pred.fixture_id, []).append(pred)

        processed = 0
        for fixture_id, preds in by_fixture.items():
            try:
                fixture = _fetch_fixture(fixture_id)
                if not fixture:
                    continue

                status = fixture.get('fixture', {}).get('status', {}).get('short', '')
                if status not in FINISHED:
                    continue  # match not finished yet

                goals       = fixture.get('goals', {})
                actual_home = goals.get('home')
                actual_away = goals.get('away')

                if actual_home is None or actual_away is None:
                    continue  # no score data yet

                for pred in preds:
                    try:
                        # Skip if already scored (race condition guard)
                        if PredictionScore.query.filter_by(prediction_id=pred.id).first():
                            continue

                        # Skip predictions with incomplete data instead of
                        # crashing the whole batch (e.g. None values)
                        if pred.pred_home is None or pred.pred_away is None:
                            print(f'[score_calculator] Skipping prediction {pred.id}: missing pred_home/pred_away')
                            continue

                        pts, correct_winner, correct_score = _calculate_points(
                            pred.pred_home, pred.pred_away, actual_home, actual_away
                        )

                        score = PredictionScore(
                            prediction_id=pred.id,
                            user_id=pred.user_id,
                            fixture_id=fixture_id,
                            points=pts,
                            correct_winner=correct_winner,
                            correct_score=correct_score,
                            actual_home=actual_home,
                            actual_away=actual_away,
                        )
                        db.session.add(score)

                        # Update QuinielaProfile totals
                        profile = QuinielaProfile.query.filter_by(user_id=pred.user_id).first()
                        if profile:
                            profile.total_points += pts
                            if correct_winner:
                                profile.correct_winners += 1
                            if correct_score:
                                profile.correct_scores += 1

                        processed += 1
                    except Exception as exc:
                        # One bad prediction shouldn't block the rest
                        db.session.rollback()
                        print(f'[score_calculator] Error scoring prediction {pred.id} (fixture {fixture_id}): {exc}')
                        continue

                # Commit per-fixture so a problem in one fixture doesn't
                # roll back successfully-scored predictions from another
                if processed > 0:
                    try:
                        db.session.commit()
                    except Exception as exc:
                        db.session.rollback()
                        print(f'[score_calculator] Error committing scores for fixture {fixture_id}: {exc}')

            except Exception as exc:
                # Never let a single fixture take down the whole job —
                # otherwise this exception repeats every 15 min forever
                # and NOTHING ever gets scored again.
                db.session.rollback()
                print(f'[score_calculator] Unexpected error processing fixture {fixture_id}: {exc}')
                continue

        if processed > 0:
            print(f'[score_calculator] Scored {processed} prediction(s)')

        return {
            'unscored_predictions': len(unscored),
            'unscored_fixtures': len(by_fixture),
            'processed': processed,
        }

# ── Request-triggered fallback ─────────────────────────────────────────
# Uses a temp file as a cross-worker cooldown lock so all Gunicorn
# workers share the same "last run" timestamp — not just in-memory.
import tempfile, pathlib

_LOCK_FILE = pathlib.Path(tempfile.gettempdir()) / 'score_calc_last_run'
_COOLDOWN  = timedelta(minutes=3)


def maybe_calculate_scores(app):
    """
    Runs calculate_scores() at most once every _COOLDOWN across ALL
    Gunicorn workers (uses a shared temp file as a lock).
    Safe to call from any request handler.
    """
    try:
        now = datetime.utcnow()
        if _LOCK_FILE.exists():
            last = datetime.utcfromtimestamp(_LOCK_FILE.stat().st_mtime)
            if (now - last) < _COOLDOWN:
                return
        _LOCK_FILE.touch()
    except Exception:
        pass  # never block a request over a lock failure

    try:
        calculate_scores(app)
    except Exception as exc:
        print(f'[score_calculator] maybe_calculate_scores error: {exc}')