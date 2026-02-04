/**
 * Daggerheart Death Moves
 * Refactored Entry Point - V13 Compatible
 */
import { MODULE_ID, SOCKET_NAME, SOCKET_TYPES } from './constants.js';
import { DeathSettings } from './settings.js';
import { DeathUI } from './ui.js';
import { DeathLogic } from './logic.js';
import { DeathAudioManager } from './audio.js';

class DeathMovesController {
    static init() {
        DeathSettings.register();
        
        // Socket Handler for syncing events between clients
        game.socket.on(SOCKET_NAME, (payload) => {
            switch (payload.type) {
                case SOCKET_TYPES.SHOW_UI: 
                    DeathMovesController._handleShowUI(payload); 
                    break;
                case SOCKET_TYPES.SHOW_SPECTATOR_UI:
                    DeathMovesController._handleSpectatorUI(payload);
                    break;
                case SOCKET_TYPES.REMOVE_SPECTATOR_UI:
                    DeathUI.removeSpectatorOverlay();
                    break;
                case SOCKET_TYPES.SHOW_ANNOUNCEMENT:
                    DeathUI.showAnnouncement(payload.text);
                    break;
                case SOCKET_TYPES.PLAY_MEDIA: 
                    DeathAudioManager.playMedia(payload.mediaKey); 
                    break;
                case SOCKET_TYPES.PLAY_SOUND: 
                    DeathAudioManager.playSound(payload.soundKey); 
                    break;
                case SOCKET_TYPES.SHOW_BORDER: 
                    DeathUI.showBorderEffect(payload.borderType);
                    break;
                case SOCKET_TYPES.REMOVE_BORDER:
                    DeathUI.removeBorderEffect();
                    break;
                case SOCKET_TYPES.UPDATE_COUNTDOWN: 
                    DeathUI.updateCountdown(payload.buttonId, payload.number);
                    break;
                case SOCKET_TYPES.HIDE_UNSELECTED: // Novo: Sincroniza a ocultação
                    DeathUI.hideOthers(payload.buttonId);
                    break;
            }
        });
        
        // Expose API globally
        window.DeathMoves = { trigger: DeathMovesController.gmTriggerFlow };
        
        // Backward compatibility
        window.DeathOptions = { 
            trigger: () => {
                DeathMovesController.gmTriggerFlow();
            }
        };
    }

    // Triggered by GM to select a player
    static async gmTriggerFlow() {
        if (!game.user.isGM) return ui.notifications.warn("Only the GM can trigger this.");
        const users = game.users.filter(u => u.active && !u.isGM);
        if (users.length === 0) return ui.notifications.warn("No players connected.");

        DeathUI.createGMDialog(users, (targetUserId) => {
            // Calculate probabilities for the TARGET actor (Server-Side Logic simulation)
            const targetUser = game.users.get(targetUserId);
            const targetActor = targetUser ? targetUser.character : null;
            const probs = DeathUI.calculateProbabilitiesForActor(targetActor);

            const payload = { 
                targetUserId: targetUserId,
                probs: probs 
            };

            // 1. Emit to the specific Target (Interactive Mode)
            game.socket.emit(SOCKET_NAME, { ...payload, type: SOCKET_TYPES.SHOW_UI });
            
            // 2. Emit to everyone else (Spectator Mode)
            game.socket.emit(SOCKET_NAME, { ...payload, type: SOCKET_TYPES.SHOW_SPECTATOR_UI });
            
            // 3. Show locally for the GM
            DeathMovesController._handleSpectatorUI(payload);
        });
    }

    // Handles displaying the INTERACTIVE UI for the specific target user
    static async _handleShowUI(payload) {
        if (game.user.id !== payload.targetUserId) return;

        const callbacks = {
            onCancel: () => {
                DeathAudioManager.stopCurrentSound();
                game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.REMOVE_SPECTATOR_UI });
            },
            onAvoid: async (btnElement) => {
                // Pass sound key 'soundChatAvoid'
                await DeathMovesController._handleSelectionSequence("Avoid Death", btnElement, 'soundChatAvoid');
                DeathLogic.handleAvoidDeath();
            },
            onBlaze: async (btnElement) => {
                // Pass sound key 'soundChatBlaze'
                await DeathMovesController._handleSelectionSequence("Blaze of Glory", btnElement, 'soundChatBlaze');
                DeathLogic.handleBlazeOfGlory(() => {}); 
            },
            onRisk: async (btnElement) => {
                // Pass sound key 'soundChatRisk'
                await DeathMovesController._handleSelectionSequence("Risk it All", btnElement, 'soundChatRisk');
                
                const doubleRollMode = DeathSettings.get('riskItAllDoubleRoll');
                if (doubleRollMode) {
                    await DeathLogic.handleRiskItAllSequential();
                } else {
                    DeathLogic.handleRiskItAll();
                }
            }
        };

        DeathUI.createOverlay(callbacks, false, payload.probs);
    }

    // Handles displaying the PASSIVE UI for spectators
    static _handleSpectatorUI(payload) {
        if (game.user.id === payload.targetUserId) return;
        DeathUI.createOverlay({}, true, payload.probs);
    }

    // New Flow: Countdown -> Clear UI -> Play Sound -> Announcement -> Delay
    static async _handleSelectionSequence(optionName, btnElement, announcementSoundKey) {
        // 0. Update visuals immediately for everyone (Hide other buttons)
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.HIDE_UNSELECTED, buttonId: btnElement.id });
        
        // 1. Run Countdown FIRST (on the active button)
        await DeathMovesController._runCountdown(btnElement);

        // 2. Remove UI for EVERYONE (Target + Spectators)
        DeathMovesController._cleanup(); 
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.REMOVE_SPECTATOR_UI }); 

        // 3. Play Announcement Sound (Immediately when text appears)
        if (announcementSoundKey) {
            game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_SOUND, soundKey: announcementSoundKey });
            DeathAudioManager.playSound(announcementSoundKey);
        }

        // 4. Show Announcement to EVERYONE
        const announcementPayload = { type: SOCKET_TYPES.SHOW_ANNOUNCEMENT, text: optionName };
        game.socket.emit(SOCKET_NAME, announcementPayload);
        DeathUI.showAnnouncement(optionName); // Show locally

        // 5. Wait 4 Seconds (3s reading + 1s fade buffer)
        await new Promise(resolve => setTimeout(resolve, 4000));
    }

    static _cleanup() {
        document.getElementById('risk-it-all-overlay')?.remove();
    }

    // Handles the visual countdown on the selected button
    static async _runCountdown(buttonElement) {
        DeathAudioManager.stopCurrentSound();
        const duration = DeathSettings.get('countdownDuration');
        if (duration <= 0) return;

        // Get the ID of the button being clicked to synchronize with others
        const btnId = buttonElement.id;

        // Loop: Plays sound every second (tick)
        for (let i = duration; i > 0; i--) {
            // Play sound for everyone on each tick
            game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_SOUND, soundKey: 'soundSuspense' });
            DeathAudioManager.playSound('soundSuspense');

            // Update Local UI
            DeathUI.updateCountdown(buttonElement, i);

            // Update Spectators UI
            game.socket.emit(SOCKET_NAME, { 
                type: SOCKET_TYPES.UPDATE_COUNTDOWN, 
                buttonId: btnId, 
                number: i 
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Hook to add button to Daggerheart Menu (sidebar)
Hooks.on("renderDaggerheartMenu", (app, element, data) => {
    const myButton = document.createElement("button");
    myButton.type = "button";
    myButton.innerHTML = `<i class="fas fa-skull"></i> Trigger Death Move`;
    myButton.classList.add("dh-custom-btn"); 
    myButton.style.marginTop = "10px";
    myButton.style.width = "100%";
    
    myButton.onclick = () => DeathMovesController.gmTriggerFlow();

    const fieldset = element.querySelector("fieldset");
    if (fieldset) {
        const newFieldset = document.createElement("fieldset");
        const legend = document.createElement("legend");
        legend.innerText = "Death Moves";
        newFieldset.appendChild(legend);
        newFieldset.appendChild(myButton);
        fieldset.after(newFieldset);
    } else {
        element.appendChild(myButton);
    }
});

Hooks.once('ready', DeathMovesController.init);