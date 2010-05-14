	/*
	 * Remote.js Javascript Library 0.9
	 *
	 * Avalanche 0.9 Beta
	 *
	 *	Copyright 2009 © Keithamus
	 *	This code is licensed under the MIT license.
	 *	For more details, see http://www.opensource.org/licenses/mit-license.php
		*
		* For more information, see http://code.google.com/p/avalanche-rt
		*
		* Date: Fri, 19th Feb 2010.
		*
	 */


function Remote(controller)
{
	this.init();
	var rpc = new xmlrpc_client("/RPC2");
	this.getRpc = function () {
		return rpc;
	};
	window.remote = this;
}

Remote.prototype =
{

	/*
	 * Constructor
	 */
	init: function(controller)
	{
		this._error='';
		this.json=[];
	},

	request_x: function (func, decode, resp, action) {
		this.json = [];
		var value = xmlrpc_decode(resp.value(), { 'decode_js_objs': true });
		var data = decode(value);

		//If we returned an error we should do something with it.
		if(typeof data != 'object')
		{
			torrent.openDialogue('error_popup');
			$('#error_details').text('Error RPC request'+ "\n\nBad Json\n\n"+ window.torrentlist).focus().select();
		}
		else if(data && data.error)
		{
			torrent.openDialogue('error_popup');
			$('#error_details').text('Error RPC request'+ "\n\n"+ data.error).focus().select();
		}
		//Otherwise we're golden to set the global JSON object
		else if(action!='retrieve')
		{
			this.json = data;
		}

		//Now we should run the function we were asked to:
		if(func) func(data);
	},

	/*
	 * Retrieve Main Torrent List
	 */
	retrieve: function(func)
	{
		var message = new xmlrpcmsg('d.multicall', [
				new xmlrpcval('name'), //Make an array for all loaded torrents
				new xmlrpcval('d.get_hash='), //The torrent hash
				new xmlrpcval('d.get_name='), //Torrent's name
				new xmlrpcval('d.get_state='), //0 = stopped, 1 = started
				new xmlrpcval('d.get_size_bytes='), //The size in bytes
				new xmlrpcval('d.get_bytes_done='), //How many bytes completed
				new xmlrpcval('d.get_up_total='), //How much in total has been uploaded
				new xmlrpcval('d.get_down_rate='), //Download rate in bytes
				new xmlrpcval('d.get_up_rate='), //Upload rate in bytes
				new xmlrpcval('d.get_peers_connected='), //Amount of connected peers
				new xmlrpcval('d.get_peers_not_connected='), //Amount of unconnected peers
				new xmlrpcval('d.get_peers_accounted='), //Number of leechers
				new xmlrpcval('d.get_complete='), //Is the torrent completely downloaded?
				new xmlrpcval('d.is_hash_checking='), //Is it rehashing?
				new xmlrpcval('d.get_creation_date='), //Date torrent added
				new xmlrpcval('d.get_base_path='), //Where the torrent exists
				new xmlrpcval('d.get_free_diskspace='), //Free disk space where torrent is
				new xmlrpcval('d.is_private='), //Is torrent private?
				new xmlrpcval('d.get_message='), //Comment
				new xmlrpcval('d.get_priority='), //Priority (number)
				new xmlrpcval('d.is_hash_checked='), //Has it been hash checked before?
				new xmlrpcval('d.get_skip_total='), //How many wasted bytes?
				new xmlrpcval('d.get_custom5='), //We use this for the torrents "new name"
				new xmlrpcval('d.get_custom4='), //We use this for the torrents "label"
				//http://libtorrent.rakshasa.no/ticket/1538 < Describes a solution for
				//rtorrent builds that don't use I8, we multiply chunk_size by size_chunks
				new xmlrpcval('d.get_chunk_size='), //Get the size of a single chunk in bytes
				new xmlrpcval('d.get_size_chunks='), //Get how many chunks are in the torrent
				new xmlrpcval('d.get_completed_chunks=') //Get how many chunks have downloaded.
					]);

		var decode = function (torrents) {
			var data = {};
			$.each(torrents, function(i, torrent){
				data[torrent[0]] = {
					'name' : torrent[1],
					'is_downloading' : torrent[2],
					//Old versions of rtorrent use i4 which buffer overflows > 4gb
					'size' : torrent[3]<0?torrent[23]* torrent[24]:torrent[3],
					'downloaded' : torrent[4]<0?torrent[23]* torrent[25]:torrent[4],
					'uploaded' : torrent[5]<0?2147483648:torrent[5],
					'down_rate' : torrent[6],
					'up_rate' : torrent[7],
					'peers_connected' : torrent[8]-(torrent[8]-torrent[10]),
					'peers_total' : torrent[9]+torrent[8],
					'seeders_connected' : torrent[8]-torrent[10],
					'is_completed' : torrent[11],
					'is_hashing' : torrent[12],
					'date_added' : torrent[13],
					'base_path' : torrent[14],
					//Remember the bug above? We're going to mangle this a bit...
					'free_diskspace' : torrent[15],
					'total_diskspace' : 58312667136,
					'private' : torrent[16],
					'tracker_status' : torrent[17],
					'priority' : torrent[18],
					'has_been_hashed' : torrent[19],
					'wasted_bytes' : torrent[20],
					'new_name' : torrent[21],
					'label' : torrent[22]
				};
			});
			return data;
		};

		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp, 'retrieve');
		});
	},

	/*
	 * Remove torrents
	 */
	remove: function(id, func)
	{
		var message = new xmlrpcmsg('d.erase', [
				new xmlrpcval(id)
			]);

		var decode = function (resp) {
			return {'remove' : resp==0?true:false};
		};

		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp);
		});
	},

	/*
	 * Resume torrents
	 */
	resume: function(hash, func)
	{
		var all = (hash === 'all');
		var message = all ? new xmlrpcmsg('d.multicall', [
				new xmlrpcval('closed'), //Get all ongoing torrents
				new xmlrpcval('d.open=') //Stop all ongoing torrents
			]) : new xmlrpcmsg('d.open', [ new xmlrpcval(hash) ]);

		this.getRpc().send(message);

		message = all ? new xmlrpcmsg('d.multicall', [
				new xmlrpcval('stopped'), //Get all ongoing torrents
				new xmlrpcval('d.start=') //Stop all ongoing torrents
			]) : new xmlrpcmsg('d.start', [ new xmlrpcval(hash) ]);

		var decode = function (resp) {
			if(all) {
				return {'pause' : resp==0?true:false};
			} else {
				return {'resume' : resp==0?true:false};
			}
		};

		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp);
		});
	},

	/*
	 * Pause torrents
	 */
	pause: function(hash, func)
	{
		var all = (hash === 'all');
		var message = all ? new xmlrpcmsg('d.multicall', [
				new xmlrpcval('started'), //Get all ongoing torrents
				new xmlrpcval('d.stop=') //Stop all ongoing torrents
			]) : new xmlrpcmsg('d.stop', [ new xmlrpcval(hash) ]);

		this.getRpc().send(message);

		message = all ? new xmlrpcmsg('d.multicall', [
				new xmlrpcval('stopped'), //Get all ongoing torrents
				new xmlrpcval('d.close=') //Stop all ongoing torrents
			]) : new xmlrpcmsg('d.close', [ new xmlrpcval(hash) ]);

		var decode = function (resp) {
			return {'pause' : resp==0?true:false};
		};

		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp);
		});
	},

	/*
	 * Rename torrents
	 */
	rename: function(id, name, func)
	{
		var message = new xmlrpcmsg('d.set_custom5', [
				new xmlrpcval(id),
				new xmlrpcval(name)
			]);

		var decode = function (resp) {
			return {'rename' : resp==0?true:false};
		};

		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp);
		});
	},

	/*
	 * Set the upload speed
	 */
	setRate: function(type, Kbytes, func)
	{
		if(Kbytes=='Unlimited') { Kbytes = "0"; }
		if(type !== 'upload' && type !== 'download') {
			torrent.openDialogue('error_popup');
			$('#error_details').text("Unrecognised command").focus().select();
			return;
		} else {
			var message = new xmlrpcmsg('set_' + type + '_rate', [
					new xmlrpcval(Kbytes + 'k'),
				]);
	
			var decode = function (resp) {
				return {'setrate' : resp==0?true:false};
			};
	
			this.getRpc().send(message, 0, function (resp) {
				remote.request_x(func, decode, resp);
			});
		}
	},

	setTorrentPriority: function(id, priority, func)
	{
		var message = new xmlrpcmsg('d.set_priority', [
				new xmlrpcval(id),
				new xmlrpcval(parseInt(priority), 'i4'),
			]);
	
		var decode = function (resp) {
			return {'setpriority' : resp==0?true:false};
		};
	
		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp);
		});
	},

	setFilePriority: function(id, file_id, priority, func)
	{
		var msg = [];
		$.each(file_id.replace(/,/g,':').split(':'), function (i, file) {
			msg.push(new xmlrpcval({
				'methodName': new xmlrpcval('f.set_priority'),
				'params': new xmlrpcval([
					new xmlrpcval(id),
					new xmlrpcval(parseInt(file), 'int'),
					new xmlrpcval(priority, 'int')
				], 'array')
			},'struct'));
		});

		var message = new xmlrpcmsg('system.multicall', [ new xmlrpcval(msg, 'array') ]);
	
		var decode = function (resp) {
			var ret = true;
			$.each (resp, function (_u, x) {
				$.each(x, function (_u, res) {
					if (res != 0) {
						ret = false;
						return false;
					}
				});
				return ret;
			});
			return { 'setpriority': ret };
		};
	
		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp);
		});
	},

	/*
	 * Get the trackers of a torrent
	 */
	getTrackers: function(id, func)
	{
		var message = new xmlrpcmsg('t.multicall', [
			new xmlrpcval(id), //Torrent ID
			new xmlrpcval(''),
			new xmlrpcval('t.get_url='), //Tracker's URL
			new xmlrpcval('t.get_scrape_incomplete='), //The peers scraped from the tracker
			new xmlrpcval('t.get_scrape_complete='), //The seeders scraped from the tracker
			new xmlrpcval('t.is_enabled='), //0 = disabled , 1 = enabled
			new xmlrpcval('t.get_group='), //0 = disabled , 1 = enabled
			new xmlrpcval('t.is_open=') //0 = closed , 1 = open
		]);

		var decode = function (trackers) {
			if (!$.isArray(trackers)) {
				return {"error" : trackers};
			}
			var data = {};
			$.each(trackers, function(i, tracker) {
				data[tracker[0]] = {
					'peers' : tracker[1],
					'seeders' : tracker[2],
					'enabled' : tracker[3]==1?true:false,
					'id' : tracker[4],
					'open' : tracker[5]==1?true:false
				};
			});
			if(data['dht://'] !== undefined ) {
				var message = new xmlrpcmsg('dht_statistics', [ new xmlrpcval(id) ]);
				var resp = remote.getRpc().send(message);
				var dht = xmlrpc_decode(resp.value(), { 'decode_js_objs': true });
				data['dht://']['peers']=dht['peers'];
				data['dht://']['nodes']=dht['nodes'];
				delete(data['dht://']['seeders']);
			}
			return data;
		};

		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp);
		});
	},

	/*
	 * Get the peers of a torrent
	 */
	getPeers: function(id, func)
	{
		var message = new xmlrpcmsg('p.multicall', [
			new xmlrpcval(id), //Torrent ID
			new xmlrpcval(''),
			new xmlrpcval('p.get_address='), //The peer IP
			new xmlrpcval('p.get_client_version='), //Peers rtorrent Program
			new xmlrpcval('p.get_completed_percent='), //Peers % complete
			new xmlrpcval('p.get_down_rate='), //How fast this peer is seeding to us
			new xmlrpcval('p.get_down_total='), //How much they've seeded to us
			new xmlrpcval('p.get_up_rate='), //How fast we're seeding to this peer
			new xmlrpcval('p.get_up_total='), //How much we've seeded to them
			new xmlrpcval('p.is_encrypted='), //0 = not encrypted , 1 = encrypted
			new xmlrpcval('p.is_obfuscated='), //0 = not obf., 1 = obf.
			new xmlrpcval('p.is_snubbed=') //0 = not snubbed, 1 = snubbed
		]);

		var decode = function (peers) {
			if (!$.isArray(peers)) {
				return {"error" : peers};
			}
			var data = {};
			$.each(peers, function(i, peer){
				data[peer[0]] = {
					'client' : peer[1],
					'completed_percent' : peer[2],
					'down_rate' : peer[3],
					'down_total' : peer[4],
					'up_rate' : peer[5],
					'up_total' : peer[6],
					'is_e' : peer[7],
					'is_o' : peer[8],
					'is_s' : peer[9],
				};
			});
			return data;
		};

		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp);
		});
	},


	/*
	 * Get the files of a torrent
	 */
	getFiles: function(id, func)
	{
		var message = new xmlrpcmsg('f.multicall', [
			new xmlrpcval(id), //Torrent ID
			new xmlrpcval(''),
			new xmlrpcval('f.get_path='), //The file path
			new xmlrpcval('f.get_priority='), //The file priority
			new xmlrpcval('f.get_size_bytes='), //The file size in bytes
			new xmlrpcval('f.get_completed_chunks='), //Chunks done of the file
			new xmlrpcval('f.get_size_chunks='), //The file size in chunks
			new xmlrpcval('f.get_size_chunks=') //The file size in chunks
		] );

		var decode = function (files) {
			if (!$.isArray(files)) {
				return {"error" : files};
			}
			var data = [];
			$.each(files, function(i, file){
				data.push({
					'path': file[0],
					'priority': file[1],
					'size_bytes': file[2],
					'chunks_complete': file[3],
					'chunks': file[4]
				});
			});
			return data;
		};

		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp);
		});
	},

	/*
	 * Set the tracker of a torrent to enabled/disabled
	 */
	setTracker: function(id, tracker_id, enabled, func)
	{
		var message = new xmlrpcmsg('t.set_enabled', [
				new xmlrpcval(id), //Torrent ID
				new xmlrpcval(parseInt(tracker_id), 'i4'), //The tracker ID
				new xmlrpcval(enabled?1:0, 'i4') //Disabled or Enabled.
			]);
		var decode = function (resp) {
			return {'settracker' : resp==0?true:false};
		};

		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp);
		});
	},

	/*
	 * Set the download speed
	 */
	getRate: function(type, func)
	{
		if(type !== 'upload' && type !== 'download') {
			torrent.openDialogue('error_popup');
			$('#error_details').text("Unrecognised command").focus().select();
			return;
		} else {
			var message = new xmlrpcmsg('get_' + type + '_rate');
			var decode = function (rate) {
				return {
					'getRate': rate / 1024
				};
			};

			this.getRpc().send(message, 0, function (resp) {
				remote.request_x(func, decode, resp);
			});
		}
	},

	truefalse: function(func, id, istruefunc)
	{
		this[func](id, function(data)
		{
			if(data[func])
			{
				istruefunc();
			}
			else
			{
				console.log('Error: Could not '+ func+ '('+ id+ '): '+ data.error);
			}
		});
	},

	/*
	 * Open a torrent URL
	 */
	openURL: function(url, func, start)
	{
		var command = start=='true'?'load_start_verbose':'load_verbose';

		var message = new xmlrpcmsg(command, [ new xmlrpcval(url) ]);

		var decode = function (resp) {
			return {'openurl' : resp==0?true:false};
		};

		this.getRpc().setDebug(2);
		this.getRpc().send(message, 0, function (resp) {
			remote.request_x(func, decode, resp);
		});
	},

	setSetting: function(key, value, value2, action, func)
	{
		var act = action ? 'remove' : 'set';
		var write = false;
		var settings = window.settings;

		switch(key) {
			case '':
				break;
			default:
				if(act === 'remove')
				{
					delete settings[key];
					write = true;
				}
				else if(act === 'set')
				{
					settings[key] = value;
					write = true;
				}
				break;
		}
		if(write) {
			window.settings = settings;
			var date = new Date();
			date.setTime(date.getTime() + 86400000);
			$.cookies.set('avalance-rt', [
				settings['detail_pane_width'],
				settings['default_filter_by'],
				settings['default_zoom'],
				settings['detail_pane_open'],
				settings['default_sort'],
				settings['default_sort_by']
				], {'expiresAt' : date});
			$.cookies.set('settings', "aaa");
			if(func){ func(settings); }
		}
	}

}
