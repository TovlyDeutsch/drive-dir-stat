let fileFields = "id, name, mimeType, parents, quotaBytesUsed"

async function getFiles() {
  // 1000 is maximum retrieval size
  // adapted from Google Drive API documentation quickstart //(https://developers.google.com/drive/v3/web/quickstart/js)
  let nextPageToken = null;
  let files = [];
  let numRequests = 0;
  do {
    let parameters = {
      'pageSize': 1000,
      'fields': `nextPageToken, files(${fileFields})`,
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
        // TODO check for existence of files and nextPageToken and retrieval start
        sessionStorage.setItem('files', JSON.stringify(files))
        if (nextPageToken != null) {
          sessionStorage.setItem('nextPageToken', nextPageToken)
        }
      }
      else {
        break
      }
    } catch(err) {
      // TODO display error to user
      console.log(err)
    }
  } while (nextPageToken != null && numRequests < 1000);
  return files;
}

async function assembleDirStructure(files) {
  let rootFolderResponse = await window.gapi.client.drive.files.get({fileId: 'root', fields: fileFields})
  let rootFolder = rootFolderResponse.result
  let rootFolderId = rootFolder.id
  let folderPaths = {}
  folderPaths[rootFolderId] = []
  let filedIds = new Set([rootFolderId])
  rootFolder.children = {}

  function placeFiles() {
    for (let file of files) {
      if (file.parents && folderPaths.hasOwnProperty(file.parents[0]) && !filedIds.has(file.id)) {
        let path = folderPaths[file.parents[0]]
        let currentObj = rootFolder
        for (let el of path) {
          currentObj = currentObj.children[el]
        }
        if (!currentObj.hasOwnProperty('children')) { currentObj.children = {}}
        currentObj.children[file.id] = file
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          folderPaths[file.id] = path.concat(file.id)
        }
      }
    }
  }

  let numAttempts = 0
  while (filedIds.size < files.length && numAttempts < 20) {
    placeFiles()
    numAttempts++
  } 
  // TODO consider reformatting here to avoid the constant need for Object.Values
  annotateFileSizes(rootFolder)
  return rootFolder
}

async function getAssembledDirStruct() {
  let filesStored = sessionStorage.getItem('files')
  let files;
  if (filesStored){
    files = JSON.parse(filesStored)
  }
  else {
    files = await getFiles();
  }
  return await assembleDirStructure(files)
}

function annotateFileSizes(file) {
  if (!file.hasOwnProperty('children') || file.children.length === 0) {
    file.bytes = parseFloat(file.quotaBytesUsed)
  }
  else {
    let childrenList = Object.values(file.children)
    file.bytes = parseFloat(file.quotaBytesUsed) + childrenList.reduce(
      (acc, childFile) => acc + annotateFileSizes(childFile), 0
      )
  }
  return file.bytes
}

export { getFiles, assembleDirStructure, getAssembledDirStruct }