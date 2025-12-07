# test-api-pages.ps1
# - Login to API using tester+1@example.com / Test12345
# - GET /api/products with token
# - Fetch HTML pages and check for app-core.js, dashboard.js, script.js
# - Check assets (app-core.js, dashboard.js, script.js) availability
# - Output results to tests/ui-pages-check.json

$Server = 'http://localhost:5000'
$ErrorActionPreference = 'Stop'

$results = [ordered]@{}
$results.server = $Server
$results.timestamp = (Get-Date).ToString('o')
$results.login = $null
$results.products = $null
$results.pages = @()
$results.assets = @{}

Write-Output "Testing server: $Server"

Write-Output '-> Attempting login...'
try {
    $body = @{ email = 'tester+1@example.com'; password = 'Test12345' } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$Server/api/auth/login" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 10
    $results.login = @{ ok = $true; token = $login.token; user = $login.user }
    Write-Output '  Login OK'
} catch {
    $results.login = @{ ok = $false; error = $_.Exception.Message }
    Write-Output "  Login FAILED: $($_.Exception.Message)"
}

# 2) Products API
if ($results.login -and $results.login.ok) {
    try {
        $token = $results.login.token
        $products = Invoke-RestMethod -Uri "$Server/api/products" -Method Get -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 10
        $results.products = @{ ok = $true; count = ($products | Measure-Object).Count; sample = $products | Select-Object -First 3 }
        Write-Output "-> Products OK (count: $($results.products.count))"
    } catch {
        $results.products = @{ ok = $false; error = $_.Exception.Message }
        Write-Output "-> Products FAILED: $($_.Exception.Message)"
    }
} else {
    Write-Output '-> Skipping products check because login failed'
}

# 3) Pages check
$pages = @('dashboard.html','index.html','products.html','customers.html','messages.html','analytics.html','settings.html','login.html','register.html')
foreach ($p in $pages) {
    $entry = [ordered]@{ page = $p; url = "$Server/$p"; fetched = $false; checks = @{} }
    try {
        $resp = Invoke-WebRequest -Uri $entry.url -UseBasicParsing -TimeoutSec 10
        $html = $resp.Content
        $entry.fetched = $true
        $entry.checks['app-core'] = ($html -match '<script\s+src="assets/js/app-core.js"')
        $entry.checks['dashboard.js'] = ($html -match '<script\s+src="assets/js/dashboard.js"')
        $entry.checks['script.js'] = ($html -match '<script\s+src="assets/js/script.js"')
        $entry.size = ($html.Length)
        Write-Output "-> $p fetched (size: $($entry.size))"
    } catch {
        $entry.error = $_.Exception.Message
        Write-Output "-> $p ERROR: $($entry.error)"
    }
    $results.pages += $entry
}

# 4) Assets availability
$assetsToCheck = @('assets/js/app-core.js','assets/js/dashboard.js','assets/js/script.js')
foreach ($a in $assetsToCheck) {
    $u = "$Server/$a"
    try {
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -Method Head -TimeoutSec 10
        $results.assets[$a] = @{ ok = $true; status = $r.StatusCode }
        Write-Output "-> Asset $a OK"
    } catch {
        # try GET as fallback
        try {
            $r2 = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 10
            $results.assets[$a] = @{ ok = $true; status = $r2.StatusCode; size = $r2.Content.Length }
            Write-Output "-> Asset $a OK (GET)"
        } catch {
            $results.assets[$a] = @{ ok = $false; error = $_.Exception.Message }
            Write-Output "-> Asset $a FAILED: $($_.Exception.Message)"
        }
    }
}

# 5) Save results
$testsDir = Join-Path -Path (Get-Location) -ChildPath 'tests'
if (-not (Test-Path $testsDir)) { New-Item -ItemType Directory -Path $testsDir | Out-Null }
$outFile = Join-Path $testsDir 'ui-pages-check.json'
$results | ConvertTo-Json -Depth 6 | Out-File -FilePath $outFile -Encoding UTF8
Write-Output "Results written to: $outFile"

# Print summary
Write-Output '--- SUMMARY ---'
if ($results.login -and $results.login.ok) {
    Write-Output "Login: OK"
} else {
    $le = $results.login.error -as [string]
    Write-Output "Login: FAILED: $le"
}

if ($results.products -and $results.products.ok) {
    Write-Output "Products: OK, count=$($results.products.count)"
} else {
    if ($results.products) { Write-Output "Products: FAILED: $($results.products.error)" } else { Write-Output 'Products: SKIPPED' }
}

foreach ($p in $results.pages) {
    $appcore = $p.checks['app-core']
    $dash = $p.checks['dashboard.js']
    $scr = $p.checks['script.js']
    Write-Output "Page: $($p.page) app-core=$appcore, dashboard.js=$dash, script.js=$scr"
}

Write-Output 'Done.'
