<#
 test-api-upload-permission.ps1
 - Login as admin (tester+1@example.com)
 - Register a temporary non-admin user and login
 - Upload a product with an image (multipart/form-data) using admin token
 - Attempt same upload with non-admin token
 - Record responses to tests/api-upload-permission.json
#>

$Server = 'http://localhost:5000'
$ErrorActionPreference = 'Stop'

$out = [ordered]@{}
$out.server = $Server
$out.timestamp = (Get-Date).ToString('o')

Write-Output "Testing multipart upload and permission at $Server"

function Save-Results($obj, $path) {
    $testsDir = Join-Path -Path (Get-Location) -ChildPath 'tests'
    if (-not (Test-Path $testsDir)) { New-Item -ItemType Directory -Path $testsDir | Out-Null }
    $obj | ConvertTo-Json -Depth 6 | Out-File -FilePath $path -Encoding UTF8
}

try {
    $body = @{ email = 'tester+1@example.com'; password = 'Test12345' } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$Server/api/auth/login" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 10
    $tokenAdmin = $login.token
    $out.admin = @{ ok = $true; user = $login.user }
    Write-Output 'Admin login OK'
} catch {
    $out.admin = @{ ok = $false; error = $_.Exception.Message }
    Write-Output "Admin login FAILED: $($_.Exception.Message)"
    Save-Results $out (Join-Path (Get-Location) 'tests\api-upload-permission.json')
    exit 1
}

# Register a non-admin user (if already exists, login)
$rand = Get-Random -Maximum 100000
$nonEmail = "tester_nonadmin_$rand@example.com"
try {
    $reg = @{ name = 'Auto Tester'; email = $nonEmail; password = 'Test12345' } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$Server/api/auth/register" -Method Post -ContentType 'application/json' -Body $reg -TimeoutSec 10
    Write-Output "Registered non-admin: $nonEmail"
} catch {
    Write-Output "Register may have failed (exists?): $($_.Exception.Message)"
}

try {
    $body2 = @{ email = $nonEmail; password = 'Test12345' } | ConvertTo-Json
    $login2 = Invoke-RestMethod -Uri "$Server/api/auth/login" -Method Post -ContentType 'application/json' -Body $body2 -TimeoutSec 10
    $tokenUser = $login2.token
    $out.nonadmin = @{ ok = $true; user = $login2.user }
    Write-Output 'Non-admin login OK'
} catch {
    $out.nonadmin = @{ ok = $false; error = $_.Exception.Message }
    Write-Output "Non-admin login FAILED: $($_.Exception.Message)"
}

# Prepare tiny PNG file (1x1)
$tmpFile = Join-Path (Get-Location) 'scripts\tmp_upload.png'
$b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
[System.IO.File]::WriteAllBytes($tmpFile, [System.Convert]::FromBase64String($b64))
Add-Type -AssemblyName System.Net.Http

function Invoke-MultipartFormData {
    param(
        [string]$Uri,
        [hashtable]$Headers,
        [hashtable]$Fields
    )

    $handler = New-Object System.Net.Http.HttpClientHandler
    $client = New-Object System.Net.Http.HttpClient($handler)
    if ($Headers) {
        foreach ($hk in $Headers.Keys) { $client.DefaultRequestHeaders.Remove($hk) > $null; $client.DefaultRequestHeaders.Add($hk, $Headers[$hk]) }
    }

    $content = New-Object System.Net.Http.MultipartFormDataContent
    foreach ($k in $Fields.Keys) {
        $v = $Fields[$k]
        if ($v -is [System.IO.FileInfo]) {
            $fs = [System.IO.File]::OpenRead($v.FullName)
            $streamContent = New-Object System.Net.Http.StreamContent($fs)
            $streamContent.Headers.ContentDisposition = New-Object System.Net.Http.Headers.ContentDispositionHeaderValue('form-data')
            $streamContent.Headers.ContentDisposition.Name = ('"' + $k + '"')
            $streamContent.Headers.ContentDisposition.FileName = ('"' + $v.Name + '"')
            $streamContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/octet-stream')
            $content.Add($streamContent, $k, $v.Name)
        } else {
            $stringContent = New-Object System.Net.Http.StringContent([string]$v)
            $content.Add($stringContent, $k)
        }
    }

    $resp = $client.PostAsync($Uri, $content).Result
    $body = $resp.Content.ReadAsStringAsync().Result
    if ($resp.IsSuccessStatusCode) {
        try { return $body | ConvertFrom-Json } catch { return $body }
    } else {
        throw "HTTP $($resp.StatusCode): $body"
    }
}

# Upload with admin token
try {
    $form = @{ name = 'UploadTest Admin ' + ([int](Get-Random -Maximum 10000)); price = '9.99'; description = 'Uploaded by admin test'; image = Get-Item $tmpFile }
    $res = Invoke-MultipartFormData -Uri "$Server/api/products" -Headers @{ Authorization = "Bearer $tokenAdmin" } -Fields $form
    $out.upload_admin = @{ ok = $true; product = $res }
    $createdId = $res.id
    Write-Output "Admin upload OK id=$createdId"
} catch {
    $out.upload_admin = @{ ok = $false; error = $_.Exception.Message }
    Write-Output "Admin upload FAILED: $($_.Exception.Message)"
}

# Upload with non-admin token (permission check)
try {
    if ($tokenUser) {
        $form2 = @{ name = 'UploadTest User ' + ([int](Get-Random -Maximum 10000)); price = '4.99'; description = 'Uploaded by user test'; image = Get-Item $tmpFile }
        $res2 = Invoke-MultipartFormData -Uri "$Server/api/products" -Headers @{ Authorization = "Bearer $tokenUser" } -Fields $form2
        $out.upload_user = @{ ok = $true; product = $res2 }
        Write-Output "Non-admin upload OK id=$($res2.id)"
    } else {
        $out.upload_user = @{ ok = $false; error = 'no non-admin token' }
        Write-Output 'Skipping non-admin upload (no token)'
    }
} catch {
    # capture response error
    $out.upload_user = @{ ok = $false; error = $_.Exception.Message }
    Write-Output "Non-admin upload FAILED: $($_.Exception.Message)"
}

# Cleanup: delete created product if exists
if ($createdId) {
    try {
        Invoke-RestMethod -Uri "$Server/api/products/$createdId" -Method Delete -Headers @{ Authorization = "Bearer $tokenAdmin" } -TimeoutSec 10
        Write-Output "Cleanup: deleted product $createdId"
    } catch {
        Write-Output "Cleanup delete failed: $($_.Exception.Message)"
    }
}

# Remove tmp file
Remove-Item -Path $tmpFile -ErrorAction SilentlyContinue

# Save results
$outFile = Join-Path (Get-Location) 'tests\api-upload-permission.json'
Save-Results $out $outFile
Write-Output "Results written to: $outFile"

Write-Output 'Done.'
