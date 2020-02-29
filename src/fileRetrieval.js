let fileFields = "id, name, parents, quotaBytesUsed"

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
    console.log('setting next page')
    parameters.pageToken = nextPageToken
  }
  
  try {
    let response = await window.gapi.client.drive.files.list(parameters);
    files = files.concat(response.result.files)
    console.log('success req')
    return [files, response.result.nextPageToken];
  } catch(err) {
    console.log('fail req')
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
      if (!currentObj.children[el]) {return null}
      currentObj = attachChildProp(currentObj.children[el])
    }
    return currentObj
  }

  for (let file of files) {
    if (!file.parents) {
      console.log(file)
      continue
    }
    let parentId = file.parents[0]
    let unseenParent = !folderPaths.hasOwnProperty(parentId)
    let path = unseenParent ? [parentId] : folderPaths[parentId]
    // if a path to parent doesn't exist, we need create a dummy/unseen node for parent
    if (unseenParent && !rootFolder.children[parentId]) {
      rootFolder.children[parentId] = {unseen: true, id: parentId, children: {}}
    }
    if (rootFolder.children.hasOwnProperty(file.id) && rootFolder.children[file.id].unseen) {
      file.children = JSON.parse(JSON.stringify(rootFolder.children[file.id].children))
      delete rootFolder[file.id]
    }
    let parent = getFileFromPath(path)
    if (parent) {
      parent.children[file.id] = file
    }
    else {
      console.log(path, file)
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
  // console.log(rootFolder)
  return rootFolder
}

function annotateFileSizes(file) {
  if (!file.hasOwnProperty('children') || file.children.length === 0) {
    file.bytes = parseFloat(file.quotaBytesUsed) + 1
  }
  else {
    let childrenList = Object.values(file.children)
    file.bytes = parseFloat(file.quotaBytesUsed) + childrenList.reduce(
      (acc, childFile) => acc + annotateFileSizes(childFile), 0
      )
  }
  if (file.name === 'My Drive') {console.log(file.bytes)}
  return file.bytes
}

export { getFiles, assembleDirStructure}