import {
  ApolloClient,
  ApolloError,
  ApolloQueryResult,
  NormalizedCacheObject,
  ObservableQuery,
  WatchQueryOptions,
  TypedDocumentNode,
} from '@apollo/client/core';
import {ApolloControllerConnectedEvent} from './apollo-controller-connected-event.js';
import {ReactiveController, ReactiveControllerHost} from 'lit';

export type Options<D = unknown, V = Record<string, any>> = Omit<
  WatchQueryOptions<D, V>,
  'query'
> & {
  dataKey?: string;
  shouldQuery?: () => boolean;
  getVariables?: () => V;
  onData?: (data: D) => void;
};

export class QueryController<D = unknown, V = Record<string, any>>
  implements ReactiveController
{
  private _host: ReactiveControllerHost & HTMLElement;
  private _client?: ApolloClient<NormalizedCacheObject>;
  private _options: Options<D, V> | undefined;

  private _query: TypedDocumentNode<D, V>;
  private _observableQuery?: ObservableQuery<D, V>;
  private _variables: V | undefined;

  data?: D;

  _nextPromise: Promise<D>;
  _resolveNextPromise!: (data: D) => void;

  // TODO: status: ready | pending | complete | error

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    query: TypedDocumentNode<D, V>,
    options?: Options<D, V>
  ) {
    (this._host = host).addController(this);
    this._query = query;
    this._options = options;
    this._nextPromise = new Promise((res) => {
      this._resolveNextPromise = res;
    });
  }

  hostUpdate() {
    const oldVariables = this._variables;
    const newVariables = this._options?.getVariables?.();

    // If the query doesn't need variables, consider them changed
    let variablesChanged = this._options?.getVariables === undefined;
    if (
      (oldVariables === undefined && newVariables !== undefined) ||
      (oldVariables !== undefined && newVariables === undefined)
    ) {
      variablesChanged = true;
    } else if (newVariables !== undefined && oldVariables !== undefined) {
      for (const [k, v] of Object.entries(newVariables)) {
        if (oldVariables[k as keyof V] !== v) {
          variablesChanged = true;
          break;
        }
      }
    }

    if (variablesChanged) {
      this._variables = newVariables;
      if (this._observableQuery) {
        this._observableQuery.refetch(newVariables);
      } else {
        this._watch();
      }
    }
  }

  private _watch() {
    if (!(this._options?.shouldQuery?.() ?? true)) {
      return;
    }
    if (this._observableQuery) {
      // TODO?
    } else {
      if (this._client !== undefined) {
        const variables = this._options?.getVariables?.() ?? this._variables;
        const options: WatchQueryOptions<V, D> = {
          // TODO: omit `dataKey`
          ...((this._options ?? {}) as unknown as WatchQueryOptions<V, D>),
          query: this._query,
          variables: variables as V,
        };
        this._observableQuery = this._client.watchQuery(options);
        this._observableQuery.subscribe({
          next: this.nextData.bind(this),
          error: this.nextError.bind(this),
        });
      }
    }
  }

  get next() {
    return this._nextPromise;
  }

  protected nextData(result: ApolloQueryResult<D>): void {
    // console.log('AQC nextData', this._label);
    this.data = result.data;
    this._options?.onData?.(result.data);
    this._host.requestUpdate();
    this._resolveNextPromise(this.data);
    this._nextPromise = new Promise((res) => {
      this._resolveNextPromise = res;
    });

    // this.error = result.error;
    // this.errors = result.errors;
    // this.loading = result.loading;
    // this.networkStatus = result.networkStatus;
    // this.partial = result.partial;
  }

  protected nextError(error: ApolloError): void {
    console.error(error);
    this._host.requestUpdate();
    // this.error = error;
    // this.loading = false;
  }

  hostConnected() {
    const event = new ApolloControllerConnectedEvent();
    this._host.dispatchEvent(event);
    // TODO: if client is different, re-subscribe
    this._client = event.client!;
    // this._watch();
  }

  // setVariables(variables: V) {
  //   // TODO; change detect variables?
  //   this._variables = variables;
  //   this._watch();
  // }
}
