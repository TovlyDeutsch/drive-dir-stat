import React from "react";
import { getFiles, assembleDirStructure } from "../fileRetrieval";
import { renderDirStructure } from "../dirStructureDisplay";
import "./App.css";

// Client ID and API key from the Developer Console
var CLIENT_ID =
  "363872304328-t3h8sa4icpbaj9lkrpraf5ujoidtsc6h.apps.googleusercontent.com";
var API_KEY = "AIzaSyCx2v-_ROpl1g_-3OK8nMIWJjtJkqkFkew";

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/drive.metadata.readonly";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      signedIn: null,
      dirStructure: null,
      loading: false,
      signInError: false,
      finishedRequesting: false,
      numRequests: 0
    };
  }
  /**
   *  On load, called to load the auth2 library and API client library.
   */
  handleClientLoad() {
    window.gapi.load("client:auth2", this.initClient.bind(this));
  }

  // TODO consider moving this function (and above credentials) to fileRetrieval or auth-related file
  /**
   *  Initializes the API client library and sets up sign-in state
   *  listeners.
   */
  async initClient() {
    window.gapi.client
      .init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
      })
      .then(
        async () => {
          // Listen for sign-in state changes.
          window.gapi.auth2
            .getAuthInstance()
            .isSignedIn.listen(this.updateSigninStatus.bind(this));

          // Handle the initial sign-in state.
          await this.updateSigninStatus(
            window.gapi.auth2.getAuthInstance().isSignedIn.get()
          );
        },
        error => {
          this.setState({ signInError: true });
        }
      );
  }

  async loadFiles() {
    this.setState({ loading: true, dirStructure: null });
    let loadResult = await this.loadDirStruct();
    this.setState({ finishedRequesting: loadResult, loading: false });
  }

  /**
   *  Called when the signed in status changes, to update the UI
   *  appropriately. After a sign-in, the API is called.
   */
  async updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
      this.setState({ signedIn: true });
      await this.loadFiles();
    } else {
      this.setState({ signedIn: false });
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
  handleSignoutClick = event => {
    this.setState({ signedIn: false });
    window.gapi.auth2.getAuthInstance().signOut();
  };

  componentDidMount() {
    this.script = document.createElement("script");
    this.script.src = "https://apis.google.com/js/api.js";
    this.script.async = true;
    this.script.defer = true;
    this.script.onload = e => {
      this.handleClientLoad();
    };
    document.body.appendChild(this.script);
  }

  async loadDirStruct() {
    this.setState({ numRequests: 0 });
    sessionStorage.clear();
    let files = [];
    let nextPageToken;
    do {
      let fileResult = await getFiles(nextPageToken);
      if (fileResult) {
        var [newFiles, newNextPageToken] = fileResult;
        files = files.concat(newFiles);
      } else {
        return false;
      }

      if (newNextPageToken !== nextPageToken) {
        nextPageToken = newNextPageToken;
      }
      let assembledDirStructure = await assembleDirStructure(files);
      this.setState({
        numRequests: this.state.numRequests + 1,
        dirStructure: assembledDirStructure
      });
    } while (nextPageToken && this.state.signedIn);
    if (!this.state.signInError) {
      return false;
    }
  }

  render() {
    return (
      <div className="App">
        <p>DriveDirStat</p>
        <p>
          Welcome to DriveDirStat! This tool analyzes what's taking up space in
          your Google Drive.{" "}
          {!this.state.signedIn &&
            'Click the "Authorize" button below to get started.'}{" "}
          Due to limitations in the Google Drive API, this process can take a
          while (often more than 2 hours!). To keep it running, make don't close
          this tab, shut off your computer, or put it to sleep. You'll know it's
          still working if the "Number of requests received" below keeps
          increasing. A "Finished requesting" message will appear below when all
          your files are retrieved, but you can feel free to peruse what's been
          loaded so far in the folders below. If you'd like to contribute to
          this project visit{" "}
          <a
            href="https://github.com/TovlyDeutsch/drive-dir-stat"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://github.com/TovlyDeutsch/drive-dir-stat
          </a>
          .
        </p>
        {this.state.signedIn === false && (
          <button id="authorize_button" onClick={this.handleAuthClick}>
            Authorize
          </button>
        )}
        {this.state.signedIn === true && (
          <button id="signout_button" onClick={this.handleSignoutClick}>
            Sign Out
          </button>
        )}
        <br></br>
        <br></br>
        {this.state.loading && "Loading..."}
        <br></br>
        {this.state.finishedRequesting && "Finished requesting"}
        {`Number of requests received: ${this.state.numRequests}`}
        <br></br>
        {this.state.signInError && "Sign-in Error"}
        <div className="results">
          {this.state.dirStructure &&
            renderDirStructure(this.state.dirStructure, 0)}
        </div>
      </div>
    );
  }
}

export default App;
