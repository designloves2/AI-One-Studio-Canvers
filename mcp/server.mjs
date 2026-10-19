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
        const { comfyUrl, llm, models, saveSubfolder, music, video } = get();
        try {
          localStorage.setItem(KEY, JSON.stringify({ comfyUrl, llm, models, saveSubfolder, music, video }));
        } catch {
        }
      };
      return {
        comfyUrl: saved.comfyUrl ?? "",
        llm: { ...DEFAULT_LLM, ...saved.llm ?? {} },
        keys: { custom: "", openrouter: "" },
        models: saved.models ?? {},
        saveSubfolder: saved.saveSubfolder ?? "ai-one-canvers",
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
    s.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
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
      else if (m.type === "execution_error") finish(new Error(d.exception_message || "execution error"));
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
          return finish(new Error(msg || "execution error"));
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
    inputs: [P.textIn("text", "Text")],
    outputs: [P.textOut()],
    params: [sel("purpose", "For", ["Image", "Video"], "Image"), text("style", "Guidelines", "Rewrite as a rich, detailed generation prompt. Keep the core idea.", true), toggle("english", "Write in English", true, { advanced: true })],
    description: "Rewrites a short idea into a detailed prompt."
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
    inputs: [P.textIn(), P.seedIn()],
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
    inputs: [P.textIn(), P.imgIn("image", "Images", false, true), P.seedIn()],
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
    id: "inpaint",
    title: "Inpaint",
    category: "Image",
    kind: "generate",
    inputs: [P.textIn(), P.imgIn(), P.maskIn(), P.seedIn()],
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
    inputs: [P.textIn("prompt", "Prompt", true), P.imgIn(), P.seedIn()],
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
    inputs: [P.imgIn()],
    outputs: [P.imgOut()],
    params: [],
    engines: [{ id: "esrgan", label: "Upscale model (ComfyUI core)", family: "core", default: true, params: [dyn("upscale_model", "Model", "upscalers", "none"), slider("scale_by", "Final scale", 0.25, 4, 0.25, 1, { advanced: true })] }],
    description: "Enlarge with an ESRGAN-type model from ComfyUI/models/upscale_models."
  },
  {
    id: "music-generate",
    title: "Music Generate",
    category: "Audio",
    kind: "generate",
    inputs: [P.textIn("prompt", "Style", false), P.textIn("lyrics", "Lyrics", true), { id: "cover", label: "Cover source", type: "audio", optional: true }, P.seedIn()],
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
    inputs: [P.textIn("prompt", "Prompt", false), P.imgIn("image", "First frame / references", true, true), P.imgIn("last", "Last frame", true), P.seedIn()],
    outputs: [{ id: "video", label: "Video", type: "video" }],
    params: [],
    engines: [
      { id: "h3", label: "MiniMax H3 \u2014 text / first-last frame (local)", family: "h3", default: true, params: [sel("aspect", "Aspect ratio", [...ASPECTS, "auto"], "16:9"), megapixels(0.9), slider("seconds", "Length (s)", 5.2, 15, 0.5, 8), slider("steps", "Steps (lower with a Turbo LoRA)", 1, 60, 1, 20, { advanced: true }), dyn("sampler", "Sampler", "samplers", "er_sde", { advanced: true }), dyn("scheduler", "Scheduler", "schedulers", "simple", { advanced: true }), dyn("turbo_lora", "Turbo LoRA", "loras:h3", "none", { advanced: true }), ...loras("h3"), seed] },
      { id: "h3-ref", label: "MiniMax H3 \u2014 multi-reference (local)", family: "h3", params: [sel("aspect", "Aspect ratio", [...ASPECTS, "auto"], "16:9"), megapixels(0.9), slider("seconds", "Length (s)", 5.2, 15, 0.5, 8), slider("steps", "Steps (lower with a Turbo LoRA)", 1, 60, 1, 20, { advanced: true }), dyn("sampler", "Sampler", "samplers", "er_sde", { advanced: true }), dyn("scheduler", "Scheduler", "schedulers", "simple", { advanced: true }), dyn("turbo_lora", "Turbo LoRA", "loras:h3", "none", { advanced: true }), ...loras("h3"), seed] },
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
  { id: "import-audio", title: "Import Audio", category: "Utility", kind: "source", inputs: [], outputs: [{ id: "audio", label: "Audio", type: "audio" }], params: [], description: "Load an audio file (e.g. a recording for YuE2 Cover Music)." },
  { id: "import", title: "Import", category: "Utility", kind: "source", inputs: [], outputs: [{ id: "image", label: "Media", type: "image" }], params: [], description: "Load an image or video from your computer, or drop one on the canvas." },
  { id: "export", title: "Export", category: "Utility", kind: "output", inputs: [P.imgIn("image", "Media")], outputs: [], params: [text("name", "File name", "canvers")], description: "Download the connected result." },
  { id: "preview", title: "Preview", category: "Utility", kind: "output", inputs: [P.imgIn("image", "Media", true)], outputs: [], params: [], description: "Look at any image or text." },
  { id: "router", title: "Router", category: "Utility", kind: "edit", inputs: [P.imgIn("image", "In", false)], outputs: [P.imgOut("image", "Out")], params: [], description: "A pass-through to tidy wires." },
  { id: "compare", title: "Compare", category: "Utility", kind: "output", inputs: [P.imgIn("a", "A"), P.imgIn("b", "B")], outputs: [], params: [], description: "Drag a slider between two images." },
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
  const real4 = (a) => (a ?? []).filter((x) => x && x !== "none");
  const pick = (given, saved, list, re) => {
    const have = real4(list);
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
  const need2 = (n2, what) => {
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
    need2(1, "Source image");
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
    need2(1, "Image 1");
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
    need2(1, "Source image");
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
    need2(2, "Target image and face source");
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
  throw new Error(`Z-Image Turbo has no "${job.mode}" mode`);
}
function buildKrea2(job, m, anima2 = false) {
  const label = anima2 ? "Anima" : "Krea 2";
  if (job.mode !== "t2i" && job.mode !== "i2i" && job.mode !== "edit") throw new Error(`${label} has no "${job.mode}" mode`);
  const g = {};
  g["K:unet"] = isGguf(m.model) && !anima2 ? { class_type: "TJ_NODE_Krea2UnetLoaderGGUF", inputs: { unet_name: m.model } } : unet(m.model);
  g["K:clip"] = isGguf(m.textEncoder) && !anima2 ? { class_type: "TJ_NODE_Krea2ClipLoaderGGUF", inputs: { clip_name: m.textEncoder } } : clip(m.textEncoder, anima2 ? "stable_diffusion" : "krea2");
  g["K:vae"] = { class_type: "VAELoader", inputs: { vae_name: m.vae } };
  const model = loraChain(g, ["K:unet", 0], job.loras, "K:");
  g["K:pos"] = { class_type: "CLIPTextEncode", inputs: { clip: ["K:clip", 0], text: job.prompt } };
  g["K:neg"] = job.negative.trim() ? { class_type: "CLIPTextEncode", inputs: { clip: ["K:clip", 0], text: job.negative } } : { class_type: "ConditioningZeroOut", inputs: { conditioning: ["K:pos", 0] } };
  let latent;
  let denoise = 1;
  if (job.mode === "t2i") {
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
    inputs: { model, positive: ["K:pos", 0], negative: ["K:neg", 0], latent_image: latent, seed: job.seed, steps: job.steps, cfg: job.cfg, sampler_name: job.sampler, scheduler: job.scheduler, denoise }
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
  const need2 = () => {
    if (!job.images[0]) throw new Error("Source image is required");
    g["SX:load"] = { class_type: "LoadImage", inputs: { image: job.images[0] } };
  };
  let modelOut = mo, latent, denoise = 1;
  if (job.mode === "t2i") {
    g["SX:latent"] = { class_type: "EmptyLatentImage", inputs: { width: job.width, height: job.height, batch_size: job.batch } };
    latent = ["SX:latent", 0];
  } else if (job.mode === "i2i" || job.mode === "edit") {
    need2();
    let pix = ["SX:load", 0];
    if (job.width > 0 && job.height > 0) {
      g["SX:scale"] = { class_type: "ImageScale", inputs: { image: pix, width: job.width, height: job.height, upscale_method: "lanczos", crop: "disabled" } };
      pix = ["SX:scale", 0];
    }
    g["SX:enc"] = { class_type: "VAEEncode", inputs: { pixels: pix, vae } };
    latent = ["SX:enc", 0];
    denoise = job.denoise;
  } else if (job.mode === "inpaint") {
    need2();
    if (!job.mask) throw new Error("A mask is required");
    g["SX:dd"] = { class_type: "DifferentialDiffusion", inputs: { model: mo } };
    modelOut = ["SX:dd", 0];
    g["SX:maskImg"] = { class_type: "LoadImage", inputs: { image: job.mask } };
    g["SX:mask"] = { class_type: "ImageToMask", inputs: { image: ["SX:maskImg", 0], channel: "red" } };
    g["SX:enc"] = { class_type: "VAEEncodeForInpaint", inputs: { pixels: ["SX:load", 0], vae, mask: ["SX:mask", 0], grow_mask_by: 6 } };
    latent = ["SX:enc", 0];
    denoise = job.denoise;
  } else if (job.mode === "outpaint") {
    need2();
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
async function connectCustom(role = ROLES.text) {
  const { llm, keys } = useSettings.getState();
  const res = await postJson("/tj_shared/custom_llm/connect", {
    role,
    base_url: llm.custom_base,
    api_key: keys.custom,
    model: llm.custom_model
  });
  if (res.ok && keys.custom) sentKeys.set(role, `${llm.custom_base}|${keys.custom}`);
  return res;
}
async function ensureCustomKeys(roles) {
  const { llm, keys } = useSettings.getState();
  if (!keys.custom) return;
  for (const r of roles) {
    if (sentKeys.get(r) !== `${llm.custom_base}|${keys.custom}`) await connectCustom(r);
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
async function runLlm(req) {
  const l = useSettings.getState().llm;
  const images = req.images ?? [];
  if (l.backend === "custom") {
    if (!l.custom_base.trim()) throw new Error("Connect Custom: set the base URL in Settings \u2192 LLM");
    if (!l.custom_model.trim()) throw new Error("Connect Custom: pick a model in Settings \u2192 LLM");
    await ensureCustomKeys(images.length ? [ROLES.text, ROLES.vision] : [ROLES.text]);
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
      system_override: req.system || "You are a helpful assistant. Answer concisely.",
      prompt: req.prompt
    });
  }
  if (!res.ok) throw new Error(res.error || "LLM request failed");
  return (res.result ?? "").trim();
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
  const pick = (k, list, re) => user[k] || real2(list).find((x) => re.test(x)) || "";
  return {
    unet: pick("ltx_unet", l.diffusion_models, /ltx/i),
    clip: pick("ltx_clip", l.text_encoders_all ?? l.text_encoders, /gemma|ltx/i),
    vaeVideo: pick("ltx_vae_video", l.vaes, /ltx.*video|ltx2?.*vae|video.*vae/i),
    vaeAudio: pick("ltx_vae_audio", l.vaes, /ltx.*audio|audio.*vae/i),
    upscaler: pick("ltx_upscaler", l.latent_upscale_models, /ltx|upscal/i)
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
    local_prompts: "",
    segment_lengths: "",
    epsilon: 1e-3,
    guide_strength: "",
    global_prompt: job.prompt,
    use_custom_audio: false,
    use_custom_motion: false,
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
var cache4 = null;
var h3ModelLists = () => cache4 ??= getJson("/minimax_h3_one/models").catch((e) => {
  cache4 = null;
  throw e;
});
var availCache2 = null;
var availability2 = () => availCache2 ??= getJson("/minimax_h3_one/node_availability").then((r) => r.available ?? r).catch(() => ({}));
var real3 = (a) => (a ?? []).filter((x) => x && x !== "none");
async function resolveH3Models(user, mode) {
  const l = await h3ModelLists();
  const pick = (k, list, re) => user[k] || real3(list).find((x) => re.test(x)) || "";
  return {
    unet: mode === "reference" ? pick("h3_unet_ref", l.diffusion_models, /h3.*ref/i) : pick("h3_unet_fl", l.diffusion_models, /h3.*(fl2va|first|fl)/i),
    clip: pick("h3_clip", l.text_encoders_all ?? l.text_encoders, /h3|minimax/i),
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
async function buildH3Graph(job) {
  const m = await resolveH3Models(job.models, job.mode);
  const miss = [["H3 diffusion model", m.unet], ["text encoder", m.clip], ["video VAE", m.vaeVideo], ["audio VAE", m.vaeAudio]].filter(([, v]) => !v).map(([k]) => k);
  if (miss.length) throw new Error(`Pick the MiniMax H3 ${miss.join(", ")} in Settings \u2192 Video models.`);
  if (!job.prompt.trim()) throw new Error("Prompt is empty");
  if (job.mode === "reference" && !job.refs.length) throw new Error("Connect at least one reference image");
  const avail = await availability2();
  const has = (n2) => !!avail[n2];
  const frames = h3Frames(job.seconds);
  const { width, height } = job.size ?? h3Size(job.aspect, job.megapixels);
  const g = {};
  g.unet = m.unet.toLowerCase().endsWith(".gguf") ? { class_type: "UnetLoaderGGUF", inputs: { unet_name: m.unet } } : { class_type: "UNETLoader", inputs: { unet_name: m.unet, weight_dtype: "default" } };
  let model = ["unet", 0];
  g.shift = { class_type: "MiniMaxH3SigmaShift", inputs: { model, shift_video: 12, shift_audio: 3 } };
  model = ["shift", 0];
  [...job.loras, ...job.turbo ? [job.turbo] : []].forEach((l, i) => {
    if (!l.name || l.name === "none" || !(l.strength > 0)) return;
    g[`lora${i}`] = { class_type: "LoraLoaderModelOnly", inputs: { model, lora_name: l.name, strength_model: l.strength } };
    model = [`lora${i}`, 0];
  });
  g.clip = { class_type: "CLIPLoader", inputs: { clip_name: m.clip, type: "minimax", device: "default" } };
  g.vaeV = { class_type: "VAELoader", inputs: { vae_name: m.vaeVideo } };
  g.vaeA = { class_type: "VAELoader", inputs: { vae_name: m.vaeAudio } };
  if (job.mode === "reference") {
    const inputs = { clip: ["clip", 0], vae: ["vaeV", 0], audio_vae: ["vaeA", 0], prompt: job.prompt, width, height, length: frames, ref_image_size: "match" };
    job.refs.slice(0, 9).forEach((f, i) => {
      g[`ref${i}`] = { class_type: "LoadImage", inputs: { image: f } };
      inputs[`ref_images.ref_image_${i}`] = [`ref${i}`, 0];
    });
    g.cond = { class_type: "MiniMaxH3ReferenceToVideo", inputs };
  } else {
    const inputs = { clip: ["clip", 0], vae: ["vaeV", 0], prompt: job.prompt, width, height, length: frames };
    if (job.mode === "firstlast") {
      if (job.first) {
        g.first = { class_type: "LoadImage", inputs: { image: job.first } };
        inputs.first_frame = ["first", 0];
      }
      if (job.last) {
        g.last = { class_type: "LoadImage", inputs: { image: job.last } };
        inputs.last_frame = ["last", 0];
      }
    }
    g.cond = { class_type: "MiniMaxH3ImageToVideo", inputs };
  }
  g.noise = { class_type: "RandomNoise", inputs: { noise_seed: job.seed } };
  g.sel = { class_type: "KSamplerSelect", inputs: { sampler_name: job.sampler } };
  g.sched = { class_type: "BasicScheduler", inputs: { model, scheduler: job.scheduler, steps: Math.max(1, Math.round(job.steps)), denoise: 1 } };
  let cond = ["cond", 0];
  if (has("TJ_FreeTextEncoderVRAM")) {
    g.free = { class_type: "TJ_FreeTextEncoderVRAM", inputs: { clip: ["clip", 0], trigger: cond } };
    cond = ["free", 0];
  }
  g.guider = { class_type: "BasicGuider", inputs: { model, conditioning: cond } };
  g.samp = { class_type: "SamplerCustomAdvanced", inputs: { noise: ["noise", 0], guider: ["guider", 0], sampler: ["sel", 0], sigmas: ["sched", 0], latent_image: ["cond", 1] } };
  g.dec = { class_type: "VAEDecode", inputs: { samples: ["samp", 0], vae: ["vaeV", 0] } };
  g.decA = { class_type: "VAEDecodeAudio", inputs: { samples: ["samp", 0], vae: ["vaeA", 0] } };
  const prefix = `${job.saveSubfolder}/MMH3`;
  if (has("VHS_VideoCombine")) {
    g.save = { class_type: "VHS_VideoCombine", inputs: { images: ["dec", 0], audio: ["decA", 0], frame_rate: FPS, loop_count: 0, filename_prefix: prefix, format: "video/nvenc_h264-mp4", pingpong: false, save_output: true } };
  } else {
    g.video = { class_type: "CreateVideo", inputs: { images: ["dec", 0], fps: FPS, audio: ["decA", 0] } };
    g.save = { class_type: "SaveVideo", inputs: { video: ["video", 0], filename_prefix: prefix, format: "auto", codec: "auto" } };
  }
  return g;
}

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

// src/engine/run.ts
var textAsset = (text3, port) => ({ id: uid(), type: "text", url: "", text: text3, port });
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
      if (def.id === "import" || def.id === "import-audio") {
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
var num2 = (v, d = 0) => typeof v === "number" ? v : parseFloat(String(v)) || d;
var str = (v, d = "") => v === void 0 ? d : String(v);
function need(v, what) {
  if (v === void 0 || Array.isArray(v) && !v.length) throw new Error(`${what} is not connected`);
  return v;
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
    const { w, h } = typeof p.aspect === "string" && m === "t2i" ? sizeFrom(String(p.aspect), num2(p.megapixels, 1)) : { w: 0, h: 0 };
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
      loras: [lora("lora1", "lora1_strength"), lora("lora2", "lora2_strength")],
      models: settings.models[family],
      saveSubfolder: settings.saveSubfolder,
      bgModel: str(p.bg_model)
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
var enhanceSystem = (c) => enhanceInstruction(str(c.p.purpose), str(c.p.style), !!c.p.english);
var TASKS = {
  "Plain description": "Describe the image plainly and accurately in a few sentences.",
  "Generation prompt": "Write a detailed text-to-image prompt that would recreate this image.",
  "Booru-style tags": "List comma-separated booru-style tags for this image.",
  "Pose & anatomy": "Describe the pose, body position and anatomy of the subject in detail."
};
async function runH3(c) {
  const p = c.p;
  const si = c.inputs("seed_in")[0];
  const sv = si ? num2(si.text, -1) : num2(p.seed, -1);
  const imgs = c.inputs("image"), lastA = c.inputs("last")[0];
  const ref = c.engineId === "h3-ref";
  let size;
  if (str(p.aspect) === "auto" && imgs[0]) {
    const bm = await loadBitmap(imgs[0]);
    size = h3Size(`${bm.width}:${bm.height}`, num2(p.megapixels, 0.9));
  }
  const lora = (n2, s2) => ({ name: str(p[n2], "none"), strength: num2(p[s2], 1) });
  const files = [];
  for (const a of ref ? imgs.slice(0, 9) : imgs.slice(0, 1)) files.push(await ensureInput(a));
  const graph = await buildH3Graph({
    mode: ref ? "reference" : imgs.length || lastA ? "firstlast" : "t2v",
    prompt: c.text("prompt"),
    seconds: num2(p.seconds, 8),
    aspect: str(p.aspect, "16:9"),
    megapixels: num2(p.megapixels, 0.9),
    first: ref ? void 0 : files[0],
    last: lastA && !ref ? await ensureInput(lastA) : void 0,
    refs: ref ? files : [],
    seed: sv < 0 ? Math.floor(Math.random() * 2 ** 40) : sv,
    steps: num2(p.steps, 20),
    sampler: str(p.sampler, "er_sde"),
    scheduler: str(p.scheduler, "simple"),
    loras: [lora("lora1", "lora1_strength"), lora("lora2", "lora2_strength")],
    turbo: str(p.turbo_lora, "none") !== "none" ? { name: str(p.turbo_lora), strength: 1 } : void 0,
    models: useSettings.getState().video,
    saveSubfolder: useSettings.getState().saveSubfolder,
    size
  });
  return runGraph(c, graph);
}
var RUNNERS = {
  // ---- sources / data
  prompt: async (c) => {
    const extra = c.inputs("vars").map((a) => a.text ?? "").filter(Boolean);
    return [textAsset([str(c.p.text), ...extra].filter(Boolean).join("\n"))];
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
    return [textAsset(await runLlm({ system: enhanceSystem(c), prompt: t }))];
  },
  "image-describer": async (c) => {
    const images = need(c.inputs("image"), "Image");
    c.progress(10, "looking at the image\u2026");
    const system = ["You describe images.", TASKS[str(c.p.task)] ?? TASKS["Plain description"], "Output ONLY the description, no preamble.", str(c.p.guidelines)].filter(Boolean).join("\n");
    return [textAsset(await runLlm({ system, prompt: "Describe this image.", images }))];
  },
  // ---- image generation
  "image-generate": imageRunner(() => "t2i"),
  "image-edit": imageRunner((c) => c.engineId === "klein-edit" || c.engineId === "qwen-edit" || c.engineId === "qwen21-edit" || !c.engineId ? "edit" : "i2i"),
  inpaint: imageRunner(() => "inpaint"),
  outpaint: imageRunner(() => "outpaint"),
  "face-swap": imageRunner(() => "faceswap"),
  "remove-bg": imageRunner(() => "removebg"),
  upscale: async (c) => {
    const src = need(c.inputs("image")[0], "Image");
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
      loras: [lora("lora1", "lora1_strength"), lora("lora2", "lora2_strength")],
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
  preview: async () => [],
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
    if (method === "initialize") return send({ jsonrpc: "2.0", id, result: { protocolVersion: params?.protocolVersion ?? "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "ai-one-studio-canvers", version: "1.0.0" } } });
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
