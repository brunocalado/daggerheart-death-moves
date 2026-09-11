import { DeathSettings } from './settings.js';
import { findItemBySource, heroplateBlessedAction } from './helpers.js';

/**
 * Handles DOM manipulation and visual elements.
 */
export class DeathUI {

    /**
     * Calculates probability strings based on a specific actor.
     * @param {Actor} actor - The Foundry Actor object (can be null).
     * @returns {Object|null} - The probability strings or null if disabled.
     */
    static calculateProbabilitiesForActor(actor) {
        const showProbs = DeathSettings.get('showProbabilities');
        if (!showProbs) return null;

        let avoidProb = "";
        const scarLabel = game.i18n.localize("DEATH_OPTIONS.UI.Avoid.ScarLabel");

        // --- PHOENIX FEATHER CHECK ---
        const phoenix = findItemBySource(actor, DeathSettings.getItemSource('phoenix'));
        const hasPhoenix = !!phoenix;
        const phoenixName = phoenix?.name ?? "";

        if (actor) {
            const level = foundry.utils.getProperty(actor, "system.levelData.level.current") || 0;

            const bonus = hasPhoenix ? 1 : 0;
            const effectiveLevelThreshold = level - bonus;

            const outcomeCount = Math.min(12, Math.max(0, effectiveLevelThreshold));
            const percent = Math.round((outcomeCount / 12) * 100);

            avoidProb = `${scarLabel}: ${percent}%`;

            if (hasPhoenix) {
                avoidProb += `<div style="color: #FFD700; font-size: 0.8em; margin-top: 15px; text-shadow: 0 0 5px black;">🪶 ${phoenixName} (+1)</div>`;
            }

        } else {
            avoidProb = `${scarLabel}: ?`;
        }

        const deathLabel = game.i18n.localize("DEATH_OPTIONS.UI.Blaze.DeathLabel");

        // --- RELIQUARY CHECK ---
        const reliquary = findItemBySource(actor, DeathSettings.getItemSource('reliquary'));
        const hasReliquary = !!reliquary;

        const riskOdds = this._calculateRiskOdds(hasReliquary ? 1 : 0);
        let riskProbText = `LIFE: ${riskOdds.life}% | DEATH: ${riskOdds.death}%`;

        if (hasReliquary) {
            riskProbText += `<div style="color: #FFD700; font-size: 0.8em; margin-top: 15px; text-shadow: 0 0 5px black;">📿 ${reliquary.name} (+1)</div>`;
        }

        // The Heroplate is not folded in here: its bonus is chosen at roll time on
        // the slider inside the Risk button, which states it in place.

        return {
            avoid: avoidProb,
            blaze: `${deathLabel}: 100%`,
            risk: riskProbText
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

        return { name: armor.name, maxHope: hope };
    }

    /**
     * Creates the death move overlay UI for both interactive and spectator modes.
     * Always renders in compact mode (minimal layout).
     * @param {Object} callbacks - Functions for button clicks (onAvoid, onBlaze, onRisk, onCancel).
     * @param {boolean} isSpectator - If true, buttons are disabled and title reflects spectator mode.
     * @param {Object} forceProbs - Optional probability object passed from GM to ensure sync.
     * @returns {HTMLElement} The overlay element.
     */
    static createOverlay(callbacks, isSpectator = false, forceProbs = null) {
        const existing = document.getElementById('risk-it-all-overlay');
        if (existing) existing.remove();

        let probs = forceProbs;
        if (!probs && !isSpectator) {
             probs = this.calculateProbabilitiesForActor(game.user.character);
        }

        // Spectators can see the moment but never act in it, so they get no controls.
        const controls = isSpectator
            ? { consumables: [], heroplate: null }
            : this.getItemControls(game.user.character);

        const overlay = document.createElement('div');
        overlay.id = 'risk-it-all-overlay';
        overlay.classList.add('compact-mode');

        if (isSpectator) {
            overlay.classList.add('spectator-mode');
        }

        const title = isSpectator
            ? game.i18n.localize("DEATH_OPTIONS.UI.MainTitleSpectator") || "Waiting for Player Choice..."
            : game.i18n.localize("DEATH_OPTIONS.UI.MainTitle");

        const closeText = game.i18n.localize("DEATH_OPTIONS.UI.Close");

        const btnAvoidTitle = game.i18n.localize("DEATH_OPTIONS.UI.Avoid.Title");
        const btnAvoidSub = game.i18n.localize("DEATH_OPTIONS.UI.Avoid.Subtitle");

        const btnBlazeTitle = game.i18n.localize("DEATH_OPTIONS.UI.Blaze.Title");
        const btnBlazeSub = game.i18n.localize("DEATH_OPTIONS.UI.Blaze.Subtitle");

        const btnRiskTitle = game.i18n.localize("DEATH_OPTIONS.UI.Risk.Title");
        const btnRiskSub = game.i18n.localize("DEATH_OPTIONS.UI.Risk.Subtitle");

        const closeBtnHtml = isSpectator
            ? `<button class="roll-close-btn" id="risk-cancel-btn"><i class="fas fa-eye-slash"></i> Close View</button>`
            : `<button class="roll-close-btn" id="risk-cancel-btn"><i class="fas fa-times"></i> ${closeText}</button>`;

        overlay.innerHTML = `
            ${closeBtnHtml}
            <div class="risk-content-wrapper">
                <h1 class="risk-title" id="main-title">${title}</h1>
                <div class="death-options-container" id="death-options-menu">
                    ${this._createOptionBtn('btn-avoid', 'avoid', btnAvoidTitle, btnAvoidSub, probs ? probs.avoid : null)}
                    ${this._createOptionBtn('btn-blaze', 'blaze', btnBlazeTitle, btnBlazeSub, probs ? probs.blaze : null)}
                    ${this._createOptionBtn('btn-risk', 'risk', btnRiskTitle, btnRiskSub, probs ? probs.risk : null, this._createHeroplateControl(controls.heroplate))}
                </div>
                ${this._createConsumableBar(controls.consumables)}
            </div>
        `;

        document.body.appendChild(overlay);

        this._attachListeners(overlay, callbacks, isSpectator);

        return overlay;
    }

    /**
     * Removes spectator overlay if present.
     */
    static removeSpectatorOverlay() {
        const overlay = document.getElementById('risk-it-all-overlay');
        if (overlay && overlay.classList.contains('spectator-mode')) {
            overlay.remove();
        }
    }

    /**
     * Displays a full-screen announcement banner that fades after 3 seconds.
     * @param {string} text - The announcement text to display.
     */
    static showAnnouncement(text) {
        const banner = document.createElement('div');
        banner.id = 'death-announcement-banner';
        banner.innerHTML = `<h1>${text}</h1>`;
        document.body.appendChild(banner);

        setTimeout(() => {
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 500);
        }, 3000);
    }

    /**
     * Generates HTML for a single death move option button.
     * @param {string} id - Element ID for the button.
     * @param {string} type - Button type class (avoid, blaze, risk).
     * @param {string} title - Button title text.
     * @param {string} subtitle - Button subtitle text.
     * @param {string|null} probability - Probability text to display.
     * @param {string} [extraHtml] - Extra markup rendered inside the button.
     * @returns {string} HTML string.
     */
    static _createOptionBtn(id, type, title, subtitle, probability, extraHtml = '') {
        let probHtml = '';
        if (probability) {
            probHtml = `<div class="probability-text">${probability}</div>`;
        }

        return `
            <div class="option-btn btn-${type}" id="${id}">
                <div class="btn-content">
                    <h2>${title}</h2>
                    <p>${subtitle}</p>
                    ${probHtml}
                    ${extraHtml}
                </div>
            </div>
        `;
    }

    /**
     * Row of one-click buttons for consumables that replace the death move.
     * @param {Array<Object>} consumables - Items from getItemControls().
     * @returns {string} HTML string, empty when the character carries none.
     */
    static _createConsumableBar(consumables) {
        if (!consumables.length) return '';

        const buttons = consumables.map(item => `
            <div class="death-item-btn" data-item-key="${item.key}">
                <img class="death-item-img" src="${item.img}" alt="">
                <div class="death-item-text">
                    <span class="death-item-name">${item.name}</span>
                    <span class="death-item-hint">${item.hint}</span>
                </div>
            </div>
        `).join('');

        return `
            <div class="death-items-bar" id="death-items-bar">
                <span class="death-items-label">${game.i18n.localize("DEATH_OPTIONS.UI.Items.BarLabel")}</span>
                <div class="death-items-row">${buttons}</div>
            </div>
        `;
    }

    /**
     * Hope slider for the Heroplate, rendered inside the Risk It All button.
     * @param {Object|null} heroplate - Heroplate data from getItemControls().
     * @returns {string} HTML string, empty when it does not apply.
     */
    static _createHeroplateControl(heroplate) {
        if (!heroplate) return '';

        // Carried but unusable: say which rule is in the way instead of nothing.
        if (heroplate.blocked) {
            return `
            <div class="heroplate-control is-blocked" id="heroplate-control">
                <span class="heroplate-name">🛡 ${heroplate.name}</span>
                <span class="heroplate-hint">${heroplate.blocked}</span>
            </div>
        `;
        }

        return `
            <div class="heroplate-control" id="heroplate-control">
                <span class="heroplate-name">🛡 ${heroplate.name}</span>
                <div class="heroplate-row">
                    <input type="range" id="heroplate-slider" min="0" max="${heroplate.maxHope}" value="0">
                    <span class="heroplate-value" id="heroplate-value">+0</span>
                </div>
                <span class="heroplate-hint">${game.i18n.localize("DEATH_OPTIONS.UI.Risk.HeroplateSlider")}</span>
            </div>
        `;
    }

    /**
     * Attaches click listeners to overlay buttons.
     * @param {HTMLElement} overlay - The overlay element.
     * @param {Object} callbacks - Callback functions for each button.
     * @param {boolean} isSpectator - Whether the overlay is in spectator mode.
     */
    static _attachListeners(overlay, callbacks, isSpectator) {
        overlay.querySelector('#risk-cancel-btn').onclick = () => {
            if (callbacks.onCancel) callbacks.onCancel();
            overlay.remove();
        };

        if (isSpectator) return;

        const setupBtn = (id, callbackName, getArg = () => undefined) => {
            const btn = overlay.querySelector(`#${id}`);
            btn.onclick = async () => {
                // Read any inline control before hiding the overlay takes it away.
                const arg = getArg();
                this.hideOthers(id);
                if (callbacks[callbackName]) await callbacks[callbackName](btn, arg);
            };
        };

        setupBtn('btn-avoid', 'onAvoid');
        setupBtn('btn-blaze', 'onBlaze');
        setupBtn('btn-risk', 'onRisk', () => this.readHeroplateSlider(overlay));

        // The slider lives inside the Risk button, so its own events must not
        // bubble up and start the death move while the player is still choosing.
        const slider = overlay.querySelector('#heroplate-slider');
        if (slider) {
            const readout = overlay.querySelector('#heroplate-value');
            for (const type of ['click', 'pointerdown', 'mousedown', 'touchstart']) {
                slider.addEventListener(type, ev => ev.stopPropagation());
            }
            slider.addEventListener('input', (ev) => {
                ev.stopPropagation();
                readout.textContent = `+${ev.target.value}`;
            });
        }

        for (const btn of overlay.querySelectorAll('.death-item-btn')) {
            btn.onclick = async () => {
                // Lock the row so a second click cannot spend a second item while
                // the first is still being written to the sheet.
                overlay.querySelector('#death-items-bar')?.classList.add('is-busy');
                if (callbacks.onUseItem) await callbacks.onUseItem(btn.dataset.itemKey);
            };
        }
    }

    /**
     * Current value of the inline Heroplate slider.
     * @param {HTMLElement} [root] - Element to search, defaults to the document.
     * @returns {number} Hope the player chose to spend, 0 when absent.
     */
    static readHeroplateSlider(root = document) {
        const slider = root.querySelector('#heroplate-slider');
        return slider ? (parseInt(slider.value) || 0) : 0;
    }

    /**
     * Hides all option buttons except the selected one.
     * @param {string} selectedId - The ID of the selected button.
     */
    static hideOthers(selectedId) {
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            if (btn.id !== selectedId) {
                btn.classList.add('hidden-btn');
            } else {
                btn.style.pointerEvents = 'none';
            }
        });
        const closeBtn = document.getElementById('risk-cancel-btn');
        if (closeBtn) closeBtn.remove();
    }

    /**
     * Shows a colored border effect overlay for dramatic tension.
     * Used during sequential Risk It All rolls.
     * @param {string} type - Border type ('hope' or 'fear').
     */
    static showBorderEffect(type) {
        this.removeBorderEffect();
        const div = document.createElement('div');
        div.id = 'risk-border-overlay';
        if (type) div.classList.add(`border-${type}`);

        if (type) {
            const label = document.createElement('div');
            label.classList.add('border-label');
            label.innerText = type.toUpperCase();
            div.appendChild(label);
        }

        document.body.appendChild(div);
    }

    /**
     * Removes the border effect overlay if present.
     */
    static removeBorderEffect() {
        const existing = document.getElementById('risk-border-overlay');
        if (existing) existing.remove();
    }

    /**
     * Creates the GM dialog for selecting which player receives the death move.
     * Uses DialogV2 from the Foundry V13 API.
     * @param {User[]} users - Array of active non-GM users.
     * @param {Function} onTrigger - Callback when a player is selected.
     * @param {string|null} selectedUserId - Pre-selected user ID.
     * @param {string|null} reason - Reason text for automatic triggers.
     * @param {string|null} characterName - Character name for display.
     */
    static async createGMDialog(users, onTrigger, selectedUserId = null, reason = null, characterName = null) {
        const { DialogV2 } = foundry.applications.api;

        const infoText = reason
            ? `<p style="color: #ff4500; font-weight: bold; margin-top: 20px;">${reason}<br><span style="color: #ccc; font-weight: normal;">(${characterName || 'Unknown'})</span></p>`
            : `<p>This will send the Death Moves screen to the selected player.</p>`;

        const content = `
            <div class="death-form-group">
                <label>Select Player:</label>
                <select id="death-player-select" class="death-select">
                    ${users.map(u => {
                        const isSelected = (selectedUserId && u.id === selectedUserId) ? "selected" : "";
                        return `<option value="${u.id}" ${isSelected}>${u.name}</option>`;
                    }).join('')}
                </select>
                ${infoText}
            </div>
        `;

        const result = await DialogV2.wait({
            window: {
                title: "Trigger Death Moves",
                icon: "fas fa-skull"
            },
            content: content,
            buttons: [{
                action: "trigger",
                label: "Trigger",
                icon: "fas fa-skull",
                callback: (event, button, dialog) => {
                    const select = dialog.element.querySelector('#death-player-select');
                    return select ? select.value : null;
                }
            }],
            close: () => null,
            classes: ["death-moves-dialog"]
        });

        if (result) {
            onTrigger(result);
        }
    }

    /**
     * Shows a dialog to distribute Hope die value between HP and Stress.
     * Used after a Hope result in Risk It All.
     * @param {Actor} actor - The actor to update.
     * @param {number} total - Total points to distribute.
     * @returns {Promise<Object|null>} Distribution result or null if cancelled.
     */
    static async showRiskDistributionDialog(actor, total) {
        const { DialogV2 } = foundry.applications.api;

        // Custom class to attach slider listeners after render
        class RiskDialog extends DialogV2 {
            _onRender(context, options) {
                const slider = this.element.querySelector("#risk-slider");
                const hpSpan = this.element.querySelector("#risk-hp-val");
                const stressSpan = this.element.querySelector("#risk-stress-val");

                if (slider && hpSpan && stressSpan) {
                    slider.addEventListener("input", (ev) => {
                        const val = parseInt(ev.target.value);
                        hpSpan.textContent = val;
                        stressSpan.textContent = total - val;
                    });
                }
            }
        }

        const content = `
            <div class="death-moves-dialog-content">
                <div class="death-form-group" style="text-align: center; padding: 10px;">
                    <h3 style="margin-bottom: 20px; color: #FFD700; font-size: 1.4em;">
                        ${game.i18n.format("DEATH_OPTIONS.UI.Risk.DistributeHint", {total})}
                    </h3>

                    <div class="flexrow" style="align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px;">
                        <div style="text-align: center; width: 60px;">
                            <label style="display: block; font-weight: bold; color: #ff6666; margin-bottom: 5px;">HP</label>
                            <span id="risk-hp-val" style="font-size: 1.8em; font-weight: bold; color: white;">0</span>
                        </div>

                        <input type="range" id="risk-slider" min="0" max="${total}" value="0" style="flex: 1; margin: 0 10px; cursor: pointer;">

                        <div style="text-align: center; width: 60px;">
                            <label style="display: block; font-weight: bold; color: #da70d6; margin-bottom: 5px;">Stress</label>
                            <span id="risk-stress-val" style="font-size: 1.8em; font-weight: bold; color: white;">${total}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return await RiskDialog.wait({
            window: {
                title: game.i18n.localize("DEATH_OPTIONS.UI.Risk.DistributeTitle"),
                icon: "fas fa-heart-broken"
            },
            content: content,
            buttons: [{
                action: "apply",
                label: game.i18n.localize("DEATH_OPTIONS.UI.Apply"),
                icon: "fas fa-check",
                callback: async (event, button, dialog) => {
                    const slider = dialog.element.querySelector("#risk-slider");
                    const hpVal = parseInt(slider.value);
                    const stressVal = total - hpVal;

                    const currentHP = foundry.utils.getProperty(actor, "system.resources.hitPoints.value") || 0;
                    const currentStress = foundry.utils.getProperty(actor, "system.resources.stress.value") || 0;

                    const newHP = Math.max(0, currentHP - hpVal);
                    const newStress = Math.max(0, currentStress - stressVal);

                    await actor.update({
                        "system.resources.hitPoints.value": newHP,
                        "system.resources.stress.value": newStress
                    });

                    return { hp: hpVal, stress: stressVal };
                }
            }],
            close: () => null,
            classes: ["death-moves-dialog"]
        });
    }
}
