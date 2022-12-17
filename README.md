# TS-Action-Builder-Action
## What is this?
This is an attempt to reduce maintenace overhead of maintaining dependencies in github typescript actions.
When using the actions/typescript-acton template it introduces a check that verifies the dist folder matches the expected result, 
this is a great check but it means anytime there is a dependabot or rennovatebot PR that introduces a dependency that changes the build result.... 
you have to manually checkout the branch, run the npm commands to get the compiled JS in sync again, and then merge it. This action automates that when it detects a build results in a dirty source tree.

## Gotchas
1) You must ensure this action runs before the check-dist action and any tests you might have that use the compiled result, or re-run afterwards. Here's an example on how to do that.

``` yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  
  sync-dist:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ github.head_ref }}
          fetch-depth: 0
          persist-credentials: true
      - uses: bryopsida/ts-action-builder-action@v1 #or @main if you prefer
  
  build-and test:
    runs-on: ubuntu-latest
    needs:
      - sync-dist
    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ github.head_ref }}
          fetch-depth: 0
          persist-credentials: true
      - run: |
          npm install
      - run: |
          npm run all
  
  check-dist:
    runs-on: ubuntu-latest
    needs:
     - sync-dist
    steps:
      - uses: actions/checkout@v3
        with:
            ref: ${{ github.head_ref }}
            fetch-depth: 0
            persist-credentials: true
            ...
```
2) The GITHUB_TOKEN of the actor who trigger the action must have write acces to the repo, in the future this may change if an optional parameter to provide a GITHUB PAT is added.