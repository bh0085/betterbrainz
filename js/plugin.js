//allows the extension to receive requests from the outside
//world

//build a file system
var fs;
$(initFS());

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
  console.log('filesystem: error ' + msg);
}

function listResults(results){
  console.log(results);
}
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
function onInitFs(filesystem) {
  console.log('initing filesystem for plugin');
  fs = filesystem;

  var dirReader = fs.root.createReader();
  var entries = [];
  
  
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
  }

  readEntries();
}

function cleared_callback(){
  console.log('successfully cleared everything');
}
function clear_root(entries){
  console.log('clearing the whole root directory');
  var i;
  sync_counters['start_deletion'] = 0;
  sync_tots['start_deletion'] = entries[0].length;
  sync_callbacks['start_deletion'] =  cleared_callback;

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


//begin the message passing stuff
chrome.extension.onRequest.addListener(onRequest);

var sync_tots = {};
var sync_counters = {};
var sync_callbacks = {};
var sync_conditions = {};

function try_sync(clock_name, data){
  sync_counters[clock_name]+= 1;
  if ((sync_counters[clock_name] == sync_tots[clock_name])
      || ( sync_conditions[clock_name] && sync_conditions[clock_name]())){
    console.log('runs are done!');
    if(sync_callbacks[clock_name]){      
      console.log('calling BACK!');
      sync_callbacks[clock_name](data);
    }
    return true;
  } else {
    console.log('not there yet, ',
                sync_counters[clock_name], '/',
                sync_tots[clock_name]);
    return false;
  }
}
function fetcher_syncs(){
  if (filenames.length == 0){
    return true;
  } else {
    return false;
  }
}     


var finalURL = "https://skttrbrain.net/music/c9/c9d4a138-fd56-3173-92dd-b7c48ede65ee/1782b269-d5e6-40f6-937c-041cbe3b9b57-b3b5ad64-35e7-480a-bbf8-06a34d1fb863.mp3";
//var finalURL = "http://casa.colorado.edu/~danforth/comp/tex/natbib.sty";
var url_prefix = "https://skttrbrain.net";
var fetched_blobs =null;
var filenames = null;
var metadatas = null;
var l0  = null;
function fetchData(callback, params) {
  
  fetched_blobs = []
  metadatas = params.files;
  filenames = params.files.map(
    function(e,i){
      return url_prefix + e.href;
    });
  l0 = filenames.length;
  sync_tots['fetcher'] = -1;
  sync_callbacks['fetcher'] = callback;
  sync_counters['fetcher'] = 0;
  sync_conditions['fetcher'] = fetcher_syncs;
  fire_next_request();
}



function fire_next_request(){
  
  var req = new XMLHttpRequest();
  var fname = filenames.pop();
  var metadata = metadatas.pop();
  req.open("GET", fname,  true);
  req.overrideMimeType('text/plain; charset=x-user-defined');
  console.log('generating request for ' + fname);
  req.onreadystatechange = function (data) {
    if (req.readyState == 4) {
      console.log(req.status);
      if (req.status == 200) {
        console.log('processing request');
        var slice = req.response;
        var slice_len = slice.length;
        fname = 'temp_'+fetched_blobs.length + '.mp3';
        
        fs.root.getFile(fname,
                        {create:true},                  
                        function(fileEntry) {
                          fileEntry.createWriter(
                            function(fileWriter) {
                              // CHANGE 2: convert string object into a binary object
                              var byteArray = new Uint8Array(slice_len);
                              console.log(slice_len);
                              for (var i = 0; i <slice_len; i++) {
                                byteArray[i] = slice.charCodeAt(i) & 0xff;
                              }
                              
                              var BlobBuilderObj = new (window.BlobBuilder || window.WebKitBlobBuilder)();
                              // CHANGE 3: Pass the BlobBuilder an ArrayBuffer instead of a string
                              BlobBuilderObj.append(byteArray.buffer);

                              // CHANGE 4: not sure if it's needed, but keep only the necessary
                              // part of the Internet Media Type string
                              fileWriter.write(BlobBuilderObj.getBlob('text/plain'));
                              fetched_blobs.push({'fname':fname,
                                                  'meta':metadata});
                              chrome.browserAction.setBadgeText({text:Math.floor(100*fetched_blobs.length /l0 )+ '%'});
                              if ( try_sync('fetcher', fetched_blobs) == false){
                                console.log('firing!');
                                fire_next_request();
                              } 
                              
                            }, function(resultError) {
                              console.log('writing file to file system failed (   code ' + resultError.code + ')');
                            });
                        }); 
      } else {
        console.log('looks like the response is fucked up.');
        try_sync('fetcher', fetched_blobs);
      }
    }
  };
  req.send();
  
};



//on request function to fetch data with the supplied callback

function onRequest(request, sender, callback) {
  if (request.action == 'sbdl_xdr_start'){
    fetchData(callback, request.params);
  }
};


//click function for the browser action.
chrome.browserAction.onClicked.addListener(
  function(tab) {
    chrome.tabs.query(
      {
        title:'skttrbrain_song_downloads'
      },
      activate_dl_tab
    );
  });
