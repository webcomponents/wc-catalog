import {css, html, LitElement} from 'lit';
import {customElement} from 'lit/decorators.js';
import '@material/mwc-textfield';

@customElement('wco-catalog-embed')
export class WCOCatalogEmbedElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      margin: 2rem;
      position: relative;
      min-width: 35rem;
      min-height: 35rem;
      background: #f8f9fa;
      padding: 16px;
      border-radius: 16px;
    }
    #search-field {
      --mdc-shape-small: 28px;
    }
  `;

  render() {
    return html`
      <mwc-textfield
        id="search-field"
        outlined
        iconTrailing="search"
      ></mwc-textfield>
      <p>TODO: search the registry...</p>
    `;
  }
}
