import {css, CSSResult} from 'lit';
import {customElement} from 'lit/decorators.js';
import {TopAppBar as MwcTopAppBar} from '@material/mwc-top-app-bar';


@customElement('wco-app-bar')
export class WCOTopAppBar extends MwcTopAppBar {
  static styles = [MwcTopAppBar.styles, css`
    header.mdc-top-app-bar {
      border-bottom: 1px solid #ededed;
      height: 80px;
      padding: 0 32px;
      justify-content: center;
    }
    .mdc-top-app-bar__row {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `] as CSSResult[];
}