import { DeathSettings } from './settings.js';
import { MODULE_ID } from './constants.js';

/**
 * Handles DOM manipulation and visual elements.
 */
export class DeathUI {
    
    static createOverlay(callbacks) {
        const bgPath = DeathSettings.get('backgroundPath');
        const showProbs = DeathSettings.get('showProbabilities');

        // Calculate probabilities if setting is enabled
        const probs = showProbs ? this._calculateProbabilities() : null;

        const overlay = document.createElement('div');
        overlay.id = 'risk-it-all-overlay';
        if (bgPath) overlay.style.backgroundImage = `url('${bgPath}')`;

        // Localized strings
        const title = game.i18n.localize("DEATH_OPTIONS.UI.MainTitle");
        const closeText = game.i18n.localize("DEATH_OPTIONS.UI.Close");

        const btnAvoidTitle = game.i18n.localize("DEATH_OPTIONS.UI.Avoid.Title");
        const btnAvoidSub = game.i18n.localize("DEATH_OPTIONS.UI.Avoid.Subtitle");

        const btnBlazeTitle = game.i18n.localize("DEATH_OPTIONS.UI.Blaze.Title");
        const btnBlazeSub = game.i18n.localize("DEATH_OPTIONS.UI.Blaze.Subtitle");

        const btnRiskTitle = game.i18n.localize("DEATH_OPTIONS.UI.Risk.Title");
        const btnRiskSub = game.i18n.localize("DEATH_OPTIONS.UI.Risk.Subtitle");

        overlay.innerHTML = `
            <button class="roll-close-btn" id="risk-cancel-btn"><i class="fas fa-times"></i> ${closeText}</button>
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
        this._attachListeners(overlay, callbacks);
        return overlay;
    }

    static _calculateProbabilities() {
        // Logic for Avoid Death probability
        let avoidProb = "";
        const actor = game.user.character;
        
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

    static _attachListeners(overlay, callbacks) {
        overlay.querySelector('#risk-cancel-btn').onclick = () => {
            callbacks.onCancel();
            overlay.remove();
        };

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

    static createGMDialog(users, onTrigger) {
        const content = `
            <div class="form-group">
                <label>Select Player:</label>
                <select id="death-player-select" style="width: 100%">
                    ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                </select>
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
            }
        }).render(true);
    }
}