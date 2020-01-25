
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
function noop() { }
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function validate_store(store, name) {
    if (store != null && typeof store.subscribe !== 'function') {
        throw new Error(`'${name}' is not a store with a 'subscribe' method`);
    }
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
}
const seen_callbacks = new Set();
function flush() {
    do {
        // first, call beforeUpdate functions
        // and update components
        while (dirty_components.length) {
            const component = dirty_components.shift();
            set_current_component(component);
            update(component.$$);
        }
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

function bind(component, name, callback) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        callback(component.$$.ctx[index]);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(children(options.target));
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.0' }, detail)));
}
function append_dev(target, node) {
    dispatch_dev("SvelteDOMInsert", { target, node });
    append(target, node);
}
function insert_dev(target, node, anchor) {
    dispatch_dev("SvelteDOMInsert", { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev("SvelteDOMRemove", { node });
    detach(node);
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
    else
        dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
}
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error(`'target' is a required option`);
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn(`Component was already destroyed`); // eslint-disable-line no-console
        };
    }
}

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

function router(routes) {
    const { set, subscribe } = writable();
    const fallback = routes.findIndex(([p]) => p === "*");
    let current;

    async function route(url) {
        const _url = url.state || url;
        current = routes.findIndex(
            ([p]) => p !== "*" && new RegExp("^" + p + "$").test(_url),
        );

        if (current !== -1) {
            set(routes[current][1]);
        } else if (fallback) {
            set(routes[fallback][1]);
        }

        !url.state && history.pushState(url, null, url);
    }

    const url = window.location.href.replace(/.+\//, "/");
    route(url);

    function click(e) {
        // thanks luke
        const x = e.target.closest("a"),
            y = x && x.getAttribute("href");

        if (
            e.ctrlKey ||
            e.metaKey ||
            e.altKey ||
            e.shiftKey ||
            e.button ||
            e.defaultPrevented
        )
            return;

        if (!y || x.target || x.host !== location.host) return;

        e.preventDefault();
        route(y);
    }

    addEventListener("popstate", route);
    addEventListener("pushstate", route);
    addEventListener("click", click);

    return {
        current: () => current,
        route,
        component: { subscribe },
        destroy: () => {
            removeEventListener("popstate", route);
            removeEventListener("pushstate", route);
            removeEventListener("click", click);
        },
    };
}

/* src/slides/0/Intro.svelte generated by Svelte v3.18.0 */

const file = "src/slides/0/Intro.svelte";

function create_fragment(ctx) {
	let div;
	let p;

	const block = {
		c: function create() {
			div = element("div");
			p = element("p");
			p.textContent = "Press the right arrow once to start the show.";
			attr_dev(p, "class", "svelte-4eyf6x");
			add_location(p, file, 13, 4, 179);
			attr_dev(div, "class", "svelte-4eyf6x");
			add_location(div, file, 12, 0, 169);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, p);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

class Intro extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, null, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Intro",
			options,
			id: create_fragment.name
		});
	}
}

/* src/slides/0/One.svelte generated by Svelte v3.18.0 */

const file$1 = "src/slides/0/One.svelte";

function create_fragment$1(ctx) {
	let div0;
	let p0;
	let t1;
	let div1;
	let p1;

	const block = {
		c: function create() {
			div0 = element("div");
			p0 = element("p");
			p0.textContent = "This is slide 1";
			t1 = space();
			div1 = element("div");
			p1 = element("p");
			p1.textContent = "Desktop only. Move forwards with the right arrow key. Move to a previous\n        screen using the browser back button.";
			attr_dev(p0, "class", "svelte-1mhe25t");
			add_location(p0, file$1, 35, 4, 583);
			attr_dev(div0, "class", "slide-container svelte-1mhe25t");
			add_location(div0, file$1, 34, 0, 549);
			attr_dev(p1, "class", "svelte-1mhe25t");
			add_location(p1, file$1, 39, 4, 640);
			attr_dev(div1, "class", "overlay svelte-1mhe25t");
			add_location(div1, file$1, 38, 0, 614);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div0, anchor);
			append_dev(div0, p0);
			insert_dev(target, t1, anchor);
			insert_dev(target, div1, anchor);
			append_dev(div1, p1);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div0);
			if (detaching) detach_dev(t1);
			if (detaching) detach_dev(div1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

class One extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, null, create_fragment$1, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "One",
			options,
			id: create_fragment$1.name
		});
	}
}

/* src/slides/0/Two.svelte generated by Svelte v3.18.0 */

const file$2 = "src/slides/0/Two.svelte";

function create_fragment$2(ctx) {
	let div1;
	let div0;
	let p;
	let t1;
	let ul;
	let li0;
	let t3;
	let li1;
	let t5;
	let li2;

	const block = {
		c: function create() {
			div1 = element("div");
			div0 = element("div");
			p = element("p");
			p.textContent = "Slide 2, with some bullets";
			t1 = space();
			ul = element("ul");
			li0 = element("li");
			li0.textContent = "I am a bullet.";
			t3 = space();
			li1 = element("li");
			li1.textContent = "I am a bullet.";
			t5 = space();
			li2 = element("li");
			li2.textContent = "I am a bullet.";
			attr_dev(p, "class", "svelte-1ej0n6k");
			add_location(p, file$2, 30, 8, 458);
			attr_dev(li0, "class", "svelte-1ej0n6k");
			add_location(li0, file$2, 32, 12, 517);
			attr_dev(li1, "class", "svelte-1ej0n6k");
			add_location(li1, file$2, 33, 12, 553);
			attr_dev(li2, "class", "svelte-1ej0n6k");
			add_location(li2, file$2, 34, 12, 589);
			attr_dev(ul, "class", "svelte-1ej0n6k");
			add_location(ul, file$2, 31, 8, 500);
			attr_dev(div0, "class", "svelte-1ej0n6k");
			add_location(div0, file$2, 29, 4, 444);
			attr_dev(div1, "class", "slide-container svelte-1ej0n6k");
			add_location(div1, file$2, 28, 0, 410);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div1, anchor);
			append_dev(div1, div0);
			append_dev(div0, p);
			append_dev(div0, t1);
			append_dev(div0, ul);
			append_dev(ul, li0);
			append_dev(ul, t3);
			append_dev(ul, li1);
			append_dev(ul, t5);
			append_dev(ul, li2);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$2.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

class Two extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, null, create_fragment$2, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Two",
			options,
			id: create_fragment$2.name
		});
	}
}

/* src/slides/0/Three.svelte generated by Svelte v3.18.0 */

const file$3 = "src/slides/0/Three.svelte";

function create_fragment$3(ctx) {
	let div1;
	let div0;
	let img;
	let img_src_value;
	let t0;
	let p;

	const block = {
		c: function create() {
			div1 = element("div");
			div0 = element("div");
			img = element("img");
			t0 = space();
			p = element("p");
			p.textContent = "Slide 3, image with caption.";
			if (img.src !== (img_src_value = "./images/kristaps-ungurs-TZq5Og45jdM-unsplash.jpg")) attr_dev(img, "src", img_src_value);
			attr_dev(img, "class", "svelte-1pnnx4v");
			add_location(img, file$3, 35, 8, 519);
			attr_dev(p, "class", "svelte-1pnnx4v");
			add_location(p, file$3, 36, 8, 589);
			attr_dev(div0, "class", "svelte-1pnnx4v");
			add_location(div0, file$3, 34, 4, 505);
			attr_dev(div1, "class", "slide-container svelte-1pnnx4v");
			add_location(div1, file$3, 33, 0, 471);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div1, anchor);
			append_dev(div1, div0);
			append_dev(div0, img);
			append_dev(div0, t0);
			append_dev(div0, p);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$3.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

class Three extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, null, create_fragment$3, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Three",
			options,
			id: create_fragment$3.name
		});
	}
}

/* src/slides/1/One.svelte generated by Svelte v3.18.0 */

const file$4 = "src/slides/1/One.svelte";

function create_fragment$4(ctx) {
	let div;
	let p;

	const block = {
		c: function create() {
			div = element("div");
			p = element("p");
			p.textContent = "This is section 2, slide 1";
			attr_dev(p, "class", "svelte-134p5vd");
			add_location(p, file$4, 35, 4, 586);
			attr_dev(div, "class", "slide-container svelte-134p5vd");
			add_location(div, file$4, 34, 0, 552);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, p);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$4.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

class One$1 extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, null, create_fragment$4, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "One",
			options,
			id: create_fragment$4.name
		});
	}
}

/* src/slides/1/Two.svelte generated by Svelte v3.18.0 */

const file$5 = "src/slides/1/Two.svelte";

function create_fragment$5(ctx) {
	let div1;
	let div0;
	let p;
	let t1;
	let ul;
	let li0;
	let t3;
	let li1;
	let t5;
	let li2;

	const block = {
		c: function create() {
			div1 = element("div");
			div0 = element("div");
			p = element("p");
			p.textContent = "Section 2 - Slide 2, with some bullets";
			t1 = space();
			ul = element("ul");
			li0 = element("li");
			li0.textContent = "I am a bullet.";
			t3 = space();
			li1 = element("li");
			li1.textContent = "I am a bullet.";
			t5 = space();
			li2 = element("li");
			li2.textContent = "I am a bullet.";
			attr_dev(p, "class", "svelte-65ey1g");
			add_location(p, file$5, 30, 8, 461);
			attr_dev(li0, "class", "svelte-65ey1g");
			add_location(li0, file$5, 32, 12, 532);
			attr_dev(li1, "class", "svelte-65ey1g");
			add_location(li1, file$5, 33, 12, 568);
			attr_dev(li2, "class", "svelte-65ey1g");
			add_location(li2, file$5, 34, 12, 604);
			attr_dev(ul, "class", "svelte-65ey1g");
			add_location(ul, file$5, 31, 8, 515);
			attr_dev(div0, "class", "svelte-65ey1g");
			add_location(div0, file$5, 29, 4, 447);
			attr_dev(div1, "class", "slide-container svelte-65ey1g");
			add_location(div1, file$5, 28, 0, 413);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div1, anchor);
			append_dev(div1, div0);
			append_dev(div0, p);
			append_dev(div0, t1);
			append_dev(div0, ul);
			append_dev(ul, li0);
			append_dev(ul, t3);
			append_dev(ul, li1);
			append_dev(ul, t5);
			append_dev(ul, li2);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$5.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

class Two$1 extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, null, create_fragment$5, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Two",
			options,
			id: create_fragment$5.name
		});
	}
}

/* src/slides/1/Three.svelte generated by Svelte v3.18.0 */

const file$6 = "src/slides/1/Three.svelte";

function create_fragment$6(ctx) {
	let div1;
	let div0;
	let img;
	let img_src_value;
	let t0;
	let p;

	const block = {
		c: function create() {
			div1 = element("div");
			div0 = element("div");
			img = element("img");
			t0 = space();
			p = element("p");
			p.textContent = "Section 2 - Slide 3, image with caption.";
			if (img.src !== (img_src_value = "./images/kristaps-ungurs-TZq5Og45jdM-unsplash.jpg")) attr_dev(img, "src", img_src_value);
			attr_dev(img, "class", "svelte-1cdfvdd");
			add_location(img, file$6, 35, 8, 522);
			attr_dev(p, "class", "svelte-1cdfvdd");
			add_location(p, file$6, 36, 8, 592);
			attr_dev(div0, "class", "svelte-1cdfvdd");
			add_location(div0, file$6, 34, 4, 508);
			attr_dev(div1, "class", "slide-container svelte-1cdfvdd");
			add_location(div1, file$6, 33, 0, 474);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div1, anchor);
			append_dev(div1, div0);
			append_dev(div0, img);
			append_dev(div0, t0);
			append_dev(div0, p);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$6.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

class Three$1 extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, null, create_fragment$6, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Three",
			options,
			id: create_fragment$6.name
		});
	}
}

const routes = [
  ["/", Intro],
  ["/1", One],
  ["/2", Two],
  ["/3", Three],
  ["/4", One$1],
  ["/5", Two$1],
  ["/6", Three$1]
];

/* src/App.svelte generated by Svelte v3.18.0 */

function create_fragment$7(ctx) {
	let on_left_action;
	let on_right_action;
	let updating_steps;
	let switch_instance_anchor;
	let current;
	let dispose;

	function switch_instance_steps_binding(value) {
		/*switch_instance_steps_binding*/ ctx[11].call(null, value);
	}

	var switch_value = /*$component*/ ctx[1];

	function switch_props(ctx) {
		let switch_instance_props = {};

		if (/*steps*/ ctx[0] !== void 0) {
			switch_instance_props.steps = /*steps*/ ctx[0];
		}

		return {
			props: switch_instance_props,
			$$inline: true
		};
	}

	if (switch_value) {
		var switch_instance = new switch_value(switch_props(ctx));
		binding_callbacks.push(() => bind(switch_instance, "steps", switch_instance_steps_binding));
	}

	const block = {
		c: function create() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert_dev(target, switch_instance_anchor, anchor);
			current = true;

			dispose = [
				action_destroyer(on_left_action = /*on_left*/ ctx[6].call(null, window, /*next*/ ctx[4])),
				action_destroyer(on_right_action = /*on_right*/ ctx[5].call(null, window, /*prev*/ ctx[3]))
			];
		},
		p: function update(ctx, [dirty]) {
			const switch_instance_changes = {};

			if (!updating_steps && dirty & /*steps*/ 1) {
				updating_steps = true;
				switch_instance_changes.steps = /*steps*/ ctx[0];
				add_flush_callback(() => updating_steps = false);
			}

			if (switch_value !== (switch_value = /*$component*/ ctx[1])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props(ctx));
					binding_callbacks.push(() => bind(switch_instance, "steps", switch_instance_steps_binding));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i: function intro(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$7.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props, $$invalidate) {
	let $component;
	const { component, destroy, route, current } = router(routes);
	validate_store(component, "component");
	component_subscribe($$self, component, value => $$invalidate(1, $component = value));
	let steps;
	let step = 0;
	onDestroy(destroy);

	const prev = () => {
		if (!steps || !steps[step]) {
			route(routes[current() + 1][0]);
			step = 0;
		} else {
			steps[step++]();
		}
	};

	const next = () => {
		if (!steps || !steps[step]) {
			route(routes[current() - 1][0]);
			step = 0;
		} else {
			steps[step--]();
		}
	};

	const on_right = (node, cb) => {
		const handle_down = ({ which }) => {
			if (which === 39) cb();
		};

		node.addEventListener("keydown", handle_down);

		return {
			destroy: () => {
				node.removeEventListener("keydown", handle_down);
			}
		};
	};

	const on_left = (node, cb) => {
		const handle_down = ({ which }) => {
			if (which === 37) cb();
		};

		node.addEventListener("keydown", handle_down);

		return {
			destroy: () => {
				node.removeEventListener("keydown", handle_down);
			}
		};
	};

	function switch_instance_steps_binding(value) {
		steps = value;
		$$invalidate(0, steps);
	}

	$$self.$capture_state = () => {
		return {};
	};

	$$self.$inject_state = $$props => {
		if ("steps" in $$props) $$invalidate(0, steps = $$props.steps);
		if ("step" in $$props) step = $$props.step;
		if ("$component" in $$props) component.set($component = $$props.$component);
	};

	return [
		steps,
		$component,
		component,
		prev,
		next,
		on_right,
		on_left,
		step,
		destroy,
		route,
		current,
		switch_instance_steps_binding
	];
}

class App extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment$7, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "App",
			options,
			id: create_fragment$7.name
		});
	}
}

const app = new App({
	target: document.body,
	intro: true,
});

export default app;
//# sourceMappingURL=main.js.map
