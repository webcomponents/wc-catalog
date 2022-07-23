import {css, html, LitElement} from 'lit';
import {customElement} from 'lit/decorators.js';

@customElement('wco-card')
export class WCOCardElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      max-width: 35rem;
      position: relative;
      aspect-ratio: 16/9;
      justify-content: space-between;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      position: relative;
      padding: 1.25rem;
      border: 1px solid var(--color-stroke);
      border-radius: 10px;
      max-width: 37rem;
      text-decoration: none;
      word-break: break-word;
      background: var(--color-core-bg);
      /* box-sizing: content-box; */
    }
    :host(:hover) {
      outline: solid 2px blue;
    }
    slot[name='background'] {
      display: block;
      position: absolute;
      top: 0;
      right: 0;
      z-index: 0;
    }
    #content::slotted {
      z-index: 100;
    }
  `;

  render() {
    return html`
      <slot name="background"></slot>
      <slot id="content"></slot>
    `;
  }
}
