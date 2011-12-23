function getSongs(){
  var hits = $('.song').map(
  function(i,e){
    return {
      href:$(e).attr('href'),
      id:$(e).attr('id'),
      artist:$(e).children('.artist').html(),
      album:$(e).children('.album').html(),
      title:$(e).children('.title').html(),
      tracknum:$(e).children('.tracknum').html()
    };
  }
  ).toArray();
  return hits;
  
}


$(
  function(){
    console.log('SETTING THE BACKGROUND');
    var bg_url =  chrome.extension.getURL("img/santa.jpg");
    console.log(bg_url);
    $('body').css('background-image','url('+bg_url+')');
    $('body').css('background-color','green)');
  }
)


chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    console.log('DOING STUFF');
    if (request.greeting == 'songs'){
      
      var songs = getSongs();
      console.log(songs);
      var sng = JSON.stringify(songs);
      
      sendResponse(sng);
    } else if (request.greeting == 'inject_css'){
      var css = getCSS();
      
      
    }
  });