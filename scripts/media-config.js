import { MODULE_ID } from './constants.js';
import { DeathSettings } from './settings.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class DeathMediaConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    
    static DEFAULT_OPTIONS = {
        id: "death-moves-media-config",
        tag: "form",
        window: {
            title: "DEATH_OPTIONS.Settings.MediaConfig.Name",
            icon: "fas fa-photo-video",
            resizable: true
        },
        position: {
            width: 600,
            height: "auto"
        },
        form: {
            handler: DeathMediaConfig.formHandler,
            submitOnChange: false,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            template: `modules/${MODULE_ID}/templates/media-config.hbs`
        }
    };

    /** @override */
    async _prepareContext(options) {
        // Recupera as definições da classe DeathSettings
        const imgDefs = DeathSettings.getImageDefinitions();
        const audioDefs = DeathSettings.getAudioDefinitions();

        // Mapeia para o contexto do Handlebars
        const images = imgDefs.map(def => ({
            key: def.key,
            name: game.i18n.localize(`DEATH_OPTIONS.Settings.${def.locKey}.Name`),
            hint: game.i18n.localize(`DEATH_OPTIONS.Settings.${def.locKey}.Hint`),
            value: game.settings.get(MODULE_ID, def.key)
        }));

        const sounds = audioDefs.map(def => ({
            key: def.key,
            name: game.i18n.localize(`DEATH_OPTIONS.Settings.${def.locKey}.Name`),
            hint: game.i18n.localize(`DEATH_OPTIONS.Settings.${def.locKey}.Hint`),
            value: game.settings.get(MODULE_ID, def.key)
        }));

        return { images, sounds };
    }

    /** @override */
    _onRender(context, options) {
        // Lógica manual de Abas (Tabs) para ApplicationV2
        const html = this.element;
        
        // Ativa a primeira aba por padrão se nenhuma estiver ativa
        if (!html.querySelector('.tab-nav.active')) {
            this._activateTab('images');
        }

        const tabs = html.querySelectorAll('.tab-nav');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.currentTarget.dataset.tab;
                this._activateTab(target);
            });
        });
    }

    _activateTab(tabName) {
        const html = this.element;
        
        // Atualiza botões de navegação
        html.querySelectorAll('.tab-nav').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });

        // Atualiza conteúdo
        html.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.dataset.tab === tabName);
            // Esconde/Mostra via display style para garantir
            c.style.display = c.dataset.tab === tabName ? 'block' : 'none';
        });
    }

    /**
     * Processa o salvamento do formulário
     */
    static async formHandler(event, form, formData) {
        const data = formData.object;
        
        // Salva cada configuração
        for (const [key, value] of Object.entries(data)) {
            await game.settings.set(MODULE_ID, key, value);
        }

        ui.notifications.info(game.i18n.localize("DEATH_OPTIONS.Settings.MediaConfig.Saved"));
    }
}