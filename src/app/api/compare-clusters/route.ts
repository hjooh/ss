import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const apartmentIds: string[] = body?.apartmentIds || []
    if (!Array.isArray(apartmentIds) || apartmentIds.length === 0) {
      return NextResponse.json({ error: 'apartmentIds required' }, { status: 400 })
    }

    // Resolve python script path
    const scriptPath = path.join(process.cwd(), 'private', 'beli-apt-pv', 'analysis', 'clustering.py')

    // Spawn python process and pass JSON payload as argv[1]
    const py = spawn('python', [scriptPath, JSON.stringify({ apartmentIds })], {
      cwd: path.join(process.cwd(), 'private', 'beli-apt-pv', 'analysis')
    })

    let stdout = ''
    let stderr = ''
    py.stdout.on('data', (data) => { stdout += data.toString() })
    py.stderr.on('data', (data) => { stderr += data.toString() })

    const exitCode: number = await new Promise((resolve) => {
      py.on('close', resolve)
    }) as unknown as number

    if (exitCode !== 0) {
      console.error('compare-clusters python error:', stderr)
      return NextResponse.json({ error: 'Python process failed' }, { status: 500 })
    }

    // The script prints logs and then the final JSON; try to parse the last JSON-looking block
    const jsonMatch = stdout.trim().match(/\{[\s\S]*\}$/)
    if (!jsonMatch) {
      console.error('compare-clusters parse error. stdout:', stdout)
      return NextResponse.json({ error: 'Failed to parse result' }, { status: 500 })
    }
    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (e) {
    console.error('compare-clusters route error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



