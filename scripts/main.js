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
            trigger: (targetName) => {
                DeathMovesController.gmTriggerFlow(targetName);
            }
        };

        // Check system automation settings on load
        DeathMovesController._checkSystemAutomation();

        // Monitor Actor Updates for Death Condition
        Hooks.on('updateActor', (actor, changes, options, userId) => {
            if (!game.user.isGM) return;
            
            // Check Automation Setting
            const triggerMode = DeathSettings.get('hpAutomationTrigger');
            if (triggerMode === 'none') return;

            if (!actor.hasPlayerOwner) return;

            // Only proceed if HP value was changed
            if (!foundry.utils.hasProperty(changes, "system.resources.hitPoints.value")) return;

            const hp = foundry.utils.getProperty(actor, "system.resources.hitPoints.value");
            const max = foundry.utils.getProperty(actor, "system.resources.hitPoints.max");

            // If both are 0, do nothing
            if (hp === 0 && max === 0) return;

            // If HP reached Max, trigger Death Moves
            if (hp >= max) {
                // Find the appropriate user to target
                const activeOwner = game.users.find(u => !u.isGM && u.active && actor.testUserPermission(u, "OWNER"));
                const targetUser = activeOwner || game.users.find(u => !u.isGM && actor.testUserPermission(u, "OWNER"));
                const targetName = targetUser ? targetUser.name : null;

                if (triggerMode === 'dialog') {
                    DeathMovesController.gmTriggerFlow(targetName, { 
                        showDialog: true, 
                        reason: "Last HP Marked!",
                        characterName: actor.name 
                    });
                } else if (triggerMode === 'auto') {
                    if (targetName) {
                        DeathMovesController.gmTriggerFlow(targetName);
                    }
                }
            }
        });
    }

    // Triggered by GM to select a player
    static async gmTriggerFlow(targetUserName = null, options = {}) {
        if (!game.user.isGM) return ui.notifications.warn("Only the GM can trigger this.");

        const executeTrigger = (targetUserId) => {
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
        };

        if (targetUserName && !options.showDialog) {
            const targetUser = game.users.getName(targetUserName);
            if (!targetUser) return ui.notifications.warn(`Death Moves: User "${targetUserName}" not found.`);
            return executeTrigger(targetUser.id);
        }

        const users = game.users.filter(u => u.active && !u.isGM);
        if (users.length === 0) return ui.notifications.warn("No players connected.");

        let preSelectedUserId = null;
        if (targetUserName) {
            const u = game.users.getName(targetUserName);
            if (u) preSelectedUserId = u.id;
        }

        DeathUI.createGMDialog(users, (targetUserId) => {
            executeTrigger(targetUserId);
        }, preSelectedUserId, options.reason, options.characterName);
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

    /**
     * Checks if "Core" automation is active and disables Daggerheart system defaults if necessary.
     * Runs on initialization to handle default settings or reload.
     */
    static async _checkSystemAutomation() {
        if (!game.user.isGM) return; // Only GM updates settings

        const automationMode = DeathSettings.get('automationMode');
        if (automationMode === 'core') {
            await DeathSettings.disableSystemAutomation();
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