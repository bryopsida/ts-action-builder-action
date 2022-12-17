import * as core from '@actions/core'
import {simpleGit} from 'simple-git'
import {spawn} from 'child_process'

// TODO refactor to async/await and/or breakup calls, prove it works then clean it up.
async function run(): Promise<void> {
  try {
    // set up git
    const git = simpleGit()
      .addConfig('user.name', 'Action Build-Bot')
      .addConfig(
        'user.email',
        `${process.env.GITHUB_ACTOR}@users.noreply.github.com>`
      )
    core.info('Fetching remote history')
    await git.fetch()
    core.info('Checking out branch')
    await git.checkout(
      (process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME) as string
    )

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

          git.status({}, (err, result) => {
            if (err) return core.setFailed(err)
            if (result.isClean()) return
            core.info('Detected a build is required')

            /// stage files
            core.info('Staging files')
            git.add('.', addErr => {
              if (addErr) return core.setFailed(addErr)
              core.info('Committing files')
              git.commit(
                'Distibution build after dependency update',
                {
                  '--author': `Action Build-Bot <${process.env.GITHUB_ACTOR}@users.noreply.github.com>`
                },
                commitErr => {
                  if (commitErr) return core.setFailed(commitErr)
                  // push back to remote
                  core.info('Pushing to remote')
                  git.push(pushErr => {
                    if (pushErr)
                      return core.setFailed(`Push failed; ${pushErr}`)
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
