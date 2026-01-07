$files = Get-ChildItem -Path 'c:\MYCLAUDE_PROJECT\pdf\backend\app' -Recurse -Include '*.py'
$results = @()
foreach ($file in $files) {
    $lineCount = (Get-Content $file.FullName | Measure-Object -Line).Lines
    if ($lineCount -gt 100) {
        $relativePath = $file.FullName.Replace('c:\MYCLAUDE_PROJECT\pdf\backend\app\', '')
        $results += [PSCustomObject]@{
            Lines = $lineCount
            Path = $relativePath
        }
    }
}
$results | Sort-Object Lines -Descending | ForEach-Object {
    Write-Output ("{0,5} {1}" -f $_.Lines, $_.Path)
}
