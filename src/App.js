import React from 'react';
import logo from './logo.svg';
import folderStructureToString from './debug.js'
import { getFiles, assembleDirStructure } from './fileRetrieval'
import './App.css';

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

// TODO consider moving this function to fileRetrieval
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
  }, function(error) {
    // TODO handle error
    // appendPre(JSON.stringify(error, null, 2));
  });
}

async retrieveAndDisplayFiles() {
  let filesStored = sessionStorage.getItem('files')
  let files;
  if (filesStored){
    files = JSON.parse(filesStored)
  }
  else {
    files = await getFiles();
  }
  let dirStructure = await assembleDirStructure(files)
  // console.log(folderStructure)
  this.setState({dirStructure})
  // document.getElementById('results').innerHTML = folderStructureToString(dirStructure, 0)
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
async updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    this.setState({signedIn: true})
    await this.displayFiles()
  } else {
    this.setState({signedIn: false})
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
          <button id="clear_cache" onClick={sessionStorage.clear}>Clear Cache</button>
      
          <pre id="content" style={{whiteSpace: 'pre-wrap'}}></pre>
          <p id='results'></p>
      </header>
    </div>
  )
}

export default App;
