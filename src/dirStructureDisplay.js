import React from 'react';
import NavFile from './components/navFile'

function renderDirStructure(file, level) {
  let children = [];
  if (file.hasOwnProperty('children') && Object.entries(file.children).length > 0) {
    // TODO convert this to map
    for (let childFile of Object.values(file.children)) {
      children.push(renderDirStructure(childFile, level + 1))
    }
  }
  return <NavFile name={file.name} children={children} key={file.id} level={level} bytes={file.bytes}/>
}

export { renderDirStructure }