import { DeathSettings } from './settings.js';
import { DeathAudioManager } from './audio.js'; // Import needed for playing sound
import { MODULE_ID, SOCKET_NAME, SOCKET_TYPES } from './constants.js'; // Import needed for socket

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
        const phoenixName = DeathSettings.get('phoenixItemName');
        const hasPhoenix = actor ? actor.items.some(i => i.name === phoenixName) : false;

        if (actor) {
            const level = foundry.utils.getProperty(actor, "system.levelData.level.current") || 0;
            
            const bonus = hasPhoenix ? 1 : 0;
            const effectiveLevelThreshold = level - bonus;
            
            const outcomeCount = Math.min(12, Math.max(0, effectiveLevelThreshold));
            const percent = Math.round((outcomeCount / 12) * 100);
            
            avoidProb = `${scarLabel}: ${percent}%`;

            if (hasPhoenix) {
                // UPDATE: Aumentado margin-top para 15px e removida a palavra "Active"
                avoidProb += `<div style="color: #FFD700; font-size: 0.8em; margin-top: 15px; text-shadow: 0 0 5px black;">🪶 ${phoenixName} (+1)</div>`;
            }

        } else {
            avoidProb = `${scarLabel}: ?`;
        }

        const deathLabel = game.i18n.localize("DEATH_OPTIONS.UI.Blaze.DeathLabel");
        
        // Risk It All Text
        const riskProbText = `LIFE: 54% | DEATH: 46%`;

        return {
            avoid: avoidProb,
            blaze: `${deathLabel}: 100%`,
            risk: riskProbText
        };
    }
    
    /**
     * @param {Object} callbacks - Functions for button clicks (onAvoid, onBlaze, onRisk, onCancel)
     * @param {boolean} isSpectator - If true, buttons are disabled and title reflects spectator mode
     * @param {Object} forceProbs - Optional probability object passed from GM to ensure sync
     */
    static createOverlay(callbacks, isSpectator = false, forceProbs = null) {
        // Remove any existing overlay first
        const existing = document.getElementById('risk-it-all-overlay');
        if (existing) existing.remove();

        // --- PLAY OPENING SOUND ---
        DeathAudioManager.playSound('soundRollScreen');

        const bgPath = DeathSettings.get('backgroundPath');

        // Determine probabilities
        let probs = forceProbs;
        if (!probs && !isSpectator) {
             probs = this.calculateProbabilitiesForActor(game.user.character);
        }

        const overlay = document.createElement('div');
        overlay.id = 'risk-it-all-overlay';
        if (bgPath) overlay.style.backgroundImage = `url('${bgPath}')`;

        if (isSpectator) {
            overlay.classList.add('spectator-mode');
        }

        // Localized strings
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
                    ${this._createOptionBtn('btn-risk', 'risk', btnRiskTitle, btnRiskSub, probs ? probs.risk : null)}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        this._attachListeners(overlay, callbacks, isSpectator);
        
        return overlay;
    }

    static removeSpectatorOverlay() {
        const overlay = document.getElementById('risk-it-all-overlay');
        if (overlay && overlay.classList.contains('spectator-mode')) {
            overlay.remove();
        }
    }

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

    static _createOptionBtn(id, type, title, subtitle, probability) {
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
                </div>
            </div>
        `;
    }

    static _attachListeners(overlay, callbacks, isSpectator) {
        overlay.querySelector('#risk-cancel-btn').onclick = () => {
            if (callbacks.onCancel) callbacks.onCancel();
            overlay.remove();
        };

        if (isSpectator) return; 

        const setupBtn = (id, callbackName) => {
            const btn = overlay.querySelector(`#${id}`);
            btn.onclick = async () => {
                this.hideOthers(id);
                if (callbacks[callbackName]) await callbacks[callbackName](btn);
            };
        };

        setupBtn('btn-avoid', 'onAvoid');
        setupBtn('btn-blaze', 'onBlaze');
        setupBtn('btn-risk', 'onRisk');
    }

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

    static updateCountdown(elementOrId, number) {
        let element = elementOrId;
        if (typeof elementOrId === 'string') {
            element = document.getElementById(elementOrId);
        }

        if (!element) return;

        const contentContainer = element.querySelector('.btn-content');
        if (contentContainer) {
            contentContainer.innerHTML = `<h2 style="font-size: 6rem; margin:0; line-height: 250px; color: white; text-shadow: 0 0 20px black;">${number}</h2>`;
        }
    }

    static showMediaOverlay(src, onClose) {
        const container = document.createElement('div');
        container.id = 'risk-it-all-media-container';
        const closeText = game.i18n.localize("DEATH_OPTIONS.UI.Close");

        const finish = () => {
            if (container.parentNode) container.remove();
            if (onClose) onClose();
        };

        const closeBtn = document.createElement('button');
        closeBtn.className = 'media-skip-btn';
        closeBtn.innerHTML = `<i class="fas fa-times"></i> ${closeText}`;
        closeBtn.onclick = (e) => { e.stopPropagation(); finish(); };
        container.appendChild(closeBtn);

        const img = document.createElement('img');
        img.src = src;
        container.appendChild(img);
        
        document.body.appendChild(container);

        setTimeout(finish, 5000);
        return finish;
    }

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

    static removeBorderEffect() {
        const existing = document.getElementById('risk-border-overlay');
        if (existing) existing.remove();
    }

    static async createGMDialog(users, onTrigger) {
        const { DialogV2 } = foundry.applications.api;

        const content = `
            <div class="death-form-group">
                <label>Select Player:</label>
                <select id="death-player-select" class="death-select">
                    ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                </select>
                <p>This will send the Death Moves screen to the selected player.</p>
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
     */
    static async showRiskDistributionDialog(actor, total) {
        const { DialogV2 } = foundry.applications.api;

        // Custom class to attach listeners after render
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
                    // Read from the live dialog element
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