import { MODULE_ID } from './constants.js';

/**
 * Manages module settings registration.
 */
export class DeathSettings {
    static register() {
        const imagePicker = { type: String, scope: 'world', config: true, filePicker: 'image' };
        const audioPicker = { type: String, scope: 'world', config: true, filePicker: 'audio' };

        // --- CONFIGURATION ---
        game.settings.register(MODULE_ID, 'countdownDuration', {
            name: "DEATH_OPTIONS.Settings.Duration.Name",
            hint: "DEATH_OPTIONS.Settings.Duration.Hint",
            scope: 'world',
            config: true,
            type: Number,
            range: { min: 0, max: 10, step: 1 },
            default: 6
        });

        game.settings.register(MODULE_ID, 'blazeChatMessage', {
            name: "DEATH_OPTIONS.Settings.BlazeMessage.Name",
            hint: "DEATH_OPTIONS.Settings.BlazeMessage.Hint",
            scope: 'world',
            config: true,
            type: String,
            default: "A hero falls, but their legend rises..."
        });

        // --- PROBABILITIES ---
        game.settings.register(MODULE_ID, 'showProbabilities', {
            name: "DEATH_OPTIONS.Settings.ShowProbabilities.Name",
            hint: "DEATH_OPTIONS.Settings.ShowProbabilities.Hint",
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });

        // --- IMAGES ---
        this._registerImages(imagePicker);

        // --- AUDIO ---
        this._registerAudio(audioPicker);
    }

    static _capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    static _registerImages(config) {
        const paths = {
            'backgroundPath': 'roll-screen.webp',
            'blazePath': 'blaze.webp',
            'avoidScarPath': 'avoid_scar.webp',
            'avoidSafePath': 'avoid_safe.webp',
            'hopePath': 'hope.webp',
            'fearPath': 'fear.webp',
            'criticalPath': 'critical.webp'
        };

        // Automatically register settings based on keys matching en.json
        for (const [key, file] of Object.entries(paths)) {
            const keyBase = key.replace('Path', '');
            const i18nKey = DeathSettings._capitalize(keyBase);
            
            game.settings.register(MODULE_ID, key, {
                name: `DEATH_OPTIONS.Settings.${i18nKey}.Name`, 
                hint: `DEATH_OPTIONS.Settings.${i18nKey}.Hint`,
                ...config,
                default: `modules/${MODULE_ID}/assets/images/${file}`
            });
        }
    }

    static _registerAudio(config) {
        const paths = {
            'soundSuspense': 'countdown.mp3',
            'soundBlaze': 'blaze.mp3',
            'soundAvoidSafe': 'avoid_safe.mp3',
            'soundAvoidScar': 'avoid_scar.mp3',
            'soundHope': 'hope.mp3',
            'soundFear': 'fear.mp3',
            'soundCritical': 'critical.mp3'
        };

        for (const [key, file] of Object.entries(paths)) {
            const i18nKey = DeathSettings._capitalize(key);

            game.settings.register(MODULE_ID, key, {
                name: `DEATH_OPTIONS.Settings.${i18nKey}.Name`,
                hint: `DEATH_OPTIONS.Settings.${i18nKey}.Hint`,
                ...config,
                default: `modules/${MODULE_ID}/assets/audio/${file}`
            });
        }
    }

    static get(key) {
        return game.settings.get(MODULE_ID, key);
    }
}