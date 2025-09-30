# Test the recheck API with detailed output
$address = "bc1patnxh9uml24j50epra75a40g39kh59p97ywmg35zdpj3r6rwwf5qsq030v"
$body = @{ address = $address } | ConvertTo-Json

Write-Host "Testing recheck API..." -ForegroundColor Cyan
Write-Host "Address: $address" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Method POST `
        -Uri 'https://www.bitcoinfrogs.art/api/twitter/recheck' `
        -ContentType 'application/json' `
        -Body $body `
        -UseBasicParsing

    Write-Host "`nStatus Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "`nError occurred!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    
    Write-Host "`nError Response:" -ForegroundColor Red
    try {
        $responseBody | ConvertFrom-Json | ConvertTo-Json -Depth 10
    } catch {
        Write-Host $responseBody
    }
}
