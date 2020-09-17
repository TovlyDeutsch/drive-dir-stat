let fileFields = "id, name, parents, quotaBytesUsed";
// TODO figure out how to exclude files in backups ("Computers")

function constructMimeQuery(mimeType) {
  return `mimeType = "${mimeType}"`;
}

async function getFilesWithMimeType(nextPageToken, mimeType) {
  const fileMimeQuery = constructMimeQuery(mimeType);
  const orderBy = "quotaBytesUsed desc";
  return getFiles(nextPageToken, fileMimeQuery, orderBy);
}

async function getFilesbyQuotaBytesUsed(nextPageToken) {
  const fileMimeQuery =
    '((not mimeType contains "application/vnd.google-apps") and (mimeType != "application/vnd.google-apps.folder"))';
  const orderBy = "quotaBytesUsed desc";
  return getFiles(nextPageToken, fileMimeQuery, orderBy);
}

async function getFoldersByReceny(nextPageToken) {
  const folderMimeQuery = '(mimeType = "application/vnd.google-apps.folder")';
  // Not sure what "receny" means but it seems to work well. Other options include "modifiedTime" and "viewedByMeTime"
  const orderBy = "quotaBytesUsed desc, recency desc";
  return getFiles(nextPageToken, folderMimeQuery, orderBy);
}

async function getFiles(nextPageToken, mimeQuery, orderBy) {
  // 1000 is maximum retrieval size
  // adapted from Google Drive API documentation quickstart //(https://developers.google.com/drive/v3/web/quickstart/js)
  let files = [];
  let parameters = {
    pageSize: 1000,
    fields: `nextPageToken, files(${fileFields})`,
    q: `trashed = false and 'me' in owners and ${mimeQuery}`,
    orderBy: orderBy,
  };

  // if not first request, set the pageToken to the next page
  if (nextPageToken) {
    parameters.pageToken = nextPageToken;
  }

  try {
    let response = await window.gapi.client.drive.files.list(parameters);
    files = files.concat(response.result.files);
    return [files, response.result.nextPageToken];
  } catch (err) {
    return [files, nextPageToken];
  }
}

function attachChildProp(obj) {
  if (!obj.hasOwnProperty("children")) {
    obj.children = {};
  }
  return obj;
}

async function getRootFolder() {
  let cachedRootFolder = sessionStorage.getItem("root");
  let rootFolder;
  if (!cachedRootFolder) {
    let rootFolderResponse = await window.gapi.client.drive.files.get({
      fileId: "root",
      fields: fileFields,
    });
    rootFolder = attachChildProp(rootFolderResponse.result);
    sessionStorage.setItem("root", JSON.stringify(rootFolder));
  } else {
    rootFolder = JSON.parse(cachedRootFolder);
  }
  return rootFolder;
}

function assembleDirStructure(files) {
  // TODO come up with may to make sure this id will not clash with others (maybe symbol or other datatype?)
  let rootFolder = {
    name: "All Files",
    id: "ultimateUniqueRoot",
    children: {},
    quotaBytesUsed: "0",
  };
  let folderPaths = { [rootFolder.id]: [] };

  function getFileFromPath(path) {
    let currentObj = rootFolder;
    for (let el of path) {
      if (!currentObj.children[el]) {
        return null;
      }
      currentObj = attachChildProp(currentObj.children[el]);
    }
    return currentObj;
  }

  let unPlacedFiles = 0;
  for (let file of files) {
    if (!file.parents) {
      // TODO add ability to hide any of the root folder to improve performance/responsiveness
      file.parents = [rootFolder.id];
    }
    let parentId = file.parents[0];
    let unseenParent = !folderPaths.hasOwnProperty(parentId);
    let path = unseenParent ? [parentId] : folderPaths[parentId];
    // if a path to parent doesn't exist, we need create a dummy/unseen node for parent
    if (unseenParent && !rootFolder.children[parentId]) {
      rootFolder.children[parentId] = {
        unseen: true,
        id: parentId,
        children: {},
      };
    }
    if (
      rootFolder.children.hasOwnProperty(file.id) &&
      rootFolder.children[file.id].unseen
    ) {
      file.children = JSON.parse(
        JSON.stringify(rootFolder.children[file.id].children)
      );
      delete rootFolder[file.id];
    }
    let parent = getFileFromPath(path);
    if (parent) {
      parent.children[file.id] = file;
    } else {
      unPlacedFiles++;
    }
    folderPaths[file.id] = path.concat(file.id);
  }

  // prune dummy/unseen nodes
  for (let rootNestedFileId in rootFolder.children) {
    if (rootFolder.children[rootNestedFileId].unseen) {
      delete rootFolder.children[rootNestedFileId];
    }
  }
  annotateFileSizes(rootFolder);
  return [rootFolder, unPlacedFiles];
}

function annotateFileSizes(file) {
  if (!file.hasOwnProperty("children") || file.children.length === 0) {
    file.bytes = parseFloat(file.quotaBytesUsed);
  } else {
    let childrenList = Object.values(file.children);
    file.bytes =
      parseFloat(file.quotaBytesUsed) +
      childrenList.reduce(
        (acc, childFile) => acc + annotateFileSizes(childFile),
        0
      );
  }
  file.formattedBytes = formatBytes(file.bytes);
  return file.bytes;
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = Math.max(0, decimals);
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (bytes / Math.pow(k, i)).toFixed(dm) + " " + sizes[i];
}

export {
  assembleDirStructure,
  getFilesbyQuotaBytesUsed,
  getFoldersByReceny,
  getRootFolder,
  getFilesWithMimeType,
};
