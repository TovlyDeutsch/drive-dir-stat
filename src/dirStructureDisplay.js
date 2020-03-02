import React from 'react';
import NavFile from './components/NavFile'

function renderDirStructure(file, level) {
  let children = [];
  if (file.hasOwnProperty('children') && Object.entries(file.children).length > 0) {
    let sortedChildren = Object.values(file.children).sort((file1, file2)  => file2.bytes - file1.bytes)
    for (let childFile of sortedChildren) {
      children.push(renderDirStructure(childFile, level + 1))
    }
  }
  return <NavFile name={file.name} children={children} key={file.id} level={level} bytes={file.formattedBytes}/>
}

export { renderDirStructure }