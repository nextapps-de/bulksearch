# BulkSearch

### Superfast, lightweight and read-write optimized full text search library.

When it comes to the __overall speed__, BulkSearch outperforms every searching library out there and also provides flexible search capabilities like multi-word matching, phonetic transformations or partial matching. It is essentially based on how a HDD manages files in a filesystem. Adding, updating or removing items are as fast as searching for them, but also consumes some additional memory. When your index doesn't need to be updated frequently then <a href="flexsearch/" target="_blank">FlexSearch</a> may be a better choice. BulkSearch also provides you a asynchronous processing model to perform queries in the background. 

Benchmark:
- Comparison: <a href="https://jsperf.com/compare-search-libraries" target="_blank">https://jsperf.com/compare-search-libraries</a>
- Detailed: <a href="https://jsperf.com/bulksearch" target="_blank">https://jsperf.com/bulksearch</a>

Supported Platforms:
- Browser
- Node.js

Supported Module Definitions:
- AMD (RequireJS)
- CommonJS (Node.js)
- Closure (Xone)
- Global (Browser)

All Features:
<ul>
    <li>Partial Words</li>
    <li>Multiple Words</li>
    <li>Flexible Word Order</li>
    <li><a href="#phonetic">Phonetic Search</a></li>
    <li>Limit Results</li>
    <li><a href="#pagination">Pagination</a></li>
    <li>Caching</li>
    <li>Asynchronous Mode</li>
    <li>Custom Matchers</li>
    <li>Custom Encoders</li>
</ul>

## Installation

##### HTML / Javascript

```html
<html>
<head>
    <script src="js/bulksearch.min.js"></script>
</head>
...
```
__Note:__ Use _bulksearch.min.js_ for production and _bulksearch.js_ for development.

Use latest from CDN:
```html
<script src="https://cdn.rawgit.com/nextapps-de/bulksearch/master/bulksearch.min.js"></script>
```

##### Node.js

```npm
npm install bulksearch
```

In your code include as follows:

```javascript
var BulkSearch = require("bulksearch");
```

Or pass in options when requiring:

```javascript
var index = require("bulksearch").create({/* options */});
```

__AMD__

```javascript
var BulkSearch = require("./bulksearch.js");
```

#### Compare BulkSearch vs. FlexSearch

<table>
    <tr></tr>
    <tr>
        <th align="left">Description</th>
        <th align="left">BulkSearch</th>
        <th align="left">FlexSearch</th>
    </tr>
    <tr>
        <td>Access</td>
        <td>Read-Write optimized index</td>
        <td>Read-Memory optimized index</td>
    </tr>
    <tr></tr>
    <tr>
        <td>Memory</td>
        <td>Large (~ 90 bytes per word)</td>
        <td>Tiny (~ 2 bytes per word)</td>
    </tr>
    <tr></tr>
    <tr>
        <td>Usage</td>
        <td><ul><li>Limited content</li><li>Index updates continously</li></ul></td>
        <td><ul><li>Fastest possible search</li><li>Rare updates on index</li><li>Low memory capabilities</li></ul></td>
    </tr>
    <tr></tr>
    <tr>
        <td>Limit Results</td>
        <td>Yes</td>
        <td>Yes</td>
    </tr>
    <tr></tr>
    <tr>
        <td>Pagination</td>
        <td>Yes</td>
        <td>No</td>
    </tr>
</table>

## API Overview

Global methods:
- <a href="#bulksearch.create">BulkSearch.__create__(\<options\>)</a>
- <a href="#bulksearch.addmatcher">BulkSearch.__addMatcher__({_KEY: VALUE_})</a>
- <a href="#bulksearch.register">BulkSearch.__register__(name, encoder)</a>
- <a href="#bulksearch.encode">BulkSearch.__encode__(name, string)</a>

Index methods:
- <a href="#index.add">Index.__add__(id, string)</a>
- <a href="#index.search1">Index.__search__(string, \<limit\>, \<callback\>)</a>
- <a href="#index.search2">Index.__search__(string, \<page\>, \<callback\>)</a>
- <a href="#index.search3">Index.__search__(options, \<callback\>)</a>
- <a href="#index.update">Index.__update__(id, string)</a>
- <a href="#index.remove">Index.__remove__(id)</a>
- <a href="#index.reset">Index.__reset__()</a>
- <a href="#index.destroy">Index.__destroy__()</a>
- <a href="#index.init">Index.__init__(\<options\>)</a>
- <a href="#index.optimize">Index.__optimize__()</a>
- <a href="#index.info">Index.__info__()</a>
- <a href="#index.addmatcher">Index.__addMatcher__({_KEY: VALUE_})</a>
- <a href="#index.encode">Index.__encode__(string)</a>

## Usage
<a name="bulksearch.create"></a>
#### Create Index

> BulkSearch.__create(\<options\>)__

```js
var index = new BulkSearch();
```

alternatively you can also use:

```js
var index = BulkSearch.create();
```

##### Create index with custom options

```js
var index = new BulkSearch({

    // default values:

    type: "integer",
    encode: "icase",
    boolean: "and",
    size: 4000,
    multi: false,
    strict: false,
    ordered: false,
    paging: false,
    async: false,
    cache: false
});
```

__Read more:__ <a href="#phonetic">Phonetic Search</a>, <a href="#compare">Phonetic Comparison</a>, <a href="#memory">Improve Memory Usage</a>
<a name="index.add"></a>
#### Add items to an index

> Index.__add(id, string)__

```js
index.add(10025, "John Doe");
```
<a name="index.search1"></a>
#### Search items

> Index.__search(string|options, \<limit|page\>, \<callback\>)__

```js
index.search("John");
```

Limit the result:

```js
index.search("John", 10);
```

Perform queries asynchronously:

```js
index.search("John", function(result){
    
    // array of results
});
```
<a name="index.search3"></a>
Pass parameter as an object:
```js
index.search({

    query: "John", 
    page: '1:1234',
    limit: 10,
    callback: function(result){
        
        // async
    }
});
```
<a name="index.update"></a>
#### Update item from an index

> Index.__update(id, string)__

```js
index.update(10025, "Road Runner");
```
<a name="index.remove"></a>
#### Remove item from an index

> Index.__remove(id)__

```js
index.remove(10025);
```
<a name="index.reset"></a>
#### Reset index

```js
index.reset();
```
<a name="index.destroy"></a>
#### Destroy index

```js
index.destroy();
```
<a name="index.init"></a>
#### Re-Initialize index

> Index.__init(\<options\>)__

__Note:__ Re-initialization will also destroy the old index!

Initialize (with same options):
```js
index.init();
```

Initialize with new options:
```js
index.init({

    /* options */
});
```
<a name="bulksearch.addmatcher"></a>
#### Add custom matcher

> BulkSearch.__addMatcher({_REGEX: REPLACE_})__

Add global matchers for all instances:
```js
BulkSearch.addMatcher({

    'ä': 'a', // replaces all 'ä' to 'a'
    'ó': 'o',
    '[ûúù]': 'u' // replaces multiple
});
```
<a name="index.addmatcher"></a>
Add private matchers for a specific instance:
```js
index.addMatcher({

    'ä': 'a', // replaces all 'ä' to 'a'
    'ó': 'o',
    '[ûúù]': 'u' // replaces multiple
});
```

#### Add custom encoder

Define a private custom encoder during creation/initialization:
```js
var index = new BulkSearch({

    encode: function(str){
    
        // do something with str ...
        
        return str;
    }
});
```
<a name="bulksearch.register"></a>
##### Register a global encoder to be used by all instances

> BulkSearch.__register(name, encoder)__

```js
BulkSearch.register('whitespace', function(str){

    return str.replace(/ /g, '');
});
```

Use global encoders:
```js
var index = new BulkSearch({ encode: 'whitespace' });
```
<a name="index.encode"></a>
##### Call encoders directly

Private encoder:
```js
var encoded = index.encode("sample text");
```
<a name="bulksearch.encode"></a>
Global encoder:
```js
var encoded = BulkSearch.encode("whitespace", "sample text");
```

##### Mixup/Extend multiple encoders

```js
BulkSearch.register('mixed', function(str){
  
    str = this.encode("icase", str);  // built-in
    str = this.encode("whitespace", str); // custom
    
    return str;
});
```
```js
BulkSearch.register('extended', function(str){
  
    str = this.encode("custom", str);
    
    // do something additional with str ...

    return str;
});
```

<a name="index.info"></a>
#### Get info

```js
index.info();
```

Returns information about the index, e.g.:

```json
{
    "bytes": 103600,
    "chunks": 9,
    "fragmentation": 0,
    "fragments": 0,
    "id": 0,
    "length": 7798,
    "matchers": 0,
    "size": 10000,
    "status": false
}
```

__Note:__ When the fragmentation value is about 50% or higher, your should consider using _cleanup()_.
<a name="index.optimize"></a>
#### Optimize / Cleanup index

Optimize an index will free all fragmented memory and also rebuilds the index by scoring.

```js
index.optimize();
```
<a name="pagination"></a>
### Pagination

__Note:__ Pagination can simply reduce query time by a factor of 100.

Enable pagination on initialization:

```js
var index = BulkSearch.create({ paging: true });
```

Perform query and pass a limit (items per page):

```js
index.search("John", 10);
```

The response will include a pagination object like this:

```json
{
    "current": "0:0",
    "prev": null,
    "next": "1:16322",
    "results": []
}
```

Explanation:

<table>
    <tr>
        <td align="left">"current"</th>
        <td align="left">Includes the pointer to the current page.</th>
    </tr>
    <tr></tr>
    <tr>
        <td align="left">"prev"</th>
        <td align="left">Includes the pointer to the previous page. Whenever this field has the value <i>null</i> there are no more previous pages available.</th>
    </tr>
    <tr></tr>
    <tr>
        <td align="left">"next"</th>
        <td align="left">Includes the pointer to the next page. Whenever this field has the value <i>null</i> there are no more pages left.</th>
    </tr>
    <tr></tr>
    <tr>
        <td align="left">"results"</th>
        <td align="left">Array of matched items.</th>
    </tr>
</table>
<a name="index.search2"></a>

Perform query and pass a pointer to a specific page:

```js
index.search("John", {
    
    page: "1:16322", // pointer
    limit: 10
});
```

<a name="options" id="options"></a>
## Options

<table>
    <tr>
        <th align="left">Option</th>
        <th align="left">Values</th>
        <th align="left">Description</th>
    </tr>
    <tr></tr>
    <tr>
        <td align="top">type</td>
        <td vertical="top" vertical-align="top">
            "byte"<br>
            "short"<br>
            "integer"<br>
            "float"<br>
            "string"
        </td>
        <td vertical-align="top">The data type of passed IDs has to be specified on creation. It is recommended to uses to most lowest possible data range here, e.g. use "short" when IDs are not higher than 65,535.</td>
    </tr>
    <tr></tr>
    <tr>
        <td align="top">encode</td>
        <td>
            false<br>
            "icase"<br>
            "simple"<br>
            "advanced"<br>
            "extra"<br>
            function(string):string
        </td>
        <td>The encoding type. Choose one of the built-ins or pass a custom encoding function.</td>
    </tr>
    <tr></tr>
    <tr>
        <td align="top">boolean</td>
        <td>
            "and"<br>
            "or"
        </td>
        <td>The applied boolean model when comparing multiple words. <b>Note:</b> When using "or" the first word is also compared with "and". Example: a query with 3 words, results has either: matched word 1 & 2 and matched word 1 & 3.</td>
    </tr>
    <tr></tr>
    <tr>
        <td align="top">size</td>
        <td>2500 - 10000</td>
        <td>The size of chunks. It depends on content length which value fits best. Short content length (e.g. User names) are faster with a chunk size of 2,500. Bigger text runs faster with a chunk size of 10,000. <b>Note:</b> It is recommended to use a minimum chunk size of the maximum content length which has to be indexed to prevent fragmentation.</td>
    </tr>
    <!--
    <tr></tr>
    <tr>
        <td align="top">depth</td>
        <td>0 - 6</td>
        <td>Set the depth of register. It is recommended to use a value in relation to the number of stored index and content length for an optimum performance-memory value. <b>Note:</b> Increase this options carefully!</td>
    </tr>
    -->
    <tr></tr>
    <tr>
        <td align="top">multi</td>
        <td>
            true<br>
            false
        </td>
        <td>Enable multi word processing.</td>
    </tr>
    <tr></tr>
    <tr>
        <td align="top">ordered</td>
        <td>
            true<br>
            false
        </td>
        <td>Multiple words has to be the same order as the matched entry.</td>
    </tr>
    <tr></tr>
    <tr>
        <td align="top">strict</td>
        <td>
            true<br>
            false
        </td>
        <td>Matches exactly needs to be started with the query.</td>
    </tr>
    <tr></tr>
    <tr>
        <td align="top">cache</td>
        <td>
            true<br>
            false
        </td>
        <td>Enable caching.</td>
    </tr>
</table>

<a name="phonetic" id="phonetic"></a>
## Phonetic Encoding

<table>
    <tr>
        <th align="left">Encoder</th>
        <th align="left">Description</th>
        <th align="left">False Positives</th>
        <th align="left">Compression Level</th>
    </tr>
    <tr></tr>
    <tr>
        <td><b>false</b></td>
        <td>Turn off encoding</td>
        <td>no</td>
        <td>no</td>
    </tr>
    <tr></tr>
    <tr>
        <td><b>"icase"</b></td>
        <td>Case in-sensitive encoding</td>
        <td>no</td>
        <td>no</td>
    </tr>
    <tr></tr>
    <tr>
        <td><b>"simple"</b></td>
        <td>Phonetic normalizations</td>
        <td>no</td>
        <td>~ 3%</td>
    </tr>
    <tr></tr>
    <tr>
        <td><b>"advanced"</b></td>
        <td>Phonetic normalizations + Literal transformations</td>
        <td>no</td>
        <td>~ 25%</td>
    </tr>
    <tr></tr>
    <tr>
        <td><b>"extra"</b></td>
        <td>Phonetic normalizations + Soundex transformations</td>
        <td>yes</td>
        <td>~ 50%</td>
    </tr>
</table>

<a name="compare" id="compare"></a>
### Compare Phonetic Search

Reference String: __"Björn-Phillipp Mayer"__

<table>
    <tr>
        <th align="left">Query</th>
        <th align="left">ElasticSearch</th>
        <th align="left">BulkSearch (iCase)</th>
        <th align="left">BulkSearch (Simple)</th>
        <th align="left">BulkSearch (Adv.)</th>
        <th align="left">BulkSearch (Extra)</th>
    </tr>
    <tr></tr>
    <tr>
        <td>björn</td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
    </tr>
    <tr></tr>
    <tr>
        <td>björ</td>
        <td>no</td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
    </tr>
    <tr></tr>
    <tr>
        <td>bjorn</td>
        <td>no</td>
        <td>no</td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
    </tr>
    <tr></tr>
    <tr>
        <td>bjoern</td>
        <td>no</td>
        <td>no</td>
        <td>no</td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
    </tr>
    <tr></tr>
    <tr>
        <td>philipp</td>
        <td>no</td>
        <td>no</td>
        <td>no</td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
    </tr>
    <tr></tr>
    <tr>
        <td>filip</td>
        <td>no</td>
        <td>no</td>
        <td>no</td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
    </tr>
    <tr></tr>
    <tr>
        <td>björnphillip</td>
        <td>no</td>
        <td>no</td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
    </tr>
    <tr></tr>
    <tr>
        <td>meier</td>
        <td>no</td>
        <td>no</td>
        <td>no</td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
    </tr>
    <tr></tr>
    <tr>
        <td>björn meier</td>
        <td>no</td>
        <td>no</td>
        <td>no</td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
    </tr>
    <tr></tr>
    <tr>
        <td>meier fhilip</td>
        <td>no</td>
        <td>no</td>
        <td>no</td>
        <td><b>yes</b></td>
        <td><b>yes</b></td>
    </tr>
    <tr></tr>
    <tr>
        <td>byorn mair</td>
        <td>no</td>
        <td>no</td>
        <td>no</td>
        <td>no</td>
        <td><b>yes</b></td>
    </tr>
    <tr>
        <td><i>(false positives)</i></td>
        <td>yes</td>
        <td><b>no</b></td>
        <td><b>no</b></td>
        <td><b>no</b></td>
        <td>yes</td>
    </tr>
</table>

<a name="memory" id="memory"></a>
## Memory Usage

__Note:__ The data type of passed IDs has to be specified on creation. It is recommended to uses the most lowest possible data range here, e.g. use "short" when IDs are not higher than 65,535. 

<table>
    <tr>
        <th align="left">ID Type</th>
        <th align="left">Range of Values</th>
        <th align="left">Memory usage of every ~ 100,000 indexed words</th>
    </tr>
    <tr></tr>
    <tr>
        <td>Byte</td>
        <td>0 - 255</td>
        <td>4.5 Mb</td>
    </tr>
    <tr></tr>
    <tr>
        <td>Short</td>
        <td>0 - 65,535</td>
        <td>5.3 Mb</td>
    </tr>
    <tr></tr>
    <tr>
        <td>Integer</td>
        <td>0 - 4,294,967,295</td>
        <td>6.8 Mb</td>
    </tr>
    <tr></tr>
    <tr>
        <td>Float</td>
        <td>0 - * (16 digits)</td>
        <td>10 Mb</td>
    </tr>
    <tr></tr>
    <tr>
        <td>String</td>
        <td>* (unlimited)</td>
        <td>28.2 Mb</td>
    </tr>
</table>

---

Author BulkSearch: Thomas Wilkerling<br>
License: <a href="http://www.apache.org/licenses/LICENSE-2.0.html" target="_blank">Apache 2.0 License</a><br>
