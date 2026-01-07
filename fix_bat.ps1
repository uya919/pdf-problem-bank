# Fix line endings for batch files
$files = @(
    "c:\MYCLAUDE_PROJECT\pdf\stop-servers.bat",
    "c:\MYCLAUDE_PROJECT\pdf - 복사본\stop-servers.bat"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace "`r`n", "`n"  # First normalize
        $content = $content -replace "`n", "`r`n"  # Then convert to CRLF
        [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::ASCII)
        Write-Host "Fixed: $file"
    }
}
