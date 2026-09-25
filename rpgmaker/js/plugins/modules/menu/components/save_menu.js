import { BaseComponent } from '../../common/components/base_component.js';
import { ScrollableListComponent } from '../../common/components/scrollable_list_component.js';
import { PromiseResolve } from '../../common/helpers/promise_resolve.js';

/**
 * @typedef {{
 *  title: string,
 *  playTime: string
 * }} SaveFile
 */

export class SaveMenuComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'save-menu-component';
    }

    get componentCssStyle() {
        return /*css*/`

        `;
    }

    constructor() {
        super();

        this._list = new ScrollableListComponent();
        this.appendChild(this._list);
    }

    /**
     * 
     * @param {[SaveFile]} saveFiles 
     * @param {number} [defaultIndex=0] 
     * @returns {Promise<import('../../message/components/choices_list.js').ChoiceListPlayerChoice>}
     */
    async saveMenuStart(saveFiles, defaultIndex = 0) {
        const choices = saveFiles.map((file, index) => {
            const id = index + 1;

            return {
                text: /*html*/`<span class="save-id">${id}</span><span class="save-title">${file.title}</span><span class="save-playtime">${file.playTime}</span>`,
                id
            }
        });

        return await this._list.choicesListTakeOneChoice(choices, defaultIndex);
    }

    get choicesList() {
        return this._list;
    }

}