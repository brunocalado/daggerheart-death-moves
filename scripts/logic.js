import { DeathSettings } from './settings.js';
import { DeathUI } from './ui.js';
import { SOCKET_NAME, SOCKET_TYPES } from './constants.js';

/**
 * Handles game rules, dice rolls, and chat messages.
 */
export class DeathLogic {

    /**
     * Generates the standardized HTML content for chat messages.
     * Uses the Daggerheart-styled card layout.
     * @param {string} title - The card header title.
     * @param {string} text - The card body content (HTML allowed).
     * @returns {string} Complete HTML string for the chat card.
     */
    static _createStyledChatContent(title, text) {
        return `
        <div class="chat-card" style="border: 2px solid #C9A060; border-radius: 8px; overflow: hidden;">

            <!-- Header: Dark Background with Gold Text (Daggerheart Style) -->
            <header class="card-header flexrow" style="
                background: #191919 !important;
                padding: 8px;
                border-bottom: 2px solid #C9A060;
            ">
                <h3 class="noborder" style="
                    margin: 0;
                    font-weight: bold;
                    color: #C9A060 !important;
                    font-family: 'Aleo', serif;
                    text-align: center;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    width: 100%;
                ">
                    ${title}
                </h3>
            </header>

            <!-- Content Body -->
            <div class="card-content" style="
                padding: 20px;
                min-height: 150px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                position: relative;
                background: rgba(0, 0, 0, 0.6);
            ">
                <!-- The Text -->
                <span style="
                    color: #ffffff !important;
                    font-size: 1.3em;
                    font-weight: bold;
                    text-shadow: 0px 0px 8px #000000;
                    position: relative;
                    z-index: 1;
                    font-family: 'Lato', sans-serif;
                    line-height: 1.4;
                    width: 100%;
                ">
                    ${text}
                </span>
            </div>
        </div>
        `;
    }

    /**
     * Logic for the "Avoid Death" option.
     * Rolls 1d12 and checks against character level.
     * Triggered after player selects "Avoid Death" from the overlay.
     */
    static async handleAvoidDeath() {
        // Show Gold Border Effect (Local + Network)
        DeathUI.showBorderEffect('hope');
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.SHOW_BORDER, borderType: 'hope' });

        // --- PHOENIX FEATHER CHECK ---
        const actor = game.user.character;
        const phoenixName = DeathSettings.get('phoenixItemName');
        const hasPhoenix = actor ? actor.items.some(i => i.name === phoenixName) : false;

        const formula = hasPhoenix ? '1d12 + 1' : '1d12';

        const roll = new Roll(formula);
        await roll.evaluate();

        // Dice So Nice styling (Custom Gold/Black)
        if (roll.terms[0]) {
            roll.terms[0].options.appearance = { colorset: "custom", foreground: "#000000", background: "#FFD700", outline: "#000000", texture: "none" };
        }

        if (game.dice3d) {
            try { await game.dice3d.showForRoll(roll, game.user, true); } catch (e) {}
        }

        // Delay to allow seeing the dice
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Remove Border Effect
        DeathUI.removeBorderEffect();
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.REMOVE_BORDER });

        const rollTotal = roll.total;
        const rawRoll = roll.terms[0].total;

        let mainTitle = "";
        let mainText = "";
        let isScar = false;
        let level = 0;

        if (actor) {
            level = foundry.utils.getProperty(actor, "system.levelData.level.current") || 0;

            if (rollTotal <= level) {
                // SCAR
                mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.ResultScar");
                mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.MsgScar");
                isScar = true;
            } else {
                // SAFE
                mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.ResultSafe");
                mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.MsgSafe");
            }

            // --- Roll Details for Chat ---
            let detailsHtml = `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); width: 100%; font-size: 0.9em;">`;

            detailsHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #ccc;">Roll (d12):</span>
                                <span style="font-weight: bold; color: white;">${rawRoll}</span>
                            </div>`;

            if (hasPhoenix) {
                 detailsHtml += `<div style="display: flex; justify-content: space-between; color: #FFD700; margin-bottom: 4px;">
                                    <span>${phoenixName}:</span>
                                    <span>+1</span>
                                </div>`;
            }

            detailsHtml += `<div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px; padding-top: 4px; font-weight: bold;">
                                <span style="color: #fff;">TOTAL:</span>
                                <span style="font-size: 1.2em; color: #FFD700;">${rollTotal}</span>
                            </div>`;

            detailsHtml += `<div style="text-align: center; font-size: 0.8em; color: #888; margin-top: 8px;">(Level Threshold: ${level})</div>`;
            detailsHtml += `</div>`;

            mainText += detailsHtml;
        } else {
            mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.Flavor");
            mainText = game.i18n.format("DEATH_OPTIONS.Chat.Avoid.NoActor", {roll: rollTotal});
        }

        // --- AUTOMATION: Core ---
        const automation = DeathSettings.get('automationMode');
        if (automation === 'core' && isScar && actor) {
            await DeathLogic._applyCoreScar(actor);

            // Re-read scars after AE application to check threshold
            const newScars = foundry.utils.getProperty(actor, "system.scars") || 0;
            if (newScars >= 6) {
                mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.FearTitle");
                mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.FearDesc");
                mainText += `<br><br><em>(${game.i18n.localize("DEATH_OPTIONS.UI.Avoid.ScarLabel")}: ${newScars})</em>`;
            }
        } else if (automation === 'homebrew' && isScar && actor) {
            const { DeathHomebrew } = await import('./homebrew.js');
            const rollData = {
                rawRoll,
                rollTotal,
                level,
                hasPhoenix,
                phoenixName
            };
            await DeathHomebrew.handleAvoidDeathScar(actor, rollData);
            return;
        }

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: "Death Moves" }),
            content: this._createStyledChatContent(mainTitle, mainText),
            style: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
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
     */
    static async handleRiskItAll() {
        // Fear die first — purple border
        DeathUI.showBorderEffect('fear');
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.SHOW_BORDER, borderType: 'fear' });

        const fearRoll = new Roll('1d12');
        await fearRoll.evaluate();

        if (fearRoll.terms[0]) fearRoll.terms[0].options.appearance = { colorset: "custom", foreground: "#FFFFFF", background: "#2c003e", texture: "none" };
        if (game.dice3d) await game.dice3d.showForRoll(fearRoll, game.user, true);

        await new Promise(resolve => setTimeout(resolve, 5000));

        // Hope die second — gold border
        DeathUI.showBorderEffect('hope');
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.SHOW_BORDER, borderType: 'hope' });

        const hopeRoll = new Roll('1d12');
        await hopeRoll.evaluate();

        if (hopeRoll.terms[0]) hopeRoll.terms[0].options.appearance = { colorset: "custom", foreground: "#000000", background: "#FFD700", texture: "none" };
        if (game.dice3d) await game.dice3d.showForRoll(hopeRoll, game.user, true);

        await new Promise(resolve => setTimeout(resolve, 4000));

        DeathUI.removeBorderEffect();
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.REMOVE_BORDER });

        await this._processRiskResult(hopeRoll.total, fearRoll.total);
    }

    /**
     * Processes the result of Risk It All based on Hope vs Fear.
     * @param {number} hopeVal - Value of the Hope die.
     * @param {number} fearVal - Value of the Fear die.
     */
    static async _processRiskResult(hopeVal, fearVal) {
        let mainTitle, mainText;

        if (hopeVal > fearVal) {
            mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.HopeTitle");
            mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.HopeDesc");
        } else if (fearVal > hopeVal) {
            mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.FearTitle");
            mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.FearDesc");
        } else {
            mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.CriticalTitle");
            mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.CriticalDesc");
        }

        const diceText = `
            <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 10px; font-weight: bold; width: 100%;">
                <span style="color: #FFD700; text-shadow: 1px 1px 2px black;">Hope: ${hopeVal}</span>
                <span style="color: #da70d6; text-shadow: 1px 1px 2px black;">Fear: ${fearVal}</span>
            </div>`;

        let distributionMsg = "";

        // --- AUTOMATION: Core / Homebrew ---
        const automation = DeathSettings.get('automationMode');
        if (automation === 'core' || automation === 'homebrew') {
            try {
                const actor = game.user.character;

                if (actor) {
                    if (hopeVal > fearVal) {
                        const dist = await DeathUI.showRiskDistributionDialog(actor, hopeVal);
                        if (dist) {
                            distributionMsg = `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 0.9em;">
                                <strong>${game.i18n.localize("DEATH_OPTIONS.Chat.Risk.Recovered")}:</strong><br>
                                <span style="color: #ff6666;">${dist.hp} HP</span>, <span style="color: #da70d6;">${dist.stress} Stress</span>
                            </div>`;
                        }
                    } else if (hopeVal === fearVal) {
                        await actor.update({
                            "system.resources.hitPoints.value": 0,
                            "system.resources.stress.value": 0
                        });
                        distributionMsg = `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 0.9em;">
                            <strong>${game.i18n.localize("DEATH_OPTIONS.Chat.Risk.Recovered")}:</strong><br>
                            ${game.i18n.localize("DEATH_OPTIONS.Chat.Risk.AllRecovered")}
                        </div>`;
                    }
                }
            } catch (err) {
                console.error("Death Moves | Automation Error:", err);
                ui.notifications.error("Death Moves Automation failed. See console for details.");
            }
        }

        const fullText = diceText + mainText + distributionMsg;

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("DEATH_OPTIONS.Chat.Risk.Speaker") }),
            content: this._createStyledChatContent(mainTitle, fullText),
            style: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
    }

    /**
     * Logic for "Blaze of Glory".
     * Posts a dramatic farewell message to chat.
     * Triggered after player selects "Blaze of Glory" from the overlay.
     * @param {Function} overlayRemoveCallback - Callback to remove overlay after completion.
     */
    static handleBlazeOfGlory(overlayRemoveCallback) {
        const blazeMsg = DeathSettings.get('blazeChatMessage');
        const title = game.i18n.localize("DEATH_OPTIONS.Chat.Blaze.Title");

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: "Death Moves" }),
            content: this._createStyledChatContent(title, blazeMsg),
            style: CONST.CHAT_MESSAGE_STYLES.OTHER
        });

        if (overlayRemoveCallback) overlayRemoveCallback();
    }
}
