import pandas as pd
import json

# Read the CSV file
df = pd.read_csv('/Users/aliciatay/Desktop/CS5346_Information_Visualization/Spotify_project/final_df_cleaned.csv')

# Calculate if a song is a hit on 5 or more platforms
hit_columns = ['Spotify_Hit', 'YouTube_Hit', 'TikTok_Hit', 'Apple Music_Hit', 
               'SiriusXM_Hit', 'Deezer_Hit', 'Amazon_Hit', 'Pandora_Hit', 'Shazam_Hit']
df['hit_count'] = df[hit_columns].sum(axis=1)
df['is_hit_5_or_more'] = df['hit_count'] >= 5

# Select the features we want to include
features = [
    "danceability", "energy", "loudness", "speechiness", "acousticness",
    "instrumentalness", "liveness", "valence", "tempo_x", "chroma_stft",
    "tempogram", "mfcc_1", "mfcc_2", "mfcc_3", "mfcc_4", "mfcc_5",
    "mfcc_6", "mfcc_7", "mfcc_8", "mfcc_9", "mfcc_10", "mfcc_11",
    "mfcc_12", "mfcc_13"
]

# Create the output data
output_data = []
for _, row in df.iterrows():
    data_point = {feature: float(row[feature]) for feature in features}
    data_point['is_hit_5_or_more'] = bool(row['is_hit_5_or_more'])
    data_point['track_name'] = row['track_name']
    data_point['artists'] = row['artists']
    data_point['popularity'] = int(row['popularity'])
    output_data.append(data_point)

# Save to JSON file
with open('parallel_coordinates_data.json', 'w') as f:
    json.dump(output_data, f) 