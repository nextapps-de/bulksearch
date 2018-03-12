/**
 * Search Interface
 * @interface
 * @this {_search_struct}
 * @const
 */

function _search_struct(options) {}
/** @type {Function} */
_search_struct.register;
/** @type {Function} */
_search_struct.prototype.add;
/** @type {Function} */
_search_struct.prototype.update;
/** @type {Function} */
_search_struct.prototype.remove;
/** @type {Function} */
_search_struct.prototype.reset;
/** @type {Function} */
_search_struct.prototype.destroy;
/** @type {Function} */
_search_struct.prototype.search;
/** @type {Function} */
_search_struct.prototype.optimize;

/**
 * Cache Interface
 * @interface
 * @this {_cache_struct}
 * @param {number=} expiration
 * @const
 */

function _cache_struct(expiration) {}
/** @type {function(string, *, boolean=)} */
_cache_struct.prototype.set;
/** @type {function(string, boolean=):*} */
_cache_struct.prototype.get;
/** @type {function(string):*} */
_cache_struct.prototype.remove;
/** @type {function()} */
_cache_struct.prototype.reset;
