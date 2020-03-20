# DriveDirStat
[![Netlify Status](https://api.netlify.com/api/v1/badges/ec6aa256-e9f9-4cbd-8dfc-04f36677f664/deploy-status)](https://app.netlify.com/sites/drivedirstat/deploys)

DriveDirStat analyzes your cloud storage to figure out what is taking up space. Currently, it only supports Google Drive but I'd like it to support other services as well (e.g. OneDrive).

## Usage

Visit [drivedirstat.netlify.com](https://drivedirstat.netlify.com/) and click "sign in" to authorize DriveDirStat. The app will begin sending requests to the Google Drive API. The API is limited to 1000 files per request so if you have many files in your drive, the process will take a while (often > 2 hours); don't close the tab or shut off your computer while this process is running as that will terminate the analysis. Once the app has finished it will display "Finished requesting" and you can explore your drive by clicking on the ▶ icons to open folders.

## Contributing

I welcome any contributions! The biggest issue with the app right now is its slowness, which is constrained by the file limit of the Google Drive API. One solution to this might be running the requesting code on a server and notifying the user when their analysis is complete (e.g. via email or push notifications). This wouldn't speed up the process but at least the user wouldn't have to worry about keeping the tab open and their computer on. It would also help to exclude backups ("Computers" in Google Drive UI) from requests but I'm not sure if that's possible (see fileRetrieval.js).

I've tried adding local caching of results via the [localforage library](https://github.com/localForage/localForage) but the results quickly exhaust the maximum storage sizes of the underlying APIs (e.g. IndexedDB or localStorage). I welcome any other ideas on how to do this. Although clunky, maybe this could include letting the user download their results as a json.

Another area that could use work is the UI which is relatively basic at the moment.

Lastly, I'd like to extend the app to support cloud storage providers other than Google Drive (e.g. OneDrive).
