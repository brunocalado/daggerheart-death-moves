/*!
 * Daggerheart: Death Moves
 * Copyright (c) 2025 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID, SOCKET_NAME, SOCKET_TYPES } from './constants.js';

/**
 * Takes over the skull the Daggerheart character sheet draws over the portrait once
 * every Hit Point is marked.
 *
 * The system's button opens its own Death Move dialog. This module replaces that whole
 * flow, so the button is rewired to send the overlay the GM sends from the Daggerheart
 * menu — the system dialog is never opened.
 */
export class DeathSkull {
    /**
     * GM-side flow starter, supplied by the controller so this file never imports
     * main.js back and closes an import cycle.
     * @type {Function|null}
     */
    static _trigger = null;

    /**
     * Wires the sheet hook. Called once while the module's scripts evaluate.
     * @param {Function} onTrigger - DeathMovesController.gmTriggerFlow.
     */
    static register(onTrigger) {
        this._trigger = onTrigger;
        Hooks.on('renderCharacterSheet', (app, element) => DeathSkull._onRenderSheet(app, element));
    }

    /**
     * The user this actor's death move belongs to.
     *
     * Every step after the overlay reads `game.user.character`, so only a user with this
     * actor *assigned* can run the flow — being an owner is not enough.
     * @param {Actor|null} actor - The actor whose sheet was clicked.
     * @returns {User|null} The user to send the overlay to, or null.
     */
    static resolveTargetUser(actor) {
        if (!actor) return null;

        const assigned = game.users.filter(user => !user.isGM && user.character?.id === actor.id);
        return assigned.find(user => user.active) ?? assigned[0] ?? null;
    }

    /**
     * Repoints the sheet's skull at this module.
     * @param {Application} app - The character sheet.
     * @param {HTMLElement} element - The sheet's root element.
     */
    static _onRenderSheet(app, element) {
        const button = element.querySelector('.death-roll-btn');
        if (!button) return;

        // base.css hangs the module's design tokens off this class, so the button has to
        // carry it for styles/character-sheet.css to resolve them.
        button.classList.add(MODULE_ID);

        // The sheet only sets the action when the death move is actually viable; without
        // it the button stays hidden, so there is nothing to take over.
        if (button.dataset.action !== 'makeDeathMove') return;

        // Dropping the attribute — rather than swallowing the event — is what keeps the
        // sheet from treating the skull as one of its own actions at all, and it doubles
        // as the guard against binding twice if a render ever reuses this element.
        delete button.dataset.action;
        button.dataset.tooltip = 'DEATH_OPTIONS.Sheet.SkullTooltip';

        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            DeathSkull._onClick(app.document);
        });
    }

    /**
     * Sends the death move overlay for the clicked sheet.
     * @param {Actor} actor - The character whose skull was pressed.
     */
    static _onClick(actor) {
        const target = DeathSkull.resolveTargetUser(actor);

        if (game.user.isGM) {
            // With no assigned user the flow has no character to act on, so fall through
            // to the GM's own picker instead of guessing one.
            return DeathSkull._trigger?.(target?.name ?? null, {
                characterName: actor.name,
                reason: game.i18n.format("DEATH_OPTIONS.Dialog.Trigger.FromSheet", { character: actor.name })
            });
        }

        if (game.user.character?.id !== actor.id) {
            return ui.notifications.warn(game.i18n.localize("DEATH_OPTIONS.Notifications.NotAssigned"));
        }

        // The queue, the spectator overlay and the chat cards are all driven from the GM
        // client, so a player asks for the flow rather than starting it.
        if (!game.users.activeGM) {
            return ui.notifications.warn(game.i18n.localize("DEATH_OPTIONS.Notifications.NoActiveGM"));
        }

        game.socket.emit(SOCKET_NAME, {
            type: SOCKET_TYPES.REQUEST_TRIGGER,
            actorUuid: actor.uuid,
            userId: game.user.id
        });

        ui.notifications.info(game.i18n.localize("DEATH_OPTIONS.Notifications.Requested"));
    }
}
