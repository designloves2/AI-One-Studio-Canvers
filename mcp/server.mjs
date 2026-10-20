const __ls = new Map(); globalThis.localStorage ??= { getItem: (k) => __ls.get(k) ?? null, setItem: (k, v) => __ls.set(k, String(v)), removeItem: (k) => __ls.delete(k) };
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/zustand/esm/vanilla.mjs
var createStoreImpl, createStore;
var init_vanilla = __esm({
  "node_modules/zustand/esm/vanilla.mjs"() {
    createStoreImpl = (createState) => {
      let state;
      const listeners2 = /* @__PURE__ */ new Set();
      const setState = (partial, replace) => {
        const nextState = typeof partial === "function" ? partial(state) : partial;
        if (!Object.is(nextState, state)) {
          const previousState = state;
          state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
          listeners2.forEach((listener) => listener(state, previousState));
        }
      };
      const getState = () => state;
      const getInitialState = () => initialState;
      const subscribe = (listener) => {
        listeners2.add(listener);
        return () => listeners2.delete(listener);
      };
      const api = { setState, getState, getInitialState, subscribe };
      const initialState = state = createState(setState, getState, api);
      return api;
    };
    createStore = (createState) => createState ? createStoreImpl(createState) : createStoreImpl;
  }
});

// node_modules/react/cjs/react.production.min.js
var require_react_production_min = __commonJS({
  "node_modules/react/cjs/react.production.min.js"(exports) {
    "use strict";
    var l = Symbol.for("react.element");
    var n2 = Symbol.for("react.portal");
    var p = Symbol.for("react.fragment");
    var q = Symbol.for("react.strict_mode");
    var r = Symbol.for("react.profiler");
    var t = Symbol.for("react.provider");
    var u = Symbol.for("react.context");
    var v = Symbol.for("react.forward_ref");
    var w = Symbol.for("react.suspense");
    var x = Symbol.for("react.memo");
    var y = Symbol.for("react.lazy");
    var z = Symbol.iterator;
    function A(a) {
      if (null === a || "object" !== typeof a) return null;
      a = z && a[z] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var B = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } };
    var C = Object.assign;
    var D = {};
    function E(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    E.prototype.isReactComponent = {};
    E.prototype.setState = function(a, b) {
      if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a, b, "setState");
    };
    E.prototype.forceUpdate = function(a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    };
    function F() {
    }
    F.prototype = E.prototype;
    function G(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    var H = G.prototype = new F();
    H.constructor = G;
    C(H, E.prototype);
    H.isPureReactComponent = true;
    var I = Array.isArray;
    var J = Object.prototype.hasOwnProperty;
    var K = { current: null };
    var L = { key: true, ref: true, __self: true, __source: true };
    function M(a, b, e) {
      var d, c = {}, k = null, h = null;
      if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
      var g = arguments.length - 2;
      if (1 === g) c.children = e;
      else if (1 < g) {
        for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
        c.children = f;
      }
      if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
      return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
    }
    function N(a, b) {
      return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
    }
    function O(a) {
      return "object" === typeof a && null !== a && a.$$typeof === l;
    }
    function escape(a) {
      var b = { "=": "=0", ":": "=2" };
      return "$" + a.replace(/[=:]/g, function(a2) {
        return b[a2];
      });
    }
    var P2 = /\/+/g;
    function Q(a, b) {
      return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
    }
    function R(a, b, e, d, c) {
      var k = typeof a;
      if ("undefined" === k || "boolean" === k) a = null;
      var h = false;
      if (null === a) h = true;
      else switch (k) {
        case "string":
        case "number":
          h = true;
          break;
        case "object":
          switch (a.$$typeof) {
            case l:
            case n2:
              h = true;
          }
      }
      if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P2, "$&/") + "/"), R(c, b, e, "", function(a2) {
        return a2;
      })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P2, "$&/") + "/") + a)), b.push(c)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I(a)) for (var g = 0; g < a.length; g++) {
        k = a[g];
        var f = d + Q(k, g);
        h += R(k, b, e, f, c);
      }
      else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
      else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S(a, b, e) {
      if (null == a) return a;
      var d = [], c = 0;
      R(a, d, "", "", function(a2) {
        return b.call(e, a2, c++);
      });
      return d;
    }
    function T(a) {
      if (-1 === a._status) {
        var b = a._result;
        b = b();
        b.then(function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
        }, function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
        });
        -1 === a._status && (a._status = 0, a._result = b);
      }
      if (1 === a._status) return a._result.default;
      throw a._result;
    }
    var U = { current: null };
    var V = { transition: null };
    var W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
    function X() {
      throw Error("act(...) is not supported in production builds of React.");
    }
    exports.Children = { map: S, forEach: function(a, b, e) {
      S(a, function() {
        b.apply(this, arguments);
      }, e);
    }, count: function(a) {
      var b = 0;
      S(a, function() {
        b++;
      });
      return b;
    }, toArray: function(a) {
      return S(a, function(a2) {
        return a2;
      }) || [];
    }, only: function(a) {
      if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
      return a;
    } };
    exports.Component = E;
    exports.Fragment = p;
    exports.Profiler = r;
    exports.PureComponent = G;
    exports.StrictMode = q;
    exports.Suspense = w;
    exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
    exports.act = X;
    exports.cloneElement = function(a, b, e) {
      if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
      var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
      if (null != b) {
        void 0 !== b.ref && (k = b.ref, h = K.current);
        void 0 !== b.key && (c = "" + b.key);
        if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
        for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
      }
      var f = arguments.length - 2;
      if (1 === f) d.children = e;
      else if (1 < f) {
        g = Array(f);
        for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
        d.children = g;
      }
      return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
    };
    exports.createContext = function(a) {
      a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a.Provider = { $$typeof: t, _context: a };
      return a.Consumer = a;
    };
    exports.createElement = M;
    exports.createFactory = function(a) {
      var b = M.bind(null, a);
      b.type = a;
      return b;
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(a) {
      return { $$typeof: v, render: a };
    };
    exports.isValidElement = O;
    exports.lazy = function(a) {
      return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
    };
    exports.memo = function(a, b) {
      return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
    };
    exports.startTransition = function(a) {
      var b = V.transition;
      V.transition = {};
      try {
        a();
      } finally {
        V.transition = b;
      }
    };
    exports.unstable_act = X;
    exports.useCallback = function(a, b) {
      return U.current.useCallback(a, b);
    };
    exports.useContext = function(a) {
      return U.current.useContext(a);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(a) {
      return U.current.useDeferredValue(a);
    };
    exports.useEffect = function(a, b) {
      return U.current.useEffect(a, b);
    };
    exports.useId = function() {
      return U.current.useId();
    };
    exports.useImperativeHandle = function(a, b, e) {
      return U.current.useImperativeHandle(a, b, e);
    };
    exports.useInsertionEffect = function(a, b) {
      return U.current.useInsertionEffect(a, b);
    };
    exports.useLayoutEffect = function(a, b) {
      return U.current.useLayoutEffect(a, b);
    };
    exports.useMemo = function(a, b) {
      return U.current.useMemo(a, b);
    };
    exports.useReducer = function(a, b, e) {
      return U.current.useReducer(a, b, e);
    };
    exports.useRef = function(a) {
      return U.current.useRef(a);
    };
    exports.useState = function(a) {
      return U.current.useState(a);
    };
    exports.useSyncExternalStore = function(a, b, e) {
      return U.current.useSyncExternalStore(a, b, e);
    };
    exports.useTransition = function() {
      return U.current.useTransition();
    };
    exports.version = "18.3.1";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.3.1";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text3) {
          return text3.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c) {
                return c;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              nextName = nextNamePrefix + getElementKey(child, i);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n2 = 0;
          mapChildren(children, function() {
            n2++;
          });
          return n2;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo3(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState2(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init);
        }
        function useRef(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect2(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create2, deps);
        }
        function useInsertionEffect(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create2, deps);
        }
        function useLayoutEffect(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create2, deps);
        }
        function useCallback(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create2, deps);
        }
        function useImperativeHandle(ref, create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create2, deps);
        }
        function useDebugValue(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location2, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location2 + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location2, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location2, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location2, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i = 2; i < arguments.length; i++) {
              validateChildKeys(arguments[i], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i = 2; i < arguments.length; i++) {
            validateChildKeys(arguments[i], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module && module[requireString];
              enqueueTaskImpl = nodeRequire.call(module, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve, reject);
                    } else {
                      resolve(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                    } else {
                      resolve(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve, reject) {
                    resolve(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i = 0;
              try {
                for (; i < queue.length; i++) {
                  var callback = queue[i];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports.Children = Children;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports.act = act;
        exports.cloneElement = cloneElement$1;
        exports.createContext = createContext;
        exports.createElement = createElement$1;
        exports.createFactory = createFactory;
        exports.createRef = createRef;
        exports.forwardRef = forwardRef;
        exports.isValidElement = isValidElement;
        exports.lazy = lazy;
        exports.memo = memo3;
        exports.startTransition = startTransition;
        exports.unstable_act = act;
        exports.useCallback = useCallback;
        exports.useContext = useContext;
        exports.useDebugValue = useDebugValue;
        exports.useDeferredValue = useDeferredValue;
        exports.useEffect = useEffect2;
        exports.useId = useId;
        exports.useImperativeHandle = useImperativeHandle;
        exports.useInsertionEffect = useInsertionEffect;
        exports.useLayoutEffect = useLayoutEffect;
        exports.useMemo = useMemo;
        exports.useReducer = useReducer;
        exports.useRef = useRef;
        exports.useState = useState2;
        exports.useSyncExternalStore = useSyncExternalStore;
        exports.useTransition = useTransition;
        exports.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_production_min();
    } else {
      module.exports = require_react_development();
    }
  }
});

// node_modules/zustand/esm/react.mjs
function useStore(api, selector = identity) {
  const slice = import_react.default.useSyncExternalStore(
    api.subscribe,
    import_react.default.useCallback(() => selector(api.getState()), [api, selector]),
    import_react.default.useCallback(() => selector(api.getInitialState()), [api, selector])
  );
  import_react.default.useDebugValue(slice);
  return slice;
}
var import_react, identity, createImpl, create;
var init_react = __esm({
  "node_modules/zustand/esm/react.mjs"() {
    import_react = __toESM(require_react(), 1);
    init_vanilla();
    identity = (arg) => arg;
    createImpl = (createState) => {
      const api = createStore(createState);
      const useBoundStore = (selector) => useStore(api, selector);
      Object.assign(useBoundStore, api);
      return useBoundStore;
    };
    create = (createState) => createState ? createImpl(createState) : createImpl;
  }
});

// node_modules/zustand/esm/index.mjs
var init_esm = __esm({
  "node_modules/zustand/esm/index.mjs"() {
    init_vanilla();
    init_react();
  }
});

// src/store/settings.ts
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
var DEFAULT_LLM, KEY, useSettings;
var init_settings = __esm({
  "src/store/settings.ts"() {
    "use strict";
    init_esm();
    DEFAULT_LLM = {
      backend: "custom",
      gguf_model: "",
      mmproj_file: "none",
      n_ctx: 4096,
      n_gpu_layers: -1,
      text_encoder_name: "",
      clip_loader_type: "Auto",
      or_model_text: "google/gemini-2.5-flash",
      or_model_vision: "google/gemini-2.5-flash",
      custom_base: "http://localhost:3000/v1",
      custom_model: "",
      custom_ctx: 0,
      temperature: 0.7,
      max_tokens: 1e3
    };
    KEY = "canvers.settings.v1";
    useSettings = create((set2, get) => {
      const saved = load();
      const persist = () => {
        const { comfyUrl, llm, live, models, saveSubfolder, music, video, hostPanels } = get();
        try {
          localStorage.setItem(KEY, JSON.stringify({ comfyUrl, llm, live, models, saveSubfolder, music, video, hostPanels }));
        } catch {
        }
      };
      return {
        comfyUrl: saved.comfyUrl ?? "",
        llm: { ...DEFAULT_LLM, ...saved.llm ?? {} },
        live: { same: saved.live?.same ?? true, llm: { ...DEFAULT_LLM, temperature: 0.5, max_tokens: 3500, ...saved.live?.llm ?? {} } },
        keys: { custom: "", openrouter: "" },
        models: saved.models ?? {},
        saveSubfolder: saved.saveSubfolder ?? "ai-one-canvers",
        hostPanels: saved.hostPanels ?? false,
        music: saved.music ?? {},
        video: saved.video ?? {},
        setVideo: (k, v) => {
          set2({ video: { ...get().video, [k]: v } });
          persist();
        },
        setMusic: (k, v) => {
          set2({ music: { ...get().music, [k]: v } });
          persist();
        },
        set: (patch) => {
          set2(patch);
          persist();
        },
        setLlm: (patch) => {
          set2({ llm: { ...get().llm, ...patch } });
          persist();
        },
        setLive: (patch) => {
          set2({ live: { ...get().live, ...patch } });
          persist();
        },
        setLiveLlm: (patch) => {
          set2({ live: { ...get().live, llm: { ...get().live.llm, ...patch } } });
          persist();
        },
        setKey: (which, v) => set2({ keys: { ...get().keys, [which]: v } }),
        setModel: (family, patch) => {
          const cur = get().models[family] ?? { model: "", textEncoder: "", vae: "" };
          set2({ models: { ...get().models, [family]: { ...cur, ...patch } } });
          persist();
        }
      };
    });
  }
});

// src/backend/http.ts
function wsUrl(clientId2) {
  const b = base();
  if (b) return b.replace(/^http/, "ws") + `/ws?clientId=${clientId2}`;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws?clientId=${clientId2}`;
}
async function getJson(path2) {
  const r = await fetch(url(path2));
  if (!r.ok) throw new Error(`${path2}: HTTP ${r.status}`);
  return r.json();
}
async function postJson(path2, body) {
  const r = await fetch(url(path2), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path2}: HTTP ${r.status}`);
  return r.json();
}
var base, url;
var init_http = __esm({
  "src/backend/http.ts"() {
    "use strict";
    init_settings();
    base = () => useSettings.getState().comfyUrl.replace(/\/+$/, "");
    url = (path2) => base() + path2;
  }
});

// src/backend/comfy.ts
var comfy_exports = {};
__export(comfy_exports, {
  assetFromFile: () => assetFromFile,
  clientId: () => clientId,
  ensureInput: () => ensureInput,
  fetchBlob: () => fetchBlob,
  freeModels: () => freeModels,
  interrupt: () => interrupt,
  objectInfo: () => objectInfo,
  onSocket: () => onSocket,
  runPrompt: () => runPrompt,
  systemStats: () => systemStats,
  uid: () => uid,
  uploadToInput: () => uploadToInput,
  viewUrl: () => viewUrl
});
async function systemStats() {
  return getJson("/system_stats");
}
async function objectInfo(cls) {
  return getJson(`/object_info/${encodeURIComponent(cls)}`);
}
function friendlyError(m) {
  if (/VHS failed to extract audio/i.test(m)) return "This video has no sound track, and the video loader needs one. Add a sound track first (Add Audio to Video card), or use a clip that was generated here.";
  return m;
}
async function interrupt() {
  try {
    await fetch(url("/interrupt"), { method: "POST" });
  } catch {
  }
}
async function uploadToInput(blob, name) {
  const ext = blob.type.includes("jpeg") ? "jpg" : blob.type.includes("webp") ? "webp" : blob.type.includes("mp4") ? "mp4" : blob.type.includes("webm") ? "webm" : "png";
  const fd = new FormData();
  fd.append("image", blob, name ?? `canvers_${uid("")}.${ext}`);
  fd.append("type", "input");
  fd.append("overwrite", "true");
  const r = await fetch(url("/upload/image"), { method: "POST", body: fd });
  if (!r.ok) throw new Error(`upload failed: HTTP ${r.status}`);
  const j = await r.json();
  return { filename: j.name, subfolder: j.subfolder ?? "", type: "input" };
}
async function fetchBlob(a) {
  const u = typeof a === "string" ? a : a.url;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`cannot read ${u}: HTTP ${r.status}`);
  return r.blob();
}
async function ensureInput(a) {
  if (a.file?.type === "input") return a.file.subfolder ? `${a.file.subfolder}/${a.file.filename}` : a.file.filename;
  const ref = await uploadToInput(await fetchBlob(a));
  return ref.filename;
}
function assetFromFile(f, type = "image", port) {
  return { id: uid(), type, url: viewUrl(f), file: f, port };
}
function openSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return Promise.resolve();
  if (opening) return opening;
  opening = new Promise((resolve) => {
    const s = new WebSocket(wsUrl(clientId));
    ws = s;
    s.onopen = () => {
      opening = null;
      resolve();
    };
    s.onerror = () => {
      opening = null;
      resolve();
    };
    s.onclose = () => {
      ws = null;
      opening = null;
    };
    s.binaryType = "blob";
    s.onmessage = (ev) => {
      if (typeof ev.data !== "string") {
        void ev.data.arrayBuffer().then((buf2) => {
          const v = new DataView(buf2);
          const kind = v.getUint32(0);
          if (kind === 1 || kind === 4) {
            const fmt = v.getUint32(4);
            const blob = new Blob([buf2.slice(kind === 4 ? 8 + v.getUint32(4) : 8)], { type: fmt === 2 ? "image/png" : "image/jpeg" });
            for (const l of listeners) l({ type: "b_preview", data: blob });
          }
        });
        return;
      }
      try {
        const m = JSON.parse(ev.data);
        for (const l of listeners) l(m);
      } catch {
      }
    };
  });
  return opening;
}
function onSocket(l) {
  listeners.add(l);
  void openSocket();
  return () => listeners.delete(l);
}
async function runPrompt(graph, opts = {}) {
  await openSocket();
  const res = await fetch(url("/prompt"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: graph, client_id: clientId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const nodeErr = data.node_errors ? Object.values(data.node_errors).map((n2) => (n2.errors ?? []).map((e) => e.message + (e.details ? ` (${e.details})` : "")).join("; ")).filter(Boolean).join(" | ") : "";
    throw new Error([data.error?.message, nodeErr].filter(Boolean).join(" \u2014 ") || `queue failed: HTTP ${res.status}`);
  }
  const promptId = data.prompt_id;
  return new Promise((resolve, reject) => {
    const out = { promptId, images: [], videos: [], audios: [], texts: [], raw: {} };
    let settled = false;
    let poll;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      off();
      if (poll) clearInterval(poll);
      opts.signal?.removeEventListener("abort", onAbort);
      if (err) return reject(err);
      if (out.images.length || out.videos.length || out.audios.length || out.texts.length) return resolve(out);
      void (async () => {
        for (let i = 0; i < 6; i++) {
          try {
            const h = (await getJson(`/history/${promptId}`))[promptId];
            if (h?.outputs && Object.keys(h.outputs).length) {
              for (const [nid, o] of Object.entries(h.outputs)) collect(nid, o);
              break;
            }
          } catch {
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        resolve(out);
      })();
    };
    const collect = (nodeId, output) => {
      out.raw[nodeId] = output;
      for (const im of output?.images ?? []) out.images.push({ filename: im.filename, subfolder: im.subfolder ?? "", type: im.type ?? "output" });
      for (const v of output?.gifs ?? output?.videos ?? []) out.videos.push({ filename: v.filename, subfolder: v.subfolder ?? "", type: v.type ?? "output" });
      for (const a of output?.audio ?? []) out.audios.push({ filename: a.filename, subfolder: a.subfolder ?? "", type: a.type ?? "output" });
      for (const tx of output?.text ?? []) out.texts.push(String(tx));
    };
    const off = onSocket((m) => {
      const d = m.data ?? {};
      if (d.prompt_id && d.prompt_id !== promptId) return;
      if (m.type === "progress" && d.max) opts.onProgress?.(Math.round(d.value / d.max * 100), `${d.value}/${d.max}`);
      else if (m.type === "executing" && d.node === null) finish();
      else if (m.type === "executed") collect(String(d.node), d.output);
      else if (m.type === "execution_success") finish();
      else if (m.type === "execution_error") finish(new Error(friendlyError(d.exception_message || "execution error")));
      else if (m.type === "execution_interrupted") finish(new Error("cancelled"));
    });
    const onAbort = () => {
      void interrupt();
      finish(new Error("cancelled"));
    };
    opts.signal?.addEventListener("abort", onAbort);
    poll = setInterval(async () => {
      try {
        const h = await getJson(`/history/${promptId}`);
        const e = h[promptId];
        if (!e) return;
        if (e.status?.status_str === "error") {
          const msg = (e.status.messages ?? []).find((x) => x[0] === "execution_error")?.[1]?.exception_message;
          return finish(new Error(friendlyError(msg || "execution error")));
        }
        if (e.outputs && (e.status?.completed || Object.keys(e.outputs).length)) {
          out.images = [];
          out.videos = [];
          out.audios = [];
          out.texts = [];
          for (const [nid, o] of Object.entries(e.outputs)) collect(nid, o);
          if (e.status?.completed) finish();
        }
      } catch {
      }
    }, 1500);
  });
}
async function freeModels() {
  try {
    await postJson("/free", { unload_models: true, free_memory: true });
  } catch {
  }
}
var clientId, viewUrl, uid, ws, listeners, opening;
var init_comfy = __esm({
  "src/backend/comfy.ts"() {
    "use strict";
    init_http();
    clientId = globalThis.crypto?.randomUUID?.() ?? String(Math.random()).slice(2);
    viewUrl = (f) => url(`/view?filename=${encodeURIComponent(f.filename)}&subfolder=${encodeURIComponent(f.subfolder)}&type=${f.type}`);
    uid = (p = "a") => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    ws = null;
    listeners = /* @__PURE__ */ new Set();
    opening = null;
  }
});

// mcp/server.ts
init_settings();
import fs from "node:fs";
import path from "node:path";

// src/registry/index.ts
var sel = (id, label, options, def, extra = {}) => ({ id, label, control: { kind: "select", options }, default: def, ...extra });
var dyn = (id, label, source, def = "none", extra = {}) => ({ id, label, control: { kind: "select", options: [def], source }, default: def, ...extra });
var slider = (id, label, min, max, step, def, extra = {}) => ({ id, label, control: { kind: "slider", min, max, step }, default: def, ...extra });
var num = (id, label, def, extra = {}, min, max, step) => ({ id, label, control: { kind: "number", min, max, step }, default: def, ...extra });
var text = (id, label, def = "", multiline = false, extra = {}) => ({ id, label, control: { kind: "text", multiline }, default: def, ...extra });
var toggle = (id, label, def = false, extra = {}) => ({ id, label, control: { kind: "toggle" }, default: def, ...extra });
var ASPECTS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"];
var aspect = (def = "1:1") => sel("aspect", "Aspect ratio", ASPECTS, def);
var seed = { id: "seed", label: "Seed", control: { kind: "seed" }, default: -1, advanced: true };
var megapixels = (def = 1) => slider("megapixels", "Size (MP)", 0.25, 4, 0.25, def);
var sampler = (steps, cfg, smp, sch = "simple") => [
  slider("steps", "Steps", 1, 60, 1, steps, { advanced: true }),
  slider("cfg", "Guidance", 0, 15, 0.1, cfg, { advanced: true }),
  dyn("sampler", "Sampler", "samplers", smp, { advanced: true }),
  dyn("scheduler", "Scheduler", "schedulers", sch, { advanced: true })
];
var loras = (fam) => [
  dyn("lora1", "LoRA 1", `loras:${fam}`, "none", { advanced: true }),
  slider("lora1_strength", "LoRA 1 strength", 0, 2, 0.05, 1, { advanced: true, when: (p) => p.lora1 !== "none" }),
  dyn("lora2", "LoRA 2", `loras:${fam}`, "none", { advanced: true }),
  slider("lora2_strength", "LoRA 2 strength", 0, 2, 0.05, 1, { advanced: true, when: (p) => p.lora2 !== "none" })
];
var negative = text("negative", "Negative prompt", "", true, { advanced: true });
var sizeParams = (on) => on ? [aspect(), megapixels()] : [];
var krea2 = (id, label, extra = [], size = false) => ({
  id,
  label,
  family: "krea2",
  params: [...sizeParams(size), ...extra, ...sampler(8, 1, "euler"), negative, ...loras("krea2"), num("batch", "Batch", 1, { advanced: true }, 1, 4, 1), seed]
});
var anima = (id, label, extra = [], size = false) => ({
  id,
  label,
  family: "anima",
  params: [...sizeParams(size), ...extra, ...sampler(30, 4, "euler"), negative, ...loras("anima"), num("batch", "Batch", 1, { advanced: true }, 1, 4, 1), seed]
});
var qwen = (id, label, extra = [], size = false) => ({
  id,
  label,
  family: "qwen",
  params: [...sizeParams(size), ...extra, ...sampler(20, 4, "euler"), negative, ...loras("qwen"), num("batch", "Batch", 1, { advanced: true }, 1, 4, 1), seed]
});
var qwen21 = (id, label, extra = [], size = false) => ({
  id,
  label,
  family: "qwen21",
  params: [...sizeParams(size), ...extra, ...sampler(20, 1, "euler"), negative, ...loras("qwen21"), num("batch", "Batch", 1, { advanced: true }, 1, 4, 1), seed]
});
var sdxl = (id, label, extra = [], size = false) => ({
  id,
  label,
  family: "sdxl",
  params: [...sizeParams(size), ...extra, ...sampler(20, 7, "euler_ancestral", "karras"), { ...negative, default: "low quality, blurry, deformed, watermark" }, ...loras("sdxl"), num("batch", "Batch", 1, { advanced: true }, 1, 4, 1), seed]
});
var h3Params = (ref) => [
  sel("aspect", "Aspect ratio", [...ASPECTS, "auto"], "16:9"),
  megapixels(0.9),
  slider("seconds", "Clip length (s)", 5.2, 15, 0.5, 8),
  ...ref ? [] : [sel("continuity", "Several clips (separate prompts with ---)", ["none", "lastframe", "onetake"], "lastframe"), toggle("stitch", "Stitch clips into one video", true)],
  slider("steps", "Steps (no turbo)", 1, 60, 1, 20, { advanced: true }),
  dyn("sampler", "Sampler", "samplers", "er_sde", { advanced: true }),
  dyn("scheduler", "Scheduler", "schedulers", "simple", { advanced: true }),
  dyn("upscale_model", "Upscale model (after render)", "upscalers", "none", { advanced: true }),
  seed
];
var klein = (id, label, extra = [], size = false) => ({
  id,
  label,
  family: "klein",
  params: [...sizeParams(size), ...extra, ...sampler(4, 1, "euler"), negative, ...loras("klein"), num("batch", "Batch", 1, { advanced: true }, 1, 4, 1), seed]
});
var zimage = (id, label, extra = [], size = false) => ({
  id,
  label,
  family: "zimage",
  params: [...sizeParams(size), ...extra, ...sampler(8, 1, "euler"), negative, ...loras("zimage"), num("batch", "Batch", 1, { advanced: true }, 1, 4, 1), seed]
});
var P = {
  textIn: (id = "prompt", label = "Prompt", optional = false) => ({ id, label, type: "text", optional }),
  textOut: (id = "text", label = "Text") => ({ id, label, type: "text" }),
  imgIn: (id = "image", label = "Image", optional = false, multi = false) => ({ id, label, type: "image", optional, multi }),
  imgOut: (id = "image", label = "Image") => ({ id, label, type: "image" }),
  maskIn: (id = "mask", label = "Mask", optional = false) => ({ id, label, type: "mask", optional }),
  maskOut: (id = "mask", label = "Mask") => ({ id, label, type: "mask" }),
  loraIn: () => ({ id: "loras", label: "LoRA cards", type: "lora", optional: true, multi: true }),
  cardIn: (label = "Option cards") => ({ id: "cards", label, type: "pipe", optional: true, multi: true }),
  seedIn: () => ({ id: "seed_in", label: "Seed", type: "number", optional: true })
};
var edit = (id, title, params, description, inputs = [P.imgIn()], outputs = [P.imgOut()]) => ({ id, title, category: "Edit", kind: "edit", inputs, outputs, params, description });
var REGISTRY = [
  // ============================================================ Text / LLM
  {
    id: "prompt",
    title: "Prompt",
    category: "Text / LLM",
    kind: "source",
    inputs: [{ id: "vars", label: "Add-ons", type: "text", optional: true, multi: true }],
    outputs: [P.textOut()],
    params: [text("text", "Prompt", "", true)],
    description: "Free text. Anything wired into Add-ons is appended."
  },
  {
    id: "concat",
    title: "Prompt Concatenator",
    category: "Text / LLM",
    kind: "source",
    inputs: [{ id: "texts", label: "Texts", type: "text", multi: true }],
    outputs: [P.textOut()],
    params: [text("separator", "Separator", ", ")],
    description: "Join several texts into one."
  },
  {
    id: "llm-tj",
    title: "LLM (TJ)",
    category: "Text / LLM",
    kind: "llm",
    inputs: [P.textIn("text", "Text", true), P.imgIn("image", "Image", true)],
    outputs: [P.textOut()],
    params: [text("system", "System prompt", "You are a helpful assistant. Answer concisely.", true), text("prompt", "Prompt", "", true), slider("temperature", "Temperature (0 = settings)", 0, 2, 0.05, 0, { advanced: true })],
    description: "Ask any model. Backend (Local GGUF \xB7 ComfyUI TextGenerate \xB7 OpenRouter \xB7 Connect Custom) is chosen in Settings."
  },
  {
    id: "prompt-enhancer",
    title: "Prompt Enhancer",
    category: "Text / LLM",
    kind: "llm",
    inputs: [P.textIn("text", "Text"), P.imgIn("image", "Reference images (optional)", true, true)],
    outputs: [P.textOut()],
    params: [dyn("fmt", "Write for", "promptformats", "auto"), dyn("aes", "Aesthetic", "promptaesthetics", "None (no aesthetic injection)"), sel("purpose", "For", ["Image", "Video"], "Image"), text("style", "Guidelines", "Rewrite as a rich, detailed generation prompt. Keep the core idea.", true), toggle("english", "Write in English", true, { advanced: true })],
    description: "Rewrites a short idea into a detailed prompt."
  },
  {
    id: "music-writer",
    title: "Music Writer (LLM)",
    category: "Text / LLM",
    kind: "llm",
    inputs: [P.textIn("text", "Idea / theme / lyrics")],
    outputs: [P.textOut()],
    params: [sel("task", "Write", ["lyrics from theme", "lyrics from title", "enhance lyrics", "style caption \u2014 Ace-Step", "style caption \u2014 MiniMax Music", "style caption \u2014 YuE2", "cover prompt", "song title"], "lyrics from theme")],
    description: "Uses your LLM and the MusicMaker prompt library to write lyrics, a style caption, a cover prompt or a title. Wire the result into Music Generate."
  },
  {
    id: "image-describer",
    title: "Image Describer",
    category: "Text / LLM",
    kind: "llm",
    inputs: [P.imgIn()],
    outputs: [P.textOut()],
    params: [sel("task", "Describe as", ["Plain description", "Generation prompt", "Booru-style tags", "Pose & anatomy"], "Generation prompt"), text("guidelines", "Extra guidelines", "", true)],
    description: "Turns an image into text with a vision model."
  },
  // ============================================================ Image generation
  {
    id: "image-generate",
    title: "Image Generate",
    category: "Image",
    kind: "generate",
    inputs: [P.textIn(), P.loraIn(), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [
      { ...zimage("zimage", "Z-Image Turbo (local)", [], true), default: true },
      klein("klein", "Flux.2 Klein (local)", [], true),
      krea2("krea2", "Krea 2 (local)", [], true),
      sdxl("sdxl", "SDXL (local)", [], true),
      anima("anima", "Anima (local)", [], true),
      qwen("qwen", "Qwen Image Edit 2511 (local)", [], true),
      qwen21("qwen21", "Qwen Image 2.1 (local)", [], true)
    ],
    description: "Text to image on your own ComfyUI."
  },
  {
    id: "image-edit",
    title: "Image Edit",
    category: "Image",
    kind: "generate",
    inputs: [P.textIn(), P.imgIn("image", "Images", false, true), P.loraIn(), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [
      { ...klein("klein-edit", "Flux.2 Klein \u2014 edit with references (local)"), default: true },
      qwen21("qwen21-edit", "Qwen Image 2.1 \u2014 up to 10 references (local)"),
      { ...qwen("qwen-edit", "Qwen Image Edit 2511 \u2014 up to 3 references (local)") },
      klein("klein-i2i", "Flux.2 Klein \u2014 img2img (local)", [slider("denoise", "Denoise", 0.05, 1, 0.05, 0.75)]),
      zimage("zimage-i2i", "Z-Image Turbo \u2014 img2img (local)", [slider("denoise", "Denoise", 0.05, 1, 0.05, 0.75)]),
      krea2("krea2-i2i", "Krea 2 \u2014 img2img (local)", [slider("denoise", "Denoise", 0.05, 1, 0.05, 0.75)]),
      anima("anima-i2i", "Anima \u2014 img2img (local)", [slider("denoise", "Denoise", 0.05, 1, 0.05, 0.75)]),
      sdxl("sdxl-i2i", "SDXL \u2014 img2img (local)", [slider("denoise", "Denoise", 0.05, 1, 0.05, 0.6)])
    ],
    description: "Edit or restyle images. The first image sets the output size."
  },
  {
    id: "controlnet",
    title: "ControlNet Generate (Z-Image)",
    category: "Image",
    kind: "generate",
    inputs: [P.textIn(), P.imgIn("image", "Control image"), P.loraIn(), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [{ ...zimage("zimage-cn", "Z-Image Turbo Fun ControlNet (local)", [dyn("cn_patch", "ControlNet model", "modelpatches", "none"), dyn("cn_pre", "Preprocessor", "preprocessors", "DepthAnythingPreprocessor"), slider("cn_strength", "Control strength", 0, 2, 0.05, 1), num("cn_res", "Preprocess resolution", 1024, { advanced: true }, 256, 2048, 64)]), default: true }],
    description: "Generate following the pose / depth / edges of a control image (preprocessor + Z-Image Fun ControlNet)."
  },
  {
    id: "krea2-control",
    title: "ControlNet Generate (Krea 2)",
    category: "Image",
    kind: "generate",
    inputs: [P.textIn(), P.imgIn("image", "Control image"), P.loraIn(), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [{ ...krea2("krea2-ctrl", "Krea 2 depth / canny control (local)", [sel("kc_type", "Control type", ["depth", "canny"], "depth"), dyn("kc_lora", "Control LoRA", "loras:krea2", "none"), slider("kc_strength", "Control strength", 0, 2, 0.05, 1), num("kc_res", "Preprocess resolution", 512, { advanced: true }, 256, 2048, 64), num("canny_low", "Canny low", 100, { advanced: true, when: (p) => p.kc_type === "canny" }, 0, 255, 1), num("canny_high", "Canny high", 200, { advanced: true, when: (p) => p.kc_type === "canny" }, 0, 255, 1)], true), default: true }],
    description: "Krea 2 following a depth map or canny edges of a control image (Control LoRA)."
  },
  {
    id: "krea2-identity",
    title: "Identity Edit (Krea 2)",
    category: "Image",
    kind: "generate",
    inputs: [P.textIn("prompt", "Edit instruction"), P.imgIn("image", "Image (+ optional 2nd)", false, true), P.loraIn(), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [{ ...krea2("krea2-id", "Krea 2 identity edit (local)", [dyn("id_lora", "Identity-edit LoRA", "loras:krea2", "none"), slider("id_strength", "LoRA strength", 0, 2, 0.05, 1), sel("id_fit", "Fit", ["fit", "crop (legacy)"], "fit", { advanced: true }), slider("id_boost", "Reference boost", 0, 3, 0.05, 1, { advanced: true }), num("id_ground", "Grounding px", 768, { advanced: true }, 256, 2048, 64)], true), default: true }],
    description: "Edit an image by instruction while keeping the subject (Krea 2 identity-edit LoRA). A second image can be a reference."
  },
  {
    id: "anima-control",
    title: "Control / Inpaint (Anima)",
    category: "Image",
    kind: "generate",
    inputs: [P.textIn(), P.imgIn("image", "Image"), P.maskIn("mask", "Mask (inpaint)", true), P.loraIn(), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [{ ...anima("anima-ctrl", "Anima LLLite control (local)", [sel("an_type", "Mode", ["anycontrol", "depthcontrol", "inpaint"], "anycontrol"), dyn("an_patch", "LLLite model", "modelpatches", "none"), slider("an_strength", "Strength", 0, 2, 0.05, 1), slider("an_start", "Start", 0, 1, 0.05, 0, { advanced: true }), slider("an_end", "End", 0, 1, 0.05, 1, { advanced: true }), num("an_res", "Depth preprocess resolution", 512, { advanced: true, when: (p) => p.an_type === "depthcontrol" }, 256, 2048, 64)], true), default: true }],
    description: "Anima with LLLite control: any-control, depth-control or inpainting."
  },
  {
    id: "face-redraw",
    title: "Face Redraw (Z-Image)",
    category: "Image",
    kind: "generate",
    inputs: [P.textIn(), P.imgIn("image", "Portrait"), P.loraIn(), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [{ ...zimage("zimage-fr", "Z-Image Turbo \u2014 face redraw (local)", [dyn("fr_detector", "Face detector", "bboxdetectors", "none"), dyn("cn_patch", "ControlNet model", "modelpatches", "none"), dyn("cn_pre", "Preprocessor", "preprocessors", "DepthAnythingPreprocessor"), slider("cn_strength", "Control strength", 0, 2, 0.05, 1), slider("denoise", "Redraw strength", 0.05, 1, 0.05, 0.55), slider("fr_threshold", "Detect threshold", 0.1, 1, 0.05, 0.5, { advanced: true }), num("fr_dilation", "Mask dilation", 4, { advanced: true }, 0, 64, 1), slider("fr_context", "Context around the face", 1, 4, 0.1, 1.8, { advanced: true }), num("fr_size", "Working size px", 1024, { advanced: true }, 512, 2048, 64), num("cn_res", "Preprocess resolution", 1024, { advanced: true }, 256, 2048, 64)]), default: true }],
    description: "Detect the face in an image and redraw only that area (with your face LoRA) using ControlNet depth, then paste it back."
  },
  {
    id: "camera-angle",
    title: "Camera Angle (Qwen)",
    category: "Image",
    kind: "generate",
    inputs: [P.imgIn("image", "Image"), P.textIn("prompt", "Extra prompt (optional)", true), P.loraIn(), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [{ ...qwen("qwen-angle", "Qwen Image Edit 2511 \u2014 multi-angle (local)", [slider("angle_h", "Horizontal angle (\xB0)", 0, 359, 1, 0), slider("angle_v", "Vertical angle (\xB0)", -30, 60, 1, 0), slider("angle_zoom", "Distance (close 0 \u2026 wide 10)", 0, 10, 0.5, 4), dyn("angle_lora", "Angle LoRA", "loras:qwen", "none"), slider("angle_strength", "Angle LoRA strength", 0, 2, 0.05, 1)]), default: true }],
    description: "View the same subject from another camera angle (needs a multi-angle LoRA)."
  },
  {
    id: "inpaint",
    title: "Inpaint",
    category: "Image",
    kind: "generate",
    inputs: [P.textIn(), P.imgIn(), P.maskIn(), P.loraIn(), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [
      { ...zimage("zimage", "Z-Image Turbo (local)", [slider("denoise", "Denoise", 0.05, 1, 0.05, 0.85)]), default: true },
      klein("klein", "Flux.2 Klein (local)", [slider("denoise", "Denoise", 0.05, 1, 0.05, 1)]),
      sdxl("sdxl", "SDXL (local)", [slider("denoise", "Denoise", 0.05, 1, 0.05, 0.85)]),
      qwen("qwen", "Qwen Image Edit 2511 (local)", [slider("denoise", "Denoise", 0.05, 1, 0.05, 0.85)])
    ],
    description: "Repaint the white area of a mask."
  },
  {
    id: "outpaint",
    title: "Outpaint",
    category: "Image",
    kind: "generate",
    inputs: [P.textIn("prompt", "Prompt", true), P.imgIn(), P.loraIn(), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [
      { ...zimage("zimage", "Z-Image Turbo (local)", [num("left", "Left px", 0, {}, 0, 2048, 64), num("top", "Top px", 0, {}, 0, 2048, 64), num("right", "Right px", 256, {}, 0, 2048, 64), num("bottom", "Bottom px", 0, {}, 0, 2048, 64)]), default: true },
      klein("klein", "Flux.2 Klein (local, needs KJNodes)", [num("left", "Left px", 0, {}, 0, 2048, 64), num("top", "Top px", 0, {}, 0, 2048, 64), num("right", "Right px", 256, {}, 0, 2048, 64), num("bottom", "Bottom px", 0, {}, 0, 2048, 64)]),
      sdxl("sdxl", "SDXL (local)", [num("left", "Left px", 0, {}, 0, 2048, 64), num("top", "Top px", 0, {}, 0, 2048, 64), num("right", "Right px", 256, {}, 0, 2048, 64), num("bottom", "Bottom px", 0, {}, 0, 2048, 64)])
    ],
    description: "Extend the canvas around an image."
  },
  {
    id: "face-swap",
    title: "Face Swap",
    category: "Image",
    kind: "generate",
    inputs: [P.textIn("prompt", "Prompt", true), P.imgIn("image", "Target"), P.imgIn("face", "Face source"), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [{ ...klein("klein", "Flux.2 Klein (local)", [slider("denoise", "Denoise", 0.05, 1, 0.05, 1)]), default: true }],
    description: "Put the face/head of the second image on the first."
  },
  {
    id: "remove-bg",
    title: "Remove Background",
    category: "Image",
    kind: "generate",
    inputs: [P.imgIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [{ id: "rmbg", label: "BiRefNet (local)", family: "klein", default: true, params: [dyn("bg_model", "Model", "bgmodels", "birefnet.safetensors")] }],
    description: "Cut the subject out (transparent PNG)."
  },
  {
    id: "upscale",
    title: "Upscale",
    category: "Image",
    kind: "generate",
    inputs: [P.imgIn(), P.seedIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [
      { id: "seedvr2", label: "SeedVR2 (local)", family: "core", params: [dyn("sv_dit", "DiT model", "seedvr2dit", "none"), dyn("sv_vae", "VAE model", "seedvr2vae", "none"), num("sv_res", "Target resolution (short edge)", 2048, {}, 256, 8192, 64), num("sv_max", "Max resolution", 4096, { advanced: true }, 512, 16384, 64), sel("sv_color", "Colour correction", ["lab", "wavelet", "wavelet_adaptive", "hsv", "adain", "none"], "lab", { advanced: true }), sel("sv_offload", "Offload device", ["cpu", "none"], "cpu", { advanced: true }), num("sv_swap", "Blocks to swap", 0, { advanced: true }, 0, 36, 1), sel("sv_attn", "Attention", ["sdpa", "flash_attn_2", "sageattn_2"], "sdpa", { advanced: true }), num("seed", "Seed", 42, { advanced: true })] },
      { id: "esrgan", label: "Upscale model (ComfyUI core)", family: "core", default: true, params: [dyn("upscale_model", "Model", "upscalers", "none"), slider("scale_by", "Final scale", 0.25, 4, 0.25, 1, { advanced: true })] }
    ],
    description: "Enlarge with an ESRGAN-type model from ComfyUI/models/upscale_models."
  },
  {
    id: "music-generate",
    title: "Music Generate",
    category: "Audio",
    kind: "generate",
    inputs: [P.textIn("prompt", "Style", false), P.textIn("lyrics", "Lyrics", true), { id: "cover", label: "Cover source", type: "audio", optional: true }, P.textIn("melody", "Melody (ABC)", true), P.seedIn()],
    outputs: [{ id: "audio", label: "Audio", type: "audio" }],
    params: [],
    engines: [
      { id: "acestep", label: "Ace-Step 1.5 (local)", family: "music", default: true, params: [slider("seconds", "Length (s)", 5, 300, 1, 60), num("bpm", "BPM", 120, {}, 40, 240, 1), text("keyscale", "Key", "A minor"), sel("timesignature", "Time signature", ["2", "3", "4", "6"], "4", { advanced: true }), sel("language", "Language", ["en", "ko", "ja", "zh", "es", "fr", "de"], "en", { advanced: true }), sel("format", "Format", ["flac", "mp3", "opus"], "flac", { advanced: true }), slider("steps1", "Stage 1 steps", 1, 60, 1, 30, { advanced: true }), slider("steps2", "Stage 2 steps (0 = off)", 0, 60, 1, 20, { advanced: true }), slider("steps3", "Stage 3 steps (0 = off)", 0, 60, 1, 15, { advanced: true }), slider("cfg", "Guidance", 0, 10, 0.1, 1, { advanced: true }), seed] },
      { id: "yue2", label: "YuE2 \u2014 text / cover music (local)", family: "music", params: [slider("seconds", "Length (s)", 10, 300, 1, 60), sel("format", "Format", ["flac", "mp3", "opus"], "flac", { advanced: true }), slider("temperature", "Temperature", 0.1, 2, 0.05, 1, { advanced: true }), slider("top_p", "Top-p", 0.1, 1, 0.01, 0.95, { advanced: true }), num("top_k", "Top-k", 100, { advanced: true }, 1, 500, 1), slider("repetition", "Repetition penalty", 1, 2, 0.01, 1.2, { advanced: true }), seed] },
      { id: "minimax", label: "MiniMax Music 3 (local)", family: "music", params: [slider("seconds", "Length (s)", 5, 300, 1, 60), sel("format", "Format", ["flac", "mp3", "opus"], "flac", { advanced: true }), slider("steps1", "Steps", 1, 80, 1, 30, { advanced: true }), slider("cfg", "Guidance", 0, 10, 0.1, 1.7, { advanced: true }), seed] }
    ],
    description: "Songs and instrumentals. Style prompt (+ optional lyrics) in, audio out. Models: Settings \u2192 Music models."
  },
  {
    id: "melody-editor",
    title: "Melody Editor",
    category: "Audio",
    kind: "source",
    inputs: [],
    outputs: [P.textOut("abc", "Melody (ABC)")],
    params: [text("melody", "melody", "", false, { advanced: true }), text("abc", "abc", "", false, { advanced: true })],
    description: "Draw a melody on a piano roll, or record it from a MIDI keyboard. Wire it into YuE2 (Melody) \u2014 YuE2 then sings and arranges around your tune."
  },
  {
    id: "comfy-workflow",
    title: "ComfyUI Workflow",
    category: "Workflow",
    kind: "generate",
    inputs: [P.textIn("prompt", "Prompt", true), P.imgIn("image", "Images", true, true), { id: "video", label: "Video", type: "video", optional: true }, P.seedIn()],
    outputs: [P.imgOut("image", "Image"), { id: "video", label: "Video", type: "video" }],
    params: [text("workflow", "Workflow JSON", "", true, { advanced: true }), text("prompt_target", "Prompt field", "", false, { advanced: true }), text("image_target", "Image 1 field", "", false, { advanced: true }), text("image2_target", "Image 2 field", "", false, { advanced: true }), text("video_target", "Video field", "", false, { advanced: true }), text("seed_target", "Seed field", "", false, { advanced: true }), { id: "seed", label: "Seed", control: { kind: "seed" }, default: -1, advanced: true }],
    description: "Run any API-format ComfyUI workflow (video, LTX, H3, Wan\u2026). Load the JSON, pick which fields take the prompt / images / seed."
  },
  {
    id: "video-generate",
    title: "Video Generate",
    category: "Video",
    kind: "generate",
    inputs: [P.textIn("prompt", "Prompt", false), P.imgIn("image", "First frame / references", true, true), P.imgIn("last", "Last frame", true), P.cardIn("H3 option cards"), P.loraIn(), { id: "assets", label: "Asset Library", type: "pipe", optional: true }, P.seedIn()],
    outputs: [{ id: "video", label: "Video", type: "video" }],
    params: [],
    engines: [
      { id: "h3", label: "MiniMax H3 \u2014 text / first-last frame (local)", family: "h3", default: true, params: h3Params(false) },
      { id: "h3-ref", label: "MiniMax H3 \u2014 multi-reference (local)", family: "h3", params: h3Params(true) },
      { id: "ltx25", label: "LTX 2.5 (local, with audio)", family: "ltx25", params: [sel("aspect", "Aspect ratio", [...ASPECTS, "auto"], "16:9"), megapixels(1), slider("seconds", "Length (s)", 2, 20, 1, 5), slider("steps", "Steps", 1, 40, 1, 12, { advanced: true }), slider("cfg", "Guidance", 0, 10, 0.1, 1, { advanced: true }), dyn("sampler", "Sampler", "samplers", "euler_ancestral", { advanced: true }), dyn("scheduler", "Scheduler", "schedulers", "linear_quadratic", { advanced: true }), text("stage2", "Stage-2 sigmas", "0.85, 0.7250, 0.4219, 0.0", false, { advanced: true }), ...loras("ltx25"), seed] }
    ],
    description: "Text \u2192 video, or first/last frame \u2192 video (LTX 2.5). LTX 2.5 or MiniMax H3. Other models: ComfyUI Workflow node."
  },
  // ============================================================ Edit (runs in the browser)
  edit("crop", "Crop", [num("x", "X %", 0, {}, 0, 100, 1), num("y", "Y %", 0, {}, 0, 100, 1), num("w", "Width %", 100, {}, 1, 100, 1), num("h", "Height %", 100, {}, 1, 100, 1)], "Cut out a rectangle (percent of the image)."),
  edit("resize", "Resize", [sel("mode", "Mode", ["scale", "fit width", "fit height", "exact"], "scale"), slider("scale", "Scale", 0.1, 4, 0.05, 1, { when: (p) => p.mode === "scale" }), num("width", "Width", 1024, { when: (p) => p.mode === "fit width" || p.mode === "exact" }, 1, 8192, 1), num("height", "Height", 1024, { when: (p) => p.mode === "fit height" || p.mode === "exact" }, 1, 8192, 1)], "Change the pixel size."),
  edit("blur", "Blur", [slider("radius", "Radius", 0, 50, 0.5, 4)], "Gaussian blur."),
  edit("levels", "Levels", [slider("black", "Black point", 0, 254, 1, 0), slider("white", "White point", 1, 255, 1, 255), slider("gamma", "Gamma", 0.1, 3, 0.05, 1)], "Black / white point and gamma."),
  edit("rotate-flip", "Rotate and flip", [sel("rotate", "Rotate", ["0", "90", "180", "270"], "0"), toggle("flip_h", "Flip horizontal"), toggle("flip_v", "Flip vertical")], "Rotate in 90\xB0 steps and mirror."),
  edit("color-correct", "Color correction", [slider("brightness", "Brightness", 0, 2, 0.01, 1), slider("contrast", "Contrast", 0, 2, 0.01, 1), slider("saturation", "Saturation", 0, 3, 0.01, 1), slider("temperature", "Warmth", -100, 100, 1, 0)], "Brightness, contrast, saturation, warmth."),
  edit("sharpen", "Sharpen", [slider("amount", "Amount", 0, 3, 0.05, 0.8)], "Unsharp-style sharpening."),
  edit("grayscale", "Grayscale", [slider("amount", "Amount", 0, 1, 0.05, 1)], "Remove colour."),
  edit("threshold", "Threshold", [slider("level", "Level", 0, 255, 1, 128)], "Pure black / white by brightness."),
  edit("posterize", "Posterize", [slider("levels", "Levels", 2, 32, 1, 6)], "Reduce the number of tones."),
  edit("hue-rotate", "Hue Rotate", [slider("degrees", "Degrees", -180, 180, 1, 30)], "Shift all colours around the wheel."),
  edit("vignette", "Vignette", [slider("strength", "Strength", 0, 1, 0.05, 0.5), slider("softness", "Softness", 0.1, 1, 0.05, 0.6)], "Darken the corners."),
  edit("pixelate", "Pixelate", [slider("size", "Block size", 2, 128, 1, 12)], "Blocky mosaic."),
  edit("invert", "Invert", [], "Negative of the image."),
  edit("channels", "Channels", [sel("channel", "Channel", ["red", "green", "blue", "alpha", "luminance"], "luminance")], "Pull one channel out as grayscale image + mask.", [P.imgIn()], [P.imgOut(), P.maskOut()]),
  edit("blend", "Blend", [sel("mode", "Mode", ["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference", "soft-light"], "normal"), slider("opacity", "Opacity", 0, 1, 0.05, 1)], "Put one image over another.", [P.imgIn("base", "Base"), P.imgIn("top", "Top"), P.maskIn("mask", "Mask", true)]),
  edit("mask-grow", "Matte Grow/Shrink", [slider("amount", "Pixels (\u2212 shrink)", -64, 64, 1, 8), slider("feather", "Feather", 0, 64, 1, 0)], "Grow, shrink or soften a mask.", [P.maskIn()], [P.maskOut()]),
  edit("invert-mask", "Invert Mask", [], "Swap black and white in a mask.", [P.maskIn()], [P.maskOut()]),
  {
    id: "color-palette",
    title: "Color palette",
    category: "Edit",
    kind: "edit",
    inputs: [P.imgIn()],
    outputs: [P.textOut("text", "Colors")],
    params: [slider("count", "Colors", 2, 12, 1, 5)],
    description: "Dominant colours as hex text."
  },
  {
    id: "extract-frame",
    title: "Extract Video Frame",
    category: "Edit",
    kind: "edit",
    inputs: [{ id: "video", label: "Video", type: "video" }],
    outputs: [P.imgOut()],
    params: [slider("position", "Position %", 0, 100, 1, 100)],
    description: "Grab one frame (default: last)."
  },
  {
    id: "painter",
    title: "Painter",
    category: "Edit",
    kind: "edit",
    inputs: [P.imgIn("image", "Image", true)],
    outputs: [P.imgOut("image", "Result"), P.maskOut()],
    params: [num("width", "Canvas width", 1024, {}, 64, 4096, 8), num("height", "Canvas height", 1024, {}, 64, 4096, 8)],
    description: "Draw on an image or paint a mask. Double-click the preview to open the editor."
  },
  // ============================================================ Utility
  // ---------------------------------------------------------------- cards (small settings blocks you wire in)
  {
    id: "lora-card",
    title: "LoRA",
    category: "Cards",
    kind: "source",
    inputs: [{ id: "lora_in", label: "More LoRAs", type: "lora", optional: true, multi: true }],
    outputs: [{ id: "lora", label: "LoRA", type: "lora" }],
    params: [dyn("lora", "LoRA", "loras:all", "none"), slider("strength", "Strength", -2, 2, 0.05, 1)],
    description: "One LoRA. Wire it into any image or video node \u2014 chain several cards to stack LoRAs."
  },
  {
    id: "h3-turbo",
    title: "H3 Turbo \xB7 7+1",
    category: "Cards",
    kind: "source",
    inputs: [],
    outputs: [{ id: "card", label: "Turbo", type: "pipe" }],
    params: [
      sel("turbo", "Turbo", ["pdd", "larryvrh", "lightx2v", "none"], "pdd"),
      dyn("turbo_lora", "Turbo LoRA", "loras:h3", "none", { when: (p) => p.turbo !== "none" }),
      slider("turbo_strength", "Turbo strength", 0, 2, 0.05, 1, { when: (p) => p.turbo !== "none" }),
      slider("turbo_steps", "Turbo steps", 1, 16, 1, 8, { advanced: true, when: (p) => p.turbo !== "none" }),
      toggle("hires", "7+1 hi-res finish (7 steps small \u2192 upscale \u2192 1 step big)", true, { when: (p) => p.turbo === "pdd" }),
      slider("hires_start_mp", "Start size (MP)", 0.2, 1, 0.05, 0.5, { when: (p) => p.turbo === "pdd" && !!p.hires }),
      slider("hires_final_mp", "Final size (MP)", 0.4, 3, 0.05, 0.9, { when: (p) => p.turbo === "pdd" && !!p.hires })
    ],
    description: "H3 speed-up: Turbo LoRA and the 7+1 hi-res finish. Wire into Video Generate \u2192 H3 option cards."
  },
  {
    id: "h3-speed",
    title: "H3 Speed & Attention",
    category: "Cards",
    kind: "source",
    inputs: [],
    outputs: [{ id: "card", label: "Speed", type: "pipe" }],
    params: [
      sel("attn_backend", "Attention backend", ["none", "ck", "sage", "solattn_kijai", "sla"], "none"),
      sel("attn_forward", "Attention forward patch", ["none", "memeff_sage", "solattn_sag"], "none"),
      sel("optimizer", "H3 optimizer", ["none", "memory", "memory_sparse"], "none"),
      sel("block_cache", "Block cache", ["none", "fbcache"], "none"),
      toggle("spectrum", "Spectrum", false),
      toggle("fused_mod", "Fused modulation", false),
      slider("shift_video", "Shift (video)", 1, 20, 0.5, 12, { advanced: true }),
      slider("shift_audio", "Shift (audio)", 1, 10, 0.5, 3, { advanced: true })
    ],
    description: "H3 attention backends, memory optimiser, block cache, Spectrum and sigma shift."
  },
  {
    id: "h3-audiolock",
    title: "H3 Audio Lock",
    category: "Cards",
    kind: "source",
    inputs: [{ id: "audio", label: "Audio", type: "audio" }],
    outputs: [{ id: "card", label: "Audio lock", type: "pipe" }],
    params: [sel("lock_mode", "Mode", ["lock", "remix"], "lock"), slider("lock_strength", "Strength (remix)", 0, 1, 0.05, 0.5, { when: (p) => p.lock_mode === "remix" }), sel("lock_fit", "If the audio is shorter", ["pad_silence", "loop", "none"], "pad_silence")],
    description: "Make H3 use your audio (voice / music) instead of generating its own; each clip gets its own slice."
  },
  {
    id: "asset-library",
    title: "Asset Library",
    category: "Cards",
    kind: "source",
    inputs: [],
    outputs: [P.imgOut("image", "Images"), P.textOut("mentions", "@names"), { id: "assets", label: "For H3", type: "pipe" }],
    params: [text("project", "Project id", ""), text("ids", "Asset ids", "")],
    description: "Pick characters, places and props from your reference library. Write @name in the prompt; H3 Reference resolves it."
  },
  // ---------------------------------------------------------------- post-processing (one card per step, video in → video out)
  ...(() => {
    const fpsParam = num("fps", "Source frame rate (fps, 0 = detect)", 0, { advanced: true }, 0, 240, 1);
    const previewParam = num("preview_frames", "Test on the first N frames (0 = whole video)", 0, { advanced: true }, 0, 600, 1);
    const vin = [{ id: "video", label: "Video", type: "video" }], vout = [{ id: "video", label: "Video", type: "video" }];
    const pp = (id, title, params, description, engines) => ({ id, title, category: "Postprocess", kind: "generate", inputs: vin, outputs: vout, params: engines ? params : [...params, fpsParam, previewParam], engines: engines?.map((e) => ({ ...e, params: [...e.params ?? [], fpsParam, previewParam] })), description });
    const rtxP = (pre, whenOk = () => true) => [
      sel(`${pre}mode`, "Size by", ["scale", "short", "long", "wh"], "scale", { when: whenOk }),
      slider(`${pre}scale`, "Scale", 1, 4, 0.25, 2, { when: (p) => whenOk(p) && p[`${pre}mode`] === "scale" }),
      num(`${pre}short`, "Short edge px", 1080, { when: (p) => whenOk(p) && p[`${pre}mode`] === "short" }, 8, 8192, 8),
      num(`${pre}long`, "Long edge px", 1920, { when: (p) => whenOk(p) && p[`${pre}mode`] === "long" }, 8, 8192, 8),
      num(`${pre}w`, "Width", 1920, { when: (p) => whenOk(p) && p[`${pre}mode`] === "wh" }, 8, 8192, 8),
      num(`${pre}h`, "Height", 1080, { when: (p) => whenOk(p) && p[`${pre}mode`] === "wh" }, 8, 8192, 8),
      sel(`${pre}anchor`, "Crop anchor", ["center", "left", "right", "top", "bottom"], "center", { advanced: true, when: (p) => whenOk(p) && p[`${pre}mode`] === "wh" }),
      sel(`${pre}quality`, "Quality", ["LOW", "MEDIUM", "HIGH", "ULTRA"], "ULTRA", { when: whenOk })
    ];
    return [
      pp("pp-deblur", "Deblur (RTX)", [sel("strength", "Strength", ["LOW", "MEDIUM", "HIGH", "ULTRA"], "MEDIUM")], "NVIDIA RTX Deblur on every frame."),
      pp("pp-denoise", "Denoise (RTX)", [sel("strength", "Strength", ["LOW", "MEDIUM", "HIGH", "ULTRA"], "MEDIUM")], "NVIDIA RTX Denoise on every frame."),
      pp("pp-upscale", "Video Upscale", [], "Enlarge a video: FlashVSR, RTX VSR or an upscale model; optional second RTX pass.", [
        { id: "flashvsr", label: "FlashVSR", family: "post", default: true, params: [
          sel("fv_model", "Model", ["FlashVSR-v1.1", "FlashVSR"], "FlashVSR-v1.1"),
          sel("fv_mode", "Mode", ["tiny", "tiny-long", "full"], "tiny"),
          slider("fv_scale", "Scale", 2, 4, 1, 2),
          toggle("fv_color", "Colour fix", true),
          num("fv_tile", "Tile size", 384, { advanced: true }, 64, 2048, 32),
          num("fv_overlap", "Tile overlap", 32, { advanced: true }, 0, 512, 8),
          num("fv_seed", "Seed", 42, { advanced: true }),
          toggle("two_pass", "2nd pass with RTX VSR", false),
          ...rtxP("p2_", (p) => !!p.two_pass)
        ] },
        { id: "rtx", label: "RTX VSR (TJ)", family: "post", params: rtxP("rtx_") },
        { id: "model", label: "Upscale model (ESRGAN\u2026)", family: "post", params: [dyn("model_name", "Model", "upscalers", "none"), toggle("two_pass", "2nd pass with RTX VSR", false), ...rtxP("p2_", (p) => !!p.two_pass)] }
      ]),
      pp("pp-skin", "Skin Retouch", [slider("evenness", "Evenness", 0, 1, 0.01, 0.3), slider("smoothing", "Smoothing", 0, 1, 0.01, 0.2), slider("redness", "Redness", 0, 1, 0.01, 0), slider("shine", "Shine", 0, 1, 0.01, 0), sel("blemish", "Blemish fix", ["off", "subtle", "strong"], "off"), toggle("preserve", "Keep moles / scars", true, { advanced: true }), slider("microtexture", "Micro-texture", 0, 3, 0.05, 0, { advanced: true })], "Non-generative skin evening, de-shine and blemish fix."),
      pp("pp-grain", "Film Grain", [slider("amount", "Amount", 0, 1, 0.01, 0.25), slider("size", "Size", 0.3, 3, 0.05, 1), slider("color", "Colour grain", 0, 1, 0.01, 0), slider("lum_bias", "Shadow bias", 0, 1, 0.01, 0), sel("noise", "Noise", ["smooth", "grainy"], "smooth")], "Add film grain (ComfyUI core GLSL shader)."),
      pp("pp-interpolate", "Frame Interpolation", [slider("target_fps", "Target FPS", 24, 120, 1, 48), slider("scale", "Flow scale", 0.25, 2, 0.25, 1, { advanced: true }), text("model_name", "RIFE model", "flownet.pkl", false, { advanced: true }), num("batch", "Batch size", 8, { advanced: true }, 1, 64, 1), toggle("fp16", "FP16", true, { advanced: true })], "RIFE: smooth motion by adding in-between frames."),
      pp("pp-resize", "Video Resize", [sel("mode", "Mode", ["Long side", "Short side", "Ratio", "Mega Pixel", "Width x Height"], "Long side"), num("target_px", "Target px", 1920, { when: (p) => p.mode === "Long side" || p.mode === "Short side" }, 8, 16384, 2), num("ratio_w", "Ratio W", 16, { when: (p) => p.mode === "Ratio" }, 1, 64, 1), num("ratio_h", "Ratio H", 9, { when: (p) => p.mode === "Ratio" }, 1, 64, 1), slider("megapixels", "Megapixels", 0.1, 8, 0.1, 1, { when: (p) => p.mode === "Mega Pixel" }), num("width", "Width", 1280, { when: (p) => p.mode === "Width x Height" }, 8, 16384, 2), num("height", "Height", 720, { when: (p) => p.mode === "Width x Height" }, 8, 16384, 2), sel("crop", "Fit", ["crop", "stretch"], "crop", { when: (p) => p.mode === "Width x Height" }), sel("method", "Resampling", ["lanczos", "bilinear", "bicubic", "area", "nearest-exact"], "lanczos", { advanced: true })], "Change the video size or aspect ratio."),
      {
        id: "face-refine",
        title: "Face Refine (H3)",
        category: "Postprocess",
        kind: "generate",
        inputs: [{ id: "video", label: "Video", type: "video" }, P.textIn("prompt", "Prompt", true), P.imgIn("image", "Face references", true, true), P.cardIn("H3 option cards"), P.loraIn(), P.seedIn()],
        outputs: vout,
        params: [
          dyn("detector", "Face detector", "facedetectors", "none"),
          dyn("fallback", "Fallback detector", "facedetectors", "none", { advanced: true }),
          sel("select", "Which face", ["largest_face", "smallest_face", "left_most", "right_most", "top_most", "bottom_most", "centre_most", "detector_score", "manual"], "largest_face"),
          text("picks", "Picked faces (manual)", "", false, { when: (p) => p.select === "manual" }),
          text("pick_mode", "Pick mode", "shots", false, { advanced: true, when: () => false }),
          slider("denoise", "Redraw strength", 0.05, 1, 0.05, 0.4),
          slider("confidence", "Detect confidence", 0.05, 1, 0.05, 0.35, { advanced: true }),
          slider("crop_factor", "Crop factor", 1, 6, 0.1, 2.5, { advanced: true }),
          sel("canvas_mode", "Canvas", ["auto_capped_768", "auto_no_downscale", "manual"], "auto_capped_768", { advanced: true }),
          num("canvas_w", "Canvas W", 768, { advanced: true, when: (p) => p.canvas_mode === "manual" }, 64, 2048, 32),
          num("canvas_h", "Canvas H", 768, { advanced: true, when: (p) => p.canvas_mode === "manual" }, 64, 2048, 32),
          num("smooth", "Smooth window", 21, { advanced: true }, 1, 99, 2),
          toggle("cuts", "Detect scene cuts", false, { advanced: true }),
          slider("cut_threshold", "Cut threshold", 1, 10, 0.5, 3, { advanced: true, when: (p) => !!p.cuts }),
          toggle("identity", "Follow the same person", true, { advanced: true }),
          slider("identity_threshold", "Identity threshold", 0.1, 0.9, 0.01, 0.45, { advanced: true }),
          sel("identity_model", "Identity model", ["insightface", "clip_vision", "ccip"], "insightface", { advanced: true }),
          slider("mul_small", "Small face \xD7", 0, 2, 0.05, 1, { advanced: true }),
          slider("mul_large", "Large face \xD7", 0, 2, 0.05, 0.35, { advanced: true }),
          slider("px_small", "Small face px", 8, 200, 1, 30, { advanced: true }),
          slider("px_large", "Large face px", 20, 600, 1, 120, { advanced: true }),
          slider("steps", "Steps (no turbo)", 1, 30, 1, 8, { advanced: true }),
          dyn("sampler", "Sampler", "samplers", "euler", { advanced: true }),
          dyn("scheduler", "Scheduler", "schedulers", "simple", { advanced: true }),
          sel("paste", "Paste back", ["face_only", "face_ellipse", "full_crop"], "face_only", { advanced: true }),
          slider("feather", "Feather", 0, 64, 1, 6, { advanced: true }),
          slider("colour", "Colour match", 0, 1, 0.05, 1, { advanced: true }),
          slider("blend", "Blend", 0, 1, 0.05, 1, { advanced: true }),
          sel("undetected", "Frames without a face", ["fade_out", "skip", "composite_anyway"], "fade_out", { advanced: true }),
          seed
        ],
        description: "Redraw small faces in a finished H3 clip: track \u2192 crop \u2192 H3 redraw \u2192 stitch back. Needs ComfyUI-H3-FaceRefine."
      },
      {
        id: "h3-image",
        title: "Image Generate (H3)",
        category: "Image",
        kind: "generate",
        inputs: [P.textIn(), P.imgIn("image", "Reference images (optional)", true, true), P.cardIn("H3 option cards"), P.loraIn(), P.seedIn()],
        outputs: [P.imgOut()],
        params: [
          sel("aspect", "Aspect ratio", ASPECTS, "1:1"),
          slider("final_mp", "Final size (MP)", 0.25, 4, 0.25, 1.5),
          toggle("final", "High quality 2nd pass (latent upscale)", true),
          slider("preview_mp", "First pass size (MP)", 0.1, 1.5, 0.05, 0.5, { advanced: true }),
          slider("steps", "Steps (no turbo)", 1, 60, 1, 20, { advanced: true }),
          slider("pass2", "2nd pass steps", 3, 5, 1, 3, { advanced: true, when: (p) => !!p.final }),
          toggle("fizgig", "Fizgig single-frame latent", false, { advanced: true }),
          sel("ref_size", "Reference size", ["max", "match"], "max", { advanced: true }),
          seed
        ],
        description: "A still image from the MiniMax H3 model \u2014 text to image, or add reference images (up to 9)."
      },
      {
        id: "character-sheet",
        title: "Character Sheet",
        category: "Image",
        kind: "generate",
        inputs: [P.imgIn("image", "Character reference", false, true), P.textIn("prompt", "Prompt (optional)", true), P.loraIn(), P.seedIn()],
        outputs: [P.imgOut("image", "Sheet"), { id: "video", label: "Turnaround video", type: "video" }],
        params: [
          sel("aspect", "Aspect ratio", ["3:4", "9:16", "1:1", "16:9", "4:3"], "3:4"),
          megapixels(0.9),
          text("frames", "Frames for the 8 cells", "7, 22, 37, 52, 67, 82, 107, 118"),
          toggle("save_frames", "Also save each frame", false, { advanced: true }),
          toggle("latent_up", "Cheap first pass + latent upscale", false, { advanced: true }),
          slider("first_mp", "First pass size (MP)", 0.2, 1, 0.05, 0.36, { advanced: true, when: (p) => !!p.latent_up }),
          slider("pass2", "Second pass steps", 3, 5, 1, 3, { advanced: true, when: (p) => !!p.latent_up }),
          sel("deblur", "RTX Deblur", ["none", "LOW", "MEDIUM", "HIGH", "ULTRA"], "none", { advanced: true }),
          toggle("rtx", "RTX VSR", false, { advanced: true }),
          toggle("supersample", "Scale back down (supersample)", false, { advanced: true, when: (p) => !!p.rtx }),
          sel("ref_size", "Reference size", ["max", "match"], "max", { advanced: true }),
          num("max_dim", "Sheet max size px", 2048, { advanced: true }, 512, 8192, 64),
          seed
        ],
        description: "H3 reference-to-video turnaround (front / back / profile / \xBE / expressions) assembled into a model sheet."
      }
    ];
  })(),
  {
    id: "ltx-director",
    title: "LTX Director (timeline)",
    category: "Video",
    kind: "generate",
    inputs: [P.textIn("prompt", "Overall prompt", false), P.imgIn("image", "Images (in time order)", true, true), { id: "audio", label: "Audio (custom track)", type: "audio", optional: true }, { id: "video", label: "Motion video (guide)", type: "video", optional: true }, P.loraIn(), P.seedIn()],
    outputs: [{ id: "video", label: "Video", type: "video" }],
    params: [
      text("beats", "Beats \u2014 one per line:  start-end: prompt  (seconds)", "", true),
      text("image_times", "Image times (s), in the order connected", "0"),
      toggle("last_at_end", "Pin the last image to the end", false),
      num("audio_start", "Audio starts at (s)", 0, {}, 0, 60, 0.1),
      num("motion_start", "Motion video starts at (s)", 0, {}, 0, 60, 0.1),
      slider("motion_strength", "Motion strength", 0, 1, 0.05, 1),
      sel("aspect", "Aspect ratio", [...ASPECTS, "auto"], "16:9"),
      megapixels(1),
      slider("seconds", "Length (s)", 2, 20, 1, 8),
      slider("steps", "Steps", 1, 40, 1, 12, { advanced: true }),
      slider("cfg", "Guidance", 0, 10, 0.1, 1, { advanced: true }),
      dyn("sampler", "Sampler", "samplers", "euler_ancestral", { advanced: true }),
      dyn("scheduler", "Scheduler", "schedulers", "linear_quadratic", { advanced: true }),
      text("stage2", "Stage-2 sigmas", "0.85, 0.7250, 0.4219, 0.0", false, { advanced: true }),
      seed
    ],
    description: "LTX 2.5 with a timeline: a different prompt for each moment, and images pinned at chosen times."
  },
  {
    id: "video-refine",
    title: "Video Edit (LTX 2.5 refine)",
    category: "Video",
    kind: "generate",
    inputs: [{ id: "video", label: "Video", type: "video" }, P.textIn("prompt", "Prompt", true), P.loraIn(), P.seedIn()],
    outputs: [{ id: "video", label: "Video", type: "video" }],
    params: [slider("steps", "Steps", 1, 20, 1, 4), slider("denoise", "Change amount", 0.05, 1, 0.05, 0.15), text("negative", "Negative prompt", "bad anatomy, inconsistent look, low resolution,", true, { advanced: true }), dyn("sampler", "Sampler", "samplers", "euler_ancestral", { advanced: true }), dyn("scheduler", "Scheduler", "schedulers", "simple", { advanced: true }), seed],
    description: "Re-render an existing clip with LTX 2.5: 2\xD7 latent upscale + a light, prompt-guided refine (keeps the sound)."
  },
  {
    id: "video-audio",
    title: "Add Audio to Video",
    category: "Video",
    kind: "generate",
    inputs: [{ id: "video", label: "Video", type: "video" }, { id: "audio", label: "Audio", type: "audio" }],
    outputs: [{ id: "video", label: "Video", type: "video" }],
    params: [slider("start", "Start the audio at (s)", 0, 120, 0.5, 0)],
    description: "Replace a video\u2019s sound with an audio track (for example from Music Generate)."
  },
  {
    id: "scene-detect",
    title: "Scene Detect",
    category: "Video",
    kind: "generate",
    inputs: [{ id: "video", label: "Video", type: "video" }],
    outputs: [P.textOut()],
    params: [slider("threshold", "Sensitivity (lower = more cuts)", 0.05, 0.95, 0.05, 0.3)],
    description: "Find the cuts in a video (ITDA ONE STUDIO). The times come out as text."
  },
  {
    id: "beat-detect",
    title: "Beat Detect",
    category: "Audio",
    kind: "generate",
    inputs: [{ id: "media", label: "Audio / video", type: "any" }],
    outputs: [P.textOut()],
    params: [],
    description: "Find the tempo and beat times of a song or video (ITDA ONE STUDIO). Needs librosa on the server."
  },
  {
    id: "video-bridge",
    title: "Transition Bridge",
    category: "Video",
    kind: "generate",
    inputs: [{ id: "a", label: "Clip A (before)", type: "video" }, { id: "b", label: "Clip B (after)", type: "video" }],
    outputs: [{ id: "video", label: "Bridge clip", type: "video" }],
    params: [sel("mode", "Transition", ["interpolate", "crossfade"], "interpolate"), slider("frames", "Length (frames)", 2, 48, 1, 8)],
    description: "A short clip that blends the last frame of A into the first frame of B. Put it between A and B in Video Stitch (ITDA ONE STUDIO)."
  },
  {
    id: "video-stitch",
    title: "Video Stitch",
    category: "Video",
    kind: "generate",
    inputs: [{ id: "videos", label: "Videos (in order)", type: "video", multi: true }],
    outputs: [{ id: "video", label: "Video", type: "video" }],
    params: [slider("overlap", "Trim overlap (s)", 0, 3, 0.05, 0, { advanced: true })],
    description: "Join several videos into one, in the order they are connected."
  },
  { id: "import-audio", title: "Import Audio", category: "Utility", kind: "source", inputs: [], outputs: [{ id: "audio", label: "Audio", type: "audio" }], params: [], description: "Load an audio file (e.g. a recording for YuE2 Cover Music)." },
  { id: "import", title: "Load Image", category: "Utility", kind: "source", inputs: [], outputs: [{ id: "image", label: "Image", type: "image" }], params: [], description: "Load an image from your computer, or drop one on the canvas." },
  { id: "import-video", title: "Load Video", category: "Utility", kind: "source", inputs: [], outputs: [{ id: "video", label: "Video", type: "video" }], params: [], description: "Load a video from your computer, or drop one on the canvas." },
  { id: "export", title: "Export", category: "Utility", kind: "output", inputs: [{ id: "image", label: "Media", type: "any" }], outputs: [], params: [text("name", "File name", "canvers")], description: "Download the connected result." },
  { id: "preview", title: "Result Viewer", category: "Utility", kind: "output", inputs: [{ id: "image", label: "Image / video / audio / text", type: "any", optional: true }], outputs: [{ id: "out", label: "Pass through", type: "any" }], params: [], description: "Look at any image or text." },
  { id: "router", title: "Router", category: "Utility", kind: "edit", inputs: [P.imgIn("image", "In", false)], outputs: [P.imgOut("image", "Out")], params: [], description: "A pass-through to tidy wires." },
  { id: "compare", title: "Compare", category: "Utility", kind: "output", inputs: [{ id: "a", label: "A", type: "any" }, { id: "b", label: "B", type: "any" }], outputs: [], params: [], description: "Drag a slider between two images." },
  { id: "note", title: "Sticky Note", category: "Utility", kind: "note", inputs: [], outputs: [], params: [text("text", "Note", "", true)], description: "A memo on the canvas." },
  { id: "number", title: "Number", category: "Data", kind: "source", inputs: [], outputs: [{ id: "value", label: "Value", type: "number" }], params: [num("value", "Value", 0, {}, void 0, void 0, 1)], description: "A number to wire into other nodes." },
  { id: "text-data", title: "Text", category: "Data", kind: "source", inputs: [], outputs: [P.textOut()], params: [text("text", "Text", "", true)], description: "A fixed piece of text." },
  { id: "toggle", title: "Toggle", category: "Data", kind: "source", inputs: [], outputs: [{ id: "value", label: "On", type: "boolean" }], params: [toggle("value", "On", true)], description: "On / off switch." },
  { id: "seed-node", title: "Seed", category: "Data", kind: "source", inputs: [], outputs: [{ id: "value", label: "Seed", type: "number" }], params: [{ id: "value", label: "Seed", control: { kind: "seed" }, default: 12345 }], description: "One seed shared by several nodes." }
];
var byId = new Map(REGISTRY.map((n2) => [n2.id, n2]));
function paramsFor(def, engineId) {
  const eng = engineFor(def, engineId);
  return eng?.params ?? def.params;
}
function engineFor(def, engineId) {
  return def.engines?.find((e) => e.id === engineId) ?? def.engines?.find((e) => e.default) ?? def.engines?.[0];
}
function defaultParams(def, engineId) {
  const out = {};
  for (const p of paramsFor(def, engineId)) out[p.id] = p.default;
  return out;
}
function compatible(a, b) {
  if (a === b || a === "any" || b === "any") return true;
  const imageLike = (t) => t === "image" || t === "mask";
  return imageLike(a) && imageLike(b);
}

// src/engine/run.ts
init_comfy();

// src/backend/studio.ts
init_http();
var FAMILIES = {
  klein: { prefix: "/flux_klein", label: "Flux.2 Klein", match: /klein/i },
  zimage: { prefix: "/z_image_turbo", label: "Z-Image Turbo", match: /z[_-]?image/i },
  krea2: { prefix: "/krea2_one", label: "Krea 2", match: /krea/i },
  qwen: { prefix: "/qwen2511_one", label: "Qwen Image Edit 2511", match: /qwen.*(image|edit)/i },
  qwen21: { prefix: "/qwenimage21_one", label: "Qwen Image 2.1", match: /qwen.*(image|2\.?1)/i },
  anima: { prefix: "/anima_one", label: "Anima", match: /anima/i },
  sdxl: { prefix: "/sdxl_one", label: "SDXL", match: /xl|juggernaut|pony|illustrious/i }
};
var cache = /* @__PURE__ */ new Map();
var memo = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn().catch((e) => {
    cache.delete(key);
    throw e;
  }));
  return cache.get(key);
};
var getModels = (f) => memo(`models:${f}`, () => getJson(`${FAMILIES[f].prefix}/models`));
var getConfig = (f) => memo(`config:${f}`, () => getJson(`${FAMILIES[f].prefix}/config`));
async function getWorkflow(f, name) {
  const wf = await memo(`wf:${f}:${name}`, () => getJson(`${FAMILIES[f].prefix}/workflow_${name}`));
  return JSON.parse(JSON.stringify(wf));
}
async function pickModels(f, override) {
  const [lists, cfg] = await Promise.all([getModels(f).catch(() => null), getConfig(f).catch(() => ({}))]);
  const real5 = (a) => (a ?? []).filter((x) => x && x !== "none");
  const pick = (given, saved, list, re) => {
    const have = real5(list);
    const savedOk = saved && (!have.length || have.includes(saved)) ? saved : "";
    return given || savedOk || (re ? have.find((x) => re.test(x)) : void 0) || have[0] || "";
  };
  const m = FAMILIES[f].match;
  const modelList = f === "sdxl" ? lists?.checkpoints : lists?.diffusion_models;
  const savedModel = f === "sdxl" ? cfg.selected_checkpoint || cfg.checkpoint : cfg.selected_model;
  return {
    model: pick(override?.model, savedModel, modelList, f === "sdxl" ? void 0 : m),
    textEncoder: pick(override?.textEncoder, cfg.selected_text_encoder, lists?.text_encoders, f === "klein" ? /qwen.*8b/i : f === "krea2" ? /qwen3vl/i : f === "anima" ? /qwen_3_06b/i : f === "qwen" || f === "qwen21" ? /qwen_2\.5_vl|qwen.*vl|qwen3/i : /qwen.*4b/i),
    vae: pick(override?.vae, cfg.selected_vae, lists?.vaes, f === "klein" ? /flux2/i : f === "krea2" || f === "anima" || f === "qwen" || f === "qwen21" ? /qwen_image/i : /^ae/i),
    negative: cfg.negative_prompt ?? "",
    suffix: cfg.prompt_suffix ?? "",
    lists
  };
}

// src/backend/imageGen.ts
var set = (g, id, key, v) => {
  if (g[id]) g[id].inputs[key] = v;
};
var isGguf = (n2) => n2.toLowerCase().endsWith(".gguf");
function unet(name) {
  return isGguf(name) ? { class_type: "UnetLoaderGGUF", inputs: { unet_name: name } } : { class_type: "UNETLoader", inputs: { unet_name: name, weight_dtype: "default" } };
}
function clip(name, type) {
  return isGguf(name) ? { class_type: "CLIPLoaderGGUF", inputs: { clip_name: name, type } } : { class_type: "CLIPLoader", inputs: { clip_name: name, type, device: "default" } };
}
function loraChain(g, src, loras2, prefix) {
  let prev = src;
  loras2.forEach((l, i) => {
    if (!l.name || l.name === "none" || !(l.strength > 0)) return;
    const id = `${prefix}lora${i}`;
    g[id] = { class_type: "LoraLoaderModelOnly", inputs: { model: prev, lora_name: l.name, strength_model: l.strength } };
    prev = [id, 0];
  });
  return prev;
}
function saveNode(job, link, tag) {
  return { class_type: "SaveImage", inputs: { images: link, filename_prefix: `${job.saveSubfolder}/${tag}` } };
}
var FK = { unet: "FK:165", clip: "FK:155", vae: "FK:153", pos: "FK:166", neg: "FK:156", sampling: "FK:169", latent: "FK:170", sampler: "FK:171", save: "FK:86" };
function kleinCommon(g, job, m, ids, kvId) {
  g[ids.unet] = { ...g[ids.unet], ...unet(m.model), _meta: g[ids.unet]?._meta };
  g[ids.clip] = { ...g[ids.clip], ...clip(m.textEncoder, "flux2"), _meta: g[ids.clip]?._meta };
  set(g, ids.vae, "vae_name", m.vae);
  const useKv = /kv/i.test(m.model);
  let modelSrc = [ids.unet, 0];
  if (kvId) {
    if (useKv) {
      g[kvId].inputs.model = modelSrc;
      modelSrc = [kvId, 0];
    } else {
      delete g[kvId];
    }
  } else if (useKv) {
    g["FK:KV"] = { class_type: "FluxKVCache", inputs: { model: modelSrc } };
    modelSrc = ["FK:KV", 0];
  }
  const out = loraChain(g, modelSrc, job.loras, "FKL:");
  const sampling = ids.sampling ?? Object.keys(g).find((k) => g[k].class_type === "ModelSamplingAuraFlow");
  if (sampling) set(g, sampling, "model", out);
  else set(g, ids.sampler, "model", out);
  set(g, ids.pos, "text", job.prompt);
  if (ids.neg) set(g, ids.neg, "text", job.negative);
  const s = ids.sampler;
  set(g, s, "seed", job.seed);
  set(g, s, "steps", job.steps);
  set(g, s, "cfg", job.cfg);
  set(g, s, "sampler_name", job.sampler);
  set(g, s, "scheduler", job.scheduler);
  g[ids.save].inputs.filename_prefix = `${job.saveSubfolder}/FK`;
  return out;
}
async function buildKlein(job, m) {
  const f = "klein";
  const need3 = (n2, what) => {
    if (job.images.length < n2) throw new Error(`${what} is required`);
  };
  if (job.mode === "t2i") {
    const g = await getWorkflow(f, "t2i");
    kleinCommon(g, job, m, { ...FK, sampling: FK.sampling }, void 0);
    set(g, FK.latent, "width", job.width);
    set(g, FK.latent, "height", job.height);
    set(g, FK.latent, "batch_size", job.batch);
    set(g, FK.sampler, "denoise", 1);
    return { graph: g, hint: "Klein T2I" };
  }
  if (job.mode === "i2i") {
    need3(1, "Source image");
    const g = await getWorkflow(f, "i2i");
    kleinCommon(g, job, m, { ...FK }, void 0);
    set(g, "FKI2I:img", "image", job.images[0]);
    if (job.width > 0 && job.height > 0) {
      g["FKI2I:scale"] = { class_type: "ImageScale", inputs: { image: ["FKI2I:img", 0], width: job.width, height: job.height, upscale_method: "lanczos", crop: "disabled" } };
      set(g, "FKI2I:vae", "pixels", ["FKI2I:scale", 0]);
    }
    set(g, FK.sampler, "denoise", job.denoise);
    return { graph: g, hint: "Klein I2I" };
  }
  if (job.mode === "edit" || job.mode === "outpaint") {
    need3(1, "Image 1");
    const g = await getWorkflow(f, "edit");
    kleinCommon(g, job, m, { ...FK }, void 0);
    set(g, "FK:91", "image", job.images[0]);
    set(g, FK.sampler, "denoise", 1);
    if (job.mode === "outpaint") {
      const { left, top, right, bottom } = job.pad;
      if (left + top + right + bottom <= 0) throw new Error("Set at least one expansion above 0 px");
      set(g, FK.pos, "text", `Extend the composition of this image. Replace all black areas with a logical continuation of the background and foreground. Ensure the transition is invisible and the new elements match the perspective and color palette of the original. Scene description: ${job.prompt}`);
      g["FKO:pad"] = { class_type: "ImagePadKJ", inputs: { image: ["FK:91", 0], left, top, right, bottom, extra_padding: 0, pad_mode: "color", color: "0, 0, 0" } };
      set(g, "FK:163", "image", ["FKO:pad", 0]);
      set(g, "FK:167", "image", ["FK:163", 0]);
      for (const id of ["FK:88", "FK:163b", "FK:232", "FK:233", "FK:231"]) delete g[id];
      set(g, FK.sampler, "positive", ["FK:133", 0]);
      set(g, FK.sampler, "negative", ["FK:131", 0]);
      return { graph: g, hint: "Klein Outpaint (needs ComfyUI-KJNodes)" };
    }
    if (job.images[1]) {
      set(g, "FK:88", "image", job.images[1]);
    } else {
      for (const id of ["FK:88", "FK:163b", "FK:232", "FK:233", "FK:231"]) delete g[id];
      set(g, FK.sampler, "positive", ["FK:133", 0]);
      set(g, FK.sampler, "negative", ["FK:131", 0]);
    }
    return { graph: g, hint: "Klein Edit" };
  }
  if (job.mode === "inpaint") {
    need3(1, "Source image");
    if (!job.mask) throw new Error("A mask is required");
    const g = await getWorkflow(f, "inpaint");
    const I = { unet: "FKI:194", clip: "FKI:195", vae: "FKI:196", pos: "FKI:6", sampler: "FKI:163", save: "FKI:203" };
    const out = kleinCommon(g, job, m, { ...I, sampling: "FKI:__none" }, "FKI:216");
    set(g, "FKI:163", "model", out);
    set(g, "FKI:198", "image", job.images[0]);
    set(g, "FKI:199", "image", job.mask);
    set(g, "FKI:163", "denoise", job.denoise);
    return { graph: g, hint: "Klein Inpaint (needs Inpaint-CropAndStitch)" };
  }
  if (job.mode === "faceswap") {
    need3(2, "Target image and face source");
    const g = await getWorkflow(f, "faceswap");
    const W = { unet: "FKF:225", clip: "FKF:223", vae: "FKF:235", sampling: "FKF:239", sampler: "FKF:228", pos: "FKF:227", save: "FKF:232" };
    g[W.unet] = { ...g[W.unet], ...unet(m.model) };
    g[W.clip] = { ...g[W.clip], ...clip(m.textEncoder, "flux2") };
    set(g, W.vae, "vae_name", m.vae);
    set(g, "FKF:234", "image", job.images[0]);
    set(g, "FKF:236", "image", job.images[1]);
    const face = job.loras.find((l) => l.name && l.name !== "none" && l.strength > 0);
    if (face) {
      set(g, "FKF:226", "lora_name", face.name);
      set(g, "FKF:226", "strength_model", face.strength);
    } else {
      delete g["FKF:226"];
      set(g, W.sampling, "model", [W.unet, 0]);
    }
    if (job.prompt.trim()) set(g, W.pos, "text", job.prompt);
    const s = W.sampler;
    set(g, s, "seed", job.seed);
    set(g, s, "steps", job.steps);
    set(g, s, "cfg", job.cfg);
    set(g, s, "sampler_name", job.sampler);
    set(g, s, "scheduler", job.scheduler);
    set(g, s, "denoise", job.denoise);
    g[W.save].inputs.filename_prefix = `${job.saveSubfolder}/FK`;
    return { graph: g, hint: "Klein Face Swap" };
  }
  throw new Error(`Flux.2 Klein has no "${job.mode}" mode`);
}
function zBase(job, m, diffDiff = false) {
  const g = {};
  g["Z:unet"] = unet(m.model);
  g["Z:clip"] = clip(m.textEncoder, "lumina2");
  g["Z:vae"] = { class_type: "VAELoader", inputs: { vae_name: m.vae } };
  const model = loraChain(g, ["Z:unet", 0], job.loras, "Z:");
  g["Z:sampling"] = { class_type: "ModelSamplingAuraFlow", inputs: { model, shift: 3 } };
  let modelOut = ["Z:sampling", 0];
  if (diffDiff) {
    g["Z:dd"] = { class_type: "DifferentialDiffusion", inputs: { model: modelOut } };
    modelOut = ["Z:dd", 0];
  }
  g["Z:pos"] = { class_type: "CLIPTextEncode", inputs: { clip: ["Z:clip", 0], text: job.prompt } };
  g["Z:neg"] = job.negative.trim() ? { class_type: "CLIPTextEncode", inputs: { clip: ["Z:clip", 0], text: job.negative } } : { class_type: "ConditioningZeroOut", inputs: { conditioning: ["Z:pos", 0] } };
  return { g, modelOut };
}
function zSampler(job, modelOut, latent, denoise) {
  return {
    class_type: "KSampler",
    inputs: {
      model: modelOut,
      positive: ["Z:pos", 0],
      negative: ["Z:neg", 0],
      latent_image: latent,
      seed: job.seed,
      steps: job.steps,
      cfg: job.cfg,
      sampler_name: job.sampler,
      scheduler: job.scheduler,
      denoise
    }
  };
}
function buildZImage(job, m) {
  const finish = (g, from) => {
    g["Z:decode"] = { class_type: "VAEDecode", inputs: { samples: from, vae: ["Z:vae", 0] } };
    g["Z:save"] = saveNode(job, ["Z:decode", 0], "ZIT");
    return g;
  };
  if (job.mode === "t2i") {
    const { g, modelOut } = zBase(job, m);
    g["Z:latent"] = { class_type: "EmptySD3LatentImage", inputs: { width: job.width, height: job.height, batch_size: job.batch } };
    g["Z:sampler"] = zSampler(job, modelOut, ["Z:latent", 0], 1);
    return { graph: finish(g, ["Z:sampler", 0]), hint: "Z-Image T2I" };
  }
  if (job.mode === "i2i" || job.mode === "edit") {
    if (!job.images[0]) throw new Error("Source image is required");
    const { g, modelOut } = zBase(job, m);
    g["Z:load"] = { class_type: "LoadImage", inputs: { image: job.images[0] } };
    let pix = ["Z:load", 0];
    if (job.width > 0 && job.height > 0) {
      g["Z:scale"] = { class_type: "ImageScale", inputs: { image: pix, width: job.width, height: job.height, upscale_method: "lanczos", crop: "disabled" } };
      pix = ["Z:scale", 0];
    }
    g["Z:enc"] = { class_type: "VAEEncode", inputs: { pixels: pix, vae: ["Z:vae", 0] } };
    g["Z:sampler"] = zSampler(job, modelOut, ["Z:enc", 0], job.denoise);
    return { graph: finish(g, ["Z:sampler", 0]), hint: "Z-Image I2I" };
  }
  if (job.mode === "inpaint") {
    if (!job.images[0]) throw new Error("Source image is required");
    if (!job.mask) throw new Error("A mask is required");
    const { g, modelOut } = zBase(job, m, true);
    g["Z:load"] = { class_type: "LoadImage", inputs: { image: job.images[0] } };
    g["Z:loadMask"] = { class_type: "LoadImage", inputs: { image: job.mask } };
    g["Z:mask"] = { class_type: "ImageToMask", inputs: { image: ["Z:loadMask", 0], channel: "red" } };
    g["Z:enc"] = { class_type: "VAEEncode", inputs: { pixels: ["Z:load", 0], vae: ["Z:vae", 0] } };
    g["Z:noise"] = { class_type: "SetLatentNoiseMask", inputs: { samples: ["Z:enc", 0], mask: ["Z:mask", 0] } };
    g["Z:sampler"] = zSampler(job, modelOut, ["Z:noise", 0], job.denoise);
    return { graph: finish(g, ["Z:sampler", 0]), hint: "Z-Image Inpaint" };
  }
  if (job.mode === "outpaint") {
    if (!job.images[0]) throw new Error("Source image is required");
    const { left, top, right, bottom } = job.pad;
    if (left + top + right + bottom <= 0) throw new Error("Set at least one expansion above 0 px");
    const { g, modelOut } = zBase(job, m, true);
    g["Z:load"] = { class_type: "LoadImage", inputs: { image: job.images[0] } };
    g["Z:pad"] = { class_type: "ImagePadForOutpaint", inputs: { image: ["Z:load", 0], left, top, right, bottom, feathering: 32 } };
    g["Z:enc"] = { class_type: "VAEEncode", inputs: { pixels: ["Z:pad", 0], vae: ["Z:vae", 0] } };
    g["Z:noise"] = { class_type: "SetLatentNoiseMask", inputs: { samples: ["Z:enc", 0], mask: ["Z:pad", 1] } };
    g["Z:sampler"] = zSampler(job, modelOut, ["Z:noise", 0], 1);
    return { graph: finish(g, ["Z:sampler", 0]), hint: "Z-Image Outpaint" };
  }
  if (job.mode === "controlnet" || job.mode === "facedraw") {
    const c = job.control;
    if (!c || !c.patch || c.patch === "none") throw new Error("Pick the Z-Image ControlNet model patch (ModelPatchLoader) on the card");
    if (!job.images[0]) throw new Error("Source image is required");
    const { g } = zBase(job, m);
    const modelIn = g["Z:sampling"].inputs.model;
    delete g["Z:sampling"];
    g["Z:load"] = { class_type: "LoadImage", inputs: { image: job.images[0] } };
    let src = ["Z:load", 0];
    let crop = false;
    if (job.mode === "facedraw") {
      const f = job.face;
      if (!f.detector || f.detector === "none") throw new Error("Pick a face detector on the card");
      g["Z:bbox"] = { class_type: "UltralyticsDetectorProvider", inputs: { model_name: f.detector } };
      g["Z:faceMask"] = { class_type: "BboxDetectorCombined_v2", inputs: { bbox_detector: ["Z:bbox", 0], image: src, threshold: f.threshold, dilation: f.dilation } };
      g["Z:crop"] = { class_type: "InpaintCropImproved", inputs: { image: src, mask: ["Z:faceMask", 0], downscale_algorithm: "bilinear", upscale_algorithm: "bicubic", preresize: false, preresize_mode: "ensure minimum resolution", preresize_min_width: 1024, preresize_min_height: 1024, preresize_max_width: 16384, preresize_max_height: 16384, mask_fill_holes: true, mask_expand_pixels: 0, mask_invert: false, mask_blend_pixels: 32, mask_hipass_filter: 0.1, extend_for_outpainting: false, extend_up_factor: 1, extend_down_factor: 1, extend_left_factor: 1, extend_right_factor: 1, context_from_mask_extend_factor: f.context, output_resize_to_target_size: true, output_target_width: f.size, output_target_height: f.size, output_padding: "32", device_mode: "gpu (much faster)" } };
      src = ["Z:crop", 1];
      crop = true;
    }
    g["Z:pre"] = { class_type: "AIO_Preprocessor", inputs: { image: src, preprocessor: c.preprocessor, resolution: c.resolution } };
    g["Z:patch"] = { class_type: "ModelPatchLoader", inputs: { name: c.patch } };
    g["Z:sampling"] = { class_type: "ModelSamplingAuraFlow", inputs: { model: modelIn, shift: 3 } };
    g["Z:cn"] = { class_type: "ZImageFunControlnet", inputs: { model: ["Z:sampling", 0], model_patch: ["Z:patch", 0], vae: ["Z:vae", 0], strength: c.strength, image: ["Z:pre", 0] } };
    let latent;
    if (crop) {
      g["Z:enc"] = { class_type: "VAEEncode", inputs: { pixels: ["Z:crop", 1], vae: ["Z:vae", 0] } };
      g["Z:noise"] = { class_type: "SetLatentNoiseMask", inputs: { samples: ["Z:enc", 0], mask: ["Z:crop", 2] } };
      latent = ["Z:noise", 0];
    } else {
      g["Z:size"] = { class_type: "GetImageSize", inputs: { image: ["Z:pre", 0] } };
      g["Z:latent"] = { class_type: "EmptySD3LatentImage", inputs: { width: ["Z:size", 0], height: ["Z:size", 1], batch_size: job.batch } };
      latent = ["Z:latent", 0];
    }
    g["Z:sampler"] = { class_type: "KSampler", inputs: { model: ["Z:cn", 0], positive: ["Z:pos", 0], negative: ["Z:neg", 0], latent_image: latent, seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise: crop ? job.denoise : 1 } };
    g["Z:decode"] = { class_type: "VAEDecode", inputs: { samples: ["Z:sampler", 0], vae: ["Z:vae", 0] } };
    let out = ["Z:decode", 0];
    if (crop) {
      g["Z:stitch"] = { class_type: "InpaintStitchImproved", inputs: { stitcher: ["Z:crop", 0], inpainted_image: out } };
      out = ["Z:stitch", 0];
    }
    g["Z:save"] = saveNode(job, out, "ZIT");
    return { graph: g, hint: crop ? "Z-Image Face Redraw" : "Z-Image ControlNet" };
  }
  throw new Error(`Z-Image Turbo has no "${job.mode}" mode`);
}
function buildKrea2(job, m, anima2 = false) {
  const label = anima2 ? "Anima" : "Krea 2";
  if (job.mode !== "t2i" && job.mode !== "i2i" && job.mode !== "edit" && !(job.mode === "krea2control" && !anima2) && !(job.mode === "identity" && !anima2) && !(job.mode === "animactrl" && anima2)) throw new Error(`${label} has no "${job.mode}" mode`);
  const g = {};
  g["K:unet"] = isGguf(m.model) && !anima2 ? { class_type: "TJ_NODE_Krea2UnetLoaderGGUF", inputs: { unet_name: m.model } } : unet(m.model);
  g["K:clip"] = isGguf(m.textEncoder) && !anima2 ? { class_type: "TJ_NODE_Krea2ClipLoaderGGUF", inputs: { clip_name: m.textEncoder } } : clip(m.textEncoder, anima2 ? "stable_diffusion" : "krea2");
  g["K:vae"] = { class_type: "VAELoader", inputs: { vae_name: m.vae } };
  const model = loraChain(g, ["K:unet", 0], job.loras, "K:");
  g["K:pos"] = { class_type: "CLIPTextEncode", inputs: { clip: ["K:clip", 0], text: job.prompt } };
  g["K:neg"] = job.negative.trim() ? { class_type: "CLIPTextEncode", inputs: { clip: ["K:clip", 0], text: job.negative } } : { class_type: "ConditioningZeroOut", inputs: { conditioning: ["K:pos", 0] } };
  if (job.mode === "identity") {
    const c = job.identity;
    if (!c.lora || c.lora === "none") throw new Error("Pick the Krea 2 identity-edit LoRA on the card");
    if (!job.images[0]) throw new Error("Source image is required");
    if (!job.prompt.trim()) throw new Error("Write an edit instruction (for example: recolor the car to matte black)");
    const gi = { "K:unet": g["K:unet"], "K:clip": g["K:clip"], "K:vae": g["K:vae"] };
    gi["ID:lora"] = { class_type: "LoraLoaderModelOnly", inputs: { model: ["K:unet", 0], lora_name: c.lora, strength_model: c.strength } };
    const m2 = loraChain(gi, ["ID:lora", 0], job.loras, "ID:");
    gi["ID:load"] = { class_type: "LoadImage", inputs: { image: job.images[0] } };
    gi["ID:enc"] = { class_type: "VAEEncode", inputs: { pixels: ["ID:load", 0], vae: ["K:vae", 0] } };
    const patch = { model: m2, source_latent: ["ID:enc", 0], vae: ["K:vae", 0], source_image: ["ID:load", 0], fit_mode: c.fit, ref_boost: c.refBoost };
    const posEnc = { clip: ["K:clip", 0], prompt: job.prompt, image: ["ID:load", 0], grounding_px: c.groundingPx };
    const negEnc = { clip: ["K:clip", 0], prompt: "", image: ["ID:load", 0], grounding_px: c.groundingPx };
    if (job.images[1]) {
      gi["ID:loadB"] = { class_type: "LoadImage", inputs: { image: job.images[1] } };
      gi["ID:encB"] = { class_type: "VAEEncode", inputs: { pixels: ["ID:loadB", 0], vae: ["K:vae", 0] } };
      patch.source_latent_b = ["ID:encB", 0];
      patch.source_image_b = ["ID:loadB", 0];
      posEnc.image_b = ["ID:loadB", 0];
      negEnc.image_b = ["ID:loadB", 0];
    }
    gi["ID:patch"] = { class_type: "Krea2EditModelPatch", inputs: patch };
    gi["ID:pos"] = { class_type: "Krea2EditGroundedEncode", inputs: posEnc };
    gi["ID:neg"] = { class_type: "Krea2EditGroundedEncode", inputs: negEnc };
    gi["ID:latent"] = { class_type: "EmptySD3LatentImage", inputs: { width: c.width || 1024, height: c.height || 1024, batch_size: 1 } };
    gi["ID:sampler"] = { class_type: "KSampler", inputs: { model: ["ID:patch", 0], positive: ["ID:pos", 0], negative: ["ID:neg", 0], latent_image: ["ID:latent", 0], seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise: 1 } };
    gi["ID:decode"] = { class_type: "VAEDecode", inputs: { samples: ["ID:sampler", 0], vae: ["K:vae", 0] } };
    gi["ID:save"] = saveNode(job, ["ID:decode", 0], "K2ID");
    return { graph: gi, hint: "Krea 2 Identity Edit" };
  }
  let latent;
  let denoise = 1;
  let modelOut = model;
  if (job.mode === "animactrl") {
    const a = job.anima;
    if (!job.images[0]) throw new Error("Source image is required");
    if (a.type === "inpaint" && !job.mask) throw new Error("A mask is required for Anima inpainting");
    g["K:src"] = { class_type: "LoadImage", inputs: { image: job.images[0] } };
    if (job.mask) {
      g["K:msrc"] = { class_type: "LoadImage", inputs: { image: job.mask } };
      g["K:mask"] = { class_type: "ImageToMask", inputs: { image: ["K:msrc", 0], channel: "red" } };
    } else g["K:mask"] = { class_type: "SolidMask", inputs: { value: 1, width: job.width || 1024, height: job.height || 1024 } };
    let ctrl = ["K:src", 0];
    if (a.type === "depthcontrol") {
      g["K:depth"] = { class_type: "DepthAnythingV2Preprocessor", inputs: { image: ctrl, ckpt_name: a.depthCkpt || "depth_anything_v2_vitl.pth", resolution: a.resolution } };
      ctrl = ["K:depth", 0];
    }
    if (!a.patch || a.patch === "none") throw new Error("Pick the Anima LLLite model (ModelPatchLoader) on the card");
    g["K:patch"] = { class_type: "ModelPatchLoader", inputs: { name: a.patch } };
    g["K:lllite"] = { class_type: "AnimaLLLiteApply", inputs: { model, model_patch: ["K:patch", 0], image: ctrl, mask: ["K:mask", 0], strength: a.strength, start_percent: a.start, end_percent: a.end } };
    modelOut = ["K:lllite", 0];
    g["K:latent"] = { class_type: "EmptyLatentImage", inputs: { width: job.width || 1024, height: job.height || 1024, batch_size: 1 } };
    latent = ["K:latent", 0];
  } else if (job.mode === "krea2control") {
    const c = job.kcontrol;
    if (!c.lora || c.lora === "none") throw new Error("Pick the control LoRA on the card (depth or canny)");
    if (!job.images[0]) throw new Error("Control image is required");
    g["K:ctrlImg"] = { class_type: "LoadImage", inputs: { image: job.images[0] } };
    g["K:pre"] = c.type === "canny" ? { class_type: "CannyEdgePreprocessor", inputs: { image: ["K:ctrlImg", 0], low_threshold: c.cannyLow, high_threshold: c.cannyHigh, resolution: c.resolution } } : { class_type: "DepthAnythingV2Preprocessor", inputs: { image: ["K:ctrlImg", 0], ckpt_name: c.depthCkpt || "depth_anything_v2_vitl.pth", resolution: c.resolution } };
    g["K:latent"] = { class_type: "EmptyLatentImage", inputs: { width: job.width || 1024, height: job.height || 1024, batch_size: job.batch } };
    latent = ["K:latent", 0];
    if (c.type === "canny") {
      g["K:cscale"] = { class_type: "ImageScaleToTotalPixels", inputs: { image: ["K:pre", 0], upscale_method: "lanczos", megapixels: 1, resolution_steps: 16 } };
      g["K:cenc"] = { class_type: "VAEEncode", inputs: { pixels: ["K:cscale", 0], vae: ["K:vae", 0] } };
      g["K:nk2e"] = { class_type: "NK2EInContextEditNode", inputs: { model, reference: ["K:cenc", 0] } };
      g["K:clora"] = { class_type: "LoraLoaderModelOnly", inputs: { model: ["K:nk2e", 0], lora_name: c.lora, strength_model: c.strength } };
      modelOut = ["K:clora", 0];
      latent = ["K:cenc", 0];
    } else {
      g["K:clora"] = { class_type: "Krea2ControlLoRALoader", inputs: { model, lora_name: c.lora, strength: c.strength } };
      g["K:cenc"] = { class_type: "Krea2ControlImageEncode", inputs: { control_image: ["K:pre", 0], vae: ["K:vae", 0], latent, resize: "match_latent_size", upscale_method: "bicubic", crop: "center", channel_mode: "rgb", normalize: "per_image_minmax", invert: false, batch_mode: "independent_images" } };
      g["K:capply"] = { class_type: "Krea2ControlApply", inputs: { model: ["K:clora", 0], control_latent: ["K:cenc", 0] } };
      modelOut = ["K:capply", 0];
    }
  } else if (job.mode === "t2i") {
    g["K:latent"] = { class_type: "EmptyLatentImage", inputs: { width: job.width, height: job.height, batch_size: job.batch } };
    latent = ["K:latent", 0];
  } else {
    if (!job.images[0]) throw new Error("Source image is required");
    g["K:load"] = { class_type: "LoadImage", inputs: { image: job.images[0] } };
    let pix = ["K:load", 0];
    if (job.width > 0 && job.height > 0) {
      g["K:scale"] = { class_type: "ImageScale", inputs: { image: pix, width: job.width, height: job.height, upscale_method: "lanczos", crop: "disabled" } };
      pix = ["K:scale", 0];
    }
    g["K:enc"] = { class_type: "VAEEncode", inputs: { pixels: pix, vae: ["K:vae", 0] } };
    latent = ["K:enc", 0];
    denoise = job.denoise;
  }
  g["K:sampler"] = {
    class_type: "KSampler",
    inputs: { model: modelOut, positive: ["K:pos", 0], negative: ["K:neg", 0], latent_image: latent, seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise }
  };
  g["K:decode"] = { class_type: "VAEDecode", inputs: { samples: ["K:sampler", 0], vae: ["K:vae", 0] } };
  g["K:save"] = saveNode(job, ["K:decode", 0], anima2 ? "Anima" : "K2");
  return { graph: g, hint: `${label} ${job.mode.toUpperCase()}` };
}
function buildQwen(job, m) {
  const g = {};
  g["QE:unet"] = unet(m.model);
  g["QE:clip"] = { class_type: "CLIPLoader", inputs: { clip_name: m.textEncoder, type: "qwen_image", device: "default" } };
  g["QE:vae"] = { class_type: "VAELoader", inputs: { vae_name: m.vae } };
  const model = loraChain(g, ["QE:unet", 0], job.loras, "QE:");
  g["QE:samp"] = { class_type: "ModelSamplingAuraFlow", inputs: { model, shift: 3.1 } };
  g["QE:cfgnorm"] = { class_type: "CFGNorm", inputs: { model: ["QE:samp", 0], strength: 1 } };
  const vae = ["QE:vae", 0];
  const refs = job.mode === "t2i" ? [] : job.images.slice(0, 3);
  if (job.mode !== "t2i" && !refs.length) throw new Error("Source image is required");
  refs.forEach((img, i) => {
    g[`QE:load${i}`] = { class_type: "LoadImage", inputs: { image: img } };
    g[`QE:scale${i}`] = { class_type: "FluxKontextImageScale", inputs: { image: [`QE:load${i}`, 0] } };
  });
  if (refs.length) g["QE:enc"] = { class_type: "VAEEncode", inputs: { pixels: ["QE:scale0", 0], vae } };
  const cond = (id, text3, n2) => {
    const inputs = { clip: ["QE:clip", 0], vae, prompt: text3 };
    for (let k = 0; k < n2; k++) inputs[`image${k + 1}`] = [`QE:scale${k}`, 0];
    g[id] = { class_type: "TextEncodeQwenImageEditPlus", inputs };
  };
  cond("QE:pos", job.prompt, refs.length);
  cond("QE:neg", job.negative, Math.min(1, refs.length));
  let pos = ["QE:pos", 0], neg = ["QE:neg", 0];
  if (refs.length) {
    g["QE:rpos"] = { class_type: "FluxKontextMultiReferenceLatentMethod", inputs: { conditioning: pos, reference_latents_method: "index_timestep_zero" } };
    g["QE:rneg"] = { class_type: "FluxKontextMultiReferenceLatentMethod", inputs: { conditioning: neg, reference_latents_method: "index_timestep_zero" } };
    pos = ["QE:rpos", 0];
    neg = ["QE:rneg", 0];
  }
  let latent, denoise = 1;
  if (job.mode === "t2i") {
    g["QE:latent"] = { class_type: "EmptyLatentImage", inputs: { width: job.width, height: job.height, batch_size: job.batch } };
    latent = ["QE:latent", 0];
  } else if (job.mode === "inpaint") {
    if (!job.mask) throw new Error("A mask is required");
    g["QE:maskImg"] = { class_type: "LoadImage", inputs: { image: job.mask } };
    g["QE:mask"] = { class_type: "ImageToMask", inputs: { image: ["QE:maskImg", 0], channel: "red" } };
    g["QE:nm"] = { class_type: "SetLatentNoiseMask", inputs: { samples: ["QE:enc", 0], mask: ["QE:mask", 0] } };
    latent = ["QE:nm", 0];
    denoise = job.denoise;
  } else {
    latent = ["QE:enc", 0];
    denoise = job.mode === "i2i" ? job.denoise : 1;
  }
  g["QE:sampler"] = { class_type: "KSampler", inputs: { model: ["QE:cfgnorm", 0], positive: pos, negative: neg, latent_image: latent, seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise } };
  g["QE:decode"] = { class_type: "VAEDecode", inputs: { samples: ["QE:sampler", 0], vae } };
  g["QE:save"] = saveNode(job, ["QE:decode", 0], "QE");
  return { graph: g, hint: `Qwen Edit ${job.mode.toUpperCase()}` };
}
function buildQwen21(job, m) {
  if (!["t2i", "i2i", "edit"].includes(job.mode)) throw new Error(`Qwen Image 2.1 has no "${job.mode}" mode`);
  const g = {};
  g["Q21:unet"] = unet(m.model);
  g["Q21:clip"] = { class_type: "CLIPLoader", inputs: { clip_name: m.textEncoder, type: "qwen_image", device: "default" } };
  g["Q21:vae"] = { class_type: "VAELoader", inputs: { vae_name: m.vae } };
  const model = loraChain(g, ["Q21:unet", 0], job.loras, "Q21:");
  const w = job.width > 0 ? job.width : 1024, h = job.height > 0 ? job.height : 1024;
  g["Q21:samp"] = { class_type: "ModelSamplingFlux", inputs: { model, max_shift: 0.69, base_shift: 0.5, width: w, height: h } };
  g["Q21:cache"] = { class_type: "QwenImage21Cache", inputs: { model: ["Q21:samp", 0], device: "auto", dtype: "default" } };
  const enc = { clip: ["Q21:clip", 0], vae: ["Q21:vae", 0], prompt: job.prompt, negative_prompt: job.negative, resolution: Math.max(w, h) };
  const refs = job.mode === "t2i" ? [] : job.images.slice(0, 10);
  if (job.mode !== "t2i" && !refs.length) throw new Error("Source image is required");
  refs.forEach((img, i) => {
    g[`Q21:img${i}`] = { class_type: "LoadImage", inputs: { image: img } };
    enc[`images.image_${i + 1}`] = [`Q21:img${i}`, 0];
  });
  g["Q21:enc"] = { class_type: "TextEncodeQwenImage21", inputs: enc };
  let latent = ["Q21:enc", 2], denoise = job.mode === "i2i" ? job.denoise : 1;
  if (job.mode === "t2i") {
    g["Q21:latent"] = { class_type: "EmptyLatentImage", inputs: { width: w, height: h, batch_size: job.batch } };
    latent = ["Q21:latent", 0];
  }
  g["Q21:sampler"] = { class_type: "KSampler", inputs: { model: ["Q21:cache", 0], positive: ["Q21:enc", 0], negative: ["Q21:enc", 1], latent_image: latent, seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise } };
  g["Q21:decode"] = { class_type: "VAEDecode", inputs: { samples: ["Q21:sampler", 0], vae: ["Q21:vae", 0] } };
  g["Q21:save"] = saveNode(job, ["Q21:decode", 0], "Q21");
  return { graph: g, hint: `Qwen 2.1 ${job.mode.toUpperCase()}` };
}
function buildSdxl(job, m) {
  const g = {};
  g["SX:ckpt"] = { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: m.model } };
  let mo = ["SX:ckpt", 0], co = ["SX:ckpt", 1];
  job.loras.forEach((l, i) => {
    if (!l.name || l.name === "none" || !(l.strength > 0)) return;
    const id = `SX:lora${i}`;
    g[id] = { class_type: "LoraLoader", inputs: { model: mo, clip: co, lora_name: l.name, strength_model: l.strength, strength_clip: l.strength } };
    mo = [id, 0];
    co = [id, 1];
  });
  g["SX:pos"] = { class_type: "CLIPTextEncode", inputs: { text: job.prompt, clip: co } };
  g["SX:neg"] = { class_type: "CLIPTextEncode", inputs: { text: job.negative, clip: co } };
  const vae = ["SX:ckpt", 2];
  const sampler2 = (model, latent2, denoise2) => ({
    class_type: "KSampler",
    inputs: { model, positive: ["SX:pos", 0], negative: ["SX:neg", 0], latent_image: latent2, seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise: denoise2 }
  });
  const need3 = () => {
    if (!job.images[0]) throw new Error("Source image is required");
    g["SX:load"] = { class_type: "LoadImage", inputs: { image: job.images[0] } };
  };
  let modelOut = mo, latent, denoise = 1;
  if (job.mode === "t2i") {
    g["SX:latent"] = { class_type: "EmptyLatentImage", inputs: { width: job.width, height: job.height, batch_size: job.batch } };
    latent = ["SX:latent", 0];
  } else if (job.mode === "i2i" || job.mode === "edit") {
    need3();
    let pix = ["SX:load", 0];
    if (job.width > 0 && job.height > 0) {
      g["SX:scale"] = { class_type: "ImageScale", inputs: { image: pix, width: job.width, height: job.height, upscale_method: "lanczos", crop: "disabled" } };
      pix = ["SX:scale", 0];
    }
    g["SX:enc"] = { class_type: "VAEEncode", inputs: { pixels: pix, vae } };
    latent = ["SX:enc", 0];
    denoise = job.denoise;
  } else if (job.mode === "inpaint") {
    need3();
    if (!job.mask) throw new Error("A mask is required");
    g["SX:dd"] = { class_type: "DifferentialDiffusion", inputs: { model: mo } };
    modelOut = ["SX:dd", 0];
    g["SX:maskImg"] = { class_type: "LoadImage", inputs: { image: job.mask } };
    g["SX:mask"] = { class_type: "ImageToMask", inputs: { image: ["SX:maskImg", 0], channel: "red" } };
    g["SX:enc"] = { class_type: "VAEEncodeForInpaint", inputs: { pixels: ["SX:load", 0], vae, mask: ["SX:mask", 0], grow_mask_by: 6 } };
    latent = ["SX:enc", 0];
    denoise = job.denoise;
  } else if (job.mode === "outpaint") {
    need3();
    const { left, top, right, bottom } = job.pad;
    if (left + top + right + bottom <= 0) throw new Error("Set at least one expansion above 0 px");
    g["SX:dd"] = { class_type: "DifferentialDiffusion", inputs: { model: mo } };
    modelOut = ["SX:dd", 0];
    g["SX:pad"] = { class_type: "ImagePadForOutpaint", inputs: { image: ["SX:load", 0], left, top, right, bottom, feathering: 32 } };
    g["SX:enc0"] = { class_type: "VAEEncode", inputs: { pixels: ["SX:pad", 0], vae } };
    g["SX:enc"] = { class_type: "SetLatentNoiseMask", inputs: { samples: ["SX:enc0", 0], mask: ["SX:pad", 1] } };
    latent = ["SX:enc", 0];
  } else throw new Error(`SDXL has no "${job.mode}" mode`);
  g["SX:sampler"] = sampler2(modelOut, latent, denoise);
  g["SX:decode"] = { class_type: "VAEDecode", inputs: { samples: ["SX:sampler", 0], vae } };
  g["SX:save"] = saveNode(job, ["SX:decode", 0], "SX");
  return { graph: g, hint: `SDXL ${job.mode.toUpperCase()}` };
}
async function buildRemoveBg(job) {
  if (!job.images[0]) throw new Error("Source image is required");
  const g = await getWorkflow("klein", "remove_bg");
  set(g, "rmbg:img", "image", job.images[0]);
  if (job.bgModel) set(g, "rmbg:load", "bg_removal_name", job.bgModel);
  g["rmbg:save"].inputs.filename_prefix = `${job.saveSubfolder}/rmbg`;
  return { graph: g, hint: "Remove background" };
}
async function buildImageGraph(job) {
  if (job.mode === "removebg") return buildRemoveBg(job);
  const picked = await pickModels(job.family, job.models);
  if (!picked.model) throw new Error(`No ${job.family} diffusion model found. Pick one in Settings \u2192 Image models.`);
  const m = { model: picked.model, textEncoder: picked.textEncoder, vae: picked.vae };
  const withDefaults = { ...job, negative: job.negative || picked.negative };
  if (job.family === "klein") return buildKlein(withDefaults, m);
  if (job.family === "krea2") return buildKrea2(withDefaults, m);
  if (job.family === "qwen21") return buildQwen21(withDefaults, m);
  if (job.family === "qwen") return buildQwen(withDefaults, m);
  if (job.family === "anima") return buildKrea2(withDefaults, m, true);
  if (job.family === "sdxl") return buildSdxl(withDefaults, m);
  return buildZImage(withDefaults, m);
}

// src/backend/llm.ts
init_http();
init_comfy();
init_settings();
var PREFIX = "canvers_llm_";
async function loadServerSettings() {
  try {
    const { settings } = await getJson("/tj_shared/llm_settings");
    const patch = {};
    for (const k of Object.keys(DEFAULT_LLM)) {
      const v = settings?.[PREFIX + k];
      if (v !== void 0 && typeof v === typeof DEFAULT_LLM[k]) patch[k] = v;
    }
    if (Object.keys(patch).length) useSettings.getState().setLlm(patch);
  } catch {
  }
}
var sentKeys = /* @__PURE__ */ new Map();
var ROLES = { text: "img_enhance", vision: "img_i2p" };
async function connectCustom(role = ROLES.text, which) {
  const { keys } = useSettings.getState();
  const llm = which ?? useSettings.getState().llm;
  const res = await postJson("/tj_shared/custom_llm/connect", {
    role,
    base_url: llm.custom_base,
    api_key: keys.custom,
    model: llm.custom_model
  });
  if (res.ok && keys.custom) sentKeys.set(role, `${llm.custom_base}|${keys.custom}`);
  return res;
}
async function ensureCustomKeys(roles, which) {
  const { keys } = useSettings.getState();
  const llm = which ?? useSettings.getState().llm;
  if (!keys.custom) return;
  for (const r of roles) {
    if (sentKeys.get(r) !== `${llm.custom_base}|${keys.custom}`) await connectCustom(r, which);
  }
}
var toDataUrl = (b) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(String(fr.result));
  fr.onerror = () => rej(fr.error);
  fr.readAsDataURL(b);
});
async function imageDataUrl(a, maxEdge = 1280) {
  const blob = await fetchBlob(a);
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const out = await new Promise((res, rej) => c.toBlob((b) => b ? res(b) : rej(new Error("encode failed")), "image/jpeg", 0.9));
  return toDataUrl(out);
}
function common(l, req) {
  return {
    backend: l.backend,
    temperature: req.temperature ?? l.temperature,
    max_tokens: req.max_tokens ?? l.max_tokens,
    gguf_model: l.gguf_model,
    mmproj_file: l.mmproj_file,
    n_ctx: l.n_ctx,
    n_gpu_layers: l.n_gpu_layers,
    text_encoder_name: l.text_encoder_name,
    clip_loader_type: l.clip_loader_type,
    or_model: l.or_model_text,
    custom_base: l.custom_base,
    custom_model: l.custom_model,
    custom_ctx: l.custom_ctx || void 0
  };
}
var warmed = false;
async function warmUpServer() {
  if (warmed) return;
  warmed = true;
  try {
    await postJson("/prompt", { prompt: { 1: { class_type: "EmptyImage", inputs: { width: 64, height: 64, batch_size: 1, color: 0 } }, 2: { class_type: "PreviewImage", inputs: { images: ["1", 0] } } } });
    await new Promise((r) => setTimeout(r, 2500));
  } catch {
  }
}
async function runLlm(req, retried = false) {
  const l = req.llm ?? useSettings.getState().llm;
  const images = req.images ?? [];
  if (l.backend === "custom") {
    if (!l.custom_base.trim()) throw new Error("Connect Custom: set the base URL in Settings \u2192 LLM");
    if (!l.custom_model.trim()) throw new Error("Connect Custom: pick a model in Settings \u2192 LLM");
    await ensureCustomKeys(images.length ? [ROLES.text, ROLES.vision] : [ROLES.text], req.llm);
  }
  let res;
  if (images.length) {
    const b64 = await imageDataUrl(images[0]);
    const instruction = [req.system, req.prompt].filter(Boolean).join("\n\n");
    res = await postJson("/tj_studio_one/llm/image_to_prompt", {
      ...common(l, req),
      or_model: l.or_model_vision,
      image_b64: b64,
      vision_task: "Custom Instruction",
      custom_instruction: instruction,
      model_format: "Universal Natural Language"
    });
  } else {
    res = await postJson("/tj_studio_one/llm/enhance", {
      ...common(l, req),
      ...req.refine ? { refine_instruction: req.refine, ...req.style ?? {} } : req.style ? { ...req.style } : { system_override: req.system || "You are a helpful assistant. Answer concisely." },
      prompt: req.prompt
    });
  }
  if (!res.ok && !retried && /last_prompt_id/.test(res.error ?? "")) {
    await warmUpServer();
    return runLlm(req, true);
  }
  if (!res.ok) throw new Error(res.error || "LLM request failed");
  return (res.result ?? "").trim();
}

// src/backend/promptStyle.ts
init_http();

// src/store/graph.ts
init_esm();
init_comfy();
var MODE_KEY = "canvers.mode";
function measure(n2) {
  const el = typeof document !== "undefined" ? document.querySelector(`.react-flow__node[data-id="${n2.id}"]`) : null;
  return { w: n2.w ?? (el?.offsetWidth || 300), h: n2.h ?? (el?.offsetHeight || 260) };
}
var RUNS_KEY = "canvers.runs.v1";
var readMode = () => {
  try {
    return localStorage.getItem(MODE_KEY) === "simple" ? "simple" : "canvas";
  } catch {
    return "canvas";
  }
};
var readRuns = () => {
  try {
    return JSON.parse(localStorage.getItem(RUNS_KEY) ?? "[]");
  } catch {
    return [];
  }
};
var writeRuns = (r) => {
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(r.slice(0, 150).map((x) => x.status === "running" ? { ...x, status: "error", error: "interrupted" } : x)));
  } catch {
  }
};
var hostSerializer = null;
var useGraph = create((set2, get) => ({
  projectId: uid("p"),
  projectName: "untitled",
  nodes: [],
  edges: [],
  runtime: {},
  selected: [],
  past: [],
  future: [],
  mode: readMode(),
  panel: null,
  viewer: null,
  painter: null,
  melody: null,
  assetPicker: null,
  facePicker: null,
  fitTick: 0,
  composerRuns: readRuns(),
  setMode: (mode) => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
    }
    set2({ mode, ...mode === "simple" && (get().panel === "decks" || get().panel === "nodes") ? { panel: null } : {} });
  },
  setPanel: (panel) => set2({ panel }),
  setName: (projectName) => set2({ projectName }),
  snapshot: () => {
    const { nodes, edges, past } = get();
    set2({ past: [...past.slice(-59), { nodes, edges }], future: [] });
  },
  undo: () => {
    const { past, future, nodes, edges } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set2({ ...prev, past: past.slice(0, -1), future: [{ nodes, edges }, ...future] });
  },
  redo: () => {
    const { past, future, nodes, edges } = get();
    const next = future[0];
    if (!next) return;
    set2({ ...next, past: [...past, { nodes, edges }], future: future.slice(1) });
  },
  addNode: (defId, x, y, init) => {
    const def = byId.get(defId);
    if (!def) throw new Error(`unknown node ${defId}`);
    get().snapshot();
    const engine = engineFor(def);
    const node = {
      id: uid("n"),
      defId,
      x,
      y,
      results: [],
      activeResult: 0,
      engineId: engine?.id,
      params: defaultParams(def, engine?.id),
      ...defId === "note" ? { w: 240, h: 160 } : {},
      ...init
    };
    set2({ nodes: [...get().nodes, node], selected: [node.id] });
    return node.id;
  },
  removeNodes: (ids) => {
    const set_ = new Set(ids);
    get().snapshot();
    set2({
      nodes: get().nodes.filter((n2) => !set_.has(n2.id)).map((n2) => n2.members ? { ...n2, members: n2.members.filter((m) => !set_.has(m)) } : n2),
      edges: get().edges.filter((e) => !set_.has(e.source) && !set_.has(e.target)),
      selected: get().selected.filter((s) => !set_.has(s))
    });
  },
  duplicateNodes: (ids) => {
    get().snapshot();
    const map = /* @__PURE__ */ new Map();
    const copies = [];
    for (const n2 of get().nodes) if (ids.includes(n2.id)) {
      const id = uid("n");
      map.set(n2.id, id);
      copies.push({ ...n2, id, x: n2.x + 40, y: n2.y + 40, params: { ...n2.params }, results: [], activeResult: 0, locked: false, members: void 0 });
    }
    const edges = get().edges.filter((e) => map.has(e.source) && map.has(e.target)).map((e) => ({ ...e, id: uid("e"), source: map.get(e.source), target: map.get(e.target) }));
    set2({ nodes: [...get().nodes, ...copies], edges: [...get().edges, ...edges], selected: copies.map((c) => c.id) });
  },
  moveNode: (id, x, y) => set2({ nodes: get().nodes.map((n2) => n2.id === id ? { ...n2, x, y } : n2) }),
  moveMany: (deltas) => {
    const m = new Map(deltas.map((d) => [d.id, d]));
    set2({ nodes: get().nodes.map((n2) => m.has(n2.id) ? { ...n2, x: m.get(n2.id).x, y: m.get(n2.id).y } : n2) });
  },
  setSize: (id, w, h) => set2({ nodes: get().nodes.map((n2) => n2.id === id ? { ...n2, w, h } : n2) }),
  setParam: (id, key, v) => set2({ nodes: get().nodes.map((n2) => n2.id === id ? { ...n2, params: { ...n2.params, [key]: v } } : n2) }),
  setEngine: (id, engineId) => {
    get().snapshot();
    set2({
      nodes: get().nodes.map((n2) => {
        if (n2.id !== id) return n2;
        const def = byId.get(n2.defId);
        const fresh = defaultParams(def, engineId);
        const params = { ...fresh };
        for (const k of Object.keys(fresh)) if (k in n2.params && typeof n2.params[k] === typeof fresh[k]) params[k] = n2.params[k];
        return { ...n2, engineId, params };
      })
    });
  },
  setColor: (ids, color) => {
    get().snapshot();
    set2({ nodes: get().nodes.map((n2) => ids.includes(n2.id) ? { ...n2, color, ...color === void 0 ? { textColor: void 0 } : {} } : n2) });
  },
  setCardColors: (ids, color, textColor) => {
    get().snapshot();
    set2({ nodes: get().nodes.map((n2) => ids.includes(n2.id) ? { ...n2, color, textColor } : n2) });
  },
  setTitle: (id, title) => set2({ nodes: get().nodes.map((n2) => n2.id === id ? { ...n2, title } : n2) }),
  setLocked: (ids, locked) => set2({ nodes: get().nodes.map((n2) => ids.includes(n2.id) ? { ...n2, locked } : n2) }),
  setResults: (id, assets, mode = "replace") => set2({
    nodes: get().nodes.map((n2) => {
      if (n2.id !== id) return n2;
      const results = mode === "append" ? [...n2.results, ...assets] : assets;
      return { ...n2, results, activeResult: mode === "append" ? n2.results.length : 0 };
    })
  }),
  clearResults: (id) => set2({ nodes: get().nodes.map((n2) => n2.id === id ? { ...n2, results: [], activeResult: 0 } : n2) }),
  setActive: (id, idx) => set2({ nodes: get().nodes.map((n2) => n2.id === id ? { ...n2, activeResult: Math.max(0, Math.min(idx, Math.max(0, n2.results.length - 1))) } : n2) }),
  connect: (e) => {
    const { nodes, edges } = get();
    const s = nodes.find((n2) => n2.id === e.source), t = nodes.find((n2) => n2.id === e.target);
    if (!s || !t || s.id === t.id) return false;
    const sp = byId.get(s.defId)?.outputs.find((o) => o.id === e.sourceHandle);
    const tp = byId.get(t.defId)?.inputs.find((i) => i.id === e.targetHandle);
    if (!sp || !tp || !compatible(sp.type, tp.type)) return false;
    const keep = tp.multi ? edges : edges.filter((x) => !(x.target === e.target && x.targetHandle === e.targetHandle));
    if (keep.some((x) => x.source === e.source && x.sourceHandle === e.sourceHandle && x.target === e.target && x.targetHandle === e.targetHandle)) return false;
    get().snapshot();
    set2({ edges: [...keep, { ...e, id: uid("e") }] });
    return true;
  },
  moveEdge: (id, delta) => {
    const es = get().edges;
    const e = es.find((x) => x.id === id);
    if (!e) return;
    const group = es.filter((x) => x.target === e.target && x.targetHandle === e.targetHandle);
    const k = group.findIndex((x) => x.id === id), other = group[k + delta];
    if (!other) return;
    get().snapshot();
    set2({ edges: es.map((x) => x.id === id ? other : x.id === other.id ? e : x) });
  },
  removeEdges: (ids) => {
    get().snapshot();
    set2({ edges: get().edges.filter((e) => !ids.includes(e.id)) });
  },
  setRuntime: (id, rt) => set2({ runtime: { ...get().runtime, [id]: { ...{ status: "idle", pct: 0 }, ...get().runtime[id], ...rt } } }),
  select: (selected) => set2({ selected }),
  group: (ids) => {
    const members = get().nodes.filter((n2) => ids.includes(n2.id) && !n2.members);
    if (members.length < 1) return;
    get().snapshot();
    const g = { id: uid("g"), defId: "group", x: 0, y: 0, w: 240, h: 160, params: {}, results: [], activeResult: 0, title: "Group", members: members.map((m) => m.id) };
    const taken = new Set(g.members);
    set2({ nodes: [g, ...get().nodes.map((n2) => n2.members ? { ...n2, members: n2.members.filter((m) => !taken.has(m)) } : n2)], selected: [g.id] });
    get().fitGroup(g.id);
    if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(() => requestAnimationFrame(() => get().fitGroup(g.id)));
  },
  fitGroup: (id) => {
    const grp = get().nodes.find((n2) => n2.id === id && n2.members);
    if (!grp) return;
    const mem = get().nodes.filter((n2) => grp.members.includes(n2.id));
    if (!mem.length) return;
    const pad = 40, top = 64;
    const rects = mem.map((m) => {
      const s = measure(m);
      return { x: m.x, y: m.y, w: s.w, h: s.h };
    });
    const x = Math.min(...rects.map((r) => r.x)) - pad, y = Math.min(...rects.map((r) => r.y)) - top;
    const x2 = Math.max(...rects.map((r) => r.x + r.w)) + pad, y2 = Math.max(...rects.map((r) => r.y + r.h)) + pad;
    set2({ nodes: get().nodes.map((n2) => n2.id === id ? { ...n2, x, y, w: x2 - x, h: y2 - y } : n2) });
  },
  reassignMembership: (ids) => {
    const st = get();
    const groups = st.nodes.filter((n2) => n2.members);
    if (!groups.length) return;
    let changed = false;
    let nodes = st.nodes;
    for (const id of ids) {
      const c = nodes.find((n2) => n2.id === id);
      if (!c || c.members) continue;
      const s = measure(c), cx = c.x + s.w / 2, cy = c.y + s.h / 2;
      const inside = groups.find((gr) => {
        const cur = nodes.find((n2) => n2.id === gr.id);
        return cx >= cur.x && cx <= cur.x + (cur.w ?? 0) && cy >= cur.y && cy <= cur.y + (cur.h ?? 0);
      });
      const was = nodes.find((n2) => n2.members?.includes(id));
      if (was?.id === inside?.id) continue;
      nodes = nodes.map((n2) => n2.id === was?.id ? { ...n2, members: n2.members.filter((m) => m !== id) } : n2.id === inside?.id ? { ...n2, members: [...n2.members, id] } : n2);
      changed = true;
    }
    if (changed) set2({ nodes });
  },
  ungroup: (id) => {
    get().snapshot();
    set2({ nodes: get().nodes.filter((n2) => n2.id !== id), selected: [] });
  },
  openViewer: (nodeId) => set2({ viewer: nodeId ? { nodeId } : null }),
  openPainter: (nodeId) => set2({ painter: nodeId }),
  openMelody: (nodeId) => set2({ melody: nodeId }),
  openAssetPicker: (nodeId) => set2({ assetPicker: nodeId }),
  openFacePicker: (nodeId) => set2({ facePicker: nodeId }),
  toProject: () => ({ app: "ai-one-studio-canvers", version: 1, id: get().projectId, name: get().projectName, nodes: hostSerializer ? get().nodes.map(hostSerializer) : get().nodes, edges: get().edges, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }),
  loadProject: (p) => set2({ projectId: p.id ?? uid("p"), projectName: p.name || "untitled", nodes: p.nodes ?? [], edges: p.edges ?? [], runtime: {}, selected: [], past: [], future: [], fitTick: get().fitTick + 1 }),
  newProject: () => set2({ projectId: uid("p"), projectName: "untitled", nodes: [], edges: [], runtime: {}, selected: [], past: [], future: [] }),
  requestFit: () => set2({ fitTick: get().fitTick + 1 }),
  addComposerRun: (r) => {
    const runs = [r, ...get().composerRuns];
    writeRuns(runs);
    set2({ composerRuns: runs });
  },
  patchComposerRun: (id, patch) => {
    const runs = get().composerRuns.map((r) => r.id === id ? { ...r, ...patch } : r);
    writeRuns(runs);
    set2({ composerRuns: runs });
  },
  removeComposerRun: (id) => {
    const runs = get().composerRuns.filter((r) => r.id !== id);
    writeRuns(runs);
    set2({ composerRuns: runs });
  }
}));

// src/backend/promptStyle.ts
var AUTO = "auto";
var NO_AESTHETIC = "None (no aesthetic injection)";
var FORMAT_BY_FAMILY = {
  zimage: "Z-Image & Lumina-2 (LLM text encoder)",
  klein: "Flux & Chroma (natural language)",
  krea2: "KREA2 (Prompt Enhance)",
  sdxl: "SDXL (tags + weights)",
  anima: "Anima (anime illustration prose)",
  qwen: "Qwen Image 2.1 (Edit)",
  qwen21: "Qwen Image 2.1 (T2I)"
};
var FORMAT_BY_ENGINE = { h3: "Minimax H3 (Video)", "h3-ref": "Minimax H3 (Video)", ltx25: "LTX Video (motion-focused prose)" };
var FORMAT_BY_DEF = { "h3-image": "Minimax H3 (Video)", "ltx-director": "LTX Video (motion-focused prose)", "character-sheet": "Minimax H3 (Video)", "face-refine": "Minimax H3 (Video)", "video-refine": "LTX Video (motion-focused prose)" };
var catalog = null;
function styleCatalog() {
  catalog ??= getJson("/tj_studio_one/llm/models").then((d) => ({
    formats: d.model_formats ?? ["Universal Natural Language"],
    aesthetics: d.aesthetics ?? [NO_AESTHETIC],
    purposes: d.purposes ?? ["Image", "Video"]
  })).catch((e) => {
    catalog = null;
    throw e;
  });
  return catalog;
}
function formatFor(defId, engineId) {
  const def = byId.get(defId);
  const eng = def ? engineFor(def, engineId) : void 0;
  const video = def?.category === "Video" || defId === "h3-image" && false;
  const fmt = engineId && FORMAT_BY_ENGINE[engineId] || FORMAT_BY_DEF[defId] || eng?.family && FORMAT_BY_FAMILY[eng.family] || eng && FORMAT_BY_ENGINE[eng.id] || "Universal Natural Language";
  return { model_format: fmt, purpose: video ? "Video" : defId === "image-edit" ? "Edit (Inpainting/I2V)" : "Image" };
}
function downstreamTarget(nodeId) {
  const { nodes, edges } = useGraph.getState();
  for (const e of edges.filter((x) => x.source === nodeId)) {
    const t = nodes.find((n2) => n2.id === e.target);
    if (!t) continue;
    const def = byId.get(t.defId);
    if (!def || def.kind !== "generate") continue;
    return formatFor(t.defId, t.engineId);
  }
  return null;
}
function styleOf(nodeId, p, fallback = { model_format: "Universal Natural Language", purpose: "Image" }) {
  const auto = downstreamTarget(nodeId) ?? fallback;
  const fmt = p.fmt && p.fmt !== AUTO ? String(p.fmt) : auto.model_format;
  return { model_format: fmt, purpose: p.purpose_sel && p.purpose_sel !== AUTO ? String(p.purpose_sel) : auto.purpose, aesthetic: p.aes ? String(p.aes) : NO_AESTHETIC, extra_instructions: String(p.extra ?? "") };
}

// src/backend/options.ts
var import_react2 = __toESM(require_react(), 1);
init_http();
init_comfy();
var FALLBACK = {
  samplers: ["euler", "euler_ancestral", "res_multistep", "er_sde", "dpmpp_2m", "dpmpp_sde", "uni_pc"],
  schedulers: ["simple", "normal", "karras", "beta", "sgm_uniform"]
};
var memo2 = /* @__PURE__ */ new Map();
async function load2(source) {
  if (source === "samplers" || source === "schedulers") {
    const info = await objectInfo("KSampler");
    const req = info?.KSampler?.input?.required;
    return (source === "samplers" ? req?.sampler_name?.[0] : req?.scheduler?.[0]) ?? FALLBACK[source];
  }
  if (source === "loras:all") {
    const lists = await Promise.all([...Object.keys(FAMILIES).map((f) => getModels(f).then((m) => m.loras ?? []).catch(() => [])), getJson("/minimax_h3_one/models").then((l) => l.loras ?? []).catch(() => [])]);
    return ["none", ...new Set(lists.flat().filter((x) => x && x !== "none"))];
  }
  if (source === "seedvr2dit") {
    const i = await objectInfo("SeedVR2LoadDiTModel");
    return ["none", ...i?.SeedVR2LoadDiTModel?.input?.required?.model?.[0] ?? []];
  }
  if (source === "seedvr2vae") {
    const i = await objectInfo("SeedVR2LoadVAEModel");
    return ["none", ...i?.SeedVR2LoadVAEModel?.input?.required?.model?.[0] ?? []];
  }
  if (source === "preprocessors") {
    const i = await objectInfo("AIO_Preprocessor");
    return i?.AIO_Preprocessor?.input?.required?.preprocessor?.[0] ?? ["DepthAnythingPreprocessor"];
  }
  if (source === "promptformats") {
    const c = await styleCatalog();
    return ["auto", ...c.formats];
  }
  if (source === "promptaesthetics") {
    return (await styleCatalog()).aesthetics;
  }
  if (source === "modelpatches") {
    const i = await objectInfo("ModelPatchLoader");
    return ["none", ...i?.ModelPatchLoader?.input?.required?.name?.[0] ?? []];
  }
  if (source === "bboxdetectors") {
    const i = await objectInfo("UltralyticsDetectorProvider");
    return ["none", ...i?.UltralyticsDetectorProvider?.input?.required?.model_name?.[0] ?? []];
  }
  if (source === "facedetectors") {
    const l = await getJson("/minimax_h3_one/models");
    return ["none", ...(l.face_detectors ?? []).filter((x) => x && x !== "none")];
  }
  if (source.startsWith("loras:")) {
    const fam = source.slice(6);
    if (fam === "h3" || fam === "ltx25") {
      const l = await getJson("/minimax_h3_one/models");
      return ["none", ...(l.loras ?? []).filter((x) => x && x !== "none")];
    }
    if (!(fam in FAMILIES)) return ["none"];
    const m = await getModels(fam);
    return ["none", ...(m.loras ?? []).filter((x) => x && x !== "none")];
  }
  if (source === "bgmodels") {
    const r = await getJson(`${FAMILIES.klein.prefix}/bgremoval_models`);
    return r.models?.length ? r.models : ["birefnet.safetensors"];
  }
  if (source === "upscalers") {
    const info = await objectInfo("UpscaleModelLoader");
    const list = info?.UpscaleModelLoader?.input?.required?.model_name?.[0] ?? [];
    return list.length ? list : ["none"];
  }
  return [];
}
function loadOptions(source) {
  if (!memo2.has(source)) memo2.set(source, load2(source).catch(() => {
    memo2.delete(source);
    return FALLBACK[source] ?? [];
  }));
  return memo2.get(source);
}

// src/engine/run.ts
init_http();

// src/backend/music.ts
init_http();
var cache2 = null;
function musicBackend() {
  cache2 ??= Promise.all([getJson("/music_one/models"), getJson("/music_one/config").catch(() => ({}))]).then(([models, cfg]) => ({ models, cfg })).catch((e) => {
    cache2 = null;
    throw e;
  });
  return cache2;
}
var real = (a) => (a ?? []).filter((x) => x && x !== "none");
var unet2 = (name) => name.toLowerCase().endsWith(".gguf") ? { class_type: "UnetLoaderGGUF", inputs: { unet_name: name } } : { class_type: "UNETLoader", inputs: { unet_name: name, weight_dtype: "default" } };
async function resolveMusicModels(user) {
  const { models, cfg } = await musicBackend();
  const pick = (key, cfgKey, list, re) => {
    const have = real(list);
    const saved = cfg[cfgKey];
    return user[key] || (saved && have.includes(saved) ? saved : "") || have.find((x) => re.test(x)) || "";
  };
  return {
    ace_unet: pick("ace_unet", "ace_unet", models.diffusion_models, /ace/i),
    ace_clip1: pick("ace_clip1", "ace_clip1", models.text_encoders, /qwen.*0\.6|0\.6b/i),
    ace_clip2: pick("ace_clip2", "ace_clip2", models.text_encoders, /qwen.*4b|ace/i),
    ace_vae: pick("ace_vae", "ace_vae", models.vaes, /ace/i),
    dit: pick("dit", "dit", models.diffusion_models, /minimax.*music|music/i),
    clip: pick("clip", "clip", models.text_encoders, /minimax|music/i),
    dav: pick("dav", "dav", models.vaes, /audio|music/i),
    yue2: pick("yue2_ckpt", "yue2_ckpt", models.checkpoints ?? [], /yue/i),
    sampler: cfg.ace_sampler_name || "jkass_quality",
    scheduler: cfg.ace_scheduler || "sgm_uniform",
    shift: Number(cfg.ace_shift ?? 3)
  };
}
function saveAudio(link, prefix, format) {
  const inputs = { audio: link, filename_prefix: prefix, format };
  if (format === "mp3") inputs["format.quality"] = "V0";
  if (format === "opus") inputs["format.quality"] = "128k";
  return { class_type: "SaveAudioAdvanced", inputs };
}
async function buildMusicGraph(job) {
  if (!job.caption.trim()) throw new Error("Style (prompt) is empty");
  const m = await resolveMusicModels(job.models);
  const g = {};
  const prefix = `${job.saveSubfolder}/${job.engine === "acestep" ? "ACE" : job.engine === "yue2" ? "YUE2" : "MMM"}`;
  if (job.engine === "yue2") {
    if (!m.yue2) throw new Error("Pick the YuE2 checkpoint in Settings \u2192 Music models.");
    g["Y:ckpt"] = { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: m.yue2 } };
    const model = ["Y:ckpt", 0], clip2 = ["Y:ckpt", 1], vae = ["Y:ckpt", 2];
    const gen = { style: job.caption, lyrics: job.lyrics, seed: job.seed, clip: clip2, mode: "full", max_duration: job.seconds, temperature: job.temperature ?? 1, top_p: job.topP ?? 0.95, top_k: Math.max(1, Math.round(job.topK ?? 100)), repetition_penalty: job.repetition ?? 1.2 };
    if (job.coverAudio) {
      g["Y:load"] = { class_type: "LoadAudio", inputs: { audio: job.coverAudio } };
      g["Y:enc"] = { class_type: "AudioEncoderLoader", inputs: { audio_encoder_name: "sheetsage2_bf16.safetensors" } };
      g["Y:abc"] = { class_type: "SheetSage2AudioToABC", inputs: { mode: "melody", audio_encoder: ["Y:enc", 0], audio: ["Y:load", 0] } };
      gen.abc = ["Y:abc", 0];
      gen.mode = "melody";
    } else if (job.melodyAbc) {
      gen.abc = job.melodyAbc;
      gen.mode = "melody";
    } else {
      g["Y:abc"] = { class_type: "YuE2GenerateABC", inputs: { style: job.caption, lyrics: job.lyrics, seed: job.seed, clip: clip2, mode: "full", max_abc_tokens: 8192, temperature: 0.7, top_p: 0.9, top_k: 30, repetition_penalty: 1.005, penalty_window: 100 } };
      gen.abc = ["Y:abc", 0];
    }
    g["Y:gen"] = { class_type: "YuE2GenerateMusic", inputs: gen };
    g["Y:zero"] = { class_type: "ConditioningZeroOut", inputs: { conditioning: ["Y:gen", 0] } };
    g["Y:lat"] = { class_type: "EmptyYuE2LatentAudio", inputs: { seconds: ["Y:gen", 1], batch_size: 1 } };
    g["Y:samp"] = { class_type: "KSampler", inputs: { model, positive: ["Y:gen", 0], negative: ["Y:zero", 0], latent_image: ["Y:lat", 0], seed: job.seed, steps: 32, cfg: 1, sampler_name: "dpm_2", scheduler: "sgm_uniform", denoise: 1 } };
    g["Y:dec"] = { class_type: "VAEDecodeAudio", inputs: { samples: ["Y:samp", 0], vae } };
    g["Y:save"] = saveAudio(["Y:dec", 0], prefix, job.format);
    return g;
  }
  if (job.engine === "minimax") {
    if (!m.dit || !m.clip || !m.dav) throw new Error("Pick the MiniMax Music models (DiT / text encoder / audio VAE) in Settings \u2192 Music models.");
    g["M:clip"] = { class_type: "CLIPLoader", inputs: { clip_name: m.clip, type: "minimax", device: "default" } };
    g["M:unet"] = unet2(m.dit);
    g["M:vae"] = { class_type: "VAELoader", inputs: { vae_name: m.dav } };
    g["M:te"] = { class_type: "MiniMaxMusic3TextEncode", inputs: { clip: ["M:clip", 0], caption: job.caption, lyrics: job.lyrics, seed: job.seed, max_duration: job.seconds, cfg_scale: 1.7, top_k: 50 } };
    g["M:zero"] = { class_type: "ConditioningZeroOut", inputs: { conditioning: ["M:te", 0] } };
    g["M:lat"] = { class_type: "EmptyMiniMaxMusic3LatentAudio", inputs: { seconds: ["M:te", 1], batch_size: 1 } };
    g["M:samp"] = { class_type: "KSampler", inputs: { model: ["M:unet", 0], positive: ["M:te", 0], negative: ["M:zero", 0], latent_image: ["M:lat", 0], seed: job.seed, steps: job.stageSteps[0] ?? 30, cfg: job.cfg, sampler_name: "euler", scheduler: "simple", denoise: 1 } };
    g["M:dec"] = { class_type: "VAEDecodeAudio", inputs: { samples: ["M:samp", 0], vae: ["M:vae", 0] } };
    g["M:save"] = saveAudio(["M:dec", 0], prefix, job.format);
    return g;
  }
  if (!m.ace_unet || !m.ace_clip1 || !m.ace_clip2 || !m.ace_vae) throw new Error("Pick the Ace-Step models (diffusion / CLIP \xD72 / VAE) in Settings \u2192 Music models.");
  g["A:unet"] = unet2(m.ace_unet);
  g["A:shift"] = { class_type: "ModelSamplingAuraFlow", inputs: { model: ["A:unet", 0], shift: m.shift } };
  g["A:clip"] = { class_type: "DualCLIPLoader", inputs: { clip_name1: m.ace_clip1, clip_name2: m.ace_clip2, type: "ace", device: "default" } };
  g["A:vae"] = { class_type: "VAELoader", inputs: { vae_name: m.ace_vae } };
  g["A:pos"] = { class_type: "TextEncodeAceStepAudio1.5", inputs: {
    clip: ["A:clip", 0],
    tags: job.caption,
    lyrics: job.lyrics,
    seed: job.seed,
    bpm: Math.round(job.bpm),
    duration: job.seconds,
    timesignature: job.timesignature,
    language: job.language,
    keyscale: job.keyscale,
    generate_audio_codes: true,
    cfg_scale: 2.5,
    temperature: 0.75,
    top_p: 0.9,
    top_k: 0,
    min_p: 0
  } };
  g["A:neg"] = { class_type: "CLIPTextEncode", inputs: { clip: ["A:clip", 0], text: "" } };
  g["A:lat"] = { class_type: "EmptyAceStep1.5LatentAudio", inputs: { seconds: job.seconds, batch_size: 1 } };
  g["A:sel"] = { class_type: "KSamplerSelect", inputs: { sampler_name: m.sampler } };
  let lat = ["A:lat", 0];
  job.stageSteps.filter((n2) => n2 > 0).forEach((steps, i) => {
    g[`A:sched${i}`] = { class_type: "BasicScheduler", inputs: { model: ["A:shift", 0], scheduler: m.scheduler, steps, denoise: 1 } };
    g[`A:s${i}`] = { class_type: "SamplerCustom", inputs: { model: ["A:shift", 0], add_noise: true, noise_seed: job.seed, cfg: job.cfg, positive: ["A:pos", 0], negative: ["A:neg", 0], sampler: ["A:sel", 0], sigmas: [`A:sched${i}`, 0], latent_image: lat } };
    lat = [`A:s${i}`, 0];
  });
  g["A:dec"] = { class_type: "VAEDecodeAudio", inputs: { samples: lat, vae: ["A:vae", 0] } };
  g["A:save"] = saveAudio(["A:dec", 0], prefix, job.format);
  return g;
}

// src/backend/ltx.ts
init_http();
var FPS = 24;
var cache3 = null;
function ltxModelLists() {
  cache3 ??= getJson("/ltx25_one/models").catch(() => getJson("/minimax_h3_one/models")).catch((e) => {
    cache3 = null;
    throw e;
  });
  return cache3;
}
var availCache = null;
var availability = () => availCache ??= getJson("/ltx25_one/node_availability").then((r) => r.available ?? r).catch(() => ({}));
var real2 = (a) => (a ?? []).filter((x) => x && x !== "none");
async function resolveLtxModels(user) {
  const l = await ltxModelLists();
  const pick = (k, list, re, not) => {
    if (user[k]) return user[k];
    const c = real2(list).filter((x) => re.test(x) && !(not && not.test(x))).sort((a, b) => Number(/q[12]_/i.test(a)) - Number(/q[12]_/i.test(b)));
    return c.find((x) => /2[._]?5/.test(x)) ?? c[0] ?? "";
  };
  return {
    unet: pick("ltx_unet", l.diffusion_models, /ltx/i),
    clip: pick("ltx_clip", l.text_encoders_all ?? l.text_encoders, /gemma|ltx/i, /t5gemma|stable_audio/i),
    vaeVideo: pick("ltx_vae_video", l.vaes, /ltx/i, /audio/i),
    vaeAudio: pick("ltx_vae_audio", l.vaes, /ltx.*audio|audio.*vae/i),
    upscaler: pick("ltx_upscaler", l.latent_upscale_models, /spatial|upscal/i, /temporal|duration/i)
  };
}
var alignFrames = (n2) => Math.max(9, 8 * Math.round((n2 - 1) / 8) + 1);
function ltxSize(aspect2, mp) {
  const [a, b] = aspect2.split(":").map(Number);
  const ratio = a && b ? a / b : 16 / 9;
  const target = Math.max(0.1, mp) * 1e6;
  const h = Math.sqrt(target / ratio), w = h * ratio;
  const snap = (v) => Math.max(64, Math.round(v / 64) * 64);
  return { width: snap(w), height: snap(h) };
}
var emptyTimeline = (prompt, frames) => ({
  mainTrackEnabled: true,
  audioTrackEnabled: true,
  motionTrackEnabled: true,
  propHeight: 90,
  globalPropHeight: 60,
  showFilenames: true,
  showPromptZones: true,
  overrideAudio: false,
  inpaint_audio: true,
  global_prompt: prompt,
  retake_global_prompt: "",
  retakeMode: false,
  retakeStart: 24,
  retakeLength: 48,
  retakePrompt: "",
  retakeStrength: 1,
  retakeVideo: null,
  normalStartFrame: 0,
  normalDurationFrames: frames,
  reference_mode: "OFF",
  disable_prompt_relay: true,
  msr_prefix_frames: 41,
  analyzeProvider: "ollama",
  analyzeBaseUrl: "",
  analyzeModel: "",
  characters: [{ images: [], description: "" }, { images: [], description: "" }, { images: [], description: "" }],
  segments: [],
  motionSegments: [],
  audioSegments: []
});
async function buildLtxGraph(job) {
  const m = await resolveLtxModels(job.models);
  const miss = [["LTX diffusion model", m.unet], ["text encoder", m.clip], ["video VAE", m.vaeVideo], ["audio VAE", m.vaeAudio], ["latent upscaler", m.upscaler]].filter(([, v]) => !v).map(([k]) => k);
  if (miss.length) throw new Error(`Pick the LTX 2.5 ${miss.join(", ")} in Settings \u2192 Video models.`);
  if (!job.prompt.trim()) throw new Error("Prompt is empty");
  const avail = await availability();
  const has = (n2) => !!avail[n2];
  const frames = alignFrames(job.seconds * FPS);
  const { width: W, height: H } = job.size ?? ltxSize(job.aspect, job.megapixels);
  const secs = frames / FPS;
  const gg = (s) => s.toLowerCase().endsWith(".gguf");
  const g = {};
  g.unet = gg(m.unet) ? { class_type: "UnetLoaderGGUF", inputs: { unet_name: m.unet } } : { class_type: "UNETLoader", inputs: { unet_name: m.unet, weight_dtype: "default" } };
  let model = ["unet", 0];
  g.clip = gg(m.clip) ? { class_type: "TJ_LTX25ClipLoaderGGUF", inputs: { clip_name: m.clip } } : { class_type: "CLIPLoader", inputs: { clip_name: m.clip, type: "ltxv", device: "default" } };
  g.vaeV = { class_type: "VAELoader", inputs: { vae_name: m.vaeVideo } };
  g.vaeA = { class_type: "VAELoader", inputs: { vae_name: m.vaeAudio } };
  g.upModel = { class_type: "LatentUpscaleModelLoader", inputs: { model_name: m.upscaler } };
  job.loras.forEach((l, i) => {
    if (!l.name || l.name === "none" || !(l.strength > 0)) return;
    g[`lora${i}`] = { class_type: "LoraLoaderModelOnly", inputs: { model, lora_name: l.name, strength_model: l.strength } };
    model = [`lora${i}`, 0];
  });
  if (has("LTXVChunkFeedForward")) {
    g.chunkFF = { class_type: "LTXVChunkFeedForward", inputs: { model, chunks: 2, dim_threshold: 4096 } };
    model = ["chunkFF", 0];
  }
  const tl = emptyTimeline(job.prompt, frames);
  const ANCHOR = 24;
  const seg = (file, last, i) => ({ id: `cv-${i}`, start: last ? Math.max(0, frames - ANCHOR) : 0, length: ANCHOR, prompt: "", type: "image", isAnchor: false, imageFile: file, imageB64: "", isEndFrame: last });
  if (job.first) tl.segments.push(seg(job.first, false, 0));
  if (job.last) tl.segments.push(seg(job.last, true, 1));
  let localPrompts = "", segLens = "", guideStrength = "", useAudio = false, useMotion = false;
  if (job.timeline) {
    const T = job.timeline;
    const fr = (sec) => Math.max(0, Math.min(frames - 1, Math.round(sec * FPS)));
    const texts = [...T.texts].sort((a, b) => a.startSec - b.startSec);
    texts.forEach((t, i) => {
      const st = i === 0 ? 0 : fr(t.startSec);
      const en = i === texts.length - 1 ? frames : Math.max(st + 1, fr(t.endSec));
      tl.segments.push({ id: `cvt-${i}`, start: st, length: en - st, prompt: t.prompt, type: "text" });
    });
    const imgs = [...T.images].sort((a, b) => a.startSec - b.startSec);
    imgs.forEach((im, i) => tl.segments.push({ id: `cvi-${i}`, start: im.end ? Math.max(0, fr(im.startSec) - ANCHOR + 1) : fr(im.startSec), length: ANCHOR, prompt: "", type: "image", isAnchor: false, imageFile: im.file, imageB64: "", isEndFrame: !!im.end }));
    if (texts.length) {
      tl.disable_prompt_relay = false;
      localPrompts = texts.map((t) => t.prompt).join(" | ");
      segLens = tl.segments.filter((x) => x.type === "text").map((x) => x.length).join(",");
    }
    if (T.audio) {
      const st = fr(T.audio.startSec);
      const len = Math.max(1, Math.min(frames - st, Math.round((T.audio.lengthSec ?? secs - T.audio.startSec) * FPS)));
      tl.audioSegments.push({ id: "cva-0", start: st, length: len, trimStart: 0, audioFile: T.audio.file });
      useAudio = true;
    }
    if (T.motion) {
      const st = fr(T.motion.startSec);
      const len = Math.max(1, Math.min(frames - st, Math.round((T.motion.lengthSec ?? secs - T.motion.startSec) * FPS)));
      tl.motionSegments.push({ id: "cvm-0", type: "motion_video", start: st, length: len, trimStart: 0, videoDurationFrames: len, videoFile: T.motion.file, fileName: T.motion.file, videoStrength: T.motion.strength ?? 1, videoAttentionStrength: T.motion.attention ?? 0.65, resampleMode: "nearest" });
      useMotion = true;
    }
    if (imgs.some((i) => i.strength !== void 0)) guideStrength = imgs.map((i) => (i.strength ?? 1).toFixed(2)).join(",");
  }
  g.dir = { class_type: "LTXDirectorTJ25", inputs: {
    model,
    clip: ["clip", 0],
    audio_vae: ["vaeA", 0],
    vae: ["vaeV", 0],
    start_second: 0,
    end_second: secs,
    duration_seconds: secs,
    start_frame: 0,
    end_frame: frames,
    duration_frames: frames,
    timeline_data: JSON.stringify(tl),
    local_prompts: localPrompts,
    segment_lengths: segLens,
    epsilon: 1e-3,
    guide_strength: guideStrength,
    global_prompt: job.prompt,
    use_custom_audio: useAudio,
    use_custom_motion: useMotion,
    inpaint_audio: true,
    frame_rate: FPS,
    display_mode: "seconds",
    custom_width: W,
    custom_height: H,
    resize_method: "stretch to fit",
    divisible_by: 32,
    img_compression: 18,
    override_audio: false,
    reference_strength: 1
  } };
  g.dirZero = { class_type: "ConditioningZeroOut", inputs: { conditioning: ["dir", 2] } };
  g.cond = { class_type: "LTXVConditioning", inputs: { positive: ["dir", 1], negative: ["dirZero", 0], frame_rate: ["dir", 7] } };
  let pos = ["cond", 0], neg = ["cond", 1];
  if (has("TJ_FreeTextEncoderVRAM")) {
    g.freeP = { class_type: "TJ_FreeTextEncoderVRAM", inputs: { clip: ["clip", 0], trigger: pos } };
    g.freeN = { class_type: "TJ_FreeTextEncoderVRAM", inputs: { clip: ["clip", 0], trigger: neg } };
    pos = ["freeP", 0];
    neg = ["freeN", 0];
  }
  const guide = (p, n2, latent, scale) => ({ class_type: "LTXDirectorGuideTJ25", inputs: {
    positive: p,
    negative: n2,
    vae: ["vaeV", 0],
    latent,
    guide_data: ["dir", 5],
    motion_guide_data: ["dir", 6],
    model: ["dir", 0],
    ic_lora_name: "None",
    ic_lora_strength: 1,
    scale_by: scale,
    upscale_method: "bicubic",
    image_attention_strength: 1,
    crop: "center",
    auto_snap_ic_grid: true,
    use_tiled_encode: false,
    tile_size: 256,
    tile_overlap: 64,
    retake_mode: false,
    msr_strength: 0
  } });
  g.g1 = guide(pos, neg, ["dir", 3], 0.5);
  g.cat1 = { class_type: "LTXVConcatAVLatent", inputs: { video_latent: ["g1", 2], audio_latent: ["dir", 4] } };
  g.guider = { class_type: "CFGGuider", inputs: { model: ["g1", 3], positive: ["g1", 0], negative: ["g1", 1], cfg: job.cfg } };
  g.sched = { class_type: "BasicScheduler", inputs: { model: ["g1", 3], scheduler: job.scheduler, steps: Math.max(1, Math.round(job.steps)), denoise: 1 } };
  g.noise = { class_type: "RandomNoise", inputs: { noise_seed: job.seed } };
  g.sel = { class_type: "KSamplerSelect", inputs: { sampler_name: job.sampler } };
  g.samp1 = { class_type: "SamplerCustomAdvanced", inputs: { noise: ["noise", 0], guider: ["guider", 0], sampler: ["sel", 0], sigmas: ["sched", 0], latent_image: ["cat1", 0] } };
  g.sep1 = { class_type: "LTXVSeparateAVLatent", inputs: { av_latent: ["samp1", 0] } };
  g.crop1 = { class_type: "LTXDirectorCropGuidesTJ25", inputs: { positive: ["g1", 0], negative: ["g1", 1], latent: ["sep1", 0] } };
  g.up = { class_type: "LTXVLatentUpsampler", inputs: { samples: ["crop1", 2], upscale_model: ["upModel", 0], vae: ["vaeV", 0] } };
  g.g2 = guide(["dir", 1], ["dir", 2], ["up", 0], 1);
  g.cat2 = { class_type: "LTXVConcatAVLatent", inputs: { video_latent: ["g2", 2], audio_latent: ["sep1", 1] } };
  g.guider2 = { class_type: "CFGGuider", inputs: { model: ["g2", 3], positive: ["g2", 0], negative: ["g2", 1], cfg: job.cfg } };
  g.sig2 = { class_type: "ManualSigmas", inputs: { sigmas: job.stage2Sigmas } };
  g.samp2 = { class_type: "SamplerCustomAdvanced", inputs: { noise: ["noise", 0], guider: ["guider2", 0], sampler: ["sel", 0], sigmas: ["sig2", 0], latent_image: ["cat2", 0] } };
  g.sep2 = { class_type: "LTXVSeparateAVLatent", inputs: { av_latent: ["samp2", 0] } };
  g.crop2 = { class_type: "LTXDirectorCropGuidesTJ25", inputs: { positive: ["g2", 0], negative: ["g2", 1], latent: ["sep2", 0] } };
  g.dec = { class_type: "VAEDecode", inputs: { samples: ["crop2", 2], vae: ["vaeV", 0] } };
  g.decA = { class_type: "LTXVAudioVAEDecode", inputs: { samples: ["sep1", 1], audio_vae: ["vaeA", 0] } };
  const prefix = `${job.saveSubfolder}/LTX25`;
  if (has("VHS_VideoCombine")) {
    g.save = { class_type: "VHS_VideoCombine", inputs: { images: ["dec", 0], audio: ["decA", 0], frame_rate: FPS, loop_count: 0, filename_prefix: prefix, format: "video/nvenc_h264-mp4", pingpong: false, save_output: true } };
  } else {
    g.video = { class_type: "CreateVideo", inputs: { images: ["dec", 0], fps: FPS, audio: ["decA", 0] } };
    g.save = { class_type: "SaveVideo", inputs: { video: ["video", 0], filename_prefix: prefix, format: "auto", codec: "auto" } };
  }
  return g;
}

// src/backend/h3.ts
init_http();
var DEFAULT_OPT = {
  attnBackend: "none",
  attnForward: "none",
  optimizer: "none",
  blockCache: "none",
  spectrum: false,
  fusedModulation: false,
  turbo: "none",
  turboLora: "none",
  turboStrength: 1,
  turboSteps: 8,
  hires: false,
  hiresStartMp: 0.5,
  hiresFinalMp: 0.9,
  shiftVideo: 12,
  shiftAudio: 3
};
var ONE_TAKE_OVERLAP_FRAMES = 39;
var TAIL_CANDIDATES = 8;
var cache4 = null;
var h3ModelLists = () => cache4 ??= getJson("/minimax_h3_one/models").catch((e) => {
  cache4 = null;
  throw e;
});
var availCache2 = null;
var h3Availability = () => availCache2 ??= getJson("/minimax_h3_one/node_availability").then((r) => r.available ?? r).catch(() => ({}));
var real3 = (a) => (a ?? []).filter((x) => x && x !== "none");
async function resolveH3Models(user, mode) {
  const l = await h3ModelLists();
  const pick = (k, list, re, not) => user[k] || real3(list).find((x) => re.test(x) && !(not && not.test(x))) || "";
  return {
    unet: mode === "reference" ? pick("h3_unet_ref", l.diffusion_models, /h3.*ref/i) : pick("h3_unet_fl", l.diffusion_models, /h3.*(fl2va|first|fl)/i),
    clip: pick("h3_clip", l.text_encoders_all ?? l.text_encoders, /h3/i, /music|ace15/i),
    vaeVideo: pick("h3_vae_video", l.vaes, /h3.*video/i),
    vaeAudio: pick("h3_vae_audio", l.vaes, /h3.*audio/i)
  };
}
function h3Frames(seconds) {
  let n2 = Math.min(362, Math.max(124, Math.round(seconds * FPS)));
  while (n2 % 17 !== 5) n2++;
  return n2;
}
function h3Size(aspect2, mp) {
  const [a, b] = aspect2.split(":").map(Number);
  const ratio = a && b ? a / b : 16 / 9;
  const t = Math.max(0.1, mp) * 1e6, h = Math.sqrt(t / ratio), w = h * ratio;
  const snap = (v) => Math.max(32, Math.round(v / 32) * 32);
  return { width: snap(w), height: snap(h) };
}
function effectiveTurbo(o, has) {
  const lora = !!o.turboLora && o.turboLora !== "none";
  if (o.turbo === "larryvrh") return has("MiniMaxH3TurboLoRA") && lora ? "larryvrh" : "none";
  if (o.turbo === "lightx2v") return has("H3SLAAttention") && lora ? "lightx2v" : "none";
  if (o.turbo === "pdd") return lora ? "pdd" : "none";
  return o.turbo;
}
function h3ModelChain(g, start, o, turbo, loras2, has) {
  let model = start;
  if (o.attnBackend === "ck" && has("ModelAttentionBackend")) {
    g.ck = { class_type: "ModelAttentionBackend", inputs: { model, attention: "comfy kitchen attention" } };
    model = ["ck", 0];
  } else if (o.attnBackend === "sage" && has("PathchSageAttentionKJ")) {
    g.sage = { class_type: "PathchSageAttentionKJ", inputs: { model, sage_attention: "auto" } };
    model = ["sage", 0];
  } else if (o.attnBackend === "solattn_kijai" && has("SolAttnPatch")) {
    g.sol = { class_type: "SolAttnPatch", inputs: { model, tau: 1.3, start_percent: 0.2, end_percent: 0.9, min_tokens: 4096, int8_qk: true, sink_conditioning: "exact_kv_and_rows", morton: false, morton_curve: "2d_frame", int8_pv: true, verbose: false, use_tma: false, dense_blocks: "" } };
    model = ["sol", 0];
  }
  if ((o.attnForward === "memeff_sage" || o.attnForward === "solattn_sag") && has("MiniMaxH3MemoryEfficientSageAttentionPatch")) {
    g.memSage = { class_type: "MiniMaxH3MemoryEfficientSageAttentionPatch", inputs: { model } };
    model = ["memSage", 0];
  }
  if (o.attnForward === "solattn_sag" && has("MiniMaxH3ScheduledSolAttentionPatch")) {
    g.solSag = { class_type: "MiniMaxH3ScheduledSolAttentionPatch", inputs: { model, enabled: true, tau_start: 1.3, tau_end: 0.8, curve: "linear", min_tokens: 4096, strict: false, dense_percent: 0, thresh_type: "diag", int8_qk: false, int8_pv: false, sink_conditioning: "exact_kv", dense_blocks: "" } };
    model = ["solSag", 0];
  }
  g.shift = { class_type: "MiniMaxH3SigmaShift", inputs: { model, shift_video: turbo === "pdd" ? 12 : o.shiftVideo, shift_audio: turbo === "pdd" ? 3 : o.shiftAudio } };
  model = ["shift", 0];
  loras2.forEach((l, i) => {
    if (!l.name || l.name === "none" || !(l.strength > 0)) return;
    g[`lora${i}`] = { class_type: "LoraLoaderModelOnly", inputs: { model, lora_name: l.name, strength_model: l.strength } };
    model = [`lora${i}`, 0];
  });
  if (turbo === "larryvrh") {
    g.turbo = { class_type: "MiniMaxH3TurboLoRA", inputs: { model, lora_name: o.turboLora, strength: o.turboStrength, low_vram: false } };
    model = ["turbo", 0];
  } else if (turbo === "lightx2v" || turbo === "pdd") {
    g.turbo = { class_type: "LoraLoaderModelOnly", inputs: { model, lora_name: o.turboLora, strength_model: o.turboStrength } };
    model = ["turbo", 0];
  }
  if (o.blockCache === "fbcache" && turbo === "none" && has("ApplyMiniMaxH3FirstBlockCache")) {
    g.fbc = { class_type: "ApplyMiniMaxH3FirstBlockCache", inputs: { model, mode: "H3 Fast \u2014 0.10 / max 2", threshold: 0.1, start_percent: 0.1, end_percent: 0.95, max_consecutive_hits: 2, temporal_guard: false } };
    model = ["fbc", 0];
  }
  if ((o.optimizer === "memory" || o.optimizer === "memory_sparse") && has("H3MemoryOptimization")) {
    g.h3mem = { class_type: "H3MemoryOptimization", inputs: { model, fused_qkv: "auto", preserve_precision: true, embedding_memory_mode: "Auto", mlp_memory: "auto", chunk_rows: 4096, precision_mode: "Auto", qkv_streaming_mode: "Auto", kitchen_v_memory_mode: "Standard" } };
    model = ["h3mem", 0];
  }
  if (o.optimizer === "memory_sparse" && turbo === "none" && has("H3SparseAttention")) {
    g.h3sparse = { class_type: "H3SparseAttention", inputs: { model, video_budget: 0.15, denser_early_late_steps: true, layer_video_budgets: "" } };
    model = ["h3sparse", 0];
  }
  if (o.spectrum && has("SpectrumApplyMiniMaxH3")) {
    g.spec = { class_type: "SpectrumApplyMiniMaxH3", inputs: { model, enabled: true, blend_weight: 0.5, degree: 1, ridge_lambda: 0.1, window_size: 2, flex_window: 0.75, warmup_steps: 1, tail_actual_steps: 1, max_history: 8, debug: false, history_storage: "system_ram", bootstrap_first_forecast: true } };
    model = ["spec", 0];
  }
  if (o.fusedModulation && has("MiniMaxH3FusedModulation")) {
    g.fused = { class_type: "MiniMaxH3FusedModulation", inputs: { model, enabled: true } };
    model = ["fused", 0];
  }
  if ((o.attnBackend === "sla" || turbo === "lightx2v") && has("H3SLAAttention")) {
    g.sla = { class_type: "H3SLAAttention", inputs: { model, sparsity_ratio: 0.9, block_size: "64", min_seq_len: 8192, dense_last_steps: 0, protect_audio: true, enabled: true } };
    model = ["sla", 0];
  }
  return model;
}
async function buildH3Graph(job) {
  const o = job.opt;
  const m = await resolveH3Models(job.models, job.mode);
  const miss = [["H3 diffusion model", m.unet], ["text encoder", m.clip], ["video VAE", m.vaeVideo], ["audio VAE", m.vaeAudio]].filter(([, v]) => !v).map(([k]) => k);
  if (miss.length) throw new Error(`Pick the MiniMax H3 ${miss.join(", ")} in Settings \u2192 Video models.`);
  if (!job.prompt.trim()) throw new Error("Prompt is empty");
  if (job.mode === "reference" && !job.refs.length && !job.assetRef) throw new Error("Connect at least one reference image or an Asset Library card");
  const avail = await h3Availability();
  const has = (n2) => !!avail[n2];
  const needNode = (n2, why) => {
    if (!has(n2)) throw new Error(`${why} needs the ${n2} node \u2014 install the ComfyUI pack that provides it, or switch the option off.`);
  };
  const frames = h3Frames(job.seconds);
  const turbo = effectiveTurbo(o, has);
  const hires = o.hires && turbo === "pdd";
  const final = job.size ?? h3Size(job.aspect, hires ? o.hiresFinalMp : job.megapixels);
  const start = hires ? h3Size(job.aspect, o.hiresStartMp) : final;
  const steps = hires ? 8 : turbo === "none" ? Math.max(1, Math.round(job.steps)) : Math.max(1, Math.round(o.turboSteps));
  const g = {};
  g.unet = m.unet.toLowerCase().endsWith(".gguf") ? { class_type: "UnetLoaderGGUF", inputs: { unet_name: m.unet } } : { class_type: "UNETLoader", inputs: { unet_name: m.unet, weight_dtype: "default" } };
  let model = ["unet", 0];
  model = h3ModelChain(g, model, o, turbo, job.loras, has);
  g.clip = { class_type: "CLIPLoader", inputs: { clip_name: m.clip, type: "minimax", device: "default" } };
  g.vaeV = { class_type: "VAELoader", inputs: { vae_name: m.vaeVideo } };
  g.vaeA = { class_type: "VAELoader", inputs: { vae_name: m.vaeAudio } };
  const cond = (key, w, h) => {
    if (job.mode === "reference" && job.assetRef) {
      needNode("TJ_H3Reference", "Asset Library references");
      const lib = { clip: ["clip", 0], vae: ["vaeV", 0], audio_vae: ["vaeA", 0], prompt: job.prompt, width: w, height: h, length: frames, ref_image_size: "match", match_check: "warn" };
      if (job.assetRef.project) {
        lib.mode = "project";
        lib.project = String(job.assetRef.project);
      } else {
        const ids = job.assetRef.ids.slice(0, 15);
        lib.mode = "assets";
        lib.asset_count = ids.length;
        ids.forEach((id, i) => {
          lib[`asset_${i + 1}`] = String(id);
        });
      }
      g[key] = { class_type: "TJ_H3Reference", inputs: lib };
    } else if (job.mode === "reference") {
      const inputs = { clip: ["clip", 0], vae: ["vaeV", 0], audio_vae: ["vaeA", 0], prompt: job.prompt, width: w, height: h, length: frames, ref_image_size: "match" };
      job.refs.slice(0, 9).forEach((f, i) => {
        g[`ref${i}`] ??= { class_type: "LoadImage", inputs: { image: f } };
        inputs[`ref_images.ref_image_${i}`] = [`ref${i}`, 0];
      });
      g[key] = { class_type: "MiniMaxH3ReferenceToVideo", inputs };
    } else {
      const inputs = { clip: ["clip", 0], vae: ["vaeV", 0], prompt: job.prompt, width: w, height: h, length: frames };
      if (job.mode === "firstlast") {
        if (job.first) {
          g.first ??= { class_type: "LoadImage", inputs: { image: job.first } };
          inputs.first_frame = ["first", 0];
        }
        if (job.last) {
          g.last ??= { class_type: "LoadImage", inputs: { image: job.last } };
          inputs.last_frame = ["last", 0];
        }
      }
      g[key] = { class_type: "MiniMaxH3ImageToVideo", inputs };
    }
  };
  cond("cond", start.width, start.height);
  const imageCond = job.mode === "reference" || job.mode === "firstlast" && (job.first || job.last);
  const hrCond = hires && imageCond;
  if (hrCond) cond("hrCond", final.width, final.height);
  g.noise = { class_type: "RandomNoise", inputs: { noise_seed: job.seed } };
  g.sel = turbo === "larryvrh" && has("MiniMaxH3TurboSampler") ? { class_type: "MiniMaxH3TurboSampler", inputs: {} } : { class_type: "KSamplerSelect", inputs: { sampler_name: turbo === "pdd" ? "euler" : job.sampler } };
  g.sched = { class_type: "BasicScheduler", inputs: { model, scheduler: job.scheduler, steps, denoise: 1 } };
  let condLink = ["cond", 0], hrCondLink = hrCond ? ["hrCond", 0] : condLink;
  if (has("TJ_FreeTextEncoderVRAM")) {
    g.free = { class_type: "TJ_FreeTextEncoderVRAM", inputs: { clip: ["clip", 0], trigger: hrCond ? hrCondLink : condLink } };
    if (hrCond) hrCondLink = ["free", 0];
    else condLink = hrCondLink = ["free", 0];
  }
  g.guider = { class_type: "BasicGuider", inputs: { model, conditioning: condLink } };
  let latent = ["cond", 1];
  let locked = false;
  if (o.audioLock) {
    needNode("TJ_H3_AudioLock", "Audio lock");
    g.lockAud = { class_type: "LoadAudio", inputs: { audio: o.audioLock.file } };
    let aud = ["lockAud", 0];
    if (has("TrimAudioDuration")) {
      g.lockTrim = { class_type: "TrimAudioDuration", inputs: { audio: aud, start_index: o.audioLock.startSec, duration: frames / FPS } };
      aud = ["lockTrim", 0];
    }
    g.audioLock = { class_type: "TJ_H3_AudioLock", inputs: { av_latent: latent, audio: aud, audio_vae: ["vaeA", 0], mode: o.audioLock.mode, strength: o.audioLock.strength, fit: o.audioLock.fit, get_name_av_latent: "(none)", get_name_audio: "(none)", get_name_audio_vae: "(none)", auto_set: false } };
    latent = ["audioLock", 0];
    locked = true;
  }
  if (job.checkpoint !== void 0 || job.prevCheckpoint) {
    needNode("TJ_H3_LatentContinuation", "One-Take");
    if (job.clipIndex > 0 && job.prevCheckpoint) {
      needNode("TJ_H3_LoadLatentCheckpoint", "One-Take");
      g.chkLoad = { class_type: "TJ_H3_LoadLatentCheckpoint", inputs: { checkpoint_name: job.prevCheckpoint, strict: true } };
      g.cont = { class_type: "TJ_H3_LatentContinuation", inputs: { overlap_frames: ONE_TAKE_OVERLAP_FRAMES, lock_audio: false, prev_latent: ["chkLoad", 0], target_latent: latent } };
      latent = ["cont", 0];
    }
  }
  let sigmas = ["sched", 0];
  if (hires) {
    g.split = { class_type: "SplitSigmas", inputs: { sigmas, step: 7 } };
    sigmas = ["split", 0];
  }
  g.samp = { class_type: "SamplerCustomAdvanced", inputs: { noise: ["noise", 0], guider: ["guider", 0], sampler: ["sel", 0], sigmas, latent_image: latent } };
  if (job.checkpoint && has("TJ_H3_SaveLatentCheckpoint")) g.chkSave = { class_type: "TJ_H3_SaveLatentCheckpoint", inputs: { latent: hires ? ["samp", 1] : ["samp", 0], checkpoint_name: job.checkpoint } };
  let samples = ["samp", 0];
  if (hires) {
    for (const n2 of ["MinimaxH3LatentUpscaler3D", "H3MemoryOptimization", "BlockSparseAttention"]) needNode(n2, "7+1 hi-res finish");
    g.hrSep = { class_type: "LTXVSeparateAVLatent", inputs: { av_latent: ["samp", 1] } };
    g.hrUp = { class_type: "MinimaxH3LatentUpscaler3D", inputs: { latent: ["hrSep", 0], model_name: "minimax_h3_latent_upscaler_3d_bf16.safetensors", mode: "target dimensions", "mode.width": final.width, "mode.height": final.height, align: 32, enable_temporal_chunking: true, force_unload: true, device: "cuda", precision: "fp16" } };
    g.hrCat = { class_type: "LTXVConcatAVLatent", inputs: { video_latent: ["hrUp", 0], audio_latent: ["hrSep", 1] } };
    let hl = ["hrCat", 0];
    if (locked) {
      g.hrLock = { class_type: "TJ_H3_AudioLock", inputs: { ...g.audioLock.inputs, av_latent: hl } };
      hl = ["hrLock", 0];
    }
    let hm = ["unet", 0];
    job.loras.forEach((l, i) => {
      if (!l.name || l.name === "none" || !(l.strength > 0)) return;
      g[`hrLora${i}`] = { class_type: "LoraLoaderModelOnly", inputs: { model: hm, lora_name: l.name, strength_model: l.strength } };
      hm = [`hrLora${i}`, 0];
    });
    g.hrPdd = { class_type: "LoraLoaderModelOnly", inputs: { model: hm, lora_name: o.turboLora, strength_model: o.turboStrength } };
    g.hrShift = { class_type: "MiniMaxH3SigmaShift", inputs: { model: ["hrPdd", 0], shift_video: 12, shift_audio: 3 } };
    g.hrMem = { class_type: "H3MemoryOptimization", inputs: { model: ["hrShift", 0], fused_qkv: "auto", preserve_precision: true, embedding_memory_mode: "Auto", mlp_memory: "auto", chunk_rows: 2048, precision_mode: "Preserve native", qkv_streaming_mode: "Forced", kitchen_v_memory_mode: "Lower VRAM (slower)" } };
    g.hrSparse = { class_type: "BlockSparseAttention", inputs: { model: ["hrMem", 0], selection: "sol-attn", "selection.tau": 1.3, start_percent: 0.2, end_percent: 1, dense_blocks: "", min_tokens: 12288, extra_tokens: 256, sink_conditioning: "exact_kv_and_rows", verbose: false } };
    g.hrGuider = { class_type: "BasicGuider", inputs: { model: ["hrSparse", 0], conditioning: hrCondLink } };
    g.hrSamp = { class_type: "SamplerCustomAdvanced", inputs: { noise: ["noise", 0], guider: ["hrGuider", 0], sampler: ["sel", 0], sigmas: ["split", 1], latent_image: hl } };
    samples = ["hrSamp", 0];
  }
  g.dec = { class_type: "VAEDecode", inputs: { samples, vae: ["vaeV", 0] } };
  g.decA = { class_type: "VAEDecodeAudio", inputs: { samples, vae: ["vaeA", 0] } };
  let images = ["dec", 0];
  if (job.upscaleModel && job.upscaleModel !== "none") {
    g.upModel = { class_type: "UpscaleModelLoader", inputs: { model_name: job.upscaleModel } };
    g.upApply = { class_type: "ImageUpscaleWithModel", inputs: { upscale_model: ["upModel", 0], image: images } };
    images = ["upApply", 0];
  }
  const audio = locked ? ["audioLock", 1] : ["decA", 0];
  const tag = String(job.clipIndex + 1).padStart(3, "0");
  const prefix = `${job.saveSubfolder}/${job.stem}_clip${tag}`;
  if (has("VHS_VideoCombine")) g.save = { class_type: "VHS_VideoCombine", inputs: { images, audio, frame_rate: FPS, loop_count: 0, filename_prefix: prefix, format: "video/nvenc_h264-mp4", pingpong: false, save_output: true } };
  else {
    g.video = { class_type: "CreateVideo", inputs: { images, fps: FPS, audio } };
    g.save = { class_type: "SaveVideo", inputs: { video: ["video", 0], filename_prefix: prefix, format: "auto", codec: "auto" } };
  }
  const out = { graph: g, videoNode: "save", checkpoint: job.checkpoint };
  if (job.saveLastFrame) {
    g.lastF = { class_type: "ImageFromBatch", inputs: { image: images, batch_index: Math.max(0, frames - 1), length: 1 } };
    g.saveLF = { class_type: "SaveImage", inputs: { images: ["lastF", 0], filename_prefix: `${job.saveSubfolder}/frames/${job.stem}_clip${tag}_last` } };
    const tail = Math.min(TAIL_CANDIDATES, frames);
    g.tailF = { class_type: "ImageFromBatch", inputs: { image: images, batch_index: Math.max(0, frames - tail), length: tail } };
    g.tailPrev = { class_type: "PreviewImage", inputs: { images: ["tailF", 0] } };
    out.lastFrameNode = "saveLF";
    out.tailNode = "tailPrev";
  }
  return out;
}
var pickChainFrame = (images) => postJson("/minimax_h3_one/pick_chain_frame", { images });
var copyToInput = (f) => postJson("/minimax_h3_one/copy_to_input", f);
var stitchClips = (clips, filenamePrefix, overlapSeconds, overrideAudio) => postJson("/minimax_h3_one/stitch", { clips, filename_prefix: filenamePrefix, ...overlapSeconds ? { overlap_seconds: overlapSeconds } : {}, ...overrideAudio ? { override_audio: { type: "input", subfolder: "", start: 0, ...overrideAudio } } : {} });

// src/backend/workflow.ts
function parseWorkflow(src) {
  if (!src.trim()) return {};
  try {
    const j = JSON.parse(src);
    if (Array.isArray(j?.nodes)) return { error: 'This is a UI-format workflow. In ComfyUI use "Save (API Format)" (enable Dev mode in settings).' };
    const g = j?.prompt && typeof j.prompt === "object" ? j.prompt : j;
    if (!g || typeof g !== "object" || !Object.values(g).every((n2) => n2 && typeof n2.class_type === "string")) return { error: "Not an API-format workflow JSON." };
    return { graph: g };
  } catch (e) {
    return { error: `Invalid JSON: ${e.message}` };
  }
}
function setField(g, key, value) {
  const [id, input] = key.split("::");
  if (id && input && g[id]) g[id].inputs[input] = value;
}
var VIDEO_EXT = /\.(mp4|webm|mov|mkv|gif|webp)$/i;

// src/engine/run.ts
init_settings();

// src/engine/util.ts
init_comfy();
var textAsset = (text3, port) => ({ id: uid(), type: "text", url: "", text: text3, port });
var num2 = (v, d = 0) => typeof v === "number" ? v : parseFloat(String(v)) || d;
var str = (v, d = "") => v === void 0 ? d : String(v);
function need(v, what) {
  if (v === void 0 || Array.isArray(v) && !v.length) throw new Error(`${what} is not connected`);
  return v;
}

// src/engine/more.ts
init_comfy();

// src/backend/post.ts
init_comfy();
var nodeCache = /* @__PURE__ */ new Map();
function hasNode(cls) {
  if (!nodeCache.has(cls)) nodeCache.set(cls, objectInfo(cls).then((r) => !!r?.[cls]).catch(() => false));
  return nodeCache.get(cls);
}
async function need2(cls, label, pack) {
  if (!await hasNode(cls)) throw new Error(`${label} (${cls}) is not installed${pack ? ` \u2014 it comes with ${pack}` : ""}.`);
}
function rtxTarget(r, srcW, srcH) {
  const round8 = (v) => Math.max(8, Math.round(v / 8) * 8);
  if (r.mode === "short" || r.mode === "long") {
    const short = Math.min(srcW, srcH), long = Math.max(srcW, srcH);
    const target = Math.max(8, Math.round(r.mode === "short" ? r.short : r.long));
    const other = r.mode === "short" ? target * (long / short) : target * (short / long);
    const wSide = srcW <= srcH;
    const width = r.mode === "short" ? wSide ? target : round8(other) : wSide ? round8(other) : target;
    const height = r.mode === "short" ? wSide ? round8(other) : target : wSide ? target : round8(other);
    return { type: "dims", width: round8(width), height: round8(height), crop: null };
  }
  if (r.mode === "wh") {
    const width = round8(r.w), height = round8(r.h);
    const ta = width / height, sa = srcW / srcH;
    let cw = srcW, ch = srcH;
    if (sa > ta) cw = Math.round(srcH * ta);
    else if (sa < ta) ch = Math.round(srcW / ta);
    const x = r.anchor === "left" ? 0 : r.anchor === "right" ? srcW - cw : Math.round((srcW - cw) / 2);
    const y = r.anchor === "top" ? 0 : r.anchor === "bottom" ? srcH - ch : Math.round((srcH - ch) / 2);
    return { type: "dims", width, height, crop: cw < srcW || ch < srcH ? { x, y, width: cw, height: ch } : null };
  }
  return { type: "scale", scale: r.scale, width: 0, height: 0, crop: null };
}
var GRAIN_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_image0;
uniform vec2 u_resolution;
uniform float u_float0; // amount
uniform float u_float1; // size
uniform float u_float2; // colour
uniform float u_float3; // luminance bias
uniform int   u_int0;   // 0 smooth, 1 grainy
in vec2 v_texCoord;
layout(location = 0) out vec4 fragColor0;
uint pcg(uint v){uint s=v*747796405u+2891336453u;uint w=((s>>((s>>28u)+4u))^s)*277803737u;return (w>>22u)^w;}
uint hash2d(uvec2 p){return pcg(p.x+pcg(p.y));}
float hashf(uvec2 p,uint o){return float(pcg(hash2d(p)+o))/float(0xffffffffu);}
float gauss(uvec2 p,uint o){return (hashf(p,o)+hashf(p,o+1u)+hashf(p,o+2u)+hashf(p,o+3u)-2.0)*0.7;}
float smoothNoise(vec2 p,uint o){
  vec2 i=floor(p);vec2 f=fract(p);f=f*f*f*(f*(f*6.0-15.0)+10.0);uvec2 u=uvec2(i);
  return mix(mix(gauss(u,o),gauss(u+uvec2(1u,0u),o),f.x),mix(gauss(u+uvec2(0u,1u),o),gauss(u+uvec2(1u,1u),o),f.x),f.y);
}
void main(){
  vec4 c=texture(u_image0,v_texCoord);
  float luma=dot(c.rgb,vec3(0.2126,0.7152,0.0722));
  vec2 uv=v_texCoord*u_resolution/max(u_float1,0.01);
  uvec2 gp=uvec2(uv);
  float g; vec3 rgb;
  if(u_int0==1){g=gauss(gp,0u);rgb=vec3(gauss(gp,100u),gauss(gp,200u),gauss(gp,300u));}
  else{g=smoothNoise(uv,0u);rgb=vec3(smoothNoise(uv,100u),smoothNoise(uv,200u),smoothNoise(uv,300u));}
  float lw=mix(1.0,1.0-luma,clamp(u_float3,0.0,1.0));
  vec3 gc=mix(vec3(g),rgb,clamp(u_float2,0.0,1.0));
  c.rgb+=gc*(u_float0*0.15)*lw;
  fragColor0=vec4(clamp(c.rgb,0.0,1.0),c.a);
}
`;
async function addVideoSave(g, images, audio, fps, prefix, pfx = "S") {
  if (await hasNode("VHS_VideoCombine")) {
    g[`${pfx}:save`] = { class_type: "VHS_VideoCombine", inputs: { images, ...audio ? { audio } : {}, frame_rate: fps, loop_count: 0, filename_prefix: prefix, format: "video/nvenc_h264-mp4", pingpong: false, save_output: true } };
  } else {
    g[`${pfx}:video`] = { class_type: "CreateVideo", inputs: { images, fps, ...audio ? { audio } : {} } };
    g[`${pfx}:save`] = { class_type: "SaveVideo", inputs: { video: [`${pfx}:video`, 0], filename_prefix: prefix, format: "auto", codec: "auto" } };
  }
  return `${pfx}:save`;
}
async function addVideoLoad(g, file, id = "P:load", skip = 0, cap = 0) {
  await need2("VHS_LoadVideo", "Video loader", "ComfyUI-VideoHelperSuite");
  g[id] = { class_type: "VHS_LoadVideo", inputs: { video: file, force_rate: 0, custom_width: 0, custom_height: 0, frame_load_cap: cap, skip_first_frames: skip, select_every_nth: 1, format: "AnimateDiff" } };
}
async function buildPostGraph(job) {
  const g = {};
  await addVideoLoad(g, job.file, "P:load", job.skip ?? 0, job.cap ?? 0);
  let images = ["P:load", 0];
  let fps = job.fps && job.fps > 0 ? job.fps : FPS;
  const s = job.step;
  let label = s.kind;
  if (s.kind === "deblur") {
    await need2("TJ_RTXDeblur", "RTX Deblur", "ComfyUI-TJ_NODE_STUDIO_ONE (NVIDIA RTX GPU)");
    g["P:step"] = { class_type: "TJ_RTXDeblur", inputs: { images, strength: s.strength } };
    images = ["P:step", 0];
  } else if (s.kind === "denoise") {
    await need2("TJ_NODE_RTXDenoise", "RTX Denoise", "ComfyUI-TJ_NODE (NVIDIA RTX GPU)");
    g["P:step"] = { class_type: "TJ_NODE_RTXDenoise", inputs: { images, strength: s.strength } };
    images = ["P:step", 0];
  } else if (s.kind === "upscale") {
    label = `upscale (${s.method}${s.twoPass && s.method !== "rtx" ? " + RTX" : ""})`;
    if (s.method === "flashvsr") {
      await need2("FlashVSRNodeAdv", "FlashVSR", "ComfyUI-FlashVSR_Ultra_Fast");
      const f = s.flashvsr;
      g["P:pipe"] = { class_type: "FlashVSRInitPipe", inputs: { model: f.model, mode: f.mode, alt_vae: "none", force_offload: true, precision: "bf16", device: "cuda:0", attention_mode: "sparse_sage_attention" } };
      g["P:step"] = { class_type: "FlashVSRNodeAdv", inputs: { pipe: ["P:pipe", 0], frames: images, scale: Math.min(4, Math.max(2, Math.round(f.scale))), color_fix: f.colorFix, tiled_vae: true, tiled_dit: true, tile_size: f.tileSize, tile_overlap: f.tileOverlap, unload_dit: false, sparse_ratio: 2, kv_ratio: 3, local_range: 11, seed: f.seed } };
      images = ["P:step", 0];
    } else if (s.method === "rtx") {
      await need2("TJ_NODE_RTXVSR", "RTX VSR", "ComfyUI-TJ_NODE (NVIDIA RTX GPU)");
      const t = rtxTarget(s.rtx, s.srcW, s.srcH);
      if (t.crop) {
        g["P:crop"] = { class_type: "ImageCrop", inputs: { image: images, ...t.crop } };
        images = ["P:crop", 0];
      }
      g["P:step"] = { class_type: "TJ_NODE_RTXVSR", inputs: { images, resize_type: t.type === "scale" ? "scale by multiplier" : "target dimensions", scale: t.type === "scale" ? t.scale : 2, width: t.width || 1920, height: t.height || 1080, quality: s.rtx.quality } };
      images = ["P:step", 0];
    } else {
      if (!s.modelName || s.modelName === "none") throw new Error("Pick an upscale model first");
      g["P:model"] = { class_type: "UpscaleModelLoader", inputs: { model_name: s.modelName } };
      g["P:step"] = { class_type: "ImageUpscaleWithModel", inputs: { upscale_model: ["P:model", 0], image: images } };
      images = ["P:step", 0];
    }
    if (s.twoPass && s.method !== "rtx") {
      await need2("TJ_NODE_RTXVSR", "2-pass upscale (RTX VSR)", "ComfyUI-TJ_NODE (NVIDIA RTX GPU)");
      const p = s.pass2;
      const inp = { images, resize_type: "scale by multiplier", scale: Math.max(1, p.scale), width: 1920, height: 1080, quality: p.quality };
      if (p.mode === "short" || p.mode === "long") {
        inp.resize_type = p.mode === "short" ? "short edge" : "long edge";
        inp.edge = Math.max(8, Math.round(p.mode === "short" ? p.short : p.long));
      } else if (p.mode === "wh") {
        inp.resize_type = "target dimensions (crop to fit)";
        inp.width = Math.max(8, Math.round(p.w));
        inp.height = Math.max(8, Math.round(p.h));
        inp.crop_anchor = p.anchor;
      }
      g["P:rtx2"] = { class_type: "TJ_NODE_RTXVSR", inputs: inp };
      images = ["P:rtx2", 0];
    }
  } else if (s.kind === "skin") {
    await need2("TJ_SkinRetouch", "Skin Retouch", "ComfyUI-TJ_NODE");
    g["P:step"] = { class_type: "TJ_SkinRetouch", inputs: { images, evenness: s.evenness, smoothing: s.smoothing, redness: s.redness, shine: s.shine, blemish_mode: s.blemish, preserve_marks: s.preserveMarks, microtexture_strength: s.microtexture } };
    images = ["P:step", 0];
  } else if (s.kind === "grain") {
    await need2("GLSLShader", "Film grain (GLSLShader)", "a newer ComfyUI core");
    await need2("SplitImageWithAlpha", "SplitImageWithAlpha", "a newer ComfyUI core");
    g["P:step"] = { class_type: "GLSLShader", inputs: { fragment_shader: GRAIN_SHADER, size_mode: "from_input", "images.image0": images, "floats.u_float0": s.amount, "floats.u_float1": s.size, "floats.u_float2": s.color, "floats.u_float3": s.lumBias, "ints.u_int0": s.noise === "grainy" ? 1 : 0 } };
    g["P:dealpha"] = { class_type: "SplitImageWithAlpha", inputs: { image: ["P:step", 0] } };
    images = ["P:dealpha", 0];
  } else if (s.kind === "interpolate") {
    await need2("RIFEInterpolation", "RIFE frame interpolation", "ComfyUI-Frame-Interpolation");
    const dst = Math.max(fps, s.targetFps || fps * 2);
    g["P:step"] = { class_type: "RIFEInterpolation", inputs: { images, source_fps: fps, target_fps: dst, scale: s.scale, model_name: s.modelName || "flownet.pkl", batch_size: Math.max(1, Math.round(s.batchSize)), use_fp16: s.fp16 } };
    images = ["P:step", 0];
    fps = dst;
  } else if (s.kind === "resize") {
    await need2("TJ_VideoResize", "Video Resize", "ComfyUI-TJ_NODE");
    g["P:step"] = { class_type: "TJ_VideoResize", inputs: { images, mode: s.mode, upscale_method: s.method, target_px: Math.max(8, Math.round(s.targetPx)), ratio_w: Math.max(1, Math.round(s.ratioW)), ratio_h: Math.max(1, Math.round(s.ratioH)), megapixels: Math.max(0.01, s.megapixels), target_width: Math.max(8, Math.round(s.width)), target_height: Math.max(8, Math.round(s.height)), crop_mode: s.crop } };
    images = ["P:step", 0];
  }
  const save = await addVideoSave(g, images, ["P:load", 2], fps, `${job.folder}/${job.stem}_${s.kind}`, "P");
  return { graph: g, save, label };
}

// src/backend/charSheet.ts
var CHARSHEET_FRAMES = 124;
var CHARSHEET_DEFAULT_FRAMES = [7, 22, 37, 52, 67, 82, 107, 118];
var PASS2_SIGMAS = {
  3: "0.9035, 0.6316, 0.3158, 0.0000",
  4: "0.9035, 0.8000, 0.6316, 0.3158, 0.0000",
  5: "0.9231, 0.8780, 0.8000, 0.6316, 0.3158, 0.0000"
};
var CHARSHEET_PROMPT = "subject_definitions:\n@image1 is <Subject 1>, Protagonist.\n\nstyle_definitions:\n@style is <Style 1>, @image1 High quality and detailed 3d anime\n\nretention_analysis:\n<Subject 1>: fully_preserved the exact facial identity, anatomy, clothing, skin color, skin texture, skin shade, skin radiance and proportions of <Subject 1>. Never render @image1 as a shot.\n<Style 1>: fully_preserved the artistic medium, line weight, shading, and texture across all angles.\n\ndetailed_description:\nThe scene is a character model sheet on a seamless neutral white studio backdrop with even lighting. No border. @style is applied throughout. Start directly at Shot 1. \n  \n[Shot 1]: Static full-body shot, front view from head to toe. <Subject 1> maintains a neutral pose and expression, arms relaxed at sides with empty open hands.\n[[Shot 2] At 00:00.625]: Static full-body shot, back view from head to toe. <Subject 1> maintains a neutral pose and expression, arms relaxed at sides with empty open hands.\n[[Shot 3] At 00:01.250]: Static full-body shot of <Subject 1>, showing left and right profile views. <Subject 1> maintains a neutral pose and expression, arms relaxed at sides with empty open hands.\n[[Shot 4] At 00:01.875]: Static front_three_quarter view (framed from mid-thigh to top of head) of <Subject 1>. <Subject 1> maintains a neutral pose and expression, arms relaxed at sides with empty open hands.\n[[Shot 5] At 00:02.500]: Static Back_three_quarter (framed from mid-thigh to top of head) of <Subject 1>. <Subject 1> maintains a neutral pose and expression, arms relaxed at sides with empty open hands.\n[[Shot 6] At 00:03.125]: Static tight close-up shot of <Subject 1>, framed directly on the face from shoulders to top of head, facing front. <Subject 1> has a neutral expression.\n[[Shot 7] At 00:03.750]: Static tight close-up shot of <Subject 1>, framed directly on the face from shoulders to top of head, facing front. <Subject 1> has a happy smile expression.\n[[Shot 8] At 00:04.375]: Static tight close-up shot of <Subject 1>, framed directly on the face from shoulders to top of head, facing front. <Subject 1> has an very angry expression.\n\n\noverall_soundscape: N/A\nnon_diegetic_music: N/A\n";
async function buildSheetVideoGraph(j) {
  if (!j.refs.length) throw new Error("Character Sheet needs at least one reference image");
  const m = await resolveH3Models(j.models, "reference");
  if (!m.unet || !m.clip || !m.vaeVideo) throw new Error("Pick the MiniMax H3 reference model, text encoder and video VAE in Settings \u2192 Video models.");
  const avail = await h3Availability();
  const has = (n2) => !!avail[n2];
  const { width, height } = h3Size(j.aspect, j.megapixels);
  const pass = j.latentUpscale ? h3Size(j.aspect, j.firstPassMp) : { width, height };
  const g = {};
  g.unet = { class_type: "UNETLoader", inputs: { unet_name: m.unet, weight_dtype: "default" } };
  let model = ["unet", 0];
  if (has("PathchSageAttentionKJ")) {
    g.sage = { class_type: "PathchSageAttentionKJ", inputs: { sage_attention: "auto", allow_compile: false, model } };
    model = ["sage", 0];
  }
  if (has("MiniMaxH3MemoryEfficientSageAttentionPatch")) {
    g.mem = { class_type: "MiniMaxH3MemoryEfficientSageAttentionPatch", inputs: { model } };
    model = ["mem", 0];
  }
  j.loras.forEach((l, i) => {
    if (l.name && l.name !== "none" && l.strength > 0) {
      g[`lora${i}`] = { class_type: "LoraLoaderModelOnly", inputs: { model, lora_name: l.name, strength_model: l.strength } };
      model = [`lora${i}`, 0];
    }
  });
  g.shift = { class_type: "MiniMaxH3SigmaShift", inputs: { model, shift_video: 12, shift_audio: 3 } };
  model = ["shift", 0];
  g.clip = { class_type: "CLIPLoader", inputs: { clip_name: m.clip, type: "minimax", device: "default" } };
  g.vaeV = { class_type: "VAELoader", inputs: { vae_name: m.vaeVideo } };
  const cond = { clip: ["clip", 0], vae: ["vaeV", 0], prompt: j.prompt, width: pass.width, height: pass.height, length: CHARSHEET_FRAMES, ref_image_size: j.refImageSize };
  j.refs.slice(0, 9).forEach((f, i) => {
    g[`ref${i}`] = { class_type: "LoadImage", inputs: { image: f } };
    cond[`ref_images.ref_image_${i}`] = [`ref${i}`, 0];
  });
  g.cond = { class_type: "MiniMaxH3ReferenceToVideo", inputs: cond };
  g.noise = { class_type: "RandomNoise", inputs: { noise_seed: j.seed } };
  g.s1 = { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } };
  g.sched = { class_type: "BasicScheduler", inputs: { scheduler: "simple", steps: 8, denoise: 1, model } };
  g.guider = { class_type: "BasicGuider", inputs: { model, conditioning: ["cond", 0] } };
  g.samp = { class_type: "SamplerCustomAdvanced", inputs: { noise: ["noise", 0], guider: ["guider", 0], sampler: ["s1", 0], sigmas: ["sched", 0], latent_image: ["cond", 1] } };
  let samples = ["samp", 0];
  if (j.latentUpscale) {
    if (!has("MinimaxH3LatentUpscaler3D")) throw new Error("Latent upscale needs the MinimaxH3LatentUpscaler3D node.");
    g.sep = { class_type: "LTXVSeparateAVLatent", inputs: { av_latent: ["samp", 1] } };
    g.up = { class_type: "MinimaxH3LatentUpscaler3D", inputs: { model_name: "minimax_h3_latent_upscaler_3d_bf16.safetensors", mode: "target dimensions", "mode.width": width, "mode.height": height, align: 32, enable_temporal_chunking: true, force_unload: true, device: "cuda", precision: "fp16", latent: ["sep", 0] } };
    g.cat = { class_type: "LTXVConcatAVLatent", inputs: { video_latent: ["up", 0], audio_latent: ["sep", 1] } };
    g.s2 = { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } };
    g.guider2 = { class_type: "BasicGuider", inputs: { model, conditioning: ["cond", 0] } };
    g.sig2 = { class_type: "ManualSigmas", inputs: { sigmas: PASS2_SIGMAS[j.secondPassSteps] ?? PASS2_SIGMAS[3] } };
    g.samp2 = { class_type: "SamplerCustomAdvanced", inputs: { noise: ["noise", 0], guider: ["guider2", 0], sampler: ["s2", 0], sigmas: ["sig2", 0], latent_image: ["cat", 0] } };
    samples = ["samp2", 0];
  }
  g.dec = { class_type: "VAEDecode", inputs: { samples, vae: ["vaeV", 0] } };
  let images = ["dec", 0];
  if (j.deblur && j.deblur !== "none") {
    if (!await hasNode("TJ_RTXDeblur")) throw new Error("RTX Deblur (TJ_RTXDeblur) is not installed.");
    g.deblur = { class_type: "TJ_RTXDeblur", inputs: { images, strength: j.deblur } };
    images = ["deblur", 0];
  }
  if (j.rtx) {
    if (!await hasNode("RTXVideoSuperResolution")) throw new Error("RTX Video Super Resolution is not installed.");
    g.rtx = { class_type: "RTXVideoSuperResolution", inputs: { images, resize_type: "scale by multiplier", "resize_type.scale": 2, quality: "ULTRA" } };
    images = ["rtx", 0];
    if (j.rtxSupersample) {
      g.down = { class_type: "ImageScale", inputs: { image: images, upscale_method: "lanczos", width, height, crop: "center" } };
      images = ["down", 0];
    }
  }
  const save = await addVideoSave(g, images, void 0, FPS, `${j.saveSubfolder}/${j.stem}_charsheet_video`, "C");
  return { graph: g, save, width, height };
}
async function buildSheetGridGraph(o) {
  for (const n2 of ["BatchImagesNode", "ImageGrid", "ImageScaleToMaxDimension"]) if (!await hasNode(n2)) throw new Error(`${n2} is not installed (ComfyUI core is out of date).`);
  const g = {};
  g.load = { class_type: "VHS_LoadVideo", inputs: { video: o.video, force_rate: 0, custom_width: 0, custom_height: 0, frame_load_cap: 0, skip_first_frames: 0, select_every_nth: 1 } };
  g.ref = { class_type: "LoadImage", inputs: { image: o.ref } };
  g.refS = { class_type: "ImageScale", inputs: { image: ["ref", 0], upscale_method: "lanczos", width: o.cellW, height: o.cellH, crop: "center" } };
  const batch = { "images.image0": ["refS", 0] };
  const idx = (o.frames.length ? o.frames : CHARSHEET_DEFAULT_FRAMES).slice(0, 8);
  idx.forEach((n2, i) => {
    g[`f${i}`] = { class_type: "ImageFromBatch", inputs: { batch_index: n2, length: 1, image: ["load", 0] } };
    batch[`images.image${i + 1}`] = [`f${i}`, 0];
    if (o.saveEach) g[`fs${i}`] = { class_type: "SaveImage", inputs: { filename_prefix: `${o.folder}/${o.stem}_charsheet_shot${i + 1}`, images: [`f${i}`, 0] } };
  });
  g.batch = { class_type: "BatchImagesNode", inputs: batch };
  g.grid = { class_type: "ImageGrid", inputs: { columns: 3, cell_width: o.cellW, cell_height: o.cellH, padding: 8, images: ["batch", 0] } };
  g.max = { class_type: "ImageScaleToMaxDimension", inputs: { upscale_method: "area", largest_size: o.maxDim, image: ["grid", 0] } };
  g.save = { class_type: "SaveImage", inputs: { filename_prefix: `${o.folder}/${o.stem}_charsheet`, images: ["max", 0] } };
  return { graph: g, save: "save" };
}

// src/backend/h3Image.ts
var LENGTH = 8;
async function buildH3ImageGraph(j) {
  const ref = j.refs.length > 0;
  const m = await resolveH3Models(j.models, ref ? "reference" : "firstlast");
  if (!m.unet || !m.clip || !m.vaeVideo) throw new Error("Pick the MiniMax H3 model, text encoder and video VAE in Settings \u2192 Video models.");
  if (!j.prompt.trim()) throw new Error("Prompt is empty");
  const avail = await h3Availability();
  const has = (n2) => !!avail[n2];
  if (j.fizgig && !(await hasNode("FizgigH3StillLatent") && await hasNode("FizgigH3StillDecode"))) throw new Error("Fizgig latent needs ComfyUI-Fizgig-H3-Still \u2014 install it or switch Fizgig off.");
  const preview = h3Size(j.aspect, j.previewMp), fin = h3Size(j.aspect, j.finalMp);
  const render = j.fizgig && j.final ? fin : preview;
  const turbo = effectiveTurbo({ ...DEFAULT_OPT, ...j.opt, hires: false }, has);
  const g = {};
  g.unet = { class_type: "UNETLoader", inputs: { unet_name: m.unet, weight_dtype: "default" } };
  const model = h3ModelChain(g, ["unet", 0], { ...DEFAULT_OPT, ...j.opt, hires: false }, turbo, j.loras, has);
  g.clip = { class_type: "CLIPLoader", inputs: { clip_name: m.clip, type: "minimax", device: "default" } };
  g.vaeV = { class_type: "VAELoader", inputs: { vae_name: m.vaeVideo } };
  const cond = { clip: ["clip", 0], vae: ["vaeV", 0], prompt: j.prompt, width: render.width, height: render.height, length: LENGTH };
  if (ref) {
    cond.ref_image_size = j.refImageSize;
    j.refs.slice(0, 9).forEach((f, i) => {
      g[`ref${i}`] = { class_type: "LoadImage", inputs: { image: f } };
      cond[`ref_images.ref_image_${i}`] = [`ref${i}`, 0];
    });
    g.cond = { class_type: "MiniMaxH3ReferenceToVideo", inputs: cond };
  } else g.cond = { class_type: "MiniMaxH3ImageToVideo", inputs: cond };
  let start = ["cond", 1];
  if (j.fizgig) {
    g.fiz = { class_type: "FizgigH3StillLatent", inputs: { width: render.width, height: render.height, batch_size: 1 } };
    start = ["fiz", 0];
  }
  const steps = turbo === "none" ? Math.max(1, Math.round(j.steps)) : Math.max(1, Math.round(j.opt.turboSteps));
  g.noise = { class_type: "RandomNoise", inputs: { noise_seed: j.seed } };
  g.s1 = { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } };
  g.sched = { class_type: "BasicScheduler", inputs: { scheduler: "simple", steps, denoise: 1, model } };
  g.guider = { class_type: "BasicGuider", inputs: { model, conditioning: ["cond", 0] } };
  g.samp = { class_type: "SamplerCustomAdvanced", inputs: { noise: ["noise", 0], guider: ["guider", 0], sampler: ["s1", 0], sigmas: ["sched", 0], latent_image: start } };
  let samples = ["samp", 0];
  if (j.final && !j.fizgig) {
    if (!has("MinimaxH3LatentUpscaler3D")) throw new Error('The 2nd pass needs the MinimaxH3LatentUpscaler3D node \u2014 or turn "High quality 2nd pass" off.');
    g.sep = { class_type: "LTXVSeparateAVLatent", inputs: { av_latent: ["samp", 1] } };
    g.up = { class_type: "MinimaxH3LatentUpscaler3D", inputs: { model_name: "minimax_h3_latent_upscaler_3d_bf16.safetensors", mode: "target dimensions", "mode.width": fin.width, "mode.height": fin.height, align: 32, enable_temporal_chunking: true, force_unload: true, device: "cuda", precision: "fp16", latent: ["sep", 0] } };
    g.cat = { class_type: "LTXVConcatAVLatent", inputs: { video_latent: ["up", 0], audio_latent: ["sep", 1] } };
    g.s2 = { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } };
    g.guider2 = { class_type: "BasicGuider", inputs: { model, conditioning: ["cond", 0] } };
    g.sig2 = { class_type: "ManualSigmas", inputs: { sigmas: PASS2_SIGMAS[j.secondPassSteps] ?? PASS2_SIGMAS[3] } };
    g.samp2 = { class_type: "SamplerCustomAdvanced", inputs: { noise: ["noise", 0], guider: ["guider2", 0], sampler: ["s2", 0], sigmas: ["sig2", 0], latent_image: ["cat", 0] } };
    samples = ["samp2", 0];
  }
  let still;
  if (j.fizgig) {
    g.dec = { class_type: "FizgigH3StillDecode", inputs: { samples, vae: ["vaeV", 0] } };
    still = ["dec", 0];
  } else {
    g.dec = { class_type: "VAEDecode", inputs: { samples, vae: ["vaeV", 0] } };
    g.frame = { class_type: "ImageFromBatch", inputs: { batch_index: LENGTH, length: 1, image: ["dec", 0] } };
    still = ["frame", 0];
  }
  g.save = { class_type: "SaveImage", inputs: { filename_prefix: `${j.saveSubfolder}/${j.stem}_h3img`, images: still } };
  return { graph: g, save: "save" };
}

// src/editing/ops.ts
init_comfy();
var n = (v, d = 0) => typeof v === "number" ? v : parseFloat(String(v)) || d;
async function loadBitmap(a) {
  return createImageBitmap(await fetchBlob(a));
}
var newCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
var draw = (src) => {
  const c = newCanvas(src.width, src.height);
  c.getContext("2d", { willReadFrequently: true }).drawImage(src, 0, 0);
  return c;
};
var pixels = (c) => c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);
var put = (c, d) => {
  c.getContext("2d", { willReadFrequently: true }).putImageData(d, 0, 0);
  return c;
};
var clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
function canvasToBlob(c) {
  return new Promise((res, rej) => c.toBlob((b) => b ? res(b) : rej(new Error("PNG encode failed")), "image/png"));
}
async function canvasToAsset(c, port) {
  return assetFromFile(await uploadToInput(await canvasToBlob(c)), "image", port);
}
function filtered(src, filter) {
  const c = newCanvas(src.width, src.height);
  const ctx = c.getContext("2d");
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0);
  return c;
}
function convolve(c, kernel, div = 1) {
  const src = pixels(c);
  const out = new ImageData(c.width, c.height);
  const w = c.width, h = c.height;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    for (let ch = 0; ch < 3; ch++) {
      let acc = 0;
      for (let ky = -1; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++) {
        const yy = Math.min(h - 1, Math.max(0, y + ky)), xx = Math.min(w - 1, Math.max(0, x + kx));
        acc += src.data[(yy * w + xx) * 4 + ch] * kernel[(ky + 1) * 3 + kx + 1];
      }
      out.data[(y * w + x) * 4 + ch] = clamp(acc / div);
    }
    out.data[(y * w + x) * 4 + 3] = src.data[(y * w + x) * 4 + 3];
  }
  return put(newCanvas(w, h), out);
}
function applyOp(op, img, p) {
  const w = img.width, h = img.height;
  switch (op) {
    case "crop": {
      const x = Math.round(w * n(p.x) / 100), y = Math.round(h * n(p.y) / 100);
      const cw = Math.max(1, Math.min(w - x, Math.round(w * n(p.w, 100) / 100))), ch = Math.max(1, Math.min(h - y, Math.round(h * n(p.h, 100) / 100)));
      const c = newCanvas(cw, ch);
      c.getContext("2d").drawImage(img, x, y, cw, ch, 0, 0, cw, ch);
      return c;
    }
    case "resize": {
      let nw = w, nh = h;
      const mode = String(p.mode);
      if (mode === "scale") {
        nw = w * n(p.scale, 1);
        nh = h * n(p.scale, 1);
      } else if (mode === "fit width") {
        nw = n(p.width, w);
        nh = h * (nw / w);
      } else if (mode === "fit height") {
        nh = n(p.height, h);
        nw = w * (nh / h);
      } else {
        nw = n(p.width, w);
        nh = n(p.height, h);
      }
      const c = newCanvas(nw, nh);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return c;
    }
    case "blur":
      return filtered(img, `blur(${n(p.radius, 4)}px)`);
    case "hue-rotate":
      return filtered(img, `hue-rotate(${n(p.degrees, 30)}deg)`);
    case "grayscale":
      return filtered(img, `grayscale(${n(p.amount, 1)})`);
    case "invert":
      return filtered(img, "invert(1)");
    case "color-correct": {
      const c = filtered(img, `brightness(${n(p.brightness, 1)}) contrast(${n(p.contrast, 1)}) saturate(${n(p.saturation, 1)})`);
      const warm = n(p.temperature);
      if (warm) {
        const d = pixels(c);
        for (let i = 0; i < d.data.length; i += 4) {
          d.data[i] = clamp(d.data[i] + warm * 0.6);
          d.data[i + 2] = clamp(d.data[i + 2] - warm * 0.6);
        }
        put(c, d);
      }
      return c;
    }
    case "levels": {
      const c = draw(img);
      const d = pixels(c);
      const b = n(p.black), wt = Math.max(b + 1, n(p.white, 255)), g = 1 / Math.max(0.01, n(p.gamma, 1));
      const lut = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) lut[i] = clamp(255 * Math.pow(Math.min(1, Math.max(0, (i - b) / (wt - b))), g));
      for (let i = 0; i < d.data.length; i += 4) {
        d.data[i] = lut[d.data[i]];
        d.data[i + 1] = lut[d.data[i + 1]];
        d.data[i + 2] = lut[d.data[i + 2]];
      }
      return put(c, d);
    }
    case "rotate-flip": {
      const r = n(p.rotate) % 360;
      const swap = r === 90 || r === 270;
      const c = newCanvas(swap ? h : w, swap ? w : h);
      const ctx = c.getContext("2d");
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(r * Math.PI / 180);
      ctx.scale(p.flip_h ? -1 : 1, p.flip_v ? -1 : 1);
      ctx.drawImage(img, -w / 2, -h / 2);
      return c;
    }
    case "sharpen": {
      const a = n(p.amount, 0.8);
      return convolve(draw(img), [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0]);
    }
    case "threshold": {
      const c = draw(img);
      const d = pixels(c);
      const lv = n(p.level, 128);
      for (let i = 0; i < d.data.length; i += 4) {
        const y = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
        const v = y >= lv ? 255 : 0;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      }
      return put(c, d);
    }
    case "posterize": {
      const c = draw(img);
      const d = pixels(c);
      const lv = Math.max(2, n(p.levels, 6));
      const step = 255 / (lv - 1);
      for (let i = 0; i < d.data.length; i += 4) for (let k = 0; k < 3; k++) d.data[i + k] = Math.round(Math.round(d.data[i + k] / step) * step);
      return put(c, d);
    }
    case "vignette": {
      const c = draw(img);
      const ctx = c.getContext("2d");
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (1 - n(p.softness, 0.6)) * 0.5, w / 2, h / 2, Math.hypot(w, h) / 2);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${n(p.strength, 0.5)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      return c;
    }
    case "pixelate": {
      const s = Math.max(2, n(p.size, 12));
      const small = newCanvas(w / s, h / s);
      const sc = small.getContext("2d");
      sc.imageSmoothingEnabled = true;
      sc.drawImage(img, 0, 0, small.width, small.height);
      const c = newCanvas(w, h);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, w, h);
      return c;
    }
    default:
      throw new Error(`Unknown edit op ${op}`);
  }
}
function channelOp(img, channel) {
  const c = draw(img);
  const d = pixels(c);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = channel === "red" ? d.data[i] : channel === "green" ? d.data[i + 1] : channel === "blue" ? d.data[i + 2] : channel === "alpha" ? d.data[i + 3] : 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  put(c, d);
  return { image: c, mask: draw(c) };
}
var BLEND = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
  difference: "difference",
  "soft-light": "soft-light"
};
function blendOp(base2, top, mask, p) {
  const c = newCanvas(base2.width, base2.height);
  const ctx = c.getContext("2d");
  ctx.drawImage(base2, 0, 0);
  const layer = newCanvas(base2.width, base2.height);
  const lc = layer.getContext("2d");
  lc.drawImage(top, 0, 0, layer.width, layer.height);
  if (mask) {
    const m = newCanvas(base2.width, base2.height);
    const mc = m.getContext("2d", { willReadFrequently: true });
    mc.drawImage(mask, 0, 0, m.width, m.height);
    const md = mc.getImageData(0, 0, m.width, m.height);
    for (let i = 0; i < md.data.length; i += 4) {
      md.data[i + 3] = md.data[i];
    }
    mc.putImageData(md, 0, 0);
    lc.globalCompositeOperation = "destination-in";
    lc.drawImage(m, 0, 0);
  }
  ctx.globalAlpha = n(p.opacity, 1);
  ctx.globalCompositeOperation = BLEND[String(p.mode)] ?? "source-over";
  ctx.drawImage(layer, 0, 0);
  return c;
}
function maskGrow(img, amount, feather) {
  let c = draw(img);
  const steps = Math.abs(Math.round(amount));
  if (steps) {
    const radius = Math.max(1, steps);
    const b = filtered(c, `blur(${radius}px)`);
    const d = pixels(b);
    const cut = amount > 0 ? 8 : 247;
    for (let i = 0; i < d.data.length; i += 4) {
      const v = d.data[i] > cut ? 255 : 0;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    c = put(b, d);
  }
  if (feather > 0) c = filtered(c, `blur(${feather}px)`);
  return c;
}
function invertMask(img) {
  return filtered(img, "invert(1)");
}
function palette(img, count) {
  const s = 96, c = newCanvas(s, Math.max(1, Math.round(s * img.height / img.width)));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const bins = /* @__PURE__ */ new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 16) continue;
    const key = d[i] >> 4 << 8 | d[i + 1] >> 4 << 4 | d[i + 2] >> 4;
    const e = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++;
    e.r += d[i];
    e.g += d[i + 1];
    e.b += d[i + 2];
    bins.set(key, e);
  }
  const hex = (v) => Math.round(v).toString(16).padStart(2, "0");
  return [...bins.values()].sort((a, b) => b.n - a.n).slice(0, count).map((e) => `#${hex(e.r / e.n)}${hex(e.g / e.n)}${hex(e.b / e.n)}`);
}
async function videoFrame(a, positionPct) {
  const blob = await fetchBlob(a);
  const url2 = URL.createObjectURL(blob);
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "auto";
    v.src = url2;
    await new Promise((res, rej) => {
      v.onloadedmetadata = () => res();
      v.onerror = () => rej(new Error("cannot read video"));
    });
    v.currentTime = Math.max(0, (v.duration || 0) * (positionPct / 100) - (positionPct >= 100 ? 0.05 : 0));
    await new Promise((res) => {
      v.onseeked = () => res();
    });
    const c = newCanvas(v.videoWidth, v.videoHeight);
    c.getContext("2d").drawImage(v, 0, 0);
    return c;
  } finally {
    URL.revokeObjectURL(url2);
  }
}

// src/backend/itda.ts
init_http();
init_comfy();
var PROJECT = "canvers";
async function itdaUpload(a) {
  const blob = await fetchBlob(a);
  const ext = a.type === "audio" ? "flac" : "mp4";
  const fd = new FormData();
  fd.append("project", PROJECT);
  fd.append("files", blob, `canvers_${a.id}.${ext}`);
  const r = await fetch(url("/itda_studio_one/api/media/upload"), { method: "POST", body: fd });
  const j = await r.json();
  const p = j.items?.[0];
  if (!r.ok || !p) throw new Error("ITDA could not take the file (is ITDA ONE STUDIO installed?)");
  return p;
}
var sceneDetect = (path2, threshold, fps = 24) => postJson("/itda_studio_one/api/scene_detect", { project: PROJECT, path: path2, fps, threshold });
var beatDetect = (path2, fps = 24) => postJson("/itda_studio_one/api/beat_detect", { project: PROJECT, path: path2, fps });
var itdaProbe = (path2) => postJson("/itda_studio_one/api/probe", { project: PROJECT, path: path2 });
var itdaFileUrl = (path2) => url(`/itda_studio_one/api/file?project=${PROJECT}&path=${encodeURIComponent(path2)}`);
async function bridgeClip(pathA, pathB, mode, numFrames) {
  const meta = (await itdaProbe(pathA)).meta;
  const frameA = Math.max(0, (meta?.total_frames ?? 1) - 1);
  return postJson("/itda_studio_one/api/stitch_bridge", { project: PROJECT, path_a: pathA, path_b: pathB, frame_a: frameA, frame_b: 0, fps: meta?.fps ?? 24, mode, num_frames: numFrames });
}

// src/backend/ltxRefine.ts
async function buildRefineGraph(j) {
  const r = await resolveLtxModels(j.models);
  const m = { ltx_unet: r.unet, ltx_clip: r.clip, ltx_vae_video: r.vaeVideo, ltx_vae_audio: r.vaeAudio, ltx_upscaler: r.upscaler };
  const miss = [["LTX unet", m.ltx_unet], ["text encoder", m.ltx_clip], ["video VAE", m.ltx_vae_video], ["audio VAE", m.ltx_vae_audio], ["latent upscaler", m.ltx_upscaler]].filter(([, v]) => !v || v === "none").map(([k]) => k);
  if (miss.length) throw new Error(`Pick the LTX 2.5 ${miss.join(", ")} in Settings \u2192 Video models.`);
  for (const n2 of ["LTXVLatentUpsampler", "LTXVImgToVideoInplace", "LTXVAudioVAEEncode", "LTXVDualCFGGuider"]) if (!await hasNode(n2)) throw new Error(`${n2} is not installed (needs the LTX 2.5 nodes).`);
  const g = {};
  await addVideoLoad(g, j.file, "load");
  const gguf = (s) => s.toLowerCase().endsWith(".gguf");
  g.unet = gguf(m.ltx_unet) ? { class_type: "UnetLoaderGGUF", inputs: { unet_name: m.ltx_unet } } : { class_type: "UNETLoader", inputs: { unet_name: m.ltx_unet, weight_dtype: "default" } };
  let model = ["unet", 0];
  g.clip = gguf(m.ltx_clip) ? { class_type: "TJ_LTX25ClipLoaderGGUF", inputs: { clip_name: m.ltx_clip } } : { class_type: "CLIPLoader", inputs: { clip_name: m.ltx_clip, type: "ltxv", device: "default" } };
  g.vaeV = { class_type: "VAELoader", inputs: { vae_name: m.ltx_vae_video } };
  g.vaeA = { class_type: "VAELoader", inputs: { vae_name: m.ltx_vae_audio } };
  g.upm = { class_type: "LatentUpscaleModelLoader", inputs: { model_name: m.ltx_upscaler } };
  j.loras.forEach((l, i) => {
    if (l.name && l.name !== "none" && l.strength > 0) {
      g[`lora${i}`] = { class_type: "LoraLoaderModelOnly", inputs: { model, lora_name: l.name, strength_model: l.strength } };
      model = [`lora${i}`, 0];
    }
  });
  if (await hasNode("ModelAttentionBackend")) {
    g.ck = { class_type: "ModelAttentionBackend", inputs: { model, attention: "comfy kitchen attention" } };
    model = ["ck", 0];
  }
  g.pos = { class_type: "CLIPTextEncode", inputs: { text: j.prompt, clip: ["clip", 0] } };
  g.neg = { class_type: "CLIPTextEncode", inputs: { text: j.negative, clip: ["clip", 0] } };
  g.cond = { class_type: "LTXVConditioning", inputs: { frame_rate: FPS, positive: ["pos", 0], negative: ["neg", 0] } };
  g.guider = { class_type: "LTXVDualCFGGuider", inputs: { video_cfg: 1, audio_cfg: 1, model, positive: ["cond", 0], negative: ["cond", 1] } };
  g.enc = { class_type: "VAEEncode", inputs: { pixels: ["load", 0], vae: ["vaeV", 0] } };
  g.ups = { class_type: "LTXVLatentUpsampler", inputs: { samples: ["enc", 0], upscale_model: ["upm", 0], vae: ["vaeV", 0] } };
  g.first = { class_type: "ImageFromBatch", inputs: { image: ["load", 0], batch_index: 0, length: 1 } };
  g.i2v = { class_type: "LTXVImgToVideoInplace", inputs: { strength: 1, bypass: false, vae: ["vaeV", 0], image: ["first", 0], latent: ["ups", 0] } };
  g.aenc = { class_type: "LTXVAudioVAEEncode", inputs: { audio: ["load", 2], audio_vae: ["vaeA", 0] } };
  g.cat = { class_type: "LTXVConcatAVLatent", inputs: { video_latent: ["i2v", 0], audio_latent: ["aenc", 0] } };
  g.noise = { class_type: "RandomNoise", inputs: { noise_seed: j.seed } };
  g.sel = { class_type: "KSamplerSelect", inputs: { sampler_name: j.sampler } };
  g.sched = { class_type: "BasicScheduler", inputs: { model, scheduler: j.scheduler, steps: j.steps, denoise: j.denoise } };
  g.samp = { class_type: "SamplerCustomAdvanced", inputs: { noise: ["noise", 0], guider: ["guider", 0], sampler: ["sel", 0], sigmas: ["sched", 0], latent_image: ["cat", 0] } };
  g.sep = { class_type: "LTXVSeparateAVLatent", inputs: { av_latent: ["samp", 0] } };
  g.decV = { class_type: "VAEDecodeTiled", inputs: { tile_size: 512, overlap: 64, temporal_size: 4096, temporal_overlap: 32, samples: ["sep", 0], vae: ["vaeV", 0] } };
  g.decA = { class_type: "LTXVAudioVAEDecode", inputs: { samples: ["sep", 1], audio_vae: ["vaeA", 0] } };
  const save = await addVideoSave(g, ["decV", 0], ["decA", 0], FPS, `${j.saveSubfolder}/${j.stem}_LTXUP`, "R");
  return { graph: g, save };
}

// src/backend/faceRefine.ts
init_http();
async function buildFaceRefineGraph(job) {
  const g = {};
  for (const [n2, why] of [["H3FaceTrackCrop", "Face tracking"], ["H3InjectVideoLatent", "Face re-generation"], ["H3PerFrameDenoise", "Per-frame denoise"], ["H3FaceStitch", "Face stitch"]])
    if (!await hasNode(n2)) throw new Error(`${why} needs the ${n2} node \u2014 install ComfyUI-H3-FaceRefine.`);
  if (!job.detector || job.detector === "none") throw new Error("Pick a face detector on the Face Refine card (models/ultralytics/bbox/*.pt)");
  const manual = job.select === "manual";
  if (manual && !job.confirmedPick.trim()) throw new Error('Select = manual: press "Pick faces" on the card first');
  const avail = await h3Availability();
  const has = (n2) => !!avail[n2];
  const m = await resolveH3Models(job.models, "reference");
  if (!m.unet || !m.clip || !m.vaeVideo || !m.vaeAudio) throw new Error("Pick the MiniMax H3 reference model, text encoder and VAEs in Settings \u2192 Video models.");
  const cut = job.cutDetection ? "auto (pyscenedetect)" : "none";
  let images, audio, facePick = null;
  if (manual && await hasNode("H3FaceSelect")) {
    g.sel = { class_type: "H3FaceSelect", inputs: { video: job.file, detector: job.detector, confidence: job.confidence, select: "manual", select_index: 0, confirmed_pick: job.confirmedPick, cut_detection: cut, cut_threshold: job.cutThreshold, skip_first_frames: 0, frame_load_cap: 0, select_every_nth: 1 } };
    images = ["sel", 0];
    audio = ["sel", 1];
    facePick = ["sel", 2];
  } else {
    await addVideoLoad(g, job.file, "load");
    images = ["load", 0];
    audio = ["load", 2];
  }
  const track = {
    images,
    detector: job.detector,
    confidence: job.confidence,
    crop_factor: job.cropFactor,
    canvas_width: job.canvasW,
    canvas_height: job.canvasH,
    canvas_mode: job.canvasMode,
    smooth_window: job.smooth,
    size_smooth_window: 51,
    smooth_method: "gaussian",
    size_mode: "per_frame",
    identity_track: job.identityTrack,
    identity_threshold: job.identityThreshold,
    fallback_detector: job.fallback || "none",
    identity_model: job.identityModel
  };
  if (facePick) track.face_pick = facePick;
  else {
    track.select = manual ? "largest_face" : job.select;
    track.cut_detection = cut;
    track.cut_threshold = job.cutThreshold;
  }
  g.track = { class_type: "H3FaceTrackCrop", inputs: track };
  const turbo = effectiveTurbo(job.opt, has);
  g.unet = m.unet.toLowerCase().endsWith(".gguf") ? { class_type: "UnetLoaderGGUF", inputs: { unet_name: m.unet } } : { class_type: "UNETLoader", inputs: { unet_name: m.unet, weight_dtype: "default" } };
  const model = h3ModelChain(g, ["unet", 0], { ...job.opt, hires: false }, turbo, job.loras, has);
  g.clip = { class_type: "CLIPLoader", inputs: { clip_name: m.clip, type: "minimax", device: "default" } };
  g.vaeV = { class_type: "VAELoader", inputs: { vae_name: m.vaeVideo } };
  g.vaeA = { class_type: "VAELoader", inputs: { vae_name: m.vaeAudio } };
  const cond = { clip: ["clip", 0], vae: ["vaeV", 0], audio_vae: ["vaeA", 0], prompt: job.prompt.trim(), width: ["track", 4], height: ["track", 5], length: ["track", 6], ref_image_size: "match" };
  job.refs.slice(0, 9).forEach((f, i) => {
    g[`ref${i}`] = { class_type: "LoadImage", inputs: { image: f } };
    cond[`ref_images.ref_image_${i}`] = [`ref${i}`, 0];
  });
  g.cond = { class_type: "MiniMaxH3ReferenceToVideo", inputs: cond };
  g.inject = { class_type: "H3InjectVideoLatent", inputs: { av_latent: ["cond", 1], images: ["track", 0], vae: ["vaeV", 0] } };
  if (!has("TJ_H3_AudioLock")) throw new Error("Face Refine keeps the original sound with the TJ_H3_AudioLock node (ComfyUI-TJ_NODE) \u2014 it is not installed.");
  g.lock = { class_type: "TJ_H3_AudioLock", inputs: { av_latent: ["inject", 0], audio, audio_vae: ["vaeA", 0], mode: "lock", strength: 0.5, fit: "pad_silence", get_name_av_latent: "(none)", get_name_audio: "(none)", get_name_audio_vae: "(none)", auto_set: false } };
  g.den = { class_type: "H3PerFrameDenoise", inputs: { model, av_latent: ["lock", 0], transform: ["track", 1], denoise_multiplier_small_face: job.mulSmall, denoise_multiplier_large_face: job.mulLarge, scale_mode: "absolute_px", face_px_small: job.pxSmall, face_px_large: job.pxLarge, gamma: 1, smooth_frames: 9 } };
  const dm = ["den", 2];
  const steps = turbo === "none" ? Math.max(1, Math.round(job.steps)) : Math.max(1, Math.round(job.opt.turboSteps));
  g.noise = { class_type: "RandomNoise", inputs: { noise_seed: job.seed } };
  g.samp0 = turbo === "larryvrh" && has("MiniMaxH3TurboSampler") ? { class_type: "MiniMaxH3TurboSampler", inputs: {} } : { class_type: "KSamplerSelect", inputs: { sampler_name: turbo === "pdd" ? "euler" : job.sampler } };
  g.sched = { class_type: "BasicScheduler", inputs: { model: dm, scheduler: job.scheduler, steps, denoise: job.denoise } };
  let condLink = ["cond", 0];
  if (has("TJ_FreeTextEncoderVRAM")) {
    g.free = { class_type: "TJ_FreeTextEncoderVRAM", inputs: { clip: ["clip", 0], trigger: condLink } };
    condLink = ["free", 0];
  }
  g.guider = { class_type: "BasicGuider", inputs: { model: dm, conditioning: condLink } };
  g.samp = { class_type: "SamplerCustomAdvanced", inputs: { noise: ["noise", 0], guider: ["guider", 0], sampler: ["samp0", 0], sigmas: ["sched", 0], latent_image: ["den", 0] } };
  g.dec = { class_type: "VAEDecode", inputs: { samples: ["samp", 0], vae: ["vaeV", 0] } };
  g.stitch = { class_type: "H3FaceStitch", inputs: { base_images: images, refined_crops: ["dec", 0], transform: ["track", 1], paste_region: job.paste, mask_dilation: 16, feather: job.feather, colour_match: job.colour, blend: job.blend, undetected_frames: job.undetected } };
  const save = await addVideoSave(g, ["stitch", 0], ["lock", 1], FPS, `${job.saveSubfolder}/${job.stem}_FACEREFINE`, "F");
  return { graph: g, save };
}

// src/backend/assetlib.ts
init_http();
var BASE = "/tj_node/reflib";
var libFile = (id) => url(`${BASE}/file/${id}`);
async function listAssets(q = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) p.set(k, v);
  p.set("limit", "500");
  const r = await getJson(`${BASE}/assets?${p}`);
  return r.assets ?? [];
}
var resolveRefs = (mode, project, assets, prompt = "") => postJson(`${BASE}/resolve`, { mode, project: project ? Number(project) : void 0, assets: assets.map(Number), prompt });

// src/engine/more.ts
init_settings();
init_comfy();
var parse = (a) => {
  try {
    return a?.text ? JSON.parse(a.text) : null;
  } catch {
    return null;
  }
};
var real4 = (l) => !!l.name && l.name !== "none" && l.strength !== 0;
function cardLoras(c) {
  return c.inputs("loras").flatMap((a) => parse(a)?.items ?? []).filter(real4);
}
function h3Cards(c) {
  const out = {};
  for (const a of c.inputs("cards")) {
    const j = parse(a);
    if (j?.kind === "turbo") out.turbo = j;
    else if (j?.kind === "speed") out.speed = j;
    else if (j?.kind === "lock") out.lock = j;
  }
  return out;
}
function optFromCards(cards) {
  const t = cards.turbo, s = cards.speed;
  return {
    ...DEFAULT_OPT,
    ...s ? { attnBackend: s.attn_backend, attnForward: s.attn_forward, optimizer: s.optimizer, blockCache: s.block_cache, spectrum: !!s.spectrum, fusedModulation: !!s.fused_mod, shiftVideo: s.shift_video, shiftAudio: s.shift_audio } : {},
    ...t ? { turbo: t.turbo, turboLora: t.turbo_lora, turboStrength: t.turbo_strength, turboSteps: t.turbo_steps, hires: !!t.hires, hiresStartMp: t.hires_start_mp, hiresFinalMp: t.hires_final_mp } : {}
  };
}
async function asOutputClip(a, c) {
  if (a.file?.type === "output") return { filename: a.file.filename, subfolder: a.file.subfolder };
  const g = {};
  await addVideoLoad(g, await ensureInput(a), "L");
  const save = await addVideoSave(g, ["L", 0], ["L", 2], 24, `${useSettings.getState().saveSubfolder}/stitch_src`, "T");
  const r = await runPrompt(g, { signal: c.signal });
  const f = outFile(r.raw, save);
  return { filename: f.filename, subfolder: f.subfolder };
}
async function videoSize(url2) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const done = (w = 1280, h = 720) => {
      v.removeAttribute("src");
      resolve({ w: w || 1280, h: h || 720 });
    };
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight);
    v.onerror = () => done();
    setTimeout(() => done(), 6e3);
    v.src = url2;
  });
}
async function videoFps(url2) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    if (!v.requestVideoFrameCallback) return resolve(null);
    const times = [];
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      v.pause();
      v.removeAttribute("src");
      const d = times.slice(1).map((t, i) => t - times[i]).filter((x) => x > 1e-3);
      if (d.length < 3) return resolve(null);
      d.sort((a, b) => a - b);
      const med = d[Math.floor(d.length / 2)];
      const fps = 1 / med;
      const common2 = [8, 12, 15, 16, 20, 24, 25, 30, 48, 50, 60];
      const near = common2.find((c) => Math.abs(c - fps) < 0.6);
      resolve(near ?? Math.round(fps * 100) / 100);
    };
    const tick = (_, m) => {
      times.push(m.mediaTime);
      if (times.length >= 14) finish();
      else v.requestVideoFrameCallback(tick);
    };
    v.muted = true;
    v.playsInline = true;
    v.onerror = () => finish();
    v.onloadeddata = () => {
      v.requestVideoFrameCallback(tick);
      void v.play().catch(finish);
    };
    setTimeout(finish, 5e3);
    v.src = url2;
  });
}
var outFile = (raw, node) => {
  const o = raw[node] ?? {};
  const f = (o.gifs ?? o.images ?? o.videos ?? [])[0];
  if (!f) throw new Error("ComfyUI returned no file");
  return { filename: f.filename, subfolder: f.subfolder ?? "", type: f.type ?? "output" };
};
var rtxOf = (p, pre) => ({
  mode: str(p[`${pre}mode`], "scale"),
  scale: num2(p[`${pre}scale`], 2),
  short: num2(p[`${pre}short`], 1080),
  long: num2(p[`${pre}long`], 1920),
  w: num2(p[`${pre}w`], 1920),
  h: num2(p[`${pre}h`], 1080),
  anchor: str(p[`${pre}anchor`], "center"),
  quality: str(p[`${pre}quality`], "ULTRA")
});
function post(stepOf) {
  return async (c) => {
    const v = need(c.inputs("video")[0], "Video");
    c.progress(2, "uploading video\u2026");
    const file = await ensureInput(v);
    const size = await videoSize(v.url);
    const step = stepOf(c, size);
    const fps = num2(c.p.fps, 0) > 0 ? num2(c.p.fps, 24) : await videoFps(v.url) ?? 24;
    const g = await buildPostGraph({ fps, cap: Math.max(0, Math.round(num2(c.p.preview_frames, 0))), file, step, folder: useSettings.getState().saveSubfolder, stem: "canvers" });
    const res = await runPrompt(g.graph, { onProgress: c.progress, signal: c.signal });
    return [assetFromFile(outFile(res.raw, g.save), "video", "video")];
  };
}
var withLegacySeed = (c) => {
  const si = c.inputs("seed_in")[0];
  const sv = si ? num2(si.text, -1) : num2(c.p.seed, -1);
  return sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv;
};
var EXTRA_RUNNERS = {
  // ---------------- cards
  "lora-card": async (c) => {
    const upstream2 = c.inputs("lora_in").flatMap((a) => parse(a)?.items ?? []);
    const mine = { name: str(c.p.lora, "none"), strength: num2(c.p.strength, 1) };
    return [textAsset(JSON.stringify({ kind: "lora", items: [...upstream2, ...real4(mine) ? [mine] : []] }), "lora")];
  },
  "h3-turbo": async (c) => [textAsset(JSON.stringify({ kind: "turbo", ...c.p }), "card")],
  "h3-speed": async (c) => [textAsset(JSON.stringify({ kind: "speed", ...c.p }), "card")],
  "h3-audiolock": async (c) => {
    const a = need(c.inputs("audio")[0], "Audio");
    return [textAsset(JSON.stringify({ kind: "lock", file: await ensureInput(a), mode: str(c.p.lock_mode, "lock"), strength: num2(c.p.lock_strength, 0.5), fit: str(c.p.lock_fit, "pad_silence") }), "card")];
  },
  "asset-library": async (c) => {
    const project = str(c.p.project).trim();
    const ids = str(c.p.ids).split(/[,\s]+/).filter(Boolean);
    if (!project && !ids.length) throw new Error("Pick assets or a project on the Asset Library card first");
    const r = await resolveRefs(project ? "project" : "assets", project || void 0, ids);
    if (r.errors?.length) throw new Error(r.errors.map((e) => e.message).join("; "));
    const all = await listAssets().catch(() => []);
    const byId2 = new Map(all.map((a) => [String(a.id), a]));
    const attached = r.attached ?? ids.map((id) => ({ id: Number(id), kind: byId2.get(id)?.kind ?? "image", name: byId2.get(id)?.name ?? id, label: "", mention: null }));
    const images = attached.filter((a) => a.kind === "image" || a.kind === "set").map((a) => ({ id: uid(), type: "image", url: libFile(a.id), port: "image", meta: { assetId: a.id, name: a.name } }));
    const mentions = attached.map((a) => `@${a.mention || a.alias || a.id}`).join(" ");
    const sel2 = project ? { project, ids: attached.map((a) => String(a.id)) } : { ids: attached.map((a) => String(a.id)) };
    return [...images, textAsset(mentions, "mentions"), textAsset(JSON.stringify({ kind: "assetlib", ...sel2 }), "assets")];
  },
  // ---------------- postprocess steps
  "pp-deblur": post((c) => ({ kind: "deblur", strength: str(c.p.strength, "MEDIUM") })),
  "pp-denoise": post((c) => ({ kind: "denoise", strength: str(c.p.strength, "MEDIUM") })),
  "pp-upscale": post((c, s) => {
    const p = c.p;
    const method = c.engineId ?? "flashvsr";
    return {
      kind: "upscale",
      method,
      srcW: s.w,
      srcH: s.h,
      flashvsr: { model: str(p.fv_model, "FlashVSR-v1.1"), mode: str(p.fv_mode, "tiny"), scale: num2(p.fv_scale, 2), colorFix: p.fv_color !== false, tileSize: num2(p.fv_tile, 384), tileOverlap: num2(p.fv_overlap, 32), seed: num2(p.fv_seed, 42) },
      rtx: rtxOf(p, "rtx_"),
      modelName: str(p.model_name, "none"),
      twoPass: !!p.two_pass,
      pass2: rtxOf(p, "p2_")
    };
  }),
  "pp-skin": post((c) => ({ kind: "skin", evenness: num2(c.p.evenness), smoothing: num2(c.p.smoothing), redness: num2(c.p.redness), shine: num2(c.p.shine), blemish: str(c.p.blemish, "off"), preserveMarks: c.p.preserve !== false, microtexture: num2(c.p.microtexture) })),
  "pp-grain": post((c) => ({ kind: "grain", amount: num2(c.p.amount, 0.25), size: num2(c.p.size, 1), color: num2(c.p.color), lumBias: num2(c.p.lum_bias), noise: str(c.p.noise, "smooth") })),
  "pp-interpolate": post((c) => ({ kind: "interpolate", targetFps: num2(c.p.target_fps, 48), scale: num2(c.p.scale, 1), modelName: str(c.p.model_name, "flownet.pkl"), batchSize: num2(c.p.batch, 8), fp16: c.p.fp16 !== false })),
  "pp-resize": post((c) => ({ kind: "resize", mode: str(c.p.mode, "Long side"), method: str(c.p.method, "lanczos"), targetPx: num2(c.p.target_px, 1920), ratioW: num2(c.p.ratio_w, 16), ratioH: num2(c.p.ratio_h, 9), megapixels: num2(c.p.megapixels, 1), width: num2(c.p.width, 1280), height: num2(c.p.height, 720), crop: str(c.p.crop, "crop") })),
  // ---------------- H3 still image
  "h3-image": async (c) => {
    const p = c.p;
    const s = useSettings.getState();
    const refs = [];
    for (const a of c.inputs("image").slice(0, 9)) refs.push(await ensureInput(a));
    const g = await buildH3ImageGraph({
      refs,
      prompt: c.text("prompt"),
      aspect: str(p.aspect, "1:1"),
      previewMp: num2(p.preview_mp, 0.5),
      finalMp: num2(p.final_mp, 1.5),
      final: p.final !== false,
      steps: num2(p.steps, 20),
      secondPassSteps: num2(p.pass2, 3),
      fizgig: !!p.fizgig,
      refImageSize: str(p.ref_size, "max"),
      opt: optFromCards(h3Cards(c)),
      loras: cardLoras(c),
      seed: withLegacySeed(c),
      models: s.video,
      saveSubfolder: s.saveSubfolder,
      stem: "MMH3"
    });
    const res = await runPrompt(g.graph, { onProgress: c.progress, signal: c.signal });
    return [assetFromFile(outFile(res.raw, g.save), "image", "image")];
  },
  // ---------------- LTX Director (timeline)
  "ltx-director": async (c) => {
    const p = c.p;
    const s = useSettings.getState();
    const imgs = c.inputs("image");
    const times = str(p.image_times, "0").split(/[,\s]+/).filter(Boolean).map(Number);
    const files = [];
    for (const a of imgs) files.push(await ensureInput(a));
    const beats = str(p.beats).split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const m = /^\s*([\d.]+)\s*[-–~]\s*([\d.]+)\s*[:：]\s*(.+)$/.exec(l);
      if (!m) throw new Error(`Beat ${i + 1}: write it as  start-end: prompt  (for example  0-4: a man walks in)`);
      return { startSec: Number(m[1]), endSec: Number(m[2]), prompt: m[3].trim() };
    });
    let size;
    if (imgs[0] && str(p.aspect) === "auto") {
      const bm = await loadBitmap(imgs[0]);
      size = ltxSize(`${bm.width}:${bm.height}`, num2(p.megapixels, 1));
    }
    const seconds = num2(p.seconds, 8);
    const aud = c.inputs("audio")[0], mot = c.inputs("video")[0];
    const audio = aud ? { file: await ensureInput(aud), startSec: num2(p.audio_start, 0) } : void 0;
    const motion = mot ? { file: await ensureInput(mot), startSec: num2(p.motion_start, 0), strength: num2(p.motion_strength, 1) } : void 0;
    const graph = await buildLtxGraph({
      prompt: c.text("prompt"),
      seconds,
      aspect: str(p.aspect, "16:9"),
      megapixels: num2(p.megapixels, 1),
      seed: withLegacySeed(c),
      steps: num2(p.steps, 12),
      cfg: num2(p.cfg, 1),
      sampler: str(p.sampler, "euler_ancestral"),
      scheduler: str(p.scheduler, "linear_quadratic"),
      stage2Sigmas: str(p.stage2, "0.85, 0.7250, 0.4219, 0.0"),
      loras: cardLoras(c),
      models: s.video,
      saveSubfolder: s.saveSubfolder,
      size,
      timeline: { texts: beats, images: files.map((file, i) => ({ file, startSec: i === files.length - 1 && p.last_at_end ? seconds : times[i] ?? 0, end: i === files.length - 1 && !!p.last_at_end })), audio, motion }
    });
    const res = await runPrompt(graph, { onProgress: c.progress, signal: c.signal });
    const f = res.videos[0] ?? res.images[0];
    if (!f) throw new Error("ComfyUI returned no video");
    return [assetFromFile(f, "video", "video")];
  },
  // ---------------- Video edit (LTX 2.5 refine) and stitch
  "video-refine": async (c) => {
    const p = c.p;
    const s = useSettings.getState();
    const v = need(c.inputs("video")[0], "Video");
    c.progress(2, "uploading video\u2026");
    const g = await buildRefineGraph({ file: await ensureInput(v), prompt: c.text("prompt"), negative: str(p.negative, "bad anatomy, inconsistent look, low resolution,"), steps: num2(p.steps, 4), denoise: num2(p.denoise, 0.15), sampler: str(p.sampler, "euler_ancestral"), scheduler: str(p.scheduler, "simple"), seed: withLegacySeed(c), loras: cardLoras(c), models: s.video, saveSubfolder: s.saveSubfolder, stem: "MMH3" });
    const res = await runPrompt(g.graph, { onProgress: c.progress, signal: c.signal });
    return [assetFromFile(outFile(res.raw, g.save), "video", "video")];
  },
  "video-stitch": async (c) => {
    const vids = c.inputs("videos");
    if (vids.length < 2) throw new Error("Connect at least two videos to stitch");
    const s = useSettings.getState();
    const clips = [];
    for (let i = 0; i < vids.length; i++) {
      c.progress(Math.round(i / vids.length * 40), `preparing clip ${i + 1}\u2026`);
      clips.push(await asOutputClip(vids[i], c));
    }
    c.progress(60, "stitching\u2026");
    const ov = num2(c.p.overlap, 0);
    const st = await stitchClips(clips, `${s.saveSubfolder}/stitch`, ov > 0 ? ov : void 0);
    if (!st.ok || !st.filename) throw new Error(`stitch failed: ${st.error ?? "unknown"}`);
    return [assetFromFile({ filename: st.filename, subfolder: st.subfolder ?? "", type: "output" }, "video", "video")];
  },
  "video-audio": async (c) => {
    const v = need(c.inputs("video")[0], "Video");
    const a = need(c.inputs("audio")[0], "Audio");
    const s = useSettings.getState();
    c.progress(10, "preparing\u2026");
    const clip2 = await asOutputClip(v, c);
    const audioFile = await ensureInput(a);
    c.progress(50, "mixing\u2026");
    const st = await stitchClips([clip2], `${s.saveSubfolder}/withaudio`, void 0, { filename: audioFile, type: "input", start: num2(c.p.start, 0) });
    if (!st.ok || !st.filename) throw new Error(`could not add the audio: ${st.error ?? "unknown"}`);
    return [assetFromFile({ filename: st.filename, subfolder: st.subfolder ?? "", type: "output" }, "video", "video")];
  },
  // ---------------- ITDA analysis
  "scene-detect": async (c) => {
    const v = need(c.inputs("video")[0], "Video");
    c.progress(10, "uploading\u2026");
    const r = await sceneDetect(await itdaUpload(v), num2(c.p.threshold, 0.3));
    if (!r.ok) throw new Error(r.error ?? "scene detection failed");
    const secs = (r.frames ?? []).map((f) => +(f / 24).toFixed(2));
    return [textAsset(secs.length ? `cuts at (s): ${secs.join(", ")}
frames: ${(r.frames ?? []).join(", ")}` : "no cuts found")];
  },
  "beat-detect": async (c) => {
    const a = c.inputs("media")[0];
    if (!a) throw new Error("Media is not connected");
    c.progress(10, "uploading\u2026");
    const r = await beatDetect(await itdaUpload(a));
    if (!r.ok) throw new Error(r.error ?? "beat detection failed");
    const secs = (r.frames ?? []).map((f) => +(f / 24).toFixed(2));
    return [textAsset(`BPM ${r.bpm ?? "?"}
beats at (s): ${secs.join(", ")}`)];
  },
  "video-bridge": async (c) => {
    const a = need(c.inputs("a")[0], "Clip A (before)");
    const b = need(c.inputs("b")[0], "Clip B (after)");
    c.progress(10, "uploading\u2026");
    const pa = await itdaUpload(a);
    const pb = await itdaUpload(b);
    c.progress(50, "building the transition\u2026");
    const r = await bridgeClip(pa, pb, str(c.p.mode, "interpolate"), num2(c.p.frames, 8));
    if (!r.ok || !r.path) throw new Error(r.error ?? "could not build the transition");
    return [{ id: uid(), type: "video", url: itdaFileUrl(r.path), port: "video" }];
  },
  // ---------------- Face Refine
  "face-refine": async (c) => {
    const p = c.p;
    const s = useSettings.getState();
    const v = need(c.inputs("video")[0], "Video");
    c.progress(2, "uploading video\u2026");
    const file = await ensureInput(v);
    const refs = [];
    for (const a of c.inputs("image").slice(0, 9)) refs.push(await ensureInput(a));
    const cards = h3Cards(c);
    const seed2 = withLegacySeed(c);
    const picks = str(p.picks).split(",").map((x) => x.trim()).filter(Boolean);
    const passes = p.select === "manual" && p.pick_mode === "chain" && picks.length > 1 ? picks : [str(p.picks)];
    let cur = file;
    let out;
    for (let i = 0; i < passes.length; i++) {
      const g = await buildFaceRefineGraph({
        file: cur,
        prompt: c.text("prompt"),
        refs,
        detector: str(p.detector, "none"),
        fallback: str(p.fallback, "none"),
        confidence: num2(p.confidence, 0.35),
        select: str(p.select, "largest_face"),
        confirmedPick: passes[i],
        cutDetection: !!p.cuts,
        cutThreshold: num2(p.cut_threshold, 3),
        identityTrack: p.identity !== false,
        identityThreshold: num2(p.identity_threshold, 0.45),
        identityModel: str(p.identity_model, "insightface"),
        cropFactor: num2(p.crop_factor, 2.5),
        canvasMode: str(p.canvas_mode, "auto_capped_768"),
        canvasW: num2(p.canvas_w, 768),
        canvasH: num2(p.canvas_h, 768),
        smooth: num2(p.smooth, 21),
        denoise: num2(p.denoise, 0.4),
        mulSmall: num2(p.mul_small, 1),
        mulLarge: num2(p.mul_large, 0.35),
        pxSmall: num2(p.px_small, 30),
        pxLarge: num2(p.px_large, 120),
        steps: num2(p.steps, 8),
        sampler: str(p.sampler, "euler"),
        scheduler: str(p.scheduler, "simple"),
        paste: str(p.paste, "face_only"),
        feather: num2(p.feather, 6),
        colour: num2(p.colour, 1),
        blend: num2(p.blend, 1),
        undetected: str(p.undetected, "fade_out"),
        opt: optFromCards(cards),
        loras: cardLoras(c),
        models: s.video,
        seed: seed2 + i,
        saveSubfolder: s.saveSubfolder,
        stem: "MMH3"
      });
      const res = await runPrompt(g.graph, { onProgress: (pct, l) => c.progress(Math.round((i + pct / 100) / passes.length * 100), `face ${i + 1}/${passes.length} ${l ?? ""}`), signal: c.signal });
      out = outFile(res.raw, g.save);
      if (i < passes.length - 1) cur = (await copyToInput(out)).filename;
    }
    return [assetFromFile(out, "video", "video")];
  },
  // ---------------- Character Sheet
  "character-sheet": async (c) => {
    const p = c.p;
    const s = useSettings.getState();
    const refs = [];
    for (const a of need(c.inputs("image"), "Character reference").slice(0, 9)) refs.push(await ensureInput(a));
    const frames = str(p.frames).split(/[,\s]+/).map(Number).filter((n2) => Number.isFinite(n2) && n2 >= 0);
    const v = await buildSheetVideoGraph({
      refs,
      refImageSize: str(p.ref_size, "max"),
      prompt: c.text("prompt") || CHARSHEET_PROMPT,
      aspect: str(p.aspect, "3:4"),
      megapixels: num2(p.megapixels, 0.9),
      firstPassMp: num2(p.first_mp, 0.36),
      latentUpscale: !!p.latent_up,
      secondPassSteps: num2(p.pass2, 3),
      deblur: str(p.deblur, "none"),
      rtx: !!p.rtx,
      rtxSupersample: !!p.supersample,
      loras: cardLoras(c),
      seed: withLegacySeed(c),
      models: s.video,
      saveSubfolder: s.saveSubfolder,
      stem: "MMH3"
    });
    const r1 = await runPrompt(v.graph, { onProgress: (pct, l) => c.progress(Math.round(pct * 0.85), l), signal: c.signal });
    const vf = outFile(r1.raw, v.save);
    c.progress(88, "assembling the sheet\u2026");
    const inName = (await copyToInput(vf)).filename;
    const gg = await buildSheetGridGraph({ video: inName, ref: refs[0], frames: frames.length ? frames : CHARSHEET_DEFAULT_FRAMES, cellW: v.width, cellH: v.height, maxDim: num2(p.max_dim, 2048), saveEach: !!p.save_frames, folder: s.saveSubfolder, stem: "MMH3" });
    const r2 = await runPrompt(gg.graph, { onProgress: (pct, l) => c.progress(88 + Math.round(pct * 0.12), l), signal: c.signal });
    return [assetFromFile(outFile(r2.raw, gg.save), "image", "image"), assetFromFile(vf, "video", "video")];
  }
};

// src/canvas/helpers.ts
function portAssets(node, port) {
  const def = byId.get(node.defId);
  if (!def) return node.results;
  const p = port ?? def.outputs[0]?.id;
  return node.results.filter((a) => def.outputs.length === 1 || (a.port ?? def.outputs[0]?.id) === p);
}
function activeAsset(node, port) {
  const list = portAssets(node, port);
  return list[Math.min(node.activeResult, list.length - 1)] ?? list[0];
}

// src/backend/refEnhance.ts
function downstreamImages(nodeId) {
  const { nodes, edges } = useGraph.getState();
  const images = [];
  let purpose = "Image";
  const seen = /* @__PURE__ */ new Set();
  for (const e of edges.filter((x) => x.source === nodeId)) {
    const target = nodes.find((n2) => n2.id === e.target);
    const def = target && byId.get(target.defId);
    if (!target || !def) continue;
    if (def.category === "Video") purpose = "Video";
    for (const inp of def.inputs.filter((i) => i.type === "image")) {
      for (const ie of edges.filter((x) => x.target === target.id && x.targetHandle === inp.id)) {
        const src = nodes.find((n2) => n2.id === ie.source);
        const a = src && activeAsset(src, ie.sourceHandle);
        if (src && a && a.type === "image" && !seen.has(a.id)) {
          seen.add(a.id);
          images.push({ asset: a, from: src.id });
        }
      }
    }
  }
  return { images, purpose };
}
var DESCRIBE = "Describe this image for a reference-based video/image prompt in 1-2 short sentences: who or what it shows (appearance, hair, clothing, colours), pose, setting. Output ONLY the description.";
async function enhanceWithImages(o) {
  const imgs = o.images.slice(0, 9);
  const descs = [];
  for (let i = 0; i < imgs.length; i++) {
    o.progress?.(10 + Math.round(i / imgs.length * 60), `looking at @image${i + 1}\u2026`);
    descs.push(await runLlm({ system: DESCRIBE, prompt: "Describe this image.", images: [imgs[i]] }));
  }
  o.progress?.(80, "writing\u2026");
  const refRules = [
    `The generator receives ${imgs.length} reference image${imgs.length > 1 ? "s" : ""}. They are numbered in the order they are connected and MUST be referred to by these exact tokens in the prompt:`,
    ...descs.map((d, i) => `@image${i + 1}: ${d}`),
    '- Use the @imageN tokens (not "the first image") wherever the prompt talks about those subjects, e.g. "@image1 walks toward @image2".',
    "- Do not re-describe what each image already shows in detail; say what they DO, how they move/interact, camera and light."
  ].join("\n");
  if (o.modelStyle) {
    return runLlm({ system: "", prompt: o.idea, style: { ...o.modelStyle, extra_instructions: [o.modelStyle.extra_instructions, refRules].filter(Boolean).join("\n") } });
  }
  const system = [enhanceInstruction(o.purpose, o.style ?? "", o.english ?? true), refRules].join("\n");
  return runLlm({ system, prompt: o.idea });
}

// src/engine/run.ts
var portOf = (def, a) => a.port ?? def.outputs[0]?.id;
function nodeAssets(node, handle2, local) {
  const def = byId.get(node.defId);
  if (!def) return void 0;
  const all = local.get(node.id) ?? node.results;
  const mine = all.filter((a) => portOf(def, a) === handle2 || def.outputs.length === 1);
  if (!mine.length) return void 0;
  return mine[Math.min(node.activeResult, mine.length - 1)] ?? mine[0];
}
function upstream(g, targetId) {
  const nodes = new Map(g.nodes.map((n2) => [n2.id, n2]));
  const order = [];
  const seen = /* @__PURE__ */ new Set();
  const visit = (id, stack) => {
    if (seen.has(id)) return;
    if (stack.has(id)) throw new Error("The graph has a loop");
    stack.add(id);
    for (const e of g.edges) if (e.target === id) visit(e.source, stack);
    stack.delete(id);
    seen.add(id);
    const n2 = nodes.get(id);
    if (n2) order.push(n2);
  };
  visit(targetId, /* @__PURE__ */ new Set());
  return order;
}
var editCache = /* @__PURE__ */ new Map();
async function executeGraph(g, targetId, hooks, signal) {
  const local = /* @__PURE__ */ new Map();
  let failing = targetId;
  try {
    for (const node of upstream(g, targetId)) {
      if (signal?.aborted) throw new Error("cancelled");
      const def = byId.get(node.defId);
      if (!def) throw new Error(`Unknown node type ${node.defId}`);
      failing = node.id;
      const isTarget = node.id === targetId;
      const heavy = def.kind === "generate" || def.kind === "llm";
      if (heavy && !isTarget && node.results.length) {
        local.set(node.id, node.results);
        continue;
      }
      if (def.id === "import" || def.id === "import-audio" || def.id === "import-video") {
        local.set(node.id, node.results);
        continue;
      }
      const inputs = (handle2) => {
        const out = [];
        for (const e of g.edges) {
          if (e.target !== node.id || e.targetHandle !== handle2) continue;
          const src = g.nodes.find((n2) => n2.id === e.source);
          if (!src) continue;
          const a = nodeAssets(src, e.sourceHandle, local);
          if (a) out.push(a);
        }
        return out;
      };
      const ctx = {
        node,
        def,
        p: node.params,
        engineId: node.engineId,
        inputs,
        signal,
        text: (h) => inputs(h).map((a) => a.text ?? "").filter(Boolean).join(", "),
        progress: (pct, label) => hooks.progress?.(node.id, pct, label)
      };
      let cacheKey = "";
      if (def.kind === "edit") {
        cacheKey = JSON.stringify([node.defId, node.params, def.inputs.map((i) => inputs(i.id).map((a) => a.id))]);
        const hit = editCache.get(node.id);
        if (hit && hit.key === cacheKey && node.results.length) {
          local.set(node.id, node.results);
          continue;
        }
      }
      if (heavy || def.kind === "edit") hooks.start?.(node.id);
      const assets = await RUNNERS[def.id]?.(ctx) ?? [];
      local.set(node.id, assets.length || def.kind === "generate" ? assets : node.results);
      if (cacheKey) editCache.set(node.id, { key: cacheKey, assets });
      if (heavy || def.kind === "edit" || def.kind === "source") hooks.done?.(node.id, assets, heavy ? "append" : "replace");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    hooks.error?.(failing, msg);
    throw err;
  }
}
function sizeFrom(aspect2, mp) {
  const [a, b] = aspect2.split(":").map(Number);
  const r = a && b ? a / b : 1;
  const px = mp * 1e6;
  const round16 = (v) => Math.max(256, Math.round(v / 16) * 16);
  return { w: round16(Math.sqrt(px * r)), h: round16(Math.sqrt(px / r)) };
}
async function runGraph(c, graph) {
  const res = await runPrompt(graph, { onProgress: c.progress, signal: c.signal });
  const files = [...res.images, ...res.videos];
  if (!files.length && !res.audios.length) throw new Error("ComfyUI finished but returned no image, video or audio");
  const audios = res.audios.map((f) => assetFromFile(f, "audio", "audio"));
  if (audios.length && !files.length) return audios;
  return [...audios, ...files.map((f) => VIDEO_EXT.test(f.filename) ? assetFromFile(f, "video", "video") : assetFromFile(f, "image", "image"))];
}
function imageRunner(mode) {
  return async (c) => {
    const eng = engineFor(c.def, c.engineId);
    const family = eng.family;
    const m = mode(c);
    const p = c.p;
    const settings = useSettings.getState();
    const seedIn = c.inputs("seed_in")[0];
    const seedParam = seedIn ? num2(seedIn.text, -1) : num2(p.seed, -1);
    const seed2 = seedParam < 0 ? Math.floor(Math.random() * 2 ** 40) : seedParam;
    const imgs = c.inputs("image");
    const refs = m === "faceswap" ? [...imgs, ...c.inputs("face")] : imgs;
    const inputFiles = [];
    for (const a of refs.slice(0, 10)) inputFiles.push(await ensureInput(a));
    const maskA = c.inputs("mask")[0];
    const maskFile = maskA ? await ensureInput(maskA) : void 0;
    const { w, h } = typeof p.aspect === "string" && (m === "t2i" || m === "krea2control" || m === "identity" || m === "animactrl") ? sizeFrom(String(p.aspect), num2(p.megapixels, 1)) : { w: 0, h: 0 };
    const lora = (n2, s) => ({ name: str(p[n2], "none"), strength: num2(p[s], 1) });
    const job = {
      family,
      mode: m,
      prompt: [c.text("prompt") || c.text("text")].filter(Boolean).join(", "),
      negative: str(p.negative),
      width: w,
      height: h,
      steps: num2(p.steps, 8),
      cfg: num2(p.cfg, 1),
      sampler: str(p.sampler, "euler"),
      scheduler: str(p.scheduler, "simple"),
      seed: seed2,
      denoise: num2(p.denoise, 1),
      batch: Math.max(1, num2(p.batch, 1)),
      images: inputFiles,
      mask: maskFile,
      pad: { left: num2(p.left), top: num2(p.top), right: num2(p.right), bottom: num2(p.bottom) },
      loras: [lora("lora1", "lora1_strength"), lora("lora2", "lora2_strength"), ...cardLoras(c)],
      models: settings.models[family],
      saveSubfolder: settings.saveSubfolder,
      bgModel: str(p.bg_model),
      control: { preprocessor: str(p.cn_pre, "DepthAnythingPreprocessor"), resolution: num2(p.cn_res, 1024), strength: num2(p.cn_strength, 1), patch: str(p.cn_patch, "none") },
      kcontrol: { type: str(p.kc_type, "depth"), lora: str(p.kc_lora, "none"), strength: num2(p.kc_strength, 1), resolution: num2(p.kc_res, 512), depthCkpt: "", cannyLow: num2(p.canny_low, 100), cannyHigh: num2(p.canny_high, 200) },
      identity: { lora: str(p.id_lora, "none"), strength: num2(p.id_strength, 1), fit: str(p.id_fit, "fit"), refBoost: num2(p.id_boost, 1), groundingPx: num2(p.id_ground, 768), width: w || 1024, height: h || 1024 },
      anima: { type: str(p.an_type, "anycontrol"), patch: str(p.an_patch, "none"), strength: num2(p.an_strength, 1), start: num2(p.an_start, 0), end: num2(p.an_end, 1), depthCkpt: "", resolution: num2(p.an_res, 512) },
      face: { detector: str(p.fr_detector, "none"), threshold: num2(p.fr_threshold, 0.5), dilation: num2(p.fr_dilation, 4), context: num2(p.fr_context, 1.8), size: num2(p.fr_size, 1024) }
    };
    if ((m === "t2i" || m === "edit" || m === "i2i" || m === "inpaint" || m === "outpaint") && !job.prompt && m !== "outpaint") throw new Error("Prompt is empty");
    const built = await buildImageGraph(job);
    c.progress(2, built.hint);
    return runGraph(c, built.graph);
  };
}
var textOnlySystem = (c) => str(c.p.system);
function enhanceInstruction(purpose, style, english = true) {
  const forVideo = purpose === "Video";
  return [
    `You rewrite a short idea into a richer text-to-${forVideo ? "video" : "image"} prompt.`,
    "- Output ONLY the rewritten prompt: no preamble, no quotes, no markdown.",
    "- Keep the user's subject and intent; add concrete detail (composition, light, materials, mood, lens, style).",
    forVideo ? "- Describe motion and camera movement across time." : "",
    english ? "- Always write the result in English, even if the input is another language." : "",
    style ? `- Guidelines: ${style}` : ""
  ].filter(Boolean).join("\n");
}
var TASKS = {
  "Plain description": "Describe the image plainly and accurately in a few sentences.",
  "Generation prompt": "Write a detailed text-to-image prompt that would recreate this image.",
  "Booru-style tags": "List comma-separated booru-style tags for this image.",
  "Pose & anatomy": "Describe the pose, body position and anatomy of the subject in detail."
};
var parseCard = (a) => {
  try {
    return a?.text ? JSON.parse(a.text) : null;
  } catch {
    return null;
  }
};
async function runH3(c) {
  const p = c.p;
  const assetCard = parseCard(c.inputs("assets")[0]);
  const assetRef = assetCard?.kind === "assetlib" ? { project: assetCard.project, ids: assetCard.ids ?? [] } : void 0;
  const ref = c.engineId === "h3-ref" || !!assetRef;
  const si = c.inputs("seed_in")[0];
  const sv = si ? num2(si.text, -1) : num2(p.seed, -1);
  const seed0 = sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv;
  const settings = useSettings.getState();
  const prompts = c.text("prompt").split(/\n\s*-{3,}\s*\n/).map((x) => x.trim()).filter(Boolean);
  if (!prompts.length) throw new Error("Prompt is empty");
  const imgs = c.inputs("image"), lastA = c.inputs("last")[0];
  const cards = h3Cards(c);
  let size;
  if (str(p.aspect) === "auto" && imgs[0]) {
    const bm = await loadBitmap(imgs[0]);
    size = h3Size(`${bm.width}:${bm.height}`, num2(p.megapixels, 0.9));
  }
  const refFiles = [];
  if (ref) for (const a of imgs.slice(0, 9)) refFiles.push(await ensureInput(a));
  let first = !ref && imgs[0] ? await ensureInput(imgs[0]) : void 0;
  const lastFile = !ref && lastA ? await ensureInput(lastA) : void 0;
  const lockFile = cards.lock?.file;
  const continuity = ref ? "none" : str(p.continuity, "lastframe");
  const lora = (n2, s2) => ({ name: str(p[n2], "none"), strength: num2(p[s2], 1) });
  const seconds = num2(p.seconds, 8);
  const runId = uid("ot").slice(0, 10);
  const opt = optFromCards(cards);
  const clips = [];
  let prevCheckpoint;
  for (let i = 0; i < prompts.length; i++) {
    if (c.signal?.aborted) throw new Error("cancelled");
    const checkpoint = continuity === "onetake" ? `canvers_${runId}_${i}` : void 0;
    const mode = ref ? "reference" : first || i === prompts.length - 1 && lastFile ? "firstlast" : "t2v";
    const built = await buildH3Graph({
      mode,
      prompt: prompts[i],
      seconds,
      aspect: str(p.aspect, "16:9"),
      megapixels: num2(p.megapixels, 0.9),
      first,
      last: i === prompts.length - 1 ? lastFile : void 0,
      refs: refFiles,
      seed: seed0 + i,
      steps: num2(p.steps, 20),
      sampler: str(p.sampler, "er_sde"),
      scheduler: str(p.scheduler, "simple"),
      loras: [lora("lora1", "lora1_strength"), lora("lora2", "lora2_strength"), ...cardLoras(c)].filter((l) => l.name && l.name !== "none"),
      assetRef,
      opt: { ...opt, audioLock: lockFile ? { file: lockFile, startSec: i * (h3Frames(seconds) / 24), mode: str(cards.lock.mode, "lock"), strength: num2(cards.lock.strength, 0.5), fit: str(cards.lock.fit, "pad_silence") } : void 0 },
      models: settings.video,
      saveSubfolder: settings.saveSubfolder,
      size,
      upscaleModel: str(p.upscale_model, "none"),
      clipIndex: i,
      prevCheckpoint,
      checkpoint,
      saveLastFrame: continuity === "lastframe" && i < prompts.length - 1,
      stem: "MMH3"
    });
    const base2 = i / prompts.length;
    const res = await runPrompt(built.graph, { onProgress: (pct, label) => c.progress(Math.round((base2 + pct / 100 / prompts.length) * 100), `clip ${i + 1}/${prompts.length} ${label ?? ""}`), signal: c.signal });
    const vout = res.raw[built.videoNode];
    const vf = (vout?.gifs ?? vout?.images ?? vout?.videos ?? [])[0];
    if (!vf) throw new Error(`clip ${i + 1}: ComfyUI returned no video`);
    clips.push({ filename: vf.filename, subfolder: vf.subfolder ?? "" });
    prevCheckpoint = checkpoint;
    if (built.lastFrameNode && i < prompts.length - 1) {
      const lf = (res.raw[built.lastFrameNode]?.images ?? [])[0];
      const tail = res.raw[built.tailNode ?? ""]?.images ?? [];
      let pick = lf ? { filename: lf.filename, subfolder: lf.subfolder ?? "", type: lf.type ?? "output" } : void 0;
      try {
        const r = await pickChainFrame(tail.map((t) => ({ filename: t.filename, subfolder: t.subfolder ?? "", type: t.type ?? "temp" })));
        if (r.ok && r.picked) pick = r.picked;
      } catch {
      }
      if (!pick) throw new Error("could not find a frame to continue from");
      first = (await copyToInput(pick)).filename;
    }
  }
  const assets = clips.map((f) => assetFromFile({ filename: f.filename, subfolder: f.subfolder, type: "output" }, "video", "video"));
  if (clips.length > 1 && p.stitch !== false) {
    c.progress(98, "stitching\u2026");
    const st = await stitchClips(clips, `${settings.saveSubfolder}/MMH3_full`, continuity === "onetake" ? (ONE_TAKE_OVERLAP_FRAMES + 4) / 24 : void 0);
    if (!st.ok || !st.filename) throw new Error(`stitch failed: ${st.error ?? "unknown"}`);
    return [assetFromFile({ filename: st.filename, subfolder: st.subfolder ?? "", type: "output" }, "video", "video"), ...assets];
  }
  return assets;
}
var RUNNERS = {
  ...EXTRA_RUNNERS,
  // ---- sources / data
  prompt: async (c) => {
    const extra = c.inputs("vars").map((a) => a.text ?? "").filter(Boolean);
    return [textAsset([str(c.p.text), ...extra].filter(Boolean).join("\n"))];
  },
  "melody-editor": async (c) => {
    const abc = str(c.p.abc);
    if (!abc.trim()) throw new Error("Open the editor (double-click the node) and play or draw a melody first");
    return [textAsset(abc, "abc")];
  },
  "text-data": async (c) => [textAsset(str(c.p.text))],
  concat: async (c) => [textAsset(c.inputs("texts").map((a) => a.text ?? "").filter(Boolean).join(str(c.p.separator, ", ")))],
  number: async (c) => [textAsset(String(num2(c.p.value)), "value")],
  "seed-node": async (c) => [textAsset(String(num2(c.p.value, 0)), "value")],
  toggle: async (c) => [textAsset(c.p.value ? "true" : "false", "value")],
  // ---- LLM (four backends, chosen in Settings)
  "llm-tj": async (c) => {
    const t = c.text("text");
    const prompt = [t, str(c.p.prompt)].filter(Boolean).join("\n\n");
    const images = c.inputs("image");
    if (!prompt && !images.length) throw new Error("Give the LLM some text or an image");
    c.progress(10, "asking the model\u2026");
    const temperature = num2(c.p.temperature, 0);
    return [textAsset(await runLlm({ system: textOnlySystem(c), prompt, images, temperature: temperature > 0 ? temperature : void 0 }))];
  },
  "prompt-enhancer": async (c) => {
    const t = need(c.text("text") || void 0, "Text");
    c.progress(10, "enhancing\u2026");
    const own = c.inputs("image");
    const down = own.length ? null : downstreamImages(c.node.id);
    const imgs = own.length ? own : down.images.map((x) => x.asset);
    const ms = styleOf(c.node.id, { fmt: c.p.fmt, aes: c.p.aes, extra: c.p.style, purpose_sel: c.p.purpose }, { model_format: "Universal Natural Language", purpose: str(c.p.purpose) || down?.purpose || "Image" });
    if (imgs.length) return [textAsset(await enhanceWithImages({ idea: t, images: imgs, purpose: ms.purpose, modelStyle: ms, progress: c.progress }))];
    return [textAsset(await runLlm({ system: "", prompt: t, style: ms }))];
  },
  "music-writer": async (c) => {
    const t = need(c.text("text") || void 0, "Text");
    const key = { "lyrics from theme": "lyrics_from_theme", "lyrics from title": "lyrics_from_title", "enhance lyrics": "lyrics_enhance", "style caption \u2014 Ace-Step": "caption_acestep", "style caption \u2014 MiniMax Music": "caption_minimax", "style caption \u2014 YuE2": "caption_yue2", "cover prompt": "cover_prompt", "song title": "title" }[str(c.p.task)] ?? "lyrics_from_theme";
    c.progress(10, "loading prompt\u2026");
    const lib = await getJson("/music_one/llm/prompts");
    const system = lib.prompts?.[key];
    if (!system) throw new Error(`The MusicMaker prompt "${key}" was not found on the server`);
    c.progress(30, "writing\u2026");
    return [textAsset(await runLlm({ system, prompt: t }))];
  },
  "image-describer": async (c) => {
    const images = need(c.inputs("image"), "Image");
    c.progress(10, "looking at the image\u2026");
    const system = ["You describe images.", TASKS[str(c.p.task)] ?? TASKS["Plain description"], "Output ONLY the description, no preamble.", str(c.p.guidelines)].filter(Boolean).join("\n");
    return [textAsset(await runLlm({ system, prompt: "Describe this image.", images }))];
  },
  // ---- image generation
  "image-generate": imageRunner(() => "t2i"),
  "camera-angle": (c) => {
    const h = num2(c.p.angle_h), v = num2(c.p.angle_v), z = num2(c.p.angle_zoom, 4);
    const ha = (h % 360 + 360) % 360;
    const hDir = ha < 22.5 || ha >= 337.5 ? "front view" : ha < 67.5 ? "front-right quarter view" : ha < 112.5 ? "right side view" : ha < 157.5 ? "back-right quarter view" : ha < 202.5 ? "back view" : ha < 247.5 ? "back-left quarter view" : ha < 292.5 ? "left side view" : "front-left quarter view";
    const angle = `<sks> ${hDir} ${v < -15 ? "high-angle shot" : v < 15 ? "eye-level shot" : v < 45 ? "elevated shot" : "low-angle shot"} ${z < 4 ? "close-up" : z < 7 ? "medium shot" : "wide shot"}`;
    const extra = c.text("prompt");
    return imageRunner(() => "edit")({ ...c, p: { ...c.p, lora2: c.p.angle_lora, lora2_strength: c.p.angle_strength }, text: (hd) => hd === "prompt" ? [angle, extra].filter(Boolean).join(", ") : c.text(hd) });
  },
  controlnet: imageRunner(() => "controlnet"),
  "krea2-control": imageRunner(() => "krea2control"),
  "krea2-identity": imageRunner(() => "identity"),
  "anima-control": imageRunner(() => "animactrl"),
  "face-redraw": imageRunner(() => "facedraw"),
  "image-edit": imageRunner((c) => c.engineId === "klein-edit" || c.engineId === "qwen-edit" || c.engineId === "qwen21-edit" || !c.engineId ? "edit" : "i2i"),
  inpaint: imageRunner(() => "inpaint"),
  outpaint: imageRunner(() => "outpaint"),
  "face-swap": imageRunner(() => "faceswap"),
  "remove-bg": imageRunner(() => "removebg"),
  upscale: async (c) => {
    const src = need(c.inputs("image")[0], "Image");
    if (c.engineId === "seedvr2") {
      const p = c.p;
      if (!str(p.sv_dit) || p.sv_dit === "none" || !str(p.sv_vae) || p.sv_vae === "none") throw new Error("Pick the SeedVR2 DiT and VAE models on the card");
      const off = str(p.sv_offload, "cpu");
      const file2 = await ensureInput(src);
      const sub2 = useSettings.getState().saveSubfolder;
      const si = c.inputs("seed_in")[0];
      return runGraph(c, {
        "UP:dit": { class_type: "SeedVR2LoadDiTModel", inputs: { model: str(p.sv_dit), device: "cuda:0", blocks_to_swap: num2(p.sv_swap, 0), swap_io_components: false, offload_device: off, cache_model: off !== "none", attention_mode: str(p.sv_attn, "sdpa") } },
        "UP:vae": { class_type: "SeedVR2LoadVAEModel", inputs: { model: str(p.sv_vae), device: "cuda:0", encode_tiled: true, encode_tile_size: 1024, encode_tile_overlap: 128, decode_tiled: true, decode_tile_size: 1024, decode_tile_overlap: 128, tile_debug: "false", offload_device: off, cache_model: false } },
        "UP:load": { class_type: "LoadImage", inputs: { image: file2 } },
        "UP:run": { class_type: "SeedVR2VideoUpscaler", inputs: { image: ["UP:load", 0], dit: ["UP:dit", 0], vae: ["UP:vae", 0], seed: (si ? num2(si.text, 42) : num2(p.seed, 42)) % 4294967295, resolution: num2(p.sv_res, 2048), max_resolution: num2(p.sv_max, 4096), batch_size: 1, uniform_batch_size: false, color_correction: str(p.sv_color, "lab"), temporal_overlap: 0, prepend_frames: 0, input_noise_scale: 0, latent_noise_scale: 0, offload_device: off, enable_debug: false } },
        "UP:save": { class_type: "SaveImage", inputs: { images: ["UP:run", 0], filename_prefix: `${sub2}/seedvr2` } }
      });
    }
    let model = str(c.p.upscale_model);
    if (!model || model === "none") model = (await loadOptions("upscalers")).find((x) => x !== "none") ?? "";
    if (!model) throw new Error("No upscale model found in ComfyUI/models/upscale_models");
    const file = await ensureInput(src);
    const sub = useSettings.getState().saveSubfolder;
    const g = {
      u1: { class_type: "LoadImage", inputs: { image: file } },
      u2: { class_type: "UpscaleModelLoader", inputs: { model_name: model } },
      u3: { class_type: "ImageUpscaleWithModel", inputs: { upscale_model: ["u2", 0], image: ["u1", 0] } }
    };
    let last = ["u3", 0];
    const by = num2(c.p.scale_by, 1);
    if (by !== 1) {
      g.u4 = { class_type: "ImageScaleBy", inputs: { image: last, upscale_method: "lanczos", scale_by: by } };
      last = ["u4", 0];
    }
    g.u5 = { class_type: "SaveImage", inputs: { images: last, filename_prefix: `${sub}/upscale` } };
    return runGraph(c, g);
  },
  "music-generate": async (c) => {
    const p = c.p;
    const si = c.inputs("seed_in")[0];
    const sv = si ? num2(si.text, -1) : num2(p.seed, -1);
    const stages = c.engineId === "minimax" || c.engineId === "yue2" ? [num2(p.steps1, 30)] : [num2(p.steps1, 30), num2(p.steps2, 20), num2(p.steps3, 15)];
    const graph = await buildMusicGraph({
      engine: c.engineId === "minimax" ? "minimax" : c.engineId === "yue2" ? "yue2" : "acestep",
      melodyAbc: c.text("melody") || void 0,
      coverAudio: c.inputs("cover")[0] ? await ensureInput(c.inputs("cover")[0]) : void 0,
      temperature: num2(p.temperature, 1),
      topP: num2(p.top_p, 0.95),
      topK: num2(p.top_k, 100),
      repetition: num2(p.repetition, 1.2),
      caption: c.text("prompt"),
      lyrics: c.text("lyrics"),
      seconds: num2(p.seconds, 60),
      seed: sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv,
      bpm: num2(p.bpm, 120),
      keyscale: str(p.keyscale, "A minor"),
      timesignature: str(p.timesignature, "4"),
      language: str(p.language, "en"),
      format: str(p.format, "flac"),
      stageSteps: stages,
      cfg: num2(p.cfg, 1),
      models: useSettings.getState().music,
      saveSubfolder: useSettings.getState().saveSubfolder
    });
    return runGraph(c, graph);
  },
  "comfy-workflow": async (c) => {
    const { graph, error } = parseWorkflow(str(c.p.workflow));
    if (error) throw new Error(error);
    if (!graph) throw new Error("Load a workflow JSON first (open the node's advanced section)");
    const g = JSON.parse(JSON.stringify(graph));
    const prompt = c.text("prompt");
    if (prompt && str(c.p.prompt_target)) setField(g, str(c.p.prompt_target), prompt);
    const imgs = c.inputs("image");
    if (imgs[0] && str(c.p.image_target)) setField(g, str(c.p.image_target), await ensureInput(imgs[0]));
    if (imgs[1] && str(c.p.image2_target)) setField(g, str(c.p.image2_target), await ensureInput(imgs[1]));
    const vid = c.inputs("video")[0];
    if (vid && str(c.p.video_target)) setField(g, str(c.p.video_target), await ensureInput(vid));
    if (str(c.p.seed_target)) {
      const si = c.inputs("seed_in")[0];
      const sv = si ? num2(si.text, -1) : num2(c.p.seed, -1);
      setField(g, str(c.p.seed_target), sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv);
    }
    return runGraph(c, g);
  },
  "video-generate": async (c) => {
    if (c.engineId === "h3" || c.engineId === "h3-ref") return runH3(c);
    const p = c.p;
    const si = c.inputs("seed_in")[0];
    const sv = si ? num2(si.text, -1) : num2(p.seed, -1);
    const first = c.inputs("image")[0], last = c.inputs("last")[0];
    let size;
    if (first && str(p.aspect) === "auto") {
      const bm = await loadBitmap(first);
      size = ltxSize(`${bm.width}:${bm.height}`, num2(p.megapixels, 1));
    }
    const lora = (n2, s2) => ({ name: str(p[n2], "none"), strength: num2(p[s2], 1) });
    const graph = await buildLtxGraph({
      prompt: c.text("prompt"),
      seconds: num2(p.seconds, 5),
      aspect: str(p.aspect, "16:9"),
      megapixels: num2(p.megapixels, 1),
      first: first ? await ensureInput(first) : void 0,
      last: last ? await ensureInput(last) : void 0,
      seed: sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv,
      steps: num2(p.steps, 12),
      cfg: num2(p.cfg, 1),
      sampler: str(p.sampler, "euler_ancestral"),
      scheduler: str(p.scheduler, "linear_quadratic"),
      stage2Sigmas: str(p.stage2, "0.85, 0.7250, 0.4219, 0.0"),
      loras: [lora("lora1", "lora1_strength"), lora("lora2", "lora2_strength"), ...cardLoras(c)],
      models: useSettings.getState().video,
      saveSubfolder: useSettings.getState().saveSubfolder,
      size
    });
    return runGraph(c, graph);
  },
  // ---- browser-side edits
  crop: opRunner("crop"),
  resize: opRunner("resize"),
  blur: opRunner("blur"),
  levels: opRunner("levels"),
  "rotate-flip": opRunner("rotate-flip"),
  "color-correct": opRunner("color-correct"),
  sharpen: opRunner("sharpen"),
  grayscale: opRunner("grayscale"),
  threshold: opRunner("threshold"),
  posterize: opRunner("posterize"),
  "hue-rotate": opRunner("hue-rotate"),
  vignette: opRunner("vignette"),
  pixelate: opRunner("pixelate"),
  invert: opRunner("invert"),
  channels: async (c) => {
    const img = await loadBitmap(need(c.inputs("image")[0], "Image"));
    const { image, mask } = channelOp(img, str(c.p.channel));
    return [await canvasToAsset(image, "image"), await canvasToAsset(mask, "mask")];
  },
  blend: async (c) => {
    const base2 = await loadBitmap(need(c.inputs("base")[0], "Base"));
    const top = await loadBitmap(need(c.inputs("top")[0], "Top"));
    const m = c.inputs("mask")[0];
    return [await canvasToAsset(blendOp(base2, top, m ? await loadBitmap(m) : null, c.p))];
  },
  "mask-grow": async (c) => {
    const img = await loadBitmap(need(c.inputs("mask")[0], "Mask"));
    return [await canvasToAsset(maskGrow(img, num2(c.p.amount, 8), num2(c.p.feather)), "mask")];
  },
  "invert-mask": async (c) => [await canvasToAsset(invertMask(await loadBitmap(need(c.inputs("mask")[0], "Mask"))), "mask")],
  "color-palette": async (c) => {
    const img = await loadBitmap(need(c.inputs("image")[0], "Image"));
    return [textAsset(palette(img, num2(c.p.count, 5)).join(", "))];
  },
  "extract-frame": async (c) => {
    const v = need(c.inputs("video")[0], "Video");
    return [await canvasToAsset(await videoFrame(v, num2(c.p.position, 100)))];
  },
  painter: async (c) => {
    if (!c.node.results.length) throw new Error("Open the Painter (double-click the preview) and draw first");
    return c.node.results;
  },
  router: async (c) => c.inputs("image").slice(0, 1).map((a) => ({ ...a, port: "image" })),
  // ---- sinks: nothing to compute
  export: async () => [],
  preview: async (c) => c.inputs("image").slice(0, 1).map((a) => ({ ...a, port: "out" })),
  compare: async () => [],
  note: async () => []
};
function opRunner(op) {
  return async (c) => {
    const img = await loadBitmap(need(c.inputs("image")[0], "Image"));
    c.progress(30, op);
    return [await canvasToAsset(applyOp(op, img, c.p))];
  };
}

// mcp/server.ts
init_comfy();
useSettings.getState().set({ comfyUrl: process.env.COMFY_URL ?? "http://127.0.0.1:8188" });
var text2 = (t) => ({ content: [{ type: "text", text: t }] });
var fail = (t) => ({ isError: true, content: [{ type: "text", text: t }] });
async function saveAssets(assets, dir, stem) {
  fs.mkdirSync(dir, { recursive: true });
  const out = [];
  let i = 0;
  for (const a of assets) {
    if (a.type === "text") continue;
    const ext = path.extname(a.file?.filename ?? "") || (a.type === "video" ? ".mp4" : a.type === "audio" ? ".flac" : ".png");
    const p = path.resolve(dir, `${stem}_${String(++i).padStart(2, "0")}${ext}`);
    fs.writeFileSync(p, Buffer.from(await (await fetchBlob(a)).arrayBuffer()));
    out.push(p);
  }
  return out;
}
var textPort = (nodeId) => byId.get(nodeId)?.inputs.find((i) => i.type === "text")?.id ?? "prompt";
async function generate(a) {
  const defId = String(a.node ?? "image-generate");
  const def = byId.get(defId);
  if (!def || def.kind !== "generate" && def.kind !== "llm") throw new Error(`"${defId}" is not a generator node. Use canvers_list_nodes.`);
  const eng = engineFor(def, a.engine);
  const params = { ...defaultParams(def, eng?.id), ...a.params ?? {} };
  const nodes = [
    { id: "target", defId, x: 0, y: 0, engineId: eng?.id, params, results: [], activeResult: 0 },
    { id: "prompt", defId: "prompt", x: 0, y: 0, params: { text: String(a.prompt ?? "") }, results: [], activeResult: 0 }
  ];
  const edges = [{ id: "e0", source: "prompt", sourceHandle: "text", target: "target", targetHandle: textPort(defId) }];
  const imgPort = def.inputs.find((i) => i.type === "image")?.id;
  for (const [i, f] of (a.images ?? []).entries()) {
    if (!imgPort) break;
    const { uploadToInput: uploadToInput2, assetFromFile: assetFromFile2 } = await Promise.resolve().then(() => (init_comfy(), comfy_exports));
    const blob = new Blob([fs.readFileSync(f)], { type: /\.jpe?g$/i.test(f) ? "image/jpeg" : "image/png" });
    nodes.push({ id: `ref${i}`, defId: "import", x: 0, y: 0, params: {}, results: [assetFromFile2(await uploadToInput2(blob), "image")], activeResult: 0 });
    edges.push({ id: `er${i}`, source: `ref${i}`, sourceHandle: "image", target: "target", targetHandle: imgPort });
  }
  let results = [];
  await executeGraph({ nodes, edges }, "target", { done: (id, assets) => {
    if (id === "target") results = assets;
  } });
  const files = await saveAssets(results, String(a.output_dir ?? process.cwd()), String(a.name ?? "canvers"));
  return text2(files.length ? `Saved:
${files.join("\n")}` : results.map((r) => r.text).join("\n"));
}
async function runCanvas(a) {
  const p = JSON.parse(fs.readFileSync(String(a.path), "utf8"));
  const fed = new Set(p.edges.map((e) => e.source));
  const targets = a.node_id ? [String(a.node_id)] : p.nodes.filter((n2) => byId.get(n2.defId) && !fed.has(n2.id) && ["generate", "llm"].includes(byId.get(n2.defId).kind)).map((n2) => n2.id);
  if (!targets.length) throw new Error("No generator/LLM node to run.");
  const lines = [];
  for (const t of targets) {
    let res = [];
    await executeGraph({ nodes: p.nodes, edges: p.edges }, t, { done: (id, assets) => {
      if (id === t) res = assets;
    } });
    const files = await saveAssets(res, String(a.output_dir ?? path.dirname(String(a.path))), `${path.basename(String(a.path), ".json")}_${t}`);
    lines.push(`${t}: ${files.join(", ") || res.map((r) => r.text).join(" ")}`);
  }
  return text2(lines.join("\n"));
}
function buildCanvas(a) {
  const def = byId.get("image-generate");
  const eng = engineFor(def, a.engine);
  const items = a.prompts ?? [];
  const nodes = [];
  const edges = [];
  items.forEach((prompt, i) => {
    const y = i * 420;
    nodes.push({ id: `p${i}`, defId: "prompt", x: 0, y, w: 340, params: { text: prompt }, results: [], activeResult: 0 });
    nodes.push({ id: `g${i}`, defId: "image-generate", x: 420, y, engineId: eng.id, params: defaultParams(def, eng.id), results: [], activeResult: 0 });
    edges.push({ id: `e${i}`, source: `p${i}`, sourceHandle: "text", target: `g${i}`, targetHandle: "prompt" });
  });
  const project = { app: "ai-one-studio-canvers", version: 1, id: `mcp${Date.now()}`, name: String(a.name ?? "mcp canvas"), nodes, edges, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  const out = path.resolve(String(a.path ?? `${project.name.replace(/\W+/g, "_")}.canvers.json`));
  fs.writeFileSync(out, JSON.stringify(project, null, 1));
  return text2(`Canvas written: ${out} (${items.length} prompt \u2192 generate pairs). Open it in the app, or run it with canvers_run_canvas.`);
}
var TOOLS = [
  {
    name: "canvers_status",
    description: "Check the ComfyUI + STUDIO_ONE connection.",
    inputSchema: { type: "object", properties: {} },
    run: async () => {
      const s = await systemStats();
      return text2(`ComfyUI ${s.system?.comfyui_version} \xB7 ${s.devices?.[0]?.name ?? "cpu"}`);
    }
  },
  {
    name: "canvers_list_nodes",
    description: "List node types and the engines of the generator nodes.",
    inputSchema: { type: "object", properties: {} },
    run: async () => text2(REGISTRY.map((d) => `${d.id} \u2014 ${d.title} [${d.kind}]${d.engines ? " engines: " + d.engines.map((e) => e.id).join(", ") : ""}`).join("\n"))
  },
  {
    name: "canvers_generate",
    description: 'Run a generator node once (image, edit, video, music\u2026) and save the result files. node: image-generate | image-edit | inpaint | outpaint | face-swap | remove-bg | upscale | video-generate | music-generate. engine: see canvers_list_nodes. params: node parameters, e.g. {"aspect":"16:9","steps":8}.',
    inputSchema: { type: "object", properties: { prompt: { type: "string" }, node: { type: "string" }, engine: { type: "string" }, params: { type: "object" }, images: { type: "array", items: { type: "string" }, description: "local image file paths (references / source)" }, output_dir: { type: "string" }, name: { type: "string" } }, required: ["prompt"] },
    run: generate
  },
  {
    name: "canvers_llm",
    description: "Ask the LLM configured in the app (Local GGUF / ComfyUI TextGenerate / OpenRouter / Connect Custom).",
    inputSchema: { type: "object", properties: { prompt: { type: "string" }, system: { type: "string" } }, required: ["prompt"] },
    run: async (a) => {
      await loadServerSettings();
      return text2(await runLlm({ system: String(a.system ?? "You are a helpful assistant."), prompt: String(a.prompt) }));
    }
  },
  {
    name: "canvers_build_canvas",
    description: "Write a .canvers.json canvas with one prompt \u2192 image-generate pair per prompt.",
    inputSchema: { type: "object", properties: { prompts: { type: "array", items: { type: "string" } }, engine: { type: "string" }, name: { type: "string" }, path: { type: "string" } }, required: ["prompts"] },
    run: async (a) => buildCanvas(a)
  },
  {
    name: "canvers_run_canvas",
    description: "Run the generator nodes of a .canvers.json file headlessly and save the outputs (browser-only edit nodes are not supported here).",
    inputSchema: { type: "object", properties: { path: { type: "string" }, node_id: { type: "string" }, output_dir: { type: "string" } }, required: ["path"] },
    run: runCanvas
  }
];
var send = (m) => process.stdout.write(JSON.stringify(m) + "\n");
async function handle(msg) {
  const { id, method, params } = msg;
  try {
    if (method === "initialize") return send({ jsonrpc: "2.0", id, result: { protocolVersion: params?.protocolVersion ?? "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "ai-one-studio-canvers", version: "2.8.1" } } });
    if (method === "tools/list") return send({ jsonrpc: "2.0", id, result: { tools: TOOLS.map(({ run: _r, ...t }) => t) } });
    if (method === "tools/call") {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return send({ jsonrpc: "2.0", id, result: fail(`unknown tool ${params?.name}`) });
      try {
        return send({ jsonrpc: "2.0", id, result: await tool.run(params?.arguments ?? {}) });
      } catch (e) {
        return send({ jsonrpc: "2.0", id, result: fail(e.message) });
      }
    }
    if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });
    if (id !== void 0) send({ jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${method}` } });
  } catch (e) {
    if (id !== void 0) send({ jsonrpc: "2.0", id, error: { code: -32603, message: e.message } });
  }
}
var buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (line) void handle(JSON.parse(line));
  }
});
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
