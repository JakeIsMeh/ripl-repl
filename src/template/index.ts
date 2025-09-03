import { mount } from 'ripple';
// @ts-expect-error: known issue, we're working on it
import { App } from './App.ripple';

type testy = number | undefined;
let numero: testy = undefined;
console.log(numero);

mount(App, {
	target: document.getElementById('root')!,
});
