export default function folderStructureToString(file, descendancyLevel) {
  let totalString = file.name ? file.name + '<br>' : '<br>'
  if (file.hasOwnProperty('children') && Object.entries(file.children).length !== 0) {
    for (let fileId in file.children) {
      let childFile = file.children[fileId]
      totalString += '&nbsp;'.repeat(descendancyLevel) + childFile.name + '<br>'
      if (childFile.hasOwnProperty('children')) {
        for (let file2 of Object.values(childFile.children)) {
          totalString += ('&nbsp;'.repeat(descendancyLevel) + folderStructureToString(file2, descendancyLevel + 1) + '<br>')
        }
      }
    } 
  }
  return totalString
}