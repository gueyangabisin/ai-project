/**
 * Smart Fan Control System
 * Includes Fuzzy Logic (Mamdani) Engine
 */

// --- Constants & Config ---
const MIN_TEMP = 15;
const MAX_TEMP = 40;

// Access DOM Elements
const dom = {
    // Toggles & Inputs
    modeSwitch: document.getElementById('modeSwitch'),
    currentModeLabel: document.getElementById('currentMode'),
    tempSlider: document.getElementById('tempInput'),
    tempDisplay: document.getElementById('tempDisplay'),
    humSlider: document.getElementById('humInput'),
    humDisplay: document.getElementById('humDisplay'),
    manualSpeedSlider: document.getElementById('manualSpeedInput'),
    manualSpeedDisplay: document.getElementById('manualSpeedDisplay'),
    manualControlGroup: document.getElementById('manualControlGroup'),

    // Fan Visuals
    fanBlades: document.getElementById('fanBlades'),
    speedValue: document.getElementById('speedValue'),
    speedCategory: document.getElementById('speedCategory'),

    // Fuzzy Visuals
    // Temp
    uDingin: document.getElementById('uDingin'),
    uNormal: document.getElementById('uNormal'),
    uPanas: document.getElementById('uPanas'),
    barDingin: document.getElementById('barDingin'),
    barNormal: document.getElementById('barNormal'),
    barPanas: document.getElementById('barPanas'),
    // Hum
    uKering: document.getElementById('uKering'),
    uLembapNormal: document.getElementById('uLembapNormal'),
    uBasah: document.getElementById('uBasah'),
    barKering: document.getElementById('barKering'),
    barLembapNormal: document.getElementById('barLembapNormal'),
    barBasah: document.getElementById('barBasah'),

    activeRulesList: document.getElementById('activeRulesList'),
    fuzzyOutput: document.getElementById('fuzzyOutput')
};

// State
let state = {
    isAuto: true,
    temp: 27,
    hum: 50,
    manualSpeed: 0,
    fuzzySpeed: 0,
    currentSpeed: 0 // Effective speed sent to fan
};

// --- Fuzzy Logic Engine ---

// FuzzyLogic class has been moved to fuzzy.js

const fuzzyEngine = new FuzzyMamdani();

// --- UI Updates ---

function updateFanVisuals(speedPercent) {
    // 1. Update text
    dom.speedValue.innerText = `${Math.round(speedPercent)}%`;

    let cat = "Mati";
    if (speedPercent > 0 && speedPercent <= 30) cat = "Lambat";
    else if (speedPercent > 30 && speedPercent <= 70) cat = "Sedang";
    else if (speedPercent > 70) cat = "Cepat";

    dom.speedCategory.innerText = cat;

    // 2. Update CSS Animation
    // We adjust animation-duration based on speed.
    // 0% -> No animation
    // 100% -> 0.2s duration

    const fan = dom.fanBlades;

    if (speedPercent <= 1) {
        fan.style.animation = 'none';
        // Keep the rotation where it was or reset? Resetting is simpler for this demo.
    } else {
        // Calculate duration: 100% = 0.2s, 1% = 2s (example map)
        // Let's say max speed is 0.2s, min speed is 3s
        // Speed 100 -> 0.2
        // Speed 0 -> Infinity

        const minDur = 0.2;
        const maxDur = 2.0;

        // Invert speed: higher speed = lower duration
        const factor = (100 - speedPercent) / 100; // 0 at max speed, 1 at 0 speed
        const duration = minDur + (factor * (maxDur - minDur));

        fan.style.animation = `spin ${duration}s linear infinite`;
    }
}

function updateFuzzyVisuals(result) {
    // 1. Membership Bars
    // Temp (Now using result.fuzzified.t)
    dom.uDingin.innerText = result.fuzzified.t.cold.toFixed(2);
    dom.barDingin.style.width = `${result.fuzzified.t.cold * 100}%`;

    dom.uNormal.innerText = result.fuzzified.t.norm.toFixed(2);
    dom.barNormal.style.width = `${result.fuzzified.t.norm * 100}%`;

    dom.uPanas.innerText = result.fuzzified.t.hot.toFixed(2);
    dom.barPanas.style.width = `${result.fuzzified.t.hot * 100}%`;

    // Humidity (Now using result.fuzzified.h)
    dom.uKering.innerText = result.fuzzified.h.dry.toFixed(2);
    dom.barKering.style.width = `${result.fuzzified.h.dry * 100}%`;
    dom.uLembapNormal.innerText = result.fuzzified.h.norm.toFixed(2);
    dom.barLembapNormal.style.width = `${result.fuzzified.h.norm * 100}%`;
    dom.uBasah.innerText = result.fuzzified.h.wet.toFixed(2);
    dom.barBasah.style.width = `${result.fuzzified.h.wet * 100}%`;

    // 2. Inference Results (Alpha values)
    // We display the aggregated rule strength for each output category
    dom.activeRulesList.innerHTML = '';

    const rules = [
        { name: "Output Lambat", strength: result.alpha.aLambat },
        { name: "Output Sedang", strength: result.alpha.aSedang },
        { name: "Output Cepat", strength: result.alpha.aCepat }
    ];

    let hasActive = false;
    rules.forEach(r => {
        if (r.strength > 0) {
            hasActive = true;
            const li = document.createElement('li');
            li.className = 'rule-item active-rule';
            li.innerText = `${r.name} (Strength: ${r.strength.toFixed(2)})`;
            li.style.opacity = 0.5 + (r.strength * 0.5);
            dom.activeRulesList.appendChild(li);
        }
    });

    if (!hasActive) {
        dom.activeRulesList.innerHTML = '<li class="rule-item inactive">Menunggu input...</li>';
    }

    // 3. Output
    dom.fuzzyOutput.innerText = Math.round(result.output);
}

function loop() {
    // Determine target speed based on mode
    if (state.isAuto) {
        // Run Fuzzy Logic
        const result = fuzzyEngine.compute(state.temp, state.hum);
        state.fuzzySpeed = result.output;
        state.currentSpeed = state.fuzzySpeed;

        // Update Fuzzy UI
        updateFuzzyVisuals(result);

    } else {
        // Manual Mode
        state.currentSpeed = state.manualSpeed;

        // Clear Fuzzy Visuals (optional, or show "Bypassed")
        // Keeping them showing the "potential" fuzzy value is also nice for comparison,
        // but let's gray them out or stop updating them? 
        // For educational purpose, let's keep calculating fuzzy in background but not using it.
        const result = fuzzyEngine.compute(state.temp, state.hum);
        updateFuzzyVisuals(result); // Show what WOULD happen
    }

    // Update Fan UI
    updateFanVisuals(state.currentSpeed);
}

// --- Event Listeners ---

dom.tempSlider.addEventListener('input', (e) => {
    state.temp = parseFloat(e.target.value);
    dom.tempDisplay.innerText = `${state.temp}°C`;
    loop();
});

dom.humSlider.addEventListener('input', (e) => {
    state.hum = parseFloat(e.target.value);
    dom.humDisplay.innerText = `${state.hum}%`;
    loop();
});

dom.manualSpeedSlider.addEventListener('input', (e) => {
    state.manualSpeed = parseFloat(e.target.value);
    dom.manualSpeedDisplay.innerText = `${state.manualSpeed}%`;
    loop();
});

dom.modeSwitch.addEventListener('change', (e) => {
    state.isAuto = e.target.checked;

    if (state.isAuto) {
        dom.currentModeLabel.innerText = "AUTO (Fuzzy)";
        dom.manualControlGroup.style.opacity = "0.5";
        dom.manualControlGroup.style.pointerEvents = "none";
        dom.manualSpeedSlider.disabled = true;
    } else {
        dom.currentModeLabel.innerText = "MANUAL";
        dom.manualControlGroup.style.opacity = "1";
        dom.manualControlGroup.style.pointerEvents = "all";
        dom.manualSpeedSlider.disabled = false;
    }
    loop();
});

// Init
loop();
