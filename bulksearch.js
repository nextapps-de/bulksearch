;/**!
 * @preserve BulkSearch v0.1.3
 * Copyright 2018 Thomas Wilkerling
 * Released under the Apache 2.0 Licence
 * https://github.com/nextapps-de/bulksearch
 */

/** @define {boolean} */
var SUPPORT_WORKER = true;

/** @define {boolean} */
var SUPPORT_BUILTINS = true;

/** @define {boolean} */
var SUPPORT_DEBUG = true;

/** @define {boolean} */
var SUPPORT_CACHE = true;

/** @define {boolean} */
var SUPPORT_ASYNC = true;

(function(){

    provide('BulkSearch', (function factory(register_worker){

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

            suggest: false,
            async: false,
            worker: false,

            // type-save separator
            separator: '~', // '^'

            // match when starts from beginning
            strict: false,

            // handle multiple words as separated queries
            multi: true,

            // boolean model of multiple words
            //boolean: false,

            // matching in strict order (multiple words)
            ordered: false,

            // use flexible cache (scales automatically)
            cache: false,

            // use on of built-in functions
            // or pass custom encoding algorithm
            encode: 'icase',

            // paging results
            paging: false,

            depth: 0,

            // default chunk size
            size: 4000 // 600 -> 2500 -> 4000 -> 5000 -> 10000
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
         * @enum {number}
         */

        var enum_task = {

            add: 0,
            update: 1,
            remove: 2
        };

        /**  @const  {RegExp} */
        var regex_split = regex("[ -\/]");

        var filter = {};

        var stemmer = {};

        /**
         * @param {Object<string, number|string|boolean|Object|function(string):string>=} options
         * @constructor
         * @private
         */

        function BulkSearch(options){

            options || (options = defaults);

            this.name = "BulkSearch";

            // generate UID

            /** @export */
            this.id = options['id'] || id_counter++;

            // initialize index

            this.init(options);

            // define functional properties

            registerProperty(this, 'index', /** @this {BulkSearch} */ function(){

                return this._marker;
            });

            registerProperty(this, 'length', /** @this {BulkSearch} */ function(){

                return Object.keys(this._marker).length;
            });
        }

        /**
         * @param {Object<string, number|string|boolean|Object|function(string):string>=} options
         * @export
         */

        BulkSearch.new = function(options){

            return new this(options);
        };

        /**
         * @param {Object<string, number|string|boolean|Object|function(string):string>=} options
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

            return this;
        };

        /**
         * @param {string} name
         * @param {function(string):string} encoder
         * @export
         */

        BulkSearch.registerEncoder = function(name, encoder){

            global_encoder[name] = encoder;

            return this;
        };

        /**
         * @param {string} lang
         * @param {Object} language_pack
         * @export
         */

        BulkSearch.registerLanguage = function(lang, language_pack){

            /**
             * @type {Array<string>}
             */

            filter[lang] = language_pack['filter'];

            /**
             * @type {Object<string, string>}
             */

            stemmer[lang] = language_pack['stemmer'];

            return this;
        };

        /**
         * @param {!string} name
         * @param {!string} value
         * @returns {string}
         * @export
         */

        BulkSearch.encode = function(name, value){

            return global_encoder[name].call(global_encoder, value);
        };

        /**
         * @param {Object<string, number|string|boolean|Object|function(string):string>=} options
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.init = function(options){

            /** @type {Array} */
            this._matcher = [];

            // apply options

            //if(options){

                options || (options = defaults);

                var custom;

            // initialize worker

            if(SUPPORT_WORKER && (custom = options['worker'])){

                if(typeof Worker === 'undefined'){

                    options['worker'] = false;

                    if(SUPPORT_ASYNC){

                        options['async'] = true;
                    }

                    this._worker = null;
                }
                else{

                    var self = this;
                    var threads = parseInt(custom, 10) || 4;

                    self._current_task = -1;
                    self._task_completed = 0;
                    self._task_result = [];
                    self._current_callback = null;
                    self._worker = new Array(threads);

                    for(var i = 0; i < threads; i++){

                        self._worker[i] = add_worker(self.id, i, options || defaults, function(id, query, result, limit){

                            if(self._task_completed === self.worker){

                                return;
                            }

                            self._task_result = self._task_result.concat(result);
                            self._task_completed++;

                            if(limit && (self._task_result.length >= limit)){

                                self._task_completed = self.worker;
                            }

                            if(self._current_callback && (self._task_completed === self.worker)){

                                if(typeof self._last_empty_query !== 'undefined'){

                                    if(self._task_result.length){

                                        self._last_empty_query = "";
                                    }
                                    else{

                                        self._last_empty_query || (self._last_empty_query = query);
                                    }
                                }

                                // store result to cache

                                if(self.cache){

                                    self._cache.set(query, self._task_result);
                                }

                                self._current_callback(self._task_result);
                                self._task_result = [];
                            }
                        });
                    }
                }
            }

                this.type = (

                    options['type'] ||
                    this.type ||
                    defaults.type
                );

                if(SUPPORT_ASYNC) this.async = (

                    options['async'] ||
                    this.async ||
                    defaults.async
                );

                if(SUPPORT_WORKER) this.worker = (

                    options['worker'] ||
                    this.worker ||
                    defaults.worker
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

                // this.boolean = (
                //
                //     options['boolean'] === 'or' ||
                //     this.boolean ||
                //     defaults.boolean
                // );

                this.paging = (

                    options['paging'] ||
                    this.paging ||
                    defaults.paging
                );

                this.depth = (

                    options['depth'] ||
                    this.depth ||
                    defaults.depth
                );

                this.suggest = (

                    options['suggest'] ||
                    this.suggest ||
                    defaults.suggest
                );

                custom = options['encode'];

                this.encoder = (

                    (custom && global_encoder[custom]) ||
                    (typeof custom === 'function' ? custom : this.encoder || false)
                );

                if(SUPPORT_DEBUG){

                    this.debug = (

                        options['debug'] ||
                        this.debug
                    );
                }

                if(custom = options['matcher']) {

                    this.addMatcher(

                        /** @type {Object<string, string>} */
                        (custom)
                    );
                }

                if((custom = options['filter'])) {

                    this.filter = initFilter(filter[custom] || custom, this.encoder);
                }

                if((custom = options['stemmer'])) {

                    this.stemmer = initStemmer(stemmer[custom] || custom, this.encoder);
                }

                /** @type {Object<string, number>} */
                this._scores = {};

                /** @type {number} */
                this._chunk_size = /** @type {number} */ (options['size'] || defaults.size);

                if(SUPPORT_CACHE) {

                    this.cache = custom = (

                        options['cache'] ||
                        this.cache ||
                        defaults.cache
                    );

                    this._cache = custom ?

                        (new cache(custom))
                    :
                        false;
                }
            //}

            // initialize index

            this._last_empty_query = "";
            this._pages = {};
            this._index = [create_typed_array(this.type, this._chunk_size)];
            this._marker = {};
            this._fragment = {};
            this._register = {};
            this._bulk = [""];
            this._chunk = 0;
            this._status = true;
            this._fragmented = 0;
            this._stack = {};
            this._stack_keys = [];
            this._cache = this.cache ?

                (new cache(30 * 1000, 50, true))
            :
                false;

            return this;
        };

        /**
         * @param {!string} value
         * @returns {string}
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.encode = function(value){

            if(value && global_matcher.length){

                value = replace(value, global_matcher);
            }

            if(value && this._matcher.length){

                value = replace(value, this._matcher);
            }

            if(value && this.encoder){

                value = this.encoder.call(global_encoder, value);
            }

            if(value && this.filter){

                var words = value.split(' ');
                //var final = "";

                for(var i = 0; i < words.length; i++){

                    var word = words[i];
                    var filter = this.filter[word];

                    if(filter){

                        //var length = word.length - 1;

                        //words[i] = filter;
                        words.splice(i, 1);
                    }
                }

                value = words.join(' '); // final;
            }

            if(value && this.stemmer){

                value = replace(value, this.stemmer);
            }

            return value;
        };

        /**
         * @param {Object<string, string>} custom
         * @export
         */

        BulkSearch.prototype.addMatcher = function(custom){

            var matcher = this._matcher;

            for(var key in custom){

                if(custom.hasOwnProperty(key)){

                    matcher[matcher.length] = regex(key);
                    matcher[matcher.length] = custom[key];
                }
            }

            return this;
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

                    if(SUPPORT_WORKER && this.worker){

                        if(++this._current_task >= this._worker.length) this._current_task = 0;

                        this._worker[this._current_task].postMessage(this._current_task, {

                            'add': true,
                            'id': id,
                            'content': content
                        });

                        this._marker[id] = "" + this._current_task;

                        return this;
                    }

                    if(SUPPORT_ASYNC && this.async){

                        this._stack[id] || (

                            this._stack_keys[this._stack_keys.length] = id
                        );

                        this._stack[id] = [

                            enum_task.add,
                            id,
                            content
                        ];

                        register_task(this);

                        return this;
                    }

                    if(encoded_content){

                        content = encoded_content;
                    }
                    else{

                        if(content){

                            content = encodeContent.call(this, content.trim());

                            if(!content){

                                return this;
                            }

                            content = '~' + (

                                this.strict ?

                                    content.replace(/ /g, '~')
                                :
                                    content
                            );
                        }
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

                            if(content.length > (this._chunk_size / 2 - 2)){

                                this._chunk_size = content.length * 2 + 2;
                            }

                            //content = '~' + content;

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

                        bulk[chunk_index] += content /*+ (this.strict ? '' : this.separator)*/;
                    }

                    if(this._index[chunk_index].constructor === Array){

                        for(var i = 0; i < content.length; i++){

                            this._index[chunk_index][index++] = id;
                        }
                    }
                    else{

                        this._index[chunk_index].fill(id, index, index + content.length /*+ 1*/);

                        index += content.length;
                    }

                    //if(!this.strict){

                        //index--;
                    //}

                    // assign end marker

                    marker[2] = index;

                    // push marker to the register

                    // if(this.depth){
                    //
                    //     for(var i = this.depth; i > 1; i--){
                    //
                    //         var key = content.substring(0, i);
                    //
                    //         this._register[key] || (this._register[key] = []);
                    //         this._register[key].push(marker);
                    //     }
                    // }

                    // update status

                    this._status = false;
                }
            }

            return this;
        };

        /**
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.update = function(id, content){

            if((typeof content === 'string') && (id || (id === 0))){

                var marker = this._marker[id];

                if(marker){

                    if(SUPPORT_WORKER && this.worker){

                        var int = parseInt(this._marker[id], 10);

                        this._worker[int].postMessage(int, {

                            'update': true,
                            'id': id,
                            'content': content
                        });

                        if(!content){

                            delete this._marker[id];
                        }

                        return this;
                    }

                    if(SUPPORT_ASYNC && this.async){

                        this._stack[id] || (

                            this._stack_keys[this._stack_keys.length] = id
                        );

                        this._stack[id] = [

                            enum_task.update,
                            id,
                            content
                        ];

                        register_task(this);

                        return this;
                    }

                    var old_content = content;

                    if(content){

                        content = encodeContent.call(this, content.trim());

                        if(!content){

                            return this;
                        }

                        content = '~' + (

                            this.strict ?

                                content.replace(/ /g, '~')
                            :
                                content
                        );
                    }

                    var min = marker[1];
                    var max = marker[2];
                    var old_length = max - min;
                    var overlap = content.length - old_length;
                    var encoded_content = content;

                    if(overlap > 0){

                        // clear content (bypass)

                        content = "~";
                    }
                    // else if(this.strict){
                    //
                    //     content = '~' + content;
                    // }

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

                    if((overlap > 0) || !old_content){

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

                        // add overlapping contents to the end

                        if(old_content){

                            this._marker[id] = null;
                            this._scores[id] = 0;

                            this.add(id, old_content, encoded_content);
                        }
                        else{

                            // delete marker

                            delete this._marker[id];
                            delete this._scores[id];
                        }
                    }

                    // update status

                    this._status = false;
                }
            }

            return this;
        };

        /**
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.remove = function(id){

            if(this._marker[id]){

                this.update(id, '');
            }

            return this;
        };

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
                    }

                    limit = limit['limit'];
                }
            }

            limit || (limit = 1000);

            if(SUPPORT_WORKER && this.worker){

                this._current_callback = callback;
                this._task_completed = 0;
                this._task_result = [];

                for(var i = 0; i < this.worker; i++){

                    this._worker[i].postMessage(i, {

                        'search': true,
                        'limit': limit,
                        'page': initial_page + ':' + initial_index,
                        'content': query
                    });
                }

                return null;
            }

            if(callback){

                if(initial_page || initial_index){

                    limit = {

                        'page': initial_page + ':' + initial_index,
                        'limit': limit
                    };
                }

                /** @type {BulkSearch} */
                var self = this;

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

                if(SUPPORT_CACHE && this.cache){

                    if(typeof this._last_empty_query !== 'undefined'){

                        this._last_empty_query = "";
                    }

                    this._cache.reset();
                }

                this._status = true;
            }

            // validate cache

            else if(SUPPORT_CACHE && this.cache){

                var cache = this._cache.get(query);

                if(cache){

                    return cache;
                }
            }

            // validate last query

            else if(this._last_empty_query && (query.indexOf(this._last_empty_query) !== -1)){

                return page || result;
            }

            // encode string

            _query = this.encode(/** @type {string} */ (_query.trim()));

            if(!_query.length){

                return page || result;
            }

            if(this.strict){

                // mask words start and ending

                _query = '~' + _query.replace(/ /g, ' ~');
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

                words.sort(sortByLengthDown);

                var collect_suggestions = this.suggest;
            }

            //var encoded = new Array(length);

            var suggestions = [];

            // perform search

            for(var z = initial_page; z < this._bulk.length; z++){

                var start = initial_index;
                var pos = 0;
                var bulk = this._bulk[z];
                var best_score;
                var initial_word = words[0];
                var skip_words = 0;

                initial_index = 0;

                if(initial_word && (initial_word !== '~')) while(((pos = bulk.indexOf(initial_word, start)) !== -1) || collect_suggestions){

                    if(collect_suggestions && (pos === -1)){

                        skip_words++;

                        if(skip_words === length + 1){

                            break
                        }
                        else{

                            collect_suggestions = length > (skip_words + 1);
                            initial_word = words[skip_words];

                            continue;
                        }
                    }

                    var current_id = this._index[z][pos];
                    var marker = this._marker[current_id];

                    if(marker){

                        var last_pos;
                        var min = marker[1];
                        var max = marker[2];
                        var context_length = max - min;
                        var matched = true;
                        var sub_bulk = bulk.substring(min, max);
                        var match_count = 0;

                        last_pos = pos - marker[1];

                        var partial_score = last_pos - sub_bulk.lastIndexOf('~', last_pos);

                        best_score = context_length / (context_length - last_pos) + partial_score / 3;

                        // check multiple word components

                        if(length > 1){

                            var check_words = {};
                            check_words[initial_word] = "1";

                            for(var i = 1; i < length; i++){

                                var value = words[i];

                                if(value && (value !== '~') && !check_words[value]){

                                    // supports contextual search

                                    var current_pos_reverse = sub_bulk.lastIndexOf(value, last_pos);
                                    var current_pos_forward = sub_bulk.indexOf(value, last_pos);

                                    if((current_pos_forward === -1) && (current_pos_reverse === -1)){

                                        matched = false;

                                        if(collect_suggestions){

                                            best_score += context_length;
                                        }
                                        else{

                                            break;
                                        }
                                    }
                                    else{

                                        match_count++;


                                        if((current_pos_forward === -1) || ((current_pos_reverse !== -1) && ((last_pos - current_pos_reverse) < (current_pos_forward - last_pos)))){

                                            partial_score = current_pos_reverse - sub_bulk.lastIndexOf('~', current_pos_reverse);
                                            best_score += context_length / (context_length - (last_pos - current_pos_reverse) ) + partial_score * 2;
                                            last_pos = current_pos_reverse;
                                        }
                                        else{

                                            partial_score = current_pos_forward - sub_bulk.lastIndexOf('~', current_pos_forward);
                                            best_score += context_length / (context_length - (current_pos_forward - last_pos) ) + partial_score * 2;
                                            last_pos = current_pos_forward;
                                        }
                                    }

                                    check_words[value] = "1";
                                }
                            }

                            best_score /= length;
                        }

                        // shift pointer (query was done for a specific entry)

                        pos = max - 1;

                        // collect results

                        if(matched){

                            // increase score

                            this._scores[current_id] ? this._scores[current_id]++ : this._scores[current_id] = 1;

                            result[result.length] = {

                                'score': best_score,
                                'id': current_id
                            };

                            // apply limit

                            if(limit && (result.length === limit)){

                                break;
                            }
                        }
                        else{

                            if(collect_suggestions){

                                var current_suggestion = suggestions[match_count] || (suggestions[match_count] = []);

                                current_suggestion[current_suggestion.length] = {

                                    'score': best_score, //match_count * -1,
                                    'id': current_id
                                };
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

            if(!result.length && collect_suggestions){

                var suggestion_limit = limit || 1000;
                var count = result.length;
                length = suggestions.length;

                if((count < suggestion_limit) && length){

                    for(var a = length - 1; a >= 0; a--){

                        var tmp = suggestions[a];

                        if(tmp){

                            for(i = 0; i < tmp.length; i++){

                                result[count++] = tmp[i];

                                if(suggestion_limit && (count === suggestion_limit)){

                                    a = -1;

                                    break;
                                }
                            }
                        }
                    }
                }
            }

            if(result.length){

                result.sort(sortByScoreUp);

                for(var i = 0; i < result.length; i++){

                    result[i] = result[i]['id'];
                }

                this._last_empty_query = "";
            }
            else{

                this._last_empty_query || (this._last_empty_query = query);
            }

            // store result to cache

            if(SUPPORT_CACHE && this.cache){

                this._cache.set(query, page || result);
            }

            return page || result;
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
                    // TODO why +1?
                    var current_value = bulk.substring(marker[1], marker[2]);

                    this.add(key, current_value, current_value);
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

        if(SUPPORT_DEBUG){

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
                    //'depth': this.depth,
                    'size': this._chunk_size,
                    'bytes': bytes,
                    'fragments': fragment_length,
                    'fragmented': fragmented,
                    'status': this._status,
                    'cache': this._stack_keys.length,
                    'matcher': global_matcher.length,
                    'worker': this.worker
                };
            };
        }

        /**
         * @this {BulkSearch}
         * @export
         */

        BulkSearch.prototype.reset = function(){

            // destroy index

            this.destroy();

            // initialize index

            return this.init();
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
            this._pages =
            this._stack =
            this._stack_keys = null;

            return this;
        };

        /** @const */

        var global_encoder_balance = (function(){

            var regex_whitespace = regex('\\s\\s+'),
                regex_strip = regex('[^a-z0-9 ]'),
                regex_space = regex('[-\/]'),
                regex_vowel = regex('[aeiouy]');

            /** @const {Array} */
            var regex_pairs = [

                regex_space, ' ',
                regex_strip, '',
                regex_whitespace, ' '
                //regex_vowel, ''
            ];

            return function(value){

                return collapseRepeatingChars(replace(value.toLowerCase(), regex_pairs));
            }
        })();

        /** @const */

        var global_encoder_icase = function(value){

            return value.toLowerCase();
        };

        /**
         * Phonetic Encoders
         * @dict {Function}
         * @private
         * @const
         * @final
         */

        var global_encoder = SUPPORT_BUILTINS ? {

            // case insensitive search

            'icase': global_encoder_icase,

            // simple phonetic normalization (latin)

            'simple': (function(){

                var regex_whitespace = regex('\\s\\s+'),
                    regex_strip = regex('[^a-z0-9 ]'),
                    regex_split = regex('[-\/]'),
                    regex_a = regex('[àáâãäå]'),
                    regex_e = regex('[èéêë]'),
                    regex_i = regex('[ìíîï]'),
                    regex_o = regex('[òóôõöő]'),
                    regex_u = regex('[ùúûüű]'),
                    regex_y = regex('[ýŷÿ]'),
                    regex_n = regex('ñ'),
                    regex_c = regex('ç'),
                    regex_s = regex('ß'),
                    regex_and = regex(' & ');

                /** @const {Array} */
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
                    regex_and, ' and ',
                    regex_split, ' ',
                    regex_strip, '',
                    regex_whitespace, ' '
                ];

                return function(str){

                    str = replace(str.toLowerCase(), regex_pairs);

                    return (

                        str !== ' ' ? str : ''
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
                    regex_pf = regex('pf'),
                    regex_ou = regex('ou'),
                    regex_uo = regex('uo');

                /** @const {Array} */
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
                    regex_pf, 'f',
                    regex_ou, 'o',
                    regex_uo, 'u'
                ];

                return /** @this {global_encoder} */ function(string, _skip_post_processing){

                    if(!string){

                        return string;
                    }

                    // perform simple encoding
                    string = this['simple'](string);

                    // normalize special pairs
                    if(string.length > 2){

                        string = replace(string, regex_pairs)
                    }

                    if(!_skip_post_processing){

                        // remove white spaces
                        //string = string.replace(regex_space, '');

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
                    //soundex_c = regex('[sz]'),
                    soundex_s = regex('z'),
                    soundex_k = regex('[cgq]'),
                    //soundex_i = regex('[jy]'),
                    soundex_m = regex('n'),
                    soundex_t = regex('d'),
                    soundex_f = regex('[vw]');

                /** @const {RegExp} */
                var regex_vowel = regex('[aeiouy]');

                /** @const {Array} */
                var regex_pairs = [

                    soundex_b, 'b',
                    soundex_s, 's',
                    soundex_k, 'k',
                    //soundex_i, 'i',
                    soundex_m, 'm',
                    soundex_t, 't',
                    soundex_f, 'f',
                    regex_vowel, ''
                ];

                return /** @this {global_encoder} */ function(str){

                    if(!str){

                        return str;
                    }

                    // perform advanced encoding
                    str = this['advanced'](str, /* skip post processing? */ true);

                    if(str.length > 1){

                        str = str.split(" ");

                        for(var i = 0; i < str.length; i++){

                            var current = str[i];

                            if(current.length > 1){

                                // remove all vowels after 2nd char
                                str[i] = current[0] + replace(current.substring(1), regex_pairs)
                            }
                        }

                        str = str.join(" ");
                        str = collapseRepeatingChars(str);
                    }

                    return str;
                };
            })(),

            'balance': global_encoder_balance

        } : {

            'icase': global_encoder_icase,
            'balance': global_encoder_balance
        };

        // Xone Async Handler Fallback

        var queue = SUPPORT_ASYNC ? (function(){

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

        })() : null;

        // Flexi-Cache

        var cache = SUPPORT_CACHE ? (function(){

            /** @this {Cache} */
            function Cache(limit){

                this.reset();

                this.limit = (limit !== true) && limit;
            }

            /** @this {Cache} */
            Cache.prototype.reset = function(){

                this.cache = {};
                this.count = {};
                this.index = {};
                this.keys = [];
            };

            /** @this {Cache} */
            Cache.prototype.set = function(id, value){

                if(this.limit && (typeof this.cache[id] === 'undefined')){

                    var length = this.keys.length;

                    if(length === this.limit){

                        length--;

                        var last_id = this.keys[length];

                        delete this.cache[last_id];
                        delete this.count[last_id];
                        delete this.index[last_id];
                    }

                    this.index[id] = length;
                    this.keys[length] = id;
                    this.count[id] = -1;
                    this.cache[id] = value;

                    // shift up counter +1

                    this.get(id);
                }
                else{

                    this.cache[id] = value;
                }
            };

            /**
             * Note: It is better to have the complexity when fetching the cache:
             * @this {Cache}
             */

            Cache.prototype.get = function(id){

                var cache = this.cache[id];

                if(this.limit && cache){

                    var count = ++this.count[id];
                    var index = this.index;
                    var current_index = index[id];

                    if(current_index > 0){

                        var keys = this.keys;
                        var old_index = current_index;

                        // forward pointer
                        while(this.count[keys[--current_index]] <= count){

                            if(current_index === -1){

                                break;
                            }
                        }

                        // move pointer back
                        current_index++;

                        if(current_index !== old_index){

                            // copy values from predecessors
                            for(var i = old_index; i > current_index; i--) {

                                var key = keys[i - 1];

                                keys[i] = key;
                                index[key] = i;
                            }

                            // push new value on top
                            keys[current_index] = id;
                            index[id] = current_index;
                        }
                    }
                }

                return cache;
            };

            return Cache;

        })() : null;

        return BulkSearch;

        // ---------------------------------------------------------
        // Helpers

        function registerProperty(obj, key, fn){

            // define functional properties

            Object.defineProperty(obj, key, {

                get: fn
            });
        }

        /**
         * @param {!string} str
         * @returns {RegExp}
         */

        function regex(str){

            return new RegExp(str, 'g');
        }

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

        function sortByLengthDown(a, b){

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
         * @param {!Array|string} a
         * @param {!Array|string} b
         * @returns {number}
         */

        function sortByScoreUp(a, b){

            var diff = a['score'] - b['score'];

            return (

                diff < 0 ?

                    -1
                :(
                    diff > 0 ?

                        1
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

                    if(i && (char === 'h')){

                        var char_prev_is_vowel = (

                            (char_prev === 'a') ||
                            (char_prev === 'e') ||
                            (char_prev === 'i') ||
                            (char_prev === 'o') ||
                            (char_prev === 'u') ||
                            (char_prev === 'y')
                        );

                        var char_next_is_vowel = (

                            (char_next === 'a') ||
                            (char_next === 'e') ||
                            (char_next === 'i') ||
                            (char_next === 'o') ||
                            (char_next === 'u') ||
                            (char_next === 'y')
                        );

                        if((char_prev_is_vowel && char_next_is_vowel) || (char_prev === ' ')){

                            collapsed_string += char;
                        }
                    }
                    else{

                        collapsed_string += char;
                    }
                }

                char_next = (

                    (i === (string.length - 1)) ?

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
            var result = [];
            var count = 0;

            for(var i = 0; i < words.length; i++){

                var value = words[i];

                if(value){

                    if(!dupes[value]){

                        dupes[value] = "1";

                        result[count++] = this.encode(value);
                    }
                }
            }

            return result.join('~');
        }

        /**
         * @param {Array<string>} words
         * @param encoder
         * @returns {Object<string, string>}
         */

        function initFilter(words, encoder){

            var final = {};

            if(words){

                for(var i = 0; i < words.length; i++){

                    var word = encoder ? encoder.call(global_encoder, words[i]) : words[i];

                    final[word] = String.fromCharCode((65000 - words.length) + i);
                }
            }

            return final;
        }

        /**
         * @param {Object<string, string>} stemmer
         * @param encoder
         * @returns {Array}
         */

        function initStemmer(stemmer, encoder){

            var final = [];

            if(stemmer){

                var count = 0;

                for(var key in stemmer){

                    if(stemmer.hasOwnProperty(key)){

                        var tmp = encoder ? encoder.call(global_encoder, key) : key;

                        final[count++] = regex('(?=.{' + (tmp.length + 3) + ',})' + tmp + '$');
                        final[count++] = encoder ? encoder.call(global_encoder, stemmer[key]) : stemmer[key];
                    }
                }
            }

            return final;
        }

        /**
         * @param {BulkSearch} ref
         */

        function runner(ref){

            var async = ref.async;
            var current;

            if(async){

                ref.async = false;
            }

            if(ref._stack_keys.length){

                var start = time();
                var key;

                while((key = ref._stack_keys.shift()) || (key === 0)){

                    current = ref._stack[key];

                    switch(current[0]){

                        case enum_task.add:

                            ref.add(current[1], current[2]);
                            break;

                        case enum_task.update:

                            ref.update(current[1], current[2]);
                            break;

                        // case enum_task.remove:
                        //
                        //     ref.remove(current[1]);
                        //     break;
                    }

                    ref._stack[key] = null;
                    delete ref._stack[key];

                    if((time() - start) > 100){

                        break;
                    }
                }

                if(ref._stack_keys.length){

                    register_task(ref);
                }
            }

            if(async){

                ref.async = async;
            }
        }

        /**
         * @param {BulkSearch} ref
         */

        function register_task(ref){

            ref._timer || (

                ref._timer = queue(function(){

                    ref._timer = null;

                    runner(ref);

                }, 1, 'search-async-' + ref.id)
            );
        }

        /**
         * @returns {number}
         */

        function time(){

            return (

                typeof performance !== 'undefined' ?

                    performance.now()
                    :
                    (new Date()).getTime()
            );
        }

        function add_worker(id, core, options, callback){

            var thread = register_worker(

                // name:
                'bulksearch',

                // id:
                'id' + id,

                // worker:
                function(){

                    var id;

                    /** @type {BulkSearch} */
                    var bulksearch;

                    /** @lends {Worker} */
                    self.onmessage = function(event){

                        var data = event['data'];

                        if(data){

                            // if(bulksearch.debug){
                            //
                            //     console.log("Worker Job Started: " + data['id']);
                            // }

                            if(data['search']){

                                var results = bulksearch['search'](data['content'],

                                    data['threshold'] ?

                                        {
                                            'limit': data['limit'],
                                            'threshold': data['threshold']
                                        }
                                    :
                                        data['limit']
                                );

                                /** @lends {Worker} */
                                self.postMessage({

                                    'id': id,
                                    'content': data['content'],
                                    'limit': data['limit'],
                                    'result':results
                                });
                            }
                            else if(data['add']){

                                bulksearch['add'](data['id'], data['content']);
                            }
                            else if(data['update']){

                                bulksearch['update'](data['id'], data['content']);
                            }
                            else if(data['remove']){

                                bulksearch['remove'](data['id']);
                            }
                            else if(data['reset']){

                                bulksearch['reset']();
                            }
                            else if(data['info']){

                                var info = bulksearch['info']();

                                info['worker'] = id;

                                if(bulksearch.debug){

                                    console.log(info);
                                }

                                /** @lends {Worker} */
                                //self.postMessage(info);
                            }
                            else if(data['register']){

                                id = data['id'];

                                data['options']['cache'] = false;
                                data['options']['async'] = true;
                                data['options']['worker'] = false;

                                bulksearch = new Function(

                                    data['register'].substring(

                                        data['register'].indexOf('{') + 1,
                                        data['register'].lastIndexOf('}')
                                    )
                                )();

                                bulksearch = new bulksearch(data['options']);
                            }
                        }
                    };
                },

                // callback:
                function(event){

                    var data = event['data'];

                    if(data && data['result']){

                        callback(data['id'], data['content'], data['result'], data['limit']);
                    }
                    else{

                        if(SUPPORT_DEBUG && options['debug']){

                            console.log(data);
                        }
                    }
                },

                // cores:
                core
            );

            var fn_str = factory.toString();

            options['id'] = core;

            thread.postMessage(core, {

                'register': fn_str,
                'options': options,
                'id': core
            });

            return thread;
        }
    })(
        // Xone Worker Handler Fallback

        SUPPORT_WORKER ? (function register_worker(){

            var worker_stack = {};
            var inline_is_supported = !!((typeof Blob !== 'undefined') && (typeof URL !== 'undefined') && URL.createObjectURL);

            return (

                /**
                 * @param {!string} _name
                 * @param {!number|string} _id
                 * @param {!Function} _worker
                 * @param {!Function} _callback
                 * @param {number=} _core
                 */

                function(_name, _id, _worker, _callback, _core){

                    var name = _name;
                    var worker_payload = (

                        inline_is_supported ?

                            /* Load Inline Worker */

                            URL.createObjectURL(

                                new Blob([

                                    'var SUPPORT_WORKER = true;' +
                                    'var SUPPORT_BUILTINS = ' + (SUPPORT_BUILTINS ? 'true' : 'false') + ';' +
                                    'var SUPPORT_DEBUG = ' + (SUPPORT_DEBUG ? 'true' : 'false') + ';' +
                                    'var SUPPORT_CACHE = ' + (SUPPORT_CACHE ? 'true' : 'false') + ';' +
                                    'var SUPPORT_ASYNC = ' + (SUPPORT_ASYNC ? 'true' : 'false') + ';' +
                                    '(' + _worker.toString() + ')()'
                                ],{
                                    'type': 'text/javascript'
                                })
                            )
                            :

                            /* Load Extern Worker (but also requires CORS) */

                            '../' + name + '.js'
                    );

                    name += '-' + _id;

                    worker_stack[name] || (worker_stack[name] = []);

                    worker_stack[name][_core] = new Worker(worker_payload);
                    worker_stack[name][_core]['onmessage'] = _callback;

                    if(SUPPORT_DEBUG){

                        console.log('Register Worker: ' + name + '@' + _core);
                    }

                    return {

                        'postMessage': function(id, data){

                            worker_stack[name][id]['postMessage'](data);
                        }
                    };
                }
            );
        })() : false

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
