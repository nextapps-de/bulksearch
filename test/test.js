if(typeof module !== 'undefined'){

    var env = process.argv[3] === 'test' ? '.min' : '';
    var expect = require('chai').expect;
    var BulkSearch = require("../bulksearch" + env + ".js");
}

var bulksearch_default;
var bulksearch_pager;
var bulksearch;

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
            size: 7,
            encode: false,
            multi: true,
            strict: false
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
        expect(bulksearch_default).to.respondTo("info");
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
        expect(bulksearch_custom.encoder).to.equal(test_encoder);
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
    });
});

describe('Search (Sync)', function(){

    it('Should have been matched from index', function(){

        expect(bulksearch.search("foo")).to.have.members([0, 1]);
        expect(bulksearch.search("bar")).to.include(2);
        expect(bulksearch.search("foobar")).to.include(1);

        expect(bulksearch.search("foo foo")).to.have.members([0, 1]);
        expect(bulksearch.search("foo  foo")).to.have.members([0, 1]);
    });

    it('Should have been limited', function(){

        expect(bulksearch.search("foo", 1)).to.include(0);
        expect(bulksearch.search("foo", 1)).to.not.include(1);
    });

    it('Should not have been matched from index', function(){

        expect(bulksearch.search("barfoo")).to.have.lengthOf(0);
        expect(bulksearch.search("")).to.have.lengthOf(0);
        expect(bulksearch.search("  ")).to.have.lengthOf(0);
        expect(bulksearch.search(" o ")).to.have.lengthOf(2);
    });
});

describe('Update (Sync)', function(){

    it('Should have been updated to the index', function(){

        bulksearch.update(0, "bar");
        bulksearch.update(2, "foobar");
        bulksearch.update(1, "foo");

        expect(bulksearch.length).to.equal(3);
        expect(bulksearch.search("foo")).to.have.members([2, 1]);
        expect(bulksearch.search("bar")).to.have.members([0, 2]);
        expect(bulksearch.search("foobar")).to.include(2);
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
        expect(bulksearch.search("foo")).to.have.members([2, 1]);
        expect(bulksearch.search("bar")).to.have.members([0, 2]);
        expect(bulksearch.search("foobar")).to.include(2);
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
// Async Tests
// ------------------------------------------------------------------------

describe('Search (Async)', function(){

    it('Should have been matched from index', function(done){

        bulksearch.add(0, "foo");
        bulksearch.add(2, "bar");
        bulksearch.add(1, "foobar");

        bulksearch.search("foo", function(result){

            expect(result).to.have.members([0, 1]);
        });

        bulksearch.search("bar", function(result){

            expect(result).to.include(2);
        });

        bulksearch.search("foobar", function(result){

            expect(result).to.include(1);
        });

        setTimeout(function(){

            done();

        }, 25);
    });

    it('Should have been limited', function(done){

        bulksearch.search("foo", 1, function(result){

            expect(result).to.include(0);
            expect(result).to.not.include(2);
        });

        setTimeout(function(){

            done();

        }, 25);
    });

    it('Should not have been matched from index', function(done){

        bulksearch.search("barfoo", function(result){

            expect(result).to.have.lengthOf(0);
        });

        bulksearch.search("", function(result){

            expect(result).to.have.lengthOf(0);
        });

        bulksearch.search(" ", function(result){

            expect(result).to.have.lengthOf(0);
        });

        bulksearch.search(" o ", function(result){

            expect(result).to.have.lengthOf(2);
        });

        setTimeout(function(){

            done();

        }, 25);
    });
});

// ------------------------------------------------------------------------
// Fragmentation + Optimize
// ------------------------------------------------------------------------

describe('Optimize', function(){

    it('Should have been fragmented', function(){

        bulksearch.update(0, "foobar foobar foobar");
        bulksearch.update(1, "foobar foobar foobar");
        bulksearch.update(2, "foobar foobar foobar");

        bulksearch.update(0, "foobar foobar foobar foobar foobar foobar");
        bulksearch.update(1, "foobar foobar foobar foobar foobar foobar");
        bulksearch.update(2, "foobar foobar foobar foobar foobar foobar");

        expect(bulksearch.search("foobar foobar foobar foobar foobar foobar")).to.have.lengthOf(3);
        expect(bulksearch.search("foobar")).to.have.lengthOf(3);
        expect(bulksearch.search(" f b ")).to.have.lengthOf(3);
    });

    it('Should have been optimized properly', function(){

        bulksearch.search("foobar");
        bulksearch.search("foobar");
        bulksearch.search("foobar");
        bulksearch.search("foobar");

        bulksearch.optimize();

        expect(bulksearch.search("foobar")).to.have.lengthOf(3);
        expect(bulksearch.search(" f b ")).to.have.lengthOf(3);
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

        bulksearch_icase.add(0, "123456");

        expect(bulksearch_icase.search("123456")).to.include(0);
        expect(bulksearch_icase.search("abcd")).to.include(0);
        expect(bulksearch_icase.encode("123456")).to.equal("abcddd");
    });
});

/* Test Helpers */

function test_encoder(str){

    return ('-[' + str.toUpperCase() + ']-');
}
