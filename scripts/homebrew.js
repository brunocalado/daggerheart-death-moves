/*!
 * Daggerheart: Death Moves
 * Copyright (c) 2025 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { DeathChat } from './chat.js';
import { DIALOG_CLASSES, MODULE_ID, TEMPLATES } from './constants.js';

const NEGATIVE_EXPERIENCE_SCAR = "Scar (Negative Experience)";

/**
 * The homebrew scar table: the player picks which permanent cost their survival
 * carried, and the matching Active Effect is written onto the sheet.
 */
export class DeathHomebrew {

    static get itemTemplate() {
        return {
            "name": "Feature",
            "type": "feature",
            "img": "icons/skills/wounds/injury-pain-body-orange.webp",
            "system": {
                "attribution": {},
                "description": "",
                "resource": null,
                "actions": {},
                "originItemType": null,
                "multiclassOrigin": false,
                "featureForm": "passive"
            },
            "effects": []
        };
    }

    static get scars() {
        return [
            { name: "Scar (Evasion)", description: "<p>Permanently take -1 to your Evasion.</p><blockquote><p>Once you gain five scars, you must end your character’s journey.</p></blockquote>" },
            { name: "Scar (Hit Point)", description: "<p>Permanently mark one Hit Point.</p><blockquote><p>Once you gain five scars, you must end your character’s journey.</p></blockquote>" },
            { name: "Scar (Hope)", description: "<p>Permanently cross-out one Hope slot.</p><blockquote><p>Once you gain five scars, you must end your character’s journey.</p></blockquote>" },
            { name: NEGATIVE_EXPERIENCE_SCAR, description: "<p>Gain a Negative Experience at -2. The GM may spend a Fear to apply a Negative. Experience in the same way PCs apply Experiences.</p><blockquote><p>Once you gain five scars, you must end your character’s journey.</p></blockquote>" },
            { name: "Scar (Stress)", description: "<p>Permanently mark one Stress.</p><blockquote><p>Once you gain five scars, you must end your character’s journey.</p></blockquote>" },
            { name: "Scar (Thresholds)", description: "<p>Permanently take -2 your Minor and Major thresholds.</p><blockquote><p>Once you gain five scars, you must end your character’s journey.</p></blockquote>" }
        ];
    }

    static get scarEffects() {
        return {
            "Scar (Evasion)": [{
                "name": "Scar (Evasion)",
                "type": "base",
                "system": { "rangeDependence": { "enabled": false, "type": "withinRange", "target": "hostile", "range": "melee" } },
                "img": "icons/skills/wounds/injury-pain-body-orange.webp",
                "changes": [{ "key": "system.evasion", "mode": 2, "value": "-1", "priority": null }],
                "disabled": false,
                "transfer": true
            }],
            "Scar (Hit Point)": [{
                "name": "Scar (Hit Point)",
                "type": "base",
                "system": { "rangeDependence": { "enabled": false, "type": "withinRange", "target": "hostile", "range": "melee" } },
                "img": "icons/skills/wounds/injury-pain-body-orange.webp",
                "changes": [{ "key": "system.resources.hitPoints.max", "mode": 2, "value": "-1", "priority": null }],
                "disabled": false,
                "transfer": true
            }],
            "Scar (Hope)": [{
                "name": "Scar (Hope)",
                "type": "base",
                "system": { "rangeDependence": { "enabled": false, "type": "withinRange", "target": "hostile", "range": "melee" } },
                "img": "icons/skills/wounds/injury-pain-body-orange.webp",
                "changes": [{ "key": "system.scars", "mode": 2, "value": "1", "priority": null }],
                "disabled": false,
                "transfer": true
            }],
            "Scar (Stress)": [{
                "name": "Scar (Stress)",
                "type": "base",
                "system": { "rangeDependence": { "enabled": false, "type": "withinRange", "target": "hostile", "range": "melee" } },
                "img": "icons/skills/wounds/injury-pain-body-orange.webp",
                "changes": [{ "key": "system.resources.stress.max", "mode": 2, "value": "-1", "priority": null }],
                "disabled": false,
                "transfer": true
            }],
            "Scar (Thresholds)": [{
                "name": "Scar (Thresholds)",
                "type": "base",
                "system": { "rangeDependence": { "enabled": false, "type": "withinRange", "target": "hostile", "range": "melee" } },
                "img": "icons/skills/wounds/injury-pain-body-orange.webp",
                "changes": [
                    { "key": "system.damageThresholds.major", "mode": 2, "value": "-2", "priority": null },
                    { "key": "system.damageThresholds.severe", "mode": 2, "value": "-2", "priority": null }
                ],
                "disabled": false,
                "transfer": true
            }]
        };
    }

    /**
     * Asks which scar was taken, then applies it and reports the roll.
     * @param {Actor} actor - The character that survived.
     * @param {Object} rollData - The Avoid Death roll: rawRoll, rollTotal, level, bonuses.
     */
    static async handleAvoidDeathScar(actor, rollData) {
        const index = await this._promptForScar();
        if (index === null) return;

        await this.applyScar(actor, this.scars[index], rollData);
    }

    /**
     * Shows the scar list and waits for a pick.
     * @returns {Promise<number|null>} Index into `scars`, or null when dismissed.
     */
    static async _promptForScar() {
        const { DialogV2 } = foundry.applications.api;

        const content = await foundry.applications.handlebars.renderTemplate(TEMPLATES.dialogScarPicker, {
            title: game.i18n.localize("DEATH_OPTIONS.Dialog.Scar.Title"),
            hint: game.i18n.localize("DEATH_OPTIONS.Dialog.Scar.Hint"),
            scars: this.scars
        });

        let chosen = null;

        /** Each scar is its own button, so the pick is read on click rather than on submit. */
        class ScarPicker extends DialogV2 {
            _onRender(context, options) {
                super._onRender(context, options);

                for (const button of this.element.querySelectorAll('[data-dm-scar]')) {
                    button.addEventListener('click', () => {
                        chosen = Number(button.dataset.dmScar);
                        this.close();
                    });
                }
            }
        }

        await ScarPicker.wait({
            window: { title: "DEATH_OPTIONS.Dialog.Scar.Title", icon: "fa-solid fa-droplet" },
            classes: DIALOG_CLASSES,
            position: { width: 360 },
            content,
            buttons: [{
                action: "cancel",
                label: game.i18n.localize("Cancel"),
                icon: "fa-solid fa-xmark",
                callback: () => null
            }],
            close: () => null,
            rejectClose: false
        });

        return chosen;
    }

    /**
     * Writes the chosen scar onto the sheet and posts the result card.
     * @param {Actor} actor - The character that survived.
     * @param {{name: string, description: string}} scar - The scar that was picked.
     * @param {Object} rollData - The Avoid Death roll: rawRoll, rollTotal, level, bonuses.
     */
    static async applyScar(actor, scar, rollData) {
        if (scar.name === NEGATIVE_EXPERIENCE_SCAR) await this._addNegativeExperience(actor);

        const itemData = foundry.utils.deepClone(this.itemTemplate);
        itemData.name = scar.name;
        itemData.system.description = scar.description;

        const effects = this.scarEffects[scar.name];
        if (effects) itemData.effects = effects;

        await actor.createEmbeddedDocuments("Item", [itemData]);

        return DeathChat.avoid({
            title: game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.ResultScar"),
            text: game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.MsgScar"),
            rawRoll: rollData.rawRoll,
            total: rollData.rollTotal,
            level: rollData.level,
            bonuses: rollData.bonuses ?? [],
            scarName: scar.name
        });
    }

    /**
     * Prompts for the Negative Experience this scar grants and writes it to the sheet.
     * @param {Actor} actor - The character that survived.
     */
    static async _addNegativeExperience(actor) {
        const { DialogV2 } = foundry.applications.api;

        const content = await foundry.applications.handlebars.renderTemplate(TEMPLATES.dialogNegativeExperience, {
            title: game.i18n.localize("DEATH_OPTIONS.Dialog.Experience.Title"),
            hint: game.i18n.localize("DEATH_OPTIONS.Dialog.Experience.Hint"),
            nameId: `${MODULE_ID}-experience-name`,
            descId: `${MODULE_ID}-experience-desc`,
            nameLabel: game.i18n.localize("DEATH_OPTIONS.Dialog.Experience.Name"),
            descLabel: game.i18n.localize("DEATH_OPTIONS.Dialog.Experience.Description"),
            nameMaxLength: 80,
            descMaxLength: 160
        });

        const result = await DialogV2.wait({
            window: { title: "DEATH_OPTIONS.Dialog.Experience.Title", icon: "fa-solid fa-face-frown" },
            classes: DIALOG_CLASSES,
            position: { width: 420 },
            content,
            buttons: [{
                action: "apply",
                label: game.i18n.localize("DEATH_OPTIONS.UI.Apply"),
                icon: "fa-solid fa-check",
                default: true,
                callback: (event, button, dialog) => ({
                    name: dialog.element.querySelector('[name="expName"]').value,
                    desc: dialog.element.querySelector('[name="expDesc"]').value
                })
            }],
            close: () => null,
            rejectClose: false
        });

        if (!result?.name) return;

        await actor.update({
            [`system.experiences.${foundry.utils.randomID()}`]: {
                name: result.name,
                value: -2,
                core: true,
                description: result.desc
            }
        });
    }
}
