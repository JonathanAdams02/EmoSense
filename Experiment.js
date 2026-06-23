// ===== CONFIGURATION =====
const TEST_MODE   = 0;           // 1 = test mode, 0 = production
const VIDEO_FOLDER = 'https://emosenseworker.jonathanadams02.workers.dev/';
const EMOTIONS    = ['Happy', 'Sad', 'Angry', 'Tired', 'Proud'];
const VIDEO_MAX_MS = 10000;      // maximum video duration before auto-stop

// ===== FIREBASE CONFIG =====
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDr1Q-f5PG4bifxeSMmLlTghjB3jFos3uk",
    authDomain: "emosense-d75d4.firebaseapp.com",
    projectId: "emosense-d75d4",
    storageBucket: "emosense-d75d4.firebasestorage.app",
    messagingSenderId: "206150435854",
    appId: "1:206150435854:web:ecf8da5328a02483f2e85f"
};
const FIREBASE_COLLECTION = 'trials';

// ===== SUBJECT ID =====
const subjectId = Math.floor(1000 + Math.random() * 9000);

// ===== AUTO ZOOM =====
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

// ===== PROGRESS BAR =====
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
    const bar   = document.getElementById('progress-bar');
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
        db._collection      = collection;
        db._addDoc          = addDoc;
        db._serverTimestamp = serverTimestamp;
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

    const shuffledVideos = jsPsych.randomization.shuffle([...videoFiles]);
    const totalTrials    = shuffledVideos.length;

    injectProgressBar();

    // ===== WELCOME =====
    const welcome = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="screen-center">
                <h1>Puppet Emotion Study</h1>
                <p>Thank you for participating in this study.</p>
                <p>
                    You will watch <strong>${totalTrials} short video clips</strong> of puppet characters
                    and answer a few questions about each one.
                    At the end of the video task, there will also be a short questionnaire.
                </p>
                <p>The whole session should take approximately 45–60 minutes.</p>
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
                },
                {
                    type: 'text',
                    name: 'sona_id',
                    prompt: 'What is your SONA ID?',
                    required: true
                }
            ]
        ],
        button_label_finish: 'Continue',
        data: { task: 'demographics', subject_id: subjectId },
        on_finish: function(data) {
            saveToFirebase('demographics', {
                task:            'demographics',
                sona_id:         data.response.sona_id,
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
                <p>
                    In this task you will watch short video clips of puppet characters performing
                    different movements.
                </p>
                <p>
                    <strong>Step 1 — Do you detect an emotional expression?</strong><br>
                    While the video plays, decide whether you can detect an emotional expression
                    in the puppet's movement, or whether it moves in a neutral way.
                    Click <em>Emotional</em> or <em>Neutral</em> as soon as you have made your
                    decision. The video will stop the moment you respond, or automatically after
                    10 seconds if you have not yet responded.
                </p>
                <p>
                    <strong>Step 2 — Which emotion?</strong><br>
                    If you detected an emotional expression, you will then be asked to identify
                    which of the following five emotions the puppet expressed:
                </p>
                <p style="font-size:17px; font-weight:bold; letter-spacing:0.03em;">
                    Happy &nbsp;&middot;&nbsp; Sad &nbsp;&middot;&nbsp; Angry &nbsp;&middot;&nbsp; Tired &nbsp;&middot;&nbsp; Proud
                </p>
                <p>
                    Choose the option that best matches what you saw, even if the expression was
                    subtle or ambiguous. If you chose <em>Neutral</em> in Step 1, no second
                    question will appear.
                </p>
                <p style="color:#555;">
                    After the videos, you will complete a short questionnaire.
                    Please answer all questions as honestly as possible.
                </p>
            </div>
        `,
        choices: ['Begin'],
        button_html: `<div style="position:fixed; bottom:30px; left:50%; transform:translateX(-50%);"><button class="jspsych-btn" style="padding:12px 32px; font-size:16px; font-weight:bold; border-radius:8px; border:none; background:#007bff; color:#fff; box-shadow:0 4px 6px rgba(0,0,0,0.2); cursor:pointer;">Begin</button></div>`
    };

    // ===== PRELOAD =====
    const preload = {
        type: jsPsychPreload,
        video: shuffledVideos.map(f => `${VIDEO_FOLDER}${f}`),
        show_progress_bar: true,
        message: `
            <div class="screen-center">
                <h2>Loading videos...</h2>
                <p>Please wait while the videos are prepared. This may take a moment depending on your connection.</p>
            </div>
        `,
        error_message: '<p>Some videos could not be loaded. The experiment will continue anyway.</p>',
        continue_after_error: true,
        show_detailed_errors: TEST_MODE === 1
    };

    // ===== TIMELINE =====
    const timeline = [];
    timeline.push(welcome);
    timeline.push(demographics);
    timeline.push(preload);
    timeline.push(instructions);

    // ===== TRIALS =====
    shuffledVideos.forEach((filename, index) => {
        const trialNum = index + 1;

        // ----- STAGE 1: Emotional or Neutral? -----
        const stage1 = {
            type: jsPsychHtmlButtonResponse,
            choices: ['Emotional', 'Neutral'],
            stimulus: function() {
                return `
                    ${TEST_MODE ? `<div style="position:fixed;top:60px;right:10px;background:red;color:#fff;padding:8px 14px;font-weight:bold;z-index:10000;border-radius:5px;">TEST MODE</div>` : ''}
                    <div class="trial-wrapper-stage1">
                        ${TEST_MODE ? `<div class="video-trial-label">${filename}</div>` : ''}
                        <div class="video-trial-label">Video ${trialNum} of ${totalTrials}</div>
                        <video id="stim-video-${trialNum}" autoplay loop muted playsinline
                            style="max-height:85vh; max-width:95vw; width:100%; height:auto; display:block; margin:0 auto 40px auto;">
                            <source src="${VIDEO_FOLDER}${filename}" type="video/mp4">
                        </video>
                    </div>
                    ${TEST_MODE ? `<button id="skip-btn-s1-${trialNum}" style="position:fixed;bottom:80px;right:20px;padding:10px 20px;font-size:14px;font-weight:bold;background:#ff9800;color:#fff;border:none;border-radius:6px;cursor:pointer;z-index:9999;">SKIP →</button>` : ''}
                `;
            },

            // Let jsPsych render one button per choice — %choice% is replaced per button
            button_html: '<button class="jspsych-btn stage1-btn" style="padding:14px 40px; font-size:17px; font-weight:bold; border-radius:8px; border:none; background:#007bff; color:#fff; box-shadow:0 4px 6px rgba(0,0,0,0.2); cursor:pointer; margin:0 10px;">%choice%</button>',

            data: {
                task:         'stage1',
                trial_number: trialNum,
                subject_id:   subjectId,
                video:        filename
            },

            on_load: function() {
                updateProgress(index, totalTrials);

                const autoTimer = setTimeout(() => {
                    const vid = document.getElementById(`stim-video-${trialNum}`);
                    if (vid) { vid.pause(); vid.src = ''; }
                    setTimeout(() => {
                        jsPsych.finishTrial({ response: null });
                    }, 1500);
                }, VIDEO_MAX_MS);
                window[`_autoTimer_${trialNum}`] = autoTimer;

                if (TEST_MODE) {
                    const skipBtn = document.getElementById(`skip-btn-s1-${trialNum}`);
                    if (skipBtn) {
                        skipBtn.addEventListener('click', () => {
                            clearTimeout(window[`_autoTimer_${trialNum}`]);
                            jsPsych.finishTrial({ response: 0, skipped: true });
                        });
                    }
                }
            },

            on_finish: function(data) {
                clearTimeout(window[`_autoTimer_${trialNum}`]);

                const video = document.getElementById(`stim-video-${trialNum}`);
                if (video) { video.pause(); video.src = ''; }

                // response: 0 = Emotional, 1 = Neutral, null = timeout
                data.stage1_response = (data.response === 0) ? 'emotional'
                                     : (data.response === 1) ? 'neutral'
                                     : 'timeout';
                data.stage1_rt_ms = data.rt;

                window[`_stage1_${trialNum}`]    = data.stage1_response;
                window[`_stage1_rt_${trialNum}`] = data.stage1_rt_ms;
            }
        };

        // ----- STAGE 2: Which emotion? -----
        // FIX: use %choice% so jsPsych renders one button per choice and maps
        // data.response correctly (0=Happy, 1=Sad, 2=Angry, 3=Tired, 4=Proud).
        // Positioning is handled via CSS on #jspsych-html-button-response-btngroup.
        const stage2 = {
            timeline: [
                {
                    type: jsPsychHtmlButtonResponse,
                    choices: EMOTIONS,

                    stimulus: `
                        <div class="screen-center" style="height:auto; padding-top:80px;">
                            <div class="question-label" style="font-size:20px; margin-bottom:28px;">
                                Which emotion did the puppet express?
                            </div>
                        </div>
                    `,

                    // One button per choice — jsPsych replaces %choice% individually,
                    // so data.response = index of the clicked button (0–4).
                    button_html: '<button class="jspsych-btn emotion-afc-btn" style="padding:14px 30px; font-size:16px; font-weight:bold; border-radius:8px; border:none; background:#007bff; color:#fff; box-shadow:0 4px 6px rgba(0,0,0,0.2); cursor:pointer; margin:6px;">%choice%</button>',

                    data: {
                        task:         'stage2',
                        trial_number: trialNum,
                        subject_id:   subjectId,
                        video:        filename
                    },

                    on_finish: async function(data) {
                        // data.response is now the correct index (0=Happy … 4=Proud)
                        const emotionChosen = EMOTIONS[data.response];
                        data.stage2_emotion = emotionChosen;

                        await saveToFirebase(FIREBASE_COLLECTION, {
                            trial:           trialNum,
                            video:           filename,
                            stage1_response: window[`_stage1_${trialNum}`],
                            stage1_rt_ms:    window[`_stage1_rt_${trialNum}`],
                            stage2_emotion:  emotionChosen,
                            stage2_rt_ms:    data.rt
                        });
                    }
                }
            ],
            conditional_function: function() {
                return window[`_stage1_${trialNum}`] === 'emotional';
            }
        };

        // ----- NEUTRAL / TIMEOUT SAVE -----
        const neutralSave = {
            timeline: [
                {
                    type: jsPsychHtmlButtonResponse,
                    stimulus: '',
                    choices: [],
                    trial_duration: 0,
                    on_finish: async function() {
                        await saveToFirebase(FIREBASE_COLLECTION, {
                            trial:           trialNum,
                            video:           filename,
                            stage1_response: window[`_stage1_${trialNum}`],
                            stage1_rt_ms:    window[`_stage1_rt_${trialNum}`],
                            stage2_emotion:  null,
                            stage2_rt_ms:    null
                        });
                    }
                }
            ],
            conditional_function: function() {
                const s1 = window[`_stage1_${trialNum}`];
                return s1 === 'neutral' || s1 === 'timeout';
            }
        };

        timeline.push(stage1);
        timeline.push(stage2);
        timeline.push(neutralSave);
    });

    // ===== TRANSITION TO QUESTIONNAIRE =====
    const transitionScreen = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="screen-center">
                <h1>Well done!</h1>
                <p>You have finished rating all ${totalTrials} video clips.</p>
                <p>
                    There is now a short questionnaire. Please read each statement carefully
                    and answer as honestly as you can.
                </p>
                <p>Click <strong>Continue</strong> when you are ready.</p>
            </div>
        `,
        choices: ['Continue'],
        button_html: `<div style="position:fixed; bottom:30px; left:50%; transform:translateX(-50%);"><button class="jspsych-btn" style="padding:12px 32px; font-size:16px; font-weight:bold; border-radius:8px; border:none; background:#007bff; color:#fff; box-shadow:0 4px 6px rgba(0,0,0,0.2); cursor:pointer;">Continue</button></div>`
    };

    // ===== MAIA-2 SURVEY =====
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
                <p>You have completed the study. Your responses have been saved. You can now close this window.</p>
                <p style="font-size:13px; color:#aaa;">Participant ID: ${subjectId}</p>
            </div>
        `,
        choices: []
    };

    timeline.push(transitionScreen);
    timeline.push(postSurvey);
    timeline.push(endScreen);

    jsPsych.run(timeline);
}