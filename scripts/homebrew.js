import { DeathLogic } from './logic.js';
import { DeathSettings } from './settings.js';

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
            { name: "Scar (Negative Experience)", description: "<p>Gain a Negative Experience at -2. The GM may spend a Fear to apply a Negative. Experience in the same way PCs apply Experiences.</p><blockquote><p>Once you gain five scars, you must end your character’s journey.</p></blockquote>" },
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
                "changes": [{ "key": "system.resources.hope.max", "mode": 2, "value": "-1", "priority": null }],
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

    static async handleAvoidDeathScar(actor, rollData) {
        const { DialogV2 } = foundry.applications.api;

        const content = `
            <div class="death-homebrew-scars" style="display: flex; flex-direction: column; gap: 5px;">
                ${this.scars.map((scar, index) => `
                    <button type="button" data-idx="${index}" class="scar-btn">
                        ${scar.name}
                    </button>
                `).join('')}
            </div>
        `;

        return new Promise((resolve) => {
            class ScarPicker extends DialogV2 {
                _onRender(context, options) {
                    this.element.querySelectorAll('.scar-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            const idx = parseInt(e.currentTarget.dataset.idx);
                            resolve(idx);
                            this.close();
                        });
                    });
                }
                
                close(options) {
                    resolve(null);
                    return super.close(options);
                }
            }

            new ScarPicker({
                window: { title: "Select Scar", icon: "fas fa-skull", width: 300 },
                content: content,
                buttons: [{
                    action: "cancel",
                    label: "Cancel",
                    icon: "fas fa-times",
                    callback: (event, button, dialog) => dialog.close()
                }]
            }).render(true);
        }).then(async (result) => {
            if (result !== null) {
                const scar = this.scars[result];
                await this.applyScar(actor, scar, rollData);
            }
        });
    }

    static async applyScar(actor, scar, rollData) {
        if (scar.name === "Scar (Negative Experience)") {
            const { DialogV2 } = foundry.applications.api;
            const content = `
                <div style="margin-bottom: 10px;">
                    <p>Enter details for the Negative Experience:</p>
                </div>
                <div class="form-group">
                    <label>Name (Max 80):</label>
                    <input type="text" name="expName" maxlength="80" style="width: 100%; background: rgba(0,0,0,0.3); color: white; border: 1px solid #555; padding: 5px;">
                </div>
                <div class="form-group" style="margin-top: 10px;">
                    <label>Description (Max 160):</label>
                    <textarea name="expDesc" maxlength="160" style="width: 100%; height: 60px; background: rgba(0,0,0,0.3); color: white; border: 1px solid #555; padding: 5px;"></textarea>
                </div>
            `;

            const result = await DialogV2.wait({
                window: { title: "Negative Experience", icon: "fas fa-frown", width: 400 },
                content: content,
                buttons: [{
                    action: "apply",
                    label: "Apply",
                    icon: "fas fa-check",
                    callback: (event, button, dialog) => {
                        const name = dialog.element.querySelector('[name="expName"]').value;
                        const desc = dialog.element.querySelector('[name="expDesc"]').value;
                        return { name, desc };
                    }
                }],
                close: () => null
            });

            if (result && result.name) {
                const expId = foundry.utils.randomID();
                await actor.update({
                    [`system.experiences.${expId}`]: {
                        name: result.name,
                        value: -2,
                        core: true,
                        description: result.desc
                    }
                });
            }
        }

        const itemData = foundry.utils.deepClone(this.itemTemplate);
        itemData.name = scar.name;
        itemData.system.description = scar.description;
        
        const effects = this.scarEffects[scar.name];
        if (effects) {
            itemData.effects = effects;
        }
        
        await actor.createEmbeddedDocuments("Item", [itemData]);
        
        const bgImage = DeathSettings.get('avoidScarPath') || "";
        const title = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.ResultScar");
        
        let mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.MsgScar");

        // Rebuild details HTML (Standard Format)
        let detailsHtml = `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); width: 100%; font-size: 0.9em;">`;
        
        // Line 1: The Raw Roll
        detailsHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #ccc;">Roll (d12):</span>
                            <span style="font-weight: bold; color: white;">${rollData.rawRoll}</span>
                        </div>`;

        // Line 2: Bonus (Conditional)
        if (rollData.hasPhoenix) {
                detailsHtml += `<div style="display: flex; justify-content: space-between; color: #FFD700; margin-bottom: 4px;">
                                <span>${rollData.phoenixName}:</span>
                                <span>+1</span>
                            </div>`;
        }
        
        // Line 3: Final Total
        detailsHtml += `<div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px; padding-top: 4px; font-weight: bold;">
                            <span style="color: #fff;">TOTAL:</span>
                            <span style="font-size: 1.2em; color: #FFD700;">${rollData.rollTotal}</span>
                        </div>`;
        
        // Target Level Info
        detailsHtml += `<div style="text-align: center; font-size: 0.8em; color: #888; margin-top: 8px;">(Level Threshold: ${rollData.level})</div>`;
        detailsHtml += `</div>`;

        mainText += detailsHtml;

        // Add Scar info in small font
        mainText += `<div style="margin-top: 15px; font-size: 0.8em; color: #aaa; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 5px;">
            Scar Chosen: <span style="color: #FFD700;">${scar.name}</span>
        </div>`;

        ChatMessage.create({
            content: DeathLogic._createStyledChatContent(title, mainText, bgImage),
            style: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
    }
}
