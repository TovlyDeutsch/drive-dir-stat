let fileFields = "id, name, mimeType, parents, quotaBytesUsed"

async function getFiles(nextPageToken) {
  // 1000 is maximum retrieval size
  // adapted from Google Drive API documentation quickstart //(https://developers.google.com/drive/v3/web/quickstart/js)
  let files = [];
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
    files = files.concat(response.result.files)
    return [files, response.result.nextPageToken];
  } catch(err) {
    return null
  }
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
  console.log(rootFolder)
  annotateFileSizes(rootFolder)
  return rootFolder
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

export { getFiles, assembleDirStructure}