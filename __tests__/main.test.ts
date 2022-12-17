import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import { test, jest} from '@jest/globals'

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', (done) => {
  jest.setTimeout(120000)
  const np = process.execPath
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecFileOptions = {
    env: process.env
  }
  const actionProc = cp.execFile(np, [ip], options)
  actionProc.stdout?.pipe(process.stdout)
  actionProc.stderr?.pipe(process.stderr)
  actionProc.on('close', code => {
    if (code !== 0) throw new Error(`Action returned code ${code}`)
    done()
  })
})
