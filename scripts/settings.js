import { MODULE_ID } from './constants.js';

/**
 * Manages module settings registration.
 */
export class DeathSettings {
    static register() {
        const imagePicker = { type: String, scope: 'world', config: true, filePicker: 'image' };
        const audioPicker = { type: String, scope: 'world', config: true, filePicker: 'audio' };

        // --- CONFIGURATION ---
        game.settings.register(MODULE_ID, 'soundLanguage', {
            name: "DEATH_OPTIONS.Settings.SoundLanguage.Name",
            hint: "DEATH_OPTIONS.Settings.SoundLanguage.Hint",
            scope: 'world',
            config: true,
            type: String,
            choices: {
                "en": "English",
                "pt-BR": "Português (Brasil)",
                "custom": "Custom (Use File Paths Below)"
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

        // --- Nome do Item Phoenix Feather ---
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

        // --- IMAGE PATHS ---
        this._registerImagePaths(imagePicker);

        // --- AUDIO PATHS ---
        this._registerAudioPaths(audioPicker);
    }

    static _registerImagePaths(configObj) {
        const paths = [
            { key: 'backgroundPath', locKey: 'Background', default: `modules/${MODULE_ID}/assets/images/roll-screen.webp` },
            { key: 'hopePath', locKey: 'Hope', default: `modules/${MODULE_ID}/assets/images/hope.webp` },
            { key: 'fearPath', locKey: 'Fear', default: `modules/${MODULE_ID}/assets/images/fear.webp` },
            { key: 'criticalPath', locKey: 'Critical', default: `modules/${MODULE_ID}/assets/images/critical.webp` },
            { key: 'avoidSafePath', locKey: 'AvoidSafe', default: `modules/${MODULE_ID}/assets/images/avoid_safe.webp` },
            { key: 'avoidScarPath', locKey: 'AvoidScar', default: `modules/${MODULE_ID}/assets/images/avoid_scar.webp` },
            { key: 'blazePath', locKey: 'Blaze', default: `modules/${MODULE_ID}/assets/images/blaze.webp` }
        ];

        paths.forEach(p => {
            game.settings.register(MODULE_ID, p.key, {
                name: `DEATH_OPTIONS.Settings.${p.locKey}.Name`,
                hint: `DEATH_OPTIONS.Settings.${p.locKey}.Hint`,
                scope: 'world',
                config: true,
                type: String,
                default: p.default,
                filePicker: 'image'
            });
        });
    }

    static _registerAudioPaths(configObj) {
        // Definimos os nomes dos arquivos aqui para usar nos DEFAULTS
        const filenames = {
            'soundRollScreen': 'roll-screen.mp3',
            'soundSuspense': 'countdown.mp3',
            'soundBlaze': 'blaze.mp3',
            'soundAvoidSafe': 'avoid_safe.mp3',
            'soundAvoidScar': 'avoid_scar.mp3',
            'soundHope': 'hope.mp3',
            'soundFear': 'fear.mp3',
            'soundCritical': 'critical.mp3',
            'soundChatAvoid': 'choice-avoid-death.mp3',
            'soundChatBlaze': 'choice-blaze-of-glory.mp3',
            'soundChatRisk': 'choice-risk-it-all.mp3'
        };

        const audioMap = [
            { key: 'soundRollScreen', locKey: 'SoundRollScreen' },
            { key: 'soundSuspense', locKey: 'SoundSuspense' },
            { key: 'soundBlaze', locKey: 'SoundBlaze' },
            { key: 'soundAvoidSafe', locKey: 'SoundAvoidSafe' },
            { key: 'soundAvoidScar', locKey: 'SoundAvoidScar' },
            { key: 'soundHope', locKey: 'SoundHope' },
            { key: 'soundFear', locKey: 'SoundFear' },
            { key: 'soundCritical', locKey: 'SoundCritical' },
            { key: 'soundChatAvoid', locKey: 'SoundChatAvoid' },
            { key: 'soundChatBlaze', locKey: 'SoundChatBlaze' },
            { key: 'soundChatRisk', locKey: 'SoundChatRisk' }
        ];

        audioMap.forEach(a => {
            const filename = filenames[a.key];
            // CORREÇÃO: Define o caminho padrão em inglês em vez de string vazia
            const defaultPath = filename ? `modules/${MODULE_ID}/assets/audio/english/${filename}` : "";

            game.settings.register(MODULE_ID, a.key, {
                name: `DEATH_OPTIONS.Settings.${a.locKey}.Name`,
                hint: `DEATH_OPTIONS.Settings.${a.locKey}.Hint`,
                scope: 'world',
                config: true, 
                type: String,
                default: defaultPath, 
                filePicker: 'audio'
            });
        });
    }

    static get(key) {
        return game.settings.get(MODULE_ID, key);
    }

    static getAudioPath(key) {
        const lang = game.settings.get(MODULE_ID, 'soundLanguage');
        
        const filenames = {
            'soundRollScreen': 'roll-screen.mp3',
            'soundSuspense': 'countdown.mp3',
            'soundBlaze': 'blaze.mp3',
            'soundAvoidSafe': 'avoid_safe.mp3',
            'soundAvoidScar': 'avoid_scar.mp3',
            'soundHope': 'hope.mp3',
            'soundFear': 'fear.mp3',
            'soundCritical': 'critical.mp3',
            'soundChatAvoid': 'choice-avoid-death.mp3',
            'soundChatBlaze': 'choice-blaze-of-glory.mp3',
            'soundChatRisk': 'choice-risk-it-all.mp3'
        };

        const filename = filenames[key];

        if (lang === 'custom') {
            return game.settings.get(MODULE_ID, key);
        } else if (lang === 'pt-BR') {
            return `modules/${MODULE_ID}/assets/audio/ptbr/${filename}`;
        } else {
            return `modules/${MODULE_ID}/assets/audio/english/${filename}`;
        }
    }
}