import { DeathSettings } from './settings.js';
import { DeathAudioManager } from './audio.js';
import { SOCKET_NAME, SOCKET_TYPES } from './constants.js';

/**
 * Handles game rules, dice rolls, and chat messages.
 */
export class DeathLogic {
    
    static async handleAvoidDeath() {
        const roll = new Roll('1d12');
        await roll.evaluate();

        // Dice So Nice styling
        if (roll.terms[0]) {
            roll.terms[0].options.appearance = { colorset: "custom", foreground: "#000000", background: "#FFD700", outline: "#000000", texture: "none" };
        }

        if (game.dice3d) {
            try { await game.dice3d.showForRoll(roll, game.user, true); } catch (e) {}
        }

        const rollTotal = roll.total;
        const actor = game.user.character;
        let resultKey = null;
        let soundKey = null;
        let message = "";
        let flavor = "";

        if (actor) {
            const level = foundry.utils.getProperty(actor, "system.levelData.level.current") || 0;
            
            // Logic: <= Level is SCAR, > Level is SAFE
            if (rollTotal <= level) {
                // SCAR
                flavor = `<span style="color: #ff4500; font-weight:bold;">${game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.ResultScar")}</span>`;
                message = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.MsgScar");
                resultKey = 'avoidScarPath';
                soundKey = 'soundAvoidScar';
            } else {
                // SAFE
                flavor = `<span style="color: #4CAF50; font-weight:bold;">${game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.ResultSafe")}</span>`;
                message = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.MsgSafe");
                resultKey = 'avoidSafePath';
                soundKey = 'soundAvoidSafe';
            }
            message += `<br><span style="font-size: 0.8em; color: #aaa;">${game.i18n.format("DEATH_OPTIONS.Chat.Avoid.RollDetails", {roll: rollTotal, level: level})}</span>`;
        } else {
            // No Actor assigned
            flavor = game.i18n.localize("DEATH_OPTIONS.Chat.Avoid.Flavor");
            message = game.i18n.format("DEATH_OPTIONS.Chat.Avoid.NoActor", {roll: rollTotal});
        }

        // Trigger effects if result exists
        if (resultKey && soundKey) {
            game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_MEDIA, mediaKey: resultKey });
            game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_SOUND, soundKey: soundKey });
            DeathAudioManager.playMedia(resultKey);
            DeathAudioManager.playSound(soundKey);
        }

        // Send Chat Message
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: "Death Moves" }),
            flavor: flavor,
            content: `<div style="text-align: center; font-size: 1.2em; padding: 10px;">${message}</div>`,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        });
    }

    static async handleRiskItAll() {
        const roll = new Roll('1d12 + 1d12');
        await roll.evaluate();
        
        // Dice styling
        if (roll.terms[0]) roll.terms[0].options.appearance = { colorset: "custom", foreground: "#000000", background: "#FFD700", texture: "none" };
        if (roll.terms[2]) roll.terms[2].options.appearance = { colorset: "custom", foreground: "#FFFFFF", background: "#2c003e", texture: "none" };

        if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);

        const hopeVal = roll.terms[0].total;
        const fearVal = roll.terms[2].total;
        let resultKey, messageText;

        // Risk it All Rules
        if (hopeVal > fearVal) {
            resultKey = 'hopePath';
            messageText = `<div style="font-weight: bold; margin-bottom: 5px; color: #FFD700;">${game.i18n.localize("DEATH_OPTIONS.Chat.Risk.HopeTitle")}</div>
            <div>${game.i18n.localize("DEATH_OPTIONS.Chat.Risk.HopeDesc")}</div>`;
        } else if (fearVal > hopeVal) {
            resultKey = 'fearPath';
            messageText = `<div style="font-weight: bold; margin-bottom: 5px; color: #da70d6;">${game.i18n.localize("DEATH_OPTIONS.Chat.Risk.FearTitle")}</div>
            <div>${game.i18n.localize("DEATH_OPTIONS.Chat.Risk.FearDesc")}</div>`;
        } else {
            resultKey = 'criticalPath';
            messageText = `<div style="font-weight: bold; margin-bottom: 5px; color: #00ff00;">${game.i18n.localize("DEATH_OPTIONS.Chat.Risk.CriticalTitle")}</div>
            <div>${game.i18n.localize("DEATH_OPTIONS.Chat.Risk.CriticalDesc")}</div>`;
        }

        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_MEDIA, mediaKey: resultKey });
        DeathAudioManager.playMedia(resultKey);

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("DEATH_OPTIONS.Chat.Risk.Speaker") }),
            content: `
                <div style="text-align: center; font-size: 1.1em; color: #f0f0f0;">
                    <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 8px; font-weight: bold;">
                        <span style="color: #FFD700; text-shadow: 1px 1px 2px black;">Hope: ${hopeVal}</span>
                        <span style="color: #da70d6; text-shadow: 1px 1px 2px black;">Fear: ${fearVal}</span>
                    </div>
                    <div style="border-top: 1px solid #777; padding-top: 10px;">${messageText}</div>
                </div>
            `,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        });
    }

    static handleBlazeOfGlory(overlayRemoveCallback) {
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_SOUND, soundKey: 'soundBlaze' });
        DeathAudioManager.playSound('soundBlaze');
        
        const blazeMsg = DeathSettings.get('blazeChatMessage');
        const title = game.i18n.localize("DEATH_OPTIONS.Chat.Blaze.Title");

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: "Death Moves" }),
            content: `
                <div style="text-align: center; border: 2px solid #ff4500; padding: 10px; background: rgba(0,0,0,0.5);">
                    <h2 style="color: #ff4500; border-bottom: 1px solid #555; padding-bottom: 5px;">${title}</h2>
                    <p style="color: #eee;">${blazeMsg}</p>
                </div>
            `,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        });

        if(overlayRemoveCallback) overlayRemoveCallback();
        
        const blazeKey = 'blazePath';
        game.socket.emit(SOCKET_NAME, { type: SOCKET_TYPES.PLAY_MEDIA, mediaKey: blazeKey });
        DeathAudioManager.playMedia(blazeKey);
    }
}