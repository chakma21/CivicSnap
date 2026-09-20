// Bundles both Lambda handlers and pushes them to AWS.
// Usage: npm run deploy   (from backend/)
// Requires the AWS CLI to be installed and configured (same credentials used for the rest of this project).

import { build } from 'esbuild'
import { ZipArchive } from 'archiver'
import { exec } from 'node:child_process'
import { createWriteStream, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')
const distDir = path.join(backendRoot, 'dist')

const FUNCTIONS = [
  { entry: 'src/handlers/apiGateway.ts', out: 'index.js', zip: 'lambda.zip', functionName: 'civicsnap-api' },
  { entry: 'src/handlers/escalation.ts', out: 'escalation.js', zip: 'escalation.zip', functionName: 'civicsnap-escalation' },
]

function zipFile(sourcePath, zipPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)
    archive.file(sourcePath, { name: path.basename(sourcePath) })
    archive.finalize()
  })
}

function runAwsCli(args) {
  const command = ['aws', ...args.map((a) => `"${a}"`)].join(' ')
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message))
        return
      }
      resolve(stdout)
    })
  })
}

async function main() {
  mkdirSync(distDir, { recursive: true })

  for (const fn of FUNCTIONS) {
    const entryPath = path.join(backendRoot, fn.entry)
    const outPath = path.join(distDir, fn.out)
    const zipPath = path.join(distDir, fn.zip)

    console.log(`\n[build] ${fn.entry} -> ${fn.out}`)
    await build({
      entryPoints: [entryPath],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      outfile: outPath,
      external: ['aws-sdk'],
    })

    console.log(`[zip] ${fn.out} -> ${fn.zip}`)
    await zipFile(outPath, zipPath)

    console.log(`[deploy] uploading to Lambda function "${fn.functionName}"...`)
    await runAwsCli([
      'lambda', 'update-function-code',
      '--function-name', fn.functionName,
      '--zip-file', `fileb://${zipPath}`,
      '--region', 'ap-south-1',
      '--output', 'json',
    ])
    console.log(`[done] ${fn.functionName} updated`)
  }

  console.log('\nAll Lambda functions deployed successfully.')
}

main().catch((err) => {
  console.error('\nDeploy failed:', err.message)
  process.exit(1)
})
