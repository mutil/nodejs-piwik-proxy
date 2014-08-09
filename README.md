# Nodejs piwik proxy
> Port of [Piwik Proxy Hide URL](http://github.com/piwik/piwik/tree/master/misc/proxy-hide-piwik-url) to Nodejs.

This script allows to track statistics using Piwik, without revealing the
Piwik Server URL. This is useful for users who track multiple websites
on the same Piwik server, but don't want to show the Piwik server URL in
the source code of all tracked websites.

Another use case is when the piwik server is behind HTTP Authorization
and you need to provide auth credentials.

## Requirements
To run this properly you will need

 * Piwik server latest version
 * One or several website(s) to track with this Piwik server, for example http://trackedsite.com
 * A server running Nodejs

## How to track trackedsite.com without revealing the Piwik server URL

1. In your Piwik server, login as Super user
2. Create a user, set the login for example: "UserTrackingAPI"
3. Assign this user "admin" permission on all websites you wish to track without showing the Piwik URL
4. In your node server directory run

        npm install nodejs-piwik-proxy --save

5. Require the module in your nodejs app and call the constructor
   with the the piwik URL, the token auth for this user and options

        PiwikProxy = require('nodejs-piwik-proxy')
        // Pass config.options as the third parameter if you need fine-tuning
        piwikProxy = new PiwikProxy('http://your-piwik-domain.example.org/piwik/', tokenAuth)

6. Make a `/piwik` route, for example at: http://trackedsite.com/piwik.
   This route will be called by the Piwik Javascript,
   instead of calling directly the (secret) Piwik Server URL (http://your-piwik-domain.example.org/piwik/)

        app.get('/piwik', function(req, res){
          piwikProxy.process(req, res)
        });

7. You now need to add the modified Piwik Javascript Code to the footer of your pages at http://trackedsite.com/
   Go to Piwik > Settings > Websites > Show Javascript Tracking Code.
   Copy the Javascript snippet. Then, edit this code and change the last lines to the following:

        [...]
        (function() {
          _paq.push(["setTrackerUrl", "/piwik"]);
          _paq.push(["setSiteId", "trackedsite-id"]);
          var d=document, g=d.createElement("script"), s=d.getElementsByTagName("script")[0]; g.type="text/javascript";
          g.defer=true; g.async=true; g.src="/piwik"; s.parentNode.insertBefore(g,s);
        })();
        </script>
        <!-- End Piwik Code -->


   What's changed in this code snippet compared to the normal Piwik code?

   * the (secret) Piwik URL is no longer there
   * the "piwik.php" and "piwik.js" become "/piwik" because this route will also display and proxy the Javascript file
   * the `<noscript>` part of the code at the end is removed,
     since it is not currently used by Piwik, and it contains the (secret) Piwik URL which you want to hide.
   * make sure to replace trackedsite-id with your idsite again.

8. Paste the modified Piwik Javascript code in your website "trackedsite.com" pages you wish to track.
   This modified Javascript Code will then track visits/pages/conversions by calling trackedsite.com/piwik
   which will then automatically call your (hidden) Piwik Server URL

9. Done!
   At this stage, example.com should be tracked by your Piwik without showing the Piwik server URL.
   Repeat the steps 4, 5, 6, 7 and 8 for each website you wish to track in Piwik

## Example
>See the /example directory of this repository for the complete example.

To run the example, fill in the required values in *config.json* and from the example directory, run

    npm install && npm install express@4 && node app.js

Then, replace 'trackedsite-id' in index.html and point your browser to [http://localhost:3000]() to make a piwik request

## Tests
From the root directory

    npm install

To run the tests, run

     npm test

To run and ouput coverage report, run

    npm run coverage

## JSDoc
To generate source documentation in '/doc' directory, run:

    npm install jsdoc && node_modules/jsdoc/jsdoc.js -d doc . README.md

## Licence
[ISC Licence](http://en.wikipedia.org/wiki/ISC_license)
