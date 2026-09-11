# 2.5

- [Changed] The skull the character sheet draws over the portrait once every Hit Point is marked now sends this module's death move screen instead of opening the system's own Death Move dialog. It is the same screen the GM sends from the Daggerheart menu, so both ways into a death move now end in the same place.
- [Changed] A player pressing that skull asks the GM's client to send the screen rather than opening it alone — the queue, the spectator view and the chat cards are all driven from the GM. With two GMs connected only the designated one acts, so the death move is never started twice.
- [Changed] The skull is purple with a light rim instead of the system's desaturated beige, so it reads as this module's button rather than the system's.
- [Added] A warning when the skull is pressed on a character that is not the one assigned to that player, and when no GM is connected to send the screen. A death move acts on the assigned character, so an unassigned sheet would otherwise resolve against the wrong one.

# 2.4

- [Changed] Every window the module opens now follows the Daggerheart system's theming rules. Each one carries the system's own dialog classes, so it inherits the parchment frame, inputs and buttons instead of rendering half Daggerheart and half core Foundry — which is what made the Trigger button come out in Foundry's orange.
- [Changed] Typography follows the system's three tiers: Cinzel Decorative for titles, Cinzel for headings, Montserrat for body text. The module was using Modesto Condensed and Signika, which are core Foundry fonts and belong to no part of Daggerheart.
- [Changed] Every colour resolves to a Daggerheart token — golden, dark blue, beige, red, chat blue — instead of hand-picked hex values, so the module tracks the system's palette rather than re-deciding it. Hope keeps the system's golden and Fear its blue; Risk It All's purple is now the system's chat blue.
- [Changed] The Hope and Fear dice of a death move have their own Dice So Nice styling — a yellow Hope die and a purple Fear die, both metal with no texture — so the roll that decides whether a character lives reads as its own moment instead of looking like any other duality roll.
- [Fixed] The announcement banner never faded out — it vanished. Its entry animation was holding the opacity and outranking the fade.
- [Fixed] The consumable buttons spilled their text outside their own border whenever an item name wrapped to two lines, because core gives every button a fixed height.
- [Fixed] The three death moves wrapped to two rows on a wide screen instead of sitting side by side.
- [Fixed] The Hope label on the Risk It All chat card was pale gold on the light parchment chat log, effectively unreadable. Chat messages sit outside any application, where the system's `light-dark()` theming does not resolve, so the card now flips its own colours under a light theme.
- [Fixed] The screen edge effect and the death move screen could be left stuck on a client. Rendering a template is asynchronous, so a socket telling a client to take one down could arrive before it was even on screen.
- [Changed] All markup moved out of the scripts and into template files. Nothing is assembled by string concatenation any more, including the chat cards, which used to carry about sixty lines of inline styling.
- [Changed] The single stylesheet was split into one file per concern — tokens, the death move screen, the screen effects, the dialogs, the chat cards, the Supported Items window — using CSS nesting and custom properties.
- [Added] Portuguese and English text for the strings that were hardcoded in English: the trigger dialog, the scar picker, the Negative Experience form, the roll breakdown in chat, and every notification.

# 2.3

- [Changed] Sprite Bottle and Tears of the Undying Hero are no longer spent on their own. Each carried item gets its own button on the death move screen and one click uses it, so nothing is consumed unless the player asks for it. Ignoring the buttons leads to the normal death move.
- [Changed] Item prompts no longer open separate dialog windows. The Hallowed Heroplate is a Hope slider inside the Risk It All button, and consumables are buttons below the three options, all on the death move screen itself.
- [Fixed] The Hallowed Heroplate slider was hidden with no explanation when the armor was not equipped, when the Blessed use was already spent, or when there was no Hope left. The armor now names the rule that is in the way. An unequipped armor is the common case, since it arrives from the compendium unequipped and grants none of its features until worn.
- [Fixed] The death move screen now scrolls when it is taller than the window. Centred content used to be clipped at the top with no way to reach it on a short screen.
- [Changed] All source files use LF line endings. Three were still CRLF, which git was already normalizing to LF on commit anyway.

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