import React from 'react';
import logo from './logo.svg';
import './App.css';
// import handleClientLoad from './driveRetrieval.js'

// Client ID and API key from the Developer Console
var CLIENT_ID = '363872304328-t3h8sa4icpbaj9lkrpraf5ujoidtsc6h.apps.googleusercontent.com';
var API_KEY = 'AIzaSyCx2v-_ROpl1g_-3OK8nMIWJjtJkqkFkew';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';


class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {signedIn: null}
  }
  /**
 *  On load, called to load the auth2 library and API client library.
 */
handleClientLoad() {
  window.gapi.load('client:auth2', this.initClient.bind(this));
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
async initClient() {
  console.log(this)
  window.gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(async () => {
    // Listen for sign-in state changes.
    window.gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSigninStatus.bind(this));

    // Handle the initial sign-in state.
    await this.updateSigninStatus(window.gapi.auth2.getAuthInstance().isSignedIn.get());
    // authorizeButton.onclick = handleAuthClick;
    // signoutButton.onclick = handleSignoutClick;
  }, function(error) {
    // appendPre(JSON.stringify(error, null, 2));
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
async updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    console.log('signed int')
    this.setState({signedIn: true})
    // authorizeButton.style.display = 'none';
    // signoutButton.style.display = 'block';
    let filesStored = sessionStorage.getItem('files')
    let files;
    if (filesStored){
      console.log('loading cached files')
      files = JSON.parse(filesStored)
    }
    else {
      files = await this.getFiles();
    }
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
    // console.log(folderStructure)
    document.getElementById('results').innerHTML = printFolderStructure(folderStructure, 0)
  } else {
    this.setState({signedIn: false})
    // authorizeButton.style.display = 'block';
    // signoutButton.style.display = 'none';
  }
}
    /**
   *  Sign in the user upon button click.
   */
   handleAuthClick(event) {
    window.gapi.auth2.getAuthInstance().signIn();
  }

  /**
   *  Sign out the user upon button click.
   */
   handleSignoutClick(event) {
    window.gapi.auth2.getAuthInstance().signOut();
  }

  /**
   *  Sign out the user upon button click.
   */
   handleCacheClearClick(event) {
    sessionStorage.clear()
  }

  /**
   * Append a pre element to the body containing the given message
   * as its text node. Used to display the results of the API call.
   *
   * @param {string} message Text to be placed in pre element.
   */
   appendPre(message) {
    var pre = document.getElementById('content');
    var textContent = document.createTextNode(message + '\n');
    pre.appendChild(textContent);
  }

  async getFiles() {
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
        if (response.result.nextPageToken != nextPageToken) {
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
  componentDidMount() {
    this.script = document.createElement("script");
    this.script.src = "https://apis.google.com/js/api.js";
    this.script.async = true;
    this.script.defer = true;
    this.script.onload = (e) => {this.handleClientLoad()};
    document.body.appendChild(this.script);
  }
  render = () => (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
          <p>Drive API Quickstart</p>
{this.state.signedIn === false &&
          <button id="authorize_button"
        onClick={this.handleAuthClick}>Authorize</button>}
{this.state.signedIn === true &&
          <button id="signout_button"
        onClick={this.handleSignoutClick}>Sign Out</button>}
          {/* <button id="signout_button" style={{display: (this.state.isSignedIn ? 'block' : 'none')}}>Sign Out</button> */}
          <button id="clear_cache" onClick={sessionStorage.clear}>Clear Cache</button>
      
          <pre id="content" style={{whiteSpace: 'pre-wrap'}}></pre>
          
          {/* <script src="https://apis.google.com/js/api.js"
            onLoad={(e) => {this.handleClientLoad(); console.log('loade')}}>
          </script> */}
          <p id='results'></p>
      </header>
    </div>
  )
}


function printFolderStructure(file, descendancyLevel) {
  let totalString = file.name ? file.name + '<br>' : '<br>'
  if (file.hasOwnProperty('children') && Object.entries(file.children).length != 0) {
    for (let fileId in file.children) {
      let childFile = file.children[fileId]
      totalString += '&nbsp;'.repeat(descendancyLevel) + childFile.name + '<br>'
      if (childFile.hasOwnProperty('children')) {
        for (let file2 of Object.values(childFile.children)) {
          totalString += ('&nbsp;'.repeat(descendancyLevel) + printFolderStructure(file2, descendancyLevel + 1) + '<br>')
        }
      }
    } 
  }
  return totalString
}

export default App;
