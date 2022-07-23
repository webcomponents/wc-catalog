import {LitElement, html, css} from 'lit';
import {customElement} from 'lit/decorators.js';
import {catalogStyles} from './wco-styles.js';
import './wco-app-bar.js';
import './wco-card.js';
import './wco-catalog-embed.js';
import './wco-support-table.js';

@customElement('wco-app')
export class WCOAppElement extends LitElement {
  static styles = [
    catalogStyles,
    css`
      :host {
        display: block;
        min-height: 100vh;

        --color-shades-gray-glare: #d2d3d7;
        --color-stroke: var(--color-shades-gray-glare);
      }
      wco-app-bar {
        --mdc-theme-primary: white;
        --mdc-theme-on-primary: black;
        min-height: 100vh;
      }
      #logo {
        width: 64px;
        height: 64px;
        margin-right: 20px;
        background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYxIiBoZWlnaHQ9IjEzMiIgdmlld0JveD0iMCAwIDE2MSAxMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIwJSIgeTE9IjUwJSIgeTI9IjUwJSIgaWQ9ImEiPjxzdG9wIHN0b3AtY29sb3I9IiMyQTNCOEYiIG9mZnNldD0iMCUiLz48c3RvcCBzdG9wLWNvbG9yPSIjMjlBQkUyIiBvZmZzZXQ9IjEwMCUiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCB4MT0iMCUiIHkxPSI1MCUiIHkyPSI1MCUiIGlkPSJiIj48c3RvcCBzdG9wLWNvbG9yPSIjMkEzQjhGIiBvZmZzZXQ9IjAlIi8+PHN0b3Agc3RvcC1jb2xvcj0iIzI5QUJFMiIgb2Zmc2V0PSIxMDAlIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgeDE9IjEwMCUiIHkxPSI1MCUiIHgyPSIwJSIgeTI9IjUwJSIgaWQ9ImMiPjxzdG9wIHN0b3AtY29sb3I9IiNCNEQ0NEUiIG9mZnNldD0iMCUiLz48c3RvcCBzdG9wLWNvbG9yPSIjRTdGNzE2IiBvZmZzZXQ9IjEwMCUiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCB4MT0iMTAwJSIgeTE9IjUwJSIgeDI9IjAlIiB5Mj0iNTAlIiBpZD0iZCI+PHN0b3Agc3RvcC1jb2xvcj0iI0I0RDQ0RSIgb2Zmc2V0PSIwJSIvPjxzdG9wIHN0b3AtY29sb3I9IiNFN0Y3MTYiIG9mZnNldD0iMTAwJSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggZmlsbD0iIzE2NkRBNSIgZD0iTTE2MC42IDY1LjlsLTE3LjQgMjkuMy0yNC40LTI5LjcgMjQuNC0yOC45eiIvPjxwYXRoIGZpbGw9IiM4RkRCNjkiIGQ9Ik0xNDEuMyAxMDAuMmwtMjYuNS0zMS43LTE1LjkgMjYuNiAyNC43IDM2LjF6Ii8+PHBhdGggZmlsbD0iIzE2NkRBNSIgZD0iTTE0MSAzMS40bC0yNi4yIDMxLjgtMTUuOS0yNi42TDEyMy42Ljl6Ii8+PHBhdGggZmlsbD0idXJsKCNhKSIgb3BhY2l0eT0iLjk1IiBkPSJNNjEuMSAzMS40SDE0MUwxMjMuNC45SDc4Ljd6Ii8+PHBhdGggZmlsbD0idXJsKCNiKSIgb3BhY2l0eT0iLjk1IiBkPSJNMTE0LjggNjMuM0gxNTlsLTE1LjktMjYuOEg5OC44Ii8+PHBhdGggZmlsbD0idXJsKCNjKSIgb3BhY2l0eT0iLjk1IiBkPSJNMTQxLjMgMTAwLjNINjFsMTcuNiAzMC41aDQ1eiIvPjxwYXRoIGZpbGw9IiMwMTAxMDEiIGQ9Ik03OC42IDEzMC44TDQxIDY1LjggNzkuMS44SDM3LjlMLjQgNjUuOGwzNy41IDY1eiIvPjxwYXRoIGZpbGw9InVybCgjZCkiIG9wYWNpdHk9Ii45NSIgZD0iTTExNC44IDY4LjRIMTU5bC0xNS45IDI2LjhIOTguOCIvPjwvZz48L3N2Zz4=');
        background-size: 64px auto;
        background-repeat: no-repeat;
        background-position: center;
      }
      #domain-title {
        margin: 0;
        /* font-size: 15px; */
        /* font-weight: 600; */
        letter-spacing: 1.88;
        /* text-transform: uppercase; */
      }
      #toolbar-header-link {
        display: flex;
        align-items: center;
      }
      nav > a {
        padding: 1.5em 1.25rem;
        text-decoration: none;
        font-weight: 500;
        font-size: 1rem;
      }
      nav > a:hover {
        background: #efefef;
      }
      main {
        margin-top: 16px;
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
      <wco-app-bar>
        <div slot="title" id="toolbar-header">
          <a id="toolbar-header-link" href="/">
            <div id="logo"></div>
            <h2 id="domain-title">webcomponents.org</h2>
          </a>
        </div>
        <nav slot="actionItems">
          <a href="/introduction" active$="[[_pathIs(route, '/introduction')]]"
            >Introduction</a
          >
          <a href="/learn" active$="[[_pathIs(route, '/learn')]]">Learn</a>
          <a href="/catalog" active$="[[_pathIs(route, '/catalog')]]"
            >Catalog</a
          >
          <a href="/community" active$="[[_pathIs(route, '/community')]]"
            >Community</a
          >
        </nav>
        <main>
          <section id="about" class="columns">
            <div>
              <h2>About Web Components</h2>
              <img src="/assets/illustrations/UI%20design%20_outline.svg" />
              <h3>Interoperable components, usable anywhere HTML is!</h3>
              <p>
                Web components let you build and use components that with any
                framework, in plain HTML, static-site generators, CMSes and
                more.
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
                  Learn all about web components: what they are, how to build
                  them, useful libraries, and more.
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
        </main>
      </wco-app-bar>
    `;
  }
}
