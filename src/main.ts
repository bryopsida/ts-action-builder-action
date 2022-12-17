import * as core from '@actions/core'
import {simpleGit} from 'simple-git'
import {spawn} from 'child_process'

// TODO refactor to async/await and/or breakup calls, prove it works then clean it up.
async function run(): Promise<void> {
  try {
    const buildProc = spawn('npm', ['run', 'build'])
    buildProc.on('close', code => {
      if (code !== 0) return core.setFailed('Build failed')

      const packageProc = spawn('npm', ['run', 'package'])
      packageProc.on('close', packageCode => {
        if (packageCode !== 0) return core.setFailed('Package failed')
        const git = simpleGit()

        git.status({}, (err, result) => {
          if (err) return core.setFailed(err)
          if (result.isClean()) return
          core.info('Detected a build is required')

          /// stage files
          git.add('.', addErr => {
            if (addErr) return core.setFailed(addErr)

            git.commit(
              'Distibution build after dependency update',
              commitErr => {
                if (commitErr) return core.setFailed(commitErr)

                // push back to remote
                git.push(pushErr => {
                  if (pushErr) return core.setFailed(pushErr)
                  core.info('Finished updating build')
                })
              }
            )
          })
        })
      })
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
