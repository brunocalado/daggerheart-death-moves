import { MODULE_ID, SUPPORTED_ITEMS, ITEM_SOURCES_SETTING, SUPPORTED_ITEMS_TEMPLATE, MISSING_ITEM_IMG } from './constants.js';
import { readDragData } from './helpers.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Settings window listing every item the module automates, one drop slot each.
 * Slots hold a source uuid, so a renamed or translated copy still matches.
 * Opened from the Supported Items button in Configure Settings.
 */
export class SupportedItemsConfig extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: `${MODULE_ID}-supported-items`,
        classes: [MODULE_ID, 'death-moves-supported-items'],
        window: {
            title: "DEATH_OPTIONS.Settings.ItemSources.Title",
            icon: 'fas fa-scroll',
            contentClasses: ['standard-form']
        },
        position: { width: 640, height: 'auto' },
        actions: {
            resetSlot: this.prototype._onResetSlot,
            resetAll: this.prototype._onResetAll
        }
    };

    static PARTS = {
        form: { template: SUPPORTED_ITEMS_TEMPLATE }
    };

    /**
     * The uuid each slot currently points at, defaults filled in.
     * @returns {Object<string, string>} Slot key to source uuid.
     */
    static getSources() {
        const stored = game.settings.get(MODULE_ID, ITEM_SOURCES_SETTING) ?? {};
        const sources = {};

        for (const [key, def] of Object.entries(SUPPORTED_ITEMS)) {
            sources[key] = stored[key] || def.uuid;
        }

        return sources;
    }

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const sources = SupportedItemsConfig.getSources();

        context.fields = await Promise.all(Object.entries(SUPPORTED_ITEMS).map(async ([key, def]) => {
            const uuid = sources[key];
            let doc = null;

            // A uuid pointing at an uninstalled compendium simply does not resolve.
            try { doc = await fromUuid(uuid); } catch (err) { doc = null; }

            return {
                key,
                uuid,
                name: doc?.name ?? def.name,
                img: doc?.img ?? MISSING_ITEM_IMG,
                resolved: !!doc,
                isDefault: uuid === def.uuid,
                label: game.i18n.localize(`DEATH_OPTIONS.Items.${key}.Label`),
                hint: game.i18n.localize(`DEATH_OPTIONS.Items.${key}.Hint`)
            };
        }));

        return context;
    }

    /** @inheritDoc */
    _onRender(context, options) {
        for (const slot of this.element.querySelectorAll('[data-drop-key]')) {
            slot.addEventListener('dragover', (event) => {
                event.preventDefault();
                slot.classList.add('is-dragover');
            });
            slot.addEventListener('dragleave', () => slot.classList.remove('is-dragover'));
            slot.addEventListener('drop', (event) => {
                slot.classList.remove('is-dragover');
                this._onDropItem(event, slot.dataset.dropKey);
            });
        }
    }

    /**
     * Points one slot at the dropped item's source.
     * @param {DragEvent} event - The drop event.
     * @param {string} key - The slot receiving the drop.
     */
    async _onDropItem(event, key) {
        event.preventDefault();

        const data = readDragData(event);
        if (data?.type !== "Item" || !data.uuid) {
            return ui.notifications.warn(game.i18n.localize("DEATH_OPTIONS.Settings.ItemSources.DropItemOnly"));
        }

        const item = await fromUuid(data.uuid);
        if (!item) {
            return ui.notifications.warn(game.i18n.localize("DEATH_OPTIONS.Settings.ItemSources.DropUnresolved"));
        }

        // Dropping a copy off a character sheet should configure the item it came
        // from, not that one sheet's copy.
        const uuid = item._stats?.compendiumSource ?? item.flags?.core?.sourceId ?? data.uuid;

        await this._saveSource(key, uuid);
        ui.notifications.info(game.i18n.format("DEATH_OPTIONS.Settings.ItemSources.Assigned", { item: item.name }));
    }

    /**
     * Restores one slot to the item it ships with.
     * @param {PointerEvent} event - The originating click.
     * @param {HTMLElement} target - The clicked element.
     */
    async _onResetSlot(event, target) {
        const key = target.dataset.key;
        await this._saveSource(key, SUPPORTED_ITEMS[key].uuid);
    }

    /**
     * Restores every slot to the item it ships with.
     */
    async _onResetAll() {
        const defaults = {};
        for (const [key, def] of Object.entries(SUPPORTED_ITEMS)) defaults[key] = def.uuid;

        await game.settings.set(MODULE_ID, ITEM_SOURCES_SETTING, defaults);
        this.render();
    }

    /**
     * Stores one slot and redraws.
     * @param {string} key - The slot to write.
     * @param {string} uuid - The source uuid to store.
     */
    async _saveSource(key, uuid) {
        if (!(key in SUPPORTED_ITEMS)) return;

        const sources = { ...SupportedItemsConfig.getSources(), [key]: uuid };
        await game.settings.set(MODULE_ID, ITEM_SOURCES_SETTING, sources);
        this.render();
    }
}
