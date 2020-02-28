import React from 'react';
import NavFile from './components/navFile'

// TODO simplify this function
function folderStructureToString(file, descendancyLevel) {
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

function renderDirStructure(file, level) {
  let children = [];
  if (file.hasOwnProperty('children') && Object.entries(file.children).length > 0) {
    // TODO convert this to map
    for (let childFile of Object.values(file.children)) {
      children.push(renderDirStructure(childFile, level + 1))
    }
    // return <NavFile name={file.name} children={children} key={file.id} level={level}/>
  }
  else {
    // return <NavFile name={file.name} key={file.id} level={level}/>
  }
  return <NavFile name={file.name} children={children} key={file.id} level={level}/>
}

export {folderStructureToString, renderDirStructure}