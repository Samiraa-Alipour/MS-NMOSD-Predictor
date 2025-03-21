import os
import pickle
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify, render_template
import warnings
import logging

warnings.filterwarnings('ignore')

app = Flask(__name__, template_folder='templates')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define feature groups
demographic_features = ['Age (Years)', 'Sex']
vep_features = ['VEP-Right eye_amp', 'VEP_Right eye/P100_latency_Y1', 'VEP-left eye_amp', 'VEP_left eye/P100_latency_Y1']
oct_features = ['pRNFL', 'tRNFL', 'iRNFL', 'sRNFL', 'nRNFL', 'GCIPL Thickness', 'Macular volume GCIPL']

# Define model groups
groups = {
    'group1': demographic_features + vep_features,
    'group2': demographic_features + oct_features,
    'group3': demographic_features + vep_features + oct_features
}

target = 'Patient Type'

# Load models, scalers, feature importances, F1 scores, and permutation importances
with open('models/trained_models.pkl', 'rb') as f:
    all_models = pickle.load(f)

with open('models/scalers.pkl', 'rb') as f:
    all_scalers = pickle.load(f)

with open('models/feature_importances.pkl', 'rb') as f:
    all_feature_importances = pickle.load(f)

with open('models/f1_scores.pkl', 'rb') as f:
    all_f1_scores = pickle.load(f)

with open('models/permutation_importances.pkl', 'rb') as f:
    all_permutation_importances = pickle.load(f)
    
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/index_persian.html')
def index_persian():
    return render_template('index_persian.html')


# Commented out validation function since criteria are enforced in script.js
# def validate_user_inputs(input_features):
#     """Validate user inputs against the required criteria."""
#     # Count features from each required category
#     demographic_count = sum(1 for f in input_features if f in required_features['demographic'])
#     vep_count = sum(1 for f in input_features if f in required_features['vep'])
#     oct_count = sum(1 for f in input_features if f in required_features['oct'])
#
#     total_count = len(input_features)
#
#     # Check if at least 5 features are provided, with at least Age (Years) and some from VEP or OCT
#     if total_count < 5:
#         return False, "Please insert at least 5 features in total."
#     if demographic_count < 1:
#         return False, "Please include 'Age (Years)' as a demographic feature."
#     if vep_count == 0 and oct_count == 0:
#         return False, "Please include at least some features from VEP or OCT: " + ", ".join(required_features['vep'] + required_features['oct'])
#     
#     logger.info(f"Validation passed: {total_count} features provided, demographic: {demographic_count}, VEP: {vep_count}, OCT: {oct_count}")
#     return True, None

def select_model_group(input_features):
    """Select the appropriate model group based on user-provided features."""
    vep_used = any(f in vep_features for f in input_features)
    oct_used = any(f in oct_features for f in input_features)

    if vep_used and not oct_used:
        group_name = 'group1'
    elif oct_used and not vep_used:
        group_name = 'group2'
    else:
        group_name = 'group3'
    
    logger.info(f"Initially selected model group: {group_name}")
    return group_name

def select_best_model(initial_group_name, input_features):
    """Select the best model across relevant groups based on feature importance, permutation importance, and F1 scores."""
    vep_used = any(f in vep_features for f in input_features)
    oct_used = any(f in oct_features for f in input_features)

    best_model = None
    best_combined_score = -1
    best_model_name = None
    best_group_name = None
    best_group_features = None
    best_scaler = None

    # List of groups to consider for scoring
    groups_to_consider = [initial_group_name]
    if initial_group_name == 'group3':
        # If group3 is initially selected, also consider group1 (if VEP features are used) and group2 (if OCT features are used)
        if vep_used:
            groups_to_consider.append('group1')
        if oct_used:
            groups_to_consider.append('group2')

    # Collect match scores and F1 scores for normalization
    match_scores = []
    permutation_scores = []
    f1_scores = []
    for group_name in groups_to_consider:
        models = all_models[group_name]
        feature_importances = all_feature_importances[group_name]
        permutation_importances = all_permutation_importances[group_name]
        group_features = groups[group_name]

        for model_name in models.keys():
            # Built-in feature importance match score
            model_importances = feature_importances[model_name]
            match_score = sum(model_importances.get(f, 0) for f in input_features if f in group_features)
            match_scores.append(match_score)

            # Permutation importance match score
            perm_importances = permutation_importances[model_name]
            perm_score = sum(perm_importances.get(f, 0) for f in input_features if f in group_features)
            permutation_scores.append(perm_score)

            # F1 score
            f1_scores.append(all_f1_scores[group_name][model_name])

    # Normalize match scores, permutation scores, and F1 scores to [0, 1]
    if match_scores:
        match_min = min(match_scores)
        match_max = max(match_scores)
        if match_max > match_min:
            normalized_match_scores = [(score - match_min) / (match_max - match_min) for score in match_scores]
        else:
            normalized_match_scores = [1.0] * len(match_scores)
    else:
        normalized_match_scores = []

    if permutation_scores:
        perm_min = min(permutation_scores)
        perm_max = max(permutation_scores)
        if perm_max > perm_min:
            normalized_permutation_scores = [(score - perm_min) / (perm_max - perm_min) for score in permutation_scores]
        else:
            normalized_permutation_scores = [1.0] * len(permutation_scores)
    else:
        normalized_permutation_scores = []

    if f1_scores:
        f1_min = min(f1_scores)
        f1_max = max(f1_scores)
        if f1_max > f1_min:
            normalized_f1_scores = [(score - f1_min) / (f1_max - f1_min) for score in f1_scores]
        else:
            normalized_f1_scores = [1.0] * len(f1_scores)
    else:
        normalized_f1_scores = []

    # Weights for combined score
    match_weight = 0.2  # Built-in feature importance
    perm_weight = 0.6   # Permutation importance
    f1_weight = 0.2     # F1 score

    # Index to track normalized scores
    score_index = 0

    for group_name in groups_to_consider:
        models = all_models[group_name]
        feature_importances = all_feature_importances[group_name]
        permutation_importances = all_permutation_importances[group_name]
        group_features = groups[group_name]
        scaler = all_scalers[group_name]  # Not used but kept for consistency

        for model_name in models.keys():
            # Built-in feature importance match score
            model_importances = feature_importances[model_name]
            match_score = sum(model_importances.get(f, 0) for f in input_features if f in group_features)
            
            # Permutation importance match score
            perm_importances = permutation_importances[model_name]
            perm_score = sum(perm_importances.get(f, 0) for f in input_features if f in group_features)
            
            # Get normalized scores
            normalized_match_score = normalized_match_scores[score_index]
            normalized_perm_score = normalized_permutation_scores[score_index]
            normalized_f1_score = normalized_f1_scores[score_index]
            
            # Calculate combined score
            combined_score = (match_weight * normalized_match_score + 
                            perm_weight * normalized_perm_score + 
                            f1_weight * normalized_f1_score)
            
            # Log the scores for each model
            logger.info(f"Match score for {group_name}_{model_name}: {match_score}, Permutation score: {perm_score}, "
                        f"Normalized match: {normalized_match_score}, Normalized perm: {normalized_perm_score}, "
                        f"Normalized F1: {normalized_f1_score}, Combined score: {combined_score}")

            if combined_score > best_combined_score:
                best_combined_score = combined_score
                best_model = models[model_name]
                best_model_name = model_name
                best_group_name = group_name
                best_group_features = group_features
                best_scaler = scaler

            score_index += 1

    logger.info(f"Selected best model: {best_group_name}_{best_model_name} with combined score {best_combined_score}")
    return best_model, f"{best_group_name}_{best_model_name}", best_scaler, best_group_features

@app.route('/predict', methods=['POST'])
def predict():
    if request.method == 'POST':
        try:
            # Get user inputs
            data = request.get_json()
            user_inputs = data['inputs']

            # Extract features that have values
            input_features = []
            input_values = {}

            for feature, value in user_inputs.items():
                if value is not None and value != "":
                    input_features.append(feature)
                    # Convert to appropriate type
                    if feature == 'Sex':
                        if value == 'Male':
                            input_values[feature] = 2  # Male is 2
                        elif value == 'Female':
                            input_values[feature] = 1  # Female is 1
                        else:
                            input_values[feature] = None
                            logger.warning(f"Unexpected value for Sex: {value}")
                    else:
                        input_values[feature] = float(value)

            logger.info(f"User provided features: {input_features}")

            # Commented out validation since criteria are enforced in script.js
            # # Validate input features
            # is_valid, error_message = validate_user_inputs(input_features)
            # if not is_valid:
            #     logger.error(f"Validation failed: {error_message}")
            #     return jsonify({
            #         'error': True,
            #         'message': error_message
            #     })

            # Select the appropriate model group
            initial_group_name = select_model_group(input_features)

            # Select the best model across relevant groups based on feature importance
            model, model_name, scaler, model_features = select_best_model(initial_group_name, input_features)

            if model is None:
                logger.error("No suitable model found for the provided features.")
                return jsonify({
                    'error': True,
                    'message': 'No suitable model found for the provided features.'
                })

            # Prepare data for prediction
            X_pred = pd.DataFrame(columns=model_features)

            # Populate X_pred with user inputs, filling missing values with NaN
            for feature in model_features:
                if feature in input_values:
                    X_pred.loc[0, feature] = input_values[feature]
                else:
                    X_pred.loc[0, feature] = np.nan  # Fill missing features with NaN

            # Convert all columns to numeric types, coercing errors to NaN
            X_pred = X_pred.astype(float)
            
            
            # Scale features (commented out for tree-based models)
            # X_pred_scaled = scaler.transform(X_pred)
            X_pred_scaled = X_pred  # Use raw data without scaling

            # Make prediction
            prediction = model.predict_proba(X_pred_scaled)[0]

            # Determine the predicted class (highest probability)
            class_names = ['MS', 'NMOSD', 'Control']
            predicted_class_index = np.argmax(prediction)
            predicted_class = class_names[predicted_class_index]

            # Return result
            result = {
                'error': False,
                'prediction_proba': {
                    'MS': float(prediction[0]),
                    'NMOSD': float(prediction[1]),
                    'Control': float(prediction[2])
                },
                'prediction': predicted_class,
                'prediction_class': int(predicted_class_index),
                'model_used': model_name,
                'features_used': input_features
            }

            logger.info(f"Prediction made: {result}")
            return jsonify(result)

        except Exception as e:
            logger.error(f"An error occurred: {str(e)}")
            return jsonify({
                'error': True,
                'message': f'An error occurred: {str(e)}'
            })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Use PORT env var or default to 5000
    app.run(host='0.0.0.0', port=port, debug=False)  # debug=False for production
# if __name__ == '__main__':
#     app.run(debug=True)