# test-api-crud.ps1
# - Login to API using tester+1@example.com / Test12345
# - Create a product (POST /api/products)
# - Update the product (PUT /api/products/:id)
# - Delete the product (DELETE /api/products/:id)
# - Output results to tests/api-crud-result.json

$Server = 'http://localhost:5000'
$ErrorActionPreference = 'Stop'

$out = [ordered]@{}
$out.server = $Server
$out.timestamp = (Get-Date).ToString('o')

Write-Output "Testing CRUD on $Server"

# Login
try {
    $body = @{ email = 'tester+1@example.com'; password = 'Test12345' } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$Server/api/auth/login" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 10
    $token = $login.token
    $out.login = @{ ok = $true; user = $login.user }
    Write-Output 'Login OK'
} catch {
    $out.login = @{ ok = $false; error = $_.Exception.Message }
    Write-Output "Login FAILED: $($_.Exception.Message)"
    exit 1
}

# 1) Create product (POST)
try {
    $new = @{ name = 'AutoTest Product ' + ([int](Get-Random -Maximum 10000)); price = 123.45; description = 'Created by automated test' } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$Server/api/products" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $new -TimeoutSec 10
    $out.create = @{ ok = $true; product = $res }
    $prodId = $res.id
    Write-Output "Created product id=$prodId"
} catch {
    $out.create = @{ ok = $false; error = $_.Exception.Message }
    Write-Output "Create FAILED: $($_.Exception.Message)"
    exit 1
}

# 2) Update product (PUT)
try {
    $update = @{ name = ($res.name + ' - UPDATED'); price = 200 } | ConvertTo-Json
    $res2 = Invoke-RestMethod -Uri "$Server/api/products/$prodId" -Method Put -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $update -TimeoutSec 10
    $out.update = @{ ok = $true; product = $res2 }
    Write-Output "Updated product id=$prodId"
} catch {
    $out.update = @{ ok = $false; error = $_.Exception.Message }
    Write-Output "Update FAILED: $($_.Exception.Message)"
    # proceed to delete attempt
}

# 3) Delete product (DELETE)
try {
    $res3 = Invoke-RestMethod -Uri "$Server/api/products/$prodId" -Method Delete -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 10
    $out.delete = @{ ok = $true; response = $res3 }
    Write-Output "Deleted product id=$prodId"
} catch {
    $out.delete = @{ ok = $false; error = $_.Exception.Message }
    Write-Output "Delete FAILED: $($_.Exception.Message)"
}

# Save results
$testsDir = Join-Path -Path (Get-Location) -ChildPath 'tests'
if (-not (Test-Path $testsDir)) { New-Item -ItemType Directory -Path $testsDir | Out-Null }
$outFile = Join-Path $testsDir 'api-crud-result.json'
$out | ConvertTo-Json -Depth 6 | Out-File -FilePath $outFile -Encoding UTF8
Write-Output "Results written to: $outFile"

Write-Output 'Done.'
