# Test if Bearer token works
$bearerToken = "AAAAAAAAAAAAAAAAAAAAANm94QEAAAAAGpI8ATNyYMl89I1/BvWb4lpavgE=FBmYNj7qMAMtnV8dEoyN13w4fY0XFploxAWKWBj5w8oSPd6TML"

Write-Host "Testing Bearer Token..." -ForegroundColor Cyan

# Test 1: Get user by username
Write-Host "`n1. Testing getUserByUsername (joinfroggys)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Method GET `
        -Uri 'https://api.x.com/2/users/by/username/joinfroggys?user.fields=username' `
        -Headers @{ Authorization = "Bearer $bearerToken" } `
        -UseBasicParsing
    
    Write-Host "✓ Success!" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "✗ Failed!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host $responseBody -ForegroundColor Red
}

# Test 2: Search tweets
Write-Host "`n2. Testing tweet search..." -ForegroundColor Yellow
try {
    $query = [uri]::EscapeDataString("from:BitcoinFroggys RIBBIT -is:retweet")
    $uri = "https://api.x.com/2/tweets/search/recent?query={0}&max_results=10" -f $query
    $response = Invoke-WebRequest -Method GET `
        -Uri $uri `
        -Headers @{ Authorization = "Bearer $bearerToken" } `
        -UseBasicParsing
    
    Write-Host "✓ Success!" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "✗ Failed!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host $responseBody -ForegroundColor Red
}
