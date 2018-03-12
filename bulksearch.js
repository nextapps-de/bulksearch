/**!
 * BulkSearch - Superfast lightweight full text search engine
 * ----------------------------------------------------------
 * @author: Thomas Wilkerling
 * @preserve https://github.com/nextapps-de/bulksearch
 * @version: 0.1.26
 * @license: Apache 2.0 Licence
 */

;(function(){

    provide('BulkSearch', (function factory(queue, cache){

        "use strict";

        /**
         * @struct
         * @private
         * @const
         * @final
         */

        var defaults = {

            // bitsize of assigned IDs (data type)
            type: 'integer',

            // type of information
            result: 'id',

            // type-save separator
            separator: '~', // '^'

            // match when starts from beginning
            strict: false,

            // handle multiple words as separated queries
            multi: false,

            // boolean model of multiple words
            boolean: false,

            // matching in strict order (multiple words)
            ordered: false,

            // use flexible cache (scales automatically)
            cache: false,

            // use on of built-in functions
            // or pass custom encoding algorithm
            encode: false,

            // paging results
            paging: false,

            // default chunk size
            size: 4000, // 600 -> 2500 -> 4000 -> 5000 -> 10000

            // depth of register
            depth: 0
        };

        /**
         * @type {Array}
         * @private
         */

        var global_matcher = [];

        /**
         * @type {number}
         * @private
         */

        var id_counter = 0;

        /**
         * @param {Object<string, number|string|boolean>=} options
         * @constructor
         * @private
         * @const
         */

        function BulkSearch(options){

            // generate UID

            /** @export */
            this.id = id_counter++;

            // initialize index

            this.init(options || defaults);

            // define functional properties

            Object.defineProperty(this, 'index', {

                /**
                 * @this {BulkSearch}
                 */

                get: function(){

                    return this._marker;
                }
            });

            Object.defineProperty(this, 'length', {

                /**
                 * @this {BulkSearch}
                 */

                get: function(){

                    return Object.keys(this._marker).length;
                }
            });
        }

        /**
         * @param {Object<string, number|string|boolean>=} options
         * @export
         */

        BulkSearch.new = function(options){

            return new this(options);
        };

        /**
         * @param {Object<string, number|string|boolean>=} options
         * @export
         */

        BulkSearch.create = function(options){

            return BulkSearch.new(options);
        };

        /**
         * @param {Object<string, string>} matcher
         * @export
         */

        BulkSearch.addMatcher = function(matcher){

            for(var key in matcher){

                if(matcher.hasOwnProperty(key)){

                    global_matcher[global_matcher.length] = regex(key);
                    global_matcher[global_matcher.length] = matcher[key];
                }
            }
        };

        /**
         * @param {string} name
         * @param {function(string):string} encoder
         * @export
         */

        BulkSearch.register = function(name, encoder){

            global_encoder[name] = encoder;
        };

        /**
         * @param {!string} name
         * @param {!string} value
         * @returns {string}
         * @export
         */

        BulkSearch.encode = function(name, value){

            return global_encoder[name](value);
        };

        /**
         * @param {Object<string, number|string|boolean|Object|function(string):string>=} options
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.init = function(options){

            // apply options

            if(options){

                this.type = (

                    options['type'] ||
                    this.type ||
                    defaults.type
                );

                this.result = (

                    options['result'] ||
                    this.result ||
                    defaults.result
                );

                this.separator = (

                    options['separator'] ||
                    this.separator ||
                    defaults.separator
                );

                this.strict = (

                    options['strict'] ||
                    this.strict ||
                    defaults.strict
                );

                this.ordered = (

                    options['ordered'] ||
                    this.ordered ||
                    defaults.ordered
                );

                this.multi = (

                    options['multi'] ||
                    this.multi ||
                    defaults.multi
                );

                this.boolean = (

                    options['boolean'] === 'or' ||
                    this.boolean ||
                    defaults.boolean
                );

                this.paging = (

                    options['paging'] ||
                    this.paging ||
                    defaults.paging
                );

                this.cache = (

                    options['cache'] ||
                    this.cache ||
                    defaults.cache
                );

                this.depth = (

                    options['depth'] ||
                    this.depth ||
                    defaults.depth
                );

                /** @export */
                this.encoder = (

                    (options['encode'] && global_encoder[options['encode']]) ||
                    this.encoder ||
                    global_encoder[defaults.encode] ||
                    options['encode']
                );

                /** @type {Object<string, number>} */
                this._scores = {};

                /** @type {number} */
                this._chunk_size = /** @type {number} */ (options['size'] || defaults.size);

                if(options['matcher']) {

                    /** @type {Array} */
                    this._matcher = [];
                    this.addMatcher(/** @type {Object<string, string>} */ (options['matcher']));
                }
            }

            // initialize index

            this._pages = {};
            this._matcher || (this._matcher = []);
            this._index = [create_typed_array(this.type, this._chunk_size)];
            this._marker = {};
            this._fragment = {};
            this._register = {};
            this._bulk = [""];
            this._chunk = 0;
            this._status = true;
            this._fragmented = 0;
            this._cache = this.cache ?

                (new cache(30 * 1000, 50, true))
            :
                false;
        };

        /**
         * @param {!string} value
         * @returns {string}
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.encode = function(value){

            if(this.encoder){

                value = this.encoder(value);
            }

            if(global_matcher.length){

                value = replace(value, global_matcher);
            }

            if(this._matcher.length){

                value = replace(value, this._matcher);
            }

            return value;
        };

        /**
         * @param {!number|string} id
         * @param {!string} content
         * @param {!string=} encoded_content
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.add = function(id, content, encoded_content){

            if((typeof content === 'string') && content && (id || (id === 0))){

                // check if index ID already exist

                if(this._marker[id]){

                    this.update(id, content);
                }
                else{

                    if(typeof encoded_content === 'string'){

                        content = encoded_content;
                    }
                    else{

                        if(content){

                            content = encodeContent.call(this, content);
                        }
                    }

                    if(!content){

                        return;
                    }

                    var bulk = this._bulk;
                    var chunk_index = this._chunk;
                    var fragment = this._fragment[content.length];
                    var index = 0;
                    var marker = 0;

                    // check fragments

                    // TODO: split fragments into reusable parts
                    // if(!fragment && this._fragmented){
                    //
                    //     var fragment_keys = Object.keys(this._fragment);
                    //
                    //     for(var i = 0; i < fragment_keys.length; i++){
                    //
                    //         if(content.length < fragment_keys[i]){
                    //
                    //             fragment = this._fragment[fragment_keys[i]];
                    //             break;
                    //         }
                    //     }
                    // }

                    if(fragment && fragment.length){

                        this._marker[id] = marker = fragment.pop();

                        chunk_index = marker[0];
                        index = /** @type  {number} */ (marker[1]);

                        var chunk = bulk[chunk_index];

                        bulk[chunk_index] = (

                            chunk.substring(0, index) +
                            content + //this.separator +
                            chunk.substring(marker[2])
                        );

                        this._fragmented -= content.length;
                    }
                    else{

                        index = bulk[chunk_index].length;

                        // check chunk size limit

                        if((index + content.length) > this._chunk_size){

                            if(content.length > (this._chunk_size / 2)){

                                this._chunk_size = content.length * 2;
                            }

                            // init new chunk

                            if(index){

                                this._chunk = ++chunk_index;
                            }

                            index = 0;
                            bulk[chunk_index] = "";
                            this._index[chunk_index] = create_typed_array(this.type, this._chunk_size);
                        }

                        // 32 bytes per marker --> Uint16Array = 8 bytes per marker
                        this._marker[id] = marker = [

                            chunk_index,
                            index,
                            0
                        ];

                        bulk[chunk_index] += content + this.separator;
                    }

                    if(this._index[chunk_index].constructor === Array){

                        for(var i = 0; i < content.length; i++){

                            this._index[chunk_index][index++] = id;
                        }
                    }
                    else{

                        this._index[chunk_index].fill(id, index, index + content.length + 1);

                        index += content.length;
                    }

                    // assign end marker

                    marker[2] = index;

                    // push marker to the register

                    if(this.depth){

                        for(var i = this.depth; i > 1; i--){

                            var key = content.substring(0, i);

                            this._register[key] || (this._register[key] = []);
                            this._register[key].push(marker);
                        }
                    }

                    // update status

                    this._status = false;
                }
            }
        };

        /**
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.update = function(id, content){

            if((typeof content === 'string') && (id || (id === 0))){

                var marker = this._marker[id];

                if(marker){

                    var old_content = content;

                    if(content){

                        content = encodeContent.call(this, content);
                    }

                    if(old_content && !content){

                        return;
                    }

                    var min = marker[1];
                    var max = marker[2];
                    var old_length = max - min;
                    var overlap = content.length - old_length;
                    var encoded_content = content;

                    if(overlap > 0){

                        // clear content (bypass)

                        content = "";
                    }

                    // right-padding invalid index

                    while(content.length < old_length){

                        content = (content + "                                                  ").substring(0, old_length);
                    }

                    var bulk = this._bulk;
                    var chunk_index = marker[0];
                    var chunk = bulk[chunk_index];

                    // submerge updated content to bulk

                    bulk[chunk_index] = chunk.substring(0, min) +
                                        content +
                                        chunk.substring(max);

                    // check if content length has enlarged

                    if(overlap > 0 || !old_content){

                        // get fragments

                        var current_fragment_length = this._fragment[old_length];

                        if(!current_fragment_length){

                            this._fragment[old_length] = [];

                            current_fragment_length = 0;
                        }
                        else{

                            current_fragment_length = current_fragment_length.length;
                        }

                        // add fragment

                        this._fragment[old_length][current_fragment_length] = marker;
                        this._fragmented += old_length;

                        // delete marker

                        this._marker[id] = null;

                        // add overlapping contents to the end

                        if(old_content){

                            this.add(id, old_content, encoded_content);
                        }
                    }

                    // update status

                    this._status = false;
                }
            }
        };

        /**
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.remove = function(id){

            if(this._marker[id]){

                this.update(id, '');

                delete this._marker[id];
                delete this._scores[id];
            }
        };

        var regex_split = regex("[ -\/]");

        /**
         * @param {!string|Object} query
         * @param {number|Object|Function=} limit
         * @param {Function=} callback
         * @returns {Array|Object}
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.search = function(query, limit, callback){

            var initial_page = 0;
            var initial_index = 0;

            if(query && (typeof query === 'object')){

                // re-assign properties

                callback = /** @type {?Function} */ (limit);
                limit = /** @type {?Object} */ (query);
                query = query['query'];
            }

            if(limit){

                if(typeof limit === 'function'){

                    // re-assign properties

                    callback = limit;
                    limit = 1000;
                }
                else if(typeof limit === 'object'){

                    // handle option parameters

                    if(limit['page']){

                        var cmp = limit['page'].split(':');

                        initial_page = parseInt(cmp[0], 10);
                        initial_index = parseInt(cmp[1], 10);
                    }

                    if(limit['callback']){

                        callback = limit['callback'];
                        limit['callback'] = false;
                    }

                    limit = limit['limit'];
                }
            }

            limit || (limit = 1000);

            if(callback){

                /** @type {BulkSearch} */
                var self = this;

                if(initial_page || initial_index){

                    limit = {

                        'page': initial_page + ':' + initial_index,
                        'limit': limit
                    };
                }

                queue(function(){

                    callback(self.search(query, limit));
                    self = null;

                }, 1, 'search-' + this.id);

                return null;
            }

            // create pagination payload

            if(this.paging){

                var pointer = initial_page + ':' + initial_index;

                var page = {

                    /** @export */
                    current: pointer,

                    /** @export */
                    prev: this._pages[pointer] || null,

                    /** @export */
                    next: null,

                    /** @export */
                    results: []
                };

                var result = page.results;
            }
            else{

                var result = [];
            }

            if(!query || (typeof query !== 'string')){

                return page || result;
            }

            var _query = query;

            // invalidate cache

            if(!this._status){

                if(this.cache){

                    this._last_empty_query = "";
                    this._cache.reset();
                }

                this._status = true;
            }

            // validate cache

            else if(this.cache){

                var cache = this._cache.get(query);

                if(cache){

                    return cache;
                }
            }

            // validate last query

            else if(this._last_empty_query && (query.indexOf(this._last_empty_query) !== -1)){

                return page || result;
            }

            // remove trailing spaces

            var spaces = 0;

            while(query[spaces] === " "){

                spaces++;
            }

            if(spaces){

                _query = query.substring(spaces);
            }

            if(!_query){

                return page || result;
            }

            // convert words into single components

            var words = (

                this.multi ?

                    _query.split(regex_split)
                :
                    [_query]
            );

            var length = words.length;

            // sort words by length

            if(length > 1){

                words.sort(sort_by_length_down);
            }

            var encoded = new Array(length);

            // encode query

            if(this.encode && words[0]){

                words[0] = this.encode(words[0]);
            }

            // perform search

            for(var z = initial_page; z < this._bulk.length; z++){

                var start = initial_index;
                var pos = 0;
                var bulk = this._bulk[z];

                initial_index = 0;

                while((pos = bulk.indexOf(words[0], start)) !== -1){

                    var current_id = this._index[z][pos];
                    var marker = this._marker[current_id];

                    if(marker){

                        var min = marker[1];
                        var max = marker[2];
                        var matched = true;

                        // check multiple word components

                        if(length > 1){

                            var sub_bulk = bulk.substring(min, max);

                            for(var i = 1; i < length; i++){

                                if(words[i]){

                                    // encode query

                                    if(this.encode && !encoded[i]){

                                        words[i] = this.encode(words[i]);
                                        encoded[i] = true;
                                    }

                                    if(sub_bulk.indexOf(words[i]) === -1){

                                        // boolean and:

                                        if(!this.boolean){

                                            matched = false;
                                            break;
                                        }
                                        else{

                                            matched = false;
                                        }
                                    }
                                    else{

                                        // boolean or:

                                        if(this.boolean){

                                            matched = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        // shift pointer (query was done for a specific entry)

                        pos = max;

                        // collect results

                        if(matched){

                            // increase score

                            this._scores[current_id] ? this._scores[current_id]++ : this._scores[current_id] = 1;

                            // TODO enrich results
                            // result[result.length] = {
                            //
                            //     'id': current_id,
                            //     'rank': scores[sub_bulk],
                            //     'score': 1.0
                            // };

                            result[result.length] = current_id;

                            // apply limit

                            if(limit && (result.length === limit)){

                                break;
                            }
                        }
                    }

                    // update pointer (process next entry)

                    start = pos + 1;
                }

                if(limit && (result.length === limit)){

                    if(page && (z < this._bulk.length) && ((pos + 1) < this._bulk[z].length)){

                        page.next = z + ':' + pos;

                        this._pages[page.next] = pointer;
                    }

                    break;
                }
            }

            if(result.length){

                this._last_empty_query = "";
            }
            else{

                this._last_empty_query || (this._last_empty_query = query);
            }

            // store result to cache

            if(this.cache){

                this._cache.set(query, page || result);
            }

            return page || result;
        };

        /**
         * @param {Object<string, string>} matcher
         * @export
         */

        BulkSearch.prototype.addMatcher = function(matcher){

            for(var key in matcher){

                if(matcher.hasOwnProperty(key)){

                    this._matcher[this._matcher.length] = regex(key);
                    this._matcher[this._matcher.length] = matcher[key];
                }
            }
        };

        /**
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.optimize = function(){

            var old_bulk = this._bulk;
            var old_marker = this._marker;
            var old_cache = this._cache;
            var old_scores = this._scores;

            // reset index

            this.reset();

            // get ids

            var marker_keys = Object.keys(old_marker);

            // sort keys by score

            marker_keys.sort(function(a, b){

                var sum = (old_scores[b] || 0) - (old_scores[a] || 0);

                return (

                    sum < 0 ?

                        -1
                    :(
                        sum > 0 ?

                            1
                        :
                            0
                    )
                );
            });

            // re-add contents

            for(var i = 0; i < marker_keys.length; i++){

                var key = marker_keys[i];
                var marker = old_marker[key];

                if(marker){

                    var bulk = old_bulk[marker[0]];
                    var current_value = bulk.substring(marker[1], marker[2]);

                    this.add(key, current_value);
                }
                else{

                    delete old_marker[key];
                }
            }

            // re-assign valid cache

            if(old_cache){

                this._cache = old_cache;
            }

            // re-assign scores

            this._scores = old_scores;
        };

        /**
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.info = function(){

            var fragmented = this._fragmented;
            var marker_length = Object.keys(this._marker).length;
            var fragment_length = Object.keys(this._fragment).length;
            var register_length = Object.keys(this._register).length;
            var bytes = 0;
            var length = 0;

            for(var z = 0; z < this._bulk.length; z++){

                length += this._bulk[z].length;
            }

            if(length){

                fragmented = ((100 / length * fragmented * 100) | 0) / 100;

                bytes = this._index[0].byteLength || (length * 32);
                bytes += (length * 2) + ((marker_length + fragment_length + register_length) * 8 * 3);
            }

            return {

                'id': this.id,
                'length': marker_length,
                'chunks': this._bulk.length,
                'register': register_length,
                'depth': this.depth,
                'size': this._chunk_size,
                'bytes': bytes,
                'fragments': fragment_length,
                'fragmented': fragmented,
                'status': this._status,
                'matchers': global_matcher.length
            };
        };

        /**
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.reset = function(){

            // destroy index

            this.destroy();

            // initialize index

            this.init();
        };

        /**
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.destroy = function(){

            // cleanup cache

            if(this.cache){

                this._cache.reset();
            }

            // unset references

            this._index =
            this._marker =
            this._fragment =
            this._bulk =
            this._register =
            this._cache =
            this._scores =
            this._matcher =
            this._pages = null;
        };

        /**
         * Phonetic Encoders
         * @enum {Function}
         * @private
         * @const
         * @final
         */

        var global_encoder = {

            // case insensitive search

            'icase': function(value){

                return value.toLowerCase();
            },

            // simple phonetic normalization (latin)

            'simple': (function(){

                var regex_strip = regex('[^a-z0-9 ]'),
                    regex_split = regex('[-/]'),
                    regex_a = regex('[àáâãäå]'),
                    regex_e = regex('[èéêë]'),
                    regex_i = regex('[ìíîï]'),
                    regex_o = regex('[òóôõöő]'),
                    regex_u = regex('[ùúûüű]'),
                    regex_y = regex('[ýŷÿ]'),
                    regex_n = regex('ñ'),
                    regex_c = regex('ç'),
                    regex_s = regex('ß');

                var regex_pairs = [

                    regex_a, 'a',
                    regex_e, 'e',
                    regex_i, 'i',
                    regex_o, 'o',
                    regex_u, 'u',
                    regex_y, 'y',
                    regex_n, 'n',
                    regex_c, 'c',
                    regex_s, 's',
                    regex_split, ' ',
                    regex_strip, ''
                ];

                return function(str){

                    return (

                        replace(str.toLowerCase(), regex_pairs)
                    );
                };
            }()),

            // advanced phonetic transformation (latin)

            'advanced': (function(){

                var regex_space = regex(' '),
                    regex_ae = regex('ae'),
                    regex_ai = regex('ai'),
                    regex_ay = regex('ay'),
                    regex_ey = regex('ey'),
                    regex_oe = regex('oe'),
                    regex_ue = regex('ue'),
                    regex_ie = regex('ie'),
                    regex_sz = regex('sz'),
                    regex_zs = regex('zs'),
                    regex_ck = regex('ck'),
                    regex_cc = regex('cc'),
                    regex_sh = regex('sh'),
                    //regex_th = regex('th'),
                    regex_dt = regex('dt'),
                    regex_ph = regex('ph'),
                    regex_ou = regex('ou'),
                    regex_uo = regex('uo');

                var regex_pairs = [

                    regex_ae, 'a',
                    regex_ai, 'ei',
                    regex_ay, 'ei',
                    regex_ey, 'ei',
                    regex_oe, 'o',
                    regex_ue, 'u',
                    regex_ie, 'i',
                    regex_sz, 's',
                    regex_zs, 's',
                    regex_sh, 's',
                    regex_ck, 'k',
                    regex_cc, 'k',
                    //regex_th, 't',
                    regex_dt, 't',
                    regex_ph, 'f',
                    regex_ou, 'o',
                    regex_uo, 'u'
                ];

                return function(string, _skip_post_processing){

                    if(!string){

                        return string;
                    }

                    // perform simple encoding
                    string = global_encoder['simple'](string);

                    // normalize special pairs
                    if(string.length > 2){

                        string = replace(string, regex_pairs)
                    }

                    if(!_skip_post_processing){

                        // remove white spaces
                        string = string.replace(regex_space, '');

                        // delete all repeating chars
                        if(string.length > 1){

                            string = collapseRepeatingChars(string);
                        }
                    }

                    return string;
                };

            })(),

            'extra': (function(){

                var soundex_b = regex('p'),
                    soundex_c = regex('[sz]'),
                    soundex_k = regex('[gq]'),
                    soundex_i = regex('[jy]'),
                    soundex_m = regex('n'),
                    soundex_t = regex('d'),
                    soundex_f = regex('[vw]');

                var regex_vowel = regex('[aeiouy]');

                var regex_pairs = [

                    soundex_b, 'b',
                    soundex_c, 'c',
                    soundex_k, 'k',
                    soundex_i, 'i',
                    soundex_m, 'm',
                    soundex_t, 't',
                    soundex_f, 'f',
                    regex_vowel, ''
                ];

                return function(str){

                    if(!str){

                        return str;
                    }

                    // perform advanced encoding
                    str = global_encoder['advanced'](str, /* skip post processing? */ true);

                    if(str.length > 1){

                        str = str.split(regex_split);

                        for(var i = 0; i < str.length; i++){

                            var current = str[i];

                            if(current.length > 1){

                                // remove all vowels after 2nd char
                                str[i] = current[0] + replace(current.substring(1), regex_pairs)
                            }
                        }

                        str = str.join("");
                        str = collapseRepeatingChars(str);
                    }

                    return str;
                };
            })()

            // TODO: provide some common encoder plugins
            // soundex
            // cologne
            // metaphone
            // caverphone
            // levinshtein
            // hamming
            // matchrating
            // ngram
        };

        return BulkSearch;

        // ---------------------------------------------------------
        // Helpers

        function create_typed_array(type, size){

            /** @type {Function} */

            var array_type = (

                (type === 'int') || (type === 'integer') ?

                    Uint32Array
                :(
                    type === 'short' ?

                        Uint16Array
                    :(
                        (type === 'float') || (type === 'double') ?

                            Float64Array
                        :(
                            type === 'byte' ?

                                Uint8Array
                            :
                                Array
                        )
                    )
                )

            ) || Array;

            return new array_type(size);
        }

        /**
         * @param {!string} str
         * @returns {RegExp}
         */

        function regex(str){

            return new RegExp(str, 'g');
        }

        /**
         * @param {!string} str
         * @param {RegExp|Array} regex
         * @param {string=} replacement
         * @returns {string}
         */

        function replace(str, regex, replacement){

            if(typeof replacement === 'undefined'){

                for(var i = 0; i < /** @type {Array} */ (regex).length; i += 2){

                    str = str.replace(regex[i], regex[i + 1]);
                }

                return str;
            }
            else{

                return str.replace(/** @type {!RegExp} */ (regex), replacement);
            }
        }

        /**
         * @param {!Array|string} a
         * @param {!Array|string} b
         * @returns {number}
         */

        function sort_by_length_down(a, b){

            var diff = a.length - b.length;

            return (

                diff < 0 ?

                    1
                :(
                    diff > 0 ?

                        -1
                    :
                        0
                )
            );
        }

        /**
         * @param {!string} string
         * @returns {string}
         */

        function collapseRepeatingChars(string){

            var collapsed_string = '',
                char_prev = '',
                char_next = '';

            for(var i = 0; i < string.length; i++){

                var char = string[i];

                if(char !== char_prev){

                    if(i > 0 && char === 'h'){

                        var char_prev_is_vowel = (

                            char_prev === 'a' ||
                            char_prev === 'e' ||
                            char_prev === 'i' ||
                            char_prev === 'o' ||
                            char_prev === 'u' ||
                            char_prev === 'y'
                        );

                        var char_next_is_vowel = (

                            char_next === 'a' ||
                            char_next === 'e' ||
                            char_next === 'i' ||
                            char_next === 'o' ||
                            char_next === 'u' ||
                            char_next === 'y'
                        );

                        if(char_prev_is_vowel && char_next_is_vowel){

                            collapsed_string += char;
                        }
                    }
                    else{

                        collapsed_string += char;
                    }
                }

                char_next = (

                    (i === string.length - 1) ?

                        ''
                    :
                        string[i + 1]
                );

                char_prev = char;
            }

            return collapsed_string;
        }

        /**
         * @param {!string} content
         * @this {BulkSearch}
         * @returns {string}
         */

        function encodeContent(content){

            var dupes = {};
            var words = content.split(regex_split);

            content = "";

            for(var i = 0; i < words.length; i++){

                var value = words[i];

                if(value){

                    if(this.encode){

                        value = this.encode(value);
                    }

                    if(value){

                        if(!dupes[value]){

                            dupes[value] = "1";

                            content += value;
                        }
                    }
                }
            }

            return content;
        }
    })(
        // Xone Async Handler Fallback

        (function(){

            var stack = {};

            return function(fn, delay, id){

                var timer = stack[id];

                if(timer){

                    clearTimeout(timer);
                }

                return (

                    stack[id] = setTimeout(fn, delay)
                );
            };
        })(),

        // Xone Flexi-Cache Handler Fallback

        (function(){

            /** @this {Cache} */
            function Cache(){

                this.cache = {};
            }

            /** @this {Cache} */
            Cache.prototype.reset = function(){

                this.cache = {};
            };

            /** @this {Cache} */
            Cache.prototype.set = function(id, value){

                this.cache[id] = value;
            };

            /** @this {Cache} */
            Cache.prototype.get = function(id){

                return this.cache[id];
            };

            return Cache;
        })()

    ), this);

    /** --------------------------------------------------------------------------------------
     * UMD Wrapper for Browser and Node.js
     * @param {!string} name
     * @param {!Function|Object} factory
     * @param {!Function|Object=} root
     * @suppress {checkVars}
     * @const
     */

    function provide(name, factory, root){

        var prop;

        // AMD (RequireJS)
        if((prop = root['define']) && prop['amd']){

            prop([], function(){

                return factory;
            });
        }
        // Closure (Xone)
        else if((prop = root['modules'])){

            prop[name.toLowerCase()] = factory;
        }
        // CommonJS (Node.js)
        else if(typeof module !== 'undefined'){

            /** @export */
            module.exports = factory;
        }
        // Global (window)
        else{

            root[name] = factory;
        }
    }

}).call(this);
