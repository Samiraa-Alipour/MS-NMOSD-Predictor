// script.js - Frontend logic for NeuroOptic Classifier with language support

document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const predictBtn = document.getElementById('predict-btn');
    const clearBtn = document.getElementById('clear-btn');
    const infoBtn = document.getElementById('info-btn');
    const resultContainer = document.getElementById('result-container');
    const closeResultBtn = document.querySelector('.close-result');
    const guidelinesModal = document.getElementById('guidelines-modal');
    const errorModal = document.getElementById('error-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const errorMessage = document.getElementById('error-message');
    const languageToggle = document.getElementById('language-toggle');
    // Theme Toggle Functionality
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Feature input elements
    const ageInput = document.getElementById('age');
    const sexRadios = document.querySelectorAll('input[name="sex"]');
    const vepRightAmpInput = document.getElementById('vep_right_amp');
    const vepRightLatencyInput = document.getElementById('vep_right_latency');
    const vepLeftAmpInput = document.getElementById('vep_left_amp');
    const vepLeftLatencyInput = document.getElementById('vep_left_latency');
    const prnflInput = document.getElementById('prnfl');
    const trnflInput = document.getElementById('trnfl');
    const irnflInput = document.getElementById('irnfl');
    const srnflInput = document.getElementById('srnfl');
    const nrnflInput = document.getElementById('nrnfl');
    const gciplInput = document.getElementById('gcipl');
    const mvGciplInput = document.getElementById('mv_gcipl');
    // const modelSelect = document.getElementById('model-select');
    
    // Result elements
    const predictionClass = document.getElementById('prediction-class');
    const msProbBar = document.getElementById('ms-prob-bar');
    const msProbValue = document.getElementById('ms-prob-value');
    const nmosdProbBar = document.getElementById('nmosd-prob-bar');
    const nmosdProbValue = document.getElementById('nmosd-prob-value');
    const controlProbBar = document.getElementById('control-prob-bar');
    const controlProbValue = document.getElementById('control-prob-value');
    const modelUsed = document.getElementById('model-used');
    const featuresUsedList = document.getElementById('features-used-list');
    const feedbackMessage = document.getElementById('feedback-message');
    
    // Feature mapping
    const featureMapping = {
        'age': 'Age (Years)',
        'sex': 'Sex',
        'vep_right_amp': 'VEP-Right eye_amp',
        'vep_right_latency': 'VEP_Right eye/P100_latency_Y1',
        'vep_left_amp': 'VEP-left eye_amp',
        'vep_left_latency': 'VEP_left eye/P100_latency_Y1',
        'prnfl': 'pRNFL',
        'trnfl': 'tRNFL',
        'irnfl': 'iRNFL',
        'srnfl': 'sRNFL',
        'nrnfl': 'nRNFL',
        'gcipl': 'GCIPL Thickness',
        'mv_gcipl': 'Macular volume GCIPL'
    };
    
    // Model type display names
    const modelTypeNames = {
        // 'random_forest': 'Random Forest',
        // 'xgboost': 'XGBoost',
        // 'lgbm': 'LightGBM',
        'catboost': 'CatBoost',
        // 'voting': 'Voting Classifier',
        // 'stacking': 'Stacking Ensemble'
    };
    
    // Language translations
    const translations = {
        en: {
            predictBtn: '<i class="fas fa-brain"></i> Detection',
            clearBtn: '<i class="fas fa-eraser"></i> Clear All',
            infoBtn: '<i class="fas fa-info-circle"></i> Input Guidelines',
            processing: '<i class="fas fa-spinner fa-spin"></i> Processing...',
            feedbackMessage: 'The model has provided the above classification based on your input. If you have any concerns, please consult with a healthcare professional.',
            errorValidation: 'You must satisfy at least one of these options: (1) 3+ VEP features; (2) all 4 required OCT features (pRNFL, GCIPL Thickness, Macular volume GCIPL, tRNFL); (3) 2+ VEP features + 3 required OCT features (pRNFL, GCIPL Thickness, Macular volume GCIPL). Please check the Input Guidelines.',
            errorGeneral: 'An error occurred while processing your request. Please try again.',
            languageToggle: '<i class="fas fa-globe"></i> فارسی',
            ms: 'MS',
            nmosd: 'NMOSD',
            control: 'Control'
        },
        fa: {
            predictBtn: '<i class="fas fa-brain"></i> تشخیص',
            clearBtn: '<i class="fas fa-eraser"></i> پاک کردن همه',
            infoBtn: '<i class="fas fa-info-circle"></i> راهنمای ورودی',
            processing: '<i class="fas fa-spinner fa-spin"></i> در حال پردازش...',
            feedbackMessage: 'مدل بر اساس ورودی شما طبقه‌بندی بالا را ارائه داده است. اگر نگرانی دارید، لطفاً با متخصص مراقبت‌های بهداشتی مشورت کنید.',
            errorValidation: 'شما باید حداقل یکی از این گزینه‌ها را برآورده کنید: (۱) ۳+ ویژگی VEP؛ (۲) هر ۴ ویژگی OCT مورد نیاز (pRNFL، GCIPL Thickness، Macular volume GCIPL، tRNFL)؛ (۳) ۲+ ویژگی VEP + ۳ ویژگی OCT مورد نیاز (pRNFL، GCIPL Thickness، Macular volume GCIPL). لطفاً راهنمای ورودی را بررسی کنید.',
            errorGeneral: 'خطایی هنگام پردازش درخواست شما رخ داد. لطفاً دوباره امتحان کنید.',
            languageToggle: '<i class="fas fa-globe"></i> English',
            ms: 'MS',
            nmosd: 'NMOSD',
            control: 'Control'
        }
    };
    
    // Determine current language from HTML lang attribute
    let currentLanguage = document.documentElement.lang === 'fa' ? 'fa' : 'en';
    
    // Check if body has rtl class to confirm Persian language
    if (document.body.classList.contains('rtl')) {
        currentLanguage = 'fa';
    }
    
    // Apply initial translations
    applyTranslations();
    
    // Event Listeners
    predictBtn.addEventListener('click', handlePrediction);
    clearBtn.addEventListener('click', clearAllInputs);
    infoBtn.addEventListener('click', showGuidelines);
    closeResultBtn.addEventListener('click', () => {
        resultContainer.classList.add('hidden');
    });
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            guidelinesModal.style.display = 'none';
            errorModal.style.display = 'none';
        });
    });
    
    // Language toggle
    if (languageToggle) {
        languageToggle.addEventListener('click', toggleLanguage);
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === guidelinesModal) {
            guidelinesModal.style.display = 'none';
        } else if (e.target === errorModal) {
            errorModal.style.display = 'none';
        }
    });
    
    // Function to toggle language
    function toggleLanguage() {
        const targetLang = currentLanguage === 'en' ? 'fa' : 'en';
        const targetPath = targetLang === 'fa' ? 'index_persian.html' : '/';
        window.location.href = targetPath;
    }
    
    // Apply translations based on current language
    function applyTranslations() {
        const t = translations[currentLanguage];
        if (predictBtn) predictBtn.innerHTML = t.predictBtn;
        if (clearBtn) clearBtn.innerHTML = t.clearBtn;
        if (infoBtn) infoBtn.innerHTML = t.infoBtn;
        if (languageToggle) languageToggle.innerHTML = t.languageToggle;
        
        // Make sure feedback message is translated even if empty
        if (feedbackMessage && !resultContainer.classList.contains('hidden')) {
            feedbackMessage.textContent = t.feedbackMessage;
        }
    }
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
        updateThemeButtonText();
    }

    themeToggle.addEventListener('click', function() {
        body.classList.toggle('light-theme');
        
        // Save theme preference
        const currentTheme = body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        
        updateThemeButtonText();
    });

    function updateThemeButtonText() {
        const isLightTheme = body.classList.contains('light-theme');
        const isRTL = body.classList.contains('rtl');
        
        if (isRTL) {
            themeToggle.innerHTML = isLightTheme ? 
                '<i class="fas fa-moon"></i> تم تاریک' : 
                '<i class="fas fa-sun"></i> تم روشن';
        } else {
            themeToggle.innerHTML = isLightTheme ? 
                '<i class="fas fa-moon"></i> Dark Theme' : 
                '<i class="fas fa-sun"></i> Light Theme';
        }
    }


    // Handle prediction
    function handlePrediction() {
        // Get all inputs
        const inputs = collectInputs();
        
        // Validate input count
        if (!validateInputs(inputs)) {
            showError(translations[currentLanguage].errorValidation);
            return;
        }
        
        // Show loading state
        predictBtn.disabled = true;
        predictBtn.innerHTML = translations[currentLanguage].processing;
        
        // Prepare data for API
        const data = {
            inputs: inputs,
            // model_type: modelSelect.value
            model_type: 'catboost'
        };
        
        // Send request to backend
        fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(result => {
            // Reset button state
            predictBtn.disabled = false;
            predictBtn.innerHTML = translations[currentLanguage].predictBtn;
            
            if (result.error) {
                // Show error
                showError(result.message);
            } else {
                // Display results
                displayResults(result);
            }
        })
        .catch(error => {
            // Reset button state
            predictBtn.disabled = false;
            predictBtn.innerHTML = translations[currentLanguage].predictBtn;
            
            // Show error
            showError(translations[currentLanguage].errorGeneral);
            console.error('Error:', error);
        });
    }
    
    // Collect all user inputs
    function collectInputs() {
        const inputs = {};
        
        // Get age if provided
        if (ageInput.value) {
            inputs[featureMapping.age] = parseFloat(ageInput.value);
        }
        
        // Get sex if selected
        const selectedSex = document.querySelector('input[name="sex"]:checked');
        if (selectedSex) {
            inputs[featureMapping.sex] = selectedSex.value;
        }
        
        // Get VEP features
        if (vepRightAmpInput.value) inputs[featureMapping.vep_right_amp] = parseFloat(vepRightAmpInput.value);
        if (vepRightLatencyInput.value) inputs[featureMapping.vep_right_latency] = parseFloat(vepRightLatencyInput.value);
        if (vepLeftAmpInput.value) inputs[featureMapping.vep_left_amp] = parseFloat(vepLeftAmpInput.value);
        if (vepLeftLatencyInput.value) inputs[featureMapping.vep_left_latency] = parseFloat(vepLeftLatencyInput.value);
        
        // Get OCT features
        if (prnflInput.value) inputs[featureMapping.prnfl] = parseFloat(prnflInput.value);
        if (trnflInput.value) inputs[featureMapping.trnfl] = parseFloat(trnflInput.value);
        if (irnflInput.value) inputs[featureMapping.irnfl] = parseFloat(irnflInput.value);
        if (srnflInput.value) inputs[featureMapping.srnfl] = parseFloat(srnflInput.value);
        if (nrnflInput.value) inputs[featureMapping.nrnfl] = parseFloat(nrnflInput.value);
        if (gciplInput.value) inputs[featureMapping.gcipl] = parseFloat(gciplInput.value);
        if (mvGciplInput.value) inputs[featureMapping.mv_gcipl] = parseFloat(mvGciplInput.value);
        
        return inputs;
    }
    
    // Validate that the inputs meet our criteria
    function validateInputs(inputs) {
        const features = Object.keys(inputs);
    
        // Define feature sets
        const vepFeatures = [
            'VEP-Right eye_amp',
            'VEP_Right eye/P100_latency_Y1',
            'VEP-left eye_amp',
            'VEP_left eye/P100_latency_Y1'
        ];
        const octFeaturesOption2 = [
            'pRNFL',
            'tRNFL',
            'GCIPL Thickness',
            'Macular volume GCIPL'
        ];
        const octFeaturesOption3 = [
            'pRNFL',
            'GCIPL Thickness',
            'Macular volume GCIPL'
        ];
    
        // Count features provided from each category
        const vepCount = features.filter(f => vepFeatures.includes(f)).length;
        const octCountOption2 = features.filter(f => octFeaturesOption2.includes(f)).length;
        const octCountOption3 = features.filter(f => octFeaturesOption3.includes(f)).length;
    
        // Option 1: At least 3 VEP features
        const option1Valid = vepCount >= 3;
    
        // Option 2: All 4 specific OCT features
        const option2Valid = octCountOption2 === 4 && features.filter(f => octFeaturesOption2.includes(f)).length === 4;
    
        // Option 3: At least 2 VEP features + all 3 specific OCT features
        const option3Valid = vepCount >= 2 && octCountOption3 === 3 && features.filter(f => octFeaturesOption3.includes(f)).length === 3;
    
        // Return true if at least one option is satisfied
        return option1Valid || option2Valid || option3Valid;
    }
    
    // Display results on UI
    function displayResults(result) {
        // Populate prediction and probabilities
        predictionClass.textContent = result.prediction;
        
        const msProb = result.prediction_proba.MS * 100;
        const nmosdProb = result.prediction_proba['NMOSD'] * 100;
        const controlProb = result.prediction_proba.Control * 100;
        
        msProbBar.style.width = `${msProb}%`;
        msProbValue.textContent = `${msProb.toFixed(1)}%`;
        
        nmosdProbBar.style.width = `${nmosdProb}%`;
        nmosdProbValue.textContent = `${nmosdProb.toFixed(1)}%`;
        
        controlProbBar.style.width = `${controlProb}%`;
        controlProbValue.textContent = `${controlProb.toFixed(1)}%`;
        
        // Display model used
        modelUsed.textContent = modelTypeNames[result.model_used];
        
        // List features used
        featuresUsedList.innerHTML = '';
        result.features_used.forEach(feature => {
            const li = document.createElement('li');
            li.textContent = feature;
            featuresUsedList.appendChild(li);
        });
        
        // Show result container
        resultContainer.classList.remove('hidden');
        
        // Set feedback message explicitly based on current language
        if (feedbackMessage) {
            feedbackMessage.textContent = translations[currentLanguage].feedbackMessage;
        }
    }
    
    // Show an error message
    function showError(message) {
        errorMessage.textContent = message;
        errorModal.style.display = 'flex';
    }
    
    // Clear all input fields
    function clearAllInputs() {
        ageInput.value = '';
        sexRadios.forEach(radio => radio.checked = false);
        vepRightAmpInput.value = '';
        vepRightLatencyInput.value = '';
        vepLeftAmpInput.value = '';
        vepLeftLatencyInput.value = '';
        prnflInput.value = '';
        trnflInput.value = '';
        irnflInput.value = '';
        srnflInput.value = '';
        nrnflInput.value = '';
        gciplInput.value = '';
        mvGciplInput.value = '';
        resultContainer.classList.add('hidden');
    }
 
    // Show guidelines modal
    function showGuidelines() {
        guidelinesModal.style.display = 'flex';
    }
});