/**
 * Daggerheart Death Moves
 * Features: 3 Death Options, Synchronized Countdown, Split Avoid Images, Correct Rules.
 */

const MODULE_ID = 'daggerheart-death-moves';
const SOCKET_NAME = `module.${MODULE_ID}`;

class DeathMoves {
    static currentRequestSound = null;

    static init() {
        console.log("Daggerheart Death Moves | Initializing");
        DeathMoves._registerSettings();
        game.socket.on(SOCKET_NAME, (payload) => {
            switch (payload.type) {
                case 'SHOW_UI': DeathMoves._handleShowUI(payload); break;
                case 'PLAY_MEDIA': DeathMoves._playMedia(payload.mediaKey); break;
                case 'PLAY_SOUND': DeathMoves._playSound(payload.soundKey); break;
            }
        });
        
        // Expose API globally as DeathMoves
        window.DeathMoves = { trigger: DeathMoves.gmTriggerFlow };
        
        // Backward compatibility / Alias
        window.DeathOptions = { 
            trigger: () => {
                console.warn("DeathOptions.trigger() is deprecated. Please use DeathMoves.trigger() instead.");
                DeathMoves.gmTriggerFlow();
            }
        };
    }

    static _registerSettings() {
        const imagePicker = { type: String, scope: 'world', config: true, filePicker: 'image' };
        const audioPicker = { type: String, scope: 'world', config: true, filePicker: 'audio' };

        // --- CONFIGURATION ---
        game.settings.register(MODULE_ID, 'countdownDuration', {
            name: "DEATH_OPTIONS.Settings.Duration.Name",
            hint: "DEATH_OPTIONS.Settings.Duration.Hint",
            scope: 'world',
            config: true,
            type: Number,
            range: {
                min: 0,
                max: 10,
                step: 1
            },
            default: 6
        });

        game.settings.register(MODULE_ID, 'blazeChatMessage', {
            name: "DEATH_OPTIONS.Settings.BlazeMessage.Name",
            hint: "DEATH_OPTIONS.Settings.BlazeMessage.Hint",
            scope: 'world',
            config: true,
            type: String,
            default: "A hero falls, but their legend rises..."
        });

        // --- IMAGES ---
        game.settings.register(MODULE_ID, 'backgroundPath', { 
            name: "DEATH_OPTIONS.Settings.Background.Name", 
            hint: "DEATH_OPTIONS.Settings.Background.Hint", 
            ...imagePicker, 
            default: `modules/${MODULE_ID}/assets/images/roll-screen.webp` 
        });

        game.settings.register(MODULE_ID, 'blazePath', { 
            name: "DEATH_OPTIONS.Settings.Blaze.Name", 
            hint: "DEATH_OPTIONS.Settings.Blaze.Hint", 
            ...imagePicker, 
            default: `modules/${MODULE_ID}/assets/images/blaze.webp` 
        });

        // Split Avoid Death Images
        game.settings.register(MODULE_ID, 'avoidScarPath', { 
            name: "DEATH_OPTIONS.Settings.AvoidScar.Name", 
            hint: "DEATH_OPTIONS.Settings.AvoidScar.Hint", 
            ...imagePicker, 
            default: `modules/${MODULE_ID}/assets/images/avoid_scar.webp` 
        });

        game.settings.register(MODULE_ID, 'avoidSafePath', { 
            name: "DEATH_OPTIONS.Settings.AvoidSafe.Name", 
            hint: "DEATH_OPTIONS.Settings.AvoidSafe.Hint", 
            ...imagePicker, 
            default: `modules/${MODULE_ID}/assets/images/avoid_safe.webp` 
        });

        game.settings.register(MODULE_ID, 'hopePath', { 
            name: "DEATH_OPTIONS.Settings.Hope.Name", 
            hint: "DEATH_OPTIONS.Settings.Hope.Hint", 
            ...imagePicker, 
            default: `modules/${MODULE_ID}/assets/images/hope.webp` 
        });

        game.settings.register(MODULE_ID, 'fearPath', { 
            name: "DEATH_OPTIONS.Settings.Fear.Name", 
            hint: "DEATH_OPTIONS.Settings.Fear.Hint", 
            ...imagePicker, 
            default: `modules/${MODULE_ID}/assets/images/fear.webp` 
        });

        game.settings.register(MODULE_ID, 'criticalPath', { 
            name: "DEATH_OPTIONS.Settings.Critical.Name", 
            hint: "DEATH_OPTIONS.Settings.Critical.Hint", 
            ...imagePicker, 
            default: `modules/${MODULE_ID}/assets/images/critical.webp` 
        });

        // --- AUDIO ---
        game.settings.register(MODULE_ID, 'soundSuspense', { 
            name: "DEATH_OPTIONS.Settings.SoundSuspense.Name", 
            hint: "DEATH_OPTIONS.Settings.SoundSuspense.Hint", 
            ...audioPicker, 
            default: `modules/${MODULE_ID}/assets/audio/countdown.mp3` 
        });

        game.settings.register(MODULE_ID, 'soundBlaze', { 
            name: "DEATH_OPTIONS.Settings.SoundBlaze.Name", 
            hint: "DEATH_OPTIONS.Settings.SoundBlaze.Hint", 
            ...audioPicker, 
            default: `modules/${MODULE_ID}/assets/audio/blaze.mp3` 
        });

        // New Sounds for Avoid Death outcomes
        game.settings.register(MODULE_ID, 'soundAvoidSafe', { 
            name: "DEATH_OPTIONS.Settings.SoundAvoidSafe.Name", 
            hint: "DEATH_OPTIONS.Settings.SoundAvoidSafe.Hint", 
            ...audioPicker, 
            default: `modules/${MODULE_ID}/assets/audio/avoid_safe.mp3` 
        });

        game.settings.register(MODULE_ID, 'soundAvoidScar', { 
            name: "DEATH_OPTIONS.Settings.SoundAvoidScar.Name", 
            hint: "DEATH_OPTIONS.Settings.SoundAvoidScar.Hint", 
            ...audioPicker, 
            default: `modules/${MODULE_ID}/assets/audio/avoid_scar.mp3` 
        });

        game.settings.register(MODULE_ID, 'soundHope', { 
            name: "DEATH_OPTIONS.Settings.SoundHope.Name",
            hint: "DEATH_OPTIONS.Settings.SoundHope.Hint",
            ...audioPicker, 
            default: `modules/${MODULE_ID}/assets/audio/hope.mp3` 
        });

        game.settings.register(MODULE_ID, 'soundFear', { 
            name: "DEATH_OPTIONS.Settings.SoundFear.Name", 
            hint: "DEATH_OPTIONS.Settings.SoundFear.Hint",
            ...audioPicker, 
            default: `modules/${MODULE_ID}/assets/audio/fear.mp3` 
        });

        game.settings.register(MODULE_ID, 'soundCritical', { 
            name: "DEATH_OPTIONS.Settings.SoundCritical.Name", 
            hint: "DEATH_OPTIONS.Settings.SoundCritical.Hint",
            ...audioPicker, 
            default: `modules/${MODULE_ID}/assets/audio/critical.mp3` 
        });
    }

    static async gmTriggerFlow() {
        if (!game.user.isGM) return ui.notifications.warn("Only the GM can trigger this.");
        const users = game.users.filter(u => u.active && !u.isGM);
        if (users.length === 0) return ui.notifications.warn("No players connected.");

        const content = `
            <div class="form-group">
                <label>Select Player:</label>
                <select id="death-player-select" style="width: 100%">
                    ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                </select>
            </div>
        `;

        new Dialog({
            title: "Trigger Death Moves", content: content, buttons: {
                trigger: { label: "Trigger", icon: `<i class="fas fa-skull"></i>`, callback: (html) => {
                    const userId = html.find('#death-player-select').val();
                    game.socket.emit(SOCKET_NAME, { type: 'SHOW_UI', targetUserId: userId });
                    ui.notifications.info("Death Moves sent to player.");
                }}
            }
        }).render(true);
    }

    static async _handleShowUI(payload) {
        if (game.user.id !== payload.targetUserId) return;

        const bgPath = game.settings.get(MODULE_ID, 'backgroundPath');

        const overlay = document.createElement('div');
        overlay.id = 'risk-it-all-overlay';
        if (bgPath) overlay.style.backgroundImage = `url('${bgPath}')`;

        // 1. Selection Screen
        overlay.innerHTML = `
            <button class="roll-close-btn" id="risk-cancel-btn"><i class="fas fa-times"></i> Close</button>
            <div class="risk-content-wrapper">
                <h1 class="risk-title" id="main-title">CHOOSE YOUR FATE</h1>
                
                <!-- 3 Choices Menu -->
                <div class="death-options-container" id="death-options-menu">
                    <div class="option-btn btn-avoid" id="btn-avoid">
                        <div class="btn-content">
                            <h2>Avoid Death</h2>
                            <p>Roll a Die vs Level</p>
                        </div>
                    </div>
                    <div class="option-btn btn-blaze" id="btn-blaze">
                        <div class="btn-content">
                            <h2>Blaze of Glory</h2>
                            <p>Go out with a bang!</p>
                        </div>
                    </div>
                    <div class="option-btn btn-risk" id="btn-risk">
                        <div class="btn-content">
                            <h2>Risk it All</h2>
                            <p>Death or Legend</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // --- Helper to Hide Unselected Buttons ---
        const hideOthers = (selectedId) => {
            const buttons = document.querySelectorAll('.option-btn');
            buttons.forEach(btn => {
                if (btn.id !== selectedId) {
                    btn.classList.add('hidden-btn'); // CSS class to fade out/hide
                } else {
                    btn.style.pointerEvents = 'none'; // Disable clicking selected one again
                }
            });
            document.getElementById('risk-cancel-btn').remove(); // Remove close button to force choice
        };

        // --- Event Listeners ---

        document.getElementById('risk-cancel-btn').onclick = () => { 
            DeathMoves._stopCurrentSound();
            overlay.remove(); 
        };

        // Option 1: Avoid Death
        const btnAvoid = document.getElementById('btn-avoid');
        btnAvoid.onclick = async () => {
            hideOthers('btn-avoid');
            await DeathMoves._runCountdown(btnAvoid);
            overlay.remove();
            await DeathMoves._handleAvoidDeath();
        };

        // Option 2: Blaze of Glory
        const btnBlaze = document.getElementById('btn-blaze');
        btnBlaze.onclick = () => {
            hideOthers('btn-blaze');
            // Play Sound
            game.socket.emit(SOCKET_NAME, { type: 'PLAY_SOUND', soundKey: 'soundBlaze' });
            DeathMoves._playSound('soundBlaze');
            
            // Get Custom Message
            const blazeMsg = game.settings.get(MODULE_ID, 'blazeChatMessage');

            // Post Chat Message
            ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ alias: "Death Moves" }),
                content: `
                    <div style="text-align: center; border: 2px solid #ff4500; padding: 10px; background: rgba(0,0,0,0.5);">
                        <h2 style="color: #ff4500; border-bottom: 1px solid #555; padding-bottom: 5px;">BLAZE OF GLORY!</h2>
                        <p style="color: #eee;">${blazeMsg}</p>
                    </div>
                `,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER
            });

            // Show Image
            overlay.remove();
            const blazeKey = 'blazePath';
            game.socket.emit(SOCKET_NAME, { type: 'PLAY_MEDIA', mediaKey: blazeKey });
            DeathMoves._playMedia(blazeKey);
        };

        // Option 3: Risk it All
        const btnRisk = document.getElementById('btn-risk');
        btnRisk.onclick = async () => {
            hideOthers('btn-risk');
            await DeathMoves._runCountdown(btnRisk);
            overlay.remove();
            await DeathMoves._orchestrateSequence();
        };
    }

    /**
     * Handles the audio and visual countdown on a specific button element.
     */
    static async _runCountdown(buttonElement) {
        DeathMoves._stopCurrentSound();
        const duration = game.settings.get(MODULE_ID, 'countdownDuration');

        // If configured to 0, skip countdown completely (instant execution)
        if (duration <= 0) return;

        const contentContainer = buttonElement.querySelector('.btn-content');
        
        game.socket.emit(SOCKET_NAME, { type: 'PLAY_SOUND', soundKey: 'soundSuspense' });
        DeathMoves._playSound('soundSuspense');

        for (let i = duration; i > 0; i--) {
            if (contentContainer) {
                contentContainer.innerHTML = `<h2 style="font-size: 6rem; margin:0; line-height: 250px; color: white; text-shadow: 0 0 20px black;">${i}</h2>`;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    static _stopCurrentSound() {
        if (DeathMoves.currentRequestSound && typeof DeathMoves.currentRequestSound.stop === 'function') {
            DeathMoves.currentRequestSound.stop();
        }
        DeathMoves.currentRequestSound = null;
    }

    // --- Logic for Avoid Death ---
    static async _handleAvoidDeath() {
        const roll = new Roll('1d12');
        await roll.evaluate();

        if (roll.terms[0]) {
            roll.terms[0].options.appearance = { colorset: "custom", foreground: "#000000", background: "#FFD700", outline: "#000000", texture: "none" };
        }

        if (game.dice3d) {
            try { await game.dice3d.showForRoll(roll, game.user, true); } catch (e) { console.error("DeathOptions | DSN Error:", e); }
        }

        const rollTotal = roll.total;
        const actor = game.user.character;
        let message = "";
        let flavor = "";

        // If actor exists, calculate result
        if (actor) {
            const level = foundry.utils.getProperty(actor, "system.levelData.level.current") || 0;
            let resultKey = "";
            let soundKey = "";

            if (rollTotal <= level) {
                // FAILED: SCAR
                flavor = `<span style="color: #ff4500; font-weight:bold;">Avoid Death Result: SCAR</span>`;
                message = "You got a Scar!";
                resultKey = 'avoidScarPath';
                soundKey = 'soundAvoidScar';
            } else {
                // SUCCESS: SAFE
                flavor = `<span style="color: #4CAF50; font-weight:bold;">Avoid Death Result: SAFE</span>`;
                message = "You can rest for now.";
                resultKey = 'avoidSafePath';
                soundKey = 'soundAvoidSafe';
            }
            message += `<br><span style="font-size: 0.8em; color: #aaa;">(Roll: ${rollTotal} vs Level: ${level})</span>`;

            // Play the appropriate image
            game.socket.emit(SOCKET_NAME, { type: 'PLAY_MEDIA', mediaKey: resultKey });
            DeathMoves._playMedia(resultKey);

            // Play the appropriate sound
            game.socket.emit(SOCKET_NAME, { type: 'PLAY_SOUND', soundKey: soundKey });
            DeathMoves._playSound(soundKey);

        } else {
            flavor = "Avoid Death Roll";
            message = `Rolled: ${rollTotal} (No actor assigned)`;
        }

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: "Death Moves" }),
            flavor: flavor,
            content: `<div style="text-align: center; font-size: 1.2em; padding: 10px;">${message}</div>`,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        });
    }

    // --- Logic for Risk it All Sequence ---
    static async _orchestrateSequence() {
        const roll = new Roll('1d12 + 1d12');
        await roll.evaluate();

        if (roll.terms[0]) {
            roll.terms[0].options.appearance = { colorset: "custom", foreground: "#000000", background: "#FFD700", outline: "#000000", texture: "none" };
        }
        if (roll.terms[2]) {
            roll.terms[2].options.appearance = { colorset: "custom", foreground: "#FFFFFF", background: "#2c003e", outline: "#000000", texture: "none" };
        }

        const hopeVal = roll.terms[0].total;
        const fearVal = roll.terms[2].total;

        if (game.dice3d) {
            try { await game.dice3d.showForRoll(roll, game.user, true); } catch (e) { console.error("DeathOptions | DSN Error:", e); }
        }

        let resultKey = 'hopePath';
        let messageText = "";

        // RULES TEXT CORRECTED
        if (hopeVal > fearVal) {
            resultKey = 'hopePath';
            messageText = `
                <div style="font-weight: bold; margin-bottom: 5px; color: #FFD700;">HOPE TRIUMPHS!</div>
                <div>You stand, clearing Hit Points and/or Stress equal to the Hope Die value.</div>
            `;
        } else if (fearVal > hopeVal) {
            resultKey = 'fearPath';
            messageText = `
                <div style="font-weight: bold; margin-bottom: 5px; color: #da70d6;">FEAR TAKES HOLD...</div>
                <div>You died!</div>
            `;
        } else {
            resultKey = 'criticalPath';
            messageText = `
                <div style="font-weight: bold; margin-bottom: 5px; color: #00ff00;">CRITICAL SUCCESS!</div>
                <div>You stand and clear all Hit Points and Stress.</div>
            `;
        }

        game.socket.emit(SOCKET_NAME, { type: 'PLAY_MEDIA', mediaKey: resultKey });
        DeathMoves._playMedia(resultKey); 

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: "Risk It All" }),
            content: `
                <div style="text-align: center; font-size: 1.1em; color: #f0f0f0;">
                    <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 8px; font-weight: bold;">
                        <span style="color: #FFD700; text-shadow: 1px 1px 2px black;">Hope: ${hopeVal}</span>
                        <span style="color: #da70d6; text-shadow: 1px 1px 2px black;">Fear: ${fearVal}</span>
                    </div>
                    <div style="border-top: 1px solid #777; padding-top: 10px;">${messageText}</div>
                </div>
            `,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        });
    }

    static _playSound(settingKey) {
        const soundSrc = game.settings.get(MODULE_ID, settingKey);
        if (soundSrc) AudioHelper.play({src: soundSrc, volume: 1.0, autoplay: true, loop: false}, false);
    }

    static _playMedia(settingKey) {
        return new Promise((resolve) => {
            const src = game.settings.get(MODULE_ID, settingKey);
            let soundSetting = "";
            if (settingKey === 'hopePath') soundSetting = 'soundHope';
            if (settingKey === 'fearPath') soundSetting = 'soundFear';
            if (settingKey === 'criticalPath') soundSetting = 'soundCritical';
            
            if (soundSetting) DeathMoves._playSound(soundSetting);

            if (!src) { resolve(); return; }

            const container = document.createElement('div');
            container.id = 'risk-it-all-media-container';

            let autoCloseTimer = null;
            const finish = () => {
                if(autoCloseTimer) clearTimeout(autoCloseTimer);
                if(container.parentNode) container.remove();
                resolve();
            };

            const closeBtn = document.createElement('button');
            closeBtn.className = 'media-skip-btn';
            closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
            closeBtn.onclick = (e) => { e.stopPropagation(); finish(); };
            container.appendChild(closeBtn);

            const img = document.createElement('img');
            img.src = src;
            container.appendChild(img);
            
            const duration = 5000;
            autoCloseTimer = setTimeout(finish, duration);
            document.body.appendChild(container);
        });
    }
}

// Hook to add button to Daggerheart Menu
Hooks.on("renderDaggerheartMenu", (app, element, data) => {
    
    // 1. Create the button
    const myButton = document.createElement("button");
    myButton.type = "button";
    myButton.innerHTML = `<i class="fas fa-skull"></i> Trigger Death Move`;
    myButton.classList.add("dh-custom-btn"); 
    
    // Add inline style to ensure visibility/separation
    myButton.style.marginTop = "10px";
    myButton.style.width = "100%";

    // 2. Define click action - FIX: Calling class method directly
    myButton.onclick = () => {
        DeathMoves.gmTriggerFlow(); 
    };

    // 3. Find where to insert
    const fieldset = element.querySelector("fieldset");
    
    if (fieldset) {
        // Create new fieldset for styling consistency
        const newFieldset = document.createElement("fieldset");
        const legend = document.createElement("legend");
        legend.innerText = "Death Moves";
        
        newFieldset.appendChild(legend);
        newFieldset.appendChild(myButton);
        
        // Insert after original fieldset
        fieldset.after(newFieldset);
    } else {
        // Fallback
        element.appendChild(myButton);
    }
});

Hooks.once('ready', DeathMoves.init);