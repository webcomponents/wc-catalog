import {LitElement, html, css} from 'lit';
import {customElement} from 'lit/decorators.js';
import {catalogStyles} from './wco-styles.js';
import './wco-card.js';
import './wco-catalog-embed.js';
import './wco-support-table.js';

@customElement('wco-home')
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
      <section id="about" class="columns">
        <div>
          <h2>About Web Components</h2>
          <img src="/assets/illustrations/UI%20design%20_outline.svg" />
          <h3>Interoperable components, usable anywhere HTML is!</h3>
          <p>
            Web components let you build and use components that with any
            framework, in plain HTML, static-site generators, CMSes and more.
          </p>
        </div>
        <div class="cards">
          <a href="/" class="card-link">
            <wco-card id="learn-card">
              <img
                slot="background"
                src="/assets/illustrations/Computer%20display_outline.svg"
              />
              <h3>Learn</h3>
              Learn all about web components: what they are, how to build them,
              useful libraries, and more.
            </wco-card>
          </a>
          <a href="/" class="card-link">
            <wco-card id="libraries-card">
              <img
                slot="background"
                src="/assets/illustrations/Computer%20display_outline.svg"
              />
              <h3>Libraries</h3>
              Libraries help you build web components with modern developer
              experience and features like templating and reactivify.
            </wco-card>
          </a>
        </div>
      </section>
      <section id="catalog">
        <h2>Web component catalog</h2>
        <wco-catalog-embed></wco-catalog-embed>
      </section>
      <section>
        <wco-support-table></wco-support-table>
      </section>
    `;
  }
}
