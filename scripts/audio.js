import { DeathSettings } from './settings.js';

export class DeathAudioManager {
    static currentRequestSound = null;

    /**
     * Plays a sound based on the key.
     * NOW USES DeathSettings.getAudioPath() to handle language selection.
     */
    static playSound(settingKey) {
        // Use the new helper method to resolve path based on language
        const soundSrc = DeathSettings.getAudioPath(settingKey);
        
        if (soundSrc) {
            // V13 FIX: AudioHelper is now namespaced under foundry.audio
            // Using broadcast: false because we handle socket synchronization manually in logic.js
            foundry.audio.AudioHelper.play({src: soundSrc, volume: 1.0, autoplay: true, loop: false}, false);
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
        // --- FIX: REMOVED AUTO-SOUND LOGIC ---
        // logic.js already calls playSound() explicitly alongside playMedia().
        // Keeping the sound logic here causes duplication (double audio).
        
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