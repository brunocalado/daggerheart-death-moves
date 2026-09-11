/*!
 * Daggerheart: Death Moves
 * Copyright (c) 2025 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { DeathSettings } from './settings.js';
import { findItemBySource, heroplateBlessedAction, renderElement } from './helpers.js';
import { DEATH_MOVES, DIALOG_CLASSES, ELEMENT_IDS, MODULE_ID, TEMPLATES } from './constants.js';

/**
 * Everything the module puts on screen.
 *
 * No markup is written here: each surface renders a template and this class only
 * decides what values go into it and what happens when it is clicked.
 */
export class DeathUI {

    /**
     * Generation counters for the two elements that live on document.body.
     *
     * Rendering a template is asynchronous, so a socket telling us to take an element
     * down can arrive between "start rendering" and "append". Each show claims a
     * number and drops its element if that number has moved on since.
     */
    static _overlayRequest = 0;
    static _borderRequest = 0;

    /**
     * Odds shown under each death move, for a specific actor.
     * @param {Actor|null} actor - The Foundry Actor object (can be null).
     * @returns {Object|null} One entry per move, or null when the setting is off.
     */
    static calculateProbabilitiesForActor(actor) {
        if (!DeathSettings.get('showProbabilities')) return null;

        const scarLabel = game.i18n.localize("DEATH_OPTIONS.UI.Avoid.ScarLabel");
        const deathLabel = game.i18n.localize("DEATH_OPTIONS.UI.Blaze.DeathLabel");

        // --- PHOENIX FEATHER CHECK ---
        const phoenix = findItemBySource(actor, DeathSettings.getItemSource('phoenix'));

        let avoid;
        if (actor) {
            const level = foundry.utils.getProperty(actor, "system.levelData.level.current") || 0;
            const effectiveLevelThreshold = level - (phoenix ? 1 : 0);
            const outcomeCount = Math.min(12, Math.max(0, effectiveLevelThreshold));

            avoid = {
                text: `${scarLabel}: ${Math.round((outcomeCount / 12) * 100)}%`,
                bonus: phoenix ? { icon: '🪶', name: phoenix.name, value: 1 } : null
            };
        } else {
            avoid = { text: `${scarLabel}: ?`, bonus: null };
        }

        // --- RELIQUARY CHECK ---
        const reliquary = findItemBySource(actor, DeathSettings.getItemSource('reliquary'));
        const riskOdds = this._calculateRiskOdds(reliquary ? 1 : 0);

        // The Heroplate is not folded in here: its bonus is chosen at roll time on
        // the slider inside the Risk option, which states it in place.
        return {
            avoid,
            blaze: { text: `${deathLabel}: 100%`, bonus: null },
            risk: {
                text: game.i18n.format("DEATH_OPTIONS.UI.Risk.Odds", riskOdds),
                bonus: reliquary ? { icon: '📿', name: reliquary.name, value: 1 } : null
            }
        };
    }

    /**
     * Walks the 12x12 Hope/Fear grid to get the Risk It All odds.
     * A tie is a critical success, so it counts towards LIFE — which is why a flat
     * bonus on the Hope die shifts the split rather than just the win count.
     * @param {number} bonus - Flat bonus applied to the Hope die.
     * @returns {{life: number, death: number}} Whole-number percentages.
     */
    static _calculateRiskOdds(bonus = 0) {
        let life = 0;

        for (let hope = 1; hope <= 12; hope++) {
            for (let fear = 1; fear <= 12; fear++) {
                if (hope + bonus >= fear) life++;
            }
        }

        const lifePercent = Math.round((life / 144) * 100);
        return { life: lifePercent, death: 100 - lifePercent };
    }

    /**
     * Collects the item controls the dying player gets inside the overlay.
     * Computed on the player's own client, because it needs live item references
     * the GM's probability payload does not carry.
     * @param {Actor|null} actor - The dying character.
     * @returns {{consumables: Array<Object>, heroplate: Object|null}} Controls to render.
     */
    static getItemControls(actor) {
        const empty = { consumables: [], heroplate: null };
        if (!actor) return empty;

        // "none" means the module keeps its hands off the sheet, so these are
        // resolved by hand at the table and no controls are offered.
        if (DeathSettings.get('automationMode') === 'none') return empty;

        const carried = item => Number(item.system?.quantity ?? 1) > 0;
        const consumables = [];

        for (const key of ['sprite', 'tears']) {
            const item = findItemBySource(actor, DeathSettings.getItemSource(key), carried);
            if (!item) continue;

            consumables.push({
                key,
                name: item.name,
                img: item.img,
                hint: game.i18n.localize(`DEATH_OPTIONS.UI.Items.${key}`)
            });
        }

        // Matched without the equipped test, so an armor that is carried but not
        // worn can still be reported instead of vanishing with no explanation.
        const armor = findItemBySource(
            actor,
            DeathSettings.getItemSource('heroplate'),
            item => item.type === "armor"
        );

        return { consumables, heroplate: this._describeHeroplate(actor, armor) };
    }

    /**
     * Whether the Heroplate slider applies, and when it does not, why.
     * Three separate rules can each block it, so a silently missing slider is
     * indistinguishable from a broken module — the reason is shown instead.
     * @param {Actor} actor - The dying character.
     * @param {Item|null} armor - The Heroplate on the sheet, equipped or not.
     * @returns {Object|null} Slider data, a blocked reason, or null when not carried.
     */
    static _describeHeroplate(actor, armor) {
        if (!armor) return null;

        const blocked = reason => ({
            name: armor.name,
            blocked: game.i18n.localize(`DEATH_OPTIONS.UI.Risk.HeroplateBlocked.${reason}`)
        });

        // The system itself defines the equipped armor as the one with this flag,
        // and an unworn armor grants none of its features.
        if (armor.system?.equipped !== true) return blocked('Unequipped');
        if (!heroplateBlessedAction(armor)) return blocked('Spent');

        const hope = foundry.utils.getProperty(actor, "system.resources.hope.value") || 0;
        if (hope <= 0) return blocked('NoHope');

        return {
            name: armor.name,
            maxHope: hope,
            hint: game.i18n.localize("DEATH_OPTIONS.UI.Risk.HeroplateSlider")
        };
    }

    /**
     * Builds the three death move options in the order the overlay lays them out.
     * @param {Object|null} probs - Odds from calculateProbabilitiesForActor().
     * @param {Object} controls - Item controls from getItemControls().
     * @returns {Array<Object>} Render context for each option.
     */
    static _buildOptions(probs, controls) {
        return Object.entries(DEATH_MOVES).map(([key, move]) => ({
            key,
            icon: move.icon,
            title: game.i18n.localize(`DEATH_OPTIONS.UI.${move.i18n}.Title`),
            subtitle: game.i18n.localize(`DEATH_OPTIONS.UI.${move.i18n}.Subtitle`),
            probability: probs?.[key] ?? null,
            // Only Risk It All spends Hope, so only it carries the slider.
            heroplate: key === 'risk' ? controls.heroplate : null
        }));
    }

    /**
     * Shows the death move overlay, for the dying player or for a spectator.
     * @param {Object} callbacks - onCancel, onChoose(key, hopeSpent), onUseItem(key).
     * @param {boolean} isSpectator - If true, the moves are visible but not clickable.
     * @param {Object} [forceProbs] - Odds computed by the GM, so every client agrees.
     * @returns {Promise<HTMLElement|null>} The overlay, or null if it was cancelled mid-render.
     */
    static async createOverlay(callbacks, isSpectator = false, forceProbs = null) {
        this.removeOverlay();
        const request = ++this._overlayRequest;

        const probs = forceProbs ?? (isSpectator ? null : this.calculateProbabilitiesForActor(game.user.character));

        // Spectators can see the moment but never act in it, so they get no controls.
        const controls = isSpectator
            ? { consumables: [], heroplate: null }
            : this.getItemControls(game.user.character);

        const overlay = await renderElement(TEMPLATES.overlay, {
            id: ELEMENT_IDS.overlay,
            isSpectator,
            title: isSpectator
                ? game.i18n.localize("DEATH_OPTIONS.UI.MainTitleSpectator")
                : game.i18n.localize("DEATH_OPTIONS.UI.MainTitle"),
            closeIcon: isSpectator ? 'fa-eye-slash' : 'fa-xmark',
            closeLabel: game.i18n.localize(isSpectator ? "DEATH_OPTIONS.UI.CloseView" : "DEATH_OPTIONS.UI.Close"),
            options: this._buildOptions(probs, controls),
            items: controls.consumables.length
                ? {
                    id: ELEMENT_IDS.itemsBar,
                    label: game.i18n.localize("DEATH_OPTIONS.UI.Items.BarLabel"),
                    entries: controls.consumables
                }
                : null
        });

        // Taken down again while the template was rendering.
        if (request !== this._overlayRequest) return null;

        document.body.appendChild(overlay);
        this._attachListeners(overlay, callbacks, isSpectator);

        return overlay;
    }

    /**
     * Removes the overlay, whichever mode it is in.
     */
    static removeOverlay() {
        this._overlayRequest++;
        document.getElementById(ELEMENT_IDS.overlay)?.remove();
    }

    /**
     * Removes the overlay only when this client is watching rather than choosing.
     */
    static removeSpectatorOverlay() {
        const overlay = document.getElementById(ELEMENT_IDS.overlay);
        if (overlay?.classList.contains('dm-overlay--spectator')) this.removeOverlay();
    }

    /**
     * Wires up the overlay. Clicks are bound here rather than through an actions map
     * because the overlay is a plain element, not an ApplicationV2.
     * @param {HTMLElement} overlay - The overlay element.
     * @param {Object} callbacks - Callback functions for each control.
     * @param {boolean} isSpectator - Whether the overlay is in spectator mode.
     */
    static _attachListeners(overlay, callbacks, isSpectator) {
        overlay.querySelector('[data-dm-action="close"]')?.addEventListener('click', () => {
            callbacks.onCancel?.();
            this.removeOverlay();
        });

        if (isSpectator) return;

        const choose = async (option) => {
            const key = option.dataset.dmOption;

            // Read the inline control before hiding the overlay takes it away.
            const hopeSpent = key === 'risk' ? this.readHeroplateSlider(overlay) : 0;

            this.hideOthers(key);
            await callbacks.onChoose?.(key, hopeSpent);
        };

        for (const option of overlay.querySelectorAll('.dm-option')) {
            option.addEventListener('click', () => choose(option));
            option.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                choose(option);
            });
        }

        // The slider lives inside the Risk option, so its own events must not bubble
        // up and start the death move while the player is still choosing.
        const slider = overlay.querySelector('[data-dm-heroplate-slider]');
        if (slider) {
            const readout = overlay.querySelector('[data-dm-heroplate-value]');

            for (const type of ['click', 'pointerdown', 'mousedown', 'touchstart', 'keydown']) {
                slider.addEventListener(type, event => event.stopPropagation());
            }

            slider.addEventListener('input', (event) => {
                event.stopPropagation();
                readout.textContent = `+${event.target.value}`;
            });
        }

        for (const button of overlay.querySelectorAll('[data-dm-item]')) {
            button.addEventListener('click', async () => {
                // Lock the row so a second click cannot spend a second item while
                // the first is still being written to the sheet.
                overlay.querySelector(`#${ELEMENT_IDS.itemsBar}`)?.classList.add('dm-items--busy');
                await callbacks.onUseItem?.(button.dataset.dmItem);
            });
        }
    }

    /**
     * Current value of the inline Heroplate slider.
     * @param {HTMLElement|Document} [root] - Element to search, defaults to the document.
     * @returns {number} Hope the player chose to spend, 0 when absent.
     */
    static readHeroplateSlider(root = document) {
        const slider = root.querySelector('[data-dm-heroplate-slider]');
        return slider ? (parseInt(slider.value) || 0) : 0;
    }

    /**
     * Fades out every move except the one that was chosen.
     * @param {string} optionKey - Key of the chosen move.
     */
    static hideOthers(optionKey) {
        const overlay = document.getElementById(ELEMENT_IDS.overlay);
        if (!overlay) return;

        for (const option of overlay.querySelectorAll('.dm-option')) {
            const chosen = option.dataset.dmOption === optionKey;
            option.classList.toggle('dm-option--dimmed', !chosen);
            option.classList.toggle('dm-option--chosen', chosen);
        }

        // Past this point the choice is made; there is nothing left to back out of.
        overlay.querySelector('[data-dm-action="close"]')?.remove();
    }

    /**
     * Unlocks the consumable row after a pick that did not go through.
     */
    static releaseItemsBar() {
        document.getElementById(ELEMENT_IDS.itemsBar)?.classList.remove('dm-items--busy');
    }

    /**
     * Shows a full-width banner naming the chosen move, then fades it out.
     * @param {string} text - The announcement text to display.
     */
    static async showAnnouncement(text) {
        document.getElementById(ELEMENT_IDS.announcement)?.remove();

        const banner = await renderElement(TEMPLATES.announcement, { id: ELEMENT_IDS.announcement, text });
        document.body.appendChild(banner);

        setTimeout(() => {
            banner.classList.add('dm-announcement--out');
            setTimeout(() => banner.remove(), 500);
        }, 3000);
    }

    /**
     * Colours the screen edge while a die is in the air.
     * @param {"hope"|"fear"} type - Which die is being rolled.
     */
    static async showBorderEffect(type) {
        this.removeBorderEffect();
        const request = ++this._borderRequest;

        const border = await renderElement(TEMPLATES.border, {
            id: ELEMENT_IDS.border,
            type,
            label: type ? game.i18n.localize(`DEATH_OPTIONS.UI.Duality.${type}`) : null
        });

        // Taken down, or replaced by the other die, while the template was rendering.
        if (request !== this._borderRequest) return;

        document.body.appendChild(border);
    }

    /**
     * Removes the screen edge effect if present.
     */
    static removeBorderEffect() {
        this._borderRequest++;
        document.getElementById(ELEMENT_IDS.border)?.remove();
    }

    /**
     * Asks the GM which player receives the death move screen.
     * @param {User[]} users - Active non-GM users.
     * @param {Function} onTrigger - Called with the chosen user id.
     * @param {string|null} selectedUserId - Pre-selected user id.
     * @param {string|null} reason - Why the dialog opened, for automatic triggers.
     * @param {string|null} characterName - Character name for display.
     */
    static async createGMDialog(users, onTrigger, selectedUserId = null, reason = null, characterName = null) {
        const { DialogV2 } = foundry.applications.api;
        const selectId = `${MODULE_ID}-user-select`;

        const content = await foundry.applications.handlebars.renderTemplate(TEMPLATES.dialogTrigger, {
            title: game.i18n.localize("DEATH_OPTIONS.Dialog.Trigger.Title"),
            playerLabel: game.i18n.localize("DEATH_OPTIONS.Dialog.Trigger.Player"),
            hint: game.i18n.localize("DEATH_OPTIONS.Dialog.Trigger.Hint"),
            selectId,
            reason,
            characterName,
            users: users.map(user => ({
                id: user.id,
                name: user.name,
                selected: !!selectedUserId && user.id === selectedUserId
            }))
        });

        const result = await DialogV2.wait({
            window: { title: "DEATH_OPTIONS.Dialog.Trigger.Title", icon: "fa-solid fa-skull" },
            classes: DIALOG_CLASSES,
            content,
            buttons: [{
                action: "trigger",
                label: game.i18n.localize("DEATH_OPTIONS.Dialog.Trigger.Submit"),
                icon: "fa-solid fa-skull",
                default: true,
                callback: (event, button, dialog) => dialog.element.querySelector('[data-dm-user-select]')?.value ?? null
            }],
            close: () => null
        });

        if (result) onTrigger(result);
    }

    /**
     * Splits the Hope die total between Hit Points and Stress, then applies it.
     * @param {Actor} actor - The actor to update.
     * @param {number} total - Total points to distribute.
     * @returns {Promise<{hp: number, stress: number}|null>} What was cleared, or null.
     */
    static async showRiskDistributionDialog(actor, total) {
        const { DialogV2 } = foundry.applications.api;

        const content = await foundry.applications.handlebars.renderTemplate(TEMPLATES.dialogRiskDistribution, {
            title: game.i18n.localize("DEATH_OPTIONS.UI.Risk.DistributeTitle"),
            hint: game.i18n.format("DEATH_OPTIONS.UI.Risk.DistributeHint", { total }),
            hpLabel: game.i18n.localize("DEATH_OPTIONS.UI.Resources.HitPoints"),
            stressLabel: game.i18n.localize("DEATH_OPTIONS.UI.Resources.Stress"),
            total
        });

        /** One slider drives both readouts, so they are kept in step after every render. */
        class RiskDistributionDialog extends DialogV2 {
            _onRender(context, options) {
                super._onRender(context, options);

                const slider = this.element.querySelector('[data-dm-split-slider]');
                const hp = this.element.querySelector('[data-dm-readout="hp"]');
                const stress = this.element.querySelector('[data-dm-readout="stress"]');
                if (!slider || !hp || !stress) return;

                slider.addEventListener('input', (event) => {
                    const value = Number(event.target.value);
                    hp.textContent = value;
                    stress.textContent = total - value;
                });
            }
        }

        return RiskDistributionDialog.wait({
            window: { title: "DEATH_OPTIONS.UI.Risk.DistributeTitle", icon: "fa-solid fa-heart-crack" },
            classes: DIALOG_CLASSES,
            content,
            buttons: [{
                action: "apply",
                label: game.i18n.localize("DEATH_OPTIONS.UI.Apply"),
                icon: "fa-solid fa-check",
                default: true,
                callback: async (event, button, dialog) => {
                    const slider = dialog.element.querySelector('[data-dm-split-slider]');
                    const hpVal = parseInt(slider.value) || 0;
                    const stressVal = total - hpVal;

                    const currentHP = foundry.utils.getProperty(actor, "system.resources.hitPoints.value") || 0;
                    const currentStress = foundry.utils.getProperty(actor, "system.resources.stress.value") || 0;

                    await actor.update({
                        "system.resources.hitPoints.value": Math.max(0, currentHP - hpVal),
                        "system.resources.stress.value": Math.max(0, currentStress - stressVal)
                    });

                    return { hp: hpVal, stress: stressVal };
                }
            }],
            close: () => null
        });
    }
}
