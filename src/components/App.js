import React from "react";
import {
  assembleDirStructure,
  getFilesbyQuotaBytesUsed,
  getFoldersByReceny,
  getRootFolder,
} from "../fileRetrieval";
import { renderDirStructure } from "../dirStructureDisplay";
import "./App.css";

// Client ID and API key from the Developer Console
var CLIENT_ID =
  "363872304328-t3h8sa4icpbaj9lkrpraf5ujoidtsc6h.apps.googleusercontent.com";
var API_KEY = "AIzaSyCx2v-_ROpl1g_-3OK8nMIWJjtJkqkFkew";

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/drive.metadata.readonly";

class App extends React.Component {
  constructor(props) {
    super(props);
    // TODO come up with may to make sure this id will not clash with others (maybe symbol or other datatype?)
    // TODO move this dummy root to fileretreival dirstruct functions
    this.state = {
      signedIn: null,
      dirStructure: null,
      loading: false,
      signInError: false,
      finishedRequesting: false,
      numRequests: 0,
      numFiles: 0,
      numFilesPlaced: 0,
      filesAndFolders: [],
      rootFolders: [],
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
        scope: SCOPES,
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
        (error) => {
          console.error(error);
          this.setState({ signInError: true, signedIn: false });
        }
      );
  }

  async loadFiles() {
    const myDriveFolder = await getRootFolder();
    this.setState((prevState) => ({
      loading: true,
      numRequests: 0,
      dirStructure: null,
      rootFolders: prevState.rootFolders.concat(myDriveFolder),
      filesAndFolders: [myDriveFolder],
    }));
    let fileLoadPromise = this.recursivelyGetFiles();
    let folderLoadPromise = this.recursivelyGetFolders();
    let loadResult = await Promise.all([
      fileLoadPromise,
      folderLoadPromise,
    ]).then(([filesLoaded, foldersLoaded]) => {
      return filesLoaded && foldersLoaded;
    });
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
  handleSignoutClick = (event) => {
    this.setState({ signedIn: false });
    window.gapi.auth2.getAuthInstance().signOut();
  };

  componentDidMount() {
    this.script = document.createElement("script");
    this.script.src = "https://apis.google.com/js/api.js";
    this.script.async = true;
    this.script.defer = true;
    this.script.onload = (e) => {
      this.handleClientLoad();
    };
    document.body.appendChild(this.script);
  }

  handleDriveObjReceived = async (
    fileResult,
    stopCondition = (_newFiles) => false
  ) => {
    if (fileResult) {
      var [newFiles, newNextPageToken] = fileResult;
      this.setState((prevState) => {
        const oldPlusNewFiles = prevState.filesAndFolders.concat(newFiles);
        if (oldPlusNewFiles.length > prevState.filesAndFolders.length) {
          let [assembledDirStructure, filesPlaced] = assembleDirStructure(
            oldPlusNewFiles,
            this.dummyRoot
          );
          return {
            filesAndFolders: prevState.filesAndFolders.concat(newFiles),
            dirStructure: assembledDirStructure,
            numRequests: prevState.numRequests + 1,
            numFilesPlaced: filesPlaced,
          };
        } else {
          return { ...prevState, numRequests: prevState.numRequests + 1 };
        }
      });
      if (stopCondition(newFiles)) {
        return false;
      } else {
        return newNextPageToken;
      }
    } else {
      return false;
    }
  };

  handleFilesReceived = async (fileResult) => {
    return this.handleDriveObjReceived(
      fileResult,
      // If the last file has zero size, we don't want to bother getting the rest (becase they don't affect quota)
      (newFiles) => {
        return parseFloat(newFiles[newFiles.length - 1].quotaBytesUsed) === 0.0;
      }
    );
  };

  handleFolderReceived = async (fileResult) => {
    return this.handleDriveObjReceived(fileResult);
  };

  // TODO shard file getter somehow (maybe by file type) for parallel requests
  async recursivelyGetFiles(nextPageToken) {
    return this.recursivelyGetDriveObjects(
      nextPageToken,
      getFilesbyQuotaBytesUsed,
      this.handleFilesReceived
    );
  }

  async recursivelyGetFolders(nextPageToken) {
    return this.recursivelyGetDriveObjects(
      nextPageToken,
      getFoldersByReceny,
      this.handleFolderReceived
    );
  }

  async recursivelyGetDriveObjects(nextPageToken, objectGetter, resultHandler) {
    if (this.state.signedIn) {
      objectGetter(nextPageToken)
        .then(resultHandler)
        .then((possibleNextPageToken) => {
          if (
            possibleNextPageToken &&
            possibleNextPageToken !== nextPageToken
          ) {
            return this.recursivelyGetDriveObjects(
              possibleNextPageToken,
              objectGetter,
              resultHandler
            );
          } else {
            return true;
          }
        })
        .catch((error) => {
          console.error(error);
          return false;
        });
    }
  }

  render() {
    return (
      <div className="App">
        <h1 className="header">DriveDirStat</h1>
        <p className="intro-text">
          Welcome to DriveDirStat! This tool analyzes what's taking up space in
          your Google Drive.{" "}
          {!this.state.signedIn &&
            'Click the "Authorize" button below to get started.'}{" "}
          Due to limitations in the Google Drive API, this process can take a
          while (often a few hours!). To keep it running, don't close this tab.
          You'll know it's still working if the "Number of requests received"
          below keeps increasing. A "Finished requesting" message will appear
          below when all your files are retrieved, but you can feel free to
          peruse what's been loaded so far in the folders below. Files are
          loaded from largest to smallest so you should be able to identify
          heavy hitters before the process is complete. If you'd like to
          contribute to this project visit{" "}
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
        {this.state.loading && <p className="loading">Loading</p>}
        {this.state.finishedRequesting && "Finished requesting"}
        {this.state.signInError && "Sign-in Error"}
        {!this.state.loading && this.state.signedIn && (
          <>
            {`Requests received: ${this.state.numRequests}`}
            <br></br>
            {/* TODO split out files and folders*/}
            {`Files and Folders received: ${this.state.filesAndFolders.length}`}
            {/* <br></br>
        {`Files placed in directories (unplaced files will not appear nor contribute to folder sizes): ${this.state.numFilesPlaced}`} */}
            <br></br>
            <div className="results">
              {this.state.dirStructure &&
                renderDirStructure(this.state.dirStructure, 0)}
            </div>
          </>
        )}
      </div>
    );
  }
}

export default App;
