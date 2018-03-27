if(typeof module !== 'undefined'){

    // Node.js Stub

    URL = function(string){};
    URL.createObjectURL = function(val){};
    Blob = function(string){};

    var env = process.argv[3] === 'test' ? 'min' : process.argv[3] === 'test/' ? 'light' : '';
    var expect = require('chai').expect;
    var BulkSearch = require("../bulksearch" + (env ? '.' + env : '') + ".js");
}

var bulksearch;
var bulksearch_default;
var bulksearch_pager;
var bulksearch_async;
var bulksearch_worker;
var bulksearch_cache;

var bulksearch_icase;
var bulksearch_simple;
var bulksearch_advanced;
var bulksearch_extra;
var bulksearch_custom;

// ------------------------------------------------------------------------
// Acceptance Tests
// ------------------------------------------------------------------------

describe('Initialize', function(){

    it('Should have been initialized successfully', function(){

        bulksearch_default = new BulkSearch();

        bulksearch = new BulkSearch({

            type: 'short',
            encode: false,
            multi: true,
            strict: true
        });

        bulksearch_icase = new BulkSearch({

            encode: 'icase',
            multi: true,
            strict: false
        });

        bulksearch_simple = BulkSearch.create({

            encode: 'simple',
            multi: true
        });

        bulksearch_advanced = new BulkSearch({

            encode: 'advanced',
            multi: true
        });

        bulksearch_extra = BulkSearch.create({

            encode: 'extra',
            multi: true
        });

        bulksearch_custom = new BulkSearch({

            encode: test_encoder,
            multi: true
        });

        bulksearch_pager = new BulkSearch({

            paging: true,
            multi: true
        });

        bulksearch_async = new BulkSearch({

            multi: true,
            strict: false,
            async: true
        });

        bulksearch_cache = new BulkSearch({

            multi: true,
            strict: false,
            cache: true
        });

        expect(bulksearch_default).to.be.an.instanceOf(BulkSearch);
        expect(bulksearch).to.be.an.instanceOf(BulkSearch);
    });

    it('Should have all provided methods', function(){

        expect(bulksearch_default).to.respondTo("search");
        expect(bulksearch_default).to.respondTo("add");
        expect(bulksearch_default).to.respondTo("update");
        expect(bulksearch_default).to.respondTo("remove");
        expect(bulksearch_default).to.respondTo("reset");
        expect(bulksearch_default).to.respondTo("init");

        if(env !== 'light'){

            expect(bulksearch_default).to.respondTo("info");
        }
    });

    it('Should have correct uuids', function(){

        expect(bulksearch_default.id).to.equal(0);
        expect(bulksearch.id).to.equal(1);
        expect(bulksearch_icase.id).to.equal(2);
        expect(bulksearch_simple.id).to.equal(3);
        expect(bulksearch_advanced.id).to.equal(4);
        expect(bulksearch_extra.id).to.equal(5);
    });

    it('Should have the correct options', function(){

        expect(bulksearch_default.type).to.equal('integer');
        expect(bulksearch.type).to.equal('short');

        // not available in compiled version:
        if(typeof bulksearch_custom.encoder !== 'undefined'){

            expect(bulksearch_custom.encoder).to.equal(test_encoder);
        }
    });
});

describe('Add (Sync)', function(){

    it('Should have been added to the index', function(){

        bulksearch.add(0, "foo");
        bulksearch.add(2, "bar");
        bulksearch.add(1, "foobar");

        expect(bulksearch.length).to.equal(3);
        expect(bulksearch.index).to.have.keys([0, 1, 2]);
    });

    it('Should not have been added to the index', function(){

        bulksearch.add("foo");
        bulksearch.add(3);
        bulksearch.add(null, "foobar");
        bulksearch.add(void 0, "foobar");
        bulksearch.add(3, null);
        bulksearch.add(3, false);
        bulksearch.add(3, []);
        bulksearch.add(3, {});
        bulksearch.add(3, function(){});

        expect(bulksearch.length).to.equal(3);
        expect(bulksearch.index).to.have.keys([0, 1, 2]);

        bulksearch.add(3, "");
        bulksearch.add(3, " ");
        bulksearch.add(3, "    ");
        bulksearch.add(3, "  -  ");

        expect(bulksearch.length).to.equal(3);
    });
});

describe('Search (Sync)', function(){

    it('Should have been matched from index', function(){

        expect(bulksearch.search("foo")).to.have.members([0, 1]);
        expect(bulksearch.search("bar")).to.include(2);
        expect(bulksearch.search("foobar")).to.include(1);

        expect(bulksearch.search("foo foo")).to.have.members([0, 1]);
        expect(bulksearch.search("foo  foo")).to.have.members([0, 1]);

        if(env !== 'light'){

            bulksearch_extra.add(4, "Thomas");
            bulksearch_extra.add(5, "Arithmetic");
            bulksearch_extra.add(6, "Mahagoni");

            expect(bulksearch_extra.search("tomass")).to.include(4);
            expect(bulksearch_extra.search("arytmetik")).to.include(5);
            expect(bulksearch_extra.search("mahagony")).to.include(6);
        }
    });

    it('Should have been limited', function(){

        expect(bulksearch.search("foo", 1)).to.include(0);
        expect(bulksearch.search({query: "foo", limit: 1})).to.include(0);
        expect(bulksearch.search("foo", 1)).to.not.include(1);
    });

    it('Should not have been matched from index', function(){

        expect(bulksearch.search("barfoo")).to.have.lengthOf(0);
        expect(bulksearch.search("")).to.have.lengthOf(0);
        expect(bulksearch.search("  ")).to.have.lengthOf(0);
        expect(bulksearch.search(" - ")).to.have.lengthOf(0);
        expect(bulksearch.search(" o ")).to.have.lengthOf(0);
    });
});

describe('Update (Sync)', function(){

    it('Should have been updated to the index', function(){

        bulksearch.update(0, "bar");
        bulksearch.update(2, "foobar");
        bulksearch.update(1, "foo");

        expect(bulksearch.length).to.equal(3);
        expect(bulksearch.search("foo")).to.have.members([2, 1]);
        expect(bulksearch.search("bar")).to.have.members([0]);
        expect(bulksearch.search("foobar")).to.include(2);

        // bypass update:

        bulksearch.add(2, "bar");
        bulksearch.add(0, "foo");
        bulksearch.add(1, "foobar");

        expect(bulksearch.length).to.equal(3);
        expect(bulksearch.search("foo")).to.have.members([0, 1]);
        expect(bulksearch.search("bar")).to.include(2);
        expect(bulksearch.search("foobar")).to.include(1);
    });

    it('Should not have been updated to the index', function(){

        bulksearch.update("foo");
        bulksearch.update(0);
        bulksearch.update(null, "foobar");
        bulksearch.update(void 0, "foobar");
        bulksearch.update(1, null);
        bulksearch.update(2, false);
        bulksearch.update(0, []);
        bulksearch.update(1, {});
        bulksearch.update(2, function(){});

        expect(bulksearch.length).to.equal(3);
        expect(bulksearch.search("foo")).to.have.members([0, 1]);
        expect(bulksearch.search("bar")).to.have.members([2]);
        expect(bulksearch.search("foobar")).to.include(1);
    });
});

describe('Remove (Sync)', function(){

    it('Should have been removed from the index', function(){

        bulksearch.remove(0);
        bulksearch.remove(2);
        bulksearch.remove(1);

        expect(bulksearch.length).to.equal(0);
        expect(bulksearch.search("foo")).to.have.lengthOf(0);
        expect(bulksearch.search("bar")).to.have.lengthOf(0);
        expect(bulksearch.search("foobar")).to.have.lengthOf(0);
    });
});

// ------------------------------------------------------------------------
// Scoring
// ------------------------------------------------------------------------

describe('Apply Sort by Scoring', function(){

    it('Should have been sorted properly by scoring', function(){

        bulksearch.add(0, "foo bar foobar");
        bulksearch.add(2, "bar foo foobar");
        bulksearch.add(1, "foobar foo bar");

        expect(bulksearch.length).to.equal(3);
        expect(bulksearch.search("foo")[0]).to.equal(0);
        expect(bulksearch.search("foo")[1]).to.equal(1);
        expect(bulksearch.search("foo")[2]).to.equal(2);

        expect(bulksearch.search("bar")[0]).to.equal(2);
        expect(bulksearch.search("bar")[1]).to.equal(0); // partial scoring!
        expect(bulksearch.search("bar")[2]).to.equal(1);

        expect(bulksearch.search("foobar")[0]).to.equal(1);
        expect(bulksearch.search("foobar")[1]).to.equal(0);
        expect(bulksearch.search("foobar")[2]).to.equal(2);
    });

    // it('Should have been sorted properly by threshold', function(){
    //
    //     bulksearch_icase.add(0, "foobarxxx foobarfoobarfoobarxxx foobarfoobarfoobaryyy foobarfoobarfoobarzzz");
    //
    //     expect(bulksearch_icase.search("xxx").length).to.equal(1);
    //     expect(bulksearch_icase.search("yyy").length).to.equal(1);
    //     expect(bulksearch_icase.search("zzz").length).to.equal(1);
    //
    //     expect(bulksearch_icase.search({query: "xxx", threshold: 2}).length).to.equal(1);
    //     expect(bulksearch_icase.search({query: "xxx", threshold: 3}).length).to.equal(1);
    //     expect(bulksearch_icase.search({query: "xxx", threshold: 5}).length).to.equal(1);
    //     expect(bulksearch_icase.search({query: "xxx", threshold: 7}).length).to.equal(0); // <-- stop
    //
    //     expect(bulksearch_icase.search({query: "yyy", threshold: 0}).length).to.equal(1);
    //     expect(bulksearch_icase.search({query: "yyy", threshold: 2}).length).to.equal(1);
    //     expect(bulksearch_icase.search({query: "yyy", threshold: 5}).length).to.equal(0); // <-- stop
    //
    //     expect(bulksearch_icase.search({query: "zzz", threshold: 0}).length).to.equal(1);
    //     expect(bulksearch_icase.search({query: "zzz", threshold: 1}).length).to.equal(1);
    //     expect(bulksearch_icase.search({query: "zzz", threshold: 3}).length).to.equal(0); // <-- stop
    // });
});

// ------------------------------------------------------------------------
// Async Tests
// ------------------------------------------------------------------------

describe('Add (Async)', function(){

    it('Should have been added to the index', function(done){

        bulksearch_async.add(0, "foo");
        bulksearch_async.add(2, "bar");
        bulksearch_async.add(1, "foobar");

        expect(bulksearch_async.length).to.equal(0);

        setTimeout(function(){

            expect(bulksearch_async.length).to.equal(3);
            expect(bulksearch_async.index).to.have.keys([0, 1, 2]);

            done();

        }, 25);
    });

    it('Should not have been added to the index', function(done){

        bulksearch_async.add("foo");
        bulksearch_async.add(3);
        bulksearch_async.add(null, "foobar");
        bulksearch_async.add(void 0, "foobar");
        bulksearch_async.add(3, null);
        bulksearch_async.add(3, false);
        bulksearch_async.add(3, []);
        bulksearch_async.add(3, {});
        bulksearch_async.add(3, function(){});

        setTimeout(function(){

            expect(bulksearch_async.length).to.equal(3);
            expect(bulksearch_async.index).to.have.keys([0, 1, 2]);

            done();

        }, 25);
    });
});

describe('Search (Async)', function(){

    it('Should have been matched from index', function(done){

        bulksearch_async.search("foo", function(result){

            expect(result).to.have.members([0, 1]);

            bulksearch_async.search("bar", function(result){

                expect(result).to.include(2);

                bulksearch_async.search("foobar", function(result){

                    expect(result).to.include(1);

                    done();
                });
            });
        });
    });

    it('Should have been limited', function(done){

        bulksearch_async.search("foo", 1, function(result){

            expect(result).to.include(0);
            expect(result).to.not.include(2);

            done();
        });
    });

    it('Should not have been matched from index', function(done){

        bulksearch_async.search("barfoo", function(result){

            expect(result).to.have.lengthOf(0);

            bulksearch_async.search("", function(result){

                expect(result).to.have.lengthOf(0);

                bulksearch_async.search(" ", function(result){

                    expect(result).to.have.lengthOf(0);

                    bulksearch_async.search(" o ", function(result){

                        expect(result).to.have.lengthOf(2);

                        done();
                    });
                });
            });
        });
    });
});

describe('Update (Async)', function(){

    it('Should have been updated to the index', function(done){

        bulksearch_async.update(0, "bar");
        bulksearch_async.update(2, "foobar");
        bulksearch_async.update(1, "foo");

        expect(bulksearch_async.length).to.equal(3);
        expect(bulksearch_async.search("foo")).to.have.members([0, 1]);
        expect(bulksearch_async.search("bar")).to.have.members([1, 2]);
        expect(bulksearch_async.search("foobar")).to.have.members([1]);

        setTimeout(function(){

            expect(bulksearch_async.length).to.equal(3);
            expect(bulksearch_async.search("foo")).to.have.members([2, 1]);
            expect(bulksearch_async.search("bar")).to.have.members([0, 2]);
            expect(bulksearch_async.search("foobar")).to.have.members([2]);

            done();

        }, 25);
    });

    it('Should not have been updated to the index', function(done){

        bulksearch_async.update("foo");
        bulksearch_async.update(0);
        bulksearch_async.update(null, "foobar");
        bulksearch_async.update(void 0, "foobar");
        bulksearch_async.update(1, null);
        bulksearch_async.update(2, false);
        bulksearch_async.update(0, []);
        bulksearch_async.update(1, {});
        bulksearch_async.update(2, function(){});

        setTimeout(function(){

            expect(bulksearch_async.length).to.equal(3);
            expect(bulksearch_async.search("foo")).to.have.members([2, 1]);
            expect(bulksearch_async.search("bar")).to.have.members([0, 2]);
            expect(bulksearch_async.search("foobar")).to.have.members([2]);

            done();

        }, 25);
    });
});

describe('Remove (Async)', function(){

    it('Should have been removed from the index', function(done){

        bulksearch_async.remove(0);
        bulksearch_async.remove(2);
        bulksearch_async.remove(1);

        expect(bulksearch_async.length).to.equal(3);
        expect(bulksearch_async.search("foo")).to.have.lengthOf(2);
        expect(bulksearch_async.search("bar")).to.have.lengthOf(2);
        expect(bulksearch_async.search("foobar")).to.have.lengthOf(1);

        setTimeout(function(){

            expect(bulksearch_async.length).to.equal(0);
            expect(bulksearch_async.search("foo")).to.have.lengthOf(0);
            expect(bulksearch_async.search("bar")).to.have.lengthOf(0);
            expect(bulksearch_async.search("foobar")).to.have.lengthOf(0);

            done();

        }, 25);
    });
});

// ------------------------------------------------------------------------
// Fragmentation + Optimize
// ------------------------------------------------------------------------

describe('Optimize', function(){

    it('Should have been fragmented', function(){

        bulksearch.add(0, "foobar");
        bulksearch.add(1, "foobar");
        bulksearch.add(2, "foobar");

        bulksearch.update(0, "foobar foobar foobar");
        bulksearch.update(1, "foobar foobar foobar");
        bulksearch.update(2, "foobar foobar foobar");

        bulksearch.update(0, "foobar foobar foobar foobar foobar foobar");
        bulksearch.update(1, "foobar foobar foobar foobar foobar foobar");
        bulksearch.update(2, "foobar foobar foobar foobar foobar foobar");

        expect(bulksearch.search("foobar foobar foobar foobar foobar foobar")).to.have.lengthOf(3);
        expect(bulksearch.search("foobar")).to.have.lengthOf(3);
        expect(bulksearch.search(" foo foo ")).to.have.lengthOf(3);
    });

    it('Should have been optimized properly', function(){

        bulksearch.search("foobar");
        bulksearch.search("foobar");
        bulksearch.search("foobar");
        bulksearch.search("foobar");

        expect(bulksearch.search("foobar")).to.have.lengthOf(3);

        bulksearch.optimize();

        expect(bulksearch.search("foobar")).to.have.lengthOf(3);
        expect(bulksearch.search(" foo foo ")).to.have.lengthOf(3);
    });
});

// ------------------------------------------------------------------------
// Pagination
// ------------------------------------------------------------------------

describe('Pagination', function(){

    it('Should have been pagingd properly', function(){

        var query = bulksearch_pager.search("foobar", 2);

        expect(query).to.have.keys(['current', 'prev', 'next', 'results']);
        expect(query.results).to.have.lengthOf(0);
        expect(query.current).to.equal('0:0');
        expect(query.next).to.equal(null);
        expect(query.prev).to.equal(null);

        bulksearch_pager.add(0, "foobar");
        bulksearch_pager.add(1, "foobar");
        bulksearch_pager.add(2, "foobar");
        bulksearch_pager.add(3, "foobar");
        bulksearch_pager.add(4, "foobar");
        bulksearch_pager.add(5, "foobar");

        query = bulksearch_pager.search("foobar", 2);

        expect(query).to.have.keys(['current', 'prev', 'next', 'results']);
        expect(query.results).to.have.lengthOf(2);
        expect(query.results).to.have.members([0, 1]);
        expect(query.prev).to.equal(null);
        expect(query.next).not.to.equal(null);

        query = bulksearch_pager.search("foobar", {limit: 2});

        expect(query).to.have.keys(['current', 'prev', 'next', 'results']);
        expect(query.results).to.have.lengthOf(2);
        expect(query.results).to.have.members([0, 1]);
        expect(query.current).to.equal('0:0');
        expect(query.prev).to.equal(null);
        expect(query.next).not.to.equal(null);

        query = bulksearch_pager.search("foobar", {page: query.next, limit: 3});

        expect(query).to.have.keys(['current', 'prev', 'next', 'results']);
        expect(query.results).to.have.lengthOf(3);
        expect(query.results).to.have.members([2, 3, 4]);
        expect(query.current).not.to.equal('0:0');
        expect(query.prev).to.equal('0:0');
        expect(query.next).not.to.equal(null);

        query = bulksearch_pager.search("foobar", {page: query.next});

        expect(query).to.have.keys(['current', 'prev', 'next', 'results']);
        expect(query.results).to.have.lengthOf(1);
        expect(query.results).to.have.members([5]);
        expect(query.current).not.to.equal('0:0');
        expect(query.prev).not.to.equal(null);
        expect(query.next).to.equal(null);

        query = bulksearch_pager.search("foobar", {page: query.prev});

        expect(query).to.have.keys(['current', 'prev', 'next', 'results']);
        expect(query.results).to.have.lengthOf(4);
        expect(query.results).to.have.members([2, 3, 4, 5]);
        expect(query.current).not.to.equal('0:0');
        expect(query.prev).not.to.equal(null);
        expect(query.next).to.equal(null);
    });
});

// ------------------------------------------------------------------------
// Worker Tests
// ------------------------------------------------------------------------

describe('Add (Worker)', function(){

    it('Should support worker', function(done){

        if(typeof Worker === 'undefined'){

            Worker = function(string){};
            Worker.prototype.postMessage = function(val){
                this.onmessage(val);
            };
            Worker.prototype.onmessage = function(val){
                return val;
            };
        }

        bulksearch_worker = new BulkSearch({

            encode: 'icase',
            mode: 'strict',
            async: false,
            worker: 4
        });

        done();
    });

    it('Should have been added to the index', function(done){

        bulksearch_worker.add(0, "foo");
        bulksearch_worker.add(2, "bar");
        bulksearch_worker.add(1, "foobar");

        setTimeout(function(){

            expect(bulksearch_worker.length).to.equal(3);
            expect(bulksearch_worker.index).to.have.keys([0, 1, 2]);

            bulksearch_worker.search("foo", function(result){

                expect(result).to.have.length(0);
            });

            done();

        }, 25);
    });

    it('Should not have been added to the index', function(done){

        bulksearch_worker.add("foo");
        bulksearch_worker.add(3);
        bulksearch_worker.add(null, "foobar");
        bulksearch_worker.add(void 0, "foobar");
        bulksearch_worker.add(3, null);
        bulksearch_worker.add(3, false);
        bulksearch_worker.add(3, []);
        bulksearch_worker.add(3, {});
        bulksearch_worker.add(3, function(){});

        setTimeout(function(){

            expect(bulksearch_worker.length).to.equal(3);
            expect(bulksearch_worker.index).to.have.keys([0, 1, 2]);

            done();

        }, 25);
    });
});

describe('Search (Worker)', function(){

    it('Should have been matched from index', function(done){

        bulksearch_worker.search("foo", function(result){

            expect(result).to.have.members([0, 1]);
        });

        bulksearch_worker.search("bar", function(result){

            expect(result).to.have.members([2, 1]);
        });

        bulksearch_worker.search("foobar", function(result){

            expect(result).to.have.members([1]);
        });

        setTimeout(function(){

            done();

        }, 25);
    });

    it('Should have been limited', function(done){

        bulksearch_worker.search("foo", 1, function(result){

            expect(result).to.include(0);
            expect(result).to.not.include(1);
        });

        setTimeout(function(){

            done();

        }, 25);
    });

    it('Should not have been matched from index', function(done){

        bulksearch_worker.search("barfoo", function(result){

            expect(result).to.have.lengthOf(0);
        });

        bulksearch_worker.search("", function(result){

            expect(result).to.have.lengthOf(0);
        });

        bulksearch_worker.search(" ", function(result){

            expect(result).to.have.lengthOf(0);
        });

        bulksearch_worker.search(" o ", function(result){

            expect(result).to.have.lengthOf(0);
        });

        setTimeout(function(){

            done();

        }, 25);
    });
});

describe('Update (Worker)', function(){

    it('Should have been updated to the index', function(done){

        bulksearch_worker.update(0, "bar");
        bulksearch_worker.update(2, "foobar");
        bulksearch_worker.update(1, "foo");

        expect(bulksearch_worker.length).to.equal(3);

        bulksearch_worker.search("foo", function(results){

            expect(results).to.have.members([2, 1]);
        });

        bulksearch_worker.search("bar", function(results){

            expect(results).to.have.members([0, 2]);
        });

        bulksearch_worker.search("foobar", function(results){

            expect(results).to.have.members([2]);
        });

        setTimeout(function(){

            done();

        }, 25);
    });
});

describe('Remove (Worker)', function(){

    it('Should have been removed from the index', function(done){

        bulksearch_worker.remove(0);
        bulksearch_worker.remove(2);
        bulksearch_worker.remove(1);

        expect(bulksearch_worker.length).to.equal(0);

        bulksearch_worker.search("foo", function(results){

            expect(results).to.not.include(1);
            expect(results).to.not.include(2);
        });

        bulksearch_worker.search("bar", function(results){

            expect(results).to.not.include(0);
            expect(results).to.not.include(2);
        });

        bulksearch_worker.search("foobar", function(results){

            expect(results).to.not.include(2);
        });

        setTimeout(function(){

            done();

        }, 25);
    });

    it('Should have been debug mode activated', function(){

        bulksearch_worker.info();
    });
});

describe('Worker Not Supported', function(){

    it('Should not support worker', function(){

        if(typeof Worker !== 'undefined'){

            Worker = void 0;
        }

        bulksearch_worker = new BulkSearch({

            encode: false,
            async: true,
            worker: 4
        });

        expect(bulksearch_worker.info().worker).to.equal(false);
    });
});

// ------------------------------------------------------------------------
// Phonetic Tests
// ------------------------------------------------------------------------

describe('Encoding', function(){

    it('Should have been encoded properly: iCase', function(){

        expect(bulksearch_icase.encode("Björn-Phillipp Mayer")).to.equal(bulksearch_icase.encode("björn-phillipp mayer"));
    });

    it('Should have been encoded properly: Simple', function(){

        expect(bulksearch_simple.encode("Björn-Phillipp Mayer")).to.equal(bulksearch_simple.encode("bjorn/phillipp mayer"));
    });

    it('Should have been encoded properly: Advanced', function(){

        expect(bulksearch_advanced.encode("Björn-Phillipp Mayer")).to.equal(bulksearch_advanced.encode("bjoern filip mair"));
    });

    it('Should have been encoded properly: Extra', function(){

        expect(bulksearch_extra.encode("Björn-Phillipp Mayer")).to.equal(bulksearch_extra.encode("bjorm filib mayr"));
    });

    it('Should have been encoded properly: Custom Encoder', function(){

        expect(bulksearch_custom.encode("Björn-Phillipp Mayer")).to.equal("-[BJÖRN-PHILLIPP MAYER]-");
    });

    it('Should have been encoded properly: Custom Encoder', function(){

        BulkSearch.registerEncoder('custom', test_encoder);

        expect(BulkSearch.encode('custom', "Björn-Phillipp Mayer")).to.equal(bulksearch_custom.encode("Björn-Phillipp Mayer"));
    });
});

// ------------------------------------------------------------------------
// Relevance Tests
// ------------------------------------------------------------------------

describe('Relevance', function(){

    it('Should have been sorted by relevance properly', function(){

        var index = new BulkSearch({
            encode: 'advanced',
            multi: true,
            strict: true
        });

        index.add(0, "1 2 3 2 4 1 5 3");
        index.add(1, "zero one two three four five six seven eight nine ten");
        index.add(2, "four two zero one three ten five seven eight six nine");

        expect(index.search("1")).to.have.members([0]);
        expect(index.search("one")).to.have.members([1, 2]);
        expect(index.search("one two")).to.have.members([1, 2]);
        expect(index.search("four one")).to.have.members([1, 2]);

        var index = new BulkSearch({
            encode: 'advanced',
            multi: true,
            strict: true
        });

        index.add(0, "1 2 3 2 4 1 5 3");
        index.add(1, "zero one two three four five six seven eight nine ten");
        index.add(2, "four two zero one three ten five seven eight six nine");

        expect(index.search("1")).to.have.members([0]);
        expect(index.search("one")).to.have.members([1, 2]);
        expect(index.search("one two")).to.have.members([1, 2]);
        expect(index.search("four one")).to.have.members([1, 2]);
    });
});

// ------------------------------------------------------------------------
// Suggestion Tests
// ------------------------------------------------------------------------

describe('Suggestion', function(){

    it('Should have been suggested properly by relevance', function(){

        var index = new BulkSearch({
            encode: 'advanced',
            strict: true,
            multi: true,
            suggest: true
        });

        index.add(0, "1 2 3 2 4 1 5 3");
        index.add(1, "zero one two three four five six seven eight nine ten");
        index.add(2, "four two zero one three ten five seven eight six nine");

        expect(index.search("1 3 4 7")).to.have.members([0]);
        expect(index.search("1 3 9 7")).to.have.members([0]);
        expect(index.search("one foobar two")).to.have.members([1, 2]);
        expect(index.search("zero one foobar two foobar")).to.have.members([1, 2]);
        //TODO
        //expect(index.search("zero one foobar two foobar")[0]).to.equal(1);
    });
});

// ------------------------------------------------------------------------
// Feature Tests
// ------------------------------------------------------------------------

describe('Add Matchers', function(){

    it('Should have been added properly', function(){

        BulkSearch.addMatcher({

            '1': 'a',
            '2': 'b',
            '3': 'c',
            '[456]': 'd'
        });

        bulksearch_icase.init({

            encode: false

        }).init({

            encode: 'not-found',
            matcher: {

                '7': 'e'
            }

        }).addMatcher({

            '8': 'f'

        }).add(0, "12345678");

        expect(bulksearch_icase.search("12345678")).to.include(0);
        expect(bulksearch_icase.search("abcd")).to.include(0);
        expect(bulksearch_icase.encode("12345678")).to.equal("abcdddef");
    });
});

// ------------------------------------------------------------------------
// Caching
// ------------------------------------------------------------------------

if(env !== 'light'){

    describe('Caching', function(){

        it('Should have been cached properly', function(){

            bulksearch_cache.add(0, 'foo')
                            .add(1, 'bar')
                            .add(2, 'foobar');
            // fetch:

            expect(bulksearch_cache.search("foo")).to.have.members([0, 2]);
            expect(bulksearch_cache.search("bar")).to.have.members([1, 2]);
            expect(bulksearch_cache.search("foobar")).to.include(2);

            // cache:

            expect(bulksearch_cache.search("foo")).to.have.members([0, 2]);
            expect(bulksearch_cache.search("bar")).to.have.members([1, 2]);
            expect(bulksearch_cache.search("foobar")).to.include(2);

            // update:

            bulksearch_cache.remove(2).update(1, 'foo').add(3, 'foobar');

            // fetch:

            expect(bulksearch_cache.search("foo")).to.have.members([0, 1, 3]);
            expect(bulksearch_cache.search("bar")).to.include(3);
            expect(bulksearch_cache.search("foobar")).to.include(3);

            // cache:

            expect(bulksearch_cache.search("foo")).to.have.members([0, 1, 3]);
            expect(bulksearch_cache.search("bar")).to.include(3);
            expect(bulksearch_cache.search("foobar")).to.include(3);
        });
    });
}

// ------------------------------------------------------------------------
// Debug Information
// ------------------------------------------------------------------------

if(env !== 'light'){

    describe('Debug', function(){

        it('Should have been debug mode activated', function(){

            var info = bulksearch_cache.info();

            expect(info).to.have.keys([

                'id',
                'bytes',
                'status',
                'cache',
                'chunks',
                'matcher',
                'fragmented',
                'fragments',
                'worker',
                'length',
                'size',
                'register'
            ]);
        });
    });
}

// ------------------------------------------------------------------------
// Chaining
// ------------------------------------------------------------------------

describe('Chaining', function(){

    it('Should have been chained properly', function(){

        var index = BulkSearch.create({strict: false, encode: 'icase'})
                              .addMatcher({'â': 'a'})
                              .add(0, 'foo')
                              .add(1, 'bar');

        expect(index.search("foo")).to.include(0);
        expect(index.search("bar")).to.include(1);
        expect(index.encode("bâr")).to.equal("bar");

        index.remove(0).update(1, 'foo').add(2, 'foobâr');

        expect(index.search("foo")).to.have.members([1, 2]);
        expect(index.search("bar")).to.have.members([2]);
        expect(index.search("foobar")).to.have.members([2]);

        index.reset().add(0, 'foo').add(1, 'bar');

        expect(index.search("foo")).to.have.members([0]);
        expect(index.search("bar")).to.have.members([1]);
        expect(index.search("foobar")).to.have.lengthOf(0);

        bulksearch_cache.destroy().init().add(0, 'foo').add(1, 'bar');

        expect(bulksearch_cache.search("foo")).to.include(0);
        expect(bulksearch_cache.search("bar")).to.include(1);
        expect(bulksearch_cache.search("foobar")).to.have.lengthOf(0);
    });
});

/* Test Helpers */

function test_encoder(str){

    return '-[' + str.toUpperCase() + ']-';
}
