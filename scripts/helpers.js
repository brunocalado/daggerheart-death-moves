/**
 * Shared helpers. Imports nothing from the rest of the module so anything can use it.
 */

/**
 * Every uuid that can identify where an item on a sheet came from.
 * A copy dragged onto an actor keeps a pointer back to its source, which is what
 * survives a rename or a translation module. The item's own uuid is included last
 * so a slot can be pointed at one specific copy when that is what someone wants.
 * @param {Item} item - The item to inspect.
 * @returns {string[]} Candidate source uuids, most meaningful first.
 */
export function itemSourceUuids(item) {
    return [
        item._stats?.compendiumSource,
        item._stats?.duplicateSource,
        item.flags?.core?.sourceId,
        item.uuid
    ].filter(uuid => typeof uuid === 'string' && uuid.length > 0);
}

/**
 * Finds the first item on an actor that came from the given source uuid.
 * @param {Actor|null} actor - The actor to search.
 * @param {string} uuid - The source uuid to match.
 * @param {Function} [filter] - Optional extra test the item must also pass.
 * @returns {Item|null} The matching item, or null.
 */
export function findItemBySource(actor, uuid, filter = null) {
    if (!actor || !uuid) return null;

    return actor.items.find(item => {
        if (!itemSourceUuids(item).includes(uuid)) return false;
        return filter ? filter(item) : true;
    }) ?? null;
}

/**
 * Reads a dragged document off a drop event.
 * @param {DragEvent} event - The drop event.
 * @returns {Object|null} The parsed drag payload, or null when it is not one.
 */
export function readDragData(event) {
    const TextEditorImpl = foundry.applications.ux.TextEditor.implementation
        ?? foundry.applications.ux.TextEditor;

    try {
        return TextEditorImpl.getDragEventData(event);
    } catch (err) {
        // Not every drop carries Foundry's payload — a plain text drag lands here.
        return null;
    }
}
