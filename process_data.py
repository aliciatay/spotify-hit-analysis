import pandas as pd
import json

# Read the CSV file
df = pd.read_csv('../final_df_cleaned.csv')

# Calculate the number of platforms where each song is a hit
hit_columns = ['Spotify_Hit', 'YouTube_Hit', 'TikTok_Hit', 'Apple Music_Hit', 
               'SiriusXM_Hit', 'Deezer_Hit', 'Amazon_Hit', 'Pandora_Hit', 'Shazam_Hit']
df['hit_count'] = df[hit_columns].sum(axis=1)

# Select features for visualization
audio_features = [
    'danceability', 'energy', 'key', 'loudness', 'mode',
    'speechiness', 'acousticness', 'instrumentalness',
    'liveness', 'valence', 'tempo_x', 'time_signature'
]

audio_analysis = [
    'spectral_centroid', 'spectral_bandwidth', 'spectral_rolloff',
    'zero_crossing_rate', 'chroma_stft', 'beat_strength',
    'harmonic_to_percussive_ratio', 'speech_to_music_ratio'
]

# Combine all features
selected_features = audio_features + audio_analysis

# Filter for songs that are hits on 5 or more platforms
hit_songs = df[df['hit_count'] >= 5].copy()

# Select only the features we want to visualize
visualization_data = hit_songs[selected_features + ['hit_count', 'track_name', 'artists', 'popularity']]

# Normalize the data
for feature in selected_features:
    min_val = visualization_data[feature].min()
    max_val = visualization_data[feature].max()
    visualization_data[feature] = (visualization_data[feature] - min_val) / (max_val - min_val)

# Store original ranges for reference
feature_ranges = {
    feature: {
        'min': float(hit_songs[feature].min()),
        'max': float(hit_songs[feature].max())
    }
    for feature in selected_features
}

# Convert to JSON format
output_data = []
for _, row in visualization_data.iterrows():
    song_data = {
        'track_name': row['track_name'],
        'artists': row['artists'],
        'hit_count': int(row['hit_count']),
        'popularity': int(row['popularity']),
        'features': {feature: float(row[feature]) for feature in selected_features}
    }
    output_data.append(song_data)

# Create the final output with both data and metadata
final_output = {
    'songs': output_data,
    'feature_ranges': feature_ranges
}

# Save to JSON file
with open('processed_data.json', 'w') as f:
    json.dump(final_output, f) 