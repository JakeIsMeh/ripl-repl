import 'virtual:uno.css'

import { mount } from 'ripple';
// @ts-expect-error: known issue, we're working on it
import { App } from './App.ripple';

// TODO: importing this causes the final playground to have a syntax error,
//       regardless of transformer (sucrase, oxc-transform)
// import '@unocss/runtime';

mount(App, {
	target: document.getElementById('app')!,
});
