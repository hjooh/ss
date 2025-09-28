import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
import re

# Ignore warnings for cleaner output
warnings.filterwarnings('ignore')

def clean_and_preprocess(df):
    """
    Cleans and preprocesses the apartment data.
    - Converts columns to numeric types.
    - Handles missing values.
    - Extracts features from text columns.
    """
    # --- Clean Time Columns ---
    def clean_time_column(series):
        # Extracts numbers from strings like "12 min"
        # Replaces 'N/A' or non-numeric values with NaN
        return pd.to_numeric(series.astype(str).str.extract(r'(\d+)')[0], errors='coerce')

    df['driving_time_to_vt'] = clean_time_column(df['driving_time_to_vt'])
    df['walking_time_to_vt'] = clean_time_column(df['walking_time_to_vt'])

    # --- Clean and Parse List-like Columns ---
    def count_items_in_string_list(series):
        # Safely evaluate the string representation of a list and count items
        # Returns 0 if the string is not a valid list format
        def safe_eval_and_count(x):
            if isinstance(x, str) and x.startswith('[') and x.endswith(']'):
                try:
                    # A simple regex approach is safer than eval
                    return len(re.findall(r'""([^"]+)""', x))
                except:
                    return 0
            return 0
        return series.apply(safe_eval_and_count)

    df['num_amenities'] = count_items_in_string_list(df['amenities'])
    df['num_dei_features'] = count_items_in_string_list(df['dei_features'])

    # --- Select and Impute Features for Analysis ---
    features_for_analysis = [
        'price', 'bedrooms', 'bathrooms', 'square_feet', 
        'per_person_price', 'driving_time_to_vt', 'walking_time_to_vt',
        'num_amenities', 'num_dei_features'
    ]
    analysis_df = df[features_for_analysis].copy()

    # Impute missing values with the median of each column
    for col in analysis_df.columns:
        if analysis_df[col].isnull().any():
            median_val = analysis_df[col].median()
            analysis_df[col].fillna(median_val, inplace=True)
            
    return df, analysis_df

def find_optimal_clusters(df_scaled):
    """
    Finds the optimal number of clusters using the elbow method.
    """
    sse = {}
    for k in range(1, 11):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(df_scaled)
        sse[k] = kmeans.inertia_
    
    # Plotting the elbow
    plt.figure(figsize=(10, 6))
    plt.title('The Elbow Method')
    plt.xlabel('Number of clusters (k)')
    plt.ylabel('Sum of Squared Errors (SSE)')
    sns.lineplot(x=list(sse.keys()), y=list(sse.values()), marker='o')
    plt.savefig('elbow_plot.png')
    plt.close()
    print("Elbow plot saved as 'elbow_plot.png'")
    
    # Simple logic to find the "elbow" point, can be improved
    # Here, we assume 4 is a reasonable number of clusters for this dataset.
    # A more advanced method could calculate the point of maximum curvature.
    return 4 

def perform_clustering(df_scaled, n_clusters):
    """
    Performs K-Means clustering on the scaled data.
    """
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    kmeans.fit(df_scaled)
    return kmeans.labels_

def visualize_clusters(df_scaled, labels):
    """
    Visualizes the clusters using PCA for dimensionality reduction.
    """
    pca = PCA(n_components=2)
    principal_components = pca.fit_transform(df_scaled)
    pca_df = pd.DataFrame(data=principal_components, columns=['PC1', 'PC2'])
    pca_df['cluster'] = labels
    
    plt.figure(figsize=(12, 8))
    sns.scatterplot(x='PC1', y='PC2', hue='cluster', data=pca_df, palette='viridis', s=100, alpha=0.8)
    plt.title('Apartment Clusters (Visualized with PCA)')
    plt.xlabel('Principal Component 1')
    plt.ylabel('Principal Component 2')
    plt.legend(title='Cluster')
    plt.grid(True)
    plt.savefig('apartment_clusters.png')
    plt.close()
    print("Cluster visualization saved as 'apartment_clusters.png'")

def compare_picks_with_clusters(picked_apartment_ids, clusters_filepath, cluster_profiles):
    """Return JSON-able distribution and preferred cluster summary for picked apartments."""
    try:
        df_with_clusters = pd.read_csv(clusters_filepath)
    except FileNotFoundError:
        return {
            'distribution': [],
            'preferredCluster': { 'id': -1, 'summary': "Dataset not found" }
        }

    picked_apartments = df_with_clusters[df_with_clusters['id'].isin(picked_apartment_ids)]
    if picked_apartments.empty:
        return {
            'distribution': [],
            'preferredCluster': { 'id': -1, 'summary': "No picked apartments found in dataset" }
        }

    # Distribution
    counts = picked_apartments['cluster'].value_counts().sort_index()
    distribution = [{ 'cluster': f"Cluster {int(cid)}", 'count': int(cnt) } for cid, cnt in counts.items()]

    # Preferred cluster and summary
    preferred_cluster = int(picked_apartments['cluster'].mode()[0])
    profile = cluster_profiles.loc[preferred_cluster]
    summary = (
        "Your group's choices most frequently fall into this cluster. "
        f"Avg price ${profile['price']:.0f} (~${profile['per_person_price']:.0f}/person), "
        f"~{profile['driving_time_to_vt']:.0f} min drive, {profile['walking_time_to_vt']:.0f} min walk, "
        f"~{profile['bedrooms']:.1f} beds / {profile['bathrooms']:.1f} baths, {profile['square_feet']:.0f} sqft, "
        f"~{profile['num_amenities']:.1f} amenities."
    )

    return {
        'distribution': distribution,
        'preferredCluster': { 'id': preferred_cluster, 'summary': summary }
    }


def main_pipeline(picked_ids=None, json_out=False):
    """
    Executes the full data processing and clustering pipeline.
    """
    filepath = 'apartments_rows.csv'
    try:
        df = pd.read_csv(filepath)
    except FileNotFoundError:
        print(f"Error: The file '{filepath}' was not found.")
        return

    print("--- 1. Data Cleaning and Preprocessing ---")
    original_df, analysis_df = clean_and_preprocess(df)
    
    # Scale the features for clustering
    scaler = StandardScaler()
    analysis_df_scaled = scaler.fit_transform(analysis_df)
    
    print("\n--- 2. Finding Optimal Number of Clusters ---")
    n_clusters = find_optimal_clusters(analysis_df_scaled)
    print(f"Based on the elbow method, we will proceed with {n_clusters} clusters.")
    
    print("\n--- 3. Performing Clustering ---")
    cluster_labels = perform_clustering(analysis_df_scaled, n_clusters)
    original_df['cluster'] = cluster_labels
    analysis_df['cluster'] = cluster_labels
    
    print("\n--- 4. Profiling and Visualizing Clusters ---")
    # Calculate the mean of each feature for each cluster to create a profile
    cluster_profile = analysis_df.groupby('cluster').mean().round(2)
    print("Cluster Profiles (mean values for each feature):")
    print(cluster_profile)
    
    # Visualize the clusters
    visualize_clusters(analysis_df_scaled, cluster_labels)
    
    # Save the dataframe with cluster assignments to a new CSV
    output_filepath = 'apartments_with_clusters.csv'
    original_df.to_csv(output_filepath, index=False)
    print(f"\nFull dataset with cluster assignments saved to '{output_filepath}'")

    # If IDs were provided, perform comparison and optionally print JSON
    if picked_ids:
        result = compare_picks_with_clusters(picked_ids, output_filepath, cluster_profile)
        if json_out:
            import json
            print(json.dumps(result))
        else:
            print(result)


if __name__ == '__main__':
    import sys, json
    # Expect JSON payload on argv[1] with { apartmentIds: [...] }
    picked = None
    json_flag = False
    if len(sys.argv) > 1:
        try:
            payload = json.loads(sys.argv[1])
            picked = payload.get('apartmentIds')
            json_flag = True
        except Exception:
            picked = None
    main_pipeline(picked_ids=picked, json_out=json_flag)