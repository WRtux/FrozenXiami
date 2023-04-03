/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
"use strict";

void function () {
	let proto = {...EventTarget.prototype};
	// Temporary polyfill. Signals are not natively supported on some targets.
	EventTarget.prototype.addEventListener = function (type, handler, options = null) {
		options = options ?? {};
		let {signal, ...restOpts} = options;
		if (signal != null && !(signal instanceof AbortSignal))
			throw new TypeError();
		proto.addEventListener.call(this, type, handler, restOpts);
		if (signal != null)
			signal.addEventListener('abort', (e) => this.removeEventListener(type, handler, restOpts));
	};
}();

var H = {
	formatHexadec(i, len = 2) {
		i = Number(i);
		if (Number.isNaN(i))
			return 'NaN';
		let sign = (Math.sign(i) !== -1 ? '' : '-');
		i = Math.floor(Math.abs(i));
		return sign + '0x' + i.toString(16).padStart(len, '0').toUpperCase();
	},
	/** @deprecated */
	buildHexadecimal: (i, len) => H.formatHexadec(i, len),
	filterFunction(func) {
		return typeof(func) == "function" ? func : null;
	},
	filterGetFunction(func) {
		return typeof(func) == "function" ? func : () => {};
	},
	/** @deprecated */
	sleepP(t) {
		return new Promise((resolve, reject) => void window.setTimeout(resolve, t));
	},
	/** @deprecated */
	restP() {
		return H.sleepP(0);
	},
	fileSlice(f, start, end = null) {
		if (!(f instanceof Blob))
			throw new TypeError();
		if (end != null && !(end >= 0 && end <= f.size))
			throw new RangeError('File position out of range.');
		return f.slice(start, end ?? undefined);
	},
	_fileRead(f, start, end, enc, signal) {
		if (signal != null && !(signal instanceof AbortSignal))
			throw new TypeError();
		f = H.fileSlice(f, start, end);
		let stub, notify, notifyError;
		stub = new Promise((...args) => [notify, notifyError] = args);
		let fr = new FileReader();
		enc != null ?
			fr.readAsText(f, enc) :
			fr.readAsArrayBuffer(f);
		if (signal != null) {
			!signal.aborted ?
				signal.addEventListener('abort', (e) => fr.abort()) :
				fr.abort();
		}
		fr.addEventListener('load',  (e) => notify(fr.result), {signal});
		fr.addEventListener('abort', (e) => notifyError(fr.error));
		fr.addEventListener('error', (e) => notifyError(fr.error), {signal});
		return stub;
	},
	fileReadArrayBuffer(f, start = null, end = null, signal = null) {
		return H._fileRead(f, start, end, null, signal);
	},
	fileReadToDataView(f, start = null, end = null, signal = null) {
		return H.fileReadArrayBuffer(f, start, end, signal)
			.then((buf) => new DataView(buf));
	},
	fileReadString(f, start = null, end = null, enc = null, signal = null) {
		return H._fileRead(f, start, end, enc ?? 'UTF-8', signal);
	},
	/** @deprecated */
	readFileP: (f) => H.fileReadArrayBuffer(f),
	callOnReadyP(func) {
		if (typeof func !== 'function')
			throw new TypeError();
		return new Promise((resolve, reject) => {
			if (document.readyState !== 'loading')
				return resolve(func(null));
			document.addEventListener('DOMContentLoaded', (e) => {
				try {
					resolve(func());
				} catch (err) {
					reject(err);
				}
			}, {once: true});
		});
	},
	buildElement(typ, attrs, txt) {
		let ele = document.createElement(typ);
		for (let n in attrs) {
			if (attrs[n] != null)
				ele.setAttribute(n, attrs[n]);
		}
		if (txt != null)
			ele.textContent = txt;
		return ele;
	},
	/** @deprecated */
	buildInfoRow(tt, infs) {
		let dfrg = document.createDocumentFragment();
		dfrg.appendChild(this.buildElement("dt", null, tt));
		if (infs != null && !(infs.length == 1 && infs[0] == null)) {
			for (let inf of infs) {
				dfrg.appendChild(this.buildElement("dd", null, inf));
			}
		} else {
			dfrg.appendChild(this.buildElement("dd", {class: "main-infolist-null"}, "无"));
		}
		return dfrg;
	},
	replaceChildrenClass(cont, src, dest) {
		for (let ele of cont.getElementsByClassName(src)) {
			ele.classList.replace(src, dest);
		}
	},
	removeChildren(cont) {
		while (cont.hasChildNodes()) {
			cont.removeChild(cont.firstChild);
		}
	},
	eventBuildMessage(data) {
		return new MessageEvent('message', {data});
	},
	eventResolveMap(etarget, map) {
		if (!(etarget instanceof EventTarget))
			throw new TypeError();
		let stub, notify, notifyError;
		stub = new Promise((...args) => [notify, notifyError] = args);
		let aborter = new AbortController(), signal = aborter.signal;
		for (let typ in map) {
			if (map[typ] == null)
				continue;
			etarget.addEventListener(typ, (e) => {
				try {
					let complete = map[typ](e);
					if (typeof complete === 'boolean' && complete) {
						aborter.abort();
						return notify();
					}
				} catch (err) {
					aborter.abort();
					return notifyError(err);
				}
			}, {signal});
		}
		return stub;
	},
	eventResolve(etarget, type, handler) {
		return H.eventResolveMap(etarget, {[type]: handler});
	},
	workerBuildAbortable(url, signal) {
		if (signal != null && !(signal instanceof AbortSignal))
			throw new TypeError();
		let worker = new Worker(url);
		function abort() {
			worker.dispatchEvent(new ProgressEvent('abort'));
			worker.terminate();
		}
		if (signal != null) {
			!signal.aborted ?
				signal.addEventListener('abort', abort) :
				abort();
		}
		return worker;
	},
	limitInvocation(func, interval, linger = false, block = false) {
		if (typeof func !== 'function')
			throw new TypeError();
		let lastClock = 0;
		let blocked = false, timeout = 0;
		let pendingNotify, pendingNotifyCancel, pendingArgs;
		function request(...args) {
			if (blocked) {
				if (timeout === -1)
					pendingNotifyCancel();
			} else if (timeout !== 0) {
				self.clearTimeout(timeout);
				timeout = 0;
				pendingNotifyCancel();
			}
			let stub = new Promise((...args) => [pendingNotify, pendingNotifyCancel] = args);
			if (blocked) {
				pendingArgs = args;
				if (linger)
					lastClock = self.performance.now();
				timeout = -1;
				return stub;
			}
			let delay = !linger ?
				Math.max(interval - (self.performance.now() - lastClock), 0) :
				interval;
			timeout = self.setTimeout(invoke, delay, ...args);
			return stub;
		}
		async function invoke(...args) {
			if (!linger && !block)
				lastClock = self.performance.now();
			timeout = 0;
			blocked = true;
			let [notify, notifyError] = [pendingNotify, pendingNotifyCancel];
			try {
				notify(!block ? func(...args) : await func(...args));
			} catch (err) {
				notifyError(err);
			}
			blocked = false;
			if (!block)
				return;
			if (!linger)
				lastClock = self.performance.now();
			if (timeout === -1) {
				let delay = !linger ?
					interval :
					Math.max(interval - (self.performance.now() - lastClock), 0);
				timeout = self.setTimeout(invoke, delay, ...pendingArgs);
			}
		}
		return request;
	},
	throttled(func, interval) {
		return H.limitInvocation(func, interval, false, false);
	},
	throttledAwait(func, interval) {
		return H.limitInvocation(func, interval, false, true);
	},
	unrushed(func, cooldown) {
		return H.limitInvocation(func, cooldown, true, false);
	},
	unrushedAwait(func, cooldown) {
		return H.limitInvocation(func, cooldown, true, true);
	},
	Messenger: class extends EventTarget {
		_postMessage(msg) {
			this.dispatchEvent(H.eventBuildMessage(msg));
		}
	}
};
