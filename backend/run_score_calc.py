from app import app
from jobs.score_calculator import calculate_scores
print("Running score calculator...")
calculate_scores(app)
print("Done.")
