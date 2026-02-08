import { MODULE_ID } from './constants.js';
import { DeathMediaConfig } from './media-config.js'; // Importa a nova classe

export class DeathSettings {
    
    // --- DEFINIÇÕES ESTÁTICAS (Para reuso no Menu) ---
    
    static getImageDefinitions() {
        return [
            { key: 'backgroundPath', locKey: 'Background', default: `modules/${MODULE_ID}/assets/images/roll-screen.webp` },
            { key: 'hopePath', locKey: 'Hope', default: `modules/${MODULE_ID}/assets/images/hope.webp` },
            { key: 'fearPath', locKey: 'Fear', default: `modules/${MODULE_ID}/assets/images/fear.webp` },
            { key: 'criticalPath', locKey: 'Critical', default: `modules/${MODULE_ID}/assets/images/critical.webp` },
            { key: 'avoidSafePath', locKey: 'AvoidSafe', default: `modules/${MODULE_ID}/assets/images/avoid_safe.webp` },
            { key: 'avoidScarPath', locKey: 'AvoidScar', default: `modules/${MODULE_ID}/assets/images/avoid_scar.webp` },
            { key: 'blazePath', locKey: 'Blaze', default: `modules/${MODULE_ID}/assets/images/blaze.webp` }
        ];
    }

    static getAudioDefinitions() {
        return [
            { key: 'soundRollScreen', locKey: 'SoundRollScreen', filename: 'roll-screen.mp3' },
            { key: 'soundSuspense', locKey: 'SoundSuspense', filename: 'countdown.mp3' },
            { key: 'soundBlaze', locKey: 'SoundBlaze', filename: 'blaze.mp3' },
            { key: 'soundAvoidSafe', locKey: 'SoundAvoidSafe', filename: 'avoid_safe.mp3' },
            { key: 'soundAvoidScar', locKey: 'SoundAvoidScar', filename: 'avoid_scar.mp3' },
            { key: 'soundHope', locKey: 'SoundHope', filename: 'hope.mp3' },
            { key: 'soundFear', locKey: 'SoundFear', filename: 'fear.mp3' },
            { key: 'soundCritical', locKey: 'SoundCritical', filename: 'critical.mp3' },
            { key: 'soundChatAvoid', locKey: 'SoundChatAvoid', filename: 'choice-avoid-death.mp3' },
            { key: 'soundChatBlaze', locKey: 'SoundChatBlaze', filename: 'choice-blaze-of-glory.mp3' },
            { key: 'soundChatRisk', locKey: 'SoundChatRisk', filename: 'choice-risk-it-all.mp3' }
        ];
    }

    static register() {
        // 1. REGISTRO DO MENU (BOTÃO)
        game.settings.registerMenu(MODULE_ID, 'mediaConfigMenu', {
            name: "DEATH_OPTIONS.Settings.MediaConfig.Name",
            label: "DEATH_OPTIONS.Settings.MediaConfig.Label",
            hint: "DEATH_OPTIONS.Settings.MediaConfig.Hint",
            icon: "fas fa-photo-video",
            type: DeathMediaConfig,
            restricted: true
        });

        // 2. CONFIGURAÇÕES GERAIS (Visíveis)
        game.settings.register(MODULE_ID, 'mediaMode', {
            name: "DEATH_OPTIONS.Settings.MediaMode.Name",
            hint: "DEATH_OPTIONS.Settings.MediaMode.Hint",
            scope: 'world',
            config: true,
            type: String,
            choices: {
                "full": "DEATH_OPTIONS.Settings.MediaMode.Full",
                "audio": "DEATH_OPTIONS.Settings.MediaMode.Audio",
                "image": "DEATH_OPTIONS.Settings.MediaMode.Image",
                "minimal": "DEATH_OPTIONS.Settings.MediaMode.Minimal"
            },
            default: "full"
        });

        game.settings.register(MODULE_ID, 'gmFullScreen', {
            name: "DEATH_OPTIONS.Settings.GmFullScreen.Name",
            hint: "DEATH_OPTIONS.Settings.GmFullScreen.Hint",
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });

        game.settings.register(MODULE_ID, 'soundLanguage', {
            name: "DEATH_OPTIONS.Settings.SoundLanguage.Name",
            hint: "DEATH_OPTIONS.Settings.SoundLanguage.Hint",
            scope: 'world',
            config: false,
            type: String,
            choices: {
                "en": "English",
                "pt-BR": "Português (Brasil)",
                "custom": "Custom (Use File Paths in Media Menu)" // Texto ajustado
            },
            default: "en"
        });

        game.settings.register(MODULE_ID, 'countdownDuration', {
            name: "DEATH_OPTIONS.Settings.Duration.Name",
            hint: "DEATH_OPTIONS.Settings.Duration.Hint",
            scope: 'world',
            config: true,
            type: Number,
            range: { min: 0, max: 10, step: 1 },
            default: 6
        });

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

        game.settings.register(MODULE_ID, 'riskItAllDoubleRoll', {
            name: "DEATH_OPTIONS.Settings.RiskDoubleRoll.Name",
            hint: "DEATH_OPTIONS.Settings.RiskDoubleRoll.Hint",
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });

        game.settings.register(MODULE_ID, 'showProbabilities', {
            name: "DEATH_OPTIONS.Settings.ShowProbabilities.Name",
            hint: "DEATH_OPTIONS.Settings.ShowProbabilities.Hint",
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });

        // 3. REGISTRO DAS IMAGENS E ÁUDIOS (Ocultos / Config: false)
        this._registerHiddenPaths();
    }

    static _registerHiddenPaths() {
        const imageDefs = this.getImageDefinitions();
        const audioDefs = this.getAudioDefinitions();

        // Registra Imagens
        imageDefs.forEach(p => {
            game.settings.register(MODULE_ID, p.key, {
                name: `DEATH_OPTIONS.Settings.${p.locKey}.Name`, // Ainda precisa de nome para o sistema interno
                scope: 'world',
                config: false, // <--- OCULTO DA LISTA PRINCIPAL
                type: String,
                default: p.default,
                filePicker: 'image'
            });
        });

        // Registra Áudios
        audioDefs.forEach(a => {
            const defaultPath = a.filename ? `modules/${MODULE_ID}/assets/audio/english/${a.filename}` : "";
            game.settings.register(MODULE_ID, a.key, {
                name: `DEATH_OPTIONS.Settings.${a.locKey}.Name`,
                scope: 'world',
                config: false, // <--- OCULTO DA LISTA PRINCIPAL
                type: String,
                default: defaultPath,
                filePicker: 'audio'
            });
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

    static get(key) {
        const mode = game.settings.get(MODULE_ID, 'mediaMode');

        // If mode suppresses images (Audio Only or Minimalist), return empty string for image keys
        if (mode === 'audio' || mode === 'minimal') {
            const isImage = this.getImageDefinitions().some(d => d.key === key);
            if (isImage) return "";
        }

        return game.settings.get(MODULE_ID, key);
    }

    static getAudioPath(key) {
        const lang = game.settings.get(MODULE_ID, 'soundLanguage');
        
        // Mapeia filename baseado na key usando as definições
        const def = this.getAudioDefinitions().find(d => d.key === key);
        if (!def) return "";

        const filename = def.filename;

        if (lang === 'custom') {
            return game.settings.get(MODULE_ID, key);
        } else if (lang === 'pt-BR') {
            return `modules/${MODULE_ID}/assets/audio/ptbr/${filename}`;
        } else {
            return `modules/${MODULE_ID}/assets/audio/english/${filename}`;
        }
    }
}