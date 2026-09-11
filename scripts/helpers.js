/*!
 * Daggerheart: Death Moves
 * Copyright (c) 2025 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

/**
 * Shared helpers. Imports nothing, so anything can use it without risking an
 * import cycle.
 */

/**
 * Renders a template and hands back the element it describes.
 *
 * Every piece of markup in this module lives in a .hbs file, including the parts that
 * are parked on document.body rather than owned by an Application. Those still need a
 * real element to append, which is what this produces.
 * @param {string} template - Path to the Handlebars template.
 * @param {Object} [context] - Render context.
 * @returns {Promise<HTMLElement|null>} The template's root element.
 */
export async function renderElement(template, context = {}) {
    const html = await foundry.applications.handlebars.renderTemplate(template, context);

    // <template> parses the markup without running it or touching the live document.
    const holder = document.createElement('template');
    holder.innerHTML = html.trim();

    return holder.content.firstElementChild;
}

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

/**
 * The Heroplate's "Blessed" action, when it is still usable this long rest.
 * Lives here rather than in the logic module so the overlay can ask the same
 * question without importing it, which would close an import cycle.
 * @param {Item|null} armor - The equipped armor to inspect.
 * @returns {Object|null} The Blessed action, or null when spent or absent.
 */
export function heroplateBlessedAction(armor) {
    if (!armor) return null;

    const features = armor.system?.armorFeatures ?? [];
    const blessed = features.find(f => f.value === "blessed") ?? features.find(f => f.actionIds?.length);
    const actionId = blessed?.actionIds?.[0];
    const action = actionId ? armor.system?.actions?.get(actionId) : null;

    if (!action) return null;

    // uses.value counts upwards towards uses.max, matching the system's own check.
    const max = Number(action.uses?.max) || 0;
    const used = Number(action.uses?.value) || 0;
    if (max && used + 1 > max) return null;

    return action;
}
