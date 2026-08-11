# Property Calculator V3

This version uses a standard `onSubmit` handler so the loading state appears immediately before the API request begins.

## Visual deployment check

After deployment, the left-side heading must show:

`Calculator V3`

If that badge does not appear, Vercel is serving an older deployment or the new project files were not pushed.

## Loading experience

After clicking calculate, users see:

- rotating rupee indicator;
- elapsed timer;
- staged property-analysis messages;
- animated progress bar;
- disabled form controls;
- live market calculation status;
- spinner in the submit button.

## Deploy

1. Replace the entire current project with this folder.
2. Commit and push the files to the Git branch linked to Vercel.
3. In Vercel, confirm the newest deployment uses that commit.
4. Open the deployment URL in an incognito window.
5. Confirm the `Calculator V3` badge appears.
