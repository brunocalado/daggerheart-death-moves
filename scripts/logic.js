import { DeathSettings } from './settings.js';
import { DeathAudioManager } from './audio.js';
import { DeathUI } from './ui.js';
import { SOCKET_NAME, SOCKET_TYPES } from './constants.js';

/**
 * Handles game rules, dice rolls, and chat messages.
 */
export class DeathLogic {
    
    /**
     * Helper to generate the standardized HTML content for chat messages.
     * Uses the style from the "Overwhelming Dread" macro.
     */
    static _createStyledChatContent(title, text, imagePath) {
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
                    color: #C9A060 !important; /* Force Gold Color for legibility */
                    font-family: 'Aleo', serif; /* Daggerheart Font if available */
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
                background-image: url('${imagePath}'); 
                background-repeat: no-repeat; 
                background-position: center; 
                background-size: cover; 
                padding: 20px; 
                min-height: 150px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                position: relative;
            ">
                <!-- Dark overlay for text readability -->
                <div style="
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    z-index: 0;
                "></div>

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
     */
    static async handleAvoidDeath() {
        // Show Gold Border Effect (Local + Network)
        DeathUI.showBorderEffect('hope');
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.SHOW_BORDER, borderType: 'hope' });

        // --- NEW LOGIC: Check for Phoenix Item ---
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
        // Get the raw d12 roll (without bonus)
        const rawRoll = roll.terms[0].total;
        
        let resultKey = null;
        let soundKey = null;
        let mainTitle = "";
        let mainText = "";

        if (actor) {
            const level = foundry.utils.getProperty(actor, "system.levelData.level.current") || 0;
            
            if (rollTotal <= level) {
                // SCAR
                mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.ResultScar");
                mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.MsgScar");
                resultKey = 'avoidScarPath';
                soundKey = 'soundAvoidScar';
            } else {
                // SAFE
                mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.ResultSafe");
                mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.MsgSafe");
                resultKey = 'avoidSafePath';
                soundKey = 'soundAvoidSafe';
            }
            
            // --- UPDATE: Organized Chat Visuals ---
            let detailsHtml = `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); width: 100%; font-size: 0.9em;">`;
            
            // Line 1: The Raw Roll
            detailsHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #ccc;">Roll (d12):</span>
                                <span style="font-weight: bold; color: white;">${rawRoll}</span>
                            </div>`;

            // Line 2: Bonus (Conditional)
            if (hasPhoenix) {
                 detailsHtml += `<div style="display: flex; justify-content: space-between; color: #FFD700; margin-bottom: 4px;">
                                    <span>${phoenixName}:</span>
                                    <span>+1</span>
                                </div>`;
            }
            
            // Line 3: Final Total
            detailsHtml += `<div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px; padding-top: 4px; font-weight: bold;">
                                <span style="color: #fff;">TOTAL:</span>
                                <span style="font-size: 1.2em; color: #FFD700;">${rollTotal}</span>
                            </div>`;
            
            // Target Level Info
            detailsHtml += `<div style="text-align: center; font-size: 0.8em; color: #888; margin-top: 8px;">(Level Threshold: ${level})</div>`;
            detailsHtml += `</div>`;

            mainText += detailsHtml;
        } else {
            mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.Flavor");
            mainText = game.i18n.format("DEATH_OPTIONS.Chat.Avoid.NoActor", {roll: rollTotal});
        }

        if (resultKey && soundKey) {
            game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_MEDIA, mediaKey: resultKey });
            game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_SOUND, soundKey: soundKey });
            DeathAudioManager.playMedia(resultKey);
            DeathAudioManager.playSound(soundKey);
        }

        const bgImage = DeathSettings.get(resultKey) || "";

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: "Death Moves" }),
            content: this._createStyledChatContent(mainTitle, mainText, bgImage),
            style: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
    }

    /**
     * Standard Risk It All (Simultaneous Roll).
     * Rolls Hope (1d12) and Fear (1d12) at the same time.
     */
    static async handleRiskItAll() {
        const roll = new Roll('1d12 + 1d12');
        await roll.evaluate();
        
        if (roll.terms[0]) roll.terms[0].options.appearance = { colorset: "custom", foreground: "#000000", background: "#FFD700", texture: "none" };
        if (roll.terms[2]) roll.terms[2].options.appearance = { colorset: "custom", foreground: "#FFFFFF", background: "#2c003e", texture: "none" };

        if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);

        await new Promise(resolve => setTimeout(resolve, 2000));

        const hopeVal = roll.terms[0].total;
        const fearVal = roll.terms[2].total;

        this._processRiskResult(hopeVal, fearVal);
    }

    /**
     * Sequential Risk It All (Fear then Hope with delay).
     * Builds tension by rolling Fear first.
     */
    static async handleRiskItAllSequential() {
        DeathUI.showBorderEffect('fear');
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.SHOW_BORDER, borderType: 'fear' });
        
        const fearRoll = new Roll('1d12');
        await fearRoll.evaluate();
        
        if (fearRoll.terms[0]) fearRoll.terms[0].options.appearance = { colorset: "custom", foreground: "#FFFFFF", background: "#2c003e", texture: "none" };
        if (game.dice3d) await game.dice3d.showForRoll(fearRoll, game.user, true);

        await new Promise(resolve => setTimeout(resolve, 5000));

        DeathUI.showBorderEffect('hope');
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.SHOW_BORDER, borderType: 'hope' });
        
        const hopeRoll = new Roll('1d12');
        await hopeRoll.evaluate();
        
        if (hopeRoll.terms[0]) hopeRoll.terms[0].options.appearance = { colorset: "custom", foreground: "#000000", background: "#FFD700", texture: "none" };
        if (game.dice3d) await game.dice3d.showForRoll(hopeRoll, game.user, true);

        await new Promise(resolve => setTimeout(resolve, 4000));

        DeathUI.removeBorderEffect();
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.REMOVE_BORDER });
        
        this._processRiskResult(hopeRoll.total, fearRoll.total);
    }

    /**
     * Processes the result of Risk It All based on Hope vs Fear.
     * @param {number} hopeVal - Value of the Hope die
     * @param {number} fearVal - Value of the Fear die
     */
    static _processRiskResult(hopeVal, fearVal) {
        let resultKey, mainTitle, mainText, soundKey;

        if (hopeVal > fearVal) {
            resultKey = 'hopePath';
            soundKey = 'soundHope'; 
            mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.HopeTitle");
            mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.HopeDesc");
        } else if (fearVal > hopeVal) {
            resultKey = 'fearPath';
            soundKey = 'soundFear'; 
            mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.FearTitle");
            mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.FearDesc");
        } else {
            resultKey = 'criticalPath';
            soundKey = 'soundCritical'; 
            mainTitle = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.CriticalTitle");
            mainText = game.i18n.localize("DEATH_OPTIONS.Chat.Risk.CriticalDesc");
        }

        const diceText = `
            <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 10px; font-weight: bold; width: 100%;">
                <span style="color: #FFD700; text-shadow: 1px 1px 2px black;">Hope: ${hopeVal}</span>
                <span style="color: #da70d6; text-shadow: 1px 1px 2px black;">Fear: ${fearVal}</span>
            </div>`;
        
        const fullText = diceText + mainText;
        const bgImage = DeathSettings.get(resultKey) || "";

        if (soundKey) {
            game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_SOUND, soundKey: soundKey });
            DeathAudioManager.playSound(soundKey);
        }

        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_MEDIA, mediaKey: resultKey });
        DeathAudioManager.playMedia(resultKey);

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("DEATH_OPTIONS.Chat.Risk.Speaker") }),
            content: this._createStyledChatContent(mainTitle, fullText, bgImage),
            style: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
    }

    /**
     * Logic for "Blaze of Glory".
     * Plays sound, shows image, and posts a dramatic message.
     */
    static handleBlazeOfGlory(overlayRemoveCallback) {
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_SOUND, soundKey: 'soundBlaze' });
        DeathAudioManager.playSound('soundBlaze');
        
        const blazeMsg = DeathSettings.get('blazeChatMessage');
        const title = game.i18n.localize("DEATH_OPTIONS.Chat.Blaze.Title");
        const blazeKey = 'blazePath';
        const bgImage = DeathSettings.get(blazeKey) || "";

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: "Death Moves" }),
            content: this._createStyledChatContent(title, blazeMsg, bgImage),
            style: CONST.CHAT_MESSAGE_STYLES.OTHER
        });

        if(overlayRemoveCallback) overlayRemoveCallback();
        
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_MEDIA, mediaKey: blazeKey });
        DeathAudioManager.playMedia(blazeKey);
    }
}