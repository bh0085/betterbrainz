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
  window.webkitStorageInfo.requestQuota(PERSISTENT, 1024*1024, function(grantedBytes) {
                                          window.webkitRequestFileSystem(PERSISTENT, grantedBytes, onInitFs, errorHandler);
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

function try_sync(clock_name){
  sync_counters[clock_name]+= 1;
  if (sync_counters[clock_name] == sync_tots[clock_name]){
    console.log('runs are done!');
    sync_callbacks[clock_name]();
  } else {
    console.log('not there yet, ',
                sync_counters[clock_name], '/',
                sync_tots[clock_name]);
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


var cur_bbo = null;
var cur_rr = null;
var cur_rb = null;
function randomCallback(req){
  if (req == null){
    $('#info_problems').text('no songs selected for download');
    return;
  }
  console.log('songs gotten, calling back');


  
  var bb = new (window.BlobBuilder || window.WebKitBlobBuilder)();

  sync_counters['write_mp3s'] = 0;
  sync_tots['write_mp3s'] = 1;
  sync_callbacks['write_mp3s'] =  mp3s_written;

  var sl0 = req.response.length;
  var slice_len = 100000;

  fs.root.getFile('nav_logo72.png', {'create': true}, 
                  function(fileEntry) {
                    fileEntry.createWriter(
                      function(fileWriter) {

                        
                        // CHANGE 2: convert string object into a binary object
                        var byteArray = new Uint8Array(slice_len);
                        console.log(slice_len);
                        for (var i = 0; i <slice_len; i++) {
                          byteArray[i] = req.response.charCodeAt(i) & 0xff;
                        }
                        cur_rb = byteArray;
                        cur_rr = req.response;

                        
                        var BlobBuilderObj = new (window.BlobBuilder || window.WebKitBlobBuilder)();

                        // CHANGE 3: Pass the BlobBuilder an ArrayBuffer instead of a string
                        BlobBuilderObj.append(byteArray.buffer);

                        // CHANGE 4: not sure if it's needed, but keep only the necessary
                        // part of the Internet Media Type string
                     
                        fileWriter.write(BlobBuilderObj.getBlob('text/plain'));
                        var bbo = BlobBuilderObj;
                        cur_bbo = bbo;
                        try_sync('write_mp3s',bbo);
                      }, function(resultError) {
                        console.log('writing file to file system failed (   code ' + resultError.code + ')');
                      });
                  });


  return;
}

var mp3_fe = null;
var ustr = null;
var uia = null;
function mp3s_written(){
  //publish a blob
  function publish(data, filename) {

    if (!window.BlobBuilder && window.WebKitBlobBuilder) {
      window.BlobBuilder = window.WebKitBlobBuilder;
    }

    fs.root.getFile(filename, {create: true}, function(fileEntry) {

    // Create a FileWriter object for our FileEntry (log.txt).
    fileEntry.createWriter(function(fileWriter) {

      fileWriter.onwriteend = function(e) {
        console.log('Write completed.');
        $('#output').append($("<br/>"));
        $('#output').append($("<a/>").attr({href: fileEntry.toURL()})
                            .append(filename));
        $('#output').append($("<br/>"));
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
  publish(cur_rb.buffer,'blob.mp3');
  var blob = cur_bbo.getBlob('text/plain');
  var url = window.webkitURL.createObjectURL(blob);
  $("#output").append($("<a/>").attr({href: url}).append("Download"));

  console.log('mp3 writing successful, building a zip from the file system');
  var zip = new JSZip(); // same as new JSZip("STORE");

  var blob3 = cur_bbo.getBlob('audio/mpeg');
  zip.add("file.mp3", blob3);
  //try writing the buffer for a binary array, rb to the zip
  var uia = new  Uint8Array(cur_rb);


  var strdata = [];
  for ( var i = 0 ; i < cur_rb.length; i++){
    strdata.push( String.fromCharCode(cur_rb[i]) );
  }
  var utf_string = strdata.join('');
  //zip.add("utf_b64.mp3",utf_string, {base64:true});
  zip.add("utf_bin.mp3",utf_string, {binary:true});
  //zip.add("utf.mp3",utf_string);

  zip.add("Hello.txt", "Hello World\n");
  zip.add("smile.gif", "R0lGODdhBQAFAIACAAAAAP/eACwAAAAABQAFAAACCIwPkWerClIBADs=", {base64: true});
  zip.add("magic.txt", "U2VjcmV0IGNvZGU=", {base64: true, binary: false});
  zip.add("Xmas.txt", "Ho ho ho !", {date : new Date("December 25, 2007 00:00:01")});
  
  zip.add("animals.txt", "dog,platypus\n").add("people.txt", "james,sebastian\n");

  var zip_data = zip.generate(true);
  var byteArray = new Uint8Array(zip_data.length);
  for (var i = 0; i < zip_data.length; i++) {
    byteArray[i] = zip_data.charCodeAt(i) & 0xff;
  }

                        
  var bbo2 = new  (window.BlobBuilder || window.WebKitBlobBuilder)();
  bbo2.append(byteArray.buffer);

  publish(byteArray.buffer,'jszip.zip');
  $("#output").append($("<a/>").attr({href: url2}).append("Download2"));


}

function download_sb_songs(){
  if(current_songs == null){
    console.log('no songs are selected', randomCallback(null));
    return;
  }
  var params = {
    files: current_songs
  };
  console.log('sent request to skttrbrain for songs');
  chrome.extension.sendRequest({'action' : 'sbdl_xdr_start',
                                'params':params}, 
                               randomCallback);
}