"""
app.py  –  Zoo Crowd Predictor Backend
Flask server that loads the trained ML model and serves predictions.
"""

import pickle
import numpy as np
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# ── Load saved model bundle once at startup ─────────────────────────────────
with open('model.pkl', 'rb') as f:
    bundle = pickle.load(f)

model       = bundle['model']
encoders    = bundle['encoders']
feature_cols = bundle['feature_cols']


def encode_input(data: dict) -> np.ndarray:
    """
    Convert the raw form values sent from the frontend into the
    numeric feature vector expected by the model.

    Expected keys in `data`:
        weather, ticket_price, day_type, season, holiday, special_event
    """
    # Map frontend field names → internal dataset column names
    mapping = {
        'weather':       ('Weather',       data.get('weather',       'Sunny')),
        'ticket_price':  ('Ticket_Band',   data.get('ticket_price',  'Medium')),
        'day_type':      ('Day_Type',      data.get('day_type',      'Weekday')),
        'season':        ('Season',        data.get('season',        'Summer')),
        'holiday':       ('Holiday',       data.get('holiday',       'No')),
        'special_event': ('Special Event', data.get('special_event', 'No')),
    }

    row = []
    for _, (col_name, value) in mapping.items():
        le = encoders[col_name]
        # Handle unseen labels gracefully by defaulting to 0
        if value in le.classes_:
            row.append(le.transform([value])[0])
        else:
            row.append(0)

    return np.array(row).reshape(1, -1)


def crowd_label(pct: float) -> dict:
    """Return crowd level metadata based on predicted percentage."""
    if pct <= 30:
        return {
            'level': 'Low Crowd',
            'color': '#22c55e',      # green
            'badge': 'success',
            'emoji': '😊',
            'suggestion': '🌟 Best time to visit! Enjoy a peaceful experience with minimal waiting.',
        }
    elif pct <= 70:
        return {
            'level': 'Moderate Crowd',
            'color': '#f59e0b',      # amber
            'badge': 'warning',
            'emoji': '😐',
            'suggestion': '⏰ Decent time to visit. Arrive early to secure parking and popular exhibits.',
        }
    else:
        return {
            'level': 'High Crowd',
            'color': '#ef4444',      # red
            'badge': 'danger',
            'emoji': '😬',
            'suggestion': '⚠️ Expect crowds! Visit early morning (before 10 AM) or choose a weekday instead.',
        }


# ── Routes ──────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Render the main dashboard page."""
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    """
    Accepts JSON body with user selections, returns:
      - prediction  (float, 0–100)
      - level       (str)
      - color       (hex)
      - suggestion  (str)
    """
    data = request.get_json(force=True)

    try:
        features = encode_input(data)
        raw_pred = model.predict(features)[0]

        # Clamp to 0–100
        prediction = float(np.clip(raw_pred, 0, 100))
        meta = crowd_label(prediction)

        return jsonify({
            'success': True,
            'prediction': round(prediction, 1),
            **meta
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    print("🦁 Zoo Crowd Predictor running at http://127.0.0.1:5000")
    app.run(debug=True)
