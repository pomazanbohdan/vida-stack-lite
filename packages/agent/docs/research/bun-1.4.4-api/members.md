# Bun 1.4.4 declaration members

Each row is a declaration; overload signatures and reference edges are in `catalog.json`. Types may be generic or symbolic.

| Owner and member | Kind | Declaration | Checker type |
| --- | --- | --- | --- |
| bun | ModuleDeclaration | bun.d.ts:16 | typeof import("bun") |
| bun.PathLike | TypeAliasDeclaration | bun.d.ts:17 | PathLike |
| bun.ArrayBufferView | TypeAliasDeclaration | bun.d.ts:18 | ArrayBufferView&lt;TArrayBuffer&gt; |
| bun.ArrayBufferView.TArrayBuffer | TypeParameter | bun.d.ts:18 | TArrayBuffer |
| bun.BufferSource | TypeAliasDeclaration | bun.d.ts:20 | BufferSource |
| bun.StringOrBuffer | TypeAliasDeclaration | bun.d.ts:21 | StringOrBuffer |
| bun.XMLHttpRequestBodyInit | TypeAliasDeclaration | bun.d.ts:22 | XMLHttpRequestBodyInit |
| bun.ReadableStreamController | TypeAliasDeclaration | bun.d.ts:23 | ReadableStreamController&lt;T&gt; |
| bun.ReadableStreamController.T | TypeParameter | bun.d.ts:23 | T |
| bun.ReadableStreamDefaultReadResult | TypeAliasDeclaration | bun.d.ts:24 | ReadableStreamDefaultReadResult&lt;T&gt; |
| bun.ReadableStreamDefaultReadResult.T | TypeParameter | bun.d.ts:24 | T |
| bun.ReadableStreamReader | TypeAliasDeclaration | bun.d.ts:26 | ReadableStreamReader&lt;T&gt; |
| bun.ReadableStreamReader.T | TypeParameter | bun.d.ts:26 | T |
| bun.Transferable | TypeAliasDeclaration | bun.d.ts:27 | Transferable |
| bun.MessageEventSource | TypeAliasDeclaration | bun.d.ts:28 | undefined |
| bun.Encoding | TypeAliasDeclaration | bun.d.ts:38 | Encoding |
| bun.UncaughtExceptionOrigin | TypeAliasDeclaration | bun.d.ts:300 | UncaughtExceptionOrigin |
| bun.MultipleResolveType | TypeAliasDeclaration | bun.d.ts:301 | MultipleResolveType |
| bun.BeforeExitListener | TypeAliasDeclaration | bun.d.ts:302 | BeforeExitListener |
| bun.BeforeExitListener.[FunctionType] | FunctionType | bun.d.ts:302 | BeforeExitListener |
| bun.DisconnectListener | TypeAliasDeclaration | bun.d.ts:303 | DisconnectListener |
| bun.DisconnectListener.[FunctionType] | FunctionType | bun.d.ts:303 | DisconnectListener |
| bun.ExitListener | TypeAliasDeclaration | bun.d.ts:304 | ExitListener |
| bun.ExitListener.[FunctionType] | FunctionType | bun.d.ts:304 | ExitListener |
| bun.RejectionHandledListener | TypeAliasDeclaration | bun.d.ts:305 | RejectionHandledListener |
| bun.RejectionHandledListener.[FunctionType] | FunctionType | bun.d.ts:305 | RejectionHandledListener |
| bun.FormDataEntryValue | TypeAliasDeclaration | bun.d.ts:306 | FormDataEntryValue |
| bun.WarningListener | TypeAliasDeclaration | bun.d.ts:307 | WarningListener |
| bun.WarningListener.[FunctionType] | FunctionType | bun.d.ts:307 | WarningListener |
| bun.MessageListener | TypeAliasDeclaration | bun.d.ts:308 | MessageListener |
| bun.MessageListener.[FunctionType] | FunctionType | bun.d.ts:308 | MessageListener |
| bun.SignalsListener | TypeAliasDeclaration | bun.d.ts:309 | SignalsListener |
| bun.SignalsListener.[FunctionType] | FunctionType | bun.d.ts:309 | SignalsListener |
| bun.BlobPart | TypeAliasDeclaration | bun.d.ts:310 | BlobPart |
| bun.TimerHandler | TypeAliasDeclaration | bun.d.ts:311 | TimerHandler |
| bun.TimerHandler.[FunctionType] | FunctionType | bun.d.ts:311 | TimerHandler |
| bun.DOMHighResTimeStamp | TypeAliasDeclaration | bun.d.ts:312 | number |
| bun.EventListenerOrEventListenerObject | TypeAliasDeclaration | bun.d.ts:313 | EventListenerOrEventListenerObject |
| bun.BlobOrStringOrBuffer | TypeAliasDeclaration | bun.d.ts:314 | BlobOrStringOrBuffer |
| bun.MaybePromise | TypeAliasDeclaration | bun.d.ts:315 | MaybePromise&lt;T&gt; |
| bun.MaybePromise.T | TypeParameter | bun.d.ts:315 | T |
| bun.__internal | ModuleDeclaration | bun.d.ts:317 | any |
| bun.__internal.LibDomIsLoaded | TypeAliasDeclaration | bun.d.ts:318 | true |
| bun.__internal.LibDomIsLoaded.[TypeLiteral] | TypeLiteral | bun.d.ts:318 | { onabort: any; } |
| bun.__internal.LibDomIsLoaded.onabort | PropertySignature | bun.d.ts:318 | any |
| bun.__internal.UseLibDomIfAvailable | TypeAliasDeclaration | bun.d.ts:326 | typeof globalThis extends { [K in GlobalThisKeyName]: infer T; } ? T : Otherwise |
| bun.__internal.UseLibDomIfAvailable.GlobalThisKeyName | TypeParameter | bun.d.ts:326 | GlobalThisKeyName |
| bun.__internal.UseLibDomIfAvailable.Otherwise | TypeParameter | bun.d.ts:326 | Otherwise |
| bun.__internal.UseLibDomIfAvailable.[MappedType] | MappedType | bun.d.ts:329 | { [K in GlobalThisKeyName]: T; } |
| bun.__internal.UseLibDomIfAvailable.K | TypeParameter | bun.d.ts:329 | K |
| bun.__internal.UseLibDomIfAvailable.T | TypeParameter | bun.d.ts:329 | T |
| bun.__internal.DistributedOmit | TypeAliasDeclaration | bun.d.ts:347 | DistributedOmit&lt;T, K&gt; |
| bun.__internal.DistributedOmit.T | TypeParameter | bun.d.ts:347 | T |
| bun.__internal.DistributedOmit.K | TypeParameter | bun.d.ts:347 | K |
| bun.__internal.KeysInBoth | TypeAliasDeclaration | bun.d.ts:349 | KeysInBoth&lt;A, B&gt; |
| bun.__internal.KeysInBoth.A | TypeParameter | bun.d.ts:349 | A |
| bun.__internal.KeysInBoth.B | TypeParameter | bun.d.ts:349 | B |
| bun.__internal.MergeInner | TypeAliasDeclaration | bun.d.ts:350 | MergeInner&lt;A, B&gt; |
| bun.__internal.MergeInner.A | TypeParameter | bun.d.ts:350 | A |
| bun.__internal.MergeInner.B | TypeParameter | bun.d.ts:350 | B |
| bun.__internal.MergeInner.[MappedType] | MappedType | bun.d.ts:351 | { [Key in Extract&lt;keyof A, keyof B&gt;]: A[Key] &#124; B[Key]; } |
| bun.__internal.MergeInner.Key | TypeParameter | bun.d.ts:352 | Key |
| bun.__internal.Merge | TypeAliasDeclaration | bun.d.ts:354 | Merge&lt;A, B&gt; |
| bun.__internal.Merge.A | TypeParameter | bun.d.ts:354 | A |
| bun.__internal.Merge.B | TypeParameter | bun.d.ts:354 | B |
| bun.__internal.DistributedMerge | TypeAliasDeclaration | bun.d.ts:355 | DistributedMerge&lt;T, Else&gt; |
| bun.__internal.DistributedMerge.T | TypeParameter | bun.d.ts:355 | T |
| bun.__internal.DistributedMerge.Else | TypeParameter | bun.d.ts:355 | Else |
| bun.__internal.Without | TypeAliasDeclaration | bun.d.ts:357 | Without&lt;A, B&gt; |
| bun.__internal.Without.A | TypeParameter | bun.d.ts:357 | A |
| bun.__internal.Without.B | TypeParameter | bun.d.ts:357 | B |
| bun.__internal.Without.[MappedType] | MappedType | bun.d.ts:357 | { [Key in Exclude&lt;keyof B, keyof A&gt;]?: undefined; } |
| bun.__internal.Without.Key | TypeParameter | bun.d.ts:358 | Key |
| bun.__internal.XOR | TypeAliasDeclaration | bun.d.ts:361 | XOR&lt;A, B&gt; |
| bun.__internal.XOR.A | TypeParameter | bun.d.ts:361 | A |
| bun.__internal.XOR.B | TypeParameter | bun.d.ts:361 | B |
| bun.ErrorEventInit | InterfaceDeclaration | bun.d.ts:364 | ErrorEventInit |
| bun.ErrorEventInit.colno | PropertySignature | bun.d.ts:365 | number &#124; undefined |
| bun.ErrorEventInit.error | PropertySignature | bun.d.ts:366 | any |
| bun.ErrorEventInit.filename | PropertySignature | bun.d.ts:367 | string &#124; undefined |
| bun.ErrorEventInit.lineno | PropertySignature | bun.d.ts:368 | number &#124; undefined |
| bun.ErrorEventInit.message | PropertySignature | bun.d.ts:369 | string &#124; undefined |
| bun.CloseEventInit | InterfaceDeclaration | bun.d.ts:372 | CloseEventInit |
| bun.CloseEventInit.code | PropertySignature | bun.d.ts:373 | number &#124; undefined |
| bun.CloseEventInit.reason | PropertySignature | bun.d.ts:374 | string &#124; undefined |
| bun.CloseEventInit.wasClean | PropertySignature | bun.d.ts:375 | boolean &#124; undefined |
| bun.MessageEventInit | InterfaceDeclaration | bun.d.ts:378 | MessageEventInit&lt;T&gt; |
| bun.MessageEventInit.T | TypeParameter | bun.d.ts:378 | T |
| bun.MessageEventInit.data | PropertySignature | bun.d.ts:379 | T &#124; undefined |
| bun.MessageEventInit.lastEventId | PropertySignature | bun.d.ts:380 | string &#124; undefined |
| bun.MessageEventInit.origin | PropertySignature | bun.d.ts:381 | string &#124; undefined |
| bun.MessageEventInit.source | PropertySignature | bun.d.ts:382 | null &#124; undefined |
| bun.EventInit | InterfaceDeclaration | bun.d.ts:385 | EventInit |
| bun.EventInit.bubbles | PropertySignature | bun.d.ts:386 | boolean &#124; undefined |
| bun.EventInit.cancelable | PropertySignature | bun.d.ts:387 | boolean &#124; undefined |
| bun.EventInit.composed | PropertySignature | bun.d.ts:388 | boolean &#124; undefined |
| bun.EventListenerOptions | InterfaceDeclaration | bun.d.ts:391 | EventListenerOptions |
| bun.EventListenerOptions.capture | PropertySignature | bun.d.ts:392 | boolean &#124; undefined |
| bun.CustomEventInit | InterfaceDeclaration | bun.d.ts:395 | CustomEventInit&lt;T&gt; |
| bun.CustomEventInit.T | TypeParameter | bun.d.ts:395 | T |
| bun.CustomEventInit.detail | PropertySignature | bun.d.ts:396 | T &#124; undefined |
| bun.BunMessageEvent | InterfaceDeclaration | bun.d.ts:400 | BunMessageEvent&lt;T&gt; |
| bun.BunMessageEvent.T | TypeParameter | bun.d.ts:400 | T |
| bun.BunMessageEvent.data | PropertySignature | bun.d.ts:402 | T |
| bun.BunMessageEvent.lastEventId | PropertySignature | bun.d.ts:404 | string |
| bun.BunMessageEvent.origin | PropertySignature | bun.d.ts:406 | string |
| bun.BunMessageEvent.ports | PropertySignature | bun.d.ts:408 | readonly MessagePort[] |
| bun.BunMessageEvent.source | PropertySignature | bun.d.ts:409 | null &#124; undefined |
| bun.MessageEvent | TypeAliasDeclaration | bun.d.ts:412 | { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; } |
| bun.MessageEvent.T | TypeParameter | bun.d.ts:412 | T |
| bun.ReadableStreamDefaultReadManyResult | InterfaceDeclaration | bun.d.ts:414 | ReadableStreamDefaultReadManyResult&lt;T&gt; |
| bun.ReadableStreamDefaultReadManyResult.T | TypeParameter | bun.d.ts:414 | T |
| bun.ReadableStreamDefaultReadManyResult.done | PropertySignature | bun.d.ts:415 | boolean |
| bun.ReadableStreamDefaultReadManyResult.size | PropertySignature | bun.d.ts:417 | number |
| bun.ReadableStreamDefaultReadManyResult.value | PropertySignature | bun.d.ts:418 | T[] |
| bun.EventSourceEventMap | InterfaceDeclaration | bun.d.ts:421 | EventSourceEventMap |
| bun.EventSourceEventMap.error | PropertySignature | bun.d.ts:422 | Event |
| bun.EventSourceEventMap.message | PropertySignature | bun.d.ts:423 | { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; } |
| bun.EventSourceEventMap.open | PropertySignature | bun.d.ts:424 | Event |
| bun.AddEventListenerOptions | InterfaceDeclaration | bun.d.ts:427 | AddEventListenerOptions |
| bun.AddEventListenerOptions.once | PropertySignature | bun.d.ts:429 | boolean &#124; undefined |
| bun.AddEventListenerOptions.passive | PropertySignature | bun.d.ts:431 | boolean &#124; undefined |
| bun.AddEventListenerOptions.signal | PropertySignature | bun.d.ts:432 | AbortSignal &#124; undefined |
| bun.EventListener | InterfaceDeclaration | bun.d.ts:435 | EventListener |
| bun.EventListener.[call] | CallSignature | bun.d.ts:436 | any |
| bun.EventListenerObject | InterfaceDeclaration | bun.d.ts:439 | EventListenerObject |
| bun.EventListenerObject.handleEvent | MethodSignature | bun.d.ts:440 | (object: Event) =&gt; void |
| bun.FetchEvent | InterfaceDeclaration | bun.d.ts:443 | FetchEvent |
| bun.FetchEvent.request | PropertySignature | bun.d.ts:444 | Request |
| bun.FetchEvent.url | PropertySignature | bun.d.ts:445 | string |
| bun.FetchEvent.waitUntil | MethodSignature | bun.d.ts:447 | (promise: Promise&lt;any&gt;) =&gt; void |
| bun.FetchEvent.respondWith | MethodSignature | bun.d.ts:448 | (response: Promise&lt;Response&gt; &#124; Response) =&gt; void |
| bun.EventMap | InterfaceDeclaration | bun.d.ts:451 | EventMap |
| bun.EventMap.fetch | PropertySignature | bun.d.ts:452 | FetchEvent |
| bun.EventMap.message | PropertySignature | bun.d.ts:453 | { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; } |
| bun.EventMap.messageerror | PropertySignature | bun.d.ts:454 | { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; } |
| bun.StructuredSerializeOptions | InterfaceDeclaration | bun.d.ts:458 | StructuredSerializeOptions |
| bun.StructuredSerializeOptions.transfer | PropertySignature | bun.d.ts:459 | Transferable[] &#124; undefined |
| bun.EventSource | InterfaceDeclaration | bun.d.ts:462 | EventSource |
| bun.EventSource.[construct] | ConstructSignature | bun.d.ts:463 | any |
| bun.EventSource.onerror | PropertySignature | bun.d.ts:465 | ((this: EventSource, ev: Event) =&gt; any) &#124; null |
| bun.EventSource.onerror.[FunctionType] | FunctionType | bun.d.ts:465 | (this: EventSource, ev: Event) =&gt; any |
| bun.EventSource.onmessage | PropertySignature | bun.d.ts:466 | ((this: EventSource, ev: { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; }) =&gt; any) &#124; null |
| bun.EventSource.onmessage.[FunctionType] | FunctionType | bun.d.ts:466 | (this: EventSource, ev: { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; }) =&gt; any |
| bun.EventSource.onopen | PropertySignature | bun.d.ts:467 | ((this: EventSource, ev: Event) =&gt; any) &#124; null |
| bun.EventSource.onopen.[FunctionType] | FunctionType | bun.d.ts:467 | (this: EventSource, ev: Event) =&gt; any |
| bun.EventSource.readyState | PropertySignature | bun.d.ts:469 | number |
| bun.EventSource.url | PropertySignature | bun.d.ts:471 | string |
| bun.EventSource.withCredentials | PropertySignature | bun.d.ts:476 | boolean |
| bun.EventSource.close | MethodSignature | bun.d.ts:478 | () =&gt; void |
| bun.EventSource.CLOSED | PropertySignature | bun.d.ts:479 | 2 |
| bun.EventSource.CONNECTING | PropertySignature | bun.d.ts:480 | 0 |
| bun.EventSource.OPEN | PropertySignature | bun.d.ts:481 | 1 |
| bun.EventSource.addEventListener | MethodSignature | bun.d.ts:482 | { &lt;K extends keyof EventSourceEventMap&gt;(type: K, listener: (this: EventSource, ev: EventSourceEventMap[K]) =&gt; any, options?: boolean &#124; AddEventListenerOptions &#124; undefined): void; (type: string, listener: (this: EventSource, event: { ...; }) =&gt; any, options?: boolean &#124; ... 1 more ... &#124; undefined): void; (type: string... |
| bun.EventSource.addEventListener.K | TypeParameter | bun.d.ts:482 | K |
| bun.EventSource.addEventListener.[FunctionType] | FunctionType | bun.d.ts:484 | (this: EventSource, ev: EventSourceEventMap[K]) =&gt; any |
| bun.EventSource.addEventListener | MethodSignature | bun.d.ts:487 | { &lt;K extends keyof EventSourceEventMap&gt;(type: K, listener: (this: EventSource, ev: EventSourceEventMap[K]) =&gt; any, options?: boolean &#124; AddEventListenerOptions &#124; undefined): void; (type: string, listener: (this: EventSource, event: { ...; }) =&gt; any, options?: boolean &#124; ... 1 more ... &#124; undefined): void; (type: string... |
| bun.EventSource.addEventListener.[FunctionType] | FunctionType | bun.d.ts:489 | (this: EventSource, event: { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; }) =&gt; any |
| bun.EventSource.addEventListener | MethodSignature | bun.d.ts:492 | { &lt;K extends keyof EventSourceEventMap&gt;(type: K, listener: (this: EventSource, ev: EventSourceEventMap[K]) =&gt; any, options?: boolean &#124; AddEventListenerOptions &#124; undefined): void; (type: string, listener: (this: EventSource, event: { ...; }) =&gt; any, options?: boolean &#124; ... 1 more ... &#124; undefined): void; (type: string... |
| bun.EventSource.removeEventListener | MethodSignature | bun.d.ts:497 | { &lt;K extends keyof EventSourceEventMap&gt;(type: K, listener: (this: EventSource, ev: EventSourceEventMap[K]) =&gt; any, options?: boolean &#124; EventListenerOptions &#124; undefined): void; (type: string, listener: (this: EventSource, event: { ...; }) =&gt; any, options?: boolean &#124; ... 1 more ... &#124; undefined): void; (type: string, l... |
| bun.EventSource.removeEventListener.K | TypeParameter | bun.d.ts:497 | K |
| bun.EventSource.removeEventListener.[FunctionType] | FunctionType | bun.d.ts:499 | (this: EventSource, ev: EventSourceEventMap[K]) =&gt; any |
| bun.EventSource.removeEventListener | MethodSignature | bun.d.ts:502 | { &lt;K extends keyof EventSourceEventMap&gt;(type: K, listener: (this: EventSource, ev: EventSourceEventMap[K]) =&gt; any, options?: boolean &#124; EventListenerOptions &#124; undefined): void; (type: string, listener: (this: EventSource, event: { ...; }) =&gt; any, options?: boolean &#124; ... 1 more ... &#124; undefined): void; (type: string, l... |
| bun.EventSource.removeEventListener.[FunctionType] | FunctionType | bun.d.ts:504 | (this: EventSource, event: { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; }) =&gt; any |
| bun.EventSource.removeEventListener | MethodSignature | bun.d.ts:507 | { &lt;K extends keyof EventSourceEventMap&gt;(type: K, listener: (this: EventSource, ev: EventSourceEventMap[K]) =&gt; any, options?: boolean &#124; EventListenerOptions &#124; undefined): void; (type: string, listener: (this: EventSource, event: { ...; }) =&gt; any, options?: boolean &#124; ... 1 more ... &#124; undefined): void; (type: string, l... |
| bun.EventSource.ref | MethodSignature | bun.d.ts:518 | () =&gt; void |
| bun.EventSource.unref | MethodSignature | bun.d.ts:525 | () =&gt; void |
| bun.TransformerFlushCallback | InterfaceDeclaration | bun.d.ts:528 | TransformerFlushCallback&lt;O&gt; |
| bun.TransformerFlushCallback.O | TypeParameter | bun.d.ts:528 | O |
| bun.TransformerFlushCallback.[call] | CallSignature | bun.d.ts:529 | any |
| bun.TransformerStartCallback | InterfaceDeclaration | bun.d.ts:532 | TransformerStartCallback&lt;O&gt; |
| bun.TransformerStartCallback.O | TypeParameter | bun.d.ts:532 | O |
| bun.TransformerStartCallback.[call] | CallSignature | bun.d.ts:533 | any |
| bun.TransformerTransformCallback | InterfaceDeclaration | bun.d.ts:536 | TransformerTransformCallback&lt;I, O&gt; |
| bun.TransformerTransformCallback.I | TypeParameter | bun.d.ts:536 | I |
| bun.TransformerTransformCallback.O | TypeParameter | bun.d.ts:536 | O |
| bun.TransformerTransformCallback.[call] | CallSignature | bun.d.ts:537 | any |
| bun.UnderlyingSinkAbortCallback | InterfaceDeclaration | bun.d.ts:540 | UnderlyingSinkAbortCallback |
| bun.UnderlyingSinkAbortCallback.[call] | CallSignature | bun.d.ts:541 | any |
| bun.UnderlyingSinkCloseCallback | InterfaceDeclaration | bun.d.ts:544 | UnderlyingSinkCloseCallback |
| bun.UnderlyingSinkCloseCallback.[call] | CallSignature | bun.d.ts:545 | any |
| bun.UnderlyingSinkStartCallback | InterfaceDeclaration | bun.d.ts:548 | UnderlyingSinkStartCallback |
| bun.UnderlyingSinkStartCallback.[call] | CallSignature | bun.d.ts:549 | any |
| bun.UnderlyingSinkWriteCallback | InterfaceDeclaration | bun.d.ts:552 | UnderlyingSinkWriteCallback&lt;W&gt; |
| bun.UnderlyingSinkWriteCallback.W | TypeParameter | bun.d.ts:552 | W |
| bun.UnderlyingSinkWriteCallback.[call] | CallSignature | bun.d.ts:553 | any |
| bun.UnderlyingSourceCancelCallback | InterfaceDeclaration | bun.d.ts:556 | UnderlyingSourceCancelCallback |
| bun.UnderlyingSourceCancelCallback.[call] | CallSignature | bun.d.ts:557 | any |
| bun.UnderlyingSink | InterfaceDeclaration | bun.d.ts:560 | UnderlyingSink&lt;W&gt; |
| bun.UnderlyingSink.W | TypeParameter | bun.d.ts:560 | W |
| bun.UnderlyingSink.abort | PropertySignature | bun.d.ts:561 | UnderlyingSinkAbortCallback &#124; undefined |
| bun.UnderlyingSink.close | PropertySignature | bun.d.ts:562 | UnderlyingSinkCloseCallback &#124; undefined |
| bun.UnderlyingSink.start | PropertySignature | bun.d.ts:563 | UnderlyingSinkStartCallback &#124; undefined |
| bun.UnderlyingSink.type | PropertySignature | bun.d.ts:564 | "bytes" &#124; "default" &#124; undefined |
| bun.UnderlyingSink.write | PropertySignature | bun.d.ts:565 | UnderlyingSinkWriteCallback&lt;W&gt; &#124; undefined |
| bun.UnderlyingSource | InterfaceDeclaration | bun.d.ts:568 | UnderlyingSource&lt;R&gt; |
| bun.UnderlyingSource.R | TypeParameter | bun.d.ts:568 | R |
| bun.UnderlyingSource.cancel | PropertySignature | bun.d.ts:569 | UnderlyingSourceCancelCallback &#124; undefined |
| bun.UnderlyingSource.pull | PropertySignature | bun.d.ts:570 | UnderlyingSourcePullCallback&lt;R&gt; &#124; undefined |
| bun.UnderlyingSource.start | PropertySignature | bun.d.ts:571 | UnderlyingSourceStartCallback&lt;R&gt; &#124; undefined |
| bun.UnderlyingSource.type | PropertySignature | bun.d.ts:572 | undefined |
| bun.DirectUnderlyingSource | InterfaceDeclaration | bun.d.ts:575 | DirectUnderlyingSource&lt;R&gt; |
| bun.DirectUnderlyingSource.R | TypeParameter | bun.d.ts:575 | R |
| bun.DirectUnderlyingSource.cancel | PropertySignature | bun.d.ts:576 | UnderlyingSourceCancelCallback &#124; undefined |
| bun.DirectUnderlyingSource.pull | PropertySignature | bun.d.ts:590 | (controller: ReadableStreamDirectController) =&gt; void &#124; PromiseLike&lt;void&gt; |
| bun.DirectUnderlyingSource.pull.[FunctionType] | FunctionType | bun.d.ts:590 | (controller: ReadableStreamDirectController) =&gt; void &#124; PromiseLike&lt;void&gt; |
| bun.DirectUnderlyingSource.type | PropertySignature | bun.d.ts:591 | "direct" |
| bun.UnderlyingSourcePullCallback | InterfaceDeclaration | bun.d.ts:594 | UnderlyingSourcePullCallback&lt;R&gt; |
| bun.UnderlyingSourcePullCallback.R | TypeParameter | bun.d.ts:594 | R |
| bun.UnderlyingSourcePullCallback.[call] | CallSignature | bun.d.ts:595 | any |
| bun.UnderlyingSourceStartCallback | InterfaceDeclaration | bun.d.ts:598 | UnderlyingSourceStartCallback&lt;R&gt; |
| bun.UnderlyingSourceStartCallback.R | TypeParameter | bun.d.ts:598 | R |
| bun.UnderlyingSourceStartCallback.[call] | CallSignature | bun.d.ts:599 | any |
| bun.GenericTransformStream | InterfaceDeclaration | bun.d.ts:602 | GenericTransformStream |
| bun.GenericTransformStream.readable | PropertySignature | bun.d.ts:603 | ReadableStream&lt;any&gt; |
| bun.GenericTransformStream.writable | PropertySignature | bun.d.ts:604 | WritableStream&lt;any&gt; |
| bun.AbstractWorkerEventMap | InterfaceDeclaration | bun.d.ts:607 | AbstractWorkerEventMap |
| bun.AbstractWorkerEventMap.error | PropertySignature | bun.d.ts:608 | ErrorEvent |
| bun.WorkerEventMap | InterfaceDeclaration | bun.d.ts:611 | WorkerEventMap |
| bun.WorkerEventMap.message | PropertySignature | bun.d.ts:612 | { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; } |
| bun.WorkerEventMap.messageerror | PropertySignature | bun.d.ts:613 | { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; } |
| bun.WorkerEventMap.close | PropertySignature | bun.d.ts:614 | CloseEvent |
| bun.WorkerEventMap.open | PropertySignature | bun.d.ts:615 | Event |
| bun.WorkerType | TypeAliasDeclaration | bun.d.ts:618 | WorkerType |
| bun.AbstractWorker | InterfaceDeclaration | bun.d.ts:620 | AbstractWorker |
| bun.AbstractWorker.onerror | PropertySignature | bun.d.ts:622 | ((this: AbstractWorker, ev: ErrorEvent) =&gt; any) &#124; null |
| bun.AbstractWorker.onerror.[FunctionType] | FunctionType | bun.d.ts:622 | (this: AbstractWorker, ev: ErrorEvent) =&gt; any |
| bun.AbstractWorker.addEventListener | MethodSignature | bun.d.ts:623 | { &lt;K extends keyof AbstractWorkerEventMap&gt;(type: K, listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) =&gt; any, options?: boolean &#124; AddEventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.AbstractWorker.addEventListener.K | TypeParameter | bun.d.ts:623 | K |
| bun.AbstractWorker.addEventListener.[FunctionType] | FunctionType | bun.d.ts:625 | (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) =&gt; any |
| bun.AbstractWorker.addEventListener | MethodSignature | bun.d.ts:628 | { &lt;K extends keyof AbstractWorkerEventMap&gt;(type: K, listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) =&gt; any, options?: boolean &#124; AddEventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.AbstractWorker.removeEventListener | MethodSignature | bun.d.ts:633 | { &lt;K extends keyof AbstractWorkerEventMap&gt;(type: K, listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) =&gt; any, options?: boolean &#124; EventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.AbstractWorker.removeEventListener.K | TypeParameter | bun.d.ts:633 | K |
| bun.AbstractWorker.removeEventListener.[FunctionType] | FunctionType | bun.d.ts:635 | (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) =&gt; any |
| bun.AbstractWorker.removeEventListener | MethodSignature | bun.d.ts:638 | { &lt;K extends keyof AbstractWorkerEventMap&gt;(type: K, listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) =&gt; any, options?: boolean &#124; EventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.WorkerOptions | InterfaceDeclaration | bun.d.ts:648 | WorkerOptions |
| bun.WorkerOptions.name | PropertySignature | bun.d.ts:653 | string &#124; undefined |
| bun.WorkerOptions.smol | PropertySignature | bun.d.ts:661 | boolean &#124; undefined |
| bun.WorkerOptions.ref | PropertySignature | bun.d.ts:669 | boolean &#124; undefined |
| bun.WorkerOptions.type | PropertySignature | bun.d.ts:674 | WorkerType &#124; undefined |
| bun.WorkerOptions.argv | PropertySignature | bun.d.ts:681 | any[] &#124; undefined |
| bun.WorkerOptions.env | PropertySignature | bun.d.ts:691 | unique symbol &#124; Record&lt;string, string&gt; &#124; undefined |
| bun.WorkerOptions.credentials | PropertySignature | bun.d.ts:696 | RequestCredentials &#124; undefined |
| bun.WorkerOptions.preload | PropertySignature | bun.d.ts:711 | string &#124; string[] &#124; undefined |
| bun.Worker | InterfaceDeclaration | bun.d.ts:714 | Worker |
| bun.Worker.onmessage | PropertySignature | bun.d.ts:716 | ((this: Worker, ev: { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; }) =&gt; any) &#124; null |
| bun.Worker.onmessage.[FunctionType] | FunctionType | bun.d.ts:716 | (this: Worker, ev: { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; }) =&gt; any |
| bun.Worker.onmessageerror | PropertySignature | bun.d.ts:718 | ((this: Worker, ev: { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; }) =&gt; any) &#124; null |
| bun.Worker.onmessageerror.[FunctionType] | FunctionType | bun.d.ts:718 | (this: Worker, ev: { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; }) =&gt; any |
| bun.Worker.postMessage | MethodSignature | bun.d.ts:724 | { (message: any, transfer: Transferable[]): void; (message: any, options?: StructuredSerializeOptions &#124; undefined): void; } |
| bun.Worker.postMessage | MethodSignature | bun.d.ts:725 | { (message: any, transfer: Transferable[]): void; (message: any, options?: StructuredSerializeOptions &#124; undefined): void; } |
| bun.Worker.terminate | MethodSignature | bun.d.ts:731 | () =&gt; void |
| bun.Worker.addEventListener | MethodSignature | bun.d.ts:732 | { &lt;K extends keyof WorkerEventMap&gt;(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) =&gt; any, options?: boolean &#124; AddEventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.Worker.addEventListener.K | TypeParameter | bun.d.ts:732 | K |
| bun.Worker.addEventListener.[FunctionType] | FunctionType | bun.d.ts:734 | (this: Worker, ev: WorkerEventMap[K]) =&gt; any |
| bun.Worker.addEventListener | MethodSignature | bun.d.ts:737 | { &lt;K extends keyof WorkerEventMap&gt;(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) =&gt; any, options?: boolean &#124; AddEventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.Worker.removeEventListener | MethodSignature | bun.d.ts:742 | { &lt;K extends keyof WorkerEventMap&gt;(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) =&gt; any, options?: boolean &#124; EventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.Worker.removeEventListener.K | TypeParameter | bun.d.ts:742 | K |
| bun.Worker.removeEventListener.[FunctionType] | FunctionType | bun.d.ts:744 | (this: Worker, ev: WorkerEventMap[K]) =&gt; any |
| bun.Worker.removeEventListener | MethodSignature | bun.d.ts:747 | { &lt;K extends keyof WorkerEventMap&gt;(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) =&gt; any, options?: boolean &#124; EventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.Worker.ref | MethodSignature | bun.d.ts:758 | () =&gt; void |
| bun.Worker.unref | MethodSignature | bun.d.ts:765 | () =&gt; void |
| bun.Worker.threadId | PropertySignature | bun.d.ts:772 | number |
| bun.Env | InterfaceDeclaration | bun.d.ts:775 | Env |
| bun.Env.NODE_ENV | PropertySignature | bun.d.ts:776 | string &#124; undefined |
| bun.Env.TZ | PropertySignature | bun.d.ts:780 | string &#124; undefined |
| bun.env | VariableDeclaration | bun.d.ts:790 | Env &amp; ProcessEnv &amp; ImportMetaEnv |
| bun.argv | VariableDeclaration | bun.d.ts:796 | string[] |
| bun.WhichOptions | InterfaceDeclaration | bun.d.ts:798 | WhichOptions |
| bun.WhichOptions.PATH | PropertySignature | bun.d.ts:802 | string &#124; undefined |
| bun.WhichOptions.cwd | PropertySignature | bun.d.ts:807 | string &#124; undefined |
| bun.which | FunctionDeclaration | bun.d.ts:820 | (command: string, options?: WhichOptions &#124; undefined) =&gt; string &#124; null |
| bun.StringWidthOptions | InterfaceDeclaration | bun.d.ts:822 | StringWidthOptions |
| bun.StringWidthOptions.countAnsiEscapeCodes | PropertySignature | bun.d.ts:828 | boolean &#124; undefined |
| bun.StringWidthOptions.ambiguousIsNarrow | PropertySignature | bun.d.ts:835 | boolean &#124; undefined |
| bun.StringWidthOptions.perCodePoint | PropertySignature | bun.d.ts:847 | boolean &#124; undefined |
| bun.stringWidth | FunctionDeclaration | bun.d.ts:872 | (input: string, options?: StringWidthOptions &#124; undefined) =&gt; number |
| bun.stripANSI | FunctionDeclaration | bun.d.ts:895 | (input: string) =&gt; string |
| bun.SliceAnsiOptions | InterfaceDeclaration | bun.d.ts:897 | SliceAnsiOptions |
| bun.SliceAnsiOptions.ellipsis | PropertySignature | bun.d.ts:909 | string &#124; undefined |
| bun.SliceAnsiOptions.ambiguousIsNarrow | PropertySignature | bun.d.ts:921 | boolean &#124; undefined |
| bun.sliceAnsi | FunctionDeclaration | bun.d.ts:955 | (input: string, start?: number &#124; undefined, end?: number &#124; undefined, options?: string &#124; boolean &#124; SliceAnsiOptions &#124; undefined, ambiguousIsNarrow?: boolean &#124; undefined) =&gt; string |
| bun.WrapAnsiOptions | InterfaceDeclaration | bun.d.ts:974 | WrapAnsiOptions |
| bun.WrapAnsiOptions.hard | PropertySignature | bun.d.ts:981 | boolean &#124; undefined |
| bun.WrapAnsiOptions.wordWrap | PropertySignature | bun.d.ts:990 | boolean &#124; undefined |
| bun.WrapAnsiOptions.trim | PropertySignature | bun.d.ts:998 | boolean &#124; undefined |
| bun.WrapAnsiOptions.ambiguousIsNarrow | PropertySignature | bun.d.ts:1006 | boolean &#124; undefined |
| bun.wrapAnsi | FunctionDeclaration | bun.d.ts:1051 | (input: string, columns: number, options?: WrapAnsiOptions &#124; undefined) =&gt; string |
| bun.TOML | ModuleDeclaration | bun.d.ts:1069 | typeof TOML |
| bun.TOML.parse | FunctionDeclaration | bun.d.ts:1087 | (input: string &#124; Blob &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;) =&gt; object |
| bun.TOML.stringify | FunctionDeclaration | bun.d.ts:1122 | &lt;T&gt;(input: T, replacer?: null &#124; undefined, space?: string &#124; number &#124; undefined) =&gt; T extends symbol &#124; Function &#124; undefined ? undefined : T extends object ? string : string &#124; undefined |
| bun.TOML.stringify.T | TypeParameter | bun.d.ts:1122 | T |
| bun.XML | ModuleDeclaration | bun.d.ts:1132 | typeof XML |
| bun.XML.Value | TypeAliasDeclaration | bun.d.ts:1140 | Value |
| bun.XML.Element | InterfaceDeclaration | bun.d.ts:1157 | Element |
| bun.XML.Element.[index] | IndexSignature | bun.d.ts:1158 | any |
| bun.XML.Document | InterfaceDeclaration | bun.d.ts:1165 | Document |
| bun.XML.Document.[index] | IndexSignature | bun.d.ts:1166 | any |
| bun.XML.Node | InterfaceDeclaration | bun.d.ts:1172 | Node |
| bun.XML.Node.name | PropertySignature | bun.d.ts:1174 | string |
| bun.XML.Node.attributes | PropertySignature | bun.d.ts:1181 | Record&lt;string, string&gt; |
| bun.XML.Node.children | PropertySignature | bun.d.ts:1190 | (string &#124; Comment &#124; Node &#124; ProcessingInstruction)[] |
| bun.XML.Comment | InterfaceDeclaration | bun.d.ts:1194 | Comment |
| bun.XML.Comment.comment | PropertySignature | bun.d.ts:1195 | string |
| bun.XML.ProcessingInstruction | InterfaceDeclaration | bun.d.ts:1199 | ProcessingInstruction |
| bun.XML.ProcessingInstruction.target | PropertySignature | bun.d.ts:1200 | string |
| bun.XML.ProcessingInstruction.data | PropertySignature | bun.d.ts:1202 | string |
| bun.XML.ParseOptions | InterfaceDeclaration | bun.d.ts:1207 | ParseOptions |
| bun.XML.ParseOptions.compact | PropertySignature | bun.d.ts:1223 | boolean &#124; undefined |
| bun.XML.parse | FunctionDeclaration | bun.d.ts:1280 | { (input: string &#124; Blob &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;, options?: (ParseOptions &amp; { ...; }) &#124; undefined): Document; (input: string &#124; ... 3 more ... &#124; TypedArray&lt;...&gt;, options: ParseOptions &amp; { ...; }): Node; (input: string &#124; ... 3 more ... &#124; TypedArray&lt;...&gt;, options?: Par... |
| bun.XML.parse.[TypeLiteral] | TypeLiteral | bun.d.ts:1282 | { compact?: true &#124; undefined; } |
| bun.XML.parse.compact | PropertySignature | bun.d.ts:1282 | true &#124; undefined |
| bun.XML.parse | FunctionDeclaration | bun.d.ts:1284 | { (input: string &#124; Blob &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;, options?: (ParseOptions &amp; { ...; }) &#124; undefined): Document; (input: string &#124; ... 3 more ... &#124; TypedArray&lt;...&gt;, options: ParseOptions &amp; { ...; }): Node; (input: string &#124; ... 3 more ... &#124; TypedArray&lt;...&gt;, options?: Par... |
| bun.XML.parse.[TypeLiteral] | TypeLiteral | bun.d.ts:1286 | { compact: false; } |
| bun.XML.parse.compact | PropertySignature | bun.d.ts:1286 | false |
| bun.XML.parse | FunctionDeclaration | bun.d.ts:1288 | { (input: string &#124; Blob &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;, options?: (ParseOptions &amp; { ...; }) &#124; undefined): Document; (input: string &#124; ... 3 more ... &#124; TypedArray&lt;...&gt;, options: ParseOptions &amp; { ...; }): Node; (input: string &#124; ... 3 more ... &#124; TypedArray&lt;...&gt;, options?: Par... |
| bun.XML.Scalar | TypeAliasDeclaration | bun.d.ts:1296 | Scalar |
| bun.XML.NodeInput | InterfaceDeclaration | bun.d.ts:1303 | NodeInput |
| bun.XML.NodeInput.name | PropertySignature | bun.d.ts:1304 | string |
| bun.XML.NodeInput.attributes | PropertySignature | bun.d.ts:1305 | { [name: string]: Scalar &#124; null &#124; undefined; } &#124; null &#124; undefined |
| bun.XML.NodeInput.attributes.[TypeLiteral] | TypeLiteral | bun.d.ts:1305 | { [name: string]: Scalar &#124; null &#124; undefined; } |
| bun.XML.NodeInput.attributes.[index] | IndexSignature | bun.d.ts:1305 | any |
| bun.XML.NodeInput.children | PropertySignature | bun.d.ts:1306 | (Comment &#124; NodeInput &#124; ProcessingInstruction &#124; Scalar &#124; null &#124; undefined)[] &#124; null &#124; undefined |
| bun.XML.stringify | FunctionDeclaration | bun.d.ts:1361 | { (value: Document &#124; NodeInput, replacer?: null &#124; undefined, space?: string &#124; number &#124; undefined): string; (value: unknown, replacer?: null &#124; undefined, space?: string &#124; ... 1 more ... &#124; undefined): string &#124; undefined; } |
| bun.XML.stringify | FunctionDeclaration | bun.d.ts:1362 | { (value: Document &#124; NodeInput, replacer?: null &#124; undefined, space?: string &#124; number &#124; undefined): string; (value: unknown, replacer?: null &#124; undefined, space?: string &#124; ... 1 more ... &#124; undefined): string &#124; undefined; } |
| bun.JSONC | ModuleDeclaration | bun.d.ts:1368 | typeof JSONC |
| bun.JSONC.parse | FunctionDeclaration | bun.d.ts:1390 | (input: string) =&gt; unknown |
| bun.JSONL | ModuleDeclaration | bun.d.ts:1398 | typeof JSONL |
| bun.JSONL.ParseChunkResult | InterfaceDeclaration | bun.d.ts:1402 | ParseChunkResult |
| bun.JSONL.ParseChunkResult.values | PropertySignature | bun.d.ts:1404 | unknown[] |
| bun.JSONL.ParseChunkResult.read | PropertySignature | bun.d.ts:1406 | number |
| bun.JSONL.ParseChunkResult.done | PropertySignature | bun.d.ts:1408 | boolean |
| bun.JSONL.ParseChunkResult.error | PropertySignature | bun.d.ts:1410 | SyntaxError &#124; null |
| bun.JSONL.parse | FunctionDeclaration | bun.d.ts:1448 | (input: string &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;) =&gt; unknown[] |
| bun.JSONL.parseChunk | FunctionDeclaration | bun.d.ts:1482 | (input: string &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;, start?: number &#124; undefined, end?: number &#124; undefined) =&gt; ParseChunkResult |
| bun.YAML | ModuleDeclaration | bun.d.ts:1492 | typeof YAML |
| bun.YAML.parse | FunctionDeclaration | bun.d.ts:1515 | (input: string &#124; Blob &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;) =&gt; unknown |
| bun.YAML.stringify | FunctionDeclaration | bun.d.ts:1558 | (input: unknown, replacer?: null &#124; undefined, space?: string &#124; number &#124; undefined) =&gt; string |
| bun.markdown | ModuleDeclaration | bun.d.ts:1595 | typeof markdown |
| bun.markdown.Options | InterfaceDeclaration | bun.d.ts:1601 | Options |
| bun.markdown.Options.tables | PropertySignature | bun.d.ts:1603 | boolean &#124; undefined |
| bun.markdown.Options.strikethrough | PropertySignature | bun.d.ts:1605 | boolean &#124; undefined |
| bun.markdown.Options.tasklists | PropertySignature | bun.d.ts:1607 | boolean &#124; undefined |
| bun.markdown.Options.hardSoftBreaks | PropertySignature | bun.d.ts:1609 | boolean &#124; undefined |
| bun.markdown.Options.wikiLinks | PropertySignature | bun.d.ts:1611 | boolean &#124; undefined |
| bun.markdown.Options.underline | PropertySignature | bun.d.ts:1613 | boolean &#124; undefined |
| bun.markdown.Options.latexMath | PropertySignature | bun.d.ts:1615 | boolean &#124; undefined |
| bun.markdown.Options.collapseWhitespace | PropertySignature | bun.d.ts:1617 | boolean &#124; undefined |
| bun.markdown.Options.permissiveAtxHeaders | PropertySignature | bun.d.ts:1619 | boolean &#124; undefined |
| bun.markdown.Options.noIndentedCodeBlocks | PropertySignature | bun.d.ts:1621 | boolean &#124; undefined |
| bun.markdown.Options.noHtmlBlocks | PropertySignature | bun.d.ts:1623 | boolean &#124; undefined |
| bun.markdown.Options.noHtmlSpans | PropertySignature | bun.d.ts:1625 | boolean &#124; undefined |
| bun.markdown.Options.tagFilter | PropertySignature | bun.d.ts:1630 | boolean &#124; undefined |
| bun.markdown.Options.autolinks | PropertySignature | bun.d.ts:1643 | boolean &#124; { url?: boolean &#124; undefined; www?: boolean &#124; undefined; email?: boolean &#124; undefined; } &#124; undefined |
| bun.markdown.Options.autolinks.[TypeLiteral] | TypeLiteral | bun.d.ts:1643 | { url?: boolean &#124; undefined; www?: boolean &#124; undefined; email?: boolean &#124; undefined; } |
| bun.markdown.Options.autolinks.url | PropertySignature | bun.d.ts:1643 | boolean &#124; undefined |
| bun.markdown.Options.autolinks.www | PropertySignature | bun.d.ts:1643 | boolean &#124; undefined |
| bun.markdown.Options.autolinks.email | PropertySignature | bun.d.ts:1643 | boolean &#124; undefined |
| bun.markdown.Options.headings | PropertySignature | bun.d.ts:1656 | boolean &#124; { ids?: boolean &#124; undefined; autolink?: boolean &#124; undefined; } &#124; undefined |
| bun.markdown.Options.headings.[TypeLiteral] | TypeLiteral | bun.d.ts:1656 | { ids?: boolean &#124; undefined; autolink?: boolean &#124; undefined; } |
| bun.markdown.Options.headings.ids | PropertySignature | bun.d.ts:1656 | boolean &#124; undefined |
| bun.markdown.Options.headings.autolink | PropertySignature | bun.d.ts:1656 | boolean &#124; undefined |
| bun.markdown.Component | TypeAliasDeclaration | bun.d.ts:1660 | Component&lt;P&gt; |
| bun.markdown.Component.P | TypeParameter | bun.d.ts:1660 | P |
| bun.markdown.Component.[TypeLiteral] | TypeLiteral | bun.d.ts:1660 | {} |
| bun.markdown.Component.[FunctionType] | FunctionType | bun.d.ts:1660 | (props: P) =&gt; any |
| bun.markdown.Component.[ConstructorType] | ConstructorType | bun.d.ts:1660 | new (props: P) =&gt; any |
| bun.markdown.ChildrenProps | InterfaceDeclaration | bun.d.ts:1662 | ChildrenProps |
| bun.markdown.ChildrenProps.children | PropertySignature | bun.d.ts:1663 | unknown[] |
| bun.markdown.HeadingProps | InterfaceDeclaration | bun.d.ts:1665 | HeadingProps |
| bun.markdown.HeadingProps.id | PropertySignature | bun.d.ts:1667 | string &#124; undefined |
| bun.markdown.OrderedListProps | InterfaceDeclaration | bun.d.ts:1669 | OrderedListProps |
| bun.markdown.OrderedListProps.start | PropertySignature | bun.d.ts:1671 | number |
| bun.markdown.ListItemProps | InterfaceDeclaration | bun.d.ts:1673 | ListItemProps |
| bun.markdown.ListItemProps.checked | PropertySignature | bun.d.ts:1675 | boolean &#124; undefined |
| bun.markdown.CodeBlockProps | InterfaceDeclaration | bun.d.ts:1677 | CodeBlockProps |
| bun.markdown.CodeBlockProps.language | PropertySignature | bun.d.ts:1679 | string &#124; undefined |
| bun.markdown.CellProps | InterfaceDeclaration | bun.d.ts:1681 | CellProps |
| bun.markdown.CellProps.align | PropertySignature | bun.d.ts:1683 | "center" &#124; "left" &#124; "right" &#124; undefined |
| bun.markdown.LinkProps | InterfaceDeclaration | bun.d.ts:1685 | LinkProps |
| bun.markdown.LinkProps.href | PropertySignature | bun.d.ts:1687 | string |
| bun.markdown.LinkProps.title | PropertySignature | bun.d.ts:1689 | string &#124; undefined |
| bun.markdown.ImageProps | InterfaceDeclaration | bun.d.ts:1691 | ImageProps |
| bun.markdown.ImageProps.src | PropertySignature | bun.d.ts:1693 | string |
| bun.markdown.ImageProps.alt | PropertySignature | bun.d.ts:1695 | string &#124; undefined |
| bun.markdown.ImageProps.title | PropertySignature | bun.d.ts:1697 | string &#124; undefined |
| bun.markdown.ComponentOverrides | InterfaceDeclaration | bun.d.ts:1714 | ComponentOverrides |
| bun.markdown.ComponentOverrides.h1 | PropertySignature | bun.d.ts:1715 | Component&lt;HeadingProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.h2 | PropertySignature | bun.d.ts:1716 | Component&lt;HeadingProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.h3 | PropertySignature | bun.d.ts:1717 | Component&lt;HeadingProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.h4 | PropertySignature | bun.d.ts:1718 | Component&lt;HeadingProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.h5 | PropertySignature | bun.d.ts:1719 | Component&lt;HeadingProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.h6 | PropertySignature | bun.d.ts:1720 | Component&lt;HeadingProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.p | PropertySignature | bun.d.ts:1721 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.blockquote | PropertySignature | bun.d.ts:1722 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.ul | PropertySignature | bun.d.ts:1723 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.ol | PropertySignature | bun.d.ts:1724 | Component&lt;OrderedListProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.li | PropertySignature | bun.d.ts:1725 | Component&lt;ListItemProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.pre | PropertySignature | bun.d.ts:1726 | Component&lt;CodeBlockProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.hr | PropertySignature | bun.d.ts:1727 | Component&lt;{}&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.hr.[TypeLiteral] | TypeLiteral | bun.d.ts:1727 | {} |
| bun.markdown.ComponentOverrides.html | PropertySignature | bun.d.ts:1728 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.table | PropertySignature | bun.d.ts:1729 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.thead | PropertySignature | bun.d.ts:1730 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.tbody | PropertySignature | bun.d.ts:1731 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.tr | PropertySignature | bun.d.ts:1732 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.th | PropertySignature | bun.d.ts:1733 | Component&lt;CellProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.td | PropertySignature | bun.d.ts:1734 | Component&lt;CellProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.em | PropertySignature | bun.d.ts:1735 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.strong | PropertySignature | bun.d.ts:1736 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.a | PropertySignature | bun.d.ts:1737 | Component&lt;LinkProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.img | PropertySignature | bun.d.ts:1738 | Component&lt;ImageProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.code | PropertySignature | bun.d.ts:1739 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.del | PropertySignature | bun.d.ts:1740 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.math | PropertySignature | bun.d.ts:1741 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.u | PropertySignature | bun.d.ts:1742 | Component&lt;ChildrenProps&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.br | PropertySignature | bun.d.ts:1743 | Component&lt;{}&gt; &#124; undefined |
| bun.markdown.ComponentOverrides.br.[TypeLiteral] | TypeLiteral | bun.d.ts:1743 | {} |
| bun.markdown.HeadingMeta | InterfaceDeclaration | bun.d.ts:1747 | HeadingMeta |
| bun.markdown.HeadingMeta.level | PropertySignature | bun.d.ts:1749 | number |
| bun.markdown.HeadingMeta.id | PropertySignature | bun.d.ts:1751 | string &#124; undefined |
| bun.markdown.CodeBlockMeta | InterfaceDeclaration | bun.d.ts:1755 | CodeBlockMeta |
| bun.markdown.CodeBlockMeta.language | PropertySignature | bun.d.ts:1757 | string &#124; undefined |
| bun.markdown.ListMeta | InterfaceDeclaration | bun.d.ts:1761 | ListMeta |
| bun.markdown.ListMeta.ordered | PropertySignature | bun.d.ts:1763 | boolean |
| bun.markdown.ListMeta.start | PropertySignature | bun.d.ts:1765 | number &#124; undefined |
| bun.markdown.ListMeta.depth | PropertySignature | bun.d.ts:1767 | number |
| bun.markdown.ListItemMeta | InterfaceDeclaration | bun.d.ts:1771 | ListItemMeta |
| bun.markdown.ListItemMeta.index | PropertySignature | bun.d.ts:1773 | number |
| bun.markdown.ListItemMeta.depth | PropertySignature | bun.d.ts:1775 | number |
| bun.markdown.ListItemMeta.ordered | PropertySignature | bun.d.ts:1777 | boolean |
| bun.markdown.ListItemMeta.start | PropertySignature | bun.d.ts:1779 | number &#124; undefined |
| bun.markdown.ListItemMeta.checked | PropertySignature | bun.d.ts:1781 | boolean &#124; undefined |
| bun.markdown.CellMeta | InterfaceDeclaration | bun.d.ts:1785 | CellMeta |
| bun.markdown.CellMeta.align | PropertySignature | bun.d.ts:1787 | "center" &#124; "left" &#124; "right" &#124; undefined |
| bun.markdown.LinkMeta | InterfaceDeclaration | bun.d.ts:1791 | LinkMeta |
| bun.markdown.LinkMeta.href | PropertySignature | bun.d.ts:1793 | string |
| bun.markdown.LinkMeta.title | PropertySignature | bun.d.ts:1795 | string &#124; undefined |
| bun.markdown.ImageMeta | InterfaceDeclaration | bun.d.ts:1799 | ImageMeta |
| bun.markdown.ImageMeta.src | PropertySignature | bun.d.ts:1801 | string |
| bun.markdown.ImageMeta.title | PropertySignature | bun.d.ts:1803 | string &#124; undefined |
| bun.markdown.RenderCallbacks | InterfaceDeclaration | bun.d.ts:1813 | RenderCallbacks |
| bun.markdown.RenderCallbacks.heading | PropertySignature | bun.d.ts:1815 | ((children: string, meta: HeadingMeta) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.heading.[FunctionType] | FunctionType | bun.d.ts:1815 | (children: string, meta: HeadingMeta) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.paragraph | PropertySignature | bun.d.ts:1817 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.paragraph.[FunctionType] | FunctionType | bun.d.ts:1817 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.blockquote | PropertySignature | bun.d.ts:1819 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.blockquote.[FunctionType] | FunctionType | bun.d.ts:1819 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.code | PropertySignature | bun.d.ts:1821 | ((children: string, meta?: CodeBlockMeta &#124; undefined) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.code.[FunctionType] | FunctionType | bun.d.ts:1821 | (children: string, meta?: CodeBlockMeta &#124; undefined) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.list | PropertySignature | bun.d.ts:1823 | ((children: string, meta: ListMeta) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.list.[FunctionType] | FunctionType | bun.d.ts:1823 | (children: string, meta: ListMeta) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.listItem | PropertySignature | bun.d.ts:1825 | ((children: string, meta: ListItemMeta) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.listItem.[FunctionType] | FunctionType | bun.d.ts:1825 | (children: string, meta: ListItemMeta) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.hr | PropertySignature | bun.d.ts:1827 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.hr.[FunctionType] | FunctionType | bun.d.ts:1827 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.table | PropertySignature | bun.d.ts:1829 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.table.[FunctionType] | FunctionType | bun.d.ts:1829 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.thead | PropertySignature | bun.d.ts:1831 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.thead.[FunctionType] | FunctionType | bun.d.ts:1831 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.tbody | PropertySignature | bun.d.ts:1833 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.tbody.[FunctionType] | FunctionType | bun.d.ts:1833 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.tr | PropertySignature | bun.d.ts:1835 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.tr.[FunctionType] | FunctionType | bun.d.ts:1835 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.th | PropertySignature | bun.d.ts:1837 | ((children: string, meta?: CellMeta &#124; undefined) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.th.[FunctionType] | FunctionType | bun.d.ts:1837 | (children: string, meta?: CellMeta &#124; undefined) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.td | PropertySignature | bun.d.ts:1839 | ((children: string, meta?: CellMeta &#124; undefined) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.td.[FunctionType] | FunctionType | bun.d.ts:1839 | (children: string, meta?: CellMeta &#124; undefined) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.html | PropertySignature | bun.d.ts:1841 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.html.[FunctionType] | FunctionType | bun.d.ts:1841 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.strong | PropertySignature | bun.d.ts:1843 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.strong.[FunctionType] | FunctionType | bun.d.ts:1843 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.emphasis | PropertySignature | bun.d.ts:1845 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.emphasis.[FunctionType] | FunctionType | bun.d.ts:1845 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.link | PropertySignature | bun.d.ts:1847 | ((children: string, meta: LinkMeta) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.link.[FunctionType] | FunctionType | bun.d.ts:1847 | (children: string, meta: LinkMeta) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.image | PropertySignature | bun.d.ts:1849 | ((children: string, meta: ImageMeta) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.image.[FunctionType] | FunctionType | bun.d.ts:1849 | (children: string, meta: ImageMeta) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.codespan | PropertySignature | bun.d.ts:1851 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.codespan.[FunctionType] | FunctionType | bun.d.ts:1851 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.strikethrough | PropertySignature | bun.d.ts:1853 | ((children: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.strikethrough.[FunctionType] | FunctionType | bun.d.ts:1853 | (children: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.RenderCallbacks.text | PropertySignature | bun.d.ts:1855 | ((text: string) =&gt; string &#124; null &#124; undefined) &#124; undefined |
| bun.markdown.RenderCallbacks.text.[FunctionType] | FunctionType | bun.d.ts:1855 | (text: string) =&gt; string &#124; null &#124; undefined |
| bun.markdown.ReactOptions | InterfaceDeclaration | bun.d.ts:1859 | ReactOptions |
| bun.markdown.ReactOptions.reactVersion | PropertySignature | bun.d.ts:1865 | 18 &#124; 19 &#124; undefined |
| bun.markdown.html | FunctionDeclaration | bun.d.ts:1885 | (input: string &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;, options?: Options &#124; undefined) =&gt; string |
| bun.markdown.AnsiTheme | InterfaceDeclaration | bun.d.ts:1893 | AnsiTheme |
| bun.markdown.AnsiTheme.colors | PropertySignature | bun.d.ts:1900 | boolean &#124; undefined |
| bun.markdown.AnsiTheme.hyperlinks | PropertySignature | bun.d.ts:1906 | boolean &#124; undefined |
| bun.markdown.AnsiTheme.light | PropertySignature | bun.d.ts:1912 | boolean &#124; undefined |
| bun.markdown.AnsiTheme.columns | PropertySignature | bun.d.ts:1918 | number &#124; undefined |
| bun.markdown.AnsiTheme.kittyGraphics | PropertySignature | bun.d.ts:1925 | boolean &#124; undefined |
| bun.markdown.ansi | FunctionDeclaration | bun.d.ts:1961 | (input: string &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;, theme?: AnsiTheme &#124; undefined) =&gt; string |
| bun.markdown.render | FunctionDeclaration | bun.d.ts:2003 | (input: string &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;, callbacks?: RenderCallbacks &#124; undefined, options?: Options &#124; undefined) =&gt; string |
| bun.markdown.react | FunctionDeclaration | bun.d.ts:2052 | (input: string &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;, components?: ComponentOverrides &#124; undefined, options?: ReactOptions &#124; undefined) =&gt; unknown |
| bun.JSON5 | ModuleDeclaration | bun.d.ts:2062 | typeof JSON5 |
| bun.JSON5.parse | FunctionDeclaration | bun.d.ts:2089 | (input: string) =&gt; unknown |
| bun.JSON5.stringify | FunctionDeclaration | bun.d.ts:2119 | (input: unknown, replacer?: null &#124; undefined, space?: string &#124; number &#124; undefined) =&gt; string &#124; undefined |
| bun.resolveSync | FunctionDeclaration | bun.d.ts:2127 | (moduleId: string, parent: string) =&gt; string |
| bun.resolve | FunctionDeclaration | bun.d.ts:2136 | (moduleId: string, parent: string) =&gt; Promise&lt;string&gt; |
| bun.write | FunctionDeclaration | bun.d.ts:2151 | { (destination: BunFile &#124; S3File &#124; PathLike, input: string &#124; Archive &#124; BlobPart[] &#124; Blob &#124; ReadableStream&lt;any&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;...&gt;, options?: { ...; } &#124; undefined): Promise&lt;...&gt;; (destination: BunFile, input: Request &#124; Response, options?: { ...; } &#124; undefined): Promise&lt;...&gt;; (destinationPath: PathLik... |
| bun.write.[TypeLiteral] | TypeLiteral | bun.d.ts:2154 | { mode?: number &#124; undefined; createPath?: boolean &#124; undefined; } |
| bun.write.mode | PropertySignature | bun.d.ts:2158 | number &#124; undefined |
| bun.write.createPath | PropertySignature | bun.d.ts:2166 | boolean &#124; undefined |
| bun.write | FunctionDeclaration | bun.d.ts:2182 | { (destination: BunFile &#124; S3File &#124; PathLike, input: string &#124; Archive &#124; BlobPart[] &#124; Blob &#124; ReadableStream&lt;any&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;...&gt;, options?: { ...; } &#124; undefined): Promise&lt;...&gt;; (destination: BunFile, input: Request &#124; Response, options?: { ...; } &#124; undefined): Promise&lt;...&gt;; (destinationPath: PathLik... |
| bun.write.[TypeLiteral] | TypeLiteral | bun.d.ts:2185 | { createPath?: boolean &#124; undefined; } |
| bun.write.createPath | PropertySignature | bun.d.ts:2193 | boolean &#124; undefined |
| bun.write | FunctionDeclaration | bun.d.ts:2207 | { (destination: BunFile &#124; S3File &#124; PathLike, input: string &#124; Archive &#124; BlobPart[] &#124; Blob &#124; ReadableStream&lt;any&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;...&gt;, options?: { ...; } &#124; undefined): Promise&lt;...&gt;; (destination: BunFile, input: Request &#124; Response, options?: { ...; } &#124; undefined): Promise&lt;...&gt;; (destinationPath: PathLik... |
| bun.write.[TypeLiteral] | TypeLiteral | bun.d.ts:2210 | { createPath?: boolean &#124; undefined; } |
| bun.write.createPath | PropertySignature | bun.d.ts:2218 | boolean &#124; undefined |
| bun.write | FunctionDeclaration | bun.d.ts:2240 | { (destination: BunFile &#124; S3File &#124; PathLike, input: string &#124; Archive &#124; BlobPart[] &#124; Blob &#124; ReadableStream&lt;any&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;...&gt;, options?: { ...; } &#124; undefined): Promise&lt;...&gt;; (destination: BunFile, input: Request &#124; Response, options?: { ...; } &#124; undefined): Promise&lt;...&gt;; (destinationPath: PathLik... |
| bun.write.[TypeLiteral] | TypeLiteral | bun.d.ts:2243 | { mode?: number &#124; undefined; createPath?: boolean &#124; undefined; } |
| bun.write.mode | PropertySignature | bun.d.ts:2257 | number &#124; undefined |
| bun.write.createPath | PropertySignature | bun.d.ts:2265 | boolean &#124; undefined |
| bun.write | FunctionDeclaration | bun.d.ts:2286 | { (destination: BunFile &#124; S3File &#124; PathLike, input: string &#124; Archive &#124; BlobPart[] &#124; Blob &#124; ReadableStream&lt;any&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;...&gt;, options?: { ...; } &#124; undefined): Promise&lt;...&gt;; (destination: BunFile, input: Request &#124; Response, options?: { ...; } &#124; undefined): Promise&lt;...&gt;; (destinationPath: PathLik... |
| bun.write.[TypeLiteral] | TypeLiteral | bun.d.ts:2289 | { mode?: number &#124; undefined; createPath?: boolean &#124; undefined; } |
| bun.write.mode | PropertySignature | bun.d.ts:2303 | number &#124; undefined |
| bun.write.createPath | PropertySignature | bun.d.ts:2311 | boolean &#124; undefined |
| bun.SystemError | InterfaceDeclaration | bun.d.ts:2319 | SystemError |
| bun.SystemError.errno | PropertySignature | bun.d.ts:2320 | number &#124; undefined |
| bun.SystemError.code | PropertySignature | bun.d.ts:2321 | string &#124; undefined |
| bun.SystemError.path | PropertySignature | bun.d.ts:2322 | string &#124; undefined |
| bun.SystemError.syscall | PropertySignature | bun.d.ts:2323 | string &#124; undefined |
| bun.concatArrayBuffers | FunctionDeclaration | bun.d.ts:2338 | { (buffers: (ArrayBufferLike &#124; ArrayBufferView&lt;ArrayBufferLike&gt;)[], maxLength?: number &#124; undefined): ArrayBuffer; (buffers: (ArrayBufferLike &#124; ArrayBufferView&lt;...&gt;)[], maxLength: number, asUint8Array: false): ArrayBuffer; (buffers: (ArrayBufferLike &#124; ArrayBufferView&lt;...&gt;)[], maxLength: number, asUint8Array: true): U... |
| bun.concatArrayBuffers | FunctionDeclaration | bun.d.ts:2339 | { (buffers: (ArrayBufferLike &#124; ArrayBufferView&lt;ArrayBufferLike&gt;)[], maxLength?: number &#124; undefined): ArrayBuffer; (buffers: (ArrayBufferLike &#124; ArrayBufferView&lt;...&gt;)[], maxLength: number, asUint8Array: false): ArrayBuffer; (buffers: (ArrayBufferLike &#124; ArrayBufferView&lt;...&gt;)[], maxLength: number, asUint8Array: true): U... |
| bun.concatArrayBuffers | FunctionDeclaration | bun.d.ts:2344 | { (buffers: (ArrayBufferLike &#124; ArrayBufferView&lt;ArrayBufferLike&gt;)[], maxLength?: number &#124; undefined): ArrayBuffer; (buffers: (ArrayBufferLike &#124; ArrayBufferView&lt;...&gt;)[], maxLength: number, asUint8Array: false): ArrayBuffer; (buffers: (ArrayBufferLike &#124; ArrayBufferView&lt;...&gt;)[], maxLength: number, asUint8Array: true): U... |
| bun.readableStreamToArrayBuffer | FunctionDeclaration | bun.d.ts:2360 | (stream: ReadableStream&lt;ArrayBufferLike &#124; ArrayBufferView&lt;ArrayBufferLike&gt;&gt;) =&gt; ArrayBuffer &#124; Promise&lt;...&gt; |
| bun.readableStreamToFormData | FunctionDeclaration | bun.d.ts:2391 | (stream: ReadableStream&lt;string &#124; BigInt64Array&lt;ArrayBufferLike&gt; &#124; BigUint64Array&lt;ArrayBufferLike&gt; &#124; DataView&lt;ArrayBufferLike&gt; &#124; ... 9 more ... &#124; Uint8ClampedArray&lt;...&gt;&gt;, multipartBoundaryExcludingDashes?: string &#124; ... 13 more ... &#124; undefined) =&gt; Promise&lt;...&gt; |
| bun.readableStreamToArray | FunctionDeclaration | bun.d.ts:2402 | &lt;T&gt;(stream: ReadableStream&lt;T&gt;) =&gt; T[] &#124; Promise&lt;T[]&gt; |
| bun.readableStreamToArray.T | TypeParameter | bun.d.ts:2402 | T |
| bun.escapeHTML | FunctionDeclaration | bun.d.ts:2421 | (input: string &#124; number &#124; boolean &#124; object) =&gt; string |
| bun.pathToFileURL | FunctionDeclaration | bun.d.ts:2440 | (path: string) =&gt; URL |
| bun.peek | FunctionDeclaration | bun.d.ts:2445 | typeof peek |
| bun.peek.T | TypeParameter | bun.d.ts:2445 | T |
| bun.peek | ModuleDeclaration | bun.d.ts:2446 | typeof peek |
| bun.peek.status | FunctionDeclaration | bun.d.ts:2450 | &lt;T = undefined&gt;(promise: T &#124; Promise&lt;T&gt;) =&gt; "fulfilled" &#124; "pending" &#124; "rejected" |
| bun.peek.status.T | TypeParameter | bun.d.ts:2450 | T |
| bun.fileURLToPath | FunctionDeclaration | bun.d.ts:2468 | (url: string &#124; URL) =&gt; string |
| bun.ArrayBufferSink | ClassDeclaration | bun.d.ts:2473 | ArrayBufferSink |
| bun.ArrayBufferSink.start | MethodDeclaration | bun.d.ts:2474 | (options?: { asUint8Array?: boolean &#124; undefined; highWaterMark?: number &#124; undefined; stream?: boolean &#124; undefined; } &#124; undefined) =&gt; void |
| bun.ArrayBufferSink.start.[TypeLiteral] | TypeLiteral | bun.d.ts:2474 | { asUint8Array?: boolean &#124; undefined; highWaterMark?: number &#124; undefined; stream?: boolean &#124; undefined; } |
| bun.ArrayBufferSink.start.asUint8Array | PropertySignature | bun.d.ts:2475 | boolean &#124; undefined |
| bun.ArrayBufferSink.start.highWaterMark | PropertySignature | bun.d.ts:2480 | number &#124; undefined |
| bun.ArrayBufferSink.start.stream | PropertySignature | bun.d.ts:2485 | boolean &#124; undefined |
| bun.ArrayBufferSink.write | MethodDeclaration | bun.d.ts:2488 | (chunk: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;) =&gt; number |
| bun.ArrayBufferSink.flush | MethodDeclaration | bun.d.ts:2498 | () =&gt; number &#124; ArrayBuffer &#124; Uint8Array&lt;ArrayBuffer&gt; |
| bun.ArrayBufferSink.end | MethodDeclaration | bun.d.ts:2499 | () =&gt; ArrayBuffer &#124; Uint8Array&lt;ArrayBuffer&gt; |
| bun.dns | ModuleDeclaration | bun.d.ts:2503 | typeof dns |
| bun.dns.lookup | FunctionDeclaration | bun.d.ts:2546 | (hostname: string, options?: { family?: "IPv4" &#124; "IPv6" &#124; "any" &#124; 0 &#124; 4 &#124; 6 &#124; undefined; socketType?: "tcp" &#124; "udp" &#124; undefined; flags?: number &#124; undefined; port?: number &#124; undefined; backend?: "c-ares" &#124; ... 3 more ... &#124; undefined; } &#124; undefined) =&gt; Promise&lt;...&gt; |
| bun.dns.lookup.[TypeLiteral] | TypeLiteral | bun.d.ts:2548 | { family?: "IPv4" &#124; "IPv6" &#124; "any" &#124; 0 &#124; 4 &#124; 6 &#124; undefined; socketType?: "tcp" &#124; "udp" &#124; undefined; flags?: number &#124; undefined; port?: number &#124; undefined; backend?: "c-ares" &#124; "getaddrinfo" &#124; "libc" &#124; "system" &#124; undefined; } |
| bun.dns.lookup.family | PropertySignature | bun.d.ts:2552 | "IPv4" &#124; "IPv6" &#124; "any" &#124; 0 &#124; 4 &#124; 6 &#124; undefined |
| bun.dns.lookup.socketType | PropertySignature | bun.d.ts:2556 | "tcp" &#124; "udp" &#124; undefined |
| bun.dns.lookup.flags | PropertySignature | bun.d.ts:2557 | number &#124; undefined |
| bun.dns.lookup.port | PropertySignature | bun.d.ts:2558 | number &#124; undefined |
| bun.dns.lookup.backend | PropertySignature | bun.d.ts:2593 | "c-ares" &#124; "getaddrinfo" &#124; "libc" &#124; "system" &#124; undefined |
| bun.dns.prefetch | FunctionDeclaration | bun.d.ts:2614 | (hostname: string, port?: number &#124; undefined) =&gt; void |
| bun.dns.getCacheStats | FunctionDeclaration | bun.d.ts:2619 | () =&gt; { cacheHitsCompleted: number; cacheHitsInflight: number; cacheMisses: number; size: number; errors: number; totalCount: number; } |
| bun.dns.getCacheStats.[TypeLiteral] | TypeLiteral | bun.d.ts:2619 | { cacheHitsCompleted: number; cacheHitsInflight: number; cacheMisses: number; size: number; errors: number; totalCount: number; } |
| bun.dns.getCacheStats.cacheHitsCompleted | PropertySignature | bun.d.ts:2623 | number |
| bun.dns.getCacheStats.cacheHitsInflight | PropertySignature | bun.d.ts:2624 | number |
| bun.dns.getCacheStats.cacheMisses | PropertySignature | bun.d.ts:2625 | number |
| bun.dns.getCacheStats.size | PropertySignature | bun.d.ts:2626 | number |
| bun.dns.getCacheStats.errors | PropertySignature | bun.d.ts:2627 | number |
| bun.dns.getCacheStats.totalCount | PropertySignature | bun.d.ts:2628 | number |
| bun.dns.ADDRCONFIG | VariableDeclaration | bun.d.ts:2631 | number |
| bun.dns.ALL | VariableDeclaration | bun.d.ts:2632 | number |
| bun.dns.V4MAPPED | VariableDeclaration | bun.d.ts:2633 | number |
| bun.DNSLookup | InterfaceDeclaration | bun.d.ts:2636 | DNSLookup |
| bun.DNSLookup.address | PropertySignature | bun.d.ts:2644 | string |
| bun.DNSLookup.family | PropertySignature | bun.d.ts:2645 | 4 &#124; 6 |
| bun.DNSLookup.ttl | PropertySignature | bun.d.ts:2653 | number |
| bun.FileBlob | InterfaceDeclaration | bun.d.ts:2656 | FileBlob |
| bun.BunFile | InterfaceDeclaration | bun.d.ts:2682 | BunFile |
| bun.BunFile.slice | MethodSignature | bun.d.ts:2694 | { (begin?: number &#124; undefined, end?: number &#124; undefined, contentType?: string &#124; undefined): BunFile; (begin?: number &#124; undefined, contentType?: string &#124; undefined): BunFile; (contentType?: string &#124; undefined): BunFile; } |
| bun.BunFile.slice | MethodSignature | bun.d.ts:2706 | { (begin?: number &#124; undefined, end?: number &#124; undefined, contentType?: string &#124; undefined): BunFile; (begin?: number &#124; undefined, contentType?: string &#124; undefined): BunFile; (contentType?: string &#124; undefined): BunFile; } |
| bun.BunFile.slice | MethodSignature | bun.d.ts:2713 | { (begin?: number &#124; undefined, end?: number &#124; undefined, contentType?: string &#124; undefined): BunFile; (begin?: number &#124; undefined, contentType?: string &#124; undefined): BunFile; (contentType?: string &#124; undefined): BunFile; } |
| bun.BunFile.writer | MethodSignature | bun.d.ts:2718 | (options?: { highWaterMark?: number &#124; undefined; } &#124; undefined) =&gt; FileSink |
| bun.BunFile.writer.[TypeLiteral] | TypeLiteral | bun.d.ts:2718 | { highWaterMark?: number &#124; undefined; } |
| bun.BunFile.writer.highWaterMark | PropertySignature | bun.d.ts:2718 | number &#124; undefined |
| bun.BunFile.lastModified | PropertySignature | bun.d.ts:2727 | number |
| bun.BunFile.name | PropertySignature | bun.d.ts:2731 | string &#124; undefined |
| bun.BunFile.exists | MethodSignature | bun.d.ts:2753 | () =&gt; Promise&lt;boolean&gt; |
| bun.BunFile.write | MethodSignature | bun.d.ts:2760 | (data: string &#124; ArrayBuffer &#124; BunFile &#124; ReadableStream&lt;any&gt; &#124; Request &#124; Response &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;...&gt;, options?: { ...; } &#124; undefined) =&gt; Promise&lt;...&gt; |
| bun.BunFile.write.[TypeLiteral] | TypeLiteral | bun.d.ts:2762 | { highWaterMark?: number &#124; undefined; } |
| bun.BunFile.write.highWaterMark | PropertySignature | bun.d.ts:2762 | number &#124; undefined |
| bun.BunFile.unlink | MethodSignature | bun.d.ts:2768 | () =&gt; Promise&lt;void&gt; |
| bun.BunFile.delete | MethodSignature | bun.d.ts:2773 | () =&gt; Promise&lt;void&gt; |
| bun.BunFile.stat | MethodSignature | bun.d.ts:2778 | () =&gt; Promise&lt;Stats&gt; |
| bun.CSRFAlgorithm | TypeAliasDeclaration | bun.d.ts:2781 | CSRFAlgorithm |
| bun.CSRFGenerateOptions | InterfaceDeclaration | bun.d.ts:2783 | CSRFGenerateOptions |
| bun.CSRFGenerateOptions.expiresIn | PropertySignature | bun.d.ts:2788 | number &#124; undefined |
| bun.CSRFGenerateOptions.encoding | PropertySignature | bun.d.ts:2794 | "base64" &#124; "base64url" &#124; "hex" &#124; undefined |
| bun.CSRFGenerateOptions.algorithm | PropertySignature | bun.d.ts:2800 | CSRFAlgorithm &#124; undefined |
| bun.CSRFGenerateOptions.sessionId | PropertySignature | bun.d.ts:2808 | string &#124; undefined |
| bun.CSRFVerifyOptions | InterfaceDeclaration | bun.d.ts:2811 | CSRFVerifyOptions |
| bun.CSRFVerifyOptions.secret | PropertySignature | bun.d.ts:2815 | string &#124; undefined |
| bun.CSRFVerifyOptions.encoding | PropertySignature | bun.d.ts:2821 | "base64" &#124; "base64url" &#124; "hex" &#124; undefined |
| bun.CSRFVerifyOptions.algorithm | PropertySignature | bun.d.ts:2827 | CSRFAlgorithm &#124; undefined |
| bun.CSRFVerifyOptions.maxAge | PropertySignature | bun.d.ts:2833 | number &#124; undefined |
| bun.CSRFVerifyOptions.sessionId | PropertySignature | bun.d.ts:2841 | string &#124; undefined |
| bun.CSRF | ModuleDeclaration | bun.d.ts:2849 | typeof CSRF |
| bun.CSRF.generate | FunctionDeclaration | bun.d.ts:2856 | (secret?: string &#124; undefined, options?: CSRFGenerateOptions &#124; undefined) =&gt; string |
| bun.CSRF.verify | FunctionDeclaration | bun.d.ts:2864 | (token: string, options?: CSRFVerifyOptions &#124; undefined) =&gt; boolean |
| bun.MacroMap | TypeAliasDeclaration | bun.d.ts:2878 | MacroMap |
| bun.hash | VariableDeclaration | bun.d.ts:2887 | ((data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: number &#124; bigint &#124; undefined) =&gt; bigint) &amp; Hash |
| bun.[FunctionType] | FunctionType | bun.d.ts:2887 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: number &#124; bigint &#124; undefined) =&gt; bigint |
| bun.Hash | InterfaceDeclaration | bun.d.ts:2890 | Hash |
| bun.Hash.wyhash | PropertySignature | bun.d.ts:2891 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.Hash.wyhash.[FunctionType] | FunctionType | bun.d.ts:2891 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.Hash.adler32 | PropertySignature | bun.d.ts:2892 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;) =&gt; number |
| bun.Hash.adler32.[FunctionType] | FunctionType | bun.d.ts:2892 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;) =&gt; number |
| bun.Hash.crc32 | PropertySignature | bun.d.ts:2893 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: number &#124; undefined) =&gt; number |
| bun.Hash.crc32.[FunctionType] | FunctionType | bun.d.ts:2893 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: number &#124; undefined) =&gt; number |
| bun.Hash.cityHash32 | PropertySignature | bun.d.ts:2894 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;) =&gt; number |
| bun.Hash.cityHash32.[FunctionType] | FunctionType | bun.d.ts:2894 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;) =&gt; number |
| bun.Hash.cityHash64 | PropertySignature | bun.d.ts:2895 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.Hash.cityHash64.[FunctionType] | FunctionType | bun.d.ts:2895 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.Hash.xxHash32 | PropertySignature | bun.d.ts:2896 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: number &#124; undefined) =&gt; number |
| bun.Hash.xxHash32.[FunctionType] | FunctionType | bun.d.ts:2896 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: number &#124; undefined) =&gt; number |
| bun.Hash.xxHash64 | PropertySignature | bun.d.ts:2897 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.Hash.xxHash64.[FunctionType] | FunctionType | bun.d.ts:2897 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.Hash.xxHash3 | PropertySignature | bun.d.ts:2898 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.Hash.xxHash3.[FunctionType] | FunctionType | bun.d.ts:2898 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.Hash.murmur32v3 | PropertySignature | bun.d.ts:2899 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: number &#124; undefined) =&gt; number |
| bun.Hash.murmur32v3.[FunctionType] | FunctionType | bun.d.ts:2899 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: number &#124; undefined) =&gt; number |
| bun.Hash.murmur32v2 | PropertySignature | bun.d.ts:2900 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: number &#124; undefined) =&gt; number |
| bun.Hash.murmur32v2.[FunctionType] | FunctionType | bun.d.ts:2900 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: number &#124; undefined) =&gt; number |
| bun.Hash.murmur64v2 | PropertySignature | bun.d.ts:2901 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.Hash.murmur64v2.[FunctionType] | FunctionType | bun.d.ts:2901 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.Hash.rapidhash | PropertySignature | bun.d.ts:2902 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.Hash.rapidhash.[FunctionType] | FunctionType | bun.d.ts:2902 | (data: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, seed?: bigint &#124; undefined) =&gt; bigint |
| bun.JavaScriptLoader | TypeAliasDeclaration | bun.d.ts:2905 | JavaScriptLoader |
| bun.deepEquals | FunctionDeclaration | bun.d.ts:2912 | (a: any, b: any, strict?: boolean &#124; undefined) =&gt; boolean |
| bun.deepMatch | FunctionDeclaration | bun.d.ts:2925 | (subset: unknown, a: unknown) =&gt; boolean |
| bun.TSConfig | InterfaceDeclaration | bun.d.ts:2930 | TSConfig |
| bun.TSConfig.extends | PropertySignature | bun.d.ts:2931 | string &#124; undefined |
| bun.TSConfig.compilerOptions | PropertySignature | bun.d.ts:2932 | { paths?: Record&lt;string, string[]&gt; &#124; undefined; baseUrl?: string &#124; undefined; jsx?: "preserve" &#124; "react" &#124; "react-jsx" &#124; "react-jsxdev" &#124; undefined; jsxFactory?: string &#124; undefined; ... 4 more ...; moduleSuffixes?: any; } &#124; undefined |
| bun.TSConfig.compilerOptions.[TypeLiteral] | TypeLiteral | bun.d.ts:2932 | { paths?: Record&lt;string, string[]&gt; &#124; undefined; baseUrl?: string &#124; undefined; jsx?: "preserve" &#124; "react" &#124; "react-jsx" &#124; "react-jsxdev" &#124; undefined; jsxFactory?: string &#124; undefined; ... 4 more ...; moduleSuffixes?: any; } |
| bun.TSConfig.compilerOptions.paths | PropertySignature | bun.d.ts:2933 | Record&lt;string, string[]&gt; &#124; undefined |
| bun.TSConfig.compilerOptions.baseUrl | PropertySignature | bun.d.ts:2934 | string &#124; undefined |
| bun.TSConfig.compilerOptions.jsx | PropertySignature | bun.d.ts:2936 | "preserve" &#124; "react" &#124; "react-jsx" &#124; "react-jsxdev" &#124; undefined |
| bun.TSConfig.compilerOptions.jsxFactory | PropertySignature | bun.d.ts:2937 | string &#124; undefined |
| bun.TSConfig.compilerOptions.jsxFragmentFactory | PropertySignature | bun.d.ts:2938 | string &#124; undefined |
| bun.TSConfig.compilerOptions.jsxImportSource | PropertySignature | bun.d.ts:2939 | string &#124; undefined |
| bun.TSConfig.compilerOptions.useDefineForClassFields | PropertySignature | bun.d.ts:2940 | boolean &#124; undefined |
| bun.TSConfig.compilerOptions.importsNotUsedAsValues | PropertySignature | bun.d.ts:2941 | "error" &#124; "preserve" &#124; "remove" &#124; undefined |
| bun.TSConfig.compilerOptions.moduleSuffixes | PropertySignature | bun.d.ts:2943 | any |
| bun.TranspilerOptions | InterfaceDeclaration | bun.d.ts:2947 | TranspilerOptions |
| bun.TranspilerOptions.define | PropertySignature | bun.d.ts:2955 | Record&lt;string, string&gt; &#124; undefined |
| bun.TranspilerOptions.loader | PropertySignature | bun.d.ts:2958 | JavaScriptLoader &#124; undefined |
| bun.TranspilerOptions.target | PropertySignature | bun.d.ts:2962 | Target &#124; undefined |
| bun.TranspilerOptions.tsconfig | PropertySignature | bun.d.ts:2969 | string &#124; TSConfig &#124; undefined |
| bun.TranspilerOptions.macro | PropertySignature | bun.d.ts:3008 | MacroMap &#124; undefined |
| bun.TranspilerOptions.autoImportJSX | PropertySignature | bun.d.ts:3010 | boolean &#124; undefined |
| bun.TranspilerOptions.allowBunRuntime | PropertySignature | bun.d.ts:3011 | boolean &#124; undefined |
| bun.TranspilerOptions.exports | PropertySignature | bun.d.ts:3012 | { eliminate?: string[] &#124; undefined; replace?: Record&lt;string, string&gt; &#124; undefined; } &#124; undefined |
| bun.TranspilerOptions.exports.[TypeLiteral] | TypeLiteral | bun.d.ts:3012 | { eliminate?: string[] &#124; undefined; replace?: Record&lt;string, string&gt; &#124; undefined; } |
| bun.TranspilerOptions.exports.eliminate | PropertySignature | bun.d.ts:3013 | string[] &#124; undefined |
| bun.TranspilerOptions.exports.replace | PropertySignature | bun.d.ts:3014 | Record&lt;string, string&gt; &#124; undefined |
| bun.TranspilerOptions.treeShaking | PropertySignature | bun.d.ts:3016 | boolean &#124; undefined |
| bun.TranspilerOptions.trimUnusedImports | PropertySignature | bun.d.ts:3017 | boolean &#124; undefined |
| bun.TranspilerOptions.jsxOptimizationInline | PropertySignature | bun.d.ts:3018 | boolean &#124; undefined |
| bun.TranspilerOptions.minifyWhitespace | PropertySignature | bun.d.ts:3025 | boolean &#124; undefined |
| bun.TranspilerOptions.deadCodeElimination | PropertySignature | bun.d.ts:3033 | boolean &#124; undefined |
| bun.TranspilerOptions.inline | PropertySignature | bun.d.ts:3047 | boolean &#124; undefined |
| bun.TranspilerOptions.logLevel | PropertySignature | bun.d.ts:3052 | "debug" &#124; "error" &#124; "info" &#124; "verbose" &#124; "warn" &#124; undefined |
| bun.TranspilerOptions.replMode | PropertySignature | bun.d.ts:3063 | boolean &#124; undefined |
| bun.Transpiler | ClassDeclaration | bun.d.ts:3086 | Transpiler |
| bun.Transpiler.constructor | Constructor | bun.d.ts:3087 | any |
| bun.Transpiler.transform | MethodDeclaration | bun.d.ts:3094 | (code: StringOrBuffer, loader?: JavaScriptLoader &#124; undefined) =&gt; Promise&lt;string&gt; |
| bun.Transpiler.transformSync | MethodDeclaration | bun.d.ts:3100 | { (code: StringOrBuffer, loader: JavaScriptLoader, ctx: object): string; (code: StringOrBuffer, ctx: object): string; (code: StringOrBuffer, loader?: JavaScriptLoader &#124; undefined): string; } |
| bun.Transpiler.transformSync | MethodDeclaration | bun.d.ts:3107 | { (code: StringOrBuffer, loader: JavaScriptLoader, ctx: object): string; (code: StringOrBuffer, ctx: object): string; (code: StringOrBuffer, loader?: JavaScriptLoader &#124; undefined): string; } |
| bun.Transpiler.transformSync | MethodDeclaration | bun.d.ts:3114 | { (code: StringOrBuffer, loader: JavaScriptLoader, ctx: object): string; (code: StringOrBuffer, ctx: object): string; (code: StringOrBuffer, loader?: JavaScriptLoader &#124; undefined): string; } |
| bun.Transpiler.scan | MethodDeclaration | bun.d.ts:3130 | (code: StringOrBuffer) =&gt; { exports: string[]; imports: Import[]; } |
| bun.Transpiler.scan.[TypeLiteral] | TypeLiteral | bun.d.ts:3130 | { exports: string[]; imports: Import[]; } |
| bun.Transpiler.scan.exports | PropertySignature | bun.d.ts:3130 | string[] |
| bun.Transpiler.scan.imports | PropertySignature | bun.d.ts:3130 | Import[] |
| bun.Transpiler.scanImports | MethodDeclaration | bun.d.ts:3147 | (code: StringOrBuffer) =&gt; Import[] |
| bun.ImportKind | TypeAliasDeclaration | bun.d.ts:3150 | ImportKind |
| bun.Import | InterfaceDeclaration | bun.d.ts:3161 | Import |
| bun.Import.path | PropertySignature | bun.d.ts:3162 | string |
| bun.Import.kind | PropertySignature | bun.d.ts:3163 | ImportKind |
| bun.Build | ModuleDeclaration | bun.d.ts:3166 | any |
| bun.Build.Architecture | TypeAliasDeclaration | bun.d.ts:3167 | Architecture |
| bun.Build.Libc | TypeAliasDeclaration | bun.d.ts:3168 | Libc |
| bun.Build.SIMD | TypeAliasDeclaration | bun.d.ts:3169 | SIMD |
| bun.Build.CompileTarget | TypeAliasDeclaration | bun.d.ts:3170 | CompileTarget |
| bun.BuildConfig | InterfaceDeclaration | bun.d.ts:3184 | BuildConfig |
| bun.BuildConfig.splitting | PropertySignature | bun.d.ts:3188 | boolean &#124; undefined |
| bun.BuildConfig.splitRequire | PropertySignature | bun.d.ts:3200 | boolean &#124; undefined |
| bun.BuildConfig.minChunkSize | PropertySignature | bun.d.ts:3217 | number &#124; undefined |
| bun.BuildConfig.modulePreload | PropertySignature | bun.d.ts:3228 | boolean &#124; undefined |
| bun.BuildConfig.entrypoints | PropertySignature | bun.d.ts:3233 | string[] |
| bun.BuildConfig.target | PropertySignature | bun.d.ts:3238 | Target &#124; undefined |
| bun.BuildConfig.format | PropertySignature | bun.d.ts:3250 | "cjs" &#124; "esm" &#124; "iife" &#124; undefined |
| bun.BuildConfig.naming | PropertySignature | bun.d.ts:3273 | string &#124; { chunk?: string &#124; undefined; entry?: string &#124; undefined; asset?: string &#124; undefined; } &#124; undefined |
| bun.BuildConfig.naming.[TypeLiteral] | TypeLiteral | bun.d.ts:3275 | { chunk?: string &#124; undefined; entry?: string &#124; undefined; asset?: string &#124; undefined; } |
| bun.BuildConfig.naming.chunk | PropertySignature | bun.d.ts:3276 | string &#124; undefined |
| bun.BuildConfig.naming.entry | PropertySignature | bun.d.ts:3277 | string &#124; undefined |
| bun.BuildConfig.naming.asset | PropertySignature | bun.d.ts:3278 | string &#124; undefined |
| bun.BuildConfig.root | PropertySignature | bun.d.ts:3280 | string &#124; undefined |
| bun.BuildConfig.plugins | PropertySignature | bun.d.ts:3281 | BunPlugin[] &#124; undefined |
| bun.BuildConfig.external | PropertySignature | bun.d.ts:3283 | string[] &#124; undefined |
| bun.BuildConfig.allowUnresolved | PropertySignature | bun.d.ts:3298 | string[] &#124; undefined |
| bun.BuildConfig.packages | PropertySignature | bun.d.ts:3299 | "bundle" &#124; "external" &#124; undefined |
| bun.BuildConfig.publicPath | PropertySignature | bun.d.ts:3300 | string &#124; undefined |
| bun.BuildConfig.define | PropertySignature | bun.d.ts:3301 | Record&lt;string, string&gt; &#124; undefined |
| bun.BuildConfig.loader | PropertySignature | bun.d.ts:3303 | { [x: string]: Loader; } &#124; undefined |
| bun.BuildConfig.loader.[MappedType] | MappedType | bun.d.ts:3303 | { [x: string]: Loader; } |
| bun.BuildConfig.loader.k | TypeParameter | bun.d.ts:3303 | k |
| bun.BuildConfig.sourcemap | PropertySignature | bun.d.ts:3322 | "external" &#124; "inline" &#124; "linked" &#124; "none" &#124; boolean &#124; undefined |
| bun.BuildConfig.conditions | PropertySignature | bun.d.ts:3331 | string &#124; string[] &#124; undefined |
| bun.BuildConfig.env | PropertySignature | bun.d.ts:3351 | "disable" &#124; "inline" &#124; `${string}*` &#124; undefined |
| bun.BuildConfig.minify | PropertySignature | bun.d.ts:3361 | boolean &#124; { whitespace?: boolean &#124; undefined; syntax?: boolean &#124; undefined; identifiers?: boolean &#124; undefined; keepNames?: boolean &#124; undefined; } &#124; undefined |
| bun.BuildConfig.minify.[TypeLiteral] | TypeLiteral | bun.d.ts:3363 | { whitespace?: boolean &#124; undefined; syntax?: boolean &#124; undefined; identifiers?: boolean &#124; undefined; keepNames?: boolean &#124; undefined; } |
| bun.BuildConfig.minify.whitespace | PropertySignature | bun.d.ts:3364 | boolean &#124; undefined |
| bun.BuildConfig.minify.syntax | PropertySignature | bun.d.ts:3365 | boolean &#124; undefined |
| bun.BuildConfig.minify.identifiers | PropertySignature | bun.d.ts:3366 | boolean &#124; undefined |
| bun.BuildConfig.minify.keepNames | PropertySignature | bun.d.ts:3367 | boolean &#124; undefined |
| bun.BuildConfig.ignoreDCEAnnotations | PropertySignature | bun.d.ts:3375 | boolean &#124; undefined |
| bun.BuildConfig.emitDCEAnnotations | PropertySignature | bun.d.ts:3380 | boolean &#124; undefined |
| bun.BuildConfig.deprecatedNamespaceObjectSetters | PropertySignature | bun.d.ts:3393 | boolean &#124; undefined |
| bun.BuildConfig.treeShaking | PropertySignature | bun.d.ts:3400 | boolean &#124; undefined |
| bun.BuildConfig.bytecode | PropertySignature | bun.d.ts:3428 | boolean &#124; undefined |
| bun.BuildConfig.bytecodeDepth | PropertySignature | bun.d.ts:3439 | number &#124; undefined |
| bun.BuildConfig.optimize | PropertySignature | bun.d.ts:3444 | { bytecode?: boolean &#124; undefined; } &#124; undefined |
| bun.BuildConfig.optimize.[TypeLiteral] | TypeLiteral | bun.d.ts:3444 | { bytecode?: boolean &#124; undefined; } |
| bun.BuildConfig.optimize.bytecode | PropertySignature | bun.d.ts:3450 | boolean &#124; undefined |
| bun.BuildConfig.banner | PropertySignature | bun.d.ts:3456 | string &#124; undefined |
| bun.BuildConfig.footer | PropertySignature | bun.d.ts:3463 | string &#124; undefined |
| bun.BuildConfig.drop | PropertySignature | bun.d.ts:3468 | string[] &#124; undefined |
| bun.BuildConfig.features | PropertySignature | bun.d.ts:3486 | string[] &#124; undefined |
| bun.BuildConfig.optimizeImports | PropertySignature | bun.d.ts:3505 | string[] &#124; undefined |
| bun.BuildConfig.check | PropertySignature | bun.d.ts:3535 | boolean &#124; undefined |
| bun.BuildConfig.throw | PropertySignature | bun.d.ts:3543 | boolean &#124; undefined |
| bun.BuildConfig.tsconfig | PropertySignature | bun.d.ts:3558 | string &#124; undefined |
| bun.BuildConfig.jsx | PropertySignature | bun.d.ts:3563 | { runtime?: "automatic" &#124; "classic" &#124; undefined; importSource?: string &#124; undefined; factory?: string &#124; undefined; fragment?: string &#124; undefined; sideEffects?: boolean &#124; undefined; development?: boolean &#124; undefined; } &#124; undefined |
| bun.BuildConfig.jsx.[TypeLiteral] | TypeLiteral | bun.d.ts:3563 | { runtime?: "automatic" &#124; "classic" &#124; undefined; importSource?: string &#124; undefined; factory?: string &#124; undefined; fragment?: string &#124; undefined; sideEffects?: boolean &#124; undefined; development?: boolean &#124; undefined; } |
| bun.BuildConfig.jsx.runtime | PropertySignature | bun.d.ts:3564 | "automatic" &#124; "classic" &#124; undefined |
| bun.BuildConfig.jsx.importSource | PropertySignature | bun.d.ts:3565 | string &#124; undefined |
| bun.BuildConfig.jsx.factory | PropertySignature | bun.d.ts:3566 | string &#124; undefined |
| bun.BuildConfig.jsx.fragment | PropertySignature | bun.d.ts:3567 | string &#124; undefined |
| bun.BuildConfig.jsx.sideEffects | PropertySignature | bun.d.ts:3568 | boolean &#124; undefined |
| bun.BuildConfig.jsx.development | PropertySignature | bun.d.ts:3569 | boolean &#124; undefined |
| bun.BuildConfig.reactFastRefresh | PropertySignature | bun.d.ts:3580 | boolean &#124; undefined |
| bun.BuildConfig.reactCompiler | PropertySignature | bun.d.ts:3589 | boolean &#124; undefined |
| bun.BuildConfig.reactCompilerOutputMode | PropertySignature | bun.d.ts:3601 | "client" &#124; "ssr" &#124; undefined |
| bun.BuildConfig.files | PropertySignature | bun.d.ts:3660 | Record&lt;string, string &#124; Blob &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;&gt; &#124; undefined |
| bun.BuildConfig.metafile | PropertySignature | bun.d.ts:3692 | boolean &#124; undefined |
| bun.BuildConfig.outdir | PropertySignature | bun.d.ts:3694 | string &#124; undefined |
| bun.BuildConfig.compile | PropertySignature | bun.d.ts:3734 | boolean &#124; CompileBuildOptions &#124; CompileTarget &#124; undefined |
| bun.CompileBuildOptions | InterfaceDeclaration | bun.d.ts:3737 | CompileBuildOptions |
| bun.CompileBuildOptions.target | PropertySignature | bun.d.ts:3738 | CompileTarget &#124; undefined |
| bun.CompileBuildOptions.execArgv | PropertySignature | bun.d.ts:3739 | string[] &#124; undefined |
| bun.CompileBuildOptions.executablePath | PropertySignature | bun.d.ts:3740 | string &#124; undefined |
| bun.CompileBuildOptions.outfile | PropertySignature | bun.d.ts:3741 | string &#124; undefined |
| bun.CompileBuildOptions.assets | PropertySignature | bun.d.ts:3749 | string[] &#124; undefined |
| bun.CompileBuildOptions.autoloadDotenv | PropertySignature | bun.d.ts:3757 | boolean &#124; undefined |
| bun.CompileBuildOptions.autoloadBunfig | PropertySignature | bun.d.ts:3765 | boolean &#124; undefined |
| bun.CompileBuildOptions.autoloadTsconfig | PropertySignature | bun.d.ts:3773 | boolean &#124; undefined |
| bun.CompileBuildOptions.autoloadPackageJson | PropertySignature | bun.d.ts:3781 | boolean &#124; undefined |
| bun.CompileBuildOptions.bytecodeOrder | PropertySignature | bun.d.ts:3797 | string &#124; false &#124; string[] &#124; null &#124; undefined |
| bun.CompileBuildOptions.jitPolicy | PropertySignature | bun.d.ts:3808 | number &#124; undefined |
| bun.CompileBuildOptions.windows | PropertySignature | bun.d.ts:3809 | { hideConsole?: boolean &#124; undefined; icon?: string &#124; undefined; title?: string &#124; undefined; publisher?: string &#124; undefined; version?: string &#124; undefined; description?: string &#124; undefined; copyright?: string &#124; undefined; } &#124; undefined |
| bun.CompileBuildOptions.windows.[TypeLiteral] | TypeLiteral | bun.d.ts:3809 | { hideConsole?: boolean &#124; undefined; icon?: string &#124; undefined; title?: string &#124; undefined; publisher?: string &#124; undefined; version?: string &#124; undefined; description?: string &#124; undefined; copyright?: string &#124; undefined; } |
| bun.CompileBuildOptions.windows.hideConsole | PropertySignature | bun.d.ts:3810 | boolean &#124; undefined |
| bun.CompileBuildOptions.windows.icon | PropertySignature | bun.d.ts:3811 | string &#124; undefined |
| bun.CompileBuildOptions.windows.title | PropertySignature | bun.d.ts:3812 | string &#124; undefined |
| bun.CompileBuildOptions.windows.publisher | PropertySignature | bun.d.ts:3813 | string &#124; undefined |
| bun.CompileBuildOptions.windows.version | PropertySignature | bun.d.ts:3814 | string &#124; undefined |
| bun.CompileBuildOptions.windows.description | PropertySignature | bun.d.ts:3815 | string &#124; undefined |
| bun.CompileBuildOptions.windows.copyright | PropertySignature | bun.d.ts:3816 | string &#124; undefined |
| bun.Password | ModuleDeclaration | bun.d.ts:3829 | any |
| bun.Password.Argon2Algorithm | InterfaceDeclaration | bun.d.ts:3830 | Argon2Algorithm |
| bun.Password.Argon2Algorithm.algorithm | PropertySignature | bun.d.ts:3831 | "argon2d" &#124; "argon2i" &#124; "argon2id" |
| bun.Password.Argon2Algorithm.memoryCost | PropertySignature | bun.d.ts:3836 | number &#124; undefined |
| bun.Password.Argon2Algorithm.timeCost | PropertySignature | bun.d.ts:3841 | number &#124; undefined |
| bun.Password.BCryptAlgorithm | InterfaceDeclaration | bun.d.ts:3844 | BCryptAlgorithm |
| bun.Password.BCryptAlgorithm.algorithm | PropertySignature | bun.d.ts:3845 | "bcrypt" |
| bun.Password.BCryptAlgorithm.cost | PropertySignature | bun.d.ts:3852 | number &#124; undefined |
| bun.Password.AlgorithmLabel | TypeAliasDeclaration | bun.d.ts:3855 | "argon2d" &#124; "argon2i" &#124; "argon2id" &#124; "bcrypt" |
| bun.password | VariableDeclaration | bun.d.ts:3891 | { verify(password: StringOrBuffer, hash: StringOrBuffer, algorithm?: "argon2d" &#124; "argon2i" &#124; "argon2id" &#124; "bcrypt" &#124; undefined): Promise&lt;boolean&gt;; hash(password: StringOrBuffer, algorithm?: "argon2d" &#124; ... 5 more ... &#124; undefined): Promise&lt;...&gt;; verifySync(password: StringOrBuffer, hash: StringOrBuffer, algorithm?: "... |
| bun.[TypeLiteral] | TypeLiteral | bun.d.ts:3891 | { verify(password: StringOrBuffer, hash: StringOrBuffer, algorithm?: "argon2d" &#124; "argon2i" &#124; "argon2id" &#124; "bcrypt" &#124; undefined): Promise&lt;boolean&gt;; hash(password: StringOrBuffer, algorithm?: "argon2d" &#124; ... 5 more ... &#124; undefined): Promise&lt;...&gt;; verifySync(password: StringOrBuffer, hash: StringOrBuffer, algorithm?: "... |
| bun.verify | MethodSignature | bun.d.ts:3908 | (password: StringOrBuffer, hash: StringOrBuffer, algorithm?: "argon2d" &#124; "argon2i" &#124; "argon2id" &#124; "bcrypt" &#124; undefined) =&gt; Promise&lt;boolean&gt; |
| bun.hash | MethodSignature | bun.d.ts:3950 | (password: StringOrBuffer, algorithm?: "argon2d" &#124; "argon2i" &#124; "argon2id" &#124; "bcrypt" &#124; Argon2Algorithm &#124; BCryptAlgorithm &#124; undefined) =&gt; Promise&lt;...&gt; |
| bun.verifySync | MethodSignature | bun.d.ts:3998 | (password: StringOrBuffer, hash: StringOrBuffer, algorithm?: "argon2d" &#124; "argon2i" &#124; "argon2id" &#124; "bcrypt" &#124; undefined) =&gt; boolean |
| bun.hashSync | MethodSignature | bun.d.ts:4043 | (password: StringOrBuffer, algorithm?: "argon2d" &#124; "argon2i" &#124; "argon2id" &#124; "bcrypt" &#124; Argon2Algorithm &#124; BCryptAlgorithm &#124; undefined) =&gt; string |
| bun.secrets | VariableDeclaration | bun.d.ts:4129 | { get(options: { service: string; name: string; }): Promise&lt;string &#124; null&gt;; set(options: { service: string; name: string; value: string; allowUnrestrictedAccess?: boolean &#124; undefined; persist?: "enterprise" &#124; ... 1 more ... &#124; undefined; }): Promise&lt;...&gt;; delete(options: { ...; }): Promise&lt;...&gt;; } |
| bun.[TypeLiteral] | TypeLiteral | bun.d.ts:4129 | { get(options: { service: string; name: string; }): Promise&lt;string &#124; null&gt;; set(options: { service: string; name: string; value: string; allowUnrestrictedAccess?: boolean &#124; undefined; persist?: "enterprise" &#124; ... 1 more ... &#124; undefined; }): Promise&lt;...&gt;; delete(options: { ...; }): Promise&lt;...&gt;; } |
| bun.get | MethodSignature | bun.d.ts:4157 | (options: { service: string; name: string; }) =&gt; Promise&lt;string &#124; null&gt; |
| bun.get.[TypeLiteral] | TypeLiteral | bun.d.ts:4157 | { service: string; name: string; } |
| bun.get.service | PropertySignature | bun.d.ts:4165 | string |
| bun.get.name | PropertySignature | bun.d.ts:4171 | string |
| bun.set | MethodSignature | bun.d.ts:4238 | (options: { service: string; name: string; value: string; allowUnrestrictedAccess?: boolean &#124; undefined; persist?: "enterprise" &#124; "local" &#124; undefined; }) =&gt; Promise&lt;void&gt; |
| bun.set.[TypeLiteral] | TypeLiteral | bun.d.ts:4238 | { service: string; name: string; value: string; allowUnrestrictedAccess?: boolean &#124; undefined; persist?: "enterprise" &#124; "local" &#124; undefined; } |
| bun.set.service | PropertySignature | bun.d.ts:4246 | string |
| bun.set.name | PropertySignature | bun.d.ts:4252 | string |
| bun.set.value | PropertySignature | bun.d.ts:4261 | string |
| bun.set.allowUnrestrictedAccess | PropertySignature | bun.d.ts:4272 | boolean &#124; undefined |
| bun.set.persist | PropertySignature | bun.d.ts:4293 | "enterprise" &#124; "local" &#124; undefined |
| bun.delete | MethodSignature | bun.d.ts:4341 | (options: { service: string; name: string; }) =&gt; Promise&lt;boolean&gt; |
| bun.delete.[TypeLiteral] | TypeLiteral | bun.d.ts:4341 | { service: string; name: string; } |
| bun.delete.service | PropertySignature | bun.d.ts:4349 | string |
| bun.delete.name | PropertySignature | bun.d.ts:4355 | string |
| bun.BuildArtifact | InterfaceDeclaration | bun.d.ts:4366 | BuildArtifact |
| bun.BuildArtifact.path | PropertySignature | bun.d.ts:4367 | string |
| bun.BuildArtifact.loader | PropertySignature | bun.d.ts:4368 | Loader |
| bun.BuildArtifact.hash | PropertySignature | bun.d.ts:4369 | string &#124; null |
| bun.BuildArtifact.kind | PropertySignature | bun.d.ts:4370 | "asset" &#124; "bytecode" &#124; "chunk" &#124; "entry-point" &#124; "sourcemap" |
| bun.BuildArtifact.sourcemap | PropertySignature | bun.d.ts:4371 | BuildArtifact &#124; null |
| bun.BuildOutput | InterfaceDeclaration | bun.d.ts:4379 | BuildOutput |
| bun.BuildOutput.outputs | PropertySignature | bun.d.ts:4380 | BuildArtifact[] |
| bun.BuildOutput.success | PropertySignature | bun.d.ts:4381 | boolean |
| bun.BuildOutput.logs | PropertySignature | bun.d.ts:4382 | (BuildMessage &#124; ResolveMessage)[] |
| bun.BuildOutput.metafile | PropertySignature | bun.d.ts:4421 | BuildMetafile &#124; undefined |
| bun.BuildMetafile | InterfaceDeclaration | bun.d.ts:4432 | BuildMetafile |
| bun.BuildMetafile.inputs | PropertySignature | bun.d.ts:4434 | { [path: string]: { bytes: number; imports: { path: string; kind: ImportKind; original?: string &#124; undefined; entryPoint?: string &#124; undefined; external?: boolean &#124; undefined; with?: Record&lt;...&gt; &#124; undefined; }[]; format?: "cjs" &#124; ... 3 more ... &#124; undefined; }; } |
| bun.BuildMetafile.inputs.[TypeLiteral] | TypeLiteral | bun.d.ts:4434 | { [path: string]: { bytes: number; imports: { path: string; kind: ImportKind; original?: string &#124; undefined; entryPoint?: string &#124; undefined; external?: boolean &#124; undefined; with?: Record&lt;...&gt; &#124; undefined; }[]; format?: "cjs" &#124; ... 3 more ... &#124; undefined; }; } |
| bun.BuildMetafile.inputs.[index] | IndexSignature | bun.d.ts:4435 | any |
| bun.BuildMetafile.inputs.[TypeLiteral] | TypeLiteral | bun.d.ts:4435 | { bytes: number; imports: { path: string; kind: ImportKind; original?: string &#124; undefined; entryPoint?: string &#124; undefined; external?: boolean &#124; undefined; with?: Record&lt;string, string&gt; &#124; undefined; }[]; format?: "cjs" &#124; ... 3 more ... &#124; undefined; } |
| bun.BuildMetafile.inputs.bytes | PropertySignature | bun.d.ts:4437 | number |
| bun.BuildMetafile.inputs.imports | PropertySignature | bun.d.ts:4439 | { path: string; kind: ImportKind; original?: string &#124; undefined; entryPoint?: string &#124; undefined; external?: boolean &#124; undefined; with?: Record&lt;string, string&gt; &#124; undefined; }[] |
| bun.BuildMetafile.inputs.imports.[TypeLiteral] | TypeLiteral | bun.d.ts:4439 | { path: string; kind: ImportKind; original?: string &#124; undefined; entryPoint?: string &#124; undefined; external?: boolean &#124; undefined; with?: Record&lt;string, string&gt; &#124; undefined; } |
| bun.BuildMetafile.inputs.imports.path | PropertySignature | bun.d.ts:4441 | string |
| bun.BuildMetafile.inputs.imports.kind | PropertySignature | bun.d.ts:4443 | ImportKind |
| bun.BuildMetafile.inputs.imports.original | PropertySignature | bun.d.ts:4445 | string &#124; undefined |
| bun.BuildMetafile.inputs.imports.entryPoint | PropertySignature | bun.d.ts:4454 | string &#124; undefined |
| bun.BuildMetafile.inputs.imports.external | PropertySignature | bun.d.ts:4456 | boolean &#124; undefined |
| bun.BuildMetafile.inputs.imports.with | PropertySignature | bun.d.ts:4458 | Record&lt;string, string&gt; &#124; undefined |
| bun.BuildMetafile.inputs.format | PropertySignature | bun.d.ts:4461 | "cjs" &#124; "css" &#124; "esm" &#124; "json" &#124; undefined |
| bun.BuildMetafile.outputs | PropertySignature | bun.d.ts:4465 | { [path: string]: { bytes: number; inputs: { [path: string]: { bytesInOutput: number; }; }; imports: { path: string; kind: ImportKind; }[]; exports: string[]; entryPoint?: string &#124; undefined; cssBundle?: string &#124; undefined; }; } |
| bun.BuildMetafile.outputs.[TypeLiteral] | TypeLiteral | bun.d.ts:4465 | { [path: string]: { bytes: number; inputs: { [path: string]: { bytesInOutput: number; }; }; imports: { path: string; kind: ImportKind; }[]; exports: string[]; entryPoint?: string &#124; undefined; cssBundle?: string &#124; undefined; }; } |
| bun.BuildMetafile.outputs.[index] | IndexSignature | bun.d.ts:4466 | any |
| bun.BuildMetafile.outputs.[TypeLiteral] | TypeLiteral | bun.d.ts:4466 | { bytes: number; inputs: { [path: string]: { bytesInOutput: number; }; }; imports: { path: string; kind: ImportKind; }[]; exports: string[]; entryPoint?: string &#124; undefined; cssBundle?: string &#124; undefined; } |
| bun.BuildMetafile.outputs.bytes | PropertySignature | bun.d.ts:4468 | number |
| bun.BuildMetafile.outputs.inputs | PropertySignature | bun.d.ts:4470 | { [path: string]: { bytesInOutput: number; }; } |
| bun.BuildMetafile.outputs.inputs.[TypeLiteral] | TypeLiteral | bun.d.ts:4470 | { [path: string]: { bytesInOutput: number; }; } |
| bun.BuildMetafile.outputs.inputs.[index] | IndexSignature | bun.d.ts:4471 | any |
| bun.BuildMetafile.outputs.inputs.[TypeLiteral] | TypeLiteral | bun.d.ts:4471 | { bytesInOutput: number; } |
| bun.BuildMetafile.outputs.inputs.bytesInOutput | PropertySignature | bun.d.ts:4473 | number |
| bun.BuildMetafile.outputs.imports | PropertySignature | bun.d.ts:4477 | { path: string; kind: ImportKind; }[] |
| bun.BuildMetafile.outputs.imports.[TypeLiteral] | TypeLiteral | bun.d.ts:4477 | { path: string; kind: ImportKind; } |
| bun.BuildMetafile.outputs.imports.path | PropertySignature | bun.d.ts:4479 | string |
| bun.BuildMetafile.outputs.imports.kind | PropertySignature | bun.d.ts:4481 | ImportKind |
| bun.BuildMetafile.outputs.exports | PropertySignature | bun.d.ts:4484 | string[] |
| bun.BuildMetafile.outputs.entryPoint | PropertySignature | bun.d.ts:4486 | string &#124; undefined |
| bun.BuildMetafile.outputs.cssBundle | PropertySignature | bun.d.ts:4488 | string &#124; undefined |
| bun.build | FunctionDeclaration | bun.d.ts:4739 | (config: BuildConfig) =&gt; Promise&lt;BuildOutput&gt; |
| bun.ErrorLike | InterfaceDeclaration | bun.d.ts:4741 | ErrorLike |
| bun.ErrorLike.code | PropertySignature | bun.d.ts:4742 | string &#124; undefined |
| bun.ErrorLike.errno | PropertySignature | bun.d.ts:4743 | number &#124; undefined |
| bun.ErrorLike.syscall | PropertySignature | bun.d.ts:4744 | string &#124; undefined |
| bun.TLSOptions | InterfaceDeclaration | bun.d.ts:4750 | TLSOptions |
| bun.TLSOptions.passphrase | PropertySignature | bun.d.ts:4754 | string &#124; undefined |
| bun.TLSOptions.dhParamsFile | PropertySignature | bun.d.ts:4759 | string &#124; undefined |
| bun.TLSOptions.serverName | PropertySignature | bun.d.ts:4764 | string &#124; undefined |
| bun.TLSOptions.servername | PropertySignature | bun.d.ts:4769 | string &#124; undefined |
| bun.TLSOptions.lowMemoryMode | PropertySignature | bun.d.ts:4776 | boolean &#124; undefined |
| bun.TLSOptions.rejectUnauthorized | PropertySignature | bun.d.ts:4784 | boolean &#124; undefined |
| bun.TLSOptions.requestCert | PropertySignature | bun.d.ts:4793 | boolean &#124; undefined |
| bun.TLSOptions.ca | PropertySignature | bun.d.ts:4803 | string &#124; (string &#124; BunFile &#124; BufferSource)[] &#124; BunFile &#124; BufferSource &#124; undefined |
| bun.TLSOptions.crl | PropertySignature | bun.d.ts:4809 | string &#124; (string &#124; BunFile &#124; BufferSource)[] &#124; BunFile &#124; BufferSource &#124; undefined |
| bun.TLSOptions.cert | PropertySignature | bun.d.ts:4821 | string &#124; (string &#124; BunFile &#124; BufferSource)[] &#124; BunFile &#124; BufferSource &#124; undefined |
| bun.TLSOptions.key | PropertySignature | bun.d.ts:4832 | string &#124; (string &#124; BunFile &#124; BufferSource)[] &#124; BunFile &#124; BufferSource &#124; undefined |
| bun.TLSOptions.secureOptions | PropertySignature | bun.d.ts:4838 | number &#124; undefined |
| bun.TLSOptions.ALPNProtocols | PropertySignature | bun.d.ts:4840 | string &#124; BufferSource &#124; undefined |
| bun.TLSOptions.ciphers | PropertySignature | bun.d.ts:4842 | string &#124; undefined |
| bun.TLSOptions.clientRenegotiationLimit | PropertySignature | bun.d.ts:4844 | number &#124; undefined |
| bun.TLSOptions.clientRenegotiationWindow | PropertySignature | bun.d.ts:4846 | number &#124; undefined |
| bun.SocketAddress | InterfaceDeclaration | bun.d.ts:4849 | SocketAddress |
| bun.SocketAddress.address | PropertySignature | bun.d.ts:4853 | string |
| bun.SocketAddress.port | PropertySignature | bun.d.ts:4858 | number |
| bun.SocketAddress.family | PropertySignature | bun.d.ts:4863 | "IPv4" &#124; "IPv6" |
| bun.file | FunctionDeclaration | bun.d.ts:4890 | { (path: string &#124; URL, options?: BlobPropertyBag &#124; undefined): BunFile; (path: Uint8Array&lt;ArrayBuffer&gt; &#124; ArrayBufferLike, options?: BlobPropertyBag &#124; undefined): BunFile; (fileDescriptor: number, options?: BlobPropertyBag &#124; undefined): BunFile; } |
| bun.embeddedFiles | VariableDeclaration | bun.d.ts:4897 | readonly Blob[] |
| bun.isStandaloneExecutable | VariableDeclaration | bun.d.ts:4913 | boolean |
| bun.file | FunctionDeclaration | bun.d.ts:4931 | { (path: string &#124; URL, options?: BlobPropertyBag &#124; undefined): BunFile; (path: Uint8Array&lt;ArrayBuffer&gt; &#124; ArrayBufferLike, options?: BlobPropertyBag &#124; undefined): BunFile; (fileDescriptor: number, options?: BlobPropertyBag &#124; undefined): BunFile; } |
| bun.file | FunctionDeclaration | bun.d.ts:4947 | { (path: string &#124; URL, options?: BlobPropertyBag &#124; undefined): BunFile; (path: Uint8Array&lt;ArrayBuffer&gt; &#124; ArrayBufferLike, options?: BlobPropertyBag &#124; undefined): BunFile; (fileDescriptor: number, options?: BlobPropertyBag &#124; undefined): BunFile; } |
| bun.allocUnsafe | FunctionDeclaration | bun.d.ts:4954 | (size: number) =&gt; Uint8Array&lt;ArrayBuffer&gt; |
| bun.BunInspectOptions | InterfaceDeclaration | bun.d.ts:4959 | BunInspectOptions |
| bun.BunInspectOptions.colors | PropertySignature | bun.d.ts:4963 | boolean &#124; undefined |
| bun.BunInspectOptions.depth | PropertySignature | bun.d.ts:4967 | number &#124; undefined |
| bun.BunInspectOptions.sorted | PropertySignature | bun.d.ts:4971 | boolean &#124; undefined |
| bun.BunInspectOptions.compact | PropertySignature | bun.d.ts:4975 | boolean &#124; undefined |
| bun.WebSocketOptionsProtocolsOrProtocol | TypeAliasDeclaration | bun.d.ts:4978 | WebSocketOptionsProtocolsOrProtocol |
| bun.WebSocketOptionsProtocolsOrProtocol.[TypeLiteral] | TypeLiteral | bun.d.ts:4979 | { protocols?: string &#124; string[] &#124; undefined; } |
| bun.WebSocketOptionsProtocolsOrProtocol.protocols | PropertySignature | bun.d.ts:4983 | string &#124; string[] &#124; undefined |
| bun.WebSocketOptionsProtocolsOrProtocol.[TypeLiteral] | TypeLiteral | bun.d.ts:4985 | { protocol?: string &#124; undefined; } |
| bun.WebSocketOptionsProtocolsOrProtocol.protocol | PropertySignature | bun.d.ts:4989 | string &#124; undefined |
| bun.WebSocketOptionsTLS | TypeAliasDeclaration | bun.d.ts:4992 | WebSocketOptionsTLS |
| bun.WebSocketOptionsTLS.[TypeLiteral] | TypeLiteral | bun.d.ts:4992 | WebSocketOptionsTLS |
| bun.WebSocketOptionsTLS.tls | PropertySignature | bun.d.ts:5016 | (TLSOptions &amp; { servername?: string &#124; undefined; checkServerIdentity?: ((hostname: string, cert: PeerCertificate) =&gt; Error &#124; undefined) &#124; undefined; }) &#124; undefined |
| bun.WebSocketOptionsTLS.tls.[TypeLiteral] | TypeLiteral | bun.d.ts:5016 | { servername?: string &#124; undefined; checkServerIdentity?: ((hostname: string, cert: PeerCertificate) =&gt; Error &#124; undefined) &#124; undefined; } |
| bun.WebSocketOptionsTLS.tls.servername | PropertySignature | bun.d.ts:5020 | string &#124; undefined |
| bun.WebSocketOptionsTLS.tls.checkServerIdentity | PropertySignature | bun.d.ts:5033 | ((hostname: string, cert: PeerCertificate) =&gt; Error &#124; undefined) &#124; undefined |
| bun.WebSocketOptionsHeaders | TypeAliasDeclaration | bun.d.ts:5037 | WebSocketOptionsHeaders |
| bun.WebSocketOptionsHeaders.[TypeLiteral] | TypeLiteral | bun.d.ts:5037 | WebSocketOptionsHeaders |
| bun.WebSocketOptionsHeaders.headers | PropertySignature | bun.d.ts:5041 | [string, string][] &#124; Headers &#124; OutgoingHttpHeaders &#124; undefined |
| bun.WebSocketOptionsProxy | TypeAliasDeclaration | bun.d.ts:5044 | WebSocketOptionsProxy |
| bun.WebSocketOptionsProxy.[TypeLiteral] | TypeLiteral | bun.d.ts:5044 | WebSocketOptionsProxy |
| bun.WebSocketOptionsProxy.proxy | PropertySignature | bun.d.ts:5074 | string &#124; URL &#124; { url: string &#124; URL; headers?: Headers &#124; OutgoingHttpHeaders &#124; undefined; tls?: boolean &#124; (TLSOptions &amp; { ...; }) &#124; undefined; } &#124; undefined |
| bun.WebSocketOptionsProxy.proxy.[TypeLiteral] | TypeLiteral | bun.d.ts:5077 | { url: string &#124; URL; headers?: Headers &#124; OutgoingHttpHeaders &#124; undefined; tls?: boolean &#124; (TLSOptions &amp; { servername?: string &#124; undefined; checkServerIdentity?: ((hostname: string, cert: PeerCertificate) =&gt; Error &#124; undefined) &#124; undefined; }) &#124; undefined; } |
| bun.WebSocketOptionsProxy.proxy.url | PropertySignature | bun.d.ts:5081 | string &#124; URL |
| bun.WebSocketOptionsProxy.proxy.headers | PropertySignature | bun.d.ts:5086 | Headers &#124; OutgoingHttpHeaders &#124; undefined |
| bun.WebSocketOptionsProxy.proxy.tls | PropertySignature | bun.d.ts:5109 | boolean &#124; (TLSOptions &amp; { servername?: string &#124; undefined; checkServerIdentity?: ((hostname: string, cert: PeerCertificate) =&gt; Error &#124; undefined) &#124; undefined; }) &#124; undefined |
| bun.WebSocketOptionsCompression | TypeAliasDeclaration | bun.d.ts:5113 | WebSocketOptionsCompression |
| bun.WebSocketOptionsCompression.[TypeLiteral] | TypeLiteral | bun.d.ts:5113 | WebSocketOptionsCompression |
| bun.WebSocketOptionsCompression.perMessageDeflate | PropertySignature | bun.d.ts:5126 | boolean &#124; undefined |
| bun.WebSocketOptions | TypeAliasDeclaration | bun.d.ts:5132 | WebSocketOptions |
| bun.WebSocketEventMap | InterfaceDeclaration | bun.d.ts:5138 | WebSocketEventMap |
| bun.WebSocketEventMap.close | PropertySignature | bun.d.ts:5139 | CloseEvent |
| bun.WebSocketEventMap.error | PropertySignature | bun.d.ts:5140 | ErrorEvent |
| bun.WebSocketEventMap.message | PropertySignature | bun.d.ts:5141 | MessageEvent&lt;any&gt; |
| bun.WebSocketEventMap.open | PropertySignature | bun.d.ts:5142 | Event |
| bun.WebSocketEventMap.ping | PropertySignature | bun.d.ts:5147 | MessageEvent&lt;any&gt; |
| bun.WebSocketEventMap.pong | PropertySignature | bun.d.ts:5152 | MessageEvent&lt;any&gt; |
| bun.WebSocket | InterfaceDeclaration | bun.d.ts:5178 | WebSocket |
| bun.WebSocket.url | PropertySignature | bun.d.ts:5182 | string |
| bun.WebSocket.URL | PropertySignature | bun.d.ts:5188 | string |
| bun.WebSocket.readyState | PropertySignature | bun.d.ts:5193 | 0 &#124; 1 &#124; 2 &#124; 3 |
| bun.WebSocket.bufferedAmount | PropertySignature | bun.d.ts:5199 | number |
| bun.WebSocket.protocol | PropertySignature | bun.d.ts:5204 | string |
| bun.WebSocket.extensions | PropertySignature | bun.d.ts:5209 | string |
| bun.WebSocket.binaryType | PropertySignature | bun.d.ts:5215 | "arraybuffer" &#124; "blob" &#124; "nodebuffer" |
| bun.WebSocket.onopen | PropertySignature | bun.d.ts:5220 | ((this: WebSocket, ev: Event) =&gt; any) &#124; null |
| bun.WebSocket.onopen.[FunctionType] | FunctionType | bun.d.ts:5220 | (this: WebSocket, ev: Event) =&gt; any |
| bun.WebSocket.onmessage | PropertySignature | bun.d.ts:5225 | ((this: WebSocket, ev: MessageEvent&lt;any&gt;) =&gt; any) &#124; null |
| bun.WebSocket.onmessage.[FunctionType] | FunctionType | bun.d.ts:5225 | (this: WebSocket, ev: MessageEvent&lt;any&gt;) =&gt; any |
| bun.WebSocket.onerror | PropertySignature | bun.d.ts:5233 | ((this: WebSocket, ev: ErrorEvent) =&gt; any) &#124; null |
| bun.WebSocket.onerror.[FunctionType] | FunctionType | bun.d.ts:5233 | (this: WebSocket, ev: ErrorEvent) =&gt; any |
| bun.WebSocket.onclose | PropertySignature | bun.d.ts:5240 | ((this: WebSocket, ev: CloseEvent) =&gt; any) &#124; null |
| bun.WebSocket.onclose.[FunctionType] | FunctionType | bun.d.ts:5240 | (this: WebSocket, ev: CloseEvent) =&gt; any |
| bun.WebSocket.send | MethodSignature | bun.d.ts:5246 | (data: string &#124; Blob &#124; ArrayBufferLike &#124; ArrayBufferView&lt;ArrayBufferLike&gt;) =&gt; void |
| bun.WebSocket.close | MethodSignature | bun.d.ts:5258 | (code?: number &#124; undefined, reason?: string &#124; undefined) =&gt; void |
| bun.WebSocket.ping | MethodSignature | bun.d.ts:5264 | (data?: string &#124; Blob &#124; ArrayBufferLike &#124; ArrayBufferView&lt;ArrayBufferLike&gt; &#124; undefined) =&gt; void |
| bun.WebSocket.pong | MethodSignature | bun.d.ts:5270 | (data?: string &#124; Blob &#124; ArrayBufferLike &#124; ArrayBufferView&lt;ArrayBufferLike&gt; &#124; undefined) =&gt; void |
| bun.WebSocket.terminate | MethodSignature | bun.d.ts:5275 | () =&gt; void |
| bun.WebSocket.pause | MethodSignature | bun.d.ts:5284 | () =&gt; boolean |
| bun.WebSocket.resume | MethodSignature | bun.d.ts:5290 | () =&gt; boolean |
| bun.WebSocket.isPaused | PropertySignature | bun.d.ts:5295 | boolean |
| bun.WebSocket.addEventListener | MethodSignature | bun.d.ts:5303 | { &lt;K extends keyof WebSocketEventMap&gt;(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) =&gt; any, options?: boolean &#124; AddEventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.WebSocket.addEventListener.K | TypeParameter | bun.d.ts:5303 | K |
| bun.WebSocket.addEventListener.[FunctionType] | FunctionType | bun.d.ts:5305 | (this: WebSocket, ev: WebSocketEventMap[K]) =&gt; any |
| bun.WebSocket.addEventListener | MethodSignature | bun.d.ts:5308 | { &lt;K extends keyof WebSocketEventMap&gt;(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) =&gt; any, options?: boolean &#124; AddEventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.WebSocket.removeEventListener | MethodSignature | bun.d.ts:5320 | { &lt;K extends keyof WebSocketEventMap&gt;(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) =&gt; any, options?: boolean &#124; EventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.WebSocket.removeEventListener.K | TypeParameter | bun.d.ts:5320 | K |
| bun.WebSocket.removeEventListener.[FunctionType] | FunctionType | bun.d.ts:5322 | (this: WebSocket, ev: WebSocketEventMap[K]) =&gt; any |
| bun.WebSocket.removeEventListener | MethodSignature | bun.d.ts:5325 | { &lt;K extends keyof WebSocketEventMap&gt;(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) =&gt; any, options?: boolean &#124; EventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; } |
| bun.WebSocket.CONNECTING | PropertySignature | bun.d.ts:5332 | 0 |
| bun.WebSocket.OPEN | PropertySignature | bun.d.ts:5334 | 1 |
| bun.WebSocket.CLOSING | PropertySignature | bun.d.ts:5336 | 2 |
| bun.WebSocket.CLOSED | PropertySignature | bun.d.ts:5338 | 3 |
| bun.inspect | FunctionDeclaration | bun.d.ts:5349 | typeof inspect |
| bun.inspect | ModuleDeclaration | bun.d.ts:5350 | typeof inspect |
| bun.inspect.custom | VariableDeclaration | bun.d.ts:5354 | unique symbol |
| bun.inspect.table | FunctionDeclaration | bun.d.ts:5361 | { (tabularData: object &#124; unknown[], properties?: string[] &#124; undefined, options?: { colors?: boolean &#124; undefined; } &#124; undefined): string; (tabularData: object &#124; unknown[], options?: { colors?: boolean &#124; undefined; } &#124; undefined): string; } |
| bun.inspect.table.[TypeLiteral] | TypeLiteral | bun.d.ts:5361 | { colors?: boolean &#124; undefined; } |
| bun.inspect.table.colors | PropertySignature | bun.d.ts:5361 | boolean &#124; undefined |
| bun.inspect.table | FunctionDeclaration | bun.d.ts:5362 | { (tabularData: object &#124; unknown[], properties?: string[] &#124; undefined, options?: { colors?: boolean &#124; undefined; } &#124; undefined): string; (tabularData: object &#124; unknown[], options?: { colors?: boolean &#124; undefined; } &#124; undefined): string; } |
| bun.inspect.table.[TypeLiteral] | TypeLiteral | bun.d.ts:5362 | { colors?: boolean &#124; undefined; } |
| bun.inspect.table.colors | PropertySignature | bun.d.ts:5362 | boolean &#124; undefined |
| bun.MMapOptions | InterfaceDeclaration | bun.d.ts:5365 | MMapOptions |
| bun.MMapOptions.sync | PropertySignature | bun.d.ts:5369 | boolean &#124; undefined |
| bun.MMapOptions.shared | PropertySignature | bun.d.ts:5375 | boolean &#124; undefined |
| bun.MMapOptions.offset | PropertySignature | bun.d.ts:5380 | number &#124; bigint &#124; undefined |
| bun.MMapOptions.size | PropertySignature | bun.d.ts:5385 | number &#124; bigint &#124; undefined |
| bun.mmap | FunctionDeclaration | bun.d.ts:5405 | (path: string, opts?: MMapOptions &#124; undefined) =&gt; Uint8Array&lt;ArrayBuffer&gt; |
| bun.stdout | VariableDeclaration | bun.d.ts:5410 | BunFile |
| bun.stderr | VariableDeclaration | bun.d.ts:5415 | BunFile |
| bun.stdin | VariableDeclaration | bun.d.ts:5422 | BunFile |
| bun.StringLike | TypeAliasDeclaration | bun.d.ts:5424 | StringLike |
| bun.StringLike.[TypeLiteral] | TypeLiteral | bun.d.ts:5424 | { toString(): string; } |
| bun.StringLike.toString | MethodSignature | bun.d.ts:5424 | () =&gt; string |
| bun.ColorInput | TypeAliasDeclaration | bun.d.ts:5431 | ColorInput |
| bun.ColorInput.[TypeLiteral] | TypeLiteral | bun.d.ts:5432 | { r: number; g: number; b: number; a?: number &#124; undefined; } |
| bun.ColorInput.r | PropertySignature | bun.d.ts:5432 | number |
| bun.ColorInput.g | PropertySignature | bun.d.ts:5432 | number |
| bun.ColorInput.b | PropertySignature | bun.d.ts:5432 | number |
| bun.ColorInput.a | PropertySignature | bun.d.ts:5432 | number &#124; undefined |
| bun.ColorInput.[TypeLiteral] | TypeLiteral | bun.d.ts:5441 | { toString(): string; } |
| bun.ColorInput.toString | MethodSignature | bun.d.ts:5441 | () =&gt; string |
| bun.color | FunctionDeclaration | bun.d.ts:5451 | { (input: ColorInput, outputFormat?: "HEX" &#124; "ansi" &#124; "ansi-16" &#124; "ansi-16m" &#124; "ansi-256" &#124; "css" &#124; "hex" &#124; "hsl" &#124; "lab" &#124; "number" &#124; "rgb" &#124; "rgba" &#124; undefined): string &#124; null; (input: ColorInput, outputFormat: "[rgb]"): [...] &#124; null; (input: ColorInput, outputFormat: "[rgba]"): [...] &#124; null; (input: ColorInput, o... |
| bun.color | FunctionDeclaration | bun.d.ts:5510 | { (input: ColorInput, outputFormat?: "HEX" &#124; "ansi" &#124; "ansi-16" &#124; "ansi-16m" &#124; "ansi-256" &#124; "css" &#124; "hex" &#124; "hsl" &#124; "lab" &#124; "number" &#124; "rgb" &#124; "rgba" &#124; undefined): string &#124; null; (input: ColorInput, outputFormat: "[rgb]"): [...] &#124; null; (input: ColorInput, outputFormat: "[rgba]"): [...] &#124; null; (input: ColorInput, o... |
| bun.color | FunctionDeclaration | bun.d.ts:5516 | { (input: ColorInput, outputFormat?: "HEX" &#124; "ansi" &#124; "ansi-16" &#124; "ansi-16m" &#124; "ansi-256" &#124; "css" &#124; "hex" &#124; "hsl" &#124; "lab" &#124; "number" &#124; "rgb" &#124; "rgba" &#124; undefined): string &#124; null; (input: ColorInput, outputFormat: "[rgb]"): [...] &#124; null; (input: ColorInput, outputFormat: "[rgba]"): [...] &#124; null; (input: ColorInput, o... |
| bun.color | FunctionDeclaration | bun.d.ts:5522 | { (input: ColorInput, outputFormat?: "HEX" &#124; "ansi" &#124; "ansi-16" &#124; "ansi-16m" &#124; "ansi-256" &#124; "css" &#124; "hex" &#124; "hsl" &#124; "lab" &#124; "number" &#124; "rgb" &#124; "rgba" &#124; undefined): string &#124; null; (input: ColorInput, outputFormat: "[rgb]"): [...] &#124; null; (input: ColorInput, outputFormat: "[rgba]"): [...] &#124; null; (input: ColorInput, o... |
| bun.color.[TypeLiteral] | TypeLiteral | bun.d.ts:5522 | { r: number; g: number; b: number; } |
| bun.color.r | PropertySignature | bun.d.ts:5522 | number |
| bun.color.g | PropertySignature | bun.d.ts:5522 | number |
| bun.color.b | PropertySignature | bun.d.ts:5522 | number |
| bun.color | FunctionDeclaration | bun.d.ts:5528 | { (input: ColorInput, outputFormat?: "HEX" &#124; "ansi" &#124; "ansi-16" &#124; "ansi-16m" &#124; "ansi-256" &#124; "css" &#124; "hex" &#124; "hsl" &#124; "lab" &#124; "number" &#124; "rgb" &#124; "rgba" &#124; undefined): string &#124; null; (input: ColorInput, outputFormat: "[rgb]"): [...] &#124; null; (input: ColorInput, outputFormat: "[rgba]"): [...] &#124; null; (input: ColorInput, o... |
| bun.color.[TypeLiteral] | TypeLiteral | bun.d.ts:5528 | { r: number; g: number; b: number; a: number; } |
| bun.color.r | PropertySignature | bun.d.ts:5528 | number |
| bun.color.g | PropertySignature | bun.d.ts:5528 | number |
| bun.color.b | PropertySignature | bun.d.ts:5528 | number |
| bun.color.a | PropertySignature | bun.d.ts:5528 | number |
| bun.color | FunctionDeclaration | bun.d.ts:5534 | { (input: ColorInput, outputFormat?: "HEX" &#124; "ansi" &#124; "ansi-16" &#124; "ansi-16m" &#124; "ansi-256" &#124; "css" &#124; "hex" &#124; "hsl" &#124; "lab" &#124; "number" &#124; "rgb" &#124; "rgba" &#124; undefined): string &#124; null; (input: ColorInput, outputFormat: "[rgb]"): [...] &#124; null; (input: ColorInput, outputFormat: "[rgba]"): [...] &#124; null; (input: ColorInput, o... |
| bun.ModuleGraphOptions | InterfaceDeclaration | bun.d.ts:5536 | ModuleGraphOptions |
| bun.ModuleGraphOptions.globals | PropertySignature | bun.d.ts:5543 | Record&lt;string, unknown&gt; &#124; undefined |
| bun.ModuleGraphOptions.onError | PropertySignature | bun.d.ts:5565 | ((error: unknown, kind: "uncaughtException" &#124; "unhandledRejection") =&gt; void) &#124; undefined |
| bun.ModuleGraphOptions.onError.[FunctionType] | FunctionType | bun.d.ts:5565 | (error: unknown, kind: "uncaughtException" &#124; "unhandledRejection") =&gt; void |
| bun.ModuleGraph | ClassDeclaration | bun.d.ts:5606 | ModuleGraph |
| bun.ModuleGraph.constructor | Constructor | bun.d.ts:5607 | any |
| bun.ModuleGraph.current | PropertyDeclaration | bun.d.ts:5614 | ModuleGraph &#124; undefined |
| bun.ModuleGraph.import | MethodDeclaration | bun.d.ts:5626 | &lt;T = any&gt;(specifier: string) =&gt; Promise&lt;T&gt; |
| bun.ModuleGraph.import.T | TypeParameter | bun.d.ts:5626 | T |
| bun.ModuleGraph.run | MethodDeclaration | bun.d.ts:5635 | &lt;A extends unknown[], R&gt;(fn: (...args: A) =&gt; R, ...args: A) =&gt; R |
| bun.ModuleGraph.run.A | TypeParameter | bun.d.ts:5635 | A |
| bun.ModuleGraph.run.R | TypeParameter | bun.d.ts:5635 | R |
| bun.ModuleGraph.run.[FunctionType] | FunctionType | bun.d.ts:5635 | (...args: A) =&gt; R |
| bun.ModuleGraph.dispose | MethodDeclaration | bun.d.ts:5654 | () =&gt; void |
| bun.ModuleGraph.[Symbol.dispose] | MethodDeclaration | bun.d.ts:5655 | () =&gt; void |
| bun.semver | ModuleDeclaration | bun.d.ts:5661 | typeof semver |
| bun.semver.satisfies | FunctionDeclaration | bun.d.ts:5665 | (version: StringLike, range: StringLike) =&gt; boolean |
| bun.semver.order | FunctionDeclaration | bun.d.ts:5671 | (v1: StringLike, v2: StringLike) =&gt; -1 &#124; 0 &#124; 1 |
| bun.unsafe | ModuleDeclaration | bun.d.ts:5674 | typeof unsafe |
| bun.unsafe.arrayBufferToString | FunctionDeclaration | bun.d.ts:5682 | { (buffer: Uint8Array&lt;ArrayBuffer&gt; &#124; ArrayBufferLike): string; (buffer: Uint16Array&lt;ArrayBufferLike&gt;): string; } |
| bun.unsafe.arrayBufferToString | FunctionDeclaration | bun.d.ts:5692 | { (buffer: Uint8Array&lt;ArrayBuffer&gt; &#124; ArrayBufferLike): string; (buffer: Uint16Array&lt;ArrayBufferLike&gt;): string; } |
| bun.unsafe.gcAggressionLevel | FunctionDeclaration | bun.d.ts:5709 | (level?: 0 &#124; 1 &#124; 2 &#124; undefined) =&gt; 0 &#124; 1 &#124; 2 |
| bun.unsafe.mimallocDump | FunctionDeclaration | bun.d.ts:5714 | () =&gt; void |
| bun.unsafe.setJITPolicy | FunctionDeclaration | bun.d.ts:5729 | (scale: number) =&gt; void |
| bun.unsafe.memoryFootprint | FunctionDeclaration | bun.d.ts:5742 | () =&gt; number &#124; undefined |
| bun.DigestEncoding | TypeAliasDeclaration | bun.d.ts:5745 | DigestEncoding |
| bun.enableANSIColors | VariableDeclaration | bun.d.ts:5752 | boolean |
| bun.main | VariableDeclaration | bun.d.ts:5759 | string |
| bun.gc | FunctionDeclaration | bun.d.ts:5770 | (force?: boolean &#124; undefined) =&gt; void |
| bun.HeapSnapshot | InterfaceDeclaration | bun.d.ts:5777 | HeapSnapshot |
| bun.HeapSnapshot.version | PropertySignature | bun.d.ts:5779 | number |
| bun.HeapSnapshot.type | PropertySignature | bun.d.ts:5782 | string |
| bun.HeapSnapshot.nodes | PropertySignature | bun.d.ts:5784 | number[] |
| bun.HeapSnapshot.nodeClassNames | PropertySignature | bun.d.ts:5786 | string[] |
| bun.HeapSnapshot.edges | PropertySignature | bun.d.ts:5787 | number[] |
| bun.HeapSnapshot.edgeTypes | PropertySignature | bun.d.ts:5788 | string[] |
| bun.HeapSnapshot.edgeNames | PropertySignature | bun.d.ts:5789 | string[] |
| bun.nanoseconds | FunctionDeclaration | bun.d.ts:5802 | () =&gt; number |
| bun.generateHeapSnapshot | FunctionDeclaration | bun.d.ts:5808 | { (format?: "jsc" &#124; undefined): HeapSnapshot; (format: "v8"): string; (format: "v8", encoding: "arraybuffer"): ArrayBuffer; } |
| bun.generateHeapSnapshot | FunctionDeclaration | bun.d.ts:5821 | { (format?: "jsc" &#124; undefined): HeapSnapshot; (format: "v8"): string; (format: "v8", encoding: "arraybuffer"): ArrayBuffer; } |
| bun.generateHeapSnapshot | FunctionDeclaration | bun.d.ts:5834 | { (format?: "jsc" &#124; undefined): HeapSnapshot; (format: "v8"): string; (format: "v8", encoding: "arraybuffer"): ArrayBuffer; } |
| bun.shrink | FunctionDeclaration | bun.d.ts:5841 | () =&gt; void |
| bun.openInEditor | FunctionDeclaration | bun.d.ts:5849 | (path: string, options?: EditorOptions &#124; undefined) =&gt; void |
| bun.fetch | VariableDeclaration | bun.d.ts:5851 | typeof fetch |
| bun.EditorOptions | InterfaceDeclaration | bun.d.ts:5853 | EditorOptions |
| bun.EditorOptions.editor | PropertySignature | bun.d.ts:5854 | "subl" &#124; "vscode" &#124; undefined |
| bun.EditorOptions.line | PropertySignature | bun.d.ts:5855 | number &#124; undefined |
| bun.EditorOptions.column | PropertySignature | bun.d.ts:5856 | number &#124; undefined |
| bun.CryptoHashInterface | ClassDeclaration | bun.d.ts:5862 | CryptoHashInterface&lt;T&gt; |
| bun.CryptoHashInterface.T | TypeParameter | bun.d.ts:5862 | T |
| bun.CryptoHashInterface.byteLength | PropertyDeclaration | bun.d.ts:5866 | number |
| bun.CryptoHashInterface.update | MethodDeclaration | bun.d.ts:5873 | (data: BlobOrStringOrBuffer) =&gt; T |
| bun.CryptoHashInterface.digest | MethodDeclaration | bun.d.ts:5880 | { (encoding: DigestEncoding): string; (hashInto?: TypedArray&lt;ArrayBufferLike&gt; &#124; undefined): TypedArray&lt;ArrayBufferLike&gt;; } |
| bun.CryptoHashInterface.digest | MethodDeclaration | bun.d.ts:5887 | { (encoding: DigestEncoding): string; (hashInto?: TypedArray&lt;ArrayBufferLike&gt; &#124; undefined): TypedArray&lt;ArrayBufferLike&gt;; } |
| bun.CryptoHashInterface.hash | MethodDeclaration | bun.d.ts:5896 | { (input: BlobOrStringOrBuffer, hashInto?: TypedArray&lt;ArrayBufferLike&gt; &#124; undefined): TypedArray&lt;ArrayBufferLike&gt;; (input: BlobOrStringOrBuffer, encoding: DigestEncoding): string; } |
| bun.CryptoHashInterface.hash | MethodDeclaration | bun.d.ts:5905 | { (input: BlobOrStringOrBuffer, hashInto?: TypedArray&lt;ArrayBufferLike&gt; &#124; undefined): TypedArray&lt;ArrayBufferLike&gt;; (input: BlobOrStringOrBuffer, encoding: DigestEncoding): string; } |
| bun.SupportedCryptoAlgorithms | TypeAliasDeclaration | bun.d.ts:5908 | SupportedCryptoAlgorithms |
| bun.CryptoHasher | ClassDeclaration | bun.d.ts:5934 | CryptoHasher |
| bun.CryptoHasher.algorithm | PropertyDeclaration | bun.d.ts:5938 | SupportedCryptoAlgorithms |
| bun.CryptoHasher.byteLength | PropertyDeclaration | bun.d.ts:5943 | number |
| bun.CryptoHasher.constructor | Constructor | bun.d.ts:5951 | any |
| bun.CryptoHasher.update | MethodDeclaration | bun.d.ts:5958 | (input: BlobOrStringOrBuffer, inputEncoding?: BufferEncoding &#124; undefined) =&gt; CryptoHasher |
| bun.CryptoHasher.copy | MethodDeclaration | bun.d.ts:5963 | () =&gt; CryptoHasher |
| bun.CryptoHasher.digest | MethodDeclaration | bun.d.ts:5970 | { (encoding: DigestEncoding): string; (): Buffer&lt;ArrayBufferLike&gt;; (hashInto: TypedArray&lt;ArrayBufferLike&gt;): TypedArray&lt;...&gt;; } |
| bun.CryptoHasher.digest | MethodDeclaration | bun.d.ts:5975 | { (encoding: DigestEncoding): string; (): Buffer&lt;ArrayBufferLike&gt;; (hashInto: TypedArray&lt;ArrayBufferLike&gt;): TypedArray&lt;...&gt;; } |
| bun.CryptoHasher.digest | MethodDeclaration | bun.d.ts:5982 | { (encoding: DigestEncoding): string; (): Buffer&lt;ArrayBufferLike&gt;; (hashInto: TypedArray&lt;ArrayBufferLike&gt;): TypedArray&lt;...&gt;; } |
| bun.CryptoHasher.hash | MethodDeclaration | bun.d.ts:5989 | { (algorithm: SupportedCryptoAlgorithms, input: BlobOrStringOrBuffer): Buffer&lt;ArrayBufferLike&gt;; (algorithm: SupportedCryptoAlgorithms, input: BlobOrStringOrBuffer, hashInto: TypedArray&lt;...&gt;): TypedArray&lt;...&gt;; (algorithm: SupportedCryptoAlgorithms, input: BlobOrStringOrBuffer, encoding: DigestEncoding): string; } |
| bun.CryptoHasher.hash | MethodDeclaration | bun.d.ts:5998 | { (algorithm: SupportedCryptoAlgorithms, input: BlobOrStringOrBuffer): Buffer&lt;ArrayBufferLike&gt;; (algorithm: SupportedCryptoAlgorithms, input: BlobOrStringOrBuffer, hashInto: TypedArray&lt;...&gt;): TypedArray&lt;...&gt;; (algorithm: SupportedCryptoAlgorithms, input: BlobOrStringOrBuffer, encoding: DigestEncoding): string; } |
| bun.CryptoHasher.hash | MethodDeclaration | bun.d.ts:6011 | { (algorithm: SupportedCryptoAlgorithms, input: BlobOrStringOrBuffer): Buffer&lt;ArrayBufferLike&gt;; (algorithm: SupportedCryptoAlgorithms, input: BlobOrStringOrBuffer, hashInto: TypedArray&lt;...&gt;): TypedArray&lt;...&gt;; (algorithm: SupportedCryptoAlgorithms, input: BlobOrStringOrBuffer, encoding: DigestEncoding): string; } |
| bun.CryptoHasher.algorithms | PropertyDeclaration | bun.d.ts:6022 | SupportedCryptoAlgorithms[] |
| bun.sleep | FunctionDeclaration | bun.d.ts:6060 | (ms: number &#124; Date) =&gt; Promise&lt;void&gt; |
| bun.sleepSync | FunctionDeclaration | bun.d.ts:6067 | (ms: number) =&gt; void |
| bun.sha | FunctionDeclaration | bun.d.ts:6088 | { (input: StringOrBuffer, hashInto?: TypedArray&lt;ArrayBufferLike&gt; &#124; undefined): TypedArray&lt;ArrayBufferLike&gt;; (input: StringOrBuffer, encoding: DigestEncoding): string; } |
| bun.sha | FunctionDeclaration | bun.d.ts:6109 | { (input: StringOrBuffer, hashInto?: TypedArray&lt;ArrayBufferLike&gt; &#124; undefined): TypedArray&lt;ArrayBufferLike&gt;; (input: StringOrBuffer, encoding: DigestEncoding): string; } |
| bun.SHA1 | ClassDeclaration | bun.d.ts:6116 | SHA1 |
| bun.SHA1.constructor | Constructor | bun.d.ts:6117 | any |
| bun.SHA1.byteLength | PropertyDeclaration | bun.d.ts:6122 | 20 |
| bun.MD5 | ClassDeclaration | bun.d.ts:6124 | MD5 |
| bun.MD5.constructor | Constructor | bun.d.ts:6125 | any |
| bun.MD5.byteLength | PropertyDeclaration | bun.d.ts:6130 | 16 |
| bun.MD4 | ClassDeclaration | bun.d.ts:6132 | MD4 |
| bun.MD4.constructor | Constructor | bun.d.ts:6133 | any |
| bun.MD4.byteLength | PropertyDeclaration | bun.d.ts:6138 | 16 |
| bun.SHA224 | ClassDeclaration | bun.d.ts:6140 | SHA224 |
| bun.SHA224.constructor | Constructor | bun.d.ts:6141 | any |
| bun.SHA224.byteLength | PropertyDeclaration | bun.d.ts:6146 | 28 |
| bun.SHA512 | ClassDeclaration | bun.d.ts:6148 | SHA512 |
| bun.SHA512.constructor | Constructor | bun.d.ts:6149 | any |
| bun.SHA512.byteLength | PropertyDeclaration | bun.d.ts:6154 | 64 |
| bun.SHA384 | ClassDeclaration | bun.d.ts:6156 | SHA384 |
| bun.SHA384.constructor | Constructor | bun.d.ts:6157 | any |
| bun.SHA384.byteLength | PropertyDeclaration | bun.d.ts:6162 | 48 |
| bun.SHA256 | ClassDeclaration | bun.d.ts:6164 | SHA256 |
| bun.SHA256.constructor | Constructor | bun.d.ts:6165 | any |
| bun.SHA256.byteLength | PropertyDeclaration | bun.d.ts:6170 | 32 |
| bun.SHA512_256 | ClassDeclaration | bun.d.ts:6175 | SHA512_256 |
| bun.SHA512_256.constructor | Constructor | bun.d.ts:6176 | any |
| bun.SHA512_256.byteLength | PropertyDeclaration | bun.d.ts:6181 | 32 |
| bun.CompressionFormat | TypeAliasDeclaration | bun.d.ts:6185 | CompressionFormat |
| bun.ZlibCompressionOptions | InterfaceDeclaration | bun.d.ts:6188 | ZlibCompressionOptions |
| bun.ZlibCompressionOptions.level | PropertySignature | bun.d.ts:6196 | -1 &#124; 0 &#124; 1 &#124; 2 &#124; 3 &#124; 4 &#124; 5 &#124; 6 &#124; 7 &#124; 8 &#124; 9 &#124; undefined |
| bun.ZlibCompressionOptions.memLevel | PropertySignature | bun.d.ts:6204 | 1 &#124; 2 &#124; 3 &#124; 4 &#124; 5 &#124; 6 &#124; 7 &#124; 8 &#124; 9 &#124; undefined |
| bun.ZlibCompressionOptions.windowBits | PropertySignature | bun.d.ts:6217 | -15 &#124; -14 &#124; -13 &#124; -12 &#124; -11 &#124; -10 &#124; -9 &#124; 9 &#124; 10 &#124; 11 &#124; 12 &#124; 13 &#124; 14 &#124; 15 &#124; 25 &#124; 26 &#124; 27 &#124; 28 &#124; 29 &#124; 30 &#124; 31 &#124; undefined |
| bun.ZlibCompressionOptions.strategy | PropertySignature | bun.d.ts:6234 | number &#124; undefined |
| bun.ZlibCompressionOptions.library | PropertySignature | bun.d.ts:6236 | "zlib" &#124; undefined |
| bun.LibdeflateCompressionOptions | InterfaceDeclaration | bun.d.ts:6239 | LibdeflateCompressionOptions |
| bun.LibdeflateCompressionOptions.level | PropertySignature | bun.d.ts:6240 | 0 &#124; 1 &#124; 2 &#124; 3 &#124; 4 &#124; 5 &#124; 6 &#124; 7 &#124; 8 &#124; 9 &#124; 10 &#124; 11 &#124; 12 &#124; undefined |
| bun.LibdeflateCompressionOptions.library | PropertySignature | bun.d.ts:6241 | "libdeflate" &#124; undefined |
| bun.deflateSync | FunctionDeclaration | bun.d.ts:6250 | (data: string &#124; ArrayBuffer &#124; Uint8Array&lt;ArrayBuffer&gt;, options?: LibdeflateCompressionOptions &#124; ZlibCompressionOptions &#124; undefined) =&gt; Uint8Array&lt;...&gt; |
| bun.gzipSync | FunctionDeclaration | bun.d.ts:6260 | (data: string &#124; ArrayBuffer &#124; Uint8Array&lt;ArrayBuffer&gt;, options?: LibdeflateCompressionOptions &#124; ZlibCompressionOptions &#124; undefined) =&gt; Uint8Array&lt;...&gt; |
| bun.inflateSync | FunctionDeclaration | bun.d.ts:6269 | (data: string &#124; ArrayBuffer &#124; Uint8Array&lt;ArrayBuffer&gt;, options?: LibdeflateCompressionOptions &#124; ZlibCompressionOptions &#124; undefined) =&gt; Uint8Array&lt;...&gt; |
| bun.gunzipSync | FunctionDeclaration | bun.d.ts:6278 | (data: string &#124; ArrayBuffer &#124; Uint8Array&lt;ArrayBuffer&gt;, options?: LibdeflateCompressionOptions &#124; ZlibCompressionOptions &#124; undefined) =&gt; Uint8Array&lt;...&gt; |
| bun.zstdCompressSync | FunctionDeclaration | bun.d.ts:6289 | (data: string &#124; ArrayBuffer &#124; Buffer&lt;ArrayBufferLike&gt; &#124; TypedArray&lt;ArrayBufferLike&gt;, options?: { level?: number &#124; undefined; } &#124; undefined) =&gt; Buffer&lt;...&gt; |
| bun.zstdCompressSync.[TypeLiteral] | TypeLiteral | bun.d.ts:6291 | { level?: number &#124; undefined; } |
| bun.zstdCompressSync.level | PropertySignature | bun.d.ts:6291 | number &#124; undefined |
| bun.zstdCompress | FunctionDeclaration | bun.d.ts:6300 | (data: string &#124; ArrayBuffer &#124; Buffer&lt;ArrayBufferLike&gt; &#124; TypedArray&lt;ArrayBufferLike&gt;, options?: { level?: number &#124; undefined; } &#124; undefined) =&gt; Promise&lt;...&gt; |
| bun.zstdCompress.[TypeLiteral] | TypeLiteral | bun.d.ts:6302 | { level?: number &#124; undefined; } |
| bun.zstdCompress.level | PropertySignature | bun.d.ts:6302 | number &#124; undefined |
| bun.zstdDecompressSync | FunctionDeclaration | bun.d.ts:6310 | (data: string &#124; ArrayBuffer &#124; Buffer&lt;ArrayBufferLike&gt; &#124; TypedArray&lt;ArrayBufferLike&gt;) =&gt; Buffer&lt;ArrayBufferLike&gt; |
| bun.zstdDecompress | FunctionDeclaration | bun.d.ts:6317 | (data: string &#124; ArrayBuffer &#124; Buffer&lt;ArrayBufferLike&gt; &#124; TypedArray&lt;ArrayBufferLike&gt;) =&gt; Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt; |
| bun.Target | TypeAliasDeclaration | bun.d.ts:6319 | Target |
| bun.Loader | TypeAliasDeclaration | bun.d.ts:6339 | Loader |
| bun.PluginConstraints | InterfaceDeclaration | bun.d.ts:6356 | PluginConstraints |
| bun.PluginConstraints.filter | PropertySignature | bun.d.ts:6372 | RegExp |
| bun.PluginConstraints.namespace | PropertySignature | bun.d.ts:6384 | string &#124; undefined |
| bun.OnLoadResultSourceCode | InterfaceDeclaration | bun.d.ts:6387 | OnLoadResultSourceCode |
| bun.OnLoadResultSourceCode.contents | PropertySignature | bun.d.ts:6391 | string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt; |
| bun.OnLoadResultSourceCode.loader | PropertySignature | bun.d.ts:6395 | Loader &#124; undefined |
| bun.OnLoadResultObject | InterfaceDeclaration | bun.d.ts:6398 | OnLoadResultObject |
| bun.OnLoadResultObject.exports | PropertySignature | bun.d.ts:6413 | Record&lt;string, unknown&gt; |
| bun.OnLoadResultObject.loader | PropertySignature | bun.d.ts:6417 | "object" |
| bun.OnLoadArgs | InterfaceDeclaration | bun.d.ts:6420 | OnLoadArgs |
| bun.OnLoadArgs.path | PropertySignature | bun.d.ts:6431 | string |
| bun.OnLoadArgs.namespace | PropertySignature | bun.d.ts:6435 | string |
| bun.OnLoadArgs.loader | PropertySignature | bun.d.ts:6439 | Loader |
| bun.OnLoadArgs.defer | PropertySignature | bun.d.ts:6445 | () =&gt; Promise&lt;void&gt; |
| bun.OnLoadArgs.defer.[FunctionType] | FunctionType | bun.d.ts:6445 | () =&gt; Promise&lt;void&gt; |
| bun.OnLoadResult | TypeAliasDeclaration | bun.d.ts:6448 | OnLoadResult |
| bun.OnLoadCallback | TypeAliasDeclaration | bun.d.ts:6449 | OnLoadCallback |
| bun.OnLoadCallback.[FunctionType] | FunctionType | bun.d.ts:6449 | OnLoadCallback |
| bun.OnStartCallback | TypeAliasDeclaration | bun.d.ts:6450 | OnStartCallback |
| bun.OnStartCallback.[FunctionType] | FunctionType | bun.d.ts:6450 | OnStartCallback |
| bun.OnEndCallback | TypeAliasDeclaration | bun.d.ts:6451 | OnEndCallback |
| bun.OnEndCallback.[FunctionType] | FunctionType | bun.d.ts:6451 | OnEndCallback |
| bun.OnBeforeParseCallback | TypeAliasDeclaration | bun.d.ts:6452 | OnBeforeParseCallback |
| bun.OnBeforeParseCallback.[TypeLiteral] | TypeLiteral | bun.d.ts:6452 | OnBeforeParseCallback |
| bun.OnBeforeParseCallback.napiModule | PropertySignature | bun.d.ts:6453 | unknown |
| bun.OnBeforeParseCallback.symbol | PropertySignature | bun.d.ts:6454 | string |
| bun.OnBeforeParseCallback.external | PropertySignature | bun.d.ts:6455 | unknown |
| bun.OnResolveArgs | InterfaceDeclaration | bun.d.ts:6458 | OnResolveArgs |
| bun.OnResolveArgs.path | PropertySignature | bun.d.ts:6462 | string |
| bun.OnResolveArgs.importer | PropertySignature | bun.d.ts:6466 | string |
| bun.OnResolveArgs.namespace | PropertySignature | bun.d.ts:6470 | string |
| bun.OnResolveArgs.resolveDir | PropertySignature | bun.d.ts:6474 | string |
| bun.OnResolveArgs.kind | PropertySignature | bun.d.ts:6478 | ImportKind |
| bun.OnResolveResult | InterfaceDeclaration | bun.d.ts:6483 | OnResolveResult |
| bun.OnResolveResult.path | PropertySignature | bun.d.ts:6496 | string |
| bun.OnResolveResult.namespace | PropertySignature | bun.d.ts:6505 | string &#124; undefined |
| bun.OnResolveResult.external | PropertySignature | bun.d.ts:6506 | boolean &#124; undefined |
| bun.OnResolveCallback | TypeAliasDeclaration | bun.d.ts:6509 | OnResolveCallback |
| bun.OnResolveCallback.[FunctionType] | FunctionType | bun.d.ts:6509 | OnResolveCallback |
| bun.FFIFunctionCallable | TypeAliasDeclaration | bun.d.ts:6513 | FFIFunctionCallable |
| bun.FFIFunctionCallable.[TypeLiteral] | TypeLiteral | bun.d.ts:6513 | { readonly __ffi_function_callable: unique symbol; } |
| bun.FFIFunctionCallable.__ffi_function_callable | PropertySignature | bun.d.ts:6515 | unique symbol |
| bun.PluginBuilder | InterfaceDeclaration | bun.d.ts:6523 | PluginBuilder |
| bun.PluginBuilder.onStart | MethodSignature | bun.d.ts:6541 | (callback: OnStartCallback) =&gt; this |
| bun.PluginBuilder.onEnd | MethodSignature | bun.d.ts:6560 | (callback: OnEndCallback) =&gt; this |
| bun.PluginBuilder.onBeforeParse | MethodSignature | bun.d.ts:6561 | (constraints: PluginConstraints, callback: OnBeforeParseCallback) =&gt; this |
| bun.PluginBuilder.onLoad | MethodSignature | bun.d.ts:6579 | (constraints: PluginConstraints, callback: OnLoadCallback) =&gt; this |
| bun.PluginBuilder.onResolve | MethodSignature | bun.d.ts:6597 | (constraints: PluginConstraints, callback: OnResolveCallback) =&gt; this |
| bun.PluginBuilder.config | PropertySignature | bun.d.ts:6601 | BuildConfig &amp; { plugins: BunPlugin[]; } |
| bun.PluginBuilder.config.[TypeLiteral] | TypeLiteral | bun.d.ts:6601 | { plugins: BunPlugin[]; } |
| bun.PluginBuilder.config.plugins | PropertySignature | bun.d.ts:6601 | BunPlugin[] |
| bun.PluginBuilder.module | MethodSignature | bun.d.ts:6630 | (specifier: string, callback: () =&gt; Promise&lt;OnLoadResult&gt; &#124; OnLoadResult) =&gt; this |
| bun.PluginBuilder.module.[FunctionType] | FunctionType | bun.d.ts:6630 | () =&gt; Promise&lt;OnLoadResult&gt; &#124; OnLoadResult |
| bun.BunPlugin | InterfaceDeclaration | bun.d.ts:6638 | BunPlugin |
| bun.BunPlugin.name | PropertySignature | bun.d.ts:6644 | string |
| bun.BunPlugin.target | PropertySignature | bun.d.ts:6656 | Target &#124; undefined |
| bun.BunPlugin.setup | MethodSignature | bun.d.ts:6665 | (build: PluginBuilder) =&gt; void &#124; Promise&lt;void&gt; |
| bun.BunRegisterPlugin | InterfaceDeclaration | bun.d.ts:6719 | BunRegisterPlugin |
| bun.BunRegisterPlugin.[call] | CallSignature | bun.d.ts:6720 | any |
| bun.BunRegisterPlugin.T | TypeParameter | bun.d.ts:6720 | T |
| bun.BunRegisterPlugin.clearAll | MethodSignature | bun.d.ts:6727 | () =&gt; void |
| bun.plugin | VariableDeclaration | bun.d.ts:6730 | BunRegisterPlugin |
| bun.isMainThread | VariableDeclaration | bun.d.ts:6735 | boolean |
| bun.HTMLBundle | InterfaceDeclaration | bun.d.ts:6748 | HTMLBundle |
| bun.HTMLBundle.index | PropertySignature | bun.d.ts:6749 | string |
| bun.HTMLBundle.files | PropertySignature | bun.d.ts:6752 | { input?: string &#124; undefined; path: string; loader: Loader; isEntry: boolean; headers: { [key: string]: string; etag: string; "content-type": string; }; }[] &#124; undefined |
| bun.HTMLBundle.files.[TypeLiteral] | TypeLiteral | bun.d.ts:6752 | { input?: string &#124; undefined; path: string; loader: Loader; isEntry: boolean; headers: { [key: string]: string; etag: string; "content-type": string; }; } |
| bun.HTMLBundle.files.input | PropertySignature | bun.d.ts:6754 | string &#124; undefined |
| bun.HTMLBundle.files.path | PropertySignature | bun.d.ts:6756 | string |
| bun.HTMLBundle.files.loader | PropertySignature | bun.d.ts:6758 | Loader |
| bun.HTMLBundle.files.isEntry | PropertySignature | bun.d.ts:6760 | boolean |
| bun.HTMLBundle.files.headers | PropertySignature | bun.d.ts:6762 | { [key: string]: string; etag: string; "content-type": string; } |
| bun.HTMLBundle.files.headers.[TypeLiteral] | TypeLiteral | bun.d.ts:6762 | { [key: string]: string; etag: string; "content-type": string; } |
| bun.HTMLBundle.files.headers.etag | PropertySignature | bun.d.ts:6764 | string |
| bun.HTMLBundle.files.headers.content-type | PropertySignature | bun.d.ts:6766 | string |
| bun.HTMLBundle.files.headers.[index] | IndexSignature | bun.d.ts:6771 | any |
| bun.Socket | InterfaceDeclaration | bun.d.ts:6783 | Socket&lt;Data&gt; |
| bun.Socket.Data | TypeParameter | bun.d.ts:6783 | Data |
| bun.Socket.write | MethodSignature | bun.d.ts:6809 | (data: string &#124; BufferSource, byteOffset?: number &#124; undefined, byteLength?: number &#124; undefined) =&gt; number |
| bun.Socket.data | PropertySignature | bun.d.ts:6825 | Data |
| bun.Socket.end | MethodSignature | bun.d.ts:6845 | { (data?: string &#124; BufferSource &#124; undefined, byteOffset?: number &#124; undefined, byteLength?: number &#124; undefined): number; (): void; } |
| bun.Socket.end | MethodSignature | bun.d.ts:6850 | { (data?: string &#124; BufferSource &#124; undefined, byteOffset?: number &#124; undefined, byteLength?: number &#124; undefined): number; (): void; } |
| bun.Socket.ref | MethodSignature | bun.d.ts:6858 | () =&gt; void |
| bun.Socket.timeout | MethodSignature | bun.d.ts:6867 | (seconds: number) =&gt; void |
| bun.Socket.terminate | MethodSignature | bun.d.ts:6882 | () =&gt; void |
| bun.Socket.shutdown | MethodSignature | bun.d.ts:6900 | (halfClose?: boolean &#124; undefined) =&gt; void |
| bun.Socket.readyState | PropertySignature | bun.d.ts:6913 | -2 &#124; -1 &#124; 0 &#124; 1 &#124; 2 |
| bun.Socket.unref | MethodSignature | bun.d.ts:6920 | () =&gt; void |
| bun.Socket.flush | MethodSignature | bun.d.ts:6931 | () =&gt; void |
| bun.Socket.reload | MethodSignature | bun.d.ts:6938 | (options: Pick&lt;SocketOptions&lt;Data&gt;, "socket"&gt;) =&gt; void |
| bun.Socket.listener | PropertySignature | bun.d.ts:6945 | SocketListener&lt;undefined&gt; &#124; undefined |
| bun.Socket.remoteFamily | PropertySignature | bun.d.ts:6951 | "IPv4" &#124; "IPv6" |
| bun.Socket.remoteAddress | PropertySignature | bun.d.ts:6957 | string |
| bun.Socket.remotePort | PropertySignature | bun.d.ts:6963 | number |
| bun.Socket.localFamily | PropertySignature | bun.d.ts:6969 | "IPv4" &#124; "IPv6" |
| bun.Socket.localAddress | PropertySignature | bun.d.ts:6975 | string |
| bun.Socket.localPort | PropertySignature | bun.d.ts:6981 | number |
| bun.Socket.authorized | PropertySignature | bun.d.ts:6987 | boolean |
| bun.Socket.alpnProtocol | PropertySignature | bun.d.ts:6995 | string &#124; false &#124; null |
| bun.Socket.disableRenegotiation | MethodSignature | bun.d.ts:7003 | () =&gt; void |
| bun.Socket.exportKeyingMaterial | MethodSignature | bun.d.ts:7027 | { (length: number, label: string, context: Buffer&lt;ArrayBufferLike&gt;): Buffer&lt;ArrayBufferLike&gt;; (length: number, label: string, context?: string &#124; ... 1 more ... &#124; undefined): void; } |
| bun.Socket.getAuthorizationError | MethodSignature | bun.d.ts:7033 | () =&gt; Error &#124; null |
| bun.Socket.getCertificate | MethodSignature | bun.d.ts:7042 | () =&gt; object &#124; PeerCertificate &#124; null |
| bun.Socket.getX509Certificate | MethodSignature | bun.d.ts:7043 | () =&gt; X509Certificate &#124; undefined |
| bun.Socket.getCipher | MethodSignature | bun.d.ts:7059 | () =&gt; CipherNameAndProtocol |
| bun.Socket.getEphemeralKeyInfo | MethodSignature | bun.d.ts:7070 | () =&gt; object &#124; EphemeralKeyInfo &#124; null |
| bun.Socket.getPeerCertificate | MethodSignature | bun.d.ts:7081 | () =&gt; PeerCertificate |
| bun.Socket.getPeerX509Certificate | MethodSignature | bun.d.ts:7082 | () =&gt; X509Certificate |
| bun.Socket.getSharedSigalgs | MethodSignature | bun.d.ts:7088 | () =&gt; string[] |
| bun.Socket.getTLSFinishedMessage | MethodSignature | bun.d.ts:7098 | () =&gt; Buffer&lt;ArrayBufferLike&gt; &#124; undefined |
| bun.Socket.getTLSPeerFinishedMessage | MethodSignature | bun.d.ts:7109 | () =&gt; Buffer&lt;ArrayBufferLike&gt; &#124; undefined |
| bun.Socket.getTLSTicket | MethodSignature | bun.d.ts:7118 | () =&gt; Buffer&lt;ArrayBufferLike&gt; &#124; undefined |
| bun.Socket.getTLSVersion | MethodSignature | bun.d.ts:7135 | () =&gt; string |
| bun.Socket.isSessionReused | MethodSignature | bun.d.ts:7143 | () =&gt; boolean |
| bun.Socket.setMaxSendFragment | MethodSignature | bun.d.ts:7157 | (size: number) =&gt; boolean |
| bun.Socket.setNoDelay | MethodSignature | bun.d.ts:7165 | (noDelay?: boolean &#124; undefined) =&gt; boolean |
| bun.Socket.setKeepAlive | MethodSignature | bun.d.ts:7182 | (enable?: boolean &#124; undefined, initialDelay?: number &#124; undefined) =&gt; boolean |
| bun.Socket.bytesWritten | PropertySignature | bun.d.ts:7188 | number |
| bun.Socket./**      * Alias for `socket.end()`. Allows the socket to be used with `using` declarations      * for automatic resource management.      * @example      * ```ts      * async function processSocket() {      *   using socket = await Bun.connect({ ... });      *   socket.write("Data");      *   // socket.end() is called automatically when exiting the scope      * }      * ```      */     [Symbol.dispose] | MethodSignature | bun.d.ts:7202 | () =&gt; void |
| bun.Socket.resume | MethodSignature | bun.d.ts:7204 | () =&gt; void |
| bun.Socket.pause | MethodSignature | bun.d.ts:7206 | () =&gt; void |
| bun.Socket.renegotiate | MethodSignature | bun.d.ts:7211 | () =&gt; void |
| bun.Socket.setVerifyMode | MethodSignature | bun.d.ts:7219 | (requestCert: boolean, rejectUnauthorized: boolean) =&gt; void |
| bun.Socket.getSession | MethodSignature | bun.d.ts:7221 | () =&gt; void |
| bun.Socket.setSession | MethodSignature | bun.d.ts:7232 | (session: string &#124; Buffer&lt;ArrayBufferLike&gt; &#124; BufferSource) =&gt; void |
| bun.Socket.exportKeyingMaterial | MethodSignature | bun.d.ts:7241 | { (length: number, label: string, context: Buffer&lt;ArrayBufferLike&gt;): Buffer&lt;ArrayBufferLike&gt;; (length: number, label: string, context?: string &#124; ... 1 more ... &#124; undefined): void; } |
| bun.Socket.upgradeTLS | MethodSignature | bun.d.ts:7250 | &lt;Data&gt;(options: TLSUpgradeOptions&lt;Data&gt;) =&gt; [raw: Socket&lt;Data&gt;, tls: Socket&lt;Data&gt;] |
| bun.Socket.upgradeTLS.Data | TypeParameter | bun.d.ts:7250 | Data |
| bun.Socket.close | MethodSignature | bun.d.ts:7260 | () =&gt; void |
| bun.Socket.getServername | MethodSignature | bun.d.ts:7267 | () =&gt; string |
| bun.Socket.setServername | MethodSignature | bun.d.ts:7274 | (name: string) =&gt; void |
| bun.TLSUpgradeOptions | InterfaceDeclaration | bun.d.ts:7277 | TLSUpgradeOptions&lt;Data&gt; |
| bun.TLSUpgradeOptions.Data | TypeParameter | bun.d.ts:7277 | Data |
| bun.TLSUpgradeOptions.data | PropertySignature | bun.d.ts:7278 | Data &#124; undefined |
| bun.TLSUpgradeOptions.tls | PropertySignature | bun.d.ts:7279 | boolean &#124; TLSOptions |
| bun.TLSUpgradeOptions.socket | PropertySignature | bun.d.ts:7280 | SocketHandler&lt;Data, "buffer"&gt; |
| bun.SocketListener | InterfaceDeclaration | bun.d.ts:7283 | SocketListener&lt;Data&gt; |
| bun.SocketListener.Data | TypeParameter | bun.d.ts:7283 | Data |
| bun.SocketListener.stop | MethodSignature | bun.d.ts:7284 | (closeActiveConnections?: boolean &#124; undefined) =&gt; void |
| bun.SocketListener.ref | MethodSignature | bun.d.ts:7285 | () =&gt; void |
| bun.SocketListener.unref | MethodSignature | bun.d.ts:7286 | () =&gt; void |
| bun.SocketListener.reload | MethodSignature | bun.d.ts:7287 | (options: Pick&lt;SocketOptions&lt;Data&gt;, "socket"&gt;) =&gt; void |
| bun.SocketListener.data | PropertySignature | bun.d.ts:7288 | Data |
| bun.TCPSocketListener | InterfaceDeclaration | bun.d.ts:7290 | TCPSocketListener&lt;Data&gt; |
| bun.TCPSocketListener.Data | TypeParameter | bun.d.ts:7290 | Data |
| bun.TCPSocketListener.port | PropertySignature | bun.d.ts:7291 | number |
| bun.TCPSocketListener.hostname | PropertySignature | bun.d.ts:7292 | string |
| bun.UnixSocketListener | InterfaceDeclaration | bun.d.ts:7294 | UnixSocketListener&lt;Data&gt; |
| bun.UnixSocketListener.Data | TypeParameter | bun.d.ts:7294 | Data |
| bun.UnixSocketListener.unix | PropertySignature | bun.d.ts:7295 | string |
| bun.TCPSocket | InterfaceDeclaration | bun.d.ts:7298 | TCPSocket |
| bun.TLSSocket | InterfaceDeclaration | bun.d.ts:7299 | TLSSocket |
| bun.BinaryTypeList | InterfaceDeclaration | bun.d.ts:7301 | BinaryTypeList |
| bun.BinaryTypeList.arraybuffer | PropertySignature | bun.d.ts:7302 | ArrayBuffer |
| bun.BinaryTypeList.buffer | PropertySignature | bun.d.ts:7303 | Buffer&lt;ArrayBufferLike&gt; |
| bun.BinaryTypeList.uint8array | PropertySignature | bun.d.ts:7304 | Uint8Array&lt;ArrayBuffer&gt; |
| bun.BinaryType | TypeAliasDeclaration | bun.d.ts:7308 | keyof BinaryTypeList |
| bun.SocketHandler | InterfaceDeclaration | bun.d.ts:7310 | SocketHandler&lt;Data, DataBinaryType&gt; |
| bun.SocketHandler.Data | TypeParameter | bun.d.ts:7310 | Data |
| bun.SocketHandler.DataBinaryType | TypeParameter | bun.d.ts:7310 | DataBinaryType |
| bun.SocketHandler.open | MethodSignature | bun.d.ts:7315 | ((socket: Socket&lt;Data&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.SocketHandler.close | MethodSignature | bun.d.ts:7316 | ((socket: Socket&lt;Data&gt;, error?: Error &#124; undefined) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.SocketHandler.error | MethodSignature | bun.d.ts:7322 | ((socket: Socket&lt;Data&gt;, error: Error) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.SocketHandler.data | MethodSignature | bun.d.ts:7323 | ((socket: Socket&lt;Data&gt;, data: BinaryTypeList[DataBinaryType]) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.SocketHandler.drain | MethodSignature | bun.d.ts:7324 | ((socket: Socket&lt;Data&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.SocketHandler.handshake | MethodSignature | bun.d.ts:7331 | ((socket: Socket&lt;Data&gt;, success: boolean, authorizationError: Error &#124; null) =&gt; void) &#124; undefined |
| bun.SocketHandler.end | MethodSignature | bun.d.ts:7337 | ((socket: Socket&lt;Data&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.SocketHandler.connectError | MethodSignature | bun.d.ts:7352 | ((socket: Socket&lt;Data&gt;, error: Error) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.SocketHandler.timeout | MethodSignature | bun.d.ts:7357 | ((socket: Socket&lt;Data&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.SocketHandler.binaryType | PropertySignature | bun.d.ts:7367 | keyof BinaryTypeList &#124; undefined |
| bun.SocketOptions | InterfaceDeclaration | bun.d.ts:7370 | SocketOptions&lt;Data&gt; |
| bun.SocketOptions.Data | TypeParameter | bun.d.ts:7370 | Data |
| bun.SocketOptions.socket | PropertySignature | bun.d.ts:7374 | SocketHandler&lt;Data, "buffer"&gt; |
| bun.SocketOptions.data | PropertySignature | bun.d.ts:7378 | Data &#124; undefined |
| bun.SocketOptions.allowHalfOpen | PropertySignature | bun.d.ts:7394 | boolean &#124; undefined |
| bun.TCPSocketListenOptions | InterfaceDeclaration | bun.d.ts:7397 | TCPSocketListenOptions&lt;Data&gt; |
| bun.TCPSocketListenOptions.Data | TypeParameter | bun.d.ts:7397 | Data |
| bun.TCPSocketListenOptions.hostname | PropertySignature | bun.d.ts:7401 | string |
| bun.TCPSocketListenOptions.port | PropertySignature | bun.d.ts:7405 | number |
| bun.TCPSocketListenOptions.tls | PropertySignature | bun.d.ts:7409 | boolean &#124; TLSOptions &#124; undefined |
| bun.TCPSocketListenOptions.exclusive | PropertySignature | bun.d.ts:7421 | boolean &#124; undefined |
| bun.TCPSocketListenOptions.allowHalfOpen | PropertySignature | bun.d.ts:7437 | boolean &#124; undefined |
| bun.TCPSocketConnectOptions | InterfaceDeclaration | bun.d.ts:7440 | TCPSocketConnectOptions&lt;Data&gt; |
| bun.TCPSocketConnectOptions.Data | TypeParameter | bun.d.ts:7440 | Data |
| bun.TCPSocketConnectOptions.hostname | PropertySignature | bun.d.ts:7444 | string |
| bun.TCPSocketConnectOptions.port | PropertySignature | bun.d.ts:7448 | number |
| bun.TCPSocketConnectOptions.tls | PropertySignature | bun.d.ts:7452 | boolean &#124; TLSOptions &#124; undefined |
| bun.TCPSocketConnectOptions.exclusive | PropertySignature | bun.d.ts:7464 | boolean &#124; undefined |
| bun.TCPSocketConnectOptions.reusePort | PropertySignature | bun.d.ts:7465 | boolean &#124; undefined |
| bun.TCPSocketConnectOptions.ipv6Only | PropertySignature | bun.d.ts:7466 | boolean &#124; undefined |
| bun.UnixSocketOptions | InterfaceDeclaration | bun.d.ts:7469 | UnixSocketOptions&lt;Data&gt; |
| bun.UnixSocketOptions.Data | TypeParameter | bun.d.ts:7469 | Data |
| bun.UnixSocketOptions.unix | PropertySignature | bun.d.ts:7473 | string |
| bun.UnixSocketOptions.tls | PropertySignature | bun.d.ts:7478 | boolean &#124; TLSOptions &#124; undefined |
| bun.FdSocketOptions | InterfaceDeclaration | bun.d.ts:7481 | FdSocketOptions&lt;Data&gt; |
| bun.FdSocketOptions.Data | TypeParameter | bun.d.ts:7481 | Data |
| bun.FdSocketOptions.tls | PropertySignature | bun.d.ts:7485 | boolean &#124; TLSOptions &#124; undefined |
| bun.FdSocketOptions.fd | PropertySignature | bun.d.ts:7489 | number |
| bun.connect | FunctionDeclaration | bun.d.ts:7497 | { &lt;Data = undefined&gt;(options: TCPSocketConnectOptions&lt;Data&gt;): Promise&lt;Socket&lt;Data&gt;&gt;; &lt;Data = undefined&gt;(options: UnixSocketOptions&lt;Data&gt;): Promise&lt;...&gt;; } |
| bun.connect.Data | TypeParameter | bun.d.ts:7497 | Data |
| bun.connect | FunctionDeclaration | bun.d.ts:7503 | { &lt;Data = undefined&gt;(options: TCPSocketConnectOptions&lt;Data&gt;): Promise&lt;Socket&lt;Data&gt;&gt;; &lt;Data = undefined&gt;(options: UnixSocketOptions&lt;Data&gt;): Promise&lt;...&gt;; } |
| bun.connect.Data | TypeParameter | bun.d.ts:7503 | Data |
| bun.listen | FunctionDeclaration | bun.d.ts:7510 | { &lt;Data = undefined&gt;(options: TCPSocketListenOptions&lt;Data&gt;): TCPSocketListener&lt;Data&gt;; &lt;Data = undefined&gt;(options: UnixSocketOptions&lt;Data&gt;): UnixSocketListener&lt;...&gt;; } |
| bun.listen.Data | TypeParameter | bun.d.ts:7510 | Data |
| bun.listen | FunctionDeclaration | bun.d.ts:7516 | { &lt;Data = undefined&gt;(options: TCPSocketListenOptions&lt;Data&gt;): TCPSocketListener&lt;Data&gt;; &lt;Data = undefined&gt;(options: UnixSocketOptions&lt;Data&gt;): UnixSocketListener&lt;...&gt;; } |
| bun.listen.Data | TypeParameter | bun.d.ts:7516 | Data |
| bun.udp | ModuleDeclaration | bun.d.ts:7521 | any |
| bun.udp.Data | TypeAliasDeclaration | bun.d.ts:7522 | Data |
| bun.udp.ReceiveFlags | InterfaceDeclaration | bun.d.ts:7527 | ReceiveFlags |
| bun.udp.ReceiveFlags.truncated | PropertySignature | bun.d.ts:7533 | boolean |
| bun.udp.ReceiveFlags.ipv6 | PropertySignature | bun.d.ts:7539 | boolean |
| bun.udp.SocketHandler | InterfaceDeclaration | bun.d.ts:7542 | SocketHandler&lt;DataBinaryType&gt; |
| bun.udp.SocketHandler.DataBinaryType | TypeParameter | bun.d.ts:7542 | DataBinaryType |
| bun.udp.SocketHandler.data | MethodSignature | bun.d.ts:7543 | ((socket: Socket&lt;DataBinaryType&gt;, data: BinaryTypeList[DataBinaryType], port: number, address: string, flags: ReceiveFlags) =&gt; void &#124; Promise&lt;...&gt;) &#124; undefined |
| bun.udp.SocketHandler.drain | MethodSignature | bun.d.ts:7550 | ((socket: Socket&lt;DataBinaryType&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.udp.SocketHandler.error | MethodSignature | bun.d.ts:7551 | ((socket: Socket&lt;DataBinaryType&gt;, error: Error) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.udp.ConnectedSocketHandler | InterfaceDeclaration | bun.d.ts:7554 | ConnectedSocketHandler&lt;DataBinaryType&gt; |
| bun.udp.ConnectedSocketHandler.DataBinaryType | TypeParameter | bun.d.ts:7554 | DataBinaryType |
| bun.udp.ConnectedSocketHandler.data | MethodSignature | bun.d.ts:7555 | ((socket: ConnectedSocket&lt;DataBinaryType&gt;, data: BinaryTypeList[DataBinaryType], port: number, address: string, flags: ReceiveFlags) =&gt; void &#124; Promise&lt;...&gt;) &#124; undefined |
| bun.udp.ConnectedSocketHandler.drain | MethodSignature | bun.d.ts:7562 | ((socket: ConnectedSocket&lt;DataBinaryType&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.udp.ConnectedSocketHandler.error | MethodSignature | bun.d.ts:7563 | ((socket: ConnectedSocket&lt;DataBinaryType&gt;, error: Error) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.udp.SocketOptions | InterfaceDeclaration | bun.d.ts:7566 | SocketOptions&lt;DataBinaryType&gt; |
| bun.udp.SocketOptions.DataBinaryType | TypeParameter | bun.d.ts:7566 | DataBinaryType |
| bun.udp.SocketOptions.hostname | PropertySignature | bun.d.ts:7567 | string &#124; undefined |
| bun.udp.SocketOptions.port | PropertySignature | bun.d.ts:7568 | number &#124; undefined |
| bun.udp.SocketOptions.binaryType | PropertySignature | bun.d.ts:7569 | DataBinaryType &#124; undefined |
| bun.udp.SocketOptions.socket | PropertySignature | bun.d.ts:7570 | SocketHandler&lt;DataBinaryType&gt; &#124; undefined |
| bun.udp.ConnectSocketOptions | InterfaceDeclaration | bun.d.ts:7573 | ConnectSocketOptions&lt;DataBinaryType&gt; |
| bun.udp.ConnectSocketOptions.DataBinaryType | TypeParameter | bun.d.ts:7573 | DataBinaryType |
| bun.udp.ConnectSocketOptions.hostname | PropertySignature | bun.d.ts:7574 | string &#124; undefined |
| bun.udp.ConnectSocketOptions.port | PropertySignature | bun.d.ts:7575 | number &#124; undefined |
| bun.udp.ConnectSocketOptions.binaryType | PropertySignature | bun.d.ts:7576 | DataBinaryType &#124; undefined |
| bun.udp.ConnectSocketOptions.socket | PropertySignature | bun.d.ts:7577 | ConnectedSocketHandler&lt;DataBinaryType&gt; &#124; undefined |
| bun.udp.ConnectSocketOptions.connect | PropertySignature | bun.d.ts:7578 | { hostname: string; port: number; } |
| bun.udp.ConnectSocketOptions.connect.[TypeLiteral] | TypeLiteral | bun.d.ts:7578 | { hostname: string; port: number; } |
| bun.udp.ConnectSocketOptions.connect.hostname | PropertySignature | bun.d.ts:7579 | string |
| bun.udp.ConnectSocketOptions.connect.port | PropertySignature | bun.d.ts:7580 | number |
| bun.udp.BaseUDPSocket | InterfaceDeclaration | bun.d.ts:7584 | BaseUDPSocket |
| bun.udp.BaseUDPSocket.hostname | PropertySignature | bun.d.ts:7585 | string |
| bun.udp.BaseUDPSocket.port | PropertySignature | bun.d.ts:7586 | number |
| bun.udp.BaseUDPSocket.address | PropertySignature | bun.d.ts:7587 | SocketAddress |
| bun.udp.BaseUDPSocket.binaryType | PropertySignature | bun.d.ts:7588 | keyof BinaryTypeList |
| bun.udp.BaseUDPSocket.closed | PropertySignature | bun.d.ts:7589 | boolean |
| bun.udp.BaseUDPSocket.ref | MethodSignature | bun.d.ts:7590 | () =&gt; void |
| bun.udp.BaseUDPSocket.unref | MethodSignature | bun.d.ts:7591 | () =&gt; void |
| bun.udp.BaseUDPSocket.close | MethodSignature | bun.d.ts:7592 | () =&gt; void |
| bun.udp.BaseUDPSocket.setBroadcast | MethodSignature | bun.d.ts:7598 | (enabled: boolean) =&gt; boolean |
| bun.udp.BaseUDPSocket.setTTL | MethodSignature | bun.d.ts:7604 | (ttl: number) =&gt; number |
| bun.udp.BaseUDPSocket.setMulticastTTL | MethodSignature | bun.d.ts:7610 | (ttl: number) =&gt; number |
| bun.udp.BaseUDPSocket.setMulticastLoopback | MethodSignature | bun.d.ts:7616 | (enabled: boolean) =&gt; boolean |
| bun.udp.BaseUDPSocket.setMulticastInterface | MethodSignature | bun.d.ts:7623 | (interfaceAddress: string) =&gt; boolean |
| bun.udp.BaseUDPSocket.addMembership | MethodSignature | bun.d.ts:7630 | (multicastAddress: string, interfaceAddress?: string &#124; undefined) =&gt; boolean |
| bun.udp.BaseUDPSocket.dropMembership | MethodSignature | bun.d.ts:7637 | (multicastAddress: string, interfaceAddress?: string &#124; undefined) =&gt; boolean |
| bun.udp.BaseUDPSocket.addSourceSpecificMembership | MethodSignature | bun.d.ts:7645 | (sourceAddress: string, groupAddress: string, interfaceAddress?: string &#124; undefined) =&gt; boolean |
| bun.udp.BaseUDPSocket.dropSourceSpecificMembership | MethodSignature | bun.d.ts:7653 | (sourceAddress: string, groupAddress: string, interfaceAddress?: string &#124; undefined) =&gt; boolean |
| bun.udp.ConnectedSocket | InterfaceDeclaration | bun.d.ts:7656 | ConnectedSocket&lt;DataBinaryType&gt; |
| bun.udp.ConnectedSocket.DataBinaryType | TypeParameter | bun.d.ts:7656 | DataBinaryType |
| bun.udp.ConnectedSocket.remoteAddress | PropertySignature | bun.d.ts:7657 | SocketAddress |
| bun.udp.ConnectedSocket.sendMany | MethodSignature | bun.d.ts:7658 | (packets: readonly Data[]) =&gt; number |
| bun.udp.ConnectedSocket.send | MethodSignature | bun.d.ts:7659 | (data: Data) =&gt; boolean |
| bun.udp.ConnectedSocket.reload | MethodSignature | bun.d.ts:7660 | (handler: ConnectedSocketHandler&lt;DataBinaryType&gt;) =&gt; void |
| bun.udp.Socket | InterfaceDeclaration | bun.d.ts:7663 | Socket&lt;DataBinaryType&gt; |
| bun.udp.Socket.DataBinaryType | TypeParameter | bun.d.ts:7663 | DataBinaryType |
| bun.udp.Socket.sendMany | MethodSignature | bun.d.ts:7664 | (packets: readonly (number &#124; Data)[]) =&gt; number |
| bun.udp.Socket.send | MethodSignature | bun.d.ts:7665 | (data: Data, port: number, address: string) =&gt; boolean |
| bun.udp.Socket.reload | MethodSignature | bun.d.ts:7666 | (handler: SocketHandler&lt;DataBinaryType&gt;) =&gt; void |
| bun.udpSocket | FunctionDeclaration | bun.d.ts:7682 | { &lt;DataBinaryType extends BinaryType = "buffer"&gt;(options: SocketOptions&lt;DataBinaryType&gt;): Promise&lt;Socket&lt;DataBinaryType&gt;&gt;; &lt;DataBinaryType extends BinaryType = "buffer"&gt;(options: ConnectSocketOptions&lt;...&gt;): Promise&lt;...&gt;; } |
| bun.udpSocket.DataBinaryType | TypeParameter | bun.d.ts:7682 | DataBinaryType |
| bun.udpSocket | FunctionDeclaration | bun.d.ts:7685 | { &lt;DataBinaryType extends BinaryType = "buffer"&gt;(options: SocketOptions&lt;DataBinaryType&gt;): Promise&lt;Socket&lt;DataBinaryType&gt;&gt;; &lt;DataBinaryType extends BinaryType = "buffer"&gt;(options: ConnectSocketOptions&lt;...&gt;): Promise&lt;...&gt;; } |
| bun.udpSocket.DataBinaryType | TypeParameter | bun.d.ts:7685 | DataBinaryType |
| bun.SpawnOptions | ImportEqualsDeclaration | bun.d.ts:7692 | any |
| bun.Spawn | ModuleDeclaration | bun.d.ts:7694 | any |
| bun.Spawn.Readable | TypeAliasDeclaration | bun.d.ts:7698 | Readable |
| bun.Spawn.Writable | TypeAliasDeclaration | bun.d.ts:7711 | Writable |
| bun.Spawn.OptionsObject | TypeAliasDeclaration | bun.d.ts:7728 | OptionsObject&lt;In, Out, Err&gt; |
| bun.Spawn.OptionsObject.In | TypeParameter | bun.d.ts:7728 | In |
| bun.Spawn.OptionsObject.Out | TypeParameter | bun.d.ts:7728 | Out |
| bun.Spawn.OptionsObject.Err | TypeParameter | bun.d.ts:7728 | Err |
| bun.Spawn.BaseOptions | InterfaceDeclaration | bun.d.ts:7730 | BaseOptions&lt;In, Out, Err&gt; |
| bun.Spawn.BaseOptions.In | TypeParameter | bun.d.ts:7730 | In |
| bun.Spawn.BaseOptions.Out | TypeParameter | bun.d.ts:7730 | Out |
| bun.Spawn.BaseOptions.Err | TypeParameter | bun.d.ts:7730 | Err |
| bun.Spawn.BaseOptions.cwd | PropertySignature | bun.d.ts:7736 | string &#124; undefined |
| bun.Spawn.BaseOptions.detached | PropertySignature | bun.d.ts:7752 | boolean &#124; undefined |
| bun.Spawn.BaseOptions.uid | PropertySignature | bun.d.ts:7759 | number &#124; undefined |
| bun.Spawn.BaseOptions.gid | PropertySignature | bun.d.ts:7766 | number &#124; undefined |
| bun.Spawn.BaseOptions.cgroup | PropertySignature | bun.d.ts:7793 | string &#124; number &#124; undefined |
| bun.Spawn.BaseOptions.env | PropertySignature | bun.d.ts:7802 | Record&lt;string, string &#124; undefined&gt; &#124; undefined |
| bun.Spawn.BaseOptions.stdio | PropertySignature | bun.d.ts:7834 | [In, Out, Err, ...("socket-fd" &#124; Readable)[]] &#124; undefined |
| bun.Spawn.BaseOptions.stdin | PropertySignature | bun.d.ts:7847 | In &#124; undefined |
| bun.Spawn.BaseOptions.stdout | PropertySignature | bun.d.ts:7859 | Out &#124; undefined |
| bun.Spawn.BaseOptions.stderr | PropertySignature | bun.d.ts:7872 | Err &#124; undefined |
| bun.Spawn.BaseOptions.onExit | MethodSignature | bun.d.ts:7894 | ((subprocess: Subprocess&lt;In, Out, Err&gt;, exitCode: number &#124; null, signalCode: number &#124; Signals &#124; null, error?: ErrorLike &#124; undefined) =&gt; void &#124; Promise&lt;...&gt;) &#124; undefined |
| bun.Spawn.BaseOptions.onDisconnect | MethodSignature | bun.d.ts:7944 | (() =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.Spawn.BaseOptions.ipc | MethodSignature | bun.d.ts:7956 | ((message: any, subprocess: Subprocess&lt;In, Out, Err&gt;, handle?: unknown) =&gt; void) &#124; undefined |
| bun.Spawn.BaseOptions.serialization | PropertySignature | bun.d.ts:7972 | "advanced" &#124; "json" &#124; undefined |
| bun.Spawn.BaseOptions.windowsHide | PropertySignature | bun.d.ts:7977 | boolean &#124; undefined |
| bun.Spawn.BaseOptions.windowsVerbatimArguments | PropertySignature | bun.d.ts:7982 | boolean &#124; undefined |
| bun.Spawn.BaseOptions.argv0 | PropertySignature | bun.d.ts:7991 | string &#124; undefined |
| bun.Spawn.BaseOptions.signal | PropertySignature | bun.d.ts:8022 | AbortSignal &#124; undefined |
| bun.Spawn.BaseOptions.timeout | PropertySignature | bun.d.ts:8040 | number &#124; undefined |
| bun.Spawn.BaseOptions.killSignal | PropertySignature | bun.d.ts:8058 | string &#124; number &#124; undefined |
| bun.Spawn.BaseOptions.maxBuffer | PropertySignature | bun.d.ts:8066 | number &#124; undefined |
| bun.Spawn.SpawnSyncOptions | InterfaceDeclaration | bun.d.ts:8069 | SpawnSyncOptions&lt;In, Out, Err&gt; |
| bun.Spawn.SpawnSyncOptions.In | TypeParameter | bun.d.ts:8069 | In |
| bun.Spawn.SpawnSyncOptions.Out | TypeParameter | bun.d.ts:8069 | Out |
| bun.Spawn.SpawnSyncOptions.Err | TypeParameter | bun.d.ts:8069 | Err |
| bun.Spawn.SpawnOptions | InterfaceDeclaration | bun.d.ts:8075 | SpawnOptions&lt;In, Out, Err&gt; |
| bun.Spawn.SpawnOptions.In | TypeParameter | bun.d.ts:8075 | In |
| bun.Spawn.SpawnOptions.Out | TypeParameter | bun.d.ts:8075 | Out |
| bun.Spawn.SpawnOptions.Err | TypeParameter | bun.d.ts:8075 | Err |
| bun.Spawn.SpawnOptions.lazy | PropertySignature | bun.d.ts:8100 | boolean &#124; undefined |
| bun.Spawn.SpawnOptions.terminal | PropertySignature | bun.d.ts:8138 | Terminal &#124; TerminalOptions &#124; undefined |
| bun.Spawn.ReadableToIO | TypeAliasDeclaration | bun.d.ts:8141 | ReadableToIO&lt;X&gt; |
| bun.Spawn.ReadableToIO.X | TypeParameter | bun.d.ts:8141 | X |
| bun.Spawn.ReadableToSyncIO | TypeAliasDeclaration | bun.d.ts:8147 | ReadableToSyncIO&lt;X&gt; |
| bun.Spawn.ReadableToSyncIO.X | TypeParameter | bun.d.ts:8147 | X |
| bun.Spawn.WritableIO | TypeAliasDeclaration | bun.d.ts:8149 | WritableIO |
| bun.Spawn.WritableToIO | TypeAliasDeclaration | bun.d.ts:8151 | WritableToIO&lt;X&gt; |
| bun.Spawn.WritableToIO.X | TypeParameter | bun.d.ts:8151 | X |
| bun.ResourceUsage | InterfaceDeclaration | bun.d.ts:8158 | ResourceUsage |
| bun.ResourceUsage.contextSwitches | PropertySignature | bun.d.ts:8162 | { voluntary: number; involuntary: number; } |
| bun.ResourceUsage.contextSwitches.[TypeLiteral] | TypeLiteral | bun.d.ts:8162 | { voluntary: number; involuntary: number; } |
| bun.ResourceUsage.contextSwitches.voluntary | PropertySignature | bun.d.ts:8166 | number |
| bun.ResourceUsage.contextSwitches.involuntary | PropertySignature | bun.d.ts:8170 | number |
| bun.ResourceUsage.cpuTime | PropertySignature | bun.d.ts:8176 | { user: bigint; system: bigint; total: bigint; } |
| bun.ResourceUsage.cpuTime.[TypeLiteral] | TypeLiteral | bun.d.ts:8176 | { user: bigint; system: bigint; total: bigint; } |
| bun.ResourceUsage.cpuTime.user | PropertySignature | bun.d.ts:8180 | bigint |
| bun.ResourceUsage.cpuTime.system | PropertySignature | bun.d.ts:8184 | bigint |
| bun.ResourceUsage.cpuTime.total | PropertySignature | bun.d.ts:8188 | bigint |
| bun.ResourceUsage.maxRSS | PropertySignature | bun.d.ts:8193 | number |
| bun.ResourceUsage.messages | PropertySignature | bun.d.ts:8198 | { sent: number; received: number; } |
| bun.ResourceUsage.messages.[TypeLiteral] | TypeLiteral | bun.d.ts:8198 | { sent: number; received: number; } |
| bun.ResourceUsage.messages.sent | PropertySignature | bun.d.ts:8202 | number |
| bun.ResourceUsage.messages.received | PropertySignature | bun.d.ts:8206 | number |
| bun.ResourceUsage.ops | PropertySignature | bun.d.ts:8211 | { in: number; out: number; } |
| bun.ResourceUsage.ops.[TypeLiteral] | TypeLiteral | bun.d.ts:8211 | { in: number; out: number; } |
| bun.ResourceUsage.ops.in | PropertySignature | bun.d.ts:8215 | number |
| bun.ResourceUsage.ops.out | PropertySignature | bun.d.ts:8219 | number |
| bun.ResourceUsage.shmSize | PropertySignature | bun.d.ts:8224 | number |
| bun.ResourceUsage.signalCount | PropertySignature | bun.d.ts:8228 | number |
| bun.ResourceUsage.swapCount | PropertySignature | bun.d.ts:8232 | number |
| bun.Subprocess | InterfaceDeclaration | bun.d.ts:8244 | Subprocess&lt;In, Out, Err&gt; |
| bun.Subprocess.In | TypeParameter | bun.d.ts:8245 | In |
| bun.Subprocess.Out | TypeParameter | bun.d.ts:8246 | Out |
| bun.Subprocess.Err | TypeParameter | bun.d.ts:8247 | Err |
| bun.Subprocess.stdin | PropertySignature | bun.d.ts:8249 | WritableToIO&lt;In&gt; |
| bun.Subprocess.stdout | PropertySignature | bun.d.ts:8250 | ReadableToIO&lt;Out&gt; |
| bun.Subprocess.stderr | PropertySignature | bun.d.ts:8251 | ReadableToIO&lt;Err&gt; |
| bun.Subprocess.terminal | PropertySignature | bun.d.ts:8269 | Terminal &#124; undefined |
| bun.Subprocess.stdio | PropertySignature | bun.d.ts:8281 | [null, null, null, ...(number &#124; null)[]] |
| bun.Subprocess.readable | PropertySignature | bun.d.ts:8288 | ReadableToIO&lt;Out&gt; |
| bun.Subprocess.pid | PropertySignature | bun.d.ts:8298 | number |
| bun.Subprocess.exited | PropertySignature | bun.d.ts:8305 | Promise&lt;number&gt; |
| bun.Subprocess.exitCode | PropertySignature | bun.d.ts:8312 | number &#124; null |
| bun.Subprocess.signalCode | PropertySignature | bun.d.ts:8324 | number &#124; Signals &#124; null |
| bun.Subprocess.killed | PropertySignature | bun.d.ts:8329 | boolean |
| bun.Subprocess.kill | MethodSignature | bun.d.ts:8335 | (exitCode?: number &#124; Signals &#124; undefined) =&gt; void |
| bun.Subprocess.ref | MethodSignature | bun.d.ts:8343 | () =&gt; void |
| bun.Subprocess.unref | MethodSignature | bun.d.ts:8350 | () =&gt; void |
| bun.Subprocess.send | MethodSignature | bun.d.ts:8358 | (message: any) =&gt; void |
| bun.Subprocess.disconnect | MethodSignature | bun.d.ts:8364 | () =&gt; void |
| bun.Subprocess.resourceUsage | MethodSignature | bun.d.ts:8371 | () =&gt; ResourceUsage &#124; undefined |
| bun.SyncSubprocess | InterfaceDeclaration | bun.d.ts:8381 | SyncSubprocess&lt;Out, Err&gt; |
| bun.SyncSubprocess.Out | TypeParameter | bun.d.ts:8382 | Out |
| bun.SyncSubprocess.Err | TypeParameter | bun.d.ts:8383 | Err |
| bun.SyncSubprocess.stdout | PropertySignature | bun.d.ts:8385 | ReadableToSyncIO&lt;Out&gt; |
| bun.SyncSubprocess.stderr | PropertySignature | bun.d.ts:8386 | ReadableToSyncIO&lt;Err&gt; |
| bun.SyncSubprocess.exitCode | PropertySignature | bun.d.ts:8387 | number |
| bun.SyncSubprocess.success | PropertySignature | bun.d.ts:8388 | boolean |
| bun.SyncSubprocess.resourceUsage | PropertySignature | bun.d.ts:8392 | ResourceUsage |
| bun.SyncSubprocess.signalCode | PropertySignature | bun.d.ts:8394 | number &#124; Signals &#124; undefined |
| bun.SyncSubprocess.exitedDueToTimeout | PropertySignature | bun.d.ts:8395 | boolean &#124; undefined |
| bun.SyncSubprocess.exitedDueToMaxBuffer | PropertySignature | bun.d.ts:8396 | boolean &#124; undefined |
| bun.SyncSubprocess.pid | PropertySignature | bun.d.ts:8397 | number |
| bun.spawn | FunctionDeclaration | bun.d.ts:8416 | { &lt;const In extends SpawnOptions.Writable = "ignore", const Out extends SpawnOptions.Readable = "pipe", const Err extends SpawnOptions.Readable = "inherit"&gt;(options: SpawnOptions&lt;In, Out, Err&gt; &amp; { cmd: string[]; }): Subprocess&lt;...&gt;; &lt;const In extends SpawnOptions.Writable = "ignore", const Out extends SpawnOptions.R... |
| bun.spawn.In | TypeParameter | bun.d.ts:8417 | In |
| bun.spawn.Out | TypeParameter | bun.d.ts:8418 | Out |
| bun.spawn.Err | TypeParameter | bun.d.ts:8419 | Err |
| bun.spawn.[TypeLiteral] | TypeLiteral | bun.d.ts:8421 | { cmd: string[]; } |
| bun.spawn.cmd | PropertySignature | bun.d.ts:8436 | string[] |
| bun.spawn | FunctionDeclaration | bun.d.ts:8451 | { &lt;const In extends SpawnOptions.Writable = "ignore", const Out extends SpawnOptions.Readable = "pipe", const Err extends SpawnOptions.Readable = "inherit"&gt;(options: SpawnOptions&lt;In, Out, Err&gt; &amp; { cmd: string[]; }): Subprocess&lt;...&gt;; &lt;const In extends SpawnOptions.Writable = "ignore", const Out extends SpawnOptions.R... |
| bun.spawn.In | TypeParameter | bun.d.ts:8452 | In |
| bun.spawn.Out | TypeParameter | bun.d.ts:8453 | Out |
| bun.spawn.Err | TypeParameter | bun.d.ts:8454 | Err |
| bun.spawnSync | FunctionDeclaration | bun.d.ts:8488 | { &lt;const In extends SpawnOptions.Writable = "ignore", const Out extends SpawnOptions.Readable = "pipe", const Err extends SpawnOptions.Readable = "pipe"&gt;(options: SpawnSyncOptions&lt;In, Out, Err&gt; &amp; { cmd: string[]; onExit?: undefined; }): SyncSubprocess&lt;...&gt;; &lt;const In extends SpawnOptions.Writable = "ignore", const O... |
| bun.spawnSync.In | TypeParameter | bun.d.ts:8489 | In |
| bun.spawnSync.Out | TypeParameter | bun.d.ts:8490 | Out |
| bun.spawnSync.Err | TypeParameter | bun.d.ts:8491 | Err |
| bun.spawnSync.[TypeLiteral] | TypeLiteral | bun.d.ts:8493 | { cmd: string[]; onExit?: undefined; } |
| bun.spawnSync.cmd | PropertySignature | bun.d.ts:8508 | string[] |
| bun.spawnSync.onExit | PropertySignature | bun.d.ts:8510 | undefined |
| bun.spawnSync | FunctionDeclaration | bun.d.ts:8524 | { &lt;const In extends SpawnOptions.Writable = "ignore", const Out extends SpawnOptions.Readable = "pipe", const Err extends SpawnOptions.Readable = "pipe"&gt;(options: SpawnSyncOptions&lt;In, Out, Err&gt; &amp; { cmd: string[]; onExit?: undefined; }): SyncSubprocess&lt;...&gt;; &lt;const In extends SpawnOptions.Writable = "ignore", const O... |
| bun.spawnSync.In | TypeParameter | bun.d.ts:8525 | In |
| bun.spawnSync.Out | TypeParameter | bun.d.ts:8526 | Out |
| bun.spawnSync.Err | TypeParameter | bun.d.ts:8527 | Err |
| bun.CronController | InterfaceDeclaration | bun.d.ts:8552 | CronController |
| bun.CronController.type | PropertySignature | bun.d.ts:8554 | "scheduled" |
| bun.CronController.cron | PropertySignature | bun.d.ts:8556 | string |
| bun.CronController.scheduledTime | PropertySignature | bun.d.ts:8558 | number |
| bun.CronWithAutocomplete | TypeAliasDeclaration | bun.d.ts:8571 | CronWithAutocomplete |
| bun.CronWithAutocomplete.[TypeLiteral] | TypeLiteral | bun.d.ts:8586 | {} |
| bun.CronJob | InterfaceDeclaration | bun.d.ts:8600 | CronJob |
| bun.CronJob.cron | PropertySignature | bun.d.ts:8602 | string |
| bun.CronJob.stop | MethodSignature | bun.d.ts:8604 | () =&gt; CronJob |
| bun.CronJob.ref | MethodSignature | bun.d.ts:8606 | () =&gt; CronJob |
| bun.CronJob.unref | MethodSignature | bun.d.ts:8608 | () =&gt; CronJob |
| bun.CronOptions | InterfaceDeclaration | bun.d.ts:8614 | CronOptions |
| bun.CronOptions.tz | PropertySignature | bun.d.ts:8619 | string &#124; undefined |
| bun.cron | VariableDeclaration | bun.d.ts:8629 | { (schedule: CronWithAutocomplete, handler: (this: CronJob) =&gt; unknown, options?: CronOptions &#124; undefined): CronJob; (path: string, schedule: CronWithAutocomplete, title: string): Promise&lt;...&gt;; remove(title: string): Promise&lt;...&gt;; parse(expression: CronWithAutocomplete, relativeDate?: number &#124; ... 1 more ... &#124; undef... |
| bun.[TypeLiteral] | TypeLiteral | bun.d.ts:8629 | { (schedule: CronWithAutocomplete, handler: (this: CronJob) =&gt; unknown, options?: CronOptions &#124; undefined): CronJob; (path: string, schedule: CronWithAutocomplete, title: string): Promise&lt;...&gt;; remove(title: string): Promise&lt;...&gt;; parse(expression: CronWithAutocomplete, relativeDate?: number &#124; ... 1 more ... &#124; undef... |
| bun.[call] | CallSignature | bun.d.ts:8717 | any |
| bun.[FunctionType] | FunctionType | bun.d.ts:8717 | (this: CronJob) =&gt; unknown |
| bun.[call] | CallSignature | bun.d.ts:8803 | any |
| bun.remove | MethodSignature | bun.d.ts:8815 | (title: string) =&gt; Promise&lt;void&gt; |
| bun.parse | MethodSignature | bun.d.ts:8853 | (expression: CronWithAutocomplete, relativeDate?: number &#124; Date &#124; undefined, options?: CronOptions &#124; undefined) =&gt; Date &#124; null |
| bun.ReadableSubprocess | TypeAliasDeclaration | bun.d.ts:8857 | ReadableSubprocess |
| bun.WritableSubprocess | TypeAliasDeclaration | bun.d.ts:8859 | WritableSubprocess |
| bun.PipedSubprocess | TypeAliasDeclaration | bun.d.ts:8861 | PipedSubprocess |
| bun.NullSubprocess | TypeAliasDeclaration | bun.d.ts:8863 | NullSubprocess |
| bun.ReadableSyncSubprocess | TypeAliasDeclaration | bun.d.ts:8869 | ReadableSyncSubprocess |
| bun.NullSyncSubprocess | TypeAliasDeclaration | bun.d.ts:8871 | NullSyncSubprocess |
| bun.TerminalOptions | InterfaceDeclaration | bun.d.ts:8879 | TerminalOptions |
| bun.TerminalOptions.cols | PropertySignature | bun.d.ts:8884 | number &#124; undefined |
| bun.TerminalOptions.rows | PropertySignature | bun.d.ts:8889 | number &#124; undefined |
| bun.TerminalOptions.name | PropertySignature | bun.d.ts:8894 | string &#124; undefined |
| bun.TerminalOptions.data | PropertySignature | bun.d.ts:8900 | ((terminal: Terminal, data: Uint8Array&lt;ArrayBuffer&gt;) =&gt; void) &#124; undefined |
| bun.TerminalOptions.data.[FunctionType] | FunctionType | bun.d.ts:8900 | (terminal: Terminal, data: Uint8Array&lt;ArrayBuffer&gt;) =&gt; void |
| bun.TerminalOptions.exit | PropertySignature | bun.d.ts:8909 | ((terminal: Terminal, exitCode: number, signal: string &#124; null) =&gt; void) &#124; undefined |
| bun.TerminalOptions.exit.[FunctionType] | FunctionType | bun.d.ts:8909 | (terminal: Terminal, exitCode: number, signal: string &#124; null) =&gt; void |
| bun.TerminalOptions.drain | PropertySignature | bun.d.ts:8914 | ((terminal: Terminal) =&gt; void) &#124; undefined |
| bun.TerminalOptions.drain.[FunctionType] | FunctionType | bun.d.ts:8914 | (terminal: Terminal) =&gt; void |
| bun.Terminal | ClassDeclaration | bun.d.ts:8942 | Terminal |
| bun.Terminal.constructor | Constructor | bun.d.ts:8943 | any |
| bun.Terminal.closed | PropertyDeclaration | bun.d.ts:8948 | boolean |
| bun.Terminal.write | MethodDeclaration | bun.d.ts:8961 | (data: string &#124; BufferSource) =&gt; number |
| bun.Terminal.resize | MethodDeclaration | bun.d.ts:8968 | (cols: number, rows: number) =&gt; void |
| bun.Terminal.setRawMode | MethodDeclaration | bun.d.ts:8975 | (enabled: boolean) =&gt; void |
| bun.Terminal.ref | MethodDeclaration | bun.d.ts:8980 | () =&gt; void |
| bun.Terminal.unref | MethodDeclaration | bun.d.ts:8985 | () =&gt; void |
| bun.Terminal.close | MethodDeclaration | bun.d.ts:8990 | () =&gt; void |
| bun.Terminal./**      * Async dispose for use with `await using`.      */     [Symbol.asyncDispose] | MethodDeclaration | bun.d.ts:8995 | () =&gt; Promise&lt;void&gt; |
| bun.Terminal.inputFlags | PropertyDeclaration | bun.d.ts:9003 | number |
| bun.Terminal.outputFlags | PropertyDeclaration | bun.d.ts:9011 | number |
| bun.Terminal.localFlags | PropertyDeclaration | bun.d.ts:9019 | number |
| bun.Terminal.controlFlags | PropertyDeclaration | bun.d.ts:9027 | number |
| bun.FetchProxyOption | TypeAliasDeclaration | bun.d.ts:9062 | FetchProxyOption |
| bun.FetchProxyOption.[TypeLiteral] | TypeLiteral | bun.d.ts:9066 | { url: string &#124; URL; headers?: HeadersInit &#124; undefined; respectNoProxy?: boolean &#124; undefined; } |
| bun.FetchProxyOption.url | PropertySignature | bun.d.ts:9070 | string &#124; URL |
| bun.FetchProxyOption.headers | PropertySignature | bun.d.ts:9076 | HeadersInit &#124; undefined |
| bun.FetchProxyOption.respectNoProxy | PropertySignature | bun.d.ts:9083 | boolean &#124; undefined |
| bun.FetchSessionInit | InterfaceDeclaration | bun.d.ts:9086 | FetchSessionInit |
| bun.FetchSessionInit.tls | PropertySignature | bun.d.ts:9094 | BunFetchRequestInitTLS &#124; undefined |
| bun.FetchSessionInit.proxy | PropertySignature | bun.d.ts:9102 | FetchProxyOption &#124; undefined |
| bun.FetchSessionInit.keepAlive | PropertySignature | bun.d.ts:9109 | boolean &#124; { idleTimeout?: number &#124; undefined; maxIdleSockets?: number &#124; undefined; } &#124; undefined |
| bun.FetchSessionInit.keepAlive.[TypeLiteral] | TypeLiteral | bun.d.ts:9111 | { idleTimeout?: number &#124; undefined; maxIdleSockets?: number &#124; undefined; } |
| bun.FetchSessionInit.keepAlive.idleTimeout | PropertySignature | bun.d.ts:9122 | number &#124; undefined |
| bun.FetchSessionInit.keepAlive.maxIdleSockets | PropertySignature | bun.d.ts:9133 | number &#124; undefined |
| bun.FetchSessionInit.unix | PropertySignature | bun.d.ts:9139 | string &#124; undefined |
| bun.FetchSession | ClassDeclaration | bun.d.ts:9159 | FetchSession |
| bun.FetchSession.constructor | Constructor | bun.d.ts:9160 | any |
| bun.FetchSession.fetch | PropertyDeclaration | bun.d.ts:9174 | (input: string &#124; Request &#124; URL, init?: BunFetchRequestInit &#124; undefined) =&gt; Promise&lt;Response&gt; |
| bun.FetchSession.fetch.[FunctionType] | FunctionType | bun.d.ts:9174 | (input: string &#124; Request &#124; URL, init?: BunFetchRequestInit &#124; undefined) =&gt; Promise&lt;Response&gt; |
| bun.FetchSession.close | MethodDeclaration | bun.d.ts:9179 | () =&gt; void |
| bun.FetchSession.[Symbol.dispose] | MethodDeclaration | bun.d.ts:9180 | () =&gt; void |
| bun.FileSystemRouterOptions | InterfaceDeclaration | bun.d.ts:9184 | FileSystemRouterOptions |
| bun.FileSystemRouterOptions.dir | PropertySignature | bun.d.ts:9188 | string |
| bun.FileSystemRouterOptions.style | PropertySignature | bun.d.ts:9189 | "nextjs" |
| bun.FileSystemRouterOptions.assetPrefix | PropertySignature | bun.d.ts:9192 | string &#124; undefined |
| bun.FileSystemRouterOptions.origin | PropertySignature | bun.d.ts:9193 | string &#124; undefined |
| bun.FileSystemRouterOptions.fileExtensions | PropertySignature | bun.d.ts:9195 | string[] &#124; undefined |
| bun.FileSystemRouter | ClassDeclaration | bun.d.ts:9202 | FileSystemRouter |
| bun.FileSystemRouter.constructor | Constructor | bun.d.ts:9220 | any |
| bun.FileSystemRouter.match | MethodDeclaration | bun.d.ts:9223 | (input: string &#124; Request &#124; Response) =&gt; MatchedRoute &#124; null |
| bun.FileSystemRouter.assetPrefix | PropertyDeclaration | bun.d.ts:9226 | string &#124; null |
| bun.FileSystemRouter.origin | PropertyDeclaration | bun.d.ts:9228 | string &#124; null |
| bun.FileSystemRouter.style | PropertyDeclaration | bun.d.ts:9229 | "nextjs" |
| bun.FileSystemRouter.routes | PropertyDeclaration | bun.d.ts:9230 | Record&lt;string, string&gt; |
| bun.FileSystemRouter.reload | MethodDeclaration | bun.d.ts:9232 | () =&gt; this |
| bun.MatchedRoute | InterfaceDeclaration | bun.d.ts:9235 | MatchedRoute |
| bun.MatchedRoute.params | PropertySignature | bun.d.ts:9252 | Record&lt;string, string&gt; |
| bun.MatchedRoute.filePath | PropertySignature | bun.d.ts:9253 | string |
| bun.MatchedRoute.pathname | PropertySignature | bun.d.ts:9254 | string |
| bun.MatchedRoute.query | PropertySignature | bun.d.ts:9255 | Record&lt;string, string&gt; |
| bun.MatchedRoute.name | PropertySignature | bun.d.ts:9256 | string |
| bun.MatchedRoute.kind | PropertySignature | bun.d.ts:9257 | "catch-all" &#124; "dynamic" &#124; "exact" &#124; "optional-catch-all" |
| bun.MatchedRoute.src | PropertySignature | bun.d.ts:9258 | string |
| bun.MatchedRoute.scriptSrc | PropertySignature | bun.d.ts:9260 | string |
| bun.version | VariableDeclaration | bun.d.ts:9268 | string |
| bun.version_with_sha | VariableDeclaration | bun.d.ts:9274 | string |
| bun.revision | VariableDeclaration | bun.d.ts:9281 | string |
| bun.indexOfLine | FunctionDeclaration | bun.d.ts:9288 | (buffer: ArrayBufferLike &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, offset?: number &#124; bigint &#124; undefined) =&gt; number |
| bun.GlobScanOptions | InterfaceDeclaration | bun.d.ts:9290 | GlobScanOptions |
| bun.GlobScanOptions.cwd | PropertySignature | bun.d.ts:9294 | string &#124; undefined |
| bun.GlobScanOptions.dot | PropertySignature | bun.d.ts:9301 | boolean &#124; undefined |
| bun.GlobScanOptions.absolute | PropertySignature | bun.d.ts:9308 | boolean &#124; undefined |
| bun.GlobScanOptions.followSymlinks | PropertySignature | bun.d.ts:9315 | boolean &#124; undefined |
| bun.GlobScanOptions.throwErrorOnBrokenSymlink | PropertySignature | bun.d.ts:9322 | boolean &#124; undefined |
| bun.GlobScanOptions.onlyFiles | PropertySignature | bun.d.ts:9329 | boolean &#124; undefined |
| bun.Glob | ClassDeclaration | bun.d.ts:9370 | Glob |
| bun.Glob.constructor | Constructor | bun.d.ts:9371 | any |
| bun.Glob.scan | MethodDeclaration | bun.d.ts:9392 | (optionsOrCwd?: string &#124; GlobScanOptions &#124; undefined) =&gt; AsyncIterableIterator&lt;string&gt; |
| bun.Glob.scanSync | MethodDeclaration | bun.d.ts:9413 | (optionsOrCwd?: string &#124; GlobScanOptions &#124; undefined) =&gt; IterableIterator&lt;string&gt; |
| bun.Glob.match | MethodDeclaration | bun.d.ts:9424 | (str: string) =&gt; boolean |
| bun.Image | ModuleDeclaration | bun.d.ts:9427 | typeof Image |
| bun.Image.ErrorCode | TypeAliasDeclaration | bun.d.ts:9447 | ErrorCode |
| bun.Image.Format | TypeAliasDeclaration | bun.d.ts:9461 | Format |
| bun.Image.Filter | TypeAliasDeclaration | bun.d.ts:9462 | Filter |
| bun.Image.ConstructorOptions | InterfaceDeclaration | bun.d.ts:9474 | ConstructorOptions |
| bun.Image.ConstructorOptions.maxPixels | PropertySignature | bun.d.ts:9483 | number &#124; undefined |
| bun.Image.ConstructorOptions.autoOrient | PropertySignature | bun.d.ts:9488 | boolean &#124; undefined |
| bun.Image.ResizeOptions | InterfaceDeclaration | bun.d.ts:9491 | ResizeOptions |
| bun.Image.ResizeOptions.filter | PropertySignature | bun.d.ts:9493 | Filter &#124; undefined |
| bun.Image.ResizeOptions.fit | PropertySignature | bun.d.ts:9499 | "fill" &#124; "inside" &#124; undefined |
| bun.Image.ResizeOptions.withoutEnlargement | PropertySignature | bun.d.ts:9501 | boolean &#124; undefined |
| bun.Image.ModulateOptions | InterfaceDeclaration | bun.d.ts:9504 | ModulateOptions |
| bun.Image.ModulateOptions.brightness | PropertySignature | bun.d.ts:9506 | number &#124; undefined |
| bun.Image.ModulateOptions.saturation | PropertySignature | bun.d.ts:9508 | number &#124; undefined |
| bun.Image.Metadata | InterfaceDeclaration | bun.d.ts:9511 | Metadata |
| bun.Image.Metadata.width | PropertySignature | bun.d.ts:9512 | number |
| bun.Image.Metadata.height | PropertySignature | bun.d.ts:9513 | number |
| bun.Image.Metadata.format | PropertySignature | bun.d.ts:9514 | Format |
| bun.Image | ClassDeclaration | bun.d.ts:9543 | Image |
| bun.Image.backend | PropertyDeclaration | bun.d.ts:9556 | "bun" &#124; "system" |
| bun.Image.fromClipboard | MethodDeclaration | bun.d.ts:9570 | () =&gt; Image &#124; null |
| bun.Image.hasClipboardImage | MethodDeclaration | bun.d.ts:9572 | () =&gt; boolean |
| bun.Image.clipboardChangeCount | MethodDeclaration | bun.d.ts:9578 | () =&gt; number |
| bun.Image.constructor | Constructor | bun.d.ts:9580 | any |
| bun.Image.resize | MethodDeclaration | bun.d.ts:9583 | (width: number, height?: number &#124; undefined, options?: ResizeOptions &#124; undefined) =&gt; this |
| bun.Image.rotate | MethodDeclaration | bun.d.ts:9585 | (degrees: number) =&gt; this |
| bun.Image.flip | MethodDeclaration | bun.d.ts:9587 | () =&gt; this |
| bun.Image.flop | MethodDeclaration | bun.d.ts:9589 | () =&gt; this |
| bun.Image.modulate | MethodDeclaration | bun.d.ts:9591 | (options: ModulateOptions) =&gt; this |
| bun.Image.jpeg | MethodDeclaration | bun.d.ts:9594 | (options?: { quality?: number &#124; undefined; progressive?: boolean &#124; undefined; } &#124; undefined) =&gt; this |
| bun.Image.jpeg.[TypeLiteral] | TypeLiteral | bun.d.ts:9594 | { quality?: number &#124; undefined; progressive?: boolean &#124; undefined; } |
| bun.Image.jpeg.quality | PropertySignature | bun.d.ts:9596 | number &#124; undefined |
| bun.Image.jpeg.progressive | PropertySignature | bun.d.ts:9598 | boolean &#124; undefined |
| bun.Image.png | MethodDeclaration | bun.d.ts:9601 | (options?: { compressionLevel?: number &#124; undefined; palette?: boolean &#124; undefined; colors?: number &#124; undefined; dither?: boolean &#124; undefined; } &#124; undefined) =&gt; this |
| bun.Image.png.[TypeLiteral] | TypeLiteral | bun.d.ts:9601 | { compressionLevel?: number &#124; undefined; palette?: boolean &#124; undefined; colors?: number &#124; undefined; dither?: boolean &#124; undefined; } |
| bun.Image.png.compressionLevel | PropertySignature | bun.d.ts:9603 | number &#124; undefined |
| bun.Image.png.palette | PropertySignature | bun.d.ts:9605 | boolean &#124; undefined |
| bun.Image.png.colors | PropertySignature | bun.d.ts:9607 | number &#124; undefined |
| bun.Image.png.dither | PropertySignature | bun.d.ts:9609 | boolean &#124; undefined |
| bun.Image.webp | MethodDeclaration | bun.d.ts:9612 | (options?: { quality?: number &#124; undefined; lossless?: boolean &#124; undefined; } &#124; undefined) =&gt; this |
| bun.Image.webp.[TypeLiteral] | TypeLiteral | bun.d.ts:9612 | { quality?: number &#124; undefined; lossless?: boolean &#124; undefined; } |
| bun.Image.webp.quality | PropertySignature | bun.d.ts:9612 | number &#124; undefined |
| bun.Image.webp.lossless | PropertySignature | bun.d.ts:9612 | boolean &#124; undefined |
| bun.Image.heic | MethodDeclaration | bun.d.ts:9618 | (options?: { quality?: number &#124; undefined; } &#124; undefined) =&gt; this |
| bun.Image.heic.[TypeLiteral] | TypeLiteral | bun.d.ts:9618 | { quality?: number &#124; undefined; } |
| bun.Image.heic.quality | PropertySignature | bun.d.ts:9618 | number &#124; undefined |
| bun.Image.avif | MethodDeclaration | bun.d.ts:9624 | (options?: { quality?: number &#124; undefined; } &#124; undefined) =&gt; this |
| bun.Image.avif.[TypeLiteral] | TypeLiteral | bun.d.ts:9624 | { quality?: number &#124; undefined; } |
| bun.Image.avif.quality | PropertySignature | bun.d.ts:9624 | number &#124; undefined |
| bun.Image.bytes | MethodDeclaration | bun.d.ts:9630 | () =&gt; Promise&lt;Uint8Array&lt;ArrayBufferLike&gt;&gt; |
| bun.Image.buffer | MethodDeclaration | bun.d.ts:9632 | () =&gt; Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt; |
| bun.Image.toBuffer | MethodDeclaration | bun.d.ts:9634 | () =&gt; Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt; |
| bun.Image.write | MethodDeclaration | bun.d.ts:9645 | (dest: number &#124; BunFile &#124; S3File &#124; PathLike) =&gt; Promise&lt;number&gt; |
| bun.Image.dataurl | MethodDeclaration | bun.d.ts:9650 | () =&gt; Promise&lt;string&gt; |
| bun.Image.placeholder | MethodDeclaration | bun.d.ts:9663 | (as?: "dataurl" &#124; undefined) =&gt; Promise&lt;string&gt; |
| bun.Image.blob | MethodDeclaration | bun.d.ts:9665 | () =&gt; Promise&lt;Blob&gt; |
| bun.Image.toBase64 | MethodDeclaration | bun.d.ts:9667 | () =&gt; Promise&lt;string&gt; |
| bun.Image.metadata | MethodDeclaration | bun.d.ts:9669 | () =&gt; Promise&lt;Metadata&gt; |
| bun.Image.width | PropertyDeclaration | bun.d.ts:9672 | number |
| bun.Image.height | PropertyDeclaration | bun.d.ts:9674 | number |
| bun.WebView | ModuleDeclaration | bun.d.ts:9677 | typeof WebView |
| bun.WebView.Modifier | TypeAliasDeclaration | bun.d.ts:9678 | Modifier |
| bun.WebView.VirtualKey | TypeAliasDeclaration | bun.d.ts:9680 | VirtualKey |
| bun.WebView.ClickOptions | InterfaceDeclaration | bun.d.ts:9696 | ClickOptions |
| bun.WebView.ClickOptions.button | PropertySignature | bun.d.ts:9698 | "left" &#124; "middle" &#124; "right" &#124; undefined |
| bun.WebView.ClickOptions.modifiers | PropertySignature | bun.d.ts:9700 | Modifier[] &#124; undefined |
| bun.WebView.ClickOptions.clickCount | PropertySignature | bun.d.ts:9702 | 1 &#124; 2 &#124; 3 &#124; undefined |
| bun.WebView.ClickSelectorOptions | InterfaceDeclaration | bun.d.ts:9705 | ClickSelectorOptions |
| bun.WebView.ClickSelectorOptions.timeout | PropertySignature | bun.d.ts:9711 | number &#124; undefined |
| bun.WebView.ScrollToOptions | InterfaceDeclaration | bun.d.ts:9714 | ScrollToOptions |
| bun.WebView.ScrollToOptions.timeout | PropertySignature | bun.d.ts:9719 | number &#124; undefined |
| bun.WebView.ScrollToOptions.block | PropertySignature | bun.d.ts:9726 | "center" &#124; "end" &#124; "nearest" &#124; "start" &#124; undefined |
| bun.WebView.PressOptions | InterfaceDeclaration | bun.d.ts:9729 | PressOptions |
| bun.WebView.PressOptions.modifiers | PropertySignature | bun.d.ts:9731 | Modifier[] &#124; undefined |
| bun.WebView.Backend | TypeAliasDeclaration | bun.d.ts:9754 | Backend |
| bun.WebView.Backend.[TypeLiteral] | TypeLiteral | bun.d.ts:9757 | { type: "chrome"; url: string; } |
| bun.WebView.Backend.type | PropertySignature | bun.d.ts:9758 | "chrome" |
| bun.WebView.Backend.url | PropertySignature | bun.d.ts:9776 | string |
| bun.WebView.Backend.[TypeLiteral] | TypeLiteral | bun.d.ts:9778 | { type: "chrome"; url?: false &#124; undefined; path?: string &#124; undefined; argv?: string[] &#124; undefined; stdout?: "ignore" &#124; "inherit" &#124; undefined; stderr?: "ignore" &#124; "inherit" &#124; undefined; } |
| bun.WebView.Backend.type | PropertySignature | bun.d.ts:9779 | "chrome" |
| bun.WebView.Backend.url | PropertySignature | bun.d.ts:9794 | false &#124; undefined |
| bun.WebView.Backend.path | PropertySignature | bun.d.ts:9806 | string &#124; undefined |
| bun.WebView.Backend.argv | PropertySignature | bun.d.ts:9812 | string[] &#124; undefined |
| bun.WebView.Backend.stdout | PropertySignature | bun.d.ts:9817 | "ignore" &#124; "inherit" &#124; undefined |
| bun.WebView.Backend.stderr | PropertySignature | bun.d.ts:9824 | "ignore" &#124; "inherit" &#124; undefined |
| bun.WebView.Backend.[TypeLiteral] | TypeLiteral | bun.d.ts:9826 | { type: "webkit"; stdout?: "ignore" &#124; "inherit" &#124; undefined; stderr?: "ignore" &#124; "inherit" &#124; undefined; } |
| bun.WebView.Backend.type | PropertySignature | bun.d.ts:9827 | "webkit" |
| bun.WebView.Backend.stdout | PropertySignature | bun.d.ts:9832 | "ignore" &#124; "inherit" &#124; undefined |
| bun.WebView.Backend.stderr | PropertySignature | bun.d.ts:9836 | "ignore" &#124; "inherit" &#124; undefined |
| bun.WebView.ConsoleCapture | TypeAliasDeclaration | bun.d.ts:9854 | ConsoleCapture |
| bun.WebView.ConsoleCapture.[FunctionType] | FunctionType | bun.d.ts:9854 | (type: string, ...args: unknown[]) =&gt; void |
| bun.WebView.ConstructorOptions | InterfaceDeclaration | bun.d.ts:9856 | ConstructorOptions |
| bun.WebView.ConstructorOptions.width | PropertySignature | bun.d.ts:9858 | number &#124; undefined |
| bun.WebView.ConstructorOptions.height | PropertySignature | bun.d.ts:9860 | number &#124; undefined |
| bun.WebView.ConstructorOptions.headless | PropertySignature | bun.d.ts:9862 | boolean &#124; undefined |
| bun.WebView.ConstructorOptions.backend | PropertySignature | bun.d.ts:9868 | Backend &#124; undefined |
| bun.WebView.ConstructorOptions.url | PropertySignature | bun.d.ts:9878 | string &#124; undefined |
| bun.WebView.ConstructorOptions.console | PropertySignature | bun.d.ts:9880 | ConsoleCapture &#124; undefined |
| bun.WebView.ConstructorOptions.dataStore | PropertySignature | bun.d.ts:9892 | "ephemeral" &#124; { directory: string; } &#124; undefined |
| bun.WebView.ConstructorOptions.dataStore.[TypeLiteral] | TypeLiteral | bun.d.ts:9892 | { directory: string; } |
| bun.WebView.ConstructorOptions.dataStore.directory | PropertySignature | bun.d.ts:9892 | string |
| bun.WebView | ClassDeclaration | bun.d.ts:9925 | WebView |
| bun.WebView.constructor | Constructor | bun.d.ts:9930 | any |
| bun.WebView.closeAll | MethodDeclaration | bun.d.ts:9940 | () =&gt; void |
| bun.WebView.url | PropertyDeclaration | bun.d.ts:9943 | string |
| bun.WebView.title | PropertyDeclaration | bun.d.ts:9945 | string |
| bun.WebView.loading | PropertyDeclaration | bun.d.ts:9947 | boolean |
| bun.WebView.onNavigated | PropertyDeclaration | bun.d.ts:9953 | ((url: string, title: string) =&gt; void) &#124; null |
| bun.WebView.onNavigated.[FunctionType] | FunctionType | bun.d.ts:9953 | (url: string, title: string) =&gt; void |
| bun.WebView.onNavigationFailed | PropertyDeclaration | bun.d.ts:9958 | ((error: Error) =&gt; void) &#124; null |
| bun.WebView.onNavigationFailed.[FunctionType] | FunctionType | bun.d.ts:9958 | (error: Error) =&gt; void |
| bun.WebView.navigate | MethodDeclaration | bun.d.ts:9970 | (url: string) =&gt; Promise&lt;void&gt; |
| bun.WebView.evaluate | MethodDeclaration | bun.d.ts:9998 | &lt;T = unknown&gt;(script: string) =&gt; Promise&lt;T&gt; |
| bun.WebView.evaluate.T | TypeParameter | bun.d.ts:9998 | T |
| bun.WebView.screenshot | MethodDeclaration | bun.d.ts:10030 | { (options?: { encoding?: "blob" &#124; undefined; format?: "jpeg" &#124; "png" &#124; "webp" &#124; undefined; quality?: number &#124; undefined; } &#124; undefined): Promise&lt;Blob&gt;; (options: { encoding: "buffer"; format?: "jpeg" &#124; ... 2 more ... &#124; undefined; quality?: number &#124; undefined; }): Promise&lt;...&gt;; (options: { ...; }): Promise&lt;...&gt;; (op... |
| bun.WebView.screenshot.[TypeLiteral] | TypeLiteral | bun.d.ts:10030 | { encoding?: "blob" &#124; undefined; format?: "jpeg" &#124; "png" &#124; "webp" &#124; undefined; quality?: number &#124; undefined; } |
| bun.WebView.screenshot.encoding | PropertySignature | bun.d.ts:10030 | "blob" &#124; undefined |
| bun.WebView.screenshot.format | PropertySignature | bun.d.ts:10030 | "jpeg" &#124; "png" &#124; "webp" &#124; undefined |
| bun.WebView.screenshot.quality | PropertySignature | bun.d.ts:10030 | number &#124; undefined |
| bun.WebView.screenshot | MethodDeclaration | bun.d.ts:10031 | { (options?: { encoding?: "blob" &#124; undefined; format?: "jpeg" &#124; "png" &#124; "webp" &#124; undefined; quality?: number &#124; undefined; } &#124; undefined): Promise&lt;Blob&gt;; (options: { encoding: "buffer"; format?: "jpeg" &#124; ... 2 more ... &#124; undefined; quality?: number &#124; undefined; }): Promise&lt;...&gt;; (options: { ...; }): Promise&lt;...&gt;; (op... |
| bun.WebView.screenshot.[TypeLiteral] | TypeLiteral | bun.d.ts:10031 | { encoding: "buffer"; format?: "jpeg" &#124; "png" &#124; "webp" &#124; undefined; quality?: number &#124; undefined; } |
| bun.WebView.screenshot.encoding | PropertySignature | bun.d.ts:10031 | "buffer" |
| bun.WebView.screenshot.format | PropertySignature | bun.d.ts:10031 | "jpeg" &#124; "png" &#124; "webp" &#124; undefined |
| bun.WebView.screenshot.quality | PropertySignature | bun.d.ts:10031 | number &#124; undefined |
| bun.WebView.screenshot | MethodDeclaration | bun.d.ts:10032 | { (options?: { encoding?: "blob" &#124; undefined; format?: "jpeg" &#124; "png" &#124; "webp" &#124; undefined; quality?: number &#124; undefined; } &#124; undefined): Promise&lt;Blob&gt;; (options: { encoding: "buffer"; format?: "jpeg" &#124; ... 2 more ... &#124; undefined; quality?: number &#124; undefined; }): Promise&lt;...&gt;; (options: { ...; }): Promise&lt;...&gt;; (op... |
| bun.WebView.screenshot.[TypeLiteral] | TypeLiteral | bun.d.ts:10032 | { encoding: "base64"; format?: "jpeg" &#124; "png" &#124; "webp" &#124; undefined; quality?: number &#124; undefined; } |
| bun.WebView.screenshot.encoding | PropertySignature | bun.d.ts:10032 | "base64" |
| bun.WebView.screenshot.format | PropertySignature | bun.d.ts:10032 | "jpeg" &#124; "png" &#124; "webp" &#124; undefined |
| bun.WebView.screenshot.quality | PropertySignature | bun.d.ts:10032 | number &#124; undefined |
| bun.WebView.screenshot | MethodDeclaration | bun.d.ts:10033 | { (options?: { encoding?: "blob" &#124; undefined; format?: "jpeg" &#124; "png" &#124; "webp" &#124; undefined; quality?: number &#124; undefined; } &#124; undefined): Promise&lt;Blob&gt;; (options: { encoding: "buffer"; format?: "jpeg" &#124; ... 2 more ... &#124; undefined; quality?: number &#124; undefined; }): Promise&lt;...&gt;; (options: { ...; }): Promise&lt;...&gt;; (op... |
| bun.WebView.screenshot.[TypeLiteral] | TypeLiteral | bun.d.ts:10033 | { encoding: "shmem"; format?: "jpeg" &#124; "png" &#124; "webp" &#124; undefined; quality?: number &#124; undefined; } |
| bun.WebView.screenshot.encoding | PropertySignature | bun.d.ts:10033 | "shmem" |
| bun.WebView.screenshot.format | PropertySignature | bun.d.ts:10033 | "jpeg" &#124; "png" &#124; "webp" &#124; undefined |
| bun.WebView.screenshot.quality | PropertySignature | bun.d.ts:10033 | number &#124; undefined |
| bun.WebView.screenshot.[TypeLiteral] | TypeLiteral | bun.d.ts:10033 | { name: string; size: number; } |
| bun.WebView.screenshot.name | PropertySignature | bun.d.ts:10035 | string |
| bun.WebView.screenshot.size | PropertySignature | bun.d.ts:10037 | number |
| bun.WebView.cdp | MethodDeclaration | bun.d.ts:10070 | &lt;T = unknown&gt;(method: string, params?: Record&lt;string, unknown&gt; &#124; undefined) =&gt; Promise&lt;T&gt; |
| bun.WebView.cdp.T | TypeParameter | bun.d.ts:10070 | T |
| bun.WebView.addEventListener | MethodDeclaration | bun.d.ts:10095 | { &lt;T = unknown&gt;(type: `${string}.${string}`, listener: (event: { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; }) =&gt; void, options?: boolean &#124; ... 1 more ... &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, optio... |
| bun.WebView.addEventListener.T | TypeParameter | bun.d.ts:10095 | T |
| bun.WebView.addEventListener.[FunctionType] | FunctionType | bun.d.ts:10097 | (event: { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; }) =&gt; void |
| bun.WebView.addEventListener | MethodDeclaration | bun.d.ts:10100 | { &lt;T = unknown&gt;(type: `${string}.${string}`, listener: (event: { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; }) =&gt; void, options?: boolean &#124; ... 1 more ... &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, optio... |
| bun.WebView.click | MethodDeclaration | bun.d.ts:10114 | { (x: number, y: number, options?: ClickOptions &#124; undefined): Promise&lt;void&gt;; (selector: string, options?: ClickSelectorOptions &#124; undefined): Promise&lt;...&gt;; } |
| bun.WebView.click | MethodDeclaration | bun.d.ts:10130 | { (x: number, y: number, options?: ClickOptions &#124; undefined): Promise&lt;void&gt;; (selector: string, options?: ClickSelectorOptions &#124; undefined): Promise&lt;...&gt;; } |
| bun.WebView.type | MethodDeclaration | bun.d.ts:10140 | (text: string) =&gt; Promise&lt;void&gt; |
| bun.WebView.press | MethodDeclaration | bun.d.ts:10154 | (key: VirtualKey &#124; (string &amp; {}), options?: PressOptions &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.WebView.press.[TypeLiteral] | TypeLiteral | bun.d.ts:10154 | {} |
| bun.WebView.scroll | MethodDeclaration | bun.d.ts:10163 | (dx: number, dy: number) =&gt; Promise&lt;void&gt; |
| bun.WebView.scrollTo | MethodDeclaration | bun.d.ts:10180 | (selector: string, options?: ScrollToOptions &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.WebView.resize | MethodDeclaration | bun.d.ts:10185 | (width: number, height: number) =&gt; Promise&lt;void&gt; |
| bun.WebView.goBack | MethodDeclaration | bun.d.ts:10188 | () =&gt; Promise&lt;void&gt; |
| bun.WebView.goForward | MethodDeclaration | bun.d.ts:10190 | () =&gt; Promise&lt;void&gt; |
| bun.WebView.reload | MethodDeclaration | bun.d.ts:10192 | () =&gt; Promise&lt;void&gt; |
| bun.WebView.close | MethodDeclaration | bun.d.ts:10203 | () =&gt; void |
| bun.WebView./** Alias for {@link close}. Enables `using view = new Bun.WebView(...)`. */     [Symbol.dispose] | MethodDeclaration | bun.d.ts:10206 | () =&gt; void |
| bun.WebView./** Alias for {@link close}. Enables `await using view = new Bun.WebView(...)`. */     [Symbol.asyncDispose] | MethodDeclaration | bun.d.ts:10208 | () =&gt; void |
| bun.ArchiveInput | TypeAliasDeclaration | bun.d.ts:10217 | ArchiveInput |
| bun.ArchiveCompression | TypeAliasDeclaration | bun.d.ts:10223 | "gzip" |
| bun.ArchiveOptions | InterfaceDeclaration | bun.d.ts:10242 | ArchiveOptions |
| bun.ArchiveOptions.compress | PropertySignature | bun.d.ts:10248 | "gzip" &#124; undefined |
| bun.ArchiveOptions.level | PropertySignature | bun.d.ts:10257 | number &#124; undefined |
| bun.ArchiveExtractOptions | InterfaceDeclaration | bun.d.ts:10263 | ArchiveExtractOptions |
| bun.ArchiveExtractOptions.glob | PropertySignature | bun.d.ts:10293 | string &#124; readonly string[] &#124; undefined |
| bun.Archive | ClassDeclaration | bun.d.ts:10350 | Archive |
| bun.Archive.constructor | Constructor | bun.d.ts:10389 | any |
| bun.Archive.write | MethodDeclaration | bun.d.ts:10418 | (path: string, data: Archive &#124; ArchiveInput, options?: ArchiveOptions &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.Archive.extract | MethodDeclaration | bun.d.ts:10459 | (path: string, options?: ArchiveExtractOptions &#124; undefined) =&gt; Promise&lt;number&gt; |
| bun.Archive.blob | MethodDeclaration | bun.d.ts:10482 | () =&gt; Promise&lt;Blob&gt; |
| bun.Archive.bytes | MethodDeclaration | bun.d.ts:10505 | () =&gt; Promise&lt;Uint8Array&lt;ArrayBuffer&gt;&gt; |
| bun.Archive.files | MethodDeclaration | bun.d.ts:10556 | (glob?: string &#124; readonly string[] &#124; undefined) =&gt; Promise&lt;Map&lt;string, File&gt;&gt; |
| bun.randomUUIDv7 | FunctionDeclaration | bun.d.ts:10585 | { (encoding?: "base64" &#124; "base64url" &#124; "hex" &#124; undefined, timestamp?: number &#124; Date &#124; undefined): string; (encoding: "buffer", timestamp?: number &#124; Date &#124; undefined): Buffer&lt;...&gt;; } |
| bun.randomUUIDv7 | FunctionDeclaration | bun.d.ts:10602 | { (encoding?: "base64" &#124; "base64url" &#124; "hex" &#124; undefined, timestamp?: number &#124; Date &#124; undefined): string; (encoding: "buffer", timestamp?: number &#124; Date &#124; undefined): Buffer&lt;...&gt;; } |
| bun.randomUUIDv5 | FunctionDeclaration | bun.d.ts:10630 | { (name: string &#124; BufferSource, namespace: string &#124; BufferSource, encoding?: "base64" &#124; "base64url" &#124; "hex" &#124; undefined): string; (name: string &#124; BufferSource, namespace: string &#124; BufferSource, encoding: "buffer"): Buffer&lt;...&gt;; } |
| bun.randomUUIDv5 | FunctionDeclaration | bun.d.ts:10653 | { (name: string &#124; BufferSource, namespace: string &#124; BufferSource, encoding?: "base64" &#124; "base64url" &#124; "hex" &#124; undefined): string; (name: string &#124; BufferSource, namespace: string &#124; BufferSource, encoding: "buffer"): Buffer&lt;...&gt;; } |
| bun.BunLockFile | TypeAliasDeclaration | bun.d.ts:10662 | BunLockFile |
| bun.BunLockFile.[TypeLiteral] | TypeLiteral | bun.d.ts:10662 | BunLockFile |
| bun.BunLockFile.lockfileVersion | PropertySignature | bun.d.ts:10663 | 0 &#124; 1 &#124; 2 |
| bun.BunLockFile.workspaces | PropertySignature | bun.d.ts:10664 | { [workspace: string]: BunLockFileWorkspacePackage; } |
| bun.BunLockFile.workspaces.[TypeLiteral] | TypeLiteral | bun.d.ts:10664 | { [workspace: string]: BunLockFileWorkspacePackage; } |
| bun.BunLockFile.workspaces.[index] | IndexSignature | bun.d.ts:10665 | any |
| bun.BunLockFile.overrides | PropertySignature | bun.d.ts:10668 | Record&lt;string, string&gt; &#124; undefined |
| bun.BunLockFile.patchedDependencies | PropertySignature | bun.d.ts:10670 | Record&lt;string, string&gt; &#124; undefined |
| bun.BunLockFile.trustedDependencies | PropertySignature | bun.d.ts:10672 | string[] &#124; undefined |
| bun.BunLockFile.catalog | PropertySignature | bun.d.ts:10674 | Record&lt;string, string&gt; &#124; undefined |
| bun.BunLockFile.catalogs | PropertySignature | bun.d.ts:10676 | Record&lt;string, Record&lt;string, string&gt;&gt; &#124; undefined |
| bun.BunLockFile.configVersion | PropertySignature | bun.d.ts:10686 | 0 &#124; 1 &#124; undefined |
| bun.BunLockFile.packages | PropertySignature | bun.d.ts:10703 | { [pkg: string]: BunLockFilePackageArray; } |
| bun.BunLockFile.packages.[TypeLiteral] | TypeLiteral | bun.d.ts:10703 | { [pkg: string]: BunLockFilePackageArray; } |
| bun.BunLockFile.packages.[index] | IndexSignature | bun.d.ts:10704 | any |
| bun.BunLockFileBasePackageInfo | TypeAliasDeclaration | bun.d.ts:10708 | BunLockFileBasePackageInfo |
| bun.BunLockFileBasePackageInfo.[TypeLiteral] | TypeLiteral | bun.d.ts:10708 | BunLockFileBasePackageInfo |
| bun.BunLockFileBasePackageInfo.dependencies | PropertySignature | bun.d.ts:10709 | Record&lt;string, string&gt; &#124; undefined |
| bun.BunLockFileBasePackageInfo.devDependencies | PropertySignature | bun.d.ts:10710 | Record&lt;string, string&gt; &#124; undefined |
| bun.BunLockFileBasePackageInfo.optionalDependencies | PropertySignature | bun.d.ts:10711 | Record&lt;string, string&gt; &#124; undefined |
| bun.BunLockFileBasePackageInfo.peerDependencies | PropertySignature | bun.d.ts:10712 | Record&lt;string, string&gt; &#124; undefined |
| bun.BunLockFileBasePackageInfo.optionalPeers | PropertySignature | bun.d.ts:10713 | string[] &#124; undefined |
| bun.BunLockFileBasePackageInfo.unresolved | PropertySignature | bun.d.ts:10715 | string[] &#124; undefined |
| bun.BunLockFileBasePackageInfo.bin | PropertySignature | bun.d.ts:10716 | string &#124; Record&lt;string, string&gt; &#124; undefined |
| bun.BunLockFileBasePackageInfo.binDir | PropertySignature | bun.d.ts:10717 | string &#124; undefined |
| bun.BunLockFileWorkspacePackage | TypeAliasDeclaration | bun.d.ts:10720 | BunLockFileWorkspacePackage |
| bun.BunLockFileWorkspacePackage.[TypeLiteral] | TypeLiteral | bun.d.ts:10720 | { name?: string &#124; undefined; version?: string &#124; undefined; } |
| bun.BunLockFileWorkspacePackage.name | PropertySignature | bun.d.ts:10721 | string &#124; undefined |
| bun.BunLockFileWorkspacePackage.version | PropertySignature | bun.d.ts:10722 | string &#124; undefined |
| bun.BunLockFilePackageInfo | TypeAliasDeclaration | bun.d.ts:10725 | BunLockFilePackageInfo |
| bun.BunLockFilePackageInfo.[TypeLiteral] | TypeLiteral | bun.d.ts:10725 | { os?: string &#124; string[] &#124; undefined; cpu?: string &#124; string[] &#124; undefined; hasInstallScript?: true &#124; undefined; bundled?: true &#124; undefined; } |
| bun.BunLockFilePackageInfo.os | PropertySignature | bun.d.ts:10726 | string &#124; string[] &#124; undefined |
| bun.BunLockFilePackageInfo.cpu | PropertySignature | bun.d.ts:10727 | string &#124; string[] &#124; undefined |
| bun.BunLockFilePackageInfo.hasInstallScript | PropertySignature | bun.d.ts:10728 | true &#124; undefined |
| bun.BunLockFilePackageInfo.bundled | PropertySignature | bun.d.ts:10729 | true &#124; undefined |
| bun.BunLockFilePackageArray | TypeAliasDeclaration | bun.d.ts:10733 | BunLockFilePackageArray |
| bun.CookieInit | InterfaceDeclaration | bun.d.ts:10745 | CookieInit |
| bun.CookieInit.name | PropertySignature | bun.d.ts:10746 | string &#124; undefined |
| bun.CookieInit.value | PropertySignature | bun.d.ts:10747 | string &#124; undefined |
| bun.CookieInit.domain | PropertySignature | bun.d.ts:10748 | string &#124; undefined |
| bun.CookieInit.path | PropertySignature | bun.d.ts:10750 | string &#124; undefined |
| bun.CookieInit.expires | PropertySignature | bun.d.ts:10751 | string &#124; number &#124; Date &#124; undefined |
| bun.CookieInit.secure | PropertySignature | bun.d.ts:10752 | boolean &#124; undefined |
| bun.CookieInit.sameSite | PropertySignature | bun.d.ts:10754 | CookieSameSite &#124; undefined |
| bun.CookieInit.httpOnly | PropertySignature | bun.d.ts:10755 | boolean &#124; undefined |
| bun.CookieInit.partitioned | PropertySignature | bun.d.ts:10756 | boolean &#124; undefined |
| bun.CookieInit.maxAge | PropertySignature | bun.d.ts:10757 | number &#124; undefined |
| bun.CookieStoreDeleteOptions | InterfaceDeclaration | bun.d.ts:10760 | CookieStoreDeleteOptions |
| bun.CookieStoreDeleteOptions.name | PropertySignature | bun.d.ts:10761 | string |
| bun.CookieStoreDeleteOptions.domain | PropertySignature | bun.d.ts:10762 | string &#124; null &#124; undefined |
| bun.CookieStoreDeleteOptions.path | PropertySignature | bun.d.ts:10763 | string &#124; undefined |
| bun.CookieStoreGetOptions | InterfaceDeclaration | bun.d.ts:10766 | CookieStoreGetOptions |
| bun.CookieStoreGetOptions.name | PropertySignature | bun.d.ts:10767 | string &#124; undefined |
| bun.CookieStoreGetOptions.url | PropertySignature | bun.d.ts:10768 | string &#124; undefined |
| bun.CookieSameSite | TypeAliasDeclaration | bun.d.ts:10771 | CookieSameSite |
| bun.Cookie | ClassDeclaration | bun.d.ts:10782 | Cookie |
| bun.Cookie.constructor | Constructor | bun.d.ts:10789 | any |
| bun.Cookie.constructor | Constructor | bun.d.ts:10795 | any |
| bun.Cookie.constructor | Constructor | bun.d.ts:10801 | any |
| bun.Cookie.name | PropertyDeclaration | bun.d.ts:10806 | string |
| bun.Cookie.value | PropertyDeclaration | bun.d.ts:10811 | string |
| bun.Cookie.domain | PropertyDeclaration | bun.d.ts:10816 | string &#124; undefined |
| bun.Cookie.path | PropertyDeclaration | bun.d.ts:10821 | string |
| bun.Cookie.expires | PropertyDeclaration | bun.d.ts:10826 | Date &#124; undefined |
| bun.Cookie.secure | PropertyDeclaration | bun.d.ts:10831 | boolean |
| bun.Cookie.sameSite | PropertyDeclaration | bun.d.ts:10836 | CookieSameSite |
| bun.Cookie.partitioned | PropertyDeclaration | bun.d.ts:10841 | boolean |
| bun.Cookie.maxAge | PropertyDeclaration | bun.d.ts:10846 | number &#124; undefined |
| bun.Cookie.httpOnly | PropertyDeclaration | bun.d.ts:10851 | boolean |
| bun.Cookie.isExpired | MethodDeclaration | bun.d.ts:10856 | () =&gt; boolean |
| bun.Cookie.serialize | MethodDeclaration | bun.d.ts:10871 | () =&gt; string |
| bun.Cookie.toString | MethodDeclaration | bun.d.ts:10876 | () =&gt; string |
| bun.Cookie.toJSON | MethodDeclaration | bun.d.ts:10881 | () =&gt; CookieInit |
| bun.Cookie.parse | MethodDeclaration | bun.d.ts:10887 | (cookieString: string) =&gt; Cookie |
| bun.Cookie.from | MethodDeclaration | bun.d.ts:10892 | (name: string, value: string, options?: CookieInit &#124; undefined) =&gt; Cookie |
| bun.CookieMap | ClassDeclaration | bun.d.ts:10900 | CookieMap |
| bun.CookieMap.constructor | Constructor | bun.d.ts:10909 | any |
| bun.CookieMap.get | MethodDeclaration | bun.d.ts:10917 | (name: string) =&gt; string &#124; null |
| bun.CookieMap.toSetCookieHeaders | MethodDeclaration | bun.d.ts:10924 | () =&gt; string[] |
| bun.CookieMap.has | MethodDeclaration | bun.d.ts:10932 | (name: string) =&gt; boolean |
| bun.CookieMap.set | MethodDeclaration | bun.d.ts:10941 | { (name: string, value: string, options?: CookieInit &#124; undefined): void; (options: CookieInit): void; } |
| bun.CookieMap.set | MethodDeclaration | bun.d.ts:10948 | { (name: string, value: string, options?: CookieInit &#124; undefined): void; (options: CookieInit): void; } |
| bun.CookieMap.delete | MethodDeclaration | bun.d.ts:10955 | { (name: string): void; (options: CookieStoreDeleteOptions): void; (name: string, options: Omit&lt;CookieStoreDeleteOptions, "name"&gt;): void; } |
| bun.CookieMap.delete | MethodDeclaration | bun.d.ts:10962 | { (name: string): void; (options: CookieStoreDeleteOptions): void; (name: string, options: Omit&lt;CookieStoreDeleteOptions, "name"&gt;): void; } |
| bun.CookieMap.delete | MethodDeclaration | bun.d.ts:10970 | { (name: string): void; (options: CookieStoreDeleteOptions): void; (name: string, options: Omit&lt;CookieStoreDeleteOptions, "name"&gt;): void; } |
| bun.CookieMap.toJSON | MethodDeclaration | bun.d.ts:10977 | () =&gt; Record&lt;string, string&gt; |
| bun.CookieMap.size | PropertyDeclaration | bun.d.ts:10982 | number |
| bun.CookieMap.entries | MethodDeclaration | bun.d.ts:10989 | () =&gt; IterableIterator&lt;[string, string]&gt; |
| bun.CookieMap.keys | MethodDeclaration | bun.d.ts:10996 | () =&gt; IterableIterator&lt;string&gt; |
| bun.CookieMap.values | MethodDeclaration | bun.d.ts:11003 | () =&gt; IterableIterator&lt;string&gt; |
| bun.CookieMap.forEach | MethodDeclaration | bun.d.ts:11010 | (callback: (value: string, key: string, map: CookieMap) =&gt; void) =&gt; void |
| bun.CookieMap.forEach.[FunctionType] | FunctionType | bun.d.ts:11010 | (value: string, key: string, map: CookieMap) =&gt; void |
| bun.CookieMap./**      * Returns the default iterator for the CookieMap.      * Used by for...of loops to iterate over all entries.      *      * @returns An iterator for the entries in the map      */     [Symbol.iterator] | MethodDeclaration | bun.d.ts:11018 | () =&gt; IterableIterator&lt;[string, string]&gt; |
| global | ModuleDeclaration | bun.ns.d.ts:3 | typeof global |
| global.Bun | ImportEqualsDeclaration | bun.ns.d.ts:4 | typeof import("bun") |
| bun:bundle | ModuleDeclaration | bundle.d.ts:29 | typeof import("bun:bundle") |
| bun:bundle.Registry | InterfaceDeclaration | bundle.d.ts:51 | Registry |
| bun:bundle.feature | FunctionDeclaration | bundle.d.ts:73 | (flag: string) =&gt; boolean |
| bun:bundle.feature.[TypeLiteral] | TypeLiteral | bundle.d.ts:73 | { features: Features; } |
| bun:bundle.feature.features | PropertySignature | bundle.d.ts:73 | Features |
| bun:bundle.feature.features.Features | TypeParameter | bundle.d.ts:73 | Features |
| bun | ModuleDeclaration | deprecated.d.ts:1 | typeof import("bun") |
| bun.Platform | TypeAliasDeclaration | deprecated.d.ts:3 | Platform |
| bun.Architecture | TypeAliasDeclaration | deprecated.d.ts:7 | Architecture |
| bun.UncaughtExceptionListener | TypeAliasDeclaration | deprecated.d.ts:10 | UncaughtExceptionListener |
| bun.UncaughtExceptionListener.[FunctionType] | FunctionType | deprecated.d.ts:10 | UncaughtExceptionListener |
| bun.UnhandledRejectionListener | TypeAliasDeclaration | deprecated.d.ts:18 | UnhandledRejectionListener |
| bun.UnhandledRejectionListener.[FunctionType] | FunctionType | deprecated.d.ts:18 | UnhandledRejectionListener |
| bun.MultipleResolveListener | TypeAliasDeclaration | deprecated.d.ts:21 | MultipleResolveListener |
| bun.MultipleResolveListener.[FunctionType] | FunctionType | deprecated.d.ts:21 | MultipleResolveListener |
| bun.readableStreamToBytes | FunctionDeclaration | deprecated.d.ts:36 | (stream: ReadableStream&lt;ArrayBufferLike &#124; ArrayBufferView&lt;ArrayBufferLike&gt;&gt;) =&gt; Promise&lt;Uint8Array&lt;ArrayBuffer&gt;&gt; &#124; Uint8Array&lt;...&gt; |
| bun.readableStreamToBlob | FunctionDeclaration | deprecated.d.ts:50 | (stream: ReadableStream&lt;any&gt;) =&gt; Promise&lt;Blob&gt; |
| bun.readableStreamToText | FunctionDeclaration | deprecated.d.ts:62 | (stream: ReadableStream&lt;any&gt;) =&gt; Promise&lt;string&gt; |
| bun.readableStreamToJSON | FunctionDeclaration | deprecated.d.ts:74 | (stream: ReadableStream&lt;any&gt;) =&gt; Promise&lt;any&gt; |
| bun.BunMessageEvent | InterfaceDeclaration | deprecated.d.ts:76 | BunMessageEvent&lt;T&gt; |
| bun.BunMessageEvent.T | TypeParameter | deprecated.d.ts:76 | T |
| bun.BunMessageEvent.initMessageEvent | MethodSignature | deprecated.d.ts:80 | (type: string, bubbles?: boolean &#124; undefined, cancelable?: boolean &#124; undefined, data?: any, origin?: string &#124; undefined, lastEventId?: string &#124; undefined, source?: null &#124; undefined) =&gt; void |
| bun.ServeOptions | TypeAliasDeclaration | deprecated.d.ts:94 | ServeOptions&lt;T, R&gt; |
| bun.ServeOptions.T | TypeParameter | deprecated.d.ts:94 | T |
| bun.ServeOptions.R | TypeParameter | deprecated.d.ts:94 | R |
| bun.SQLQuery | TypeAliasDeclaration | deprecated.d.ts:97 | SQLQuery&lt;T&gt; |
| bun.SQLQuery.T | TypeParameter | deprecated.d.ts:97 | T |
| bun.SQLTransactionContextCallback | TypeAliasDeclaration | deprecated.d.ts:100 | SQLTransactionContextCallback&lt;T&gt; |
| bun.SQLTransactionContextCallback.T | TypeParameter | deprecated.d.ts:100 | T |
| bun.SQLSavepointContextCallback | TypeAliasDeclaration | deprecated.d.ts:103 | SQLSavepointContextCallback&lt;T&gt; |
| bun.SQLSavepointContextCallback.T | TypeParameter | deprecated.d.ts:103 | T |
| bun.SQLOptions | TypeAliasDeclaration | deprecated.d.ts:106 | Options |
| bun.Errorlike | TypeAliasDeclaration | deprecated.d.ts:111 | ErrorLike |
| bun.ShellFunction | TypeAliasDeclaration | deprecated.d.ts:114 | ShellFunction |
| bun.ShellFunction.[FunctionType] | FunctionType | deprecated.d.ts:114 | ShellFunction |
| bun.TLSOptions | InterfaceDeclaration | deprecated.d.ts:116 | TLSOptions |
| bun.TLSOptions.keyFile | PropertySignature | deprecated.d.ts:124 | string &#124; undefined |
| bun.TLSOptions.certFile | PropertySignature | deprecated.d.ts:133 | string &#124; undefined |
| bun.TLSOptions.caFile | PropertySignature | deprecated.d.ts:140 | string &#124; undefined |
| bun.ReadableIO | TypeAliasDeclaration | deprecated.d.ts:144 | ReadableIO |
| NodeJS | ModuleDeclaration | deprecated.d.ts:147 | any |
| NodeJS.Process | InterfaceDeclaration | deprecated.d.ts:148 | Process |
| NodeJS.Process.assert | MethodSignature | deprecated.d.ts:152 | (value: unknown, message?: string &#124; Error &#124; undefined) =&gt; asserts value |
| CustomEvent | InterfaceDeclaration | deprecated.d.ts:156 | CustomEvent&lt;T&gt; |
| CustomEvent.T | TypeParameter | deprecated.d.ts:156 | T |
| CustomEvent.initCustomEvent | MethodSignature | deprecated.d.ts:158 | { (type: string, bubbles?: boolean &#124; undefined, cancelable?: boolean &#124; undefined, detail?: T &#124; undefined): void; (type: string, bubbles?: boolean &#124; undefined, cancelable?: boolean &#124; undefined, detail?: T &#124; undefined): void; } |
| DOMException | InterfaceDeclaration | deprecated.d.ts:161 | DOMException |
| DOMException.code | PropertySignature | deprecated.d.ts:163 | number |
| BuildError | VariableDeclaration | deprecated.d.ts:169 | typeof BuildMessage |
| ResolveError | VariableDeclaration | deprecated.d.ts:174 | typeof ResolveMessage |
| bun | ModuleDeclaration | devserver.d.ts:1 | typeof import("bun") |
| bun.HMREventNames | TypeAliasDeclaration | devserver.d.ts:2 | HMREventNames |
| bun.HMREvent | TypeAliasDeclaration | devserver.d.ts:15 | HMREvent |
| bun.HMREvent.[TypeLiteral] | TypeLiteral | devserver.d.ts:15 | {} |
| ImportMeta | InterfaceDeclaration | devserver.d.ts:18 | ImportMeta |
| ImportMeta.hot | PropertySignature | devserver.d.ts:34 | { data: any; accept(): void; accept(cb: (newModule: any) =&gt; void): void; accept(specifier: string, callback: (newModule: any) =&gt; void): void; accept(specifiers: string[], callback: (newModules: any[]) =&gt; void): void; dispose(cb: (data: any) =&gt; void &#124; Promise&lt;...&gt;): void; decline(): void; on(event: HMREvent, callback... |
| ImportMeta.hot.[TypeLiteral] | TypeLiteral | devserver.d.ts:34 | { data: any; accept(): void; accept(cb: (newModule: any) =&gt; void): void; accept(specifier: string, callback: (newModule: any) =&gt; void): void; accept(specifiers: string[], callback: (newModules: any[]) =&gt; void): void; dispose(cb: (data: any) =&gt; void &#124; Promise&lt;...&gt;): void; decline(): void; on(event: HMREvent, callback... |
| ImportMeta.hot.data | PropertySignature | devserver.d.ts:50 | any |
| ImportMeta.hot.accept | MethodSignature | devserver.d.ts:68 | { (): void; (cb: (newModule: any) =&gt; void): void; (specifier: string, callback: (newModule: any) =&gt; void): void; (specifiers: string[], callback: (newModules: any[]) =&gt; void): void; } |
| ImportMeta.hot.accept | MethodSignature | devserver.d.ts:94 | { (): void; (cb: (newModule: any) =&gt; void): void; (specifier: string, callback: (newModule: any) =&gt; void): void; (specifiers: string[], callback: (newModules: any[]) =&gt; void): void; } |
| ImportMeta.hot.accept.[FunctionType] | FunctionType | devserver.d.ts:94 | (newModule: any) =&gt; void |
| ImportMeta.hot.accept | MethodSignature | devserver.d.ts:113 | { (): void; (cb: (newModule: any) =&gt; void): void; (specifier: string, callback: (newModule: any) =&gt; void): void; (specifiers: string[], callback: (newModules: any[]) =&gt; void): void; } |
| ImportMeta.hot.accept.[FunctionType] | FunctionType | devserver.d.ts:113 | (newModule: any) =&gt; void |
| ImportMeta.hot.accept | MethodSignature | devserver.d.ts:123 | { (): void; (cb: (newModule: any) =&gt; void): void; (specifier: string, callback: (newModule: any) =&gt; void): void; (specifiers: string[], callback: (newModules: any[]) =&gt; void): void; } |
| ImportMeta.hot.accept.[FunctionType] | FunctionType | devserver.d.ts:123 | (newModules: any[]) =&gt; void |
| ImportMeta.hot.dispose | MethodSignature | devserver.d.ts:135 | (cb: (data: any) =&gt; void &#124; Promise&lt;void&gt;) =&gt; void |
| ImportMeta.hot.dispose.[FunctionType] | FunctionType | devserver.d.ts:135 | (data: any) =&gt; void &#124; Promise&lt;void&gt; |
| ImportMeta.hot.decline | MethodSignature | devserver.d.ts:141 | () =&gt; void |
| ImportMeta.hot.on | MethodSignature | devserver.d.ts:174 | (event: HMREvent, callback: () =&gt; void) =&gt; void |
| ImportMeta.hot.on.[FunctionType] | FunctionType | devserver.d.ts:174 | () =&gt; void |
| ImportMeta.hot.off | MethodSignature | devserver.d.ts:186 | (event: HMREvent, callback: () =&gt; void) =&gt; void |
| ImportMeta.hot.off.[FunctionType] | FunctionType | devserver.d.ts:186 | () =&gt; void |
| *.txt | ModuleDeclaration | extensions.d.ts:1 | typeof import("*.txt") |
| *.txt.text | VariableDeclaration | extensions.d.ts:2 | string |
| *.txt.[ExportAssignment] | ExportAssignment | extensions.d.ts:3 | string |
| *.toml | ModuleDeclaration | extensions.d.ts:6 | typeof import("*.toml") |
| *.toml.contents | VariableDeclaration | extensions.d.ts:7 | any |
| *.toml.[ExportAssignment] | ExportAssignment | extensions.d.ts:8 | any |
| *.yaml | ModuleDeclaration | extensions.d.ts:11 | typeof import("*.yaml") |
| *.yaml.contents | VariableDeclaration | extensions.d.ts:12 | any |
| *.yaml.[ExportAssignment] | ExportAssignment | extensions.d.ts:13 | any |
| *.yml | ModuleDeclaration | extensions.d.ts:16 | typeof import("*.yml") |
| *.yml.contents | VariableDeclaration | extensions.d.ts:17 | any |
| *.yml.[ExportAssignment] | ExportAssignment | extensions.d.ts:18 | any |
| *.jsonc | ModuleDeclaration | extensions.d.ts:21 | typeof import("*.jsonc") |
| *.jsonc.contents | VariableDeclaration | extensions.d.ts:22 | any |
| *.jsonc.[ExportAssignment] | ExportAssignment | extensions.d.ts:23 | any |
| *.json5 | ModuleDeclaration | extensions.d.ts:26 | typeof import("*.json5") |
| *.json5.contents | VariableDeclaration | extensions.d.ts:27 | any |
| *.json5.[ExportAssignment] | ExportAssignment | extensions.d.ts:28 | any |
| *.xml | ModuleDeclaration | extensions.d.ts:31 | typeof import("*.xml") |
| *.xml.contents | VariableDeclaration | extensions.d.ts:32 | Document |
| *.xml.[ExportAssignment] | ExportAssignment | extensions.d.ts:33 | Document |
| */bun.lock | ModuleDeclaration | extensions.d.ts:36 | typeof import("*/bun.lock") |
| */bun.lock.contents | VariableDeclaration | extensions.d.ts:37 | BunLockFile |
| */bun.lock.[ExportAssignment] | ExportAssignment | extensions.d.ts:38 | BunLockFile |
| *.html | ModuleDeclaration | extensions.d.ts:41 | typeof import("*.html") |
| *.html.contents | VariableDeclaration | extensions.d.ts:42 | HTMLBundle |
| *.html.[ExportAssignment] | ExportAssignment | extensions.d.ts:44 | HTMLBundle |
| bun | ModuleDeclaration | fetch.d.ts:12 | typeof import("bun") |
| bun.HeadersInit | TypeAliasDeclaration | fetch.d.ts:13 | HeadersInit |
| bun.BodyInit | TypeAliasDeclaration | fetch.d.ts:14 | BodyInit |
| bun.BodyInit.[FunctionType] | FunctionType | fetch.d.ts:20 | () =&gt; AsyncGenerator&lt;string &#124; ArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, any, any&gt; |
| bun.__internal | ModuleDeclaration | fetch.d.ts:23 | any |
| bun.__internal.LibOrFallbackHeaders | TypeAliasDeclaration | fetch.d.ts:24 | {} |
| bun.__internal.LibOrFallbackHeaders.[TypeLiteral] | TypeLiteral | fetch.d.ts:24 | {} |
| bun.__internal.LibOrFallbackRequest | TypeAliasDeclaration | fetch.d.ts:25 | {} |
| bun.__internal.LibOrFallbackRequest.[TypeLiteral] | TypeLiteral | fetch.d.ts:25 | {} |
| bun.__internal.LibOrFallbackResponse | TypeAliasDeclaration | fetch.d.ts:26 | {} |
| bun.__internal.LibOrFallbackResponse.[TypeLiteral] | TypeLiteral | fetch.d.ts:26 | {} |
| bun.__internal.LibOrFallbackResponseInit | TypeAliasDeclaration | fetch.d.ts:27 | {} |
| bun.__internal.LibOrFallbackResponseInit.[TypeLiteral] | TypeLiteral | fetch.d.ts:27 | {} |
| bun.__internal.LibOrFallbackRequestInit | TypeAliasDeclaration | fetch.d.ts:28 | {} |
| bun.__internal.LibOrFallbackRequestInit.[TypeLiteral] | TypeLiteral | fetch.d.ts:29 | {} |
| bun.__internal.LibOrFallbackRequestInit.[TypeLiteral] | TypeLiteral | fetch.d.ts:30 | { body?: BodyInit &#124; null &#124; undefined; headers?: HeadersInit &#124; undefined; } |
| bun.__internal.LibOrFallbackRequestInit.body | PropertySignature | fetch.d.ts:31 | BodyInit &#124; null &#124; undefined |
| bun.__internal.LibOrFallbackRequestInit.headers | PropertySignature | fetch.d.ts:32 | HeadersInit &#124; undefined |
| bun.__internal.BunHeadersOverride | InterfaceDeclaration | fetch.d.ts:35 | BunHeadersOverride |
| bun.__internal.BunHeadersOverride.toJSON | MethodSignature | fetch.d.ts:45 | () =&gt; Record&lt;string, string&gt; &amp; { "set-cookie"?: string[] &#124; undefined; } |
| bun.__internal.BunHeadersOverride.toJSON.[TypeLiteral] | TypeLiteral | fetch.d.ts:45 | { "set-cookie"?: string[] &#124; undefined; } |
| bun.__internal.BunHeadersOverride.toJSON.set-cookie | PropertySignature | fetch.d.ts:45 | string[] &#124; undefined |
| bun.__internal.BunHeadersOverride.count | PropertySignature | fetch.d.ts:50 | number |
| bun.__internal.BunHeadersOverride.getAll | MethodSignature | fetch.d.ts:69 | (name: "Set-Cookie" &#124; "set-cookie") =&gt; string[] |
| bun.__internal.BunRequestOverride | InterfaceDeclaration | fetch.d.ts:72 | BunRequestOverride |
| bun.__internal.BunRequestOverride.headers | PropertySignature | fetch.d.ts:73 | BunHeadersOverride |
| bun.__internal.BunRequestOverride.textStream | MethodSignature | fetch.d.ts:81 | () =&gt; ReadableStream&lt;string&gt; |
| bun.__internal.BunResponseOverride | InterfaceDeclaration | fetch.d.ts:84 | BunResponseOverride |
| bun.__internal.BunResponseOverride.headers | PropertySignature | fetch.d.ts:85 | BunHeadersOverride |
| bun.__internal.BunResponseOverride.textStream | MethodSignature | fetch.d.ts:93 | () =&gt; ReadableStream&lt;string&gt; |
| bun:ffi | ModuleDeclaration | ffi.d.ts:14 | typeof import("bun:ffi") |
| bun:ffi.FFIType | EnumDeclaration | ffi.d.ts:15 | FFIType |
| bun:ffi.char | EnumMember | ffi.d.ts:16 | FFIType.char |
| bun:ffi.int8_t | EnumMember | ffi.d.ts:35 | FFIType.int8_t |
| bun:ffi.i8 | EnumMember | ffi.d.ts:54 | FFIType.int8_t |
| bun:ffi.uint8_t | EnumMember | ffi.d.ts:73 | FFIType.uint8_t |
| bun:ffi.u8 | EnumMember | ffi.d.ts:91 | FFIType.uint8_t |
| bun:ffi.int16_t | EnumMember | ffi.d.ts:111 | FFIType.int16_t |
| bun:ffi.i16 | EnumMember | ffi.d.ts:130 | FFIType.int16_t |
| bun:ffi.uint16_t | EnumMember | ffi.d.ts:150 | FFIType.uint16_t |
| bun:ffi.u16 | EnumMember | ffi.d.ts:169 | FFIType.uint16_t |
| bun:ffi.int32_t | EnumMember | ffi.d.ts:174 | FFIType.int32_t |
| bun:ffi.i32 | EnumMember | ffi.d.ts:181 | FFIType.int32_t |
| bun:ffi.int | EnumMember | ffi.d.ts:191 | FFIType.int32_t |
| bun:ffi.uint32_t | EnumMember | ffi.d.ts:207 | FFIType.uint32_t |
| bun:ffi.u32 | EnumMember | ffi.d.ts:213 | FFIType.uint32_t |
| bun:ffi.int64_t | EnumMember | ffi.d.ts:218 | FFIType.int64_t |
| bun:ffi.i64 | EnumMember | ffi.d.ts:224 | FFIType.int64_t |
| bun:ffi.uint64_t | EnumMember | ffi.d.ts:229 | FFIType.uint64_t |
| bun:ffi.u64 | EnumMember | ffi.d.ts:233 | FFIType.uint64_t |
| bun:ffi.double | EnumMember | ffi.d.ts:238 | FFIType.double |
| bun:ffi.f64 | EnumMember | ffi.d.ts:243 | FFIType.double |
| bun:ffi.float | EnumMember | ffi.d.ts:248 | FFIType.float |
| bun:ffi.f32 | EnumMember | ffi.d.ts:253 | FFIType.float |
| bun:ffi.bool | EnumMember | ffi.d.ts:266 | FFIType.bool |
| bun:ffi.ptr | EnumMember | ffi.d.ts:283 | FFIType.ptr |
| bun:ffi.pointer | EnumMember | ffi.d.ts:289 | FFIType.ptr |
| bun:ffi.void | EnumMember | ffi.d.ts:303 | FFIType.void |
| bun:ffi.cstring | EnumMember | ffi.d.ts:312 | FFIType.cstring |
| bun:ffi.i64_fast | EnumMember | ffi.d.ts:321 | FFIType.i64_fast |
| bun:ffi.u64_fast | EnumMember | ffi.d.ts:330 | FFIType.u64_fast |
| bun:ffi.function | EnumMember | ffi.d.ts:331 | FFIType.function |
| bun:ffi.napi_env | EnumMember | ffi.d.ts:333 | FFIType.napi_env |
| bun:ffi.napi_value | EnumMember | ffi.d.ts:334 | FFIType.napi_value |
| bun:ffi.buffer | EnumMember | ffi.d.ts:335 | FFIType.buffer |
| bun:ffi.buffer_length | EnumMember | ffi.d.ts:343 | FFIType.buffer_length |
| bun:ffi.Pointer | TypeAliasDeclaration | ffi.d.ts:346 | Pointer |
| bun:ffi.Pointer.[TypeLiteral] | TypeLiteral | ffi.d.ts:346 | { __pointer__: null; } |
| bun:ffi.Pointer.__pointer__ | PropertySignature | ffi.d.ts:346 | null |
| bun:ffi.FFITypeToArgsType | InterfaceDeclaration | ffi.d.ts:354 | FFITypeToArgsType |
| bun:ffi.FFITypeToArgsType.[FFIType.char] | PropertySignature | ffi.d.ts:355 | number |
| bun:ffi.FFITypeToArgsType.[FFIType.int8_t] | PropertySignature | ffi.d.ts:356 | number |
| bun:ffi.FFITypeToArgsType.[FFIType.uint8_t] | PropertySignature | ffi.d.ts:357 | number |
| bun:ffi.FFITypeToArgsType.[FFIType.int16_t] | PropertySignature | ffi.d.ts:358 | number |
| bun:ffi.FFITypeToArgsType.[FFIType.uint16_t] | PropertySignature | ffi.d.ts:359 | number |
| bun:ffi.FFITypeToArgsType.[FFIType.int32_t] | PropertySignature | ffi.d.ts:360 | number |
| bun:ffi.FFITypeToArgsType.[FFIType.uint32_t] | PropertySignature | ffi.d.ts:361 | number |
| bun:ffi.FFITypeToArgsType.[FFIType.int64_t] | PropertySignature | ffi.d.ts:362 | number &#124; bigint |
| bun:ffi.FFITypeToArgsType.[FFIType.uint64_t] | PropertySignature | ffi.d.ts:363 | number &#124; bigint |
| bun:ffi.FFITypeToArgsType.[FFIType.double] | PropertySignature | ffi.d.ts:364 | number |
| bun:ffi.FFITypeToArgsType.[FFIType.float] | PropertySignature | ffi.d.ts:365 | number |
| bun:ffi.FFITypeToArgsType.[FFIType.bool] | PropertySignature | ffi.d.ts:366 | boolean |
| bun:ffi.FFITypeToArgsType.[FFIType.ptr] | PropertySignature | ffi.d.ts:367 | bigint &#124; TypedArray&lt;ArrayBufferLike&gt; &#124; Pointer &#124; null |
| bun:ffi.FFITypeToArgsType.[FFIType.void] | PropertySignature | ffi.d.ts:368 | undefined |
| bun:ffi.FFITypeToArgsType.[FFIType.cstring] | PropertySignature | ffi.d.ts:369 | string &#124; bigint &#124; TypedArray&lt;ArrayBufferLike&gt; &#124; Pointer &#124; null |
| bun:ffi.FFITypeToArgsType.[FFIType.i64_fast] | PropertySignature | ffi.d.ts:370 | number &#124; bigint |
| bun:ffi.FFITypeToArgsType.[FFIType.u64_fast] | PropertySignature | ffi.d.ts:371 | number &#124; bigint |
| bun:ffi.FFITypeToArgsType.[FFIType.function] | PropertySignature | ffi.d.ts:372 | JSCallback &#124; Pointer |
| bun:ffi.FFITypeToArgsType.// cannot be null     [FFIType.napi_env] | PropertySignature | ffi.d.ts:373 | unknown |
| bun:ffi.FFITypeToArgsType.[FFIType.napi_value] | PropertySignature | ffi.d.ts:374 | unknown |
| bun:ffi.FFITypeToArgsType.[FFIType.buffer] | PropertySignature | ffi.d.ts:375 | DataView&lt;ArrayBufferLike&gt; &#124; TypedArray&lt;ArrayBufferLike&gt; |
| bun:ffi.FFITypeToArgsType.[FFIType.buffer_length] | PropertySignature | ffi.d.ts:376 | DataView&lt;ArrayBufferLike&gt; &#124; TypedArray&lt;ArrayBufferLike&gt; |
| bun:ffi.FFITypeToReturnsType | InterfaceDeclaration | ffi.d.ts:378 | FFITypeToReturnsType |
| bun:ffi.FFITypeToReturnsType.[FFIType.char] | PropertySignature | ffi.d.ts:379 | number |
| bun:ffi.FFITypeToReturnsType.[FFIType.int8_t] | PropertySignature | ffi.d.ts:380 | number |
| bun:ffi.FFITypeToReturnsType.[FFIType.uint8_t] | PropertySignature | ffi.d.ts:381 | number |
| bun:ffi.FFITypeToReturnsType.[FFIType.int16_t] | PropertySignature | ffi.d.ts:382 | number |
| bun:ffi.FFITypeToReturnsType.[FFIType.uint16_t] | PropertySignature | ffi.d.ts:383 | number |
| bun:ffi.FFITypeToReturnsType.[FFIType.int32_t] | PropertySignature | ffi.d.ts:384 | number |
| bun:ffi.FFITypeToReturnsType.[FFIType.uint32_t] | PropertySignature | ffi.d.ts:385 | number |
| bun:ffi.FFITypeToReturnsType.[FFIType.int64_t] | PropertySignature | ffi.d.ts:386 | bigint |
| bun:ffi.FFITypeToReturnsType.[FFIType.uint64_t] | PropertySignature | ffi.d.ts:387 | bigint |
| bun:ffi.FFITypeToReturnsType.[FFIType.double] | PropertySignature | ffi.d.ts:388 | number |
| bun:ffi.FFITypeToReturnsType.[FFIType.float] | PropertySignature | ffi.d.ts:389 | number |
| bun:ffi.FFITypeToReturnsType.[FFIType.bool] | PropertySignature | ffi.d.ts:390 | boolean |
| bun:ffi.FFITypeToReturnsType.[FFIType.ptr] | PropertySignature | ffi.d.ts:391 | bigint &#124; Pointer &#124; null |
| bun:ffi.FFITypeToReturnsType.[FFIType.void] | PropertySignature | ffi.d.ts:392 | undefined |
| bun:ffi.FFITypeToReturnsType.[FFIType.cstring] | PropertySignature | ffi.d.ts:393 | string &#124; null |
| bun:ffi.FFITypeToReturnsType.[FFIType.i64_fast] | PropertySignature | ffi.d.ts:394 | number &#124; bigint |
| bun:ffi.FFITypeToReturnsType.[FFIType.u64_fast] | PropertySignature | ffi.d.ts:395 | number &#124; bigint |
| bun:ffi.FFITypeToReturnsType.[FFIType.function] | PropertySignature | ffi.d.ts:396 | bigint &#124; Pointer &#124; null |
| bun:ffi.FFITypeToReturnsType.[FFIType.napi_env] | PropertySignature | ffi.d.ts:397 | unknown |
| bun:ffi.FFITypeToReturnsType.[FFIType.napi_value] | PropertySignature | ffi.d.ts:398 | unknown |
| bun:ffi.FFITypeToReturnsType.[FFIType.buffer] | PropertySignature | ffi.d.ts:399 | DataView&lt;ArrayBufferLike&gt; &#124; TypedArray&lt;ArrayBufferLike&gt; |
| bun:ffi.FFITypeToReturnsType.[FFIType.buffer_length] | PropertySignature | ffi.d.ts:400 | DataView&lt;ArrayBufferLike&gt; &#124; TypedArray&lt;ArrayBufferLike&gt; |
| bun:ffi.FFITypeStringToType | InterfaceDeclaration | ffi.d.ts:402 | FFITypeStringToType |
| bun:ffi.FFITypeStringToType.["char"] | PropertySignature | ffi.d.ts:403 | FFIType.char |
| bun:ffi.FFITypeStringToType.["int8_t"] | PropertySignature | ffi.d.ts:404 | FFIType.int8_t |
| bun:ffi.FFITypeStringToType.["i8"] | PropertySignature | ffi.d.ts:405 | FFIType.int8_t |
| bun:ffi.FFITypeStringToType.["uint8_t"] | PropertySignature | ffi.d.ts:406 | FFIType.uint8_t |
| bun:ffi.FFITypeStringToType.["u8"] | PropertySignature | ffi.d.ts:407 | FFIType.uint8_t |
| bun:ffi.FFITypeStringToType.["int16_t"] | PropertySignature | ffi.d.ts:408 | FFIType.int16_t |
| bun:ffi.FFITypeStringToType.["i16"] | PropertySignature | ffi.d.ts:409 | FFIType.int16_t |
| bun:ffi.FFITypeStringToType.["uint16_t"] | PropertySignature | ffi.d.ts:410 | FFIType.uint16_t |
| bun:ffi.FFITypeStringToType.["u16"] | PropertySignature | ffi.d.ts:411 | FFIType.uint16_t |
| bun:ffi.FFITypeStringToType.["int32_t"] | PropertySignature | ffi.d.ts:412 | FFIType.int32_t |
| bun:ffi.FFITypeStringToType.["i32"] | PropertySignature | ffi.d.ts:413 | FFIType.int32_t |
| bun:ffi.FFITypeStringToType.["int"] | PropertySignature | ffi.d.ts:414 | FFIType.int32_t |
| bun:ffi.FFITypeStringToType.["uint32_t"] | PropertySignature | ffi.d.ts:415 | FFIType.uint32_t |
| bun:ffi.FFITypeStringToType.["u32"] | PropertySignature | ffi.d.ts:416 | FFIType.uint32_t |
| bun:ffi.FFITypeStringToType.["int64_t"] | PropertySignature | ffi.d.ts:417 | FFIType.int64_t |
| bun:ffi.FFITypeStringToType.["i64"] | PropertySignature | ffi.d.ts:418 | FFIType.int64_t |
| bun:ffi.FFITypeStringToType.["uint64_t"] | PropertySignature | ffi.d.ts:419 | FFIType.uint64_t |
| bun:ffi.FFITypeStringToType.["u64"] | PropertySignature | ffi.d.ts:420 | FFIType.uint64_t |
| bun:ffi.FFITypeStringToType.["double"] | PropertySignature | ffi.d.ts:421 | FFIType.double |
| bun:ffi.FFITypeStringToType.["f64"] | PropertySignature | ffi.d.ts:422 | FFIType.double |
| bun:ffi.FFITypeStringToType.["float"] | PropertySignature | ffi.d.ts:423 | FFIType.float |
| bun:ffi.FFITypeStringToType.["f32"] | PropertySignature | ffi.d.ts:424 | FFIType.float |
| bun:ffi.FFITypeStringToType.["bool"] | PropertySignature | ffi.d.ts:425 | FFIType.bool |
| bun:ffi.FFITypeStringToType.["ptr"] | PropertySignature | ffi.d.ts:426 | FFIType.ptr |
| bun:ffi.FFITypeStringToType.["pointer"] | PropertySignature | ffi.d.ts:427 | FFIType.ptr |
| bun:ffi.FFITypeStringToType.["void"] | PropertySignature | ffi.d.ts:428 | FFIType.void |
| bun:ffi.FFITypeStringToType.["cstring"] | PropertySignature | ffi.d.ts:429 | FFIType.cstring |
| bun:ffi.FFITypeStringToType.["function"] | PropertySignature | ffi.d.ts:430 | FFIType.ptr |
| bun:ffi.FFITypeStringToType.// for now     ["usize"] | PropertySignature | ffi.d.ts:431 | FFIType.uint64_t |
| bun:ffi.FFITypeStringToType.// for now     ["callback"] | PropertySignature | ffi.d.ts:432 | FFIType.ptr |
| bun:ffi.FFITypeStringToType.// for now     ["napi_env"] | PropertySignature | ffi.d.ts:433 | FFIType.napi_env |
| bun:ffi.FFITypeStringToType.["napi_value"] | PropertySignature | ffi.d.ts:434 | FFIType.napi_value |
| bun:ffi.FFITypeStringToType.["buffer"] | PropertySignature | ffi.d.ts:435 | FFIType.buffer |
| bun:ffi.FFITypeStringToType.["buffer_length"] | PropertySignature | ffi.d.ts:436 | FFIType.buffer_length |
| bun:ffi.FFITypeStringToType.["buffer_bytelength"] | PropertySignature | ffi.d.ts:437 | FFIType.buffer_length |
| bun:ffi.FFITypeOrString | TypeAliasDeclaration | ffi.d.ts:440 | FFITypeOrString |
| bun:ffi.FFIFunction | InterfaceDeclaration | ffi.d.ts:442 | FFIFunction |
| bun:ffi.FFIFunction.args | PropertySignature | ffi.d.ts:471 | readonly FFITypeOrString[] &#124; undefined |
| bun:ffi.FFIFunction.returns | PropertySignature | ffi.d.ts:499 | FFITypeOrString &#124; undefined |
| bun:ffi.FFIFunction.ptr | PropertySignature | ffi.d.ts:510 | bigint &#124; Pointer &#124; undefined |
| bun:ffi.FFIFunction.threadsafe | PropertySignature | ffi.d.ts:526 | boolean &#124; undefined |
| bun:ffi.Symbols | TypeAliasDeclaration | ffi.d.ts:529 | Readonly&lt;Record&lt;string, FFIFunction&gt;&gt; |
| bun:ffi.Library | InterfaceDeclaration | ffi.d.ts:531 | Library&lt;Fns&gt; |
| bun:ffi.Library.Fns | TypeParameter | ffi.d.ts:531 | Fns |
| bun:ffi.Library.symbols | PropertySignature | ffi.d.ts:532 | ConvertFns&lt;Fns&gt; |
| bun:ffi.Library.close | MethodSignature | ffi.d.ts:542 | () =&gt; void |
| bun:ffi.ToFFIType | TypeAliasDeclaration | ffi.d.ts:545 | ToFFIType&lt;T&gt; |
| bun:ffi.ToFFIType.T | TypeParameter | ffi.d.ts:545 | T |
| bun:ffi.FFIFunctionCallableSymbol | VariableDeclaration | ffi.d.ts:547 | unique symbol |
| bun:ffi.ConvertFns | TypeAliasDeclaration | ffi.d.ts:548 | ConvertFns&lt;Fns&gt; |
| bun:ffi.ConvertFns.Fns | TypeParameter | ffi.d.ts:548 | Fns |
| bun:ffi.ConvertFns.[MappedType] | MappedType | ffi.d.ts:548 | ConvertFns&lt;Fns&gt; |
| bun:ffi.ConvertFns.K | TypeParameter | ffi.d.ts:549 | K |
| bun:ffi.ConvertFns.[TypeLiteral] | TypeLiteral | ffi.d.ts:549 | { (...args: Fns[K]["args"] extends infer A extends readonly FFITypeOrString[] ? { [L in keyof A]: FFITypeToArgsType[ToFFIType&lt;A[L]&gt;]; } : ...): ...; __ffi_function_callable: unique symbol; } |
| bun:ffi.ConvertFns.[call] | CallSignature | ffi.d.ts:550 | any |
| bun:ffi.ConvertFns.A | TypeParameter | ffi.d.ts:551 | A |
| bun:ffi.ConvertFns.[MappedType] | MappedType | ffi.d.ts:552 | { [L in keyof A]: FFITypeToArgsType[ToFFIType&lt;A[L]&gt;]; } |
| bun:ffi.ConvertFns.L | TypeParameter | ffi.d.ts:552 | L |
| bun:ffi.ConvertFns.__ffi_function_callable | PropertySignature | ffi.d.ts:560 | unique symbol |
| bun:ffi.dlopen | FunctionDeclaration | ffi.d.ts:587 | &lt;Fns extends Record&lt;string, FFIFunction&gt;&gt;(name: string &#124; BunFile &#124; URL, symbols: Fns) =&gt; Library&lt;Fns&gt; |
| bun:ffi.dlopen.Fns | TypeParameter | ffi.d.ts:587 | Fns |
| bun:ffi.cc | FunctionDeclaration | ffi.d.ts:626 | &lt;Fns extends Record&lt;string, FFIFunction&gt;&gt;(options: { source: string &#124; BunFile &#124; URL; library?: string &#124; string[] &#124; undefined; include?: string &#124; string[] &#124; undefined; symbols: Fns; define?: Record&lt;...&gt; &#124; undefined; flags?: string &#124; ... 1 more ... &#124; undefined; }) =&gt; Library&lt;...&gt; |
| bun:ffi.cc.Fns | TypeParameter | ffi.d.ts:626 | Fns |
| bun:ffi.cc.[TypeLiteral] | TypeLiteral | ffi.d.ts:626 | { source: string &#124; BunFile &#124; URL; library?: string &#124; string[] &#124; undefined; include?: string &#124; string[] &#124; undefined; symbols: Fns; define?: Record&lt;string, string&gt; &#124; undefined; flags?: string &#124; ... 1 more ... &#124; undefined; } |
| bun:ffi.cc.source | PropertySignature | ffi.d.ts:630 | string &#124; BunFile &#124; URL |
| bun:ffi.cc.library | PropertySignature | ffi.d.ts:637 | string &#124; string[] &#124; undefined |
| bun:ffi.cc.include | PropertySignature | ffi.d.ts:644 | string &#124; string[] &#124; undefined |
| bun:ffi.cc.symbols | PropertySignature | ffi.d.ts:649 | Fns |
| bun:ffi.cc.define | PropertySignature | ffi.d.ts:674 | Record&lt;string, string&gt; &#124; undefined |
| bun:ffi.cc.flags | PropertySignature | ffi.d.ts:699 | string &#124; string[] &#124; undefined |
| bun:ffi.CFunction | FunctionDeclaration | ffi.d.ts:724 | (fn: FFIFunction &amp; { ptr: number &#124; bigint &#124; Pointer; }) =&gt; CallableFunction &amp; { close(): void; } |
| bun:ffi.CFunction.[TypeLiteral] | TypeLiteral | ffi.d.ts:724 | { ptr: number &#124; bigint &#124; Pointer; } |
| bun:ffi.CFunction.ptr | PropertySignature | ffi.d.ts:724 | number &#124; bigint &#124; Pointer |
| bun:ffi.CFunction.[TypeLiteral] | TypeLiteral | ffi.d.ts:724 | { close(): void; } |
| bun:ffi.CFunction.close | MethodSignature | ffi.d.ts:728 | () =&gt; void |
| bun:ffi.linkSymbols | FunctionDeclaration | ffi.d.ts:778 | &lt;Fns extends Record&lt;string, FFIFunction&gt;&gt;(symbols: Fns) =&gt; Library&lt;Fns&gt; |
| bun:ffi.linkSymbols.Fns | TypeParameter | ffi.d.ts:778 | Fns |
| bun:ffi.toBuffer | FunctionDeclaration | ffi.d.ts:793 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined, byteLength?: number &#124; undefined) =&gt; Buffer&lt;ArrayBufferLike&gt; |
| bun:ffi.toArrayBuffer | FunctionDeclaration | ffi.d.ts:808 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined, byteLength?: number &#124; undefined) =&gt; ArrayBuffer |
| bun:ffi.read | ModuleDeclaration | ffi.d.ts:814 | typeof read |
| bun:ffi.read.u8 | FunctionDeclaration | ffi.d.ts:828 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; number |
| bun:ffi.read.i8 | FunctionDeclaration | ffi.d.ts:842 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; number |
| bun:ffi.read.u16 | FunctionDeclaration | ffi.d.ts:856 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; number |
| bun:ffi.read.i16 | FunctionDeclaration | ffi.d.ts:870 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; number |
| bun:ffi.read.u32 | FunctionDeclaration | ffi.d.ts:884 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; number |
| bun:ffi.read.i32 | FunctionDeclaration | ffi.d.ts:898 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; number |
| bun:ffi.read.f32 | FunctionDeclaration | ffi.d.ts:912 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; number |
| bun:ffi.read.u64 | FunctionDeclaration | ffi.d.ts:926 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; bigint |
| bun:ffi.read.i64 | FunctionDeclaration | ffi.d.ts:940 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; bigint |
| bun:ffi.read.f64 | FunctionDeclaration | ffi.d.ts:954 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; number |
| bun:ffi.read.ptr | FunctionDeclaration | ffi.d.ts:968 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; number |
| bun:ffi.read.intptr | FunctionDeclaration | ffi.d.ts:982 | (ptr: number &#124; bigint &#124; Pointer, byteOffset?: number &#124; undefined) =&gt; number |
| bun:ffi.ptr | FunctionDeclaration | ffi.d.ts:1012 | (view: DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;, byteOffset?: number &#124; undefined) =&gt; Pointer |
| bun:ffi.CString | TypeAliasDeclaration | ffi.d.ts:1019 | string |
| bun:ffi.CStringConstructor | InterfaceDeclaration | ffi.d.ts:1021 | CStringConstructor |
| bun:ffi.CStringConstructor.[construct] | ConstructSignature | ffi.d.ts:1050 | any |
| bun:ffi.CStringConstructor.[call] | CallSignature | ffi.d.ts:1051 | any |
| bun:ffi.CString | VariableDeclaration | ffi.d.ts:1059 | CStringConstructor |
| bun:ffi.JSCallback | ClassDeclaration | ffi.d.ts:1064 | JSCallback |
| bun:ffi.JSCallback.constructor | Constructor | ffi.d.ts:1071 | any |
| bun:ffi.JSCallback.[FunctionType] | FunctionType | ffi.d.ts:1071 | (...args: any[]) =&gt; any |
| bun:ffi.JSCallback.ptr | PropertyDeclaration | ffi.d.ts:1078 | Pointer &#124; null |
| bun:ffi.JSCallback.threadsafe | PropertyDeclaration | ffi.d.ts:1083 | boolean |
| bun:ffi.JSCallback.close | MethodDeclaration | ffi.d.ts:1090 | () =&gt; void |
| bun:ffi.viewSource | FunctionDeclaration | ffi.d.ts:1099 | { (symbols: Readonly&lt;Record&lt;string, FFIFunction&gt;&gt;, is_callback?: false &#124; undefined): string[]; (callback: FFIFunction, is_callback: true): string; } |
| bun:ffi.viewSource | FunctionDeclaration | ffi.d.ts:1100 | { (symbols: Readonly&lt;Record&lt;string, FFIFunction&gt;&gt;, is_callback?: false &#124; undefined): string[]; (callback: FFIFunction, is_callback: true): string; } |
| bun:ffi.suffix | VariableDeclaration | ffi.d.ts:1116 | string |
| bun | ModuleDeclaration | globals.d.ts:1 | typeof import("bun") |
| bun.__internal | ModuleDeclaration | globals.d.ts:2 | any |
| bun.__internal.NodeCryptoWebcryptoCryptoKey | TypeAliasDeclaration | globals.d.ts:3 | CryptoKey |
| bun.__internal.NodeCryptoWebcryptoCryptoKeyPair | TypeAliasDeclaration | globals.d.ts:4 | CryptoKeyPair |
| bun.__internal.LibEmptyOrNodeCryptoWebcryptoSubtleCrypto | TypeAliasDeclaration | globals.d.ts:6 | {} |
| bun.__internal.LibEmptyOrNodeCryptoWebcryptoSubtleCrypto.[TypeLiteral] | TypeLiteral | globals.d.ts:7 | {} |
| bun.__internal.LibWorkerOrBunWorker | TypeAliasDeclaration | globals.d.ts:10 | {} |
| bun.__internal.LibWorkerOrBunWorker.[TypeLiteral] | TypeLiteral | globals.d.ts:10 | {} |
| bun.__internal.LibEmptyOrBunWebSocket | TypeAliasDeclaration | globals.d.ts:11 | {} |
| bun.__internal.LibEmptyOrBunWebSocket.[TypeLiteral] | TypeLiteral | globals.d.ts:11 | {} |
| bun.__internal.LibEmptyOrNodeStreamWebCompressionStream | TypeAliasDeclaration | globals.d.ts:13 | {} |
| bun.__internal.LibEmptyOrNodeStreamWebCompressionStream.[TypeLiteral] | TypeLiteral | globals.d.ts:14 | {} |
| bun.__internal.LibEmptyOrNodeStreamWebDecompressionStream | TypeAliasDeclaration | globals.d.ts:16 | {} |
| bun.__internal.LibEmptyOrNodeStreamWebDecompressionStream.[TypeLiteral] | TypeLiteral | globals.d.ts:17 | {} |
| bun.__internal.LibPerformanceOrNodePerfHooksPerformance | TypeAliasDeclaration | globals.d.ts:20 | {} |
| bun.__internal.LibPerformanceOrNodePerfHooksPerformance.[TypeLiteral] | TypeLiteral | globals.d.ts:21 | {} |
| bun.__internal.LibEmptyOrPerformanceEntry | TypeAliasDeclaration | globals.d.ts:23 | {} |
| bun.__internal.LibEmptyOrPerformanceEntry.[TypeLiteral] | TypeLiteral | globals.d.ts:23 | {} |
| bun.__internal.LibEmptyOrPerformanceMark | TypeAliasDeclaration | globals.d.ts:24 | {} |
| bun.__internal.LibEmptyOrPerformanceMark.[TypeLiteral] | TypeLiteral | globals.d.ts:24 | {} |
| bun.__internal.LibEmptyOrPerformanceMeasure | TypeAliasDeclaration | globals.d.ts:25 | {} |
| bun.__internal.LibEmptyOrPerformanceMeasure.[TypeLiteral] | TypeLiteral | globals.d.ts:25 | {} |
| bun.__internal.LibEmptyOrPerformanceObserver | TypeAliasDeclaration | globals.d.ts:26 | {} |
| bun.__internal.LibEmptyOrPerformanceObserver.[TypeLiteral] | TypeLiteral | globals.d.ts:27 | {} |
| bun.__internal.LibEmptyOrPerformanceObserverEntryList | TypeAliasDeclaration | globals.d.ts:29 | {} |
| bun.__internal.LibEmptyOrPerformanceObserverEntryList.[TypeLiteral] | TypeLiteral | globals.d.ts:30 | {} |
| bun.__internal.LibEmptyOrPerformanceResourceTiming | TypeAliasDeclaration | globals.d.ts:32 | {} |
| bun.__internal.LibEmptyOrPerformanceResourceTiming.[TypeLiteral] | TypeLiteral | globals.d.ts:33 | {} |
| bun.__internal.LibEmptyOrNodeUtilTextEncoder | TypeAliasDeclaration | globals.d.ts:36 | {} |
| bun.__internal.LibEmptyOrNodeUtilTextEncoder.[TypeLiteral] | TypeLiteral | globals.d.ts:36 | {} |
| bun.__internal.LibEmptyOrNodeStreamWebTextEncoderStream | TypeAliasDeclaration | globals.d.ts:37 | {} |
| bun.__internal.LibEmptyOrNodeStreamWebTextEncoderStream.[TypeLiteral] | TypeLiteral | globals.d.ts:38 | {} |
| bun.__internal.LibEmptyOrNodeUtilTextDecoder | TypeAliasDeclaration | globals.d.ts:41 | {} |
| bun.__internal.LibEmptyOrNodeUtilTextDecoder.[TypeLiteral] | TypeLiteral | globals.d.ts:41 | {} |
| bun.__internal.LibEmptyOrNodeStreamWebTextDecoderStream | TypeAliasDeclaration | globals.d.ts:42 | {} |
| bun.__internal.LibEmptyOrNodeStreamWebTextDecoderStream.[TypeLiteral] | TypeLiteral | globals.d.ts:43 | {} |
| bun.__internal.LibEmptyOrNodeReadableStream | TypeAliasDeclaration | globals.d.ts:46 | {} |
| bun.__internal.LibEmptyOrNodeReadableStream.T | TypeParameter | globals.d.ts:46 | T |
| bun.__internal.LibEmptyOrNodeReadableStream.[TypeLiteral] | TypeLiteral | globals.d.ts:47 | {} |
| bun.__internal.LibEmptyOrNodeWritableStream | TypeAliasDeclaration | globals.d.ts:50 | {} |
| bun.__internal.LibEmptyOrNodeWritableStream.T | TypeParameter | globals.d.ts:50 | T |
| bun.__internal.LibEmptyOrNodeWritableStream.[TypeLiteral] | TypeLiteral | globals.d.ts:51 | {} |
| bun.__internal.LibEmptyOrNodeMessagePort | TypeAliasDeclaration | globals.d.ts:54 | {} |
| bun.__internal.LibEmptyOrNodeMessagePort.[TypeLiteral] | TypeLiteral | globals.d.ts:54 | {} |
| bun.__internal.LibEmptyOrBroadcastChannel | TypeAliasDeclaration | globals.d.ts:55 | {} |
| bun.__internal.LibEmptyOrBroadcastChannel.[TypeLiteral] | TypeLiteral | globals.d.ts:55 | {} |
| bun.__internal.LibEmptyOrEventSource | TypeAliasDeclaration | globals.d.ts:56 | {} |
| bun.__internal.LibEmptyOrEventSource.[TypeLiteral] | TypeLiteral | globals.d.ts:56 | {} |
| bun.__internal.LibEmptyOrReadableByteStreamController | TypeAliasDeclaration | globals.d.ts:58 | {} |
| bun.__internal.LibEmptyOrReadableByteStreamController.[TypeLiteral] | TypeLiteral | globals.d.ts:59 | {} |
| bun.__internal.LibEmptyOrReadableStreamBYOBReader | TypeAliasDeclaration | globals.d.ts:62 | {} |
| bun.__internal.LibEmptyOrReadableStreamBYOBReader.[TypeLiteral] | TypeLiteral | globals.d.ts:63 | {} |
| bun.__internal.LibEmptyOrReadableStreamBYOBRequest | TypeAliasDeclaration | globals.d.ts:66 | {} |
| bun.__internal.LibEmptyOrReadableStreamBYOBRequest.[TypeLiteral] | TypeLiteral | globals.d.ts:67 | {} |
| bun.__internal.BunEvent | InterfaceDeclaration | globals.d.ts:76 | BunEvent |
| bun.__internal.BunEvent.bubbles | PropertySignature | globals.d.ts:78 | boolean |
| bun.__internal.BunEvent.cancelBubble | PropertySignature | globals.d.ts:80 | boolean |
| bun.__internal.BunEvent.cancelable | PropertySignature | globals.d.ts:82 | boolean |
| bun.__internal.BunEvent.composed | PropertySignature | globals.d.ts:84 | boolean |
| bun.__internal.BunEvent.composedPath | MethodSignature | globals.d.ts:86 | () =&gt; [(EventTarget &#124; undefined)?] |
| bun.__internal.BunEvent.currentTarget | PropertySignature | globals.d.ts:88 | EventTarget &#124; null |
| bun.__internal.BunEvent.defaultPrevented | PropertySignature | globals.d.ts:90 | boolean |
| bun.__internal.BunEvent.eventPhase | PropertySignature | globals.d.ts:92 | number |
| bun.__internal.BunEvent.isTrusted | PropertySignature | globals.d.ts:94 | boolean |
| bun.__internal.BunEvent.preventDefault | MethodSignature | globals.d.ts:96 | () =&gt; void |
| bun.__internal.BunEvent.returnValue | PropertySignature | globals.d.ts:98 | boolean |
| bun.__internal.BunEvent.srcElement | PropertySignature | globals.d.ts:100 | EventTarget &#124; null |
| bun.__internal.BunEvent.stopImmediatePropagation | MethodSignature | globals.d.ts:102 | () =&gt; void |
| bun.__internal.BunEvent.stopPropagation | MethodSignature | globals.d.ts:104 | () =&gt; void |
| bun.__internal.BunEvent.target | PropertySignature | globals.d.ts:106 | EventTarget &#124; null |
| bun.__internal.BunEvent.timeStamp | PropertySignature | globals.d.ts:108 | number |
| bun.__internal.BunEvent.type | PropertySignature | globals.d.ts:110 | string |
| bun.__internal.LibEmptyOrBunEvent | TypeAliasDeclaration | globals.d.ts:113 | {} |
| bun.__internal.LibEmptyOrBunEvent.[TypeLiteral] | TypeLiteral | globals.d.ts:113 | {} |
| bun.__internal.BunEventTarget | InterfaceDeclaration | globals.d.ts:119 | BunEventTarget |
| bun.__internal.BunEventTarget.addEventListener | MethodSignature | globals.d.ts:129 | (type: string, listener: EventListener &#124; EventListenerObject, options?: boolean &#124; AddEventListenerOptions &#124; undefined) =&gt; void |
| bun.__internal.BunEventTarget.dispatchEvent | MethodSignature | globals.d.ts:135 | (event: Event) =&gt; boolean |
| bun.__internal.BunEventTarget.removeEventListener | MethodSignature | globals.d.ts:137 | (type: string, listener: EventListener &#124; EventListenerObject, options?: boolean &#124; EventListenerOptions &#124; undefined) =&gt; void |
| bun.__internal.LibEmptyOrBunEventTarget | TypeAliasDeclaration | globals.d.ts:144 | {} |
| bun.__internal.LibEmptyOrBunEventTarget.[TypeLiteral] | TypeLiteral | globals.d.ts:144 | {} |
| ReadableStream | InterfaceDeclaration | globals.d.ts:148 | ReadableStream&lt;R&gt; |
| ReadableStream.R | TypeParameter | globals.d.ts:148 | R |
| ReadableStream | VariableDeclaration | globals.d.ts:149 | { new (underlyingSource: UnderlyingByteSource, strategy?: { highWaterMark?: number &#124; undefined; } &#124; undefined): ReadableStream&lt;Uint8Array&lt;ArrayBuffer&gt;&gt;; new &lt;R = any&gt;(underlyingSource: UnderlyingDefaultSource&lt;...&gt;, strategy?: QueuingStrategy&lt;...&gt; &#124; undefined): ReadableStream&lt;...&gt;; new &lt;R = any&gt;(underlyingSource?: Un... |
| [TypeLiteral] | TypeLiteral | globals.d.ts:151 | { new &lt;R = any&gt;(underlyingSource?: UnderlyingSource&lt;R&gt; &#124; undefined, strategy?: QueuingStrategy&lt;R&gt; &#124; undefined): ReadableStream&lt;R&gt;; new &lt;R = any&gt;(underlyingSource?: DirectUnderlyingSource&lt;...&gt; &#124; undefined, strategy?: QueuingStrategy&lt;...&gt; &#124; undefined): ReadableStream&lt;...&gt;; new &lt;R extends Uint8Array = Uint8Array&lt;...&gt;&gt;(... |
| prototype | PropertySignature | globals.d.ts:152 | ReadableStream&lt;any&gt; |
| [construct] | ConstructSignature | globals.d.ts:153 | any |
| R | TypeParameter | globals.d.ts:153 | R |
| [construct] | ConstructSignature | globals.d.ts:154 | any |
| R | TypeParameter | globals.d.ts:154 | R |
| [construct] | ConstructSignature | globals.d.ts:155 | any |
| R | TypeParameter | globals.d.ts:155 | R |
| [TypeLiteral] | TypeLiteral | globals.d.ts:157 | { highWaterMark?: number &#124; undefined; } |
| highWaterMark | PropertySignature | globals.d.ts:157 | number &#124; undefined |
| WritableStream | InterfaceDeclaration | globals.d.ts:162 | WritableStream&lt;W&gt; |
| WritableStream.W | TypeParameter | globals.d.ts:162 | W |
| WritableStream | VariableDeclaration | globals.d.ts:163 | { new &lt;W = any&gt;(underlyingSink?: UnderlyingSink&lt;W&gt; &#124; undefined, strategy?: QueuingStrategy&lt;W&gt; &#124; undefined): WritableStream&lt;W&gt;; prototype: WritableStream&lt;...&gt;; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:165 | { new &lt;W = any&gt;(underlyingSink?: UnderlyingSink&lt;W&gt; &#124; undefined, strategy?: QueuingStrategy&lt;W&gt; &#124; undefined): WritableStream&lt;W&gt;; prototype: WritableStream&lt;...&gt;; } |
| prototype | PropertySignature | globals.d.ts:166 | WritableStream&lt;any&gt; |
| [construct] | ConstructSignature | globals.d.ts:167 | any |
| W | TypeParameter | globals.d.ts:167 | W |
| CompressionStream | InterfaceDeclaration | globals.d.ts:171 | CompressionStream |
| CompressionStream | VariableDeclaration | globals.d.ts:172 | { new (format: CompressionFormat): CompressionStream; prototype: CompressionStream; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:174 | { new (format: CompressionFormat, strategy?: { highWaterMark?: number &#124; undefined; level?: number &#124; undefined; } &#124; undefined): CompressionStream; prototype: CompressionStream; } |
| prototype | PropertySignature | globals.d.ts:175 | CompressionStream |
| [construct] | ConstructSignature | globals.d.ts:184 | any |
| [TypeLiteral] | TypeLiteral | globals.d.ts:184 | { highWaterMark?: number &#124; undefined; level?: number &#124; undefined; } |
| highWaterMark | PropertySignature | globals.d.ts:184 | number &#124; undefined |
| level | PropertySignature | globals.d.ts:184 | number &#124; undefined |
| DecompressionStream | InterfaceDeclaration | globals.d.ts:188 | DecompressionStream |
| DecompressionStream | VariableDeclaration | globals.d.ts:189 | { new (format: CompressionFormat): DecompressionStream; prototype: DecompressionStream; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:191 | { new (format: CompressionFormat, strategy?: { highWaterMark?: number &#124; undefined; } &#124; undefined): DecompressionStream; prototype: DecompressionStream; } |
| prototype | PropertySignature | globals.d.ts:192 | DecompressionStream |
| [construct] | ConstructSignature | globals.d.ts:199 | any |
| [TypeLiteral] | TypeLiteral | globals.d.ts:199 | { highWaterMark?: number &#124; undefined; } |
| highWaterMark | PropertySignature | globals.d.ts:199 | number &#124; undefined |
| Worker | InterfaceDeclaration | globals.d.ts:203 | Worker |
| Worker | VariableDeclaration | globals.d.ts:204 | { new (scriptURL: string &#124; URL, options?: WorkerOptions &#124; undefined): Worker; prototype: Worker; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:206 | { new (scriptURL: string &#124; URL, options?: WorkerOptions &#124; undefined): Worker; prototype: Worker; data: any; } |
| prototype | PropertySignature | globals.d.ts:207 | Worker |
| [construct] | ConstructSignature | globals.d.ts:208 | any |
| data | PropertySignature | globals.d.ts:214 | any |
| WebSocket | InterfaceDeclaration | globals.d.ts:221 | WebSocket |
| WebSocket | VariableDeclaration | globals.d.ts:225 | { new (url: string &#124; URL, protocols?: string &#124; string[] &#124; undefined): WebSocket; prototype: WebSocket; readonly CONNECTING: 0; readonly OPEN: 1; readonly CLOSING: 2; readonly CLOSED: 3; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:227 | { new (url: string &#124; URL, options?: WebSocketOptions &#124; undefined): WebSocket; new (url: string &#124; URL, protocols?: string &#124; string[] &#124; undefined): WebSocket; ... 4 more ...; readonly CLOSED: 3; } |
| prototype | PropertySignature | globals.d.ts:228 | WebSocket |
| [construct] | ConstructSignature | globals.d.ts:246 | any |
| [construct] | ConstructSignature | globals.d.ts:260 | any |
| CONNECTING | PropertySignature | globals.d.ts:265 | 0 |
| OPEN | PropertySignature | globals.d.ts:270 | 1 |
| CLOSING | PropertySignature | globals.d.ts:275 | 2 |
| CLOSED | PropertySignature | globals.d.ts:280 | 3 |
| Crypto | InterfaceDeclaration | globals.d.ts:284 | Crypto |
| Crypto.subtle | PropertySignature | globals.d.ts:285 | SubtleCrypto |
| Crypto.getRandomValues | MethodSignature | globals.d.ts:288 | { &lt;T extends Exclude&lt;BufferSource, ArrayBuffer&gt;&gt;(array: T): T; &lt;T extends ArrayBufferView &#124; null&gt;(array: T): T; } |
| Crypto.getRandomValues.T | TypeParameter | globals.d.ts:288 | T |
| Crypto.randomUUID | MethodSignature | globals.d.ts:293 | { (): `${string}-${string}-${string}-${string}-${string}`; (): `${string}-${string}-${string}-${string}-${string}`; } |
| Crypto.timingSafeEqual | PropertySignature | globals.d.ts:295 | (a: ArrayBufferLike &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, b: ArrayBufferLike &#124; ArrayBufferView&lt;ArrayBufferLike&gt;) =&gt; boolean |
| Crypto | VariableDeclaration | globals.d.ts:297 | { new (): Crypto; prototype: Crypto; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:297 | { new (): Crypto; prototype: Crypto; } |
| prototype | PropertySignature | globals.d.ts:298 | Crypto |
| [construct] | ConstructSignature | globals.d.ts:299 | any |
| crypto | VariableDeclaration | globals.d.ts:301 | Crypto |
| TextEncoder | InterfaceDeclaration | globals.d.ts:312 | TextEncoder |
| TextEncoder.encodeInto | MethodSignature | globals.d.ts:326 | { (source: string, destination: Uint8Array&lt;ArrayBufferLike&gt;): TextEncoderEncodeIntoResult; (src: string, dest: BufferSource): TextEncoderEncodeIntoResult; } |
| TextEncoder | VariableDeclaration | globals.d.ts:328 | { new (): TextEncoder; prototype: TextEncoder; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:330 | { new (encoding?: Encoding &#124; undefined, options?: { fatal?: boolean &#124; undefined; ignoreBOM?: boolean &#124; undefined; } &#124; undefined): TextEncoder; prototype: TextEncoder; } |
| prototype | PropertySignature | globals.d.ts:331 | TextEncoder |
| [construct] | ConstructSignature | globals.d.ts:332 | any |
| [TypeLiteral] | TypeLiteral | globals.d.ts:332 | { fatal?: boolean &#124; undefined; ignoreBOM?: boolean &#124; undefined; } |
| fatal | PropertySignature | globals.d.ts:332 | boolean &#124; undefined |
| ignoreBOM | PropertySignature | globals.d.ts:332 | boolean &#124; undefined |
| TextDecoder | InterfaceDeclaration | globals.d.ts:346 | TextDecoder |
| TextDecoder | VariableDeclaration | globals.d.ts:347 | { new (label?: string &#124; undefined, options?: TextDecoderOptions &#124; undefined): TextDecoder; prototype: TextDecoder; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:349 | { new (encoding?: Encoding &#124; undefined, options?: { fatal?: boolean &#124; undefined; ignoreBOM?: boolean &#124; undefined; } &#124; undefined): TextDecoder; prototype: TextDecoder; } |
| prototype | PropertySignature | globals.d.ts:350 | TextDecoder |
| [construct] | ConstructSignature | globals.d.ts:351 | any |
| [TypeLiteral] | TypeLiteral | globals.d.ts:351 | { fatal?: boolean &#124; undefined; ignoreBOM?: boolean &#124; undefined; } |
| fatal | PropertySignature | globals.d.ts:351 | boolean &#124; undefined |
| ignoreBOM | PropertySignature | globals.d.ts:351 | boolean &#124; undefined |
| Event | InterfaceDeclaration | globals.d.ts:355 | Event |
| Event | VariableDeclaration | globals.d.ts:356 | { new (type: string, eventInitDict?: EventInit &#124; undefined): Event; prototype: Event; readonly NONE: 0; readonly CAPTURING_PHASE: 1; readonly AT_TARGET: 2; readonly BUBBLING_PHASE: 3; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:356 | { new (type: string, eventInitDict?: EventInit &#124; undefined): Event; prototype: Event; readonly NONE: 0; readonly CAPTURING_PHASE: 1; readonly AT_TARGET: 2; readonly BUBBLING_PHASE: 3; } |
| prototype | PropertySignature | globals.d.ts:357 | Event |
| NONE | PropertySignature | globals.d.ts:358 | 0 |
| CAPTURING_PHASE | PropertySignature | globals.d.ts:359 | 1 |
| AT_TARGET | PropertySignature | globals.d.ts:360 | 2 |
| BUBBLING_PHASE | PropertySignature | globals.d.ts:361 | 3 |
| [construct] | ConstructSignature | globals.d.ts:362 | any |
| EventTarget | InterfaceDeclaration | globals.d.ts:365 | EventTarget |
| EventTarget | VariableDeclaration | globals.d.ts:366 | { new (): EventTarget; prototype: EventTarget; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:366 | { new (): EventTarget; prototype: EventTarget; } |
| prototype | PropertySignature | globals.d.ts:367 | EventTarget |
| [construct] | ConstructSignature | globals.d.ts:368 | any |
| File | InterfaceDeclaration | globals.d.ts:371 | File |
| File.lastModified | PropertySignature | globals.d.ts:372 | number |
| File.name | PropertySignature | globals.d.ts:373 | string |
| File | VariableDeclaration | globals.d.ts:375 | { new (fileBits: BlobPart[], fileName: string, options?: FilePropertyBag &#124; undefined): File; prototype: File; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:377 | { new (parts: BlobPart[], name: string, options?: (BlobPropertyBag &amp; { lastModified?: number &#124; Date &#124; undefined; }) &#124; undefined): File; prototype: File; } |
| prototype | PropertySignature | globals.d.ts:378 | File |
| [construct] | ConstructSignature | globals.d.ts:386 | any |
| [TypeLiteral] | TypeLiteral | globals.d.ts:389 | { lastModified?: number &#124; Date &#124; undefined; } |
| lastModified | PropertySignature | globals.d.ts:389 | number &#124; Date &#124; undefined |
| ShadowRealm | InterfaceDeclaration | globals.d.ts:433 | ShadowRealm |
| ShadowRealm.importValue | MethodSignature | globals.d.ts:447 | (specifier: string, bindingName: string) =&gt; Promise&lt;any&gt; |
| ShadowRealm.evaluate | MethodSignature | globals.d.ts:448 | (sourceText: string) =&gt; any |
| ShadowRealm | VariableDeclaration | globals.d.ts:451 | { new (): ShadowRealm; prototype: ShadowRealm; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:451 | { new (): ShadowRealm; prototype: ShadowRealm; } |
| prototype | PropertySignature | globals.d.ts:452 | ShadowRealm |
| [construct] | ConstructSignature | globals.d.ts:453 | any |
| queueMicrotask | FunctionDeclaration | globals.d.ts:456 | { (callback: VoidFunction): void; (callback: (...args: any[]) =&gt; void): void; (callback: () =&gt; void): void; } |
| queueMicrotask.[FunctionType] | FunctionType | globals.d.ts:456 | (...args: any[]) =&gt; void |
| reportError | FunctionDeclaration | globals.d.ts:461 | { (e: any): void; (error: any): void; } |
| Timer | InterfaceDeclaration | globals.d.ts:463 | Timer |
| Timer.ref | MethodSignature | globals.d.ts:464 | () =&gt; Timer |
| Timer.unref | MethodSignature | globals.d.ts:465 | () =&gt; Timer |
| Timer.hasRef | MethodSignature | globals.d.ts:466 | () =&gt; boolean |
| Timer.refresh | MethodSignature | globals.d.ts:467 | () =&gt; Timer |
| Timer.[Symbol.toPrimitive] | MethodSignature | globals.d.ts:469 | () =&gt; number |
| clearInterval | FunctionDeclaration | globals.d.ts:476 | { (id: number &#124; undefined): void; (id?: number &#124; Timer &#124; undefined): void; (timeout: string &#124; number &#124; Timeout &#124; undefined): void; } |
| clearTimeout | FunctionDeclaration | globals.d.ts:481 | { (id: number &#124; undefined): void; (id?: number &#124; Timer &#124; undefined): void; (timeout: string &#124; number &#124; Timeout &#124; undefined): void; } |
| clearImmediate | FunctionDeclaration | globals.d.ts:486 | { (id?: number &#124; Timer &#124; undefined): void; (immediate: Immediate &#124; undefined): void; } |
| setImmediate | FunctionDeclaration | globals.d.ts:491 | typeof setImmediate |
| setInterval | FunctionDeclaration | globals.d.ts:497 | { (handler: TimerHandler, timeout?: number &#124; undefined, ...arguments: any[]): number; (handler: TimerHandler, interval?: number &#124; undefined, ...arguments: any[]): Timer; &lt;TArgs extends any[]&gt;(callback: (...args: TArgs) =&gt; void, delay?: number &#124; undefined, ...args: MakeVoidParameterOptional&lt;...&gt;): Timeout; } |
| setTimeout | FunctionDeclaration | globals.d.ts:503 | typeof setTimeout |
| addEventListener | FunctionDeclaration | globals.d.ts:505 | { &lt;K extends keyof WindowEventMap&gt;(type: K, listener: (this: Window, ev: WindowEventMap[K]) =&gt; any, options?: boolean &#124; AddEventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; &lt;K extends keyof EventMap&gt;(type: K, l... |
| addEventListener.K | TypeParameter | globals.d.ts:505 | K |
| addEventListener.[FunctionType] | FunctionType | globals.d.ts:507 | (this: object, ev: EventMap[K]) =&gt; any |
| addEventListener | FunctionDeclaration | globals.d.ts:510 | { &lt;K extends keyof WindowEventMap&gt;(type: K, listener: (this: Window, ev: WindowEventMap[K]) =&gt; any, options?: boolean &#124; AddEventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; &lt;K extends keyof EventMap&gt;(type: K, l... |
| removeEventListener | FunctionDeclaration | globals.d.ts:515 | { &lt;K extends keyof WindowEventMap&gt;(type: K, listener: (this: Window, ev: WindowEventMap[K]) =&gt; any, options?: boolean &#124; EventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; &lt;K extends keyof EventMap&gt;(type: K, list... |
| removeEventListener.K | TypeParameter | globals.d.ts:515 | K |
| removeEventListener.[FunctionType] | FunctionType | globals.d.ts:517 | (this: object, ev: EventMap[K]) =&gt; any |
| removeEventListener | FunctionDeclaration | globals.d.ts:520 | { &lt;K extends keyof WindowEventMap&gt;(type: K, listener: (this: Window, ev: WindowEventMap[K]) =&gt; any, options?: boolean &#124; EventListenerOptions &#124; undefined): void; (type: string, listener: EventListenerOrEventListenerObject, options?: boolean &#124; ... 1 more ... &#124; undefined): void; &lt;K extends keyof EventMap&gt;(type: K, list... |
| ErrorEvent | InterfaceDeclaration | globals.d.ts:529 | ErrorEvent |
| ErrorEvent.colno | PropertySignature | globals.d.ts:530 | number |
| ErrorEvent.error | PropertySignature | globals.d.ts:531 | any |
| ErrorEvent.filename | PropertySignature | globals.d.ts:532 | string |
| ErrorEvent.lineno | PropertySignature | globals.d.ts:533 | number |
| ErrorEvent.message | PropertySignature | globals.d.ts:534 | string |
| ErrorEvent | VariableDeclaration | globals.d.ts:537 | { new (type: string, eventInitDict?: ErrorEventInit &#124; undefined): ErrorEvent; prototype: ErrorEvent; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:537 | { new (type: string, eventInitDict?: ErrorEventInit &#124; undefined): ErrorEvent; prototype: ErrorEvent; } |
| prototype | PropertySignature | globals.d.ts:538 | ErrorEvent |
| [construct] | ConstructSignature | globals.d.ts:539 | any |
| CloseEvent | InterfaceDeclaration | globals.d.ts:543 | CloseEvent |
| CloseEvent.code | PropertySignature | globals.d.ts:545 | number |
| CloseEvent.reason | PropertySignature | globals.d.ts:547 | string |
| CloseEvent.wasClean | PropertySignature | globals.d.ts:549 | boolean |
| CloseEvent | VariableDeclaration | globals.d.ts:552 | { new (type: string, eventInitDict?: CloseEventInit &#124; undefined): CloseEvent; prototype: CloseEvent; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:552 | { new (type: string, eventInitDict?: CloseEventInit &#124; undefined): CloseEvent; prototype: CloseEvent; } |
| prototype | PropertySignature | globals.d.ts:553 | CloseEvent |
| [construct] | ConstructSignature | globals.d.ts:554 | any |
| MessageEvent | InterfaceDeclaration | globals.d.ts:557 | MessageEvent&lt;T&gt; |
| MessageEvent.T | TypeParameter | globals.d.ts:557 | T |
| MessageEvent | VariableDeclaration | globals.d.ts:558 | { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;T&gt;; prototype: MessageEvent&lt;any&gt;; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:560 | { new &lt;T&gt;(type: string, eventInitDict?: MessageEventInit&lt;T&gt; &#124; undefined): MessageEvent&lt;any&gt;; prototype: MessageEvent&lt;any&gt;; } |
| prototype | PropertySignature | globals.d.ts:561 | MessageEvent&lt;any&gt; |
| [construct] | ConstructSignature | globals.d.ts:562 | any |
| T | TypeParameter | globals.d.ts:562 | T |
| CustomEvent | InterfaceDeclaration | globals.d.ts:566 | CustomEvent&lt;T&gt; |
| CustomEvent.T | TypeParameter | globals.d.ts:566 | T |
| CustomEvent.detail | PropertySignature | globals.d.ts:568 | T |
| CustomEvent | VariableDeclaration | globals.d.ts:571 | { new &lt;T&gt;(type: string, eventInitDict?: CustomEventInit&lt;T&gt; &#124; undefined): CustomEvent&lt;T&gt;; prototype: CustomEvent&lt;any&gt;; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:571 | { new &lt;T&gt;(type: string, eventInitDict?: CustomEventInit&lt;T&gt; &#124; undefined): CustomEvent&lt;T&gt;; prototype: CustomEvent&lt;any&gt;; } |
| prototype | PropertySignature | globals.d.ts:572 | CustomEvent&lt;any&gt; |
| [construct] | ConstructSignature | globals.d.ts:573 | any |
| T | TypeParameter | globals.d.ts:573 | T |
| EventListener | InterfaceDeclaration | globals.d.ts:576 | EventListener |
| EventListener.[call] | CallSignature | globals.d.ts:577 | any |
| EventListenerObject | InterfaceDeclaration | globals.d.ts:580 | EventListenerObject |
| EventListenerObject.handleEvent | MethodSignature | globals.d.ts:581 | { (object: Event): void; (object: Event): void; } |
| FetchEvent | InterfaceDeclaration | globals.d.ts:584 | FetchEvent |
| FetchEvent.request | PropertySignature | globals.d.ts:585 | Request |
| FetchEvent.url | PropertySignature | globals.d.ts:586 | string |
| FetchEvent.waitUntil | MethodSignature | globals.d.ts:588 | (promise: Promise&lt;any&gt;) =&gt; void |
| FetchEvent.respondWith | MethodSignature | globals.d.ts:589 | (response: Promise&lt;Response&gt; &#124; Response) =&gt; void |
| EventMap | InterfaceDeclaration | globals.d.ts:592 | EventMap |
| EventMap.fetch | PropertySignature | globals.d.ts:593 | FetchEvent |
| EventMap.message | PropertySignature | globals.d.ts:594 | MessageEvent&lt;any&gt; |
| EventMap.messageerror | PropertySignature | globals.d.ts:595 | MessageEvent&lt;any&gt; |
| AddEventListenerOptions | InterfaceDeclaration | globals.d.ts:599 | AddEventListenerOptions |
| AddEventListenerOptions.once | PropertySignature | globals.d.ts:600 | boolean &#124; undefined |
| AddEventListenerOptions.passive | PropertySignature | globals.d.ts:601 | boolean &#124; undefined |
| AddEventListenerOptions.signal | PropertySignature | globals.d.ts:602 | AbortSignal &#124; undefined |
| Loader | VariableDeclaration | globals.d.ts:619 | { registry: Map&lt;string, { key: string; state: number; fetch: Promise&lt;any&gt;; instantiate: Promise&lt;any&gt;; satisfy: Promise&lt;any&gt;; dependencies: ...[]; module: { dependenciesMap: Map&lt;...&gt;; }; ... 4 more ...; isAsync: boolean; }&gt;; dependencyKeysIfEvaluated: (specifier: string) =&gt; string[]; resolve: (specifier: string, refe... |
| [TypeLiteral] | TypeLiteral | globals.d.ts:619 | { registry: Map&lt;string, { key: string; state: number; fetch: Promise&lt;any&gt;; instantiate: Promise&lt;any&gt;; satisfy: Promise&lt;any&gt;; dependencies: ...[]; module: { dependenciesMap: Map&lt;...&gt;; }; ... 4 more ...; isAsync: boolean; }&gt;; dependencyKeysIfEvaluated: (specifier: string) =&gt; string[]; resolve: (specifier: string, refe... |
| registry | PropertySignature | globals.d.ts:638 | Map&lt;string, { key: string; state: number; fetch: Promise&lt;any&gt;; instantiate: Promise&lt;any&gt;; satisfy: Promise&lt;any&gt;; dependencies: ...[]; module: { dependenciesMap: Map&lt;string, ...&gt;; }; ... 4 more ...; isAsync: boolean; }&gt; |
| registry.[TypeLiteral] | TypeLiteral | globals.d.ts:640 | { key: string; state: number; fetch: Promise&lt;any&gt;; instantiate: Promise&lt;any&gt;; satisfy: Promise&lt;any&gt;; dependencies: ...[]; module: { dependenciesMap: Map&lt;string, ...&gt;; }; ... 4 more ...; isAsync: boolean; } |
| registry.key | PropertySignature | globals.d.ts:641 | string |
| registry.state | PropertySignature | globals.d.ts:645 | number |
| registry.fetch | PropertySignature | globals.d.ts:646 | Promise&lt;any&gt; |
| registry.instantiate | PropertySignature | globals.d.ts:647 | Promise&lt;any&gt; |
| registry.satisfy | PropertySignature | globals.d.ts:648 | Promise&lt;any&gt; |
| registry.dependencies | PropertySignature | globals.d.ts:649 | { key: string; state: number; fetch: Promise&lt;any&gt;; instantiate: Promise&lt;any&gt;; satisfy: Promise&lt;any&gt;; dependencies: ...[]; module: { dependenciesMap: Map&lt;string, ...&gt;; }; ... 4 more ...; isAsync: boolean; }[] |
| registry.dependencies.V | TypeParameter | globals.d.ts:649 | V |
| registry.module | PropertySignature | globals.d.ts:653 | { dependenciesMap: Map&lt;string, { key: string; state: number; fetch: Promise&lt;any&gt;; instantiate: Promise&lt;any&gt;; satisfy: Promise&lt;any&gt;; dependencies: ...[]; module: ...; ... 4 more ...; isAsync: boolean; }&gt;; } |
| registry.module.[TypeLiteral] | TypeLiteral | globals.d.ts:653 | { dependenciesMap: Map&lt;string, { key: string; state: number; fetch: Promise&lt;any&gt;; instantiate: Promise&lt;any&gt;; satisfy: Promise&lt;any&gt;; dependencies: ...[]; module: ...; ... 4 more ...; isAsync: boolean; }&gt;; } |
| registry.module.dependenciesMap | PropertySignature | globals.d.ts:654 | Map&lt;string, { key: string; state: number; fetch: Promise&lt;any&gt;; instantiate: Promise&lt;any&gt;; satisfy: Promise&lt;any&gt;; dependencies: ...[]; module: { dependenciesMap: Map&lt;string, ...&gt;; }; ... 4 more ...; isAsync: boolean; }&gt; |
| registry.linkError | PropertySignature | globals.d.ts:656 | any |
| registry.linkSucceeded | PropertySignature | globals.d.ts:657 | boolean |
| registry.evaluated | PropertySignature | globals.d.ts:658 | boolean |
| registry.then | PropertySignature | globals.d.ts:659 | any |
| registry.isAsync | PropertySignature | globals.d.ts:660 | boolean |
| dependencyKeysIfEvaluated | PropertySignature | globals.d.ts:686 | (specifier: string) =&gt; string[] |
| dependencyKeysIfEvaluated.[FunctionType] | FunctionType | globals.d.ts:686 | (specifier: string) =&gt; string[] |
| resolve | PropertySignature | globals.d.ts:697 | (specifier: string, referrer: string) =&gt; string |
| resolve.[FunctionType] | FunctionType | globals.d.ts:697 | (specifier: string, referrer: string) =&gt; string |
| QueuingStrategy | InterfaceDeclaration | globals.d.ts:700 | QueuingStrategy&lt;T&gt; |
| QueuingStrategy.T | TypeParameter | globals.d.ts:700 | T |
| QueuingStrategy.highWaterMark | PropertySignature | globals.d.ts:701 | number &#124; undefined |
| QueuingStrategy.size | PropertySignature | globals.d.ts:702 | QueuingStrategySize&lt;T&gt; &#124; undefined |
| QueuingStrategyInit | InterfaceDeclaration | globals.d.ts:705 | QueuingStrategyInit |
| QueuingStrategyInit.highWaterMark | PropertySignature | globals.d.ts:712 | number |
| ByteLengthQueuingStrategy | InterfaceDeclaration | globals.d.ts:716 | ByteLengthQueuingStrategy |
| ByteLengthQueuingStrategy.highWaterMark | PropertySignature | globals.d.ts:717 | number |
| ByteLengthQueuingStrategy.size | PropertySignature | globals.d.ts:720 | QueuingStrategySize&lt;ArrayBufferView&lt;ArrayBufferLike&gt;&gt; |
| ByteLengthQueuingStrategy | VariableDeclaration | globals.d.ts:723 | { new (init: QueuingStrategyInit): ByteLengthQueuingStrategy; prototype: ByteLengthQueuingStrategy; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:723 | { new (init: QueuingStrategyInit): ByteLengthQueuingStrategy; prototype: ByteLengthQueuingStrategy; } |
| prototype | PropertySignature | globals.d.ts:724 | ByteLengthQueuingStrategy |
| [construct] | ConstructSignature | globals.d.ts:725 | any |
| ReadableStreamDefaultController | InterfaceDeclaration | globals.d.ts:728 | ReadableStreamDefaultController&lt;R&gt; |
| ReadableStreamDefaultController.R | TypeParameter | globals.d.ts:728 | R |
| ReadableStreamDefaultController.desiredSize | PropertySignature | globals.d.ts:729 | number &#124; null |
| ReadableStreamDefaultController.close | MethodSignature | globals.d.ts:730 | { (): void; (): void; } |
| ReadableStreamDefaultController.enqueue | MethodSignature | globals.d.ts:731 | { (chunk: R): void; (chunk?: R &#124; undefined): void; } |
| ReadableStreamDefaultController.error | MethodSignature | globals.d.ts:732 | { (e?: any): void; (e?: any): void; } |
| ReadableStreamDirectController | InterfaceDeclaration | globals.d.ts:735 | ReadableStreamDirectController |
| ReadableStreamDirectController.close | MethodSignature | globals.d.ts:741 | (error?: Error &#124; undefined) =&gt; void |
| ReadableStreamDirectController.write | MethodSignature | globals.d.ts:759 | (data: string &#124; BufferSource) =&gt; number &#124; Promise&lt;number&gt; |
| ReadableStreamDirectController.end | MethodSignature | globals.d.ts:760 | () =&gt; number &#124; Promise&lt;number&gt; |
| ReadableStreamDirectController.flush | MethodSignature | globals.d.ts:768 | (wait?: boolean &#124; undefined) =&gt; number &#124; Promise&lt;number&gt; |
| ReadableStreamDirectController.start | MethodSignature | globals.d.ts:769 | () =&gt; void |
| ReadableStreamDefaultController | VariableDeclaration | globals.d.ts:772 | { new (): ReadableStreamDefaultController&lt;any&gt;; prototype: ReadableStreamDefaultController&lt;any&gt;; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:772 | { new (): ReadableStreamDefaultController&lt;any&gt;; prototype: ReadableStreamDefaultController&lt;any&gt;; } |
| prototype | PropertySignature | globals.d.ts:773 | ReadableStreamDefaultController&lt;any&gt; |
| [construct] | ConstructSignature | globals.d.ts:774 | any |
| ReadableStreamDefaultReader | InterfaceDeclaration | globals.d.ts:777 | ReadableStreamDefaultReader&lt;R&gt; |
| ReadableStreamDefaultReader.R | TypeParameter | globals.d.ts:777 | R |
| ReadableStreamDefaultReader.read | MethodSignature | globals.d.ts:778 | { (): Promise&lt;ReadableStreamReadResult&lt;R&gt;&gt;; (): Promise&lt;ReadableStreamDefaultReadResult&lt;R&gt;&gt;; } |
| ReadableStreamDefaultReader.readMany | MethodSignature | globals.d.ts:783 | () =&gt; Promise&lt;ReadableStreamDefaultReadManyResult&lt;R&gt;&gt; &#124; ReadableStreamDefaultReadManyResult&lt;R&gt; |
| ReadableStreamDefaultReader.releaseLock | MethodSignature | globals.d.ts:784 | { (): void; (): void; } |
| ReadableStreamDefaultReader | VariableDeclaration | globals.d.ts:787 | { new &lt;R = any&gt;(stream: ReadableStream&lt;R&gt;): ReadableStreamDefaultReader&lt;R&gt;; prototype: ReadableStreamDefaultReader&lt;any&gt;; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:787 | { new &lt;R = any&gt;(stream: ReadableStream&lt;R&gt;): ReadableStreamDefaultReader&lt;R&gt;; prototype: ReadableStreamDefaultReader&lt;any&gt;; } |
| prototype | PropertySignature | globals.d.ts:788 | ReadableStreamDefaultReader&lt;any&gt; |
| [construct] | ConstructSignature | globals.d.ts:789 | any |
| R | TypeParameter | globals.d.ts:789 | R |
| ReadableStreamGenericReader | InterfaceDeclaration | globals.d.ts:792 | ReadableStreamGenericReader |
| ReadableStreamGenericReader.closed | PropertySignature | globals.d.ts:793 | Promise&lt;void&gt; |
| ReadableStreamGenericReader.cancel | MethodSignature | globals.d.ts:794 | { (reason?: any): Promise&lt;void&gt;; (reason?: any): Promise&lt;void&gt;; } |
| ReadableStreamDefaultReadDoneResult | InterfaceDeclaration | globals.d.ts:797 | ReadableStreamDefaultReadDoneResult |
| ReadableStreamDefaultReadDoneResult.done | PropertySignature | globals.d.ts:798 | true |
| ReadableStreamDefaultReadDoneResult.value | PropertySignature | globals.d.ts:799 | undefined |
| ReadableStreamDefaultReadValueResult | InterfaceDeclaration | globals.d.ts:802 | ReadableStreamDefaultReadValueResult&lt;T&gt; |
| ReadableStreamDefaultReadValueResult.T | TypeParameter | globals.d.ts:802 | T |
| ReadableStreamDefaultReadValueResult.done | PropertySignature | globals.d.ts:803 | false |
| ReadableStreamDefaultReadValueResult.value | PropertySignature | globals.d.ts:804 | T |
| ReadableWritablePair | InterfaceDeclaration | globals.d.ts:815 | ReadableWritablePair&lt;R, W&gt; |
| ReadableWritablePair.R | TypeParameter | globals.d.ts:815 | R |
| ReadableWritablePair.W | TypeParameter | globals.d.ts:815 | W |
| ReadableWritablePair.readable | PropertySignature | globals.d.ts:816 | ReadableStream&lt;R&gt; |
| ReadableWritablePair.writable | PropertySignature | globals.d.ts:817 | WritableStream&lt;W&gt; |
| WritableStreamDefaultController | InterfaceDeclaration | globals.d.ts:820 | WritableStreamDefaultController |
| WritableStreamDefaultController.error | MethodSignature | globals.d.ts:821 | { (e?: any): void; (e?: any): void; } |
| WritableStreamDefaultController | VariableDeclaration | globals.d.ts:824 | { new (): WritableStreamDefaultController; prototype: WritableStreamDefaultController; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:824 | { new (): WritableStreamDefaultController; prototype: WritableStreamDefaultController; } |
| prototype | PropertySignature | globals.d.ts:825 | WritableStreamDefaultController |
| [construct] | ConstructSignature | globals.d.ts:826 | any |
| WritableStreamDefaultWriter | InterfaceDeclaration | globals.d.ts:830 | WritableStreamDefaultWriter&lt;W&gt; |
| WritableStreamDefaultWriter.W | TypeParameter | globals.d.ts:830 | W |
| WritableStreamDefaultWriter.closed | PropertySignature | globals.d.ts:831 | Promise&lt;void&gt; |
| WritableStreamDefaultWriter.desiredSize | PropertySignature | globals.d.ts:832 | number &#124; null |
| WritableStreamDefaultWriter.ready | PropertySignature | globals.d.ts:833 | Promise&lt;void&gt; |
| WritableStreamDefaultWriter.abort | MethodSignature | globals.d.ts:834 | { (reason?: any): Promise&lt;void&gt;; (reason?: any): Promise&lt;void&gt;; } |
| WritableStreamDefaultWriter.close | MethodSignature | globals.d.ts:835 | { (): Promise&lt;void&gt;; (): Promise&lt;void&gt;; } |
| WritableStreamDefaultWriter.releaseLock | MethodSignature | globals.d.ts:836 | { (): void; (): void; } |
| WritableStreamDefaultWriter.write | MethodSignature | globals.d.ts:837 | { (chunk?: W &#124; undefined): Promise&lt;void&gt;; (chunk?: W &#124; undefined): Promise&lt;void&gt;; } |
| WritableStreamDefaultWriter | VariableDeclaration | globals.d.ts:840 | { new &lt;W = any&gt;(stream: WritableStream&lt;W&gt;): WritableStreamDefaultWriter&lt;W&gt;; prototype: WritableStreamDefaultWriter&lt;any&gt;; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:840 | { new &lt;W = any&gt;(stream: WritableStream&lt;W&gt;): WritableStreamDefaultWriter&lt;W&gt;; prototype: WritableStreamDefaultWriter&lt;any&gt;; } |
| prototype | PropertySignature | globals.d.ts:841 | WritableStreamDefaultWriter&lt;any&gt; |
| [construct] | ConstructSignature | globals.d.ts:842 | any |
| W | TypeParameter | globals.d.ts:842 | W |
| TransformStream | InterfaceDeclaration | globals.d.ts:845 | TransformStream&lt;I, O&gt; |
| TransformStream.I | TypeParameter | globals.d.ts:845 | I |
| TransformStream.O | TypeParameter | globals.d.ts:845 | O |
| TransformStream.readable | PropertySignature | globals.d.ts:846 | ReadableStream&lt;O&gt; |
| TransformStream.writable | PropertySignature | globals.d.ts:847 | WritableStream&lt;I&gt; |
| TransformStream | VariableDeclaration | globals.d.ts:850 | { new &lt;I = any, O = any&gt;(transformer?: Transformer&lt;I, O&gt; &#124; undefined, writableStrategy?: QueuingStrategy&lt;I&gt; &#124; undefined, readableStrategy?: QueuingStrategy&lt;O&gt; &#124; undefined): TransformStream&lt;...&gt;; prototype: TransformStream&lt;...&gt;; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:850 | { new &lt;I = any, O = any&gt;(transformer?: Transformer&lt;I, O&gt; &#124; undefined, writableStrategy?: QueuingStrategy&lt;I&gt; &#124; undefined, readableStrategy?: QueuingStrategy&lt;O&gt; &#124; undefined): TransformStream&lt;...&gt;; prototype: TransformStream&lt;...&gt;; } |
| prototype | PropertySignature | globals.d.ts:851 | TransformStream&lt;any, any&gt; |
| [construct] | ConstructSignature | globals.d.ts:852 | any |
| I | TypeParameter | globals.d.ts:852 | I |
| O | TypeParameter | globals.d.ts:852 | O |
| TransformStreamDefaultController | InterfaceDeclaration | globals.d.ts:859 | TransformStreamDefaultController&lt;O&gt; |
| TransformStreamDefaultController.O | TypeParameter | globals.d.ts:859 | O |
| TransformStreamDefaultController.desiredSize | PropertySignature | globals.d.ts:860 | number &#124; null |
| TransformStreamDefaultController.enqueue | MethodSignature | globals.d.ts:861 | { (chunk?: O &#124; undefined): void; (chunk?: O &#124; undefined): void; } |
| TransformStreamDefaultController.error | MethodSignature | globals.d.ts:862 | { (reason?: any): void; (reason?: any): void; } |
| TransformStreamDefaultController.terminate | MethodSignature | globals.d.ts:863 | { (): void; (): void; } |
| TransformStreamDefaultController | VariableDeclaration | globals.d.ts:866 | { new (): TransformStreamDefaultController&lt;any&gt;; prototype: TransformStreamDefaultController&lt;any&gt;; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:866 | { new (): TransformStreamDefaultController&lt;any&gt;; prototype: TransformStreamDefaultController&lt;any&gt;; } |
| prototype | PropertySignature | globals.d.ts:867 | TransformStreamDefaultController&lt;any&gt; |
| [construct] | ConstructSignature | globals.d.ts:868 | any |
| StreamPipeOptions | InterfaceDeclaration | globals.d.ts:901 | StreamPipeOptions |
| StreamPipeOptions.preventAbort | PropertySignature | globals.d.ts:902 | boolean &#124; undefined |
| StreamPipeOptions.preventCancel | PropertySignature | globals.d.ts:903 | boolean &#124; undefined |
| StreamPipeOptions.preventClose | PropertySignature | globals.d.ts:904 | boolean &#124; undefined |
| StreamPipeOptions.signal | PropertySignature | globals.d.ts:905 | AbortSignal &#124; undefined |
| CountQueuingStrategy | InterfaceDeclaration | globals.d.ts:909 | CountQueuingStrategy |
| CountQueuingStrategy.highWaterMark | PropertySignature | globals.d.ts:910 | number |
| CountQueuingStrategy.size | PropertySignature | globals.d.ts:911 | QueuingStrategySize&lt;any&gt; |
| CountQueuingStrategy | VariableDeclaration | globals.d.ts:914 | { new (init: QueuingStrategyInit): CountQueuingStrategy; prototype: CountQueuingStrategy; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:914 | { new (init: QueuingStrategyInit): CountQueuingStrategy; prototype: CountQueuingStrategy; } |
| prototype | PropertySignature | globals.d.ts:915 | CountQueuingStrategy |
| [construct] | ConstructSignature | globals.d.ts:916 | any |
| QueuingStrategySize | InterfaceDeclaration | globals.d.ts:919 | QueuingStrategySize&lt;T&gt; |
| QueuingStrategySize.T | TypeParameter | globals.d.ts:919 | T |
| QueuingStrategySize.[call] | CallSignature | globals.d.ts:920 | any |
| Transformer | InterfaceDeclaration | globals.d.ts:923 | Transformer&lt;I, O&gt; |
| Transformer.I | TypeParameter | globals.d.ts:923 | I |
| Transformer.O | TypeParameter | globals.d.ts:923 | O |
| Transformer.flush | PropertySignature | globals.d.ts:924 | TransformerFlushCallback&lt;O&gt; &#124; undefined |
| Transformer.readableType | PropertySignature | globals.d.ts:925 | undefined |
| Transformer.start | PropertySignature | globals.d.ts:926 | TransformerStartCallback&lt;O&gt; &#124; undefined |
| Transformer.transform | PropertySignature | globals.d.ts:927 | TransformerTransformCallback&lt;I, O&gt; &#124; undefined |
| Transformer.writableType | PropertySignature | globals.d.ts:928 | undefined |
| Dict | InterfaceDeclaration | globals.d.ts:931 | Dict&lt;T&gt; |
| Dict.T | TypeParameter | globals.d.ts:931 | T |
| Dict.[index] | IndexSignature | globals.d.ts:932 | any |
| ReadOnlyDict | InterfaceDeclaration | globals.d.ts:935 | ReadOnlyDict&lt;T&gt; |
| ReadOnlyDict.T | TypeParameter | globals.d.ts:935 | T |
| ReadOnlyDict.[index] | IndexSignature | globals.d.ts:936 | any |
| ErrnoException | InterfaceDeclaration | globals.d.ts:939 | ErrnoException |
| ErrnoException.errno | PropertySignature | globals.d.ts:940 | number &#124; undefined |
| ErrnoException.code | PropertySignature | globals.d.ts:941 | string &#124; undefined |
| ErrnoException.path | PropertySignature | globals.d.ts:942 | string &#124; undefined |
| ErrnoException.syscall | PropertySignature | globals.d.ts:943 | string &#124; undefined |
| DOMException | InterfaceDeclaration | globals.d.ts:950 | DOMException |
| DOMException.message | PropertySignature | globals.d.ts:951 | string |
| DOMException.name | PropertySignature | globals.d.ts:952 | string |
| DOMException.INDEX_SIZE_ERR | PropertySignature | globals.d.ts:953 | 1 |
| DOMException.DOMSTRING_SIZE_ERR | PropertySignature | globals.d.ts:954 | 2 |
| DOMException.HIERARCHY_REQUEST_ERR | PropertySignature | globals.d.ts:955 | 3 |
| DOMException.WRONG_DOCUMENT_ERR | PropertySignature | globals.d.ts:956 | 4 |
| DOMException.INVALID_CHARACTER_ERR | PropertySignature | globals.d.ts:957 | 5 |
| DOMException.NO_DATA_ALLOWED_ERR | PropertySignature | globals.d.ts:958 | 6 |
| DOMException.NO_MODIFICATION_ALLOWED_ERR | PropertySignature | globals.d.ts:959 | 7 |
| DOMException.NOT_FOUND_ERR | PropertySignature | globals.d.ts:960 | 8 |
| DOMException.NOT_SUPPORTED_ERR | PropertySignature | globals.d.ts:961 | 9 |
| DOMException.INUSE_ATTRIBUTE_ERR | PropertySignature | globals.d.ts:962 | 10 |
| DOMException.INVALID_STATE_ERR | PropertySignature | globals.d.ts:963 | 11 |
| DOMException.SYNTAX_ERR | PropertySignature | globals.d.ts:964 | 12 |
| DOMException.INVALID_MODIFICATION_ERR | PropertySignature | globals.d.ts:965 | 13 |
| DOMException.NAMESPACE_ERR | PropertySignature | globals.d.ts:966 | 14 |
| DOMException.INVALID_ACCESS_ERR | PropertySignature | globals.d.ts:967 | 15 |
| DOMException.VALIDATION_ERR | PropertySignature | globals.d.ts:968 | 16 |
| DOMException.TYPE_MISMATCH_ERR | PropertySignature | globals.d.ts:969 | 17 |
| DOMException.SECURITY_ERR | PropertySignature | globals.d.ts:970 | 18 |
| DOMException.NETWORK_ERR | PropertySignature | globals.d.ts:971 | 19 |
| DOMException.ABORT_ERR | PropertySignature | globals.d.ts:972 | 20 |
| DOMException.URL_MISMATCH_ERR | PropertySignature | globals.d.ts:973 | 21 |
| DOMException.QUOTA_EXCEEDED_ERR | PropertySignature | globals.d.ts:974 | 22 |
| DOMException.TIMEOUT_ERR | PropertySignature | globals.d.ts:975 | 23 |
| DOMException.INVALID_NODE_TYPE_ERR | PropertySignature | globals.d.ts:976 | 24 |
| DOMException.DATA_CLONE_ERR | PropertySignature | globals.d.ts:977 | 25 |
| DOMException | VariableDeclaration | globals.d.ts:979 | { new (message?: string &#124; undefined, name?: string &#124; undefined): DOMException; prototype: DOMException; readonly INDEX_SIZE_ERR: 1; readonly DOMSTRING_SIZE_ERR: 2; ... 22 more ...; readonly DATA_CLONE_ERR: 25; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:979 | { new (message?: string &#124; undefined, name?: string &#124; undefined): DOMException; prototype: DOMException; readonly INDEX_SIZE_ERR: 1; readonly DOMSTRING_SIZE_ERR: 2; ... 22 more ...; readonly DATA_CLONE_ERR: 25; } |
| prototype | PropertySignature | globals.d.ts:980 | DOMException |
| [construct] | ConstructSignature | globals.d.ts:981 | any |
| INDEX_SIZE_ERR | PropertySignature | globals.d.ts:982 | 1 |
| DOMSTRING_SIZE_ERR | PropertySignature | globals.d.ts:983 | 2 |
| HIERARCHY_REQUEST_ERR | PropertySignature | globals.d.ts:984 | 3 |
| WRONG_DOCUMENT_ERR | PropertySignature | globals.d.ts:985 | 4 |
| INVALID_CHARACTER_ERR | PropertySignature | globals.d.ts:986 | 5 |
| NO_DATA_ALLOWED_ERR | PropertySignature | globals.d.ts:987 | 6 |
| NO_MODIFICATION_ALLOWED_ERR | PropertySignature | globals.d.ts:988 | 7 |
| NOT_FOUND_ERR | PropertySignature | globals.d.ts:989 | 8 |
| NOT_SUPPORTED_ERR | PropertySignature | globals.d.ts:990 | 9 |
| INUSE_ATTRIBUTE_ERR | PropertySignature | globals.d.ts:991 | 10 |
| INVALID_STATE_ERR | PropertySignature | globals.d.ts:992 | 11 |
| SYNTAX_ERR | PropertySignature | globals.d.ts:993 | 12 |
| INVALID_MODIFICATION_ERR | PropertySignature | globals.d.ts:994 | 13 |
| NAMESPACE_ERR | PropertySignature | globals.d.ts:995 | 14 |
| INVALID_ACCESS_ERR | PropertySignature | globals.d.ts:996 | 15 |
| VALIDATION_ERR | PropertySignature | globals.d.ts:997 | 16 |
| TYPE_MISMATCH_ERR | PropertySignature | globals.d.ts:998 | 17 |
| SECURITY_ERR | PropertySignature | globals.d.ts:999 | 18 |
| NETWORK_ERR | PropertySignature | globals.d.ts:1000 | 19 |
| ABORT_ERR | PropertySignature | globals.d.ts:1001 | 20 |
| URL_MISMATCH_ERR | PropertySignature | globals.d.ts:1002 | 21 |
| QUOTA_EXCEEDED_ERR | PropertySignature | globals.d.ts:1003 | 22 |
| TIMEOUT_ERR | PropertySignature | globals.d.ts:1004 | 23 |
| INVALID_NODE_TYPE_ERR | PropertySignature | globals.d.ts:1005 | 24 |
| DATA_CLONE_ERR | PropertySignature | globals.d.ts:1006 | 25 |
| alert | FunctionDeclaration | globals.d.ts:1009 | { (message?: any): void; (message?: string &#124; undefined): void; } |
| confirm | FunctionDeclaration | globals.d.ts:1010 | { (message?: string &#124; undefined): boolean; (message?: string &#124; undefined): boolean; } |
| prompt | FunctionDeclaration | globals.d.ts:1011 | { (message?: string &#124; undefined, _default?: string &#124; undefined): string &#124; null; (message?: string &#124; undefined, _default?: string &#124; undefined): string &#124; null; } |
| SubtleCrypto | InterfaceDeclaration | globals.d.ts:1013 | SubtleCrypto |
| SubtleCrypto | VariableDeclaration | globals.d.ts:1014 | { new (): SubtleCrypto; prototype: SubtleCrypto; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1014 | { new (): SubtleCrypto; prototype: SubtleCrypto; } |
| prototype | PropertySignature | globals.d.ts:1015 | SubtleCrypto |
| [construct] | ConstructSignature | globals.d.ts:1016 | any |
| CryptoKey | InterfaceDeclaration | globals.d.ts:1019 | CryptoKey |
| CryptoKey | VariableDeclaration | globals.d.ts:1020 | { new (): CryptoKey; prototype: CryptoKey; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1020 | { new (): CryptoKey; prototype: CryptoKey; } |
| prototype | PropertySignature | globals.d.ts:1021 | CryptoKey |
| [construct] | ConstructSignature | globals.d.ts:1022 | any |
| CryptoKeyPair | InterfaceDeclaration | globals.d.ts:1025 | CryptoKeyPair |
| Position | InterfaceDeclaration | globals.d.ts:1027 | Position |
| Position.lineText | PropertySignature | globals.d.ts:1028 | string |
| Position.file | PropertySignature | globals.d.ts:1029 | string |
| Position.namespace | PropertySignature | globals.d.ts:1030 | string |
| Position.line | PropertySignature | globals.d.ts:1031 | number |
| Position.column | PropertySignature | globals.d.ts:1032 | number |
| Position.length | PropertySignature | globals.d.ts:1033 | number |
| Position.offset | PropertySignature | globals.d.ts:1034 | number |
| ResolveMessage | ClassDeclaration | globals.d.ts:1037 | ResolveMessage |
| ResolveMessage.name | PropertyDeclaration | globals.d.ts:1038 | "ResolveMessage" |
| ResolveMessage.position | PropertyDeclaration | globals.d.ts:1039 | Position &#124; null |
| ResolveMessage.code | PropertyDeclaration | globals.d.ts:1040 | string |
| ResolveMessage.message | PropertyDeclaration | globals.d.ts:1041 | string |
| ResolveMessage.referrer | PropertyDeclaration | globals.d.ts:1042 | string |
| ResolveMessage.specifier | PropertyDeclaration | globals.d.ts:1043 | string |
| ResolveMessage.importKind | PropertyDeclaration | globals.d.ts:1044 | "at" &#124; "at_conditional" &#124; "dynamic" &#124; "entry_point" &#124; "import" &#124; "internal" &#124; "require" &#124; "require_resolve" &#124; "stmt" &#124; "url" |
| ResolveMessage.level | PropertyDeclaration | globals.d.ts:1055 | "debug" &#124; "error" &#124; "info" &#124; "verbose" &#124; "warning" |
| ResolveMessage.toString | MethodDeclaration | globals.d.ts:1057 | () =&gt; string |
| BuildMessage | ClassDeclaration | globals.d.ts:1060 | BuildMessage |
| BuildMessage.name | PropertyDeclaration | globals.d.ts:1061 | "BuildMessage" |
| BuildMessage.position | PropertyDeclaration | globals.d.ts:1062 | Position &#124; null |
| BuildMessage.message | PropertyDeclaration | globals.d.ts:1063 | string |
| BuildMessage.level | PropertyDeclaration | globals.d.ts:1064 | "debug" &#124; "error" &#124; "info" &#124; "verbose" &#124; "warning" |
| ErrorOptions | InterfaceDeclaration | globals.d.ts:1067 | ErrorOptions |
| ErrorOptions.cause | PropertySignature | globals.d.ts:1071 | unknown |
| Error | InterfaceDeclaration | globals.d.ts:1074 | Error |
| Error.cause | PropertySignature | globals.d.ts:1078 | unknown |
| ErrorConstructor | InterfaceDeclaration | globals.d.ts:1081 | ErrorConstructor |
| ErrorConstructor.[construct] | ConstructSignature | globals.d.ts:1082 | any |
| ErrorConstructor.isError | MethodSignature | globals.d.ts:1090 | { (error: unknown): error is Error; (value: unknown): value is Error; } |
| ErrorConstructor.captureStackTrace | MethodSignature | globals.d.ts:1095 | { (targetObject: object, constructorOpt?: Function &#124; undefined): void; (targetObject: object, constructorOpt?: Function &#124; undefined): void; } |
| ErrorConstructor.stackTraceLimit | PropertySignature | globals.d.ts:1100 | number |
| ArrayBufferConstructor | InterfaceDeclaration | globals.d.ts:1103 | ArrayBufferConstructor |
| ArrayBufferConstructor.[construct] | ConstructSignature | globals.d.ts:1104 | any |
| ArrayBufferConstructor.[TypeLiteral] | TypeLiteral | globals.d.ts:1104 | { maxByteLength?: number &#124; undefined; } |
| ArrayBufferConstructor.maxByteLength | PropertySignature | globals.d.ts:1104 | number &#124; undefined |
| ArrayBuffer | InterfaceDeclaration | globals.d.ts:1107 | ArrayBuffer |
| ArrayBuffer.byteLength | PropertySignature | globals.d.ts:1111 | number |
| ArrayBuffer.resize | MethodSignature | globals.d.ts:1116 | { (newByteLength?: number &#124; undefined): void; (byteLength: number): ArrayBuffer; } |
| ArrayBuffer.slice | MethodSignature | globals.d.ts:1121 | { (begin?: number &#124; undefined, end?: number &#124; undefined): ArrayBuffer; (begin: number, end?: number &#124; undefined): ArrayBuffer; } |
| SharedArrayBuffer | InterfaceDeclaration | globals.d.ts:1124 | SharedArrayBuffer |
| SharedArrayBuffer.grow | MethodSignature | globals.d.ts:1128 | { (newByteLength?: number &#124; undefined): void; (size: number): SharedArrayBuffer; } |
| ArrayConstructor | InterfaceDeclaration | globals.d.ts:1131 | ArrayConstructor |
| ArrayConstructor.fromAsync | MethodSignature | globals.d.ts:1145 | { &lt;T&gt;(iterableOrArrayLike: ArrayLike&lt;T &#124; PromiseLike&lt;T&gt;&gt; &#124; AsyncIterable&lt;T&gt; &#124; Iterable&lt;T &#124; PromiseLike&lt;T&gt;&gt;): Promise&lt;...&gt;; &lt;T, U&gt;(iterableOrArrayLike: ArrayLike&lt;...&gt; &#124; ... 1 more ... &#124; Iterable&lt;...&gt;, mapFn: (value: Awaited&lt;...&gt;, index: number) =&gt; U, thisArg?: any): Promise&lt;...&gt;; &lt;T&gt;(arrayLike: ArrayLike&lt;...&gt; &#124; ... 1... |
| ArrayConstructor.fromAsync.T | TypeParameter | globals.d.ts:1145 | T |
| ArrayConstructor.fromAsync | MethodSignature | globals.d.ts:1164 | { &lt;T&gt;(iterableOrArrayLike: ArrayLike&lt;T &#124; PromiseLike&lt;T&gt;&gt; &#124; AsyncIterable&lt;T&gt; &#124; Iterable&lt;T &#124; PromiseLike&lt;T&gt;&gt;): Promise&lt;...&gt;; &lt;T, U&gt;(iterableOrArrayLike: ArrayLike&lt;...&gt; &#124; ... 1 more ... &#124; Iterable&lt;...&gt;, mapFn: (value: Awaited&lt;...&gt;, index: number) =&gt; U, thisArg?: any): Promise&lt;...&gt;; &lt;T&gt;(arrayLike: ArrayLike&lt;...&gt; &#124; ... 1... |
| ArrayConstructor.fromAsync.T | TypeParameter | globals.d.ts:1164 | T |
| ArrayConstructor.fromAsync.U | TypeParameter | globals.d.ts:1164 | U |
| ArrayConstructor.fromAsync.[FunctionType] | FunctionType | globals.d.ts:1166 | (value: T, index: number) =&gt; U |
| ConsoleOptions | InterfaceDeclaration | globals.d.ts:1171 | ConsoleOptions |
| ConsoleOptions.stdout | PropertySignature | globals.d.ts:1172 | Writable |
| ConsoleOptions.stderr | PropertySignature | globals.d.ts:1173 | Writable &#124; undefined |
| ConsoleOptions.ignoreErrors | PropertySignature | globals.d.ts:1174 | boolean &#124; undefined |
| ConsoleOptions.colorMode | PropertySignature | globals.d.ts:1175 | "auto" &#124; boolean &#124; undefined |
| ConsoleOptions.inspectOptions | PropertySignature | globals.d.ts:1176 | InspectOptions &#124; undefined |
| ConsoleOptions.groupIndentation | PropertySignature | globals.d.ts:1177 | number &#124; undefined |
| Console | InterfaceDeclaration | globals.d.ts:1180 | Console |
| Console./**    * Asynchronously read lines from standard input (fd 0)    *    * ```ts    * for await (const line of console) {    *   console.log(line);    * }    * ```    */   [Symbol.asyncIterator] | MethodSignature | globals.d.ts:1190 | () =&gt; AsyncIterableIterator&lt;string&gt; |
| Console.write | MethodSignature | globals.d.ts:1217 | (...data: (string &#124; ArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;)[]) =&gt; number &#124; Promise&lt;number&gt; |
| Console.clear | MethodSignature | globals.d.ts:1222 | { (): void; (): void; } |
| Console.assert | MethodSignature | globals.d.ts:1224 | { (condition?: boolean &#124; undefined, ...data: any[]): void; (condition?: boolean &#124; undefined, ...data: any[]): void; } |
| Console.count | MethodSignature | globals.d.ts:1230 | { (label?: string &#124; undefined): void; (label?: string &#124; undefined): void; } |
| Console.countReset | MethodSignature | globals.d.ts:1231 | { (label?: string &#124; undefined): void; (label?: string &#124; undefined): void; } |
| Console.debug | MethodSignature | globals.d.ts:1232 | { (...data: any[]): void; (...data: any[]): void; } |
| Console.dir | MethodSignature | globals.d.ts:1233 | { (item?: any, options?: any): void; (item?: any, options?: any): void; } |
| Console.dirxml | MethodSignature | globals.d.ts:1234 | { (...data: any[]): void; (...data: any[]): void; } |
| Console.error | MethodSignature | globals.d.ts:1242 | { (...data: any[]): void; (...data: any[]): void; } |
| Console.group | MethodSignature | globals.d.ts:1244 | { (...data: any[]): void; (...data: any[]): void; } |
| Console.groupCollapsed | MethodSignature | globals.d.ts:1246 | { (...data: any[]): void; (...data: any[]): void; } |
| Console.groupEnd | MethodSignature | globals.d.ts:1248 | { (): void; (): void; } |
| Console.info | MethodSignature | globals.d.ts:1249 | { (...data: any[]): void; (...data: any[]): void; } |
| Console.log | MethodSignature | globals.d.ts:1250 | { (...data: any[]): void; (...data: any[]): void; } |
| Console.table | MethodSignature | globals.d.ts:1281 | { (tabularData?: any, properties?: string[] &#124; undefined): void; (tabularData?: any, properties?: string[] &#124; undefined): void; } |
| Console.time | MethodSignature | globals.d.ts:1296 | { (label?: string &#124; undefined): void; (label?: string &#124; undefined): void; } |
| Console.timeEnd | MethodSignature | globals.d.ts:1311 | { (label?: string &#124; undefined): void; (label?: string &#124; undefined): void; } |
| Console.timeLog | MethodSignature | globals.d.ts:1312 | { (label?: string &#124; undefined, ...data: any[]): void; (label?: string &#124; undefined, ...data: any[]): void; } |
| Console.timeStamp | MethodSignature | globals.d.ts:1313 | { (label?: string &#124; undefined): void; (label?: string &#124; undefined): void; } |
| Console.trace | MethodSignature | globals.d.ts:1314 | { (...data: any[]): void; (...data: any[]): void; } |
| Console.warn | MethodSignature | globals.d.ts:1315 | { (...data: any[]): void; (...data: any[]): void; } |
| console | VariableDeclaration | globals.d.ts:1330 | Console |
| ImportMetaEnv | InterfaceDeclaration | globals.d.ts:1332 | ImportMetaEnv |
| ImportMetaEnv.[index] | IndexSignature | globals.d.ts:1333 | any |
| ImportMeta | InterfaceDeclaration | globals.d.ts:1336 | ImportMeta |
| ImportMeta.url | PropertySignature | globals.d.ts:1346 | string |
| ImportMeta.path | PropertySignature | globals.d.ts:1350 | string |
| ImportMeta.dir | PropertySignature | globals.d.ts:1355 | string |
| ImportMeta.file | PropertySignature | globals.d.ts:1359 | string |
| ImportMeta.env | PropertySignature | globals.d.ts:1367 | Env &amp; ProcessEnv &amp; ImportMetaEnv |
| ImportMeta.resolveSync | MethodSignature | globals.d.ts:1376 | (moduleId: string, parent?: string &#124; undefined) =&gt; string |
| ImportMeta.require | PropertySignature | globals.d.ts:1386 | Require |
| ImportMeta.main | PropertySignature | globals.d.ts:1405 | boolean |
| ImportMeta.dirname | PropertySignature | globals.d.ts:1408 | string |
| ImportMeta.filename | PropertySignature | globals.d.ts:1411 | string |
| require | VariableDeclaration | globals.d.ts:1419 | Require |
| exports | VariableDeclaration | globals.d.ts:1422 | any |
| NodeModule | InterfaceDeclaration | globals.d.ts:1424 | NodeModule |
| NodeModule.exports | PropertySignature | globals.d.ts:1425 | any |
| module | VariableDeclaration | globals.d.ts:1428 | NodeModule |
| structuredClone | FunctionDeclaration | globals.d.ts:1435 | { &lt;T = any&gt;(value: T, options?: StructuredSerializeOptions &#124; undefined): T; &lt;T&gt;(value: T, options?: StructuredSerializeOptions &#124; undefined): T; &lt;T = any&gt;(value: T, options?: StructuredSerializeOptions &#124; undefined): T; } |
| structuredClone.T | TypeParameter | globals.d.ts:1435 | T |
| postMessage | FunctionDeclaration | globals.d.ts:1442 | { (message: any, targetOrigin: string, transfer?: Transferable[] &#124; undefined): void; (message: any, options?: WindowPostMessageOptions &#124; undefined): void; (message: any, transfer?: Transferable[] &#124; undefined): void; } |
| EventSourceInit | InterfaceDeclaration | globals.d.ts:1444 | EventSourceInit |
| EventSourceInit.withCredentials | PropertySignature | globals.d.ts:1445 | boolean &#124; undefined |
| PromiseConstructor | InterfaceDeclaration | globals.d.ts:1448 | PromiseConstructor |
| PromiseConstructor.withResolvers | MethodSignature | globals.d.ts:1464 | { &lt;T&gt;(): PromiseWithResolvers&lt;T&gt;; &lt;T&gt;(): { promise: Promise&lt;T&gt;; resolve: (value?: T &#124; PromiseLike&lt;T&gt; &#124; undefined) =&gt; void; reject: (reason?: any) =&gt; void; }; } |
| PromiseConstructor.withResolvers.T | TypeParameter | globals.d.ts:1464 | T |
| PromiseConstructor.withResolvers.[TypeLiteral] | TypeLiteral | globals.d.ts:1464 | { promise: Promise&lt;T&gt;; resolve: (value?: T &#124; PromiseLike&lt;T&gt; &#124; undefined) =&gt; void; reject: (reason?: any) =&gt; void; } |
| PromiseConstructor.withResolvers.promise | PropertySignature | globals.d.ts:1465 | Promise&lt;T&gt; |
| PromiseConstructor.withResolvers.resolve | PropertySignature | globals.d.ts:1466 | (value?: T &#124; PromiseLike&lt;T&gt; &#124; undefined) =&gt; void |
| PromiseConstructor.withResolvers.resolve.[FunctionType] | FunctionType | globals.d.ts:1466 | (value?: T &#124; PromiseLike&lt;T&gt; &#124; undefined) =&gt; void |
| PromiseConstructor.withResolvers.reject | PropertySignature | globals.d.ts:1467 | (reason?: any) =&gt; void |
| PromiseConstructor.withResolvers.reject.[FunctionType] | FunctionType | globals.d.ts:1467 | (reason?: any) =&gt; void |
| PromiseConstructor.try | MethodSignature | globals.d.ts:1478 | { &lt;T, U extends unknown[]&gt;(callbackFn: (...args: U) =&gt; T &#124; PromiseLike&lt;T&gt;, ...args: U): Promise&lt;Awaited&lt;T&gt;&gt;; &lt;T, A extends any[] = []&gt;(fn: (...args: A) =&gt; T &#124; PromiseLike&lt;T&gt;, ...args: A): Promise&lt;...&gt;; } |
| PromiseConstructor.try.T | TypeParameter | globals.d.ts:1478 | T |
| PromiseConstructor.try.A | TypeParameter | globals.d.ts:1478 | A |
| PromiseConstructor.try.[FunctionType] | FunctionType | globals.d.ts:1478 | (...args: A) =&gt; T &#124; PromiseLike&lt;T&gt; |
| Navigator | InterfaceDeclaration | globals.d.ts:1481 | Navigator |
| Navigator.userAgent | PropertySignature | globals.d.ts:1482 | string |
| Navigator.platform | PropertySignature | globals.d.ts:1483 | "Linux x86_64" &#124; "MacIntel" &#124; "Win32" |
| Navigator.hardwareConcurrency | PropertySignature | globals.d.ts:1484 | number |
| navigator | VariableDeclaration | globals.d.ts:1487 | Navigator |
| BlobPropertyBag | InterfaceDeclaration | globals.d.ts:1489 | BlobPropertyBag |
| BlobPropertyBag.type | PropertySignature | globals.d.ts:1491 | string &#124; undefined |
| WorkerOptions | InterfaceDeclaration | globals.d.ts:1496 | WorkerOptions |
| Blob | InterfaceDeclaration | globals.d.ts:1498 | Blob |
| Blob.size | PropertySignature | globals.d.ts:1502 | number |
| Blob.type | PropertySignature | globals.d.ts:1507 | string |
| Blob.slice | MethodSignature | globals.d.ts:1517 | { (start?: number &#124; undefined, end?: number &#124; undefined, contentType?: string &#124; undefined): Blob; (start?: number &#124; undefined, end?: number &#124; undefined, contentType?: string &#124; undefined): Blob; } |
| Blob.json | MethodSignature | globals.d.ts:1524 | () =&gt; Promise&lt;any&gt; |
| Blob.image | MethodSignature | globals.d.ts:1537 | (options?: ConstructorOptions &#124; undefined) =&gt; Image |
| Blob.formData | MethodSignature | globals.d.ts:1550 | () =&gt; Promise&lt;FormData&gt; |
| Blob.text | MethodSignature | globals.d.ts:1555 | { (): Promise&lt;string&gt;; (): Promise&lt;string&gt;; } |
| Blob.arrayBuffer | MethodSignature | globals.d.ts:1560 | { (): Promise&lt;ArrayBuffer&gt;; (): Promise&lt;ArrayBuffer&gt;; } |
| Blob.bytes | MethodSignature | globals.d.ts:1565 | { (): Promise&lt;Uint8Array&lt;ArrayBuffer&gt;&gt;; (): Promise&lt;Uint8Array&lt;ArrayBuffer&gt;&gt;; } |
| Blob.stream | MethodSignature | globals.d.ts:1570 | { (): ReadableStream&lt;Uint8Array&lt;ArrayBuffer&gt;&gt;; (): ReadableStream&lt;Uint8Array&lt;ArrayBuffer&gt;&gt;; } |
| Blob | VariableDeclaration | globals.d.ts:1573 | { new (blobParts?: BlobPart[] &#124; undefined, options?: BlobPropertyBag &#124; undefined): Blob; prototype: Blob; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1575 | { new (blobParts?: BlobPart[] &#124; undefined, options?: BlobPropertyBag &#124; undefined): Blob; prototype: Blob; } |
| prototype | PropertySignature | globals.d.ts:1576 | Blob |
| [construct] | ConstructSignature | globals.d.ts:1577 | any |
| Uint8Array | InterfaceDeclaration | globals.d.ts:1581 | Uint8Array&lt;TArrayBuffer&gt; |
| Uint8Array.toBase64 | MethodSignature | globals.d.ts:1585 | { (options?: { alphabet?: "base64" &#124; "base64url" &#124; undefined; omitPadding?: boolean &#124; undefined; } &#124; undefined): string; (options?: { alphabet?: "base64" &#124; "base64url" &#124; undefined; omitPadding?: boolean &#124; undefined; } &#124; undefined): string; } |
| Uint8Array.toBase64.[TypeLiteral] | TypeLiteral | globals.d.ts:1585 | { alphabet?: "base64" &#124; "base64url" &#124; undefined; omitPadding?: boolean &#124; undefined; } |
| Uint8Array.toBase64.alphabet | PropertySignature | globals.d.ts:1585 | "base64" &#124; "base64url" &#124; undefined |
| Uint8Array.toBase64.omitPadding | PropertySignature | globals.d.ts:1585 | boolean &#124; undefined |
| Uint8Array.setFromBase64 | MethodSignature | globals.d.ts:1592 | { (string: string, options?: { alphabet?: "base64" &#124; "base64url" &#124; undefined; lastChunkHandling?: "loose" &#124; "stop-before-partial" &#124; "strict" &#124; undefined; } &#124; undefined): { read: number; written: number; }; (base64: string, offset?: number &#124; undefined): { ...; }; } |
| Uint8Array.setFromBase64.[TypeLiteral] | TypeLiteral | globals.d.ts:1595 | { read: number; written: number; } |
| Uint8Array.setFromBase64.read | PropertySignature | globals.d.ts:1599 | number |
| Uint8Array.setFromBase64.written | PropertySignature | globals.d.ts:1604 | number |
| Uint8Array.toHex | MethodSignature | globals.d.ts:1610 | { (): string; (): string; } |
| Uint8Array.setFromHex | MethodSignature | globals.d.ts:1617 | { (string: string): { read: number; written: number; }; (hex: string): { read: number; written: number; }; } |
| Uint8Array.setFromHex.[TypeLiteral] | TypeLiteral | globals.d.ts:1617 | { read: number; written: number; } |
| Uint8Array.setFromHex.read | PropertySignature | globals.d.ts:1621 | number |
| Uint8Array.setFromHex.written | PropertySignature | globals.d.ts:1626 | number |
| Uint8ArrayConstructor | InterfaceDeclaration | globals.d.ts:1630 | Uint8ArrayConstructor |
| Uint8ArrayConstructor.fromBase64 | MethodSignature | globals.d.ts:1637 | { (string: string, options?: { alphabet?: "base64" &#124; "base64url" &#124; undefined; lastChunkHandling?: "loose" &#124; "stop-before-partial" &#124; "strict" &#124; undefined; } &#124; undefined): Uint8Array&lt;ArrayBuffer&gt;; (base64: string, options?: { ...; } &#124; undefined): Uint8Array&lt;...&gt;; } |
| Uint8ArrayConstructor.fromBase64.[TypeLiteral] | TypeLiteral | globals.d.ts:1639 | { alphabet?: "base64" &#124; "base64url" &#124; undefined; lastChunkHandling?: "loose" &#124; "stop-before-partial" &#124; "strict" &#124; undefined; } |
| Uint8ArrayConstructor.fromBase64.alphabet | PropertySignature | globals.d.ts:1640 | "base64" &#124; "base64url" &#124; undefined |
| Uint8ArrayConstructor.fromBase64.lastChunkHandling | PropertySignature | globals.d.ts:1641 | "loose" &#124; "stop-before-partial" &#124; "strict" &#124; undefined |
| Uint8ArrayConstructor.fromHex | MethodSignature | globals.d.ts:1650 | { (string: string): Uint8Array&lt;ArrayBuffer&gt;; (hex: string): Uint8Array&lt;ArrayBuffer&gt;; } |
| BroadcastChannel | InterfaceDeclaration | globals.d.ts:1653 | BroadcastChannel |
| BroadcastChannel | VariableDeclaration | globals.d.ts:1654 | { new (name: string): BroadcastChannel; prototype: BroadcastChannel; } |
| URL | VariableDeclaration | globals.d.ts:1659 | { new (url: string &#124; URL, base?: string &#124; URL &#124; undefined): URL; prototype: URL; canParse(url: string &#124; URL, base?: string &#124; URL &#124; undefined): boolean; createObjectURL(obj: Blob &#124; MediaSource): string; parse(url: string &#124; URL, base?: string &#124; ... 1 more ... &#124; undefined): URL &#124; null; revokeObjectURL(url: string): voi... |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1661 | { new (url: string &#124; URL, base?: string &#124; URL &#124; undefined): URL; prototype: URL; canParse(url: string, base?: string &#124; undefined): boolean; createObjectURL(object: Blob): `blob:${string}`; revokeObjectURL(url: string): void; parse(url: string, base?: string &#124; undefined): URL &#124; null; } |
| prototype | PropertySignature | globals.d.ts:1662 | URL |
| [construct] | ConstructSignature | globals.d.ts:1663 | any |
| canParse | MethodSignature | globals.d.ts:1670 | (url: string, base?: string &#124; undefined) =&gt; boolean |
| createObjectURL | MethodSignature | globals.d.ts:1676 | (object: Blob) =&gt; `blob:${string}` |
| revokeObjectURL | MethodSignature | globals.d.ts:1682 | (url: string) =&gt; void |
| parse | MethodSignature | globals.d.ts:1690 | (url: string, base?: string &#124; undefined) =&gt; URL &#124; null |
| AbortController | InterfaceDeclaration | globals.d.ts:1700 | AbortController |
| AbortController.signal | PropertySignature | globals.d.ts:1701 | AbortSignal |
| AbortController.abort | MethodSignature | globals.d.ts:1702 | { (reason?: any): void; (reason?: any): void; } |
| AbortController | VariableDeclaration | globals.d.ts:1704 | { new (): AbortController; prototype: AbortController; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1706 | { new (): AbortController; prototype: AbortController; } |
| prototype | PropertySignature | globals.d.ts:1707 | AbortController |
| [construct] | ConstructSignature | globals.d.ts:1708 | any |
| AbortSignal | InterfaceDeclaration | globals.d.ts:1712 | AbortSignal |
| AbortSignal.aborted | PropertySignature | globals.d.ts:1713 | boolean |
| AbortSignal.onabort | PropertySignature | globals.d.ts:1714 | ((this: AbortSignal, ev: Event) =&gt; any) &#124; null |
| AbortSignal.onabort.[FunctionType] | FunctionType | globals.d.ts:1714 | (this: AbortSignal, ev: Event) =&gt; any |
| AbortSignal.reason | PropertySignature | globals.d.ts:1715 | any |
| AbortSignal.throwIfAborted | MethodSignature | globals.d.ts:1716 | { (): void; (): void; } |
| AbortSignal | VariableDeclaration | globals.d.ts:1718 | { new (): AbortSignal; prototype: AbortSignal; abort(reason?: any): AbortSignal; any(signals: AbortSignal[]): AbortSignal; timeout(milliseconds: number): AbortSignal; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1720 | { new (): AbortSignal; prototype: AbortSignal; timeout(ms: number): AbortSignal; abort(reason?: any): AbortSignal; any(signals: AbortSignal[]): AbortSignal; } |
| prototype | PropertySignature | globals.d.ts:1721 | AbortSignal |
| [construct] | ConstructSignature | globals.d.ts:1722 | any |
| timeout | MethodSignature | globals.d.ts:1727 | (ms: number) =&gt; AbortSignal |
| abort | MethodSignature | globals.d.ts:1732 | (reason?: any) =&gt; AbortSignal |
| any | MethodSignature | globals.d.ts:1737 | (signals: AbortSignal[]) =&gt; AbortSignal |
| FormData | InterfaceDeclaration | globals.d.ts:1741 | FormData |
| FormData.append | MethodSignature | globals.d.ts:1743 | { (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; } |
| FormData.append | MethodSignature | globals.d.ts:1744 | { (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; } |
| FormData.append | MethodSignature | globals.d.ts:1745 | { (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; } |
| FormData.delete | MethodSignature | globals.d.ts:1747 | { (name: string): void; (name: string): void; } |
| FormData.get | MethodSignature | globals.d.ts:1749 | { (name: string): FormDataEntryValue &#124; null; (name: string): FormDataEntryValue &#124; null; } |
| FormData.getAll | MethodSignature | globals.d.ts:1751 | { (name: string): FormDataEntryValue[]; (name: string): FormDataEntryValue[]; } |
| FormData.has | MethodSignature | globals.d.ts:1753 | { (name: string): boolean; (name: string): boolean; } |
| FormData.set | MethodSignature | globals.d.ts:1755 | { (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; } |
| FormData.set | MethodSignature | globals.d.ts:1756 | { (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; } |
| FormData.set | MethodSignature | globals.d.ts:1757 | { (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; (name: string, value: string &#124; Blob): void; (name: string, value: string): void; (name: string, blobValue: Blob, filename?: string &#124; undefined): void; } |
| FormData.forEach | MethodSignature | globals.d.ts:1758 | { (callbackfn: (value: FormDataEntryValue, key: string, parent: FormData) =&gt; void, thisArg?: any): void; (callbackfn: (value: FormDataEntryValue, key: string, parent: FormData) =&gt; void, thisArg?: any): void; } |
| FormData.forEach.[FunctionType] | FunctionType | globals.d.ts:1758 | (value: FormDataEntryValue, key: string, parent: FormData) =&gt; void |
| FormData.keys | MethodSignature | globals.d.ts:1759 | { (): FormDataIterator&lt;string&gt;; (): IterableIterator&lt;string&gt;; } |
| FormData.values | MethodSignature | globals.d.ts:1760 | { (): FormDataIterator&lt;FormDataEntryValue&gt;; (): IterableIterator&lt;string&gt;; } |
| FormData.entries | MethodSignature | globals.d.ts:1761 | { (): FormDataIterator&lt;[string, FormDataEntryValue]&gt;; (): IterableIterator&lt;[string, string]&gt;; } |
| FormData | VariableDeclaration | globals.d.ts:1763 | { new (form?: HTMLFormElement &#124; undefined, submitter?: HTMLElement &#124; null &#124; undefined): FormData; prototype: FormData; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1763 | { new (): FormData; prototype: FormData; } |
| prototype | PropertySignature | globals.d.ts:1763 | FormData |
| [construct] | ConstructSignature | globals.d.ts:1763 | any |
| EventSource | InterfaceDeclaration | globals.d.ts:1765 | EventSource |
| EventSource | VariableDeclaration | globals.d.ts:1766 | { new (url: string &#124; URL, eventSourceInitDict?: EventSourceInit &#124; undefined): EventSource; prototype: EventSource; readonly CONNECTING: 0; readonly OPEN: 1; readonly CLOSED: 2; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1768 | { new (): EventSource; prototype: EventSource; } |
| prototype | PropertySignature | globals.d.ts:1768 | EventSource |
| [construct] | ConstructSignature | globals.d.ts:1768 | any |
| Performance | InterfaceDeclaration | globals.d.ts:1771 | Performance |
| performance | VariableDeclaration | globals.d.ts:1772 | Performance |
| Performance | VariableDeclaration | globals.d.ts:1773 | { new (): Performance; prototype: Performance; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1775 | { new (): Performance; prototype: Performance; } |
| [construct] | ConstructSignature | globals.d.ts:1775 | any |
| prototype | PropertySignature | globals.d.ts:1775 | Performance |
| PerformanceEntry | InterfaceDeclaration | globals.d.ts:1778 | PerformanceEntry |
| PerformanceEntry | VariableDeclaration | globals.d.ts:1779 | { new (): PerformanceEntry; prototype: PerformanceEntry; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1781 | { new (): PerformanceEntry; prototype: PerformanceEntry; } |
| prototype | PropertySignature | globals.d.ts:1781 | PerformanceEntry |
| [construct] | ConstructSignature | globals.d.ts:1781 | any |
| PerformanceMark | InterfaceDeclaration | globals.d.ts:1784 | PerformanceMark |
| PerformanceMark | VariableDeclaration | globals.d.ts:1785 | { new (markName: string, markOptions?: PerformanceMarkOptions &#124; undefined): PerformanceMark; prototype: PerformanceMark; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1787 | { new (): PerformanceMark; prototype: PerformanceMark; } |
| prototype | PropertySignature | globals.d.ts:1787 | PerformanceMark |
| [construct] | ConstructSignature | globals.d.ts:1787 | any |
| PerformanceMeasure | InterfaceDeclaration | globals.d.ts:1790 | PerformanceMeasure |
| PerformanceMeasure | VariableDeclaration | globals.d.ts:1791 | { new (): PerformanceMeasure; prototype: PerformanceMeasure; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1793 | { new (): PerformanceMeasure; prototype: PerformanceMeasure; } |
| prototype | PropertySignature | globals.d.ts:1793 | PerformanceMeasure |
| [construct] | ConstructSignature | globals.d.ts:1793 | any |
| PerformanceObserver | InterfaceDeclaration | globals.d.ts:1796 | PerformanceObserver |
| PerformanceObserver | VariableDeclaration | globals.d.ts:1797 | { new (callback: PerformanceObserverCallback): PerformanceObserver; prototype: PerformanceObserver; readonly supportedEntryTypes: readonly string[]; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1799 | { new (callback: PerformanceObserverCallback): PerformanceObserver; prototype: PerformanceObserver; readonly supportedEntryTypes: readonly string[]; } |
| prototype | PropertySignature | globals.d.ts:1800 | PerformanceObserver |
| [construct] | ConstructSignature | globals.d.ts:1801 | any |
| supportedEntryTypes | PropertySignature | globals.d.ts:1802 | readonly string[] |
| PerformanceObserverEntryList | InterfaceDeclaration | globals.d.ts:1806 | PerformanceObserverEntryList |
| PerformanceObserverEntryList | VariableDeclaration | globals.d.ts:1807 | { new (): PerformanceObserverEntryList; prototype: PerformanceObserverEntryList; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1809 | { new (): PerformanceObserverEntryList; prototype: PerformanceObserverEntryList; } |
| prototype | PropertySignature | globals.d.ts:1809 | PerformanceObserverEntryList |
| [construct] | ConstructSignature | globals.d.ts:1809 | any |
| PerformanceResourceTiming | InterfaceDeclaration | globals.d.ts:1812 | PerformanceResourceTiming |
| PerformanceResourceTiming | VariableDeclaration | globals.d.ts:1813 | { new (): PerformanceResourceTiming; prototype: PerformanceResourceTiming; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1815 | { new (): PerformanceResourceTiming; prototype: PerformanceResourceTiming; } |
| prototype | PropertySignature | globals.d.ts:1815 | PerformanceResourceTiming |
| [construct] | ConstructSignature | globals.d.ts:1815 | any |
| ReadableByteStreamController | InterfaceDeclaration | globals.d.ts:1818 | ReadableByteStreamController |
| ReadableByteStreamController | VariableDeclaration | globals.d.ts:1819 | { new (): ReadableByteStreamController; prototype: ReadableByteStreamController; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1821 | { new (): ReadableByteStreamController; prototype: ReadableByteStreamController; } |
| prototype | PropertySignature | globals.d.ts:1821 | ReadableByteStreamController |
| [construct] | ConstructSignature | globals.d.ts:1821 | any |
| ReadableStreamBYOBReader | InterfaceDeclaration | globals.d.ts:1824 | ReadableStreamBYOBReader |
| ReadableStreamBYOBReader | VariableDeclaration | globals.d.ts:1825 | { new (stream: ReadableStream&lt;Uint8Array&lt;ArrayBuffer&gt;&gt;): ReadableStreamBYOBReader; prototype: ReadableStreamBYOBReader; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1827 | { new (): ReadableStreamBYOBReader; prototype: ReadableStreamBYOBReader; } |
| prototype | PropertySignature | globals.d.ts:1827 | ReadableStreamBYOBReader |
| [construct] | ConstructSignature | globals.d.ts:1827 | any |
| ReadableStreamBYOBRequest | InterfaceDeclaration | globals.d.ts:1830 | ReadableStreamBYOBRequest |
| ReadableStreamBYOBRequest | VariableDeclaration | globals.d.ts:1831 | { new (): ReadableStreamBYOBRequest; prototype: ReadableStreamBYOBRequest; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1833 | { new (): ReadableStreamBYOBRequest; prototype: ReadableStreamBYOBRequest; } |
| prototype | PropertySignature | globals.d.ts:1833 | ReadableStreamBYOBRequest |
| [construct] | ConstructSignature | globals.d.ts:1833 | any |
| TextDecoderStream | InterfaceDeclaration | globals.d.ts:1836 | TextDecoderStream |
| TextDecoderStream | VariableDeclaration | globals.d.ts:1837 | { new (label?: string &#124; undefined, options?: TextDecoderOptions &#124; undefined): TextDecoderStream; prototype: TextDecoderStream; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1839 | { new (encoding?: Encoding &#124; undefined, options?: { fatal?: boolean &#124; undefined; ignoreBOM?: boolean &#124; undefined; } &#124; undefined): TextDecoderStream; prototype: TextDecoderStream; } |
| prototype | PropertySignature | globals.d.ts:1840 | TextDecoderStream |
| [construct] | ConstructSignature | globals.d.ts:1841 | any |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1841 | { fatal?: boolean &#124; undefined; ignoreBOM?: boolean &#124; undefined; } |
| fatal | PropertySignature | globals.d.ts:1841 | boolean &#124; undefined |
| ignoreBOM | PropertySignature | globals.d.ts:1841 | boolean &#124; undefined |
| TextEncoderStream | InterfaceDeclaration | globals.d.ts:1845 | TextEncoderStream |
| TextEncoderStream | VariableDeclaration | globals.d.ts:1846 | { new (): TextEncoderStream; prototype: TextEncoderStream; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1848 | { new (): TextEncoderStream; prototype: TextEncoderStream; } |
| prototype | PropertySignature | globals.d.ts:1848 | TextEncoderStream |
| [construct] | ConstructSignature | globals.d.ts:1848 | any |
| URLSearchParams | InterfaceDeclaration | globals.d.ts:1851 | URLSearchParams |
| URLSearchParams | VariableDeclaration | globals.d.ts:1852 | { new (init?: string &#124; string[][] &#124; Record&lt;string, string&gt; &#124; URLSearchParams &#124; undefined): URLSearchParams; prototype: URLSearchParams; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1854 | { new (init?: string &#124; Iterable&lt;[string, string]&gt; &#124; readonly [string, string][] &#124; Record&lt;string, string &#124; readonly string[]&gt; &#124; URLSearchParams &#124; undefined): URLSearchParams; prototype: URLSearchParams; } |
| prototype | PropertySignature | globals.d.ts:1855 | URLSearchParams |
| [construct] | ConstructSignature | globals.d.ts:1856 | any |
| MessageChannel | InterfaceDeclaration | globals.d.ts:1867 | MessageChannel |
| MessageChannel.port1 | PropertySignature | globals.d.ts:1873 | MessagePort |
| MessageChannel.port2 | PropertySignature | globals.d.ts:1879 | MessagePort |
| MessageChannel | VariableDeclaration | globals.d.ts:1881 | { new (): MessageChannel; prototype: MessageChannel; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1883 | { new (): MessageChannel; prototype: MessageChannel; } |
| prototype | PropertySignature | globals.d.ts:1883 | MessageChannel |
| [construct] | ConstructSignature | globals.d.ts:1883 | any |
| MessagePort | InterfaceDeclaration | globals.d.ts:1886 | MessagePort |
| MessagePort | VariableDeclaration | globals.d.ts:1887 | { new (): MessagePort; prototype: MessagePort; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1889 | { new (): MessagePort; prototype: MessagePort; } |
| prototype | PropertySignature | globals.d.ts:1890 | MessagePort |
| [construct] | ConstructSignature | globals.d.ts:1891 | any |
| RequestInit | InterfaceDeclaration | globals.d.ts:1896 | RequestInit |
| ResponseInit | InterfaceDeclaration | globals.d.ts:1897 | ResponseInit |
| Headers | InterfaceDeclaration | globals.d.ts:1899 | Headers |
| Headers | VariableDeclaration | globals.d.ts:1900 | { new (init?: HeadersInit &#124; undefined): Headers; prototype: Headers; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1902 | { new (init?: HeadersInit &#124; undefined): Headers; prototype: Headers; } |
| prototype | PropertySignature | globals.d.ts:1903 | Headers |
| [construct] | ConstructSignature | globals.d.ts:1904 | any |
| Request | InterfaceDeclaration | globals.d.ts:1908 | Request |
| Request | VariableDeclaration | globals.d.ts:1909 | { new (input: URL &#124; RequestInfo, init?: RequestInit &#124; undefined): Request; prototype: Request; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1911 | { new (requestInfo: string, init?: RequestInit &#124; undefined): Request; new (requestInfo: RequestInit &amp; { url: string; }): Request; new (requestInfo: Request, init?: RequestInit &#124; undefined): Request; prototype: Request; } |
| prototype | PropertySignature | globals.d.ts:1912 | Request |
| [construct] | ConstructSignature | globals.d.ts:1913 | any |
| [construct] | ConstructSignature | globals.d.ts:1914 | any |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1914 | { url: string; } |
| url | PropertySignature | globals.d.ts:1914 | string |
| [construct] | ConstructSignature | globals.d.ts:1915 | any |
| Response | InterfaceDeclaration | globals.d.ts:1919 | Response |
| Response | VariableDeclaration | globals.d.ts:1920 | { new (body?: BodyInit &#124; null &#124; undefined, init?: ResponseInit &#124; undefined): Response; prototype: Response; error(): Response; json(data: any, init?: ResponseInit &#124; undefined): Response; redirect(url: string &#124; URL, status?: number &#124; undefined): Response; } |
| [TypeLiteral] | TypeLiteral | globals.d.ts:1922 | { new (body?: BodyInit &#124; null &#124; undefined, init?: ResponseInit &#124; undefined): Response; json(body?: any, init?: number &#124; ResponseInit &#124; undefined): Response; redirect(url: string, status?: number &#124; undefined): Response; redirect(url: string, init?: ResponseInit &#124; undefined): Response; error(): Response; } |
| [construct] | ConstructSignature | globals.d.ts:1923 | any |
| json | MethodSignature | globals.d.ts:1945 | (body?: any, init?: number &#124; ResponseInit &#124; undefined) =&gt; Response |
| redirect | MethodSignature | globals.d.ts:1953 | { (url: string, status?: number &#124; undefined): Response; (url: string, init?: ResponseInit &#124; undefined): Response; } |
| redirect | MethodSignature | globals.d.ts:1961 | { (url: string, status?: number &#124; undefined): Response; (url: string, init?: ResponseInit &#124; undefined): Response; } |
| error | MethodSignature | globals.d.ts:1966 | () =&gt; Response |
| BunFetchRequestInitTLS | InterfaceDeclaration | globals.d.ts:1973 | BunFetchRequestInitTLS |
| BunFetchRequestInitTLS.checkServerIdentity | PropertySignature | globals.d.ts:1991 | ((hostname: string, cert: PeerCertificate) =&gt; Error &#124; undefined) &#124; undefined |
| BunFetchRequestInit | InterfaceDeclaration | globals.d.ts:2000 | BunFetchRequestInit |
| BunFetchRequestInit.tls | PropertySignature | globals.d.ts:2004 | BunFetchRequestInitTLS &#124; undefined |
| BunFetchRequestInit.verbose | PropertySignature | globals.d.ts:2011 | boolean &#124; undefined |
| BunFetchRequestInit.proxy | PropertySignature | globals.d.ts:2051 | FetchProxyOption &#124; undefined |
| BunFetchRequestInit.session | PropertySignature | globals.d.ts:2060 | FetchSession &#124; undefined |
| BunFetchRequestInit.s3 | PropertySignature | globals.d.ts:2076 | S3Options &#124; undefined |
| BunFetchRequestInit.unix | PropertySignature | globals.d.ts:2086 | string &#124; undefined |
| BunFetchRequestInit.protocol | PropertySignature | globals.d.ts:2101 | "h1" &#124; "h2" &#124; "h3" &#124; "http1.1" &#124; "http2" &#124; "http3" &#124; undefined |
| BunFetchRequestInit.decompress | PropertySignature | globals.d.ts:2120 | boolean &#124; undefined |
| BunFetchRequestInit.compress | PropertySignature | globals.d.ts:2145 | "br" &#124; "deflate" &#124; "gzip" &#124; "zstd" &#124; boolean &#124; { encoding: "br" &#124; "deflate" &#124; "gzip" &#124; "zstd"; level?: number &#124; undefined; } &#124; undefined |
| BunFetchRequestInit.compress.[TypeLiteral] | TypeLiteral | globals.d.ts:2146 | { encoding: "br" &#124; "deflate" &#124; "gzip" &#124; "zstd"; level?: number &#124; undefined; } |
| BunFetchRequestInit.compress.encoding | PropertySignature | globals.d.ts:2146 | "br" &#124; "deflate" &#124; "gzip" &#124; "zstd" |
| BunFetchRequestInit.compress.level | PropertySignature | globals.d.ts:2146 | number &#124; undefined |
| BunFetchRequestInit.maxRedirects | PropertySignature | globals.d.ts:2160 | number &#124; undefined |
| BunFetchRequestInit.timeout | PropertySignature | globals.d.ts:2184 | number &#124; boolean &#124; undefined |
| fetch | FunctionDeclaration | globals.d.ts:2195 | typeof fetch |
| fetch | ModuleDeclaration | globals.d.ts:2202 | typeof fetch |
| fetch.preconnect | FunctionDeclaration | globals.d.ts:2212 | (url: string &#124; URL, options?: { dns?: boolean &#124; undefined; tcp?: boolean &#124; undefined; http?: boolean &#124; undefined; https?: boolean &#124; undefined; } &#124; undefined) =&gt; void |
| fetch.preconnect.[TypeLiteral] | TypeLiteral | globals.d.ts:2214 | { dns?: boolean &#124; undefined; tcp?: boolean &#124; undefined; http?: boolean &#124; undefined; https?: boolean &#124; undefined; } |
| fetch.preconnect.dns | PropertySignature | globals.d.ts:2216 | boolean &#124; undefined |
| fetch.preconnect.tcp | PropertySignature | globals.d.ts:2218 | boolean &#124; undefined |
| fetch.preconnect.http | PropertySignature | globals.d.ts:2220 | boolean &#124; undefined |
| fetch.preconnect.https | PropertySignature | globals.d.ts:2222 | boolean &#124; undefined |
| RegExpConstructor | InterfaceDeclaration | globals.d.ts:2228 | RegExpConstructor |
| RegExpConstructor.escape | MethodSignature | globals.d.ts:2243 | { (string: string): string; (string: string): string; } |
| HTMLRewriterTypes | ModuleDeclaration | html-rewriter.d.ts:1 | any |
| HTMLRewriterTypes.HTMLRewriterElementContentHandlers | InterfaceDeclaration | html-rewriter.d.ts:2 | HTMLRewriterElementContentHandlers |
| HTMLRewriterTypes.HTMLRewriterElementContentHandlers.element | MethodSignature | html-rewriter.d.ts:3 | ((element: Element) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| HTMLRewriterTypes.HTMLRewriterElementContentHandlers.comments | MethodSignature | html-rewriter.d.ts:4 | ((comment: Comment) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| HTMLRewriterTypes.HTMLRewriterElementContentHandlers.text | MethodSignature | html-rewriter.d.ts:5 | ((text: Text) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| HTMLRewriterTypes.HTMLRewriterDocumentContentHandlers | InterfaceDeclaration | html-rewriter.d.ts:8 | HTMLRewriterDocumentContentHandlers |
| HTMLRewriterTypes.HTMLRewriterDocumentContentHandlers.doctype | MethodSignature | html-rewriter.d.ts:9 | ((doctype: Doctype) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| HTMLRewriterTypes.HTMLRewriterDocumentContentHandlers.comments | MethodSignature | html-rewriter.d.ts:10 | ((comment: Comment) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| HTMLRewriterTypes.HTMLRewriterDocumentContentHandlers.text | MethodSignature | html-rewriter.d.ts:11 | ((text: Text) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| HTMLRewriterTypes.HTMLRewriterDocumentContentHandlers.end | MethodSignature | html-rewriter.d.ts:12 | ((end: DocumentEnd) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| HTMLRewriterTypes.Text | InterfaceDeclaration | html-rewriter.d.ts:15 | Text |
| HTMLRewriterTypes.Text.text | PropertySignature | html-rewriter.d.ts:17 | string |
| HTMLRewriterTypes.Text.lastInTextNode | PropertySignature | html-rewriter.d.ts:19 | boolean |
| HTMLRewriterTypes.Text.removed | PropertySignature | html-rewriter.d.ts:21 | boolean |
| HTMLRewriterTypes.Text.before | MethodSignature | html-rewriter.d.ts:23 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Text |
| HTMLRewriterTypes.Text.after | MethodSignature | html-rewriter.d.ts:25 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Text |
| HTMLRewriterTypes.Text.replace | MethodSignature | html-rewriter.d.ts:27 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Text |
| HTMLRewriterTypes.Text.remove | MethodSignature | html-rewriter.d.ts:29 | () =&gt; Text |
| HTMLRewriterTypes.Doctype | InterfaceDeclaration | html-rewriter.d.ts:32 | Doctype |
| HTMLRewriterTypes.Doctype.name | PropertySignature | html-rewriter.d.ts:34 | string &#124; null |
| HTMLRewriterTypes.Doctype.publicId | PropertySignature | html-rewriter.d.ts:36 | string &#124; null |
| HTMLRewriterTypes.Doctype.systemId | PropertySignature | html-rewriter.d.ts:38 | string &#124; null |
| HTMLRewriterTypes.Doctype.removed | PropertySignature | html-rewriter.d.ts:40 | boolean |
| HTMLRewriterTypes.Doctype.remove | MethodSignature | html-rewriter.d.ts:42 | () =&gt; Doctype |
| HTMLRewriterTypes.DocumentEnd | InterfaceDeclaration | html-rewriter.d.ts:45 | DocumentEnd |
| HTMLRewriterTypes.DocumentEnd.append | MethodSignature | html-rewriter.d.ts:47 | (content: string, options?: ContentOptions &#124; undefined) =&gt; DocumentEnd |
| HTMLRewriterTypes.ContentOptions | InterfaceDeclaration | html-rewriter.d.ts:50 | ContentOptions |
| HTMLRewriterTypes.ContentOptions.html | PropertySignature | html-rewriter.d.ts:52 | boolean &#124; undefined |
| HTMLRewriterTypes.Content | TypeAliasDeclaration | html-rewriter.d.ts:55 | string |
| HTMLRewriterTypes.Comment | InterfaceDeclaration | html-rewriter.d.ts:57 | Comment |
| HTMLRewriterTypes.Comment.text | PropertySignature | html-rewriter.d.ts:59 | string |
| HTMLRewriterTypes.Comment.removed | PropertySignature | html-rewriter.d.ts:61 | boolean |
| HTMLRewriterTypes.Comment.before | MethodSignature | html-rewriter.d.ts:63 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Comment |
| HTMLRewriterTypes.Comment.after | MethodSignature | html-rewriter.d.ts:65 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Comment |
| HTMLRewriterTypes.Comment.replace | MethodSignature | html-rewriter.d.ts:67 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Comment |
| HTMLRewriterTypes.Comment.remove | MethodSignature | html-rewriter.d.ts:69 | () =&gt; Comment |
| HTMLRewriterTypes.Element | InterfaceDeclaration | html-rewriter.d.ts:72 | Element |
| HTMLRewriterTypes.Element.tagName | PropertySignature | html-rewriter.d.ts:74 | string |
| HTMLRewriterTypes.Element.attributes | PropertySignature | html-rewriter.d.ts:76 | IterableIterator&lt;[string, string]&gt; |
| HTMLRewriterTypes.Element.removed | PropertySignature | html-rewriter.d.ts:78 | boolean |
| HTMLRewriterTypes.Element.selfClosing | PropertySignature | html-rewriter.d.ts:80 | boolean |
| HTMLRewriterTypes.Element.canHaveContent | PropertySignature | html-rewriter.d.ts:86 | boolean |
| HTMLRewriterTypes.Element.namespaceURI | PropertySignature | html-rewriter.d.ts:88 | string |
| HTMLRewriterTypes.Element.getAttribute | MethodSignature | html-rewriter.d.ts:90 | (name: string) =&gt; string &#124; null |
| HTMLRewriterTypes.Element.hasAttribute | MethodSignature | html-rewriter.d.ts:92 | (name: string) =&gt; boolean |
| HTMLRewriterTypes.Element.setAttribute | MethodSignature | html-rewriter.d.ts:94 | (name: string, value: string) =&gt; Element |
| HTMLRewriterTypes.Element.removeAttribute | MethodSignature | html-rewriter.d.ts:96 | (name: string) =&gt; Element |
| HTMLRewriterTypes.Element.before | MethodSignature | html-rewriter.d.ts:98 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Element |
| HTMLRewriterTypes.Element.after | MethodSignature | html-rewriter.d.ts:100 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Element |
| HTMLRewriterTypes.Element.prepend | MethodSignature | html-rewriter.d.ts:102 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Element |
| HTMLRewriterTypes.Element.append | MethodSignature | html-rewriter.d.ts:104 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Element |
| HTMLRewriterTypes.Element.replace | MethodSignature | html-rewriter.d.ts:106 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Element |
| HTMLRewriterTypes.Element.remove | MethodSignature | html-rewriter.d.ts:108 | () =&gt; Element |
| HTMLRewriterTypes.Element.removeAndKeepContent | MethodSignature | html-rewriter.d.ts:110 | () =&gt; Element |
| HTMLRewriterTypes.Element.setInnerContent | MethodSignature | html-rewriter.d.ts:112 | (content: string, options?: ContentOptions &#124; undefined) =&gt; Element |
| HTMLRewriterTypes.Element.onEndTag | MethodSignature | html-rewriter.d.ts:114 | (handler: (tag: EndTag) =&gt; void &#124; Promise&lt;void&gt;) =&gt; void |
| HTMLRewriterTypes.Element.onEndTag.[FunctionType] | FunctionType | html-rewriter.d.ts:114 | (tag: EndTag) =&gt; void &#124; Promise&lt;void&gt; |
| HTMLRewriterTypes.EndTag | InterfaceDeclaration | html-rewriter.d.ts:117 | EndTag |
| HTMLRewriterTypes.EndTag.name | PropertySignature | html-rewriter.d.ts:119 | string |
| HTMLRewriterTypes.EndTag.before | MethodSignature | html-rewriter.d.ts:121 | (content: string, options?: ContentOptions &#124; undefined) =&gt; EndTag |
| HTMLRewriterTypes.EndTag.after | MethodSignature | html-rewriter.d.ts:123 | (content: string, options?: ContentOptions &#124; undefined) =&gt; EndTag |
| HTMLRewriterTypes.EndTag.remove | MethodSignature | html-rewriter.d.ts:125 | () =&gt; EndTag |
| HTMLRewriter | ClassDeclaration | html-rewriter.d.ts:149 | HTMLRewriter |
| HTMLRewriter.constructor | Constructor | html-rewriter.d.ts:150 | any |
| HTMLRewriter.on | MethodDeclaration | html-rewriter.d.ts:156 | (selector: string, handlers: HTMLRewriterElementContentHandlers) =&gt; HTMLRewriter |
| HTMLRewriter.onDocument | MethodDeclaration | html-rewriter.d.ts:162 | (handlers: HTMLRewriterDocumentContentHandlers) =&gt; HTMLRewriter |
| HTMLRewriter.transform | MethodDeclaration | html-rewriter.d.ts:178 | { (input: Response): Response; (input: string): string; (input: BufferSource): ArrayBuffer; } |
| HTMLRewriter.transform | MethodDeclaration | html-rewriter.d.ts:188 | { (input: Response): Response; (input: string): string; (input: BufferSource): ArrayBuffer; } |
| HTMLRewriter.transform | MethodDeclaration | html-rewriter.d.ts:200 | { (input: Response): Response; (input: string): string; (input: BufferSource): ArrayBuffer; } |
| onmessage | VariableDeclaration | index.d.ts:32 | ((this: Window, ev: MessageEvent&lt;any&gt;) =&gt; any) &#124; null |
| bun:jsc | ModuleDeclaration | jsc.d.ts:17 | typeof import("bun:jsc") |
| bun:jsc.jscDescribe | FunctionDeclaration | jsc.d.ts:33 | (value: any) =&gt; string |
| bun:jsc.jscDescribeArray | FunctionDeclaration | jsc.d.ts:50 | (array: any[]) =&gt; string |
| bun:jsc.gcAndSweep | FunctionDeclaration | jsc.d.ts:60 | () =&gt; number |
| bun:jsc.fullGC | FunctionDeclaration | jsc.d.ts:76 | () =&gt; number |
| bun:jsc.edenGC | FunctionDeclaration | jsc.d.ts:88 | () =&gt; number |
| bun:jsc.heapSize | FunctionDeclaration | jsc.d.ts:101 | () =&gt; number |
| bun:jsc.heapStats | FunctionDeclaration | jsc.d.ts:129 | () =&gt; HeapStats |
| bun:jsc.memoryUsage | FunctionDeclaration | jsc.d.ts:139 | () =&gt; MemoryUsage |
| bun:jsc.bytecodeOrderStats | FunctionDeclaration | jsc.d.ts:155 | () =&gt; BytecodeOrderStats &#124; null |
| bun:jsc.getRandomSeed | FunctionDeclaration | jsc.d.ts:162 | () =&gt; number |
| bun:jsc.setRandomSeed | FunctionDeclaration | jsc.d.ts:184 | (value: number) =&gt; void |
| bun:jsc.isRope | FunctionDeclaration | jsc.d.ts:208 | (input: string) =&gt; boolean |
| bun:jsc.callerSourceOrigin | FunctionDeclaration | jsc.d.ts:222 | () =&gt; string &#124; null |
| bun:jsc.noFTL | FunctionDeclaration | jsc.d.ts:233 | (func: (...args: any[]) =&gt; any) =&gt; void |
| bun:jsc.noFTL.[FunctionType] | FunctionType | jsc.d.ts:233 | (...args: any[]) =&gt; any |
| bun:jsc.noOSRExitFuzzing | FunctionDeclaration | jsc.d.ts:244 | (func: (...args: any[]) =&gt; any) =&gt; void |
| bun:jsc.noOSRExitFuzzing.[FunctionType] | FunctionType | jsc.d.ts:244 | (...args: any[]) =&gt; any |
| bun:jsc.optimizeNextInvocation | FunctionDeclaration | jsc.d.ts:257 | (func: (...args: any[]) =&gt; any) =&gt; void |
| bun:jsc.optimizeNextInvocation.[FunctionType] | FunctionType | jsc.d.ts:257 | (...args: any[]) =&gt; any |
| bun:jsc.numberOfDFGCompiles | FunctionDeclaration | jsc.d.ts:278 | (func: (...args: any[]) =&gt; any) =&gt; number |
| bun:jsc.numberOfDFGCompiles.[FunctionType] | FunctionType | jsc.d.ts:278 | (...args: any[]) =&gt; any |
| bun:jsc.releaseWeakRefs | FunctionDeclaration | jsc.d.ts:306 | () =&gt; void |
| bun:jsc.totalCompileTime | FunctionDeclaration | jsc.d.ts:316 | () =&gt; number |
| bun:jsc.reoptimizationRetryCount | FunctionDeclaration | jsc.d.ts:329 | (func: (...args: any[]) =&gt; any) =&gt; number |
| bun:jsc.reoptimizationRetryCount.[FunctionType] | FunctionType | jsc.d.ts:329 | (...args: any[]) =&gt; any |
| bun:jsc.drainMicrotasks | FunctionDeclaration | jsc.d.ts:352 | () =&gt; void |
| bun:jsc.serialize | FunctionDeclaration | jsc.d.ts:362 | { (value: any, options?: { binaryType?: "arraybuffer" &#124; undefined; } &#124; undefined): SharedArrayBuffer; (value: any, options?: { binaryType: "nodebuffer"; } &#124; undefined): Buffer&lt;...&gt;; } |
| bun:jsc.serialize.[TypeLiteral] | TypeLiteral | jsc.d.ts:362 | { binaryType?: "arraybuffer" &#124; undefined; } |
| bun:jsc.serialize.binaryType | PropertySignature | jsc.d.ts:362 | "arraybuffer" &#124; undefined |
| bun:jsc.serialize | FunctionDeclaration | jsc.d.ts:372 | { (value: any, options?: { binaryType?: "arraybuffer" &#124; undefined; } &#124; undefined): SharedArrayBuffer; (value: any, options?: { binaryType: "nodebuffer"; } &#124; undefined): Buffer&lt;...&gt;; } |
| bun:jsc.serialize.[TypeLiteral] | TypeLiteral | jsc.d.ts:372 | { binaryType: "nodebuffer"; } |
| bun:jsc.serialize.binaryType | PropertySignature | jsc.d.ts:372 | "nodebuffer" |
| bun:jsc.deserialize | FunctionDeclaration | jsc.d.ts:379 | (value: Buffer&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;) =&gt; any |
| bun:jsc.setTimeZone | FunctionDeclaration | jsc.d.ts:390 | (timeZone: string) =&gt; string |
| bun:jsc.HeapStats | InterfaceDeclaration | jsc.d.ts:401 | HeapStats |
| bun:jsc.HeapStats.heapSize | PropertySignature | jsc.d.ts:406 | number |
| bun:jsc.HeapStats.heapCapacity | PropertySignature | jsc.d.ts:412 | number |
| bun:jsc.HeapStats.extraMemorySize | PropertySignature | jsc.d.ts:418 | number |
| bun:jsc.HeapStats.objectCount | PropertySignature | jsc.d.ts:424 | number |
| bun:jsc.HeapStats.protectedObjectCount | PropertySignature | jsc.d.ts:429 | number |
| bun:jsc.HeapStats.globalObjectCount | PropertySignature | jsc.d.ts:434 | number |
| bun:jsc.HeapStats.protectedGlobalObjectCount | PropertySignature | jsc.d.ts:438 | number |
| bun:jsc.HeapStats.objectTypeCounts | PropertySignature | jsc.d.ts:449 | Record&lt;string, number&gt; |
| bun:jsc.HeapStats.protectedObjectTypeCounts | PropertySignature | jsc.d.ts:454 | Record&lt;string, number&gt; |
| bun:jsc.BytecodeOrderStats | InterfaceDeclaration | jsc.d.ts:462 | BytecodeOrderStats |
| bun:jsc.BytecodeOrderStats.hot | PropertySignature | jsc.d.ts:464 | number |
| bun:jsc.BytecodeOrderStats.unknown | PropertySignature | jsc.d.ts:466 | number |
| bun:jsc.BytecodeOrderStats.cold | PropertySignature | jsc.d.ts:468 | number |
| bun:jsc.BytecodeOrderStats.hotBytes | PropertySignature | jsc.d.ts:469 | number |
| bun:jsc.BytecodeOrderStats.unknownBytes | PropertySignature | jsc.d.ts:470 | number |
| bun:jsc.BytecodeOrderStats.coldBytes | PropertySignature | jsc.d.ts:471 | number |
| bun:jsc.BytecodeOrderStats.regions | PropertySignature | jsc.d.ts:473 | { moduleHeads: number; hot: number; unknown: number; lateModuleHeads: number; cold: number; expressionInfo: number; } |
| bun:jsc.BytecodeOrderStats.regions.[TypeLiteral] | TypeLiteral | jsc.d.ts:473 | { moduleHeads: number; hot: number; unknown: number; lateModuleHeads: number; cold: number; expressionInfo: number; } |
| bun:jsc.BytecodeOrderStats.regions.moduleHeads | PropertySignature | jsc.d.ts:474 | number |
| bun:jsc.BytecodeOrderStats.regions.hot | PropertySignature | jsc.d.ts:475 | number |
| bun:jsc.BytecodeOrderStats.regions.unknown | PropertySignature | jsc.d.ts:476 | number |
| bun:jsc.BytecodeOrderStats.regions.lateModuleHeads | PropertySignature | jsc.d.ts:477 | number |
| bun:jsc.BytecodeOrderStats.regions.cold | PropertySignature | jsc.d.ts:478 | number |
| bun:jsc.BytecodeOrderStats.regions.expressionInfo | PropertySignature | jsc.d.ts:479 | number |
| bun:jsc.MemoryUsage | InterfaceDeclaration | jsc.d.ts:487 | MemoryUsage |
| bun:jsc.MemoryUsage.current | PropertySignature | jsc.d.ts:495 | number |
| bun:jsc.MemoryUsage.peak | PropertySignature | jsc.d.ts:499 | number |
| bun:jsc.MemoryUsage.currentCommit | PropertySignature | jsc.d.ts:506 | number |
| bun:jsc.MemoryUsage.peakCommit | PropertySignature | jsc.d.ts:510 | number |
| bun:jsc.MemoryUsage.pageFaults | PropertySignature | jsc.d.ts:516 | number |
| bun:jsc.SamplingProfileStackFrame | InterfaceDeclaration | jsc.d.ts:522 | SamplingProfileStackFrame |
| bun:jsc.SamplingProfileStackFrame.sourceID | PropertySignature | jsc.d.ts:528 | number |
| bun:jsc.SamplingProfileStackFrame.name | PropertySignature | jsc.d.ts:533 | string |
| bun:jsc.SamplingProfileStackFrame.location | PropertySignature | jsc.d.ts:540 | string |
| bun:jsc.SamplingProfileStackFrame.sourceURL | PropertySignature | jsc.d.ts:546 | string &#124; undefined |
| bun:jsc.SamplingProfileStackFrame.line | PropertySignature | jsc.d.ts:551 | number |
| bun:jsc.SamplingProfileStackFrame.column | PropertySignature | jsc.d.ts:555 | number |
| bun:jsc.SamplingProfileStackFrame.category | PropertySignature | jsc.d.ts:562 | string |
| bun:jsc.SamplingProfileStackFrame.flags | PropertySignature | jsc.d.ts:568 | number |
| bun:jsc.SamplingProfileStackFrame.inliner | PropertySignature | jsc.d.ts:574 | { name: string; location: string; line: number; column: number; category: string; } &#124; undefined |
| bun:jsc.SamplingProfileStackFrame.inliner.[TypeLiteral] | TypeLiteral | jsc.d.ts:574 | { name: string; location: string; line: number; column: number; category: string; } |
| bun:jsc.SamplingProfileStackFrame.inliner.name | PropertySignature | jsc.d.ts:575 | string |
| bun:jsc.SamplingProfileStackFrame.inliner.location | PropertySignature | jsc.d.ts:576 | string |
| bun:jsc.SamplingProfileStackFrame.inliner.line | PropertySignature | jsc.d.ts:577 | number |
| bun:jsc.SamplingProfileStackFrame.inliner.column | PropertySignature | jsc.d.ts:578 | number |
| bun:jsc.SamplingProfileStackFrame.inliner.category | PropertySignature | jsc.d.ts:579 | string |
| bun:jsc.SamplingProfileStackTraces | InterfaceDeclaration | jsc.d.ts:587 | SamplingProfileStackTraces |
| bun:jsc.SamplingProfileStackTraces.interval | PropertySignature | jsc.d.ts:592 | number |
| bun:jsc.SamplingProfileStackTraces.traces | PropertySignature | jsc.d.ts:596 | { timestamp: number; frames: SamplingProfileStackFrame[]; }[] |
| bun:jsc.SamplingProfileStackTraces.traces.[TypeLiteral] | TypeLiteral | jsc.d.ts:596 | { timestamp: number; frames: SamplingProfileStackFrame[]; } |
| bun:jsc.SamplingProfileStackTraces.traces.timestamp | PropertySignature | jsc.d.ts:601 | number |
| bun:jsc.SamplingProfileStackTraces.traces.frames | PropertySignature | jsc.d.ts:605 | SamplingProfileStackFrame[] |
| bun:jsc.SamplingProfileStackTraces.sources | PropertySignature | jsc.d.ts:611 | { sourceID: number; url?: string &#124; undefined; sourceURL?: string &#124; undefined; sourceMappingURL?: string &#124; undefined; }[] |
| bun:jsc.SamplingProfileStackTraces.sources.[TypeLiteral] | TypeLiteral | jsc.d.ts:611 | { sourceID: number; url?: string &#124; undefined; sourceURL?: string &#124; undefined; sourceMappingURL?: string &#124; undefined; } |
| bun:jsc.SamplingProfileStackTraces.sources.sourceID | PropertySignature | jsc.d.ts:615 | number |
| bun:jsc.SamplingProfileStackTraces.sources.url | PropertySignature | jsc.d.ts:621 | string &#124; undefined |
| bun:jsc.SamplingProfileStackTraces.sources.sourceURL | PropertySignature | jsc.d.ts:625 | string &#124; undefined |
| bun:jsc.SamplingProfileStackTraces.sources.sourceMappingURL | PropertySignature | jsc.d.ts:629 | string &#124; undefined |
| bun:jsc.SamplingProfile | InterfaceDeclaration | jsc.d.ts:637 | SamplingProfile |
| bun:jsc.SamplingProfile.functions | PropertySignature | jsc.d.ts:663 | string |
| bun:jsc.SamplingProfile.bytecodes | PropertySignature | jsc.d.ts:728 | string |
| bun:jsc.SamplingProfile.stackTraces | PropertySignature | jsc.d.ts:735 | SamplingProfileStackTraces |
| bun:jsc.profile | FunctionDeclaration | jsc.d.ts:766 | &lt;T extends (...args: any[]) =&gt; any&gt;(callback: T, sampleInterval?: number &#124; undefined, ...args: Parameters&lt;T&gt;) =&gt; ReturnType&lt;T&gt; extends Promise&lt;infer U&gt; ? Promise&lt;...&gt; : SamplingProfile |
| bun:jsc.profile.T | TypeParameter | jsc.d.ts:766 | T |
| bun:jsc.profile.[FunctionType] | FunctionType | jsc.d.ts:766 | (...args: any[]) =&gt; any |
| bun:jsc.profile.U | TypeParameter | jsc.d.ts:770 | U |
| bun:jsc.getProtectedObjects | FunctionDeclaration | jsc.d.ts:783 | () =&gt; any[] |
| bun:jsc.startRemoteDebugger | FunctionDeclaration | jsc.d.ts:797 | (host?: string &#124; undefined, port?: number &#124; undefined) =&gt; void |
| bun:jsc.startSamplingProfiler | FunctionDeclaration | jsc.d.ts:809 | (optionalDirectory?: string &#124; undefined, sampleInterval?: number &#124; undefined) =&gt; void |
| bun:jsc.estimateShallowMemoryUsageOf | FunctionDeclaration | jsc.d.ts:821 | (value: string &#124; bigint &#124; symbol &#124; object &#124; CallableFunction) =&gt; number |
| ReactElement | TypeAliasDeclaration | jsx.d.ts:3 | unknown |
| ReactElement.[TypeLiteral] | TypeLiteral | jsx.d.ts:3 | { React: React; } |
| ReactElement.React | PropertySignature | jsx.d.ts:3 | React |
| ReactElement.React.React | TypeParameter | jsx.d.ts:3 | React |
| ReactElement.[TypeLiteral] | TypeLiteral | jsx.d.ts:4 | { createElement(...args: any): R; } |
| ReactElement.createElement | MethodSignature | jsx.d.ts:4 | (...args: any) =&gt; R |
| ReactElement.createElement.R | TypeParameter | jsx.d.ts:4 | R |
| JSX | ModuleDeclaration | jsx.d.ts:9 | any |
| JSX.Element | TypeAliasDeclaration | jsx.d.ts:15 | unknown |
| BunConsumerConvenienceMethods | InterfaceDeclaration | overrides.d.ts:11 | BunConsumerConvenienceMethods |
| BunConsumerConvenienceMethods.text | MethodSignature | overrides.d.ts:15 | () =&gt; Promise&lt;string&gt; |
| BunConsumerConvenienceMethods.bytes | MethodSignature | overrides.d.ts:20 | () =&gt; Promise&lt;Uint8Array&lt;ArrayBuffer&gt;&gt; |
| BunConsumerConvenienceMethods.json | MethodSignature | overrides.d.ts:25 | () =&gt; Promise&lt;any&gt; |
| stream/web | ModuleDeclaration | overrides.d.ts:28 | typeof import("stream/web") |
| stream/web.ReadableStream | InterfaceDeclaration | overrides.d.ts:29 | ReadableStream&lt;R&gt; |
| stream/web.ReadableStream.blob | MethodSignature | overrides.d.ts:33 | () =&gt; Promise&lt;Blob&gt; |
| buffer | ModuleDeclaration | overrides.d.ts:37 | typeof import("buffer") |
| buffer.Blob | InterfaceDeclaration | overrides.d.ts:38 | Blob |
| buffer.Blob.bytes | MethodSignature | overrides.d.ts:43 | { (): Promise&lt;NonSharedUint8Array&gt;; (): Promise&lt;Uint8Array&lt;ArrayBuffer&gt;&gt;; } |
| buffer.Blob.formData | MethodSignature | overrides.d.ts:48 | () =&gt; Promise&lt;FormData&gt; |
| buffer.Blob.arrayBuffer | MethodSignature | overrides.d.ts:53 | { (): Promise&lt;ArrayBuffer&gt;; (): Promise&lt;ArrayBuffer&gt;; } |
| buffer.Blob.image | MethodSignature | overrides.d.ts:59 | (options?: ConstructorOptions &#124; undefined) =&gt; Image |
| buffer.Blob.stream | MethodSignature | overrides.d.ts:64 | { (): ReadableStream&lt;NonSharedUint8Array&gt;; (): ReadableStream&lt;Uint8Array&lt;ArrayBuffer&gt;&gt;; } |
| url | ModuleDeclaration | overrides.d.ts:68 | typeof import("url") |
| url.URLSearchParams | InterfaceDeclaration | overrides.d.ts:69 | URLSearchParams |
| url.URLSearchParams.toJSON | MethodSignature | overrides.d.ts:70 | () =&gt; Record&lt;string, string&gt; |
| global | ModuleDeclaration | overrides.d.ts:74 | any |
| global.NodeJS | ModuleDeclaration | overrides.d.ts:75 | any |
| global.NodeJS.ProcessEnv | InterfaceDeclaration | overrides.d.ts:76 | ProcessEnv |
| global.NodeJS.Process | InterfaceDeclaration | overrides.d.ts:78 | Process |
| global.NodeJS.Process.version | PropertySignature | overrides.d.ts:79 | string |
| global.NodeJS.Process.browser | PropertySignature | overrides.d.ts:80 | boolean |
| global.NodeJS.Process.isBun | PropertySignature | overrides.d.ts:85 | true |
| global.NodeJS.Process.revision | PropertySignature | overrides.d.ts:90 | string |
| global.NodeJS.Process.reallyExit | MethodSignature | overrides.d.ts:92 | (code?: number &#124; undefined) =&gt; never |
| global.NodeJS.Process.dlopen | MethodSignature | overrides.d.ts:93 | { (module: object, filename: string, flags?: number &#124; undefined): void; (module: { exports: any; }, filename: string, flags?: number &#124; undefined): void; } |
| global.NodeJS.Process.dlopen.[TypeLiteral] | TypeLiteral | overrides.d.ts:93 | { exports: any; } |
| global.NodeJS.Process.dlopen.exports | PropertySignature | overrides.d.ts:93 | any |
| global.NodeJS.Process._exiting | PropertySignature | overrides.d.ts:94 | boolean |
| global.NodeJS.Process.noDeprecation | PropertySignature | overrides.d.ts:95 | boolean &#124; undefined |
| global.NodeJS.Process.on | MethodSignature | overrides.d.ts:110 | { &lt;E extends keyof ProcessEventMap&gt;(eventName: E, listener: (...args: ProcessEventMap[E]) =&gt; void): this; (eventName: string &#124; symbol, listener: (...args: any[]) =&gt; void): this; (event: "memoryPressure", listener: (level: "critical" &#124; "warning") =&gt; void): this; } |
| global.NodeJS.Process.on.[FunctionType] | FunctionType | overrides.d.ts:110 | (level: "critical" &#124; "warning") =&gt; void |
| global.NodeJS.Process.once | MethodSignature | overrides.d.ts:111 | { &lt;E extends keyof ProcessEventMap&gt;(eventName: E, listener: (...args: ProcessEventMap[E]) =&gt; void): this; (eventName: string &#124; symbol, listener: (...args: any[]) =&gt; void): this; (event: "memoryPressure", listener: (level: "critical" &#124; "warning") =&gt; void): this; } |
| global.NodeJS.Process.once.[FunctionType] | FunctionType | overrides.d.ts:111 | (level: "critical" &#124; "warning") =&gt; void |
| global.NodeJS.Process.off | MethodSignature | overrides.d.ts:112 | { &lt;E extends keyof ProcessEventMap&gt;(eventName: E, listener: (...args: ProcessEventMap[E]) =&gt; void): this; (eventName: string &#124; symbol, listener: (...args: any[]) =&gt; void): this; (event: "memoryPressure", listener: (level: "critical" &#124; "warning") =&gt; void): this; (event: string &#124; symbol, listener: (...args: any[]) =&gt; ... |
| global.NodeJS.Process.off.[FunctionType] | FunctionType | overrides.d.ts:112 | (level: "critical" &#124; "warning") =&gt; void |
| global.NodeJS.Process.addListener | MethodSignature | overrides.d.ts:113 | { &lt;E extends keyof ProcessEventMap&gt;(eventName: E, listener: (...args: ProcessEventMap[E]) =&gt; void): this; (eventName: string &#124; symbol, listener: (...args: any[]) =&gt; void): this; (event: "memoryPressure", listener: (level: "critical" &#124; "warning") =&gt; void): this; } |
| global.NodeJS.Process.addListener.[FunctionType] | FunctionType | overrides.d.ts:113 | (level: "critical" &#124; "warning") =&gt; void |
| global.NodeJS.Process.removeListener | MethodSignature | overrides.d.ts:114 | { &lt;E extends keyof ProcessEventMap&gt;(eventName: E, listener: (...args: ProcessEventMap[E]) =&gt; void): this; (eventName: string &#124; symbol, listener: (...args: any[]) =&gt; void): this; (event: "memoryPressure", listener: (level: "critical" &#124; "warning") =&gt; void): this; (event: string &#124; symbol, listener: (...args: any[]) =&gt; ... |
| global.NodeJS.Process.removeListener.[FunctionType] | FunctionType | overrides.d.ts:114 | (level: "critical" &#124; "warning") =&gt; void |
| global.NodeJS.Process.prependListener | MethodSignature | overrides.d.ts:115 | { &lt;E extends keyof ProcessEventMap&gt;(eventName: E, listener: (...args: ProcessEventMap[E]) =&gt; void): this; (eventName: string &#124; symbol, listener: (...args: any[]) =&gt; void): this; (event: "memoryPressure", listener: (level: "critical" &#124; "warning") =&gt; void): this; } |
| global.NodeJS.Process.prependListener.[FunctionType] | FunctionType | overrides.d.ts:115 | (level: "critical" &#124; "warning") =&gt; void |
| global.NodeJS.Process.prependOnceListener | MethodSignature | overrides.d.ts:116 | { &lt;E extends keyof ProcessEventMap&gt;(eventName: E, listener: (...args: ProcessEventMap[E]) =&gt; void): this; (eventName: string &#124; symbol, listener: (...args: any[]) =&gt; void): this; (event: "memoryPressure", listener: (level: "critical" &#124; "warning") =&gt; void): this; } |
| global.NodeJS.Process.prependOnceListener.[FunctionType] | FunctionType | overrides.d.ts:116 | (level: "critical" &#124; "warning") =&gt; void |
| global.NodeJS.Process.emit | MethodSignature | overrides.d.ts:117 | { &lt;E extends keyof ProcessEventMap&gt;(eventName: E, ...args: ProcessEventMap[E]): boolean; (eventName: string &#124; symbol, ...args: any[]): boolean; (event: "memoryPressure", level: "critical" &#124; "warning"): boolean; } |
| global.NodeJS.Process.off | MethodSignature | overrides.d.ts:124 | { &lt;E extends keyof ProcessEventMap&gt;(eventName: E, listener: (...args: ProcessEventMap[E]) =&gt; void): this; (eventName: string &#124; symbol, listener: (...args: any[]) =&gt; void): this; (event: "memoryPressure", listener: (level: "critical" &#124; "warning") =&gt; void): this; (event: string &#124; symbol, listener: (...args: any[]) =&gt; ... |
| global.NodeJS.Process.off.[FunctionType] | FunctionType | overrides.d.ts:124 | (...args: any[]) =&gt; void |
| global.NodeJS.Process.removeListener | MethodSignature | overrides.d.ts:125 | { &lt;E extends keyof ProcessEventMap&gt;(eventName: E, listener: (...args: ProcessEventMap[E]) =&gt; void): this; (eventName: string &#124; symbol, listener: (...args: any[]) =&gt; void): this; (event: "memoryPressure", listener: (level: "critical" &#124; "warning") =&gt; void): this; (event: string &#124; symbol, listener: (...args: any[]) =&gt; ... |
| global.NodeJS.Process.removeListener.[FunctionType] | FunctionType | overrides.d.ts:125 | (...args: any[]) =&gt; void |
| global.NodeJS.Process.binding | MethodSignature | overrides.d.ts:127 | { (m: "constants"): { os: typeof constants; fs: typeof constants; crypto: typeof constants; zlib: typeof constants; trace: { TRACE_EVENT_PHASE_BEGIN: number; TRACE_EVENT_PHASE_END: number; ... 23 more ...; TRACE_EVENT_PHASE_LINK_IDS: number; }; }; (m: "uv"): { ...; }; (m: "http_parser"): { ...; }; (m: string): objec... |
| global.NodeJS.Process.binding.[TypeLiteral] | TypeLiteral | overrides.d.ts:127 | { os: typeof constants; fs: typeof constants; crypto: typeof constants; zlib: typeof constants; trace: { TRACE_EVENT_PHASE_BEGIN: number; TRACE_EVENT_PHASE_END: number; ... 23 more ...; TRACE_EVENT_PHASE_LINK_IDS: number; }; } |
| global.NodeJS.Process.binding.os | PropertySignature | overrides.d.ts:128 | typeof constants |
| global.NodeJS.Process.binding.fs | PropertySignature | overrides.d.ts:129 | typeof constants |
| global.NodeJS.Process.binding.crypto | PropertySignature | overrides.d.ts:130 | typeof constants |
| global.NodeJS.Process.binding.zlib | PropertySignature | overrides.d.ts:131 | typeof constants |
| global.NodeJS.Process.binding.trace | PropertySignature | overrides.d.ts:132 | { TRACE_EVENT_PHASE_BEGIN: number; TRACE_EVENT_PHASE_END: number; TRACE_EVENT_PHASE_COMPLETE: number; TRACE_EVENT_PHASE_INSTANT: number; TRACE_EVENT_PHASE_ASYNC_BEGIN: number; TRACE_EVENT_PHASE_ASYNC_STEP_INTO: number; ... 19 more ...; TRACE_EVENT_PHASE_LINK_IDS: number; } |
| global.NodeJS.Process.binding.trace.[TypeLiteral] | TypeLiteral | overrides.d.ts:132 | { TRACE_EVENT_PHASE_BEGIN: number; TRACE_EVENT_PHASE_END: number; TRACE_EVENT_PHASE_COMPLETE: number; TRACE_EVENT_PHASE_INSTANT: number; TRACE_EVENT_PHASE_ASYNC_BEGIN: number; TRACE_EVENT_PHASE_ASYNC_STEP_INTO: number; ... 19 more ...; TRACE_EVENT_PHASE_LINK_IDS: number; } |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_BEGIN | PropertySignature | overrides.d.ts:133 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_END | PropertySignature | overrides.d.ts:134 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_COMPLETE | PropertySignature | overrides.d.ts:135 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_INSTANT | PropertySignature | overrides.d.ts:136 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_ASYNC_BEGIN | PropertySignature | overrides.d.ts:137 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_ASYNC_STEP_INTO | PropertySignature | overrides.d.ts:138 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_ASYNC_STEP_PAST | PropertySignature | overrides.d.ts:139 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_ASYNC_END | PropertySignature | overrides.d.ts:140 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_NESTABLE_ASYNC_BEGIN | PropertySignature | overrides.d.ts:141 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_NESTABLE_ASYNC_END | PropertySignature | overrides.d.ts:142 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_NESTABLE_ASYNC_INSTANT | PropertySignature | overrides.d.ts:143 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_FLOW_BEGIN | PropertySignature | overrides.d.ts:144 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_FLOW_STEP | PropertySignature | overrides.d.ts:145 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_FLOW_END | PropertySignature | overrides.d.ts:146 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_METADATA | PropertySignature | overrides.d.ts:147 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_COUNTER | PropertySignature | overrides.d.ts:148 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_SAMPLE | PropertySignature | overrides.d.ts:149 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_CREATE_OBJECT | PropertySignature | overrides.d.ts:150 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_SNAPSHOT_OBJECT | PropertySignature | overrides.d.ts:151 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_DELETE_OBJECT | PropertySignature | overrides.d.ts:152 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_MEMORY_DUMP | PropertySignature | overrides.d.ts:153 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_MARK | PropertySignature | overrides.d.ts:154 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_CLOCK_SYNC | PropertySignature | overrides.d.ts:155 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_ENTER_CONTEXT | PropertySignature | overrides.d.ts:156 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_LEAVE_CONTEXT | PropertySignature | overrides.d.ts:157 | number |
| global.NodeJS.Process.binding.trace.TRACE_EVENT_PHASE_LINK_IDS | PropertySignature | overrides.d.ts:158 | number |
| global.NodeJS.Process.binding | MethodSignature | overrides.d.ts:161 | { (m: "constants"): { os: typeof constants; fs: typeof constants; crypto: typeof constants; zlib: typeof constants; trace: { TRACE_EVENT_PHASE_BEGIN: number; TRACE_EVENT_PHASE_END: number; ... 23 more ...; TRACE_EVENT_PHASE_LINK_IDS: number; }; }; (m: "uv"): { ...; }; (m: "http_parser"): { ...; }; (m: string): objec... |
| global.NodeJS.Process.binding.[TypeLiteral] | TypeLiteral | overrides.d.ts:161 | { errname(code: number): string; getErrorMap(): Map&lt;number, [name: string, description: string]&gt;; UV_E2BIG: number; UV_EACCES: number; UV_EADDRINUSE: number; UV_EADDRNOTAVAIL: number; UV_EAFNOSUPPORT: number; ... 78 more ...; UV_EUNATCH: number; } |
| global.NodeJS.Process.binding.errname | MethodSignature | overrides.d.ts:162 | (code: number) =&gt; string |
| global.NodeJS.Process.binding.getErrorMap | MethodSignature | overrides.d.ts:163 | () =&gt; Map&lt;number, [name: string, description: string]&gt; |
| global.NodeJS.Process.binding.UV_E2BIG | PropertySignature | overrides.d.ts:164 | number |
| global.NodeJS.Process.binding.UV_EACCES | PropertySignature | overrides.d.ts:165 | number |
| global.NodeJS.Process.binding.UV_EADDRINUSE | PropertySignature | overrides.d.ts:166 | number |
| global.NodeJS.Process.binding.UV_EADDRNOTAVAIL | PropertySignature | overrides.d.ts:167 | number |
| global.NodeJS.Process.binding.UV_EAFNOSUPPORT | PropertySignature | overrides.d.ts:168 | number |
| global.NodeJS.Process.binding.UV_EAGAIN | PropertySignature | overrides.d.ts:169 | number |
| global.NodeJS.Process.binding.UV_EAI_ADDRFAMILY | PropertySignature | overrides.d.ts:170 | number |
| global.NodeJS.Process.binding.UV_EAI_AGAIN | PropertySignature | overrides.d.ts:171 | number |
| global.NodeJS.Process.binding.UV_EAI_BADFLAGS | PropertySignature | overrides.d.ts:172 | number |
| global.NodeJS.Process.binding.UV_EAI_BADHINTS | PropertySignature | overrides.d.ts:173 | number |
| global.NodeJS.Process.binding.UV_EAI_CANCELED | PropertySignature | overrides.d.ts:174 | number |
| global.NodeJS.Process.binding.UV_EAI_FAIL | PropertySignature | overrides.d.ts:175 | number |
| global.NodeJS.Process.binding.UV_EAI_FAMILY | PropertySignature | overrides.d.ts:176 | number |
| global.NodeJS.Process.binding.UV_EAI_MEMORY | PropertySignature | overrides.d.ts:177 | number |
| global.NodeJS.Process.binding.UV_EAI_NODATA | PropertySignature | overrides.d.ts:178 | number |
| global.NodeJS.Process.binding.UV_EAI_NONAME | PropertySignature | overrides.d.ts:179 | number |
| global.NodeJS.Process.binding.UV_EAI_OVERFLOW | PropertySignature | overrides.d.ts:180 | number |
| global.NodeJS.Process.binding.UV_EAI_PROTOCOL | PropertySignature | overrides.d.ts:181 | number |
| global.NodeJS.Process.binding.UV_EAI_SERVICE | PropertySignature | overrides.d.ts:182 | number |
| global.NodeJS.Process.binding.UV_EAI_SOCKTYPE | PropertySignature | overrides.d.ts:183 | number |
| global.NodeJS.Process.binding.UV_EALREADY | PropertySignature | overrides.d.ts:184 | number |
| global.NodeJS.Process.binding.UV_EBADF | PropertySignature | overrides.d.ts:185 | number |
| global.NodeJS.Process.binding.UV_EBUSY | PropertySignature | overrides.d.ts:186 | number |
| global.NodeJS.Process.binding.UV_ECANCELED | PropertySignature | overrides.d.ts:187 | number |
| global.NodeJS.Process.binding.UV_ECHARSET | PropertySignature | overrides.d.ts:188 | number |
| global.NodeJS.Process.binding.UV_ECONNABORTED | PropertySignature | overrides.d.ts:189 | number |
| global.NodeJS.Process.binding.UV_ECONNREFUSED | PropertySignature | overrides.d.ts:190 | number |
| global.NodeJS.Process.binding.UV_ECONNRESET | PropertySignature | overrides.d.ts:191 | number |
| global.NodeJS.Process.binding.UV_EDESTADDRREQ | PropertySignature | overrides.d.ts:192 | number |
| global.NodeJS.Process.binding.UV_EEXIST | PropertySignature | overrides.d.ts:193 | number |
| global.NodeJS.Process.binding.UV_EFAULT | PropertySignature | overrides.d.ts:194 | number |
| global.NodeJS.Process.binding.UV_EFBIG | PropertySignature | overrides.d.ts:195 | number |
| global.NodeJS.Process.binding.UV_EHOSTUNREACH | PropertySignature | overrides.d.ts:196 | number |
| global.NodeJS.Process.binding.UV_EINTR | PropertySignature | overrides.d.ts:197 | number |
| global.NodeJS.Process.binding.UV_EINVAL | PropertySignature | overrides.d.ts:198 | number |
| global.NodeJS.Process.binding.UV_EIO | PropertySignature | overrides.d.ts:199 | number |
| global.NodeJS.Process.binding.UV_EISCONN | PropertySignature | overrides.d.ts:200 | number |
| global.NodeJS.Process.binding.UV_EISDIR | PropertySignature | overrides.d.ts:201 | number |
| global.NodeJS.Process.binding.UV_ELOOP | PropertySignature | overrides.d.ts:202 | number |
| global.NodeJS.Process.binding.UV_EMFILE | PropertySignature | overrides.d.ts:203 | number |
| global.NodeJS.Process.binding.UV_EMSGSIZE | PropertySignature | overrides.d.ts:204 | number |
| global.NodeJS.Process.binding.UV_ENAMETOOLONG | PropertySignature | overrides.d.ts:205 | number |
| global.NodeJS.Process.binding.UV_ENETDOWN | PropertySignature | overrides.d.ts:206 | number |
| global.NodeJS.Process.binding.UV_ENETUNREACH | PropertySignature | overrides.d.ts:207 | number |
| global.NodeJS.Process.binding.UV_ENFILE | PropertySignature | overrides.d.ts:208 | number |
| global.NodeJS.Process.binding.UV_ENOBUFS | PropertySignature | overrides.d.ts:209 | number |
| global.NodeJS.Process.binding.UV_ENODEV | PropertySignature | overrides.d.ts:210 | number |
| global.NodeJS.Process.binding.UV_ENOENT | PropertySignature | overrides.d.ts:211 | number |
| global.NodeJS.Process.binding.UV_ENOMEM | PropertySignature | overrides.d.ts:212 | number |
| global.NodeJS.Process.binding.UV_ENONET | PropertySignature | overrides.d.ts:213 | number |
| global.NodeJS.Process.binding.UV_ENOPROTOOPT | PropertySignature | overrides.d.ts:214 | number |
| global.NodeJS.Process.binding.UV_ENOSPC | PropertySignature | overrides.d.ts:215 | number |
| global.NodeJS.Process.binding.UV_ENOSYS | PropertySignature | overrides.d.ts:216 | number |
| global.NodeJS.Process.binding.UV_ENOTCONN | PropertySignature | overrides.d.ts:217 | number |
| global.NodeJS.Process.binding.UV_ENOTDIR | PropertySignature | overrides.d.ts:218 | number |
| global.NodeJS.Process.binding.UV_ENOTEMPTY | PropertySignature | overrides.d.ts:219 | number |
| global.NodeJS.Process.binding.UV_ENOTSOCK | PropertySignature | overrides.d.ts:220 | number |
| global.NodeJS.Process.binding.UV_ENOTSUP | PropertySignature | overrides.d.ts:221 | number |
| global.NodeJS.Process.binding.UV_EOVERFLOW | PropertySignature | overrides.d.ts:222 | number |
| global.NodeJS.Process.binding.UV_EPERM | PropertySignature | overrides.d.ts:223 | number |
| global.NodeJS.Process.binding.UV_EPIPE | PropertySignature | overrides.d.ts:224 | number |
| global.NodeJS.Process.binding.UV_EPROTO | PropertySignature | overrides.d.ts:225 | number |
| global.NodeJS.Process.binding.UV_EPROTONOSUPPORT | PropertySignature | overrides.d.ts:226 | number |
| global.NodeJS.Process.binding.UV_EPROTOTYPE | PropertySignature | overrides.d.ts:227 | number |
| global.NodeJS.Process.binding.UV_ERANGE | PropertySignature | overrides.d.ts:228 | number |
| global.NodeJS.Process.binding.UV_EROFS | PropertySignature | overrides.d.ts:229 | number |
| global.NodeJS.Process.binding.UV_ESHUTDOWN | PropertySignature | overrides.d.ts:230 | number |
| global.NodeJS.Process.binding.UV_ESPIPE | PropertySignature | overrides.d.ts:231 | number |
| global.NodeJS.Process.binding.UV_ESRCH | PropertySignature | overrides.d.ts:232 | number |
| global.NodeJS.Process.binding.UV_ETIMEDOUT | PropertySignature | overrides.d.ts:233 | number |
| global.NodeJS.Process.binding.UV_ETXTBSY | PropertySignature | overrides.d.ts:234 | number |
| global.NodeJS.Process.binding.UV_EXDEV | PropertySignature | overrides.d.ts:235 | number |
| global.NodeJS.Process.binding.UV_UNKNOWN | PropertySignature | overrides.d.ts:236 | number |
| global.NodeJS.Process.binding.UV_EOF | PropertySignature | overrides.d.ts:237 | number |
| global.NodeJS.Process.binding.UV_ENXIO | PropertySignature | overrides.d.ts:238 | number |
| global.NodeJS.Process.binding.UV_EMLINK | PropertySignature | overrides.d.ts:239 | number |
| global.NodeJS.Process.binding.UV_EHOSTDOWN | PropertySignature | overrides.d.ts:240 | number |
| global.NodeJS.Process.binding.UV_EREMOTEIO | PropertySignature | overrides.d.ts:241 | number |
| global.NodeJS.Process.binding.UV_ENOTTY | PropertySignature | overrides.d.ts:242 | number |
| global.NodeJS.Process.binding.UV_EFTYPE | PropertySignature | overrides.d.ts:243 | number |
| global.NodeJS.Process.binding.UV_EILSEQ | PropertySignature | overrides.d.ts:244 | number |
| global.NodeJS.Process.binding.UV_ESOCKTNOSUPPORT | PropertySignature | overrides.d.ts:245 | number |
| global.NodeJS.Process.binding.UV_ENODATA | PropertySignature | overrides.d.ts:246 | number |
| global.NodeJS.Process.binding.UV_EUNATCH | PropertySignature | overrides.d.ts:247 | number |
| global.NodeJS.Process.binding | MethodSignature | overrides.d.ts:249 | { (m: "constants"): { os: typeof constants; fs: typeof constants; crypto: typeof constants; zlib: typeof constants; trace: { TRACE_EVENT_PHASE_BEGIN: number; TRACE_EVENT_PHASE_END: number; ... 23 more ...; TRACE_EVENT_PHASE_LINK_IDS: number; }; }; (m: "uv"): { ...; }; (m: "http_parser"): { ...; }; (m: string): objec... |
| global.NodeJS.Process.binding.[TypeLiteral] | TypeLiteral | overrides.d.ts:249 | { methods: ["DELETE", "GET", "HEAD", "POST", "PUT", "CONNECT", "OPTIONS", "TRACE", "COPY", "LOCK", "MKCOL", "MOVE", "PROPFIND", "PROPPATCH", "SEARCH", "UNLOCK", "BIND", ... 17 more ..., "QUERY"]; allMethods: [...]; HTTPParser: unknown; ConnectionsList: unknown; } |
| global.NodeJS.Process.binding.methods | PropertySignature | overrides.d.ts:250 | ["DELETE", "GET", "HEAD", "POST", "PUT", "CONNECT", "OPTIONS", "TRACE", "COPY", "LOCK", "MKCOL", "MOVE", "PROPFIND", "PROPPATCH", "SEARCH", "UNLOCK", "BIND", "REBIND", ... 16 more ..., "QUERY"] |
| global.NodeJS.Process.binding.allMethods | PropertySignature | overrides.d.ts:287 | ["DELETE", "GET", "HEAD", "POST", "PUT", "CONNECT", "OPTIONS", "TRACE", "COPY", "LOCK", "MKCOL", "MOVE", "PROPFIND", "PROPPATCH", "SEARCH", "UNLOCK", "BIND", "REBIND", ... 28 more ..., "QUERY"] |
| global.NodeJS.Process.binding.HTTPParser | PropertySignature | overrides.d.ts:336 | unknown |
| global.NodeJS.Process.binding.ConnectionsList | PropertySignature | overrides.d.ts:337 | unknown |
| global.NodeJS.Process.binding | MethodSignature | overrides.d.ts:339 | { (m: "constants"): { os: typeof constants; fs: typeof constants; crypto: typeof constants; zlib: typeof constants; trace: { TRACE_EVENT_PHASE_BEGIN: number; TRACE_EVENT_PHASE_END: number; ... 23 more ...; TRACE_EVENT_PHASE_LINK_IDS: number; }; }; (m: "uv"): { ...; }; (m: "http_parser"): { ...; }; (m: string): objec... |
| global.NodeJS.ProcessVersions | InterfaceDeclaration | overrides.d.ts:342 | ProcessVersions |
| global.NodeJS.ProcessVersions.bun | PropertySignature | overrides.d.ts:343 | string |
| node:fs/promises | ModuleDeclaration | overrides.d.ts:348 | typeof import("node:fs/promises") |
| node:fs/promises.exists | FunctionDeclaration | overrides.d.ts:349 | (path: PathLike) =&gt; Promise&lt;boolean&gt; |
| node:tls | ModuleDeclaration | overrides.d.ts:352 | typeof import("node:tls") |
| node:tls.BunConnectionOptions | InterfaceDeclaration | overrides.d.ts:353 | BunConnectionOptions |
| node:tls.BunConnectionOptions.ca | PropertySignature | overrides.d.ts:359 | string &#124; (string &#124; Buffer&lt;ArrayBufferLike&gt; &#124; BunFile)[] &#124; Buffer&lt;ArrayBufferLike&gt; &#124; BunFile &#124; TypedArray&lt;ArrayBufferLike&gt; &#124; undefined |
| node:tls.BunConnectionOptions.cert | PropertySignature | overrides.d.ts:370 | string &#124; (string &#124; Buffer&lt;ArrayBufferLike&gt; &#124; BunFile &#124; TypedArray&lt;ArrayBufferLike&gt;)[] &#124; Buffer&lt;ArrayBufferLike&gt; &#124; BunFile &#124; TypedArray&lt;...&gt; &#124; undefined |
| node:tls.BunConnectionOptions.key | PropertySignature | overrides.d.ts:386 | string &#124; (string &#124; Buffer&lt;ArrayBufferLike&gt; &#124; BunFile &#124; KeyObject &#124; TypedArray&lt;ArrayBufferLike&gt;)[] &#124; Buffer&lt;...&gt; &#124; BunFile &#124; TypedArray&lt;...&gt; &#124; undefined |
| node:tls.connect | FunctionDeclaration | overrides.d.ts:395 | { (options: ConnectionOptions, secureConnectListener?: (() =&gt; void) &#124; undefined): TLSSocket; (port: number, host?: string &#124; undefined, options?: ConnectionOptions &#124; undefined, secureConnectListener?: (() =&gt; void) &#124; undefined): TLSSocket; (port: number, options?: ConnectionOptions &#124; undefined, secureConnectListener?:... |
| node:tls.connect.[FunctionType] | FunctionType | overrides.d.ts:395 | () =&gt; void |
| console | ModuleDeclaration | overrides.d.ts:398 | Console |
| console.Console | InterfaceDeclaration | overrides.d.ts:399 | Console |
| console.Console./**      * Asynchronously reads lines from standard input (fd 0)      *      * @example      * ```ts      * for await (const line of console) {      *   console.log(line);      * }      * ```      */     [Symbol.asyncIterator] | MethodSignature | overrides.d.ts:410 | () =&gt; AsyncIterableIterator&lt;string&gt; |
| bun | ModuleDeclaration | redis.d.ts:1 | typeof import("bun") |
| bun.RedisOptions | InterfaceDeclaration | redis.d.ts:2 | RedisOptions |
| bun.RedisOptions.connectionTimeout | PropertySignature | redis.d.ts:7 | number &#124; undefined |
| bun.RedisOptions.idleTimeout | PropertySignature | redis.d.ts:16 | number &#124; undefined |
| bun.RedisOptions.autoReconnect | PropertySignature | redis.d.ts:22 | boolean &#124; undefined |
| bun.RedisOptions.maxRetries | PropertySignature | redis.d.ts:29 | number &#124; undefined |
| bun.RedisOptions.enableOfflineQueue | PropertySignature | redis.d.ts:35 | boolean &#124; undefined |
| bun.RedisOptions.tls | PropertySignature | redis.d.ts:41 | boolean &#124; TLSOptions &#124; undefined |
| bun.RedisOptions.enableAutoPipelining | PropertySignature | redis.d.ts:47 | boolean &#124; undefined |
| bun.RedisClient | ModuleDeclaration | redis.d.ts:50 | typeof RedisClient |
| bun.RedisClient.KeyLike | TypeAliasDeclaration | redis.d.ts:51 | KeyLike |
| bun.RedisClient.StringPubSubListener | TypeAliasDeclaration | redis.d.ts:52 | StringPubSubListener |
| bun.RedisClient.StringPubSubListener.[FunctionType] | FunctionType | redis.d.ts:52 | StringPubSubListener |
| bun.RedisClient | ClassDeclaration | redis.d.ts:58 | RedisClient |
| bun.RedisClient.constructor | Constructor | redis.d.ts:73 | any |
| bun.RedisClient.connected | PropertyDeclaration | redis.d.ts:78 | boolean |
| bun.RedisClient.bufferedAmount | PropertyDeclaration | redis.d.ts:83 | number |
| bun.RedisClient.onconnect | PropertyDeclaration | redis.d.ts:88 | ((this: RedisClient) =&gt; void) &#124; null |
| bun.RedisClient.onconnect.[FunctionType] | FunctionType | redis.d.ts:88 | (this: RedisClient) =&gt; void |
| bun.RedisClient.onclose | PropertyDeclaration | redis.d.ts:95 | ((this: RedisClient, error: Error) =&gt; void) &#124; null |
| bun.RedisClient.onclose.[FunctionType] | FunctionType | redis.d.ts:95 | (this: RedisClient, error: Error) =&gt; void |
| bun.RedisClient.connect | MethodDeclaration | redis.d.ts:102 | () =&gt; Promise&lt;void&gt; |
| bun.RedisClient.close | MethodDeclaration | redis.d.ts:107 | () =&gt; void |
| bun.RedisClient.send | MethodDeclaration | redis.d.ts:128 | (command: string, args: string[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.get | MethodDeclaration | redis.d.ts:135 | (key: KeyLike) =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.getBuffer | MethodDeclaration | redis.d.ts:142 | (key: KeyLike) =&gt; Promise&lt;Uint8Array&lt;ArrayBuffer&gt; &#124; null&gt; |
| bun.RedisClient.set | MethodDeclaration | redis.d.ts:150 | { (key: KeyLike, value: KeyLike): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, ex: "EX", seconds: number): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike,... |
| bun.RedisClient.set | MethodDeclaration | redis.d.ts:159 | { (key: KeyLike, value: KeyLike): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, ex: "EX", seconds: number): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike,... |
| bun.RedisClient.set | MethodDeclaration | redis.d.ts:168 | { (key: KeyLike, value: KeyLike): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, ex: "EX", seconds: number): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike,... |
| bun.RedisClient.set | MethodDeclaration | redis.d.ts:179 | { (key: KeyLike, value: KeyLike): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, ex: "EX", seconds: number): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike,... |
| bun.RedisClient.set | MethodDeclaration | redis.d.ts:188 | { (key: KeyLike, value: KeyLike): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, ex: "EX", seconds: number): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike,... |
| bun.RedisClient.set | MethodDeclaration | redis.d.ts:203 | { (key: KeyLike, value: KeyLike): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, ex: "EX", seconds: number): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike,... |
| bun.RedisClient.set | MethodDeclaration | redis.d.ts:213 | { (key: KeyLike, value: KeyLike): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, ex: "EX", seconds: number): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike,... |
| bun.RedisClient.set | MethodDeclaration | redis.d.ts:224 | { (key: KeyLike, value: KeyLike): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, ex: "EX", seconds: number): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike,... |
| bun.RedisClient.set | MethodDeclaration | redis.d.ts:233 | { (key: KeyLike, value: KeyLike): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, ex: "EX", seconds: number): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike,... |
| bun.RedisClient.set | MethodDeclaration | redis.d.ts:242 | { (key: KeyLike, value: KeyLike): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, ex: "EX", seconds: number): Promise&lt;"OK"&gt;; (key: KeyLike, value: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, value: KeyLike,... |
| bun.RedisClient.del | MethodDeclaration | redis.d.ts:249 | (...keys: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.incr | MethodDeclaration | redis.d.ts:256 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.incrby | MethodDeclaration | redis.d.ts:264 | (key: KeyLike, increment: number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.incrbyfloat | MethodDeclaration | redis.d.ts:272 | (key: KeyLike, increment: string &#124; number) =&gt; Promise&lt;string&gt; |
| bun.RedisClient.decr | MethodDeclaration | redis.d.ts:279 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.decrby | MethodDeclaration | redis.d.ts:287 | (key: KeyLike, decrement: number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.exists | MethodDeclaration | redis.d.ts:295 | (key: KeyLike) =&gt; Promise&lt;boolean&gt; |
| bun.RedisClient.expire | MethodDeclaration | redis.d.ts:303 | (key: KeyLike, seconds: number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.expireat | MethodDeclaration | redis.d.ts:311 | (key: KeyLike, timestamp: number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.pexpire | MethodDeclaration | redis.d.ts:319 | (key: KeyLike, milliseconds: number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.ttl | MethodDeclaration | redis.d.ts:327 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.hset | MethodDeclaration | redis.d.ts:335 | { (key: KeyLike, fields: Record&lt;string &#124; number, number &#124; KeyLike&gt;): Promise&lt;number&gt;; (key: KeyLike, field: KeyLike, value: KeyLike, ...rest: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hset | MethodDeclaration | redis.d.ts:345 | { (key: KeyLike, fields: Record&lt;string &#124; number, number &#124; KeyLike&gt;): Promise&lt;number&gt;; (key: KeyLike, field: KeyLike, value: KeyLike, ...rest: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hsetnx | MethodDeclaration | redis.d.ts:359 | (key: KeyLike, field: KeyLike, value: KeyLike) =&gt; Promise&lt;boolean&gt; |
| bun.RedisClient.hgetdel | MethodDeclaration | redis.d.ts:371 | (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]) =&gt; Promise&lt;(string &#124; null)[]&gt; |
| bun.RedisClient.hgetex | MethodDeclaration | redis.d.ts:387 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;(string &#124; null)[]&gt;; (key: KeyLike, ex: "EX", seconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, px: "PX", milliseconds: number, fieldsKeyword: "FIELDS", numfields:... |
| bun.RedisClient.hgetex | MethodDeclaration | redis.d.ts:389 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;(string &#124; null)[]&gt;; (key: KeyLike, ex: "EX", seconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, px: "PX", milliseconds: number, fieldsKeyword: "FIELDS", numfields:... |
| bun.RedisClient.hgetex | MethodDeclaration | redis.d.ts:391 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;(string &#124; null)[]&gt;; (key: KeyLike, ex: "EX", seconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, px: "PX", milliseconds: number, fieldsKeyword: "FIELDS", numfields:... |
| bun.RedisClient.hgetex | MethodDeclaration | redis.d.ts:393 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;(string &#124; null)[]&gt;; (key: KeyLike, ex: "EX", seconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, px: "PX", milliseconds: number, fieldsKeyword: "FIELDS", numfields:... |
| bun.RedisClient.hgetex | MethodDeclaration | redis.d.ts:395 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;(string &#124; null)[]&gt;; (key: KeyLike, ex: "EX", seconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, px: "PX", milliseconds: number, fieldsKeyword: "FIELDS", numfields:... |
| bun.RedisClient.hgetex | MethodDeclaration | redis.d.ts:397 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;(string &#124; null)[]&gt;; (key: KeyLike, ex: "EX", seconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, px: "PX", milliseconds: number, fieldsKeyword: "FIELDS", numfields:... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:407 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:409 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:411 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:413 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:415 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:417 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:419 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:421 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:423 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:425 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:427 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:429 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:431 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:433 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:435 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:437 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:439 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hsetex | MethodDeclaration | redis.d.ts:441 | { (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;number&gt;; (key: KeyLike, fnx: "FNX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fxx: "FXX", fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: KeyLike[]):... |
| bun.RedisClient.hexpire | MethodDeclaration | redis.d.ts:450 | { (key: KeyLike, seconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;number[]&gt;; (key: KeyLike, seconds: number, condition: "GT" &#124; ... 2 more ... &#124; "XX", fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hexpire | MethodDeclaration | redis.d.ts:457 | { (key: KeyLike, seconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;number[]&gt;; (key: KeyLike, seconds: number, condition: "GT" &#124; ... 2 more ... &#124; "XX", fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hexpireat | MethodDeclaration | redis.d.ts:472 | { (key: KeyLike, unixTimeSeconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;number[]&gt;; (key: KeyLike, unixTimeSeconds: number, condition: "GT" &#124; ... 2 more ... &#124; "XX", fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hexpireat | MethodDeclaration | redis.d.ts:479 | { (key: KeyLike, unixTimeSeconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;number[]&gt;; (key: KeyLike, unixTimeSeconds: number, condition: "GT" &#124; ... 2 more ... &#124; "XX", fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hexpiretime | MethodDeclaration | redis.d.ts:494 | (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]) =&gt; Promise&lt;number[]&gt; |
| bun.RedisClient.hpersist | MethodDeclaration | redis.d.ts:507 | (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]) =&gt; Promise&lt;number[]&gt; |
| bun.RedisClient.hpexpire | MethodDeclaration | redis.d.ts:520 | { (key: KeyLike, milliseconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;number[]&gt;; (key: KeyLike, milliseconds: number, condition: "GT" &#124; ... 2 more ... &#124; "XX", fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hpexpire | MethodDeclaration | redis.d.ts:527 | { (key: KeyLike, milliseconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;number[]&gt;; (key: KeyLike, milliseconds: number, condition: "GT" &#124; ... 2 more ... &#124; "XX", fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hpexpireat | MethodDeclaration | redis.d.ts:542 | { (key: KeyLike, unixTimeMilliseconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;number[]&gt;; (key: KeyLike, unixTimeMilliseconds: number, condition: "GT" &#124; ... 2 more ... &#124; "XX", fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hpexpireat | MethodDeclaration | redis.d.ts:549 | { (key: KeyLike, unixTimeMilliseconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;number[]&gt;; (key: KeyLike, unixTimeMilliseconds: number, condition: "GT" &#124; ... 2 more ... &#124; "XX", fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hpexpiretime | MethodDeclaration | redis.d.ts:564 | (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]) =&gt; Promise&lt;number[]&gt; |
| bun.RedisClient.hpttl | MethodDeclaration | redis.d.ts:577 | (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]) =&gt; Promise&lt;number[]&gt; |
| bun.RedisClient.httl | MethodDeclaration | redis.d.ts:590 | (key: KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: KeyLike[]) =&gt; Promise&lt;number[]&gt; |
| bun.RedisClient.hmset | MethodDeclaration | redis.d.ts:606 | { (key: KeyLike, fields: Record&lt;string &#124; number, number &#124; KeyLike&gt;): Promise&lt;"OK"&gt;; (key: KeyLike, field: KeyLike, value: KeyLike, ...rest: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fieldValues: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hmset | MethodDeclaration | redis.d.ts:619 | { (key: KeyLike, fields: Record&lt;string &#124; number, number &#124; KeyLike&gt;): Promise&lt;"OK"&gt;; (key: KeyLike, field: KeyLike, value: KeyLike, ...rest: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fieldValues: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hmset | MethodDeclaration | redis.d.ts:635 | { (key: KeyLike, fields: Record&lt;string &#124; number, number &#124; KeyLike&gt;): Promise&lt;"OK"&gt;; (key: KeyLike, field: KeyLike, value: KeyLike, ...rest: KeyLike[]): Promise&lt;...&gt;; (key: KeyLike, fieldValues: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.hget | MethodDeclaration | redis.d.ts:643 | (key: KeyLike, field: KeyLike) =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.hmget | MethodDeclaration | redis.d.ts:651 | { (key: KeyLike, ...fields: string[]): Promise&lt;(string &#124; null)[]&gt;; (key: KeyLike, fields: string[]): Promise&lt;(string &#124; null)[]&gt;; } |
| bun.RedisClient.hmget | MethodDeclaration | redis.d.ts:659 | { (key: KeyLike, ...fields: string[]): Promise&lt;(string &#124; null)[]&gt;; (key: KeyLike, fields: string[]): Promise&lt;(string &#124; null)[]&gt;; } |
| bun.RedisClient.hdel | MethodDeclaration | redis.d.ts:668 | (key: KeyLike, field: KeyLike, ...rest: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.hexists | MethodDeclaration | redis.d.ts:676 | (key: KeyLike, field: KeyLike) =&gt; Promise&lt;boolean&gt; |
| bun.RedisClient.hrandfield | MethodDeclaration | redis.d.ts:683 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[]&gt;; (key: KeyLike, count: number, withValues: "WITHVALUES"): Promise&lt;...&gt;; } |
| bun.RedisClient.hrandfield | MethodDeclaration | redis.d.ts:691 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[]&gt;; (key: KeyLike, count: number, withValues: "WITHVALUES"): Promise&lt;...&gt;; } |
| bun.RedisClient.hrandfield | MethodDeclaration | redis.d.ts:700 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[]&gt;; (key: KeyLike, count: number, withValues: "WITHVALUES"): Promise&lt;...&gt;; } |
| bun.RedisClient.hscan | MethodDeclaration | redis.d.ts:708 | { (key: KeyLike, cursor: string &#124; number): Promise&lt;[string, string[]]&gt;; (key: KeyLike, cursor: string &#124; number, match: "MATCH", pattern: string): Promise&lt;...&gt;; (key: KeyLike, cursor: string &#124; number, count: "COUNT", limit: number): Promise&lt;...&gt;; (key: KeyLike, cursor: string &#124; number, match: "MATCH", pattern: string... |
| bun.RedisClient.hscan | MethodDeclaration | redis.d.ts:718 | { (key: KeyLike, cursor: string &#124; number): Promise&lt;[string, string[]]&gt;; (key: KeyLike, cursor: string &#124; number, match: "MATCH", pattern: string): Promise&lt;...&gt;; (key: KeyLike, cursor: string &#124; number, count: "COUNT", limit: number): Promise&lt;...&gt;; (key: KeyLike, cursor: string &#124; number, match: "MATCH", pattern: string... |
| bun.RedisClient.hscan | MethodDeclaration | redis.d.ts:733 | { (key: KeyLike, cursor: string &#124; number): Promise&lt;[string, string[]]&gt;; (key: KeyLike, cursor: string &#124; number, match: "MATCH", pattern: string): Promise&lt;...&gt;; (key: KeyLike, cursor: string &#124; number, count: "COUNT", limit: number): Promise&lt;...&gt;; (key: KeyLike, cursor: string &#124; number, match: "MATCH", pattern: string... |
| bun.RedisClient.hscan | MethodDeclaration | redis.d.ts:750 | { (key: KeyLike, cursor: string &#124; number): Promise&lt;[string, string[]]&gt;; (key: KeyLike, cursor: string &#124; number, match: "MATCH", pattern: string): Promise&lt;...&gt;; (key: KeyLike, cursor: string &#124; number, count: "COUNT", limit: number): Promise&lt;...&gt;; (key: KeyLike, cursor: string &#124; number, match: "MATCH", pattern: string... |
| bun.RedisClient.sismember | MethodDeclaration | redis.d.ts:766 | (key: KeyLike, member: string) =&gt; Promise&lt;boolean&gt; |
| bun.RedisClient.sadd | MethodDeclaration | redis.d.ts:774 | (key: KeyLike, ...members: string[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.srem | MethodDeclaration | redis.d.ts:782 | (key: KeyLike, ...members: string[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.smove | MethodDeclaration | redis.d.ts:791 | (source: KeyLike, destination: KeyLike, member: string) =&gt; Promise&lt;boolean&gt; |
| bun.RedisClient.smembers | MethodDeclaration | redis.d.ts:798 | (key: KeyLike) =&gt; Promise&lt;string[]&gt; |
| bun.RedisClient.srandmember | MethodDeclaration | redis.d.ts:806 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[] &#124; null&gt;; } |
| bun.RedisClient.srandmember | MethodDeclaration | redis.d.ts:814 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[] &#124; null&gt;; } |
| bun.RedisClient.spop | MethodDeclaration | redis.d.ts:822 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[] &#124; null&gt;; } |
| bun.RedisClient.spop | MethodDeclaration | redis.d.ts:830 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[] &#124; null&gt;; } |
| bun.RedisClient.spublish | MethodDeclaration | redis.d.ts:838 | (channel: KeyLike, message: string) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.sdiffstore | MethodDeclaration | redis.d.ts:847 | (destination: KeyLike, key: KeyLike, ...keys: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.smismember | MethodDeclaration | redis.d.ts:860 | (key: KeyLike, member: KeyLike, ...members: KeyLike[]) =&gt; Promise&lt;number[]&gt; |
| bun.RedisClient.sscan | MethodDeclaration | redis.d.ts:873 | (key: KeyLike, cursor: string &#124; number, ...args: (string &#124; number)[]) =&gt; Promise&lt;[string, string[]]&gt; |
| bun.RedisClient.hincrby | MethodDeclaration | redis.d.ts:882 | (key: KeyLike, field: string, increment: string &#124; number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.hincrbyfloat | MethodDeclaration | redis.d.ts:891 | (key: KeyLike, field: string, increment: string &#124; number) =&gt; Promise&lt;string&gt; |
| bun.RedisClient.hgetall | MethodDeclaration | redis.d.ts:898 | (key: KeyLike) =&gt; Promise&lt;Record&lt;string, string&gt;&gt; |
| bun.RedisClient.hkeys | MethodDeclaration | redis.d.ts:905 | (key: KeyLike) =&gt; Promise&lt;string[]&gt; |
| bun.RedisClient.hlen | MethodDeclaration | redis.d.ts:912 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.hstrlen | MethodDeclaration | redis.d.ts:920 | (key: KeyLike, field: string) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.hvals | MethodDeclaration | redis.d.ts:927 | (key: KeyLike) =&gt; Promise&lt;string[]&gt; |
| bun.RedisClient.keys | MethodDeclaration | redis.d.ts:934 | (pattern: string) =&gt; Promise&lt;string[]&gt; |
| bun.RedisClient.blpop | MethodDeclaration | redis.d.ts:958 | (...args: (number &#124; KeyLike)[]) =&gt; Promise&lt;[string, string] &#124; null&gt; |
| bun.RedisClient.brpop | MethodDeclaration | redis.d.ts:982 | (...args: (number &#124; KeyLike)[]) =&gt; Promise&lt;[string, string] &#124; null&gt; |
| bun.RedisClient.blmove | MethodDeclaration | redis.d.ts:1009 | (source: KeyLike, destination: KeyLike, from: "LEFT" &#124; "RIGHT", to: "LEFT" &#124; "RIGHT", timeout: number) =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.blmpop | MethodDeclaration | redis.d.ts:1042 | (timeout: number, numkeys: number, ...args: (string &#124; number)[]) =&gt; Promise&lt;[string, string[]] &#124; null&gt; |
| bun.RedisClient.brpoplpush | MethodDeclaration | redis.d.ts:1069 | (source: KeyLike, destination: KeyLike, timeout: number) =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.lindex | MethodDeclaration | redis.d.ts:1085 | (key: KeyLike, index: number) =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.llen | MethodDeclaration | redis.d.ts:1092 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.lmove | MethodDeclaration | redis.d.ts:1116 | (source: KeyLike, destination: KeyLike, from: "LEFT" &#124; "RIGHT", to: "LEFT" &#124; "RIGHT") =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.lpop | MethodDeclaration | redis.d.ts:1128 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[] &#124; null&gt;; } |
| bun.RedisClient.lpop | MethodDeclaration | redis.d.ts:1135 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[] &#124; null&gt;; } |
| bun.RedisClient.lpos | MethodDeclaration | redis.d.ts:1166 | (key: KeyLike, element: KeyLike, ...options: (string &#124; number)[]) =&gt; Promise&lt;number &#124; number[] &#124; null&gt; |
| bun.RedisClient.lmpop | MethodDeclaration | redis.d.ts:1195 | (numkeys: number, ...args: (string &#124; number)[]) =&gt; Promise&lt;[string, string[]] &#124; null&gt; |
| bun.RedisClient.lrange | MethodDeclaration | redis.d.ts:1212 | (key: KeyLike, start: number, stop: number) =&gt; Promise&lt;string[]&gt; |
| bun.RedisClient.lset | MethodDeclaration | redis.d.ts:1230 | (key: KeyLike, index: number, element: KeyLike) =&gt; Promise&lt;string&gt; |
| bun.RedisClient.persist | MethodDeclaration | redis.d.ts:1238 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.pexpireat | MethodDeclaration | redis.d.ts:1246 | (key: KeyLike, millisecondsTimestamp: number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.pexpiretime | MethodDeclaration | redis.d.ts:1254 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.pttl | MethodDeclaration | redis.d.ts:1262 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.randomkey | MethodDeclaration | redis.d.ts:1279 | () =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.rpop | MethodDeclaration | redis.d.ts:1286 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[]&gt;; } |
| bun.RedisClient.rpop | MethodDeclaration | redis.d.ts:1294 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[]&gt;; } |
| bun.RedisClient.rpoplpush | MethodDeclaration | redis.d.ts:1316 | (source: KeyLike, destination: KeyLike) =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.scan | MethodDeclaration | redis.d.ts:1357 | { (cursor: string &#124; number): Promise&lt;[string, string[]]&gt;; (cursor: string &#124; number, match: "MATCH", pattern: string): Promise&lt;[string, string[]]&gt;; (cursor: string &#124; number, count: "COUNT", hint: number): Promise&lt;...&gt;; (cursor: string &#124; number, match: "MATCH", pattern: string, count: "COUNT", hint: number): Promise&lt;.... |
| bun.RedisClient.scan | MethodDeclaration | redis.d.ts:1367 | { (cursor: string &#124; number): Promise&lt;[string, string[]]&gt;; (cursor: string &#124; number, match: "MATCH", pattern: string): Promise&lt;[string, string[]]&gt;; (cursor: string &#124; number, count: "COUNT", hint: number): Promise&lt;...&gt;; (cursor: string &#124; number, match: "MATCH", pattern: string, count: "COUNT", hint: number): Promise&lt;.... |
| bun.RedisClient.scan | MethodDeclaration | redis.d.ts:1377 | { (cursor: string &#124; number): Promise&lt;[string, string[]]&gt;; (cursor: string &#124; number, match: "MATCH", pattern: string): Promise&lt;[string, string[]]&gt;; (cursor: string &#124; number, count: "COUNT", hint: number): Promise&lt;...&gt;; (cursor: string &#124; number, match: "MATCH", pattern: string, count: "COUNT", hint: number): Promise&lt;.... |
| bun.RedisClient.scan | MethodDeclaration | redis.d.ts:1389 | { (cursor: string &#124; number): Promise&lt;[string, string[]]&gt;; (cursor: string &#124; number, match: "MATCH", pattern: string): Promise&lt;[string, string[]]&gt;; (cursor: string &#124; number, count: "COUNT", hint: number): Promise&lt;...&gt;; (cursor: string &#124; number, match: "MATCH", pattern: string, count: "COUNT", hint: number): Promise&lt;.... |
| bun.RedisClient.scan | MethodDeclaration | redis.d.ts:1404 | { (cursor: string &#124; number): Promise&lt;[string, string[]]&gt;; (cursor: string &#124; number, match: "MATCH", pattern: string): Promise&lt;[string, string[]]&gt;; (cursor: string &#124; number, count: "COUNT", hint: number): Promise&lt;...&gt;; (cursor: string &#124; number, match: "MATCH", pattern: string, count: "COUNT", hint: number): Promise&lt;.... |
| bun.RedisClient.scard | MethodDeclaration | redis.d.ts:1412 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.sdiff | MethodDeclaration | redis.d.ts:1420 | (key: KeyLike, ...keys: KeyLike[]) =&gt; Promise&lt;string[]&gt; |
| bun.RedisClient.sinter | MethodDeclaration | redis.d.ts:1428 | (key: KeyLike, ...keys: KeyLike[]) =&gt; Promise&lt;string[]&gt; |
| bun.RedisClient.sinterstore | MethodDeclaration | redis.d.ts:1437 | (destination: KeyLike, key: KeyLike, ...keys: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.sintercard | MethodDeclaration | redis.d.ts:1450 | (numkeys: number, key: KeyLike, ...args: (number &#124; KeyLike)[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.strlen | MethodDeclaration | redis.d.ts:1462 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.sunion | MethodDeclaration | redis.d.ts:1470 | (key: KeyLike, ...keys: KeyLike[]) =&gt; Promise&lt;string[]&gt; |
| bun.RedisClient.sunionstore | MethodDeclaration | redis.d.ts:1479 | (destination: KeyLike, key: KeyLike, ...keys: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.type | MethodDeclaration | redis.d.ts:1509 | (key: KeyLike) =&gt; Promise&lt;"hash" &#124; "list" &#124; "none" &#124; "set" &#124; "stream" &#124; "string" &#124; "zset"&gt; |
| bun.RedisClient.zcard | MethodDeclaration | redis.d.ts:1517 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zcount | MethodDeclaration | redis.d.ts:1526 | (key: KeyLike, min: string &#124; number, max: string &#124; number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zlexcount | MethodDeclaration | redis.d.ts:1535 | (key: KeyLike, min: string, max: string) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zpopmax | MethodDeclaration | redis.d.ts:1543 | { (key: KeyLike): Promise&lt;[] &#124; [string, number]&gt;; (key: KeyLike, count: number): Promise&lt;[string, number][]&gt;; } |
| bun.RedisClient.zpopmax | MethodDeclaration | redis.d.ts:1551 | { (key: KeyLike): Promise&lt;[] &#124; [string, number]&gt;; (key: KeyLike, count: number): Promise&lt;[string, number][]&gt;; } |
| bun.RedisClient.zpopmin | MethodDeclaration | redis.d.ts:1559 | { (key: KeyLike): Promise&lt;[] &#124; [string, number]&gt;; (key: KeyLike, count: number): Promise&lt;[string, number][]&gt;; } |
| bun.RedisClient.zpopmin | MethodDeclaration | redis.d.ts:1567 | { (key: KeyLike): Promise&lt;[] &#124; [string, number]&gt;; (key: KeyLike, count: number): Promise&lt;[string, number][]&gt;; } |
| bun.RedisClient.bzpopmin | MethodDeclaration | redis.d.ts:1583 | (...args: (number &#124; KeyLike)[]) =&gt; Promise&lt;[string, string, number] &#124; null&gt; |
| bun.RedisClient.bzpopmax | MethodDeclaration | redis.d.ts:1599 | (...args: (number &#124; KeyLike)[]) =&gt; Promise&lt;[string, string, number] &#124; null&gt; |
| bun.RedisClient.zrandmember | MethodDeclaration | redis.d.ts:1607 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[] &#124; null&gt;; (key: KeyLike, count: number, withscores: "WITHSCORES"): Promise&lt;...&gt;; } |
| bun.RedisClient.zrandmember | MethodDeclaration | redis.d.ts:1615 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[] &#124; null&gt;; (key: KeyLike, count: number, withscores: "WITHSCORES"): Promise&lt;...&gt;; } |
| bun.RedisClient.zrandmember | MethodDeclaration | redis.d.ts:1623 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, count: number): Promise&lt;string[] &#124; null&gt;; (key: KeyLike, count: number, withscores: "WITHSCORES"): Promise&lt;...&gt;; } |
| bun.RedisClient.zrange | MethodDeclaration | redis.d.ts:1640 | { (key: KeyLike, start: string &#124; number, stop: string &#124; number, withscores: "WITHSCORES"): Promise&lt;[string, number][]&gt;; (key: KeyLike, start: string &#124; number, stop: string &#124; number, byscore: "BYSCORE"): Promise&lt;...&gt;; (key: KeyLike, start: string, stop: string, bylex: "BYLEX"): Promise&lt;...&gt;; (key: KeyLike, start: str... |
| bun.RedisClient.zrange | MethodDeclaration | redis.d.ts:1665 | { (key: KeyLike, start: string &#124; number, stop: string &#124; number, withscores: "WITHSCORES"): Promise&lt;[string, number][]&gt;; (key: KeyLike, start: string &#124; number, stop: string &#124; number, byscore: "BYSCORE"): Promise&lt;...&gt;; (key: KeyLike, start: string, stop: string, bylex: "BYLEX"): Promise&lt;...&gt;; (key: KeyLike, start: str... |
| bun.RedisClient.zrange | MethodDeclaration | redis.d.ts:1687 | { (key: KeyLike, start: string &#124; number, stop: string &#124; number, withscores: "WITHSCORES"): Promise&lt;[string, number][]&gt;; (key: KeyLike, start: string &#124; number, stop: string &#124; number, byscore: "BYSCORE"): Promise&lt;...&gt;; (key: KeyLike, start: string, stop: string, bylex: "BYLEX"): Promise&lt;...&gt;; (key: KeyLike, start: str... |
| bun.RedisClient.zrange | MethodDeclaration | redis.d.ts:1707 | { (key: KeyLike, start: string &#124; number, stop: string &#124; number, withscores: "WITHSCORES"): Promise&lt;[string, number][]&gt;; (key: KeyLike, start: string &#124; number, stop: string &#124; number, byscore: "BYSCORE"): Promise&lt;...&gt;; (key: KeyLike, start: string, stop: string, bylex: "BYLEX"): Promise&lt;...&gt;; (key: KeyLike, start: str... |
| bun.RedisClient.zrange | MethodDeclaration | redis.d.ts:1734 | { (key: KeyLike, start: string &#124; number, stop: string &#124; number, withscores: "WITHSCORES"): Promise&lt;[string, number][]&gt;; (key: KeyLike, start: string &#124; number, stop: string &#124; number, byscore: "BYSCORE"): Promise&lt;...&gt;; (key: KeyLike, start: string, stop: string, bylex: "BYLEX"): Promise&lt;...&gt;; (key: KeyLike, start: str... |
| bun.RedisClient.zrevrange | MethodDeclaration | redis.d.ts:1755 | { (key: KeyLike, start: number, stop: number): Promise&lt;string[]&gt;; (key: KeyLike, start: number, stop: number, withscores: "WITHSCORES"): Promise&lt;[string, number][]&gt;; (key: KeyLike, start: number, stop: number, ...options: string[]): Promise&lt;...&gt;; } |
| bun.RedisClient.zrevrange | MethodDeclaration | redis.d.ts:1772 | { (key: KeyLike, start: number, stop: number): Promise&lt;string[]&gt;; (key: KeyLike, start: number, stop: number, withscores: "WITHSCORES"): Promise&lt;[string, number][]&gt;; (key: KeyLike, start: number, stop: number, ...options: string[]): Promise&lt;...&gt;; } |
| bun.RedisClient.zrevrange | MethodDeclaration | redis.d.ts:1788 | { (key: KeyLike, start: number, stop: number): Promise&lt;string[]&gt;; (key: KeyLike, start: number, stop: number, withscores: "WITHSCORES"): Promise&lt;[string, number][]&gt;; (key: KeyLike, start: number, stop: number, ...options: string[]): Promise&lt;...&gt;; } |
| bun.RedisClient.append | MethodDeclaration | redis.d.ts:1797 | (key: KeyLike, value: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.getset | MethodDeclaration | redis.d.ts:1806 | (key: KeyLike, value: KeyLike) =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.linsert | MethodDeclaration | redis.d.ts:1824 | (key: KeyLike, position: "AFTER" &#124; "BEFORE", pivot: KeyLike, element: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.lpush | MethodDeclaration | redis.d.ts:1838 | (key: KeyLike, value: KeyLike, ...rest: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.lpushx | MethodDeclaration | redis.d.ts:1847 | (key: KeyLike, value: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.lrem | MethodDeclaration | redis.d.ts:1866 | (key: KeyLike, count: number, element: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.ltrim | MethodDeclaration | redis.d.ts:1882 | (key: KeyLike, start: number, stop: number) =&gt; Promise&lt;string&gt; |
| bun.RedisClient.pfadd | MethodDeclaration | redis.d.ts:1891 | (key: KeyLike, element: string) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.rpush | MethodDeclaration | redis.d.ts:1900 | (key: KeyLike, value: KeyLike, ...rest: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.rpushx | MethodDeclaration | redis.d.ts:1909 | (key: KeyLike, value: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.setnx | MethodDeclaration | redis.d.ts:1918 | (key: KeyLike, value: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.setex | MethodDeclaration | redis.d.ts:1933 | (key: KeyLike, seconds: number, value: KeyLike) =&gt; Promise&lt;"OK"&gt; |
| bun.RedisClient.psetex | MethodDeclaration | redis.d.ts:1948 | (key: KeyLike, milliseconds: number, value: KeyLike) =&gt; Promise&lt;"OK"&gt; |
| bun.RedisClient.zscore | MethodDeclaration | redis.d.ts:1957 | (key: KeyLike, member: string) =&gt; Promise&lt;number &#124; null&gt; |
| bun.RedisClient.zincrby | MethodDeclaration | redis.d.ts:1966 | (key: KeyLike, increment: number, member: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zmscore | MethodDeclaration | redis.d.ts:1975 | (key: KeyLike, member: KeyLike, ...members: KeyLike[]) =&gt; Promise&lt;(number &#124; null)[]&gt; |
| bun.RedisClient.zadd | MethodDeclaration | redis.d.ts:2027 | (key: KeyLike, ...args: (string &#124; number)[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zscan | MethodDeclaration | redis.d.ts:2077 | (key: KeyLike, cursor: string &#124; number, ...options: string[]) =&gt; Promise&lt;[string, string[]]&gt; |
| bun.RedisClient.zrem | MethodDeclaration | redis.d.ts:2086 | (key: KeyLike, member: KeyLike, ...members: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zremrangebylex | MethodDeclaration | redis.d.ts:2095 | (key: KeyLike, min: string, max: string) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zremrangebyrank | MethodDeclaration | redis.d.ts:2104 | (key: KeyLike, start: number, stop: number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zremrangebyscore | MethodDeclaration | redis.d.ts:2113 | (key: KeyLike, min: string &#124; number, max: string &#124; number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zrangebylex | MethodDeclaration | redis.d.ts:2139 | { (key: KeyLike, min: string, max: string): Promise&lt;string[]&gt;; (key: KeyLike, min: string, max: string, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, min: string, max: string, ...options: (string &#124; number)[]): Promise&lt;...&gt;; } |
| bun.RedisClient.zrangebylex | MethodDeclaration | redis.d.ts:2159 | { (key: KeyLike, min: string, max: string): Promise&lt;string[]&gt;; (key: KeyLike, min: string, max: string, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, min: string, max: string, ...options: (string &#124; number)[]): Promise&lt;...&gt;; } |
| bun.RedisClient.zrangebylex | MethodDeclaration | redis.d.ts:2177 | { (key: KeyLike, min: string, max: string): Promise&lt;string[]&gt;; (key: KeyLike, min: string, max: string, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, min: string, max: string, ...options: (string &#124; number)[]): Promise&lt;...&gt;; } |
| bun.RedisClient.zrangebyscore | MethodDeclaration | redis.d.ts:2202 | { (key: KeyLike, min: string &#124; number, max: string &#124; number): Promise&lt;string[]&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, withscores: "WITHSCORES"): Promise&lt;...&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, ... |
| bun.RedisClient.zrangebyscore | MethodDeclaration | redis.d.ts:2220 | { (key: KeyLike, min: string &#124; number, max: string &#124; number): Promise&lt;string[]&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, withscores: "WITHSCORES"): Promise&lt;...&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, ... |
| bun.RedisClient.zrangebyscore | MethodDeclaration | redis.d.ts:2245 | { (key: KeyLike, min: string &#124; number, max: string &#124; number): Promise&lt;string[]&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, withscores: "WITHSCORES"): Promise&lt;...&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, ... |
| bun.RedisClient.zrangebyscore | MethodDeclaration | redis.d.ts:2263 | { (key: KeyLike, min: string &#124; number, max: string &#124; number): Promise&lt;string[]&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, withscores: "WITHSCORES"): Promise&lt;...&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, ... |
| bun.RedisClient.zrangebyscore | MethodDeclaration | redis.d.ts:2280 | { (key: KeyLike, min: string &#124; number, max: string &#124; number): Promise&lt;string[]&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, withscores: "WITHSCORES"): Promise&lt;...&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, ... |
| bun.RedisClient.zrangebyscore | MethodDeclaration | redis.d.ts:2300 | { (key: KeyLike, min: string &#124; number, max: string &#124; number): Promise&lt;string[]&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, withscores: "WITHSCORES"): Promise&lt;...&gt;; (key: KeyLike, min: string &#124; number, max: string &#124; number, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, ... |
| bun.RedisClient.zrevrangebyscore | MethodDeclaration | redis.d.ts:2330 | { (key: KeyLike, max: string &#124; number, min: string &#124; number): Promise&lt;string[]&gt;; (key: KeyLike, max: string &#124; number, min: string &#124; number, withscores: "WITHSCORES"): Promise&lt;...&gt;; (key: KeyLike, max: string &#124; number, min: string &#124; number, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, ... |
| bun.RedisClient.zrevrangebyscore | MethodDeclaration | redis.d.ts:2348 | { (key: KeyLike, max: string &#124; number, min: string &#124; number): Promise&lt;string[]&gt;; (key: KeyLike, max: string &#124; number, min: string &#124; number, withscores: "WITHSCORES"): Promise&lt;...&gt;; (key: KeyLike, max: string &#124; number, min: string &#124; number, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, ... |
| bun.RedisClient.zrevrangebyscore | MethodDeclaration | redis.d.ts:2366 | { (key: KeyLike, max: string &#124; number, min: string &#124; number): Promise&lt;string[]&gt;; (key: KeyLike, max: string &#124; number, min: string &#124; number, withscores: "WITHSCORES"): Promise&lt;...&gt;; (key: KeyLike, max: string &#124; number, min: string &#124; number, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, ... |
| bun.RedisClient.zrevrangebyscore | MethodDeclaration | redis.d.ts:2384 | { (key: KeyLike, max: string &#124; number, min: string &#124; number): Promise&lt;string[]&gt;; (key: KeyLike, max: string &#124; number, min: string &#124; number, withscores: "WITHSCORES"): Promise&lt;...&gt;; (key: KeyLike, max: string &#124; number, min: string &#124; number, limit: "LIMIT", offset: number, count: number): Promise&lt;...&gt;; (key: KeyLike, ... |
| bun.RedisClient.zrevrangebylex | MethodDeclaration | redis.d.ts:2419 | (key: KeyLike, max: string, min: string, ...options: string[]) =&gt; Promise&lt;string[]&gt; |
| bun.RedisClient.zrangestore | MethodDeclaration | redis.d.ts:2452 | (destination: KeyLike, source: KeyLike, start: string &#124; number, stop: string &#124; number, ...options: string[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zrank | MethodDeclaration | redis.d.ts:2466 | { (key: KeyLike, member: string): Promise&lt;number &#124; null&gt;; (key: KeyLike, member: string, withscore: "WITHSCORE"): Promise&lt;[number, number] &#124; null&gt;; } |
| bun.RedisClient.zrank | MethodDeclaration | redis.d.ts:2475 | { (key: KeyLike, member: string): Promise&lt;number &#124; null&gt;; (key: KeyLike, member: string, withscore: "WITHSCORE"): Promise&lt;[number, number] &#124; null&gt;; } |
| bun.RedisClient.zrevrank | MethodDeclaration | redis.d.ts:2483 | { (key: KeyLike, member: string): Promise&lt;number &#124; null&gt;; (key: KeyLike, member: string, withscore: "WITHSCORE"): Promise&lt;[number, number] &#124; null&gt;; } |
| bun.RedisClient.zrevrank | MethodDeclaration | redis.d.ts:2492 | { (key: KeyLike, member: string): Promise&lt;number &#124; null&gt;; (key: KeyLike, member: string, withscore: "WITHSCORE"): Promise&lt;[number, number] &#124; null&gt;; } |
| bun.RedisClient.mget | MethodDeclaration | redis.d.ts:2500 | (...keys: KeyLike[]) =&gt; Promise&lt;(string &#124; null)[]&gt; |
| bun.RedisClient.mset | MethodDeclaration | redis.d.ts:2519 | (...keyValuePairs: KeyLike[]) =&gt; Promise&lt;"OK"&gt; |
| bun.RedisClient.msetnx | MethodDeclaration | redis.d.ts:2544 | (...keyValuePairs: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.bitcount | MethodDeclaration | redis.d.ts:2551 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.getbit | MethodDeclaration | redis.d.ts:2559 | (key: KeyLike, offset: number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.setbit | MethodDeclaration | redis.d.ts:2568 | (key: KeyLike, offset: number, value: 0 &#124; 1) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.getrange | MethodDeclaration | redis.d.ts:2577 | (key: KeyLike, start: number, end: number) =&gt; Promise&lt;string&gt; |
| bun.RedisClient.substr | MethodDeclaration | redis.d.ts:2588 | (key: KeyLike, start: number, end: number) =&gt; Promise&lt;string&gt; |
| bun.RedisClient.setrange | MethodDeclaration | redis.d.ts:2597 | (key: KeyLike, offset: number, value: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.dump | MethodDeclaration | redis.d.ts:2605 | (key: KeyLike) =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.expiretime | MethodDeclaration | redis.d.ts:2614 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.getdel | MethodDeclaration | redis.d.ts:2623 | (key: KeyLike) =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.getex | MethodDeclaration | redis.d.ts:2632 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, ex: "EX", seconds: number): Promise&lt;string &#124; null&gt;; (key: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, pxat: "PXAT", timestampMilliseconds: number): Promise&lt;...&gt;; (... |
| bun.RedisClient.getex | MethodDeclaration | redis.d.ts:2643 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, ex: "EX", seconds: number): Promise&lt;string &#124; null&gt;; (key: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, pxat: "PXAT", timestampMilliseconds: number): Promise&lt;...&gt;; (... |
| bun.RedisClient.getex | MethodDeclaration | redis.d.ts:2652 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, ex: "EX", seconds: number): Promise&lt;string &#124; null&gt;; (key: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, pxat: "PXAT", timestampMilliseconds: number): Promise&lt;...&gt;; (... |
| bun.RedisClient.getex | MethodDeclaration | redis.d.ts:2662 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, ex: "EX", seconds: number): Promise&lt;string &#124; null&gt;; (key: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, pxat: "PXAT", timestampMilliseconds: number): Promise&lt;...&gt;; (... |
| bun.RedisClient.getex | MethodDeclaration | redis.d.ts:2672 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, ex: "EX", seconds: number): Promise&lt;string &#124; null&gt;; (key: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, pxat: "PXAT", timestampMilliseconds: number): Promise&lt;...&gt;; (... |
| bun.RedisClient.getex | MethodDeclaration | redis.d.ts:2681 | { (key: KeyLike): Promise&lt;string &#124; null&gt;; (key: KeyLike, ex: "EX", seconds: number): Promise&lt;string &#124; null&gt;; (key: KeyLike, px: "PX", milliseconds: number): Promise&lt;...&gt;; (key: KeyLike, exat: "EXAT", timestampSeconds: number): Promise&lt;...&gt;; (key: KeyLike, pxat: "PXAT", timestampMilliseconds: number): Promise&lt;...&gt;; (... |
| bun.RedisClient.ping | MethodDeclaration | redis.d.ts:2687 | { (): Promise&lt;"PONG"&gt;; (message: KeyLike): Promise&lt;string&gt;; } |
| bun.RedisClient.ping | MethodDeclaration | redis.d.ts:2695 | { (): Promise&lt;"PONG"&gt;; (message: KeyLike): Promise&lt;string&gt;; } |
| bun.RedisClient.publish | MethodDeclaration | redis.d.ts:2706 | (channel: string, message: string) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.subscribe | MethodDeclaration | redis.d.ts:2731 | { (channel: string, listener: StringPubSubListener): Promise&lt;number&gt;; (channels: string[], listener: StringPubSubListener): Promise&lt;...&gt;; } |
| bun.RedisClient.subscribe | MethodDeclaration | redis.d.ts:2747 | { (channel: string, listener: StringPubSubListener): Promise&lt;number&gt;; (channels: string[], listener: StringPubSubListener): Promise&lt;...&gt;; } |
| bun.RedisClient.unsubscribe | MethodDeclaration | redis.d.ts:2761 | { (channel: string): Promise&lt;void&gt;; (channel: string, listener: StringPubSubListener): Promise&lt;void&gt;; (): Promise&lt;void&gt;; (channels: string[]): Promise&lt;...&gt;; } |
| bun.RedisClient.unsubscribe | MethodDeclaration | redis.d.ts:2778 | { (channel: string): Promise&lt;void&gt;; (channel: string, listener: StringPubSubListener): Promise&lt;void&gt;; (): Promise&lt;void&gt;; (channels: string[]): Promise&lt;...&gt;; } |
| bun.RedisClient.unsubscribe | MethodDeclaration | redis.d.ts:2790 | { (channel: string): Promise&lt;void&gt;; (channel: string, listener: StringPubSubListener): Promise&lt;void&gt;; (): Promise&lt;void&gt;; (channels: string[]): Promise&lt;...&gt;; } |
| bun.RedisClient.unsubscribe | MethodDeclaration | redis.d.ts:2804 | { (channel: string): Promise&lt;void&gt;; (channel: string, listener: StringPubSubListener): Promise&lt;void&gt;; (): Promise&lt;void&gt;; (channels: string[]): Promise&lt;...&gt;; } |
| bun.RedisClient.duplicate | MethodDeclaration | redis.d.ts:2812 | () =&gt; Promise&lt;RedisClient&gt; |
| bun.RedisClient.copy | MethodDeclaration | redis.d.ts:2832 | { (source: KeyLike, destination: KeyLike): Promise&lt;number&gt;; (source: KeyLike, destination: KeyLike, replace: "REPLACE"): Promise&lt;number&gt;; } |
| bun.RedisClient.copy | MethodDeclaration | redis.d.ts:2852 | { (source: KeyLike, destination: KeyLike): Promise&lt;number&gt;; (source: KeyLike, destination: KeyLike, replace: "REPLACE"): Promise&lt;number&gt;; } |
| bun.RedisClient.unlink | MethodDeclaration | redis.d.ts:2872 | (...keys: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.touch | MethodDeclaration | redis.d.ts:2894 | (...keys: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.rename | MethodDeclaration | redis.d.ts:2914 | (key: KeyLike, newkey: KeyLike) =&gt; Promise&lt;"OK"&gt; |
| bun.RedisClient.renamenx | MethodDeclaration | redis.d.ts:2933 | (key: KeyLike, newkey: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zdiff | MethodDeclaration | redis.d.ts:2950 | { (numkeys: number, ...args: [...keys: KeyLike[], withscores: "WITHSCORES"]): Promise&lt;[string, number][]&gt;; (numkeys: number, ...keys: KeyLike[]): Promise&lt;string[]&gt;; } |
| bun.RedisClient.zdiff | MethodDeclaration | redis.d.ts:2974 | { (numkeys: number, ...args: [...keys: KeyLike[], withscores: "WITHSCORES"]): Promise&lt;[string, number][]&gt;; (numkeys: number, ...keys: KeyLike[]): Promise&lt;string[]&gt;; } |
| bun.RedisClient.zdiffstore | MethodDeclaration | redis.d.ts:2996 | (destination: KeyLike, numkeys: number, ...keys: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zinter | MethodDeclaration | redis.d.ts:3038 | { (numkeys: number, ...args: [...args: (string &#124; number)[], withscores: "WITHSCORES"]): Promise&lt;[string, number][]&gt;; (numkeys: number, ...args: (string &#124; number)[]): Promise&lt;string[]&gt;; } |
| bun.RedisClient.zinter | MethodDeclaration | redis.d.ts:3083 | { (numkeys: number, ...args: [...args: (string &#124; number)[], withscores: "WITHSCORES"]): Promise&lt;[string, number][]&gt;; (numkeys: number, ...args: (string &#124; number)[]): Promise&lt;string[]&gt;; } |
| bun.RedisClient.zintercard | MethodDeclaration | redis.d.ts:3107 | { (numkeys: number, ...keys: KeyLike[]): Promise&lt;number&gt;; (numkeys: number, ...args: (number &#124; KeyLike)[]): Promise&lt;number&gt;; } |
| bun.RedisClient.zintercard | MethodDeclaration | redis.d.ts:3124 | { (numkeys: number, ...keys: KeyLike[]): Promise&lt;number&gt;; (numkeys: number, ...args: (number &#124; KeyLike)[]): Promise&lt;number&gt;; } |
| bun.RedisClient.zinterstore | MethodDeclaration | redis.d.ts:3160 | (destination: KeyLike, numkeys: number, ...args: (string &#124; number)[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zunion | MethodDeclaration | redis.d.ts:3199 | { (numkeys: number, ...args: [...args: (string &#124; number)[], withscores: "WITHSCORES"]): Promise&lt;[string, number][]&gt;; (numkeys: number, ...args: (string &#124; number)[]): Promise&lt;string[]&gt;; } |
| bun.RedisClient.zunion | MethodDeclaration | redis.d.ts:3241 | { (numkeys: number, ...args: [...args: (string &#124; number)[], withscores: "WITHSCORES"]): Promise&lt;[string, number][]&gt;; (numkeys: number, ...args: (string &#124; number)[]): Promise&lt;string[]&gt;; } |
| bun.RedisClient.zunionstore | MethodDeclaration | redis.d.ts:3277 | (destination: KeyLike, numkeys: number, ...args: (string &#124; number)[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.zmpop | MethodDeclaration | redis.d.ts:3302 | (numkeys: number, ...args: (string &#124; number)[]) =&gt; Promise&lt;[string, [string, number][]] &#124; null&gt; |
| bun.RedisClient.bzmpop | MethodDeclaration | redis.d.ts:3322 | (timeout: number, numkeys: number, ...args: (string &#124; number)[]) =&gt; Promise&lt;[string, [string, number][]] &#124; null&gt; |
| bun.RedisClient.bitop | MethodDeclaration | redis.d.ts:3341 | { (operation: "NOT" &#124; "not", destkey: KeyLike, key: KeyLike): Promise&lt;number&gt;; (operation: "AND" &#124; "ANDOR" &#124; "DIFF" &#124; "DIFF1" &#124; "ONE" &#124; "OR" &#124; "XOR" &#124; "and" &#124; ... 5 more ... &#124; "xor", destkey: KeyLike, key: KeyLike, ...moreKeys: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.bitop | MethodDeclaration | redis.d.ts:3357 | { (operation: "NOT" &#124; "not", destkey: KeyLike, key: KeyLike): Promise&lt;number&gt;; (operation: "AND" &#124; "ANDOR" &#124; "DIFF" &#124; "DIFF1" &#124; "ONE" &#124; "OR" &#124; "XOR" &#124; "and" &#124; ... 5 more ... &#124; "xor", destkey: KeyLike, key: KeyLike, ...moreKeys: KeyLike[]): Promise&lt;...&gt;; } |
| bun.RedisClient.bitpos | MethodDeclaration | redis.d.ts:3392 | (key: KeyLike, bit: 0 &#124; 1, ...options: (string &#124; number)[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.bitfield | MethodDeclaration | redis.d.ts:3406 | (key: KeyLike, ...operations: (string &#124; number)[]) =&gt; Promise&lt;(number &#124; null)[]&gt; |
| bun.RedisClient.pfcount | MethodDeclaration | redis.d.ts:3421 | (key: KeyLike, ...moreKeys: KeyLike[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.pfmerge | MethodDeclaration | redis.d.ts:3437 | (destkey: KeyLike, ...sourcekeys: KeyLike[]) =&gt; Promise&lt;"OK"&gt; |
| bun.RedisClient.geoadd | MethodDeclaration | redis.d.ts:3451 | (key: KeyLike, ...args: (string &#124; number)[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.geodist | MethodDeclaration | redis.d.ts:3465 | { (key: KeyLike, member1: string, member2: string): Promise&lt;string &#124; null&gt;; (key: KeyLike, member1: string, member2: string, unit: "FT" &#124; "KM" &#124; "M" &#124; ... 4 more ... &#124; "mi"): Promise&lt;...&gt;; } |
| bun.RedisClient.geodist | MethodDeclaration | redis.d.ts:3479 | { (key: KeyLike, member1: string, member2: string): Promise&lt;string &#124; null&gt;; (key: KeyLike, member1: string, member2: string, unit: "FT" &#124; "KM" &#124; "M" &#124; ... 4 more ... &#124; "mi"): Promise&lt;...&gt;; } |
| bun.RedisClient.geohash | MethodDeclaration | redis.d.ts:3498 | (key: KeyLike, ...members: string[]) =&gt; Promise&lt;(string &#124; null)[]&gt; |
| bun.RedisClient.geopos | MethodDeclaration | redis.d.ts:3512 | (key: KeyLike, ...members: string[]) =&gt; Promise&lt;([number, number] &#124; null)[]&gt; |
| bun.RedisClient.geosearch | MethodDeclaration | redis.d.ts:3526 | (key: KeyLike, ...args: (string &#124; number)[]) =&gt; Promise&lt;unknown[]&gt; |
| bun.RedisClient.geosearchstore | MethodDeclaration | redis.d.ts:3535 | (destination: KeyLike, source: KeyLike, ...args: (string &#124; number)[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.eval | MethodDeclaration | redis.d.ts:3556 | (script: string, numkeys: number, ...keysAndArgs: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.evalsha | MethodDeclaration | redis.d.ts:3573 | (sha1: string, numkeys: number, ...keysAndArgs: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.script | MethodDeclaration | redis.d.ts:3587 | (...args: string[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.fcall | MethodDeclaration | redis.d.ts:3598 | (name: string, numkeys: number, ...keysAndArgs: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.function | MethodDeclaration | redis.d.ts:3612 | (...args: KeyLike[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.dbsize | MethodDeclaration | redis.d.ts:3618 | () =&gt; Promise&lt;number&gt; |
| bun.RedisClient.flushdb | MethodDeclaration | redis.d.ts:3624 | { (): Promise&lt;"OK"&gt;; (mode: "ASYNC" &#124; "SYNC" &#124; "async" &#124; "sync"): Promise&lt;"OK"&gt;; } |
| bun.RedisClient.flushdb | MethodDeclaration | redis.d.ts:3630 | { (): Promise&lt;"OK"&gt;; (mode: "ASYNC" &#124; "SYNC" &#124; "async" &#124; "sync"): Promise&lt;"OK"&gt;; } |
| bun.RedisClient.flushall | MethodDeclaration | redis.d.ts:3636 | { (): Promise&lt;"OK"&gt;; (mode: "ASYNC" &#124; "SYNC" &#124; "async" &#124; "sync"): Promise&lt;"OK"&gt;; } |
| bun.RedisClient.flushall | MethodDeclaration | redis.d.ts:3642 | { (): Promise&lt;"OK"&gt;; (mode: "ASYNC" &#124; "SYNC" &#124; "async" &#124; "sync"): Promise&lt;"OK"&gt;; } |
| bun.RedisClient.info | MethodDeclaration | redis.d.ts:3654 | (...sections: string[]) =&gt; Promise&lt;string&gt; |
| bun.RedisClient.time | MethodDeclaration | redis.d.ts:3660 | () =&gt; Promise&lt;[string, string]&gt; |
| bun.RedisClient.echo | MethodDeclaration | redis.d.ts:3667 | (message: string) =&gt; Promise&lt;string&gt; |
| bun.RedisClient.lastsave | MethodDeclaration | redis.d.ts:3673 | () =&gt; Promise&lt;number&gt; |
| bun.RedisClient.client | MethodDeclaration | redis.d.ts:3686 | (...args: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.config | MethodDeclaration | redis.d.ts:3698 | (...args: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.debug | MethodDeclaration | redis.d.ts:3705 | (...args: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.command | MethodDeclaration | redis.d.ts:3717 | (...args: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.object | MethodDeclaration | redis.d.ts:3731 | (subcommand: string, ...args: KeyLike[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.sort | MethodDeclaration | redis.d.ts:3747 | (key: KeyLike, ...args: (string &#124; number)[]) =&gt; Promise&lt;number &#124; (string &#124; null)[]&gt; |
| bun.RedisClient.wait | MethodDeclaration | redis.d.ts:3755 | (numreplicas: number, timeout: number) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.lcs | MethodDeclaration | redis.d.ts:3772 | (key1: KeyLike, key2: KeyLike, ...options: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.xadd | MethodDeclaration | redis.d.ts:3785 | (key: KeyLike, ...args: (string &#124; number)[]) =&gt; Promise&lt;string &#124; null&gt; |
| bun.RedisClient.xlen | MethodDeclaration | redis.d.ts:3792 | (key: KeyLike) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.xrange | MethodDeclaration | redis.d.ts:3808 | (key: KeyLike, start: string, end: string, ...options: (string &#124; number)[]) =&gt; Promise&lt;[string, string[]][]&gt; |
| bun.RedisClient.xrevrange | MethodDeclaration | redis.d.ts:3823 | (key: KeyLike, end: string, start: string, ...options: (string &#124; number)[]) =&gt; Promise&lt;[string, string[]][]&gt; |
| bun.RedisClient.xread | MethodDeclaration | redis.d.ts:3840 | (...args: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.xreadgroup | MethodDeclaration | redis.d.ts:3852 | (...args: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.xdel | MethodDeclaration | redis.d.ts:3861 | (key: KeyLike, id: string, ...moreIds: string[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.xtrim | MethodDeclaration | redis.d.ts:3877 | (key: KeyLike, strategy: "MAXLEN" &#124; "MINID" &#124; "maxlen" &#124; "minid", threshold: string &#124; number, ...options: (string &#124; number)[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.xack | MethodDeclaration | redis.d.ts:3892 | (key: KeyLike, group: string, id: string, ...moreIds: string[]) =&gt; Promise&lt;number&gt; |
| bun.RedisClient.xclaim | MethodDeclaration | redis.d.ts:3904 | (key: KeyLike, group: string, consumer: string, minIdleTime: number, id: string, ...rest: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.xautoclaim | MethodDeclaration | redis.d.ts:3923 | (key: KeyLike, group: string, consumer: string, minIdleTime: number, start: string, ...options: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.xpending | MethodDeclaration | redis.d.ts:3947 | (key: KeyLike, group: string, ...args: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.xinfo | MethodDeclaration | redis.d.ts:3961 | (subcommand: string, ...args: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.xgroup | MethodDeclaration | redis.d.ts:3975 | (subcommand: string, ...args: (string &#124; number)[]) =&gt; Promise&lt;any&gt; |
| bun.RedisClient.xsetid | MethodDeclaration | redis.d.ts:3984 | (key: KeyLike, lastId: string, ...options: (string &#124; number)[]) =&gt; Promise&lt;"OK"&gt; |
| bun.redis | VariableDeclaration | redis.d.ts:3995 | RedisClient |
| bun | ModuleDeclaration | s3.d.ts:1 | typeof import("bun") |
| bun.FileSink | InterfaceDeclaration | s3.d.ts:7 | FileSink |
| bun.FileSink.write | MethodSignature | s3.d.ts:16 | (chunk: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;) =&gt; number &#124; Promise&lt;...&gt; |
| bun.FileSink.flush | MethodSignature | s3.d.ts:22 | () =&gt; number &#124; Promise&lt;number&gt; |
| bun.FileSink.end | MethodSignature | s3.d.ts:29 | (error?: Error &#124; undefined) =&gt; number &#124; Promise&lt;number&gt; |
| bun.FileSink.start | MethodSignature | s3.d.ts:36 | (options?: { highWaterMark?: number &#124; undefined; } &#124; undefined) =&gt; void |
| bun.FileSink.start.[TypeLiteral] | TypeLiteral | s3.d.ts:36 | { highWaterMark?: number &#124; undefined; } |
| bun.FileSink.start.highWaterMark | PropertySignature | s3.d.ts:41 | number &#124; undefined |
| bun.FileSink.ref | MethodSignature | s3.d.ts:58 | () =&gt; void |
| bun.FileSink.unref | MethodSignature | s3.d.ts:66 | () =&gt; void |
| bun.NetworkSink | InterfaceDeclaration | s3.d.ts:69 | NetworkSink |
| bun.NetworkSink.write | MethodSignature | s3.d.ts:78 | (chunk: string &#124; ArrayBuffer &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;) =&gt; number &#124; Promise&lt;...&gt; |
| bun.NetworkSink.flush | MethodSignature | s3.d.ts:84 | () =&gt; number &#124; Promise&lt;number&gt; |
| bun.NetworkSink.end | MethodSignature | s3.d.ts:91 | (error?: Error &#124; undefined) =&gt; number &#124; Promise&lt;number&gt; |
| bun.NetworkSink.stat | MethodSignature | s3.d.ts:98 | () =&gt; Promise&lt;Stats&gt; |
| bun.S3Options | InterfaceDeclaration | s3.d.ts:104 | S3Options |
| bun.S3Options.acl | PropertySignature | s3.d.ts:127 | "authenticated-read" &#124; "aws-exec-read" &#124; "bucket-owner-full-control" &#124; "bucket-owner-read" &#124; "log-delivery-write" &#124; "private" &#124; "public-read" &#124; "public-read-write" &#124; undefined |
| bun.S3Options.bucket | PropertySignature | s3.d.ts:153 | string &#124; undefined |
| bun.S3Options.region | PropertySignature | s3.d.ts:166 | string &#124; undefined |
| bun.S3Options.accessKeyId | PropertySignature | s3.d.ts:172 | string &#124; undefined |
| bun.S3Options.secretAccessKey | PropertySignature | s3.d.ts:178 | string &#124; undefined |
| bun.S3Options.sessionToken | PropertySignature | s3.d.ts:194 | string &#124; undefined |
| bun.S3Options.endpoint | PropertySignature | s3.d.ts:232 | string &#124; undefined |
| bun.S3Options.virtualHostedStyle | PropertySignature | s3.d.ts:248 | boolean &#124; undefined |
| bun.S3Options.partSize | PropertySignature | s3.d.ts:268 | number &#124; undefined |
| bun.S3Options.queueSize | PropertySignature | s3.d.ts:278 | number &#124; undefined |
| bun.S3Options.retry | PropertySignature | s3.d.ts:293 | number &#124; undefined |
| bun.S3Options.type | PropertySignature | s3.d.ts:307 | string &#124; undefined |
| bun.S3Options.contentDisposition | PropertySignature | s3.d.ts:329 | string &#124; undefined |
| bun.S3Options.contentEncoding | PropertySignature | s3.d.ts:352 | string &#124; undefined |
| bun.S3Options.storageClass | PropertySignature | s3.d.ts:366 | "DEEP_ARCHIVE" &#124; "EXPRESS_ONEZONE" &#124; "GLACIER" &#124; "GLACIER_IR" &#124; "INTELLIGENT_TIERING" &#124; "ONEZONE_IA" &#124; "OUTPOSTS" &#124; "REDUCED_REDUNDANCY" &#124; "SNOW" &#124; "STANDARD" &#124; "STANDARD_IA" &#124; undefined |
| bun.S3Options.requestPayer | PropertySignature | s3.d.ts:405 | boolean &#124; undefined |
| bun.S3Options.highWaterMark | PropertySignature | s3.d.ts:410 | number &#124; undefined |
| bun.S3FilePresignOptions | InterfaceDeclaration | s3.d.ts:416 | S3FilePresignOptions |
| bun.S3FilePresignOptions.expiresIn | PropertySignature | s3.d.ts:438 | number &#124; undefined |
| bun.S3FilePresignOptions.method | PropertySignature | s3.d.ts:462 | "DELETE" &#124; "GET" &#124; "HEAD" &#124; "POST" &#124; "PUT" &#124; undefined |
| bun.S3Stats | InterfaceDeclaration | s3.d.ts:465 | S3Stats |
| bun.S3Stats.size | PropertySignature | s3.d.ts:466 | number |
| bun.S3Stats.lastModified | PropertySignature | s3.d.ts:467 | Date |
| bun.S3Stats.etag | PropertySignature | s3.d.ts:468 | string |
| bun.S3Stats.type | PropertySignature | s3.d.ts:469 | string |
| bun.S3File | InterfaceDeclaration | s3.d.ts:478 | S3File |
| bun.S3File.slice | MethodSignature | s3.d.ts:533 | { (begin?: number &#124; undefined, end?: number &#124; undefined, contentType?: string &#124; undefined): S3File; (begin?: number &#124; undefined, contentType?: string &#124; undefined): S3File; (contentType?: string &#124; undefined): S3File; } |
| bun.S3File.slice | MethodSignature | s3.d.ts:534 | { (begin?: number &#124; undefined, end?: number &#124; undefined, contentType?: string &#124; undefined): S3File; (begin?: number &#124; undefined, contentType?: string &#124; undefined): S3File; (contentType?: string &#124; undefined): S3File; } |
| bun.S3File.slice | MethodSignature | s3.d.ts:535 | { (begin?: number &#124; undefined, end?: number &#124; undefined, contentType?: string &#124; undefined): S3File; (begin?: number &#124; undefined, contentType?: string &#124; undefined): S3File; (contentType?: string &#124; undefined): S3File; } |
| bun.S3File.writer | MethodSignature | s3.d.ts:584 | (options?: S3Options &#124; undefined) =&gt; NetworkSink |
| bun.S3File.readable | PropertySignature | s3.d.ts:621 | ReadableStream&lt;Uint8Array&lt;ArrayBuffer&gt;&gt; |
| bun.S3File.stream | MethodSignature | s3.d.ts:622 | () =&gt; ReadableStream&lt;Uint8Array&lt;ArrayBuffer&gt;&gt; |
| bun.S3File.name | PropertySignature | s3.d.ts:633 | string &#124; undefined |
| bun.S3File.bucket | PropertySignature | s3.d.ts:644 | string &#124; undefined |
| bun.S3File.exists | MethodSignature | s3.d.ts:673 | () =&gt; Promise&lt;boolean&gt; |
| bun.S3File.write | MethodSignature | s3.d.ts:716 | (data: string &#124; Archive &#124; ArrayBuffer &#124; Blob &#124; BunFile &#124; Request &#124; Response &#124; S3File &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;...&gt;, options?: S3Options &#124; undefined) =&gt; Promise&lt;...&gt; |
| bun.S3File.presign | MethodSignature | s3.d.ts:767 | (options?: S3FilePresignOptions &#124; undefined) =&gt; string |
| bun.S3File.delete | MethodSignature | s3.d.ts:791 | () =&gt; Promise&lt;void&gt; |
| bun.S3File.unlink | PropertySignature | s3.d.ts:801 | () =&gt; Promise&lt;void&gt; |
| bun.S3File.stat | MethodSignature | s3.d.ts:808 | () =&gt; Promise&lt;S3Stats&gt; |
| bun.S3ListObjectsOptions | InterfaceDeclaration | s3.d.ts:811 | S3ListObjectsOptions |
| bun.S3ListObjectsOptions.prefix | PropertySignature | s3.d.ts:813 | string &#124; undefined |
| bun.S3ListObjectsOptions.continuationToken | PropertySignature | s3.d.ts:815 | string &#124; undefined |
| bun.S3ListObjectsOptions.delimiter | PropertySignature | s3.d.ts:817 | string &#124; undefined |
| bun.S3ListObjectsOptions.maxKeys | PropertySignature | s3.d.ts:819 | number &#124; undefined |
| bun.S3ListObjectsOptions.startAfter | PropertySignature | s3.d.ts:821 | string &#124; undefined |
| bun.S3ListObjectsOptions.encodingType | PropertySignature | s3.d.ts:823 | "url" &#124; undefined |
| bun.S3ListObjectsOptions.fetchOwner | PropertySignature | s3.d.ts:825 | boolean &#124; undefined |
| bun.S3ListObjectsResponse | InterfaceDeclaration | s3.d.ts:828 | S3ListObjectsResponse |
| bun.S3ListObjectsResponse.commonPrefixes | PropertySignature | s3.d.ts:843 | { prefix: string; }[] &#124; undefined |
| bun.S3ListObjectsResponse.commonPrefixes.[TypeLiteral] | TypeLiteral | s3.d.ts:843 | { prefix: string; } |
| bun.S3ListObjectsResponse.commonPrefixes.prefix | PropertySignature | s3.d.ts:843 | string |
| bun.S3ListObjectsResponse.contents | PropertySignature | s3.d.ts:845 | { checksumAlgorithm?: "CRC32" &#124; "CRC32C" &#124; "CRC64NVME" &#124; "SHA1" &#124; "SHA256" &#124; undefined; checksumType?: "COMPOSITE" &#124; "FULL_OBJECT" &#124; undefined; eTag?: string &#124; undefined; key: string; ... 4 more ...; storageClass?: "DEEP_ARCHIVE" &#124; ... 10 more ... &#124; undefined; }[] &#124; undefined |
| bun.S3ListObjectsResponse.contents.[TypeLiteral] | TypeLiteral | s3.d.ts:845 | { checksumAlgorithm?: "CRC32" &#124; "CRC32C" &#124; "CRC64NVME" &#124; "SHA1" &#124; "SHA256" &#124; undefined; checksumType?: "COMPOSITE" &#124; "FULL_OBJECT" &#124; undefined; eTag?: string &#124; undefined; key: string; ... 4 more ...; storageClass?: "DEEP_ARCHIVE" &#124; ... 10 more ... &#124; undefined; } |
| bun.S3ListObjectsResponse.contents.checksumAlgorithm | PropertySignature | s3.d.ts:847 | "CRC32" &#124; "CRC32C" &#124; "CRC64NVME" &#124; "SHA1" &#124; "SHA256" &#124; undefined |
| bun.S3ListObjectsResponse.contents.checksumType | PropertySignature | s3.d.ts:849 | "COMPOSITE" &#124; "FULL_OBJECT" &#124; undefined |
| bun.S3ListObjectsResponse.contents.eTag | PropertySignature | s3.d.ts:859 | string &#124; undefined |
| bun.S3ListObjectsResponse.contents.key | PropertySignature | s3.d.ts:861 | string |
| bun.S3ListObjectsResponse.contents.lastModified | PropertySignature | s3.d.ts:863 | string &#124; undefined |
| bun.S3ListObjectsResponse.contents.owner | PropertySignature | s3.d.ts:865 | { id?: string &#124; undefined; displayName?: string &#124; undefined; } &#124; undefined |
| bun.S3ListObjectsResponse.contents.owner.[TypeLiteral] | TypeLiteral | s3.d.ts:865 | { id?: string &#124; undefined; displayName?: string &#124; undefined; } |
| bun.S3ListObjectsResponse.contents.owner.id | PropertySignature | s3.d.ts:867 | string &#124; undefined |
| bun.S3ListObjectsResponse.contents.owner.displayName | PropertySignature | s3.d.ts:869 | string &#124; undefined |
| bun.S3ListObjectsResponse.contents.restoreStatus | PropertySignature | s3.d.ts:872 | { isRestoreInProgress?: boolean &#124; undefined; restoreExpiryDate?: string &#124; undefined; } &#124; undefined |
| bun.S3ListObjectsResponse.contents.restoreStatus.[TypeLiteral] | TypeLiteral | s3.d.ts:872 | { isRestoreInProgress?: boolean &#124; undefined; restoreExpiryDate?: string &#124; undefined; } |
| bun.S3ListObjectsResponse.contents.restoreStatus.isRestoreInProgress | PropertySignature | s3.d.ts:874 | boolean &#124; undefined |
| bun.S3ListObjectsResponse.contents.restoreStatus.restoreExpiryDate | PropertySignature | s3.d.ts:876 | string &#124; undefined |
| bun.S3ListObjectsResponse.contents.size | PropertySignature | s3.d.ts:879 | number &#124; undefined |
| bun.S3ListObjectsResponse.contents.storageClass | PropertySignature | s3.d.ts:881 | "DEEP_ARCHIVE" &#124; "EXPRESS_ONEZONE" &#124; "GLACIER" &#124; "GLACIER_IR" &#124; "INTELLIGENT_TIERING" &#124; "ONEZONE_IA" &#124; "OUTPOSTS" &#124; "REDUCED_REDUNDANCY" &#124; "SNOW" &#124; "STANDARD" &#124; "STANDARD_IA" &#124; undefined |
| bun.S3ListObjectsResponse.continuationToken | PropertySignature | s3.d.ts:895 | string &#124; undefined |
| bun.S3ListObjectsResponse.delimiter | PropertySignature | s3.d.ts:897 | string &#124; undefined |
| bun.S3ListObjectsResponse.encodingType | PropertySignature | s3.d.ts:899 | "url" &#124; undefined |
| bun.S3ListObjectsResponse.isTruncated | PropertySignature | s3.d.ts:901 | boolean &#124; undefined |
| bun.S3ListObjectsResponse.keyCount | PropertySignature | s3.d.ts:903 | number &#124; undefined |
| bun.S3ListObjectsResponse.maxKeys | PropertySignature | s3.d.ts:905 | number &#124; undefined |
| bun.S3ListObjectsResponse.name | PropertySignature | s3.d.ts:907 | string &#124; undefined |
| bun.S3ListObjectsResponse.nextContinuationToken | PropertySignature | s3.d.ts:909 | string &#124; undefined |
| bun.S3ListObjectsResponse.prefix | PropertySignature | s3.d.ts:911 | string &#124; undefined |
| bun.S3ListObjectsResponse.startAfter | PropertySignature | s3.d.ts:913 | string &#124; undefined |
| bun.S3Client | ClassDeclaration | s3.d.ts:940 | S3Client |
| bun.S3Client.constructor | Constructor | s3.d.ts:973 | any |
| bun.S3Client.file | MethodDeclaration | s3.d.ts:993 | (path: string, options?: S3Options &#124; undefined) =&gt; S3File |
| bun.S3Client.file | MethodDeclaration | s3.d.ts:1014 | (path: string, options?: S3Options &#124; undefined) =&gt; S3File |
| bun.S3Client.write | MethodDeclaration | s3.d.ts:1048 | (path: string, data: string &#124; Archive &#124; ArrayBuffer &#124; Blob &#124; BunFile &#124; File &#124; Request &#124; Response &#124; S3File &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;...&gt;, options?: S3Options &#124; undefined) =&gt; Promise&lt;...&gt; |
| bun.S3Client.write | MethodDeclaration | s3.d.ts:1101 | (path: string, data: string &#124; Archive &#124; ArrayBuffer &#124; Blob &#124; BunFile &#124; File &#124; Request &#124; Response &#124; S3File &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;...&gt;, options?: S3Options &#124; undefined) =&gt; Promise&lt;...&gt; |
| bun.S3Client.presign | MethodDeclaration | s3.d.ts:1148 | (path: string, options?: S3FilePresignOptions &#124; undefined) =&gt; string |
| bun.S3Client.presign | MethodDeclaration | s3.d.ts:1183 | (path: string, options?: S3FilePresignOptions &#124; undefined) =&gt; string |
| bun.S3Client.unlink | MethodDeclaration | s3.d.ts:1206 | (path: string, options?: S3Options &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.S3Client.unlink | MethodDeclaration | s3.d.ts:1229 | (path: string, options?: S3Options &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.S3Client.delete | MethodDeclaration | s3.d.ts:1253 | (path: string, options?: S3Options &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.S3Client.delete | MethodDeclaration | s3.d.ts:1277 | (path: string, options?: S3Options &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.S3Client.size | MethodDeclaration | s3.d.ts:1298 | (path: string, options?: S3Options &#124; undefined) =&gt; Promise&lt;number&gt; |
| bun.S3Client.size | MethodDeclaration | s3.d.ts:1319 | (path: string, options?: S3Options &#124; undefined) =&gt; Promise&lt;number&gt; |
| bun.S3Client.exists | MethodDeclaration | s3.d.ts:1346 | (path: string, options?: S3Options &#124; undefined) =&gt; Promise&lt;boolean&gt; |
| bun.S3Client.exists | MethodDeclaration | s3.d.ts:1373 | (path: string, options?: S3Options &#124; undefined) =&gt; Promise&lt;boolean&gt; |
| bun.S3Client.stat | MethodDeclaration | s3.d.ts:1387 | (path: string, options?: S3Options &#124; undefined) =&gt; Promise&lt;S3Stats&gt; |
| bun.S3Client.stat | MethodDeclaration | s3.d.ts:1401 | (path: string, options?: S3Options &#124; undefined) =&gt; Promise&lt;S3Stats&gt; |
| bun.S3Client.list | MethodDeclaration | s3.d.ts:1436 | (input?: S3ListObjectsOptions &#124; null &#124; undefined, options?: Pick&lt;S3Options, "accessKeyId" &#124; "bucket" &#124; "endpoint" &#124; "region" &#124; "secretAccessKey" &#124; "sessionToken"&gt; &#124; undefined) =&gt; Promise&lt;...&gt; |
| bun.S3Client.list | MethodDeclaration | s3.d.ts:1474 | (input?: S3ListObjectsOptions &#124; null &#124; undefined, options?: Pick&lt;S3Options, "accessKeyId" &#124; "bucket" &#124; "endpoint" &#124; "region" &#124; "secretAccessKey" &#124; "sessionToken"&gt; &#124; undefined) =&gt; Promise&lt;...&gt; |
| bun.s3 | VariableDeclaration | s3.d.ts:1487 | S3Client |
| bun | ModuleDeclaration | security.d.ts:1 | typeof import("bun") |
| bun.Security | ModuleDeclaration | security.d.ts:5 | any |
| bun.Security.Package | InterfaceDeclaration | security.d.ts:6 | Package |
| bun.Security.Package.name | PropertySignature | security.d.ts:10 | string |
| bun.Security.Package.version | PropertySignature | security.d.ts:28 | string |
| bun.Security.Package.tarball | PropertySignature | security.d.ts:39 | string |
| bun.Security.Package.requestedRange | PropertySignature | security.d.ts:46 | string |
| bun.Security.Advisory | InterfaceDeclaration | security.d.ts:52 | Advisory |
| bun.Security.Advisory.level | PropertySignature | security.d.ts:64 | "fatal" &#124; "warn" |
| bun.Security.Advisory.package | PropertySignature | security.d.ts:69 | string |
| bun.Security.Advisory.url | PropertySignature | security.d.ts:75 | string &#124; null |
| bun.Security.Advisory.description | PropertySignature | security.d.ts:81 | string &#124; null |
| bun.Security.Scanner | InterfaceDeclaration | security.d.ts:84 | Scanner |
| bun.Security.Scanner.version | PropertySignature | security.d.ts:92 | "1" |
| bun.Security.Scanner.scan | PropertySignature | security.d.ts:109 | (info: { packages: Package[]; }) =&gt; Promise&lt;Advisory[]&gt; |
| bun.Security.Scanner.scan.[FunctionType] | FunctionType | security.d.ts:109 | (info: { packages: Package[]; }) =&gt; Promise&lt;Advisory[]&gt; |
| bun.Security.Scanner.scan.[FunctionType].[TypeLiteral] | TypeLiteral | security.d.ts:109 | { packages: Package[]; } |
| bun.Security.Scanner.scan.[FunctionType].packages | PropertySignature | security.d.ts:109 | Package[] |
| bun | ModuleDeclaration | serve.d.ts:1 | typeof import("bun") |
| bun.ServerWebSocketSendStatus | TypeAliasDeclaration | serve.d.ts:23 | number |
| bun.WebSocketReadyState | TypeAliasDeclaration | serve.d.ts:35 | WebSocketReadyState |
| bun.ServerWebSocket | InterfaceDeclaration | serve.d.ts:68 | ServerWebSocket&lt;T&gt; |
| bun.ServerWebSocket.T | TypeParameter | serve.d.ts:68 | T |
| bun.ServerWebSocket.send | MethodSignature | serve.d.ts:81 | (data: string &#124; Blob &#124; BufferSource, compress?: boolean &#124; undefined) =&gt; number |
| bun.ServerWebSocket.sendText | MethodSignature | serve.d.ts:94 | (data: string, compress?: boolean &#124; undefined) =&gt; number |
| bun.ServerWebSocket.sendBinary | MethodSignature | serve.d.ts:107 | (data: Blob &#124; BufferSource, compress?: boolean &#124; undefined) =&gt; number |
| bun.ServerWebSocket.close | MethodSignature | serve.d.ts:129 | (code?: number &#124; undefined, reason?: string &#124; undefined) =&gt; void |
| bun.ServerWebSocket.terminate | MethodSignature | serve.d.ts:137 | () =&gt; void |
| bun.ServerWebSocket.ping | MethodSignature | serve.d.ts:144 | (data?: string &#124; Blob &#124; BufferSource &#124; undefined) =&gt; number |
| bun.ServerWebSocket.pong | MethodSignature | serve.d.ts:151 | (data?: string &#124; Blob &#124; BufferSource &#124; undefined) =&gt; number |
| bun.ServerWebSocket.publish | MethodSignature | serve.d.ts:166 | (topic: string, data: string &#124; Blob &#124; BufferSource, compress?: boolean &#124; undefined) =&gt; number |
| bun.ServerWebSocket.publishText | MethodSignature | serve.d.ts:180 | (topic: string, data: string, compress?: boolean &#124; undefined) =&gt; number |
| bun.ServerWebSocket.publishBinary | MethodSignature | serve.d.ts:194 | (topic: string, data: Blob &#124; BufferSource, compress?: boolean &#124; undefined) =&gt; number |
| bun.ServerWebSocket.subscribe | MethodSignature | serve.d.ts:206 | (topic: string) =&gt; boolean |
| bun.ServerWebSocket.unsubscribe | MethodSignature | serve.d.ts:219 | (topic: string) =&gt; boolean |
| bun.ServerWebSocket.isSubscribed | MethodSignature | serve.d.ts:231 | (topic: string) =&gt; boolean |
| bun.ServerWebSocket.subscriptions | PropertySignature | serve.d.ts:243 | string[] |
| bun.ServerWebSocket.cork | MethodSignature | serve.d.ts:263 | &lt;R = unknown&gt;(callback: (ws: ServerWebSocket&lt;T&gt;) =&gt; R) =&gt; R |
| bun.ServerWebSocket.cork.R | TypeParameter | serve.d.ts:263 | R |
| bun.ServerWebSocket.cork.[FunctionType] | FunctionType | serve.d.ts:263 | (ws: ServerWebSocket&lt;T&gt;) =&gt; R |
| bun.ServerWebSocket.remoteAddress | PropertySignature | serve.d.ts:273 | string |
| bun.ServerWebSocket.readyState | PropertySignature | serve.d.ts:288 | WebSocketReadyState |
| bun.ServerWebSocket.binaryType | PropertySignature | serve.d.ts:315 | "arraybuffer" &#124; "blob" &#124; "nodebuffer" &#124; "uint8array" &#124; undefined |
| bun.ServerWebSocket.data | PropertySignature | serve.d.ts:343 | T |
| bun.ServerWebSocket.getBufferedAmount | MethodSignature | serve.d.ts:349 | () =&gt; number |
| bun.ServerWebSocket.pause | MethodSignature | serve.d.ts:367 | () =&gt; void |
| bun.ServerWebSocket.resume | MethodSignature | serve.d.ts:372 | () =&gt; void |
| bun.ServerWebSocket.isPaused | PropertySignature | serve.d.ts:377 | boolean |
| bun.WebSocketCompressor | TypeAliasDeclaration | serve.d.ts:383 | WebSocketCompressor |
| bun.WebSocketHandler | InterfaceDeclaration | serve.d.ts:426 | WebSocketHandler&lt;T&gt; |
| bun.WebSocketHandler.T | TypeParameter | serve.d.ts:426 | T |
| bun.WebSocketHandler.data | PropertySignature | serve.d.ts:445 | T &#124; undefined |
| bun.WebSocketHandler.message | MethodSignature | serve.d.ts:461 | ((ws: ServerWebSocket&lt;T&gt;, message: string &#124; Buffer&lt;ArrayBuffer&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.WebSocketHandler.open | MethodSignature | serve.d.ts:468 | ((ws: ServerWebSocket&lt;T&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.WebSocketHandler.drain | MethodSignature | serve.d.ts:476 | ((ws: ServerWebSocket&lt;T&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.WebSocketHandler.close | MethodSignature | serve.d.ts:485 | ((ws: ServerWebSocket&lt;T&gt;, code: number, reason: string) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.WebSocketHandler.ping | MethodSignature | serve.d.ts:496 | ((ws: ServerWebSocket&lt;T&gt;, data: Buffer&lt;ArrayBufferLike&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.WebSocketHandler.pong | MethodSignature | serve.d.ts:507 | ((ws: ServerWebSocket&lt;T&gt;, data: Buffer&lt;ArrayBufferLike&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.WebSocketHandler.error | MethodSignature | serve.d.ts:518 | ((error: Error, ws: ServerWebSocket&lt;T&gt;) =&gt; void &#124; Promise&lt;void&gt;) &#124; undefined |
| bun.WebSocketHandler.maxPayloadLength | PropertySignature | serve.d.ts:529 | number &#124; undefined |
| bun.WebSocketHandler.backpressureLimit | PropertySignature | serve.d.ts:540 | number &#124; undefined |
| bun.WebSocketHandler.closeOnBackpressureLimit | PropertySignature | serve.d.ts:547 | boolean &#124; undefined |
| bun.WebSocketHandler.idleTimeout | PropertySignature | serve.d.ts:558 | number &#124; undefined |
| bun.WebSocketHandler.publishToSelf | PropertySignature | serve.d.ts:565 | boolean &#124; undefined |
| bun.WebSocketHandler.sendPings | PropertySignature | serve.d.ts:575 | boolean &#124; undefined |
| bun.WebSocketHandler.perMessageDeflate | PropertySignature | serve.d.ts:584 | boolean &#124; { compress?: boolean &#124; WebSocketCompressor &#124; undefined; decompress?: boolean &#124; WebSocketCompressor &#124; undefined; } &#124; undefined |
| bun.WebSocketHandler.perMessageDeflate.[TypeLiteral] | TypeLiteral | serve.d.ts:586 | { compress?: boolean &#124; WebSocketCompressor &#124; undefined; decompress?: boolean &#124; WebSocketCompressor &#124; undefined; } |
| bun.WebSocketHandler.perMessageDeflate.compress | PropertySignature | serve.d.ts:598 | boolean &#124; WebSocketCompressor &#124; undefined |
| bun.WebSocketHandler.perMessageDeflate.decompress | PropertySignature | serve.d.ts:611 | boolean &#124; WebSocketCompressor &#124; undefined |
| bun.Serve | ModuleDeclaration | serve.d.ts:615 | any |
| bun.Serve.ExtractRouteParams | TypeAliasDeclaration | serve.d.ts:616 | ExtractRouteParams&lt;T&gt; |
| bun.Serve.ExtractRouteParams.T | TypeParameter | serve.d.ts:616 | T |
| bun.Serve.ExtractRouteParams.Param | TypeParameter | serve.d.ts:618 | Param |
| bun.Serve.ExtractRouteParams.Rest | TypeParameter | serve.d.ts:618 | Rest |
| bun.Serve.ExtractRouteParams.[MappedType] | MappedType | serve.d.ts:619 | { [K in Param]: string; } |
| bun.Serve.ExtractRouteParams.K | TypeParameter | serve.d.ts:619 | K |
| bun.Serve.ExtractRouteParams.Param | TypeParameter | serve.d.ts:620 | Param |
| bun.Serve.ExtractRouteParams.[MappedType] | MappedType | serve.d.ts:621 | { [K in Param]: string; } |
| bun.Serve.ExtractRouteParams.K | TypeParameter | serve.d.ts:621 | K |
| bun.Serve.ExtractRouteParams.[TypeLiteral] | TypeLiteral | serve.d.ts:623 | {} |
| bun.Serve.ExtractRouteParams.[TypeLiteral] | TypeLiteral | serve.d.ts:624 | {} |
| bun.Serve.Development | TypeAliasDeclaration | serve.d.ts:629 | Development |
| bun.Serve.Development.[TypeLiteral] | TypeLiteral | serve.d.ts:631 | { hmr?: boolean &#124; undefined; console?: boolean &#124; undefined; chromeDevToolsAutomaticWorkspaceFolders?: boolean &#124; undefined; } |
| bun.Serve.Development.hmr | PropertySignature | serve.d.ts:638 | boolean &#124; undefined |
| bun.Serve.Development.console | PropertySignature | serve.d.ts:644 | boolean &#124; undefined |
| bun.Serve.Development.chromeDevToolsAutomaticWorkspaceFolders | PropertySignature | serve.d.ts:668 | boolean &#124; undefined |
| bun.Serve.HTTPMethod | TypeAliasDeclaration | serve.d.ts:671 | HTTPMethod |
| bun.Serve.Handler | TypeAliasDeclaration | serve.d.ts:673 | Handler&lt;Req, S, Res&gt; |
| bun.Serve.Handler.Req | TypeParameter | serve.d.ts:673 | Req |
| bun.Serve.Handler.S | TypeParameter | serve.d.ts:673 | S |
| bun.Serve.Handler.Res | TypeParameter | serve.d.ts:673 | Res |
| bun.Serve.Handler.[FunctionType] | FunctionType | serve.d.ts:673 | Handler&lt;Req, S, Res&gt; |
| bun.Serve.DirectoryRouteOptions | InterfaceDeclaration | serve.d.ts:705 | DirectoryRouteOptions |
| bun.Serve.DirectoryRouteOptions.dir | PropertySignature | serve.d.ts:707 | string |
| bun.Serve.DirectoryRouteOptions.statCache | PropertySignature | serve.d.ts:713 | boolean &#124; undefined |
| bun.Serve.BaseRouteValue | TypeAliasDeclaration | serve.d.ts:716 | BaseRouteValue |
| bun.Serve.Routes | TypeAliasDeclaration | serve.d.ts:718 | Routes&lt;WebSocketData, R&gt; |
| bun.Serve.Routes.WebSocketData | TypeParameter | serve.d.ts:718 | WebSocketData |
| bun.Serve.Routes.R | TypeParameter | serve.d.ts:718 | R |
| bun.Serve.Routes.[MappedType] | MappedType | serve.d.ts:718 | Routes&lt;WebSocketData, R&gt; |
| bun.Serve.Routes.Path | TypeParameter | serve.d.ts:719 | Path |
| bun.Serve.RoutesWithUpgrade | TypeAliasDeclaration | serve.d.ts:725 | RoutesWithUpgrade&lt;WebSocketData, R&gt; |
| bun.Serve.RoutesWithUpgrade.WebSocketData | TypeParameter | serve.d.ts:725 | WebSocketData |
| bun.Serve.RoutesWithUpgrade.R | TypeParameter | serve.d.ts:725 | R |
| bun.Serve.RoutesWithUpgrade.[MappedType] | MappedType | serve.d.ts:725 | RoutesWithUpgrade&lt;WebSocketData, R&gt; |
| bun.Serve.RoutesWithUpgrade.Path | TypeParameter | serve.d.ts:726 | Path |
| bun.Serve.FetchOrRoutes | TypeAliasDeclaration | serve.d.ts:734 | FetchOrRoutes&lt;WebSocketData, R&gt; |
| bun.Serve.FetchOrRoutes.WebSocketData | TypeParameter | serve.d.ts:734 | WebSocketData |
| bun.Serve.FetchOrRoutes.R | TypeParameter | serve.d.ts:734 | R |
| bun.Serve.FetchOrRoutes.[TypeLiteral] | TypeLiteral | serve.d.ts:735 | { fetch?(this: Server&lt;WebSocketData&gt;, req: Request, server: Server&lt;WebSocketData&gt;): MaybePromise&lt;Response&gt;; routes: Routes&lt;...&gt;; } |
| bun.Serve.FetchOrRoutes.fetch | MethodSignature | serve.d.ts:741 | ((this: Server&lt;WebSocketData&gt;, req: Request, server: Server&lt;WebSocketData&gt;) =&gt; MaybePromise&lt;Response&gt;) &#124; undefined |
| bun.Serve.FetchOrRoutes.routes | PropertySignature | serve.d.ts:743 | Routes&lt;WebSocketData, R&gt; |
| bun.Serve.FetchOrRoutes.[TypeLiteral] | TypeLiteral | serve.d.ts:745 | { fetch(this: Server&lt;WebSocketData&gt;, req: Request, server: Server&lt;WebSocketData&gt;): MaybePromise&lt;Response&gt;; routes?: Routes&lt;...&gt; &#124; undefined; } |
| bun.Serve.FetchOrRoutes.fetch | MethodSignature | serve.d.ts:751 | (this: Server&lt;WebSocketData&gt;, req: Request, server: Server&lt;WebSocketData&gt;) =&gt; MaybePromise&lt;Response&gt; |
| bun.Serve.FetchOrRoutes.routes | PropertySignature | serve.d.ts:753 | Routes&lt;WebSocketData, R&gt; &#124; undefined |
| bun.Serve.FetchOrRoutesWithWebSocket | TypeAliasDeclaration | serve.d.ts:756 | FetchOrRoutesWithWebSocket&lt;WebSocketData, R&gt; |
| bun.Serve.FetchOrRoutesWithWebSocket.WebSocketData | TypeParameter | serve.d.ts:756 | WebSocketData |
| bun.Serve.FetchOrRoutesWithWebSocket.R | TypeParameter | serve.d.ts:756 | R |
| bun.Serve.FetchOrRoutesWithWebSocket.[TypeLiteral] | TypeLiteral | serve.d.ts:756 | { websocket: WebSocketHandler&lt;WebSocketData&gt;; } |
| bun.Serve.FetchOrRoutesWithWebSocket.websocket | PropertySignature | serve.d.ts:791 | WebSocketHandler&lt;WebSocketData&gt; |
| bun.Serve.FetchOrRoutesWithWebSocket.[TypeLiteral] | TypeLiteral | serve.d.ts:793 | { fetch?(this: Server&lt;WebSocketData&gt;, req: Request, server: Server&lt;WebSocketData&gt;): MaybePromise&lt;void &#124; Response &#124; undefined&gt;; routes: RoutesWithUpgrade&lt;...&gt;; } |
| bun.Serve.FetchOrRoutesWithWebSocket.fetch | MethodSignature | serve.d.ts:799 | ((this: Server&lt;WebSocketData&gt;, req: Request, server: Server&lt;WebSocketData&gt;) =&gt; MaybePromise&lt;void &#124; Response &#124; undefined&gt;) &#124; undefined |
| bun.Serve.FetchOrRoutesWithWebSocket.routes | PropertySignature | serve.d.ts:805 | RoutesWithUpgrade&lt;WebSocketData, R&gt; |
| bun.Serve.FetchOrRoutesWithWebSocket.[TypeLiteral] | TypeLiteral | serve.d.ts:807 | { fetch(this: Server&lt;WebSocketData&gt;, req: Request, server: Server&lt;WebSocketData&gt;): MaybePromise&lt;void &#124; Response &#124; undefined&gt;; routes?: RoutesWithUpgrade&lt;...&gt; &#124; undefined; } |
| bun.Serve.FetchOrRoutesWithWebSocket.fetch | MethodSignature | serve.d.ts:813 | (this: Server&lt;WebSocketData&gt;, req: Request, server: Server&lt;WebSocketData&gt;) =&gt; MaybePromise&lt;void &#124; Response &#124; undefined&gt; |
| bun.Serve.FetchOrRoutesWithWebSocket.routes | PropertySignature | serve.d.ts:819 | RoutesWithUpgrade&lt;WebSocketData, R&gt; &#124; undefined |
| bun.Serve.BaseServeOptions | InterfaceDeclaration | serve.d.ts:823 | BaseServeOptions&lt;WebSocketData&gt; |
| bun.Serve.BaseServeOptions.WebSocketData | TypeParameter | serve.d.ts:823 | WebSocketData |
| bun.Serve.BaseServeOptions.tls | PropertySignature | serve.d.ts:839 | TLSOptions[] &#124; TLSOptions &#124; undefined |
| bun.Serve.BaseServeOptions.maxRequestBodySize | PropertySignature | serve.d.ts:845 | number &#124; undefined |
| bun.Serve.BaseServeOptions.development | PropertySignature | serve.d.ts:851 | Development &#124; undefined |
| bun.Serve.BaseServeOptions.error | PropertySignature | serve.d.ts:865 | ((this: Server&lt;WebSocketData&gt;, error: ErrorLike) =&gt; void &#124; Promise&lt;void&gt; &#124; Promise&lt;Response&gt; &#124; Response) &#124; undefined |
| bun.Serve.BaseServeOptions.error.[FunctionType] | FunctionType | serve.d.ts:865 | (this: Server&lt;WebSocketData&gt;, error: ErrorLike) =&gt; void &#124; Promise&lt;void&gt; &#124; Promise&lt;Response&gt; &#124; Response |
| bun.Serve.BaseServeOptions.id | PropertySignature | serve.d.ts:882 | string &#124; null &#124; undefined |
| bun.Serve.HostnamePortServeOptions | InterfaceDeclaration | serve.d.ts:885 | HostnamePortServeOptions&lt;WebSocketData&gt; |
| bun.Serve.HostnamePortServeOptions.WebSocketData | TypeParameter | serve.d.ts:885 | WebSocketData |
| bun.Serve.HostnamePortServeOptions.hostname | PropertySignature | serve.d.ts:904 | "0.0.0.0" &#124; "127.0.0.1" &#124; "localhost" &#124; (string &amp; {}) &#124; undefined |
| bun.Serve.HostnamePortServeOptions.hostname.[TypeLiteral] | TypeLiteral | serve.d.ts:904 | {} |
| bun.Serve.HostnamePortServeOptions.port | PropertySignature | serve.d.ts:910 | string &#124; number &#124; undefined |
| bun.Serve.HostnamePortServeOptions.reusePort | PropertySignature | serve.d.ts:919 | boolean &#124; undefined |
| bun.Serve.HostnamePortServeOptions.ipv6Only | PropertySignature | serve.d.ts:925 | boolean &#124; undefined |
| bun.Serve.HostnamePortServeOptions.http3 | PropertySignature | serve.d.ts:932 | boolean &#124; undefined |
| bun.Serve.HostnamePortServeOptions.http2 | PropertySignature | serve.d.ts:942 | boolean &#124; undefined |
| bun.Serve.HostnamePortServeOptions.http1 | PropertySignature | serve.d.ts:950 | boolean &#124; undefined |
| bun.Serve.HostnamePortServeOptions.idleTimeout | PropertySignature | serve.d.ts:958 | number &#124; undefined |
| bun.Serve.UnixServeOptions | InterfaceDeclaration | serve.d.ts:961 | UnixServeOptions&lt;WebSocketData&gt; |
| bun.Serve.UnixServeOptions.WebSocketData | TypeParameter | serve.d.ts:961 | WebSocketData |
| bun.Serve.UnixServeOptions.unix | PropertySignature | serve.d.ts:966 | string &#124; undefined |
| bun.Serve.Options | TypeAliasDeclaration | serve.d.ts:986 | Options&lt;WebSocketData, R&gt; |
| bun.Serve.Options.WebSocketData | TypeParameter | serve.d.ts:986 | WebSocketData |
| bun.Serve.Options.R | TypeParameter | serve.d.ts:986 | R |
| bun.BunRequest | InterfaceDeclaration | serve.d.ts:993 | BunRequest&lt;T&gt; |
| bun.BunRequest.T | TypeParameter | serve.d.ts:993 | T |
| bun.BunRequest.params | PropertySignature | serve.d.ts:994 | { [Key in keyof ExtractRouteParams&lt;T&gt;]: ExtractRouteParams&lt;T&gt;[Key]; } |
| bun.BunRequest.params.[MappedType] | MappedType | serve.d.ts:994 | { [Key in keyof ExtractRouteParams&lt;T&gt;]: ExtractRouteParams&lt;T&gt;[Key]; } |
| bun.BunRequest.params.Key | TypeParameter | serve.d.ts:995 | Key |
| bun.BunRequest.params.[TypeLiteral] | TypeLiteral | serve.d.ts:996 | {} |
| bun.BunRequest.cookies | PropertySignature | serve.d.ts:997 | CookieMap |
| bun.BunRequest.clone | MethodSignature | serve.d.ts:998 | () =&gt; BunRequest&lt;T&gt; |
| bun.Server | InterfaceDeclaration | serve.d.ts:1012 | Server&lt;WebSocketData&gt; |
| bun.Server.WebSocketData | TypeParameter | serve.d.ts:1012 | WebSocketData |
| bun.Server.stop | MethodSignature | serve.d.ts:1026 | (closeActiveConnections?: boolean &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.Server.closeIdleConnections | MethodSignature | serve.d.ts:1037 | () =&gt; number |
| bun.Server.reload | MethodSignature | serve.d.ts:1062 | &lt;R extends string&gt;(options: Options&lt;WebSocketData, R&gt;) =&gt; Server&lt;WebSocketData&gt; |
| bun.Server.reload.R | TypeParameter | serve.d.ts:1062 | R |
| bun.Server.fetch | MethodSignature | serve.d.ts:1071 | (request: string &#124; Request) =&gt; Promise&lt;Response&gt; &#124; Response |
| bun.Server.upgrade | MethodSignature | serve.d.ts:1113 | (request: Request, ...options: [WebSocketData] extends [undefined] ? [options?: { headers?: HeadersInit &#124; undefined; data?: undefined; } &#124; undefined] : [options: ...]) =&gt; boolean |
| bun.Server.upgrade.[TypeLiteral] | TypeLiteral | serve.d.ts:1117 | { headers?: HeadersInit &#124; undefined; data?: undefined; } |
| bun.Server.upgrade.headers | PropertySignature | serve.d.ts:1121 | HeadersInit &#124; undefined |
| bun.Server.upgrade.data | PropertySignature | serve.d.ts:1142 | undefined |
| bun.Server.upgrade.[TypeLiteral] | TypeLiteral | serve.d.ts:1146 | { headers?: HeadersInit &#124; undefined; data: WebSocketData; } |
| bun.Server.upgrade.headers | PropertySignature | serve.d.ts:1150 | HeadersInit &#124; undefined |
| bun.Server.upgrade.data | PropertySignature | serve.d.ts:1155 | WebSocketData |
| bun.Server.publish | MethodSignature | serve.d.ts:1192 | (topic: string, data: string &#124; ArrayBuffer &#124; Blob &#124; SharedArrayBuffer &#124; ArrayBufferView&lt;ArrayBufferLike&gt;, compress?: boolean &#124; undefined) =&gt; number |
| bun.Server.subscriberCount | MethodSignature | serve.d.ts:1206 | (topic: string) =&gt; number |
| bun.Server.requestIP | MethodSignature | serve.d.ts:1220 | (request: Request) =&gt; SocketAddress &#124; null |
| bun.Server.timeout | MethodSignature | serve.d.ts:1236 | (request: Request, seconds: number) =&gt; void |
| bun.Server.ref | MethodSignature | serve.d.ts:1245 | () =&gt; void |
| bun.Server.unref | MethodSignature | serve.d.ts:1255 | () =&gt; void |
| bun.Server.pendingRequests | PropertySignature | serve.d.ts:1260 | number |
| bun.Server.pendingWebSockets | PropertySignature | serve.d.ts:1265 | number |
| bun.Server.url | PropertySignature | serve.d.ts:1267 | URL |
| bun.Server.port | PropertySignature | serve.d.ts:1279 | number &#124; undefined |
| bun.Server.hostname | PropertySignature | serve.d.ts:1291 | string &#124; undefined |
| bun.Server.protocol | PropertySignature | serve.d.ts:1300 | "http" &#124; "https" &#124; null |
| bun.Server.development | PropertySignature | serve.d.ts:1309 | boolean |
| bun.Server.id | PropertySignature | serve.d.ts:1318 | string |
| bun.serve | FunctionDeclaration | serve.d.ts:1500 | &lt;WebSocketData = undefined, R extends string = never&gt;(options: Options&lt;WebSocketData, R&gt;) =&gt; Server&lt;WebSocketData&gt; |
| bun.serve.WebSocketData | TypeParameter | serve.d.ts:1500 | WebSocketData |
| bun.serve.R | TypeParameter | serve.d.ts:1500 | R |
| bun | ModuleDeclaration | shell.d.ts:1 | typeof import("bun") |
| bun.ShellExpression | TypeAliasDeclaration | shell.d.ts:2 | ShellExpression |
| bun.ShellExpression.[TypeLiteral] | TypeLiteral | shell.d.ts:3 | { toString(): string; } |
| bun.ShellExpression.toString | MethodSignature | shell.d.ts:3 | () =&gt; string |
| bun.ShellExpression.[TypeLiteral] | TypeLiteral | shell.d.ts:6 | { raw: string; } |
| bun.ShellExpression.raw | PropertySignature | shell.d.ts:6 | string |
| bun.$ | FunctionDeclaration | shell.d.ts:23 | typeof $ |
| bun.$ | TypeAliasDeclaration | shell.d.ts:25 | typeof $ |
| bun.$ | ModuleDeclaration | shell.d.ts:27 | typeof $ |
| bun.$.braces | FunctionDeclaration | shell.d.ts:38 | (pattern: string) =&gt; string[] |
| bun.$.escape | FunctionDeclaration | shell.d.ts:44 | (input: string) =&gt; string |
| bun.$.env | FunctionDeclaration | shell.d.ts:60 | (newEnv?: Dict&lt;string&gt; &#124; Record&lt;string, string &#124; undefined&gt; &#124; undefined) =&gt; typeof $ |
| bun.$.cwd | FunctionDeclaration | shell.d.ts:67 | (newCwd?: string &#124; undefined) =&gt; typeof $ |
| bun.$.nothrow | FunctionDeclaration | shell.d.ts:72 | () =&gt; typeof $ |
| bun.$.throws | FunctionDeclaration | shell.d.ts:77 | (shouldThrow: boolean) =&gt; typeof $ |
| bun.$.ShellPromise | ClassDeclaration | shell.d.ts:90 | ShellPromise |
| bun.$.ShellPromise.stdin | GetAccessor | shell.d.ts:91 | WritableStream&lt;any&gt; |
| bun.$.ShellPromise.cwd | MethodDeclaration | shell.d.ts:97 | (newCwd: string) =&gt; this |
| bun.$.ShellPromise.env | MethodDeclaration | shell.d.ts:109 | (newEnv: Dict&lt;string&gt; &#124; Record&lt;string, string &#124; undefined&gt; &#124; undefined) =&gt; this |
| bun.$.ShellPromise.quiet | MethodDeclaration | shell.d.ts:117 | (isQuiet?: boolean &#124; undefined) =&gt; this |
| bun.$.ShellPromise.lines | MethodDeclaration | shell.d.ts:124 | () =&gt; AsyncIterable&lt;string&gt; |
| bun.$.ShellPromise.text | MethodDeclaration | shell.d.ts:147 | (encoding?: BufferEncoding &#124; undefined) =&gt; Promise&lt;string&gt; |
| bun.$.ShellPromise.json | MethodDeclaration | shell.d.ts:163 | () =&gt; Promise&lt;any&gt; |
| bun.$.ShellPromise.arrayBuffer | MethodDeclaration | shell.d.ts:177 | () =&gt; Promise&lt;ArrayBuffer&gt; |
| bun.$.ShellPromise.blob | MethodDeclaration | shell.d.ts:190 | () =&gt; Promise&lt;Blob&gt; |
| bun.$.ShellPromise.nothrow | MethodDeclaration | shell.d.ts:197 | () =&gt; this |
| bun.$.ShellPromise.throws | MethodDeclaration | shell.d.ts:204 | (shouldThrow: boolean) =&gt; this |
| bun.$.ShellError | ClassDeclaration | shell.d.ts:221 | ShellError |
| bun.$.ShellError.stdout | PropertyDeclaration | shell.d.ts:222 | Buffer&lt;ArrayBufferLike&gt; |
| bun.$.ShellError.stderr | PropertyDeclaration | shell.d.ts:223 | Buffer&lt;ArrayBufferLike&gt; |
| bun.$.ShellError.exitCode | PropertyDeclaration | shell.d.ts:224 | number |
| bun.$.ShellError.text | MethodDeclaration | shell.d.ts:245 | (encoding?: BufferEncoding &#124; undefined) =&gt; string |
| bun.$.ShellError.json | MethodDeclaration | shell.d.ts:259 | () =&gt; any |
| bun.$.ShellError.arrayBuffer | MethodDeclaration | shell.d.ts:272 | () =&gt; ArrayBuffer |
| bun.$.ShellError.blob | MethodDeclaration | shell.d.ts:284 | () =&gt; Blob |
| bun.$.ShellError.bytes | MethodDeclaration | shell.d.ts:296 | () =&gt; Uint8Array&lt;ArrayBuffer&gt; |
| bun.$.ShellOutput | InterfaceDeclaration | shell.d.ts:299 | ShellOutput |
| bun.$.ShellOutput.stdout | PropertySignature | shell.d.ts:300 | Buffer&lt;ArrayBufferLike&gt; |
| bun.$.ShellOutput.stderr | PropertySignature | shell.d.ts:301 | Buffer&lt;ArrayBufferLike&gt; |
| bun.$.ShellOutput.exitCode | PropertySignature | shell.d.ts:302 | number |
| bun.$.ShellOutput.text | MethodSignature | shell.d.ts:323 | (encoding?: BufferEncoding &#124; undefined) =&gt; string |
| bun.$.ShellOutput.json | MethodSignature | shell.d.ts:337 | () =&gt; any |
| bun.$.ShellOutput.arrayBuffer | MethodSignature | shell.d.ts:350 | () =&gt; ArrayBuffer |
| bun.$.ShellOutput.bytes | MethodSignature | shell.d.ts:363 | () =&gt; Uint8Array&lt;ArrayBuffer&gt; |
| bun.$.ShellOutput.blob | MethodSignature | shell.d.ts:375 | () =&gt; Blob |
| bun.$.Shell | VariableDeclaration | shell.d.ts:378 | new () =&gt; typeof $ |
| bun.$.[ConstructorType] | ConstructorType | shell.d.ts:378 | new () =&gt; typeof $ |
| bun | ModuleDeclaration | sql.d.ts:3 | typeof import("bun") |
| bun.ReservedSQL | InterfaceDeclaration | sql.d.ts:13 | ReservedSQL |
| bun.ReservedSQL.release | MethodSignature | sql.d.ts:26 | () =&gt; Promise&lt;void&gt; |
| bun.ReservedSQL.close | MethodSignature | sql.d.ts:34 | (options?: { timeout?: number &#124; undefined; } &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.ReservedSQL.close.[TypeLiteral] | TypeLiteral | sql.d.ts:34 | { timeout?: number &#124; undefined; } |
| bun.ReservedSQL.close.timeout | PropertySignature | sql.d.ts:34 | number &#124; undefined |
| bun.ArrayType | TypeAliasDeclaration | sql.d.ts:37 | ArrayType |
| bun.ArrayType.[TypeLiteral] | TypeLiteral | sql.d.ts:83 | {} |
| bun.SQLArrayParameter | InterfaceDeclaration | sql.d.ts:88 | SQLArrayParameter |
| bun.SQLArrayParameter.serializedValues | PropertySignature | sql.d.ts:92 | string |
| bun.SQLArrayParameter.arrayType | PropertySignature | sql.d.ts:97 | ArrayType &#124; undefined |
| bun.SQLJSONParameter | InterfaceDeclaration | sql.d.ts:103 | SQLJSONParameter |
| bun.SQLJSONParameter.value | PropertySignature | sql.d.ts:104 | unknown |
| bun.SQLJSONParameter.toJSON | MethodSignature | sql.d.ts:105 | (key: string) =&gt; unknown |
| bun.TransactionSQL | InterfaceDeclaration | sql.d.ts:118 | TransactionSQL |
| bun.TransactionSQL.savepoint | MethodSignature | sql.d.ts:136 | { &lt;T&gt;(name: string, fn: SavepointContextCallback&lt;T&gt;): Promise&lt;ContextCallbackResult&lt;T&gt;&gt;; &lt;T&gt;(fn: SavepointContextCallback&lt;T&gt;): Promise&lt;...&gt;; } |
| bun.TransactionSQL.savepoint.T | TypeParameter | sql.d.ts:136 | T |
| bun.TransactionSQL.savepoint | MethodSignature | sql.d.ts:137 | { &lt;T&gt;(name: string, fn: SavepointContextCallback&lt;T&gt;): Promise&lt;ContextCallbackResult&lt;T&gt;&gt;; &lt;T&gt;(fn: SavepointContextCallback&lt;T&gt;): Promise&lt;...&gt;; } |
| bun.TransactionSQL.savepoint.T | TypeParameter | sql.d.ts:137 | T |
| bun.TransactionSQL.close | MethodSignature | sql.d.ts:147 | (options?: { timeout?: number &#124; undefined; } &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.TransactionSQL.close.[TypeLiteral] | TypeLiteral | sql.d.ts:147 | { timeout?: number &#124; undefined; } |
| bun.TransactionSQL.close.timeout | PropertySignature | sql.d.ts:147 | number &#124; undefined |
| bun.TransactionSQL.reserve | MethodSignature | sql.d.ts:161 | (options?: { signal?: AbortSignal &#124; undefined; } &#124; undefined) =&gt; Promise&lt;ReservedSQL&gt; |
| bun.TransactionSQL.reserve.[TypeLiteral] | TypeLiteral | sql.d.ts:161 | { signal?: AbortSignal &#124; undefined; } |
| bun.TransactionSQL.reserve.signal | PropertySignature | sql.d.ts:161 | AbortSignal &#124; undefined |
| bun.SQL | ModuleDeclaration | sql.d.ts:164 | typeof SQL |
| bun.SQL.SQLError | ClassDeclaration | sql.d.ts:165 | SQLError |
| bun.SQL.SQLError.constructor | Constructor | sql.d.ts:166 | any |
| bun.SQL.PostgresError | ClassDeclaration | sql.d.ts:169 | PostgresError |
| bun.SQL.PostgresError.code | PropertyDeclaration | sql.d.ts:175 | string |
| bun.SQL.PostgresError.errno | PropertyDeclaration | sql.d.ts:180 | string &#124; undefined |
| bun.SQL.PostgresError.detail | PropertyDeclaration | sql.d.ts:181 | string &#124; undefined |
| bun.SQL.PostgresError.hint | PropertyDeclaration | sql.d.ts:182 | string &#124; undefined |
| bun.SQL.PostgresError.severity | PropertyDeclaration | sql.d.ts:183 | string &#124; undefined |
| bun.SQL.PostgresError.position | PropertyDeclaration | sql.d.ts:184 | string &#124; undefined |
| bun.SQL.PostgresError.internalPosition | PropertyDeclaration | sql.d.ts:185 | string &#124; undefined |
| bun.SQL.PostgresError.internalQuery | PropertyDeclaration | sql.d.ts:186 | string &#124; undefined |
| bun.SQL.PostgresError.where | PropertyDeclaration | sql.d.ts:187 | string &#124; undefined |
| bun.SQL.PostgresError.schema | PropertyDeclaration | sql.d.ts:188 | string &#124; undefined |
| bun.SQL.PostgresError.table | PropertyDeclaration | sql.d.ts:189 | string &#124; undefined |
| bun.SQL.PostgresError.column | PropertyDeclaration | sql.d.ts:190 | string &#124; undefined |
| bun.SQL.PostgresError.dataType | PropertyDeclaration | sql.d.ts:191 | string &#124; undefined |
| bun.SQL.PostgresError.constraint | PropertyDeclaration | sql.d.ts:192 | string &#124; undefined |
| bun.SQL.PostgresError.file | PropertyDeclaration | sql.d.ts:193 | string &#124; undefined |
| bun.SQL.PostgresError.line | PropertyDeclaration | sql.d.ts:194 | string &#124; undefined |
| bun.SQL.PostgresError.routine | PropertyDeclaration | sql.d.ts:195 | string &#124; undefined |
| bun.SQL.PostgresError.constructor | Constructor | sql.d.ts:197 | any |
| bun.SQL.PostgresError.[TypeLiteral] | TypeLiteral | sql.d.ts:199 | { code: string; errno?: string &#124; undefined; detail?: string &#124; undefined; hint?: string &#124; undefined; severity?: string &#124; undefined; position?: string &#124; undefined; internalPosition?: string &#124; undefined; ... 9 more ...; routine?: string &#124; undefined; } |
| bun.SQL.PostgresError.code | PropertySignature | sql.d.ts:200 | string |
| bun.SQL.PostgresError.errno | PropertySignature | sql.d.ts:201 | string &#124; undefined |
| bun.SQL.PostgresError.detail | PropertySignature | sql.d.ts:202 | string &#124; undefined |
| bun.SQL.PostgresError.hint | PropertySignature | sql.d.ts:203 | string &#124; undefined |
| bun.SQL.PostgresError.severity | PropertySignature | sql.d.ts:204 | string &#124; undefined |
| bun.SQL.PostgresError.position | PropertySignature | sql.d.ts:205 | string &#124; undefined |
| bun.SQL.PostgresError.internalPosition | PropertySignature | sql.d.ts:206 | string &#124; undefined |
| bun.SQL.PostgresError.internalQuery | PropertySignature | sql.d.ts:207 | string &#124; undefined |
| bun.SQL.PostgresError.where | PropertySignature | sql.d.ts:208 | string &#124; undefined |
| bun.SQL.PostgresError.schema | PropertySignature | sql.d.ts:209 | string &#124; undefined |
| bun.SQL.PostgresError.table | PropertySignature | sql.d.ts:210 | string &#124; undefined |
| bun.SQL.PostgresError.column | PropertySignature | sql.d.ts:211 | string &#124; undefined |
| bun.SQL.PostgresError.dataType | PropertySignature | sql.d.ts:212 | string &#124; undefined |
| bun.SQL.PostgresError.constraint | PropertySignature | sql.d.ts:213 | string &#124; undefined |
| bun.SQL.PostgresError.file | PropertySignature | sql.d.ts:214 | string &#124; undefined |
| bun.SQL.PostgresError.line | PropertySignature | sql.d.ts:215 | string &#124; undefined |
| bun.SQL.PostgresError.routine | PropertySignature | sql.d.ts:216 | string &#124; undefined |
| bun.SQL.MySQLError | ClassDeclaration | sql.d.ts:221 | MySQLError |
| bun.SQL.MySQLError.code | PropertyDeclaration | sql.d.ts:227 | string |
| bun.SQL.MySQLError.errno | PropertyDeclaration | sql.d.ts:232 | number &#124; undefined |
| bun.SQL.MySQLError.sqlState | PropertyDeclaration | sql.d.ts:234 | string &#124; undefined |
| bun.SQL.MySQLError.constructor | Constructor | sql.d.ts:235 | any |
| bun.SQL.MySQLError.[TypeLiteral] | TypeLiteral | sql.d.ts:235 | { code: string; errno: number &#124; undefined; sqlState: string &#124; undefined; } |
| bun.SQL.MySQLError.code | PropertySignature | sql.d.ts:235 | string |
| bun.SQL.MySQLError.errno | PropertySignature | sql.d.ts:235 | number &#124; undefined |
| bun.SQL.MySQLError.sqlState | PropertySignature | sql.d.ts:235 | string &#124; undefined |
| bun.SQL.SQLiteError | ClassDeclaration | sql.d.ts:238 | SQLiteError |
| bun.SQL.SQLiteError.code | PropertyDeclaration | sql.d.ts:243 | string |
| bun.SQL.SQLiteError.errno | PropertyDeclaration | sql.d.ts:249 | number |
| bun.SQL.SQLiteError.byteOffset | PropertyDeclaration | sql.d.ts:255 | number &#124; undefined |
| bun.SQL.SQLiteError.constructor | Constructor | sql.d.ts:257 | any |
| bun.SQL.SQLiteError.[TypeLiteral] | TypeLiteral | sql.d.ts:257 | { code: string; errno: number; byteOffset?: number &#124; undefined; } |
| bun.SQL.SQLiteError.code | PropertySignature | sql.d.ts:257 | string |
| bun.SQL.SQLiteError.errno | PropertySignature | sql.d.ts:257 | number |
| bun.SQL.SQLiteError.byteOffset | PropertySignature | sql.d.ts:257 | number &#124; undefined |
| bun.SQL.AwaitPromisesArray | TypeAliasDeclaration | sql.d.ts:260 | AwaitPromisesArray&lt;T&gt; |
| bun.SQL.AwaitPromisesArray.T | TypeParameter | sql.d.ts:260 | T |
| bun.SQL.AwaitPromisesArray.[MappedType] | MappedType | sql.d.ts:260 | AwaitPromisesArray&lt;T&gt; |
| bun.SQL.AwaitPromisesArray.K | TypeParameter | sql.d.ts:261 | K |
| bun.SQL.ContextCallbackResult | TypeAliasDeclaration | sql.d.ts:264 | ContextCallbackResult&lt;T&gt; |
| bun.SQL.ContextCallbackResult.T | TypeParameter | sql.d.ts:264 | T |
| bun.SQL.ContextCallback | TypeAliasDeclaration | sql.d.ts:265 | ContextCallback&lt;T, SQL&gt; |
| bun.SQL.ContextCallback.T | TypeParameter | sql.d.ts:265 | T |
| bun.SQL.ContextCallback.SQL | TypeParameter | sql.d.ts:265 | SQL |
| bun.SQL.ContextCallback.[FunctionType] | FunctionType | sql.d.ts:265 | ContextCallback&lt;T, SQL&gt; |
| bun.SQL.TLSOptions | InterfaceDeclaration | sql.d.ts:270 | TLSOptions |
| bun.SQL.TLSOptions.checkServerIdentity | PropertySignature | sql.d.ts:298 | ((hostname: string, cert: PeerCertificate) =&gt; Error &#124; undefined) &#124; undefined |
| bun.SQL.ColumnTransform | InterfaceDeclaration | sql.d.ts:304 | ColumnTransform |
| bun.SQL.ColumnTransform.from | PropertySignature | sql.d.ts:312 | ((name: string) =&gt; string) &#124; undefined |
| bun.SQL.ColumnTransform.from.[FunctionType] | FunctionType | sql.d.ts:312 | (name: string) =&gt; string |
| bun.SQL.ColumnTransform.to | PropertySignature | sql.d.ts:318 | ((name: string) =&gt; string) &#124; undefined |
| bun.SQL.ColumnTransform.to.[FunctionType] | FunctionType | sql.d.ts:318 | (name: string) =&gt; string |
| bun.SQL.Transform | InterfaceDeclaration | sql.d.ts:332 | Transform |
| bun.SQL.Transform.column | PropertySignature | sql.d.ts:336 | ColumnTransform &#124; ((name: string) =&gt; string) &#124; undefined |
| bun.SQL.Transform.column.[FunctionType] | FunctionType | sql.d.ts:336 | (name: string) =&gt; string |
| bun.SQL.Transform.undefined | PropertySignature | sql.d.ts:343 | unknown |
| bun.SQL.NameTransform | InterfaceDeclaration | sql.d.ts:350 | NameTransform |
| bun.SQL.NameTransform.[call] | CallSignature | sql.d.ts:351 | any |
| bun.SQL.NameTransform.column | PropertySignature | sql.d.ts:352 | ColumnTransform |
| bun.SQL.camel | VariableDeclaration | sql.d.ts:356 | { readonly column: Required&lt;ColumnTransform&gt;; } |
| bun.SQL.[TypeLiteral] | TypeLiteral | sql.d.ts:356 | { readonly column: Required&lt;ColumnTransform&gt;; } |
| bun.SQL.column | PropertySignature | sql.d.ts:356 | Required&lt;ColumnTransform&gt; |
| bun.SQL.pascal | VariableDeclaration | sql.d.ts:358 | { readonly column: Required&lt;ColumnTransform&gt;; } |
| bun.SQL.[TypeLiteral] | TypeLiteral | sql.d.ts:358 | { readonly column: Required&lt;ColumnTransform&gt;; } |
| bun.SQL.column | PropertySignature | sql.d.ts:358 | Required&lt;ColumnTransform&gt; |
| bun.SQL.kebab | VariableDeclaration | sql.d.ts:360 | { readonly column: Required&lt;ColumnTransform&gt;; } |
| bun.SQL.[TypeLiteral] | TypeLiteral | sql.d.ts:360 | { readonly column: Required&lt;ColumnTransform&gt;; } |
| bun.SQL.column | PropertySignature | sql.d.ts:360 | Required&lt;ColumnTransform&gt; |
| bun.SQL.toCamel | VariableDeclaration | sql.d.ts:362 | NameTransform |
| bun.SQL.toPascal | VariableDeclaration | sql.d.ts:364 | NameTransform |
| bun.SQL.toKebab | VariableDeclaration | sql.d.ts:366 | NameTransform |
| bun.SQL.fromCamel | VariableDeclaration | sql.d.ts:368 | NameTransform |
| bun.SQL.fromPascal | VariableDeclaration | sql.d.ts:370 | NameTransform |
| bun.SQL.fromKebab | VariableDeclaration | sql.d.ts:372 | NameTransform |
| bun.SQL.SQLiteOptions | InterfaceDeclaration | sql.d.ts:374 | SQLiteOptions |
| bun.SQL.SQLiteOptions.adapter | PropertySignature | sql.d.ts:379 | "sqlite" &#124; undefined |
| bun.SQL.SQLiteOptions.filename | PropertySignature | sql.d.ts:404 | ":memory:" &#124; URL &#124; (string &amp; {}) &#124; undefined |
| bun.SQL.SQLiteOptions.filename.[TypeLiteral] | TypeLiteral | sql.d.ts:404 | {} |
| bun.SQL.SQLiteOptions.url | PropertySignature | sql.d.ts:410 | string &#124; URL &#124; undefined |
| bun.SQL.SQLiteOptions.bigint | PropertySignature | sql.d.ts:417 | boolean &#124; undefined |
| bun.SQL.SQLiteOptions.transform | PropertySignature | sql.d.ts:423 | NameTransform &#124; Transform &#124; undefined |
| bun.SQL.SQLiteOptions.onconnect | PropertySignature | sql.d.ts:430 | ((err: Error &#124; null) =&gt; void) &#124; undefined |
| bun.SQL.SQLiteOptions.onconnect.[FunctionType] | FunctionType | sql.d.ts:430 | (err: Error &#124; null) =&gt; void |
| bun.SQL.SQLiteOptions.onclose | PropertySignature | sql.d.ts:436 | ((err: Error &#124; null) =&gt; void) &#124; undefined |
| bun.SQL.SQLiteOptions.onclose.[FunctionType] | FunctionType | sql.d.ts:436 | (err: Error &#124; null) =&gt; void |
| bun.SQL.PostgresOrMySQLOptions | InterfaceDeclaration | sql.d.ts:439 | PostgresOrMySQLOptions |
| bun.SQL.PostgresOrMySQLOptions.url | PropertySignature | sql.d.ts:451 | string &#124; URL &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.host | PropertySignature | sql.d.ts:458 | string &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.hostname | PropertySignature | sql.d.ts:465 | string &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.port | PropertySignature | sql.d.ts:471 | string &#124; number &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.username | PropertySignature | sql.d.ts:477 | string &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.user | PropertySignature | sql.d.ts:483 | string &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.password | PropertySignature | sql.d.ts:489 | string &#124; (() =&gt; MaybePromise&lt;string&gt;) &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.password.[FunctionType] | FunctionType | sql.d.ts:489 | () =&gt; MaybePromise&lt;string&gt; |
| bun.SQL.PostgresOrMySQLOptions.pass | PropertySignature | sql.d.ts:496 | string &#124; (() =&gt; MaybePromise&lt;string&gt;) &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.pass.[FunctionType] | FunctionType | sql.d.ts:496 | () =&gt; MaybePromise&lt;string&gt; |
| bun.SQL.PostgresOrMySQLOptions.database | PropertySignature | sql.d.ts:503 | string &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.db | PropertySignature | sql.d.ts:509 | string &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.adapter | PropertySignature | sql.d.ts:517 | "mariadb" &#124; "mysql" &#124; "postgres" &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.idleTimeout | PropertySignature | sql.d.ts:525 | number &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.idle_timeout | PropertySignature | sql.d.ts:532 | number &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.connectionTimeout | PropertySignature | sql.d.ts:539 | number &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.connection_timeout | PropertySignature | sql.d.ts:546 | number &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.connectTimeout | PropertySignature | sql.d.ts:554 | number &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.connect_timeout | PropertySignature | sql.d.ts:562 | number &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.maxLifetime | PropertySignature | sql.d.ts:570 | number &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.max_lifetime | PropertySignature | sql.d.ts:577 | number &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.tls | PropertySignature | sql.d.ts:600 | "allow" &#124; "disable" &#124; "prefer" &#124; "require" &#124; "verify-ca" &#124; "verify-full" &#124; boolean &#124; BunFile &#124; TLSOptions &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.ssl | PropertySignature | sql.d.ts:617 | "allow" &#124; "disable" &#124; "prefer" &#124; "require" &#124; "verify-ca" &#124; "verify-full" &#124; boolean &#124; BunFile &#124; TLSOptions &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.path | PropertySignature | sql.d.ts:636 | string &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.socket | PropertySignature | sql.d.ts:643 | string &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.onconnect | PropertySignature | sql.d.ts:650 | ((err: Error &#124; null) =&gt; void) &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.onconnect.[FunctionType] | FunctionType | sql.d.ts:650 | (err: Error &#124; null) =&gt; void |
| bun.SQL.PostgresOrMySQLOptions.onclose | PropertySignature | sql.d.ts:659 | ((err: Error &#124; null) =&gt; void) &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.onclose.[FunctionType] | FunctionType | sql.d.ts:659 | (err: Error &#124; null) =&gt; void |
| bun.SQL.PostgresOrMySQLOptions.connection | PropertySignature | sql.d.ts:668 | Record&lt;string, string &#124; number &#124; boolean&gt; &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.max | PropertySignature | sql.d.ts:674 | number &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.bigint | PropertySignature | sql.d.ts:685 | boolean &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.prepare | PropertySignature | sql.d.ts:693 | boolean &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.allowPublicKeyRetrieval | PropertySignature | sql.d.ts:706 | boolean &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.foundRows | PropertySignature | sql.d.ts:717 | boolean &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.channelBinding | PropertySignature | sql.d.ts:739 | "disable" &#124; "prefer" &#124; "require" &#124; undefined |
| bun.SQL.PostgresOrMySQLOptions.transform | PropertySignature | sql.d.ts:745 | NameTransform &#124; Transform &#124; undefined |
| bun.SQL.Options | TypeAliasDeclaration | sql.d.ts:767 | Options |
| bun.SQL.ListenSubscription | InterfaceDeclaration | sql.d.ts:770 | ListenSubscription |
| bun.SQL.ListenSubscription.channel | PropertySignature | sql.d.ts:771 | string |
| bun.SQL.ListenSubscription.unlisten | MethodSignature | sql.d.ts:777 | () =&gt; Promise&lt;void&gt; |
| bun.SQL.ResultColumn | InterfaceDeclaration | sql.d.ts:794 | ResultColumn |
| bun.SQL.ResultColumn.name | PropertySignature | sql.d.ts:796 | string |
| bun.SQL.ResultColumn.type | PropertySignature | sql.d.ts:805 | number |
| bun.SQL.ResultColumn.table | PropertySignature | sql.d.ts:813 | string &#124; number |
| bun.SQL.ResultColumn.number | PropertySignature | sql.d.ts:818 | number &#124; undefined |
| bun.SQL.ResultColumn.length | PropertySignature | sql.d.ts:820 | number &#124; undefined |
| bun.SQL.ResultColumn.flags | PropertySignature | sql.d.ts:822 | number &#124; undefined |
| bun.SQL.ResultStatement | InterfaceDeclaration | sql.d.ts:831 | ResultStatement |
| bun.SQL.ResultStatement.string | PropertySignature | sql.d.ts:833 | string |
| bun.SQL.ResultStatement.types | PropertySignature | sql.d.ts:839 | number[] |
| bun.SQL.ResultStatement.columns | PropertySignature | sql.d.ts:841 | ResultColumn[] |
| bun.SQL.ResultMetadata | InterfaceDeclaration | sql.d.ts:853 | ResultMetadata |
| bun.SQL.ResultMetadata.count | PropertySignature | sql.d.ts:858 | number |
| bun.SQL.ResultMetadata.affectedRows | PropertySignature | sql.d.ts:867 | number |
| bun.SQL.ResultMetadata.lastInsertRowid | PropertySignature | sql.d.ts:879 | string &#124; number &#124; bigint &#124; null |
| bun.SQL.ResultMetadata.command | PropertySignature | sql.d.ts:885 | string &#124; null |
| bun.SQL.ResultMetadata.columns | PropertySignature | sql.d.ts:891 | ResultColumn[] &#124; null |
| bun.SQL.ResultMetadata.statement | PropertySignature | sql.d.ts:896 | ResultStatement &#124; null |
| bun.SQL.Query | InterfaceDeclaration | sql.d.ts:925 | Query&lt;T&gt; |
| bun.SQL.Query.T | TypeParameter | sql.d.ts:925 | T |
| bun.SQL.Query.active | PropertySignature | sql.d.ts:929 | boolean |
| bun.SQL.Query.cancelled | PropertySignature | sql.d.ts:934 | boolean |
| bun.SQL.Query.cancel | MethodSignature | sql.d.ts:952 | () =&gt; Query&lt;T&gt; |
| bun.SQL.Query.simple | MethodSignature | sql.d.ts:958 | () =&gt; Query&lt;T&gt; |
| bun.SQL.Query.readable | MethodSignature | sql.d.ts:974 | () =&gt; ReadableStream&lt;Uint8Array&lt;ArrayBuffer&gt;&gt; |
| bun.SQL.Query.writable | MethodSignature | sql.d.ts:995 | () =&gt; WritableStream&lt;string &#124; DataView&lt;ArrayBufferLike&gt; &#124; ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;&gt; |
| bun.SQL.Query.execute | MethodSignature | sql.d.ts:1001 | () =&gt; Query&lt;T&gt; |
| bun.SQL.Query.raw | MethodSignature | sql.d.ts:1017 | () =&gt; Query&lt;T&gt; |
| bun.SQL.Query.values | MethodSignature | sql.d.ts:1025 | () =&gt; Query&lt;T&gt; |
| bun.SQL.TransactionContextCallback | TypeAliasDeclaration | sql.d.ts:1032 | TransactionContextCallback&lt;T&gt; |
| bun.SQL.TransactionContextCallback.T | TypeParameter | sql.d.ts:1032 | T |
| bun.SQL.SavepointContextCallback | TypeAliasDeclaration | sql.d.ts:1038 | SavepointContextCallback&lt;T&gt; |
| bun.SQL.SavepointContextCallback.T | TypeParameter | sql.d.ts:1038 | T |
| bun.SQL.Helper | InterfaceDeclaration | sql.d.ts:1049 | Helper&lt;T&gt; |
| bun.SQL.Helper.T | TypeParameter | sql.d.ts:1049 | T |
| bun.SQL.Helper.value | PropertySignature | sql.d.ts:1050 | T[] |
| bun.SQL.Helper.columns | PropertySignature | sql.d.ts:1051 | (keyof T)[] |
| bun.SQL | InterfaceDeclaration | sql.d.ts:1055 | SQL |
| bun.SQL.[call] | CallSignature | sql.d.ts:1063 | any |
| bun.SQL.T | TypeParameter | sql.d.ts:1063 | T |
| bun.SQL.[call] | CallSignature | sql.d.ts:1080 | any |
| bun.SQL.T | TypeParameter | sql.d.ts:1080 | T |
| bun.SQL.[call] | CallSignature | sql.d.ts:1097 | any |
| bun.SQL.T | TypeParameter | sql.d.ts:1097 | T |
| bun.SQL.[MappedType] | MappedType | sql.d.ts:1097 | { [x: string]: unknown; [x: number]: unknown; [x: symbol]: unknown; } |
| bun.SQL.Key | TypeParameter | sql.d.ts:1097 | Key |
| bun.SQL.[call] | CallSignature | sql.d.ts:1114 | any |
| bun.SQL.T | TypeParameter | sql.d.ts:1114 | T |
| bun.SQL.[MappedType] | MappedType | sql.d.ts:1114 | { [x: string]: unknown; [x: number]: unknown; [x: symbol]: unknown; } |
| bun.SQL.Key | TypeParameter | sql.d.ts:1114 | Key |
| bun.SQL.Keys | TypeParameter | sql.d.ts:1114 | Keys |
| bun.SQL.[call] | CallSignature | sql.d.ts:1130 | any |
| bun.SQL.T | TypeParameter | sql.d.ts:1130 | T |
| bun.SQL.[TypeLiteral] | TypeLiteral | sql.d.ts:1130 | {} |
| bun.SQL | ClassDeclaration | sql.d.ts:1143 | SQL |
| bun.SQL.constructor | Constructor | sql.d.ts:1155 | any |
| bun.SQL.constructor | Constructor | sql.d.ts:1168 | any |
| bun.SQL.constructor | Constructor | sql.d.ts:1183 | any |
| bun.SQL.options | PropertyDeclaration | sql.d.ts:1194 | Bun.__internal.Merge&lt;...&gt; &#124; Bun.__internal.Merge&lt;...&gt; |
| bun.SQL.commitDistributed | MethodDeclaration | sql.d.ts:1209 | (name: string) =&gt; Promise&lt;void&gt; |
| bun.SQL.rollbackDistributed | MethodDeclaration | sql.d.ts:1224 | (name: string) =&gt; Promise&lt;void&gt; |
| bun.SQL.connect | MethodDeclaration | sql.d.ts:1235 | () =&gt; Promise&lt;SQL&gt; |
| bun.SQL.close | MethodDeclaration | sql.d.ts:1256 | (options?: { timeout?: number &#124; undefined; } &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.SQL.close.[TypeLiteral] | TypeLiteral | sql.d.ts:1256 | { timeout?: number &#124; undefined; } |
| bun.SQL.close.timeout | PropertySignature | sql.d.ts:1256 | number &#124; undefined |
| bun.SQL.end | MethodDeclaration | sql.d.ts:1268 | (options?: { timeout?: number &#124; undefined; } &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.SQL.end.[TypeLiteral] | TypeLiteral | sql.d.ts:1268 | { timeout?: number &#124; undefined; } |
| bun.SQL.end.timeout | PropertySignature | sql.d.ts:1268 | number &#124; undefined |
| bun.SQL.flush | MethodDeclaration | sql.d.ts:1279 | () =&gt; void |
| bun.SQL.reserve | MethodDeclaration | sql.d.ts:1320 | (options?: { signal?: AbortSignal &#124; undefined; } &#124; undefined) =&gt; Promise&lt;ReservedSQL&gt; |
| bun.SQL.reserve.[TypeLiteral] | TypeLiteral | sql.d.ts:1320 | { signal?: AbortSignal &#124; undefined; } |
| bun.SQL.reserve.signal | PropertySignature | sql.d.ts:1320 | AbortSignal &#124; undefined |
| bun.SQL.array | MethodDeclaration | sql.d.ts:1347 | (values: any[] &#124; TypedArray&lt;ArrayBufferLike&gt;, typeNameOrTypeID?: number &#124; ArrayType &#124; undefined) =&gt; SQLArrayParameter |
| bun.SQL.json | MethodDeclaration | sql.d.ts:1366 | (value: unknown) =&gt; string &#124; SQLJSONParameter &#124; undefined |
| bun.SQL.begin | MethodDeclaration | sql.d.ts:1399 | { &lt;const T&gt;(fn: TransactionContextCallback&lt;T&gt;): Promise&lt;ContextCallbackResult&lt;T&gt;&gt;; &lt;const T&gt;(options: string, fn: TransactionContextCallback&lt;T&gt;): Promise&lt;...&gt;; } |
| bun.SQL.begin.T | TypeParameter | sql.d.ts:1399 | T |
| bun.SQL.begin | MethodDeclaration | sql.d.ts:1432 | { &lt;const T&gt;(fn: TransactionContextCallback&lt;T&gt;): Promise&lt;ContextCallbackResult&lt;T&gt;&gt;; &lt;const T&gt;(options: string, fn: TransactionContextCallback&lt;T&gt;): Promise&lt;...&gt;; } |
| bun.SQL.begin.T | TypeParameter | sql.d.ts:1432 | T |
| bun.SQL.transaction | MethodDeclaration | sql.d.ts:1466 | { &lt;const T&gt;(fn: TransactionContextCallback&lt;T&gt;): Promise&lt;ContextCallbackResult&lt;T&gt;&gt;; &lt;const T&gt;(options: string, fn: TransactionContextCallback&lt;T&gt;): Promise&lt;...&gt;; } |
| bun.SQL.transaction.T | TypeParameter | sql.d.ts:1466 | T |
| bun.SQL.transaction | MethodDeclaration | sql.d.ts:1502 | { &lt;const T&gt;(fn: TransactionContextCallback&lt;T&gt;): Promise&lt;ContextCallbackResult&lt;T&gt;&gt;; &lt;const T&gt;(options: string, fn: TransactionContextCallback&lt;T&gt;): Promise&lt;...&gt;; } |
| bun.SQL.transaction.T | TypeParameter | sql.d.ts:1502 | T |
| bun.SQL.beginDistributed | MethodDeclaration | sql.d.ts:1539 | &lt;const T&gt;(name: string, fn: TransactionContextCallback&lt;T&gt;) =&gt; Promise&lt;ContextCallbackResult&lt;T&gt;&gt; |
| bun.SQL.beginDistributed.T | TypeParameter | sql.d.ts:1539 | T |
| bun.SQL.distributed | MethodDeclaration | sql.d.ts:1547 | &lt;const T&gt;(name: string, fn: TransactionContextCallback&lt;T&gt;) =&gt; Promise&lt;ContextCallbackResult&lt;T&gt;&gt; |
| bun.SQL.distributed.T | TypeParameter | sql.d.ts:1547 | T |
| bun.SQL.unsafe | MethodDeclaration | sql.d.ts:1572 | &lt;T = any&gt;(string: string, values?: any[] &#124; Record&lt;string, any&gt; &#124; undefined) =&gt; Query&lt;T&gt; |
| bun.SQL.unsafe.T | TypeParameter | sql.d.ts:1572 | T |
| bun.SQL.file | MethodDeclaration | sql.d.ts:1587 | &lt;T = any&gt;(filename: string, values?: any[] &#124; Record&lt;string, any&gt; &#124; undefined) =&gt; Query&lt;T&gt; |
| bun.SQL.file.T | TypeParameter | sql.d.ts:1587 | T |
| bun.SQL.listen | MethodDeclaration | sql.d.ts:1620 | (channel: string, onnotify: (payload: string) =&gt; void, onlisten?: (() =&gt; void) &#124; undefined) =&gt; Promise&lt;ListenSubscription&gt; |
| bun.SQL.listen.[FunctionType] | FunctionType | sql.d.ts:1622 | (payload: string) =&gt; void |
| bun.SQL.listen.[FunctionType] | FunctionType | sql.d.ts:1623 | () =&gt; void |
| bun.SQL.notify | MethodDeclaration | sql.d.ts:1638 | (channel: string, payload?: string &#124; undefined) =&gt; Promise&lt;void&gt; |
| bun.sql | VariableDeclaration | sql.d.ts:1645 | SQL |
| bun.postgres | VariableDeclaration | sql.d.ts:1652 | SQL |
| bun.SavepointSQL | InterfaceDeclaration | sql.d.ts:1663 | SavepointSQL |
| bun:sqlite | ModuleDeclaration | sqlite.d.ts:27 | typeof import("bun:sqlite") |
| bun:sqlite.DatabaseOptions | InterfaceDeclaration | sqlite.d.ts:31 | DatabaseOptions |
| bun:sqlite.DatabaseOptions.readonly | PropertySignature | sqlite.d.ts:39 | boolean &#124; undefined |
| bun:sqlite.DatabaseOptions.create | PropertySignature | sqlite.d.ts:48 | boolean &#124; undefined |
| bun:sqlite.DatabaseOptions.readwrite | PropertySignature | sqlite.d.ts:57 | boolean &#124; undefined |
| bun:sqlite.DatabaseOptions.safeIntegers | PropertySignature | sqlite.d.ts:71 | boolean &#124; undefined |
| bun:sqlite.DatabaseOptions.strict | PropertySignature | sqlite.d.ts:89 | boolean &#124; undefined |
| bun:sqlite.Database | ClassDeclaration | sqlite.d.ts:122 | Database |
| bun:sqlite.Database.constructor | Constructor | sqlite.d.ts:129 | any |
| bun:sqlite.Database.open | MethodDeclaration | sqlite.d.ts:141 | (filename: string, options?: number &#124; DatabaseOptions &#124; undefined) =&gt; Database |
| bun:sqlite.Database.MAX_QUERY_CACHE_SIZE | PropertyDeclaration | sqlite.d.ts:149 | number |
| bun:sqlite.Database.clearQueryCache | MethodDeclaration | sqlite.d.ts:154 | () =&gt; void |
| bun:sqlite.Database.run | MethodDeclaration | sqlite.d.ts:208 | &lt;ParamsType extends SQLQueryBindings[]&gt;(sql: string, ...bindings: ParamsType[]) =&gt; Changes |
| bun:sqlite.Database.run.ParamsType | TypeParameter | sqlite.d.ts:208 | ParamsType |
| bun:sqlite.Database.exec | MethodDeclaration | sqlite.d.ts:215 | &lt;ParamsType extends SQLQueryBindings[]&gt;(sql: string, ...bindings: ParamsType[]) =&gt; Changes |
| bun:sqlite.Database.exec.ParamsType | TypeParameter | sqlite.d.ts:215 | ParamsType |
| bun:sqlite.Database.query | MethodDeclaration | sqlite.d.ts:241 | &lt;ReturnType, ParamsType extends SQLQueryBindings &#124; SQLQueryBindings[]&gt;(sql: string) =&gt; Statement&lt;ReturnType, ParamsType extends any[] ? ParamsType : [ParamsType]&gt; |
| bun:sqlite.Database.query.ReturnType | TypeParameter | sqlite.d.ts:241 | ReturnType |
| bun:sqlite.Database.query.ParamsType | TypeParameter | sqlite.d.ts:241 | ParamsType |
| bun:sqlite.Database.prepare | MethodDeclaration | sqlite.d.ts:266 | &lt;ReturnType, ParamsType extends SQLQueryBindings &#124; SQLQueryBindings[]&gt;(sql: string, params?: ParamsType &#124; undefined) =&gt; Statement&lt;ReturnType, ParamsType extends any[] ? ParamsType : [...]&gt; |
| bun:sqlite.Database.prepare.ReturnType | TypeParameter | sqlite.d.ts:266 | ReturnType |
| bun:sqlite.Database.prepare.ParamsType | TypeParameter | sqlite.d.ts:266 | ParamsType |
| bun:sqlite.Database.inTransaction | GetAccessor | sqlite.d.ts:286 | boolean |
| bun:sqlite.Database.close | MethodDeclaration | sqlite.d.ts:314 | (throwOnError?: boolean &#124; undefined) =&gt; void |
| bun:sqlite.Database.filename | PropertyDeclaration | sqlite.d.ts:335 | string |
| bun:sqlite.Database.handle | PropertyDeclaration | sqlite.d.ts:342 | number |
| bun:sqlite.Database.loadExtension | MethodDeclaration | sqlite.d.ts:354 | (extension: string, entryPoint?: string &#124; undefined) =&gt; void |
| bun:sqlite.Database.setCustomSQLite | MethodDeclaration | sqlite.d.ts:369 | (path: string) =&gt; boolean |
| bun:sqlite.Database./**      * Closes the database at the end of a `using` block (explicit resource management)      *      * @example      * ```ts      * using db = new Database("myapp.db");      * doSomethingWithDatabase(db);      * // Automatically closed when `db` goes out of scope      * ```      */     [Symbol.dispose] | MethodDeclaration | sqlite.d.ts:381 | () =&gt; void |
| bun:sqlite.Database.transaction | MethodDeclaration | sqlite.d.ts:422 | &lt;A extends any[], T&gt;(insideTransaction: (...args: A) =&gt; T) =&gt; { (...args: A): T; deferred: (...args: A) =&gt; T; immediate: (...args: A) =&gt; T; exclusive: (...args: A) =&gt; T; } |
| bun:sqlite.Database.transaction.A | TypeParameter | sqlite.d.ts:422 | A |
| bun:sqlite.Database.transaction.T | TypeParameter | sqlite.d.ts:422 | T |
| bun:sqlite.Database.transaction.[FunctionType] | FunctionType | sqlite.d.ts:423 | (...args: A) =&gt; T |
| bun:sqlite.Database.transaction.[TypeLiteral] | TypeLiteral | sqlite.d.ts:424 | { (...args: A): T; deferred: (...args: A) =&gt; T; immediate: (...args: A) =&gt; T; exclusive: (...args: A) =&gt; T; } |
| bun:sqlite.Database.transaction.[call] | CallSignature | sqlite.d.ts:428 | any |
| bun:sqlite.Database.transaction.deferred | PropertySignature | sqlite.d.ts:433 | (...args: A) =&gt; T |
| bun:sqlite.Database.transaction.deferred.[FunctionType] | FunctionType | sqlite.d.ts:433 | (...args: A) =&gt; T |
| bun:sqlite.Database.transaction.immediate | PropertySignature | sqlite.d.ts:438 | (...args: A) =&gt; T |
| bun:sqlite.Database.transaction.immediate.[FunctionType] | FunctionType | sqlite.d.ts:438 | (...args: A) =&gt; T |
| bun:sqlite.Database.transaction.exclusive | PropertySignature | sqlite.d.ts:443 | (...args: A) =&gt; T |
| bun:sqlite.Database.transaction.exclusive.[FunctionType] | FunctionType | sqlite.d.ts:443 | (...args: A) =&gt; T |
| bun:sqlite.Database.function | MethodDeclaration | sqlite.d.ts:482 | { (name: string, fn: (...args: any[]) =&gt; SQLFunctionResult): this; (name: string, options: FunctionOptions, fn: (...args: any[]) =&gt; SQLFunctionResult): this; } |
| bun:sqlite.Database.function.[FunctionType] | FunctionType | sqlite.d.ts:482 | (...args: any[]) =&gt; SQLFunctionResult |
| bun:sqlite.Database.function | MethodDeclaration | sqlite.d.ts:483 | { (name: string, fn: (...args: any[]) =&gt; SQLFunctionResult): this; (name: string, options: FunctionOptions, fn: (...args: any[]) =&gt; SQLFunctionResult): this; } |
| bun:sqlite.Database.function.[FunctionType] | FunctionType | sqlite.d.ts:483 | (...args: any[]) =&gt; SQLFunctionResult |
| bun:sqlite.Database.aggregate | MethodDeclaration | sqlite.d.ts:506 | &lt;T = any&gt;(name: string, options: AggregateOptions&lt;T&gt;) =&gt; this |
| bun:sqlite.Database.aggregate.T | TypeParameter | sqlite.d.ts:506 | T |
| bun:sqlite.Database.onInsert | GetAccessor | sqlite.d.ts:541 | UpdateHook &#124; null |
| bun:sqlite.Database.onInsert | SetAccessor | sqlite.d.ts:542 | UpdateHook &#124; null |
| bun:sqlite.Database.onUpdate | GetAccessor | sqlite.d.ts:550 | UpdateHook &#124; null |
| bun:sqlite.Database.onUpdate | SetAccessor | sqlite.d.ts:551 | UpdateHook &#124; null |
| bun:sqlite.Database.onDelete | GetAccessor | sqlite.d.ts:558 | UpdateHook &#124; null |
| bun:sqlite.Database.onDelete | SetAccessor | sqlite.d.ts:559 | UpdateHook &#124; null |
| bun:sqlite.Database.serialize | MethodDeclaration | sqlite.d.ts:569 | (name?: string &#124; undefined) =&gt; Buffer&lt;ArrayBufferLike&gt; |
| bun:sqlite.Database.deserialize | MethodDeclaration | sqlite.d.ts:638 | { (serialized: ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;, isReadOnly?: boolean &#124; undefined): Database; (serialized: ArrayBufferLike &#124; TypedArray&lt;...&gt;, options?: Pick&lt;...&gt; &#124; undefined): Database; } |
| bun:sqlite.Database.deserialize | MethodDeclaration | sqlite.d.ts:708 | { (serialized: ArrayBufferLike &#124; TypedArray&lt;ArrayBufferLike&gt;, isReadOnly?: boolean &#124; undefined): Database; (serialized: ArrayBufferLike &#124; TypedArray&lt;...&gt;, options?: Pick&lt;...&gt; &#124; undefined): Database; } |
| bun:sqlite.Database.fileControl | MethodDeclaration | sqlite.d.ts:734 | { (op: number, arg?: number &#124; ArrayBufferView&lt;ArrayBufferLike&gt; &#124; null &#124; undefined): number; (zDbName: string, op: number, arg?: number &#124; ArrayBufferView&lt;ArrayBufferLike&gt; &#124; null &#124; undefined): number; } |
| bun:sqlite.Database.fileControl | MethodDeclaration | sqlite.d.ts:739 | { (op: number, arg?: number &#124; ArrayBufferView&lt;ArrayBufferLike&gt; &#124; null &#124; undefined): number; (zDbName: string, op: number, arg?: number &#124; ArrayBufferView&lt;ArrayBufferLike&gt; &#124; null &#124; undefined): number; } |
| bun:sqlite.Statement | ClassDeclaration | sqlite.d.ts:769 | Statement&lt;ReturnType, ParamsType&gt; |
| bun:sqlite.Statement.ReturnType | TypeParameter | sqlite.d.ts:769 | ReturnType |
| bun:sqlite.Statement.ParamsType | TypeParameter | sqlite.d.ts:769 | ParamsType |
| bun:sqlite.Statement.constructor | Constructor | sqlite.d.ts:775 | any |
| bun:sqlite.Statement.all | MethodDeclaration | sqlite.d.ts:799 | (...params: ParamsType) =&gt; ReturnType[] |
| bun:sqlite.Statement.get | MethodDeclaration | sqlite.d.ts:837 | (...params: ParamsType) =&gt; ReturnType &#124; null |
| bun:sqlite.Statement.iterate | MethodDeclaration | sqlite.d.ts:849 | (...params: ParamsType) =&gt; IterableIterator&lt;ReturnType&gt; |
| bun:sqlite.Statement.[Symbol.iterator] | MethodDeclaration | sqlite.d.ts:850 | () =&gt; IterableIterator&lt;ReturnType&gt; |
| bun:sqlite.Statement.run | MethodDeclaration | sqlite.d.ts:883 | (...params: ParamsType) =&gt; Changes |
| bun:sqlite.Statement.values | MethodDeclaration | sqlite.d.ts:921 | (...params: ParamsType) =&gt; (string &#124; number &#124; bigint &#124; Uint8Array&lt;ArrayBufferLike&gt; &#124; null)[][] |
| bun:sqlite.Statement.raw | MethodDeclaration | sqlite.d.ts:945 | (...params: ParamsType) =&gt; (Uint8Array&lt;ArrayBufferLike&gt; &#124; null)[][] |
| bun:sqlite.Statement.columnNames | PropertyDeclaration | sqlite.d.ts:957 | string[] |
| bun:sqlite.Statement.paramsCount | PropertyDeclaration | sqlite.d.ts:974 | number |
| bun:sqlite.Statement.reader | PropertyDeclaration | sqlite.d.ts:981 | boolean |
| bun:sqlite.Statement.readonly | PropertyDeclaration | sqlite.d.ts:988 | boolean |
| bun:sqlite.Statement.isFinalized | PropertyDeclaration | sqlite.d.ts:993 | boolean |
| bun:sqlite.Statement.columnTypes | PropertyDeclaration | sqlite.d.ts:1027 | ("BLOB" &#124; "FLOAT" &#124; "INTEGER" &#124; "NULL" &#124; "TEXT" &#124; null)[] |
| bun:sqlite.Statement.declaredTypes | PropertyDeclaration | sqlite.d.ts:1055 | (string &#124; null)[] |
| bun:sqlite.Statement.safeIntegers | MethodDeclaration | sqlite.d.ts:1083 | { (enabled: boolean): this; (): boolean; } |
| bun:sqlite.Statement.safeIntegers | MethodDeclaration | sqlite.d.ts:1087 | { (enabled: boolean): this; (): boolean; } |
| bun:sqlite.Statement.finalize | MethodDeclaration | sqlite.d.ts:1100 | () =&gt; void |
| bun:sqlite.Statement./**      * Calls {@link finalize} if it wasn't already called.      */     [Symbol.dispose] | MethodDeclaration | sqlite.d.ts:1105 | () =&gt; void |
| bun:sqlite.Statement.toString | MethodDeclaration | sqlite.d.ts:1121 | () =&gt; string |
| bun:sqlite.Statement.toJSON | MethodDeclaration | sqlite.d.ts:1126 | () =&gt; { sql: string; isFinalized: boolean; paramsCount: number; columnNames: string[]; } |
| bun:sqlite.Statement.toJSON.[TypeLiteral] | TypeLiteral | sqlite.d.ts:1126 | { sql: string; isFinalized: boolean; paramsCount: number; columnNames: string[]; } |
| bun:sqlite.Statement.toJSON.sql | PropertySignature | sqlite.d.ts:1126 | string |
| bun:sqlite.Statement.toJSON.isFinalized | PropertySignature | sqlite.d.ts:1126 | boolean |
| bun:sqlite.Statement.toJSON.paramsCount | PropertySignature | sqlite.d.ts:1126 | number |
| bun:sqlite.Statement.toJSON.columnNames | PropertySignature | sqlite.d.ts:1126 | string[] |
| bun:sqlite.Statement.as | MethodDeclaration | sqlite.d.ts:1160 | &lt;T = unknown&gt;(Class: new (...args: any[]) =&gt; T) =&gt; Statement&lt;T, ParamsType&gt; |
| bun:sqlite.Statement.as.T | TypeParameter | sqlite.d.ts:1160 | T |
| bun:sqlite.Statement.as.[ConstructorType] | ConstructorType | sqlite.d.ts:1160 | new (...args: any[]) =&gt; T |
| bun:sqlite.Statement.native | PropertyDeclaration | sqlite.d.ts:1173 | any |
| bun:sqlite.constants | ModuleDeclaration | sqlite.d.ts:1181 | typeof constants |
| bun:sqlite.constants.SQLITE_OPEN_READONLY | VariableDeclaration | sqlite.d.ts:1186 | number |
| bun:sqlite.constants.SQLITE_OPEN_READWRITE | VariableDeclaration | sqlite.d.ts:1191 | number |
| bun:sqlite.constants.SQLITE_OPEN_CREATE | VariableDeclaration | sqlite.d.ts:1196 | number |
| bun:sqlite.constants.SQLITE_OPEN_DELETEONCLOSE | VariableDeclaration | sqlite.d.ts:1200 | number |
| bun:sqlite.constants.SQLITE_OPEN_EXCLUSIVE | VariableDeclaration | sqlite.d.ts:1204 | number |
| bun:sqlite.constants.SQLITE_OPEN_AUTOPROXY | VariableDeclaration | sqlite.d.ts:1208 | number |
| bun:sqlite.constants.SQLITE_OPEN_URI | VariableDeclaration | sqlite.d.ts:1212 | number |
| bun:sqlite.constants.SQLITE_OPEN_MEMORY | VariableDeclaration | sqlite.d.ts:1216 | number |
| bun:sqlite.constants.SQLITE_OPEN_MAIN_DB | VariableDeclaration | sqlite.d.ts:1220 | number |
| bun:sqlite.constants.SQLITE_OPEN_TEMP_DB | VariableDeclaration | sqlite.d.ts:1224 | number |
| bun:sqlite.constants.SQLITE_OPEN_TRANSIENT_DB | VariableDeclaration | sqlite.d.ts:1228 | number |
| bun:sqlite.constants.SQLITE_OPEN_MAIN_JOURNAL | VariableDeclaration | sqlite.d.ts:1232 | number |
| bun:sqlite.constants.SQLITE_OPEN_TEMP_JOURNAL | VariableDeclaration | sqlite.d.ts:1236 | number |
| bun:sqlite.constants.SQLITE_OPEN_SUBJOURNAL | VariableDeclaration | sqlite.d.ts:1240 | number |
| bun:sqlite.constants.SQLITE_OPEN_SUPER_JOURNAL | VariableDeclaration | sqlite.d.ts:1244 | number |
| bun:sqlite.constants.SQLITE_OPEN_NOMUTEX | VariableDeclaration | sqlite.d.ts:1248 | number |
| bun:sqlite.constants.SQLITE_OPEN_FULLMUTEX | VariableDeclaration | sqlite.d.ts:1252 | number |
| bun:sqlite.constants.SQLITE_OPEN_SHAREDCACHE | VariableDeclaration | sqlite.d.ts:1256 | number |
| bun:sqlite.constants.SQLITE_OPEN_PRIVATECACHE | VariableDeclaration | sqlite.d.ts:1260 | number |
| bun:sqlite.constants.SQLITE_OPEN_WAL | VariableDeclaration | sqlite.d.ts:1264 | number |
| bun:sqlite.constants.SQLITE_OPEN_NOFOLLOW | VariableDeclaration | sqlite.d.ts:1268 | number |
| bun:sqlite.constants.SQLITE_OPEN_EXRESCODE | VariableDeclaration | sqlite.d.ts:1272 | number |
| bun:sqlite.constants.SQLITE_PREPARE_PERSISTENT | VariableDeclaration | sqlite.d.ts:1276 | number |
| bun:sqlite.constants.SQLITE_PREPARE_NORMALIZE | VariableDeclaration | sqlite.d.ts:1280 | number |
| bun:sqlite.constants.SQLITE_PREPARE_NO_VTAB | VariableDeclaration | sqlite.d.ts:1284 | number |
| bun:sqlite.constants.SQLITE_FCNTL_LOCKSTATE | VariableDeclaration | sqlite.d.ts:1288 | number |
| bun:sqlite.constants.SQLITE_FCNTL_GET_LOCKPROXYFILE | VariableDeclaration | sqlite.d.ts:1292 | number |
| bun:sqlite.constants.SQLITE_FCNTL_SET_LOCKPROXYFILE | VariableDeclaration | sqlite.d.ts:1296 | number |
| bun:sqlite.constants.SQLITE_FCNTL_LAST_ERRNO | VariableDeclaration | sqlite.d.ts:1300 | number |
| bun:sqlite.constants.SQLITE_FCNTL_SIZE_HINT | VariableDeclaration | sqlite.d.ts:1304 | number |
| bun:sqlite.constants.SQLITE_FCNTL_CHUNK_SIZE | VariableDeclaration | sqlite.d.ts:1308 | number |
| bun:sqlite.constants.SQLITE_FCNTL_FILE_POINTER | VariableDeclaration | sqlite.d.ts:1312 | number |
| bun:sqlite.constants.SQLITE_FCNTL_SYNC_OMITTED | VariableDeclaration | sqlite.d.ts:1316 | number |
| bun:sqlite.constants.SQLITE_FCNTL_WIN32_AV_RETRY | VariableDeclaration | sqlite.d.ts:1320 | number |
| bun:sqlite.constants.SQLITE_FCNTL_PERSIST_WAL | VariableDeclaration | sqlite.d.ts:1340 | number |
| bun:sqlite.constants.SQLITE_FCNTL_OVERWRITE | VariableDeclaration | sqlite.d.ts:1344 | number |
| bun:sqlite.constants.SQLITE_FCNTL_VFSNAME | VariableDeclaration | sqlite.d.ts:1348 | number |
| bun:sqlite.constants.SQLITE_FCNTL_POWERSAFE_OVERWRITE | VariableDeclaration | sqlite.d.ts:1352 | number |
| bun:sqlite.constants.SQLITE_FCNTL_PRAGMA | VariableDeclaration | sqlite.d.ts:1356 | number |
| bun:sqlite.constants.SQLITE_FCNTL_BUSYHANDLER | VariableDeclaration | sqlite.d.ts:1360 | number |
| bun:sqlite.constants.SQLITE_FCNTL_TEMPFILENAME | VariableDeclaration | sqlite.d.ts:1364 | number |
| bun:sqlite.constants.SQLITE_FCNTL_MMAP_SIZE | VariableDeclaration | sqlite.d.ts:1368 | number |
| bun:sqlite.constants.SQLITE_FCNTL_TRACE | VariableDeclaration | sqlite.d.ts:1372 | number |
| bun:sqlite.constants.SQLITE_FCNTL_HAS_MOVED | VariableDeclaration | sqlite.d.ts:1376 | number |
| bun:sqlite.constants.SQLITE_FCNTL_SYNC | VariableDeclaration | sqlite.d.ts:1380 | number |
| bun:sqlite.constants.SQLITE_FCNTL_COMMIT_PHASETWO | VariableDeclaration | sqlite.d.ts:1384 | number |
| bun:sqlite.constants.SQLITE_FCNTL_WIN32_SET_HANDLE | VariableDeclaration | sqlite.d.ts:1388 | number |
| bun:sqlite.constants.SQLITE_FCNTL_WAL_BLOCK | VariableDeclaration | sqlite.d.ts:1392 | number |
| bun:sqlite.constants.SQLITE_FCNTL_ZIPVFS | VariableDeclaration | sqlite.d.ts:1396 | number |
| bun:sqlite.constants.SQLITE_FCNTL_RBU | VariableDeclaration | sqlite.d.ts:1400 | number |
| bun:sqlite.constants.SQLITE_FCNTL_VFS_POINTER | VariableDeclaration | sqlite.d.ts:1404 | number |
| bun:sqlite.constants.SQLITE_FCNTL_JOURNAL_POINTER | VariableDeclaration | sqlite.d.ts:1408 | number |
| bun:sqlite.constants.SQLITE_FCNTL_WIN32_GET_HANDLE | VariableDeclaration | sqlite.d.ts:1412 | number |
| bun:sqlite.constants.SQLITE_FCNTL_PDB | VariableDeclaration | sqlite.d.ts:1416 | number |
| bun:sqlite.constants.SQLITE_FCNTL_BEGIN_ATOMIC_WRITE | VariableDeclaration | sqlite.d.ts:1420 | number |
| bun:sqlite.constants.SQLITE_FCNTL_COMMIT_ATOMIC_WRITE | VariableDeclaration | sqlite.d.ts:1424 | number |
| bun:sqlite.constants.SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE | VariableDeclaration | sqlite.d.ts:1428 | number |
| bun:sqlite.constants.SQLITE_FCNTL_LOCK_TIMEOUT | VariableDeclaration | sqlite.d.ts:1432 | number |
| bun:sqlite.constants.SQLITE_FCNTL_DATA_VERSION | VariableDeclaration | sqlite.d.ts:1436 | number |
| bun:sqlite.constants.SQLITE_FCNTL_SIZE_LIMIT | VariableDeclaration | sqlite.d.ts:1440 | number |
| bun:sqlite.constants.SQLITE_FCNTL_CKPT_DONE | VariableDeclaration | sqlite.d.ts:1444 | number |
| bun:sqlite.constants.SQLITE_FCNTL_RESERVE_BYTES | VariableDeclaration | sqlite.d.ts:1448 | number |
| bun:sqlite.constants.SQLITE_FCNTL_CKPT_START | VariableDeclaration | sqlite.d.ts:1452 | number |
| bun:sqlite.constants.SQLITE_FCNTL_EXTERNAL_READER | VariableDeclaration | sqlite.d.ts:1456 | number |
| bun:sqlite.constants.SQLITE_FCNTL_CKSM_FILE | VariableDeclaration | sqlite.d.ts:1460 | number |
| bun:sqlite.constants.SQLITE_FCNTL_RESET_CACHE | VariableDeclaration | sqlite.d.ts:1464 | number |
| bun:sqlite.SQLQueryBindings | TypeAliasDeclaration | sqlite.d.ts:1467 | SQLQueryBindings |
| bun:sqlite.SQLFunctionResult | TypeAliasDeclaration | sqlite.d.ts:1481 | SQLFunctionResult |
| bun:sqlite.FunctionOptions | InterfaceDeclaration | sqlite.d.ts:1487 | FunctionOptions |
| bun:sqlite.FunctionOptions.varargs | PropertySignature | sqlite.d.ts:1494 | boolean &#124; undefined |
| bun:sqlite.FunctionOptions.deterministic | PropertySignature | sqlite.d.ts:1505 | boolean &#124; undefined |
| bun:sqlite.FunctionOptions.directOnly | PropertySignature | sqlite.d.ts:1516 | boolean &#124; undefined |
| bun:sqlite.FunctionOptions.safeIntegers | PropertySignature | sqlite.d.ts:1524 | boolean &#124; undefined |
| bun:sqlite.AggregateOptions | InterfaceDeclaration | sqlite.d.ts:1530 | AggregateOptions&lt;T&gt; |
| bun:sqlite.AggregateOptions.T | TypeParameter | sqlite.d.ts:1530 | T |
| bun:sqlite.AggregateOptions.start | PropertySignature | sqlite.d.ts:1538 | T &#124; (() =&gt; T) &#124; undefined |
| bun:sqlite.AggregateOptions.start.[FunctionType] | FunctionType | sqlite.d.ts:1538 | () =&gt; T |
| bun:sqlite.AggregateOptions.step | PropertySignature | sqlite.d.ts:1548 | (accumulator: T, ...args: any[]) =&gt; void &#124; T |
| bun:sqlite.AggregateOptions.step.[FunctionType] | FunctionType | sqlite.d.ts:1548 | (accumulator: T, ...args: any[]) =&gt; void &#124; T |
| bun:sqlite.AggregateOptions.inverse | PropertySignature | sqlite.d.ts:1555 | ((accumulator: T, ...args: any[]) =&gt; void &#124; T) &#124; null &#124; undefined |
| bun:sqlite.AggregateOptions.inverse.[FunctionType] | FunctionType | sqlite.d.ts:1555 | (accumulator: T, ...args: any[]) =&gt; void &#124; T |
| bun:sqlite.AggregateOptions.result | PropertySignature | sqlite.d.ts:1562 | ((accumulator: T) =&gt; SQLFunctionResult) &#124; null &#124; undefined |
| bun:sqlite.AggregateOptions.result.[FunctionType] | FunctionType | sqlite.d.ts:1562 | (accumulator: T) =&gt; SQLFunctionResult |
| bun:sqlite.UpdateHook | TypeAliasDeclaration | sqlite.d.ts:1573 | UpdateHook |
| bun:sqlite.UpdateHook.[FunctionType] | FunctionType | sqlite.d.ts:1573 | UpdateHook |
| bun:sqlite.[ExportAssignment] | ExportAssignment | sqlite.d.ts:1581 | typeof Database |
| bun:sqlite.SQLiteError | ClassDeclaration | sqlite.d.ts:1586 | SQLiteError |
| bun:sqlite.SQLiteError.name | PropertyDeclaration | sqlite.d.ts:1587 | "SQLiteError" |
| bun:sqlite.SQLiteError.errno | PropertyDeclaration | sqlite.d.ts:1596 | number |
| bun:sqlite.SQLiteError.code | PropertyDeclaration | sqlite.d.ts:1608 | string &#124; undefined |
| bun:sqlite.SQLiteError.byteOffset | PropertyDeclaration | sqlite.d.ts:1619 | number |
| bun:sqlite.Changes | InterfaceDeclaration | sqlite.d.ts:1627 | Changes |
| bun:sqlite.Changes.changes | PropertySignature | sqlite.d.ts:1634 | number |
| bun:sqlite.Changes.lastInsertRowid | PropertySignature | sqlite.d.ts:1641 | number &#124; bigint |
| bun:test | ModuleDeclaration | test.d.ts:16 | typeof import("bun:test") |
| bun:test.Mock | TypeAliasDeclaration | test.d.ts:17 | Mock&lt;T&gt; |
| bun:test.Mock.T | TypeParameter | test.d.ts:17 | T |
| bun:test.Mock.[FunctionType] | FunctionType | test.d.ts:17 | (...args: any[]) =&gt; any |
| bun:test.mock | VariableDeclaration | test.d.ts:19 | { &lt;T extends (...args: any[]) =&gt; any&gt;(Function?: T &#124; undefined): Mock&lt;T&gt;; module(id: string, factory: () =&gt; any): void &#124; Promise&lt;void&gt;; restore(): void; clearAllMocks(): void; } |
| bun:test.[TypeLiteral] | TypeLiteral | test.d.ts:19 | { &lt;T extends (...args: any[]) =&gt; any&gt;(Function?: T &#124; undefined): Mock&lt;T&gt;; module(id: string, factory: () =&gt; any): void &#124; Promise&lt;void&gt;; restore(): void; clearAllMocks(): void; } |
| bun:test.[call] | CallSignature | test.d.ts:23 | any |
| bun:test.T | TypeParameter | test.d.ts:23 | T |
| bun:test.[FunctionType] | FunctionType | test.d.ts:23 | (...args: any[]) =&gt; any |
| bun:test.module | MethodSignature | test.d.ts:54 | (id: string, factory: () =&gt; any) =&gt; void &#124; Promise&lt;void&gt; |
| bun:test.module.[FunctionType] | FunctionType | test.d.ts:54 | () =&gt; any |
| bun:test.restore | MethodSignature | test.d.ts:58 | () =&gt; void |
| bun:test.clearAllMocks | MethodSignature | test.d.ts:63 | () =&gt; void |
| bun:test.setSystemTime | FunctionDeclaration | test.d.ts:92 | (now?: number &#124; Date &#124; undefined) =&gt; ThisType&lt;void&gt; |
| bun:test.jest | ModuleDeclaration | test.d.ts:94 | typeof jest |
| bun:test.jest.restoreAllMocks | FunctionDeclaration | test.d.ts:95 | () =&gt; void |
| bun:test.jest.clearAllMocks | FunctionDeclaration | test.d.ts:96 | () =&gt; void |
| bun:test.jest.resetAllMocks | FunctionDeclaration | test.d.ts:97 | () =&gt; void |
| bun:test.jest.fn | FunctionDeclaration | test.d.ts:98 | &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt; |
| bun:test.jest.fn.T | TypeParameter | test.d.ts:98 | T |
| bun:test.jest.fn.[FunctionType] | FunctionType | test.d.ts:98 | (...args: any[]) =&gt; any |
| bun:test.jest.setSystemTime | FunctionDeclaration | test.d.ts:99 | (now?: number &#124; Date &#124; undefined) =&gt; void |
| bun:test.jest.setTimeout | FunctionDeclaration | test.d.ts:100 | (milliseconds: number) =&gt; void |
| bun:test.jest.useFakeTimers | FunctionDeclaration | test.d.ts:101 | (options?: "legacy" &#124; "modern" &#124; { now?: number &#124; Date &#124; undefined; } &#124; undefined) =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;...&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.jest.useFakeTimers.[TypeLiteral] | TypeLiteral | test.d.ts:101 | { now?: number &#124; Date &#124; undefined; } |
| bun:test.jest.useFakeTimers.now | PropertySignature | test.d.ts:101 | number &#124; Date &#124; undefined |
| bun:test.jest.useRealTimers | FunctionDeclaration | test.d.ts:102 | () =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.jest.advanceTimersByTime | FunctionDeclaration | test.d.ts:103 | (milliseconds: number) =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.jest.advanceTimersToNextTimer | FunctionDeclaration | test.d.ts:104 | () =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.jest.runAllTimers | FunctionDeclaration | test.d.ts:105 | () =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.jest.runOnlyPendingTimers | FunctionDeclaration | test.d.ts:106 | () =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.jest.getTimerCount | FunctionDeclaration | test.d.ts:107 | () =&gt; number |
| bun:test.jest.clearAllTimers | FunctionDeclaration | test.d.ts:108 | () =&gt; void |
| bun:test.jest.isFakeTimers | FunctionDeclaration | test.d.ts:109 | () =&gt; boolean |
| bun:test.jest.spyOn | FunctionDeclaration | test.d.ts:110 | &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt; |
| bun:test.jest.spyOn.T | TypeParameter | test.d.ts:110 | T |
| bun:test.jest.spyOn.K | TypeParameter | test.d.ts:110 | K |
| bun:test.jest.spyOn.[FunctionType] | FunctionType | test.d.ts:113 | (...args: any[]) =&gt; any |
| bun:test.jest.Mock | TypeAliasDeclaration | test.d.ts:118 | Mock&lt;T&gt; |
| bun:test.jest.Mock.T | TypeParameter | test.d.ts:118 | T |
| bun:test.jest.Mock.[FunctionType] | FunctionType | test.d.ts:118 | (...args: any[]) =&gt; any |
| bun:test.jest.Mock.[FunctionType] | FunctionType | test.d.ts:118 | (...args: any[]) =&gt; any |
| bun:test.jest.Replaced | TypeAliasDeclaration | test.d.ts:138 | Replaced&lt;T&gt; |
| bun:test.jest.Replaced.T | TypeParameter | test.d.ts:138 | T |
| bun:test.jest.Spied | TypeAliasDeclaration | test.d.ts:142 | Spied&lt;T&gt; |
| bun:test.jest.Spied.T | TypeParameter | test.d.ts:142 | T |
| bun:test.jest.Spied.[FunctionType] | FunctionType | test.d.ts:142 | (...args: any[]) =&gt; any |
| bun:test.jest.SpiedClass | TypeAliasDeclaration | test.d.ts:146 | SpiedClass&lt;T&gt; |
| bun:test.jest.SpiedClass.T | TypeParameter | test.d.ts:146 | T |
| bun:test.jest.SpiedFunction | TypeAliasDeclaration | test.d.ts:150 | SpiedFunction&lt;T&gt; |
| bun:test.jest.SpiedFunction.T | TypeParameter | test.d.ts:150 | T |
| bun:test.jest.SpiedFunction.[FunctionType] | FunctionType | test.d.ts:150 | (...args: any[]) =&gt; any |
| bun:test.jest.SpiedGetter | TypeAliasDeclaration | test.d.ts:154 | SpiedGetter&lt;T&gt; |
| bun:test.jest.SpiedGetter.T | TypeParameter | test.d.ts:154 | T |
| bun:test.jest.SpiedSetter | TypeAliasDeclaration | test.d.ts:158 | SpiedSetter&lt;T&gt; |
| bun:test.jest.SpiedSetter.T | TypeParameter | test.d.ts:158 | T |
| bun:test.spyOn | FunctionDeclaration | test.d.ts:164 | &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt; |
| bun:test.spyOn.T | TypeParameter | test.d.ts:164 | T |
| bun:test.spyOn.K | TypeParameter | test.d.ts:164 | K |
| bun:test.spyOn.[FunctionType] | FunctionType | test.d.ts:167 | (...args: any[]) =&gt; any |
| bun:test.vi | VariableDeclaration | test.d.ts:172 | { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.[TypeLiteral] | TypeLiteral | test.d.ts:172 | { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.fn | PropertySignature | test.d.ts:176 | &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt; |
| bun:test.spyOn | PropertySignature | test.d.ts:180 | &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt; |
| bun:test.mock | PropertySignature | test.d.ts:184 | (id: string, factory: () =&gt; any) =&gt; void &#124; Promise&lt;void&gt; |
| bun:test.restoreAllMocks | PropertySignature | test.d.ts:188 | () =&gt; void |
| bun:test.clearAllMocks | PropertySignature | test.d.ts:192 | () =&gt; void |
| bun:test.resetAllMocks | PropertySignature | test.d.ts:193 | () =&gt; void |
| bun:test.useFakeTimers | PropertySignature | test.d.ts:194 | (options?: "legacy" &#124; "modern" &#124; { now?: number &#124; Date &#124; undefined; } &#124; undefined) =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;...&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.useRealTimers | PropertySignature | test.d.ts:195 | () =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.advanceTimersByTime | PropertySignature | test.d.ts:196 | (milliseconds: number) =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.advanceTimersToNextTimer | PropertySignature | test.d.ts:197 | () =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.runAllTimers | PropertySignature | test.d.ts:198 | () =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.runOnlyPendingTimers | PropertySignature | test.d.ts:199 | () =&gt; { fn: &lt;T extends (...args: any[]) =&gt; any&gt;(func?: T &#124; undefined) =&gt; Mock&lt;T&gt;; spyOn: &lt;T extends object, K extends keyof T&gt;(obj: T, methodOrPropertyValue: K) =&gt; Mock&lt;Extract&lt;T[K], (...args: any[]) =&gt; any&gt;&gt;; ... 12 more ...; isFakeTimers: () =&gt; boolean; } |
| bun:test.getTimerCount | PropertySignature | test.d.ts:200 | () =&gt; number |
| bun:test.clearAllTimers | PropertySignature | test.d.ts:201 | () =&gt; void |
| bun:test.isFakeTimers | PropertySignature | test.d.ts:202 | () =&gt; boolean |
| bun:test.FunctionLike | InterfaceDeclaration | test.d.ts:205 | FunctionLike |
| bun:test.FunctionLike.name | PropertySignature | test.d.ts:206 | string |
| bun:test.DescribeLabel | TypeAliasDeclaration | test.d.ts:209 | DescribeLabel |
| bun:test.Describe | InterfaceDeclaration | test.d.ts:231 | Describe&lt;T&gt; |
| bun:test.Describe.T | TypeParameter | test.d.ts:231 | T |
| bun:test.Describe.[call] | CallSignature | test.d.ts:232 | any |
| bun:test.Describe.[FunctionType] | FunctionType | test.d.ts:232 | () =&gt; void |
| bun:test.Describe.[call] | CallSignature | test.d.ts:234 | any |
| bun:test.Describe.[FunctionType] | FunctionType | test.d.ts:234 | (...args: T) =&gt; void |
| bun:test.Describe.only | PropertySignature | test.d.ts:238 | Describe&lt;T&gt; |
| bun:test.Describe.skip | PropertySignature | test.d.ts:242 | ((label: string &#124; number) =&gt; void) &amp; Describe&lt;T&gt; |
| bun:test.Describe.skip.[FunctionType] | FunctionType | test.d.ts:242 | (label: string &#124; number) =&gt; void |
| bun:test.Describe.todo | PropertySignature | test.d.ts:246 | ((label: string &#124; number) =&gt; void) &amp; Describe&lt;T&gt; |
| bun:test.Describe.todo.[FunctionType] | FunctionType | test.d.ts:246 | (label: string &#124; number) =&gt; void |
| bun:test.Describe.concurrent | PropertySignature | test.d.ts:250 | Describe&lt;T&gt; |
| bun:test.Describe.serial | PropertySignature | test.d.ts:255 | Describe&lt;T&gt; |
| bun:test.Describe.if | MethodSignature | test.d.ts:263 | (condition: boolean) =&gt; Describe&lt;T&gt; |
| bun:test.Describe.skipIf | MethodSignature | test.d.ts:269 | (condition: boolean) =&gt; Describe&lt;T&gt; |
| bun:test.Describe.todoIf | MethodSignature | test.d.ts:275 | (condition: boolean) =&gt; Describe&lt;T&gt; |
| bun:test.Describe.each | MethodSignature | test.d.ts:281 | { &lt;T extends Readonly&lt;[any, ...any[]]&gt;&gt;(table: readonly T[]): Describe&lt;[...T]&gt;; &lt;T extends readonly any[]&gt;(table: readonly T[]): Describe&lt;[...T]&gt;; &lt;const T&gt;(table: readonly T[]): Describe&lt;[T]&gt;; } |
| bun:test.Describe.each.T | TypeParameter | test.d.ts:281 | T |
| bun:test.Describe.each | MethodSignature | test.d.ts:282 | { &lt;T extends Readonly&lt;[any, ...any[]]&gt;&gt;(table: readonly T[]): Describe&lt;[...T]&gt;; &lt;T extends readonly any[]&gt;(table: readonly T[]): Describe&lt;[...T]&gt;; &lt;const T&gt;(table: readonly T[]): Describe&lt;[T]&gt;; } |
| bun:test.Describe.each.T | TypeParameter | test.d.ts:282 | T |
| bun:test.Describe.each | MethodSignature | test.d.ts:283 | { &lt;T extends Readonly&lt;[any, ...any[]]&gt;&gt;(table: readonly T[]): Describe&lt;[...T]&gt;; &lt;T extends readonly any[]&gt;(table: readonly T[]): Describe&lt;[...T]&gt;; &lt;const T&gt;(table: readonly T[]): Describe&lt;[T]&gt;; } |
| bun:test.Describe.each.T | TypeParameter | test.d.ts:283 | T |
| bun:test.describe | VariableDeclaration | test.d.ts:303 | Describe&lt;[]&gt; |
| bun:test.xdescribe | VariableDeclaration | test.d.ts:312 | Describe&lt;[]&gt; |
| bun:test.HookOptions | TypeAliasDeclaration | test.d.ts:314 | HookOptions |
| bun:test.HookOptions.[TypeLiteral] | TypeLiteral | test.d.ts:314 | { timeout?: number &#124; undefined; } |
| bun:test.HookOptions.timeout | PropertySignature | test.d.ts:314 | number &#124; undefined |
| bun:test.beforeAll | FunctionDeclaration | test.d.ts:333 | (fn: (() =&gt; void &#124; Promise&lt;unknown&gt;) &#124; ((done: (err?: unknown) =&gt; void) =&gt; void), options?: HookOptions &#124; undefined) =&gt; void |
| bun:test.beforeAll.[FunctionType] | FunctionType | test.d.ts:334 | () =&gt; void &#124; Promise&lt;unknown&gt; |
| bun:test.beforeAll.[FunctionType] | FunctionType | test.d.ts:334 | (done: (err?: unknown) =&gt; void) =&gt; void |
| bun:test.beforeAll.[FunctionType].[FunctionType] | FunctionType | test.d.ts:334 | (err?: unknown) =&gt; void |
| bun:test.beforeEach | FunctionDeclaration | test.d.ts:347 | (fn: (() =&gt; void &#124; Promise&lt;unknown&gt;) &#124; ((done: (err?: unknown) =&gt; void) =&gt; void), options?: HookOptions &#124; undefined) =&gt; void |
| bun:test.beforeEach.[FunctionType] | FunctionType | test.d.ts:348 | () =&gt; void &#124; Promise&lt;unknown&gt; |
| bun:test.beforeEach.[FunctionType] | FunctionType | test.d.ts:348 | (done: (err?: unknown) =&gt; void) =&gt; void |
| bun:test.beforeEach.[FunctionType].[FunctionType] | FunctionType | test.d.ts:348 | (err?: unknown) =&gt; void |
| bun:test.afterAll | FunctionDeclaration | test.d.ts:369 | (fn: (() =&gt; void &#124; Promise&lt;unknown&gt;) &#124; ((done: (err?: unknown) =&gt; void) =&gt; void), options?: HookOptions &#124; undefined) =&gt; void |
| bun:test.afterAll.[FunctionType] | FunctionType | test.d.ts:370 | () =&gt; void &#124; Promise&lt;unknown&gt; |
| bun:test.afterAll.[FunctionType] | FunctionType | test.d.ts:370 | (done: (err?: unknown) =&gt; void) =&gt; void |
| bun:test.afterAll.[FunctionType].[FunctionType] | FunctionType | test.d.ts:370 | (err?: unknown) =&gt; void |
| bun:test.afterEach | FunctionDeclaration | test.d.ts:381 | (fn: (() =&gt; void &#124; Promise&lt;unknown&gt;) &#124; ((done: (err?: unknown) =&gt; void) =&gt; void), options?: HookOptions &#124; undefined) =&gt; void |
| bun:test.afterEach.[FunctionType] | FunctionType | test.d.ts:382 | () =&gt; void &#124; Promise&lt;unknown&gt; |
| bun:test.afterEach.[FunctionType] | FunctionType | test.d.ts:382 | (done: (err?: unknown) =&gt; void) =&gt; void |
| bun:test.afterEach.[FunctionType].[FunctionType] | FunctionType | test.d.ts:382 | (err?: unknown) =&gt; void |
| bun:test.onTestFinished | FunctionDeclaration | test.d.ts:402 | (fn: (() =&gt; void &#124; Promise&lt;unknown&gt;) &#124; ((done: (err?: unknown) =&gt; void) =&gt; void), options?: HookOptions &#124; undefined) =&gt; void |
| bun:test.onTestFinished.[FunctionType] | FunctionType | test.d.ts:403 | () =&gt; void &#124; Promise&lt;unknown&gt; |
| bun:test.onTestFinished.[FunctionType] | FunctionType | test.d.ts:403 | (done: (err?: unknown) =&gt; void) =&gt; void |
| bun:test.onTestFinished.[FunctionType].[FunctionType] | FunctionType | test.d.ts:403 | (err?: unknown) =&gt; void |
| bun:test.setDefaultTimeout | FunctionDeclaration | test.d.ts:412 | (milliseconds: number) =&gt; void |
| bun:test.TestOptions | InterfaceDeclaration | test.d.ts:413 | TestOptions |
| bun:test.TestOptions.timeout | PropertySignature | test.d.ts:424 | number &#124; undefined |
| bun:test.TestOptions.retry | PropertySignature | test.d.ts:430 | number &#124; undefined |
| bun:test.TestOptions.repeats | PropertySignature | test.d.ts:436 | number &#124; undefined |
| bun:test.__internal | ModuleDeclaration | test.d.ts:439 | any |
| bun:test.__internal.IfNeverThenElse | TypeAliasDeclaration | test.d.ts:440 | IfNeverThenElse&lt;T, Else&gt; |
| bun:test.__internal.IfNeverThenElse.T | TypeParameter | test.d.ts:440 | T |
| bun:test.__internal.IfNeverThenElse.Else | TypeParameter | test.d.ts:440 | Else |
| bun:test.__internal.IsTuple | TypeAliasDeclaration | test.d.ts:442 | IsTuple&lt;T&gt; |
| bun:test.__internal.IsTuple.T | TypeParameter | test.d.ts:442 | T |
| bun:test.__internal.Flatten | TypeAliasDeclaration | test.d.ts:451 | Flatten&lt;T, Copy&gt; |
| bun:test.__internal.Flatten.T | TypeParameter | test.d.ts:451 | T |
| bun:test.__internal.Flatten.Copy | TypeParameter | test.d.ts:451 | Copy |
| bun:test.__internal.Flatten.[MappedType] | MappedType | test.d.ts:451 | Flatten&lt;T, Copy&gt; |
| bun:test.__internal.Flatten.Key | TypeParameter | test.d.ts:451 | Key |
| bun:test.Test | InterfaceDeclaration | test.d.ts:479 | Test&lt;T&gt; |
| bun:test.Test.T | TypeParameter | test.d.ts:479 | T |
| bun:test.Test.[call] | CallSignature | test.d.ts:490 | any |
| bun:test.Test.[FunctionType] | FunctionType | test.d.ts:493 | (...args: IsTuple&lt;T&gt; extends true ? [...table: Flatten&lt;T, T&gt;, done: (err?: unknown) =&gt; void] : T) =&gt; void &#124; Promise&lt;unknown&gt; |
| bun:test.Test.[FunctionType].[FunctionType] | FunctionType | test.d.ts:495 | (err?: unknown) =&gt; void |
| bun:test.Test.[call] | CallSignature | test.d.ts:499 | any |
| bun:test.Test.[FunctionType] | FunctionType | test.d.ts:502 | (...args: IsTuple&lt;T&gt; extends true ? [...table: Flatten&lt;T, T&gt;, done: (err?: unknown) =&gt; void] : T) =&gt; void &#124; Promise&lt;unknown&gt; |
| bun:test.Test.[FunctionType].[FunctionType] | FunctionType | test.d.ts:504 | (err?: unknown) =&gt; void |
| bun:test.Test.only | PropertySignature | test.d.ts:520 | Test&lt;T&gt; |
| bun:test.Test.skip | PropertySignature | test.d.ts:524 | ((label: string) =&gt; void) &amp; Test&lt;T&gt; |
| bun:test.Test.skip.[FunctionType] | FunctionType | test.d.ts:524 | (label: string) =&gt; void |
| bun:test.Test.todo | PropertySignature | test.d.ts:532 | ((label: string) =&gt; void) &amp; Test&lt;T&gt; |
| bun:test.Test.todo.[FunctionType] | FunctionType | test.d.ts:532 | (label: string) =&gt; void |
| bun:test.Test.failing | PropertySignature | test.d.ts:542 | Test&lt;T&gt; |
| bun:test.Test.concurrent | PropertySignature | test.d.ts:546 | Test&lt;T&gt; |
| bun:test.Test.serial | PropertySignature | test.d.ts:551 | Test&lt;T&gt; |
| bun:test.Test.if | MethodSignature | test.d.ts:559 | (condition: boolean) =&gt; Test&lt;T&gt; |
| bun:test.Test.skipIf | MethodSignature | test.d.ts:565 | (condition: boolean) =&gt; Test&lt;T&gt; |
| bun:test.Test.todoIf | MethodSignature | test.d.ts:571 | (condition: boolean) =&gt; Test&lt;T&gt; |
| bun:test.Test.failingIf | MethodSignature | test.d.ts:577 | (condition: boolean) =&gt; Test&lt;T&gt; |
| bun:test.Test.concurrentIf | MethodSignature | test.d.ts:583 | (condition: boolean) =&gt; Test&lt;T&gt; |
| bun:test.Test.serialIf | MethodSignature | test.d.ts:590 | (condition: boolean) =&gt; Test&lt;T&gt; |
| bun:test.Test.each | MethodSignature | test.d.ts:596 | { &lt;T extends Readonly&lt;[unknown, ...unknown[]]&gt;&gt;(table: readonly T[]): Test&lt;T&gt;; &lt;T extends readonly unknown[]&gt;(table: readonly T[]): Test&lt;T&gt;; &lt;const T&gt;(table: readonly T[]): Test&lt;[T]&gt;; } |
| bun:test.Test.each.T | TypeParameter | test.d.ts:596 | T |
| bun:test.Test.each | MethodSignature | test.d.ts:597 | { &lt;T extends Readonly&lt;[unknown, ...unknown[]]&gt;&gt;(table: readonly T[]): Test&lt;T&gt;; &lt;T extends readonly unknown[]&gt;(table: readonly T[]): Test&lt;T&gt;; &lt;const T&gt;(table: readonly T[]): Test&lt;[T]&gt;; } |
| bun:test.Test.each.T | TypeParameter | test.d.ts:597 | T |
| bun:test.Test.each | MethodSignature | test.d.ts:598 | { &lt;T extends Readonly&lt;[unknown, ...unknown[]]&gt;&gt;(table: readonly T[]): Test&lt;T&gt;; &lt;T extends readonly unknown[]&gt;(table: readonly T[]): Test&lt;T&gt;; &lt;const T&gt;(table: readonly T[]): Test&lt;[T]&gt;; } |
| bun:test.Test.each.T | TypeParameter | test.d.ts:598 | T |
| bun:test.test | VariableDeclaration | test.d.ts:618 | Test&lt;[]&gt; |
| bun:test.it | ExportSpecifier | test.d.ts:619 | Test&lt;[]&gt; |
| bun:test.xit | ExportSpecifier | test.d.ts:619 | Test&lt;[]&gt; |
| bun:test.xtest | VariableDeclaration | test.d.ts:629 | Test&lt;[]&gt; |
| bun:test.expect | VariableDeclaration | test.d.ts:644 | Expect |
| bun:test.ExpectNot | TypeAliasDeclaration | test.d.ts:646 | ExpectNot |
| bun:test.Expect | InterfaceDeclaration | test.d.ts:648 | Expect |
| bun:test.Expect.[call] | CallSignature | test.d.ts:655 | any |
| bun:test.Expect.[call] | CallSignature | test.d.ts:656 | any |
| bun:test.Expect.T | TypeParameter | test.d.ts:656 | T |
| bun:test.Expect.[call] | CallSignature | test.d.ts:657 | any |
| bun:test.Expect.T | TypeParameter | test.d.ts:657 | T |
| bun:test.Expect.not | PropertySignature | test.d.ts:666 | ExpectNot |
| bun:test.Expect.resolvesTo | PropertySignature | test.d.ts:676 | AsymmetricMatchers |
| bun:test.Expect.rejectsTo | PropertySignature | test.d.ts:686 | AsymmetricMatchers |
| bun:test.Expect.extend | MethodSignature | test.d.ts:714 | &lt;M&gt;(matchers: ExpectExtendMatchers&lt;M&gt;) =&gt; void |
| bun:test.Expect.extend.M | TypeParameter | test.d.ts:714 | M |
| bun:test.Expect.unreachable | MethodSignature | test.d.ts:736 | (msg?: string &#124; Error &#124; undefined) =&gt; never |
| bun:test.Expect.hasAssertions | MethodSignature | test.d.ts:741 | () =&gt; void |
| bun:test.Expect.assertions | MethodSignature | test.d.ts:746 | (neededAssertions: number) =&gt; void |
| bun:test.Matchers | InterfaceDeclaration | test.d.ts:774 | Matchers&lt;T&gt; |
| bun:test.Matchers.T | TypeParameter | test.d.ts:774 | T |
| bun:test.AsymmetricMatchers | InterfaceDeclaration | test.d.ts:799 | AsymmetricMatchers |
| bun:test.AsymmetricMatchersBuiltin | InterfaceDeclaration | test.d.ts:801 | AsymmetricMatchersBuiltin |
| bun:test.AsymmetricMatchersBuiltin.any | MethodSignature | test.d.ts:818 | (constructor: ((...args: any[]) =&gt; any) &#124; (new (...args: any[]) =&gt; any)) =&gt; any |
| bun:test.AsymmetricMatchersBuiltin.any.[FunctionType] | FunctionType | test.d.ts:818 | (...args: any[]) =&gt; any |
| bun:test.AsymmetricMatchersBuiltin.any.[TypeLiteral] | TypeLiteral | test.d.ts:818 | new (...args: any[]) =&gt; any |
| bun:test.AsymmetricMatchersBuiltin.any.[construct] | ConstructSignature | test.d.ts:818 | any |
| bun:test.AsymmetricMatchersBuiltin.anything | MethodSignature | test.d.ts:832 | () =&gt; any |
| bun:test.AsymmetricMatchersBuiltin.arrayContaining | MethodSignature | test.d.ts:839 | &lt;E = any&gt;(arr: readonly E[]) =&gt; any |
| bun:test.AsymmetricMatchersBuiltin.arrayContaining.E | TypeParameter | test.d.ts:839 | E |
| bun:test.AsymmetricMatchersBuiltin.objectContaining | MethodSignature | test.d.ts:846 | (obj: object) =&gt; any |
| bun:test.AsymmetricMatchersBuiltin.stringContaining | MethodSignature | test.d.ts:850 | (str: string &#124; String) =&gt; any |
| bun:test.AsymmetricMatchersBuiltin.stringMatching | MethodSignature | test.d.ts:854 | (regex: string &#124; RegExp &#124; String) =&gt; any |
| bun:test.AsymmetricMatchersBuiltin.closeTo | MethodSignature | test.d.ts:863 | (num: number, numDigits?: number &#124; undefined) =&gt; any |
| bun:test.AsymmetricMatchersBuiltinNegated | InterfaceDeclaration | test.d.ts:866 | AsymmetricMatchersBuiltinNegated |
| bun:test.AsymmetricMatchersBuiltinNegated.resolvesTo | PropertySignature | test.d.ts:875 | ExpectNot |
| bun:test.AsymmetricMatchersBuiltinNegated.rejectsTo | PropertySignature | test.d.ts:885 | ExpectNot |
| bun:test.AsymmetricMatchersBuiltinNegated.arrayContaining | MethodSignature | test.d.ts:895 | &lt;E = any&gt;(arr: readonly E[]) =&gt; any |
| bun:test.AsymmetricMatchersBuiltinNegated.arrayContaining.E | TypeParameter | test.d.ts:895 | E |
| bun:test.AsymmetricMatchersBuiltinNegated.objectContaining | MethodSignature | test.d.ts:907 | (obj: object) =&gt; any |
| bun:test.AsymmetricMatchersBuiltinNegated.stringContaining | MethodSignature | test.d.ts:914 | (str: string &#124; String) =&gt; any |
| bun:test.AsymmetricMatchersBuiltinNegated.stringMatching | MethodSignature | test.d.ts:921 | (str: string &#124; RegExp &#124; String) =&gt; any |
| bun:test.AsymmetricMatchersBuiltinNegated.closeTo | MethodSignature | test.d.ts:928 | (num: number, numDigits?: number &#124; undefined) =&gt; any |
| bun:test.MatchersBuiltin | InterfaceDeclaration | test.d.ts:931 | MatchersBuiltin&lt;T&gt; |
| bun:test.MatchersBuiltin.T | TypeParameter | test.d.ts:931 | T |
| bun:test.MatchersBuiltin.not | PropertySignature | test.d.ts:943 | Matchers&lt;unknown&gt; |
| bun:test.MatchersBuiltin.resolves | PropertySignature | test.d.ts:951 | Matchers&lt;Awaited&lt;T&gt;&gt; |
| bun:test.MatchersBuiltin.rejects | PropertySignature | test.d.ts:959 | Matchers&lt;unknown&gt; |
| bun:test.MatchersBuiltin.pass | PropertySignature | test.d.ts:973 | (message?: string &#124; undefined) =&gt; void |
| bun:test.MatchersBuiltin.pass.[FunctionType] | FunctionType | test.d.ts:973 | (message?: string &#124; undefined) =&gt; void |
| bun:test.MatchersBuiltin.fail | PropertySignature | test.d.ts:985 | (message?: string &#124; undefined) =&gt; void |
| bun:test.MatchersBuiltin.fail.[FunctionType] | FunctionType | test.d.ts:985 | (message?: string &#124; undefined) =&gt; void |
| bun:test.MatchersBuiltin.toBe | MethodSignature | test.d.ts:1006 | { (expected: T): void; &lt;X = T&gt;(expected: NoInfer&lt;X&gt;): void; } |
| bun:test.MatchersBuiltin.toBe | MethodSignature | test.d.ts:1007 | { (expected: T): void; &lt;X = T&gt;(expected: NoInfer&lt;X&gt;): void; } |
| bun:test.MatchersBuiltin.toBe.X | TypeParameter | test.d.ts:1007 | X |
| bun:test.MatchersBuiltin.toBeOdd | MethodSignature | test.d.ts:1017 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeEven | MethodSignature | test.d.ts:1027 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeCloseTo | MethodSignature | test.d.ts:1046 | (expected: number, numDigits?: number &#124; undefined) =&gt; void |
| bun:test.MatchersBuiltin.toEqual | MethodSignature | test.d.ts:1059 | { (expected: T): void; &lt;X = T&gt;(expected: NoInfer&lt;X&gt;): void; } |
| bun:test.MatchersBuiltin.toEqual | MethodSignature | test.d.ts:1060 | { (expected: T): void; &lt;X = T&gt;(expected: NoInfer&lt;X&gt;): void; } |
| bun:test.MatchersBuiltin.toEqual.X | TypeParameter | test.d.ts:1060 | X |
| bun:test.MatchersBuiltin.toStrictEqual | MethodSignature | test.d.ts:1085 | { (expected: T): void; &lt;X = T&gt;(expected: NoInfer&lt;X&gt;): void; } |
| bun:test.MatchersBuiltin.toStrictEqual | MethodSignature | test.d.ts:1086 | { (expected: T): void; &lt;X = T&gt;(expected: NoInfer&lt;X&gt;): void; } |
| bun:test.MatchersBuiltin.toStrictEqual.X | TypeParameter | test.d.ts:1086 | X |
| bun:test.MatchersBuiltin.toBeOneOf | MethodSignature | test.d.ts:1100 | { (expected: Iterable&lt;T&gt;): void; &lt;X = T&gt;(expected: NoInfer&lt;Iterable&lt;X&gt;&gt;): void; } |
| bun:test.MatchersBuiltin.toBeOneOf | MethodSignature | test.d.ts:1101 | { (expected: Iterable&lt;T&gt;): void; &lt;X = T&gt;(expected: NoInfer&lt;Iterable&lt;X&gt;&gt;): void; } |
| bun:test.MatchersBuiltin.toBeOneOf.X | TypeParameter | test.d.ts:1101 | X |
| bun:test.MatchersBuiltin.toContain | MethodSignature | test.d.ts:1116 | { (expected: T extends Iterable&lt;infer U&gt; ? U : T): void; &lt;X = T&gt;(expected: NoInfer&lt;X extends Iterable&lt;infer U&gt; ? U : X&gt;): void; } |
| bun:test.MatchersBuiltin.toContain.U | TypeParameter | test.d.ts:1116 | U |
| bun:test.MatchersBuiltin.toContain | MethodSignature | test.d.ts:1117 | { (expected: T extends Iterable&lt;infer U&gt; ? U : T): void; &lt;X = T&gt;(expected: NoInfer&lt;X extends Iterable&lt;infer U&gt; ? U : X&gt;): void; } |
| bun:test.MatchersBuiltin.toContain.X | TypeParameter | test.d.ts:1117 | X |
| bun:test.MatchersBuiltin.toContain.U | TypeParameter | test.d.ts:1117 | U |
| bun:test.MatchersBuiltin.toContainKey | MethodSignature | test.d.ts:1132 | { (expected: IfNeverThenElse&lt;keyof T, PropertyKey&gt;): void; &lt;X = T&gt;(expected: IfNeverThenElse&lt;NoInfer&lt;keyof X&gt;, PropertyKey&gt;): void; } |
| bun:test.MatchersBuiltin.toContainKey | MethodSignature | test.d.ts:1133 | { (expected: IfNeverThenElse&lt;keyof T, PropertyKey&gt;): void; &lt;X = T&gt;(expected: IfNeverThenElse&lt;NoInfer&lt;keyof X&gt;, PropertyKey&gt;): void; } |
| bun:test.MatchersBuiltin.toContainKey.X | TypeParameter | test.d.ts:1133 | X |
| bun:test.MatchersBuiltin.toContainAllKeys | MethodSignature | test.d.ts:1149 | { (expected: IfNeverThenElse&lt;keyof T, PropertyKey&gt;[]): void; &lt;X = T&gt;(expected: IfNeverThenElse&lt;NoInfer&lt;keyof X&gt;, PropertyKey&gt;[]): void; } |
| bun:test.MatchersBuiltin.toContainAllKeys | MethodSignature | test.d.ts:1150 | { (expected: IfNeverThenElse&lt;keyof T, PropertyKey&gt;[]): void; &lt;X = T&gt;(expected: IfNeverThenElse&lt;NoInfer&lt;keyof X&gt;, PropertyKey&gt;[]): void; } |
| bun:test.MatchersBuiltin.toContainAllKeys.X | TypeParameter | test.d.ts:1150 | X |
| bun:test.MatchersBuiltin.toContainAnyKeys | MethodSignature | test.d.ts:1165 | { (expected: IfNeverThenElse&lt;keyof T, PropertyKey&gt;[]): void; &lt;X = T&gt;(expected: IfNeverThenElse&lt;NoInfer&lt;keyof X&gt;, PropertyKey&gt;[]): void; } |
| bun:test.MatchersBuiltin.toContainAnyKeys | MethodSignature | test.d.ts:1166 | { (expected: IfNeverThenElse&lt;keyof T, PropertyKey&gt;[]): void; &lt;X = T&gt;(expected: IfNeverThenElse&lt;NoInfer&lt;keyof X&gt;, PropertyKey&gt;[]): void; } |
| bun:test.MatchersBuiltin.toContainAnyKeys.X | TypeParameter | test.d.ts:1166 | X |
| bun:test.MatchersBuiltin.toContainValue | MethodSignature | test.d.ts:1200 | (expected: unknown) =&gt; void |
| bun:test.MatchersBuiltin.toContainValues | MethodSignature | test.d.ts:1217 | (expected: unknown[]) =&gt; void |
| bun:test.MatchersBuiltin.toContainAllValues | MethodSignature | test.d.ts:1231 | (expected: unknown[]) =&gt; void |
| bun:test.MatchersBuiltin.toContainAnyValues | MethodSignature | test.d.ts:1246 | (expected: unknown[]) =&gt; void |
| bun:test.MatchersBuiltin.toContainKeys | MethodSignature | test.d.ts:1258 | { (expected: IfNeverThenElse&lt;keyof T, PropertyKey&gt;[]): void; &lt;X = T&gt;(expected: IfNeverThenElse&lt;NoInfer&lt;keyof X&gt;, PropertyKey&gt;[]): void; } |
| bun:test.MatchersBuiltin.toContainKeys | MethodSignature | test.d.ts:1259 | { (expected: IfNeverThenElse&lt;keyof T, PropertyKey&gt;[]): void; &lt;X = T&gt;(expected: IfNeverThenElse&lt;NoInfer&lt;keyof X&gt;, PropertyKey&gt;[]): void; } |
| bun:test.MatchersBuiltin.toContainKeys.X | TypeParameter | test.d.ts:1259 | X |
| bun:test.MatchersBuiltin.toContainEqual | MethodSignature | test.d.ts:1273 | { (expected: T extends Iterable&lt;infer U&gt; ? U : T): void; &lt;X = T&gt;(expected: NoInfer&lt;X extends Iterable&lt;infer U&gt; ? U : X&gt;): void; } |
| bun:test.MatchersBuiltin.toContainEqual.U | TypeParameter | test.d.ts:1273 | U |
| bun:test.MatchersBuiltin.toContainEqual | MethodSignature | test.d.ts:1274 | { (expected: T extends Iterable&lt;infer U&gt; ? U : T): void; &lt;X = T&gt;(expected: NoInfer&lt;X extends Iterable&lt;infer U&gt; ? U : X&gt;): void; } |
| bun:test.MatchersBuiltin.toContainEqual.X | TypeParameter | test.d.ts:1274 | X |
| bun:test.MatchersBuiltin.toContainEqual.U | TypeParameter | test.d.ts:1274 | U |
| bun:test.MatchersBuiltin.toHaveLength | MethodSignature | test.d.ts:1286 | (length: number) =&gt; void |
| bun:test.MatchersBuiltin.toHaveProperty | MethodSignature | test.d.ts:1301 | (keyPath: string &#124; number &#124; (string &#124; number)[], value?: unknown) =&gt; void |
| bun:test.MatchersBuiltin.toBeTruthy | MethodSignature | test.d.ts:1314 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeFalsy | MethodSignature | test.d.ts:1327 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeDefined | MethodSignature | test.d.ts:1336 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeInstanceOf | MethodSignature | test.d.ts:1345 | (value: unknown) =&gt; void |
| bun:test.MatchersBuiltin.toBeUndefined | MethodSignature | test.d.ts:1354 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeNull | MethodSignature | test.d.ts:1363 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeNaN | MethodSignature | test.d.ts:1375 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeGreaterThan | MethodSignature | test.d.ts:1387 | (expected: number &#124; bigint) =&gt; void |
| bun:test.MatchersBuiltin.toBeGreaterThanOrEqual | MethodSignature | test.d.ts:1399 | (expected: number &#124; bigint) =&gt; void |
| bun:test.MatchersBuiltin.toBeLessThan | MethodSignature | test.d.ts:1411 | (expected: number &#124; bigint) =&gt; void |
| bun:test.MatchersBuiltin.toBeLessThanOrEqual | MethodSignature | test.d.ts:1423 | (expected: number &#124; bigint) =&gt; void |
| bun:test.MatchersBuiltin.toThrow | MethodSignature | test.d.ts:1444 | (expected?: unknown) =&gt; void |
| bun:test.MatchersBuiltin.toThrowError | MethodSignature | test.d.ts:1466 | (expected?: unknown) =&gt; void |
| bun:test.MatchersBuiltin.toMatch | MethodSignature | test.d.ts:1477 | (expected: string &#124; RegExp) =&gt; void |
| bun:test.MatchersBuiltin.toMatchSnapshot | MethodSignature | test.d.ts:1486 | { (hint?: string &#124; undefined): void; (propertyMatchers?: object &#124; undefined, hint?: string &#124; undefined): void; } |
| bun:test.MatchersBuiltin.toMatchSnapshot | MethodSignature | test.d.ts:1499 | { (hint?: string &#124; undefined): void; (propertyMatchers?: object &#124; undefined, hint?: string &#124; undefined): void; } |
| bun:test.MatchersBuiltin.toMatchInlineSnapshot | MethodSignature | test.d.ts:1510 | { (value?: string &#124; undefined): void; (propertyMatchers?: object &#124; undefined, value?: string &#124; undefined): void; } |
| bun:test.MatchersBuiltin.toMatchInlineSnapshot | MethodSignature | test.d.ts:1526 | { (value?: string &#124; undefined): void; (propertyMatchers?: object &#124; undefined, value?: string &#124; undefined): void; } |
| bun:test.MatchersBuiltin.toThrowErrorMatchingSnapshot | MethodSignature | test.d.ts:1540 | (hint?: string &#124; undefined) =&gt; void |
| bun:test.MatchersBuiltin.toThrowErrorMatchingInlineSnapshot | MethodSignature | test.d.ts:1554 | (value?: string &#124; undefined) =&gt; void |
| bun:test.MatchersBuiltin.toMatchObject | MethodSignature | test.d.ts:1565 | (subset: object) =&gt; void |
| bun:test.MatchersBuiltin.toBeEmpty | MethodSignature | test.d.ts:1576 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeEmptyObject | MethodSignature | test.d.ts:1585 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeNil | MethodSignature | test.d.ts:1594 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeArray | MethodSignature | test.d.ts:1605 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeArrayOfSize | MethodSignature | test.d.ts:1617 | (size: number) =&gt; void |
| bun:test.MatchersBuiltin.toBeBoolean | MethodSignature | test.d.ts:1628 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeTrue | MethodSignature | test.d.ts:1638 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeTypeOf | MethodSignature | test.d.ts:1649 | (type: "bigint" &#124; "boolean" &#124; "function" &#124; "number" &#124; "object" &#124; "string" &#124; "symbol" &#124; "undefined") =&gt; void |
| bun:test.MatchersBuiltin.toBeFalse | MethodSignature | test.d.ts:1659 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeNumber | MethodSignature | test.d.ts:1670 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeInteger | MethodSignature | test.d.ts:1680 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeObject | MethodSignature | test.d.ts:1690 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeFinite | MethodSignature | test.d.ts:1701 | () =&gt; void |
| bun:test.MatchersBuiltin.toBePositive | MethodSignature | test.d.ts:1711 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeNegative | MethodSignature | test.d.ts:1721 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeWithin | MethodSignature | test.d.ts:1729 | (start: number, end: number) =&gt; void |
| bun:test.MatchersBuiltin.toEqualIgnoringWhitespace | MethodSignature | test.d.ts:1740 | (expected: string) =&gt; void |
| bun:test.MatchersBuiltin.toBeSymbol | MethodSignature | test.d.ts:1749 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeFunction | MethodSignature | test.d.ts:1757 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeDate | MethodSignature | test.d.ts:1769 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeValidDate | MethodSignature | test.d.ts:1779 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeString | MethodSignature | test.d.ts:1789 | () =&gt; void |
| bun:test.MatchersBuiltin.toInclude | MethodSignature | test.d.ts:1798 | (expected: string) =&gt; void |
| bun:test.MatchersBuiltin.toIncludeRepeated | MethodSignature | test.d.ts:1805 | (expected: string, times: number) =&gt; void |
| bun:test.MatchersBuiltin.toSatisfy | MethodSignature | test.d.ts:1817 | (predicate: (value: T) =&gt; boolean) =&gt; void |
| bun:test.MatchersBuiltin.toSatisfy.[FunctionType] | FunctionType | test.d.ts:1817 | (value: T) =&gt; boolean |
| bun:test.MatchersBuiltin.toStartWith | MethodSignature | test.d.ts:1824 | (expected: string) =&gt; void |
| bun:test.MatchersBuiltin.toEndWith | MethodSignature | test.d.ts:1831 | (expected: string) =&gt; void |
| bun:test.MatchersBuiltin.toHaveReturned | MethodSignature | test.d.ts:1838 | () =&gt; void |
| bun:test.MatchersBuiltin.toHaveReturnedTimes | MethodSignature | test.d.ts:1845 | (times: number) =&gt; void |
| bun:test.MatchersBuiltin.toHaveReturnedWith | MethodSignature | test.d.ts:1851 | (expected: unknown) =&gt; void |
| bun:test.MatchersBuiltin.toHaveLastReturnedWith | MethodSignature | test.d.ts:1857 | (expected: unknown) =&gt; void |
| bun:test.MatchersBuiltin.toHaveNthReturnedWith | MethodSignature | test.d.ts:1865 | (n: number, expected: unknown) =&gt; void |
| bun:test.MatchersBuiltin.toHaveBeenCalled | MethodSignature | test.d.ts:1870 | () =&gt; void |
| bun:test.MatchersBuiltin.toBeCalled | MethodSignature | test.d.ts:1876 | () =&gt; void |
| bun:test.MatchersBuiltin.toHaveBeenCalledOnce | MethodSignature | test.d.ts:1881 | () =&gt; void |
| bun:test.MatchersBuiltin.toHaveBeenCalledTimes | MethodSignature | test.d.ts:1886 | (expected: number) =&gt; void |
| bun:test.MatchersBuiltin.toBeCalledTimes | MethodSignature | test.d.ts:1892 | (expected: number) =&gt; void |
| bun:test.MatchersBuiltin.toHaveBeenCalledWith | MethodSignature | test.d.ts:1897 | (...expected: unknown[]) =&gt; void |
| bun:test.MatchersBuiltin.toBeCalledWith | MethodSignature | test.d.ts:1903 | (...expected: unknown[]) =&gt; void |
| bun:test.MatchersBuiltin.toHaveBeenLastCalledWith | MethodSignature | test.d.ts:1908 | (...expected: unknown[]) =&gt; void |
| bun:test.MatchersBuiltin.lastCalledWith | MethodSignature | test.d.ts:1914 | (...expected: unknown[]) =&gt; void |
| bun:test.MatchersBuiltin.toHaveBeenNthCalledWith | MethodSignature | test.d.ts:1919 | (n: number, ...expected: unknown[]) =&gt; void |
| bun:test.MatchersBuiltin.nthCalledWith | MethodSignature | test.d.ts:1925 | (n: number, ...expected: unknown[]) =&gt; void |
| bun:test.AsymmetricMatcher | TypeAliasDeclaration | test.d.ts:1932 | any |
| bun:test.MatcherResult | InterfaceDeclaration | test.d.ts:1934 | MatcherResult |
| bun:test.MatcherResult.pass | PropertySignature | test.d.ts:1935 | boolean |
| bun:test.MatcherResult.message | PropertySignature | test.d.ts:1936 | string &#124; (() =&gt; string) &#124; undefined |
| bun:test.MatcherResult.message.[FunctionType] | FunctionType | test.d.ts:1936 | () =&gt; string |
| bun:test.CustomMatcher | TypeAliasDeclaration | test.d.ts:1939 | CustomMatcher&lt;E, P&gt; |
| bun:test.CustomMatcher.E | TypeParameter | test.d.ts:1939 | E |
| bun:test.CustomMatcher.P | TypeParameter | test.d.ts:1939 | P |
| bun:test.CustomMatcher.[FunctionType] | FunctionType | test.d.ts:1939 | CustomMatcher&lt;E, P&gt; |
| bun:test.CustomMatchersDetected | TypeAliasDeclaration | test.d.ts:1946 | CustomMatchersDetected |
| bun:test.ExpectExtendMatchers | TypeAliasDeclaration | test.d.ts:1953 | ExpectExtendMatchers&lt;M&gt; |
| bun:test.ExpectExtendMatchers.M | TypeParameter | test.d.ts:1953 | M |
| bun:test.ExpectExtendMatchers.[MappedType] | MappedType | test.d.ts:1953 | ExpectExtendMatchers&lt;M&gt; |
| bun:test.ExpectExtendMatchers.k | TypeParameter | test.d.ts:1954 | k |
| bun:test.Tester | TypeAliasDeclaration | test.d.ts:1960 | Tester |
| bun:test.Tester.[FunctionType] | FunctionType | test.d.ts:1960 | Tester |
| bun:test.EqualsFunction | TypeAliasDeclaration | test.d.ts:1962 | EqualsFunction |
| bun:test.EqualsFunction.[FunctionType] | FunctionType | test.d.ts:1962 | EqualsFunction |
| bun:test.TesterContext | InterfaceDeclaration | test.d.ts:1969 | TesterContext |
| bun:test.TesterContext.equals | PropertySignature | test.d.ts:1970 | EqualsFunction |
| bun:test.MatcherState | InterfaceDeclaration | test.d.ts:1973 | MatcherState |
| bun:test.MatcherState.isNot | PropertySignature | test.d.ts:1983 | boolean |
| bun:test.MatcherState.promise | PropertySignature | test.d.ts:1985 | string |
| bun:test.MatcherHintColor | TypeAliasDeclaration | test.d.ts:1990 | MatcherHintColor |
| bun:test.MatcherHintColor.[FunctionType] | FunctionType | test.d.ts:1990 | MatcherHintColor |
| bun:test.MatcherUtils | InterfaceDeclaration | test.d.ts:1992 | MatcherUtils |
| bun:test.MatcherUtils.equals | PropertySignature | test.d.ts:1995 | EqualsFunction |
| bun:test.MatcherUtils.utils | PropertySignature | test.d.ts:1996 | Readonly&lt;{ stringify(value: unknown): string; printReceived(value: unknown): string; printExpected(value: unknown): string; matcherHint(matcherName: string, received?: unknown, expected?: unknown, options?: { isNot?: boolean &#124; undefined; ... 6 more ...; secondArgumentColor?: MatcherHintColor &#124; undefined; } &#124; undefin... |
| bun:test.MatcherUtils.utils.[TypeLiteral] | TypeLiteral | test.d.ts:1996 | { stringify(value: unknown): string; printReceived(value: unknown): string; printExpected(value: unknown): string; matcherHint(matcherName: string, received?: unknown, expected?: unknown, options?: { isNot?: boolean &#124; undefined; ... 6 more ...; secondArgumentColor?: MatcherHintColor &#124; undefined; } &#124; undefined): stri... |
| bun:test.MatcherUtils.utils.stringify | MethodSignature | test.d.ts:1997 | (value: unknown) =&gt; string |
| bun:test.MatcherUtils.utils.printReceived | MethodSignature | test.d.ts:1998 | (value: unknown) =&gt; string |
| bun:test.MatcherUtils.utils.printExpected | MethodSignature | test.d.ts:1999 | (value: unknown) =&gt; string |
| bun:test.MatcherUtils.utils.matcherHint | MethodSignature | test.d.ts:2000 | (matcherName: string, received?: unknown, expected?: unknown, options?: { isNot?: boolean &#124; undefined; promise?: string &#124; undefined; isDirectExpectCall?: boolean &#124; undefined; comment?: string &#124; undefined; expectedColor?: MatcherHintColor &#124; undefined; receivedColor?: MatcherHintColor &#124; undefined; secondArgument?: str... |
| bun:test.MatcherUtils.utils.matcherHint.[TypeLiteral] | TypeLiteral | test.d.ts:2004 | { isNot?: boolean &#124; undefined; promise?: string &#124; undefined; isDirectExpectCall?: boolean &#124; undefined; comment?: string &#124; undefined; expectedColor?: MatcherHintColor &#124; undefined; receivedColor?: MatcherHintColor &#124; undefined; secondArgument?: string &#124; undefined; secondArgumentColor?: MatcherHintColor &#124; undefined; } |
| bun:test.MatcherUtils.utils.matcherHint.isNot | PropertySignature | test.d.ts:2005 | boolean &#124; undefined |
| bun:test.MatcherUtils.utils.matcherHint.promise | PropertySignature | test.d.ts:2006 | string &#124; undefined |
| bun:test.MatcherUtils.utils.matcherHint.isDirectExpectCall | PropertySignature | test.d.ts:2007 | boolean &#124; undefined |
| bun:test.MatcherUtils.utils.matcherHint.comment | PropertySignature | test.d.ts:2008 | string &#124; undefined |
| bun:test.MatcherUtils.utils.matcherHint.expectedColor | PropertySignature | test.d.ts:2009 | MatcherHintColor &#124; undefined |
| bun:test.MatcherUtils.utils.matcherHint.receivedColor | PropertySignature | test.d.ts:2010 | MatcherHintColor &#124; undefined |
| bun:test.MatcherUtils.utils.matcherHint.secondArgument | PropertySignature | test.d.ts:2011 | string &#124; undefined |
| bun:test.MatcherUtils.utils.matcherHint.secondArgumentColor | PropertySignature | test.d.ts:2012 | MatcherHintColor &#124; undefined |
| bun:test.MatcherContext | TypeAliasDeclaration | test.d.ts:2021 | MatcherContext |
| bun:test.JestMock | ModuleDeclaration | test.d.ts:2023 | typeof JestMock |
| bun:test.JestMock.ClassLike | InterfaceDeclaration | test.d.ts:2030 | ClassLike |
| bun:test.JestMock.ClassLike.[construct] | ConstructSignature | test.d.ts:2031 | any |
| bun:test.JestMock.ConstructorLikeKeys | TypeAliasDeclaration | test.d.ts:2034 | keyof { [K in keyof T as Required&lt;T&gt;[K] extends ClassLike ? K : never]: T[K]; } |
| bun:test.JestMock.ConstructorLikeKeys.T | TypeParameter | test.d.ts:2034 | T |
| bun:test.JestMock.ConstructorLikeKeys.[MappedType] | MappedType | test.d.ts:2034 | { [K in keyof T as Required&lt;T&gt;[K] extends ClassLike ? K : never]: T[K]; } |
| bun:test.JestMock.ConstructorLikeKeys.K | TypeParameter | test.d.ts:2035 | K |
| bun:test.JestMock.FunctionLike | TypeAliasDeclaration | test.d.ts:2042 | FunctionLike |
| bun:test.JestMock.FunctionLike.[FunctionType] | FunctionType | test.d.ts:2042 | FunctionLike |
| bun:test.JestMock.MethodLikeKeys | TypeAliasDeclaration | test.d.ts:2044 | keyof { [K in keyof T as Required&lt;T&gt;[K] extends FunctionLike ? K : never]: T[K]; } |
| bun:test.JestMock.MethodLikeKeys.T | TypeParameter | test.d.ts:2044 | T |
| bun:test.JestMock.MethodLikeKeys.[MappedType] | MappedType | test.d.ts:2044 | { [K in keyof T as Required&lt;T&gt;[K] extends FunctionLike ? K : never]: T[K]; } |
| bun:test.JestMock.MethodLikeKeys.K | TypeParameter | test.d.ts:2045 | K |
| bun:test.JestMock.Mock | InterfaceDeclaration | test.d.ts:2048 | Mock&lt;T&gt; |
| bun:test.JestMock.Mock.T | TypeParameter | test.d.ts:2048 | T |
| bun:test.JestMock.Mock.[FunctionType] | FunctionType | test.d.ts:2048 | (...args: any[]) =&gt; any |
| bun:test.JestMock.Mock.[call] | CallSignature | test.d.ts:2049 | any |
| bun:test.JestMock.MockFunctionResult | TypeAliasDeclaration | test.d.ts:2133 | MockFunctionResult&lt;T&gt; |
| bun:test.JestMock.MockFunctionResult.T | TypeParameter | test.d.ts:2133 | T |
| bun:test.JestMock.MockFunctionResultIncomplete | InterfaceDeclaration | test.d.ts:2136 | MockFunctionResultIncomplete |
| bun:test.JestMock.MockFunctionResultIncomplete.type | PropertySignature | test.d.ts:2137 | "incomplete" |
| bun:test.JestMock.MockFunctionResultIncomplete.value | PropertySignature | test.d.ts:2143 | undefined |
| bun:test.JestMock.MockFunctionResultReturn | InterfaceDeclaration | test.d.ts:2146 | MockFunctionResultReturn&lt;T&gt; |
| bun:test.JestMock.MockFunctionResultReturn.T | TypeParameter | test.d.ts:2146 | T |
| bun:test.JestMock.MockFunctionResultReturn.type | PropertySignature | test.d.ts:2147 | "return" |
| bun:test.JestMock.MockFunctionResultReturn.value | PropertySignature | test.d.ts:2151 | ReturnType&lt;T&gt; |
| bun:test.JestMock.MockFunctionResultThrow | InterfaceDeclaration | test.d.ts:2154 | MockFunctionResultThrow |
| bun:test.JestMock.MockFunctionResultThrow.type | PropertySignature | test.d.ts:2155 | "throw" |
| bun:test.JestMock.MockFunctionResultThrow.value | PropertySignature | test.d.ts:2159 | unknown |
| bun:test.JestMock.MockFunctionState | InterfaceDeclaration | test.d.ts:2162 | MockFunctionState&lt;T&gt; |
| bun:test.JestMock.MockFunctionState.T | TypeParameter | test.d.ts:2162 | T |
| bun:test.JestMock.MockFunctionState.calls | PropertySignature | test.d.ts:2166 | Parameters&lt;T&gt;[] |
| bun:test.JestMock.MockFunctionState.instances | PropertySignature | test.d.ts:2170 | ReturnType&lt;T&gt;[] |
| bun:test.JestMock.MockFunctionState.contexts | PropertySignature | test.d.ts:2174 | ThisParameterType&lt;T&gt;[] |
| bun:test.JestMock.MockFunctionState.invocationCallOrder | PropertySignature | test.d.ts:2179 | number[] |
| bun:test.JestMock.MockFunctionState.lastCall | PropertySignature | test.d.ts:2184 | Parameters&lt;T&gt; &#124; undefined |
| bun:test.JestMock.MockFunctionState.results | PropertySignature | test.d.ts:2188 | MockFunctionResult&lt;T&gt;[] |
| bun:test.JestMock.MockInstance | InterfaceDeclaration | test.d.ts:2191 | MockInstance&lt;T&gt; |
| bun:test.JestMock.MockInstance.T | TypeParameter | test.d.ts:2191 | T |
| bun:test.JestMock.MockInstance._isMockFunction | PropertySignature | test.d.ts:2192 | true |
| bun:test.JestMock.MockInstance._protoImpl | PropertySignature | test.d.ts:2193 | Function |
| bun:test.JestMock.MockInstance.getMockImplementation | MethodSignature | test.d.ts:2194 | () =&gt; T &#124; undefined |
| bun:test.JestMock.MockInstance.getMockName | MethodSignature | test.d.ts:2195 | () =&gt; string |
| bun:test.JestMock.MockInstance.mock | PropertySignature | test.d.ts:2196 | MockFunctionState&lt;T&gt; |
| bun:test.JestMock.MockInstance.mockClear | MethodSignature | test.d.ts:2197 | () =&gt; this |
| bun:test.JestMock.MockInstance.mockReset | MethodSignature | test.d.ts:2198 | () =&gt; this |
| bun:test.JestMock.MockInstance.mockRestore | MethodSignature | test.d.ts:2199 | () =&gt; void |
| bun:test.JestMock.MockInstance.mockImplementation | MethodSignature | test.d.ts:2200 | (fn: T) =&gt; this |
| bun:test.JestMock.MockInstance.mockImplementationOnce | MethodSignature | test.d.ts:2201 | (fn: T) =&gt; this |
| bun:test.JestMock.MockInstance.withImplementation | MethodSignature | test.d.ts:2202 | { (fn: T, callback: () =&gt; Promise&lt;unknown&gt;): Promise&lt;void&gt;; (fn: T, callback: () =&gt; void): void; } |
| bun:test.JestMock.MockInstance.withImplementation.[FunctionType] | FunctionType | test.d.ts:2202 | () =&gt; Promise&lt;unknown&gt; |
| bun:test.JestMock.MockInstance.withImplementation | MethodSignature | test.d.ts:2203 | { (fn: T, callback: () =&gt; Promise&lt;unknown&gt;): Promise&lt;void&gt;; (fn: T, callback: () =&gt; void): void; } |
| bun:test.JestMock.MockInstance.withImplementation.[FunctionType] | FunctionType | test.d.ts:2203 | () =&gt; void |
| bun:test.JestMock.MockInstance.mockName | MethodSignature | test.d.ts:2204 | (name: string) =&gt; this |
| bun:test.JestMock.MockInstance.mockReturnThis | MethodSignature | test.d.ts:2205 | () =&gt; this |
| bun:test.JestMock.MockInstance.mockReturnValue | MethodSignature | test.d.ts:2206 | (value: ReturnType&lt;T&gt;) =&gt; this |
| bun:test.JestMock.MockInstance.mockReturnValueOnce | MethodSignature | test.d.ts:2207 | (value: ReturnType&lt;T&gt;) =&gt; this |
| bun:test.JestMock.MockInstance.mockResolvedValue | MethodSignature | test.d.ts:2208 | (value: ResolveType&lt;T&gt;) =&gt; this |
| bun:test.JestMock.MockInstance.mockResolvedValueOnce | MethodSignature | test.d.ts:2209 | (value: ResolveType&lt;T&gt;) =&gt; this |
| bun:test.JestMock.MockInstance.mockRejectedValue | MethodSignature | test.d.ts:2210 | (value: RejectType&lt;T&gt;) =&gt; this |
| bun:test.JestMock.MockInstance.mockRejectedValueOnce | MethodSignature | test.d.ts:2211 | (value: RejectType&lt;T&gt;) =&gt; this |
| bun:test.JestMock.MockInstance.[Symbol.dispose] | MethodSignature | test.d.ts:2212 | () =&gt; void |
| bun:test.JestMock.PropertyLikeKeys | TypeAliasDeclaration | test.d.ts:2328 | PropertyLikeKeys&lt;T&gt; |
| bun:test.JestMock.PropertyLikeKeys.T | TypeParameter | test.d.ts:2328 | T |
| bun:test.JestMock.RejectType | TypeAliasDeclaration | test.d.ts:2330 | RejectType&lt;T&gt; |
| bun:test.JestMock.RejectType.T | TypeParameter | test.d.ts:2330 | T |
| bun:test.JestMock.Replaced | InterfaceDeclaration | test.d.ts:2332 | Replaced&lt;T&gt; |
| bun:test.JestMock.Replaced.T | TypeParameter | test.d.ts:2332 | T |
| bun:test.JestMock.Replaced.restore | MethodSignature | test.d.ts:2336 | () =&gt; void |
| bun:test.JestMock.Replaced.replaceValue | MethodSignature | test.d.ts:2340 | (value: T) =&gt; this |
| bun:test.JestMock.replaceProperty | FunctionDeclaration | test.d.ts:2343 | &lt;T extends object, K_2 extends Exclude&lt;keyof T, keyof { [K in keyof T as Required&lt;T&gt;[K] extends ClassLike ? K : never]: T[K]; } &#124; keyof { [K_1 in keyof T as Required&lt;T&gt;[K_1] extends FunctionLike ? K_1 : never]: T[K_1]; }&gt;, V extends T[K_2]&gt;(object: T, propertyKey: K_2, value: V) =&gt; Replaced&lt;...&gt; |
| bun:test.JestMock.replaceProperty.T | TypeParameter | test.d.ts:2344 | T |
| bun:test.JestMock.replaceProperty.K_2 | TypeParameter | test.d.ts:2345 | K_2 |
| bun:test.JestMock.replaceProperty.[MappedType] | MappedType | test.d.ts:2347 | { [K in keyof T as Required&lt;T&gt;[K] extends ClassLike ? K : never]: T[K]; } |
| bun:test.JestMock.replaceProperty.K | TypeParameter | test.d.ts:2348 | K |
| bun:test.JestMock.replaceProperty.[MappedType] | MappedType | test.d.ts:2350 | { [K_1 in keyof T as Required&lt;T&gt;[K_1] extends FunctionLike ? K_1 : never]: T[K_1]; } |
| bun:test.JestMock.replaceProperty.K_1 | TypeParameter | test.d.ts:2351 | K_1 |
| bun:test.JestMock.replaceProperty.V | TypeParameter | test.d.ts:2354 | V |
| bun:test.JestMock.ResolveType | TypeAliasDeclaration | test.d.ts:2357 | ResolveType&lt;T&gt; |
| bun:test.JestMock.ResolveType.T | TypeParameter | test.d.ts:2357 | T |
| bun:test.JestMock.ResolveType.U | TypeParameter | test.d.ts:2357 | U |
| bun:test.JestMock.Spied | TypeAliasDeclaration | test.d.ts:2359 | Spied&lt;T&gt; |
| bun:test.JestMock.Spied.T | TypeParameter | test.d.ts:2359 | T |
| bun:test.JestMock.SpiedClass | TypeAliasDeclaration | test.d.ts:2365 | SpiedClass&lt;T&gt; |
| bun:test.JestMock.SpiedClass.T | TypeParameter | test.d.ts:2365 | T |
| bun:test.JestMock.SpiedClass.[FunctionType] | FunctionType | test.d.ts:2366 | (...args: ConstructorParameters&lt;T&gt;) =&gt; InstanceType&lt;T&gt; |
| bun:test.JestMock.SpiedFunction | TypeAliasDeclaration | test.d.ts:2369 | SpiedFunction&lt;T&gt; |
| bun:test.JestMock.SpiedFunction.T | TypeParameter | test.d.ts:2369 | T |
| bun:test.JestMock.SpiedFunction.[FunctionType] | FunctionType | test.d.ts:2370 | (...args: Parameters&lt;T&gt;) =&gt; ReturnType&lt;T&gt; |
| bun:test.JestMock.SpiedGetter | TypeAliasDeclaration | test.d.ts:2373 | SpiedGetter&lt;T&gt; |
| bun:test.JestMock.SpiedGetter.T | TypeParameter | test.d.ts:2373 | T |
| bun:test.JestMock.SpiedGetter.[FunctionType] | FunctionType | test.d.ts:2373 | () =&gt; T |
| bun:test.JestMock.SpiedSetter | TypeAliasDeclaration | test.d.ts:2375 | SpiedSetter&lt;T&gt; |
| bun:test.JestMock.SpiedSetter.T | TypeParameter | test.d.ts:2375 | T |
| bun:test.JestMock.SpiedSetter.[FunctionType] | FunctionType | test.d.ts:2375 | (arg: T) =&gt; void |
| bun:test.JestMock.SpyInstance | InterfaceDeclaration | test.d.ts:2377 | SpyInstance&lt;T&gt; |
| bun:test.JestMock.SpyInstance.T | TypeParameter | test.d.ts:2377 | T |
| bun:test.JestMock.spyOn | VariableDeclaration | test.d.ts:2379 | { &lt;T extends object, K_2 extends Exclude&lt;keyof T, keyof { [K in keyof T as Required&lt;T&gt;[K] extends ClassLike ? K : never]: T[K]; } &#124; keyof { [K_1 in keyof T as Required&lt;T&gt;[K_1] extends FunctionLike ? K_1 : never]: T[K_1]; }&gt;, V extends Required&lt;T&gt;[K_2], A extends "set" &#124; "get"&gt;(object: T, methodKey: K_2, accessType: ... |
| bun:test.JestMock.[TypeLiteral] | TypeLiteral | test.d.ts:2379 | { &lt;T extends object, K_2 extends Exclude&lt;keyof T, keyof { [K in keyof T as Required&lt;T&gt;[K] extends ClassLike ? K : never]: T[K]; } &#124; keyof { [K_1 in keyof T as Required&lt;T&gt;[K_1] extends FunctionLike ? K_1 : never]: T[K_1]; }&gt;, V extends Required&lt;T&gt;[K_2], A extends "set" &#124; "get"&gt;(object: T, methodKey: K_2, accessType: ... |
| bun:test.JestMock.[call] | CallSignature | test.d.ts:2380 | any |
| bun:test.JestMock.T | TypeParameter | test.d.ts:2381 | T |
| bun:test.JestMock.K_2 | TypeParameter | test.d.ts:2382 | K_2 |
| bun:test.JestMock.[MappedType] | MappedType | test.d.ts:2384 | { [K in keyof T as Required&lt;T&gt;[K] extends ClassLike ? K : never]: T[K]; } |
| bun:test.JestMock.K | TypeParameter | test.d.ts:2385 | K |
| bun:test.JestMock.[MappedType] | MappedType | test.d.ts:2387 | { [K_1 in keyof T as Required&lt;T&gt;[K_1] extends FunctionLike ? K_1 : never]: T[K_1]; } |
| bun:test.JestMock.K_1 | TypeParameter | test.d.ts:2388 | K_1 |
| bun:test.JestMock.V | TypeParameter | test.d.ts:2391 | V |
| bun:test.JestMock.A | TypeParameter | test.d.ts:2392 | A |
| bun:test.JestMock.[call] | CallSignature | test.d.ts:2398 | any |
| bun:test.JestMock.T_1 | TypeParameter | test.d.ts:2399 | T_1 |
| bun:test.JestMock.K_5 | TypeParameter | test.d.ts:2400 | K_5 |
| bun:test.JestMock.[MappedType] | MappedType | test.d.ts:2401 | { [K_3 in keyof T_1 as Required&lt;T_1&gt;[K_3] extends ClassLike ? K_3 : never]: T_1[K_3]; } |
| bun:test.JestMock.K_3 | TypeParameter | test.d.ts:2402 | K_3 |
| bun:test.JestMock.[MappedType] | MappedType | test.d.ts:2404 | { [K_4 in keyof T_1 as Required&lt;T_1&gt;[K_4] extends FunctionLike ? K_4 : never]: T_1[K_4]; } |
| bun:test.JestMock.K_4 | TypeParameter | test.d.ts:2405 | K_4 |
| bun:test.JestMock.V_1 | TypeParameter | test.d.ts:2407 | V_1 |
| bun:test.JestMock.UnknownClass | InterfaceDeclaration | test.d.ts:2414 | UnknownClass |
| bun:test.JestMock.UnknownClass.[construct] | ConstructSignature | test.d.ts:2415 | any |
| bun:test.JestMock.UnknownFunction | TypeAliasDeclaration | test.d.ts:2418 | UnknownFunction |
| bun:test.JestMock.UnknownFunction.[FunctionType] | FunctionType | test.d.ts:2418 | UnknownFunction |
| bun:test.expectTypeOf | VariableDeclaration | test.d.ts:2421 | _ExpectTypeOf |
| DeepBrand | TypeAliasDeclaration | vendor/expect-type/branding.d.ts:222 | DeepBrand&lt;T&gt; |
| DeepBrand.T | TypeParameter | vendor/expect-type/branding.d.ts:222 | T |
| DeepBrand.[TypeLiteral] | TypeLiteral | vendor/expect-type/branding.d.ts:224 | { type: "never"; } |
| DeepBrand.type | PropertySignature | vendor/expect-type/branding.d.ts:225 | "never" |
| DeepBrand.[TypeLiteral] | TypeLiteral | vendor/expect-type/branding.d.ts:228 | { type: "any"; } |
| DeepBrand.type | PropertySignature | vendor/expect-type/branding.d.ts:229 | "any" |
| DeepBrand.[TypeLiteral] | TypeLiteral | vendor/expect-type/branding.d.ts:232 | { type: "unknown"; } |
| DeepBrand.type | PropertySignature | vendor/expect-type/branding.d.ts:233 | "unknown" |
| DeepBrand.[TypeLiteral] | TypeLiteral | vendor/expect-type/branding.d.ts:236 | { type: "primitive"; value: T; } |
| DeepBrand.type | PropertySignature | vendor/expect-type/branding.d.ts:237 | "primitive" |
| DeepBrand.value | PropertySignature | vendor/expect-type/branding.d.ts:238 | T |
| DeepBrand.[ConstructorType] | ConstructorType | vendor/expect-type/branding.d.ts:240 | new (...args: any[]) =&gt; any |
| DeepBrand.[TypeLiteral] | TypeLiteral | vendor/expect-type/branding.d.ts:241 | { type: "constructor"; params: ConstructorOverloadParameters&lt;T&gt;; instance: DeepBrand&lt;InstanceType&lt;Extract&lt;T, new (...args: any) =&gt; any&gt;&gt;&gt;; } |
| DeepBrand.type | PropertySignature | vendor/expect-type/branding.d.ts:242 | "constructor" |
| DeepBrand.params | PropertySignature | vendor/expect-type/branding.d.ts:243 | ConstructorOverloadParameters&lt;T&gt; |
| DeepBrand.instance | PropertySignature | vendor/expect-type/branding.d.ts:244 | DeepBrand&lt;InstanceType&lt;Extract&lt;T, new (...args: any) =&gt; any&gt;&gt;&gt; |
| DeepBrand.instance.[ConstructorType] | ConstructorType | vendor/expect-type/branding.d.ts:244 | new (...args: any) =&gt; any |
| DeepBrand.[FunctionType] | FunctionType | vendor/expect-type/branding.d.ts:246 | (...args: P) =&gt; R |
| DeepBrand.[FunctionType].P | TypeParameter | vendor/expect-type/branding.d.ts:246 | P |
| DeepBrand.[FunctionType].R | TypeParameter | vendor/expect-type/branding.d.ts:246 | R |
| DeepBrand.[TypeLiteral] | TypeLiteral | vendor/expect-type/branding.d.ts:248 | { type: "function"; params: DeepBrand&lt;P&gt;; return: DeepBrand&lt;R&gt;; this: DeepBrand&lt;ThisParameterType&lt;T&gt;&gt;; props: DeepBrand&lt;Omit&lt;T, keyof Function&gt;&gt;; } |
| DeepBrand.type | PropertySignature | vendor/expect-type/branding.d.ts:249 | "function" |
| DeepBrand.params | PropertySignature | vendor/expect-type/branding.d.ts:250 | DeepBrand&lt;P&gt; |
| DeepBrand.return | PropertySignature | vendor/expect-type/branding.d.ts:251 | DeepBrand&lt;R&gt; |
| DeepBrand.this | PropertySignature | vendor/expect-type/branding.d.ts:252 | DeepBrand&lt;ThisParameterType&lt;T&gt;&gt; |
| DeepBrand.props | PropertySignature | vendor/expect-type/branding.d.ts:253 | DeepBrand&lt;Omit&lt;T, keyof Function&gt;&gt; |
| DeepBrand.OverloadsTuple | TypeParameter | vendor/expect-type/branding.d.ts:255 | OverloadsTuple |
| DeepBrand.[TypeLiteral] | TypeLiteral | vendor/expect-type/branding.d.ts:256 | { type: "overloads"; overloads: { [K in keyof OverloadsTuple]: DeepBrand&lt;OverloadsTuple[K]&gt;; }; } |
| DeepBrand.type | PropertySignature | vendor/expect-type/branding.d.ts:257 | "overloads" |
| DeepBrand.overloads | PropertySignature | vendor/expect-type/branding.d.ts:258 | { [K in keyof OverloadsTuple]: DeepBrand&lt;OverloadsTuple[K]&gt;; } |
| DeepBrand.overloads.[MappedType] | MappedType | vendor/expect-type/branding.d.ts:258 | { [K in keyof OverloadsTuple]: DeepBrand&lt;OverloadsTuple[K]&gt;; } |
| DeepBrand.overloads.K | TypeParameter | vendor/expect-type/branding.d.ts:259 | K |
| DeepBrand.[TypeLiteral] | TypeLiteral | vendor/expect-type/branding.d.ts:264 | { type: "array"; items: { [K in keyof T]: T[K]; }; } |
| DeepBrand.type | PropertySignature | vendor/expect-type/branding.d.ts:265 | "array" |
| DeepBrand.items | PropertySignature | vendor/expect-type/branding.d.ts:266 | { [K in keyof T]: T[K]; } |
| DeepBrand.items.[MappedType] | MappedType | vendor/expect-type/branding.d.ts:266 | { [K in keyof T]: T[K]; } |
| DeepBrand.items.K | TypeParameter | vendor/expect-type/branding.d.ts:267 | K |
| DeepBrand.[TypeLiteral] | TypeLiteral | vendor/expect-type/branding.d.ts:270 | { type: "object"; properties: { [K in keyof T]: DeepBrand&lt;T[K]&gt;; }; readonly: ReadonlyKeys&lt;T&gt;; required: RequiredKeys&lt;T&gt;; optional: OptionalKeys&lt;...&gt;; constructorParams: DeepBrand&lt;...&gt;; } |
| DeepBrand.type | PropertySignature | vendor/expect-type/branding.d.ts:271 | "object" |
| DeepBrand.properties | PropertySignature | vendor/expect-type/branding.d.ts:272 | { [K in keyof T]: DeepBrand&lt;T[K]&gt;; } |
| DeepBrand.properties.[MappedType] | MappedType | vendor/expect-type/branding.d.ts:272 | { [K in keyof T]: DeepBrand&lt;T[K]&gt;; } |
| DeepBrand.properties.K | TypeParameter | vendor/expect-type/branding.d.ts:273 | K |
| DeepBrand.readonly | PropertySignature | vendor/expect-type/branding.d.ts:275 | ReadonlyKeys&lt;T&gt; |
| DeepBrand.required | PropertySignature | vendor/expect-type/branding.d.ts:276 | RequiredKeys&lt;T&gt; |
| DeepBrand.optional | PropertySignature | vendor/expect-type/branding.d.ts:277 | OptionalKeys&lt;T&gt; |
| DeepBrand.constructorParams | PropertySignature | vendor/expect-type/branding.d.ts:278 | DeepBrand&lt;ConstructorOverloadParameters&lt;T&gt;&gt; |
| StrictEqualUsingBranding | TypeAliasDeclaration | vendor/expect-type/branding.d.ts:283 | StrictEqualUsingBranding&lt;Left, Right&gt; |
| StrictEqualUsingBranding.Left | TypeParameter | vendor/expect-type/branding.d.ts:283 | Left |
| StrictEqualUsingBranding.Right | TypeParameter | vendor/expect-type/branding.d.ts:283 | Right |
| PositiveExpectTypeOf | InterfaceDeclaration | vendor/expect-type/index.d.ts:238 | PositiveExpectTypeOf&lt;Actual&gt; |
| PositiveExpectTypeOf.Actual | TypeParameter | vendor/expect-type/index.d.ts:238 | Actual |
| PositiveExpectTypeOf.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:241 | { positive: true; branded: false; } |
| PositiveExpectTypeOf.positive | PropertySignature | vendor/expect-type/index.d.ts:242 | true |
| PositiveExpectTypeOf.branded | PropertySignature | vendor/expect-type/index.d.ts:243 | false |
| PositiveExpectTypeOf.toMatchObjectType | PropertySignature | vendor/expect-type/index.d.ts:262 | &lt;Expected extends IsUnion&lt;Expected&gt; extends true ? "toMatchObject does not support union types" : Not&lt;Extends&lt;Expected, Record&lt;string, unknown&gt;&gt;&gt; extends true ? "toMatchObject only supports object types" : StrictEqualUsingTSInternalIdenticalToOperator&lt;DeepPickMatchingProps&lt;Actual, Expected&gt;, Expected&gt; extends true ?... |
| PositiveExpectTypeOf.toMatchObjectType.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:262 | &lt;Expected extends IsUnion&lt;Expected&gt; extends true ? "toMatchObject does not support union types" : Not&lt;Extends&lt;Expected, Record&lt;string, unknown&gt;&gt;&gt; extends true ? "toMatchObject only supports object types" : StrictEqualUsingTSInternalIdenticalToOperator&lt;DeepPickMatchingProps&lt;Actual, Expected&gt;, Expected&gt; extends true ?... |
| PositiveExpectTypeOf.toMatchObjectType.[FunctionType].Expected | TypeParameter | vendor/expect-type/index.d.ts:263 | Expected |
| PositiveExpectTypeOf.toExtend | PropertySignature | vendor/expect-type/index.d.ts:292 | &lt;Expected extends Extends&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(...MISMATCH: MismatchArgs&lt;Extends&lt;Actual, Expected&gt;, true&gt;) =&gt; true |
| PositiveExpectTypeOf.toExtend.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:292 | &lt;Expected extends Extends&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(...MISMATCH: MismatchArgs&lt;Extends&lt;Actual, Expected&gt;, true&gt;) =&gt; true |
| PositiveExpectTypeOf.toExtend.[FunctionType].Expected | TypeParameter | vendor/expect-type/index.d.ts:292 | Expected |
| PositiveExpectTypeOf.toEqualTypeOf | PropertySignature | vendor/expect-type/index.d.ts:295 | { &lt;Expected extends StrictEqualUsingTSInternalIdenticalToOperator&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(value: Expected &amp; AValue, ...MISMATCH: MismatchArgs&lt;...&gt;): true; &lt;Expected extends StrictEqualUsingTSInternalIdenticalToOperator&lt;Actual, Expected&gt; extends true ? unknown : Mism... |
| PositiveExpectTypeOf.toEqualTypeOf.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:295 | { &lt;Expected extends StrictEqualUsingTSInternalIdenticalToOperator&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(value: Expected &amp; AValue, ...MISMATCH: MismatchArgs&lt;...&gt;): true; &lt;Expected extends StrictEqualUsingTSInternalIdenticalToOperator&lt;Actual, Expected&gt; extends true ? unknown : Mism... |
| PositiveExpectTypeOf.toEqualTypeOf.[call] | CallSignature | vendor/expect-type/index.d.ts:328 | any |
| PositiveExpectTypeOf.toEqualTypeOf.Expected | TypeParameter | vendor/expect-type/index.d.ts:329 | Expected |
| PositiveExpectTypeOf.toEqualTypeOf.[call] | CallSignature | vendor/expect-type/index.d.ts:367 | any |
| PositiveExpectTypeOf.toEqualTypeOf.Expected | TypeParameter | vendor/expect-type/index.d.ts:368 | Expected |
| PositiveExpectTypeOf.toMatchTypeOf | PropertySignature | vendor/expect-type/index.d.ts:381 | { &lt;Expected extends Extends&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(value: Expected &amp; AValue, ...MISMATCH: MismatchArgs&lt;Extends&lt;Actual, Expected&gt;, true&gt;): true; &lt;Expected extends Extends&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(...MISMATCH: Mismatc... |
| PositiveExpectTypeOf.toMatchTypeOf.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:381 | { &lt;Expected extends Extends&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(value: Expected &amp; AValue, ...MISMATCH: MismatchArgs&lt;Extends&lt;Actual, Expected&gt;, true&gt;): true; &lt;Expected extends Extends&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(...MISMATCH: Mismatc... |
| PositiveExpectTypeOf.toMatchTypeOf.[call] | CallSignature | vendor/expect-type/index.d.ts:409 | any |
| PositiveExpectTypeOf.toMatchTypeOf.Expected | TypeParameter | vendor/expect-type/index.d.ts:409 | Expected |
| PositiveExpectTypeOf.toMatchTypeOf.[call] | CallSignature | vendor/expect-type/index.d.ts:439 | any |
| PositiveExpectTypeOf.toMatchTypeOf.Expected | TypeParameter | vendor/expect-type/index.d.ts:439 | Expected |
| PositiveExpectTypeOf.toHaveProperty | PropertySignature | vendor/expect-type/index.d.ts:460 | &lt;KeyType extends keyof Actual&gt;(key: KeyType, ...MISMATCH: MismatchArgs&lt;Extends&lt;KeyType, keyof Actual&gt;, true&gt;) =&gt; KeyType extends keyof Actual ? PositiveExpectTypeOf&lt;...&gt; : true |
| PositiveExpectTypeOf.toHaveProperty.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:460 | &lt;KeyType extends keyof Actual&gt;(key: KeyType, ...MISMATCH: MismatchArgs&lt;Extends&lt;KeyType, keyof Actual&gt;, true&gt;) =&gt; KeyType extends keyof Actual ? PositiveExpectTypeOf&lt;...&gt; : true |
| PositiveExpectTypeOf.toHaveProperty.[FunctionType].KeyType | TypeParameter | vendor/expect-type/index.d.ts:460 | KeyType |
| PositiveExpectTypeOf.not | PropertySignature | vendor/expect-type/index.d.ts:472 | NegativeExpectTypeOf&lt;Actual&gt; |
| PositiveExpectTypeOf.branded | PropertySignature | vendor/expect-type/index.d.ts:488 | { toEqualTypeOf: &lt;Expected extends StrictEqualUsingBranding&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(...MISMATCH: MismatchArgs&lt;StrictEqualUsingBranding&lt;Actual, Expected&gt;, true&gt;) =&gt; true; } |
| PositiveExpectTypeOf.branded.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:488 | { toEqualTypeOf: &lt;Expected extends StrictEqualUsingBranding&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(...MISMATCH: MismatchArgs&lt;StrictEqualUsingBranding&lt;Actual, Expected&gt;, true&gt;) =&gt; true; } |
| PositiveExpectTypeOf.branded.toEqualTypeOf | PropertySignature | vendor/expect-type/index.d.ts:520 | &lt;Expected extends StrictEqualUsingBranding&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(...MISMATCH: MismatchArgs&lt;StrictEqualUsingBranding&lt;Actual, Expected&gt;, true&gt;) =&gt; true |
| PositiveExpectTypeOf.branded.toEqualTypeOf.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:520 | &lt;Expected extends StrictEqualUsingBranding&lt;Actual, Expected&gt; extends true ? unknown : MismatchInfo&lt;Actual, Expected&gt;&gt;(...MISMATCH: MismatchArgs&lt;StrictEqualUsingBranding&lt;Actual, Expected&gt;, true&gt;) =&gt; true |
| PositiveExpectTypeOf.branded.toEqualTypeOf.[FunctionType].Expected | TypeParameter | vendor/expect-type/index.d.ts:521 | Expected |
| NegativeExpectTypeOf | InterfaceDeclaration | vendor/expect-type/index.d.ts:532 | NegativeExpectTypeOf&lt;Actual&gt; |
| NegativeExpectTypeOf.Actual | TypeParameter | vendor/expect-type/index.d.ts:532 | Actual |
| NegativeExpectTypeOf.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:535 | { positive: false; } |
| NegativeExpectTypeOf.positive | PropertySignature | vendor/expect-type/index.d.ts:536 | false |
| NegativeExpectTypeOf.toMatchObjectType | PropertySignature | vendor/expect-type/index.d.ts:555 | &lt;Expected&gt;(...MISMATCH: MismatchArgs&lt;StrictEqualUsingTSInternalIdenticalToOperator&lt;Pick&lt;Actual, keyof Actual &amp; keyof Expected&gt;, Expected&gt;, false&gt;) =&gt; true |
| NegativeExpectTypeOf.toMatchObjectType.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:555 | &lt;Expected&gt;(...MISMATCH: MismatchArgs&lt;StrictEqualUsingTSInternalIdenticalToOperator&lt;Pick&lt;Actual, keyof Actual &amp; keyof Expected&gt;, Expected&gt;, false&gt;) =&gt; true |
| NegativeExpectTypeOf.toMatchObjectType.[FunctionType].Expected | TypeParameter | vendor/expect-type/index.d.ts:555 | Expected |
| NegativeExpectTypeOf.toExtend | MethodSignature | vendor/expect-type/index.d.ts:577 | &lt;Expected&gt;(...MISMATCH: MismatchArgs&lt;Extends&lt;Actual, Expected&gt;, false&gt;) =&gt; true |
| NegativeExpectTypeOf.toExtend.Expected | TypeParameter | vendor/expect-type/index.d.ts:577 | Expected |
| NegativeExpectTypeOf.toEqualTypeOf | PropertySignature | vendor/expect-type/index.d.ts:578 | { &lt;Expected&gt;(value: Expected &amp; AValue, ...MISMATCH: MismatchArgs&lt;StrictEqualUsingTSInternalIdenticalToOperator&lt;Actual, Expected&gt;, false&gt;): true; &lt;Expected&gt;(...MISMATCH: MismatchArgs&lt;...&gt;): true; } |
| NegativeExpectTypeOf.toEqualTypeOf.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:578 | { &lt;Expected&gt;(value: Expected &amp; AValue, ...MISMATCH: MismatchArgs&lt;StrictEqualUsingTSInternalIdenticalToOperator&lt;Actual, Expected&gt;, false&gt;): true; &lt;Expected&gt;(...MISMATCH: MismatchArgs&lt;...&gt;): true; } |
| NegativeExpectTypeOf.toEqualTypeOf.[call] | CallSignature | vendor/expect-type/index.d.ts:611 | any |
| NegativeExpectTypeOf.toEqualTypeOf.Expected | TypeParameter | vendor/expect-type/index.d.ts:611 | Expected |
| NegativeExpectTypeOf.toEqualTypeOf.[call] | CallSignature | vendor/expect-type/index.d.ts:646 | any |
| NegativeExpectTypeOf.toEqualTypeOf.Expected | TypeParameter | vendor/expect-type/index.d.ts:646 | Expected |
| NegativeExpectTypeOf.toMatchTypeOf | PropertySignature | vendor/expect-type/index.d.ts:654 | { &lt;Expected&gt;(value: Expected &amp; AValue, ...MISMATCH: MismatchArgs&lt;Extends&lt;Actual, Expected&gt;, false&gt;): true; &lt;Expected&gt;(...MISMATCH: MismatchArgs&lt;Extends&lt;Actual, Expected&gt;, false&gt;): true; } |
| NegativeExpectTypeOf.toMatchTypeOf.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:654 | { &lt;Expected&gt;(value: Expected &amp; AValue, ...MISMATCH: MismatchArgs&lt;Extends&lt;Actual, Expected&gt;, false&gt;): true; &lt;Expected&gt;(...MISMATCH: MismatchArgs&lt;Extends&lt;Actual, Expected&gt;, false&gt;): true; } |
| NegativeExpectTypeOf.toMatchTypeOf.[call] | CallSignature | vendor/expect-type/index.d.ts:683 | any |
| NegativeExpectTypeOf.toMatchTypeOf.Expected | TypeParameter | vendor/expect-type/index.d.ts:683 | Expected |
| NegativeExpectTypeOf.toMatchTypeOf.[call] | CallSignature | vendor/expect-type/index.d.ts:714 | any |
| NegativeExpectTypeOf.toMatchTypeOf.Expected | TypeParameter | vendor/expect-type/index.d.ts:714 | Expected |
| NegativeExpectTypeOf.toHaveProperty | PropertySignature | vendor/expect-type/index.d.ts:733 | &lt;KeyType extends string &#124; number &#124; symbol&gt;(key: KeyType, ...MISMATCH: MismatchArgs&lt;Extends&lt;KeyType, keyof Actual&gt;, false&gt;) =&gt; true |
| NegativeExpectTypeOf.toHaveProperty.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:733 | &lt;KeyType extends string &#124; number &#124; symbol&gt;(key: KeyType, ...MISMATCH: MismatchArgs&lt;Extends&lt;KeyType, keyof Actual&gt;, false&gt;) =&gt; true |
| NegativeExpectTypeOf.toHaveProperty.[FunctionType].KeyType | TypeParameter | vendor/expect-type/index.d.ts:733 | KeyType |
| ExpectTypeOf | TypeAliasDeclaration | vendor/expect-type/index.d.ts:743 | ExpectTypeOf&lt;Actual, Options&gt; |
| ExpectTypeOf.Actual | TypeParameter | vendor/expect-type/index.d.ts:744 | Actual |
| ExpectTypeOf.Options | TypeParameter | vendor/expect-type/index.d.ts:745 | Options |
| ExpectTypeOf.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:745 | { positive: boolean; } |
| ExpectTypeOf.positive | PropertySignature | vendor/expect-type/index.d.ts:746 | boolean |
| BaseExpectTypeOf | InterfaceDeclaration | vendor/expect-type/index.d.ts:754 | BaseExpectTypeOf&lt;Actual, Options&gt; |
| BaseExpectTypeOf.Actual | TypeParameter | vendor/expect-type/index.d.ts:755 | Actual |
| BaseExpectTypeOf.Options | TypeParameter | vendor/expect-type/index.d.ts:756 | Options |
| BaseExpectTypeOf.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:756 | { positive: boolean; } |
| BaseExpectTypeOf.positive | PropertySignature | vendor/expect-type/index.d.ts:757 | boolean |
| BaseExpectTypeOf.toBeAny | PropertySignature | vendor/expect-type/index.d.ts:763 | Scolder&lt;ExpectAny&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeUnknown | PropertySignature | vendor/expect-type/index.d.ts:767 | Scolder&lt;ExpectUnknown&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeNever | PropertySignature | vendor/expect-type/index.d.ts:771 | Scolder&lt;ExpectNever&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeFunction | PropertySignature | vendor/expect-type/index.d.ts:775 | Scolder&lt;ExpectFunction&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeObject | PropertySignature | vendor/expect-type/index.d.ts:779 | Scolder&lt;ExpectObject&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeArray | PropertySignature | vendor/expect-type/index.d.ts:783 | Scolder&lt;ExpectArray&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeNumber | PropertySignature | vendor/expect-type/index.d.ts:787 | Scolder&lt;ExpectNumber&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeString | PropertySignature | vendor/expect-type/index.d.ts:791 | Scolder&lt;ExpectString&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeBoolean | PropertySignature | vendor/expect-type/index.d.ts:795 | Scolder&lt;ExpectBoolean&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeVoid | PropertySignature | vendor/expect-type/index.d.ts:799 | Scolder&lt;ExpectVoid&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeSymbol | PropertySignature | vendor/expect-type/index.d.ts:803 | Scolder&lt;ExpectSymbol&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeNull | PropertySignature | vendor/expect-type/index.d.ts:807 | Scolder&lt;ExpectNull&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeUndefined | PropertySignature | vendor/expect-type/index.d.ts:811 | Scolder&lt;ExpectUndefined&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeNullable | PropertySignature | vendor/expect-type/index.d.ts:815 | Scolder&lt;ExpectNullable&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.map | PropertySignature | vendor/expect-type/index.d.ts:822 | &lt;T&gt;(fn: (value: Actual) =&gt; T) =&gt; ExpectTypeOf&lt;T, Options&gt; |
| BaseExpectTypeOf.map.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:822 | &lt;T&gt;(fn: (value: Actual) =&gt; T) =&gt; ExpectTypeOf&lt;T, Options&gt; |
| BaseExpectTypeOf.map.[FunctionType].T | TypeParameter | vendor/expect-type/index.d.ts:822 | T |
| BaseExpectTypeOf.map.[FunctionType].[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:822 | (value: Actual) =&gt; T |
| BaseExpectTypeOf.toBeBigInt | PropertySignature | vendor/expect-type/index.d.ts:841 | Scolder&lt;ExpectBigInt&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.toBeCallableWith | PropertySignature | vendor/expect-type/index.d.ts:863 | Options["positive"] extends true ? &lt;Args extends OverloadParameters&lt;Actual&gt;&gt;(...args: Args) =&gt; ExpectTypeOf&lt;OverloadsNarrowedByParameters&lt;Actual, Args&gt;, Options&gt; : never |
| BaseExpectTypeOf.toBeCallableWith.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:864 | &lt;Args extends OverloadParameters&lt;Actual&gt;&gt;(...args: Args) =&gt; ExpectTypeOf&lt;OverloadsNarrowedByParameters&lt;Actual, Args&gt;, Options&gt; |
| BaseExpectTypeOf.toBeCallableWith.[FunctionType].Args | TypeParameter | vendor/expect-type/index.d.ts:864 | Args |
| BaseExpectTypeOf.toBeConstructibleWith | PropertySignature | vendor/expect-type/index.d.ts:885 | Options["positive"] extends true ? &lt;Args extends ConstructorOverloadParameters&lt;Actual&gt;&gt;(...args: Args) =&gt; true : never |
| BaseExpectTypeOf.toBeConstructibleWith.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:886 | &lt;Args extends ConstructorOverloadParameters&lt;Actual&gt;&gt;(...args: Args) =&gt; true |
| BaseExpectTypeOf.toBeConstructibleWith.[FunctionType].Args | TypeParameter | vendor/expect-type/index.d.ts:886 | Args |
| BaseExpectTypeOf.extract | PropertySignature | vendor/expect-type/index.d.ts:925 | &lt;V&gt;(v?: V &#124; undefined) =&gt; ExpectTypeOf&lt;Extract&lt;Actual, V&gt;, Options&gt; |
| BaseExpectTypeOf.extract.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:925 | &lt;V&gt;(v?: V &#124; undefined) =&gt; ExpectTypeOf&lt;Extract&lt;Actual, V&gt;, Options&gt; |
| BaseExpectTypeOf.extract.[FunctionType].V | TypeParameter | vendor/expect-type/index.d.ts:925 | V |
| BaseExpectTypeOf.exclude | PropertySignature | vendor/expect-type/index.d.ts:951 | &lt;V&gt;(v?: V &#124; undefined) =&gt; ExpectTypeOf&lt;Exclude&lt;Actual, V&gt;, Options&gt; |
| BaseExpectTypeOf.exclude.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:951 | &lt;V&gt;(v?: V &#124; undefined) =&gt; ExpectTypeOf&lt;Exclude&lt;Actual, V&gt;, Options&gt; |
| BaseExpectTypeOf.exclude.[FunctionType].V | TypeParameter | vendor/expect-type/index.d.ts:951 | V |
| BaseExpectTypeOf.pick | PropertySignature | vendor/expect-type/index.d.ts:971 | &lt;KeyToPick extends keyof Actual&gt;(keyToPick?: KeyToPick &#124; undefined) =&gt; ExpectTypeOf&lt;Pick&lt;Actual, KeyToPick&gt;, Options&gt; |
| BaseExpectTypeOf.pick.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:971 | &lt;KeyToPick extends keyof Actual&gt;(keyToPick?: KeyToPick &#124; undefined) =&gt; ExpectTypeOf&lt;Pick&lt;Actual, KeyToPick&gt;, Options&gt; |
| BaseExpectTypeOf.pick.[FunctionType].KeyToPick | TypeParameter | vendor/expect-type/index.d.ts:971 | KeyToPick |
| BaseExpectTypeOf.omit | PropertySignature | vendor/expect-type/index.d.ts:989 | &lt;KeyToOmit extends keyof Actual &#124; (PropertyKey &amp; Record&lt;never, never&gt;)&gt;(keyToOmit?: KeyToOmit &#124; undefined) =&gt; ExpectTypeOf&lt;Omit&lt;Actual, KeyToOmit&gt;, Options&gt; |
| BaseExpectTypeOf.omit.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:989 | &lt;KeyToOmit extends keyof Actual &#124; (PropertyKey &amp; Record&lt;never, never&gt;)&gt;(keyToOmit?: KeyToOmit &#124; undefined) =&gt; ExpectTypeOf&lt;Omit&lt;Actual, KeyToOmit&gt;, Options&gt; |
| BaseExpectTypeOf.omit.[FunctionType].KeyToOmit | TypeParameter | vendor/expect-type/index.d.ts:989 | KeyToOmit |
| BaseExpectTypeOf.parameter | PropertySignature | vendor/expect-type/index.d.ts:1010 | &lt;Index extends number&gt;(index: Index) =&gt; ExpectTypeOf&lt;OverloadParameters&lt;Actual&gt;[Index], Options&gt; |
| BaseExpectTypeOf.parameter.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:1010 | &lt;Index extends number&gt;(index: Index) =&gt; ExpectTypeOf&lt;OverloadParameters&lt;Actual&gt;[Index], Options&gt; |
| BaseExpectTypeOf.parameter.[FunctionType].Index | TypeParameter | vendor/expect-type/index.d.ts:1010 | Index |
| BaseExpectTypeOf.parameters | PropertySignature | vendor/expect-type/index.d.ts:1027 | ExpectTypeOf&lt;OverloadParameters&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.constructorParameters | PropertySignature | vendor/expect-type/index.d.ts:1042 | ExpectTypeOf&lt;ConstructorOverloadParameters&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.thisParameter | PropertySignature | vendor/expect-type/index.d.ts:1057 | ExpectTypeOf&lt;ThisParameterType&lt;Actual&gt;, Options&gt; |
| BaseExpectTypeOf.instance | PropertySignature | vendor/expect-type/index.d.ts:1067 | Actual extends new (...args: any[]) =&gt; infer I ? ExpectTypeOf&lt;I, Options&gt; : never |
| BaseExpectTypeOf.instance.[ConstructorType] | ConstructorType | vendor/expect-type/index.d.ts:1067 | new (...args: any[]) =&gt; I |
| BaseExpectTypeOf.instance.[ConstructorType].I | TypeParameter | vendor/expect-type/index.d.ts:1067 | I |
| BaseExpectTypeOf.returns | PropertySignature | vendor/expect-type/index.d.ts:1079 | Actual extends Function ? ExpectTypeOf&lt;OverloadReturnTypes&lt;Actual&gt;, Options&gt; : never |
| BaseExpectTypeOf.resolves | PropertySignature | vendor/expect-type/index.d.ts:1102 | Actual extends PromiseLike&lt;infer ResolvedType&gt; ? ExpectTypeOf&lt;ResolvedType, Options&gt; : never |
| BaseExpectTypeOf.resolves.ResolvedType | TypeParameter | vendor/expect-type/index.d.ts:1102 | ResolvedType |
| BaseExpectTypeOf.items | PropertySignature | vendor/expect-type/index.d.ts:1120 | Actual extends ArrayLike&lt;infer ItemType&gt; ? ExpectTypeOf&lt;ItemType, Options&gt; : never |
| BaseExpectTypeOf.items.ItemType | TypeParameter | vendor/expect-type/index.d.ts:1120 | ItemType |
| BaseExpectTypeOf.guards | PropertySignature | vendor/expect-type/index.d.ts:1133 | Actual extends (v: any, ...args: any[]) =&gt; v is infer T ? ExpectTypeOf&lt;T, Options&gt; : never |
| BaseExpectTypeOf.guards.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:1133 | (v: any, ...args: any[]) =&gt; v is T |
| BaseExpectTypeOf.guards.[FunctionType].T | TypeParameter | vendor/expect-type/index.d.ts:1133 | T |
| BaseExpectTypeOf.asserts | PropertySignature | vendor/expect-type/index.d.ts:1147 | Actual extends (v: any, ...args: any[]) =&gt; asserts v is infer T ? unknown extends T ? never : ExpectTypeOf&lt;T, Options&gt; : never |
| BaseExpectTypeOf.asserts.[FunctionType] | FunctionType | vendor/expect-type/index.d.ts:1147 | (v: any, ...args: any[]) =&gt; asserts v is T |
| BaseExpectTypeOf.asserts.[FunctionType].T | TypeParameter | vendor/expect-type/index.d.ts:1147 | T |
| _ExpectTypeOf | TypeAliasDeclaration | vendor/expect-type/index.d.ts:1156 | _ExpectTypeOf |
| _ExpectTypeOf.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:1156 | _ExpectTypeOf |
| _ExpectTypeOf.[call] | CallSignature | vendor/expect-type/index.d.ts:1163 | any |
| _ExpectTypeOf.Actual | TypeParameter | vendor/expect-type/index.d.ts:1163 | Actual |
| _ExpectTypeOf.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:1165 | { positive: true; branded: false; } |
| _ExpectTypeOf.positive | PropertySignature | vendor/expect-type/index.d.ts:1166 | true |
| _ExpectTypeOf.branded | PropertySignature | vendor/expect-type/index.d.ts:1167 | false |
| _ExpectTypeOf.[call] | CallSignature | vendor/expect-type/index.d.ts:1175 | any |
| _ExpectTypeOf.Actual | TypeParameter | vendor/expect-type/index.d.ts:1175 | Actual |
| _ExpectTypeOf.[TypeLiteral] | TypeLiteral | vendor/expect-type/index.d.ts:1177 | { positive: true; branded: false; } |
| _ExpectTypeOf.positive | PropertySignature | vendor/expect-type/index.d.ts:1178 | true |
| _ExpectTypeOf.branded | PropertySignature | vendor/expect-type/index.d.ts:1179 | false |
| expectTypeOf | VariableDeclaration | vendor/expect-type/index.d.ts:1207 | _ExpectTypeOf |
| PrintType | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:200 | PrintType&lt;T&gt; |
| PrintType.T | TypeParameter | vendor/expect-type/messages.d.ts:200 | T |
| PrintType.[FunctionType] | FunctionType | vendor/expect-type/messages.d.ts:227 | (...args: any[]) =&gt; any |
| MismatchInfo | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:236 | MismatchInfo&lt;Actual, Expected&gt; |
| MismatchInfo.Actual | TypeParameter | vendor/expect-type/messages.d.ts:236 | Actual |
| MismatchInfo.Expected | TypeParameter | vendor/expect-type/messages.d.ts:236 | Expected |
| MismatchInfo.[MappedType] | MappedType | vendor/expect-type/messages.d.ts:240 | { [K in UsefulKeys&lt;Actual&gt; &#124; UsefulKeys&lt;Expected&gt;]: MismatchInfo&lt;...&gt;; } |
| MismatchInfo.K | TypeParameter | vendor/expect-type/messages.d.ts:241 | K |
| inverted | VariableDeclaration | vendor/expect-type/messages.d.ts:252 | unique symbol |
| Inverted | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:256 | Inverted&lt;T&gt; |
| Inverted.T | TypeParameter | vendor/expect-type/messages.d.ts:256 | T |
| Inverted.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:256 | Inverted&lt;T&gt; |
| Inverted.[inverted] | PropertySignature | vendor/expect-type/messages.d.ts:257 | T |
| expectNull | VariableDeclaration | vendor/expect-type/messages.d.ts:262 | unique symbol |
| ExpectNull | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:263 | ExpectNull&lt;T&gt; |
| ExpectNull.T | TypeParameter | vendor/expect-type/messages.d.ts:263 | T |
| ExpectNull.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:263 | ExpectNull&lt;T&gt; |
| ExpectNull.[expectNull] | PropertySignature | vendor/expect-type/messages.d.ts:264 | T |
| ExpectNull.result | PropertySignature | vendor/expect-type/messages.d.ts:265 | ExtendsExcludingAnyOrNever&lt;T, null&gt; |
| expectUndefined | VariableDeclaration | vendor/expect-type/messages.d.ts:270 | unique symbol |
| ExpectUndefined | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:271 | ExpectUndefined&lt;T&gt; |
| ExpectUndefined.T | TypeParameter | vendor/expect-type/messages.d.ts:271 | T |
| ExpectUndefined.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:271 | ExpectUndefined&lt;T&gt; |
| ExpectUndefined.[expectUndefined] | PropertySignature | vendor/expect-type/messages.d.ts:272 | T |
| ExpectUndefined.result | PropertySignature | vendor/expect-type/messages.d.ts:273 | ExtendsExcludingAnyOrNever&lt;T, undefined&gt; |
| expectNumber | VariableDeclaration | vendor/expect-type/messages.d.ts:278 | unique symbol |
| ExpectNumber | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:279 | ExpectNumber&lt;T&gt; |
| ExpectNumber.T | TypeParameter | vendor/expect-type/messages.d.ts:279 | T |
| ExpectNumber.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:279 | ExpectNumber&lt;T&gt; |
| ExpectNumber.[expectNumber] | PropertySignature | vendor/expect-type/messages.d.ts:280 | T |
| ExpectNumber.result | PropertySignature | vendor/expect-type/messages.d.ts:281 | ExtendsExcludingAnyOrNever&lt;T, number&gt; |
| expectString | VariableDeclaration | vendor/expect-type/messages.d.ts:286 | unique symbol |
| ExpectString | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:287 | ExpectString&lt;T&gt; |
| ExpectString.T | TypeParameter | vendor/expect-type/messages.d.ts:287 | T |
| ExpectString.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:287 | ExpectString&lt;T&gt; |
| ExpectString.[expectString] | PropertySignature | vendor/expect-type/messages.d.ts:288 | T |
| ExpectString.result | PropertySignature | vendor/expect-type/messages.d.ts:289 | ExtendsExcludingAnyOrNever&lt;T, string&gt; |
| expectBoolean | VariableDeclaration | vendor/expect-type/messages.d.ts:294 | unique symbol |
| ExpectBoolean | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:295 | ExpectBoolean&lt;T&gt; |
| ExpectBoolean.T | TypeParameter | vendor/expect-type/messages.d.ts:295 | T |
| ExpectBoolean.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:295 | ExpectBoolean&lt;T&gt; |
| ExpectBoolean.[expectBoolean] | PropertySignature | vendor/expect-type/messages.d.ts:296 | T |
| ExpectBoolean.result | PropertySignature | vendor/expect-type/messages.d.ts:297 | ExtendsExcludingAnyOrNever&lt;T, boolean&gt; |
| expectVoid | VariableDeclaration | vendor/expect-type/messages.d.ts:302 | unique symbol |
| ExpectVoid | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:303 | ExpectVoid&lt;T&gt; |
| ExpectVoid.T | TypeParameter | vendor/expect-type/messages.d.ts:303 | T |
| ExpectVoid.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:303 | ExpectVoid&lt;T&gt; |
| ExpectVoid.[expectVoid] | PropertySignature | vendor/expect-type/messages.d.ts:304 | T |
| ExpectVoid.result | PropertySignature | vendor/expect-type/messages.d.ts:305 | ExtendsExcludingAnyOrNever&lt;T, void&gt; |
| expectFunction | VariableDeclaration | vendor/expect-type/messages.d.ts:310 | unique symbol |
| ExpectFunction | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:311 | ExpectFunction&lt;T&gt; |
| ExpectFunction.T | TypeParameter | vendor/expect-type/messages.d.ts:311 | T |
| ExpectFunction.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:311 | ExpectFunction&lt;T&gt; |
| ExpectFunction.[expectFunction] | PropertySignature | vendor/expect-type/messages.d.ts:312 | T |
| ExpectFunction.result | PropertySignature | vendor/expect-type/messages.d.ts:313 | ExtendsExcludingAnyOrNever&lt;T, (...args: any[]) =&gt; any&gt; |
| ExpectFunction.result.[FunctionType] | FunctionType | vendor/expect-type/messages.d.ts:313 | (...args: any[]) =&gt; any |
| expectObject | VariableDeclaration | vendor/expect-type/messages.d.ts:318 | unique symbol |
| ExpectObject | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:319 | ExpectObject&lt;T&gt; |
| ExpectObject.T | TypeParameter | vendor/expect-type/messages.d.ts:319 | T |
| ExpectObject.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:319 | ExpectObject&lt;T&gt; |
| ExpectObject.[expectObject] | PropertySignature | vendor/expect-type/messages.d.ts:320 | T |
| ExpectObject.result | PropertySignature | vendor/expect-type/messages.d.ts:321 | ExtendsExcludingAnyOrNever&lt;T, object&gt; |
| expectArray | VariableDeclaration | vendor/expect-type/messages.d.ts:326 | unique symbol |
| ExpectArray | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:327 | ExpectArray&lt;T&gt; |
| ExpectArray.T | TypeParameter | vendor/expect-type/messages.d.ts:327 | T |
| ExpectArray.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:327 | ExpectArray&lt;T&gt; |
| ExpectArray.[expectArray] | PropertySignature | vendor/expect-type/messages.d.ts:328 | T |
| ExpectArray.result | PropertySignature | vendor/expect-type/messages.d.ts:329 | ExtendsExcludingAnyOrNever&lt;T, any[]&gt; |
| expectSymbol | VariableDeclaration | vendor/expect-type/messages.d.ts:334 | unique symbol |
| ExpectSymbol | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:335 | ExpectSymbol&lt;T&gt; |
| ExpectSymbol.T | TypeParameter | vendor/expect-type/messages.d.ts:335 | T |
| ExpectSymbol.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:335 | ExpectSymbol&lt;T&gt; |
| ExpectSymbol.[expectSymbol] | PropertySignature | vendor/expect-type/messages.d.ts:336 | T |
| ExpectSymbol.result | PropertySignature | vendor/expect-type/messages.d.ts:337 | ExtendsExcludingAnyOrNever&lt;T, symbol&gt; |
| expectAny | VariableDeclaration | vendor/expect-type/messages.d.ts:342 | unique symbol |
| ExpectAny | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:343 | ExpectAny&lt;T&gt; |
| ExpectAny.T | TypeParameter | vendor/expect-type/messages.d.ts:343 | T |
| ExpectAny.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:343 | ExpectAny&lt;T&gt; |
| ExpectAny.[expectAny] | PropertySignature | vendor/expect-type/messages.d.ts:344 | T |
| ExpectAny.result | PropertySignature | vendor/expect-type/messages.d.ts:345 | IsAny&lt;T&gt; |
| expectUnknown | VariableDeclaration | vendor/expect-type/messages.d.ts:350 | unique symbol |
| ExpectUnknown | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:351 | ExpectUnknown&lt;T&gt; |
| ExpectUnknown.T | TypeParameter | vendor/expect-type/messages.d.ts:351 | T |
| ExpectUnknown.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:351 | ExpectUnknown&lt;T&gt; |
| ExpectUnknown.[expectUnknown] | PropertySignature | vendor/expect-type/messages.d.ts:352 | T |
| ExpectUnknown.result | PropertySignature | vendor/expect-type/messages.d.ts:353 | IsUnknown&lt;T&gt; |
| expectNever | VariableDeclaration | vendor/expect-type/messages.d.ts:358 | unique symbol |
| ExpectNever | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:359 | ExpectNever&lt;T&gt; |
| ExpectNever.T | TypeParameter | vendor/expect-type/messages.d.ts:359 | T |
| ExpectNever.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:359 | ExpectNever&lt;T&gt; |
| ExpectNever.[expectNever] | PropertySignature | vendor/expect-type/messages.d.ts:360 | T |
| ExpectNever.result | PropertySignature | vendor/expect-type/messages.d.ts:361 | IsNever&lt;T&gt; |
| expectNullable | VariableDeclaration | vendor/expect-type/messages.d.ts:366 | unique symbol |
| ExpectNullable | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:367 | ExpectNullable&lt;T&gt; |
| ExpectNullable.T | TypeParameter | vendor/expect-type/messages.d.ts:367 | T |
| ExpectNullable.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:367 | ExpectNullable&lt;T&gt; |
| ExpectNullable.[expectNullable] | PropertySignature | vendor/expect-type/messages.d.ts:368 | T |
| ExpectNullable.result | PropertySignature | vendor/expect-type/messages.d.ts:369 | Not&lt;StrictEqualUsingBranding&lt;T, NonNullable&lt;T&gt;&gt;&gt; |
| expectBigInt | VariableDeclaration | vendor/expect-type/messages.d.ts:374 | unique symbol |
| ExpectBigInt | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:375 | ExpectBigInt&lt;T&gt; |
| ExpectBigInt.T | TypeParameter | vendor/expect-type/messages.d.ts:375 | T |
| ExpectBigInt.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:375 | ExpectBigInt&lt;T&gt; |
| ExpectBigInt.[expectBigInt] | PropertySignature | vendor/expect-type/messages.d.ts:376 | T |
| ExpectBigInt.result | PropertySignature | vendor/expect-type/messages.d.ts:377 | ExtendsExcludingAnyOrNever&lt;T, bigint&gt; |
| Scolder | TypeAliasDeclaration | vendor/expect-type/messages.d.ts:383 | Scolder&lt;Expecter, Options&gt; |
| Scolder.Expecter | TypeParameter | vendor/expect-type/messages.d.ts:384 | Expecter |
| Scolder.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:384 | { result: boolean; } |
| Scolder.result | PropertySignature | vendor/expect-type/messages.d.ts:385 | boolean |
| Scolder.Options | TypeParameter | vendor/expect-type/messages.d.ts:387 | Options |
| Scolder.[TypeLiteral] | TypeLiteral | vendor/expect-type/messages.d.ts:387 | { positive: boolean; } |
| Scolder.positive | PropertySignature | vendor/expect-type/messages.d.ts:388 | boolean |
| Scolder.[FunctionType] | FunctionType | vendor/expect-type/messages.d.ts:391 | () =&gt; true |
| TSPost53OverloadsInfoUnion | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:211 | TSPost53OverloadsInfoUnion&lt;FunctionType&gt; |
| TSPost53OverloadsInfoUnion.FunctionType | TypeParameter | vendor/expect-type/overloads.d.ts:211 | FunctionType |
| TSPost53OverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:211 | { (...args: A1): R1; (...args: A2): R2; (...args: A3): R3; (...args: A4): R4; (...args: A5): R5; (...args: A6): R6; (...args: A7): R7; (...args: A8): R8; (...args: A9): R9; (...args: A10): R10; } |
| TSPost53OverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:212 | any |
| TSPost53OverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:212 | A1 |
| TSPost53OverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:212 | R1 |
| TSPost53OverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:213 | any |
| TSPost53OverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:213 | A2 |
| TSPost53OverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:213 | R2 |
| TSPost53OverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:214 | any |
| TSPost53OverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:214 | A3 |
| TSPost53OverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:214 | R3 |
| TSPost53OverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:215 | any |
| TSPost53OverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:215 | A4 |
| TSPost53OverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:215 | R4 |
| TSPost53OverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:216 | any |
| TSPost53OverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:216 | A5 |
| TSPost53OverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:216 | R5 |
| TSPost53OverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:217 | any |
| TSPost53OverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:217 | A6 |
| TSPost53OverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:217 | R6 |
| TSPost53OverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:218 | any |
| TSPost53OverloadsInfoUnion.A7 | TypeParameter | vendor/expect-type/overloads.d.ts:218 | A7 |
| TSPost53OverloadsInfoUnion.R7 | TypeParameter | vendor/expect-type/overloads.d.ts:218 | R7 |
| TSPost53OverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:219 | any |
| TSPost53OverloadsInfoUnion.A8 | TypeParameter | vendor/expect-type/overloads.d.ts:219 | A8 |
| TSPost53OverloadsInfoUnion.R8 | TypeParameter | vendor/expect-type/overloads.d.ts:219 | R8 |
| TSPost53OverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:220 | any |
| TSPost53OverloadsInfoUnion.A9 | TypeParameter | vendor/expect-type/overloads.d.ts:220 | A9 |
| TSPost53OverloadsInfoUnion.R9 | TypeParameter | vendor/expect-type/overloads.d.ts:220 | R9 |
| TSPost53OverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:221 | any |
| TSPost53OverloadsInfoUnion.A10 | TypeParameter | vendor/expect-type/overloads.d.ts:221 | A10 |
| TSPost53OverloadsInfoUnion.R10 | TypeParameter | vendor/expect-type/overloads.d.ts:221 | R10 |
| TSPost53OverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:224 | (...p: A1) =&gt; R1 |
| TSPost53OverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:225 | (...p: A2) =&gt; R2 |
| TSPost53OverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:226 | (...p: A3) =&gt; R3 |
| TSPost53OverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:227 | (...p: A4) =&gt; R4 |
| TSPost53OverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:228 | (...p: A5) =&gt; R5 |
| TSPost53OverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:229 | (...p: A6) =&gt; R6 |
| TSPost53OverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:230 | (...p: A7) =&gt; R7 |
| TSPost53OverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:231 | (...p: A8) =&gt; R8 |
| TSPost53OverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:232 | (...p: A9) =&gt; R9 |
| TSPost53OverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:233 | (...p: A10) =&gt; R10 |
| UnknownFunction | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:238 | UnknownFunction |
| UnknownFunction.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:238 | UnknownFunction |
| IsUselessOverloadInfo | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:248 | IsUselessOverloadInfo&lt;FunctionType&gt; |
| IsUselessOverloadInfo.FunctionType | TypeParameter | vendor/expect-type/overloads.d.ts:248 | FunctionType |
| Tuplify | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:259 | Tuplify&lt;Union&gt; |
| Tuplify.Union | TypeParameter | vendor/expect-type/overloads.d.ts:259 | Union |
| Tuplify.X | TypeParameter | vendor/expect-type/overloads.d.ts:259 | X |
| TSPre53OverloadsInfoUnion | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:271 | TSPre53OverloadsInfoUnion&lt;FunctionType&gt; |
| TSPre53OverloadsInfoUnion.FunctionType | TypeParameter | vendor/expect-type/overloads.d.ts:271 | FunctionType |
| TSPre53OverloadsInfoUnion.Tup | TypeParameter | vendor/expect-type/overloads.d.ts:272 | Tup |
| TSPre53OverloadsInfoUnion.Fn | TypeParameter | vendor/expect-type/overloads.d.ts:273 | Fn |
| DecreasingOverloadsInfoUnion | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:283 | DecreasingOverloadsInfoUnion&lt;F&gt; |
| DecreasingOverloadsInfoUnion.F | TypeParameter | vendor/expect-type/overloads.d.ts:283 | F |
| DecreasingOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:283 | { (...args: A1): R1; (...args: A2): R2; (...args: A3): R3; (...args: A4): R4; (...args: A5): R5; (...args: A6): R6; (...args: A7): R7; (...args: A8): R8; (...args: A9): R9; (...args: A10): R10; } |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:284 | any |
| DecreasingOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:284 | A1 |
| DecreasingOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:284 | R1 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:285 | any |
| DecreasingOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:285 | A2 |
| DecreasingOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:285 | R2 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:286 | any |
| DecreasingOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:286 | A3 |
| DecreasingOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:286 | R3 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:287 | any |
| DecreasingOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:287 | A4 |
| DecreasingOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:287 | R4 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:288 | any |
| DecreasingOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:288 | A5 |
| DecreasingOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:288 | R5 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:289 | any |
| DecreasingOverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:289 | A6 |
| DecreasingOverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:289 | R6 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:290 | any |
| DecreasingOverloadsInfoUnion.A7 | TypeParameter | vendor/expect-type/overloads.d.ts:290 | A7 |
| DecreasingOverloadsInfoUnion.R7 | TypeParameter | vendor/expect-type/overloads.d.ts:290 | R7 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:291 | any |
| DecreasingOverloadsInfoUnion.A8 | TypeParameter | vendor/expect-type/overloads.d.ts:291 | A8 |
| DecreasingOverloadsInfoUnion.R8 | TypeParameter | vendor/expect-type/overloads.d.ts:291 | R8 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:292 | any |
| DecreasingOverloadsInfoUnion.A9 | TypeParameter | vendor/expect-type/overloads.d.ts:292 | A9 |
| DecreasingOverloadsInfoUnion.R9 | TypeParameter | vendor/expect-type/overloads.d.ts:292 | R9 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:293 | any |
| DecreasingOverloadsInfoUnion.A10 | TypeParameter | vendor/expect-type/overloads.d.ts:293 | A10 |
| DecreasingOverloadsInfoUnion.R10 | TypeParameter | vendor/expect-type/overloads.d.ts:293 | R10 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:296 | (...p: A1) =&gt; R1 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:297 | (...p: A2) =&gt; R2 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:298 | (...p: A3) =&gt; R3 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:299 | (...p: A4) =&gt; R4 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:300 | (...p: A5) =&gt; R5 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:301 | (...p: A6) =&gt; R6 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:302 | (...p: A7) =&gt; R7 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:303 | (...p: A8) =&gt; R8 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:304 | (...p: A9) =&gt; R9 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:305 | (...p: A10) =&gt; R10 |
| DecreasingOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:306 | { (...args: A1): R1; (...args: A2): R2; (...args: A3): R3; (...args: A4): R4; (...args: A5): R5; (...args: A6): R6; (...args: A7): R7; (...args: A8): R8; (...args: A9): R9; } |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:307 | any |
| DecreasingOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:307 | A1 |
| DecreasingOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:307 | R1 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:308 | any |
| DecreasingOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:308 | A2 |
| DecreasingOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:308 | R2 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:309 | any |
| DecreasingOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:309 | A3 |
| DecreasingOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:309 | R3 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:310 | any |
| DecreasingOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:310 | A4 |
| DecreasingOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:310 | R4 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:311 | any |
| DecreasingOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:311 | A5 |
| DecreasingOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:311 | R5 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:312 | any |
| DecreasingOverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:312 | A6 |
| DecreasingOverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:312 | R6 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:313 | any |
| DecreasingOverloadsInfoUnion.A7 | TypeParameter | vendor/expect-type/overloads.d.ts:313 | A7 |
| DecreasingOverloadsInfoUnion.R7 | TypeParameter | vendor/expect-type/overloads.d.ts:313 | R7 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:314 | any |
| DecreasingOverloadsInfoUnion.A8 | TypeParameter | vendor/expect-type/overloads.d.ts:314 | A8 |
| DecreasingOverloadsInfoUnion.R8 | TypeParameter | vendor/expect-type/overloads.d.ts:314 | R8 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:315 | any |
| DecreasingOverloadsInfoUnion.A9 | TypeParameter | vendor/expect-type/overloads.d.ts:315 | A9 |
| DecreasingOverloadsInfoUnion.R9 | TypeParameter | vendor/expect-type/overloads.d.ts:315 | R9 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:318 | (...p: A1) =&gt; R1 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:319 | (...p: A2) =&gt; R2 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:320 | (...p: A3) =&gt; R3 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:321 | (...p: A4) =&gt; R4 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:322 | (...p: A5) =&gt; R5 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:323 | (...p: A6) =&gt; R6 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:324 | (...p: A7) =&gt; R7 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:325 | (...p: A8) =&gt; R8 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:326 | (...p: A9) =&gt; R9 |
| DecreasingOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:327 | { (...args: A1): R1; (...args: A2): R2; (...args: A3): R3; (...args: A4): R4; (...args: A5): R5; (...args: A6): R6; (...args: A7): R7; (...args: A8): R8; } |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:328 | any |
| DecreasingOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:328 | A1 |
| DecreasingOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:328 | R1 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:329 | any |
| DecreasingOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:329 | A2 |
| DecreasingOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:329 | R2 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:330 | any |
| DecreasingOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:330 | A3 |
| DecreasingOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:330 | R3 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:331 | any |
| DecreasingOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:331 | A4 |
| DecreasingOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:331 | R4 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:332 | any |
| DecreasingOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:332 | A5 |
| DecreasingOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:332 | R5 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:333 | any |
| DecreasingOverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:333 | A6 |
| DecreasingOverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:333 | R6 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:334 | any |
| DecreasingOverloadsInfoUnion.A7 | TypeParameter | vendor/expect-type/overloads.d.ts:334 | A7 |
| DecreasingOverloadsInfoUnion.R7 | TypeParameter | vendor/expect-type/overloads.d.ts:334 | R7 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:335 | any |
| DecreasingOverloadsInfoUnion.A8 | TypeParameter | vendor/expect-type/overloads.d.ts:335 | A8 |
| DecreasingOverloadsInfoUnion.R8 | TypeParameter | vendor/expect-type/overloads.d.ts:335 | R8 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:338 | (...p: A1) =&gt; R1 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:339 | (...p: A2) =&gt; R2 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:340 | (...p: A3) =&gt; R3 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:341 | (...p: A4) =&gt; R4 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:342 | (...p: A5) =&gt; R5 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:343 | (...p: A6) =&gt; R6 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:344 | (...p: A7) =&gt; R7 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:345 | (...p: A8) =&gt; R8 |
| DecreasingOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:346 | { (...args: A1): R1; (...args: A2): R2; (...args: A3): R3; (...args: A4): R4; (...args: A5): R5; (...args: A6): R6; (...args: A7): R7; } |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:347 | any |
| DecreasingOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:347 | A1 |
| DecreasingOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:347 | R1 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:348 | any |
| DecreasingOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:348 | A2 |
| DecreasingOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:348 | R2 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:349 | any |
| DecreasingOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:349 | A3 |
| DecreasingOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:349 | R3 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:350 | any |
| DecreasingOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:350 | A4 |
| DecreasingOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:350 | R4 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:351 | any |
| DecreasingOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:351 | A5 |
| DecreasingOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:351 | R5 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:352 | any |
| DecreasingOverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:352 | A6 |
| DecreasingOverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:352 | R6 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:353 | any |
| DecreasingOverloadsInfoUnion.A7 | TypeParameter | vendor/expect-type/overloads.d.ts:353 | A7 |
| DecreasingOverloadsInfoUnion.R7 | TypeParameter | vendor/expect-type/overloads.d.ts:353 | R7 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:356 | (...p: A1) =&gt; R1 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:357 | (...p: A2) =&gt; R2 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:358 | (...p: A3) =&gt; R3 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:359 | (...p: A4) =&gt; R4 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:360 | (...p: A5) =&gt; R5 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:361 | (...p: A6) =&gt; R6 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:362 | (...p: A7) =&gt; R7 |
| DecreasingOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:363 | { (...args: A1): R1; (...args: A2): R2; (...args: A3): R3; (...args: A4): R4; (...args: A5): R5; (...args: A6): R6; } |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:364 | any |
| DecreasingOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:364 | A1 |
| DecreasingOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:364 | R1 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:365 | any |
| DecreasingOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:365 | A2 |
| DecreasingOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:365 | R2 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:366 | any |
| DecreasingOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:366 | A3 |
| DecreasingOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:366 | R3 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:367 | any |
| DecreasingOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:367 | A4 |
| DecreasingOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:367 | R4 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:368 | any |
| DecreasingOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:368 | A5 |
| DecreasingOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:368 | R5 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:369 | any |
| DecreasingOverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:369 | A6 |
| DecreasingOverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:369 | R6 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:372 | (...p: A1) =&gt; R1 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:373 | (...p: A2) =&gt; R2 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:374 | (...p: A3) =&gt; R3 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:375 | (...p: A4) =&gt; R4 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:376 | (...p: A5) =&gt; R5 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:377 | (...p: A6) =&gt; R6 |
| DecreasingOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:378 | { (...args: A1): R1; (...args: A2): R2; (...args: A3): R3; (...args: A4): R4; (...args: A5): R5; } |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:379 | any |
| DecreasingOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:379 | A1 |
| DecreasingOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:379 | R1 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:380 | any |
| DecreasingOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:380 | A2 |
| DecreasingOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:380 | R2 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:381 | any |
| DecreasingOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:381 | A3 |
| DecreasingOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:381 | R3 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:382 | any |
| DecreasingOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:382 | A4 |
| DecreasingOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:382 | R4 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:383 | any |
| DecreasingOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:383 | A5 |
| DecreasingOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:383 | R5 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:385 | (...p: A1) =&gt; R1 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:385 | (...p: A2) =&gt; R2 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:385 | (...p: A3) =&gt; R3 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:385 | (...p: A4) =&gt; R4 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:385 | (...p: A5) =&gt; R5 |
| DecreasingOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:386 | { (...args: A1): R1; (...args: A2): R2; (...args: A3): R3; (...args: A4): R4; } |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:387 | any |
| DecreasingOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:387 | A1 |
| DecreasingOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:387 | R1 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:388 | any |
| DecreasingOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:388 | A2 |
| DecreasingOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:388 | R2 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:389 | any |
| DecreasingOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:389 | A3 |
| DecreasingOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:389 | R3 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:390 | any |
| DecreasingOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:390 | A4 |
| DecreasingOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:390 | R4 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:392 | (...p: A1) =&gt; R1 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:392 | (...p: A2) =&gt; R2 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:392 | (...p: A3) =&gt; R3 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:392 | (...p: A4) =&gt; R4 |
| DecreasingOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:393 | { (...args: A1): R1; (...args: A2): R2; (...args: A3): R3; } |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:394 | any |
| DecreasingOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:394 | A1 |
| DecreasingOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:394 | R1 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:395 | any |
| DecreasingOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:395 | A2 |
| DecreasingOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:395 | R2 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:396 | any |
| DecreasingOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:396 | A3 |
| DecreasingOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:396 | R3 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:398 | (...p: A1) =&gt; R1 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:398 | (...p: A2) =&gt; R2 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:398 | (...p: A3) =&gt; R3 |
| DecreasingOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:399 | { (...args: A1): R1; (...args: A2): R2; } |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:400 | any |
| DecreasingOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:400 | A1 |
| DecreasingOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:400 | R1 |
| DecreasingOverloadsInfoUnion.[call] | CallSignature | vendor/expect-type/overloads.d.ts:401 | any |
| DecreasingOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:401 | A2 |
| DecreasingOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:401 | R2 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:403 | (...p: A1) =&gt; R1 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:403 | (...p: A2) =&gt; R2 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:404 | (...args: A1) =&gt; R1 |
| DecreasingOverloadsInfoUnion.[FunctionType].A1 | TypeParameter | vendor/expect-type/overloads.d.ts:404 | A1 |
| DecreasingOverloadsInfoUnion.[FunctionType].R1 | TypeParameter | vendor/expect-type/overloads.d.ts:404 | R1 |
| DecreasingOverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:405 | (...p: A1) =&gt; R1 |
| OverloadsInfoUnion | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:413 | TSPost53OverloadsInfoUnion&lt;FunctionType&gt; |
| OverloadsInfoUnion.FunctionType | TypeParameter | vendor/expect-type/overloads.d.ts:413 | FunctionType |
| OverloadsInfoUnion.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:414 | (a: 1) =&gt; 2 |
| InferFunctionType | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:420 | FunctionType |
| InferFunctionType.FunctionType | TypeParameter | vendor/expect-type/overloads.d.ts:420 | FunctionType |
| InferFunctionType.[FunctionType] | FunctionType | vendor/expect-type/overloads.d.ts:420 | (...args: any) =&gt; any |
| OverloadParameters | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:425 | OverloadParameters&lt;FunctionType&gt; |
| OverloadParameters.FunctionType | TypeParameter | vendor/expect-type/overloads.d.ts:425 | FunctionType |
| OverloadParameters.Fn | TypeParameter | vendor/expect-type/overloads.d.ts:426 | Fn |
| OverloadReturnTypes | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:431 | OverloadReturnTypes&lt;FunctionType&gt; |
| OverloadReturnTypes.FunctionType | TypeParameter | vendor/expect-type/overloads.d.ts:431 | FunctionType |
| OverloadReturnTypes.Fn | TypeParameter | vendor/expect-type/overloads.d.ts:432 | Fn |
| SelectOverloadsInfo | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:438 | SelectOverloadsInfo&lt;Union, Args&gt; |
| SelectOverloadsInfo.Union | TypeParameter | vendor/expect-type/overloads.d.ts:438 | Union |
| SelectOverloadsInfo.Args | TypeParameter | vendor/expect-type/overloads.d.ts:438 | Args |
| SelectOverloadsInfo.Fn | TypeParameter | vendor/expect-type/overloads.d.ts:439 | Fn |
| OverloadsNarrowedByParameters | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:445 | OverloadsNarrowedByParameters&lt;FunctionType, Args&gt; |
| OverloadsNarrowedByParameters.FunctionType | TypeParameter | vendor/expect-type/overloads.d.ts:446 | FunctionType |
| OverloadsNarrowedByParameters.Args | TypeParameter | vendor/expect-type/overloads.d.ts:447 | Args |
| TSPost53ConstructorOverloadsInfoUnion | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:459 | TSPost53ConstructorOverloadsInfoUnion&lt;ConstructorType&gt; |
| TSPost53ConstructorOverloadsInfoUnion.ConstructorType | TypeParameter | vendor/expect-type/overloads.d.ts:459 | ConstructorType |
| TSPost53ConstructorOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:459 | { new (...args: A1): R1; new (...args: A2): R2; new (...args: A3): R3; new (...args: A4): R4; new (...args: A5): R5; new (...args: A6): R6; new (...args: A7): R7; new (...args: A8): R8; new (...args: A9): R9; new (...args: A10): R10; } |
| TSPost53ConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:460 | any |
| TSPost53ConstructorOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:460 | A1 |
| TSPost53ConstructorOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:460 | R1 |
| TSPost53ConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:461 | any |
| TSPost53ConstructorOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:461 | A2 |
| TSPost53ConstructorOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:461 | R2 |
| TSPost53ConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:462 | any |
| TSPost53ConstructorOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:462 | A3 |
| TSPost53ConstructorOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:462 | R3 |
| TSPost53ConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:463 | any |
| TSPost53ConstructorOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:463 | A4 |
| TSPost53ConstructorOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:463 | R4 |
| TSPost53ConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:464 | any |
| TSPost53ConstructorOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:464 | A5 |
| TSPost53ConstructorOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:464 | R5 |
| TSPost53ConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:465 | any |
| TSPost53ConstructorOverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:465 | A6 |
| TSPost53ConstructorOverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:465 | R6 |
| TSPost53ConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:466 | any |
| TSPost53ConstructorOverloadsInfoUnion.A7 | TypeParameter | vendor/expect-type/overloads.d.ts:466 | A7 |
| TSPost53ConstructorOverloadsInfoUnion.R7 | TypeParameter | vendor/expect-type/overloads.d.ts:466 | R7 |
| TSPost53ConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:467 | any |
| TSPost53ConstructorOverloadsInfoUnion.A8 | TypeParameter | vendor/expect-type/overloads.d.ts:467 | A8 |
| TSPost53ConstructorOverloadsInfoUnion.R8 | TypeParameter | vendor/expect-type/overloads.d.ts:467 | R8 |
| TSPost53ConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:468 | any |
| TSPost53ConstructorOverloadsInfoUnion.A9 | TypeParameter | vendor/expect-type/overloads.d.ts:468 | A9 |
| TSPost53ConstructorOverloadsInfoUnion.R9 | TypeParameter | vendor/expect-type/overloads.d.ts:468 | R9 |
| TSPost53ConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:469 | any |
| TSPost53ConstructorOverloadsInfoUnion.A10 | TypeParameter | vendor/expect-type/overloads.d.ts:469 | A10 |
| TSPost53ConstructorOverloadsInfoUnion.R10 | TypeParameter | vendor/expect-type/overloads.d.ts:469 | R10 |
| TSPost53ConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:472 | new (...p: A1) =&gt; R1 |
| TSPost53ConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:473 | new (...p: A2) =&gt; R2 |
| TSPost53ConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:474 | new (...p: A3) =&gt; R3 |
| TSPost53ConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:475 | new (...p: A4) =&gt; R4 |
| TSPost53ConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:476 | new (...p: A5) =&gt; R5 |
| TSPost53ConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:477 | new (...p: A6) =&gt; R6 |
| TSPost53ConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:478 | new (...p: A7) =&gt; R7 |
| TSPost53ConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:479 | new (...p: A8) =&gt; R8 |
| TSPost53ConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:480 | new (...p: A9) =&gt; R9 |
| TSPost53ConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:481 | new (...p: A10) =&gt; R10 |
| UnknownConstructor | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:486 | UnknownConstructor |
| UnknownConstructor.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:486 | UnknownConstructor |
| IsUselessConstructorOverloadInfo | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:490 | IsUselessConstructorOverloadInfo&lt;FunctionType&gt; |
| IsUselessConstructorOverloadInfo.FunctionType | TypeParameter | vendor/expect-type/overloads.d.ts:490 | FunctionType |
| TSPre53ConstructorOverloadsInfoUnion | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:505 | TSPre53ConstructorOverloadsInfoUnion&lt;ConstructorType&gt; |
| TSPre53ConstructorOverloadsInfoUnion.ConstructorType | TypeParameter | vendor/expect-type/overloads.d.ts:505 | ConstructorType |
| TSPre53ConstructorOverloadsInfoUnion.Tup | TypeParameter | vendor/expect-type/overloads.d.ts:506 | Tup |
| TSPre53ConstructorOverloadsInfoUnion.Ctor | TypeParameter | vendor/expect-type/overloads.d.ts:507 | Ctor |
| DecreasingConstructorOverloadsInfoUnion | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:517 | DecreasingConstructorOverloadsInfoUnion&lt;ConstructorType&gt; |
| DecreasingConstructorOverloadsInfoUnion.ConstructorType | TypeParameter | vendor/expect-type/overloads.d.ts:517 | ConstructorType |
| DecreasingConstructorOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:517 | { new (...args: A1): R1; new (...args: A2): R2; new (...args: A3): R3; new (...args: A4): R4; new (...args: A5): R5; new (...args: A6): R6; new (...args: A7): R7; new (...args: A8): R8; new (...args: A9): R9; new (...args: A10): R10; } |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:518 | any |
| DecreasingConstructorOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:518 | A1 |
| DecreasingConstructorOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:518 | R1 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:519 | any |
| DecreasingConstructorOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:519 | A2 |
| DecreasingConstructorOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:519 | R2 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:520 | any |
| DecreasingConstructorOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:520 | A3 |
| DecreasingConstructorOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:520 | R3 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:521 | any |
| DecreasingConstructorOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:521 | A4 |
| DecreasingConstructorOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:521 | R4 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:522 | any |
| DecreasingConstructorOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:522 | A5 |
| DecreasingConstructorOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:522 | R5 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:523 | any |
| DecreasingConstructorOverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:523 | A6 |
| DecreasingConstructorOverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:523 | R6 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:524 | any |
| DecreasingConstructorOverloadsInfoUnion.A7 | TypeParameter | vendor/expect-type/overloads.d.ts:524 | A7 |
| DecreasingConstructorOverloadsInfoUnion.R7 | TypeParameter | vendor/expect-type/overloads.d.ts:524 | R7 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:525 | any |
| DecreasingConstructorOverloadsInfoUnion.A8 | TypeParameter | vendor/expect-type/overloads.d.ts:525 | A8 |
| DecreasingConstructorOverloadsInfoUnion.R8 | TypeParameter | vendor/expect-type/overloads.d.ts:525 | R8 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:526 | any |
| DecreasingConstructorOverloadsInfoUnion.A9 | TypeParameter | vendor/expect-type/overloads.d.ts:526 | A9 |
| DecreasingConstructorOverloadsInfoUnion.R9 | TypeParameter | vendor/expect-type/overloads.d.ts:526 | R9 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:527 | any |
| DecreasingConstructorOverloadsInfoUnion.A10 | TypeParameter | vendor/expect-type/overloads.d.ts:527 | A10 |
| DecreasingConstructorOverloadsInfoUnion.R10 | TypeParameter | vendor/expect-type/overloads.d.ts:527 | R10 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:530 | new (...p: A1) =&gt; R1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:531 | new (...p: A2) =&gt; R2 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:532 | new (...p: A3) =&gt; R3 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:533 | new (...p: A4) =&gt; R4 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:534 | new (...p: A5) =&gt; R5 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:535 | new (...p: A6) =&gt; R6 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:536 | new (...p: A7) =&gt; R7 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:537 | new (...p: A8) =&gt; R8 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:538 | new (...p: A9) =&gt; R9 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:539 | new (...p: A10) =&gt; R10 |
| DecreasingConstructorOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:540 | { new (...args: A1): R1; new (...args: A2): R2; new (...args: A3): R3; new (...args: A4): R4; new (...args: A5): R5; new (...args: A6): R6; new (...args: A7): R7; new (...args: A8): R8; new (...args: A9): R9; } |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:541 | any |
| DecreasingConstructorOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:541 | A1 |
| DecreasingConstructorOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:541 | R1 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:542 | any |
| DecreasingConstructorOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:542 | A2 |
| DecreasingConstructorOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:542 | R2 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:543 | any |
| DecreasingConstructorOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:543 | A3 |
| DecreasingConstructorOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:543 | R3 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:544 | any |
| DecreasingConstructorOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:544 | A4 |
| DecreasingConstructorOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:544 | R4 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:545 | any |
| DecreasingConstructorOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:545 | A5 |
| DecreasingConstructorOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:545 | R5 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:546 | any |
| DecreasingConstructorOverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:546 | A6 |
| DecreasingConstructorOverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:546 | R6 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:547 | any |
| DecreasingConstructorOverloadsInfoUnion.A7 | TypeParameter | vendor/expect-type/overloads.d.ts:547 | A7 |
| DecreasingConstructorOverloadsInfoUnion.R7 | TypeParameter | vendor/expect-type/overloads.d.ts:547 | R7 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:548 | any |
| DecreasingConstructorOverloadsInfoUnion.A8 | TypeParameter | vendor/expect-type/overloads.d.ts:548 | A8 |
| DecreasingConstructorOverloadsInfoUnion.R8 | TypeParameter | vendor/expect-type/overloads.d.ts:548 | R8 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:549 | any |
| DecreasingConstructorOverloadsInfoUnion.A9 | TypeParameter | vendor/expect-type/overloads.d.ts:549 | A9 |
| DecreasingConstructorOverloadsInfoUnion.R9 | TypeParameter | vendor/expect-type/overloads.d.ts:549 | R9 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:552 | new (...p: A1) =&gt; R1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:553 | new (...p: A2) =&gt; R2 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:554 | new (...p: A3) =&gt; R3 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:555 | new (...p: A4) =&gt; R4 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:556 | new (...p: A5) =&gt; R5 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:557 | new (...p: A6) =&gt; R6 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:558 | new (...p: A7) =&gt; R7 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:559 | new (...p: A8) =&gt; R8 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:560 | new (...p: A9) =&gt; R9 |
| DecreasingConstructorOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:561 | { new (...args: A1): R1; new (...args: A2): R2; new (...args: A3): R3; new (...args: A4): R4; new (...args: A5): R5; new (...args: A6): R6; new (...args: A7): R7; new (...args: A8): R8; } |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:562 | any |
| DecreasingConstructorOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:562 | A1 |
| DecreasingConstructorOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:562 | R1 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:563 | any |
| DecreasingConstructorOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:563 | A2 |
| DecreasingConstructorOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:563 | R2 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:564 | any |
| DecreasingConstructorOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:564 | A3 |
| DecreasingConstructorOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:564 | R3 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:565 | any |
| DecreasingConstructorOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:565 | A4 |
| DecreasingConstructorOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:565 | R4 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:566 | any |
| DecreasingConstructorOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:566 | A5 |
| DecreasingConstructorOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:566 | R5 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:567 | any |
| DecreasingConstructorOverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:567 | A6 |
| DecreasingConstructorOverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:567 | R6 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:568 | any |
| DecreasingConstructorOverloadsInfoUnion.A7 | TypeParameter | vendor/expect-type/overloads.d.ts:568 | A7 |
| DecreasingConstructorOverloadsInfoUnion.R7 | TypeParameter | vendor/expect-type/overloads.d.ts:568 | R7 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:569 | any |
| DecreasingConstructorOverloadsInfoUnion.A8 | TypeParameter | vendor/expect-type/overloads.d.ts:569 | A8 |
| DecreasingConstructorOverloadsInfoUnion.R8 | TypeParameter | vendor/expect-type/overloads.d.ts:569 | R8 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:572 | new (...p: A1) =&gt; R1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:573 | new (...p: A2) =&gt; R2 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:574 | new (...p: A3) =&gt; R3 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:575 | new (...p: A4) =&gt; R4 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:576 | new (...p: A5) =&gt; R5 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:577 | new (...p: A6) =&gt; R6 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:578 | new (...p: A7) =&gt; R7 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:579 | new (...p: A8) =&gt; R8 |
| DecreasingConstructorOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:580 | { new (...args: A1): R1; new (...args: A2): R2; new (...args: A3): R3; new (...args: A4): R4; new (...args: A5): R5; new (...args: A6): R6; new (...args: A7): R7; } |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:581 | any |
| DecreasingConstructorOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:581 | A1 |
| DecreasingConstructorOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:581 | R1 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:582 | any |
| DecreasingConstructorOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:582 | A2 |
| DecreasingConstructorOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:582 | R2 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:583 | any |
| DecreasingConstructorOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:583 | A3 |
| DecreasingConstructorOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:583 | R3 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:584 | any |
| DecreasingConstructorOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:584 | A4 |
| DecreasingConstructorOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:584 | R4 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:585 | any |
| DecreasingConstructorOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:585 | A5 |
| DecreasingConstructorOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:585 | R5 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:586 | any |
| DecreasingConstructorOverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:586 | A6 |
| DecreasingConstructorOverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:586 | R6 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:587 | any |
| DecreasingConstructorOverloadsInfoUnion.A7 | TypeParameter | vendor/expect-type/overloads.d.ts:587 | A7 |
| DecreasingConstructorOverloadsInfoUnion.R7 | TypeParameter | vendor/expect-type/overloads.d.ts:587 | R7 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:590 | new (...p: A1) =&gt; R1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:591 | new (...p: A2) =&gt; R2 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:592 | new (...p: A3) =&gt; R3 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:593 | new (...p: A4) =&gt; R4 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:594 | new (...p: A5) =&gt; R5 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:595 | new (...p: A6) =&gt; R6 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:596 | new (...p: A7) =&gt; R7 |
| DecreasingConstructorOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:597 | { new (...args: A1): R1; new (...args: A2): R2; new (...args: A3): R3; new (...args: A4): R4; new (...args: A5): R5; new (...args: A6): R6; } |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:598 | any |
| DecreasingConstructorOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:598 | A1 |
| DecreasingConstructorOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:598 | R1 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:599 | any |
| DecreasingConstructorOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:599 | A2 |
| DecreasingConstructorOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:599 | R2 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:600 | any |
| DecreasingConstructorOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:600 | A3 |
| DecreasingConstructorOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:600 | R3 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:601 | any |
| DecreasingConstructorOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:601 | A4 |
| DecreasingConstructorOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:601 | R4 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:602 | any |
| DecreasingConstructorOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:602 | A5 |
| DecreasingConstructorOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:602 | R5 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:603 | any |
| DecreasingConstructorOverloadsInfoUnion.A6 | TypeParameter | vendor/expect-type/overloads.d.ts:603 | A6 |
| DecreasingConstructorOverloadsInfoUnion.R6 | TypeParameter | vendor/expect-type/overloads.d.ts:603 | R6 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:606 | new (...p: A1) =&gt; R1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:607 | new (...p: A2) =&gt; R2 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:608 | new (...p: A3) =&gt; R3 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:609 | new (...p: A4) =&gt; R4 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:610 | new (...p: A5) =&gt; R5 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:611 | new (...p: A6) =&gt; R6 |
| DecreasingConstructorOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:612 | { new (...args: A1): R1; new (...args: A2): R2; new (...args: A3): R3; new (...args: A4): R4; new (...args: A5): R5; } |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:613 | any |
| DecreasingConstructorOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:613 | A1 |
| DecreasingConstructorOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:613 | R1 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:614 | any |
| DecreasingConstructorOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:614 | A2 |
| DecreasingConstructorOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:614 | R2 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:615 | any |
| DecreasingConstructorOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:615 | A3 |
| DecreasingConstructorOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:615 | R3 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:616 | any |
| DecreasingConstructorOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:616 | A4 |
| DecreasingConstructorOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:616 | R4 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:617 | any |
| DecreasingConstructorOverloadsInfoUnion.A5 | TypeParameter | vendor/expect-type/overloads.d.ts:617 | A5 |
| DecreasingConstructorOverloadsInfoUnion.R5 | TypeParameter | vendor/expect-type/overloads.d.ts:617 | R5 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:620 | new (...p: A1) =&gt; R1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:621 | new (...p: A2) =&gt; R2 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:622 | new (...p: A3) =&gt; R3 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:623 | new (...p: A4) =&gt; R4 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:624 | new (...p: A5) =&gt; R5 |
| DecreasingConstructorOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:625 | { new (...args: A1): R1; new (...args: A2): R2; new (...args: A3): R3; new (...args: A4): R4; } |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:626 | any |
| DecreasingConstructorOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:626 | A1 |
| DecreasingConstructorOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:626 | R1 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:627 | any |
| DecreasingConstructorOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:627 | A2 |
| DecreasingConstructorOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:627 | R2 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:628 | any |
| DecreasingConstructorOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:628 | A3 |
| DecreasingConstructorOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:628 | R3 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:629 | any |
| DecreasingConstructorOverloadsInfoUnion.A4 | TypeParameter | vendor/expect-type/overloads.d.ts:629 | A4 |
| DecreasingConstructorOverloadsInfoUnion.R4 | TypeParameter | vendor/expect-type/overloads.d.ts:629 | R4 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:631 | new (...p: A1) =&gt; R1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:631 | new (...p: A2) =&gt; R2 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:631 | new (...p: A3) =&gt; R3 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:631 | new (...p: A4) =&gt; R4 |
| DecreasingConstructorOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:632 | { new (...args: A1): R1; new (...args: A2): R2; new (...args: A3): R3; } |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:633 | any |
| DecreasingConstructorOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:633 | A1 |
| DecreasingConstructorOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:633 | R1 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:634 | any |
| DecreasingConstructorOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:634 | A2 |
| DecreasingConstructorOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:634 | R2 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:635 | any |
| DecreasingConstructorOverloadsInfoUnion.A3 | TypeParameter | vendor/expect-type/overloads.d.ts:635 | A3 |
| DecreasingConstructorOverloadsInfoUnion.R3 | TypeParameter | vendor/expect-type/overloads.d.ts:635 | R3 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:637 | new (...p: A1) =&gt; R1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:637 | new (...p: A2) =&gt; R2 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:637 | new (...p: A3) =&gt; R3 |
| DecreasingConstructorOverloadsInfoUnion.[TypeLiteral] | TypeLiteral | vendor/expect-type/overloads.d.ts:638 | { new (...args: A1): R1; new (...args: A2): R2; } |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:639 | any |
| DecreasingConstructorOverloadsInfoUnion.A1 | TypeParameter | vendor/expect-type/overloads.d.ts:639 | A1 |
| DecreasingConstructorOverloadsInfoUnion.R1 | TypeParameter | vendor/expect-type/overloads.d.ts:639 | R1 |
| DecreasingConstructorOverloadsInfoUnion.[construct] | ConstructSignature | vendor/expect-type/overloads.d.ts:640 | any |
| DecreasingConstructorOverloadsInfoUnion.A2 | TypeParameter | vendor/expect-type/overloads.d.ts:640 | A2 |
| DecreasingConstructorOverloadsInfoUnion.R2 | TypeParameter | vendor/expect-type/overloads.d.ts:640 | R2 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:642 | new (...p: A1) =&gt; R1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:642 | new (...p: A2) =&gt; R2 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:643 | new (...args: A1) =&gt; R1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType].A1 | TypeParameter | vendor/expect-type/overloads.d.ts:643 | A1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType].R1 | TypeParameter | vendor/expect-type/overloads.d.ts:643 | R1 |
| DecreasingConstructorOverloadsInfoUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:644 | new (...p: A1) =&gt; R1 |
| ConstructorOverloadsUnion | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:652 | TSPost53ConstructorOverloadsInfoUnion&lt;ConstructorType&gt; |
| ConstructorOverloadsUnion.ConstructorType | TypeParameter | vendor/expect-type/overloads.d.ts:652 | ConstructorType |
| ConstructorOverloadsUnion.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:653 | new (a: 1) =&gt; any |
| InferConstructor | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:659 | ConstructorType |
| InferConstructor.ConstructorType | TypeParameter | vendor/expect-type/overloads.d.ts:659 | ConstructorType |
| InferConstructor.[ConstructorType] | ConstructorType | vendor/expect-type/overloads.d.ts:659 | new (...args: any) =&gt; any |
| ConstructorOverloadParameters | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:664 | ConstructorOverloadParameters&lt;ConstructorType&gt; |
| ConstructorOverloadParameters.ConstructorType | TypeParameter | vendor/expect-type/overloads.d.ts:664 | ConstructorType |
| ConstructorOverloadParameters.Ctor | TypeParameter | vendor/expect-type/overloads.d.ts:665 | Ctor |
| NumOverloads | TypeAliasDeclaration | vendor/expect-type/overloads.d.ts:669 | NumOverloads&lt;FunctionType&gt; |
| NumOverloads.FunctionType | TypeParameter | vendor/expect-type/overloads.d.ts:669 | FunctionType |
| Not | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:198 | Not&lt;T&gt; |
| Not.T | TypeParameter | vendor/expect-type/utils.d.ts:198 | T |
| Or | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:203 | Or&lt;Types&gt; |
| Or.Types | TypeParameter | vendor/expect-type/utils.d.ts:203 | Types |
| And | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:207 | And&lt;Types&gt; |
| And.Types | TypeParameter | vendor/expect-type/utils.d.ts:207 | Types |
| Eq | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:213 | Eq&lt;Left, Right&gt; |
| Eq.Left | TypeParameter | vendor/expect-type/utils.d.ts:213 | Left |
| Eq.Right | TypeParameter | vendor/expect-type/utils.d.ts:213 | Right |
| Xor | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:219 | Xor&lt;Types&gt; |
| Xor.Types | TypeParameter | vendor/expect-type/utils.d.ts:219 | Types |
| secret | VariableDeclaration | vendor/expect-type/utils.d.ts:223 | unique symbol |
| Secret | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:227 | unique symbol |
| IsNever | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:231 | IsNever&lt;T&gt; |
| IsNever.T | TypeParameter | vendor/expect-type/utils.d.ts:231 | T |
| IsAny | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:235 | IsAny&lt;T&gt; |
| IsAny.T | TypeParameter | vendor/expect-type/utils.d.ts:235 | T |
| IsUnknown | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:239 | IsUnknown&lt;T&gt; |
| IsUnknown.T | TypeParameter | vendor/expect-type/utils.d.ts:239 | T |
| IsNeverOrAny | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:243 | IsNeverOrAny&lt;T&gt; |
| IsNeverOrAny.T | TypeParameter | vendor/expect-type/utils.d.ts:243 | T |
| UsefulKeys | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:257 | UsefulKeys&lt;T&gt; |
| UsefulKeys.T | TypeParameter | vendor/expect-type/utils.d.ts:257 | T |
| UsefulKeys.[MappedType] | MappedType | vendor/expect-type/utils.d.ts:258 | { [K in keyof T]: K; } |
| UsefulKeys.K | TypeParameter | vendor/expect-type/utils.d.ts:259 | K |
| RequiredKeys | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:265 | RequiredKeys&lt;T&gt; |
| RequiredKeys.T | TypeParameter | vendor/expect-type/utils.d.ts:265 | T |
| RequiredKeys.[MappedType] | MappedType | vendor/expect-type/utils.d.ts:266 | { [K in keyof T]-?: {} extends Pick&lt;T, K&gt; ? never : K; } |
| RequiredKeys.K | TypeParameter | vendor/expect-type/utils.d.ts:267 | K |
| RequiredKeys.[TypeLiteral] | TypeLiteral | vendor/expect-type/utils.d.ts:267 | {} |
| OptionalKeys | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:274 | OptionalKeys&lt;T&gt; |
| OptionalKeys.T | TypeParameter | vendor/expect-type/utils.d.ts:274 | T |
| ReadonlyKeys | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:278 | ReadonlyKeys&lt;T&gt; |
| ReadonlyKeys.T | TypeParameter | vendor/expect-type/utils.d.ts:278 | T |
| ReadonlyKeys.[MappedType] | MappedType | vendor/expect-type/utils.d.ts:279 | { [K in keyof T]-?: ([&lt;T&gt;() =&gt; T extends { [_K in K]: T[K]; } ? true : false] extends [&lt;T&gt;() =&gt; T extends { -readonly [_K in K]: T[K]; } ? true : false] ? true : false) extends true ? never : K; } |
| ReadonlyKeys.K | TypeParameter | vendor/expect-type/utils.d.ts:280 | K |
| ReadonlyKeys.[MappedType] | MappedType | vendor/expect-type/utils.d.ts:281 | { [_K in K]: T[K]; } |
| ReadonlyKeys._K | TypeParameter | vendor/expect-type/utils.d.ts:282 | _K |
| ReadonlyKeys.[MappedType] | MappedType | vendor/expect-type/utils.d.ts:284 | { -readonly [_K in K]: T[K]; } |
| ReadonlyKeys._K | TypeParameter | vendor/expect-type/utils.d.ts:285 | _K |
| ReadonlyEquivalent | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:298 | ReadonlyEquivalent&lt;X, Y&gt; |
| ReadonlyEquivalent.X | TypeParameter | vendor/expect-type/utils.d.ts:298 | X |
| ReadonlyEquivalent.Y | TypeParameter | vendor/expect-type/utils.d.ts:298 | Y |
| ReadonlyEquivalent.[FunctionType] | FunctionType | vendor/expect-type/utils.d.ts:298 | &lt;T&gt;() =&gt; T extends X ? true : false |
| ReadonlyEquivalent.[FunctionType].T | TypeParameter | vendor/expect-type/utils.d.ts:298 | T |
| ReadonlyEquivalent.[FunctionType] | FunctionType | vendor/expect-type/utils.d.ts:298 | &lt;T&gt;() =&gt; T extends Y ? true : false |
| ReadonlyEquivalent.[FunctionType].T | TypeParameter | vendor/expect-type/utils.d.ts:298 | T |
| Extends | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:304 | Extends&lt;Left, Right&gt; |
| Extends.Left | TypeParameter | vendor/expect-type/utils.d.ts:304 | Left |
| Extends.Right | TypeParameter | vendor/expect-type/utils.d.ts:304 | Right |
| ExtendsExcludingAnyOrNever | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:309 | ExtendsExcludingAnyOrNever&lt;Left, Right&gt; |
| ExtendsExcludingAnyOrNever.Left | TypeParameter | vendor/expect-type/utils.d.ts:309 | Left |
| ExtendsExcludingAnyOrNever.Right | TypeParameter | vendor/expect-type/utils.d.ts:309 | Right |
| StrictEqualUsingTSInternalIdenticalToOperator | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:316 | StrictEqualUsingTSInternalIdenticalToOperator&lt;L, R&gt; |
| StrictEqualUsingTSInternalIdenticalToOperator.L | TypeParameter | vendor/expect-type/utils.d.ts:316 | L |
| StrictEqualUsingTSInternalIdenticalToOperator.R | TypeParameter | vendor/expect-type/utils.d.ts:316 | R |
| StrictEqualUsingTSInternalIdenticalToOperator.[FunctionType] | FunctionType | vendor/expect-type/utils.d.ts:317 | &lt;T&gt;() =&gt; T extends T &#124; (L &amp; T) ? true : false |
| StrictEqualUsingTSInternalIdenticalToOperator.[FunctionType].T | TypeParameter | vendor/expect-type/utils.d.ts:317 | T |
| StrictEqualUsingTSInternalIdenticalToOperator.[FunctionType] | FunctionType | vendor/expect-type/utils.d.ts:317 | &lt;T&gt;() =&gt; T extends T &#124; (R &amp; T) ? true : false |
| StrictEqualUsingTSInternalIdenticalToOperator.[FunctionType].T | TypeParameter | vendor/expect-type/utils.d.ts:317 | T |
| MutuallyExtends | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:328 | MutuallyExtends&lt;Left, Right&gt; |
| MutuallyExtends.Left | TypeParameter | vendor/expect-type/utils.d.ts:328 | Left |
| MutuallyExtends.Right | TypeParameter | vendor/expect-type/utils.d.ts:328 | Right |
| mismatch | VariableDeclaration | vendor/expect-type/utils.d.ts:332 | unique symbol |
| Mismatch | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:336 | Mismatch |
| Mismatch.[TypeLiteral] | TypeLiteral | vendor/expect-type/utils.d.ts:336 | Mismatch |
| Mismatch.[mismatch] | PropertySignature | vendor/expect-type/utils.d.ts:337 | "mismatch" |
| avalue | VariableDeclaration | vendor/expect-type/utils.d.ts:347 | unique symbol |
| AValue | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:351 | AValue |
| AValue.[TypeLiteral] | TypeLiteral | vendor/expect-type/utils.d.ts:352 | { [avalue]?: undefined; } |
| AValue.[avalue] | PropertySignature | vendor/expect-type/utils.d.ts:353 | undefined |
| MismatchArgs | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:373 | MismatchArgs&lt;ActualResult, ExpectedResult&gt; |
| MismatchArgs.ActualResult | TypeParameter | vendor/expect-type/utils.d.ts:373 | ActualResult |
| MismatchArgs.ExpectedResult | TypeParameter | vendor/expect-type/utils.d.ts:373 | ExpectedResult |
| ExpectTypeOfOptions | InterfaceDeclaration | vendor/expect-type/utils.d.ts:378 | ExpectTypeOfOptions |
| ExpectTypeOfOptions.positive | PropertySignature | vendor/expect-type/utils.d.ts:379 | boolean |
| ExpectTypeOfOptions.branded | PropertySignature | vendor/expect-type/utils.d.ts:380 | boolean |
| UnionToIntersection | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:386 | UnionToIntersection&lt;Union&gt; |
| UnionToIntersection.Union | TypeParameter | vendor/expect-type/utils.d.ts:386 | Union |
| UnionToIntersection.[FunctionType] | FunctionType | vendor/expect-type/utils.d.ts:386 | (distributedUnion: Union) =&gt; void |
| UnionToIntersection.[FunctionType] | FunctionType | vendor/expect-type/utils.d.ts:386 | (mergedIntersection: Intersection) =&gt; void |
| UnionToIntersection.[FunctionType].Intersection | TypeParameter | vendor/expect-type/utils.d.ts:387 | Intersection |
| LastOf | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:396 | LastOf&lt;Union&gt; |
| LastOf.Union | TypeParameter | vendor/expect-type/utils.d.ts:396 | Union |
| LastOf.[FunctionType] | FunctionType | vendor/expect-type/utils.d.ts:397 | () =&gt; Union |
| LastOf.[FunctionType] | FunctionType | vendor/expect-type/utils.d.ts:397 | () =&gt; R |
| LastOf.[FunctionType].R | TypeParameter | vendor/expect-type/utils.d.ts:397 | R |
| TuplifyUnion | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:403 | TuplifyUnion&lt;Union, LastElement&gt; |
| TuplifyUnion.Union | TypeParameter | vendor/expect-type/utils.d.ts:403 | Union |
| TuplifyUnion.LastElement | TypeParameter | vendor/expect-type/utils.d.ts:403 | LastElement |
| UnionToTuple | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:408 | UnionToTuple&lt;Union&gt; |
| UnionToTuple.Union | TypeParameter | vendor/expect-type/utils.d.ts:408 | Union |
| IsTuple | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:409 | IsTuple&lt;T&gt; |
| IsTuple.T | TypeParameter | vendor/expect-type/utils.d.ts:409 | T |
| IsUnion | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:410 | IsUnion&lt;T&gt; |
| IsUnion.T | TypeParameter | vendor/expect-type/utils.d.ts:410 | T |
| DeepPickMatchingProps | TypeAliasDeclaration | vendor/expect-type/utils.d.ts:422 | DeepPickMatchingProps&lt;Left, Right&gt; |
| DeepPickMatchingProps.Left | TypeParameter | vendor/expect-type/utils.d.ts:422 | Left |
| DeepPickMatchingProps.Right | TypeParameter | vendor/expect-type/utils.d.ts:422 | Right |
| DeepPickMatchingProps.[MappedType] | MappedType | vendor/expect-type/utils.d.ts:425 | { [K in keyof Left]: K extends keyof Right ? DeepPickMatchingProps&lt;Left[K], Right[K]&gt; : never; } |
| DeepPickMatchingProps.K | TypeParameter | vendor/expect-type/utils.d.ts:426 | K |
| bun | ModuleDeclaration | wasm.d.ts:1 | typeof import("bun") |
| bun.WebAssembly | ModuleDeclaration | wasm.d.ts:2 | any |
| bun.WebAssembly.ImportExportKind | TypeAliasDeclaration | wasm.d.ts:3 | ImportExportKind |
| bun.WebAssembly.TableKind | TypeAliasDeclaration | wasm.d.ts:4 | TableKind |
| bun.WebAssembly.ExportValue | TypeAliasDeclaration | wasm.d.ts:5 | ExportValue |
| bun.WebAssembly.Exports | TypeAliasDeclaration | wasm.d.ts:6 | Exports |
| bun.WebAssembly.ImportValue | TypeAliasDeclaration | wasm.d.ts:7 | ImportValue |
| bun.WebAssembly.Imports | TypeAliasDeclaration | wasm.d.ts:8 | Imports |
| bun.WebAssembly.ModuleImports | TypeAliasDeclaration | wasm.d.ts:9 | ModuleImports |
| bun.WebAssembly.ValueTypeMap | InterfaceDeclaration | wasm.d.ts:11 | ValueTypeMap |
| bun.WebAssembly.ValueTypeMap.anyfunc | PropertySignature | wasm.d.ts:12 | Function |
| bun.WebAssembly.ValueTypeMap.externref | PropertySignature | wasm.d.ts:13 | any |
| bun.WebAssembly.ValueTypeMap.f32 | PropertySignature | wasm.d.ts:14 | number |
| bun.WebAssembly.ValueTypeMap.f64 | PropertySignature | wasm.d.ts:15 | number |
| bun.WebAssembly.ValueTypeMap.i32 | PropertySignature | wasm.d.ts:16 | number |
| bun.WebAssembly.ValueTypeMap.i64 | PropertySignature | wasm.d.ts:17 | bigint |
| bun.WebAssembly.ValueTypeMap.v128 | PropertySignature | wasm.d.ts:18 | never |
| bun.WebAssembly.ValueType | TypeAliasDeclaration | wasm.d.ts:21 | keyof ValueTypeMap |
| bun.WebAssembly.GlobalDescriptor | InterfaceDeclaration | wasm.d.ts:23 | GlobalDescriptor&lt;T&gt; |
| bun.WebAssembly.GlobalDescriptor.T | TypeParameter | wasm.d.ts:23 | T |
| bun.WebAssembly.GlobalDescriptor.mutable | PropertySignature | wasm.d.ts:24 | boolean &#124; undefined |
| bun.WebAssembly.GlobalDescriptor.value | PropertySignature | wasm.d.ts:25 | T |
| bun.WebAssembly.Global | InterfaceDeclaration | wasm.d.ts:28 | Global&lt;T&gt; |
| bun.WebAssembly.Global.T | TypeParameter | wasm.d.ts:28 | T |
| bun.WebAssembly.Global.value | PropertySignature | wasm.d.ts:31 | ValueTypeMap[T] |
| bun.WebAssembly.Global.valueOf | MethodSignature | wasm.d.ts:33 | () =&gt; ValueTypeMap[T] |
| bun.WebAssembly.CompileError | InterfaceDeclaration | wasm.d.ts:36 | CompileError |
| bun.WebAssembly.LinkError | InterfaceDeclaration | wasm.d.ts:38 | LinkError |
| bun.WebAssembly.RuntimeError | InterfaceDeclaration | wasm.d.ts:40 | RuntimeError |
| bun.WebAssembly.Instance | InterfaceDeclaration | wasm.d.ts:43 | Instance |
| bun.WebAssembly.Instance.exports | PropertySignature | wasm.d.ts:45 | Exports |
| bun.WebAssembly.Memory | InterfaceDeclaration | wasm.d.ts:49 | Memory |
| bun.WebAssembly.Memory.buffer | PropertySignature | wasm.d.ts:51 | ArrayBuffer |
| bun.WebAssembly.Memory.grow | MethodSignature | wasm.d.ts:53 | (delta: number) =&gt; number |
| bun.WebAssembly.Module | InterfaceDeclaration | wasm.d.ts:57 | Module |
| bun.WebAssembly.Table | InterfaceDeclaration | wasm.d.ts:60 | Table |
| bun.WebAssembly.Table.length | PropertySignature | wasm.d.ts:62 | number |
| bun.WebAssembly.Table.get | MethodSignature | wasm.d.ts:64 | (index: number) =&gt; any |
| bun.WebAssembly.Table.grow | MethodSignature | wasm.d.ts:66 | (delta: number, value?: any) =&gt; number |
| bun.WebAssembly.Table.set | MethodSignature | wasm.d.ts:68 | (index: number, value?: any) =&gt; void |
| bun.WebAssembly.MemoryDescriptor | InterfaceDeclaration | wasm.d.ts:71 | MemoryDescriptor |
| bun.WebAssembly.MemoryDescriptor.initial | PropertySignature | wasm.d.ts:72 | number |
| bun.WebAssembly.MemoryDescriptor.maximum | PropertySignature | wasm.d.ts:73 | number &#124; undefined |
| bun.WebAssembly.MemoryDescriptor.shared | PropertySignature | wasm.d.ts:74 | boolean &#124; undefined |
| bun.WebAssembly.ModuleExportDescriptor | InterfaceDeclaration | wasm.d.ts:77 | ModuleExportDescriptor |
| bun.WebAssembly.ModuleExportDescriptor.kind | PropertySignature | wasm.d.ts:78 | ImportExportKind |
| bun.WebAssembly.ModuleExportDescriptor.name | PropertySignature | wasm.d.ts:79 | string |
| bun.WebAssembly.ModuleImportDescriptor | InterfaceDeclaration | wasm.d.ts:82 | ModuleImportDescriptor |
| bun.WebAssembly.ModuleImportDescriptor.kind | PropertySignature | wasm.d.ts:83 | ImportExportKind |
| bun.WebAssembly.ModuleImportDescriptor.module | PropertySignature | wasm.d.ts:84 | string |
| bun.WebAssembly.ModuleImportDescriptor.name | PropertySignature | wasm.d.ts:85 | string |
| bun.WebAssembly.TableDescriptor | InterfaceDeclaration | wasm.d.ts:88 | TableDescriptor |
| bun.WebAssembly.TableDescriptor.element | PropertySignature | wasm.d.ts:89 | TableKind |
| bun.WebAssembly.TableDescriptor.initial | PropertySignature | wasm.d.ts:90 | number |
| bun.WebAssembly.TableDescriptor.maximum | PropertySignature | wasm.d.ts:91 | number &#124; undefined |
| bun.WebAssembly.WebAssemblyInstantiatedSource | InterfaceDeclaration | wasm.d.ts:94 | WebAssemblyInstantiatedSource |
| bun.WebAssembly.WebAssemblyInstantiatedSource.instance | PropertySignature | wasm.d.ts:95 | Instance |
| bun.WebAssembly.WebAssemblyInstantiatedSource.module | PropertySignature | wasm.d.ts:96 | Module |
| WebAssembly | ModuleDeclaration | wasm.d.ts:101 | typeof WebAssembly |
| WebAssembly.ValueTypeMap | InterfaceDeclaration | wasm.d.ts:102 | ValueTypeMap |
| WebAssembly.GlobalDescriptor | InterfaceDeclaration | wasm.d.ts:103 | GlobalDescriptor&lt;T&gt; |
| WebAssembly.GlobalDescriptor.T | TypeParameter | wasm.d.ts:103 | T |
| WebAssembly.MemoryDescriptor | InterfaceDeclaration | wasm.d.ts:105 | MemoryDescriptor |
| WebAssembly.ModuleExportDescriptor | InterfaceDeclaration | wasm.d.ts:106 | ModuleExportDescriptor |
| WebAssembly.ModuleImportDescriptor | InterfaceDeclaration | wasm.d.ts:107 | ModuleImportDescriptor |
| WebAssembly.TableDescriptor | InterfaceDeclaration | wasm.d.ts:108 | TableDescriptor |
| WebAssembly.WebAssemblyInstantiatedSource | InterfaceDeclaration | wasm.d.ts:109 | WebAssemblyInstantiatedSource |
| WebAssembly.LinkError | InterfaceDeclaration | wasm.d.ts:111 | LinkError |
| WebAssembly.LinkError | VariableDeclaration | wasm.d.ts:112 | { (message?: string &#124; undefined): LinkError; new (message?: string &#124; undefined): LinkError; prototype: LinkError; } |
| WebAssembly.[TypeLiteral] | TypeLiteral | wasm.d.ts:112 | { (message?: string &#124; undefined): LinkError; new (message?: string &#124; undefined): LinkError; prototype: LinkError; } |
| WebAssembly.prototype | PropertySignature | wasm.d.ts:113 | LinkError |
| WebAssembly.[construct] | ConstructSignature | wasm.d.ts:114 | any |
| WebAssembly.[call] | CallSignature | wasm.d.ts:115 | any |
| WebAssembly.CompileError | InterfaceDeclaration | wasm.d.ts:118 | CompileError |
| WebAssembly.CompileError | VariableDeclaration | wasm.d.ts:119 | { (message?: string &#124; undefined): CompileError; new (message?: string &#124; undefined): CompileError; prototype: CompileError; } |
| WebAssembly.[TypeLiteral] | TypeLiteral | wasm.d.ts:119 | { (message?: string &#124; undefined): CompileError; new (message?: string &#124; undefined): CompileError; prototype: CompileError; } |
| WebAssembly.prototype | PropertySignature | wasm.d.ts:120 | CompileError |
| WebAssembly.[construct] | ConstructSignature | wasm.d.ts:121 | any |
| WebAssembly.[call] | CallSignature | wasm.d.ts:122 | any |
| WebAssembly.RuntimeError | InterfaceDeclaration | wasm.d.ts:125 | RuntimeError |
| WebAssembly.RuntimeError | VariableDeclaration | wasm.d.ts:126 | { (message?: string &#124; undefined): RuntimeError; new (message?: string &#124; undefined): RuntimeError; prototype: RuntimeError; } |
| WebAssembly.[TypeLiteral] | TypeLiteral | wasm.d.ts:126 | { (message?: string &#124; undefined): RuntimeError; new (message?: string &#124; undefined): RuntimeError; prototype: RuntimeError; } |
| WebAssembly.prototype | PropertySignature | wasm.d.ts:127 | RuntimeError |
| WebAssembly.[construct] | ConstructSignature | wasm.d.ts:128 | any |
| WebAssembly.[call] | CallSignature | wasm.d.ts:129 | any |
| WebAssembly.Global | InterfaceDeclaration | wasm.d.ts:132 | Global&lt;T&gt; |
| WebAssembly.Global.T | TypeParameter | wasm.d.ts:132 | T |
| WebAssembly.Global | VariableDeclaration | wasm.d.ts:133 | { new &lt;T extends ValueType = keyof ValueTypeMap&gt;(descriptor: GlobalDescriptor&lt;T&gt;, v?: ValueTypeMap[T] &#124; undefined): Global&lt;T&gt;; prototype: Global&lt;...&gt;; } |
| WebAssembly.[TypeLiteral] | TypeLiteral | wasm.d.ts:133 | { new &lt;T extends Bun.WebAssembly.ValueType = keyof ValueTypeMap&gt;(descriptor: GlobalDescriptor&lt;T&gt;, v?: ValueTypeMap[T] &#124; undefined): Global&lt;...&gt;; prototype: Global&lt;...&gt;; } |
| WebAssembly.prototype | PropertySignature | wasm.d.ts:134 | Global&lt;keyof ValueTypeMap&gt; |
| WebAssembly.[construct] | ConstructSignature | wasm.d.ts:135 | any |
| WebAssembly.T | TypeParameter | wasm.d.ts:135 | T |
| WebAssembly.Instance | InterfaceDeclaration | wasm.d.ts:141 | Instance |
| WebAssembly.Instance | VariableDeclaration | wasm.d.ts:142 | { new (module: Module, importObject?: Imports &#124; undefined): Instance; prototype: Instance; } |
| WebAssembly.[TypeLiteral] | TypeLiteral | wasm.d.ts:144 | { Instance: { new (module: Module, importObject?: Imports &#124; undefined): Instance; prototype: Instance; }; } |
| WebAssembly.Instance | PropertySignature | wasm.d.ts:145 | { new (module: Module, importObject?: Imports &#124; undefined): Instance; prototype: Instance; } |
| WebAssembly.Instance.[TypeLiteral] | TypeLiteral | wasm.d.ts:145 | { new (module: Module, importObject?: Imports &#124; undefined): Instance; prototype: Instance; } |
| WebAssembly.Instance.prototype | PropertySignature | wasm.d.ts:146 | Instance |
| WebAssembly.Instance.[construct] | ConstructSignature | wasm.d.ts:147 | any |
| WebAssembly.Memory | InterfaceDeclaration | wasm.d.ts:152 | Memory |
| WebAssembly.Memory | VariableDeclaration | wasm.d.ts:153 | { new (descriptor: MemoryDescriptor): Memory; prototype: Memory; } |
| WebAssembly.[TypeLiteral] | TypeLiteral | wasm.d.ts:153 | { new (descriptor: MemoryDescriptor): Memory; prototype: Memory; } |
| WebAssembly.prototype | PropertySignature | wasm.d.ts:154 | Memory |
| WebAssembly.[construct] | ConstructSignature | wasm.d.ts:155 | any |
| WebAssembly.Module | InterfaceDeclaration | wasm.d.ts:158 | Module |
| WebAssembly.Module | VariableDeclaration | wasm.d.ts:159 | { new (bytes: BufferSource, options?: WebAssemblyCompileOptions &#124; undefined): Module; prototype: Module; customSections(moduleObject: Module, sectionName: string): ArrayBuffer[]; exports(moduleObject: Module): ModuleExportDescriptor[]; imports(moduleObject: Module): ModuleImportDescriptor[]; } |
| WebAssembly.[TypeLiteral] | TypeLiteral | wasm.d.ts:161 | { Module: { new (bytes: BufferSource): Module; prototype: Module; customSections(moduleObject: Module, sectionName: string): ArrayBuffer[]; exports(moduleObject: Module): ModuleExportDescriptor[]; imports(moduleObject: Module): ModuleImportDescriptor[]; }; } |
| WebAssembly.Module | PropertySignature | wasm.d.ts:162 | { new (bytes: BufferSource): Module; prototype: Module; customSections(moduleObject: Module, sectionName: string): ArrayBuffer[]; exports(moduleObject: Module): ModuleExportDescriptor[]; imports(moduleObject: Module): ModuleImportDescriptor[]; } |
| WebAssembly.Module.[TypeLiteral] | TypeLiteral | wasm.d.ts:162 | { new (bytes: BufferSource): Module; prototype: Module; customSections(moduleObject: Module, sectionName: string): ArrayBuffer[]; exports(moduleObject: Module): ModuleExportDescriptor[]; imports(moduleObject: Module): ModuleImportDescriptor[]; } |
| WebAssembly.Module.prototype | PropertySignature | wasm.d.ts:163 | Module |
| WebAssembly.Module.[construct] | ConstructSignature | wasm.d.ts:164 | any |
| WebAssembly.Module.customSections | MethodSignature | wasm.d.ts:166 | (moduleObject: Module, sectionName: string) =&gt; ArrayBuffer[] |
| WebAssembly.Module.exports | MethodSignature | wasm.d.ts:168 | (moduleObject: Module) =&gt; ModuleExportDescriptor[] |
| WebAssembly.Module.imports | MethodSignature | wasm.d.ts:170 | (moduleObject: Module) =&gt; ModuleImportDescriptor[] |
| WebAssembly.Table | InterfaceDeclaration | wasm.d.ts:175 | Table |
| WebAssembly.Table | VariableDeclaration | wasm.d.ts:176 | { new (descriptor: TableDescriptor, value?: any): Table; prototype: Table; } |
| WebAssembly.[TypeLiteral] | TypeLiteral | wasm.d.ts:176 | { new (descriptor: TableDescriptor, value?: any): Table; prototype: Table; } |
| WebAssembly.prototype | PropertySignature | wasm.d.ts:177 | Table |
| WebAssembly.[construct] | ConstructSignature | wasm.d.ts:178 | any |
| WebAssembly.compile | FunctionDeclaration | wasm.d.ts:182 | { (bytes: BufferSource, options?: WebAssemblyCompileOptions &#124; undefined): Promise&lt;Module&gt;; (bytes: BufferSource): Promise&lt;...&gt;; } |
| WebAssembly.compileStreaming | FunctionDeclaration | wasm.d.ts:184 | { (source: PromiseLike&lt;Response&gt; &#124; Response, options?: WebAssemblyCompileOptions &#124; undefined): Promise&lt;Module&gt;; (source: PromiseLike&lt;...&gt; &#124; Response): Promise&lt;...&gt;; } |
| WebAssembly.instantiate | FunctionDeclaration | wasm.d.ts:186 | { (bytes: BufferSource, importObject?: Imports &#124; undefined, options?: WebAssemblyCompileOptions &#124; undefined): Promise&lt;WebAssemblyInstantiatedSource&gt;; (moduleObject: Module, importObject?: Imports &#124; undefined): Promise&lt;...&gt;; (bytes: BufferSource, importObject?: Imports &#124; undefined): Promise&lt;...&gt;; (moduleObject: Modul... |
| WebAssembly.instantiate | FunctionDeclaration | wasm.d.ts:190 | { (bytes: BufferSource, importObject?: Imports &#124; undefined, options?: WebAssemblyCompileOptions &#124; undefined): Promise&lt;WebAssemblyInstantiatedSource&gt;; (moduleObject: Module, importObject?: Imports &#124; undefined): Promise&lt;...&gt;; (bytes: BufferSource, importObject?: Imports &#124; undefined): Promise&lt;...&gt;; (moduleObject: Modul... |
| WebAssembly.instantiateStreaming | FunctionDeclaration | wasm.d.ts:192 | { (source: PromiseLike&lt;Response&gt; &#124; Response, importObject?: Imports &#124; undefined, options?: WebAssemblyCompileOptions &#124; undefined): Promise&lt;...&gt;; (source: PromiseLike&lt;...&gt; &#124; Response, importObject?: Imports &#124; undefined): Promise&lt;...&gt;; } |
| WebAssembly.validate | FunctionDeclaration | wasm.d.ts:197 | { (bytes: BufferSource, options?: WebAssemblyCompileOptions &#124; undefined): boolean; (bytes: BufferSource): boolean; } |
