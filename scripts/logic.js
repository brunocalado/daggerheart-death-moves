/*!
 * Daggerheart: Death Moves
 * Copyright (c) 2025 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { DeathSettings } from './settings.js';
import { DeathUI } from './ui.js';
import { DeathChat } from './chat.js';
import { findItemBySource, heroplateBlessedAction } from './helpers.js';
import { DEATH_DICE_APPEARANCE, SOCKET_NAME, SOCKET_TYPES } from './constants.js';

/**
 * Handles game rules, dice rolls, and chat messages.
 */
export class DeathLogic {

    /**
     * Lights the screen edge on every client at once.
     * @param {"hope"|"fear"} type - Which die is about to be rolled.
     */
    static async _raiseBorder(type) {
        await DeathUI.showBorderEffect(type);
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.SHOW_BORDER, borderType: type });
    }

    /**
     * Clears the screen edge on every client at once.
     */
    static _lowerBorder() {
        DeathUI.removeBorderEffect();
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.REMOVE_BORDER });
    }

    /**
     * Rolls one duality die and shows it in the death move's own dice styling.
     * @param {string} formula - The roll formula.
     * @param {"hope"|"fear"} type - Which die this is, for its appearance.
     * @returns {Promise<Roll>} The evaluated roll.
     */
    static async _rollDualityDie(formula, type) {
        const roll = new Roll(formula);
        await roll.evaluate();

        if (roll.terms[0]) roll.terms[0].options.appearance = DEATH_DICE_APPEARANCE[type];

        if (game.dice3d) {
            try {
                await game.dice3d.showForRoll(roll, game.user, true);
            } catch (err) {
                // A Dice So Nice that cannot draw must not stop the death move.
                console.warn("Death Moves | Dice So Nice could not show the roll:", err);
            }
        }

        return roll;
    }

    /**
     * Logic for the "Avoid Death" option.
     * Rolls 1d12 and checks against character level.
     * Triggered after player selects "Avoid Death" from the overlay.
     */
    static async handleAvoidDeath() {
        await this._raiseBorder('hope');

        // --- PHOENIX FEATHER CHECK ---
        const actor = game.user.character;
        const phoenix = findItemBySource(actor, DeathSettings.getItemSource('phoenix'));
        const bonuses = phoenix ? [{ label: phoenix.name, value: 1 }] : [];

        const roll = await this._rollDualityDie(phoenix ? '1d12 + 1' : '1d12', 'hope');

        // Long enough to read the dice before the screen goes quiet again.
        await new Promise(resolve => setTimeout(resolve, 3000));
        this._lowerBorder();

        const rollTotal = roll.total;
        const rawRoll = roll.terms[0].total;

        if (!actor) {
            return DeathChat.simple({
                title: game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.Flavor"),
                text: game.i18n.format("DEATH_OPTIONS.Chat.Avoid.NoActor", { roll: rollTotal }),
                icon: 'fa-shield-heart'
            });
        }

        const level = foundry.utils.getProperty(actor, "system.levelData.level.current") || 0;
        const isScar = rollTotal <= level;

        let title = game.i18n.localize(`DEATH_OPTIONS.Chat.Avoid.Result${isScar ? 'Scar' : 'Safe'}`);
        let text = game.i18n.localize(`DEATH_OPTIONS.Chat.Avoid.Msg${isScar ? 'Scar' : 'Safe'}`);
        let scarCount = null;

        // --- AUTOMATION ---
        const automation = DeathSettings.get('automationMode');

        if (automation === 'homebrew' && isScar) {
            // The homebrew flow asks which scar was taken and posts its own card.
            const { DeathHomebrew } = await import('./homebrew.js');
            return DeathHomebrew.handleAvoidDeathScar(actor, { rawRoll, rollTotal, level, bonuses });
        }

        if (automation === 'core' && isScar) {
            await this._applyCoreScar(actor);

            // Re-read scars after the effect applies, to check the threshold.
            const scars = foundry.utils.getProperty(actor, "system.scars") || 0;
            if (scars >= 6) {
                title = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.FearTitle");
                text = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.FearDesc");
                scarCount = scars;
            }
        }

        return DeathChat.avoid({ title, text, rawRoll, total: rollTotal, level, bonuses, scarCount });
    }

    /**
     * Applies a Core Scar to the actor using an Active Effect item.
     * If the scar item already exists, increments the AE value by 1.
     * If it does not exist, creates the item with value "1".
     * @param {Actor} actor - The actor to apply the scar to.
     */
    static async _applyCoreScar(actor) {
        const SCAR_ITEM_NAME = "Scar (Core)";

        const existingItem = actor.items.find(i => i.name === SCAR_ITEM_NAME && i.type === "feature");

        if (existingItem) {
            // Item already exists — find the AE change for system.scars and increment its value
            const effect = existingItem.effects.find(e =>
                e.changes.some(c => c.key === "system.scars")
            );

            if (effect) {
                const changeIndex = effect.changes.findIndex(c => c.key === "system.scars");
                const currentValue = parseInt(effect.changes[changeIndex].value) || 1;
                const newValue = currentValue + 1;

                const updatedChanges = effect.changes.map((c, i) =>
                    i === changeIndex ? { ...c, value: String(newValue) } : c
                );

                await effect.update({ changes: updatedChanges });
            }
        } else {
            // Item does not exist — create it with value "1"
            const itemData = {
                name: SCAR_ITEM_NAME,
                type: "feature",
                img: "icons/skills/wounds/injury-pain-body-orange.webp",
                system: {
                    attribution: {},
                    description: "<p>A scar from avoiding death.</p>",
                    resource: null,
                    actions: {},
                    originItemType: null,
                    multiclassOrigin: false,
                    featureForm: "passive"
                },
                effects: [{
                    name: SCAR_ITEM_NAME,
                    type: "base",
                    system: {
                        rangeDependence: {
                            enabled: false,
                            type: "withinRange",
                            target: "hostile",
                            range: "melee"
                        }
                    },
                    img: "icons/skills/wounds/injury-pain-body-orange.webp",
                    changes: [{
                        key: "system.scars",
                        mode: 2,
                        value: "1",
                        priority: null
                    }],
                    disabled: false,
                    transfer: true
                }]
            };

            await actor.createEmbeddedDocuments("Item", [itemData]);
        }
    }

    /**
     * Sequential Risk It All — rolls Fear first, then Hope with dramatic delay.
     * This is the sole Risk It All codepath.
     * Triggered after player selects "Risk it All" from the overlay.
     * @param {number} hopeSpent - Hope the player set on the overlay's Heroplate slider.
     */
    static async handleRiskItAll(hopeSpent = 0) {
        const actor = game.user.character;

        // Every bonus here raises the Hope die itself, so it feeds both the Hope vs
        // Fear comparison and the amount of HP/Stress cleared on a Hope result.
        // Resolved before any dice because the Heroplate is spent "before you make
        // the Risk It All death move".
        const bonus = await this._prepareRiskItAllBonus(actor, hopeSpent);

        await this._raiseBorder('fear');
        const fearRoll = await this._rollDualityDie('1d12', 'fear');
        await new Promise(resolve => setTimeout(resolve, 5000));

        await this._raiseBorder('hope');
        const hopeRoll = await this._rollDualityDie(bonus.total > 0 ? `1d12 + ${bonus.total}` : '1d12', 'hope');
        await new Promise(resolve => setTimeout(resolve, 4000));

        this._lowerBorder();

        await this._processRiskResult(hopeRoll.total, fearRoll.total, {
            raw: hopeRoll.terms[0].total,
            entries: bonus.entries
        });
    }

    /**
     * Collects every item bonus that applies to the Risk It All Hope die.
     * @param {Actor|null} actor - The acting character, if one is assigned.
     * @param {number} hopeSpent - Hope the player set on the overlay's Heroplate slider.
     * @returns {Promise<{total: number, entries: Array<{label: string, value: number}>}>}
     */
    static async _prepareRiskItAllBonus(actor, hopeSpent = 0) {
        const entries = [];

        if (!actor) return { total: 0, entries };

        // --- RELIQUARY OF THE SIGHTLESS SAINT --- flat, always on
        const reliquary = findItemBySource(actor, DeathSettings.getItemSource('reliquary'));
        if (reliquary) {
            entries.push({ label: reliquary.name, value: 1 });
        }

        // --- HALLOWED HEROPLATE --- the player already chose on the overlay slider
        const heroplate = this._findHeroplateFeature(actor);
        if (heroplate && hopeSpent > 0) {
            const hope = foundry.utils.getProperty(actor, "system.resources.hope.value") || 0;
            // Clamp: the sheet may have changed between rendering the slider and now.
            const spent = Math.min(hopeSpent, hope);

            if (spent > 0) {
                await actor.update({ "system.resources.hope.value": hope - spent });
                await this._consumeHeroplateUse(heroplate);
                entries.push({ label: heroplate.armor.name, value: spent });
            }
        }

        const total = entries.reduce((sum, e) => sum + e.value, 0);
        return { total, entries };
    }

    /**
     * Locates the Blessed feature on the equipped Heroplate, if it is still usable.
     * The armor's own action carries the once-per-long-rest counter the system already
     * refreshes during downtime, so that counter is the source of truth — not a module flag.
     * @param {Actor} actor - The acting character.
     * @returns {{armor: Item, action: Object}|null} The armor and its Blessed action, or null.
     */
    static _findHeroplateFeature(actor) {
        // An unequipped armor grants none of its features.
        const armor = findItemBySource(
            actor,
            DeathSettings.getItemSource('heroplate'),
            item => item.type === "armor" && item.system?.equipped === true
        );

        const action = heroplateBlessedAction(armor);
        return action ? { armor, action } : null;
    }

    /**
     * Marks the Heroplate's Blessed action as spent for this long rest.
     * @param {{armor: Item, action: Object}} heroplate - The armor and its Blessed action.
     */
    static async _consumeHeroplateUse(heroplate) {
        const used = Number(heroplate.action.uses?.value) || 0;
        await heroplate.armor.update({ [`system.actions.${heroplate.action.id}.uses.value`]: used + 1 });
    }

    /**
     * Processes the result of Risk It All based on Hope vs Fear.
     * @param {number} hopeVal - Final value of the Hope die, bonus included.
     * @param {number} fearVal - Value of the Fear die.
     * @param {Object|null} hopeDetails - Hope die breakdown ({raw, entries}).
     */
    static async _processRiskResult(hopeVal, fearVal, hopeDetails = null) {
        let outcome;
        if (hopeVal > fearVal) outcome = 'Hope';
        else if (fearVal > hopeVal) outcome = 'Fear';
        else outcome = 'Critical';

        const title = game.i18n.localize(`DEATH_OPTIONS.Chat.Risk.${outcome}Title`);
        const text = game.i18n.localize(`DEATH_OPTIONS.Chat.Risk.${outcome}Desc`);

        let recovered = null;

        // --- AUTOMATION: Core / Homebrew ---
        const automation = DeathSettings.get('automationMode');
        if (automation === 'core' || automation === 'homebrew') {
            try {
                const actor = game.user.character;
                const label = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.Recovered");

                if (actor && outcome === 'Hope') {
                    const dist = await DeathUI.showRiskDistributionDialog(actor, hopeVal);
                    if (dist) {
                        recovered = {
                            label,
                            value: game.i18n.format("DEATH_OPTIONS.Chat.Risk.RecoveredSplit", {
                                hp: dist.hp,
                                stress: dist.stress
                            })
                        };
                    }
                } else if (actor && outcome === 'Critical') {
                    await actor.update({
                        "system.resources.hitPoints.value": 0,
                        "system.resources.stress.value": 0
                    });
                    recovered = { label, value: game.i18n.localize("DEATH_OPTIONS.Chat.Risk.AllRecovered") };
                }
            } catch (err) {
                console.error("Death Moves | Automation Error:", err);
                ui.notifications.error(game.i18n.localize("DEATH_OPTIONS.Notifications.AutomationFailed"));
            }
        }

        return DeathChat.risk({
            title,
            text,
            hope: hopeVal,
            fear: fearVal,
            rawHope: hopeDetails?.raw ?? hopeVal,
            bonuses: hopeDetails?.entries ?? [],
            recovered
        });
    }

    /**
     * Spends a consumable the player picked from the overlay, replacing the death move.
     * Runs on the dying player's own client: they own the sheet it writes to.
     * @param {string} key - Supported item key, "sprite" or "tears".
     * @returns {Promise<boolean>} True when the item was spent.
     */
    static async useConsumable(key) {
        const actor = game.user.character;
        if (!actor) return false;

        // "none" means the module keeps its hands off the sheet, so nothing is spent.
        if (DeathSettings.get('automationMode') === 'none') return false;

        try {
            const item = findItemBySource(
                actor,
                DeathSettings.getItemSource(key),
                candidate => Number(candidate.system?.quantity ?? 1) > 0
            );

            if (!item) {
                ui.notifications.warn(game.i18n.localize("DEATH_OPTIONS.UI.Items.Gone"));
                return false;
            }

            if (key === 'sprite') await this._resolveSpriteBottle(actor, item);
            else await this._resolveUndyingHero(actor, item);

            return true;
        } catch (err) {
            console.error("Death Moves | Item automation failed:", err);
            ui.notifications.error(game.i18n.localize("DEATH_OPTIONS.Notifications.ItemFailed"));
            return false;
        }
    }

    /**
     * Sprite Bottle: shatters on the last Hit Point, clears them all, and is gone.
     * @param {Actor} actor - The dying character.
     * @param {Item} bottle - The bottle the player chose to use.
     */
    static async _resolveSpriteBottle(actor, bottle) {
        const bottleName = bottle.name;

        await actor.update({ "system.resources.hitPoints.value": 0 });
        await this._consumeOne(bottle);

        return DeathChat.simple({
            title: game.i18n.localize("DEATH_OPTIONS.Chat.Sprite.Title"),
            text: game.i18n.format("DEATH_OPTIONS.Chat.Sprite.Desc", { actor: actor.name }),
            icon: 'fa-flask',
            variant: 'item',
            alias: bottleName
        });
    }

    /**
     * Tears of the Undying Hero: the potion is spent, the character takes one final
     * action roll, then sleeps until an ally spends Tend to Wounds.
     * @param {Actor} actor - The dying character.
     * @param {Item} potion - The potion the player chose to use.
     */
    static async _resolveUndyingHero(actor, potion) {
        const potionName = potion.name;

        await this._consumeOne(potion);

        await DeathChat.simple({
            title: game.i18n.localize("DEATH_OPTIONS.Chat.Tears.Title"),
            text: game.i18n.format("DEATH_OPTIONS.Chat.Tears.Desc", { actor: actor.name }),
            icon: 'fa-flask',
            variant: 'item',
            alias: potionName
        });

        // The slumber lasts until an ally spends Tend to Wounds, which is a downtime
        // move the system already handles — this only puts the character under.
        const unconscious = CONFIG.DH?.GENERAL?.defeatedConditionChoices?.unconscious?.id;
        if (unconscious && typeof actor.setDeathMoveDefeated === 'function') {
            await actor.setDeathMoveDefeated(unconscious);
        }
    }

    /**
     * Spends one of a stacked item, deleting it when the last one is used.
     * @param {Item} item - The item to consume.
     */
    static async _consumeOne(item) {
        const quantity = Number(item.system?.quantity ?? 1);

        if (quantity > 1) await item.update({ "system.quantity": quantity - 1 });
        else await item.delete();
    }

    /**
     * Logic for "Blaze of Glory".
     * Posts a dramatic farewell message to chat.
     * Triggered after player selects "Blaze of Glory" from the overlay.
     */
    static handleBlazeOfGlory() {
        return DeathChat.simple({
            title: game.i18n.localize("DEATH_OPTIONS.Chat.Blaze.Title"),
            text: DeathSettings.get('blazeChatMessage'),
            icon: 'fa-fire',
            variant: 'blaze'
        });
    }
}
