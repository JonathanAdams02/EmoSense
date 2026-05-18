// ===== CONFIGURATION =====
const TEST_MODE   = 0;           // 1 = test mode, 0 = production
const VIDEO_FOLDER = 'videos/';  // folder containing your video files
const EMOTIONS    = ['Happy', 'Sad', 'Angry', 'Tired', 'Proud', 'Neutral'];
const VIDEO_DURATION_MS = 3000;  // minimum watch time before Next unlocks

// ===== FIREBASE CONFIG — fill in your project details =====
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDr1Q-f5PG4bifxeSMmLlTghjB3jFos3uk",
    authDomain: "emosense-d75d4.firebaseapp.com",
    projectId: "emosense-d75d4",
    storageBucket: "emosense-d75d4.firebasestorage.app",
    messagingSenderId: "206150435854",
    appId: "1:206150435854:web:ecf8da5328a02483f2e85f"
};
const FIREBASE_COLLECTION = 'trials'; // Firestore collection name

// ===== SUBJECT ID =====
const subjectId = Math.floor(1000 + Math.random() * 9000);

// ===== AUTO ZOOM =====
// Scale horizontally relative to 1920px baseline, exactly like the reference experiment.
// The layout uses 100vh internally so height fills naturally after scaling.
function applyZoom() {
    const target = document.getElementById('jspsych-target');
    if (!target) return;

    const width = window.screen.width;
    if (width === 1920) {
        target.style.transform = '';
        target.style.transformOrigin = '';
        return;
    }

    const zoom = 0.01 * Math.floor(100 * width / 1920);
    target.style.transform       = `scale(${zoom})`;
    target.style.transformOrigin = 'top left';
}

window.addEventListener('load',   applyZoom);
window.addEventListener('resize', applyZoom);

// ===== INJECT PROGRESS BAR =====
function injectProgressBar() {
    if (document.getElementById('progress-bar-container')) return;
    const container = document.createElement('div');
    container.id = 'progress-bar-container';
    container.innerHTML = `<div id="progress-bar" style="width:0%"></div>`;
    document.body.appendChild(container);

    const label = document.createElement('div');
    label.id = 'progress-label';
    document.body.appendChild(label);
}

function updateProgress(current, total) {
    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('progress-label');
    if (bar)   bar.style.width = `${(current / total) * 100}%`;
    if (label) label.textContent = `${current} / ${total}`;
}

// ===== FIREBASE INIT =====
let db = null;

async function initFirebase() {
    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js');
        const { getFirestore, collection, addDoc, serverTimestamp }
            = await import('https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js');

        const app = initializeApp(FIREBASE_CONFIG);
        db = getFirestore(app);

        // Store helpers on db object for later use
        db._collection       = collection;
        db._addDoc           = addDoc;
        db._serverTimestamp  = serverTimestamp;

        console.log('Firebase initialised');
    } catch (e) {
        console.error('Firebase init failed:', e);
    }
}

async function saveToFirebase(collection, data) {
    if (!db) { console.warn('Firebase not ready, skipping save'); return; }
    try {
        await db._addDoc(db._collection(db, collection), {
            ...data,
            subjectId,
            timestamp: db._serverTimestamp()
        });
    } catch (e) {
        console.error(`Firebase write to '${collection}' failed:`, e);
    }
}

// ===== LOAD VIDEO LIST =====
// Expects a JSON file at the root: video-list.json
// Format: ["happy_01.mp4", "sad_02.mp4", ...]
// If you don't have a JSON file, replace this with a hardcoded array.
let videoFiles = [];

fetch('video-list.json')
    .then(r => r.json())
    .then(data => {
        videoFiles = data;
        initFirebase().then(() => initializeExperiment());
    })
    .catch(err => {
        console.error('Error loading video list:', err);
        alert('Could not load video list. Make sure video-list.json exists.');
    });

// ===== MAIN EXPERIMENT =====
function initializeExperiment() {

    const jsPsych = initJsPsych({
        display_element: 'jspsych-target',
        on_finish: function() {
            updateProgress(videoFiles.length, videoFiles.length);
        }
    });

    // Shuffle videos
    const shuffledVideos = jsPsych.randomization.shuffle([...videoFiles]);
    const totalTrials    = shuffledVideos.length;

    injectProgressBar();

    // ===== WELCOME =====
    const welcome = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="screen-center">
                <h1>Puppet Emotion Study</h1>
                <p>Thank you for participating.</p>
                <p>
                    You will watch <strong>${totalTrials} short video clips</strong> of puppet characters.
                    For each video, you will answer three questions about the emotion being expressed.
                    Each video is 3 seconds long and will loop automatically.
                </p>
                <p>Your participant ID is: <strong>${subjectId}</strong></p>
            </div>
        `,
        choices: ['Start'],
        button_html: `<div style="position:fixed; bottom:30px; left:50%; transform:translateX(-50%);"><button class="jspsych-btn" style="padding:12px 32px; font-size:16px; font-weight:bold; border-radius:8px; border:none; background:#007bff; color:#fff; box-shadow:0 4px 6px rgba(0,0,0,0.2); cursor:pointer;">Start</button></div>`
    };

    // ===== DEMOGRAPHICS =====
    const demographics = {
        type: jsPsychSurvey,
        pages: [
            [
                {
                    type: 'html',
                    prompt: '<h2 style="margin-bottom:4px;">About you</h2><p style="color:#666;margin-top:0;">Please answer a few questions before we begin.</p>'
                },
                {
                    type: 'drop-down',
                    name: 'age',
                    prompt: 'What is your age?',
                    options: Array.from({length: 83}, (_, i) => String(i + 18)),
                    required: true
                },
                {
                    type: 'drop-down',
                    name: 'gender',
                    prompt: 'What is your gender?',
                    options: ['Female', 'Male', 'Non-binary', 'Prefer not to say'],
                    required: true
                },
                {
                    type: 'drop-down',
                    name: 'native_language',
                    prompt: 'What is your native language?',
                    options: ['Dutch', 'English', 'French', 'German', 'Spanish', 'Other'],
                    required: true
                },
                {
                    type: 'drop-down',
                    name: 'education',
                    prompt: 'What is your highest completed level of education?',
                    options: [
                        'Primary school',
                        'Secondary school',
                        'Bachelor\'s degree',
                        'Master\'s degree',
                        'PhD or higher',
                        'Other'
                    ],
                    required: true
                }
            ]
        ],
        button_label_finish: 'Continue',
        data: { task: 'demographics', subject_id: subjectId },
        on_finish: function(data) {
            saveToFirebase('demographics', {
                task:            'demographics',
                age:             data.response.age,
                gender:          data.response.gender,
                native_language: data.response.native_language,
                education:       data.response.education
            });
        }
    };

    // ===== INSTRUCTIONS =====
    const instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="screen-center">
                <h1>Instructions</h1>
                <p>For each video, you will be asked to:</p>
                <p>
                    <strong>1. Choose an emotion</strong> — select which of the six emotions the puppet is expressing: Happy, Sad, Angry, Tired, Proud, or Neutral.<br><br>
                    <strong>2. Rate clarity</strong> — how clearly does the puppet express that emotion? (1 = not at all clearly, 100 = extremely clearly). This question is skipped if you select Neutral.<br><br>
                    <strong>3. Rate valence</strong> — how positive or negative does the expression feel? (1 = very negative, 100 = very positive)
                </p>
                <p>
                    All three questions appear on screen at the same time as the video.
                    The <strong>Next</strong> button will unlock once you have watched the full clip
                    and answered all three questions.
                </p>
            </div>
        `,
        choices: ['Begin'],
        button_html: `<div style="position:fixed; bottom:30px; left:50%; transform:translateX(-50%);"><button class="jspsych-btn" style="padding:12px 32px; font-size:16px; font-weight:bold; border-radius:8px; border:none; background:#007bff; color:#fff; box-shadow:0 4px 6px rgba(0,0,0,0.2); cursor:pointer;">Begin</button></div>`
    };

    // ===== TRIALS =====
    const timeline = [];
    timeline.push(welcome);
    timeline.push(demographics);
    timeline.push(instructions);

    shuffledVideos.forEach((filename, index) => {
        const trialNum = index + 1;

        const trial = {
            type: jsPsychHtmlButtonResponse,
            choices: ['Next →'],
            stimulus: function() {
                return `
                    ${TEST_MODE ? `<div style="position:fixed;top:60px;right:10px;background:red;color:#fff;padding:8px 14px;font-weight:bold;z-index:10000;border-radius:5px;">TEST MODE</div>` : ''}

                    <div class="trial-wrapper">

                        <!-- LEFT: video -->
                        <div class="video-panel">
                            ${TEST_MODE ? `<div class="video-trial-label">${filename}</div>` : ''}
                            <div class="video-trial-label">Video ${trialNum} of ${totalTrials}</div>
                            <video id="stim-video-${trialNum}" autoplay loop muted playsinline>
                                <source src="${VIDEO_FOLDER}${filename}" type="video/mp4">
                            </video>
                        </div>

                        <div class="panel-divider"></div>

                        <!-- RIGHT: questions -->
                        <div class="questions-panel">

                            <!-- Q1: forced choice -->
                            <div class="question-block">
                                <div class="question-label">Which emotion does this puppet express?</div>
                                <div class="emotion-choice-grid">
                                    ${EMOTIONS.map(e => `
                                        <button class="emotion-choice-btn" data-emotion="${e}"
                                            onclick="window._selectEmotion('${e}', ${trialNum})">
                                            ${e}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Q2: clarity slider (muted when Neutral selected) -->
                            <div class="question-block" id="clarity-block-${trialNum}">
                                <div class="question-label">
                                    How clearly does it express
                                    <span id="chosen-label-${trialNum}">that emotion</span>?
                                </div>
                                <div class="slider-wrapper">
                                    <div class="slider-anchors">
                                        <span>Not at all clearly</span>
                                        <span>Extremely clearly</span>
                                    </div>
                                    <input type="range" id="clarity-slider-${trialNum}"
                                        min="1" max="100" value="50"
                                        oninput="window._onSlider('clarity', this.value, ${trialNum})">
                                    <div class="slider-value-display" id="clarity-val-${trialNum}">—</div>
                                </div>
                                <div id="clarity-muted-msg-${trialNum}" style="display:none; color:#aaa; font-size:13px; font-style:italic; margin-top:6px;">
                                    Not applicable for Neutral
                                </div>
                            </div>

                            <!-- Q3: valence slider -->
                            <div class="question-block">
                                <div class="question-label">How positive or negative does this expression feel?</div>
                                <div class="slider-wrapper">
                                    <div class="slider-anchors">
                                        <span>Very negative</span>
                                        <span>Very positive</span>
                                    </div>
                                    <input type="range" id="valence-slider-${trialNum}"
                                        min="1" max="100" value="50"
                                        oninput="window._onSlider('valence', this.value, ${trialNum})">
                                    <div class="slider-value-display" id="valence-val-${trialNum}">—</div>
                                </div>
                            </div>

                        </div>
                    </div>

                    ${TEST_MODE ? `<button id="skip-btn-${trialNum}" style="position:fixed;bottom:80px;right:20px;padding:10px 20px;font-size:14px;font-weight:bold;background:#ff9800;color:#fff;border:none;border-radius:6px;cursor:pointer;z-index:9999;">SKIP →</button>` : ''}
                `;
            },

            data: {
                task:       'trial',
                trial_number: trialNum,
                subject_id: subjectId,
                video:      filename
            },

            button_html: `<div style="position:fixed; bottom:30px; left:50%; transform:translateX(-50%);"><button class="jspsych-btn" style="padding:12px 32px; font-size:16px; font-weight:bold; border-radius:8px; border:none; box-shadow:0 4px 6px rgba(0,0,0,0.2);">Next →</button></div>`,

            on_load: function() {
                updateProgress(index, totalTrials);

                // Per-trial state
                const state = {
                    watched:        false,
                    emotion:        null,
                    clarity:        50,
                    valence:        50,
                    clarityTouched: false,
                    valenceTouched: false,
                    startTime:      Date.now()
                };
                window[`_trialState_${trialNum}`] = state;

                function checkReady() {
                    const isNeutral = state.emotion === 'Neutral';
                    const ready = state.watched &&
                                  state.emotion !== null &&
                                  (isNeutral || state.clarityTouched) &&
                                  state.valenceTouched;
                    const btn = document.querySelector('.jspsych-btn');
                    if (btn) {
                        btn.classList.toggle('btn-locked', !ready);
                    }
                }

                // Unlock after one full video play
                const watchTimer = setTimeout(() => {
                    state.watched = true;
                    checkReady();
                }, VIDEO_DURATION_MS);

                // Store timer ref so it can be cleared if needed
                window[`_watchTimer_${trialNum}`] = watchTimer;

                // Expose slider handler
                window._onSlider = function(type, value, t) {
                    if (t !== trialNum) return;
                    const v = parseInt(value);
                    const s = window[`_trialState_${t}`];
                    if (type === 'clarity') {
                        s.clarity        = v;
                        s.clarityTouched = true;
                        const el = document.getElementById(`clarity-val-${t}`);
                        if (el) el.textContent = v;
                    } else {
                        s.valence        = v;
                        s.valenceTouched = true;
                        const el = document.getElementById(`valence-val-${t}`);
                        if (el) el.textContent = v;
                    }
                    checkReady();
                };

                // Expose emotion selector
                window._selectEmotion = function(emotion, t) {
                    if (t !== trialNum) return;
                    const s = window[`_trialState_${t}`];
                    s.emotion = emotion;

                    document.querySelectorAll('.emotion-choice-btn').forEach(b => {
                        b.classList.toggle('selected', b.dataset.emotion === emotion);
                    });

                    const lbl = document.getElementById(`chosen-label-${t}`);
                    if (lbl) lbl.textContent = `"${emotion}"`;

                    // Mute clarity slider when Neutral is selected
                    const clarityBlock  = document.getElementById(`clarity-block-${t}`);
                    const claritySlider = document.getElementById(`clarity-slider-${t}`);
                    const clarityVal    = document.getElementById(`clarity-val-${t}`);
                    const clarityMsg    = document.getElementById(`clarity-muted-msg-${t}`);

                    if (emotion === 'Neutral') {
                        clarityBlock.style.opacity  = '0.35';
                        claritySlider.disabled      = true;
                        claritySlider.style.cursor  = 'not-allowed';
                        clarityVal.textContent      = '—';
                        clarityMsg.style.display    = 'block';
                        s.clarity                   = null;
                        s.clarityTouched            = false;
                    } else {
                        clarityBlock.style.opacity  = '1';
                        claritySlider.disabled      = false;
                        claritySlider.style.cursor  = 'pointer';
                        clarityMsg.style.display    = 'none';
                        // Reset slider to midpoint if coming back from Neutral
                        if (s.clarity === null) {
                            claritySlider.value    = 50;
                            clarityVal.textContent = '—';
                            s.clarity              = 50;
                            s.clarityTouched       = false;
                        }
                    }

                    checkReady();
                };

                // Lock Next button until all conditions met
                const btn = document.querySelector('.jspsych-btn');
                if (btn) btn.classList.add('btn-locked');
                if (btn) {
                    btn.addEventListener('click', function(e) {
                        if (btn.classList.contains('btn-locked')) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            alert('Please watch the full video and answer all three questions before continuing.');
                        }
                    }, true); // capture phase so it fires before jsPsych
                }

                // Test mode skip
                if (TEST_MODE) {
                    const skipBtn = document.getElementById(`skip-btn-${trialNum}`);
                    if (skipBtn) {
                        skipBtn.addEventListener('click', () => {
                            state.watched        = true;
                            state.emotion        = EMOTIONS[0];
                            state.clarity        = 50;
                            state.valence        = 50;
                            state.clarityTouched = true;
                            state.valenceTouched = true;
                            jsPsych.finishTrial({ skipped: true });
                        });
                    }
                }
            },

            on_finish: async function(data) {
                const state = window[`_trialState_${trialNum}`];
                data.emotion   = state.emotion;
                data.clarity   = state.clarity;
                data.valence   = state.valence;
                data.rt_ms     = Date.now() - state.startTime;

                await saveToFirebase(FIREBASE_COLLECTION, {
                    trial:     trialNum,
                    video:     filename,
                    emotion:   state.emotion,
                    clarity:   state.clarity,
                    valence:   state.valence,
                    rt_ms:     data.rt_ms
                });
            }
        };

        timeline.push(trial);
    });

    // ===== POST-EXPERIMENT SURVEY: MAIA-2 =====
    // Multidimensional Assessment of Interoceptive Awareness, Version 2
    // © 2018 University of California San Francisco

    const maiaItems = [
        { name: 'maia_01', prompt: '1. When I am tense I notice where the tension is located in my body.' },
        { name: 'maia_02', prompt: '2. I notice when I am uncomfortable in my body.' },
        { name: 'maia_03', prompt: '3. I notice where in my body I am comfortable.' },
        { name: 'maia_04', prompt: '4. I notice changes in my breathing, such as whether it slows down or speeds up.' },
        { name: 'maia_05', prompt: '5. I ignore physical tension or discomfort until they become more severe.' },
        { name: 'maia_06', prompt: '6. I distract myself from sensations of discomfort.' },
        { name: 'maia_07', prompt: '7. When I feel pain or discomfort, I try to power through it.' },
        { name: 'maia_08', prompt: '8. I try to ignore pain.' },
        { name: 'maia_09', prompt: '9. I push feelings of discomfort away by focusing on something.' },
        { name: 'maia_10', prompt: '10. When I feel unpleasant body sensations, I occupy myself with something else so I don\'t have to feel them.' },
        { name: 'maia_11', prompt: '11. When I feel physical pain, I become upset.' },
        { name: 'maia_12', prompt: '12. I start to worry that something is wrong if I feel any discomfort.' },
        { name: 'maia_13', prompt: '13. I can notice an unpleasant body sensation without worrying about it.' },
        { name: 'maia_14', prompt: '14. I can stay calm and not worry when I have feelings of discomfort or pain.' },
        { name: 'maia_15', prompt: '15. When I am in discomfort or pain I can\'t get it out of my mind.' },
        { name: 'maia_16', prompt: '16. I can pay attention to my breath without being distracted by things happening around me.' },
        { name: 'maia_17', prompt: '17. I can maintain awareness of my inner bodily sensations even when there is a lot going on around me.' },
        { name: 'maia_18', prompt: '18. When I am in conversation with someone, I can pay attention to my posture.' },
        { name: 'maia_19', prompt: '19. I can return awareness to my body if I am distracted.' },
        { name: 'maia_20', prompt: '20. I can refocus my attention from thinking to sensing my body.' },
        { name: 'maia_21', prompt: '21. I can maintain awareness of my whole body even when a part of me is in pain or discomfort.' },
        { name: 'maia_22', prompt: '22. I am able to consciously focus on my body as a whole.' },
        { name: 'maia_23', prompt: '23. I notice how my body changes when I am angry.' },
        { name: 'maia_24', prompt: '24. When something is wrong in my life I can feel it in my body.' },
        { name: 'maia_25', prompt: '25. I notice that my body feels different after a peaceful experience.' },
        { name: 'maia_26', prompt: '26. I notice that my breathing becomes free and easy when I feel comfortable.' },
        { name: 'maia_27', prompt: '27. I notice how my body changes when I feel happy / joyful.' },
        { name: 'maia_28', prompt: '28. When I feel overwhelmed I can find a calm place inside.' },
        { name: 'maia_29', prompt: '29. When I bring awareness to my body I feel a sense of calm.' },
        { name: 'maia_30', prompt: '30. I can use my breath to reduce tension.' },
        { name: 'maia_31', prompt: '31. When I am caught up in thoughts, I can calm my mind by focusing on my body/breathing.' },
        { name: 'maia_32', prompt: '32. I listen for information from my body about my emotional state.' },
        { name: 'maia_33', prompt: '33. When I am upset, I take time to explore how my body feels.' },
        { name: 'maia_34', prompt: '34. I listen to my body to inform me about what to do.' },
        { name: 'maia_35', prompt: '35. I am at home in my body.' },
        { name: 'maia_36', prompt: '36. I feel my body is a safe place.' },
        { name: 'maia_37', prompt: '37. I trust my body sensations.' }
    ];

    // Split into pages of 10 items each for readability
    const ITEMS_PER_PAGE = 10;
    const maiaHeader = {
        type: 'html',
        prompt: `
            <div style="margin-bottom: 16px;">
                <h2 style="margin-bottom: 6px;">Body Awareness Questionnaire</h2>
                <p style="color: #555; margin: 0;">
                    Below you will find a list of statements. Please indicate how often each statement
                    applies to you generally in daily life.
                </p>
            </div>
        `
    };

    function makeMaiaItem(item) {
        return {
            type: 'likert',
            name: item.name,
            prompt: item.prompt,
            likert_scale_min_label: 'Never (0)',
            likert_scale_max_label: 'Always (5)',
            likert_scale_values: [0, 1, 2, 3, 4, 5],
            required: true
        };
    }

    // Build pages: first page has header + first 10 items, rest are 10 items each
    const maiaPages = [];
    for (let i = 0; i < maiaItems.length; i += ITEMS_PER_PAGE) {
        const pageItems = maiaItems.slice(i, i + ITEMS_PER_PAGE).map(makeMaiaItem);
        if (i === 0) pageItems.unshift(maiaHeader);
        maiaPages.push(pageItems);
    }

    const postSurvey = {
        type: jsPsychSurvey,
        pages: maiaPages,
        button_label_next: 'Next',
        button_label_back: 'Back',
        button_label_finish: 'Submit',
        data: { task: 'maia2', subject_id: subjectId },
        on_finish: function(data) {
            saveToFirebase('maia2', {
                task:     'maia2',
                response: data.response
            });
        }
    };

    // ===== END SCREEN =====
    const endScreen = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="screen-center">
                <h1>Thank you!</h1>
                <p>You have completed all ${totalTrials} videos. Your responses have been saved.</p>
                <p style="font-size:13px; color:#aaa;">Participant ID: ${subjectId}</p>
            </div>
        `,
        choices: ['Close']
    };
    timeline.push(postSurvey);
    timeline.push(endScreen);

    jsPsych.run(timeline);
}