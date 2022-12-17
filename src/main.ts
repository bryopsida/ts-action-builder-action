import * as core from '@actions/core'
import {simpleGit} from 'simple-git'
import {spawn} from 'child_process'

// TODO refactor to async/await and/or breakup calls, prove it works then clean it up.
async function run(): Promise<void> {
  try {
    core.info('Running install')
    const installProc = spawn('npm', ['install', '--ignore-scripts'])
    installProc.stdout.pipe(process.stdout)
    installProc.stderr.pipe(process.stderr)
    installProc.on('close', installCode => {
      if (installCode !== 0) return core.setFailed('Install failed')
      core.info('Running build')
      const buildProc = spawn('npm', ['run', 'build'])
      buildProc.stdout.pipe(process.stdout)
      buildProc.stderr.pipe(process.stderr)
      buildProc.on('close', code => {
        if (code !== 0) return core.setFailed('Build failed')
        core.info('Running package')
        const packageProc = spawn('npm', ['run', 'package'])
        packageProc.stdout.pipe(process.stdout)
        packageProc.stderr.pipe(process.stderr)
        packageProc.on('close', packageCode => {
          if (packageCode !== 0) return core.setFailed('Package failed')
          const git = simpleGit()
            .addConfig('user.name', 'TS Action Build Bot')
            .addConfig(
              'user.email',
              '8363252+bryopsida@users.noreply.github.com'
            )

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
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
