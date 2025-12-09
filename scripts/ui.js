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

        if (actor) {
            const level = foundry.utils.getProperty(actor, "system.levelData.level.current") || 0;
            // Counts outcomes <= Level (which cause a Scar)
            const outcomeCount = Math.min(12, Math.max(0, level));
            const percent = Math.round((outcomeCount / 12) * 100);
            
            avoidProb = `${scarLabel}: ${percent}%`;
        } else {
            avoidProb = `${scarLabel}: ?`;
        }

        const deathLabel = game.i18n.localize("DEATH_OPTIONS.UI.Blaze.DeathLabel");
        const riskProbText = game.i18n.localize("DEATH_OPTIONS.UI.Risk.ProbText");

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
        // We only want to trigger the sound locally for the person seeing the UI.
        // If the GM triggers it, the GM sees the spectator view and players see the main view.
        // Both calls createOverlay, so we play it here.
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

    static updateCountdown(element, number) {
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
        document.body.appendChild(div);
    }

    static removeBorderEffect() {
        const existing = document.getElementById('risk-border-overlay');
        if (existing) existing.remove();
    }

    static createGMDialog(users, onTrigger) {
        const content = `
            <div class="death-form-group">
                <label>Select Player:</label>
                <select id="death-player-select" class="death-select">
                    ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                </select>
                <p>This will send the Death Moves screen to the selected player.</p>
            </div>
        `;

        new Dialog({
            title: "Trigger Death Moves",
            content: content,
            buttons: {
                trigger: {
                    label: "Trigger",
                    icon: `<i class="fas fa-skull"></i>`,
                    callback: (html) => {
                        const userId = html.find('#death-player-select').val();
                        onTrigger(userId);
                    }
                }
            },
            default: "trigger",
            classes: ["death-moves-dialog"] 
        }).render(true);
    }
}