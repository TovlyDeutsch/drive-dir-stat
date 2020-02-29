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
      q: "trashed = false and 'me' in owners",
    }
  
    // if not first request, set the pageToken to the next page
    if (nextPageToken) { 
      parameters.pageToken = nextPageToken
    }
    
    try {
      let response = await window.gapi.client.drive.files.list(parameters);
      numRequests++
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
  } while (nextPageToken != null && numRequests < 1);
  return files;
}



async function assembleDirStructure(files) {
  function attachChildProp(obj) {
    if (!obj.hasOwnProperty('children')) {obj.children = {}}
    return obj
  }

  let rootFolderResponse = await window.gapi.client.drive.files.get({fileId: 'root', fields: fileFields})
  let rootFolder = attachChildProp(rootFolderResponse.result)
  let folderPaths = {[rootFolder.id]: []}

  function getFileFromPath(path) {
    let currentObj = rootFolder
    for (let el of path) {
      currentObj = attachChildProp(currentObj.children[el])
    }
    return currentObj
  }

  for (let file of files) {
    let parentId = file.parents[0]
    let unseenParent = !folderPaths.hasOwnProperty(parentId)
    let path = unseenParent ? [parentId] : folderPaths[parentId]
    if (unseenParent) {  // if a path to parent doesn't exist, we need a dummy/unseen node for parent
      rootFolder.children[parentId] = {unseen: true, id: parentId, children: {}}
    }
    getFileFromPath(path).children[file.id] = file
    if (rootFolder.children.hasOwnProperty(file.id) && rootFolder.children[file.id].unseen) {
      file.children = JSON.parse(JSON.stringify(rootFolder.children[file.id].children))
      delete rootFolder[file.id]
    }
    folderPaths[file.id] = path.concat(file.id)
  }
  
  // prune dummy/unseen nodes
  for (let rootNestedFileId in rootFolder.children) {
    if (rootFolder.children[rootNestedFileId].unseen) {
      delete rootFolder.children[rootNestedFileId]
    }
  }
  
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
    console.log('fetching files')
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