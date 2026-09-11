/*!
 * Daggerheart: Death Moves
 * Copyright (c) 2025 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { DEATH_MOVES, SOCKET_NAME, SOCKET_TYPES, TEMPLATES } from './constants.js';
import { DeathSettings } from './settings.js';
import { DeathUI } from './ui.js';
import { DeathLogic } from './logic.js';
import { renderElement } from './helpers.js';

/**
 * Entry point: settings, sockets, the GM trigger queue, and the death move flow.
 */
class DeathMovesController {
    static _deathMoveQueue = [];
    static _isProcessing = false;

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
                case SOCKET_TYPES.SHOW_BORDER:
                    DeathUI.showBorderEffect(payload.borderType);
                    break;
                case SOCKET_TYPES.REMOVE_BORDER:
                    DeathUI.removeBorderEffect();
                    break;
                case SOCKET_TYPES.HIDE_UNSELECTED:
                    DeathUI.hideOthers(payload.optionKey);
                    break;
                case SOCKET_TYPES.FLOW_COMPLETE:
                    DeathMovesController._onFlowComplete();
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
                        reason: game.i18n.localize("DEATH_OPTIONS.Dialog.Trigger.LastHp"),
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

    /**
     * Triggered by GM to select a player — enqueues and processes sequentially.
     * @param {string|null} targetUserName - Name of the target user.
     * @param {Object} options - Additional options (showDialog, reason, characterName).
     */
    static gmTriggerFlow(targetUserName = null, options = {}) {
        if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("DEATH_OPTIONS.Notifications.GmOnly"));

        DeathMovesController._deathMoveQueue.push({ targetUserName, options });

        if (DeathMovesController._isProcessing) {
            ui.notifications.info(game.i18n.format("DEATH_OPTIONS.Notifications.Queued", {
                target: options.characterName || targetUserName || game.i18n.localize("DEATH_OPTIONS.Notifications.UnknownTarget"),
                pending: DeathMovesController._deathMoveQueue.length
            }));
            return;
        }

        DeathMovesController._processQueue();
    }

    /**
     * Processes the death move queue one at a time.
     */
    static async _processQueue() {
        if (DeathMovesController._isProcessing) return;
        if (DeathMovesController._deathMoveQueue.length === 0) return;

        DeathMovesController._isProcessing = true;
        const { targetUserName, options } = DeathMovesController._deathMoveQueue.shift();

        try {
            await DeathMovesController._runFlow(targetUserName, options);
        } finally {
            DeathMovesController._isProcessing = false;
            if (DeathMovesController._deathMoveQueue.length > 0) {
                DeathMovesController._processQueue();
            }
        }
    }

    // Resolver for the current flow — set when waiting for FLOW_COMPLETE
    static _flowCompleteResolver = null;

    /**
     * Called when a FLOW_COMPLETE socket is received on the GM.
     */
    static _onFlowComplete() {
        if (!game.user.isGM) return;
        if (DeathMovesController._flowCompleteResolver) {
            DeathMovesController._flowCompleteResolver();
            DeathMovesController._flowCompleteResolver = null;
        }
    }

    /**
     * Waits for the player to finish the death move flow (or timeout after 5 min).
     * @returns {Promise<void>}
     */
    static _waitForFlowComplete() {
        return new Promise((resolve) => {
            DeathMovesController._flowCompleteResolver = resolve;
            setTimeout(() => {
                if (DeathMovesController._flowCompleteResolver) {
                    DeathMovesController._flowCompleteResolver();
                    DeathMovesController._flowCompleteResolver = null;
                }
            }, 300000);
        });
    }

    /**
     * Core flow logic — executes one death move at a time.
     * @param {string|null} targetUserName - Name of the target user.
     * @param {Object} options - Additional options.
     */
    static async _runFlow(targetUserName = null, options = {}) {
        const executeTrigger = (targetUserId) => {
            const targetUser = game.users.get(targetUserId);
            const targetActor = targetUser ? targetUser.character : null;
            const probs = DeathUI.calculateProbabilitiesForActor(targetActor);

            const payload = {
                targetUserId: targetUserId,
                probs: probs
            };

            game.socket.emit(SOCKET_NAME, { ...payload, type: SOCKET_TYPES.SHOW_UI });
            game.socket.emit(SOCKET_NAME, { ...payload, type: SOCKET_TYPES.SHOW_SPECTATOR_UI });
            DeathMovesController._handleSpectatorUI(payload);
        };

        if (targetUserName && !options.showDialog) {
            const targetUser = game.users.getName(targetUserName);
            if (!targetUser) {
                return ui.notifications.warn(game.i18n.format("DEATH_OPTIONS.Notifications.UserNotFound", { user: targetUserName }));
            }
            executeTrigger(targetUser.id);
            return DeathMovesController._waitForFlowComplete();
        }

        const users = game.users.filter(u => u.active && !u.isGM);
        if (users.length === 0) return ui.notifications.warn(game.i18n.localize("DEATH_OPTIONS.Notifications.NoPlayers"));

        let preSelectedUserId = null;
        if (targetUserName) {
            const u = game.users.getName(targetUserName);
            if (u) preSelectedUserId = u.id;
        }

        return new Promise((resolve) => {
            DeathUI.createGMDialog(users, (targetUserId) => {
                executeTrigger(targetUserId);
                DeathMovesController._waitForFlowComplete().then(resolve);
            }, preSelectedUserId, options.reason, options.characterName);
        });
    }

    /**
     * Handles displaying the INTERACTIVE UI for the specific target user.
     * Triggered by SHOW_UI socket event.
     * @param {Object} payload - Socket payload with targetUserId and probs.
     */
    static async _handleShowUI(payload) {
        if (game.user.id !== payload.targetUserId) return;

        const emitFlowComplete = () => {
            game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.FLOW_COMPLETE });
        };

        const callbacks = {
            onCancel: () => {
                game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.REMOVE_SPECTATOR_UI });
                emitFlowComplete();
            },
            onChoose: async (key, hopeSpent) => {
                await DeathMovesController._handleSelectionSequence(key);

                if (key === 'avoid') await DeathLogic.handleAvoidDeath();
                else if (key === 'blaze') await DeathLogic.handleBlazeOfGlory();
                else await DeathLogic.handleRiskItAll(hopeSpent);

                emitFlowComplete();
            },
            onUseItem: async (key) => {
                // A consumable replaces the death move outright, so the overlay comes
                // down everywhere instead of running the selection announcement.
                const used = await DeathLogic.useConsumable(key);
                if (!used) return DeathUI.releaseItemsBar();

                DeathUI.removeOverlay();
                game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.REMOVE_SPECTATOR_UI });
                emitFlowComplete();
            }
        };

        await DeathUI.createOverlay(callbacks, false, payload.probs);
    }

    /**
     * Handles displaying the PASSIVE UI for spectators.
     * @param {Object} payload - Socket payload with targetUserId and probs.
     */
    static async _handleSpectatorUI(payload) {
        if (game.user.id === payload.targetUserId) return;
        await DeathUI.createOverlay({}, true, payload.probs);
    }

    /**
     * Sequence after a player selects a death move option:
     * Hide other buttons -> Remove UI -> Show announcement -> Wait.
     * @param {string} optionKey - Key of the selected move.
     */
    static async _handleSelectionSequence(optionKey) {
        const name = game.i18n.localize(`DEATH_OPTIONS.UI.${DEATH_MOVES[optionKey].i18n}.Title`);

        // 0. Fade the moves that were not taken, for everyone
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.HIDE_UNSELECTED, optionKey });

        // 1. Remove UI for EVERYONE
        DeathUI.removeOverlay();
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.REMOVE_SPECTATOR_UI });

        // 2. Show Announcement to EVERYONE
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.SHOW_ANNOUNCEMENT, text: name });
        await DeathUI.showAnnouncement(name);

        // 3. Wait 4 seconds (3s reading + 1s fade buffer)
        await new Promise(resolve => setTimeout(resolve, 4000));
    }

    /**
     * Checks if "Core" automation is active and disables Daggerheart system defaults if necessary.
     * Runs on initialization to handle default settings or reload.
     */
    static async _checkSystemAutomation() {
        if (!game.user.isGM) return;

        const automationMode = DeathSettings.get('automationMode');
        if (automationMode === 'core') {
            await DeathSettings.disableSystemAutomation();
        }
    }
}

/** Compile every template up front, so nothing renders mid-flow over the network. */
Hooks.once('init', () => {
    foundry.applications.handlebars.loadTemplates(Object.values(TEMPLATES));
});

/** Adds the module's trigger button to the system's own Daggerheart menu. */
Hooks.on("renderDaggerheartMenu", async (app, element, data) => {
    const fieldset = await renderElement(TEMPLATES.menuButton, {
        legend: game.i18n.localize("DEATH_OPTIONS.Menu.Legend"),
        label: game.i18n.localize("DEATH_OPTIONS.Menu.Trigger")
    });

    fieldset.querySelector('[data-dm-action="trigger"]')
        .addEventListener('click', () => DeathMovesController.gmTriggerFlow());

    // Slot it after the menu's existing group when there is one, so it reads as
    // another section rather than something appended to the bottom of the window.
    const existing = element.querySelector("fieldset");
    if (existing) existing.after(fieldset);
    else element.appendChild(fieldset);
});

Hooks.once('ready', DeathMovesController.init);
