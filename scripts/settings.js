import { MODULE_ID, SUPPORTED_ITEMS, ITEM_SOURCES_SETTING } from './constants.js';
import { SupportedItemsConfig } from './supported-items-config.js';

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

        // Slots are stored as source uuids, so a renamed or translated copy on a
        // sheet still matches. Kept out of the settings list because the window
        // below is a drop target, not a set of text fields.
        game.settings.register(MODULE_ID, ITEM_SOURCES_SETTING, {
            scope: 'world',
            config: false,
            type: Object,
            default: Object.fromEntries(Object.entries(SUPPORTED_ITEMS).map(([key, def]) => [key, def.uuid]))
        });

        game.settings.registerMenu(MODULE_ID, 'supportedItemsMenu', {
            name: "DEATH_OPTIONS.Settings.ItemSources.Name",
            hint: "DEATH_OPTIONS.Settings.ItemSources.Hint",
            label: "DEATH_OPTIONS.Settings.ItemSources.Label",
            icon: 'fas fa-scroll',
            type: SupportedItemsConfig,
            restricted: true
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

    /**
     * Source uuid this world uses for one of the supported items.
     * @param {string} key - A key of SUPPORTED_ITEMS (phoenix, reliquary, ...).
     * @returns {string} The configured uuid, or the one the item ships with.
     */
    static getItemSource(key) {
        const sources = this.get(ITEM_SOURCES_SETTING) ?? {};
        return sources[key] || SUPPORTED_ITEMS[key]?.uuid;
    }
}
