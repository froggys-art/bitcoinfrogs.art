$ErrorActionPreference = 'Stop'
$path = 'c:\Users\HYAIPE\Documents\bitcoinfrogs.art\app\components\VerifyPanel.tsx'

if (-not (Test-Path -LiteralPath $path)) {
  Write-Error "File not found: $path"
  exit 1
}

# Read lines
$lines = Get-Content -LiteralPath $path

# 1) Replace tweet label text
for ($i=0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match '>\s*Tweet about undervalued Bitcoin Frogs\s*<') {
    $lines[$i] = $lines[$i] -replace '>\s*Tweet about undervalued Bitcoin Frogs\s*<','>Tweet<'
  }
}

# 2) Remove stray block starting with '{{ ... }}' and ending with a line that is exactly ')}'
$startIdx = -1
for ($i=0; $i -lt $lines.Length; $i++) {
  if ($lines[$i].Trim() -eq '{{ ... }}') { $startIdx = $i; break }
}
if ($startIdx -ge 0) {
  $endIdx = -1
  for ($j=$startIdx+1; $j -lt $lines.Length; $j++) {
    if ($lines[$j].Trim() -eq ')}') { $endIdx = $j; break }
  }
  if ($endIdx -ge 0) {
    $before = @()
    if ($startIdx -gt 0) { $before = $lines[0..($startIdx-1)] }
    $after = @()
    if ($endIdx -lt ($lines.Length-1)) { $after = $lines[($endIdx+1)..($lines.Length-1)] }
    $errorBlock = @(
      '      {error && (',
      '        <div className="mt-3 text-red-800 text-[11px] font-press">',
      '          {error}',
      '          <div className="mt-2">',
      '            <button',
      '              onClick={() => {',
      "                if (error && error.startsWith('X not connected')) return startX()",
      "                if (provider === 'xverse') return connectXverse()",
      "                if (provider === 'okx') return connectOKX()",
      '                return connectUniSat()',
      '              }}',
      '              className="underline hover:opacity-80"',
      '            >',
      "              {error && error.startsWith('X not connected') ? 'Reconnect X' : 'Retry'}",
      '            </button>',
      '          </div>',
      '        </div>',
      '      )}'
    )
    $lines = @()
    $lines += $before
    $lines += $errorBlock
    $lines += $after
  }
}

# Write back
Set-Content -LiteralPath $path -Value $lines -Encoding UTF8
Write-Host 'VerifyPanel.tsx fixed.'
