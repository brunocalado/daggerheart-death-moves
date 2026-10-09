/*!
 * Daggerheart: Death Moves
 * Copyright (c) 2025 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { DeathSettings } from './settings.js';
import { MODULE_ID, SCAR_THRESHOLD_FLAG } from './constants.js';

/**
 * The number an Avoid Death roll or a Scar Check must reach to avoid a scar.
 *
 * Under the rules it is the character's level. The escalating homebrew replaces it
 * with a counter that starts at 1, rises by one with every roll that avoids a scar,
 * and drops back to 1 once a scar is taken.
 *
 * The counter lives on an Active Effect with no changes, so the table can read it on
 * the sheet's Effects tab and the GM resets it by deleting the effect. The value is
 * kept in the effect's flag rather than parsed from its name, which is translated
 * and can be renamed.
 */
export class ScarThreshold {

    static START = 1;
    static MAX = 10;

    /**
     * Whether the escalating counter is in use. "None" automation promises not to
     * touch the sheet, and the counter is written to it, so that mode keeps the level.
     * @returns {boolean}
     */
    static isEscalating() {
        return DeathSettings.get('scarThreshold') === 'escalating'
            && DeathSettings.get('automationMode') !== 'none';
    }

    /**
     * The threshold this character rolls against right now.
     * @param {Actor} actor - The character.
     * @returns {number} A roll at or below this takes a scar.
     */
    static get(actor) {
        if (!this.isEscalating()) return foundry.utils.getProperty(actor, "system.levelData.level.current") || 0;
        return this._findEffect(actor)?.getFlag(MODULE_ID, SCAR_THRESHOLD_FLAG) ?? this.START;
    }

    /**
     * Moves the counter after a roll is settled: back to the start once a scar is on
     * the sheet, one step up otherwise. Does nothing outside the escalating rule.
     * @param {Actor} actor - The character that rolled.
     * @param {boolean} scarred - True once the scar has actually been applied.
     */
    static async record(actor, scarred) {
        if (!this.isEscalating()) return;

        const value = scarred ? this.START : Math.min(this.get(actor) + 1, this.MAX);
        const data = {
            name: game.i18n.format("DEATH_OPTIONS.ScarThreshold.Name", { value }),
            description: game.i18n.format("DEATH_OPTIONS.ScarThreshold.Description", { value, max: this.MAX }),
            [`flags.${MODULE_ID}.${SCAR_THRESHOLD_FLAG}`]: value
        };

        const effect = this._findEffect(actor);
        if (effect) return effect.update(data);

        return actor.createEmbeddedDocuments("ActiveEffect", [foundry.utils.expandObject({
            ...data,
            img: "icons/skills/wounds/injury-pain-body-orange.webp"
        })]);
    }

    /**
     * @param {Actor} actor - The character.
     * @returns {ActiveEffect|undefined} The effect carrying the counter, if any.
     */
    static _findEffect(actor) {
        return actor?.effects.find(effect => effect.getFlag(MODULE_ID, SCAR_THRESHOLD_FLAG) !== undefined);
    }
}
