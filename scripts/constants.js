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
export const SUPPORTED_ITEMS_TEMPLATE = `modules/${MODULE_ID}/templates/supported-items-config.hbs`;
export const MISSING_ITEM_IMG = 'icons/svg/hazard.svg';
