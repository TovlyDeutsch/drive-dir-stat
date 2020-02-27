async function getFiles() {
  // 1000 is maximum retrieval size
  // adapted from Google Drive API documentation quickstart //(https://developers.google.com/drive/v3/web/quickstart/js)
  // add shared with me = false, currently not working

  let nextPageToken = null;
  let files = [];
  let numRequests = 0;
// TODO abstract streaming for nextpage thing
  do {
    let parameters = {
      'pageSize': 1000,
      'fields': "nextPageToken, files(id, name, mimeType, parents, quotaBytesUsed)",
      // 'fields': "nextPageToken, files(\
      // id, name, createdTime, fileExtension, quotaBytesUsed, owners, ownedByMe, webViewLink, mimeType)",
      // 'q': "mimeType='image/jpeg'",
      q: "trashed = false and 'me' in owners",
      // spaces: 'drive',
      // corpora: 'user'
    }
  
    // if not first request, set the pageToken to the next page
    if (nextPageToken) { 
      parameters.pageToken = nextPageToken
    }
  
    // adapted from Google Drive API documentation quickstart (https://developers.google.com/drive/v3/web/quickstart/js)
    numRequests++
    
    try {
      let response = await window.gapi.client.drive.files.list(parameters);
      files = files.concat(response.result.files)
      if (response.result.nextPageToken !== nextPageToken) {
        nextPageToken = response.result.nextPageToken
      }
      else {
        break
      }
    } catch(err) {
      console.log(err) // TypeError: failed to fetch
    }
    console.log(numRequests, nextPageToken)
  } while (nextPageToken != null && numRequests < 2);
  sessionStorage.setItem('files', JSON.stringify(files))
  console.log('finished')
  return files;
}

async function assembleDirStructure(files) {
  let rootFolderResponse = await window.gapi.client.drive.files.get({fileId: 'root'})
  let rootFolder = rootFolderResponse.result
  let rootFolderId = rootFolder.id
  let knownIds = {}
  knownIds[rootFolderId] = [rootFolderId]
  rootFolder.children = []
  let folderStructure = {children: {}}
  folderStructure.children[rootFolderId] = rootFolder
  let filedIds = new Set([rootFolderId])
  function placeFiles() {
    for (let file of files) {
      if (file.parents && knownIds.hasOwnProperty(file.parents[0]) && !filedIds.has(file.id)) {
        let path = knownIds[file.parents[0]]
        let currentObj = folderStructure
        for (let el of path) {
          currentObj = currentObj.children[el]
        }
        if (!currentObj.hasOwnProperty('children')) { currentObj.children = {}}
        currentObj.children[file.id] = file
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          knownIds[file.id] = path.concat(file.id)
        }
      }
    }
  }
  let numAttempts = 0
  while (filedIds.size < files.length && numAttempts < 20) {
    placeFiles()
    numAttempts++
  }
  return folderStructure
}

export { getFiles, assembleDirStructure }