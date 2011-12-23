function activate_dl_tab(dl_tabs){
  if (dl_tabs.length > 0){
    console.log(dl_tabs[0]);
    chrome.tabs.update(dl_tabs[0].id,
                      {active:true}
                      );
  } else {
    chrome.tabs.create(
      {
        url:'song_downloads.html'
      });
  } 

}
