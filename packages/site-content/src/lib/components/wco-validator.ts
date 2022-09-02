import {LitElement, html, css} from 'lit';
import {customElement} from 'lit/decorators.js';
import {catalogStyles} from './wco-styles.js';
import './wco-card.js';
import './wco-catalog-embed.js';
import './wco-support-table.js';

@customElement('wco-validator')
export class WCOHomeElement extends LitElement {
  static styles = [
    catalogStyles,
    css`
      :host {
        display: block;
      }
      section {
        border-bottom: 1px solid #ededed;
        padding: 48px;
      }
      section h2 {
        font-weight: normal;
      }
      section.columns {
        --switcher-target-container-width: 50rem;
        --gutter: clamp(3.75rem, 3.21rem + 2.68vw, 5.625rem)
          clamp(2.375rem, 1.98rem + 1.96vw, 3.75rem);
        display: flex;
        flex-wrap: wrap;
        gap: var(--gutter, clamp(1.375rem, 1.2rem + 0.89vw, 2rem));
        align-items: var(--switcher-vertical-alignment, flex-start);
      }
      section.columns > * {
        flex-grow: 1;
        flex-basis: calc(
          (var(--switcher-target-container-width, 40rem) - 100%) * 999
        );
      }
      #about {
        background: #f8f9fa;
      }
      #learn-card {
        background: white;
      }
      .cards > * {
        display: block;
        margin-bottom: 1em;
      }
    `,
  ];

  render() {
    return html`
      <section id="about">
        <div>
          <h2>Custom Element Manifest Validator</h2>
          <p>
            Enter an npm package name to validate:
          </p>
          <input size="50" @change=${this._onChange}>
        </div>
      </section>
    `;
  }

  _onChange() {

  }
}
