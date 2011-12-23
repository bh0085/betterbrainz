var current_songs = null;
$(initFS());
function query_sb_tab(){
  chrome.tabs.query(
    {
      url:'https://skttrbrain.net/*'
    },
    fetch_sb_playlist
  );
};
function fetch_sb_playlist(tabs_array){
  if (tabs_array.length == 0){

  } else {
    var tab = tabs_array[0];
    chrome.tabs.sendRequest(tab.id, {greeting: "songs"}, tab_received_songs);
    console.log('sent request!');
  }
};
function tab_received_songs(response){
  var data = JSON.parse(response);
  var i;
  var sel_table = $('#songs_selected').empty();
  current_songs = JSON.parse(response);
  for (i =0 ; i < data.length ; i++){
    var row = $('<tr>');    
    row.append($('<td>').html(data[i].artist));
    row.append($('<td>').html(data[i].title));
    sel_table.append(row);
  }
}

var fs = null;
var logfile=null;
var tracks=null;


//window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
function initFS() {
  window.webkitStorageInfo.requestQuota(
    PERSISTENT, 1024*1024, 
    function(grantedBytes) {
      window.webkitRequestFileSystem(PERSISTENT, 
                                     grantedBytes,
                                     onInitFs, 
                                     errorHandler);
    }, function(e) {
      console.log('Error', e);
    });
}
function listResults(results){
  console.log(results);
}
function onInitFs(filesystem) {
  console.log('initing');
  fs = filesystem;

  var dirReader = fs.root.createReader();
  var entries = [];
  
  // Call the reader.readEntries() until no more results are returned.
  var readEntries = function() {
    dirReader.readEntries (function(results) {
      if (!results.length) {
        listResults(entries.sort());
        clear_root(entries);
      } else {
        console.log(results);
        entries = entries.concat(results);
        readEntries();
      }
    }, errorHandler);
  };

  readEntries(); // Start reading dirs.

}


function clear_root(entries){
  console.log('flushing the current file system');
  var i;
  sync_counters['start_deletion'] = 0;
  sync_tots['start_deletion'] = entries[0].length;
  sync_callbacks['start_deletion'] =  make_files;

  for (i = 0 ; i < entries[0].length; i++){
    var fileEntry = entries[0][i];
    if (fileEntry.isFile){    
      fileEntry.remove(function() {
                         try_sync('start_deletion');
                       }, errorHandler);

    } else {
      try_sync('start_deletion');
    }
  }
}

var sync_tots = {};
var sync_counters = {};
var sync_callbacks = {};

function try_sync(clock_name,data){
  sync_counters[clock_name]+= 1;
  if (sync_counters[clock_name] == sync_tots[clock_name]){
    console.log('runs are done!');
    sync_callbacks[clock_name](data);
    return true
  } else {
    console.log('not there yet, ',
                sync_counters[clock_name], '/',
                sync_tots[clock_name]);
    return false
  }
}
                  
function make_files(){
  
  fs.root.getFile('log.txt', {create: true, exclusive: true}, function(fileEntry) {
                    logfile=fileEntry;
                  },errorHandler);
  fs.root.getDirectory('tracks', {create: true}, function(dirEntry) {
                         console.log(dirEntry);
                         tracks = dirEntry;
                       }, errorHandler);



}
//var errorHandler = null;



function errorHandler(e) {
  var msg = '';
  switch (e.code) {
  case FileError.QUOTA_EXCEEDED_ERR:
    msg = 'QUOTA_EXCEEDED_ERR';
    break;
  case FileError.NOT_FOUND_ERR:
    msg = 'NOT_FOUND_ERR';
    break;
  case FileError.SECURITY_ERR:
    msg = 'SECURITY_ERR';
    break;
  case FileError.INVALID_MODIFICATION_ERR:
    msg = 'INVALID_MODIFICATION_ERR';
    break;
  case FileError.INVALID_STATE_ERR:
    msg = 'INVALID_STATE_ERR';
    break;
  default:
    msg = 'Unknown Error';
    break;
  };
  document.querySelector('#fs_info').innerHTML = 'filesystem: error ' + msg;
}

var success_strings = [
  'merry christmas',
  'take your songs and go',
  'happy hanukah/kwanza',
  'happy chanukah',
  'now leave me alone',
  'happy holidays',
  'suck a plate of cocks'];

function publish(data, filename) {

  if (!window.BlobBuilder && window.WebKitBlobBuilder) {
    window.BlobBuilder = window.WebKitBlobBuilder;
  }

  fs.root.getFile(filename, {create: true}, function(fileEntry) {

                    // Create a FileWriter object for our FileEntry (log.txt).
                    fileEntry.createWriter(
                      function(fileWriter) {

                        fileWriter.onwriteend = function(e) {
                          console.log('Write completed.');
                          $('#output').append($("<br/>"));
                          $('#output').append($("<a/>").attr({href: fileEntry.toURL()})
                                              .append(filename));
                          $('#output').append($("<br/>"));
                          $('#output').append($("<span>").text(
                                                success_strings[
                                                  Math.floor(Math.random() * 
                                                             success_strings.length)  
                                                ]));                                                
;
                        };

                        fileWriter.onerror = function(e) {
                          console.log('Write failed: ' + e.toString());
                        };

                        var builder = new BlobBuilder();
                        builder.append(data);
                        var blob = builder.getBlob();
                        fileWriter.write(blob);

                      }, errorHandler);

                  }, errorHandler);
}


var lastReader = null;

function randomCallback(responses){
  console.log("CALLBACK CALLED");
  
  total = responses.length;
  added = 0;
 
  if (responses == null){
    $('#info_problems').text('no songs selected for download');
    return;
  }
  console.log('songs gotten, calling back');
  
  

  var zip = new JSZip(); // same as new JSZip("STORE");
  sync_tots['publish_zip'] = responses.length;
  sync_counters['publish_zip'] = 0;
  sync_callbacks['publish_zip'] = publish_zip;


  write_next_file(responses,zip);
}

var added;
var total;
function write_next_file(responses,zip){
  console.log(total)
  console.log(added)
   
    var response = responses.pop();
    var fname = response.fname;
    var meta = response.meta;

    var fname_0 = meta.href.split('/')[meta.href.split('/').length-1];
    var ext_split = fname_0.split('.');
   
    var mbid = ext_split.slice(0,ext_split.length -1).join('.');
    var tnum = meta.tracknum;
    //manual zero padding... duh...
    if (tnum.length == 1){
      tnum = '0' + tnum;
    };
  
  var filepath = [meta.artist,
                  meta.album,
                  [tnum,meta.title,'['+mbid+']'].join(' - ')]
    .join('/')+".mp3";
  
  
  fs.root.getFile(fname, {}, 
                  function(fileEntry) {
                    var fp = filepath;
                    // Get a File object representing the file,
                    // then use FileReader to read its contents.
                    fileEntry.file(function(file) {
                                     var reader = new FileReader();
                                     
                                     
                                     reader.onloadend = function(e) {
                                       var value = this.result;
                                       lastReader = this;
                                       added += 1;
                                       chrome.browserAction.setBadgeText({text:Math.floor(100.0*added / total)+ '%'});

                                       zip.add(fp,
                                               value, {binary:true});
                                       if ( try_sync('publish_zip',{'zip':zip,
                                                                   'meta':meta}) == false){
                                         write_next_file(responses,zip);
                                       } else {
                                         return;
                                       }
                                       
                                     };
                                     reader.readAsBinaryString(file);
                                   }, errorHandler);
                  }, errorHandler);  
  
}
function publish_zip(data){
  var zip = data.zip;
  var meta = data.meta;
  var zip_data = zip.generate(true);
  var byteArray = new Uint8Array(zip_data.length);
  for (var i = 0; i < zip_data.length; i++) {
    byteArray[i] = zip_data.charCodeAt(i) & 0xff;
  }

  chrome.browserAction.setBadgeText({text:':)'});
  publish(byteArray.buffer,'music.zip');
  

  return;


  var bb = new (window.BlobBuilder || window.WebKitBlobBuilder)();  
  var zip = new JSZip(); // same as new JSZip("STORE");
  
  for (var i = 0 ; i < responses.length; i++){   
    var res = responses[i]['data'];
    var meta= responses[i]['meta'];
    var c0 = res.charCodeAt(0);
    var utf_string = res;
    var fname = meta.href.split('/')[meta.href.split('/').length-1];
    var ext_split = fname.split('.');
    var mbid = ext_split.slice(0,ext_split.length -1).join('.');
    var tnum = meta.tracknum;
    //manual zero padding... duh...
    if (tnum.length == 1){
      tnum = '0' + tnum;
    };
    var filepath = [meta.artist,
                    meta.album,
                    [tnum,meta.title,'['+mbid+']'].join(' - ')];
    if (i > 0 ){
      continue;
    }
    zip.add(filepath.join('/')+".mp3",utf_string, {binary:true});
  }
  
  var zip_data = zip.generate(true);
  var byteArray = new Uint8Array(zip_data.length);
  for (var i = 0; i < zip_data.length; i++) {
    byteArray[i] = zip_data.charCodeAt(i) & 0xff;
  }

                        
  publish(byteArray.buffer,'jszip.zip');
  
  

  return;
}


function download_sb_songs(){
  if(current_songs == null){
    console.log('no songs are selected', randomCallback(null));
    $('#under_download_button')
      .text('add some songs to your playlist and click the top button first, otherwise this guetto interface doesn"t do shit' );
    return;
  }

  
  var params = {
    files: current_songs
  };
  $('#under_download_button').text('now just wait a long time...');
  $('#under_download_button').append($('<br/>'));
  $('#under_download_button')
    .append($('<span>')
            .text('if you have a bunch of albums in your playlist, this script may well outlive you.')
           );
  $('#under_download_button').append($('<br/>'));
  $('#under_download_button').append($('<br/>'));

  console.log('sent request to skttrbrain for songs');
  chrome.extension.sendRequest({'action' : 'sbdl_xdr_start',
                                'params':params}, 
                               randomCallback);
}