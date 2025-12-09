export const MODULE_ID = 'daggerheart-death-moves';
export const SOCKET_NAME = `module.${MODULE_ID}`;

export const SOCKET_TYPES = {
    SHOW_UI: 'SHOW_UI',
    SHOW_SPECTATOR_UI: 'SHOW_SPECTATOR_UI', // Novo: Tela passiva para outros jogadores
    REMOVE_SPECTATOR_UI: 'REMOVE_SPECTATOR_UI', // Novo: Remove tela passiva
    SHOW_ANNOUNCEMENT: 'SHOW_ANNOUNCEMENT', // Novo: Banner de texto
    PLAY_MEDIA: 'PLAY_MEDIA',
    PLAY_SOUND: 'PLAY_SOUND',
    SHOW_BORDER: 'SHOW_BORDER',
    REMOVE_BORDER: 'REMOVE_BORDER'
};