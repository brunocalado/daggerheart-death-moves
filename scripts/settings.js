import { MODULE_ID } from './constants.js';

/**
 * Manages all module settings registration and access.
 * Triggered during Hooks.once('ready') via DeathMovesController.init().
 */
export class DeathSettings {

    /**
     * Registers all module settings with Foundry's settings API.
     */
    static register() {
        game.settings.register(MODULE_ID, 'automationMode', {
            name: "DEATH_OPTIONS.Settings.Automation.Name",
            hint: "DEATH_OPTIONS.Settings.Automation.Hint",
            scope: 'world',
            config: true,
            type: String,
            choices: {
                "none": "None",
                "core": "Core",
                "homebrew": "Homebrew"
            },
            default: "core",
            onChange: async (value) => {
                if (value === 'core' || value === 'homebrew') {
                    await DeathSettings.disableSystemAutomation();
                }
            }
        });

        game.settings.register(MODULE_ID, 'hpAutomationTrigger', {
            name: "DEATH_OPTIONS.Settings.HpAutomation.Name",
            hint: "DEATH_OPTIONS.Settings.HpAutomation.Hint",
            scope: 'world',
            config: true,
            type: String,
            choices: {
                "none": "DEATH_OPTIONS.Settings.HpAutomation.None",
                "dialog": "DEATH_OPTIONS.Settings.HpAutomation.Dialog",
                "auto": "DEATH_OPTIONS.Settings.HpAutomation.Auto"
            },
            default: "dialog"
        });

        game.settings.register(MODULE_ID, 'phoenixItemName', {
            name: "Phoenix Item Name",
            hint: "Name of the item that grants +1 bonus to Avoid Death rolls.",
            scope: 'world',
            config: true,
            type: String,
            default: "Phoenix Feather"
        });

        game.settings.register(MODULE_ID, 'blazeChatMessage', {
            name: "DEATH_OPTIONS.Settings.BlazeMessage.Name",
            hint: "DEATH_OPTIONS.Settings.BlazeMessage.Hint",
            scope: 'world',
            config: true,
            type: String,
            default: "A hero falls, but their legend rises..."
        });

        game.settings.register(MODULE_ID, 'showProbabilities', {
            name: "DEATH_OPTIONS.Settings.ShowProbabilities.Name",
            hint: "DEATH_OPTIONS.Settings.ShowProbabilities.Hint",
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });
    }

    /**
     * Disables the default Daggerheart system automation for death moves
     * to avoid conflicts with this module when in "Core" mode.
     */
    static async disableSystemAutomation() {
        if (CONFIG.DH?.SETTINGS?.gameSettings?.Automation) {
            const key = CONFIG.DH.SETTINGS.gameSettings.Automation;
            const setting = game.settings.get(CONFIG.DH.id, key);
            const currentSettings = typeof setting.toObject === 'function' ? setting.toObject() : setting;

            const da = currentSettings.deathMoveAutomation || {};

            if (da.avoidDeath !== false || da.blazeOfGlory !== false || da.riskItAll !== false) {
                await game.settings.set(CONFIG.DH.id, key, {
                    ...currentSettings,
                    deathMoveAutomation: {
                        ...da,
                        avoidDeath: false,
                        blazeOfGlory: false,
                        riskItAll: false
                    }
                });
                ui.notifications.info("Daggerheart Death Moves: System automation disabled (Core Mode active).");
            }
        }
    }

    /**
     * Retrieves a module setting value.
     * @param {string} key - The setting key to retrieve.
     * @returns {*} The setting value.
     */
    static get(key) {
        return game.settings.get(MODULE_ID, key);
    }
}
