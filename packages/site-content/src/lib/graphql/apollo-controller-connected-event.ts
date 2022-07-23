import {ApolloClient, NormalizedCacheObject} from '@apollo/client/core';

/**
 * Fired when an Apollo controller is connected to the document tree via its
 * host. Listeners should supply an Apollo client by setting the `client`
 * property on the event.
 */
export class ApolloControllerConnectedEvent extends Event {
  static readonly eventName = 'apollo-controller-connected';

  client?: ApolloClient<NormalizedCacheObject>;

  constructor() {
    super(ApolloControllerConnectedEvent.eventName, {
      bubbles: true,
      composed: true,
    });
  }
}

declare global {
  interface HTMLElementEventMap {
    'apollo-controller-connected': ApolloControllerConnectedEvent;
  }
}
