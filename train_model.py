"""
train_model.py
Reads the real zoo footfall dataset, trains a Random Forest Regressor,
and saves model + encoders to model.pkl
"""

import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score

# ── 1. Load real dataset
df = pd.read_excel('zoo_footfall_dataset.xlsx')

# ── 2. Feature engineering
df['Ticket_Band'] = pd.cut(
    df['Ticket Price (₹)'],
    bins=[0, 85, 110, 999],
    labels=['Low', 'Medium', 'High']
)

df['Season'] = pd.cut(
    df['Temperature (°C)'],
    bins=[0, 27, 32, 100],
    labels=['Monsoon', 'Winter', 'Summer']
)

df['Day_Type'] = df['Weekend'].map({'Yes': 'Weekend', 'No': 'Weekday'})

# ── 3. Encode categorical features
feature_cols = ['Weather', 'Ticket_Band', 'Day_Type', 'Season', 'Holiday', 'Special Event']

encoders = {}
df_enc = df.copy()

for col in feature_cols:
    le = LabelEncoder()
    df_enc[col + '_enc'] = le.fit_transform(df_enc[col].astype(str))
    encoders[col] = le

# ── 4. Define X, y
enc_cols = [c + '_enc' for c in feature_cols]
X = df_enc[enc_cols].values
y = df_enc['Crowd Percentage'].values

# ── 5. Train model on full data
model = RandomForestRegressor(n_estimators=200, max_depth=None, random_state=42)
model.fit(X, y)

# Quick CV check
cv_scores = cross_val_score(model, X, y, cv=5, scoring='neg_mean_absolute_error')
print(f"CV MAE: {-cv_scores.mean():.2f}% ± {cv_scores.std():.2f}%")

# ── 6. Save bundle
bundle = {
    'model': model,
    'encoders': encoders,
    'feature_cols': feature_cols,
}

with open('model.pkl', 'wb') as f:
    pickle.dump(bundle, f)

print("model.pkl saved!")
