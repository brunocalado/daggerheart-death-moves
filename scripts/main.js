/**
 * Daggerheart Death Moves
 * Refactored Entry Point
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

        DeathUI.createGMDialog(users, (userId) => {
            game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.SHOW_UI, targetUserId: userId });
            ui.notifications.info("Death Moves sent to player.");
        });
    }

    // Handles displaying the UI for the specific target user
    static async _handleShowUI(payload) {
        if (game.user.id !== payload.targetUserId) return;

        const callbacks = {
            onCancel: () => {
                DeathAudioManager.stopCurrentSound();
            },
            onAvoid: async (btnElement) => {
                await DeathMovesController._runCountdown(btnElement);
                DeathLogic.handleAvoidDeath();
                document.getElementById('risk-it-all-overlay')?.remove();
            },
            onBlaze: (btnElement) => {
                DeathLogic.handleBlazeOfGlory(() => document.getElementById('risk-it-all-overlay')?.remove());
            },
            onRisk: async (btnElement) => {
                // Execute countdown regardless of mode
                await DeathMovesController._runCountdown(btnElement);
                
                // Remove UI
                document.getElementById('risk-it-all-overlay')?.remove();

                const doubleRollMode = DeathSettings.get('riskItAllDoubleRoll');
                
                if (doubleRollMode) {
                    await DeathLogic.handleRiskItAllSequential();
                } else {
                    DeathLogic.handleRiskItAll();
                }
            }
        };

        DeathUI.createOverlay(callbacks);
    }

    // Handles the visual countdown on the selected button
    static async _runCountdown(buttonElement) {
        DeathAudioManager.stopCurrentSound();
        const duration = DeathSettings.get('countdownDuration');
        if (duration <= 0) return;

        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_SOUND, soundKey: 'soundSuspense' });
        DeathAudioManager.playSound('soundSuspense');

        for (let i = duration; i > 0; i--) {
            DeathUI.updateCountdown(buttonElement, i);
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