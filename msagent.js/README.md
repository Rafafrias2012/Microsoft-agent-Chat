# msagent.js

This project is split up into two subcompoennts:

- `@msagent.js/core` contains the core inner workings. This is everything that works on either the Web or node.js.

- `@msagent.js/web` contains most of the public API that msagent.js has exported.


The web project is implicitly dependent on the core project. Do not introduce code that requires Web APIs in the core.
