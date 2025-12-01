import { DeathSettings } from './settings.js';

export class DeathAudioManager {
    static currentRequestSound = null;

    static playSound(settingKey) {
        const soundSrc = DeathSettings.get(settingKey);
        if (soundSrc) {
            AudioHelper.play({src: soundSrc, volume: 1.0, autoplay: true, loop: false}, false);
        }
    }

    static stopCurrentSound() {
        if (this.currentRequestSound && typeof this.currentRequestSound.stop === 'function') {
            this.currentRequestSound.stop();
        }
        this.currentRequestSound = null;
    }

    // Maps visual media keys to their corresponding audio settings
    static playMedia(settingKey) {
        let soundSetting = "";
        if (settingKey === 'hopePath') soundSetting = 'soundHope';
        if (settingKey === 'fearPath') soundSetting = 'soundFear';
        if (settingKey === 'criticalPath') soundSetting = 'soundCritical';
        if (settingKey === 'avoidSafePath') soundSetting = 'soundAvoidSafe';
        if (settingKey === 'avoidScarPath') soundSetting = 'soundAvoidScar';
        if (settingKey === 'blazePath') soundSetting = 'soundBlaze';

        if (soundSetting) this.playSound(soundSetting);

        const src = DeathSettings.get(settingKey);
        if (!src) return Promise.resolve();
        
        // Dynamic import to avoid circular dependency
        return import('./ui.js').then(module => {
             return new Promise(resolve => {
                module.DeathUI.showMediaOverlay(src, resolve);
             });
        });
    }
}