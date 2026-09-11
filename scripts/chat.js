/*!
 * Daggerheart: Death Moves
 * Copyright (c) 2025 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { TEMPLATES } from './constants.js';

/**
 * Posts the module's chat cards.
 *
 * Every card is the same shell — a titled header over a body — so the shell lives in
 * one template and each kind of message only supplies its own body. Nothing here
 * assembles markup by hand: the callers pass values, the templates decide the HTML.
 */
export class DeathChat {

    /**
     * Renders one card and posts it.
     * @param {Object} options - Card options.
     * @param {string} options.title - Header text.
     * @param {string} options.icon - Font Awesome class for the header icon.
     * @param {string} options.variant - Accent key: avoid, blaze, risk or item.
     * @param {string} options.bodyTemplate - Template rendering the card body.
     * @param {Object} options.bodyContext - Context for that template.
     * @param {string} [options.alias] - Speaker alias; defaults to the module's own.
     * @returns {Promise<ChatMessage>} The created message.
     */
    static async post({ title, icon, variant, bodyTemplate, bodyContext, alias = null }) {
        const { renderTemplate } = foundry.applications.handlebars;

        const body = await renderTemplate(bodyTemplate, bodyContext);
        const content = await renderTemplate(TEMPLATES.chatCard, { title, icon, variant, body });

        return ChatMessage.create({
            speaker: ChatMessage.getSpeaker({
                alias: alias ?? game.i18n.localize("DEATH_OPTIONS.Chat.Speaker")
            }),
            content,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
    }

    /**
     * A card that is only a title and a line of prose.
     * @param {Object} options - Card options; `text` may contain markup.
     * @returns {Promise<ChatMessage>} The created message.
     */
    static simple({ title, text, icon = 'fa-skull', variant = 'avoid', alias = null }) {
        return this.post({
            title,
            icon,
            variant,
            alias,
            bodyTemplate: TEMPLATES.chatSimple,
            bodyContext: { text }
        });
    }

    /**
     * The Avoid Death result, with the breakdown of how the total was reached.
     * @param {Object} options - Card options.
     * @param {string} options.title - The outcome, scarred or safe.
     * @param {string} options.text - The outcome in prose.
     * @param {number} options.rawRoll - The d12 before any bonus.
     * @param {number} options.total - The d12 plus every bonus.
     * @param {number} options.level - The level the total was measured against.
     * @param {Array<{label: string, value: number}>} [options.bonuses] - Item bonuses.
     * @param {string} [options.scarName] - Scar the player picked, in homebrew mode.
     * @param {number} [options.scarCount] - Scars now carried, in core mode.
     * @returns {Promise<ChatMessage>} The created message.
     */
    static avoid({ title, text, rawRoll, total, level, bonuses = [], scarName = null, scarCount = null }) {
        return this.post({
            title,
            icon: 'fa-shield-heart',
            variant: 'avoid',
            bodyTemplate: TEMPLATES.chatAvoid,
            bodyContext: {
                text,
                rawRoll,
                total,
                bonuses,
                scarName,
                scarCount,
                rollLabel: game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.RollLabel"),
                totalLabel: game.i18n.localize("DEATH_OPTIONS.Chat.Total"),
                thresholdNote: game.i18n.format("DEATH_OPTIONS.Chat.Avoid.Threshold", { level }),
                scarChosenLabel: game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.ScarChosen"),
                scarCountLabel: game.i18n.localize("DEATH_OPTIONS.UI.Avoid.ScarLabel")
            }
        });
    }

    /**
     * The Risk It All result: both dice, what lifted the Hope die, and the outcome.
     * @param {Object} options - Card options.
     * @param {string} options.title - The outcome.
     * @param {string} options.text - The outcome in prose.
     * @param {number} options.hope - Final Hope die, bonuses included.
     * @param {number} options.fear - The Fear die.
     * @param {number} options.rawHope - The Hope die before bonuses.
     * @param {Array<{label: string, value: number}>} [options.bonuses] - Hope bonuses.
     * @param {{label: string, value: string}|null} [options.recovered] - What was cleared.
     * @returns {Promise<ChatMessage>} The created message.
     */
    static risk({ title, text, hope, fear, rawHope, bonuses = [], recovered = null }) {
        return this.post({
            title,
            icon: 'fa-dice-d12',
            variant: 'risk',
            alias: game.i18n.localize("DEATH_OPTIONS.Chat.Risk.Speaker"),
            bodyTemplate: TEMPLATES.chatRisk,
            bodyContext: {
                text,
                hope,
                fear,
                rawHope,
                bonuses,
                recovered,
                hopeLabel: game.i18n.localize("DEATH_OPTIONS.Chat.Risk.Hope"),
                fearLabel: game.i18n.localize("DEATH_OPTIONS.Chat.Risk.Fear"),
                hopeDieLabel: game.i18n.localize("DEATH_OPTIONS.Chat.Risk.HopeDie")
            }
        });
    }
}
