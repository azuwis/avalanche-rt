A fork of [avalanche-rt][1] which only require the xml-rpc interface of rtorrent, suitable for low resource devices such as home use routers.

Avalanche-rt is a really good web frontend for rtorrent. The original one ran pretty good on my router, except that php eat a lot of memory and nearly all CPU.

Some detail of differences from original avalanche-rt:

* Use [jsxmlrpc][2] javascript library to directly generate xml-rpc call from the browser
* Use browser cookies to save some settings instead of saving to prefs.json
* Need to manually set diskspace value to prefs.json, rtorrent's xml-rpc interface does not provide total diskspace info
* Use html5 FileReader api to implement adding torrent from local file, thus only Firefox 3.6 and Google Chrome 6 can use this function

Note that upstream may include this in future release, see [here][3].

[1]: http://code.google.com/p/avalanche-rt/
[2]: http://phpxmlrpc.sourceforge.net/jsxmlrpc/
[3]: http://code.google.com/p/avalanche-rt/issues/detail?id=10
