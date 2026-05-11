export class MessageBox extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.shadowRoot.innerHTML = `<p>TEST!</p>`;
    }

}

customElements.define('message-box', MessageBox);