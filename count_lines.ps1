$files = Get-ChildItem -Path 'c:\MYCLAUDE_PROJECT\pdf\frontend\src' -Recurse -Include '*.tsx','*.ts'
$results = @()
foreach ($file in $files) {
    $lineCount = (Get-Content $file.FullName | Measure-Object -Line).Lines
    if ($lineCount -gt 200) {
        $relativePath = $file.FullName.Replace('c:\MYCLAUDE_PROJECT\pdf\frontend\src\', '')
        $results += [PSCustomObject]@{
            Lines = $lineCount
            Path = $relativePath
        }
    }
}
$results | Sort-Object Lines -Descending | ForEach-Object {
    Write-Output ("{0,5} {1}" -f $_.Lines, $_.Path)
}
