# 2.2

- [Added] Support for "Reliquary of the Sightless Saint": +1 to the Hope Die on Risk It All.
- [Added] Support for "Hallowed Heroplate": before the Risk It All dice, a slider lets you spend any amount of Hope, raising the Hope Die by the amount spent. The once-per-long-rest limit consumes the armor's own Blessed action counter, so the system's long rest refreshes it.
- [Added] Support for "Tears of the Undying Hero": carrying the potion replaces the death move with one final action roll. The potion is consumed and the character is left unconscious until an ally uses the Tend to Wounds downtime move.
- [Added] Support for "Sprite Bottle": carrying the bottle replaces the death move. All Hit Points are cleared and the bottle is consumed.
- [Added] Supported Items window, opened from a button in the settings panel. One drop slot per automated item — drag an item from a compendium or a character sheet onto a slot to change what the automation looks for.
- [Changed] Items are matched by source instead of by name, so a renamed or translated copy on a character sheet still works. An item only carries a source if it came from a compendium; homebrew created directly in the world Items directory has to be placed in a world compendium first.
- [Changed] Risk It All probabilities are calculated instead of hardcoded, and account for the Reliquary bonus.
- [Changed] Sprite Bottle and Tears of the Undying Hero only act when Automation Mode is Core or Homebrew. With automation off the normal death move still appears.
- [Removed] Phoenix Item Name setting, replaced by the Supported Items window. A world that had renamed the item needs to point that slot at its own item again.
- [Removed] Unused assets/ folder — audio and images orphaned by the media removal in 2.0.0.

# 2.0.1

- Core automation will use an active effect with SCAR instead of modifying the actor.
- Homebrew automation will use an active effect with SCAR instead of hope max AE.

# 2.0.0

- After playing for a while with the visual effects, it became clear that the only truly beneficial part was the death moves automation combined with the homebrew. Because of this, this module has been rebuilt, removing everything that wasn't providing the best value for the sessions. Based on my experience, the recommended workflow now is to activate the scars homebrew and enable the module's automation to detect the last HP of linked actors.
- [Removed] Media system (image overlays and sound playback)
- [Removed] Media Config settings menu and all image/audio path settings
- [Removed] Media mode selector (full/audio/image/minimal) — now always minimal
- [Removed] Countdown timer and countdown duration setting
- [Removed] Simultaneous Risk It All roll — sequential (Fear then Hope) is now the only mode
- [Removed] GM Full Screen setting
- [Removed] Sound Language setting
- [Changed] Risk It All always rolls sequentially (Fear first, then Hope)
- [Changed] Overlay always renders in compact mode
- [Changed] Chat cards no longer display background images
- [Changed] Simplified settings panel to essentials only

# 1.2.5
- Homebrew automated: https://www.reddit.com/r/daggerheart/comments/1nrdzxj/alternate_scar_rules_20_feedback_feedforward/


# 1.2.4
- Mode setting: disable image/sound
- Auto Trigger

# 1.2.3
- Death Move Automation Included: Add Scar and Update HP/Stress
- Auto disable system Automation if Core is selected.

# 1.2.2
- Fixed duplicated audio
- Removed warnings from messages
- Risk It All shows correct probability
- Style improvements
- Counter will show to everyone
- support for "Phoenix Feather"
- delay for result of avoid death increased
- improved settings display

# 1.2.1
- update for appv2