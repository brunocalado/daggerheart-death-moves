/*!
 * Daggerheart: Death Moves
 * Copyright (c) 2025 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

export const MODULE_ID = 'daggerheart-death-moves';
export const SOCKET_NAME = `module.${MODULE_ID}`;

export const SOCKET_TYPES = {
    SHOW_UI: 'SHOW_UI',
    SHOW_SPECTATOR_UI: 'SHOW_SPECTATOR_UI',
    REMOVE_SPECTATOR_UI: 'REMOVE_SPECTATOR_UI',
    SHOW_ANNOUNCEMENT: 'SHOW_ANNOUNCEMENT',
    SHOW_BORDER: 'SHOW_BORDER',
    REMOVE_BORDER: 'REMOVE_BORDER',
    HIDE_UNSELECTED: 'HIDE_UNSELECTED',
    FLOW_COMPLETE: 'FLOW_COMPLETE'
};

const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates`;

/**
 * Every Handlebars template the module renders. All markup lives in these files;
 * no HTML is built by string concatenation in the scripts.
 *
 * Every entry is preloaded at startup, so a render mid-flow never waits on a fetch
 * while the overlay is already on screen.
 */
export const TEMPLATES = {
    overlay: `${TEMPLATE_ROOT}/overlay/overlay.hbs`,
    announcement: `${TEMPLATE_ROOT}/overlay/announcement.hbs`,
    border: `${TEMPLATE_ROOT}/overlay/border.hbs`,

    dialogTrigger: `${TEMPLATE_ROOT}/dialogs/trigger.hbs`,
    dialogRiskDistribution: `${TEMPLATE_ROOT}/dialogs/risk-distribution.hbs`,
    dialogScarPicker: `${TEMPLATE_ROOT}/dialogs/scar-picker.hbs`,
    dialogNegativeExperience: `${TEMPLATE_ROOT}/dialogs/negative-experience.hbs`,

    chatCard: `${TEMPLATE_ROOT}/chat/card.hbs`,
    chatSimple: `${TEMPLATE_ROOT}/chat/simple.hbs`,
    chatAvoid: `${TEMPLATE_ROOT}/chat/avoid.hbs`,
    chatRisk: `${TEMPLATE_ROOT}/chat/risk.hbs`,

    menuButton: `${TEMPLATE_ROOT}/menu-button.hbs`,
    supportedItems: `${TEMPLATE_ROOT}/supported-items-config.hbs`
};

/**
 * Ids of the elements the module parks directly on document.body. They are
 * module-prefixed because that document is shared with the core UI and every
 * other module, and each is looked up from more than one file.
 */
export const ELEMENT_IDS = {
    overlay: `${MODULE_ID}-overlay`,
    itemsBar: `${MODULE_ID}-items-bar`,
    announcement: `${MODULE_ID}-announcement`,
    border: `${MODULE_ID}-border`
};

/**
 * Classes every dialog carries so the Daggerheart stylesheet themes it. The system
 * keys its dialog styling off `daggerheart` + `dh-style`, and its wiki asks modules
 * to add `module` as well; MODULE_ID scopes this module's own rules on top.
 * @see https://github.com/Foundryborne/daggerheart/wiki/Theming-and-Style-Rules
 */
export const DIALOG_CLASSES = ['daggerheart', 'module', 'dh-style', 'dialog', MODULE_ID];

/**
 * The three death moves, in the order the overlay lays them out. The keys double as
 * the localization suffix under DEATH_OPTIONS.UI, the option's CSS modifier, and the
 * value broadcast over the socket when one is chosen.
 */
export const DEATH_MOVES = {
    avoid: { icon: 'fa-shield-heart', i18n: 'Avoid' },
    blaze: { icon: 'fa-fire', i18n: 'Blaze' },
    risk: { icon: 'fa-dice-d12', i18n: 'Risk' }
};

/**
 * Items this module automates, keyed by a stable id used for form fields and for
 * localization under DEATH_OPTIONS.Items.
 *
 * Matching is by source uuid, never by name: a translation module or a player
 * renaming their copy changes the name but never the uuid. `uuid` is only the
 * default — each world can point a slot at a different item through the
 * Supported Items window. `name` and `img` are fallbacks for displaying a slot
 * whose uuid no longer resolves, so the window can still say what is missing.
 */
export const SUPPORTED_ITEMS = {
    phoenix: {
        uuid: "Compendium.daggerheart.loot.Item.QNtzJSVENww63THa",
        name: "Phoenix Feather",
        img: "icons/commodities/materials/feather-red.webp"
    },
    reliquary: {
        uuid: "Compendium.daggerheart.loot.Item.PAZL4sEq7UB5sLsA",
        name: "Reliquary of the Sightless Saint",
        img: "icons/commodities/treasure/totem-wood-face-brown.webp"
    },
    heroplate: {
        uuid: "Compendium.daggerheart.armors.Item.ukIkx5TCBUlgleBw",
        name: "Hallowed Heroplate",
        img: "icons/equipment/chest/breastplate-collared-steel-grey.webp"
    },
    tears: {
        uuid: "Compendium.daggerheart.consumables.Item.gOFwztGSAAH4iLlG",
        name: "Tears of the Undying Hero",
        img: "icons/consumables/potions/flask-corked-blue.webp"
    },
    sprite: {
        uuid: "Compendium.daggerheart.consumables.Item.4VcsFnUD9VHm9ie8",
        name: "Sprite Bottle",
        img: "icons/consumables/drinks/alcohol-spirits-bottle-green.webp"
    }
};

export const ITEM_SOURCES_SETTING = 'itemSources';
export const MISSING_ITEM_IMG = 'icons/svg/hazard.svg';

/**
 * Dice So Nice appearance for the Hope and Fear dice, used when the Daggerheart
 * system cannot be asked for the world's own configured styling. The values are
 * the system's own defaults, so an unconfigured world still rolls dice that look
 * like everyone else's duality dice.
 */
export const FALLBACK_DICE_APPEARANCE = {
    hope: { foreground: '#ffffff', background: '#ffe760', outline: '#000000', edge: '#ffffff' },
    fear: { foreground: '#000000', background: '#0032b1', outline: '#ffffff', edge: '#000000' }
};
